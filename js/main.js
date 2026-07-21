import {
    isValidDateStr,
    parseLocalDate,
    formatLocalDate,
    formatRemainingText,
    getCleanToday,
    MS_PER_DAY,
    initAppVersion,
    notifyAppVersionUpdate,
    closeAppUpdateModal,
    initPwaInstall,
    closeInstallHelpModal,
    showAppleConfirm,
    showAppleToast
} from './helpers.js';

import {
    openScanner,
    closeScanner,
    switchCamera,
    toggleTorch,
    setScannerTargetInputId
} from './scanner.js';

import {
    processReturnBusinessLogic,
    formatPresentationResult,
    getFriendlyErrorMessage
} from './business.js';


import { buildLookupHistoryPayload, isAnonymousLookupSupersededByBarcode, syncLookupDates } from '../src/domain/lookup.ts';

import {
    drawTimelineDiagram
} from './timeline.js';

import {
    historyData,
    setSelectedHistoryId,
    loadHistoryFromStorage,
    saveHistoryToStorage,
    removeHistoryItem,
    clearAllHistory,
    updateHistoryUI,
    setFilter,
    togglePrioritySort,
    loadHistoryItem,
    exportHistoryToExcel
} from './history.js';

import { closeNotificationModal, openNotificationModal } from './notifications.js';

import {
    switchTab,
    openKphNgayPicker,
    openKphNgayXuLyPicker,
    openFilterTuNgayPicker,
    openFilterDenNgayPicker,
    toggleTinhTrangKhac,
    toggleBienPhapKhac,
    toggleTinhTrangRadio,
    toggleBienPhapRadio,
    updateCharCount,
    saveNguoiPhatHien,
    handleKphImageUpload,
    clearKphImage,
    loadKphLogs,
    addKphLog,
    removeKphLog,
    clearAllKphLogs,
    deleteSelectedKphLogs,
    clearKphForm,
    applyKphDateFilter,
    clearKphDateFilter,
    toggleKphSort,
    toggleSelectAllKph,
    toggleSelectRowKph,
    zoomImage,
    closeImageModal,
    exportKphToExcel,
    initKphFlatpickrs,
    openKphCreateModal,
    closeKphCreateModal,
    openKphApproveModal,
    closeKphApproveModal,
    openKphApproveNgayXuLyPicker,
    saveKphApproval,
    toggleApproveBienPhapRadio,
    toggleApproveNguoiDuyetEdit,
    loadStoreSettings,
    saveSidebarSettings,
    switchKphSubTab,
    kphActiveSubTab,
    toggleKphFilterChoDuyet
} from './kph.js';

// State của màn hình chính
export let nsxFlatpickr = null;
export let hsdFlatpickr = null;
export let isFirstCalculation = true;
export let isSyncing = false;
export let calcMode = 'forward';

export function openScannerForCalc() {
    setScannerTargetInputId('barcode');
    openScanner();
}

export function openScannerForKPH() {
    setScannerTargetInputId('kphSku');
    openScanner();
}

export function openNsxPicker() {
    if (nsxFlatpickr) nsxFlatpickr.open();
}

export function openHsdPicker() {
    if (hsdFlatpickr) hsdFlatpickr.open();
}

function notifyLookupDomChanged() {
    window.dispatchEvent(new CustomEvent('coop:lookup-dom-changed'));
}

// --- HỆ THỐNG ĐỒNG BỘ CÓ TƯỜNG NGĂN (GUARDED SYNCHRONIZATION) --- 
export function syncFromDateToDays() {
    if (isSyncing) return;
    isSyncing = true;
    const nsxVal = document.getElementById('nsx').value.trim();
    const hsdDateVal = document.getElementById('hsdDate').value.trim();
    const hsdDaysInput = document.getElementById('hsdDays');
    const synced = syncLookupDates({ nsx: nsxVal, hsdDate: hsdDateVal, hsdDays: hsdDaysInput.value, hsdMonths: document.getElementById('hsdMonths').value }, calcMode, 'date');
    hsdDaysInput.value = synced.hsdDays;
    document.getElementById('hsdMonths').value = synced.hsdMonths;
    isSyncing = false;
    notifyLookupDomChanged();
}

export function syncFromDaysToDate() {
    if (isSyncing) return;
    isSyncing = true;
    const nsxInput = document.getElementById('nsx');
    const hsdDateInput = document.getElementById('hsdDate');
    const hsdDaysVal = document.getElementById('hsdDays').value.trim();
    const synced = syncLookupDates({ nsx: nsxInput.value.trim(), hsdDate: hsdDateInput.value.trim(), hsdDays: hsdDaysVal, hsdMonths: document.getElementById('hsdMonths').value }, calcMode, 'days');
    nsxInput.value = synced.nsx;
    hsdDateInput.value = synced.hsdDate;
    document.getElementById('hsdMonths').value = synced.hsdMonths;
    if (hsdFlatpickr) synced.hsdDate ? hsdFlatpickr.setDate(synced.hsdDate, false) : hsdFlatpickr.clear();
    if (nsxFlatpickr) synced.nsx ? nsxFlatpickr.setDate(synced.nsx, false) : nsxFlatpickr.clear();
    isSyncing = false;
    notifyLookupDomChanged();
}

