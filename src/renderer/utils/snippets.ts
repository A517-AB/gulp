import type { Snippet } from '@/utils/types'

/**
 * Compiles a final prompt string by combining the user's custom message
 * with any attached snippets. It automatically adds the correct conversational
 * prefixes based on whether the snippets are "workspace" instructions or "standard" context.
 */
export function compilePromptWithSnippets(
  userMessage: string,
  snippets: Snippet[]
): string {
  if (snippets.length === 0) {
    return userMessage;
  }

  const julesSnippets = snippets.filter((s) => s.category === "jules");
  const standardSnippets = snippets.filter((s) => s.category !== "jules");

  let compiled = "";

  // 1. User's custom message always goes at the very top (if provided)
  if (userMessage.trim()) {
    compiled += `${userMessage.trim()}\n\n`;
  }

  // 2. Append Jules instruction snippets
  if (julesSnippets.length > 0) {
    compiled += `--- INSTRUCTIONS ---\nThese are the specific instructions you must follow:\n\n`;
    julesSnippets.forEach((snippet) => {
      const title = snippet.title ?? "Instruction";
      compiled += `### ${title}\n${snippet.script.trim()}\n\n`;
    });
  }

  // 3. Append Standard context snippets
  if (standardSnippets.length > 0) {
    compiled += `--- CONTEXT ---\nThis code/context might help you:\n\n`;
    standardSnippets.forEach((snippet) => {
      const title = snippet.title ?? "Snippet";
      const lang = snippet.languageId ?? "";
      compiled += `### ${title}\n\`\`\`${lang}\n${snippet.script.trim()}\n\`\`\`\n\n`;
    });
  }

  return compiled.trim();
}
