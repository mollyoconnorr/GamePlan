import type {JSX} from "react";
import * as React from "react";
import type {Dayjs} from "dayjs";

export type User = {
    id: string;
    email: string;
    username: string;
    firstName: string;
    lastName: string;
    role: string;
};

export type AuthState = {
    user: User | null;
    loading: boolean;
    refresh: () => Promise<void>;
    login: () => void;
    logout: () => void;
}

export interface AdminUser {
    id: number;
    oidcUserId: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
}

export interface hamProps {
    navHTML: JSX.Element[];
    display: boolean;
    setDisplay: React.Dispatch<React.SetStateAction<boolean>>;
}

export interface NavbarProps {
    username: string;
    logout: () => void;
}

export interface RawReservation {
    id: number,
    equipmentName: string,
    start: string,
    end: string
    color?: string;
}

export interface Reservation {
    id: number,
    name: string,
    start: Dayjs,
    end: Dayjs
    color?: string;
}

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
    textColor?: string;
    conflict?: boolean;
}

export interface RawAdminReservation {
    id: number;
    equipmentName: string;
    start: string;
    end: string;
    athleteFirstName: string;
    athleteLastName: string;
    color?: string;
}

export interface EquipmentAttribute {
    name: string;
    value: string;
}

export interface EquipmentReservationSummary {
    id: number;
    start: string;
    end: string;
}

export interface EquipmentWithReservations {
    id: number;
    name: string;
    attributes: EquipmentAttribute[];
    reservations: EquipmentReservationSummary[];
}

export type ButtonProps = {
    text: string;
    className?: string;
    onClick?: () => void;
    style?: React.CSSProperties;
    disabled?: boolean;
};

export type PendingDelete = {
    id: number;
    name: string;
};
