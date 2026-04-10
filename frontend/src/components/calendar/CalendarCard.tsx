import {useMemo, useState} from "react";
import dayjs from "dayjs";
import type {Dayjs} from "dayjs";
import type {CalendarEvent, PendingDelete} from "../../types.ts";
import {SquarePen, Trash2} from "lucide-react";
import ConfirmDialog from "../ConfirmDialog.tsx";
import {createPortal} from "react-dom";
import {getFriendlyReservationErrorMessage} from "../../util/ReservationErrorMessages.ts";
import {buildTimeOptions, filterPastTimesForDate} from "../../util/TimeOptions.ts";

type CalendarCardProps = {
    event: CalendarEvent;
    eventDay: Dayjs;
    startTime: Dayjs;
    endTime: Dayjs;
    timeStepMin: number;
    startIndex: number;
    endIndex: number;
    groupStartIndex: number;
    cellHeight: number;
    cardMargin: number;
    onEditReservation?: (id: number, start: Dayjs, end: Dayjs) => Promise<void> | void;
    onDeleteReservation?: (id: number) => Promise<void> | void;
    onShowToast?: (message: string) => void;
    variant: "user" | "equip" | "trainer"
};

export default function CalendarCard({
                                         event,
                                         eventDay,
                                         startTime,
                                         endTime,
                                         timeStepMin,
                                         startIndex,
                                         endIndex,
                                         groupStartIndex,
                                         cellHeight,
                                         cardMargin,
                                         onEditReservation,
                                         onDeleteReservation,
                                         onShowToast,
                                         variant
                                     }: CalendarCardProps) {
    const [showPopup, setShowPopup] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);

    const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [selectedStartTime, setSelectedStartTime] = useState("");
    const [selectedEndTime, setSelectedEndTime] = useState("");

    const timeOptions = useMemo(() => {
        return buildTimeOptions(startTime, endTime, timeStepMin);
    }, [startTime, endTime, timeStepMin]);

    const startTimeOptions = useMemo(() => {
        return filterPastTimesForDate(timeOptions, eventDay);
    }, [timeOptions, eventDay]);

    const endTimeOptions = useMemo(() => {
        if (!selectedStartTime) return [];
        return startTimeOptions.filter((option) => option.value > selectedStartTime);
    }, [selectedStartTime, startTimeOptions]);

    const handleConfirmDelete = async () => {
        if (!pendingDelete) return;

        try {
            setIsDeleting(true);
            if (onDeleteReservation){
                await onDeleteReservation(pendingDelete.id);
                onShowToast?.(`Deleted reservation for ${pendingDelete.name}.`);
                setPendingDelete(null);
                setShowPopup(false);
            } else {
                onShowToast?.(`Failed to delete reservation for ${pendingDelete.name}.`);
            }
        } catch (err) {
            console.error(err);
            onShowToast?.(`Failed to delete reservation for ${pendingDelete.name}.`);
        } finally {
            setIsDeleting(false);
        }
    };

    const handleOpenEdit = () => {
        const eventStart = startTimeOptions.find((option) => option.label === event.startTime)?.value ?? "";
        const eventEnd = startTimeOptions.find((option) => option.label === event.endTime)?.value ?? "";

        const boundedStartTime = eventStart || (startTimeOptions[0]?.value ?? "");
        const boundedEndTimeOptions = startTimeOptions.filter((option) => option.value > boundedStartTime);
        const boundedEndTime = boundedEndTimeOptions.some((option) => option.value === eventEnd)
            ? eventEnd
            : (boundedEndTimeOptions[0]?.value ?? "");

        setSelectedStartTime(boundedStartTime);
        setSelectedEndTime(boundedEndTime);
        setShowEditModal(true);
    };

    const handleCloseEdit = () => {
        if (isEditing) return;
        setShowEditModal(false);
        setSelectedStartTime("");
        setSelectedEndTime("");
    };

    const handleSaveEdit = async () => {
        if (!selectedStartTime || !selectedEndTime) return;

        if (!onEditReservation) {
            onShowToast?.(`Failed to update reservation for ${event.name}.`);
            return;
        }

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

        const updatedStart = eventDay
            .hour(startHour)
            .minute(startMinute)
            .second(0)
            .millisecond(0);

        const updatedEnd = eventDay
            .hour(endHour)
            .minute(endMinute)
            .second(0)
            .millisecond(0);

        if (updatedStart.isBefore(dayjs())) {
            onShowToast?.("Start time must be now or later.");
            return;
        }

        try {
            setIsEditing(true);
            await onEditReservation(event.id, updatedStart, updatedEnd);
            onShowToast?.(`Updated reservation time for ${event.name}.`);
            setShowEditModal(false);
            setShowPopup(false);
            setSelectedStartTime("");
            setSelectedEndTime("");
        } catch (err) {
            console.error(err);
            const rawMessage = err instanceof Error ? err.message : `Failed to update reservation for ${event.name}.`;
            onShowToast?.(getFriendlyReservationErrorMessage(rawMessage));
        } finally {
            setIsEditing(false);
        }
    };

    const selectedStartDateTime = useMemo(() => {
        if (!selectedStartTime) {
            return null;
        }

        const [startHour, startMinute] = selectedStartTime.split(":").map((value) => Number(value));
        if (Number.isNaN(startHour) || Number.isNaN(startMinute)) {
            return null;
        }

        return eventDay
            .hour(startHour)
            .minute(startMinute)
            .second(0)
            .millisecond(0);
    }, [selectedStartTime, eventDay]);

    const editStartIsPast = selectedStartDateTime ? selectedStartDateTime.isBefore(dayjs()) : false;

    const editSaveDisabled =
        isEditing || !selectedStartTime || !selectedEndTime || selectedEndTime <= selectedStartTime || editStartIsPast;

    return (
        <>
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

            {showEditModal && typeof document !== "undefined" && createPortal(
                <div
                    className="fixed inset-0 z-[300] flex items-center justify-center bg-black/40 px-4"
                    onClick={handleCloseEdit}
                >
                    <div
                        className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h2 className="text-xl font-semibold">Edit reservation time</h2>
                        <p className="mt-1 text-sm text-gray-700">{event.name}</p>
                        <p className="mt-1 text-sm text-gray-700">{eventDay.format("dddd, MMMM D")}</p>

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

                        {editStartIsPast && (
                            <p className="mt-3 text-sm text-red-600">
                                Start time must be now or later.
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

            {(() => {
                const baseBackground = event.color ?? "#1d4ed8";
                const computedBackground = event.conflict ? "#dc2626" : baseBackground;
                const borderColor = event.borderColor ?? (event.conflict ? "#991b1b" : "black");
                const textColor = event.textColor ?? "#ffffff";

                return (
                    <button
                        type="button"
                        onClick={() => setShowPopup(true)}
                        className="relative border w-full break-all p-1 text-left text-xs lg:text-md hover:cursor-pointer transition duration-150 ease-in-out"
                        style={{
                            top: cellHeight * (startIndex - groupStartIndex),
                            height: cellHeight * (endIndex - startIndex) - cardMargin * 2,
                            marginTop: cardMargin,
                            backgroundColor: computedBackground,
                            borderColor,
                            color: textColor,
                        }}
                    >
                        {event.name}
                    </button>
                );
            })()}

            {showPopup && typeof document !== "undefined" && createPortal(
                <div
                    className="fixed inset-0 z-[250] flex items-center justify-center bg-black/50"
                    onClick={() => setShowPopup(false)}
                >
                    <div
                        className="w-[90%] max-w-md rounded-lg bg-white p-4 shadow-lg"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="mb-4 flex items-start justify-between">
                            <h2 className="text-lg font-bold">{event.name}</h2>
                            <button
                                type="button"
                                onClick={() => setShowPopup(false)}
                                className="ml-4 text-sm font-semibold hover:cursor-pointer"
                            >
                                X
                            </button>
                        </div>

                        <div className="space-y-2 text-sm text-black">
                            {event.date && <p><span className="font-semibold">Date:</span> {String(event.date)}</p>}
                            {event.startTime && <p><span className="font-semibold">Start:</span> {String(event.startTime)}</p>}
                            {event.endTime && <p><span className="font-semibold">End:</span> {String(event.endTime)}</p>}
                            {event.description && (
                                <p>
                                    <span className="font-semibold">Reserved by:</span> {String(event.description)}
                                </p>
                            )}
                            {event.temp && <p className="text-red-600"><strong>Pending reservation</strong></p>}
                        </div>

                        <div className="mt-4 flex justify-between">
                            {variant === "trainer" ? (
                                event.temp ? (
                                    // Pending preview blocks are not persisted and cannot be deleted.
                                    <div />
                                ) : (
                                    <button
                                        type="button"
                                        className="rounded bg-red-600 px-3 py-1 text-sm font-semibold text-white hover:bg-red-500 hover:cursor-pointer"
                                        onClick={() => setPendingDelete({ id: event.id, name: event.name })}
                                    >
                                        Cancel reservation
                                    </button>
                                )
                            ) : variant !== "equip" ? (
                                event.isBlock ? (
                                    // Home trainer/admin calendar should display blocks as read-only.
                                    <div />
                                ) : (
                                    <div className="flex items-center gap-3">
                                        <button
                                            type="button"
                                            className="hover:cursor-pointer"
                                            title="Edit Reservation"
                                            onClick={handleOpenEdit}
                                        >
                                            <SquarePen />
                                        </button>

                                        <button
                                            type="button"
                                            className="hover:cursor-pointer"
                                            title="Delete Reservation"
                                            onClick={() => setPendingDelete({id: event.id, name: event.name})}
                                        >
                                            <Trash2 />
                                        </button>
                                    </div>
                                )
                            ) : <div />}

                            <button
                                type="button"
                                onClick={() => setShowPopup(false)}
                                className="rounded bg-blue-900 px-3 py-1 text-white hover:cursor-pointer hover:bg-blue-800"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </>
    );
}
