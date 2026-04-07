import { useState, useRef } from 'react';

interface Props {
  onSend: (text: string) => void;
  disabled: boolean;
}

export default function ChatInput({ onSend, disabled }: Props) {
  const [text, setText] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const isCommand = text.startsWith('/');

  function handleSend() {
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setText('');
    inputRef.current?.focus();
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="chat-input-bar">
      <input
        ref={inputRef}
        className={`chat-input ${isCommand ? 'command-mode' : ''}`}
        type="text"
        placeholder="Type a message... (/help for commands)"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        autoFocus
      />
      <button
        className="chat-send-btn"
        onClick={handleSend}
        disabled={disabled || !text.trim()}
      >
        Send
      </button>
    </div>
  );
}
