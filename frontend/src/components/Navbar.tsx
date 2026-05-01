import {useState} from "react";
import {Menu, X, CircleUserRound, LogOut,Calendar1} from "lucide-react";
import type {hamProps, NavbarProps} from "../types.ts";
import {useLocation, useNavigate} from "react-router-dom";

/**
 * Renders the Navbar view.
 */
export default function Navbar({ username, logout }: NavbarProps) {
    const navigate = useNavigate();
    const location = useLocation();

    // Tracks when to display hamburger menu
    const [displayHamMenu, setDisplayHamMenu] = useState(false);

    const isHome = location.pathname === "/app/home";
    const isProfile = location.pathname === "/app/profile";
    /**
     * Processes the sign out interaction and updates the affected UI state.
     */
    const handleSignOut = () => {
        setDisplayHamMenu(false);

        // Prefer client-side route so the styled /logout page renders first
        if (location.pathname !== "/logout") {
            navigate("/logout");
            return;
        }

        // Fallback to direct backend logout if already on logout route
        logout();
    };

    let navHTML;
    if (username) {
        // Nav options / icons to display / actions on click of item
        const navItems = [
            {
                label: "Calendar",
                Icon: Calendar1,
                action: () => {
                    navigate("/app/home");
                    setDisplayHamMenu(false);
                },
                underline: isHome,
            },
            {
                label: username,
                Icon: CircleUserRound,
                action: () => {
                    navigate("/app/profile");
                    setDisplayHamMenu(false);
                },
                underline: isProfile },
            { label: "Sign out", Icon: LogOut, action: handleSignOut, underline: false }
        ];

        // Turn above list into HTML
        navHTML = navItems.map(({ label, Icon, action, underline }) => (
            <div
                key={label}
                className={`flex items-center gap-2 font-bold p-2 hover:underline hover:cursor-pointer text-lg ${
                    underline ? "underline" : ""
                }`}
                onClick={action ?? undefined}
            >
                <Icon size={20} />
                <span>{label}</span>
            </div>
        ));
    }

    return <header>
        <nav className="bg-primary text-white w-full p-5 flex shadow-md">
            <h1 className="font-extrabold text-3xl md:text-5xl hover:cursor-pointer"
            onClick={() => navigate("/")}
            >GamePlan</h1>
            <div className="hidden lg:flex h-full items-baseline space-x-10 md:space-x-15 ml-auto mr-10">
                {navHTML}
            </div>
            {!displayHamMenu && <button
                onClick={() => setDisplayHamMenu(true)}
                className="lg:hidden w-full"
                aria-label="Open navigation menu"
            >
                {/*Hide nav menu when ham menu is displayed*/}
                <Menu className="ml-auto mr-3 size-10 hover:cursor-pointer"/>
            </button>}
            {navHTML && <HamMenu
                navHTML={navHTML}
                display={displayHamMenu}
                setDisplay={setDisplayHamMenu}
            />}
        </nav>
    </header>;
};

/**
 * Renders the HamMenu view.
 */
function HamMenu({navHTML, display, setDisplay} : hamProps) {
    if (!display){
        return null; // Return nothing if not display
    }

    return (
        <>
            <div
                // Allow user to click out of menu to hide it
                onClick={() => setDisplay(false)}
                className="fixed bg-black/20 top-0 left-0 w-full h-full z-9999">
            </div>
            <nav
                className="bg-primary fixed top-0 right-0 flex flex-col h-full
        border-black border-l-2 p-2 animate-slide-in space-y-5 z-9999"
            >
                <button onClick={() => setDisplay(false)}
                        className="ml-auto mr-2 mt-3"
                ><X size={30} className="hover:cursor-pointer"/></button>
                <div className="pr-12 pl-5 space-y-5">
                    {navHTML}
                </div>
            </nav>
        </>
    );
}
