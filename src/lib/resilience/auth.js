// Vendored/adapted from cubiczan-resilience/typescript/src/auth.ts
// Ported to a plain ES module for the Forge nodejs runtime (no TS build step).
//
// Fail-closed credential gate: when the expected secret is unset we REFUSE the
// request (503 misconfigured) rather than degrading to "allow". This is the
// generic predicate form; `requireWebhookSecret` adapts it to a configured
// secret value (the Forge webtrigger has no standard Authorization header, it
// uses an HMAC scheme keyed on WEBHOOK_SECRET).

/**
 * Fail-closed check that a webhook secret is configured.
 *
 * @param {string | undefined} secret  the configured WEBHOOK_SECRET
 * @returns {{ ok: true } | { ok: false, status: 503, reason: string }}
 */
export function requireWebhookSecret(secret) {
  if (!secret) {
    return {
      ok: false,
      status: 503,
      reason: 'Server misconfigured: WEBHOOK_SECRET is not set',
    };
  }
  return { ok: true };
}
