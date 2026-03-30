import {useEffect, useMemo, useState} from "react";
import Calendar from "../components/calendar/Calendar.tsx";
import {deleteReservation, getActiveReservationsForAdmin} from "../api/Reservations.ts";
import {parseAdminRawResToEvent} from "../util/ParseReservation.ts";
import type {RawAdminReservation} from "../types.ts";
import dayjs from "dayjs";
import Button from "../components/Button.tsx";
import {useNavigate} from "react-router-dom";

export default function AdminReservations() {
    const [reservations, setReservations] = useState<RawAdminReservation[]>([]);
    const [loading, setLoading] = useState(true);
    const [view, setView] = useState<"calendar" | "list">("calendar");
    const navigate = useNavigate();

    const firstDate = useMemo(() => dayjs().startOf("day"), []);
    const startTime = dayjs().startOf("day").hour(8).minute(0);
    const endTime = dayjs().startOf("day").hour(17).minute(0);

    const calendarEvents = useMemo(
        () => reservations.map((reservation) => parseAdminRawResToEvent(reservation)),
        [reservations]
    );

    const loadReservations = async () => {
        setLoading(true);
        try {
            const data = await getActiveReservationsForAdmin();
            setReservations(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadReservations();
    }, []);

    const handleCancelReservation = async (id: number) => {
        if (!window.confirm("Cancel this reservation for the athlete?")) {
            return;
        }
        try {
            await deleteReservation(id);
            await loadReservations();
        } catch (err) {
            console.error(err);
        }
    };

    return (
        <section className="mx-5 md:mx-30 space-y-6">
            <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold text-gray-900">Active athlete reservations</h1>
                <div className="ml-auto flex flex-wrap items-center gap-2">
                    <Button
                        text="Manage users"
                        className="bg-white border border-gray-300 text-gray-800 hover:bg-gray-100"
                        onClick={() => navigate("/app/admin/users")}
                    />
                    <Button
                        text="Equipment Types"
                        className="bg-primary text-white hover:bg-primary-hover border-black"
                        onClick={() => navigate("/app/equipmentTypes")}
                    />
                    <Button
                        text="All Equipment"
                        className="bg-primary text-white hover:bg-primary-hover border-black"
                        onClick={() => navigate("/app/allEquipment")}
                    />
                    <Button
                        text="Create Equipment"
                        className="bg-primary text-white hover:bg-primary-hover border-black"
                        onClick={() => navigate("/app/createEquipment")}
                    />
                </div>
            </div>

            <div className="flex items-center gap-2">
                <div className="ml-auto flex flex-wrap items-center gap-2">
                    <Button
                        text="Calendar view"
                        className={`bg-white border ${view === "calendar" ? "text-gray-900" : "text-gray-500"}`}
                        onClick={() => setView("calendar")}
                    />
                    <Button
                        text="List view"
                        className={`bg-white border ${view === "list" ? "text-gray-900" : "text-gray-500"}`}
                        onClick={() => setView("list")}
                    />
                </div>
            </div>

            {view === "calendar" ? (
                <Calendar
                    firstDate={firstDate}
                    numDays={7}
                    startTime={startTime}
                    endTime={endTime}
                    timeStepMin={15}
                    variant="trainer"
                    reservations={calendarEvents}
                    loading={loading}
                    onDeleteReservation={handleCancelReservation}
                />
            ) : (
                <div className="space-y-4">
                    {loading && <p>Loading reservations...</p>}
                    {!loading && reservations.length === 0 && <p>No active reservations.</p>}
                    {!loading && reservations.map((reservation) => (
                        <div key={reservation.id} className="rounded border p-4 shadow-sm flex items-center justify-between">
                            <div>
                                <p className="font-semibold">{reservation.equipmentName}</p>
                                <p className="text-sm text-gray-600">
                                    {dayjs(reservation.start).format("ddd M/D h:mm A")} — {dayjs(reservation.end).format("h:mm A")}
                                </p>
                                <p className="text-sm text-gray-700">
                                    Reserved by {reservation.athleteFirstName} {reservation.athleteLastName}
                                </p>
                            </div>
                            <Button
                                text="Cancel"
                                className="bg-red-600 text-white hover:bg-red-500"
                                onClick={() => handleCancelReservation(reservation.id)}
                            />
                        </div>
                    ))}
                </div>
            )}
        </section>
    );
}
