import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import apiClient from '../api/apiClient.js';

const RegisterPage = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'user' });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    try {
      await apiClient.post('/auth/register', form);
      setMessage('Registration successful. Redirecting to login...');
      setTimeout(() => navigate('/login'), 1200);
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
    }
  };

  return (
    <section className="mx-auto max-w-3xl px-6 pb-24 pt-4 text-white">
      <div className="glass-card rounded-[32px] border border-white/10 p-10 shadow-glass">
        <h1 className="text-4xl font-semibold">Create your account</h1>
        <p className="mt-3 text-slate-300">Register as a tenant or owner to manage bookings and properties.</p>

        <form onSubmit={handleSubmit} className="mt-10 space-y-5">
          <input name="name" value={form.name} onChange={handleChange} required placeholder="Name" className="w-full rounded-3xl border border-white/10 bg-slate-950/80 px-5 py-4 text-white outline-none placeholder:text-slate-500" />
          <input name="email" value={form.email} onChange={handleChange} required type="email" placeholder="Email" className="w-full rounded-3xl border border-white/10 bg-slate-950/80 px-5 py-4 text-white outline-none placeholder:text-slate-500" />
          <input name="password" value={form.password} onChange={handleChange} required type="password" placeholder="Password" className="w-full rounded-3xl border border-white/10 bg-slate-950/80 px-5 py-4 text-white outline-none placeholder:text-slate-500" />
          <select name="role" value={form.role} onChange={handleChange} className="w-full rounded-3xl border border-white/10 bg-slate-950/80 px-5 py-4 text-white outline-none">
            <option value="user">Tenant</option>
            <option value="owner">Owner</option>
          </select>
          {error && <p className="text-sm text-rose-400">{error}</p>}
          {message && <p className="text-sm text-emerald-300">{message}</p>}
          <button type="submit" className="w-full rounded-3xl bg-gradient-to-r from-blue-500 to-purple-600 px-6 py-4 font-semibold text-white shadow-xl shadow-blue-500/20 hover:opacity-95">Register</button>
        </form>
      </div>
    </section>
  );
};

export default RegisterPage;
