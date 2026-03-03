import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import { EnvelopeIcon, CheckCircleIcon } from '@heroicons/react/24/outline';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('idle'); // idle | loading | success | error
  const [message, setMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus('loading');
    setMessage('');
    try {
      await api.post('/auth/users/reset_password/', { email });
      setStatus('success');
      setMessage('Password reset link sent! Please check your inbox.');
    } catch (err) {
      // Djoser returns 204 even for unknown emails (security best practice)
      // so treat any non-network error as success too
      if (err.response?.status === 400) {
        setStatus('error');
        setMessage(err.response.data?.email?.[0] || 'Invalid email address.');
      } else {
        setStatus('success');
        setMessage('If an account with that email exists, a reset link has been sent.');
      }
    }
  };

  const inputCls = "w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition";

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-12">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-md">

        <div className="flex items-center justify-center w-16 h-16 bg-teal-50 rounded-2xl mx-auto mb-5">
          <EnvelopeIcon className="w-8 h-8 text-teal-600" />
        </div>

        <h2 className="text-2xl font-bold text-gray-800 mb-2 text-center">Forgot Password?</h2>
        <p className="text-sm text-gray-500 text-center mb-6">
          Enter your email and we'll send you a link to reset your password.
        </p>

        {status === 'success' ? (
          <div className="text-center py-4">
            <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircleIcon className="w-9 h-9 text-green-500" />
            </div>
            <p className="text-gray-700 font-medium mb-6">{message}</p>
            <Link to="/login" className="btn btn-primary btn-sm">Back to Login</Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {status === 'error' && (
              <div className="px-4 py-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm">{message}</div>
            )}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                placeholder="Enter your registered email"
                className={inputCls}
              />
            </div>
            <button
              type="submit"
              disabled={status === 'loading'}
              className="btn btn-primary btn-lg btn-block mt-2"
            >
              {status === 'loading' ? 'Sending…' : 'Send Reset Link'}
            </button>
          </form>
        )}

        <p className="text-center text-sm text-gray-500 mt-5">
          Remember your password?{' '}
          <Link to="/login" className="text-teal-600 font-semibold hover:underline">Back to Login</Link>
        </p>
      </div>
    </div>
  );
};

export default ForgotPassword;
