import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma/db";
import { getSessionOrAgentAuth } from "@/lib/auth/session-or-agent";

// 获取所有可用数据源
export async function GET(request: Request) {
    const authResult = await getSessionOrAgentAuth(request, {
        requiredPermissions: ["read:sources"],
        allowGuest: true,
    });
    if (!authResult.success) {
        return NextResponse.json(
            { error: authResult.error || "Unauthorized" },
            { status: authResult.status || 401 }
        );
    }

    const userId = authResult.userId;

    // If guest, only show built-in sources
    const whereCondition: Prisma.SourceWhereInput = { isActive: true };
    if (!userId) {
        whereCondition.isBuiltIn = true;
    }

    const sources = await prisma.source.findMany({
        where: whereCondition,
        include: {
            subscribers: userId ? {
                where: { userId: userId },
                select: { isEnabled: true, displayOrder: true },
            } : false,
            _count: {
                select: { signals: true },
            },
        },
        orderBy: [{ isBuiltIn: "desc" }, { name: "asc" }],
    });

    const result = sources.map((source) => ({
        id: source.id,
        name: source.name,
        type: source.type,
        baseUrl: source.baseUrl,
        icon: source.icon,
        isBuiltIn: source.isBuiltIn,
        signalCount: source._count.signals,
        isSubscribed: userId ? (source.subscribers.length > 0 && source.subscribers[0].isEnabled) : false,
        displayOrder: userId ? (source.subscribers[0]?.displayOrder ?? 999) : 999,
    }));

    return NextResponse.json(result);
}
