import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import { SignalQuerySchema } from "@/schemas/api";

export async function GET(request: NextRequest) {
    const apiKey = request.headers.get("x-api-key");
    let userId: string | null = null;

    // API Key 认证（用于终端测试）
    if (apiKey && apiKey === process.env.API_SECRET_KEY) {
        // 使用 API Key 时，获取第一个用户作为测试用户
        const testUser = await prisma.user.findFirst();
        if (testUser) {
            userId = testUser.id;
        }
    } else {
        // 正常 Session 认证
        const session = await getServerSession(authOptions);
        if (session?.user?.id) {
            userId = session.user.id;
        }
    }

    if (!userId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = Object.fromEntries(request.nextUrl.searchParams);

    // Zod Validation & Parsing
    const query = SignalQuerySchema.safeParse(searchParams);

    if (!query.success) {
        return NextResponse.json({ error: "Invalid query parameters", details: query.error.format() }, { status: 400 });
    }

    const { cursor, limit, sourceType, days } = query.data;

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
            isEnabled: true
        },
        include: { source: true }
    });

    const subscribedSourceIds = userSources.map(us => us.sourceId);

    // Filter by source type if provided
    let filteredSourceIds = subscribedSourceIds;
    if (sourceType && SOURCE_GROUPS[sourceType]) {
        const allowedTypes = SOURCE_GROUPS[sourceType];
        filteredSourceIds = userSources
            .filter(us => allowedTypes.includes(us.source.type))
            .map(us => us.sourceId);
    } else if (sourceType === 'custom') {
        // Custom sources: RSS and types not in any group
        const allGroupTypes = Object.values(SOURCE_GROUPS).flat();
        filteredSourceIds = userSources
            .filter(us => us.source.type === 'rss' || !allGroupTypes.includes(us.source.type))
            .map(us => us.sourceId);
    }

    // Calculate date filter
    const dateFilter = new Date();
    dateFilter.setDate(dateFilter.getDate() - days);

    // Build query
    const signals = await prisma.signal.findMany({
        where: {
            sourceId: { in: filteredSourceIds },
            createdAt: { gte: dateFilter },
            ...(cursor ? { id: { lt: cursor } } : {})
        },
        orderBy: { createdAt: "desc" },
        take: limit + 1, // Fetch one extra to check if there's more
        include: {
            source: true,
            userStates: {
                where: { userId: userId },
                select: { isRead: true, isFavorited: true }
            }
        }
    });

    const hasMore = signals.length > limit;
    const data = hasMore ? signals.slice(0, -1) : signals;
    const nextCursor = hasMore ? data[data.length - 1]?.id : null;

    // Transform data
    const transformedData = data.map(s => ({
        ...s,
        createdAt: s.createdAt.toISOString(),
        isRead: s.userStates[0]?.isRead ?? false,
        isFavorited: s.userStates[0]?.isFavorited ?? false,
    }));

    return NextResponse.json({
        signals: transformedData,
        nextCursor,
        hasMore
    });
}
