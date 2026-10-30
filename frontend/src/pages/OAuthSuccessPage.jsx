import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

const OAuthSuccessPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const token = searchParams.get('token');
    if (token) {
      window.sessionStorage.setItem('staynest_token', token);
      navigate('/dashboard', { replace: true });
    } else {
      navigate('/login', { replace: true });
    }
  }, [navigate, searchParams]);

  return (
    <section className="mx-auto max-w-3xl px-6 pb-24 pt-4 text-white">
      <div className="glass-card rounded-[32px] p-10 text-center shadow-glass">
        <h1 className="text-3xl font-semibold">Signing you in...</h1>
        <p className="mt-4 text-slate-300">Please wait while we complete your login.</p>
      </div>
    </section>
  );
};

export default OAuthSuccessPage;
