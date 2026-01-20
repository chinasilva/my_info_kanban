import { NextResponse } from "next/server";
import { ScraperRunner } from "@/lib/scraper/runner";

export async function GET() {
    try {
        const runner = new ScraperRunner();
        const results = await runner.runAll();

        return NextResponse.json({
            success: true,
            results,
        });
    } catch (error: any) {
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}
