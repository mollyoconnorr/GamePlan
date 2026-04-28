import {useCallback, useEffect, useMemo, useState} from "react";
import {fetchAdminUsers, updateUserRole} from "../api/Admin.ts";
import type {AdminUser} from "../types.ts";
import Button from "../components/Button.tsx";
import ConfirmDialog from "../components/ConfirmDialog.tsx";
import {useNavigate} from "react-router-dom";
import {safeBack} from "../util/Navigation.ts";
import {useAuth} from "../auth/AuthContext.tsx";
import {APP_DATA_CHANGED_EVENT, type AppDataChangedDetail, dispatchAppDataChanged} from "../util/AppDataEvents.ts";

/**
 * Renders the AdminUsers view.
 */
export default function AdminUsers() {
    const navigate = useNavigate();
    const { user: currentUser } = useAuth();

    const [users, setUsers] = useState<AdminUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [updatingUserId, setUpdatingUserId] = useState<number | null>(null);
    const [feedback, setFeedback] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [pendingRoleMap, setPendingRoleMap] = useState<Record<number, "ATHLETE" | "AT">>({});
    const [confirmDialog, setConfirmDialog] = useState<{
        kind: "notApprove" | "makeAdmin" | "makeAthlete" | "makeStudent";
        userId: number;
        userLabel: string;
        targetRole?: "AT" | "ATHLETE" | "ADMIN" | "STUDENT";
    } | null>(null);

    const loadUsers = useCallback(async (silent = false) => {
        if (!silent) {
            setLoading(true);
        }
        try {
            const list = await fetchAdminUsers();
            setUsers(list);
        } catch (err) {
            console.error(err);
        } finally {
            if (!silent) {
                setLoading(false);
            }
        }
    }, []);

    useEffect(() => {
        void loadUsers();
    }, [loadUsers]);

    useEffect(() => {
        let active = true;
        /**
         * Refreshes the user list in the background so approval badges and role changes stay current.
         */
        const refreshUsers = () => {
            if (document.visibilityState !== "visible") {
                return;
            }

            void loadUsers(true).catch((error) => {
                if (!active) return;
                console.error(error);
            });
        };

        const intervalId = window.setInterval(refreshUsers, 30_000);
        window.addEventListener("focus", refreshUsers);
        document.addEventListener("visibilitychange", refreshUsers);

        return () => {
            active = false;
            window.clearInterval(intervalId);
            window.removeEventListener("focus", refreshUsers);
            document.removeEventListener("visibilitychange", refreshUsers);
        };
    }, [loadUsers]);

    useEffect(() => {
        /**
         * Reacts to cross-page user updates, such as another admin creating or approving a user.
         */
        const handleDataChanged = (event: Event) => {
            const detail = (event as CustomEvent<AppDataChangedDetail>).detail;
            if (!detail || detail.kind !== "users") {
                return;
            }

            void loadUsers(true);
        };

        window.addEventListener(APP_DATA_CHANGED_EVENT, handleDataChanged);
        return () => window.removeEventListener(APP_DATA_CHANGED_EVENT, handleDataChanged);
    }, [loadUsers]);

    useEffect(() => {
        if (!feedback) {
            return;
        }
       const timer = setTimeout(() => setFeedback(null), 4500);
        return () => clearTimeout(timer);
    }, [feedback]);

    /**
     * Persists a role change and reloads users so pending flags and auth versions reflect backend state.
     */
    const handleRoleChange = async (userId: number, role: "AT" | "ATHLETE" | "ADMIN" | "STUDENT") => {
        setUpdatingUserId(userId);
        try {
            await updateUserRole(userId, role);
            setFeedback(`Updated user to ${role === "AT" ? "athletic trainer" : role === "ADMIN" ? "admin" : role === "STUDENT" ? "student" : "athlete"}.`);
            await loadUsers();
            dispatchAppDataChanged("users");
        } catch (err) {
            const message = err instanceof Error ? err.message : "Failed to update role";
            setFeedback(message);
        } finally {
            setUpdatingUserId(null);
        }
    };

    /**
     * Approves a pending student using the role selected in that row.
     */
    const handleApproveStudent = (userId: number) => handleRoleChange(userId, pendingRoleMap[userId] ?? "ATHLETE");

    /**
     * Opens the shared confirmation dialog for potentially disruptive role changes.
     */
    const openConfirmDialog = (dialog: NonNullable<typeof confirmDialog>) => setConfirmDialog(dialog);

    /**
     * Closes the confirm dialog flow and clears temporary state.
     */
    const closeConfirmDialog = () => setConfirmDialog(null);

    /**
     * Applies the role change selected in the confirmation dialog.
     */
    const handleConfirmedDialog = async () => {
        if (!confirmDialog) {
            return;
        }

        const { userId, targetRole } = confirmDialog;
        closeConfirmDialog();

        if (!targetRole) {
            return;
        }

        await handleRoleChange(userId, targetRole);
    };

    /**
     * Stores the role an admin selected for a pending student before approval.
     */
    const handlePendingRoleChange = (userId: number, role: "AT" | "ATHLETE") => {
        setPendingRoleMap((prev) => ({ ...prev, [userId]: role }));
    };

    /**
     * Starts the confirmation flow for granting admin access.
     */
    const handleMakeAdmin = (userId: number, userLabel: string) => {
        openConfirmDialog({
            kind: "makeAdmin",
            userId,
            userLabel,
            targetRole: "ADMIN",
        });
    };

    /**
     * Starts the confirmation flow for changing a user to athlete access.
     */
    const handleMakeAthlete = (userId: number, userLabel: string) => {
        openConfirmDialog({
            kind: "makeAthlete",
            userId,
            userLabel,
            targetRole: "ATHLETE",
        });
    };

    /**
     * Starts the confirmation flow for moving a user back to student access.
     */
    const handleMakeStudent = (userId: number, userLabel: string) => {
        openConfirmDialog({
            kind: "makeStudent",
            userId,
            userLabel,
            targetRole: "STUDENT",
        });
    };

    /**
     * Formats role label for display.
     */
    const formatRoleLabel = (role?: string) => {
        if (!role) {
            return "Unknown";
        }
        const normalized = role.toLowerCase();
        return normalized.charAt(0).toUpperCase() + normalized.slice(1);
    };

    const pendingUsers = useMemo(() => users.filter((user) => user.pendingApproval), [users]);
    const activeUsers = useMemo(() => users.filter((user) => !user.pendingApproval), [users]);
    const [view, setView] = useState<"pending" | "active">("pending");
    const [activeRoleFilter, setActiveRoleFilter] = useState<"ALL" | "STUDENT" | "ATHLETE" | "AT" | "ADMIN">("ALL");
    const normalizedSearchQuery = searchQuery.trim().toLowerCase();

    const matchesSearchQuery = useCallback((user: AdminUser) => {
        if (!normalizedSearchQuery) {
            return true;
        }

        return [
            user.firstName,
            user.lastName,
            `${user.firstName} ${user.lastName}`,
            user.email,
            user.role,
            formatRoleLabel(user.role),
        ].some((value) => value.toLowerCase().includes(normalizedSearchQuery));
    }, [normalizedSearchQuery]);

    const filteredPendingUsers = useMemo(
        () => pendingUsers.filter(matchesSearchQuery),
        [matchesSearchQuery, pendingUsers]
    );

    const filteredActiveUsers = useMemo(() => {
        const roleFilteredUsers = activeRoleFilter === "ALL"
            ? activeUsers
            : activeUsers.filter((user) => user.role === activeRoleFilter);

        return roleFilteredUsers.filter(matchesSearchQuery);
    }, [activeRoleFilter, activeUsers, matchesSearchQuery]);

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
                <Button
                    text="Back"
                    className="bg-gray-300 hover:bg-gray-200 mb-7 md:mb-2"
                    onClick={() => safeBack(navigate)}
                />
            </div>
            <section className="mx-5 md:mx-30 space-y-6">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Manage users</h1>
                        <p className="text-sm text-gray-500">Promote athletes to athletic trainers, admins, or move students in and out of pending approval.</p>
                    </div>
                </div>

                {messageBanner}

                <div className="max-w-xl">
                    <label className="sr-only" htmlFor="admin-user-search">Search users</label>
                    <input
                        id="admin-user-search"
                        type="search"
                        value={searchQuery}
                        onChange={(event) => setSearchQuery(event.target.value)}
                        placeholder="Search by name, email, or role"
                        className="w-full rounded border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                </div>

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
                        <p className="text-sm text-gray-500">Users coming through Okta who still need role assignment or a decision.</p>
                        </div>
                        {loading ? (
                            <p className="text-sm text-gray-600">Loading pending requests...</p>
                        ) : pendingUsers.length === 0 ? (
                            <p className="text-sm text-gray-600">No pending requests.</p>
                        ) : filteredPendingUsers.length === 0 ? (
                            <p className="text-sm text-gray-600">No pending requests match your search.</p>
                        ) : (
                            <ul className="space-y-3">
                                {filteredPendingUsers.map((user) => {
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
                                                    <option value="AT">Athletic Trainer (AT)</option>
                                                </select>
                                                <Button
                                                    text={isBusy ? "Approving…" : "Approve"}
                                                    className="bg-primary text-white hover:bg-primary-hover"
                                                    onClick={() => handleApproveStudent(user.id)}
                                                    disabled={isBusy}
                                                />
                                                <Button
                                                    text="Not approve"
                                                    className="bg-white text-gray-700 hover:bg-gray-50 border border-gray-300"
                                                    onClick={() => openConfirmDialog({
                                                        kind: "notApprove",
                                                        userId: user.id,
                                                        userLabel: `${user.firstName} ${user.lastName}`,
                                                        targetRole: "STUDENT",
                                                    })}
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
                        <div className="mb-4 flex flex-wrap gap-2">
                            {(["ALL", "STUDENT", "ATHLETE", "AT", "ADMIN"] as const).map((roleFilter) => (
                                <Button
                                    key={roleFilter}
                                    text={roleFilter === "ALL" ? "All" : formatRoleLabel(roleFilter)}
                                    className="border-0 rounded"
                                    onClick={() => setActiveRoleFilter(roleFilter)}
                                    style={{
                                        backgroundColor: activeRoleFilter === roleFilter ? "var(--purple)" : "",
                                        color: activeRoleFilter === roleFilter ? "white" : "black",
                                    }}
                                />
                            ))}
                        </div>

                        {loading ? (
                            <p>Loading users...</p>
                        ) : activeUsers.length === 0 ? (
                            <p>No active users yet.</p>
                        ) : filteredActiveUsers.length === 0 ? (
                            <p>No active users match your filters.</p>
                        ) : (
                            <ul className="space-y-3">
                                {filteredActiveUsers.map((user) => {
                                    const isTrainer = user.role === "AT";
                                    const isAthlete = user.role === "ATHLETE";
                                    const isAdmin = user.role === "ADMIN";
                                    const isSelf = currentUser?.username === user.oidcUserId;
                                    const disableChange = updatingUserId === user.id || isSelf;
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
                                                {user.role === "STUDENT" && (
                                                    <p className="text-xs text-amber-700">
                                                        Student account{user.pendingApproval ? " (pending approval)" : ""}
                                                    </p>
                                                )}
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                                <Button
                                                    text="Make AT"
                                                    className={`border ${isTrainer ? "bg-gray-100 text-gray-400 cursor-not-allowed" : "bg-primary text-white hover:bg-primary-hover"}`}
                                                    onClick={() => !isTrainer && handleRoleChange(user.id, "AT")}
                                                    disabled={isTrainer || disableChange}
                                                />
                                                <Button
                                                    text={user.role === "STUDENT" ? "Make athlete" : isAthlete ? "Athlete" : "Revert to athlete"}
                                                    className={`border ${
                                                        isAthlete
                                                            ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                                                            : user.role === "STUDENT"
                                                            ? "bg-primary text-white hover:bg-primary-hover"
                                                            : "bg-white text-gray-700 hover:bg-gray-50"
                                                    }`}
                                                    onClick={() => !isAthlete && !disableChange && handleMakeAthlete(user.id, `${user.firstName} ${user.lastName}`)}
                                                    disabled={isAthlete || disableChange}
                                                />
                                                <Button
                                                    text="Make admin"
                                                    className={`border ${isAdmin ? "bg-gray-100 text-gray-400 cursor-not-allowed" : "bg-red-500 text-white hover:bg-red-600"}`}
                                                    onClick={() => !isAdmin && handleMakeAdmin(user.id, `${user.firstName} ${user.lastName}`)}
                                                    disabled={isAdmin || disableChange}
                                                />
                                                {user.role !== "STUDENT" ? (
                                                    <Button
                                                        text="Revert to student"
                                                        className={`border ${isSelf ? "bg-gray-100 text-gray-400 cursor-not-allowed" : "bg-white text-gray-700 hover:bg-gray-50"}`}
                                                        onClick={() => !disableChange && handleMakeStudent(user.id, `${user.firstName} ${user.lastName}`)}
                                                        disabled={disableChange}
                                                    />
                                                ) : null}
                                            </div>
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                    </div>
                )}
            </section>

            <ConfirmDialog
                open={confirmDialog !== null}
                title={
                    confirmDialog?.kind === "makeAdmin"
                        ? "Make this user an admin?"
                        : confirmDialog?.kind === "notApprove"
                            ? "Keep as student?"
                            : confirmDialog?.kind === "makeAthlete"
                                ? "Change role to athlete?"
                                : confirmDialog?.kind === "makeStudent"
                                    ? "Change role to student?"
                                : "Confirm role change"
                }
                description={
                    confirmDialog?.kind === "makeAdmin"
                        ? `This will give ${confirmDialog.userLabel} admin access.`
                        : confirmDialog?.kind === "notApprove"
                            ? `This will keep ${confirmDialog.userLabel} as a student and remove them from pending requests.`
                            : confirmDialog?.kind === "makeAthlete"
                                ? `This will change ${confirmDialog.userLabel} to athlete access.`
                                : confirmDialog?.kind === "makeStudent"
                                    ? `This will change ${confirmDialog.userLabel} back to student access.`
                                : "Confirm this role change."
                }
                confirmLabel="Confirm"
                tone={confirmDialog?.kind === "makeAdmin" ? "danger" : "primary"}
                onConfirm={handleConfirmedDialog}
                onCancel={closeConfirmDialog}
            />
        </>

    );
}
