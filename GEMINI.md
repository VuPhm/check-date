# GEMINI.md — Hướng Dẫn Cộng Tác AI trên Gemini Chat

> Tài liệu này cung cấp đầy đủ ngữ cảnh để bất kỳ phiên chat AI nào (Gemini, Claude, ChatGPT, v.v.) có thể hiểu nhanh dự án và cộng tác hiệu quả mà không cần hỏi lại từ đầu.

---

## 📋 Tổng Quan Dự Án

| Thuộc tính | Giá trị |
|---|---|
| **Tên** | Check Date CoopFood |
| **Loại** | Progressive Web App (PWA) |
| **Production URL** | https://vuphm.github.io/coop-date/ |
| **Phiên bản** | `2.17.2` (11/07/2026) |
| **Nền tảng** | HTML5 + Vanilla CSS + Vanilla JS (ES6 Modules) |
| **Framework** | Không dùng (React/Vue/Angular) |
| **CSS Framework** | Không dùng (Tailwind/Bootstrap) — Vanilla CSS theo Apple HIG |
| **Thư viện ngoài** | Flatpickr (date picker), html5-qrcode (scanner), ExcelJS + FileSaver.js (xuất Excel) |
| **Lưu trữ dữ liệu** | IndexedDB (`coop_kph_db`) — 2 stores: `kph_logs`, `history_logs` |
| **Deploy** | GitHub Pages qua GitHub Actions (`.github/workflows/static.yml`) |

---

## 🏗️ Kiến Trúc & Cấu Trúc Thư Mục

```
coop-date/
├── index.html              # Cấu trúc HTML duy nhất (Single Page App)
├── style.css               # Toàn bộ CSS (~106KB, Apple HIG Design)
├── sw.js                   # Service Worker — Network-First caching
├── manifest.json           # PWA manifest
├── version.json            # Version tracking (dùng cho cache busting)
├── coopfood-logo.png       # Logo thương hiệu
├── favicon_io/             # Icons đa nền tảng
└── js/
    ├── main.js             # ★ Entry point — DOMContentLoaded, sự kiện, điều hướng
    ├── helpers.js           # Hàm tiện ích, cấu hình version, UI components
    ├── business.js          # Logic nghiệp vụ tính hạn lùi (KHÔNG thao túng DOM)
    ├── timeline.js          # Vẽ SVG trục thời gian động
    ├── history.js           # Quản lý lịch sử tra cứu
    ├── kph.js               # Khai báo hàng KPH (TPCN/TPTS) + Quy trình duyệt
    ├── db.js                # Tầng IndexedDB CRUD (Promise-based)
    ├── notifications.js     # Trung tâm thông báo (Badge + Modal + Sidebar)
    └── scanner.js           # Camera barcode scanning
```

### Sơ đồ phụ thuộc module
```
main.js ──┬── helpers.js
          ├── business.js
          ├── timeline.js
          ├── scanner.js
          ├── history.js ──── db.js
          ├── kph.js ────┬── db.js
          │              └── helpers.js
          └── notifications.js ──┬── kph.js (exports: kphLogs, switchTab, ...)
                                 └── history.js (exports: historyData, loadHistoryItem, ...)
```

---

## 🔑 Chức Năng Chính

### 1. Tra Cứu Hạn Lùi Hàng (Tab "Tra cứu")
- **Tra Xuôi:** Nhập NSX → Nhập HSD (ngày/ngày số/tháng) → Tính ngày lùi hàng theo quy tắc 20%.
- **Tra Ngược:** Chỉ biết HSD + số ngày/tháng → Suy ngược ra NSX → Tính hạn lùi.
- **Đồng bộ 2 chiều:** Thay đổi 1 ô tự động cập nhật các ô liên quan (có cơ chế tường ngăn `isSyncing` chống loop vô hạn).
- **SVG Timeline:** Vẽ trục thời gian NSX→Hôm nay→Mốc 40%→Hạn lùi 20%→HSD.

### 2. Lịch Sử Tra Cứu
- Lưu vào IndexedDB (`history_logs`), export mảng `historyData`.
- Bộ lọc: Tất cả | An toàn | Sắp tới hạn | Quá hạn lùi | Hàng ngắn ngày | Đã hết HSD.
- Sắp xếp ưu tiên: Danger → Warning → Safe.
- Xuất Excel.

