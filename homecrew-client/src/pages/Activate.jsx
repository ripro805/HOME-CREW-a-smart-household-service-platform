import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/solid';

const Activate = () => {
  const [status, setStatus] = useState('loading');
  const [message, setMessage] = useState('Activating your account...');
  const { uid, token } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    activateAccount();
  }, []);

  const activateAccount = async () => {
    try {
      await api.post('/auth/users/activation/', { uid, token });
      setStatus('success');
      setMessage('Account activated successfully! Redirecting to login...');
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (error) {
      setStatus('error');
      setMessage(error.response?.data?.detail || 'Activation failed. The link may be invalid or expired.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-12">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-md">
        <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">Account Activation</h2>
        
        {status === 'loading' && (
          <div className="text-center py-6">
            <div className="inline-block w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
            <p className="text-gray-600">{message}</p>
          </div>
        )}

        {status === 'success' && (
          <div className="text-center py-6">
            <div className="w-16 h-16 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center text-green-600">
              <CheckCircleIcon className="w-10 h-10" />
            </div>
            <p className="text-gray-600">{message}</p>
          </div>
        )}

        {status === 'error' && (
          <div className="text-center py-6">
            <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center text-red-600">
              <XCircleIcon className="w-10 h-10" />
            </div>
            <p className="text-gray-600 mb-6">{message}</p>
            <button onClick={() => navigate('/register')} className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg transition-colors">
              Try Register Again
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Activate;
