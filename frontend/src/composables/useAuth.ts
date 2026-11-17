// useAuth.ts – Merkt sich im Frontend, wer angemeldet ist (nur Name und id – kein Passwort, kein Token).
// Das eigentliche Login-Token steckt in einem HttpOnly-Cookie, auf das JavaScript gar nicht zugreifen kann.

import { onMounted, ref } from "vue";
import { fetchMe, login, logout, register, setUnauthorizedHandler, ApiRequestError } from "../api/client";
import type { Credentials, FieldError, PublicUser } from "../types";

export function useAuth() {
  const user = ref<PublicUser | null>(null);
  const checking = ref(true); // true, solange wir noch beim Server nachfragen
  const busy = ref(false);
  const error = ref<string | null>(null);
  const fieldErrors = ref<FieldError[]>([]);

  // Wenn irgendeine Anfrage "nicht angemeldet" meldet, zurück zur Anmeldeseite.
  setUnauthorizedHandler(() => {
    user.value = null;
  });

  onMounted(async () => {
    try {
      user.value = await fetchMe(); // klappt nur, wenn noch ein gültiges Cookie da ist
    } catch {
      user.value = null;
    } finally {
      checking.value = false;
    }
  });

  async function submit(mode: "login" | "register", credentials: Credentials) {
    busy.value = true;
    error.value = null;
    fieldErrors.value = [];
    try {
      user.value = mode === "login" ? await login(credentials) : await register(credentials);
    } catch (e) {
      if (e instanceof ApiRequestError) {
        error.value = e.message;
        fieldErrors.value = e.fieldErrors;
      } else {
        error.value = "Unbekannter Fehler bei der Anmeldung.";
      }
    } finally {
      busy.value = false;
    }
  }

  async function signOut() {
    try {
      await logout();
    } finally {
      user.value = null;
    }
  }

  return { user, checking, busy, error, fieldErrors, submit, signOut };
}
