import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FileUpload } from './file-upload';

describe('FileUpload', () => {
  let fixture: ComponentFixture<FileUpload>;
  const change=vi.fn();
  beforeEach(async()=>{
    change.mockClear();
    TestBed.configureTestingModule({imports:[FileUpload]});
    fixture=TestBed.createComponent(FileUpload);
    fixture.componentRef.setInput('label','Profile photo');
    fixture.componentInstance.fileChange.subscribe(change);
    vi.spyOn(URL,'createObjectURL').mockReturnValue('blob:preview');
    vi.spyOn(URL,'revokeObjectURL').mockImplementation(()=>{});
    await fixture.whenStable();
  });
  afterEach(()=>vi.restoreAllMocks());
  async function choose(file: File): Promise<void> {
    const input=(fixture.nativeElement as HTMLElement).querySelector<HTMLInputElement>('input')!;
    Object.defineProperty(input,'files',{configurable:true,value:[file]});
    input.dispatchEvent(new Event('change',{bubbles:true}));
    await fixture.whenStable();
  }
  it('renders a selected file and emits the original File',async()=>{
    const file=new File(['photo'],'photo.png',{type:'image/png'});
    await choose(file);
    expect(fixture.componentInstance).toBeTruthy();
    expect(change).toHaveBeenCalledWith(file);
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('photo.png');
    expect((fixture.nativeElement as HTMLElement).querySelector('img')?.getAttribute('src')).toBe('blob:preview');
  });
  it('removes an optional file and releases its preview URL',async()=>{
    await choose(new File(['photo'],'photo.png',{type:'image/png'}));
    (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('.btn-remove-file')!.click();
    await fixture.whenStable();
    expect(change).toHaveBeenLastCalledWith(undefined);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:preview');
    expect((fixture.nativeElement as HTMLElement).querySelector('img')).toBeNull();
  });
  it('shows validation and prevents removing a required upload',async()=>{
    fixture.componentRef.setInput('required',true);
    fixture.componentRef.setInput('error','Unsupported file');
    await choose(new File(['photo'],'photo.png',{type:'image/png'}));
    const element: HTMLElement=fixture.nativeElement;
    expect(element.querySelector('.btn-remove-file')).toBeNull();
    expect(element.querySelector('[role="alert"]')?.textContent).toContain('Unsupported file');
  });
  it('releases the active preview when destroyed',async()=>{
    await choose(new File(['photo'],'photo.png',{type:'image/png'}));
    fixture.destroy();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:preview');
  });
});
