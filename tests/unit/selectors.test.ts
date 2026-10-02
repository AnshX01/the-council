import { describe, it, expect } from "vitest";
import {
  selectPhases,
  selectConfidenceTrajectories,
  selectSeatStates,
  selectTranscriptRows,
  selectDissentRecord,
  selectInteractionMap,
  selectPhaseState,
  selectInteractionGraph,
  PHASES,
} from "@/lib/ui/selectors";
import { CouncilSSEEvent } from "@/types/events";
import { DeliberationSession } from "@/types/session";

describe("UI Pure Data Selectors (src/lib/ui/selectors.ts)", () => {
  describe("selectPhases & Canonical Phase Definitions (B9)", () => {
    it("returns all 6 canonical phases in exact engine protocol order", () => {
      expect(PHASES.length).toBe(6);
      expect(PHASES[0].id).toBe("PHASE_0_FRAMING");
      expect(PHASES[1].id).toBe("PHASE_1_OPENING");
      expect(PHASES[2].id).toBe("PHASE_2_CROSS_EXAM");
      expect(PHASES[3].id).toBe("PHASE_3_CONVERGENCE_CHECK");
      expect(PHASES[4].id).toBe("PHASE_4_RATIFICATION");
      expect(PHASES[5].id).toBe("PHASE_5_FINAL_OUTPUT");

      expect(PHASES[2].label).toBe("Cross-Examination");
      expect(PHASES[3].label).toBe("Convergence Check");
      expect(PHASES[4].label).toBe("Ratification");
    });

    it("identifies active phase index and completion state accurately", () => {
      const active = selectPhases("PHASE_2_CROSS_EXAM");
      expect(active.currentIndex).toBe(2);
      expect(active.isCompleted).toBe(false);

      const completed = selectPhases("PHASE_5_FINAL_OUTPUT");
      expect(completed.currentIndex).toBe(5);
      expect(completed.isCompleted).toBe(true);
    });
  });

  describe("selectConfidenceTrajectories (B6 Regression: No 0% Shift)", () => {
    it("derives shifts accurately from live-streamed SSE events", () => {
      const mockEvents: CouncilSSEEvent[] = [
        {
          event: "persona_message",
          sessionId: "sess-1",
          timestamp: new Date().toISOString(),
          payload: {
            personaId: "optimist",
            phase: "PHASE_1_OPENING",
            content: "I believe this is promising",
            confidenceScore: 70,
          },
        },
        {
          event: "position_update",
          sessionId: "sess-1",
          timestamp: new Date().toISOString(),
          payload: {
            personaId: "optimist",
            roundNumber: 1,
            previousConfidence: 70,
            newConfidence: 85,
            deltaConfidence: 15,
            previousPosition: "Promising",
            newPosition: "Very promising",
            catalystPersonaIds: ["pragmatist"],
            shiftRationale: "Pragmatist provided feasible paths.",
          },
        },
        {
          event: "ratification_vote",
          sessionId: "sess-1",
          timestamp: new Date().toISOString(),
          payload: {
            personaId: "optimist",
            decision: "sign_off",
            vote: "SIGN_OFF",
            confidence: 85,
            cycleNumber: 1,
            timestamp: new Date().toISOString(),
          } as any,
        },
      ];

      const trajectories = selectConfidenceTrajectories(mockEvents);
      const opt = trajectories["optimist"];
      expect(opt.initialConfidence).toBe(70);
      expect(opt.finalConfidence).toBe(85);
      expect(opt.delta).toBe(15);
      expect(opt.formattedShift).toBe("70 → 85 (+15)");
      expect(opt.ratificationVote).toBe("sign_off");
    });

    it("derives shifts accurately from persisted DeliberationSession DB object", () => {
      const mockSession: any = {
        id: "sess-db-1",
        sessionId: "sess-db-1",
        currentPhase: "PHASE_5_FINAL_OUTPUT",
        openingPositions: {
          skeptic: {
            personaId: "skeptic",
            stance: "Cautious",
            positionSummary: "Cautious stance",
            confidenceScore: 80,
            detailedReasoning: "Risks present",
            falsificationCondition: "Proof of safety",
            principles: [],
          },
        },
        crossExamRounds: [
          {
            roundNumber: 1,
            turns: [
              {
                speakerPersonaId: "skeptic",
                addressedPeerIds: ["optimist"],
                action: "CHALLENGE",
                argument: "Not safe enough",
                updatedConfidence: 65,
                reasoning: "Unresolved risks",
              },
            ],
            summary: {
              activeDebates: 1,
              consensusTrends: "Divergent",
              majorDisagreements: [],
            },
          },
        ],
        ratificationCycles: [
          {
            cycleNumber: 1,
            draftResolution: "Draft",
            votes: [
              {
                personaId: "skeptic",
                decision: "amendment",
                vote: "SIGN_OFF_WITH_AMENDMENT",
                confidence: 65,
                proposedAmendment: "Add strict monitoring",
              },
            ],
            ratified: false,
          },
        ],
      };

      const trajectories = selectConfidenceTrajectories(mockSession as DeliberationSession);
      const skep = trajectories["skeptic"];
      expect(skep.initialConfidence).toBe(80);
      expect(skep.finalConfidence).toBe(65);
      expect(skep.delta).toBe(-15);
      expect(skep.formattedShift).toBe("80 → 65 (-15)");
      expect(skep.ratificationVote).toBe("amendment");
      expect(skep.amendmentReason).toBe("Add strict monitoring");
    });
  });

  describe("selectTranscriptRows (B7 Regression: No Raw snake_case Leaks)", () => {
    it("renders narrative items and clean system dividers without snake_case event names", () => {
      const rawEvents: CouncilSSEEvent[] = [
        {
          event: "phase_started",
          sessionId: "sess-1",
          timestamp: new Date().toISOString(),
          payload: {
            phase: "PHASE_1_OPENING",
            phaseIndex: 1,
            description: "Opening positions underway",
          },
        },
        {
          event: "persona_message",
          sessionId: "sess-1",
          timestamp: new Date().toISOString(),
          payload: {
            personaId: "ethicist",
            phase: "PHASE_1_OPENING",
            content: "We must consider justice.",
            confidenceScore: 90,
          },
        },
        {
          event: "position_update",
          sessionId: "sess-1",
          timestamp: new Date().toISOString(),
          payload: {
            personaId: "ethicist",
            roundNumber: 1,
            previousConfidence: 90,
            newConfidence: 95,
            deltaConfidence: 5,
            previousPosition: "Just",
            newPosition: "Very just",
            catalystPersonaIds: [],
            shiftRationale: "Refined ethical principles.",
          },
        },
        {
          event: "persona_unavailable",
          sessionId: "sess-1",
          timestamp: new Date().toISOString(),
          payload: {
            personaId: "contrarian",
            reason: "Provider timed out",
          },
        },
      ];

      const rows = selectTranscriptRows(rawEvents);
      expect(rows.length).toBe(4);

      // Check system divider 1
      expect(rows[0].type).toBe("system_divider");
      if (rows[0].type === "system_divider") {
        expect(rows[0].label).toBe("Opening Positions");
        expect(rows[0].label).not.toContain("phase_started");
      }

      // Check narrative row 2
      expect(rows[1].type).toBe("narrative");
      if (rows[1].type === "narrative") {
        expect(rows[1].personaId).toBe("ethicist");
        expect(rows[1].content).toBe("We must consider justice.");
      }

      // Check system divider 3
      expect(rows[2].type).toBe("system_divider");
      if (rows[2].type === "system_divider") {
        expect(rows[2].label).toContain("Ethicist: 90% → 95% (+5%)");
        expect(rows[2].label).not.toContain("position_update");
      }

      // Check system divider 4
      expect(rows[3].type).toBe("system_divider");
      if (rows[3].type === "system_divider") {
        expect(rows[3].label).toBe("Contrarian unavailable");
        expect(rows[3].label).not.toContain("persona_unavailable");
      }
    });
  });

  describe("selectSeatStates & selectInteractionMap", () => {
    it("anchors Moderator at seat 0 with non-voting defaults and maps seats", () => {
      const trajectories = selectConfidenceTrajectories([]);
      const seats = selectSeatStates(trajectories, "skeptic", "ethicist", "CHALLENGE", {
        contrarian: "Timed out",
      });

      expect(seats.moderator.seatNumber).toBe(0);
      expect(seats.moderator.status).toBe("idle");

      expect(seats.skeptic.isSpeaking).toBe(true);
      expect(seats.skeptic.status).toBe("speaking");
      expect(seats.skeptic.lastStance).toBe("CHALLENGE");
      expect(seats.skeptic.targetPersonaId).toBe("ethicist");

      expect(seats.ethicist.isAddressed).toBe(true);

      expect(seats.contrarian.status).toBe("unavailable");
      expect(seats.contrarian.unavailableReason).toBe("Timed out");
    });

    it("aggregates interaction maps for the post-deliberation arc overlay", () => {
      const events: CouncilSSEEvent[] = [
        {
          event: "persona_message",
          sessionId: "sess-1",
          timestamp: new Date().toISOString(),
          payload: {
            personaId: "skeptic",
            phase: "PHASE_2_CROSS_EXAM",
            content: "Challenge",
            targetPersonaId: "optimist",
            action: "CHALLENGE",
          },
        },
        {
          event: "persona_message",
          sessionId: "sess-1",
          timestamp: new Date().toISOString(),
          payload: {
            personaId: "skeptic",
            phase: "PHASE_2_CROSS_EXAM",
            content: "Another challenge",
            targetPersonaId: "optimist",
            action: "CHALLENGE",
          },
        },
        {
          event: "persona_message",
          sessionId: "sess-1",
          timestamp: new Date().toISOString(),
          payload: {
            personaId: "optimist",
            phase: "PHASE_2_CROSS_EXAM",
            content: "I agree with parts",
            targetPersonaId: "skeptic",
            action: "AGREE",
          },
        },
      ];

      const pairs = selectInteractionMap(events);
      expect(pairs.length).toBe(2);

      const skepToOpt = pairs.find((p) => p.speakerId === "skeptic" && p.targetId === "optimist");
      expect(skepToOpt?.count).toBe(2);
      expect(skepToOpt?.challengeCount).toBe(2);

      const optToSkep = pairs.find((p) => p.speakerId === "optimist" && p.targetId === "skeptic");
      expect(optToSkep?.count).toBe(1);
      expect(optToSkep?.agreeCount).toBe(1);
    });
  });

  describe("selectPhaseState (R4 Single Phase Reducer)", () => {
    it("accurately derives phase, index, round and completion from stream events", () => {
      const events: CouncilSSEEvent[] = [
        {
          event: "phase_started",
          sessionId: "sess-1",
          timestamp: new Date().toISOString(),
          payload: { phase: "PHASE_0_FRAMING", phaseIndex: 0, description: "Framing" },
        },
        {
          event: "phase_started",
          sessionId: "sess-1",
          timestamp: new Date().toISOString(),
          payload: { phase: "PHASE_2_CROSS_EXAM", phaseIndex: 2, description: "Cross exam" },
        },
        {
          event: "cross_exam_round_complete",
          sessionId: "sess-1",
          timestamp: new Date().toISOString(),
          payload: { roundNumber: 2, completedAt: new Date().toISOString() },
        },
        {
          event: "moderator_draft",
          sessionId: "sess-1",
          timestamp: new Date().toISOString(),
          payload: {
            draftRound: 2,
            draftConsensusText: "Draft",
            alignmentScore: 78,
            varianceScore: 12,
            remainingDisagreements: [],
          },
        },
        {
          event: "final_verdict",
          sessionId: "sess-1",
          timestamp: new Date().toISOString(),
          payload: {
            isUnanimous: true,
            status: "UNANIMOUS_CONSENSUS",
            actionableConclusion: "Done",
            verdictOneLiner: "Done",
            keySupportingReasons: [],
            criticalCaveatsAndRisks: [],
            personaShiftSummaries: {} as any,
            ratifiedBy: [],
            survivingObjections: [],
            totalRoundsDeliberated: 2,
            totalCallsUsed: 10,
            durationMs: 5000,
            completedAt: new Date().toISOString(),
          },
        },
      ];

      const state = selectPhaseState(events);
      expect(state.currentPhase).toBe("PHASE_5_FINAL_OUTPUT");
      expect(state.phaseIndex).toBe(5);
      expect(state.phaseLabel).toBe("Final Verdict");
      expect(state.roundNumber).toBe(2);
      expect(state.convergenceScore).toBe(78);
      expect(state.isCompleted).toBe(true);
      expect(state.isFailed).toBe(false);
    });
  });

  describe("selectInteractionGraph (RT4 §5 Network & Matrix Reducer)", () => {
    it("aggregates nodes, links, and pairwise matrix while guarding against self-interactions", () => {
      const events: CouncilSSEEvent[] = [
        {
          event: "persona_message",
          sessionId: "sess-1",
          timestamp: new Date().toISOString(),
          payload: {
            personaId: "skeptic",
            phase: "PHASE_2_CROSS_EXAM",
            content: "I challenge the optimistic premise",
            targetPersonaId: "optimist",
            action: "CHALLENGE",
          },
        },
        {
          event: "persona_message",
          sessionId: "sess-1",
          timestamp: new Date().toISOString(),
          payload: {
            personaId: "optimist",
            phase: "PHASE_2_CROSS_EXAM",
            content: "I agree with parts of your critique",
            targetPersonaId: "skeptic",
            action: "AGREE",
          },
        },
        {
          event: "persona_message",
          sessionId: "sess-1",
          timestamp: new Date().toISOString(),
          payload: {
            personaId: "pragmatist",
            phase: "PHASE_2_CROSS_EXAM",
            content: "Self talk error",
            targetPersonaId: "pragmatist", // Self-addressed stance (R5)
            action: "AGREE",
          },
        },
      ];

      const graph = selectInteractionGraph(events);

      // Total interactions should exclude self-talk
      expect(graph.totalInteractions).toBe(2);
      expect(graph.nodes.length).toBeGreaterThanOrEqual(9);

      const skepNode = graph.nodes.find((n: any) => n.id === "skeptic");
      expect(skepNode?.challengesInitiated).toBe(1);
      expect(skepNode?.agreementsReceived).toBe(1);

      const optNode = graph.nodes.find((n: any) => n.id === "optimist");
      expect(optNode?.challengesReceived).toBe(1);
      expect(optNode?.agreementsInitiated).toBe(1);

      // Matrix verification
      const skepToOpt = graph.matrix["skeptic"]["optimist"];
      expect(skepToOpt.count).toBe(1);
      expect(skepToOpt.challengeCount).toBe(1);

      const optToSkep = graph.matrix["optimist"]["skeptic"];
      expect(optToSkep.count).toBe(1);
      expect(optToSkep.agreeCount).toBe(1);

      // Self-talk in matrix should remain 0
      const pragSelf = graph.matrix["pragmatist"]["pragmatist"];
      expect(pragSelf.count).toBe(0);
    });
  });
});
