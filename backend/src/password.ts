// password.ts – Passwörter sicher speichern.
// Regel 1: Das Passwort selbst wird NIE gespeichert, nur ein "Hash" (Einwegfunktion: nicht umkehrbar).
// Regel 2: Jedes Passwort bekommt ein eigenes zufälliges Salt. Zwei Benutzer mit gleichem Passwort
//          haben dadurch verschiedene Hashes
// Regel 3: Der Hash ist langsam, damit Raten sich nicht lohnt.
// Ich benutze die eingebaute Web-Crypto-Funktion.

const ITERATIONS = 210_000;
const HASH_BYTES = 32;

function toBase64(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes));
}

function fromBase64(text: string): Uint8Array {
  return Uint8Array.from(atob(text), (c) => c.charCodeAt(0));
}

async function derive(password: string, salt: Uint8Array, iterations: number): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, [
    "deriveBits",
  ]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt: salt as BufferSource, iterations },
    key,
    HASH_BYTES * 8,
  );
  return new Uint8Array(bits);
}

// Ergebnis z. B.:  pbkdf2$210000$<Salt>$<Hash>   (alles, was man zum späteren Prüfen braucht)
export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await derive(password, salt, ITERATIONS);
  return `pbkdf2$${ITERATIONS}$${toBase64(salt)}$${toBase64(hash)}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [kind, iterations, salt, expected] = stored.split("$");
  if (kind !== "pbkdf2" || !iterations || !salt || !expected) return false;
  const actual = await derive(password, fromBase64(salt), Number(iterations));
  const wanted = fromBase64(expected);
  if (actual.length !== wanted.length) return false;
  // Vergleich ohne frühes Abbrechen, damit die Dauer nichts über die Übereinstimmung verrät.
  let diff = 0;
  for (let i = 0; i < actual.length; i++) diff |= actual[i] ^ wanted[i];
  return diff === 0;
}
