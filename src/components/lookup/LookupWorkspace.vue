<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue';
import { processReturnBusinessLogic, formatPresentationResult, getFriendlyErrorMessage } from '../../domain/business';
import { buildLookupHistoryPayload, isAnonymousLookupSupersededByBarcode, syncLookupDates, validateLookupCalculation, type LookupHistoryIdentity, type LookupSyncSource } from '../../domain/lookup';
import { formatRemainingText } from '../../../js/helpers.js';
import { historyData, removeHistoryItem, saveHistoryToStorage, setSelectedHistoryId, updateHistoryUI } from '../../../js/history.js';
import { drawTimelineDiagram } from '../../../js/timeline.js';

type LegacyHandler = (...args: unknown[]) => unknown;
const barcodeFormats = [
  { id: 'EAN_13', label: 'EAN-13' },
  { id: 'EAN_8', label: 'EAN-8' },
  { id: 'CODE_128', label: 'Code 128' },
  { id: 'CODE_39', label: 'Code 39' },
  { id: 'UPC_A', label: 'UPC-A' },
] as const;
const selectedBarcodeFormats = ref<string[]>(['EAN_13', 'EAN_8', 'CODE_128']);
const form = reactive({
  tenHang: '',
  barcode: '',
  quantity: '',
  dvt: 'EA',
  nsx: '',
  hsdDate: '',
  hsdDays: '',
  hsdMonths: '',
});
const isForwardMode = ref(true);
const resultClass = ref('calc-board__result-wrapper');
const resultMarkup = ref('');
const resultVisible = ref(false);
const activeFormatsText = computed(() => barcodeFormats
  .filter((format) => selectedBarcodeFormats.value.includes(format.id))
  .map((format) => format.label)
  .join(', '));

function invoke(name: string, ...args: unknown[]) {
  const handler = (window as typeof window & Record<string, LegacyHandler | undefined>)[name];
  handler?.(...args);
  window.setTimeout(syncFormFromDom);
}

function syncFormFromDom() {
  const read = (id: string) => (document.getElementById(id) as HTMLInputElement | null)?.value ?? '';
  form.tenHang = read('tenHang');
  form.barcode = read('barcode');
  form.quantity = read('quantity');
  form.nsx = read('nsx');
  form.hsdDate = read('hsdDate');
  form.hsdDays = read('hsdDays');
  form.hsdMonths = read('hsdMonths');
  form.dvt = (document.querySelector('input[name="calcDvt"]:checked') as HTMLInputElement | null)?.value ?? 'EA';
}

function syncDateFields(source: LookupSyncSource, changedDateField?: 'nsx' | 'hsdDate') {
  let actualSource = source;
  if (source === 'date') {
    // Keep the legacy interaction contract: changing NSX in forward mode uses
    // an already-entered day count, while changing HSD in backward mode does
    // the same. Otherwise the two explicit dates determine the duration.
    const isNsxInput = changedDateField === 'nsx';
    if (isNsxInput && isForwardMode.value && form.hsdDays.trim()) actualSource = 'days';
    if (!isNsxInput && !isForwardMode.value) {
      if (form.hsdDays.trim()) actualSource = 'days';
      else return;
    }
  }
  Object.assign(form, syncLookupDates(form, isForwardMode.value ? 'forward' : 'backward', actualSource));
}

function handleModeChange(event: Event) {
  isForwardMode.value = (event.currentTarget as HTMLInputElement).checked;
  invoke('handleToggleMode', event.currentTarget as HTMLInputElement);
}

function toggleBarcodeFormat(id: string) {
  const current = selectedBarcodeFormats.value;
  if (current.includes(id)) {
    if (current.length === 1) return;
    selectedBarcodeFormats.value = current.filter((format) => format !== id);
  } else {
    selectedBarcodeFormats.value = [...current, id];
  }
}

function setCalcFocusTheme(theme: string) {
  const focusZone = document.querySelector('.calc-focus-zone');
  if (focusZone instanceof HTMLElement) focusZone.dataset.theme = theme;
}

function showResultModal(detail: unknown) {
  window.dispatchEvent(new CustomEvent('coop:result-modal-open', { detail }));
}

function userFriendlyError(error: Error) {
  return getFriendlyErrorMessage(error.message);
}

