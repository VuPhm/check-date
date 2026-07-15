import { existsSync, rmSync } from 'node:fs';

const path = 'data/mock-central-api.json';
if (existsSync(path)) rmSync(path);
console.log('Đã xóa dữ liệu demo. Lần chạy mock API tiếp theo sẽ tạo lại 300 cửa hàng mặc định.');
