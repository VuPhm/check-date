# AGENTS.md

Hướng dẫn làm việc cho mọi người và AI agent trong repository **Check Date
CoopFood**. Phạm vi áp dụng là toàn bộ repository.

## Mục tiêu và trạng thái chuyển đổi

Đây là phiên bản mới của ứng dụng Vanilla cũ. Vite + Vue 3 + TypeScript là nền
chính, nhưng quá trình chuyển đổi chưa hoàn tất:

- `src/` là nơi mặc định cho code mới.
- `js/` là lớp tương thích legacy còn phục vụ các luồng DOM, timeline, scanner,
  history và KPH chưa được chuyển hoàn toàn.
- `index.html` chứa các mount point Vue và một phần app shell cũ.
- `style.css` là hệ thống style chung cho cả Vue và legacy.

Không thực hiện rewrite diện rộng chỉ để “làm sạch”. Chuyển từng lát chức năng,
giữ hành vi và dữ liệu cũ hoạt động trong suốt quá trình.

### Hợp đồng bảo tồn trong giai đoạn chuyển Vue

- Giữ nguyên bố cục và thứ tự thao tác của màn Tra cứu cho tới khi toàn bộ state,
  validation và event của màn này đã thuộc Vue và có kiểm thử hồi quy.
- Phong cách hiện hành là Apple-inspired tinh giản: nền nhẹ, surface trắng, bo
  góc, shadow mềm, chuyển động ngắn và điều khiển chạm rõ ràng. Không thay design
  direction trong cùng patch với migration framework.
- Kết quả nghiệp vụ phải tương thích: tính ngày, tra xuôi/tra ngược, timeline,
  trạng thái, lịch sử, duyệt KPH, ảnh và quyền theo vai trò.
- Export Excel là output contract. Phải giữ tên sheet, thứ tự/cấu trúc cột, giá
  trị, định dạng ngày/số, ảnh và phạm vi bản ghi được xuất; thay đổi có chủ đích
  cần fixture hoặc kiểm tra hồi quy tương ứng.
- Một lát chuyển đổi chỉ được xóa bridge/markup legacy sau khi Vue replacement đã
  chạy song song ổn định và `npm test`, `npm run build` đều đạt.

## Bản đồ source of truth

| Mối quan tâm | Nơi sở hữu chính |
| --- | --- |
| Bootstrap Vue, mount component | `src/main.ts` |
| UI đã chuyển đổi | `src/components/` |
| Logic nghiệp vụ thuần và kiểu dữ liệu | `src/domain/` |
| IndexedDB, migration, outbox, tombstone | `src/repositories/localDatabase.ts` |
| Session, connectivity, lịch đồng bộ | `src/stores/app.ts` |
| HTTP API, SSE, serialize ảnh | `src/services/syncApi.ts` |
| Service worker/PWA | `src/sw.ts`, `vite.config.ts` |
| Legacy orchestration | `js/main.js` |
| KPH/history/scanner/timeline legacy | các module tương ứng trong `js/` |
| Design tokens và responsive UI | `style.css` |
| Mock backend | `scripts/mock-central-api.mjs` |

`js/business.js` và `js/db.js` là bridge tới implementation TypeScript. Không
chép logic ngược lại vào các bridge này.

## Quy tắc thay đổi code

1. Ưu tiên Vue SFC + TypeScript cho tính năng mới. Nếu vùng UI đã có component
   Vue, không thêm listener hoặc DOM mutation mới vào `js/` cho vùng đó.
2. Domain phải dễ test: không truy cập DOM, `window`, IndexedDB hay network trong
   `src/domain/`. Ngày local dùng helper trong `src/domain/date.ts`.
3. Giữ ranh giới dependency một chiều khi có thể: component/store →
   domain/service/repository. Không tạo vòng import giữa `src/` và `js/`.
4. Có thể sửa legacy để sửa lỗi hoặc tạo seam chuyển đổi, nhưng không mở rộng
   thêm kiến trúc legacy nếu TypeScript giải quyết được.
5. Dùng type/schema hiện có trong `src/domain/types.ts` và `schemas.ts`; tránh
   payload `any` mới. Các field mở của log tồn tại để tương thích dữ liệu cũ,
   không phải lý do bỏ validation ở input mới.
6. Tái sử dụng CSS variable và pattern hiện có. Không thêm framework CSS hoặc CDN
   mới nếu chưa đánh giá bundle và offline behavior.
7. Bảo toàn accessibility cơ bản: label/input association, keyboard interaction,
   focus modal, `aria-live` cho trạng thái và touch target đủ lớn.

## Dữ liệu và đồng bộ

Database `coop_kph_db` đã đi qua native version 2 và Dexie schema 0.3. Hiện có
bốn store: `kph_logs`, `history_logs`, `sync_outbox`, `sync_state`.

- Khi đổi schema, thêm Dexie migration mới; không sửa migration cũ như thể chưa
  từng phát hành.
