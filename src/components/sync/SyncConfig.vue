<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useAppStore } from '../../stores/app';
import { getStoreAdministration, joinEmployee, loginManager, removeEmployee, revokeDevice, updateStoreAdministration } from '../../services/syncApi';
import type { ManagedDevice, ManagedEmployee } from '../../domain/types';

const appStore = useAppStore();
const mode = ref<'employee' | 'manager'>('employee');
const host = ref(appStore.endpoint.basePath);
const storeCode = ref('0001'); const storeName = ref('Co.op Food 0001'); const storeCht = ref(''); const storePassword = ref('0001');
const joinCode = ref('');
const displayName = ref(''); const employeeCode = ref(''); const deviceName = ref('');
const newJoinCode = ref(''); const newPassword = ref('');
const employees = ref<ManagedEmployee[]>([]); const devices = ref<ManagedDevice[]>([]);
const showAllActivities = ref(false);
const message = ref(''); const busy = ref(false);
const statusLabel = computed(() => ({ idle: 'Chưa đồng bộ', offline: 'Ngoại tuyến', syncing: 'Đang đồng bộ…', synced: 'Đã đồng bộ', error: 'Có lỗi' }[appStore.syncStatus]));
const lastSync = computed(() => appStore.lastSyncedAt ? new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'medium' }).format(new Date(appStore.lastSyncedAt)) : 'Chưa từng đồng bộ');
function cleanCode(value: string, length = 4) { return value.replace(/\D/g, '').slice(0, length); }
function saveHost() { appStore.setEndpoint(host.value.trim() || '/api'); host.value = appStore.endpoint.basePath; }
function saveStoreProfile() {
  const code = storeCode.value.trim() || '0001';
  storeCode.value = code;
  localStorage.setItem('kph_coop_food', code);
  localStorage.setItem('kph_store', storeName.value.trim());
  localStorage.setItem('kph_cht', storeCht.value.trim());
}
function saveStorePassword() { localStorage.setItem('kph_store_password', storePassword.value); }
async function signIn() {
  try { busy.value = true; saveHost(); const session = mode.value === 'manager'
    ? await loginManager(appStore.endpoint, { storeCode: storeCode.value, password: storePassword.value, displayName: storeCht.value.trim() || undefined, deviceName: deviceName.value || 'Thiết bị CHT' })
    : await joinEmployee(appStore.endpoint, { storeCode: storeCode.value, joinCode: joinCode.value, displayName: displayName.value, employeeCode: employeeCode.value, deviceName: deviceName.value || 'Thiết bị nhân viên' });
    appStore.setSession(session); joinCode.value = ''; message.value = mode.value === 'manager' ? 'Đã đăng nhập CHT.' : 'Đã tham gia cửa hàng.'; await refreshAdmin(); await appStore.syncNow();
  } catch (e) { message.value = e instanceof Error ? e.message : 'Không thể kết nối cửa hàng.'; } finally { busy.value = false; }
}
async function refreshAdmin() { if (!appStore.isManager || !appStore.session) return; try { const data = await getStoreAdministration(appStore.endpoint, appStore.session); employees.value = data.employees; devices.value = data.devices; newJoinCode.value = data.joinCode; } catch (e) { message.value = e instanceof Error ? e.message : 'Không tải được quản trị cửa hàng.'; } }
async function saveAdmin() { if (!appStore.session) return; try { busy.value = true; await updateStoreAdministration(appStore.endpoint, appStore.session, { joinCode: newJoinCode.value || undefined, password: newPassword.value || undefined }); newPassword.value = ''; message.value = 'Đã cập nhật cài đặt cửa hàng.'; await refreshAdmin(); } catch (e) { message.value = e instanceof Error ? e.message : 'Không thể cập nhật.'; } finally { busy.value = false; } }
async function syncNow() { try { busy.value = true; await appStore.syncNow(); message.value = 'Đồng bộ hoàn tất.'; } catch (e) { message.value = e instanceof Error ? e.message : 'Đồng bộ thất bại.'; } finally { busy.value = false; } }
async function dropDevice(id: string) { if (!appStore.session) return; await revokeDevice(appStore.endpoint, appStore.session, id); await refreshAdmin(); }
async function dropEmployee(id: string) { if (!appStore.session) return; await removeEmployee(appStore.endpoint, appStore.session, id); await refreshAdmin(); }
onMounted(() => {
  storeCode.value = localStorage.getItem('kph_coop_food') || '0001';
  storeName.value = localStorage.getItem('kph_store') || `Co.op Food ${storeCode.value}`;
  storeCht.value = localStorage.getItem('kph_cht') || '';
  storePassword.value = localStorage.getItem('kph_store_password') || storeCode.value;
  saveStoreProfile();
  saveStorePassword();
  void refreshAdmin();
});
</script>
<template>
  <section class="settings-workspace">
    <section class="kph-section-group store-settings-group settings-section-group">
      <h3 class="kph-section-title">Thông tin cửa hàng</h3>
      <p class="settings-section-description">Dùng để nhận diện cửa hàng và đăng nhập CHT.</p>
      <div class="apple-input-row settings-form-row">
        <div class="form-field"><label class="form-label" for="sidebarCoopFood">Mã cửa hàng / CO.OP FOOD</label><input id="sidebarCoopFood" v-model="storeCode" class="form-input" inputmode="numeric" maxlength="4" @input="storeCode = cleanCode(storeCode); saveStoreProfile()"></div>
        <div class="form-field"><label class="form-label" for="sidebarStore">Tên cửa hàng</label><input id="sidebarStore" v-model="storeName" class="form-input" placeholder="Co.op Food 0001" @input="saveStoreProfile"></div>
      </div>
      <div class="apple-input-row settings-form-row">
        <div class="form-field"><label class="form-label" for="sidebarCht">Cửa hàng trưởng <em>(tuỳ chọn)</em></label><input id="sidebarCht" v-model="storeCht" class="form-input" placeholder="Có thể thiết lập sau" @input="saveStoreProfile"></div>
        <div class="form-field"><label class="form-label" for="sidebarStorePassword">Mật khẩu cửa hàng</label><input id="sidebarStorePassword" v-model="storePassword" type="password" class="form-input" placeholder="Thiết lập khi cần đăng nhập" @input="saveStorePassword"></div>
      </div>
    </section>

    <section class="kph-section-group settings-section-group">
      <h3 class="kph-section-title">Kết nối & đồng bộ</h3>
      <p class="settings-section-description">Liên kết thiết bị với dữ liệu cửa hàng khi bạn sẵn sàng.</p>
      <div class="form-field settings-host-field"><label class="form-label" for="syncHost">Host / API</label><input id="syncHost" v-model="host" class="form-input" placeholder="https://host/api hoặc /api" @change="saveHost"></div>
      <template v-if="!appStore.session">
        <div class="settings-role-switch" role="group" aria-label="Vai trò kết nối"><button class="btn-action" :class="{ 'sync-secondary': mode !== 'employee' }" @click="mode = 'employee'">Nhân viên</button><button class="btn-action" :class="{ 'sync-secondary': mode !== 'manager' }" @click="mode = 'manager'">Cửa hàng trưởng</button></div>
        <p v-if="mode === 'manager'" class="settings-helper-text">Dùng tên CHT và mật khẩu ở phần Thông tin cửa hàng phía trên.</p>
        <template v-else><div class="apple-input-row settings-form-row"><div class="form-field"><label class="form-label" for="syncDisplayName">Họ tên</label><input id="syncDisplayName" v-model="displayName" class="form-input"></div><div class="form-field"><label class="form-label" for="syncEmployeeCode">Mã nhân viên</label><input id="syncEmployeeCode" v-model="employeeCode" class="form-input"></div></div><div class="form-field"><label class="form-label" for="syncJoinCode">Mã tham gia cửa hàng</label><input id="syncJoinCode" v-model="joinCode" type="password" class="form-input" inputmode="numeric" maxlength="4" @input="joinCode = cleanCode(joinCode)"></div></template>
        <div class="form-field"><label class="form-label" for="syncDeviceName">Tên thiết bị</label><input id="syncDeviceName" v-model="deviceName" class="form-input" :placeholder="mode === 'manager' ? 'PC hoặc điện thoại CHT' : 'Điện thoại nhân viên'"></div>
        <div class="settings-action-row"><button class="btn-action" :disabled="busy" @click="signIn">{{ busy ? 'Đang kết nối…' : mode === 'manager' ? 'Đăng nhập CHT' : 'Tham gia cửa hàng' }}</button></div>
        <p class="settings-helper-text">Bạn có thể dùng app cục bộ trước và kết nối cửa hàng sau.</p>
      </template>
      <template v-else><div class="settings-status-panel"><div><strong>{{ appStore.session.displayName }}</strong><span>{{ appStore.isManager ? 'Cửa hàng trưởng' : 'Nhân viên' }} · CH {{ appStore.session.branchId }}</span></div><p class="sync-status" :class="`is-${appStore.syncStatus}`">{{ statusLabel }}<small>{{ lastSync }}</small></p></div><div class="settings-action-row"><button class="btn-action" :disabled="busy" @click="syncNow">{{ busy ? 'Đang đồng bộ…' : 'Đồng bộ ngay' }}</button></div></template>
    </section>

    <section v-if="appStore.session && appStore.isManager" class="kph-section-group settings-section-group">
      <h3 class="kph-section-title">Quản trị cửa hàng</h3>
      <div class="apple-input-row settings-form-row"><div class="form-field"><label class="form-label" for="syncNewJoinCode">Mã tham gia nhân viên</label><input id="syncNewJoinCode" v-model="newJoinCode" class="form-input" inputmode="numeric" maxlength="4" @input="newJoinCode = cleanCode(newJoinCode)"></div><div class="form-field"><label class="form-label" for="syncNewPassword">Đổi mật khẩu CHT <em>(tuỳ chọn)</em></label><input id="syncNewPassword" v-model="newPassword" type="password" class="form-input"></div></div>
      <div class="settings-action-row"><button class="btn-action" :disabled="busy" @click="saveAdmin">Lưu cài đặt</button></div>
      <div class="settings-list-group"><h4>Nhân viên</h4><div v-for="item in employees" :key="item.id" class="settings-list-item"><span>{{ item.displayName }} · {{ item.employeeCode }}</span><button class="btn-secondary" @click="dropEmployee(item.id)">Xóa</button></div></div>
      <div class="settings-list-group"><h4>Thiết bị</h4><div v-for="item in devices" :key="item.deviceId" class="settings-list-item"><span>{{ item.deviceName }} · {{ item.displayName }}</span><button class="btn-secondary" @click="dropDevice(item.deviceId)">Thu hồi</button></div><button class="settings-text-button" @click="refreshAdmin">Làm mới danh sách</button></div>
    </section>

    <section v-if="appStore.session && appStore.activityEvents.length" class="kph-section-group settings-section-group">
      <h3 class="kph-section-title">Hoạt động gần đây</h3>
      <div v-for="event in appStore.activityEvents.slice(0, showAllActivities ? 50 : 5)" :key="event.id" class="settings-list-item settings-list-item--activity"><span>{{ event.summary }}</span></div>
      <button v-if="appStore.activityEvents.length > 5" class="settings-text-button" @click="showAllActivities = !showAllActivities">{{ showAllActivities ? 'Thu gọn' : `Xem thêm (${Math.min(appStore.activityEvents.length - 5, 45)})` }}</button>
    </section>

    <div v-if="appStore.session" class="settings-footer-action"><button class="settings-text-button settings-text-button--danger" @click="appStore.clearSession">Đăng xuất thiết bị này</button></div>
    <p v-if="message" class="sync-config-message" aria-live="polite">{{ message }}</p>
  </section>
</template>
