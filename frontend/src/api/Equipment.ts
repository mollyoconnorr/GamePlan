export type EquipmentType = {
    id: number;
    name: string;
};

export type EquipmentTypeAttributeResponse = {
    name: string;
    options?: string[];
    value?: string | string[];
};

interface CreateEquipmentTypeRequest {
    name: string;
    fieldSchema: string;
    color: string;
}

interface CreateEquipmentRequest {
    name: string;
    equipmentTypeId: number;
    attributes: Record<string, string>;
}

export async function getEquipmentTypes() {
    const res = await fetch("/api/equipment-types", {
        method: "GET",
        credentials: "include",
    });

    if (!res.ok) {
        throw new Error("Failed to fetch equipment types");
    }

    return res.json() as Promise<EquipmentType[]>;
}

export async function createEquipmentType(request: CreateEquipmentTypeRequest) {
    const res = await fetch("/api/equipment-types", {
        method: "POST",
        credentials: "include",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(request),
    });

    if (!res.ok) {
        throw new Error("Failed to create equipment type");
    }
}

export async function getEquipmentTypeAttributes(typeId: number) {
    const res = await fetch(`/api/equipment-types/${typeId}/attributes-all`, {
        method: "GET",
        credentials: "include",
    });

    if (!res.ok) {
        throw new Error("Failed to fetch equipment type attributes");
    }

    return res.json() as Promise<EquipmentTypeAttributeResponse[]>;
}

export async function createEquipment(request: CreateEquipmentRequest) {
    const res = await fetch("/api/equipment", {
        method: "POST",
        credentials: "include",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(request),
    });

    if (!res.ok) {
        throw new Error("Failed to create equipment");
    }
}
