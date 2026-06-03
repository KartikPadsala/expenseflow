import { useMutation } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { Alert, Platform } from 'react-native';
import type { OcrResult } from '@expenseflow/shared';
import api from '../lib/api';

export type OcrSource = 'camera' | 'gallery';

async function scanReceipt(uri: string, mimeType: string): Promise<OcrResult> {
  const formData = new FormData();
  formData.append('receipt', {
    uri: Platform.OS === 'ios' ? uri.replace('file://', '') : uri,
    name: `receipt.${mimeType.split('/')[1] || 'jpg'}`,
    type: mimeType,
  } as any);

  const response = await api.post('/ocr/scan', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data?.data ?? response.data;
}

async function pickFromGallery(): Promise<ImagePicker.ImagePickerResult> {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== 'granted') {
    Alert.alert('Permission required', 'Please allow access to your photo library to scan receipts.');
    return { canceled: true, assets: [] };
  }
  return ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    quality: 0.8,
    allowsEditing: false,
  });
}

async function pickFromCamera(): Promise<ImagePicker.ImagePickerResult> {
  const { status } = await ImagePicker.requestCameraPermissionsAsync();
  if (status !== 'granted') {
    Alert.alert('Permission required', 'Please allow camera access to scan receipts.');
    return { canceled: true, assets: [] };
  }
  return ImagePicker.launchCameraAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    quality: 0.8,
    allowsEditing: true,
  });
}

interface ScanOptions {
  source: OcrSource;
}

export function useScanReceipt() {
  return useMutation<OcrResult, Error, ScanOptions>({
    mutationFn: async ({ source }) => {
      const result = source === 'camera' ? await pickFromCamera() : await pickFromGallery();

      if (result.canceled || !result.assets?.[0]) {
        throw new Error('No image selected');
      }

      const asset = result.assets[0];
      const mimeType = asset.mimeType ?? 'image/jpeg';
      return scanReceipt(asset.uri, mimeType);
    },
  });
}
