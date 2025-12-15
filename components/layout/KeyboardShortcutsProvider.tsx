'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import KeyboardShortcutsModal from '../ui/KeyboardShortcutsModal';

export default function KeyboardShortcutsProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in input fields
      const target = event.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }

      const key = event.key.toLowerCase();
      const ctrl = event.ctrlKey || event.metaKey;

      // Navigation shortcuts
      if (ctrl && key === 'd') {
        event.preventDefault();
        router.push('/dashboard');
      } else if (ctrl && key === 'a') {
        event.preventDefault();
        router.push('/analytics');
      } else if (ctrl && key === 'v') {
        event.preventDefault();
        router.push('/visualizations');
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [router]);

  return (
    <>
      {children}
      <KeyboardShortcutsModal />
    </>
  );
}
