// Render one frame from each variant and emit a single comparison SVG.
// No browser here, so the canvas is stubbed and fillRect calls are replayed
// as <rect> in draw order. Run from the repo root: node tools/shot-variants.js
const fs = require("fs"), vm = require("vm"), path = require("path");
const ROOT = path.resolve(__dirname, "..");
const OUT = process.argv[2] || path.join(ROOT, "bus-variants.svg");

function boot(file){
  const code = fs.readFileSync(path.join(ROOT, file), "utf8").match(/<script>([\s\S]*?)<\/script>/)[1];
  let rects = [], capture = false, cur = "#000";
  const ctxStub = { get fillStyle(){ return cur; }, set fillStyle(v){ cur = v; },
    fillRect(x,y,w,h){ if(capture) rects.push([x,y,w,h,cur]); }, imageSmoothingEnabled:false };
  const el = e => Object.assign({ addEventListener(){}, textContent:"", style:{},
    getBoundingClientRect:()=>({left:0,top:0,width:640,height:384}) }, e||{});
  const cv = el({ width:320, height:192, getContext:()=>ctxStub });
  const store = {}; let hook = null;
  const sb = { console, performance:{now:()=>Date.now()}, setTimeout:()=>0, Math, Date, JSON,
    requestAnimationFrame:()=>0, addEventListener:()=>{},
    localStorage:{ getItem:k=>(k in store?store[k]:null), setItem:(k,v)=>{store[k]=""+v;} },
    document:{ getElementById:id=>id==="game"?cv:el(), addEventListener(){}, querySelectorAll:()=>[] } };
  sb.window = sb; sb.__busHook = h => { hook = h; };
  vm.createContext(sb); vm.runInContext(code, sb, {filename:file});
  return { hook, snap:()=>{ rects = []; capture = true; hook.render(); capture = false; return rects; } };
}

const PANELS = [
  {f:"bus.html",       n:22, label:"RIGID  -  12 m rigid bus, world-fixed camera (the baseline)"},
  {f:"bus-bendy.html", n:22, label:"BENDY  -  18 m articulated: a second body to place, and a jack-knife stop"},
  {f:"bus-chase.html", n:22, label:"CHASE  -  same bus, camera rotates so the bus always points up-screen"},
  {f:"bus-shift.html", n:22, label:"SHIFT  -  same bus, plus shift clock, score and comfort multiplier"},
  {f:"bus-shift.html", n:40, atStop:true,
   label:"SHIFT  -  at a stop: waiting passengers, boarding bar, road-following arrow"}
];
const SC = 2, PW = 640, PH = 384, GAP = 16;
let out = [], y0 = 0;
for(const p of PANELS){
  const { hook, snap } = boot(p.f);
  hook.setPal("color"); hook.reset();
  if(p.atStop){
    const st = hook.stops()[1];
    hook.place(st.s, st.q > 0 ? st.q - 1.9 : st.q + 1.9, 0);
    hook.input.doors = true;
    for(let i=0;i<p.n;i++){ hook.bus.v = 0; hook.single(); }
  } else {
    hook.place(129, 1.4, 0.02);
    hook.input.right = true;
    for(let i=0;i<p.n;i++){ hook.bus.v = 3.0; hook.bus.steerNorm = 0.7; hook.single(); }
    hook.input.right = false;
  }
  const rects = snap();
  out.push('<g transform="translate(0,'+y0+') scale('+SC+')"><rect x="0" y="0" width="320" height="192" fill="#0e0f14"/>');
  for(const r of rects){
    const w = Math.max(0,r[2]), h = Math.max(0,r[3]);
    if(w>0 && h>0) out.push('<rect x="'+r[0]+'" y="'+r[1]+'" width="'+w+'" height="'+h+'" fill="'+r[4]+'"/>');
  }
  out.push('</g><text x="4" y="'+(y0+PH+12)+'" font-family="monospace" font-size="12" fill="#8b8778">'+p.label+'</text>');
  y0 += PH + GAP + 12;
  console.log(p.f.padEnd(16), rects.length + " rects");
}
const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="'+PW+'" height="'+y0+'" viewBox="0 0 '+PW+' '+y0+'" shape-rendering="crispEdges"><rect width="100%" height="100%" fill="#14161a"/>'+out.join("")+'</svg>';
fs.writeFileSync(OUT, svg);
console.log("wrote " + OUT + "  " + (svg.length/1024|0) + " KB");
