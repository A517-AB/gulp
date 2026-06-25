import {useEffect, useRef, useState} from "react";
import {motion} from "framer-motion";
import {Folder, GitBranch, ListTree, Send, Trash2} from "lucide-react";
import {InlineEdit} from "@renderer/ui/inline-edit";
import type {FleetTask, TaskAction} from "@jules";

const ACTION_COLORS: Record<TaskAction['type'], string> = {
    jules: "text-blue-400",
    issue: "text-purple-400",
    pr: "text-emerald-400",
};

function defaultAction(type: TaskAction['type']): TaskAction {
    if (type === 'issue') return {type: 'issue', body: ''};
    if (type === 'pr') return {type: 'pr', head: '', body: ''};
    return {type: 'jules', prompt: '', folder: ''};
}

function actionPreview(action: TaskAction): string {
    if (action.type === 'jules') return action.prompt;
    if (action.type === 'issue') return action.body ?? '';
    return action.head ? `head: ${action.head}` : '';
}

function ActionBadge({action, onChange}: { action: TaskAction; onChange: (a: TaskAction) => void }) {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    const types = ['jules', 'issue', 'pr'] as const;

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
                className={`text-2xs font-mono ${ACTION_COLORS[action.type]} hover:opacity-70 transition-opacity`}
            >
                [{action.type}]
            </button>
            {open && (
                <div
                    className="absolute top-full left-0 mt-1 z-50 rounded border border-subtle bg-overlay shadow-xl py-1">
                    {types.map((t) => (
                        <button
                            key={t}
                            onClick={() => {
                                onChange(defaultAction(t));
                                setOpen(false);
                            }}
                            className={`w-full text-left px-3 py-1.5 text-2xs font-mono hover:bg-hover transition-colors ${ACTION_COLORS[t]} ${t === action.type ? "opacity-100" : "opacity-60"}`}
                        >
                            {t}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

export interface TaskRowProps {
    task: FleetTask;
    gIdx: number;
    tIdx: number;
    isSending: boolean;
    onUpdate: (patch: Partial<FleetTask>) => void;
    onRemove: () => void;
    onDispatch: (e: React.MouseEvent) => void;
}

export function TaskRow({task, tIdx, isSending, onUpdate, onRemove, onDispatch}: TaskRowProps) {
    const used = task.usedCount ?? 0;

    return (
        <motion.div
            initial={{opacity: 0, x: -6}}
            animate={{opacity: 1, x: 0}}
            transition={{duration: 0.14, delay: tIdx * 0.025}}
            className={`flex flex-col py-2.5 px-2 rounded-md border transition-colors ${
                used > 0 ? "border-transparent opacity-40" : "border-transparent hover:bg-hover hover:border-hair"
            }`}
        >
            <div className="flex items-start justify-between">
                <div className="flex items-start gap-2.5 flex-1 pr-4">
                    <div className="flex flex-col gap-1 flex-1">

                        <div className="flex items-center gap-1.5">
                            <ActionBadge
                                action={task.action}
                                onChange={(a) => {
                                    onUpdate({action: a});
                                }}
                            />
                            <InlineEdit
                                value={task.topic}
                                onSave={(v) => {
                                    onUpdate({topic: v});
                                }}
                                className="text-xs font-semibold text-fg-primary"
                                placeholder="Topic"
                            />
                            {used > 0 && (
                                <span className="text-2xs font-mono text-fg-ghost">· {used}×</span>
                            )}
                        </div>

                        {task.action.type === 'jules' && (
                            <>
                                <div className="flex items-center gap-1.5">
                                    <Folder className="h-3 w-3 text-fg-ghost shrink-0"/>
                                    <InlineEdit
                                        value={task.action.folder ?? ''}
                                        onSave={(v) => {
                                            if (task.action.type === 'jules') {
                                                onUpdate({action: {...task.action, folder: v}});
                                            }
                                        }}
                                        className="text-2xs font-mono text-fg-dim"
                                        placeholder="folder/path"
                                    />
                                </div>
                                <InlineEdit
                                    value={task.action.prompt}
                                    onSave={(v) => {
                                        if (task.action.type === 'jules') {
                                            onUpdate({action: {...task.action, prompt: v}});
                                        }
                                    }}
                                    multiline
                                    className="text-2xs text-fg-muted leading-relaxed"
                                    placeholder="Task prompt..."
                                />
                            </>
                        )}

                        {task.action.type === 'issue' && (
                            <InlineEdit
                                value={task.action.body ?? ''}
                                onSave={(v) => {
                                    if (task.action.type === 'issue') {
                                        onUpdate({action: {...task.action, body: v}});
                                    }
                                }}
                                multiline
                                className="text-2xs text-fg-muted leading-relaxed"
                                placeholder="Issue body (optional)..."
                            />
                        )}

                        {task.action.type === 'pr' && (
                            <>
                                <div className="flex items-center gap-1.5">
                                    <GitBranch className="h-3 w-3 text-fg-ghost shrink-0"/>
                                    <InlineEdit
                                        value={task.action.head}
                                        onSave={(v) => {
                                            if (task.action.type === 'pr') {
                                                onUpdate({action: {...task.action, head: v}});
                                            }
                                        }}
                                        className="text-2xs font-mono text-fg-dim"
                                        placeholder="head branch"
                                    />
                                </div>
                                <InlineEdit
                                    value={task.action.body ?? ''}
                                    onSave={(v) => {
                                        if (task.action.type === 'pr') {
                                            onUpdate({action: {...task.action, body: v}});
                                        }
                                    }}
                                    multiline
                                    className="text-2xs text-fg-muted leading-relaxed"
                                    placeholder="PR body (optional)..."
                                />
                            </>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                    <button
                        onClick={onRemove}
                        aria-label="Remove task"
                        className="flex items-center justify-center h-7 w-7 rounded text-fg-ghost hover:text-destructive hover:bg-hover transition-all"
                    >
                        <Trash2 className="h-3.5 w-3.5"/>
                    </button>
                    <button
                        onClick={onDispatch}
                        disabled={isSending}
                        aria-label="Dispatch task"
                        className="flex items-center justify-center h-7 w-7 rounded border border-hair text-fg-muted hover:text-fg-primary hover:border-subtle transition-all disabled:opacity-40"
                    >
                        <Send className="h-3.5 w-3.5"/>
                    </button>
                </div>
            </div>

            {task.followUps && task.followUps.length > 0 && (
                <div className="ml-6 mt-2 pl-3 border-l border-hair space-y-1.5">
                    {task.followUps.map((fu, fIdx) => (
                        <div key={fIdx} className="flex items-start gap-2">
                            <ListTree className="h-3 w-3 text-fg-ghost mt-0.5 shrink-0"/>
                            <div className="flex flex-col gap-0.5">
                                <span className="text-2xs font-medium text-fg-secondary">{fu.topic}</span>
                                <span className="text-2xs text-fg-dim">{actionPreview(fu.action)}</span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </motion.div>
    );
}
