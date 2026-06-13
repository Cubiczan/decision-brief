import { set } from '@forge/kvs';
import crypto from '@forge/crypto';
import { requireWebhookSecret } from './lib/resilience/auth.js';

// HMAC webhook verification. Set WEBHOOK_SECRET in Forge app storage.
// POST requests must include an X-Webhook-Signature header: hex(sha256(secret + body))
export async function handler(request) {
  if (request.method !== 'POST') {
    return { status: 405, body: { error: 'Method not allowed' } };
  }

  try {
    const body = await request.json();
    const { decisionId, ...caseData } = body;
    const rawBody = JSON.stringify(body);

    // HMAC signature verification — fail closed.
    const secret = process.env.WEBHOOK_SECRET || '';

    // If no secret is configured, refuse the request rather than allowing an
    // unauthenticated write to KVS (was previously a no-op when unset).
    const auth = requireWebhookSecret(secret);
    if (!auth.ok) {
      return { status: auth.status, body: { error: auth.reason } };
    }

    const signature = request.headers.get('x-webhook-signature');
    if (!signature) {
      return { status: 401, body: { error: 'Missing X-Webhook-Signature header' } };
    }
    const expected = await crypto.sha256().update(secret + rawBody).digest().then(h => h.toHex());
    if (signature !== expected) {
      return { status: 401, body: { error: 'Invalid webhook signature' } };
    }

    if (!decisionId) {
      return { status: 400, body: { error: 'Missing required field: decisionId' } };
    }

    await set(`decision:${decisionId}`, {
      data: {
        lastUpdated: new Date().toISOString(),
        ...caseData
      },
      timestamp: Date.now()
    });

    return {
      status: 200,
      body: { success: true, message: `Decision brief ${decisionId} updated` }
    };
  } catch (e) {
    return { status: 400, body: { error: 'Invalid JSON body' } };
  }
}
