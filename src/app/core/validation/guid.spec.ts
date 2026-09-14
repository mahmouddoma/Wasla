import { isGuid } from './guid';

describe('isGuid', () => {
  it('accepts deterministic .NET GUIDs without RFC version and variant bits', () => {
    expect(isGuid('10000000-0000-0000-0000-000000000002')).toBe(true);
  });

  it('accepts RFC UUIDs in the same canonical GUID format', () => {
    expect(isGuid('1bbac680-bda0-4cb0-b531-7cc1d61e22b6')).toBe(true);
  });

  it('rejects malformed route identifiers', () => {
    expect(isGuid('not-a-guid')).toBe(false);
    expect(isGuid('10000000000000000000000000000002')).toBe(false);
  });
});
