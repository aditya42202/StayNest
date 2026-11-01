import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { resendVerificationLink, verifyEmail, verifyEmailToken } from '../api/authApi.js';

const VerifyEmailPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const verificationToken = new URLSearchParams(location.search).get('token') || '';
  const [email, setEmail] = useState(location.state?.email || '');
  const [code, setCode] = useState('');
  const [error, setError] = useState(location.state?.error || '');
  const [message, setMessage] = useState(location.state?.message || '');
  const [submitting, setSubmitting] = useState(false);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);

  useEffect(() => {
    if (verificationToken) {
      window.history.replaceState(
        window.history.state,
        '',
        `${location.pathname}${location.hash}`
      );
    }
  }, [location.hash, location.pathname, verificationToken]);

  useEffect(() => {
    if (cooldownSeconds <= 0) return undefined;
    const timer = window.setTimeout(() => setCooldownSeconds((seconds) => seconds - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [cooldownSeconds]);

  const handleVerifyLink = async () => {
    setError('');
    setSubmitting(true);

    try {
      await verifyEmailToken(verificationToken);
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

  const handleVerifyCode = async (event) => {
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

  const handleResend = async (event) => {
    event.preventDefault();
    if (submitting || cooldownSeconds > 0) return;
    setError('');
    setMessage('');
    setSubmitting(true);

    try {
      const { data } = await resendVerificationLink(email);
      setMessage(data.message);
      setCooldownSeconds(60);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to send a verification link.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="mx-auto max-w-3xl px-6 pb-24 pt-4 text-white">
      <div className="glass-card rounded-[32px] border border-white/10 p-10 shadow-glass">
        <h1 className="text-4xl font-semibold">{verificationToken ? 'Confirm your email' : 'Check your email'}</h1>
        <p className="mt-3 text-slate-300">
          {verificationToken
            ? 'Click below to verify your email address. You can then sign in to your account.'
            : 'Open the verification link we sent to your email. It expires at the time shown in the message.'}
        </p>

        {verificationToken && (
          <button
            type="button"
            onClick={handleVerifyLink}
            disabled={submitting}
            className="mt-10 w-full rounded-3xl bg-gradient-to-r from-blue-500 to-purple-600 px-6 py-4 font-semibold text-white shadow-xl shadow-blue-500/20 hover:opacity-95 disabled:cursor-wait disabled:opacity-60"
          >
            {submitting ? 'Verifying...' : 'Verify email and continue to sign in'}
          </button>
        )}

        {error && <p role="alert" className="mt-5 text-sm text-rose-400">{error}</p>}
        {message && <p role="status" className="mt-5 text-sm text-emerald-300">{message}</p>}

        <form onSubmit={handleResend} className="mt-8 space-y-4">
          <label htmlFor="verification-email" className="block text-sm text-slate-300">Resend verification link</label>
          <input
            id="verification-email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            type="email"
            pattern="[^@]+@gmail[.]com"
            autoComplete="email"
            placeholder="Email"
            className="w-full rounded-3xl border border-white/10 bg-slate-950/80 px-5 py-4 text-white outline-none placeholder:text-slate-500"
          />
          <button
            type="submit"
            disabled={submitting || cooldownSeconds > 0}
            className="w-full rounded-3xl border border-white/15 px-6 py-3 font-semibold text-white hover:bg-white/5 disabled:cursor-wait disabled:opacity-60"
          >
            {submitting ? 'Sending...' : cooldownSeconds > 0 ? `Try again in ${cooldownSeconds}s` : 'Send a new verification link'}
          </button>
        </form>

        {!verificationToken && (
          <details className="mt-8 text-slate-300">
            <summary className="cursor-pointer text-sm">Have an older six-digit verification code?</summary>
            <form onSubmit={handleVerifyCode} className="mt-4 space-y-4">
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
              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-3xl bg-gradient-to-r from-blue-500 to-purple-600 px-6 py-4 font-semibold text-white disabled:cursor-wait disabled:opacity-60"
              >
                {submitting ? 'Verifying...' : 'Verify with code'}
              </button>
            </form>
          </details>
        )}

        <p className="mt-6 text-slate-400">
          Ready to sign in? <Link to="/login" state={{ from: location.state?.from }} className="text-white underline">Go to login</Link>
        </p>
      </div>
    </section>
  );
};

export default VerifyEmailPage;
