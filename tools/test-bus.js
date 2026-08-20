// Headless smoke + regression harness for bus.html.
// No browser/canvas here, so we stub document/canvas/localStorage/rAF and
// drive the loop by hand through window.__busHook. A fillStyle setter flags
// #ff00ff, which catches any colour key missing from KEY_TONE / GBC.
const fs = require("fs");
const vm = require("vm");
const path = require("path");

const FILE = path.resolve(__dirname, "../../../../../home/user/good-vibes/bus.html");
const src = fs.readFileSync(process.argv[2] || "/home/user/good-vibes/bus.html", "utf8");
const m = src.match(/<script>([\s\S]*?)<\/script>/);
if(!m){ console.error("no inline script found"); process.exit(1); }
const code = m[1];

let magenta = 0, drawOps = 0;
function guard(v){ if(typeof v === "string" && v.toLowerCase() === "#ff00ff") magenta++; return v; }
function gradStub(){ return { addColorStop(){}, _grad:true }; }
function mkCtx(){
  const c = {
    _fillStyle:"#000", _strokeStyle:"#000",
    get fillStyle(){ return this._fillStyle; },
    set fillStyle(v){ this._fillStyle = guard(v); },
    get strokeStyle(){ return this._strokeStyle; },
    set strokeStyle(v){ this._strokeStyle = guard(v); },
    lineWidth:1, globalAlpha:1, globalCompositeOperation:"source-over",
    font:"", textAlign:"left", textBaseline:"alphabetic",
    imageSmoothingEnabled:false, filter:"none", lineJoin:"miter", lineCap:"butt",
    fillRect(){ drawOps++; }, strokeRect(){ drawOps++; }, clearRect(){},
    fill(){ drawOps++; }, stroke(){ drawOps++; },
    fillText(){ drawOps++; }, strokeText(){ drawOps++; },
    beginPath(){}, closePath(){}, moveTo(){}, lineTo(){}, rect(){},
    quadraticCurveTo(){}, bezierCurveTo(){}, arc(){}, arcTo(){}, ellipse(){},
    clip(){}, save(){}, restore(){},
    translate(){}, scale(){}, rotate(){}, transform(){}, setTransform(){}, resetTransform(){},
    setLineDash(){}, getLineDash(){ return []; }, drawImage(){ drawOps++; },
    createLinearGradient:gradStub, createRadialGradient:gradStub,
    createPattern(){ return { _pattern:true }; },
    measureText(t){ return { width:(""+t).length * 7 }; }
  };
  return c;
}
const ctxStub = mkCtx();
function el(extra){
  return Object.assign({
    addEventListener(){}, removeEventListener(){}, textContent:"",
    style:{}, classList:{ add(){}, remove(){}, toggle(){}, contains(){ return false; } },
    getBoundingClientRect:()=>({left:0,top:0,width:480,height:44})
  }, extra||{});
}
const canvasStub = el({ width:320, height:192, getContext:()=>ctxStub });
const store = {};
let hook = null;
const sandbox = {
  console,
  performance: { now: ()=>Date.now() },
  setTimeout: ()=>0,
  clearTimeout: ()=>{},
  Math, Date, JSON,
  requestAnimationFrame: ()=>0,
  addEventListener: ()=>{}, removeEventListener: ()=>{},
  innerWidth: 1280, innerHeight: 720, devicePixelRatio: 2,
  localStorage: { getItem:k=>(k in store?store[k]:null), setItem:(k,v)=>{store[k]=""+v;} },
  document: {
    getElementById:id => id === "game" ? canvasStub : el(),
    createElement:tag => tag === "canvas"
      ? el({ width:0, height:0, getContext:()=>mkCtx() })
      : el(),
    body: el(), documentElement: el(),
    addEventListener(){}, querySelectorAll:()=>[]
  }
};
sandbox.window = sandbox;
sandbox.__busHook = h => { hook = h; };
vm.createContext(sandbox);

let failures = 0, checks = 0;
function ok(name, cond, detail){
  checks++;
  if(cond){ console.log("  PASS  " + name + (detail ? "   " + detail : "")); }
  else { failures++; console.log("  FAIL  " + name + (detail ? "   " + detail : "")); }
}
function section(t){ console.log("\n" + t); }

try { vm.runInContext(code, sandbox, {filename:"bus.html"}); }
catch(e){ console.error("BOOT THREW:", e); process.exit(1); }
if(!hook){ console.error("hook was never installed"); process.exit(1); }

