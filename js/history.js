import { 
    formatLocalDate, 
    showAppleConfirm, 
    showAppleToast, 
    loadExcelJS,
    parseLocalDate,
    MS_PER_DAY
} from './helpers.js';
import { 
    getAllHistoryLogs, 
    addHistoryLog, 
    softDeleteHistoryLog
} from './db.js';

export const historyData = [];
export const activeFilters = new Set(['all']);
export let isPrioritySort = false;
export let selectedHistoryId = null;

function getActiveBranchId() {
    try {
        return JSON.parse(localStorage.getItem('coop_branch_identity') || 'null')?.id || null;
    } catch {
        return null;
    }
}

export function setSelectedHistoryId(id) {
    selectedHistoryId = id;
}

export function setFilter(filterType) { 
    if (filterType === 'all') {
        activeFilters.clear();
        activeFilters.add('all');
    } else {
        activeFilters.delete('all');
        if (activeFilters.has(filterType)) {
            activeFilters.delete(filterType);
        } else {
            activeFilters.add(filterType);
        }
        if (activeFilters.size === 0) {
            activeFilters.add('all');
        }
    }
    
    updateHistoryUI(); 
} 

export function togglePrioritySort() { 
    isPrioritySort = !isPrioritySort; 
    updateHistoryUI(); 
} 

export async function loadHistoryFromStorage() {
    try {
        // Tự động di chuyển dữ liệu cũ từ localStorage sang IndexedDB
        const stored = localStorage.getItem('coop_date_history');
        if (stored) {
            console.log("Tìm thấy dữ liệu lịch sử cũ trong localStorage, tiến hành migration sang IndexedDB...");
            try {
                const parsed = JSON.parse(stored);
                for (const item of parsed) {
                    if (!item.id) {
                        item.id = 'item_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
                    }
                    // Migrate legacy 'short' type to 'other'
                    if (item.alertType === 'short') {
                        item.alertType = 'other';
                    }
                    await addHistoryLog(item);
                }
                localStorage.removeItem('coop_date_history');
                console.log("Migration dữ liệu lịch sử thành công!");
            } catch (migrationErr) {
                console.error("Lỗi trong quá trình migration dữ liệu lịch sử:", migrationErr);
            }
        }
        
        const activeBranchId = getActiveBranchId();
        const logs = await getAllHistoryLogs();
        historyData.length = 0;
        historyData.push(...logs.filter(log => !log.deletedAt && (!activeBranchId || log.branchId === activeBranchId)));
        // Sắp xếp theo thứ tự thời gian tra cứu giảm dần (mới nhất lên trên)
        historyData.sort((a, b) => {
            const timeA = a.checkedAt ? new Date(a.checkedAt).getTime() : 0;
            const timeB = b.checkedAt ? new Date(b.checkedAt).getTime() : 0;
            return timeB - timeA;
        });
        updateHistoryUI();
    } catch (e) {
        console.error("Failed to load history from IndexedDB", e);
    }
}

export async function saveHistoryToStorage(item) {
    try {
        if (item) {
            await addHistoryLog({ ...item, branchId: getActiveBranchId() || item.branchId });
        }
    } catch (e) {
        console.error("Failed to save history to IndexedDB", e);
    }
}

export function removeHistoryItem(id) {
    const idx = historyData.findIndex(item => item.id === id);
    if (idx !== -1) {
        const item = historyData[idx];
        historyData.splice(idx, 1);
        softDeleteHistoryLog(item).catch(err => console.error("Lỗi khi xóa khỏi DB:", err));
        updateHistoryUI();
    }
}

export function removeHistoryItemFromDB(id) {
    const item = historyData.find(item => item.id === id);
    if (item) softDeleteHistoryLog(item).catch(err => console.error("Lỗi khi xóa khỏi DB:", err));
}

