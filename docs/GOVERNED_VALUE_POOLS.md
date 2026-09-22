# Governed Value-Pool Packets

Decision Brief accepts an optional `governedValuePoolPacket` on a decision update. The adapter validates and normalizes this packet before it is written to KVS or rendered in the Value Pools tab.

The contract is generic for procurement and working-capital opportunities:

- `packetId`, `decisionStatement`, `recommendation`, and `decisionOwner`
- `valuePools[]` with `domain`, amount/currency, `valueBasis`, confidence, and pool owner
- At least one `evidence` reference per pool
- Optional assumptions, risks, release gates, and decision deadline

Only `procurement` and `working_capital` domains are accepted. Evidence is mandatory so an estimate cannot be promoted to a CFO or board packet without a traceable grounding reference. The adapter does not assert that a value pool is realizable; release gates remain part of the packet for review.

Example shape:

```json
{
  "governedValuePoolPacket": {
    "packetId": "vp-001",
    "decisionStatement": "Which value pools should enter the plan?",
    "recommendation": "Release the highest-confidence pool behind its gates.",
    "decisionOwner": "finance",
    "valuePools": [{
      "poolId": "pool-001",
      "name": "Payment-cycle opportunity",
      "domain": "working_capital",
      "valueAmount": 125000,
      "valueCurrency": "USD",
      "valueBasis": "Verified transaction history",
      "confidence": 0.84,
      "owner": "treasury",
      "evidence": [{ "sourceId": "ledger-001", "sourceType": "ledger_extract" }],
      "releaseGates": ["Confirm control owner"]
    }]
  }
}
```
