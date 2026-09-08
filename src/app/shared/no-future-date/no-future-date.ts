import { Directive } from '@angular/core';

@Directive({
  selector: 'input[type="date"][appNoFutureDate]',
  host: { '[attr.max]': 'today' },
})
export class NoFutureDate {
  protected readonly today = new Date().toISOString().slice(0, 10);
}
