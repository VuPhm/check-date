<script setup lang="ts">
import {
  clearKphDateFilter,
  deleteSelectedKphLogs,
  exportKphToExcel,
  openFilterDenNgayPicker,
  openFilterTuNgayPicker,
  openKphCreateModal,
  switchKphSubTab,
  toggleKphFilterChoDuyet,
  toggleSelectAllKph,
} from '../../../js/kph.js';

function selectAll(event: Event) {
  toggleSelectAllKph(event.target as HTMLInputElement);
}
</script>

<template>
  <div class="kph-main-actions-group">
    <button type="button" class="btn-action kph-create-main" @click="openKphCreateModal('TPCN')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg><span class="desktop-only">TẠO PHIẾU TPCN</span><span class="mobile-only">TPCN</span></button>
    <button type="button" class="btn-action btn-create-tpts kph-create-main" @click="openKphCreateModal('TPTS')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg><span class="desktop-only">TẠO PHIẾU TPTS</span><span class="mobile-only">TPTS</span></button>
  </div>
  <section class="history-board kph-list-board">
    <div class="history-board__header"><h2 class="history-board__title">Phiếu Đã Khai Báo (<span id="kphCountText">0</span>)</h2>
      <div class="kph-list-actions"><label class="kph-select-all-mobile-wrapper"><input id="kphSelectAllMobile" type="checkbox" class="kph-checkbox" @change="selectAll"><span>Chọn tất cả</span></label><div class="kph-selection-status">Đã chọn <span id="kphSelectedCount" class="kph-selected-count">0</span> dòng</div><div class="kph-action-buttons"><button id="btnExportExcel" class="btn-action btn-export-excel" type="button" disabled @click="exportKphToExcel"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg><span id="btnExportExcelText">Xuất Excel</span></button><button id="btnDeleteSelected" class="btn-delete-selected" type="button" disabled @click="deleteSelectedKphLogs"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg><span id="btnDeleteSelectedText">Xóa</span></button></div></div>
    </div>
    <div class="kph-sub-tabs"><button id="sub-tab-btn-tpcn" class="kph-sub-tab active" type="button" @click="switchKphSubTab('TPCN')">TPCN</button><button id="sub-tab-btn-tpts" class="kph-sub-tab" type="button" @click="switchKphSubTab('TPTS')">TPTS</button></div>
    <div class="kph-filter-row compact-filter"><div class="kph-filter-label"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="kph-filter-icon" aria-hidden="true"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg></div><div class="kph-filter-range"><div class="form-input-wrapper filter-input-wrapper compact-wrapper"><input id="kphFilterTuNgay" class="form-input auto-date compact-input" type="text" placeholder="Từ ngày" inputmode="numeric" maxlength="10"><button id="btnFilterTuNgayPicker" type="button" class="btn-picker-trigger compact-trigger" aria-label="Chọn ngày" @click="openFilterTuNgayPicker"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg></button><input id="kphFilterTuNgayHidden" type="text" class="hidden-picker"></div><span class="kph-filter-range-sep" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg></span><div class="form-input-wrapper filter-input-wrapper compact-wrapper"><input id="kphFilterDenNgay" class="form-input auto-date compact-input" type="text" placeholder="Đến ngày" inputmode="numeric" maxlength="10"><button id="btnFilterDenNgayPicker" type="button" class="btn-picker-trigger compact-trigger" aria-label="Chọn ngày" @click="openFilterDenNgayPicker"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg></button><input id="kphFilterDenNgayHidden" type="text" class="hidden-picker"></div></div><button id="btnFilterChoDuyet" type="button" class="kph-filter-tag-btn compact-btn" @click="toggleKphFilterChoDuyet">Chờ duyệt <span id="kphChoDuyetCount" class="kph-filter-tag-count">0</span></button><button type="button" class="kph-filter-btn kph-filter-btn--clear compact-btn" title="Xóa bộ lọc" @click="clearKphDateFilter"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg><span class="kph-btn-text">Xóa bộ lọc</span></button></div>
    <div id="vue-kph-list-root"><div class="vue-loading-fallback">Đang tải danh sách phiếu KPH…</div></div>
  </section>
</template>
