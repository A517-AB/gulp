import { memo, useState } from "react";
import { Loader2, Send } from "lucide-react";
import { motion } from "framer-motion";
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
            <form
                onSubmit={handleSubmit}
                className="border-t border-hair bg-surface p-3"
            >
                <div className="flex gap-2">
                    <Textarea
                        value={message}
                        onChange={(e) => {
                            setMessage(e.target.value);
                        }}
                        placeholder="Send a message to Jules..."
                        className="min-h-[56px] resize-none text-[11px] bg-raised border-hair text-fg-primary placeholder:text-fg-ghost focus:border-purple-500/50"
                        onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                                e.preventDefault();
                                handleSubmit();
                            }
                        }}
                    />
                    <motion.div
                        whileHover={message.trim() && !sending ? { scale: 1.05 } : {}}
                        whileTap={message.trim() && !sending ? { scale: 0.95 } : {}}
                        transition={{ type: "spring", stiffness: 400, damping: 15 }}
                    >
                        <Button type="submit" size="icon" disabled={!message.trim() || sending} className="h-9 w-9">
                            {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                        </Button>
                    </motion.div>
                </div>
            </form>
        );
    },
    (prevProps, nextProps) => {
        return prevProps.sending === nextProps.sending && prevProps.onSubmitMessage === nextProps.onSubmitMessage;
    }
);
export default ActivityFeedForm;
