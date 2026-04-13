import { ConversationCadence, HallSettings } from '../types';

interface Props {
  settings: HallSettings;
  onChange: (settings: HallSettings) => void;
}

const CADENCE_LABELS: Record<ConversationCadence, string> = {
  measured: 'Measured',
  lively: 'Lively',
};

export default function AdvancedSettingsPanel({ settings, onChange }: Props) {
  function update<K extends keyof HallSettings>(key: K, value: HallSettings[K]) {
    onChange({ ...settings, [key]: value });
  }

  return (
    <section className="session-brief-panel">
      <div className="panel-header">
        <div className="panel-kicker">Advanced Settings</div>
      </div>
      <div className="panel-summary">
        Tune transcript layout and how strongly agents react to each other in this hall.
      </div>
      <div className="session-brief-grid">
        <label className="control-toggle control-field-wide">
          <span>Alternating transcript layout</span>
          <div className="toggle-inline">
            <input
              type="checkbox"
              checked={settings.alternateTranscript}
              onChange={(e) => update('alternateTranscript', e.target.checked)}
            />
            <span>Left / right / left / right message flow</span>
          </div>
        </label>

        <label className="control-toggle control-field-wide">
          <span>Reactive hall mode</span>
          <div className="toggle-inline">
            <input
              type="checkbox"
              checked={settings.reactiveInterplay}
              onChange={(e) => update('reactiveInterplay', e.target.checked)}
            />
            <span>Agents build on, challenge, and reference each other more directly</span>
          </div>
        </label>

        <label className="control-field">
          <span>Conversation cadence</span>
          <select
            value={settings.conversationCadence}
            onChange={(e) => update('conversationCadence', e.target.value as ConversationCadence)}
          >
            {Object.entries(CADENCE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </label>
      </div>
    </section>
  );
}
