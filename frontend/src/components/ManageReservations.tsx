import { useEffect, useMemo, useState } from "react";
import type { Dayjs } from "dayjs";
import type { Reservation, PendingDelete } from "../types.ts";
import Spinner from "./Spinner.tsx";
import dayjs from "dayjs";
import { SquarePen, Trash2 } from "lucide-react";
import ConfirmDialog from "./ConfirmDialog.tsx";
import Toast from "./Toast.tsx";
import { createPortal } from "react-dom";
import { getFriendlyReservationErrorMessage } from "../util/ReservationErrorMessages.ts";

type ManageReservationsProps = {
    reservations: Reservation[];
    loading: boolean;
    startTime: Dayjs;
    endTime: Dayjs;
    timeStepMin: number;
    onEditReservation: (id: number, start: Dayjs, end: Dayjs) => Promise<void> | void;
    onDeleteReservation: (id: number) => Promise<void> | void;
};

export default function ManageReservations({
    reservations,
    loading,
    startTime,
    endTime,
    timeStepMin,
    onEditReservation,
    onDeleteReservation,
}: ManageReservationsProps) {
    const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [successMessage, setSuccessMessage] = useState("");
    const [editErrorMessage, setEditErrorMessage] = useState("");
    const [pendingEdit, setPendingEdit] = useState<Reservation | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [selectedStartTime, setSelectedStartTime] = useState("");
    const [selectedEndTime, setSelectedEndTime] = useState("");

    useEffect(() => {
        if (!successMessage) return;
        const timeout = setTimeout(() => setSuccessMessage(""), 2500);
        return () => clearTimeout(timeout);
    }, [successMessage]);

    // Build selectable times from the same bounds/step used by Calendar.
    const timeOptions = useMemo(() => {
        if (timeStepMin <= 0 || endTime.isBefore(startTime)) return [];

        const options: { value: string; label: string }[] = [];
        let current = startTime;

        while (current.isBefore(endTime) || current.isSame(endTime)) {
            options.push({
                value: current.format("HH:mm"),
                label: current.format("h:mm A"),
            });
            current = current.add(timeStepMin, "minute");
        }

        return options;
    }, [startTime, endTime, timeStepMin]);

    const endTimeOptions = useMemo(() => {
        if (!selectedStartTime) return [];
        return timeOptions.filter((option) => option.value > selectedStartTime);
    }, [selectedStartTime, timeOptions]);

    const handleConfirmDelete = async () => {
        if (!pendingDelete) return;

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
        const reservationStart = reservation.start.format("HH:mm");
        const reservationEnd = reservation.end.format("HH:mm");

        // If current values fall outside allowed bounds, clamp to the first valid option
        const boundedStartTime = timeOptions.some((option) => option.value === reservationStart)
            ? reservationStart
            : (timeOptions[0]?.value ?? "");

        const boundedEndTimeOptions = timeOptions.filter((option) => option.value > boundedStartTime);
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
        return reservations.some((res) => {
            if (!pendingEdit || res.id === pendingEdit.id) {
                return false;
            }
            return editedRange.start.isBefore(res.end) && res.start.isBefore(editedRange.end);
        });
    }, [editedRange, reservations, pendingEdit]);

    const handleSaveEdit = async () => {
        if (!pendingEdit || !selectedStartTime || !selectedEndTime) return;

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
        editHasConflict;

    const dayEventMap: Map<string, { dayLabel: string; events: Reservation[] }> = new Map();

    reservations.forEach((r) => {
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
        .map(([dayKey, { dayLabel, events }]) => ({ dayKey, dayLabel, events }));

    return (
        <>
            <Toast message={successMessage} />

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

            {pendingEdit !== null &&
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

                                            if (selectedEndTime && selectedEndTime <= nextStartTime) {
                                                setSelectedEndTime("");
                                            }
                                        }}
                                        className="rounded-md border px-3 py-2 font-normal"
                                    >
                                        <option value="">Select start time</option>
                                        {timeOptions.map((option) => (
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
                                        onChange={(e) => setSelectedEndTime(e.target.value)}
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

            <section className="mx-5 md:mx-30">
                {loading && <Spinner />}

                {!loading &&
                    dayEventArr.map(({ dayKey, dayLabel, events }) => (
                        <div
                            key={dayKey}
                            className="flex flex-col bg-calendar-bg border-calendar-border shadow-md p-5 space-y-5 items-center"
                        >
                            <h2 className="text-2xl font-medium ml-5 mr-auto">{dayLabel}</h2>

                            {events.map((e) => (
                                <ReservationCard
                                    key={e.id}
                                    startTime={e.start.format("h:mm A")}
                                    endTime={e.end.format("h:mm A")}
                                    name={e.name}
                                    id={e.id}
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
}: {
    startTime: string;
    endTime: string;
    name: string;
    id: number;
    onRequestEdit: () => void;
    onRequestDelete: (id: number, name: string) => void;
}) {
    return (
        <div className="flex w-full justify-between items-center border shadow-md rounded-md bg-orange-400 px-2 max-w-[80%]">
            <div className="flex flex-col md:flex-row space-x-1">
                <p>{startTime} -</p>
                <p>{endTime}</p>
            </div>

            <p>{name}</p>

            <div className="flex flex-col p-2 space-y-6">
                <button
                    type="button"
                    className="hover:cursor-pointer"
                    title="Edit Reservation"
                    onClick={onRequestEdit}
                >
                    <SquarePen />
                </button>
                <button
                    type="button"
                    className="hover:cursor-pointer"
                    title="Delete Reservation"
                    onClick={() => onRequestDelete(id, name)}
                >
                    <Trash2 />
                </button>
            </div>
        </div>
    );
}
