import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/db";
import { getSessionOrAgentAuth } from "@/lib/auth/session-or-agent";

// 订阅数据源
export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const authResult = await getSessionOrAgentAuth(request, {
        requiredPermissions: ["write:sources"],
    });
    if (!authResult.success || !authResult.userId) {
        return NextResponse.json(
            { error: authResult.error || "Unauthorized" },
            { status: authResult.status || 401 }
        );
    }

    const userId = authResult.userId;
    const { id: sourceId } = await params;

    // 检查数据源是否存在
    const source = await prisma.source.findUnique({
        where: { id: sourceId },
    });

    if (!source) {
        return NextResponse.json({ error: "数据源不存在" }, { status: 404 });
    }

    await prisma.userSource.upsert({
        where: {
            userId_sourceId: {
                userId,
                sourceId,
            },
        },
        update: { isEnabled: true },
        create: {
            userId,
            sourceId,
            isEnabled: true,
        },
    });

    return NextResponse.json({ success: true });
}

// 取消订阅数据源
export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const authResult = await getSessionOrAgentAuth(request, {
        requiredPermissions: ["write:sources"],
    });
    if (!authResult.success || !authResult.userId) {
        return NextResponse.json(
            { error: authResult.error || "Unauthorized" },
            { status: authResult.status || 401 }
        );
    }

    const userId = authResult.userId;
    const { id: sourceId } = await params;

    await prisma.userSource.updateMany({
        where: {
            userId,
            sourceId,
        },
        data: { isEnabled: false },
    });

    return NextResponse.json({ success: true });
}
