import { createSlice } from '@reduxjs/toolkit';

const persistedUser = window.sessionStorage.getItem('staynest_user');
const persistedToken = window.sessionStorage.getItem('staynest_token');
window.localStorage.removeItem('staynest_user');
window.localStorage.removeItem('staynest_token');

const initialState = {
  user: persistedUser ? JSON.parse(persistedUser) : null,
  token: persistedToken || null,
  loading: false,
  error: null
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    loginRequest(state) {
      state.loading = true;
      state.error = null;
    },
    loginSuccess(state, action) {
      state.loading = false;
      state.user = action.payload.user;
      state.token = action.payload.token;
      window.sessionStorage.setItem('staynest_user', JSON.stringify(action.payload.user));
      window.sessionStorage.setItem('staynest_token', action.payload.token);
    },
    loginFailure(state, action) {
      state.loading = false;
      state.error = action.payload;
    },
    authRequestComplete(state) {
      state.loading = false;
      state.error = null;
    },
    authUserUpdated(state, action) {
      state.user = { ...state.user, ...action.payload };
      window.sessionStorage.setItem('staynest_user', JSON.stringify(state.user));
    },
    tokenRefreshed(state, action) {
      state.token = action.payload;
      window.sessionStorage.setItem('staynest_token', action.payload);
    },
    logout(state) {
      state.user = null;
      state.token = null;
      window.sessionStorage.removeItem('staynest_user');
      window.sessionStorage.removeItem('staynest_token');
    }
  }
});

export const {
  loginRequest,
  loginSuccess,
  loginFailure,
  authRequestComplete,
  authUserUpdated,
  tokenRefreshed,
  logout
} = authSlice.actions;
export default authSlice.reducer;
