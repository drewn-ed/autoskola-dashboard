import { useEffect, useRef, useState } from 'react';
import { api } from '../api';
import { useData } from '../App';

type Result = { ok: boolean; text: string; id?: number };

// Bookmarklet: na stránce vyhodnocení testu odešle její HTML formulářem (POST) do dashboardu.
// Server test uloží a přesměruje na jeho detail. Formulář je navigace, takže nepotřebuje povolení k místní síti.
const bookmarklet = (origin: string) => `javascript:(()=>{if(!document.querySelector('[id=ot1]'))return alert('Otevři nejdřív stránku „vyhodnocení“ konkrétního testu.');const f=document.createElement('form');f.method='POST';f.action='${origin}/import/etesty';f.target='_blank';const i=document.createElement('input');i.type='hidden';i.name='html';i.value=document.documentElement.outerHTML;f.appendChild(i);document.body.appendChild(f);f.submit();f.remove()})()`;

export default function Import({ failed = false }: { failed?: boolean }) {
  const { refresh } = useData();
  const [results, setResults] = useState<Result[]>([]);
  const [busy, setBusy] = useState(false);
  const linkRef = useRef<HTMLAnchorElement>(null);

  // React nedovolí href s javascript:, proto ho nastavíme přímo v DOM
  useEffect(() => {
    linkRef.current?.setAttribute('href', bookmarklet(location.origin));
  }, []);

  const importHtml = async (name: string, html: string): Promise<Result> => {
    try {
      const r = await api.importEtesty(html);
      return r.status === 'duplicate'
        ? { ok: true, text: `${name}: tenhle test už v dashboardu je` }
        : { ok: true, text: `${name}: ${r.title} – ${r.matched} z ${r.total} otázek spárováno s ministerskou sadou`, id: r.id };
    } catch (e) {
      return { ok: false, text: `${name}: ${(e as Error).message}` };
    }
  };

  const onFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    setBusy(true);
    const out: Result[] = [];
    for (const f of Array.from(files)) out.push(await importHtml(f.name, await f.text()));
    setResults((r) => [...out, ...r]);
    await refresh();
    setBusy(false);
  };

  return (
    <>
      <div className="page-head"><h1>Import z autoskola-testy.cz</h1></div>
      <p className="muted lead">
        Testy, které děláš na <b>autoskola-testy.cz</b> (eTesty z Moje Autoškoly), můžeš přenést sem. Otázky z ministerské sady se
        spárují s databází a chyby se přidají do chybovníku. Vlastní otázky autoškoly (např. z připouštěcího testu) se uloží jako kopie.
      </p>

      {failed && (
        <div className="card feedback bad">
          Import ze záložky se nepovedl. Zkontroluj, že jsi byl na stránce <b>detailní vyhodnocení testu</b>. Případně stránku ulož
          a nahraj ji níže.
        </div>
      )}

      <div className="grid-2">
        <div className="card">
          <h3>1. Záložka v prohlížeči (doporučeno)</h3>
          <ol className="steps">
            <li>Přetáhni tohle tlačítko na lištu záložek: <a ref={linkRef} className="btn primary bookmarklet" onClick={(e) => { e.preventDefault(); alert('Tohle tlačítko přetáhni na lištu záložek, neklikej na něj tady.'); }}>📥 Do dashboardu</a></li>
            <li>Na autoskola-testy.cz otevři <b>Moje testy → vyhodnocení</b> testu.</li>
            <li>Klikni na záložku „📥 Do dashboardu“. V nové kartě se otevře dashboard s uloženým testem. Dashboard přitom musí běžet.</li>
          </ol>
          <p className="muted small">Když test importuješ podruhé, nic se nezdvojí. Dashboard tě jen přesměruje na už uložený test.</p>
        </div>
        <div className="card">
          <h3>2. Nahrát uloženou stránku</h3>
          <ol className="steps">
            <li>Na stránce vyhodnocení testu dej <kbd>⌘</kbd>+<kbd>S</kbd> a ulož ji jako HTML.</li>
            <li>Soubor (nebo víc souborů naráz) nahraj sem:</li>
          </ol>
          <label className="dropzone">
            <input type="file" accept=".html,.htm,text/html" multiple onChange={(e) => onFiles(e.target.files)} disabled={busy} />
            {busy ? 'Importuji…' : 'Vybrat soubory .html'}
          </label>
        </div>
      </div>

      {results.length > 0 && (
        <div className="card">
          <h3>Výsledek importu</h3>
          <ul className="import-results">
            {results.map((r, i) => (
              <li key={i} className={r.ok ? 'good' : 'bad'}>
                {r.text} {r.id && <a href={`#/historie/${r.id}`}>zobrazit →</a>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}
