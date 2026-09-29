/**
 * The Council - Structured Prompt Templates & Prompt Injection Defense
 *
 * All user dilemmas are bounded within XML tags (`<deliberation_subject>`)
 * and system prompts explicitly instruct LLMs to treat that input as untrusted
 * subject matter rather than executable meta-instructions.
 */

import { PersonaProfile, PersonaId } from '@/types/persona';
import {
  FramingArtifact,
  OpeningPosition,
  CrossExamRound,
  ConvergenceDraft,
  RatificationVote,
} from '@/types/session';

/**
 * Sanitizes input text to neutralize prompt injection attacks.
 */
export function sanitizeSubject(input: string): string {
  if (!input) return '';
  return input
    .replace(/<\/deliberation_subject>/gi, '&lt;/deliberation_subject&gt;')
    .trim();
}

/**
 * Phase 0: Moderator Framing Prompt
 */
export function buildModeratorFramingPrompt(query: string): string {
  const cleanQuery = sanitizeSubject(query);
  return `You are the Moderator of The Council.
Your role is to frame the dilemma neutrally and rigorously for an 8-member council.

<deliberation_subject>
${cleanQuery}
</deliberation_subject>

INSTRUCTIONS:
1. Restate the question in objective, balanced, non-leading terminology.
2. Identify 3-5 pivotal decision vectors or strategic trade-offs the council must resolve.
3. State fundamental premises and assumptions if the query is underspecified (do not halt or ask for clarification).
4. Define the explicit scope and boundaries of this deliberation.
5. Do NOT take any position or voice personal opinions.
6. Provide your output strictly conforming to the requested JSON schema.`;
}

/**
 * Phase 1: Persona Opening Position Prompt
 */
export function buildOpeningPositionPrompt(
  persona: PersonaProfile,
  framing: FramingArtifact,
  rawQuery: string
): string {
  const cleanQuery = sanitizeSubject(rawQuery);
  return `You are ${persona.name} (${persona.title}) on The Council.
Your core values: ${persona.coreValues.join(', ')}.
Your cognitive archetype: ${persona.archetype}.
Your reasoning style: ${persona.reasoningStyle}.
Your blind spots to watch for: ${persona.blindSpots}.
Your speaking style: ${persona.speakingStyle}.

DELIBERATION CONTEXT:
<deliberation_subject>
${cleanQuery}
</deliberation_subject>

MODERATOR'S NEUTRAL FRAMING:
- Restated Question: ${framing.restatedQuestion}
- Core Decisions: ${framing.coreDecisions.join(' | ')}
- Fundamental Assumptions: ${framing.fundamentalAssumptions.join(' | ')}
- Deliberation Bounds: ${framing.deliberationBounds}

INSTRUCTIONS:
1. Independently articulate your initial stance through your distinct philosophical lens.
2. Provide:
   - positionSummary: 1-3 sentences stating your unambiguous position.
   - detailedReasoning: Detailed evidential rationale rooted in your archetype.
   - confidenceScore: Integer between 0 and 100.
   - falsificationCondition: What specific empirical evidence, argument, or outcome would convince you that your position is mistaken?
3. Stay strictly in character. Do not be sycophantic.
4. Output strictly conforming to the requested JSON schema.`;
}

/**
 * Phase 2: Persona Cross-Examination Prompt
 */
