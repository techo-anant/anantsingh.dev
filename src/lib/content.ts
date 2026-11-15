/**
 * Typed, sorted access to the content collections, plus the cross-entry
 * rules a per-entry schema cannot express. Any violation throws, which fails
 * the build for every page that reads the collection.
 */
import { getCollection, type CollectionEntry } from 'astro:content';

export type Role = CollectionEntry<'roles'>['data'];
export type Project = CollectionEntry<'projects'>['data'];
export type Paper = CollectionEntry<'papers'>['data'];
export type Research = CollectionEntry<'research'>['data'];
export type LedgerEntry = CollectionEntry<'ledger'>['data'];
export type Credential = CollectionEntry<'credentials'>['data'];
export type Site = CollectionEntry<'site'>['data'];

const byOrder = <T extends { order: number }>(a: T, b: T) => a.order - b.order;

async function sorted<C extends 'roles' | 'papers' | 'ledger' | 'credentials'>(collection: C) {
  const entries = await getCollection(collection);
  const data = entries.map((e) => e.data as CollectionEntry<C>['data']);
  assertUniqueOrder(collection, data);
  return data.sort(byOrder);
}

function assertUniqueOrder(collection: string, data: { order: number }[]) {
  const seen = new Set<number>();
  for (const { order } of data) {
    if (seen.has(order)) throw new Error(`[content] ${collection}: duplicate order ${order}`);
    seen.add(order);
  }
}

export const getRoles = () => sorted('roles');
export const getPapers = () => sorted('papers');
export const getLedger = () => sorted('ledger');
export const getCredentials = () => sorted('credentials');

/** The three gallery projects of a world, in slot order (exactly 0, 1, 2). */
export async function getProjects(world: Project['world']): Promise<[Project, Project, Project]> {
  const projects = (await getCollection('projects'))
    .map((e) => e.data)
    .filter((p) => p.world === world)
    .sort((a, b) => a.slot - b.slot);
  const slots = projects.map((p) => p.slot).join(',');
  if (slots !== '0,1,2') {
    throw new Error(
      `[content] projects: the ${world} gallery needs exactly one project in each slot 0, 1, 2 (found: ${slots || 'none'}). A fourth project needs a design change (BUILD_PLAN §11.2).`,
    );
  }
  return projects as [Project, Project, Project];
}

async function single<C extends 'research' | 'site'>(collection: C) {
  const entries = await getCollection(collection);
  const [entry] = entries;
  if (!entry || entries.length !== 1) {
    throw new Error(`[content] ${collection}: expected exactly one entry, found ${entries.length}`);
  }
  return entry.data as CollectionEntry<C>['data'];
}

/** The Robotics role block (one entry). */
export const getResearch = () => single('research');
/** Contact details, links, blurb and cover lines (one entry). */
export const getSite = () => single('site');
