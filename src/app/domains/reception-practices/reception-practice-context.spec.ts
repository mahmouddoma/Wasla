import { TestBed } from '@angular/core/testing';
import { of, Subject } from 'rxjs';
import { ReceptionPracticeContext } from './reception-practice-context';
import { ReceptionPractice } from './reception-practice.models';
import { ReceptionPracticesApi } from './reception-practices-api';

describe('ReceptionPracticeContext', () => {
  const practice = (id: string, codes: string[] = [], isActive = true): ReceptionPractice => ({
    id,
    nameAr: id,
    nameEn: id,
    doctorNameAr: null,
    doctorNameEn: null,
    isActive,
    permissionCodes: codes,
  });
  let context: ReceptionPracticeContext;
  const api = { list: vi.fn() };
  beforeEach(() => {
    api.list.mockReset();
    TestBed.configureTestingModule({
      providers: [{ provide: ReceptionPracticesApi, useValue: api }],
    });
    context = TestBed.inject(ReceptionPracticeContext);
  });
  it('automatically selects the sole active assignment', async () => {
    api.list.mockReturnValue(of([practice('cairo', ['Search']), practice('inactive', [], false)]));
    await context.refresh();
    expect(context.practices().map((p) => p.id)).toEqual(['cairo']);
    expect(context.currentPracticeId()).toBe('cairo');
    expect(context.allows('Search')).toBe(true);
  });
  it('requires a selection for multiple practices and uses only its permissions', async () => {
    api.list.mockReturnValue(of([practice('cairo', ['Search']), practice('shebin', ['CheckIn'])]));
    await context.refresh();
    expect(context.currentPracticeId()).toBe('');
    context.select('cairo');
    expect(context.allows('Search')).toBe(true);
    context.select('shebin');
    expect(context.allows('Search')).toBe(false);
    expect(context.allows('CheckIn')).toBe(true);
    context.select('foreign');
    expect(context.currentPractice()).toBeNull();
  });
  it('shares concurrent loads and ignores responses belonging to a cleared session', async () => {
    const response = new Subject<ReceptionPractice[]>();
    api.list.mockReturnValue(response);
    const loading = context.refresh();
    expect(context.refresh()).toBe(loading);
    expect(api.list).toHaveBeenCalledTimes(1);
    context.clear();
    response.next([practice('old')]);
    await loading;
    expect(context.practices()).toEqual([]);
    expect(context.isLoading()).toBe(false);
  });
  it('removes selection and permissions if its assignment becomes inactive', async () => {
    api.list.mockReturnValue(of([practice('cairo', ['Search'])]));
    await context.refresh();
    api.list.mockReturnValue(of([practice('cairo', ['Search'], false)]));
    await context.refresh();
    expect(context.currentPracticeId()).toBe('');
    expect(context.allows('Search')).toBe(false);
  });
});
