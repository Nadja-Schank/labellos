<script setup lang="ts">
// AuthForm.vue – Anmelden oder Registrieren. Die Komponente kennt die API nicht,
// sie meldet nur "submit" mit Modus und Daten nach oben (wie EntryForm).
import { computed, ref } from "vue";
import type { Credentials, FieldError } from "../types";

const props = defineProps<{
  busy: boolean;
  error: string | null;
  fieldErrors: FieldError[];
}>();
const emit = defineEmits<{ submit: [mode: "login" | "register", credentials: Credentials] }>();

const mode = ref<"login" | "register">("login");
const username = ref("");
const password = ref("");

const isLogin = computed(() => mode.value === "login");
const errorFor = (field: string) => props.fieldErrors.find((e) => e.field === field)?.message;

function onSubmit() {
  emit("submit", mode.value, { username: username.value, password: password.value });
}
</script>

<template>
  <section class="card auth" aria-labelledby="auth-title">
    <h2 id="auth-title">{{ isLogin ? "Anmelden" : "Konto anlegen" }}</h2>
    <p>
      Deine Einträge gehören dir: Jede Person sieht nur ihre eigenen. Das Passwort wird nie im Klartext
      gespeichert.
    </p>

    <form novalidate @submit.prevent="onSubmit">
      <p v-if="error" class="alert" role="alert">{{ error }}</p>

      <div class="field">
        <label for="auth-username">Benutzername</label>
        <input
          id="auth-username"
          v-model="username"
          type="text"
          autocomplete="username"
          required
          :aria-invalid="errorFor('username') ? 'true' : undefined"
          :aria-describedby="errorFor('username') ? 'auth-username-error' : undefined"
        />
        <p v-if="errorFor('username')" id="auth-username-error" class="field-error">{{ errorFor("username") }}</p>
      </div>

      <div class="field">
        <label for="auth-password">Passwort</label>
        <input
          id="auth-password"
          v-model="password"
          type="password"
          :autocomplete="isLogin ? 'current-password' : 'new-password'"
          required
          :aria-invalid="errorFor('password') ? 'true' : undefined"
          :aria-describedby="errorFor('password') ? 'auth-password-error' : undefined"
        />
        <p v-if="errorFor('password')" id="auth-password-error" class="field-error">{{ errorFor("password") }}</p>
      </div>

      <div class="form__actions">
        <button type="submit" class="button button--primary" :disabled="busy">
          {{ busy ? "Bitte warten …" : isLogin ? "Anmelden" : "Konto anlegen" }}
        </button>
        <button type="button" class="button button--quiet" @click="mode = isLogin ? 'register' : 'login'">
          {{ isLogin ? "Noch kein Konto? Registrieren" : "Schon ein Konto? Anmelden" }}
        </button>
      </div>
      <p v-if="!isLogin" class="hint">Benutzername: 3–30 Zeichen (Buchstaben, Ziffern, _ . -). Passwort: mindestens 8 Zeichen.</p>
    </form>
  </section>
</template>
