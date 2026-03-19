import {useEffect, useState} from "react";
import {safeBack} from "../util/Navigation.ts";
import Button from "../components/Button.tsx";
import {useNavigate} from "react-router-dom";

interface Equipment {
    id: number;
    name: string;
    status: string;
    equipmentType: {
        id: number;
        name: string;
    };
    attributes: { name: string; value: string }[];
}

export default function AllEquipment() {
    const navigate = useNavigate();
    const [equipmentList, setEquipmentList] = useState<Equipment[]>([]);
    const [loading, setLoading] = useState(true);

    const handleDelete = async (id: number) => {
        if (!window.confirm("Are you sure you want to delete this equipment?")) return;

        try {
            const response = await fetch(`/api/equipment/${id}`, {
                method: "DELETE",
            });

            if (response.ok) {
                // Remove from state so table updates immediately
                setEquipmentList((prev) => prev.filter((eq) => eq.id !== id));
            } else {
                alert("Failed to delete equipment");
            }
        } catch (error) {
            console.error(error);
            alert("Error deleting equipment");
        }
    };

    useEffect(() => {
        fetch("/api/equipment")
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
                className="bg-gray-300 hover:bg-gray-200"
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
                        </tr>
                        </thead>
                        <tbody>
                        {equipmentList.map((eq) => (
                            <tr key={eq.id} className="hover:bg-gray-100">
                                <td className="border px-4 py-2">{eq.id}</td>
                                <td className="border px-4 py-2">{eq.name}</td>
                                {/*TODO: Add type name to Equipment*/}
                                <td className="border px-4 py-2">{eq.typeName ?? 'No type'}</td>
                                {/* safe */}
                                <td className="border px-4 py-2">{eq.status}</td>
                                <td className="border px-4 py-2">
                                    {eq.attributes?.length > 0
                                        ? eq.attributes.map((attr) => `${attr.name}: ${attr.value}`).join(", ")
                                        : 'No attributes'}
                                </td>
                                <td className="border px-4 py-2">
                                    <button
                                        onClick={() => handleDelete(eq.id)}
                                        className="bg-red-500 hover:bg-red-700 text-white px-2 py-1 rounded"
                                    >
                                        Delete
                                    </button>
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