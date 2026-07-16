<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { useAppStore } from '../stores/app';
import TaskWorkspace from './notifications/TaskWorkspace.vue';
const logoUrl = `${import.meta.env.BASE_URL}coopfood-logo.png`;
const appStore = useAppStore();
const unreadCount = computed(() => appStore.unreadActionableEvents.length);
const profileName = computed(() => appStore.session?.displayName || 'Nhân viên');
const profileCode = computed(() => appStore.session?.employeeCode || appStore.session?.branchId || 'Chưa liên kết');
const profileRole = computed(() => appStore.session?.role === 'manager' ? 'Cửa hàng trưởng' : 'Nhân viên');
const isSidebarCollapsed = ref(false);
const isProfileSettingsOpen = ref(false);

function switchWorkspace(tab: 'tracuu' | 'kph') {
  closeProfileSettings();
  const handler = (window as typeof window & { switchTab?: (value: string) => void }).switchTab;
  handler?.(tab);
}

function openSettingsWorkspace() {
  closeProfileSettings();
  document.querySelectorAll('.tab-btn').forEach((button) => button.classList.remove('active'));
  document.querySelectorAll('[data-workspace="settings"]').forEach((button) => button.classList.add('active'));
  document.querySelectorAll('.tab-content').forEach((content) => content.classList.remove('active-tab'));
  document.querySelectorAll('[data-sidebar-panel]').forEach((panel) => panel.classList.toggle('active', panel.getAttribute('data-sidebar-panel') === 'settings'));
  document.querySelectorAll('[data-sidebar-tab]').forEach((tab) => {
    const isActive = tab.getAttribute('data-sidebar-tab') === 'settings';
    tab.classList.toggle('active', isActive);
    tab.setAttribute('aria-selected', String(isActive));
  });
  document.querySelector('.app-container')?.classList.add('system-workspace-active');
}

function openTasksWorkspace() {
  closeProfileSettings();
  document.querySelectorAll('.tab-btn').forEach((button) => button.classList.remove('active'));
  document.querySelectorAll('[data-sidebar-tab]').forEach((button) => {
    const active = button.getAttribute('data-sidebar-tab') === 'tasks';
    button.classList.toggle('active', active);
    button.setAttribute('aria-selected', String(active));
  });
  document.querySelectorAll('[data-sidebar-panel]').forEach((panel) => panel.classList.toggle('active', panel.getAttribute('data-sidebar-panel') === 'tasks'));
  document.querySelector('.app-container')?.classList.add('system-workspace-active');
}

function openProfileSettings() {
  if (window.matchMedia('(min-width: 1024px)').matches) {
    if (isProfileSettingsOpen.value) {
      closeProfileSettings();
      return;
    }
    const settingsPanel = document.querySelector<HTMLElement>('[data-sidebar-panel="settings"]');
    const isSettingsWorkspaceOpen = document.querySelector('.app-container')?.classList.contains('system-workspace-active') && settingsPanel?.classList.contains('active');
    if (isSettingsWorkspaceOpen) return;
    isProfileSettingsOpen.value = true;
    document.getElementById('desktopSystemWorkspace')?.classList.add('profile-settings-host');
    return;
  }
  openSettingsWorkspace();
}

function closeProfileSettings() {
  isProfileSettingsOpen.value = false;
  document.getElementById('desktopSystemWorkspace')?.classList.remove('profile-settings-host');
}

function closeProfileSettingsOnOutsideClick(event: PointerEvent) {
  if (!isProfileSettingsOpen.value) return;
  const target = event.target as Element | null;
  if (target?.closest('.profile-summary, .desktop-workspace-panel.is-profile-floating')) return;
  closeProfileSettings();
}

function openNotifications() {
  const handler = (window as typeof window & { openNotificationModal?: () => void }).openNotificationModal;
  handler?.();
}

function toggleDesktopSidebar() {
  isSidebarCollapsed.value = !isSidebarCollapsed.value;
  document.body.classList.toggle('desktop-sidebar-collapsed', isSidebarCollapsed.value);
}

onMounted(() => document.addEventListener('pointerdown', closeProfileSettingsOnOutsideClick));
onMounted(() => window.addEventListener('coop:open-tasks', openTasksWorkspace));
onBeforeUnmount(() => { document.removeEventListener('pointerdown', closeProfileSettingsOnOutsideClick); window.removeEventListener('coop:open-tasks', openTasksWorkspace); });

</script>

