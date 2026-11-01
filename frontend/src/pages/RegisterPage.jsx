import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import apiClient from '../api/apiClient.js';

const RegisterPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'user' });
  const [error, setError] = useState('');
  const [emailAlreadyRegistered, setEmailAlreadyRegistered] = useState(false);
  const [emailVerificationPending, setEmailVerificationPending] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (e) => setForm((current) => ({ ...current, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    setError('');
    setEmailAlreadyRegistered(false);
    setEmailVerificationPending(false);
    setSubmitting(true);
    try {
      const { data } = await apiClient.post('/auth/register', form);
      if (data.verificationRequired) {
        navigate('/verify-email', {
          replace: true,
          state: {
            email: data.user?.email || form.email,
            message: 'We sent a verification link to your email. Open it to verify your account, then sign in.',
            from: location.state?.from
          }
        });
        return;
      }
      navigate('/login', {
        replace: true,
        state: {
          message: 'Account created successfully. Please sign in.',
          from: location.state?.from
        }
      });
    } catch (err) {
      const message = err.response?.data?.message || 'Registration failed';
      setEmailAlreadyRegistered(err.response?.status === 409);
      setEmailVerificationPending(
        err.response?.status === 409 && message.toLowerCase().includes('verification is pending')
      );
      if (message.toLowerCase().includes('signup is pending')) {
        navigate('/verify-email', {
          replace: true,
          state: { email: form.email, error: message, from: location.state?.from }
        });
        return;
      }
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="mx-auto max-w-3xl px-6 pb-24 pt-4 text-white">
      <div className="glass-card rounded-[32px] border border-white/10 p-10 shadow-glass">
        <h1 className="text-4xl font-semibold">Create your account</h1>
        <p className="mt-3 text-slate-300">Register as a tenant, owner, or approved administrator.</p>

        <form onSubmit={handleSubmit} className="mt-10 space-y-5">
          <input name="name" value={form.name} onChange={handleChange} required minLength={2} maxLength={80} placeholder="Name" className="w-full rounded-3xl border border-white/10 bg-slate-950/80 px-5 py-4 text-white outline-none placeholder:text-slate-500" />
          <input name="email" value={form.email} onChange={handleChange} required type="email" pattern="[^@]+@gmail[.]com" title="Use an @gmail.com email address." placeholder="name@gmail.com" className="w-full rounded-3xl border border-white/10 bg-slate-950/80 px-5 py-4 text-white outline-none placeholder:text-slate-500" />
          <p className="-mt-3 text-sm text-slate-400">Use an @gmail.com email address to register.</p>
          <input name="password" value={form.password} onChange={handleChange} required minLength={8} maxLength={72} type="password" placeholder="Password" className="w-full rounded-3xl border border-white/10 bg-slate-950/80 px-5 py-4 text-white outline-none placeholder:text-slate-500" />
          <fieldset>
            <legend className="mb-2 text-sm text-slate-300">Account type</legend>
            <div className="grid grid-cols-3 rounded-2xl border border-white/10 bg-slate-950/80 p-1">
              {[
                { value: 'user', label: 'Tenant' },
                { value: 'owner', label: 'Owner' },
                { value: 'admin', label: 'Admin' }
              ].map((option) => (
                <label key={option.value} className={`cursor-pointer rounded-xl px-4 py-3 text-center text-sm font-semibold transition ${form.role === option.value ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}>
                  <input
                    type="radio"
                    name="role"
                    value={option.value}
                    checked={form.role === option.value}
                    onChange={handleChange}
                    className="sr-only"
                  />
                  {option.label}
                </label>
              ))}
            </div>
            <p className="mt-2 text-sm text-slate-400">
              {form.role === 'owner'
                ? 'Owners can list properties and manage bookings from their dashboard.'
                : form.role === 'admin'
                  ? 'Admin signup is available only to email addresses approved by the platform administrator.'
                  : 'Tenants can search properties and manage their bookings.'}
            </p>
          </fieldset>
          {error && <p className="text-sm text-rose-400">{error}</p>}
          {emailAlreadyRegistered && (
            <Link to="/login" state={{ email: form.email, from: location.state?.from }} className="block text-sm text-blue-300 underline">
              Sign in to your existing account
            </Link>
          )}
          {emailVerificationPending && (
            <Link to="/verify-email" state={{ email: form.email, from: location.state?.from }} className="block text-sm text-blue-300 underline">
              Continue verifying this email
            </Link>
          )}
          <button type="submit" disabled={submitting} className="w-full rounded-3xl bg-gradient-to-r from-blue-500 to-purple-600 px-6 py-4 font-semibold text-white shadow-xl shadow-blue-500/20 hover:opacity-95 disabled:cursor-wait disabled:opacity-60">{submitting ? 'Creating account...' : 'Register'}</button>
        </form>
      </div>
    </section>
  );
};

export default RegisterPage;
