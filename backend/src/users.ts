// users.ts – Benutzerkonten in einer JSON-Datei (data/users.json). Gespeichert wird nur der Passwort-Hash.

import { JsonStore } from "./store.ts";
import type { User } from "./types.ts";

export class UserRepository {
  #store: JsonStore<User>;

  constructor(file: URL) {
    this.#store = new JsonStore<User>(file);
  }

  // Benutzernamen sind nicht von Groß-/Kleinschreibung abhängig ("Anna" = "anna").
  async findByUsername(username: string): Promise<User | undefined> {
    const all = await this.#store.readAll();
    return all.find((u) => u.username.toLowerCase() === username.toLowerCase());
  }

  async findById(id: string): Promise<User | undefined> {
    const all = await this.#store.readAll();
    return all.find((u) => u.id === id);
  }

  // Gibt undefined zurück, wenn der Name schon vergeben ist (Prüfen + Anlegen in einem Schritt, ohne Lücke).
  create(username: string, passwordHash: string): Promise<User | undefined> {
    return this.#store.modify((all) => {
      if (all.some((u) => u.username.toLowerCase() === username.toLowerCase())) return undefined;
      const user: User = {
        id: crypto.randomUUID(),
        username,
        passwordHash,
        createdAt: new Date().toISOString(),
      };
      all.push(user);
      return user;
    });
  }
}
