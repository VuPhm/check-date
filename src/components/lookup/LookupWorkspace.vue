<script setup lang="ts">
type LegacyHandler = (...args: unknown[]) => unknown;

const guideUrl = `${import.meta.env.BASE_URL}docs/huong-dan/huong-dan-tra-han-lui.html`;

function invoke(name: string, ...args: unknown[]) {
  const handler = (window as typeof window & Record<string, LegacyHandler | undefined>)[name];
  handler?.(...args);
}

function handleModeChange(event: Event) {
  invoke('handleToggleMode', event.currentTarget as HTMLInputElement);
}
</script>

<template>
  <main class="calc-board">
    <div class="lookup-guide-link-row">
      <a class="lookup-guide-link" :href="guideUrl" target="_blank" rel="noopener">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10" /><path d="M9.1 9a3 3 0 1 1 5.8 1c0 2-2.9 2-2.9 4" /><path d="M12 18h.01" /></svg>
        Hướng dẫn sử dụng
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14" /><path d="m13 6 6 6-6 6" /></svg>
      </a>
    </div>

    <div class="form-field" style="margin-bottom: 12px;">
      <label class="form-label" for="tenHang">Tên hàng hóa</label>
      <div class="form-input-wrapper">
        <input id="tenHang" class="form-input" type="text" placeholder="Nhập tên hàng hóa">
      </div>
    </div>

    <div class="apple-input-row">
      <div class="form-field flex-2">
        <div class="form-label-row">
          <label class="form-label" for="barcode">Mã Barcode</label>
          <button id="barcodeFormatsNote" class="barcode-formats-badge" type="button" @click="invoke('toggleBarcodeFormats')">
            <strong id="activeFormatsText">EAN-13, EAN-8, Code 128</strong>
          </button>
        </div>
        <div class="form-input-wrapper">
          <input id="barcode" class="form-input" type="text" placeholder="Nhập hoặc quét mã" inputmode="numeric">
          <button id="btnScanBarcode" type="button" class="btn-picker-trigger" aria-label="Quét mã barcode" @click="invoke('openScannerForCalc')">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true">
              <path d="M4 7V4h3M17 4h3v3M20 17v3h-3M7 20H4v-3"/>
              <path d="M7 9v6M10 9v6M14 9v6M17 9v6"/>
            </svg>
          </button>
        </div>
        <div id="barcodeFormatsContainer" class="barcode-formats-container hidden">
          <div class="barcode-format-tags">
            <span class="format-tag active" data-format="EAN_13">EAN-13</span>
            <span class="format-tag active" data-format="EAN_8">EAN-8</span>
            <span class="format-tag active" data-format="CODE_128">Code 128</span>
            <span class="format-tag" data-format="CODE_39">Code 39</span>
            <span class="format-tag" data-format="UPC_A">UPC-A</span>
          </div>
        </div>
      </div>

      <div class="form-field flex-1">
        <div class="form-label-row">
          <label class="form-label" for="quantity">Số lượng</label>
          <div id="calcDvtGroup" class="dvt-radio-group">
            <input id="calcDvtEA" type="radio" name="calcDvt" value="EA" checked>
            <label for="calcDvtEA">EA</label>
            <input id="calcDvtKg" type="radio" name="calcDvt" value="kg">
            <label for="calcDvtKg">kg</label>
          </div>
        </div>
        <div class="form-input-wrapper">
          <input id="quantity" class="form-input" type="number" min="0.001" step="any" placeholder="Nhập số lượng" inputmode="decimal">
        </div>
      </div>
    </div>

    <section class="calc-focus-zone" aria-label="Thông tin hạn sử dụng và tra cứu">
      <div id="nsxGroup" class="form-field">
        <div class="form-label-row">
          <label class="form-label" for="nsx">Ngày sản xuất</label>
          <div class="nsx-toggle-container">
            <span id="nsxToggleLabel" class="nsx-toggle-label">Đã biết</span>
            <label class="apple-switch compact-switch">
              <input id="calcModeToggle" type="checkbox" checked @change="handleModeChange">
              <span class="apple-switch-slider" />
            </label>
          </div>
        </div>
        <div class="form-input-wrapper">
          <input id="nsx" class="form-input auto-date" type="text" placeholder="dd/mm/yyyy" inputmode="numeric" maxlength="10">
          <button id="btnNsxPicker" type="button" class="btn-picker-trigger" aria-label="Chọn ngày" @click="invoke('openNsxPicker')">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
          </button>
          <input id="nsxHidden" type="text" class="hidden-picker">
        </div>
      </div>

      <div id="hsdGroup" class="form-field">
        <label class="form-label" for="hsdDate">Hạn sử dụng (Chọn ngày)</label>
        <div class="form-input-wrapper">
          <input id="hsdDate" class="form-input auto-date" type="text" placeholder="dd/mm/yyyy" inputmode="numeric" maxlength="10">
          <button type="button" class="btn-picker-trigger" aria-label="Chọn ngày" @click="invoke('openHsdPicker')">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
          </button>
          <input id="hsdHidden" type="text" class="hidden-picker">
        </div>
      </div>

      <div id="dividerOr" class="divider-or">hoặc</div>

      <div id="hsdDuoRow" class="apple-input-row">
        <div class="form-field flex-1">
          <label class="form-label" for="hsdDays">HSD (Số ngày)</label>
          <div class="form-input-wrapper">
            <input id="hsdDays" class="form-input" type="number" placeholder="Ví dụ: 30" inputmode="numeric" min="1">
            <span class="form-input-suffix">ngày</span>
          </div>
        </div>
        <div class="form-field flex-1">
          <label class="form-label" for="hsdMonths">HSD (Số tháng)</label>
          <div class="form-input-wrapper">
            <input id="hsdMonths" class="form-input" type="number" placeholder="Ví dụ: 3" inputmode="numeric" min="1">
            <span class="form-input-suffix">tháng</span>
          </div>
        </div>
      </div>

      <div class="calc-focus-zone__actions">
        <button id="btnSubmit" class="btn-action" type="button" @click="invoke('executeCalculation')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <circle cx="11" cy="11" r="6" />
            <path d="m20 20-4.2-4.2" />
          </svg>
          Tra cứu
        </button>
        <button id="btnRefreshCalc" class="btn-secondary btn-refresh-calc" type="button" @click="invoke('refreshCalculationForm')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M21 12a9 9 0 0 1-15.5 6.2L3 16" />
            <path d="M3 12a9 9 0 0 1 15.5-6.2L21 8" />
            <path d="M3 21v-5h5" />
            <path d="M21 3v5h-5" />
          </svg>
          Làm mới
        </button>
      </div>
    </section>

    <div id="resultWrapper" class="calc-board__result-wrapper">
      <div id="resultText" class="calc-board__result-text" />
    </div>
  </main>

  <div id="diagramBoard" class="diagram-board">
    <div id="svgContainer" />
  </div>
</template>

<style scoped>
.barcode-formats-badge {
  appearance: none;
  padding: 0;
  border: 0;
  background: transparent;
  font-family: inherit;
}

.lookup-guide-link-row {
  display: flex;
  justify-content: flex-end;
  margin: -4px 0 12px;
}

.lookup-guide-link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 10px;
  border: 1px solid rgba(0, 102, 51, .16);
  border-radius: 999px;
  color: var(--brand-primary);
  background: rgba(0, 102, 51, .045);
  font-size: 12px;
  font-weight: 700;
  text-decoration: none;
}

.lookup-guide-link:hover { background: rgba(0, 102, 51, .09); }
.lookup-guide-link svg { width: 15px; height: 15px; }
</style>
