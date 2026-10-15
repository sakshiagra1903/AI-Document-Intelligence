'use client';

import { useEffect, useState } from 'react';
import Shell from '../../components/Shell';
import { api, formatDate, formatCurrency } from '../../lib/api';
import {
  CalendarDays, Clock, DollarSign, Plus, CheckCircle,
  AlertCircle, RefreshCw, Filter, CreditCard, ChevronRight,
  TrendingUp, Tag, ShieldCheck, Users
} from 'lucide-react';

interface ServiceOffering {
  id: string;
  name: string;
  description: string;
  duration_minutes: number;
  price: number;
  currency: string;
  active: boolean;
}

interface Appointment {
  id: string;
  customer_name: string;
  customer_email: string;
  customer_phone?: string;
  service_name: string;
  start_at: string;
  end_at: string;
  status: string;
  requires_payment: boolean;
  amount: number;
  currency: string;
  payment_status: string;
}

interface BookingSettings {
  booking_mode: 'free' | 'paid';
  payment_provider: 'demo' | 'stripe';
  currency: string;
  slot_duration_minutes: number;
  business_timezone: string;
  opening_hour: number;
  closing_hour: number;
}

export default function BookingsManagementPage() {
  const [tab, setTab] = useState<'appointments' | 'services' | 'analytics'>('appointments');
  const [settings, setSettings] = useState<BookingSettings | null>(null);
  const [services, setServices] = useState<ServiceOffering[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [monthlyData, setMonthlyData] = useState<any[]>([]);
  const [timeData, setTimeData] = useState<any[]>([]);
  const [catData, setCatData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter
  const [statusFilter, setStatusFilter] = useState<'all' | 'confirmed' | 'pending_payment'>('all');

  // Add Service Form
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [serviceName, setServiceName] = useState('');
  const [serviceDesc, setServiceDesc] = useState('');
  const [serviceDuration, setServiceDuration] = useState(30);
  const [servicePrice, setServicePrice] = useState(500);
  const [savingService, setSavingService] = useState(false);

  // Settings Feedback
  const [alertMsg, setAlertMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadAll();
  }, []);

  async function loadAll() {
    setLoading(true);
    try {
      const [s, sv, a, m, t, c] = await Promise.all([
        api<BookingSettings>('/api/tenant/settings/booking'),
        api<ServiceOffering[]>('/api/booking/services'),
        api<Appointment[]>('/api/appointments'),
        api<any[]>('/api/analytics/bookings/monthly').catch(() => []),
        api<any[]>('/api/analytics/bookings/time-wise').catch(() => []),
        api<any[]>('/api/analytics/bookings/category').catch(() => [])
      ]);
      setSettings(s);
      setServices(sv || []);
      setAppointments(a || []);
      setMonthlyData(m || []);
      setTimeData(t || []);
      setCatData(c || []);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleToggleMode() {
    if (!settings) return;
    const newMode = settings.booking_mode === 'paid' ? 'free' : 'paid';
    try {
      const updated = await api<BookingSettings>('/api/tenant/settings/booking', {
        method: 'PUT',
        body: JSON.stringify({ ...settings, booking_mode: newMode })
      });
      setSettings(updated);
      setAlertMsg({ type: 'success', text: `Booking policy switched to ${newMode.toUpperCase()} mode!` });
      setTimeout(() => setAlertMsg(null), 4000);
    } catch (err: any) {
      setAlertMsg({ type: 'error', text: err.message || 'Failed to update settings' });
    }
  }

  async function handleAddService(e: React.FormEvent) {
    e.preventDefault();
    if (!serviceName.trim()) return;
    setSavingService(true);
    try {
      const newS = await api<ServiceOffering>('/api/booking/services', {
        method: 'POST',
        body: JSON.stringify({
          name: serviceName.trim(),
          description: serviceDesc.trim(),
          duration_minutes: serviceDuration,
          price: servicePrice,
          currency: settings?.currency || 'INR',
          active: true
        })
      });
      setServices(prev => [...prev, newS]);
      setShowServiceModal(false);
      setServiceName('');
      setServiceDesc('');
      setAlertMsg({ type: 'success', text: 'Service offering added successfully!' });
      setTimeout(() => setAlertMsg(null), 4000);
    } catch (err: any) {
      setAlertMsg({ type: 'error', text: err.message || 'Failed to create service' });
    } finally {
      setSavingService(false);
    }
  }

  const filteredAppointments = appointments.filter(a => {
    if (statusFilter === 'all') return true;
    return a.status === statusFilter;
  });

  const confirmedCount = appointments.filter(a => a.status === 'confirmed').length;
  const pendingCount = appointments.filter(a => a.status === 'pending_payment').length;

  return (
    <Shell>
      <div className="content">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 750, margin: '0 0 5px' }}>Bookings & Scheduling</h1>
            <p className="muted">
              Conversational calendar slots, automated payments, and service offering management.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            {settings && (
              <button
                className={`btn ${settings.booking_mode === 'paid' ? 'btn-primary' : 'btn-light'}`}
                onClick={handleToggleMode}
              >
                <CreditCard size={15} />
                Mode: {settings.booking_mode === 'paid' ? 'Paid Required' : 'Free Bookings'} (Click to Switch)
              </button>
            )}
            <button className="btn btn-primary" onClick={() => setShowServiceModal(true)}>
              <Plus size={15} /> Add Service
            </button>
          </div>
        </div>

        {alertMsg && (
          <div className={`alert ${alertMsg.type === 'success' ? 'alert-success' : 'alert-error'}`} style={{ marginBottom: 18 }}>
            {alertMsg.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
            {alertMsg.text}
          </div>
        )}

        {/* Overview Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }} className="grid-cols-4">
          <div className="card stat">
            <div className="stat-label">Confirmed Appointments</div>
            <div className="stat-value" style={{ color: 'var(--success)' }}>{confirmedCount}</div>
            <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>Scheduled & locked</div>
          </div>
          <div className="card stat">
            <div className="stat-label">Pending Checkout</div>
            <div className="stat-value" style={{ color: pendingCount > 0 ? 'var(--warning)' : 'var(--ink)' }}>
              {pendingCount}
            </div>
            <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>Awaiting payment confirmation</div>
          </div>
          <div className="card stat">
            <div className="stat-label">Active Services</div>
            <div className="stat-value">{services.length}</div>
            <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>Offered in conversational agent</div>
          </div>
          <div className="card stat">
            <div className="stat-label">Payment Gateway</div>
            <div className="stat-value" style={{ fontSize: 22, textTransform: 'uppercase', color: 'var(--blue)', marginTop: 10 }}>
              {settings?.payment_provider || 'Demo'}
            </div>
            <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>Currency: {settings?.currency || 'INR'}</div>
          </div>
        </div>

        {/* Tabs */}
        <div className="tabs" style={{ marginBottom: 20 }}>
          <button className={`tab ${tab === 'appointments' ? 'active' : ''}`} onClick={() => setTab('appointments')}>
            <CalendarDays size={14} style={{ display: 'inline', marginRight: 6 }} />
            Appointments ({appointments.length})
          </button>
          <button className={`tab ${tab === 'services' ? 'active' : ''}`} onClick={() => setTab('services')}>
            <Tag size={14} style={{ display: 'inline', marginRight: 6 }} />
            Service Catalog ({services.length})
          </button>
          <button className={`tab ${tab === 'analytics' ? 'active' : ''}`} onClick={() => setTab('analytics')}>
            <TrendingUp size={14} style={{ display: 'inline', marginRight: 6 }} />
            Booking Intelligence
          </button>
        </div>

        {/* Tab 1: Appointments Table */}
        {tab === 'appointments' && (
          <div className="card" style={{ overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  className={`btn btn-sm ${statusFilter === 'all' ? 'btn-primary' : 'btn-light'}`}
                  onClick={() => setStatusFilter('all')}
                >
                  All ({appointments.length})
                </button>
                <button
                  className={`btn btn-sm ${statusFilter === 'confirmed' ? 'btn-primary' : 'btn-light'}`}
                  onClick={() => setStatusFilter('confirmed')}
                >
                  Confirmed ({confirmedCount})
                </button>
                <button
                  className={`btn btn-sm ${statusFilter === 'pending_payment' ? 'btn-primary' : 'btn-light'}`}
                  onClick={() => setStatusFilter('pending_payment')}
                >
                  Pending Payment ({pendingCount})
                </button>
              </div>

              <button className="btn btn-light btn-sm" onClick={loadAll}>
                <RefreshCw size={13} />
              </button>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>Customer</th>
                    <th>Service Offering</th>
                    <th>Start Time</th>
                    <th>Payment</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAppointments.map(ap => (
                    <tr key={ap.id}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{ap.customer_name}</div>
                        <div className="muted" style={{ fontSize: 12 }}>{ap.customer_email}</div>
                      </td>
                      <td>
                        <span className="badge badge-purple">{ap.service_name}</span>
                      </td>
                      <td style={{ fontSize: 13 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <Clock size={13} className="muted" />
                          {formatDate(ap.start_at)}
                        </div>
                      </td>
                      <td>
                        {ap.requires_payment ? (
                          <div>
                            <span style={{ fontWeight: 600 }}>{formatCurrency(ap.amount, ap.currency)}</span>
                            <span className={`badge ${ap.payment_status === 'paid' ? 'badge-green' : 'badge-orange'}`} style={{ marginLeft: 6, fontSize: 11 }}>
                              {ap.payment_status}
                            </span>
                          </div>
                        ) : (
                          <span className="badge badge-gray">Free / Not Required</span>
                        )}
                      </td>
                      <td>
                        <span className={`badge ${ap.status === 'confirmed' ? 'badge-green' : 'badge-orange'}`}>
                          {ap.status === 'confirmed' ? '✓ Confirmed' : ap.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {!loading && filteredAppointments.length === 0 && (
                    <tr>
                      <td colSpan={5}>
                        <div className="empty-state">
                          <div className="empty-state-icon"><CalendarDays size={24} /></div>
                          <div style={{ fontWeight: 600, marginBottom: 4 }}>No appointments yet</div>
                          <p className="muted" style={{ fontSize: 12 }}>
                            Customers can book appointments conversing with your AI support agent.
                          </p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 2: Services Catalog */}
        {tab === 'services' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
            {services.map(s => (
              <div key={s.id} className="card" style={{ padding: 20, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                    <b style={{ fontSize: 16, color: 'var(--ink)' }}>{s.name}</b>
                    <span className="badge badge-green">{s.active ? 'Active' : 'Inactive'}</span>
                  </div>
                  <p className="muted" style={{ fontSize: 13, marginBottom: 16 }}>
                    {s.description || 'No description provided.'}
                  </p>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 14, borderTop: '1px solid var(--line)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
                    <Clock size={14} className="muted" />
                    <span>{s.duration_minutes} mins</span>
                  </div>
                  <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--blue)' }}>
                    {s.price > 0 ? formatCurrency(s.price, s.currency) : 'Free'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Tab 3: Intelligence Charts */}
        {tab === 'analytics' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 20 }}>
            {/* Monthly Trend */}
            <div className="card" style={{ padding: 22 }}>
              <b style={{ fontSize: 15, marginBottom: 14, display: 'block' }}>Monthly Booking Trend</b>
              {monthlyData.length > 0 ? (
                <div className="bar-chart" style={{ height: 160, alignItems: 'flex-end', display: 'flex', gap: 12 }}>
                  {monthlyData.map((m, idx) => {
                    const max = Math.max(...monthlyData.map(d => d.bookings), 1);
                    const pct = Math.max((m.bookings / max) * 100, 8);
                    return (
                      <div key={idx} style={{ flex: 1, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 11, fontWeight: 600 }}>{m.bookings}</span>
                        <div style={{ width: '100%', height: `${pct}%`, background: 'var(--blue)', borderRadius: '6px 6px 0 0', minHeight: 6 }} />
                        <span className="muted" style={{ fontSize: 11 }}>{m.month.slice(5)}</span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="empty-state">
                  <p className="muted">No monthly booking records to chart yet.</p>
                </div>
              )}
            </div>

            {/* Hourly Distribution */}
            <div className="card" style={{ padding: 22 }}>
              <b style={{ fontSize: 15, marginBottom: 14, display: 'block' }}>Peak Booking Hours</b>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {timeData.slice(0, 5).map((t, idx) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #f2f4f7', fontSize: 13 }}>
                    <span style={{ fontWeight: 500 }}>{t.label}</span>
                    <span className="badge badge-blue">{t.bookings} bookings</span>
                  </div>
                ))}
                {timeData.length === 0 && (
                  <div className="empty-state">
                    <p className="muted">Peak hours will appear as appointments are made.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Modal: Add Service */}
        {showServiceModal && (
          <div className="modal-overlay">
            <div className="modal" style={{ maxWidth: 480 }}>
              <div className="modal-header">
                <b>Add Service Offering</b>
                <button className="btn btn-ghost btn-sm" onClick={() => setShowServiceModal(false)}>✕</button>
              </div>
              <form onSubmit={handleAddService}>
                <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div>
                    <label className="label">Service Name</label>
                    <input
                      className="field"
                      placeholder="e.g., General Consultation, Technical Review"
                      value={serviceName}
                      onChange={e => setServiceName(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label className="label">Description</label>
                    <textarea
                      className="field"
                      rows={2}
                      placeholder="Brief summary of what this appointment covers..."
                      value={serviceDesc}
                      onChange={e => setServiceDesc(e.target.value)}
                    />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div>
                      <label className="label">Duration (Minutes)</label>
                      <input
                        type="number"
                        min="15"
                        step="15"
                        className="field"
                        value={serviceDuration}
                        onChange={e => setServiceDuration(Number(e.target.value))}
                        required
                      />
                    </div>
                    <div>
                      <label className="label">Price ({settings?.currency || 'INR'})</label>
                      <input
                        type="number"
                        min="0"
                        className="field"
                        value={servicePrice}
                        onChange={e => setServicePrice(Number(e.target.value))}
                        required
                      />
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-light" onClick={() => setShowServiceModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary" disabled={savingService}>
                    {savingService ? 'Saving...' : 'Create Service'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </Shell>
  );
}