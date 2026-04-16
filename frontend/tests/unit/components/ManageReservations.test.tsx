import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import dayjs from "dayjs";
import type { ComponentProps } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ManageReservations from "../../../src/components/ManageReservations.tsx";
import type { Reservation } from "../../../src/types.ts";

function buildReservation(overrides: Partial<Reservation> = {}): Reservation {
    const start = dayjs().add(1, "day").hour(9).minute(0).second(0).millisecond(0);
    const end = start.add(1, "hour");

    return {
        id: 1,
        name: "Power Rack",
        start,
        end,
        color: "#ffffff",
        ...overrides,
    };
}

function renderManageReservations(overrides: Partial<ComponentProps<typeof ManageReservations>> = {}) {
    const reservation = buildReservation();

    const props: ComponentProps<typeof ManageReservations> = {
        reservations: [reservation],
        loading: false,
        startTime: dayjs().startOf("day").hour(8),
        endTime: dayjs().startOf("day").hour(17),
        timeStepMin: 30,
        onEditReservation: vi.fn().mockResolvedValue(undefined),
        onDeleteReservation: vi.fn().mockResolvedValue(undefined),
        isPrivileged: false,
        ...overrides,
    };

    return { ...render(<ManageReservations {...props} />), props, reservation };
}

describe("ManageReservations", () => {
    beforeEach(() => {
        vi.restoreAllMocks();
    });

    it("deletes a reservation through confirmation dialog", async () => {
        const { props, reservation } = renderManageReservations();

        fireEvent.click(screen.getByTitle("Delete Reservation"));
        fireEvent.click(await screen.findByRole("button", { name: "Delete" }));

        await waitFor(() => {
            expect(props.onDeleteReservation).toHaveBeenCalledWith(reservation.id);
        });
        expect(screen.getByText(`Deleted reservation for ${reservation.name}.`)).toBeInTheDocument();
    });

    it("edits a reservation and submits updated times", async () => {
        const { props, reservation } = renderManageReservations();

        fireEvent.click(screen.getByTitle("Edit Reservation"));
        fireEvent.click(await screen.findByRole("button", { name: "Save" }));

        await waitFor(() => {
            expect(props.onEditReservation).toHaveBeenCalledTimes(1);
        });

        const [id, start, end] = (props.onEditReservation as ReturnType<typeof vi.fn>).mock.calls[0];
        expect(id).toBe(reservation.id);
        expect(dayjs.isDayjs(start)).toBe(true);
        expect(dayjs.isDayjs(end)).toBe(true);
        expect(start.format("HH:mm")).toBe("09:00");
        expect(end.format("HH:mm")).toBe("10:00");
        expect(screen.getByText(`Updated reservation time for ${reservation.name}.`)).toBeInTheDocument();
    });

    it("shows friendly error message when edit fails", async () => {
        const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
        const onEditReservation = vi
            .fn()
            .mockRejectedValue(new Error("weekend reservations are disabled"));

        renderManageReservations({ onEditReservation });

        fireEvent.click(screen.getByTitle("Edit Reservation"));
        fireEvent.click(await screen.findByRole("button", { name: "Save" }));

        await waitFor(() => {
            expect(screen.getByText("Weekend reservations are disabled. Choose a weekday.")).toBeInTheDocument();
        });
        expect(consoleErrorSpy).toHaveBeenCalled();
    });

    it("hides edit and delete controls in read-only mode", () => {
        renderManageReservations({
            readOnly: true,
            onEditReservation: undefined,
            onDeleteReservation: undefined,
        });

        expect(screen.queryByTitle("Edit Reservation")).not.toBeInTheDocument();
        expect(screen.queryByTitle("Delete Reservation")).not.toBeInTheDocument();
    });
});
