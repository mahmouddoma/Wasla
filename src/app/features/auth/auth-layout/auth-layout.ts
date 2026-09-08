import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';

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
  imports: [RouterLink, RouterOutlet],
  templateUrl: './auth-layout.html',
  styleUrl: './auth-layout.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AuthLayout implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private timerId: ReturnType<typeof setInterval> | null = null;

  readonly activeSlideIndex = signal(0);
  readonly isPaused = signal(false);

  readonly slides: StorySlide[] = [
    {
      id: 1,
      tag: 'استشارات ورعاية متصلة',
      title: 'رعاية صحية ذكية\nبين يديك على مدار الساعة.',
      description: 'تواصل مع نخبة المتخصصين، وشارك تاريخك الطبي ومتابع رعايتك بسهولة وأمان.',
      image: '/SVG-AVATAR/Online Doctor-pana.svg',
      imageAlt: 'استشارة طبية فورية وتواصل مباشر',
      benefits: [
        { label: 'مرضى أكثر سعادة' },
        { label: 'بيانات أكثر أماناً' },
        { label: 'خدمات أسرع ورعاية أفضل' },
      ],
    },
    {
      id: 2,
      tag: 'سجل صحي رقمي موحد',
      title: 'تاريخك الطبي مستمر،\nأينما كانت رعايتك.',
      description: 'نربط المريض والطبيب وفريق الرعاية في ملف صحي موحد وآمن أينما ذهبت.',
      image: '/SVG-AVATAR/Doctors-pana.svg',
      imageAlt: 'أطباء وفريق الرعاية الصحية في وصلة',
      benefits: [
        { label: 'مرضى أكثر سعادة' },
        { label: 'بيانات أكثر أمانًا' },
        { label: 'خدمات أسرع ورعاية أفضل' },
      ],
    },
    {
      id: 3,
      tag: 'أمان وسلامة دوائية',
      title: 'روشتات إلكترونية\nوفحوصات منظمة بدقة.',
      description: 'سجل وصفاتك الدوائية وتحاليلك في مكان واحد، لتجنب التضارب الدوائي وحماية صحتك.',
      image: '/SVG-AVATAR/Medical prescription-pana.svg',
      imageAlt: 'روشتات ووصفات علاجية رقمية',
      benefits: [
        { label: 'وصفات إلكترونية آمنة' },
        { label: 'تحاليل منظمة' },
        { label: 'تجنب التضارب الدوائي' },
      ],
    },
    {
      id: 4,
      tag: 'متابعة دورية مستمرة',
      title: 'خطط علاجية مخصصة\nورحلة شفاء متكاملة.',
      description: 'ذكاء تنظيمي يساعدك على الالتزام بالعلاج ومتابعة مؤشراتك الحيوية بانتظام.',
      image: '/SVG-AVATAR/Medicine-pana.svg',
      imageAlt: 'متابعة دورية وتكامل علاجي',
      benefits: [
        { label: 'خطة علاج شخصية' },
        { label: 'تذكير بالأدوية' },
        { label: 'مؤشرات حيوية لحظية' },
      ],
    },
  ];

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