export function clearAllHistory() {
    if (historyData.length === 0) return;
    let displayData = [...historyData];
    if (!activeFilters.has('all')) {
        displayData = displayData.filter(item => activeFilters.has(item.alertType));
    }
    if (isPrioritySort) displayData.sort((a, b) => a.alertWeight - b.alertWeight);
    if (displayData.length === 0) return;

    const idsToRemove = new Set(displayData.map(item => item.id));
    const filterNames = {
        safe: 'An toàn',
        warning: 'Sắp tới hạn',
        danger: 'Quá hạn lùi',
        other: 'Khác',
        expired: 'Đã hết HSD'
    };
    const isDeletingAll = activeFilters.has('all');
    const appliedFilters = isDeletingAll
        ? 'Tất cả lịch sử tra cứu'
        : [...activeFilters].map(filter => filterNames[filter]).filter(Boolean).join(', ');
    const retainedCount = historyData.length - displayData.length;
    showAppleConfirm({
        title: `Xóa ${displayData.length} lượt tra cứu`,
        htmlContent: `
            <div style="text-align: center; padding: 10px 0;">
                <div style="width: 52px; height: 52px; border-radius: 50%; background-color: var(--status-red-bg); color: var(--brand-accent-red); display: flex; align-items: center; justify-content: center; margin: 0 auto 16px auto;">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="width: 24px; height: 24px;"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                </div>
                <p style="font-size: 15px; font-weight: 600; color: var(--text-main); margin-bottom: 8px;">Bạn có chắc chắn muốn xóa các lượt tra cứu này?</p>
                <p style="font-size: 13px; color: var(--text-sub); margin-bottom: 16px;">Hành động này không thể hoàn tác.</p>
                
                <div style="background-color: var(--bg-base); border-radius: 12px; padding: 16px; text-align: center; border: 1px solid var(--status-red-border);">
                    <div style="font-size: 28px; font-weight: 800; color: var(--brand-accent-red);">${displayData.length}</div>
                    <div style="font-size: 12px; font-weight: 600; color: var(--text-sub); text-transform: uppercase; letter-spacing: 0.5px; margin-top: 4px;">Lượt tra cứu sẽ bị xóa</div>
                </div>
                <div style="margin-top: 12px; padding: 12px; background: var(--surface); border: 1px solid rgba(0, 0, 0, 0.06); border-radius: 10px; text-align: left; font-size: 12px; line-height: 1.5; color: var(--text-sub);">
                    <div><strong style="color: var(--text-main);">Phạm vi:</strong> ${appliedFilters}</div>
                    <div><strong style="color: var(--text-main);">Dữ liệu giữ lại:</strong> ${isDeletingAll ? 'Không có' : `${retainedCount} lượt không thuộc bộ lọc`}</div>
                </div>
            </div>
        `,
        confirmText: `Xóa ${displayData.length} lượt`,
        cancelText: "Hủy",
        isDanger: true
    }).then(confirmed => {
        if (confirmed) {
            for (let i = historyData.length - 1; i >= 0; i--) {
                if (idsToRemove.has(historyData[i].id)) historyData.splice(i, 1);
            }
            Promise.all(displayData.map(item => softDeleteHistoryLog(item)))
                .catch(err => console.error("Lỗi khi dọn dẹp DB:", err));
            updateHistoryUI();
        }
    });
}

export function updateFilterCounts() {
    return {
        total: historyData.length,
        safe: historyData.filter(item => item.alertType === 'safe').length,
        warning: historyData.filter(item => item.alertType === 'warning').length,
        danger: historyData.filter(item => item.alertType === 'danger').length,
        other: historyData.filter(item => item.alertType === 'other').length,
        expired: historyData.filter(item => item.alertType === 'expired').length
    };
}

export function updateHistoryUI() {
    window.dispatchEvent(new CustomEvent('coop:history-changed', {
        detail: { counts: updateFilterCounts() }
    }));
    if (typeof window.updateNotificationStats === 'function') {
        window.updateNotificationStats();
    }
} 

export function loadHistoryItem(nsx, hsdDate, hsdDays, barcode = "", quantity = 1, dvt = "EA", tenHang = "", id = null) { 
    selectedHistoryId = id;
    proceedLoading();

    function proceedLoading() {
        updateHistoryUI();
        import('./main.js').then(module => {
            document.getElementById('nsx').value = nsx; 
            if (module.nsxFlatpickr) module.nsxFlatpickr.setDate(nsx, false); 
            document.getElementById('hsdDate').value = hsdDate; 
            if (module.hsdFlatpickr) module.hsdFlatpickr.setDate(hsdDate, false); 
            document.getElementById('hsdDays').value = hsdDays; 
            document.getElementById('barcode').value = barcode;
            
            const tenHangInput = document.getElementById('tenHang');
            if (tenHangInput) tenHangInput.value = tenHang;
            
            const calcDvtRadio = document.querySelector(`input[name="calcDvt"][value="${dvt}"]`);
            if (calcDvtRadio) calcDvtRadio.checked = true;
            
            document.getElementById('quantity').value = quantity;
            window.dispatchEvent(new CustomEvent('coop:lookup-loaded'));
            module.executeCalculation(false);
        });
    }
}

