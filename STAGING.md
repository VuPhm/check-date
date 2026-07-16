# Demo và staging đồng bộ cửa hàng

Tài liệu này dành cho việc thử luồng CHT/nhân viên trên nhiều cửa sổ hoặc thiết
bị. Mock API chỉ phục vụ phát triển, không phải backend production.

## Chạy demo local

```bash
npm ci
npm run demo
```

Mở <http://localhost:5173>. Lệnh này chạy đồng thời:

- Vite frontend trên cổng `5173`;
- mock API trên cổng `8787`, được Vite proxy qua `/api`.

Dừng bằng `Ctrl+C`. Mock API lưu trạng thái tại
`data/mock-central-api.json` (đã được gitignore). Đặt lại dữ liệu bằng:

```bash
npm run demo:reset
```

## Tài khoản demo

| Vai trò | Thông tin |
| --- | --- |
| CHT | Mã cửa hàng `0001`, mật khẩu `0001` |
| Nhân viên | Mã cửa hàng `0001`, mã tham gia `1234`; tự nhập họ tên và mã NV |

Mock API tạo sẵn cửa hàng `0001`–`0300`. Mật khẩu CHT ban đầu bằng mã cửa hàng;
mã tham gia ban đầu là `1234`.

## Thử camera, cài PWA và offline trong LAN

Camera và service worker cần secure context. HTTP local chỉ phù hợp thử nghiệp
vụ; để dùng điện thoại/PC cùng Wi-Fi, tạo certificate LAN trên macOS:

```bash
brew install mkcert
mkcert -install
IP=$(ipconfig getifaddr en0)
mkcert -key-file dev-key.pem -cert-file dev-cert.pem "$IP" localhost 127.0.0.1
npm run demo:lan
```

Nếu máy dùng interface khác `en0`, thay `IP` bằng địa chỉ LAN thực tế. Mở
`https://IP_LAN_CUA_MAY:5173` trên các thiết bị. Điện thoại phải tin root CA của
`mkcert`; đường dẫn được in bởi `mkcert -CAROOT`. Trên iOS, sau khi cài profile
cần bật **Full Trust for Root Certificates**.

Các certificate development (`*.pem`, `*.key`) đã được gitignore và không được
commit. Sau khi app tải hoàn chỉnh một lần qua HTTPS, chuyển thiết bị sang
offline rồi mở lại để thử cache.

`npm run demo:pwa` phù hợp thử service worker trên chính máy qua localhost.

## Kịch bản kiểm thử đồng bộ

1. Mở một cửa sổ thường và một cửa sổ ẩn danh, hoặc dùng hai thiết bị.
2. Thiết bị thứ nhất đăng nhập CHT bằng `0001 / 0001`.
3. Thiết bị thứ hai tham gia với mã cửa hàng `0001`, mã `1234`, họ tên và mã NV.
4. Nhân viên tạo phiếu KPH. CHT phải nhận được phiếu qua SSE; polling 30 giây
   là dự phòng. Có thể bấm **Đồng bộ ngay** để ép đồng bộ.
5. CHT duyệt hoặc không duyệt. Thiết bị nhân viên phải nhận thay đổi và hoạt
   động mới.
6. Khi phiếu còn chờ duyệt, người tạo được xóa phiếu của mình. Sau khi xử lý,
   nhân viên không được xóa; CHT vẫn được xóa.
7. Chuyển DevTools sang Offline, tạo dữ liệu rồi bật mạng. Outbox phải được gửi
   mà không tạo bản ghi trùng.
8. CHT thu hồi thiết bị hoặc xóa nhân viên. Session đó phải bị API từ chối ở
   lần gọi kế tiếp.
9. Kiểm tra **Hoạt động gần đây**, toast gộp, lịch sử tra cứu và ảnh KPH trên cả
   hai thiết bị.

## Kiểm tra trước khi tạo artifact

```bash
npm test
npm run build
npm run preview
```

Khi kiểm tra PWA production, dùng tab Application của DevTools để xác nhận
service worker active, app shell có trong precache và navigation `/api` không bị
fallback thành `index.html`.

## Giới hạn của mock API

Mock API lưu JSON trên đĩa, giữ token trong RAM và truyền ảnh Base64 trong request
sync. Khởi động lại server sẽ làm session cũ mất hiệu lực dù dữ liệu JSON còn.

Backend production cần tối thiểu: HTTPS, database bền vững, mật khẩu đã hash,
token có hạn dùng/thu hồi, object storage cho ảnh, giới hạn payload, backup,
logging và monitoring.

## Staging thật

Build frontend rồi host nội dung `dist/` trên HTTPS:

```bash
npm ci
npm test
npm run build
```

Reverse proxy `/api` cùng origin tới API trung tâm. Mẫu
[`deploy/Caddyfile.example`](deploy/Caddyfile.example) minh họa cấu hình. Không
để PWA HTTPS gọi trực tiếp API HTTP hoặc địa chỉ IP nội bộ do mixed-content và
rủi ro vận hành.

Workflow `.github/workflows/staging.yml` chỉ xác minh và upload artifact khi push
nhánh `staging` (hoặc chạy thủ công); nó không triển khai backend.
