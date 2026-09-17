import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { LanguageService } from '../../../core/i18n/language.service';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { LanguageSwitcher } from '../../../shared/components/language-switcher/language-switcher';

export interface StorySlide {
  id: number;
  tag: string;
  title: string;
  description: string;
  image: string;
  imageAlt: string;
  benefits: { label: string }[];
}

@Component({
  selector: 'app-auth-layout',
  imports: [RouterOutlet, LanguageSwitcher, TranslatePipe],
  templateUrl: './auth-layout.html',
  styleUrl: './auth-layout.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AuthLayout implements OnInit {
  readonly langService = inject(LanguageService);
  private readonly destroyRef = inject(DestroyRef);
  private timerId: ReturnType<typeof setInterval> | null = null;

  readonly activeSlideIndex = signal(0);
  readonly isPaused = signal(false);

   get slides(): StorySlide[] { return [
    {
      id: 1,
      tag: this.langService.t('ui.full.208'),
      title: this.langService.t('ui.full.209'),
      description: this.langService.t('story.paragraph'),
      image: '/SVG-AVATAR/Online Doctor-pana.svg',
      imageAlt: this.langService.t('ui.full.210'),
      benefits: [
        { label: this.langService.t('auth.happierPatients') },
        { label: this.langService.t('ui.full.211') },
        { label: this.langService.t('auth.fasterCare') },
      ],
    },
    {
      id: 2,
      tag: this.langService.t('ui.full.212'),
      title: this.langService.t('ui.full.213'),
      description: this.langService.t('ui.full.214'),
      image: '/SVG-AVATAR/Doctors-pana.svg',
      imageAlt: this.langService.t('ui.full.215'),
      benefits: [
        { label: this.langService.t('auth.happierPatients') },
        { label: this.langService.t('ui.full.216') },
        { label: this.langService.t('auth.fasterCare') },
      ],
    },
    {
      id: 3,
      tag: this.langService.t('ui.full.217'),
      title: this.langService.t('ui.full.218'),
      description: this.langService.t('ui.full.219'),
      image: '/SVG-AVATAR/Medical prescription-pana.svg',
      imageAlt: this.langService.t('ui.full.220'),
      benefits: [
        { label: this.langService.t('ui.full.221') },
        { label: this.langService.t('ui.full.222') },
        { label: this.langService.t('ui.full.223') },
      ],
    },
    {
      id: 4,
      tag: this.langService.t('ui.full.224'),
      title: this.langService.t('ui.full.225'),
      description: this.langService.t('ui.full.226'),
      image: '/SVG-AVATAR/Medicine-pana.svg',
      imageAlt: this.langService.t('ui.full.227'),
      benefits: [
        { label: this.langService.t('ui.full.228') },
        { label: this.langService.t('ui.full.229') },
        { label: this.langService.t('ui.full.230') },
      ],
    },
  ]; }

  ngOnInit(): void {
    this.startAutoSlide();
    this.destroyRef.onDestroy(() => this.stopAutoSlide());
  }

  setSlide(index: number): void {
    this.activeSlideIndex.set(index);
    this.restartAutoSlide();
  }

  nextSlide(): void {
    this.activeSlideIndex.update((curr) => (curr + 1) % this.slides.length);
  }

  prevSlide(): void {
    this.activeSlideIndex.update((curr) => (curr - 1 + this.slides.length) % this.slides.length);
  }

  pauseRotation(): void {
    this.isPaused.set(true);
    this.stopAutoSlide();
  }

  resumeRotation(): void {
    this.isPaused.set(false);
    this.startAutoSlide();
  }

  private startAutoSlide(): void {
    if (this.timerId) return;
    this.timerId = setInterval(() => {
      if (!this.isPaused()) {
        this.nextSlide();
      }
    }, 5500);
  }

  private stopAutoSlide(): void {
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
  }

  private restartAutoSlide(): void {
    this.stopAutoSlide();
    this.startAutoSlide();
  }
}
