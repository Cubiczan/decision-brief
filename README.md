# Decision Brief

> CFO-grade decision briefs with multi-round adversarial analysis, per-claim audit trails, and risk-flagged evidence — all inside Jira. Powered by CockroachDB.

![Decision Brief Screenshot](docs/decision-brief-screenshot.png)

---

## Overview

**Decision Brief** is a Jira Project Page app that brings institutional-grade decision governance to the tools your teams already use. It presents CFO decision cases in a structured format that captures the full lifecycle of high-stakes decisions — from initial problem framing through multi-round adversarial negotiation between AI agents, to per-claim audit trails with confidence scores and risk flags.

Each decision brief displays a dossier with core problem context, the current negotiation phase and round number, a foundation alignment score (0–100), and a record of locked decisions that have survived adversarial challenge. The three-tab interface separates the negotiation history from the audit trail and linked CFO briefs, giving stakeholders a clear view of how a decision was reached and what evidence underpins it.

Built on Atlassian Forge with CockroachDB as the data backbone, Decision Brief operates on a three-tier fallback architecture: live proxy data flows through Forge's key-value cache (5-minute TTL), and rich embedded mock data ensures the app is always operational.

### Key Features

| Feature | Description |
|---------|-------------|
| **Decision Dossier** | Structured problem framing with core problem statement, business context, and decision domain classification |
| **Multi-Round Adversarial Process** | Full negotiation history across Foundation and Adversarial phases, tracking Origin vs. Partner arguments for each round with convergence verdicts |
| **Phase Tracking** | Visual status badges for current phase (Foundation / Adversarial), round number, and overall case status (Exploring / In Progress / Locked / Converged) |
| **Foundation Score** | 0–100 alignment score between adversarial agents, indicating how much common ground exists before moving to adversarial rounds |
| **Locked Decisions** | Permanent record of decisions that survived adversarial challenge, including the round in which they were locked and the agreed-upon terms |
| **Per-Claim Audit Trail** | Every assertion made by either agent is individually auditable with the source grounding document, confidence score, and risk flag (High / Medium / Low) |
| **Agent Identification** | Each claim and round summary is attributed to the originating agent (e.g., Claude, Partner) with color-coded badges |
| **Linked CFO Briefs** | Related financial briefs and investment memos are surfaced in a dedicated tab, connecting the decision to its supporting financial analysis |
| **High-Stakes Flagging** | Decisions above a risk threshold are automatically flagged with a red "HIGH STAKES" badge for visibility |
| **Three-Tier Data Fallback** | CockroachDB REST Proxy → Forge KVS Cache (5-min TTL) → Rich Mock Data — zero-downtime guarantee |
| **Webtrigger Ingestion** | POST webhook endpoint for pushing decision updates from AI decision-making pipelines or case management systems |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Jira Project — Decision Briefs               │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │              Decision Brief Panel                          │  │
│  │           (Custom UI — @forge/ui)                         │  │
│  │  ┌────────────────────────────────────────────────────┐   │  │
│  │  │  Header: Title + Status Badges + Agent IDs         │   │  │
│  │  ├────────────────────────────────────────────────────┤   │  │
│  │  │  Core Problem (info) + Locked Decisions (success)  │   │  │
│  │  ├────────────────────────────────────────────────────┤   │  │
│  │  │  Tab: Adversarial Rounds | Audit Trail | Briefs    │   │  │
│  │  │  ┌──────────────────────────────────────────────┐  │   │  │
│  │  │  │  Round-by-round negotiation table             │  │   │  │
│  │  │  │  Rnd | Phase | Origin | Partner | Verdict     │  │   │  │
│  │  │  └──────────────────────────────────────────────┘  │   │  │
│  │  └────────────────────────────────────────────────────┘   │  │
│  └──────────────────────────┬────────────────────────────────┘  │
│                              │ resolver (src/index.js)          │
│                              ▼                                  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │              Three-Tier Data Layer                         │  │
│  │  Tier 1: CockroachDB REST Proxy (/api/decision-brief/:id) │  │
│  │  Tier 2: Forge KVS Cache (@forge/kvs, 5-min TTL)          │  │
│  │  Tier 3: Embedded Mock Data (DC-CFO-001, DC-CFO-002)      │  │
│  └───────────────────────────────────────────────────────────┘  │
│                              ▲                                  │
│                              │ webtrigger (POST)                │
│  ┌──────────────────────────┴────────────────────────────────┐  │
│  │              CockroachDB Data Sources                      │  │
│  │  • multi_agent_cfo_os (cfo_briefs, cfo_artifacts,         │  │
│  │    cfo_audit, decision_cases, round_records, forecasts)    │  │
│  │  • closed_loop_finance (evidence, findings)                 │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Adversarial Decision Framework

