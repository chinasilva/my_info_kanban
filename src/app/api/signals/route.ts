import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma/db";
import { SignalQuerySchema } from "@/schemas/api";
import { getSessionOrAgentAuth } from "@/lib/auth/session-or-agent";

export async function GET(request: NextRequest) {
    const authResult = await getSessionOrAgentAuth(request, {
        requiredPermissions: ["read:signals"],
        allowGuest: true,
    });
    if (!authResult.success) {
        return NextResponse.json(
            { error: authResult.error || "Unauthorized" },
            { status: authResult.status || 401 }
        );
    }

    const userId = authResult.userId || null;

    // Remove strict 401 check. Proceed as guest if no userId.

    const searchParams = Object.fromEntries(request.nextUrl.searchParams);
    const query = SignalQuerySchema.safeParse(searchParams);

    if (!query.success) {
        return NextResponse.json({ error: "Invalid query parameters", details: query.error.format() }, { status: 400 });
    }

    const { cursor, limit, sourceType, tag, date, sourceId } = query.data;

    // Source type to actual source types mapping
    const SOURCE_GROUPS: Record<string, string[]> = {
        build: ["github", "huggingface", "devto"],
        market: ["polymarket", "cryptopanic", "dune"],
        news: ["hackernews", "substack"],
        launch: ["producthunt"],
        demand: ["gov_procurement", "research_report", "recruitment", "app_rank", "social_demand", "overseas_trend"],
    };

    type UserSourceLike = {
        sourceId: string;
        source: { type: string };
    };

    let subscribedSourceIds: string[] = [];
    let userSources: UserSourceLike[] = []; // Only populated if user is logged in

    if (userId) {
        // Logged-in user: Get subscribed sources
        userSources = await prisma.userSource.findMany({
            where: {
                userId: userId,
                isEnabled: true
            },
            select: {
                sourceId: true,
                source: {
                    select: {
                        type: true,
                    }
                }
            }
        });
        subscribedSourceIds = userSources.map(us => us.sourceId);
    } else {
        // Guest: Get built-in sources
        const builtInSources = await prisma.source.findMany({
            where: { isBuiltIn: true },
            select: {
                id: true,
                type: true,
            }
        });
        subscribedSourceIds = builtInSources.map(s => s.id);

        // Mock userSources structure for filtering logic below
        userSources = builtInSources.map(s => ({
            sourceId: s.id,
            source: { type: s.type },
        }));
    }

    // Filter by source type if provided
    let filteredSourceIds = subscribedSourceIds;

    // [NEW] If specific sourceId is requested, filter strictly by it (if subscribed)
    if (sourceId) {
        if (subscribedSourceIds.includes(sourceId)) {
            filteredSourceIds = [sourceId];
        } else {
            // Requested source not subscribed or invalid -> return empty
            filteredSourceIds = [];
        }
    } else if (sourceType && SOURCE_GROUPS[sourceType]) {
        const allowedTypes = SOURCE_GROUPS[sourceType];
        filteredSourceIds = userSources
            .filter(us => allowedTypes.includes(us.source.type))
            .map(us => us.sourceId);
    } else if (sourceType === 'custom') {
        const allGroupTypes = Object.values(SOURCE_GROUPS).flat();
        filteredSourceIds = userSources
            .filter(us => us.source.type === 'rss' || !allGroupTypes.includes(us.source.type))
            .map(us => us.sourceId);
    }

    // Build base where clause
    const whereClause: Prisma.SignalWhereInput = {
        sourceId: { in: filteredSourceIds },
        ...(cursor ? { id: { lt: cursor } } : {})
    };

    // [NEW] 需求挖掘类型过滤无效信号
    if (sourceType === 'demand') {
        whereClause.isValidDemand = true;
    }

    // Date Filtering Logic
    if (date) {
        // Specific Date Logic (Time Machine)
        const startDate = new Date(date);
        startDate.setHours(0, 0, 0, 0);
        const endDate = new Date(date);
        endDate.setHours(23, 59, 59, 999);

        whereClause.createdAt = {
            gte: startDate,
            lte: endDate
        };
    }
    // Note: If no date and no explicit days param in URL, skip time filtering for infinite scroll
    // This allows loading all historical data

    // Tag Filtering Logic
    // Only apply tag filter if NOT filtering by specific sourceId (according to "pure timeline" spec)
    // Or allow both? Spec said: "点击 Source Tab -> 仅显示来自该源的内容（纯时间线模式，不包含 AI 筛选）"
    // So we ignore tag if sourceId is present.
    if (tag && !sourceId) {
        whereClause.OR = [
            { tags: { has: tag } },
            { tagsZh: { has: tag } }
        ];
    }

    // Build query
    const signals = await prisma.signal.findMany({
        where: whereClause,
        orderBy: { createdAt: "desc" },
        take: limit + 1, // Fetch one extra to check if there's more
        include: {
            source: true,
            ...(userId ? {
                userStates: {
                    where: { userId: userId },
                    select: { isRead: true, isFavorited: true }
                }
            } : {})
        }
    });

    const hasMore = signals.length > limit;
    const data = hasMore ? signals.slice(0, -1) : signals;
    const nextCursor = hasMore ? data[data.length - 1]?.id : null;

    // Transform data
    const transformedData = data.map(s => ({
        ...s,
        createdAt: s.createdAt.toISOString(),
        isRead: userId ? (s.userStates?.[0]?.isRead ?? false) : false,
        isFavorited: userId ? (s.userStates?.[0]?.isFavorited ?? false) : false,
        platform: s.platform || s.source?.name || null,
    }));

    return NextResponse.json({
        signals: transformedData,
        nextCursor,
        hasMore
    });
}
