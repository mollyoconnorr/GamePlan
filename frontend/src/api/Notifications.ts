import type {Notification} from "../types.ts";
import {apiFetch} from "./apiFetch.ts";

export async function getNotifications(): Promise<Notification[]> {
    const response = await apiFetch("/api/notifications", {
        method: "GET",
    });

    if (!response.ok) {
        throw new Error("Failed to fetch notifications");
    }

    return response.json();
}

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

export async function markNotificationAsRead(id: number): Promise<void> {
    const response = await apiFetch(`/api/notifications/${id}/read`, {
        method: "PATCH",
    });

    if (!response.ok) {
        throw new Error("Failed to mark notification as read");
    }
}
