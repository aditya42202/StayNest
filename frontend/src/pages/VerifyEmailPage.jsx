import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { resendVerificationCode, verifyEmail } from '../api/authApi.js';

const VerifyEmailPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [email, setEmail] = useState(location.state?.email || '');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState(location.state?.message || '');
  const [submitting, setSubmitting] = useState(false);

  const handleVerify = async (event) => {
    event.preventDefault();
    setError('');
    setMessage('');
    setSubmitting(true);

    try {
      await verifyEmail(email, code);
      navigate('/login', {
        replace: true,
        state: { message: 'Email verified successfully. Please sign in.', from: location.state?.from }
      });
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to verify your email address.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResend = async () => {
    setError('');
    setMessage('');
    setSubmitting(true);

    try {
      const { data } = await resendVerificationCode(email);
      setMessage(data.message);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to send a verification code.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="mx-auto max-w-3xl px-6 pb-24 pt-4 text-white">
      <div className="glass-card rounded-[32px] border border-white/10 p-10 shadow-glass">
        <h1 className="text-4xl font-semibold">Verify your email</h1>
        <p className="mt-3 text-slate-300">Enter the six-digit code we sent to your email. The code expires after 10 minutes.</p>

        <form onSubmit={handleVerify} className="mt-10 space-y-5">
          <label htmlFor="verification-email" className="sr-only">Email address</label>
          <input
            id="verification-email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            type="email"
            autoComplete="email"
            placeholder="Email"
            className="w-full rounded-3xl border border-white/10 bg-slate-950/80 px-5 py-4 text-white outline-none placeholder:text-slate-500"
          />
          <label htmlFor="verification-code" className="sr-only">Six-digit verification code</label>
          <input
            id="verification-code"
            value={code}
            onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
            required
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]{6}"
            placeholder="6-digit code"
            className="w-full rounded-3xl border border-white/10 bg-slate-950/80 px-5 py-4 tracking-[0.35em] text-white outline-none placeholder:text-slate-500"
          />
          {error && <p role="alert" className="text-sm text-rose-400">{error}</p>}
          {message && <p role="status" className="text-sm text-emerald-300">{message}</p>}
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-3xl bg-gradient-to-r from-blue-500 to-purple-600 px-6 py-4 font-semibold text-white shadow-xl shadow-blue-500/20 hover:opacity-95 disabled:cursor-wait disabled:opacity-60"
          >
            {submitting ? 'Verifying...' : 'Verify email'}
          </button>
        </form>

        <button
          type="button"
          onClick={handleResend}
          disabled={submitting || !email}
          className="mt-5 text-sm text-blue-300 underline disabled:cursor-not-allowed disabled:opacity-60"
        >
          Resend verification code
        </button>
        <p className="mt-6 text-slate-400">
          Already verified? <Link to="/login" state={{ from: location.state?.from }} className="text-white underline">Sign in</Link>
        </p>
      </div>
    </section>
  );
};

export default VerifyEmailPage;
