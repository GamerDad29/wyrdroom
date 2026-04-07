import { useRef, useEffect } from 'react';

interface Props {
  query: string;
  matchCount: number;
  onQueryChange: (query: string) => void;
  onClose: () => void;
}

export default function SearchBar({ query, matchCount, onQueryChange, onClose }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') {
      onClose();
    }
  }

  return (
    <div className="search-bar">
      <input
        ref={inputRef}
        className="search-input"
        type="text"
        placeholder="Search messages..."
        value={query}
        onChange={(e) => onQueryChange(e.target.value)}
        onKeyDown={handleKeyDown}
      />
      {query && (
        <span className="search-count">
          {matchCount} {matchCount === 1 ? 'match' : 'matches'}
        </span>
      )}
      <button className="search-close" onClick={onClose}>
        X
      </button>
    </div>
  );
}
