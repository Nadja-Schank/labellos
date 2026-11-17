// sessions.ts – Angemeldet bleiben. Nach dem Login merkt sich der Server: "Token X gehört Benutzer Y".
// Der Browser bekommt nur das Token (in einem Cookie) und schickt es bei jeder Anfrage automatisch mit.
// Die Sitzungen liegen nur im Arbeitsspeicher, weil ich keine Datenbank im Hintergrund habe: Neustart des Servers = alle müssen sich neu anmelden.


export const SESSION_HOURS = 8;

interface Session {
  userId: string;
  expiresAt: number; // Zeitpunkt in Millisekunden
}

export class SessionStore {
  #sessions = new Map<string, Session>();

  create(userId: string, now: number = Date.now()): string {
    // 32 zufällige Bytes = nicht erratbar
    const bytes = crypto.getRandomValues(new Uint8Array(32));
    const token = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
    this.#sessions.set(token, { userId, expiresAt: now + SESSION_HOURS * 3600 * 1000 });
    return token;
  }

  // Gibt die Benutzer-id zurück – oder undefined, wenn das Token unbekannt oder abgelaufen ist.
  getUserId(token: string | undefined, now: number = Date.now()): string | undefined {
    if (!token) return undefined;
    const session = this.#sessions.get(token);
    if (!session) return undefined;
    if (session.expiresAt <= now) {
      this.#sessions.delete(token);
      return undefined;
    }
    return session.userId;
  }

  destroy(token: string | undefined): void {
    if (token) this.#sessions.delete(token);
  }
}
