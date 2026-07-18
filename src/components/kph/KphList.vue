<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue';
import {
  getFilteredKphLogs,
  getKphLogImages,
  kphSelectedIds,
  kphSortDirection,
  kphSortField,
  openKphApproveModal,
  removeKphLog,
  sortKphLogs,
  toggleKphSort,
  toggleSelectAllKph,
  toggleSelectRowKph,
  zoomImage,
} from '../../../js/kph.js';

interface KphLog {
  id: string;
  ngayPhatHien?: string;
  nguoiPhatHien?: string;
  trangThaiDuyet?: string;
  thoiGianDuyet?: string;
  sku?: string;
  tenHang?: string;
  ghiChu?: string;
  ncc?: string;
  soLuong?: string | number;
  dvt?: string;
  tinhTrang?: string;
  bienPhap?: string;
  bienPhapText?: string;
  ngayXuLy?: string;
  image?: Blob | string;
  images?: Array<Blob | string>;
}

interface KphViewRow extends KphLog {
  imageUrls: string[];
}

const rows = ref<KphViewRow[]>([]);
// KPH list is refreshed for selection and sorting changes as well as data
// changes. Keep each Blob's preview URL while it remains visible so a simple
// checkbox click does not revoke and recreate every image in the table.
const objectUrls = new Map<Blob, string>();

function releaseObjectUrls() {
  objectUrls.forEach((url) => URL.revokeObjectURL(url));
  objectUrls.clear();
}

function rebuildRows() {
  const filtered = getFilteredKphLogs() as KphLog[];
  const visibleBlobs = new Set<Blob>();
  rows.value = (sortKphLogs(filtered) as KphLog[]).map((item) => ({
    ...item,
    imageUrls: getKphLogImages(item)
      .map((image: Blob | string) => {
        if (image instanceof Blob) {
          visibleBlobs.add(image);
          let url = objectUrls.get(image);
          if (!url) {
            url = URL.createObjectURL(image);
            objectUrls.set(image, url);
          }
          return url;
        }
        return typeof image === 'string' && image.startsWith('data:') ? image : '';
      })
      .filter(Boolean),
  }));

  objectUrls.forEach((url, image) => {
    if (!visibleBlobs.has(image)) {
      URL.revokeObjectURL(url);
      objectUrls.delete(image);
    }
  });
}

function isSelected(id: string) {
  return kphSelectedIds.has(id);
}

function approvalLabel(status = 'cho_duyet') {
  if (status === 'da_duyet') return 'Đã duyệt';
  if (status === 'khong_duyet') return 'Không duyệt';
  return 'Chờ duyệt';
}

function approvalClass(status = 'cho_duyet') {
  if (status === 'da_duyet') return 'btn-approved';
  if (status === 'khong_duyet') return 'btn-rejected';
  return 'btn-pending';
}

function resolutionClass(resolution = '') {
  if (resolution === 'HỦY') return 'badge-danger';
  if (resolution === 'ĐỔI') return 'badge-warning';
  if (resolution === 'XUẤT TRẢ') return 'badge-info';
  return 'badge-secondary';
}

function resolutionLabel(item: KphLog, mobile = false) {
  const label = item.bienPhap === 'KHÁC' || !item.bienPhap
    ? item.bienPhapText || 'KHÁC'
    : item.bienPhap;
  if (!mobile) return label;
  return label === 'HỦY' ? 'Hủy' : label === 'ĐỔI' ? 'Đổi' : label === 'XUẤT TRẢ' ? 'Xuất trả' : label;
}

function selectAll(event: Event) {
  toggleSelectAllKph(event.target as HTMLInputElement);
}

function sortIcon(field: string) {
  if (kphSortField !== field) return '↕';
  return kphSortDirection === 'asc' ? '▲' : '▼';
}

function isSortActive(field: string) {
  return kphSortField === field;
}

onMounted(() => {
  rebuildRows();
  window.addEventListener('coop:kph-changed', rebuildRows);
});

onBeforeUnmount(() => {
  window.removeEventListener('coop:kph-changed', rebuildRows);
  releaseObjectUrls();
});
</script>

