/**
 * The Council - Deterministic Mock LLM Provider
 *
 * Implements the LLMProvider contract with fully deterministic, scripted fixtures.
 * Enables 100% offline, zero-cost, high-speed automated unit and integration tests.
 */

import { z } from 'zod';
import {
  LLMProvider,
  CompletionOptions,
  ProviderResponse,
  TokenUsage,
} from './interface';
import {
  FramingPayload,
  OpeningPositionPayload,
  CrossExamTurnPayload,
  ConvergenceCheckPayload,
  RatificationVotePayload,
  FinalSynthesisPayload,
} from '@/types/schemas';

export type MockScenario =
  | 'UNANIMOUS_CONSENSUS'
  | 'OBJECTION_THEN_CONVERGE'
  | 'DEADLOCK_HONEST_FAILURE'
  | 'PERSONA_FAILURE'
  | 'MODERATOR_FAILURE'
  | 'REPAIR_TRIGGER';

export interface MockProviderConfig {
  scenario?: MockScenario;
  delayMs?: number;
  failedPersonaIds?: string[];
  failModerator?: boolean;
  simulateMalformedFirstCall?: boolean;
}

export class MockProvider implements LLMProvider {
  readonly providerId = 'mock' as const;

  private config: MockProviderConfig;
  private callCount = 0;
  private repairAttempted = false;
  private ratificationCycleCounts: Record<string, number> = {};

  constructor(config: MockProviderConfig = {}) {
    this.config = {
      scenario: 'UNANIMOUS_CONSENSUS',
      delayMs: 0,
      failedPersonaIds: [],
      failModerator: false,
      simulateMalformedFirstCall: false,
      ...config,
    };
  }

  public setScenario(scenario: MockScenario) {
    this.config.scenario = scenario;
  }

  public setFailedPersonas(ids: string[]) {
    this.config.failedPersonaIds = ids;
  }

  public getCallCount(): number {
    return this.callCount;
  }

  public resetCallCount(): void {
    this.callCount = 0;
    this.repairAttempted = false;
    this.ratificationCycleCounts = {};
  }

  private mockTokens(): TokenUsage {
    return { promptTokens: 120, completionTokens: 80, totalTokens: 200 };
  }

