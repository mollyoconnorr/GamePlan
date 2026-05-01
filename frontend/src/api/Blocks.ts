import {extractErrorMessage} from "./Admin.ts";
import {apiFetch} from "./apiFetch.ts";
import type {RawScheduleBlock} from "../types.ts";

/**
 * Payload sent to create an admin schedule block.
 */
interface CreateScheduleBlockRequest {
    start: string;
    end: string;
    reason?: string;
    blockType?: "BLOCK" | "OPEN";
}

/**
 * Payload sent to edit an existing admin schedule block.
 */
type UpdateScheduleBlockRequest = CreateScheduleBlockRequest;

/**
 * Fetches active schedule blocks for the requested calendar range.
 */
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
    const res = await apiFetch(url, {
        method: "GET",
    });

    if (!res.ok) {
        const message = await extractErrorMessage(res, "Failed to fetch schedule blocks");
        throw new Error(message);
    }

    return await res.json() as Promise<RawScheduleBlock[]>;
}

/**
 * Creates schedule block and applies the resulting state.
 */
export async function createScheduleBlock(request: CreateScheduleBlockRequest) {
    // Creates a block and returns metadata (including canceled reservation count).
    const res = await apiFetch("/api/blocks", {
        method: "POST",
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

/**
 * Saves updated schedule block data and applies the resulting state.
 */
export async function updateScheduleBlock(id: number, request: UpdateScheduleBlockRequest) {
    const res = await apiFetch(`/api/blocks/${id}`, {
        method: "PUT",
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

/**
 * Sends the delete request for schedule block after confirmation.
 */
export async function deleteScheduleBlock(id: number) {
    // Soft-deletes a persisted block.
    const res = await apiFetch(`/api/blocks/${id}`, {
        method: "DELETE",
    });

    if (!res.ok) {
        const message = await extractErrorMessage(res, "Failed to delete schedule block");
        throw new Error(message);
    }
}
