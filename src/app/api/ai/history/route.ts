
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    try {
        const history = await prisma.aICache.findMany({
            orderBy: { updatedAt: 'desc' },
            take: 50,
            select: {
                id: true,
                url: true,
                title: true,
                updatedAt: true,
                summaryShort: true,
                summaryLong: true,
                translation: true,
                provider: true,
                model: true
            }
        });

        const formatted = history.map(item => ({
            id: item.id,
            url: item.url,
            title: item.title || item.url,
            updatedAt: item.updatedAt,
            hasShort: !!item.summaryShort,
            hasLong: !!item.summaryLong,
            hasTranslation: !!item.translation,
            modes: [
                item.summaryShort ? 'short' : null,
                item.summaryLong ? 'long' : null,
                item.translation ? 'translate' : null
            ].filter(Boolean)
        }));
        return NextResponse.json(formatted);
    } catch (error) {
        console.error('Failed to fetch reading history:', error);
        return NextResponse.json({ error: 'Failed to fetch history' }, { status: 500 });
    }
}
