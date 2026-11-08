(() => {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const SVGNS = 'http://www.w3.org/2000/svg';
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const ease = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  const BPM = 92, beatLen = 60 / BPM;
  const $ = s => document.querySelector(s);

  $('#year').textContent = new Date().getFullYear();

  /* Header + mobile nav */
  const header = $('.site-header');
  const toggle = $('.nav-toggle');
  const nav = $('#nav');
  const setNav = open => {
    nav.classList.toggle('open', open);
    toggle.setAttribute('aria-expanded', open);
    toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    header.classList.toggle('is-solid', open || window.scrollY > 30);
  };
  toggle.addEventListener('click', () => setNav(!nav.classList.contains('open')));
  nav.querySelectorAll('a').forEach(a => a.addEventListener('click', () => setNav(false)));

  /* Split headings into words */
  document.querySelectorAll('.split').forEach(h => {
    const words = h.textContent.trim().split(/\s+/);
    h.setAttribute('aria-label', h.textContent.trim());
    h.innerHTML = words.map((w, i) => `<span class="w" aria-hidden="true"><span style="--i:${i}">${w}</span></span>`).join(' ');
  });
  /* Stagger children */
  document.querySelectorAll('[data-stagger]').forEach(g => {
    [...g.children].forEach((c, i) => c.style.setProperty('--d', `${i * 0.08}s`));
  });

  /* Reveal on scroll */
  const targets = document.querySelectorAll('[data-reveal], .split');
  if ('IntersectionObserver' in window && !reduce) {
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
    }, { threshold: 0.15, rootMargin: '0px 0px -50px 0px' });
    targets.forEach(el => io.observe(el));
  } else {
    targets.forEach(el => el.classList.add('in'));
  }

  /* Hero headline: words light up on the beat */
  const words = [...document.querySelectorAll('#heroLyric span')];
  const wordBeats = [1, 3, 6, 7, 9];
  const BEATS = 16;
  /* App window timeline */
  const tl = $('#tlWave');
  const playhead = $('#tlPlayhead');
  const TL_BARS = 64;
  for (let i = 0; i < TL_BARS; i++) {
    const b = document.createElement('i');
    const onBeat = i % 4 === 0;
    const h = onBeat ? 70 + Math.random() * 30 : 18 + Math.random() * 45;
    b.style.height = h + '%';
    if (onBeat) b.className = 'beat';
    tl.appendChild(b);
  }

  if (reduce) {
    words.forEach(w => w.classList.add('lit'));
  } else {
    const start = performance.now();
    const loop = now => {
      const t = (now - start) / 1000;
      const pos = (t / beatLen) % BEATS;
      let current = -1;
      wordBeats.forEach((b, i) => { if (pos >= b) current = i; });
      words.forEach((el, i) => {
        el.classList.toggle('lit', i < current || (i === current && pos - wordBeats[i] > 1.2));
        el.classList.toggle('now', i === current && pos - wordBeats[i] <= 1.2);
      });
      const w = tl.clientWidth;
      playhead.style.transform = `translateX(${(pos / BEATS) * w}px)`;
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  /* CTA background bars */
  const cw = $('#ctaWave');
  for (let i = 0; i < 48; i++) {
    const b = document.createElement('i');
    b.style.animationDelay = `${-Math.random() * 1.5}s`;
    b.style.animationDuration = `${0.7 + Math.random() * 0.9}s`;
    cw.appendChild(b);
  }

  /* Scroll-driven Lyric Sync stage */
  const track = $('.how-track');
  const steps = [...document.querySelectorAll('#steps li')];
  const gGrid = $('#grid'), gInst = $('#instWave'), gVoc = $('#vocWave'), gMark = $('#markers');
  const labelTop = $('#stageLabelTop'), labelBottom = $('#stageLabelBottom');
  const lyricWords = [...document.querySelectorAll('#stageLyric span')];
  const N = 112, X0 = 24, X1 = 576, step = (X1 - X0) / N, barW = step * 0.62;
  const raw = [9, 23, 33, 51, 62, 74, 92];
  const snapped = [7, 21, 28, 49, 56, 70, 91];
  const noise = (i, s) => { const x = Math.sin(i * 12.9898 + s * 78.233) * 43758.5453; return x - Math.floor(x); };
  const xOf = i => X0 + i * step + step / 2;
  const vocAmp = [], instAmp = [];
  for (let i = 0; i < N; i++) {
    let on = -1; snapped.forEach(o => { if (i >= o) on = o; });
    const d = on < 0 ? 99 : i - on;
    vocAmp.push(d < 9 ? (78 * Math.exp(-d / 5) + 14) * (0.75 + 0.35 * noise(i, 1)) : 4 + 6 * noise(i, 2));
    instAmp.push((i % 7 === 0 ? 62 : 22 + 22 * noise(i, 3)) * (0.8 + 0.3 * noise(i, 4)));
  }
  const mk = (g, tag, attrs) => { const el = document.createElementNS(SVGNS, tag); for (const k in attrs) el.setAttribute(k, attrs[k]); g.appendChild(el); return el; };
  const gridLines = [];
  for (let i = 0; i <= N; i += 7) {
    gridLines.push(mk(gGrid, 'line', { x1: X0 + i * step, x2: X0 + i * step, y1: 50, y2: 380, stroke: i % 14 === 0 ? 'rgba(255,255,255,.28)' : 'rgba(255,255,255,.12)', 'stroke-width': 1, opacity: 0 }));
  }
  const instBars = instAmp.map((a, i) => mk(gInst, 'rect', { x: xOf(i) - barW / 2, width: barW, rx: barW / 2, fill: '#B9A6E8' }));
  const vocBars = vocAmp.map((a, i) => mk(gVoc, 'rect', { x: xOf(i) - barW / 2, width: barW, rx: barW / 2, fill: '#B9A6E8' }));
  const markers = raw.map(() => {
    const g = mk(gMark, 'g', {});
    return { g, line: mk(g, 'line', { stroke: '#F0C35A', 'stroke-width': 2 }), dot: mk(g, 'circle', { r: 6, fill: '#F0C35A' }) };
  });
  const ph = mk(gMark, 'line', { y1: 50, y2: 380, stroke: '#fff', 'stroke-width': 2, opacity: 0 });

  function renderStage(p) {
    const s = p * 4;
    const active = clamp(Math.floor(s), 0, 3);
    steps.forEach((li, i) => li.classList.toggle('is-active', i === active));
    const sep = ease(0.7, 1.5, s), markT = ease(1.8, 2.5, s), gridT = ease(2.75, 3.15, s);
    const snap = ease(3.0, 3.45, s), play = ease(3.45, 3.98, s);
    const vC = lerp(215, 145, sep), iC = lerp(215, 320, sep);
    vocBars.forEach((r, i) => {
      const h = Math.max(3, lerp(vocAmp[i] + instAmp[i] * 0.55, vocAmp[i], sep) * lerp(1, 1.15, sep));
      r.setAttribute('y', vC - h / 2); r.setAttribute('height', h);
      r.setAttribute('fill', sep > .5 ? '#FFFFFF' : '#B9A6E8');
    });
    instBars.forEach((r, i) => {
      const h = Math.max(3, instAmp[i] * lerp(1, 0.75, sep));
      r.setAttribute('y', iC - h / 2); r.setAttribute('height', h);
      r.setAttribute('opacity', lerp(0, 0.45, sep));
    });
    labelTop.textContent = sep > .5 ? 'Vocal stem' : 'Full mix';
    labelBottom.setAttribute('opacity', sep);
    gridLines.forEach(l => l.setAttribute('opacity', gridT));
    markers.forEach((m, i) => {
      const t = clamp(markT * 1.6 - i * 0.09, 0, 1);
      const x = xOf(lerp(raw[i], snapped[i], snap)) - step / 2;
      const top = lerp(10, 60, t);
      m.line.setAttribute('x1', x); m.line.setAttribute('x2', x);
      m.line.setAttribute('y1', top); m.line.setAttribute('y2', top + lerp(0, 150, t));
      m.dot.setAttribute('cx', x); m.dot.setAttribute('cy', top);
      m.g.setAttribute('opacity', t);
    });
    const phX = lerp(X0, X1, play);
    ph.setAttribute('x1', phX); ph.setAttribute('x2', phX);
    ph.setAttribute('opacity', play > 0 && play < 1 ? 0.9 : 0);
    let cur = -1;
    snapped.forEach((o, i) => { if (play > 0 && phX >= xOf(o) - step / 2) cur = i; });
    lyricWords.forEach((w, i) => {
      w.classList.toggle('lit', i < cur || play >= 1);
      w.classList.toggle('now', i === cur && play < 1);
    });
  }

  /* Scroll-linked effects */
  const progress = $('#progress');
  const hero = $('.hero');
  const win = $('.window');
  const orbs = document.querySelectorAll('.orb');
  const road = $('#road'), roadFill = $('#roadFill');
  const mobile = () => window.innerWidth <= 960;
  let mx = 0, my = 0;

  function onScroll() {
    const y = window.scrollY, vh = window.innerHeight;
    const docH = document.documentElement.scrollHeight - vh;
    progress.style.transform = `scaleX(${clamp(y / docH, 0, 1)})`;
    header.classList.toggle('is-solid', y > 30 || nav.classList.contains('open'));

    const r = track.getBoundingClientRect();
    renderStage(clamp(-r.top / (track.offsetHeight - vh), 0, 1));

    if (!reduce) {
      const hp = clamp(y / hero.offsetHeight, 0, 1);
      win.style.setProperty('--rx', `${lerp(8, -4, hp) + my * -4}deg`);
      win.style.setProperty('--ry', `${lerp(-10, 6, hp) + mx * 6}deg`);
      orbs[0].style.transform = `translate(${-hp * 120}px, ${hp * 180}px)`;
      orbs[1].style.transform = `translate(${hp * 160}px, ${-hp * 120}px)`;

      const rr = road.getBoundingClientRect();
      const fp = clamp((vh * 0.85 - rr.top) / (rr.height + vh * 0.3), 0, 1);
      roadFill.style.transform = mobile() ? `scaleY(${fp})` : `scaleX(${fp})`;
    } else {
      roadFill.style.transform = 'none';
    }
  }
  let ticking = false;
  const queue = () => { if (!ticking) { ticking = true; requestAnimationFrame(() => { ticking = false; onScroll(); }); } };
  window.addEventListener('scroll', queue, { passive: true });
  window.addEventListener('resize', queue);
  if (!reduce) {
    hero.addEventListener('pointermove', e => {
      const b = hero.getBoundingClientRect();
      mx = (e.clientX - b.left) / b.width - 0.5;
      my = (e.clientY - b.top) / b.height - 0.5;
      queue();
    });
  }
  onScroll();
})();
