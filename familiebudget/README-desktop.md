# Squirrel op Windows

Squirrel draait normaal als Home Assistant add-on, maar hij werkt net zo goed
als gewone Windows-app. Alles zit erin: de app, de database, de server. Je hebt
geen Home Assistant nodig en er gaat niets naar het internet.

## Installeren

1. Dubbelklik `Squirrel-Setup-<versie>.exe`.
2. **Windows zegt "Windows heeft uw pc beveiligd".** Dat is te verwachten —
   klik **Meer informatie** en dan **Toch uitvoeren**.

   Dat waarschuwingsscherm betekent niet dat er iets mis is met het bestand. Het
   betekent dat de installer niet ondertekend is met een betaald
   code-signing-certificaat (een paar honderd euro per jaar). Windows kent de
   maker niet en waarschuwt dan standaard.
3. Kies waar hij komt te staan en klik door. Je krijgt een snelkoppeling op je
   bureaublad en in het startmenu.

**De eerste start kan een halve minuut duren.** Windows scant een nieuwe,
onondertekende app één keer helemaal. Daarna start hij in een seconde.

## De eerste keer

Je begint met een lege app en wordt door een korte setup geleid: welke
categorieën je wil gebruiken en wat je ongeveer uitgeeft aan wonen,
boodschappen en vervoer. Dat mag ruw — je past het later toch aan.

Daarna: **Importeer** rechtsboven, en kies de CSV die je bij je bank downloadt.

## Waar staan je gegevens

```
%APPDATA%\Squirrel\data\budget.db
```

Plak dat pad in de adresbalk van Verkenner om er te komen. Alles staat in dat
ene bestand: transacties, categorieën, budgetten, spaarpotjes.

- **Back-up**: kopieer `budget.db` ergens anders heen. Meer is het niet.
  De app maakt zelf ook dagelijks een kopie in `data\backups\`.
- **Verhuizen naar een andere pc**: installeer Squirrel daar en zet je
  `budget.db` op dezelfde plek terug, met de app afgesloten.
- Of gebruik **Instellingen → Back-up** in de app zelf, dat exporteert één
  bestand dat je later weer kan inlezen.

Je gegevens verlaten je computer niet. Er is geen account, geen cloud, geen
synchronisatie.

## Updates

De app kijkt bij het opstarten of er een nieuwe versie is, downloadt die op de
achtergrond en installeert hem bij de volgende herstart. Je hoeft niets te doen.
Werkt het internet even niet, dan slaat hij het stil over.

## Wat je niet ziet (en waarom)

Twee dingen bestaan alleen in de Home Assistant-versie. Ze zijn niet stuk — ze
kunnen daar gewoon niet werken:

- **Agenda-hints** bij een transactie ("wat stond er in je agenda toen je dit
  betaalde") komen uit de agenda's van Home Assistant. Zonder Home Assistant is
  er geen agenda om te bevragen.
- De **"?"-knop** die opzoekt wat voor zaak een onbekende naam is, gebruikt
  deels een lokale kopie van het KBO-register. Die is ~81 MB, moet je zelf
  aanmaken uit een download waarvoor je je moet registreren, en mag niet zomaar
  meegeleverd worden. Zonder die kopie werkt de OpenStreetMap-helft nog wel.

## Als hij niet opstart

Er wordt bij elke start een logje weggeschreven:

```
%APPDATA%\Squirrel\startup.log
```

Daar staat precies hoe ver hij kwam. Stuur dat door en het is meestal meteen
duidelijk. Start de app twee keer, dan springt gewoon het bestaande venster naar
voren — dat hoort zo.

## Zelf bouwen

De installers worden gebouwd door GitHub Actions
(`.github/workflows/electron-build.yml`), op een echte Windows-machine, omdat
`better-sqlite3` per platform gecompileerd moet worden.

```bash
# lokaal, voor het platform waar je op zit
cd familiebudget
npm ci
(cd frontend && npm ci && npm run build)
mkdir -p backend/public && cp -r frontend/dist/* backend/public/
npm run electron:build:win     # of :mac / :linux
```

Op macOS kan je geen Windows-installer maken: `better-sqlite3` is een
native-module en heeft de doel-toolchain nodig. Draai daarvoor de workflow.
