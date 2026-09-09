import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export type PageHeaderIcon = 'doctors' | 'admins' | 'roles' | 'specializations' | 'requests';

@Component({
  selector: 'app-page-header',
  templateUrl: './page-header.html',
  styleUrl: './page-header.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PageHeader {
  readonly heading = input.required<string>();
  readonly description = input.required<string>();
  readonly icon = input.required<PageHeaderIcon>();
}
