import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/db";
import { getSessionOrAgentAuth } from "@/lib/auth/session-or-agent";

// 收藏/取消收藏信号
export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const authResult = await getSessionOrAgentAuth(request, {
        requiredPermissions: ["write:signals"],
    });
    if (!authResult.success || !authResult.userId) {
        return NextResponse.json(
            { error: authResult.error || "Unauthorized" },
            { status: authResult.status || 401 }
        );
    }

    const userId = authResult.userId;
    const { id: signalId } = await params;

    // 获取当前状态
    const existing = await prisma.userSignal.findUnique({
        where: {
            userId_signalId: {
                userId,
                signalId,
            },
        },
    });

    const newFavoriteStatus = !existing?.isFavorited;

    await prisma.userSignal.upsert({
        where: {
            userId_signalId: {
                userId,
                signalId,
            },
        },
        update: { isFavorited: newFavoriteStatus },
        create: {
            userId,
            signalId,
            isFavorited: newFavoriteStatus,
        },
    });

    return NextResponse.json({ success: true, isFavorited: newFavoriteStatus });
}
