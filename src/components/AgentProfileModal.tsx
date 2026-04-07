import { AgentProfile } from '../agents/profiles';
import AnimatedAvatar from './AnimatedAvatar';

interface Props {
  profile: AgentProfile;
  onClose: () => void;
}

export default function AgentProfileModal({ profile, onClose }: Props) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-terminal" onClick={(e) => e.stopPropagation()}>
        {/* Terminal title bar */}
        <div className="modal-titlebar">
          <span className="modal-title">PERSONNEL FILE: {profile.name.toUpperCase()}</span>
          <button className="modal-close" onClick={onClose}>X</button>
        </div>

        <div className="modal-body">
          {/* Left: avatar + basic info */}
          <div className="modal-left">
            <div className="modal-avatar-frame">
              <AnimatedAvatar
                agentId={profile.id}
                size={112}
                className="modal-avatar"
              />
              <div className="modal-avatar-scanline" />
            </div>
            <div className="modal-name" style={{ color: profile.nameColor }}>
              {profile.name}
            </div>
            <div className="modal-title-role">{profile.title}</div>
            <div className="modal-model">{profile.model}</div>
            <div className="modal-cost">{profile.cost}</div>
          </div>

          {/* Right: details */}
          <div className="modal-right">
            <div className="modal-section">
              <div className="modal-section-header">PERSONALITY</div>
              <div className="modal-section-text">{profile.personality}</div>
            </div>

            <div className="modal-section">
              <div className="modal-section-header">BACKSTORY</div>
              <div className="modal-section-text">{profile.backstory}</div>
            </div>

            <div className="modal-columns">
              <div className="modal-section">
                <div className="modal-section-header">STRENGTHS</div>
                <ul className="modal-list modal-list-green">
                  {profile.strengths.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
              </div>

              <div className="modal-section">
                <div className="modal-section-header">WEAKNESSES</div>
                <ul className="modal-list modal-list-red">
                  {profile.weaknesses.map((w, i) => (
                    <li key={i}>{w}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
