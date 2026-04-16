import { render, screen, within } from "@testing-library/react";
import dayjs from "dayjs";
import type { Dayjs } from "dayjs";
import type { ComponentProps } from "react";
import { describe, expect, it, vi } from "vitest";
import ReservationDateTimePicker from "../../../src/components/ReservationDateTimePicker.tsx";
import type { CalendarEvent } from "../../../src/types.ts";

const buildWeekendDate = (firstDate: Dayjs, numDays: number) => {
    return Array.from({ length: numDays }, (_, index) => firstDate.add(index, "day"))
        .find((dateOption) => dateOption.day() === 6 || dateOption.day() === 0);
};

const buildBaseProps = (overrides: Partial<ComponentProps<typeof ReservationDateTimePicker>> = {}) => {
    const firstDate = dayjs().add(14, "day").startOf("day");

    return {
        firstDate,
        numDays: 7,
        startTime: dayjs().startOf("day").hour(8),
        endTime: dayjs().startOf("day").hour(17),
        timeStep: 30,
        maxResTime: 120,
        selectedDate: "",
        selectedStartTime: "",
        selectedEndTime: "",
        setSelectedDate: vi.fn(),
        setSelectedStartTime: vi.fn(),
        setSelectedEndTime: vi.fn(),
        ...overrides,
    };
};

describe("ReservationDateTimePicker", () => {
    it("allows weekend dates and start times when weekend lock is disabled", () => {
        const props = buildBaseProps({ disableWeekends: false });
        const weekendDate = buildWeekendDate(props.firstDate, props.numDays);
        expect(weekendDate).toBeDefined();

        render(
            <ReservationDateTimePicker
                {...props}
                selectedDate={weekendDate!.format("YYYY-MM-DD")}
            />,
        );

        const weekendLabel = weekendDate!.format("ddd M/D/YY");
        const weekendOption = screen.getByRole("option", { name: weekendLabel });
        expect(weekendOption).not.toBeDisabled();

        const startTimeSelect = screen.getByLabelText("Start time");
        expect(within(startTimeSelect).getAllByRole("option").length).toBeGreaterThan(1);
    });

    it("marks weekend dates as blocked when weekend lock is enabled", () => {
        const props = buildBaseProps({ disableWeekends: true });
        const weekendDate = buildWeekendDate(props.firstDate, props.numDays);
        expect(weekendDate).toBeDefined();

        render(<ReservationDateTimePicker {...props} />);

        const blockedWeekendLabel = `${weekendDate!.format("ddd M/D/YY")} (blocked)`;
        const blockedWeekendOption = screen.getByRole("option", { name: blockedWeekendLabel });
        expect(blockedWeekendOption).toBeDisabled();
    });

    it("allows weekend selection when an open window exists even with weekend lock enabled", () => {
        const props = buildBaseProps({ disableWeekends: true });
        const weekendDate = buildWeekendDate(props.firstDate, props.numDays);
        expect(weekendDate).toBeDefined();

        const openStart = weekendDate!.hour(9).minute(0).second(0).millisecond(0);
        const openEnd = openStart.add(2, "hour");
        const weekendOpenWindow: CalendarEvent = {
            id: 1001,
            name: "Open window",
            date: openStart.format("ddd M/D"),
            startTime: openStart.format("h:mm A"),
            endTime: openEnd.format("h:mm A"),
            startIso: openStart.toISOString(),
            endIso: openEnd.toISOString(),
            isBlock: true,
            isAvailability: true,
            blockType: "OPEN",
        };

        render(
            <ReservationDateTimePicker
                {...props}
                scheduleBlocks={[weekendOpenWindow]}
                selectedDate={weekendDate!.format("YYYY-MM-DD")}
            />,
        );

        const weekendLabel = weekendDate!.format("ddd M/D/YY");
        const weekendOption = screen.getByRole("option", { name: weekendLabel });
        expect(weekendOption).not.toBeDisabled();

        const startTimeSelect = screen.getByLabelText("Start time");
        expect(within(startTimeSelect).getByRole("option", { name: "9:00 AM" })).toBeInTheDocument();
        expect(within(startTimeSelect).queryByRole("option", { name: "8:00 AM" })).not.toBeInTheDocument();
    });
});
