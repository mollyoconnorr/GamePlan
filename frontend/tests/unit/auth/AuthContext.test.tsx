import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { Component, type PropsWithChildren } from "react";
import { describe, expect, it, vi } from "vitest";
import { AuthProvider, useAuth, useAuthedUser } from "../../../src/auth/AuthContext.tsx";
import type { User } from "../../../src/types.ts";
import { SESSION_INVALIDATED_EVENT } from "../../../src/api/apiFetch.ts";

function authResponse(ok: boolean, user?: User): Response {
    return {
        ok,
        json: vi.fn().mockResolvedValue(user),
    } as unknown as Response;
}

function AuthProbe() {
    // Probe exposes context state to assertions
    const { loading, user, sessionMessage, refresh } = useAuth();

    return (
        <div>
            <div data-testid="loading">{String(loading)}</div>
            <div data-testid="username">{user?.username ?? "none"}</div>
            <div data-testid="session-message">{sessionMessage ?? "none"}</div>
            <button type="button" onClick={() => void refresh()}>
                refresh
            </button>
        </div>
    );
}

function UseAuthOutsideProvider() {
    // Calling useAuth without provider should throw
    useAuth();
    return null;
}

function UserProbe() {
    const { loading, user } = useAuth();
    if (loading || !user) return <div>pending</div>;

    return <AuthedInner />;
}

function NullUserProbe() {
    // Wait for loading to finish before invoking strict hook
    const { loading } = useAuth();
    if (loading) return <div>pending</div>;

    return <AuthedInner />;
}

function AuthedInner() {
    const user = useAuthedUser();
    return <div data-testid="authed-user">{user.username}</div>;
}

type BoundaryState = {
    error: Error | null;
};

class ErrorBoundary extends Component<PropsWithChildren, BoundaryState> {
    state: BoundaryState = {
        error: null,
    };

    static getDerivedStateFromError(error: Error): BoundaryState {
        return { error };
    }

    render() {
        if (this.state.error) {
            return <div data-testid="error">{this.state.error.message}</div>;
        }

        return this.props.children;
    }
}

describe("AuthContext", () => {
    it("throws when useAuth is used outside AuthProvider", () => {
        expect(() => render(<UseAuthOutsideProvider />)).toThrow("useAuth must be used within the AuthProvider");
    });

    it("loads the user from /api/user on mount", async () => {
        // Initial mount triggers a refresh call
        const user: User = {
            id: "u1",
            email: "test@example.com",
            username: "tester",
            firstName: "Test",
            lastName: "User",
            role: "ATHLETE",
        };
        vi.stubGlobal("fetch", vi.fn().mockResolvedValue(authResponse(true, user)));

        render(
            <AuthProvider>
                <AuthProbe />
            </AuthProvider>,
        );

        await waitFor(() => expect(screen.getByTestId("loading")).toHaveTextContent("false"));
        expect(screen.getByTestId("username")).toHaveTextContent("tester");
    });

    it("sets user to null when /api/user returns a non-OK response", async () => {
        vi.stubGlobal("fetch", vi.fn().mockResolvedValue(authResponse(false)));

        render(
            <AuthProvider>
                <AuthProbe />
            </AuthProvider>,
        );

        await waitFor(() => expect(screen.getByTestId("loading")).toHaveTextContent("false"));
        expect(screen.getByTestId("username")).toHaveTextContent("none");
    });

    it("sets user to null when /api/user throws", async () => {
        vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network issue")));

        const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
        render(
            <AuthProvider>
                <AuthProbe />
            </AuthProvider>,
        );

        await waitFor(() => expect(screen.getByTestId("loading")).toHaveTextContent("false"));
        expect(screen.getByTestId("username")).toHaveTextContent("none");
        expect(consoleErrorSpy).toHaveBeenCalled();
    });

    it("refresh updates the user state", async () => {
        // Second call verifies refresh can replace stale user data
        const firstUser: User = {
            id: "u1",
            email: "first@example.com",
            username: "first",
            firstName: "First",
            lastName: "User",
            role: "ATHLETE",
        };
        const secondUser: User = {
            id: "u2",
            email: "second@example.com",
            username: "second",
            firstName: "Second",
            lastName: "User",
            role: "ATHLETE",
        };
        const fetchMock = vi
            .fn()
            .mockResolvedValueOnce(authResponse(true, firstUser))
            .mockResolvedValueOnce(authResponse(true, secondUser));
        vi.stubGlobal("fetch", fetchMock);

        render(
            <AuthProvider>
                <AuthProbe />
            </AuthProvider>,
        );

        await waitFor(() => expect(screen.getByTestId("username")).toHaveTextContent("first"));
        fireEvent.click(screen.getByRole("button", { name: "refresh" }));
        await waitFor(() => expect(screen.getByTestId("username")).toHaveTextContent("second"));
        expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it("shows a session message and clears the user when the session is invalidated", async () => {
        const user: User = {
            id: "u1",
            email: "test@example.com",
            username: "tester",
            firstName: "Test",
            lastName: "User",
            role: "ATHLETE",
        };
        vi.stubGlobal("fetch", vi.fn().mockResolvedValue(authResponse(true, user)));

        render(
            <AuthProvider>
                <AuthProbe />
            </AuthProvider>,
        );

        await waitFor(() => expect(screen.getByTestId("username")).toHaveTextContent("tester"));

        window.dispatchEvent(new CustomEvent(SESSION_INVALIDATED_EVENT, {
            detail: { message: "Your role changed. Please sign in again." },
        }));

        await waitFor(() => expect(screen.getByTestId("username")).toHaveTextContent("none"));
        expect(screen.getByTestId("session-message")).toHaveTextContent("Your role changed. Please sign in again.");
        expect(screen.getAllByText("Your role changed. Please sign in again.").length).toBeGreaterThan(0);
    });

    it("useAuthedUser returns a non-null user when authenticated", async () => {
        const user: User = {
            id: "u1",
            email: "test@example.com",
            username: "tester",
            firstName: "Test",
            lastName: "User",
            role: "ATHLETE",
        };
        vi.stubGlobal("fetch", vi.fn().mockResolvedValue(authResponse(true, user)));

        render(
            <AuthProvider>
                <UserProbe />
            </AuthProvider>,
        );

        await waitFor(() => expect(screen.getByTestId("authed-user")).toHaveTextContent("tester"));
    });

    it("useAuthedUser throws when user is null after auth check completes", async () => {
        vi.stubGlobal("fetch", vi.fn().mockResolvedValue(authResponse(false)));
        const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);

        render(
            <AuthProvider>
                <ErrorBoundary>
                    <NullUserProbe />
                </ErrorBoundary>
            </AuthProvider>,
        );

        await waitFor(() =>
            expect(screen.getByTestId("error")).toHaveTextContent("useAuthedUser must be used within RequireAuth"),
        );
        expect(consoleErrorSpy).toHaveBeenCalled();
    });
});
