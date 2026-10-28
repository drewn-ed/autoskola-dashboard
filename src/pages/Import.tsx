import { useEffect, useRef, useState } from 'react';
import { BookmarkIcon, CircleAlertIcon, FileUpIcon } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/page-header';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Kbd } from '@/components/ui/kbd';
import { api } from '@/lib/api';
import { useData } from '@/lib/data';
import { TestsTable } from '@/pages/History';
import { cn } from '@/lib/utils';

type Result = { ok: boolean; text: string; id?: number };

// Bookmarklet: na stránce vyhodnocení testu odešle její HTML formulářem (POST) do dashboardu.
// Server test uloží a přesměruje na jeho detail. Formulář je navigace, takže nepotřebuje povolení k místní síti.
const bookmarklet = (origin: string) => `javascript:(()=>{if(!document.querySelector('[id=ot1]'))return alert('Otevři nejdřív stránku „vyhodnocení“ konkrétního testu.');const f=document.createElement('form');f.method='POST';f.action='${origin}/import/etesty';f.target='_blank';const i=document.createElement('input');i.type='hidden';i.name='html';i.value=document.documentElement.outerHTML;f.appendChild(i);document.body.appendChild(f);f.submit();f.remove()})()`;

export default function Import({ failed = false }: { failed?: boolean }) {
  const { refresh, tests } = useData();
  const imported = tests.filter((t) => t.source !== 'dashboard');
  const [results, setResults] = useState<Result[]>([]);
  const [busy, setBusy] = useState(false);
  const [drag, setDrag] = useState(false);
  const linkRef = useRef<HTMLAnchorElement>(null);

  // React nedovolí href s javascript:, proto ho nastavíme přímo v DOM
  useEffect(() => {
    linkRef.current?.setAttribute('href', bookmarklet(location.origin));
  }, []);

  const importHtml = async (name: string, html: string): Promise<Result> => {
    try {
      const r = await api.importEtesty(html);
      return r.status === 'duplicate'
        ? { ok: true, text: `${name}: tenhle test už v dashboardu je`, id: r.id }
        : { ok: true, text: `${name}: ${r.title}, ${r.matched} z ${r.total} otázek spárováno s ministerskou sadou`, id: r.id };
    } catch (e) {
      return { ok: false, text: `${name}: ${(e as Error).message}` };
    }
  };

  const onFiles = async (files: FileList | File[] | null) => {
    if (!files?.length) return;
    setBusy(true);
    const out: Result[] = [];
    for (const f of Array.from(files)) out.push(await importHtml(f.name, await f.text()));
    setResults((r) => [...out, ...r]);
    await refresh();
    setBusy(false);
    const okCount = out.filter((r) => r.ok).length;
    if (okCount) toast.success(okCount === 1 ? 'Test naimportován' : `Naimportováno testů: ${okCount}`);
    if (okCount < out.length) toast.error('Některé soubory se nepodařilo naimportovat');
  };

  return (
    <>
      <PageHeader
        title="Import z eTestů"
        description="Testy z autoskola-testy.cz (eTesty z Moje Autoškoly) přeneseš sem. Ministerské otázky se spárují s databází a chyby půjdou do chybovníku. Vlastní otázky autoškoly se uloží jako kopie."
      />

      {failed && (
        <Alert variant="destructive">
          <CircleAlertIcon />
          <AlertTitle>Import ze záložky se nepovedl</AlertTitle>
          <AlertDescription>Záložku spusť na stránce „detailní vyhodnocení testu“. Jinak stránku ulož a nahraj ji níže.</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><BookmarkIcon className="size-4 text-muted-foreground" />Záložka v prohlížeči</CardTitle>
            <CardDescription>Nejrychlejší cesta. Jedním kliknutím přeneseš test, na který se zrovna díváš.</CardDescription>
          </CardHeader>
          <CardContent>
            <ol className="flex list-decimal flex-col gap-3 pl-5 text-sm">
              <li>
                Přetáhni tlačítko na lištu záložek:{' '}
                <Button asChild size="sm" className="ml-1 cursor-grab active:cursor-grabbing">
                  <a ref={linkRef} onClick={(e) => { e.preventDefault(); toast.info('Tlačítko přetáhni myší na lištu záložek. Tady na něj neklikej.'); }}>Do dashboardu</a>
                </Button>
              </li>
              <li>Na autoskola-testy.cz otevři Moje testy a u testu klikni na „vyhodnocení“.</li>
              <li>Klikni na záložku „Do dashboardu“. V nové kartě se otevře uložený test. Dashboard při tom musí běžet.</li>
            </ol>
            <p className="mt-4 text-xs text-muted-foreground">Když test pošleš podruhé, nic se nezdvojí. Otevře se už uložený test.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><FileUpIcon className="size-4 text-muted-foreground" />Nahrát uloženou stránku</CardTitle>
            <CardDescription>Na stránce vyhodnocení dej <Kbd>⌘</Kbd> <Kbd>S</Kbd> a ulož ji jako HTML. Najednou jde nahrát víc souborů.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col">
            <label
              onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
              onDragLeave={() => setDrag(false)}
              onDrop={(e) => { e.preventDefault(); setDrag(false); onFiles(e.dataTransfer.files); }}
              className={cn(
                'flex min-h-32 flex-1 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed text-sm text-muted-foreground transition-colors hover:border-foreground/40 hover:text-foreground has-focus-visible:ring-3 has-focus-visible:ring-ring/50',
                drag && 'border-sign bg-sign-soft text-sign',
              )}
            >
              <input type="file" accept=".html,.htm,text/html" multiple className="sr-only" onChange={(e) => onFiles(e.target.files)} disabled={busy} />
              <FileUpIcon className="size-5" />
              {busy ? 'Importuji…' : 'Přetáhni soubory sem nebo klikni a vyber je'}
            </label>
          </CardContent>
        </Card>
      </div>

      <Card className="gap-2">
        <CardHeader>
          <CardTitle>Importované testy</CardTitle>
          <CardDescription>Testy z eTestů a připouštěcí testy, které už v dashboardu máš.</CardDescription>
        </CardHeader>
        <CardContent className="px-2 sm:px-4">
          {imported.length ? <TestsTable tests={imported} /> : <p className="py-6 text-center text-sm text-muted-foreground">Zatím žádný. Použij záložku nebo nahraj uloženou stránku.</p>}
        </CardContent>
      </Card>

      {results.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Výsledek importu</CardTitle></CardHeader>
          <CardContent className="flex flex-col divide-y text-sm">
            {results.map((r, i) => (
              <div key={i} className="flex items-center justify-between gap-3 py-2.5">
                <span className={r.ok ? 'text-foreground' : 'text-negative'}>{r.text}</span>
                {r.id && <Button variant="ghost" size="sm" asChild><a href={`#/historie/${r.id}`}>Otevřít test</a></Button>}
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </>
  );
}
