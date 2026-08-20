// Physics parity: bus-4k.html must be the SAME GAME as bus.html.
//
// The HD build copies the simulation block out of the prototype verbatim and
// only replaces the renderer. This drives both files, in separate sandboxes,
// with an identical scripted input stream and an identical seeded PRNG, then
// compares the full driving state every frame. Any drift at all is a failure:
// the numbers should agree exactly, not approximately.
const fs = require("fs");
const vm = require("vm");

function sandboxFor(file, seed){
  const src = fs.readFileSync(file, "utf8");
  const m = src.match(/<script>([\s\S]*?)<\/script>/);
  if(!m) throw new Error("no inline script in " + file);

  function grad(){ return { addColorStop(){} }; }
  function mkCtx(){
    return {
      fillStyle:"#000", strokeStyle:"#000", lineWidth:1, globalAlpha:1,
      globalCompositeOperation:"source-over", font:"", textAlign:"left",
      textBaseline:"alphabetic", imageSmoothingEnabled:false,
      fillRect(){}, strokeRect(){}, clearRect(){}, fill(){}, stroke(){},
      fillText(){}, strokeText(){}, beginPath(){}, closePath(){}, moveTo(){},
      lineTo(){}, rect(){}, quadraticCurveTo(){}, bezierCurveTo(){}, arc(){},
      arcTo(){}, ellipse(){}, clip(){}, save(){}, restore(){}, translate(){},
      scale(){}, rotate(){}, transform(){}, setTransform(){}, resetTransform(){},
      setLineDash(){}, getLineDash(){ return []; }, drawImage(){},
      createLinearGradient:grad, createRadialGradient:grad,
      createPattern(){ return {}; },
      measureText(t){ return { width:(""+t).length*7 }; }
    };
  }
  const el = extra => Object.assign({
    addEventListener(){}, removeEventListener(){}, textContent:"", style:{},
    classList:{ add(){}, remove(){}, toggle(){}, contains(){ return false; } },
    getBoundingClientRect:()=>({left:0,top:0,width:480,height:44})
  }, extra||{});

  // One deterministic stream per sandbox, seeded identically. Same code path
  // therefore consumes the same numbers in the same order.
  let st = seed >>> 0;
  const rand = ()=>{ st = (st*1664525 + 1013904223) >>> 0; return st / 4294967296; };
  const M = Object.create(Math); M.random = rand;

  const store = {};
  let hook = null;
  const sb = {
    console, performance:{ now:()=>0 }, setTimeout:()=>0, clearTimeout(){},
    Math:M, Date, JSON,
    requestAnimationFrame:()=>0, addEventListener(){}, removeEventListener(){},
    innerWidth:1280, innerHeight:720, devicePixelRatio:2,
    localStorage:{ getItem:k=>(k in store?store[k]:null), setItem:(k,v)=>{store[k]=""+v;} },
    document:{
      getElementById:id => id === "game" ? el({width:320,height:192,getContext:()=>mkCtx()}) : el(),
      createElement:tag => tag === "canvas" ? el({width:0,height:0,getContext:()=>mkCtx()}) : el(),
      body:el(), documentElement:el(), addEventListener(){}, querySelectorAll:()=>[]
    }
  };
  sb.window = sb;
  sb.__busHook = h => { hook = h; };
  vm.createContext(sb);
  vm.runInContext(m[1], sb, {filename:file});
  if(!hook) throw new Error("no hook from " + file);
  return hook;
}

const SEED = 20260820;
const A = sandboxFor("bus.html", SEED);
const B = sandboxFor("bus-4k.html", SEED);

// A scripted drive: throttle, steering, braking, horn, reverse and a reset,
// deliberately including wall scrapes and bin strikes so the collision
// resolver and the spark emitter are part of the comparison.
function scriptAt(i){
  const t = i;
  return {
    up:    (t % 300) < 190,
    down:  (t % 300) >= 240 && (t % 300) < 275,
    left:  (t % 137) < 44,
    right: (t % 211) >= 150,
    horn:  t % 613 === 0
  };
}
function apply(h, s){
  h.input.up = s.up; h.input.down = s.down;
  h.input.left = s.left; h.input.right = s.right;
  if(s.horn) h.honk();
}
function state(h){
  return [h.bus.rx, h.bus.ry, h.bus.h, h.bus.v, h.bus.steer, h.bus.steerNorm,
          h.bus.bump, h.bus.scrapes.length,
          h.car.s, h.car.q, h.car.v, h.car.targetQ, h.car.mode,
          h.clearances().l, h.clearances().r, h.squeezing() ? 1 : 0, h.hits()];
}
const LABELS = ["bus.rx","bus.ry","bus.h","bus.v","bus.steer","bus.steerNorm",
                "bus.bump","scrapes","car.s","car.q","car.v","car.targetQ",
                "car.mode","clearL","clearR","squeezing","hits"];

A.setPal("color"); B.setPal("color");
A.reset(); B.reset();

const N = 6000;
let firstDrift = null, worst = 0, worstField = null;
for(let i=0;i<N;i++){
  if(i === 2500){ A.reset(); B.reset(); }
  const s = scriptAt(i);
  apply(A, s); apply(B, s);
  A.single(); B.single();
  const a = state(A), b = state(B);
  for(let k=0;k<a.length;k++){
    if(typeof a[k] === "string"){
      if(a[k] !== b[k] && !firstDrift) firstDrift = { i, field:LABELS[k], a:a[k], b:b[k] };
      continue;
    }
    const d = Math.abs(a[k]-b[k]);
    if(d > worst){ worst = d; worstField = LABELS[k]; }
    if(d !== 0 && !firstDrift) firstDrift = { i, field:LABELS[k], a:a[k], b:b[k] };
  }
}

console.log("Parity: bus.html  vs  bus-4k.html");
console.log("  " + N + " frames of scripted driving, one reset at frame 2500");
console.log("  fields compared per frame: " + LABELS.length);
if(firstDrift){
  console.log("  FIRST DRIFT at frame " + firstDrift.i + " in " + firstDrift.field +
              ": " + firstDrift.a + " vs " + firstDrift.b);
}
console.log("  worst numeric difference: " + worst + (worstField ? " (" + worstField + ")" : ""));
const finalA = state(A), finalB = state(B);
console.log("  final bus pose  : " + finalA.slice(0,4).map(v=>(+v).toFixed(6)).join(", "));
console.log("  final HD pose   : " + finalB.slice(0,4).map(v=>(+v).toFixed(6)).join(", "));
console.log("  hits: " + A.hits() + " vs " + B.hits() +
            "   scrapes: " + A.bus.scrapes.length + " vs " + B.bus.scrapes.length);

const pass = !firstDrift && worst === 0;
console.log("\n" + (pass ? "OK -- the HD build is the same simulation, exactly"
                         : "FAILED -- the HD build has drifted from the prototype"));
process.exit(pass ? 0 : 1);
