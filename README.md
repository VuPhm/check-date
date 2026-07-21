# Check Date CoopFood

Ứng dụng PWA hỗ trợ cửa hàng Co.op Food tra hạn lùi hàng, quản lý hàng không phù hợp (KPH) và đồng bộ dữ liệu nội bộ giữa thiết bị của cửa hàng trưởng (CHT) và nhân viên.

## Tổng quan hệ thống

Dự án Check Date CoopFood được chia thành hai phân hệ chính hoạt động song song để đáp ứng yêu cầu vận hành offline-first và bảo mật thông tin nội bộ tại cửa hàng:

### 1. Phân hệ Client (PWA Frontend)
Ứng dụng client chạy trên thiết bị di động của nhân viên và CHT:
*   **Giao diện & Logic:** Sử dụng **Vue 3, TypeScript và Pinia**, tối ưu hóa mobile-first bằng Vanilla CSS. Một phần mã nguồn legacy đang được duy trì và chuyển đổi dần nằm trong thư mục `js/`.
*   **Lưu trữ cục bộ:** Sử dụng **IndexedDB** thông qua thư viện **Dexie** để quản lý cơ sở dữ liệu ngoại tuyến (`kph_logs`, `history_logs`, `sync_outbox`, `sync_state`).
*   **Offline & Cache:** Service Worker ([src/sw.ts](src/sw.ts)) và Workbox thông qua `vite-plugin-pwa` hỗ trợ tải nhanh và vận hành đầy đủ khi mất kết nối mạng.

