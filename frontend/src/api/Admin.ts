import type {AdminUser} from "../types.ts";

async function extractErrorMessage(response: Response, fallback: string) {
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
    const res = await fetch("/api/admin/users", {
        method: "GET",
        credentials: "include",
    });

    if (!res.ok) {
        const message = await extractErrorMessage(res, "Failed to fetch users");
        throw new Error(message);
    }

    return res.json() as Promise<AdminUser[]>;
}

export async function updateUserRole(userId: number, role: string) {
    const res = await fetch(`/api/admin/users/${userId}/role`, {
        method: "POST",
        credentials: "include",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ role }),
    });

    if (!res.ok) {
        const message = await extractErrorMessage(res, "Failed to update user role");
        throw new Error(message);
    }

    return res.json() as Promise<AdminUser>;
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
    const res = await fetch(`/api/admin/users`, {
        method: "POST",
        credentials: "include",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(request),
    });

    if (!res.ok) {
        const message = await extractErrorMessage(res, "Failed to create user");
        throw new Error(message);
    }

    return res.json() as Promise<AdminUser>;
}
