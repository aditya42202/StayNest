import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';

const SearchBanner = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    city: '',
    area: '',
    category: '',
    billingUnit: 'month',
    checkIn: '',
    checkOut: '',
    guests: '1',
    roomCount: '1',
    verified: '',
    amenities: '',
    minRating: '',
    minPrice: '',
    maxPrice: ''
  });

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });
  const handleSearch = (e) => {
    e.preventDefault();
    const params = new URLSearchParams(
      Object.entries(form).filter(([key, value]) => value && !(key === 'billingUnit' && value === 'month') && !(key === 'guests' && value === '1'))
    );
    const query = params.toString();
    navigate(`/search${query ? `?${query}` : ''}`);
  };

  return (
    <motion.form onSubmit={handleSearch} className="mx-auto mt-10 max-w-4xl rounded-[32px] border border-white/10 bg-white/10 p-5 shadow-2xl shadow-slate-950/40 backdrop-blur-xl">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {['city', 'area'].map((field) => (
          <input
            key={field}
            name={field}
            value={form[field]}
            onChange={handleChange}
            placeholder={field === 'city' ? 'Destination city' : 'Area or neighborhood'}
            className="rounded-3xl border border-white/10 bg-slate-950/80 px-4 py-4 text-white outline-none placeholder:text-slate-500"
          />
        ))}
        <select name="category" value={form.category} onChange={handleChange} className="rounded-3xl border border-white/10 bg-slate-950/80 px-4 py-4 text-white">
          <option value="">All accommodation types</option>
          {['hotel', 'hostel', 'boys pg', 'girls pg', 'student room', 'homestay', 'guest house', 'apartment', 'shared room', 'hourly stay room', 'one-day stay room', 'monthly rental property'].map((category) => (
            <option key={category} value={category}>{category.replace(/\b\w/g, (letter) => letter.toUpperCase())}</option>
          ))}
        </select>
        <select name="billingUnit" value={form.billingUnit} onChange={handleChange} className="rounded-3xl border border-white/10 bg-slate-950/80 px-4 py-4 text-white">
          <option value="hour">Hourly stay</option>
          <option value="day">Daily stay</option>
          <option value="month">Monthly stay</option>
          <option value="year">Yearly stay</option>
        </select>
        <label className="text-xs text-slate-300">Check-in
          <input name="checkIn" type="datetime-local" value={form.checkIn} onChange={handleChange} className="mt-1 w-full rounded-3xl border border-white/10 bg-slate-950/80 px-4 py-3 text-white" />
        </label>
        <label className="text-xs text-slate-300">Check-out
          <input name="checkOut" type="datetime-local" value={form.checkOut} onChange={handleChange} min={form.checkIn || undefined} className="mt-1 w-full rounded-3xl border border-white/10 bg-slate-950/80 px-4 py-3 text-white" />
        </label>
        <label className="text-xs text-slate-300">Guests
          <input name="guests" type="number" min="1" max="20" value={form.guests} onChange={handleChange} className="mt-1 w-full rounded-3xl border border-white/10 bg-slate-950/80 px-4 py-3 text-white" />
        </label>
        <label className="text-xs text-slate-300">Rooms
          <input name="roomCount" type="number" min="1" max="10" value={form.roomCount} onChange={handleChange} className="mt-1 w-full rounded-3xl border border-white/10 bg-slate-950/80 px-4 py-3 text-white" />
        </label>
        <label className="text-xs text-slate-300">Verified properties
          <select name="verified" value={form.verified} onChange={handleChange} className="mt-1 w-full rounded-3xl border border-white/10 bg-slate-950/80 px-4 py-3 text-white">
            <option value="">Any property</option>
            <option value="true">Verified only</option>
          </select>
        </label>
        <label className="text-xs text-slate-300">Amenities
          <select name="amenities" value={form.amenities} onChange={handleChange} className="mt-1 w-full rounded-3xl border border-white/10 bg-slate-950/80 px-4 py-3 text-white">
            <option value="">Any amenities</option>
            {['AC', 'Wi-Fi', 'Food', 'Parking', 'Laundry'].map((amenity) => <option key={amenity} value={amenity}>{amenity}</option>)}
          </select>
        </label>
        <label className="text-xs text-slate-300">Minimum rating
          <select name="minRating" value={form.minRating} onChange={handleChange} className="mt-1 w-full rounded-3xl border border-white/10 bg-slate-950/80 px-4 py-3 text-white">
            <option value="">Any rating</option>
            <option value="3">3+ stars</option>
            <option value="4">4+ stars</option>
          </select>
        </label>
        <label className="text-xs text-slate-300">Minimum price (₹ per selected period)
          <input name="minPrice" type="number" min="0" value={form.minPrice} onChange={handleChange} placeholder="No minimum" className="mt-1 w-full rounded-3xl border border-white/10 bg-slate-950/80 px-4 py-3 text-white placeholder:text-slate-500" />
        </label>
        <label className="text-xs text-slate-300">Maximum price (₹ per selected period)
          <input name="maxPrice" type="number" min="0" value={form.maxPrice} onChange={handleChange} placeholder="No maximum" className="mt-1 w-full rounded-3xl border border-white/10 bg-slate-950/80 px-4 py-3 text-white placeholder:text-slate-500" />
        </label>
      </div>
      <button type="submit" className="mt-5 w-full rounded-3xl bg-gradient-to-r from-blue-500 to-purple-600 px-8 py-4 text-sm font-semibold text-white shadow-xl shadow-blue-500/20 hover:opacity-95">
        Search Properties
      </button>
    </motion.form>
  );
};

export default SearchBanner;