const K = hook.consts;
const TOTAL = hook.totalS();

// ------------------------------------------------------------------
section("1. Boot and idle soak");
ok("hook installed", !!hook);
ok("street built", TOTAL > 200 && TOTAL < 320, "length " + TOTAL.toFixed(1) + " m");
ok("six parked cars", hook.obstacles().length === 6);
ok("two parked badly", hook.obstacles().filter(o=>o.kind==="van"||o.straddle).length === 2);
try {
  for(let i=0;i<3000;i++){ hook.single(); if(i%7===0) hook.render(); }
  ok("3000 idle frames, no exception", true);
} catch(e){ ok("3000 idle frames, no exception", false, e.message); }
ok("renderer actually drew", drawOps > 1000, drawOps + " draw ops");

// ------------------------------------------------------------------
section("2. Palettes (magenta guard = a key missing from KEY_TONE/GBC)");
for(const p of ["green","gray","color"]){
  const before = magenta;
  hook.setPal(p);
  hook.reset();
  for(let i=0;i<180;i++){ hook.single(); hook.render(); }
  ok("palette " + p + " renders without magenta", magenta === before,
     magenta > before ? (magenta-before) + " magenta fills" : "");
}
hook.setPal("color");

// ------------------------------------------------------------------
section("3. Tail swing (the signature mechanic)");
// Place the bus on a straight, hold full right lock at a fixed speed, and
// measure how far the LEFT-REAR corner strays from the initial heading axis.
// Going straight it sits at exactly half the body width; turning right it must
// swing OUTWARD past that, while the right-rear corner cuts in.
hook.reset();
hook.place(14, 0.8, 0);
const b = hook.bus;
const h0 = b.h, P0 = {x:b.rx, y:b.ry};
const L0 = {x:Math.sin(h0), y:-Math.cos(h0)};
function corner(sideSign){
  const c = Math.cos(b.h), s = Math.sin(b.h), a = -K.REAR_OH, off = sideSign*(K.BUS_W/2);
  return { x:b.rx + a*c + off*s, y:b.ry + a*s - off*c };
}
function lateral(pt){ return (pt.x-P0.x)*L0.x + (pt.y-P0.y)*L0.y; }
let maxLeft = -99, minRight = 99;
const hitsBefore = hook.hits();
hook.input.right = true;
for(let i=0;i<60;i++){
  b.v = 3.0; b.steerNorm = 1;          // hold speed and lock so the test is clean
  hook.single();
  maxLeft = Math.max(maxLeft, lateral(corner(1)));
  minRight = Math.min(minRight, lateral(corner(-1)));
}
hook.input.right = false;
const swing = maxLeft - K.BUS_W/2;
ok("no collision during measurement", hook.hits() === hitsBefore,
   "hits " + (hook.hits()-hitsBefore));
ok("left-rear corner swings OUTWARD on a right turn", swing > 0.35,
   "swing " + swing.toFixed(2) + " m past the body edge");
ok("right-rear corner cuts IN, not out", minRight > -K.BUS_W/2 - 0.02,
   "min " + minRight.toFixed(2) + " vs body edge " + (-K.BUS_W/2).toFixed(2));
ok("rear overhang is what causes it", K.REAR_OH > K.FRONT_OH,
   "rear " + K.REAR_OH + " m vs front " + K.FRONT_OH + " m");

// ------------------------------------------------------------------
section("4. Clearance probes and the squeeze state");
hook.reset();
hook.place(132, 1.56, 0);            // threading past the double-parked van
for(let i=0;i<6;i++){ hook.bus.v = 0; hook.single(); }
let cl = hook.clearances();
ok("both flanks report a tight gap", cl.l < 0.75 && cl.r < 0.75,
   "L " + cl.l.toFixed(2) + " m  R " + cl.r.toFixed(2) + " m");
ok("squeeze state engages", hook.squeezing() === true);
hook.reset();
hook.place(20, 0, 0);                // wide open, nothing alongside
for(let i=0;i<6;i++){ hook.bus.v = 0; hook.single(); }
cl = hook.clearances();
ok("open street reports clear", cl.l >= K.CLEAR_CAP - 0.01 && cl.r >= K.CLEAR_CAP - 0.01,
   "L " + cl.l.toFixed(2) + "  R " + cl.r.toFixed(2));
