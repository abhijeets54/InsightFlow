'use client';

import { useState, useEffect } from 'react';
import Card from './Card';
import { GLOBAL_SHORTCUTS, getShortcutString } from '@/hooks/useKeyboardShortcuts';

export default function KeyboardShortcutsModal() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Show/hide with Shift + ?
      if (event.shiftKey && event.key === '?') {
        event.preventDefault();
        setShow((prev) => !prev);
      }

      // Close with Escape
      if (event.key === 'Escape' && show) {
        setShow(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [show]);

  if (!show) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
        onClick={() => setShow(false)}
      >
        {/* Modal */}
        <div
          className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-6">
            {/* Header */}
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 className="text-2xl font-display font-bold text-neutral-900">
                  Keyboard Shortcuts
                </h2>
                <p className="text-sm text-neutral-600 mt-1">
                  Work faster with keyboard shortcuts
                </p>
              </div>
              <button
                onClick={() => setShow(false)}
                className="text-neutral-400 hover:text-neutral-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Shortcuts List */}
            <div className="space-y-6">
              {/* Navigation */}
              <div>
                <h3 className="text-sm font-semibold text-neutral-900 mb-3 flex items-center gap-2">
                  <svg className="w-4 h-4 text-forest-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                  Navigation
                </h3>
                <div className="space-y-2">
                  {[
                    { key: 'Ctrl + D', desc: 'Go to Dashboard' },
                    { key: 'Ctrl + A', desc: 'Go to Analytics' },
                    { key: 'Ctrl + V', desc: 'Go to Visualizations' },
                  ].map((shortcut) => (
                    <div key={shortcut.key} className="flex items-center justify-between py-2 px-3 bg-neutral-50 rounded-lg">
                      <span className="text-sm text-neutral-700">{shortcut.desc}</span>
                      <kbd className="px-3 py-1 bg-white border border-neutral-300 rounded text-xs font-mono font-semibold text-neutral-900 shadow-sm">
                        {shortcut.key}
                      </kbd>
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div>
                <h3 className="text-sm font-semibold text-neutral-900 mb-3 flex items-center gap-2">
                  <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Actions
                </h3>
                <div className="space-y-2">
                  {[
                    { key: 'Ctrl + U', desc: 'Upload File' },
                    { key: 'Ctrl + E', desc: 'Export Data' },
                    { key: 'Ctrl + S', desc: 'Share Dashboard' },
                    { key: 'Ctrl + F', desc: 'Open AI Forecast' },
                  ].map((shortcut) => (
                    <div key={shortcut.key} className="flex items-center justify-between py-2 px-3 bg-neutral-50 rounded-lg">
                      <span className="text-sm text-neutral-700">{shortcut.desc}</span>
                      <kbd className="px-3 py-1 bg-white border border-neutral-300 rounded text-xs font-mono font-semibold text-neutral-900 shadow-sm">
                        {shortcut.key}
                      </kbd>
                    </div>
                  ))}
                </div>
              </div>

              {/* Search & Help */}
              <div>
                <h3 className="text-sm font-semibold text-neutral-900 mb-3 flex items-center gap-2">
                  <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  Search & Help
                </h3>
                <div className="space-y-2">
                  {[
                    { key: '/', desc: 'Open AI Chat' },
                    { key: 'Shift + ?', desc: 'Toggle this help menu' },
                    { key: 'Esc', desc: 'Close dialogs/menus' },
                  ].map((shortcut) => (
                    <div key={shortcut.key} className="flex items-center justify-between py-2 px-3 bg-neutral-50 rounded-lg">
                      <span className="text-sm text-neutral-700">{shortcut.desc}</span>
                      <kbd className="px-3 py-1 bg-white border border-neutral-300 rounded text-xs font-mono font-semibold text-neutral-900 shadow-sm">
                        {shortcut.key}
                      </kbd>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer Tip */}
            <div className="mt-6 p-4 bg-gradient-to-r from-jasmine-50 to-jasmine-100 border border-jasmine-200 rounded-lg">
              <div className="flex items-start gap-2">
                <svg className="w-4 h-4 text-neutral-700 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                <div>
                  <p className="text-xs font-semibold text-neutral-900">Pro Tip</p>
                  <p className="text-xs text-neutral-700 mt-1">
                    Press <kbd className="px-1 py-0.5 bg-white border border-neutral-300 rounded text-xs font-mono">Shift + ?</kbd> anytime to see this menu
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
