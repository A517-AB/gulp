import {useState, useCallback, useEffect, useRef} from "react";
import {Plus, X} from "lucide-react";
import {useStore} from "@/store/app";
import {jules} from "@jules";
import {DynamicDropdown} from "@/ui/dynamic-dropdown";
import type {SessionConfig, Source} from "@jules";

interface SourceBranchPickerProps {
    sources: Source[];
    github: string;
    branch: string;
    onChange: (github: string, branch: string) => void;
}

export function SourceBranchPicker({sources, github, branch, onChange}: SourceBranchPickerProps) {
    const items = [
        {id: "", label: "Repoless"},
        ...sources.map(s => ({
            id: s.name.replace(/^sources\/github\//, ""),
            label: s.githubRepo.repo,
        })),
    ];
    return (
        <div className="grid grid-cols-2 gap-2">
            <DynamicDropdown
                items={items}
                value={github || null}
                onChange={v => {
                    onChange(v, "");
                }}
                placeholder="Repoless"
                className="w-full h-8 justify-between px-3 text-xs"
            />
            <input
                value={branch}
                onChange={e => {
                    onChange(github, e.target.value);
                }}
                placeholder="Default branch"
                disabled={!github}
                className="h-8 px-3 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-zinc-700 focus:border-purple-500/60 focus:outline-none text-xs text-fg-primary placeholder:text-fg-ghost transition-colors disabled:opacity-40"
            />
        </div>
    );
}

function Toggle({checked, onChange, label}: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
    return (
        <label className="flex items-center gap-3 cursor-pointer select-none">
            <button type="button" role="switch" aria-checked={checked} onClick={() => {
                onChange(!checked);
            }}
                    className={`relative w-7 h-4 rounded-full flex-shrink-0 transition-colors ${checked ? "bg-purple-500" : "bg-zinc-700"}`}>
                <span
                    className={`absolute top-0.5 left-0.5 w-3 h-3 rounded-full bg-white shadow-sm transition-transform ${checked ? "translate-x-3" : "translate-x-0"}`}/>
            </button>
            <span className="text-xs text-fg-muted">{label}</span>
        </label>
    );
}

interface NewSessionDialogProps {
    onSessionCreated?: () => void;
    initialValues?: Partial<SessionConfig>;
    trigger?: React.ReactNode;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
}

export function NewSessionDialog({ onSessionCreated, initialValues, trigger, open: controlledOpen, onOpenChange }: NewSessionDialogProps) {
    const isControlled = controlledOpen !== undefined;
    const [internalOpen, setInternalOpen] = useState(false);
    const open = isControlled ? controlledOpen : internalOpen;
    const setOpen = useCallback((v: boolean) => {
        if (isControlled) onOpenChange?.(v);
        else setInternalOpen(v);
    }, [isControlled, onOpenChange]);

    const sources = useStore(s => s.sources);
    const createSession = useCallback((config: SessionConfig) => jules.session(config), []);

    const [github, setGithub] = useState(initialValues?.source?.github ?? "");
    const [branch, setBranch] = useState(initialValues?.source?.branch ?? "");
    const [title, setTitle] = useState(initialValues?.title ?? "");
    const [prompt, setPrompt] = useState(initialValues?.prompt ?? "");
    const [requireApproval, setRequireApproval] = useState(initialValues?.requireApproval ?? true);
    const [autoPr, setAutoPr] = useState(initialValues?.autoPr ?? false);
    const [error, setError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);

    const panelRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!open) return;
        setGithub(initialValues?.source?.github ?? "");
        setBranch(initialValues?.source?.branch ?? "");
        setTitle(initialValues?.title ?? "");
        setPrompt(initialValues?.prompt ?? "");
        setRequireApproval(initialValues?.requireApproval ?? true);
        setAutoPr(initialValues?.autoPr ?? false);
        setError(null);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") setOpen(false);
        };
        const onMouse = (e: MouseEvent) => {
            if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false);
        };
        window.addEventListener("keydown", onKey);
        document.addEventListener("mousedown", onMouse);
        return () => {
            window.removeEventListener("keydown", onKey);
            document.removeEventListener("mousedown", onMouse);
        };
    }, [open, setOpen]);

    const handleSubmit = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();
        if (!prompt.trim() || submitting) return;
        setSubmitting(true);
        setError(null);
        const config: SessionConfig = {
            prompt: prompt.trim(),
            ...(github ? {source: {github, branch}} : {}),
            ...(title.trim() ? {title: title.trim()} : {}),
            requireApproval,
            autoPr: autoPr && !!github,
        };
        try {
            await createSession?.(config);
            setOpen(false);
            onSessionCreated?.();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to create session");
        } finally {
            setSubmitting(false);
        }
    }, [prompt, github, branch, title, requireApproval, autoPr, submitting, createSession, setOpen, onSessionCreated]);

    return (
        <div className="relative inline-block">
            {(!isControlled || trigger) && (
                trigger
                    ? <div onClick={() => {
                        setOpen(!open);
                    }} className="contents">{trigger}</div>
                    : (
                        <button onClick={() => {
                            setOpen(!open);
                        }}
                                className="flex items-center gap-1.5 h-8 px-3 text-[10px] font-mono uppercase tracking-widest rounded-md border border-hair text-fg-secondary hover:text-fg-primary hover:bg-hover transition-colors">
                            <Plus className="h-3.5 w-3.5"/>
                            New Session
                        </button>
                    )
            )}

            {open && (
                <div ref={panelRef}
                     className="absolute right-0 top-full mt-1.5 z-50 w-[380px] rounded-xl bg-zinc-950 border border-zinc-800 shadow-[0_8px_32px_rgba(0,0,0,0.6)] overflow-hidden">
                    <div className="px-4 pt-3.5 pb-3 flex items-center justify-between">
                        <span className="text-xs font-semibold text-fg-primary">New Session</span>
                        <button type="button" onClick={() => {
                            setOpen(false);
                        }}
                                className="p-1 rounded text-fg-dim hover:text-fg-secondary hover:bg-zinc-800 transition-colors">
                            <X className="h-3.5 w-3.5"/>
                        </button>
                    </div>

                    <div className="h-px bg-zinc-800/60 mx-4"/>

                    <form onSubmit={e => {
                        void handleSubmit(e);
                    }} className="p-4 space-y-3">
                        <SourceBranchPicker
                            sources={sources}
                            github={github}
                            branch={branch}
                            onChange={(g, b) => {
                                setGithub(g);
                                setBranch(b);
                                if (!g) setAutoPr(false);
                            }}
                        />

                        <input
                            value={title}
                            onChange={e => {
                                setTitle(e.target.value);
                            }}
                            placeholder="Title (optional)"
                            className="w-full h-8 px-3 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-zinc-700 focus:border-purple-500/60 focus:outline-none text-xs text-fg-primary placeholder:text-fg-ghost transition-colors"
                        />

                        <textarea
                            value={prompt}
                            onChange={e => {
                                setPrompt(e.target.value);
                            }}
                            placeholder="What should Jules do..."
                            required
                            rows={4}
                            className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-zinc-700 focus:border-purple-500/60 focus:outline-none text-xs text-fg-primary placeholder:text-fg-ghost transition-colors resize-none leading-relaxed"
                        />

                        <div className="space-y-2.5">
                            <Toggle checked={requireApproval} onChange={setRequireApproval}
                                    label="Interactive — approve plan before execution"/>
                            {github && <Toggle checked={autoPr} onChange={setAutoPr}
                                               label="Auto-create pull request when done"/>}
                        </div>

                        {error && (
                            <div className="rounded-lg bg-red-950/30 border border-red-900/40 px-3 py-2">
                                <p className="text-xs text-red-400">{error}</p>
                            </div>
                        )}

                        <div className="flex gap-2 justify-end">
                            <button type="button" onClick={() => {
                                setOpen(false);
                            }}
                                    className="h-7 px-3 text-[10px] font-mono uppercase tracking-widest rounded-md border border-zinc-700 text-fg-muted hover:text-fg-secondary transition-colors">
                                Cancel
                            </button>
                            <button type="submit" disabled={!prompt.trim() || submitting}
                                    className="h-7 px-3 text-[10px] font-mono uppercase tracking-widest rounded-md bg-purple-600 hover:bg-purple-500 text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                                Create
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
}
