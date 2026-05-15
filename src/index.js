import { fetch } from '@forge/api';
import { getAll, set } from '@forge/kvs';

const PROXY_BASE = 'https://db-proxy.example.com/api/decision-brief';
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

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
 */
async function getFromProxy(decisionId) {
  try {
    const response = await fetch(`${PROXY_BASE}/${encodeURIComponent(decisionId)}`);
    if (!response.ok) {
      return null;
    }
    return await response.json();
  } catch {
    return null;
  }
}

/**
 * Retrieve cached decision brief from Forge storage with TTL-based expiry.
 */
async function getFromStorage(decisionId) {
  try {
    const cached = await getAll(`decision:${decisionId}`);
    if (!cached || !cached.timestamp) {
      return null;
    }
    if (Date.now() - cached.timestamp > CACHE_TTL_MS) {
      return null;
    }
    return cached.data;
  } catch {
    return null;
  }
}

/**
 * Main macro resolver — tries proxy → storage → mock fallback.
 */
export async function handler(request) {
  const decisionId = request.extension?.decisionId || 'DC-CFO-001';

  // 1. Try CockroachDB REST proxy
  let caseData = await getFromProxy(decisionId);

  // 2. Fall back to Forge storage cache
  if (!caseData) {
    caseData = await getFromStorage(decisionId);
  }

  // 3. Fall back to mock data
  if (!caseData) {
    caseData = MOCK_CASES[decisionId] || MOCK_CASES['DC-CFO-001'];
  }

  return caseData;
}
