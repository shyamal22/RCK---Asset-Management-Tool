export type AnswerType = "condition" | "yes_no" | "text";
export type PrecheckFlag = "green" | "yellow" | "red";

export const CONDITION_OPTIONS = [
  { value: "fine", label: "Fine", tone: "green" },
  { value: "usable", label: "Usable", tone: "yellow" },
  { value: "broken", label: "Broken", tone: "red" },
] as const;

export const ANSWER_TYPE_LABELS: Record<AnswerType, string> = { condition: "Fine / Usable / Broken", yes_no: "Yes / No", text: "Write in" };

export const FLAG_LABELS: Record<PrecheckFlag, string> = { green: "All good", yellow: "Check soon", red: "Problem" };

/** How an answer reads back in a report. */
export function answerLabel(type: AnswerType, answer: string): string {
  if (type === "condition") return CONDITION_OPTIONS.find((o) => o.value === answer)?.label ?? answer;
  if (type === "yes_no") return answer === "yes" ? "Yes" : answer === "no" ? "No" : answer;
  return answer;
}

/** Same rules as submit_precheck (database): used to show the flag live while answering. */
export function flagFor(type: AnswerType, answer: string, problemAnswer: string | null): PrecheckFlag {
  if (type === "condition") return answer === "broken" ? "red" : answer === "usable" ? "yellow" : "green";
  if (type === "yes_no") return answer === problemAnswer ? "red" : "green";
  return "green";
}

export function worst(flags: PrecheckFlag[]): PrecheckFlag {
  return flags.includes("red") ? "red" : flags.includes("yellow") ? "yellow" : "green";
}
