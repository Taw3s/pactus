/* eslint-disable @next/next/no-img-element -- tiny pixel-art PNGs; next/image would smooth them */

// Six silhouettes from tools/lowpoly/crowd.js. The order per seat is fixed (no randomness: server and client must match,
// and a reload shows the same room), picked so that neighbours and the person right behind never share a variant.
const ROWS = 3;
const SEATS = 7; // per side and row; the room's edges cut whatever does not fit
const variant = (row: number, side: number, seat: number) => ((seat * 2 + row * 3 + side * 5 + (seat >> 1)) % 6) + 1;

/**
 * The crowd in the courtroom (Astra brief of 04/11, "salão cheio"): three rows seen from behind, in front of the bench,
 * with the centre aisle free under the judge (48 px on the phone, 96 px from `desk`). The front row is cut by the edge of
 * the wall, so the room seems to go on. Scenery only: it never stands for the members, the votes or the decision, and it
 * is hidden from assistive technology and from the pointer. Static for now; the settling movement comes after approval.
 */
export function CourtCrowd() {
  return (
    <div
      aria-hidden
      className="pointer-events-none relative -mx-4 h-[72px] overflow-hidden [--crowd-pitch:40px] [--crowd-row:16px] desk:h-[140px] desk:[--crowd-pitch:60px] desk:[--crowd-row:28px]"
      data-testid="court-crowd"
    >
      {Array.from({ length: ROWS }, (_, row) => (
        // Row 0 is the back row (highest); later rows sit lower and in front.
        <div key={row} className="absolute inset-x-0 flex justify-center gap-12 desk:gap-24" style={{ top: `calc(${row} * var(--crowd-row))` }}>
          {[0, 1].map((side) => (
            <div
              key={side}
              className={`relative flex flex-1 ${side ? "justify-start" : "flex-row-reverse justify-start"}`}
              // alternate rows shift half a seat, so heads fall between the heads in front
              style={{ [side ? "paddingLeft" : "paddingRight"]: row % 2 ? "calc(var(--crowd-pitch) / 2)" : 0 }}
            >
              {Array.from({ length: SEATS }, (_, seat) => (
                <img
                  key={seat}
                  src={`/lowpoly/crowd${variant(row, side, seat)}.png`}
                  alt=""
                  width={96}
                  height={96}
                  className="sprite -mx-[4px] h-12 w-12 max-w-none shrink-0 desk:-mx-[18px] desk:h-24 desk:w-24"
                />
              ))}
              {/* the bench back in front of this row hides the waists */}
              <div className="absolute inset-x-0 top-[40px] h-2 border-b-2 border-wood-dark bg-wood desk:top-[80px] desk:h-4 desk:border-b-4" />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
