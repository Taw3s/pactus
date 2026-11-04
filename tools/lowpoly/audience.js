// Courtroom audience (Astra brief of 04/11/2026, "tribunal vivo"): two small groups seen from behind, each on a low
// bench, in three poses (repouso, leve ajuste, acomodada). Generic figures, never the group's members: no faces,
// no gestures at anyone, no yellow (the judge and the actions keep it). Kept apart from models.js like decor.js.
import * as THREE from "./node_modules/three/build/three.module.js";

const mat = (c) => new THREE.MeshStandardMaterial({ color: c, roughness: 1, metalness: 0, flatShading: true });
function part(g, geo, c, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geo, mat(c));
  m.position.set(x, y, z);
  g.add(m);
  return m;
}
const boxG = (w, h, d) => new THREE.BoxGeometry(w, h, d);

// Palette: clothes in surface/raised with a wine (folder) detail, heads in muted/paper, bench in wood.
const SURFACE = 0x363a41, RAISED = 0x444951, FOLDER = 0x7a2e3a, MUTED = 0xbdb7a8, PAPER = 0xd9d3c4, WOOD = 0x8a6a45, WOOD_DARK = 0x5e4527;
const HAIR = [0x2f2a26, 0x4a3b30, 0x3a3631, 0x5a4a3c];

/**
 * One seated figure, back to the camera (faces -z, towards the judge).
 * `lean` tilts the torso sideways, `rise` lifts the body (settling into the seat), `turn` turns the head a little.
 */
function figure(g, x, { cloth, collar, hair, skin, wide, tall }, { lean = 0, rise = 0, turn = 0 }) {
  const body = new THREE.Group();
  body.position.set(x, 0.42 + rise, 0.08);
  body.rotation.z = lean;
  // thighs on the seat, pointing at the judge (mostly hidden by the back)
  const thighs = new THREE.Mesh(boxG(0.44 * wide, 0.14, 0.42), mat(cloth));
  thighs.position.set(0, 0.02, -0.22);
  body.add(thighs);
  // torso: a slightly tapered six-sided block, shoulders wider than the waist
  const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.27 * wide, 0.22 * wide, 0.55 * tall, 6), mat(cloth));
  torso.position.y = 0.28 * tall;
  torso.rotation.y = Math.PI / 6;
  body.add(torso);
  // shoulders
  const shoulders = new THREE.Mesh(boxG(0.62 * wide, 0.12, 0.3), mat(cloth));
  shoulders.position.y = 0.52 * tall;
  body.add(shoulders);
  // wine collar band (the folder detail), only on the back
  const band = new THREE.Mesh(boxG(0.26, 0.06, 0.04), mat(collar));
  band.position.set(0, 0.58 * tall, 0.15);
  body.add(band);
  // head: faceted, seen from behind (hair covers the back, ears on the sides)
  const head = new THREE.Group();
  head.position.y = 0.78 * tall;
  head.rotation.y = turn;
  const skull = new THREE.Mesh(new THREE.IcosahedronGeometry(0.2, 0), mat(skin));
  head.add(skull);
  const back = new THREE.Mesh(new THREE.IcosahedronGeometry(0.205, 0), mat(hair));
  back.position.set(0, 0.035, 0.03);
  back.scale.set(1, 0.95, 0.9);
  head.add(back);
  for (const s of [-1, 1]) {
    const ear = new THREE.Mesh(boxG(0.05, 0.08, 0.06), mat(skin));
    ear.position.set(0.19 * s, -0.02, -0.02);
    head.add(ear);
  }
  body.add(head);
  g.add(body);
}

/** A low wooden bench with two people; pose 1 = repouso, 2 = leve ajuste, 3 = acomodada. */
function audience(side, pose) {
  const g = new THREE.Group();
  // bench: seat under the people, a low backrest towards the room and two legs; no props on it
  part(g, boxG(1.7, 0.1, 0.5), WOOD, 0, 0.36, -0.06);
  part(g, boxG(1.7, 0.2, 0.06), WOOD_DARK, 0, 0.5, 0.24);
  for (const x of [-0.72, 0.72]) part(g, boxG(0.1, 0.32, 0.44), WOOD_DARK, x, 0.16, -0.06);

  // Two silhouettes per side, different from the other side (no mechanical mirror).
  const people =
    side === "left"
      ? [
          { cloth: SURFACE, collar: FOLDER, hair: HAIR[0], skin: MUTED, wide: 1.05, tall: 1 },
          { cloth: RAISED, collar: FOLDER, hair: HAIR[1], skin: PAPER, wide: 0.92, tall: 1.08 },
        ]
      : [
          { cloth: RAISED, collar: FOLDER, hair: HAIR[2], skin: PAPER, wide: 1, tall: 1.04 },
          { cloth: SURFACE, collar: FOLDER, hair: HAIR[3], skin: MUTED, wide: 1.1, tall: 0.95 },
        ];
  // The first person adjusts in pose 2 and the second settles in pose 3 (the brief's 100 ms offset is in the timing).
  const poses = {
    1: [{ lean: 0.08, rise: 0.04, turn: 0.25 }, { lean: -0.06, rise: 0.05, turn: -0.2 }],
    2: [{ lean: -0.03, rise: 0.0, turn: 0.05 }, { lean: -0.1, rise: 0.06, turn: -0.3 }],
    3: [{ lean: 0, rise: 0, turn: 0 }, { lean: 0.02, rise: 0, turn: 0.05 }],
  }[pose];
  figure(g, -0.42, people[0], poses[0]);
  figure(g, 0.42, people[1], poses[1]);

  // Each group leans its gaze a little towards the centre aisle (the judge sits in the middle).
  g.rotation.y = side === "left" ? -0.35 : 0.35;
  // invisible frame so the three poses share the same camera framing
  const frame = new THREE.Mesh(boxG(1.9, 1.7, 0.9), new THREE.MeshBasicMaterial({ visible: false }));
  frame.position.set(0, 0.85, -0.05);
  g.add(frame);
  g.userData.shadowRadius = 0.55;
  g.userData.shadowCenter = new THREE.Vector3(0, 0, 0);
  // Seen from behind and a little above, from the room (the camera sits on the +z side, behind the audience).
  g.userData.camDir = new THREE.Vector3(side === "left" ? -0.35 : 0.35, 0.75, 1.25);
  return g;
}

export const AUDIENCE = Object.fromEntries(
  ["left", "right"].flatMap((side) => [1, 2, 3].map((pose) => [`audience${side === "left" ? "Left" : "Right"}${pose}`, () => audience(side, pose)])),
);