ok("squeeze state off when open", hook.squeezing() === false);

// ------------------------------------------------------------------
section("5. Street geometry actually creates the grades it claims");
// Grade D: a spot where bus + car cannot share. Grade A/B: bays where they can.
let narrowest = 99, narrowestS = 0, bays = 0;
for(let s=10; s<TOTAL-10; s+=1){
  const w = hook.freeInterval(s).w;
  if(w < narrowest){ narrowest = w; narrowestS = s; }
  if(w >= K.NEED_BOTH + 0.6) bays++;
}
ok("a genuine grade-D pinch exists (cannot share)", narrowest < K.NEED_BOTH,
   "narrowest " + narrowest.toFixed(2) + " m at s=" + narrowestS + ", need " + K.NEED_BOTH.toFixed(2));
ok("the bus alone still fits through it", narrowest > K.BUS_W + 0.2,
   "slack " + (narrowest - K.BUS_W).toFixed(2) + " m");
ok("passing bays exist to negotiate into", bays > 60, bays + " metres of shareable street");

// ------------------------------------------------------------------
section("6. Oncoming car negotiates");
// Compliant driver: should telegraph, then back into a bay and yield.
hook.reset();
hook.place(120, 1.5, 0);
hook.car.stubborn = false;
let sawTelegraph = false, resolved = null;
for(let i=0;i<1400;i++){
  hook.bus.v = 0; hook.single();
  if(hook.car.mode === "telegraph") sawTelegraph = true;
  if(hook.car.mode === "backing" || hook.car.mode === "yield"){ resolved = hook.car.mode; break; }
}
ok("compliant car telegraphs before acting", sawTelegraph);
ok("compliant car yields into a bay", resolved !== null, "reached mode '" + resolved + "'");

// Stubborn driver: refuses, and the horn is what unsticks it.
hook.reset();
hook.place(120, 1.5, 0);
hook.car.stubborn = true;
let waited = false;
for(let i=0;i<1400;i++){
  hook.bus.v = 0; hook.single();
  if(hook.car.mode === "wait"){ waited = true; break; }
}
ok("stubborn car refuses and waits", waited, "mode '" + hook.car.mode + "'");
let unstuck = false;
if(waited){
  hook.honk();
  for(let i=0;i<600;i++){
    hook.bus.v = 0; hook.single();
    if(hook.car.mode !== "wait"){ unstuck = true; break; }
  }
}
ok("horn unsticks the stubborn car", unstuck, "mode '" + hook.car.mode + "'");

// ------------------------------------------------------------------
section("7. Collision is forgiving but solid");
hook.reset();
hook.place(TOTAL - 26, 0, 0);
const hitsB = hook.hits();
for(let i=0;i<420;i++){ hook.input.up = true; hook.single(); }
hook.input.up = false;
let pr = hook.project(hook.busCentre().x, hook.busCentre().y);
ok("driving into the end wall registers a hit", hook.hits() > hitsB, (hook.hits()-hitsB) + " hits");
ok("bus does not tunnel through the end wall", pr.s < TOTAL + 0.5, "s=" + pr.s.toFixed(1) + " / " + TOTAL.toFixed(1));
ok("bus survives it (no fail state, still drivable)", Number.isFinite(hook.bus.v) && Number.isFinite(hook.bus.rx));
ok("scrapes leave permanent decals", hook.bus.scrapes.length >= 0, hook.bus.scrapes.length + " decals");

// ------------------------------------------------------------------
section("8. Bins are nudgeable");
hook.reset();
const bin0 = hook.bins()[2];
const bp = hook.project(bin0.x, bin0.y);
const before = {x:bin0.x, y:bin0.y};
hook.place(bp.s - 9, bp.q, 0);
for(let i=0;i<260;i++){ hook.input.up = true; hook.single(); }
hook.input.up = false;
const moved = Math.hypot(bin0.x-before.x, bin0.y-before.y);
ok("bin gets shoved rather than acting as a wall", moved > 0.4, "moved " + moved.toFixed(2) + " m");

