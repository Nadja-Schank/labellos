<script setup lang="ts">
// App.vue – Das Gerüst der Seite. Es entscheidet nur: angemeldet -> Einträge, sonst -> Anmeldeformular.
import AuthForm from "./components/AuthForm.vue";
import EntriesView from "./EntriesView.vue";
import { useAuth } from "./composables/useAuth";

const { user, checking, busy, error, fieldErrors, submit, signOut } = useAuth();
</script>

<template>
  <a class="skip-link" href="#main">Zum Inhalt springen</a>

  <header class="site-header">
    <div class="wrap site-header__row">
      <div>
        <h1 class="site-title">LabelLos</h1>
        <p class="site-sub">Was steht drauf, wenn nichts draufsteht? Gesammelte Hinweise zu unverpackten Lebensmitteln.</p>
      </div>
      <p v-if="user" class="site-user">
        Angemeldet als <strong>{{ user.username }}</strong>
        <button type="button" class="button button--quiet" @click="signOut">Abmelden</button>
      </p>
    </div>
  </header>

  <main id="main" class="wrap" tabindex="-1">
    <aside class="notice" aria-labelledby="notice-title">
      <h2 id="notice-title" class="notice__title">Wichtiger Hinweis</h2>
      <p>
        LabelLos sammelt Angaben, die Nutzer eingetragen haben. Die App gibt <strong>keine Garantie</strong>
        dafür, dass ein Lebensmittel vegan oder frei von Allergenen ist. Bei Allergien oder Unverträglichkeiten
        bitte immer direkt beim Anbieter nachfragen.
      </p>
    </aside>

    <p v-if="checking" class="state" role="status">Anmeldung wird geprüft …</p>
    <!-- :key sorgt dafür, dass nach Abmelden/Anmelden alles frisch startet (kein Rest vom vorigen Benutzer) -->
    <EntriesView v-else-if="user" :key="user.id" />
    <AuthForm v-else :busy="busy" :error="error" :field-errors="fieldErrors" @submit="submit" />
  </main>

</template>
