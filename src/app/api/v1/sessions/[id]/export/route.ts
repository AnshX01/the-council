/**
 * The Council - API v1: Export Session Endpoint
 *
 * GET /api/v1/sessions/:id/export?format=md|json|txt
 * Formats verdict and deliberation transcript for export and download.
 */

import { NextRequest } from 'next/server';
import crypto from 'node:crypto';
import { SessionRepository, EventRepository } from '@/lib/storage/repository';
import { apiErrorResponse } from '@/lib/api/error';
import { validateLocalhostRequest } from '@/lib/api/securityGuard';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  const { id: sessionId } = await params;
  const requestId = `req_${crypto.randomUUID().slice(0, 8)}`;
  const secError = validateLocalhostRequest(req, requestId);
  if (secError) return secError;

  const sessionRepo = new SessionRepository();
  const eventRepo = new EventRepository();

  const session = sessionRepo.getSession(sessionId);
  if (!session) {
    return apiErrorResponse(
      'SESSION_NOT_FOUND',
      `Cannot export non-existent session "${sessionId}".`,
      404,
      requestId
    );
  }

  const format = req.nextUrl.searchParams.get('format') || 'md';
  const events = eventRepo.getAllEvents(sessionId);
  const verdict = session.verdict_payload;

  if (format === 'json') {
    const fullExport = {
      session,
      events,
      exportedAt: new Date().toISOString(),
    };

    return new Response(JSON.stringify(fullExport, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Disposition': `attachment; filename="council-deliberation-${sessionId}.json"`,
        'x-request-id': requestId,
      },
    });
  }

  if (format === 'txt') {
    let txt = `THE COUNCIL DELIBERATION REPORT\n`;
    txt += `====================================================\n`;
    txt += `Session ID: ${sessionId}\n`;
    txt += `Date: ${new Date(session.created_at).toLocaleString()}\n`;
    txt += `Query: ${session.query}\n`;
    txt += `Status: ${session.status}\n`;
    txt += `Verdict: ${session.verdict_type || 'N/A'}\n\n`;

    if (verdict) {
      txt += `VERDICT SUMMARY\n---------------\n`;
      txt += `Conclusion: ${verdict.actionableConclusion || 'N/A'}\n\n`;
      if (Array.isArray(verdict.justificationPillars)) {
        txt += `Justification Pillars:\n`;
        verdict.justificationPillars.forEach((p: any, i: number) => {
          txt += `  ${i + 1}. ${p.pillar || p.title || p}\n`;
        });
        txt += `\n`;
      }
      if (Array.isArray(verdict.criticalCaveats)) {
        txt += `Critical Caveats:\n`;
        verdict.criticalCaveats.forEach((c: any, i: number) => {
          txt += `  - ${c.caveat || c.text || c}\n`;
        });
        txt += `\n`;
      }
    }

    return new Response(txt, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Content-Disposition': `attachment; filename="council-deliberation-${sessionId}.txt"`,
        'x-request-id': requestId,
      },
    });
  }

  // Default: Markdown format (format=md)
  let md = `# The Council: Deliberation Record\n\n`;
  md += `> **Query:** ${session.query}\n\n`;
  md += `- **Session ID:** \`${sessionId}\`\n`;
  md += `- **Date:** ${new Date(session.created_at).toUTCString()}\n`;
  md += `- **Status:** \`${session.status}\`\n`;
  md += `- **Verdict Type:** \`${session.verdict_type || 'IN_PROGRESS'}\`\n`;
  md += `- **Total LLM Calls:** ${session.call_count}\n\n`;

  md += `---\n\n`;

  if (verdict) {
    const isUnanimous = session.verdict_type === 'UNANIMOUS_CONSENSUS';
    md += `## Final Council Verdict: ${isUnanimous ? '✓ Unanimous Consensus' : '⚡ Consensus Not Fully Reached'}\n\n`;
    md += `### Actionable Conclusion\n${verdict.actionableConclusion || 'No conclusion recorded.'}\n\n`;

    if (Array.isArray(verdict.justificationPillars) && verdict.justificationPillars.length > 0) {
      md += `### Justification Pillars\n`;
      verdict.justificationPillars.forEach((p: any, i: number) => {
        const title = p.pillar || p.title || `Pillar ${i + 1}`;
        const desc = p.description || p.detail || '';
        md += `${i + 1}. **${title}**${desc ? `: ${desc}` : ''}\n`;
      });
      md += `\n`;
    }

    if (Array.isArray(verdict.criticalCaveats) && verdict.criticalCaveats.length > 0) {
      md += `### Critical Caveats & Residual Risks\n`;
      verdict.criticalCaveats.forEach((c: any) => {
        const text = c.caveat || c.text || c;
        md += `- ${text}\n`;
      });
      md += `\n`;
    }

    if (Array.isArray(verdict.dissenterRecords) && verdict.dissenterRecords.length > 0) {
      md += `### Dissenting Positions & Principles\n`;
      verdict.dissenterRecords.forEach((d: any) => {
        md += `- **${d.personaId}**: ${d.coreReason || d.reason || ''}\n`;
      });
      md += `\n`;
    }
  }

  md += `---\n\n## Deliberation Transcript\n\n`;

  for (const ev of events) {
    const p = ev.payload;
    if (ev.event_type === 'phase_started') {
      md += `### ${p.phase} (Phase ${p.phaseIndex})\n*${p.description}*\n\n`;
    } else if (ev.event_type === 'persona_message') {
      const speaker = (p.personaId || 'Unknown').toUpperCase();
      md += `**[${speaker}]** (${p.dialogueType || 'message'}):\n\n`;
      md += `${p.content}\n\n`;
    } else if (ev.event_type === 'ratification_vote') {
      const voteIcon = p.vote === 'SIGN_OFF' ? '✓' : p.vote === 'AMEND' ? '✎' : '✕';
      md += `> **Vote:** ${p.personaId} voted \`${p.vote}\` ${voteIcon} (Confidence: ${p.confidenceScore ?? 'N/A'}%)\n\n`;
    }
  }

  return new Response(md, {
    status: 200,
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      'Content-Disposition': `attachment; filename="council-deliberation-${sessionId}.md"`,
      'x-request-id': requestId,
    },
  });
}
