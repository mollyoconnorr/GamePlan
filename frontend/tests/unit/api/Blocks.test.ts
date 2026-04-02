import { beforeEach, describe, expect, it, vi } from "vitest";
import {
    createScheduleBlock,
    deleteScheduleBlock,
    getScheduleBlocks,
} from "../../../src/api/Blocks.ts";

function response<T>(ok: boolean, data?: T): Response {
    return {
        ok,
        json: vi.fn().mockResolvedValue(data),
        text: vi.fn().mockResolvedValue(ok ? "" : "Request failed"),
    } as unknown as Response;
}

describe("Blocks API", () => {
    beforeEach(() => {
        vi.unstubAllGlobals();
    });

    it("fetches schedule blocks", async () => {
        const data = [{ id: 1, start: "2026-04-03T08:00:00", end: "2026-04-03T09:00:00" }];
        const fetchMock = vi.fn().mockResolvedValue(response(true, data));
        vi.stubGlobal("fetch", fetchMock);

        await expect(getScheduleBlocks()).resolves.toEqual(data);
        expect(fetchMock).toHaveBeenCalledWith("/api/blocks", {
            method: "GET",
            credentials: "include",
        });
    });

    it("creates a schedule block", async () => {
        const payload = { id: 2 };
        const request = {
            start: "2026-04-03T14:00:00.000Z",
            end: "2026-04-03T15:00:00.000Z",
        };
        const fetchMock = vi.fn().mockResolvedValue(response(true, payload));
        vi.stubGlobal("fetch", fetchMock);

        await expect(createScheduleBlock(request)).resolves.toEqual(payload);
        expect(fetchMock).toHaveBeenCalledWith("/api/blocks", {
            method: "POST",
            credentials: "include",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(request),
        });
    });

    it("deletes a schedule block", async () => {
        const fetchMock = vi.fn().mockResolvedValue(response(true));
        vi.stubGlobal("fetch", fetchMock);

        await deleteScheduleBlock(12);
        expect(fetchMock).toHaveBeenCalledWith("/api/blocks/12", {
            method: "DELETE",
            credentials: "include",
        });
    });
});
