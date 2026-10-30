import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import apiClient from '../api/apiClient.js';

const PropertyDetailsPage = () => {
  const { id } = useParams();
  const [property, setProperty] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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

  if (loading) {
    return <section className="mx-auto max-w-7xl px-6 pb-24 pt-8 text-white">Loading property details…</section>;
  }

  if (!property) {
    return (
      <section className="mx-auto max-w-7xl px-6 pb-24 pt-8 text-white">
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

  return (
    <section className="mx-auto max-w-7xl px-6 pb-24 pt-8 text-white">
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
              <div className="rounded-3xl bg-slate-900 px-5 py-3 text-sm text-slate-200">4.5 ★ (120 Reviews)</div>
            </div>

            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              <div className="rounded-[28px] bg-slate-900/80 p-6">
                <p className="text-sm text-slate-400">Rent</p>
                <p className="mt-2 text-3xl font-semibold text-white">₹{property.rent}/month</p>
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
              <p className="text-lg font-semibold text-white">{property.owner?.name || 'Ramesh Kumar'}</p>
              <p className="text-slate-400">Verified Owner</p>
              <p className="text-slate-300">{property.owner?.email || 'owner@example.com'}</p>
              <p className="text-slate-300">+91 98765 43210</p>
              <button className="mt-6 w-full rounded-3xl bg-gradient-to-r from-blue-500 to-purple-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 hover:opacity-95">
                Chat with Owner
              </button>
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
            <p className="mt-4 text-slate-100">Secure your room with instant booking and get digital invoice support.</p>
            <div className="mt-6 space-y-3">
              <button className="w-full rounded-3xl bg-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/20">Book Now</button>
              <button className="w-full rounded-3xl bg-white/20 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/30">Add to Wishlist</button>
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
};

export default PropertyDetailsPage;