Decision Brief implements a structured multi-phase decision process:

### Phase 1: Foundation
Agents establish shared understanding and baseline assumptions. Each agent submits a founding position, and the system measures alignment with a Foundation Score (0–100). Higher scores indicate stronger shared ground before adversarial debate begins.

### Phase 2: Adversarial Rounds
Agents challenge each other's positions, propose alternatives, and negotiate toward convergence. Each round produces:
- **Origin Summary**: The primary agent's argument for the round
- **Partner Summary**: The counter-agent's response or counter-proposal
- **Verdict**: System-assessed outcome (Claude Wins / Partner Wins / Convergence / Partial Agreement / In Progress)

### Verdict Types

| Verdict | Meaning |
|---------|---------|
| **CONVERGENCE** | Both agents reached agreement on the decision |
| **CLAUDE_WINS** | Origin agent's position prevailed with stronger evidence |
| **PARTNER_WINS** | Counter-agent's position prevailed |
| **PARTIAL_AGREEMENT** | Agents agree on direction but not specifics |
| **IN_PROGRESS** | Round is ongoing or awaiting response |

### Risk Flags

| Flag | Color | Threshold |
|------|-------|-----------|
| **HIGH** | Red | Low confidence (< 0.60) or contradictory evidence |
| **MEDIUM** | Amber | Moderate confidence (0.60–0.75) or incomplete grounding |
| **LOW** | Green | High confidence (> 0.75) with strong source documents |

---

## Data Sources

Decision Brief aggregates decision governance data from CockroachDB databases:

| Database | Tables Used | Description |
|----------|-------------|-------------|
| `multi_agent_cfo_os` | `cfo_briefs`, `cfo_artifacts`, `cfo_audit`, `decision_cases`, `round_records`, `forecasts` | Full decision lifecycle: briefs, artifacts, per-claim audits, case metadata, round-by-round records, financial projections |
| `closed_loop_finance` | `evidence`, `findings` | Supporting evidence documents and analysis findings linked to decisions |

---

## Installation

### Prerequisites

