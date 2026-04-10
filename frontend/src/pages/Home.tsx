import Calendar from "../components/calendar/Calendar.tsx";
import {useEffect, useState} from "react";
import {useAuthedUser} from "../auth/AuthContext.tsx";
import Button from "../components/Button.tsx";
import {useLocation, useNavigate} from "react-router-dom";
import ManageReservations from "../components/ManageReservations.tsx";
import type {CalendarData, CalendarEvent, Reservation} from "../types.ts";
import {deleteReservation, updateReservation} from "../api/Reservations.ts";
import Toast from "../components/Toast.tsx";

interface HomeProps extends CalendarData {
    reservations: Reservation[];
    calendarEvents: CalendarEvent[];
    loadReservations: () => Promise<void>;
    loading: boolean;
}

type HomeLocationState = {
    toastMessage?: string;
    view?: "calendar" | "list";
}

export default function Home(
    { firstDate,startTime,endTime,timeStep,numDays,
        reservations, calendarEvents, loadReservations, loading}: HomeProps

){
    const user = useAuthedUser();
    const isAdmin = user.role === "ADMIN"; //TODO FIX: AT != ADMIN
    const isTrainer = user.role === "AT";
    const isPriveleged = isTrainer || isAdmin;
    const isStudent = user.role === "STUDENT";

    const navigate = useNavigate();
    const location = useLocation();

    const locationState = location.state as HomeLocationState | null;
    const toastMessage = locationState?.toastMessage ?? "";
    const preferredView = locationState?.view;

    // Store current event view in local storage so it persists across refreshes
    const [showCalendar, setShowCalendar] = useState(() => {
        const stored = localStorage.getItem("showCalendar");
        return stored !== null ? JSON.parse(stored) : true;
    });

    // Update local storage when showCalendar changes
    useEffect(() => {
        localStorage.setItem("showCalendar", JSON.stringify(showCalendar));
    }, [showCalendar]);

    useEffect(() => {
        if (!preferredView) return;
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setShowCalendar(preferredView === "calendar");
    }, [preferredView]);

    useEffect(() => {
        if (!toastMessage) return;
        const timeout = setTimeout(() => {
            navigate(location.pathname, {replace: true, state: null});
        }, 2500);
        return () => clearTimeout(timeout);
    }, [location.pathname, navigate, toastMessage]);

    const handleDeleteReservation = async (id: number) => {
        try {
            await deleteReservation(id);
            await loadReservations();
        } catch (err) {
            console.error(err);
        }
    }

    const handleEditReservation = async (
        id: number,
        start: Reservation["start"],
        end: Reservation["end"]
    ) => {
        try {
            await updateReservation(id, {
                start: start.toISOString(),
                end: end.toISOString(),
            });
            await loadReservations();
        } catch (err) {
            console.error(err);
            throw err;
        }
    }

    if (isStudent) {
        return (
            <>
                <Toast message={toastMessage} />
                <section className="mx-5 md:mx-30 space-y-6">
                    <h1 className="text-3xl font-bold text-gray-900">Hi, {user.firstName}</h1>
                    <div className="rounded border bg-white p-6 shadow-sm">
                        <p className="text-lg font-medium text-gray-900">Thanks for signing up!</p>
                        <p className="mt-2 text-sm text-gray-600">
                            Your account is currently marked as a student request. A trainer or admin will
                            review your request and promote you to an athlete as soon as they verify you.
                        </p>
                        <p className="mt-2 text-sm text-gray-500">
                            Once approved you will see the reservation calendar and reservation buttons appear here.
                        </p>
                    </div>
                </section>
            </>
        );
    }

    return (
        <>
            <Toast message={toastMessage} />

            <section className="mx-5 md:mx-30 flex flex-col space-y-7">
                <h1
                    className="text-3xl font-bold text-gray-900"
                >Hello, {user.firstName}</h1>

                <div className="mr-auto sm:mr-0 sm:ml-auto space-x-10">
                    {!isPriveleged && (
                        <Button
                            text="Reserve Equipment"
                            className="bg-green-400 hover:bg-green-300 border-green-500"
                            onClick={() => navigate("/app/reserveEquipment")}
                        />
                    )}

                    {isAdmin && (
                        <div className="flex flex-row sm:items-center gap-2">
                            {isAdmin && (
                                <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto text-nowrap">
                                    <Button
                                        text="App Settings"
                                        className="bg-white border border-gray-300 text-gray-800 hover:bg-gray-100"
                                        onClick={() => navigate("/app/admin/settings")}
                                    />
                                    <Button
                                        text="Manage users"
                                        className="bg-white border border-gray-300 text-gray-800 hover:bg-gray-100"
                                        onClick={() => navigate("/app/admin/users")}
                                    />
                                </div>
                            )}

                            {isPriveleged && (
                                <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto text-nowrap">
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
                            )}
                        </div>
                    )}
                </div>


                {/*Toggle for calendar view*/}
                <div className="flex w-48 border rounded-sm shadow-md">
                    <Button
                        text="Calendar"
                        className="flex-1 border-0 border-r rounded-l-none rounded-r-none"
                        onClick={() => setShowCalendar(true)}
                        style={{backgroundColor: showCalendar ? "var(--purple)" : "",
                                color: showCalendar ? "white" : "black"}}
                    />
                    <Button
                        text="List"
                        className="flex-1 border-0 rounded-l-none rounded-r-none"
                        onClick={() => setShowCalendar(false)}
                        style={{backgroundColor: showCalendar ? "" : "var(--purple)",
                                color: showCalendar ? "black" : "white"}}
                    />
                </div>

                {showCalendar && <Calendar
                    firstDate={firstDate}
                    numDays={numDays}
                    startTime={startTime}
                    endTime={endTime}
                    timeStepMin={timeStep}
                    variant={"user"}
                    reservations={calendarEvents}
                    loading={loading}
                    onEditReservation={handleEditReservation}
                    onDeleteReservation={handleDeleteReservation}
                />}

                {!showCalendar && <ManageReservations
                    reservations={reservations}
                    loading={loading}
                    startTime={startTime}
                    endTime={endTime}
                    timeStepMin={timeStep}
                    onEditReservation={handleEditReservation}
                    onDeleteReservation={handleDeleteReservation}
                />}
            </section>
        </>
    )
}
