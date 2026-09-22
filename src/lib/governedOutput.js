/**
 * Boundary adapter for evidence-backed value pools in decision packets.
 *
 * It validates the packet before storage/rendering so unsupported or
 * ungrounded estimates cannot silently become board-ready output.
 */
const DOMAINS = new Set(['procurement', 'working_capital']);

export function validateGovernedValuePoolPacket(packet) {
  const errors = [];
  if (!packet || typeof packet !== 'object') return ['packet must be an object'];
  if (!packet.packetId) errors.push('packetId is required');
  if (!packet.decisionStatement) errors.push('decisionStatement is required');
  if (!packet.recommendation) errors.push('recommendation is required');
  if (!packet.decisionOwner) errors.push('decisionOwner is required');
  if (!Array.isArray(packet.valuePools) || packet.valuePools.length === 0) {
    errors.push('at least one value pool is required');
    return errors;
  }

  packet.valuePools.forEach((pool, index) => {
    const prefix = `valuePools[${index}]`;
    if (!pool.poolId) errors.push(`${prefix}.poolId is required`);
    if (!pool.name) errors.push(`${prefix}.name is required`);
    if (!DOMAINS.has(pool.domain)) errors.push(`${prefix}.domain is unsupported`);
    if (typeof pool.valueAmount !== 'number' || pool.valueAmount < 0) {
      errors.push(`${prefix}.valueAmount must be non-negative`);
    }
    if (!pool.valueCurrency) errors.push(`${prefix}.valueCurrency is required`);
    if (!pool.valueBasis) errors.push(`${prefix}.valueBasis is required`);
    if (typeof pool.confidence !== 'number' || pool.confidence < 0 || pool.confidence > 1) {
      errors.push(`${prefix}.confidence must be between 0 and 1`);
    }
    if (!pool.owner) errors.push(`${prefix}.owner is required`);
    if (!Array.isArray(pool.evidence) || pool.evidence.length === 0) {
      errors.push(`${prefix}.evidence is required`);
    } else {
      pool.evidence.forEach((evidence, evidenceIndex) => {
        const evidencePrefix = `${prefix}.evidence[${evidenceIndex}]`;
        if (!evidence.sourceId) errors.push(`${evidencePrefix}.sourceId is required`);
        if (!evidence.sourceType) errors.push(`${evidencePrefix}.sourceType is required`);
        if (evidence.confidence != null &&
            (typeof evidence.confidence !== 'number' || evidence.confidence < 0 || evidence.confidence > 1)) {
          errors.push(`${evidencePrefix}.confidence must be between 0 and 1`);
        }
      });
    }
  });
  return errors;
}

export function adaptGovernedValuePoolPacket(packet) {
  const errors = validateGovernedValuePoolPacket(packet);
  if (errors.length) throw new Error(`Invalid governed value-pool packet: ${errors.join('; ')}`);

  return {
    packetId: String(packet.packetId),
    decisionStatement: String(packet.decisionStatement),
    recommendation: String(packet.recommendation),
    decisionOwner: String(packet.decisionOwner),
    decisionDeadline: packet.decisionDeadline ? String(packet.decisionDeadline) : '',
    valuePools: packet.valuePools.map((pool) => ({
      ...pool,
      valueAmount: Number(pool.valueAmount),
      confidence: Number(pool.confidence),
      assumptions: Array.isArray(pool.assumptions) ? [...pool.assumptions] : [],
      risks: Array.isArray(pool.risks) ? [...pool.risks] : [],
      releaseGates: Array.isArray(pool.releaseGates) ? [...pool.releaseGates] : [],
      evidence: pool.evidence.map((evidence) => ({
        ...evidence,
        confidence: evidence.confidence == null ? null : Number(evidence.confidence),
      })),
    })),
  };
}

export function normalizeDecisionPacket(packet) {
  if (!packet?.governedValuePoolPacket) return packet;
  return {
    ...packet,
    governedValuePoolPacket: adaptGovernedValuePoolPacket(packet.governedValuePoolPacket),
  };
}
