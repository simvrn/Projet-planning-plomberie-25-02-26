import { useState } from 'react';
import type { Intervention } from '../../types';
import { useStore } from '../../store/useStore';
import { getContrastTextColor, getLighterColor } from '../../utils/colors';
import { DeleteConfirmModal } from '../ui/DeleteConfirmModal';

interface EventChipProps {
  intervention: Intervention;
  compact?: boolean;
  hideTime?: boolean;
  hideTask?: boolean;
}

export function EventChip({
  intervention,
  compact = false,
  hideTime = false,
  hideTask = false,
}: EventChipProps) {
  const { openEditPanel, getTechnicianById, deleteIntervention } = useStore();
  const [showConfirm, setShowConfirm] = useState(false);

  const technicians = intervention.technicianIds
    .map((id) => getTechnicianById(id))
    .filter(Boolean);

  const techNames = technicians.map((t) => t?.name).filter(Boolean).join(', ');

  const primaryColor = technicians[0]?.color || '#6B7280';
  const textColor = getContrastTextColor(primaryColor);
  const lightBgColor = getLighterColor(primaryColor, 0.85);
  const isLegacy = intervention.technicianIds.length > 4;

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    openEditPanel(intervention);
  };

  const handleAskConfirm = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowConfirm(true);
  };

  const handleConfirmDelete = () => {
    deleteIntervention(intervention.id);
    setShowConfirm(false);
  };

  /* ── Mode compact ── */
  if (compact) {
    return (
      <>
        <DeleteConfirmModal
          isOpen={showConfirm}
          onConfirm={handleConfirmDelete}
          onCancel={() => setShowConfirm(false)}
        />

        <div className="relative group w-full">
          <button
            onClick={handleEdit}
            className="w-full text-left px-2 py-1 rounded text-xs transition-colors hover:opacity-80"
            style={{
              backgroundColor: lightBgColor,
              borderLeft: `3px solid ${primaryColor}`,
            }}
            title={`${intervention.startTime} – ${intervention.taskText || 'Intervention'}${
              isLegacy ? ' (Legacy: >4 techniciens)' : ''
            }`}
          >
            {!hideTime && (
              <span className="font-medium" style={{ color: primaryColor }}>
                {intervention.startTime}
              </span>
            )}
            {!hideTask && intervention.taskText && (
              <span className={`${!hideTime ? 'ml-1' : ''} text-gray-600 truncate`}>
                {intervention.taskText}
              </span>
            )}
          </button>

          {/* Bouton × — visible au survol */}
          <button
            onClick={handleAskConfirm}
            className="absolute right-0.5 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 w-4 h-4 flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-all leading-none text-sm"
            title="Supprimer"
          >
            ×
          </button>
        </div>
      </>
    );
  }

  /* ── Mode complet ── */
  return (
    <>
      <DeleteConfirmModal
        isOpen={showConfirm}
        onConfirm={handleConfirmDelete}
        onCancel={() => setShowConfirm(false)}
      />

      <div className="relative group w-full h-full">
        <button
          onClick={handleEdit}
          className="w-full h-full text-left p-2 rounded-lg shadow-sm transition-all hover:shadow-md hover:opacity-95"
          style={{ backgroundColor: primaryColor, color: textColor }}
        >
          <div className="flex items-center gap-2 text-xs font-medium pr-5">
            <span>
              {intervention.startTime} – {intervention.endTime}
            </span>
            {isLegacy && (
              <span
                className="px-1 py-0.5 rounded text-[10px] font-bold"
                style={{ backgroundColor: 'rgba(255,255,255,0.3)' }}
                title="Donnée legacy: plus de 4 techniciens"
              >
                !
              </span>
            )}
          </div>
          {techNames && (
            <div className="text-xs mt-0.5 truncate opacity-90">
              {technicians.length > 1 ? (
                <span className="flex items-center gap-1">
                  {technicians.slice(0, 3).map(
                    (tech) =>
                      tech && (
                        <span
                          key={tech.id}
                          className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold"
                          style={{
                            backgroundColor: tech.color,
                            color: getContrastTextColor(tech.color),
                            border:
                              tech.color === primaryColor
                                ? 'none'
                                : '1px solid rgba(255,255,255,0.5)',
                          }}
                          title={tech.name}
                        >
                          {tech.name.charAt(0).toUpperCase()}
                        </span>
                      )
                  )}
                  {technicians.length > 3 && (
                    <span className="text-[9px] opacity-80">+{technicians.length - 3}</span>
                  )}
                </span>
              ) : (
                <span>{techNames}</span>
              )}
            </div>
          )}
          {intervention.taskText && (
            <div className="text-sm font-medium mt-1 truncate">{intervention.taskText}</div>
          )}
        </button>

        {/* Bouton × — visible au survol */}
        <button
          onClick={handleAskConfirm}
          className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 w-5 h-5 flex items-center justify-center bg-white/20 hover:bg-white/40 rounded transition-all text-base leading-none"
          style={{ color: textColor }}
          title="Supprimer"
        >
          ×
        </button>
      </div>
    </>
  );
}
