# Databasarkitektur: Repository/Adapter-mönster (Pluggbar Lagring)

Detta dokument beskriver arkitekturen för datalagring i **Centerline Pro**. Syftet är att frikoppla applikationens användargränssnitt (React UI) från den underliggande databastjänsten för att enkelt kunna byta lagringslösning i framtiden (t.ex. från Firebase i molnet till en lokal SQL Server, PostgreSQL eller SQLite-databas i företagets interna nätverk).

---

## 🏗️ Arkitekturens designprincip: Service-gränssnitt

Genom att använda **Repository-mönstret** (eller Adapter-mönstret) interagerar React-komponenterna aldrig direkt med specifika SDK-anrop (såsom Firestores `collection`, `addDoc` eller `setDoc`). Istället pratar de med ett abstrakt databasgränssnitt: `DatabaseService`.

Detta ger följande fördelar:
1. **Oberoende av leverantör (No Vendor Lock-in):** Inget Firebase- eller Supabase-specifikt läcker ut i vyerna eller komponenterna.
2. **Offline-först (Zero Downtime):** Det gör det enkelt att ha en lokal fallback (t.ex. `LocalStorage` eller `IndexedDB`) om anslutningen förloras.
3. **Enkel Testbarhet:** Vi kan enkelt växla mellan en testdatabas i minnet (In-Memory) och skarpt läge.

---

## 🛠️ Det abstrakta gränssnittet (`DatabaseService`)

I filen `src/types.ts` eller en dedikerad gränssnittsfil definierar vi de operationer som vår applikation behöver:

```typescript
export interface DatabaseService {
  // Initiering
  initialize(): Promise<void>;

  // Hämta och spara data synkront/asynkront
  getPoints(): Promise<MachinePoint[]>;
  savePoints(points: MachinePoint[]): Promise<void>;

  getLayouts(): Promise<Record<string, any>>;
  saveLayouts(layouts: Record<string, any>): Promise<void>;

  getDefinitions(): Promise<Record<string, any>>;
  saveDefinitions(definitions: Record<string, any>): Promise<void>;

  getRecipes(): Promise<Record<string, string[]>>;
  saveRecipes(recipes: Record<string, string[]>): Promise<void>;

  getHierarchy(): Promise<{
    lines: FactoryLine[];
    machines: Record<string, string[]>;
    sections: Record<string, string[]>;
  }>;
  saveHierarchy(hierarchy: {
    lines: FactoryLine[];
    machines: Record<string, string[]>;
    sections: Record<string, string[]>;
  }): Promise<void>;

  getBackgrounds(): Promise<Record<string, string>>;
  saveBackgrounds(backgrounds: Record<string, string>): Promise<void>;

  getHistory(): Promise<HistoryEntry[]>;
  saveHistory(history: HistoryEntry[]): Promise<void>;

  // Realtidsprenumerationer (Valfritt för samarbete)
  subscribeToChanges?(key: string, callback: (data: any) => void): () => void;
}
```

---

## 💾 Implementations-adaptrar

Vi bygger därefter separata klasser eller objekt som implementerar detta gränssnitt:

### 1. `FirebaseDatabaseService` (Nuvarande Moln-lagring)
* Implementerar gränssnittet mot **Firebase Firestore**.
* Läser och skriver till Firestore-dokument i molnet med robust felhantering och behörighetsregler.
* Perfekt för snabb driftsättning och åtkomst från mobila enheter/surfplattor över internet.

```typescript
export class FirebaseDatabaseService implements DatabaseService {
  // Använder Firebase Firestore under huven...
}
```

### 2. `LocalDatabaseService` (Framtida On-Premise-lagring)
* Om företaget i framtiden vill ha all data internt på en lokal server (eller on-premise datacenter), skapar vi en ny adapter.
* Vår React UI-kod förblir **helt orörd**; vi ändrar bara vilken service vi injicerar eller exporterar i applikationsroten:
  ```typescript
  // Den enda raden i hela projektet som behöver ändras för att byta databas:
  export const dbService: DatabaseService = new LocalDatabaseService(); // istället för FirebaseDatabaseService
  ```

---

## 🔄 Integrationssteg för Firebase

1. **Provisionera Firestore via verktyg:** Vi kör `set_up_firebase` för att konfigurera Google Cloud och skapa de grundläggande Firestore-instanserna.
2. **Definiera Blueprint (`firebase-blueprint.json`):** Vi skapar och beskriver datastrukturerna (entiteterna) för projektet.
3. **Skapa en dedikerad servicemodul (`src/services/db.ts`):** Här samlar vi all databaslogik under gränssnittet.
4. **Spara och Synkronisera:** Vi kopplar ihop applikationens `App.tsx` state så att den läser och skriver via vår nya `dbService`.
