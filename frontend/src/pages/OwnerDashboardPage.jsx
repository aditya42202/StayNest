import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  getOwnerBookings,
  getOwnerDashboard,
  getOwnerProperties,
  getOwnerBookingRequests,
  verifyBookingRequest
} from '../api/ownerApi.js';
import { createProperty, deleteProperty, updateProperty } from '../api/propertyApi.js';
import Loader from '../components/Loader.jsx';

const categories = [
  'boys pg', 'girls pg', 'hostel', 'shared room', 'private room', 'flat', 'house',
  'hotel', 'homestay', 'guest house', 'apartment', 'student room', 'hourly stay room',
  'one-day stay room', 'monthly rental property'
];
const tabs = [
  { id: 'overview', label: 'Overview' },
  { id: 'properties', label: 'My properties' },
  { id: 'bookings', label: 'Bookings' },
  { id: 'availability', label: 'Manage availability' }
];

const emptyPropertyForm = () => ({
  title: '',
  description: '',
  category: 'boys pg',
  city: '',
  area: '',
  college: '',
  landmark: '',
  address: '',
  rent: '',
  rentPerDay: '',
  rentPerHour: '',
  deposit: '',
  amenities: '',
  images: '',
  lat: '',
  lng: ''
});

const dateLabel = (value) => (value ? new Date(value).toLocaleString() : 'Not specified');

const OwnerDashboardPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [dashboard, setDashboard] = useState(null);
  const [properties, setProperties] = useState([]);
  const [requests, setRequests] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(() => (
    tabs.some((tab) => tab.id === searchParams.get('tab')) ? searchParams.get('tab') : 'overview'
  ));
  const [error, setError] = useState('');
  const [actionMessage, setActionMessage] = useState('');
  const [actionError, setActionError] = useState('');
  const [busyBookingId, setBusyBookingId] = useState('');
  const [busyPropertyId, setBusyPropertyId] = useState('');
  const [showPropertyForm, setShowPropertyForm] = useState(false);
  const [editingPropertyId, setEditingPropertyId] = useState('');
  const [propertyForm, setPropertyForm] = useState(emptyPropertyForm);
  const [savingProperty, setSavingProperty] = useState(false);

  const pendingBookings = useMemo(
    () => bookings.filter((booking) => booking.status === 'pending'),
    [bookings]
  );

  const fetchData = async () => {
    setError('');
    const [dashboardRes, propertiesRes, requestsRes, bookingsRes] = await Promise.all([
      getOwnerDashboard(),
      getOwnerProperties(),
      getOwnerBookingRequests(),
      getOwnerBookings()
    ]);
    setDashboard(dashboardRes.data);
    setProperties(propertiesRes.data.properties);
    setRequests(requestsRes.data.requests);
    setBookings(bookingsRes.data.bookings);
  };

  useEffect(() => {
    const requestedTab = searchParams.get('tab');
    if (tabs.some((tab) => tab.id === requestedTab)) setActiveTab(requestedTab);
  }, [searchParams]);

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        await fetchData();
      } catch (requestError) {
        setError(requestError.response?.data?.message || 'Unable to load the owner dashboard. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, []);

  const beginCreate = () => {
    setEditingPropertyId('');
    setPropertyForm(emptyPropertyForm());
    setActiveTab('properties');
    setSearchParams({ tab: 'properties' }, { replace: true });
    setShowPropertyForm(true);
    setActionError('');
    setActionMessage('');
  };

  const beginEdit = (property) => {
    setEditingPropertyId(property._id);
    setPropertyForm({
      title: property.title || '',
      description: property.description || '',
      category: property.category || 'boys pg',
      city: property.city || '',
      area: property.area || '',
      college: property.college || '',
      landmark: property.landmark || '',
      address: property.address || '',
      rent: property.rent ?? '',
      rentPerDay: property.rentPerDay ?? '',
      rentPerHour: property.rentPerHour ?? '',
      deposit: property.deposit ?? '',
      amenities: (property.amenities || []).join(', '),
      images: (property.images || []).join('\n'),
      lat: property.mapLocation?.lat ?? '',
      lng: property.mapLocation?.lng ?? ''
    });
    setShowPropertyForm(true);
    setActionError('');
    setActionMessage('');
    setActiveTab('properties');
  };

  const handlePropertyChange = (event) => {
    setPropertyForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  };

  const handlePropertySubmit = async (event) => {
    event.preventDefault();
    setSavingProperty(true);
    setActionError('');
    setActionMessage('');

    const payload = {
      ...propertyForm,
      rent: Number(propertyForm.rent),
      rentPerDay: propertyForm.rentPerDay === '' ? null : Number(propertyForm.rentPerDay),
      rentPerHour: propertyForm.rentPerHour === '' ? null : Number(propertyForm.rentPerHour),
      deposit: Number(propertyForm.deposit || 0),
      amenities: propertyForm.amenities.split(',').map((item) => item.trim()).filter(Boolean),
      images: propertyForm.images.split(/\r?\n/).map((item) => item.trim()).filter(Boolean),
      lat: propertyForm.lat === '' ? undefined : Number(propertyForm.lat),
      lng: propertyForm.lng === '' ? undefined : Number(propertyForm.lng),
      mapLocation: {
        lat: propertyForm.lat === '' ? undefined : Number(propertyForm.lat),
        lng: propertyForm.lng === '' ? undefined : Number(propertyForm.lng)
      }
    };

    try {
      if (editingPropertyId) {
        const { data } = await updateProperty(editingPropertyId, payload);
        setProperties((current) => current.map((property) => property._id === data._id ? data : property));
        setActionMessage('Property details updated.');
      } else {
        const { data } = await createProperty(payload);
        setProperties((current) => [data, ...current]);
        setDashboard((current) => ({ ...current, propertyCount: current.propertyCount + 1 }));
        setActionMessage('Property listed successfully.');
      }
      setShowPropertyForm(false);
      setEditingPropertyId('');
      setPropertyForm(emptyPropertyForm());
    } catch (requestError) {
      setActionError(requestError.response?.data?.message || 'Unable to save this property. Please check the details and try again.');
    } finally {
      setSavingProperty(false);
    }
  };

  const handleDeleteProperty = async (property) => {
    if (!window.confirm(`Delete "${property.title}"? Properties with booking history cannot be deleted.`)) {
      return;
    }

    setBusyPropertyId(property._id);
    setActionError('');
    setActionMessage('');
    try {
      await deleteProperty(property._id);
      setProperties((current) => current.filter((item) => item._id !== property._id));
      setDashboard((current) => ({ ...current, propertyCount: Math.max(0, current.propertyCount - 1) }));
      setActionMessage('Property deleted.');
    } catch (requestError) {
      setActionError(requestError.response?.data?.message || 'Unable to delete this property.');
    } finally {
      setBusyPropertyId('');
    }
  };

  const handleAvailability = async (property) => {
    setBusyPropertyId(property._id);
    setActionError('');
    setActionMessage('');
    try {
      const { data } = await updateProperty(property._id, { available: !property.available });
      setProperties((current) => current.map((item) => item._id === property._id ? data : item));
      setActionMessage(data.available ? 'Property is available for booking.' : 'Property has been marked unavailable.');
    } catch (requestError) {
      setActionError(requestError.response?.data?.message || 'Unable to update property availability.');
    } finally {
      setBusyPropertyId('');
    }
  };

  const handleBookingReview = async (booking, status) => {
    setBusyBookingId(booking._id);
    setActionError('');
    setActionMessage('');
    try {
      const { data } = await verifyBookingRequest(booking._id, status);
      setRequests((current) => current.filter((request) => request._id !== booking._id));
      setBookings((current) => current.map((item) => item._id === booking._id
        ? {
          ...item,
          status: data.status,
          checkIn: data.checkIn,
          checkOut: data.checkOut,
          billingUnit: data.billingUnit,
          paymentPlan: data.paymentPlan,
          totalPrice: data.totalPrice,
          amountPaid: data.amountPaid,
          installmentRate: data.installmentRate,
          nextPaymentAmount: data.nextPaymentAmount,
          nextPaymentDueAt: data.nextPaymentDueAt,
          paymentStatus: data.paymentStatus
        }
        : item));
      setActionMessage(`Booking request ${status}.`);
    } catch (requestError) {
      setActionError(requestError.response?.data?.message || 'Unable to update this booking request.');
    } finally {
      setBusyBookingId('');
    }
  };

  if (loading) {
    return (
      <section className="mx-auto max-w-7xl px-6 pb-24 pt-4">
        <Loader message="Loading owner dashboard..." />
      </section>
    );
  }

  if (error) {
    return (
      <section className="mx-auto max-w-7xl px-6 pb-24 pt-4 text-white">
        <div role="alert" className="rounded-3xl border border-rose-400/30 bg-rose-500/10 p-6 text-rose-200">{error}</div>
        <button type="button" onClick={() => { setLoading(true); fetchData().catch((err) => setError(err.response?.data?.message || 'Unable to load the owner dashboard.')).finally(() => setLoading(false)); }} className="mt-5 rounded-full border border-white/10 px-5 py-2 text-white">
          Try again
        </button>
      </section>
    );
  }

  const stats = [
    { label: 'Properties', value: dashboard.propertyCount },
    { label: 'Total bookings', value: dashboard.bookingCount },
    { label: 'Pending requests', value: pendingBookings.length },
    { label: 'Paid earnings', value: `₹${dashboard.earnings}` }
  ];

  return (
    <section className="mx-auto max-w-7xl px-6 pb-16 pt-4 text-white">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-5">
        <div>
          <p className="text-sm uppercase tracking-[0.24em] text-blue-300">Owner workspace</p>
          <h1 className="mt-2 text-4xl font-semibold">Property dashboard</h1>
          <p className="mt-3 text-slate-400">Manage listings, availability, and booking requests.</p>
        </div>
        <button type="button" onClick={beginCreate} className="rounded-full bg-gradient-to-r from-blue-500 to-purple-600 px-6 py-3 font-semibold text-white shadow-lg shadow-blue-500/20">
          List Your Property
        </button>
      </header>

      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <article key={stat.label} className="glass-card rounded-[28px] border border-white/10 p-7 shadow-glass">
            <p className="text-sm uppercase tracking-[0.18em] text-slate-400">{stat.label}</p>
            <p className="mt-3 text-4xl font-semibold">{stat.value}</p>
          </article>
        ))}
      </div>

      <nav aria-label="Owner dashboard sections" className="mt-10 flex flex-wrap gap-3 border-b border-white/10 pb-4">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => {
              setActiveTab(tab.id);
              setSearchParams({ tab: tab.id }, { replace: true });
            }}
            aria-current={activeTab === tab.id ? 'page' : undefined}
            className={`rounded-full px-5 py-2 text-sm transition ${
              activeTab === tab.id ? 'bg-blue-500 text-white' : 'border border-white/10 bg-slate-950/60 text-slate-300 hover:text-white'
            }`}
          >
            {tab.label}{tab.id === 'bookings' && pendingBookings.length > 0 ? ` (${pendingBookings.length} pending)` : ''}
          </button>
        ))}
      </nav>

      {actionError && (
        <div role="alert" className="mt-6 rounded-3xl border border-rose-400/30 bg-rose-500/10 p-5 text-rose-200">{actionError}</div>
      )}
      {actionMessage && (
        <p role="status" className="mt-6 rounded-3xl border border-emerald-400/30 bg-emerald-500/10 p-5 text-emerald-200">{actionMessage}</p>
      )}

      {activeTab === 'overview' && (
        <div className="mt-8 grid gap-8 xl:grid-cols-2">
          <section className="glass-card rounded-[32px] border border-white/10 p-8 shadow-glass">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-2xl font-semibold">Your properties</h2>
              <button type="button" onClick={() => { setActiveTab('properties'); setSearchParams({ tab: 'properties' }, { replace: true }); }} className="text-sm text-blue-300 hover:text-white">Manage listings</button>
            </div>
            <div className="mt-6 space-y-4">
              {properties.length === 0 ? (
                <div className="rounded-3xl bg-slate-950/80 p-6 text-slate-400">
                  <p>You have not listed any properties yet.</p>
                  <button type="button" onClick={beginCreate} className="mt-4 text-blue-300 hover:text-white">Create your first listing</button>
                </div>
              ) : properties.slice(0, 4).map((property) => (
                <article key={property._id} className="rounded-3xl border border-white/10 bg-slate-950/80 p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <Link to={`/property/${property._id}`} className="font-semibold hover:text-blue-200">{property.title}</Link>
                      <p className="mt-1 text-sm text-slate-400">{property.area}, {property.city} · ₹{property.rent}/month</p>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-xs ${property.available ? 'bg-emerald-500/10 text-emerald-300' : 'bg-slate-700 text-slate-300'}`}>
                      {property.available ? 'Available' : 'Unavailable'}
                    </span>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="glass-card rounded-[32px] border border-white/10 p-8 shadow-glass">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-2xl font-semibold">Pending booking requests</h2>
              <button type="button" onClick={() => setActiveTab('bookings')} className="text-sm text-blue-300 hover:text-white">View bookings</button>
            </div>
            <div className="mt-6 space-y-4">
              {requests.length === 0 ? (
                <p className="text-slate-400">No pending booking requests.</p>
              ) : requests.slice(0, 4).map((booking) => (
                <article key={booking._id} className="rounded-3xl border border-white/10 bg-slate-950/80 p-5">
                  <p className="font-semibold">{booking.student?.name || 'Student'}</p>
                  <p className="mt-1 text-sm text-slate-300">{booking.property?.title || 'Property'}</p>
                  <p className="mt-1 text-sm text-slate-400">{dateLabel(booking.checkIn)} – {dateLabel(booking.checkOut)} · ₹{booking.totalPrice}</p>
                  <div className="mt-4 flex gap-3">
                    <button type="button" disabled={busyBookingId === booking._id} onClick={() => handleBookingReview(booking, 'approved')} className="rounded-full bg-emerald-500/15 px-4 py-2 text-sm text-emerald-200 hover:bg-emerald-500/25 disabled:opacity-50">Approve</button>
                    <button type="button" disabled={busyBookingId === booking._id} onClick={() => handleBookingReview(booking, 'rejected')} className="rounded-full bg-rose-500/15 px-4 py-2 text-sm text-rose-200 hover:bg-rose-500/25 disabled:opacity-50">Reject</button>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </div>
      )}

      {(activeTab === 'properties' || activeTab === 'availability') && (
        <div className="mt-8 space-y-6">
          {activeTab === 'availability' && (
            <p className="text-sm text-slate-400">Update whether each listing is currently accepting booking requests.</p>
          )}
          {activeTab === 'properties' && showPropertyForm && (
            <form onSubmit={handlePropertySubmit} className="glass-card rounded-[32px] border border-white/10 p-8 shadow-glass">
              <div className="mb-6 flex items-center justify-between gap-4">
                <h2 className="text-2xl font-semibold">{editingPropertyId ? 'Edit property' : 'Add a property'}</h2>
                <button type="button" onClick={() => { setShowPropertyForm(false); setEditingPropertyId(''); }} className="text-sm text-slate-400 hover:text-white">Cancel</button>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="text-sm text-slate-300">Title
                  <input name="title" value={propertyForm.title} onChange={handlePropertyChange} required className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-white" />
                </label>
                <label className="text-sm text-slate-300">Category
                  <select name="category" value={propertyForm.category} onChange={handlePropertyChange} required className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-white">
                    {categories.map((category) => <option key={category} value={category}>{category}</option>)}
                  </select>
                </label>
                <label className="text-sm text-slate-300">City
                  <input name="city" value={propertyForm.city} onChange={handlePropertyChange} required className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-white" />
                </label>
                <label className="text-sm text-slate-300">Area
                  <input name="area" value={propertyForm.area} onChange={handlePropertyChange} required className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-white" />
                </label>
                <label className="text-sm text-slate-300">Rent per month (₹)
                  <input name="rent" type="number" min="1" value={propertyForm.rent} onChange={handlePropertyChange} required className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-white" />
                </label>
                <label className="text-sm text-slate-300">Rent per day (₹, optional)
                  <input name="rentPerDay" type="number" min="0.01" step="0.01" value={propertyForm.rentPerDay} onChange={handlePropertyChange} placeholder="Monthly rent ÷ 30" className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-white placeholder:text-slate-500" />
                </label>
                <label className="text-sm text-slate-300">Rent per hour (₹, optional)
                  <input name="rentPerHour" type="number" min="0.01" step="0.01" value={propertyForm.rentPerHour} onChange={handlePropertyChange} placeholder="Daily rent ÷ 24" className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-white placeholder:text-slate-500" />
                </label>
                <label className="text-sm text-slate-300">Deposit (₹)
                  <input name="deposit" type="number" min="0" value={propertyForm.deposit} onChange={handlePropertyChange} className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-white" />
                </label>
                <label className="text-sm text-slate-300">Nearby college
                  <input name="college" value={propertyForm.college} onChange={handlePropertyChange} className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-white" />
                </label>
                <label className="text-sm text-slate-300">Landmark
                  <input name="landmark" value={propertyForm.landmark} onChange={handlePropertyChange} className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-white" />
                </label>
                <label className="text-sm text-slate-300 md:col-span-2">Full address
                  <input name="address" value={propertyForm.address} onChange={handlePropertyChange} required className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-white" />
                </label>
                <label className="text-sm text-slate-300 md:col-span-2">Description
                  <textarea name="description" value={propertyForm.description} onChange={handlePropertyChange} required rows="4" className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-white" />
                </label>
                <label className="text-sm text-slate-300 md:col-span-2">Amenities (comma separated)
                  <input name="amenities" value={propertyForm.amenities} onChange={handlePropertyChange} placeholder="WiFi, Laundry, CCTV" className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-white placeholder:text-slate-500" />
                </label>
                <label className="text-sm text-slate-300 md:col-span-2">Image URLs (one per line)
                  <textarea name="images" value={propertyForm.images} onChange={handlePropertyChange} rows="3" className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-white" />
                </label>
                <label className="text-sm text-slate-300">Latitude (optional)
                  <input name="lat" type="number" step="any" value={propertyForm.lat} onChange={handlePropertyChange} className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-white" />
                </label>
                <label className="text-sm text-slate-300">Longitude (optional)
                  <input name="lng" type="number" step="any" value={propertyForm.lng} onChange={handlePropertyChange} className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-white" />
                </label>
              </div>
              <button type="submit" disabled={savingProperty} className="mt-6 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 px-6 py-3 font-semibold text-white disabled:opacity-50">
                {savingProperty ? 'Saving...' : editingPropertyId ? 'Save changes' : 'Publish listing'}
              </button>
            </form>
          )}

          {properties.length === 0 ? (
            <div className="rounded-[32px] border border-white/10 bg-slate-950/80 p-10 text-center text-slate-400">No properties listed yet. Add your first property to get started.</div>
          ) : (
            <div className="grid gap-5 xl:grid-cols-2">
              {properties.map((property) => (
                <article key={property._id} className="glass-card rounded-[32px] border border-white/10 p-6 shadow-glass">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <Link to={`/property/${property._id}`} className="text-xl font-semibold hover:text-blue-200">{property.title}</Link>
                      <p className="mt-2 text-sm capitalize text-slate-400">{property.category} · {property.area}, {property.city}</p>
                      <p className="mt-1 text-slate-300">₹{property.rent}/month · Deposit ₹{property.deposit || 0}</p>
                      <p className="mt-1 text-sm text-slate-400">₹{(property.rentPerDay || property.rent / 30).toFixed(2)}/day · ₹{(property.rentPerHour || property.rent / 720).toFixed(2)}/hour</p>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-sm ${property.available ? 'bg-emerald-500/10 text-emerald-300' : 'bg-slate-700 text-slate-300'}`}>
                      {property.available ? 'Available' : 'Unavailable'}
                    </span>
                  </div>
                  <p className="mt-4 line-clamp-3 text-sm text-slate-400">{property.description}</p>
                  <div className="mt-5 flex flex-wrap gap-3">
                    {activeTab === 'properties' && <button type="button" onClick={() => beginEdit(property)} className="rounded-full border border-white/10 px-4 py-2 text-sm text-slate-200 hover:border-blue-400">Edit</button>}
                    <button type="button" disabled={busyPropertyId === property._id} onClick={() => handleAvailability(property)} className="rounded-full border border-white/10 px-4 py-2 text-sm text-slate-200 hover:border-blue-400 disabled:opacity-50">
                      {property.available ? 'Mark unavailable' : 'Make available'}
                    </button>
                    {activeTab === 'properties' && <button type="button" disabled={busyPropertyId === property._id} onClick={() => handleDeleteProperty(property)} className="rounded-full border border-rose-400/30 px-4 py-2 text-sm text-rose-200 hover:bg-rose-500/10 disabled:opacity-50">Delete</button>}
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'bookings' && (
        <div className="mt-8 space-y-4">
          {bookings.length === 0 ? (
            <div className="rounded-[32px] border border-white/10 bg-slate-950/80 p-10 text-center text-slate-400">No bookings for your properties yet.</div>
          ) : bookings.map((booking) => (
            <article key={booking._id} className="glass-card rounded-[32px] border border-white/10 p-6 shadow-glass">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold">{booking.property?.title || 'Property unavailable'}</h2>
                  <p className="mt-1 text-sm text-slate-400">{[booking.property?.area, booking.property?.city].filter(Boolean).join(', ') || 'Location unavailable'}</p>
                </div>
                <span className="rounded-full bg-blue-500/10 px-4 py-2 text-sm capitalize text-blue-200">{booking.status}</span>
              </div>
              <div className="mt-5 grid gap-3 text-sm text-slate-300 sm:grid-cols-2 lg:grid-cols-4">
                <p>Student: {booking.student?.name || 'Unknown'}</p>
                <p>Email: {booking.student?.email || 'Not available'}</p>
                <p>Room: {booking.room?.name || 'Not specified'}</p>
                <p>Check-in: {dateLabel(booking.checkIn)}</p>
                <p>Check-out: {dateLabel(booking.checkOut)}</p>
                <p className="capitalize">Billing: {booking.billingUnit || 'month'} · {booking.paymentPlan || 'upfront'}</p>
                <p>Stay total: ₹{booking.totalPrice}</p>
                {booking.amountPaid > 0 && <p>Paid: ₹{booking.amountPaid}</p>}
                {booking.paymentStatus === 'partial' && <p>Next installment: ₹{booking.nextPaymentAmount} · Due {dateLabel(booking.nextPaymentDueAt)}</p>}
                <p className="capitalize">Payment: {booking.paymentStatus}</p>
                <p>Requested: {dateLabel(booking.createdAt)}</p>
              </div>
              {booking.status === 'pending' && (
                <div className="mt-5 flex gap-3">
                  <button type="button" disabled={busyBookingId === booking._id} onClick={() => handleBookingReview(booking, 'approved')} className="rounded-full bg-emerald-500/15 px-4 py-2 text-sm text-emerald-200 hover:bg-emerald-500/25 disabled:opacity-50">{busyBookingId === booking._id ? 'Approving...' : 'Approve request'}</button>
                  <button type="button" disabled={busyBookingId === booking._id} onClick={() => handleBookingReview(booking, 'rejected')} className="rounded-full bg-rose-500/15 px-4 py-2 text-sm text-rose-200 hover:bg-rose-500/25 disabled:opacity-50">Reject request</button>
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  );
};

export default OwnerDashboardPage;
