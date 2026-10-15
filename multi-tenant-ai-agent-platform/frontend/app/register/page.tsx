'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Sparkles, Eye, EyeOff, Building2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { api } from '../../lib/api';

const INDUSTRIES = [
  'Technology',
  'Healthcare',
  'Finance',
  'Retail',
  'Education',
  'Legal',
  'Real Estate',
  'Other',
] as const;

type Industry = (typeof INDUSTRIES)[number];

interface FormState {
  name: string;
  email: string;
  password: string;
  business_name: string;
  website: string;
  industry: Industry | '';
  description: string;
}

function getPasswordStrength(pw: string): { score: number; label: string; color: string } {
  if (!pw) return { score: 0, label: '', color: '#334155' };
  let score = 0;
  if (pw.length >= 8)  score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;

  if (score <= 1) return { score, label: 'Very weak', color: '#ef4444' };
  if (score === 2) return { score, label: 'Weak',      color: '#f97316' };
  if (score === 3) return { score, label: 'Fair',      color: '#eab308' };
  if (score === 4) return { score, label: 'Strong',    color: '#22c55e' };
  return              { score, label: 'Very strong', color: '#6366f1' };
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.6rem 0.75rem',
  background: 'rgba(30,41,59,0.8)',
  border: '1px solid rgba(99,102,241,0.3)',
  borderRadius: '0.5rem',
  color: '#f1f5f9',
  fontSize: '0.875rem',
  outline: 'none',
  transition: 'border-color 0.2s',
  boxSizing: 'border-box',
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="field" style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
      <label className="label">{label}</label>
      {children}
    </div>
  );
}

