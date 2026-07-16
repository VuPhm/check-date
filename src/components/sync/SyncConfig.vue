<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useAppStore } from '../../stores/app';
import { getStoreAdministration, joinEmployee, loginManager, removeEmployee, revokeDevice, updateStoreAdministration } from '../../services/syncApi';
import type { ManagedDevice, ManagedEmployee } from '../../domain/types';

const appStore = useAppStore();
const authModal = ref<'manager' | 'employee' | null>(null);
const confirmAction = ref<'password' | 'reset' | 'logout' | null>(null);
const storeCode = ref('');
const storeName = ref('');
const managerPassword = ref('');
const managerName = ref('');
const joinCode = ref('');
const displayName = ref('');
const employeeCode = ref('');
const deviceName = ref('');
const newJoinCode = ref('');
const newPassword = ref('');
const employees = ref<ManagedEmployee[]>([]);
const devices = ref<ManagedDevice[]>([]);
const message = ref('');
const busy = ref(false);
const showJoinCode = ref(false);
const storeNameCommitted = ref(false);
const authAttempted = ref(false);
let refreshTimer: number | undefined;

const statusLabel = computed(() => ({ idle: 'Sẵn sàng đồng bộ', offline: 'Đang ngoại tuyến', syncing: 'Đang đồng bộ', synced: 'Đã đồng bộ', error: 'Cần kiểm tra kết nối' }[appStore.syncStatus]));
const lastSync = computed(() => appStore.lastSyncedAt ? new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(appStore.lastSyncedAt)) : 'Chưa từng đồng bộ');
const statusMessage = computed(() => {
  if (message.value) return message.value;
  if (appStore.syncStatus === 'offline') return 'Thiết bị sẽ đồng bộ lại khi có mạng.';
  if (appStore.syncStatus === 'syncing') return 'Đang cập nhật dữ liệu cửa hàng.';
  if (appStore.syncStatus === 'error') return appStore.syncError || 'Không thể đồng bộ. Hãy thử lại sau.';
  if (!appStore.session) return 'Đăng nhập hoặc tham gia cửa hàng để dùng đồng bộ.';
  return appStore.lastSyncedAt ? `Lần gần nhất: ${lastSync.value}.` : 'Nhấn Đồng bộ ngay để cập nhật dữ liệu.';
});
const storeCodeLocked = computed(() => Boolean(appStore.session));
const storeNameLocked = computed(() => Boolean(appStore.session && !appStore.isManager));
const canAuthenticate = computed(() => authModal.value === 'manager'
  ? storeCode.value.length === 4 && Boolean(managerPassword.value)
  : storeCode.value.length === 4 && Boolean(displayName.value.trim()) && Boolean(employeeCode.value.trim()) && joinCode.value.length === 4);
const authValidationMessage = computed(() => !authAttempted.value || canAuthenticate.value ? '' : authModal.value === 'manager' ? 'Nhập đủ mã cửa hàng và mật khẩu để đăng nhập.' : 'Nhập đầy đủ các trường bắt buộc để tham gia cửa hàng.');

function cleanCode(value: string, length = 4) { return value.replace(/\D/g, '').slice(0, length); }
function friendlyError(error: unknown, fallback: string) {
  const detail = error instanceof Error ? error.message : '';
  if (/\b401\b/.test(detail)) return 'Thông tin đăng nhập hoặc mã PIN chưa đúng.';
  if (/\b403\b/.test(detail)) return 'Tài khoản này không có quyền thực hiện thao tác.';
  if (/\b404\b|fetch|network/i.test(detail)) return 'Chưa kết nối được máy chủ. Hãy kiểm tra mạng rồi thử lại.';
  return detail || fallback;
}
function saveStoreProfile(commitStoreName = true) {
  const code = storeCode.value.trim();
  if (code) localStorage.setItem('kph_coop_food', code); else localStorage.removeItem('kph_coop_food');
  appStore.setStoreName(storeName.value);
  if (commitStoreName && appStore.session?.role === 'manager' && storeName.value.trim()) storeNameCommitted.value = true;
}
async function commitStoreProfile() { saveStoreProfile(); if (appStore.isManager) await appStore.syncNow(); }
function openAuth(mode: 'manager' | 'employee') { message.value = ''; authAttempted.value = false; managerName.value = ''; authModal.value = mode; }
function closeAuth() { authModal.value = null; managerPassword.value = ''; joinCode.value = ''; }

