import { useState } from "react";
import { motion } from "framer-motion";
import { Check, Copy } from "lucide-react";
import type { BashArtifact } from "./types";

interface TerminalConsoleProps {
    bashOutputs: BashArtifact[];
}

export function TerminalConsole({ bashOutputs }: TerminalConsoleProps) {
    const [copied, setCopied] = useState(false);

    if (bashOutputs.length === 0) return null;

    const handleCopy = async () => {
        const cleanText = bashOutputs
            .map((bash) => {
                return [`$ ${bash.command}`, bash.stdout]
                    .filter(Boolean)
                    .join("\n")
                    .trim();
            })
            .join("\n\n");
        await navigator.clipboard.writeText(cleanText);
        setCopied(true);
        setTimeout(() => {
            setCopied(false);
        }, 2000);
    };

        return (
            <div
                className="relative mt-3 rounded-lg border border-zinc-800/60 bg-zinc-950/95 text-zinc-300 font-mono text-xxs overflow-hidden shadow-xl backdrop-blur-md"
            >
                {/* Terminal Top Bar */}
                <div className="flex items-center justify-between px-3 py-2 bg-zinc-900/80 border-b border-zinc-800/30 select-none">
                    <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-red-500/60 hover:bg-red-500 transition-colors cursor-pointer" />
                        <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/60 hover:bg-yellow-500 transition-colors cursor-pointer" />
                        <span className="w-2.5 h-2.5 rounded-full bg-green-500/60 hover:bg-green-500 transition-colors cursor-pointer" />
                        <span className="text-zinc-500 text-[10px] ml-2 font-mono">jules@vm: ~</span>
                    </div>
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => {
                            void handleCopy();
                        }}
                        className="p-1.5 rounded text-zinc-500 hover:text-zinc-200 hover:bg-zinc-850/50 transition-colors"
                    >
                        {copied ? <Check className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5" />}
                    </motion.button>
                </div>

                {/* Terminal Body */}
                <div className="p-4 max-h-[320px] overflow-y-auto overflow-x-auto whitespace-pre leading-relaxed select-text bg-zinc-950/85 scrollbar-thin">
                    {bashOutputs.map((bash, idx) => (
                        <div key={idx} className={idx > 0 ? "mt-4 pt-4 border-t border-zinc-900/60" : ""}>
                            <div className="flex items-start gap-1">
                                <span className="text-purple-400 shrink-0 font-bold">$</span>
                                <span className="text-zinc-100 font-bold select-all break-all">{bash.command}</span>
                            </div>
                            {bash.stdout && (
                                <div className="text-green-400/90 mt-2 pl-3 border-l border-zinc-850 select-text whitespace-pre-wrap break-all font-mono font-medium text-[11px] leading-relaxed tracking-wide">
                                    {bash.stdout.trim()}
                                </div>
                            )}
                            {bash.exitCode !== null && (
                                <div
                                    className={`mt-2 pl-3 text-[10px] font-bold ${
                                        bash.exitCode === 0 ? "text-green-500/70" : "text-red-500/70"
                                    }`}
                                >
                                    {bash.exitCode === 0 ? "✔ exit 0" : `✘ exit ${bash.exitCode}`}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        );
}
