import { useMutation } from '@tanstack/react-query';
import type { OcrResult } from '@expenseflow/shared';
import api from '@/lib/api';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
const MAX_SIZE_MB = 10;

export class OcrValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'OcrValidationError';
  }
}

async function uploadAndScan(file: File): Promise<OcrResult> {
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new OcrValidationError(`Unsupported file type. Allowed: JPEG, PNG, WebP, PDF`);
  }
  if (file.size > MAX_SIZE_MB * 1024 * 1024) {
    throw new OcrValidationError(`File is too large. Maximum size is ${MAX_SIZE_MB}MB.`);
  }

  const formData = new FormData();
  formData.append('receipt', file);

  const { data } = await api.post('/ocr/scan', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data?.data ?? data;
}

export function useScanReceipt() {
  return useMutation<OcrResult, Error, File>({
    mutationFn: uploadAndScan,
  });
}
