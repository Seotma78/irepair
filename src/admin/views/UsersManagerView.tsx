import React, { useState, useEffect } from 'react';
import { useAdmin } from '../context/AdminContext';
import { 
  Users, 
  UserPlus, 
  Key, 
  Trash2, 
  ShieldCheck, 
  Activity, 
  Check, 
  AlertCircle,
  X,
  Lock,
  Mail,
  UserCheck
} from 'lucide-react';

export const UsersManagerView: React.FC = () => {
  const { adminUser, updateUser } = useAdmin();
  const [users, setUsers] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'users' | 'profile' | 'logs'>('users');
  const [loading, setLoading] = useState(true);

  // Add User Modal
  const [addUserOpen, setAddUserOpen] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserRole, setNewUserRole] = useState<'super_admin' | 'admin' | 'editor'>('editor');
  const [newUserForcePassword, setNewUserForcePassword] = useState(true);

  // My Profile
  const [profileEmail, setProfileEmail] = useState(adminUser?.email || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [profileNewPassword, setProfileNewPassword] = useState('');
  const [profileMessage, setProfileMessage] = useState<{ text: string; error?: boolean } | null>(null);

  // Reset Password Modal
  const [resetModalUserId, setResetModalUserId] = useState<string | null>(null);
  const [resetNewPassword, setResetNewPassword] = useState('');
  const [userToDelete, setUserToDelete] = useState<any | null>(null);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/users', {
        headers: { Authorization: `Bearer ${localStorage.getItem('admin_token') || ''}` },
      });
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } catch (e) {
      console.error('Failed to fetch users:', e);
    } finally {
      setLoading(false);
    }
  };

  const fetchLogs = async () => {
    try {
      const res = await fetch('/api/admin/users/activity-logs', {
        headers: { Authorization: `Bearer ${localStorage.getItem('admin_token') || ''}` },
      });
      if (res.ok) {
        const data = await res.json();
        setLogs(data);
      }
    } catch (e) {
      console.error('Failed to load logs:', e);
    }
  };

  useEffect(() => {
    if (activeTab === 'users') fetchUsers();
    if (activeTab === 'logs') fetchLogs();
  }, [activeTab]);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('admin_token') || ''}`,
        },
        body: JSON.stringify({
          email: newUserEmail,
          password: newUserPassword,
          role: newUserRole,
          must_change_password: newUserForcePassword,
        }),
      });

      if (res.ok) {
        setAddUserOpen(false);
        setNewUserEmail('');
        setNewUserPassword('');
        fetchUsers();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to create user');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${localStorage.getItem('admin_token') || ''}` },
      });
      if (res.ok) {
        setUserToDelete(null);
        fetchUsers();
      } else {
        const err = await res.json().catch(() => ({}));
        console.error('Cannot delete user:', err.error);
        setUserToDelete(null);
      }
    } catch (e) {
      console.error(e);
      setUserToDelete(null);
    }
  };

  const handleToggleActive = async (user: any) => {
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('admin_token') || ''}`,
        },
        body: JSON.stringify({
          is_active: !user.is_active,
        }),
      });

      if (res.ok) {
        fetchUsers();
      } else {
        const err = await res.json();
        alert(err.error || 'Cannot modify user');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetModalUserId || !resetNewPassword) return;

    try {
      const res = await fetch(`/api/admin/users/${resetModalUserId}/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('admin_token') || ''}`,
        },
        body: JSON.stringify({ newPassword: resetNewPassword }),
      });

      if (res.ok) {
        alert('Password has been reset. The user will be required to change it on their next login.');
        setResetModalUserId(null);
        setResetNewPassword('');
        fetchUsers();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileMessage(null);

    // If changing password
    if (profileNewPassword) {
      if (!currentPassword) {
        setProfileMessage({ text: 'Please enter your current password.', error: true });
        return;
      }
      try {
        const res = await fetch('/api/auth/change-password', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('admin_token') || ''}`,
          },
          body: JSON.stringify({ currentPassword, newPassword: profileNewPassword }),
        });

        const data = await res.json();
        if (!res.ok) {
          setProfileMessage({ text: data.error || 'Failed to update password', error: true });
          return;
        }
        setProfileMessage({ text: 'Password updated successfully!' });
        setCurrentPassword('');
        setProfileNewPassword('');
      } catch (e) {
        setProfileMessage({ text: 'Failed to update password', error: true });
        return;
      }
    }

    // If changing email
    if (profileEmail && profileEmail !== adminUser?.email) {
      try {
        const res = await fetch('/api/auth/profile', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('admin_token') || ''}`,
          },
          body: JSON.stringify({ email: profileEmail }),
        });

        const data = await res.json();
        if (res.ok && data.user) {
          updateUser(data.user);
          setProfileMessage({ text: 'Profile details saved successfully!' });
        }
      } catch (e) {
        setProfileMessage({ text: 'Failed to update email address', error: true });
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Staff & Permissions</h1>
          <p className="text-xs text-slate-500 mt-1">Manage admin roles, enforce password policies, and view activity logs</p>
        </div>

        {activeTab === 'users' && adminUser?.role === 'super_admin' && (
          <button
            onClick={() => setAddUserOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-[#DF0C88] hover:bg-[#C50875] text-white text-xs font-bold shadow-sm hover:shadow-md flex items-center gap-1.5 cursor-pointer self-start"
          >
            <UserPlus className="w-4 h-4" />
            <span>Create New User</span>
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('users')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'users' ? 'bg-[#DF0C88] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Staff Accounts</span>
        </button>

        <button
          onClick={() => setActiveTab('profile')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'profile' ? 'bg-[#DF0C88] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          <UserCheck className="w-4 h-4" />
          <span>My Profile & Password</span>
        </button>

        <button
          onClick={() => setActiveTab('logs')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'logs' ? 'bg-[#DF0C88] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>System Activity Log</span>
        </button>
      </div>

      {/* TAB 1: USERS LIST */}
      {activeTab === 'users' && (
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs divide-y divide-slate-100 overflow-hidden">
          {loading ? (
            <div className="text-center py-20 text-slate-400">Loading accounts...</div>
          ) : (
            users.map((user) => (
              <div key={user.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-pink-50 text-[#DF0C88] flex items-center justify-center font-bold text-sm shrink-0">
                    {user.email.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-sm text-slate-900">{user.email}</h3>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        user.role === 'super_admin'
                          ? 'bg-purple-100 text-purple-800'
                          : user.role === 'admin'
                          ? 'bg-sky-100 text-sky-800'
                          : 'bg-slate-100 text-slate-700'
                      }`}>
                        {user.role.replace('_', ' ')}
                      </span>
                      {!user.is_active && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
                          Inactive
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Created: {new Date(user.created_at).toLocaleDateString()}
                      {user.must_change_password ? ' • (Must change password on next login)' : ''}
                    </p>
                  </div>
                </div>

                {adminUser?.role === 'super_admin' && (
                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <button
                      onClick={() => handleToggleActive(user)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer ${
                        user.is_active
                          ? 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                          : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700'
                      }`}
                    >
                      {user.is_active ? 'Deactivate' : 'Activate'}
                    </button>

                    <button
                      onClick={() => setResetModalUserId(user.id)}
                      className="px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      <Key className="w-3 h-3" />
                      <span>Reset Password</span>
                    </button>

                    {user.id !== adminUser.id && (
                      <button
                        onClick={() => setUserToDelete(user)}
                        className="p-1.5 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer transition-colors"
                        title="Delete user"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* TAB 2: MY PROFILE */}
      {activeTab === 'profile' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-xs max-w-xl">
          <h2 className="font-bold text-base text-slate-900 mb-1">Update Personal Credentials</h2>
          <p className="text-xs text-slate-500 mb-6">Change your login email address and security password</p>

          {profileMessage && (
            <div className={`p-4 rounded-2xl text-xs font-semibold flex items-center gap-2 mb-5 ${
              profileMessage.error ? 'bg-rose-50 text-rose-800 border border-rose-200' : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
            }`}>
              {profileMessage.error ? <AlertCircle className="w-4 h-4 text-rose-600" /> : <Check className="w-4 h-4 text-emerald-600" />}
              <span>{profileMessage.text}</span>
            </div>
          )}

          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Email Address</label>
              <input
                type="email"
                required
                value={profileEmail}
                onChange={(e) => setProfileEmail(e.target.value)}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#DF0C88]"
              />
            </div>

            <div className="pt-4 border-t border-slate-100">
              <h3 className="font-bold text-xs uppercase tracking-wider text-slate-500 mb-3">Change Password</h3>
              
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Current Password</label>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter current password to verify"
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#DF0C88]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">New Password</label>
                  <input
                    type="password"
                    value={profileNewPassword}
                    onChange={(e) => setProfileNewPassword(e.target.value)}
                    placeholder="Minimum 8 characters"
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#DF0C88]"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              className="px-6 py-2.5 bg-[#DF0C88] hover:bg-[#C50875] text-white text-xs font-bold rounded-xl cursor-pointer shadow-sm transition-all"
            >
              Save Profile Changes
            </button>
          </form>
        </div>
      )}

      {/* TAB 3: ACTIVITY LOGS */}
      {activeTab === 'logs' && (
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs divide-y divide-slate-100 overflow-hidden">
          {logs.map((log) => (
            <div key={log.id} className="p-4 flex items-start justify-between gap-4 text-xs">
              <div>
                <span className="font-bold text-slate-900">{log.action}</span>
                <span className="text-slate-400 text-[11px] ml-2">by {log.user_email}</span>
                <p className="text-[11px] font-mono text-slate-500 mt-1">
                  {JSON.stringify(log.details)}
                </p>
              </div>
              <span className="text-[11px] text-slate-400 shrink-0">
                {new Date(log.created_at).toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Modal: Add User */}
      {addUserOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl border border-slate-200">
            <h3 className="font-black text-lg text-slate-900 mb-1">Create Staff User</h3>
            <p className="text-xs text-slate-500 mb-4">Add a new staff member with assigned permissions</p>

            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Email</label>
                <input
                  type="email"
                  required
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  placeholder="colleague@irepair-mobiles.co.uk"
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Temporary Password</label>
                <input
                  type="password"
                  required
                  value={newUserPassword}
                  onChange={(e) => setNewUserPassword(e.target.value)}
                  placeholder="Minimum 8 characters"
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Role</label>
                <select
                  value={newUserRole}
                  onChange={(e) => setNewUserRole(e.target.value as any)}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5"
                >
                  <option value="editor">Editor (Can edit content only)</option>
                  <option value="admin">Admin (Can edit pages, widgets, media, settings)</option>
                  <option value="super_admin">Super Admin (Full system & user access)</option>
                </select>
              </div>

              <div className="pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newUserForcePassword}
                    onChange={(e) => setNewUserForcePassword(e.target.checked)}
                    className="rounded border-slate-300 text-[#DF0C88] focus:ring-[#DF0C88]"
                  />
                  <span className="text-xs font-bold text-slate-700">Force password change on first login</span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setAddUserOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#DF0C88] hover:bg-[#C50875] text-white text-xs font-bold rounded-xl cursor-pointer"
                >
                  Create User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Reset Password */}
      {resetModalUserId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl border border-slate-200">
            <h3 className="font-black text-lg text-slate-900 mb-1">Reset Password</h3>
            <p className="text-xs text-slate-500 mb-4">Set a temporary password. User will be forced to change it on login.</p>

            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">New Temporary Password</label>
                <input
                  type="password"
                  required
                  value={resetNewPassword}
                  onChange={(e) => setResetNewPassword(e.target.value)}
                  placeholder="Minimum 8 characters"
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setResetModalUserId(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#DF0C88] hover:bg-[#C50875] text-white text-xs font-bold rounded-xl cursor-pointer"
                >
                  Confirm Reset
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete User Modal */}
      {userToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mb-4 mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="font-black text-lg text-slate-900 text-center mb-1">Delete User Account?</h3>
            <p className="text-xs text-slate-500 text-center mb-6">
              Are you sure you want to permanently delete user <span className="font-bold text-slate-800">{userToDelete.email}</span>?
            </p>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setUserToDelete(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDeleteUser(userToDelete.id)}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-sm cursor-pointer"
              >
                Delete User
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
