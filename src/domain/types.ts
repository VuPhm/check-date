export type BranchRole = 'manager' | 'employee';
export type SyncStatus = 'idle' | 'offline' | 'syncing' | 'synced' | 'error';
export type ApprovalStatus = 'cho_duyet' | 'da_duyet' | 'khong_duyet';
export type KphResolution = 'HỦY' | 'ĐỔI' | 'XUẤT TRẢ' | 'KHÁC';
export type AlertType = 'safe' | 'warning' | 'danger' | 'expired';

export interface BranchIdentity {
  id: string;
  code: string;
  name: string;
}

export interface AuthenticatedUser {
  id: string;
  displayName: string;
  role: BranchRole;
  branchId: string;
  employeeCode?: string;
}

export interface DeviceSession extends AuthenticatedUser {
  deviceId: string;
  accessToken: string;
}

export interface ServerEndpoint {
  /** Full API origin/path, e.g. https://sync.example.vn/api. */
  basePath: string;
}

export interface ManagedDevice {
  deviceId: string;
  deviceName: string;
  userId: string;
  displayName: string;
  role: BranchRole;
  lastSeenAt?: string;
}

export interface ManagedEmployee {
  id: string;
  displayName: string;
  employeeCode: string;
  active: boolean;
}

export interface SyncMetadata {
  branchId?: string;
  createdBy?: string;
  updatedBy?: string;
  createdAt?: string;
  updatedAt?: string;
  version?: number;
  deletedAt?: string | null;
}

export interface KphLog extends SyncMetadata {
  id: string;
  loaiKph?: 'TPCN' | 'TPTS';
  trangThaiDuyet?: ApprovalStatus;
  image?: Blob | string | null;
  images?: Array<Blob | string>;
  [key: string]: unknown;
}

export interface KphApprovalInput {
  status: ApprovalStatus;
  resolution: KphResolution;
  resolutionText?: string;
  resolutionDate?: string;
  approver?: string;
}

export interface KphDraftInput {
  id: string;
  type: 'TPCN' | 'TPTS';
  detectedDate: string;
  detectedBy: string;
  sku?: string;
  productName?: string;
  supplier?: string;
  unit: 'EA' | 'kg';
  quantity: number;
  condition: string;
  resolution: KphResolution;
  resolutionText?: string;
  resolutionDate?: string;
  note?: string;
  images: Blob[];
}

export interface HistoryLog extends SyncMetadata {
  id: string;
  alertType?: AlertType | 'other';
  checkedAt?: string;
  [key: string]: unknown;
}

export interface BusinessAlert {
  class: string;
  label: string;
  weight: number;
  type: AlertType;
}

export interface ReturnBusinessResult {
  isExpiredProduct: boolean;
  isShortProduct: boolean;
  formattedHsd: string;
  dateStr: string;
  daysRemaining: number;
  alert: BusinessAlert;
}
