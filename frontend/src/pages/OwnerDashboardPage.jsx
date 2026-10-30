import { useEffect, useState } from 'react';
import { getOwnerDashboard, getOwnerProperties, getOwnerBookingRequests } from '../api/ownerApi.js';
import Loader from '../components/Loader.jsx';
import PropertyCard from '../components/PropertyCard.jsx';

const OwnerDashboardPage = () => {
  const [dashboard, setDashboard] = useState(null);
  const [properties, setProperties] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [dashboardRes, propertiesRes, requestsRes] = await Promise.all([
          getOwnerDashboard(),
          getOwnerProperties(),
          getOwnerBookingRequests()
        ]);
        setDashboard(dashboardRes.data);
        setProperties(propertiesRes.data.properties);
        setRequests(requestsRes.data.requests);
      } catch (requestError) {
        setError(requestError.response?.data?.message || 'Unable to load the owner dashboard. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <section className="mx-auto max-w-7xl px-6 py-24">
        <Loader message="Loading owner dashboard..." />
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
      <div className="grid gap-8 lg:grid-cols-[1fr_1fr_1fr]">
        <div className="glass-card rounded-[32px] p-8 shadow-glass">
          <p className="text-sm uppercase tracking-[0.2em] text-slate-400">Properties</p>
          <h2 className="mt-4 text-4xl font-semibold">{dashboard.propertyCount}</h2>
        </div>
        <div className="glass-card rounded-[32px] p-8 shadow-glass">
          <p className="text-sm uppercase tracking-[0.2em] text-slate-400">Pending Bookings</p>
          <h2 className="mt-4 text-4xl font-semibold">{dashboard.bookingCount}</h2>
        </div>
        <div className="glass-card rounded-[32px] p-8 shadow-glass">
          <p className="text-sm uppercase tracking-[0.2em] text-slate-400">Earnings</p>
          <h2 className="mt-4 text-4xl font-semibold">₹{dashboard.earnings}</h2>
        </div>
      </div>

      <div className="mt-12 grid gap-8 xl:grid-cols-2">
        <div className="glass-card rounded-[32px] p-8 shadow-glass">
          <h3 className="text-2xl font-semibold">Your Properties</h3>
          <div className="mt-6 space-y-4">
            {properties.length === 0 ? (
              <p className="text-slate-400">You have not listed any properties yet.</p>
            ) : (
              properties.map((property) => <PropertyCard key={property._id} property={property} />)
            )}
          </div>
        </div>

        <div className="glass-card rounded-[32px] p-8 shadow-glass">
          <h3 className="text-2xl font-semibold">Recent Booking Requests</h3>
          <div className="mt-6 space-y-4">
            {requests.length === 0 ? (
              <p className="text-slate-400">No pending booking requests.</p>
            ) : (
              requests.map((booking) => (
                <div key={booking._id} className="rounded-3xl border border-white/10 bg-slate-950/80 p-6">
                  <p className="font-semibold text-white">{booking.student?.name}</p>
                  <p className="mt-2 text-slate-300">Property: {booking.property?.title}</p>
                  <p className="mt-2 text-slate-400">Check-in: {new Date(booking.checkIn).toLocaleDateString()}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default OwnerDashboardPage;
