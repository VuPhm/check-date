<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue';

type Theme = 'safe' | 'warning' | 'danger' | 'other' | 'expired';
interface ResultDetail { label: string; value: string; highlight?: boolean; }
interface ResultModalData {
  theme: Theme;
  title: string;
  mainLabel: string;
  mainValue?: string;
  subLines: string[];
  details?: ResultDetail[];
  kphType?: 'TPCN' | 'TPTS';
}

const visible = ref(false);
const result = ref<ResultModalData | null>(null);

function open(event: Event) {
  result.value = (event as CustomEvent<ResultModalData>).detail;
  visible.value = true;
}

function close() { visible.value = false; }

function createKph() {
  close();
  window.dispatchEvent(new CustomEvent('coop:create-kph-from-calculation'));
}

onMounted(() => {
  window.addEventListener('coop:result-modal-open', open);
  window.addEventListener('coop:result-modal-close', close);
});
onBeforeUnmount(() => {
  window.removeEventListener('coop:result-modal-open', open);
  window.removeEventListener('coop:result-modal-close', close);
});
</script>

<template>
  <div v-if="visible && result" class="apple-modal active" role="dialog" aria-modal="true" :aria-label="result.title" @click.self="close">
    <div class="apple-modal-content result-modal-content" :class="`result-theme-${result.theme}`">
      <div class="result-modal-header">
        <h3 class="apple-modal-title">{{ result.title }}</h3>
        <button class="apple-modal-close-btn" type="button" aria-label="Đóng" @click="close">&times;</button>
      </div>
      <div class="result-modal-body">
        <div class="result-modal-icon-container" aria-hidden="true">
          <svg v-if="result.theme === 'safe'" viewBox="0 0 24 24"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
          <svg v-else-if="result.theme === 'warning'" viewBox="0 0 24 24"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          <svg v-else-if="result.theme === 'danger'" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
          <svg v-else-if="result.theme === 'expired'" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          <svg v-else viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
        </div>
        <div class="result-modal-main-text">{{ result.mainLabel }}<strong v-if="result.mainValue">: {{ result.mainValue }}</strong></div>
        <div class="result-modal-sub-text"><template v-for="(line, index) in result.subLines" :key="line"><span>{{ line }}</span><br v-if="index < result.subLines.length - 1"></template></div>
        <div v-if="result.details?.length" class="result-modal-details">
          <div v-for="detail in result.details" :key="detail.label" class="result-modal-details__row" :class="{ 'result-modal-details__row--result': detail.highlight }"><span>{{ detail.label }}</span><strong>{{ detail.value }}</strong></div>
        </div>
      </div>
      <div class="kph-form-actions result-modal-actions">
        <button v-if="result.kphType" class="btn-action" :class="{ 'btn-create-kph-tpts': result.kphType === 'TPTS' }" type="button" @click="createKph">Tạo phiếu KPH ({{ result.kphType }})</button>
        <button :class="result.title === 'Lỗi tra cứu' ? 'btn-action btn-danger result-modal-close-full' : 'btn-secondary'" type="button" @click="close">Đồng ý</button>
      </div>
    </div>
  </div>
</template>
