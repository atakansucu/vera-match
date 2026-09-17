/** Computes age in whole years from an ISO date-of-birth string. */
export function ageFromDob(dob: string, now: Date = new Date()): number {
  const birth = new Date(dob);
  let age = now.getFullYear() - birth.getFullYear();
  const monthDiff = now.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birth.getDate())) {
    age -= 1;
  }
  return age;
}

/** True when the person is at least `minAge` years old. */
export function isAtLeastAge(dob: string, minAge: number, now: Date = new Date()): boolean {
  return ageFromDob(dob, now) >= minAge;
}

export function formatRelativeTime(iso: string, now: Date = new Date()): string {
  const diffMs = now.getTime() - new Date(iso).getTime();
  const minutes = Math.round(diffMs / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d`;
  return new Date(iso).toLocaleDateString();
}
