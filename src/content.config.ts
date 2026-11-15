/**
 * Content collections (BUILD_PLAN §11). One YAML file per entry under
 * src/content/<collection>/; the file name is the entry id.
 *
 * Every schema is strict: a missing field, a wrong type or an unknown
 * (e.g. misspelled) field fails `astro sync` / `astro build`.
 *
 * Design copy (headlines, eyebrows, hints, captions) is NOT here; it lives
 * in the components (§11.1).
 */
import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const entries = (collection: string) =>
  glob({ pattern: '**/*.{yaml,yml}', base: `./src/content/${collection}` });

const text = z.string().trim().min(1);
const order = z.number().int().positive();
/** Software world: the role timeline (§7.1). Only title and org are shown;
 * period and detail are stored for later use. */
const roles = defineCollection({
  loader: entries('roles'),
  schema: z.strictObject({
    title: text,
    org: text,
    period: text.optional(),
    detail: text.optional(),
    current: z.boolean().default(false),
    order,
  }),
});

/**
 * Gallery projects for the Software and AI worlds (§7.1, §7.2). Each world has
 * exactly three slots because the particle gallery shapes have three icons; a
 * fourth project needs a design change (§11.2). `slot` is also the order.
 * A project without `href` (e.g. private work) renders no link pill.
 */
const projects = defineCollection({
  loader: entries('projects'),
  schema: z
    .strictObject({
      world: z.enum(['software', 'ai']),
      slot: z.union([z.literal(0), z.literal(1), z.literal(2)]),
      name: text,
      /** Small mono line above the project line, e.g. "solo · railway". */
      meta: text.optional(),
      line: text,
      cta: text.optional(),
      href: z.url().optional(),
      demo: z.enum([
        'ShortsDemo',
        'FiscaleDemo',
        'ApiDemo',
        'DanceDemo',
        'ModelsDemo',
        'LearningDemo',
      ]),
    })
    .refine((p) => (p.cta === undefined) === (p.href === undefined), {
      message: 'cta and href go together: give both (link pill) or neither (no link)',
    }),
});

/** AI world: the paper card (§7.2). */
const papers = defineCollection({
  loader: entries('papers'),
  schema: z.strictObject({
    badge: text,
    title: text,
    subtitle: text,
    authors: z.array(text).min(1),
    href: z.url(),
    pdf: z.url().optional(),
    order,
  }),
});

/** Robotics world: the role only. The research itself stays private (§1). */
const research = defineCollection({
  loader: entries('research'),
  schema: z.strictObject({
    title: text,
    org: text,
    period: text,
    supervisor: text,
    tags: z.array(text).min(1),
    private: z.literal(true),
  }),
});

/** Accounting world: the ledger, newest first (§7.4). */
const ledger = defineCollection({
  loader: entries('ledger'),
  schema: z.strictObject({
    period: text,
    title: text,
    org: text,
    status: z.enum(['upcoming', 'ongoing', 'completed']),
    order,
  }),
});

/** Accounting world: the chips under the ledger (§7.4). */
const credentials = defineCollection({
  loader: entries('credentials'),
  schema: z.strictObject({
    label: text,
    order,
  }),
});

/** Site-wide details: contact, links, the Contact blurb and the cover lines (§5.3, §7.5). */
const site = defineCollection({
  loader: entries('site'),
  schema: z.strictObject({
    email: z.email(),
    linkedin: z.url(),
    github: z.url(),
    scholar: z.url().optional(),
    resume: z.url().optional(),
    blurb: text,
    /** Handwritten cover lines; words wrapped in ~tildes~ get struck through. */
    coverFragments: z.array(text).min(1),
  }),
});

export const collections = { roles, projects, papers, research, ledger, credentials, site };
