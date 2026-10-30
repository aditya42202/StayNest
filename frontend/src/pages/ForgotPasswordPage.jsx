import { useState } from 'react';
import { Link } from 'react-router-dom';
import { requestPasswordReset } from '../api/authApi.js';

const ForgotPasswordPage = () => {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage('');
    setError('');
    setSubmitting(true);

    try {
      const { data } = await requestPasswordReset(email);
      setMessage(data.message);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to request a password reset right now.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="mx-auto max-w-3xl px-6 pb-24 pt-4 text-white">
      <div className="glass-card rounded-[32px] border border-white/10 p-10 shadow-glass">
        <h1 className="text-4xl font-semibold">Forgot password?</h1>
        <p className="mt-3 text-slate-300">Enter your account email and we’ll send you a password reset link if it exists.</p>

        <form onSubmit={handleSubmit} className="mt-10 space-y-5">
          <label htmlFor="reset-email" className="sr-only">Email address</label>
          <input
            id="reset-email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            type="email"
            autoComplete="email"
            placeholder="Email"
            className="w-full rounded-3xl border border-white/10 bg-slate-950/80 px-5 py-4 text-white outline-none placeholder:text-slate-500"
          />
          {error && <p role="alert" className="text-sm text-rose-400">{error}</p>}
          {message && <p role="status" className="text-sm text-emerald-300">{message}</p>}
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-3xl bg-gradient-to-r from-blue-500 to-purple-600 px-6 py-4 font-semibold text-white shadow-xl shadow-blue-500/20 hover:opacity-95 disabled:cursor-wait disabled:opacity-60"
          >
            {submitting ? 'Sending...' : 'Send reset link'}
          </button>
        </form>

        <p className="mt-6 text-slate-400">
          Remembered your password? <Link to="/login" className="text-white underline">Back to login</Link>
        </p>
      </div>
    </section>
  );
};

export default ForgotPasswordPage;
