import { ActivatedRoute, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { DoctorPracticesApi } from '../../../../domains/doctor-practices';
import { FinanceApi } from '../../../../domains/finance';
import { ReceptionPracticeContext } from '../../../../domains/reception-practices';
import { FinanceWorkspace } from './finance-workspace';
import { ComponentFixture, TestBed } from '@angular/core/testing';

describe('FinanceWorkspace', () => {
  let fixture: ComponentFixture<FinanceWorkspace>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { data: { actor: 'Patient' }, queryParamMap: { get: () => null } },
          },
        },
        {
          provide: FinanceApi,
          useValue: {
            myTransactions: () => of({ items: [], totalCount: 0, pageNumber: 1, pageSize: 20 }),
          },
        },
        { provide: DoctorPracticesApi, useValue: { list: () => of([]) } },
        {
          provide: ReceptionPracticeContext,
          useValue: {
            refresh: async () => undefined,
            practices: () => [],
            select: () => undefined,
          },
        },
      ],
    });
    fixture = TestBed.createComponent(FinanceWorkspace);
  });

  it('renders an accessible empty financial history', async () => {
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('h1')?.textContent).toBeTruthy();
    expect(fixture.nativeElement.querySelector('table')).toBeTruthy();
  });
});
