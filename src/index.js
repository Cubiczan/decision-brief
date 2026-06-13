import { fetch } from '@forge/api';
import { getAll } from '@forge/kvs';
import { safeFetch } from './lib/resilience/safeFetch.js';
import { createResolver, readCache, pick } from './forge-core/index.js';

const PROXY_BASE = 'https://db-proxy.example.com/api/decision-brief';
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const PROXY_TIMEOUT_MS = 8000; // fail fast into the KVS/mock fallback if the proxy hangs

const MOCK_CASES = {
  'DC-CFO-001': {
    decisionId: 'DC-CFO-001',
    title: 'Pricing Strategy for Enterprise Tier',
    domain: 'pricing',
    status: 'LOCKED',
    highStakes: true,
    currentPhase: 'ADVERSARIAL',
    currentRound: 3,
    originSystem: 'Claude',
    partnerSystem: 'Partner',
    foundationScore: 82,
    lockedDecisions: [{ decision: 'Increase enterprise pricing 12%', round: 2 }],
    dossier: { context: 'Board has requested pricing review for enterprise tier', coreProblem: 'Balancing margin expansion vs churn risk' },
    rounds: [
      { roundNumber: 1, phase: 'FOUNDATION', verdict: 'PARTIAL_AGREEMENT', originSummary: 'Base pricing maintains competitive positioning', partnerSummary: 'Room for 8-15% increase without churn' },
      { roundNumber: 2, phase: 'ADVERSARIAL', verdict: 'CLAUDE_WINS', originSummary: '12% increase with 5% annual discount', partnerSummary: '10% increase with quarterly commit' },
      { roundNumber: 3, phase: 'ADVERSARIAL', verdict: 'CONVERGENCE', originSummary: '12% increase, 5% discount, 90-day grandfather', partnerSummary: 'Accepted — monitor churn weekly' },
    ],
    audit: [
      { agent: 'Claude', claim: 'NDR will remain above 115%', grounding: 'Finance Model v3.2', confidence: '0.72', riskFlag: 'MEDIUM' },
      { agent: 'Partner', claim: 'Market supports 12% price increase', grounding: 'Gartner IT Spending 2025', confidence: '0.68', riskFlag: 'LOW' },
    ],
    briefs: [
      { title: 'FY2026 Revenue Forecast', company: 'TechNova Corp', type: 'forecast' },
      { title: 'Enterprise Pricing Analysis', company: 'TechNova Corp', type: 'investment_case' },
    ],
  },
  'DC-CFO-002': {
    decisionId: 'DC-CFO-002',
    title: 'Capital Allocation: R&D vs GTM Rebalancing',
    domain: 'capital_allocation',
    status: 'EXPLORING',
    highStakes: true,
    currentPhase: 'FOUNDATION',
    currentRound: 1,
    originSystem: 'Claude',
    partnerSystem: 'Partner',
    foundationScore: 45,
    lockedDecisions: [],
    dossier: { context: 'Board requested rebalancing from 55/45 to 50/50 R&D/GTM', coreProblem: 'GTM underfunding may impact Q3 pipeline' },
    rounds: [
      { roundNumber: 1, phase: 'FOUNDATION', verdict: 'IN_PROGRESS', originSummary: 'Current 55/45 split analysis', partnerSummary: 'Pending review' },
    ],
    audit: [
      { agent: 'Claude', claim: 'Current R&D efficiency can absorb 5% reallocation', grounding: 'Internal engineering metrics', confidence: '0.55', riskFlag: 'MEDIUM' },
    ],
    briefs: [],
  },
};

/**
 * Fetch decision brief data from CockroachDB REST proxy.
 *
 * safeFetch adds an 8s per-attempt AbortController timeout + bounded backoff so
 * a hung/slow proxy fails fast into the KVS/mock fallback instead of blocking
 * the resolver. Forge has no global fetch, so we pass @forge/api's fetch as the
 * implementation. (forge-core's createResolver catches throws as a fall-through.)
 */
async function getFromProxy(decisionId) {
  const response = await safeFetch(`${PROXY_BASE}/${encodeURIComponent(decisionId)}`, {
    fetchImpl: fetch,
    timeoutMs: PROXY_TIMEOUT_MS,
    maxAttempts: 2,
  });
  if (!response.ok) {
    return null;
  }
  return await response.json();
}

/**
 * Main macro resolver — tries proxy → storage (TTL) → mock fallback.
 */
const resolve = createResolver({
  fromProxy: ({ decisionId }) => getFromProxy(decisionId),
  fromCache: ({ decisionId }) =>
    readCache({
      read: () => getAll(`decision:${decisionId}`),
      ttlMs: CACHE_TTL_MS,
    }),
  mock: ({ decisionId }) => MOCK_CASES[decisionId] || MOCK_CASES['DC-CFO-001'],
});

export async function handler(request) {
  const decisionId = pick(request, ['extension', 'decisionId'], 'DC-CFO-001');
  return resolve({ decisionId });
}
