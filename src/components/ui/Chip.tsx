import type { ReactNode } from 'react';

interface ChipProps {
  children: ReactNode;
  onClick?: () => void;
  onRemove?: () => void;
  selected?: boolean;
  className?: string;
}

export function Chip({ children, onClick, onRemove, selected, className = '' }: ChipProps) {
  const baseStyles = 'inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium transition-colors';

  const interactiveStyles = onClick
    ? 'cursor-pointer hover:bg-blue-100'
    : '';

  const selectedStyles = selected
    ? 'bg-blue-600 text-white'
    : 'bg-gray-100 text-gray-700';

  return (
    <span
      className={`${baseStyles} ${interactiveStyles} ${selectedStyles} ${className}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={(e) => {
        if (onClick && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onClick();
        }
      }}
    >
      {children}
      {onRemove && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="ml-1 hover:bg-blue-200 rounded-full p-0.5 focus:outline-none"
          aria-label="Retirer"
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </span>
  );
}
