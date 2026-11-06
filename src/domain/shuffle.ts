/** Возвращает перемешанную копию массива (Фишер — Йетс). Исходный массив не меняется. */
export function shuffle<T>(items: readonly T[], rnd: () => number = Math.random): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
