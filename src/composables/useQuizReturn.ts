import { inject, type InjectionKey } from 'vue';

export const quizReturnKey: InjectionKey<(event: MouseEvent) => void> = Symbol('quiz-return');

/** Only a regular in-app click can return to the attempt held by this app instance. */
export function useQuizReturn() {
  return inject(quizReturnKey, () => {});
}
