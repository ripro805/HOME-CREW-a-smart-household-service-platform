import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import './Profile.css';

const Profile = () => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone_number: '',
    address: '',
  });
  
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    fetchProfile();
  }, [isAuthenticated]);

  const fetchProfile = async () => {
    try {
      const response = await api.get('/accounts/profile/');
      setProfile(response.data);
      setFormData({
        first_name: response.data.first_name || '',
        last_name: response.data.last_name || '',
        email: response.data.email || '',
        phone_number: response.data.phone_number || '',
        address: response.data.address || '',
      });
    } catch (error) {
      console.error('Failed to fetch profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      await api.patch(`/users/${profile.id}/`, formData);
      alert('Profile updated successfully!');
      setEditing(false);
      fetchProfile();
    } catch (error) {
      console.error('Failed to update profile:', error);
      alert('Failed to update profile');
    }
  };

  if (loading) {
    return <div className="loading">Loading profile...</div>;
  }

  if (!profile) {
    return <div className="error">Failed to load profile</div>;
  }

  return (
    <div className="profile-page">
      <div className="profile-container">
        <div className="profile-header">
          <div className="profile-avatar">
            {profile.first_name?.charAt(0)}{profile.last_name?.charAt(0)}
          </div>
          <div className="profile-title">
            <h1>{profile.first_name} {profile.last_name}</h1>
            <span className="profile-role">{profile.role}</span>
          </div>
        </div>

        {!editing ? (
          <div className="profile-view">
            <div className="profile-section">
              <h2>Personal Information</h2>
              
              <div className="info-group">
                <label>Email</label>
                <p>{profile.email}</p>
              </div>

              <div className="info-group">
                <label>Phone Number</label>
                <p>{profile.phone_number || 'Not provided'}</p>
              </div>

              <div className="info-group">
                <label>Address</label>
                <p>{profile.address || 'Not provided'}</p>
              </div>

              <div className="info-group">
                <label>Member Since</label>
                <p>{new Date(profile.date_joined).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}</p>
              </div>
            </div>

            <button onClick={() => setEditing(true)} className="btn-edit">
              Edit Profile
            </button>
          </div>
        ) : (
          <div className="profile-edit">
            <h2>Edit Profile</h2>
            
            <form onSubmit={handleSubmit}>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="first_name">First Name</label>
                  <input
                    type="text"
                    id="first_name"
                    name="first_name"
                    value={formData.first_name}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="last_name">Last Name</label>
                  <input
                    type="text"
                    id="last_name"
                    name="last_name"
                    value={formData.last_name}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="email">Email</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  disabled
                />
                <small>Email cannot be changed</small>
              </div>

              <div className="form-group">
                <label htmlFor="phone_number">Phone Number</label>
                <input
                  type="tel"
                  id="phone_number"
                  name="phone_number"
                  value={formData.phone_number}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group">
                <label htmlFor="address">Address</label>
                <textarea
                  id="address"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  rows="3"
                />
              </div>

              <div className="form-actions">
                <button type="submit" className="btn-save">
                  Save Changes
                </button>
                <button 
                  type="button" 
                  onClick={() => {
                    setEditing(false);
                    fetchProfile();
                  }}
                  className="btn-cancel"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

export default Profile;
