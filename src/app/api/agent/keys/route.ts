import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import { prisma } from "@/lib/prisma/db";
import { generateApiKey, AVAILABLE_PERMISSIONS } from "@/lib/auth/agent";

// ============ 验证请求体 ============
const CreateKeySchema = {
  name: (val: any) => {
    if (typeof val !== "string" || val.length < 1 || val.length > 100) {
      return "名称长度需在 1-100 字符之间";
    }
    return null;
  },
  description: (val: any) => {
    if (val !== undefined && (typeof val !== "string" || val.length > 500)) {
      return "描述长度不能超过 500 字符";
    }
    return null;
  },
  permissions: (val: any) => {
    if (!Array.isArray(val)) {
      return "权限必须是数组";
    }
    for (const p of val) {
      if (!AVAILABLE_PERMISSIONS.includes(p)) {
        return `无效的权限: ${p}`;
      }
    }
    return null;
  },
  expiresAt: (val: any) => {
    if (val !== undefined) {
      const date = new Date(val);
      if (isNaN(date.getTime())) {
        return "无效的过期时间";
      }
      if (date < new Date()) {
        return "过期时间不能是过去的时间";
      }
    }
    return null;
  },
};

/**
 * GET - 获取用户的 API Keys
 */
export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const keys = await prisma.agentApiKey.findMany({
    where: { userId: session.user.id },
    select: {
      id: true,
      name: true,
      description: true,
      permissions: true,
      isActive: true,
      expiresAt: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(keys);
}

/**
 * POST - 创建新的 API Key
 */
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { name, description, permissions, expiresAt } = body;

    // 验证 name
    const nameError = CreateKeySchema.name(name);
    if (nameError) {
      return NextResponse.json({ error: nameError }, { status: 400 });
    }

    // 验证 description
    const descError = CreateKeySchema.description(description);
    if (descError) {
      return NextResponse.json({ error: descError }, { status: 400 });
    }

    // 验证 permissions
    const permError = CreateKeySchema.permissions(permissions);
    if (permError) {
      return NextResponse.json({ error: permError }, { status: 400 });
    }

    // 验证 expiresAt
    const expiresError = CreateKeySchema.expiresAt(expiresAt);
    if (expiresError) {
      return NextResponse.json({ error: expiresError }, { status: 400 });
    }

    // 生成 API Key
    const key = generateApiKey();

    // 创建记录
    const agentKey = await prisma.agentApiKey.create({
      data: {
        key,
        name,
        description: description || null,
        permissions: permissions || ["read:signals", "read:sources"],
        isActive: true,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        userId: session.user.id,
      },
    });

    // 返回完整的 key（只返回一次）
    return NextResponse.json({
      id: agentKey.id,
      name: agentKey.name,
      key: agentKey.key, // 完整 key 只在创建时返回一次
      description: agentKey.description,
      permissions: agentKey.permissions,
      isActive: agentKey.isActive,
      expiresAt: agentKey.expiresAt?.toISOString(),
      createdAt: agentKey.createdAt.toISOString(),
    });
  } catch (error: any) {
    console.error("Error creating API key:", error);
    return NextResponse.json({ error: "创建失败" }, { status: 500 });
  }
}
