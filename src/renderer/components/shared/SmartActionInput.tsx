import { useState } from "react";
import { Send, Loader2, Play, GitPullRequest } from "lucide-react";
import { Textarea } from "@/ui/textarea";
import { Button } from "@/ui/button";
import { DynamicDropdown } from "./DynamicDropdown";
import { SnippetPicker } from "./SnippetPicker";
import { compilePromptWithSnippets } from "@/utils/snippets";
import { NewSessionDialog } from "../new-session-dialog";
import type { Session } from "@/types/jules";
import type { Snippet } from "@/types/snippets";
import type { QuickActionTemplate } from "@/types/activity-feed";

const ACTION_TEMPLATES = [
  {
    id: "standard-chat",
    label: "Send to Session",
    defaultPrompt: "",
    allowedDestinations: ["current_session"],
  },
  {
    id: "code-review",
    label: "Code Review",
    icon: Play,
    defaultPrompt: "Please perform a quick code review on the latest changes.",
    allowedDestinations: ["current_session"],
  },
  {
    id: "create-pr",
    label: "Review & Create PR",
    icon: GitPullRequest,
    defaultPrompt: "Review the changes in this branch. Verify they meet the requirements, check for bugs, and draft a Pull Request description.",
    allowedDestinations: ["new_session"],
    requiresCompletedSession: true,
    autoCreatePr: true,
  }
] satisfies [QuickActionTemplate, ...QuickActionTemplate[]]

export interface SmartActionInputProps {
  session: Session;
  outputBranch?: string;
  isSending: boolean;
  onSendMessage: (message: string) => Promise<void>;
  availableSnippets?: Snippet[];
}

export function SmartActionInput({ 
  session, 
  outputBranch, 
  isSending, 
  onSendMessage,
  availableSnippets = []
}: SmartActionInputProps) {
  const [message, setMessage] = useState("");
  const [selectedActionId, setSelectedActionId] = useState("standard-chat");
  const [selectedSnippetIds, setSelectedSnippetIds] = useState<string[]>([]);
  
  // State to trigger the New Session Dialog for handoffs
  const [handoffDialogOpen, setHandoffDialogOpen] = useState(false);
  const [handoffPrompt, setHandoffPrompt] = useState("");

  const selectedAction = ACTION_TEMPLATES.find(a => a.id === selectedActionId) ?? ACTION_TEMPLATES[0];
  const destination = selectedAction.allowedDestinations[0] ?? "current_session";

  // Filter actions based on session status
  const availableActions = ACTION_TEMPLATES.filter(action => {
    return !('requiresCompletedSession' in action && action.requiresCompletedSession && session.status !== "completed");

  }).map(action => ({
    id: action.id,
    label: action.label,
  }));

  const handleSubmit = async () => {
    if (!message.trim() && !selectedAction.defaultPrompt && selectedSnippetIds.length === 0) return;
    if (isSending) return;

    // 1. Get the base text (either what they typed, or the template default)
    const baseText = message.trim() || selectedAction.defaultPrompt;
    
    // 2. Attach any snippets
    const selectedSnippets = availableSnippets.filter(s => selectedSnippetIds.includes(s.id));
    const finalPrompt = compilePromptWithSnippets(baseText, selectedSnippets);

    // 3. Dispatch based on destination
    if (destination === "current_session") {
      await onSendMessage(finalPrompt);
      setMessage("");
      setSelectedSnippetIds([]);
    } else {
      setHandoffPrompt(finalPrompt);
      setHandoffDialogOpen(true);
    }
  };

  return (
    <>
      <form 
        onSubmit={(e) => { e.preventDefault(); void handleSubmit(); }} 
        className="border-t border-hair bg-surface p-3"
      >
        <div className="flex gap-2 items-end">
          <div className="flex flex-col gap-2 flex-1 relative">
            <div className="absolute top-2 right-2 flex items-center gap-1 z-10">
              <SnippetPicker 
                snippets={availableSnippets}
                selectedIds={selectedSnippetIds}
                onChange={setSelectedSnippetIds}
              />
              <DynamicDropdown 
                items={availableActions}
                value={selectedActionId}
                onChange={setSelectedActionId}
                className="bg-transparent border border-subtle shadow-sm bg-base"
              />
            </div>
            
            <Textarea 
              value={message} 
              onChange={(e) => { setMessage(e.target.value); }} 
              placeholder={selectedAction.defaultPrompt || "Send a message to Jules..."} 
              className="min-h-[64px] resize-none text-[11px] bg-raised border-hair text-fg-primary placeholder:text-fg-ghost focus:border-purple-500/50 pt-3 pr-24 pb-3 pl-3" 
              onKeyDown={(e) => { 
                if (e.key === "Enter" && !e.shiftKey) { 
                  e.preventDefault(); 
                  void handleSubmit(); 
                } 
              }} 
              disabled={isSending} 
            />
          </div>
          <Button 
            type="submit" 
            size="icon" 
            disabled={(!message.trim() && !selectedAction.defaultPrompt && selectedSnippetIds.length === 0) || isSending} 
            className="h-[64px] w-10 shrink-0 bg-selected text-fg-primary hover:bg-hover transition-colors"
          >
            {isSending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
          </Button>
        </div>
      </form>

      <NewSessionDialog
        open={handoffDialogOpen}
        onOpenChange={(open) => { setHandoffDialogOpen(open); }}
        initialValues={{
          ...(session.sourceId ? { sourceId: `sources/github/${session.sourceId}` } : {}),
          title: outputBranch ? `Review: ${outputBranch}` : "PR Review",
          prompt: handoffPrompt,
          ...(outputBranch ? { startingBranch: outputBranch } : {}),
        }}
        onSessionCreated={() => {
          setHandoffDialogOpen(false);
          setMessage("");
          setSelectedSnippetIds([]);
        }}
      />
    </>
  );
}
