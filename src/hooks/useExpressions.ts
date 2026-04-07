import { useState, useCallback, useRef } from 'react';
import { Expression, detectExpression } from '../services/expressionService';
import { Message } from '../types';

export function useExpressions() {
  const [expressions, setExpressions] = useState<Record<string, Expression>>({});
  const timerRefs = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const setExpression = useCallback((agentId: string, expr: Expression, duration = 2500) => {
    // Clear any existing timer for this agent
    if (timerRefs.current[agentId]) {
      clearTimeout(timerRefs.current[agentId]);
    }

    setExpressions((prev) => ({ ...prev, [agentId]: expr }));

    // Auto-reset to idle after duration
    if (expr !== 'idle') {
      timerRefs.current[agentId] = setTimeout(() => {
        setExpressions((prev) => ({ ...prev, [agentId]: 'idle' }));
      }, duration);
    }
  }, []);

  // Called when a message comes in to detect and set expression
  const onMessage = useCallback((message: Message) => {
    if (message.type === 'agent') {
      const expr = detectExpression(message.content);
      if (expr !== 'idle') {
        setExpression(message.senderId, expr);
      }
    }
  }, [setExpression]);

  // Set typing expression
  const onTyping = useCallback((agentId: string) => {
    setExpression(agentId, 'think', 10000);
  }, [setExpression]);

  // Clear typing expression
  const onStopTyping = useCallback((agentId: string) => {
    setExpression(agentId, 'idle');
  }, [setExpression]);

  const getExpression = useCallback((agentId: string): Expression => {
    return expressions[agentId] || 'idle';
  }, [expressions]);

  return { getExpression, onMessage, onTyping, onStopTyping, setExpression };
}
