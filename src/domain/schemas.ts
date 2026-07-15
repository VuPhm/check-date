import { z } from 'zod';

export const serverEndpointSchema = z.object({
  basePath: z.string().trim().default('/api'),
});

export const branchIdentitySchema = z.object({
  id: z.string().min(1),
  code: z.string().min(1),
  name: z.string().min(1),
});

export const authenticatedUserSchema = z.object({
  id: z.string().min(1),
  displayName: z.string().min(1),
  role: z.enum(['manager', 'employee']),
  branchId: z.string().min(1),
});

export const deviceSessionSchema = authenticatedUserSchema.extend({
  deviceId: z.string().min(1),
  accessToken: z.string().min(1),
});

export const kphApprovalInputSchema = z.object({
  status: z.enum(['cho_duyet', 'da_duyet', 'khong_duyet']),
  resolution: z.enum(['HỦY', 'ĐỔI', 'XUẤT TRẢ', 'KHÁC']),
  resolutionText: z.string().trim().max(255).optional().default(''),
  resolutionDate: z.string().trim().max(10).optional().default(''),
  approver: z.string().trim().max(100).optional().default(''),
});

export const kphDraftInputSchema = z.object({
  id: z.string().min(1),
  type: z.enum(['TPCN', 'TPTS']),
  detectedDate: z.string().trim().min(1),
  detectedBy: z.string().trim().min(1).max(100),
  sku: z.string().trim().max(50).optional().default(''),
  productName: z.string().trim().max(200).optional().default(''),
  supplier: z.string().trim().max(150).optional().default(''),
  unit: z.enum(['EA', 'kg']),
  quantity: z.number().positive(),
  condition: z.string().trim().min(1).max(150),
  resolution: z.enum(['HỦY', 'ĐỔI', 'XUẤT TRẢ', 'KHÁC']),
  resolutionText: z.string().trim().max(255).optional().default(''),
  resolutionDate: z.string().trim().max(10).optional().default(''),
  note: z.string().trim().max(255).optional().default(''),
  images: z.array(z.instanceof(Blob)).min(1).max(3),
}).refine((input) => Boolean(input.sku || input.productName), {
  message: 'Cần ít nhất SKU/UPC hoặc tên hàng hóa.',
  path: ['sku'],
});