async function authenticate() {
  if (!authModal.value) return;
  authAttempted.value = true;
  if (!canAuthenticate.value) return;
  try {
    busy.value = true; message.value = '';
    const session = authModal.value === 'manager'
      ? await loginManager(appStore.endpoint, { storeCode: storeCode.value, password: managerPassword.value, displayName: managerName.value.trim() || undefined, deviceName: deviceName.value || 'Thiết bị CHT' })
      : await joinEmployee(appStore.endpoint, { storeCode: storeCode.value, joinCode: joinCode.value, displayName: displayName.value, employeeCode: employeeCode.value, deviceName: deviceName.value || 'Thiết bị nhân viên' });
    storeCode.value = session.branchId;
    appStore.setSession(session);
    saveStoreProfile(false);
    message.value = authModal.value === 'manager' ? 'Đăng nhập CHT thành công.' : 'Bạn đã tham gia cửa hàng.';
    closeAuth();
    await refreshAdmin();
    await appStore.syncNow();
  } catch (error) { message.value = friendlyError(error, 'Không thể kết nối cửa hàng.'); } finally { busy.value = false; }
}
async function refreshAdmin() {
  if (!appStore.isManager || !appStore.session) return;
  try {
    const data = await getStoreAdministration(appStore.endpoint, appStore.session);
    employees.value = data.employees; devices.value = data.devices; newJoinCode.value = data.joinCode;
  } catch (error) { message.value = friendlyError(error, 'Không tải được quản trị cửa hàng.'); }
}
async function syncNow() {
  try { busy.value = true; message.value = ''; await appStore.syncNow(); await refreshAdmin(); message.value = 'Dữ liệu cửa hàng đã được cập nhật.'; }
  catch (error) { message.value = friendlyError(error, 'Đồng bộ thất bại.'); }
  finally { busy.value = false; }
}
async function saveJoinCode() {
  if (!appStore.session || newJoinCode.value.length !== 4) return;
  try { busy.value = true; await updateStoreAdministration(appStore.endpoint, appStore.session, { joinCode: newJoinCode.value }); message.value = 'Đã đổi mã PIN tham gia.'; }
  catch (error) { message.value = friendlyError(error, 'Không thể đổi mã PIN.'); }
  finally { busy.value = false; }
}
async function confirm() {
  if (!appStore.session || !confirmAction.value) return;
  if (confirmAction.value === 'logout') { appStore.clearSession(); confirmAction.value = null; message.value = 'Đã đăng xuất CHT khỏi thiết bị này.'; return; }
  const password = confirmAction.value === 'reset' ? storeCode.value : newPassword.value;
  try {
    busy.value = true;
    await updateStoreAdministration(appStore.endpoint, appStore.session, { password });
    newPassword.value = '';
    message.value = confirmAction.value === 'reset' ? 'Mật khẩu đã được đặt lại theo mã cửa hàng.' : 'Đã đổi mật khẩu cửa hàng.';
    confirmAction.value = null;
  } catch (error) { message.value = friendlyError(error, 'Không thể đổi mật khẩu.'); } finally { busy.value = false; }
}
async function dropDevice(id: string) { if (appStore.session) { await revokeDevice(appStore.endpoint, appStore.session, id); await refreshAdmin(); } }
async function dropEmployee(id: string) { if (appStore.session) { await removeEmployee(appStore.endpoint, appStore.session, id); await refreshAdmin(); } }
async function saveEmployeeName() { try { busy.value = true; appStore.updateSessionDisplayName(displayName.value); await appStore.syncNow(); message.value = 'Đã đồng bộ tên nhân viên.'; } catch (error) { message.value = friendlyError(error, 'Không thể đổi tên nhân viên.'); } finally { busy.value = false; } }
async function saveManagerName() { try { busy.value = true; appStore.updateSessionDisplayName(displayName.value); await appStore.syncNow(); message.value = 'Đã đồng bộ tên CHT.'; } catch (error) { message.value = friendlyError(error, 'Không thể đổi tên CHT.'); } finally { busy.value = false; } }

onMounted(() => {
  storeCode.value = appStore.session?.branchId || '';
  const savedStoreName = localStorage.getItem('kph_store');
  storeName.value = savedStoreName || 'CO.OP FOOD';
  storeNameCommitted.value = Boolean(savedStoreName?.trim());
  displayName.value = appStore.session?.displayName || '';
  void refreshAdmin();
  refreshTimer = window.setInterval(() => void refreshAdmin(), 30_000);
});
watch(() => appStore.storeName, (value) => { if (!appStore.isManager) storeName.value = value; });
onBeforeUnmount(() => { if (refreshTimer !== undefined) window.clearInterval(refreshTimer); });
</script>

