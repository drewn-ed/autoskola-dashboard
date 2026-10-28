// Stáhne kompletní sadu otázek z etesty.md.gov.cz (veřejné API ministerstva)
// a uloží ji do data/questions.json + média do public/media/.
// Spuštění: node scripts/fetch-bank.mjs [--skip-media]   (už stažené soubory přeskakuje)
import { mkdir, writeFile, readFile, access, rename } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BASE = 'https://etesty.md.gov.cz';
const RAW_DIR = path.join(ROOT, 'data/raw');
const MEDIA_DIR = path.join(ROOT, 'public/media');

// Oblasti na webu ministerstva, které se týkají skupiny B
// (2 = bezpečná jízda pro A, 4 = bezpečná jízda pro C/D se vynechávají)
const AREAS = [
  { areaId: 1, key: 'pravidla', name: 'Pravidla provozu' },
  { areaId: 3, key: 'bezpecna', name: 'Zásady bezpečné jízdy' },
  { areaId: 5, key: 'znacky', name: 'Dopravní značky' },
  { areaId: 6, key: 'situace', name: 'Dopravní situace' },
  { areaId: 7, key: 'podminky', name: 'Podmínky provozu vozidel' },
  { areaId: 8, key: 'predpisy', name: 'Související předpisy' },
  { areaId: 9, key: 'zdravoveda', name: 'Zdravotnická příprava' },
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const exists = (p) => access(p).then(() => true, () => false);

async function get(url, as = 'text', tries = 4, timeoutMs = 120_000) {
  for (let i = 0; ; i++) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
      if (!res.ok) throw new Error(`${res.status} ${url}`);
      return as === 'json' ? await res.json() : as === 'buffer' ? Buffer.from(await res.arrayBuffer()) : await res.text();
    } catch (e) {
      if (i >= tries) throw e;
      await sleep(1000 * (i + 1));
    }
  }
}

async function areaQuestionIds(areaId) {
  const html = await get(`${BASE}/ro/DLArea/Index?id=${areaId}`);
  const m = html.match(/const questionList=\[([\d,]*)\]/);
  if (!m) throw new Error(`Seznam otázek pro oblast ${areaId} nenalezen`);
  return m[1].split(',').filter(Boolean).map(Number);
}

// Jednoduchý pool s omezenou souběžností, ať ministerský server nezahltíme
async function pool(items, limit, fn) {
  let i = 0, done = 0;
  await Promise.all(Array.from({ length: limit }, async () => {
    while (i < items.length) {
      const item = items[i++];
      await fn(item);
      if (++done % 50 === 0) console.log(`  ${done}/${items.length}`);
    }
  }));
}

function mediaOf(mc) {
  if (!mc?.mediaUrl) return null;
  const file = path.basename(mc.mediaUrl);
  return { file, type: mc.mediaFormatCode.startsWith('video') ? 'video' : 'image', src: mc.mediaUrl.replace(/\/+/g, '/') };
}

async function main() {
  await mkdir(RAW_DIR, { recursive: true });
  await mkdir(MEDIA_DIR, { recursive: true });

  console.log('Načítám seznamy otázek po oblastech…');
  const areaOf = new Map();
  for (const a of AREAS) {
    const ids = await areaQuestionIds(a.areaId);
    console.log(`  ${a.name}: ${ids.length}`);
    for (const id of ids) if (!areaOf.has(id)) areaOf.set(id, a.key);
  }
  const ids = [...areaOf.keys()];

  console.log(`Stahuji ${ids.length} otázek…`);
  await pool(ids, 4, async (id) => {
    const file = path.join(RAW_DIR, `${id}.json`);
    if (await exists(file)) return;
    const q = await get(`${BASE}/api/v1/PublicWeb/Question/${id}`, 'json');
    await writeFile(file, JSON.stringify(q));
  });

  const questions = [];
  const media = [];
  for (const id of ids) {
    const q = JSON.parse(await readFile(path.join(RAW_DIR, `${id}.json`), 'utf8'));
    const qm = mediaOf(q.mediaContent);
    if (qm) media.push(qm);
    const answers = q.questionAnswers
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((a) => {
        const am = mediaOf(a.mediaContent);
        if (am) media.push(am);
        return { id: a.answerId, text: (a.multilingualAnswerTexts?.cs ?? '').trim(), media: am && { file: am.file, type: am.type } };
      });
    questions.push({
      id: q.id,
      code: q.questionCode,
      area: areaOf.get(id),
      points: q.pointsCount,
      text: (q.questionText ?? '').trim(),
      note: q.explanationNote ?? null,
      media: qm && { file: qm.file, type: qm.type },
      answers,
      correct: q.correctAnswerId,
      validFrom: q.validFrom,
    });
  }

  const out = {
    fetchedAt: new Date().toISOString(),
    source: BASE,
    areas: AREAS.map(({ key, name }) => ({ key, name })),
    questions,
  };
  await writeFile(path.join(ROOT, 'data/questions.json'), JSON.stringify(out));
  console.log(`${questions.length} otázek uloženo do data/questions.json`);

  if (process.argv.includes('--skip-media')) return;
  console.log(`Stahuji ${media.length} médií (obrázky a videa)…`);
  await pool(media, 4, async (m) => {
    const file = path.join(MEDIA_DIR, m.file);
    if (await exists(file)) return;
    // zápis přes dočasný soubor, ať po přerušení nezůstane rozbitý soubor
    // ministerský server posílá videa pomalu (desítky kB/s), proto delší limit
    await writeFile(file + '.part', await get(BASE + m.src, 'buffer', 4, 30 * 60_000));
    await rename(file + '.part', file);
  });
  console.log('Hotovo.');
}

main().catch((e) => { console.error(e); process.exit(1); });
