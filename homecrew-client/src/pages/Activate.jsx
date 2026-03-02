import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import './Auth.css';

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
    <div className="auth-container">
      <div className="auth-card">
        <h2>Account Activation</h2>
        
        {status === 'loading' && (
          <div className="activation-message loading">
            <div className="spinner"></div>
            <p>{message}</p>
          </div>
        )}

        {status === 'success' && (
          <div className="activation-message success">
            <div className="icon">✓</div>
            <p>{message}</p>
          </div>
        )}

        {status === 'error' && (
          <div className="activation-message error">
            <div className="icon">✗</div>
            <p>{message}</p>
            <button onClick={() => navigate('/register')} className="btn-primary">
              Try Register Again
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Activate;
