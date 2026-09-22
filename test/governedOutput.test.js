import test from 'node:test';
import assert from 'node:assert/strict';
import {
  adaptGovernedValuePoolPacket,
  validateGovernedValuePoolPacket,
} from '../src/lib/governedOutput.js';

const packet = {
  packetId: 'vp-001',
  decisionStatement: 'Which value pools should enter the plan?',
  recommendation: 'Release the highest-confidence pool behind its gates.',
  decisionOwner: 'finance',
  valuePools: [{
    poolId: 'pool-001',
    name: 'Payment-cycle opportunity',
    domain: 'working_capital',
    valueAmount: 125000,
    valueCurrency: 'USD',
    valueBasis: 'Verified trailing twelve-month transaction history',
    confidence: 0.84,
    owner: 'treasury',
    evidence: [{ sourceId: 'ledger-001', sourceType: 'ledger_extract' }],
    assumptions: ['No material dispute changes the baseline'],
    risks: ['Operational change may delay realization'],
    releaseGates: ['Confirm control owner'],
  }],
};

test('adapts a governed value-pool packet without dropping evidence', () => {
  const adapted = adaptGovernedValuePoolPacket(packet);
  assert.equal(adapted.valuePools[0].domain, 'working_capital');
  assert.equal(adapted.valuePools[0].evidence[0].sourceId, 'ledger-001');
});

test('rejects unsupported and ungrounded pools', () => {
  const invalid = structuredClone(packet);
  invalid.valuePools[0].domain = 'marketing';
  invalid.valuePools[0].evidence = [];
  const errors = validateGovernedValuePoolPacket(invalid);
  assert.ok(errors.some((error) => error.includes('domain')));
  assert.ok(errors.some((error) => error.includes('evidence')));
  assert.throws(() => adaptGovernedValuePoolPacket(invalid), /Invalid governed/);
});
