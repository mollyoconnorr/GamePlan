import type {AdminUser} from "../types.ts";
import {apiFetch} from "./apiFetch.ts";

/**
 * Extracts the backend validation message from an error response when admin requests fail.
 */
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

/**
 * Fetches the admin user list used by the user management table.
 */
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

/**
 * Saves updated user role data and applies the resulting state.
 */
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

/**
 * Promotes a user to trainer by reusing the shared role update endpoint.
 */
export async function promoteUserToTrainer(userId: number) {
    return updateUserRole(userId, "AT");
}

/**
 * Demotes a user to athlete by reusing the shared role update endpoint.
 */
export async function demoteUserToAthlete(userId: number) {
    return updateUserRole(userId, "ATHLETE");
}

/**
 * Payload used when an admin pre-creates an athlete account for later OIDC linking.
 */
interface CreateAdminUserRequest {
    email: string;
    firstName: string;
    lastName: string;
    oidcUserId?: string;
}

/**
 * Creates admin user and applies the resulting state.
 */
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

/**
 * Fetches the count of users still waiting for admin approval.
 */
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
