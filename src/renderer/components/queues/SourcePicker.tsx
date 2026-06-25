import {useEffect, useRef, useState} from "react";
import {AnimatePresence, motion} from "framer-motion";
import {ChevronDown} from "lucide-react";
import type {Source} from "@google/jules-sdk/types";

export function SourcePicker({value, sources, onChange}: {
    value: string;
    sources: Source[];
    onChange: (id: string) => void;
}) {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    const selected = sources.find((s) => s.id === value);
    const label = (selected?.type === 'githubRepo' ? selected.githubRepo.repo : null) ?? (value ? value.replace(/^.*\//, "") : "pick repo");

    useEffect(() => {
        if (!open) return;
        const handler = (e: MouseEvent) => {
            if (!ref.current?.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener("mousedown", handler);
        return () => {
            document.removeEventListener("mousedown", handler);
        };
    }, [open]);

    return (
        <div ref={ref} className="relative" onClick={(e) => {
            e.stopPropagation();
        }}>
            <button
                onClick={() => {
                    setOpen((o) => !o);
                }}
                className="flex items-center gap-1 text-2xs font-mono text-fg-dim bg-hover px-1.5 py-0.5 rounded hover:bg-active hover:text-fg-secondary transition-colors"
            >
                <span className="max-w-[140px] truncate">{label}</span>
                <ChevronDown className="h-2.5 w-2.5 shrink-0 opacity-60"/>
            </button>
            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{opacity: 0, y: -4, scale: 0.97}}
                        animate={{opacity: 1, y: 0, scale: 1}}
                        exit={{opacity: 0, y: -4, scale: 0.97}}
                        transition={{duration: 0.13, ease: "easeOut"}}
                        className="absolute top-full left-0 mt-1 z-50 min-w-[180px] max-w-[280px] rounded-md border border-subtle bg-overlay shadow-xl py-1"
                    >
                        {sources.length === 0 && (
                            <p className="px-3 py-2 text-2xs text-fg-ghost font-mono">No sources found</p>
                        )}
                        {sources.map((s) => (
                            <button
                                key={s.id}
                                onClick={() => {
                                    onChange(s.id);
                                    setOpen(false);
                                }}
                                className={`w-full text-left px-3 py-1.5 text-2xs font-mono truncate hover:bg-hover transition-colors ${s.id === value ? "text-fg-primary" : "text-fg-muted"}`}
                            >
                                {s.name}
                            </button>
                        ))}
                        <div className="border-t border-hair mt-1 pt-1">
                            <button
                                onClick={() => {
                                    onChange("");
                                    setOpen(false);
                                }}
                                className="w-full text-left px-3 py-1.5 text-2xs font-mono text-fg-ghost hover:text-fg-muted hover:bg-hover transition-colors"
                            >
                                repoless
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
