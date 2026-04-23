import type {AdminUser} from "../types.ts";
import {apiFetch} from "./apiFetch.ts";

export async function extractErrorMessage(response: Response, fallback: string) {
    const body = await response.text();
    if (!body) {
        return fallback;
    }

    try {
        const data = JSON.parse(body);
        if (data?.message) {
            return data.message;
        }
    } catch {
        // Ignore non-JSON payloads.
    }

    return body.trim();
}

export async function fetchAdminUsers() {
    const res = await apiFetch("/api/admin/users", {
        method: "GET",
    });

    if (!res.ok) {
        const message = await extractErrorMessage(res, "Failed to fetch users");
        throw new Error(message);
    }

    return await res.json() as Promise<AdminUser[]>;
}

export async function updateUserRole(userId: number, role: string) {
    const res = await apiFetch(`/api/admin/users/${userId}/role`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ role }),
    });

    if (!res.ok) {
        const message = await extractErrorMessage(res, "Failed to update user role");
        throw new Error(message);
    }

    return await res.json() as Promise<AdminUser>;
}

export async function promoteUserToTrainer(userId: number) {
    return updateUserRole(userId, "AT");
}

export async function demoteUserToAthlete(userId: number) {
    return updateUserRole(userId, "ATHLETE");
}

interface CreateAdminUserRequest {
    email: string;
    firstName: string;
    lastName: string;
    oidcUserId?: string;
}

export async function createAdminUser(request: CreateAdminUserRequest) {
    const res = await apiFetch(`/api/admin/users`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(request),
    });

    if (!res.ok) {
        const message = await extractErrorMessage(res, "Failed to create user");
        throw new Error(message);
    }

    return await res.json() as Promise<AdminUser>;
}

export async function fetchPendingUserCount(): Promise<number> {
    const res = await apiFetch("/api/admin/users/pending-count", {
        method: "GET",
    });

    if (!res.ok) {
        const message = await extractErrorMessage(res, "Failed to fetch pending count");
        throw new Error(message);
    }

    const payload = await res.json() as { pending: number };
    return payload.pending;
}
