import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '../api/apiClient.js';
import Loader from '../components/Loader.jsx';

const StudentDashboardPage = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchBookings = async () => {
      try {
        const { data } = await apiClient.get('/bookings/me');
        setBookings(data.bookings);
      } catch (requestError) {
        setError(requestError.response?.data?.message || 'Unable to load your bookings. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchBookings();
  }, []);

  if (loading) {
    return (
      <section className="mx-auto max-w-7xl px-6 pb-24 pt-4">
        <Loader message="Loading student dashboard..." />
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-7xl px-6 pb-24 pt-4 text-white">
      <div className="glass-card rounded-[32px] border border-white/10 p-10 shadow-glass">
        <p className="text-sm uppercase tracking-[0.24em] text-blue-300">Student dashboard</p>
        <h1 className="mt-2 text-4xl font-semibold">Your bookings</h1>
        <p className="mt-3 text-slate-300">Track your booking requests and stay details.</p>
      </div>

      {error ? (
        <div role="alert" className="mt-8 rounded-3xl border border-rose-400/30 bg-rose-500/10 p-6 text-rose-200">
          {error}
        </div>
      ) : bookings.length === 0 ? (
        <div className="mt-8 rounded-[32px] border border-white/10 bg-slate-950/80 p-10 text-center">
          <p className="text-slate-300">You have not made any booking requests yet.</p>
          <Link to="/search" className="mt-5 inline-flex rounded-3xl bg-gradient-to-r from-blue-500 to-purple-600 px-6 py-3 font-semibold text-white">
            Find a place to stay
          </Link>
        </div>
      ) : (
        <div className="mt-8 space-y-5">
          {bookings.map((booking) => (
            <article key={booking._id} className="rounded-[32px] border border-white/10 bg-slate-950/80 p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  {booking.property?._id ? (
                    <Link to={`/property/${booking.property._id}`} className="text-2xl font-semibold text-white hover:text-blue-200">
                      {booking.property.title}
                    </Link>
                  ) : (
                    <h2 className="text-2xl font-semibold text-white">{booking.property?.title || 'Property details unavailable'}</h2>
                  )}
                  <p className="mt-2 text-slate-400">
                    {[booking.property?.area, booking.property?.city].filter(Boolean).join(', ') || 'Location unavailable'}
                  </p>
                </div>
                <span className="rounded-full bg-blue-500/10 px-4 py-2 text-sm capitalize text-blue-200">
                  {booking.status}
                </span>
              </div>
              <div className="mt-5 grid gap-3 text-sm text-slate-300 sm:grid-cols-3">
                <p>Room: {booking.room?.name || 'Not specified'}</p>
                <p>Check-in: {booking.checkIn ? new Date(booking.checkIn).toLocaleDateString() : 'Not specified'}</p>
                <p>Check-out: {booking.checkOut ? new Date(booking.checkOut).toLocaleDateString() : 'Not specified'}</p>
                <p>Total: ₹{booking.totalPrice}</p>
                <p className="capitalize">Payment: {booking.paymentStatus}</p>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
};

export default StudentDashboardPage;
