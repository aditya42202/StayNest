import { useEffect, useRef } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import apiClient from '../api/apiClient.js';
import { loginSuccess } from '../store/authSlice.js';

const OAuthSuccessPage = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const requestStarted = useRef(false);

  useEffect(() => {
    if (requestStarted.current) return undefined;
    requestStarted.current = true;

    const finishSignIn = async () => {
      try {
        const { data } = await apiClient.post('/auth/refresh');
        dispatch(loginSuccess(data));
        navigate('/dashboard', { replace: true });
      } catch (error) {
        console.error('Google sign-in session could not be restored:', error.message);
        navigate('/login', {
          replace: true,
          state: { message: 'Google sign-in could not be completed. Please try again.' }
        });
      }
    };

    finishSignIn();
    return undefined;
  }, [dispatch, navigate]);

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
