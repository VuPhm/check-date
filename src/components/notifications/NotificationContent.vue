<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { closeNotificationModal, handleNotificationHistoryStateClick, handleNotificationKphClick } from '../../../js/notifications.js';
import { historyData } from '../../../js/history.js';
import { kphLogs, switchTab } from '../../../js/kph.js';
import { useAppStore } from '../../stores/app';

const appStore = useAppStore();
const revision = ref(0);
const workEvents = computed(() => appStore.actionableEvents.filter((event) => !event.type.startsWith('employee.')).slice(0, 50));
const pending = computed(() => { revision.value; return {
  tpcn: kphLogs.filter((item) => (!item.loaiKph || item.loaiKph === 'TPCN') && (item.trangThaiDuyet || 'cho_duyet') === 'cho_duyet').length,
  tpts: kphLogs.filter((item) => item.loaiKph === 'TPTS' && (item.trangThaiDuyet || 'cho_duyet') === 'cho_duyet').length,
}; });
const lookup = computed(() => { revision.value; return {
  warning: historyData.filter((item) => item.alertType === 'warning').length,
  danger: historyData.filter((item) => item.alertType === 'danger').length,
  expired: historyData.filter((item) => item.alertType === 'expired').length,
}; });
function isUnread(id: string) { return !appStore.seenActivityIds.includes(id); }
function openWorkEvent(id: string) { appStore.markActivityRead([id]); closeNotificationModal(); switchTab('kph'); }
function markAllWorkRead() { appStore.markActivityRead(workEvents.value.map((event) => event.id)); }
function eventTime(value: string) { return new Date(value).toLocaleString('vi-VN'); }
function refresh() { revision.value += 1; }
onMounted(() => window.addEventListener('coop:notifications-changed', refresh));
onBeforeUnmount(() => window.removeEventListener('coop:notifications-changed', refresh));
</script>

<template>
  <div class="notif-section">
    <div class="notif-section-title-row"><h4 class="notif-section-title">Việc cần xử lý</h4><button v-if="workEvents.some((event) => isUnread(event.id))" type="button" class="notif-mark-read" @click="markAllWorkRead">Đã xem tất cả</button></div>
    <div v-if="!appStore.session" class="history-empty notif-empty">Đăng nhập cửa hàng để nhận thông báo.</div>
    <div v-else-if="workEvents.length === 0" class="history-empty notif-empty">Không có thông báo mới.</div>
    <button v-for="event in workEvents" v-else :key="event.id" type="button" class="notif-item notif-work-item" :class="{ 'is-unread': isUnread(event.id) }" @click="openWorkEvent(event.id)"><span class="notif-item__event-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z M14 2v6h6 M8 14h8"/></svg></span><span class="notif-item__main"><span class="notif-item__topic">Phiếu KPH cần chú ý</span><span class="notif-item__title-row">{{ event.summary }}</span><span class="notif-item__date-info">{{ eventTime(event.createdAt) }}</span></span><span class="notif-item__chevron">›</span></button>
  </div>
  <div class="notif-section notif-section--stats">
    <h4 class="notif-section-title">Hàng Không Phù Hợp (KPH) chờ duyệt</h4>
    <div class="task-stat-grid task-stat-grid--modal">
      <button class="task-stat-card is-tpcn" type="button" @click="handleNotificationKphClick('TPCN')"><span class="task-stat-card__icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6"/><path d="M8 14h8"/></svg></span><span><strong>{{ pending.tpcn }}</strong><small>Phiếu TPCN</small></span><span class="task-stat-card__arrow">›</span></button>
      <button class="task-stat-card is-tpts" type="button" @click="handleNotificationKphClick('TPTS')"><span class="task-stat-card__icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3 2.8 19a2 2 0 0 0 1.7 3h15a2 2 0 0 0 1.7-3L12 3Z"/><path d="M12 9v4m0 4h.01"/></svg></span><span><strong>{{ pending.tpts }}</strong><small>Phiếu TPTS</small></span><span class="task-stat-card__arrow">›</span></button>
    </div>
  </div>
  <div class="notif-section notif-section--stats">
    <h4 class="notif-section-title">Tra cứu cần chú ý</h4>
    <div class="task-stat-grid task-stat-grid--modal task-stat-grid--three">
      <button class="task-stat-card is-warning" type="button" @click="handleNotificationHistoryStateClick('warning')"><span class="task-stat-card__icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg></span><span><strong>{{ lookup.warning }}</strong><small>Sắp đến hạn lùi</small></span><span class="task-stat-card__arrow">›</span></button>
      <button class="task-stat-card is-danger" type="button" @click="handleNotificationHistoryStateClick('danger')"><span class="task-stat-card__icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3 2.8 19a2 2 0 0 0 1.7 3h15a2 2 0 0 0 1.7-3L12 3Z"/><path d="M12 9v4m0 4h.01"/></svg></span><span><strong>{{ lookup.danger }}</strong><small>Quá hạn lùi</small></span><span class="task-stat-card__arrow">›</span></button>
      <button class="task-stat-card is-expired" type="button" @click="handleNotificationHistoryStateClick('expired')"><span class="task-stat-card__icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M8.5 8.5l7 7m0-7-7 7"/></svg></span><span><strong>{{ lookup.expired }}</strong><small>Hết HSD</small></span><span class="task-stat-card__arrow">›</span></button>
    </div>
  </div>
</template>
