<script setup lang="ts">
const logoUrl = `${import.meta.env.BASE_URL}coopfood-logo.png`;

function switchWorkspace(tab: 'tracuu' | 'kph') {
  const handler = (window as typeof window & { switchTab?: (value: string) => void }).switchTab;
  handler?.(tab);
}

function openNotifications() {
  const handler = (window as typeof window & { openNotificationModal?: () => void }).openNotificationModal;
  handler?.();
}
</script>

<template>
  <div class="header-inner">
    <div class="brand-header-apple">
      <img class="brand-apple-logo" :src="logoUrl" alt="Co.op Food Logo">
    </div>

    <nav class="apple-tab-bar" aria-label="Chức năng chính">
      <button
        id="tab-btn-tracuu"
        class="tab-btn active"
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
        <span class="notification-badge" style="display: none;">0</span>
      </button>
      <button id="btnOpenSidebar" class="header-action-btn menu-personal-btn" aria-label="Cá nhân và cấu hình" type="button">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <circle cx="12" cy="6" r="3.5" />
          <path d="M4 12h16" />
          <path d="M6 16h12" />
          <path d="M8 20h8" />
        </svg>
      </button>
    </div>
  </div>
</template>
