"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Calendar } from "lucide-react";

interface DatePickerProps {
    currentDate?: string;
    locale: string;
}

export function DatePicker({ currentDate, locale }: DatePickerProps) {
    const router = useRouter();
    const searchParams = useSearchParams();

    const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const date = e.target.value;
        const params = new URLSearchParams(searchParams.toString());

        if (date) {
            params.set("date", date);
        } else {
            params.delete("date");
        }

        // Reset to first page / clear tag if needed? 
        // For now just keep tag, but maybe we want to keep tag context.
        // The requirement says URL updates to /?date=YYYY-MM-DD

        router.push(`/${locale}?${params.toString()}`);
    };

    const clearDate = () => {
        const params = new URLSearchParams(searchParams.toString());
        params.delete("date");
        router.push(`/${locale}?${params.toString()}`);
    };

    return (
        <div className="flex items-center gap-2">
            <div className="relative flex items-center">
                <div className="absolute left-2 text-[var(--color-text-muted)] pointer-events-none">
                    <Calendar className="w-4 h-4" />
                </div>
                <input
                    type="date"
                    value={currentDate || ""}
                    onChange={handleDateChange}
                    max={new Date().toISOString().split("T")[0]} // Disable future dates
                    className="pl-8 pr-2 py-1.5 bg-[var(--color-background)] border border-[var(--color-border)] rounded-lg text-sm text-[var(--color-foreground)] focus:outline-none focus:border-[var(--color-accent)] transition-colors dark:[color-scheme:dark] min-w-[170px]"
                />
            </div>

            {currentDate && (
                <button
                    onClick={clearDate}
                    className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-accent)] hover:underline whitespace-nowrap px-2"
                >
                    {locale === "zh" ? "回到今天" : "Back to Today"}
                </button>
            )}
        </div>
    );
}
