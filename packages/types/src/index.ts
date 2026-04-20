export type AuthUser = {
  id: string;
  email: string;
  createdAt: string;
};

export type Deck = {
  id: string;
  title: string;
  description: string | null;
  userId: string;
  createdAt: string;
  flashcardCount?: number;
  progress?: DeckProgress;
  taxonomySummary?: DeckTaxonomySummary;
  teacherNotes?: TeacherNotes | null;
};

export type DeckProgress = {
  total: number;
  mastered: number;
  learning: number;
  new: number;
  reviewsNeeded: number;
};

export type Flashcard = {
  id: string;
  question: string;
  answer: string;
  cardType: FlashcardCardType;
  context: string;
  difficulty: number;
  interval: number;
  easeFactor: number;
  nextReview: string;
  deckId: string;
};

export type ReviewRating = 0 | 1 | 2 | 3 | 4 | 5;

export type StudyData = {
  id: string;
  userId: string;
  flashcardId: string;
  reviewCount: number;
  easeFactor: number;
  interval: number;
  nextReviewDate: string;
  lastReviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type StudyQueueCard = Flashcard & {
  deck: Pick<Deck, 'id' | 'title'>;
  studyData: StudyData | null;
  queueType: 'due' | 'new';
};

export const FLASHCARD_CARD_TYPES = [
  'Concept',
  'Definition',
  'Relationship',
  'Edge_Case',
  'Worked_Example',
] as const;

export type FlashcardCardType = (typeof FLASHCARD_CARD_TYPES)[number];

export type GeneratedFlashcard = {
  cardType: FlashcardCardType;
  front: string;
  back: string;
  context: string;
};

export type DeckTaxonomySummary = Record<FlashcardCardType, number>;

export type TeacherNotes = {
  overview: string;
  keyIdeas: string[];
  detailedNotes: string[];
  misconceptions: string[];
  workedExamples: string[];
  examCues: string[];
};

export type PdfSemanticChunk = {
  id: string;
  sequence: number;
  heading: string | null;
  text: string;
  contextSnippet: string;
  wordCount: number;
  sourceStartWord: number;
  sourceEndWord: number;
};

export const UPLOAD_PROGRESS_STAGES = [
  'queued',
  'parsing_pdf',
  'planning_concepts',
  'crafting_cards',
  'finalizing_deck',
  'completed',
  'failed',
] as const;

export type UploadProgressStage = (typeof UPLOAD_PROGRESS_STAGES)[number];

export type UploadProgress = {
  uploadId: string;
  stage: UploadProgressStage;
  message: string;
  progressPercent: number;
  updatedAt: string;
  error?: string;
};

export type ApiEnvelope<T> = {
  data: T;
};

export type ApiError = {
  message: string;
  issues?: unknown;
};
