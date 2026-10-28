# Autoškola dashboard

Lokální webová aplikace na učení testů z autoškoly (skupina B). Obsahuje všech 1 080 oficiálních otázek
z [etesty.md.gov.cz](https://etesty.md.gov.cz) a ukládá tvoje výsledky, takže víš, co umíš a co ne.

## Funkce

- **Přehled**: odhad skóre u zkoušky, pokrytí otázek, vývoj skóre a úspěšnost po okruzích
- **Cvičná zkouška**: stejná jako ostrá (25 otázek, 30 minut, 50 bodů, minimum 43), ovládání z klávesnice
- **Procvičování**: po okruzích, neviděné otázky nebo mix, s okamžitou zpětnou vazbou
- **Chybovník**: otázka zmizí, až ji dáš 3× po sobě správně
- **Otázky**: katalog s vyhledáváním, filtry a galerií značek
- **Historie**: všechny testy včetně detailu (tvoje odpověď vs. správná)
- **Import z autoskola-testy.cz**: záložka v prohlížeči nebo nahrání uložené stránky

## Spuštění

Potřebuješ Node.js 22.5 nebo novější (kvůli vestavěnému `node:sqlite`).

```bash
npm install
npm run fetch-bank   # stáhne obrázky a videa otázek (~570 MB), už stažené přeskočí
npm start            # sestaví frontend a spustí server na http://localhost:5174
```

Pro vývoj s hot reloadem: `npm run dev`.

## Data

- `data/questions.json`: sada otázek ministerstva (je v gitu, aktualizuje se přes `npm run fetch-bank`)
- `public/media/`: obrázky a videa otázek (nejsou v gitu, stahují se skriptem)
- `data/progress.db`: tvoje testy a odpovědi (SQLite, nejsou v gitu)
