import {useEffect, useMemo, useState, type FormEvent} from "react";
import {useNavigate, useParams} from "react-router-dom";
import Button from "../components/Button.tsx";
import Toast from "../components/Toast.tsx";
import {safeBack} from "../util/Navigation.ts";
import {getEquipment, getEquipmentTypes, updateEquipment, updateEquipmentStatus, deleteEquipment} from "../api/Equipment.ts";
import type {EquipmentType, EquipmentDTO, EquipmentUpdateRequest} from "../api/Equipment.ts";

type AttributeRow = {
    id: string;
    name: string;
    value: string;
};

const statusOptions = [
    {value: "AVAILABLE", label: "Available"},
    {value: "MAINTENANCE", label: "Maintenance"},
];

export default function EditEquipment() {
    const {equipmentId} = useParams<{equipmentId: string}>();
    const navigate = useNavigate();

    const [equipment, setEquipment] = useState<EquipmentDTO | null>(null);
    const [types, setTypes] = useState<EquipmentType[]>([]);
    const [name, setName] = useState("");
    const [selectedTypeId, setSelectedTypeId] = useState<number | null>(null);
    const [attributes, setAttributes] = useState<AttributeRow[]>([]);
    const [status, setStatus] = useState<string>("AVAILABLE");
    const [loading, setLoading] = useState<boolean>(true);
    const [saving, setSaving] = useState(false);
    const [statusUpdating, setStatusUpdating] = useState(false);
    const [toastMessage, setToastMessage] = useState("");

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

    useEffect(() => {
        if (!equipmentId) return;
        setLoading(true);
        void getEquipment(Number(equipmentId))
            .then((data) => {
                setEquipment(data);
                setName(data.name);
                setSelectedTypeId(data.typeId ?? null);
                setStatus(data.status ?? "AVAILABLE");
                setAttributes(mapAttributes(data.attributes));
            })
            .catch((error) => {
                console.error(error);
                setToastMessage("Failed to load equipment details.");
            })
            .finally(() => setLoading(false));
    }, [equipmentId]);

    const mapAttributes = (rows?: EquipmentDTO["attributes"]) =>
        (rows ?? []).map((attr) => ({
            id: `${attr.name}-${attr.value}-${Math.random().toString(36).slice(2, 8)}`,
            name: attr.name,
            value: attr.value,
        }));

    const addAttributeRow = () => {
        setAttributes((prev) => [
            ...prev,
            {id: `new-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, name: "", value: ""},
        ]);
    };

    const updateAttributeRow = (id: string, field: "name" | "value", value: string) => {
        setAttributes((prev) =>
            prev.map((row) => (row.id === id ? {...row, [field]: value} : row))
        );
    };

    const removeAttributeRow = (id: string) => {
        setAttributes((prev) => prev.filter((row) => row.id !== id));
    };

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
            setAttributes(mapAttributes(updated.attributes));
            setToastMessage("Equipment saved.");
        } catch (error) {
            console.error(error);
            setToastMessage("Failed to save equipment.");
        } finally {
            setSaving(false);
        }
    };

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

    const handleDelete = async () => {
        if (!equipmentId) return;
        if (!window.confirm("Are you sure you want to delete this equipment?")) return;

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

    return (
        <>
            <Toast message={toastMessage} />
            <div className="flex items-center justify-between mb-6">
                <div className="flex gap-2">
                    <Button text="Back" className="bg-gray-200 hover:bg-gray-100" onClick={() => safeBack(navigate)} />
                    <Button text="Delete" className="bg-red-500 hover:bg-red-400 text-white" onClick={handleDelete} />
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
                                onChange={(event) => setSelectedTypeId(event.target.value ? Number(event.target.value) : null)}
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
                            <button
                                type="button"
                                onClick={addAttributeRow}
                                className="text-sm text-primary underline"
                            >
                                Add attribute
                            </button>
                        </div>
                        <div className="space-y-2">
                            {attributes.map((row) => (
                                <div key={row.id} className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
                                    <input
                                        className="rounded border px-3 py-2 text-sm"
                                        placeholder="Attribute name"
                                        value={row.name}
                                        onChange={(event) => updateAttributeRow(row.id, "name", event.target.value)}
                                    />
                                    <input
                                        className="rounded border px-3 py-2 text-sm"
                                        placeholder="Value"
                                        value={row.value}
                                        onChange={(event) => updateAttributeRow(row.id, "value", event.target.value)}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => removeAttributeRow(row.id)}
                                        className="text-sm text-red-500"
                                    >
                                        Remove
                                    </button>
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
        </>
    );
}