<template>
  <div class="kph-table-container">
    <table class="kph-table">
      <colgroup>
        <col class="kph-col-select"><col class="kph-col-date"><col class="kph-col-approval">
        <col class="kph-col-sku"><col class="kph-col-supplier"><col class="kph-col-quantity">
        <col class="kph-col-condition"><col class="kph-col-resolution"><col class="kph-col-image"><col class="kph-col-delete">
      </colgroup>
      <thead>
        <tr>
          <th class="kph-col-select" style="text-align: center"><input id="kphSelectAll" type="checkbox" class="kph-checkbox" @change="selectAll"></th>
          <th class="kph-col-date sortable-header" style="text-align: center; cursor: pointer" @click="toggleKphSort('ngayPhatHien')">Phát hiện <span id="sort-icon-ngayPhatHien" class="sort-icon" :class="{ 'active-sort': isSortActive('ngayPhatHien') }">{{ sortIcon('ngayPhatHien') }}</span></th>
          <th class="kph-col-approval sortable-header" style="text-align: center; cursor: pointer" @click="toggleKphSort('trangThaiDuyet')"><span class="kph-header-line">Duyệt <span id="sort-icon-trangThaiDuyet" class="sort-icon" :class="{ 'active-sort': isSortActive('trangThaiDuyet') }">{{ sortIcon('trangThaiDuyet') }}</span></span><span class="kph-header-line">Thời gian duyệt</span></th>
          <th class="kph-col-sku sortable-header" style="cursor: pointer" @click="toggleKphSort('skuTenHang')"><span class="kph-header-line">SKU/UPC</span><span class="kph-header-line">Tên hàng hóa <span id="sort-icon-skuTenHang" class="sort-icon" :class="{ 'active-sort': isSortActive('skuTenHang') }">{{ sortIcon('skuTenHang') }}</span></span></th>
          <th class="kph-col-supplier sortable-header" style="cursor: pointer" @click="toggleKphSort('ncc')">NCC <span id="sort-icon-ncc" class="sort-icon" :class="{ 'active-sort': isSortActive('ncc') }">{{ sortIcon('ncc') }}</span></th>
          <th class="kph-col-quantity sortable-header" style="cursor: pointer; text-align: center" @click="toggleKphSort('soLuong')"><span class="kph-header-line">SL <span id="sort-icon-soLuong" class="sort-icon" :class="{ 'active-sort': isSortActive('soLuong') }">{{ sortIcon('soLuong') }}</span></span><span class="kph-header-line">ĐVT</span></th>
          <th class="kph-col-condition sortable-header" style="cursor: pointer" @click="toggleKphSort('tinhTrang')"><span class="kph-header-line">Mô tả tình trạng <span id="sort-icon-tinhTrang" class="sort-icon" :class="{ 'active-sort': isSortActive('tinhTrang') }">{{ sortIcon('tinhTrang') }}</span></span><span class="kph-header-line">KPH</span></th>
          <th class="kph-col-resolution sortable-header" style="cursor: pointer" @click="toggleKphSort('ngayXuLy')"><span class="kph-header-line">Biện pháp xử lý</span><span class="kph-header-line">Ngày xử lý <span id="sort-icon-ngayXuLy" class="sort-icon" :class="{ 'active-sort': isSortActive('ngayXuLy') }">{{ sortIcon('ngayXuLy') }}</span></span></th>
          <th class="kph-col-image sortable-header" style="text-align: center; cursor: pointer" @click="toggleKphSort('imageCount')">Ảnh <span id="sort-icon-imageCount" class="sort-icon" :class="{ 'active-sort': isSortActive('imageCount') }">{{ sortIcon('imageCount') }}</span></th>
          <th class="kph-col-delete" style="text-align: center">Xóa</th>
        </tr>
      </thead>
      <tbody id="kphLogsList">
        <tr v-if="rows.length === 0"><td colspan="10" class="kph-empty-row">Chưa có dữ liệu khai báo hoặc không khớp bộ lọc</td></tr>
        <tr v-for="item in rows" v-else :key="item.id" :class="{ 'selected-row': isSelected(item.id) }">
          <td data-label="" style="text-align: center"><input type="checkbox" class="kph-checkbox" :checked="isSelected(item.id)" @change="toggleSelectRowKph(item.id)"></td>
          <td data-label="Phát hiện" style="text-align: center"><div style="font-weight: 600">{{ item.ngayPhatHien }}</div><div class="kph-cell-meta">{{ item.nguoiPhatHien || '-' }}</div></td>
          <td data-label="Duyệt" style="text-align: center"><button class="btn-approval" :class="approvalClass(item.trangThaiDuyet)" @click="openKphApproveModal(item.id)">{{ approvalLabel(item.trangThaiDuyet) }}</button><div class="kph-cell-meta"><span v-if="(item.trangThaiDuyet || 'cho_duyet') === 'cho_duyet'" class="thoi-gian-duyet-val cho-duyet">chưa duyệt</span><span v-else class="thoi-gian-duyet-val">{{ item.thoiGianDuyet || '-' }}</span></div></td>
          <td data-label="SKU / Tên hàng"><div class="kph-sku-value">{{ item.sku }}</div><div class="kph-product-name">{{ item.tenHang }}</div><div v-if="item.ghiChu" class="kph-vue-note">💬 {{ item.ghiChu }}</div></td>
          <td data-label="NCC">{{ item.ncc || '-' }}</td>
          <td data-label="SL / ĐVT" style="text-align: center; font-weight: 600">{{ item.soLuong }} <span class="kph-unit-value">{{ item.dvt }}</span></td>
          <td data-label="Tình trạng">{{ item.tinhTrang }}</td>
          <td data-label="Biện pháp / Ngày XL" style="font-weight: 500"><div class="xl-badge-wrapper"><span class="badge" :class="resolutionClass(item.bienPhap)">{{ resolutionLabel(item) }}</span></div><div class="kph-cell-meta"><span v-if="item.ngayXuLy">{{ item.ngayXuLy }}</span><span v-else class="badge badge-unprocessed">Chưa xử lý</span></div></td>
          <td data-label="Ảnh" style="text-align: center"><div v-if="item.imageUrls.length" class="kph-thumbnail-list"><img v-for="(url, index) in item.imageUrls" :key="url" class="kph-thumbnail" :src="url" :alt="`Ảnh minh chứng ${index + 1}`" @click="zoomImage(url)"></div><span v-else class="kph-no-image">Không có</span></td>
          <td data-label=""><button class="kph-cell-btn-delete" aria-label="Xóa" @click="removeKphLog(item.id)"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button></td>
        </tr>
      </tbody>
    </table>
  </div>

  <div id="kphLogsMobileList" class="kph-mobile-list-container">
    <div v-if="rows.length === 0" class="kph-empty-mobile">Chưa có dữ liệu khai báo hoặc không khớp bộ lọc</div>
    <div v-for="item in rows" v-else :key="item.id" class="kph-mobile-card" :class="{ 'selected-card': isSelected(item.id) }">
      <div class="kph-card-header"><div class="kph-card-header-left"><input type="checkbox" class="kph-checkbox" :checked="isSelected(item.id)" @change="toggleSelectRowKph(item.id)"><span class="kph-card-date">{{ item.ngayPhatHien }}</span></div><span class="kph-card-sku">{{ item.sku }}</span></div>
      <div class="kph-card-body">
        <div class="kph-card-main-info"><h4 class="kph-card-title">{{ item.tenHang }}</h4><div class="kph-card-qty">{{ item.soLuong }} <span class="qty-unit">{{ item.dvt }}</span></div></div>
        <div class="kph-card-details">
          <div class="kph-card-detail-row"><span class="detail-label">NCC:</span><span class="detail-val">{{ item.ncc || '-' }}</span></div>
          <div class="kph-card-detail-row"><span class="detail-label">Tình trạng:</span><span class="detail-val kph-condition-value">{{ item.tinhTrang }}</span></div>
          <div class="kph-card-detail-row"><span class="detail-label">Biện pháp:</span><span class="detail-val"><span class="badge" :class="resolutionClass(item.bienPhap)">{{ resolutionLabel(item, true) }}</span></span></div>
          <div class="kph-card-detail-row"><span class="detail-label">Ngày xử lý:</span><span class="detail-val"><span v-if="item.ngayXuLy" style="font-weight: 600">{{ item.ngayXuLy }}</span><span v-else class="badge badge-unprocessed">Chưa xử lý</span></span></div>
          <div v-if="(item.trangThaiDuyet || 'cho_duyet') !== 'cho_duyet'" class="kph-card-detail-row"><span class="detail-label">Thời gian duyệt:</span><span class="detail-val kph-approval-time">{{ item.thoiGianDuyet || '-' }}</span></div>
          <div class="kph-card-detail-row"><span class="detail-label font-light">Người PH:</span><span class="detail-val font-light">{{ item.nguoiPhatHien || '-' }}</span></div>
          <div v-if="item.ghiChu" class="kph-card-detail-row"><span class="detail-label">Ghi chú:</span><span class="detail-val kph-mobile-note">💬 {{ item.ghiChu }}</span></div>
        </div>
        <div v-if="item.imageUrls.length" class="kph-card-images"><button v-for="(url, index) in item.imageUrls" :key="url" type="button" class="kph-card-img-wrapper" @click="zoomImage(url)"><img :src="url" :alt="`Ảnh minh chứng ${index + 1}`"></button></div>
      </div>
      <div class="kph-card-actions"><button type="button" class="btn-approval" :class="approvalClass(item.trangThaiDuyet)" @click="openKphApproveModal(item.id)">{{ approvalLabel(item.trangThaiDuyet) }}</button><button type="button" class="kph-card-btn-delete" @click="removeKphLog(item.id)"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>Xóa bản ghi</button></div>
    </div>
  </div>
</template>
