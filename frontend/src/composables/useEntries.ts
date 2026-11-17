// useEntries.ts – Ein "Composable": wiederverwendbare Logik mit Vue-Zuständen (Composition API).
// Es hält die Liste, den Ladezustand, den Fehler und die Filter – und lädt neu, wenn sich ein Filter ändert.

import { computed, onMounted, onUnmounted, reactive, ref, watch } from "vue";
import { listEntries } from "../api/client";
import type { Entry, FilterState } from "../types";

export function useEntries() {
  const entries = ref<Entry[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);
  const filter = reactive<FilterState>({ q: "", category: "", diet: "", allergen: "" });

  const hasActiveFilter = computed(() => Object.values(filter).some((v) => v !== ""));

  // Jede Anfrage bekommt eine Nummer. So überschreibt eine späte, alte Antwort nie eine neuere.
  let requestCounter = 0;

  async function load() {
    const myRequest = ++requestCounter;
    loading.value = true;
    error.value = null;
    try {
      const result = await listEntries(filter);
      if (myRequest !== requestCounter) return;
      entries.value = result;
    } catch (e) {
      if (myRequest !== requestCounter) return;
      error.value = e instanceof Error ? e.message : "Unbekannter Fehler beim Laden.";
    } finally {
      if (myRequest === requestCounter) loading.value = false;
    }
  }

  function resetFilter() {
    filter.q = "";
    filter.category = "";
    filter.diet = "";
    filter.allergen = "";
  }

  // Bei Filteränderung kurz warten (300 ms), damit nicht bei jedem Tastendruck eine Anfrage rausgeht.
  let timer: number | undefined;
  watch(filter, () => {
    window.clearTimeout(timer);
    timer = window.setTimeout(load, 300);
  });

  onMounted(load);
  onUnmounted(() => window.clearTimeout(timer));

  return { entries, loading, error, filter, hasActiveFilter, resetFilter, reload: load };
}
