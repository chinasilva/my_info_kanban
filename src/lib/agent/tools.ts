import { prisma } from "@/lib/prisma/db";
import { GenericWebScraper } from "@/lib/scraper/generic-web";
import { LLMFactory } from "@/lib/llm/factory";

export interface MCPTool {
  name: string;
  description: string;
  inputSchema: {
    type: "object";
    properties: Record<string, any>;
    required?: string[];
  };
  handler: (params: Record<string, any>, userId: string) => Promise<any>;
}

/**
 * 标记信号为已读
 */
async function markAsReadHandler(
  params: Record<string, any>,
  userId: string
) {
  const signalId = params.signalId as string;

  if (!signalId) {
    return { error: "Missing signalId parameter" };
  }

  // 检查信号是否存在
  const signal = await prisma.signal.findUnique({
    where: { id: signalId },
  });

  if (!signal) {
    return { error: "Signal not found" };
  }

  // 更新或创建用户信号状态
  await prisma.userSignal.upsert({
    where: {
      userId_signalId: {
        userId,
        signalId,
      },
    },
    create: {
      userId,
      signalId,
      isRead: true,
      readAt: new Date(),
    },
    update: {
      isRead: true,
      readAt: new Date(),
    },
  });

  return { success: true, signalId, isRead: true };
}

/**
 * 收藏/取消收藏信号
 */
async function favoriteSignalHandler(
  params: Record<string, any>,
  userId: string
) {
  const signalId = params.signalId as string;
  const favorited = params.favorited ?? true;

  if (!signalId) {
    return { error: "Missing signalId parameter" };
  }

  // 检查信号是否存在
  const signal = await prisma.signal.findUnique({
    where: { id: signalId },
  });

  if (!signal) {
    return { error: "Signal not found" };
  }

  // 更新或创建用户信号状态
  const userSignal = await prisma.userSignal.upsert({
    where: {
      userId_signalId: {
        userId,
        signalId,
      },
    },
    create: {
      userId,
      signalId,
      isFavorited: favorited,
    },
    update: {
      isFavorited: favorited,
    },
  });

  return { success: true, signalId, isFavorited: userSignal.isFavorited };
}

/**
 * 订阅/取消订阅数据源
 */
async function subscribeSourceHandler(
  params: Record<string, any>,
  userId: string
) {
  const sourceId = params.sourceId as string;
  const subscribe = params.subscribe ?? true;

  if (!sourceId) {
    return { error: "Missing sourceId parameter" };
  }

  // 检查数据源是否存在
  const source = await prisma.source.findUnique({
    where: { id: sourceId },
  });

  if (!source) {
    return { error: "Source not found" };
  }

  if (subscribe) {
    // 订阅数据源
    await prisma.userSource.upsert({
      where: {
        userId_sourceId: {
          userId,
          sourceId,
        },
      },
      create: {
        userId,
        sourceId,
        isEnabled: true,
      },
      update: {
        isEnabled: true,
      },
    });
  } else {
    // 取消订阅
    await prisma.userSource.deleteMany({
      where: {
        userId,
        sourceId,
      },
    });
  }

  return { success: true, sourceId, isSubscribed: subscribe };
}

/**
 * 搜索信号
 */
