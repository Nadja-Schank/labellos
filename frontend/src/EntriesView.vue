<script setup lang="ts">
// EntriesView.vue – Die Einträge-Seite (nur für angemeldete Benutzer). Sie verbindet alles:
// Filter -> Liste laden (useEntries) -> Karten anzeigen; Formular -> API -> Liste neu laden.
import { ref } from "vue";
import { createEntry, deleteEntry, updateEntry, ApiRequestError } from "./api/client";
import EntryCard from "./components/EntryCard.vue";
import EntryForm from "./components/EntryForm.vue";
import FilterBar from "./components/FilterBar.vue";
import { useEntries } from "./composables/useEntries";
import type { Entry, EntryInput, FieldError } from "./types";

const { entries, loading, error, filter, hasActiveFilter, resetFilter, reload } = useEntries();

const showForm = ref(false);
const editing = ref<Entry | null>(null);
const saving = ref(false);
const formError = ref<string | null>(null);
const fieldErrors = ref<FieldError[]>([]);
const actionError = ref<string | null>(null);
const statusMessage = ref(""); // wird von Screenreadern vorgelesen (aria-live)

function openCreate() {
  editing.value = null;
  clearFormErrors();
  showForm.value = true;
}

function openEdit(entry: Entry) {
  editing.value = entry;
  clearFormErrors();
  showForm.value = true;
}

function closeForm() {
  showForm.value = false;
  editing.value = null;
  clearFormErrors();
}

function clearFormErrors() {
  formError.value = null;
  fieldErrors.value = [];
}

// Das passiert nach einem Klick auf "Speichern":
async function handleSave(input: EntryInput) {
  saving.value = true;
  clearFormErrors();
  try {
    if (editing.value) {
      await updateEntry(editing.value.id, input); // PUT /api/entries/:id
      statusMessage.value = `„${input.name}“ wurde aktualisiert.`;
    } else {
      await createEntry(input); // POST /api/entries
      statusMessage.value = `„${input.name}“ wurde gespeichert.`;
    }
    closeForm();
    await reload(); // Liste neu vom Server holen
  } catch (e) {
    if (e instanceof ApiRequestError) {
      formError.value = e.message;
      fieldErrors.value = e.fieldErrors;
    } else {
      formError.value = "Unbekannter Fehler beim Speichern.";
    }
  } finally {
    saving.value = false;
  }
}

async function handleRemove(entry: Entry) {
  if (!window.confirm(`Eintrag „${entry.name}“ wirklich löschen?`)) return;
  actionError.value = null;
  try {
    await deleteEntry(entry.id); // DELETE /api/entries/:id
    statusMessage.value = `„${entry.name}“ wurde gelöscht.`;
    await reload();
  } catch (e) {
    actionError.value = e instanceof Error ? e.message : "Unbekannter Fehler beim Löschen.";
  }
}
</script>

<template>
  <div>
    <div class="toolbar">
      <h2>Einträge</h2>
      <button v-if="!showForm" type="button" class="button button--primary" @click="openCreate">
        Neuen Eintrag anlegen
      </button>
    </div>

    <EntryForm
      v-if="showForm"
      :key="editing?.id ?? 'new'"
      :entry="editing"
      :saving="saving"
      :form-error="formError"
      :field-errors="fieldErrors"
      @save="handleSave"
      @cancel="closeForm"
    />

    <FilterBar
      v-model:q="filter.q"
      v-model:category="filter.category"
      v-model:diet="filter.diet"
      v-model:allergen="filter.allergen"
      :active="hasActiveFilter"
      @reset="resetFilter"
    />

    <p v-if="actionError" class="alert" role="alert">{{ actionError }}</p>
    <p class="visually-hidden" role="status" aria-live="polite">{{ statusMessage }}</p>

    <p v-if="loading" class="state" role="status">Einträge werden geladen …</p>

    <div v-else-if="error" class="alert" role="alert">
      <p>{{ error }}</p>
      <button type="button" class="button" @click="reload">Erneut versuchen</button>
    </div>

    <p v-else-if="entries.length === 0" class="state">
      <template v-if="hasActiveFilter">Keine Einträge passen zu diesen Filtern. Ändere oder setze die Filter zurück.</template>
      <template v-else>Noch keine Einträge. Lege den ersten Eintrag mit „Neuen Eintrag anlegen“ an.</template>
    </p>

    <ul v-else class="entry-list">
      <li v-for="entry in entries" :key="entry.id">
        <EntryCard :entry="entry" @edit="openEdit" @remove="handleRemove" />
      </li>
    </ul>
  </div>
</template>
