import {type JSX} from "react";
import * as React from "react";
import {type Dayjs} from "dayjs";

/**
 * Represents the authenticated user profile returned to the frontend.
 */
export type User = {
    id: string;
    email: string;
    username: string;
    firstName: string;
    lastName: string;
    role: string;
    pendingApproval?: boolean;
};

/**
 * Tracks whether authentication is loading and which user, if any, is signed in.
 */
export type AuthState = {
    user: User | null;
    loading: boolean;
    sessionMessage: string | null;
    refresh: () => Promise<void>;
    login: () => void;
    logout: () => void;
}

/**
 * Represents the user management row shown in the admin screen.
 */
export interface AdminUser {
    id: number;
    oidcUserId: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    pendingApproval: boolean;
}

/**
 * Creates a notification entity for a user-facing message.
 */
export interface Notification {
    id: number;
    message: string;
    createdAt: string;
}

/**
 * Defines the props required by the ham component.
 */
export interface hamProps {
    navHTML: JSX.Element[];
    display: boolean;
    setDisplay: React.Dispatch<React.SetStateAction<boolean>>;
}

/**
 * Inputs required to render navigation and sign-out controls.
 */
export interface NavbarProps {
    username: string;
    logout: () => void;
}

/**
 * Backend reservation payload before frontend date parsing.
 */
export interface RawReservation {
    id: number,
    equipmentName: string,
    start: string,
    end: string
    color?: string;
}

/**
 * Frontend reservation model with parsed calendar-ready fields.
 */
export interface Reservation {
    id: number;
    name: string;
    start: Dayjs;
    end: Dayjs;
    color?: string;
    description?: string;
}

/**
 * Unified calendar event model for reservations and schedule blocks.
 */
export interface CalendarEvent {
    id: number,
    startTime: string;
    endTime: string;
    name: string;
    date: string;
    description?: string;
    temp?: boolean;
    startIso?: string;
    endIso?: string;
    color?: string;
    borderColor?: string;
    borderStyle?: "solid" | "dashed" | "dotted";
    textColor?: string;
    conflict?: boolean;
    // Background renderer hints for schedule blocks / open windows.
    isBlock?: boolean;
    isAvailability?: boolean;
    isWeekend?: boolean;
    // Raw backend block type preserved for admin editing workflows.
    blockType?: string;
}

/**
 * Backend admin reservation payload including athlete details.
 */
export interface RawAdminReservation {
    id: number;
    equipmentName: string;
    start: string;
    end: string;
    athleteFirstName: string;
    athleteLastName: string;
    color?: string;
}

/**
 * Backend schedule block payload before frontend date parsing.
 */
export interface RawScheduleBlock {
    id: number;
    start: string;
    end: string;
    reason?: string | null;
    blockType?: string | null;
    canceledReservations?: number | null;
}

/**
 * Name/value equipment attribute shown in equipment lists and filters.
 */
export interface EquipmentAttribute {
    name: string;
    value: string;
}

/**
 * Small reservation summary embedded in equipment availability responses.
 */
export interface EquipmentReservationSummary {
    id: number;
    start: string;
    end: string;
}

/**
 * Equipment option with attributes and existing reservations for availability checks.
 */
export interface EquipmentWithReservations {
    id: number;
    name: string;
    attributes: EquipmentAttribute[];
    reservations: EquipmentReservationSummary[];
}

/**
 * Inputs supported by the reusable button component.
 */
export type ButtonProps = {
    text: string;
    className?: string;
    onClick?: () => void;
    style?: React.CSSProperties;
    disabled?: boolean;
};

/**
 * Tracks the reservation selected for delete confirmation.
 */
export type PendingDelete = {
    id: number;
    name: string;
};

/**
 * Shared calendar settings passed from the app shell into calendar-based pages.
 */
export interface CalendarData {
    // Window start date in local timezone (week/day aligned by settings).
    firstDate: Dayjs;
    // Daily time bounds used by both calendar and reservation forms.
    startTime: Dayjs;
    endTime: Dayjs;
    timeStep: number;
    maxResTime: number;
    numDays: number;
}

// Parsed time is reused for both alignment checks and start/end comparisons.
/**
 * Time parsing result with hour, minute, and total-minute forms.
 */
export type ParsedTime = {hour: number; minute: number; totalMinutes: number};
