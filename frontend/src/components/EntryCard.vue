<script setup lang="ts">
// EntryCard.vue – Zeigt einen einzigen Eintrag. Die Komponente ruft nichts selbst auf:
// Sie bekommt Daten (props) und meldet Klicks nach oben (emit). Der Elternteil entscheidet, was passiert.
import { computed } from "vue";
import DietBadge from "./DietBadge.vue";
import type { Entry } from "../types";

const props = defineProps<{ entry: Entry }>();
const emit = defineEmits<{ edit: [entry: Entry]; remove: [entry: Entry] }>();

const checkedAtLabel = computed(() =>
  new Date(`${props.entry.checkedAt}T00:00:00`).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
);
</script>

<template>
  <article class="card" :aria-labelledby="`entry-${entry.id}`">
    <header class="card__header">
      <div>
        <h3 :id="`entry-${entry.id}`" class="card__title">{{ entry.name }}</h3>
        <p class="card__meta">{{ entry.category }}</p>
      </div>
      <DietBadge :diet="entry.diet" />
    </header>

    <dl class="facts">
      <div>
        <dt>Zutatenhinweise</dt>
        <dd>{{ entry.ingredientNotes || "Keine Angabe" }}</dd>
      </div>
      <div>
        <dt>Allergene (laut Angabe)</dt>
        <dd v-if="entry.allergens.length > 0">{{ entry.allergens.join(", ") }}</dd>
        <dd v-else>Keine Angabe – das heißt nicht „allergenfrei“.</dd>
      </div>
      <div>
        <dt>Quelle</dt>
        <dd>{{ entry.source || "Keine Angabe" }}</dd>
      </div>
      <div>
        <dt>Geprüft am</dt>
        <dd><time :datetime="entry.checkedAt">{{ checkedAtLabel }}</time></dd>
      </div>
    </dl>

    <section class="analysis" :aria-label="`Zutatenprüfung für ${entry.name}`">
      <h4 class="analysis__title">Zutatenprüfung</h4>
      <p class="analysis__hint">{{ entry.analysis.hint }}</p>

      <ul v-if="entry.analysis.matches.length > 0" class="matches">
        <li v-for="match in entry.analysis.matches" :key="match.groupId">
          <strong>{{ match.label }}:</strong> {{ match.found.join(", ") }}
          <span class="matches__reason">{{ match.reason }}</span>
        </li>
      </ul>

      <p v-for="warning in entry.analysis.warnings" :key="warning" class="warning">
        <strong>Achtung:</strong> {{ warning }}
      </p>
    </section>

    <footer class="card__actions">
      <button type="button" class="button" @click="emit('edit', entry)">
        Bearbeiten<span class="visually-hidden">: {{ entry.name }}</span>
      </button>
      <button type="button" class="button button--danger" @click="emit('remove', entry)">
        Löschen<span class="visually-hidden">: {{ entry.name }}</span>
      </button>
    </footer>
  </article>
</template>