async function searchSignalsHandler(
  params: Record<string, any>,
  userId: string
) {
  const query = params.query as string;
  const limit = (params.limit as number) || 20;
  const cursor = params.cursor as string | undefined;
  const sourceType = params.sourceType as string | undefined;

  if (!query) {
    return { error: "Missing query parameter" };
  }

  // Source type to actual source types mapping
  const SOURCE_GROUPS: Record<string, string[]> = {
    build: ["github", "huggingface", "devto"],
    market: ["polymarket", "cryptopanic", "dune"],
    news: ["hackernews", "substack"],
    launch: ["producthunt"],
  };

  // Get user's subscribed sources
  const userSources = await prisma.userSource.findMany({
    where: {
      userId: userId,
      isEnabled: true,
    },
    include: { source: true },
  });

  let subscribedSourceIds = userSources.map((us) => us.sourceId);

  // Fallback to built-in sources if no subscription
  if (subscribedSourceIds.length === 0) {
    const builtInSources = await prisma.source.findMany({
      where: { isBuiltIn: true },
    });
    subscribedSourceIds = builtInSources.map((s) => s.id);
  }

  // Filter by source type if provided
  let filteredSourceIds = subscribedSourceIds;

  if (sourceType && SOURCE_GROUPS[sourceType]) {
    const allowedTypes = SOURCE_GROUPS[sourceType];
    filteredSourceIds = userSources
      .filter((us) => allowedTypes.includes(us.source.type))
      .map((us) => us.sourceId);

    if (filteredSourceIds.length === 0) {
      const builtInSources = await prisma.source.findMany({
        where: { isBuiltIn: true, type: { in: allowedTypes } },
      });
      filteredSourceIds = builtInSources.map((s) => s.id);
    }
  }

  // Build search query
  const searchQuery = query.toLowerCase();

  const signals = await prisma.signal.findMany({
    where: {
      sourceId: { in: filteredSourceIds },
      ...(cursor ? { id: { lt: cursor } } : {}),
      OR: [
        { title: { contains: searchQuery, mode: "insensitive" } },
        { summary: { contains: searchQuery, mode: "insensitive" } },
        { tags: { has: searchQuery } },
        { tagsZh: { has: searchQuery } },
        { aiSummary: { contains: searchQuery, mode: "insensitive" } },
        { aiSummaryZh: { contains: searchQuery, mode: "insensitive" } },
      ],
    },
    orderBy: { createdAt: "desc" },
    take: limit + 1,
    include: {
      source: {
        select: { id: true, name: true, type: true, baseUrl: true, icon: true },
      },
    },
  });

  const hasMore = signals.length > limit;
  const data = hasMore ? signals.slice(0, -1) : signals;
  const nextCursor = hasMore ? data[data.length - 1]?.id : null;

  return {
    signals: data.map((s) => ({
      id: s.id,
      title: s.title,
      url: s.url,
      summary: s.summary,
      score: s.score,
      source: s.source,
      tags: s.tags,
      tagsZh: s.tagsZh,
      aiSummary: s.aiSummary,
      aiSummaryZh: s.aiSummaryZh,
      createdAt: s.createdAt.toISOString(),
    })),
    query,
    nextCursor,
    hasMore,
  };
}

/**
 * 获取每日洞察
 */
