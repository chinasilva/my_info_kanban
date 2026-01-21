"use client";

export default function Loading() {
    return (
        <main className="min-h-screen bg-[#0d1117] overflow-hidden">
            {/* Header Skeleton */}
            <header className="h-14 border-b border-[#21262d] flex items-center justify-between px-4">
                <div className="flex items-center gap-3">
                    <div className="w-6 h-6 bg-white/10 rounded animate-pulse" />
                    <div className="w-24 h-5 bg-white/10 rounded animate-pulse" />
                </div>
                <div className="flex items-center gap-3">
                    <div className="w-20 h-8 bg-white/10 rounded animate-pulse" />
                    <div className="w-8 h-8 bg-white/10 rounded-full animate-pulse" />
                </div>
            </header>

            {/* Kanban Skeleton */}
            <div className="flex h-[calc(100vh-56px)] gap-[1px] bg-[#30363d]/70">
                {[1, 2, 3, 4].map((col) => (
                    <div key={col} className="flex-1 min-w-[280px] max-w-[500px] bg-[#0d1117] flex flex-col">
                        {/* Column Header */}
                        <div className="p-4 border-b border-[#30363d]">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-white/5 rounded-lg animate-pulse" />
                                <div className="space-y-2">
                                    <div className="w-16 h-4 bg-white/10 rounded animate-pulse" />
                                    <div className="w-24 h-3 bg-white/5 rounded animate-pulse" />
                                </div>
                            </div>
                        </div>
                        {/* Card Skeletons */}
                        <div className="flex-1 p-2 space-y-2 overflow-hidden">
                            {[1, 2, 3, 4, 5].map((card) => (
                                <div key={card} className="p-4 border-b border-[#30363d]/70 space-y-3">
                                    <div className="flex justify-between">
                                        <div className="w-12 h-3 bg-white/10 rounded animate-pulse" />
                                        <div className="w-8 h-3 bg-white/10 rounded animate-pulse" />
                                    </div>
                                    <div className="w-full h-4 bg-white/10 rounded animate-pulse" />
                                    <div className="w-3/4 h-4 bg-white/5 rounded animate-pulse" />
                                    <div className="w-1/2 h-3 bg-white/5 rounded animate-pulse" />
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </main>
    );
}
