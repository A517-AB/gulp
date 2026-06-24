import { JulesClient, JulesOptions } from './types.js';
/**
 * Connects to the Jules service with the provided configuration.
 * Acts as a factory method for creating a new client instance.
 *
 * @param options Configuration options for the client.
 * @returns A new JulesClient instance.
 */
export declare function connect(options?: JulesOptions): JulesClient;
/**
 * The main entry point for the Jules SDK for browser environments.
 * This is a pre-initialized client that can be used immediately with default settings.
 *
 * @example
 * import { jules } from 'modjules/browser';
 * const session = await jules.session({ ... });
 */
export declare const jules: JulesClient;
export * from './errors.js';
export type { Activity, ActivityAgentMessaged, ActivityPlanApproved, ActivityPlanGenerated, ActivityProgressUpdated, ActivitySessionCompleted, ActivitySessionFailed, ActivityUserMessaged, Artifact, AutomatedSession, BashArtifact, ChangeSet, GitHubRepo, GitPatch, JulesClient, JulesOptions, MediaArtifact, Outcome, Plan, PlanStep, PullRequest, SessionClient, SessionConfig, SessionOutput, SessionResource, SessionState, Source, SourceContext, SourceInput, SourceManager, } from './types.js';
