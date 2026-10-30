// Collectibles from the Astra cosmetics brief of 30/10/2026 (shelf objects, no gameplay effect); kept apart from models.js so helper names cannot collide.
import * as THREE from "./node_modules/three/build/three.module.js";
const mat=c=>new THREE.MeshStandardMaterial({color:c,roughness:1,metalness:0,flatShading:true});
function add(g,geo,c,x=0,y=0,z=0){const m=new THREE.Mesh(geo,mat(c));m.position.set(x,y,z);g.add(m);return m;}

/** Comum: a yellow pencil worn down to a stub, big wooden tip, eraser half gone. */
export function survivorPencil(){
 const g=new THREE.Group(),p=new THREE.Group();
 // Built along +X, then laid on the floor at a diagonal.
 add(p,new THREE.CylinderGeometry(.19,.19,.3,6),0xffcd38,0).rotation.z=Math.PI/2;
 add(p,new THREE.CylinderGeometry(.2,.2,.12,6),0x9aa3ad,-.21).rotation.z=Math.PI/2;
 // Worn eraser: short and tapered, wider at the ferrule.
 add(p,new THREE.CylinderGeometry(.13,.19,.1,6),0xb66b74,-.32).rotation.z=Math.PI/2;
 add(p,new THREE.CylinderGeometry(0,.19,.42,6),0xc9935e,.36).rotation.z=-Math.PI/2;
 add(p,new THREE.CylinderGeometry(0,.07,.15,6),0x26292e,.5).rotation.z=-Math.PI/2;
 // Roll first, then yaw: the pencil lies flat on a face instead of pointing up.
 p.rotation.order="YXZ";p.position.y=.17;p.rotation.x=Math.PI/6;p.rotation.y=.95;
 g.add(p);
 return g;
}

/** Raro: a big magnifying glass, open rim and readable lens; decorative, not the judge's review tool. */
export function suspiciousLoupe(){
 const g=new THREE.Group(),l=new THREE.Group();
 // Built facing +Z: lens up-left, handle down-right at 45°.
 add(l,new THREE.CylinderGeometry(.44,.44,.05,12),0xa3caff,0,0,0).rotation.x=Math.PI/2;
 add(l,new THREE.BoxGeometry(.09,.3,.02),0xe6f0ff,-.17,.08,.035).rotation.z=-.6;
 add(l,new THREE.TorusGeometry(.47,.07,4,12),0xc89d35);
 const h=new THREE.Group();
 add(h,new THREE.CylinderGeometry(.09,.09,.16,6),0xc89d35,0,-.6);
 add(h,new THREE.CylinderGeometry(.1,.085,.62,6),0x7a2e3a,0,-.99);
 add(h,new THREE.CylinderGeometry(.06,.1,.08,6),0x7a2e3a,0,-1.33);
 h.rotation.z=Math.PI/4;l.add(h);
 l.rotation.y=.68;l.rotation.x=-.18;
 g.add(l);
 g.userData.shadowRadius=.42;g.userData.shadowCenter=new THREE.Vector3(.1,0,-.1);
 return g;
}

/** Raro: a puffed-up pigeon holding a folded blank paper. A collectible only: no speech, vote or proof. */
export function witnessPigeon(){
 const g=new THREE.Group();
 const body=add(g,new THREE.IcosahedronGeometry(.42,1),0x8d95a0,0,.48);body.scale.set(1.25,.95,.9);
 // Puffed chest, pushed forward.
 add(g,new THREE.IcosahedronGeometry(.3,0),0x9aa2ad,.3,.55).scale.set(.9,1.1,1.1);
 for(const z of [-.33,.33]){const w=add(g,new THREE.IcosahedronGeometry(.3,0),0x59616d,-.1,.52,z);w.scale.set(1.5,.75,.35);w.rotation.z=-.25;}
 const tail=add(g,new THREE.BoxGeometry(.4,.07,.3),0x59616d,-.62,.5);tail.rotation.z=.35;
 add(g,new THREE.IcosahedronGeometry(.19,0),0x536b66,.32,.85).scale.set(1,.9,1.15);
 add(g,new THREE.IcosahedronGeometry(.2,1),0x8d95a0,.42,1.05);
 add(g,new THREE.ConeGeometry(.06,.18,4),0xc9935e,.66,1.02).rotation.z=-Math.PI/2;
 for(const z of [-.12,.12]){add(g,new THREE.BoxGeometry(.06,.06,.05),0xd98c3a,.53,1.1,z*1.1);add(g,new THREE.BoxGeometry(.03,.04,.06),0x1a1c20,.555,1.1,z*1.1);}
 // Folded blank paper in the beak (no writing on it).
 const pa=add(g,new THREE.BoxGeometry(.3,.02,.24),0xf5f1e6,.83,.96);pa.rotation.z=-.5;
 const pb=add(g,new THREE.BoxGeometry(.3,.02,.24),0xe4dcc8,.83,.93);pb.rotation.z=-.2;
 for(const z of [-.12,.12]){add(g,new THREE.BoxGeometry(.05,.22,.05),0xb66b74,.05,.11,z);add(g,new THREE.BoxGeometry(.16,.03,.1),0xb66b74,.1,.015,z);}
 return g;
}

/** Lendário: the judge's slippers, cream with wine lining, a dark brow on each toe (one raised). */
export function judgeSlippers(){
 const g=new THREE.Group();
 const slipper=(raised)=>{
  const s=new THREE.Group();
  add(s,new THREE.BoxGeometry(.95,.08,.44),0x8a6a45,0,.04);
  add(s,new THREE.BoxGeometry(.5,.03,.34),0x7a2e3a,-.2,.095);
  // Low heel collar around the opening.
  add(s,new THREE.BoxGeometry(.08,.14,.42),0xf5f1e6,-.44,.15);
  for(const z of [-.19,.19])add(s,new THREE.BoxGeometry(.5,.12,.06),0xf5f1e6,-.2,.14,z);
  const toe=add(s,new THREE.SphereGeometry(.3,6,4,0,Math.PI*2,0,Math.PI/2),0xf5f1e6,.2,.08);toe.scale.set(1.15,.95,.78);
  add(s,new THREE.BoxGeometry(.06,.06,.3),0xe4dcc8,-.04,.12);
  // Brow on top of the toe, like the judge's: the raised one tilts up on the outer side.
  const brow=add(s,new THREE.BoxGeometry(.13,.11,.36),0x443127,.22,.4);
  brow.rotation.z=-.3;if(raised){brow.rotation.x=.4;brow.position.y=.42;}
  return s;
 };
 const a=slipper(false);a.position.z=-.3;a.rotation.y=.1;g.add(a);
 const b=slipper(true);b.position.set(.16,0,.3);b.rotation.y=-.12;g.add(b);
 // Toes point at the camera, so both brows face the viewer.
 g.rotation.y=-.55;
 return g;
}