### 3. Khai Báo Hàng KPH (Tab "KPH")
- **2 Sub-tabs:** TPCN (Thực phẩm Công nghệ) và TPTS (Thực phẩm Tươi sống).
- **Form tạo phiếu:** Modal slide-up, nhập đầy đủ SKU/UPC (quét camera), tên hàng, NCC, DVT, số lượng, tình trạng, biện pháp xử lý, ảnh minh chứng.
- **Nén ảnh tự động:** Canvas resize 400×400px + JPEG 0.7 → Base64.
- **Quy trình duyệt:** `cho_duyet` → Mở modal duyệt → Nhập người duyệt + biện pháp → `da_duyet`.
- **Lọc/Sắp xếp:** Theo khoảng ngày, trạng thái duyệt, cột dữ liệu.
- **Xuất Excel:** Phân biệt TPCN/TPTS, format chuẩn phiếu.

### 4. Trung Tâm Thông Báo
- Badge đếm tổng: KPH chờ duyệt + Tra cứu warning/danger/expired.
- Modal chi tiết: Click để nhảy đến phiếu/mục tra cứu tương ứng.
- Sidebar stats: Hiển thị tổng quan trên thanh trượt trái.

---

## ⚙️ Quy Tắc Nghiệp Vụ Tính Hạn Lùi

```
Shelf Life = HSD - NSX + 1 (ngày)

Nếu Shelf Life < 10 ngày (hàng ngắn ngày):
  → Hạn lùi = HSD
  → Trạng thái: An toàn (trừ khi hôm nay > HSD → Đã hết HSD)

Nếu Shelf Life >= 10 ngày (hàng dài ngày):
  → dayThreshold20 = round(Shelf Life × 0.2)
  → dayThreshold40 = round(Shelf Life × 0.4)
  → Ngày lùi = HSD - dayThreshold20

  Trạng thái (T = số ngày từ hôm nay đến Ngày lùi):
    T < 0  → Đã qua hạn lùi (danger, đỏ)
    T = 0  → Đến hạn lùi (danger, đỏ)
    0 < T <= (dayThreshold40 - dayThreshold20) → Sắp tới hạn (warning, vàng)
    T > gap → An toàn (safe, xanh)
    Hôm nay > HSD → Đã hết HSD (expired, xám tối)
```

---

## 📐 Quy Tắc Code Bắt Buộc

### Khi sửa/thêm tính năng:

1. **Đồng bộ phiên bản (BẮT BUỘC):** Cập nhật version string ở **3 nơi**:
   ```
   js/helpers.js  → APP_VERSION_CONFIG.currentVersion + lastUpdated
   sw.js          → CACHE_NAME string (ví dụ: 'app-cache-v2.18.0')
   version.json   → version + lastUpdated
   ```

2. **Thêm file JS mới:** Phải thêm vào mảng `ASSETS` trong `sw.js` để Service Worker cache.

3. **Không dùng framework:** Giữ nguyên Vanilla JS/CSS. Không thêm React/Vue/Tailwind.

4. **Không thao túng DOM trong `business.js`:** File này chỉ chứa logic nghiệp vụ thuần túy.

5. **IndexedDB schema:** Nếu thêm object store mới → tăng `DB_VERSION` trong `db.js` và xử lý trong `onupgradeneeded`.

6. **Thứ tự import trong main.js:** `notifications.js` phải import SAU `kph.js` và `history.js`.

7. **Giới hạn CDN:** Không thêm thư viện CDN mới trừ khi thật sự cần thiết (ảnh hưởng offline capability).

8. **CSS Variables:** Sử dụng biến CSS có sẵn thay vì hardcode màu:
   ```css
   --status-green-bg    /* An toàn */
   --status-yellow-bg   /* Sắp tới hạn */
   --status-red-bg      /* Quá hạn lùi */
   --surface            /* Nền card */
   --text-main          /* Văn bản chính */
   --text-sub           /* Văn bản phụ */
   ```

---

## 🗄️ Cấu Trúc Dữ Liệu

### Phiếu KPH (IndexedDB: `kph_logs`)
```javascript
{
  id: "kph_1720800000000",       // Unique ID (timestamp-based)
  loaiKph: "TPCN" | "TPTS",     // Phân loại nhóm ngành hàng
  coopFood: "CO.OP FOOD",       // Đơn vị
  store: "CF 100",              // Mã cửa hàng
  nguoiPhatHien: "Nguyễn Văn A",
  ngayPhatHien: "13/07/2026",
  sku: "8934680090123",          // Mã vạch / SKU
  tenHang: "Sữa tươi TH 1L",
  ncc: "TH True Milk",          // Nhà cung cấp
  dvt: "Hộp",                   // Đơn vị tính
  soLuong: "5",
  tinhTrang: "Cận hạn",         // Hư hỏng | Móp méo | Cận hạn | Hết hạn | Khác
  tinhTrangKhac: "",             // Nếu tình trạng = "Khác"
  bienPhap: "Hủy",              // Hủy | Trả NCC | Giảm giá | Khác
  bienPhapKhac: "",              // Nếu biện pháp = "Khác"
  ngayXuLy: "13/07/2026",
  imageBase64: "data:image/jpeg;base64,...",
  trangThaiDuyet: "cho_duyet" | "da_duyet",
  nguoiDuyet: "",
  ngayGioDuyet: "",              // dd/mm/yyyy hh:mm:ss
  bienPhapDuyet: "",
  ngayXuLyDuyet: "",
  createdAt: "13/07/2026 10:30:00"
}
```

