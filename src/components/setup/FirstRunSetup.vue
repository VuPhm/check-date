<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useAppStore } from '../../stores/app';
import { joinEmployee, loginManager } from '../../services/syncApi';

const KEY = 'coop_first_run_setup_complete';
const appStore = useAppStore();
const open = ref(false); const role = ref<'employee' | 'manager'>('employee');
const joinCode = ref(''); const displayName = ref(''); const employeeCode = ref(''); const deviceName = ref(''); const busy = ref(false); const message = ref('');
function clean(value: string) { return value.replace(/\D/g, '').slice(0, 4); }
function dismiss() { localStorage.setItem(KEY, '1'); open.value = false; }
async function connect() {
  try {
    busy.value = true;
    const configuredStoreCode = localStorage.getItem('kph_coop_food') || '0001';
    const configuredStorePassword = localStorage.getItem('kph_store_password') || configuredStoreCode;
    localStorage.setItem('kph_coop_food', configuredStoreCode);
    if (!localStorage.getItem('kph_store')) localStorage.setItem('kph_store', `Co.op Food ${configuredStoreCode}`);
    if (role.value === 'manager') {
      localStorage.setItem('kph_cht', displayName.value.trim());
    }
    const session = role.value === 'manager'
    ? await loginManager(appStore.endpoint, { storeCode: configuredStoreCode, password: configuredStorePassword, displayName: displayName.value.trim() || undefined, deviceName: deviceName.value || 'Thiết bị CHT' })
    : await joinEmployee(appStore.endpoint, { storeCode: configuredStoreCode, joinCode: joinCode.value, displayName: displayName.value, employeeCode: employeeCode.value, deviceName: deviceName.value || 'Thiết bị nhân viên' });
    appStore.setSession(session); await appStore.syncNow(); dismiss();
  } catch (error) { message.value = error instanceof Error ? error.message : 'Không thể kết nối cửa hàng.'; } finally { busy.value = false; }
}
onMounted(() => {
  open.value = !localStorage.getItem(KEY) && !appStore.session;
  window.addEventListener('coop:open-setup', () => { open.value = true; });
});
</script>
<template>
  <div v-if="open" class="first-run-backdrop" role="dialog" aria-modal="true" aria-label="Thiết lập ứng dụng">
    <section class="first-run-card">
      <h2>Thiết lập Co.op Date</h2>
      <template>
        <p>Nhập thông tin nhân viên hoặc CHT. Mã và mật khẩu cửa hàng đã được thiết lập trong Cấu hình cửa hàng.</p>
        <div class="sync-config-actions"><button class="btn-action" :class="{ 'sync-secondary': role !== 'employee' }" @click="role = 'employee'">Nhân viên</button><button class="btn-action" :class="{ 'sync-secondary': role !== 'manager' }" @click="role = 'manager'">CHT</button></div>
        <template v-if="role === 'manager'"><label class="sync-config-field"><span>Tên CHT <em>(tuỳ chọn)</em></span><input v-model="displayName" class="form-input" placeholder="Có thể thiết lập sau"></label></template>
        <template v-else><label class="sync-config-field"><span>Họ tên</span><input v-model="displayName" class="form-input"></label><label class="sync-config-field"><span>Mã nhân viên</span><input v-model="employeeCode" class="form-input"></label><label class="sync-config-field"><span>Mã tham gia cửa hàng</span><input v-model="joinCode" class="form-input" type="password" inputmode="numeric" maxlength="4" @input="joinCode = clean(joinCode)"></label></template>
        <label class="sync-config-field"><span>Tên thiết bị</span><input v-model="deviceName" class="form-input" :placeholder="role === 'manager' ? 'PC hoặc điện thoại CHT' : 'Điện thoại nhân viên'"></label>
        <button class="btn-action sync-full-action" :disabled="busy" @click="connect">{{ busy ? 'Đang kết nối…' : 'Kết nối cửa hàng' }}</button><button class="sync-refresh-button" @click="dismiss">Dùng cục bộ trước</button>
      </template>
      <p v-if="message" class="sync-config-message">{{ message }}</p>
    </section>
  </div>
</template>
