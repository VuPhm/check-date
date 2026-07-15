<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import {
  addKphLog,
  clearKphForm,
  clearKphImage,
  handleKphImageUpload,
  kphImagePreviewUrls,
  openKphNgayPicker,
  openKphNgayXuLyPicker,
  saveNguoiPhatHien,
  toggleBienPhapRadio,
  toggleTinhTrangRadio,
  updateCharCount,
  zoomImage,
} from '../../../js/kph.js';

const imageRevision = ref(0);
const imageUrls = computed(() => {
  imageRevision.value;
  return [...kphImagePreviewUrls] as string[];
});

function openScanner() {
  const handler = (window as typeof window & { openScannerForKPH?: () => void }).openScannerForKPH;
  handler?.();
}

function uploadImages(event: Event) {
  handleKphImageUpload(event.target as HTMLInputElement);
}

function countText(inputId: string, countId: string) {
  updateCharCount(inputId, countId);
}

function refreshImages() {
  imageRevision.value += 1;
}

onMounted(() => window.addEventListener('coop:kph-images-changed', refreshImages));
onBeforeUnmount(() => window.removeEventListener('coop:kph-images-changed', refreshImages));
</script>

<template>
  <div class="kph-section-group">
    <h3 class="kph-section-title">1. Thông tin phát hiện</h3>
    <div class="apple-input-row">
      <div class="form-field flex-1">
        <label class="form-label" for="kphNgayPhatHien">Ngày phát hiện <span class="required-star">*</span></label>
        <div class="form-input-wrapper">
          <input id="kphNgayPhatHien" class="form-input auto-date" type="text" placeholder="dd/mm/yyyy" inputmode="numeric" maxlength="10" required>
          <button id="btnKphNgayPicker" type="button" class="btn-picker-trigger" aria-label="Chọn ngày" @click="openKphNgayPicker"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg></button>
          <input id="kphNgayPhatHienHidden" type="text" class="hidden-picker">
        </div>
      </div>
      <div class="form-field flex-1">
        <label class="form-label" for="kphNcc">Nhà cung cấp (NCC)</label>
        <div class="form-input-wrapper"><input id="kphNcc" class="form-input" type="text" maxlength="150" placeholder="Điền tên NCC"></div>
      </div>
    </div>
    <div class="apple-input-row">
      <div class="form-field flex-1">
        <label class="form-label" for="kphSku">Mã SKU / UPC</label>
        <div class="form-input-wrapper">
          <input id="kphSku" class="form-input" type="text" maxlength="50" placeholder="Nhập hoặc quét mã" inputmode="numeric">
          <button type="button" class="btn-picker-trigger" aria-label="Quét mã barcode" @click="openScanner"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><path d="M4 7V4h3M17 4h3v3M20 17v3h-3M7 20H4v-3"/><path d="M7 9v6M10 9v6M14 9v6M17 9v6"/></svg></button>
        </div>
      </div>
      <div class="form-field flex-1">
        <label class="form-label" for="kphTenHang">Tên hàng hóa</label>
        <div class="form-input-wrapper"><input id="kphTenHang" class="form-input" type="text" maxlength="200" placeholder="Điền tay tên hàng hóa"></div>
      </div>
    </div>
  </div>

  <div class="kph-section-group">
    <h3 class="kph-section-title">2. Số lượng & Đơn vị</h3>
    <div class="apple-input-row">
      <div class="form-field flex-1">
        <div class="form-label-row">
          <label class="form-label" for="kphSoLuong">Số lượng <span class="required-star">*</span></label>
          <div id="kphDvtGroup" class="dvt-radio-group">
            <input id="kphDvtEA" type="radio" name="kphDvt" value="EA" checked><label for="kphDvtEA">EA</label>
            <input id="kphDvtKg" type="radio" name="kphDvt" value="kg"><label for="kphDvtKg">kg</label>
          </div>
        </div>
        <div class="form-input-wrapper"><input id="kphSoLuong" class="form-input" type="number" value="1" min="0.001" step="any" inputmode="decimal" required></div>
      </div>
    </div>
  </div>

  <div class="kph-section-group">
    <h3 class="kph-section-title">3. Tình trạng hàng</h3>
    <div id="kphTinhTrangGroup" class="kph-card-radio-group">
      <input id="kphTinhTrangHuHong" type="radio" name="kphTinhTrangRadio" value="Hư Hỏng" checked @change="toggleTinhTrangRadio('Hư Hỏng')"><label for="kphTinhTrangHuHong" class="kph-card-radio-label hu-hong"><div class="kph-card-radio-icon">×</div><span>Hư hỏng</span></label>
      <input id="kphTinhTrangCanDate" type="radio" name="kphTinhTrangRadio" value="Cận date" @change="toggleTinhTrangRadio('Cận date')"><label for="kphTinhTrangCanDate" class="kph-card-radio-label can-date"><div class="kph-card-radio-icon">◷</div><span>Cận date</span></label>
      <input id="kphTinhTrangHetHsd" type="radio" name="kphTinhTrangRadio" value="Hết HSD" @change="toggleTinhTrangRadio('Hết HSD')"><label for="kphTinhTrangHetHsd" class="kph-card-radio-label het-hsd"><div class="kph-card-radio-icon">!</div><span>Hết HSD</span></label>
      <input id="kphTinhTrangKhac" type="radio" name="kphTinhTrangRadio" value="Khác" @change="toggleTinhTrangRadio('Khác')"><label for="kphTinhTrangKhac" class="kph-card-radio-label khac"><div class="kph-card-radio-icon">…</div><span>Khác</span></label>
    </div>
    <div id="colTinhTrangKhac" class="form-field kph-create-other"><label class="form-label" for="kphTinhTrangKhacInput">Nội dung tình trạng khác</label><div class="form-input-wrapper"><input id="kphTinhTrangKhacInput" class="form-input" type="text" maxlength="150" placeholder="Nhập tình trạng hàng"></div></div>
  </div>

  <div class="kph-section-group">
    <h3 class="kph-section-title">4. Người phát hiện</h3>
    <div class="apple-input-row"><div class="form-field flex-1"><label class="form-label" for="kphNguoiPhatHien">Tên người nhập <span class="required-star">*</span></label><div class="form-input-wrapper"><input id="kphNguoiPhatHien" class="form-input" type="text" maxlength="100" placeholder="Họ và tên người lập biểu" required @change="saveNguoiPhatHien"><span class="input-icon-right">♙</span></div></div></div>
  </div>

  <div class="kph-section-group">
    <h3 class="kph-section-title">5. Biện pháp xử lý</h3>
    <div id="kphBienPhapGroup" class="kph-card-radio-group">
      <input id="kphBienPhapHuy" type="radio" name="kphBienPhapRadio" value="HỦY" checked @change="toggleBienPhapRadio('HỦY')"><label for="kphBienPhapHuy" class="kph-card-radio-label huy"><div class="kph-card-radio-icon">×</div><span>Hủy</span></label>
      <input id="kphBienPhapDoi" type="radio" name="kphBienPhapRadio" value="ĐỔI" @change="toggleBienPhapRadio('ĐỔI')"><label for="kphBienPhapDoi" class="kph-card-radio-label doi"><div class="kph-card-radio-icon">⇄</div><span>Đổi</span></label>
      <input id="kphBienPhapXuatTra" type="radio" name="kphBienPhapRadio" value="XUẤT TRẢ" @change="toggleBienPhapRadio('XUẤT TRẢ')"><label for="kphBienPhapXuatTra" class="kph-card-radio-label xuat-tra"><div class="kph-card-radio-icon">⇥</div><span>Xuất trả</span></label>
      <input id="kphBienPhapKhac" type="radio" name="kphBienPhapRadio" value="KHÁC" @change="toggleBienPhapRadio('KHÁC')"><label for="kphBienPhapKhac" class="kph-card-radio-label khac-bp"><div class="kph-card-radio-icon">✎</div><span>Khác</span></label>
    </div>
    <div id="colBienPhapKhac" class="form-field kph-create-other"><label class="form-label" for="kphBienPhapKhacInput">Nội dung xử lý khác (nếu có)</label><div class="form-input-wrapper kph-create-textarea-wrapper"><textarea id="kphBienPhapKhacInput" class="form-input form-textarea" maxlength="255" rows="3" placeholder="Ví dụ: Chuyển đổi công năng, giảm giá..." @input="countText('kphBienPhapKhacInput', 'bpKhacCharCount')"></textarea><div class="char-count-wrapper"><span id="bpKhacCharCount">0</span>/255</div></div></div>
  </div>

  <div class="kph-section-group">
    <h3 class="kph-section-title">6. Ngày xử lý</h3>
    <div class="apple-input-row"><div class="form-field flex-1"><label class="form-label" for="kphNgayXuLy">Ngày xử lý (nếu có)</label><div class="form-input-wrapper"><input id="kphNgayXuLy" class="form-input auto-date" type="text" maxlength="10" inputmode="numeric" placeholder="dd/mm/yyyy (để trống nếu chưa xử lý)"><button id="btnKphNgayXuLyPicker" type="button" class="btn-picker-trigger" aria-label="Chọn ngày" @click="openKphNgayXuLyPicker"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg></button><input id="kphNgayXuLyHidden" type="text" class="hidden-picker"></div></div></div>
  </div>

  <div class="kph-section-group">
    <h3 class="kph-section-title">7. Ảnh minh chứng</h3>
    <label class="form-label kph-create-image-label">Hình ảnh minh chứng <span class="required-star">*</span> <span class="kph-image-limit">Tối đa 3 ảnh · <span id="kphImageCount">{{ imageUrls.length }}/3</span></span></label>
    <div class="kph-upload-cards-row">
      <label class="kph-upload-card-btn" for="kphCameraInput"><span class="kph-upload-symbol">◉</span><span>Chụp ảnh</span></label><input id="kphCameraInput" type="file" accept="image/*" capture="environment" hidden @change="uploadImages">
      <label class="kph-upload-card-btn" for="kphLibraryInput"><span class="kph-upload-symbol">▧</span><span>Chọn từ thư viện</span></label><input id="kphLibraryInput" type="file" accept="image/*" multiple hidden @change="uploadImages">
    </div>
    <div v-show="imageUrls.length" id="kphPreviewContainer" class="kph-image-preview-container-new kph-create-preview">
      <div v-for="(url, index) in imageUrls" :key="url" class="kph-preview-item">
        <img :src="url" :alt="`Ảnh minh chứng ${index + 1}`" @click="zoomImage(url)">
        <button type="button" class="kph-delete-image-btn-new" :aria-label="`Xóa ảnh ${index + 1}`" @click="clearKphImage(index)"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
      </div>
    </div>
    <div class="form-field kph-create-note"><label class="form-label" for="kphGhiChu">Ghi chú thêm (nếu có)</label><div class="form-input-wrapper kph-create-textarea-wrapper"><textarea id="kphGhiChu" class="form-input form-textarea" maxlength="255" rows="3" placeholder="Nhập ghi chú..." @input="countText('kphGhiChu', 'gcCharCount')"></textarea><div class="char-count-wrapper"><span id="gcCharCount">0</span>/255</div></div></div>
  </div>

  <div class="kph-form-actions">
    <button type="button" class="btn-action kph-create-save" @click="addKphLog"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>LƯU PHIẾU</button>
    <button type="button" class="btn-secondary" @click="clearKphForm">Nhập lại</button>
  </div>
</template>