  private async simulateDelay(): Promise<void> {
    if (this.config.delayMs && this.config.delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, this.config.delayMs));
    }
  }

  async healthCheck(): Promise<{ ok: boolean; latencyMs: number; error?: string }> {
    return { ok: true, latencyMs: 1 };
  }

  async generateText(
    prompt: string,
    options?: CompletionOptions
  ): Promise<ProviderResponse<string>> {
    this.callCount++;
    await this.simulateDelay();

    if (prompt.includes('Revise the consensus statement')) {
      return {
        data: 'Revised consensus statement acknowledging empirical baseline uncertainties and adding operational milestone safeguards.',
        rawText: 'Revised consensus statement acknowledging empirical baseline uncertainties and adding operational milestone safeguards.',
        tokensUsed: this.mockTokens(),
        durationMs: 5,
      };
    }

    return {
      data: 'Mock text response for prompt.',
      rawText: 'Mock text response for prompt.',
      tokensUsed: this.mockTokens(),
      durationMs: 5,
    };
  }

  async generateStructured<T>(
    prompt: string,
    schema: z.ZodSchema<T>,
    options?: CompletionOptions
  ): Promise<ProviderResponse<T>> {
    this.callCount++;
    await this.simulateDelay();

    // 1. Simulate malformed output repair test
    if (
      this.config.simulateMalformedFirstCall &&
      !this.repairAttempted &&
      !prompt.includes('Repair the JSON')
    ) {
      this.repairAttempted = true;
      // Return invalid JSON structure that will fail schema validation
      throw new Error('MALFORMED_JSON_SIMULATION: {"invalid": true}');
    }

    // 2. Check for moderator failure simulation
    if (
      this.config.failModerator &&
      (prompt.includes('You are the Moderator') || options?.systemInstruction?.includes('Moderator'))
    ) {
      throw new Error('MODERATOR_API_UNAVAILABLE: Simulated provider 500 error');
    }

    // 3. Check for specific persona failure simulation
    for (const failedId of this.config.failedPersonaIds || []) {
      if (prompt.includes(`[${failedId}]`) || prompt.includes(`You are The ${failedId}`) || prompt.toLowerCase().includes(`you are the ${failedId}`)) {
        throw new Error(`PERSONA_CALL_FAILED: Simulated timeout for persona ${failedId}`);
      }
    }

    // 4. Generate phase-specific mock payload
    const data = this.generateFixtureForPrompt(prompt) as T;
    const validated = schema.parse(data);

    return {
      data: validated,
      rawText: JSON.stringify(validated),
      tokensUsed: this.mockTokens(),
      durationMs: 10,
    };
  }

  private generateFixtureForPrompt(prompt: string): any {
    // Phase 0: Moderator Framing
    if (prompt.includes('restatedQuestion') || prompt.includes('Restate the question')) {
      const framing: FramingPayload = {
        restatedQuestion:
          'Should the decision-maker proceed with the proposed commitment under conditions of operational uncertainty and long-term consequences?',
        coreDecisions: [
          'Immediate execution vs phased empirical validation',
          'Balancing ethical duty to stakeholders against organizational viability',
          'Safeguarding against cascading second-order systemic vulnerabilities',
        ],
        fundamentalAssumptions: [
          'Action requires irreversible resource allocation',
          'Sufficient evidence exists to establish probability bounds',
          'Stakeholder wellbeing must remain a priority metric',
        ],
        deliberationBounds:
          'Focus on actionable strategic, operational, and moral criteria.',
      };
      return framing;
    }

    // Phase 1: Opening Position
    if (prompt.includes('positionSummary') || prompt.includes('independently articulate your initial stance')) {
      return this.generateOpeningFixture(prompt);
    }

    // Phase 2: Cross-Examination
    if (prompt.includes('responsesToPeers') || prompt.includes('CROSS-EXAMINATION')) {
      return this.generateCrossExamFixture(prompt);
    }

    // Phase 3: Convergence Check
    if (prompt.includes('draftConsensusStatement') || prompt.includes('Evaluate convergence')) {
      return this.generateConvergenceFixture(prompt);
    }

    // Phase 4: Ratification Vote
    if (prompt.includes('RATIFICATION VOTE') || prompt.includes('SIGN_OFF')) {
      return this.generateRatificationFixture(prompt);
    }

    // Phase 5: Final Synthesis
    if (prompt.includes('unanimousConclusion') || prompt.includes('Synthesize the final resolution')) {
      return this.generateFinalSynthesisFixture(prompt);
    }

    // Generic fallback for schema
    return {
      summary: 'Mock generic data',
      status: 'ok',
    };
  }

  private generateOpeningFixture(prompt: string): OpeningPositionPayload {
    if (prompt.includes('Skeptic')) {
      return {
        positionSummary:
          'We must not proceed without empirical verification of baseline assumptions; unverified claims risk catastrophic failure.',
        detailedReasoning:
          'The proposal relies heavily on untested optimistic projections. Without rigorous verification, we risk unhedged downside.',
        confidenceScore: 35,
        falsificationCondition:
          'Demonstrated pilot data proving repeatable positive outcomes with less than 5% variance.',
      };
    }
    if (prompt.includes('Optimist')) {
      return {
        positionSummary:
          'We should embrace this initiative boldly, as asymmetric upside and positive compounding far outweigh conservative hesitations.',
        detailedReasoning:
          'Paralysis by analysis is the greatest hidden risk. Early aggressive adoption positions us to capture transformational gains.',
        confidenceScore: 85,
        falsificationCondition:
          'Proof that downside tail-risk is unhedged and mathematically guaranteed to bankrupt reserves.',
      };
    }
    if (prompt.includes('Ethicist')) {
      return {
        positionSummary:
          'Any course of action must safeguard equitable distribution of burdens and honor fundamental duties to vulnerable parties.',
        detailedReasoning:
          'Efficiency metrics cannot justify externalizing negative externalities onto those with the least agency.',
        confidenceScore: 70,
        falsificationCondition:
          'Irrefutable evidence that all stakeholders are protected with formal indemnity and transparent recourse.',
      };
    }
    if (prompt.includes('Pragmatist')) {
      return {
        positionSummary:
          'We must test immediate feasibility, establish realistic resource budgets, and execute via discrete, manageable milestones.',
        detailedReasoning:
          'Grand plans fail at the level of daily operational friction. We need a concrete 30-60-90 day deployment roadmap.',
        confidenceScore: 60,
        falsificationCondition:
          'Evidence that the required budget or talent requirements exceed current capacity by more than 20%.',
      };
    }
    if (prompt.includes('Systems Thinker')) {
      return {
        positionSummary:
          'We must analyze delayed feedback loops and second-order reactions before setting this system in motion.',
        detailedReasoning:
          'First-order benefits frequently trigger self-cancelling balancing feedback loops that create unexpected crises.',
        confidenceScore: 50,
        falsificationCondition:
          'Rigorous system dynamics modeling proving systemic equilibria remain resilient across stressed scenarios.',
      };
    }
    if (prompt.includes('Historian')) {
      return {
        positionSummary:
          'Historical precedent shows that similar rapid initiatives encounter predictable institutional friction and pushback.',
        detailedReasoning:
          'Every era believes its situation is unprecedented. Examining past analog cases reveals persistent failure patterns.',
        confidenceScore: 65,
        falsificationCondition:
          'Documented historical case studies where identical conditions produced sustained stability without reform.',
      };
    }
    if (prompt.includes('Humanist')) {
      return {
        positionSummary:
          'The human experience, psychological safety, and relational trust must guide this decision above quantitative abstractions.',
        detailedReasoning:
          'Decisions that optimize for metrics while degrading morale and human connection create internal collapse.',
        confidenceScore: 75,
        falsificationCondition:
          'Evidence that the initiative actively enhances front-line wellbeing and deepens community trust.',
      };
    }
    // The Contrarian (or default)
    return {
      positionSummary:
        'The emerging enthusiasm overlooks the glaring counter-hypothesis: doing nothing or reversing course is superior.',
      detailedReasoning:
        'Group consensus gravitates toward compromise that pleases everyone on paper while ensuring mediocrity in practice.',
      confidenceScore: 40,
      falsificationCondition:
        'A comprehensive rebuttal that dismantles the strongest counter-argument with empirical risk-reward parity.',
    };
  }

  private generateCrossExamFixture(prompt: string): CrossExamTurnPayload {
    const isContrarian = prompt.includes('Contrarian');
    const isSkeptic = prompt.includes('Skeptic');

    let updatedPos =
      'Refining stance: adopting a staged rollout with explicit kill-switches balances risk with strategic potential.';
    let confidence = 75;
    let shiftExp =
      'Incorporated the Pragmatist operational roadmap and the Ethicist safeguards, increasing confidence.';
    let whatChanged =
      'Shifted from initial skepticism to cautious support due to structured milestone gating.';

    if (this.config.scenario === 'DEADLOCK_HONEST_FAILURE' && (isContrarian || isSkeptic)) {
      updatedPos =
        'Maintaining firm dissent: proposed mitigations remain cosmetic and fail to resolve the core structural liability.';
      confidence = 25;
      shiftExp =
        'Peer arguments have not addressed the fundamental tail-risk; holding ground against the emerging consensus.';
      whatChanged =
        'Refused to converge; deepened scrutiny on unhedged catastrophe vectors.';
    }

    return {
      responsesToPeers: [
        {
          targetPersonaId: isSkeptic ? 'optimist' : 'skeptic',
          action: 'CHALLENGE',
          critiqueOrSupport:
            'Your assumptions depend on unverified positive momentum without factoring in downside volatility.',
        },
        {
          targetPersonaId: 'pragmatist',
          action: 'AGREE',
          critiqueOrSupport:
            'Your phased milestone gating provides the exact operational discipline required to proceed safely.',
        },
      ],
      updatedPosition: updatedPos,
      updatedConfidence: confidence,
      shiftExplanation: shiftExp,
      whatChanged: whatChanged,
    };
  }

  private generateConvergenceFixture(prompt: string): ConvergenceCheckPayload {
    const isDeadlock = this.config.scenario === 'DEADLOCK_HONEST_FAILURE';
    return {
      draftConsensusStatement:
        'The Council converges on a phased, milestone-gated deployment with strict operational guardrails, explicit ethical protections, and an active fallback kill-switch.',
      remainingDisagreements: isDeadlock
        ? ['Persistent unresolvable objection regarding irreversible systemic risk from The Contrarian']
        : ['Minor operational sequencing details between Pragmatist and Systems Thinker'],
      convergenceScore: isDeadlock ? 55 : 88,
      keyAlignmentPoints: [
        'Commitment to phased milestones over single-shot deployment',
        'Mandatory transparent stakeholder reporting and moral safeguards',
        'Establishment of quantitative thresholds for course reversal',
      ],
    };
  }

  private generateRatificationFixture(prompt: string): RatificationVotePayload {
    const isContrarian = prompt.includes('Contrarian');
    const isEthicist = prompt.includes('Ethicist');

    // Deadlock scenario: Contrarian consistently objects
    if (this.config.scenario === 'DEADLOCK_HONEST_FAILURE' && isContrarian) {
      return {
        vote: 'OBJECT',
        objectionReason:
          'Irreconcilable philosophical flaw: the framework relies on predictive models that cannot anticipate tail-risk catastrophe.',
        closingComment:
          'I formally register non-concurrence. Consensus cannot be fabricated over fundamental vulnerability.',
      };
    }

    // Objection then converge scenario
    if (this.config.scenario === 'OBJECTION_THEN_CONVERGE' && isContrarian) {
      const currentCount = (this.ratificationCycleCounts['contrarian'] || 0) + 1;
      this.ratificationCycleCounts['contrarian'] = currentCount;

      if (currentCount === 1) {
        return {
          vote: 'SIGN_OFF_WITH_AMENDMENT',
          amendmentSuggestion:
            'Must add an irrevocable kill-switch trigger if first-quarter variance exceeds 10%.',
          closingComment:
            'Conditionally supportive, provided the amendment is explicitly codified.',
        };
      }
    }

    // Default: unanimous sign-off
    return {
      vote: 'SIGN_OFF',
      closingComment:
        'The revised consensus satisfies my analytical and moral criteria. I endorse the verdict.',
    };
  }

  private generateFinalSynthesisFixture(prompt: string): FinalSynthesisPayload {
    const isDeadlock = this.config.scenario === 'DEADLOCK_HONEST_FAILURE';

    if (isDeadlock) {
      return {
        unanimousConclusion:
          'Consensus not fully reached. While a majority of seven council members endorse a phased rollout, The Contrarian registered an unyielding dissent regarding unhedged catastrophic tail-risk.',
        consensusReached: false,
        keyReasons: [
          'Majority established that phased milestones mitigate immediate operational hazards',
          'Ethical guidelines and stakeholder protections were approved by seven members',
        ],
        mainCaveats: [
          'DISSENTING VECTOR: The Contrarian maintains that statistical tail-risk remains fundamentally underestimated',
        ],
        actionableGuidance: [
          '1. Acknowledge and document the unresolved risk highlighted by the dissent',
          '2. If proceeding under majority advice, implement twice the standard reserve buffer',
          '3. Treat the Contrarian objection criteria as hard triggers for emergency pause',
        ],
      };
    }

    return {
      unanimousConclusion:
        'The Council unanimously recommends proceeding via a disciplined 3-phase rollout: pilot testing with 10% exposure, rigorous ethical audit at day 45, and scale-up only upon achieving verified milestone stability.',
      consensusReached: true,
      keyReasons: [
        'Multi-lens examination synthesized the Optimist upside with the Skeptic empirical gating',
        'The Pragmatist execution roadmap resolved operational friction into clear 30-day deliverables',
        'The Ethicist and Humanist covenants protect vulnerable stakeholders and team morale',
      ],
      mainCaveats: [
        'Do not skip phase gates under competitive pressure',
        'Halt immediately if second-order feedback loops generate unexpected attrition',
      ],
      actionableGuidance: [
        '1. Finalize the 30-day pilot parameters with clear success and failure metrics',
        '2. Form an independent oversight review for the day 45 milestone audit',
        '3. Empower any team member to pull the emergency kill-switch if threshold errors occur',
      ],
    };
  }
}
