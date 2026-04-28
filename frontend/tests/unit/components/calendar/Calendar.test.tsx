import { render, screen } from "@testing-library/react";
import dayjs from "dayjs";
import type { ComponentProps } from "react";
import type { CalendarEvent } from "../../../../src/types.ts";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Calendar from "../../../../src/components/calendar/Calendar.tsx";

vi.mock("../../../../src/components/calendar/CalendarContent.tsx", () => ({
    default: (props: { width: number; numDays: number; events: CalendarEvent[] }) => (
        <div
            data-testid="calendar-content"
            data-width={props.width}
            data-days={props.numDays}
            data-events={props.events.length}
        >
            calendar-content
        </div>
    ),
}));

vi.mock("../../../../src/components/Spinner.tsx", () => ({
    default: () => <div data-testid="calendar-spinner">loading</div>,
}));

function buildEvent(overrides: Partial<CalendarEvent> = {}): CalendarEvent {
    const start = dayjs("2026-04-13T08:00:00");
    const end = start.add(30, "minute");

    return {
        id: 100,
        name: "Blocked window",
        date: start.format("ddd M/D"),
        startTime: start.format("h:mm A"),
        endTime: end.format("h:mm A"),
        startIso: start.toISOString(),
        endIso: end.toISOString(),
        ...overrides,
    };
}

function buildProps(overrides: Partial<ComponentProps<typeof Calendar>> = {}) {
    return {
        firstDate: dayjs("2026-04-13"),
        numDays: 2,
        startTime: dayjs("2026-04-13T08:00:00"),
        endTime: dayjs("2026-04-13T09:00:00"),
        timeStepMin: 30,
        maxResTime: 120,
        variant: "equip" as const,
        reservations: [],
        loading: false,
        ...overrides,
    };
}

describe("Calendar", () => {
    beforeEach(() => {
        vi.stubGlobal(
            "ResizeObserver",
            class {
                private readonly callback: ResizeObserverCallback;

                constructor(callback: ResizeObserverCallback) {
                    this.callback = callback;
                }

                observe() {
                    this.callback(
                        [{ contentRect: { width: 450, height: 120 } } as ResizeObserverEntry],
                        this as unknown as ResizeObserver,
                    );
                }

                disconnect() {
                    return undefined;
                }

                unobserve() {
                    return undefined;
                }
            } as unknown as typeof ResizeObserver,
        );
    });

    it("shows the loading spinner and hides overlay content when loading", () => {
        render(<Calendar {...buildProps({ loading: true, reservations: [buildEvent()] })} />);

        expect(screen.getByTestId("calendar-spinner")).toBeInTheDocument();
        expect(screen.queryByTestId("calendar-content")).not.toBeInTheDocument();
    });

    it("renders day/time headers and passes measured width to CalendarContent", () => {
        render(<Calendar {...buildProps({ reservations: [buildEvent()] })} />);

        expect(screen.getByText("Mon 4/13")).toBeInTheDocument();
        expect(screen.getByText("Tue 4/14")).toBeInTheDocument();
        expect(screen.getByText("8:00 AM")).toBeInTheDocument();
        expect(screen.getByText("8:30 AM")).toBeInTheDocument();
        expect(screen.getByText("9:00 AM")).toBeInTheDocument();

        const content = screen.getByTestId("calendar-content");
        expect(content).toHaveAttribute("data-width", "360");
        expect(content).toHaveAttribute("data-days", "2");
        expect(content).toHaveAttribute("data-events", "1");
    });

    it("paints blocked slots dark and non-blocked slots green", () => {
        const blockedEvent = buildEvent({
            isBlock: true,
            isAvailability: false,
        });
        const ignoredNonBlock = buildEvent({
            id: 101,
            name: "Normal reservation",
            isBlock: false,
            isAvailability: false,
        });

        const { container } = render(
            <Calendar
                {...buildProps({ reservations: [blockedEvent, ignoredNonBlock] })}
            />,
        );

        const slots = Array.from(container.querySelectorAll("div.border-b.p-2[style*='background-color']"));
        expect(slots.length).toBeGreaterThan(1);

        const firstSlotColor = window.getComputedStyle(slots[0]).backgroundColor;
        const secondSlotColor = window.getComputedStyle(slots[1]).backgroundColor;

        expect(firstSlotColor).toBe("rgb(71, 85, 105)");
        expect(secondSlotColor).toContain("16, 185, 129");
    });
});
