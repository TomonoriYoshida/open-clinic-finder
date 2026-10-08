import createClient from "openapi-fetch";
import type { paths } from "./schema";

/**
 * Empty in production: the site is served by the API's own server, so the
 * browser calls /api on the same origin. `next dev` sets the API's origin.
 */
export const apiOrigin = (process.env.NEXT_PUBLIC_API_ORIGIN ?? "").replace(/\/+$/, "");

export const apiDocsUrl = `${apiOrigin}/docs/api`;

export const apiClient = createClient<paths>({ baseUrl: `${apiOrigin}/api` });

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

/**
 * Unwraps an openapi-fetch result, turning network failures and non-2xx
 * responses into an ApiError that carries the API's own message.
 */
export async function unwrap<T>(
  request: Promise<{ data?: T; error?: unknown; response: Response }>,
): Promise<T> {
  let result;
  try {
    result = await request;
  } catch {
    throw new ApiError("接続できませんでした。電波の良いところで、もう一度お試しください。", 0);
  }

  if (result.response.status === 429) {
    throw new ApiError("アクセスが集中しています。1分ほど待ってから、もう一度お試しください。", 429);
  }

  if (result.data === undefined) {
    const message =
      typeof result.error === "object" &&
      result.error !== null &&
      "message" in result.error &&
      typeof result.error.message === "string"
        ? result.error.message
        : `エラーが発生しました（HTTP ${result.response.status}）`;
    throw new ApiError(message, result.response.status);
  }

  return result.data;
}
