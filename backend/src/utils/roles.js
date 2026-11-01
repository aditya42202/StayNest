export const normalizeRole = (role) => (
  ['student', 'tenant', 'tourist'].includes(String(role || '').trim().toLowerCase()) ? 'user' : role
);

export const canonicalRole = (role) => {
  const normalized = String(role || '').trim().toLowerCase();
  if (normalized === 'student' || normalized === 'tenant' || normalized === 'tourist' || normalized === 'user') return 'user';
  if (normalized === 'owner') return 'owner';
  if (normalized === 'admin') return 'admin';
  return null;
};
