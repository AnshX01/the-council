import { describe, it, expect } from 'vitest';
import {
  computeSeatLayout,
  computeInteractionArc,
  euclideanDistance,
  validateLayoutNonOverlapping,
  computeOutwardLabelAnchor,
  computeSpeechBubbleAnchor,
  SeatPersona,
} from '@/lib/council/geometry';

function createMockPersonas(count: number, hasModerator = true): SeatPersona[] {
  const personas: SeatPersona[] = [];
  if (hasModerator) {
    personas.push({
      id: 'moderator',
      name: 'The Moderator',
      role: 'moderator',
      color: '#64748B',
    });
  }

  const remaining = hasModerator ? count - 1 : count;
  for (let i = 0; i < remaining; i++) {
    personas.push({
      id: `member-${i + 1}`,
      name: `Member ${i + 1}`,
      role: 'voting_member',
      color: '#3B82F6',
    });
  }
  return personas;
}

describe('Council Seating Geometry Engine', () => {
  it('rejects counts outside 3..12 range', () => {
    expect(() => computeSeatLayout(createMockPersonas(2))).toThrow(/requires between 3 and 12/);
    expect(() => computeSeatLayout(createMockPersonas(13))).toThrow(/requires between 3 and 12/);
  });

  it('places Moderator at 12 oclock (top center: x ≈ centerX, y = centerY - radius) for N=9', () => {
    const personas = createMockPersonas(9);
    const layout = computeSeatLayout(personas, 600, 60);

    const modSeat = layout.seats[0];
    expect(modSeat.id).toBe('moderator');
    expect(modSeat.isModerator).toBe(true);
    expect(modSeat.angleDeg).toBe(270); // -90 deg normalized = 270 deg (top)
    expect(Math.abs(modSeat.x - layout.centerX)).toBeLessThan(0.01);
    expect(modSeat.y).toBeCloseTo(layout.centerY - layout.radius, 1);
  });

  it('guarantees equidistant spacing between adjacent seats for N=3, 5, 8, 9, 12', () => {
    const counts = [3, 5, 8, 9, 12];

    for (const n of counts) {
      const personas = createMockPersonas(n);
      const layout = computeSeatLayout(personas, 600, 60);
      expect(layout.seats).toHaveLength(n);

      // Check distance between adjacent seats
      const distances: number[] = [];
      for (let i = 0; i < n; i++) {
        const next = (i + 1) % n;
        const dist = euclideanDistance(layout.seats[i], layout.seats[next]);
        distances.push(dist);
      }

      // All distances should match within 0.1px
      const firstDist = distances[0];
      for (let i = 1; i < distances.length; i++) {
        expect(distances[i]).toBeCloseTo(firstDist, 1);
      }
    }
  });

  it('distributes voting members clockwise', () => {
    const personas = createMockPersonas(9);
    const layout = computeSeatLayout(personas, 600, 60);

    // Seat 0 is top (270 deg / -90 deg)
    // Moving clockwise, seat 1 should be toward top-right (angle increases clockwise)
    const seat0 = layout.seats[0];
    const seat1 = layout.seats[1];
    const seat2 = layout.seats[2];

    expect(seat0.x).toBeCloseTo(300, 1);
    expect(seat1.x).toBeGreaterThan(layout.centerX); // to the right of center
    expect(seat2.x).toBeGreaterThan(layout.centerX); // further down-right
  });

  it('validates no overlapping seats for all supported counts N=3..12', () => {
    for (let n = 3; n <= 12; n++) {
      const personas = createMockPersonas(n);
      const layout = computeSeatLayout(personas, 600, 50);
      const valid = validateLayoutNonOverlapping(layout, 5);
      expect(valid).toBe(true);
    }
  });

  it('computes valid SVG cubic Bézier interaction arc curving inward toward center', () => {
    const personas = createMockPersonas(9);
    const layout = computeSeatLayout(personas, 600, 60);

    const seatA = layout.seats[1];
    const seatB = layout.seats[5];
    const center = { x: layout.centerX, y: layout.centerY };

    const arc = computeInteractionArc(seatA, seatB, center, { curvature: 0.5 });
    expect(arc).toMatch(/^M \d+(\.\d+)? \d+(\.\d+)? C \d+(\.\d+)? \d+(\.\d+)?, \d+(\.\d+)? \d+(\.\d+)?, \d+(\.\d+)? \d+(\.\d+)?$/);
  });

  it('computes outward label directions correctly around the clock', () => {
    expect(computeOutwardLabelAnchor(270)).toBe('top');
    expect(computeOutwardLabelAnchor(90)).toBe('bottom');
    expect(computeOutwardLabelAnchor(0)).toBe('right');
    expect(computeOutwardLabelAnchor(180)).toBe('left');
  });

  it('computes collision-free speech bubble anchors inside stage bounds', () => {
    const center = { x: 320, y: 320 };
    const seat = { x: 320, y: 80 };
    const anchor = computeSpeechBubbleAnchor(seat, center, 640);

    expect(anchor.x).toBeGreaterThanOrEqual(40);
    expect(anchor.x).toBeLessThanOrEqual(600);
    expect(anchor.y).toBeGreaterThanOrEqual(40);
    expect(anchor.y).toBeLessThanOrEqual(600);
    expect(anchor.y).toBeGreaterThan(seat.y);
  });

  describe("R2 Concentric Table Disc & Seat Geometry", () => {
    it("guarantees disc and seat ring centers coincide within 0.5px and gap is 8-16px for N=3..12 and N=9 default", async () => {
      const { TABLE_CONSTANTS } = await import("@/lib/council/geometry");
      const discCenter = { x: TABLE_CONSTANTS.CENTER, y: TABLE_CONSTANTS.CENTER };
      const tableRadius = TABLE_CONSTANTS.TABLE_RADIUS; // 190

      for (let n = 3; n <= 12; n++) {
        const personas = createMockPersonas(n);
        const layout = computeSeatLayout(personas, 640, 88);
        const ringCenter = { x: layout.centerX, y: layout.centerY };

        // |discCenter - ringCenter| < 0.5px
        const centerOffset = Math.hypot(discCenter.x - ringCenter.x, discCenter.y - ringCenter.y);
        expect(centerOffset).toBeLessThan(0.5);

        // Moderator at -90 deg (270 deg)
        const moderator = layout.seats[0];
        expect(moderator.angleDeg).toBe(270);

        // Gap between disc edge and every seat-tile edge is 8–16px
        for (const seat of layout.seats) {
          const tileRadius = seat.isModerator
            ? TABLE_CONSTANTS.MODERATOR_TILE_RADIUS
            : TABLE_CONSTANTS.SEAT_TILE_RADIUS;
          const distFromCenter = Math.hypot(seat.x - ringCenter.x, seat.y - ringCenter.y);
          const innerTileEdge = distFromCenter - tileRadius;
          const gap = innerTileEdge - tableRadius;
          expect(gap).toBeGreaterThanOrEqual(8);
          expect(gap).toBeLessThanOrEqual(16);

          // All seat boxes inside [0, 640]^2
          expect(seat.x - tileRadius).toBeGreaterThanOrEqual(0);
          expect(seat.x + tileRadius).toBeLessThanOrEqual(640);
          expect(seat.y - tileRadius).toBeGreaterThanOrEqual(0);
          expect(seat.y + tileRadius).toBeLessThanOrEqual(640);

          // Label placement is radially outward (Rs + rt + 14)
          const labelDist = distFromCenter + tileRadius + TABLE_CONSTANTS.LABEL_OFFSET;
          const labelX = ringCenter.x + labelDist * Math.cos(seat.angleRad);
          const labelY = ringCenter.y + labelDist * Math.sin(seat.angleRad);
          expect(labelX).toBeGreaterThanOrEqual(15);
          expect(labelX).toBeLessThanOrEqual(625);
          expect(labelY).toBeGreaterThanOrEqual(15);
          expect(labelY).toBeLessThanOrEqual(625);
        }
      }
    });
  });
});
