import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { HiOutlineSearch } from 'react-icons/hi';
import { useNavigate } from 'react-router-dom';
import SearchBanner from '../components/SearchBanner.jsx';
import PropertyCard from '../components/PropertyCard.jsx';
import { getFeaturedProperties } from '../api/propertyApi.js';

const categories = ['PG', 'Hostel', 'Room', 'Flat', 'House'];
const topCategories = [
  { title: 'Boys PG', label: 'Explore Now' },
  { title: 'Girls PG', label: 'Explore Now' },
  { title: 'Hostel', label: 'Explore Now' },
  { title: 'Shared Room', label: 'Explore Now' },
  { title: 'Private Room', label: 'Explore Now' },
  { title: 'Flat', label: 'Explore Now' }
];
const popularCities = ['Lucknow', 'Delhi', 'Bangalore', 'Pune', 'Mumbai'];

const HomePage = () => {
  const navigate = useNavigate();
  const [featuredProperties, setFeaturedProperties] = useState([]);
  const [loadingFeatured, setLoadingFeatured] = useState(true);

  useEffect(() => {
    const fetchFeatured = async () => {
      try {
        const { data } = await getFeaturedProperties();
        setFeaturedProperties(data.properties || []);
      } catch (err) {
        setFeaturedProperties([]);
      } finally {
        setLoadingFeatured(false);
      }
    };
    fetchFeatured();
  }, []);

  const handleCategorySearch = (category) => {
    const normalize = (c) => {
      const map = {
        'Boys PG': 'boys pg',
        'Girls PG': 'girls pg',
        'Hostel': 'hostel',
        'Shared Room': 'shared room',
        'Private Room': 'private room',
        'Flat': 'flat',
        'House': 'house',
        'PG': 'pg'
      };
      return map[c] || c.toLowerCase();
    };
    navigate(`/search?category=${encodeURIComponent(normalize(category))}`);
  };

  return (
    <main className="bg-slate-950 text-white">
      <section className="relative overflow-hidden bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.18),transparent_35%),radial-gradient(circle_at_right,_rgba(168,85,247,0.18),transparent_25%),linear-gradient(180deg,#010814_0%,#081127_100%)] px-6 pb-16 pt-4 lg:pb-24 lg:pt-6">
        <div className="mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-8">
            <motion.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.7 }} className="inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-200 shadow-lg shadow-slate-950/20">
              <span className="rounded-full bg-gradient-to-r from-blue-500 to-purple-600 px-3 py-1 text-white">New</span>
              Smart PG and rental search for students & working professionals
            </motion.div>

            <motion.h1 initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.75, delay: 0.1 }} className="max-w-3xl text-5xl font-semibold leading-tight sm:text-6xl">
              Find your perfect stay, anywhere.
            </motion.h1>

            <motion.p initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.75, delay: 0.2 }} className="max-w-2xl text-lg text-slate-300">
              PG, Hostel, Room & Rental House bookings for students, professionals and property owners with AI-powered match, secure payments and verified listings.
            </motion.p>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.3 }} className="rounded-[32px] border border-white/10 bg-slate-950/60 p-6 shadow-2xl shadow-slate-950/50 backdrop-blur-xl">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex flex-wrap gap-3">
                  {categories.map((item) => (
                    <button key={item} onClick={() => handleCategorySearch(item)} className="rounded-full border border-slate-700/80 bg-slate-900/90 px-4 py-2 text-sm text-slate-200 transition hover:border-blue-400 hover:text-white">
                      {item}
                    </button>
                  ))}
                </div>
                <button onClick={() => navigate('/search')} className="rounded-full bg-gradient-to-r from-blue-500 to-purple-600 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 hover:opacity-95">
                  View all categories
                </button>
              </div>

              <div className="mt-6">
                <SearchBanner />
              </div>

              <div className="mt-5 flex flex-wrap gap-3 text-sm text-slate-400">
                {['Near College', 'Boys PG', 'Girls PG', 'Low to High Rent', 'Hostel'].map((item) => (
                  <button
                    key={item}
                    onClick={() => {
                      if (item === 'Near College') return navigate('/search?q=near+college');
                      if (item === 'Low to High Rent') return navigate('/search?sort=rent_asc');
                      const normalize = (c) => {
                        const map = {
                          'Boys PG': 'boys pg',
                          'Girls PG': 'girls pg',
                          'Hostel': 'hostel',
                          'Shared Room': 'shared room',
                          'Private Room': 'private room',
                          'Flat': 'flat',
                          'House': 'house',
                          'PG': 'pg'
                        };
                        return map[c] || c.toLowerCase();
                      };
                      return navigate(`/search?category=${encodeURIComponent(normalize(item))}`);
                    }}
                    className="rounded-full border border-slate-800 bg-slate-900/80 px-4 py-2 transition hover:border-blue-500/60 hover:text-white"
                  >
                    {item}
                  </button>
                ))}
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.35 }} className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {[
                { title: 'Verified Properties', description: 'All properties are manually verified.', icon: '✓' },
                { title: 'Budget Friendly', description: 'Find stays that fit your budget.', icon: '💰' },
                { title: 'Safe & Secure', description: 'Your safety is our priority.', icon: '🛡️' },
                { title: 'Easy Booking', description: 'Book in just a few simple steps.', icon: '⚡' }
              ].map((item) => (
                <div key={item.title} className="glass-card rounded-[28px] border border-white/10 p-6 shadow-glass">
                  <div className="flex h-12 w-12 items-center justify-center rounded-3xl bg-slate-900 text-2xl">{item.icon}</div>
                  <h3 className="mt-5 text-xl font-semibold">{item.title}</h3>
                  <p className="mt-3 text-slate-300">{item.description}</p>
                </div>
              ))}
            </motion.div>
          </div>

          <motion.div initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.7, delay: 0.15 }} className="relative mx-auto max-w-xl">
            <div className="absolute -right-10 top-10 h-40 w-40 rounded-full bg-blue-500/20 blur-3xl" />
            <div className="absolute -left-10 bottom-10 h-40 w-40 rounded-full bg-purple-500/15 blur-3xl" />
            <div className="relative overflow-hidden rounded-[40px] border border-white/10 bg-gradient-to-br from-slate-900/90 via-slate-950/90 to-slate-800/90 p-8 shadow-[0_30px_90px_rgba(15,23,42,0.45)]">
              <div className="flex items-center justify-between rounded-3xl bg-slate-950/70 p-5">
                <div>
                  <p className="text-sm uppercase tracking-[0.24em] text-slate-400">StayNest AI</p>
                  <h2 className="mt-3 text-2xl font-semibold">Smart search, instant booking.</h2>
                </div>
              </div>
              <div className="mt-8 space-y-5">
                <div className="rounded-[28px] bg-slate-950/80 p-5 shadow-glass">
                  <p className="text-sm text-slate-400">Featured PG nearby</p>
                  <h3 className="mt-3 text-2xl font-semibold">Sunny PG for Boys</h3>
                  <p className="mt-2 text-slate-300">Indiranagar, Bangalore • ₹6,500 / month</p>
                </div>
                <div className="rounded-[28px] bg-slate-950/80 p-5 shadow-glass">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-400">Popular Universities</p>
                      <p className="mt-1 text-lg font-semibold">Near top colleges</p>
                    </div>
                    <div className="rounded-3xl bg-slate-900 px-4 py-2 text-sm text-slate-200">4.8 ★</div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl space-y-14 px-6 py-20">
        <div className="space-y-4 text-center">
          <p className="text-sm uppercase tracking-[0.24em] text-blue-300">Top Categories</p>
          <h2 className="text-4xl font-semibold">Find the perfect stay for your lifestyle</h2>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {topCategories.map((category) => (
            <div key={category.title} className="glass-card rounded-[32px] border border-white/10 p-8 shadow-glass">
              <h3 className="text-2xl font-semibold">{category.title}</h3>
              <p className="mt-3 text-slate-400">{category.title} tailored for students and professionals.</p>
              <button onClick={() => handleCategorySearch(category.title)} className="mt-6 rounded-full border border-blue-500/20 bg-blue-500/10 px-5 py-3 text-sm text-blue-100 transition hover:bg-blue-500/20">
                {category.label}
              </button>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl space-y-14 px-6 py-20">
        <div className="space-y-4 text-center">
          <p className="text-sm uppercase tracking-[0.24em] text-blue-300">Featured Listings</p>
          <h2 className="text-4xl font-semibold">Popular stays selected for you</h2>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {loadingFeatured ? (
            <div className="rounded-[32px] bg-slate-900/80 p-10 text-center text-slate-400">Loading featured properties…</div>
          ) : featuredProperties.length > 0 ? (
            featuredProperties.map((property) => <PropertyCard key={property._id} property={property} />)
          ) : (
            <div className="rounded-[32px] bg-slate-900/80 p-10 text-center text-slate-400">No featured properties available yet.</div>
          )}
        </div>
      </section>
      <section className="mx-auto max-w-7xl space-y-10 px-6 pb-24">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.24em] text-blue-300">Popular Cities</p>
            <h2 className="text-4xl font-semibold">Search properties in top student cities</h2>
          </div>
          <button className="rounded-full bg-white/10 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-slate-950/20 hover:bg-white/15">View All Cities</button>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-5">
          {popularCities.map((city) => (
            <button key={city} onClick={() => navigate(`/search?city=${encodeURIComponent(city)}`)} className="group overflow-hidden rounded-[32px] bg-slate-900/80 p-6 text-left text-white shadow-glass transition hover:-translate-y-1">
              <div className="mb-5 h-40 rounded-3xl bg-gradient-to-br from-blue-500 to-purple-600" />
              <h3 className="text-2xl font-semibold">{city}</h3>
              <p className="mt-2 text-slate-400">{Math.floor(Math.random() * 3000) + 1200}+ Properties</p>
            </button>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl rounded-[32px] border border-white/10 bg-slate-950/80 px-8 py-14 shadow-glass backdrop-blur-xl">
        <div className="grid gap-10 lg:grid-cols-[1fr_0.8fr]">
          <div className="space-y-5">
            <p className="text-sm uppercase tracking-[0.24em] text-blue-300">AI Powered Recommendations</p>
            <h2 className="text-4xl font-semibold">Get tailored suggestions for budget, location, and preferences.</h2>
            <p className="text-slate-300">StayNest AI uses intelligent recommendations to surface the best rooms, hostels, and PGs near your college or workplace.</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-3xl bg-slate-900/80 p-5">
                <p className="text-sm text-slate-400">Verified Listings</p>
                <p className="mt-3 text-xl font-semibold">Safe stays</p>
              </div>
              <div className="rounded-3xl bg-slate-900/80 p-5">
                <p className="text-sm text-slate-400">Instant Booking</p>
                <p className="mt-3 text-xl font-semibold">Fast checkout</p>
              </div>
            </div>
          </div>

          <div className="rounded-[32px] bg-slate-950/90 p-8 shadow-glass">
            <div className="grid gap-6">
              <div className="rounded-[28px] bg-slate-900/80 p-6">
                <p className="text-sm text-slate-400">Download Our App</p>
                <h3 className="mt-3 text-2xl font-semibold">Book your stay on the go.</h3>
                <div className="mt-6 flex gap-4">
                  <button className="rounded-3xl bg-white/10 px-5 py-3 text-sm text-white transition hover:bg-white/20">Google Play</button>
                  <button className="rounded-3xl bg-white/10 px-5 py-3 text-sm text-white transition hover:bg-white/20">App Store</button>
                </div>
              </div>
              <div className="rounded-[28px] bg-slate-900/80 p-6">
                <p className="text-sm text-slate-400">AI Assistant</p>
                <p className="mt-3 text-lg text-slate-200">Personalized property matching, image verification, and safety insights.</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
};

export default HomePage;
