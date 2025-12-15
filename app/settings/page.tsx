'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Navigation from '@/components/layout/Navigation';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';

export default function SettingsPage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [profile, setProfile] = useState({
    email: '',
    displayName: '',
    company: '',
    bio: '',
  });
  const [preferences, setPreferences] = useState({
    emailNotifications: true,
    dataExportFormat: 'csv',
    defaultChartType: 'bar',
    theme: 'light',
  });
  const router = useRouter();

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      router.push('/login');
      return;
    }

    setUser(session.user);
    setProfile({
      email: session.user.email || '',
      displayName: session.user.user_metadata?.display_name || '',
      company: session.user.user_metadata?.company || '',
      bio: session.user.user_metadata?.bio || '',
    });
    setLoading(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    setMessage(null);

    try {
      const { error } = await supabase.auth.updateUser({
        data: {
          display_name: profile.displayName,
          company: profile.company,
          bio: profile.bio,
        },
      });

      if (error) throw error;

      setMessage({ type: 'success', text: 'Profile updated successfully!' });
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to update profile' });
    } finally {
      setSaving(false);
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const handleSavePreferences = () => {
    setSaving(true);
    setMessage(null);

    // Simulate saving preferences
    setTimeout(() => {
      setMessage({ type: 'success', text: 'Preferences saved successfully!' });
      setSaving(false);
      setTimeout(() => setMessage(null), 3000);
    }, 500);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cream">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto"></div>
          <p className="mt-4 text-neutral-700">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream">
      <Navigation user={user} onLogout={handleLogout} />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-display font-bold text-neutral-900 mb-2">
            Settings
          </h1>
          <p className="text-neutral-600">
            Manage your account and preferences
          </p>
        </div>

        {/* Message */}
        {message && (
          <div
            className={`mb-6 p-4 rounded-xl shadow-soft border ${
              message.type === 'success'
                ? 'bg-gradient-to-r from-secondary-50 to-primary-50 border-secondary-200'
                : 'bg-gradient-to-r from-red-50 to-accent-coral-50 border-red-300'
            }`}
          >
            <div className="flex items-center gap-3">
              {message.type === 'success' ? (
                <svg className="w-5 h-5 text-secondary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ) : (
                <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
              <p className={`text-sm font-medium ${message.type === 'success' ? 'text-secondary-700' : 'text-red-700'}`}>
                {message.text}
              </p>
            </div>
          </div>
        )}

        {/* Profile Settings */}
        <Card className="mb-6">
          <div className="flex items-center gap-3 mb-6 pb-6 border-b border-neutral-200">
            <div className="p-3 bg-gradient-to-br from-primary-100 to-secondary-100 rounded-xl">
              <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-display font-bold text-neutral-900">Profile Information</h2>
              <p className="text-sm text-neutral-600">Update your personal details</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Email Address
              </label>
              <input
                type="email"
                value={profile.email}
                disabled
                className="block w-full px-4 py-3 border border-neutral-300 rounded-lg text-neutral-500 bg-neutral-100 cursor-not-allowed"
              />
              <p className="mt-1 text-xs text-neutral-500">Email cannot be changed</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Display Name
              </label>
              <input
                type="text"
                value={profile.displayName}
                onChange={(e) => setProfile({ ...profile, displayName: e.target.value })}
                placeholder="Enter your display name"
                className="block w-full px-4 py-3 border border-neutral-300 rounded-lg text-neutral-900 placeholder-neutral-500 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Company/Organization
              </label>
              <input
                type="text"
                value={profile.company}
                onChange={(e) => setProfile({ ...profile, company: e.target.value })}
                placeholder="Enter your company name"
                className="block w-full px-4 py-3 border border-neutral-300 rounded-lg text-neutral-900 placeholder-neutral-500 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Bio
              </label>
              <textarea
                value={profile.bio}
                onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                placeholder="Tell us about yourself"
                rows={4}
                className="block w-full px-4 py-3 border border-neutral-300 rounded-lg text-neutral-900 placeholder-neutral-500 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all resize-none"
              />
            </div>

            <div className="pt-4">
              <Button
                variant="primary"
                onClick={handleSaveProfile}
                isLoading={saving}
                className="w-full sm:w-auto"
              >
                {saving ? 'Saving...' : 'Save Profile'}
              </Button>
            </div>
          </div>
        </Card>

        {/* Preferences */}
        <Card className="mb-6">
          <div className="flex items-center gap-3 mb-6 pb-6 border-b border-neutral-200">
            <div className="p-3 bg-gradient-to-br from-accent-teal-100 to-secondary-100 rounded-xl">
              <svg className="w-6 h-6 text-accent-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-display font-bold text-neutral-900">Preferences</h2>
              <p className="text-sm text-neutral-600">Customize your experience</p>
            </div>
          </div>

          <div className="space-y-6">
            <div className="flex items-center justify-between p-4 bg-neutral-50 rounded-lg">
              <div>
                <p className="font-medium text-neutral-900">Email Notifications</p>
                <p className="text-sm text-neutral-600">Receive updates about your data</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={preferences.emailNotifications}
                  onChange={(e) => setPreferences({ ...preferences, emailNotifications: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-neutral-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-500"></div>
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Default Export Format
              </label>
              <select
                value={preferences.dataExportFormat}
                onChange={(e) => setPreferences({ ...preferences, dataExportFormat: e.target.value })}
                className="block w-full px-4 py-3 border border-neutral-300 rounded-lg text-neutral-900 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
              >
                <option value="csv">CSV</option>
                <option value="xlsx">Excel (XLSX)</option>
                <option value="json">JSON</option>
                <option value="pdf">PDF</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Default Chart Type
              </label>
              <select
                value={preferences.defaultChartType}
                onChange={(e) => setPreferences({ ...preferences, defaultChartType: e.target.value })}
                className="block w-full px-4 py-3 border border-neutral-300 rounded-lg text-neutral-900 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
              >
                <option value="bar">Bar Chart</option>
                <option value="line">Line Chart</option>
                <option value="area">Area Chart</option>
                <option value="pie">Pie Chart</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Theme
              </label>
              <select
                value={preferences.theme}
                onChange={(e) => setPreferences({ ...preferences, theme: e.target.value })}
                className="block w-full px-4 py-3 border border-neutral-300 rounded-lg text-neutral-900 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
              >
                <option value="light">Light</option>
                <option value="dark">Dark (Coming Soon)</option>
                <option value="auto">Auto (Coming Soon)</option>
              </select>
            </div>

            <div className="pt-4">
              <Button
                variant="primary"
                onClick={handleSavePreferences}
                isLoading={saving}
                className="w-full sm:w-auto"
              >
                {saving ? 'Saving...' : 'Save Preferences'}
              </Button>
            </div>
          </div>
        </Card>

        {/* Danger Zone */}
        <Card className="border-red-200 bg-gradient-to-br from-red-50 to-accent-coral-50">
          <div className="flex items-center gap-3 mb-6 pb-6 border-b border-red-200">
            <div className="p-3 bg-white rounded-xl shadow-sm">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-display font-bold text-red-900">Danger Zone</h2>
              <p className="text-sm text-red-700">Irreversible actions</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-white rounded-lg border border-red-200">
              <div>
                <p className="font-medium text-neutral-900">Delete All Data</p>
                <p className="text-sm text-neutral-600">Permanently delete all your uploaded datasets</p>
              </div>
              <Button variant="danger" size="sm">
                Delete Data
              </Button>
            </div>

            <div className="flex items-center justify-between p-4 bg-white rounded-lg border border-red-200">
              <div>
                <p className="font-medium text-neutral-900">Delete Account</p>
                <p className="text-sm text-neutral-600">Permanently delete your account and all data</p>
              </div>
              <Button variant="danger" size="sm">
                Delete Account
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
