import { TestBed } from '@angular/core/testing';
import { PdfViewerComponent } from './pdf-viewer.component';
describe('Private PDF viewer', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'URL',
      class {
        static createObjectURL = vi.fn(() => 'blob:private');
        static revokeObjectURL = vi.fn();
      },
    );
  });
  afterEach(() => vi.unstubAllGlobals());
  it('renders a private PDF and revokes it on close', async () => {
    const fixture = TestBed.createComponent(PdfViewerComponent);
    fixture.componentRef.setInput('blob', new Blob(['pdf'], { type: 'application/pdf' }));
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('iframe')).toBeTruthy();
    const closed = vi.fn();
    fixture.componentInstance.closed.subscribe(closed);
    fixture.componentInstance.close();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:private');
    expect(closed).toHaveBeenCalled();
  });
  it('revokes the previous patient document when input changes and on destroy', async () => {
    const fixture = TestBed.createComponent(PdfViewerComponent);
    fixture.componentRef.setInput('blob', new Blob(['one'], { type: 'application/pdf' }));
    await fixture.whenStable();
    fixture.componentRef.setInput('blob', new Blob(['two'], { type: 'application/pdf' }));
    await fixture.whenStable();
    expect(URL.revokeObjectURL).toHaveBeenCalledTimes(1);
    fixture.destroy();
    expect(URL.revokeObjectURL).toHaveBeenCalledTimes(2);
  });
  it('does not render non-PDF or empty responses', async () => {
    const fixture = TestBed.createComponent(PdfViewerComponent);
    fixture.componentRef.setInput('blob', new Blob(['error'], { type: 'application/json' }));
    await fixture.whenStable();
    expect(fixture.componentInstance.source()).toBeNull();
  });
});
