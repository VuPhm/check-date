<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { handleNotificationHistoryStateClick, handleNotificationKphClick } from '../../../js/notifications.js';
import { historyData } from '../../../js/history.js';
import { kphLogs } from '../../../js/kph.js';
import { useAppStore } from '../../stores/app';
import ActivityLog from '../activity/ActivityLog.vue';

const appStore = useAppStore();
const revision = ref(0);
const pending = computed(() => { revision.value; return {
  tpcn: kphLogs.filter((item) => (!item.loaiKph || item.loaiKph === 'TPCN') && (item.trangThaiDuyet || 'cho_duyet') === 'cho_duyet').length,
  tpts: kphLogs.filter((item) => item.loaiKph === 'TPTS' && (item.trangThaiDuyet || 'cho_duyet') === 'cho_duyet').length,
}; });
const lookup = computed(() => { revision.value; return {
  warning: historyData.filter((item) => item.alertType === 'warning').length,
  danger: historyData.filter((item) => item.alertType === 'danger').length,
  expired: historyData.filter((item) => item.alertType === 'expired').length,
}; });
const workEvents = computed(() => appStore.actionableEvents.slice(0, 50));
function refresh() { revision.value += 1; }
function isUnread(id: string) { return !appStore.seenActivityIds.includes(id); }
function markAllRead() { appStore.markActivityRead(workEvents.value.map((event) => event.id)); }
onMounted(() => window.addEventListener('coop:notifications-changed', refresh));
onBeforeUnmount(() => window.removeEventListener('coop:notifications-changed', refresh));
</script>

<template>
  <div class="task-workspace">
    <section class="task-workspace__hero">
      <div><p>Trung tâm điều phối</p><h3>Việc cần xử lý</h3><span>Theo dõi các phiếu cần duyệt và hoạt động mới của cửa hàng.</span></div>
      <button v-if="workEvents.some((event) => isUnread(event.id))" class="task-workspace__quiet-action" type="button" @click="markAllRead">Đánh dấu đã xem</button>
    </section>

    <section class="task-workspace__section">
      <div class="task-workspace__section-heading"><div><p>Ưu tiên hôm nay</p><h4>Phiếu KPH chờ duyệt</h4></div><span class="task-workspace__total">{{ pending.tpcn + pending.tpts }} phiếu</span></div>
      <div class="task-stat-grid">
        <button class="task-stat-card is-tpcn" type="button" @click="handleNotificationKphClick('TPCN')"><span class="task-stat-card__icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6"/><path d="M8 14h8"/></svg></span><span><strong>{{ pending.tpcn }}</strong><small>Phiếu TPCN</small></span><span class="task-stat-card__arrow">›</span></button>
        <button class="task-stat-card is-tpts" type="button" @click="handleNotificationKphClick('TPTS')"><span class="task-stat-card__icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3 2.8 19a2 2 0 0 0 1.7 3h15a2 2 0 0 0 1.7-3L12 3Z"/><path d="M12 9v4m0 4h.01"/></svg></span><span><strong>{{ pending.tpts }}</strong><small>Phiếu TPTS</small></span><span class="task-stat-card__arrow">›</span></button>
      </div>
    </section>

    <section class="task-workspace__section">
      <div class="task-workspace__section-heading"><div><p>Tra cứu cần chú ý</p><h4>Trạng thái hạn dùng</h4></div><span class="task-workspace__total">{{ lookup.warning + lookup.danger + lookup.expired }} sản phẩm</span></div>
      <div class="task-stat-grid task-stat-grid--three">
        <button class="task-stat-card is-warning" type="button" @click="handleNotificationHistoryStateClick('warning')"><span class="task-stat-card__icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg></span><span><strong>{{ lookup.warning }}</strong><small>Sắp đến hạn lùi</small></span><span class="task-stat-card__arrow">›</span></button>
        <button class="task-stat-card is-danger" type="button" @click="handleNotificationHistoryStateClick('danger')"><span class="task-stat-card__icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3 2.8 19a2 2 0 0 0 1.7 3h15a2 2 0 0 0 1.7-3L12 3Z"/><path d="M12 9v4m0 4h.01"/></svg></span><span><strong>{{ lookup.danger }}</strong><small>Quá hạn lùi</small></span><span class="task-stat-card__arrow">›</span></button>
        <button class="task-stat-card is-expired" type="button" @click="handleNotificationHistoryStateClick('expired')"><span class="task-stat-card__icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M8.5 8.5l7 7m0-7-7 7"/></svg></span><span><strong>{{ lookup.expired }}</strong><small>Hết HSD</small></span><span class="task-stat-card__arrow">›</span></button>
      </div>
    </section>

    <section class="task-workspace__section task-workspace__section--activity">
      <div class="task-workspace__section-heading"><div><p>Nhật ký cửa hàng</p><h4>Hoạt động gần đây</h4></div><span>Hiển thị tối đa 50 hoạt động</span></div>
      <ActivityLog :events="appStore.activityEvents" />
    </section>
  </div>
</template>
