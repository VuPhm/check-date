<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue';

const imageUrl = ref('');

function open(event: Event) { imageUrl.value = (event as CustomEvent<string>).detail; }
function close() { imageUrl.value = ''; }

onMounted(() => {
  window.addEventListener('coop:image-modal-open', open);
  window.addEventListener('coop:image-modal-close', close);
});
onBeforeUnmount(() => {
  window.removeEventListener('coop:image-modal-open', open);
  window.removeEventListener('coop:image-modal-close', close);
});
</script>

<template>
  <div v-if="imageUrl" class="apple-modal active image-modal" role="dialog" aria-modal="true" aria-label="Ảnh minh chứng" @click.self="close">
    <div class="apple-modal-content image-modal__content">
      <button class="image-modal__close" type="button" aria-label="Đóng ảnh" title="Đóng ảnh" @click="close">×</button>
      <img :src="imageUrl" alt="Ảnh minh chứng phóng to" class="image-modal__image">
    </div>
  </div>
</template>
