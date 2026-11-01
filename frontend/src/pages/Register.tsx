import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { UserPlus } from 'lucide-react';
import type { Gender, Hall } from '../types';
import { useAuth } from '../context/AuthContext';

const MALE_HALLS: Hall[] = ['Peter', 'John', 'Paul', 'Daniel', 'Joseph', 'Joshua'];
const FEMALE_HALLS: Hall[] = ['Mary', 'Lydia', 'Deborah'];

export const Register: React.FC<{ onToast: (type: 'success' | 'error' | 'info', msg: string) => void }> = ({ onToast }) => {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState('');
  const [regNumber, setRegNumber] = useState('');
  const [matricNumber, setMatricNumber] = useState('');
  const [schoolEmail, setSchoolEmail] = useState('');
  const [gender, setGender] = useState<Gender>('Male');
  const [hall, setHall] = useState<Hall>('Peter');
  const [roomNumber, setRoomNumber] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleGenderChange = (g: Gender) => {
    setGender(g);
    if (g === 'Male' && !MALE_HALLS.includes(hall)) setHall('Peter');
    if (g === 'Female' && !FEMALE_HALLS.includes(hall)) setHall('Mary');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!schoolEmail.trim().toLowerCase().endsWith('@stu.cu.edu.ng')) {
      onToast('error', 'Only @stu.cu.edu.ng Covenant University emails are accepted.');
      return;
    }

    setSubmitting(true);
    const res = await register({
      fullName,
      regNumber,
      matricNumber,
      schoolEmail,
      gender,
      hallOfResidence: hall,
      roomNumber,
      password
    });

    if (res.success) {
      onToast('success', 'Account created! Welcome to eBron.');
      navigate('/');
    } else {
      onToast('error', res.error || 'Registration failed');
    }
    setSubmitting(false);
  };

  const halls = gender === 'Male' ? MALE_HALLS : FEMALE_HALLS;

  return (
    <div className="max-w-xl mx-auto px-4 py-12">
      <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-xl space-y-6">
        <div className="text-center space-y-1">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-cu-blue text-white flex items-center justify-center font-black text-xl">
            eB
          </div>
          <h1 className="text-2xl font-black text-slate-900">Student Registration</h1>
          <p className="text-xs text-slate-500">Covenant University Student Verification</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">Full Name *</label>
            <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} required placeholder="e.g. David Oyedepo" className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Reg Number *</label>
              <input type="text" value={regNumber} onChange={e => setRegNumber(e.target.value)} required placeholder="e.g. 21AB0123" className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm" />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Matric Number *</label>
              <input type="text" value={matricNumber} onChange={e => setMatricNumber(e.target.value)} required placeholder="e.g. CU/21/0123" className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm" />
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">CU Student Email (@stu.cu.edu.ng) *</label>
            <input type="email" value={schoolEmail} onChange={e => setSchoolEmail(e.target.value)} required placeholder="david.oyedepo@stu.cu.edu.ng" className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Gender *</label>
              <select value={gender} onChange={e => handleGenderChange(e.target.value as Gender)} className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white">
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </select>
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Hall of Residence *</label>
              <select value={hall} onChange={e => setHall(e.target.value as Hall)} className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white">
                {halls.map(h => <option key={h} value={h}>{h} Hall</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Room Number *</label>
            <input type="text" value={roomNumber} onChange={e => setRoomNumber(e.target.value)} required placeholder="e.g. A203" className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm" />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Password *</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="At least 6 characters" className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm" />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 bg-cu-gold hover:bg-cu-goldHover text-cu-blue font-extrabold rounded-xl text-xs shadow-md transition flex items-center justify-center gap-1.5"
          >
            <UserPlus className="w-4 h-4" /> {submitting ? 'Registering...' : 'Complete Registration'}
          </button>
        </form>

        <div className="text-center text-xs text-slate-500 pt-2 border-t">
          Already registered?{' '}
          <Link to="/login" className="text-cu-blue font-bold hover:underline">
            Sign In here
          </Link>
        </div>
      </div>
    </div>
  );
};
