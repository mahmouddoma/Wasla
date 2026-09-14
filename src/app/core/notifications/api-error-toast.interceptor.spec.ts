import {
  HttpClient,
  HttpErrorResponse,
  provideHttpClient,
  withInterceptors,
} from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { apiErrorToastInterceptor } from './api-error-toast.interceptor';
import { ToastService } from './toast.service';

describe('apiErrorToastInterceptor', () => {
  let http: HttpTestingController;
  let toast: ToastService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([apiErrorToastInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpTestingController);
    toast = TestBed.inject(ToastService);
  });

  afterEach(() => {
    for (const message of toast.messages()) toast.dismiss(message.id);
    http.verify();
  });

  it('shows general and field API errors without duplicates', async () => {
    const response = firstValueFrom(TestBed.inject(HttpClient).post('/api/example', {}));
    http.expectOne('/api/example').flush(
      {
        errors: [
          { message: 'تعذر إكمال الطلب.', source: null },
          { message: 'اسم المستخدم مطلوب.', source: 'identifier' },
          { message: 'تعذر إكمال الطلب.', source: null },
        ],
      },
      { status: 400, statusText: 'Bad Request' },
    );

    await expect(response).rejects.toBeInstanceOf(HttpErrorResponse);
    expect(toast.messages().map(({ message }) => message)).toEqual([
      'تعذر إكمال الطلب.',
      'اسم المستخدم مطلوب.',
    ]);
    expect(toast.messages().every(({ kind }) => kind === 'error')).toBe(true);
  });
});
