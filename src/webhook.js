import { set } from '@forge/kvs';
import crypto from '@forge/crypto';
import { createWebhookHandler } from './forge-core/index.js';

// HMAC webhook verification. Set WEBHOOK_SECRET in Forge app storage.
// POST requests must include an X-Webhook-Signature header: hex(sha256(secret + body)).
//
// Plumbing (method check, JSON parse, fail-closed HMAC verification, response
// envelope) comes from forge-core's createWebhookHandler. Only the signature
// digest, the decisionId validation, and the KVS write are app-specific.
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
