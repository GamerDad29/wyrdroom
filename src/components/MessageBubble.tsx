import { Message } from '../types';
import { Expression } from '../services/expressionService';
import AnimatedAvatar from './AnimatedAvatar';

interface Props {
  message: Message;
  searchQuery?: string;
  onClickAgent?: (agentId: string) => void;
  expression?: Expression;
}

function formatTime(timestamp: number): string {
  const d = new Date(timestamp);
  return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function renderMarkdown(text: string, searchQuery?: string): (string | JSX.Element)[] {
  let html = text;
  html = html.replace(/```([\s\S]*?)```/g, '<pre>$1</pre>');
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<em>$1</em>');

  if (searchQuery && searchQuery.length > 0) {
    const escaped = searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    html = html.replace(
      new RegExp(`(${escaped})`, 'gi'),
      '<mark style="background:#c9a84c33;color:#e0f0c0">$1</mark>',
    );
  }

  return [<span key="md" dangerouslySetInnerHTML={{ __html: html }} />];
}

export default function MessageBubble({ message, searchQuery, onClickAgent, expression }: Props) {
  const isAgent = message.type === 'agent';
  const isUser = message.type === 'user';
  const showAnimatedAvatar = isAgent || isUser;

  return (
    <div className={`message ${searchQuery ? 'highlighted' : ''}`}>
      {showAnimatedAvatar ? (
        <AnimatedAvatar
          agentId={message.senderId}
          size={32}
          expression={expression}
          className="message-avatar"
        />
      ) : (
        <img
          className="message-avatar"
          src={message.avatarUrl}
          alt={message.senderName}
          onError={(e) => {
            (e.target as HTMLImageElement).src = '/avatars/user.svg';
          }}
        />
      )}
      <div className="message-body">
        <div className="message-header">
          <span
            className={`message-sender ${isAgent ? 'clickable' : ''}`}
            style={{ color: message.senderColor }}
            onClick={() => {
              if (isAgent && onClickAgent) onClickAgent(message.senderId);
            }}
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
