import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import apiClient from '../api/apiClient.js';
import { addToWishlist, createBooking, getWishlist, removeFromWishlist } from '../api/propertyApi.js';

const PropertyDetailsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const user = useSelector((state) => state.auth.user);
  const [property, setProperty] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [wishlistLoading, setWishlistLoading] = useState(false);
  const [wishlistError, setWishlistError] = useState('');
  const [bookingOpen, setBookingOpen] = useState(false);
  const [bookingDates, setBookingDates] = useState({ roomId: '', billingUnit: 'month', paymentPlan: 'upfront' });
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingMessage, setBookingMessage] = useState('');
  const [bookingError, setBookingError] = useState('');
  const [reviewRating, setReviewRating] = useState('5');
  const [reviewComment, setReviewComment] = useState('');
  const [reviewMessage, setReviewMessage] = useState('');

  const submitReview = async (event) => {
    event.preventDefault();
    setReviewMessage('');
    try {
      const { data } = await apiClient.post(`/properties/${id}/reviews`, {
        rating: Number(reviewRating),
        comment: reviewComment
      });
      setProperty((current) => ({
        ...current,
        reviews: [...(current.reviews || []), data]
      }));
      setReviewComment('');
      setReviewMessage('Review submitted successfully.');
    } catch (requestError) {
      setReviewMessage(requestError.response?.data?.message || 'Unable to submit your review.');
    }
  };

  useEffect(() => {
    let active = true;
    const fetchProperty = async () => {
      setLoading(true);
      setProperty(null);
      setError('');
      try {
        const { data } = await apiClient.get(`/properties/${id}`);
        if (active) setProperty(data);
      } catch (requestError) {
        if (active) {
          setError(
            requestError.response?.status === 404
              ? 'This property could not be found. It may have been removed.'
              : requestError.response?.data?.message || 'Unable to load this property. Please try again.'
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    };
    fetchProperty();
    return () => {
      active = false;
    };
  }, [id]);

  useEffect(() => {
    let active = true;
    if (!user) {
      setIsWishlisted(false);
      return () => {
        active = false;
      };
    }

    getWishlist()
      .then(({ data }) => {
        if (active) {
          setIsWishlisted(data.wishlist.some((item) => (item._id || item) === id));
          setWishlistError('');
        }
      })
      .catch((requestError) => {
        if (active) {
          setWishlistError(requestError.response?.data?.message || 'Unable to load your wishlist status.');
        }
      });

    return () => {
      active = false;
    };
  }, [id, user]);

  const handleWishlist = async () => {
    if (!user) {
      navigate('/login');
      return;
    }

    setWishlistLoading(true);
    setWishlistError('');
    try {
      if (isWishlisted) {
        await removeFromWishlist(id);
        setIsWishlisted(false);
      } else {
        await addToWishlist(id);
        setIsWishlisted(true);
      }
    } catch (requestError) {
      setWishlistError(requestError.response?.data?.message || 'Unable to update your wishlist. Please try again.');
    } finally {
      setWishlistLoading(false);
    }
  };

  const handleBookingClick = () => {
    setBookingError('');
    setBookingMessage('');
    if (!user) {
      navigate('/login');
      return;
    }
    if (user.role !== 'user' && user.role !== 'student') {
      setBookingError('Only tenant accounts can book a property.');
      return;
    }
    setBookingOpen((open) => !open);
  };

  const handleBookingSubmit = async (event) => {
    event.preventDefault();
    setBookingLoading(true);
    setBookingError('');
    setBookingMessage('');

    try {
      const { data } = await createBooking({
        propertyId: id,
        roomId: bookingDates.roomId || undefined,
        billingUnit: bookingDates.billingUnit,
        paymentPlan: bookingDates.paymentPlan
      });
      setBookingMessage(data.message || 'Booking request sent to the property owner.');
      setBookingOpen(false);
      setBookingDates({ roomId: '', billingUnit: 'month', paymentPlan: 'upfront' });
    } catch (requestError) {
      setBookingError(requestError.response?.data?.message || 'Unable to send your booking request. Please try again.');
    } finally {
      setBookingLoading(false);
    }
  };

  if (loading) {
    return <section className="mx-auto max-w-7xl px-6 pb-24 pt-4 text-white">Loading property details…</section>;
  }

  if (!property) {
    return (
      <section className="mx-auto max-w-7xl px-6 pb-24 pt-4 text-white">
        <div role="alert" className="rounded-3xl border border-white/10 bg-slate-950/80 p-8">
          <p>{error || 'Property details are unavailable.'}</p>
        </div>
      </section>
    );
  }

  const gallery = property.images && property.images.length > 0 ? property.images : [
    'https://images.unsplash.com/photo-1586023492124-44b5f77b4c0c?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=1200&q=80'
  ];
  const selectedRoom = property.rooms?.find((room) => room._id === bookingDates.roomId);
  const monthlyRate = selectedRoom?.price || property.rent;
  const dailyRate = property.rentPerDay || monthlyRate / 30;
  const hourlyRate = property.rentPerHour || dailyRate / 24;
  const rentalRates = { hour: hourlyRate, day: dailyRate, month: monthlyRate, year: monthlyRate * 12 };

  return (
    <section className="mx-auto max-w-7xl px-6 pb-24 pt-4 text-white">
      <div className="grid gap-10 lg:grid-cols-[1.5fr_0.9fr]">
        <div className="space-y-8">
          <div className="grid gap-4 lg:grid-cols-[1.4fr_0.6fr]">
            <div className="rounded-[32px] overflow-hidden bg-slate-900 shadow-glass">
              <img src={gallery[0]} alt={property.title} className="h-full w-full object-cover" />
            </div>
            <div className="grid gap-4">
              {gallery.slice(1, 5).map((image, index) => (
                <div key={index} className="overflow-hidden rounded-[28px] bg-slate-900 shadow-glass">
                  <img src={image} alt={`${property.title} ${index + 2}`} className="h-36 w-full object-cover" />
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[32px] bg-slate-950/80 p-10 shadow-glass">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h1 className="text-4xl font-semibold">{property.title}</h1>
                <p className="mt-2 text-slate-400">{property.area}, {property.city}, {property.college || 'Nearby College'}</p>
              </div>
              <div className="rounded-3xl bg-slate-900 px-5 py-3 text-sm text-slate-200">
                {property.rating ? Number(property.rating).toFixed(1) : 'New'} ★ ({property.reviews?.length || 0} Reviews)
              </div>
            </div>

            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              <div className="rounded-[28px] bg-slate-900/80 p-6">
                <p className="text-sm text-slate-400">Rent rates</p>
                <p className="mt-2 text-xl font-semibold text-white">₹{monthlyRate}/month</p>
                <p className="mt-1 text-sm text-slate-400">₹{dailyRate.toFixed(2)}/day · ₹{hourlyRate.toFixed(2)}/hour</p>
              </div>
              <div className="rounded-[28px] bg-slate-900/80 p-6">
                <p className="text-sm text-slate-400">Deposit</p>
                <p className="mt-2 text-3xl font-semibold text-white">₹{property.deposit || 0}</p>
              </div>
            </div>

            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              {['WiFi', 'Food', 'Laundry', 'CCTV', 'Parking', 'Attached Bathroom', 'Furnished'].map((item) => (
                <span key={item} className="rounded-3xl border border-white/10 bg-slate-900/80 px-4 py-3 text-sm text-slate-300">{item}</span>
              ))}
            </div>

            <div className="mt-10 rounded-[28px] bg-slate-900/80 p-6">
              <h2 className="text-2xl font-semibold">About Property</h2>
              <p className="mt-4 leading-8 text-slate-300">{property.description || 'A comfortable PG with all modern amenities. Food included, WiFi, laundry, housekeeping, CCTV surveillance and 24x7 security.'}</p>
            </div>
          </div>
        </div>

        <aside className="space-y-6">
          <div className="rounded-[32px] bg-slate-900/90 p-8 shadow-glass">
            <h2 className="text-2xl font-semibold">Owner Details</h2>
            <div className="mt-6 space-y-3">
              <p className="text-lg font-semibold text-white">{property.owner?.name || 'Owner details unavailable'}</p>
              <p className="text-slate-400">{property.verified ? 'Verified Owner' : 'Verification pending'}</p>
              {property.owner?.email && <a className="block text-slate-300 hover:text-white" href={`mailto:${property.owner.email}`}>{property.owner.email}</a>}
              {property.owner?.phone && <a className="block text-slate-300 hover:text-white" href={`tel:${property.owner.phone}`}>{property.owner.phone}</a>}
              <a href={`mailto:${property.owner?.email || ''}?subject=${encodeURIComponent(`Question about ${property.title}`)}`} className="mt-6 block w-full rounded-3xl bg-gradient-to-r from-blue-500 to-purple-600 px-5 py-3 text-center text-sm font-semibold text-white shadow-lg shadow-blue-500/20 hover:opacity-95">
                Chat with Owner
              </a>
            </div>
          </div>

          <div className="rounded-[32px] bg-slate-900/90 p-8 shadow-glass">
            <h2 className="text-2xl font-semibold">Nearby Places</h2>
            <div className="mt-6 space-y-4 text-slate-300">
              {['College • 1.2 km', 'Metro Station • 850 m', 'Bus Stand • 1.4 km', 'Hospital • 2.1 km'].map((item) => (
                <div key={item} className="rounded-3xl border border-white/10 bg-slate-950/80 px-4 py-4">{item}</div>
              ))}
            </div>
          </div>

          <div className="rounded-[32px] bg-gradient-to-br from-blue-500 to-purple-600 p-8 text-white shadow-glass">
            <h2 className="text-2xl font-semibold">Book Now</h2>
            <p className="mt-4 text-slate-100">Send a booking request to the owner. The estimated price is charged in 30-day periods.</p>
            <div className="mt-6 space-y-3">
              <button
                type="button"
                onClick={handleBookingClick}
                disabled={!property.available}
                className="w-full rounded-3xl bg-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {property.available ? 'Book Now' : 'Currently unavailable'}
              </button>
              <button
                type="button"
                onClick={handleWishlist}
                disabled={wishlistLoading}
                className="w-full rounded-3xl bg-white/20 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/30 disabled:cursor-wait disabled:opacity-50"
              >
                {wishlistLoading ? 'Updating...' : isWishlisted ? 'Remove from Wishlist' : 'Add to Wishlist'}
              </button>
            </div>
            {wishlistError && <p role="alert" className="mt-3 text-sm text-rose-100">{wishlistError}</p>}
            {bookingMessage && <p role="status" className="mt-3 rounded-2xl bg-emerald-500/20 p-3 text-sm text-white">{bookingMessage} Track it from your dashboard.</p>}
            {bookingError && <p role="alert" className="mt-3 text-sm text-rose-100">{bookingError}</p>}
            {bookingOpen && (
              <form onSubmit={handleBookingSubmit} className="mt-5 space-y-4 rounded-3xl bg-slate-950/30 p-5">
                {property.rooms?.some((room) => room.available) && (
                  <label className="block text-sm text-white">
                    Room
                    <select
                      value={bookingDates.roomId}
                      onChange={(event) => setBookingDates((current) => ({ ...current, roomId: event.target.value }))}
                      className="mt-2 w-full rounded-2xl border border-white/20 bg-slate-950 px-4 py-3 text-white"
                    >
                      <option value="">Property booking (no specific room)</option>
                      {property.rooms.filter((room) => room.available).map((room) => (
                        <option key={room._id} value={room._id}>{room.name} · ₹{room.price}/month</option>
                      ))}
                    </select>
                  </label>
                )}
                <label className="block text-sm text-white">
                  Billing period
                  <select
                    value={bookingDates.billingUnit}
                    onChange={(event) => setBookingDates((current) => ({ ...current, billingUnit: event.target.value }))}
                    className="mt-2 w-full rounded-2xl border border-white/20 bg-slate-950 px-4 py-3 text-white"
                  >
                    <option value="hour">Hourly · ₹{hourlyRate.toFixed(2)}/hour</option>
                    <option value="day">Daily · ₹{dailyRate.toFixed(2)}/day</option>
                    <option value="month">Monthly · ₹{monthlyRate}/month</option>
                    <option value="year">Yearly · ₹{(monthlyRate * 12).toFixed(2)}/year</option>
                  </select>
                </label>
                <label className="block text-sm text-white">
                  Payment plan
                  <select
                    value={bookingDates.paymentPlan}
                    onChange={(event) => setBookingDates((current) => ({ ...current, paymentPlan: event.target.value }))}
                    className="mt-2 w-full rounded-2xl border border-white/20 bg-slate-950 px-4 py-3 text-white"
                  >
                    <option value="upfront">Pay full stay upfront</option>
                    <option value="installments">Pay in manual installments</option>
                  </select>
                </label>
                <p className="text-sm text-white">The owner confirms your exact start/end time. Rent is calculated from that duration using the selected rate. Installments are paid manually when due.</p>
                <button type="submit" disabled={bookingLoading} className="w-full rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-blue-700 disabled:cursor-wait disabled:opacity-60">
                  {bookingLoading ? 'Sending request...' : 'Send booking request'}
                </button>
                <button type="button" onClick={() => setBookingOpen(false)} className="w-full py-2 text-sm text-white/80 hover:text-white">Cancel</button>
              </form>
            )}
          </div>
          {(user?.role === 'user' || user?.role === 'student') && (
            <form onSubmit={submitReview} className="rounded-[32px] bg-slate-900/90 p-8 shadow-glass">
              <h2 className="text-2xl font-semibold">Write a review</h2>
              <label className="mt-5 block text-sm text-slate-300">
                Rating
                <select value={reviewRating} onChange={(event) => setReviewRating(event.target.value)} className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-white">
                  {[5, 4, 3, 2, 1].map((rating) => <option key={rating} value={rating}>{rating} stars</option>)}
                </select>
              </label>
              <textarea value={reviewComment} onChange={(event) => setReviewComment(event.target.value)} maxLength={1000} placeholder="Share your experience" className="mt-4 w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-white" />
              {reviewMessage && <p className="mt-3 text-sm text-blue-200">{reviewMessage}</p>}
              <button type="submit" className="mt-4 rounded-2xl bg-blue-500 px-5 py-3 text-sm font-semibold">Submit review</button>
            </form>
          )}
        </aside>
      </div>
    </section>
  );
};

export default PropertyDetailsPage;
