<script setup lang="ts">
import { computed } from 'vue';
import type { ActivityEvent } from '../../domain/types';

const props = withDefaults(defineProps<{
  events: ActivityEvent[];
  limit?: number;
  compact?: boolean;
  emptyMessage?: string;
}>(), {
  limit: 50,
  compact: false,
  emptyMessage: 'Chưa có hoạt động nào từ cửa hàng.',
});

const visibleEvents = computed(() => props.events.slice(0, props.limit));

function topic(event: ActivityEvent) {
  const topics: Record<ActivityEvent['type'], string> = {
    'kph.created': 'Phiếu KPH mới',
    'kph.approved': 'Đã duyệt phiếu',
    'kph.rejected': 'Không duyệt phiếu',
    'kph.deleted': 'Đã xóa phiếu',
    'employee.joined': 'Nhân sự mới',
    'employee.removed': 'Thay đổi nhân sự',
  };
  return topics[event.type];
}

function eventTime(value: string) {
  return new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value));
}
</script>

<template>
  <div v-if="visibleEvents.length" class="activity-log" :class="{ 'activity-log--compact': compact }">
    <article v-for="event in visibleEvents" :key="event.id" class="activity-log__item">
      <span class="activity-log__icon" :class="`is-${event.type.replace('.', '-')}`" aria-hidden="true">
        <svg v-if="event.type === 'kph.created'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6"/><path d="M8 14h8M8 18h5"/></svg>
        <svg v-else-if="event.type === 'kph.approved'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12 4 4L19 6"/><circle cx="12" cy="12" r="9"/></svg>
        <svg v-else-if="event.type === 'kph.rejected' || event.type === 'kph.deleted'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="m9 9 6 6m0-6-6 6"/></svg>
        <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/><path v-if="event.type === 'employee.joined'" d="M19 8v6m-3-3h6"/></svg>
      </span>
      <div class="activity-log__content">
        <p>{{ topic(event) }}</p>
        <strong>{{ event.summary }}</strong>
        <small>{{ event.actorName }} · {{ eventTime(event.createdAt) }}</small>
      </div>
    </article>
  </div>
  <div v-else class="activity-log__empty">{{ emptyMessage }}</div>
</template>