<template>
  <aside class="desktop-nav-sidebar" :class="{ 'is-collapsed': isSidebarCollapsed }" aria-label="Điều hướng chính">
    <div class="desktop-nav-sidebar__brand">
      <button class="desktop-sidebar-collapse" type="button" :aria-label="isSidebarCollapsed ? 'Mở rộng sidebar' : 'Thu gọn sidebar'" @click="toggleDesktopSidebar">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m15 18-6-6 6-6" /></svg>
        <span>{{ isSidebarCollapsed ? 'Mở rộng' : 'Thu gọn' }}</span>
      </button>
    </div>

    <div class="desktop-nav-sidebar__content">
      <nav class="desktop-primary-nav" aria-label="Điều hướng ứng dụng">
        <button class="tab-btn desktop-nav-tab active" data-nav-group="tool" data-first-tool="true" data-workspace="tracuu" type="button" @click="switchWorkspace('tracuu')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
          <span>Hạn lùi hàng</span>
        </button>
        <button class="tab-btn desktop-nav-tab" data-nav-group="tool" data-workspace="kph" type="button" @click="switchWorkspace('kph')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></svg>
          <span>Hàng KPH</span>
        </button>
      <button class="tab-btn desktop-nav-tab" data-nav-group="system" data-first-system="true" type="button" role="tab" aria-selected="false" data-sidebar-tab="settings" @click="openSettingsWorkspace">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="4" y1="6" x2="20" y2="6" /><line x1="4" y1="12" x2="20" y2="12" /><line x1="4" y1="18" x2="20" y2="18" /><circle cx="9" cy="6" r="2" fill="currentColor" stroke="none" /><circle cx="15" cy="12" r="2" fill="currentColor" stroke="none" /><circle cx="11" cy="18" r="2" fill="currentColor" stroke="none" /></svg>
        <span>Cấu hình & đồng bộ</span>
      </button>
      <button class="tab-btn desktop-nav-tab" data-nav-group="system" type="button" role="tab" aria-selected="false" data-sidebar-tab="tasks" @click="openTasksWorkspace">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 11l3 3L22 4" /><path d="M21 12v7a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h12" /></svg>
        <span>Việc cần xử lý</span>
      </button>
      </nav>

      <div class="desktop-nav-sidebar__footer">
        <div class="desktop-install-card">
          <div class="app-version-row"><span>Phiên bản</span><strong id="appVersionNote">Đang tải...</strong></div>
          <p id="appInstallStatus" class="app-install-status" aria-live="polite">Thêm ứng dụng vào màn hình chính để mở nhanh hơn.</p>
          <button id="btnInstallApp" class="desktop-panel-button" type="button"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="6" y="2" width="12" height="20" rx="2" /><path d="m9 13 3 3 3-3" /><path d="M12 8v8" /></svg><span>Cài đặt ứng dụng</span></button>
        </div>
      </div>
    </div>
  </aside>

  <Teleport to="#desktopSystemWorkspace">
    <div v-if="isProfileSettingsOpen" class="profile-settings-backdrop" @click="closeProfileSettings"></div>
    <section class="desktop-workspace-panel" :class="{ 'is-profile-floating': isProfileSettingsOpen }" data-sidebar-panel="settings">
      <div class="desktop-workspace-panel__intro"><p>Cấu hình</p><h2>Cấu hình & đồng bộ</h2><button v-if="isProfileSettingsOpen" class="profile-settings-close" type="button" aria-label="Đóng cấu hình" @click="closeProfileSettings">×</button></div>
      <div class="desktop-workspace-panel__body">
        <div id="vue-sync-config-root"></div>
      </div>
      </section>

    <section class="desktop-workspace-panel" data-sidebar-panel="tasks">
      <TaskWorkspace />
    </section>
  </Teleport>

  <div class="header-inner">
    <div class="brand-header-apple">
      <img class="brand-apple-logo" :src="logoUrl" alt="Co.op Food Logo">
    </div>

    <nav class="apple-tab-bar" aria-label="Chức năng chính">
      <button
        id="tab-btn-tracuu"
        class="tab-btn active"
        data-workspace="tracuu"
        type="button"
        aria-label="Tra cứu hạn lùi"
        @click="switchWorkspace('tracuu')"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
        <span>Hạn lùi hàng</span>
      </button>

      <button
        id="tab-btn-kph"
        class="tab-btn"
        data-workspace="kph"
        type="button"
        aria-label="Hàng không phù hợp"
        @click="switchWorkspace('kph')"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
          <polyline points="10 9 9 9 8 9" />
        </svg>
        <span>Hàng KPH</span>
      </button>
      <button class="tab-btn" data-workspace="settings" type="button" aria-label="Cấu hình" @click="openSettingsWorkspace">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="4" y1="6" x2="20" y2="6" /><line x1="4" y1="12" x2="20" y2="12" /><line x1="4" y1="18" x2="20" y2="18" /><circle cx="9" cy="6" r="2" fill="currentColor" stroke="none" /><circle cx="15" cy="12" r="2" fill="currentColor" stroke="none" /><circle cx="11" cy="18" r="2" fill="currentColor" stroke="none" /></svg>
        <span>Cấu hình</span>
      </button>
    </nav>

    <div class="header-right">
      <div class="apple-chrono-line">
        <span class="chrono-line__label">Hôm nay:</span>
        <span id="widgetFullDate" class="chrono-line__value desktop-only">---</span>
        <span id="widgetShortDate" class="chrono-line__value mobile-only">---</span>
      </div>
      <button
        id="btnNotification"
        class="header-action-btn notification-btn"
        aria-label="Thông báo"
        type="button"
        @click="openNotifications"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        <span class="notification-badge" :style="{ display: unreadCount ? 'flex' : 'none' }">{{ unreadCount }}</span>
      </button>
      <button class="profile-summary" type="button" aria-label="Mở cấu hình tài khoản" @click="openProfileSettings">
        <span class="profile-summary__avatar" aria-hidden="true">{{ profileName.charAt(0).toUpperCase() }}</span>
        <span class="profile-summary__details">
          <strong>{{ profileName }}</strong>
          <small>{{ profileRole }} / {{ profileCode }}</small>
        </span>
      </button>
    </div>
  </div>
</template>
