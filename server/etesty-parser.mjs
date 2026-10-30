// Parser stránky "detailní vyhodnocení testu" z www.autoskola-testy.cz
// (autoskola_test_vyhodnoceni_full.php). Stránka je čisté serverové HTML,
// každá otázka je ve <span id="otN"> a souhrn v tabulce řádků s onclick="$('#otN')…".

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };
const decode = (s) => s
  .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
  .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
  .replace(/&(\w+);/g, (m, n) => ENTITIES[n] ?? m);
const text = (html) => decode(html.replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ').trim();

const parseMinSec = (s) => {
  const m = s?.match(/(\d+):(\d+)/);
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
};

export function parseEtestyHtml(html) {
  const ident = html.match(/test_ident=([a-z0-9]+)/i)?.[1];
  if (!ident || !html.includes('id="ot1"')) {
    throw new Error('Tohle nevypadá jako stránka „detailní vyhodnocení testu“ z autoskola-testy.cz');
  }

  const title = text(html.match(/název testu:\s*<b>(.*?)<\/b>/i)?.[1] ?? 'Test z autoskola-testy.cz');
  // Datum začátku je v <title> jako [YYYY-MM-DD HH:MM] (čas v ČR)
  const dt = html.match(/<title>[^<]*\[(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2})\]/i);
  const startedAt = dt
    ? pragueToIso(Number(dt[1]), Number(dt[2]), Number(dt[3]), Number(dt[4]), Number(dt[5]))
    : new Date().toISOString();
  const scoreM = html.match(/Počet bodů:[\s\S]*?class="circle">\s*(\d+)\s*z\s*(\d+)/i);
  const passScore = Number(html.match(/potřebné minimum:\s*(\d+)/i)?.[1] ?? 43);
  const durationS = parseMinSec(html.match(/Čas vyplňování:\s*<strong>([\d:]+)/i)?.[1]);

  // Souhrnná tabulka: výsledek a čas každé otázky. Server píše onClick a <B>, prohlížeč (uložená stránka,
  // záložka) to převede na malá písmena, proto se značky hledají bez ohledu na velikost písmen.
  const rows = new Map();
  for (const m of html.matchAll(/<tr class="cursor-pointer" onclick="\$\('#ot(\d+)'\)[\s\S]*?<\/tr>/gi)) {
    const cells = [...m[0].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map((c) => text(c[1]));
    rows.set(Number(m[1]), { isCorrect: cells[1] === 'správně', timeS: parseMinSec(cells[2]) });
  }

  const items = [];
  for (const m of html.matchAll(/<span[^>]*id="ot(\d+)"[^>]*>([\s\S]*?)<\/span>\s*<\/td>/gi)) {
    const n = Number(m[1]);
    const body = m[2];
    const meta = body.match(/kód otázky:\s*([^,]+),\s*počet bodů:+\s*(\d+),\s*kategorie:\s*([^)]*)\)/);
    const qText = body.match(/<\/font>\s*<br>\s*<b>([\s\S]*?)<\/b>/i)?.[1];
    const image = body.match(/<img[^>]+src="([^"]+)"/i)?.[1];
    // Server nechává <li> neuzavřené (doplní je až prohlížeč), odpověď proto končí i u dalšího <li> nebo </ul>
    const answers = [...body.matchAll(/<li>([\s\S]*?)(?=<\/?li>|<\/ul>)/gi)].map((a) => ({
      chosen: a[1].includes('(VAŠE VOLBA)'),
      correct: a[1].includes('(SPRÁVNÁ ODPOVĚĎ)'),
      text: text(a[1].replace(/<strong>\((VAŠE VOLBA|SPRÁVNÁ ODPOVĚĎ)\)\s*<\/strong>/g, '')).replace(/^\d+\)\s*/, ''),
    }));
    const row = rows.get(n);
    items.push({
      pos: n,
      code: meta?.[1].trim() ?? null,
      points: meta ? Number(meta[2]) : null,
      category: meta?.[3].trim() || null,
      text: text(qText ?? ''),
      image: image ? new URL(image, 'https://www.autoskola-testy.cz/').href : null,
      answers,
      isCorrect: row ? row.isCorrect : answers.some((a) => a.chosen && a.correct),
      timeMs: row?.timeS != null ? row.timeS * 1000 : null,
    });
  }
  items.sort((a, b) => a.pos - b.pos);
  if (!items.length) throw new Error('Na stránce jsem nenašel žádné otázky');

  return {
    externalId: ident,
    title,
    isPripoustecí: /připouštěcí/i.test(title),
    startedAt,
    durationS,
    score: scoreM ? Number(scoreM[1]) : items.filter((i) => i.isCorrect).reduce((s, i) => s + (i.points ?? 1), 0),
    maxScore: scoreM ? Number(scoreM[2]) : 50,
    passScore,
    items,
  };
}

// Převod místního času v Praze na ISO (UTC) – bez externí knihovny
function pragueToIso(y, mo, d, h, mi) {
  const guess = Date.UTC(y, mo - 1, d, h, mi);
  const fmt = new Intl.DateTimeFormat('en-US', { timeZone: 'Europe/Prague', hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
  const p = Object.fromEntries(fmt.formatToParts(new Date(guess)).map((x) => [x.type, x.value]));
  const asPrague = Date.UTC(Number(p.year), Number(p.month) - 1, Number(p.day), Number(p.hour), Number(p.minute));
  return new Date(guess - (asPrague - guess)).toISOString();
}
