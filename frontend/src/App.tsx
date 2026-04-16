import {Routes, Route, Navigate} from "react-router-dom";
import { useAuth } from "./auth/AuthContext";
import RequireAuth from "./auth/RequireAuth";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import Home from "./pages/Home";
import ReserveEquipment from "./pages/ReserveEquipment.tsx";
import Welcome from "./pages/Welcome.tsx";
import Login from "./pages/Login.tsx";
import Logout from "./pages/Logout.tsx";
import NotFound from "./pages/NotFound.tsx";
import Profile from "./pages/Profile.tsx";
import AdminUsers from "./pages/AdminUsers.tsx";
import {type JSX, useCallback, useEffect, useMemo, useState} from "react";
import type {CalendarEvent, Reservation} from "./types.ts";
import {getActiveReservationsForAdmin, getReservations} from "./api/Reservations.ts";
import {getScheduleBlocks} from "./api/Blocks.ts";
import {
    parseAdminRawResToRes,
    parseRawResToRes,
    parseResToEvent
} from "./util/ParseReservation.ts";
import {parseRawBlockToEvent, sortEventsByStartIso} from "./util/ParseScheduleBlock.ts";
import CreateEquipment from "./pages/CreateEquipment";
import EquipmentTypes from "./pages/EquipmentTypes";
import AllEquipment from "./pages/AllEquipment";
import EditEquipment from "./pages/EditEquipment.tsx";
import AppSettings from "./pages/AppSettings.tsx";
import dayjs from "dayjs";
import {getAppSettings} from "./api/Settings.ts";
import {
    RESERVATION_DATA_CHANGED_EVENT,
    type ReservationDataChangedDetail,
} from "./util/AppDataEvents.ts";

