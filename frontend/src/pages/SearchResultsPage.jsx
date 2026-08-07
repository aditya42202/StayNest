import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import apiClient from '../api/apiClient.js';

const filters = ['Boys PG', 'Girls PG', 'Hostel', 'Shared Room', 'Looking to Rent', 'More'];

const SearchResultsPage = () => {
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const handleFilterClick = (filter) => {
    const newParams = new URLSearchParams(searchParams);
    const categoryMap = {
      'Boys PG': 'boys pg',
      'Girls PG': 'girls pg',
      Hostel: 'hostel',
      'Shared Room': 'shared room'
    };

    if (filter === 'More') {
      newParams.delete('category');
      newParams.delete('q');
      newParams.delete('budget');
    } else if (filter === 'Looking to Rent') {
      newParams.set('q', 'rent');
      newParams.delete('category');
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
      } catch (error) {
        console.error('Failed to fetch properties', error);
        setProperties([]);
      } finally {
        setLoading(false);
      }
    };
    fetchProperties();
  }, [searchParams]);

  return (
    <section className="mx-auto max-w-7xl px-6 py-24 text-slate-100">
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.24em] text-blue-300">Search Results</p>
          <h1 className="mt-2 text-4xl font-semibold">Find your ideal stay</h1>
          <p className="mt-3 text-slate-400">1200+ properties found matching your preferences.</p>
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

      {loading ? (
        <div className="rounded-[32px] bg-slate-900/80 p-16 text-center text-slate-300">Loading properties…</div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_0.6fr]">
          <div className="space-y-6">
            {properties.map((property) => (
              <Link key={property._id} to={`/property/${property._id}`} className="group block overflow-hidden rounded-[32px] border border-white/10 bg-slate-950/80 p-6 transition hover:-translate-y-1 hover:shadow-2xl hover:shadow-blue-500/10">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span className="rounded-full bg-blue-500/10 px-3 py-1 text-sm text-blue-200">{property.category}</span>
                  <span className="text-sm font-semibold text-white">₹{property.rent}/month</span>
                </div>
                <h2 className="mt-4 text-2xl font-semibold text-white">{property.title}</h2>
                <p className="mt-3 max-w-2xl text-slate-400">{property.description || 'Comfortable stay with all essential amenities and nearby conveniences.'}</p>
                <div className="mt-5 flex flex-wrap items-center gap-3 text-sm text-slate-400">
                  <span>{property.area}, {property.city}</span>
                  <span className="h-1 w-1 rounded-full bg-slate-500" />
                  <span>{property.amenities?.slice(0, 3).join(' • ')}</span>
                </div>
              </Link>
            ))}
          </div>

          <aside className="space-y-6 rounded-[32px] border border-white/10 bg-slate-950/80 p-6 shadow-glass">
            <div className="rounded-[28px] bg-gradient-to-r from-blue-500 to-purple-600 p-6 text-white">
              <p className="text-sm uppercase tracking-[0.24em]">Filter insights</p>
              <h3 className="mt-4 text-2xl font-semibold">Refine by your preferences</h3>
            </div>
            <div className="space-y-4">
              <div className="rounded-3xl bg-slate-900/90 p-5">
                <p className="text-sm text-slate-400">Average Price</p>
                <p className="mt-2 text-2xl font-semibold">₹7,500</p>
              </div>
              <div className="rounded-3xl bg-slate-900/90 p-5">
                <p className="text-sm text-slate-400">Best located near</p>
                <p className="mt-2 text-lg font-semibold">College & transport</p>
              </div>
            </div>
          </aside>
        </div>
      )}
    </section>
  );
};

export default SearchResultsPage;
