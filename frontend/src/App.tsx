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
import {type JSX, useEffect, useMemo, useState} from "react";
import type {Reservation} from "./types.ts";
import {getActiveReservationsForAdmin, getReservations} from "./api/Reservations.ts";
import {
    parseAdminRawResToRes,
    parseRawResToRes,
    parseResToEvent
} from "./util/ParseReservation.ts";
import CreateEquipment from "./pages/CreateEquipment";
import EquipmentTypes from "./pages/EquipmentTypes";
import AllEquipment from "./pages/AllEquipment";
import EditEquipment from "./pages/EditEquipment.tsx";
import AppSettings from "./pages/AppSettings.tsx";
import dayjs from "dayjs";

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

    const [loading, setLoading] = useState(true);
    const calendarEvents = useMemo(
        () => reservations.map(parseResToEvent),
        [reservations]
    );

    // TODO error handling
    const loadReservations = async () => {
        try {
            if (hasPrivilegedAccess) {
                // Get all active reservations if admin
                const data = await getActiveReservationsForAdmin();
                setReservations(data.map(parseAdminRawResToRes));
            } else {
                // Just get users reservations
                const data = await getReservations();
                setReservations(data.map(parseRawResToRes));
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadReservations();
    }, []);

    const [firstDate, setFirstDate] = useState(() => dayjs().startOf("week"));
    const [startTime, setStartTime] = useState(dayjs().startOf("day").hour(8).minute(0));
    const [endTime, setEndTime] = useState(dayjs().startOf("day").hour(17).minute(0));
    const [timeStep, setTimeStep] = useState(15);
    const [maxResTime, setMaxResTime] = useState(30);
    const [numDays, setNumDays] = useState(7);

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
                                    reservations={reservations}
                                    setReservations={setReservations}
                                />
                            )
                        }
                    />
                    <Route path="admin/settings" element={renderForPrivileged(<AppSettings />)} />
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
                    <RequireAuth redirectTo="/">
                        <AppShell />
                    </RequireAuth>
                }
            />

            {/* unknown routes */}
            <Route path="*" element={<NotFound />} />
        </Routes>
    );
}