### 2. Phân hệ Local Windows Pilot (Máy chủ cụm tại cửa hàng)
Hệ thống máy chủ local chạy trên Windows tại cửa hàng trưởng (hoặc máy chủ chi nhánh), phục vụ tối đa 22 cửa hàng liên kết mà không phụ thuộc Docker/WSL2:
*   **CoopFoodPilotService (Windows Service):** Service chạy ngầm được bọc bởi WinSW, tự động khởi động (`Automatic`) cùng Windows để phục hồi sau reboot.
*   **Pilot Supervisor ([server/pilot-supervisor.mjs](server/pilot-supervisor.mjs)):** Điều khiển vòng đời, tự khởi động và giám sát hai tiến trình con: **Node Pilot Host** và **cloudflared**.
*   **Node Pilot Host ([server/pilot-host.mjs](server/pilot-host.mjs)):** Máy chủ Web & API nội bộ chạy SQLite (WAL mode) để lưu trữ, phục vụ API đồng bộ nội bộ và serve các tệp tĩnh của PWA (`dist/`) trên loopback `127.0.0.1`.
*   **cloudflared Tunnel:** Khởi tạo đường truyền HTTPS bảo mật (Cloudflare Tunnel) ra internet để các thiết bị di động của nhân viên đồng bộ dữ liệu mà không cần NAT port router.
*   **Pilot Control Center ([pilot-control-center/](pilot-control-center)):** Ứng dụng desktop WPF (.NET 8 / C#) dành cho CHT để cấu hình (đường dẫn dữ liệu, tunnel token), bật/dừng cụm, backup dữ liệu thủ công và quản lý tài khoản.
*   **Inno Setup Installer ([deploy/pilot-windows/installer/](deploy/pilot-windows/installer)):** Trình cài đặt trọn gói (`CoopFoodPilotSetup.exe`), tự động phân quyền ACL bảo mật thư mục `ProgramData` và đăng ký service.

---

- Phiên bản: `2.23.3` — cập nhật `21/07/2026`
- Runtime: Vue 3, TypeScript, Pinia, Dexie, Vite, .NET 8 (WPF)
- Giao diện: Vanilla CSS, mobile-first
- PWA: Workbox qua `vite-plugin-pwa`
- Yêu cầu phát triển: Node.js 24

## Chức năng chính

- Tra xuôi từ NSX và HSD, hoặc tra ngược từ HSD và thời lượng sử dụng.
- Tính hạn lùi theo mốc 20%, cảnh báo từ mốc 40%, có SVG timeline.
- Lưu và lọc lịch sử tra cứu; xuất báo cáo Excel.
- Tạo phiếu KPH TPCN/TPTS, tối đa ba ảnh đã nén/đóng dấu, duyệt hoặc từ chối phiếu và xuất Excel.
- Làm việc offline với IndexedDB; đồng bộ lại khi có mạng.
- Ghép thiết bị theo vai trò CHT/nhân viên, đồng bộ tức thời qua SSE; khi máy chủ tắt, dữ liệu giữ cục bộ và tự thử lại theo backoff tối đa năm phút.
- Quản lý nhân viên, thiết bị và hoạt động gần đây theo cửa hàng.

## Quy tắc tính hạn lùi

```text
Số ngày HSD = HSD - NSX + 1

Nếu số ngày HSD < 10:
  hạn lùi = HSD

Nếu số ngày HSD >= 10:
  mốc 20% = round(số ngày HSD × 0.2)
  mốc 40% = round(số ngày HSD × 0.4)
  hạn lùi = HSD - mốc 20%
```

Với `T` là số ngày từ hôm nay đến hạn lùi:

- `T <= 0`: đến hoặc đã qua hạn lùi (`danger`).
- `0 < T <= mốc 40% - mốc 20%`: sắp tới hạn (`warning`).
- Lớn hơn khoảng cảnh báo: an toàn (`safe`).
- Hôm nay sau HSD luôn là đã hết hạn (`expired`).

Logic chuẩn nằm tại `src/domain/business.ts` và được bảo vệ bằng unit test.

## Bắt đầu

```bash
npm ci
npm run dev
```

Mở URL do Vite in ra, mặc định là <http://localhost:5173>. Không mở trực tiếp
`index.html` và không dùng static server thuần vì Vue/TypeScript cần được Vite
biên dịch.

Để chạy API pilot cục bộ phục vụ phát triển:

```bash
npm run pilot:api
```

Đóng gói/cài đặt Windows dùng [WINDOWS-HANDOFF.md](deploy/pilot-windows/WINDOWS-HANDOFF.md).

## Lệnh thường dùng

| Lệnh | Mục đích |
| --- | --- |
| `npm run dev` | Chạy Vite ở chế độ phát triển |
| `npm test` | Chạy toàn bộ unit test một lần |
| `npm run test:watch` | Chạy Vitest ở chế độ theo dõi |
| `npm run build` | Type-check và tạo bản production trong `dist/` |
| `npm run preview` | Xem bản build production |
| `npm run pilot:api` | Chạy API SQLite cho pilot (không dùng mock) |

Trước khi bàn giao thay đổi:

```bash
npm test
npm run build
```

## Cấu trúc thư mục dự án

```text
check-date/
├── src/                          Frontend Vue 3 + TypeScript
│   ├── main.ts                   Vue bootstrap, Pinia, runtime wiring
│   ├── components/               Các UI component đã chuyển đổi sang Vue
│   ├── domain/                   Logic nghiệp vụ thuần túy, unit test
│   ├── repositories/             Dexie / IndexedDB local database
│   ├── services/                 API đồng bộ và giao tiếp mạng
│   └── stores/                   State management (Pinia)
├── js/                           Lớp tương thích legacy (Vanilla JS)
├── pilot-control-center/         Ứng dụng WPF quản trị cụm (.NET 8)
├── server/                       Mã nguồn Pilot Host, Supervisor, SQLite
├── deploy/
│   └── pilot-windows/            Script build release, file installer Inno Setup
├── dist/                         Thư mục build frontend (gitignored)
└── out/                          Thư mục build installer & runtime (gitignored)
```

Các bridge `js/business.js` và `js/db.js` tái xuất implementation TypeScript.
Mã mới nên đặt trong `src/`; chỉ sửa `js/` khi bảo trì hoặc thu hẹp lớp legacy.

### Dữ liệu cục bộ và đồng bộ

Database `coop_kph_db` hiện có bốn store:

- `kph_logs`: phiếu KPH và ảnh dạng `Blob`.
- `history_logs`: lịch sử tra cứu.
- `sync_outbox`: thay đổi cục bộ chờ gửi.
- `sync_state`: cursor đồng bộ theo cửa hàng.

Xóa bản ghi đã đồng bộ dùng tombstone để thiết bị offline không làm sống lại dữ
liệu cũ. Mọi thay đổi schema phải thêm migration Dexie trong
`src/repositories/localDatabase.ts` và bảo toàn dữ liệu hiện hữu.

API mặc định dùng cùng origin tại `/api`. Trong development, Vite proxy endpoint
này tới `http://127.0.0.1:8787`. Bản Windows phục vụ frontend/API cùng origin
trên loopback, sau đó Cloudflare Tunnel cung cấp HTTPS public.

### PWA

`src/sw.ts` precache app shell do Workbox sinh trong lúc build, dùng navigation
fallback về `index.html` (trừ `/api`) và cache-first cho vendor CDN. Không chỉnh
tay precache manifest. Dev service worker chỉ bật bằng `npm run dev:pwa`.

## Triển khai

- Push `main`: `.github/workflows/static.yml` build và deploy `dist/` lên GitHub
  Pages.
- Push `staging` hoặc chạy thủ công: `.github/workflows/staging.yml` chạy test,
  build và tải artifact staging; workflow này không tự host API.
- Pilot Windows: xem [WINDOWS-HANDOFF.md](deploy/pilot-windows/WINDOWS-HANDOFF.md).
  Gói dùng Windows Service, Node Pilot Host, Cloudflare Tunnel và Control Center;
  không phụ thuộc Docker Desktop.

## Tài liệu cho người đóng góp

- [AGENTS.md](AGENTS.md): quy ước bắt buộc khi sửa dự án.
- [PLAN.md](deploy/pilot-windows/PLAN.md): ranh giới Pilot Windows và lộ trình
  quản trị cụm/toàn chuỗi.
- [central-admin.md](docs/architecture/central-admin.md): mô hình quyền admin
  hiện tại và điều kiện để mở rộng toàn chuỗi.
- [IT-SECURITY-REVIEW.md](docs/security/IT-SECURITY-REVIEW.md): phạm vi, lệnh tái
  lập và checklist thẩm định an toàn trước bàn giao.
- `docs/huong-dan/`: hướng dẫn sử dụng được đóng gói cùng ứng dụng.
