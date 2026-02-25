import { useState } from 'react';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isToday,
} from 'date-fns';
import { useStore } from '../../store/useStore';
import { EventChip } from './EventChip';
import type { Intervention } from '../../types';

const WEEKDAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

// Group interventions by primary technician (first technicianId)
function groupByPrimaryTech(interventions: Intervention[]) {
  const groups = new Map<string, Intervention[]>();
  const order: string[] = [];

  for (const intervention of interventions) {
    const key = intervention.technicianIds[0] || '__none__';
    if (!groups.has(key)) {
      groups.set(key, []);
      order.push(key);
    }
    groups.get(key)!.push(intervention);
  }

  return order.map((techId) => ({ techId, items: groups.get(techId)! }));
}

export function MonthView() {
  const {
    currentDate,
    openCreatePanel,
    openDayRecap,
    getFilteredInterventionsByDate,
    getTechnicianById,
    updateIntervention,
    interventions,
  } = useStore();

  const [dragOverDate, setDragOverDate] = useState<string | null>(null);

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const handleDayClick = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    openCreatePanel(dateStr, '08:00');
  };

  const handleDayNumberClick = (e: React.MouseEvent, date: Date) => {
    e.stopPropagation();
    const dateStr = format(date, 'yyyy-MM-dd');
    openDayRecap(dateStr);
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* En-têtes jours */}
      <div className="grid grid-cols-7 border-b border-gray-200 bg-gray-50">
        {WEEKDAYS.map((day) => (
          <div
            key={day}
            className="px-2 py-3 text-center text-sm font-medium text-gray-600"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Grille calendrier */}
      <div className="flex-1 grid grid-cols-7 auto-rows-fr overflow-auto">
        {days.map((day) => {
          const dateStr = format(day, 'yyyy-MM-dd');
          const dayInterventions = getFilteredInterventionsByDate(dateStr);
          const isCurrentMonth = isSameMonth(day, currentDate);
          const isCurrentDay = isToday(day);
          const isDragOver = dragOverDate === dateStr;

          const groups = groupByPrimaryTech(dayInterventions);
          const hasMultipleTechs = groups.length > 1;
          const maxPerCol = hasMultipleTechs ? 3 : 4;

          return (
            <div
              key={dateStr}
              onClick={() => handleDayClick(day)}
              className={`
                min-h-[100px] p-2 border-b border-r border-gray-200 cursor-pointer
                transition-colors
                ${!isCurrentMonth ? 'bg-gray-50' : 'bg-white'}
                ${isDragOver ? 'bg-blue-100/60 ring-2 ring-inset ring-blue-300' : 'hover:bg-blue-50'}
              `}
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                if (dragOverDate !== dateStr) setDragOverDate(dateStr);
              }}
              onDragLeave={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                  setDragOverDate(null);
                }
              }}
              onDrop={(e) => {
                e.preventDefault();
                setDragOverDate(null);
                const id = e.dataTransfer.getData('interventionId');
                if (id && interventions[id]) {
                  updateIntervention(id, { date: dateStr });
                }
              }}
            >
              {/* Numéro du jour */}
              <div className="flex items-center justify-between mb-1">
                <button
                  onClick={(e) => handleDayNumberClick(e, day)}
                  className={`
                    text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full
                    transition-colors hover:ring-2 hover:ring-blue-300
                    ${isCurrentDay ? 'bg-blue-600 text-white hover:bg-blue-700' : ''}
                    ${!isCurrentMonth ? 'text-gray-400 hover:bg-gray-200' : 'text-gray-700 hover:bg-blue-100'}
                  `}
                  title="Voir le récapitulatif du jour"
                >
                  {format(day, 'd')}
                </button>
                {dayInterventions.length > 0 && (
                  <span className="text-xs text-gray-400">{dayInterventions.length}</span>
                )}
              </div>

              {/* Événements — une colonne par technicien */}
              {groups.length > 0 && (
                <div className="flex gap-0.5">
                  {groups.slice(0, 4).map(({ techId, items }) => {
                    const tech = getTechnicianById(techId);
                    const color = tech?.color || '#6B7280';
                    const hidden = items.length - maxPerCol;
                    return (
                      <div
                        key={techId}
                        className="flex-1 flex flex-col gap-0.5 min-w-0"
                        style={{ borderTop: `2px solid ${color}` }}
                      >
                        {items.slice(0, maxPerCol).map((intervention) => (
                          <div
                            key={intervention.id}
                            draggable
                            onDragStart={(e) => {
                              e.stopPropagation();
                              e.dataTransfer.setData('interventionId', intervention.id);
                              e.dataTransfer.effectAllowed = 'move';
                            }}
                          >
                            {/* Afficher uniquement l'heure (pas la description) */}
                            <EventChip
                              intervention={intervention}
                              compact
                              hideTask
                            />
                          </div>
                        ))}
                        {hidden > 0 && (
                          <button
                            onClick={(e) => handleDayNumberClick(e, day)}
                            className="text-[10px] text-blue-600 hover:text-blue-800 text-left px-1"
                          >
                            +{hidden}
                          </button>
                        )}
                      </div>
                    );
                  })}
                  {groups.length > 4 && (
                    <button
                      onClick={(e) => handleDayNumberClick(e, day)}
                      className="text-xs text-blue-600 hover:text-blue-800 self-start px-1"
                    >
                      +{groups.length - 4}
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