function AppShell() {
    // user is guaranteed by RequireAuth
    const { user, logout } = useAuth();

    const hasPrivilegedAccess = user!.role === "AT" || user!.role === "ADMIN";

    const renderForPrivileged = (element: JSX.Element) => {
        if (hasPrivilegedAccess) {
            return element;
        }
        return <Navigate to="/app/home" replace />;
    };

    const [reservations, setReservations] = useState<Reservation[]>([]);
    const [globalBlockEvents, setGlobalBlockEvents] = useState<CalendarEvent[]>([]);

    const [loading, setLoading] = useState(true);

    // Combine reservations and blocks and sort them by ISO time
    const calendarEvents = useMemo(
        () => {
            const reservationEvents = reservations.map(parseResToEvent);
            return sortEventsByStartIso([...reservationEvents, ...globalBlockEvents]);
        },
        [globalBlockEvents, reservations]
    );

    const [firstDateToShow, setFirstDateToShow] = useState<"week" | "day">("week");
    const [firstDate, setFirstDate] = useState(dayjs());

    const [startTime, setStartTime] = useState(dayjs());
    const [endTime, setEndTime] = useState(dayjs());
    const [timeStep, setTimeStep] = useState(0);
    const [maxResTime, setMaxResTime] = useState(0);
    const [numDays, setNumDays] = useState(0);

    // TODO error handling
    const loadReservations = useCallback(async (silent = false) => {
        if (numDays <= 0) {
            return;
        }

        if (!silent) {
            setLoading(true);
        }
        try {
            // Fetch blocks for the visible calendar window so recurring weekends are included.
            const blocksPromise = getScheduleBlocks(
                firstDate.startOf("day").toISOString(),
                firstDate.add(numDays, "day").startOf("day").toISOString()
            )
                .then((blocks) => sortEventsByStartIso(blocks.map(parseRawBlockToEvent)))
                .catch((err) => {
                    console.error("Failed to fetch schedule blocks:", err);
                    return [] as CalendarEvent[];
                });

            if (hasPrivilegedAccess) {
                // Get all active reservations if admin
                const [reservationData, blocks] = await Promise.all([
                    getActiveReservationsForAdmin(),
                    blocksPromise,
                ]);

                setReservations(reservationData.map(parseAdminRawResToRes));
                setGlobalBlockEvents(blocks);
            } else {
                // Just get users reservations
                const [data, blocks] = await Promise.all([
                    getReservations(),
                    blocksPromise,
                ]);
                setReservations(data.map(parseRawResToRes));
                setGlobalBlockEvents(blocks);
            }
        } catch (err) {
            console.error(err);
        } finally {
            if (!silent) {
                setLoading(false);
            }
        }
    }, [hasPrivilegedAccess, firstDate, numDays]);

    useEffect(() => {
        void loadReservations();
    }, [loadReservations]);

    useEffect(() => {
        const handleReservationChange = (event: Event) => {
            const detail = (event as CustomEvent<ReservationDataChangedDetail>).detail;
            if (!detail) {
                return;
            }

            if (hasPrivilegedAccess && detail.action === "created") {
                void loadReservations();
            }

            if (!hasPrivilegedAccess && detail.action === "canceled") {
                void loadReservations();
            }
        };

        window.addEventListener(RESERVATION_DATA_CHANGED_EVENT, handleReservationChange);
        return () => window.removeEventListener(RESERVATION_DATA_CHANGED_EVENT, handleReservationChange);
    }, [hasPrivilegedAccess, loadReservations]);

    useEffect(() => {
        if (numDays <= 0) {
            return;
        }

        const refreshSilently = () => {
            if (document.visibilityState === "visible") {
                void loadReservations(true);
            }
        };

        const intervalId = window.setInterval(refreshSilently, 30_000);
        window.addEventListener("focus", refreshSilently);
        document.addEventListener("visibilitychange", refreshSilently);

        return () => {
            window.clearInterval(intervalId);
            window.removeEventListener("focus", refreshSilently);
            document.removeEventListener("visibilitychange", refreshSilently);
        };
    }, [loadReservations, numDays]);

    useEffect(() => {
        async function getSettings() {
            setLoading(true);
            try {
                const settings = await getAppSettings();

                setFirstDateToShow(settings.firstDateToShow);
                setFirstDate(dayjs().startOf(settings.firstDateToShow));
                setStartTime(settings.startTime);
                setEndTime(settings.endTime);
                setTimeStep(settings.timeStep);
                setMaxResTime(settings.maxResTime);
                setNumDays(settings.numDays);
            } catch (err: any) {
                console.log(err.message);
            } finally {
                setLoading(false);
            }
        }

        getSettings();
    }, []);

    return (
        <div className="min-h-screen flex flex-col">
            <Navbar username={user!.email} logout={logout} />

            <main className="flex-1 p-6">
                <Routes>
                    <Route
                        index
                        element={
                            <Navigate
                                to={hasPrivilegedAccess ? "/app/admin/reservations" : "/app/home"}
                                replace
                            />
                        }
                    />
                    <Route
                        path="home"
                        element={
                            <Home
                                firstDate={firstDate}
                                startTime={startTime}
                                endTime={endTime}
                                timeStep={timeStep}
                                maxResTime={maxResTime}
                                numDays={numDays}
                                reservations={reservations}
                                calendarEvents={calendarEvents}
                                loadReservations={loadReservations}
                                loading={loading}
                            />
                        }
                    />
                    <Route
                        path="reserveEquipment"
                        element={
                            hasPrivilegedAccess ? (
                                <Navigate to="/app/admin/reservations" replace />
                            ) : (
                                <ReserveEquipment
                                    firstDate={firstDate}
                                    startTime={startTime}
                                    endTime={endTime}
                                    timeStep={timeStep}
                                    maxResTime={maxResTime}
                                    numDays={numDays}
                                    reservations={reservations}
                                    setReservations={setReservations}
                                />
                            )
                        }
                    />
                    <Route path="admin/settings" element={renderForPrivileged(
                        <AppSettings
                            firstDate={firstDate}
                            firstDateToShow={firstDateToShow}
                            startTime={startTime}
                            endTime={endTime}
                            timeStep={timeStep}
                            maxResTime={maxResTime}
                            numDays={numDays}
                            setFirstDate={setFirstDate}
                            setFirstDateToShow={setFirstDateToShow}
                            setStartTime={setStartTime}
                            setEndTime={setEndTime}
                            setTimeStep={setTimeStep}
                            setMaxResTime={setMaxResTime}
                            setNumDays={setNumDays}
                            refreshCalendarData={loadReservations}
                            loading={loading}
                        />)} />
                    <Route path="admin/users" element={renderForPrivileged(<AdminUsers />)} />
                    <Route path="profile" element={<Profile />} />
                    <Route path="*" element={<NotFound compact />} />
                    <Route path="equipmentTypes" element={renderForPrivileged(<EquipmentTypes />)} />
                    <Route path="createEquipment" element={renderForPrivileged(<CreateEquipment />)} />
                    <Route path="allEquipment" element={renderForPrivileged(<AllEquipment />)} />
                    <Route path="equipment/:equipmentId/edit" element={renderForPrivileged(<EditEquipment />)} />
                </Routes>
            </main>

            <Footer />
        </div>
    );
}

export default function App() {
    return (
        <Routes>
            {/* Public landing / redirect target */}
            <Route path="/" element={<Welcome />} />
            <Route path="/login" element={<Login />} />
            <Route path="/logout" element={<Logout />} />

            {/* Everything under /app is protected */}
            <Route
                path="/app/*"
                element={
                    <RequireAuth redirectTo="/login">
                        <AppShell />
                    </RequireAuth>
                }
            />

            {/* unknown routes */}
            <Route path="*" element={<NotFound />} />
        </Routes>
    );
}
