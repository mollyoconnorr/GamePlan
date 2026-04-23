import { beforeEach, describe, expect, it, vi } from "vitest";
import {
    createAdminUser,
    demoteUserToAthlete,
    extractErrorMessage,
    fetchAdminUsers,
    fetchPendingUserCount,
    promoteUserToTrainer,
    updateUserRole,
} from "../../../src/api/Admin.ts";

function response(ok: boolean, data?: unknown, textBody = ""): Response {
    return {
        ok,
        json: vi.fn().mockResolvedValue(data),
        text: vi.fn().mockResolvedValue(textBody),
    } as unknown as Response;
}

describe("Admin API", () => {
    beforeEach(() => {
        vi.unstubAllGlobals();
    });

    it("extractErrorMessage prefers json message, then text, then fallback", async () => {
        await expect(extractErrorMessage(response(false, undefined, "{\"message\":\"bad role\"}"), "fallback"))
            .resolves.toBe("bad role");
        await expect(extractErrorMessage(response(false, undefined, " plain error "), "fallback"))
            .resolves.toBe("plain error");
        await expect(extractErrorMessage(response(false, undefined, ""), "fallback"))
            .resolves.toBe("fallback");
    });

    it("fetches admin users", async () => {
        const users = [{ id: 1, email: "user@example.com" }];
        const fetchMock = vi.fn().mockResolvedValue(response(true, users));
        vi.stubGlobal("fetch", fetchMock);

        await expect(fetchAdminUsers()).resolves.toEqual(users);
        expect(fetchMock).toHaveBeenCalledWith("/api/admin/users", {
            method: "GET",
            credentials: "include",
        });
    });

    it("updates user role and supports helper wrappers", async () => {
        const updated = { id: 2, role: "AT" };
        const fetchMock = vi.fn().mockResolvedValue(response(true, updated));
        vi.stubGlobal("fetch", fetchMock);

        await expect(updateUserRole(2, "AT")).resolves.toEqual(updated);
        await promoteUserToTrainer(2);
        await demoteUserToAthlete(2);

        expect(fetchMock).toHaveBeenNthCalledWith(2, "/api/admin/users/2/role", {
            method: "POST",
            credentials: "include",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ role: "AT" }),
        });
        expect(fetchMock).toHaveBeenNthCalledWith(4, "/api/admin/users/2/role", {
            method: "POST",
            credentials: "include",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ role: "AT" }),
        });
        expect(fetchMock).toHaveBeenNthCalledWith(6, "/api/admin/users/2/role", {
            method: "POST",
            credentials: "include",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ role: "ATHLETE" }),
        });
    });

    it("creates admin users and fetches pending count", async () => {
        const fetchMock = vi
            .fn()
            .mockResolvedValueOnce(response(true))
            .mockResolvedValueOnce(response(true, { id: 3, email: "new@example.com" }))
            .mockResolvedValueOnce(response(true, { pending: 5 }));
        vi.stubGlobal("fetch", fetchMock);

        await expect(
            createAdminUser({
                email: "new@example.com",
                firstName: "New",
                lastName: "User",
            }),
        ).resolves.toEqual({ id: 3, email: "new@example.com" });
        await expect(fetchPendingUserCount()).resolves.toBe(5);
    });

    it("throws backend-provided error messages on failure", async () => {
        const fetchMock = vi.fn().mockResolvedValue(response(false, undefined, "{\"message\":\"Nope\"}"));
        vi.stubGlobal("fetch", fetchMock);

        await expect(fetchAdminUsers()).rejects.toThrow("Nope");
    });
});
