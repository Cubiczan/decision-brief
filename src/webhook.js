import { set } from '@forge/kvs';
import crypto from '@forge/crypto';
import { createWebhookHandler } from './forge-core/index.js';
import { adaptGovernedValuePoolPacket } from './lib/governedOutput.js';

// HMAC webhook verification. Set WEBHOOK_SECRET in Forge app storage.
// POST requests must include an X-Webhook-Signature header: hex(sha256(secret + body)).
//
// Plumbing (method check, JSON parse, fail-closed HMAC verification, response
// envelope) comes from forge-core's createWebhookHandler. Only the signature
// digest, the decisionId validation, and the KVS write are app-specific.
export const handler = createWebhookHandler({
  computeExpected: ({ secret, rawBody }) =>
    crypto.sha256().update(secret + rawBody).digest().then((h) => h.toHex()),

  validate: (body) => {
    if (!body.decisionId) {
      return { ok: false, status: 400, reason: 'Missing required field: decisionId' };
    }
    if (body.governedValuePoolPacket) {
      try {
        adaptGovernedValuePoolPacket(body.governedValuePoolPacket);
      } catch (error) {
        return { ok: false, status: 400, reason: error.message };
      }
    }
    return { ok: true };
  },

  store: async (body) => {
    const { decisionId, governedValuePoolPacket, ...caseData } = body;
    await set(`decision:${decisionId}`, {
      data: {
        lastUpdated: new Date().toISOString(),
        ...(governedValuePoolPacket
          ? { governedValuePoolPacket: adaptGovernedValuePoolPacket(governedValuePoolPacket) }
          : {}),
        ...caseData,
      },
      timestamp: Date.now(),
    });
    return { message: `Decision brief ${decisionId} updated` };
  },
});
