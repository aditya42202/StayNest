const Footer = () => {
  return (
    <footer className="border-t border-slate-800/80 bg-slate-950/90 py-12 text-slate-400">
      <div className="mx-auto grid max-w-7xl gap-8 px-6 md:grid-cols-[1.3fr_0.7fr]">
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold text-white">StayNest AI</h2>
          <p className="max-w-xl text-slate-400">Modern PG, hostel, and rental search for students and working professionals. Secure bookings, verified owners, and AI-powered recommendations.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-3">
            <h3 className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-300">Explore</h3>
            <a href="#" className="block text-slate-400 hover:text-white">Home</a>
            <a href="#" className="block text-slate-400 hover:text-white">Search</a>
            <a href="#" className="block text-slate-400 hover:text-white">About</a>
          </div>
          <div className="space-y-3">
            <h3 className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-300">Support</h3>
            <a href="#" className="block text-slate-400 hover:text-white">Privacy</a>
            <a href="#" className="block text-slate-400 hover:text-white">Terms</a>
            <a href="#" className="block text-slate-400 hover:text-white">Help Center</a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
