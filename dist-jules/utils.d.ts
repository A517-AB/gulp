/**
 * The internal engine for jules.all()
 *
 * @param items - Data to process
 * @param mapper - Async function (item) => result
 * @param options - Configuration options
 */
export declare function pMap<T, R>(items: T[], mapper: (item: T, index: number) => Promise<R>, options?: {
    concurrency?: number;
    stopOnError?: boolean;
    delayMs?: number;
}): Promise<R[]>;
