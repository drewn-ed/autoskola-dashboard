# Autoškola dashboard

Webová aplikace na učení testů z autoškoly pro **skupinu B**. Běží u tebe v počítači a obsahuje všech
1 080 oficiálních otázek z [etesty.md.gov.cz](https://etesty.md.gov.cz). Ukládá tvoje výsledky, takže
vidíš, co umíš, co ne a jestli bys prošel zkouškou.

## Spuštění (poprvé)

Potřebuješ:
- **Node.js 22.5 nebo novější.** Stáhni verzi „LTS“ z [nodejs.org](https://nodejs.org) a nainstaluj ji.
  Verzi zjistíš příkazem `node -v`.
- **Git**, nebo si repozitář stáhni na GitHubu jako ZIP (zelené tlačítko *Code → Download ZIP*).

V terminálu (na Windows v PowerShellu):

```bash
git clone https://github.com/drewn-ed/autoskola-dashboard.git
cd autoskola-dashboard
npm install
npm start
```

Pak otevři **http://localhost:5174**. Aplikace se zeptá na jméno a autoškolu a můžeš začít.

Příště už stačí ve složce projektu spustit jen `npm start`. Aplikace běží, dokud je terminál otevřený.
Ukončíš ji klávesami `Ctrl+C`.

## Obrázky a videa otázek (nepovinné)

Obrázky a videa se bez dalšího nastavení načítají přímo z webu ministerstva. Ten je ale hodně pomalý,
hlavně u videí. Pokud je chceš mít v počítači (asi 1,3 GB, stahování může trvat i několik hodin):

```bash
npm run fetch-bank
```

Stahování můžeš kdykoli přerušit a spustit znovu, už stažené soubory přeskočí. Aplikace mezitím normálně běží.

## Co umí

- **Přehled**: odhad bodů u zkoušky po okruzích, mapa všech otázek, vývoj skóre
- **Procvičování**: po okruzích nebo mix, hlavně nové otázky a občas se vrátí chyba
- **Chybovník**: otázka zmizí, až ji dáš 3× po sobě správně
- **Cvičná zkouška**: jako ostrá zkouška (25 otázek, 30 minut, 50 bodů, minimum 43)
- **Otázky**: všechny otázky s vyhledáváním a galerií značek, hledání odkudkoli klávesami `⌘K` / `Ctrl+K`
- **Historie testů** a **import z eTestů** (autoskola-testy.cz) přes záložku v prohlížeči

## Tvoje data

Výsledky se ukládají do souboru `data/progress.db` ve složce projektu. Ten se do gitu nenahrává,
každý má svoje. Když si chceš výsledky zazálohovat, zkopíruj si tenhle soubor.

Aktualizace aplikace: `git pull`, `npm install` a `npm start`. Tvoje výsledky zůstanou.

## Pro vývoj

`npm run dev` spustí aplikaci s automatickým obnovováním při změně kódu. Technologie: React + TypeScript
(Vite), Tailwind CSS v4, shadcn/ui, Recharts, Motion a server na Node.js s vestavěným SQLite.
