# Hồ sơ rà soát bảo mật cho IT

## Phạm vi bàn giao

Artefact cần IT xem là source tại commit được bàn giao và installer Windows được
tạo từ [WINDOWS-HANDOFF.md](../deploy/pilot-windows/WINDOWS-HANDOFF.md). Runtime
gồm Windows Service, Node Pilot Host trên `127.0.0.1`, SQLite cục bộ, Cloudflare
Tunnel và Pilot Control Center. Không có Docker, mock API hay cổng public trực
tiếp trong bản bàn giao.

## Các kiểm tra IT có thể tái lập

1. Chạy `npm ci`, `npm run security:check`, `npm test`, `npm run build` và
   `npm audit --omit=dev --offline --json` từ root.
2. Trên Windows build machine, chạy `build-release.ps1` theo hướng dẫn. Xác minh
   hash SHA-256 của installer trước khi chuyển sang máy trưởng cụm.
3. Cài installer với quyền Administrator; kiểm tra service chỉ mở `127.0.0.1:8787`.
   Từ LAN không được truy cập trực tiếp port này.
4. Kiểm tra Cloudflare public hostname dùng HTTPS, cùng origin `/api`, và không
   đưa tunnel token/system-admin secret vào source, log hay URL.
5. Thử login sai quá ngưỡng để xác nhận rate-limit; đổi mật khẩu CHT để xác nhận
   phiên CHT cũ bị thu hồi; thu hồi một thiết bị nhân viên để xác nhận API từ chối.
6. Chạy backup, restore trên máy thử nghiệm và kiểm tra sync offline/online.

## Biện pháp đã có

- CHT/PIN đầu tiên được nhập trong Setup Wizard; API không seed credential mặc định.
- System admin là API loopback với secret ngẫu nhiên nằm trong thư mục có ACL.
- Session bearer chỉ gửi qua header; SSE không gửi token trên query-string.
- API có rate-limit xác thực, hạn mức payload/sync, validation input, soft-delete,
  authorization server-side và security headers.
- Tunnel là đường public duy nhất; Host không bind địa chỉ LAN/public.

## Excel: quyết định vận hành cần IT xác nhận

Xuất Excel hiện tạo workbook trong trình duyệt rồi tải `.xlsx` xuống **máy đang
mở PWA**; server không giữ bản sao. Vì vậy, để file nằm trên máy quản lý cụm,
người dùng phải mở PWA bằng trình duyệt trên chính máy đó và xuất từ đó. Control
Center hiện quản lý service/backup, **không phải** công cụ xuất Excel.

Nếu IT yêu cầu enforcement “chỉ máy quản lý cụm được xuất”, bản hiện tại chưa
đáp ứng: cần một pha riêng với Control Center export module hoặc API export
loopback, Windows ACL cho thư mục export, audit event, retention và UI chỉ cho
system admin. Không được tuyên bố yêu cầu này đã hoàn thành trước khi có module
đó. IT cần xác nhận một trong hai lựa chọn: (a) vận hành xuất bằng browser trên
máy quản lý cụm; hoặc (b) phê duyệt pha export module nói trên.

## Ranh giới còn lại

PWA dùng localStorage cho phiên thiết bị để hoạt động offline; XSS cùng origin
vẫn có thể lấy token trong thời hạn phiên. CSP, cùng-origin tunnel, thời hạn
phiên, thu hồi thiết bị và đổi mật khẩu giảm rủi ro nhưng không thay thế kiểm
soát endpoint Windows, Cloudflare và quy trình quản trị thiết bị.
