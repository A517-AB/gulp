import {useEffect, useState} from "react";
import {Plus} from "lucide-react";
import {Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger} from "@/ui/dialog.tsx";
import {Button} from "@/ui/button.tsx";
import {Input} from "@/ui/input.tsx";
import {Textarea} from "@/ui/textarea.tsx";
import {DynamicDropdown} from "@/components/shared/DynamicDropdown";
import {Toggle} from "@/ui/toggle.tsx";
// eslint-disable-next-line no-restricted-imports
import {sdkIpc} from "@shared/bridge";
import type {SessionInitialValues, Source} from "@jules";

interface NewSessionDialogProps {
    onSessionCreated?: () => void;
    initialValues?: SessionInitialValues;
    trigger?: React.ReactNode;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
}

/**
 * `NewSessionDialog` is a modal dialog for creating a new Jules session.
 * It provides a form for inputting the initial prompt/request and optionally the target branch.
 *
 * It interacts with the `useStore` (`createSession`) to initialize a new session through the SDK.
 *
 * Props:
 * - `onSessionCreated`: Callback fired when a session is successfully created.
 * - `initialValues`: Pre-filled values for the session creation form (`SessionInitialValues` from `@jules`).
 * - `trigger`: Optional React node to act as the dialog trigger button.
 * - `open`: Controlled state for dialog visibility.
 * - `onOpenChange`: Callback for handling dialog open state changes.
 */
export function NewSessionDialog({ onSessionCreated, initialValues, trigger, open: controlledOpen, onOpenChange }: NewSessionDialogProps) {
    const [internalOpen, setInternalOpen] = useState(false);
    const [portalContainer, setPortalContainer] = useState<HTMLDivElement | null>(null);
    const open = controlledOpen ?? internalOpen;
    const setOpen = onOpenChange ?? setInternalOpen;

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            {(controlledOpen === undefined || trigger) && (
                <DialogTrigger asChild>
                    {trigger ?? <Button className="h-8 text-[10px] font-mono uppercase tracking-widest border-0"><Plus
                        className="h-3.5 w-3.5 mr-1.5"/>New Session</Button>}
                </DialogTrigger>
            )}
            <DialogContent className="sm:max-w-[480px] border-purple-500/20 shadow-[0_0_15px_rgba(168,85,247,0.15)]">
                <div ref={setPortalContainer}/>
                <DialogHeader>
                    <DialogTitle>New Session</DialogTitle>
                </DialogHeader>
                {open && (
                    <SessionForm
                        initialValues={initialValues}
                        portalContainer={portalContainer}
                        onClose={() => {
                            setOpen(false);
                        }}
                        onSessionCreated={onSessionCreated}
                    />
                )}
            </DialogContent>
        </Dialog>
    );
}

const EMPTY = {sourceId: '', title: '', prompt: '', startingBranch: '', interactive: false, autoCreatePr: false};

function SessionForm({initialValues, portalContainer, onClose, onSessionCreated}: {
    initialValues?: SessionInitialValues | undefined;
    portalContainer: HTMLDivElement | null;
    onClose: () => void;
    onSessionCreated?: (() => void) | undefined;
}) {
    const [sources, setSources] = useState<Source[]>([]);
    const [form, setForm] = useState({...EMPTY, ...(initialValues ?? {})});
    const patch = (p: Partial<typeof EMPTY>) => {
        setForm(prev => ({...prev, ...p}));
    };

    useEffect(() => {
        sdkIpc?.sources.list().then(setSources).catch(() => {
            setSources([]);
        });
    }, []);

    const selected = sources.find(s => s.id === form.sourceId);
    const branches = selected?.githubRepo.branches ?? [];

    function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
        e.preventDefault();
        if (!form.prompt.trim()) return;
        const ownerRepo = form.sourceId.replace(/^(?:sources\/)?github\//, '');
        onClose();
        onSessionCreated?.();
        void sdkIpc?.session.create({
            prompt: form.prompt,
            ...(form.title ? {title: form.title} : {}),
            ...(form.autoCreatePr ? {autoPr: true} : {}),
            ...(form.interactive ? {requireApproval: true} : {}),
            ...(ownerRepo ? {source: {github: ownerRepo, baseBranch: form.startingBranch || 'main'}} : {}),
        });
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-3">
            <DynamicDropdown
                items={[
                    {id: '', label: 'No repository'},
                    ...sources.map(s => ({id: s.id, label: s.githubRepo.repo})),
                ]}
                value={form.sourceId || null}
                onChange={(v) => {
                    patch({sourceId: v, startingBranch: '', autoCreatePr: false});
                }}
                placeholder="Repository (optional)"
                className="w-full h-9 justify-between px-3"
                container={portalContainer}
            />
            {branches.length > 0 && (
                <DynamicDropdown
                    items={branches.map(b => ({id: b, label: b}))}
                    value={form.startingBranch || null}
                    onChange={(v) => {
                        patch({startingBranch: v});
                    }}
                    placeholder="main"
                    className="w-full h-9 justify-between px-3"
                    container={portalContainer}
                />
            )}
            <Input
                placeholder="Title (optional)"
                value={form.title}
                onChange={(e) => {
                    patch({title: e.target.value});
                }}
                className="h-9 text-xs"
            />
            <Textarea
                placeholder="What should Jules do?"
                value={form.prompt}
                onChange={(e) => {
                    patch({prompt: e.target.value});
                }}
                className="min-h-[100px] max-h-[200px] overflow-y-auto text-xs"
                autoFocus
                required
            />
            <div className="flex flex-col gap-3">
                <Toggle checked={form.interactive} onChange={(v) => {
                    patch({interactive: v});
                }} label="Interactive — review plan before execution"/>
                {form.sourceId && (
                    <Toggle checked={form.autoCreatePr} onChange={(v) => {
                        patch({autoCreatePr: v});
                    }} label="Automatically create Pull Request when ready"/>
                )}
            </div>
            <div className="flex gap-2 justify-end pt-2">
                <Button type="button" variant="outline" onClick={onClose}
                        className="h-8 text-[10px] font-mono uppercase tracking-widest">Cancel</Button>
                <Button type="submit" disabled={!form.prompt.trim()}
                        className="h-8 text-[10px] font-mono uppercase tracking-widest">Send</Button>
            </div>
        </form>
    );
}
