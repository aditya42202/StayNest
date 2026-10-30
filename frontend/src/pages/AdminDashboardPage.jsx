import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  getAdminDashboard,
  getAllBookings,
  getAllProperties,
  getAllUsers,
  verifyProperty
} from '../api/adminApi.js';
import Loader from '../components/Loader.jsx';

const tabs = [
  { id: 'overview', label: 'Overview' },
  { id: 'users', label: 'Users' },
  { id: 'properties', label: 'Properties' },
  { id: 'bookings', label: 'Bookings' }
];

const formatDate = (date) => (date ? new Date(date).toLocaleDateString() : 'Not available');

const AdminDashboardPage = () => {
  const [dashboard, setDashboard] = useState(null);
  const [users, setUsers] = useState([]);
  const [properties, setProperties] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [propertyFilter, setPropertyFilter] = useState('all');
  const [bookingFilter, setBookingFilter] = useState('all');
  const [updatingPropertyId, setUpdatingPropertyId] = useState('');
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [dashboardRes, usersRes, propertiesRes, bookingsRes] = await Promise.all([
          getAdminDashboard(),
          getAllUsers(),
          getAllProperties(),
          getAllBookings()
        ]);
        setDashboard(dashboardRes.data);
        setUsers(usersRes.data.users);
        setProperties(propertiesRes.data.properties);
        setBookings(bookingsRes.data.bookings);
      } catch (requestError) {
        setError(requestError.response?.data?.message || 'Unable to load admin data. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const filteredUsers = useMemo(() => {
    const query = search.trim().toLowerCase();
    return users.filter((user) => {
      const matchesRole = roleFilter === 'all' || user.role === roleFilter;
      const matchesSearch = !query || `${user.name} ${user.email}`.toLowerCase().includes(query);
      return matchesRole && matchesSearch;
    });
  }, [users, roleFilter, search]);

  const filteredProperties = useMemo(() => {
    const query = search.trim().toLowerCase();
    return properties.filter((property) => {
      const matchesStatus = propertyFilter === 'all' || String(property.verified) === propertyFilter;
      const matchesSearch = !query || `${property.title} ${property.city} ${property.area} ${property.owner?.name || ''}`.toLowerCase().includes(query);
      return matchesStatus && matchesSearch;
    });
  }, [properties, propertyFilter, search]);

  const filteredBookings = useMemo(() => {
    const query = search.trim().toLowerCase();
    return bookings.filter((booking) => {
      const matchesStatus = bookingFilter === 'all' || booking.status === bookingFilter;
      const matchesSearch = !query || `${booking.student?.name || ''} ${booking.property?.title || ''} ${booking.owner?.name || ''}`.toLowerCase().includes(query);
      return matchesStatus && matchesSearch;
    });
  }, [bookings, bookingFilter, search]);

  const handleVerification = async (property) => {
    setUpdatingPropertyId(property._id);
    setActionError('');
    try {
      const { data } = await verifyProperty(property._id, !property.verified);
      setProperties((currentProperties) =>
        currentProperties.map((currentProperty) =>
          currentProperty._id === data._id
            ? { ...currentProperty, verified: data.verified }
            : currentProperty
        )
      );
    } catch (requestError) {
      setActionError(requestError.response?.data?.message || 'Unable to update property verification.');
    } finally {
      setUpdatingPropertyId('');
    }
  };

  if (loading) {
    return (
      <section className="mx-auto max-w-7xl px-6 pb-24 pt-4">
        <Loader message="Loading admin dashboard..." />
      </section>
    );
  }

  if (error) {
    return (
      <section className="mx-auto max-w-7xl px-6 pb-24 pt-4 text-white">
        <div role="alert" className="rounded-3xl border border-rose-400/30 bg-rose-500/10 p-6 text-rose-200">{error}</div>
      </section>
    );
  }

  const stats = [
    { label: 'Users', value: dashboard.userCount },
    { label: 'Owners', value: dashboard.ownerCount },
    { label: 'Properties', value: dashboard.propertyCount },
    { label: 'Pending verification', value: properties.filter((property) => !property.verified).length },
    { label: 'Bookings', value: dashboard.bookingCount },
    { label: 'Pending bookings', value: bookings.filter((booking) => booking.status === 'pending').length }
  ];

  return (
    <section className="mx-auto max-w-7xl px-6 pb-16 pt-4 text-white">
      <header className="mb-8">
        <p className="text-sm uppercase tracking-[0.24em] text-blue-300">StayNest administration</p>
        <h1 className="mt-2 text-4xl font-semibold">Admin dashboard</h1>
        <p className="mt-3 text-slate-400">Monitor platform activity, users, listings, and bookings.</p>
      </header>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((stat) => (
          <article key={stat.label} className="glass-card rounded-[28px] border border-white/10 p-7 shadow-glass">
            <p className="text-sm uppercase tracking-[0.18em] text-slate-400">{stat.label}</p>
            <p className="mt-3 text-4xl font-semibold">{stat.value}</p>
          </article>
        ))}
      </div>

      <nav aria-label="Admin dashboard sections" className="mt-10 flex flex-wrap gap-3 border-b border-white/10 pb-4">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => {
              setActiveTab(tab.id);
              setSearch('');
            }}
            aria-current={activeTab === tab.id ? 'page' : undefined}
            className={`rounded-full px-5 py-2 text-sm transition ${
              activeTab === tab.id
                ? 'bg-blue-500 text-white'
                : 'border border-white/10 bg-slate-950/60 text-slate-300 hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {actionError && (
        <div role="alert" className="mt-6 rounded-3xl border border-rose-400/30 bg-rose-500/10 p-5 text-rose-200">
          {actionError}
        </div>
      )}

      {activeTab === 'overview' && (
        <div className="mt-8 grid gap-8 xl:grid-cols-2">
          <section className="glass-card rounded-[32px] border border-white/10 p-8 shadow-glass">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-2xl font-semibold">Recent users</h2>
              <button type="button" onClick={() => setActiveTab('users')} className="text-sm text-blue-300 hover:text-white">View all</button>
            </div>
            <div className="mt-6 space-y-4">
              {users.length === 0 ? (
                <p className="text-slate-400">No users found.</p>
              ) : users.slice(0, 5).map((user) => (
                <article key={user._id} className="rounded-3xl border border-white/10 bg-slate-950/80 p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">{user.name}</p>
                      <p className="mt-1 text-sm text-slate-400">{user.email}</p>
                    </div>
                    <span className="rounded-full bg-slate-800 px-3 py-1 text-sm capitalize text-slate-300">{user.role}</span>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="glass-card rounded-[32px] border border-white/10 p-8 shadow-glass">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-2xl font-semibold">Recent properties</h2>
              <button type="button" onClick={() => setActiveTab('properties')} className="text-sm text-blue-300 hover:text-white">Manage listings</button>
            </div>
            <div className="mt-6 space-y-4">
              {properties.length === 0 ? (
                <p className="text-slate-400">No properties listed yet.</p>
              ) : properties.slice(0, 5).map((property) => (
                <article key={property._id} className="rounded-3xl border border-white/10 bg-slate-950/80 p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <Link to={`/property/${property._id}`} className="font-semibold hover:text-blue-200">{property.title}</Link>
                      <p className="mt-1 text-sm text-slate-400">{property.area}, {property.city} · ₹{property.rent}/month</p>
                      <p className="mt-1 text-sm text-slate-400">Owner: {property.owner?.name || 'Unknown'}</p>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-sm ${property.verified ? 'bg-emerald-500/10 text-emerald-300' : 'bg-amber-500/10 text-amber-200'}`}>
                      {property.verified ? 'Verified' : 'Needs review'}
                    </span>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </div>
      )}

      {activeTab !== 'overview' && (
        <div className="mt-8">
          <div className="mb-6 flex flex-col gap-3 sm:flex-row">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={
                activeTab === 'users'
                  ? 'Search users by name or email'
                  : activeTab === 'properties'
                    ? 'Search listings by title, location, or owner'
                    : 'Search bookings by student, property, or owner'
              }
              aria-label={`Search ${activeTab}`}
              className="min-w-0 flex-1 rounded-3xl border border-white/10 bg-slate-950/80 px-5 py-3 text-white outline-none placeholder:text-slate-500 focus:border-blue-400"
            />
            {activeTab === 'users' && (
              <select value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)} aria-label="Filter users by role" className="rounded-3xl border border-white/10 bg-slate-950 px-5 py-3 text-white">
                <option value="all">All roles</option>
                <option value="student">Students</option>
                <option value="owner">Owners</option>
                <option value="admin">Admins</option>
              </select>
            )}
            {activeTab === 'properties' && (
              <select value={propertyFilter} onChange={(event) => setPropertyFilter(event.target.value)} aria-label="Filter properties by verification" className="rounded-3xl border border-white/10 bg-slate-950 px-5 py-3 text-white">
                <option value="all">All listings</option>
                <option value="false">Needs review</option>
                <option value="true">Verified</option>
              </select>
            )}
            {activeTab === 'bookings' && (
              <select value={bookingFilter} onChange={(event) => setBookingFilter(event.target.value)} aria-label="Filter bookings by status" className="rounded-3xl border border-white/10 bg-slate-950 px-5 py-3 text-white">
                <option value="all">All statuses</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="cancelled">Cancelled</option>
              </select>
            )}
          </div>

          {activeTab === 'users' && (
            <div className="grid gap-4 md:grid-cols-2">
              {filteredUsers.length === 0 ? (
                <p className="text-slate-400">No users match these filters.</p>
              ) : filteredUsers.map((user) => (
                <article key={user._id} className="glass-card rounded-3xl border border-white/10 p-6">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="text-lg font-semibold">{user.name}</h2>
                      <a className="mt-2 block text-slate-300 hover:text-white" href={`mailto:${user.email}`}>{user.email}</a>
                    </div>
                    <span className="rounded-full bg-blue-500/10 px-3 py-1 text-sm capitalize text-blue-200">{user.role}</span>
                  </div>
                  <p className="mt-4 text-sm text-slate-400">Joined {formatDate(user.createdAt)}</p>
                </article>
              ))}
            </div>
          )}

          {activeTab === 'properties' && (
            <div className="grid gap-5 xl:grid-cols-2">
              {filteredProperties.length === 0 ? (
                <p className="text-slate-400">No properties match these filters.</p>
              ) : filteredProperties.map((property) => (
                <article key={property._id} className="glass-card rounded-3xl border border-white/10 p-6">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <Link to={`/property/${property._id}`} className="text-xl font-semibold hover:text-blue-200">{property.title}</Link>
                      <p className="mt-2 text-slate-300">{property.area}, {property.city}</p>
                      <p className="mt-1 text-sm capitalize text-slate-400">{property.category} · ₹{property.rent}/month</p>
                      <p className="mt-2 text-sm text-slate-400">Owner: {property.owner?.name || 'Unknown'}{property.owner?.email ? ` (${property.owner.email})` : ''}</p>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-sm ${property.verified ? 'bg-emerald-500/10 text-emerald-300' : 'bg-amber-500/10 text-amber-200'}`}>
                      {property.verified ? 'Verified' : 'Needs review'}
                    </span>
                  </div>
                  <p className="mt-4 line-clamp-3 text-sm text-slate-400">{property.description}</p>
                  <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                    <p className="text-sm text-slate-500">Listed {formatDate(property.createdAt)}</p>
                    <button
                      type="button"
                      onClick={() => handleVerification(property)}
                      disabled={updatingPropertyId === property._id}
                      className="rounded-full border border-white/10 px-4 py-2 text-sm text-slate-200 transition hover:border-blue-400 hover:text-white disabled:cursor-wait disabled:opacity-50"
                    >
                      {updatingPropertyId === property._id ? 'Updating...' : property.verified ? 'Remove verification' : 'Verify listing'}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}

          {activeTab === 'bookings' && (
            <div className="space-y-4">
              {filteredBookings.length === 0 ? (
                <p className="text-slate-400">No bookings match these filters.</p>
              ) : filteredBookings.map((booking) => (
                <article key={booking._id} className="glass-card rounded-3xl border border-white/10 p-6">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <h2 className="text-lg font-semibold">{booking.property?.title || 'Property unavailable'}</h2>
                      <p className="mt-1 text-sm text-slate-400">{[booking.property?.area, booking.property?.city].filter(Boolean).join(', ') || 'Location unavailable'}</p>
                    </div>
                    <span className="rounded-full bg-blue-500/10 px-3 py-1 text-sm capitalize text-blue-200">{booking.status}</span>
                  </div>
                  <div className="mt-5 grid gap-3 text-sm text-slate-300 sm:grid-cols-2 lg:grid-cols-4">
                    <p>Student: {booking.student?.name || 'Unknown'}{booking.student?.email ? ` · ${booking.student.email}` : ''}</p>
                    <p>Owner: {booking.owner?.name || 'Unknown'}</p>
                    <p>Check-in: {formatDate(booking.checkIn)}</p>
                    <p>Check-out: {formatDate(booking.checkOut)}</p>
                    <p>Total: ₹{booking.totalPrice}</p>
                    <p className="capitalize">Payment: {booking.paymentStatus}</p>
                    <p>Requested: {formatDate(booking.createdAt)}</p>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
};

export default AdminDashboardPage;
