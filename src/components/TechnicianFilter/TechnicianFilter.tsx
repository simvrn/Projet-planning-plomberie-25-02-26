import { useState, useRef, useEffect } from 'react';
import { useStore } from '../../store/useStore';
import { getContrastTextColor } from '../../utils/colors';

export function TechnicianFilter() {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const {
    selectedTechnicianFilters,
    toggleTechnicianFilter,
    clearTechnicianFilters,
    getActiveTechnicians,
    getTechnicianById,
  } = useStore();

  const activeTechnicians = getActiveTechnicians();
  const selectedTechnicians = selectedTechnicianFilters
    .map((id) => getTechnicianById(id))
    .filter(Boolean);

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

  if (activeTechnicians.length === 0) {
    return null;
  }

  return (
    <div ref={containerRef} className="relative">
      {/* Trigger button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`
          flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg border transition-colors
          ${selectedTechnicianFilters.length > 0
            ? 'bg-blue-50 border-blue-300 text-blue-700'
            : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
          }
        `}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
        </svg>
        <span>
          {selectedTechnicianFilters.length === 0
            ? 'Filtrer'
            : `${selectedTechnicianFilters.length} technicien${selectedTechnicianFilters.length > 1 ? 's' : ''}`
          }
        </span>
        <svg className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Selected chips (shown when not empty) */}
      {selectedTechnicianFilters.length > 0 && !isOpen && (
        <div className="absolute top-full left-0 mt-1 flex flex-wrap gap-1 z-10">
          {selectedTechnicians.slice(0, 3).map((tech) => tech && (
            <span
              key={tech.id}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
              style={{
                backgroundColor: tech.color,
                color: getContrastTextColor(tech.color),
              }}
            >
              {tech.name}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleTechnicianFilter(tech.id);
                }}
                className="hover:opacity-70"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </span>
          ))}
          {selectedTechnicians.length > 3 && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-200 text-gray-600">
              +{selectedTechnicians.length - 3}
            </span>
          )}
        </div>
      )}

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute top-full right-0 mt-1 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-20">
          <div className="p-2 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-gray-500 uppercase">
                Filtrer par technicien
              </span>
              {selectedTechnicianFilters.length > 0 && (
                <button
                  onClick={() => {
                    clearTechnicianFilters();
                    setIsOpen(false);
                  }}
                  className="text-xs text-blue-600 hover:text-blue-700"
                >
                  Réinitialiser
                </button>
              )}
            </div>
          </div>

          <div className="max-h-64 overflow-auto p-1">
            {activeTechnicians.map((tech) => {
              const isSelected = selectedTechnicianFilters.includes(tech.id);
              const textColor = getContrastTextColor(tech.color);

              return (
                <button
                  key={tech.id}
                  onClick={() => toggleTechnicianFilter(tech.id)}
                  className={`
                    w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors
                    ${isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'}
                  `}
                >
                  <span
                    className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                    style={{
                      backgroundColor: tech.color,
                      color: textColor,
                    }}
                  >
                    {tech.name.charAt(0).toUpperCase()}
                  </span>
                  <span className="flex-1 text-sm text-gray-700 truncate">
                    {tech.name}
                  </span>
                  {isSelected && (
                    <svg className="w-5 h-5 text-blue-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </button>
              );
            })}
          </div>

          {/* Quick actions */}
          <div className="p-2 border-t border-gray-100 flex gap-2">
            <button
              onClick={() => {
                const allIds = activeTechnicians.map((t) => t.id);
                useStore.getState().setTechnicianFilters(allIds);
              }}
              className="flex-1 text-xs text-gray-600 hover:text-gray-800 py-1.5 rounded hover:bg-gray-50"
            >
              Tout sélectionner
            </button>
            <button
              onClick={() => {
                clearTechnicianFilters();
              }}
              className="flex-1 text-xs text-gray-600 hover:text-gray-800 py-1.5 rounded hover:bg-gray-50"
            >
              Tout afficher
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
