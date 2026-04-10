import { describe, expect, it } from 'vitest';
import { parseCommand, parseTargetAgent } from './commandService';

describe('commandService', () => {
  it('parses /me into an action message', () => {
    expect(parseCommand('/me waves', 'user-1', 'Christopher')).toEqual({
      type: 'action',
      content: '* Christopher waves *',
    });
  });

  it('parses timed iteration commands', () => {
    expect(parseCommand('/iterate 10m brainstorm features', 'user-1', 'Christopher')).toEqual({
      type: 'iterate',
      content: 'Iteration started: brainstorm features (10m)',
      iterateTime: 600000,
      iterateTopic: 'brainstorm features',
    });
  });

  it('parses vault search commands', () => {
    expect(parseCommand('/vault search roadmap', 'user-1', 'Christopher')).toEqual({
      type: 'vault',
      content: 'roadmap',
      vaultAction: 'search',
    });
  });

  it('detects hey-all messages and direct agent mentions', () => {
    expect(parseTargetAgent('hey all can someone weigh in')).toEqual({
      agentId: null,
      cleanText: 'hey all can someone weigh in',
      heyAll: true,
    });

    expect(parseTargetAgent('@echo read the room')).toEqual({
      agentId: 'echo',
      cleanText: 'read the room',
      heyAll: false,
    });
  });
});
