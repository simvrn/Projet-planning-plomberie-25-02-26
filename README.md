# Edetel Planning

Application web de planning partagé pour organiser les interventions de techniciens.

## Fonctionnalités

- **Calendrier interactif** : Vue mensuelle et hebdomadaire
- **Création rapide** : Clic sur une date/heure pour créer une intervention
- **Gestion intelligente des techniciens** : Suggestions basées sur l'historique, top 5 en chips
- **Raccourcis de tâches** : Suggestions intelligentes avec raccourcis personnalisables
- **Informations client** : Adresse, locataire, téléphone (optionnel)
- **Persistance locale** : Données sauvegardées dans le navigateur

## Installation

```bash
# Installer les dépendances
npm install

# Lancer en développement
npm run dev

# Build pour production
npm run build

# Preview du build
npm run preview
```

## Utilisation

### Créer une intervention

1. Cliquez sur une date (vue mois) ou un créneau horaire (vue semaine)
2. Le panneau latéral s'ouvre automatiquement
3. Sélectionnez les heures de début et fin (07:00-18:00)
4. Ajoutez 1 ou 2 techniciens (chips rapides ou saisie libre)
5. Décrivez la tâche (suggestions intelligentes)
6. Optionnel : ajoutez les infos client
7. Cliquez "Créer" ou appuyez sur Entrée

### Modifier/Supprimer

- Cliquez sur une intervention existante pour l'éditer
- Utilisez le bouton "Supprimer" avec confirmation

### Navigation clavier

- `Tab` : Naviguer entre les champs
- `Flèches` : Parcourir les suggestions
- `Entrée` : Valider la sélection
- `Échap` : Fermer le panneau

## Stack technique

- React 18 + TypeScript
- Vite
- Tailwind CSS
- Zustand (state management)
- date-fns (manipulation dates)
- LocalStorage (persistance)

## Structure du projet

```
src/
├── components/
│   ├── Calendar/           # Composants calendrier
│   │   ├── CalendarHeader.tsx
│   │   ├── MonthView.tsx
│   │   ├── WeekView.tsx
│   │   └── EventChip.tsx
│   ├── InterventionPanel/  # Panneau de création/édition
│   │   ├── InterventionPanel.tsx
│   │   ├── TimeSelect.tsx
│   │   ├── TechnicianSelect.tsx
│   │   └── TaskInput.tsx
│   └── ui/                 # Composants réutilisables
├── store/
│   └── useStore.ts         # State global (Zustand)
├── types/
│   └── index.ts            # Types TypeScript
├── utils/
│   ├── time.ts             # Utilitaires horaires
│   └── storage.ts          # Persistance
├── App.tsx
├── main.tsx
└── index.css
```

## Évolutions futures possibles

- [ ] Export/Import des données (JSON, CSV)
- [ ] Synchronisation multi-appareils
- [ ] Vue agenda technicien
- [ ] Notifications et rappels
- [ ] Mode hors-ligne complet (PWA)
- [ ] Partage de planning par lien
- [ ] Impression du planning
