import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/db";
import { getSessionOrAgentAuth } from "@/lib/auth/session-or-agent";

// 删除自定义 RSS 数据源
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

    try {
        // 查找数据源
        const source = await prisma.source.findUnique({
            where: { id: sourceId },
        });

        if (!source) {
            return NextResponse.json(
                { error: "数据源不存在" },
                { status: 404 }
            );
        }

        // 内置数据源不可删除
        if (source.isBuiltIn) {
            return NextResponse.json(
                { error: "内置数据源无法删除" },
                { status: 403 }
            );
        }

        // 仅创建者可删除
        if (source.createdById !== userId) {
            return NextResponse.json(
                { error: "仅创建者可删除此数据源" },
                { status: 403 }
            );
        }

        // 级联删除：Prisma schema 已配置 onDelete: Cascade
        // 删除 Source 会自动删除相关的 UserSource 和 Signal
        await prisma.source.delete({
            where: { id: sourceId },
        });

        return NextResponse.json({ success: true });
    } catch (error: unknown) {
        console.error("Delete RSS source error:", error);
        return NextResponse.json(
            { error: "删除数据源失败" },
            { status: 500 }
        );
    }
}
