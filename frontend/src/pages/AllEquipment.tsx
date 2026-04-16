import {useEffect, useState} from "react";
import {safeBack} from "../util/Navigation.ts";
import Button from "../components/Button.tsx";
import {useNavigate} from "react-router-dom";
import type {EquipmentDTO, EquipmentTypeAttributeResponse} from "../api/Equipment.ts";
import {getEquipmentTypeAttributes, updateEquipmentStatus} from "../api/Equipment.ts";
import {getEquipmentReservations} from "../api/Reservations.ts";
import ConfirmDialog from "../components/ConfirmDialog.tsx";
import Toast from "../components/Toast.tsx";
import {dispatchReservationDataChanged} from "../util/AppDataEvents.ts";

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

type PendingDeleteChange = {
    equipmentId: number;
    equipmentName: string;
    canceledReservations: number;
};

type TypeAttributeDefinition = {
    name: string;
    options: string[];
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
    const [deleteBusyId, setDeleteBusyId] = useState<number | null>(null);
    const [toastMessage, setToastMessage] = useState("");
    const [pendingMaintenanceChange, setPendingMaintenanceChange] = useState<PendingMaintenanceChange | null>(null);
    const [pendingDeleteChange, setPendingDeleteChange] = useState<PendingDeleteChange | null>(null);
    const [typeAttributesByTypeId, setTypeAttributesByTypeId] = useState<Record<number, TypeAttributeDefinition[]>>({});

    useEffect(() => {
        if (!toastMessage) return;
        const timeout = setTimeout(() => setToastMessage(""), 2500);
        return () => clearTimeout(timeout);
    }, [toastMessage]);

    const handleDelete = async (id: number, canceledReservations = 0) => {
        setDeleteBusyId(id);
        try {
            const response = await fetch(`/api/equipment/${id}`, {
                method: "DELETE",
                credentials: "include",
            });

            if (response.ok) {
                // Remove from state so table updates immediately
                setEquipmentList((prev) => prev.filter((eq) => eq.id !== id));
                const suffix = canceledReservations === 1 ? "" : "s";
                const canceledMessage = canceledReservations > 0
                    ? ` ${canceledReservations} reservation${suffix} canceled.`
                    : "";
                setToastMessage(`Equipment deleted.${canceledMessage}`);
                if (canceledReservations > 0) {
                    dispatchReservationDataChanged("canceled");
                }
            } else {
                setToastMessage("Failed to delete equipment");
            }
        } catch (error) {
            console.error(error);
            setToastMessage("Error deleting equipment");
        } finally {
            setDeleteBusyId(null);
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
            if (canceledReservations > 0) {
                dispatchReservationDataChanged("canceled");
            }
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

    const handleOpenDeleteChange = async (equipment: EquipmentDTO) => {
        setDeleteBusyId(equipment.id);
        try {
            const activeReservations = await getEquipmentReservations(equipment.id);
            setPendingDeleteChange({
                equipmentId: equipment.id,
                equipmentName: equipment.name,
                canceledReservations: activeReservations.length,
            });
        } catch (error) {
            console.error("Failed to fetch equipment reservations:", error);
            setToastMessage("Failed to verify active reservations.");
        } finally {
            setDeleteBusyId(null);
        }
    };

    const handleConfirmDeleteChange = async () => {
        if (!pendingDeleteChange) return;

        const {equipmentId, canceledReservations} = pendingDeleteChange;
        try {
            await handleDelete(equipmentId, canceledReservations);
        } finally {
            setPendingDeleteChange(null);
        }
    };

    const pendingReservationLabel = pendingMaintenanceChange?.canceledReservations === 1
        ? "reservation"
        : "reservations";
    const pendingDeleteReservationLabel = pendingDeleteChange?.canceledReservations === 1
        ? "reservation"
        : "reservations";

    const parseTypeAttributes = (rows: EquipmentTypeAttributeResponse[]): TypeAttributeDefinition[] => {
        const grouped = new Map<string, Set<string>>();

        rows.forEach((row) => {
            if (!grouped.has(row.name)) {
                grouped.set(row.name, new Set<string>());
            }

            const options = Array.isArray(row.options)
                ? row.options
                : Array.isArray(row.value)
                    ? row.value
                    : typeof row.value === "string"
                        ? [row.value]
                        : [];

            options.forEach((option) => {
                const trimmedOption = option.trim();
                if (!trimmedOption) return;
                grouped.get(row.name)?.add(trimmedOption);
            });
        });

        return Array.from(grouped.entries()).map(([name, options]) => ({
            name,
            options: Array.from(options),
        }));
    };

    const loadTypeAttributeDefinitions = async (equipment: EquipmentDTO[]) => {
        const typeIds = Array.from(
            new Set(
                equipment
                    .map((item) => item.typeId)
                    .filter((typeId): typeId is number => typeof typeId === "number")
            )
        );

        if (typeIds.length === 0) {
            setTypeAttributesByTypeId({});
            return;
        }

        const definitionEntries = await Promise.allSettled(
            typeIds.map(async (typeId) => {
                const attributes = await getEquipmentTypeAttributes(typeId);
                return [typeId, parseTypeAttributes(attributes)] as const;
            })
        );

        const nextMap: Record<number, TypeAttributeDefinition[]> = {};
        let hasLoadFailure = false;
        definitionEntries.forEach((entry) => {
            if (entry.status === "fulfilled") {
                const [typeId, definitions] = entry.value;
                nextMap[typeId] = definitions;
            } else {
                hasLoadFailure = true;
            }
        });

        if (hasLoadFailure) {
            setToastMessage("Some attribute definitions failed to load.");
        }

        setTypeAttributesByTypeId(nextMap);
    };

    const formatEquipmentAttributes = (equipment: EquipmentDTO) => {
        const persistedValueMap = new Map(
            (equipment.attributes ?? []).map((attribute) => [attribute.name, attribute.value])
        );

        const typeAttributes = equipment.typeId
            ? (typeAttributesByTypeId[equipment.typeId] ?? [])
            : [];

        if (typeAttributes.length > 0) {
            return typeAttributes.map((typeAttribute) => {
                const persistedValue = persistedValueMap.get(typeAttribute.name);
                const fallbackValue = typeAttribute.options[0] ?? "";
                const displayValue = persistedValue?.trim() || fallbackValue || "Not set";
                return `${typeAttribute.name}: ${displayValue}`;
            }).join(", ");
        }

        if (equipment.attributes && equipment.attributes.length > 0) {
            return equipment.attributes.map((attribute) => `${attribute.name}: ${attribute.value}`).join(", ");
        }

        return "No attributes";
    };

    useEffect(() => {
        let cancelled = false;

        const loadEquipment = async () => {
            try {
                const response = await fetch("/api/equipment", { credentials: "include" });
                const data = await response.json() as EquipmentDTO[];
                if (cancelled) return;
                setEquipmentList(data);
                await loadTypeAttributeDefinitions(data);
            } catch (err) {
                console.error("Failed to fetch equipment:", err);
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        };

        void loadEquipment();
        return () => {
            cancelled = true;
        };
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

            <ConfirmDialog
                open={pendingDeleteChange !== null}
                title="Delete equipment?"
                message={pendingDeleteChange
                    ? pendingDeleteChange.canceledReservations === 0 ? `Are you sure you want to delete ${pendingDeleteChange.equipmentName}?` :
                        `Deleting ${pendingDeleteChange.equipmentName} will cancel ${pendingDeleteChange.canceledReservations} active ${pendingDeleteReservationLabel}. Continue?`
                    : ""}
                confirmText="Delete"
                cancelText="Cancel"
                loading={pendingDeleteChange !== null && deleteBusyId === pendingDeleteChange.equipmentId}
                onCancel={() => setPendingDeleteChange(null)}
                onConfirm={() => void handleConfirmDeleteChange()}
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
                                        {formatEquipmentAttributes(eq)}
                                    </td>
                                    <td className="border px-4 py-2">
                                        <div className="flex gap-2">
                                            <Button
                                                text="Edit"
                                                className="bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded"
                                                onClick={() => navigate(`/app/equipment/${eq.id}/edit`)}
                                            />
                                            <button
                                                onClick={() => void handleOpenDeleteChange(eq)}
                                                disabled={deleteBusyId === eq.id}
                                                className="bg-red-500 hover:bg-red-700 hover:cursor-pointer disabled:cursor-not-allowed disabled:opacity-60 text-white px-2 py-1 rounded"
                                            >
                                                {deleteBusyId === eq.id ? "Checking..." : "Delete"}
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
