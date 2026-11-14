import React, { useEffect, useMemo, useRef, useState } from 'react';
import './ReiPortrait.css';

type Dot = { x: number; y: number; token: number; phase: number; accent: boolean };
type Theme = 'mocha' | 'latte';

// Unicode braille is column-major, with the two bottom dots in bits 6 and 7.
const BRAILLE_DOTS = [[0, 0], [0, 1], [0, 2], [1, 0], [1, 1], [1, 2], [0, 3], [1, 3]];
const LOOP = {
  reveal: 5.4,
  firstHold: 1.4,
  diffuse: 3.6,
  noiseHold: .5,
  denoise: 4.2,
  restoredHold: 2,
  fade: 1.5,
  blank: .4,
};
const LOOP_DURATION = Object.values(LOOP).reduce((sum, duration) => sum + duration, 0);
const PLAYBACK_RATE = .85;
// Increasing Gaussian increments erase local detail before the whole silhouette.
const NOISE_SCALES = [.015, .04, .09, .2, .45];
const DIFFUSION_STEPS = NOISE_SCALES.length;
const smoothstep = (value: number) => {
  const t = Math.max(0, Math.min(1, value));
  return t * t * (3 - 2 * t);
};

// Reflecting boundaries keep Brownian motion in frame; its limiting spatial
// distribution is uniform, without clamping particles into piles at the edges.
function reflect(position: number, extent: number) {
  const wrapped = ((position % (extent * 2)) + extent * 2) % (extent * 2);
  return wrapped <= extent ? wrapped : extent * 2 - wrapped;
}

// Each diffusion step settles briefly before moving to the next noise level.
function steppedNoise(progress: number) {
  const step = Math.max(0, Math.min(1, progress)) * DIFFUSION_STEPS;
  return (Math.floor(step) + smoothstep((step % 1) / .8)) / DIFFUSION_STEPS;
}

function loopFrame(time: number) {
  let t = time % LOOP_DURATION;
  if (t < LOOP.reveal) return { reveal: t / LOOP.reveal, noise: 0, opacity: 1 };
  t -= LOOP.reveal + LOOP.firstHold;
  if (t < 0) return { reveal: 1, noise: 0, opacity: 1 };
  if (t < LOOP.diffuse) return { reveal: 1, noise: steppedNoise(t / LOOP.diffuse), opacity: 1 };
  t -= LOOP.diffuse + LOOP.noiseHold;
  if (t < 0) return { reveal: 1, noise: 1, opacity: 1 };
  if (t < LOOP.denoise) return { reveal: 1, noise: 1 - steppedNoise(t / LOOP.denoise), opacity: 1 };
  t -= LOOP.denoise + LOOP.restoredHold;
  if (t < 0) return { reveal: 1, noise: 0, opacity: 1 };
  return { reveal: 1, noise: 0, opacity: 1 - smoothstep(t / LOOP.fade) };
}

function decodePortrait(ascii: string) {
  const lines = ascii.replace(/^\n+|\n+$/g, '').split('\n');
  const columns = Math.max(1, ...lines.map(line => Array.from(line).length));
  const points: Dot[] = [];
  let tokens = 0;
  lines.forEach((line, row) => {
    Array.from(line).forEach((character, column) => {
      const mask = character.codePointAt(0)! - 0x2800;
      if (mask <= 0 || mask > 255) return;
      const token = tokens++;
      BRAILLE_DOTS.forEach(([x, y], bit) => {
        if (!(mask & (1 << bit))) return;
        points.push({
          x: column * 3 + x + .85,
          y: row * 5.1 + y + 1.05,
          token,
          phase: (column * 1.37 + row * 2.11 + bit * .73) % (Math.PI * 2),
          accent: (column * 7 + row * 3 + bit) % 29 === 0,
        });
      });
    });
  });
  return { points, tokens, columns, width: columns * 3, height: Math.max(1, lines.length) * 5.1 };
}

