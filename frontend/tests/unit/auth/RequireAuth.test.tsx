import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { AuthProvider } from "../../../src/auth/AuthContext.tsx";
import RequireAuth from "../../../src/auth/RequireAuth.tsx";
import type { User } from "../../../src/types.ts";

function authResponse(ok: boolean, user?: User): Response {
    return {
        ok,
        json: vi.fn().mockResolvedValue(user),
    } as unknown as Response;
}

function ProtectedApp() {
    // Route tree includes a guarded and public route
    return (
        <MemoryRouter initialEntries={["/private"]}>
            <AuthProvider>
                <Routes>
                    <Route path="/" element={<div>Public page</div>} />
                    <Route
                        path="/private"
                        element={
                            <RequireAuth>
                                <div>Private page</div>
                            </RequireAuth>
                        }
                    />
                </Routes>
            </AuthProvider>
        </MemoryRouter>
    );
}

describe("RequireAuth", () => {
    it("shows loading UI while auth status is being checked", () => {
        // Never resolving fetch keeps auth in loading state
        vi.stubGlobal("fetch", vi.fn().mockReturnValue(new Promise(() => undefined)));

        render(<ProtectedApp />);

        expect(screen.getByText("Loading your session")).toBeInTheDocument();
    });

    it("redirects unauthenticated users to the fallback route", async () => {
        // Non ok auth response should redirect to public page
        vi.stubGlobal("fetch", vi.fn().mockResolvedValue(authResponse(false)));

        render(<ProtectedApp />);

        await waitFor(() => expect(screen.getByText("Public page")).toBeInTheDocument());
        expect(screen.queryByText("Private page")).not.toBeInTheDocument();
    });

    it("renders children for authenticated users", async () => {
        // Valid auth response should allow protected content
        const user: User = {
            id: "u1",
            email: "test@example.com",
            username: "tester",
            firstName: "Test",
            lastName: "User",
            role: "ATHLETE",
        };
        vi.stubGlobal("fetch", vi.fn().mockResolvedValue(authResponse(true, user)));

        render(<ProtectedApp />);

        await waitFor(() => expect(screen.getByText("Private page")).toBeInTheDocument());
        expect(screen.queryByText("Public page")).not.toBeInTheDocument();
    });
});
