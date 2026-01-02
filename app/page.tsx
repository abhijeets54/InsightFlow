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

  if (!mounted) {
    return (
      <div className="min-h-screen bg-jasmine-500 dark:bg-neutral-950 flex items-center justify-center">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-jasmine-500/30 border-t-jasmine-500 rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-jasmine-500 dark:bg-neutral-950">
      <Navigation user={user} />

      {/* Hero Section with Image */}
      <section className="relative min-h-screen flex items-center justify-center pt-24 overflow-hidden">
        {/* Animated Background Gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-neutral-950 via-neutral-950 to-neutral-950 dark:from-neutral-950 dark:via-forest-950 dark:to-neutral-950 dark:opacity-90"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(27,94,32,0.08),transparent_50%)] dark:bg-[radial-gradient(circle_at_30%_50%,rgba(253,207,114,0.08),transparent_50%)]"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_50%,rgba(27,94,32,0.08),transparent_50%)] dark:bg-[radial-gradient(circle_at_70%_50%,rgba(27,94,32,0.08),transparent_50%)]"></div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Left: Text Content */}
            <div className="text-left">
              {/* Floating Badge */}
              {/* <div className="inline-block mb-8 animate-fade-in-down">
                <span className="px-6 py-3 bg-white/80 dark:bg-forest-900/60 backdrop-blur-xl border border-neutral-200 dark:border-forest-700/50 text-forest-700 dark:text-jasmine-400 rounded-full text-sm font-semibold inline-flex items-center gap-3 shadow-xl hover:scale-105 transition-transform duration-300">
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-forest-600 dark:bg-jasmine-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-forest-600 dark:bg-jasmine-500"></span>
                  </span>
                  Powered by Google Gemini AI
                </span>
              </div> */}

              {/* Main Heading with Gradient Text */}
              <h1 className="text-5xl sm:text-6xl lg:text-7xl font-display font-bold leading-tight mb-8 animate-fade-in-up">
                <span className="text-neutral-900 dark:text-white">Transform Data Into</span>
                <span className="block mt-3 bg-linear-to-r from-forest-600 via-forest-500 to-forest-700 dark:from-jasmine-400 dark:via-jasmine-500 dark:to-forest-400 bg-clip-text text-transparent animate-gradient bg-[length:200%_200%]">
                  Actionable Insights
                </span>
              </h1>

              {/* Subtitle */}
              <p className="text-xl sm:text-2xl text-neutral-700 dark:text-neutral-300 leading-relaxed mb-12 animate-fade-in-up delay-200">
                Upload your data and unlock the power of AI-driven analysis with stunning visualizations.
                {/* <span className="block mt-2 text-forest-600 dark:text-jasmine-400 font-semibold">No coding required. Get started in seconds.</span> */}
              </p>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-6 items-start mb-16 animate-fade-in-up delay-300">
                {user ? (
                  <>
                    <Link
                      href="/dashboard"
                      className="px-10 py-5 bg-forest-600 dark:bg-jasmine-500 text-white dark:text-forest-900 font-bold rounded-2xl hover:bg-forest-700 dark:hover:bg-jasmine-400 transition-all duration-300 shadow-2xl shadow-forest-600/30 dark:shadow-jasmine-500/30 hover:shadow-forest-600/50 dark:hover:shadow-jasmine-500/50 hover:scale-105 text-lg group"
                    >
                      <span className="flex items-center gap-3">
                        Go to Dashboard
                        <svg className="w-6 h-6 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                        </svg>
                      </span>
                    </Link>
                    <Link
                      href="/ai-assistant"
                      className="px-10 py-5 bg-white/60 dark:bg-white/80 dark:bg-forest-900/60 backdrop-blur-xl border-2 border-neutral-200 dark:border-forest-700/50 text-forest-700 dark:text-black font-bold rounded-2xl hover:bg-white/80 dark:hover:bg-neutral-50 dark:bg-forest-800/80 hover:border-forest-600 dark:hover:border-jasmine-500/50 transition-all duration-300 text-lg"
                    >
                      AI Assistant
                    </Link>
                  </>
                ) : (
                  <>
                    <Link
                      href="/signup"
                      className="px-10 py-5 bg-forest-600 dark:bg-jasmine-500 text-white dark:text-forest-900 font-bold rounded-2xl hover:bg-forest-700 dark:hover:bg-jasmine-400 transition-all duration-300 shadow-2xl shadow-forest-600/30 dark:shadow-jasmine-500/30 hover:shadow-forest-600/50 dark:hover:shadow-jasmine-500/50 hover:scale-105 text-lg group"
                    >
                      <span className="flex items-center gap-3">
                        Start Analyzing Free
                        <svg className="w-6 h-6 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                        </svg>
                      </span>
                    </Link>
                    <Link
                      href="/login"
                      className="px-10 py-5 bg-white/60 dark:bg-white/80 dark:bg-forest-900/60 backdrop-blur-xl border-2 border-neutral-200 dark:border-forest-700/50 text-forest-700 dark:text-jasmine-300 font-bold rounded-2xl hover:bg-white/80 dark:hover:bg-neutral-50 dark:bg-forest-800/80 hover:border-forest-600 dark:hover:border-jasmine-500/50 transition-all duration-300 text-lg"
                    >
                      Sign In
                    </Link>
                  </>
                )}
              </div>

              {/* Trust Indicators */}
              {/* <div className="animate-fade-in delay-400">
                <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-5 font-semibold tracking-wide uppercase">Trusted by data teams worldwide</p>
                <div className="flex items-center flex-wrap gap-6 text-neutral-600 dark:text-neutral-300">
                  <div className="flex items-center gap-2">
                    <span className="text-forest-600 dark:text-jasmine-500 text-2xl">👥</span>
                    <span className="text-2xl font-bold text-neutral-900 dark:text-white">10K+</span>
                    <span className="text-sm">Users</span>
                  </div>
                  <span className="text-neutral-400 dark:text-neutral-600">•</span>
                  <div className="flex items-center gap-2">
                    <span className="text-forest-600 dark:text-jasmine-500 text-2xl">⭐</span>
                    <span className="text-2xl font-bold text-neutral-900 dark:text-white">4.9</span>
                    <span className="text-sm">Rating</span>
                  </div>
                  <span className="text-neutral-400 dark:text-neutral-600">•</span>
                  <div className="flex items-center gap-2">
                    <span className="text-forest-600 dark:text-jasmine-500 text-2xl">⚡</span>
                    <span className="text-2xl font-bold text-neutral-900 dark:text-white">99.9%</span>
                    <span className="text-sm">Uptime</span>
                  </div>
                </div>
              </div> */}
            </div>

            {/* Right: Hero Image */}
            <div className="relative animate-fade-in-right">
              <div className="relative group">
                {/* Glow Effect */}
                <div className="absolute -inset-4 bg-gradient-to-br from-forest-600/30 via-jasmine-500/30 to-navy-600/30 rounded-3xl blur-3xl group-hover:blur-2xl opacity-75 group-hover:opacity-100 transition-all duration-500"></div>

                {/* Image Container */}
                <div className="relative overflow-hidden rounded-3xl shadow-2xl shadow-neutral-900/50 border-2 border-neutral-200/20 dark:border-forest-700/40 group-hover:shadow-3xl group-hover:border-jasmine-500/30 transition-all duration-500">
                  <img
                    src="/hero.png"
                    alt="Team analyzing data and business analytics"
                    className="w-full h-auto object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                  />
                  {/* Overlay Gradient */}
                  <div className="absolute inset-0 bg-gradient-to-t from-neutral-950/60 via-neutral-950/20 to-transparent pointer-events-none"></div>
                </div>

                {/* Floating Stats Card */}
                {/* <div className="absolute -bottom-6 -left-6 bg-white/90 dark:bg-forest-900/90 backdrop-blur-xl border border-neutral-200 dark:border-forest-700/50 rounded-2xl p-6 shadow-2xl animate-float">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-gradient-to-br from-forest-600 to-forest-700 dark:from-jasmine-500 dark:to-jasmine-600 rounded-xl flex items-center justify-center">
                      <svg className="w-8 h-8 text-white dark:text-forest-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                      </svg>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-neutral-900 dark:text-white">+23.5%</div>
                      <div className="text-sm text-neutral-600 dark:text-neutral-400">Growth Rate</div>
                    </div>
                  </div>
                </div> */}

                {/* Floating Chart Card */}
                {/* <div className="absolute -top-6 -right-6 bg-white/90 dark:bg-forest-900/90 backdrop-blur-xl border border-neutral-200 dark:border-forest-700/50 rounded-2xl p-4 shadow-2xl animate-float-delayed">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-2 h-2 rounded-full bg-forest-500 animate-pulse"></div>
                    <span className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">Live Analytics</span>
                  </div>
                  <div className="flex items-end gap-1 h-12">
                    <div className="w-2 bg-jasmine-500 rounded-sm" style={{height: '60%'}}></div>
                    <div className="w-2 bg-jasmine-500 rounded-sm" style={{height: '40%'}}></div>
                    <div className="w-2 bg-jasmine-500 rounded-sm" style={{height: '80%'}}></div>
                    <div className="w-2 bg-jasmine-500 rounded-sm" style={{height: '55%'}}></div>
                    <div className="w-2 bg-jasmine-500 rounded-sm" style={{height: '90%'}}></div>
                    <div className="w-2 bg-jasmine-500 rounded-sm" style={{height: '70%'}}></div>
                  </div>
                </div> */}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section with Glass Effect */}
      {/* <section className="relative py-20 bg-white/60 dark:bg-forest-900/40 backdrop-blur-sm border-y border-neutral-200 dark:border-forest-800/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="text-center group">
              <div className="text-5xl sm:text-6xl font-bold text-forest-600 dark:text-jasmine-400 mb-3 group-hover:scale-110 transition-transform duration-300">
                {counts.users.toLocaleString()}+
              </div>
              <div className="text-sm sm:text-base text-neutral-700 dark:text-neutral-300 font-semibold tracking-wide">Datasets Analyzed</div>
            </div>
            <div className="text-center group">
              <div className="text-5xl sm:text-6xl font-bold text-forest-600 dark:text-jasmine-400 mb-3 group-hover:scale-110 transition-transform duration-300">
                {counts.charts.toLocaleString()}+
              </div>
              <div className="text-sm sm:text-base text-neutral-700 dark:text-neutral-300 font-semibold tracking-wide">Visualizations</div>
            </div>
            <div className="text-center group">
              <div className="text-5xl sm:text-6xl font-bold text-forest-600 dark:text-jasmine-400 mb-3 group-hover:scale-110 transition-transform duration-300">
                {counts.uptime}%
              </div>
              <div className="text-sm sm:text-base text-neutral-700 dark:text-neutral-300 font-semibold tracking-wide">Uptime</div>
            </div>
            <div className="text-center group">
              <div className="text-5xl sm:text-6xl font-bold text-forest-600 dark:text-jasmine-400 mb-3 group-hover:scale-110 transition-transform duration-300">
                &lt;{counts.speed}s
              </div>
              <div className="text-sm sm:text-base text-neutral-700 dark:text-neutral-300 font-semibold tracking-wide">Response Time</div>
            </div>
          </div>
        </div>
      </section> */}

      {/* Feature Section 1: Analytics (Full Width Image Left, Content Right) */}
      <section className="relative py-32 bg-jasmine-500 dark:bg-neutral-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            {/* Visual Mockup */}
            <div className="order-2 lg:order-1 animate-slide-in-left">
              <div className="relative group">
                <div className="absolute inset-0 bg-linear-to-br from-navy-600/20 to-forest-600/20 rounded-3xl blur-2xl group-hover:blur-3xl transition-all duration-500"></div>
                <div className="relative bg-white/80 dark:bg-forest-900/60 backdrop-blur-xl border border-neutral-200 dark:border-forest-700/50 rounded-3xl p-8 shadow-2xl hover-lift">
                  {/* Chart Preview */}
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-navy-600 rounded-xl flex items-center justify-center">
                          <svg className="w-7 h-7 text-neutral-900 dark:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                          </svg>
                        </div>
                        <div>
                          <div className="text-neutral-900 dark:text-white font-bold text-lg">Advanced Analytics</div>
                          <div className="text-neutral-400 text-sm">Real-time insights</div>
                        </div>
                      </div>
                      <div className="px-4 py-2 bg-jasmine-500/20 text-jasmine-400 rounded-lg text-sm font-semibold">Live</div>
                    </div>
                    {/* Mock Chart Bars */}
                    <div className="space-y-3 pt-4">
                      {[85, 70, 95, 60].map((width, i) => (
                        <div key={i} className="flex items-center gap-4">
                          <div className="w-16 text-neutral-400 text-sm">Q{i+1}</div>
                          <div className="flex-1 bg-neutral-100 dark:bg-forest-800/50 rounded-full h-4 overflow-hidden">
                            <div
                              className="h-full bg-linear-to-r from-jasmine-500 to-navy-500 rounded-full animate-shimmer"
                              style={{ width: `${width}%` }}
                            ></div>
                          </div>
                          <div className="w-12 text-jasmine-400 font-bold text-sm">{width}%</div>
                        </div>
                      ))}
                    </div>
                    <div className="grid grid-cols-3 gap-4 pt-4 border-t border-neutral-200 dark:border-forest-700/50">
                      <div>
                        <div className="text-neutral-400 text-xs mb-1">Trend</div>
                        <div className="text-forest-400 font-bold flex items-center gap-1">
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M12 7a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L8 10.414l-4.293 4.293a1 1 0 01-1.414-1.414l5-5a1 1 0 011.414 0L11 10.586 14.586 7H12z" clipRule="evenodd" />
                          </svg>
                          +12.5%
                        </div>
                      </div>
                      <div>
                        <div className="text-neutral-400 text-xs mb-1">Anomalies</div>
                        <div className="text-jasmine-400 font-bold">3 Found</div>
                      </div>
                      <div>
                        <div className="text-neutral-400 text-xs mb-1">Confidence</div>
                        <div className="text-neutral-900 dark:text-white font-bold">98.5%</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="order-1 lg:order-2 animate-slide-in-right">
              <div className="inline-block px-5 py-2 bg-navy-600/20 border border-navy-600/50 text-navy-400 rounded-full text-sm font-semibold mb-6">
                <span className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
                  </svg>
                  Analytics Dashboard
                </span>
              </div>
              <h2 className="text-5xl sm:text-6xl font-display font-bold text-neutral-900 dark:text-white mb-6 leading-tight">
                Unlock Deep Insights with AI
              </h2>
              <p className="text-xl text-neutral-700 dark:text-neutral-300 mb-8 leading-relaxed">
                Our advanced analytics engine processes your data in real-time, identifying trends, anomalies, and patterns you might miss.
              </p>

              <div className="space-y-5 mb-10">
                {[
                  { icon: '🔍', title: 'Smart Insights', desc: 'AI generates 4-6 actionable insights automatically' },
                  { icon: '📈', title: 'Trend Forecasting', desc: 'Predict future patterns using linear regression' },
                  { icon: '🎯', title: 'Anomaly Detection', desc: 'Statistical + AI-powered outlier identification' },
                  { icon: '🔗', title: 'Correlation Analysis', desc: 'Discover hidden relationships in your data' }
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-4 group">
                    <div className="flex-shrink-0 w-12 h-12 bg-white/80 dark:bg-forest-900/60 backdrop-blur-xl border border-neutral-200 dark:border-forest-700/50 rounded-xl flex items-center justify-center text-2xl group-hover:scale-110 transition-transform duration-300">
                      {item.icon}
                    </div>
                    <div>
                      <h4 className="text-white font-bold text-lg mb-1">{item.title}</h4>
                      <p className="text-neutral-400 text-sm">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              <Link
                href="/analytics"
                className="inline-flex items-center gap-3 px-8 py-4 bg-navy-600 text-white font-bold rounded-xl hover:bg-navy-500 transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105 group"
              >
                Explore Analytics
                <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Section 2: Visualizations (Content Left, Visual Right) */}
      <section className="relative py-32 bg-neutral-50 dark:bg-neutral-900/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            {/* Content */}
            <div className="animate-slide-in-left">
              <div className="inline-block px-5 py-2 bg-maroon-600/20 border border-maroon-600/50 text-maroon-400 rounded-full text-sm font-semibold mb-6">
                <span className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M2 10a8 8 0 018-8v8h8a8 8 0 11-16 0z" />
                    <path d="M12 2.252A8.014 8.014 0 0117.748 8H12V2.252z" />
                  </svg>
                  Visualization Builder
                </span>
              </div>
              <h2 className="text-5xl sm:text-6xl font-display font-bold text-neutral-900 dark:text-white mb-6 leading-tight">
                Create Stunning Visual Stories
              </h2>
              <p className="text-xl text-neutral-700 dark:text-neutral-300 mb-8 leading-relaxed">
                Transform complex data into beautiful, interactive charts that tell compelling stories. Choose from 15+ chart types with zero coding.
              </p>

              <div className="grid grid-cols-2 gap-4 mb-10">
                {[
                  { icon: '📊', name: 'Bar Charts', color: 'from-navy-500 to-navy-600' },
                  { icon: '📈', name: 'Line Graphs', color: 'from-forest-500 to-forest-600' },
                  { icon: '🥧', name: 'Pie Charts', color: 'from-maroon-500 to-maroon-600' },
                  { icon: '🔥', name: 'Heatmaps', color: 'from-rose-500 to-rose-600' },
                  { icon: '📉', name: 'Area Charts', color: 'from-brown-500 to-brown-600' },
                  { icon: '🎯', name: 'Scatter Plots', color: 'from-navy-600 to-forest-600' }
                ].map((chart, i) => (
                  <div key={i} className="flex items-center gap-3 p-4 bg-forest-900/40 backdrop-blur-xl border border-forest-700/30 rounded-xl hover:border-jasmine-500/50 transition-all duration-300 hover-lift group">
                    <div className={`w-10 h-10 bg-linear-to-br ${chart.color} rounded-lg flex items-center justify-center text-xl group-hover:scale-110 transition-transform duration-300`}>
                      {chart.icon}
                    </div>
                    <div className="text-white font-semibold text-sm">{chart.name}</div>
                  </div>
                ))}
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                <Link
                  href="/visualizations-advanced"
                  className="inline-flex items-center justify-center gap-3 px-8 py-4 bg-maroon-600 text-white font-bold rounded-xl hover:bg-maroon-500 transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105 group"
                >
                  Build Visualizations
                  <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </Link>
                {/* <button className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white/80 dark:bg-forest-900/60 backdrop-blur-xl border border-neutral-200 dark:border-forest-700/50 text-jasmine-300 font-bold rounded-xl hover:bg-neutral-50 dark:bg-forest-800/80 hover:border-jasmine-500/50 transition-all duration-300">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Watch Demo
                </button> */}
              </div>
            </div>

            {/* Visual Mockup */}
            <div className="animate-slide-in-right">
              <div className="relative group">
                <div className="absolute inset-0 bg-linear-to-br from-maroon-600/20 to-rose-600/20 rounded-3xl blur-2xl group-hover:blur-3xl transition-all duration-500"></div>
                <div className="relative bg-white/80 dark:bg-forest-900/60 backdrop-blur-xl border border-neutral-200 dark:border-forest-700/50 rounded-3xl p-8 shadow-2xl hover-lift">
                  {/* Chart Types Grid */}
                  <div className="grid grid-cols-2 gap-4">
                    {/* Pie Chart */}
                    <div className="bg-neutral-100 dark:bg-forest-800/50 rounded-2xl p-6 flex items-center justify-center">
                      <div className="relative w-32 h-32">
                        <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
                          <circle cx="18" cy="18" r="16" fill="transparent" stroke="#1B5E20" strokeWidth="4" strokeDasharray="30 70" />
                          <circle cx="18" cy="18" r="16" fill="transparent" stroke="#FDCF72" strokeWidth="4" strokeDasharray="25 75" strokeDashoffset="-30" />
                          <circle cx="18" cy="18" r="16" fill="transparent" stroke="#1565C0" strokeWidth="4" strokeDasharray="45 55" strokeDashoffset="-55" />
                        </svg>
                      </div>
                    </div>
                    {/* Bar Chart */}
                    <div className="bg-neutral-100 dark:bg-forest-800/50 rounded-2xl p-6 flex items-end justify-around gap-2">
                      <div className="w-6 bg-jasmine-500 rounded-t" style={{height: '60%'}}></div>
                      <div className="w-6 bg-navy-500 rounded-t" style={{height: '80%'}}></div>
                      <div className="w-6 bg-maroon-500 rounded-t" style={{height: '50%'}}></div>
                      <div className="w-6 bg-forest-500 rounded-t" style={{height: '90%'}}></div>
                    </div>
                    {/* Line Chart */}
                    <div className="bg-neutral-100 dark:bg-forest-800/50 rounded-2xl p-6 flex items-center justify-center col-span-2">
                      <svg className="w-full h-24" viewBox="0 0 200 80">
                        <polyline points="10,60 50,40 90,50 130,20 170,30" fill="none" stroke="#FDCF72" strokeWidth="3" />
                        <polyline points="10,50 50,65 90,35 130,45 170,15" fill="none" stroke="#1565C0" strokeWidth="3" strokeDasharray="5,5" />
                      </svg>
                    </div>
                  </div>
                  <div className="mt-6 flex items-center justify-between">
                    <div className="text-neutral-400 text-sm">15+ Chart Types</div>
                    <div className="flex gap-2">
                      <div className="w-2 h-2 rounded-full bg-jasmine-500"></div>
                      <div className="w-2 h-2 rounded-full bg-navy-500"></div>
                      <div className="w-2 h-2 rounded-full bg-maroon-500"></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Section 3: AI Assistant (Full Width Split) */}
      <section className="relative py-32 bg-jasmine-500 dark:bg-neutral-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            {/* Visual Mockup - Chat Interface */}
            <div className="animate-slide-in-left">
              <div className="relative group">
                <div className="absolute inset-0 bg-linear-to-br from-forest-600/20 to-jasmine-600/20 rounded-3xl blur-2xl group-hover:blur-3xl transition-all duration-500"></div>
                <div className="relative bg-white/80 dark:bg-forest-900/60 backdrop-blur-xl border border-neutral-200 dark:border-forest-700/50 rounded-3xl overflow-hidden shadow-2xl hover-lift">
                  {/* Chat Header */}
                  <div className="bg-neutral-50 dark:bg-forest-800/80 backdrop-blur-xl px-6 py-4 border-b border-neutral-200 dark:border-forest-700/50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-linear-to-br from-jasmine-500 to-jasmine-600 rounded-xl flex items-center justify-center">
                          <svg className="w-6 h-6 text-forest-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                          </svg>
                        </div>
                        <div>
                          <div className="text-neutral-900 dark:text-white font-bold">AI Assistant</div>
                          <div className="text-jasmine-400 text-xs flex items-center gap-1">
                            <span className="w-2 h-2 bg-forest-400 rounded-full animate-pulse"></span>
                            Online
                          </div>
                        </div>
                      </div>
                      <div className="px-3 py-1 bg-jasmine-500/20 text-jasmine-400 rounded-lg text-xs font-semibold">Gemini AI</div>
                    </div>
                  </div>

                  {/* Chat Messages */}
                  <div className="p-6 space-y-4 max-h-96 overflow-y-auto">
                    {/* User Message */}
                    <div className="flex justify-end">
                      <div className="bg-jasmine-500 text-forest-900 rounded-2xl rounded-tr-sm px-5 py-3 max-w-xs">
                        <p className="text-sm font-medium">What are the top 3 trends in my sales data?</p>
                      </div>
                    </div>

                    {/* AI Response */}
                    <div className="flex justify-start">
                      <div className="bg-neutral-50 dark:bg-forest-800/80 border border-neutral-200 dark:border-forest-700/50 text-white rounded-2xl rounded-tl-sm px-5 py-3 max-w-md">
                        <p className="text-sm leading-relaxed mb-3">Based on your Q4 sales data, here are the top 3 trends:</p>
                        <div className="space-y-2 text-sm">
                          <div className="flex items-start gap-2">
                            <span className="text-forest-400 font-bold">1.</span>
                            <span className="text-neutral-700 dark:text-neutral-300">Revenue increased 23% MoM</span>
                          </div>
                          <div className="flex items-start gap-2">
                            <span className="text-jasmine-400 font-bold">2.</span>
                            <span className="text-neutral-700 dark:text-neutral-300">Product A shows 40% growth</span>
                          </div>
                          <div className="flex items-start gap-2">
                            <span className="text-navy-400 font-bold">3.</span>
                            <span className="text-neutral-700 dark:text-neutral-300">Weekend sales up 15%</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Typing Indicator */}
                    <div className="flex justify-start">
                      <div className="bg-neutral-50 dark:bg-forest-800/80 border border-neutral-200 dark:border-forest-700/50 rounded-2xl rounded-tl-sm px-5 py-3">
                        <div className="flex gap-1">
                          <div className="w-2 h-2 bg-jasmine-400 rounded-full animate-bounce"></div>
                          <div className="w-2 h-2 bg-jasmine-400 rounded-full animate-bounce delay-100"></div>
                          <div className="w-2 h-2 bg-jasmine-400 rounded-full animate-bounce delay-200"></div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Chat Input */}
                  <div className="bg-neutral-50 dark:bg-forest-800/80 backdrop-blur-xl px-6 py-4 border-t border-neutral-200 dark:border-forest-700/50">
                    <div className="flex items-center gap-3 bg-white/80 dark:bg-forest-900/60 rounded-xl px-4 py-3 border border-neutral-200 dark:border-forest-700/50">
                      <input
                        type="text"
                        placeholder="Ask anything about your data..."
                        className="flex-1 bg-transparent text-neutral-900 dark:text-white text-sm placeholder-neutral-400 dark:placeholder-neutral-500 outline-none"
                        disabled
                      />
                      <button className="w-9 h-9 bg-jasmine-500 text-forest-900 rounded-lg flex items-center justify-center hover:bg-jasmine-400 transition-colors">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="animate-slide-in-right">
              <div className="inline-block px-5 py-2 bg-forest-600/20 border border-forest-600/50 text-forest-400 rounded-full text-sm font-semibold mb-6">
                <span className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                  </svg>
                  AI-Powered Assistant
                </span>
              </div>
              <h2 className="text-5xl sm:text-6xl font-display font-bold text-neutral-900 dark:text-white mb-6 leading-tight">
                Ask Questions, Get Instant Answers
              </h2>
              <p className="text-xl text-neutral-700 dark:text-neutral-300 mb-8 leading-relaxed">
                Chat with your data using natural language. Our AI assistant understands context and provides intelligent, actionable responses powered by Google Gemini.
              </p>

              <div className="space-y-5 mb-10">
                {[
                  { icon: '💬', title: 'Natural Language Queries', desc: 'Ask questions like you would to a data analyst' },
                  { icon: '🧠', title: 'Context-Aware Responses', desc: 'AI understands your page context for relevant answers' },
                  { icon: '⚡', title: 'Instant Processing', desc: 'Get answers in under 2 seconds with caching' },
                  { icon: '📋', title: 'Follow-Up Suggestions', desc: 'Smart recommendations for next questions' }
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-4 group">
                    <div className="flex-shrink-0 w-12 h-12 bg-white/80 dark:bg-forest-900/60 backdrop-blur-xl border border-neutral-200 dark:border-forest-700/50 rounded-xl flex items-center justify-center text-2xl group-hover:scale-110 transition-transform duration-300">
                      {item.icon}
                    </div>
                    <div>
                      <h4 className="text-white font-bold text-lg mb-1">{item.title}</h4>
                      <p className="text-neutral-400 text-sm">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              <Link
                href="/ai-assistant"
                className="inline-flex items-center gap-3 px-8 py-4 bg-forest-600 text-white font-bold rounded-xl hover:bg-forest-500 transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105 group"
              >
                Try AI Assistant
                <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative py-32 bg-gradient-to-br from-white via-jasmine-50 to-jasmine-100 dark:from-forest-900 dark:via-forest-800 dark:to-forest-900">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(253,207,114,0.2),transparent_70%)] dark:bg-[radial-gradient(circle_at_50%_50%,rgba(253,207,114,0.1),transparent_70%)]"></div>
        <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-5xl sm:text-6xl font-display font-bold text-neutral-900 dark:text-white mb-6 leading-tight">
            Ready to Transform Your Data?
          </h2>
          <p className="text-xl text-neutral-700 dark:text-neutral-300 mb-10 leading-relaxed">
            Join thousands of data professionals who trust InsightFlow for their analytics needs.
          </p>
          <div className="flex flex-col sm:flex-row gap-6 justify-center">
            <Link
              href="/signup"
              className="px-10 py-5 bg-forest-600 dark:bg-jasmine-500 text-white dark:text-forest-900 font-bold rounded-2xl hover:bg-forest-700 dark:hover:bg-jasmine-400 transition-all duration-300 shadow-2xl shadow-forest-600/30 dark:shadow-jasmine-500/30 hover:shadow-forest-600/50 dark:hover:shadow-jasmine-500/50 hover:scale-105 text-lg group"
            >
              <span className="flex items-center justify-center gap-3">
                Get Started Free
                <svg className="w-6 h-6 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </span>
            </Link>
            {/* <button className="px-10 py-5 bg-white/80 dark:bg-forest-700/60 backdrop-blur-xl border-2 border-neutral-200 dark:border-forest-600/50 text-forest-700 dark:text-jasmine-300 font-bold rounded-2xl hover:bg-white dark:hover:bg-forest-600/80 hover:border-forest-600 dark:hover:border-jasmine-500/50 transition-all duration-300 text-lg">
              Schedule Demo
            </button> */}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white dark:bg-neutral-950 border-t border-neutral-200 dark:border-forest-800/50 text-neutral-600 dark:text-neutral-400 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
            <div>
              <h3 className="text-neutral-900 dark:text-white font-bold text-xl mb-4 flex items-center gap-3">
                <div className="relative w-10 h-10 rounded-full overflow-hidden bg-jasmine-500">
                  <img src="/logo.png" alt="InsightFlow" className="w-full h-full object-cover" />
                </div>
                InsightFlow
              </h3>
              <p className="text-sm leading-relaxed">AI-powered data analysis for modern teams. Transform raw data into actionable insights.</p>
            </div>
            <div>
              <h4 className="text-neutral-900 dark:text-white font-semibold mb-4 text-sm tracking-wide uppercase">Product</h4>
              <ul className="space-y-3 text-sm">
                <li><Link href="/dashboard" className="hover:text-forest-600 dark:hover:text-jasmine-400 transition-colors">Dashboard</Link></li>
                <li><Link href="/analytics" className="hover:text-forest-600 dark:hover:text-jasmine-400 transition-colors">Analytics</Link></li>
                <li><Link href="/visualizations-advanced" className="hover:text-forest-600 dark:hover:text-jasmine-400 transition-colors">Visualizations</Link></li>
                <li><Link href="/ai-assistant" className="hover:text-forest-600 dark:hover:text-jasmine-400 transition-colors">AI Assistant</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-neutral-900 dark:text-white font-semibold mb-4 text-sm tracking-wide uppercase">Company</h4>
              <ul className="space-y-3 text-sm">
                <li><a href="#" className="hover:text-forest-600 dark:hover:text-jasmine-400 transition-colors">About Us</a></li>
                <li><a href="#" className="hover:text-forest-600 dark:hover:text-jasmine-400 transition-colors">Careers</a></li>
                <li><a href="#" className="hover:text-forest-600 dark:hover:text-jasmine-400 transition-colors">Blog</a></li>
                <li><a href="#" className="hover:text-forest-600 dark:hover:text-jasmine-400 transition-colors">Contact</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-neutral-900 dark:text-white font-semibold mb-4 text-sm tracking-wide uppercase">Legal</h4>
              <ul className="space-y-3 text-sm">
                <li><a href="#" className="hover:text-forest-600 dark:hover:text-jasmine-400 transition-colors">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-forest-600 dark:hover:text-jasmine-400 transition-colors">Terms of Service</a></li>
                <li><a href="#" className="hover:text-forest-600 dark:hover:text-jasmine-400 transition-colors">Security</a></li>
                <li><a href="#" className="hover:text-forest-600 dark:hover:text-jasmine-400 transition-colors">GDPR</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-neutral-200 dark:border-forest-800/50 pt-8 flex flex-col sm:flex-row justify-between items-center gap-4">
            <p className="text-sm">&copy; 2025 InsightFlow. All rights reserved.</p>
            <div className="flex gap-6">
              <a href="#" className="text-neutral-600 dark:text-neutral-400 hover:text-forest-600 dark:hover:text-jasmine-400 transition-colors">
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
              </a>
              <a href="#" className="text-neutral-600 dark:text-neutral-400 hover:text-forest-600 dark:hover:text-jasmine-400 transition-colors">
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/></svg>
              </a>
              <a href="#" className="text-neutral-600 dark:text-neutral-400 hover:text-forest-600 dark:hover:text-jasmine-400 transition-colors">
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
