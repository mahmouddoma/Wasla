import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { of, throwError } from 'rxjs';
import { DoctorProfileApi } from '../../../../domains/doctor-profile';
import { PublicDiscoveryApi, PublicDoctorSearchResponse } from '../../../../domains/public-discovery';
import { LanguageService } from '../../../../core/i18n/language.service';
import { PublicDoctors } from './public-doctors';

describe('PublicDoctors', () => {
  let fixture: ComponentFixture<PublicDoctors>;
  const empty: PublicDoctorSearchResponse = { items: [], totalCount: 0, pageNumber: 1, pageSize: 20 };
  const api = { doctors: vi.fn(() => of(empty)), specializations: vi.fn(() => of([])) };
  const locations = { governorates: vi.fn(() => of([{id: 1, nameAr: 'القاهرة', nameEn: 'Cairo'}])), cities: vi.fn(() => of([])), areas: vi.fn(() => of([])) };
  beforeEach(async () => {
    vi.clearAllMocks();
    api.doctors.mockReturnValue(of(empty));
    TestBed.configureTestingModule({ imports: [PublicDoctors], providers: [provideRouter([]),
      { provide: PublicDiscoveryApi, useValue: api }, { provide: DoctorProfileApi, useValue: locations }] });
    TestBed.inject(LanguageService).setLanguage('ar');
    fixture = TestBed.createComponent(PublicDoctors);
    await fixture.whenStable();
  });
  afterEach(() => localStorage.removeItem('wasla_lang'));

  it('loads reference data and renders an empty search result', () => {
    expect(fixture.componentInstance).toBeTruthy();
    expect(locations.governorates).toHaveBeenCalledOnce();
    expect(api.specializations).toHaveBeenCalledOnce();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('لا توجد نتائج مطابقة');
  });
  it('changes language, direction and reference names', async () => {
    TestBed.inject(LanguageService).setLanguage('en');
    await fixture.whenStable();
    const element: HTMLElement = fixture.nativeElement;
    expect(element.querySelector('main')?.dir).toBe('ltr');
    expect(element.querySelector('h1')?.textContent).toContain('Find your doctor');
    expect(element.textContent).toContain('Cairo');
  });
  it('submits trimmed filters with the existing pagination contract', async () => {
    const element: HTMLElement = fixture.nativeElement;
    const input = element.querySelector<HTMLInputElement>('input[type="search"]')!;
    input.value='  Ahmed  ';
    input.dispatchEvent(new Event('input', { bubbles:true }));
    element.querySelector('form')!.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));
    await fixture.whenStable();
    expect(api.doctors).toHaveBeenLastCalledWith(expect.objectContaining({searchText:'Ahmed',pageNumber:1,pageSize:20}));
  });
  it('clears dependent location filters when the governorate changes', async () => {
    fixture.componentInstance['filters'].update(value=>({...value,cityId:'1028',areaId:'10280003'}));
    const select=(fixture.nativeElement as HTMLElement).querySelectorAll<HTMLSelectElement>('select')[1];
    select.value='1';
    select.dispatchEvent(new Event('change',{bubbles:true}));
    await fixture.whenStable();
    expect(locations.cities).toHaveBeenCalledWith(1);
    expect(fixture.componentInstance['filters']()).toMatchObject({governorateId:'1',cityId:'',areaId:''});
  });
  it('renders search errors and retries through the visible action', async () => {
    api.doctors.mockReturnValue(throwError(()=>new HttpErrorResponse({status:500})));
    await fixture.componentInstance['search']();
    await fixture.whenStable();
    expect((fixture.nativeElement as HTMLElement).querySelector('[role="alert"]')).not.toBeNull();
    api.doctors.mockReturnValue(of(empty));
    (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('.search-error button')!.click();
    await fixture.whenStable();
    expect((fixture.nativeElement as HTMLElement).querySelector('[role="alert"]')).toBeNull();
  });
  it('renders returned doctors and replaces a broken photo with a fallback', async () => {
    api.doctors.mockReturnValue(of({...empty,totalCount:1,items:[{doctorId:'doctor-1',nameAr:'د. أحمد',nameEn:'Dr. Ahmed',profileImageUrl:'/missing.png',specializations:[],practices:[]}]}));
    await fixture.componentInstance['search']();
    await fixture.whenStable();
    const element: HTMLElement=fixture.nativeElement;
    expect(element.querySelector('.doctor-result h3')?.textContent).toContain('د. أحمد');
    expect(element.querySelector('.doctor-heading a')?.getAttribute('href')).toBe('/doctors/doctor-1');
    element.querySelector('img')!.dispatchEvent(new Event('error'));
    await fixture.whenStable();
    expect(element.querySelector('.image-placeholder')).not.toBeNull();
    expect(element.querySelector<HTMLButtonElement>('.pagination button')?.disabled).toBe(true);
  });
});
