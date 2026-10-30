const Loader = ({ message = 'Wait..' }) => {
  return (
    <div className="glass-card rounded-[32px] p-12 text-center text-blue-400 shadow-glass">
      <div className="text-2xl font-semibold">{message}</div>
      <div className="mt-4 text-slate-400">Please wait while we fetch the latest data.</div>
    </div>
  );
};

export default Loader;
