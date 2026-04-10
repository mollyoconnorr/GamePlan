import {useEffect, useState} from "react";
import {useNavigate} from "react-router-dom";
import Button from "../components/Button.tsx";
import Toast from "../components/Toast.tsx";
import {safeBack} from "../util/Navigation.ts";
import {getEquipmentTypes, updateEquipmentType} from "../api/Equipment.ts";
import {getEquipmentReservations} from "../api/Reservations.ts";
import type {EquipmentDTO, EquipmentType} from "../api/Equipment.ts";

type EquipmentTypeAttributeDraft = {
    id: string;
    name: string;
    options: string;
};

const createAttributeDraftId = () =>
    `attr-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const parseFieldSchemaToDrafts = (fieldSchema?: string | null): EquipmentTypeAttributeDraft[] => {
    if (!fieldSchema || !fieldSchema.trim()) {
        return [];
    }

    try {
        const parsed = JSON.parse(fieldSchema) as Record<string, unknown>;
        if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
            return [];
        }

        return Object.entries(parsed)
            .map(([name, config]) => {
                let options: string[] = [];

                if (config && typeof config === "object" && !Array.isArray(config)) {
                    const maybeOptions = (config as {options?: unknown}).options;
                    if (Array.isArray(maybeOptions)) {
                        options = maybeOptions
                            .map((option) => `${option}`.trim())
                            .filter((option) => option.length > 0);
                    }
                }

                return {
                    id: createAttributeDraftId(),
                    name,
                    options: options.join(", "),
                };
            })
            .filter((attribute) => attribute.name.trim().length > 0);
    } catch {
        return [];
    }
};

const buildFieldSchema = (attributes: EquipmentTypeAttributeDraft[]) => {
    const schema: Record<string, { type: "enum"; options: string[] }> = {};

    attributes.forEach((attribute) => {
        const trimmedName = attribute.name.trim();
        if (!trimmedName) return;

        schema[trimmedName] = {
            type: "enum",
            options: attribute.options
                .split(",")
                .map((option) => option.trim())
                .filter((option) => option.length > 0),
        };
    });

    return JSON.stringify(schema);
};

export default function EquipmentTypes() {
    const navigate = useNavigate();
    const [types, setTypes] = useState<EquipmentType[]>([]);
    const [toastMessage, setToastMessage] = useState("");
    const [deletingType, setDeletingType] = useState<EquipmentType | null>(null);
    const [confirmInput, setConfirmInput] = useState("");
    const [pendingDeleteReservationCount, setPendingDeleteReservationCount] = useState(0);
    const [preparingDeleteTypeId, setPreparingDeleteTypeId] = useState<number | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [editingType, setEditingType] = useState<EquipmentType | null>(null);
    const [formName, setFormName] = useState("");
    const [formColor, setFormColor] = useState("");
    const [formAttributes, setFormAttributes] = useState<EquipmentTypeAttributeDraft[]>([]);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (!toastMessage) return;
        const timeout = setTimeout(() => setToastMessage(""), 2500);
        return () => clearTimeout(timeout);
    }, [toastMessage]);

    const loadTypes = async () => {
        try {
            const data = await getEquipmentTypes();
            setTypes(data);
        } catch (error) {
            console.error(error);
        }
    };

    useEffect(() => {
        loadTypes();
    }, []);

    const loadActiveReservationCountForType = async (typeId: number) => {
        const equipmentResponse = await fetch("/api/equipment", {credentials: "include"});
        if (!equipmentResponse.ok) {
            throw new Error("Failed to load equipment for type deletion.");
        }

        const allEquipment = await equipmentResponse.json() as EquipmentDTO[];
        const matchingEquipment = allEquipment.filter((equipment) => equipment.typeId === typeId);

        if (matchingEquipment.length === 0) {
            return 0;
        }

        const reservationLists = await Promise.all(
            matchingEquipment.map((equipment) => getEquipmentReservations(equipment.id))
        );

        return reservationLists.reduce((total, reservations) => total + reservations.length, 0);
    };

    const handleDeleteType = async (type: EquipmentType) => {
        setPreparingDeleteTypeId(type.id);
        try {
            const reservationCount = await loadActiveReservationCountForType(type.id);
            setPendingDeleteReservationCount(reservationCount);
            setDeletingType(type);
            setConfirmInput("");
        } catch (error) {
            console.error(error);
            setToastMessage("Failed to verify active reservations.");
        } finally {
            setPreparingDeleteTypeId(null);
        }
    };

    const deleteReservationSuffix = pendingDeleteReservationCount === 1 ? "" : "s";

    const cancelDelete = () => {
        setDeletingType(null);
        setConfirmInput("");
        setPendingDeleteReservationCount(0);
    };

    const confirmDelete = async () => {
        if (!deletingType) return;
        if (confirmInput.trim().toLowerCase() !== "confirm") {
            setToastMessage("Type 'confirm' to proceed with deletion.");
            return;
        }

        setIsDeleting(true);
        try {
            const response = await fetch(
                `/api/equipment-types/${deletingType.id}?force=true&confirm=confirm`,
                {
                    method: "DELETE",
                    credentials: "include",
                }
            );

            if (response.ok) {
                await loadTypes();
                const canceledMessage = pendingDeleteReservationCount > 0
                    ? ` ${pendingDeleteReservationCount} reservation${deleteReservationSuffix} canceled.`
                    : "";
                setToastMessage(`Type deleted along with its equipment.${canceledMessage}`);
                cancelDelete();
            } else {
                setToastMessage("Failed to delete equipment type.");
            }
        } catch (error) {
            console.error(error);
            setToastMessage("Error deleting equipment type.");
        } finally {
            setIsDeleting(false);
        }
    };

    const startEdit = (type: EquipmentType) => {
        setEditingType(type);
        setFormName(type.name);
        setFormColor(type.color ?? "");
        setFormAttributes(parseFieldSchemaToDrafts(type.fieldSchema));
    };

    const cancelEdit = () => {
        setEditingType(null);
        setFormName("");
        setFormColor("");
        setFormAttributes([]);
    };

    const addFormAttribute = () => {
        setFormAttributes((prev) => [
            ...prev,
            {id: createAttributeDraftId(), name: "", options: ""},
        ]);
    };

    const updateFormAttribute = (id: string, field: "name" | "options", value: string) => {
        setFormAttributes((prev) =>
            prev.map((attribute) =>
                attribute.id === id ? {...attribute, [field]: value} : attribute
            )
        );
    };

    const removeFormAttribute = (id: string) => {
        setFormAttributes((prev) => prev.filter((attribute) => attribute.id !== id));
    };

    const saveEdit = async () => {
        if (!editingType) return;
        setIsSaving(true);
        const nextFieldSchema = buildFieldSchema(formAttributes);
        try {
            await updateEquipmentType(editingType.id, {
                name: formName.trim(),
                color: formColor.trim() || undefined,
                fieldSchema: nextFieldSchema,
            });
            setToastMessage("Equipment type updated.");
            await loadTypes();
            cancelEdit();
        } catch (error) {
            console.error(error);
            setToastMessage("Failed to update equipment type.");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <>
            <Toast message={toastMessage} />
            <Button
                text="Back"
                className="bg-gray-300 hover:bg-gray-200 mb-7 sm:mb-2"
                onClick={() => safeBack(navigate)}
            />
            <section className="mx-5 md:mx-30 space-y-10">
                <h1 className="text-2xl font-bold mb-6">Equipment Types</h1>

                {types.length === 0 ? (
                    <p>No equipment types found.</p>
                ) : (
                    <div className="space-y-4">
                        {types.map((type) => {
                            const typeAttributes = parseFieldSchemaToDrafts(type.fieldSchema);

                            return (
                                <div key={type.id} className="border p-4 rounded shadow">
                                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                                    <div>
                                        <h2 className="text-lg font-semibold">
                                            {type.name}
                                        </h2>
                                        {type.color && (
                                            <div className="mt-1 flex items-center gap-2 text-sm">
                                                <span
                                                    className="inline-block w-4 h-4 rounded-full"
                                                    style={{backgroundColor: type.color}}
                                                />
                                                {type.color}
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        <Button
                                            text="Edit"
                                            className="border border-gray-300 bg-white text-gray-800 hover:bg-gray-50"
                                            onClick={() => startEdit(type)}
                                        />
                                        <Button
                                            text={preparingDeleteTypeId === type.id ? "Checking..." : "Delete"}
                                            className="bg-red-500 hover:bg-red-700 text-white px-2 py-1"
                                            onClick={() => void handleDeleteType(type)}
                                            disabled={preparingDeleteTypeId === type.id}
                                        />
                                    </div>
                                </div>

                                <div className="mt-3 rounded bg-gray-50 p-3">
                                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                                        Attributes
                                    </p>
                                    {typeAttributes.length === 0 ? (
                                        <p className="mt-1 text-sm text-gray-500">No attributes defined.</p>
                                    ) : (
                                        <div className="mt-2 space-y-2">
                                            {typeAttributes.map((attribute, index) => (
                                                <div
                                                    key={`${type.id}-${attribute.name}-${index}`}
                                                    className="grid gap-1 rounded border border-gray-200 bg-white px-3 py-2 text-sm md:grid-cols-[170px_1fr]"
                                                >
                                                    <span className="font-semibold text-gray-700">
                                                        {attribute.name}
                                                    </span>
                                                    <span className="text-gray-600">
                                                        {attribute.options || "No options"}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                            );
                        })}
                    </div>
                )}
            </section>

            {deletingType && (
                <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/30 p-4">
                    <div className="max-w-md w-full rounded bg-white p-6 shadow-lg">
                        <h3 className="text-lg font-semibold">
                            Delete {deletingType.name}?
                        </h3>
                        <p className="mt-2 text-sm text-gray-700">
                            Deleting an equipment type will also remove every piece of equipment
                            tied to it and cancel <strong>{pendingDeleteReservationCount}</strong> active reservation
                            {deleteReservationSuffix}. Type <strong>confirm</strong> below to proceed.
                        </p>
                        <input
                            className="mt-4 w-full rounded border px-3 py-2 text-sm"
                            placeholder="Type confirm to delete"
                            value={confirmInput}
                            onChange={(event) => setConfirmInput(event.target.value)}
                        />
                        <div className="mt-4 flex justify-end gap-3">
                            <Button
                                text="Cancel"
                                className="bg-gray-200 hover:bg-gray-100"
                                onClick={cancelDelete}
                            />
                            <Button
                                text={isDeleting ? "Deleting…" : "Delete Type"}
                                className={`text-white ${isDeleting ? "bg-gray-400" : "bg-red-500 hover:bg-red-600"}`}
                                onClick={confirmDelete}
                                disabled={isDeleting}
                            />
                        </div>
                    </div>
                </div>
            )}

            {editingType && (
                <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/30 p-4">
                    <div className="max-w-lg w-full rounded bg-white p-6 shadow-lg space-y-4">
                        <h3 className="text-lg font-semibold">
                            Edit {editingType.name}
                        </h3>
                        <label className="text-sm font-medium text-gray-700">
                            Name
                            <input
                                className="mt-1 w-full rounded border px-3 py-2 text-sm"
                                value={formName}
                                onChange={(event) => setFormName(event.target.value)}
                            />
                        </label>
                        <label className="text-sm font-medium text-gray-700">
                            Color
                            <div className="mt-2 flex flex-wrap items-center gap-3">
                                <input
                                    type="color"
                                    value={formColor || "#000000"}
                                    onChange={(event) => setFormColor(event.target.value)}
                                    className="h-10 w-14 cursor-pointer rounded-sm border border-gray-300 bg-white p-0"
                                />
                                <input
                                    type="text"
                                    value={formColor}
                                    placeholder="#abc123"
                                    onChange={(event) => setFormColor(event.target.value)}
                                    className="w-32 rounded border border-gray-300 px-3 py-2 text-xs"
                                />
                            </div>
                            <p className="mt-1 text-xs text-gray-500">
                                Pick any color or enter a hex value (e.g., #F87171) to keep the UI consistent.
                                Current selection: {formColor || "None"}.
                            </p>
                        </label>
                        <div className="text-sm font-medium text-gray-700">
                            <div className="flex items-center justify-between">
                                <span>Attributes</span>
                                <Button
                                    text="+ Add Attribute"
                                    className="border-gray-300 bg-gray-200 px-3 py-1 text-sm hover:bg-gray-300"
                                    onClick={addFormAttribute}
                                />
                            </div>
                            <div className="mt-2 space-y-3">
                                {formAttributes.length === 0 && (
                                    <p className="text-sm text-gray-500">No attributes added yet.</p>
                                )}
                                {formAttributes.map((attribute, index) => (
                                    <div
                                        key={attribute.id}
                                        className="grid gap-3 rounded border border-gray-200 p-3 md:grid-cols-[1fr_1fr_auto]"
                                    >
                                        <div>
                                            <label
                                                htmlFor={`edit-attr-name-${attribute.id}`}
                                                className="mb-1 block text-xs font-semibold text-gray-600"
                                            >
                                                Attribute name
                                            </label>
                                            <input
                                                id={`edit-attr-name-${attribute.id}`}
                                                className="w-full rounded border px-3 py-2 text-sm"
                                                placeholder={`Attribute ${index + 1}`}
                                                value={attribute.name}
                                                onChange={(event) =>
                                                    updateFormAttribute(attribute.id, "name", event.target.value)
                                                }
                                            />
                                        </div>
                                        <div>
                                            <label
                                                htmlFor={`edit-attr-options-${attribute.id}`}
                                                className="mb-1 block text-xs font-semibold text-gray-600"
                                            >
                                                Options (comma separated)
                                            </label>
                                            <input
                                                id={`edit-attr-options-${attribute.id}`}
                                                className="w-full rounded border px-3 py-2 text-sm"
                                                placeholder="Small, Medium, Large"
                                                value={attribute.options}
                                                onChange={(event) =>
                                                    updateFormAttribute(attribute.id, "options", event.target.value)
                                                }
                                            />
                                        </div>
                                        <div className="self-end">
                                            <button
                                                type="button"
                                                onClick={() => removeFormAttribute(attribute.id)}
                                                className="rounded border border-red-200 px-3 py-2 text-sm text-red-600 hover:cursor-pointer hover:bg-red-50"
                                            >
                                                Remove
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="flex justify-end gap-3">
                            <Button
                                text="Cancel"
                                className="bg-gray-200 hover:bg-gray-100"
                                onClick={cancelEdit}
                            />
                            <Button
                                text={isSaving ? "Saving…" : "Save changes"}
                                className={`text-white ${isSaving ? "bg-gray-400" : "bg-primary hover:bg-primary-hover"}`}
                                onClick={saveEdit}
                                disabled={isSaving}
                            />
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
