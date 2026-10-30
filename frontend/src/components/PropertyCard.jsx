import { Link } from 'react-router-dom';

const PropertyCard = ({ property }) => {
  return (
    <Link to={`/property/${property._id}`} className="glass-card group rounded-[28px] p-6 transition hover:-translate-y-1 hover:shadow-xl">
      <div className="flex items-center justify-between gap-3">
        <span className="rounded-full bg-blue-500/10 px-3 py-1 text-sm text-blue-200">{property.category}</span>
        <span className="text-sm text-slate-300">₹{property.rent}/month</span>
      </div>
      <h2 className="mt-4 text-2xl font-semibold text-white">{property.title}</h2>
      <p className="mt-2 text-sm text-slate-400">Owner: {property.owner?.name || 'Not available'}</p>
      <p className="mt-3 text-slate-400 line-clamp-3">{property.description}</p>
      <p className="mt-5 text-sm text-slate-300">{property.area}, {property.city}</p>
    </Link>
  );
};

export default PropertyCard;
