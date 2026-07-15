<script setup lang="ts">
import { onMounted } from 'vue';
import { useAppStore } from './stores/app';

const appStore = useAppStore();

onMounted(() => {
  appStore.hydrateEndpoint();
  appStore.bindConnectivityEvents();
});
</script>

<template>
  <div id="vue-runtime-ready" hidden aria-hidden="true" />
</template>
