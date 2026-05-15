import {
  render, Text, Heading, Strong, Badge, StatusLozenge, SectionMessage,
  Table, Head, Cell, Row, Tag, Tabs, Tab, Fragment, Code,
} from '@forge/ui';

function VerdictBadge({ verdict }) {
  const map = {
    CONVERGENCE: 'success', CLAUDE_WINS: 'success', PARTNER_WINS: 'success',
    PARTIAL_AGREEMENT: 'moved', IN_PROGRESS: 'inprogress', PENDING: 'default',
  };
  return <StatusLozenge text={verdict} appearance={map[verdict] || 'default'} />;
}

function RiskBadge({ flag }) {
  const map = { HIGH: 'removed', MEDIUM: 'moved', LOW: 'added' };
  return <StatusLozenge text={flag} appearance={map[flag] || 'default'} />;
}

function RoundTable({ rounds }) {
  return (
    <Table>
      <Head>
        <Cell><Text size="small"><Strong>Rnd</Strong></Text></Cell>
        <Cell><Text size="small"><Strong>Phase</Strong></Text></Cell>
        <Cell><Text size="small"><Strong>Origin</Strong></Text></Cell>
        <Cell><Text size="small"><Strong>Partner</Strong></Text></Cell>
        <Cell><Text size="small"><Strong>Verdict</Strong></Text></Cell>
      </Head>
      {rounds.map((r, i) => (
        <Row key={i}>
          <Cell><Text>{r.roundNumber}</Text></Cell>
          <Cell><Text>{r.phase}</Text></Cell>
          <Cell><Text>{r.originSummary}</Text></Cell>
          <Cell><Text>{r.partnerSummary}</Text></Cell>
          <Cell><VerdictBadge verdict={r.verdict} /></Cell>
        </Row>
      ))}
    </Table>
  );
}

function AuditTable({ audit }) {
  return (
    <Table>
      <Head>
        <Cell><Text size="small"><Strong>Agent</Strong></Text></Cell>
        <Cell><Text size="small"><Strong>Claim</Strong></Text></Cell>
        <Cell><Text size="small"><Strong>Grounding</Strong></Text></Cell>
        <Cell><Text size="small"><Strong>Confidence</Strong></Text></Cell>
        <Cell><Text size="small"><Strong>Risk</Strong></Text></Cell>
      </Head>
      {audit.map((a, i) => (
        <Row key={i}>
          <Cell><Badge text={a.agent} appearance={a.agent === 'Claude' ? 'blue' : 'purple'} /></Cell>
          <Cell><Text>{a.claim}</Text></Cell>
          <Cell><Text appearance="subtle">{a.grounding}</Text></Cell>
          <Cell><Text>{a.confidence}</Text></Cell>
          <Cell><RiskBadge flag={a.riskFlag} /></Cell>
        </Row>
      ))}
    </Table>
  );
}

export const handler = async (data) => {
  const statusColor = data.status === 'LOCKED' ? 'success' : 'inprogress';
  const scoreColor = data.foundationScore >= 70 ? 'green' : data.foundationScore >= 50 ? 'yellow' : 'red';

  return (
    <Fragment>
      <Heading size="medium">{data.title}</Heading>
      <Text>
        <StatusLozenge text={data.status} appearance={statusColor} />
        {data.highStakes && <StatusLozenge text="HIGH STAKES" appearance="removed" />}
        <Badge text={`Phase: ${data.currentPhase}`} />
        <Badge text={`Round ${data.currentRound}`} />
        <Badge text={`Foundation: ${data.foundationScore}/100`} appearance={data.foundationScore >= 70 ? 'success' : 'moved'} />
        <Text appearance="subtle"> · {data.originSystem} ↔ {data.partnerSystem} · Domain: {data.domain}</Text>
      </Text>

      {data.dossier?.coreProblem && (
        <SectionMessage title="Core Problem" appearance="info">
          <Text>{data.dossier.coreProblem}</Text>
          {data.dossier.context && <Text appearance="subtle">{data.dossier.context}</Text>}
        </SectionMessage>
      )}

      {data.lockedDecisions?.length > 0 && (
        <SectionMessage title="Locked Decisions" appearance="success">
          {data.lockedDecisions.map((d, i) => (
            <Text key={i}>✓ {d.decision} <Text appearance="subtle">(Locked Round {d.round})</Text></Text>
          ))}
        </SectionMessage>
      )}

      <Tabs>
        <Tab label="Adversarial Rounds">
          <Heading size="small">Negotiation History</Heading>
          <RoundTable rounds={data.rounds || []} />
        </Tab>
        <Tab label="Audit Trail">
          <Heading size="small">Per-Claim Audit</Heading>
          <AuditTable audit={data.audit || []} />
        </Tab>
        <Tab label="Briefs">
          <Heading size="small">Related CFO Briefs</Heading>
          {data.briefs?.length > 0 ? data.briefs.map((b, i) => (
            <Text key={i}>• <Strong>{b.title}</Strong> — {b.company} <Badge text={b.type} /></Text>
          )) : <Text appearance="subtle">No briefs linked</Text>}
        </Tab>
      </Tabs>
    </Fragment>
  );
};

export default handler;
