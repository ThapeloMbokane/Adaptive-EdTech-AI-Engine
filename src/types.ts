export interface QuizQuestion {
  question: string;
  options: string[];
  correct: string;
  hint: string;
  scaffolded_step: string;
}

export interface LearningModule {
  remedial_text: string;
  advanced_text: string;
  quiz: QuizQuestion[];
}

export interface GenerationRequest {
  topic: string;
  documentText?: string;
}

export interface GenerationResponse {
  success: boolean;
  module?: LearningModule;
  error?: string;
}
