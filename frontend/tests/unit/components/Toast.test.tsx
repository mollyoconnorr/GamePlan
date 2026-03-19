import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Toast from "../../../src/components/Toast.tsx";

describe("Toast", () => {
    it("does not render when message is empty", () => {
        // Empty message should keep portal hidden
        render(<Toast message="" />);
        expect(screen.queryByText("Reservation updated.")).not.toBeInTheDocument();
    });

    it("renders message when non-empty", () => {
        // Non empty message should appear in the portal
        render(<Toast message="Reservation updated." />);
        expect(screen.getByText("Reservation updated.")).toBeInTheDocument();
    });
});
