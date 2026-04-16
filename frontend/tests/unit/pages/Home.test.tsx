import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import dayjs from "dayjs";
import { MemoryRouter } from "react-router-dom";
import type { ComponentProps } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Home from "../../../src/pages/Home.tsx";
import type { Reservation, User } from "../../../src/types.ts";

vi.mock("../../../src/auth/AuthContext.tsx", () => ({
    useAuthedUser: vi.fn(),
}));

vi.mock("../../../src/api/Reservations.ts", () => ({
    deleteReservation: vi.fn(),
    updateReservation: vi.fn(),
}));

vi.mock("../../../src/api/Admin.ts", () => ({
    fetchPendingUserCount: vi.fn(),
}));

vi.mock("../../../src/api/Notifications.ts", () => ({
    getNotifications: vi.fn(),
    getUnreadNotificationCount: vi.fn(),
    markNotificationAsRead: vi.fn(),
}));

vi.mock("../../../src/components/calendar/Calendar.tsx", () => ({
    default: () => <div data-testid="mock-home-calendar">calendar-view</div>,
}));

vi.mock("../../../src/components/ManageReservations.tsx", () => ({
    default: () => <div data-testid="mock-home-manage-reservations">list-view</div>,
}));

vi.mock("../../../src/components/AvailabilityNotice.tsx", () => ({
    default: () => <div data-testid="mock-availability-notice">availability</div>,
}));

vi.mock("../../../src/components/BlockedTimeNotice.tsx", () => ({
    default: () => <div data-testid="mock-blocked-notice">blocked</div>,
}));

vi.mock("../../../src/components/OffHoursReservationNotice.tsx", () => ({
    default: () => <div data-testid="mock-offhours-notice">offhours</div>,
}));

import { useAuthedUser } from "../../../src/auth/AuthContext.tsx";
import { fetchPendingUserCount } from "../../../src/api/Admin.ts";
import { getNotifications, getUnreadNotificationCount, markNotificationAsRead } from "../../../src/api/Notifications.ts";

const useAuthedUserMock = vi.mocked(useAuthedUser);
const fetchPendingUserCountMock = vi.mocked(fetchPendingUserCount);
const getNotificationsMock = vi.mocked(getNotifications);
const getUnreadNotificationCountMock = vi.mocked(getUnreadNotificationCount);
const markNotificationAsReadMock = vi.mocked(markNotificationAsRead);

function buildReservation(overrides: Partial<Reservation> = {}): Reservation {
    const start = dayjs().add(1, "day").hour(9).minute(0).second(0).millisecond(0);
    const end = start.add(1, "hour");

    return {
        id: 1,
        name: "Power Rack",
        start,
        end,
        ...overrides,
    };
}

function buildUser(overrides: Partial<User> = {}): User {
    return {
        id: "user-1",
        email: "athlete@example.com",
        username: "athlete",
        firstName: "Alex",
        lastName: "Athlete",
        role: "ATHLETE",
        ...overrides,
    };
}

function renderHome(overrides: Partial<ComponentProps<typeof Home>> = {}) {
    const reservation = buildReservation();
    const props: ComponentProps<typeof Home> = {
        firstDate: dayjs().startOf("week"),
        startTime: dayjs().startOf("day").hour(8),
        endTime: dayjs().startOf("day").hour(17),
        timeStep: 30,
        maxResTime: 120,
        numDays: 7,
        reservations: [reservation],
        calendarEvents: [],
        loadReservations: vi.fn().mockResolvedValue(undefined),
        loading: false,
        ...overrides,
    };

    return render(
        <MemoryRouter>
            <Home {...props} />
        </MemoryRouter>,
    );
}

describe("Home page", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.clear();
        fetchPendingUserCountMock.mockResolvedValue(0);
        getNotificationsMock.mockResolvedValue([]);
        getUnreadNotificationCountMock.mockResolvedValue(0);
        markNotificationAsReadMock.mockResolvedValue(undefined);
    });

    it("renders pending-student onboarding message", () => {
        useAuthedUserMock.mockReturnValue(
            buildUser({
                role: "STUDENT",
                pendingApproval: true,
                firstName: "Jordan",
            }),
        );

        renderHome();

        expect(screen.getByText("Hi, Jordan")).toBeInTheDocument();
        expect(screen.getByText("Thanks for signing up!")).toBeInTheDocument();
        expect(screen.queryByText("Reserve Equipment")).not.toBeInTheDocument();
    });

    it("renders non-pending student access message", () => {
        useAuthedUserMock.mockReturnValue(
            buildUser({
                role: "STUDENT",
                pendingApproval: false,
                firstName: "Casey",
            }),
        );

        renderHome();

        expect(screen.getByText("Hi, Casey")).toBeInTheDocument();
        expect(screen.getByText("Student access")).toBeInTheDocument();
    });

    it("shows athlete notifications flow and list toggle", async () => {
        useAuthedUserMock.mockReturnValue(buildUser({ role: "ATHLETE" }));
        getUnreadNotificationCountMock.mockResolvedValue(2);
        getNotificationsMock.mockResolvedValue([
            {
                id: 9,
                message: "Your reservation was canceled",
                createdAt: "Today",
            },
        ]);

        renderHome();

        expect(await screen.findByText("Reserve Equipment")).toBeInTheDocument();
        expect(await screen.findByTestId("mock-home-calendar")).toBeInTheDocument();
        expect(screen.getByText("2")).toBeInTheDocument();

        fireEvent.click(screen.getByRole("button", { name: "Show notifications" }));
        expect(await screen.findByText("Your reservation was canceled")).toBeInTheDocument();

        fireEvent.click(screen.getByRole("button", { name: "Mark as read" }));

        await waitFor(() => {
            expect(markNotificationAsReadMock).toHaveBeenCalledWith(9);
        });
        expect(screen.queryByText("Your reservation was canceled")).not.toBeInTheDocument();

        fireEvent.click(screen.getByRole("button", { name: "List" }));
        expect(await screen.findByTestId("mock-home-manage-reservations")).toBeInTheDocument();
    });

    it("shows admin actions and pending user badge", async () => {
        useAuthedUserMock.mockReturnValue(buildUser({ role: "ADMIN" }));
        fetchPendingUserCountMock.mockResolvedValue(3);

        renderHome();

        expect(await screen.findByRole("button", { name: "App Settings" })).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Manage users" })).toBeInTheDocument();
        expect(screen.queryByText("Reserve Equipment")).not.toBeInTheDocument();
        expect(await screen.findByText("3")).toBeInTheDocument();
        expect(screen.queryByRole("button", { name: "Show notifications" })).not.toBeInTheDocument();
    });
});
