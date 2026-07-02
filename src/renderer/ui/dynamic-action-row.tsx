import {Fragment} from "react";
import {AnimatePresence, motion} from "framer-motion";
import {AlertCircle, CheckCircle2, Play, Trash2} from "lucide-react";
import {type DropdownItem, DynamicDropdown} from "./dynamic-dropdown";

export interface ActionFieldConfig {
    key: string;
    placeholder?: string;
    icon?: React.FC<React.SVGProps<SVGSVGElement>>;
    prefix?: string;
    mono?: boolean;
    className?: string;
}

export interface ActionTypeConfig extends DropdownItem {
    fields: ActionFieldConfig[];
    layout?: 'stack' | 'inline';
    separator?: string;
}

export interface DynamicActionRowProps {
    title: string;
    onTitleChange?: (v: string) => void;

    types: ActionTypeConfig[];
    typeValue: string;
    onTypeChange?: (id: string) => void;

    schedules: DropdownItem[];
    scheduleValue: string | null;
    onScheduleChange?: (id: string | null) => void;

    status: 'idle' | 'running' | 'success' | 'failed';
    runCount?: number;

    values: Record<string, string>;
    onValueChange?: (key: string, v: string) => void;

    children?: React.ReactNode;

    onDispatch?: () => void;
    onRemove?: () => void;
}

function ActionField({field, value, onChange}: {
    field: ActionFieldConfig;
    value: string;
    onChange: (v: string) => void;
}) {
    const FieldIcon = field.icon;
    return (
        <div
            className={`flex items-center gap-1.5 text-2xs ${field.mono ? 'font-mono' : ''} text-fg-dim ${field.className ?? 'flex-1'}`}>
            {FieldIcon && <FieldIcon className="h-3 w-3 text-fg-ghost shrink-0"/>}
            {field.prefix && <span className="text-fg-ghost shrink-0">{field.prefix}</span>}
            <input
                value={value}
                onChange={(e) => {
                    onChange(e.target.value);
                }}
                className="bg-transparent border-none outline-none text-2xs text-inherit placeholder:text-fg-ghost focus:ring-0 p-0 w-full"
                placeholder={field.placeholder}
            />
        </div>
    );
}

export function DynamicActionRow({
                                     title, onTitleChange,
                                     types, typeValue, onTypeChange,
                                     schedules, scheduleValue, onScheduleChange,
                                     status, runCount = 0,
                                     values, onValueChange,
                                     children,
                                     onDispatch, onRemove
                                 }: DynamicActionRowProps) {

    const activeType = types.find(t => t.id === typeValue);

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

                    <div className="flex items-center gap-1 shrink-0">
                        <DynamicDropdown
                            items={types}
                            value={typeValue}
                            onChange={(v) => {
                                onTypeChange?.(v);
                            }}
                            className="size-8 hover:bg-active"
                        />
                        <DynamicDropdown
                            items={schedules}
                            value={scheduleValue ?? schedules[0]?.id ?? null}
                            onChange={(v) => {
                                onScheduleChange?.(v === schedules[0]?.id ? null : v);
                            }}
                            className="size-8 hover:bg-active"
                        />
                    </div>

                    <div className="flex flex-col gap-1 flex-1 min-w-0 pt-1">
                        <div className="flex items-center gap-2">
                            <input
                                value={title}
                                onChange={(e) => {
                                    onTitleChange?.(e.target.value);
                                }}
                                className="bg-transparent border-none outline-none text-xs font-semibold text-fg-primary placeholder:text-fg-ghost focus:ring-0 p-0 w-full"
                                placeholder="Action topic..."
                            />
                            {runCount > 0 && (
                                <span className="text-2xs font-mono text-fg-ghost shrink-0">· {runCount}×</span>
                            )}

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

                        <AnimatePresence mode="wait">
                            {activeType && activeType.fields.length > 0 && (
                                <motion.div
                                    key={activeType.id}
                                    initial={{opacity: 0, y: -2}}
                                    animate={{opacity: 1, y: 0}}
                                    exit={{opacity: 0, y: -2}}
                                    transition={{duration: 0.12}}
                                    className={activeType.layout === 'inline'
                                        ? "flex items-center gap-1.5 mt-0.5"
                                        : "flex flex-col gap-1 mt-0.5"}
                                >
                                    {activeType.fields.map((field, i) => (
                                        <Fragment key={field.key}>
                                            {activeType.layout === 'inline' && i > 0 && activeType.separator && (
                                                <span
                                                    className="text-fg-ghost text-2xs shrink-0">{activeType.separator}</span>
                                            )}
                                            <ActionField
                                                field={field}
                                                value={values[field.key] ?? ""}
                                                onChange={(v) => {
                                                    onValueChange?.(field.key, v);
                                                }}
                                            />
                                        </Fragment>
                                    ))}
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
