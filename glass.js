/* Liquid glass, ported from HiveLab.
 * The refraction map is the inset SDF fragment from xiaofangstudio/liquid-glass-web,
 * based on Shu Ding's liquid-glass (MIT). See THIRD_PARTY_NOTICES.md. */
(() => {
  'use strict';

  const root = document.documentElement;
  const OPTICS = {
    sdfWidth: 0.3, sdfHeight: 0.2, radius: 0.6, threshold: 0.15, falloff: 0.8,
    normalization: 0.5, lensSpan: 320, refraction: 0.9,
  };
  const SPRING = { scaleX: 1.05, scaleY: 0.93, stretchMax: 0.14, distance: 900, translate: 26, yRatio: 0.75, duration: 500, damping: 4, frequency: 9, gain: 0.8 };
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const plainGlass = matchMedia('(prefers-reduced-transparency: reduce), (prefers-contrast: more)');

  const smoothStep = (a, b, t) => {
    const x = Math.max(0, Math.min(1, (t - a) / (b - a)));
    return x * x * (3 - 2 * x);
  };
  // A long surface keeps the lens at its rim and stays flat in between, so only the edge bends.
  const lensReach = (size) => Math.min(size, OPTICS.lensSpan);
  const inLens = (at, size) => {
    const c = (at - 0.5) * size;
    return Math.sign(c) * Math.max(0, Math.abs(c) - (size - lensReach(size)) / 2) / lensReach(size);
  };

  function buildMap(width, height) {
    const factor = Math.min(1, 768 / Math.max(width, height));
    const w = Math.max(1, Math.round(width * factor));
    const h = Math.max(1, Math.round(height * factor));
    const pixels = new Uint8ClampedArray(w * h * 4);
    const raw = new Float32Array(w * h * 2);
    let maximum = 0;
    for (let y = 0; y < h; y += 1) {
      for (let x = 0; x < w; x += 1) {
        const ix = inLens(x / w, width);
        const iy = inLens(y / h, height);
        const qx = Math.abs(ix) - OPTICS.sdfWidth + OPTICS.radius;
        const qy = Math.abs(iy) - OPTICS.sdfHeight + OPTICS.radius;
        const distance = Math.min(Math.max(qx, qy), 0) + Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) - OPTICS.radius;
        const amount = smoothStep(OPTICS.falloff, 0, distance - OPTICS.threshold);
        const s = smoothStep(0, 1, amount);
        const i = (y * w + x) * 2;
        raw[i] = ix * (s - 1) * lensReach(width);
        raw[i + 1] = iy * (s - 1) * lensReach(height);
        maximum = Math.max(maximum, Math.abs(raw[i]), Math.abs(raw[i + 1]));
      }
    }
    maximum = Math.max(0.001, maximum * OPTICS.normalization);
    for (let i = 0, j = 0; i < pixels.length; i += 4, j += 2) {
      pixels[i] = (raw[j] / maximum + 0.5) * 255;
      pixels[i + 1] = (raw[j + 1] / maximum + 0.5) * 255;
      pixels[i + 3] = 255;
    }
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    canvas.getContext('2d').putImageData(new ImageData(pixels, w, h), 0, 0);
    return { href: canvas.toDataURL(), scale: maximum };
  }

  const maps = new Map();
  function mapFor(width, height) {
    const key = `${width}:${height}`;
    if (!maps.has(key)) maps.set(key, buildMap(width, height));
    return maps.get(key);
  }

  function installRefraction() {
    if (plainGlass.matches || !CSS.supports('backdrop-filter', 'url("#glass")')) return;
    const ns = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('width', '0');
    svg.setAttribute('height', '0');
    svg.setAttribute('aria-hidden', 'true');
    svg.style.position = 'fixed';
    const defs = document.createElementNS(ns, 'defs');
    svg.append(defs);
    document.body.append(svg);
    const make = (tag, attributes) => {
      const node = document.createElementNS(ns, tag);
      Object.entries(attributes).forEach(([key, value]) => node.setAttribute(key, value));
      return node;
    };

    const entries = new Map();
    function fit(node) {
      const entry = entries.get(node);
      const width = Math.max(4, Math.round(node.offsetWidth / 4) * 4);
      const height = Math.max(4, Math.round(node.offsetHeight / 4) * 4);
      const size = `${width}:${height}`;
      if (!entry || entry.size === size) return;
      entry.size = size;
      const map = mapFor(width, height);
      // The map is sized in pixels; a percentage would resolve against the empty svg.
      entry.image.setAttribute('width', String(node.offsetWidth));
      entry.image.setAttribute('height', String(node.offsetHeight));
      entry.image.setAttribute('href', map.href);
      entry.displace.setAttribute('scale', String(map.scale * OPTICS.refraction));
    }

    const observer = new ResizeObserver((changes) => changes.forEach((change) => fit(change.target)));
    document.querySelectorAll('.glass').forEach((node, index) => {
      const id = `liquid-glass-${index}`;
      const filter = make('filter', { id, 'color-interpolation-filters': 'sRGB', x: '0%', y: '0%', width: '100%', height: '100%' });
      const image = make('feImage', { x: '0', y: '0', preserveAspectRatio: 'none', result: 'map' });
      const displace = make('feDisplacementMap', { in: 'SourceGraphic', in2: 'map', scale: '0', xChannelSelector: 'R', yChannelSelector: 'G' });
      filter.append(image, displace);
      defs.append(filter);
      entries.set(node, { image, displace, size: '' });
      fit(node);
      node.style.setProperty('--refraction', `url("#${id}")`);
      observer.observe(node);
    });
    root.dataset.liquid = 'true';
  }

  // A soft highlight follows the pointer across a pane.
  function installSheen() {
    if (!matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    let lit = null;
    document.addEventListener('pointermove', (event) => {
      const pane = event.target.closest?.('.glass');
      if (lit && lit !== pane) delete lit.dataset.lit;
      lit = pane;
      if (!pane) return;
      const box = pane.getBoundingClientRect();
      pane.style.setProperty('--mx', `${event.clientX - box.left}px`);
      pane.style.setProperty('--my', `${event.clientY - box.top}px`);
      pane.dataset.lit = '';
    }, { passive: true });
    document.addEventListener('pointerleave', () => {
      if (lit) delete lit.dataset.lit;
      lit = null;
    });
  }

  // Buttons squash toward the pointer while pressed and spring back on release.
  function installPress() {
    let press = null;
    let frame = 0;
    const PRESSABLE = '.button, .chip, .segmented button';

    function paint(point) {
      if (!press) return;
      const dx = point.x - press.x;
      const dy = point.y - press.y;
      const distance = Math.hypot(dx, dy);
      const ux = distance ? dx / distance : 0;
      const uy = distance ? dy / distance : 0;
      const k = Math.min(SPRING.stretchMax, distance / SPRING.distance);
      press.sx = (SPRING.scaleX * (1 + k) - 1) * SPRING.gain;
      press.sy = (SPRING.scaleY * (1 + k * SPRING.yRatio) - 1) * SPRING.gain;
      press.tx = ux * k * SPRING.translate * SPRING.gain;
      press.ty = uy * k * SPRING.translate * SPRING.gain;
      press.node.style.transformOrigin = `${50 - ux * 30}% ${50 - uy * 30}%`;
      press.node.style.transform = `translate(${press.tx}px, ${press.ty}px) scale(${1 + press.sx}, ${1 + press.sy})`;
    }

    function release() {
      const current = press;
      press = null;
      if (!current) return;
      const start = performance.now();
      const spring = (now) => {
        const t = Math.min(1, (now - start) / SPRING.duration);
        const decay = Math.exp(-SPRING.damping * t) * Math.cos(SPRING.frequency * t) * 1.2;
        if (t < 1 && current.node.isConnected) {
          current.node.style.transform = `translate(${current.tx * decay}px, ${current.ty * decay}px) scale(${1 + current.sx * decay}, ${1 + current.sy * decay})`;
          requestAnimationFrame(spring);
        } else {
          current.node.style.transform = '';
          current.node.style.transformOrigin = '';
        }
      };
      requestAnimationFrame(spring);
    }

    document.addEventListener('pointerdown', (event) => {
      if (event.button !== 0 || reduceMotion.matches) return;
      const node = event.target.closest?.(PRESSABLE);
      if (!node) return;
      press = { node, pointer: event.pointerId, x: event.clientX, y: event.clientY, sx: 0, sy: 0, tx: 0, ty: 0 };
      paint({ x: event.clientX, y: event.clientY });
    });
    document.addEventListener('pointermove', (event) => {
      if (press?.pointer !== event.pointerId) return;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => paint({ x: event.clientX, y: event.clientY }));
    }, { passive: true });
    window.addEventListener('pointerup', release);
    window.addEventListener('pointercancel', release);
    window.addEventListener('blur', release);
  }

  installRefraction();
  installSheen();
  installPress();
})();
