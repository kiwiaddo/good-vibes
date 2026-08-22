#!/usr/bin/env node
// Drive bus-4k.html's touch layer with REAL PointerEvents in a real browser.
//
// tools/test-bus.js section 18 calls the gesture module directly, which proves
// the maths but not the wiring: it never touches bindZone, the capture calls,
// the gear button or the settings sheet. This does, in the Chromium that ships
// with Claude Code on the web.
//
//   node tools/touch-bus.js [bus-4k.html]
//
// requestAnimationFrame does not fire in this headless mode, so the loop is
// stepped by hand through window.H.loopStep(), exactly as tools/shot-bus.js
// steps it through h.single().
const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFileSync } = require("child_process");

const file = process.argv[2] || "bus-4k.html";
const CHROME = ["/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
                "/opt/pw-browsers/chromium/chrome-linux/chrome"].find(p => fs.existsSync(p));
if(!CHROME){ console.error("no chromium under /opt/pw-browsers"); process.exit(1); }

const PROBE = `<script>
window.__ERR = "";
window.onerror = function(m){ window.__ERR += m + " | "; };
var R = [];
function ok(name, cond, detail){ R.push([!!cond, name, detail === undefined ? "" : String(detail)]); }
function wait(ms){ return new Promise(function(r){ setTimeout(r, ms); }); }

function pt(el, type, id, x, y){
  el.dispatchEvent(new PointerEvent(type, {
    pointerId:id, pointerType:"touch", isPrimary:id===1,
    clientX:x, clientY:y, bubbles:true, cancelable:true
  }));
}
function run(n){ for(var i=0;i<(n||60);i++) window.H.loopStep(1000/60); }

(async function(){
  await wait(300);
  var H = window.H;
  if(!H){ document.title = JSON.stringify([[false,"hook installed",""]]); return; }

  // Become a touch device the way a phone does.
  window.dispatchEvent(new Event("touchstart"));
  H.setCtrl("drag", true);

  var L = document.getElementById("zoneL"), Rz = document.getElementById("zoneR");
  ok("both drag zones exist in the DOM", !!L && !!Rz);

  // ---- steering ----
  H.startLevel(0);
  H.bus.v = 6;
  pt(L, "pointerdown", 1, 200, 400);
  pt(L, "pointermove", 1, 200 + 96, 400);
  run(40);
  var steered = H.bus.steerNorm;
  ok("a real drag on the left zone steers", steered > 0.5, steered.toFixed(3));
  pt(L, "pointermove", 1, 200 - 96, 400);
  run(60);
  ok("and reverses with the thumb", H.bus.steerNorm < -0.5, H.bus.steerNorm.toFixed(3));
  pt(L, "pointerup", 1, 200 - 96, 400);
  run(40);
  ok("lifting recentres the wheel", Math.abs(H.bus.steerNorm) < 0.05);

  // ---- speed pad ----
  H.startLevel(0); H.bus.v = 10;
  pt(Rz, "pointerdown", 2, 900, 400);
  pt(Rz, "pointermove", 2, 900, 400 + 90);
  run(60);
  ok("dragging down on the right zone brakes", H.bus.v < 9.0, H.bus.v.toFixed(2) + " m/s");
  pt(Rz, "pointerup", 2, 900, 490);

  // ---- auto-throttle ----
  H.startLevel(0); H.setNoclip(true); H.place(20, 0, 0); H.bus.v = 0;
  run(900);
  ok("hands off, the bus finds its cruise", Math.abs(H.bus.v - 9) < 1.6, H.bus.v.toFixed(2) + " m/s");
  H.setNoclip(false);

  // ---- HOLD ON: two-finger tap ----
  H.startLevel(0); H.game.holdT = 0; H.game.holdCool = 0;
  pt(L,  "pointerdown", 3, 250, 400);
  pt(Rz, "pointerdown", 4, 950, 400);
  await wait(60);
  pt(L,  "pointerup", 3, 250, 400);
  pt(Rz, "pointerup", 4, 950, 400);
  ok("a real two-finger tap braces", H.game.holdT > 0, "holdT " + H.game.holdT.toFixed(2));

  // ---- and the driving posture does not ----
  H.startLevel(0); H.game.holdT = 0; H.game.holdCool = 0;
  pt(L, "pointerdown", 5, 250, 400);
  pt(L, "pointermove", 5, 320, 400);
  run(20);
  await wait(400);                       // a thumb that has been driving a while
  pt(Rz, "pointerdown", 6, 950, 400);
  await wait(40);
  pt(Rz, "pointerup", 6, 950, 400);
  pt(L,  "pointerup", 5, 320, 400);
  ok("a second thumb landing mid-drive does not brace", H.game.holdT === 0,
     "holdT " + H.game.holdT.toFixed(2));

  // ---- settings sheet ----
  H.startLevel(0); H.bus.v = 8;
  var setEl = document.getElementById("settings");
  ok("the sheet starts closed", setEl.hidden === true);
  document.getElementById("gear").click();
  ok("the gear opens it", setEl.hidden === false);
  ok("opening it pauses", H.isPaused() === true);
  var rx = H.bus.rx;
  run(120);
  ok("a paused shift advances nothing", H.bus.rx === rx);
  document.getElementById("closeBtn").click();
  ok("CLOSE dismisses it", setEl.hidden === true && H.isPaused() === false);
  H.input.up = true; run(60); H.input.up = false;
  ok("and the bus moves again", H.bus.rx !== rx);

  // ---- scheme toggle ----
  document.getElementById("ctrlBtn").click();
  ok("CONTROLS switches to the D-pad", H.ctrl() === "pads");
  ok("the body carries the scheme class",
     document.body.classList.contains("pads") && !document.body.classList.contains("drag"));
  var padsVisible = getComputedStyle(document.getElementById("pads")).display !== "none";
  var zonesGone   = getComputedStyle(document.getElementById("zones")).display === "none";
  ok("the D-pad appears and the zones retire", padsVisible && zonesGone);
  document.getElementById("ctrlBtn").click();
  ok("and back again", H.ctrl() === "drag" &&
     getComputedStyle(document.getElementById("pads")).display === "none");

  // ---- the horn is still a button, per research S11 ----
  ok("the horn survives as a real button",
     getComputedStyle(document.getElementById("horn")).display !== "none");
  ok("HOLD ON is gone from the chrome", !document.getElementById("holdbtn"));

  ok("nothing threw", window.__ERR === "", window.__ERR);
  document.title = JSON.stringify(R);
})();
</script>`;