- Không xóa/đổi tên store hoặc field cũ mà thiếu kế hoạch migrate và tương thích.
- Thay đổi local có `branchId` phải đi qua repository để được đưa vào outbox.
- Bản ghi đã đồng bộ phải xóa mềm bằng `deletedAt`; hard delete có thể khiến thiết
  bị offline upload lại bản cũ.
- Giữ ảnh KPH dưới dạng `Blob` cục bộ. API hiện encode/decode Base64 ở wire
  boundary; đừng đưa Base64 vào domain làm representation mặc định.
- Merge và retry phải idempotent. Dùng `version`, `updatedAt`, cursor và change id
  hiện có; tránh sinh bản ghi mới chỉ vì retry.
- API production mặc định cùng origin `/api`. Không hardcode origin development
  vào UI hoặc service.

Quyền hiện tại: CHT quản trị và xử lý mọi phiếu; nhân viên chỉ được xóa phiếu của
mình khi còn `cho_duyet`. Khi thay đổi quyền, kiểm tra cả UI và mock/server API;
ẩn nút không phải là authorization.

## Nghiệp vụ ngày và KPH

- Chuỗi ngày người dùng là `dd/mm/yyyy`, được parse theo timezone local.
- Không dùng cách parse UTC cho ngày nghiệp vụ vì có thể làm lệch ngày theo múi
  giờ của thiết bị.
- `shelfLife = HSD - NSX + 1`; dưới 10 ngày thì hạn lùi bằng HSD.
- Từ 10 ngày: dùng `round(20%)` để tính hạn lùi và khoảng `round(40%) -
  round(20%)` để cảnh báo.
- Hôm nay sau HSD luôn có trạng thái `expired`.
- Approval status hợp lệ: `cho_duyet`, `da_duyet`, `khong_duyet`.
- Mỗi phiếu mới hỗ trợ tối đa ba ảnh; tiếp tục đọc `image` một ảnh và Base64 cũ.

Mọi thay đổi các bất biến trên cần unit test tương ứng trong `src/domain/*.test.ts`.

## PWA và offline

- Workbox inject `self.__WB_MANIFEST` khi build; không tạo hay sửa precache list
  thủ công.
- Navigation fallback không được nuốt request `/api`.
- Service worker development chỉ bật có chủ đích (`npm run dev:pwa`,
  `npm run demo:pwa`, `npm run demo:lan`) để tránh cache làm nhiễu debug thường.
- Camera trên thiết bị LAN cần HTTPS. Không commit certificate/key local.
- Khi thêm asset hoặc dependency, xác minh bản build vẫn dùng được sau lần tải
  online đầu tiên nếu chức năng đó được quảng bá là offline.

## Phiên bản

Khi chuẩn bị thay đổi hành vi để phát hành, đồng bộ:

1. `package.json` → `version`;
2. `version.json` → `version`, `lastUpdated`;
3. `js/helpers.js` → `APP_VERSION_CONFIG.currentVersion`, `lastUpdated`.

Không bump version cho chỉnh sửa tài liệu thuần túy, test-only hoặc refactor không
đổi hành vi trừ khi người phụ trách release yêu cầu. Không sửa trực tiếp
`package-lock.json` để đổi version; dùng npm khi thật sự bump package.

## Quy trình làm việc

1. Đọc `git status`, file liên quan, test và call sites trước khi sửa. Worktree có
   thể chứa thay đổi của người khác; không ghi đè hoặc hoàn tác ngoài phạm vi.
2. Với bug, thêm test tái hiện ở tầng thấp nhất hợp lý rồi sửa source of truth.
3. Với migration hoặc sync, kiểm tra cả dữ liệu cũ, offline, retry và hai vai trò.
4. Giữ patch nhỏ, tránh format hàng loạt file không liên quan.
5. Không chỉnh `dist/`, `node_modules/`, `.vite/`, dữ liệu mock hay artifact sinh.

Các kiểm tra tối thiểu trước bàn giao:

```bash
npm test
npm run build
```

`npm run build` đã bao gồm `vue-tsc --noEmit`. Nếu thay đổi UI/PWA/sync, ngoài hai
lệnh trên cần smoke-test bằng `npm run dev` hoặc `npm run demo`; dùng kịch bản
trong `STAGING.md` cho thay đổi nhiều thiết bị.

## Tài liệu

- Cập nhật `README.md` khi capability, kiến trúc, lệnh hoặc deployment thay đổi.
- Cập nhật `STAGING.md` khi mock API, account demo hoặc kịch bản sync thay đổi.
- Link dùng đường dẫn tương đối trong repository và ví dụ lệnh phải chạy được từ
  root.

Khi tài liệu và implementation khác nhau, ưu tiên theo thứ tự: code và test hiện
tại → `AGENTS.md` → `README.md` → `STAGING.md`. Không tạo tài liệu riêng theo
từng trợ lý AI; mọi agent dùng chung file này để tránh đặc tả bị phân kỳ.
