import { prisma } from "../prisma/db";
import { LLMFactory } from "./factory";

export interface DemandSignal {
    id: string;
    title: string;
    platform?: string | null;
    category?: string | null;
}

interface ValidationResult {
    signalId: string;
    isValid: boolean;
    reason?: string;
}

export class DemandValidator {
    private client = LLMFactory.createClient();
    private readonly BATCH_SIZE = 500;

    /**
     * 批量验证需求信号
     * @param signals 要验证的信号列表
     * @returns 验证结果
     */
    async validateSignals(signals: DemandSignal[]): Promise<ValidationResult[]> {
        if (!this.client) {
            console.warn("LLM client not configured, skipping demand validation.");
            return signals.map(s => ({ signalId: s.id, isValid: true, reason: "LLM not configured" }));
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
            return signals.map(s => ({ signalId: s.id, isValid: true, reason: "LLM not configured" }));
        }

        const prompt = this.buildPrompt(signals);

        try {
            const response = await this.client.generate(prompt);
            return this.parseResponse(response, signals);
        } catch (error) {
            console.error("Demand validation failed:", error);
            // 返回默认值（有效）
            return signals.map(s => ({ signalId: s.id, isValid: true, reason: "Validation error" }));
        }
    }

    /**
     * 构建验证提示词
     */
    private buildPrompt(signals: DemandSignal[]): string {
        const signalsText = signals.map((s, i) => {
            return `信号${i + 1}: "${s.title}"
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

[{"id": "信号ID", "isValid": true/false, "reason": "判断原因（简要）"}, ...]

注意：
1. 返回的 JSON 数组必须与输入信号数量一致
2. isValid 为 true 表示有效需求信号，false 表示无效（八卦/娱乐）
3. reason 是判断原因的简要说明
4. 只输出 JSON 数组，不要有任何前缀或后缀文字`;
    }

    /**
     * 解析 LLM 响应
     */
    private parseResponse(response: string, signals: DemandSignal[]): ValidationResult[] {
        try {
            // 提取 JSON 数组
            const jsonMatch = response.match(/\[[\s\S]*\]/);
            if (!jsonMatch) {
                console.warn("Failed to parse LLM response, using default valid results");
                return signals.map(s => ({ signalId: s.id, isValid: true, reason: "Parse error" }));
            }

            const parsed = JSON.parse(jsonMatch[0]);
            if (!Array.isArray(parsed)) {
                return signals.map(s => ({ signalId: s.id, isValid: true, reason: "Invalid format" }));
            }

            // 映射结果
            return parsed.map((item: any, index: number) => ({
                signalId: item.id || signals[index]?.id || signals[index]?.title,
                isValid: item.isValid === true,
                reason: item.reason || ''
            }));
        } catch (error) {
            console.error("Failed to parse validation response:", error);
            return signals.map(s => ({ signalId: s.id, isValid: true, reason: "Parse error" }));
        }
    }

    /**
     * 更新信号的验证结果到数据库
     */
    async updateValidationResults(results: ValidationResult[]): Promise<number> {
        let successCount = 0;

        for (const result of results) {
            try {
                await prisma.signal.update({
                    where: { id: result.signalId },
                    data: { isValidDemand: result.isValid }
                });
                successCount++;
            } catch (error) {
                console.error(`Failed to update signal ${result.signalId}:`, error);
            }
        }

        console.log(`Updated validation results for ${successCount}/${results.length} signals.`);
        return successCount;
    }

    /**
     * 验证并更新数据库中的需求信号
     */
    async validateAndUpdate(): Promise<number> {
        // 获取所有未验证的需求信号（最近7天的）
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const signals = await prisma.signal.findMany({
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
