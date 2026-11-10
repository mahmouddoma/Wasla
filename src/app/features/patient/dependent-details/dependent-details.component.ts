import {
  ChangeDetectionStrategy,
  Component,
  OnChanges,
  OnDestroy,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { Observable, firstValueFrom } from 'rxjs';
import {
  DependentActiveTicket,
  DependentProfile,
  DependentTicket,
  FamilyWorkspaceApi,
  FamilyWorkspaceChild,
} from '../../../domains/families';
import { PatientContact, UpsertPatientContactRequest } from '../../../domains/patients';
import {
  FinanceApi,
  FinancialTransactionItem,
  PaymentReceipt,
  RefundReceipt,
} from '../../../domains/finance';
import { LanguageService } from '../../../core/i18n/language.service';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { ToastService } from '../../../core/notifications/toast.service';
import { createIdempotencyKey } from '../../../core/http/create-idempotency-key';
import { HistoricalDocumentsComponent } from '../historical-documents/historical-documents.component';

@Component({
  selector: 'app-dependent-details',
  imports: [FormsModule, CurrencyPipe, DatePipe, TranslatePipe, HistoricalDocumentsComponent],
  templateUrl: './dependent-details.component.html',
  styleUrl: './dependent-details.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DependentDetailsComponent implements OnChanges, OnDestroy {
  readonly child = input.required<FamilyWorkspaceChild>();
  readonly initialTab = input<'profile' | 'tickets' | 'transactions' | 'documents'>('profile');
  readonly invalidated = output<void>();
  readonly busyChanged = output<boolean>();
  readonly language = inject(LanguageService);
  private readonly api = inject(FamilyWorkspaceApi);
  private readonly finance = inject(FinanceApi);
  private readonly toast = inject(ToastService);
  readonly tab = signal<'profile' | 'tickets' | 'transactions' | 'documents'>('profile');
  readonly profile = signal<DependentProfile | null>(null);
  readonly tickets = signal<DependentActiveTicket[]>([]);
  readonly ticket = signal<DependentTicket | null>(null);
  readonly transactions = signal<readonly FinancialTransactionItem[]>([]);
  readonly receipt = signal<PaymentReceipt | RefundReceipt | null>(null);
  readonly photoUrl = signal<string | null>(null);
  readonly loading = signal(false);
  readonly failed = signal(false);
  readonly busy = signal(false);
  readonly editing = signal(false);
  readonly deleting = signal<PatientContact | null>(null);
  readonly page = signal(1);
  readonly total = signal(0);
  phoneNumber = '';
  contactId: string | null = null;
  contact = this.emptyContact();
  private generation = 0;
  private transactionsSequence = 0;
  private receiptSequence = 0;
  private intent: { signature: string; key: string } | null = null;
  ngOnChanges(): void {
    this.generation++;
    this.reset();
    void this.selectTab(this.initialTab());
  }
  ngOnDestroy(): void {
    ++this.transactionsSequence;
    ++this.receiptSequence;
    this.generation++;
    this.revokePhoto();
  }
  async selectTab(tab: 'profile' | 'tickets' | 'transactions' | 'documents'): Promise<void> {
    const child = this.child();
    if (
      (tab === 'profile' && !child.canViewProfile) ||
      (tab === 'tickets' && !child.canViewTicket) ||
      (tab === 'transactions' && !child.canViewTransactions) ||
      (tab === 'documents' &&
        !child.canViewHistoricalDocuments &&
        !child.canUploadHistoricalDocument)
    )
      return;
    this.tab.set(tab);
    this.loading.set(true);
    this.failed.set(false);
    this.profile.set(null);
    this.tickets.set([]);
    this.transactions.set([]);
    this.receipt.set(null);
    this.ticket.set(null);
    this.revokePhoto();
    const generation = ++this.generation;
    try {
      if (tab === 'profile') {
        const profile = await firstValueFrom(this.api.profile(child.patientId));
        if (generation === this.generation) {
          this.profile.set(profile);
          this.phoneNumber = profile.phoneNumber ?? '';
        }
        if (profile.hasProfileImage && generation === this.generation) {
          try {
            const image = await firstValueFrom(this.api.profileImage(child.patientId));
            if (image.body && generation === this.generation)
              this.photoUrl.set(URL.createObjectURL(image.body));
          } catch (error) {
            if (
              error instanceof HttpErrorResponse &&
              error.status !== 404 &&
              generation === this.generation
            )
              this.fail(error);
          }
        }
      } else if (tab === 'tickets') {
        const tickets = await firstValueFrom(this.api.activeTickets(child.patientId));
        if (generation === this.generation) this.tickets.set(tickets);
      } else if (tab === 'transactions') {
        await this.loadTransactions(1);
      }
    } catch (error) {
      if (generation === this.generation) this.fail(error);
    } finally {
      if (generation === this.generation) this.loading.set(false);
    }
  }
  async refreshContacts(): Promise<void> {
    const profile = this.profile();
    if (!profile || !this.child().canViewProfile) return;
    const generation = this.generation;
    try {
      const value = await firstValueFrom(this.api.contacts(this.child().patientId));
      if (generation === this.generation) this.profile.set({ ...profile, ...value });
    } catch (error) {
      if (generation === this.generation) this.fail(error);
    }
  }
  editContact(contact?: PatientContact): void {
    if (!this.child().canManageContacts) return;
    this.contactId = contact?.contactId ?? null;
    this.contact = contact
      ? {
          nameAr: contact.nameAr,
          nameEn: contact.nameEn,
          phoneNumber: contact.phoneNumber,
          relationshipType: contact.relationshipType,
          linkedPatientId: contact.linkedPatientId,
          isPrimary: contact.isPrimary,
        }
      : this.emptyContact();
    this.intent = null;
    this.editing.set(true);
  }
  async saveContact(): Promise<void> {
    const profile = this.profile();
    if (
      !profile ||
      !this.child().canManageContacts ||
      !this.contact.nameAr.trim() ||
      !this.contact.phoneNumber.trim()
    )
      return;
    await this.mutate(
      (key) =>
        this.contactId
          ? this.api.updateContact(
              this.child().patientId,
              this.contactId,
              profile.rowVersion,
              this.contact,
              key,
            )
          : this.api.addContact(this.child().patientId, profile.rowVersion, this.contact, key),
      ['contact', this.contactId, this.contact, profile.rowVersion],
    );
  }
  async deleteContact(): Promise<void> {
    const profile = this.profile(),
      contact = this.deleting();
    if (!profile || !contact || !this.child().canManageContacts) return;
    await this.mutate(
      (key) =>
        this.api.deleteContact(this.child().patientId, contact.contactId, profile.rowVersion, key),
      ['delete', contact.contactId, profile.rowVersion],
    );
  }
  async savePhone(): Promise<void> {
    const profile = this.profile();
    if (!profile || !this.child().canManageContacts) return;
    await this.mutate(
      (key) =>
        this.api.updatePhone(
          this.child().patientId,
          profile.rowVersion,
          this.phoneNumber.trim() || null,
          key,
        ),
      ['phone', this.phoneNumber.trim(), profile.rowVersion],
    );
  }
  async updatePhoto(event: Event): Promise<void> {
    const file = (event.target as HTMLInputElement).files?.[0],
      profile = this.profile();
    if (!file || !profile || !this.child().canManagePhoto) return;
    if (
      !['image/jpeg', 'image/png'].includes(file.type) ||
      file.size > 10 * 1024 * 1024 ||
      !file.size
    ) {
      this.toast.error(this.language.t('familyFlow.photoInvalid'));
      return;
    }
    await this.mutate(
      (key) => this.api.updatePhoto(this.child().patientId, profile.rowVersion, file, key),
      ['photo', file.name, file.size, file.lastModified, profile.rowVersion],
    );
  }
  async inspectTicket(id: string): Promise<void> {
    if (!this.child().canViewTicket) return;
    const generation = this.generation;
    this.ticket.set(null);
    try {
      const result = await firstValueFrom(this.api.ticket(this.child().patientId, id));
      if (generation === this.generation) this.ticket.set(result);
    } catch (error) {
      if (generation === this.generation) this.fail(error);
    }
  }
  async loadTransactions(page: number): Promise<void> {
    if (!this.child().canViewTransactions) return;
    const generation = this.generation;
    const sequence = ++this.transactionsSequence;
    ++this.receiptSequence;
    this.transactions.set([]);
    this.receipt.set(null);
    try {
      const result = await firstValueFrom(
        this.finance.dependentTransactions(this.child().patientId, {
          pageNumber: page,
          pageSize: 20,
        }),
      );
      if (generation === this.generation && sequence === this.transactionsSequence) {
        this.transactions.set(result.items);
        this.page.set(page);
        this.total.set(result.totalCount);
      }
    } catch (error) {
      if (generation === this.generation && sequence === this.transactionsSequence) this.fail(error);
    }
  }
  async openReceipt(item: FinancialTransactionItem): Promise<void> {
    if (!this.child().canViewReceipts) return;
    this.receipt.set(null);
    const generation = this.generation;
    const sequence = ++this.receiptSequence;
    try {
      const result =
        item.transactionType === 'Refund'
          ? await firstValueFrom(
              this.finance.dependentRefundReceipt(this.child().patientId, item.transactionId),
            )
          : await firstValueFrom(
              this.finance.dependentPaymentReceipt(this.child().patientId, item.transactionId),
            );
      if (generation === this.generation && sequence === this.receiptSequence) this.receipt.set(result);
    } catch (error) {
      if (generation === this.generation && sequence === this.receiptSequence) this.fail(error);
    }
  }
  private async mutate(
    action: (key: string) => Observable<unknown>,
    payload: unknown,
  ): Promise<void> {
    if (this.busy()) return;
    const signature = JSON.stringify([this.child().patientId, payload]);
    if (this.intent?.signature !== signature)
      this.intent = { signature, key: createIdempotencyKey() };
    this.busy.set(true);
    this.busyChanged.emit(true);
    const generation = this.generation;
    try {
      await firstValueFrom(action(this.intent.key));
      if (generation !== this.generation) return;
      this.toast.success(this.language.t('familyFlow.saved'));
      this.editing.set(false);
      this.deleting.set(null);
      this.intent = null;
      await this.selectTab('profile');
    } catch (error) {
      if (generation === this.generation) this.fail(error);
    } finally {
      this.busy.set(false);
      this.busyChanged.emit(false);
    }
  }
  private fail(error: unknown): void {
    this.failed.set(true);
    this.toast.error(
      this.language.t(
        error instanceof HttpErrorResponse && error.status === 409
          ? 'familyFlow.conflict'
          : 'familyFlow.failed',
      ),
    );
    if (error instanceof HttpErrorResponse && [401, 403, 404, 409].includes(error.status)) {
      this.reset();
      this.invalidated.emit();
    }
  }
  private reset(): void {
    ++this.transactionsSequence;
    ++this.receiptSequence;
    this.profile.set(null);
    this.tickets.set([]);
    this.ticket.set(null);
    this.transactions.set([]);
    this.receipt.set(null);
    this.editing.set(false);
    this.deleting.set(null);
    this.revokePhoto();
  }
  private revokePhoto(): void {
    const url = this.photoUrl();
    if (url) URL.revokeObjectURL(url);
    this.photoUrl.set(null);
  }
  private emptyContact(): UpsertPatientContactRequest {
    return {
      nameAr: '',
      nameEn: null,
      phoneNumber: '',
      relationshipType: 'Father',
      linkedPatientId: null,
      isPrimary: false,
    };
  }
}