async function getInsightsHandler(
  params: Record<string, any>,
  userId: string
) {
  const date = params.date as string | undefined;
  const limit = (params.limit as number) || 10;

  let dateFilter: Date;
  if (date) {
    dateFilter = new Date(date);
  } else {
    // 默认获取今天的洞察
    dateFilter = new Date();
    dateFilter.setHours(0, 0, 0, 0);
  }

  const insights = await prisma.insight.findMany({
    where: {
      date: {
        gte: dateFilter,
        lt: new Date(dateFilter.getTime() + 24 * 60 * 60 * 1000),
      },
    },
    orderBy: { score: "desc" },
    take: limit,
    include: {
      signals: {
        take: 5,
        select: { id: true, title: true, url: true },
      },
    },
  });

  // 如果没有今天的洞察，获取最近的
  if (insights.length === 0) {
    const recentInsights = await prisma.insight.findMany({
      orderBy: { date: "desc" },
      take: limit,
      include: {
        signals: {
          take: 5,
          select: { id: true, title: true, url: true },
        },
      },
    });

    return {
      insights: recentInsights.map((i) => ({
        id: i.id,
        title: i.title,
        titleZh: i.titleZh,
        content: i.content,
        contentZh: i.contentZh,
        type: i.type,
        score: i.score,
        date: i.date.toISOString(),
        signals: i.signals,
      })),
      isFallback: true,
    };
  }

  return {
    insights: insights.map((i) => ({
      id: i.id,
      title: i.title,
      titleZh: i.titleZh,
      content: i.content,
      contentZh: i.contentZh,
      type: i.type,
      score: i.score,
      date: i.date.toISOString(),
      signals: i.signals,
    })),
    isFallback: false,
  };
}
async function getSignalsHandler(
  params: {
    cursor?: string;
    limit?: number;
    sourceType?: string;
    days?: number;
    tag?: string;
    sourceId?: string;
  },
  userId: string
) {
  const limit = Math.min(params.limit || 20, 100);

  // Source type to actual source types mapping
  const SOURCE_GROUPS: Record<string, string[]> = {
    build: ["github", "huggingface", "devto"],
    market: ["polymarket", "cryptopanic", "dune"],
    news: ["hackernews", "substack"],
    launch: ["producthunt"],
  };

  // Get user's subscribed sources
  const userSources = await prisma.userSource.findMany({
    where: {
      userId: userId,
      isEnabled: true,
    },
    include: { source: true },
  });

  let subscribedSourceIds = userSources.map((us) => us.sourceId);

  // Fallback to built-in sources if no subscription
  if (subscribedSourceIds.length === 0) {
    const builtInSources = await prisma.source.findMany({
      where: { isBuiltIn: true },
    });
    subscribedSourceIds = builtInSources.map((s) => s.id);
  }

  // Filter by source type if provided
  let filteredSourceIds = subscribedSourceIds;

  if (params.sourceId) {
    if (subscribedSourceIds.includes(params.sourceId)) {
      filteredSourceIds = [params.sourceId];
    } else {
      return { signals: [], nextCursor: null, hasMore: false };
    }
  } else if (params.sourceType && SOURCE_GROUPS[params.sourceType]) {
    const allowedTypes = SOURCE_GROUPS[params.sourceType];
    filteredSourceIds = userSources
      .filter((us) => allowedTypes.includes(us.source.type))
      .map((us) => us.sourceId);

    // If no user sources, check built-in sources
    if (filteredSourceIds.length === 0) {
      const builtInSources = await prisma.source.findMany({
        where: { isBuiltIn: true, type: { in: allowedTypes } },
      });
      filteredSourceIds = builtInSources.map((s) => s.id);
    }
  }

  // Build where clause
  const whereClause: any = {
    sourceId: { in: filteredSourceIds },
    ...(params.cursor ? { id: { lt: params.cursor } } : {}),
  };

  // Date filter
  if (params.days) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - params.days);
    whereClause.createdAt = { gte: startDate };
  }

  // Tag filter
  if (params.tag && !params.sourceId) {
    whereClause.OR = [
      { tags: { has: params.tag } },
      { tagsZh: { has: params.tag } },
    ];
  }

  const signals = await prisma.signal.findMany({
    where: whereClause,
    orderBy: { createdAt: "desc" },
    take: limit + 1,
    include: {
      source: {
        select: { id: true, name: true, type: true, baseUrl: true, icon: true },
      },
    },
  });

  const hasMore = signals.length > limit;
  const data = hasMore ? signals.slice(0, -1) : signals;
  const nextCursor = hasMore ? data[data.length - 1]?.id : null;

  return {
    signals: data.map((s) => ({
      id: s.id,
      title: s.title,
      url: s.url,
      summary: s.summary,
      score: s.score,
      source: s.source,
      tags: s.tags,
      tagsZh: s.tagsZh,
      aiSummary: s.aiSummary,
      aiSummaryZh: s.aiSummaryZh,
      createdAt: s.createdAt.toISOString(),
    })),
    nextCursor,
    hasMore,
  };
}

/**
 * 获取单个信号详情
 */
async function getSignalDetailHandler(
  params: Record<string, any>,
  userId: string
) {
  const { id } = params;
  const signal = await prisma.signal.findUnique({
    where: { id: params.id },
    include: {
      source: {
        select: { id: true, name: true, type: true, baseUrl: true, icon: true },
      },
    },
  });

  if (!signal) {
    return { error: "Signal not found" };
  }

  // Check if user has access to this signal's source
  const userSource = await prisma.userSource.findFirst({
    where: {
      userId,
      sourceId: signal.sourceId,
      isEnabled: true,
    },
  });

  // Also check built-in sources
  const isBuiltIn = await prisma.source.findFirst({
    where: { id: signal.sourceId, isBuiltIn: true },
  });

  if (!userSource && !isBuiltIn) {
    return { error: "You don't have access to this signal's source" };
  }

  return {
    id: signal.id,
    title: signal.title,
    url: signal.url,
    summary: signal.summary,
    score: signal.score,
    source: signal.source,
    tags: signal.tags,
    tagsZh: signal.tagsZh,
    aiSummary: signal.aiSummary,
    aiSummaryZh: signal.aiSummaryZh,
    titleTranslated: signal.titleTranslated,
    externalId: signal.externalId,
    metadata: signal.metadata,
    createdAt: signal.createdAt.toISOString(),
    updatedAt: signal.updatedAt.toISOString(),
  };
}

