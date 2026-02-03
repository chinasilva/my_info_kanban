import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import { prisma } from "@/lib/prisma/db";

// 获取所有可用数据源
export async function GET() {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;

    // If guest, only show built-in sources
    const whereCondition: any = { isActive: true };
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
