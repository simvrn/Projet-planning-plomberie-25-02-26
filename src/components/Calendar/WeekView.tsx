import {
  format,
  startOfWeek,
  addDays,
  isToday,
} from 'date-fns';
import { useStore } from '../../store/useStore';
import { TIME_SLOTS, getSlotIndex, getEventHeight, timeToMinutes } from '../../utils/time';
import { EventChip } from './EventChip';

const WEEKDAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

// Hauteur de chaque créneau de 30 minutes en pixels
// 32px permet de voir 7h-18h sans scroller sur la plupart des écrans
const SLOT_HEIGHT = 32;

export function WeekView() {
  const {
    currentDate,
    openCreatePanel,
    openDayRecap,
    getFilteredInterventionsByDate,
  } = useStore();

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const handleSlotClick = (date: Date, time: string) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    openCreatePanel(dateStr, time);
  };

  const handleDayNumberClick = (e: React.MouseEvent, date: Date) => {
    e.stopPropagation();
    const dateStr = format(date, 'yyyy-MM-dd');
    openDayRecap(dateStr);
  };

  // Calculate overlapping events and assign columns
  const getEventColumns = (interventions: ReturnType<typeof getFilteredInterventionsByDate>) => {
    if (interventions.length === 0) return [];

    const events = interventions.map((intervention) => ({
      intervention,
      startMinutes: timeToMinutes(intervention.startTime),
      endMinutes: timeToMinutes(intervention.endTime),
      column: 0,
      totalColumns: 1,
    }));

    // Sort by start time
    events.sort((a, b) => a.startMinutes - b.startMinutes);

    // Assign columns for overlapping events
    for (let i = 0; i < events.length; i++) {
      const current = events[i];
      const overlapping = events.slice(0, i).filter(
        (other) => current.startMinutes < other.endMinutes && current.endMinutes > other.startMinutes
      );

      // Find first available column
      const usedColumns = overlapping.map((e) => e.column);
      let column = 0;
      while (usedColumns.includes(column)) {
        column++;
      }
      current.column = column;

      // Update total columns for all overlapping events
      const maxColumn = Math.max(column, ...overlapping.map((e) => e.column));
      const totalColumns = maxColumn + 1;
      current.totalColumns = totalColumns;
      overlapping.forEach((e) => {
        e.totalColumns = Math.max(e.totalColumns, totalColumns);
      });
    }

    // Final pass to ensure all overlapping events have the same totalColumns
    for (let i = 0; i < events.length; i++) {
      const current = events[i];
      const overlapping = events.filter(
        (other, j) =>
          j !== i &&
          current.startMinutes < other.endMinutes &&
          current.endMinutes > other.startMinutes
      );
      const maxTotalColumns = Math.max(
        current.totalColumns,
        ...overlapping.map((e) => e.totalColumns)
      );
      current.totalColumns = maxTotalColumns;
      overlapping.forEach((e) => {
        e.totalColumns = maxTotalColumns;
      });
    }

    return events;
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header with days */}
      <div className="flex border-b border-gray-200 bg-gray-50 flex-shrink-0">
        {/* Time column header */}
        <div className="w-14 flex-shrink-0 border-r border-gray-200" />

        {/* Day headers */}
        {days.map((day, index) => {
          const isCurrentDay = isToday(day);
          return (
            <div
              key={index}
              className="flex-1 px-1 py-2 text-center border-r border-gray-200 last:border-r-0"
            >
              <div className="text-xs text-gray-500 uppercase">
                {WEEKDAYS[index]}
              </div>
              <button
                onClick={(e) => handleDayNumberClick(e, day)}
                className={`
                  text-base font-medium mt-0.5 transition-colors
                  ${isCurrentDay
                    ? 'w-7 h-7 mx-auto flex items-center justify-center bg-blue-600 text-white rounded-full hover:bg-blue-700'
                    : 'text-gray-900 hover:text-blue-600 hover:underline'
                  }
                `}
                title="Voir le récapitulatif du jour"
              >
                {format(day, 'd')}
              </button>
            </div>
          );
        })}
      </div>

      {/* Time grid - no overflow, fits in view */}
      <div className="flex-1 flex min-h-0">
        {/* Time column */}
        <div className="w-14 flex-shrink-0 border-r border-gray-200 bg-gray-50">
          {TIME_SLOTS.map((time, index) => (
            <div
              key={time}
              className="border-b border-gray-100 px-1 flex items-start justify-end"
              style={{ height: SLOT_HEIGHT }}
            >
              {index % 2 === 0 && (
                <span className="text-[10px] text-gray-500 -mt-1.5">{time}</span>
              )}
            </div>
          ))}
        </div>

        {/* Day columns */}
        {days.map((day, dayIndex) => {
          const dateStr = format(day, 'yyyy-MM-dd');
          const interventions = getFilteredInterventionsByDate(dateStr);
          const eventColumns = getEventColumns(interventions);
          const isCurrentDay = isToday(day);

          return (
            <div
              key={dayIndex}
              className={`flex-1 relative border-r border-gray-200 last:border-r-0 ${
                isCurrentDay ? 'bg-blue-50/30' : ''
              }`}
            >
              {/* Time slots (clickable) */}
              {TIME_SLOTS.map((time) => (
                <div
                  key={time}
                  onClick={() => handleSlotClick(day, time)}
                  className="border-b border-gray-100 cursor-pointer hover:bg-blue-50 transition-colors"
                  style={{ height: SLOT_HEIGHT }}
                />
              ))}

              {/* Events overlay */}
              <div className="absolute inset-0 pointer-events-none">
                {eventColumns.map(({ intervention, column, totalColumns }) => {
                  const topSlot = getSlotIndex(intervention.startTime);
                  const height = getEventHeight(intervention.startTime, intervention.endTime);
                  const width = 100 / totalColumns;
                  const left = column * width;

                  return (
                    <div
                      key={intervention.id}
                      className="absolute pointer-events-auto"
                      style={{
                        top: `${topSlot * SLOT_HEIGHT}px`,
                        height: `${Math.max(height * SLOT_HEIGHT - 2, 18)}px`,
                        left: `calc(${left}% + 1px)`,
                        width: `calc(${width}% - 2px)`,
                      }}
                    >
                      <EventChip intervention={intervention} compact={height * SLOT_HEIGHT < 50} />
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
