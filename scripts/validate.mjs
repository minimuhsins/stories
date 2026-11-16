#!/usr/bin/env node
// Checks stories.json before it is published. The app also checks it, but a bad
// file should never reach children's phones, so GitHub refuses to publish if this fails.
// Usage: node scripts/validate.mjs [path-to-stories.json]
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const file = process.argv[2] ?? join(root, 'stories.json');
const allowed = JSON.parse(readFileSync(join(root, 'allowed.json'), 'utf8'));
const SERIES = new Set(allowed.series.map((s) => s.slug));
const VALUES = new Set(allowed.values);

const errors = [];
const warnings = [];
const err = (m) => errors.push(m);
const warn = (m) => warnings.push(m);
const isStr = (v, min = 1) => typeof v === 'string' && v.trim().length >= min;
const YT_ID = /^[A-Za-z0-9_-]{11}$/;
// A release time must include its time zone, e.g. 2026-12-01T17:00:00+13:00
const ISO_TZ = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?(Z|[+-]\d{2}:\d{2})$/;

let data;
try {
  data = JSON.parse(readFileSync(file, 'utf8'));
} catch (e) {
  console.error(`✗ ${file} is not valid JSON: ${e.message}`);
  process.exit(1);
}

if (data.schema !== 1) err('"schema" must be 1');
if (!/^\d{4}-\d{2}-\d{2}$/.test(data.updated ?? '')) err('"updated" must be a date like 2026-11-16');
if (!Array.isArray(data.episodes) || data.episodes.length < 10) err('"episodes" must be a list with all episodes (at least 10)');
const eps = Array.isArray(data.episodes) ? data.episodes : [];
const ids = new Set();
const epNums = new Set();

eps.forEach((e, i) => {
  const at = `episode ${i + 1}${e && e.title ? ` ("${e.title}")` : ''}`;
  if (!e || typeof e !== 'object') return err(`${at}: not an object`);
  if (!YT_ID.test(e.id ?? '')) err(`${at}: "id" must be the 11-character YouTube video ID, got "${e.id}"`);
  if (ids.has(e.id)) err(`${at}: id ${e.id} is listed twice`);
  ids.add(e.id);
  if (!SERIES.has(e.series)) err(`${at}: series "${e.series}" isn't in allowed.json (a new series needs an app update)`);
  if (!Number.isInteger(e.ep) || e.ep < 1) err(`${at}: "ep" must be a whole number from 1`);
  const key = `${e.series}#${e.ep}`;
  if (epNums.has(key)) err(`${at}: ${e.series} already has an episode ${e.ep}`);
  epNums.add(key);
  if (!isStr(e.title, 2) || e.title.length > 80) err(`${at}: "title" must be 2–80 characters`);
  if (!isStr(e.summary, 20) || e.summary.length > 400) err(`${at}: "summary" must be 20–400 characters`);
  if (!Array.isArray(e.values) || e.values.length < 1 || e.values.length > 4) err(`${at}: "values" must list 1–4 values`);
  else for (const v of e.values) if (!VALUES.has(v)) err(`${at}: value "${v}" isn't in allowed.json`);
  const g = e.guide;
  if (!g || typeof g !== 'object') err(`${at}: "guide" is missing`);
  else {
    if (g.before !== undefined && !isStr(g.before)) err(`${at}: guide.before must be text`);
    if (!Array.isArray(g.talk) || g.talk.length < 2 || g.talk.length > 5 || !g.talk.every((t) => isStr(t))) err(`${at}: guide.talk must have 2–5 questions`);
    if (!g.activity || !isStr(g.activity.title) || !isStr(g.activity.text, 10)) err(`${at}: guide.activity needs a title and text`);
    if (!isStr(g.remember)) err(`${at}: guide.remember is missing`);
  }
  if (e.release !== undefined) {
    if (!ISO_TZ.test(e.release) || isNaN(new Date(e.release).getTime())) err(`${at}: "release" must look like 2026-12-01T17:00:00+13:00`);
  }
  if (e.review !== undefined && typeof e.review !== 'boolean') err(`${at}: "review" must be true or false`);
  const known = new Set(['id', 'series', 'ep', 'title', 'summary', 'values', 'guide', 'release', 'review', 'thumb']);
  for (const k of Object.keys(e)) if (!known.has(k)) warn(`${at}: unknown field "${k}" will be ignored by the app`);
});

