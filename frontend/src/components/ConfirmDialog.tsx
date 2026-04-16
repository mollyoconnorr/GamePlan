import {useEffect} from "react";
import {createPortal} from "react-dom";
import Button from "./Button.tsx";

type ConfirmDialogProps = {
    open: boolean;
    title: string;
    description?: string;
    message?: string;
    confirmLabel?: string;
    confirmText?: string;
    cancelLabel?: string;
    cancelText?: string;
    tone?: "primary" | "danger";
    loading?: boolean;
    onConfirm: () => void | Promise<void>;
    onCancel: () => void;
};

export default function ConfirmDialog({
    open,
    title,
    description,
    message,
    confirmLabel,
    confirmText,
    cancelLabel,
    cancelText,
    tone = "primary",
    loading = false,
    onConfirm,
    onCancel,
}: ConfirmDialogProps) {
    useEffect(() => {
        if (!open || typeof document === "undefined") {
            return;
        }

        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";

        return () => {
            document.body.style.overflow = previousOverflow;
        };
    }, [open]);

    if (!open || typeof document === "undefined") {
        return null;
    }

    const body = description ?? message ?? "";
    const primaryLabel = confirmLabel ?? confirmText ?? "Confirm";
    const secondaryLabel = cancelLabel ?? cancelText ?? "Cancel";
    const confirmClassName = tone === "danger"
        ? "bg-red-600 text-white hover:bg-red-700 border-red-700"
        : "bg-primary text-white hover:bg-primary-hover border-primary";

    return createPortal(
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/40 px-4">
            <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
                <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
                <p className="mt-2 text-sm text-gray-600">{body}</p>

                <div className="mt-6 flex flex-wrap justify-end gap-2">
                    <Button
                        text={secondaryLabel}
                        className="bg-white text-gray-700 hover:bg-gray-50 border border-gray-300"
                        onClick={onCancel}
                        disabled={loading}
                    />
                    <Button
                        text={loading ? `${primaryLabel}…` : primaryLabel}
                        className={confirmClassName}
                        onClick={onConfirm}
                        disabled={loading}
                    />
                </div>
            </div>
        </div>,
        document.body
    );
}
