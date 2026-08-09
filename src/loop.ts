export type FixedStepFn = (dt: number) => void;
export type FrameFn = (alpha: number, dtReal: number) => void;

/** Fixed timestep simulation with render every animation frame. */
export function startLoop(step: FixedStepFn, render: FrameFn, hz = 60): () => void {
  const stepDt = 1 / hz;
  let acc = 0;
  let last = performance.now();
  let raf = 0;
  let alive = true;

  const tick = (now: number) => {
    if (!alive) return;
    const real = Math.min(0.1, (now - last) / 1000);
    last = now;
    acc += real;
    while (acc >= stepDt) {
      step(stepDt);
      acc -= stepDt;
    }
    render(acc / stepDt, real);
    raf = requestAnimationFrame(tick);
  };

  raf = requestAnimationFrame(tick);
  return () => {
    alive = false;
    cancelAnimationFrame(raf);
  };
}
