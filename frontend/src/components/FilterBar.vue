<script setup lang="ts">
// FilterBar.vue – Die Suchleiste. Sie speichert selbst nichts:
// Die Werte gehören dem Elternteil (App.vue). v-model:q usw. verbinden beide Seiten.
import { ALLERGENS, CATEGORIES, DIETS, DIET_LABELS } from "../types";
import type { Allergen, Category, Diet } from "../types";

const q = defineModel<string>("q", { required: true });
const category = defineModel<Category | "">("category", { required: true });
const diet = defineModel<Diet | "">("diet", { required: true });
const allergen = defineModel<Allergen | "">("allergen", { required: true });

defineProps<{ active: boolean }>();
const emit = defineEmits<{ reset: [] }>();
</script>

<template>
  <form class="filter" role="search" aria-label="Einträge filtern" @submit.prevent>
    <div class="field field--wide">
      <label for="filter-q">Suche</label>
      <input id="filter-q" v-model="q" type="search" placeholder="Name, Zutat oder Quelle" />
    </div>

    <div class="field">
      <label for="filter-category">Kategorie</label>
      <select id="filter-category" v-model="category">
        <option value="">Alle</option>
        <option v-for="c in CATEGORIES" :key="c" :value="c">{{ c }}</option>
      </select>
    </div>

    <div class="field">
      <label for="filter-diet">Einstufung</label>
      <select id="filter-diet" v-model="diet">
        <option value="">Alle</option>
        <option v-for="d in DIETS" :key="d" :value="d">{{ DIET_LABELS[d] }}</option>
      </select>
    </div>

    <div class="field">
      <label for="filter-allergen">Nennt Allergen</label>
      <select id="filter-allergen" v-model="allergen" aria-describedby="filter-allergen-hint">
        <option value="">Egal</option>
        <option v-for="a in ALLERGENS" :key="a" :value="a">{{ a }}</option>
      </select>
    </div>

    <p id="filter-allergen-hint" class="hint filter__hint">
      „Nennt Allergen“ zeigt Einträge, bei denen dieses Allergen angegeben ist. Andere Einträge
      sind nicht automatisch frei davon.
    </p>

    <button v-if="active" type="button" class="button button--quiet" @click="emit('reset')">
      Filter zurücksetzen
    </button>
  </form>
</template>
