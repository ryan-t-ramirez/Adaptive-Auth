import { useState } from 'react'
import axios from 'axios'

function App() {
  const [view, setView] = useState('login') // login, register, otp, dashboard
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [email, setEmail] = useState('')
  const [otpCode, setOtpCode] = useState('')
  const [pendingAuthId, setPendingAuthId] = useState(null)
  const [riskData, setRiskData] = useState(null)
  const [message, setMessage] = useState(null)
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)
    try {
      const res = await axios.post('/auth/login', {
        username,
        password,
        device_fingerprint: navigator.userAgent,
      })
      const data = res.data
      setRiskData(data)

      if (data.require_otp) {
        setPendingAuthId(data.pending_auth_id)
        setView('otp')
        setMessage({ type: 'warning', text: `High-risk login detected. Enter OTP to continue. [DEMO MODE] OTP: ${data.otp_code}` })
      } else if (data.success) {
        setView('dashboard')
        setMessage({ type: 'success', text: 'Login successful — low risk.' })
      } else {
        setMessage({ type: 'error', text: data.message })
      }
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Login failed' })
    }
    setLoading(false)
  }

  const handleOtp = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)
    try {
      const res = await axios.post('/auth/verify-otp', {
        pending_auth_id: pendingAuthId,
        otp_code: otpCode,
      })
      if (res.data.success) {
        setView('dashboard')
        setMessage({ type: 'success', text: 'OTP verified. Login complete.' })
        // Keep the original riskData from login — don't overwrite
      } else {
        setMessage({ type: 'error', text: res.data.message })
      }
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'OTP verification failed' })
    }
    setLoading(false)
  }

  const handleRegister = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)
    try {
      const res = await axios.post('/auth/register', { username, email, password })
      if (res.data.success) {
        setMessage({ type: 'success', text: 'Account created. You can now log in.' })
        setView('login')
      } else {
        setMessage({ type: 'error', text: res.data.message })
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Registration failed' })
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-500/10 rounded-2xl mb-4">
            <svg className="w-8 h-8 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white">Adaptive Authentication</h1>
          <p className="text-gray-400 text-sm mt-1">Risk-based authentication framework</p>
        </div>

        {/* Message Banner */}
        {message && (
          <div className={`mb-4 p-3 rounded-lg text-sm ${
            message.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
            message.type === 'warning' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
            'bg-red-500/10 text-red-400 border border-red-500/20'
          }`}>
            {message.text}
          </div>
        )}

        {/* Card */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 shadow-xl">

          {/* Login Form */}
          {view === 'login' && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Username</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
                  placeholder="Enter username"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition pr-11"
                    placeholder="Enter password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition"
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-500/50 text-white font-medium rounded-lg transition"
              >
                {loading ? 'Authenticating...' : 'Sign In'}
              </button>
              <p className="text-center text-sm text-gray-500">
                No account?{' '}
                <button type="button" onClick={() => { setView('register'); setMessage(null) }} className="text-emerald-400 hover:underline">
                  Register
                </button>
              </p>
            </form>
          )}

          {/* Register Form */}
          {view === 'register' && (
            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Username</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
                  placeholder="Choose username"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
                  placeholder="Enter email"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition pr-11"
                    placeholder="Choose password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition"
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-500/50 text-white font-medium rounded-lg transition"
              >
                {loading ? 'Creating account...' : 'Create Account'}
              </button>
              <p className="text-center text-sm text-gray-500">
                Have an account?{' '}
                <button type="button" onClick={() => { setView('login'); setMessage(null) }} className="text-emerald-400 hover:underline">
                  Sign in
                </button>
              </p>
            </form>
          )}

          {/* OTP Form */}
          {view === 'otp' && (
            <form onSubmit={handleOtp} className="space-y-4">
              <div className="text-center mb-2">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-amber-500/10 rounded-xl mb-3">
                  <svg className="w-6 h-6 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <h2 className="text-lg font-semibold text-white">Verify Your Identity</h2>
                <p className="text-gray-400 text-sm">A one-time code has been sent to your email</p>
              </div>
              <div>
                <input
                  type="text"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white text-center text-2xl tracking-widest placeholder-gray-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition"
                  placeholder="000000"
                  maxLength={6}
                  required
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 disabled:bg-amber-500/50 text-white font-medium rounded-lg transition"
              >
                {loading ? 'Verifying...' : 'Verify OTP'}
              </button>

              <button
                type="button"
                onClick={async () => {
                  setMessage(null)
                  try {
                    const res = await axios.post('/auth/login', {
                      username,
                      password,
                      device_fingerprint: navigator.userAgent,
                    })
                    if (res.data.require_otp) {
                      setPendingAuthId(res.data.pending_auth_id)
                      setMessage({ type: 'success', text: 'New OTP sent.' })
                    }
                  } catch (err) {
                    setMessage({ type: 'error', text: 'Failed to resend OTP' })
                  }
                }}
                className="w-full py-2 text-amber-400 hover:text-amber-300 text-sm transition"
              >
                Resend OTP
              </button>

              <button
                type="button"
                onClick={() => { setView('login'); setMessage(null) }}
                className="w-full py-2 text-gray-400 hover:text-white text-sm transition"
              >
                Back to login
              </button>
            </form>
          )}

          {/* Dashboard */}
          {view === 'dashboard' && (
            <div className="space-y-4">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-emerald-500/10 rounded-xl mb-3">
                  <svg className="w-6 h-6 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h2 className="text-lg font-semibold text-white">Welcome, {username}</h2>
                <p className="text-gray-400 text-sm">Authenticated successfully</p>
              </div>

              {/* Risk Summary */}
              {riskData && (
                <div className="bg-gray-800/50 rounded-xl p-4 space-y-3">
                  <h3 className="text-sm font-medium text-gray-300">Risk Assessment</h3>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400 text-sm">Risk Score</span>
                    <span className={`text-sm font-mono font-bold ${
                      riskData.risk_level === 'high' ? 'text-red-400' : 'text-emerald-400'
                    }`}>
                      {riskData.risk_score ?? 0} / 100
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400 text-sm">Risk Level</span>
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                      riskData.risk_level === 'high'
                        ? 'bg-red-500/10 text-red-400'
                        : 'bg-emerald-500/10 text-emerald-400'
                    }`}>
                      {riskData.risk_level?.toUpperCase()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400 text-sm">MFA Required</span>
                    <span className="text-gray-300 text-sm">{riskData.require_otp ? 'Yes' : 'No'}</span>
                  </div>
                </div>
              )}

              <button
                onClick={() => {
                  setView('login')
                  setUsername('')
                  setPassword('')
                  setOtpCode('')
                  setRiskData(null)
                  setMessage(null)
                }}
                className="w-full py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 font-medium rounded-lg transition"
              >
                Sign Out
              </button>
            </div>
          )}

{/* Simulation Result */}
          {view === 'sim-result' && riskData && (
            <div className="space-y-4">
              <div className="text-center">
                <div className={`inline-flex items-center justify-center w-12 h-12 rounded-xl mb-3 ${
                  riskData.risk_level === 'high' ? 'bg-red-500/10' : 'bg-emerald-500/10'
                }`}>
                  <span className="text-2xl">{riskData.risk_level === 'high' ? '🚨' : '✅'}</span>
                </div>
                <h2 className="text-lg font-semibold text-white">
                  {riskData.risk_level === 'high' ? 'High Risk — MFA Required' : 'Low Risk — Access Granted'}
                </h2>
                <p className="text-gray-400 text-sm">Simulated login for {riskData.username}</p>
              </div>

              {/* Score Bar */}
              <div className="bg-gray-800/50 rounded-xl p-4">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-400">Risk Score</span>
                  <span className={`font-mono font-bold ${
                    riskData.risk_score >= 100 ? 'text-red-400' : riskData.risk_score >= 75 ? 'text-amber-400' : 'text-emerald-400'
                  }`}>
                    {riskData.risk_score} / {riskData.threshold}
                  </span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all ${
                      riskData.risk_score >= 100 ? 'bg-red-500' : riskData.risk_score >= 75 ? 'bg-amber-500' : 'bg-emerald-500'
                    }`}
                    style={{ width: `${Math.min((riskData.risk_score / riskData.threshold) * 100, 100)}%` }}
                  />
                </div>
              </div>

              {/* Signal Breakdown */}
              {riskData.signals && (
                <div className="bg-gray-800/50 rounded-xl p-4 space-y-2">
                  <h3 className="text-sm font-medium text-gray-300 mb-2">Signal Breakdown</h3>
                  {Object.entries(riskData.signals).map(([key, val]) => (
                    <div key={key} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${val.flagged ? 'bg-red-400' : 'bg-gray-600'}`} />
                        <span className="text-gray-400 text-sm">{key.replace(/_/g, ' ')}</span>
                      </div>
                      <span className={`text-sm font-mono ${val.flagged ? 'text-red-400' : 'text-gray-600'}`}>
                        +{val.points}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Context */}
              <div className="bg-gray-800/50 rounded-xl p-4 space-y-2">
                <h3 className="text-sm font-medium text-gray-300 mb-2">Login Context</h3>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">IP Address</span>
                  <span className="text-gray-300 font-mono">{riskData.ip_address}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Device</span>
                  <span className="text-gray-300 font-mono text-xs">{riskData.device_fingerprint}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Action</span>
                  <span className={`text-sm font-medium ${
                    riskData.action === 'Require MFA' ? 'text-red-400' : 'text-emerald-400'
                  }`}>{riskData.action}</span>
                </div>
              </div>

              <button
                onClick={() => { setView('login'); setRiskData(null); setMessage(null) }}
                className="w-full py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 font-medium rounded-lg transition"
              >
                Back to Login
              </button>
            </div>
          )}

        </div>

{/* Simulation Panel */}
        <div className="mt-6 bg-gray-900 border border-gray-800 rounded-2xl p-6 shadow-xl">
          <h3 className="text-sm font-medium text-gray-300 mb-1">Demo Simulation Panel</h3>
          <p className="text-xs text-gray-500 mb-4">Test different risk scenarios. Seed button auto-creates demo account</p>

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={async () => {
                setMessage(null)
                try {
                  const res = await axios.post('/demo/simulate-login', null, {
                    params: { username: 'testuser', device_fingerprint: 'home-macbook-pro', ip_address: '192.168.1.100' }
                  })
                  setRiskData(res.data)
                  setView('sim-result')
                } catch (err) {
                  setMessage({ type: 'error', text: 'Simulation failed — register testuser first' })
                }
              }}
              className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-left hover:bg-emerald-500/20 transition"
            >
              <span className="text-emerald-400 text-sm font-medium block">✓ Trusted Login</span>
              <span className="text-gray-500 text-xs">Known device, clean IP</span>
            </button>

            <button
              onClick={async () => {
                setMessage(null)
                try {
                  const res = await axios.post('/demo/simulate-login', null, {
                    params: { username: 'testuser', device_fingerprint: 'brand-new-iphone-xyz', ip_address: '192.168.1.100' }
                  })
                  setRiskData(res.data)
                  setView('sim-result')
                } catch (err) {
                  setMessage({ type: 'error', text: 'Simulation failed — register testuser first' })
                }
              }}
              className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-left hover:bg-amber-500/20 transition"
            >
              <span className="text-amber-400 text-sm font-medium block">⚠ New Device</span>
              <span className="text-gray-500 text-xs">Unrecognized device</span>
            </button>

            <button
              onClick={async () => {
                setMessage(null)
                try {
                  const res = await axios.post('/demo/simulate-login', null, {
                    params: { username: 'testuser', device_fingerprint: 'suspicious-device', ip_address: '192.168.99.1' }
                  })
                  setRiskData(res.data)
                  setView('sim-result')
                } catch (err) {
                  setMessage({ type: 'error', text: 'Simulation failed — register testuser first' })
                }
              }}
              className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-left hover:bg-red-500/20 transition"
            >
              <span className="text-red-400 text-sm font-medium block">✕ Blacklisted IP</span>
              <span className="text-gray-500 text-xs">Known malicious IP</span>
            </button>

            <button
              onClick={async () => {
                setMessage(null)
                try {
                  const res = await axios.post('/demo/simulate-login', null, {
                    params: {
                      username: 'testuser',
                      device_fingerprint: 'foreign-device',
                      ip_address: '192.168.99.1',
                      location_lat: 55.7558,
                      location_lon: 37.6173,
                    }
                  })
                  setRiskData(res.data)
                  setView('sim-result')
                } catch (err) {
                  setMessage({ type: 'error', text: 'Simulation failed — register testuser and seed history first' })
                }
              }}
              className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-left hover:bg-red-500/20 transition"
            >
              <span className="text-red-400 text-sm font-medium block">🌍 Impossible Travel</span>
              <span className="text-gray-500 text-xs">Moscow + blacklisted IP</span>
            </button>
          </div>

          {/* Seed Data Button */}
          <button
            onClick={async () => {
              try {
                const res = await axios.post('/demo/seed-login-history', null, {
                  params: { username: 'testuser' }
                })
                setMessage({ type: 'success', text: res.data.message })
              } catch (err) {
                setMessage({ type: 'error', text: 'Seed failed — register testuser first' })
              }
            }}
            className="mt-3 w-full py-2 bg-gray-800 hover:bg-gray-700 text-gray-400 text-xs rounded-lg transition"
          >
            Seed Login History (required for impossible travel demo)
          </button>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-gray-600 mt-6">
          Adaptive Authentication Framework — Ryan Ramirez
        </p>
      </div>
    </div>
  )
}

export default App
