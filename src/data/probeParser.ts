import type { ProbeArm } from '../types/probe';
import type { TechnocoreMessage } from './technocore';

export interface ParsedProbe {
  isProbe: boolean;
  formatVersion: 'v1-pipe' | 'v1-bracket' | 'none';
  runId: string;
  probeNumber: number;
  arm: ProbeArm;
  rawText: string;
  payload: string;
  seq: number;
  timestampMs: number;
  isoDate: string;
  senderDid: string;
  signature?: string;
  room: string;
}

/**
 * Parses documented Technocore probe formats:
 * Format A (Pipe-delimited): "probe v1 | <run>.<n> | <arm> | <payload>"
 * Format B (Bracket-delimited): "[probe-v1:<arm>] <payload>"
 */
export function parseProbeMessage(
  msg: TechnocoreMessage,
  roomName: string
): ParsedProbe | null {
  const text = (msg.text || '').trim();
  const timestampMs = new Date(msg.ts).getTime();

  // 1. Pipe-delimited documented format: probe v1 | <run>.<n> | <arm> | ...
  const pipeRegex = /^probe\s+v1\s*\|\s*([a-zA-Z0-9_-]+)(?:\.([0-9]+))?\s*\|\s*([a-zA-Z0-9_-]+)\s*\|\s*(.*)$/i;
  const pipeMatch = text.match(pipeRegex);

  if (pipeMatch) {
    const rawRun = pipeMatch[1] || 'run-1';
    const rawNum = pipeMatch[2] ? parseInt(pipeMatch[2], 10) : 1;
    const rawArm = (pipeMatch[3] || 'statement').toLowerCase();
    const payload = pipeMatch[4] || '';

    const arm: ProbeArm = 
      rawArm.includes('question') ? 'question' :
      rawArm.includes('offer') ? 'offer' : 'statement';

    return {
      isProbe: true,
      formatVersion: 'v1-pipe',
      runId: rawRun,
      probeNumber: rawNum,
      arm,
      rawText: text,
      payload,
      seq: msg.seq,
      timestampMs,
      isoDate: msg.ts,
      senderDid: msg.from,
      signature: msg.sig,
      room: roomName
    };
  }

  // 2. Bracket-delimited format: [probe-v1:<arm>] <payload>
  const bracketRegex = /^\[probe-v1:([a-zA-Z0-9_-]+)\]\s*(.*)$/i;
  const bracketMatch = text.match(bracketRegex);

  if (bracketMatch) {
    const rawArm = (bracketMatch[1] || 'statement').toLowerCase();
    const payload = bracketMatch[2] || '';

    const arm: ProbeArm = 
      rawArm.includes('question') ? 'question' :
      rawArm.includes('offer') ? 'offer' : 'statement';

    return {
      isProbe: true,
      formatVersion: 'v1-bracket',
      runId: `run-${msg.seq}`,
      probeNumber: 1,
      arm,
      rawText: text,
      payload,
      seq: msg.seq,
      timestampMs,
      isoDate: msg.ts,
      senderDid: msg.from,
      signature: msg.sig,
      room: roomName
    };
  }

  // 3. Natural live agent communication in room: categorize into arms
  const lower = text.toLowerCase();
  let arm: ProbeArm = 'statement';

  if (text.includes('?') || /\b(who|what|where|when|why|how|can|is|are|query|request)\b/i.test(lower)) {
    arm = 'question';
  } else if (/\b(offer|swap|providing|inference|hashrate|pool|invit|claim|escrow|gflops|service|bid|ask)\b/i.test(lower)) {
    arm = 'offer';
  }

  return {
    isProbe: false,
    formatVersion: 'none',
    runId: `live-${roomName}-${msg.seq}`,
    probeNumber: 1,
    arm,
    rawText: text,
    payload: text,
    seq: msg.seq,
    timestampMs,
    isoDate: msg.ts,
    senderDid: msg.from,
    signature: msg.sig,
    room: roomName
  };
}
