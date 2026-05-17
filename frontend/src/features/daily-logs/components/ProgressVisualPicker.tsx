import { useState } from 'react';
import { BTP_PHASES, type BtpPhase } from '../data/btp-phases';

type Props = {
  value: number;
  onChange: (percent: number) => void;
};

export default function ProgressVisualPicker({ value, onChange }: Props) {
  const [selectedPhase, setSelectedPhase] = useState<BtpPhase | null>(
    () => BTP_PHASES.find(p => p.stages.some(s => s.percent === value)) ?? null
  );

  function handlePhaseClick(phase: BtpPhase) {
    setSelectedPhase(prev => prev?.id === phase.id ? null : phase);
  }

  function handleStageClick(percent: number) {
    onChange(percent);
  }

  const selectedPercent = value;

  return (
    <div className="pvp">
      <div className="pvp__header">
        <span className="pvp__label">Avancement réel</span>
        <span className="pvp__value">{selectedPercent}%</span>
      </div>

      {/* Grille des phases */}
      <div className="pvp__phases">
        {BTP_PHASES.map(phase => (
          <button
            key={phase.id}
            type="button"
            className={`pvp__phase-btn ${selectedPhase?.id === phase.id ? 'pvp__phase-btn--active' : ''}`}
            style={{ '--phase-color': phase.color } as React.CSSProperties}
            onClick={() => handlePhaseClick(phase)}
          >
            <span className="pvp__phase-icon">{phase.icon}</span>
            <span className="pvp__phase-label">{phase.label}</span>
          </button>
        ))}
      </div>

      {/* Sélecteur de jalons — affiché quand une phase est sélectionnée */}
      {selectedPhase && (
        <div className="pvp__stages">
          <p className="pvp__stages-title">
            {selectedPhase.icon} {selectedPhase.label} — choisir l'avancement :
          </p>
          <div className="pvp__stage-grid">
            {selectedPhase.stages.map(stage => (
              <button
                key={stage.percent}
                type="button"
                className={`pvp__stage-btn ${selectedPercent === stage.percent ? 'pvp__stage-btn--active' : ''}`}
                style={{ '--phase-color': selectedPhase.color } as React.CSSProperties}
                onClick={() => handleStageClick(stage.percent)}
              >
                <span className="pvp__stage-progress-icons">{stage.icon}</span>
                <span className="pvp__stage-label">{stage.label}</span>
                <span className="pvp__stage-percent">{stage.percent}%</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Mini barre de progression */}
      <div className="pvp__bar-wrap">
        <div className="pvp__bar" style={{ width: `${selectedPercent}%` }} />
      </div>
    </div>
  );
}
