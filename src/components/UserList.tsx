import { UserInfo } from '../types';

interface Props {
  users: UserInfo[];
}

export default function UserList({ users }: Props) {
  return (
    <div className="user-list">
      <div className="user-list-header">In This Room</div>
      {users.map((user) => (
        <div key={user.id} className="user-card">
          <img
            className="user-card-avatar"
            src={user.avatarUrl}
            alt={user.name}
            onError={(e) => {
              (e.target as HTMLImageElement).src = '/avatars/user.svg';
            }}
          />
          <div className="user-card-info">
            <div
              className="user-card-name"
              style={{ color: user.nameColor }}
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
