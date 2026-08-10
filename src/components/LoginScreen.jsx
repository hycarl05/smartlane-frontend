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
        setError('Invalid username or password (use admin / admin123)');
      }
    }, 600);
  };

  return (
    <div className="split-login-container">
      {/* LEFT: Image Visual Panel */}
      <div className="login-image-side">
        <div className="login-image-overlay"></div>
        <img
          src="/highway-hero.jpg"
          alt="PLUS Smartlane Highway Traffic Control"
          className="login-bg-img"
        />
        <div className="image-side-content">
          <div className="hero-badge">
            <span className="live-pulse"></span> PLUS INTELLIGENT TRAFFIC SYSTEM
          </div>
          <h1 className="hero-title">Automated Smartlane Management</h1>
          <p className="hero-description">
            Real-time highway congestion monitoring, automated LCS gantry control &amp; incident dispatch across key Malaysian expressways.
          </p>
          <div className="hero-stats-row">
            <div className="hero-stat">
              <span className="stat-val">4</span>
              <span className="stat-lbl">Active Corridors</span>
            </div>
            <div className="hero-stat">
              <span className="stat-val">24/7</span>
              <span className="stat-lbl">Gantry Operations</span>
            </div>
            <div className="hero-stat">
              <span className="stat-val">99.8%</span>
              <span className="stat-lbl">System Uptime</span>
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT: Login Form Panel */}
      <div className="login-form-side">
        <div className="login-form-box">
          <div className="login-brand">
            <div className="brand-mark large">P</div>
            <div className="brand-text">
              <b>SMARTLANE CONTROL CENTRE</b>
              <span>PLUS MALAYSIA · A MEMBER OF UEM</span>
            </div>
          </div>

          <div className="login-header">
            <h2>Administrator Sign In</h2>
            <p>Enter your authorized credentials to access live traffic controls</p>
          </div>

          {error && <div className="login-error-alert">{error}</div>}

          <form onSubmit={handleSubmit} className="login-form">
            <div className="form-group">
              <label htmlFor="username">Username or Staff ID</label>
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
              <span>Demo Credentials:</span> <code>admin</code> / <code>admin123</code>
            </div>

            <button type="submit" className="login-submit-btn" disabled={isLoading}>
              {isLoading ? 'Authenticating...' : 'Sign In to Control Centre →'}
            </button>
          </form>

          <div className="login-footer">
            <span>PLUS Smartlane Infrastructure v2.4</span>
            <span>Encrypted Session · Secured Portal</span>
          </div>
        </div>
      </div>
    </div>
  );
}
