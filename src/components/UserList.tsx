import { UserInfo } from '../types';
import { Expression } from '../services/expressionService';
import AnimatedAvatar from './AnimatedAvatar';

interface Props {
  users: UserInfo[];
  onClickAgent: (agentId: string) => void;
  getExpression: (agentId: string) => Expression;
}

export default function UserList({ users, onClickAgent, getExpression }: Props) {
  return (
    <div className="user-list">
      <div className="user-list-header">In This Room</div>
      {users.map((user) => (
        <div key={user.id} className="user-card">
          <AnimatedAvatar
            agentId={user.id}
            size={40}
            expression={getExpression(user.id)}
            className="user-card-avatar"
          />
          <div className="user-card-info">
            <div
              className={`user-card-name ${user.id !== 'christopher' ? 'clickable' : ''}`}
              style={{ color: user.nameColor }}
              onClick={() => {
                if (user.id !== 'christopher') onClickAgent(user.id);
              }}
            >
              {user.name}
            </div>
            <div className="user-card-status">
              <div className={`status-dot ${user.status}`} />
              {user.status}
            </div>
            {user.mood && (
              <div className="user-card-mood">{user.mood}</div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
