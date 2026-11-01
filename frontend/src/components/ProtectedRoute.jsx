import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';

const normalizeRole = (role) => (['student', 'tenant', 'tourist'].includes(role) ? 'user' : role);

const ProtectedRoute = ({ roles }) => {
  const user = useSelector((state) => state.auth.user);
  const location = useLocation();

  if (!user) return <Navigate to="/login" replace state={{ from: `${location.pathname}${location.search}` }} />;
  if (roles && !roles.includes(normalizeRole(user.role))) {
    return <Navigate to="/dashboard" replace />;
  }
  return <Outlet />;
};

export default ProtectedRoute;