// Series: which ones the app shows, in this order
const hidden = new Set();
if (!Array.isArray(data.series)) err('"series" must list every series with "show": true or false');
else {
  const listed = new Set();
  for (const s of data.series) {
    if (!SERIES.has(s?.slug)) { err(`"series" has unknown slug "${s?.slug}" (a new series needs an app update)`); continue; }
    if (listed.has(s.slug)) err(`"series" lists ${s.slug} twice`);
    listed.add(s.slug);
    if (typeof s.show !== 'boolean') err(`"series" ${s.slug}: "show" must be true or false`);
    if (s.show === false) hidden.add(s.slug);
  }
  for (const slug of SERIES) if (!listed.has(slug)) err(`"series" is missing ${slug}; add it with "show": true or false`);
  if (listed.size && hidden.size === listed.size) err('"series" must show at least one series');
}
const visible = (id) => { const e = eps.find((x) => x.id === id); return e && !hidden.has(e.series); };
const checkIds = (where, v, { min = 0, max = 30, mustShow = true } = {}) => {
  if (!Array.isArray(v)) return err(`${where} must be a list of episode ids`);
  if (v.length < min || v.length > max) err(`${where} must have ${min}–${max} episodes`);
  if (new Set(v).size !== v.length) err(`${where} has the same id twice`);
  for (const id of v) {
    if (!ids.has(id)) err(`${where} mentions ${id}, which isn't in "episodes"`);
    else if (mustShow && !visible(id)) err(`${where} mentions ${id}, which is in a hidden series`);
  }
};

// Layout: Home heading, Home sections and Search
const SECTION_TYPES = ['series', 'latest', 'watchNext', 'values', 'list'];
const L = data.layout;
if (!L || typeof L !== 'object') err('"layout" is missing');
else {
  if (!isStr(L.heading) || L.heading.length > 40) err('layout.heading must be 1–40 characters');
  if (!Array.isArray(L.sections) || !L.sections.length || L.sections.length > 12) err('layout.sections must have 1–12 sections');
  else L.sections.forEach((s, i) => {
    const at = `layout.sections[${i + 1}]${s?.title ? ` ("${s.title}")` : ''}`;
    if (!SECTION_TYPES.includes(s?.type)) return err(`${at}: "type" must be one of ${SECTION_TYPES.join(', ')}`);
    if (s.title !== undefined && (!isStr(s.title) || s.title.length > 40)) err(`${at}: "title" must be 1–40 characters`);
    if (s.type === 'list' && !isStr(s.title)) err(`${at}: a "list" section needs a title`);
    if (s.show !== undefined && typeof s.show !== 'boolean') err(`${at}: "show" must be true or false`);
    if (s.type === 'latest' && s.count !== undefined && (!Number.isInteger(s.count) || s.count < 1 || s.count > 20)) err(`${at}: "count" must be 1–20`);
    if (s.type === 'values') {
      if (!Array.isArray(s.values) || !s.values.length || s.values.length > 16) err(`${at}: "values" must list 1–16 values`);
      else for (const v of s.values) if (!VALUES.has(v)) err(`${at}: value "${v}" isn't in allowed.json`);
    }
    if (s.type === 'list') checkIds(at + ' stories', s.stories, { min: 1, max: 20 });
  });
  checkIds('layout.popular', L.popular, { max: 10 });
  if (!Array.isArray(L.searchValues)) err('layout.searchValues must be a list ([] shows every value)');
  else for (const v of L.searchValues) if (!VALUES.has(v)) err(`layout.searchValues: "${v}" isn't in allowed.json`);
}

for (const list of ['featured', 'latest']) {
  const v = data[list];
  if (!Array.isArray(v)) { err(`"${list}" must be a list of episode ids`); continue; }
  if (new Set(v).size !== v.length) err(`"${list}" has the same id twice`);
  for (const id of v) if (!ids.has(id)) err(`"${list}" mentions ${id}, which isn't in "episodes"`);
  if (list === 'featured') for (const id of v) if (ids.has(id) && !visible(id)) err(`"featured" mentions ${id}, which is in a hidden series`);
}
if (Array.isArray(data.featured)) {
  if (data.featured.length < 1 || data.featured.length > 5) err('"featured" (the hero cards) must have 1–5 episodes');
  const now = Date.now();
  for (const id of data.featured) {
    const e = eps.find((x) => x.id === id);
    if (e?.release && new Date(e.release).getTime() > now) warn(`featured ${id} isn't released yet; the hero card will show it as "coming soon"`);
  }
}
for (const e of eps) if (!hidden.has(e.series) && Array.isArray(data.latest) && !data.latest.includes(e.id)) warn(`"${e.title}" (${e.id}) isn't in "latest", so it won't appear in the Latest row`);

for (const w of warnings) console.warn(`! ${w}`);
if (errors.length) {
  for (const e of errors) console.error(`✗ ${e}`);
  console.error(`\n${errors.length} problem(s). Nothing was published.`);
  process.exit(1);
}
console.log(`✓ stories.json is valid: ${eps.length} episodes (${eps.filter((e) => !hidden.has(e.series)).length} shown), ${data.featured.length} hero cards, ${data.layout.sections.length} Home sections.`);
