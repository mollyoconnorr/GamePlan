import { act, fireEvent, render, screen } from "@testing-library/react";
import dayjs from "dayjs";
import type { ComponentProps } from "react";
import type { CalendarEvent } from "../../../../src/types.ts";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import CalendarContent from "../../../../src/components/calendar/CalendarContent.tsx";

vi.mock("../../../../src/components/calendar/CalendarCard.tsx", () => ({
    default: (props: {
        event: CalendarEvent;
        onShowToast?: (message: string) => void;
        variant: "user" | "equip" | "trainer";
    }) => (
        <button
            type="button"
            data-testid={`calendar-card-${props.event.id}`}
            data-variant={props.variant}
            onClick={() => props.onShowToast?.(`Toast for ${props.event.name}`)}
        >
            {props.event.name}
        </button>
    ),
}));

function buildEvent(overrides: Partial<CalendarEvent> = {}): CalendarEvent {
    return {
        id: 1,
        name: "Event A",
        date: "Mon 4/13",
        startTime: "8:00 AM",
        endTime: "9:00 AM",
        ...overrides,
    };
}

function buildProps(overrides: Partial<ComponentProps<typeof CalendarContent>> = {}) {
    return {
        firstDate: dayjs("2026-04-13"),
        startTime: dayjs("2026-04-13T08:00:00"),
        endTime: dayjs("2026-04-13T09:30:00"),
        timeStepMin: 30,
        top: 40,
        left: 90,
        height: 120,
        width: 300,
        numRows: 3,
        cellHeight: 20,
        numDays: 2,
        dayMap: new Map([
            ["Mon 4/13", 0],
            ["Tue 4/14", 1],
        ]),
        timeMap: new Map([
            ["8:00 AM", 0],
            ["8:30 AM", 1],
            ["9:00 AM", 2],
            ["9:30 AM", 3],
        ]),
        events: [buildEvent()],
        variant: "trainer" as const,
        ...overrides,
    };
}

describe("CalendarContent", () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it("renders only overlay events that map to valid day/time slots", () => {
        const events: CalendarEvent[] = [
            buildEvent({ id: 1, name: "Mon overlap 1", startTime: "8:00 AM", endTime: "9:00 AM" }),
            buildEvent({ id: 2, name: "Mon overlap 2", startTime: "8:30 AM", endTime: "9:30 AM" }),
            buildEvent({ id: 3, name: "Tue event", date: "Tue 4/14", startTime: "8:00 AM", endTime: "8:30 AM" }),
            buildEvent({ id: 4, name: "Block", isBlock: true }),
            buildEvent({ id: 5, name: "Availability", isAvailability: true }),
            buildEvent({ id: 6, name: "Missing day", date: "Wed 4/15" }),
            buildEvent({ id: 7, name: "Missing time", date: "Tue 4/14", startTime: "7:00 AM", endTime: "7:30 AM" }),
        ];

        const { container } = render(
            <CalendarContent
                {...buildProps({ events })}
            />,
        );

        expect(screen.getByTestId("calendar-card-1")).toHaveTextContent("Mon overlap 1");
        expect(screen.getByTestId("calendar-card-2")).toHaveTextContent("Mon overlap 2");
        expect(screen.getByTestId("calendar-card-3")).toHaveTextContent("Tue event");

        expect(screen.queryByText("Block")).not.toBeInTheDocument();
        expect(screen.queryByText("Availability")).not.toBeInTheDocument();
        expect(screen.queryByText("Missing day")).not.toBeInTheDocument();
        expect(screen.queryByText("Missing time")).not.toBeInTheDocument();

        const groups = Array.from(container.querySelectorAll(".absolute.flex.flex-row.justify-between.space-x-1.mx-1"));
        expect(groups).toHaveLength(2);
        expect(groups[0].style.top).toBe("0px");
        expect(groups[0].style.height).toBe("60px");

        expect(screen.getByTestId("calendar-card-1")).toHaveAttribute("data-variant", "trainer");
    });

    it("shows and auto-clears toast messages from card callbacks", async () => {
        render(<CalendarContent {...buildProps()} />);

        fireEvent.click(screen.getByTestId("calendar-card-1"));
        expect(screen.getByText("Toast for Event A")).toBeInTheDocument();

        await act(async () => {
            vi.advanceTimersByTime(2500);
        });

        expect(screen.queryByText("Toast for Event A")).not.toBeInTheDocument();
    });
});
