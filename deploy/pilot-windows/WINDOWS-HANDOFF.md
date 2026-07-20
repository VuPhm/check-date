# Handoff Windows: build, cài và smoke-test Pilot 1

Phần source Node/PWA đã kiểm tra trên macOS. Các bước dưới đây bắt buộc chạy trên
Windows 10/11 64-bit bằng account có quyền Administrator.

Trước khi ký/phát installer, IT chạy checklist trong
[hồ sơ thẩm định bảo mật](../../docs/security/IT-SECURITY-REVIEW.md), đặc biệt là
hash/chữ ký vendor, ACL runtime và thử payload Excel an toàn.

## 1. Chuẩn bị build machine Windows

Cài .NET 8 SDK, Inno Setup và một Node 24 dùng cho build. Clone source, sau đó:

1. Download Node 24 Windows x64 ZIP, giải nén vào
   `deploy/pilot-windows/vendor/node/`; file cần có là `node.exe`.
2. Download `cloudflared.exe` Windows x64 vào
   `deploy/pilot-windows/vendor/cloudflared/`.
3. Download WinSW x64 stable, đổi tên thành
   `deploy/pilot-windows/vendor/winsw/CoopFoodPilotService.exe`.
4. Không commit ba binary vendor này vào repository.

## 2. Tạo release bundle

Sau khi có ba binary vendor, một lệnh tạo toàn bộ installer:

```powershell
.\deploy\pilot-windows\build-release.ps1 `
  -NodeExe C:\Downloads\node.exe `
  -CloudflaredExe C:\Downloads\cloudflared.exe `
  -WinSwExe C:\Downloads\WinSW-x64.exe
```

Script copy vendor vào thư mục gitignored, chạy test/build, stage runtime,
publish Control Center và chạy Inno Setup. Dùng các lệnh dưới đây khi cần chẩn
đoán từng bước:

```powershell
npm ci
npm test
npm run build
npm run pilot:windows:stage
dotnet publish .\pilot-control-center\CoopFoodPilot.ControlCenter.csproj -c Release -r win-x64 --self-contained true
iscc .\deploy\pilot-windows\installer\CoopFoodPilot.iss
```

Kết quả cần giao là `out\pilot-windows\installer\CoopFoodPilotSetup.exe`.

## 3. Cài trên máy trưởng cụm

1. Chép installer sang máy host Windows có SSD và tối thiểu 8 GB RAM.
2. Chạy installer bằng Administrator.
3. Mở **Pilot Control Center** bằng Administrator.
4. Chọn **Cấu hình cụm**, nhập data path, backup path, URL HTTPS, tunnel token,
   mã cửa hàng và mật khẩu CHT/PIN đầu tiên. Thông tin CHT/PIN không có giá trị mặc định.
5. Bấm **Bật cụm**.
6. Kiểm tra trạng thái `Đang chạy`, link HTTPS và cài PWA trên một thiết bị qua
   4G hoặc Wi-Fi khác mạng.

Service được đăng ký Automatic nên sau reboot Windows nó tự khởi động. Nếu setup
chưa có tunnel token, service có thể báo lỗi/retry; hoàn tất setup rồi bấm Bật
cụm để kiểm tra lại.

## 4. Smoke-test bắt buộc

- Control Center: Bật cụm, Sao lưu ngay, Dừng cụm, Bật lại.
- Mở `https://.../api/health` từ link public thông qua app, không cần public port.
- Đăng nhập CHT bằng thông tin đã đặt trong Setup; tạo nhân viên và tạo một KPH.
- Tắt cụm, nhập KPH offline trên điện thoại, bật lại và xác minh sync.
- Reboot máy Windows; kiểm tra cụm tự chạy lại.
- Dùng [MOVE-HOST.md](MOVE-HOST.md) để diễn tập backup/restore một lần.
