import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import { prisma } from "@/lib/prisma/db";

/**
 * DELETE - 删除 API Key
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const { id } = await params;

  try {
    // 确保 key 属于当前用户
    const key = await prisma.agentApiKey.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
    });

    if (!key) {
      return NextResponse.json({ error: "API Key 不存在" }, { status: 404 });
    }

    await prisma.agentApiKey.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting API key:", error);
    return NextResponse.json({ error: "删除失败" }, { status: 500 });
  }
}

/**
 * PATCH - 更新 API Key (启用/禁用)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const body = await request.json();
    const { isActive } = body;

    // 确保 key 属于当前用户
    const key = await prisma.agentApiKey.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
    });

    if (!key) {
      return NextResponse.json({ error: "API Key 不存在" }, { status: 404 });
    }

    const updated = await prisma.agentApiKey.update({
      where: { id },
      data: { isActive },
      select: {
        id: true,
        name: true,
        description: true,
        permissions: true,
        isActive: true,
        expiresAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error("Error updating API key:", error);
    return NextResponse.json({ error: "更新失败" }, { status: 500 });
  }
}
