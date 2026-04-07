import { Message } from '../types';

export function buildNotesPrompt(messages: Message[], roomName: string): string {
  // Build a conversation transcript for Scribe to summarize
  const transcript = messages
    .filter((m) => m.type === 'user' || m.type === 'agent' || m.type === 'action')
    .slice(-50) // Last 50 messages for context
    .map((m) => {
      if (m.type === 'action') return m.content;
      return `${m.senderName}: ${m.content}`;
    })
    .join('\n');

  return `Compile notes from this ${roomName} conversation. Format as clean Obsidian-compatible Markdown with YAML frontmatter.\n\nTranscript:\n${transcript}`;
}

export function downloadAsMarkdown(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function generateExportFilename(roomName: string): string {
  const date = new Date().toISOString().slice(0, 10);
  const time = new Date().toISOString().slice(11, 16).replace(':', '');
  const slug = roomName.toLowerCase().replace(/\s+/g, '-');
  return `apoc-${slug}-${date}-${time}.md`;
}
