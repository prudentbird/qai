/**
 * Represents the result of an operation that can either succeed or fail.
 * @template T - The type of the data returned by a successful operation.
 * @template E - The type of the error returned by a failed operation, defaults to Error.
 */
type Result<T, E = Error> = [error: null, data: T] | [error: E, data: null];

/**
 * Safely executes a function that returns a Promise, capturing any errors that occur.
 * @template T - The type of the data returned by the function.
 * @template E - The type of the error that might occur, defaults to Error.
 * @param fn - The function to execute safely.
 * @returns A Promise that resolves to a Result tuple containing either the error or the non-nullable data.
 */
export function trySafe<T, E = Error>(fn: () => Promise<T>): Promise<Result<NonNullable<T>, E>>;

/**
 * Safely executes a synchronous function, capturing any errors that occur.
 * @template T - The type of the data returned by the function.
 * @template E - The type of the error that might occur, defaults to Error.
 * @param fn - The function to execute safely.
 * @returns A Result tuple containing either the error or the non-nullable data.
 */
export function trySafe<T, E = Error>(fn: () => T): Result<NonNullable<T>, E>;

export function trySafe<T, E = Error>(
  fn: () => T | Promise<T>,
): Result<NonNullable<T>, E> | Promise<Result<NonNullable<T>, E>> {
  const handleError = (error: unknown): [E, null] => {
    const err = error instanceof Error ? error : new Error(`Unexpected error: ${String(error)}`);
    return [err as E, null];
  };

  const handleSuccess = (data: T): Result<NonNullable<T>, E> => {
    if (data === null || data === undefined) {
      return [new Error('Operation returned null or undefined') as E, null];
    }
    return [null, data as NonNullable<T>];
  };

  try {
    const result = fn();

    if (result instanceof Promise) {
      return result.then(handleSuccess).catch(handleError);
    }

    return handleSuccess(result);
  } catch (error) {
    return handleError(error);
  }
}
