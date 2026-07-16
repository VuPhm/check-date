<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue';
import { useAppStore } from '../../stores/app';

const KEY = 'coop_first_run_setup_complete';
const appStore = useAppStore();
const open = ref(false);

function setVisibility(value: boolean) { window.dispatchEvent(new CustomEvent('coop:first-run-visibility', { detail: value })); }
function dismiss() { localStorage.setItem(KEY, '1'); open.value = false; setVisibility(false); }
function openAuth(mode: 'manager' | 'employee') { dismiss(); window.dispatchEvent(new CustomEvent('coop:sync-auth-open', { detail: mode })); }
function reopen() { open.value = true; setVisibility(true); }

onMounted(() => {
  open.value = !localStorage.getItem(KEY) && !appStore.session;
  setVisibility(open.value);
  window.addEventListener('coop:open-setup', reopen);
});
onBeforeUnmount(() => { window.removeEventListener('coop:open-setup', reopen); setVisibility(false); });
</script>

<template>
  <div v-if="open" class="first-run-backdrop" role="dialog" aria-modal="true" aria-label="Thiết lập ứng dụng" @click.self="dismiss">
    <section class="first-run-card">
      <p class="first-run-card__eyebrow">Bắt đầu sử dụng</p>
      <h2>Thiết lập Co.op Date</h2>
      <p>Chọn cách kết nối cửa hàng hoặc thiết lập sau.</p>
      <div class="first-run-actions">
        <button class="btn-action" type="button" @click="openAuth('manager')">Đăng nhập CHT</button>
        <button class="btn-secondary" type="button" @click="openAuth('employee')">Tham gia cửa hàng</button>
      </div>
      <button class="first-run-dismiss" type="button" @click="dismiss">Thiết lập sau</button>
    </section>
  </div>
</template>
