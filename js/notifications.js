import { kphLogs, switchTab, switchKphSubTab, kphFilterChoDuyet, toggleKphFilterChoDuyet } from './kph.js';
import { historyData, loadHistoryItem } from './history.js';

export function updateNotificationStats() {
    // 1. Calculate KPH pending counts
    const pendingTpcn = kphLogs.filter(item => 
        (item.loaiKph === 'TPCN' || !item.loaiKph) && 
        (item.trangThaiDuyet || 'cho_duyet') === 'cho_duyet'
    ).length;
    const pendingTpts = kphLogs.filter(item => 
        item.loaiKph === 'TPTS' && 
        (item.trangThaiDuyet || 'cho_duyet') === 'cho_duyet'
    ).length;
    
    // 2. Calculate History warning/danger/expired counts
    const warningItems = historyData.filter(item => item.alertType === 'warning');
    const dangerItems = historyData.filter(item => item.alertType === 'danger');
    const expiredItems = historyData.filter(item => item.alertType === 'expired');
    
    const warningCount = warningItems.length;
    const dangerCount = dangerItems.length;
    const expiredCount = expiredItems.length;
    
    const totalPendingKph = pendingTpcn + pendingTpts;
    const totalHistoryNotif = warningCount + dangerCount + expiredCount;
    // Header badge is Vue-owned: it only counts unread activity relevant to
    // the current role, rather than all pending records/history warnings.
    // Update Sidebar Statistics counts
    const valKphTpcn = document.querySelector('.val-kph-tpcn');
    const valKphTpts = document.querySelector('.val-kph-tpts');
    const valTracuuWarning = document.querySelector('.val-tracuu-warning');
    const valTracuuDanger = document.querySelector('.val-tracuu-danger');
    const valTracuuExpired = document.querySelector('.val-tracuu-expired');
    
    if (valKphTpcn) valKphTpcn.innerText = pendingTpcn;
    if (valKphTpts) valKphTpts.innerText = pendingTpts;
    if (valTracuuWarning) valTracuuWarning.innerText = warningCount;
    if (valTracuuDanger) valTracuuDanger.innerText = dangerCount;
    if (valTracuuExpired) valTracuuExpired.innerText = expiredCount;
    
    window.dispatchEvent(new CustomEvent('coop:notifications-changed'));
}

export function openNotificationModal() {
    const modal = document.getElementById('notificationModal');
    if (modal) {
        modal.classList.add('active');
        // Force update to get the latest data when opening
        updateNotificationStats();
    }
}

export function closeNotificationModal() {
    const modal = document.getElementById('notificationModal');
    if (modal) {
        modal.classList.remove('active');
    }
}

export function handleNotificationHistoryClick(nsx, hsdDate, hsdDays, barcode, quantity, dvt, tenHang, id) {
    closeNotificationModal();
    switchTab('tracuu');
    loadHistoryItem(nsx, hsdDate, hsdDays, barcode, quantity, dvt, tenHang, id);
    
    // Tự động cuộn đến phần tử trong danh sách lịch sử sau khi DOM render xong
    setTimeout(() => {
        const targetEl = document.getElementById(`history-item-${id}`);
        if (targetEl) {
            targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }, 120);
}

export function handleNotificationKphClick(subTabId) {
    closeNotificationModal();
    switchTab('kph');
    switchKphSubTab(subTabId);
    // Bật bộ lọc "Chờ duyệt" nếu chưa bật
    if (!kphFilterChoDuyet) {
        toggleKphFilterChoDuyet();
    }
}

// Expose to window scope for HTML onclick bindings
window.openNotificationModal = openNotificationModal;
window.closeNotificationModal = closeNotificationModal;
window.handleNotificationHistoryClick = handleNotificationHistoryClick;
window.handleNotificationKphClick = handleNotificationKphClick;
window.updateNotificationStats = updateNotificationStats;
