import {useEffect, useMemo, useState, type FormEvent} from "react";
import {useNavigate, useParams} from "react-router-dom";
import Button from "../components/Button.tsx";
import ConfirmDialog from "../components/ConfirmDialog.tsx";
import Toast from "../components/Toast.tsx";
import {safeBack} from "../util/Navigation.ts";
import {
    deleteEquipment,
    getEquipment,
    getEquipmentTypeAttributes,
    getEquipmentTypes,
    updateEquipment,
    updateEquipmentStatus,
} from "../api/Equipment.ts";
import type {
    EquipmentDTO,
    EquipmentType,
    EquipmentTypeAttributeResponse,
    EquipmentUpdateRequest,
} from "../api/Equipment.ts";

/**
 * Editable equipment attribute row paired with the attribute definitions for the selected type.
 */
type AttributeRow = {
    id: string;
    name: string;
    value: string;
    options: string[];
};

const statusOptions = [
    {value: "AVAILABLE", label: "Available"},
    {value: "MAINTENANCE", label: "Maintenance"},
];

/**
 * Renders the EditEquipment view.
 */
export default function EditEquipment() {
    const {equipmentId} = useParams<{equipmentId: string}>();
    const navigate = useNavigate();

    const [, setEquipment] = useState<EquipmentDTO | null>(null);
    const [types, setTypes] = useState<EquipmentType[]>([]);
    const [name, setName] = useState("");
    const [selectedTypeId, setSelectedTypeId] = useState<number | null>(null);
    const [attributes, setAttributes] = useState<AttributeRow[]>([]);
    const [status, setStatus] = useState<string>("AVAILABLE");
    const [loading, setLoading] = useState<boolean>(true);
    const [saving, setSaving] = useState(false);
    const [statusUpdating, setStatusUpdating] = useState(false);
    const [toastMessage, setToastMessage] = useState("");
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    const selectedType = useMemo(
        () => types.find((type) => type.id === selectedTypeId) ?? null,
        [types, selectedTypeId]
    );

    useEffect(() => {
        if (!toastMessage) return;
        const timeout = setTimeout(() => setToastMessage(""), 2500);
        return () => clearTimeout(timeout);
    }, [toastMessage]);

    useEffect(() => {
        void getEquipmentTypes()
            .then((data) => setTypes(data))
            .catch((error) => {
                console.error(error);
                setToastMessage("Failed to load equipment types.");
            });
    }, []);

    /**
     * Maps map attributes to record into the structure used by the form state.
     */
    const mapAttributesToRecord = (rows?: EquipmentDTO["attributes"]) =>
        (rows ?? []).reduce<Record<string, string>>((acc, row) => {
            const trimmedName = row.name?.trim();
            if (!trimmedName) {
                return acc;
            }
            acc[trimmedName] = row.value;
            return acc;
        }, {});

    /**
     * Parses input into TypeAttributes.
     */
    const parseTypeAttributes = (rows: EquipmentTypeAttributeResponse[]) => {
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

    const buildAttributeRows = (
        typeAttributes: {name: string; options: string[]}[],
        currentValues: Record<string, string>
    ): AttributeRow[] => {
        return typeAttributes.map((typeAttribute) => {
            const currentValue = currentValues[typeAttribute.name] ?? "";
            const hasCurrentInOptions = typeAttribute.options.includes(currentValue);
            const defaultValue = typeAttribute.options[0] ?? "";
            const value = typeAttribute.options.length === 0
                ? currentValue
                : (hasCurrentInOptions ? currentValue : defaultValue);

            return {
                id: typeAttribute.name,
                name: typeAttribute.name,
                value,
                options: typeAttribute.options,
            };
        });
    };

    /**
     * Loads attribute definitions for the selected type and merges existing equipment values into editable rows.
     */
    const loadTypeAttributeRows = async (typeId: number, currentValues: Record<string, string>) => {
        try {
            const typeAttributeData = await getEquipmentTypeAttributes(typeId);
            const parsedTypeAttributes = parseTypeAttributes(typeAttributeData);
            setAttributes(buildAttributeRows(parsedTypeAttributes, currentValues));
        } catch (error) {
            console.error(error);
            setAttributes([]);
            setToastMessage("Failed to load attributes.");
        }
    };

    useEffect(() => {
        if (!equipmentId) return;
        setLoading(true);
        void getEquipment(Number(equipmentId))
            .then(async (data) => {
                setEquipment(data);
                setName(data.name);
                setSelectedTypeId(data.typeId ?? null);
                setStatus(data.status ?? "AVAILABLE");

                if (data.typeId) {
                    await loadTypeAttributeRows(data.typeId, mapAttributesToRecord(data.attributes));
                } else {
                    setAttributes([]);
                }
            })
            .catch((error) => {
                console.error(error);
                setToastMessage("Failed to load equipment details.");
            })
            .finally(() => setLoading(false));
    }, [equipmentId]);

    /**
     * Updates one editable dynamic attribute value in local form state.
     */
    const updateAttributeValue = (id: string, value: string) => {
        setAttributes((prev) =>
            prev.map((row) => (row.id === id ? {...row, value} : row))
        );
    };

    /**
     * Saves name, type, and dynamic attributes together so backend validation sees one coherent equipment update.
     */
    const handleSave = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!equipmentId || !selectedTypeId || !name.trim()) {
            setToastMessage("Please provide a name and type.");
            return;
        }

        const payload: EquipmentUpdateRequest = {
            name: name.trim(),
            equipmentTypeId: selectedTypeId,
            attributes: attributes.reduce<Record<string, string>>((acc, row) => {
                const trimmedName = row.name.trim();
                if (!trimmedName) return acc;
                acc[trimmedName] = row.value;
                return acc;
            }, {}),
        };

        setSaving(true);
        try {
            const updated = await updateEquipment(Number(equipmentId), payload);
            setEquipment(updated);
            setName(updated.name);
            setSelectedTypeId(updated.typeId ?? null);
            if (updated.typeId) {
                await loadTypeAttributeRows(updated.typeId, mapAttributesToRecord(updated.attributes));
            } else {
                setAttributes([]);
            }
            setToastMessage("Equipment saved.");
        } catch (error) {
            console.error(error);
            setToastMessage("Failed to save equipment.");
        } finally {
            setSaving(false);
        }
    };

    /**
     * Updates maintenance/availability status and keeps the local equipment snapshot in sync.
     */
    const handleStatusChange = async (nextStatus: string) => {
        if (!equipmentId) return;
        setStatusUpdating(true);
        try {
            const response = await updateEquipmentStatus(Number(equipmentId), nextStatus);
            setStatus(response.equipment.status ?? nextStatus);
            setEquipment(response.equipment);
            setToastMessage("Status updated.");
        } catch (error) {
            console.error(error);
            setToastMessage("Failed to update status.");
        } finally {
            setStatusUpdating(false);
        }
    };

    /**
     * Deletes the current equipment item and returns to the inventory list on success.
     */
    const handleDelete = async () => {
        if (!equipmentId) return;

        try {
            await deleteEquipment(Number(equipmentId));
            navigate("/app/allEquipment");
        } catch (error) {
            console.error(error);
            setToastMessage("Failed to delete equipment.");
        }
    };

    if (!equipmentId) {
        return <p>Equipment not found.</p>;
    }

    /**
     * Rebuilds attribute rows when the equipment type changes because schemas are type-specific.
     */
    const handleTypeChange = async (nextTypeId: number | null) => {
        setSelectedTypeId(nextTypeId);
        if (!nextTypeId) {
            setAttributes([]);
            return;
        }
        await loadTypeAttributeRows(nextTypeId, {});
    };

    return (
        <>
            <Toast message={toastMessage} />
            <div className="flex items-center justify-between mb-6">
                <div className="flex gap-2">
                    <Button
                        text="Back"
                        className="bg-gray-300 hover:bg-gray-200 mb-7 md:mb-2"
                        onClick={() => safeBack(navigate)}
                    />
                    <Button
                        text="Delete"
                        className="bg-red-500 hover:bg-red-400 text-white mb-7 md:mb-2"
                        onClick={() => setShowDeleteConfirm(true)} />
                </div>
                <div className="flex items-center gap-2">
                    <label className="text-sm font-semibold">Status</label>
                    <select
                        value={status}
                        onChange={(event) => void handleStatusChange(event.target.value)}
                        disabled={statusUpdating}
                        className="rounded border px-2 py-1 text-sm"
                    >
                        {statusOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {loading ? (
                <p>Loading equipment...</p>
            ) : (
                <form onSubmit={handleSave} className="space-y-6">
                    <div className="space-y-2">
                        <label className="block text-sm font-semibold text-gray-700">Name</label>
                        <input
                            className="w-full rounded border px-3 py-2 text-sm"
                            value={name}
                            onChange={(event) => setName(event.target.value)}
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="block text-sm font-semibold text-gray-700">Equipment Type</label>
                        <div className="flex items-center gap-3">
                            <select
                                value={selectedTypeId ?? ""}
                                onChange={(event) =>
                                    void handleTypeChange(event.target.value ? Number(event.target.value) : null)
                                }
                                className="rounded border px-3 py-2 text-sm"
                            >
                                <option value="">Select a type</option>
                                {types.map((type) => (
                                    <option key={type.id} value={type.id}>
                                        {type.name}
                                    </option>
                                ))}
                            </select>
                            {selectedType && selectedType.color && (
                                <span
                                    className="w-5 h-5 rounded-full border"
                                    style={{backgroundColor: selectedType.color}}
                                    aria-label={`Color for ${selectedType.name}`}
                                />
                            )}
                        </div>
                    </div>

                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-semibold text-gray-700">Attributes</span>
                        </div>
                        <div className="space-y-2">
                            {attributes.length === 0 && (
                                <p className="text-sm text-gray-500">No attributes configured for this type.</p>
                            )}
                            {attributes.map((row) => (
                                <div key={row.id} className="grid gap-2 sm:grid-cols-[1fr_1fr]">
                                    <input
                                        className="rounded border bg-gray-100 px-3 py-2 text-sm text-gray-700"
                                        value={row.name}
                                        readOnly
                                    />
                                    <select
                                        className="rounded border px-3 py-2 text-sm"
                                        value={row.value}
                                        onChange={(event) => updateAttributeValue(row.id, event.target.value)}
                                        disabled={row.options.length === 0}
                                    >
                                        {row.options.length === 0 ? (
                                            <option value="">
                                                No options configured
                                            </option>
                                        ) : (
                                            row.options.map((option) => (
                                                <option key={`${row.id}-${option}`} value={option}>
                                                    {option}
                                                </option>
                                            ))
                                        )}
                                    </select>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div>
                        <Button
                            text={saving ? "Saving…" : "Save equipment"}
                            className="bg-primary text-white w-full"
                            disabled={saving}
                        />
                    </div>
                </form>
            )}

            <ConfirmDialog
                open={showDeleteConfirm}
                title="Delete this equipment?"
                description="This will permanently remove the equipment record."
                confirmLabel="Delete"
                cancelLabel="Keep equipment"
                tone="danger"
                onCancel={() => setShowDeleteConfirm(false)}
                onConfirm={async () => {
                    setShowDeleteConfirm(false);
                    await handleDelete();
                }}
            />
        </>
    );
}
