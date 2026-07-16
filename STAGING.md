# Demo đồng bộ cửa hàng

## Khởi động

```sh
npm install
npm run demo
```

Mở `http://localhost:5173`. Lệnh trên chạy cả PWA lẫn mock API; dừng bằng
`Ctrl+C`. Dữ liệu demo được lưu ở `data/mock-central-api.json`, nên không mất
khi khởi động lại. Để làm sạch hoàn toàn dữ liệu test:

```sh
npm run demo:reset
```

## Test camera và offline không cần tunnel

`npm run demo` là HTTP nên chỉ phù hợp test nghiệp vụ. Để test camera và
Service Worker trên PC/điện thoại cùng Wi-Fi, tạo certificate LAN một lần trên
MacBook rồi dùng URL HTTPS cố định.

```sh
brew install mkcert
mkcert -install
IP=$(ipconfig getifaddr en0)
mkcert -key-file dev-key.pem -cert-file dev-cert.pem "$IP" localhost 127.0.0.1
npm run demo:lan
```

Mở `https://IP_LAN_CUA_MACBOOK:5173` trên PC CHT và điện thoại. Để điện thoại
tin certificate, lấy file `rootCA.pem` từ thư mục in bởi `mkcert -CAROOT`, gửi
sang điện thoại, cài profile rồi bật **Full Trust for Root Certificates** trong
cài đặt hệ thống. Đây là thao tác một lần cho mạng/CA test này.

Sau khi app đã mở hoàn chỉnh một lần qua HTTPS, tắt mạng và tải lại để kiểm tra
offline. `npm run demo:pwa` chỉ dùng để test PWA trên chính MacBook qua
`localhost`; `npm run demo` vẫn là chế độ phát triển HTTP thông thường.

## Tài khoản demo

| Vai trò | Thông tin |
| --- | --- |
| CHT | Mã cửa hàng `0001`, mật khẩu `0001` |
| Nhân viên | Mã cửa hàng `0001`, mã tham gia `1234`, tự chọn họ tên và mã NV |

Có sẵn mã cửa hàng từ `0001` đến `0300`; mật khẩu CHT ban đầu luôn bằng mã cửa
hàng và mã tham gia ban đầu là `1234`.

## Kịch bản tự test

1. Mở một cửa sổ thường và một cửa sổ ẩn danh (hoặc hai thiết bị) tại app.
2. Ở cửa sổ thứ nhất, chọn **CHT**, đăng nhập `0001 / 0001`. Kiểm tra phần
   **Quản trị cửa hàng**, đổi mã tham gia hoặc mật khẩu nếu muốn.
3. Ở cửa sổ thứ hai, chọn **Nhân viên**, nhập họ tên/mã NV, cửa hàng `0001` và
   mã tham gia hiện tại. Nhân viên vào ngay, không có bước duyệt.
4. Trên nhân viên tạo phiếu KPH, bấm lưu. CHT sẽ tự nhận phiếu trong lúc app
   đang mở (SSE; polling 30 giây là phương án dự phòng); vẫn có nút **Đồng bộ
   ngay**. CHT duyệt phiếu, nhân viên sẽ nhận cập nhật tương tự.
5. Khi phiếu còn chờ duyệt, nhân viên tạo phiếu của mình có thể xoá. Sau khi
   CHT duyệt/không duyệt, nút xoá bị từ chối. CHT vẫn có thể xoá mọi phiếu.
6. Trong DevTools chọn Offline, tạo phiếu, sau đó bật lại mạng. Trạng thái sẽ
   tự đồng bộ; có thể bấm **Đồng bộ ngay** để ép chạy tức thì.
7. CHT thu hồi thiết bị hoặc xoá nhân viên. Thiết bị đó sẽ bị server từ chối ở
   lần gọi API tiếp theo.
8. Mở phần **Hoạt động gần đây** trong Cửa hàng & đồng bộ để xem ai đã tạo,
   duyệt, không duyệt hoặc xoá phiếu. Các thay đổi mới cũng hiện toast gộp.

## Giới hạn của demo

Mock API phục vụ mục đích thử UX/nghiệp vụ: JSON trên đĩa, token RAM và ảnh
Base64 trong request sync. Không dùng nó cho production. Bản production cần
API HTTPS, PostgreSQL, hash mật khẩu/token hết hạn, object storage cho ảnh và
backup/quan sát vận hành.

## Staging thật

Build frontend bằng `npm run build`, host `dist` trên HTTPS và reverse proxy
`/api` tới API trung tâm. Mẫu [Caddyfile.example](deploy/Caddyfile.example)
minh họa cấu hình đó. Không để trình duyệt PWA HTTPS gọi trực tiếp API HTTP/IP
do brand cấp.
