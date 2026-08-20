const fs=require("fs"), vm=require("vm");
function boot(file){
  const code=fs.readFileSync(file,"utf8").match(/<script>([\s\S]*?)<\/script>/)[1];
  let rects=[], capture=false, cur="#000";
  const ctxStub={ get fillStyle(){return cur;}, set fillStyle(v){cur=v;},
    fillRect(x,y,w,h){ if(capture) rects.push([x,y,w,h,cur]); }, imageSmoothingEnabled:false };
  const el=e=>Object.assign({addEventListener(){},textContent:"",style:{},
    getBoundingClientRect:()=>({left:0,top:0,width:640,height:384})},e||{});
  const cv=el({width:320,height:192,getContext:()=>ctxStub});
  const store={}; let hook=null;
  const sb={console,performance:{now:()=>Date.now()},setTimeout:()=>0,Math,Date,JSON,
    requestAnimationFrame:()=>0,addEventListener:()=>{},
    localStorage:{getItem:k=>store[k]??null,setItem:(k,v)=>{store[k]=""+v;}},
    document:{getElementById:id=>id==="game"?cv:el(),addEventListener(){},querySelectorAll:()=>[]}};
  sb.window=sb; sb.__busHook=h=>{hook=h;};
  vm.createContext(sb); vm.runInContext(code,sb,{filename:file});
  return { hook, snap:()=>{ rects=[]; capture=true; hook.render(); capture=false; return rects; } };
}
const PANELS=[
  {f:"bus.html",       label:"RIGID  -  12 m rigid bus, world-fixed camera (the baseline)",
   s:129,q:1.4,dh:0.02,steer:0.7,v:3.0,n:22},
  {f:"bus-bendy.html", label:"BENDY  -  18 m articulated: the trailer is a second body to place",
   s:129,q:1.4,dh:0.02,steer:0.7,v:3.0,n:22},
  {f:"bus-chase.html", label:"CHASE  -  same bus, camera rotates so the bus points up-screen",
   s:129,q:1.4,dh:0.02,steer:0.7,v:3.0,n:22},
  {f:"bus-shift.html", label:"SHIFT  -  same bus, plus clock / score / comfort multiplier",
   s:129,q:1.4,dh:0.02,steer:0.7,v:3.0,n:22},
  {f:"bus-shift.html", label:"SHIFT  -  pulled up at a stop: waiting passengers, boarding bar, route arrow",
   s:112,q:-1.1,dh:0,steer:0,v:0,n:40,doors:true,atStop:true}
];
const SC=2,PW=640,PH=384,GAP=16;
let out=[],y0=0;
for(const p of PANELS){
  const {hook,snap}=boot(p.f);
  hook.setPal("color"); hook.reset();
  if(p.atStop){ const st=hook.stops()[1]; hook.place(st.s, st.q>0?st.q-1.9:st.q+1.9, 0); }
  else hook.place(p.s,p.q,p.dh);
  if(p.doors) hook.input.doors=true;
  hook.input.right = p.steer>0;
  for(let i=0;i<p.n;i++){ hook.bus.v=p.v; if(p.steer) hook.bus.steerNorm=p.steer; hook.single(); }
  hook.input.right=false;
  const rects=snap();
  out.push(`<g transform="translate(0,${y0}) scale(${SC})"><rect x="0" y="0" width="320" height="192" fill="#0e0f14"/>`);
  for(const r of rects){ const w=Math.max(0,r[2]),h=Math.max(0,r[3]); if(w>0&&h>0)
    out.push(`<rect x="${r[0]}" y="${r[1]}" width="${w}" height="${h}" fill="${r[4]}"/>`); }
  out.push(`</g><text x="4" y="${y0+PH+12}" font-family="monospace" font-size="12" fill="#8b8778">${p.label}</text>`);
  y0+=PH+GAP+12;
  console.log(p.f.padEnd(16), rects.length+" rects");
}
const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${PW}" height="${y0}" viewBox="0 0 ${PW} ${y0}" shape-rendering="crispEdges"><rect width="100%" height="100%" fill="#14161a"/>${out.join("")}</svg>`;
fs.writeFileSync("bus-variants.svg",svg);
console.log("wrote bus-variants.svg "+(svg.length/1024|0)+" KB");
