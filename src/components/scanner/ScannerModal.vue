<script setup lang="ts">
import { closeScanner, switchCamera, toggleTorch } from '../../../js/scanner.js';

function changeCamera(event: Event) {
  switchCamera((event.target as HTMLSelectElement).value);
}
</script>

<template>
  <div id="scannerModal" class="apple-modal" role="dialog" aria-modal="true" aria-label="Quét mã barcode">
    <div class="apple-modal-content">
      <div class="apple-modal-header">
        <h3 class="apple-modal-title">Quét mã Barcode</h3>
        <button class="apple-modal-close-btn" type="button" aria-label="Đóng" @click="closeScanner">&times;</button>
      </div>
      <div class="scanner-container">
        <div id="scanner-preview" />
        <div class="scanner-laser" /><div class="scanner-bracket top-left" /><div class="scanner-bracket top-right" /><div class="scanner-bracket bottom-left" /><div class="scanner-bracket bottom-right" />
      </div>
      <div class="scanner-controls">
        <div class="scanner-control-group">
          <label for="cameraSelect" class="scanner-label">Camera:</label>
          <select id="cameraSelect" class="scanner-select" @change="changeCamera"><option value="">Đang tải camera...</option></select>
        </div>
        <div class="scanner-buttons">
          <button id="btnTorch" class="scanner-btn scanner-btn--secondary" type="button" style="display: none;" @click="toggleTorch"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 17h6M15 12h6M15 7h6M4 5v14a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2z"/></svg>Bật Đèn Pin</button>
          <button class="scanner-btn scanner-btn--danger" type="button" @click="closeScanner">Hủy bỏ</button>
        </div>
      </div>
    </div>
  </div>
</template>
