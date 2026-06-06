# Centerline Pro: Utvecklingsplan (KISS / "Don't Make Me Think")

Detta dokument beskriver den valda och sparade planen för att göra **Centerline Pro** till ett extremt enkelt, robust och tidseffektivt verktyg för operatörer och tekniker på linjen. 

Fokus ligger på att maximera stabilitet, minska produktionsvariationer och korta ner omställningstider genom extremt intuitiv UX (enligt *"Don't make me think"*-principen).

---

## 🛠️ Fokusområde 1: Format- & Receptväljaren (Nuvarande fokus)

För att kunna köra olika förpackningsstorlekar och produkter på samma linje behöver maskinens börvärden (Centerline-parametrar) ändras blixtsnabbt. Operatören ska aldrig behöva gissa eller svalta i Excel-ark.

### 1. Enkel och direkt Formatväljare (Dashboard)
- **Varför?** Operatören måste omedelbart se och kunna ändra aktivt recept med ett enda klick.
- **Hur?** Vi placerar en horisontell rad med högkontrasterande "piller-knappar" (t.ex. **Standard 24-Pack**, **Slim 12-Pack**, **Promo 4-Pack**) längst upp på skärmen, precis under huvudrubriken.
- **Logik:** Ett klick ändrar hela systemets visade börvärden direkt. Ingen dropdown som gömmer alternativen. Inga röriga bekräftelsedialoger. Det är blixtsnabbt och idiot-säkert.

### 2. Dynamiskt parameterstöd (Fallback-system)
- **Varför?** Många inställningar på maskinen är "Universal" (t.ex. filmspänning på rulle som alltid är 2.5 bar) medan andra är formatspecifika (t.ex. breddinställning på inmatningen).
- **Hur?** I datamodellen utökar vi kontrollpunkterna så att de *valfritt* kan ha unika börvärden per recept:
  ```typescript
  recipeTargets?: Record<string, { targetValue: string; tolerance: string }>
  ```
- **Fallback logik ("Don't make me think" i kod):**
  1. Om ett receptöverskrivande värde finns för aktivt recept, visa det.
  2. Annars, visa standardvärdet och lägg till en subtil, stilren etikett: `⚙️ Universell` / `Gemensam`. Operatören slipper därmed mata in dubbletter, och ser direkt vilka punkter som faktiskt behöver ställas om vid formatbyte!

### 3. Receptmatris vid redigering (Enkel inmatning för tekniker)
- **Varför?** Att klicka runt mellan olika format för att mata in värden är långsamt och leder till felaktiga knapptryckningar.
- **Hur?** När en tekniker redigerar en kontrollpunkt i redigeringsvyn (`AddPointForm`) visar vi en **tabellmatris** med alla tillgängliga format sida vid sida.
- **UX:** Teknikern kan mata in börvärde och tolerans för samtliga format på *en och samma skärm*. Man ser direkt skillnaderna, och vi lägger till en smart knapp: **"Kopiera till alla format"** för blixtsnabb ifyllning.

### 4. Hantering av format i Design-läge
- **Varför?** Fler format kan komma i framtiden (t.ex. ny kundförpackning).
- **Hur?** När appen är i **Redigera-läge (Design Mode)** dyker en liten inställningsknapp eller ett `+`-tecken upp bredvid formatväljaren. Där kan man omedelbart lägga till, byta namn på eller radera format utan djupliggande konfigureringar.

---

## 📈 Framtida Fokusområden (Roadmap)

### Fokusområde 2: Blixtsnabb statusrapportering (Operatörs-checklistor)
- **Mål:** Minimera klicktiden vid skiftkontroll.
- **Lösning:** Operatören ska kunna svepa (på surfplatta) eller använda enkla snabbknappar på tabellnivå för att markera allt som OK, och endast behöva klicka djupt om de sätter en röd/gul tagg.

### Fokusområde 3: Felsökningsstöd & Smart AI-guide
- **Mål:** Förhindra haverier genom att ge operatören "hjälp på plats" när en parameter är utanför tolerans.
- **Lösning:** Integrera Gemini AI-modellen för att generera en omedelbar åtgärdsplan när en användare rapporterar en röd tagg eller avvikelse (t.ex. *"Om mätare B1 visar > 143, justera vinkel på kartongstoppet med..."*).

### Fokusområde 4: Automatiserad PDF/Print-export för pärmar
- **Mål:** Generera extremt snygg, högkvalitativ, fysisk pärm-dokumentation (A3/A4) med unika QR-koder till varje punkt för scanning på maskinen.
- **Lösning:** Färdigställa utskriftslayouten så att den följer exakta industriella standarder med korrekt ISO-sidhuvud och ramar.
