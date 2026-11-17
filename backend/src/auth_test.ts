// Tests für Passwörter, Sitzungen und Anmeldedaten. Starten mit:  deno task test
import { assert, assertEquals, assertNotEquals } from "@std/assert";
import { hashPassword, verifyPassword } from "./password.ts";
import { SessionStore } from "./sessions.ts";
import { validateCredentials } from "./validation.ts";

Deno.test("Passwort: richtiges Passwort wird erkannt, falsches nicht", async () => {
  const hash = await hashPassword("geheim-1234");
  assert(await verifyPassword("geheim-1234", hash));
  assert(!(await verifyPassword("geheim-12345", hash)));
});

Deno.test("Passwort: gleiches Passwort ergibt wegen des Salzes verschiedene Hashes", async () => {
  const a = await hashPassword("geheim-1234");
  const b = await hashPassword("geheim-1234");
  assertNotEquals(a, b);
  assert(!a.includes("geheim-1234")); // Klartext steht nirgends im Hash
});

Deno.test("Passwort: kaputter gespeicherter Hash führt zu 'falsch', nicht zum Absturz", async () => {
  assert(!(await verifyPassword("x", "kein-hash")));
});

Deno.test("Session: Token gehört zum Benutzer, läuft ab und kann beendet werden", () => {
  const sessions = new SessionStore();
  const token = sessions.create("u1", 0);
  assertEquals(sessions.getUserId(token, 1000), "u1");
  assertEquals(sessions.getUserId("erfunden", 1000), undefined);
  assertEquals(sessions.getUserId(undefined, 1000), undefined);
  assertEquals(sessions.getUserId(token, 9 * 3600 * 1000), undefined); // nach 8 Stunden abgelaufen
  const second = sessions.create("u2", 0);
  sessions.destroy(second);
  assertEquals(sessions.getUserId(second, 1000), undefined);
});

Deno.test("Anmeldedaten: Registrieren prüft Regeln, Login nur Vorhandensein", () => {
  assert(!validateCredentials({ username: "ab", password: "langgenug1" }, true).ok);
  assert(!validateCredentials({ username: "anna", password: "kurz" }, true).ok);
  assert(!validateCredentials({ username: "a b!", password: "langgenug1" }, true).ok);
  assert(validateCredentials({ username: "anna", password: "langgenug1" }, true).ok);
  assert(validateCredentials({ username: "anna", password: "kurz" }, false).ok);
  assert(!validateCredentials({ username: "", password: "" }, false).ok);
  assert(!validateCredentials(null, false).ok);
});
