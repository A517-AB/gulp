import {useEffect, useRef, useState} from "react";
import {AnimatePresence, motion} from "framer-motion";
import {ChevronDown} from "lucide-react";
import {useGithubStore} from "@/store/github";

export function BranchPicker({value, owner, repo, onChange}: {
    value: string;
    owner: string;
    repo: string;
    onChange: (branch: string) => void;
}) {
    const [open, setOpen] = useState(false);
    const [branches, setBranches] = useState<string[]>([]);
    const ref = useRef<HTMLDivElement>(null);
    const listBranches = useGithubStore(s => s.listBranches);

    useEffect(() => {
        if (!open || !owner || !repo) return;
        listBranches(owner, repo)
            .then((bs) => {
                setBranches(bs.map(b => b.name));
            })
            .catch(() => {
                setBranches([]);
            });
    }, [open, owner, repo, listBranches]);

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
                <span className="max-w-[100px] truncate">{value || "branch"}</span>
                <ChevronDown className="h-2.5 w-2.5 shrink-0 opacity-60"/>
            </button>
            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{opacity: 0, y: -4, scale: 0.97}}
                        animate={{opacity: 1, y: 0, scale: 1}}
                        exit={{opacity: 0, y: -4, scale: 0.97}}
                        transition={{duration: 0.13, ease: "easeOut"}}
                        className="absolute top-full left-0 mt-1 z-50 min-w-[160px] max-w-[240px] rounded-md border border-subtle bg-overlay shadow-xl py-1 max-h-48 overflow-y-auto"
                    >
                        {branches.length === 0 && (
                            <p className="px-3 py-2 text-2xs text-fg-ghost font-mono">
                                {owner && repo ? "Loading…" : "Pick a repo first"}
                            </p>
                        )}
                        {branches.map((b) => (
                            <button
                                key={b}
                                onClick={() => {
                                    onChange(b);
                                    setOpen(false);
                                }}
                                className={`w-full text-left px-3 py-1.5 text-2xs font-mono truncate hover:bg-hover transition-colors ${b === value ? "text-fg-primary" : "text-fg-muted"}`}
                            >
                                {b}
                            </button>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
