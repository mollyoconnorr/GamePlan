import {useEffect, useState} from "react";
import {safeBack} from "../util/Navigation.ts";
import Button from "../components/Button.tsx";
import {useNavigate} from "react-router-dom";
import type {EquipmentDTO} from "../api/Equipment.ts";
import {updateEquipmentStatus} from "../api/Equipment.ts";
import {getEquipmentReservations} from "../api/Reservations.ts";
import ConfirmDialog from "../components/ConfirmDialog.tsx";
import Toast from "../components/Toast.tsx";

type StatusOption = {
    value: string;
    label: string;
    disabled?: boolean;
};

type PendingMaintenanceChange = {
    equipmentId: number;
    equipmentName: string;
    nextStatus: string;
    canceledReservations: number;
};

const equipmentStatusOptions: StatusOption[] = [
    { value: "AVAILABLE", label: "Available" },
    { value: "MAINTENANCE", label: "Maintenance" }
];

export default function AllEquipment() {
    const navigate = useNavigate();
    const [equipmentList, setEquipmentList] = useState<EquipmentDTO[]>([]);
    const [loading, setLoading] = useState(true);
    const [statusUpdatingId, setStatusUpdatingId] = useState<number | null>(null);
    const [toastMessage, setToastMessage] = useState("");
    const [pendingMaintenanceChange, setPendingMaintenanceChange] = useState<PendingMaintenanceChange | null>(null);

    useEffect(() => {
        if (!toastMessage) return;
        const timeout = setTimeout(() => setToastMessage(""), 2500);
        return () => clearTimeout(timeout);
    }, [toastMessage]);

    const handleDelete = async (id: number) => {
        try {
            const response = await fetch(`/api/equipment/${id}`, {
                method: "DELETE",
                credentials: "include",
            });

            if (response.ok) {
                // Remove from state so table updates immediately
                setEquipmentList((prev) => prev.filter((eq) => eq.id !== id));
            } else {
                setToastMessage("Failed to delete equipment");
            }
        } catch (error) {
            console.error(error);
            setToastMessage("Error deleting equipment");
        }
    };

    const handleStatusChange = async (id: number, nextStatus: string) => {
        setStatusUpdatingId(id);
        try {
            const updated = await updateEquipmentStatus(id, nextStatus);
            setEquipmentList((prev) =>
                prev.map((eq) => (eq.id === updated.equipment.id ? updated.equipment : eq))
            );
            const canceledReservations = updated.canceledReservations ?? 0;
            const suffix = canceledReservations === 1 ? "" : "s";
            const canceledMessage = canceledReservations > 0
                ? ` ${canceledReservations} reservation${suffix} canceled.`
                : "";
            setToastMessage(`Status updated.${canceledMessage}`);
        } catch (error) {
            console.error("Failed to update equipment status:", error);
            setToastMessage("Failed to update equipment status");
        } finally {
            setStatusUpdatingId(null);
        }
    };

    const handleSelectStatusChange = async (equipment: EquipmentDTO, nextStatus: string) => {
        const currentStatus = equipment.status ?? "AVAILABLE";
        if (currentStatus === nextStatus) {
            return;
        }

        const isAvailableToMaintenance = currentStatus === "AVAILABLE" && nextStatus === "MAINTENANCE";
        if (!isAvailableToMaintenance) {
            await handleStatusChange(equipment.id, nextStatus);
            return;
        }

        setStatusUpdatingId(equipment.id);
        try {
            const activeReservations = await getEquipmentReservations(equipment.id);
            const canceledReservations = activeReservations.length;

            if (canceledReservations > 0) {
                setPendingMaintenanceChange({
                    equipmentId: equipment.id,
                    equipmentName: equipment.name,
                    nextStatus,
                    canceledReservations,
                });
                return;
            }
        } catch (error) {
            console.error("Failed to fetch equipment reservations:", error);
            setToastMessage("Failed to verify active reservations.");
            return;
        } finally {
            setStatusUpdatingId(null);
        }

        await handleStatusChange(equipment.id, nextStatus);
    };

    const handleConfirmMaintenanceChange = async () => {
        if (!pendingMaintenanceChange) return;
        const {equipmentId, nextStatus} = pendingMaintenanceChange;
        try {
            await handleStatusChange(equipmentId, nextStatus);
        } finally {
            setPendingMaintenanceChange(null);
        }
    };

    const pendingReservationLabel = pendingMaintenanceChange?.canceledReservations === 1
        ? "reservation"
        : "reservations";

    useEffect(() => {
        fetch("/api/equipment", { credentials: "include" })
            .then((res) => res.json())
            .then((data) => {
                setEquipmentList(data);
                setLoading(false);
            })
            .catch((err) => {
                console.error("Failed to fetch equipment:", err);
                setLoading(false);
            });
    }, []);

    if (loading) return <p>Loading equipment...</p>;

    return (
        <>
            <Toast message={toastMessage} />

            <ConfirmDialog
                open={pendingMaintenanceChange !== null}
                title="Move equipment to maintenance?"
                message={pendingMaintenanceChange
                    ? `Changing ${pendingMaintenanceChange.equipmentName} to maintenance will cancel ${pendingMaintenanceChange.canceledReservations} active ${pendingReservationLabel}. Continue?`
                    : ""}
                confirmText="Change status"
                cancelText="Cancel"
                loading={pendingMaintenanceChange !== null && statusUpdatingId === pendingMaintenanceChange.equipmentId}
                onCancel={() => setPendingMaintenanceChange(null)}
                onConfirm={() => void handleConfirmMaintenanceChange()}
            />

            <Button
                text="Back"
                className="bg-gray-300 hover:bg-gray-200 mb-7 sm:mb-2"
                onClick={() => safeBack(navigate)}
            />
            <section className="mx-5 md:mx-30 space-y-10">
                <h1 className="text-2xl font-bold mb-4">All Equipment</h1>
                {equipmentList.length === 0 ? (
                    <p>No equipment found.</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="border-collapse border border-gray-400 w-full">
                            <thead>
                            <tr className="bg-gray-200">
                                <th className="border px-4 py-2">ID</th>
                                <th className="border px-4 py-2">Name</th>
                                <th className="border px-4 py-2">Type</th>
                                <th className="border px-4 py-2">Status</th>
                                <th className="border px-4 py-2">Attributes</th>
                                <th className="border px-4 py-2">Actions</th>
                            </tr>
                            </thead>
                            <tbody>
                            {equipmentList.map((eq) => (
                                <tr key={eq.id} className="hover:bg-gray-100">
                                    <td className="border px-4 py-2">{eq.id}</td>
                                    <td className="border px-4 py-2">{eq.name}</td>
                                    <td className="border px-4 py-2">{eq.typeName ?? "No type"}</td>
                                    {/* safe */}
                                    <td className="border px-4 py-2">
                                        <select
                                            value={eq.status ?? "AVAILABLE"}
                                            onChange={(event) => void handleSelectStatusChange(eq, event.target.value)}
                                            disabled={statusUpdatingId === eq.id}
                                            className="w-full rounded border px-2 py-1 text-sm"
                                        >
                                            {equipmentStatusOptions.map((statusOption) => (
                                                <option
                                                    key={statusOption.value}
                                                    value={statusOption.value}
                                                    disabled={statusOption.disabled}
                                                >
                                                    {statusOption.label}
                                                </option>
                                            ))}
                                        </select>
                                    </td>
                                    <td className="border px-4 py-2">
                                        {eq.attributes && eq.attributes.length > 0
                                            ? eq.attributes.map((attr) => `${attr.name}: ${attr.value}`).join(", ")
                                            : 'No attributes'}
                                    </td>
                                    <td className="border px-4 py-2">
                                        <div className="flex gap-2">
                                            <Button
                                                text="Edit"
                                                className="bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded"
                                                onClick={() => navigate(`/app/equipment/${eq.id}/edit`)}
                                            />
                                            <button
                                                onClick={() => handleDelete(eq.id)}
                                                className="bg-red-500 hover:bg-red-700 text-white px-2 py-1 rounded"
                                            >
                                                Delete
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            </tbody>

                        </table>
                    </div>
                )}
            </section>
        </>
    );
}
