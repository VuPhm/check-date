<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue';
import {
  activeFilters,
  clearAllHistory,
  exportHistoryToExcel,
  historyData,
  isPrioritySort,
  loadHistoryItem,
  removeHistoryItem,
  selectedHistoryId,
  setFilter,
  togglePrioritySort,
} from '../../../js/history.js';
import { formatRemainingText } from '../../domain/historyPresentation';

interface HistoryItem {
  id: string;
  nsx: string;
  formattedHsd: string;
  rawHsdDays: string | number;
  result: string;
  alertType: string;
  alertClass: string;
  alertLabel: string;
  alertWeight: number;
  isShortProduct?: boolean;
  isExpiredProduct?: boolean;
  daysRemaining: number;
  barcode?: string;
  tenHang?: string;
  quantity?: string | number;
  dvt?: string;
}

const revision = ref(0);
const loadLegacyHistoryItem = loadHistoryItem as unknown as (
  nsx: string,
  hsdDate: string,
  hsdDays: string | number,
  barcode: string,
  quantity: number,
  dvt: string,
  tenHang: string,
  id: string,
) => void;
const items = computed(() => {
  revision.value;
  let result = [...(historyData as HistoryItem[])];
  if (!activeFilters.has('all')) {
    result = result.filter((item) => activeFilters.has(item.alertType));
  }
  if (isPrioritySort) result.sort((a, b) => a.alertWeight - b.alertWeight);
  return result;
});

const counts = computed(() => {
  revision.value;
  const source = historyData as HistoryItem[];
  return {
    all: source.length,
    safe: source.filter((item) => item.alertType === 'safe').length,
    warning: source.filter((item) => item.alertType === 'warning').length,
    danger: source.filter((item) => item.alertType === 'danger').length,
    other: source.filter((item) => item.alertType === 'other').length,
    expired: source.filter((item) => item.alertType === 'expired').length,
  };
});

const prioritySortEnabled = computed(() => {
  revision.value;
  return isPrioritySort;
});

function isFilterActive(filter: string): boolean {
  revision.value;
  return activeFilters.has(filter);
}

function handleStateChange() {
  revision.value += 1;
}

function selectFilter(filter: string) {
  setFilter(filter);
}

function selectItem(item: HistoryItem) {
  loadLegacyHistoryItem(
    item.nsx,
    item.formattedHsd,
    item.rawHsdDays,
    item.barcode || '',
    typeof item.quantity === 'number' ? item.quantity : Number(item.quantity || 1),
    item.dvt || 'EA',
    item.tenHang || '',
    item.id,
  );
  nextTick(() => document.getElementById(`history-item-${item.id}`)?.scrollIntoView({ block: 'nearest' }));
}

function deleteItem(event: MouseEvent, id: string) {
  event.stopPropagation();
  removeHistoryItem(id);
}

function quantityLabel(item: HistoryItem): string {
  if (item.quantity === undefined || item.quantity === '') return '';
  return `x${item.quantity} ${item.dvt || 'EA'}`;
}

function statusLabel(item: HistoryItem): string {
  return item.isExpiredProduct ? 'Đã qua hạn lùi' : item.alertLabel;
}

function remainingLabel(item: HistoryItem): string {
  return item.isExpiredProduct ? 'Đã hết HSD' : formatRemainingText(item.daysRemaining);
}

onMounted(() => window.addEventListener('coop:history-changed', handleStateChange));
onBeforeUnmount(() => window.removeEventListener('coop:history-changed', handleStateChange));
</script>

