import { Injectable, effect, inject, signal } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { RouterStateSnapshot, TitleStrategy } from '@angular/router';
import { LanguageService } from './language.service';

/** Route titles use dictionary keys and follow language changes without navigation. */
@Injectable()
export class LocalizedTitleStrategy extends TitleStrategy {
  private readonly title = inject(Title);
  private readonly language = inject(LanguageService);
  private readonly currentKey = signal('common.brand');

  constructor() {
    super();
    effect(() => this.title.setTitle(this.language.t(this.currentKey())));
  }

  override updateTitle(snapshot: RouterStateSnapshot): void {
    const key = this.buildTitle(snapshot);
    if (key !== undefined) this.currentKey.set(key);
  }
}