- [Node.js](https://nodejs.org/) 20+ (LTS)
- [Forge CLI](https://developer.atlassian.com/platform/forge/getting-started/) v10+
- An Atlassian developer account with API token
- (Optional) A running [db-proxy](https://github.com/Cubiczan/db-proxy) instance for live CockroachDB data

### Quick Start

```bash
# 1. Clone the repository
git clone https://github.com/Cubiczan/decision-brief.git
cd decision-brief

# 2. Install dependencies
npm install

# 3. Authenticate with Forge
forge login

# 4. Deploy to development
forge deploy

# 5. Install on your Jira site
forge install --site <your-site>.atlassian.net --product jira
```

### Configuring the Data Proxy

To connect to live CockroachDB decision data, update the proxy URL in `src/index.js`:

```javascript
// src/index.js — line 4
const PROXY_BASE = 'https://your-proxy-url.com/api/decision-brief';
```

And update `manifest.yml`:

```yaml
permissions:
  external:
    fetch:
      backend:
        - "https://your-proxy-url.com"
```

Redeploy after changes:

```bash
forge deploy
```

Without a proxy, Decision Brief serves two richly detailed mock decision cases:
- **DC-CFO-001**: "Pricing Strategy for Enterprise Tier" — 3 rounds, convergent, foundation score 82
- **DC-CFO-002**: "Capital Allocation: R&D vs GTM Rebalancing" — 1 round, in progress, foundation score 45

---

## Usage

### Accessing in a Jira Project

1. Navigate to a Jira Project
2. In the left sidebar, click **Project pages** (or **Apps** → **Project pages**)
3. Select **Decision Brief** from the available project pages
4. The brief loads with the default decision case (configurable via `request.extension.decisionId`)

### Reading the Decision Brief

**Header badges tell you at a glance:**
- **Status**: EXPLORING → IN_PROGRESS → LOCKED / CONVERGED
- **HIGH STAKES**: Red flag for decisions above risk threshold
- **Phase + Round**: Where in the adversarial process the decision currently sits
- **Foundation Score**: How aligned the agents were before adversarial debate

**Tabs:**
- **Adversarial Rounds**: Full negotiation table showing each round's phase, both agents' summaries, and the verdict
- **Audit Trail**: Per-claim audit table with agent attribution, grounding source, confidence score, and risk flag — use this to verify evidence quality
- **Briefs**: Related CFO briefs and investment memos that informed the decision

### Webtrigger (External Data Push)

```bash
curl -X POST "https://<webtrigger-url>" \
  -H "Content-Type: application/json" \
  -d '{
    "decisionId": "DC-CFO-003",
    "title": "Vendor Consolidation — Cloud Infrastructure",
    "domain": "procurement",
    "status": "EXPLORING",
    "highStakes": true,
    "currentPhase": "FOUNDATION",
    "currentRound": 1,
    "originSystem": "Claude",
    "partnerSystem": "Gemini",
    "foundationScore": 60,
    "dossier": {
      "coreProblem": "3 cloud vendors with overlapping workloads",
      "context": "Board directive to reduce vendor count by 50%"
    },
    "rounds": [{ "roundNumber": 1, "phase": "FOUNDATION", ... }],
    "audit": [{ "agent": "Claude", "claim": "...", "grounding": "...", ... }]
  }'
```

---

## Project Structure

```
decision-brief/
├── manifest.yml               # Forge app manifest (modules, permissions, resources)
├── package.json               # Dependencies (@forge/ui, @forge/api, @forge/kvs)
├── src/
│   ├── index.js               # Backend resolver — three-tier data fetch + cache
│   ├── webhook.js             # Webtrigger handler — POST data ingestion
│   ├── frontend/
│   │   ├── index.html         # Custom UI HTML shell
│   │   └── index.jsx          # Custom UI React component (tabs, tables, badges)
│   └── webhook-fn/
│       └── index.js           # Webtrigger function entry point
└── docs/
    └── decision-brief-screenshot.png
```

---

## Technical Details

- **Runtime**: Node.js 24.x (Forge-managed)
- **UI Framework**: `@forge/ui` Custom UI with `Tabs`, `Table`, `StatusLozenge`, and `Badge` components
- **Storage**: `@forge/kvs` (Forge Key-Value Store) — per-decision caching with 5-minute TTL
- **HTTP Client**: `@forge/api` `fetch` (Forge's secure, permission-gated HTTP client)
- **Module Type**: `jira:projectPage`
- **Scopes**: `read:jira-work`, `storage:app`
- **Permissions**: `external:fetch` to backend proxy URL

---

## Related Repositories

| Repository | Description |
|------------|-------------|
| [market-radar](https://github.com/Cubiczan/market-radar) | Market sentiment + Fed policy dashboard (Jira Dashboard Gadget) |
| [finance-cockpit](https://github.com/Cubiczan/finance-cockpit) | CFO financial dashboard (Jira Project Page) |
| [db-proxy](https://github.com/Cubiczan/db-proxy) | CockroachDB REST proxy serving all Forge apps |

---

## License

Private repository. All rights reserved.
