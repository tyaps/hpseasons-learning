import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clearContentCache } from '../src/composables/useContent';
import { ruleLocation } from '../src/domain/links';
import { mockFetch, mountAt } from './helpers';

const summaries = [
  { id: 'spells', title: 'Заклинания', section: 'Магия', order: 1, anchors: [] },
  { id: 'monster-01', title: 'Авгур', section: 'Монстробук', order: 1, anchors: [] },
  { id: 'monster-30', title: 'Карпатский Йети', section: 'Монстробук', order: 30, anchors: [] },
];

beforeEach(() => {
  clearContentCache();
  Element.prototype.scrollIntoView = vi.fn();
  mockFetch({ 'data/rules.json': summaries });
});
afterEach(() => vi.unstubAllGlobals());

describe('Монстробук', () => {
  it('отдельный каталог показывает только существ и фильтрует названия', async () => {
    const { wrapper } = await mountAt('/monsters');
    expect(wrapper.find('h1').text()).toBe('Монстробук');
    expect(wrapper.findAll('.monster-list a')).toHaveLength(2);
    await wrapper.find('[data-test="monster-search"]').setValue(' ЙЕТИ ');
    expect(wrapper.findAll('.monster-list a')).toHaveLength(1);
    expect(wrapper.find('.monster-list a').attributes('href')).toBe('/monsters/monster-30');
    await wrapper.find('[data-test="monster-search"]').setValue('нет такого');
    expect(wrapper.text()).toContain('Существа с таким названием не найдены');
  });

  it('обычный справочник не дублирует карточки существ', async () => {
    const { wrapper } = await mountAt('/rules');
    expect(wrapper.findAll('.rule-section li')).toHaveLength(1);
    expect(wrapper.find('.rule-section').text()).toContain('Заклинания');
  });

  it('карточка содержит текст, локальное изображение и навигацию в монстробук', async () => {
    mockFetch({ 'data/rules/monster-01.json': {
      ...summaries[1],
      anchors: [{ id: 'vulnerabilities', title: 'Уязвимости' }],
      html: '<img src="data/assets/monsters/image1.png" alt="Авгур"><h2 id="vulnerabilities">Уязвимости</h2><p>Биом и сценки оригинала.</p>',
    } });
    const { wrapper } = await mountAt('/monsters/monster-01?anchor=vulnerabilities');
    expect(wrapper.find('h1').text()).toBe('Авгур');
    expect(wrapper.find('.breadcrumbs a').attributes('href')).toBe('/monsters');
    expect(wrapper.find('.rule__body img').attributes('src')).toBe('data/assets/monsters/image1.png');
    expect(wrapper.find('.rule__body').text()).toContain('Биом и сценки оригинала');
    expect(wrapper.find('.toc a').attributes('href')).toBe('/monsters/monster-01?anchor=vulnerabilities');
    expect(Element.prototype.scrollIntoView).toHaveBeenCalled();
    expect(ruleLocation('monster-01#vulnerabilities')).toEqual({
      path: '/monsters/monster-01', query: { anchor: 'vulnerabilities' },
    });
  });

  it('неизвестное существо показывает «Не найдено»', async () => {
    const { wrapper } = await mountAt('/monsters/unknown');
    expect(wrapper.text()).toContain('Не найдено');
  });
});