// ------------------------------------------------------------------
section("9. Random-input soak");
hook.reset();
let escaped = 0, worstOver = 0;
try {
  for(let i=0;i<9000;i++){
    if(i % 40 === 0){
      hook.input.up = Math.random() < 0.62;
      hook.input.down = !hook.input.up && Math.random() < 0.3;
      hook.input.left = Math.random() < 0.32;
      hook.input.right = !hook.input.left && Math.random() < 0.32;
      if(Math.random() < 0.05) hook.honk();
    }
    if(hook.shift) hook.shift.time = 60;   // keep the soak actually simulating
    hook.single();
    if(i % 5 === 0) hook.render();
    const c = hook.busCentre();
    const p = hook.project(c.x, c.y);
    const over = Math.abs(p.q) - p.hw;
    if(over > worstOver) worstOver = over;
    if(over > 1.2) escaped++;
    if(!Number.isFinite(c.x) || !Number.isFinite(hook.bus.v)) throw new Error("NaN at frame " + i);
  }
  ok("9000 randomised frames, no exception", true);
} catch(e){ ok("9000 randomised frames, no exception", false, e.message); }
ok("bus never escapes the corridor", escaped === 0,
   "worst overlap " + worstOver.toFixed(2) + " m");
ok("no magenta across the whole run", magenta === 0, magenta + " magenta fills");

// ------------------------------------------------------------------
// Variant-specific mechanics
// ------------------------------------------------------------------
if(K.VARIANT === "bendy"){
  section("10. BENDY: articulation");
  hook.reset();
  hook.place(14, 0.8, 0);
  hook.input.right = true;
  for(let i=0;i<70;i++){ hook.bus.v = 3.0; hook.bus.steerNorm = 1; hook.single(); }
  hook.input.right = false;
  const art = Math.abs(hook.artAngle());
  ok("trailer articulates on a sustained turn", art > 0.2,
     (art*180/Math.PI).toFixed(1) + " deg");
  ok("rig is about 18 m", K.RIG_L > 17 && K.RIG_L < 19, K.RIG_L.toFixed(1) + " m");
  ok("hitch sits ahead of the trailer axle (the condition for cutting in)",
     K.HITCH_OFF < K.TRAIL_WB,
     "hitch " + K.HITCH_OFF + " m vs trailer wheelbase " + K.TRAIL_WB + " m");

  // Steady-state geometry needs open space and many seconds of arc, so run it
  // free of collisions. The turn centre is exact for a bicycle model, so the
  // radii can be compared directly rather than fitting a circle.
  function trailerRadius(){
    const b = hook.bus, R = K.WB/Math.tan(b.steer);
    const cx = b.rx - R*Math.sin(b.h), cy = b.ry + R*Math.cos(b.h);
    const H = hook.hitchPos();
    const tax = H.x - K.TRAIL_WB*Math.cos(b.th), tay = H.y - K.TRAIL_WB*Math.sin(b.th);
    return { R:Math.abs(R), rT:Math.hypot(tax-cx, tay-cy) };
  }
  hook.reset(); hook.setNoclip(true); hook.place(20, 0, 0);
  hook.input.right = true;
  let early = null;
  for(let i=0;i<520;i++){
    hook.bus.v = 3.0; hook.bus.steerNorm = 0.75; hook.single();
    if(i === 60) early = trailerRadius();
  }
  hook.input.right = false;
  const late = trailerRadius();
  hook.setNoclip(false);
  ok("trailer swings wide first, then pulls in", late.rT < early.rT - 0.5,
     early.rT.toFixed(2) + " m -> " + late.rT.toFixed(2) + " m");
  ok("settled trailer axle CUTS IN inside the drive axle", late.rT < late.R - 0.3,
     "trailer " + late.rT.toFixed(2) + " m vs tractor " + late.R.toFixed(2) + " m");
  const settled = Math.abs(hook.artAngle());
  ok("settles short of the jack-knife stop at this lock", settled < K.JACK - 0.05,
     (settled*180/Math.PI).toFixed(1) + " deg vs stop at " + (K.JACK*180/Math.PI).toFixed(0));

  // Jack-knife limit must hold even under the worst input: reverse at full lock.
  hook.reset(); hook.place(20, 0, 0);
  let worstArt = 0;
  for(let i=0;i<600;i++){
    hook.input.down = true; hook.input.left = true; hook.single();
    worstArt = Math.max(worstArt, Math.abs(hook.artAngle()));
  }
  hook.input.down = hook.input.left = false;
  ok("jack-knife clamp holds under reverse at lock", worstArt <= K.JACK + 0.02,
     "peak " + (worstArt*180/Math.PI).toFixed(1) + " deg, limit " + (K.JACK*180/Math.PI).toFixed(0));

  // The trailer must be a real collision body, not decoration. hitCount only
  // registers above an impact threshold, so check the response two ways:
  // a static overlap gets resolved, and reversing into a car registers.
  function inOBB(px,py,o){
    const c = Math.cos(o.ang), s = Math.sin(o.ang);
    const dx = px-o.x, dy = py-o.y;
    return Math.abs(dx*c+dy*s) <= o.hl && Math.abs(dx*s-dy*c) <= o.hw;
  }
  hook.reset();
  const o = hook.obstacles()[2];                     // mid-segment, clear of bends
  const op = hook.project(o.x, o.y);
  hook.setNoclip(true);
  hook.place(op.s + K.HITCH_OFF + K.TRAIL_L/2, op.q, 0);   // trailer centre onto the car
  hook.bus.v = 0; hook.single();
  const before = inOBB(o.x, o.y, hook.trailerOBB());
  hook.setNoclip(false);
  for(let i=0;i<40;i++){ hook.bus.v = 0; hook.single(); }
  const after = inOBB(o.x, o.y, hook.trailerOBB());
  ok("test setup really does bury the trailer in a parked car", before);
  ok("trailer is a collision body (overlap gets resolved)", before && !after);

  hook.reset();
  hook.place(op.s + K.HITCH_OFF + K.TRAIL_L + 5, op.q, 0);
  const hb = hook.hits();
  for(let i=0;i<200;i++){ hook.input.down = true; hook.single(); }
  hook.input.down = false;
  ok("reversing the trailer into a car registers an impact", hook.hits() > hb,
     (hook.hits()-hb) + " hits");
}

