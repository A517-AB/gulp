import { z } from 'zod';
/** Valid 'on' triggers */
export declare const WorkflowTriggersSchema: z.ZodObject<{
    push: z.ZodOptional<z.ZodObject<{
        branches: z.ZodOptional<z.ZodArray<z.ZodString>>;
        tags: z.ZodOptional<z.ZodArray<z.ZodString>>;
        paths: z.ZodOptional<z.ZodArray<z.ZodString>>;
    }, z.core.$strip>>;
    pull_request: z.ZodOptional<z.ZodObject<{
        types: z.ZodOptional<z.ZodArray<z.ZodString>>;
        branches: z.ZodOptional<z.ZodArray<z.ZodString>>;
        paths: z.ZodOptional<z.ZodArray<z.ZodString>>;
    }, z.core.$strip>>;
    workflow_dispatch: z.ZodOptional<z.ZodObject<{
        inputs: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
    }, z.core.$strip>>;
    schedule: z.ZodOptional<z.ZodArray<z.ZodObject<{
        cron: z.ZodString;
    }, z.core.$strip>>>;
}, z.core.$strip>;
/** A single step in a job */
export declare const StepSchema: z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    id: z.ZodOptional<z.ZodString>;
    if: z.ZodOptional<z.ZodString>;
    uses: z.ZodOptional<z.ZodString>;
    run: z.ZodOptional<z.ZodString>;
    with: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnion<readonly [z.ZodString, z.ZodNumber, z.ZodBoolean]>>>;
    env: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
    'continue-on-error': z.ZodOptional<z.ZodBoolean>;
    'timeout-minutes': z.ZodOptional<z.ZodNumber>;
}, z.core.$strip>;
/** A Job definition */
export declare const JobSchema: z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    'runs-on': z.ZodDefault<z.ZodString>;
    needs: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodArray<z.ZodString>]>>;
    if: z.ZodOptional<z.ZodString>;
    env: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
    permissions: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodRecord<z.ZodString, z.ZodString>]>>;
    steps: z.ZodDefault<z.ZodArray<z.ZodObject<{
        name: z.ZodOptional<z.ZodString>;
        id: z.ZodOptional<z.ZodString>;
        if: z.ZodOptional<z.ZodString>;
        uses: z.ZodOptional<z.ZodString>;
        run: z.ZodOptional<z.ZodString>;
        with: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnion<readonly [z.ZodString, z.ZodNumber, z.ZodBoolean]>>>;
        env: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
        'continue-on-error': z.ZodOptional<z.ZodBoolean>;
        'timeout-minutes': z.ZodOptional<z.ZodNumber>;
    }, z.core.$strip>>>;
}, z.core.$strip>;
/** The full internal state structure */
export declare const WorkflowStateSchema: z.ZodObject<{
    name: z.ZodString;
    on: z.ZodObject<{
        push: z.ZodOptional<z.ZodObject<{
            branches: z.ZodOptional<z.ZodArray<z.ZodString>>;
            tags: z.ZodOptional<z.ZodArray<z.ZodString>>;
            paths: z.ZodOptional<z.ZodArray<z.ZodString>>;
        }, z.core.$strip>>;
        pull_request: z.ZodOptional<z.ZodObject<{
            types: z.ZodOptional<z.ZodArray<z.ZodString>>;
            branches: z.ZodOptional<z.ZodArray<z.ZodString>>;
            paths: z.ZodOptional<z.ZodArray<z.ZodString>>;
        }, z.core.$strip>>;
        workflow_dispatch: z.ZodOptional<z.ZodObject<{
            inputs: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
        }, z.core.$strip>>;
        schedule: z.ZodOptional<z.ZodArray<z.ZodObject<{
            cron: z.ZodString;
        }, z.core.$strip>>>;
    }, z.core.$strip>;
    env: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
    jobs: z.ZodRecord<z.ZodString, z.ZodObject<{
        name: z.ZodOptional<z.ZodString>;
        'runs-on': z.ZodDefault<z.ZodString>;
        needs: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodArray<z.ZodString>]>>;
        if: z.ZodOptional<z.ZodString>;
        env: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
        permissions: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodRecord<z.ZodString, z.ZodString>]>>;
        steps: z.ZodDefault<z.ZodArray<z.ZodObject<{
            name: z.ZodOptional<z.ZodString>;
            id: z.ZodOptional<z.ZodString>;
            if: z.ZodOptional<z.ZodString>;
            uses: z.ZodOptional<z.ZodString>;
            run: z.ZodOptional<z.ZodString>;
            with: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnion<readonly [z.ZodString, z.ZodNumber, z.ZodBoolean]>>>;
            env: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
            'continue-on-error': z.ZodOptional<z.ZodBoolean>;
            'timeout-minutes': z.ZodOptional<z.ZodNumber>;
        }, z.core.$strip>>>;
    }, z.core.$strip>>;
}, z.core.$strip>;
export type WorkflowTrigger = z.infer<typeof WorkflowTriggersSchema>;
export type StepDefinition = z.infer<typeof StepSchema>;
export type JobDefinition = z.infer<typeof JobSchema>;
export type WorkflowState = z.infer<typeof WorkflowStateSchema>;
export declare const AddJobInputSchema: z.ZodObject<{
    id: z.ZodString;
    job: z.ZodObject<{
        name: z.ZodOptional<z.ZodString>;
        'runs-on': z.ZodDefault<z.ZodString>;
        needs: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodArray<z.ZodString>]>>;
        if: z.ZodOptional<z.ZodString>;
        env: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
        permissions: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodRecord<z.ZodString, z.ZodString>]>>;
        steps: z.ZodDefault<z.ZodArray<z.ZodObject<{
            name: z.ZodOptional<z.ZodString>;
            id: z.ZodOptional<z.ZodString>;
            if: z.ZodOptional<z.ZodString>;
            uses: z.ZodOptional<z.ZodString>;
            run: z.ZodOptional<z.ZodString>;
            with: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnion<readonly [z.ZodString, z.ZodNumber, z.ZodBoolean]>>>;
            env: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
            'continue-on-error': z.ZodOptional<z.ZodBoolean>;
            'timeout-minutes': z.ZodOptional<z.ZodNumber>;
        }, z.core.$strip>>>;
    }, z.core.$strip>;
}, z.core.$strip>;
export type AddJobInput = z.infer<typeof AddJobInputSchema>;
export declare const BuilderErrorCode: z.ZodEnum<{
    INVALID_TRIGGER: "INVALID_TRIGGER";
    INVALID_JOB_ID: "INVALID_JOB_ID";
    DUPLICATE_JOB_ID: "DUPLICATE_JOB_ID";
    INVALID_STEP: "INVALID_STEP";
    VALIDATION_FAILED: "VALIDATION_FAILED";
    YAML_GEN_ERROR: "YAML_GEN_ERROR";
}>;
export type BuilderErrorCode = z.infer<typeof BuilderErrorCode>;
export declare const BuilderErrorSchema: z.ZodObject<{
    code: z.ZodEnum<{
        INVALID_TRIGGER: "INVALID_TRIGGER";
        INVALID_JOB_ID: "INVALID_JOB_ID";
        DUPLICATE_JOB_ID: "DUPLICATE_JOB_ID";
        INVALID_STEP: "INVALID_STEP";
        VALIDATION_FAILED: "VALIDATION_FAILED";
        YAML_GEN_ERROR: "YAML_GEN_ERROR";
    }>;
    message: z.ZodString;
    details: z.ZodOptional<z.ZodAny>;
}, z.core.$strip>;
export type BuilderError = z.infer<typeof BuilderErrorSchema>;
export declare const BuilderResultSchema: z.ZodDiscriminatedUnion<[z.ZodObject<{
    success: z.ZodLiteral<true>;
    data: z.ZodOptional<z.ZodAny>;
}, z.core.$strip>, z.ZodObject<{
    success: z.ZodLiteral<false>;
    error: z.ZodObject<{
        code: z.ZodEnum<{
            INVALID_TRIGGER: "INVALID_TRIGGER";
            INVALID_JOB_ID: "INVALID_JOB_ID";
            DUPLICATE_JOB_ID: "DUPLICATE_JOB_ID";
            INVALID_STEP: "INVALID_STEP";
            VALIDATION_FAILED: "VALIDATION_FAILED";
            YAML_GEN_ERROR: "YAML_GEN_ERROR";
        }>;
        message: z.ZodString;
        details: z.ZodOptional<z.ZodAny>;
    }, z.core.$strip>;
}, z.core.$strip>], "success">;
export type BuilderResult = z.infer<typeof BuilderResultSchema>;
export interface WorkflowBuilderSpec {
    /** Set the triggers. Merges with existing triggers if called multiple times. */
    on(triggers: WorkflowTrigger): this;
    /** Add a job to the workflow. Returns validation error if invalid. */
    addJob(id: string, job: JobDefinition): BuilderResult;
    /** Add a step to an existing job. */
    addStep(jobId: string, step: StepDefinition): BuilderResult;
    /** Validates the current state and returns the YAML string */
    toYaml(): Promise<{
        success: true;
        yaml: string;
    } | {
        success: false;
        error: BuilderError;
    }>;
    /** Get read-only copy of internal state for inspection */
    getState(): WorkflowState;
}
