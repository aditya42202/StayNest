import { createSlice } from '@reduxjs/toolkit';

const persistedUser = window.localStorage.getItem('staynest_user');
const persistedToken = window.localStorage.getItem('staynest_token');

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
      window.localStorage.setItem('staynest_user', JSON.stringify(action.payload.user));
      window.localStorage.setItem('staynest_token', action.payload.token);
    },
    loginFailure(state, action) {
      state.loading = false;
      state.error = action.payload;
    },
    logout(state) {
      state.user = null;
      state.token = null;
      window.localStorage.removeItem('staynest_user');
      window.localStorage.removeItem('staynest_token');
    }
  }
});

export const { loginRequest, loginSuccess, loginFailure, logout } = authSlice.actions;
export default authSlice.reducer;
