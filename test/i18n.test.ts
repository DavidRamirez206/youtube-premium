import { afterEach, describe, expect, it, vi } from 'vitest';
import { configKeys, configWrite } from '../src/core/config.js';
import { currentLanguage, onLanguageChange, t } from '../src/core/i18n';

describe('i18n', () => {
  afterEach(() => {
    configWrite('language', 'auto');
    vi.restoreAllMocks();
  });

  it('follows the system language when set to automatic', () => {
    vi.spyOn(navigator, 'language', 'get').mockReturnValue('es-CO');
    expect(currentLanguage()).toBe('es');
    vi.spyOn(navigator, 'language', 'get').mockReturnValue('fr-FR');
    expect(currentLanguage()).toBe('en');
  });

  it('uses the chosen language over the system one', () => {
    vi.spyOn(navigator, 'language', 'get').mockReturnValue('en-US');
    configWrite('language', 'es');
    expect(t('action.apply')).toBe('Aplicar cambios');
    configWrite('language', 'en');
    expect(t('action.apply')).toBe('Apply changes');
  });

  it('fills placeholders and falls back to English or the given text', () => {
    configWrite('language', 'es');
    expect(t('menu.position', { current: 2, total: 9 })).toBe('2 de 9');
    expect(t('option.unknown.desc', {}, 'Fallback')).toBe('Fallback');
    expect(t('missing.key')).toBe('missing.key');
  });

  it('notifies when the language changes', () => {
    const cb = vi.fn();
    onLanguageChange(cb);
    configWrite('language', 'es');
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it('has a Spanish label for every option', () => {
    configWrite('language', 'es');
    const missing = configKeys().filter(
      (key) => t(`option.${key}.desc`) === `option.${key}.desc`
    );
    expect(missing).toEqual([]);
  });
});
