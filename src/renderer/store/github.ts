import { create } from 'zustand';
import { github as githubBridge } from '@shared/bridge';
import { toast } from 'sonner';
import type { GitHubIssue, GitHubPR, GitHubBranch, GitHubCheckRun } from '@shared/electron';

export type { GitHubIssue, GitHubPR, GitHubBranch, GitHubCheckRun };

export interface GithubState {
    available: boolean;

    // issues
    createIssue:     (owner: string, repo: string, data: { title: string; body?: string; labels?: string[]; assignees?: string[] }) => Promise<GitHubIssue | null>
    listIssues:      (owner: string, repo: string, state?: 'open' | 'closed' | 'all') => Promise<GitHubIssue[]>
    updateIssue:     (owner: string, repo: string, number: number, data: { title?: string; body?: string; state?: 'open' | 'closed'; labels?: string[] }) => Promise<GitHubIssue | null>
    addIssueComment: (owner: string, repo: string, number: number, body: string) => Promise<void>

    // pull requests
    listPRs:     (owner: string, repo: string, state?: 'open' | 'closed' | 'all') => Promise<GitHubPR[]>
    getPR:       (owner: string, repo: string, number: number) => Promise<GitHubPR | null>
    createPR:    (owner: string, repo: string, data: { title: string; body?: string; head: string; base: string; draft?: boolean }) => Promise<GitHubPR | null>
    updatePR:    (owner: string, repo: string, number: number, data: { title?: string; body?: string; state?: 'open' | 'closed'; base?: string }) => Promise<GitHubPR | null>
    mergePR:     (owner: string, repo: string, number: number, method?: 'merge' | 'squash' | 'rebase') => Promise<boolean>
    getPRChecks: (owner: string, repo: string, ref: string) => Promise<GitHubCheckRun[]>

    // branches
    listBranches: (owner: string, repo: string) => Promise<GitHubBranch[]>
    deleteBranch: (owner: string, repo: string, branch: string) => Promise<boolean>
}

function splitSlug(slug: string): { owner: string; repo: string } | null {
    const clean = slug.replace(/^(?:sources\/)?github\//, '');
    const idx = clean.indexOf('/');
    if (idx < 0) return null;
    return { owner: clean.slice(0, idx), repo: clean.slice(idx + 1) };
}

export function parseRepoSlug(slug: string) { return splitSlug(slug); }

export const useGithubStore = create<GithubState>()(() => ({
    available: !!githubBridge,

    createIssue: async (owner, repo, data) => {
        if (!githubBridge) return null;
        const id = `gh-issue-${Date.now().toString()}`;
        toast.loading('Creating issue…', { id });
        try {
            const issue = await githubBridge.createIssue(owner, repo, data);
            toast.success(`#${issue.number.toString()} created`, { id, description: issue.html_url });
            return issue;
        } catch (err) {
            console.error('[github] createIssue:', err);
            toast.error('Failed to create issue', { id });
            return null;
        }
    },

    listIssues: async (owner, repo, state) => {
        if (!githubBridge) return [];
        try { return await githubBridge.listIssues(owner, repo, state); }
        catch (err) { console.error('[github] listIssues:', err); return []; }
    },

    updateIssue: async (owner, repo, number, data) => {
        if (!githubBridge) return null;
        try { return await githubBridge.updateIssue(owner, repo, number, data); }
        catch (err) { console.error('[github] updateIssue:', err); return null; }
    },

    addIssueComment: async (owner, repo, number, body) => {
        if (!githubBridge) return;
        try { await githubBridge.addIssueComment(owner, repo, number, body); }
        catch (err) { console.error('[github] addIssueComment:', err); }
    },

    listPRs: async (owner, repo, state) => {
        if (!githubBridge) return [];
        try { return await githubBridge.listPRs(owner, repo, state); }
        catch (err) { console.error('[github] listPRs:', err); return []; }
    },

    getPR: async (owner, repo, number) => {
        if (!githubBridge) return null;
        try { return await githubBridge.getPR(owner, repo, number); }
        catch (err) { console.error('[github] getPR:', err); return null; }
    },

    createPR: async (owner, repo, data) => {
        if (!githubBridge) return null;
        const id = `gh-pr-${Date.now().toString()}`;
        toast.loading('Creating PR…', { id });
        try {
            const pr = await githubBridge.createPR(owner, repo, data);
            toast.success(`PR #${pr.number.toString()} created`, { id, description: pr.html_url });
            return pr;
        } catch (err) {
            console.error('[github] createPR:', err);
            toast.error('Failed to create PR', { id });
            return null;
        }
    },

    updatePR: async (owner, repo, number, data) => {
        if (!githubBridge) return null;
        try { return await githubBridge.updatePR(owner, repo, number, data); }
        catch (err) { console.error('[github] updatePR:', err); return null; }
    },

    mergePR: async (owner, repo, number, method) => {
        if (!githubBridge) return false;
        const id = `gh-merge-${Date.now().toString()}`;
        toast.loading('Merging…', { id });
        try {
            await githubBridge.mergePR(owner, repo, number, method);
            toast.success('Merged', { id });
            return true;
        } catch (err) {
            console.error('[github] mergePR:', err);
            toast.error('Merge failed', { id });
            return false;
        }
    },

    getPRChecks: async (owner, repo, ref) => {
        if (!githubBridge) return [];
        try {
            const res = await githubBridge.getPRChecks(owner, repo, ref);
            return res.check_runs;
        } catch (err) { console.error('[github] getPRChecks:', err); return []; }
    },

    listBranches: async (owner, repo) => {
        if (!githubBridge) return [];
        try { return await githubBridge.listBranches(owner, repo); }
        catch (err) { console.error('[github] listBranches:', err); return []; }
    },

    deleteBranch: async (owner, repo, branch) => {
        if (!githubBridge) return false;
        try { await githubBridge.deleteBranch(owner, repo, branch); return true; }
        catch (err) { console.error('[github] deleteBranch:', err); return false; }
    },
}));
