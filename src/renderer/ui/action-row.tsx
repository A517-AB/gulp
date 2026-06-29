import {AnimatePresence, motion} from "framer-motion";
import {
    AlertCircle,
    Calendar,
    CheckCircle2,
    Clock,
    Folder,
    GitBranch,
    ListTodo,
    Play,
    Sparkles,
    Terminal,
    Trash2
} from "lucide-react";
import {type DropdownItem, DynamicDropdown} from "./dynamic-dropdown";

export interface ActionRowProps {
    title: string;
    onTitleChange?: (v: string) => void;

    typeValue: string;
    onTypeChange?: (id: string) => void;

    scheduleValue: string | null;
    onScheduleChange?: (id: string | null) => void;

    status: 'idle' | 'running' | 'success' | 'failed';
    runCount?: number;

    // Direct action-specific props
    folder?: string;
    onFolderChange?: (v: string) => void;

    prompt?: string;
    onPromptChange?: (v: string) => void;

    command?: string;
    onCommandChange?: (v: string) => void;

    sourceBranch?: string;
    onSourceBranchChange?: (v: string) => void;
    targetBranch?: string;
    onTargetBranchChange?: (v: string) => void;

    children?: React.ReactNode;

    onDispatch?: () => void;
    onRemove?: () => void;
}

// Option definitions with oklch hues
const TYPE_ITEMS: DropdownItem[] = [
    {id: 'jules', label: 'Jules', icon: Sparkles, color: 'oklch(0.75 0.12 290)'},
    {id: 'script', label: 'Script', icon: Terminal, color: 'oklch(0.8 0.15 90)'},
    {id: 'pr', label: 'Pull Request', icon: GitBranch, color: 'oklch(0.7 0.15 140)'},
    {id: 'issue', label: 'GitHub Issue', icon: ListTodo, color: 'oklch(0.7 0.1 300)'},
];

const SCHEDULE_ITEMS: DropdownItem[] = [
    {id: 'manual', label: 'Manual', icon: Clock, color: 'oklch(0.75 0.05 200)'},
    {id: 'hourly', label: 'Hourly', icon: Calendar, color: 'oklch(0.75 0.1 220)'},
    {id: 'daily', label: 'Daily', icon: Calendar, color: 'oklch(0.75 0.1 220)'},
    {id: 'weekly', label: 'Weekly', icon: Calendar, color: 'oklch(0.75 0.1 220)'},
];

