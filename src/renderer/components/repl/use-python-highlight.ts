import {useEffect, useMemo, useState} from 'react';
import type {HighlighterCore, ThemedToken} from '@shikijs/core';
import {createHighlighterCore} from '@shikijs/core';
import {createJavaScriptRawEngine} from '@shikijs/engine-javascript/raw';

// Singleton — the grammar + themes load once and survive unmounts,
// same pattern as the pyodide caches in Repl.tsx
let highlighterPromise: Promise<HighlighterCore> | null = null;
let cachedHighlighter: HighlighterCore | null = null;

function loadHighlighter(): Promise<HighlighterCore> {
    highlighterPromise ??= createHighlighterCore({
        themes: [
            import('@shikijs/themes/vitesse-dark'),
            import('@shikijs/themes/vitesse-light'),
        ],
        langs: [import('@shikijs/langs-precompiled/python')],
        engine: createJavaScriptRawEngine(),
    }).then((hl) => {
        cachedHighlighter = hl;
        return hl;
    });
    return highlighterPromise;
}

/**
 * Tokenizes Python source with Shiki for live input highlighting.
 * Returns null until the highlighter has loaded — render plain text then.
 */
export function usePythonHighlight(code: string, theme: 'dark' | 'light'): ThemedToken[][] | null {
    const [highlighter, setHighlighter] = useState(cachedHighlighter);

    useEffect(() => {
        if (highlighter) return;
        let alive = true;
        void loadHighlighter().then((hl) => {
            if (alive) setHighlighter(hl);
        });
        return () => {
            alive = false;
        };
    }, [highlighter]);

    return useMemo(() => {
        if (!highlighter) return null;
        return highlighter.codeToTokensBase(code, {
            lang: 'python',
            theme: theme === 'dark' ? 'vitesse-dark' : 'vitesse-light',
        });
    }, [highlighter, code, theme]);
}