function executeCalculation(saveToHistory = true) {
  syncFormFromDom();
  try {
    validateLookupCalculation({ mode: isForwardMode.value ? 'forward' : 'backward', ...form });
    const output = processReturnBusinessLogic(form.nsx, form.hsdDate);
    drawTimelineDiagram(form.nsx, form.hsdDate, output.dateStr);
    resultClass.value = `calc-board__result-wrapper ${output.alert.class}`;

    const { mainLabel, mainText, subLines } = formatPresentationResult(output);
    resultMarkup.value = `${mainText}<br><small>${subLines.join('<br>')}</small>`;
    resultVisible.value = true;

    const alertType = output.isShortProduct ? 'other' : output.alert.type;
    setCalcFocusTheme(alertType);
    const quantity = form.quantity === '' || Number.isNaN(Number(form.quantity)) ? '' : Number(form.quantity);
    const quantityDetail = quantity === '' ? 'Chưa nhập' : `${quantity} ${form.dvt}`;
    const remainingDetail = output.isExpiredProduct ? 'Đã hết HSD' : formatRemainingText(output.daysRemaining);
    showResultModal({
      theme: alertType,
      title: 'Kết quả tra cứu',
      mainLabel,
      mainValue: output.dateStr,
      subLines,
      kphType: output.isShortProduct ? 'TPTS' : 'TPCN',
      details: [
        { label: 'Tên hàng', value: form.tenHang || 'Chưa nhập' }, { label: 'Barcode', value: form.barcode || 'Tra cứu không mã' },
        { label: 'Số lượng', value: quantityDetail }, { label: 'NSX', value: form.nsx },
        { label: 'HSD', value: output.formattedHsd }, { label: mainLabel, value: output.dateStr, highlight: true },
        { label: 'Trạng thái', value: `${output.alert.label} · ${remainingDetail}` },
      ],
    });

    if (!saveToHistory) return;
    const historyPayload = buildLookupHistoryPayload({
      nsx: form.nsx,
      hsdDate: form.hsdDate,
      hsdDays: form.hsdDays,
      barcode: form.barcode,
      tenHang: form.tenHang,
      quantity,
      dvt: form.dvt,
    }, output);
    // A later barcode identifies the otherwise anonymous lookup. Do not remove
    // other barcode lookups: those can legitimately be different products.
    historyData
      .filter((item: Record<string, unknown>) => isAnonymousLookupSupersededByBarcode(item as unknown as LookupHistoryIdentity, historyPayload))
      .forEach((item: Record<string, unknown>) => removeHistoryItem(item.id as string));
    const existing = historyData.find((item: Record<string, unknown>) => item.nsx === historyPayload.nsx
      && item.rawHsdDate === historyPayload.rawHsdDate && String(item.rawHsdDays) === String(historyPayload.rawHsdDays)
      && item.formattedHsd === historyPayload.formattedHsd && item.barcode === historyPayload.barcode
      && item.tenHang === historyPayload.tenHang && String(item.quantity ?? '') === String(historyPayload.quantity ?? '') && item.dvt === historyPayload.dvt);
    if (existing) {
      setSelectedHistoryId(existing.id);
    } else {
      const item = { id: `item_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`, ...historyPayload };
      historyData.unshift(item);
      void saveHistoryToStorage(item);
      setSelectedHistoryId(item.id);
    }
    updateHistoryUI();
  } catch (reason) {
    const error = reason instanceof Error ? reason : new Error('Không thể tra cứu.');
    const message = userFriendlyError(error);
    setCalcFocusTheme('danger');
    resultClass.value = 'calc-board__result-wrapper state-danger';
    resultMarkup.value = `<div style="line-height: 1.6; font-size: 13px; color: #e20514; font-weight: 600;">${message}</div>`;
    resultVisible.value = true;
    const board = document.getElementById('diagramBoard');
    if (board instanceof HTMLElement) { delete board.dataset.ready; board.style.display = 'none'; }
    const container = document.getElementById('svgContainer');
    if (container) container.innerHTML = '';
    showResultModal({ theme: 'danger', title: 'Lỗi tra cứu', mainLabel: 'Thông tin chưa đúng', subLines: [message.replace(/<[^>]+>/g, '').replace('⚠️ ', '')] });
  }
}

function handleCalculationRequest(event: Event) {
  const detail = (event as CustomEvent<{ saveToHistory?: boolean }>).detail;
  executeCalculation(detail?.saveToHistory ?? true);
}

function refreshCalculationForm() {
  Object.assign(form, { tenHang: '', barcode: '', quantity: '', dvt: 'EA', nsx: '', hsdDate: '', hsdDays: '', hsdMonths: '' });
  resultClass.value = 'calc-board__result-wrapper';
  resultMarkup.value = '';
  resultVisible.value = false;
  setCalcFocusTheme('safe');
  invoke('refreshCalculationForm');
}

onMounted(() => {
  syncFormFromDom();
  const toggle = document.getElementById('calcModeToggle') as HTMLInputElement | null;
  isForwardMode.value = toggle?.checked ?? true;
  document.getElementById('vue-lookup-root')?.setAttribute('data-vue-ready', 'true');
  window.addEventListener('coop:lookup-loaded', syncFormFromDom);
  window.addEventListener('coop:lookup-dom-changed', syncFormFromDom);
  window.addEventListener('coop:lookup-execute', handleCalculationRequest);
});

