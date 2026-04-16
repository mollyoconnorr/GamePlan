import { useEffect, useMemo, useState } from "react";
import type { Dayjs } from "dayjs";
import type { CalendarEvent, Reservation, PendingDelete } from "../types.ts";
import Spinner from "./Spinner.tsx";
import dayjs from "dayjs";
import { SquarePen, Trash2 } from "lucide-react";
import ConfirmDialog from "./ConfirmDialog.tsx";
import Toast from "./Toast.tsx";
import { createPortal } from "react-dom";
import { getFriendlyReservationErrorMessage } from "../util/ReservationErrorMessages.ts";
import {buildTimeOptions, filterPastTimesForDate} from "../util/TimeOptions.ts";

type ManageReservationsProps = {
    reservations: Reservation[];
    calendarEvents?: CalendarEvent[];
    loading: boolean;
    startTime: Dayjs;
    endTime: Dayjs;
    timeStepMin: number;
    onEditReservation?: (id: number, start: Dayjs, end: Dayjs) => Promise<void> | void;
    onDeleteReservation?: (id: number) => Promise<void> | void;
    isPrivileged: boolean;
    readOnly?: boolean;
    emptyMessage?: string;
};

export default function ManageReservations({
    reservations,
    calendarEvents,
    loading,
    startTime,
    endTime,
    timeStepMin,
    onEditReservation,
    onDeleteReservation,
    isPrivileged,
    readOnly = false,
    emptyMessage = "No reservations found this week",
}: ManageReservationsProps) {
    const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [successMessage, setSuccessMessage] = useState("");
    const [editErrorMessage, setEditErrorMessage] = useState("");
    const [pendingEdit, setPendingEdit] = useState<Reservation | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [selectedStartTime, setSelectedStartTime] = useState("");
    const [selectedEndTime, setSelectedEndTime] = useState("");

    const displayReservations = useMemo(() => {
        const mappedReservations = calendarEvents
            ? calendarEvents
                .map((event) => {
                    if (!event.startIso || !event.endIso) {
                        return null;
                    }

                    const start = dayjs(event.startIso);
                    const end = dayjs(event.endIso);

                    if (!start.isValid() || !end.isValid()) {
                        return null;
                    }

                    return {
                        id: event.id,
                        name: event.name,
                        start,
                        end,
                        color: event.conflict ? "#dc2626" : event.color,
                        description: event.temp ? "Pending reservation" : event.description,
                    };
                })
                .filter((event): event is Reservation => event !== null)
            : reservations;

        return [...mappedReservations].sort((a, b) => a.start.valueOf() - b.start.valueOf());
    }, [calendarEvents, reservations]);

    useEffect(() => {
        if (!successMessage) return;
        const timeout = setTimeout(() => setSuccessMessage(""), 2500);
        return () => clearTimeout(timeout);
    }, [successMessage]);

    // Build selectable times from the same bounds/step used by Calendar.
    const timeOptions = useMemo(() => {
        return buildTimeOptions(startTime, endTime, timeStepMin);
    }, [startTime, endTime, timeStepMin]);

    const startTimeOptions = useMemo(() => {
        if (!pendingEdit) {
            return timeOptions;
        }

        return filterPastTimesForDate(timeOptions, pendingEdit.start);
    }, [pendingEdit, timeOptions]);

    const endTimeOptions = useMemo(() => {
        if (!selectedStartTime) return [];
        return startTimeOptions.filter((option) => option.value > selectedStartTime);
    }, [selectedStartTime, startTimeOptions]);

    const handleConfirmDelete = async () => {
        if (!pendingDelete || readOnly || !onDeleteReservation) return;

        try {
            setIsDeleting(true);
            await onDeleteReservation(pendingDelete.id);
            setSuccessMessage(`Deleted reservation for ${pendingDelete.name}.`);
            setPendingDelete(null);
        } catch (err) {
            console.error(err);
        } finally {
            setIsDeleting(false);
        }
    };

    const handleOpenEdit = (reservation: Reservation) => {
        if (readOnly || !onEditReservation) {
            return;
        }

        if (reservation.start.isBefore(dayjs())) {
            return;
        }

        const availableStartTimeOptions = filterPastTimesForDate(timeOptions, reservation.start);
        const reservationStart = reservation.start.format("HH:mm");
        const reservationEnd = reservation.end.format("HH:mm");

        // If current values fall outside allowed bounds, clamp to the first valid option
        const boundedStartTime = availableStartTimeOptions.some((option) => option.value === reservationStart)
            ? reservationStart
            : (availableStartTimeOptions[0]?.value ?? "");

        const boundedEndTimeOptions = availableStartTimeOptions.filter((option) => option.value > boundedStartTime);
        const boundedEndTime = boundedEndTimeOptions.some((option) => option.value === reservationEnd)
            ? reservationEnd
            : (boundedEndTimeOptions[0]?.value ?? "");

        setPendingEdit(reservation);
        setSelectedStartTime(boundedStartTime);
        setSelectedEndTime(boundedEndTime);
        setEditErrorMessage("");
    };

    const handleCloseEdit = () => {
        if (isEditing) return;
        setPendingEdit(null);
        setSelectedStartTime("");
        setSelectedEndTime("");
        setEditErrorMessage("");
    };

    const editedRange = useMemo(() => {
        if (!pendingEdit || !selectedStartTime || !selectedEndTime) {
            return null;
        }

        const [startHour, startMinute] = selectedStartTime.split(":").map((value) => Number(value));
        const [endHour, endMinute] = selectedEndTime.split(":").map((value) => Number(value));

        if (
            Number.isNaN(startHour) ||
            Number.isNaN(startMinute) ||
            Number.isNaN(endHour) ||
            Number.isNaN(endMinute)
        ) {
            return null;
        }

        return {
            start: pendingEdit.start
                .hour(startHour)
                .minute(startMinute)
                .second(0)
                .millisecond(0),
            end: pendingEdit.start
                .hour(endHour)
                .minute(endMinute)
                .second(0)
                .millisecond(0),
        };
    }, [pendingEdit, selectedStartTime, selectedEndTime]);

    const editHasConflict = useMemo(() => {
        if (!editedRange) return false;
        return displayReservations.some((res) => {
            if (!pendingEdit || res.id === pendingEdit.id) {
                return false;
            }
            return editedRange.start.isBefore(res.end) && res.start.isBefore(editedRange.end);
        });
    }, [displayReservations, editedRange, pendingEdit]);

    const editStartIsPast = useMemo(() => {
        if (!editedRange) {
            return false;
        }

        return editedRange.start.isBefore(dayjs());
    }, [editedRange]);

    const handleSaveEdit = async () => {
        if (!pendingEdit || !selectedStartTime || !selectedEndTime || !onEditReservation) return;

        const [startHour, startMinute] = selectedStartTime.split(":").map((value) => Number(value));
        const [endHour, endMinute] = selectedEndTime.split(":").map((value) => Number(value));

        if (
            Number.isNaN(startHour) ||
            Number.isNaN(startMinute) ||
            Number.isNaN(endHour) ||
            Number.isNaN(endMinute)
        ) {
            return;
        }

        const updatedStart = pendingEdit.start
            .hour(startHour)
            .minute(startMinute)
            .second(0)
            .millisecond(0);

        const updatedEnd = pendingEdit.start
            .hour(endHour)
            .minute(endMinute)
            .second(0)
            .millisecond(0);

        if (updatedStart.isBefore(dayjs())) {
            setEditErrorMessage("Start time must be now or later.");
            return;
        }

        try {
            setIsEditing(true);
            await onEditReservation(pendingEdit.id, updatedStart, updatedEnd);
            setSuccessMessage(`Updated reservation time for ${pendingEdit.name}.`);
            setPendingEdit(null);
            setSelectedStartTime("");
            setSelectedEndTime("");
            setEditErrorMessage("");
        } catch (err) {
            console.error(err);
            const message = err instanceof Error ? err.message : "Failed to update reservation.";
            setEditErrorMessage(getFriendlyReservationErrorMessage(message));
        } finally {
            setIsEditing(false);
        }
    };

    const editSaveDisabled =
        isEditing ||
        !pendingEdit ||
        !selectedStartTime ||
        !selectedEndTime ||
        selectedEndTime <= selectedStartTime ||
        editStartIsPast ||
        editHasConflict;

    const dayEventMap: Map<string, { dayLabel: string; events: Reservation[] }> = new Map();

    displayReservations.forEach((r) => {
        const dayKey = r.start.startOf("day").format("YYYY-MM-DD");
        const dayLabel = r.start.format("dddd, MMMM D");

        const existing = dayEventMap.get(dayKey);
        if (!existing) {
            dayEventMap.set(dayKey, { dayLabel, events: [r] });
        } else {
            existing.events.push(r);
        }
    });

    const dayEventArr = [...dayEventMap.entries()]
        .sort(([a], [b]) => dayjs(a).valueOf() - dayjs(b).valueOf())
        .map(([dayKey, { dayLabel, events }]) => ({
            dayKey,
            dayLabel,
            events: [...events].sort((a, b) => a.start.valueOf() - b.start.valueOf()),
        }));
    const now = dayjs();

    return (
        <>
            <Toast message={successMessage} />

            {!readOnly && (
                <ConfirmDialog
                    open={pendingDelete !== null}
                    title="Delete reservation?"
                    message={
                        pendingDelete
                            ? `Are you sure you want to delete the reservation for ${pendingDelete.name}?`
                            : ""
                    }
                    confirmText="Delete"
                    cancelText="Cancel"
                    loading={isDeleting}
                    onCancel={() => setPendingDelete(null)}
                    onConfirm={handleConfirmDelete}
                />
            )}

            {!readOnly &&
                pendingEdit !== null &&
                typeof document !== "undefined" &&
                createPortal(
                    <div
                        className="fixed inset-0 z-[300] flex items-center justify-center bg-black/40 px-4"
                        onClick={handleCloseEdit}
                    >
                        <div
                            className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <h2 className="text-xl font-semibold">Edit reservation time</h2>
                            <p className="mt-1 text-sm text-gray-700">{pendingEdit.name}</p>
                            <p className="mt-1 text-sm text-gray-700">{pendingEdit.start.format("dddd, MMMM D")}</p>

                            <div className="mt-5 grid gap-4 md:grid-cols-2">
                                <label className="flex flex-col gap-1 text-sm font-medium">
                                    Start time
                                    <select
                                        value={selectedStartTime}
                                        onChange={(e) => {
                                            const nextStartTime = e.target.value;
                                            setSelectedStartTime(nextStartTime);
                                            setEditErrorMessage("");

                                            if (selectedEndTime && selectedEndTime <= nextStartTime) {
                                                setSelectedEndTime("");
                                            }
                                        }}
                                        className="rounded-md border px-3 py-2 font-normal"
                                    >
                                        <option value="">Select start time</option>
                                        {startTimeOptions.map((option) => (
                                            <option key={option.value} value={option.value}>
                                                {option.label}
                                            </option>
                                        ))}
                                    </select>
                                </label>

                                <label className="flex flex-col gap-1 text-sm font-medium">
                                    End time
                                    <select
                                        value={selectedEndTime}
                                        onChange={(e) => {
                                            setSelectedEndTime(e.target.value);
                                            setEditErrorMessage("");
                                        }}
                                        disabled={!selectedStartTime}
                                        className="rounded-md border px-3 py-2 font-normal disabled:bg-gray-100 disabled:text-gray-400"
                                    >
                                        <option value="">Select end time</option>
                                        {endTimeOptions.map((option) => (
                                            <option key={option.value} value={option.value}>
                                                {option.label}
                                            </option>
                                        ))}
                                    </select>
                                </label>
                            </div>

                            {editHasConflict && (
                                <p className="mt-3 text-sm text-red-600">
                                    The selected time overlaps one of your other reservations. Delete that booking first or pick a different time.
                                </p>
                            )}
                            {editStartIsPast && !editHasConflict && !editErrorMessage && (
                                <p className="mt-3 text-sm text-red-600">
                                    Start time must be now or later.
                                </p>
                            )}
                            {editErrorMessage && !editHasConflict && (
                                <p className="mt-3 text-sm text-red-600">
                                    {editErrorMessage}
                                </p>
                            )}

                            <div className="mt-6 flex justify-end gap-3">
                                    <button
                                        type="button"
                                        className="rounded-md border px-4 py-2 hover:cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                                        onClick={handleCloseEdit}
                                        disabled={isEditing}
                                    >
                                        Cancel
                                    </button>
                                <button
                                    type="button"
                                    className="rounded-md bg-blue-900 px-4 py-2 text-white hover:cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                                    onClick={handleSaveEdit}
                                    disabled={editSaveDisabled}
                                >
                                    {isEditing ? "Saving..." : "Save"}
                                </button>
                            </div>
                        </div>
                    </div>,
                    document.body
                )}

            <section className="mx-0 lg:mx-30">
                {loading && <Spinner />}

                {!loading && (dayEventArr.length === 0) &&
                    <p className="text-center">{emptyMessage}</p>
                }

                {!loading &&
                    dayEventArr.map(({ dayKey, dayLabel, events }) => (
                        <div
                            key={dayKey}
                            className="flex flex-col bg-calendar-bg border-calendar-border shadow-md p-5 space-y-5 items-center"
                        >
                            <h2 className="text-2xl font-medium ml-5 mr-auto">{dayLabel}</h2>

                            {events.map((e) => (
                                <ReservationCard
                                    key={`${e.id}-${e.start.toISOString()}-${e.name}`}
                                    startTime={e.start.format("h:mm A")}
                                    endTime={e.end.format("h:mm A")}
                                    name={e.name}
                                    id={e.id}
                                    color={e.color}
                                    description={readOnly || isPrivileged ? e.description : undefined}
                                    canEdit={!e.start.isBefore(now)}
                                    showEditAction={!readOnly && Boolean(onEditReservation)}
                                    showDeleteAction={!readOnly && Boolean(onDeleteReservation)}
                                    onRequestEdit={() => handleOpenEdit(e)}
                                    onRequestDelete={(id, name) => setPendingDelete({ id, name })}
                                />
                            ))}

                            <hr className="m-5 border w-full" />
                        </div>
                    ))}
            </section>
        </>
    );
}

