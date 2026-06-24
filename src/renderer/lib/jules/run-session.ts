import type {JulesClient, SessionConfig, Outcome, Activity} from '@jules';

export interface SessionResult {
    agentMessage: string | undefined;
    outcome: Outcome;
}

export type RunProgressHandler = (activity: Activity) => void;

export async function runSession(
    client: JulesClient,
    config: SessionConfig,
    onActivity?: RunProgressHandler,
    signal?: AbortSignal,
): Promise<SessionResult> {
    const run = await client.run(config);

    let agentMessage: string | undefined;

    for await (const activity of run.stream()) {
        if (signal?.aborted) break;
        onActivity?.(activity);
        if (activity.type === 'agentMessaged') agentMessage = activity.message;
    }

    const outcome = await run.result();
    return {agentMessage, outcome};
}
