// main.ts – Startpunkt des Backends. Setzt die Teile zusammen und startet den Server.

import { createApp } from "./src/app.ts";
import { EntryRepository } from "./src/repository.ts";
import { SessionStore } from "./src/sessions.ts";
import { UserRepository } from "./src/users.ts";

const port = Number(Deno.env.get("PORT") ?? "8000");
const frontendOrigin = Deno.env.get("FRONTEND_ORIGIN");

// Die JSON-Datei liegt neben main.ts im Ordner data/.
const entries = new EntryRepository(new URL("./data/entries.json", import.meta.url));
const users = new UserRepository(new URL("./data/users.json", import.meta.url));
const sessions = new SessionStore(); // nur im Arbeitsspeicher
const app = createApp({ entries, users, sessions }, frontendOrigin ? [frontendOrigin] : undefined);

Deno.serve({ port }, app.fetch);
