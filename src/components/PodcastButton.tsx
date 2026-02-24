"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Mic, X, Loader2, Play, Pause, Check } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

interface PodcastButtonProps {
  locale: string;
}

interface SourceOption {
  id: string;
  name: string;
  icon?: string | null;
}

interface PodcastResult {
  script: string;
  signalCount: number;
  sources: string[];
  language: string;
  style: string;
}

// Date range options
const DATE_RANGES = [
  { value: 1, label: { zh: '最近 1 天', en: '1 Day' } },
  { value: 3, label: { zh: '最近 3 天', en: '3 Days' } },
  { value: 7, label: { zh: '最近 1 周', en: '1 Week' } },
  { value: 14, label: { zh: '最近 2 周', en: '2 Weeks' } },
];

export function PodcastButton({ locale }: PodcastButtonProps) {
  const [open, setOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [result, setResult] = useState<PodcastResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Settings
  const [dateRange, setDateRange] = useState<number>(7);
  const [selectedSources, setSelectedSources] = useState<string[]>([]);
  const [sources, setSources] = useState<SourceOption[]>([]);
  const [loadingSources, setLoadingSources] = useState(false);
  const [language, setLanguage] = useState<'zh' | 'en'>('zh');

  const synthesisRef = useRef<SpeechSynthesis | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Fetch user subscribed sources when sheet opens
  useEffect(() => {
    if (open && sources.length === 0) {
      setLoadingSources(true);
      fetch('/api/sources')
        .then(res => res.json())
        .then(data => {
          // API returns array directly
          const sourceList = Array.isArray(data) ? data : [];
          setSources(sourceList);
          // Auto-select all sources
          setSelectedSources(sourceList.map((s: SourceOption) => s.id));
        })
        .catch(err => console.error('Failed to fetch sources:', err))
        .finally(() => setLoadingSources(false));
    }
  }, [open]);

  // Initialize speech synthesis
  const initSpeech = () => {
    if (typeof window !== 'undefined' && !synthesisRef.current) {
      synthesisRef.current = window.speechSynthesis;
    }
  };

  const toggleSource = (sourceId: string) => {
    setSelectedSources(prev =>
      prev.includes(sourceId)
        ? prev.filter(id => id !== sourceId)
        : [...prev, sourceId]
    );
  };

  const handleGenerate = async () => {
    if (selectedSources.length === 0) return;

    setIsGenerating(true);
    setError(null);

    try {
      const response = await fetch('/api/podcast/generate-script', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceIds: selectedSources,
          dateRange,
          maxSignals: 10,
          language,
          style: 'casual',
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate');
      }

      const data = await response.json();
      setResult(data.data);
    } catch (err: any) {
      setError(err.message || 'Failed to generate podcast');
    } finally {
      setIsGenerating(false);
    }
  };

  const togglePlay = useCallback(() => {
    if (!synthesisRef.current || !result) return;

    initSpeech();

    if (isPlaying) {
      synthesisRef.current.cancel();
      setIsPlaying(false);
    } else {
      const utterance = new SpeechSynthesisUtterance(result.script);
      utteranceRef.current = utterance;
      utterance.lang = language === 'zh' ? 'zh-CN' : 'en-US';

      utterance.onstart = () => setIsPlaying(true);
      utterance.onend = () => {
        setIsPlaying(false);
        utteranceRef.current = null;
      };
      utterance.onerror = () => {
        setIsPlaying(false);
        utteranceRef.current = null;
      };

      synthesisRef.current.speak(utterance);
    }
  }, [isPlaying, result, language]);

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      // Reset on close
      setResult(null);
      setError(null);
      synthesisRef.current?.cancel();
      setIsPlaying(false);
    } else {
      initSpeech();
    }
  };

  const t = {
    buttonLabel: locale === "zh" ? "播客" : "Podcast",
    title: locale === "zh" ? "生成播客" : "Generate Podcast",
    dateRange: locale === "zh" ? "时间范围" : "Time Range",
    selectSources: locale === "zh" ? "选择来源" : "Select Sources",
    language: locale === "zh" ? "语言" : "Language",
    generate: locale === "zh" ? "生成播客" : "Generate Podcast",
    playing: locale === "zh" ? "播放中..." : "Playing...",
    loadingSources: locale === "zh" ? "加载数据源..." : "Loading...",
    noSources: locale === "zh" ? "请选择至少一个来源" : "Please select at least one source",
    selectAll: locale === "zh" ? "全选" : "All",
    clearAll: locale === "zh" ? "清空" : "Clear",
    clickToPlay: locale === "zh" ? "点击播放" : "Click to play",
  };

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetTrigger asChild>
        <button
          className={cn(
            "flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg transition-colors",
            "bg-[var(--color-card)] border border-[var(--color-border)]",
            "hover:bg-[var(--color-card-hover)] text-[var(--color-foreground)]"
          )}
          title={t.buttonLabel}
        >
          <Mic className="w-4 h-4" />
          <span className="hidden sm:inline">{t.buttonLabel}</span>
        </button>
      </SheetTrigger>

      <SheetContent side="bottom" className="h-[85vh] rounded-t-xl bg-[var(--color-card)] border-[var(--color-border)]">
        <SheetHeader className="flex flex-row items-center justify-between pb-4 border-b border-[var(--color-border)]">
          <SheetTitle className="text-lg font-semibold text-[var(--color-foreground)]">
            {t.title}
          </SheetTitle>
          <button
            onClick={() => setOpen(false)}
            className="p-1 hover:bg-[var(--color-card-hover)] rounded"
          >
            <X className="w-4 h-4 text-[var(--color-text-muted)]" />
          </button>
        </SheetHeader>

        {!result ? (
          <div className="py-6 space-y-6 overflow-y-auto max-h-[calc(85vh-80px)]">
            {/* Date Range Selection */}
            <div>
              <label className="block text-sm font-medium text-[var(--color-text-muted)] mb-3">
                {t.dateRange}
              </label>
              <div className="grid grid-cols-4 gap-2">
                {DATE_RANGES.map(range => (
                  <button
                    key={range.value}
                    onClick={() => setDateRange(range.value)}
                    className={cn(
                      "px-3 py-2.5 text-sm rounded-lg border transition-all",
                      dateRange === range.value
                        ? "bg-[var(--color-primary)] border-[var(--color-primary)] text-white shadow-sm"
                        : "bg-[var(--color-background)] border-[var(--color-border)] hover:bg-[var(--color-card-hover)]"
                    )}
                  >
                    {range.label[locale as keyof typeof range.label]}
                  </button>
                ))}
              </div>
            </div>

            {/* Source Selection */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-medium text-[var(--color-text-muted)]">
                  {t.selectSources}
                </label>
                <div className="flex gap-3 text-xs">
                  <button
                    onClick={() => setSelectedSources(sources.map(s => s.id))}
                    className="text-[var(--color-accent)] hover:underline"
                  >
                    {t.selectAll}
                  </button>
                  <span className="text-[var(--color-text-muted)]">|</span>
                  <button
                    onClick={() => setSelectedSources([])}
                    className="text-[var(--color-text-muted)] hover:text-[var(--color-foreground)] hover:underline"
                  >
                    {t.clearAll}
                  </button>
                </div>
              </div>

              {loadingSources ? (
                <div className="flex items-center gap-2 py-8 text-sm text-[var(--color-text-muted)]">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {t.loadingSources}
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {sources.map((source) => (
                    <button
                      key={source.id}
                      onClick={() => toggleSource(source.id)}
                      className={cn(
                        "px-3 py-2 text-sm rounded-lg border transition-all flex items-center gap-1.5",
                        selectedSources.includes(source.id)
                          ? "bg-[var(--color-primary)] border-[var(--color-primary)] text-white shadow-sm"
                          : "bg-[var(--color-background)] border-[var(--color-border)] hover:bg-[var(--color-card-hover)]"
                      )}
                    >
                      {selectedSources.includes(source.id) && (
                        <Check className="w-3 h-3" />
                      )}
                      <span>{source.icon} {source.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Language Selection */}
            <div>
              <label className="block text-sm font-medium text-[var(--color-text-muted)] mb-3">
                {t.language}
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => setLanguage('zh')}
                  className={cn(
                    "flex-1 px-3 py-2.5 text-sm rounded-lg border transition-all",
                    language === 'zh'
                      ? "bg-[var(--color-primary)] border-[var(--color-primary)] text-white shadow-sm"
                      : "bg-[var(--color-background)] border-[var(--color-border)] hover:bg-[var(--color-card-hover)]"
                  )}
                >
                  中文
                </button>
                <button
                  onClick={() => setLanguage('en')}
                  className={cn(
                    "flex-1 px-3 py-2.5 text-sm rounded-lg border transition-all",
                    language === 'en'
                      ? "bg-[var(--color-primary)] border-[var(--color-primary)] text-white shadow-sm"
                      : "bg-[var(--color-background)] border-[var(--color-border)] hover:bg-[var(--color-card-hover)]"
                  )}
                >
                  English
                </button>
              </div>
            </div>

            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400 text-sm">
                {error}
              </div>
            )}

            {/* Generate Button */}
            <button
              onClick={handleGenerate}
              disabled={isGenerating || selectedSources.length === 0}
              className={cn(
                "w-full py-3 rounded-lg font-medium transition-all flex items-center justify-center gap-2 shadow-md",
                selectedSources.length === 0
                  ? "bg-[var(--color-card-hover)] text-[var(--color-text-muted)] cursor-not-allowed"
                  : "bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent)]/90"
              )}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {locale === "zh" ? "生成中..." : "Generating..."}
                </>
              ) : (
                <>
                  <Mic className="w-4 h-4" />
                  {t.generate}
                </>
              )}
            </button>
          </div>
        ) : (
          <div className="py-6 space-y-6 overflow-y-auto max-h-[calc(85vh-80px)]">
            {/* Result */}
            <div className="p-4 bg-[var(--color-background)] border border-[var(--color-border)] rounded-xl">
              <div className="flex items-center gap-4">
                <button
                  onClick={togglePlay}
                  className="w-12 h-12 rounded-full bg-[var(--color-primary)] text-white flex items-center justify-center hover:scale-105 transition-transform shadow-md"
                >
                  {isPlaying ? (
                    <Pause className="w-5 h-5" />
                  ) : (
                    <Play className="w-5 h-5 ml-0.5" />
                  )}
                </button>
                <div>
                  <div className="text-base font-medium text-[var(--color-foreground)]">
                    {result.signalCount} {locale === "zh" ? "条新闻" : "news items"}
                  </div>
                  <div className="text-sm text-[var(--color-text-muted)]">
                    {isPlaying ? t.playing : t.clickToPlay}
                  </div>
                </div>
              </div>
            </div>

            {/* Script Preview */}
            <details className="group">
              <summary className="cursor-pointer text-sm text-[var(--color-text-muted)] hover:text-[var(--color-foreground)] py-2">
                {locale === "zh" ? "查看脚本内容" : "View Script"}
              </summary>
              <div className="mt-3 p-4 bg-[var(--color-background)] border border-[var(--color-border)] rounded-lg text-sm whitespace-pre-wrap text-[var(--color-text-muted)] max-h-64 overflow-y-auto">
                {result.script}
              </div>
            </details>

            <button
              onClick={() => setResult(null)}
              className="w-full py-2.5 rounded-lg font-medium bg-[var(--color-card-hover)] border border-[var(--color-border)] hover:bg-[var(--color-background)] transition-all"
            >
              {locale === "zh" ? "重新生成" : "Regenerate"}
            </button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
