import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import dayjs from "dayjs";
import type { ComponentProps } from "react";
import type { CalendarEvent } from "../../../../src/types.ts";
import { describe, expect, it, vi } from "vitest";
import CalendarCard from "../../../../src/components/calendar/CalendarCard.tsx";

function buildEvent(overrides: Partial<CalendarEvent> = {}): CalendarEvent {
    const start = dayjs().add(3, "day").hour(9).minute(0).second(0).millisecond(0);
    const end = start.add(1, "hour");

    return {
        id: 42,
        name: "Power Rack",
        date: start.format("ddd M/D"),
        startTime: start.format("h:mm A"),
        endTime: end.format("h:mm A"),
        startIso: start.toISOString(),
        endIso: end.toISOString(),
        description: "Alex Athlete",
        ...overrides,
    };
}

function buildProps(overrides: Partial<ComponentProps<typeof CalendarCard>> = {}) {
    const event = overrides.event ?? buildEvent();
    const eventDay = overrides.eventDay
        ?? (event.startIso ? dayjs(event.startIso).startOf("day") : dayjs().add(3, "day").startOf("day"));

    return {
        event,
        eventDay,
        startTime: eventDay.hour(8).minute(0).second(0).millisecond(0),
        endTime: eventDay.hour(12).minute(0).second(0).millisecond(0),
        timeStepMin: 30,
        startIndex: 2,
        endIndex: 4,
        groupStartIndex: 2,
        cellHeight: 40,
        cardMargin: 2,
        onEditReservation: vi.fn().mockResolvedValue(undefined),
        onDeleteReservation: vi.fn().mockResolvedValue(undefined),
        onShowToast: vi.fn(),
        variant: "user" as const,
        ...overrides,
    };
}

describe("CalendarCard", () => {
    it("opens details and deletes a reservation in user mode", async () => {
        const props = buildProps();

        render(<CalendarCard {...props} />);

        fireEvent.click(screen.getByRole("button", { name: "Power Rack" }));
        expect(screen.getByText(/Reserved by:/)).toBeInTheDocument();

        fireEvent.click(screen.getByTitle("Delete Reservation"));
        fireEvent.click(await screen.findByRole("button", { name: "Delete" }));

        await waitFor(() => {
            expect(props.onDeleteReservation).toHaveBeenCalledWith(42);
        });
        expect(props.onShowToast).toHaveBeenCalledWith("Deleted reservation for Power Rack.");
    });

    it("shows delete failure toast when trainer cancellation has no handler", async () => {
        const onShowToast = vi.fn();

        render(
            <CalendarCard
                {...buildProps({ variant: "trainer", onDeleteReservation: undefined, onShowToast })}
            />,
        );

        fireEvent.click(screen.getByRole("button", { name: "Power Rack" }));
        fireEvent.click(screen.getByRole("button", { name: "Cancel reservation" }));
        fireEvent.click(await screen.findByRole("button", { name: "Delete" }));

        await waitFor(() => {
            expect(onShowToast).toHaveBeenCalledWith("Failed to delete reservation for Power Rack.");
        });
    });

    it("disables edit controls for past reservations", () => {
        render(
            <CalendarCard
                {...buildProps({
                    event: buildEvent({
                        startIso: dayjs().subtract(1, "day").hour(9).minute(0).second(0).millisecond(0).toISOString(),
                        endIso: dayjs().subtract(1, "day").hour(10).minute(0).second(0).millisecond(0).toISOString(),
                    }),
                    eventDay: dayjs().subtract(1, "day").startOf("day"),
                })}
            />,
        );

        fireEvent.click(screen.getByRole("button", { name: "Power Rack" }));

        const editButton = screen.getByTitle("Past reservations cannot be edited");
        expect(editButton).toBeDisabled();
    });

    it("edits a reservation and submits updated times", async () => {
        const onEditReservation = vi.fn().mockResolvedValue(undefined);
        const onShowToast = vi.fn();

        render(
            <CalendarCard
                {...buildProps({ onEditReservation, onShowToast })}
            />,
        );

        fireEvent.click(screen.getByRole("button", { name: "Power Rack" }));
        fireEvent.click(screen.getByTitle("Edit Reservation"));
        fireEvent.click(await screen.findByRole("button", { name: "Save" }));

        await waitFor(() => {
            expect(onEditReservation).toHaveBeenCalledTimes(1);
        });

        const [id, start, end] = onEditReservation.mock.calls[0];
        expect(id).toBe(42);
        expect(dayjs.isDayjs(start)).toBe(true);
        expect(dayjs.isDayjs(end)).toBe(true);
        expect(start.format("HH:mm")).toBe("09:00");
        expect(end.format("HH:mm")).toBe("10:00");
        expect(onShowToast).toHaveBeenCalledWith("Updated reservation time for Power Rack.");
    });

    it("maps edit errors to user-friendly messages", async () => {
        const onShowToast = vi.fn();
        const onEditReservation = vi
            .fn()
            .mockRejectedValue(new Error("weekend reservations are disabled"));
        const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);

        render(
            <CalendarCard
                {...buildProps({ onEditReservation, onShowToast })}
            />,
        );

        fireEvent.click(screen.getByRole("button", { name: "Power Rack" }));
        fireEvent.click(screen.getByTitle("Edit Reservation"));
        fireEvent.click(await screen.findByRole("button", { name: "Save" }));

        await waitFor(() => {
            expect(onShowToast).toHaveBeenCalledWith("Weekend reservations are disabled. Choose a weekday.");
        });
        expect(consoleErrorSpy).toHaveBeenCalled();
    });

    it("hides action controls for equipment calendar variant", () => {
        render(<CalendarCard {...buildProps({ variant: "equip" })} />);

        fireEvent.click(screen.getByRole("button", { name: "Power Rack" }));

        expect(screen.queryByTitle("Edit Reservation")).not.toBeInTheDocument();
        expect(screen.queryByTitle("Delete Reservation")).not.toBeInTheDocument();
    });

    it("shows note and pending indicator for availability previews", () => {
        render(
            <CalendarCard
                {...buildProps({
                    variant: "trainer",
                    event: buildEvent({
                        isAvailability: true,
                        temp: true,
                        description: "Open gym slot",
                    }),
                })}
            />,
        );

        fireEvent.click(screen.getByRole("button", { name: "Power Rack" }));

        expect(screen.getByText(/Note:/)).toBeInTheDocument();
        expect(screen.getByText("Pending reservation")).toBeInTheDocument();
        expect(screen.queryByRole("button", { name: "Cancel reservation" })).not.toBeInTheDocument();
    });
});
