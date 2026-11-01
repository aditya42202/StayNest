import { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { loginRequest, loginSuccess, loginFailure } from '../store/authSlice.js';
import apiClient from '../api/apiClient.js';
import { resendVerificationLink } from '../api/authApi.js';

const LoginPage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState(location.state?.email || '');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [needsVerification, setNeedsVerification] = useState(false);
  const [verificationMessage, setVerificationMessage] = useState('');
  const [verificationError, setVerificationError] = useState('');
  const [resending, setResending] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);

  useEffect(() => {
    if (cooldownSeconds <= 0) return undefined;
    const timer = window.setTimeout(() => setCooldownSeconds((seconds) => seconds - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [cooldownSeconds]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    setError('');
    setNeedsVerification(false);
    setVerificationMessage('');
    setVerificationError('');
    setSubmitting(true);
    dispatch(loginRequest());
    try {
      const { data } = await apiClient.post('/auth/login', { email, password });
      dispatch(loginSuccess(data));
      const requestedPath = location.state?.from;
      const destination = typeof requestedPath === 'string'
        && requestedPath.startsWith('/')
        && !requestedPath.startsWith('//')
        && !requestedPath.startsWith('/login')
        ? requestedPath
        : '/dashboard';
      navigate(destination, { replace: true });
    } catch (err) {
      const message = err.response?.data?.message || 'Login failed';
      setError(message);
      setNeedsVerification(err.response?.status === 403 && message.toLowerCase().includes('verify'));
      dispatch(loginFailure(message));
    } finally {
      setSubmitting(false);
    }
  };

  const handleResendVerification = async () => {
    if (resending || cooldownSeconds > 0) return;
    setVerificationMessage('');
    setVerificationError('');
    setResending(true);
    setCooldownSeconds(60);
    try {
      const { data } = await resendVerificationLink(email);
      setVerificationMessage(data.message);
    } catch (err) {
      setVerificationError(err.response?.data?.message || 'Unable to send a verification email.');
    } finally {
      setResending(false);
    }
  };

  return (
    <section className="mx-auto max-w-3xl px-6 pb-24 pt-4 text-white">
      <div className="glass-card rounded-[32px] border border-white/10 p-10 shadow-glass">
        <h1 className="text-4xl font-semibold">Welcome Back</h1>
        <p className="mt-3 text-slate-300">Login to access your StayNest AI dashboard and bookings.</p>
        {location.state?.message && <p role="status" className="mt-5 text-sm text-emerald-300">{location.state.message}</p>}

        <form onSubmit={handleSubmit} className="mt-10 space-y-5">
          <input value={email} onChange={(e) => setEmail(e.target.value)} required type="email" placeholder="Email" className="w-full rounded-3xl border border-white/10 bg-slate-950/80 px-5 py-4 text-white outline-none placeholder:text-slate-500" />
          <input value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} maxLength={72} type="password" placeholder="Password" className="w-full rounded-3xl border border-white/10 bg-slate-950/80 px-5 py-4 text-white outline-none placeholder:text-slate-500" />
          {error && <p className="text-sm text-rose-400">{error}</p>}
          {needsVerification && (
            <div className="space-y-3">
              <button
                type="button"
                onClick={handleResendVerification}
                disabled={resending || cooldownSeconds > 0}
                className="text-sm text-blue-300 underline disabled:cursor-wait disabled:opacity-60"
              >
                {resending ? 'Sending...' : cooldownSeconds > 0 ? `Resend available in ${cooldownSeconds}s` : 'Resend Verification Email'}
              </button>
              <Link to="/verify-email" state={{ email, from: location.state?.from }} className="block text-sm text-blue-300 underline">
                Open email verification page
              </Link>
              {verificationMessage && <p role="status" className="text-sm text-emerald-300">{verificationMessage}</p>}
              {verificationError && <p role="alert" className="text-sm text-rose-400">{verificationError}</p>}
            </div>
          )}
          <div className="text-right">
            <Link to="/forgot-password" className="text-sm text-blue-300 hover:text-white">Forgot password?</Link>
          </div>
          <button type="submit" disabled={submitting} className="w-full rounded-3xl bg-gradient-to-r from-blue-500 to-purple-600 px-6 py-4 font-semibold text-white shadow-xl shadow-blue-500/20 hover:opacity-95 disabled:cursor-wait disabled:opacity-60">{submitting ? 'Signing in...' : 'Sign in'}</button>
        </form>

        <div className="mt-6 text-slate-400">
          <p>Don't have an account? <Link to="/register" state={{ from: location.state?.from }} className="text-white underline">Register here</Link></p>
        </div>
      </div>
    </section>
  );
};

export default LoginPage;
