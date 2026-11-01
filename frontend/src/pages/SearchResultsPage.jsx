import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import apiClient from '../api/apiClient.js';
import SearchBanner from '../components/SearchBanner.jsx';

const filters = ['Hotel', 'Hostel', 'Homestay', 'Student Room', 'Hourly stay', 'Boys PG', 'Girls PG', 'More'];

const formatCategory = (category) => category.replace(/\b\w/g, (letter) => letter.toUpperCase());

const rateForProperty = (property, billingUnit) => {
  const monthlyRate = Number(property.rent);
  const dailyRate = Number(property.rentPerDay || monthlyRate / 30);
  if (billingUnit === 'hour') return Number(property.rentPerHour || dailyRate / 24);
  if (billingUnit === 'day') return dailyRate;
  if (billingUnit === 'year') return monthlyRate * 12;
  return monthlyRate;
};

const SearchResultsPage = () => {
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const handleFilterClick = (filter) => {
    const newParams = new URLSearchParams(searchParams);
    const categoryMap = {
      'Boys PG': 'boys pg',
      'Girls PG': 'girls pg',
      Hotel: 'hotel',
      Hostel: 'hostel',
      Homestay: 'homestay',
      'Student Room': 'student room',
      'Hourly stay': 'hourly stay room'
    };

    if (filter === 'More') {
      newParams.delete('category');
      newParams.delete('q');
      newParams.delete('budget');
      newParams.delete('minPrice');
      newParams.delete('maxPrice');
    } else {
      newParams.set('category', categoryMap[filter] || filter.toLowerCase());
      newParams.delete('q');
    }

    const queryString = newParams.toString();
    navigate(`/search${queryString ? `?${queryString}` : ''}`);
  };

  useEffect(() => {
    const fetchProperties = async () => {
      setLoading(true);
      try {
        const query = Object.fromEntries(searchParams.entries());
        const { data } = await apiClient.get('/properties/search', { params: query });
        setProperties(data.properties || []);
        setTotal(data.total ?? data.properties?.length ?? 0);
      } catch (error) {
        console.error('Failed to fetch properties', error);
        setProperties([]);
        setTotal(0);
      } finally {
        setLoading(false);
      }
    };
    fetchProperties();
  }, [searchParams]);

  return (
    <section className="mx-auto max-w-7xl px-6 pb-24 pt-4 text-slate-100">
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.24em] text-blue-300">Search Results</p>
          <h1 className="mt-2 text-4xl font-semibold">Find your ideal stay</h1>
          <p className="mt-3 text-slate-400">{total} {total === 1 ? 'property' : 'properties'} found matching your preferences.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          {filters.map((filter) => (
            <button
              key={filter}
              onClick={() => handleFilterClick(filter)}
              className="rounded-full border border-slate-700/80 bg-slate-900/80 px-4 py-2 text-sm text-slate-200 transition hover:border-blue-500/60 hover:text-white"
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      <SearchBanner />

      {loading ? (
        <div className="rounded-[32px] bg-slate-900/80 p-16 text-center text-slate-300">Loading properties…</div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_0.6fr]">
          <div className="space-y-6">
            {properties.length === 0 ? (
              <div className="rounded-[32px] bg-slate-900/80 p-16 text-center text-slate-400">No properties found for these filters.</div>
            ) : (
              properties.map((property) => (
                <Link key={property._id} to={`/property/${property._id}`} className="group block overflow-hidden rounded-[32px] border border-white/10 bg-slate-950/80 p-6 transition hover:-translate-y-1 hover:shadow-2xl hover:shadow-blue-500/10">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <span className="rounded-full bg-blue-500/10 px-3 py-1 text-sm text-blue-200">{formatCategory(property.category)}</span>
                    <span className="text-sm font-semibold text-white">₹{Number(property.searchRate ?? rateForProperty(property, searchParams.get('billingUnit') || 'month')).toFixed(2)}/{searchParams.get('billingUnit') || 'month'}</span>
                  </div>
                  <h2 className="mt-4 text-2xl font-semibold text-white">{property.title}</h2>
                  <p className="mt-3 max-w-2xl text-slate-400">{property.description || 'Comfortable stay with all essential amenities and nearby conveniences.'}</p>
                  {property.images?.[0] && <img src={property.images[0]} alt={property.title} className="mt-5 h-52 w-full rounded-2xl object-cover" />}
                  <div className="mt-5 flex flex-wrap items-center gap-3 text-sm text-slate-400">
                    <span>{property.area}, {property.city}</span>
                    <span className="h-1 w-1 rounded-full bg-slate-500" />
                    <span>Owner: {property.owner?.name || 'Not available'}</span>
                  </div>
                  {property.amenities?.length > 0 && <p className="mt-3 text-sm text-slate-400">{property.amenities.slice(0, 4).join(' · ')}</p>}
                </Link>
              ))
            )}
          </div>

          <aside className="space-y-6 rounded-[32px] border border-white/10 bg-slate-950/80 p-6 shadow-glass">
            <div className="rounded-[28px] bg-gradient-to-r from-blue-500 to-purple-600 p-6 text-white">
              <p className="text-sm uppercase tracking-[0.24em]">Filter insights</p>
              <h3 className="mt-4 text-2xl font-semibold">Refine by your preferences</h3>
            </div>
            <div className="space-y-4">
              <div className="rounded-3xl bg-slate-900/90 p-5">
                <p className="text-sm text-slate-400">Current search</p>
                <p className="mt-2 text-lg font-semibold">{searchParams.get('city') || 'All destinations'}</p>
                <p className="mt-1 text-sm text-slate-400">Prices are shown per {searchParams.get('billingUnit') || 'month'}.</p>
              </div>
            </div>
          </aside>
        </div>
      )}
    </section>
  );
};

export default SearchResultsPage;
