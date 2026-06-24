import {useMemo, useEffect, useState} from "react";
import {ScrollArea} from "@/ui/scroll-area";
import {SourceRow} from "@/components/ship/SourceRow";
import {ACTIVE_STATES} from "@/components/ship/JulesSection";
import {useStore} from "@/store/app";
import {useShipStore} from "@/store/ship";
import {useNotification} from "@/library/notification/use-notification";
import {jules} from "@jules";
import type {SessionResource, Source} from "@jules";

export default function ShipPage() {
    const sources = useStore(s => s.sources);
    const archivedSessionIds = useStore(s => s.archivedSessionIds);
    const [sessionList, setSessionList] = useState<SessionResource[]>([]);
    const [openSourceId, setOpenSourceId] = useState<string | null>(null);

    useEffect(() => {
        void (async () => {
            try {
                const list: SessionResource[] = [];
                for await (const s of jules.sessions({pageSize: 200})) list.push(s);
                setSessionList(list);
            } catch { /* leave empty */
            }
        })();
    }, []);

    useEffect(() => {
        void (async () => {
            try {
                const loaded: Source[] = [];
                for await (const s of jules.sources()) loaded.push(s);
                useStore.setState({sources: loaded, sourcesLoaded: true});
            } catch { /* leave empty */
            }
        })();
    }, []);

    const {handleSnapshot, openPatchId, lastSessionId, handlePatchClick} = useShipStore();

    const notification = useNotification({
        onAction: (actionId, extraData) => {
            if (actionId === 'retry') {
                const {sessionId, sourceId} = extraData as { sessionId: string; sourceId: string };
                void applyPatch(sessionId, sourceId);
            }
        },
    });

    const applyPatch = async (sessionId: string, sourceId: string) => {
        const result = await handleSnapshot(sessionId, sourceId);
        if (!result) return;
        if (result.success) {
            notification.success({title: 'Patch applied', ...(result.branch ? {body: `→ ${result.branch}`} : {})});
        } else {
            notification.error({
                title: 'Patch failed',
                ...(result.error ? { body: result.error } : {}),
                actions: [{ id: 'retry', label: 'Retry', style: 'primary' as const }],
                extraData: {sessionId, sourceId},
            });
        }
    };

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.target !== document.body) return;
            if (e.key === " " && openPatchId === "" && lastSessionId !== "") {
                e.preventDefault();
                handlePatchClick(lastSessionId);
            }
        };
        document.addEventListener("keydown", onKey);
        return () => { document.removeEventListener("keydown", onKey); };
    }, [openPatchId, lastSessionId, handlePatchClick]);

    const sessionsBySource = useMemo(() => {
        const map: Record<string, SessionResource[]> = {};
        for (const source of sources) {
            map[source.id] = sessionList
                .filter(s => {
                    if (archivedSessionIds.includes(s.id)) return false;
                    const sc = s.sourceContext as { source?: string } | undefined;
                    return (s.source as Source | undefined)?.id === source.id
                        || sc?.source === source.name;
                })
                .sort((a, b) => new Date(b.createTime).getTime() - new Date(a.createTime).getTime());
        }
        return map;
    }, [sessionList, sources, archivedSessionIds]);

    const totalActive = useMemo(() =>
            sessionList.filter(s => ACTIVE_STATES.has(s.state)).length,
        [sessionList],
    );

    return (
        <div className="flex flex-col h-full overflow-hidden bg-base">
            <div className="px-6 py-3 flex items-center gap-3 shrink-0 border-b border-hair">
                <span className="text-[11px] font-mono text-fg-primary">{sources.length} repos</span>

                {totalActive > 0 && (
                    <div className="flex items-center gap-1.5">
                        <span className="relative flex h-1.5 w-1.5">
                            <span
                                className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-60"/>
                            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-purple-500"/>
                        </span>
                        <span className="text-[10px] font-mono text-purple-400">{totalActive} active</span>
                    </div>
                )}

                <div className="flex-1"/>
                <span className="text-[10px] font-mono text-fg-ghost">{sessionList.length} sessions</span>
            </div>

            <ScrollArea className="flex-1">
                <div className="py-2">
                    {sources.length === 0 ? (
                        <p className="text-[10px] font-mono text-fg-ghost uppercase tracking-widest text-center py-16">
                            No repos
                        </p>
                    ) : sources.map(source => (
                        <SourceRow
                            key={source.id}
                            source={source}
                            sessions={sessionsBySource[source.id] ?? []}
                            isOpen={openSourceId === source.id}
                            onToggle={() => {
                                setOpenSourceId(id => id === source.id ? null : source.id);
                            }}
                            onApplyPatch={(sessionId, sourceId) => {
                                void applyPatch(sessionId, sourceId);
                            }}
                        />
                    ))}
                </div>
            </ScrollArea>
        </div>
    );
}
