import { prisma } from "../prisma/db";
import { LLMFactory } from "./factory";
import pLimit from "p-limit";

export interface DemandSignal {
    id: string;
    title: string;
    platform?: string | null;
    category?: string | null;
}

interface ValidationResult {
    signalId: string;
    isValid: boolean | null;
    reason?: string;
}

interface LLMValidationItem {
    index?: number;
    isValid?: boolean;
    reason?: string;
}

type FallbackMode = "null" | "true" | "false";

interface LLMClientLike {
    generate(prompt: string): Promise<string>;
}

interface SignalModelLike {
    findMany(args: unknown): Promise<DemandSignal[]>;
    update(args: {
        where: { id: string };
        data: { isValidDemand: boolean | null };
    }): Promise<unknown>;
}

interface DemandValidatorOptions {
    client?: LLMClientLike | null;
    signalModel?: SignalModelLike;
    batchSize?: number;
    updateBatchSize?: number;
    updateConcurrency?: number;
    validationRetryTimes?: number;
    retryDelayMs?: number;
    strictParsing?: boolean;
    fallbackMode?: FallbackMode;
    sleep?: (ms: number) => Promise<void>;
}

export class DemandValidator {
    private readonly client: LLMClientLike | null;
    private readonly signalModel: SignalModelLike;
    private readonly BATCH_SIZE: number;
    private readonly UPDATE_BATCH_SIZE: number;
    private readonly UPDATE_CONCURRENCY: number;
    private readonly VALIDATION_RETRY_TIMES: number;
    private readonly RETRY_DELAY_MS: number;
    private readonly strictParsing: boolean;
    private readonly fallbackMode: FallbackMode;
    private readonly sleep: (ms: number) => Promise<void>;

    constructor(options: DemandValidatorOptions = {}) {
        this.client = options.client ?? LLMFactory.createClient();
        this.signalModel = options.signalModel ?? prisma.signal;
        this.BATCH_SIZE = options.batchSize ?? Number(process.env.DEMAND_VALIDATION_BATCH_SIZE || "500");
        this.UPDATE_BATCH_SIZE = options.updateBatchSize ?? Number(process.env.DEMAND_UPDATE_BATCH_SIZE || "100");
        this.UPDATE_CONCURRENCY = options.updateConcurrency ?? Number(process.env.DEMAND_UPDATE_CONCURRENCY || "5");
        this.VALIDATION_RETRY_TIMES = options.validationRetryTimes ?? Number(process.env.DEMAND_VALIDATION_RETRY_TIMES || "2");
        this.RETRY_DELAY_MS = options.retryDelayMs ?? Number(process.env.DEMAND_VALIDATION_RETRY_DELAY_MS || "800");
        this.strictParsing = options.strictParsing ?? (process.env.DEMAND_VALIDATION_STRICT !== "false");
        this.fallbackMode = options.fallbackMode ?? ((process.env.DEMAND_VALIDATION_FAILURE_FALLBACK as FallbackMode) || "true");
        this.sleep = options.sleep ?? ((ms: number) => new Promise((resolve) => setTimeout(resolve, ms)));
    }

    private sanitizePositiveInt(value: number, fallback: number): number {
        return Number.isInteger(value) && value > 0 ? value : fallback;
    }

    private resolveFallbackMode(): FallbackMode {
        if (this.fallbackMode === "null" || this.fallbackMode === "false" || this.fallbackMode === "true") {
            return this.fallbackMode;
        }
        return this.strictParsing ? "null" : "true";
    }

    private parseFallbackValue(): boolean | null {
        const mode = this.resolveFallbackMode();
        if (mode === "null") return null;
        if (mode === "false") return false;
        return true;
    }

    private buildFallbackResults(signals: DemandSignal[], reason: string): ValidationResult[] {
        return signals.map(s => ({ signalId: s.id, isValid: this.parseFallbackValue(), reason }));
    }

