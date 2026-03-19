import {useMemo, useState} from "react";
import type {Dayjs} from "dayjs";
import type {CalendarEvent, PendingDelete} from "../../types.ts";
import {SquarePen, Trash2} from "lucide-react";
import ConfirmDialog from "../ConfirmDialog.tsx";
import {createPortal} from "react-dom";

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
        const eventStart = timeOptions.find((option) => option.label === event.startTime)?.value ?? "";
        const eventEnd = timeOptions.find((option) => option.label === event.endTime)?.value ?? "";

        const boundedStartTime = eventStart || (timeOptions[0]?.value ?? "");
        const boundedEndTimeOptions = timeOptions.filter((option) => option.value > boundedStartTime);
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
            onShowToast?.(`Failed to update reservation for ${event.name}.`);
        } finally {
            setIsEditing(false);
        }
    };

    const editSaveDisabled =
        isEditing || !selectedStartTime || !selectedEndTime || selectedEndTime <= selectedStartTime;

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

            <button
                type="button"
                onClick={() => setShowPopup(true)}
                className={`relative border w-full break-all p-1 text-left text-xs lg:text-md text-white hover:cursor-pointer
                    ${event.temp
                    ? "bg-blue-500/60 border-dashed border-blue-900 hover:bg-blue-500/80"
                    : "bg-blue-900 border-black hover:bg-blue-800"
                    //TODO: Change to given color and lighter version of it.
                }`}
                style={{
                    top: cellHeight * (startIndex - groupStartIndex),
                    height: cellHeight * (endIndex - startIndex) - cardMargin * 2,
                    marginTop: cardMargin,
                }}
            >
                {event.name}
            </button>

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
                            {"date" in event && <p><span className="font-semibold">Date:</span> {String(event.date)}</p>}
                            {"startTime" in event && <p><span className="font-semibold">Start:</span> {String(event.startTime)}</p>}
                            {"endTime" in event && <p><span className="font-semibold">End:</span> {String(event.endTime)}</p>}
                            {"description" in event && (
                                <p>
                                    <span className="font-semibold">Description:</span> {String(event.description)}
                                </p>
                            )}
                            {"temp" in event && <p className="text-red-600"><strong>Pending reservation</strong></p>}
                        </div>

                        <div className="mt-4 flex justify-between">
                            {variant !== "equip" ? (
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
