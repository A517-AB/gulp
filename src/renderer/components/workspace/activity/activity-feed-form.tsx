import { memo, useState } from "react";
import { ArrowUp } from "lucide-react";
import { Textarea } from "@/ui/textarea.tsx";
import { Button } from "@/ui/button.tsx";

interface ActivityFeedFormProps {
    onSubmitMessage: (message: string) => void;
    sending: boolean;
}

export const ActivityFeedForm = memo(
    function ActivityFeedForm({ onSubmitMessage, sending }: ActivityFeedFormProps) {
        const [message, setMessage] = useState("");

        const handleSubmit = (e?: React.SyntheticEvent) => {
            if (e) e.preventDefault();
            if (!message.trim() || sending) return;
            onSubmitMessage(message);
            setMessage("");
        };

        return (
            <form onSubmit={handleSubmit} className="border-t border-hair bg-surface px-4 py-3">
                <div className="relative flex items-end gap-2 bg-base border border-hair rounded-lg focus-within:border-fg-muted focus-within:shadow-sm transition-all p-1">
                    <Textarea
                        value={message}
                        onChange={(e) => { setMessage(e.target.value); }}
                        placeholder=""
                        className="min-h-[40px] max-h-[300px] py-2.5 px-3 resize-none text-[12px] bg-transparent border-none shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 text-fg-primary"
                        onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
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
