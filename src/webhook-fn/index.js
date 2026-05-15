import { set } from '@forge/kvs';

export async function handler(request) {
  if (request.method !== 'POST') {
    return { status: 405, body: { error: 'Method not allowed' } };
  }

  try {
    const body = await request.json();
    const { decisionId, ...caseData } = body;

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
