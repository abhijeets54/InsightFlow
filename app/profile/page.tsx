'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Navigation from '@/components/layout/Navigation';
import Footer from '@/components/layout/Footer';
import Card from '@/components/ui/Card';
import { useTheme } from '@/contexts/ThemeContext';

export default function ProfilePage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();

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
    setLoading(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const getEmailPrefix = (email: string) => {
    return email?.split('@')[0] || '';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-jasmine-500 dark:bg-neutral-950">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-forest-200 border-t-forest-600 dark:border-jasmine-500/30 dark:border-t-jasmine-500 mx-auto"></div>
          <p className="mt-4 text-neutral-900 dark:text-jasmine-300 font-semibold">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-jasmine-500 to-jasmine-400 dark:from-neutral-950 dark:to-neutral-900 transition-colors duration-300">
      <Navigation user={user} />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        {/* Profile Header Card */}
        <div className="bg-white dark:bg-forest-900/60 dark:backdrop-blur-xl dark:border dark:border-forest-700/50 rounded-3xl shadow-2xl mb-8 overflow-hidden animate-fade-in-up">
          <div className="bg-gradient-to-r from-forest-500 to-forest-600 dark:from-forest-700 dark:to-forest-800 px-8 py-12 sm:py-16">
            <div className="flex items-center gap-6">
              <div className="w-24 h-24 bg-white dark:bg-forest-900 rounded-full flex items-center justify-center shadow-xl">
                <svg className="w-12 h-12 text-forest-600 dark:text-jasmine-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <div className="text-white">
                <p className="text-sm font-medium opacity-90">Hi, welcome back</p>
                <h1 className="text-4xl font-display font-bold mt-1">{getEmailPrefix(user?.email)}</h1>
              </div>
            </div>
          </div>

          <div className="px-8 py-6 bg-white dark:bg-forest-900/40">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-navy-900/50 dark:to-navy-800/50 rounded-xl border border-blue-200 dark:border-navy-700/50">
                <div className="flex items-center gap-3 mb-2">
                  <svg className="w-5 h-5 text-blue-600 dark:text-navy-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <h3 className="text-sm font-semibold text-neutral-900 dark:text-white">Email</h3>
                </div>
                <p className="text-sm text-neutral-700 dark:text-neutral-300">{user?.email}</p>
              </div>

              <div className="p-4 bg-gradient-to-br from-green-50 to-green-100 dark:from-forest-900/50 dark:to-forest-800/50 rounded-xl border border-green-200 dark:border-forest-700/50">
                <div className="flex items-center gap-3 mb-2">
                  <svg className="w-5 h-5 text-green-600 dark:text-forest-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <h3 className="text-sm font-semibold text-neutral-900 dark:text-white">Member Since</h3>
                </div>
                <p className="text-sm text-neutral-700 dark:text-neutral-300">
                  {user?.created_at ? new Date(user.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'N/A'}
                </p>
              </div>

              <div className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-maroon-900/50 dark:to-maroon-800/50 rounded-xl border border-purple-200 dark:border-maroon-700/50">
                <div className="flex items-center gap-3 mb-2">
                  <svg className="w-5 h-5 text-purple-600 dark:text-maroon-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <h3 className="text-sm font-semibold text-neutral-900 dark:text-white">Status</h3>
                </div>
                <p className="text-sm font-medium text-green-600 dark:text-forest-400">Active</p>
              </div>
            </div>
          </div>
        </div>

        {/* Settings Section */}
        <div className="bg-white dark:bg-forest-900/60 dark:backdrop-blur-xl dark:border dark:border-forest-700/50 rounded-3xl shadow-2xl p-8 animate-fade-in-up delay-100">
          <h2 className="text-2xl font-display font-bold mb-6 text-neutral-900 dark:text-white">Account Settings</h2>

          <div className="space-y-4">
            {/* Theme Toggle */}
            {/* <div className="flex items-center justify-between p-5 rounded-xl bg-gradient-to-br from-neutral-50 to-neutral-100 dark:from-forest-800/50 dark:to-forest-900/50 border border-neutral-200 dark:border-forest-700/50 hover:shadow-lg transition-all duration-300">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-jasmine-500 to-jasmine-600 rounded-xl flex items-center justify-center">
                  {theme === 'dark' ? (
                    <svg className="w-6 h-6 text-forest-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                    </svg>
                  ) : (
                    <svg className="w-6 h-6 text-forest-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                  )}
                </div>
                <div>
                  <h3 className="font-bold text-neutral-900 dark:text-white text-lg">Theme</h3>
                  <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
                    {theme === 'dark' ? 'Dark mode is enabled' : 'Light mode is enabled'}
                  </p>
                </div>
              </div>
              <button
                onClick={toggleTheme}
                className={`relative inline-flex h-8 w-16 items-center rounded-full transition-colors duration-300 ${
                  theme === 'dark' ? 'bg-jasmine-500' : 'bg-neutral-300'
                }`}
              >
                <span
                  className={`inline-block h-6 w-6 transform rounded-full bg-white shadow-lg transition-transform duration-300 ${
                    theme === 'dark' ? 'translate-x-9' : 'translate-x-1'
                  }`}
                />
              </button>
            </div> */}

            {/* Email Notifications */}
            {/* <div className="flex items-center justify-between p-5 rounded-xl bg-gradient-to-br from-neutral-50 to-neutral-100 dark:from-forest-800/50 dark:to-forest-900/50 border border-neutral-200 dark:border-forest-700/50 hover:shadow-lg transition-all duration-300">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-bold text-neutral-900 dark:text-white text-lg">Email Notifications</h3>
                  <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">Receive updates and insights</p>
                </div>
              </div>
              <button className="relative inline-flex h-8 w-16 items-center rounded-full bg-neutral-300 dark:bg-neutral-600 transition-colors duration-300">
                <span className="inline-block h-6 w-6 transform rounded-full bg-white shadow-lg transition-transform duration-300 translate-x-1" />
              </button>
            </div> */}

            {/* Sign Out */}
            <div className="flex items-center justify-between p-5 rounded-xl bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/30 dark:to-red-800/30 border border-red-200 dark:border-red-700/50 hover:shadow-lg transition-all duration-300">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-red-600 rounded-xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-bold text-neutral-900 dark:text-white text-lg">Sign Out</h3>
                  <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">Sign out from all devices</p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="px-6 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-all duration-300 font-bold shadow-lg hover:shadow-xl hover:scale-105"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <Footer />
    </div>
  );
}
