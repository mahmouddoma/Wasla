import { TestBed } from '@angular/core/testing';
import { diagnosticRequest } from '../../diagnostic-test-fixtures';
import { ResultUploadComponent } from './result-upload.component';
describe('Diagnostic document upload', () => {
  beforeEach(() => TestBed.configureTestingModule({ imports: [ResultUploadComponent] }));
  it('lets patients submit files without clinical coverage fields', async () => {
    const f = TestBed.createComponent(ResultUploadComponent);
    await f.whenStable();
    const c = f.componentInstance;
    expect(c).toBeTruthy();
    const emitted = vi.fn();
    c.submitted.subscribe(emitted);
    c.files.set([new File(['synthetic'], 'report.pdf')]);
    c.kinds.set(['Report']);
    c.submit();
    expect(emitted).toHaveBeenCalledWith(expect.objectContaining({ coveredItemIds: [] }));
    expect(f.nativeElement.textContent).not.toContain('اختر الفحوصات');
  });
  it('requires doctor coverage and emits one attachment kind per file', async () => {
    const f = TestBed.createComponent(ResultUploadComponent);
    f.componentRef.setInput('doctor', true);
    f.componentRef.setInput('rowVersion', 'result-rv');
    f.componentRef.setInput('items', diagnosticRequest.items);
    await f.whenStable();
    const c = f.componentInstance;
    const emitted = vi.fn();
    c.submitted.subscribe(emitted);
    c.files.set([new File(['s'], 'report.pdf'), new File(['i'], 'image.png')]);
    c.kinds.set(['Report', 'Image']);
    c.submit();
    expect(emitted).not.toHaveBeenCalled();
    c.toggle('item');
    c.submit();
    expect(emitted).toHaveBeenCalledWith(
      expect.objectContaining({
        coveredItemIds: ['item'],
        attachmentKinds: ['Report', 'Image'],
        rowVersion: 'result-rv',
      }),
    );
  });
  it('requires a correction reason and blocks disabled submissions', () => {
    const f = TestBed.createComponent(ResultUploadComponent);
    f.componentRef.setInput('correction', true);
    const c = f.componentInstance;
    const emitted = vi.fn();
    c.submitted.subscribe(emitted);
    c.files.set([new File(['s'], 'report.pdf')]);
    c.kinds.set(['Report']);
    c.submit();
    expect(emitted).not.toHaveBeenCalled();
    c.reason.set('Replace unclear scan');
    f.componentRef.setInput('busy', true);
    c.submit();
    expect(emitted).not.toHaveBeenCalled();
  });

  it('rejects oversized, empty, excessive and combined oversized files before emitting', () => {
    const fixture = TestBed.createComponent(ResultUploadComponent);
    const c = fixture.componentInstance;
    const emitted = vi.fn();
    c.submitted.subscribe(emitted);
    const file = (size: number, name = 'report.pdf') => {
      const value = new File(['test'], name);
      Object.defineProperty(value, 'size', { value: size });
      return value;
    };
    for (const [files, error] of [
      [[file(10 * 1024 * 1024 + 1)], 'diagnostics.fileSizeLimit'],
      [[file(0)], 'diagnostics.fileSizeLimit'],
      [Array.from({ length: 21 }, () => file(1)), 'diagnostics.fileCountLimit'],
      [Array.from({ length: 11 }, () => file(10 * 1024 * 1024)), 'diagnostics.totalSizeLimit'],
      [[file(1, 'report.exe')], 'diagnostics.unsupportedFile'],
    ] as const) {
      c.files.set(files);
      c.kinds.set(files.map(() => 'Report'));
      c.submit();
      expect(c.error()).toBe(error);
    }
    expect(emitted).not.toHaveBeenCalled();
  });

  it('allows completed items only when correcting that result’s existing coverage', async () => {
    const fixture = TestBed.createComponent(ResultUploadComponent);
    fixture.componentRef.setInput('doctor', true);
    fixture.componentRef.setInput('rowVersion', 'rv');
    fixture.componentRef.setInput('items', [
      { ...diagnosticRequest.items![0], itemId: 'requested', status: 'Requested' },
      { ...diagnosticRequest.items![0], itemId: 'own-completed', status: 'Completed' },
      { ...diagnosticRequest.items![0], itemId: 'other-completed', status: 'Completed' },
    ]);
    await fixture.whenStable();
    const c = fixture.componentInstance;
    c.toggle('other-completed');
    expect(c.covered()).toEqual([]);
    fixture.componentRef.setInput('correction', true);
    fixture.componentRef.setInput('previousCovered', ['own-completed']);
    await fixture.whenStable();
    expect(c.eligibleItems().map((item) => item.itemId)).toEqual(['requested', 'own-completed']);
    c.toggle('own-completed');
    expect(c.covered()).toEqual(['own-completed']);
    c.files.set([new File(['test'], 'report.pdf')]);
    c.kinds.set(['Report']);
    c.reason.set('Correction');
    const emitted = vi.fn();
    c.submitted.subscribe(emitted);
    c.submit();
    expect(emitted).toHaveBeenCalledTimes(1);
    fixture.componentRef.setInput('requestStatus', 'Draft');
    c.submit();
    expect(emitted).toHaveBeenCalledTimes(1);
  });
});
