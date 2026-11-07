import { onDeactivated, onScopeDispose, ref, toValue, type MaybeRefOrGetter } from 'vue';
import type { AnswerReactions } from '../types/content';

export const REACTION_CHANCE = 0.33;
export const REACTION_DURATION_MS = 3000;
/** После стольких подряд неудачных бросков следующий ответ обязан показать реплику (если набор не пуст). */
export const REACTION_PITY_AFTER_MISSES = 5;

export function shouldShowAnswerReaction(
  missesSinceLast: number,
  roll: number,
  chance = REACTION_CHANCE,
  pityAfter = REACTION_PITY_AFTER_MISSES,
): { show: boolean; missesNext: number } {
  if (missesSinceLast >= pityAfter) return { show: true, missesNext: 0 };
  if (roll < chance) return { show: true, missesNext: 0 };
  return { show: false, missesNext: missesSinceLast + 1 };
}

export function useAnswerReaction(messages: MaybeRefOrGetter<AnswerReactions | undefined>, random = Math.random) {
  const reaction = ref<string | null>(null);
  const portrait = ref<string | null>(null);
  let timer: ReturnType<typeof setTimeout> | undefined;
  let missesSinceLastReaction = 0;

  function clearReaction(): void {
    if (timer !== undefined) clearTimeout(timer);
    timer = undefined;
    reaction.value = null;
    portrait.value = null;
  }

  function resetReactionStreak(): void {
    missesSinceLastReaction = 0;
  }

  function showReaction(correct: boolean): void {
    clearReaction();
    const options = toValue(messages)?.[correct ? 'success' : 'failure'];
    if (!options?.length) return;
    const roll = shouldShowAnswerReaction(missesSinceLastReaction, random());
    missesSinceLastReaction = roll.missesNext;
    if (!roll.show) return;
    reaction.value = options[Math.floor(random() * options.length)] ?? null;
    const portraits = toValue(messages)?.portraits;
    portrait.value = portraits?.length ? portraits[Math.floor(random() * portraits.length)] ?? null : 'assets/characters/red_hat.jpg';
    timer = setTimeout(clearReaction, REACTION_DURATION_MS);
  }

  onDeactivated(clearReaction);
  onScopeDispose(clearReaction);
  return { reaction, portrait, showReaction, clearReaction, resetReactionStreak };
}
