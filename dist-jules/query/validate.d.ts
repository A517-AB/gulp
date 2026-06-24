/**
 * Query Validator for Jules Query Language
 *
 * Validates queries before execution, providing actionable error messages
 * for LLMs to self-correct their queries.
 */
export interface ValidationError {
    /** Error code for programmatic handling */
    code: ValidationErrorCode;
    /** JSON path to the error location (e.g., "where.artifacts.type") */
    path: string;
    /** Human-readable error message */
    message: string;
    /** Suggested fix or valid alternatives */
    suggestion?: string;
}
export interface ValidationWarning {
    /** Warning code */
    code: string;
    /** JSON path to the warning location */
    path: string;
    /** Human-readable warning message */
    message: string;
}
export interface ValidationResult {
    /** Whether the query is valid */
    valid: boolean;
    /** Validation errors (if any) */
    errors: ValidationError[];
    /** Validation warnings (non-blocking issues) */
    warnings: ValidationWarning[];
    /** Auto-corrected query (if corrections were possible) */
    correctedQuery?: Record<string, unknown>;
}
export type ValidationErrorCode = 'INVALID_STRUCTURE' | 'MISSING_REQUIRED_FIELD' | 'INVALID_DOMAIN' | 'INVALID_FIELD_PATH' | 'INVALID_OPERATOR' | 'INVALID_OPERATOR_VALUE' | 'COMPUTED_FIELD_FILTER' | 'INVALID_ORDER' | 'INVALID_LIMIT' | 'INVALID_SELECT_EXPRESSION';
/**
 * Validate a Jules Query Language query
 *
 * @param query - The query object to validate
 * @returns Validation result with errors, warnings, and optional corrections
 *
 * @example
 * ```typescript
 * const result = validateQuery({
 *   from: 'activities',
 *   where: { type: 'agentMessaged' },
 *   select: ['id', 'message']
 * });
 *
 * if (!result.valid) {
 *   console.log('Errors:', result.errors);
 * }
 * ```
 */
export declare function validateQuery(query: unknown): ValidationResult;
/**
 * Format validation result as a human-readable string
 */
export declare function formatValidationResult(result: ValidationResult): string;
