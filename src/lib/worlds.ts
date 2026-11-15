/**
 * The five worlds (BUILD_PLAN §1, §2.3, §6.7). Design copy for the shell lives
 * here; colors live in src/styles/tokens.css.
 *
 * The array index is the world's id (§3.4). The order on the page is random
 * per visit (Contact always last, see Worlds.astro), so nothing here implies
 * a position.
 */
export const WORLDS = [
  {
    id: 'software',
    name: 'Software',
    label: 'Software Engineering',
    caption: 'the terminal',
  },
  {
    id: 'ai',
    name: 'AI',
    label: 'Artificial Intelligence',
    caption: 'the network',
  },
  {
    id: 'robotics',
    name: 'Robotics',
    label: 'Robotics',
    caption: 'the field',
  },
  {
    id: 'accounting',
    name: 'Accounting',
    label: 'Accounting and audit',
    caption: 'the ledger',
  },
  {
    id: 'contact',
    name: 'Contact',
    label: 'Contact',
    caption: 'thanks for reading',
  },
] as const;

/**
 * Footer hints (§6.7) belong to a position on the page, not to a world:
 * whichever world comes first says "Scroll to travel…", the fourth says
 * "One more page", and Contact (always last) closes the volume.
 */
export const HINTS = [
  { desktop: 'Scroll to travel to the next world', phone: 'Swipe up for the next world' },
  { desktop: 'Keep scrolling', phone: 'Keep scrolling' },
  { desktop: 'Keep scrolling', phone: 'Keep scrolling' },
  { desktop: 'One more page', phone: 'One more page' },
  { desktop: 'End of volume, so far', phone: 'End of volume, so far' },
] as const;

/** Key for the per-visit world order in sessionStorage. */
export const ORDER_KEY = 'world-order';

export type World = (typeof WORLDS)[number];
export type WorldSlug = World['id'];
/** World index: 0 software, 1 ai, 2 robotics, 3 accounting, 4 contact (§3.4). */
export type WorldId = 0 | 1 | 2 | 3 | 4;

/** Index of the world with this slug (e.g. "contact" → 4), or undefined. */
export function worldIndex(slug: string): WorldId | undefined {
  const i = WORLDS.findIndex((w) => w.id === slug);
  return i >= 0 ? (i as WorldId) : undefined;
}
