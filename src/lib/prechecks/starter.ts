import type { AnswerType } from "./labels";

export type DraftItem = { question: string; answer_type: AnswerType; problem_answer: "yes" | "no" | null; photo_required: boolean; help: string };

/** A sensible first list for plant pre-starts; the builder edits it before saving. */
export const STARTER_ITEMS: DraftItem[] = [
  { question: "Tyres / tracks", answer_type: "condition", problem_answer: null, photo_required: true, help: "" },
  { question: "Any oil, fuel or hydraulic leaks?", answer_type: "yes_no", problem_answer: "yes", photo_required: false, help: "" },
  { question: "Fluid levels (engine oil, coolant, hydraulic)", answer_type: "condition", problem_answer: null, photo_required: false, help: "" },
  { question: "Lights, beacon and reversing alarm work?", answer_type: "yes_no", problem_answer: "no", photo_required: false, help: "" },
  { question: "Brakes and steering", answer_type: "condition", problem_answer: null, photo_required: false, help: "" },
  { question: "Seatbelt and ROPS/FOPS", answer_type: "condition", problem_answer: null, photo_required: false, help: "" },
  { question: "Fire extinguisher present and charged?", answer_type: "yes_no", problem_answer: "no", photo_required: false, help: "" },
  { question: "New damage?", answer_type: "yes_no", problem_answer: "yes", photo_required: false, help: "" },
];
