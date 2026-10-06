import { ChangeDetectionStrategy, Component, inject } from "@angular/core";
import { RouterLink } from "@angular/router";
import { LanguageService } from "../../../../core/i18n/language.service";
import { TranslatePipe } from "../../../../core/i18n/translate.pipe";
import { LanguageSwitcher } from "../../../../shared/components/language-switcher/language-switcher";

@Component({
  selector: "app-privacy-policy",
  standalone: true,
  imports: [RouterLink, TranslatePipe, LanguageSwitcher],
  templateUrl: "./privacy-policy.component.html",
  styleUrls: ["../../legal-navigation.css", "./privacy-policy.component.css"],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PrivacyPolicyComponent {
  readonly language = inject(LanguageService);
}
