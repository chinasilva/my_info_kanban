import { NextRequest, NextResponse } from 'next/server';
import { getPodcastGenerator } from '@/lib/podcast/generator';

export const runtime = 'nodejs';

// Increase timeout for script generation
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      sourceIds,
      dateRange = 7,
      maxSignals = 10,
      language = 'zh',
      style = 'casual',
    } = body;

    // Validate input
    if (maxSignals > 20) {
      return NextResponse.json(
        { error: 'maxSignals cannot exceed 20' },
        { status: 400 }
      );
    }

    if (!sourceIds || sourceIds.length === 0) {
      return NextResponse.json(
        { error: 'Please select at least one source' },
        { status: 400 }
      );
    }

    // Generate podcast script
    const generator = getPodcastGenerator();
    const podcastContent = await generator.generate({
      sourceIds,
      dateRange,
      maxSignals,
      language,
      style,
    });

    return NextResponse.json({
      success: true,
      data: {
        script: podcastContent.script,
        signalCount: podcastContent.signalCount,
        sources: podcastContent.sources,
        language: podcastContent.language,
        style: podcastContent.style,
        estimatedDuration: podcastContent.estimatedDuration,
      },
    });
  } catch (error: any) {
    console.error('Podcast script generation error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate podcast script' },
      { status: 500 }
    );
  }
}

// GET: Return available options
export async function GET() {
  return NextResponse.json({
    options: {
      styles: ['casual', 'professional', 'news'],
      languages: ['zh', 'en'],
      dateRanges: [
        { value: 1, label: { zh: '最近 1 天', en: 'Last 1 Day' } },
        { value: 3, label: { zh: '最近 3 天', en: 'Last 3 Days' } },
        { value: 7, label: { zh: '最近 1 周', en: 'Last Week' } },
        { value: 14, label: { zh: '最近 2 周', en: 'Last 2 Weeks' } },
      ],
      defaultMaxSignals: 10,
      maxMaxSignals: 20,
    },
    ttsMethod: 'browser-web-speech-api',
    notice: 'Using Web Speech API for text-to-speech in the browser. No server-side TTS required.',
  });
}
