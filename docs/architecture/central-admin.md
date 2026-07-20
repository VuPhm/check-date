# Phạm vi quản trị Pilot và lộ trình toàn chuỗi

Pilot Windows hiện phục vụ **một cụm, tối đa 22 cửa hàng**. Control Center và
`/v1/system/*` chỉ chạy loopback, dùng secret ngẫu nhiên có ACL Windows; chúng
không phải admin Internet và không được mở qua Cloudflare Tunnel.

| Vai trò | Phạm vi hiện tại | Quyền |
| --- | --- | --- |
| CHT | Một cửa hàng | Thiết bị, nhân viên, KPH của cửa hàng |
| System admin pilot | Một máy/cụm, loopback | Health, backup, tạo/vô hiệu cửa hàng |
| Admin cụm/toàn chuỗi | Chưa phát hành | Không có quyền thông qua CHT/PIN/token thiết bị |

Khi cần nhiều cụm hoặc toàn chuỗi, chuyển sang dịch vụ trung tâm với PostgreSQL,
SSO/OIDC + MFA, RBAC server-side, audit log bất biến và phân tách dữ liệu theo
`organization`, `cluster`, `store`, `admin_assignment`. Không chia sẻ SQLite,
Cloudflare tunnel token, system-admin secret, mật khẩu CHT hay PIN giữa cụm.
