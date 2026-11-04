/* eslint-disable @next/next/no-img-element -- tiny pixel-art PNGs; next/image would smooth them */

/**
 * Five staggered rows, back (0) to front (4). The geometry per row lives in globals.css (`.crowd-r0` … `.crowd-r4`, phone
 * and `desk` values): top, half-gap from the centre, pitch between people, sprite size and figure width. The three back
 * rows flank the bench (the half-gap keeps its centre free); the two front rows open the aisle, narrow near the bench and
 * wider at the bottom edge (at most 24 px on the phone, 48 px from `desk`). The front row is larger and cut by the edge.
 */
const SEATS = [8, 8, 8, 8, 5]; // per side; the room's edges cut whatever does not fit
const BENCH_ROWS = 4; // the front row has no visible bench: the edge cuts it at the shoulders

// Fixed order (server and client must match, and a reload shows the same room): neighbours and the person right behind differ.
const variant = (row: number, side: number, seat: number) => ((seat * 2 + row * 3 + side * 5 + (seat >> 1)) % 6) + 1;

/**
 * The crowd in the courtroom (Astra brief of 04/11, "salão cheio", final composition): people seen from behind, shoulders
 * overlapping, heads showing between the shoulders of the row ahead, cut at the sides and at the bottom so the room goes
 * on. Scenery only: it never stands for the members, the votes or the decision; hidden from assistive technology and from
 * the pointer. It stays in a closed session too, still (Q4 = A). Static for now; the settling movement comes after approval.
 */
export function CourtCrowd() {
  return (
    <div aria-hidden className="court-crowd pointer-events-none relative -mx-4 overflow-hidden" data-testid="court-crowd">
      {SEATS.map((seats, row) => (
        <div key={row} className={`crowd-r${row} absolute inset-0`}>
          {[-1, 1].map((sign, side) =>
            Array.from({ length: seats }, (_, seat) => (
              <img
                key={`${side}-${seat}`}
                src={`/lowpoly/crowd${variant(row, side, seat)}.png`}
                alt=""
                width={96}
                height={96}
                className="sprite crowd-seat absolute max-w-none"
                // the figure's centre: past the half-gap, one pitch per seat, plus the row's stagger (globals.css)
                style={{ "--sign": sign, "--seat": seat } as React.CSSProperties}
              />
            )),
          )}
          {/* the bench back of this row shows between the bodies of the row in front */}
          {row < BENCH_ROWS && (
            <>
              <div className="crowd-bench crowd-bench-l" />
              <div className="crowd-bench crowd-bench-r" />
            </>
          )}
        </div>
      ))}
    </div>
  );
}
