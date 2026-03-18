import {useEffect, useState} from "react";
import type {CalendarEvent, PendingDelete} from "../../types.ts";
import {Trash2} from "lucide-react";
import Toast from "../Toast.tsx";
import ConfirmDialog from "../ConfirmDialog.tsx";

type CalendarCardProps = {
    event: CalendarEvent;
    startIndex: number;
    endIndex: number;
    groupStartIndex: number;
    cellHeight: number;
    cardMargin: number;
    onDeleteReservation?: (id: number) => Promise<void> | void;
};

export default function CalendarCard({
                                         event,
                                         startIndex,
                                         endIndex,
                                         groupStartIndex,
                                         cellHeight,
                                         cardMargin,
                                         onDeleteReservation,
                                     }: CalendarCardProps) {
    const [showPopup, setShowPopup] = useState(false);

    const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [toastMessage, setToastMessage] = useState("");

    useEffect(() => {
        if (!toastMessage) return;
        const timeout = setTimeout(() => setToastMessage(""), 2500);
        return () => clearTimeout(timeout);
    }, [toastMessage]);

    const handleConfirmDelete = async () => {
        if (!pendingDelete) return;

        try {
            setIsDeleting(true);
            if (onDeleteReservation){
                await onDeleteReservation(pendingDelete.id);
                setToastMessage(`Deleted reservation for ${pendingDelete.name}.`);
                setPendingDelete(null);
                setShowPopup(false);
            } else {
                setToastMessage(`Failed to delete reservation for ${pendingDelete.name}.`);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <>
            <Toast message={toastMessage} />

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

            <button
                type="button"
                onClick={() => setShowPopup(true)}
                className="relative border border-black w-full break-all p-1 text-left text-xs lg:text-md bg-blue-900 text-white hover:cursor-pointer hover:bg-blue-800"
                style={{
                    top: cellHeight * (startIndex - groupStartIndex),
                    height: cellHeight * (endIndex - startIndex) - cardMargin * 2,
                    marginTop: cardMargin,
                }}
            >
                {event.name}
            </button>

            {showPopup && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
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
                        </div>

                        <div className="mt-4 flex justify-between">
                            <button
                                className="hover:cursor-pointer"
                                title="Delete Reservation"
                                onClick={() => setPendingDelete({ id: event.id, name: event.name })}
                            >
                                <Trash2 />
                            </button>

                            <button
                                type="button"
                                onClick={() => setShowPopup(false)}
                                className="rounded bg-blue-900 px-3 py-1 text-white hover:cursor-pointer hover:bg-blue-800"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}