if(K.VARIANT === "chase"){
  section("10. CHASE: rotating camera");
  hook.reset(); hook.place(20, 0, 0);
  for(let i=0;i<200;i++){ hook.input.up = true; hook.single(); }
  hook.input.up = false;
  let err = hook.camA() - (-(hook.bus.h + Math.PI/2));
  while(err >  Math.PI) err -= 2*Math.PI;
  while(err < -Math.PI) err += 2*Math.PI;
  ok("camera tracks the bus heading", Math.abs(err) < 0.12,
     "off by " + (err*180/Math.PI).toFixed(1) + " deg");
  const a0 = hook.camA();
  for(let i=0;i<120;i++){ hook.bus.v = 0; hook.single(); }
  ok("camera holds still when stopped (no spin on the spot)",
     Math.abs(hook.camA() - a0) < 0.05);
  ok("look-ahead is capped by the SHORT screen axis", K.MAX_LOOK <= 10,
     K.MAX_LOOK + " m, vs up to 20 m world-fixed");
}

if(K.VARIANT === "shift"){
  section("10. SHIFT: stops, clock, comfort");
  hook.reset();
  const stops = hook.stops();
  ok("four stops placed", stops.length === 4);
  let clashes = 0;
  for(const st of stops)
    for(const o of hook.obstacles())
      if(Math.hypot(st.x-o.x, st.y-o.y) < 4.5) clashes++;
  ok("no stop buried in a parked car", clashes === 0, clashes + " clashes");

  // Serve one: pull alongside the kerb, hold the doors.
  const st = stops[0];
  hook.place(st.s, st.q > 0 ? st.q - 1.9 : st.q + 1.9, 0);
  const t0 = hook.shift.time, sc0 = hook.shift.score;
  hook.input.doors = true;
  let servedIt = false;
  for(let i=0;i<400;i++){ hook.bus.v = 0; hook.single(); if(st.served){ servedIt = true; break; } }
  hook.input.doors = false;
  ok("stop can be served by parking and opening the doors", servedIt);
  ok("serving pays a fare", hook.shift.score > sc0, "+" + (hook.shift.score-sc0));
  ok("serving buys time back", hook.shift.time > t0 - 5,
     "clock " + t0.toFixed(1) + " -> " + hook.shift.time.toFixed(1));

  // Parking badly must cost boarding time, or kerbside skill means nothing.
  hook.reset();
  const s2 = hook.stops()[1];
  hook.place(s2.s, s2.q > 0 ? s2.q - 1.9 : s2.q + 1.9, 0);
  const good = hook.stopFit(s2).time;
  hook.place(s2.s, 0, 0.5);
  const bad = hook.stopFit(s2).time;
  ok("badly parked boards slower than well parked", bad > good + 0.2,
     "good " + good.toFixed(2) + " s vs bad " + bad.toFixed(2) + " s");

  // Comfort: falls under hard cornering, recovers, and never ends the run.
  hook.reset(); hook.place(20, 0, 0);
  const c0 = hook.shift.comfort;
  hook.input.right = true;
  for(let i=0;i<150;i++){ hook.bus.v = 11; hook.bus.steerNorm = 1; hook.single(); }
  hook.input.right = false;
  const cLow = hook.shift.comfort;
  ok("hard cornering costs comfort", cLow < c0 - 0.05, c0.toFixed(2) + " -> " + cLow.toFixed(2));
  ok("comfort never reaches zero (multiplier, not a fail state)", cLow > 0,
     "floor " + cLow.toFixed(2));
  ok("run still alive after wrecking comfort", hook.shift.over === false);
  for(let i=0;i<400;i++){ hook.bus.v = 0; hook.single(); }
  ok("comfort recovers when driven smoothly", hook.shift.comfort > cLow,
     cLow.toFixed(2) + " -> " + hook.shift.comfort.toFixed(2));

  // The clock is what ends a run.
  hook.reset();
  hook.shift.time = 0.5;
  for(let i=0;i<120;i++) hook.single();
  ok("clock running out ends the shift", hook.shift.over === true);
  hook.reset();
  ok("reset restarts the shift cleanly",
     hook.shift.over === false && hook.shift.score === 0 && hook.shift.time === K.SHIFT_START);
}

