/**
 * Pure Geometric Seating Layout Engine for The Council
 * 
 * Computes circular table coordinates for N = 3..12 personas,
 * ensuring the Moderator sits at 12 o'clock (top center, -π/2),
 * voting members are distributed clockwise, and interaction arcs
 * curve inward across the center table.
 */

export interface SeatPersona {
  id: string;
  name: string;
  role?: string;
  color?: string;
  avatar?: string;
}

export interface SeatLayoutItem {
  id: string;
  name: string;
  role: string;
  isModerator: boolean;
  index: number;
  angleRad: number;
  angleDeg: number;
  x: number;
  y: number;
  tangentAngleDeg: number;
  color?: string;
}

export interface TableLayout {
  width: number;
  height: number;
  centerX: number;
  centerY: number;
  radius: number;
  seatRadius: number;
  seats: SeatLayoutItem[];
}

export interface ArcOptions {
  curvature?: number; // 0 (straight line) to 1 (pulls all the way to center)
  offset?: number;
}

/**
 * Computes the complete seating layout for a circular council table.
 * 
 * @param personas Array of personas (3 to 12 members)
 * @param tableSize Total width/height of the square SVG viewport
 * @param padding Padding from viewport edge to seat centers
 */
export function computeSeatLayout(
  personas: SeatPersona[],
  tableSize = 600,
  padding = 60
): TableLayout {
  const n = personas.length;
  if (n < 3 || n > 12) {
    throw new Error(`The Council requires between 3 and 12 personas, received ${n}`);
  }

  const centerX = tableSize / 2;
  const centerY = tableSize / 2;
  const radius = (tableSize / 2) - padding;
  // Dynamic seat radius based on count: more seats -> slightly smaller nodes
  const seatRadius = Math.max(18, Math.min(32, Math.floor(tableSize / (n * 2.2))));

  // Identify moderator (prefer id/role === 'moderator', fallback to index 0)
  let modIndex = personas.findIndex(
    (p) => p.id.toLowerCase() === 'moderator' || (p.role && p.role.toLowerCase() === 'moderator')
  );
  if (modIndex === -1) {
    modIndex = 0;
  }

  // Rearrange so moderator is first in the clockwise distribution
  const orderedPersonas = [
    personas[modIndex],
    ...personas.slice(modIndex + 1),
    ...personas.slice(0, modIndex),
  ];

  const angleStep = (2 * Math.PI) / n;
  // 12 o'clock in screen coordinates (where y is down) is -PI / 2
  const startAngle = -Math.PI / 2;

  const seats: SeatLayoutItem[] = orderedPersonas.map((p, i) => {
    // Clockwise angle progression
    const angleRad = startAngle + (i * angleStep);
    // Normalize degree to [0, 360)
    let angleDeg = (angleRad * (180 / Math.PI)) % 360;
    if (angleDeg < 0) angleDeg += 360;

    const x = Math.round((centerX + radius * Math.cos(angleRad)) * 100) / 100;
    const y = Math.round((centerY + radius * Math.sin(angleRad)) * 100) / 100;

    // Tangent angle in degrees for rotating labels/chips toward the center
    const tangentAngleDeg = Math.round(((angleDeg + 90) % 360) * 10) / 10;

    const isModerator = i === 0 && (
      p.id.toLowerCase() === 'moderator' || 
      (p.role && p.role.toLowerCase() === 'moderator') || 
      modIndex === 0
    );

    return {
      id: p.id,
      name: p.name,
      role: p.role || (isModerator ? 'moderator' : 'member'),
      isModerator,
      index: i,
      angleRad,
      angleDeg: Math.round(angleDeg * 10) / 10,
      x,
      y,
      tangentAngleDeg,
      color: p.color,
    };
  });

  return {
    width: tableSize,
    height: tableSize,
    centerX,
    centerY,
    radius,
    seatRadius,
    seats,
  };
}

/**
 * Computes an SVG cubic Bézier path string connecting two seats.
 * The arc curves inward toward the table center, creating dialogue arcs.
 */
export function computeInteractionArc(
  source: { x: number; y: number },
  target: { x: number; y: number },
  center: { x: number; y: number },
  options: ArcOptions = {}
): string {
  const curvature = options.curvature ?? 0.45;

  // Midpoint between source and target
  const midX = (source.x + target.x) / 2;
  const midY = (source.y + target.y) / 2;

  // Control point is pulled from the midpoint toward the table center
  const cpX = midX + (center.x - midX) * curvature;
  const cpY = midY + (center.y - midY) * curvature;

  // Cubic Bézier control points (symmetrical pull toward center)
  const cp1X = Math.round((source.x + (cpX - source.x) * 0.65) * 100) / 100;
  const cp1Y = Math.round((source.y + (cpY - source.y) * 0.65) * 100) / 100;
  const cp2X = Math.round((target.x + (cpX - target.x) * 0.65) * 100) / 100;
  const cp2Y = Math.round((target.y + (cpY - target.y) * 0.65) * 100) / 100;

  return `M ${source.x} ${source.y} C ${cp1X} ${cp1Y}, ${cp2X} ${cp2Y}, ${target.x} ${target.y}`;
}

/**
 * Calculates Euclidean distance between two points.
 */
export function euclideanDistance(
  p1: { x: number; y: number },
  p2: { x: number; y: number }
): number {
  const dx = p1.x - p2.x;
  const dy = p1.y - p2.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Checks if all seats in the layout maintain a minimum distance without overlapping.
 */
export function validateLayoutNonOverlapping(
  layout: TableLayout,
  minClearance = 10
): boolean {
  const { seats, seatRadius } = layout;
  const minRequiredDistance = (seatRadius * 2) + minClearance;

  for (let i = 0; i < seats.length; i++) {
    for (let j = i + 1; j < seats.length; j++) {
      const dist = euclideanDistance(seats[i], seats[j]);
      if (dist < minRequiredDistance) {
        return false;
      }
    }
  }
  return true;
}
