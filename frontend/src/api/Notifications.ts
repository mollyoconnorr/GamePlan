import type {Notification} from "../types.ts";
import {apiFetch} from "./apiFetch.ts";

/**
 * Fetches unread notifications for the signed-in user.
 */
export async function getNotifications(): Promise<Notification[]> {
    const response = await apiFetch("/api/notifications", {
        method: "GET",
    });

    if (!response.ok) {
        throw new Error("Failed to fetch notifications");
    }

    return response.json();
}

/**
 * Fetches the unread notification count shown in the home page summary.
 */
export async function getUnreadNotificationCount(): Promise<number> {
    const response = await apiFetch("/api/notifications/unread-count", {
        method: "GET",
    });

    if (!response.ok) {
        throw new Error("Failed to fetch unread notification count");
    }

    const payload = await response.json() as { unreadCount: number };
    return payload.unreadCount;
}

/**
 * Marks notification as read through the backend API and updates local state.
 */
export async function markNotificationAsRead(id: number): Promise<void> {
    const response = await apiFetch(`/api/notifications/${id}/read`, {
        method: "PATCH",
    });

    if (!response.ok) {
        throw new Error("Failed to mark notification as read");
    }
}
