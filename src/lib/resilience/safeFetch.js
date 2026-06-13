// Vendored from cubiczan-resilience/typescript/src/safeFetch.ts
// Ported to a plain ES module so it runs in the Forge nodejs runtime (no TS build step).
//
// `fetch` wrapped with per-attempt AbortController timeout, exponential backoff
// + jitter on 429/5xx and network errors, fail-fast on other 4xx, and an
// optional SSRF allowlist. Returns the Response on success, or throws a typed
// ResilienceError after exhausting retries.
//
// NOTE: In the Forge runtime there is no global `fetch`; callers MUST pass
// `options.fetchImpl` (e.g. `@forge/api`'s fetch). The Forge fetch Response is
// shape-compatible (`.ok`, `.status`, `.json()`).

import { ResilienceError } from './errors.js';
import { retry } from './retry.js';

const RETRYABLE_STATUS = new Set([408, 425, 429, 500, 502, 503, 504]);

function buildAllowlistHook(allowlist) {
  if (allowlist === undefined) return undefined;
  if (typeof allowlist === 'function') return allowlist;
  const allowed = new Set(allowlist.map((h) => h.toLowerCase()));
  return (url) => allowed.has(url.hostname.toLowerCase());
}

function isRetryableStatus(status) {
  return RETRYABLE_STATUS.has(status);
}

export async function safeFetch(url, options = {}) {
  const {
    timeoutMs = 10_000,
    maxAttempts = 3,
    baseDelayMs = 250,
    maxDelayMs = 30_000,
    allowlist,
    fetchImpl,
    random,
    onRetry,
    ...requestInit
  } = options;

  const doFetch = fetchImpl ?? globalThis.fetch;
  if (typeof doFetch !== 'function') {
    throw new ResilienceError(
      'network',
      'global fetch is unavailable; pass options.fetchImpl',
      { attempts: 0 },
    );
  }

  const target = url instanceof URL ? url : new URL(url);

  // SSRF guard runs once, before any network I/O — fail closed when blocked.
  const allowHook = buildAllowlistHook(allowlist);
  if (allowHook && !allowHook(target)) {
    throw new ResilienceError(
      'ssrf',
      `host "${target.hostname}" is not in the allowlist`,
      { attempts: 0 },
    );
  }

  const callerSignal = requestInit.signal ?? undefined;

  return retry(
    async () => {
      // Per-attempt AbortController; linked to the caller's signal if present.
      const controller = new AbortController();
      const onCallerAbort = () => controller.abort(callerSignal?.reason);
      if (callerSignal) {
        if (callerSignal.aborted) controller.abort(callerSignal.reason);
        else callerSignal.addEventListener('abort', onCallerAbort, { once: true });
      }

      const timer = setTimeout(() => {
        controller.abort(
          new ResilienceError('timeout', `request timed out after ${timeoutMs}ms`),
        );
      }, timeoutMs);
      if (typeof timer === 'object' && timer !== null && 'unref' in timer) {
        timer.unref();
      }

      try {
        const response = await doFetch(target, {
          ...requestInit,
          signal: controller.signal,
        });

        if (!response.ok && isRetryableStatus(response.status)) {
          throw new ResilienceError(
            'http',
            `request failed with retryable status ${response.status}`,
            { status: response.status },
          );
        }
        // 4xx (except retryable) and 2xx/3xx are returned to the caller.
        return response;
      } catch (error) {
        if (callerSignal?.aborted) {
          throw new ResilienceError('aborted', 'request aborted by caller', {
            cause: callerSignal.reason,
          });
        }
        if (error instanceof ResilienceError) throw error;
        throw new ResilienceError('network', 'network request failed', {
          cause: error,
        });
      } finally {
        clearTimeout(timer);
        if (callerSignal) callerSignal.removeEventListener('abort', onCallerAbort);
      }
    },
    {
      maxAttempts,
      baseDelayMs,
      maxDelayMs,
      ...(random ? { random } : {}),
      ...(onRetry ? { onRetry } : {}),
      ...(callerSignal ? { signal: callerSignal } : {}),
      shouldRetry: (error) => {
        if (!(error instanceof ResilienceError)) return true;
        if (error.kind === 'ssrf' || error.kind === 'aborted') return false;
        if (error.kind === 'http') {
          return error.status !== undefined && isRetryableStatus(error.status);
        }
        return true; // timeout, network
      },
    },
  );
}