export function buildCrossExamPrompt(
  persona: PersonaProfile,
  framing: FramingArtifact,
  previousRounds: CrossExamRound[],
  allOpenings: Record<string, OpeningPosition>,
  roundNumber: number,
  rawQuery: string
): string {
  const cleanQuery = sanitizeSubject(rawQuery);

  // Summarize peer stances from previous round or openings
  const peerSummaries: string[] = [];
  const latestRound = previousRounds[previousRounds.length - 1];

  for (const [id, opening] of Object.entries(allOpenings)) {
    if (id === persona.id) continue;
    let latestPos = opening.positionSummary;
    let latestConf = opening.confidenceScore;
    const peerTurn = latestRound?.turns[id as PersonaId];
    if (peerTurn) {
      latestPos = peerTurn.updatedPosition;
      latestConf = peerTurn.updatedConfidence;
    }
    peerSummaries.push(
      `Persona [${id}]: Position: "${latestPos}" (Confidence: ${latestConf}%)`
    );
  }

  // Find own previous stance
  let myPrevPos = allOpenings[persona.id]?.positionSummary || '';
  let myPrevConf = allOpenings[persona.id]?.confidenceScore || 50;
  const myTurn = latestRound?.turns[persona.id];
  if (myTurn) {
    myPrevPos = myTurn.updatedPosition;
    myPrevConf = myTurn.updatedConfidence;
  }

  return `You are ${persona.name} (${persona.title}) on The Council.
ROUND ${roundNumber} CROSS-EXAMINATION.

DELIBERATION SUBJECT:
<deliberation_subject>
${cleanQuery}
</deliberation_subject>

YOUR PREVIOUS STANCE:
"${myPrevPos}" (Confidence: ${myPrevConf}%)

CURRENT PEER STANCES:
${peerSummaries.join('\n')}

INSTRUCTIONS:
1. You MUST directly engage with at least TWO (2) named peer personas from the list above.
2. For each peer response, specify:
   - targetPersonaId: The exact ID of the peer (e.g. "skeptic", "optimist", "ethicist", etc.)
   - action: Exactly "AGREE", "CHALLENGE", or "CONCEDE"
   - critiqueOrSupport: Sharp, substantive dialectical argument.
3. Update your own position and confidence score:
   - updatedPosition: Your refined, deepened, or shifted stance.
   - updatedConfidence: Integer 0-100.
   - shiftExplanation: Why your position or confidence shifted, or why it held firm against critiques.
   - whatChanged: Summary of what specific insight or argument moved your perspective (or "No change: ...").
4. Maintain intellectual integrity. If a peer makes a valid point, concede or incorporate it. If flawed, challenge it rigorously.
5. Provide your output strictly conforming to the following JSON structure:
{
  "responsesToPeers": [
    {
      "targetPersonaId": "skeptic",
      "action": "CHALLENGE",
      "critiqueOrSupport": "Your objection is overly cautious because..."
    },
    {
      "targetPersonaId": "pragmatist",
      "action": "AGREE",
      "critiqueOrSupport": "The milestone timeline you proposed is feasible..."
    }
  ],
  "updatedPosition": "My refined stance is...",
  "updatedConfidence": 75,
  "shiftExplanation": "I adjusted my confidence because...",
  "whatChanged": "Incorporated the operational safeguards."
}`;
}

/**
 * Phase 3: Moderator Convergence Check Prompt
 */
export function buildConvergenceCheckPrompt(
  framing: FramingArtifact,
  rounds: CrossExamRound[],
  allOpenings: Record<string, OpeningPosition>,
  rawQuery: string
): string {
  const cleanQuery = sanitizeSubject(rawQuery);
  const latestRound = rounds[rounds.length - 1];

  const currentStances = Object.entries(latestRound.turns).map(
    ([id, turn]) =>
      `[${id}]: "${turn.updatedPosition}" (Confidence: ${turn.updatedConfidence}%)`
  );

  return `You are the Moderator of The Council.
Evaluate convergence and synthesize the current state of agreement across all members.

DELIBERATION SUBJECT:
<deliberation_subject>
${cleanQuery}
</deliberation_subject>

CURRENT MEMBER STANCES (Round ${latestRound.roundNumber}):
${currentStances.join('\n')}

INSTRUCTIONS:
1. Produce draftConsensusStatement: A balanced synthesis of where consensus is forming.
2. Identify remainingDisagreements: Specific unresolved tensions between members.
3. Estimate convergenceScore (0-100): Measure of true alignment across the chamber.
4. List keyAlignmentPoints: Uncontested pillars of agreement.
5. Do NOT force agreement if fundamental disagreements persist.
6. Provide your output strictly conforming to the requested JSON schema.`;
}

/**
 * Phase 4: Persona Ratification Prompt
 */