export function syncFromMonthsToDate() {
    if (isSyncing) return;
    isSyncing = true;
    const nsxInput = document.getElementById('nsx');
    const hsdDateInput = document.getElementById('hsdDate');
    const hsdDaysInput = document.getElementById('hsdDays');
    const hsdMonthsVal = document.getElementById('hsdMonths').value.trim();
    const synced = syncLookupDates({ nsx: nsxInput.value.trim(), hsdDate: hsdDateInput.value.trim(), hsdDays: hsdDaysInput.value, hsdMonths: hsdMonthsVal }, calcMode, 'months');
    nsxInput.value = synced.nsx;
    hsdDateInput.value = synced.hsdDate;
    hsdDaysInput.value = synced.hsdDays;
    if (hsdFlatpickr) synced.hsdDate ? hsdFlatpickr.setDate(synced.hsdDate, false) : hsdFlatpickr.clear();
    if (nsxFlatpickr) synced.nsx ? nsxFlatpickr.setDate(synced.nsx, false) : nsxFlatpickr.clear();
    isSyncing = false;
    notifyLookupDomChanged();
}

// --- ĐIỀU HƯỚNG CHẾ ĐỘ QUA CÔNG TẮC GẠT TRƯỢT APPLE ---
export function handleToggleMode(toggleElement) {
    calcMode = toggleElement.checked ? 'forward' : 'backward';

    const label = document.getElementById('nsxToggleLabel') || document.querySelector('.nsx-toggle-label');
    if (label) {
        label.textContent = toggleElement.checked ? 'Đã biết' : 'Chưa biết';
    }

    // Chuyển chế độ chỉ cần làm trống NSX. Giữ nguyên HSD và các thông tin
    // người dùng đang điền để có thể tra xuôi/tra ngược liên tục.
    document.getElementById('nsx').value = "";
    if (nsxFlatpickr) nsxFlatpickr.clear();

    const nsxInput = document.getElementById('nsx');
    const btnNsx = document.getElementById('btnNsxPicker');

    if (calcMode === 'backward') {
        nsxInput.setAttribute('readonly', 'true');
        if (btnNsx) {
            btnNsx.style.pointerEvents = 'none';
            btnNsx.style.opacity = '0.4';
        }
    } else {
        nsxInput.removeAttribute('readonly');
        if (btnNsx) {
            btnNsx.style.pointerEvents = 'auto';
            btnNsx.style.opacity = '1';
        }
    }
    notifyLookupDomChanged();
}

export function refreshCalculationForm() {
    ['tenHang', 'barcode', 'quantity', 'nsx', 'hsdDate', 'hsdDays', 'hsdMonths'].forEach(id => {
        const input = document.getElementById(id);
        if (input) input.value = '';
    });
    if (nsxFlatpickr) nsxFlatpickr.clear();
    if (hsdFlatpickr) hsdFlatpickr.clear();

    const defaultDvt = document.getElementById('calcDvtEA');
    if (defaultDvt) defaultDvt.checked = true;

    const wrapper = document.getElementById('resultWrapper');
    const text = document.getElementById('resultText');
    if (wrapper) wrapper.className = 'calc-board__result-wrapper';
    if (text) {
        text.innerHTML = '';
        text.classList.remove('calc-board__result-text--visible');
    }
    const diagramBoard = document.getElementById('diagramBoard');
    if (diagramBoard) {
        delete diagramBoard.dataset.ready;
        diagramBoard.style.display = 'none';
    }
    const svgContainer = document.getElementById('svgContainer');
    if (svgContainer) svgContainer.innerHTML = '';
    setCalcFocusTheme('safe');

    setSelectedHistoryId(null);
    updateHistoryUI();
    document.getElementById('tenHang')?.focus();
    notifyLookupDomChanged();
}

export function setCalcFocusTheme(theme = 'safe') {
    const focusZone = document.querySelector('.calc-focus-zone');
    if (focusZone) focusZone.dataset.theme = theme;
}

export function openResultModal(result) {
    window.dispatchEvent(new CustomEvent('coop:result-modal-open', { detail: result }));
}

export function closeResultModal() {
    window.dispatchEvent(new CustomEvent('coop:result-modal-close'));
}

