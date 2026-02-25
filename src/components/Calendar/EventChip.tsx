import type { Intervention } from '../../types';
import { useStore } from '../../store/useStore';
import { getContrastTextColor, getLighterColor } from '../../utils/colors';

interface EventChipProps {
  intervention: Intervention;
  compact?: boolean;
}

export function EventChip({ intervention, compact = false }: EventChipProps) {
  const { openEditPanel, getTechnicianById } = useStore();

  const technicians = intervention.technicianIds
    .map((id) => getTechnicianById(id))
    .filter(Boolean);

  const techNames = technicians
    .map((t) => t?.name)
    .filter(Boolean)
    .join(', ');

  // Use first technician's color, or default gray
  const primaryColor = technicians[0]?.color || '#6B7280';
  const textColor = getContrastTextColor(primaryColor);
  const lightBgColor = getLighterColor(primaryColor, 0.85);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    openEditPanel(intervention);
  };

  // Check for legacy >4 technicians
  const isLegacy = intervention.technicianIds.length > 4;

  if (compact) {
    return (
      <button
        onClick={handleClick}
        className="w-full text-left px-2 py-1 rounded text-xs truncate transition-colors hover:opacity-80"
        style={{
          backgroundColor: lightBgColor,
          borderLeft: `3px solid ${primaryColor}`,
        }}
        title={`${intervention.startTime} - ${intervention.taskText || 'Intervention'}${isLegacy ? ' (Legacy: >4 techniciens)' : ''}`}
      >
        <span className="font-medium" style={{ color: primaryColor }}>
          {intervention.startTime}
        </span>
        {intervention.taskText && (
          <span className="ml-1 text-gray-600">{intervention.taskText}</span>
        )}
      </button>
    );
  }

  return (
    <button
      onClick={handleClick}
      className="w-full h-full text-left p-2 rounded-lg shadow-sm transition-all hover:shadow-md hover:opacity-95"
      style={{
        backgroundColor: primaryColor,
        color: textColor,
      }}
    >
      <div className="flex items-center gap-2 text-xs font-medium">
        <span>{intervention.startTime} - {intervention.endTime}</span>
        {isLegacy && (
          <span
            className="px-1 py-0.5 rounded text-[10px] font-bold"
            style={{
              backgroundColor: 'rgba(255,255,255,0.3)',
            }}
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
              {technicians.slice(0, 3).map((tech) => tech && (
                <span
                  key={tech.id}
                  className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold"
                  style={{
                    backgroundColor: tech.color,
                    color: getContrastTextColor(tech.color),
                    border: tech.color === primaryColor ? 'none' : '1px solid rgba(255,255,255,0.5)',
                  }}
                  title={tech.name}
                >
                  {tech.name.charAt(0).toUpperCase()}
                </span>
              ))}
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
        <div className="text-sm font-medium mt-1 truncate">
          {intervention.taskText}
        </div>
      )}
    </button>
  );
}
