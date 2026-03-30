import {useEffect, useMemo, useState} from "react";
import {fetchAdminUsers, updateUserRole} from "../api/Admin.ts";
import type {AdminUser} from "../types.ts";
import Button from "../components/Button.tsx";
import {useNavigate} from "react-router-dom";
import {safeBack} from "../util/Navigation.ts";

export default function AdminUsers() {
    const navigate = useNavigate();

    const [users, setUsers] = useState<AdminUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [updatingUserId, setUpdatingUserId] = useState<number | null>(null);
    const [feedback, setFeedback] = useState<string | null>(null);
    const [pendingRoleMap, setPendingRoleMap] = useState<Record<number, "ATHLETE" | "AT">>({});

    const loadUsers = async () => {
        setLoading(true);
        try {
            const list = await fetchAdminUsers();
            setUsers(list);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadUsers();
    }, []);

    useEffect(() => {
        if (!feedback) {
            return;
        }
       const timer = setTimeout(() => setFeedback(null), 4500);
        return () => clearTimeout(timer);
    }, [feedback]);

    const handleRoleChange = async (userId: number, role: "AT" | "ATHLETE" | "ADMIN") => {
        setUpdatingUserId(userId);
        try {
            await updateUserRole(userId, role);
            setFeedback(`Updated user to ${role === "AT" ? "trainer" : role === "ADMIN" ? "admin" : "athlete"}.`);
            await loadUsers();
        } catch (err) {
            const message = err instanceof Error ? err.message : "Failed to update role";
            setFeedback(message);
        } finally {
            setUpdatingUserId(null);
        }
    };

    const handleApproveStudent = (userId: number) => handleRoleChange(userId, pendingRoleMap[userId] ?? "ATHLETE");

    const handlePendingRoleChange = (userId: number, role: "AT" | "ATHLETE") => {
        setPendingRoleMap((prev) => ({ ...prev, [userId]: role }));
    };

    const handleMakeAdmin = async (userId: number) => {
        const confirmation = window.prompt("Type CONFIRM to make this user an admin.");
        if (confirmation !== "CONFIRM") {
            return;
        }
        await handleRoleChange(userId, "ADMIN");
    };

    const formatRoleLabel = (role?: string) => {
        if (!role) {
            return "Unknown";
        }
        const normalized = role.toLowerCase();
        return normalized.charAt(0).toUpperCase() + normalized.slice(1);
    };

    const pendingUsers = useMemo(() => users.filter((user) => user.role === "STUDENT"), [users]);
    const activeUsers = useMemo(() => users.filter((user) => user.role !== "STUDENT"), [users]);
    const [view, setView] = useState<"pending" | "active">("pending");

    const messageBanner = useMemo(() => {
        if (!feedback) return null;
        return (
            <div className="rounded border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-medium text-indigo-900">
                {feedback}
            </div>
        );
    }, [feedback]);

    return (
        <>
            <div className="flex flex-wrap gap-2">
                <Button text="Back" className="bg-gray-200 hover:bg-gray-100" onClick={() => safeBack(navigate)} />
            </div>
            <section className="mx-5 md:mx-30 space-y-6">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Manage users</h1>
                        <p className="text-sm text-gray-500">Promote athletes to athletic trainers or revert them.</p>
                    </div>
                </div>

                {messageBanner}

                <div className="flex w-fit border rounded-sm shadow-md">
                    <Button
                        text="Pending"
                        className="flex-1 border-0 border-r rounded-l-none rounded-r-none"
                        onClick={() => setView("pending")}
                        style={{backgroundColor: view === "pending" ? "var(--purple)" : "",
                            color: view === "pending" ? "white" : "black"}}
                    />
                    <Button
                        text="Active"
                        className="flex-1 border-0 rounded-l-none rounded-r-none"
                        onClick={() => setView("active")}
                        style={{backgroundColor: view === "active" ? "var(--purple)" : "",
                            color: view === "active" ? "white" : "black"}}
                    />
                </div>

                {view === "pending" ? (
                    <div className="rounded border bg-white p-4 shadow-sm space-y-4">
                        <div>
                            <p className="text-lg font-semibold text-gray-800">Pending requests</p>
                            <p className="text-sm text-gray-500">Users coming through Okta who need role assignment.</p>
                        </div>
                        {loading ? (
                            <p className="text-sm text-gray-600">Loading pending requests...</p>
                        ) : pendingUsers.length === 0 ? (
                            <p className="text-sm text-gray-600">No pending requests.</p>
                        ) : (
                            <ul className="space-y-3">
                                {pendingUsers.map((user) => {
                                    const selectedRole = pendingRoleMap[user.id] ?? "ATHLETE";
                                    const isBusy = updatingUserId === user.id;
                                    return (
                                        <li
                                            key={user.id}
                                            className="flex flex-col gap-3 border px-4 py-3 rounded md:flex-row md:items-center md:justify-between"
                                        >
                                            <div>
                                                <p className="font-semibold text-gray-900">
                                                    {user.firstName} {user.lastName}
                                                </p>
                                                <p className="text-sm text-gray-600">{user.email}</p>
                                            </div>
                                            <div className="flex flex-wrap items-center gap-2">
                                                <select
                                                    value={selectedRole}
                                                    onChange={(event) => handlePendingRoleChange(user.id, event.target.value as "AT" | "ATHLETE")}
                                                    className="rounded border border-gray-300 px-2 py-1 text-sm"
                                                >
                                                    <option value="ATHLETE">Athlete</option>
                                                    <option value="AT">Trainer (AT)</option>
                                                </select>
                                                <Button
                                                    text={isBusy ? "Approving…" : "Approve"}
                                                    className="bg-primary text-white hover:bg-primary-hover"
                                                    onClick={() => handleApproveStudent(user.id)}
                                                    disabled={isBusy}
                                                />
                                            </div>
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                    </div>
                ) : (
                    <div className="rounded border bg-white p-4 shadow-sm">
                        {loading ? (
                            <p>Loading users...</p>
                        ) : activeUsers.length === 0 ? (
                            <p>No active users yet.</p>
                        ) : (
                            <ul className="space-y-3">
                                {activeUsers.map((user) => {
                                    const isTrainer = user.role === "AT";
                                    const isAdmin = user.role === "ADMIN";
                                    const disableChange = updatingUserId === user.id;
                                    return (
                                        <li
                                            key={user.id}
                                            className="flex flex-col gap-3 rounded border px-4 py-3 md:flex-row md:items-center md:justify-between"
                                        >
                                            <div>
                                                <p className="font-semibold text-gray-900">
                                                    {user.firstName} {user.lastName}
                                                </p>
                                                <p className="text-sm text-gray-600">{user.email}</p>
                                                <p className="text-sm text-gray-700">
                                                    Current role: {formatRoleLabel(user.role)}
                                                </p>
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                                <Button
                                                    text="Make AT"
                                                    className={`border ${isTrainer ? "bg-gray-100 text-gray-400 cursor-not-allowed" : "bg-primary text-white hover:bg-primary-hover"}`}
                                                    onClick={() => !isTrainer && handleRoleChange(user.id, "AT")}
                                                    disabled={isTrainer || disableChange}
                                                />
                                                <Button
                                                    text="Revert to athlete"
                                                    className={`border ${isTrainer ? "bg-white text-gray-700 hover:bg-gray-50" : "bg-gray-100 text-gray-400 cursor-not-allowed"}`}
                                                    onClick={() => isTrainer && handleRoleChange(user.id, "ATHLETE")}
                                                    disabled={!isTrainer || disableChange}
                                                />
                                                <Button
                                                    text="Make admin"
                                                    className={`border ${isAdmin ? "bg-gray-100 text-gray-400 cursor-not-allowed" : "bg-red-500 text-white hover:bg-red-600"}`}
                                                    onClick={() => !isAdmin && handleMakeAdmin(user.id)}
                                                    disabled={isAdmin || disableChange}
                                                />
                                            </div>
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                    </div>
                )}
            </section>
        </>

    );
}
