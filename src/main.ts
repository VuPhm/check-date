import { createPinia } from 'pinia';
import { createApp } from 'vue';
import flatpickr from 'flatpickr';
import 'flatpickr/dist/flatpickr.min.css';
import AppRuntime from './AppRuntime.vue';
import AppHeader from './components/AppHeader.vue';
import HistoryBoard from './components/history/HistoryBoard.vue';
import KphList from './components/kph/KphList.vue';
import KphToolbar from './components/kph/KphToolbar.vue';
import ImageModal from './components/kph/ImageModal.vue';
import KphApprovalForm from './components/kph/KphApprovalForm.vue';
import KphCreateForm from './components/kph/KphCreateForm.vue';
import NotificationModal from './components/notifications/NotificationModal.vue';
import LookupWorkspace from './components/lookup/LookupWorkspace.vue';
import ResultModal from './components/lookup/ResultModal.vue';
import ScannerModal from './components/scanner/ScannerModal.vue';
import SyncConfig from './components/sync/SyncConfig.vue';
import FirstRunSetup from './components/setup/FirstRunSetup.vue';
import { useAppStore } from './stores/app';
import { showAppleToast } from '../js/helpers.js';
import { notifyDeviceAboutActivity } from './services/deviceNotifications';
import type { ActivityEvent } from './domain/types';
import '../js/main.js';

Object.assign(window, { flatpickr });

const pinia = createPinia();
const appStore = useAppStore(pinia);
appStore.hydrateSettings();
appStore.hydrateSession();
appStore.bindConnectivityEvents();
window.addEventListener('coop:local-change', () => {
  if (appStore.session && navigator.onLine) void appStore.syncNow().catch(() => undefined);
});
window.addEventListener('coop:sync-summary', ((event: CustomEvent) => {
  const events = event.detail as ActivityEvent[];
  if (!events?.length) return;
  const message = events.length === 1 ? `Đã cập nhật: ${events[0].summary}` : `Đã cập nhật từ cửa hàng: ${events.length} thay đổi mới.`;
  showAppleToast(message, 'info', 4500);
  if (document.visibilityState !== 'visible') void notifyDeviceAboutActivity(events).catch(() => undefined);
}) as EventListener);

function mountComponent(component: Parameters<typeof createApp>[0], target: string) {
  const root = document.querySelector(target);
  if (root) createApp(component).use(pinia).mount(root);
}

mountComponent(AppHeader, '#vue-header-root');
mountComponent(LookupWorkspace, '#vue-lookup-root');
mountComponent(ResultModal, '#vue-result-modal-root');
mountComponent(ScannerModal, '#vue-scanner-modal-root');
mountComponent(HistoryBoard, '#vue-history-root');
mountComponent(KphToolbar, '#vue-kph-toolbar-root');
mountComponent(KphList, '#vue-kph-list-root');
mountComponent(ImageModal, '#vue-image-modal-root');
mountComponent(KphApprovalForm, '#kphApproveForm');
mountComponent(KphCreateForm, '#kphForm');
mountComponent(NotificationModal, '#vue-notification-modal-root');
mountComponent(SyncConfig, '#vue-sync-config-root');
mountComponent(FirstRunSetup, '#vue-first-run-root');

const runtimeRoot = document.getElementById('vue-app-runtime');
if (runtimeRoot) {
  createApp(AppRuntime).use(pinia).mount(runtimeRoot);
}