export function executeCalculation(saveToHistory = true) {
    if (document.getElementById('vue-lookup-root')?.dataset.vueReady === 'true') {
        window.dispatchEvent(new CustomEvent('coop:lookup-execute', { detail: { saveToHistory } }));
        return;
    }
    const nsxVal = document.getElementById('nsx').value.trim();
    const hsdDateVal = document.getElementById('hsdDate').value.trim();
    const hsdDaysVal = document.getElementById('hsdDays').value.trim();
    const hsdMonthsVal = document.getElementById('hsdMonths').value.trim();
    const barcodeVal = document.getElementById('barcode').value.trim();
    const tenHangVal = document.getElementById('tenHang') ? document.getElementById('tenHang').value.trim() : '';
    const quantityRawVal = document.getElementById('quantity').value.trim();
    let quantityVal = quantityRawVal !== "" ? parseFloat(quantityRawVal) : "";
    if (quantityRawVal !== "" && isNaN(quantityVal)) quantityVal = "";
    const calcDvtVal = document.querySelector('input[name="calcDvt"]:checked').value;

    const wrapper = document.getElementById('resultWrapper');
    const text = document.getElementById('resultText');

    if (text) {
        text.classList.remove('calc-board__result-text--visible');
    }

    setTimeout(() => {
        try {
            if (calcMode === 'forward') {
                if (!nsxVal) throw new Error("Vui lòng nhập Ngày sản xuất (NSX).");
                if (!isValidDateStr(nsxVal)) throw new Error("Ngày sản xuất không đúng định dạng (dd/mm/yyyy).");
                if (!hsdDateVal && !hsdDaysVal && !hsdMonthsVal) throw new Error("Vui lòng nhập Hạn sử dụng (chọn Ngày, điền Số ngày hoặc Số tháng).");
                if (hsdDateVal && !isValidDateStr(hsdDateVal)) throw new Error("Hạn sử dụng không đúng định dạng ngày (dd/mm/yyyy).");
            } else {
                if (!hsdDateVal && !hsdDaysVal && !hsdMonthsVal) throw new Error("Vui lòng nhập dữ liệu Hạn sử dụng để tra ngược về NSX.");
                if (hsdDateVal && !isValidDateStr(hsdDateVal)) throw new Error("Hạn sử dụng đã nhập không đúng định dạng ngày (dd/mm/yyyy).");
                if (!nsxVal) throw new Error("Hệ thống chưa thể tính ngược ra Ngày sản xuất. Vui lòng kiểm tra lại số liệu.");
            }

            if (isValidDateStr(nsxVal) && isValidDateStr(hsdDateVal)) {
                const d1 = parseLocalDate(nsxVal);
                const d2 = parseLocalDate(hsdDateVal);
                if (d2 <= d1) throw new Error("Hạn sử dụng phải lớn hơn Ngày sản xuất ít nhất 1 ngày.");
            }

            const output = processReturnBusinessLogic(nsxVal, hsdDateVal);
            drawTimelineDiagram(nsxVal, hsdDateVal, output.dateStr);

            if (wrapper) {
                wrapper.className = `calc-board__result-wrapper ${output.alert.class}`;
            }

            const { mainLabel, mainText, subLines } = formatPresentationResult(output);
            const weight = output.isExpiredProduct ? 800 : 600;
            const formattedSubLines = [...subLines];
            formattedSubLines[0] = `<span style="font-weight: ${weight};">${formattedSubLines[0]}</span>`;
            const subText = formattedSubLines.join('<br>');

            if (text) {
                text.innerHTML = mainText + "<br><small>" + subText + "</small>";
            }

            // Open popup result modal
            const alertType = output.isShortProduct ? 'other' : output.alert.type;
            const theme = alertType; // 'safe', 'warning', 'danger', 'other', 'expired'
            setCalcFocusTheme(theme);
            const quantityDetail = quantityVal !== '' ? `${quantityVal} ${calcDvtVal}` : 'Chưa nhập';
            const barcodeDetail = barcodeVal || 'Tra cứu không mã';
            const resultLabel = output.isShortProduct ? 'Hạn sử dụng' : 'Ngày lùi';
            const remainingDetail = output.isExpiredProduct ? 'Đã hết HSD' : formatRemainingText(output.daysRemaining);
            openResultModal({
                theme, title: 'Kết quả tra cứu', mainLabel, mainValue: output.dateStr, subLines,
                kphType: output.isShortProduct ? 'TPTS' : 'TPCN',
                details: [
                    { label: 'Tên hàng', value: tenHangVal || 'Chưa nhập' }, { label: 'Barcode', value: barcodeDetail },
                    { label: 'Số lượng', value: quantityDetail }, { label: 'NSX', value: nsxVal },
                    { label: 'HSD', value: output.formattedHsd }, { label: resultLabel, value: output.dateStr, highlight: true },
                    { label: 'Trạng thái', value: `${output.alert.label} · ${remainingDetail}` },
                ],
            });

            const historyPayload = buildLookupHistoryPayload({
                nsx: nsxVal,
                hsdDate: hsdDateVal,
                hsdDays: hsdDaysVal,
                barcode: barcodeVal,
                tenHang: tenHangVal,
                quantity: quantityVal,
                dvt: calcDvtVal,
            }, output);

            if (saveToHistory) {
                // A later barcode identifies the temporary anonymous lookup;
                // keep any records that already have their own barcode.
                historyData
                    .filter(item => isAnonymousLookupSupersededByBarcode(item, historyPayload))
                    .forEach(item => removeHistoryItem(item.id));
                // History is immutable: an identical lookup points to the old record,
                // while any changed linked field creates a genuinely new record.
                const existingItem = historyData.find(item =>
                    item.nsx === historyPayload.nsx &&
                    item.rawHsdDate === historyPayload.rawHsdDate &&
                    String(item.rawHsdDays) === String(historyPayload.rawHsdDays) &&
                    item.formattedHsd === historyPayload.formattedHsd &&
                    item.barcode === historyPayload.barcode &&
                    item.tenHang === historyPayload.tenHang &&
                    String(item.quantity ?? '') === String(historyPayload.quantity ?? '') &&
                    item.dvt === historyPayload.dvt
                );
                if (existingItem) {
                    setSelectedHistoryId(existingItem.id);
                    updateHistoryUI();
                    return;
                }
                const newItem = {
                    id: 'item_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
                    ...historyPayload
                };
                historyData.unshift(newItem);
                saveHistoryToStorage(newItem);
                setSelectedHistoryId(newItem.id);
                updateHistoryUI();
            }
        } catch (error) {
            setCalcFocusTheme('danger');
            if (wrapper) {
                wrapper.className = 'calc-board__result-wrapper state-danger';
            }

            const userFriendlyMessage = getFriendlyErrorMessage(error.message);

            if (text) {
                text.innerHTML = `<div style="line-height: 1.6; font-size: 13px; color: #e20514; font-weight: 600;">${userFriendlyMessage}</div>`;
            }

            // Open popup result modal for validation error
            const plainMessage = userFriendlyMessage.replace(/<[^>]+>/g, '').replace('⚠️ ', '');
            openResultModal({ theme: 'danger', title: 'Lỗi tra cứu', mainLabel: 'Thông tin chưa đúng', subLines: [plainMessage] });

            const container = document.getElementById('svgContainer');
            if (container) container.innerHTML = '';
            const board = document.getElementById('diagramBoard');
            if (board) {
                delete board.dataset.ready;
                board.style.display = 'none';
            }
        }

        if (text) {
            text.offsetHeight;
            text.classList.add('calc-board__result-text--visible');
        }
    }, 150);
}

