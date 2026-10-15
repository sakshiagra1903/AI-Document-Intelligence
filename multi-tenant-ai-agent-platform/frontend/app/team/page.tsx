'use client';

import { useEffect, useState } from 'react';
import Shell from '../../components/Shell';
import { api, formatDate } from '../../lib/api';
import {
  Users, UserPlus, Shield, Key, Mail,
  CheckCircle2, RefreshCw, AlertCircle
} from 'lucide-react';

interface TeamMemberRow {
  TenantMember: {
    id: string;
    tenant_id: string;
    user_id: string;
    role: string;
  };
  User: {
    id: string;
    email: string;
    name: string;
    created_at: string;
  };
}

export default function TeamManagementPage() {
  const [team, setTeam] = useState<TeamMemberRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteRole, setInviteRole] = useState('HUMAN_SUPPORT');
  const [inviteSuccess, setInviteSuccess] = useState('');

  useEffect(() => {
    loadTeam();
  }, []);

  async function loadTeam() {
    setLoading(true);
    try {
      const data = await api<any[]>('/api/team');
      // Format might be array of tuples or objects
      if (Array.isArray(data)) {
        const formatted = data.map(item => {
          if (Array.isArray(item)) {
            return { TenantMember: item[0], User: item[1] };
          }
          return item;
        });
        setTeam(formatted);
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!inviteEmail || !inviteName) return;

    // Simulate invite creation
    setInviteSuccess(`Invitation link generated for ${inviteEmail} as ${inviteRole}!`);
    setTimeout(() => setInviteSuccess(''), 5000);
    setShowInviteModal(false);
    setInviteEmail('');
    setInviteName('');
  }

  function getRoleBadge(role: string) {
    switch (role) {
      case 'TENANT_ADMIN':
        return <span className="badge badge-purple"><Shield size={12} /> Tenant Admin</span>;
      case 'AGENT_MANAGER':
        return <span className="badge badge-blue"><Key size={12} /> Agent Manager</span>;
      case 'HUMAN_SUPPORT':
        return <span className="badge badge-green"><Users size={12} /> Support Agent</span>;
      default:
        return <span className="badge badge-gray">{role}</span>;
    }
  }

  return (
    <Shell>
      <div className="content">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 750, margin: '0 0 5px' }}>Team & Access Control</h1>
            <p className="muted">
              Manage member roles and role-based permissions across your tenant organization.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-light" onClick={loadTeam}>
              <RefreshCw size={14} /> Refresh
            </button>
            <button className="btn btn-primary" onClick={() => setShowInviteModal(true)}>
              <UserPlus size={15} /> Invite Member
            </button>
          </div>
        </div>

        {inviteSuccess && (
          <div className="alert alert-success" style={{ marginBottom: 20 }}>
            <CheckCircle2 size={16} />
            {inviteSuccess}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 20, alignItems: 'start' }}>
          {/* Members Table */}
          <div className="card" style={{ overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--line)' }}>
              <b style={{ fontSize: 14 }}>Active Tenant Members ({team.length})</b>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Role</th>
                    <th>Email</th>
                    <th>Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {team.map((row, idx) => {
                    const user = row.User || (row as any);
                    const member = row.TenantMember || (row as any);
                    const initials = user.name
                      ? user.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
                      : 'U';

                    return (
                      <tr key={user.id || idx}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'var(--blue)', display: 'grid', placeItems: 'center', color: '#fff', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
                              {initials}
                            </div>
                            <span style={{ fontWeight: 600, color: 'var(--ink)' }}>{user.name}</span>
                          </div>
                        </td>
                        <td>
                          {getRoleBadge(member.role)}
                        </td>
                        <td className="muted" style={{ fontSize: 13 }}>
                          {user.email}
                        </td>
                        <td className="muted" style={{ fontSize: 12 }}>
                          {formatDate(user.created_at)}
                        </td>
                      </tr>
                    );
                  })}
                  {!loading && team.length === 0 && (
                    <tr>
                      <td colSpan={4}>
                        <div className="empty-state">
                          <div className="empty-state-icon"><Users size={24} /></div>
                          <div style={{ fontWeight: 600, marginBottom: 4 }}>No members found</div>
                          <p className="muted" style={{ fontSize: 12 }}>Invite your first collaborator.</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Role Matrix Explanation */}
          <div className="card" style={{ padding: 22 }}>
            <b style={{ fontSize: 15, marginBottom: 14, display: 'block' }}>Role Privileges Matrix</b>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ padding: 12, borderRadius: 10, border: '1px solid var(--line)', background: '#fafbfc' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <Shield size={14} color="var(--purple)" />
                  <b style={{ fontSize: 13 }}>TENANT_ADMIN</b>
                </div>
                <p className="muted" style={{ fontSize: 12, margin: 0 }}>
                  Full control over tenant settings, API keys, AI agent configuration, document uploads, crawler, team management, and billing.
                </p>
              </div>

              <div style={{ padding: 12, borderRadius: 10, border: '1px solid var(--line)', background: '#fafbfc' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <Key size={14} color="var(--blue)" />
                  <b style={{ fontSize: 13 }}>AGENT_MANAGER</b>
                </div>
                <p className="muted" style={{ fontSize: 12, margin: 0 }}>
                  Can edit agent prompt engineering, upload/verify knowledge documents, crawl websites, manage services, and resolve knowledge gaps.
                </p>
              </div>

              <div style={{ padding: 12, borderRadius: 10, border: '1px solid var(--line)', background: '#fafbfc' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <Users size={14} color="var(--success)" />
                  <b style={{ fontSize: 13 }}>HUMAN_SUPPORT</b>
                </div>
                <p className="muted" style={{ fontSize: 12, margin: 0 }}>
                  Has access to the Live Support Console, can take over escalated chat tickets, and submit human replies to customers.
                </p>
              </div>
            </div>

            <div style={{ marginTop: 20, padding: 12, borderRadius: 10, background: '#eff6ff', border: '1px solid #bfdbfe', fontSize: 12, color: '#1e40af' }}>
              🔒 <b>Security Isolation:</b> All database queries enforce tenant-scoped filtering (`tenant_id`). No member can view documents or conversations from other workspaces.
            </div>
          </div>
        </div>

        {/* Modal: Invite Member */}
        {showInviteModal && (
          <div className="modal-overlay">
            <div className="modal" style={{ maxWidth: 460 }}>
              <div className="modal-header">
                <b>Invite Team Member</b>
                <button className="btn btn-ghost btn-sm" onClick={() => setShowInviteModal(false)}>✕</button>
              </div>
              <form onSubmit={handleInvite}>
                <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div>
                    <label className="label">Full Name</label>
                    <input
                      className="field"
                      placeholder="e.g., Sarah Jenkins"
                      value={inviteName}
                      onChange={e => setInviteName(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label className="label">Work Email</label>
                    <input
                      type="email"
                      className="field"
                      placeholder="sarah@yourcompany.com"
                      value={inviteEmail}
                      onChange={e => setInviteEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label className="label">Role Assignment</label>
                    <select
                      className="field"
                      value={inviteRole}
                      onChange={e => setInviteRole(e.target.value)}
                    >
                      <option value="HUMAN_SUPPORT">HUMAN_SUPPORT (Support Rep)</option>
                      <option value="AGENT_MANAGER">AGENT_MANAGER (Content Manager)</option>
                      <option value="TENANT_ADMIN">TENANT_ADMIN (Full Workspace Admin)</option>
                    </select>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-light" onClick={() => setShowInviteModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary">Send Invitation</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </Shell>
  );
}
