import { useState } from 'react';
import { format, startOfWeek, addDays, isToday } from 'date-fns';
import { useStore } from '../../store/useStore';
import { timeToMinutes, minutesToTime } from '../../utils/time';
import { EventChip } from './EventChip';

const WEEKDAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

const START_HOUR = 6;
const END_HOUR = 20;
const TOTAL_HOURS = END_HOUR - START_HOUR; // 14
const TOTAL_MINUTES = TOTAL_HOURS * 60; // 840

// Heures affichées (une ligne par heure)
const DISPLAY_HOURS = Array.from({ length: TOTAL_HOURS }, (_, i) => START_HOUR + i);

// Position verticale en % depuis le haut de la grille
const toTopPercent = (time: string): number => {
  const minutes = timeToMinutes(time);
  return Math.max(0, ((minutes - START_HOUR * 60) / TOTAL_MINUTES) * 100);
};

// Hauteur en % pour une plage horaire
const toHeightPercent = (start: string, end: string): number => {
  const duration = timeToMinutes(end) - timeToMinutes(start);
  return Math.max(0, (duration / TOTAL_MINUTES) * 100);
};

export function WeekView() {
  const {
    currentDate,
    openCreatePanel,
    openDayRecap,
    getFilteredInterventionsByDate,
    updateIntervention,
    interventions,
  } = useStore();

  const [dragOverDate, setDragOverDate] = useState<string | null>(null);

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  // Clic sur une colonne : calcule l'heure à partir de la position Y
  const handleColumnClick = (e: React.MouseEvent<HTMLDivElement>, day: Date) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const y = Math.max(0, e.clientY - rect.top);
    const rawMinutes = (y / rect.height) * TOTAL_MINUTES;
    const snappedMinutes = Math.round(rawMinutes / 30) * 30;
    const clamped = Math.min(Math.max(snappedMinutes, 0), TOTAL_MINUTES - 30);
    const time = minutesToTime(START_HOUR * 60 + clamped);
    openCreatePanel(format(day, 'yyyy-MM-dd'), time);
  };

  const handleDayNumberClick = (e: React.MouseEvent, date: Date) => {
    e.stopPropagation();
    openDayRecap(format(date, 'yyyy-MM-dd'));
  };

  // Calcul des colonnes pour les événements qui se chevauchent
  const getEventColumns = (dayInterventions: ReturnType<typeof getFilteredInterventionsByDate>) => {
    if (dayInterventions.length === 0) return [];

    const events = dayInterventions.map((intervention) => ({
      intervention,
      startMinutes: timeToMinutes(intervention.startTime),
      endMinutes: timeToMinutes(intervention.endTime),
      column: 0,
      totalColumns: 1,
    }));

    events.sort((a, b) => a.startMinutes - b.startMinutes);

    for (let i = 0; i < events.length; i++) {
      const current = events[i];
      const overlapping = events.slice(0, i).filter(
        (o) => current.startMinutes < o.endMinutes && current.endMinutes > o.startMinutes
      );
      const usedColumns = overlapping.map((e) => e.column);
      let column = 0;
      while (usedColumns.includes(column)) column++;
      current.column = column;

      const maxColumn = Math.max(column, ...overlapping.map((e) => e.column));
      const totalColumns = maxColumn + 1;
      current.totalColumns = totalColumns;
      overlapping.forEach((e) => { e.totalColumns = Math.max(e.totalColumns, totalColumns); });
    }

    for (let i = 0; i < events.length; i++) {
      const current = events[i];
      const overlapping = events.filter(
        (o, j) => j !== i && current.startMinutes < o.endMinutes && current.endMinutes > o.startMinutes
      );
      const maxTotal = Math.max(current.totalColumns, ...overlapping.map((e) => e.totalColumns));
      current.totalColumns = maxTotal;
      overlapping.forEach((e) => { e.totalColumns = maxTotal; });
    }

    return events;
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* En-tête avec les jours */}
      <div className="flex border-b border-gray-200 bg-gray-50 flex-shrink-0">
        <div className="w-14 flex-shrink-0 border-r border-gray-200" />
        {days.map((day, index) => {
          const isCurrentDay = isToday(day);
          return (
            <div
              key={index}
              className="flex-1 px-1 py-2 text-center border-r border-gray-200 last:border-r-0"
            >
              <div className="text-xs text-gray-500 uppercase">{WEEKDAYS[index]}</div>
              <button
                onClick={(e) => handleDayNumberClick(e, day)}
                className={`text-base font-medium mt-0.5 transition-colors ${
                  isCurrentDay
                    ? 'w-7 h-7 mx-auto flex items-center justify-center bg-blue-600 text-white rounded-full hover:bg-blue-700'
                    : 'text-gray-900 hover:text-blue-600 hover:underline'
                }`}
                title="Voir le récapitulatif du jour"
              >
                {format(day, 'd')}
              </button>
            </div>
          );
        })}
      </div>

      {/* Grille horaire — 6h-20h, pas de scroll, lignes par heure */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* Colonne des heures */}
        <div className="w-14 flex-shrink-0 border-r border-gray-200 bg-gray-50 flex flex-col">
          {DISPLAY_HOURS.map((hour) => (
            <div
              key={hour}
              className="flex-1 border-b border-gray-100 flex items-start justify-end px-1 pt-0.5"
            >
              <span className="text-[10px] text-gray-500 leading-none">
                {hour.toString().padStart(2, '0')}h
              </span>
            </div>
          ))}
          {/* Marqueur 20h en bas */}
          <div className="h-0 relative">
            <span className="absolute right-1 -top-2 text-[10px] text-gray-500 leading-none">
              20h
            </span>
          </div>
        </div>

        {/* Colonnes des jours */}
        {days.map((day, dayIndex) => {
          const dateStr = format(day, 'yyyy-MM-dd');
          const dayInterventions = getFilteredInterventionsByDate(dateStr);
          const eventCols = getEventColumns(dayInterventions);
          const isCurrentDay = isToday(day);
          const isDragOver = dragOverDate === dateStr;

          return (
            <div
              key={dayIndex}
              className={`flex-1 relative border-r border-gray-200 last:border-r-0 cursor-pointer transition-colors ${
                isCurrentDay ? 'bg-blue-50/30' : 'bg-white'
              } ${isDragOver ? 'bg-blue-100/50' : ''}`}
              onClick={(e) => handleColumnClick(e, day)}
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
              {/* Lignes horaires pleines (chaque heure) */}
              {DISPLAY_HOURS.map((hour) => (
                <div
                  key={hour}
                  className="absolute left-0 right-0 border-b border-gray-100 pointer-events-none"
                  style={{ top: `${((hour - START_HOUR) / TOTAL_HOURS) * 100}%` }}
                />
              ))}
              {/* Lignes demi-heure (traits fins) */}
              {DISPLAY_HOURS.map((hour) => (
                <div
                  key={`${hour}-30`}
                  className="absolute left-0 right-0 border-b border-gray-50 pointer-events-none"
                  style={{ top: `${((hour - START_HOUR + 0.5) / TOTAL_HOURS) * 100}%` }}
                />
              ))}

              {/* Événements */}
              <div className="absolute inset-0 pointer-events-none">
                {eventCols.map(({ intervention, column, totalColumns }) => {
                  const top = toTopPercent(intervention.startTime);
                  const height = toHeightPercent(intervention.startTime, intervention.endTime);
                  const durationMin =
                    timeToMinutes(intervention.endTime) - timeToMinutes(intervention.startTime);
                  const widthPct = 100 / totalColumns;
                  const leftPct = column * widthPct;

                  return (
                    <div
                      key={intervention.id}
                      className="absolute pointer-events-auto cursor-grab active:cursor-grabbing"
                      style={{
                        top: `${top}%`,
                        height: `calc(${height}% - 2px)`,
                        left: `calc(${leftPct}% + 1px)`,
                        width: `calc(${widthPct}% - 2px)`,
                        minHeight: '18px',
                      }}
                      draggable
                      onDragStart={(e) => {
                        e.stopPropagation();
                        e.dataTransfer.setData('interventionId', intervention.id);
                        e.dataTransfer.effectAllowed = 'move';
                      }}
                    >
                      <EventChip
                        intervention={intervention}
                        compact={durationMin < 60}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