window.addEventListener('coop:history-restore', (event) => {
    const { nsx, hsdDate } = event.detail || {};
    if (nsxFlatpickr) nsxFlatpickr.setDate(nsx, false);
    if (hsdFlatpickr) hsdFlatpickr.setDate(hsdDate, false);
    executeCalculation(false);
});

// Khởi chạy khi DOM sẵn sàng
document.addEventListener('DOMContentLoaded', async () => {
    // Khóa lớp nền khi bất kỳ modal nào đang mở và khôi phục đúng vị trí cuộn khi đóng.
    (function initModalScrollLock() {
        const modals = Array.from(document.querySelectorAll('.apple-modal'));
        if (modals.length === 0) return;

        let locked = false;
        let pageScrollY = 0;
        const syncScrollLock = () => {
            const shouldLock = modals.some(modal => modal.classList.contains('active'));
            if (shouldLock === locked) return;

            if (shouldLock) {
                pageScrollY = window.scrollY;
                document.body.style.top = `-${pageScrollY}px`;
                document.body.classList.add('modal-scroll-locked');
            } else {
                document.body.classList.remove('modal-scroll-locked');
                document.body.style.top = '';
                window.scrollTo(0, pageScrollY);
            }
            locked = shouldLock;
        };

        const observer = new MutationObserver(syncScrollLock);
        modals.forEach(modal => observer.observe(modal, { attributes: true, attributeFilter: ['class'] }));
        syncScrollLock();
    })();

    // 0. Đồng bộ hóa trạng thái công tắc gạt và chế độ tính
    (function syncToggleMode() {
        const toggle = document.getElementById('calcModeToggle');
        if (toggle) {
            calcMode = toggle.checked ? 'forward' : 'backward';
            const label = document.getElementById('nsxToggleLabel') || document.querySelector('.nsx-toggle-label');
            if (label) {
                label.textContent = toggle.checked ? 'Đã biết' : 'Chưa biết';
            }
            const nsxInput = document.getElementById('nsx');
            const btnNsx = document.getElementById('btnNsxPicker');
            if (nsxInput) {
                if (calcMode === 'backward') {
                    nsxInput.setAttribute('readonly', 'true');
                    if (btnNsx) {
                        btnNsx.style.pointerEvents = 'none';
                        btnNsx.style.opacity = '0.4';
                    }
                } else {
                    nsxInput.removeAttribute('readonly');
                    if (btnNsx) {
                        btnNsx.style.pointerEvents = 'auto';
                        btnNsx.style.opacity = '1';
                    }
                }
            }
        }
    })();

    // 1. Khởi tạo Flatpickr cho Tra cứu
    nsxFlatpickr = flatpickr("#nsxHidden", {
        dateFormat: "d/m/Y",
        position: "below",
        disableMobile: true,
        appendTo: document.getElementById('nsx').parentNode,
        onChange: function (selectedDates, dateStr) {
            document.getElementById('nsx').value = dateStr;
            document.getElementById('hsdMonths').value = "";
            const hsdDaysVal = document.getElementById('hsdDays').value.trim();
            if (hsdDaysVal !== "") { syncFromDaysToDate(); } else { syncFromDateToDays(); }
        }
    });
    hsdFlatpickr = flatpickr("#hsdHidden", {
        dateFormat: "d/m/Y",
        position: "below",
        disableMobile: true,
        appendTo: document.getElementById('hsdDate').parentNode,
        onChange: function (selectedDates, dateStr) {
            document.getElementById('hsdDate').value = dateStr;
            document.getElementById('hsdMonths').value = "";
            if (calcMode === 'forward') { syncFromDateToDays(); } else {
                const hsdDaysVal = document.getElementById('hsdDays').value.trim();
                if (hsdDaysVal !== "") syncFromDaysToDate();
            }
        }
    });

    // 2. Định dạng hồ sơ Apple Chronometer
    (function initAppleChronometer() {
        const now = new Date();
        const daysOfWeek = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
        const dayOfWeekStr = daysOfWeek[now.getDay()];
        const dayOfMonthStr = String(now.getDate()).padStart(2, '0');
        const monthStr = String(now.getMonth() + 1).padStart(2, '0');
        const yearStr = now.getFullYear();
        
        const fullContainer = document.getElementById('widgetFullDate');
        if (fullContainer) { fullContainer.innerText = `${dayOfWeekStr}, Ngày ${dayOfMonthStr}/${monthStr}/${yearStr}`; }
        
        const shortDaysOfWeek = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
        const shortDayOfWeekStr = shortDaysOfWeek[now.getDay()];
        const shortContainer = document.getElementById('widgetShortDate');
        if (shortContainer) { shortContainer.innerText = `${shortDayOfWeekStr}, ${dayOfMonthStr}/${monthStr}/${yearStr}`; }
    })();

    // 3. Nạp lịch sử & KPH
    await Promise.all([
        loadHistoryFromStorage(),
        loadKphLogs()
    ]);
    window.addEventListener('coop:remote-sync', async () => {
        await Promise.all([loadHistoryFromStorage(), loadKphLogs()]);
    });
    initKphFlatpickrs();
    openNotificationModal();

    // 3.5. Chặn nổi bọt sự kiện cho các nút picker để tránh đóng Flatpickr lập tức
    document.querySelectorAll('.btn-picker-trigger').forEach(btn => {
        const stopPropagationHandler = (e) => {
            e.stopPropagation();
        };
        btn.addEventListener('click', stopPropagationHandler);
        btn.addEventListener('touchstart', stopPropagationHandler, { passive: true });
    });

    // Fallback cho header compact trên mobile khi cuộn trang (nếu trình duyệt không hỗ trợ scroll-driven animations)
    if (window.matchMedia('(max-width: 1023px)').matches && !CSS.supports('(animation-timeline: scroll()) and (animation-range: 0% 100%)')) {
        const header = document.querySelector('.app-header');
        if (header) {
            window.addEventListener('scroll', () => {
                if (window.scrollY > 40) {
                    header.classList.add('app-header--compact');
                } else {
                    header.classList.remove('app-header--compact');
                }
            }, { passive: true });
        }
    }

    // Scroll listener for sticky actions in the KPH create and approval modals
    (function initKphModalScroll() {
        document.querySelectorAll('#kphCreateModal, #kphApproveModal').forEach(modal => {
            const modalContent = modal.querySelector('.apple-modal-content');
            const actions = modal.querySelector('.kph-form-actions');
            if (!modalContent || !actions) return;

            let lastScrollTop = 0;
            modalContent.addEventListener('scroll', () => {
                const scrollTop = modalContent.scrollTop;
                const scrollHeight = modalContent.scrollHeight;
                const clientHeight = modalContent.clientHeight;
                
                const distanceToBottom = scrollHeight - scrollTop - clientHeight;
                const isNearTop = scrollTop < 50;
                
                const hasSticky = actions.classList.contains('sticky-compact');
                
                if (hasSticky) {
                    // Currently sticky: check if we should remove sticky (near top or near bottom)
                    // We remove sticky when we scroll very close to the bottom (< 50px)
                    if (isNearTop || distanceToBottom < 50) {
                        actions.classList.remove('sticky-compact', 'sticky-hidden');
                    } else {
                        // Keep sticky, handle scroll direction
                        if (scrollTop > lastScrollTop) {
                            // Scroll down: show sticky compact
                            actions.classList.remove('sticky-hidden');
                        } else {
                            // Scroll up: hide
                            actions.classList.add('sticky-hidden');
                        }
                    }
                } else {
                    // Currently normal: check if we should make it sticky
                    // Must be away from top (scrollTop >= 50), away from bottom (distanceToBottom >= 130), and scrolling down
                    // This gap (50px to 130px) creates a hysteresis zone preventing infinite loops.
                    if (!isNearTop && distanceToBottom >= 130 && scrollTop > lastScrollTop) {
                        actions.classList.add('sticky-compact');
                        actions.classList.remove('sticky-hidden');
                    }
                }
                
                lastScrollTop = scrollTop <= 0 ? 0 : scrollTop;
            }, { passive: true });
        });
    })();

    // 4. Lắng nghe mask tự động date nhập tay
    document.querySelectorAll('.auto-date').forEach(input => {
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                const form = input.closest('form');
                if (form && form.id === 'kphForm') {
                    addKphLog();
                } else {
                    executeCalculation();
                }
                return;
            }
            if (['Backspace', 'Tab', 'ArrowLeft', 'ArrowRight', 'Delete'].includes(e.key)) return;
            if (!/[0-9]/.test(e.key)) e.preventDefault();
        });
        input.addEventListener('input', () => {
            let value = input.value.replace(/\D/g, '');
            if (value.length > 2 && value.length <= 4) {
                value = `${value.slice(0, 2)}/${value.slice(2)}`;
            } else if (value.length > 4) {
                value = `${value.slice(0, 2)}/${value.slice(2, 4)}/${value.slice(4, 8)}`;
            }
            input.value = value;

            // Tự động áp dụng bộ lọc KPH khi gõ tay xong ngày hợp lệ
            if (value.length === 10 && isValidDateStr(value)) {
                if (input.id === 'kphFilterTuNgay' || input.id === 'kphFilterDenNgay') {
                    if (input.id === 'kphFilterTuNgay' && window.kphFilterTuNgayPicker) {
                        window.kphFilterTuNgayPicker.setDate(parseLocalDate(value), false);
                    } else if (input.id === 'kphFilterDenNgay' && window.kphFilterDenNgayPicker) {
                        window.kphFilterDenNgayPicker.setDate(parseLocalDate(value), false);
                    }
                    applyKphDateFilter();
                }
            } else if (value === '') {
                if (input.id === 'kphFilterTuNgay' || input.id === 'kphFilterDenNgay') {
                    if (input.id === 'kphFilterTuNgay' && window.kphFilterTuNgayPicker) {
                        window.kphFilterTuNgayPicker.clear();
                    } else if (input.id === 'kphFilterDenNgay' && window.kphFilterDenNgayPicker) {
                        window.kphFilterDenNgayPicker.clear();
                    }
                    applyKphDateFilter();
                }
            }
        });
    });

    // 5. Đồng bộ input listeners
    const nsxInput = document.getElementById('nsx');
    if (nsxInput) {
        nsxInput.addEventListener('input', () => {
            document.getElementById('hsdMonths').value = "";
            const nsxVal = nsxInput.value.trim();
            if (isValidDateStr(nsxVal) && nsxFlatpickr) {
                nsxFlatpickr.setDate(parseLocalDate(nsxVal), false);
            } else if (nsxVal === "" && nsxFlatpickr) {
                nsxFlatpickr.clear();
            }
            if (calcMode === 'forward') {
                const hsdDaysVal = document.getElementById('hsdDays').value.trim();
                if (hsdDaysVal !== "") { syncFromDaysToDate(); } else { syncFromDateToDays(); }
            } else {
                syncFromDateToDays();
            }
        });
    }

    const hsdDateInput = document.getElementById('hsdDate');
    if (hsdDateInput) {
        hsdDateInput.addEventListener('input', () => {
            document.getElementById('hsdMonths').value = "";
            const hsdDateVal = hsdDateInput.value.trim();
            if (isValidDateStr(hsdDateVal) && hsdFlatpickr) {
                hsdFlatpickr.setDate(parseLocalDate(hsdDateVal), false);
            } else if (hsdDateVal === "" && hsdFlatpickr) {
                hsdFlatpickr.clear();
            }
            if (calcMode === 'forward') {
                syncFromDateToDays();
            } else {
                const hsdDaysVal = document.getElementById('hsdDays').value.trim();
                if (hsdDaysVal !== "") { syncFromDaysToDate(); }
            }
        });
    }

    const hsdDaysInput = document.getElementById('hsdDays');
    if (hsdDaysInput) {
        hsdDaysInput.addEventListener('input', syncFromDaysToDate);
        hsdDaysInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') { e.preventDefault(); executeCalculation(); }
        });
    }

    const hsdMonthsInput = document.getElementById('hsdMonths');
    if (hsdMonthsInput) {
        hsdMonthsInput.addEventListener('input', syncFromMonthsToDate);
        hsdMonthsInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') { e.preventDefault(); executeCalculation(); }
        });
    }

    // Khởi tạo app versioning & offline
    initAppVersion();
    notifyAppVersionUpdate();
    initPwaInstall();

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
            closeResultModal();
            closeImageModal();
            closeKphCreateModal();
            closeKphApproveModal();
            closeNotificationModal();
            closeScanner();
            closeAppUpdateModal();
            closeInstallHelpModal();
        }
    });

    // 5. Khởi tạo các tab tích hợp trên sidebar trái
    (function initIntegratedSidebar() {
        document.querySelectorAll('[data-sidebar-tab]').forEach((tab) => {
            tab.addEventListener('click', () => {
                const target = tab.dataset.sidebarTab;
                document.querySelectorAll('.tab-btn').forEach((item) => item.classList.remove('active'));
                document.querySelectorAll('[data-sidebar-tab]').forEach((item) => {
                    item.classList.toggle('active', item === tab);
                    item.setAttribute('aria-selected', String(item === tab));
                });
                document.querySelectorAll('[data-sidebar-panel]').forEach((panel) => {
                    panel.classList.toggle('active', panel.dataset.sidebarPanel === target);
                });
                document.querySelector('.app-container')?.classList.add('system-workspace-active');
            });
        });
        
        // Tải cấu hình khi khởi động app
        loadStoreSettings();
        
        // Đăng ký lưu cấu hình tự động khi thay đổi trên sidebar
        const sidebarCf = document.getElementById('sidebarCoopFood');
        const sidebarStore = document.getElementById('sidebarStore');
        const sidebarCht = document.getElementById('sidebarCht');
        
        if (sidebarCf) sidebarCf.addEventListener('input', saveSidebarSettings);
        if (sidebarStore) sidebarStore.addEventListener('input', saveSidebarSettings);
        if (sidebarCht) sidebarCht.addEventListener('input', saveSidebarSettings);
    })();
});

