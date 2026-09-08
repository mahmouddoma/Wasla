import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { parseApiErrors } from '../../../core/auth/api-errors';
import { SuperAdminsApi } from '../../../core/superadmins/superadmins-api';
import { SuperAdminForm, SuperAdminFormSubmission } from '../superadmin-form/superadmin-form';

@Component({
  selector: 'app-superadmin-create',
  imports: [RouterLink, SuperAdminForm],
  templateUrl: './superadmin-create.html',
  styleUrl: './superadmin-create.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SuperAdminCreate {
  private readonly api = inject(SuperAdminsApi);
  private readonly router = inject(Router);
  protected readonly isSubmitting = signal(false);
  protected readonly apiMessages = signal<string[]>([]);
  protected readonly fieldErrors = signal<Readonly<Record<string, string[]>>>({});

  protected async create(submission: SuperAdminFormSubmission): Promise<void> {
    if (submission.mode !== 'create' || this.isSubmitting()) return;
    this.isSubmitting.set(true);
    this.apiMessages.set([]);
    this.fieldErrors.set({});
    try {
      const created = await firstValueFrom(this.api.create(submission.request));
      await this.router.navigate(['/admin/superadmins', created.superAdminId], {
        queryParams: { status: 'created' },
      });
    } catch (error) {
      const parsed = parseApiErrors(error);
      this.apiMessages.set(parsed.messages);
      this.fieldErrors.set(parsed.fields);
    } finally {
      this.isSubmitting.set(false);
    }
  }
}
