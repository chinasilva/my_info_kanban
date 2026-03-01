import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/db";
import { getSessionOrAgentAuth } from "@/lib/auth/session-or-agent";

// 获取单个信号详情
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await getSessionOrAgentAuth(request, {
    requiredPermissions: ["read:signals"],
    allowGuest: true,
  });
  if (!authResult.success) {
    return NextResponse.json(
      { error: authResult.error || "Unauthorized" },
      { status: authResult.status || 401 }
    );
  }

  const userId = authResult.userId || null;
  const { id } = await params;

  const signal = await prisma.signal.findUnique({
    where: { id },
    include: {
      source: {
        select: { id: true, name: true, type: true, baseUrl: true, icon: true, isBuiltIn: true },
      },
      ...(userId
        ? {
            userStates: {
              where: { userId },
              select: { isRead: true, isFavorited: true },
            },
          }
        : {}),
    },
  });

  if (!signal) {
    return NextResponse.json({ error: "Signal not found" }, { status: 404 });
  }

  if (!userId && !signal.source.isBuiltIn) {
    return NextResponse.json(
      { error: "Guest mode can only access built-in sources" },
      { status: 403 }
    );
  }

  if (userId) {
    const canAccess = await prisma.userSource.findFirst({
      where: { userId, sourceId: signal.sourceId, isEnabled: true },
      select: { id: true },
    });

    if (!canAccess && !signal.source.isBuiltIn) {
      return NextResponse.json(
        { error: "You don't have access to this signal's source" },
        { status: 403 }
      );
    }
  }

  return NextResponse.json({
    id: signal.id,
    title: signal.title,
    url: signal.url,
    summary: signal.summary,
    score: signal.score,
    source: signal.source,
    tags: signal.tags,
    tagsZh: signal.tagsZh,
    aiSummary: signal.aiSummary,
    aiSummaryZh: signal.aiSummaryZh,
    titleTranslated: signal.titleTranslated,
    externalId: signal.externalId,
    metadata: signal.metadata,
    createdAt: signal.createdAt.toISOString(),
    updatedAt: signal.updatedAt.toISOString(),
    isRead: userId ? signal.userStates?.[0]?.isRead ?? false : false,
    isFavorited: userId ? signal.userStates?.[0]?.isFavorited ?? false : false,
  });
}
