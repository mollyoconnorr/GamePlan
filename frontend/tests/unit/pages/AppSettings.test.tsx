import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import dayjs from "dayjs";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AppSettings from "../../../src/pages/AppSettings.tsx";
import type { RawScheduleBlock } from "../../../src/types.ts";

vi.mock("../../../src/api/Blocks.ts", () => ({
    getScheduleBlocks: vi.fn(),
    createScheduleBlock: vi.fn(),
    updateScheduleBlock: vi.fn(),
    deleteScheduleBlock: vi.fn(),
}));

vi.mock("../../../src/api/Settings.ts", async () => {
    const actual = await vi.importActual<typeof import("../../../src/api/Settings.ts")>("../../../src/api/Settings.ts");
    return {
        ...actual,
        updateAppSettings: vi.fn(),
    };
});

vi.mock("../../../src/components/calendar/Calendar.tsx", () => ({
    default: ({ reservations }: { reservations?: unknown[] }) => (
        <div data-testid="calendar-preview">calendar-events:{reservations?.length ?? 0}</div>
    ),
}));

vi.mock("../../../src/components/ReservationDateTimePicker.tsx", () => ({
    default: () => <div data-testid="mock-date-time-picker">mock-picker</div>,
}));

vi.mock("../../../src/components/ConfirmDialog.tsx", () => ({
    default: () => null,
}));

import { getScheduleBlocks } from "../../../src/api/Blocks.ts";
import { updateAppSettings } from "../../../src/api/Settings.ts";

const getScheduleBlocksMock = vi.mocked(getScheduleBlocks);
const updateAppSettingsMock = vi.mocked(updateAppSettings);

function buildProps(overrides: Partial<React.ComponentProps<typeof AppSettings>> = {}) {
    return {
        firstDate: dayjs("2026-04-12"),
        firstDateToShow: "week" as const,
        startTime: dayjs("2026-04-16T08:00:00"),
        endTime: dayjs("2026-04-16T17:00:00"),
        timeStep: 30,
        maxResTime: 120,
        numDays: 7,
        setFirstDateToShow: vi.fn(),
        setFirstDate: vi.fn(),
        setStartTime: vi.fn(),
        setEndTime: vi.fn(),
        setTimeStep: vi.fn(),
        setMaxResTime: vi.fn(),
        setNumDays: vi.fn(),
        weekendAutoBlockEnabled: true,
        setWeekendAutoBlockEnabled: vi.fn(),
        refreshCalendarData: vi.fn().mockResolvedValue(undefined),
        loading: false,
        ...overrides,
    };
}

describe("AppSettings page", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        getScheduleBlocksMock.mockResolvedValue([]);
    });

    it("hides weekend auto blocks in Manage existing blocks list", async () => {
        const rawBlocks: RawScheduleBlock[] = [
            {
                id: 101,
                start: "2026-04-18T08:00:00.000Z",
                end: "2026-04-18T17:00:00.000Z",
                reason: "Weekend",
                blockType: "WEEKEND",
            },
            {
                id: 102,
                start: "2026-04-19T08:00:00.000Z",
                end: "2026-04-19T17:00:00.000Z",
                reason: "Weekend closed",
                blockType: "BLOCK",
            },
            {
                id: 103,
                start: "2026-04-21T13:00:00.000Z",
                end: "2026-04-21T14:00:00.000Z",
                reason: "Team lift",
                blockType: "BLOCK",
            },
        ];
        getScheduleBlocksMock.mockResolvedValue(rawBlocks);

        render(
            <MemoryRouter>
                <AppSettings {...buildProps()} />
            </MemoryRouter>,
        );

        await waitFor(() => {
            expect(screen.getAllByRole("button", { name: "Edit" })).toHaveLength(1);
        });
        expect(screen.getByText(/Team lift/)).toBeInTheDocument();
        expect(screen.queryByText(/Weekend closed/)).not.toBeInTheDocument();
    });

    it("toggles weekend auto-block setting and applies updated values", async () => {
        const props = buildProps();
        updateAppSettingsMock.mockResolvedValue({
            firstDateToShow: "week",
            firstDate: dayjs("2026-04-12"),
            startTime: dayjs("2026-04-16T08:00:00"),
            endTime: dayjs("2026-04-16T17:00:00"),
            timeStep: 30,
            maxResTime: 120,
            numDays: 7,
            weekendAutoBlockEnabled: false,
        });
        getScheduleBlocksMock.mockResolvedValueOnce([]).mockResolvedValueOnce([]);

        render(
            <MemoryRouter>
                <AppSettings {...props} />
            </MemoryRouter>,
        );

        fireEvent.click(await screen.findByRole("button", { name: "Weekend blocks: ON" }));

        await waitFor(() => {
            expect(updateAppSettingsMock).toHaveBeenCalledTimes(1);
        });
        expect(updateAppSettingsMock).toHaveBeenCalledWith(
            expect.objectContaining({
                weekendAutoBlockEnabled: false,
            }),
        );
        expect(props.setWeekendAutoBlockEnabled).toHaveBeenCalledWith(false);
        expect(props.setFirstDateToShow).toHaveBeenCalledWith("week");
        expect(props.refreshCalendarData).toHaveBeenCalled();
    });
});
