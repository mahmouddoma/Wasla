import { TestBed } from '@angular/core/testing';
import { ToastService } from './toast.service';

describe('ToastService', () => {
  let service: ToastService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ToastService);
  });

  afterEach(() => {
    for (const message of service.messages()) service.dismiss(message.id);
  });

  it('shows a normalized error and dismisses it', () => {
    service.error('  تعذر إكمال الطلب.  ');

    expect(service.messages()).toHaveLength(1);
    expect(service.messages()[0].message).toBe('تعذر إكمال الطلب.');
    expect(service.messages()[0].kind).toBe('error');

    service.dismiss(service.messages()[0].id);
    expect(service.messages()).toEqual([]);
  });

  it('replaces a duplicate instead of stacking it', () => {
    service.error('تعذر إكمال الطلب.');
    service.error('تعذر إكمال الطلب.');

    expect(service.messages()).toHaveLength(1);
  });

  it('ignores empty messages', () => {
    service.error('   ');
    expect(service.messages()).toEqual([]);
  });

  it('shows success messages with their own semantic kind', () => {
    service.success('  تم الحفظ بنجاح.  ');

    expect(service.messages()).toEqual([
      expect.objectContaining({ message: 'تم الحفظ بنجاح.', kind: 'success' }),
    ]);
  });

  it('keeps identical success and error messages as separate notifications', () => {
    service.success('اكتملت العملية.');
    service.error('اكتملت العملية.');

    expect(service.messages().map(({ kind }) => kind)).toEqual(['success', 'error']);
  });
});