/**
 * 获取数据源列表
 */
async function getSourcesHandler(params: {}, userId: string) {
  // Get user's subscribed sources
  const userSources = await prisma.userSource.findMany({
    where: { userId },
    include: {
      source: {
        include: {
          _count: { select: { signals: true } },
        },
      },
    },
  });

  // If no subscription, return built-in sources
  if (userSources.length === 0) {
    const builtInSources = await prisma.source.findMany({
      where: { isBuiltIn: true, isActive: true },
      include: { _count: { select: { signals: true } } },
      orderBy: { name: "asc" },
    });

    return builtInSources.map((s) => ({
      id: s.id,
      name: s.name,
      type: s.type,
      baseUrl: s.baseUrl,
      icon: s.icon,
      isBuiltIn: s.isBuiltIn,
      signalCount: s._count.signals,
      isSubscribed: false,
    }));
  }

  // Get all available sources with subscription status
  const allSources = await prisma.source.findMany({
    where: { isActive: true },
    include: {
      _count: { select: { signals: true } },
    },
    orderBy: [{ isBuiltIn: "desc" }, { name: "asc" }],
  });

  const subscribedIds = new Set(userSources.map((us) => us.sourceId));

  return allSources.map((s) => ({
    id: s.id,
    name: s.name,
    type: s.type,
    baseUrl: s.baseUrl,
    icon: s.icon,
    isBuiltIn: s.isBuiltIn,
    signalCount: s._count.signals,
    isSubscribed: subscribedIds.has(s.id),
  }));
}

/**
 * AI 读取文章
 */
async function readArticleHandler(
  params: Record<string, any>,
  userId: string
) {
  const url = params.url as string;
  const mode = (params.mode as string) || "short";

  if (!url) {
    return { error: "Missing url parameter" };
  }

  // Check cache first
  const cached = await prisma.aICache.findUnique({ where: { url } });

  if (cached) {
    let content: string | undefined;
    if (mode === "short") content = cached.summaryShort ?? undefined;
    else if (mode === "long") content = cached.summaryLong ?? undefined;
    else if (mode === "translate") content = cached.translation ?? undefined;

    if (content) {
      return {
        url,
        title: cached.title ?? undefined,
        mode,
        content,
        cached: true,
      };
    }
  }

  // Fetch live content
  try {
    const scraper = new GenericWebScraper(url);
    const signals = await scraper.fetch();

    if (!signals || signals.length === 0 || !signals[0].metadata?.fullContent) {
      return { error: "Failed to fetch content. The website may be blocking automated access." };
    }

    const rawContent = signals[0].metadata.fullContent as string;
    const title = signals[0].title;
    const llm = LLMFactory.createClient();

    if (!llm) {
      return { error: "LLM Client not configured" };
    }

    // Generate summary
    let fullResult = "";
    const prompt =
      mode === "translate"
        ? `Translate the following text to Chinese. Maintain original tone.\n\n${rawContent.slice(0, 15000)}`
        : mode === "short"
        ? `Short Chinese summary (100 words): ${title}\n${rawContent.slice(0, 10000)}`
        : `Detailed Chinese summary: ${title}\n${rawContent.slice(0, 15000)}`;

    for await (const textChunk of llm.stream(prompt)) {
      fullResult += textChunk;
    }

    // Save to cache
    try {
      await prisma.aICache.upsert({
        where: { url },
        create: {
          url,
          title,
          summaryShort: mode === "short" ? fullResult : undefined,
          summaryLong: mode === "long" ? fullResult : undefined,
          translation: mode === "translate" ? fullResult : undefined,
          model: "default",
          provider: "default",
        },
        update: {
          title,
          summaryShort: mode === "short" ? fullResult : undefined,
          summaryLong: mode === "long" ? fullResult : undefined,
          translation: mode === "translate" ? fullResult : undefined,
        },
      });
    } catch (dbError) {
      console.error("Failed to save to AICache:", dbError);
    }

    return {
      url,
      title,
      mode,
      content: fullResult,
      cached: false,
    };
  } catch (error: any) {
    console.error("Error reading article:", error);
    return { error: error.message || "Failed to read article" };
  }
}

/**
 * MCP Tools 定义
 */
