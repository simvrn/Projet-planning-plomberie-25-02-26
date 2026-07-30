import { useState, useRef, useEffect } from 'react';
import { useStore } from '../../store/useStore';
import { Chip } from '../ui/Chip';
import { getContrastTextColor } from '../../utils/colors';
import type { Technician } from '../../types';

interface TechnicianSelectProps {
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  maxSelection?: number;
}

const MAX_TECHNICIANS = 4;

export function TechnicianSelect({
  selectedIds,
  onChange,
  maxSelection = MAX_TECHNICIANS,
}: TechnicianSelectProps) {
  const [inputValue, setInputValue] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [showMaxWarning, setShowMaxWarning] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const {
    getTopTechnicians,
    searchTechnicians,
    getOrCreateTechnician,
    getTechnicianById,
  } = useStore();

  // Only show active technicians
  const topTechnicians = getTopTechnicians(5);
  const suggestions = inputValue.trim()
    ? searchTechnicians(inputValue)
    : topTechnicians;

  // Filter out already selected
  const filteredSuggestions = suggestions.filter(
    (t) => !selectedIds.includes(t.id)
  );

  const selectedTechnicians = selectedIds
    .map((id) => getTechnicianById(id))
    .filter((t): t is Technician => t !== undefined);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Hide warning after delay
  useEffect(() => {
    if (showMaxWarning) {
      const timer = setTimeout(() => setShowMaxWarning(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [showMaxWarning]);

  const handleSelectTechnician = (tech: Technician) => {
    if (selectedIds.length >= maxSelection) {
      setShowMaxWarning(true);
      return;
    }
    onChange([...selectedIds, tech.id]);
    setInputValue('');
    setHighlightedIndex(-1);
    inputRef.current?.focus();
  };

  const handleRemoveTechnician = (id: string) => {
    onChange(selectedIds.filter((tid) => tid !== id));
    setShowMaxWarning(false);
  };

  const handleCreateAndSelect = () => {
    const name = inputValue.trim();
    if (!name) return;

    if (selectedIds.length >= maxSelection) {
      setShowMaxWarning(true);
      return;
    }

    const tech = getOrCreateTechnician(name);
    onChange([...selectedIds, tech.id]);
    setInputValue('');
    setHighlightedIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        Math.min(prev + 1, filteredSuggestions.length - 1)
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) => Math.max(prev - 1, -1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (highlightedIndex >= 0 && filteredSuggestions[highlightedIndex]) {
        handleSelectTechnician(filteredSuggestions[highlightedIndex]);
      } else if (inputValue.trim()) {
        handleCreateAndSelect();
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    } else if (e.key === 'Backspace' && !inputValue && selectedIds.length > 0) {
      handleRemoveTechnician(selectedIds[selectedIds.length - 1]);
    }
  };

  const canAddMore = selectedIds.length < maxSelection;

  return (
    <div ref={containerRef} className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">
        Technicien(s){' '}
        <span className={`${selectedIds.length >= maxSelection ? 'text-amber-600 font-semibold' : 'text-gray-400'}`}>
          ({selectedIds.length}/{maxSelection})
        </span>
      </label>

      {/* Max warning */}
      {showMaxWarning && (
        <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
          <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span>{maxSelection} techniciens maximum par intervention</span>
        </div>
      )}

      {/* Top 5 quick select chips */}
      {canAddMore && topTechnicians.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {topTechnicians
            .filter((t) => !selectedIds.includes(t.id))
            .slice(0, 5)
            .map((tech) => (
              <button
                key={tech.id}
                type="button"
                onClick={() => handleSelectTechnician(tech)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors hover:opacity-80"
                style={{
                  backgroundColor: tech.color + '20',
                  color: tech.color,
                  border: `1px solid ${tech.color}40`,
                }}
              >
                <span
                  className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold"
                  style={{
                    backgroundColor: tech.color,
                    color: getContrastTextColor(tech.color),
                  }}
                >
                  {tech.name.charAt(0).toUpperCase()}
                </span>
                {tech.name}
              </button>
            ))}
        </div>
      )}

      {/* Selected technicians */}
      {selectedTechnicians.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedTechnicians.map((tech) => (
            <Chip
              key={tech.id}
              selected
              onRemove={() => handleRemoveTechnician(tech.id)}
              className="!pl-1"
            >
              <span
                className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold mr-1"
                style={{
                  backgroundColor: tech.color,
                  color: getContrastTextColor(tech.color),
                }}
              >
                {tech.name.charAt(0).toUpperCase()}
              </span>
              {tech.name}
              {!tech.isActive && (
                <span className="ml-1 text-xs text-gray-400">(inactif)</span>
              )}
            </Chip>
          ))}
        </div>
      )}

      {/* Input */}
      {canAddMore && (
        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => {
              setInputValue(e.target.value);
              setHighlightedIndex(-1);
              setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
            onKeyDown={handleKeyDown}
            placeholder="Ajouter un technicien..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />

          {/* Suggestions dropdown */}
          {isOpen && (filteredSuggestions.length > 0 || inputValue.trim()) && (
            <div className="absolute z-10 mt-1 w-full max-h-48 overflow-auto bg-white border border-gray-200 rounded-lg shadow-lg">
              {filteredSuggestions.map((tech, index) => (
                <button
                  key={tech.id}
                  type="button"
                  onClick={() => handleSelectTechnician(tech)}
                  className={`
                    w-full px-3 py-2 text-left text-sm transition-colors flex items-center gap-3
                    ${index === highlightedIndex ? 'bg-blue-50' : 'hover:bg-gray-50'}
                  `}
                >
                  <span
                    className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                    style={{
                      backgroundColor: tech.color,
                      color: getContrastTextColor(tech.color),
                    }}
                  >
                    {tech.name.charAt(0).toUpperCase()}
                  </span>
                  <span className="flex-1">{tech.name}</span>
                  <span className="text-xs text-gray-400">
                    {tech.usageCount} intervention{tech.usageCount !== 1 ? 's' : ''}
                  </span>
                </button>
              ))}

              {inputValue.trim() && !filteredSuggestions.some(
                (t) => t.name.toLowerCase() === inputValue.trim().toLowerCase()
              ) && (
                <button
                  type="button"
                  onClick={handleCreateAndSelect}
                  className="w-full px-3 py-2 text-left text-sm text-blue-600 hover:bg-blue-50 transition-colors border-t border-gray-100"
                >
                  + Créer "{inputValue.trim()}"
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Hint when at max */}
      {!canAddMore && (
        <p className="text-xs text-gray-500">
          Maximum atteint. Retirez un technicien pour en ajouter un autre.
        </p>
      )}
    </div>
  );
}
