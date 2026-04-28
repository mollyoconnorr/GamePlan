import type {useNavigate} from "react-router-dom";

/**
 * Performs a safe back operation with a fallback when browser history is unavailable.
 */
export function safeBack(navigate: ReturnType<typeof useNavigate>) {
    if (window.history.length > 1) {
        navigate(-1);
    } else {
        navigate("/");
    }
}