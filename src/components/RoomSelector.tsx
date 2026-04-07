import { Room } from '../types';

interface Props {
  rooms: Room[];
  activeRoomId: string;
  onSelectRoom: (roomId: string) => void;
}

export default function RoomSelector({ rooms, activeRoomId, onSelectRoom }: Props) {
  return (
    <div className="room-selector">
      {rooms.map((room) => (
        <button
          key={room.id}
          className={`room-tab ${room.id === activeRoomId ? 'active' : ''}`}
          onClick={() => onSelectRoom(room.id)}
        >
          <span className="room-tab-icon">{room.icon}</span>
          {room.name}
        </button>
      ))}
    </div>
  );
}
