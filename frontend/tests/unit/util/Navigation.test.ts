import type { useNavigate } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { safeBack } from "../../../src/util/Navigation.ts";

describe("safeBack", () => {
    it("navigates back when there is browser history", () => {
        // Browser history available should use back navigation
        const navigate = vi.fn();
        const historyLengthSpy = vi.spyOn(window.history, "length", "get").mockReturnValue(2);

        safeBack(navigate as unknown as ReturnType<typeof useNavigate>);

        expect(navigate).toHaveBeenCalledWith(-1);
        historyLengthSpy.mockRestore();
    });

    it("navigates to root when there is no browser history", () => {
        // No history should route to the home path
        const navigate = vi.fn();
        const historyLengthSpy = vi.spyOn(window.history, "length", "get").mockReturnValue(1);

        safeBack(navigate as unknown as ReturnType<typeof useNavigate>);

        expect(navigate).toHaveBeenCalledWith("/");
        historyLengthSpy.mockRestore();
    });
});
