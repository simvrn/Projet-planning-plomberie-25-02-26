import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useStore } from '../../store/useStore';
import { Button } from '../ui/Button';
import { getContrastTextColor, getLighterColor } from '../../utils/colors';
import { timeToMinutes } from '../../utils/time';
import type { Technician } from '../../types';

const GRID_START_HOUR = 6;
const GRID_END_HOUR = 20;
const HOUR_HEIGHT = 40; // pixels per hour for print-friendly size

export function DayRecapPanel() {
  const {
    dayRecap,
    closeDayRecap,
    getInterventionsByDate,
    getTechnicianById,
    openEditPanel,
    interventions,
  } = useStore();

  // Filter state - selected technician IDs for this recap
  const [selectedTechIds, setSelectedTechIds] = useState<string[]>([]);

  // Get all interventions for this day
  const allInterventions = useMemo(() => {
    if (!dayRecap.date) return [];
    return getInterventionsByDate(dayRecap.date);
  }, [dayRecap.date, interventions, getInterventionsByDate]);

  // Get unique technicians from interventions
  const techniciansInDay = useMemo(() => {
    const techIds = new Set<string>();
    allInterventions.forEach((intervention) => {
      intervention.technicianIds.forEach((id) => techIds.add(id));
    });
    return Array.from(techIds)
      .map((id) => getTechnicianById(id))
      .filter((t): t is Technician => t !== undefined)
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [allInterventions, getTechnicianById]);

  // Group by technician for display
  const groupedByTechnician = useMemo(() => {
    const techsToShow = selectedTechIds.length > 0
      ? techniciansInDay.filter((t) => selectedTechIds.includes(t.id))
      : techniciansInDay;

    return techsToShow.map((technician) => {
      const techInterventions = allInterventions
        .filter((i) => i.technicianIds.includes(technician.id))
        .sort((a, b) => a.startTime.localeCompare(b.startTime));
      return { technician, interventions: techInterventions };
    });
  }, [techniciansInDay, allInterventions, selectedTechIds]);

  if (!dayRecap.isOpen || !dayRecap.date) return null;

  const dateDisplay = format(new Date(dayRecap.date), 'EEEE d MMMM yyyy', { locale: fr });

  const handlePrint = () => {
    window.print();
  };

  const selectTechnician = (techId: string) => {
    // Si déjà sélectionné seul, on revient à "Tous"
    if (selectedTechIds.length === 1 && selectedTechIds[0] === techId) {
      setSelectedTechIds([]);
    } else {
      // Sinon on sélectionne uniquement ce technicien
      setSelectedTechIds([techId]);
    }
  };

  const clearSelection = () => {
    setSelectedTechIds([]);
  };

  const getBlockPosition = (startTime: string, endTime: string) => {
    const startMinutes = timeToMinutes(startTime);
    const endMinutes = timeToMinutes(endTime);
    const gridStartMinutes = GRID_START_HOUR * 60;

    const top = ((startMinutes - gridStartMinutes) / 60) * HOUR_HEIGHT;
    const height = ((endMinutes - startMinutes) / 60) * HOUR_HEIGHT;

    return { top: Math.max(0, top), height: Math.max(height, 16) };
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 z-40 print:hidden"
        onClick={closeDayRecap}
      />

      {/* Panel */}
      <div
        id="day-recap-panel"
        className="fixed inset-4 md:inset-6 lg:inset-8 bg-white rounded-xl shadow-2xl z-50 flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="flex-shrink-0 border-b border-gray-200 print:border-b-2 print:border-gray-400">
          <div className="flex items-center justify-between px-6 py-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Récapitulatif du jour
              </h2>
              <p className="text-sm text-gray-500 capitalize">{dateDisplay}</p>
            </div>
            <div className="flex items-center gap-2 print:hidden">
              <Button variant="secondary" size="sm" onClick={handlePrint}>
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                Imprimer
              </Button>
              <button
                onClick={closeDayRecap}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                aria-label="Fermer"
              >
                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Technician filter */}
          {techniciansInDay.length > 0 && (
            <div className="px-6 pb-4 print:hidden">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-medium text-gray-600">Afficher :</span>
                <button
                  onClick={clearSelection}
                  className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                    selectedTechIds.length === 0
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  Tous
                </button>
                {techniciansInDay.map((tech) => {
                  const isSelected = selectedTechIds.includes(tech.id);
                  return (
                    <button
                      key={tech.id}
                      onClick={() => selectTechnician(tech.id)}
                      className={`px-3 py-1.5 text-sm rounded-lg border transition-colors flex items-center gap-2 ${
                        isSelected
                          ? 'border-2'
                          : 'bg-white border-gray-300 hover:bg-gray-50'
                      }`}
                      style={isSelected ? {
                        backgroundColor: getLighterColor(tech.color, 0.85),
                        borderColor: tech.color,
                        color: tech.color,
                      } : undefined}
                    >
                      <span
                        className="w-4 h-4 rounded-full flex-shrink-0"
                        style={{ backgroundColor: tech.color }}
                      />
                      {tech.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6 print:p-4 print:overflow-visible">
          {allInterventions.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-500">
              <svg className="w-16 h-16 mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <p className="text-lg font-medium">Aucune intervention ce jour</p>
            </div>
          ) : (
            <div className="space-y-8">
              {/* Print header - only shows on print */}
              <div className="hidden print:block text-center mb-6">
                <h1 className="text-2xl font-bold text-gray-900">Récapitulatif du {dateDisplay}</h1>
                {selectedTechIds.length > 0 && (
                  <p className="text-sm text-gray-600 mt-1">
                    Technicien(s) : {groupedByTechnician.map((g) => g.technician.name).join(', ')}
                  </p>
                )}
              </div>

              {/* View by technician - each technician gets their own section */}
              {groupedByTechnician.map(({ technician, interventions: techInterventions }) => (
                <div
                  key={technician.id}
                  className="print:break-inside-avoid print:mb-8"
                >
                  {/* Technician header */}
                  <div
                    className="flex items-center gap-3 mb-4 pb-2 border-b-2"
                    style={{ borderColor: technician.color }}
                  >
                    <span
                      className="w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold"
                      style={{
                        backgroundColor: technician.color,
                        color: getContrastTextColor(technician.color),
                      }}
                    >
                      {technician.name.charAt(0).toUpperCase()}
                    </span>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{technician.name}</h3>
                      <p className="text-sm text-gray-500">
                        {techInterventions.length} intervention{techInterventions.length > 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 print:grid-cols-2">
                    {/* List view */}
                    <div className="space-y-2">
                      {techInterventions.map((intervention) => {
                        const bgColor = getLighterColor(technician.color, 0.92);
                        return (
                          <div
                            key={intervention.id}
                            className="border rounded-lg p-3 cursor-pointer hover:shadow-md transition-shadow print:cursor-default print:hover:shadow-none print:break-inside-avoid"
                            style={{ borderLeftWidth: 4, borderLeftColor: technician.color, backgroundColor: bgColor }}
                            onClick={() => {
                              closeDayRecap();
                              openEditPanel(intervention);
                            }}
                          >
                            <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                              <span>{intervention.startTime} - {intervention.endTime}</span>
                            </div>
                            {intervention.taskText && (
                              <p className="text-sm text-gray-700 mt-1 font-medium">{intervention.taskText}</p>
                            )}
                            {intervention.equipment && (
                              <p className="text-sm text-orange-600 mt-1 flex items-center gap-1">
                                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                                </svg>
                                <span>{intervention.equipment}</span>
                              </p>
                            )}
                            {(intervention.address || intervention.tenantName || intervention.phone) && (
                              <div className="mt-2 p-2 bg-white/60 rounded border border-gray-200 space-y-1 text-sm">
                                {intervention.tenantName && (
                                  <p className="text-gray-700 flex items-center gap-2">
                                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                    </svg>
                                    <span className="font-medium">{intervention.tenantName}</span>
                                  </p>
                                )}
                                {intervention.address && (
                                  <p className="text-gray-600 flex items-start gap-2">
                                    <svg className="w-4 h-4 text-gray-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                    <span>{intervention.address}</span>
                                  </p>
                                )}
                                {intervention.phone && (
                                  <p className="text-gray-600 flex items-center gap-2">
                                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                    </svg>
                                    <span>{intervention.phone}</span>
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Time grid for this technician */}
                    <div className="hidden lg:block print:block">
                      <div className="border rounded-lg overflow-hidden bg-white h-fit">
                        <div className="flex">
                          {/* Time labels */}
                          <div className="w-12 flex-shrink-0 border-r border-gray-200 bg-gray-50">
                            {Array.from({ length: GRID_END_HOUR - GRID_START_HOUR + 1 }, (_, i) => (
                              <div
                                key={i}
                                className="border-b border-gray-100 px-1 flex items-start justify-end"
                                style={{ height: HOUR_HEIGHT }}
                              >
                                <span className="text-[10px] text-gray-500 -mt-1">
                                  {(GRID_START_HOUR + i).toString().padStart(2, '0')}h
                                </span>
                              </div>
                            ))}
                          </div>

                          {/* Events grid */}
                          <div
                            className="flex-1 relative"
                            style={{ height: (GRID_END_HOUR - GRID_START_HOUR + 1) * HOUR_HEIGHT }}
                          >
                            {/* Hour lines */}
                            {Array.from({ length: GRID_END_HOUR - GRID_START_HOUR + 1 }, (_, i) => (
                              <div
                                key={i}
                                className="absolute left-0 right-0 border-b border-gray-100"
                                style={{ top: i * HOUR_HEIGHT }}
                              />
                            ))}

                            {/* Events for this technician only - no overlap! */}
                            {techInterventions.map((intervention) => {
                              const { top, height } = getBlockPosition(
                                intervention.startTime,
                                intervention.endTime
                              );
                              const textColor = getContrastTextColor(technician.color);

                              return (
                                <div
                                  key={intervention.id}
                                  className="absolute left-1 right-1 rounded px-1.5 py-0.5 overflow-hidden cursor-pointer hover:opacity-90 print:cursor-default"
                                  style={{
                                    top,
                                    height: Math.max(height - 1, 14),
                                    backgroundColor: technician.color,
                                    color: textColor,
                                  }}
                                  onClick={() => {
                                    closeDayRecap();
                                    openEditPanel(intervention);
                                  }}
                                >
                                  <div className="text-[10px] font-medium truncate">
                                    {intervention.startTime}-{intervention.endTime}
                                  </div>
                                  {height > 25 && intervention.taskText && (
                                    <div className="text-[10px] truncate opacity-90">
                                      {intervention.taskText}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {/* Print footer */}
              <div className="hidden print:block text-center text-xs text-gray-500 mt-8 pt-4 border-t border-gray-300">
                Imprimé le {format(new Date(), 'dd/MM/yyyy à HH:mm', { locale: fr })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Print styles */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }

          #day-recap-panel,
          #day-recap-panel * {
            visibility: visible;
          }

          #day-recap-panel {
            position: fixed !important;
            inset: 0 !important;
            width: 100% !important;
            height: auto !important;
            min-height: 100vh !important;
            margin: 0 !important;
            padding: 0 !important;
            border-radius: 0 !important;
            box-shadow: none !important;
            overflow: visible !important;
            display: block !important;
          }

          #day-recap-panel > div:first-child {
            overflow: visible !important;
          }

          @page {
            size: A4;
            margin: 1cm;
          }

          .print\\:break-inside-avoid {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }

          .print\\:hidden {
            display: none !important;
          }

          .print\\:block {
            display: block !important;
          }
        }
      `}</style>
    </>
  );
}
