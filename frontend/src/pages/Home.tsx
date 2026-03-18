import Calendar from "../components/calendar/Calendar.tsx";
import {useEffect, useState} from "react";
import dayjs from "dayjs";
import {useAuthedUser} from "../auth/AuthContext.tsx";
import Button from "../components/Button.tsx";
import {useNavigate} from "react-router-dom";
import ManageReservations from "../components/ManageReservations.tsx";
import type {CalendarEvent, Reservation} from "../types.ts";
import {deleteReservation, getReservations} from "../api/Reservations.ts";
import {parseRawResToEvent} from "../util/ParseReservation.ts";
import {parseRawResToRes} from "../util/ParseReservationInfo.ts";

export default function Home(){
    const user = useAuthedUser();

    const navigate = useNavigate();

    const [firstDate] = useState(() => dayjs().startOf("day"));

    const startTime = dayjs().startOf("day").hour(8).minute(0);
    const endTime   = dayjs().startOf("day").hour(17).minute(0);

    // Store current event view in local storage so it persists across refreshes
    const [showCalendar, setShowCalendar] = useState(() => {
        const stored = localStorage.getItem("showCalendar");
        return stored !== null ? JSON.parse(stored) : true;
    });

    // Update local storage when showCalendar changes
    useEffect(() => {
        localStorage.setItem("showCalendar", JSON.stringify(showCalendar));
    }, [showCalendar]);

    const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
    const [reservations, setReservations] = useState<Reservation[]>([]);

    const [loading, setLoading] = useState(true);

    // TODO error handling
    const loadReservations = async () => {
        try {
            const data = await getReservations();
            setCalendarEvents(data.map(parseRawResToEvent));
            setReservations(data.map(parseRawResToRes));
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadReservations();
    }, []);

    const handleDeleteReservation = async (id: number) => {
        try {
            await deleteReservation(id);
            await loadReservations();
        } catch (err) {
            console.error(err);
        }
    }

    return (
        <>
            <section className="mx-5 md:mx-30 flex flex-col space-y-7">
                <h1
                    className="text-3xl font-bold text-gray-900"
                >Hello, {user.firstName}</h1>

                <div className="ml-auto mr-0 space-x-10">
                    <Button
                        text="Reserve Equipment"
                        className="bg-green-400 hover:bg-green-300 border-green-500"
                        onClick={() => {navigate("/app/reserveEquipment")}}
                    />
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
                    numDays={7}
                    startTime={startTime}
                    endTime={endTime}
                    timeStepMin={15}
                    variant={"user"}
                    reservations={calendarEvents}
                    loading={loading}
                />}

                {!showCalendar && <ManageReservations
                    reservations={reservations}
                    loading={loading}
                    onDeleteReservation={handleDeleteReservation}
                />}
            </section>
        </>
    )
}