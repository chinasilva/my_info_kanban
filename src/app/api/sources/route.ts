import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import { prisma } from "@/lib/prisma/db";

// 获取所有可用数据源
export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const sources = await prisma.source.findMany({
        where: { isActive: true },
        include: {
            subscribers: {
                where: { userId: session.user.id },
                select: { isEnabled: true, displayOrder: true },
            },
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
        isSubscribed: source.subscribers.length > 0 && source.subscribers[0].isEnabled,
        displayOrder: source.subscribers[0]?.displayOrder ?? 999,
    }));

    return NextResponse.json(result);
}