export function ActionRow({
                              title, onTitleChange,
                              typeValue, onTypeChange,
                              scheduleValue, onScheduleChange,
                              status, runCount = 0,
                              folder = "", onFolderChange,
                              prompt = "", onPromptChange,
                              command = "", onCommandChange,
                              sourceBranch = "", onSourceBranchChange,
                              targetBranch = "", onTargetBranchChange,
                              children,
                              onDispatch, onRemove
                          }: ActionRowProps) {

    const schedOptions: DropdownItem[] = [
        {id: "manual", label: "Manual", icon: Clock, color: "oklch(0.75 0.05 200)"},
        ...SCHEDULE_ITEMS.filter(o => o.id !== 'manual')
    ];

    return (
        <motion.div
            layout
            transition={{type: "spring", stiffness: 350, damping: 28}}
            className={`flex flex-col py-2.5 px-2 rounded-md border border-transparent hover:bg-hover hover:border-hair transition-all duration-200 w-full select-none ${
                status === 'success' ? 'opacity-50' : 'opacity-100'
            }`}
        >
            <div className="flex items-start justify-between w-full">
                <div className="flex items-start gap-3 flex-1 min-w-0">

                    {/* Action triggers */}
                    <div className="flex items-center gap-1 shrink-0">
                        <DynamicDropdown
                            items={TYPE_ITEMS}
                            value={typeValue}
                            onChange={(v) => onTypeChange?.(v)}
                            className="size-8 hover:bg-active"
                        />
                        <DynamicDropdown
                            items={schedOptions}
                            value={scheduleValue ?? 'manual'}
                            onChange={(v) => onScheduleChange?.(v === 'manual' ? null : v)}
                            className="size-8 hover:bg-active"
                        />
                    </div>

                    {/* Interactive fields based on type selection */}
                    <div className="flex flex-col gap-1 flex-1 min-w-0 pt-1">
                        <div className="flex items-center gap-2">
                            <input
                                value={title}
                                onChange={(e) => onTitleChange?.(e.target.value)}
                                className="bg-transparent border-none outline-none text-xs font-semibold text-fg-primary placeholder:text-fg-ghost focus:ring-0 p-0 w-full"
                                placeholder="Action topic..."
                            />
                            {runCount > 0 && (
                                <span className="text-2xs font-mono text-fg-ghost shrink-0">· {runCount}×</span>
                            )}

                            {/* Status display - pulse for running, icons for success/failed */}
                            <div className="flex items-center shrink-0 ml-auto mr-1 h-4">
                                <AnimatePresence mode="wait">
                                    {status === 'running' && (
                                        <motion.div
                                            key="running"
                                            initial={{opacity: 0, scale: 0.8}}
                                            animate={{opacity: [0.4, 1, 0.4], scale: 1}}
                                            exit={{opacity: 0}}
                                            transition={{repeat: Infinity, duration: 1.5, ease: "easeInOut"}}
                                            className="size-2 rounded-full bg-blue-400"
                                            title="Running..."
                                        />
                                    )}
                                    {status === 'success' && (
                                        <motion.div key="success" initial={{opacity: 0, scale: 0.8}}
                                                    animate={{opacity: 1, scale: 1}} exit={{opacity: 0}}>
                                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400"/>
                                        </motion.div>
                                    )}
                                    {status === 'failed' && (
                                        <motion.div key="failed" initial={{opacity: 0, scale: 0.8}}
                                                    animate={{opacity: 1, scale: 1}} exit={{opacity: 0}}>
                                            <AlertCircle className="h-3.5 w-3.5 text-red-400"/>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </div>

                        {/* Morphing input layouts */}
                        <AnimatePresence mode="wait">
                            {typeValue === 'jules' && (
                                <motion.div
                                    key="jules"
                                    initial={{opacity: 0, y: -2}}
                                    animate={{opacity: 1, y: 0}}
                                    exit={{opacity: 0, y: -2}}
                                    transition={{duration: 0.12}}
                                    className="flex flex-col gap-1 mt-0.5"
                                >
                                    <div className="flex items-center gap-1.5 text-2xs text-fg-dim font-mono">
                                        <Folder className="h-3 w-3 text-fg-ghost shrink-0"/>
                                        <input
                                            value={folder}
                                            onChange={(e) => onFolderChange?.(e.target.value)}
                                            className="bg-transparent border-none outline-none text-2xs font-mono text-fg-dim placeholder:text-fg-ghost focus:ring-0 p-0 w-full"
                                            placeholder="folder/path"
                                        />
                                    </div>
                                    <input
                                        value={prompt}
                                        onChange={(e) => onPromptChange?.(e.target.value)}
                                        className="bg-transparent border-none outline-none text-2xs text-fg-muted placeholder:text-fg-ghost focus:ring-0 p-0 w-full"
                                        placeholder="Task prompt..."
                                    />
                                </motion.div>
                            )}

                            {typeValue === 'script' && (
                                <motion.div
                                    key="script"
                                    initial={{opacity: 0, y: -2}}
                                    animate={{opacity: 1, y: 0}}
                                    exit={{opacity: 0, y: -2}}
                                    transition={{duration: 0.12}}
                                    className="flex items-center gap-1.5 mt-0.5 text-2xs text-fg-dim font-mono"
                                >
                                    <span className="text-fg-ghost shrink-0">$</span>
                                    <input
                                        value={command}
                                        onChange={(e) => onCommandChange?.(e.target.value)}
                                        className="bg-transparent border-none outline-none text-2xs font-mono text-fg-dim placeholder:text-fg-ghost focus:ring-0 p-0 w-full"
                                        placeholder="python scripts/run.py"
                                    />
                                </motion.div>
                            )}

                            {typeValue === 'pr' && (
                                <motion.div
                                    key="pr"
                                    initial={{opacity: 0, y: -2}}
                                    animate={{opacity: 1, y: 0}}
                                    exit={{opacity: 0, y: -2}}
                                    transition={{duration: 0.12}}
                                    className="flex items-center gap-1.5 mt-0.5 text-2xs font-mono text-fg-dim"
                                >
                                    <GitBranch className="h-3 w-3 text-fg-ghost shrink-0"/>
                                    <input
                                        value={sourceBranch}
                                        onChange={(e) => onSourceBranchChange?.(e.target.value)}
                                        className="bg-transparent border-none outline-none text-2xs font-mono text-fg-secondary placeholder:text-fg-ghost focus:ring-0 p-0 w-24 text-right"
                                        placeholder="source-branch"
                                    />
                                    <span className="text-fg-ghost">→</span>
                                    <input
                                        value={targetBranch}
                                        onChange={(e) => onTargetBranchChange?.(e.target.value)}
                                        className="bg-transparent border-none outline-none text-2xs font-mono text-fg-secondary placeholder:text-fg-ghost focus:ring-0 p-0 w-24"
                                        placeholder="target-branch"
                                    />
                                </motion.div>
                            )}

                            {typeValue === 'issue' && (
                                <motion.div
                                    key="issue"
                                    initial={{opacity: 0, y: -2}}
                                    animate={{opacity: 1, y: 0}}
                                    exit={{opacity: 0, y: -2}}
                                    transition={{duration: 0.12}}
                                    className="mt-0.5"
                                >
                                    <input
                                        value={prompt}
                                        onChange={(e) => onPromptChange?.(e.target.value)}
                                        className="bg-transparent border-none outline-none text-2xs text-fg-muted placeholder:text-fg-ghost focus:ring-0 p-0 w-full"
                                        placeholder="Issue body (optional)..."
                                    />
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {children && (
                            <div className="flex flex-col gap-1.5 mt-2">
                                {children}
                            </div>
                        )}
                    </div>
                </div>

                {/* Click feedback controls */}
                <div className="flex items-center gap-1 shrink-0 ml-4">
                    <motion.button
                        whileHover={{scale: 1.05}}
                        whileTap={{scale: 0.95}}
                        onClick={onRemove}
                        aria-label="Remove action"
                        className="flex items-center justify-center h-8 w-8 rounded text-fg-ghost hover:text-destructive hover:bg-hover transition-colors"
                    >
                        <Trash2 className="h-3.5 w-3.5"/>
                    </motion.button>
                    <motion.button
                        whileHover={{scale: 1.05}}
                        whileTap={{scale: 0.95}}
                        onClick={onDispatch}
                        disabled={status === 'running'}
                        aria-label="Dispatch action"
                        className="flex items-center justify-center h-8 w-8 rounded border border-hair text-fg-muted hover:text-fg-primary hover:border-subtle transition-colors disabled:opacity-40 disabled:hover:scale-100"
                    >
                        <Play className="h-3.5 w-3.5"/>
                    </motion.button>
                </div>
            </div>
        </motion.div>
    );
}
