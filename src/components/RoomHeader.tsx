interface Props {
  description: string;
  showSearch: boolean;
  onToggleSearch: () => void;
}

export default function RoomHeader({ description, showSearch, onToggleSearch }: Props) {
  return (
    <div className="room-header">
      <span className="room-description">{description}</span>
      <button
        className="search-toggle"
        onClick={onToggleSearch}
      >
        {showSearch ? 'CLOSE' : 'SEARCH'}
      </button>
    </div>
  );
}
