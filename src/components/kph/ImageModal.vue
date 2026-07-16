<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue';

const imageUrl = ref('');

function open(event: Event) { imageUrl.value = (event as CustomEvent<string>).detail; }
function close() { imageUrl.value = ''; }
function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape' && imageUrl.value) close();
}

onMounted(() => {
  window.addEventListener('coop:image-modal-open', open);
  window.addEventListener('coop:image-modal-close', close);
  window.addEventListener('keydown', handleKeydown);
});
onBeforeUnmount(() => {
  window.removeEventListener('coop:image-modal-open', open);
  window.removeEventListener('coop:image-modal-close', close);
  window.removeEventListener('keydown', handleKeydown);
});
</script>

<template>
  <div v-if="imageUrl" class="apple-modal active image-modal" role="dialog" aria-modal="true" aria-label="Ảnh minh chứng" @click="close">
    <div class="apple-modal-content image-modal__content">
      <img :src="imageUrl" alt="Ảnh minh chứng phóng to" class="image-modal__image">
    </div>
  </div>
</template>
