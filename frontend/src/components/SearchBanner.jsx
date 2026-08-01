import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';

const SearchBanner = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({ city: '', area: '', college: '', budget: '' });

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });
  const handleSearch = (e) => {
    e.preventDefault();
    const params = new URLSearchParams(form).toString();
    navigate(`/search?${params}`);
  };

  return (
    <motion.form onSubmit={handleSearch} className="mx-auto mt-10 max-w-4xl rounded-[32px] border border-white/10 bg-white/10 p-5 shadow-2xl shadow-slate-950/40 backdrop-blur-xl">
      <div className="grid gap-4 sm:grid-cols-4">
        {['city', 'area', 'college', 'budget'].map((field) => (
          <input
            key={field}
            name={field}
            value={form[field]}
            onChange={handleChange}
            placeholder={field.charAt(0).toUpperCase() + field.slice(1)}
            className="rounded-3xl border border-white/10 bg-slate-950/80 px-4 py-4 text-white outline-none placeholder:text-slate-500"
          />
        ))}
      </div>
      <button type="submit" className="mt-5 w-full rounded-3xl bg-gradient-to-r from-blue-500 to-purple-600 px-8 py-4 text-sm font-semibold text-white shadow-xl shadow-blue-500/20 hover:opacity-95">
        Search Properties
      </button>
    </motion.form>
  );
};

export default SearchBanner;
