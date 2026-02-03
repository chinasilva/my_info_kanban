import { NextResponse } from "next/server";
import { getSessionOrTestAuth } from "@/lib/auth/test-auth";
import { prisma } from "@/lib/prisma/db";

// 删除自定义 RSS 数据源
export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getSessionOrTestAuth(request);
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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
        if (source.createdById !== session.user.id) {
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
    } catch (error: any) {
        console.error("Delete RSS source error:", error);
        return NextResponse.json(
            { error: "删除数据源失败" },
            { status: 500 }
        );
    }
}
