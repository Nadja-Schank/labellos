// repository.ts – Der Ort für Einträge. Hier steckt auch die Datentrennung:
// Jede Funktion bekommt die ownerId des angemeldeten Benutzers und liefert/ändert nur seine Einträge.
// Fremde Einträge verhalten sich wie "nicht vorhanden" (404).

import { JsonStore } from "./store.ts";
import type { Entry, EntryInput } from "./types.ts";

export class EntryRepository {
  #store: JsonStore<Entry>;

  constructor(file: URL) {
    this.#store = new JsonStore<Entry>(file);
  }

  async list(ownerId: string): Promise<Entry[]> {
    const all = await this.#store.readAll();
    return all.filter((e) => e.ownerId === ownerId);
  }

  async get(id: string, ownerId: string): Promise<Entry | undefined> {
    const all = await this.#store.readAll();
    return all.find((e) => e.id === id && e.ownerId === ownerId);
  }

  create(input: EntryInput, ownerId: string): Promise<Entry> {
    return this.#store.modify((all) => {
      const now = new Date().toISOString();
      const entry: Entry = { ...input, id: crypto.randomUUID(), ownerId, createdAt: now, updatedAt: now };
      all.push(entry);
      return entry;
    });
  }

  update(id: string, ownerId: string, input: EntryInput): Promise<Entry | undefined> {
    return this.#store.modify((all) => {
      const index = all.findIndex((e) => e.id === id && e.ownerId === ownerId);
      if (index === -1) return undefined;
      const updated: Entry = {
        ...input,
        id,
        ownerId,
        createdAt: all[index].createdAt,
        updatedAt: new Date().toISOString(),
      };
      all[index] = updated;
      return updated;
    });
  }

  remove(id: string, ownerId: string): Promise<boolean> {
    return this.#store.modify((all) => {
      const index = all.findIndex((e) => e.id === id && e.ownerId === ownerId);
      if (index === -1) return false;
      all.splice(index, 1);
      return true;
    });
  }
}
