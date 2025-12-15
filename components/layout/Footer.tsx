'use client';

import Link from 'next/link';
import Image from 'next/image';

export default function Footer() {
  return (
    <footer className="bg-forest-700 text-neutral-300 py-12 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          <div>
            <h3 className="text-white font-bold text-lg mb-3 flex items-center gap-2">
              <Image 
                src="/logo.png" 
                alt="InsightFlow" 
                width={32}
                height={32}
                className="h-8 w-8 rounded-full"
              />
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
        <div className="border-t border-neutral-800 pt-6 text-center text-sm">
          <p>&copy; 2025 InsightFlow. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
