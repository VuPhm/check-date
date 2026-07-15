import { createPinia } from 'pinia';
import { createApp } from 'vue';
import flatpickr from 'flatpickr';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import 'flatpickr/dist/flatpickr.min.css';
import AppRuntime from './AppRuntime.vue';
import AppHeader from './components/AppHeader.vue';
import HistoryBoard from './components/history/HistoryBoard.vue';
import KphList from './components/kph/KphList.vue';
import KphApprovalForm from './components/kph/KphApprovalForm.vue';
import KphCreateForm from './components/kph/KphCreateForm.vue';
import NotificationContent from './components/notifications/NotificationContent.vue';
import LookupWorkspace from './components/lookup/LookupWorkspace.vue';
import '../js/main.js';

Object.assign(window, { flatpickr, Html5Qrcode, Html5QrcodeSupportedFormats });

function mountComponent(component: Parameters<typeof createApp>[0], target: string) {
  const root = document.querySelector(target);
  if (root) createApp(component).mount(root);
}

mountComponent(AppHeader, '#vue-header-root');
mountComponent(LookupWorkspace, '#vue-lookup-root');
mountComponent(HistoryBoard, '#vue-history-root');
mountComponent(KphList, '#vue-kph-list-root');
mountComponent(KphApprovalForm, '#kphApproveForm');
mountComponent(KphCreateForm, '#kphForm');
mountComponent(NotificationContent, '#notificationModalBody');

const runtimeRoot = document.getElementById('vue-app-runtime');
if (runtimeRoot) {
  createApp(AppRuntime).use(createPinia()).mount(runtimeRoot);
}
