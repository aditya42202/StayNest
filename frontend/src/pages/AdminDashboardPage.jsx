import { useEffect, useState } from 'react';
import { getAdminDashboard, getAllUsers, getAllProperties } from '../api/adminApi.js';
import Loader from '../components/Loader.jsx';

const AdminDashboardPage = () => {
  const [dashboard, setDashboard] = useState(null);
  const [users, setUsers] = useState([]);
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [dashboardRes, usersRes, propertiesRes] = await Promise.all([
          getAdminDashboard(),
          getAllUsers(),
          getAllProperties()
        ]);
        setDashboard(dashboardRes.data);
        setUsers(usersRes.data.users);
        setProperties(propertiesRes.data.properties);
      } catch (requestError) {
        setError(requestError.response?.data?.message || 'Unable to load the admin dashboard. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <section className="mx-auto max-w-7xl px-6 py-24">
        <Loader message="Loading admin dashboard..." />
      </section>
    );
  }

  if (error) {
    return (
      <section className="mx-auto max-w-7xl px-6 py-24 text-white">
        <div role="alert" className="rounded-3xl border border-rose-400/30 bg-rose-500/10 p-6 text-rose-200">{error}</div>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-7xl px-6 py-24 text-white">
      <div className="grid gap-8 lg:grid-cols-[1fr_1fr_1fr_1fr]">
        <div className="glass-card rounded-[32px] p-8 shadow-glass">
          <p className="text-sm uppercase tracking-[0.2em] text-slate-400">Users</p>
          <h2 className="mt-4 text-4xl font-semibold">{dashboard.userCount}</h2>
        </div>
        <div className="glass-card rounded-[32px] p-8 shadow-glass">
          <p className="text-sm uppercase tracking-[0.2em] text-slate-400">Owners</p>
          <h2 className="mt-4 text-4xl font-semibold">{dashboard.ownerCount}</h2>
        </div>
        <div className="glass-card rounded-[32px] p-8 shadow-glass">
          <p className="text-sm uppercase tracking-[0.2em] text-slate-400">Properties</p>
          <h2 className="mt-4 text-4xl font-semibold">{dashboard.propertyCount}</h2>
        </div>
        <div className="glass-card rounded-[32px] p-8 shadow-glass">
          <p className="text-sm uppercase tracking-[0.2em] text-slate-400">Bookings</p>
          <h2 className="mt-4 text-4xl font-semibold">{dashboard.bookingCount}</h2>
        </div>
      </div>

      <div className="mt-12 grid gap-8 xl:grid-cols-2">
        <div className="glass-card rounded-[32px] p-8 shadow-glass">
          <h3 className="text-2xl font-semibold">Recent Users</h3>
          <div className="mt-6 space-y-4">
            {users.slice(0, 4).map((user) => (
              <div key={user._id} className="rounded-3xl border border-white/10 bg-slate-950/80 p-6">
                <p className="font-semibold text-white">{user.name}</p>
                <p className="mt-2 text-slate-300">{user.email}</p>
                <p className="mt-1 text-slate-400">Role: {user.role}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-card rounded-[32px] p-8 shadow-glass">
          <h3 className="text-2xl font-semibold">Recent Properties</h3>
          <div className="mt-6 space-y-4">
            {properties.slice(0, 4).map((property) => (
              <div key={property._id} className="rounded-3xl border border-white/10 bg-slate-950/80 p-6">
                <p className="font-semibold text-white">{property.title}</p>
                <p className="mt-2 text-slate-300">{property.city} • {property.category}</p>
                <p className="mt-1 text-slate-400">Verified: {property.verified ? 'Yes' : 'No'}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default AdminDashboardPage;
