import { LLMFactory } from '../llm/factory';
import { LLMClient } from '../llm/types';
import { prisma } from '../prisma/db';

export interface PodcastOptions {
  sourceIds?: string[];
  dateRange?: number; // days
  maxSignals?: number;
  language?: 'zh' | 'en';
  style?: 'casual' | 'professional' | 'news';
}

export interface PodcastContent {
  script: string;
  signalCount: number;
  sources: string[];
  language: string;
  style: string;
  estimatedDuration: number;
}

export interface SignalWithSource {
  id: string;
  title: string;
  summary: string;
  aiSummary?: string | null;
  aiSummaryZh?: string | null;
  url: string;
  sourceName: string;
  category?: string | null;
  createdAt: Date;
}

export class PodcastScriptGenerator {
  private client: LLMClient | null;

  constructor() {
    this.client = LLMFactory.createClient();
  }

  async generate(options: PodcastOptions = {}): Promise<PodcastContent> {
    const {
      sourceIds,
      dateRange = 7,
      maxSignals = 10,
      language = 'zh',
      style = 'casual'
    } = options;

    // Fetch signals from specified sources
    const signals = await this.fetchSignals(sourceIds, dateRange, maxSignals);

    if (signals.length === 0) {
      return this.generateEmptyContent(language);
    }

    // Generate podcast script using LLM
    const script = await this.createScript(signals, language, style);

    // Extract unique source names
    const sources = [...new Set(signals.map(s => s.sourceName))];

    // Estimate duration (average 3 seconds per Chinese character, 5 per English)
    const avgCharsPerSignal = language === 'zh' ? 300 : 500;
    const estimatedDuration = Math.ceil((script.length / avgCharsPerSignal) * 60);

    return {
      script,
      signalCount: signals.length,
      sources,
      language,
      style,
      estimatedDuration,
    };
  }

  private async fetchSignals(sourceIds?: string[], dateRange: number = 7, limit: number = 10): Promise<SignalWithSource[]> {
    const where: any = {
      // Only fetch signals with AI summary
      aiSummary: { not: null },
    };

    // Add date range filter
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - dateRange);
    startDate.setHours(0, 0, 0, 0);

    where.createdAt = {
      gte: startDate,
    };

    if (sourceIds && sourceIds.length > 0) {
      where.sourceId = { in: sourceIds };
    }

    const signals = await prisma.signal.findMany({
      where,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        source: {
          select: { name: true, type: true },
        },
      },
    });

    return signals.map(signal => ({
      id: signal.id,
      title: signal.title,
      summary: signal.summary || signal.aiSummary || '',
      aiSummary: signal.aiSummary,
      aiSummaryZh: signal.aiSummaryZh,
      url: signal.url,
      sourceName: signal.source.name,
      category: signal.category,
      createdAt: signal.createdAt,
    }));
  }

  private async createScript(
    signals: SignalWithSource[],
    language: string,
    style: string
  ): Promise<string> {
    if (!this.client) {
      // Fallback: simple concatenation without LLM
      return this.createFallbackScript(signals, language);
    }

    const isChinese = language === 'zh';
    const styleInstruction = this.getStyleInstruction(style, isChinese);

    const signalsText = signals.map((s, i) => {
      const summary = isChinese ? (s.aiSummaryZh || s.summary) : s.aiSummary || s.summary;
      return `[${i + 1}] ${s.title}
来源: ${s.sourceName}
摘要: ${summary}`;
    }).join('\n\n');

    const systemPrompt = isChinese
      ? `你是一位专业的播客主持人。请将以下新闻内容编写成一段自然流畅的播客脚本。
${styleInstruction}

要求:
1. 自然的口语化表达,避免生硬的书面语
2. 每条新闻之间有过渡语
3. 有开场白和结束语
4. 总时长控制在2-3分钟
5. 不要包含任何技术标签或JSON格式,纯文本即可`
      : `You are a professional podcast host. Please create a natural podcast script from the following news content.
${styleInstruction}

Requirements:
1. Natural conversational tone, avoid stiff written language
2. Add transitions between news items
3. Include opening and closing remarks
4. Keep total duration to 2-3 minutes
5. No technical tags or JSON format, plain text only`;

    const userPrompt = `以下是今天的新闻内容:

${signalsText}

请生成播客脚本:`;

    try {
      const script = await this.client.generate(`${systemPrompt}\n\n${userPrompt}`);
      return script.trim();
    } catch (error) {
      console.error('Failed to generate podcast script with LLM:', error);
      return this.createFallbackScript(signals, language);
    }
  }

  private getStyleInstruction(style: string, isChinese: boolean): string {
    const instructions: Record<string, string> = {
      casual: isChinese
        ? '风格:轻松活泼,像和朋友聊天一样'
        : 'Style: casual and friendly, like chatting with a friend',
      professional: isChinese
        ? '风格:专业沉稳,像新闻主播'
        : 'Style: professional and authoritative, like a news anchor',
      news: isChinese
        ? '风格:简洁明了,信息量大'
        : 'Style: concise and informative',
    };
    return instructions[style] || instructions.casual;
  }

  private createFallbackScript(signals: SignalWithSource[], language: string): string {
    const isChinese = language === 'zh';
    const opening = isChinese
      ? '各位听众朋友好，欢迎收听今日科技新闻速报。'
      : 'Hello and welcome to your daily tech news briefing.';

    const closing = isChinese
      ? '以上就是今天的主要内容，感谢收听。'
      : 'That concludes today\'s main news. Thank you for listening.';

    const items = signals.map((s, i) => {
      const summary = isChinese ? (s.aiSummaryZh || s.summary) : s.aiSummary || s.summary;
      return isChinese
        ? `第${i + 1}条，来自${s.sourceName}：${s.title}。${summary}`
        : `Item ${i + 1}, from ${s.sourceName}: ${s.title}. ${summary}`;
    });

    return `${opening}\n\n${items.join('\n\n')}\n\n${closing}`;
  }

  private generateEmptyContent(language: string): PodcastContent {
    const isChinese = language === 'zh';
    return {
      script: isChinese
        ? '抱歉，目前没有可用的新闻内容来生成播客。请先添加一些订阅源。'
        : 'Sorry, there is no available news content to generate a podcast. Please add some subscription sources first.',
      signalCount: 0,
      sources: [],
      language,
      style: 'casual',
      estimatedDuration: 0,
    };
  }
}

// Singleton instance
let generator: PodcastScriptGenerator | null = null;

export function getPodcastGenerator(): PodcastScriptGenerator {
  if (!generator) {
    generator = new PodcastScriptGenerator();
  }
  return generator;
}
