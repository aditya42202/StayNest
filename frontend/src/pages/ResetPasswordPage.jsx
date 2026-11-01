import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { resetPassword } from '../api/authApi.js';

const ResetPasswordPage = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    setSubmitting(true);
    try {
      await resetPassword(token, password);
      navigate('/login', { replace: true, state: { message: 'Password reset successfully. Please sign in with your new password.' } });
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to reset your password. Request a new reset link and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="mx-auto max-w-3xl px-6 pb-24 pt-4 text-white">
      <div className="glass-card rounded-[32px] border border-white/10 p-10 shadow-glass">
        <h1 className="text-4xl font-semibold">Choose a new password</h1>
        <p className="mt-3 text-slate-300">Use at least 8 characters. Your reset link can only be used once.</p>

        <form onSubmit={handleSubmit} className="mt-10 space-y-5">
          <label htmlFor="new-password" className="sr-only">New password</label>
          <input
            id="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            minLength={8}
            maxLength={72}
            type="password"
            autoComplete="new-password"
            placeholder="New password"
            className="w-full rounded-3xl border border-white/10 bg-slate-950/80 px-5 py-4 text-white outline-none placeholder:text-slate-500"
          />
          <label htmlFor="confirm-password" className="sr-only">Confirm new password</label>
          <input
            id="confirm-password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            required
            minLength={8}
            maxLength={72}
            type="password"
            autoComplete="new-password"
            placeholder="Confirm new password"
            className="w-full rounded-3xl border border-white/10 bg-slate-950/80 px-5 py-4 text-white outline-none placeholder:text-slate-500"
          />
          {error && <p role="alert" className="text-sm text-rose-400">{error}</p>}
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-3xl bg-gradient-to-r from-blue-500 to-purple-600 px-6 py-4 font-semibold text-white shadow-xl shadow-blue-500/20 hover:opacity-95 disabled:cursor-wait disabled:opacity-60"
          >
            {submitting ? 'Updating password...' : 'Reset password'}
          </button>
        </form>

        <p className="mt-6 text-slate-400">
          Need a new reset link? <Link to="/forgot-password" className="text-white underline">Request another</Link>
        </p>
      </div>
    </section>
  );
};

export default ResetPasswordPage;
