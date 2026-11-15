/**
 * The five worlds, in page order (BUILD_PLAN §1, §2.3, §6.7). Design copy for
 * the shell lives here; colors live in src/styles/tokens.css.
 */
export const WORLDS = [
  {
    id: 'software',
    name: 'Software',
    label: 'Software Engineering',
    caption: 'the terminal',
    hint: 'Scroll to travel to the next world',
    hintPhone: 'Swipe up for the next world',
  },
  {
    id: 'ai',
    name: 'AI',
    label: 'Artificial Intelligence',
    caption: 'the network',
    hint: 'Keep scrolling',
    hintPhone: 'Keep scrolling',
  },
  {
    id: 'robotics',
    name: 'Robotics',
    label: 'Robotics',
    caption: 'the field',
    hint: 'Keep scrolling',
    hintPhone: 'Keep scrolling',
  },
  {
    id: 'accounting',
    name: 'Accounting',
    label: 'Accounting and audit',
    caption: 'the ledger',
    hint: 'One more page',
    hintPhone: 'One more page',
  },
  {
    id: 'contact',
    name: 'Contact',
    label: 'Contact',
    caption: 'thanks for reading',
    hint: 'End of volume, so far',
    hintPhone: 'End of volume, so far',
  },
] as const;

export type World = (typeof WORLDS)[number];
export type WorldSlug = World['id'];
/** World index: 0 software, 1 ai, 2 robotics, 3 accounting, 4 contact (§3.4). */
export type WorldId = 0 | 1 | 2 | 3 | 4;

/** Index of the world with this slug (e.g. "contact" → 4), or undefined. */
export function worldIndex(slug: string): WorldId | undefined {
  const i = WORLDS.findIndex((w) => w.id === slug);
  return i >= 0 ? (i as WorldId) : undefined;
}
