# Pilot Windows qua Docker (legacy transition)

> Bản này vẫn là cách chạy Docker hiện có. Target mới cho Pilot 1 là một
> `CoopFoodPilotService` trên Windows, gồm Node Pilot Host và tunnel dưới một
> Supervisor; xem [kế hoạch runtime Windows](../pilot-windows/PLAN.md). Không
> dùng hướng dẫn này để đóng gói host Windows mới.

Gói này chạy ứng dụng và API ở cùng một máy Windows. Các máy cửa hàng dùng cùng
link; khi máy chủ được tắt, ứng dụng đã cài trước đó vẫn lưu dữ liệu cục bộ rồi
tự đồng bộ lại khi máy chủ bật.

## Chuẩn bị một lần

1. Cài Docker Desktop for Windows và bật chế độ khởi động cùng Windows.
2. Build frontend tại root repository: `npm ci` rồi `npm run build`.
3. Trong thư mục này, sao chép `.env.example` thành `.env`. Password CHT của
   store khởi tạo có thể tạm dùng chính mã cửa hàng bốn số; đổi
   `PILOT_JOIN_CODE` trước khi mời nhân viên. Không gửi file `.env` qua nhóm
   chat.
4. Tạo hai thư mục `pilot-data` và `backups` ngay trong `deploy/pilot`.

Khởi động:

```powershell
docker compose up -d --build
docker compose ps
```

Tại máy chủ, mở `http://localhost:8080`. Trong mạng nội bộ, dùng
`http://<IPv4-của-máy-Windows>:8080` để thử luồng nghiệp vụ; link HTTP này chưa
được dùng camera/PWA thật. Máy trạm phải tải ứng dụng khi máy chủ đang hoạt động
ít nhất một lần trước khi có thể làm việc offline.

## Vận hành mỗi ngày

- Kiểm tra `docker compose ps` có hai dịch vụ `api` và `web` trạng thái `running`.
- Sau khi Windows hoặc Docker Desktop khởi động lại, Docker tự khởi động lại hai
  dịch vụ. Nếu cần, chạy lại `docker compose up -d`.
- Trước khi tắt máy chủ theo kế hoạch, để các thiết bị hoàn tất đồng bộ (nút
  “Đồng bộ ngay” hiện “Đã đồng bộ”). Khi máy chủ ngừng, thiết bị vẫn có thể nhập
  liệu; trạng thái sẽ là “Đang tạm dừng đồng bộ”, không mất dữ liệu.
- Khi bật lại, chỉ cần mở Docker Desktop; các thiết bị đang online sẽ tự thử lại
  theo nhịp tối đa năm phút hoặc có thể nhấn “Đồng bộ ngay”.

## Sao lưu và thêm cửa hàng

SQLite và WAL được lưu rõ ràng tại `pilot-data`, nhưng sao lưu phải tạo bản nhất
quán qua API container:

```powershell
docker compose exec api node server/backup-pilot.mjs /backups/pilot-2026-07-19.sqlite
```

File kết quả nằm tại `deploy/pilot/backups` trên Windows. Sao chép thư mục này
ra ổ ngoài/OneDrive theo lịch tối thiểu hằng ngày. Không sao chép riêng lẻ file
trong `pilot-data` khi hệ thống đang chạy.

Sau khi API đã được khởi động lần đầu, thêm một cửa hàng bằng lệnh sau (không
đưa mật khẩu hoặc PIN vào ảnh chụp màn hình):

```powershell
docker compose exec -e PILOT_DB_FILE=/data/pilot-api.sqlite api node server/manage-pilot.mjs add-store 0002 "mat-khau-cht-dai-hon-12" 5678 "Co.op Food 0002"
```

## Lưu ý kết nối công khai

Hiện chưa có domain/DNS, nên đây chỉ là đường dẫn thử trong LAN. Không mở cổng
8080 trực tiếp ra Internet. Khi được cấp domain, cấu hình HTTPS và named tunnel
trước khi phát link ngoài mạng; API vẫn giữ cùng origin `/api`, nên không cần
đổi ứng dụng.
