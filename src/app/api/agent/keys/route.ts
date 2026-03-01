import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import { prisma } from "@/lib/prisma/db";
import { generateApiKey, AVAILABLE_PERMISSIONS } from "@/lib/auth/agent";
import { DEFAULT_AGENT_PERMISSIONS, type Permission } from "@/lib/auth/permissions";

function isPermission(value: string): value is Permission {
  return AVAILABLE_PERMISSIONS.includes(value as Permission);
}

// ============ 验证请求体 ============
const CreateKeySchema = {
  name: (val: unknown) => {
    if (typeof val !== "string" || val.length < 1 || val.length > 100) {
      return "名称长度需在 1-100 字符之间";
    }
    return null;
  },
  description: (val: unknown) => {
    if (val !== undefined && (typeof val !== "string" || val.length > 500)) {
      return "描述长度不能超过 500 字符";
    }
    return null;
  },
  permissions: (val: unknown) => {
    if (val === undefined) {
      return null;
    }
    if (!Array.isArray(val)) {
      return "权限必须是数组";
    }
    for (const p of val) {
      if (typeof p !== "string" || !isPermission(p)) {
        return `无效的权限: ${p}`;
      }
    }
    return null;
  },
  expiresAt: (val: unknown) => {
    if (val !== undefined) {
      if (
        typeof val !== "string" &&
        typeof val !== "number" &&
        !(val instanceof Date)
      ) {
        return "无效的过期时间";
      }
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
    const body = (await request.json()) as {
      name?: unknown;
      description?: unknown;
      permissions?: unknown;
      expiresAt?: unknown;
    };
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
    const safeName = name as string;
    const safeDescription = typeof description === "string" ? description : null;
    const safePermissions = Array.isArray(permissions)
      ? (permissions as Permission[])
      : DEFAULT_AGENT_PERMISSIONS;
    const safeExpiresAt =
      typeof expiresAt === "string" ||
      typeof expiresAt === "number" ||
      expiresAt instanceof Date
        ? new Date(expiresAt)
        : null;

    // 创建记录
    const agentKey = await prisma.agentApiKey.create({
      data: {
        key,
        name: safeName,
        description: safeDescription,
        permissions: safePermissions,
        isActive: true,
        expiresAt: safeExpiresAt,
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
  } catch (error: unknown) {
    console.error("Error creating API key:", error);
    return NextResponse.json({ error: "创建失败" }, { status: 500 });
  }
}
