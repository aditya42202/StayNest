import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useSelector, useDispatch } from 'react-redux';
import { logout } from '../store/authSlice.js';

const Navbar = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  return (
    <motion.header
      initial={{ y: -40, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.45, ease: 'easeOut' }}
      className="sticky top-0 z-50 border-b border-slate-800/80 bg-slate-950/90 backdrop-blur-xl"
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 text-slate-100">
        <Link to="/" className="flex items-center gap-3 text-lg font-semibold text-white">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 text-white shadow-lg shadow-blue-500/20">
            SN
          </div>
          StayNest AI
        </Link>

        <nav className="hidden items-center gap-6 text-sm text-slate-300 lg:flex">
          <Link to="/" className="hover:text-white">Home</Link>
          <Link to="/search" className="hover:text-white">Search</Link>
          <Link to="/search?category=PG" className="hover:text-white">PG</Link>
          <Link to="/search?category=Hostel" className="hover:text-white">Hostel</Link>
          <Link to="/search?category=Room" className="hover:text-white">Room</Link>
          <Link to="/search?category=Flat" className="hover:text-white">Flat</Link>
          <Link to="/#" className="hover:text-white">About</Link>
        </nav>

        <div className="flex items-center gap-3">
          {user ? (
            <>
              <Link to="/dashboard" className="rounded-3xl border border-slate-700/80 px-4 py-2 text-sm text-slate-200 transition hover:border-blue-400 hover:text-white">Dashboard</Link>
              <button onClick={handleLogout} className="rounded-3xl bg-gradient-to-r from-blue-500 to-purple-600 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 transition hover:opacity-95">Logout</button>
            </>
          ) : (
            <>
              <Link to="/login" className="rounded-3xl border border-slate-700/80 px-5 py-2 text-sm text-slate-200 transition hover:border-blue-400 hover:text-white">Login</Link>
              <Link to="/register" className="rounded-3xl bg-gradient-to-r from-blue-500 to-purple-600 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 transition hover:opacity-95">Sign Up</Link>
            </>
          )}
        </div>
      </div>
    </motion.header>
  );
};

export default Navbar;
