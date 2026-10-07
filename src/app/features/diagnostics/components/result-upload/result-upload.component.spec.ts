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
});
