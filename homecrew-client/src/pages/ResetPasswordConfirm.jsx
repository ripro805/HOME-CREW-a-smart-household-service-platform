import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../api/axios';
import { LockClosedIcon, CheckCircleIcon, XCircleIcon, EyeIcon, EyeSlashIcon } from '@heroicons/react/24/solid';

const ResetPasswordConfirm = () => {
  const { uid, token } = useParams();
  const navigate = useNavigate();

  const [newPassword, setNewPassword] = useState('');
  const [reNewPassword, setReNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState('idle'); // idle | loading | success | error
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (newPassword !== reNewPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }
    if (newPassword.length < 8) {
      setErrorMsg('Password must be at least 8 characters.');
      return;
    }

    setStatus('loading');
    setErrorMsg('');

    try {
      await api.post('/auth/users/reset_password_confirm/', {
        uid,
        token,
        new_password: newPassword,
        re_new_password: reNewPassword,
      });
      setStatus('success');
    } catch (error) {
      setStatus('error');
      const data = error.response?.data;
      if (data?.new_password) {
        setErrorMsg(Array.isArray(data.new_password) ? data.new_password.join(' ') : data.new_password);
      } else if (data?.token) {
        setErrorMsg('Reset link is invalid or has expired. Please request a new one.');
      } else if (data?.detail) {
        setErrorMsg(data.detail);
      } else {
        setErrorMsg('Something went wrong. Please try again or request a new reset link.');
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-12">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-md">
        <div className="flex items-center justify-center mb-6">
          <div className="w-14 h-14 bg-teal-100 rounded-full flex items-center justify-center">
            <LockClosedIcon className="w-7 h-7 text-teal-600" />
          </div>
        </div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2 text-center">Set New Password</h2>
        <p className="text-sm text-gray-500 text-center mb-8">Enter a new password for your account.</p>

        {status === 'success' ? (
          <div className="text-center py-4">
            <div className="w-16 h-16 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircleIcon className="w-10 h-10 text-green-600" />
            </div>
            <p className="text-gray-700 font-semibold mb-2">Password reset successfully!</p>
            <p className="text-gray-500 text-sm mb-6">You can now log in with your new password.</p>
            <Link to="/login" className="btn btn-primary btn-block">
              Go to Login
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="new_password" className="block text-sm font-semibold text-gray-700 mb-1">
                New Password
              </label>
              <div className="relative">
                <input
                  id="new_password"
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={8}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none pr-10"
                  placeholder="At least 8 characters"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeSlashIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="re_new_password" className="block text-sm font-semibold text-gray-700 mb-1">
                Confirm New Password
              </label>
              <input
                id="re_new_password"
                type={showPassword ? 'text' : 'password'}
                value={reNewPassword}
                onChange={(e) => setReNewPassword(e.target.value)}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none"
                placeholder="Repeat new password"
              />
            </div>

            {(errorMsg || status === 'error') && (
              <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
                <XCircleIcon className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <span>{errorMsg || 'Failed to reset password. The link may be invalid or expired.'}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={status === 'loading'}
              className="btn btn-primary btn-lg btn-block mt-2"
            >
              {status === 'loading' ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Resetting…
                </>
              ) : (
                <>
                  <LockClosedIcon className="w-5 h-5" />
                  Reset Password
                </>
              )}
            </button>

            <p className="text-center text-sm text-gray-500 mt-2">
              Remembered your password?{' '}
              <Link to="/login" className="text-teal-600 hover:underline font-semibold">
                Log in
              </Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
};

export default ResetPasswordConfirm;
