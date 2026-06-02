export const DEFAULT_CURRENCY = 'USD';
export const DEFAULT_LANGUAGE = 'en';
export const DEFAULT_TIMEZONE = 'UTC';
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;
export const MAX_ATTACHMENT_SIZE = 10 * 1024 * 1024; // 10MB
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic'];
export const ALLOWED_DOCUMENT_TYPES = ['application/pdf'];

export const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'fr', name: 'French', nativeName: 'Français' },
  { code: 'es', name: 'Spanish', nativeName: 'Español' },
  { code: 'de', name: 'German', nativeName: 'Deutsch' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी' },
  { code: 'gu', name: 'Gujarati', nativeName: 'ગુજરાતી' },
];

export const GROUP_TYPES = [
  { value: 'HOME', label: 'Home', icon: '🏠' },
  { value: 'TRIP', label: 'Trip', icon: '✈️' },
  { value: 'COUPLE', label: 'Couple', icon: '💑' },
  { value: 'OFFICE', label: 'Office', icon: '💼' },
  { value: 'OTHER', label: 'Other', icon: '👥' },
] as const;

export const SPLIT_METHODS = [
  { value: 'EQUAL', label: 'Equal', description: 'Split evenly among all participants' },
  { value: 'UNEQUAL', label: 'Unequal', description: 'Custom amounts per person' },
  { value: 'PERCENTAGE', label: 'Percentage', description: 'Split by percentage' },
  { value: 'SHARES', label: 'Shares', description: 'Split by shares/ratio' },
  { value: 'EXACT', label: 'Exact', description: 'Specify exact amount owed' },
  { value: 'MULTI_PAYER', label: 'Multi-payer', description: 'Multiple people paid' },
] as const;
