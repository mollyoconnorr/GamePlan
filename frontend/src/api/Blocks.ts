import {extractErrorMessage} from "./Admin.ts";
import type {RawScheduleBlock} from "../types.ts";

interface CreateScheduleBlockRequest {
    start: string;
    end: string;
    reason?: string;
    blockType?: "BLOCK" | "OPEN";
}

interface UpdateScheduleBlockRequest extends CreateScheduleBlockRequest {
}

export async function getScheduleBlocks(from?: string, to?: string) {
    // Trainer/admin-only endpoint that returns persisted global blocks.
    const query = new URLSearchParams();
    if (from) {
        query.set("from", from);
    }
    if (to) {
        query.set("to", to);
    }

    const url = query.toString() ? `/api/blocks?${query.toString()}` : "/api/blocks";
    const res = await fetch(url, {
        method: "GET",
        credentials: "include",
    });

    if (!res.ok) {
        const message = await extractErrorMessage(res, "Failed to fetch schedule blocks");
        throw new Error(message);
    }

    return await res.json() as Promise<RawScheduleBlock[]>;
}

export async function createScheduleBlock(request: CreateScheduleBlockRequest) {
    // Creates a block and returns metadata (including canceled reservation count).
    const res = await fetch("/api/blocks", {
        method: "POST",
        credentials: "include",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(request),
    });

    if (!res.ok) {
        const message = await extractErrorMessage(res, "Failed to create schedule block");
        throw new Error(message);
    }

    return await res.json() as Promise<RawScheduleBlock>;
}

export async function updateScheduleBlock(id: number, request: UpdateScheduleBlockRequest) {
    const res = await fetch(`/api/blocks/${id}`, {
        method: "PUT",
        credentials: "include",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(request),
    });

    if (!res.ok) {
        const message = await extractErrorMessage(res, "Failed to update schedule block");
        throw new Error(message);
    }

    return await res.json() as Promise<RawScheduleBlock>;
}

export async function deleteScheduleBlock(id: number) {
    // Soft-deletes a persisted block.
    const res = await fetch(`/api/blocks/${id}`, {
        method: "DELETE",
        credentials: "include",
    });

    if (!res.ok) {
        const message = await extractErrorMessage(res, "Failed to delete schedule block");
        throw new Error(message);
    }
}