<template>
  <section class="sync-settings">
    <section class="sync-card">
      <h3 class="sync-card__title">Thông tin cửa hàng</h3>
      <div class="apple-input-row sync-card__fields">
        <div class="form-field flex-1"><label class="form-label" for="sidebarStore">Tên cửa hàng</label><div class="form-input-wrapper"><input id="sidebarStore" v-model="storeName" class="form-input" :disabled="storeNameLocked" @change="commitStoreProfile"></div></div>
        <div class="form-field flex-1"><label class="form-label" for="sidebarCoopFood">Mã cửa hàng <span class="required-star">*</span></label><div class="form-input-wrapper"><input id="sidebarCoopFood" v-model="storeCode" class="form-input" inputmode="numeric" maxlength="4" :disabled="storeCodeLocked" @input="storeCode = cleanCode(storeCode)" @change="commitStoreProfile"></div></div>
      </div>
    </section>

    <section class="sync-card">
      <h3 class="sync-card__title">Kết nối & đồng bộ</h3>
      <div class="sync-status-card" :class="`is-${appStore.syncStatus}`" aria-live="polite">
        <span class="sync-status-card__dot" aria-hidden="true"></span>
        <div><strong>{{ statusLabel }}</strong><p>{{ statusMessage }}</p><small>Đồng bộ cuối: {{ lastSync }}</small><small v-if="!appStore.isManager && appStore.managerName">Cửa hàng trưởng: {{ appStore.managerName }}</small></div>
      </div>
      <template v-if="!appStore.session">
        <div class="sync-card__actions"><button class="btn-action" type="button" @click="openAuth('manager')">Đăng nhập CHT</button><button class="btn-secondary" type="button" @click="openAuth('employee')">Tham gia cửa hàng</button></div>
      </template>
      <template v-else>
        <div class="sync-card__actions"><button class="btn-action" type="button" :disabled="busy" @click="syncNow">{{ busy ? 'Đang đồng bộ…' : 'Đồng bộ ngay' }}</button></div>
        <div v-if="appStore.isManager" class="sync-admin-grid">
          <section class="sync-subcard"><h4>Mã PIN tham gia</h4><div class="form-input-wrapper"><input v-model="newJoinCode" :type="showJoinCode ? 'text' : 'password'" class="form-input" inputmode="numeric" maxlength="4" @input="newJoinCode = cleanCode(newJoinCode)"><button class="sync-eye-button" type="button" :aria-label="showJoinCode ? 'Ẩn mã PIN' : 'Hiện mã PIN'" @click="showJoinCode = !showJoinCode"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z"/><circle cx="12" cy="12" r="2.5"/><path v-if="!showJoinCode" d="m4 4 16 16"/></svg></button></div><button class="btn-action sync-subcard__button" type="button" :disabled="busy || newJoinCode.length !== 4" @click="saveJoinCode">Đổi mã PIN</button></section>
          <section class="sync-subcard"><h4>Mật khẩu cửa hàng</h4><div class="form-input-wrapper"><input v-model="newPassword" type="password" class="form-input"></div><div class="sync-subcard__buttons"><button class="btn-action" type="button" :disabled="busy || !newPassword" @click="confirmAction = 'password'">Đổi mật khẩu</button><button class="btn-secondary" type="button" :disabled="busy" @click="confirmAction = 'reset'">Đặt lại</button></div></section>
          <section class="sync-subcard sync-subcard--wide"><h4>Tên CHT</h4><div class="sync-inline-action"><div class="form-input-wrapper"><input v-model="displayName" class="form-input"></div><button class="btn-action" type="button" :disabled="!displayName.trim()" @click="saveManagerName">Lưu</button></div></section>
          <section class="sync-subcard sync-subcard--wide"><h4>Nhân viên</h4><div v-for="item in employees" :key="item.id" class="sync-list-row"><span>{{ item.displayName }} · {{ item.employeeCode }}</span><button class="sync-list-row__action" type="button" @click="dropEmployee(item.id)">Xóa</button></div></section>
          <section class="sync-subcard sync-subcard--wide"><h4>Thiết bị</h4><div v-for="item in devices" :key="item.deviceId" class="sync-list-row"><span>{{ item.deviceName }} · {{ item.displayName }}</span><button class="sync-list-row__action" type="button" @click="item.deviceId === appStore.session?.deviceId ? confirmAction = 'logout' : dropDevice(item.deviceId)">{{ item.deviceId === appStore.session?.deviceId ? 'Đăng xuất' : 'Thu hồi' }}</button></div></section>
        </div>
        <section v-else class="sync-subcard sync-subcard--employee"><h4>Tên nhân viên</h4><div class="sync-inline-action"><div class="form-input-wrapper"><input v-model="displayName" class="form-input"></div><button class="btn-action" type="button" :disabled="!displayName.trim()" @click="saveEmployeeName">Lưu</button></div></section>
      </template>
    </section>

    <button v-if="appStore.session" class="sync-logout" type="button" @click="confirmAction = 'logout'">{{ appStore.isManager ? 'Đăng xuất CHT' : 'Đăng xuất' }}</button>

    <div v-if="authModal" class="apple-modal active sync-modal" role="dialog" aria-modal="true" :aria-label="authModal === 'manager' ? 'Đăng nhập CHT' : 'Tham gia cửa hàng'" @click.self="closeAuth">
      <div class="apple-modal-content sync-modal__content"><div class="apple-modal-header"><h3 class="apple-modal-title">{{ authModal === 'manager' ? 'Đăng nhập CHT' : 'Tham gia cửa hàng' }}</h3><button class="apple-modal-close-btn" type="button" aria-label="Đóng" @click="closeAuth">×</button></div><div class="apple-modal-body sync-modal__body">
        <template v-if="authModal === 'manager'"><div class="form-field"><label class="form-label" for="managerStoreCode">Tên đăng nhập <span class="required-star">*</span></label><div class="form-input-wrapper"><input id="managerStoreCode" v-model="storeCode" class="form-input" inputmode="numeric" maxlength="4" @input="storeCode = cleanCode(storeCode)"></div></div><div class="form-field"><label class="form-label" for="managerPassword">Mật khẩu <span class="required-star">*</span></label><div class="form-input-wrapper"><input id="managerPassword" v-model="managerPassword" type="password" class="form-input"></div></div><div class="form-field"><label class="form-label" for="managerName">Tên CHT</label><div class="form-input-wrapper"><input id="managerName" v-model="managerName" class="form-input"></div></div></template>
        <template v-else><div class="form-field"><label class="form-label" for="employeeStoreCode">Mã cửa hàng <span class="required-star">*</span></label><div class="form-input-wrapper"><input id="employeeStoreCode" v-model="storeCode" class="form-input" inputmode="numeric" maxlength="4" @input="storeCode = cleanCode(storeCode)"></div></div><div class="apple-input-row"><div class="form-field flex-1"><label class="form-label" for="syncDisplayName">Tên nhân viên <span class="required-star">*</span></label><div class="form-input-wrapper"><input id="syncDisplayName" v-model="displayName" class="form-input"></div></div><div class="form-field flex-1"><label class="form-label" for="syncEmployeeCode">Mã nhân viên <span class="required-star">*</span></label><div class="form-input-wrapper"><input id="syncEmployeeCode" v-model="employeeCode" class="form-input"></div></div></div><div class="form-field"><label class="form-label" for="syncJoinCode">Mã PIN tham gia <span class="required-star">*</span></label><div class="form-input-wrapper"><input id="syncJoinCode" v-model="joinCode" type="password" class="form-input" inputmode="numeric" maxlength="4" @input="joinCode = cleanCode(joinCode)"></div></div></template>
        <div class="form-field"><label class="form-label" for="syncDeviceName">Tên thiết bị</label><div class="form-input-wrapper"><input id="syncDeviceName" v-model="deviceName" class="form-input"></div></div>
        <p v-if="authValidationMessage" class="sync-modal__validation" role="alert">{{ authValidationMessage }}</p><div class="sync-modal__actions"><button class="btn-secondary" type="button" @click="closeAuth">Hủy</button><button class="btn-action" type="button" :disabled="busy" @click="authenticate">{{ busy ? 'Đang kết nối…' : authModal === 'manager' ? 'Đăng nhập' : 'Tham gia' }}</button></div>
      </div></div>
    </div>

    <div v-if="confirmAction" class="apple-modal active sync-modal" role="dialog" aria-modal="true" aria-label="Xác nhận thao tác" @click.self="confirmAction = null"><div class="apple-modal-content sync-modal__content"><div class="apple-modal-header"><h3 class="apple-modal-title">Xác nhận</h3><button class="apple-modal-close-btn" type="button" aria-label="Đóng" @click="confirmAction = null">×</button></div><div class="apple-modal-body sync-modal__body"><p class="sync-modal__message">{{ confirmAction === 'logout' ? `Bạn muốn đăng xuất ${appStore.isManager ? 'CHT' : 'khỏi'} thiết bị này?` : confirmAction === 'reset' ? 'Mật khẩu sẽ được đặt lại thành mã cửa hàng.' : 'Bạn muốn đổi mật khẩu cửa hàng?' }}</p><div class="sync-modal__actions"><button class="btn-secondary" type="button" @click="confirmAction = null">Hủy</button><button class="btn-action" type="button" :disabled="busy" @click="confirm">Xác nhận</button></div></div></div></div>
  </section>
</template>
