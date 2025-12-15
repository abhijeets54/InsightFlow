import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export default function Card({
  children,
  className = '',
  hover = false,
  padding = 'md',
  ...rest
}: CardProps) {
  const paddingStyles = {
    none: '',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
  };

  return (
    <div
      className={`
        bg-white rounded-xl shadow-soft border border-neutral-200
        ${hover ? 'hover:shadow-medium transition-shadow duration-200' : ''}
        ${paddingStyles[padding]}
        ${className}
      `}
      {...rest}
    >
      {children}
    </div>
  );
}
