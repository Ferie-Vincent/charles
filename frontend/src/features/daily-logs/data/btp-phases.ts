export type PhaseStage = {
  label: string;
  percent: number;
  icon: string;
};

export type BtpPhase = {
  id: string;
  label: string;
  icon: string;
  color: string;
  stages: PhaseStage[];
};

export const BTP_PHASES: BtpPhase[] = [
  {
    id: 'terrassement',
    label: 'Terrassement',
    icon: '🏗️',
    color: '#8B7355',
    stages: [
      { label: 'Démarré',   percent: 2,  icon: '▱▱▱▱' },
      { label: '25%',       percent: 5,  icon: '▰▱▱▱' },
      { label: '50%',       percent: 8,  icon: '▰▰▱▱' },
      { label: 'Terminé',   percent: 12, icon: '▰▰▰▰' },
    ],
  },
  {
    id: 'fondations',
    label: 'Fondations',
    icon: '⬛',
    color: '#6B7280',
    stages: [
      { label: 'Démarré',   percent: 12, icon: '▱▱▱▱' },
      { label: '25%',       percent: 17, icon: '▰▱▱▱' },
      { label: '50%',       percent: 21, icon: '▰▰▱▱' },
      { label: 'Terminé',   percent: 25, icon: '▰▰▰▰' },
    ],
  },
  {
    id: 'elevation',
    label: 'Élévation / Gros œuvre',
    icon: '🧱',
    color: '#DC6B2F',
    stages: [
      { label: 'Démarré',   percent: 25, icon: '▱▱▱▱' },
      { label: '25%',       percent: 38, icon: '▰▱▱▱' },
      { label: '50%',       percent: 50, icon: '▰▰▱▱' },
      { label: 'Terminé',   percent: 65, icon: '▰▰▰▰' },
    ],
  },
  {
    id: 'toiture',
    label: 'Toiture / Charpente',
    icon: '🏠',
    color: '#2563EB',
    stages: [
      { label: 'Démarré',   percent: 65, icon: '▱▱▱▱' },
      { label: '25%',       percent: 70, icon: '▰▱▱▱' },
      { label: '75%',       percent: 78, icon: '▰▰▰▱' },
      { label: 'Terminé',   percent: 82, icon: '▰▰▰▰' },
    ],
  },
  {
    id: 'second-oeuvre',
    label: 'Second œuvre',
    icon: '🪟',
    color: '#059669',
    stages: [
      { label: 'Démarré',   percent: 82, icon: '▱▱▱▱' },
      { label: '25%',       percent: 87, icon: '▰▱▱▱' },
      { label: '50%',       percent: 91, icon: '▰▰▱▱' },
      { label: 'Terminé',   percent: 95, icon: '▰▰▰▰' },
    ],
  },
  {
    id: 'finitions',
    label: 'Finitions',
    icon: '🎨',
    color: '#7C3AED',
    stages: [
      { label: 'Démarré',   percent: 95, icon: '▱▱▱▱' },
      { label: '25%',       percent: 97, icon: '▰▱▱▱' },
      { label: '75%',       percent: 99, icon: '▰▰▰▱' },
      { label: 'Terminé',   percent: 100, icon: '▰▰▰▰' },
    ],
  },
];
