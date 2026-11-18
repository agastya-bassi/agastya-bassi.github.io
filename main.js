(function () {
  'use strict';
  var root = document.documentElement;
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Color wheel ---------- */
  var STOPS = [
    { bg: '#FBFAF7', accent: '#1F4FB8' },
    { bg: '#F1E3CC', accent: '#B4532A' },
    { bg: '#DAE6D8', accent: '#2F6B4F' },
    { bg: '#141413', accent: '#8FB0FF' },
    { bg: '#0F1B2D', accent: '#F2B880' },
    { bg: '#2A1A2E', accent: '#E59AC8' }
  ];
  function hexRgb(h) { return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]; }
  function rgbHex(c) { return '#' + c.map(function (v) { var s = Math.round(Math.max(0, Math.min(255, v))).toString(16); return s.length < 2 ? '0' + s : s; }).join(''); }
  function mix(a, b, f) { var x = hexRgb(a), y = hexRgb(b); return rgbHex([0, 1, 2].map(function (i) { return x[i] + (y[i] - x[i]) * f; })); }
  function lum(h) {
    var c = hexRgb(h).map(function (v) { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  }
  function themeAt(deg) {
    var t = ((deg % 360) + 360) % 360;
    var i = Math.floor(t / 60), f = (t - i * 60) / 60;
    f = f * f * (3 - 2 * f);
    var a = STOPS[i], b = STOPS[(i + 1) % STOPS.length];
    var bg = mix(a.bg, b.bg, f), accent = mix(a.accent, b.accent, f);
    var L = lum(bg);
    var ink = L < 0.18 ? '#F2F0EB' : '#161616';
    var soft = Math.min(1, Math.abs(L - 0.18) / 0.15);
    return {
      '--bg': bg, '--ink': ink, '--accent': accent,
      '--on-accent': lum(accent) > 0.3 ? '#111111' : '#FFFFFF',
      '--muted': mix(ink, bg, 0.2 * soft),
      '--faint': mix(ink, bg, 0.32 * soft),
      '--line': mix(ink, bg, 0.82),
      '--chip': mix(bg, ink, 0.04),
      '--dot': mix(ink, bg, 0.72)
    };
  }

  var wheel = document.getElementById('wheel');
  var hint = document.getElementById('wheel-hint');
  var themeMeta = document.querySelector('meta[name="theme-color"]');
  var rot = 0, vel = 0, spinRaf = null, drag = null, moved = false, touched = false;
  try { if (window.matchMedia('(prefers-color-scheme: dark)').matches) rot = 180; } catch (e) {}

  function apply() {
    var th = themeAt(-rot);
    for (var k in th) root.style.setProperty(k, th[k]);
    wheel.style.transform = 'rotate(' + rot.toFixed(1) + 'deg)';
  }
  function touch() { if (!touched) { touched = true; hint.classList.add('gone'); } }
  function spin(v) {
    cancelAnimationFrame(spinRaf);
    if (reduceMotion) { rot += v * 20; apply(); return; }
    vel = v;
    (function step() {
      vel *= 0.955;
      if (Math.abs(vel) < 0.05) { spinRaf = null; return; }
      rot += vel; apply();
      spinRaf = requestAnimationFrame(step);
    })();
  }
  function ptrAngle(e) {
    var b = wheel.getBoundingClientRect();
    return Math.atan2(e.clientX - (b.left + b.width / 2), -(e.clientY - (b.top + b.height / 2))) * 180 / Math.PI;
  }
  wheel.addEventListener('pointerdown', function (e) {
    cancelAnimationFrame(spinRaf);
    try { wheel.setPointerCapture(e.pointerId); } catch (err) {}
    drag = { last: ptrAngle(e), total: 0, d: 0 };
    moved = false;
  });
  wheel.addEventListener('pointermove', function (e) {
    if (!drag) return;
    var a = ptrAngle(e), d = a - drag.last;
    if (d > 180) d -= 360; if (d < -180) d += 360;
    drag.last = a; drag.total += Math.abs(d); drag.d = d;
    if (drag.total > 3) { moved = true; touch(); }
    rot += d; apply();
  });
  function endDrag() {
    if (!drag) return;
    var v = Math.max(-25, Math.min(25, drag.d));
    drag = null;
    if (moved && Math.abs(v) > 0.5) spin(v);
  }
  wheel.addEventListener('pointerup', endDrag);
  wheel.addEventListener('pointercancel', endDrag);
  wheel.addEventListener('click', function () {
    if (moved) { moved = false; return; }
    touch(); spin(9);
  });
  wheel.addEventListener('keydown', function (e) {
    var step = 0;
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') step = 15;
    if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') step = -15;
    if (step) { e.preventDefault(); touch(); rot += step; apply(); }
  });
  apply();


  /* ---------- Copy email ---------- */
  var email = document.getElementById('email');
  var emailLabel = document.getElementById('email-label');
  var copyTimer;
  email.addEventListener('click', function () {
    var addr = 'agastyab@usc.edu';
    function done() {
      email.classList.add('copied');
      emailLabel.textContent = 'Copied to clipboard';
      clearTimeout(copyTimer);
      copyTimer = setTimeout(function () { email.classList.remove('copied'); emailLabel.textContent = addr; }, 1800);
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(addr).then(done, function () { window.location.href = 'mailto:' + addr; });
    } else {
      window.location.href = 'mailto:' + addr;
    }
  });

  /* ---------- Golf ---------- */
  var toggle = document.getElementById('golf-toggle');
  var golf = document.getElementById('golf');
  var green = document.getElementById('green');
  var holeEl = document.getElementById('hole'), poleEl = document.getElementById('pole'), flagEl = document.getElementById('flag');
  var aimEl = document.getElementById('aim'), ballEl = document.getElementById('ball');
  var msg = document.getElementById('golf-msg'), holeLabel = document.getElementById('golf-hole'), nextBtn = document.getElementById('next-hole');
  var BR = 5, EDGE = 6, CUP = 6.5, CAPTURE_SPEED = 3.6;

  // Layouts in fractions of the green's width and height.
  var COURSE = [
    { par: 3, start: [0.09, 0.5], hole: [0.88, 0.25], obs: [
      { type: 'wall', x: 0.47, y: 0, w: 0.025, h: 0.66 },
      { type: 'sand', x: 0.66, y: 0.55, w: 0.16, h: 0.32 }
    ] },
    { par: 3, start: [0.09, 0.5], hole: [0.88, 0.5], obs: [
      { type: 'water', x: 0.33, y: 0.22, w: 0.26, h: 0.56 },
      { type: 'sand', x: 0.74, y: 0.08, w: 0.14, h: 0.26 },
      { type: 'sand', x: 0.74, y: 0.66, w: 0.14, h: 0.26 }
    ] },
    { par: 4, start: [0.08, 0.8], hole: [0.9, 0.32], obs: [
      { type: 'wall', x: 0.3, y: 0.32, w: 0.025, h: 0.68 },
      { type: 'wall', x: 0.62, y: 0, w: 0.025, h: 0.68 },
      { type: 'water', x: 0.4, y: 0.06, w: 0.14, h: 0.3 },
      { type: 'sand', x: 0.72, y: 0.62, w: 0.15, h: 0.3 }
    ] }
  ];
  var holeIdx = 0, layout, obs = [], obsEls = [];
  var ball = { x: 0, y: 0, vx: 0, vy: 0 }, hole = { x: 0, y: 0 }, shotFrom = { x: 0, y: 0 };
  var strokes = 0, total = 0, sunk = false, aimFrom = null, aimVec = null, golfRaf = null;

  function W() { return green.clientWidth; }
  function H() { return green.clientHeight; }
  function place(el, x, y) { el.style.left = x + 'px'; el.style.top = y + 'px'; }
  function drawBall() { place(ballEl, ball.x, ball.y); }

  function loadHole(i) {
    holeIdx = i; layout = COURSE[i];
    var w = W(), h = H();
    obsEls.forEach(function (el) { el.remove(); });
    obsEls = []; obs = [];
    layout.obs.forEach(function (o) {
      var r = { type: o.type, x: o.x * w, y: o.y * h, w: o.w * w, h: o.h * h };
      var el = document.createElement('span');
      el.className = 'obs ' + o.type;
      el.style.left = r.x + 'px'; el.style.top = r.y + 'px'; el.style.width = r.w + 'px'; el.style.height = r.h + 'px';
      green.insertBefore(el, holeEl);
      obs.push(r); obsEls.push(el);
    });
    hole = { x: layout.hole[0] * w, y: layout.hole[1] * h };
    ball = { x: layout.start[0] * w, y: layout.start[1] * h, vx: 0, vy: 0 };
    [holeEl, poleEl, flagEl].forEach(function (el) { place(el, hole.x, hole.y); });
    strokes = 0; sunk = false;
    ballEl.classList.remove('sunk');
    nextBtn.hidden = true;
    holeLabel.textContent = 'Hole ' + (i + 1) + ' · Par ' + layout.par;
    msg.textContent = i === 0 ? 'Drag back and release to putt.' : 'Strokes: 0';
    drawBall();
  }

  toggle.addEventListener('click', function () {
    var open = golf.hidden;
    golf.hidden = !open;
    toggle.setAttribute('aria-expanded', String(open));
    if (open && !layout) loadHole(0);
  });

  function inside(r, x, y, pad) { return x > r.x - pad && x < r.x + r.w + pad && y > r.y - pad && y < r.y + r.h + pad; }
  function scoreName(s, par) {
    if (s === 1) return 'Hole in one. Respect.';
    var d = s - par;
    return ({ '-2': 'Eagle.', '-1': 'Birdie.', '0': 'Par.', '1': 'Bogey.', '2': 'Double bogey.' })[d] || (s + ' strokes. Rough one.');
  }

  function loop() {
    cancelAnimationFrame(golfRaf);
    (function step() {
      var w = W(), h = H();
      var px = ball.x, py = ball.y;
      ball.x += ball.vx; ball.y += ball.vy;
      if (ball.x < BR + EDGE) { ball.x = BR + EDGE; ball.vx = -ball.vx * 0.7; }
      if (ball.x > w - BR - EDGE) { ball.x = w - BR - EDGE; ball.vx = -ball.vx * 0.7; }
      if (ball.y < BR + EDGE) { ball.y = BR + EDGE; ball.vy = -ball.vy * 0.7; }
      if (ball.y > h - BR - EDGE) { ball.y = h - BR - EDGE; ball.vy = -ball.vy * 0.7; }

      var friction = 0.982;
      for (var i = 0; i < obs.length; i++) {
        var o = obs[i];
        if (o.type === 'wall' && inside(o, ball.x, ball.y, BR)) {
          var wasOutX = px <= o.x - BR || px >= o.x + o.w + BR;
          if (wasOutX) { ball.x = px; ball.vx = -ball.vx * 0.75; }
          else { ball.y = py; ball.vy = -ball.vy * 0.75; }
        } else if (o.type === 'sand' && inside(o, ball.x, ball.y, 0)) {
          friction = 0.9;
        } else if (o.type === 'water' && inside(o, ball.x, ball.y, -2)) {
          ball = { x: shotFrom.x, y: shotFrom.y, vx: 0, vy: 0 };
          strokes++;
          msg.textContent = 'Splash. +1 stroke. Strokes: ' + strokes;
          drawBall();
          return;
        }
      }
      ball.vx *= friction; ball.vy *= friction;

      var sp = Math.hypot(ball.vx, ball.vy), d = Math.hypot(ball.x - hole.x, ball.y - hole.y);
      if (d < CUP && sp < CAPTURE_SPEED) {
        ball.x = hole.x; ball.y = hole.y; ball.vx = ball.vy = 0; sunk = true;
        total += strokes;
        ballEl.classList.add('sunk'); drawBall();
        var last = holeIdx === COURSE.length - 1;
        msg.textContent = scoreName(strokes, layout.par) + (last ? ' Course total: ' + total + ' (par 10).' : '');
        nextBtn.textContent = last ? 'Play again' : 'Next hole';
        nextBtn.hidden = false;
        return;
      }
      if (d < CUP + 3 && sp >= CAPTURE_SPEED) {
        // Lipped out: a fast ball skims the cup and gets nudged sideways.
        var nx = (ball.x - hole.x) / (d || 1), ny = (ball.y - hole.y) / (d || 1);
        ball.vx += nx * 0.6; ball.vy += ny * 0.6;
      }
      drawBall();
      if (sp < 0.06) { ball.vx = ball.vy = 0; return; }
      golfRaf = requestAnimationFrame(step);
    })();
  }

  function local(e) { var b = green.getBoundingClientRect(); return { x: e.clientX - b.left, y: e.clientY - b.top }; }
  green.addEventListener('pointerdown', function (e) {
    if (sunk || Math.hypot(ball.vx, ball.vy) > 0.06) return;
    try { green.setPointerCapture(e.pointerId); } catch (err) {}
    aimFrom = local(e); aimVec = { dx: 0, dy: 0 };
  });
  green.addEventListener('pointermove', function (e) {
    if (!aimFrom) return;
    var p = local(e);
    aimVec = { dx: p.x - aimFrom.x, dy: p.y - aimFrom.y };
    var len = Math.min(Math.hypot(aimVec.dx, aimVec.dy), 110);
    place(aimEl, ball.x, ball.y);
    aimEl.style.width = len + 'px';
    aimEl.style.transform = 'rotate(' + (Math.atan2(-aimVec.dy, -aimVec.dx) * 180 / Math.PI) + 'deg)';
    aimEl.style.display = len > 2 ? 'block' : 'none';
  });
  function release() {
    if (!aimFrom) return;
    aimFrom = null; aimEl.style.display = 'none';
    var len = Math.hypot(aimVec.dx, aimVec.dy);
    if (len < 6) return;
    var p = Math.min(len, 110) / len * 0.13;
    shotFrom = { x: ball.x, y: ball.y };
    ball.vx = -aimVec.dx * p; ball.vy = -aimVec.dy * p;
    strokes++;
    msg.textContent = 'Strokes: ' + strokes;
    loop();
  }
  green.addEventListener('pointerup', release);
  green.addEventListener('pointercancel', release);
  nextBtn.addEventListener('click', function () {
    if (holeIdx === COURSE.length - 1) { total = 0; loadHole(0); }
    else loadHole(holeIdx + 1);
  });
})();
