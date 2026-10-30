import { useState } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '../api/apiClient.js';

const categories = ['boys pg', 'girls pg', 'hostel', 'shared room', 'private room', 'flat', 'house'];

const inputClass = 'mt-2 w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-white placeholder:text-slate-500';

const PublicOwnerListingPage = () => {
  const [form, setForm] = useState({
    ownerName: '',
    email: '',
    phone: '',
    title: '',
    description: '',
    category: categories[0],
    city: '',
    area: '',
    college: '',
    landmark: '',
    address: '',
    rent: '',
    rentPerDay: '',
    rentPerHour: '',
    deposit: '',
    amenities: '',
    images: '',
    website: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleChange = (event) => {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    setSuccess('');
    try {
      const { data } = await apiClient.post('/properties/owner-listing-requests', {
        ...form,
        rent: Number(form.rent),
        rentPerDay: form.rentPerDay === '' ? null : Number(form.rentPerDay),
        rentPerHour: form.rentPerHour === '' ? null : Number(form.rentPerHour),
        deposit: Number(form.deposit || 0),
        amenities: form.amenities.split(',').map((item) => item.trim()).filter(Boolean),
        images: form.images.split(/\r?\n/).map((item) => item.trim()).filter(Boolean)
      });
      setSuccess(data.message || 'Your property request has been submitted for review.');
      setForm((current) => ({ ...current, website: '' }));
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to submit your property. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="mx-auto max-w-5xl px-6 pb-20 pt-8 text-white">
      <header className="mb-8 max-w-3xl">
        <p className="text-sm uppercase tracking-[0.18em] text-blue-300">Owner listing</p>
        <h1 className="mt-3 text-4xl font-semibold">List your property</h1>
        <p className="mt-3 text-slate-300">Submit your details without creating an account. Our team reviews each listing before it appears publicly.</p>
      </header>

      {success ? (
        <div role="status" className="rounded-2xl border border-emerald-400/30 bg-emerald-500/10 p-6">
          <h2 className="text-xl font-semibold text-emerald-200">Request received</h2>
          <p className="mt-2 text-slate-200">{success}</p>
          <p className="mt-2 text-sm text-slate-400">Keep an eye on the email address you provided for updates after review.</p>
          <Link to="/" className="mt-5 inline-block text-sm text-blue-300 hover:text-white">Return to home</Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-8">
          <section className="border-t border-white/10 pt-6">
            <h2 className="text-xl font-semibold">Your contact details</h2>
            <div className="mt-5 grid gap-5 sm:grid-cols-2">
              <label className="text-sm text-slate-300">Owner name
                <input name="ownerName" value={form.ownerName} onChange={handleChange} required maxLength={120} className={inputClass} />
              </label>
              <label className="text-sm text-slate-300">Email
                <input name="email" type="email" value={form.email} onChange={handleChange} required maxLength={254} className={inputClass} />
              </label>
              <label className="text-sm text-slate-300">Phone
                <input name="phone" type="tel" value={form.phone} onChange={handleChange} required maxLength={30} className={inputClass} />
              </label>
            </div>
          </section>

          <section className="border-t border-white/10 pt-6">
            <h2 className="text-xl font-semibold">Property details</h2>
            <div className="mt-5 grid gap-5 sm:grid-cols-2">
              <label className="text-sm text-slate-300">Listing title
                <input name="title" value={form.title} onChange={handleChange} required maxLength={160} className={inputClass} />
              </label>
              <label className="text-sm text-slate-300">Category
                <select name="category" value={form.category} onChange={handleChange} className={inputClass}>
                  {categories.map((category) => <option key={category} value={category}>{category}</option>)}
                </select>
              </label>
              <label className="text-sm text-slate-300">City
                <input name="city" value={form.city} onChange={handleChange} required maxLength={100} className={inputClass} />
              </label>
              <label className="text-sm text-slate-300">Area
                <input name="area" value={form.area} onChange={handleChange} required maxLength={100} className={inputClass} />
              </label>
              <label className="text-sm text-slate-300">Nearby college (optional)
                <input name="college" value={form.college} onChange={handleChange} maxLength={120} className={inputClass} />
              </label>
              <label className="text-sm text-slate-300">Landmark (optional)
                <input name="landmark" value={form.landmark} onChange={handleChange} maxLength={200} className={inputClass} />
              </label>
              <label className="text-sm text-slate-300">Monthly rent
                <input name="rent" type="number" min="1" value={form.rent} onChange={handleChange} required className={inputClass} />
              </label>
              <label className="text-sm text-slate-300">Daily rent (optional)
                <input name="rentPerDay" type="number" min="0.01" step="0.01" value={form.rentPerDay} onChange={handleChange} placeholder="Monthly rent ÷ 30" className={inputClass} />
              </label>
              <label className="text-sm text-slate-300">Hourly rent (optional)
                <input name="rentPerHour" type="number" min="0.01" step="0.01" value={form.rentPerHour} onChange={handleChange} placeholder="Daily rent ÷ 24" className={inputClass} />
              </label>
              <label className="text-sm text-slate-300">Deposit
                <input name="deposit" type="number" min="0" value={form.deposit} onChange={handleChange} className={inputClass} />
              </label>
              <label className="text-sm text-slate-300 sm:col-span-2">Full address
                <textarea name="address" value={form.address} onChange={handleChange} required maxLength={500} rows="3" className={inputClass} />
              </label>
              <label className="text-sm text-slate-300 sm:col-span-2">Description
                <textarea name="description" value={form.description} onChange={handleChange} required maxLength={5000} rows="5" className={inputClass} />
              </label>
              <label className="text-sm text-slate-300 sm:col-span-2">Amenities (comma separated)
                <input name="amenities" value={form.amenities} onChange={handleChange} placeholder="WiFi, Laundry, CCTV" className={inputClass} />
              </label>
              <label className="text-sm text-slate-300 sm:col-span-2">Image URLs (one per line)
                <textarea name="images" value={form.images} onChange={handleChange} rows="3" className={inputClass} />
              </label>
            </div>
          </section>

          <div className="hidden" aria-hidden="true">
            <label>Website
              <input name="website" value={form.website} onChange={handleChange} tabIndex={-1} autoComplete="off" />
            </label>
          </div>
          {error && <p role="alert" className="text-sm text-rose-300">{error}</p>}
          <button type="submit" disabled={submitting} className="rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white transition hover:bg-blue-500 disabled:cursor-wait disabled:opacity-60">
            {submitting ? 'Submitting...' : 'Submit for review'}
          </button>
        </form>
      )}
    </section>
  );
};

export default PublicOwnerListingPage;