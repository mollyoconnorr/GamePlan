import Calendar from "../components/calendar/Calendar.tsx";
import {useEffect, useState} from "react";
import {useAuthedUser} from "../auth/AuthContext.tsx";
import Button from "../components/Button.tsx";
import {useLocation, useNavigate} from "react-router-dom";
import ManageReservations from "../components/ManageReservations.tsx";
import type {CalendarData, CalendarEvent, Notification, Reservation} from "../types.ts";
import {deleteReservation, updateReservation} from "../api/Reservations.ts";
import {fetchPendingUserCount} from "../api/Admin.ts";
import {getNotifications, getUnreadNotificationCount, markNotificationAsRead} from "../api/Notifications.ts";
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
    const isAdmin = user.role === "AT" || user.role === "ADMIN"; //TODO FIX: AT != ADMIN
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
    const [showNotifications, setShowNotifications] = useState(false);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loadingNotifications, setLoadingNotifications] = useState(false);
    const [notificationsError, setNotificationsError] = useState<string | null>(null);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loadingUnreadCount, setLoadingUnreadCount] = useState(false);
    const [unreadCountError, setUnreadCountError] = useState<string | null>(null);
    const [pendingUserCount, setPendingUserCount] = useState(0);
    const [loadingPendingUserCount, setLoadingPendingUserCount] = useState(false);
    const [pendingCountError, setPendingCountError] = useState<string | null>(null);
    const [markingNotificationId, setMarkingNotificationId] = useState<number | null>(null);
    const [markError, setMarkError] = useState<string | null>(null);

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

    useEffect(() => {
        if (isAdmin || !showNotifications) {
            return;
        }

        let active = true;
        setNotificationsError(null);
        setLoadingNotifications(true);
        setNotifications([]);
        setMarkError(null);

        getNotifications()
            .then((result) => {
                if (!active) return;
                setNotifications(result);
                setUnreadCount(0);
            })
            .catch((error) => {
                if (!active) return;
                const message = error instanceof Error ? error.message : "Failed to load notifications";
                setNotificationsError(message);
            })
            .finally(() => {
                if (active) {
                    setLoadingNotifications(false);
                }
            });

        return () => {
            active = false;
        };
    }, [isAdmin, showNotifications]);

    useEffect(() => {
        if (isAdmin || showNotifications) {
            return;
        }

        let active = true;
        setUnreadCountError(null);
        setLoadingUnreadCount(true);

        getUnreadNotificationCount()
            .then((count) => {
                if (!active) return;
                setUnreadCount(count);
            })
            .catch((error) => {
                if (!active) return;
                const message = error instanceof Error ? error.message : "Failed to load notification count";
                setUnreadCountError(message);
            })
            .finally(() => {
                if (active) {
                    setLoadingUnreadCount(false);
                }
            });

        return () => {
            active = false;
        };
    }, [isAdmin, showNotifications]);

    const handleDeleteReservation = async (id: number) => {
        try {
            await deleteReservation(id);
            await loadReservations();
        } catch (err) {
            console.error(err);
        }
    }

    const handleMarkAsRead = async (id: number) => {
        setMarkError(null);
        setMarkingNotificationId(id);
        try {
            await markNotificationAsRead(id);
            setNotifications((prev) => prev.filter((notification) => notification.id !== id));
            setUnreadCount((prev) => Math.max(prev - 1, 0));
        } catch (error) {
            const message = error instanceof Error ? error.message : "Failed to mark notification as read";
            setMarkError(message);
        } finally {
            setMarkingNotificationId(null);
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

    useEffect(() => {
        if (!isAdmin) {
            setPendingUserCount(0);
            setPendingCountError(null);
            setLoadingPendingUserCount(false);
            return;
        }

        let active = true;
        setPendingCountError(null);
        setLoadingPendingUserCount(true);

        fetchPendingUserCount()
            .then((count) => {
                if (!active) return;
                setPendingUserCount(count);
            })
            .catch((error) => {
                if (!active) return;
                const message = error instanceof Error ? error.message : "Failed to load pending users";
                setPendingCountError(message);
            })
            .finally(() => {
                if (active) {
                    setLoadingPendingUserCount(false);
                }
            });

        return () => {
            active = false;
        };
    }, [isAdmin]);

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

                <div className="ml-auto mr-0 space-x-10">
                    {!isAdmin && (
                        <Button
                            text="Reserve Equipment"
                            className="bg-green-400 hover:bg-green-300 border-green-500"
                            onClick={() => navigate("/app/reserveEquipment")}
                        />
                    )}

                    {isAdmin && (
                        <div className="ml-auto flex flex-wrap items-center gap-2">
                        <Button
                            text="App Settings"
                            className="bg-white border border-gray-300 text-gray-800 hover:bg-gray-100"
                            onClick={() => navigate("/app/admin/settings")}
                        />
                        <div className="relative">
                            <Button
                                text="Manage users"
                                className="bg-white border border-gray-300 text-gray-800 hover:bg-gray-100"
                                onClick={() => navigate("/app/admin/users")}
                            />
                            {pendingUserCount > 0 && (
                                <span
                                    aria-hidden="true"
                                    className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-semibold text-white"
                                >
                                    {pendingUserCount}
                                </span>
                            )}
                        </div>
                        {pendingCountError ? (
                            <p className="text-xs text-red-500">{pendingCountError}</p>
                        ) : loadingPendingUserCount ? (
                            <p className="text-xs text-gray-500">Checking for pending users…</p>
                        ) : null}
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

                {!isAdmin && (
                    <div className="flex flex-col space-y-3">
                        <div className="relative inline-flex">
                            <Button
                                text={showNotifications ? "Hide notifications" : "Show notifications"}
                                className={`!px-4 !py-2 border ${unreadCount > 0 ? "border-red-400 bg-red-50 text-red-700" : "border-gray-300 bg-white text-gray-800"} hover:bg-gray-100`}
                                onClick={() => setShowNotifications((prev) => !prev)}
                            />
                            {!showNotifications && unreadCount > 0 && (
                                <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-semibold text-white">
                                    {unreadCount}
                                </span>
                            )}
                            {unreadCount > 0 && (
                                <span
                                    aria-hidden="true"
                                    className="absolute -top-1 -left-1 h-2 w-2 rounded-full bg-red-500"
                                />
                            )}
                        </div>
                        {unreadCountError ? (
                            <p className="text-xs text-red-500">{unreadCountError}</p>
                        ) : loadingUnreadCount ? (
                            <p className="text-xs text-gray-500">Checking for new notifications...</p>
                        ) : null}

                        {showNotifications && (
                            <div className="rounded border border-gray-200 bg-white p-4 shadow-sm">
                                <div className="flex items-center justify-between">
                                    <p className="text-sm font-semibold text-gray-900">Notifications</p>
                                    {loadingNotifications && (
                                        <span className="text-xs text-gray-500">Loading...</span>
                                    )}
                                </div>

                            {notificationsError ? (
                                <p className="mt-2 text-sm text-red-500">{notificationsError}</p>
                            ) : notifications.length === 0 ? (
                                <p className="mt-2 text-sm text-gray-500">
                                    {loadingNotifications ? "Loading notifications..." : "No new notifications."}
                                </p>
                            ) : (
                                <>
                                    {markError && (
                                        <p className="mt-2 text-xs text-red-500">{markError}</p>
                                    )}
                                    <ul className="mt-3 space-y-3 text-sm text-gray-700">
                                        {notifications.map((notification) => (
                                            <li
                                                key={notification.id}
                                                className="rounded border border-gray-100 bg-gray-50 p-3"
                                            >
                                                <div className="flex items-center justify-between gap-3">
                                                    <div>
                                                        <p className="font-medium text-gray-900">
                                                            {notification.message}
                                                        </p>
                                                        <p className="text-xs text-gray-500">{notification.createdAt}</p>
                                                    </div>
                                                    <Button
                                                        text="Mark as read"
                                                        className="ml-4 whitespace-nowrap border border-gray-200 bg-white text-xs text-gray-800 hover:bg-gray-100"
                                                        onClick={() => handleMarkAsRead(notification.id)}
                                                        disabled={markingNotificationId === notification.id}
                                                    />
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                </>
                            )}
                            </div>
                        )}
                    </div>
                )}

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