export default function RegisterPage() {
  const router = useRouter();

  const [form, setForm] = useState<FormState>({
    name:          '',
    email:         '',
    password:      '',
    business_name: '',
    website:       '',
    industry:      '',
    description:   '',
  });

  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [success, setSuccess]   = useState(false);

  const strength = getPasswordStrength(form.password);

  function set(key: keyof FormState) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm(prev => ({ ...prev, [key]: e.target.value }));
  }

  function validate(): string {
    if (!form.name.trim())          return 'Your name is required.';
    if (!form.email.trim())         return 'Email address is required.';
    if (!/\S+@\S+\.\S+/.test(form.email)) return 'Please enter a valid email address.';
    if (!form.password)             return 'Password is required.';
    if (form.password.length < 8)   return 'Password must be at least 8 characters.';
    if (!form.business_name.trim()) return 'Business name is required.';
    if (!form.industry)             return 'Please select an industry.';
    return '';
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const validationError = validate();
    if (validationError) { setError(validationError); return; }
    setError('');
    setLoading(true);

    try {
      const payload: Record<string, string> = {
        name:          form.name.trim(),
        email:         form.email.trim(),
        password:      form.password,
        business_name: form.business_name.trim(),
        industry:      form.industry,
      };
      if (form.website.trim())     payload.website     = form.website.trim();
      if (form.description.trim()) payload.description = form.description.trim();

      const data = await api<{ access_token: string; refresh_token: string }>(
        '/api/auth/register',
        { method: 'POST', body: JSON.stringify(payload) }
      );

      localStorage.setItem('access_token', data.access_token);
      localStorage.setItem('refresh_token', data.refresh_token);
      setSuccess(true);

      // Brief delay so the success state is visible
      setTimeout(() => router.push('/dashboard'), 800);
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  const focusStyle = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    e.target.style.borderColor = 'rgba(99,102,241,0.7)';
  };
  const blurStyle = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    e.target.style.borderColor = 'rgba(99,102,241,0.3)';
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem 1.5rem',
        background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)',
      }}
    >
      {/* Decorative blobs */}
      <div
        aria-hidden
        style={{
          position: 'fixed',
          top: '-8rem',
          left: '-8rem',
          width: '36rem',
          height: '36rem',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(99,102,241,0.14) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />
      <div
        aria-hidden
        style={{
          position: 'fixed',
          bottom: '-8rem',
          right: '-8rem',
          width: '36rem',
          height: '36rem',
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
          maxWidth: '680px',
          background: 'rgba(15,23,42,0.88)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(99,102,241,0.25)',
          borderRadius: '1.25rem',
          padding: '2.5rem 2.25rem',
          boxShadow: '0 25px 60px rgba(0,0,0,0.55)',
          zIndex: 1,
        }}
      >
        {/* Logo / Header */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
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

          <div
            style={{
              marginTop: '1rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
            }}
          >
            <Building2 size={18} color="#6366f1" />
            <h1 style={{ fontSize: '1.35rem', fontWeight: 700, color: '#f1f5f9', margin: 0 }}>
              Create your organization
            </h1>
          </div>
          <p style={{ color: '#64748b', fontSize: '0.875rem', marginTop: '0.3rem' }}>
            Get started with a free workspace in minutes
          </p>
        </div>

        {/* Success banner */}
        {success && (
          <div
            className="alert alert-success"
            style={{ marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <CheckCircle2 size={16} />
            <span>Account created! Redirecting to your dashboard…</span>
          </div>
        )}

        {/* Error banner */}
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
        <form onSubmit={handleSubmit} noValidate>
          {/* Row 1: Name + Email */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '1rem',
              marginBottom: '1rem',
            }}
          >
            <Field label="Your name *">
              <input
                type="text"
                autoComplete="name"
                value={form.name}
                onChange={set('name')}
                placeholder="Jane Smith"
                style={inputStyle}
                onFocus={focusStyle}
                onBlur={blurStyle}
              />
            </Field>

            <Field label="Email address *">
              <input
                type="email"
                autoComplete="email"
                value={form.email}
                onChange={set('email')}
                placeholder="jane@company.com"
                style={inputStyle}
                onFocus={focusStyle}
                onBlur={blurStyle}
              />
            </Field>
          </div>

          {/* Row 2: Password (full width with strength) */}
          <div style={{ marginBottom: '1rem' }}>
            <Field label="Password *">
              <div style={{ position: 'relative' }}>
                <input
                  type={showPass ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={form.password}
                  onChange={set('password')}
                  placeholder="Min. 8 characters"
                  style={{ ...inputStyle, paddingRight: '2.75rem' }}
                  onFocus={focusStyle}
                  onBlur={blurStyle}
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
            </Field>

            {/* Strength bar */}
            {form.password && (
              <div style={{ marginTop: '0.5rem' }}>
                <div
                  style={{
                    display: 'flex',
                    gap: '0.3rem',
                    marginBottom: '0.25rem',
                  }}
                >
                  {[1, 2, 3, 4, 5].map(i => (
                    <div
                      key={i}
                      style={{
                        flex: 1,
                        height: '4px',
                        borderRadius: '2px',
                        background: i <= strength.score ? strength.color : 'rgba(51,65,85,0.6)',
                        transition: 'background 0.3s',
                      }}
                    />
                  ))}
                </div>
                <p style={{ fontSize: '0.75rem', color: strength.color, margin: 0 }}>
                  {strength.label}
                </p>
              </div>
            )}
          </div>

          {/* Row 3: Business name + Website */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '1rem',
              marginBottom: '1rem',
            }}
          >
            <Field label="Business name *">
              <input
                type="text"
                value={form.business_name}
                onChange={set('business_name')}
                placeholder="Acme Corp"
                style={inputStyle}
                onFocus={focusStyle}
                onBlur={blurStyle}
              />
            </Field>

            <Field label="Website (optional)">
              <input
                type="url"
                value={form.website}
                onChange={set('website')}
                placeholder="https://acme.com"
                style={inputStyle}
                onFocus={focusStyle}
                onBlur={blurStyle}
              />
            </Field>
          </div>

          {/* Row 4: Industry (full width) */}
          <div style={{ marginBottom: '1rem' }}>
            <Field label="Industry *">
              <select
                value={form.industry}
                onChange={set('industry')}
                style={{
                  ...inputStyle,
                  appearance: 'none',
                  backgroundImage:
                    "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E\")",
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'right 0.75rem center',
                  paddingRight: '2.25rem',
                  cursor: 'pointer',
                }}
                onFocus={focusStyle}
                onBlur={blurStyle}
              >
                <option value="" disabled>
                  Select your industry
                </option>
                {INDUSTRIES.map(ind => (
                  <option key={ind} value={ind} style={{ background: '#1e293b' }}>
                    {ind}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          {/* Row 5: Description (full width) */}
          <div style={{ marginBottom: '1.5rem' }}>
            <Field label="Description (optional)">
              <textarea
                value={form.description}
                onChange={set('description')}
                rows={3}
                placeholder="Tell us briefly what your business does…"
                style={{
                  ...inputStyle,
                  resize: 'vertical',
                  minHeight: '80px',
                  fontFamily: 'inherit',
                }}
                onFocus={focusStyle as any}
                onBlur={blurStyle as any}
              />
            </Field>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading || success}
            className="btn btn-primary btn-lg"
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              background:
                loading || success
                  ? 'rgba(99,102,241,0.5)'
                  : 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
              border: 'none',
              cursor: loading || success ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? (
              <>
                <span className="spinner-sm" />
                Creating workspace…
              </>
            ) : success ? (
              <>
                <CheckCircle2 size={16} />
                Done!
              </>
            ) : (
              <>
                <Building2 size={16} />
                Create organization
              </>
            )}
          </button>
        </form>

        {/* Divider + login link */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            margin: '1.5rem 0',
          }}
        >
          <div style={{ flex: 1, height: '1px', background: 'rgba(99,102,241,0.15)' }} />
          <span style={{ color: '#475569', fontSize: '0.75rem' }}>Already have an account?</span>
          <div style={{ flex: 1, height: '1px', background: 'rgba(99,102,241,0.15)' }} />
        </div>

        <Link
          href="/login"
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
          Sign in to existing workspace
        </Link>

        <p style={{ textAlign: 'center', color: '#334155', fontSize: '0.72rem', marginTop: '1.5rem' }}>
          © {new Date().getFullYear()} AgentOS — All rights reserved
        </p>
      </div>
    </div>
  );
}
