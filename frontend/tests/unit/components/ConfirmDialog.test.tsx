import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ConfirmDialog from "../../../src/components/ConfirmDialog.tsx";

describe("ConfirmDialog", () => {
    it("does not render when open is false", () => {
        // Closed state should not mount portal content
        render(
            <ConfirmDialog
                open={false}
                title="Delete reservation?"
                message="Are you sure?"
                onConfirm={() => undefined}
                onCancel={() => undefined}
            />,
        );

        expect(screen.queryByText("Delete reservation?")).not.toBeInTheDocument();
    });

    it("renders title, message, and default button labels when open", () => {
        // Open state should show default action labels
        render(
            <ConfirmDialog
                open
                title="Delete reservation?"
                message="Are you sure?"
                onConfirm={() => undefined}
                onCancel={() => undefined}
            />,
        );

        expect(screen.getByText("Delete reservation?")).toBeInTheDocument();
        expect(screen.getByText("Are you sure?")).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Confirm" })).toBeInTheDocument();
    });

    it("calls callbacks on cancel and confirm", () => {
        // Button clicks should map to provided callbacks
        const onCancel = vi.fn();
        const onConfirm = vi.fn();

        render(
            <ConfirmDialog
                open
                title="Delete reservation?"
                message="Are you sure?"
                onConfirm={onConfirm}
                onCancel={onCancel}
            />,
        );

        fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
        fireEvent.click(screen.getByRole("button", { name: "Confirm" }));

        expect(onCancel).toHaveBeenCalledTimes(1);
        expect(onConfirm).toHaveBeenCalledTimes(1);
    });

    it("disables buttons and shows working text while loading", () => {
        // Loading prevents duplicate actions
        const onCancel = vi.fn();
        const onConfirm = vi.fn();

        render(
            <ConfirmDialog
                open
                title="Delete reservation?"
                message="Are you sure?"
                loading
                onConfirm={onConfirm}
                onCancel={onCancel}
            />,
        );

        expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();
        expect(screen.getByRole("button", { name: "Working..." })).toBeDisabled();
    });
});