// --- EXPOSE HANDLERS TO GLOBAL WINDOW SCOPE ---
// Điều này cực kỳ quan trọng để giữ index.html hoạt động không bị lỗi ReferenceError
window.switchTab = switchTab;
window.handleToggleMode = handleToggleMode;
window.openScannerForCalc = openScannerForCalc;
window.openNsxPicker = openNsxPicker;
window.openHsdPicker = openHsdPicker;
window.executeCalculation = executeCalculation;
window.refreshCalculationForm = refreshCalculationForm;
window.clearAllHistory = clearAllHistory;
window.setFilter = setFilter;
window.togglePrioritySort = togglePrioritySort;
window.openKphNgayPicker = openKphNgayPicker;
window.openFilterTuNgayPicker = openFilterTuNgayPicker;
window.openFilterDenNgayPicker = openFilterDenNgayPicker;
window.saveNguoiPhatHien = saveNguoiPhatHien;
window.openScannerForKPH = openScannerForKPH;
window.toggleTinhTrangKhac = toggleTinhTrangKhac;
window.toggleBienPhapKhac = toggleBienPhapKhac;
window.toggleTinhTrangRadio = toggleTinhTrangRadio;
window.toggleBienPhapRadio = toggleBienPhapRadio;
window.updateCharCount = updateCharCount;
window.openKphNgayXuLyPicker = openKphNgayXuLyPicker;
window.handleKphImageUpload = handleKphImageUpload;
window.clearKphImage = clearKphImage;
window.addKphLog = addKphLog;
window.clearKphForm = clearKphForm;
window.exportKphToExcel = exportKphToExcel;
window.clearAllKphLogs = clearAllKphLogs;
window.applyKphDateFilter = applyKphDateFilter;
window.clearKphDateFilter = clearKphDateFilter;
window.toggleSelectAllKph = toggleSelectAllKph;
window.closeImageModal = closeImageModal;
window.closeScanner = closeScanner;
window.switchCamera = switchCamera;
window.toggleTorch = toggleTorch;
window.loadHistoryItem = loadHistoryItem;
window.removeHistoryItem = removeHistoryItem;
window.exportHistoryToExcel = exportHistoryToExcel;
window.toggleSelectRowKph = toggleSelectRowKph;
window.removeKphLog = removeKphLog;
window.zoomImage = zoomImage;
window.toggleKphSort = toggleKphSort;
window.deleteSelectedKphLogs = deleteSelectedKphLogs;
window.showAppleToast = showAppleToast;
window.showAppleConfirm = showAppleConfirm;
window.closeAppUpdateModal = closeAppUpdateModal;
window.closeInstallHelpModal = closeInstallHelpModal;
window.openKphCreateModal = openKphCreateModal;
window.closeKphCreateModal = closeKphCreateModal;
window.closeResultModal = closeResultModal;
window.openResultModal = openResultModal;