const preferenceIsStill = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export function ReiPortrait({ ascii, theme = 'mocha' }: { ascii: string; theme?: Theme }) {
  const geometry = useMemo(() => decodePortrait(ascii), [ascii]);
  const frameRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wakeRef = useRef<(() => void) | null>(null);
  const phaseRef = useRef(0);
  const [ready, setReady] = useState(false);
  const [paused, setPaused] = useState(preferenceIsStill);
  const pausedRef = useRef(paused);

  useEffect(() => {
    pausedRef.current = paused;
    wakeRef.current?.();
  }, [paused]);

  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onPreference = () => setPaused(preference.matches);
    preference.addEventListener('change', onPreference);
    return () => preference.removeEventListener('change', onPreference);
  }, []);

  useEffect(() => {
    const frame = frameRef.current;
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (!frame || !canvas || !context || !geometry.points.length) { setReady(false); return; }

    // Explicit palettes avoid reading a previous theme before the parent effect
    // updates the document class.
    const blue = theme === 'mocha' ? '#89b4fa' : '#1e66f5';
    const lavender = theme === 'mocha' ? '#b4befe' : '#7287fd';
    const pointCount = geometry.points.length;
    const offsetX = new Float32Array(pointCount);
    const offsetY = new Float32Array(pointCount);
    const velocityX = new Float32Array(pointCount);
    const velocityY = new Float32Array(pointCount);
    const stepX = new Float32Array(pointCount * DIFFUSION_STEPS);
    const stepY = new Float32Array(pointCount * DIFFUSION_STEPS);
    const noiseX = new Float32Array(pointCount * DIFFUSION_STEPS);
    const noiseY = new Float32Array(pointCount * DIFFUSION_STEPS);
    let noiseCycle = -1;
    let pointer: { x: number; y: number } | null = null;
    let width = 0;
    let height = 0;
    let scale = 1;
    let raf = 0;
    let lastTime = 0;
    let visible = false;
    let disposed = false;

    const draw = (advance: boolean) => {
      if (!width || !height || disposed) return;
      context.clearRect(0, 0, width, height);
      const still = pausedRef.current;
      const time = still ? 0 : phaseRef.current;
      const state = still ? { reveal: 1, noise: 0, opacity: 1 } : loopFrame(time);
      const cycle = Math.floor(time / LOOP_DURATION);
      if (!still && cycle !== noiseCycle) {
        // Each forward step adds fresh Gaussian noise to the previous state.
        // Retain the trajectory so the reverse pass progressively restores detail.
        geometry.points.forEach((dot, i) => {
          let x = dot.x;
          let y = dot.y;
          NOISE_SCALES.forEach((sigma, step) => {
            const index = step * pointCount + i;
            const radius = Math.sqrt(-2 * Math.log(1 - Math.random()));
            const angle = Math.random() * Math.PI * 2;
            stepX[index] = x;
            stepY[index] = y;
            noiseX[index] = Math.cos(angle) * radius * geometry.width * sigma;
            noiseY[index] = Math.sin(angle) * radius * geometry.height * sigma;
            x = reflect(x + noiseX[index], geometry.width);
            y = reflect(y + noiseY[index], geometry.height);
          });
        });
        noiseCycle = cycle;
      }
      const noiseLevel = state.noise * DIFFUSION_STEPS;
      const noiseStep = Math.min(DIFFUSION_STEPS - 1, Math.floor(noiseLevel));
      const stepProgress = noiseLevel - noiseStep;
      const revealedTokens = state.reveal * geometry.tokens;
      // A few shared opacity buckets keep thousands of particles inexpensive.
      const paths = Array.from({ length: 16 }, () => [new Path2D(), new Path2D()]);
      geometry.points.forEach((dot, i) => {
        // All dots in a braille character arrive together, in reading order.
        if (dot.token >= revealedTokens || state.opacity <= 0) return;
        if (advance) {
          let targetX = 0;
          let targetY = 0;
          if (pointer && state.noise === 0 && state.reveal === 1) {
            const dx = dot.x - pointer.x;
            const dy = dot.y - pointer.y;
            const distance = Math.hypot(dx, dy);
            if (distance > .01 && distance < 15) {
              const force = Math.pow(1 - distance / 15, 2) * 1.7;
              targetX = dx / distance * force;
              targetY = dy / distance * force;
            }
          }
          velocityX[i] = (velocityX[i] + (targetX - offsetX[i]) * .11) * .7;
          velocityY[i] = (velocityY[i] + (targetY - offsetY[i]) * .11) * .7;
          offsetX[i] += velocityX[i];
          offsetY[i] += velocityY[i];
        }
        const wave = (Math.sin(time * .65 + dot.x * .045 + dot.y * .022) + 1) * .5;
        const glint = (Math.sin(time * .9 + dot.phase) + 1) * .5;
        const arrival = state.reveal === 1 ? 1 : smoothstep((revealedTokens - dot.token) / 5);
        const opacity = (.60 + wave * .20 + glint * .12) * arrival * (1 - state.noise * .28);
        const bucket = Math.min(15, Math.max(0, Math.floor(opacity * 16)));
        const radius = Math.max(.38, scale * (.28 + wave * .03));
        const index = noiseStep * pointCount + i;
        const x = (state.noise === 0
          ? dot.x + (still ? 0 : offsetX[i])
          : reflect(stepX[index] + noiseX[index] * stepProgress, geometry.width)) * scale;
        const y = (state.noise === 0
          ? dot.y + (still ? 0 : offsetY[i])
          : reflect(stepY[index] + noiseY[index] * stepProgress, geometry.height)) * scale;
        paths[bucket][dot.accent ? 1 : 0].moveTo(x + radius, y);
        paths[bucket][dot.accent ? 1 : 0].arc(x, y, radius, 0, Math.PI * 2);
      });
      paths.forEach((colors, i) => {
        context.globalAlpha = (i + .5) / 16 * state.opacity;
        context.fillStyle = blue;
        context.fill(colors[0]);
        context.fillStyle = lavender;
        context.fill(colors[1]);
      });
      context.globalAlpha = 1;
    };

    const canAnimate = () => !disposed && !pausedRef.current && visible && !document.hidden;
    const tick = (time: number) => {
      raf = 0;
      if (!canAnimate()) { lastTime = 0; return; }
      if (!lastTime || time - lastTime >= 1000 / 24) {
        const elapsed = lastTime ? Math.min(80, time - lastTime) : 0;
        phaseRef.current += elapsed / 1000 * PLAYBACK_RATE;
        draw(true);
        lastTime = time;
      }
      raf = requestAnimationFrame(tick);
    };
    const wake = () => {
      if (canAnimate()) {
        if (!raf) { lastTime = 0; raf = requestAnimationFrame(tick); }
      } else {
        cancelAnimationFrame(raf);
        raf = 0;
        lastTime = 0;
        if (pausedRef.current) draw(false);
      }
    };
    wakeRef.current = wake;
    const resize = () => {
      const bounds = frame.getBoundingClientRect();
      width = bounds.width;
      height = bounds.height;
      scale = width / geometry.width;
      // Supersample this small canvas at 2× so subpixel dots stay legible
      // even on a 1× display; never allocate a larger backing buffer.
      const dpr = 2;
      canvas.width = Math.max(1, Math.round(width * dpr));
      canvas.height = Math.max(1, Math.round(height * dpr));
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      draw(false);
      wake();
    };
    const onPointerMove = (event: PointerEvent) => {
      if (event.pointerType === 'touch' || pausedRef.current) return;
      const bounds = frame.getBoundingClientRect();
      pointer = { x: (event.clientX - bounds.left) / scale, y: (event.clientY - bounds.top) / scale };
    };
    const onPointerLeave = () => { pointer = null; };
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(frame);
    const intersectionObserver = new IntersectionObserver(entries => {
      visible = entries[0]?.isIntersecting ?? false;
      wake();
    });
    intersectionObserver.observe(frame);
    frame.addEventListener('pointermove', onPointerMove);
    frame.addEventListener('pointerleave', onPointerLeave);
    document.addEventListener('visibilitychange', wake);
    resize();
    setReady(true);

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      frame.removeEventListener('pointermove', onPointerMove);
      frame.removeEventListener('pointerleave', onPointerLeave);
      document.removeEventListener('visibilitychange', wake);
      wakeRef.current = null;
    };
  }, [geometry, theme]);

  return <div
    ref={frameRef}
    className="rei-portrait"
    style={{ aspectRatio: `${geometry.width} / ${geometry.height}`, '--rei-columns': geometry.columns } as React.CSSProperties}
  >
    <canvas ref={canvasRef} className="rei-particles" role="img" aria-label="Rei Ayanami, an ASCII portrait that forms character by character, diffuses into particles, and reforms" aria-hidden={!ready} />
    <pre className="rei-ascii-fallback" hidden={ready} role="img" aria-label="Rei Ayanami in the original ASCII portrait">{ascii}</pre>

  </div>;
}
