import {useEffect, useState} from "react";
import {useNavigate} from "react-router-dom";
import Button from "../components/Button.tsx";
import Toast from "../components/Toast.tsx";
import {safeBack} from "../util/Navigation.ts";
import {getEquipmentTypes, updateEquipmentType} from "../api/Equipment.ts";
import type {EquipmentType} from "../api/Equipment.ts";

export default function EquipmentTypes() {
    const navigate = useNavigate();
    const [types, setTypes] = useState<EquipmentType[]>([]);
    const [toastMessage, setToastMessage] = useState("");
    const [deletingType, setDeletingType] = useState<EquipmentType | null>(null);
    const [confirmInput, setConfirmInput] = useState("");
    const [isDeleting, setIsDeleting] = useState(false);
    const [editingType, setEditingType] = useState<EquipmentType | null>(null);
    const [formName, setFormName] = useState("");
    const [formColor, setFormColor] = useState("");
    const [formSchema, setFormSchema] = useState("");
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

    const handleDeleteType = (type: EquipmentType) => {
        setDeletingType(type);
        setConfirmInput("");
    };

    const cancelDelete = () => {
        setDeletingType(null);
        setConfirmInput("");
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
                setToastMessage("Type deleted along with its equipment.");
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
        setFormSchema(type.fieldSchema ?? "");
    };

    const cancelEdit = () => {
        setEditingType(null);
        setFormName("");
        setFormColor("");
        setFormSchema("");
    };

    const saveEdit = async () => {
        if (!editingType) return;
        setIsSaving(true);
        try {
            await updateEquipmentType(editingType.id, {
                name: formName.trim(),
                color: formColor.trim() || undefined,
                fieldSchema: formSchema.trim() || undefined,
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
                className="bg-gray-300 hover:bg-gray-200"
                onClick={() => safeBack(navigate)}
            />
            <section className="mx-5 md:mx-30 space-y-10">
                <h1 className="text-2xl font-bold mb-6">Equipment Types</h1>

                {types.length === 0 ? (
                    <p>No equipment types found.</p>
                ) : (
                    <div className="space-y-4">
                        {types.map((type) => (
                            <div
                                key={type.id}
                                className="border p-4 rounded shadow"
                            >
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
                                            text="Delete"
                                            className="bg-red-500 hover:bg-red-700 text-white px-2 py-1"
                                            onClick={() => handleDeleteType(type)}
                                        />
                                    </div>
                                </div>

                                {/* Raw schema display */}
                                <pre className="mt-2 text-sm bg-gray-100 p-2 rounded">
                                    {type.fieldSchema || "No schema defined."}
                                </pre>
                            </div>
                        ))}
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
                            and reservation tied to it. Type <strong>confirm</strong> below to
                            proceed.
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
                        <label className="text-sm font-medium text-gray-700">
                            Field schema (JSON)
                            <textarea
                                className="mt-1 w-full rounded border px-3 py-2 text-sm"
                                rows={4}
                                value={formSchema}
                                onChange={(event) => setFormSchema(event.target.value)}
                            />
                        </label>
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
