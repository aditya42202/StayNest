import { useDispatch, useSelector } from 'react-redux';
import { loginRequest, loginSuccess, loginFailure, logout } from '../store/authSlice.js';
import { login as loginApi, register as registerApi } from '../api/authApi.js';

export const useAuth = () => {
  const dispatch = useDispatch();
  const auth = useSelector((state) => state.auth);

  const signIn = async (credentials) => {
    dispatch(loginRequest());
    try {
      const { data } = await loginApi(credentials);
      dispatch(loginSuccess(data));
    } catch (error) {
      dispatch(loginFailure(error.response?.data?.message || 'Login failed'));
    }
  };

  const signUp = async (data) => {
    dispatch(loginRequest());
    try {
      const response = await registerApi(data);
      dispatch(loginSuccess(response.data));
    } catch (error) {
      dispatch(loginFailure(error.response?.data?.message || 'Registration failed'));
    }
  };

  const signOut = () => dispatch(logout());
  return { auth, signIn, signUp, signOut };
};
