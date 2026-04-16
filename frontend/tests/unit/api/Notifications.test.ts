import { beforeEach, describe, expect, it, vi } from "vitest";
import {
    getNotifications,
    getUnreadNotificationCount,
    markNotificationAsRead,
} from "../../../src/api/Notifications.ts";

function response(ok: boolean, data?: unknown): Response {
    return {
        ok,
        json: vi.fn().mockResolvedValue(data),
    } as unknown as Response;
}

describe("Notifications API", () => {
    beforeEach(() => {
        vi.unstubAllGlobals();
    });

    it("fetches notifications", async () => {
        const payload = [{ id: 1, message: "Cancelled" }];
        const fetchMock = vi.fn().mockResolvedValue(response(true, payload));
        vi.stubGlobal("fetch", fetchMock);

        await expect(getNotifications()).resolves.toEqual(payload);
        expect(fetchMock).toHaveBeenCalledWith("/api/notifications", {
            method: "GET",
            credentials: "include",
        });
    });

    it("fetches unread notification count", async () => {
        const fetchMock = vi.fn().mockResolvedValue(response(true, { unreadCount: 4 }));
        vi.stubGlobal("fetch", fetchMock);

        await expect(getUnreadNotificationCount()).resolves.toBe(4);
        expect(fetchMock).toHaveBeenCalledWith("/api/notifications/unread-count", {
            method: "GET",
            credentials: "include",
        });
    });

    it("marks notification as read", async () => {
        const fetchMock = vi.fn().mockResolvedValue(response(true));
        vi.stubGlobal("fetch", fetchMock);

        await markNotificationAsRead(9);
        expect(fetchMock).toHaveBeenCalledWith("/api/notifications/9/read", {
            method: "PATCH",
            credentials: "include",
        });
    });

    it("throws when notification endpoints fail", async () => {
        const fetchMock = vi.fn().mockResolvedValue(response(false));
        vi.stubGlobal("fetch", fetchMock);

        await expect(getNotifications()).rejects.toThrow("Failed to fetch notifications");
        await expect(getUnreadNotificationCount()).rejects.toThrow("Failed to fetch unread notification count");
        await expect(markNotificationAsRead(1)).rejects.toThrow("Failed to mark notification as read");
    });
});
