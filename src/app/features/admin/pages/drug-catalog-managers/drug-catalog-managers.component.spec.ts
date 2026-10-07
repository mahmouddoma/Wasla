import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError, Subject } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthSession } from '../../../../core/auth/auth-session';
import { LanguageService } from '../../../../core/i18n/language.service';
import { ToastService } from '../../../../core/notifications/toast.service';
import { DrugCatalogManagersApi } from '../../services/drug-catalog-managers/drug-catalog-managers-api';
import { DrugCatalogManagersComponent } from './drug-catalog-managers.component';
const account = {
  id: 'm1',
  userName: 'Synthetic manager',
  email: 'test@example.invalid',
  phoneNumber: null,
  isActive: true,
  isFirstLogin: true,
};
describe('Drug catalog manager governance UI', () => {
  let fixture: ComponentFixture<DrugCatalogManagersComponent>,
    component: DrugCatalogManagersComponent;
  let actor: string, permissions: Set<string>;
  const api = {
    list: vi.fn(),
    details: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    activate: vi.fn(),
    deactivate: vi.fn(),
  };
  const toast = { success: vi.fn(), error: vi.fn() };
  beforeEach(async () => {
    vi.resetAllMocks();
    actor = 'SuperAdmin';
    permissions = new Set(
      ['ViewAll', 'ViewDetails', 'Create', 'Update', 'Activate', 'Deactivate'].map(
        (a) => 'DrugCatalogManagers.' + a,
      ),
    );
    api.list.mockReturnValue(of({ items: [account], totalCount: 1, pageNumber: 1, pageSize: 20 }));
    api.details.mockReturnValue(of(account));
    TestBed.configureTestingModule({
      imports: [DrugCatalogManagersComponent],
      providers: [
        provideRouter([]),
        { provide: DrugCatalogManagersApi, useValue: api },
        { provide: ToastService, useValue: toast },
        {
          provide: AuthSession,
          useValue: {
            user: () => ({ userType: actor }),
            hasPermission: (p: string) => permissions.has(p),
          },
        },
      ],
    });
    TestBed.overrideComponent(DrugCatalogManagersComponent, {
      set: { providers: [{ provide: DrugCatalogManagersApi, useValue: api }] },
    });
    TestBed.inject(LanguageService).setLanguage('en');
    fixture = TestBed.createComponent(DrugCatalogManagersComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });
  afterEach(() => localStorage.removeItem('wasla_lang'));
  it('renders dedicated accounts and opens details in the shared drawer from the table', async () => {
    expect(component).toBeTruthy();
    expect(fixture.nativeElement.textContent).toContain(account.userName);
    fixture.nativeElement.querySelector('tbody button').click();
    await fixture.whenStable();
    expect(api.details).toHaveBeenCalledWith('m1');
    expect(fixture.nativeElement.querySelector('[role="dialog"]')).toBeTruthy();
    expect(fixture.nativeElement.textContent).toContain('password must be changed');
  });
  it('sends server search and renders an illustrated empty state', async () => {
    api.list.mockReturnValue(of({ items: [], totalCount: 0, pageNumber: 1, pageSize: 20 }));
    const input: HTMLInputElement = fixture.nativeElement.querySelector('input[type="search"]');
    input.value = 'another';
    input.dispatchEvent(new Event('change'));
    await fixture.whenStable();
    expect(api.list).toHaveBeenLastCalledWith('another', 1);
    expect(fixture.nativeElement.querySelector('.state-empty-illustration')).toBeTruthy();
  });
  it('denies account operations to managers and non-root accounts lacking governance permissions', async () => {
    actor = 'DrugCatalogManager';
    component.create();
    await component.load();
    expect(component.opened()).toBe(false);
    expect(api.create).not.toHaveBeenCalled();
    actor = 'SuperAdmin';
    permissions.clear();
    await component.inspect('m1');
    expect(api.details).not.toHaveBeenCalled();
  });
  it('validates password confirmation and clears temporary credentials after creation', async () => {
    component.create();
    component.form.setValue({
      userName: 'new',
      email: 'new@example.invalid',
      phoneNumber: '',
      initialPassword: 'Example123!',
      confirmPassword: 'different',
    });
    await component.save();
    expect(api.create).not.toHaveBeenCalled();
    component.form.controls.confirmPassword.setValue('Example123!');
    api.create.mockReturnValue(of(account));
    await component.save();
    expect(api.create).toHaveBeenCalledWith({
      userName: 'new',
      email: 'new@example.invalid',
      phoneNumber: null,
      initialPassword: 'Example123!',
      confirmPassword: 'Example123!',
    });
    expect(component.form.getRawValue().initialPassword).toBe('');
    expect(toast.success).toHaveBeenCalledWith('medications.saved');
  });
  it('requires confirmation and replaces account state after deactivation', async () => {
    await component.inspect('m1');
    await component.changeActive();
    expect(api.deactivate).not.toHaveBeenCalled();
    component.confirmAction('deactivate');
    api.deactivate.mockReturnValue(of({ ...account, isActive: false }));
    await component.changeActive();
    expect(component.detail()?.isActive).toBe(false);
    expect(component.detail()?.isFirstLogin).toBe(true);
    expect(toast.success).toHaveBeenCalled();
  });
  it('renders API validation errors with error toast and blocks duplicate saves', async () => {
    await component.inspect('m1');
    component.edit();
    api.update.mockReturnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 422,
            error: { errors: { email: ['Email already used'] } },
          }),
      ),
    );
    await component.save();
    expect(toast.error).toHaveBeenCalledWith('Email already used');
    expect(component.messages()).toContain('Email already used');
    const pending = new Subject<typeof account>();
    api.update.mockReturnValue(pending);
    const save = component.save();
    await component.save();
    expect(api.update).toHaveBeenCalledTimes(2);
    pending.next(account);
    pending.complete();
    await save;
  });
  it('shows translated labels and direction in Arabic', async () => {
    TestBed.inject(LanguageService).setLanguage('ar');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('main').getAttribute('dir')).toBe('rtl');
    expect(fixture.nativeElement.textContent).toContain('مسؤولو دليل الأدوية');
  });
});