window.openKphApproveModal = openKphApproveModal;
window.closeKphApproveModal = closeKphApproveModal;
window.openKphApproveNgayXuLyPicker = openKphApproveNgayXuLyPicker;
window.saveKphApproval = saveKphApproval;
window.toggleApproveBienPhapRadio = toggleApproveBienPhapRadio;
window.toggleApproveNguoiDuyetEdit = toggleApproveNguoiDuyetEdit;
window.switchKphSubTab = switchKphSubTab;
window.toggleKphFilterChoDuyet = toggleKphFilterChoDuyet;

export function toggleBarcodeFormats() {
    const container = document.getElementById('barcodeFormatsContainer');
    if (container) {
        container.classList.toggle('hidden');
    }
}
window.toggleBarcodeFormats = toggleBarcodeFormats;

export function createKphFromCalculation() {
    const tenHangVal = document.getElementById('tenHang') ? document.getElementById('tenHang').value.trim() : '';
    const barcodeVal = document.getElementById('barcode') ? document.getElementById('barcode').value.trim() : '';
    const quantityVal = document.getElementById('quantity') ? document.getElementById('quantity').value.trim() : '';
    
    // Get unit radio selection from lookup form
    const calcDvtKg = document.getElementById('calcDvtKg');
    const dvtVal = (calcDvtKg && calcDvtKg.checked) ? 'kg' : 'EA';

    // Close result modal
    closeResultModal();

    // Tính toán hạn sử dụng (shelf life) để tự động quyết định loại hàng
    let shelfLife = 0;
    const isModeHsdDate = document.getElementById('calcModeToggle') ? document.getElementById('calcModeToggle').checked : true;
    
    if (isModeHsdDate) {
        const nsxStr = document.getElementById('nsx') ? document.getElementById('nsx').value.trim() : '';
        const hsdStr = document.getElementById('hsdDate') ? document.getElementById('hsdDate').value.trim() : '';
        if (isValidDateStr(nsxStr) && isValidDateStr(hsdStr)) {
            const nsxDate = parseLocalDate(nsxStr);
            const hsdDate = parseLocalDate(hsdStr);
            shelfLife = Math.round((hsdDate - nsxDate) / MS_PER_DAY) + 1;
        }
    } else {
        const daysVal = document.getElementById('hsdDays') ? document.getElementById('hsdDays').value.trim() : '';
        shelfLife = parseInt(daysVal, 10) || 0;
    }

    // TPTS dưới 10 ngày, trên hoặc bằng 10 ngày là TPCN
    const type = (shelfLife > 0 && shelfLife < 10) ? 'TPTS' : 'TPCN';

    // Switch to KPH tab
    switchTab('kph');

    // Open KPH Create Modal
    openKphCreateModal(type);

    // Fill values into KPH form
    const kphTenHang = document.getElementById('kphTenHang');
    const kphSku = document.getElementById('kphSku');
    const kphSoLuong = document.getElementById('kphSoLuong');
    
    if (kphTenHang) kphTenHang.value = tenHangVal;
    if (kphSku) kphSku.value = barcodeVal;
    if (kphSoLuong) kphSoLuong.value = quantityVal;

    // Check correct radio button for KPH unit
    const kphDvtEA = document.getElementById('kphDvtEA');
    const kphDvtKg = document.getElementById('kphDvtKg');
    if (dvtVal === 'kg') {
        if (kphDvtKg) kphDvtKg.checked = true;
    } else {
        if (kphDvtEA) kphDvtEA.checked = true;
    }

    // Trigger input / change events so char counts and layout update
    if (kphTenHang) {
        kphTenHang.dispatchEvent(new Event('input', { bubbles: true }));
    }
}
window.createKphFromCalculation = createKphFromCalculation;
window.addEventListener('coop:create-kph-from-calculation', createKphFromCalculation);
