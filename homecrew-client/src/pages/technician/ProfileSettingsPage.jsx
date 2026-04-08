import { useEffect, useState } from 'react';

export default function ProfileSettingsPage({ profile, onSaveProfile }) {
  const [form, setForm] = useState(profile);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setForm(profile);
  }, [profile]);

  const onChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setSaved(false);
  };

  const onSubmit = (e) => {
    e.preventDefault();
    onSaveProfile(form);
    setSaved(true);
  };

  return (
    <section className="space-y-5">
      <div>
        <h3 className="text-2xl font-bold text-slate-800">Profile Settings</h3>
        <p className="text-sm text-slate-500 mt-1">Update your technician information and work profile details.</p>
      </div>

      <form onSubmit={onSubmit} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Full Name" value={form.name} onChange={(v) => onChange('name', v)} />
          <Field label="Email" value={form.email} onChange={(v) => onChange('email', v)} />
          <Field label="Phone" value={form.phone} onChange={(v) => onChange('phone', v)} />
          <Field label="Experience" value={form.experience} onChange={(v) => onChange('experience', v)} />
          <Field label="Skills" value={form.skills} onChange={(v) => onChange('skills', v)} />
          <Field label="Location" value={form.location} onChange={(v) => onChange('location', v)} />
        </div>

        <div className="flex items-center gap-3">
          <button type="submit" className="px-5 py-2.5 rounded-xl bg-teal-600 text-white font-semibold hover:bg-teal-700">
            Save Profile
          </button>
          {saved && <span className="text-sm font-semibold text-green-600">Profile updated successfully.</span>}
        </div>
      </form>
    </section>
  );
}

function Field({ label, value, onChange }) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-slate-700">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-teal-500"
      />
    </label>
  );
}
