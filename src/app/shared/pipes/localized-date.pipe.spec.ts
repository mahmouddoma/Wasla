import { LocalizedDatePipe } from './localized-date.pipe';
describe('Localized date presentation', () => {
  const pipe = new LocalizedDatePipe();
  it('formats timestamps in both product languages instead of exposing ISO payloads', () => {
    const time = '2026-10-06T09:00:00Z';
    expect(pipe.transform(time, 'en')).not.toContain('T09:');
    expect(pipe.transform(time, 'ar')).not.toBe(pipe.transform(time, 'en'));
  });
  it('handles absent or invalid server dates without throwing', () => {
    expect(pipe.transform(null, 'ar')).toBe('—');
    expect(pipe.transform('invalid', 'en')).toBe('—');
  });
});
