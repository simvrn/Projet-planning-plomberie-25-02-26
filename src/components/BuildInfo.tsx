// Affiche la date/heure (France) de la dernière mise à jour déployée, en haut à droite.
// __BUILD_DATE__ est injecté au moment du build (voir vite.config.ts) : se met à jour
// automatiquement à chaque nouveau déploiement, sans intervention manuelle.
export function BuildInfo() {
  const formatted = new Date(__BUILD_DATE__).toLocaleString('fr-FR', {
    timeZone: 'Europe/Paris',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="fixed top-2 right-2 z-50 text-[11px] text-gray-400 bg-white/80 backdrop-blur px-2 py-1 rounded pointer-events-none select-none">
      MAJ : {formatted}
    </div>
  );
}