    private async parseWithRetry(signals: DemandSignal[], prompt: string): Promise<ValidationResult[]> {
        if (!this.client) {
            return this.buildFallbackResults(signals, "LLM not configured");
        }

        const maxAttempts = this.sanitizePositiveInt(this.VALIDATION_RETRY_TIMES, 2) + 1;

        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                const response = await this.client.generate(prompt);
                const trimmed = response.trim();

                if (!trimmed) {
                    console.warn(`Demand validation empty response at attempt ${attempt}/${maxAttempts}`);
                    if (attempt < maxAttempts) {
                        await this.sleep(this.RETRY_DELAY_MS);
                        continue;
                    }
                    return this.buildFallbackResults(signals, "Empty response after retries");
                }

                return this.parseResponse(response, signals);
            } catch (error) {
                console.error(`Demand validation attempt ${attempt}/${maxAttempts} failed:`, error);
                if (attempt < maxAttempts) {
                    await this.sleep(this.RETRY_DELAY_MS);
                    continue;
                }
                return this.buildFallbackResults(signals, "Validation error");
            }
        }

        return this.buildFallbackResults(signals, "Unknown validation error");
    }

    /**
     * 批量验证需求信号
     * @param signals 要验证的信号列表
     * @returns 验证结果
     */
    async validateSignals(signals: DemandSignal[]): Promise<ValidationResult[]> {
        if (!this.client) {
            console.warn("LLM client not configured, skipping demand validation.");
            return signals.map(s => ({ signalId: s.id, isValid: this.parseFallbackValue(), reason: "LLM not configured" }));
        }

        if (signals.length === 0) {
            return [];
        }

        console.log(`Validating ${signals.length} demand signals...`);

        // 分批处理
        const results: ValidationResult[] = [];
        for (let i = 0; i < signals.length; i += this.BATCH_SIZE) {
            const batch = signals.slice(i, i + this.BATCH_SIZE);
            const batchResults = await this.validateBatch(batch);
            results.push(...batchResults);
            console.log(`Validated batch ${Math.floor(i / this.BATCH_SIZE) + 1}/${Math.ceil(signals.length / this.BATCH_SIZE)}`);
        }

        return results;
    }

    /**
     * 验证一批信号
     */
    private async validateBatch(signals: DemandSignal[]): Promise<ValidationResult[]> {
        if (!this.client) {
            return this.buildFallbackResults(signals, "LLM not configured");
        }

        const prompt = this.buildPrompt(signals);

        try {
            return await this.parseWithRetry(signals, prompt);
        } catch (error) {
            console.error("Demand validation failed:", error);
            return this.buildFallbackResults(signals, "Validation error");
        }
    }

    /**
     * 构建验证提示词
     */
    private buildPrompt(signals: DemandSignal[]): string {
        const signalsText = signals.map((s, i) => {
            return `信号${i}: "${s.title}"
- 平台: ${s.platform || '未知'}
- 分类: ${s.category || '未知'}`;
        }).join('\n\n');

        return `你是一个需求信号分析师，需要判断以下信号是否为有效的需求信号。

## 判断标准

**有效需求信号**（应返回 true）：
- 技术/产品需求：AI大模型、软件开发、工具需求、技术方案采购
- 政府采购：政府招标、采购公告、政务系统建设
- 招聘需求：人才招聘、岗位需求、薪资范围
- 行业研究：行业报告、市场分析、趋势研究
- 商业趋势：新产品发布、行业动态、商业机会

**无效需求信号**（应返回 false）：
- 明星八卦：明星恋情、婚讯、出轨、緋闻
- 娱乐新闻：综艺节目、电影电视剧、演唱会
- 情感话题：恋爱、婚姻、分手、复合
- 赛事娱乐：体育比赛、电竞、娱乐颁奖典礼
- 其他非商业/技术需求的内容

## 待验证信号

${signalsText}

## 输出格式

请严格按照以下 JSON 数组格式输出，不要包含任何其他内容：

[{"index": 序号(从0开始), "isValid": true/false, "reason": "判断原因（简要）"}, ...]

注意：
1. 必须使用 "index" 字段，值为信号的序号（从0开始，对应第一个信号 index=0）
2. 不要使用 "id" 字段，使用 "index" 来标识信号
3. 返回的 JSON 数组必须与输入信号数量一致
4. isValid 为 true 表示有效需求信号，false 表示无效（八卦/娱乐）
3. reason 是判断原因的简要说明
4. 只输出 JSON 数组，不要有任何前缀或后缀文字`;
    }

    /**
     * 解析 LLM 响应
     */
    private parseResponse(response: string, signals: DemandSignal[]): ValidationResult[] {
        try {
            // 记录原始响应（用于调试）
            console.log(`LLM response length: ${response.length} chars`);
            console.log(`LLM response preview: ${response.substring(0, 200)}...`);

            // 1. 尝试提取 markdown 代码块中的 JSON
            let jsonText = response;
            const codeBlockMatch = response.match(/```(?:json)?\s*([\s\S]*?)```/i);
            if (codeBlockMatch) {
                jsonText = codeBlockMatch[1].trim();
                console.log("Extracted JSON from markdown code block");
            }

            // 2. 尝试匹配 JSON 数组（贪婪匹配，确保匹配整个数组）
            const jsonMatch = jsonText.match(/\[[\s\S]*\]/);
            if (!jsonMatch) {
                console.warn("Failed to find JSON array in response");
                console.warn("Response preview:", response.substring(0, 500));
                return this.buildFallbackResults(signals, "Parse error");
            }

            const parsed = JSON.parse(jsonMatch[0]);
            if (!Array.isArray(parsed)) {
                console.warn("Parsed content is not an array");
                return this.buildFallbackResults(signals, "Invalid format");
            }

            console.log(`Successfully parsed ${parsed.length} validation results`);

            // 检查结果数量是否匹配
            if (parsed.length !== signals.length) {
                console.warn(`Result count mismatch: expected ${signals.length}, got ${parsed.length}`);
            }

            // 映射结果，使用 index 匹配信号
            const results: ValidationResult[] = [];
            for (let i = 0; i < signals.length; i++) {
                const item = parsed[i] as LLMValidationItem;
                const signal = signals[i];

                if (item && typeof item.index === 'number' && item.index >= 0 && item.index < signals.length) {
                    // 使用 index 找到对应的信号（带范围校验）
                    const matchedSignal = signals[item.index];
                    // 确保 isValid 是布尔类型
                    const isValid = typeof item.isValid === 'boolean' ? item.isValid : this.parseFallbackValue();
                    results.push({
                        signalId: matchedSignal?.id || signal?.id || signal?.title,
                        isValid: isValid,
                        reason: item.reason || ''
                    });
                } else {
                    // 如果没有 index 或 index 越界，使用当前循环的信号
                    results.push({
                        signalId: signal?.id || signal?.title,
                        isValid: this.parseFallbackValue(),
                        reason: !item ? 'Item missing' : 'Index invalid, fallback value used'
                    });
                }
            }

            // 统计有效/无效
            const validCount = results.filter(r => r.isValid === true).length;
            const invalidCount = results.filter(r => r.isValid === false).length;
            const unknownCount = results.filter(r => r.isValid === null).length;
            console.log(`Validation results: ${validCount} valid, ${invalidCount} invalid, ${unknownCount} unknown`);

            return results;
        } catch (error) {
            console.error("Failed to parse validation response:", error);
            console.error("Response:", response.substring(0, 500));
            return this.buildFallbackResults(signals, "Parse error");
        }
    }

    /**
     * 更新信号的验证结果到数据库（并行更新）
     */
    async updateValidationResults(results: ValidationResult[]): Promise<number> {
        // 过滤掉无效的 signalId（排除空字符串和 undefined）
        const validResults = results.filter(r => r.signalId && r.signalId.trim() !== '');
        const batchSize = this.sanitizePositiveInt(this.UPDATE_BATCH_SIZE, 100);
        const concurrency = this.sanitizePositiveInt(this.UPDATE_CONCURRENCY, 5);
        let successCount = 0;

        for (let i = 0; i < validResults.length; i += batchSize) {
            const chunk = validResults.slice(i, i + batchSize);
            const limit = pLimit(concurrency);

            const updates = chunk.map(result =>
                limit(async () => {
                    try {
                        await this.signalModel.update({
                            where: { id: result.signalId },
                            data: { isValidDemand: result.isValid }
                        });
                        return { success: true, id: result.signalId };
                    } catch (error) {
                        console.error(`Failed to update signal ${result.signalId}:`, error);
                        return { success: false, id: result.signalId };
                    }
                })
            );

            const settled = await Promise.allSettled(updates);
            successCount += settled.filter(r => r.status === 'fulfilled' && r.value.success).length;
        }

        console.log(`Updated validation results for ${successCount}/${validResults.length} signals.`);
        return successCount;
    }

    /**
     * 验证并更新数据库中的需求信号
     */
    async validateAndUpdate(): Promise<number> {
        // 获取所有未验证的需求信号（最近7天的）
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const signals = await this.signalModel.findMany({
            where: {
                isValidDemand: null,
                source: {
                    type: {
                        in: ['gov_procurement', 'research_report', 'recruitment', 'app_rank', 'social_demand', 'overseas_trend']
                    }
                },
                createdAt: {
                    gte: sevenDaysAgo
                }
            },
            select: {
                id: true,
                title: true,
                platform: true,
                category: true
            },
            orderBy: {
                createdAt: 'desc'
            },
            take: 5000 // 限制每次处理数量
        });

        if (signals.length === 0) {
            console.log("No signals to validate.");
            return 0;
        }

        console.log(`Found ${signals.length} signals to validate.`);

        const results = await this.validateSignals(signals);
        return await this.updateValidationResults(results);
    }
}
