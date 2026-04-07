import { useState, useEffect, useRef, useCallback } from 'react';
import { Expression, pickIdleAnimation } from '../services/expressionService';

interface Props {
  agentId: string;
  size: number;
  expression?: Expression;
  className?: string;
}

interface AvatarParts {
  headColor: string;
  headDark: string;
  bgColor: string;
  borderColor: string;
}

const COLORS: Record<string, AvatarParts> = {
  gemma: { headColor: '#ff6b9d', headDark: '#cc4477', bgColor: '#2a1a3e', borderColor: '#3a2a4e' },
  mistral: { headColor: '#7b8cde', headDark: '#5a6abe', bgColor: '#141420', borderColor: '#2a2a4f' },
  scribe: { headColor: '#c9a84c', headDark: '#8a7535', bgColor: '#1a1a0f', borderColor: '#3f3a2a' },
  christopher: { headColor: '#44ff88', headDark: '#33cc66', bgColor: '#0a1a0f', borderColor: '#2a3f2a' },
};

export default function AnimatedAvatar({ agentId, size, expression: externalExpr, className }: Props) {
  const [expr, setExpr] = useState<Expression>('idle');
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isExternalRef = useRef(false);

  // External expression overrides idle
  useEffect(() => {
    if (externalExpr && externalExpr !== 'idle') {
      isExternalRef.current = true;
      setExpr(externalExpr);
      // Hold external expression for a bit, then return to idle
      const timer = setTimeout(() => {
        isExternalRef.current = false;
        setExpr('idle');
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [externalExpr]);

  // Idle animation loop
  const scheduleIdle = useCallback(() => {
    const delay = 2000 + Math.random() * 5000;
    idleTimerRef.current = setTimeout(() => {
      if (!isExternalRef.current) {
        const anim = pickIdleAnimation(agentId);
        setExpr(anim.expression);
        setTimeout(() => {
          if (!isExternalRef.current) setExpr('idle');
          scheduleIdle();
        }, anim.duration);
      } else {
        scheduleIdle();
      }
    }, delay);
  }, [agentId]);

  useEffect(() => {
    scheduleIdle();
    return () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
  }, [scheduleIdle]);

  const c = COLORS[agentId] || COLORS.christopher;
  const s = size;
  const cx = s / 2;
  const headR = s * 0.17;
  const headY = s * 0.37;

  // Eye positions
  const eyeSpacing = s * 0.07;
  const eyeY = headY - s * 0.01;
  const leftEyeX = cx - eyeSpacing;
  const rightEyeX = cx + eyeSpacing;
  const eyeR = s * 0.025;

  // Expression-based transforms
  const eyeOffsetX = expr === 'look-left' ? -s * 0.02 : expr === 'look-right' ? s * 0.02 : 0;
  const isBlink = expr === 'blink';
  const isLaugh = expr === 'laugh';
  const isThink = expr === 'think';
  const isSurprised = expr === 'surprised';
  const isSmirk = expr === 'smirk';
  const isFocused = expr === 'focused';
  const isEyebrowRaise = expr === 'eyebrow-raise';
  const isTalk = expr === 'talk';
  const isNod = expr === 'nod';

  // Mouth shape
  let mouth;
  const mouthY = headY + s * 0.06;
  if (isLaugh) {
    mouth = <ellipse cx={cx} cy={mouthY} rx={s * 0.04} ry={s * 0.03} fill="#0a0e0a" />;
  } else if (isSurprised) {
    mouth = <circle cx={cx} cy={mouthY + s * 0.01} r={s * 0.025} fill="#0a0e0a" />;
  } else if (isSmirk) {
    mouth = <path d={`M${cx - s * 0.03} ${mouthY} Q${cx} ${mouthY + s * 0.02} ${cx + s * 0.05} ${mouthY - s * 0.01}`} fill="none" stroke="#0a0e0a" strokeWidth={s * 0.018} strokeLinecap="round" />;
  } else if (isTalk) {
    mouth = <ellipse cx={cx} cy={mouthY} rx={s * 0.03} ry={s * 0.02} fill="#0a0e0a" className="avatar-talk" />;
  } else if (isFocused) {
    mouth = <line x1={cx - s * 0.04} y1={mouthY} x2={cx + s * 0.04} y2={mouthY} stroke="#0a0e0a" strokeWidth={s * 0.015} strokeLinecap="round" />;
  } else if (agentId === 'scribe') {
    mouth = <line x1={cx - s * 0.035} y1={mouthY} x2={cx + s * 0.035} y2={mouthY} stroke="#0a0e0a" strokeWidth={s * 0.015} strokeLinecap="round" />;
  } else {
    // Default smile
    mouth = <path d={`M${cx - s * 0.04} ${mouthY - s * 0.005} Q${cx} ${mouthY + s * 0.03} ${cx + s * 0.04} ${mouthY - s * 0.005}`} fill="none" stroke="#0a0e0a" strokeWidth={s * 0.018} strokeLinecap="round" />;
  }

  // Eyes
  const eyeHeight = isBlink ? s * 0.003 : isLaugh ? s * 0.008 : eyeR;
  const eyeWidth = eyeR;

  // Eyebrows
  const browY = eyeY - s * 0.045;
  const browLen = s * 0.035;
  const browOffset = isEyebrowRaise ? -s * 0.015 : isThink ? -s * 0.008 : isSurprised ? -s * 0.02 : 0;
  const browAngleL = isThink ? -0.15 : isEyebrowRaise ? -0.2 : 0;
  const browAngleR = isThink ? 0.15 : isEyebrowRaise ? 0.2 : 0;

  // Nod animation
  const headTransform = isNod ? `translate(0, ${s * 0.01})` : '';

  // Agent-specific details
  let agentDetails = null;
  if (agentId === 'gemma') {
    // Hair
    agentDetails = <path d={`M${cx - headR} ${headY - s * 0.03} Q${cx - headR + s * 0.01} ${headY - headR - s * 0.05} ${cx} ${headY - headR - s * 0.02} Q${cx + headR - s * 0.01} ${headY - headR - s * 0.05} ${cx + headR} ${headY - s * 0.03}`} fill={c.headDark} />;
  } else if (agentId === 'mistral') {
    // Spiky hair
    agentDetails = (
      <g>
        <polygon points={`${cx - s * 0.1},${headY - s * 0.08} ${cx - s * 0.06},${headY - s * 0.2} ${cx - s * 0.03},${headY - s * 0.1}`} fill={c.headDark} />
        <polygon points={`${cx - s * 0.03},${headY - s * 0.12} ${cx},${headY - s * 0.24} ${cx + s * 0.03},${headY - s * 0.12}`} fill={c.headDark} />
        <polygon points={`${cx + s * 0.03},${headY - s * 0.1} ${cx + s * 0.06},${headY - s * 0.2} ${cx + s * 0.1},${headY - s * 0.08}`} fill={c.headDark} />
      </g>
    );
  } else if (agentId === 'scribe') {
    // Hood
    agentDetails = (
      <g>
        <path d={`M${cx - headR - s * 0.04} ${headY + s * 0.01} Q${cx - headR} ${headY - headR - s * 0.08} ${cx} ${headY - headR - s * 0.05} Q${cx + headR} ${headY - headR - s * 0.08} ${cx + headR + s * 0.04} ${headY + s * 0.01}`} fill={c.headDark} fillOpacity="0.9" />
        {/* Glasses */}
        <circle cx={leftEyeX} cy={eyeY} r={s * 0.04} fill="none" stroke="#5a5a3a" strokeWidth={s * 0.012} />
        <circle cx={rightEyeX} cy={eyeY} r={s * 0.04} fill="none" stroke="#5a5a3a" strokeWidth={s * 0.012} />
        <line x1={leftEyeX + s * 0.04} y1={eyeY} x2={rightEyeX - s * 0.04} y2={eyeY} stroke="#5a5a3a" strokeWidth={s * 0.01} />
      </g>
    );
  } else if (agentId === 'christopher') {
    // Short hair + headphones
    agentDetails = (
      <g>
        <path d={`M${cx - headR} ${headY - s * 0.03} Q${cx - headR + s * 0.01} ${headY - headR - s * 0.03} ${cx} ${headY - headR - s * 0.01} Q${cx + headR - s * 0.01} ${headY - headR - s * 0.03} ${cx + headR} ${headY - s * 0.03}`} fill={c.headDark} />
        <path d={`M${cx - s * 0.12} ${headY + s * 0.08} Q${cx - s * 0.12} ${headY + s * 0.03} ${cx - s * 0.08} ${headY + s * 0.03}`} fill="none" stroke="#2a3f2a" strokeWidth={s * 0.02} strokeLinecap="round" />
        <path d={`M${cx + s * 0.12} ${headY + s * 0.08} Q${cx + s * 0.12} ${headY + s * 0.03} ${cx + s * 0.08} ${headY + s * 0.03}`} fill="none" stroke="#2a3f2a" strokeWidth={s * 0.02} strokeLinecap="round" />
      </g>
    );
  }

  // Body
  const bodyY = s * 0.56;
  const bodyH = s * 0.38;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={s}
      height={s}
      viewBox={`0 0 ${s} ${s}`}
      className={className}
      style={{ borderRadius: 2 }}
    >
      {/* Background */}
      <rect width={s} height={s} fill="#0a0e0a" />
      <rect x={s * 0.03} y={s * 0.03} width={s * 0.94} height={s * 0.94} fill={c.bgColor} rx={s * 0.03} stroke={c.borderColor} strokeWidth={s * 0.015} />

      {/* Body */}
      <rect x={cx - s * 0.16} y={bodyY} width={s * 0.32} height={bodyH} rx={s * 0.04} fill={c.headColor} opacity="0.9" />

      {/* Head group (nodding) */}
      <g transform={headTransform} className={isNod ? 'avatar-nod' : ''}>
        {/* Head */}
        <circle cx={cx} cy={headY} r={headR} fill={c.headColor} opacity="0.9" />

        {/* Agent-specific details (hair, hood, etc.) */}
        {agentDetails}

        {/* Eyes */}
        <ellipse
          cx={leftEyeX + eyeOffsetX}
          cy={eyeY}
          rx={eyeWidth}
          ry={eyeHeight}
          fill="#0a0e0a"
          className={isBlink ? 'avatar-blink' : ''}
        />
        <ellipse
          cx={rightEyeX + eyeOffsetX}
          cy={eyeY}
          rx={eyeWidth}
          ry={eyeHeight}
          fill="#0a0e0a"
          className={isBlink ? 'avatar-blink' : ''}
        />

        {/* Eyebrows */}
        <line
          x1={leftEyeX - browLen}
          y1={browY + browOffset}
          x2={leftEyeX + browLen}
          y2={browY + browOffset + browAngleL * s * 0.1}
          stroke={c.headDark}
          strokeWidth={s * 0.015}
          strokeLinecap="round"
        />
        <line
          x1={rightEyeX - browLen}
          y1={browY + browOffset + browAngleR * s * 0.1}
          x2={rightEyeX + browLen}
          y2={browY + browOffset}
          stroke={c.headDark}
          strokeWidth={s * 0.015}
          strokeLinecap="round"
        />

        {/* Mouth */}
        {mouth}
      </g>

      {/* Scribe notebook detail */}
      {agentId === 'scribe' && (
        <g>
          <rect x={cx - s * 0.07} y={bodyY + s * 0.08} width={s * 0.14} height={s * 0.18} rx={s * 0.01} fill="#0a0e0a" opacity="0.4" />
          <line x1={cx - s * 0.04} y1={bodyY + s * 0.12} x2={cx + s * 0.04} y2={bodyY + s * 0.12} stroke={c.headColor} strokeWidth={s * 0.007} opacity="0.5" />
          <line x1={cx - s * 0.04} y1={bodyY + s * 0.15} x2={cx + s * 0.04} y2={bodyY + s * 0.15} stroke={c.headColor} strokeWidth={s * 0.007} opacity="0.5" />
          <line x1={cx - s * 0.04} y1={bodyY + s * 0.18} x2={cx + s * 0.02} y2={bodyY + s * 0.18} stroke={c.headColor} strokeWidth={s * 0.007} opacity="0.5" />
        </g>
      )}

      {/* Scanlines */}
      <line x1={s * 0.06} y1={s * 0.23} x2={s * 0.94} y2={s * 0.23} stroke="#0a0e0a" strokeWidth={s * 0.005} opacity="0.3" />
      <line x1={s * 0.06} y1={s * 0.47} x2={s * 0.94} y2={s * 0.47} stroke="#0a0e0a" strokeWidth={s * 0.005} opacity="0.3" />
      <line x1={s * 0.06} y1={s * 0.7} x2={s * 0.94} y2={s * 0.7} stroke="#0a0e0a" strokeWidth={s * 0.005} opacity="0.3" />
    </svg>
  );
}
