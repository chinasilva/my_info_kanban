"use client";

import { useState, useRef } from "react";
import { Upload, FileText, CheckCircle, AlertCircle, Loader2, X } from "lucide-react";
import { useTranslations } from "next-intl";

interface OpmlImportDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export function OpmlImportDialog({ isOpen, onClose, onSuccess }: OpmlImportDialogProps) {
    const [file, setFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [result, setResult] = useState<{
        success: boolean;
        count?: number;
        totalFound?: number;
        errors?: string[];
        error?: string;
    } | null>(null);

    const t = useTranslations("SourcePage.opmlModal");

    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
            setResult(null);
        }
    };

    const handleUpload = async () => {
        if (!file) return;

        setUploading(true);
        setResult(null);

        const formData = new FormData();
        formData.append("file", file);

        try {
            const res = await fetch("/api/sources/opml", {
                method: "POST",
                body: formData,
            });

            const data = await res.json();
            setResult(data);
            // [FIX] Removed setTimeout that called onSuccess - Done button handles it
        } catch (error) {
            console.error("Upload failed", error);
            setResult({ success: false, error: t("networkError") });
        } finally {
            setUploading(false);
        }
    };

    const handleDone = () => {
        onClose();
        onSuccess();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <div className="bg-[#161b22] rounded-xl border border-[#30363d] w-full max-w-md p-6 relative">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-400 hover:text-white"
                >
                    <X className="w-5 h-5" />
                </button>

                <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                    <Upload className="w-5 h-5 text-blue-400" />
                    {t("title")}
                </h3>

                {!result?.success ? (
                    <div className="space-y-6">
                        <div
                            className={`
                                border-2 border-dashed rounded-xl p-8 text-center transition cursor-pointer
                                ${file
                                    ? "border-blue-500/50 bg-blue-500/5"
                                    : "border-gray-700 hover:border-gray-500 bg-[#0d1117]"
                                }
                            `}
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <input
                                type="file"
                                accept=".opml,.xml"
                                ref={fileInputRef}
                                onChange={handleFileChange}
                                className="hidden"
                            />

                            {file ? (
                                <div className="flex flex-col items-center gap-2">
                                    <FileText className="w-10 h-10 text-blue-400" />
                                    <span className="font-medium text-white">{file.name}</span>
                                    <span className="text-xs text-gray-500">
                                        {(file.size / 1024).toFixed(1)} KB
                                    </span>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center gap-2 text-gray-400">
                                    <Upload className="w-10 h-10 mb-2 opacity-50" />
                                    <p className="font-medium">{t("dropzoneTitle")}</p>
                                    <p className="text-xs text-gray-500">{t("dropzoneHint")}</p>
                                </div>
                            )}
                        </div>

                        {result?.error && (
                            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm flex items-start gap-2">
                                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                                <div>
                                    <p className="font-bold">{t("importFailed")}</p>
                                    <p>{result.error}</p>
                                </div>
                            </div>
                        )}

                        <div className="flex justify-end gap-3">
                            <button
                                onClick={onClose}
                                className="px-4 py-2 rounded-lg text-sm font-medium text-gray-300 hover:bg-[#21262d] transition"
                            >
                                {t("cancel")}
                            </button>
                            <button
                                onClick={handleUpload}
                                disabled={!file || uploading}
                                className="px-4 py-2 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center gap-2"
                            >
                                {uploading ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        {t("importing")}
                                    </>
                                ) : (
                                    t("import")
                                )}
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="text-center py-6 space-y-4">
                        <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto">
                            <CheckCircle className="w-8 h-8 text-green-500" />
                        </div>
                        <div>
                            <h4 className="text-lg font-bold text-white mb-1">{t("successTitle")}</h4>
                            <p className="text-gray-400">
                                {t("successMessage", { count: result.count ?? 0, total: result.totalFound ?? 0 })}
                            </p>
                        </div>

                        {result.errors && result.errors.length > 0 && (
                            <div className="mt-4 text-left bg-[#0d1117] rounded-lg p-3 max-h-32 overflow-y-auto border border-yellow-500/20">
                                <p className="text-xs font-bold text-yellow-500 mb-2 sticky top-0 bg-[#0d1117]">
                                    {t("skippedItems", { count: result.errors.length })}
                                </p>
                                <ul className="space-y-1">
                                    {result.errors.map((err, i) => (
                                        <li key={i} className="text-xs text-gray-400 truncate flex items-start gap-1">
                                            <span className="text-yellow-500/50">•</span> {err}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        <button
                            onClick={handleDone}
                            className="mt-6 px-6 py-2 rounded-lg bg-[#21262d] text-white hover:bg-[#30363d] transition w-full"
                        >
                            {t("done")}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
