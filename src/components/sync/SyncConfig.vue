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
  <section class="sidebar-section sync-config-section"><h4 class="sidebar-section-title">Quản trị cửa hàng</h4>
    <div class="store-profile-grid">
      <label class="sync-config-field"><span>Mã cửa hàng / CO.OP FOOD</span><input id="sidebarCoopFood" v-model="storeCode" class="form-input" inputmode="numeric" maxlength="4" @input="storeCode = cleanCode(storeCode); saveStoreProfile()"></label>
      <label class="sync-config-field"><span>Tên cửa hàng</span><input id="sidebarStore" v-model="storeName" class="form-input" placeholder="Co.op Food 0001" @input="saveStoreProfile"></label>
      <label class="sync-config-field"><span>Cửa hàng trưởng (tuỳ chọn)</span><input id="sidebarCht" v-model="storeCht" class="form-input" placeholder="Có thể thiết lập sau" @input="saveStoreProfile"></label>
      <label class="sync-config-field"><span>Mật khẩu cửa hàng</span><input id="sidebarStorePassword" v-model="storePassword" type="password" class="form-input" placeholder="Thiết lập khi cần đăng nhập" @input="saveStorePassword"></label>
    </div>
    <h4 class="sidebar-section-title sync-config-section__title">Đồng bộ</h4>
    <label class="sync-config-field"><span>Host / API</span><input v-model="host" class="form-input" placeholder="https://host/api hoặc /api" @change="saveHost"></label>
    <template v-if="!appStore.session">
      <div class="sync-config-actions"><button class="btn-action" :class="{ 'sync-secondary': mode !== 'employee' }" @click="mode = 'employee'">Nhân viên</button><button class="btn-action" :class="{ 'sync-secondary': mode !== 'manager' }" @click="mode = 'manager'">CHT</button></div>
      <template v-if="mode === 'manager'"><p class="sync-config-note">Dùng tên CHT và mật khẩu cửa hàng ở phần Quản trị cửa hàng phía trên.</p></template>
      <template v-else><label class="sync-config-field"><span>Họ tên</span><input v-model="displayName" class="form-input"></label><label class="sync-config-field"><span>Mã nhân viên</span><input v-model="employeeCode" class="form-input"></label><label class="sync-config-field"><span>Mã tham gia cửa hàng</span><input v-model="joinCode" type="password" class="form-input" inputmode="numeric" maxlength="4" @input="joinCode = cleanCode(joinCode)"></label></template>
      <label class="sync-config-field"><span>Tên thiết bị</span><input v-model="deviceName" class="form-input" :placeholder="mode === 'manager' ? 'PC hoặc điện thoại CHT' : 'Điện thoại nhân viên'"></label><button class="btn-action sync-full-action" :disabled="busy" @click="signIn">{{ busy ? 'Đang kết nối…' : mode === 'manager' ? 'Đăng nhập CHT' : 'Tham gia cửa hàng' }}</button>
      <p class="sync-config-note">Có thể dùng app cục bộ trước, rồi kết nối cửa hàng trong mục này khi cần.</p>
    </template>
    <template v-else><p class="sync-config-note"><strong>{{ appStore.session.displayName }}</strong> · {{ appStore.isManager ? 'CHT' : 'Nhân viên' }} · CH {{ appStore.session.branchId }}</p><p class="sync-status" :class="`is-${appStore.syncStatus}`">{{ statusLabel }} · {{ lastSync }}</p><button class="btn-action sync-full-action" :disabled="busy" @click="syncNow">Đồng bộ ngay</button>
      <div v-if="appStore.isManager" class="sync-pending-list"><div class="sync-pending-heading">Quản trị cửa hàng</div><label class="sync-config-field"><span>Mã tham gia nhân viên (4 số)</span><input v-model="newJoinCode" class="form-input" inputmode="numeric" maxlength="4" @input="newJoinCode = cleanCode(newJoinCode)"></label><label class="sync-config-field"><span>Đổi mật khẩu CHT (tuỳ chọn)</span><input v-model="newPassword" type="password" class="form-input"></label><button class="btn-action sync-full-action" :disabled="busy" @click="saveAdmin">Lưu cài đặt</button><div class="sync-pending-heading">Nhân viên</div><div v-for="item in employees" :key="item.id" class="sync-pending-item"><span>{{ item.displayName }} · {{ item.employeeCode }}</span><button class="btn-action" @click="dropEmployee(item.id)">Xóa</button></div><div class="sync-pending-heading">Thiết bị</div><div v-for="item in devices" :key="item.deviceId" class="sync-pending-item"><span>{{ item.deviceName }} · {{ item.displayName }}</span><button class="btn-action" @click="dropDevice(item.deviceId)">Thu hồi</button></div><button class="sync-refresh-button" @click="refreshAdmin">Làm mới</button></div>
      <div v-if="appStore.activityEvents.length" class="sync-pending-list"><div class="sync-pending-heading">Hoạt động gần đây</div><div v-for="event in appStore.activityEvents.slice(0, showAllActivities ? 50 : 5)" :key="event.id" class="sync-pending-item"><span>{{ event.summary }}</span></div><button v-if="appStore.activityEvents.length > 5" class="sync-refresh-button" @click="showAllActivities = !showAllActivities">{{ showAllActivities ? 'Thu gọn' : `Xem thêm (${Math.min(appStore.activityEvents.length - 5, 45)})` }}</button></div><button class="sync-refresh-button" @click="appStore.clearSession">Đăng xuất thiết bị này</button>
    </template><p v-if="message" class="sync-config-message" aria-live="polite">{{ message }}</p>
  </section>
</template>
