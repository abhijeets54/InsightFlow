'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import Navigation from '@/components/layout/Navigation';

export default function Home() {
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [counts, setCounts] = useState({ users: 0, charts: 0, uptime: 0, speed: 0 });

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      setUser(session.user);
    }
  };

  useEffect(() => {
    setMounted(true);

    // Start counter animation immediately
    const duration = 2500;
    const steps = 75;
    const interval = duration / steps;
    const targets = { users: 10000, charts: 50000, uptime: 99.9, speed: 5 };
    let step = 0;

    const timer = setInterval(() => {
      step++;
      const progress = Math.min(step / steps, 1);
      const easeOut = 1 - Math.pow(1 - progress, 3); // Cubic ease-out

      setCounts({
        users: Math.floor(targets.users * easeOut),
        charts: Math.floor(targets.charts * easeOut),
        uptime: Number((targets.uptime * easeOut).toFixed(1)),
        speed: Number((targets.speed * easeOut).toFixed(1)),
      });

      if (step >= steps) clearInterval(timer);
    }, interval);

    return () => clearInterval(timer);
  }, []);

  const features = [
    {
      icon: '📤',
      title: 'Smart File Upload',
      description: 'Drag & drop CSV, Excel, JSON files with automatic parsing and validation',
      color: 'from-forest-500 to-forest-600',
    },
    {
      icon: '📊',
      title: 'Interactive Visualizations',
      description: 'Create stunning charts: line, bar, pie, scatter, and area graphs',
      color: 'from-navy-600 to-navy-700',
    },
    {
      icon: '🤖',
      title: 'AI-Powered Insights',
      description: 'Ask questions in natural language, get instant AI-powered answers',
      color: 'from-maroon-500 to-maroon-600',
    },
    {
      icon: '💾',
      title: 'Dataset Management',
      description: 'Organize, version control, and manage all datasets securely',
      color: 'from-brown-500 to-brown-600',
    },
    {
      icon: '⚡',
      title: 'Advanced Analytics',
      description: 'Complex transformations, filtering, and statistical analysis',
      color: 'from-rose-500 to-rose-600',
    },
    {
      icon: '🚀',
      title: 'Export & Share',
      description: 'Export as PDF, CSV, Excel or share interactive dashboards',
      color: 'from-navy-500 to-forest-600',
    },
  ];

  if (!mounted) {
    return (
      <div className="min-h-screen bg-jasmine-500 flex items-center justify-center">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-forest-200 border-t-forest-600 rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-jasmine-500">
      <Navigation user={user} />

      {/* Hero Section */}
      <section className="relative min-h-[90vh] flex items-center justify-center">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
          {/* Badge */}
          <div className="inline-block mb-6 animate-fade-in-down">
            {/* <span className="px-5 py-2 bg-forest-500 text-white rounded-full text-sm font-medium shadow-medium inline-flex items-center gap-2">
              <span>🚀</span>
              Powered by Google Gemini AI
            </span> */}
          </div>

          {/* Main Heading */}
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-display font-bold text-neutral-900 leading-tight mb-6 animate-fade-in-up">
            Transform Data Into
            <span className="block mt-2 text-forest-600">
              Actionable Insights
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-xl sm:text-2xl text-neutral-800 max-w-3xl mx-auto leading-relaxed mb-8 animate-fade-in-up delay-200">
            Upload your data files and get instant AI-powered analysis with beautiful visualizations.
            {/* <span className="block mt-1 font-semibold text-forest-700">No coding required.</span> */}
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-10 animate-fade-in-up delay-300">
            {user ? (
              <>
                <Link
                  href="/dashboard"
                  className="px-8 py-4 bg-forest-500 text-white font-semibold rounded-lg hover:bg-forest-600 transition-all duration-200 shadow-medium hover:shadow-large text-lg group"
                >
                  <span className="flex items-center gap-2">
                    Go to Dashboard
                    <svg className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </span>
                </Link>
                <Link
                  href="/ai-assistant"
                  className="px-8 py-4 bg-white text-forest-700 font-semibold rounded-lg border-2 border-forest-500 hover:bg-forest-50 transition-colors duration-200 text-lg"
                >
                  AI Assistant
                </Link>
              </>
            ) : (
              <>
                <Link
                  href="/signup"
                  className="px-8 py-4 bg-forest-500 text-white font-semibold rounded-lg hover:bg-forest-600 transition-all duration-200 shadow-medium hover:shadow-large text-lg group"
                >
                  <span className="flex items-center gap-2">
                    Start Analyzing Free
                    <svg className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </span>
                </Link>
                <Link
                  href="/login"
                  className="px-8 py-4 bg-white text-forest-700 font-semibold rounded-lg border-2 border-forest-500 hover:bg-forest-50 transition-colors duration-200 text-lg"
                >
                  Sign In
                </Link>
              </>
            )}
          </div>

          {/* Trust Indicators */}
          <div className="animate-fade-in delay-400">
            <p className="text-sm text-neutral-700 mb-3 font-medium">Trusted by data analysts worldwide</p>
            <div className="flex justify-center items-center flex-wrap gap-4 text-neutral-800">
              <span className="text-xl font-bold">10K+ Users</span>
              <span className="text-neutral-400">•</span>
              <span className="text-xl font-bold">4.9⭐ Rating</span>
              <span className="text-neutral-400">•</span>
              <span className="text-sm font-medium">99.9% Uptime</span>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="bg-forest-600 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="text-4xl sm:text-5xl font-bold text-white mb-2">
                {counts.users.toLocaleString()}+
              </div>
              <div className="text-sm sm:text-base text-jasmine-200 font-medium">Datasets Analyzed</div>
            </div>
            <div className="text-center">
              <div className="text-4xl sm:text-5xl font-bold text-white mb-2">
                {counts.charts.toLocaleString()}+
              </div>
              <div className="text-sm sm:text-base text-jasmine-200 font-medium">Visualizations</div>
            </div>
            <div className="text-center">
              <div className="text-4xl sm:text-5xl font-bold text-white mb-2">
                {counts.uptime}%
              </div>
              <div className="text-sm sm:text-base text-jasmine-200 font-medium">Uptime</div>
            </div>
            <div className="text-center">
              <div className="text-4xl sm:text-5xl font-bold text-white mb-2">
                &lt;{counts.speed}s
              </div>
              <div className="text-sm sm:text-base text-jasmine-200 font-medium">Response Time</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="text-4xl font-display font-bold text-neutral-900 mb-3">
              Everything You Need for Data Analysis
            </h2>
            <p className="text-xl text-neutral-600 max-w-2xl mx-auto">
              Powerful features designed to make data analysis simple, fast, and insightful
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <div
                key={index}
                className="group p-6 bg-white rounded-xl border-2 border-neutral-200 hover:border-forest-500 hover:shadow-medium transition-all duration-300"
              >
                <div className={`inline-flex p-3 rounded-xl bg-gradient-to-br ${feature.color} text-white mb-4 text-3xl group-hover:scale-105 transition-transform duration-200`}>
                  {feature.icon}
                </div>
                <h3 className="text-xl font-bold text-neutral-900 mb-2">{feature.title}</h3>
                <p className="text-neutral-600 text-sm leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 bg-jasmine-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="text-4xl font-display font-bold text-neutral-900 mb-3">
              How It Works
            </h2>
            <p className="text-xl text-neutral-600">Get started in three simple steps</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            {[
              { num: 1, title: 'Upload Your Data', desc: 'Drag and drop CSV, Excel, or JSON files. Multiple formats supported.', color: 'forest', icon: '📤' },
              { num: 2, title: 'Analyze with AI', desc: 'Ask questions in plain English, get instant insights from Gemini AI.', color: 'navy', icon: '🤖' },
              { num: 3, title: 'Visualize & Export', desc: 'Create beautiful charts and export insights to share with your team.', color: 'maroon', icon: '📊' }
            ].map((step, index) => (
              <div key={index} className="text-center">
                <div className="relative inline-block mb-5">
                  <div className={`w-16 h-16 bg-${step.color}-500 text-white rounded-full flex items-center justify-center text-2xl font-bold shadow-medium`}>
                    {step.icon}
                  </div>
                  <div className="absolute -top-1 -right-1 w-7 h-7 bg-white rounded-full flex items-center justify-center text-xs font-bold text-neutral-900 shadow-sm border-2 border-jasmine-300">
                    {step.num}
                  </div>
                </div>
                <h3 className="text-xl font-bold text-neutral-900 mb-2">{step.title}</h3>
                <p className="text-neutral-600 text-sm leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-forest-700 text-neutral-300 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div>
              <h3 className="text-white font-bold text-lg mb-3 flex items-center gap-2">
                <div className="relative w-8 h-8 rounded-full overflow-hidden">
                  <img src="/logo.png" alt="InsightFlow" className="w-full h-full object-cover" />
                </div>
                InsightFlow
              </h3>
              <p className="text-sm">AI-powered data analysis for modern teams</p>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-3">Product</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="/dashboard" className="hover:text-jasmine-400 transition-colors">Dashboard</Link></li>
                <li><Link href="/analytics" className="hover:text-jasmine-400 transition-colors">Analytics</Link></li>
                <li><Link href="/visualizations" className="hover:text-jasmine-400 transition-colors">Visualizations</Link></li>
                <li><Link href="/ai-assistant" className="hover:text-jasmine-400 transition-colors">AI Assistant</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-3">Company</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-jasmine-400 transition-colors">About</a></li>
                <li><a href="#" className="hover:text-jasmine-400 transition-colors">Careers</a></li>
                <li><a href="#" className="hover:text-jasmine-400 transition-colors">Contact</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-3">Legal</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-jasmine-400 transition-colors">Privacy</a></li>
                <li><a href="#" className="hover:text-jasmine-400 transition-colors">Terms</a></li>
                <li><a href="#" className="hover:text-jasmine-400 transition-colors">Security</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-forest-600 pt-6 text-center text-sm">
            <p>&copy; 2025 InsightFlow. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
