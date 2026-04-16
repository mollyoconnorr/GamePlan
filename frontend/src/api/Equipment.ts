export type EquipmentType = {
    id: number;
    name: string;
    color?: string;
    fieldSchema?: string;
    hasSchema?: boolean;
};

export type EquipmentTypeAttributeResponse = {
    name: string;
    options?: string[];
    value?: string | string[];
};

export type EquipmentDTO = {
    id: number;
    name: string;
    status: string | null;
    typeName?: string | null;
    typeId?: number | null;
    attributes?: { name: string; value: string }[];
};

export type EquipmentStatusUpdateResponse = {
    id: number;
    name: string;
    status: string | null;
    equipment: EquipmentDTO;
    canceledReservations: number;
};

export type EquipmentUpdateRequest = {
    name: string;
    equipmentTypeId: number;
    attributes: Record<string, string>;
};

interface CreateEquipmentTypeRequest {
    name: string;
    fieldSchema: string;
    color: string;
}

interface UpdateEquipmentTypeRequest {
    name?: string;
    fieldSchema?: string;
    color?: string;
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

    return await res.json() as Promise<EquipmentType[]>;
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

export async function updateEquipmentType(id: number, request: UpdateEquipmentTypeRequest) {
    const res = await fetch(`/api/equipment-types/${id}`, {
        method: "PUT",
        credentials: "include",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(request),
    });

    if (!res.ok) {
        throw new Error("Failed to update equipment type");
    }

    return await res.json() as Promise<EquipmentType>;
}

export async function getEquipmentTypeAttributes(typeId: number) {
    const res = await fetch(`/api/equipment-types/${typeId}/attributes-all`, {
        method: "GET",
        credentials: "include",
    });

    if (!res.ok) {
        throw new Error("Failed to fetch equipment type attributes");
    }

    return await res.json() as Promise<EquipmentTypeAttributeResponse[]>;
}

export async function getEquipmentTypeAttributeValues(typeId: number) {
    const res = await fetch(`/api/equipment-types/${typeId}/attributes`, {
        method: "GET",
        credentials: "include",
    });

    if (!res.ok) {
        throw new Error("Failed to fetch equipment type attribute values");
    }

    return await res.json() as Promise<EquipmentTypeAttributeResponse[]>;
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

export async function getEquipment(id: number) {
    const res = await fetch(`/api/equipment/${id}`, {
        method: "GET",
        credentials: "include",
    });

    if (!res.ok) {
        throw new Error("Failed to load equipment");
    }

    return await res.json() as Promise<EquipmentDTO>;
}

export async function updateEquipment(id: number, request: EquipmentUpdateRequest) {
    const res = await fetch(`/api/equipment/${id}`, {
        method: "PUT",
        credentials: "include",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(request),
    });

    if (!res.ok) {
        throw new Error("Failed to update equipment");
    }

    return await res.json() as Promise<EquipmentDTO>;
}

export async function deleteEquipment(id: number) {
    const res = await fetch(`/api/equipment/${id}`, {
        method: "DELETE",
        credentials: "include",
    });

    if (!res.ok) {
        throw new Error("Failed to delete equipment");
    }
}

export async function updateEquipmentStatus(id: number, status: string) {
    const res = await fetch(`/api/equipment/${id}/status`, {
        method: "PUT",
        credentials: "include",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ status }),
    });

    if (!res.ok) {
        throw new Error("Failed to update equipment status");
    }

    return await res.json() as Promise<EquipmentStatusUpdateResponse>;
}
