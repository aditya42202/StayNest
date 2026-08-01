import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import { loginRequest, loginSuccess, loginFailure } from '../store/authSlice.js';
import apiClient from '../api/apiClient.js';

const LoginPage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    dispatch(loginRequest());
    try {
      const { data } = await apiClient.post('/auth/login', { email, password });
      dispatch(loginSuccess(data));
      navigate('/dashboard');
    } catch (err) {
      const message = err.response?.data?.message || 'Login failed';
      setError(message);
      dispatch(loginFailure(message));
    }
  };

  return (
    <section className="mx-auto max-w-3xl px-6 py-24 text-white">
      <div className="glass-card rounded-[32px] border border-white/10 p-10 shadow-glass">
        <h1 className="text-4xl font-semibold">Welcome Back</h1>
        <p className="mt-3 text-slate-300">Login to access your StayNest AI dashboard and bookings.</p>

        <form onSubmit={handleSubmit} className="mt-10 space-y-5">
          <input value={email} onChange={(e) => setEmail(e.target.value)} required type="email" placeholder="Email" className="w-full rounded-3xl border border-white/10 bg-slate-950/80 px-5 py-4 text-white outline-none placeholder:text-slate-500" />
          <input value={password} onChange={(e) => setPassword(e.target.value)} required type="password" placeholder="Password" className="w-full rounded-3xl border border-white/10 bg-slate-950/80 px-5 py-4 text-white outline-none placeholder:text-slate-500" />
          {error && <p className="text-sm text-rose-400">{error}</p>}
          <button type="submit" className="w-full rounded-3xl bg-gradient-to-r from-blue-500 to-purple-600 px-6 py-4 font-semibold text-white shadow-xl shadow-blue-500/20 hover:opacity-95">Sign in</button>
        </form>

        <div className="mt-6 text-slate-400">
          <p>Don't have an account? <Link to="/register" className="text-white underline">Register here</Link></p>
        </div>
      </div>
    </section>
  );
};

export default LoginPage;
