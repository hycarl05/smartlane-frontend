import React, { useState } from 'react';

export default function LoginScreen({ onLogin }) {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (!username.trim() || !password.trim()) {
      setError('Please enter both username and password');
      return;
    }

    setIsLoading(true);

    setTimeout(() => {
      if (username === 'admin' && password === 'admin123') {
        setIsLoading(false);
        onLogin({ name: 'System Admin', username: 'admin', role: 'Control Centre Admin' });
      } else {
        setIsLoading(false);
        setError('Invalid credentials. Use admin / admin123');
      }
    }, 500);
  };

  return (
    <div className="split-login-container" id="screen-login">
      {/* Visual / Image Side */}
      <div className="login-image-side">
        <img src="/hero.jpg" alt="PLUS Highway SmartLane" className="login-bg-img" />
        <div className="login-image-overlay" />
        <div className="image-side-content">
          <div className="hero-badge">
            <span className="live-pulse"></span>
            PLUS INTELLIGENT TRAFFIC SYSTEM
          </div>
          <h1 className="hero-title">PLUS SMARTLANE Control Centre</h1>
          <p className="hero-description">
            Real-time emergency lane dynamic activation, LCS gantry automation &amp; incident response.
          </p>
          <div className="hero-stats-row">
            <div className="hero-stat">
              <span className="stat-val">8</span>
              <span className="stat-lbl">Active Corridors</span>
            </div>
            <div className="hero-stat">
              <span className="stat-val">99.4%</span>
              <span className="stat-lbl">Sensor Uptime</span>
            </div>
            <div className="hero-stat">
              <span className="stat-val">&lt;2min</span>
              <span className="stat-lbl">Incident Response</span>
            </div>
          </div>
        </div>
      </div>

      {/* Form Side */}
      <div className="login-form-side">
        <div className="login-form-box">
          <div className="login-brand">
            <div className="brand-mark large">P</div>
            <div className="brand-text">
              <b>PLUS SMARTLANE</b>
              <span>CONTROL CENTRE · DAYLIGHT UI</span>
            </div>
          </div>

          <div className="login-header">
            <h2>Sign in to Control Centre</h2>
            <p>Authorized highway operations &amp; engineering access only</p>
          </div>

          {error && <div className="login-error-alert">{error}</div>}

          <form onSubmit={handleSubmit} className="login-form">
            <div className="form-group">
              <label htmlFor="username">Staff ID / Username</label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. admin"
                autoComplete="username"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">Security Password</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                required
              />
            </div>

            <div className="login-hint">
              Demo access: <code>admin</code> / <code>admin123</code>
            </div>

            <button type="submit" className="login-submit-btn" disabled={isLoading}>
              {isLoading ? 'Authenticating...' : 'Sign In to Control Centre →'}
            </button>
          </form>

          <div className="login-footer">
            <span>PLUS Malaysia Berhad · v2.4</span>
            <span>Secured Session</span>
          </div>
        </div>
      </div>
    </div>
  );
}
