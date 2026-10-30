import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { getProfile, updateProfile } from '../api/authApi.js';
import { authUserUpdated } from '../store/authSlice.js';
import Loader from '../components/Loader.jsx';

const initialForm = (user) => ({
  name: user?.name || '',
  email: user?.email || '',
  phone: user?.phone || '',
  college: user?.studentProfile?.college || '',
  course: user?.studentProfile?.course || '',
  yearOfStudy: user?.studentProfile?.yearOfStudy || '',
  budget: user?.preferences?.budget || '',
  city: user?.preferences?.city || '',
  categories: (user?.preferences?.categories || []).join(', '),
  businessName: user?.ownerProfile?.businessName || '',
  businessAddress: user?.ownerProfile?.businessAddress || '',
  website: user?.ownerProfile?.website || '',
  department: user?.adminProfile?.department || '',
  designation: user?.adminProfile?.designation || ''
});

const Field = ({ label, name, value, onChange, ...inputProps }) => (
  <label className="block text-sm text-slate-300">
    {label}
    <input
      name={name}
      value={value}
      onChange={onChange}
      className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 text-white outline-none focus:border-blue-400"
      {...inputProps}
    />
  </label>
);

const ProfilePage = () => {
  const dispatch = useDispatch();
  const user = useSelector((state) => state.auth.user);
  const [form, setForm] = useState(() => initialForm(user));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    let active = true;
    const fetchProfile = async () => {
      try {
        const { data } = await getProfile();
        if (active) setForm(initialForm(data));
      } catch (requestError) {
        if (active) {
          setError(requestError.response?.data?.message || 'Unable to load your profile. Please try again.');
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    if (user) fetchProfile();
    return () => {
      active = false;
    };
  }, [user]);

  if (!user) return <Navigate to="/login" replace />;

  const handleChange = (event) => {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setMessage('');
    setSaving(true);

    const profile = {
      name: form.name.trim(),
      phone: form.phone.trim()
    };
    if (user.role === 'student') {
      profile.studentProfile = {
        college: form.college.trim(),
        course: form.course.trim(),
        yearOfStudy: form.yearOfStudy
      };
      profile.preferences = {
        budget: form.budget,
        city: form.city.trim(),
        categories: form.categories.split(',').map((category) => category.trim()).filter(Boolean)
      };
    } else if (user.role === 'owner') {
      profile.ownerProfile = {
        businessName: form.businessName.trim(),
        businessAddress: form.businessAddress.trim(),
        website: form.website.trim()
      };
    } else if (user.role === 'admin') {
      profile.adminProfile = {
        department: form.department.trim(),
        designation: form.designation.trim()
      };
    }

    try {
      const { data } = await updateProfile(profile);
      dispatch(authUserUpdated(data));
      setForm(initialForm(data));
      setMessage('Profile updated successfully.');
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to update your profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <section className="mx-auto max-w-4xl px-6 pb-20 pt-4">
        <Loader message="Loading your profile..." />
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-4xl px-6 pb-20 pt-4 text-white">
      <header className="mb-8">
        <p className="text-sm uppercase tracking-[0.24em] text-blue-300">{user.role} account</p>
        <h1 className="mt-2 text-4xl font-semibold">Your profile</h1>
        <p className="mt-3 text-slate-400">Add or update your account details. Your email and role cannot be changed here.</p>
      </header>

      <form onSubmit={handleSubmit} className="glass-card space-y-8 rounded-[32px] border border-white/10 p-8 shadow-glass sm:p-10">
        <section>
          <h2 className="mb-5 text-xl font-semibold">Basic information</h2>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Full name" name="name" value={form.name} onChange={handleChange} required maxLength={100} autoComplete="name" />
            <Field label="Email address" name="email" value={form.email} readOnly aria-readonly="true" />
            <Field
              label={`Phone number${user.role === 'owner' ? ' (required)' : ''}`}
              name="phone"
              value={form.phone}
              onChange={handleChange}
              type="tel"
              maxLength={30}
              minLength={user.role === 'owner' ? 7 : undefined}
              autoComplete="tel"
              placeholder="Add your phone number"
              required={user.role === 'owner'}
            />
          </div>
        </section>

        {user.role === 'student' && (
          <section>
            <h2 className="mb-5 text-xl font-semibold">Student details & stay preferences</h2>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="College / university" name="college" value={form.college} onChange={handleChange} maxLength={120} placeholder="College or university" />
              <Field label="Course / program" name="course" value={form.course} onChange={handleChange} maxLength={120} placeholder="Course or program" />
              <Field label="Year of study" name="yearOfStudy" value={form.yearOfStudy} onChange={handleChange} type="number" min="1" max="10" placeholder="e.g. 2" />
              <Field label="Preferred city" name="city" value={form.city} onChange={handleChange} maxLength={100} placeholder="City where you want to stay" />
              <Field label="Monthly budget (₹)" name="budget" value={form.budget} onChange={handleChange} type="number" min="0" placeholder="Your monthly budget" />
              <Field label="Preferred property types" name="categories" value={form.categories} onChange={handleChange} placeholder="PG, hostel, shared room" />
            </div>
            <p className="mt-3 text-xs text-slate-500">Separate property types with commas.</p>
          </section>
        )}

        {user.role === 'owner' && (
          <section>
            <h2 className="mb-5 text-xl font-semibold">Owner / business details</h2>
            <p className="mb-5 text-sm text-slate-400">Complete the required owner details before saving. Website is optional.</p>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Business / listing name (required)" name="businessName" value={form.businessName} onChange={handleChange} required maxLength={120} placeholder="Business or listing name" />
              <Field label="Website (optional)" name="website" value={form.website} onChange={handleChange} type="url" maxLength={200} placeholder="https://example.com" />
              <div className="sm:col-span-2">
                <label className="block text-sm text-slate-300">
                  Business address
                  <textarea
                    name="businessAddress"
                    value={form.businessAddress}
                    onChange={handleChange}
                    rows="3"
                    required
                    maxLength={300}
                    placeholder="Business or correspondence address"
                    className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 text-white outline-none focus:border-blue-400"
                  />
                </label>
              </div>
            </div>
          </section>
        )}

        {user.role === 'admin' && (
          <section>
            <h2 className="mb-5 text-xl font-semibold">Administrator details</h2>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Department" name="department" value={form.department} onChange={handleChange} maxLength={120} placeholder="Department (optional)" />
              <Field label="Designation" name="designation" value={form.designation} onChange={handleChange} maxLength={120} placeholder="Designation (optional)" />
            </div>
          </section>
        )}

        {error && <p role="alert" className="rounded-2xl border border-rose-400/30 bg-rose-500/10 p-4 text-sm text-rose-200">{error}</p>}
        {message && <p role="status" className="rounded-2xl border border-emerald-400/30 bg-emerald-500/10 p-4 text-sm text-emerald-200">{message}</p>}

        <div className="flex flex-wrap gap-3">
          <button type="submit" disabled={saving} className="rounded-full bg-gradient-to-r from-blue-500 to-purple-600 px-6 py-3 font-semibold text-white disabled:cursor-wait disabled:opacity-60">
            {saving ? 'Saving...' : 'Save profile'}
          </button>
          <Link to="/dashboard" className="rounded-full border border-white/10 px-6 py-3 text-slate-200 hover:border-blue-400 hover:text-white">Back to dashboard</Link>
        </div>
      </form>
    </section>
  );
};

export default ProfilePage;
