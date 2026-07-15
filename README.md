# Check Date CoopFood - Hệ thống Tra Cứu Thời Hạn Lùi Hàng

Ứng dụng Progressive Web App (PWA) gọn nhẹ, hoạt động độc lập và tối ưu cho thiết bị di động, giúp nhân viên/quản lý tại các cửa hàng bán lẻ (CoopFood) tra cứu nhanh thời hạn lùi hàng (ngày phải thu hồi hoặc giảm giá sản phẩm) dựa trên Ngày Sản Xuất (NSX) và Hạn Sử Dụng (HSD).

* **Bản chạy trực tuyến (Production Build):** [vuphm.github.io/coop-date](https://vuphm.github.io/coop-date/)
* **Nền tảng phát triển:** Vite, Vue 3, TypeScript, Pinia, Dexie và Vanilla CSS (Apple HIG Design).
* **Phiên bản hiện tại:** `2.20.0` (15/07/2026)

---

## 1. Yêu Cầu Chức Năng (Functional Requirements)

Hệ thống hỗ trợ các tính năng nghiệp vụ cốt lõi sau:

### A. Tra Cứu Thời Hạn Lùi Hàng
* **Chế độ Tra Xuôi (Đã biết NSX):**
  * Nhập Ngày Sản Xuất (NSX).
  * Nhập Hạn Sử Dụng (HSD) dưới một trong ba hình thức:
    * Chọn ngày cụ thể (HSD Date).
    * Nhập số ngày (HSD Days).
    * Nhập số tháng (HSD Months).
  * Kết quả hiển thị: **Ngày lùi hàng** cụ thể kèm trạng thái cảnh báo và số ngày HSD còn lại của sản phẩm.
* **Chế độ Tra Ngược (Chưa biết NSX):**
  * Hữu ích khi chỉ có HSD trên bao bì và số ngày/tháng sử dụng tiêu chuẩn của sản phẩm.
  * Khi gạt công tắc chuyển chế độ, ô nhập NSX sẽ bị khóa cứng (`readonly`).
  * Nhập ngày HSD cùng số ngày/tháng sử dụng tiêu chuẩn, hệ thống tự động suy ngược ra NSX và tính toán ngày lùi hàng tương ứng.

### B. Đồng Bộ Hóa Dữ Liệu Hai Chiều (Guarded Bi-directional Sync)
* Nhập/Thay đổi ngày HSD sẽ tự động tính toán ra số ngày HSD tương ứng (dựa vào NSX đã có).
* Nhập/Thay đổi số ngày HSD sẽ tự động cộng dồn từ NSX ra ngày HSD mới (ở chế độ tra xuôi) hoặc trừ lùi từ ngày HSD ra NSX mới (ở chế độ tra ngược).
* Nhập số tháng HSD sẽ tự động tính ra ngày HSD tương ứng theo lịch tháng và quy đổi ra số ngày thực tế.

### C. Trực Quan Hóa Bằng Sơ Đồ Trục Thời Gian (Interactive SVG Timeline)
* Hiển thị trực quan trục thời gian thực tế của sản phẩm từ lúc sản xuất đến khi hết hạn.
* Đánh dấu rõ ràng vị trí của: **NSX**, **Hôm nay**, **Mốc cảnh báo (40%)**, **Hạn lùi hàng (20%)** và **HSD**.
* Phối màu động cho các đoạn trục (Xanh: An toàn, Vàng: Sắp tới hạn, Đỏ: Đã quá hạn lùi) giúp người dùng nhận diện tức thì trạng thái của lô hàng.

### D. Lịch Sử Tra Cứu (Search History)
* Lưu trữ danh sách các phiên tra cứu gần nhất, đồng bộ xuống **IndexedDB** (store `history_logs`) để tránh giới hạn dung lượng localStorage.
* Hỗ trợ **Bộ lọc trạng thái (Filter tags):** Tất cả, An toàn, Sắp tới hạn, Quá hạn lùi, Hàng ngắn ngày, Đã hết HSD.
* Hỗ trợ **Sắp xếp ưu tiên (Priority Sort):** Sắp xếp danh sách lịch sử theo mức độ khẩn cấp của hạn lùi hàng (Danger -> Warning -> Safe).
* Cho phép click vào một mục trong lịch sử để nạp nhanh (load) lại toàn bộ dữ liệu lên các trường nhập liệu.
* Hỗ trợ xuất báo cáo lịch sử tra cứu ra file Excel.

### E. Khai Báo và Quản Lý Hàng Không Phù Hợp (KPH)
* **Phân loại KPH theo 2 nhóm ngành hàng (Sub-tabs):**
  * **TPCN (Thực phẩm Công nghệ):** Hàng công nghiệp đóng gói sẵn, áp dụng đầy đủ quy trình khai báo.
  * **TPTS (Thực phẩm Tươi sống):** Hàng tươi sống, tự động đồng bộ ngày phát hiện = ngày xử lý, giao diện form tùy biến riêng.
* **Khai báo thông tin chi tiết:** Hỗ trợ nhập liệu Đơn vị (CO.OP FOOD), Cửa hàng (STORE), Người phát hiện, Ngày phát hiện (mặc định hôm nay), SKU/UPC (hỗ trợ quét camera), Tên hàng, Nhà cung cấp (NCC), Đơn vị tính (DVT), Số lượng, Tình trạng (Hư hỏng, Móp méo, Cận hạn, Hết hạn, Khác), Biện pháp xử lý (Hủy, Trả NCC, Giảm giá, Khác), Ngày xử lý thực tế và Ảnh minh chứng.
* **Ảnh minh chứng:** Mỗi phiếu hỗ trợ tối đa 3 ảnh từ camera hoặc thư viện. Ảnh được giới hạn trong `1024x1024` pixel và đóng tem không nền, căn trái: giờ cỡ lớn ở cột trái, vạch ngăn dọc, ngày/thứ ở cột phải, tên đơn vị CO.OP FOOD ở dòng dưới. Tem dùng Montserrat 700 với viền/bóng đen gọn không blur, co theo cạnh ngắn để đồng đều trên ảnh ngang/dọc; thời gian ưu tiên EXIF (fallback `lastModified` rồi giờ chọn ảnh). Ảnh được nén JPEG chất lượng `0.82` và lưu dạng `Blob` trong IndexedDB; dữ liệu một ảnh/Base64 cũ vẫn được hỗ trợ.
* **Quy trình duyệt phiếu KPH (Approval Workflow):**
  * Mỗi phiếu KPH mới được tạo ra có trạng thái mặc định `cho_duyet` (Chờ duyệt).
  * Quản lý cửa hàng có thể mở modal duyệt, nhập thông tin Người duyệt, Biện pháp xử lý cuối cùng, Ngày xử lý thực tế, và xác nhận chuyển trạng thái sang `da_duyet` (Đã duyệt).
  * Hỗ trợ sắp xếp và lọc danh sách phiếu theo trạng thái duyệt.
* **Quản lý danh sách phiếu KPH:**
  * Đồng bộ tự động offline xuống **IndexedDB** (store `kph_logs`) thay vì localStorage nhằm mở rộng dung lượng lưu trữ đáng kể.
  * Bộ lọc thông minh theo khoảng thời gian phát hiện hàng KPH (Từ ngày - Đến ngày) và bộ lọc Chờ duyệt.
  * Sắp xếp danh sách linh hoạt theo các cột dữ liệu chính: Ngày phát hiện, Số lượng, Ngày xử lý, Trạng thái duyệt.
  * Chọn dòng hàng loạt (Select All / Single check) để thực hiện các thao tác nhóm.
  * Xem ảnh minh chứng phóng to sắc nét thông qua Modal giao diện tối giản.
  * Xóa từng phiếu khai báo lỗi hoặc xóa toàn bộ lịch sử khai báo KPH.
* **Xuất báo cáo Excel (Excel Export):** Sử dụng `ExcelJS`, `Blob` và URL tải tạm của trình duyệt để kết xuất danh sách phiếu KPH được chọn (hoặc tất cả nếu không chọn) ra file Excel định dạng chuẩn, phân biệt theo sub-tab TPCN/TPTS.

### F. Trung Tâm Thông Báo (Notification Center)
* **Badge thông báo trên Header:** Hiển thị tổng số việc cần xử lý (phiếu KPH chờ duyệt + tra cứu có hạn lùi đáng lo ngại) ngay trên nút chuông thông báo.
* **Modal thông báo chi tiết:** Bao gồm 2 khu vực:
  * **KPH chờ duyệt:** Thống kê nhanh số phiếu TPCN/TPTS đang chờ duyệt, click để nhảy đến tab KPH tương ứng.
  * **Tra cứu đã lưu:** Liệt kê các sản phẩm đang ở trạng thái Warning/Danger/Expired, click để nạp nhanh lại dữ liệu tra cứu.
* **Sidebar thống kê:** Hiển thị tổng quan các chỉ số thông báo trên thanh trượt bên trái.

### G. Thanh Điều Hướng Sidebar
* **Cài đặt cửa hàng:** Quản lý thông tin Đơn vị (CF), Cửa hàng (Store), Người phụ trách mặc định.
* **Thống kê nhanh:** Hiển thị số lượng phiếu KPH chờ duyệt (TPCN/TPTS), số tra cứu sắp đến hạn/quá hạn lùi/quá hạn sử dụng.

### H. Ghép thiết bị cửa hàng
* Mỗi cửa hàng dùng mã 4 số và PIN để ghép thiết bị lần đầu.
* PC/CHT cho phép yêu cầu ghép của nhân viên; nhân viên không cần đăng nhập lặp lại.
* App đồng bộ qua API trung tâm cùng origin `/api`; staging HTTPS dùng reverse proxy tới API brand.

---

## 2. Quy Tắc Nghiệp Vụ Tính Ngày Lùi (Business Rules)

Thuật toán tính toán hạn lùi hàng tuân thủ quy tắc sau:

1. **Tổng số ngày HSD (Shelf Life Days):** 
   $$\text{Shelf Life} = \text{HSD} - \text{NSX} + 1 \text{ ngày}$$
2. **Phân loại sản phẩm:**
   * **Hàng ngắn ngày (Shelf Life < 10 ngày):**
     * Không áp dụng tỷ lệ lùi hàng.
     * **Hạn lùi hàng** trùng khớp với **Hạn Sử Dụng (HSD)**.
     * Trạng thái mặc định: **An toàn** (Trừ trường hợp ngày hiện tại vượt quá HSD -> **Đã hết HSD**).
   * **Hàng dài ngày (Shelf Life $\ge$ 10 ngày):**
     * **Mốc lùi hàng (20%):** $\text{dayThreshold20} = \text{round}(\text{Shelf Life} \times 0.2)$
     * **Mốc cảnh báo (40%):** $\text{dayThreshold40} = \text{round}(\text{Shelf Life} \times 0.4)$
     * **Ngày lùi hàng (Hạn lùi):** 
       $$\text{Ngày lùi} = \text{HSD} - \text{dayThreshold20} \text{ ngày}$$
3. **Phân loại trạng thái cảnh báo:**
   * Gọi $T$ là số ngày chênh lệch từ ngày hôm nay đến **Ngày lùi hàng**:
     * $T < 0$: **Đã qua hạn lùi** (`state-danger` - Màu đỏ)
     * $T = 0$: **Đến hạn lùi hàng** (`state-danger` - Màu đỏ)
     * $0 < T \le (\text{dayThreshold40} - \text{dayThreshold20})$: **Sắp tới hạn lùi** (`state-warning` - Màu vàng)
     * $T > (\text{dayThreshold40} - \text{dayThreshold20})$: **An toàn** (`state-safe` - Màu xanh)
   * Nếu ngày hôm nay vượt quá HSD thực tế: **Đã hết HSD** (`state-expired` - Màu xám tối)

---

## 3. Yêu Cầu Phi Chức Năng (Non-functional Requirements)

### A. Tương Thích PWA Hoạt Động Ngoại Tuyến (Offline Compatibility)
* **Pre-caching tài nguyên:** Workbox tạo Service Worker từ `src/sw.ts` và tự sinh precache manifest trong lúc build, bao gồm app shell và tài nguyên tĩnh cần thiết.
* **Chiến lược Caching (Network-First với Cache Fallback):**
  * Đối với các yêu cầu `GET` tải tài nguyên, hệ thống ưu tiên gửi yêu cầu lên Network trước nhằm bảo đảm người dùng nhận được phiên bản logic mới nhất khi có kết nối mạng ổn định.
  * Nếu kết nối mạng thất bại (ngoại tuyến), Service Worker lập tức chặn và trả về tài nguyên trong Cache giúp ứng dụng hoạt động mượt mà không bị gián đoạn.
* **Cơ chế cập nhật ngầm không gián đoạn (Silent Updates on Relaunch):**
  * Hệ thống tối giản hóa luồng cập nhật bằng cách loại bỏ các hộp thoại thông báo phiền hà và so khớp LocalStorage.
  * Nhờ chiến lược Network-First, khi thiết bị có mạng, trình duyệt luôn tải trực tiếp các tệp HTML/JS/CSS mới nhất từ máy chủ để hiển thị tức thì cho người dùng.
  * Đồng thời, Service Worker mới sẽ âm thầm cài đặt dưới nền. Khi người dùng tắt hoàn toàn ứng dụng PWA (hoặc đóng toàn bộ các tab liên quan) và mở lại, Service Worker mới sẽ lập tức kích hoạt, thay thế phiên bản cũ và kích hoạt dọn dẹp cache cũ một cách êm ái mà không gây xung đột hay gián đoạn trải nghiệm của người dùng.

### B. Lưu Trữ Dữ Liệu (Data Storage)
* **IndexedDB (Primary Storage):** Ứng dụng sử dụng IndexedDB (`coop_kph_db`, version 2) với 2 object stores:
  * `kph_logs`: Lưu trữ toàn bộ phiếu KPH (TPCN & TPTS), bao gồm tối đa 3 ảnh minh chứng dạng `Blob` và khả năng đọc dữ liệu một ảnh/Base64 cũ.
  * `history_logs`: Lưu trữ lịch sử tra cứu hạn lùi hàng.
* **Ưu điểm so với localStorage:** Không bị giới hạn quota 5-10MB, cho phép lưu trữ hàng trăm phiếu KPH kèm ảnh mà không lo tràn dung lượng.

### C. Khả Năng Tương Thích Đa Hệ Điều Hành (Multi-OS Compatibility)
* **Giao diện chuẩn Apple HIG:** Thiết kế theo ngôn ngữ tối giản, hiện đại của iOS/macOS (nền xám nhẹ, các thẻ bo góc lớn `20px` màu trắng, bóng đổ mịn màng, font chữ hệ thống không chân).
* **Thiết kế Responsive linh hoạt (CSS Grid & Flexbox):**
  * Trên màn hình di động nhỏ: Giao diện xếp dọc theo 1 cột độc nhất (`calc` -> `diagram` -> `history`).
  * Trên máy tính bảng và màn hình desktop ($\ge 768\text{px}$): Tự động chuyển sang bố cục 2 cột song song (`calc` và `history` đặt cạnh nhau, sơ đồ `diagram` nằm rộng bên dưới).
* **Hỗ trợ tối đa cho trải nghiệm chạm cảm ứng (Mobile-first UX):**
  * Tích hợp bộ chọn ngày Flatpickr tối ưu hóa cho màn hình di động, neo hiển thị ngay dưới trường nhập liệu giúp tránh trôi layout.
  * Tích hợp công tắc gạt trượt (Apple Switch Toggle) và nút bấm lớn để thao tác bằng ngón cái dễ dàng.
  * Lắng nghe sự kiện bàn phím, tự động thêm dấu phân cách `/` khi gõ ngày tháng (`dd/mm/yyyy`) trên bàn phím số di động (`inputmode="numeric"`).

### D. Hệ Thống Giao Diện Tùy Chỉnh (Custom UI Components)
* **Apple-style Confirm Dialog (`showAppleConfirm`):** Hộp thoại xác nhận tùy chỉnh với animation scale-up mượt mà, hỗ trợ nội dung HTML tùy ý, nút Danger/Primary.
* **Apple-style Toast (`showAppleToast`):** Thông báo popup ngắn (info/success/warning/error) tự biến mất sau thời gian cấu hình.
* **Modal Tạo/Duyệt Phiếu KPH:** Giao diện form slide-up toàn màn hình trên mobile.

### E. Dễ Dàng Bảo Trì & Nâng Cấp (Maintainability)
* **Kiến trúc chuyển đổi tăng dần:** Vite/Vue/TypeScript là nền chạy chính. Header, màn hình tra cứu, lịch sử, danh sách KPH, form tạo/duyệt KPH, preview ảnh, nội dung thông báo, domain nghiệp vụ, repository IndexedDB và state mới đã chuyển sang `src/`. Pipeline nén/đóng dấu ảnh và một số bộ điều phối DOM vẫn đi qua lớp tương thích trong `js/`.
* **Tách biệt rõ rệt trách nhiệm (Separation of Concerns):**
  * Tệp `index.html` chỉ định nghĩa cấu trúc khung.
  * Tệp `style.css` quản lý toàn bộ hệ thống biến CSS màu sắc thương hiệu (Brand Palette 5-3-1-1) và hiệu ứng chuyển động.
  * Thư mục `src/` chứa component Vue, TypeScript domain, Pinia store và Dexie repository.
  * Thư mục `js/` là lớp giao diện legacy đang được chuyển đổi tăng dần.
* **Triển khai tự động (CI/CD):** GitHub Actions chạy test/build và deploy thư mục `dist` lên GitHub Pages.

---

## 4. Hướng Dẫn Dành Cho Developer & AI Agent

Khi tiếp cận mã nguồn để bảo trì hoặc nâng cấp các tính năng mới, hãy lưu ý cấu trúc và cơ chế điều phối sau:

### Cấu Trúc Thư Mục Dự Án
```bash
coop-date/
├── .github/workflows/
│   └── static.yml              # GitHub Actions tự động deploy lên Github Pages
├── favicon_io/                 # Chứa bộ tài nguyên Icon đa nền tảng
├── src/                        # Vue components, TypeScript domain/store/repository
│   ├── components/             # Component giao diện đã chuyển đổi
│   ├── domain/                 # Types, validation và nghiệp vụ thuần
│   ├── repositories/           # Dexie/IndexedDB repository
│   ├── stores/                 # Pinia session, branch và sync state
│   ├── main.ts                 # Entry point Vite/Vue
│   └── sw.ts                   # Workbox service worker source
├── js/                         # Thư mục mã nguồn Javascript modular (ES6 Modules)
│   ├── business.js             # Cầu tương thích tới TypeScript domain
│   ├── db.js                   # Cầu tương thích tới Dexie repository
│   ├── helpers.js              # Các hàm phụ trợ, cấu hình phiên bản, UI components
│   ├── history.js              # Quản lý lưu trữ/hiển thị danh sách lịch sử tra cứu
│   ├── kph.js                  # Cầu tương thích KPH, pipeline ảnh và sự kiện cho Vue
│   ├── main.js                 # Điểm khởi chạy ứng dụng, lắng nghe DOM, điều hướng
│   ├── notifications.js        # ★ Trung tâm thông báo (Badge, Modal, Sidebar stats)
│   ├── scanner.js              # Điều khiển camera và tích hợp html5-qrcode
│   └── timeline.js             # Vẽ sơ đồ trực quan SVG động
├── index.html                  # Layout cấu trúc của PWA
├── style.css                   # Hệ thống CSS stylesheet (Apple Design Concept)
├── vite.config.ts              # Build, PWA và sao chép static assets
├── package.json                # Dependency và scripts
├── manifest.json               # Cấu hình PWA cài đặt ứng dụng trên màn hình chính
└── version.json                # Tệp lưu vết phiên bản deploy
```
> ★ Tệp mới được bổ sung từ phiên bản 2.15+

### Sơ Đồ Phụ Thuộc Giữa Các Module (Dependency Graph)
```
main.js (Entry Point)
├── helpers.js       (Hàm tiện ích dùng chung)
├── business.js      (Logic nghiệp vụ thuần túy)
├── timeline.js      (SVG rendering)
├── scanner.js       (Camera + QR/Barcode)
├── history.js       (Lịch sử tra cứu)
│   └── db.js        (IndexedDB CRUD)
├── kph.js           (Khai báo KPH TPCN/TPTS + Approval)
│   ├── db.js        (IndexedDB CRUD)
│   └── helpers.js   (Hàm tiện ích)
└── notifications.js (Thông báo)
    ├── kph.js       (Đọc trạng thái phiếu KPH)
    └── history.js   (Đọc trạng thái tra cứu)
```

### Các tệp logic và hàm quan trọng

* **`js/main.js`**: Điểm khởi chạy ứng dụng (`DOMContentLoaded`), cấu hình Flatpickr, thiết lập lắng nghe sự kiện nhập liệu tự động thêm dấu gạch chéo cho ô ngày tháng (`auto-date` mask), điều phối cơ chế đồng bộ có tường ngăn giữa các ô ngày HSD, số ngày HSD, và số tháng HSD. Quản lý mở Scanner cho cả tab Tra cứu lẫn KPH.

* **`js/db.js`** ★: Tầng truy xuất dữ liệu IndexedDB (`coop_kph_db`, version 2) với 2 object stores:
  * Store `kph_logs`: `initDB()`, `getAllLogs()`, `addLog(log)`, `deleteLog(id)`, `clearAllLogs()`.
  * Store `history_logs`: `getAllHistoryLogs()`, `addHistoryLog(log)`, `deleteHistoryLog(id)`, `clearAllHistoryLogs()`.
  * Tất cả các hàm đều trả về `Promise` để xử lý bất đồng bộ. Module này **tuyệt đối không thao túng DOM**.

* **`js/helpers.js`**: Chứa hằng số cấu hình phiên bản `APP_VERSION_CONFIG` và các hàm phụ trợ dùng chung:
  * `parseLocalDate(str)` / `formatLocalDate(date)`: Chuyển đổi qua lại giữa chuỗi ngày tháng `dd/mm/yyyy` và đối tượng `Date` múi giờ địa phương.
  * `getCleanToday()`: Trả về Date ngày hôm nay đã reset giờ phút giây về `00:00:00`.
  * `isValidDateStr(str)`: Kiểm tra chuỗi định dạng ngày có hợp lệ hay không.
  * `formatRemainingText(days)`: Chuyển đổi số ngày còn lại thành chuỗi trạng thái tiếng Việt.
  * `playBeep()`: Phát âm thanh bíp giả làm từ phần cứng khi quét mã vạch thành công.
  * `initAppVersion()`: Đăng ký Service Worker và theo dõi trạng thái mạng (online/offline).
  * `showAppleConfirm({...})`: Tạo hộp thoại xác nhận Apple-style (Promise-based).
  * `showAppleToast(message, type, duration)`: Hiển thị thông báo toast.
  * `loadExcelJS()`: Lazy-load thư viện ExcelJS từ CDN khi cần xuất file Excel.

* **`js/business.js`**: Chứa hàm `processReturnBusinessLogic(nsxStr, hsdDateStr)` thực thi thuật toán phân loại hàng ngắn ngày/dài ngày, tính ngày lùi hàng theo quy tắc 20%-40% và trả về trạng thái cảnh báo tương ứng. **Tuyệt đối không thao túng DOM trong tệp này.**

* **`js/timeline.js`**: Chứa hàm `drawTimelineDiagram(nsxStr, hsdStr, returnStr)` tính toán vị trí hiển thị và xuất chuỗi template SVG vẽ sơ đồ trục thời gian trực quan.

* **`js/history.js`**: Quản lý mảng dữ liệu lịch sử tra cứu, lưu trữ vào IndexedDB thông qua `db.js`, áp dụng bộ lọc trạng thái (filter) và sắp xếp ưu tiên (sort), cập nhật giao diện danh sách lịch sử tra cứu. Export: `historyData`, `loadHistoryFromStorage()`, `saveHistoryToStorage()`, `removeHistoryItem()`, `clearAllHistory()`, `updateHistoryUI()`, `setFilter()`, `togglePrioritySort()`, `loadHistoryItem()`, `exportHistoryToExcel()`.

* **`js/notifications.js`** ★: Trung tâm thông báo tổng hợp:
  * `updateNotificationStats()`: Tính toán số liệu KPH chờ duyệt (TPCN/TPTS) + tra cứu warning/danger/expired, cập nhật badge và sidebar.
  * `openNotificationModal()` / `closeNotificationModal()`: Điều khiển modal thông báo.
  * `handleNotificationHistoryClick(...)`: Nhảy đến tab Tra cứu và nạp lại dữ liệu khi click mục thông báo.
  * `handleNotificationKphClick(subTabId)`: Nhảy đến tab KPH sub-tab tương ứng với bộ lọc Chờ duyệt.

* **`js/scanner.js`**: Điều khiển camera qua thư viện `Html5Qrcode`, xử lý bật/tắt đèn pin (flash/torch) nếu thiết bị hỗ trợ, định vị luồng nhận diện mã EAN-13, EAN-8, Code 128, Code 39, UPC-A, tự động điền mã vạch quét được vào ô input tương ứng.

* **`js/kph.js`**: Quản lý nghiệp vụ Khai Báo Hàng Không Phù Hợp (KPH):
  * Phân chia theo sub-tab TPCN/TPTS, mỗi loại có giao diện form tùy biến riêng.
  * Lưu trữ dữ liệu offline qua IndexedDB (`db.js`).
  * Đóng tem chữ/thời gian hai cột, nén tối đa 3 ảnh minh chứng bằng Canvas/JPEG 0.82 và lưu dưới dạng `Blob` trong IndexedDB.
  * Quy trình duyệt phiếu: `openKphApproveModal(id)`, `saveKphApproval()`, `closeKphApproveModal()`.
  * Lọc tìm kiếm theo khoảng ngày phát hiện, lọc theo trạng thái duyệt (`toggleKphFilterChoDuyet`).
  * Sắp xếp danh sách phiếu KPH theo các cột thông tin (ngày, số lượng, trạng thái duyệt).
  * Modal tạo phiếu mới: `openKphCreateModal(type)`, `closeKphCreateModal()`.
  * Quản lý cài đặt cửa hàng/người phát hiện: `loadStoreSettings()`, `saveSidebarSettings()`.
  * Xuất báo cáo Excel (.xlsx) bằng `ExcelJS`, `Blob` và URL tải tạm của trình duyệt.

### Điểm cần lưu ý khi nâng cấp hệ thống (Dành cho AI Agent)
1. **Thay đổi phiên bản:** Đồng bộ phiên bản tại:
   * Hằng số `currentVersion` và `lastUpdated` tại [helpers.js](js/helpers.js) (dòng 3-4).
   * Trường `version` và `lastUpdated` tại [version.json](version.json).
   * Trường `version` tại [package.json](package.json).
   Workbox tạo precache manifest tự động trong lúc build; không chỉnh tay danh sách cache.
2. **Mã mới:** Ưu tiên TypeScript trong `src/`. Chỉ sửa `js/` khi duy trì hoặc tháo gỡ lớp legacy.
3. **Giới hạn Thư viện Ngoại vi:** Hạn chế tối đa việc thêm các tệp CDN mới nhằm giữ vững tiêu chí tải trang tức thì dưới 1 giây và tương thích offline tuyệt đối của PWA.
4. **Màu sắc trạng thái:** Khi thay đổi giao diện cảnh báo, hãy chỉnh sửa các biến CSS tương ứng (`--status-green-bg`, `--status-yellow-bg`, `--status-red-bg`) trong tệp [style.css](style.css) để duy trì tính đồng nhất của hệ thống giao diện.
5. **IndexedDB Schema:** Khai báo migration mới trong [localDatabase.ts](src/repositories/localDatabase.ts), không xóa hoặc đổi tên store hiện có nếu chưa có kế hoạch di chuyển dữ liệu.
6. **Phụ thuộc module:** `notifications.js` phụ thuộc trực tiếp vào dữ liệu export từ `kph.js` và `history.js`; khi đổi import/export cần giữ dependency graph hợp lệ và tránh tạo vòng phụ thuộc mới.

### Chạy dự án tại máy local

Dự án cần Node.js 24. Trên MacBook Pro Intel 2019, kiểm tra Terminal đang chạy kiến trúc Intel rồi dùng Node qua `nvm`:

```bash
arch
# Kết quả mong đợi: i386 hoặc x86_64
nvm install 24
nvm use 24
node -v
```

Cài dependency và chạy đúng máy chủ Vite:

```bash
npm install
npm run dev
```

Mở địa chỉ Vite in trong Terminal, mặc định là `http://localhost:5173/`. Không mở trực tiếp `index.html` và không dùng Python/VS Code Live Server cho mã nguồn, vì trình duyệt không tự biên dịch tệp Vue/TypeScript nên các vùng giao diện sẽ trống. Muốn kiểm tra bản production local:

```bash
npm run build
npm run preview
```

Kiểm tra trước khi bàn giao:

```bash
npm test
npm run build
```
