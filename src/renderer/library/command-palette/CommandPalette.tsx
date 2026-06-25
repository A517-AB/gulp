import {useEffect} from "react";
import {
    KBarAnimator,
    KBarPortal,
    KBarPositioner,
    KBarResults,
    KBarSearch,
    useKBar,
    useMatches,
    useRegisterActions,
} from "kbar";
import {useNavigate} from "react-router";
import {mainNavRoutes, secretNavRoutes} from "@renderer/router";
import {matchesShortcut} from "@renderer/base/keyboard";
import {fleetActions, sessionActions, systemActions} from "./registry";

function Results() {
    const {results} = useMatches();

    return (
        <KBarResults
            items={results}
            onRender={({item, active}) => {
                if (typeof item === "string") {
                    return (
                        <div className="px-3 py-1.5 text-3xs font-mono uppercase tracking-widest text-fg-ghost">
                            {item}
                        </div>
                    );
                }
                return (
                    <div
                        className={`flex items-center justify-between px-3 py-2 cursor-pointer transition-colors ${
                            active ? "bg-hover text-fg-primary" : "text-fg-muted"
                        }`}
                    >
                        <span className="text-xs font-mono">{item.name}</span>
                        {item.shortcut && item.shortcut.length > 0 && (
                            <div className="flex items-center gap-1">
                                {item.shortcut.map((k) => (
                                    <kbd
                                        key={k}
                                        className="px-1.5 py-0.5 rounded text-2xs font-mono bg-active text-fg-secondary border border-hair"
                                    >
                                        {k}
                                    </kbd>
                                ))}
                            </div>
                        )}
                    </div>
                );
            }}
        />
    );
}

function NavActions() {
    const navigate = useNavigate();
    const allRoutes = [...mainNavRoutes, ...secretNavRoutes];

    const actions = allRoutes
        .filter((r) => r.handle?.title)
        .map((r) => {
            return ({
                id: `nav-${r.path ?? "home"}`,
                name: r.handle!.title,
                section: "Navigation" as const,
                perform: () => {
                    const path = r.index ? "/" : `/${r.path ?? ""}`;
                    void navigate(path);
                },
            });
        });

    useRegisterActions(actions, [navigate]);
    return null;
}

function StaticActions() {
    useRegisterActions([...systemActions, ...fleetActions, ...sessionActions], []);
    return null;
}

const PALETTE_SHORTCUT = "ctrl+space";

function ShortcutHandler() {
    const {query} = useKBar();
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (matchesShortcut(e, PALETTE_SHORTCUT)) {
                e.preventDefault();
                query.toggle();
            }
        };
        window.addEventListener("keydown", handler);
        return () => {
            window.removeEventListener("keydown", handler);
        };
    }, [query]);
    return null;
}

export function CommandPalette() {
    return (
        <KBarPortal>
            <KBarPositioner className="z-[9999] bg-black/40 backdrop-blur-sm flex items-start justify-center pt-[20vh]">
                <KBarAnimator
                    className="w-full max-w-xl rounded-xl border border-subtle bg-overlay shadow-2xl overflow-hidden">
                    <KBarSearch
                        className="w-full px-4 py-3 text-sm font-mono bg-transparent text-fg-primary placeholder:text-fg-ghost outline-none border-b border-hair"
                        defaultPlaceholder="Search commands…"
                    />
                    <div className="max-h-72 overflow-y-auto pb-2">
                        <Results/>
                    </div>
                </KBarAnimator>
            </KBarPositioner>
        </KBarPortal>
    );
}

export function CommandPaletteActions() {
    return (
        <>
            <ShortcutHandler/>
            <NavActions/>
            <StaticActions/>
        </>
    );
}
