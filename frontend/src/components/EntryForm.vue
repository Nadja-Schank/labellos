<script setup lang="ts">
// EntryForm.vue – Formular zum Anlegen und Bearbeiten.
// Es kennt die API nicht: Beim Speichern meldet es nur "save" mit den Daten nach oben.
import { computed, onMounted, reactive, ref } from "vue";
import { ALLERGENS, CATEGORIES, DIETS, DIET_LABELS } from "../types";
import type { Entry, EntryInput, FieldError } from "../types";

const props = defineProps<{
  entry: Entry | null; // null = neuer Eintrag, sonst: dieser Eintrag wird bearbeitet
  saving: boolean;
  formError: string | null; // allgemeiner Fehler (z. B. Server nicht erreichbar)
  fieldErrors: FieldError[]; // Fehler vom Backend, pro Feld
}>();
const emit = defineEmits<{ save: [input: EntryInput]; cancel: [] }>();

function todayIso(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// Startwerte: entweder der bestehende Eintrag oder leere Felder.
const form = reactive<EntryInput>({
  name: props.entry?.name ?? "",
  category: props.entry?.category ?? "Backware",
  ingredientNotes: props.entry?.ingredientNotes ?? "",
  allergens: [...(props.entry?.allergens ?? [])],
  diet: props.entry?.diet ?? "UNKNOWN",
  source: props.entry?.source ?? "",
  checkedAt: props.entry?.checkedAt ?? todayIso(),
});

const headingRef = ref<HTMLHeadingElement | null>(null);
// Beim Öffnen springt der Fokus zur Überschrift: Tastatur- und Screenreader-Nutzer merken so, dass sich etwas geöffnet hat.
onMounted(() => headingRef.value?.focus());

const errorsByField = computed(() => {
  const map: Record<string, string> = {};
  for (const e of props.fieldErrors) map[e.field] ??= e.message;
  return map;
});

const needsEvidence = computed(() => form.diet === "VEGAN" || form.diet === "VEGETARIAN");

function submit() {
  emit("save", {
    name: form.name,
    category: form.category,
    ingredientNotes: form.ingredientNotes,
    allergens: [...form.allergens],
    diet: form.diet,
    source: form.source,
    checkedAt: form.checkedAt,
  });
}
</script>

<template>
  <form class="panel form" @submit.prevent="submit" aria-labelledby="form-title">
    <h2 id="form-title" ref="headingRef" tabindex="-1">
      {{ entry ? "Eintrag bearbeiten" : "Neuen Eintrag anlegen" }}
    </h2>

    <p v-if="formError" class="alert" role="alert">{{ formError }}</p>

    <div class="field">
      <label for="f-name">Name *</label>
      <input
        id="f-name"
        v-model="form.name"
        type="text"
        required
        maxlength="100"
        :aria-invalid="!!errorsByField.name"
        :aria-describedby="errorsByField.name ? 'e-name' : undefined"
      />
      <p v-if="errorsByField.name" id="e-name" class="field-error">{{ errorsByField.name }}</p>
    </div>

    <div class="field">
      <label for="f-category">Kategorie *</label>
      <select
        id="f-category"
        v-model="form.category"
        required
        :aria-invalid="!!errorsByField.category"
        :aria-describedby="errorsByField.category ? 'e-category' : undefined"
      >
        <option v-for="c in CATEGORIES" :key="c" :value="c">{{ c }}</option>
      </select>
      <p v-if="errorsByField.category" id="e-category" class="field-error">{{ errorsByField.category }}</p>
    </div>

    <div class="field">
      <label for="f-notes">Zutatenhinweise</label>
      <textarea
        id="f-notes"
        v-model="form.ingredientNotes"
        rows="3"
        maxlength="1000"
        aria-describedby="h-notes"
        :aria-invalid="!!errorsByField.ingredientNotes"
      ></textarea>
      <p id="h-notes" class="hint">Was ist über die Zutaten bekannt? Zum Beispiel „Weizenmehl, Butter, Salz“.</p>
      <p v-if="errorsByField.ingredientNotes" class="field-error">{{ errorsByField.ingredientNotes }}</p>
    </div>

    <fieldset class="field fieldset" aria-describedby="h-allergens">
      <legend>Allergene (laut Angabe)</legend>
      <p id="h-allergens" class="hint">Nur ankreuzen, was angegeben ist. Nichts angekreuzt heißt „keine Angabe“, nicht „allergenfrei“.</p>
      <div class="checkgrid">
        <label v-for="a in ALLERGENS" :key="a" class="check">
          <input v-model="form.allergens" type="checkbox" :value="a" />
          <span>{{ a }}</span>
        </label>
      </div>
      <p v-if="errorsByField.allergens" class="field-error">{{ errorsByField.allergens }}</p>
    </fieldset>

    <fieldset class="field fieldset" aria-describedby="h-diet">
      <legend>Ernährungseinstufung *</legend>
      <p id="h-diet" class="hint">
        <template v-if="needsEvidence">Für „vegan“ und „vegetarisch“ sind Zutatenhinweise und eine Quelle Pflicht.</template>
        <template v-else>Ohne verlässliche Angaben bleibt die Einstufung „unbekannt“.</template>
      </p>
      <div class="radiorow">
        <label v-for="d in DIETS" :key="d" class="check">
          <input v-model="form.diet" type="radio" name="diet" :value="d" />
          <span>{{ DIET_LABELS[d] }}</span>
        </label>
      </div>
      <p v-if="errorsByField.diet" class="field-error">{{ errorsByField.diet }}</p>
    </fieldset>

    <div class="field">
      <label for="f-source">Informationsquelle<span v-if="needsEvidence"> *</span></label>
      <input
        id="f-source"
        v-model="form.source"
        type="text"
        maxlength="200"
        :required="needsEvidence"
        :aria-invalid="!!errorsByField.source"
        :aria-describedby="errorsByField.source ? 'e-source' : 'h-source'"
      />
      <p id="h-source" class="hint">Woher stammt die Information? Zum Beispiel „Aushang in der Mensa“ oder „Auskunft der Bäckerei“.</p>
      <p v-if="errorsByField.source" id="e-source" class="field-error">{{ errorsByField.source }}</p>
    </div>

    <div class="field">
      <label for="f-date">Geprüft am *</label>
      <input
        id="f-date"
        v-model="form.checkedAt"
        type="date"
        required
        :aria-invalid="!!errorsByField.checkedAt"
        :aria-describedby="errorsByField.checkedAt ? 'e-date' : undefined"
      />
      <p v-if="errorsByField.checkedAt" id="e-date" class="field-error">{{ errorsByField.checkedAt }}</p>
    </div>

    <div class="form__actions">
      <button type="submit" class="button button--primary" :disabled="saving">
        {{ saving ? "Speichern …" : "Speichern" }}
      </button>
      <button type="button" class="button" :disabled="saving" @click="emit('cancel')">Abbrechen</button>
    </div>
    <p class="hint">Mit * markierte Felder sind Pflichtfelder.</p>
  </form>
</template>
