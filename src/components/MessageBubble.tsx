import { Message } from '../types';

interface Props {
  message: Message;
  searchQuery?: string;
}

function formatTime(timestamp: number): string {
  const d = new Date(timestamp);
  return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function renderMarkdown(text: string, searchQuery?: string): (string | JSX.Element)[] {
  // Process markdown in order: code blocks, inline code, bold, italic
  let html = text;

  // Code blocks: ```...```
  html = html.replace(/```([\s\S]*?)```/g, '<pre>$1</pre>');

  // Inline code: `...`
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

  // Bold: **...**
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

  // Italic: *...*  (but not inside **)
  html = html.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<em>$1</em>');

  // Search highlighting
  if (searchQuery && searchQuery.length > 0) {
    const escaped = searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    html = html.replace(
      new RegExp(`(${escaped})`, 'gi'),
      '<mark style="background:#c9a84c33;color:#e0f0c0">$1</mark>',
    );
  }

  return [<span key="md" dangerouslySetInnerHTML={{ __html: html }} />];
}

export default function MessageBubble({ message, searchQuery }: Props) {
  return (
    <div className={`message ${searchQuery ? 'highlighted' : ''}`}>
      <img
        className="message-avatar"
        src={message.avatarUrl}
        alt={message.senderName}
        onError={(e) => {
          (e.target as HTMLImageElement).src = '/avatars/user.svg';
        }}
      />
      <div className="message-body">
        <div className="message-header">
          <span
            className="message-sender"
            style={{ color: message.senderColor }}
          >
            {message.senderName}
          </span>
          <span className="message-time">{formatTime(message.timestamp)}</span>
        </div>
        <div className="message-content">
          {renderMarkdown(message.content, searchQuery)}
          {message.isStreaming && <span className="streaming-cursor" />}
        </div>
      </div>
    </div>
  );
}
