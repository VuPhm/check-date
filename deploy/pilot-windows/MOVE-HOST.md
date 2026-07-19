# Chuyển Pilot Host sang máy Windows khác

Mục tiêu là chuyển một cụm nhưng không để hai Host cùng ghi vào một SQLite
database. Thực hiện ngoài giờ vận hành nếu có thể.

## Chuẩn bị máy mới

1. Cài đúng bản `CoopFoodPilotSetup.exe` hoặc bản mới hơn đã được kiểm thử.
2. Mở `Pilot Control Center` bằng quyền quản trị và chọn **Cấu hình cụm**.
3. Chọn đường dẫn data/backup trên máy mới. Không bấm **Bật cụm** lúc này.
4. Dùng cùng public URL và tunnel token khi muốn giữ nguyên domain, ví dụ
   `https://c01.tenmiencuaban.vn`.

Không sao chép nguyên file `runtime.json`: file này chứa tunnel token và
system-admin secret. Setup wizard trên máy mới tạo secret mới; chỉ nhập lại
tunnel token bằng giao diện.

## Chuyển dữ liệu

1. Trên máy cũ, mở Control Center và bấm **Sao lưu ngay**.
2. Xác nhận backup hoàn tất, rồi bấm **Dừng cụm**. Không bật lại máy cũ sau bước
   này, để không có hai server ghi cùng dữ liệu.
3. Sao chép file `.sqlite` vừa tạo sang ổ USB/ổ tách an toàn.
4. Trên máy mới, mở Control Center và chọn **Khôi phục backup**. Cụm phải đang
   dừng; chọn file `.sqlite` đã sao chép.
5. Bấm **Bật cụm** trên máy mới. Kiểm tra trạng thái **Đang chạy**, URL HTTPS,
   số cửa hàng và một thiết bị CHT/nhân viên thực tế.
6. Chỉ sau khi máy mới hoạt động, gỡ hoặc giữ máy cũ ở trạng thái service đã
   dừng để dự phòng; không được bật lại service cũ.

## Kiểm tra sau chuyển

- URL cũ vẫn mở được trên 4G và Wi-Fi khác mạng.
- Một thiết bị có dữ liệu offline đồng bộ đúng sau khi Host mới chạy.
- 22 cửa hàng vẫn hiện trong Control Center.
- Tạo một backup mới từ máy mới.

## Khi đổi domain cùng lúc

SQLite và dữ liệu server vẫn chuyển như trên, nhưng PWA/IndexedDB được tách theo
domain. Thiết bị cửa hàng phải mở URL mới, cài lại PWA nếu cần và đăng nhập/tham
gia lại cửa hàng. Không xóa app cũ cho đến khi đã kiểm tra dữ liệu sync ở URL
mới.
