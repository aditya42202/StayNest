import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useSelector, useDispatch } from 'react-redux';
import { logout } from '../store/authSlice.js';
import { logout as logoutApi } from '../api/authApi.js';

const normalizeRole = (role) => (
  ['student', 'tenant', 'tourist'].includes(String(role || '').toLowerCase()) ? 'user' : role
);

const Navbar = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user } = useSelector((state) => state.auth);
  const role = normalizeRole(user?.role);

  const handleLogout = async () => {
    try {
      await logoutApi();
    } catch (error) {
      console.error('Unable to revoke the server session during sign-out:', error.message);
    } finally {
      dispatch(logout());
      navigate('/login');
    }
  };

  const links = [{ label: 'Home', to: '/' }];
  if (!user) {
    links.push(
      { label: 'Search Stays', to: '/search' },
      { label: 'List Your Property', to: '/list-property' }
    );
  } else if (role === 'user') {
    links.push(
      { label: 'Search Stays', to: '/search' },
      { label: 'Student Stays', to: '/search?category=student%20room' },
      { label: 'Short Stays', to: '/search?billingUnit=day' },
      { label: 'My Bookings', to: '/dashboard' }
    );
  } else if (role === 'owner') {
    links.push(
      { label: 'List Your Property', to: '/dashboard?tab=properties' },
      { label: 'My Properties', to: '/dashboard?tab=properties' },
      { label: 'Bookings', to: '/dashboard?tab=bookings' },
      { label: 'Manage Availability', to: '/dashboard?tab=availability' },
      { label: 'Browse Stays', to: '/search' }
    );
  } else if (role === 'admin') {
    links.push({ label: 'Admin Dashboard', to: '/dashboard' });
  }

  const renderLinks = (onClick) => links.map((link) => (
    <Link
      key={`${link.label}-${link.to}`}
      to={link.to}
      onClick={onClick}
      className="whitespace-nowrap transition hover:text-white"
    >
      {link.label}
    </Link>
  ));

  return (
    <motion.header
      initial={{ y: -40, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.45, ease: 'easeOut' }}
      className="sticky top-0 z-50 border-b border-slate-800/80 bg-slate-950/90 backdrop-blur-xl"
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-4 text-slate-100">
        <Link to="/" className="flex shrink-0 items-center gap-3 text-lg font-semibold text-white">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 text-white shadow-lg shadow-blue-500/20">
            SN
          </div>
          StayNest AI
        </Link>

        <nav className="hidden items-center gap-5 overflow-x-auto text-sm text-slate-300 lg:flex">
          {renderLinks()}
        </nav>

        <div className="flex shrink-0 items-center gap-2">
          {user ? (
            <>
              {role !== 'admin' && (
                <Link to="/profile" className="hidden rounded-3xl border border-slate-700/80 px-4 py-2 text-sm text-slate-200 transition hover:border-blue-400 hover:text-white sm:inline-flex">
                  Profile
                </Link>
              )}
              {role !== 'admin' && (
                <Link to="/dashboard" className="hidden rounded-3xl border border-slate-700/80 px-4 py-2 text-sm text-slate-200 transition hover:border-blue-400 hover:text-white sm:inline-flex">
                  Dashboard
                </Link>
              )}
              <button onClick={handleLogout} className="rounded-3xl bg-gradient-to-r from-blue-500 to-purple-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 transition hover:opacity-95">
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="rounded-3xl border border-slate-700/80 px-4 py-2 text-sm text-slate-200 transition hover:border-blue-400 hover:text-white">Login</Link>
              <Link to="/register" className="hidden rounded-3xl bg-gradient-to-r from-blue-500 to-purple-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 transition hover:opacity-95 sm:inline-flex">Sign Up</Link>
            </>
          )}
          <button
            type="button"
            className="rounded-2xl border border-slate-700 px-3 py-2 text-sm text-slate-200 lg:hidden"
            aria-expanded={mobileMenuOpen}
            aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            onClick={() => setMobileMenuOpen((open) => !open)}
          >
            {mobileMenuOpen ? 'Close' : 'Menu'}
          </button>
        </div>
      </div>
      {mobileMenuOpen && (
        <nav aria-label="Mobile navigation" className="flex flex-wrap gap-x-6 gap-y-4 border-t border-slate-800 px-6 py-4 text-sm text-slate-300 lg:hidden">
          {renderLinks(() => setMobileMenuOpen(false))}
          {!user && <Link to="/register" onClick={() => setMobileMenuOpen(false)} className="transition hover:text-white">Sign Up</Link>}
        </nav>
      )}
    </motion.header>
  );
};

export default Navbar;
