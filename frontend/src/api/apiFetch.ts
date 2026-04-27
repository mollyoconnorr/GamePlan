function getCookie(name: string): string | undefined {
    if (typeof document === "undefined" || !document.cookie) {
        return undefined;
    }

    const cookies = document.cookie.split(";");
    for (const cookie of cookies) {
        const [cookieName, ...cookieValueParts] = cookie.trim().split("=");
        if (cookieName !== name) {
            continue;
        }

        return decodeURIComponent(cookieValueParts.join("="));
    }

    return undefined;
}

function toHeaderObject(headers?: HeadersInit): Record<string, string> {
    if (!headers) {
        return {};
    }

    if (headers instanceof Headers) {
        const normalized: Record<string, string> = {};
        headers.forEach((value, key) => {
            normalized[key] = value;
        });
        return normalized;
    }

    if (Array.isArray(headers)) {
        return Object.fromEntries(headers);
    }

    return { ...headers };
}

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS", "TRACE"]);
export const SESSION_INVALIDATED_EVENT = "gameplan:session-invalidated";
const ROLE_CHANGED_MESSAGE = "Your role changed. Please sign in again.";

async function ensureXsrfToken(): Promise<string | undefined> {
    await fetch("/api/csrf", {
        method: "GET",
        credentials: "include",
    });

    return getCookie("XSRF-TOKEN");
}

/**
 * Wrapper around fetch that always sends session credentials and XSRF token when present.
 */
export async function apiFetch(input: RequestInfo | URL, init: RequestInit = {}) {
    const method = (init.method ?? "GET").toUpperCase();
    const isUnsafeMethod = !SAFE_METHODS.has(method);
    const headers = toHeaderObject(init.headers);

    let xsrfToken = getCookie("XSRF-TOKEN");
    if (isUnsafeMethod && !xsrfToken) {
        xsrfToken = await ensureXsrfToken();
    }

    if (isUnsafeMethod && xsrfToken) {
        headers["X-XSRF-TOKEN"] = xsrfToken;
    }

    const requestInit: RequestInit = {
        ...init,
        credentials: "include",
    };

    if (Object.keys(headers).length > 0) {
        requestInit.headers = headers;
    }

    const response = await fetch(input, requestInit);
    void notifyIfSessionInvalidated(response);
    return response;
}

async function notifyIfSessionInvalidated(response: Response) {
    if (response.status !== 401 || typeof window === "undefined") {
        return;
    }

    const message = await extractResponseMessage(response);
    if (message !== ROLE_CHANGED_MESSAGE) {
        return;
    }

    window.dispatchEvent(new CustomEvent(SESSION_INVALIDATED_EVENT, {
        detail: { message },
    }));
}

async function extractResponseMessage(response: Response): Promise<string> {
    try {
        const body = await response.clone().json() as { message?: string };
        return body.message ?? "";
    } catch {
        return "";
    }
}
