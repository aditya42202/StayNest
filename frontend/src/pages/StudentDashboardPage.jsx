import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import apiClient from '../api/apiClient.js';
import Loader from '../components/Loader.jsx';

const StudentDashboardPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [paymentNotice, setPaymentNotice] = useState('');
  const [paymentError, setPaymentError] = useState('');
  const [payingBookingId, setPayingBookingId] = useState('');

  const startRentPayment = async (booking) => {
    setPayingBookingId(booking._id);
    setPaymentError('');
    setPaymentNotice('');
    try {
      const { data } = await apiClient.post('/payments/checkout', { bookingId: booking._id });
      if (!data.url) throw new Error('Stripe checkout URL was not returned');
      window.location.assign(data.url);
    } catch (requestError) {
      setPaymentError(requestError.response?.data?.message || 'Unable to start rent payment. Please try again.');
      setPayingBookingId('');
    }
  };

  const cancelBooking = async (bookingId) => {
    try {
      const { data } = await apiClient.put(`/bookings/${bookingId}/status`, { status: 'cancelled' });
      setBookings((current) => current.map((booking) => (
        booking._id === bookingId ? { ...booking, ...data } : booking
      )));
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to cancel the booking.');
    }
  };

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

  useEffect(() => {
    if (loading) return;
    const sessionId = searchParams.get('session_id');
    const paymentResult = searchParams.get('payment');
    if (paymentResult === 'cancelled') {
      setPaymentNotice('Payment was cancelled. Your booking is still unpaid.');
      setSearchParams({}, { replace: true });
      return;
    }
    if (!sessionId) return;

    let active = true;
    const confirmPayment = async () => {
      setPaymentError('');
      try {
        const { data } = await apiClient.post(`/payments/checkout/${encodeURIComponent(sessionId)}/confirm`);
        if (!active) return;
        if (data.paymentStatus === 'paid' || data.paymentStatus === 'partial') {
          setBookings((current) => current.map((booking) => (
            booking._id === data.bookingId
              ? {
                ...booking,
                paymentStatus: data.paymentStatus,
                amountPaid: data.amountPaid,
                nextPaymentAmount: data.nextPaymentAmount,
                nextPaymentDueAt: data.nextPaymentDueAt
              }
              : booking
          )));
          setPaymentNotice(data.paymentStatus === 'paid'
            ? 'Rent payment confirmed. The full stay is paid.'
            : 'Installment received. The remaining balance is shown in your bookings.');
        } else {
          setPaymentNotice('Payment is being confirmed. Refresh your bookings shortly.');
        }
      } catch (requestError) {
        if (active) setPaymentError(requestError.response?.data?.message || 'Unable to confirm payment status. Please refresh your bookings.');
      } finally {
        if (active) setSearchParams({}, { replace: true });
      }
    };
    confirmPayment();
    return () => { active = false; };
  }, [loading, searchParams, setSearchParams]);

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

      {paymentNotice && <p role="status" className="mt-6 rounded-2xl border border-emerald-400/30 bg-emerald-500/10 p-4 text-emerald-200">{paymentNotice}</p>}
      {paymentError && <p role="alert" className="mt-6 rounded-2xl border border-rose-400/30 bg-rose-500/10 p-4 text-rose-200">{paymentError}</p>}

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
                <p>{booking.status === 'pending' ? 'Estimated rate' : 'Stay total'}: ₹{booking.totalPrice}</p>
                <p className="capitalize">Billing: {booking.billingUnit || 'month'} · {booking.paymentPlan || 'upfront'}</p>
                <p className="capitalize">Payment: {booking.paymentStatus}</p>
                {booking.amountPaid > 0 && <p>Paid so far: ₹{booking.amountPaid}</p>}
                {booking.paymentStatus === 'partial' && <p>Next installment: ₹{booking.nextPaymentAmount} · Due {booking.nextPaymentDueAt ? new Date(booking.nextPaymentDueAt).toLocaleString() : 'soon'}</p>}
              </div>
              {booking.status === 'pending' && <p className="mt-4 text-sm text-slate-400">Payment is available after the owner approves your booking.</p>}
              {booking.status === 'approved' && booking.paymentStatus !== 'paid' && (
                <button
                  type="button"
                  disabled={payingBookingId === booking._id || (
                    booking.paymentPlan === 'installments'
                    && booking.amountPaid > 0
                    && booking.nextPaymentDueAt
                    && new Date(booking.nextPaymentDueAt) > new Date()
                  )}
                  onClick={() => startRentPayment(booking)}
                  className="mt-5 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-wait disabled:opacity-50"
                >
                  {payingBookingId === booking._id
                    ? 'Opening secure checkout...'
                    : booking.paymentPlan === 'installments' && booking.amountPaid > 0 && booking.nextPaymentDueAt && new Date(booking.nextPaymentDueAt) > new Date()
                      ? `Next installment due ${new Date(booking.nextPaymentDueAt).toLocaleString()}`
                      : `Pay rent · ₹${booking.nextPaymentAmount || booking.totalPrice}`}
                </button>
              )}
              {booking.status === 'pending' && (
                <button
                  type="button"
                  onClick={() => cancelBooking(booking._id)}
                  className="mt-5 rounded-2xl border border-rose-400/40 px-4 py-2 text-sm text-rose-200 hover:bg-rose-500/10"
                >
                  Cancel booking
                </button>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  );
};

export default StudentDashboardPage;
