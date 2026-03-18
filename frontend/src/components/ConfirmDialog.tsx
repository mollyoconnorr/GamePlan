import { createPortal } from "react-dom";

type ConfirmDialogProps = {
    open: boolean;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    loading?: boolean;
    onConfirm: () => void;
    onCancel: () => void;
};

export default function ConfirmDialog({
                                          open,
                                          title,
                                          message,
                                          confirmText = "Confirm",
                                          cancelText = "Cancel",
                                          loading = false,
                                          onConfirm,
                                      onCancel,
                                      }: ConfirmDialogProps) {
    if (!open || typeof document === "undefined") return null;

    return createPortal(
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/40 px-4">
            <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
                <h2 className="text-xl font-semibold">{title}</h2>

                <p className="mt-3 text-sm text-gray-700">{message}</p>

                <div className="mt-6 flex justify-end gap-3">
                    <button
                        className="rounded-md border px-4 py-2 hover:cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                        onClick={onCancel}
                        disabled={loading}
                    >
                        {cancelText}
                    </button>

                    <button
                        className="rounded-md bg-red-600 px-4 py-2 text-white hover:cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                        onClick={onConfirm}
                        disabled={loading}
                    >
                        {loading ? "Working..." : confirmText}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}