<template>
  <div class="history-wrapper">
    <section class="history-board">
      <div class="history-board__header">
        <h2 class="history-board__title">Lịch sử</h2>
        <div class="history-board__actions">
          <button
            id="btnExportHistoryExcel"
            class="btn-export-history-excel"
            type="button"
            title="Xuất Excel"
            :disabled="items.length === 0"
            @click="exportHistoryToExcel"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            <span>Xuất Excel ({{ items.length }})</span>
          </button>
          <button
            id="btnClearHistory"
            class="btn-clear-history"
            type="button"
            :title="items.length ? `Xóa ${items.length} lượt tra cứu đang hiển thị` : 'Không có dữ liệu để xóa'"
            :disabled="items.length === 0"
            @click="clearAllHistory"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              <line x1="10" y1="11" x2="10" y2="17" />
              <line x1="14" y1="11" x2="14" y2="17" />
            </svg>
            <span>Xóa ({{ items.length }})</span>
          </button>
        </div>
      </div>

      <div class="controls">
        <div class="filter-tags">
          <button class="tag tag--all" :class="{ active: isFilterActive('all') }" type="button" @click="selectFilter('all')">Tất cả ({{ counts.all }})</button>
          <button class="tag tag--safe" :class="{ active: isFilterActive('safe') }" type="button" @click="selectFilter('safe')">An toàn ({{ counts.safe }})</button>
          <button class="tag tag--warning" :class="{ active: isFilterActive('warning') }" type="button" @click="selectFilter('warning')">Sắp tới hạn ({{ counts.warning }})</button>
          <button class="tag tag--danger" :class="{ active: isFilterActive('danger') }" type="button" @click="selectFilter('danger')">Quá hạn lùi ({{ counts.danger }})</button>
          <button class="tag tag--other" :class="{ active: isFilterActive('other') }" type="button" @click="selectFilter('other')">Khác ({{ counts.other }})</button>
          <button class="tag tag--expired" :class="{ active: isFilterActive('expired') }" type="button" @click="selectFilter('expired')">Đã hết HSD ({{ counts.expired }})</button>
        </div>
        <button id="sortToggleBtn" class="sort-toggle-box" :class="{ active: prioritySortEnabled }" type="button" @click="togglePrioritySort">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <polyline points="15 3 21 3 21 9" />
            <polyline points="9 21 3 21 3 15" />
            <line x1="21" y1="3" x2="14" y2="10" />
            <line x1="3" y1="21" x2="10" y2="14" />
          </svg>
          <span id="sortToggleText">{{ prioritySortEnabled ? 'Sắp xếp: Ưu tiên hạn lùi' : 'Sắp xếp: Mặc định' }}</span>
        </button>
      </div>

      <ul id="historyList" class="history-list">
        <li v-if="items.length === 0" class="history-empty">Không có dữ liệu phù hợp</li>
        <li
          v-for="item in items"
          :id="`history-item-${item.id}`"
          :key="item.id"
          class="history-item"
          :class="[item.alertClass, { 'is-selected': item.id === selectedHistoryId }]"
          @click="selectItem(item)"
        >
          <div class="history-item__indicator" />
          <div class="history-item__content">
            <div class="history-item__header-row">
              <span class="history-item__barcode">{{ item.barcode || 'Tra cứu không mã' }}</span>
              <span v-if="quantityLabel(item)" class="history-item__qty-badge">{{ quantityLabel(item) }}</span>
            </div>
            <div v-if="item.tenHang" class="history-item__name-row">{{ item.tenHang }}</div>
            <div class="history-item__detail-row">
              <div class="history-item__dates-col">
                <span class="history-item__date-label">NSX: <strong>{{ item.nsx }}</strong></span>
                <span class="history-item__date-label">HSD: <strong>{{ item.formattedHsd }}</strong></span>
              </div>
              <div class="history-item__result-col">
                <span class="history-item__result-label">{{ item.isShortProduct ? 'HSD' : 'Ngày lùi' }}</span>
                <span class="history-item__result-value">{{ item.result }}</span>
              </div>
            </div>
            <div class="history-item__footer-row">
              <span class="history-item__status-badge">{{ statusLabel(item) }}</span>
              <span class="history-item__countdown">{{ remainingLabel(item) }}</span>
            </div>
          </div>
          <button class="history-item__delete-btn" type="button" aria-label="Xóa" @click="deleteItem($event, item.id)">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </li>
      </ul>
    </section>
  </div>
</template>

<style scoped>
.history-item__name-row {
  margin: 4px 0 2px;
  color: var(--text-main);
  font-size: 13px;
  font-weight: 600;
  text-align: left;
}
</style>