// Xuất lịch sử tra cứu ra file Excel theo đúng định dạng mẫu
export async function exportHistoryToExcel() {
    let displayData = [...historyData];
    if (!activeFilters.has('all')) {
        displayData = displayData.filter(item => activeFilters.has(item.alertType));
    }
    
    if (displayData.length === 0) {
        showAppleToast("⚠️ Không có dữ liệu phù hợp với bộ lọc hiện tại để xuất Excel.", "warning");
        return;
    }
    
    const filterNames = {
        'safe': 'An toàn',
        'warning': 'Sắp tới hạn',
        'danger': 'Quá hạn lùi',
        'other': 'Khác',
        'expired': 'Đã hết HSD'
    };
    
    let groupText = '';
    if (activeFilters.has('all')) {
        groupText = 'Tất cả';
    } else {
        groupText = Array.from(activeFilters).map(f => filterNames[f] || f).join(', ');
    }
    
    const count = displayData.length;
    const confirmExport = await showAppleConfirm({
        title: "Xác nhận xuất Excel",
        htmlContent: `
            <div style="text-align: center; padding: 10px 0;">
                <div style="width: 52px; height: 52px; border-radius: 50%; background-color: var(--status-green-bg); color: var(--brand-primary); display: flex; align-items: center; justify-content: center; margin: 0 auto 16px auto;">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="width: 24px; height: 24px;"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                </div>
                <p style="font-size: 15px; font-weight: 600; color: var(--text-main); margin-bottom: 8px;">Bạn có chắc chắn muốn xuất dữ liệu ra file Excel?</p>
                <p style="font-size: 13px; color: var(--text-sub); margin-bottom: 16px;">Tệp Excel (.xlsx) chứa lịch sử tra cứu của bạn sẽ được tải xuống.</p>
                
                <div style="background-color: var(--bg-base); border-radius: 12px; padding: 12px 16px; text-align: left; border: 1px solid var(--status-green-border); font-size: 13px; line-height: 1.6;">
                    <div style="margin-bottom: 4px; display: flex;"><span style="color: var(--text-sub); width: 125px; flex-shrink: 0; font-weight: 500;">Nhóm lọc đang chọn:</span><span style="color: var(--text-main); font-weight: 600;">${groupText}</span></div>
                    <div style="margin-bottom: 4px; display: flex;"><span style="color: var(--text-sub); width: 125px; flex-shrink: 0; font-weight: 500;">Số lượng bản ghi:</span><span style="color: var(--brand-primary); font-weight: 700;">${count} dòng</span></div>
                    <div style="margin-bottom: 4px; display: flex;"><span style="color: var(--text-sub); width: 125px; flex-shrink: 0; font-weight: 500;">Định dạng file:</span><span style="color: var(--text-main); font-weight: 600;">Microsoft Excel (.xlsx)</span></div>
                    <div style="display: flex;"><span style="color: var(--text-sub); width: 125px; flex-shrink: 0; font-weight: 500;">Nội dung xuất:</span><span style="color: var(--text-main); font-weight: 600;">Lịch sử tra cứu HSD</span></div>
                </div>
            </div>
        `,
        confirmText: "Xuất Excel",
        cancelText: "Hủy",
        isPrimary: true
    });
    if (!confirmExport) return;
    
    try {
        let sortedLogs = [...displayData];
        
        if (isPrioritySort) {
            sortedLogs.sort((a, b) => a.alertWeight - b.alertWeight);
        } else {
            // Sắp xếp theo thứ tự thời gian tra cứu giảm dần (mới nhất lên trên)
            sortedLogs.sort((a, b) => {
                const timeA = a.checkedAt ? new Date(a.checkedAt).getTime() : 0;
                const timeB = b.checkedAt ? new Date(b.checkedAt).getTime() : 0;
                return timeB - timeA;
            });
        }
        
        await loadExcelJS();
        
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Lịch sử tra cứu', {
            views: [{ showGridLines: true }]
        });
        
        // Thiết lập trang in và footer của Excel
        worksheet.pageSetup = {
            orientation: 'portrait',
            fitToPage: true,
            fitToWidth: 1,
            fitToHeight: 0
        };
        worksheet.headerFooter = {
            oddFooter: '&L&IBM-......CF&C&ILần ban hành: 01&R&ITrang &P / &N'
        };
        
        worksheet.columns = [
            { key: 'stt', width: 6 },
            { key: 'ngayKiemTra', width: 14 },
            { key: 'sku', width: 18 },
            { key: 'tenHang', width: 28 },
            { key: 'soLuong', width: 10 },
            { key: 'moc40', width: 18 },
            { key: 'moc20', width: 18 },
            { key: 'ketQua', width: 24 }
        ];
        
        // Tiêu đề đơn vị
        worksheet.getCell('A1').value = 'CÔNG TY TNHH MTV THỰC PHẨM SAIGON CO.OP';
        worksheet.getCell('A1').font = { name: 'Times New Roman', bold: true, size: 9 };
        worksheet.getCell('A1').alignment = { horizontal: 'left', wrapText: false };
        
        const storeName = localStorage.getItem('kph_store') || '';
        const storeCode = localStorage.getItem('kph_coop_food') || '';
        
        worksheet.getCell('A2').value = `CO.OP FOOD: ${storeName || '................................'}`;
        worksheet.getCell('A2').font = { name: 'Times New Roman', bold: true, size: 9 };
        worksheet.getCell('A2').alignment = { horizontal: 'left', wrapText: false };
        
        worksheet.getCell('A3').value = `STORE: ${storeCode || '................................'}`;
        worksheet.getCell('A3').font = { name: 'Times New Roman', bold: true, size: 9 };
        worksheet.getCell('A3').alignment = { horizontal: 'left', wrapText: false };
        
        worksheet.mergeCells('A5:H5');
        worksheet.getCell('A5').value = 'PHIẾU KIỂM TRA CHẤT LƯỢNG, HSD HÀNG HOÁ';
        worksheet.getCell('A5').font = { name: 'Times New Roman', bold: true, size: 15 };
        worksheet.getCell('A5').alignment = { vertical: 'middle', horizontal: 'center' };
        worksheet.getRow(5).height = 25;
        
        // Gộp hàng 7 và 8 theo chiều dọc cho từng cột tiêu đề
        worksheet.mergeCells('A7:A8');
        worksheet.mergeCells('B7:B8');
        worksheet.mergeCells('C7:C8');
        worksheet.mergeCells('D7:D8');
        worksheet.mergeCells('E7:E8');
        worksheet.mergeCells('F7:F8');
        worksheet.mergeCells('G7:G8');
        worksheet.mergeCells('H7:H8');
        
        worksheet.getCell('A7').value = 'STT';
        worksheet.getCell('B7').value = 'NGÀY\nKIỂM TRA';
        worksheet.getCell('C7').value = 'SKU';
        worksheet.getCell('D7').value = 'TÊN HÀNG HÓA';
        worksheet.getCell('E7').value = 'SỐ\nLƯỢNG';
        worksheet.getCell('F7').value = 'MỐC CẢNH BÁO\n40%';
        worksheet.getCell('G7').value = 'HẠN LÙI HÀNG\n20%';
        worksheet.getCell('H7').value = 'KẾT QUẢ KIỂM TRA';
        
        const headerCells = ['A7', 'B7', 'C7', 'D7', 'E7', 'F7', 'G7', 'H7'];
        headerCells.forEach(cellId => {
            const cell = worksheet.getCell(cellId);
            cell.font = { name: 'Times New Roman', bold: true, size: 9 };
            cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'EBEBEB' }
            };
            cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
            cell.border = {
                top: { style: 'thin' },
                left: { style: 'thin' },
                bottom: { style: 'thin' },
                right: { style: 'thin' }
            };
        });
        worksheet.getRow(7).height = 20;
        worksheet.getRow(8).height = 20;
        
        // Xuất dòng dữ liệu
        const startRow = 9;
        for (let idx = 0; idx < sortedLogs.length; idx++) {
            const item = sortedLogs[idx];
            const currentRow = startRow + idx;
            const row = worksheet.getRow(currentRow);
            row.height = 22;
            
            worksheet.getCell(`A${currentRow}`).value = idx + 1;
            
            let inspectionDate = '';
            if (item.checkedAt) {
                try {
                    inspectionDate = formatLocalDate(new Date(item.checkedAt));
                } catch(e) {
                    inspectionDate = item.nsx;
                }
            } else {
                inspectionDate = item.nsx;
            }
            worksheet.getCell(`B${currentRow}`).value = inspectionDate;
            worksheet.getCell(`C${currentRow}`).value = item.barcode || '';
            worksheet.getCell(`D${currentRow}`).value = item.tenHang || '';
            worksheet.getCell(`E${currentRow}`).value = (item.quantity !== undefined && item.quantity !== "") ? item.quantity : "";
            
            // Tính toán Mốc 40% và Hạn lùi 20%
            let date40Str = '-';
            let date20Str = '-';
            
            try {
                const nsxDate = parseLocalDate(item.nsx);
                const hsdDate = parseLocalDate(item.formattedHsd);
                const shelfLife = parseInt(item.rawHsdDays, 10);
                
                if (!isNaN(shelfLife) && shelfLife >= 10) {
                    const dayThreshold40 = Math.round(shelfLife * 0.4);
                    const dayThreshold20 = Math.round(shelfLife * 0.2);
                    
                    const mốc_40 = shelfLife - dayThreshold40;
                    const date40Obj = new Date(nsxDate.getTime() + (mốc_40 - 1) * MS_PER_DAY);
                    date40Str = formatLocalDate(date40Obj);
                    
                    const mốc_20 = shelfLife - dayThreshold20;
                    const date20Obj = new Date(nsxDate.getTime() + (mốc_20 - 1) * MS_PER_DAY);
                    date20Str = formatLocalDate(date20Obj);
                }
            } catch(e) {
                console.error("Error calculating milestones", e);
            }
            
            worksheet.getCell(`F${currentRow}`).value = date40Str;
            worksheet.getCell(`G${currentRow}`).value = date20Str;
            
            const alertType = item.alertType;
            const labelMap = {
                'safe': 'An toàn',
                'warning': 'Sắp tới hạn',
                'danger': 'Quá hạn lùi',
                'expired': 'Đã hết HSD',
                'other': 'Khác'
            };
            worksheet.getCell(`H${currentRow}`).value = labelMap[alertType] || item.alertLabel || 'Khác';
            
            const columns = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
            columns.forEach(col => {
                const cell = worksheet.getCell(`${col}${currentRow}`);
                
                if (col === 'H') {
                    // Màu sắc có độ tương phản cao, in rõ nét không bị nhạt
                    let fontColor = '000000';
                    if (alertType === 'safe') fontColor = '006633';       // Xanh lá đậm
                    else if (alertType === 'warning') fontColor = 'B85C00'; // Cam đất đậm
                    else if (alertType === 'danger') fontColor = 'C60000';  // Đỏ đậm
                    else if (alertType === 'expired') fontColor = '800000'; // Đỏ đô đậm
                    else if (alertType === 'other') fontColor = '4A4A4A';   // Xám đậm
                    
                    cell.font = { name: 'Times New Roman', size: 10, bold: true, color: { argb: fontColor } };
                } else {
                    cell.font = { name: 'Times New Roman', size: 10 };
                }
                
                cell.border = {
                    top: { style: 'thin' },
                    left: { style: 'thin' },
                    bottom: { style: 'thin' },
                    right: { style: 'thin' }
                };
                
                const isCentered = ['A', 'B', 'C', 'E', 'F', 'G', 'H'].includes(col);
                cell.alignment = {
                    vertical: 'middle',
                    horizontal: isCentered ? 'center' : 'left',
                    wrapText: true
                };
            });
        }
        
        const buffer = await workbook.xlsx.writeBuffer();
        const dateStr = formatLocalDate(new Date()).replace(/\//g, '-');
        const fileBlob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const downloadUrl = URL.createObjectURL(fileBlob);
        
        const downloadAnchor = document.createElement('a');
        downloadAnchor.href = downloadUrl;
        downloadAnchor.download = `Phieu_Kiem_Tra_Chat_Luong_HSD_${dateStr}.xlsx`;
        document.body.appendChild(downloadAnchor);
        downloadAnchor.click();
        
        document.body.removeChild(downloadAnchor);
        URL.revokeObjectURL(downloadUrl);
        
        showAppleToast("Đã xuất file Excel thành công!", "success");
    } catch (err) {
        console.error("Export history to Excel error:", err);
        showAppleToast("⚠️ Đã xảy ra lỗi khi tạo file Excel. Hãy thử lại.", "error");
    }
}
