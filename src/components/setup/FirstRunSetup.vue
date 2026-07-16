<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useAppStore } from '../../stores/app';
import { joinEmployee, loginManager } from '../../services/syncApi';

const KEY = 'coop_first_run_setup_complete';
const appStore = useAppStore();
const open = ref(false); const role = ref<'employee' | 'manager'>('employee');
const storeCode = ref(''); const storePassword = ref('');
const joinCode = ref(''); const displayName = ref(''); const employeeCode = ref(''); const deviceName = ref(''); const busy = ref(false); const message = ref('');
function clean(value: string) { return value.replace(/\D/g, '').slice(0, 4); }
function dismiss() { localStorage.setItem(KEY, '1'); open.value = false; }
async function connect() {
  try {
    busy.value = true;
    const configuredStoreCode = storeCode.value.trim();
    const configuredStorePassword = storePassword.value;
    if (configuredStoreCode.length !== 4) throw new Error('Nhập đủ 4 số mã cửa hàng.');
    if (role.value === 'manager' && !configuredStorePassword) throw new Error('Nhập mật khẩu cửa hàng.');
    storeCode.value = configuredStoreCode;
    localStorage.setItem('kph_coop_food', configuredStoreCode);
    localStorage.setItem('kph_store_password', configuredStorePassword);
    if (!localStorage.getItem('kph_store')) localStorage.setItem('kph_store', 'CO.OP FOOD');
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
  storeCode.value = localStorage.getItem('kph_coop_food') || '';
  storePassword.value = localStorage.getItem('kph_store_password') || '';
  open.value = !localStorage.getItem(KEY) && !appStore.session;
  window.addEventListener('coop:open-setup', () => { message.value = ''; open.value = true; });
});
</script>
<template>
  <div v-if="open" class="first-run-backdrop" role="dialog" aria-modal="true" aria-label="Thiết lập ứng dụng">
    <section class="first-run-card">
      <p class="first-run-card__eyebrow">Bắt đầu sử dụng</p>
      <h2>Thiết lập Co.op Date</h2>
      <p>Chọn vai trò để kết nối ngay, hoặc bỏ qua và thiết lập sau trong tab Cấu hình.</p>
      <div class="first-run-role-switch" role="group" aria-label="Vai trò sử dụng"><button class="btn-action" :class="{ 'sync-secondary': role !== 'employee' }" @click="role = 'employee'">Nhân viên</button><button class="btn-action" :class="{ 'sync-secondary': role !== 'manager' }" @click="role = 'manager'">Cửa hàng trưởng</button></div>
      <div class="first-run-form">
        <div class="apple-input-row settings-form-row"><div class="form-field"><label class="form-label" for="firstRunStoreCode">Mã cửa hàng</label><input id="firstRunStoreCode" v-model="storeCode" class="form-input" inputmode="numeric" maxlength="4" @input="storeCode = clean(storeCode)"></div><div v-if="role === 'manager'" class="form-field"><label class="form-label" for="firstRunStorePassword">Mật khẩu cửa hàng</label><input id="firstRunStorePassword" v-model="storePassword" type="password" class="form-input"></div></div>
        <template v-if="role === 'manager'"><div class="form-field"><label class="form-label" for="firstRunManagerName">Tên CHT <em>(tuỳ chọn)</em></label><input id="firstRunManagerName" v-model="displayName" class="form-input" placeholder="Có thể thiết lập sau"></div></template>
        <template v-else><div class="apple-input-row settings-form-row"><div class="form-field"><label class="form-label" for="firstRunEmployeeName">Họ tên</label><input id="firstRunEmployeeName" v-model="displayName" class="form-input"></div><div class="form-field"><label class="form-label" for="firstRunEmployeeCode">Mã nhân viên</label><input id="firstRunEmployeeCode" v-model="employeeCode" class="form-input"></div></div><div class="form-field"><label class="form-label" for="firstRunJoinCode">Mã tham gia cửa hàng</label><input id="firstRunJoinCode" v-model="joinCode" class="form-input" type="password" inputmode="numeric" maxlength="4" @input="joinCode = clean(joinCode)"></div></template>
        <div class="form-field"><label class="form-label" for="firstRunDeviceName">Tên thiết bị</label><input id="firstRunDeviceName" v-model="deviceName" class="form-input" :placeholder="role === 'manager' ? 'PC hoặc điện thoại CHT' : 'Điện thoại nhân viên'"></div>
      </div>
      <div class="first-run-actions"><button class="btn-action" :disabled="busy" @click="connect">{{ busy ? 'Đang kết nối…' : role === 'manager' ? 'Đăng nhập CHT' : 'Tham gia cửa hàng' }}</button><button class="btn-secondary" :disabled="busy" @click="dismiss">Thiết lập sau</button></div>
      <p v-if="message" class="sync-config-message">{{ message }}</p>
    </section>
  </div>
</template>
