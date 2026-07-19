# Pilot Host Windows — implementation target

Pilot 1 phục vụ một cụm gồm tối đa 22 cửa hàng. Người vận hành chỉ thấy một
`CoopFoodPilotService` và điều khiển cụm từ `Pilot Control Center`.

## Runtime

```text
CoopFoodPilotService (Manual Windows service)
  └─ Pilot Supervisor
       ├─ Node Pilot Host: API + PWA/static files + SQLite, loopback only
       └─ cloudflared: HTTPS named tunnel, child process
```

Không dùng Docker Desktop, WSL2 hoặc Caddy. `CoopFoodPilotService` tự khởi động
cùng Windows để cụm phục hồi sau reboot; Control Center vẫn là nơi dừng/bật chủ
động. Khi đang chạy, Supervisor tự khôi phục tunnel; nếu Host chết, Supervisor
thoát để Windows Service Recovery khởi động lại toàn cụm.

## Phân kỳ

1. `server/pilot-host.mjs` thay Caddy, phục vụ `dist/` và `/api` trên loopback.
2. API có migration, bootstrap CHT 4 số, rate-limit, audit, health, backup và
   local-only system management API.
3. Supervisor quản lý Host và cloudflared theo lifecycle của một cụm.
4. Runtime Windows dùng Node 24 pin version và WinSW chỉ bọc Supervisor.
5. Control Center .NET/WPF cung cấp Bật/Dừng cụm, backup, setup và quản lý
   22 cửa hàng. Chi tiết Host/tunnel chỉ xuất hiện trong màn support.
6. Installer tạo ACL, service Automatic, cấu hình tunnel và giữ lại data khi update.

Build/cài/kiểm thử phần Windows ở [WINDOWS-HANDOFF.md](WINDOWS-HANDOFF.md).

## Service contract

Installer copy `runtime-config.example.json` thành
`C:\ProgramData\CoopFoodPilot\runtime.json`, tạo secret ngẫu nhiên và đặt ACL
chỉ cho service/Control Center. WinSW chỉ bọc `pilot-supervisor.mjs` trong một
service `CoopFoodPilotService` ở `Automatic` start mode. Host và cloudflared
không được cài thành service riêng.

Control Center tạo file config từ setup wizard: đường dẫn data/backup, URL HTTPS
và tunnel token. Người vận hành không cần Node, Docker, PowerShell hay sửa JSON
bằng tay.

## Current development commands

Sau `npm run build`, chạy Host local bằng `npm run pilot:host`. Supervisor được
kiểm tra local bằng `PILOT_SKIP_TUNNEL=true npm run pilot:supervisor`; runtime
Windows sẽ thay biến này bằng `PILOT_TUNNEL_TOKEN` do setup wizard lưu trong
folder có ACL.

## Data layout

```text
C:\Program Files\CoopFood Pilot\       runtime read-only
C:\ProgramData\CoopFoodPilot\          config, secrets, logs
D:\CoopFoodPilot\data\                SQLite/WAL
E:\CoopFoodPilot\backups\             consistent backups
```

Nếu host chỉ có một ổ, data và backup vẫn phải là hai thư mục riêng. Control
Center backup trước khi Dừng cụm; nếu backup lỗi, mặc định không dừng cụm.
Quy trình chuyển host ở [MOVE-HOST.md](MOVE-HOST.md) luôn dừng cụm cũ trước khi
khôi phục backup trên máy mới.

## Acceptance baseline

- Không có port public: Host chỉ bind `127.0.0.1`.
- URL HTTPS được tunnel tới cùng origin `/api`.
- PWA vẫn làm việc offline khi cụm dừng và sync lại khi cụm bật.
- Dữ liệu của 22 store không lẫn nhau.
- Backup/restore và restart sau crash được kiểm thử trên host 8 GB RAM + SSD.
