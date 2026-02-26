import type {useNavigate} from "react-router-dom";

export function safeBack(navigate: ReturnType<typeof useNavigate>) {
    if (window.history.length > 1) {
        navigate(-1);
    } else {
        navigate("/");
    }
}