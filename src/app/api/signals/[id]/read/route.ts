import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/db";
import { getSessionOrAgentAuth } from "@/lib/auth/session-or-agent";

// 标记信号为已读
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

    await prisma.userSignal.upsert({
        where: {
            userId_signalId: {
                userId,
                signalId,
            },
        },
        update: { isRead: true, readAt: new Date() },
        create: {
            userId,
            signalId,
            isRead: true,
            readAt: new Date(),
        },
    });

    return NextResponse.json({ success: true });
}
