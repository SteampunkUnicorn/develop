"use strict";
const canvas = document.querySelector("#game"),
  ctx = canvas.getContext("2d"),
  $ = (id) => document.getElementById(id);
let W = 1000,
  H = 420,
  state = "ready",
  elapsed = 0,
  score = 0,
  best = 0,
  spawn = 0,
  pickup = 3,
  shield = 0,
  invuln = 0,
  objects = [],
  particles = [],
  keys = {},
  target = null,
  last = 0;
try {
  best = Number(localStorage.getItem("neon-dodger-best")) || 0;
} catch {}

const player = { x: 500, y: 365, r: 10 };
function resize() {
  const r = canvas.getBoundingClientRect();
  const old = W;
  W = r.width;
  H = r.height;
  canvas.width = W * devicePixelRatio;
  canvas.height = H * devicePixelRatio;
  ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
  player.x = (player.x / old) * W;
  player.y = H - 51;
}
new ResizeObserver(resize).observe(canvas);
function overlay(title, message, button) {
  $("overlay").classList.remove("hidden");
  $("title").textContent = title;
  $("message").textContent = message;
  $("play").textContent = button;
}
function start() {
  state = "playing";
  elapsed = score = spawn = shield = invuln = 0;
  pickup = 3;
  objects = [];
  particles = [];
  target = null;
  player.x = W / 2;
  $("overlay").classList.add("hidden");
  $("score").textContent = "0";
  $("pause").disabled = false;
  $("pause").textContent = "Pause";
  $("pause").setAttribute("aria-label", "Pause game");
}
function pause() {
  if (state === "playing") {
    state = "paused";
    overlay("Paused", "Take a breath.", "Resume");
    $("pause").textContent = "Resume";
    $("pause").setAttribute("aria-label", "Resume game");
  } else if (state === "paused") {
    state = "playing";
    $("pause").textContent = "Pause";
    $("pause").setAttribute("aria-label", "Pause game");
    $("overlay").classList.add("hidden");
  }
}
function burst(x, y, c) {
  for (let i = 0; i < 22; i++) {
    const a = Math.random() * Math.PI * 2,
      s = 40 + Math.random() * 160;
    particles.push({
      x,
      y,
      vx: Math.cos(a) * s,
      vy: Math.sin(a) * s,
      life: 0.6,
      c,
    });
  }
}
function die() {
  burst(player.x, player.y, "#a4fff0");
  state = "over";

  const value = Math.floor(score),
    record = value > best;
  if (record) {
    best = value;
    try {
      localStorage.setItem("neon-dodger-best", best);
    } catch {}
  }

  overlay("Game over", `Score ${value} · Best ${best}`, "Play again");
  $("pause").disabled = true;
}
$("play").onclick = () => (state === "paused" ? pause() : start());
$("pause").onclick = pause;
addEventListener("keydown", (e) => {
  if (["ArrowLeft", "ArrowRight", " ", "a", "d", "A", "D"].includes(e.key)) {
    e.preventDefault();
    keys[e.key.toLowerCase()] = true;
    if (e.key === " " && !e.repeat) {
      if (state === "playing" || state === "paused") pause();
      else start();
    }
  }
});
addEventListener("keyup", (e) => (keys[e.key.toLowerCase()] = false));
addEventListener("blur", () => {
  keys = {};
  if (state === "playing") pause();
});
document.addEventListener("visibilitychange", () => {
  if (document.hidden && state === "playing") pause();
});
canvas.addEventListener("pointerdown", (e) => {
  if (state !== "playing") return;
  canvas.setPointerCapture(e.pointerId);
  target = e.clientX - canvas.getBoundingClientRect().left;
});
canvas.addEventListener("pointermove", (e) => {
  if (canvas.hasPointerCapture(e.pointerId))
    target = e.clientX - canvas.getBoundingClientRect().left;
});
canvas.addEventListener("pointerup", () => (target = null));
canvas.addEventListener("pointercancel", () => (target = null));
function update(dt) {
  if (state !== "playing") return;
  elapsed += dt;
  score += dt * 10;
  shield = Math.max(0, shield - dt);
  invuln = Math.max(0, invuln - dt);
  const level = 1 + Math.floor(elapsed / 15);
  let move =
    (keys.arrowright || keys.d ? 1 : 0) - (keys.arrowleft || keys.a ? 1 : 0);
  if (move) target = null;
  player.x += move * 440 * dt;
  if (target !== null)
    player.x += Math.max(-440 * dt, Math.min(440 * dt, target - player.x));
  player.x = Math.max(16, Math.min(W - 16, player.x));
  spawn -= dt;
  pickup -= dt;
  if (spawn <= 0) {
    spawn = Math.max(0.19, 0.7 - level * 0.045);
    const size = 16 + Math.random() * 22;
    objects.push({
      x: 20 + Math.random() * (W - 40),
      y: -45,
      w: size,
      h: size + Math.random() * 25,
      v: 135 + level * 23 + Math.random() * 70,
      kind: "hazard",
      a: Math.random(),
    });
  }
  if (pickup <= 0) {
    pickup = 6 + Math.random() * 4;
    objects.push({
      x: 25 + Math.random() * (W - 50),
      y: -20,
      w: 18,
      h: 18,
      v: 145,
      kind: "glow",
      a: 0,
    });
  }
  for (const o of objects) {
    o.y += o.v * dt;
    o.a += dt;
    const dx = Math.max(Math.abs(player.x - o.x) - o.w / 2, 0),
      dy = Math.max(Math.abs(player.y - o.y) - o.h / 2, 0);
    if (dx * dx + dy * dy < player.r * player.r) {
      if (o.kind === "glow") {
        score += 100;
        shield = 5;

        burst(o.x, o.y, "#ccff82");
        o.y = H + 100;
      } else if (invuln <= 0) {
        if (shield > 0) {
          shield = 0;
          invuln = 0.8;
          burst(o.x, o.y, "#ff5477");

          o.y = H + 100;
        } else {
          die();
          break;
        }
      }
    }
  }
  objects = objects.filter((o) => o.y < H + 60);
  $("score").textContent = String(Math.floor(score));
}
function draw(dt, t) {
  ctx.clearRect(0, 0, W, H);
  const visible = objects;
  for (const o of visible) {
    ctx.save();
    ctx.translate(o.x, o.y);
    const c = o.kind === "glow" ? "#ccff82" : "#ff5477";
    ctx.shadowBlur = 0;
    ctx.shadowColor = c;
    ctx.strokeStyle = c;
    ctx.fillStyle = o.kind === "glow" ? "#ccff8230" : "#ff54771c";
    ctx.lineWidth = 1.5;
    if (o.kind === "glow") {
      ctx.rotate(Math.PI / 4 + t * 0.001);
      ctx.fillRect(-7, -7, 14, 14);
      ctx.strokeRect(-7, -7, 14, 14);
    } else {
      ctx.fillRect(-o.w / 2, -o.h / 2, o.w, o.h);
      ctx.strokeRect(-o.w / 2, -o.h / 2, o.w, o.h);
    }
    ctx.restore();
  }
  if (state !== "over") {
    ctx.save();
    ctx.translate(player.x, player.y);
    ctx.globalAlpha = invuln > 0 ? 0.4 + Math.sin(t * 0.03) * 0.3 : 1;
    ctx.shadowColor = "#a4fff0";
    ctx.shadowBlur = 5;
    ctx.fillStyle = "#a4fff0";
    ctx.beginPath();
    ctx.moveTo(0, -12);
    ctx.lineTo(10, 7);
    ctx.lineTo(0, 3);
    ctx.lineTo(-10, 7);
    ctx.closePath();
    ctx.fill();
    if (shield > 0) {
      ctx.strokeStyle = "#ccff82";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, 23, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }
  if (state !== "paused") {
    for (const p of particles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
    }
    particles = particles.filter((p) => p.life > 0);
  }
  for (const p of particles) {
    ctx.globalAlpha = Math.max(0, p.life / 0.6);
    ctx.fillStyle = p.c;
    ctx.fillRect(p.x, p.y, 3, 3);
  }
  ctx.globalAlpha = 1;
}
function loop(t) {
  const dt = Math.min((t - last) / 1000, 0.035);
  last = t;
  update(dt);
  draw(dt, t);
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
