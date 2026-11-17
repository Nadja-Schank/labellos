// store.ts – Eine kleine JSON-Datei als "Datenbank".
// Wird von EntryRepository UND UserRepository benutzt, damit der Datei-Code nur einmal existiert.

export class JsonStore<T> {
  #file: URL;
  // Schreibvorgänge laufen nacheinander (Warteschlange), damit sich zwei gleichzeitige
  // Anfragen nicht gegenseitig Änderungen überschreiben.
  #queue: Promise<unknown> = Promise.resolve();

  constructor(file: URL) {
    this.#file = file;
  }

  async readAll(): Promise<T[]> {
    let text: string;
    try {
      text = await Deno.readTextFile(this.#file);
    } catch (error) {
      if (error instanceof Deno.errors.NotFound) return []; // noch keine Datei = noch keine Daten
      throw error;
    }
    const data: unknown = JSON.parse(text);
    if (!Array.isArray(data)) {
      throw new Error("Die Datendatei hat ein ungültiges Format (Liste erwartet).");
    }
    return data as T[];
  }

  // Lesen -> ändern -> schreiben, immer einer nach dem anderen.
  // `change` bekommt die Liste, darf sie verändern und gibt das Ergebnis der Operation zurück.
  modify<R>(change: (all: T[]) => R | Promise<R>): Promise<R> {
    const run = this.#queue.then(() => this.#readModifyWrite(change));
    this.#queue = run.catch(() => undefined); // ein Fehler soll die Warteschlange nicht blockieren
    return run;
  }

  async #readModifyWrite<R>(change: (all: T[]) => R | Promise<R>): Promise<R> {
    const all = await this.readAll();
    const result = await change(all);
    await this.#writeAll(all);
    return result;
  }

  // Erst in eine Hilfsdatei schreiben, dann umbenennen: So bleibt die Datei auch bei einem
  // Absturz mitten im Schreiben heil.
  async #writeAll(items: T[]): Promise<void> {
    await Deno.mkdir(new URL(".", this.#file), { recursive: true });
    const tmp = new URL(`${this.#file.href}.tmp`);
    await Deno.writeTextFile(tmp, JSON.stringify(items, null, 2) + "\n");
    await Deno.rename(tmp, this.#file);
  }
}
