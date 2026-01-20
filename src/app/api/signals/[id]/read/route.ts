import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import { prisma } from "@/lib/prisma/db";

// 标记信号为已读
export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: signalId } = await params;

    await prisma.userSignal.upsert({
        where: {
            userId_signalId: {
                userId: session.user.id,
                signalId,
            },
        },
        update: { isRead: true, readAt: new Date() },
        create: {
            userId: session.user.id,
            signalId,
            isRead: true,
            readAt: new Date(),
        },
    });

    return NextResponse.json({ success: true });
}
