import { useState, useRef, useEffect } from 'react';
import { TIME_SLOTS, roundToHalfHour } from '../../utils/time';

interface TimeSelectProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  minTime?: string;
  error?: string;
}

export function TimeSelect({ label, value, onChange, minTime, error }: TimeSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setInputValue(value);
  }, [value]);

  // Scroll to selected time when dropdown opens
  useEffect(() => {
    if (isOpen && listRef.current) {
      const selectedIndex = TIME_SLOTS.indexOf(value);
      if (selectedIndex !== -1) {
        const itemHeight = 36;
        listRef.current.scrollTop = Math.max(0, selectedIndex * itemHeight - 100);
      }
    }
  }, [isOpen, value]);

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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputValue(val);

    // Auto-format as user types
    if (/^\d{1,2}:\d{2}$/.test(val)) {
      const rounded = roundToHalfHour(val);
      onChange(rounded);
    }
  };

  const handleInputBlur = () => {
    // Round and validate on blur
    if (/^\d{1,2}(:\d{0,2})?$/.test(inputValue)) {
      let formatted = inputValue;
      if (!inputValue.includes(':')) {
        formatted = `${inputValue.padStart(2, '0')}:00`;
      } else if (inputValue.split(':')[1].length < 2) {
        const [h, m] = inputValue.split(':');
        formatted = `${h.padStart(2, '0')}:${(m || '0').padEnd(2, '0')}`;
      }
      const rounded = roundToHalfHour(formatted);
      setInputValue(rounded);
      onChange(rounded);
    } else {
      setInputValue(value);
    }
  };

  const handleSelectTime = (time: string) => {
    onChange(time);
    setInputValue(time);
    setIsOpen(false);
  };

  const filteredSlots = minTime
    ? TIME_SLOTS.filter((t) => t > minTime)
    : TIME_SLOTS;

  return (
    <div ref={containerRef} className="relative">
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
      </label>
      <div className="relative">
        <input
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onBlur={handleInputBlur}
          onFocus={() => setIsOpen(true)}
          placeholder="08:00"
          className={`
            w-full px-3 py-2 border rounded-lg text-gray-900 placeholder-gray-400
            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
            ${error ? 'border-red-500' : 'border-gray-300'}
          `}
        />
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </button>
      </div>

      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}

      {/* Dropdown */}
      {isOpen && (
        <div
          ref={listRef}
          className="absolute z-10 mt-1 w-full max-h-48 overflow-auto bg-white border border-gray-200 rounded-lg shadow-lg"
        >
          {filteredSlots.map((time) => (
            <button
              key={time}
              type="button"
              onClick={() => handleSelectTime(time)}
              className={`
                w-full px-3 py-2 text-left text-sm hover:bg-blue-50 transition-colors
                ${time === value ? 'bg-blue-100 text-blue-800 font-medium' : 'text-gray-700'}
              `}
            >
              {time}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
