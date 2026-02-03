"use client";

import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";

interface ConfirmDialogProps {
    isOpen: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    loadingLabel?: string;
    variant?: "danger" | "warning";
    isLoading?: boolean;
    onConfirm: () => void;
    onCancel: () => void;
}

export function ConfirmDialog({
    isOpen,
    title,
    message,
    confirmLabel = "Confirm",
    cancelLabel = "Cancel",
    loadingLabel,
    variant = "danger",
    isLoading = false,
    onConfirm,
    onCancel,
}: ConfirmDialogProps) {
    const t = useTranslations("ConfirmDialog");

    if (!isOpen) return null;

    const confirmButtonClass =
        variant === "danger"
            ? "bg-red-600 hover:bg-red-700"
            : "bg-yellow-600 hover:bg-yellow-700";

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <div className="bg-[#161b22] rounded-xl border border-[#30363d] w-full max-w-md p-6">
                <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
                <p className="text-gray-400 mb-6">{message}</p>

                <div className="flex gap-3">
                    <button
                        type="button"
                        onClick={onCancel}
                        disabled={isLoading}
                        className="flex-1 py-3 bg-[#21262d] text-gray-300 rounded-lg 
                                   hover:bg-[#30363d] transition font-medium disabled:opacity-50"
                    >
                        {cancelLabel}
                    </button>
                    <button
                        type="button"
                        onClick={onConfirm}
                        disabled={isLoading}
                        className={`flex-1 py-3 text-white rounded-lg transition font-medium 
                                    disabled:opacity-50 flex items-center justify-center gap-2 ${confirmButtonClass}`}
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                {loadingLabel || t("loading")}
                            </>
                        ) : (
                            confirmLabel
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
