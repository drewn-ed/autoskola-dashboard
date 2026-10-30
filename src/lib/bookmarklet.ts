/**
 * Záložka „Do dashboardu“. Spustí se na stránce výsledku testu a pošle ho formulářem (POST) do dashboardu,
 * server test uloží a v nové kartě otevře jeho detail. Formulář je navigace, takže nepotřebuje povolení
 * k místní síti. Funkce se převádí na text, proto nesmí používat nic zvenku a musí být soběstačná.
 *
 * - autoskola-testy.cz: pošle celé HTML stránky „detailní vyhodnocení testu“
 * - etesty.md.gov.cz, původní aplikace: přečte id otázek a zvolených odpovědí ze stránky výsledku
 * - etesty.md.gov.cz, nová aplikace: projde detail každé otázky (kód, body, texty odpovědí a volbu)
 */
async function sendTestToDashboard(origin: string) {
  // Novou kartu je nutné otevřít hned při kliknutí na záložku. Po několika sekundách procházení otázek
  // by ji prohlížeč zablokoval jako vyskakovací okno. Když ji zablokuje i tak, dashboard se otevře tady.
  const tab = window.open('about:blank', 'autoskola-dashboard');
  const send = (field: string, value: string) => {
    const f = document.createElement('form');
    f.method = 'POST';
    f.action = `${origin}/import/etesty`;
    f.target = tab ? 'autoskola-dashboard' : '_self';
    const i = document.createElement('input');
    i.type = 'hidden';
    i.name = field;
    i.value = value;
    f.appendChild(i);
    document.body.appendChild(f);
    f.submit();
    f.remove();
  };
  const num = (s: string | undefined) => (s == null ? undefined : Number(s));
  const text = document.body.innerText;

  if (document.querySelector('[id=ot1]')) return send('html', document.documentElement.outerHTML);

  const oldTiles = [...document.querySelectorAll<HTMLElement>('.question-overview[data-question-id]')];
  if (oldTiles.length) {
    const score = text.match(/dosaženo (\d+) bod\S* z maxima (\d+)/);
    return send('json', JSON.stringify({
      kind: 'md-old',
      score: num(score?.[1]),
      maxScore: num(score?.[2]),
      items: oldTiles.map((d) => ({
        id: Number(d.dataset.questionId),
        answer: Number(d.getAttribute('onclick')?.match(/[?&](?:amp;)?a=(\d+)/)?.[1] ?? 0),
        correct: d.classList.contains('answer-correct'),
      })),
    }));
  }

  const tiles = () => [...document.querySelectorAll<HTMLElement>('.question-overview-tile')];
  if (!tiles().length) return tab?.close(), alert('Otevři nejdřív výsledek testu (vyhodnocení) na autoskola-testy.cz nebo etesty.md.gov.cz.');

  // Souhrn je jen na stránce výsledku, ne v detailu otázky
  const score = text.match(/max\. možných bodů\s*(\d+)\s*\/\s*(\d+)/);
  const dur = text.match(/Doba trvání testu\s*(\d+):(\d+):(\d+)/);
  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
  const items = [];
  const total = tiles().length;
  for (let n = 1; n <= total; n++) {
    tiles()[n - 1].click();
    let head: Element | null = null;
    for (let t = 0; t < 100; t++) {
      await sleep(50);
      head = document.querySelector('.question-detail-meta-vestnik')?.parentElement ?? null;
      if (head?.textContent?.includes(`Otázka č. ${n} z`)) break;
      head = null;
    }
    if (!head) return tab?.close(), alert(`Detail otázky ${n} se nenačetl. Zkus záložku spustit znovu.`);
    const answers = [...document.querySelectorAll('.question-detail-answers li.answer')].map((li) => ({
      text: li.querySelector('.answer-text')?.textContent?.trim() ?? '',
      chosen: li.classList.contains('selected'),
      correct: li.classList.contains('answer--correct'),
    }));
    items.push({
      code: head.textContent?.match(/RP\d+/)?.[0] ?? null,
      points: num(head.querySelector('.media-qbadge')?.textContent?.match(/\d+/)?.[0]),
      text: document.querySelector('.question__text')?.textContent?.trim() ?? '',
      answers,
      correct: answers.some((a) => a.chosen && a.correct),
    });
  }
  send('json', JSON.stringify({
    kind: 'md-new',
    score: num(score?.[1]),
    maxScore: num(score?.[2]),
    durationS: dur ? Number(dur[1]) * 3600 + Number(dur[2]) * 60 + Number(dur[3]) : undefined,
    items,
  }));
}

export const bookmarkletHref = (origin: string) =>
  `javascript:${encodeURIComponent(`(${sendTestToDashboard.toString()})(${JSON.stringify(origin)})`)}`;
