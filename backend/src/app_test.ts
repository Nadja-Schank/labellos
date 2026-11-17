// Test der ganzen API inklusive Anmeldung und Datentrennung. Starten mit:  deno task test
import { assert, assertEquals } from "@std/assert";
import { createApp } from "./app.ts";
import { EntryRepository } from "./repository.ts";
import { SessionStore } from "./sessions.ts";
import { UserRepository } from "./users.ts";

async function setup() {
  const dir = await Deno.makeTempDir();
  const base = new URL(`file://${dir}/`);
  const app = createApp({
    entries: new EntryRepository(new URL("entries.json", base)),
    users: new UserRepository(new URL("users.json", base)),
    sessions: new SessionStore(),
  });
  const send = (path: string, init: RequestInit & { cookie?: string } = {}) => {
    const headers: Record<string, string> = {};
    if (init.body) headers["Content-Type"] = "application/json";
    if (init.cookie) headers["Cookie"] = init.cookie;
    return app.request(path, { ...init, headers });
  };
  const register = async (username: string) => {
    const res = await send("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ username, password: "passwort-1234" }),
    });
    assertEquals(res.status, 201);
    const setCookie = res.headers.get("set-cookie") ?? "";
    assert(setCookie.includes("HttpOnly"));
    return setCookie.split(";")[0]; // "labellos_session=<token>"
  };
  return { send, register };
}

const entryBody = JSON.stringify({ name: "Brezel", category: "Backware", diet: "UNKNOWN", checkedAt: "2026-10-01" });

Deno.test("ohne Anmeldung: 401", async () => {
  const { send } = await setup();
  const res = await send("/api/entries");
  assertEquals(res.status, 401);
  assertEquals((await res.json()).error.code, "UNAUTHENTICATED");
});

Deno.test("Datentrennung: Benutzer B sieht und ändert nichts von Benutzer A", async () => {
  const { send, register } = await setup();
  const a = await register("anna");
  const b = await register("ben");

  const created = await send("/api/entries", { method: "POST", body: entryBody, cookie: a });
  assertEquals(created.status, 201);
  const { id } = await created.json();

  assertEquals((await (await send("/api/entries", { cookie: a })).json()).length, 1);
  assertEquals((await (await send("/api/entries", { cookie: b })).json()).length, 0);
  assertEquals((await send(`/api/entries/${id}`, { cookie: b })).status, 404);
  assertEquals((await send(`/api/entries/${id}`, { method: "DELETE", cookie: b })).status, 404);
  assertEquals((await send(`/api/entries/${id}`, { cookie: a })).status, 200);
});

Deno.test("Login: falsches Passwort 401, richtiges Passwort 200, doppelter Name 409, Logout beendet Sitzung", async () => {
  const { send, register } = await setup();
  const cookie = await register("anna");
  const dup = await send("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({ username: "ANNA", password: "passwort-1234" }),
  });
  assertEquals(dup.status, 409);
  const bad = await send("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ username: "anna", password: "falsch-falsch" }),
  });
  assertEquals(bad.status, 401);
  const good = await send("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ username: "anna", password: "passwort-1234" }),
  });
  assertEquals(good.status, 200);
  assertEquals((await send("/api/auth/me", { cookie })).status, 200);
  assertEquals((await send("/api/auth/logout", { method: "POST", cookie })).status, 204);
  assertEquals((await send("/api/auth/me", { cookie })).status, 401);
});
