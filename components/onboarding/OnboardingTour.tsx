'use client';

import { useState, useEffect } from 'react';

interface TourStep {
  id: string;
  title: string;
  description: string;
  target?: string; // CSS selector for element to highlight
  position: 'top' | 'bottom' | 'left' | 'right' | 'center';
  action?: () => void;
}

const TOUR_STEPS: TourStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to InsightFlow! 🎉',
    description: 'Let\'s take a quick tour to help you get started with our powerful data analytics platform.',
    position: 'center',
  },
  {
    id: 'upload',
    title: 'Upload Your Data 📤',
    description: 'Start by uploading your CSV files here. We support files up to 100MB with intelligent sampling for large datasets.',
    target: '[data-tour="upload-section"]',
    position: 'bottom',
  },
  {
    id: 'samples',
    title: 'Try Sample Datasets 🎯',
    description: 'Don\'t have data? No problem! Use our professional sample datasets to explore features instantly.',
    target: '[data-tour="sample-datasets"]',
    position: 'top',
  },
  {
    id: 'navigation',
    title: 'Quick Navigation 🧭',
    description: 'Access Analytics, Visualizations, and more from the navigation bar. Use keyboard shortcuts (Ctrl+D, Ctrl+A, Ctrl+V) for faster navigation.',
    target: 'nav',
    position: 'bottom',
  },
  {
    id: 'analytics',
    title: 'Powerful Analytics 📊',
    description: 'The Analytics page shows comprehensive charts, AI insights, forecasting, and custom filters for your data.',
    position: 'center',
  },
  {
    id: 'visualizations',
    title: 'Custom Visualizations 📈',
    description: 'Create beautiful charts with our AI-powered chart recommendations and customizable views.',
    position: 'center',
  },
  {
    id: 'ai-features',
    title: 'AI-Powered Features 🤖',
    description: 'Use AI chat for natural language queries, get smart insights, trend forecasting, and chart suggestions - all FREE!',
    position: 'center',
  },
  {
    id: 'sharing',
    title: 'Share Your Work 🔗',
    description: 'Export to PDF/Excel/CSV or create public shareable links with optional password protection.',
    position: 'center',
  },
  {
    id: 'shortcuts',
    title: 'Keyboard Shortcuts ⌨️',
    description: 'Press Shift+? anytime to see all keyboard shortcuts. Work faster with Ctrl+U (upload), Ctrl+E (export), Ctrl+F (forecast), and more!',
    position: 'center',
  },
  {
    id: 'complete',
    title: 'You\'re All Set! 🚀',
    description: 'You\'re ready to analyze your data like a pro. Need help? Press Shift+? for shortcuts or explore our features. Happy analyzing!',
    position: 'center',
  },
];

