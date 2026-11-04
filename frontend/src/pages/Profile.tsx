import React, { useState } from 'react';
import { User, Mail, Hash, ShieldCheck, Home, Edit3, Save, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import type { Gender, Hall } from '../types';

const MALE_HALLS: Hall[] = ['Peter', 'John', 'Paul', 'Daniel', 'Joseph', 'Joshua'];
const FEMALE_HALLS: Hall[] = ['Mary', 'Lydia', 'Deborah'];

export const Profile: React.FC<{ onToast: (type: 'success' | 'error' | 'info', msg: string) => void }> = ({ onToast }) => {
  const { user, updateProfile } = useAuth();

  const [isEditing, setIsEditing] = useState(false);
  const [fullName, setFullName] = useState(user?.fullName || '');
  const [gender, setGender] = useState<Gender>(user?.gender || 'Male');
  const [hall, setHall] = useState<Hall>(user?.hallOfResidence || 'Peter');
  const [roomNumber, setRoomNumber] = useState(user?.roomNumber || '');
  const [saving, setSaving] = useState(false);

  if (!user) {
    return <div className="text-center py-16 text-slate-400">Loading user profile...</div>;
  }

  const handleGenderChange = (newGender: Gender) => {
    setGender(newGender);
    if (newGender === 'Male' && !MALE_HALLS.includes(hall)) {
      setHall('Peter');
    } else if (newGender === 'Female' && !FEMALE_HALLS.includes(hall)) {
      setHall('Mary');
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const res = await updateProfile({
      fullName,
      gender,
      hallOfResidence: hall,
      roomNumber
    });

    if (res.success) {
      onToast('success', 'Profile information updated successfully.');
      setIsEditing(false);
    } else {
      onToast('error', res.error || 'Failed to update profile.');
    }
    setSaving(false);
  };

  const availableHalls = gender === 'Male' ? MALE_HALLS : FEMALE_HALLS;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 flex items-center gap-2">
            <User className="w-7 h-7 text-cu-blue" />
            <span>My Account & Delivery Profile</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Manage your student credentials and Covenant University hostel delivery details.
          </p>
        </div>

        {!isEditing ? (
          <button
            type="button"
            onClick={() => setIsEditing(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-cu-blue hover:bg-cu-dark text-white rounded-xl text-xs font-bold transition shadow-sm"
          >
            <Edit3 className="w-4 h-4" /> Edit Profile
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setIsEditing(false)}
            className="inline-flex items-center gap-1.5 px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-semibold hover:bg-slate-50 transition"
          >
            <X className="w-4 h-4" /> Cancel
          </button>
        )}
      </div>

      {isEditing ? (
        <form onSubmit={handleSave} className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
          <h2 className="text-base font-bold text-slate-900 pb-2 border-b">Edit Personal & Delivery Info</h2>

          <div className="space-y-4 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Full Name</label>
              <input
                type="text"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-cu-blue"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Gender</label>
                <select
                  value={gender}
                  onChange={e => handleGenderChange(e.target.value as Gender)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm bg-white"
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Current Hall of Residence</label>
                <select
                  value={hall}
                  onChange={e => setHall(e.target.value as Hall)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm bg-white"
                >
                  {availableHalls.map(h => (
                    <option key={h} value={h}>{h} Hall</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Room Number</label>
              <input
                type="text"
                value={roomNumber}
                onChange={e => setRoomNumber(e.target.value)}
                required
                placeholder="e.g. B204"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-cu-blue"
              />
            </div>

            <div className="p-3 bg-blue-50 rounded-xl text-blue-900 text-[11px] leading-relaxed">
              <strong>Notice:</strong> Registration Number ({user.regNumber}), Matric Number ({user.matricNumber}), and School Email ({user.schoolEmail}) are verified institutional identifiers that cannot be changed manually.
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 bg-cu-gold hover:bg-cu-goldHover disabled:opacity-50 text-cu-blue font-black rounded-xl text-xs shadow transition flex items-center gap-1.5"
            >
              <Save className="w-4 h-4" /> {saving ? 'Saving Changes...' : 'Save Changes'}
            </button>
          </div>
        </form>
      ) : (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden divide-y divide-slate-100">
          <div className="p-6 bg-slate-50/60 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-cu-blue text-cu-gold font-black text-2xl flex items-center justify-center shadow">
                {user.fullName.charAt(0)}
              </div>
              <div>
                <h2 className="text-xl font-extrabold text-slate-900">{user.fullName}</h2>
                <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                  <span className="font-mono bg-slate-200/80 px-2 py-0.5 rounded text-[11px]">{user.regNumber}</span>
                  <span>•</span>
                  <span className="font-mono text-slate-600 text-[11px]">{user.matricNumber}</span>
                </div>
              </div>
            </div>

            <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 flex items-center gap-1">
              <ShieldCheck className="w-4 h-4" /> Active Student
            </span>
          </div>

          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
            <div className="space-y-4">
              <div className="space-y-1">
                <span className="font-bold text-slate-400 uppercase tracking-wider text-[10px]">Covenant School Email</span>
                <div className="text-sm font-semibold text-slate-900 flex items-center gap-1.5">
                  <Mail className="w-4 h-4 text-cu-blue" />
                  <span>{user.schoolEmail}</span>
                </div>
              </div>

              <div className="space-y-1">
                <span className="font-bold text-slate-400 uppercase tracking-wider text-[10px]">Institutional Registration Number</span>
                <div className="text-sm font-mono text-slate-900 flex items-center gap-1.5">
                  <Hash className="w-4 h-4 text-slate-400" />
                  <span>{user.regNumber}</span>
                </div>
              </div>

              <div className="space-y-1">
                <span className="font-bold text-slate-400 uppercase tracking-wider text-[10px]">Matriculation Number</span>
                <div className="text-sm font-mono text-slate-900 flex items-center gap-1.5">
                  <Hash className="w-4 h-4 text-slate-400" />
                  <span>{user.matricNumber}</span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-1">
                <span className="font-bold text-slate-400 uppercase tracking-wider text-[10px]">Gender</span>
                <div className="text-sm font-semibold text-slate-900">
                  {user.gender}
                </div>
              </div>

              <div className="space-y-1">
                <span className="font-bold text-slate-400 uppercase tracking-wider text-[10px]">Hall of Residence</span>
                <div className="text-sm font-semibold text-slate-900 flex items-center gap-1.5">
                  <Home className="w-4 h-4 text-cu-gold" />
                  <span>{user.hallOfResidence} Hall</span>
                </div>
              </div>

              <div className="space-y-1">
                <span className="font-bold text-slate-400 uppercase tracking-wider text-[10px]">Room Number</span>
                <div className="text-sm font-semibold text-slate-900">
                  Room {user.roomNumber}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
