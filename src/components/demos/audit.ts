/**
 * Drives every <AuditDemo> (§8 "AuditDemo state machine"): while the
 * Accounting panel is open, `ap` advances every 720ms through 0..14 and wraps;
 * otherwise it resets to 0. Each step marks the visible pieces with [data-on]
 * and sets [data-fail], [data-fixed] and [data-trace] on the demo root
 * (the values follow the reference auditVals()).
 */
import { worlds } from '../worlds/worlds';

const ACCOUNTING = 3;
const STEP_MS = 720;
const STEPS = 15;

/** Which [data-a] keys are visible at step `ap`. */
export function auditState(ap: number) {
  const show = (k: number) => ap >= k && ap <= 13;
  const fail = ap >= 6 && ap < 10;
  const fixed = ap >= 10 && ap <= 13;
  return {
    keys: {
      sys: show(1),
      row0: show(2),
      row1: show(3),
      row2: show(4),
      row3: show(5),
      checking: ap === 5,
      fail,
      fixed,
      finding: ap >= 8 && ap <= 13,
      done: ap >= 11 && ap <= 13,
    } as Record<string, boolean>,
    fail,
    fixed,
    trace: ap >= 7 && ap < 10,
  };
}

function apply(root: HTMLElement, ap: number): void {
  const s = auditState(ap);
  root.dataset.ap = String(ap);
  root.toggleAttribute('data-fail', s.fail);
  root.toggleAttribute('data-fixed', s.fixed);
  root.toggleAttribute('data-trace', s.trace);
  root.querySelectorAll<HTMLElement | SVGElement>('[data-a]').forEach((el) => {
    el.toggleAttribute('data-on', s.keys[el.dataset.a ?? ''] === true);
  });
}

export function initAudits(): void {
  const roots = [...document.querySelectorAll<HTMLElement>('[data-audit]')];
  if (!roots.length) return;
  let ap = 0;
  let timer: ReturnType<typeof setInterval> | undefined;
  const set = (n: number) => {
    ap = n;
    roots.forEach((r) => apply(r, ap));
  };
  set(0);

  worlds.subscribe((s) => {
    const open = s.proj === 'focus' && s.pw === ACCOUNTING;
    if (open && !timer) timer = setInterval(() => set((ap + 1) % STEPS), STEP_MS);
    else if (!open && timer) {
      clearInterval(timer);
      timer = undefined;
      set(0);
    }
  });
}
