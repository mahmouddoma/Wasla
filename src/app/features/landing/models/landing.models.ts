export type HeroPreviewTab = 'dashboard' | 'queue' | 'encounter';
export type JourneyStageId = 'before' | 'during' | 'after';
export type DemoModeId = 'appointments' | 'queue' | 'clinical' | 'finance';
export type RoleTabId = 'doctor' | 'reception' | 'patient';
export type ClinicalSubTabId = 'notes' | 'rx' | 'labs';

export interface WhyWaslaBenefit {
  readonly id: string;
  readonly iconClass: string;
  readonly titleKey: string;
  readonly descKey: string;
}

export interface HowItWorksStep {
  readonly num: string;
  readonly titleKey: string;
  readonly descKey: string;
  readonly actionKey: string;
  readonly outcomeKey: string;
  readonly iconClass: string;
}

export interface JourneyStage {
  readonly id: JourneyStageId;
  readonly numKey: string;
  readonly tabKey: string;
  readonly titleKey: string;
  readonly descKey: string;
  readonly bulletKeys: readonly string[];
  readonly mockCardTitleKey: string;
  readonly mockItems: readonly {
    readonly code: string;
    readonly labelKey: string;
  }[];
}

export interface EditorialFeatureStory {
  readonly id: string;
  readonly tagKey: string;
  readonly titleKey: string;
  readonly problemKey: string;
  readonly solutionKey: string;
  readonly outcomeKey: string;
  readonly previewTitleKey: string;
  readonly previewRowKeys: readonly string[];
  readonly iconClass: string;
  readonly reversed?: boolean;
}

export interface RoleSummary {
  readonly id: RoleTabId;
  readonly titleKey: string;
  readonly badgeKey: string;
  readonly scopeKey: string;
  readonly pointKeys: readonly string[];
  readonly iconClass: string;
}

export interface DemoAppointment {
  readonly id: string;
  readonly ticketNumber: number;
  readonly timeDisplay: string;
  readonly patientNameKey: string;
  readonly visitTypeKey: string;
  readonly stageKey: string;
  readonly stageTone: 'neutral' | 'teal' | 'navy' | 'success';
  readonly doctorViewKey: string;
  readonly receptionViewKey: string;
  readonly patientViewKey: string;
}

export interface DemoQueueTicket {
  readonly id: string;
  readonly ticketNumber: number;
  readonly patientNameKey: string;
  readonly visitTypeKey: string;
  readonly state: 'done' | 'serving' | 'waiting';
}

export interface FaqAccordionItem {
  readonly id: string;
  readonly questionKey: string;
  readonly answerKey: string;
}
