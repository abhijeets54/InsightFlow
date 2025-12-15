import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface ShortcutConfig {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  action: () => void;
  description: string;
}

export const GLOBAL_SHORTCUTS: ShortcutConfig[] = [
  {
    key: 'd',
    ctrl: true,
    description: 'Go to Dashboard',
    action: () => {},
  },
  {
    key: 'a',
    ctrl: true,
    description: 'Go to Analytics',
    action: () => {},
  },
  {
    key: 'v',
    ctrl: true,
    description: 'Go to Visualizations',
    action: () => {},
  },
  {
    key: 'u',
    ctrl: true,
    description: 'Upload File',
    action: () => {},
  },
  {
    key: 'e',
    ctrl: true,
    description: 'Export Data',
    action: () => {},
  },
  {
    key: 's',
    ctrl: true,
    description: 'Share Dashboard',
    action: () => {},
  },
  {
    key: 'f',
    ctrl: true,
    description: 'Open AI Forecast',
    action: () => {},
  },
  {
    key: '/',
    description: 'Open AI Chat (Search)',
    action: () => {},
  },
  {
    key: '?',
    shift: true,
    description: 'Show Keyboard Shortcuts',
    action: () => {},
  },
];

export function useKeyboardShortcuts(customShortcuts?: ShortcutConfig[]) {
  const router = useRouter();

  useEffect(() => {
    const shortcuts = customShortcuts || GLOBAL_SHORTCUTS;

    const handleKeyDown = (event: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in input fields
      const target = event.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        // Exception: Allow '/' to open search even in inputs
        if (event.key !== '/') {
          return;
        }
      }

      shortcuts.forEach((shortcut) => {
        const ctrlMatch = shortcut.ctrl ? event.ctrlKey || event.metaKey : !event.ctrlKey && !event.metaKey;
        const shiftMatch = shortcut.shift ? event.shiftKey : !event.shiftKey;
        const altMatch = shortcut.alt ? event.altKey : !event.altKey;

        if (
          event.key.toLowerCase() === shortcut.key.toLowerCase() &&
          ctrlMatch &&
          shiftMatch &&
          altMatch
        ) {
          event.preventDefault();
          shortcut.action();
        }
      });
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [customShortcuts, router]);
}

export function getShortcutString(shortcut: ShortcutConfig): string {
  const parts: string[] = [];

  if (shortcut.ctrl) parts.push('Ctrl');
  if (shortcut.shift) parts.push('Shift');
  if (shortcut.alt) parts.push('Alt');

  parts.push(shortcut.key.toUpperCase());

  return parts.join(' + ');
}