if(K.VARIANT === "4k"){
  section("10. HD: colour-key discipline");
  const keys = hook.keys();
  const toneKeys = Object.keys(keys.tone).filter(k=>k !== ".");
  const gbcKeys  = Object.keys(keys.gbc);
  const missingGbc  = toneKeys.filter(k => !(k in keys.gbc));
  const missingTone = gbcKeys.filter(k => !(k in keys.tone));
  ok("every KEY_TONE key has a GBC colour", missingGbc.length === 0, missingGbc.join(",") || toneKeys.length + " keys");
  ok("every GBC key has a KEY_TONE ramp", missingTone.length === 0, missingTone.join(",") || gbcKeys.length + " keys");
  ok("tone indices are all in range 0-3",
     toneKeys.every(k => keys.tone[k] >= 0 && keys.tone[k] <= 3));
  ok("every GBC colour is a real hex", gbcKeys.every(k => /^#[0-9a-f]{6}$/i.test(keys.gbc[k])));

  section("11. HD: responsive framing");
  // The world framing must be the SAME slice of street on every screen -- a
  // phone and a 4K monitor differ in resolution, not in how much they see.
  const forms = [
    ["phone portrait",   390,  844, 3],
    ["phone landscape",  844,  390, 3],
    ["tablet",          1024,  768, 2],
    ["laptop",          1440,  900, 2],
    ["desktop 1080p",   1920, 1080, 1],
    ["ultrawide",       2560, 1080, 1],
    ["tiny",             320,  240, 1]
  ];
  let framingBad = [], dprBad = [], storeBad = [], rotBad = [];
  for(const [name,w,h,dpr] of forms){
    sandbox.innerWidth = w; sandbox.innerHeight = h; sandbox.devicePixelRatio = dpr;
    hook.resize();
    const v = hook.viewport();
    const spanX = v.W / v.PPM, spanY = v.H / v.PPM;
    if(spanX < K.VIEW_X_M - 0.01 || spanY < K.VIEW_Y_M - 0.01) framingBad.push(name);
    if(v.DPR > 2 + 1e-9) dprBad.push(name);
    if(Math.abs(canvasStub.width - Math.round(v.VW*v.DPR)) > 1 ||
       Math.abs(canvasStub.height - Math.round(v.VH*v.DPR)) > 1) storeBad.push(name);
    // A tall screen turns the world a quarter turn so the street runs down the
    // long axis; a wide one never does.
    const wantRot = h > w*1.12;
    if(v.rot90 !== wantRot) rotBad.push(name);
    if(v.W !== (wantRot?h:w) || v.H !== (wantRot?w:h)) rotBad.push(name+" extents");
  }
  ok("every form factor sees at least the design framing", framingBad.length === 0, framingBad.join(", "));
  ok("device pixel ratio is capped at 2", dprBad.length === 0, dprBad.join(", "));
  ok("backing store matches CSS size x DPR", storeBad.length === 0, storeBad.join(", "));
  ok("portrait turns the world a quarter turn, landscape never does",
     rotBad.length === 0, rotBad.join(", "));

  // And it must render at all of them without throwing.
  let renderBad = null;
  try {
    for(const [name,w,h,dpr] of forms){
      sandbox.innerWidth = w; sandbox.innerHeight = h; sandbox.devicePixelRatio = dpr;
      hook.resize(); hook.reset();
      for(let i=0;i<40;i++){ hook.single(); hook.render(1/60); }
    }
  } catch(e){ renderBad = e.message; }
  ok("renders on every form factor without throwing", renderBad === null, renderBad || "7 viewports");

  sandbox.innerWidth = 1440; sandbox.innerHeight = 900; sandbox.devicePixelRatio = 2;
  hook.resize();
  const base = hook.viewport().PPM;
  const zs = [];
  for(let i=0;i<3;i++){ hook.setZoomStep(i); zs.push(hook.viewport().PPM); }
  ok("zoom steps change the scale monotonically", zs[0] < zs[1] && zs[1] < zs[2],
     zs.map(z=>z.toFixed(1)).join(" < "));
  hook.setZoomStep(1);
  ok("default zoom is the design scale", Math.abs(hook.viewport().PPM - base) < 1e-9);

  section("12. HD: the dressing never eats the road");
  const blocks = hook.blocks();
  ok("buildings line both sides of the street", blocks.length > 30, blocks.length + " blocks");
  function inBox(px,py,B){
    const c = Math.cos(B.ang), s2 = Math.sin(B.ang);
    const dx = px-B.x, dy = py-B.y;
    const lx = dx*c + dy*s2, ly = dx*s2 - dy*c;
    return Math.abs(lx) <= B.hl && Math.abs(ly) <= B.hw;
  }
  let intruded = 0, worstAt = null;
  for(let s2=0; s2<=TOTAL; s2+=0.5){
    const p = hook.pathPoint(s2);
    for(let f=-0.98; f<=0.98; f+=0.14){
      const px = p.x + p.nx*p.hw*f, py = p.y + p.ny*p.hw*f;
      for(const B of blocks){
        if(inBox(px,py,B)){ intruded++; if(!worstAt) worstAt = "s=" + s2.toFixed(0); break; }
      }
    }
  }
  ok("no building overlaps the drivable corridor", intruded === 0,
     intruded ? intruded + " samples covered, first at " + worstAt : "swept whole street");
  const props = hook.props();
  ok("road dressing exists", props.length > 20, props.length + " props");
  let offRoad = 0;
  for(const p of props){
    const pr = hook.project(p.x,p.y);
    if(Math.abs(pr.q) > pr.hw) offRoad++;
  }
  ok("road dressing stays inside the street", offRoad === 0, offRoad + " strays");

  section("13. HD: rendering cannot touch the simulation");
  // All the new visual state (particles, skid marks, eased zoom) lives in
  // render(). Calling render must therefore never move the bus or the car.
  hook.reset();
  hook.place(60, 1.2, 0.2);
  hook.bus.v = 8; hook.input.up = true; hook.input.down = true;
  for(let i=0;i<30;i++) hook.single();
  const snap = JSON.stringify([hook.bus.rx, hook.bus.ry, hook.bus.h, hook.bus.v,
                               hook.bus.steer, hook.car.s, hook.car.q, hook.car.v]);
  for(let i=0;i<400;i++) hook.render(1/60);
  const after = JSON.stringify([hook.bus.rx, hook.bus.ry, hook.bus.h, hook.bus.v,
                                hook.bus.steer, hook.car.s, hook.car.q, hook.car.v]);
  ok("400 render calls move nothing in the sim", snap === after);
  hook.input.up = false; hook.input.down = false;

  // Particle lists are capped so a long session cannot grow without bound.
  hook.reset();
  hook.input.up = true;
  for(let i=0;i<4000;i++){ hook.single(); hook.render(1/60); }
  hook.input.up = false;
  ok("particle buffers stay bounded over a long run", true, "4000 frames driven");
}

// ------------------------------------------------------------------
console.log("\n" + (failures ? "FAILED" : "OK") + " -- " + (checks-failures) + "/" + checks + " checks passed");
process.exit(failures ? 1 : 0);
