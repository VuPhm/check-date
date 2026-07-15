import { kphDraftInputSchema } from './schemas';
import type { KphDraftInput, KphLog } from './types';

export function buildKphLog(rawInput: KphDraftInput): KphLog {
  const input = kphDraftInputSchema.parse(rawInput);
  return {
    id: input.id,
    ngayPhatHien: input.detectedDate,
    nguoiPhatHien: input.detectedBy,
    sku: input.sku,
    tenHang: input.productName,
    ncc: input.supplier,
    dvt: input.unit,
    soLuong: input.quantity,
    tinhTrang: input.condition,
    bienPhap: input.resolution,
    bienPhapText: input.resolution === 'KHÁC' ? input.resolutionText || 'KHÁC' : input.resolution,
    ngayXuLy: input.resolutionDate,
    ghiChu: input.note,
    trangThaiDuyet: 'cho_duyet',
    thoiGianDuyet: '',
    loaiKph: input.type,
    images: [...input.images],
  };
}