const src = fs.readFileSync(file, "utf8");
const page = src
  .replace("<script>\n(function(){",
           "<script>window.__busHook=function(h){window.H=h;};</script>\n<script>\n(function(){")
  .replace("</body>", PROBE + "</body>");

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "bustouch-"));
const f = path.join(dir, "probe.html");
fs.writeFileSync(f, page);

const dom = execFileSync(CHROME, [
  "--headless","--no-sandbox","--disable-gpu","--hide-scrollbars",
  "--force-device-scale-factor=1","--virtual-time-budget=20000",
  "--window-size=1280,720","--dump-dom",
  "file://" + f
], { encoding:"utf8", maxBuffer:1<<28, stdio:["ignore","pipe","ignore"] });
fs.rmSync(dir, { recursive:true, force:true });

const m = dom.match(/<title>([\s\S]*?)<\/title>/);
if(!m){ console.error("no result payload -- the probe never finished"); process.exit(1); }
let rows;
try{ rows = JSON.parse(m[1].replace(/&quot;/g,'"').replace(/&amp;/g,"&")); }
catch(e){ console.error("unreadable payload: " + m[1].slice(0,300)); process.exit(1); }

console.log("\nTouch layer, real browser, real PointerEvents  (" + file + ")\n");
let bad = 0;
for(const [pass, name, detail] of rows){
  if(!pass) bad++;
  console.log("  " + (pass ? "PASS  " : "FAIL  ") + name + (detail ? "   " + detail : ""));
}
console.log("\n" + (bad ? "FAILED" : "OK") + " -- " + (rows.length-bad) + "/" + rows.length + " checks passed");
process.exit(bad ? 1 : 0);
