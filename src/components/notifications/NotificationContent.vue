<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { closeNotificationModal } from '../../../js/notifications.js';
import { handleNotificationKphClick } from '../../../js/notifications.js';
import { kphLogs, switchTab } from '../../../js/kph.js';
import { useAppStore } from '../../stores/app';

const appStore = useAppStore();
const revision = ref(0);
const workEvents = computed(() => appStore.actionableEvents.slice(0, 50));
const pending = computed(() => { revision.value; return ({
  tpcn: kphLogs.filter((item) => (!item.loaiKph || item.loaiKph === 'TPCN') && (item.trangThaiDuyet || 'cho_duyet') === 'cho_duyet').length,
  tpts: kphLogs.filter((item) => item.loaiKph === 'TPTS' && (item.trangThaiDuyet || 'cho_duyet') === 'cho_duyet').length,
}); });
function isUnread(id: string) { return !appStore.seenActivityIds.includes(id); }
function openWorkEvent(id: string) {
  appStore.markActivityRead([id]);
  closeNotificationModal();
  switchTab('kph');
}
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
    <button v-for="event in workEvents" v-else :key="event.id" type="button" class="notif-item notif-work-item" :class="{ 'is-unread': isUnread(event.id) }" @click="openWorkEvent(event.id)"><span class="notif-item__indicator"></span><span class="notif-item__main"><span class="notif-item__title-row">{{ event.summary }}</span><span class="notif-item__date-info">{{ eventTime(event.createdAt) }}</span></span></button>
  </div>
  <div class="notif-section" style="margin-top: 20px">
    <h4 class="notif-section-title">Hàng Không Phù Hợp (KPH) chờ duyệt</h4>
    <div class="kph-notif-stats-grid">
      <button type="button" class="notif-stat-card kph kph-tpcn" @click="handleNotificationKphClick('TPCN')"><span class="notif-stat-card__val">{{ pending.tpcn }}</span><span class="notif-stat-card__label">Phiếu TPCN</span></button>
      <button type="button" class="notif-stat-card kph kph-tpts" @click="handleNotificationKphClick('TPTS')"><span class="notif-stat-card__val">{{ pending.tpts }}</span><span class="notif-stat-card__label">Phiếu TPTS</span></button>
    </div>
  </div>
</template>
