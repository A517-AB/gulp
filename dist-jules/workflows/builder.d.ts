import { WorkflowBuilderSpec, WorkflowState, WorkflowTrigger, JobDefinition, StepDefinition, BuilderResult, BuilderError } from './spec.js';
export declare class WorkflowBuilder implements WorkflowBuilderSpec {
    private state;
    constructor(name: string);
    /**
     * Defines or updates the workflow triggers.
     * Merges with existing triggers to allow composition from multiple sources.
     */
    on(triggers: WorkflowTrigger): this;
    /**
     * Adds a job to the workflow.
     * Fails if the Job ID is invalid or already exists.
     */
    addJob(id: string, job: JobDefinition): BuilderResult;
    /**
     * Appends a step to an existing job.
     * Useful for plugins that need to inject logic (e.g. "Setup Node").
     */
    addStep(jobId: string, step: StepDefinition): BuilderResult;
    getState(): WorkflowState;
    /**
     * Finalizes the workflow and returns the YAML string.
     * Performs a final validation of the entire tree before generation.
     */
    toYaml(): Promise<{
        success: true;
        yaml: string;
    } | {
        success: false;
        error: BuilderError;
    }>;
}
