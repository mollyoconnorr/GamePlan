import {useState} from "react";
import {Menu, X, CircleUserRound, LogOut} from "lucide-react";
import type {hamProps} from "../types.ts";

export default function Navbar() {
    // Nav options / icons to display
    const navItems = [
        { label: "Profile", Icon: CircleUserRound },
        { label: "Sign out", Icon: LogOut },
    ];

    // Turn above list into HTML
    const navHTML = navItems.map(({ label, Icon }) => (
        <div
            key={label}
            className="flex items-center gap-2 font-bold p-2 hover:underline hover:cursor-pointer text-lg"
        >
            <Icon size={20} />
            <span>{label}</span>
        </div>
    ));

    // Tracks when to display hamburger menu
    const [displayHamMenu, setDisplayHamMenu] = useState(false);

    return <header>
        <nav className="bg-primary text-white w-full p-5 flex shadow-md">
            <h1 className="font-extrabold text-3xl md:text-5xl hover:cursor-pointer">GamePlan</h1>
            <div className="hidden sm:flex h-full items-baseline space-x-10 md:space-x-20 ml-auto mr-10">
                {navHTML}
            </div>
            {!displayHamMenu && <button
                onClick={() => setDisplayHamMenu(true)}
                className="sm:hidden w-full"
                aria-label="Open navigation menu"
            >
                {/*Hide nav menu when ham menu is displayed*/}
                <Menu className="sm:hidden ml-auto mr-3 size-10 hover:cursor-pointer"/>
            </button>}
            <HamMenu
                navHTML={navHTML}
                display = {displayHamMenu}
                setDisplay = {setDisplayHamMenu}
            />
        </nav>
    </header>;
};

function HamMenu({navHTML, display, setDisplay} : hamProps) {
    if (!display){
        return null; // Return nothing if not display
    }

    return (
        <>
            <div
                // Allow user to click out of menu to hide it
                onClick={() => setDisplay(false)}
                className="fixed bg-black/20 top-0 left-0 w-full h-full">
            </div>
            <nav
                className="bg-primary fixed top-0 right-0 flex flex-col h-full
        border-black border-l-2 p-2 animate-slide-in space-y-5"
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