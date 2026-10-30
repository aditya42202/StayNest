export const normalizeRole = (role) => (role === 'student' ? 'user' : role);

export const canonicalRole = (role) => {
  const normalized = String(role || '').trim().toLowerCase();
  if (normalized === 'student' || normalized === 'tenant' || normalized === 'user') return 'user';
  if (normalized === 'owner') return 'owner';
  if (normalized === 'admin') return 'admin';
  return null;
};
