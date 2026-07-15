<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useAppStore } from '../../stores/app';
import { joinEmployee, loginManager } from '../../services/syncApi';
import { requestDeviceNotificationPermission } from '../../services/deviceNotifications';

interface InstallPromptEvent extends Event { prompt(): Promise<void>; userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>; }
const KEY = 'coop_first_run_setup_complete';
const appStore = useAppStore();
const open = ref(false); const phase = ref<'identity' | 'install' | 'notifications'>('identity'); const role = ref<'employee' | 'manager'>('employee');
const storeCode = ref(''); const password = ref(''); const joinCode = ref(''); const displayName = ref(''); const employeeCode = ref(''); const deviceName = ref(''); const busy = ref(false); const message = ref('');
let installPrompt: InstallPromptEvent | null = null;
const canInstall = computed(() => Boolean(installPrompt));
function clean(value: string) { return value.replace(/\D/g, '').slice(0, 4); }
function dismiss() { localStorage.setItem(KEY, '1'); open.value = false; }
async function connect() {
  try { busy.value = true; const session = role.value === 'manager'
    ? await loginManager(appStore.endpoint, { storeCode: storeCode.value, password: password.value, deviceName: deviceName.value || 'Thiết bị CHT' })
    : await joinEmployee(appStore.endpoint, { storeCode: storeCode.value, joinCode: joinCode.value, displayName: displayName.value, employeeCode: employeeCode.value, deviceName: deviceName.value || 'Thiết bị nhân viên' });
    appStore.setSession(session); await appStore.syncNow(); phase.value = 'install';
  } catch (error) { message.value = error instanceof Error ? error.message : 'Không thể kết nối cửa hàng.'; } finally { busy.value = false; }
}
async function install() { if (!installPrompt) return; await installPrompt.prompt(); await installPrompt.userChoice; installPrompt = null; phase.value = 'notifications'; }
async function askNotifications() {
  const permission = await requestDeviceNotificationPermission();
  message.value = permission === 'granted' ? 'Đã cho phép thông báo thiết bị.' : permission === 'denied' ? 'Quyền thông báo đang bị chặn. Bạn có thể bật lại trong cài đặt trình duyệt.' : permission === 'default' ? 'Chưa cấp quyền thông báo.' : permission === 'insecure' ? 'Thông báo cần HTTPS (hoặc localhost khi thử nghiệm).' : 'Trình duyệt này không hỗ trợ thông báo thiết bị.';
}
function finish() { dismiss(); }
onMounted(() => {
  open.value = !localStorage.getItem(KEY);
  if (appStore.session) phase.value = 'install';
  window.addEventListener('beforeinstallprompt', (event) => { event.preventDefault(); installPrompt = event as InstallPromptEvent; });
  window.addEventListener('coop:open-setup', () => { open.value = true; phase.value = appStore.session ? 'install' : 'identity'; });
});
</script>
<template>
  <div v-if="open" class="first-run-backdrop" role="dialog" aria-modal="true" aria-label="Thiết lập ứng dụng">
    <section class="first-run-card">
      <h2>Thiết lập Co.op Date</h2>
      <template v-if="phase === 'identity'">
        <p>Chọn vai trò và kết nối cửa hàng. Bạn vẫn có thể dùng cục bộ hoặc thiết lập lại sau trong sidebar.</p>
        <div class="sync-config-actions"><button class="btn-action" :class="{ 'sync-secondary': role !== 'employee' }" @click="role = 'employee'">Nhân viên</button><button class="btn-action" :class="{ 'sync-secondary': role !== 'manager' }" @click="role = 'manager'">CHT</button></div>
        <label class="sync-config-field"><span>Mã cửa hàng</span><input v-model="storeCode" class="form-input" inputmode="numeric" maxlength="4" @input="storeCode = clean(storeCode)"></label>
        <template v-if="role === 'manager'"><label class="sync-config-field"><span>Mật khẩu CHT</span><input v-model="password" class="form-input" type="password"></label></template>
        <template v-else><label class="sync-config-field"><span>Họ tên</span><input v-model="displayName" class="form-input"></label><label class="sync-config-field"><span>Mã nhân viên</span><input v-model="employeeCode" class="form-input"></label><label class="sync-config-field"><span>Mã tham gia cửa hàng</span><input v-model="joinCode" class="form-input" type="password" inputmode="numeric" maxlength="4" @input="joinCode = clean(joinCode)"></label></template>
        <label class="sync-config-field"><span>Tên thiết bị</span><input v-model="deviceName" class="form-input" :placeholder="role === 'manager' ? 'PC hoặc điện thoại CHT' : 'Điện thoại nhân viên'"></label>
        <button class="btn-action sync-full-action" :disabled="busy" @click="connect">{{ busy ? 'Đang kết nối…' : 'Kết nối cửa hàng' }}</button><button class="sync-refresh-button" @click="phase = 'install'">Dùng cục bộ trước</button>
      </template>
      <template v-else-if="phase === 'install'">
        <p>Cài app để mở nhanh và dùng ổn định hơn. Bạn có thể bỏ qua và cài sau trong sidebar.</p>
        <button v-if="canInstall" class="btn-action sync-full-action" @click="install">Cài ứng dụng</button><p v-else class="sync-config-note">Trên iPhone/iPad: Safari → Chia sẻ → Thêm vào Màn hình chính. Trên máy tính: dùng nút cài đặt trên thanh địa chỉ nếu có.</p>
        <button class="sync-refresh-button" @click="phase = 'notifications'">{{ canInstall ? 'Cài sau' : 'Tiếp tục' }}</button>
      </template>
      <template v-else>
        <p>Cho phép thông báo để nhận cập nhật thay đổi khi tab/PWA đang mở. Trình duyệt sẽ hiện hộp thoại quyền sau khi bạn bấm nút.</p>
        <button class="btn-action sync-full-action" @click="askNotifications">Cho phép thông báo</button><button class="sync-refresh-button" @click="finish">Bỏ qua, thiết lập sau</button>
      </template>
      <p v-if="message" class="sync-config-message">{{ message }}</p>
    </section>
  </div>
</template>
