import { onDeactivated, onScopeDispose, ref, toValue, type MaybeRefOrGetter } from 'vue';
import type { AnswerReactions } from '../types/content';

export const REACTION_CHANCE = 0.33;
export const REACTION_DURATION_MS = 3000;

export function useAnswerReaction(messages: MaybeRefOrGetter<AnswerReactions | undefined>, random = Math.random) {
  const reaction = ref<string | null>(null);
  const portrait = ref<string | null>(null);
  let timer: ReturnType<typeof setTimeout> | undefined;
  function clearReaction(): void {
    if (timer !== undefined) clearTimeout(timer);
    timer = undefined;
    reaction.value = null;
    portrait.value = null;
  }
  function showReaction(correct: boolean): void {
    clearReaction();
    const options = toValue(messages)?.[correct ? 'success' : 'failure'];
    if (!options?.length || random() >= REACTION_CHANCE) return;
    reaction.value = options[Math.floor(random() * options.length)] ?? null;
    const portraits = toValue(messages)?.portraits;
    portrait.value = portraits?.length ? portraits[Math.floor(random() * portraits.length)] ?? null : 'assets/characters/red_hat.jpg';
    timer = setTimeout(clearReaction, REACTION_DURATION_MS);
  }
  onDeactivated(clearReaction);
  onScopeDispose(clearReaction);
  return { reaction, portrait, showReaction, clearReaction };
}
