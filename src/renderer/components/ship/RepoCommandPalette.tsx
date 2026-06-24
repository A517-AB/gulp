import {useEffect, useRef, useState} from "react";
import {AnimatePresence, motion} from "framer-motion";
import {Check, Search} from "lucide-react";
import {cn} from "@/utils";

export interface RepoPaletteItem {
    id: string;
    repo: string;
}

interface RepoCommandPaletteProps {
    items: RepoPaletteItem[];
    value: string;
    onChange: (id: string) => void;
    open?: boolean;
    onClose?: () => void;
}

export function RepoCommandPalette({items, value, onChange, open: controlledOpen, onClose}: RepoCommandPaletteProps) {
    const [internalOpen, setInternalOpen] = useState(false);
    const open = controlledOpen ?? internalOpen;
    const setOpen = (v: boolean | ((prev: boolean) => boolean)) => {
        const next = typeof v === 'function' ? v(controlledOpen ?? internalOpen) : v;
        setInternalOpen(next);
        if (!next) onClose?.();
    };
    const [query, setQuery] = useState("");
    const [cursor, setCursor] = useState(0);
    const inputRef   = useRef<HTMLInputElement>(null);
    const listRef    = useRef<HTMLDivElement>(null);
    const paletteRef = useRef<HTMLDivElement>(null);

    const filtered   = items.filter(i => i.repo.toLowerCase().includes(query.toLowerCase()));
    const safeCursor = Math.min(cursor, Math.max(0, filtered.length - 1));

    // Ctrl+ArrowDown to toggle, Escape to close
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.ctrlKey && e.key === "ArrowDown") {
                e.preventDefault();
                setOpen(o => { if (!o) { setQuery(""); setCursor(0); } return !o; });
                return;
            }
            if (e.key === "Escape") { setOpen(false); }
        };
        document.addEventListener("keydown", onKey);
        return () => { document.removeEventListener("keydown", onKey); };
    }, []);

    // Close on outside mousedown without consuming the click
    useEffect(() => {
        if (!open) return;
        const onDown = (e: MouseEvent) => {
            if (!paletteRef.current?.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener("mousedown", onDown);
        return () => { document.removeEventListener("mousedown", onDown); };
    }, [open]);

    useEffect(() => {
        if (open) requestAnimationFrame(() => { inputRef.current?.focus(); });
    }, [open]);

    useEffect(() => {
        listRef.current?.querySelector<HTMLElement>("[data-active='true']")?.scrollIntoView({block: "nearest"});
    }, [safeCursor]);

    const select = (id: string) => { onChange(id); setOpen(false); setQuery(""); };

    const onKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "ArrowDown")      { e.preventDefault(); setCursor(c => Math.min(c + 1, filtered.length - 1)); }
        else if (e.key === "ArrowUp")   { e.preventDefault(); setCursor(c => Math.max(c - 1, 0)); }
        else if (e.key === "Enter")     { const item = filtered[safeCursor]; if (item) select(item.id); }
    };

    return (
        <AnimatePresence>
            {open && (
                <div className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh] pointer-events-none">
                    <motion.div
                        ref={paletteRef}
                        initial={{opacity: 0, scale: 0.97, y: -6}}
                        animate={{opacity: 1, scale: 1,    y: 0}}
                        exit={{opacity: 0,   scale: 0.97, y: -4}}
                        transition={{duration: 0.11, ease: "easeOut"}}
                        onKeyDown={onKeyDown}
                        className="pointer-events-auto w-full max-w-xs mx-4 rounded-lg border border-subtle bg-overlay shadow-2xl overflow-hidden"
                    >
                        {/* Search row */}
                        <div className="flex items-center gap-2.5 px-3 py-2.5 border-b border-hair">
                            <Search className="h-3.5 w-3.5 text-fg-ghost shrink-0"/>
                            <input
                                ref={inputRef}
                                value={query}
                                onChange={e => { setQuery(e.target.value); setCursor(0); }}
                                className="flex-1 bg-transparent text-xs font-mono text-fg-primary outline-none"
                            />
                        </div>

                        {/* Results */}
                        <div ref={listRef} className="py-1 max-h-52 overflow-y-auto scrollbar-thin">
                            {filtered.length === 0 ? (
                                <p className="px-3 py-2 text-2xs font-mono text-fg-ghost">—</p>
                            ) : filtered.map((item, idx) => (
                                <button
                                    key={item.id}
                                    data-active={idx === safeCursor}
                                    onMouseEnter={() => { setCursor(idx); }}
                                    onClick={() => { select(item.id); }}
                                    className={cn(
                                        "w-full flex items-center gap-2 px-3 py-1.5 text-xs font-mono text-left transition-colors",
                                        idx === safeCursor ? "bg-hover text-fg-primary" : "text-fg-muted"
                                    )}
                                >
                                    <span className="flex-1 truncate">{item.repo}</span>
                                    {item.id === value && <Check className="h-3 w-3 text-purple-400 shrink-0"/>}
                                </button>
                            ))}
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