### Mục Lịch Sử Tra Cứu (IndexedDB: `history_logs`)
```javascript
{
  id: "hist_1720800000000",
  nsx: "01/01/2026",             // Ngày sản xuất
  formattedHsd: "01/07/2026",    // Ngày hạn sử dụng
  rawHsdDays: "181",             // Số ngày HSD
  barcode: "8934680090123",
  tenHang: "Sữa tươi TH 1L",
  quantity: "10",
  dvt: "Hộp",
  alertType: "safe" | "warning" | "danger" | "expired",
  alertLabel: "An toàn",
  alertClass: "state-safe",
  isShortProduct: false,
  isExpiredProduct: false,
  daysRemaining: 45,
  timestamp: 1720800000000
}
```

---

## 🎨 Hệ Thống Giao Diện

### Thiết kế Apple HIG
- **Nền:** `#f4f6f4` (xám nhẹ), card trắng bo góc `20px`.
- **Font:** System font stack (San Francisco trên iOS, Segoe UI trên Windows).
- **Bóng đổ:** Subtle shadow mịn màng.
- **Animation:** Scale-up modals (`0.95→1.0`), slide-up forms, fade-out toasts.

### Tab Navigation
- **Tab "Tra cứu":** Giao diện nhập liệu + kết quả + sơ đồ SVG + lịch sử.
- **Tab "KPH":** Sub-tabs TPCN/TPTS + danh sách phiếu + bộ lọc/sắp xếp.

### Responsive Breakpoints
- **< 768px (Mobile):** 1 cột dọc, form toàn chiều rộng.
- **≥ 768px (Tablet/Desktop):** 2 cột song song (calc + history), diagram rộng bên dưới.

---

## 🔄 Luồng Cập Nhật PWA

```
Người dùng mở app (có mạng)
  → Browser fetch HTML/JS/CSS mới nhất từ server (Network-First)
  → Service Worker mới cài đặt ngầm (install + skipWaiting)
  → Người dùng đóng app hoàn toàn rồi mở lại
  → SW mới activate + dọn cache cũ (CACHE_NAME khác)
  → App chạy phiên bản mới hoàn toàn
```

---

## 🛠️ Hướng Dẫn Prompt Cho AI

### Khi yêu cầu sửa lỗi:
```
Dự án: Check Date CoopFood (PWA, Vanilla JS ES6 Modules)
File liên quan: js/[tên_file].js
Lỗi: [mô tả]
Ngữ cảnh: [đoạn code xung quanh]
```

### Khi yêu cầu thêm tính năng:
```
Dự án: Check Date CoopFood (PWA, Vanilla JS ES6 Modules)
Yêu cầu: [mô tả tính năng]
File cần sửa: [liệt kê file]
Ràng buộc:
- Không dùng framework (React/Vue)
- Giữ nguyên kiến trúc ES6 Modules
- Cập nhật version ở 3 nơi nếu sửa logic
- Giao diện theo Apple HIG (style.css)
- Dữ liệu lưu IndexedDB (db.js)
```

### Khi yêu cầu review code:
```
Dự án: Check Date CoopFood (PWA, Vanilla JS ES6 Modules)
Hãy review [tên_file].js với trọng tâm:
- Performance (DOM manipulation efficiency)
- Memory leaks (event listeners, object URLs)
- Offline compatibility (IndexedDB error handling)
- Mobile UX (touch targets, scroll behavior)
```

---

## 📝 Changelog Gần Nhất

| Version | Ngày | Thay đổi chính |
|---|---|---|
| `2.17.x` | 07/2026 | Quy trình duyệt phiếu KPH, Notification Center, Sidebar thống kê |
| `2.16.x` | 07/2026 | Phân chia KPH theo TPCN/TPTS sub-tabs |
| `2.15.x` | 06/2026 | Chuyển đổi từ localStorage sang IndexedDB (`db.js`), thêm `notifications.js` |

---

> **Lưu ý:** Tài liệu này được cập nhật lần cuối ngày **13/07/2026** tại phiên bản **2.17.2**. Khi dự án có thay đổi lớn, hãy cập nhật lại file này.
