import {useEffect, useState} from "react";
import {safeBack} from "../util/Navigation.ts";
import Button from "../components/Button.tsx";
import {useNavigate} from "react-router-dom";
import type {EquipmentDTO} from "../api/Equipment.ts";
import {updateEquipmentStatus} from "../api/Equipment.ts";

type StatusOption = {
    value: string;
    label: string;
    disabled?: boolean;
};

const equipmentStatusOptions: StatusOption[] = [
    { value: "AVAILABLE", label: "Available" },
    { value: "MAINTENANCE", label: "Maintenance" },
    { value: "RESERVED", label: "Reserved", disabled: true },
    { value: "OUT_OF_SERVICE", label: "Out of service", disabled: true },
];

export default function AllEquipment() {
    const navigate = useNavigate();
    const [equipmentList, setEquipmentList] = useState<EquipmentDTO[]>([]);
    const [loading, setLoading] = useState(true);
    const [statusUpdatingId, setStatusUpdatingId] = useState<number | null>(null);
    const [toastMessage, setToastMessage] = useState("");

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
                prev.map((eq) => (eq.id === updated.id ? updated : eq))
            );
        } catch (error) {
            console.error("Failed to update equipment status:", error);
            setToastMessage("Failed to update equipment status");
        } finally {
            setStatusUpdatingId(null);
        }
    };

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
                                        onChange={(event) => handleStatusChange(eq.id, event.target.value)}
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
                )}
            </section>
        </>
    );
}
