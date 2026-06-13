import { set } from '@forge/kvs';
import crypto from '@forge/crypto';
import { createWebhookHandler } from '../forge-core/index.js';

// Alternate webtrigger entrypoint. This handler previously accepted writes with
// NO signature verification at all. It is now built from forge-core's
// createWebhookHandler, which is fail-closed by construction: a missing/blank
// WEBHOOK_SECRET => 503, a missing or invalid X-Webhook-Signature => 401. The
// unauthenticated-write bug can no longer be reintroduced here.
export const handler = createWebhookHandler({
  computeExpected: ({ secret, rawBody }) =>
    crypto.sha256().update(secret + rawBody).digest().then((h) => h.toHex()),

  validate: (body) =>
    body.decisionId
      ? { ok: true }
      : { ok: false, status: 400, reason: 'Missing required field: decisionId' },

  store: async (body) => {
    const { decisionId, ...caseData } = body;
    await set(`decision:${decisionId}`, {
      data: {
        lastUpdated: new Date().toISOString(),
        ...caseData,
      },
      timestamp: Date.now(),
    });
    return { message: `Decision brief ${decisionId} updated` };
  },
});
