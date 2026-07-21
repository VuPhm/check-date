# Hồ sơ thẩm định bảo mật cho IT

## Phạm vi bàn giao

Artefact mục tiêu là installer Windows tạo theo
[WINDOWS-HANDOFF.md](../../deploy/pilot-windows/WINDOWS-HANDOFF.md). Runtime gồm
Windows Service, Node Pilot Host, SQLite cục bộ, Cloudflare Tunnel và WPF Pilot
Control Center. Không dùng Docker, mock backend hay staging/demo trong gói bàn giao.

## Cách tái lập kiểm tra source

Từ root repository, IT có thể chạy:

```powershell
npm ci
npm audit --omit=dev
npm test
npm run build
```

Trên máy build Windows có .NET 8 SDK, Inno Setup và ba binary vendor đã xác minh
hash/chữ ký, chạy các lệnh đóng gói thủ công (xem [WINDOWS-HANDOFF.md](../../deploy/pilot-windows/WINDOWS-HANDOFF.md)). Không nhận binary,
tunnel token, `.env`, `runtime.json`, SQLite/WAL hay backup qua source repository.

## Kiểm soát chính

| Hạng mục | Kiểm soát và vị trí |
| --- | --- |
| Bề mặt mạng | `pilot-host.mjs` và `pilot-api.mjs` chỉ bind `127.0.0.1`; HTTPS public chỉ qua Cloudflare Tunnel cùng origin `/api`. |
| Cài đặt Control Center | Installer chạy quyền admin; `runtime.json` chỉ dành cho LocalSystem/Administrators qua ACL. |
| CHT/PIN | Setup Wizard bắt buộc tạo mật khẩu CHT ≥12 ký tự và PIN 4 số; không có credential mặc định. |
| Quyền quản trị cụm | `/v1/system/*` chỉ nhận loopback + secret ngẫu nhiên; không đi qua tunnel. |
| Brute force | API lưu rate-limit theo store/IP, khóa tạm thời sau số lần thử cấu hình. |
| Token | Token phiên có hạn; SSE dùng `Authorization` header, không đưa token vào query-string. |
| XSS/headers | Host/API đặt CSP, `frame-ancestors none`, `nosniff`, Referrer-Policy và Permissions-Policy. |
| Excel | `excelSafeCell` chuyển các giá trị bắt đầu `=`, `+`, `-`, `@` thành text trước khi tạo `.xlsx`, chống formula injection. |
| Backup | Backup SQLite dùng `VACUUM INTO`; restore yêu cầu dừng service. |

## Excel và máy quản lý cụm

Excel được tạo trong trình duyệt/PWA khi người dùng nhấn Xuất; Control Center
không tải, không parse, không tự mở và không chạy macro từ file Excel. File xuất
là `.xlsx` do ExcelJS tạo, không chứa VBA/macro. Công thức do dữ liệu nhập/sync bị
vô hiệu hóa bằng dấu nháy đơn ở đầu ô. IT vẫn nên áp dụng chính sách Windows/Office:
chỉ mở file từ thư mục Downloads đã quét Defender, chặn macro Internet và không bật
External Content cho file không tin cậy.

## Điểm cần IT xác nhận trước phát hành

1. Xác minh hash/chữ ký của `node.exe`, `cloudflared.exe`, WinSW và installer.
2. Chạy installer trên máy Windows sạch, kiểm tra ACL của `C:\ProgramData\CoopFoodPilot`.
3. Xác minh không có listener public ngoài Cloudflare Tunnel và `/v1/system/*`
   trả 401 từ mọi đường không phải Control Center loopback.
4. Thử các payload Excel `=1+1`, `@SUM(A1)`, `  =HYPERLINK(...)`; mở file và xác
   minh các ô là text, không có công thức.
5. Rà Cloudflare Tunnel hostname, Access policy (nếu áp dụng), ownership/token
   rotation và diễn tập backup/restore.
