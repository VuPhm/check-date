<script setup lang="ts">
import {
  closeKphApproveModal,
  openKphApproveNgayXuLyPicker,
  saveKphApproval,
  toggleApproveBienPhapRadio,
  toggleApproveNguoiDuyetEdit,
  updateCharCount,
} from '../../../js/kph.js';

function updateOtherResolutionCount() {
  updateCharCount('kphApproveBienPhapKhacInput', 'bpApproveKhacCharCount');
}
</script>

<template>
  <input id="kphApproveId" type="hidden">

  <div class="kph-approve-person">
    <button id="kphApproveNguoiDuyetDisplay" type="button" class="kph-approve-person__display" @click="toggleApproveNguoiDuyetEdit(true)">
      <span><small>Người duyệt</small><strong id="kphApproveNguoiDuyetText">Chưa thiết lập</strong></span>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.1 2.1 0 0 1 3 3L12 15l-4 1 1-4z"/></svg>
    </button>
    <div id="kphApproveNguoiDuyetEdit" class="hidden kph-approve-person__edit">
      <input id="kphApproveNguoiDuyet" class="form-input" type="text" maxlength="100" placeholder="Tên người duyệt">
      <button type="button" class="btn-settings-done" @click="toggleApproveNguoiDuyetEdit(false)">Xong</button>
    </div>
  </div>

  <div class="kph-section-group">
    <h3 class="kph-section-title">1. Trạng thái duyệt</h3>
    <div id="kphApproveStatusGroup" class="kph-card-radio-group">
      <input id="kphApproveStatusCho" type="radio" name="kphApproveStatusRadio" value="cho_duyet" checked>
      <label for="kphApproveStatusCho" class="kph-card-radio-label cho-duyet"><div class="kph-card-radio-icon">◷</div><span>Chờ duyệt</span></label>
      <input id="kphApproveStatusDa" type="radio" name="kphApproveStatusRadio" value="da_duyet">
      <label for="kphApproveStatusDa" class="kph-card-radio-label da-duyet"><div class="kph-card-radio-icon">✓</div><span>Đã duyệt</span></label>
      <input id="kphApproveStatusKhong" type="radio" name="kphApproveStatusRadio" value="khong_duyet">
      <label for="kphApproveStatusKhong" class="kph-card-radio-label khong-duyet"><div class="kph-card-radio-icon">×</div><span>Không duyệt</span></label>
    </div>
  </div>

  <div class="kph-section-group">
    <h3 class="kph-section-title">2. Biện pháp xử lý</h3>
    <div id="kphApproveBienPhapGroup" class="kph-card-radio-group">
      <input id="kphApproveBienPhapHuy" type="radio" name="kphApproveBienPhapRadio" value="HỦY" checked @change="toggleApproveBienPhapRadio('HỦY')">
      <label for="kphApproveBienPhapHuy" class="kph-card-radio-label huy"><div class="kph-card-radio-icon">×</div><span>Hủy</span></label>
      <input id="kphApproveBienPhapDoi" type="radio" name="kphApproveBienPhapRadio" value="ĐỔI" @change="toggleApproveBienPhapRadio('ĐỔI')">
      <label for="kphApproveBienPhapDoi" class="kph-card-radio-label doi"><div class="kph-card-radio-icon">⇄</div><span>Đổi</span></label>
      <input id="kphApproveBienPhapXuatTra" type="radio" name="kphApproveBienPhapRadio" value="XUẤT TRẢ" @change="toggleApproveBienPhapRadio('XUẤT TRẢ')">
      <label for="kphApproveBienPhapXuatTra" class="kph-card-radio-label xuat-tra"><div class="kph-card-radio-icon">⇥</div><span>Xuất trả</span></label>
      <input id="kphApproveBienPhapKhac" type="radio" name="kphApproveBienPhapRadio" value="KHÁC" @change="toggleApproveBienPhapRadio('KHÁC')">
      <label for="kphApproveBienPhapKhac" class="kph-card-radio-label khac-bp"><div class="kph-card-radio-icon">✎</div><span>Khác</span></label>
    </div>

    <div id="colApproveBienPhapKhac" class="form-field kph-approval-other">
      <label class="form-label" for="kphApproveBienPhapKhacInput">Nội dung xử lý khác (nếu có)</label>
      <div class="form-input-wrapper kph-approval-textarea-wrapper">
        <textarea id="kphApproveBienPhapKhacInput" class="form-input form-textarea" placeholder="Ví dụ: Chuyển đổi công năng, giảm giá..." rows="3" maxlength="255" @input="updateOtherResolutionCount"></textarea>
        <div class="char-count-wrapper"><span id="bpApproveKhacCharCount">0</span>/255</div>
      </div>
    </div>
  </div>

  <div class="kph-section-group">
    <h3 class="kph-section-title">3. Ngày xử lý</h3>
    <div class="apple-input-row">
      <div class="form-field flex-1">
        <label class="form-label" for="kphApproveNgayXuLy">Ngày xử lý (nếu có)</label>
        <div class="form-input-wrapper">
          <input id="kphApproveNgayXuLy" class="form-input auto-date" type="text" placeholder="dd/mm/yyyy (để trống nếu chưa xử lý)" inputmode="numeric" maxlength="10">
          <button id="btnKphApproveNgayXuLyPicker" type="button" class="btn-picker-trigger" aria-label="Chọn ngày" @click="openKphApproveNgayXuLyPicker"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg></button>
          <input id="kphApproveNgayXuLyHidden" type="text" class="hidden-picker">
        </div>
      </div>
    </div>
  </div>

  <div class="kph-form-actions">
    <button type="button" class="btn-action kph-approval-save" @click="saveKphApproval"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>LƯU CẬP NHẬT</button>
    <button type="button" class="btn-secondary" @click="closeKphApproveModal">Đóng</button>
  </div>
</template>
