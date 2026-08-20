#!/usr/bin/env node
// Screenshot a bus prototype in a real browser.
//
// Claude Code on the web ships a Chromium at /opt/pw-browsers, so the visuals
// can be checked directly instead of inferred from a draw-call log. This wraps
// the page in a probe that installs window.__busHook before the game boots,
// so a shot can be framed anywhere on the street.
//
//   node tools/shot-bus.js bus-4k.html out.png 1440x900 s=126 q=1.4 v=6.5 st=0.35
//
// Params: s/q/dh (place along/across/heading), v (speed), st (steer -1..1),
//         car (oncoming car's s), n (frames to settle), pal (color|green|gray).
// NOTE: headless Chromium clamps the window to a 500 px minimum width, so a
// 390 px phone cannot be shot directly -- use a matching aspect (e.g. 500x1082).
const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFileSync } = require("child_process");

const [file, out, size] = process.argv.slice(2);
if(!file || !out){
  console.error("usage: node tools/shot-bus.js <game.html> <out.png> [WxH] [k=v ...]");
  process.exit(2);
}
const [w,h] = (size || "1280x720").split("x").map(Number);
const params = process.argv.slice(5).join("&");

const CHROME = ["/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
                "/opt/pw-browsers/chromium/chrome-linux/chrome"].find(p => fs.existsSync(p));
if(!CHROME){ console.error("no chromium under /opt/pw-browsers"); process.exit(1); }

const src = fs.readFileSync(file, "utf8");
const probe = src
  .replace("<script>\n(function(){",
           "<script>window.__busHook=function(h){window.H=h;};</script>\n<script>\n(function(){")
  .replace("</body>", `<script>
setTimeout(function(){
  var h = window.H; if(!h) return;
  var p = new URLSearchParams(location.search);
  if(p.get("pal")) h.setPal(p.get("pal"));
  h.reset();
  if(p.get("s")) h.place(+p.get("s"), +(p.get("q")||0), +(p.get("dh")||0));
  if(p.get("v"))  h.bus.v = +p.get("v");
  if(p.get("st")){ h.bus.steerNorm = +p.get("st"); h.bus.steer = h.bus.steerNorm * 0.55; }
  if(p.get("car")) h.car.s = +p.get("car");
  for(var i=0;i<(+(p.get("n")||10));i++) h.single();
}, 400);
</script></body>`);

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "busshot-"));
const page = path.join(dir, "probe.html");
fs.writeFileSync(page, probe);

execFileSync(CHROME, [
  "--headless","--no-sandbox","--disable-gpu","--hide-scrollbars",
  "--force-device-scale-factor=1","--virtual-time-budget=3000",
  "--window-size=" + w + "," + h,
  "--screenshot=" + path.resolve(out),
  "file://" + page + (params ? "?" + params : "")
], { stdio:["ignore","ignore","ignore"] });

fs.rmSync(dir, { recursive:true, force:true });
const kb = (fs.statSync(out).size/1024).toFixed(0);
console.log(out + "  " + w + "x" + h + "  " + kb + " KB");
