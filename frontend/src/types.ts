import type {JSX} from "react";
import * as React from "react";
import type {Dayjs} from "dayjs";

export type User = {
    id: string;
    email: string;
    username: string;
    firstName: string;
    lastName: string;
};

export type AuthState = {
    user: User | null;
    loading: boolean;
    refresh: () => Promise<void>;
    login: () => void;
    logout: () => void;
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
}

export interface Reservation {
    id: number,
    name: string,
    start: Dayjs,
    end: Dayjs
}

export interface CalendarEvent {
    startTime: string;
    endTime: string;
    name: string;
    date: string;
}

export type ButtonProps = {
    text: string;
    className?: string;
    onClick?: () => void;
};