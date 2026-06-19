import { memo, useCallback, useMemo, useRef, useState } from "react";
import { ArrowUp } from "lucide-react";
import { Textarea } from "@/ui/textarea.tsx";
import { Button } from "@/ui/button.tsx";
import { useSnippets, type SnippetItem } from "@/hooks/use-snippets.ts";
import { cn } from "@/utils";
import { matchesShortcut, matchesAny } from "@base/keyboard.ts";

interface ActivityFeedFormProps {
    onSubmitMessage: (message: string) => void;
    sending: boolean;
}

export const ActivityFeedForm = memo(
    function ActivityFeedForm({ onSubmitMessage, sending }: ActivityFeedFormProps) {
        const [message, setMessage] = useState("");
        const [presetsOpen, setPresetsOpen] = useState(false);
        const [activePresetIndex, setActivePresetIndex] = useState(0);
        const textareaRef = useRef<HTMLTextAreaElement | null>(null);
        const { items, readCode } = useSnippets();

        const chatPresets = useMemo(
            () => items.filter((item) => item.languageId === "session"),
            [items]
        );

        const activePreset = chatPresets[activePresetIndex] ?? chatPresets[0] ?? null;

        const handleSubmit = (e?: React.SyntheticEvent) => {
            if (e) e.preventDefault();
            if (!message.trim() || sending) return;
            onSubmitMessage(message);
            setMessage("");
        };

        const buildMessageWithPreset = useCallback((presetText: string) => {
            const textarea = textareaRef.current;
            const start = textarea?.selectionStart ?? message.length;
            const end = textarea?.selectionEnd ?? message.length;
            const before = message.slice(0, start);
            const after = message.slice(end);
            const insert = presetText.trim();
            const gapBefore = before && !before.endsWith("\n") ? "\n\n" : "";
            const gapAfter = after && !after.startsWith("\n") ? "\n\n" : "";
            const next = `${before}${gapBefore}${insert}${gapAfter}${after}`;
            return { next, caret: before.length + gapBefore.length + insert.length };
        }, [message]);

        const applyPreset = useCallback(async (preset: SnippetItem, submitNow: boolean) => {
            const presetText = await readCode(preset);
            if (!presetText.trim()) return;

            const { next, caret } = buildMessageWithPreset(presetText);
            setPresetsOpen(false);

            if (submitNow) {
                if (!sending && next.trim()) {
                    onSubmitMessage(next);
                    setMessage("");
                }
                return;
            }

            setMessage(next);
            requestAnimationFrame(() => {
                textareaRef.current?.focus();
                textareaRef.current?.setSelectionRange(caret, caret);
            });
        }, [buildMessageWithPreset, onSubmitMessage, readCode, sending]);

        const openPresets = useCallback(() => {
            if (chatPresets.length === 0) return;
            setActivePresetIndex((index) => Math.min(index, chatPresets.length - 1));
            setPresetsOpen(true);
        }, [chatPresets.length]);

        return (
            <form onSubmit={handleSubmit} className="border-t border-hair bg-surface px-4 py-3">
                <div className="relative flex items-end gap-2 bg-base border border-hair rounded-lg focus-within:border-fg-muted focus-within:shadow-sm transition-all p-1">
                    {presetsOpen && chatPresets.length > 0 && (
                        <div className="absolute left-1 right-12 bottom-full mb-2 z-30 max-h-64 overflow-y-auto rounded-md border border-hair bg-overlay p-1 shadow-xl">
                            {chatPresets.map((preset, index) => (
                                <button
                                    key={preset.id}
                                    type="button"
                                    onMouseEnter={() => { setActivePresetIndex(index); }}
                                    onMouseDown={(e) => {
                                        e.preventDefault();
                                        void applyPreset(preset, false);
                                    }}
                                    className={cn(
                                        "flex w-full flex-col gap-0.5 rounded px-2.5 py-2 text-left transition-colors",
                                        index === activePresetIndex ? "bg-hover text-fg-primary" : "text-fg-secondary hover:bg-hover"
                                    )}
                                >
                                    <span className="text-[11px] font-semibold">{preset.title ?? "Untitled"}</span>
                                    {preset.preview && (
                                        <span className="line-clamp-2 text-[10px] leading-snug text-fg-dim">
                                            {preset.preview}
                                        </span>
                                    )}
                                </button>
                            ))}
                        </div>
                    )}
                    <Textarea
                        value={message}
                        onChange={(e) => { setMessage(e.target.value); }}
                        placeholder=""
                        className="min-h-[40px] max-h-[300px] py-2.5 px-3 resize-none text-[12px] bg-transparent border-none shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 text-fg-primary"
                        onKeyDown={(e) => {
                            const ev = e.nativeEvent;

                            if (matchesAny(ev, ["ctrl+space", "meta+space"])) {
                                e.preventDefault();
                                if (presetsOpen) setPresetsOpen(false);
                                else openPresets();
                                return;
                            }

                            if (presetsOpen) {
                                if (matchesShortcut(ev, "escape")) {
                                    e.preventDefault();
                                    setPresetsOpen(false);
                                    return;
                                }

                                if (matchesShortcut(ev, "downarrow")) {
                                    e.preventDefault();
                                    setActivePresetIndex((index) => (index + 1) % chatPresets.length);
                                    return;
                                }

                                if (matchesShortcut(ev, "uparrow")) {
                                    e.preventDefault();
                                    setActivePresetIndex((index) => (index - 1 + chatPresets.length) % chatPresets.length);
                                    return;
                                }

                                if (matchesAny(ev, ["enter", "ctrl+enter", "meta+enter"]) && activePreset) {
                                    e.preventDefault();
                                    void applyPreset(activePreset, e.ctrlKey || e.metaKey);
                                    return;
                                }
                            }

                            if (matchesAny(ev, ["ctrl+enter", "meta+enter"])) {
                                e.preventDefault();
                                handleSubmit();
                                return;
                            }

                            if (matchesShortcut(ev, "enter")) {
                                e.preventDefault();
                                handleSubmit();
                            }
                        }}
                    />
                    <Button
                        type="submit"
                        size="icon"
                        variant="ghost"
                        disabled={!message.trim() || sending}
                        className="h-8 w-8 shrink-0 mb-1 mr-1 rounded-md text-fg-muted hover:text-fg-primary hover:bg-hover disabled:opacity-30 disabled:bg-transparent"
                    >
                        <ArrowUp className="h-4 w-4 stroke-[2.5]" />
                    </Button>
                </div>
            </form>
        );
    },
    (prevProps, nextProps) => prevProps.sending === nextProps.sending && prevProps.onSubmitMessage === nextProps.onSubmitMessage
);
export default ActivityFeedForm;
