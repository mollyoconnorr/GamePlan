import { createPortal } from "react-dom";

/**
 * Defines the props required by the Toast component.
 */
type ToastProps = {
    message: string;
};

/**
 * Renders the Toast view.
 */
export default function Toast({ message }: ToastProps) {
    if (!message || typeof document === "undefined") return null;

    return createPortal(
        <div className="fixed top-4 right-4 z-[400] rounded-md border border-green-300 bg-green-100 px-4 py-3 shadow-md">
            <p className="text-sm font-medium text-green-800">{message}</p>
        </div>,
        document.body
    );
}
