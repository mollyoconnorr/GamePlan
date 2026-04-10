import {useEffect, useMemo, useState} from "react";
import {useNavigate} from "react-router-dom";
import Button from "../components/Button.tsx";
import {safeBack} from "../util/Navigation.ts";
import Toast from "../components/Toast.tsx";
import ConfirmDialog from "../components/ConfirmDialog.tsx";
import {
    createEquipment as createEquipmentRequest,
    createEquipmentType as createEquipmentTypeRequest,
    getEquipmentTypeAttributes,
    getEquipmentTypes,
    type EquipmentType,
    type EquipmentTypeAttributeResponse,
} from "../api/Equipment.ts";

type EquipmentTypeAttributeDraft = {
    id: string;
    name: string;
    options: string;
};

type EquipmentTypeAttribute = {
    name: string;
    options: string[];
};

type SelectedAttribute = {
    name: string;
    value: string;
};

type PendingAction = "createType" | "createEquipment";

const inputClassName = "w-full rounded-sm border border-gray-300 px-3 py-2 text-sm";
const labelClassName = "mb-1 block text-sm font-semibold text-gray-700";

export default function CreateEquipment() {
    const navigate = useNavigate();
    const [types, setTypes] = useState<EquipmentType[]>([]);
    const [typeName, setTypeName] = useState("");
    const [typeColor, setTypeColor] = useState("#000000");
    const [attributesSchema, setAttributesSchema] = useState<EquipmentTypeAttributeDraft[]>([]);

    const [selectedTypeId, setSelectedTypeId] = useState<number | null>(null);
    const [equipmentName, setEquipmentName] = useState("");
    const [attributes, setAttributes] = useState<EquipmentTypeAttribute[]>([]);
    const [selectedAttribute, setSelectedAttribute] = useState<SelectedAttribute | null>(null);
    const [toastMessage, setToastMessage] = useState("");
    const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const selectedType = useMemo(
        () => types.find((type) => type.id === selectedTypeId) ?? null,
        [selectedTypeId, types]
    );

    useEffect(() => {
        if (!toastMessage) return;
        const timeout = setTimeout(() => setToastMessage(""), 2500);
        return () => clearTimeout(timeout);
    }, [toastMessage]);

    const addAttribute = () => {
        const draftId = `attr-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        setAttributesSchema((prev) => [...prev, {id: draftId, name: "", options: ""}]);
    };

    const updateAttributeDraft = (
        index: number,
        field: keyof EquipmentTypeAttributeDraft,
        value: string
    ) => {
        setAttributesSchema((prev) =>
            prev.map((attr, i) => (i === index ? {...attr, [field]: value} : attr))
        );
    };

    const buildSchema = () => {
        const schema: Record<string, { type: "enum"; options: string[] }> = {};

        attributesSchema.forEach((attr) => {
            const trimmedName = attr.name.trim();
            if (!trimmedName) return;

            schema[trimmedName] = {
                type: "enum",
                options: attr.options
                    .split(",")
                    .map((option) => option.trim())
                    .filter((option) => option.length > 0),
            };
        });

        return JSON.stringify(schema);
    };

    const parseAttributes = (data: EquipmentTypeAttributeResponse[]): EquipmentTypeAttribute[] => {
        const groupedOptions = new Map<string, Set<string>>();

        data.forEach((attr) => {
            const options = Array.isArray(attr.options)
                ? attr.options
                : Array.isArray(attr.value)
                    ? attr.value
                    : typeof attr.value === "string"
                        ? [attr.value]
                        : [];

            if (!groupedOptions.has(attr.name)) {
                groupedOptions.set(attr.name, new Set<string>());
            }

            const optionSet = groupedOptions.get(attr.name);
            if (!optionSet) return;

            options.forEach((option) => {
                const trimmedOption = option.trim();
                if (trimmedOption) {
                    optionSet.add(trimmedOption);
                }
            });
        });

        return Array.from(groupedOptions.entries()).map(([name, optionSet]) => ({
            name,
            options: Array.from(optionSet),
        }));
    };

    const loadTypes = async () => {
        try {
            const data = await getEquipmentTypes();
            setTypes(data);
        } catch (error) {
            console.error(error);
            setToastMessage("Failed to load equipment types.");
        }
    };

    useEffect(() => {
        void getEquipmentTypes()
            .then((data) => setTypes(data))
            .catch((error) => {
                console.error(error);
                setToastMessage("Failed to load equipment types.");
            });
    }, []);

    const createEquipmentType = async () => {
        const trimmedName = typeName.trim();
        if (!trimmedName) return false;

        try {
            await createEquipmentTypeRequest({
                name: trimmedName,
                fieldSchema: buildSchema(),
                color: typeColor,
            });
            await loadTypes();
            setTypeName("");
            setTypeColor("#000000");
            setAttributesSchema([]);
            setToastMessage("Equipment type created.");
            return true;
        } catch (error) {
            console.error(error);
            setToastMessage("Failed to create equipment type.");
            return false;
        }
    };

    const handleTypeChange = async (typeIdValue: string) => {
        if (!typeIdValue) {
            setSelectedTypeId(null);
            setSelectedAttribute(null);
            setAttributes([]);
            return;
        }

        const typeId = Number(typeIdValue);
        if (Number.isNaN(typeId)) return;

        setSelectedTypeId(typeId);
        setSelectedAttribute(null);
        setAttributes([]);

        try {
            const data = await getEquipmentTypeAttributes(typeId);
            setAttributes(parseAttributes(data));
        } catch (error) {
            console.error(error);
            setAttributes([]);
            setToastMessage("Failed to load attributes.");
        }
    };

    const handleAttributeChange = (selectedValue: string) => {
        if (!selectedValue) {
            setSelectedAttribute(null);
            return;
        }

        try {
            const parsed = JSON.parse(selectedValue) as SelectedAttribute;
            if (!parsed.name || !parsed.value) {
                setSelectedAttribute(null);
                return;
            }
            setSelectedAttribute(parsed);
        } catch (error) {
            console.error("Invalid selected attribute payload:", error);
            setSelectedAttribute(null);
        }
    };

    const createEquipment = async () => {
        if (!selectedType || !equipmentName.trim()) return false;

        const attrMap = selectedAttribute
            ? {[selectedAttribute.name]: selectedAttribute.value}
            : {};

        try {
            await createEquipmentRequest({
                name: equipmentName.trim(),
                equipmentTypeId: selectedType.id,
                attributes: attrMap,
            });

            setEquipmentName("");
            setSelectedTypeId(null);
            setAttributes([]);
            setSelectedAttribute(null);
            setToastMessage("Equipment created.");
            return true;
        } catch (error) {
            console.error(error);
            setToastMessage("Failed to create equipment.");
            return false;
        }
    };

    const openCreateTypeConfirm = () => {
        if (!typeName.trim()) {
            setToastMessage("Enter a type name first.");
            return;
        }
        setPendingAction("createType");
    };

    const openCreateEquipmentConfirm = () => {
        if (!selectedType || !equipmentName.trim()) {
            setToastMessage("Select a type and enter equipment name first.");
            return;
        }
        setPendingAction("createEquipment");
    };

    const handleConfirmAction = async () => {
        if (!pendingAction) return;

        setIsSubmitting(true);
        try {
            if (pendingAction === "createType") {
                await createEquipmentType();
            } else {
                await createEquipment();
            }
        } finally {
            setIsSubmitting(false);
            setPendingAction(null);
        }
    };

    const confirmDialogTitle = pendingAction === "createType"
        ? "Create equipment type?"
        : "Create equipment?";

    const confirmDialogMessage = pendingAction === "createType"
        ? `Create equipment type "${typeName.trim()}"?`
        : `Create equipment "${equipmentName.trim()}"${selectedType ? ` in ${selectedType.name}` : ""}?`;

    return (
        <>
            <Toast message={toastMessage} />

            <ConfirmDialog
                open={pendingAction !== null}
                title={confirmDialogTitle}
                message={confirmDialogMessage}
                confirmText="Create"
                cancelText="Cancel"
                loading={isSubmitting}
                onCancel={() => setPendingAction(null)}
                onConfirm={handleConfirmAction}
            />

            <Button
                text="Back"
                className="bg-gray-300 hover:bg-gray-200 mb-7 sm:mb-2"
                onClick={() => safeBack(navigate)}
            />
            <section className="mx-5 md:mx-30 space-y-10">
                <h1 className="text-3xl font-bold text-gray-900">Manage Equipment</h1>

                <div className="max-w-4xl rounded-md border bg-white p-6 shadow-md space-y-5">
                    <h2 className="text-xl font-semibold text-gray-900">Create Equipment Type</h2>

                    <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
                        <div>
                            <label htmlFor="type-name" className={labelClassName}>Type name</label>
                            <input
                                id="type-name"
                                placeholder="Ex: Ice Bath"
                                value={typeName}
                                onChange={(e) => setTypeName(e.target.value)}
                                className={inputClassName}
                            />
                        </div>

                        <div>
                            <label htmlFor="type-color" className={labelClassName}>Type color</label>
                            <input
                                id="type-color"
                                type="color"
                                value={typeColor}
                                onChange={(e) => setTypeColor(e.target.value)}
                                className="h-10 w-16 rounded-sm border border-gray-300 bg-white p-1"
                            />
                        </div>
                    </div>

                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-semibold text-gray-700">Attributes</p>
                            <Button
                                text="+ Add Attribute"
                                className="border-gray-300 bg-gray-200 px-3 py-1 text-sm hover:bg-gray-300"
                                onClick={addAttribute}
                            />
                        </div>

                        {attributesSchema.length === 0 && (
                            <p className="text-sm text-gray-500">No attributes added yet.</p>
                        )}

                        {attributesSchema.map((attr, index) => (
                            <div key={attr.id} className="grid gap-3 md:grid-cols-2">
                                <div>
                                    <label htmlFor={`attr-name-${index}`} className={labelClassName}>
                                        Attribute name
                                    </label>
                                    <input
                                        id={`attr-name-${index}`}
                                        placeholder="Ex: Size"
                                        value={attr.name}
                                        onChange={(e) => updateAttributeDraft(index, "name", e.target.value)}
                                        className={inputClassName}
                                    />
                                </div>

                                <div>
                                    <label htmlFor={`attr-options-${index}`} className={labelClassName}>
                                        Options (comma separated)
                                    </label>
                                    <input
                                        id={`attr-options-${index}`}
                                        placeholder="Ex: Small, Medium, Large"
                                        value={attr.options}
                                        onChange={(e) => updateAttributeDraft(index, "options", e.target.value)}
                                        className={inputClassName}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>

                    <Button
                        text="Create Type"
                        className="bg-primary text-white hover:bg-primary-hover border-black px-4 py-2"
                        onClick={openCreateTypeConfirm}
                    />
                </div>

                <div className="max-w-4xl rounded-md border bg-white p-6 shadow-md space-y-5">
                    <h2 className="text-xl font-semibold text-gray-900">Create Equipment</h2>

                    <div className="grid gap-4 md:grid-cols-2">
                        <div>
                            <label htmlFor="equipment-type" className={labelClassName}>Equipment type</label>
                            <select
                                id="equipment-type"
                                className={inputClassName}
                                value={selectedTypeId?.toString() ?? ""}
                                onChange={(e) => void handleTypeChange(e.target.value)}
                            >
                                <option value="">Select type</option>
                                {types.map((type) => (
                                    <option key={type.id} value={type.id}>
                                        {type.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label htmlFor="equipment-name" className={labelClassName}>Equipment name</label>
                            <input
                                id="equipment-name"
                                placeholder="Ex: Ice Bath 1"
                                value={equipmentName}
                                onChange={(e) => setEquipmentName(e.target.value)}
                                className={inputClassName}
                            />
                        </div>
                    </div>

                    {attributes.length > 0 && (
                        <div>
                            <label htmlFor="equipment-attribute" className={labelClassName}>Attribute</label>
                            <select
                                id="equipment-attribute"
                                value={selectedAttribute ? JSON.stringify(selectedAttribute) : ""}
                                onChange={(e) => handleAttributeChange(e.target.value)}
                                className={inputClassName}
                            >
                                <option value="">Select attribute</option>
                                {attributes.map((attr) =>
                                    attr.options.map((option) => {
                                        const optionValue = JSON.stringify({
                                            name: attr.name,
                                            value: option,
                                        });

                                        return (
                                            <option key={`${attr.name}-${option}`} value={optionValue}>
                                                {attr.name}: {option}
                                            </option>
                                        );
                                    })
                                )}
                            </select>
                        </div>
                    )}

                    <Button
                        text="Create Equipment"
                        className="bg-green-400 hover:bg-green-300 border-green-500 px-4 py-2"
                        onClick={openCreateEquipmentConfirm}
                    />
                </div>
            </section>
        </>
    );
}