function ReservationCard({
    startTime,
    endTime,
    name,
    id,
    onRequestEdit,
    onRequestDelete,
    color,
    description,
    canEdit,
    showEditAction,
    showDeleteAction
}: {
    startTime: string;
    endTime: string;
    name: string;
    id: number;
    onRequestEdit?: () => void;
    onRequestDelete?: (id: number, name: string) => void;
    color: string | undefined;
    description: string | undefined;
    canEdit: boolean;
    showEditAction: boolean;
    showDeleteAction: boolean;
}) {
    const backgroundColor = color || "#ffffff";
    const textColor = getReadableTextColor(backgroundColor);

    return (
        <div className="flex w-full justify-between items-center border shadow-md rounded-md px-2 max-w-[80%] text-xs md:text-sm lg:text-lg"
        style={{backgroundColor, color: textColor}}
        >
            <div className="flex flex-col lg:flex-row space-x-1">
                <p className="text-nowrap">{startTime} -</p>
                <p>{endTime}</p>
            </div>

            <p>{name}</p>

            {description && <p>{description}</p>}

            {(showEditAction || showDeleteAction) && (
                <div className="flex flex-col p-2 space-y-6">
                    {showEditAction && (
                        <button
                            type="button"
                            className="hover:cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                            title={canEdit ? "Edit Reservation" : "Past reservations cannot be edited"}
                            onClick={onRequestEdit}
                            disabled={!canEdit}
                        >
                            <SquarePen />
                        </button>
                    )}
                    {showDeleteAction && (
                        <button
                            type="button"
                            className="hover:cursor-pointer"
                            title="Delete Reservation"
                            onClick={() => onRequestDelete?.(id, name)}
                        >
                            <Trash2 />
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}

function getReadableTextColor(backgroundColor: string): string {
    const rgb = parseColorToRgb(backgroundColor);
    if (!rgb) {
        return "#111827";
    }

    const brightness = (rgb.r * 299 + rgb.g * 587 + rgb.b * 114) / 1000;
    return brightness < 140 ? "#f9fafb" : "#111827";
}

function parseColorToRgb(color: string): { r: number; g: number; b: number } | null {
    const normalized = color.trim();

    const shortHexMatch = normalized.match(/^#([a-f\d]{3})$/i);
    if (shortHexMatch) {
        const [r, g, b] = shortHexMatch[1].split("");
        return {
            r: Number.parseInt(r + r, 16),
            g: Number.parseInt(g + g, 16),
            b: Number.parseInt(b + b, 16),
        };
    }

    const longHexMatch = normalized.match(/^#([a-f\d]{6})$/i);
    if (longHexMatch) {
        const hex = longHexMatch[1];
        return {
            r: Number.parseInt(hex.slice(0, 2), 16),
            g: Number.parseInt(hex.slice(2, 4), 16),
            b: Number.parseInt(hex.slice(4, 6), 16),
        };
    }

    const rgbMatch = normalized.match(
        /^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})(?:\s*,\s*(?:0|1|0?\.\d+))?\s*\)$/i
    );

    if (rgbMatch) {
        const [r, g, b] = rgbMatch.slice(1, 4).map((value) => Number.parseInt(value, 10));
        if (r <= 255 && g <= 255 && b <= 255) {
            return { r, g, b };
        }
    }

    return null;
}
