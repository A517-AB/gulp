import {useEffect, useRef, useState} from "react";
import {AnimatePresence, motion} from "framer-motion";
import {ChevronDown} from "lucide-react";
import {cn} from "@/utils";

export interface DropdownItem {
    id: string;
    label: string;
    meta?: string;
}

interface DropdownProps {
    items: DropdownItem[];
    value?: string;
    onChange: (id: string) => void;
    placeholder?: string;
    className?: string;
    emptyMessage?: string;
    footer?: React.ReactNode;
}

export function Dropdown({items, value, onChange, placeholder = "select", className, emptyMessage = "Nothing found", footer}: DropdownProps) {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    const selected = items.find(i => i.id === value);

    useEffect(() => {
        if (!open) return;
        const handler = (e: MouseEvent) => {
            if (!ref.current?.contains(e.target as Node)) { setOpen(false) }
        };
        document.addEventListener("mousedown", handler);
        return () => { document.removeEventListener("mousedown", handler) };
    }, [open]);

    return (
        <div ref={ref} className={cn("relative", className)} onClick={e => { e.stopPropagation() }}>
            <button
                onClick={() => { setOpen(o => !o) }}
                className="flex items-center gap-1 text-2xs font-mono text-fg-dim bg-hover px-1.5 py-0.5 rounded hover:bg-active hover:text-fg-secondary transition-colors"
            >
                <span className="max-w-[180px] truncate">{selected?.label ?? placeholder}</span>
                <ChevronDown className="h-2.5 w-2.5 shrink-0 opacity-60"/>
            </button>

            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{opacity: 0, y: -4, scale: 0.97}}
                        animate={{opacity: 1, y: 0, scale: 1}}
                        exit={{opacity: 0, y: -4, scale: 0.97}}
                        transition={{duration: 0.13, ease: "easeOut"}}
                        className="absolute top-full left-0 mt-1 z-50 min-w-[200px] max-w-[320px] rounded-md border border-subtle bg-overlay shadow-xl py-1"
                    >
                        {items.length === 0 && (
                            <p className="px-3 py-2 text-2xs text-fg-ghost font-mono">{emptyMessage}</p>
                        )}
                        {items.map(item => (
                            <button
                                key={item.id}
                                onClick={() => { onChange(item.id); setOpen(false); }}
                                className={cn(
                                    "w-full text-left px-3 py-1.5 text-2xs font-mono hover:bg-hover transition-colors flex items-center justify-between gap-3",
                                    item.id === value ? "text-fg-primary" : "text-fg-muted"
                                )}
                            >
                                <span className="truncate">{item.label}</span>
                                {item.meta && <span className="text-fg-ghost shrink-0">{item.meta}</span>}
                            </button>
                        ))}
                        {footer && (
                            <div className="border-t border-hair mt-1 pt-1">
                                {footer}
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
