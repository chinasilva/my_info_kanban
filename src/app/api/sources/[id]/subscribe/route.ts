import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import { prisma } from "@/lib/prisma/db";

// 订阅数据源
export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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
                userId: session.user.id,
                sourceId,
            },
        },
        update: { isEnabled: true },
        create: {
            userId: session.user.id,
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
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: sourceId } = await params;

    await prisma.userSource.updateMany({
        where: {
            userId: session.user.id,
            sourceId,
        },
        data: { isEnabled: false },
    });

    return NextResponse.json({ success: true });
}
