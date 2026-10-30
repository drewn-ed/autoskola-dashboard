import { useEffect, useRef, useState } from 'react';
import { BookmarkIcon, CircleAlertIcon, FileUpIcon, LinkIcon } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/page-header';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Kbd } from '@/components/ui/kbd';
import { api, type ImportResult } from '@/lib/api';
import { bookmarkletHref } from '@/lib/bookmarklet';
import { useData } from '@/lib/data';
import { TestsTable } from '@/pages/History';
import { cn } from '@/lib/utils';

type Result = { ok: boolean; text: string; id?: number };

export default function Import({ failed = false }: { failed?: boolean }) {
  const { refresh, tests } = useData();
  const imported = tests.filter((t) => t.source !== 'dashboard');
  const [results, setResults] = useState<Result[]>([]);
  const [busy, setBusy] = useState(false);
  const [drag, setDrag] = useState(false);
  const [link, setLink] = useState('');
  const linkRef = useRef<HTMLAnchorElement>(null);

  // React nedovolí href s javascript:, proto ho nastavíme přímo v DOM
  useEffect(() => {
    linkRef.current?.setAttribute('href', bookmarkletHref(location.origin));
  }, []);

  const describe = (name: string, r: ImportResult): Result =>
    r.status === 'duplicate'
        ? { ok: true, text: `${name}: tenhle test už v dashboardu je`, id: r.id }
      : { ok: true, text: `${name}: ${r.title}, ${r.matched} z ${r.total} otázek spárováno s ministerskou sadou`, id: r.id };

  const importHtml = async (name: string, html: string): Promise<Result> => {
    try {
      return describe(name, await api.importEtesty(html));
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

  // Stránka vyhodnocení je veřejná, takže stačí odkaz: server si ji stáhne sám
  const onLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!link.trim() || busy) return;
    setBusy(true);
    try {
      const r = await api.importEtestyUrl(link);
      setResults((rs) => [describe('Odkaz', r), ...rs]);
      await refresh();
      setLink('');
      toast.success(r.status === 'duplicate' ? 'Tenhle test už v dashboardu je' : 'Test naimportován');
      location.hash = `#/historie/${r.id}`;
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Import z eTestů"
        description="Testy z autoskola-testy.cz (eTesty z Moje Autoškoly) i cvičné zkoušky z webu ministerstva přeneseš sem. Ministerské otázky se spárují s databází a chyby půjdou do chybovníku. Vlastní otázky autoškoly se uloží jako kopie."
      />

      {failed && (
        <Alert variant="destructive">
          <CircleAlertIcon />
          <AlertTitle>Import ze záložky se nepovedl</AlertTitle>
          <AlertDescription>Záložku spusť na stránce s výsledkem testu. U autoskola-testy.cz můžeš místo toho vložit odkaz nebo stránku uložit a nahrát níže.</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><LinkIcon className="size-4 text-muted-foreground" />Vložit odkaz na vyhodnocení</CardTitle>
          <CardDescription>Na autoskola-testy.cz otevři u testu „vyhodnocení“, zkopíruj adresu stránky a vlož ji sem. Test se uloží a otevře.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onLink} className="flex flex-col gap-2 sm:flex-row">
            <Input
              value={link}
              onChange={(e) => setLink(e.target.value)}
              placeholder="https://www.autoskola-testy.cz/autoskola_test_vyhodnoceni_full.php?test_ident=…"
              aria-label="Odkaz na vyhodnocení testu"
              inputMode="url"
              disabled={busy}
            />
            <Button type="submit" disabled={busy || !link.trim()}>{busy ? 'Importuji…' : 'Importovat'}</Button>
          </form>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><BookmarkIcon className="size-4 text-muted-foreground" />Záložka v prohlížeči</CardTitle>
            <CardDescription>Jedním kliknutím přeneseš test, na který se zrovna díváš. Jediná cesta pro cvičné zkoušky ministerstva, které si výsledky nikam neukládá.</CardDescription>
          </CardHeader>
          <CardContent>
            <ol className="flex list-decimal flex-col gap-3 pl-5 text-sm">
              <li>
                Přetáhni tlačítko na lištu záložek:{' '}
                <Button asChild size="sm" className="ml-1 cursor-grab active:cursor-grabbing">
                  <a ref={linkRef} onClick={(e) => { e.preventDefault(); toast.info('Tlačítko přetáhni myší na lištu záložek. Tady na něj neklikej.'); }}>Do dashboardu</a>
                </Button>
              </li>
              <li>
                Otevři výsledek testu: na autoskola-testy.cz „vyhodnocení“ u testu, na{' '}
                <a className="underline underline-offset-2" href="https://etesty.md.gov.cz/et" target="_blank" rel="noreferrer">etesty.md.gov.cz</a>{' '}
                stránku, která se ukáže po „Ukončit a vyhodnotit test“.
              </li>
              <li>Klikni na záložku „Do dashboardu“. V nové kartě se otevře uložený test. Dashboard při tom musí běžet.</li>
            </ol>
            <p className="mt-4 text-xs text-muted-foreground">
              V nové aplikaci ministerstva záložka sama projde detail každé otázky, chvíli to trvá. Když test pošleš podruhé, nic se nezdvojí.
              Jestli už záložku máš z dřívějška, přetáhni ji znovu. Stará verze ministerstvo nezná.
            </p>
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
          <CardDescription>Testy z eTestů, od ministerstva a připouštěcí testy, které už v dashboardu máš.</CardDescription>
        </CardHeader>
        <CardContent className="px-2 sm:px-4">
          {imported.length ? <TestsTable tests={imported} /> : <p className="py-6 text-center text-sm text-muted-foreground">Zatím žádný. Vlož odkaz, použij záložku nebo nahraj uloženou stránku.</p>}
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
