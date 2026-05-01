import {apiFetch} from "./apiFetch.ts";

/**
 * Equipment type record returned by equipment type endpoints.
 */
export type EquipmentType = {
    id: number;
    name: string;
    color?: string;
    fieldSchema?: string;
    hasSchema?: boolean;
};

/**
 * Attribute definition returned for an equipment type schema.
 */
export type EquipmentTypeAttributeResponse = {
    name: string;
    options?: string[];
    value?: string | string[];
};

/**
 * Equipment payload returned by equipment endpoints.
 */
export type EquipmentDTO = {
    id: number;
    name: string;
    status: string | null;
    typeName?: string | null;
    typeId?: number | null;
    attributes?: { name: string; value: string }[];
};

/**
 * Response returned after changing equipment status, including cancelled reservation count.
 */
export type EquipmentStatusUpdateResponse = {
    id: number;
    name: string;
    status: string | null;
    equipment: EquipmentDTO;
    canceledReservations: number;
};

/**
 * Request body used when editing equipment identity, type, and dynamic attributes.
 */
export type EquipmentUpdateRequest = {
    name: string;
    equipmentTypeId: number;
    attributes: Record<string, string>;
};

/**
 * Payload sent to create a new equipment type and optional schema.
 */
interface CreateEquipmentTypeRequest {
    name: string;
    fieldSchema: string;
    color: string;
}

/**
 * Payload sent to update an equipment type and optional schema.
 */
interface UpdateEquipmentTypeRequest {
    name?: string;
    fieldSchema?: string;
    color?: string;
}

/**
 * Payload sent to create equipment with dynamic attributes.
 */
interface CreateEquipmentRequest {
    name: string;
    equipmentTypeId: number;
    attributes: Record<string, string>;
}

/**
 * Fetches all equipment types used by creation, editing, and reservation filters.
 */
export async function getEquipmentTypes() {
    const res = await apiFetch("/api/equipment-types", {
        method: "GET",
    });

    if (!res.ok) {
        throw new Error("Failed to fetch equipment types");
    }

    return await res.json() as Promise<EquipmentType[]>;
}

/**
 * Creates equipment type and applies the resulting state.
 */
export async function createEquipmentType(request: CreateEquipmentTypeRequest) {
    const res = await apiFetch("/api/equipment-types", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(request),
    });

    if (!res.ok) {
        throw new Error("Failed to create equipment type");
    }
}

/**
 * Saves updated equipment type data and applies the resulting state.
 */
export async function updateEquipmentType(id: number, request: UpdateEquipmentTypeRequest) {
    const res = await apiFetch(`/api/equipment-types/${id}`, {
        method: "PUT",
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

/**
 * Fetches the configured attribute schema for a selected equipment type.
 */
export async function getEquipmentTypeAttributes(typeId: number) {
    const res = await apiFetch(`/api/equipment-types/${typeId}/attributes-all`, {
        method: "GET",
    });

    if (!res.ok) {
        throw new Error("Failed to fetch equipment type attributes");
    }

    return await res.json() as Promise<EquipmentTypeAttributeResponse[]>;
}

/**
 * Fetches distinct saved attribute values for an equipment type so filters reflect real inventory.
 */
export async function getEquipmentTypeAttributeValues(typeId: number) {
    const res = await apiFetch(`/api/equipment-types/${typeId}/attributes`, {
        method: "GET",
    });

    if (!res.ok) {
        throw new Error("Failed to fetch equipment type attribute values");
    }

    return await res.json() as Promise<EquipmentTypeAttributeResponse[]>;
}

/**
 * Creates equipment and applies the resulting state.
 */
export async function createEquipment(request: CreateEquipmentRequest) {
    const res = await apiFetch("/api/equipment", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(request),
    });

    if (!res.ok) {
        throw new Error("Failed to create equipment");
    }
}

/**
 * Fetches the full equipment inventory list from the backend.
 */
export async function getEquipment(id: number) {
    const res = await apiFetch(`/api/equipment/${id}`, {
        method: "GET",
    });

    if (!res.ok) {
        throw new Error("Failed to load equipment");
    }

    return await res.json() as Promise<EquipmentDTO>;
}

/**
 * Saves updated equipment data and applies the resulting state.
 */
export async function updateEquipment(id: number, request: EquipmentUpdateRequest) {
    const res = await apiFetch(`/api/equipment/${id}`, {
        method: "PUT",
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

/**
 * Sends the delete request for equipment after confirmation.
 */
export async function deleteEquipment(id: number) {
    const res = await apiFetch(`/api/equipment/${id}`, {
        method: "DELETE",
    });

    if (!res.ok) {
        throw new Error("Failed to delete equipment");
    }
}

/**
 * Saves updated equipment status data and applies the resulting state.
 */
export async function updateEquipmentStatus(id: number, status: string) {
    const res = await apiFetch(`/api/equipment/${id}/status`, {
        method: "PUT",
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
