import { kphApprovalInputSchema } from './schemas';
import type { ApprovalStatus, KphApprovalInput, KphLog } from './types';

function approvalTimestamp(
  previousStatus: ApprovalStatus | undefined,
  nextStatus: ApprovalStatus,
  currentTimestamp: string,
  approvedAt: string,
): string {
  if (nextStatus === 'cho_duyet') return '';
  if (nextStatus !== previousStatus || !currentTimestamp) return approvedAt;
  return currentTimestamp;
}

export function buildKphApprovalUpdate(
  currentLog: KphLog,
  rawInput: KphApprovalInput,
  approvedAt: string,
): KphLog {
  const input = kphApprovalInputSchema.parse(rawInput);
  const resolutionText = input.resolution === 'KHÁC'
    ? input.resolutionText || 'KHÁC'
    : input.resolution;

  return {
    ...currentLog,
    // This is used by the sync server to prevent a stale device from
    // overwriting an approval that was just changed on another device.
    updatedAt: new Date().toISOString(),
    version: (typeof currentLog.version === 'number' ? currentLog.version : 0) + 1,
    trangThaiDuyet: input.status,
    thoiGianDuyet: approvalTimestamp(
      currentLog.trangThaiDuyet,
      input.status,
      typeof currentLog.thoiGianDuyet === 'string' ? currentLog.thoiGianDuyet : '',
      approvedAt,
    ),
    nguoiDuyet: input.approver,
    bienPhap: input.resolution,
    bienPhapText: resolutionText,
    ngayXuLy: input.resolutionDate,
  };
}
