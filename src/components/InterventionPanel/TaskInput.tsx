import { useState, useRef, useEffect } from 'react';
import { useStore } from '../../store/useStore';

interface TaskInputProps {
  value: string;
  onChange: (value: string) => void;
}

export function TaskInput({ value, onChange }: TaskInputProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const { getTopTaskKeywords, searchTaskKeywords } = useStore();

  const suggestions = value.trim()
    ? searchTaskKeywords(value)
    : getTopTaskKeywords(8);

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

  const handleSelectSuggestion = (text: string) => {
    onChange(text);
    setIsOpen(false);
    setHighlightedIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || suggestions.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        Math.min(prev + 1, suggestions.length - 1)
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) => Math.max(prev - 1, -1));
    } else if (e.key === 'Tab' && highlightedIndex >= 0) {
      e.preventDefault();
      handleSelectSuggestion(suggestions[highlightedIndex].text);
    } else if (e.key === 'Enter' && highlightedIndex >= 0) {
      e.preventDefault();
      handleSelectSuggestion(suggestions[highlightedIndex].text);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <label className="block text-sm font-medium text-gray-700 mb-1">
        Description de la tâche
      </label>

      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setHighlightedIndex(-1);
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        onKeyDown={handleKeyDown}
        placeholder="Ex: Installation chauffe-eau, Réparation fuite..."
        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      />

      {/* Suggestions dropdown */}
      {isOpen && suggestions.length > 0 && (
        <div className="absolute z-10 mt-1 w-full max-h-48 overflow-auto bg-white border border-gray-200 rounded-lg shadow-lg">
          {suggestions.map((keyword, index) => (
            <button
              key={keyword.id}
              type="button"
              onClick={() => handleSelectSuggestion(keyword.text)}
              className={`
                w-full px-3 py-2 text-left text-sm transition-colors flex items-center justify-between
                ${index === highlightedIndex ? 'bg-blue-50' : 'hover:bg-gray-50'}
              `}
            >
              <span className="flex items-center gap-2">
                {keyword.shortcut && (
                  <span className="px-1.5 py-0.5 bg-gray-100 text-gray-600 text-xs rounded font-mono">
                    {keyword.shortcut}
                  </span>
                )}
                <span>{keyword.text}</span>
              </span>
              <span className="text-xs text-gray-400">
                {keyword.usageCount}x
              </span>
            </button>
          ))}
        </div>
      )}

      <p className="mt-1 text-xs text-gray-500">
        Tapez pour filtrer ou créer. Utilisez les flèches et Tab/Entrée.
      </p>
    </div>
  );
}
