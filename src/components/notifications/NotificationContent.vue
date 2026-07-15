<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { historyData, setFilter } from '../../../js/history.js';
import { kphLogs, switchTab } from '../../../js/kph.js';
import {
  closeNotificationModal,
  handleNotificationHistoryClick,
  handleNotificationKphClick,
} from '../../../js/notifications.js';
import { formatRemainingText } from '../../domain/historyPresentation';

interface UrgentHistoryItem {
  id: string;
  alertType: string;
  alertClass: string;
  alertLabel: string;
  isExpiredProduct?: boolean;
  daysRemaining: number;
  nsx: string;
  formattedHsd: string;
  rawHsdDays: string | number;
  barcode?: string;
  quantity?: string | number;
  dvt?: string;
  tenHang?: string;
}

const revision = ref(0);
const alertOrder: Record<string, number> = { expired: 0, danger: 1, warning: 2 };

const pending = computed(() => {
  revision.value;
  return {
    tpcn: kphLogs.filter((item) => (!item.loaiKph || item.loaiKph === 'TPCN') && (item.trangThaiDuyet || 'cho_duyet') === 'cho_duyet').length,
    tpts: kphLogs.filter((item) => item.loaiKph === 'TPTS' && (item.trangThaiDuyet || 'cho_duyet') === 'cho_duyet').length,
  };
});

const urgentItems = computed(() => {
  revision.value;
  return (historyData as UrgentHistoryItem[])
    .filter((item) => ['warning', 'danger', 'expired'].includes(item.alertType))
    .sort((a, b) => (alertOrder[a.alertType] ?? 3) - (alertOrder[b.alertType] ?? 3));
});

const historyCounts = computed(() => {
  revision.value;
  const source = historyData as UrgentHistoryItem[];
  return {
    warning: source.filter((item) => item.alertType === 'warning').length,
    danger: source.filter((item) => item.alertType === 'danger').length,
    expired: source.filter((item) => item.alertType === 'expired').length,
  };
});

function refresh() {
  revision.value += 1;
}

function openHistoryFilter(filter: string) {
  closeNotificationModal();
  switchTab('tracuu');
  setFilter(filter);
}

function openHistoryItem(item: UrgentHistoryItem) {
  handleNotificationHistoryClick(
    item.nsx,
    item.formattedHsd,
    item.rawHsdDays,
    item.barcode || '',
    item.quantity === undefined ? '' : item.quantity,
    item.dvt || 'EA',
    item.tenHang || '',
    item.id,
  );
}

function shortDate(value: string) {
  return value ? value.replace(/\/20(\d{2})$/, '/$1') : '';
}

function quantityLabel(item: UrgentHistoryItem) {
  return item.quantity === undefined || item.quantity === '' ? '' : `x${item.quantity} ${item.dvt || 'EA'}`;
}

function remainingLabel(item: UrgentHistoryItem) {
  return item.isExpiredProduct ? 'Đã hết HSD' : formatRemainingText(item.daysRemaining);
}

onMounted(() => window.addEventListener('coop:notifications-changed', refresh));
onBeforeUnmount(() => window.removeEventListener('coop:notifications-changed', refresh));
</script>

<template>
  <div class="notif-section">
    <h4 class="notif-section-title">Hàng Không Phù Hợp (KPH) chờ duyệt</h4>
    <div class="kph-notif-stats-grid">
      <button type="button" class="notif-stat-card kph kph-tpcn" @click="handleNotificationKphClick('TPCN')"><span class="notif-stat-card__val">{{ pending.tpcn }}</span><span class="notif-stat-card__label">Phiếu TPCN</span></button>
      <button type="button" class="notif-stat-card kph kph-tpts" @click="handleNotificationKphClick('TPTS')"><span class="notif-stat-card__val">{{ pending.tpts }}</span><span class="notif-stat-card__label">Phiếu TPTS</span></button>
    </div>
  </div>

  <div class="notif-section" style="margin-top: 20px">
    <h4 class="notif-section-title">Tra cứu đã lưu (Hạn lùi)</h4>
    <div class="tracuu-notif-stats-grid">
      <button type="button" class="notif-stat-card warning" @click="openHistoryFilter('warning')"><span class="notif-stat-card__val">{{ historyCounts.warning }}</span><span class="notif-stat-card__label">Sắp đến hạn</span></button>
      <button type="button" class="notif-stat-card danger" @click="openHistoryFilter('danger')"><span class="notif-stat-card__val">{{ historyCounts.danger }}</span><span class="notif-stat-card__label">Quá hạn lùi</span></button>
      <button type="button" class="notif-stat-card expired" @click="openHistoryFilter('expired')"><span class="notif-stat-card__val">{{ historyCounts.expired }}</span><span class="notif-stat-card__label">Quá hạn SD</span></button>
    </div>

    <div class="tracuu-notif-list" style="margin-top: 12px">
      <div v-if="urgentItems.length === 0" class="history-empty notif-empty">Không có việc cần xử lý</div>
      <button v-for="item in urgentItems" v-else :key="item.id" type="button" class="notif-item" :class="item.alertClass" @click="openHistoryItem(item)">
        <span class="notif-item__indicator"></span>
        <span class="notif-item__main">
          <span class="notif-item__title-row notif-vue-title"><span class="notif-vue-primary">{{ item.tenHang || item.barcode || 'Tra cứu không mã' }}</span><span v-if="quantityLabel(item)" class="history-item__qty-badge notif-vue-qty">{{ quantityLabel(item) }}</span></span>
          <span class="notif-item__date-info">NSX: <strong>{{ shortDate(item.nsx) }}</strong> | HSD: <strong>{{ shortDate(item.formattedHsd) }}</strong></span>
        </span>
        <span class="notif-item__side"><span class="notif-item__countdown">{{ remainingLabel(item) }}</span><span class="notif-item__badge">{{ item.isExpiredProduct ? 'Đã qua hạn lùi' : item.alertLabel }}</span></span>
      </button>
    </div>
  </div>
</template>
