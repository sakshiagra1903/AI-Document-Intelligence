'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Sparkles, Eye, EyeOff, LogIn, AlertCircle } from 'lucide-react';
import { api } from '../../lib/api';

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail]       = useState('demo@example.com');
  const [password, setPassword] = useState('Demo123!');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!email.trim()) { setError('Email is required.'); return; }
    if (!password)     { setError('Password is required.'); return; }

    setLoading(true);
    try {
      const data = await api<{ access_token: string; refresh_token: string }>(
        '/api/auth/login',
        {
          method: 'POST',
          body: JSON.stringify({ email: email.trim(), password }),
        }
      );
      localStorage.setItem('access_token', data.access_token);
      localStorage.setItem('refresh_token', data.refresh_token);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem',
        background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)',
      }}
    >
      {/* Decorative blobs */}
      <div
        aria-hidden
        style={{
          position: 'fixed',
          top: '-10rem',
          right: '-10rem',
          width: '40rem',
          height: '40rem',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />
      <div
        aria-hidden
        style={{
          position: 'fixed',
          bottom: '-10rem',
          left: '-10rem',
          width: '40rem',
          height: '40rem',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(139,92,246,0.12) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />

      {/* Card */}
      <div
        className="animate-fade-in"
        style={{
          width: '100%',
          maxWidth: '440px',
          background: 'rgba(15,23,42,0.85)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(99,102,241,0.25)',
          borderRadius: '1.25rem',
          padding: '2.5rem 2rem',
          boxShadow: '0 25px 50px rgba(0,0,0,0.5)',
          zIndex: 1,
        }}
      >
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              marginBottom: '0.75rem',
            }}
          >
            <div
              style={{
                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                borderRadius: '0.625rem',
                padding: '0.5rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Sparkles size={22} color="#fff" />
            </div>
            <span
              style={{
                fontSize: '1.5rem',
                fontWeight: 800,
                background: 'linear-gradient(90deg, #a5b4fc, #c4b5fd)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                letterSpacing: '-0.02em',
              }}
            >
              AgentOS
            </span>
          </div>
          <p style={{ color: '#94a3b8', fontSize: '0.8rem', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            Enterprise AI Support Platform
          </p>
          <h1
            style={{
              marginTop: '1.25rem',
              fontSize: '1.375rem',
              fontWeight: 700,
              color: '#f1f5f9',
            }}
          >
            Welcome back
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.875rem', marginTop: '0.25rem' }}>
            Sign in to your workspace
          </p>
        </div>

        {/* Error */}
        {error && (
          <div
            className="alert alert-error"
            style={{ marginBottom: '1.25rem', display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}
          >
            <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '1px' }} />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
          {/* Email */}
          <div className="field">
            <label className="label" htmlFor="email">
              Email address
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@company.com"
              style={{
                width: '100%',
                padding: '0.6rem 0.75rem',
                background: 'rgba(30,41,59,0.8)',
                border: '1px solid rgba(99,102,241,0.3)',
                borderRadius: '0.5rem',
                color: '#f1f5f9',
                fontSize: '0.9rem',
                outline: 'none',
                transition: 'border-color 0.2s',
              }}
              onFocus={e => (e.target.style.borderColor = 'rgba(99,102,241,0.7)')}
              onBlur={e => (e.target.style.borderColor = 'rgba(99,102,241,0.3)')}
            />
          </div>

          {/* Password */}
          <div className="field">
            <label className="label" htmlFor="password">
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <input
                id="password"
                type={showPass ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                style={{
                  width: '100%',
                  padding: '0.6rem 2.75rem 0.6rem 0.75rem',
                  background: 'rgba(30,41,59,0.8)',
                  border: '1px solid rgba(99,102,241,0.3)',
                  borderRadius: '0.5rem',
                  color: '#f1f5f9',
                  fontSize: '0.9rem',
                  outline: 'none',
                  transition: 'border-color 0.2s',
                  boxSizing: 'border-box',
                }}
                onFocus={e => (e.target.style.borderColor = 'rgba(99,102,241,0.7)')}
                onBlur={e => (e.target.style.borderColor = 'rgba(99,102,241,0.3)')}
              />
              <button
                type="button"
                onClick={() => setShowPass(v => !v)}
                aria-label={showPass ? 'Hide password' : 'Show password'}
                style={{
                  position: 'absolute',
                  right: '0.75rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#64748b',
                  display: 'flex',
                  alignItems: 'center',
                  padding: 0,
                }}
              >
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary btn-lg"
            style={{
              marginTop: '0.5rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              background: loading
                ? 'rgba(99,102,241,0.5)'
                : 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
              border: 'none',
              cursor: loading ? 'not-allowed' : 'pointer',
              width: '100%',
            }}
          >
            {loading ? (
              <>
                <span className="spinner-sm" />
                Signing in…
              </>
            ) : (
              <>
                <LogIn size={16} />
                Sign in
              </>
            )}
          </button>
        </form>

        {/* Divider */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            margin: '1.5rem 0',
          }}
        >
          <div style={{ flex: 1, height: '1px', background: 'rgba(99,102,241,0.15)' }} />
          <span style={{ color: '#475569', fontSize: '0.75rem' }}>Don't have an account?</span>
          <div style={{ flex: 1, height: '1px', background: 'rgba(99,102,241,0.15)' }} />
        </div>

        <Link
          href="/register"
          style={{
            display: 'block',
            textAlign: 'center',
            padding: '0.6rem',
            border: '1px solid rgba(99,102,241,0.35)',
            borderRadius: '0.5rem',
            color: '#a5b4fc',
            fontSize: '0.875rem',
            fontWeight: 500,
            textDecoration: 'none',
            transition: 'background 0.2s, border-color 0.2s',
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(99,102,241,0.1)';
            (e.currentTarget as HTMLAnchorElement).style.borderColor = 'rgba(99,102,241,0.6)';
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLAnchorElement).style.background = 'transparent';
            (e.currentTarget as HTMLAnchorElement).style.borderColor = 'rgba(99,102,241,0.35)';
          }}
        >
          Create a new organization
        </Link>

        <p style={{ textAlign: 'center', color: '#334155', fontSize: '0.72rem', marginTop: '1.5rem' }}>
          © {new Date().getFullYear()} AgentOS — All rights reserved
        </p>
      </div>
    </div>
  );
}
