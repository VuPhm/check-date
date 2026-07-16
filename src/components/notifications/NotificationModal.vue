<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue';
import NotificationContent from './NotificationContent.vue';
import { updateNotificationStats } from '../../../js/notifications.js';

const visible = ref(false);

function open() {
  visible.value = true;
  updateNotificationStats();
}

function close() {
  visible.value = false;
}

onMounted(() => {
  window.addEventListener('coop:notification-modal-open', open);
  window.addEventListener('coop:notification-modal-close', close);
});

onBeforeUnmount(() => {
  window.removeEventListener('coop:notification-modal-open', open);
  window.removeEventListener('coop:notification-modal-close', close);
});
</script>

<template>
  <div v-if="visible" class="apple-modal active notification-modal" role="dialog" aria-modal="true" aria-label="Việc cần xử lý" @click.self="close">
    <div class="apple-modal-content notification-modal__content">
      <div class="apple-modal-header notification-modal__header">
        <h3 class="apple-modal-title">Việc cần xử lý</h3>
        <button class="apple-modal-close-btn" type="button" aria-label="Đóng thông báo" @click="close">×</button>
      </div>
      <div class="apple-modal-body notification-modal__body">
        <NotificationContent />
      </div>
    </div>
  </div>
</template>