export function buildRatificationPrompt(
  persona: PersonaProfile,
  draftConsensus: string,
  cycleNumber: number,
  previousObjections?: string[]
): string {
  const objContext =
    previousObjections && previousObjections.length > 0
      ? `\nPREVIOUS CYCLE OBJECTIONS THAT WERE ADDRESSED:\n${previousObjections.join('\n')}`
      : '';

  return `You are ${persona.name} (${persona.title}) on The Council.
RATIFICATION VOTE - CYCLE ${cycleNumber}.

PROPOSED CONSENSUS STATEMENT:
"""
${draftConsensus}
"""${objContext}

YOUR MISSION:
Review the proposed consensus statement through your core ethical and analytical principles.

VOTING OPTIONS:
- "SIGN_OFF": You fully approve and endorse this statement as a legitimate, actionable resolution.
- "SIGN_OFF_WITH_AMENDMENT": You endorse the direction, but require a specific textual refinement to give final sign-off.
- "OBJECT": The statement contains an irreconcilable ethical, empirical, or operational defect that you cannot endorse.

INSTRUCTIONS:
1. Choose vote: "SIGN_OFF" | "SIGN_OFF_WITH_AMENDMENT" | "OBJECT".
2. If SIGN_OFF_WITH_AMENDMENT, provide amendmentSuggestion detailing the precise phrasing required.
3. If OBJECT, provide objectionReason detailing the fatal flaw.
4. Provide closingComment: Final philosophical summary of your vote.
5. Honesty Rule: Do NOT sign off if the statement violates your core archetype principles.
6. Provide your output strictly conforming to the requested JSON schema.`;
}

/**
 * Phase 4 Moderator Revision Prompt
 */
export function buildModeratorRevisionPrompt(
  currentDraft: string,
  votes: Record<string, RatificationVote>,
  rawQuery: string
): string {
  const cleanQuery = sanitizeSubject(rawQuery);
  const votesSummary = Object.entries(votes)
    .map(([id, v]) => {
      let details = `Vote: ${v.vote}`;
      if (v.amendmentText) details += ` | Amendment: "${v.amendmentText}"`;
      if (v.objectionReason) details += ` | Objection: "${v.objectionReason}"`;
      return `[${id}]: ${details}`;
    })
    .join('\n');

  return `You are the Moderator of The Council.
The council has voted on the consensus draft. Your job is to revise the draft to absorb amendments and address objections where possible.

DELIBERATION SUBJECT:
<deliberation_subject>
${cleanQuery}
</deliberation_subject>

CURRENT DRAFT:
"""
${currentDraft}
"""

RATIFICATION VOTES:
${votesSummary}

INSTRUCTIONS:
1. Revise the consensus statement to incorporate reasonable amendments and mitigate objections.
2. If an objection is irreconcilable without contradicting other sign-offs, balance it carefully or acknowledge the boundary condition.
3. Output a revised consensus draft string.`;
}

/**
 * Phase 5: Moderator Final Synthesis Prompt
 */
export function buildFinalSynthesisPrompt(
  framing: FramingArtifact,
  finalDraft: string,
  isUnanimous: boolean,
  votes: Record<string, RatificationVote>,
  rawQuery: string
): string {
  const cleanQuery = sanitizeSubject(rawQuery);
  const objections = Object.entries(votes)
    .filter(([_, v]) => v.vote === 'OBJECT')
    .map(([id, v]) => `[${id}] objected: "${v.objectionReason}"`);

  return `You are the Moderator of The Council.
Synthesize the final resolution of the council.

DELIBERATION SUBJECT:
<deliberation_subject>
${cleanQuery}
</deliberation_subject>

AGREED OR CLOSEST CONSENSUS STATEMENT:
"""
${finalDraft}
"""

STATUS: ${isUnanimous ? 'UNANIMOUS AGREEMENT REACHED' : 'CONSENSUS NOT FULLY REACHED'}
${objections.length > 0 ? `DISSENTING OBJECTIONS:\n${objections.join('\n')}` : ''}

INSTRUCTIONS:
1. unanimousConclusion: Clear, authoritative, plain-language conclusion answering the user's dilemma. If not unanimous, clearly declare the majority resolution while explicitly highlighting the unresolved dissent.
2. consensusReached: ${isUnanimous}.
3. keyReasons: 3-5 pivotal reasons supporting the conclusion.
4. mainCaveats: 2-4 critical risks, boundary limits, or caveats identified by the council.
5. actionableGuidance: 3-5 concrete, practical next steps for the user.
6. Provide your output strictly conforming to the requested JSON schema.`;
}

/**
 * Repair Prompt: Used when model output failed schema validation
 */
export function buildRepairPrompt(
  malformedOutput: string,
  errorMessage: string
): string {
  return `Your previous JSON response failed schema validation.

VALIDATION ERROR:
${errorMessage}

MALFORMED RESPONSE:
${malformedOutput}

CORRECTION INSTRUCTION:
Repair the JSON so that it strictly adheres to the schema. Output ONLY valid JSON, with no markdown code blocks, backticks, or outside text.`;
}