export const mcpTools: MCPTool[] = [
  {
    name: "get_signals",
    description: "获取信号列表。可以按来源类型、时间范围、标签筛选。",
    inputSchema: {
      type: "object",
      properties: {
        cursor: {
          type: "string",
          description: "用于分页的游标",
        },
        limit: {
          type: "number",
          description: "返回数量限制 (默认 20, 最大 100)",
          default: 20,
        },
        sourceType: {
          type: "string",
          description: "来源类型: build(开发), market(市场), news(新闻), launch(产品)",
          enum: ["build", "market", "news", "launch"],
        },
        days: {
          type: "number",
          description: "返回最近几天的数据",
        },
        tag: {
          type: "string",
          description: "按标签筛选",
        },
        sourceId: {
          type: "string",
          description: "特定数据源 ID",
        },
      },
    },
    handler: getSignalsHandler,
  },
  {
    name: "get_signal_detail",
    description: "获取单个信号的详细内容",
    inputSchema: {
      type: "object",
      properties: {
        id: {
          type: "string",
          description: "信号 ID",
        },
      },
      required: ["id"],
    },
    handler: getSignalDetailHandler,
  },
  {
    name: "get_sources",
    description: "获取可用的数据源列表及其订阅状态",
    inputSchema: {
      type: "object",
      properties: {},
    },
    handler: getSourcesHandler,
  },
  {
    name: "read_article",
    description: "AI 读取文章内容，返回摘要或翻译",
    inputSchema: {
      type: "object",
      properties: {
        url: {
          type: "string",
          description: "文章 URL",
        },
        mode: {
          type: "string",
          description: "模式: short(短摘要), long(长摘要), translate(翻译)",
          enum: ["short", "long", "translate"],
          default: "short",
        },
      },
      required: ["url"],
    },
    handler: readArticleHandler,
  },
  {
    name: "mark_as_read",
    description: "标记信号为已读，模拟用户点击信号的操作",
    inputSchema: {
      type: "object",
      properties: {
        signalId: {
          type: "string",
          description: "要标记为已读的信号 ID",
        },
      },
      required: ["signalId"],
    },
    handler: markAsReadHandler,
  },
  {
    name: "favorite_signal",
    description: "收藏或取消收藏信号",
    inputSchema: {
      type: "object",
      properties: {
        signalId: {
          type: "string",
          description: "要收藏的信号 ID",
        },
        favorited: {
          type: "boolean",
          description: "true 为收藏，false 为取消收藏",
          default: true,
        },
      },
      required: ["signalId"],
    },
    handler: favoriteSignalHandler,
  },
  {
    name: "subscribe_source",
    description: "订阅或取消订阅数据源",
    inputSchema: {
      type: "object",
      properties: {
        sourceId: {
          type: "string",
          description: "数据源 ID",
        },
        subscribe: {
          type: "boolean",
          description: "true 为订阅，false 为取消订阅",
          default: true,
        },
      },
      required: ["sourceId"],
    },
    handler: subscribeSourceHandler,
  },
  {
    name: "search_signals",
    description: "搜索信号，可以按关键词在标题、摘要、标签中搜索",
    inputSchema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "搜索关键词",
        },
        limit: {
          type: "number",
          description: "返回数量限制 (默认 20)",
          default: 20,
        },
        cursor: {
          type: "string",
          description: "用于分页的游标",
        },
        sourceType: {
          type: "string",
          description: "来源类型筛选: build(开发), market(市场), news(新闻), launch(产品)",
          enum: ["build", "market", "news", "launch"],
        },
      },
      required: ["query"],
    },
    handler: searchSignalsHandler,
  },
  {
    name: "get_insights",
    description: "获取每日洞察，包括趋势分析、因果分析、对比分析等",
    inputSchema: {
      type: "object",
      properties: {
        date: {
          type: "string",
          description: "日期 (ISO 格式，如 '2024-01-15')，默认为今天",
        },
        limit: {
          type: "number",
          description: "返回数量限制 (默认 10)",
          default: 10,
        },
      },
    },
    handler: getInsightsHandler,
  },
];

/**
 * 获取所有工具定义（不含 handler）
 */
export function getToolDefinitions() {
  return mcpTools.map(({ name, description, inputSchema }) => ({
    name,
    description,
    inputSchema,
  }));
}