onBeforeUnmount(() => {
  window.removeEventListener('coop:lookup-loaded', syncFormFromDom);
  window.removeEventListener('coop:lookup-dom-changed', syncFormFromDom);
  window.removeEventListener('coop:lookup-execute', handleCalculationRequest);
  document.getElementById('vue-lookup-root')?.removeAttribute('data-vue-ready');
});
</script>

<template>
  <main class="calc-board">
    <div class="form-field" style="margin-bottom: 12px;">
      <label class="form-label" for="tenHang">Tên hàng hóa</label>
      <div class="form-input-wrapper">
          <input id="tenHang" v-model="form.tenHang" class="form-input" type="text" placeholder="Nhập tên hàng hóa">
      </div>
    </div>

    <div class="apple-input-row">
      <div class="form-field flex-2">
        <div class="form-label-row">
          <label class="form-label" for="barcode">Mã Barcode</label>
          <button id="barcodeFormatsNote" class="barcode-formats-badge" type="button" @click="invoke('toggleBarcodeFormats')">
            <strong id="activeFormatsText">{{ activeFormatsText }}</strong>
          </button>
        </div>
        <div class="form-input-wrapper">
          <input id="barcode" v-model="form.barcode" class="form-input" type="text" placeholder="Nhập hoặc quét mã" inputmode="numeric">
          <button id="btnScanBarcode" type="button" class="btn-picker-trigger" aria-label="Quét mã barcode" @click="invoke('openScannerForCalc')">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true">
              <path d="M4 7V4h3M17 4h3v3M20 17v3h-3M7 20H4v-3"/>
              <path d="M7 9v6M10 9v6M14 9v6M17 9v6"/>
            </svg>
          </button>
        </div>
        <div id="barcodeFormatsContainer" class="barcode-formats-container hidden">
          <div class="barcode-format-tags">
            <span
              v-for="format in barcodeFormats"
              :key="format.id"
              class="format-tag"
              :class="{ active: selectedBarcodeFormats.includes(format.id) }"
              :data-format="format.id"
              role="button"
              tabindex="0"
              @click="toggleBarcodeFormat(format.id)"
              @keydown.enter.prevent="toggleBarcodeFormat(format.id)"
              @keydown.space.prevent="toggleBarcodeFormat(format.id)"
            >{{ format.label }}</span>
          </div>
        </div>
      </div>

      <div class="form-field flex-1">
        <div class="form-label-row">
          <label class="form-label" for="quantity">Số lượng</label>
          <div id="calcDvtGroup" class="dvt-radio-group">
            <input id="calcDvtEA" v-model="form.dvt" type="radio" name="calcDvt" value="EA">
            <label for="calcDvtEA">EA</label>
            <input id="calcDvtKg" v-model="form.dvt" type="radio" name="calcDvt" value="kg">
            <label for="calcDvtKg">kg</label>
          </div>
        </div>
        <div class="form-input-wrapper">
          <input id="quantity" v-model="form.quantity" class="form-input" type="number" min="0.001" step="any" placeholder="Nhập số lượng" inputmode="decimal">
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
          <input id="nsx" v-model="form.nsx" class="form-input auto-date" type="text" placeholder="dd/mm/yyyy" inputmode="numeric" maxlength="10" @input="syncDateFields('date', 'nsx')">
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
          <input id="hsdDate" v-model="form.hsdDate" class="form-input auto-date" type="text" placeholder="dd/mm/yyyy" inputmode="numeric" maxlength="10" @input="syncDateFields('date', 'hsdDate')">
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
            <input id="hsdDays" v-model="form.hsdDays" class="form-input" type="number" placeholder="Ví dụ: 30" inputmode="numeric" min="1" @input="syncDateFields('days')">
            <span class="form-input-suffix">ngày</span>
          </div>
        </div>
        <div class="form-field flex-1">
          <label class="form-label" for="hsdMonths">HSD (Số tháng)</label>
          <div class="form-input-wrapper">
            <input id="hsdMonths" v-model="form.hsdMonths" class="form-input" type="number" placeholder="Ví dụ: 3" inputmode="numeric" min="1" @input="syncDateFields('months')">
            <span class="form-input-suffix">tháng</span>
          </div>
        </div>
      </div>

      <div class="calc-focus-zone__actions">
        <button id="btnSubmit" class="btn-action" type="button" @click="executeCalculation()">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <circle cx="11" cy="11" r="6" />
            <path d="m20 20-4.2-4.2" />
          </svg>
          Tra cứu
        </button>
        <button id="btnRefreshCalc" class="btn-secondary btn-refresh-calc" type="button" @click="refreshCalculationForm">
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

    <div id="resultWrapper" :class="resultClass">
      <div id="resultText" class="calc-board__result-text" :class="{ 'calc-board__result-text--visible': resultVisible }" v-html="resultMarkup" />
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

</style>
