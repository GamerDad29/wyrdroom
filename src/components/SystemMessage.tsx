interface Props {
  text: string;
}

export default function SystemMessage({ text }: Props) {
  // Multi-line system messages (like /budget output)
  if (text.includes('\n')) {
    return (
      <div className="system-message" style={{ textAlign: 'left', paddingLeft: '42px', whiteSpace: 'pre-wrap' }}>
        {text}
      </div>
    );
  }

  return (
    <div className="system-message">
      <span className="system-bracket">[</span> {text} <span className="system-bracket">]</span>
    </div>
  );
}
