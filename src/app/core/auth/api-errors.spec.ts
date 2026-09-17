import { HttpErrorResponse } from '@angular/common/http';
import { parseApiErrors } from './api-errors';

describe('parseApiErrors', () => {
  it('reads ASP.NET validation dictionaries without throwing', () => {
    const result = parseApiErrors(
      new HttpErrorResponse({
        status: 400,
        error: {
          title: 'One or more validation errors occurred.',
          errors: { PermissionIds: ['The PermissionIds field is required.'] },
        },
      }),
    );
    expect(result.fields).toEqual({ permissionids: ['The PermissionIds field is required.'] });
    expect(result.messages).toEqual([]);
    expect(result.status).toBe(400);
  });

  it('preserves structured error codes, field errors and general messages', () => {
    const result = parseApiErrors(
      new HttpErrorResponse({
        status: 409,
        error: {
          errors: [
            { code: 'CONFLICT', message: 'Already assigned.' },
            {
              code: 'INVALID_PERMISSION',
              source: 'request.PermissionIds',
              message: 'Invalid permission.',
            },
          ],
        },
      }),
    );
    expect(result.codes).toEqual(['CONFLICT', 'INVALID_PERMISSION']);
    expect(result.messages).toEqual(['Already assigned.']);
    expect(result.fields).toEqual({ permissionids: ['Invalid permission.'] });
  });

  it('returns a language-independent fallback key for network errors', () => {
    expect(parseApiErrors(new HttpErrorResponse({ status: 0 })).messages).toEqual(['errors.network']);
  });
});
