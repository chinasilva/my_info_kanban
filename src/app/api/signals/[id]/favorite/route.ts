import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import { prisma } from "@/lib/prisma/db";

// 收藏/取消收藏信号
export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: signalId } = await params;

    // 获取当前状态
    const existing = await prisma.userSignal.findUnique({
        where: {
            userId_signalId: {
                userId: session.user.id,
                signalId,
            },
        },
    });

    const newFavoriteStatus = !existing?.isFavorited;

    await prisma.userSignal.upsert({
        where: {
            userId_signalId: {
                userId: session.user.id,
                signalId,
            },
        },
        update: { isFavorited: newFavoriteStatus },
        create: {
            userId: session.user.id,
            signalId,
            isFavorited: newFavoriteStatus,
        },
    });

    return NextResponse.json({ success: true, isFavorited: newFavoriteStatus });
}
