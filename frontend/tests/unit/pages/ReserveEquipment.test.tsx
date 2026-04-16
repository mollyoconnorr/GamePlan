import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import dayjs from "dayjs";
import type { ComponentProps } from "react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ReserveEquipment from "../../../src/pages/ReserveEquipment.tsx";

vi.mock("../../../src/api/Reservations.ts", () => ({
    getEquipmentReservations: vi.fn(),
    makeReservation: vi.fn(),
}));

vi.mock("../../../src/api/Blocks.ts", () => ({
    getScheduleBlocks: vi.fn(),
}));

vi.mock("../../../src/api/Equipment.ts", () => ({
    getEquipmentTypeAttributes: vi.fn(),
}));

vi.mock("../../../src/components/calendar/Calendar.tsx", () => ({
    default: () => <div data-testid="mock-calendar">calendar</div>,
}));

vi.mock("../../../src/components/ManageReservations.tsx", () => ({
    default: () => <div data-testid="mock-manage-reservations">list</div>,
}));

vi.mock("../../../src/components/AvailabilityNotice.tsx", () => ({
    default: () => null,
}));

vi.mock("../../../src/components/ReservationDateTimePicker.tsx", () => ({
    default: (props: {
        firstDate: dayjs.Dayjs;
        numDays: number;
        disableWeekends?: boolean;
        selectedDate: string;
        selectedStartTime: string;
        selectedEndTime: string;
        setSelectedDate: (date: string) => void;
        setSelectedStartTime: (time: string) => void;
        setSelectedEndTime: (time: string) => void;
    }) => {
        const weekendDate =
            Array.from({ length: props.numDays }, (_, index) => props.firstDate.add(index, "day"))
                .find((dateOption) => dateOption.day() === 0 || dateOption.day() === 6)
                ?.format("YYYY-MM-DD") ?? props.firstDate.format("YYYY-MM-DD");

        return (
            <div data-testid="mock-picker">
                <div data-testid="picker-disable-weekends">{String(Boolean(props.disableWeekends))}</div>
                <div data-testid="picker-selected-date">{props.selectedDate}</div>
                <div data-testid="picker-selected-start">{props.selectedStartTime}</div>
                <div data-testid="picker-selected-end">{props.selectedEndTime}</div>
                <button
                    type="button"
                    onClick={() => {
                        props.setSelectedDate(weekendDate);
                        props.setSelectedStartTime("09:00");
                        props.setSelectedEndTime("10:00");
                    }}
                >
                    Set weekend selection
                </button>
            </div>
        );
    },
}));

import { getScheduleBlocks } from "../../../src/api/Blocks.ts";
import { getEquipmentTypeAttributes } from "../../../src/api/Equipment.ts";
import { getEquipmentReservations } from "../../../src/api/Reservations.ts";

const getScheduleBlocksMock = vi.mocked(getScheduleBlocks);
const getEquipmentTypeAttributesMock = vi.mocked(getEquipmentTypeAttributes);
const getEquipmentReservationsMock = vi.mocked(getEquipmentReservations);

function buildProps(overrides: Partial<ComponentProps<typeof ReserveEquipment>> = {}) {
    return {
        firstDate: dayjs("2026-04-12"),
        startTime: dayjs("2026-04-16T08:00:00"),
        endTime: dayjs("2026-04-16T17:00:00"),
        timeStep: 30,
        maxResTime: 120,
        numDays: 7,
        reservations: [],
        setReservations: vi.fn(),
        weekendAutoBlockEnabled: true,
        ...overrides,
    };
}

describe("ReserveEquipment page", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        getScheduleBlocksMock.mockResolvedValue([]);
        getEquipmentTypeAttributesMock.mockResolvedValue([]);
        getEquipmentReservationsMock.mockResolvedValue([]);
        vi.stubGlobal(
            "fetch",
            vi.fn().mockResolvedValue({
                ok: true,
                json: vi.fn().mockResolvedValue([]),
            } as unknown as Response),
        );
    });

    it("passes weekend lock state to date-time picker", async () => {
        render(
            <MemoryRouter>
                <ReserveEquipment {...buildProps({ weekendAutoBlockEnabled: true })} />
            </MemoryRouter>,
        );

        expect(await screen.findByTestId("picker-disable-weekends")).toHaveTextContent("true");
    });

    it("clears weekend selection when weekend auto-blocking is enabled", async () => {
        render(
            <MemoryRouter>
                <ReserveEquipment {...buildProps({ weekendAutoBlockEnabled: true })} />
            </MemoryRouter>,
        );

        fireEvent.click(await screen.findByRole("button", { name: "Set weekend selection" }));

        await waitFor(() => {
            expect(screen.getByTestId("picker-selected-date")).toHaveTextContent("");
            expect(screen.getByTestId("picker-selected-start")).toHaveTextContent("");
            expect(screen.getByTestId("picker-selected-end")).toHaveTextContent("");
        });
    });

    it("keeps weekend selection when weekend auto-blocking is disabled", async () => {
        render(
            <MemoryRouter>
                <ReserveEquipment {...buildProps({ weekendAutoBlockEnabled: false })} />
            </MemoryRouter>,
        );

        fireEvent.click(await screen.findByRole("button", { name: "Set weekend selection" }));

        await waitFor(() => {
            expect(screen.getByTestId("picker-selected-date").textContent).not.toBe("");
            expect(screen.getByTestId("picker-selected-start")).toHaveTextContent("09:00");
            expect(screen.getByTestId("picker-selected-end")).toHaveTextContent("10:00");
        });
    });

    it("shows overlap conflict and disables reserve for overlapping user reservation", async () => {
        const fetchMock = vi.fn((input: RequestInfo | URL) => {
            const url = String(input);

            if (url === "/api/equipment-types") {
                return Promise.resolve({
                    ok: true,
                    json: vi.fn().mockResolvedValue([{ id: 1, name: "Racks" }]),
                } as unknown as Response);
            }

            if (url === "/api/equipment-types/1/equipment") {
                return Promise.resolve({
                    ok: true,
                    json: vi.fn().mockResolvedValue([
                        {
                            id: 11,
                            name: "Rack 11",
                            attributes: [],
                            reservations: [],
                        },
                    ]),
                } as unknown as Response);
            }

            return Promise.resolve({
                ok: true,
                json: vi.fn().mockResolvedValue([]),
            } as unknown as Response);
        });
        vi.stubGlobal("fetch", fetchMock);

        const existingReservation = {
            id: 91,
            name: "Bike",
            start: dayjs("2026-04-12T09:00:00"),
            end: dayjs("2026-04-12T10:00:00"),
        };

        render(
            <MemoryRouter>
                <ReserveEquipment
                    {...buildProps({
                        weekendAutoBlockEnabled: false,
                        reservations: [existingReservation],
                    })}
                />
            </MemoryRouter>,
        );

        fireEvent.change(await screen.findByLabelText("Equipment type"), {
            target: { value: "1" },
        });

        fireEvent.click(await screen.findByRole("button", { name: /Rack 11/i }));
        fireEvent.click(await screen.findByRole("button", { name: "Set weekend selection" }));

        expect(
            await screen.findByText(
                "This overlaps another one of your reservations. Delete or adjust that reservation before booking again.",
            ),
        ).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Reserve" })).toBeDisabled();
    });
});
