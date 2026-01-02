'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

interface NavItem {
  name: string;
  href: string;
  icon: React.ReactNode;
}

interface NavigationProps {
  user: any;
  onLogout?: () => void | Promise<void>;
}

export default function Navigation({ user, onLogout }: NavigationProps) {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navItems: NavItem[] = [
    {
      name: 'Dashboard',
      href: '/dashboard',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ),
    },
    {
      name: 'Analytics',
      href: '/analytics',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
    },
    {
      name: 'Visualizations',
      href: '/visualizations-advanced',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
        </svg>
      ),
    },
    {
      name: 'AI Assistant',
      href: '/ai-assistant',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
      ),
    },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 dark:bg-forest-900/80 backdrop-blur-xl border-b border-neutral-200 dark:border-forest-700/50 shadow-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-3">
          {/* Logo */}
          <div className="flex items-center">
            <Link href="/" className="flex items-center space-x-3">
              <Image
                src="/logo.png"
                alt="InsightFlow"
                width={70}
                height={70}
                className="h-16 w-16 rounded-full"
              />
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-2">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`
                    px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300
                    flex items-center space-x-2 group relative overflow-hidden
                    ${isActive
                      ? 'bg-forest-600 dark:bg-jasmine-500/90 text-white dark:text-forest-900 shadow-lg shadow-forest-600/50 dark:shadow-jasmine-500/50'
                      : 'text-neutral-700 dark:text-jasmine-100 hover:bg-neutral-100 dark:hover:bg-forest-700/50 hover:text-forest-600 dark:hover:text-jasmine-300'
                    }
                  `}
                >
                  <span className={`transition-transform duration-300 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`}>
                    {item.icon}
                  </span>
                  <span className="tracking-wide">{item.name}</span>
                  {isActive && (
                    <span className="absolute inset-0 bg-linear-to-r from-jasmine-400/0 via-jasmine-200/20 to-jasmine-400/0 animate-shimmer" />
                  )}
                </Link>
              );
            })}
          </div>

          {/* User Menu */}
          <div className="flex items-center space-x-4">
            {user ? (
              <>
                <span className="text-sm text-neutral-700 dark:text-jasmine-200 hidden sm:block font-medium">
                  Hi, {user.email.split('@')[0]}
                </span>
                <Link
                  href="/profile"
                  className="px-5 py-2.5 bg-forest-600 dark:bg-jasmine-500 text-white dark:text-forest-900 rounded-xl hover:bg-forest-700 dark:hover:bg-jasmine-400 transition-all duration-300 text-sm font-semibold shadow-lg hover:shadow-xl hover:scale-105"
                >
                  Profile
                </Link>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="text-neutral-700 dark:text-jasmine-200 hover:text-forest-600 dark:hover:text-jasmine-400 px-5 py-2.5 text-sm font-semibold transition-colors duration-300"
                >
                  Sign In
                </Link>
                <Link
                  href="/signup"
                  className="px-5 py-2.5 bg-forest-600 dark:bg-jasmine-500 text-white dark:text-forest-900 rounded-xl hover:bg-forest-700 dark:hover:bg-jasmine-400 transition-all duration-300 text-sm font-semibold shadow-lg hover:shadow-xl hover:scale-105"
                >
                  Get Started
                </Link>
              </>
            )}

            {/* Mobile menu button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 rounded-lg text-neutral-700 dark:text-jasmine-200 hover:bg-neutral-100 dark:hover:bg-forest-700/50 transition-colors duration-300"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      {isMobileMenuOpen && (
        <div className="md:hidden border-t border-neutral-200 dark:border-forest-700/50 bg-white/95 dark:bg-forest-800/95 backdrop-blur-lg">
          <div className="px-4 py-3 space-y-2">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`
                    flex items-center space-x-3 px-5 py-3.5 rounded-xl text-base font-semibold transition-all duration-300
                    ${isActive
                      ? 'bg-forest-600 dark:bg-jasmine-500/90 text-white dark:text-forest-900 shadow-lg'
                      : 'text-neutral-700 dark:text-jasmine-100 hover:bg-neutral-100 dark:hover:bg-forest-700/50 hover:text-forest-600 dark:hover:text-jasmine-300'
                    }
                  `}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {item.icon}
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </nav>
  );
}