export default function OnboardingTour() {
  const [showTour, setShowTour] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [targetElement, setTargetElement] = useState<HTMLElement | null>(null);

  useEffect(() => {
    // Check if user has completed onboarding
    const hasCompletedOnboarding = localStorage.getItem('hasCompletedOnboarding');
    if (!hasCompletedOnboarding) {
      // Show tour after a brief delay
      setTimeout(() => setShowTour(true), 1000);
    }
  }, []);

  // Keyboard navigation for tour
  useEffect(() => {
    if (!showTour) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'Enter') {
        e.preventDefault();
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrevious();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        handleSkip();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentStep, showTour]);

  useEffect(() => {
    if (!showTour) return;

    const step = TOUR_STEPS[currentStep];
    if (step.target) {
      const element = document.querySelector(step.target) as HTMLElement;
      setTargetElement(element);

      // Scroll element into view
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    } else {
      setTargetElement(null);
    }
  }, [currentStep, showTour]);

  const handleNext = () => {
    if (currentStep < TOUR_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      completeTour();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    completeTour();
  };

  const completeTour = () => {
    localStorage.setItem('hasCompletedOnboarding', 'true');
    setShowTour(false);
  };

  if (!showTour) return null;

  const step = TOUR_STEPS[currentStep];
  const progress = ((currentStep + 1) / TOUR_STEPS.length) * 100;

  // Get tooltip position
  const getTooltipPosition = () => {
    if (!targetElement || step.position === 'center') {
      return {
        position: 'fixed' as const,
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
      };
    }

    const rect = targetElement.getBoundingClientRect();
    const tooltipWidth = 400;
    const tooltipHeight = 250;
    const offset = 20;

    switch (step.position) {
      case 'bottom':
        return {
          position: 'fixed' as const,
          top: rect.bottom + offset,
          left: rect.left + rect.width / 2 - tooltipWidth / 2,
        };
      case 'top':
        return {
          position: 'fixed' as const,
          top: rect.top - tooltipHeight - offset,
          left: rect.left + rect.width / 2 - tooltipWidth / 2,
        };
      case 'left':
        return {
          position: 'fixed' as const,
          top: rect.top + rect.height / 2 - tooltipHeight / 2,
          left: rect.left - tooltipWidth - offset,
        };
      case 'right':
        return {
          position: 'fixed' as const,
          top: rect.top + rect.height / 2 - tooltipHeight / 2,
          left: rect.right + offset,
        };
      default:
        return {
          position: 'fixed' as const,
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
        };
    }
  };

  return (
    <>
      {/* Overlay with Blur Background */}
      <div 
        className="fixed inset-0 z-[100] transition-all"
        onClick={() => {
          // Allow clicking outside to proceed (easier UX)
          if (!targetElement) handleNext();
        }}
      >
        {/* Backdrop Blur Effect */}
        <div className="absolute inset-0 bg-black/40 backdrop-blur-md" />
        
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-purple-500/5 to-pink-500/5" />

        {/* Highlight target element */}
        {targetElement && (
          <div
            className="absolute border-4 border-blue-500 rounded-lg pointer-events-none shadow-lg shadow-blue-500/50 animate-pulse"
            style={{
              top: targetElement.offsetTop - 4,
              left: targetElement.offsetLeft - 4,
              width: targetElement.offsetWidth + 8,
              height: targetElement.offsetHeight + 8,
              boxShadow: '0 0 20px rgba(59, 130, 246, 0.5), inset 0 0 20px rgba(59, 130, 246, 0.1)',
            }}
          />
        )}
      </div>

      {/* Tooltip */}
      <div
        className="fixed z-[101] bg-white rounded-xl shadow-2xl w-[400px] max-w-[90vw] backdrop-blur-sm border border-white/80"
        style={{...getTooltipPosition(), pointerEvents: 'auto'}}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Progress Bar */}
        <div className="h-1 bg-neutral-200 rounded-t-xl overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-xl font-display font-bold text-neutral-900">
                {step.title}
              </h3>
              <p className="text-xs text-neutral-600 mt-1">
                Step {currentStep + 1} of {TOUR_STEPS.length}
              </p>
            </div>
            <button
              onClick={handleSkip}
              className="text-neutral-400 hover:text-neutral-600 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Description */}
          <p className="text-sm text-neutral-700 mb-6 leading-relaxed">
            {step.description}
          </p>

          {/* Actions */}
          <div className="flex items-center justify-between gap-2">
            <button
              onClick={handleSkip}
              className="text-sm text-neutral-600 hover:text-neutral-900 transition-colors font-medium"
            >
              Skip Tour
            </button>

            <div className="flex gap-2">
              {currentStep > 0 && (
                <button
                  onClick={handlePrevious}
                  className="px-4 py-2.5 border-2 border-neutral-300 text-neutral-700 rounded-lg hover:bg-neutral-50 hover:border-neutral-400 transition-all text-sm font-semibold active:scale-95"
                  title="Press ← Arrow or Left Click"
                >
                  Previous
                </button>
              )}
              <button
                onClick={handleNext}
                className="px-6 py-2.5 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg hover:from-blue-600 hover:to-purple-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all text-sm font-semibold shadow-lg hover:shadow-xl active:scale-95"
                title="Press → Arrow or Enter"
              >
                {currentStep === TOUR_STEPS.length - 1 ? 'Get Started 🚀' : 'Next'}
              </button>
            </div>
          </div>
        </div>

        {/* Step Indicators */}
        <div className="px-6 pb-6 flex gap-1 justify-center">
          {TOUR_STEPS.map((_, index) => (
            <div
              key={index}
              className={`h-1.5 rounded-full transition-all ${
                index === currentStep
                  ? 'w-8 bg-blue-500'
                  : index < currentStep
                  ? 'w-1.5 bg-blue-300'
                  : 'w-1.5 bg-neutral-300'
              }`}
            />
          ))}
        </div>
      </div>
    </>
  );
}
