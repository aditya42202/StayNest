import { Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import AdminDashboardPage from './AdminDashboardPage.jsx';
import OwnerDashboardPage from './OwnerDashboardPage.jsx';
import StudentDashboardPage from './StudentDashboardPage.jsx';

const DashboardPage = () => {
  const user = useSelector((state) => state.auth.user);

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role === 'admin') {
    return <AdminDashboardPage />;
  }

  if (user.role === 'owner') {
    return <OwnerDashboardPage />;
  }

  if (user.role === 'user' || user.role === 'student') {
    return <StudentDashboardPage />;
  }

  return (
    <section className="mx-auto max-w-7xl px-6 pb-24 pt-4 text-white">
      <div className="glass-card rounded-[32px] border border-white/10 p-10 shadow-glass">
        <h1 className="text-3xl font-semibold">Dashboard unavailable</h1>
        <p className="mt-4 text-slate-300">Your account role is not recognized. Please contact support.</p>
      </div>
    </section>
  );
};

export default DashboardPage;
