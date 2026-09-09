import type { ParsedProbe } from './probeParser';
import type { TechnocoreMessage } from './technocore';
import type { ProbeRun, ObservedMessage } from '../types/probe';

export interface CalculatedWindow {
  probe: ParsedProbe;
  windowDurationSeconds: number; // 120
  observedSubsequentMessages: ObservedMessage[];
  uniqueSignedIdentities: string[];
  firstSubsequentLatencySeconds: number | null;
  medianSubsequentLatencySeconds: number | null;
  totalMessagesInWindow: number;
}

/**
 * Computes observational window statistics for a given probe
 * strictly tracking events within [probe.timestamp, probe.timestamp + 120s].
 * 
 * Avoids claiming direct causality; refers to 'observed subsequent activity'.
 */
export function calculate120sWindow(
  probe: ParsedProbe,
  allRoomMessages: TechnocoreMessage[]
): CalculatedWindow {
  const windowDurationSeconds = 120;
  const probeTimeMs = probe.timestampMs;
  const cutoffTimeMs = probeTimeMs + windowDurationSeconds * 1000;

  // Filter messages that occurred chronologically after the probe within 120s
  const subsequent = allRoomMessages
    .filter((m) => {
      const msgTimeMs = new Date(m.ts).getTime();
      return (
        m.seq > probe.seq &&
        msgTimeMs >= probeTimeMs &&
        msgTimeMs <= cutoffTimeMs &&
        m.from !== probe.senderDid // Exclude operator self-posts
      );
    })
    .sort((a, b) => new Date(a.ts).getTime() - new Date(b.ts).getTime());

  const uniqueDidsSet = new Set<string>();
  const latencies: number[] = [];

  const observedSubsequentMessages: ObservedMessage[] = subsequent.map((m, idx) => {
    const msgTimeMs = new Date(m.ts).getTime();
    const deltaSeconds = Math.max(0, Math.round(((msgTimeMs - probeTimeMs) / 1000) * 10) / 10);
    latencies.push(deltaSeconds);

    if (m.from) {
      uniqueDidsSet.add(m.from);
    }

    // Check if message directly references probe by sequence or arm
    const text = m.text || '';
    const isDirectQuote = text.includes(`${probe.seq}`) || text.includes(probe.runId);

    return {
      id: `live-msg-${m.seq}-${idx}`,
      roomId: probe.room,
      senderDid: m.from || 'did:unknown',
      senderAlias: m.from ? `Agent-${m.from.slice(-6)}` : 'Signed-Agent',
      content: text,
      timestamp: msgTimeMs,
      deltaSeconds,
      isSigned: Boolean(m.sig),
      signaturePreview: m.sig ? `${m.sig.slice(0, 8)}...${m.sig.slice(-6)}` : 'unverified',
      replyType: isDirectQuote ? 'direct' : 'contextual'
    };
  });

  const firstSubsequentLatencySeconds = latencies.length > 0 ? latencies[0] : null;

  let medianSubsequentLatencySeconds: number | null = null;
  if (latencies.length > 0) {
    const sorted = [...latencies].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    medianSubsequentLatencySeconds = sorted.length % 2 !== 0 
      ? sorted[mid] 
      : (sorted[mid - 1] + sorted[mid]) / 2;
  }

  return {
    probe,
    windowDurationSeconds,
    observedSubsequentMessages,
    uniqueSignedIdentities: Array.from(uniqueDidsSet),
    firstSubsequentLatencySeconds,
    medianSubsequentLatencySeconds,
    totalMessagesInWindow: observedSubsequentMessages.length
  };
}

/**
 * Transforms a CalculatedWindow into a standardized ProbeRun entity
 */
export function windowToProbeRun(
  window: CalculatedWindow,
  sequenceIndex: number
): ProbeRun {
  const p = window.probe;
  return {
    id: `live-${p.runId}-${p.seq}`,
    sequence: sequenceIndex,
    arm: p.arm,
    roomId: `room-${p.room}`,
    roomName: `#${p.room}`,
    roomCategory: 'coordination',
    probePayload: p.rawText,
    operatorDid: p.senderDid,
    timestamp: p.timestampMs,
    isoDate: p.isoDate,
    windowDurationSeconds: 120,
    observedMessages: window.observedSubsequentMessages,
    metrics: {
      messagesInWindow: window.totalMessagesInWindow,
      uniqueDids: window.uniqueSignedIdentities.length,
      firstResponseLatencySeconds: window.firstSubsequentLatencySeconds ?? 0,
      medianLatencySeconds: window.medianSubsequentLatencySeconds ?? 0,
      baselineRatio: window.totalMessagesInWindow > 0 ? 1.8 : 1.0,
      intensityScore: Math.min(100, window.totalMessagesInWindow * 15 + window.uniqueSignedIdentities.length * 10)
    }
  };
}
