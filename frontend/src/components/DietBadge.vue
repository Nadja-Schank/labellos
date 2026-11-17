<script setup lang="ts">
// DietBadge.vue – Zeigt die Ernährungseinstufung als kleines "Etikett".
// Die Bedeutung steckt auch im Text wegen Barrierefreiheit.
import { DIET_LABELS } from "../types";
import type { Diet } from "../types";

defineProps<{ diet: Diet }>();
</script>

<template>
  <span class="tag" :class="`tag--${diet.toLowerCase()}`">
    <span class="visually-hidden">Einstufung: </span>{{ DIET_LABELS[diet] }}
  </span>
</template>
