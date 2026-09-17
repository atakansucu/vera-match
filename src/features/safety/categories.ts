import type { ReportCategory } from '@/types/domain';

export const REPORT_CATEGORY_OPTIONS: { value: ReportCategory; label: string }[] = [
  { value: 'harassment', label: 'Harassment' },
  { value: 'hate_abuse', label: 'Hate or abuse' },
  { value: 'fake_identity', label: 'Fake identity' },
  { value: 'scam', label: 'Scam' },
  { value: 'inappropriate_sexual', label: 'Inappropriate sexual behaviour' },
  { value: 'threat_safety', label: 'Threat or safety concern' },
  { value: 'underage', label: 'Underage concern' },
  { value: 'other', label: 'Other' },
];
