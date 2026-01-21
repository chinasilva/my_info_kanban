"use client";

import { Code2, BarChart3, Newspaper, Rocket, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

export type SourceType = "build" | "market" | "news" | "launch" | "custom";

interface TabConfig {
    id: SourceType;
    label: string;
    labelZh: string;
    icon: React.ReactNode;
}

const TABS: TabConfig[] = [
    { id: "build", label: "Build", labelZh: "构建", icon: <Code2 className="tab-icon" /> },
    { id: "market", label: "Market", labelZh: "市场", icon: <BarChart3 className="tab-icon" /> },
    { id: "news", label: "News", labelZh: "资讯", icon: <Newspaper className="tab-icon" /> },
    { id: "launch", label: "Launch", labelZh: "发布", icon: <Rocket className="tab-icon" /> },
    { id: "custom", label: "Custom", labelZh: "自定义", icon: <Settings className="tab-icon" /> },
];

interface MobileTabBarProps {
    activeTab: SourceType;
    onTabChange: (tab: SourceType) => void;
    counts?: Partial<Record<SourceType, number>>;
    locale?: string;
}

export function MobileTabBar({
    activeTab,
    onTabChange,
    counts = {},
    locale = "en"
}: MobileTabBarProps) {
    const isZh = locale === "zh";

    // Filter out tabs with 0 signals
    const visibleTabs = TABS.filter(tab => {
        const count = counts[tab.id];
        return count === undefined || count > 0;
    });

    return (
        <nav className="mobile-tab-bar">
            {visibleTabs.map((tab) => (
                <button
                    key={tab.id}
                    onClick={() => onTabChange(tab.id)}
                    className={cn(
                        "mobile-tab-item",
                        activeTab === tab.id && "active"
                    )}
                >
                    {tab.icon}
                    <span>{isZh ? tab.labelZh : tab.label}</span>
                    {counts[tab.id] !== undefined && counts[tab.id]! > 0 && (
                        <span className="text-[9px] opacity-60">
                            {counts[tab.id]}
                        </span>
                    )}
                </button>
            ))}
        </nav>
    );
}
