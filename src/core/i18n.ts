// Translations for ClearTube TV's own interface (menu, notifications).
// YouTube's interface follows the language of the YouTube account.

import { configAddChangeListener, configRead } from './config.js';

export type Language = 'en' | 'es';
type Dictionary = Record<string, string>;

const en: Dictionary = {
  'menu.title': 'ClearTube TV',
  'menu.subtitle': 'Settings - version {version}',
  'menu.unsaved': '{count} unsaved changes',
  'menu.unsavedOne': '1 unsaved change',
  'menu.position': '{current} of {total}',
  'menu.on': 'ON',
  'menu.off': 'OFF',
  'menu.requires': 'Turn on "{parent}" first',
  'menu.modified': 'Changed',

  'legend.select': 'Select',
  'legend.change': 'Change',
  'legend.adjust': 'Adjust',
  'legend.close': 'Close',

  'section.ads': 'Ads and sponsors',
  'section.playback': 'Playback',
  'section.content': 'Content',
  'section.interface': 'Interface',
  'section.actions': 'Actions',
  'section.about': 'About',

  'action.apply': 'Apply changes',
  'action.applyHint': 'Save and apply without restarting',
  'action.applyNone': 'No changes to apply',
  'action.reset': 'Restore defaults',
  'action.resetHint': 'Set every option back to its original value',

  'about.data':
    'Uses SponsorBlock and DeArrow data from sponsor.ajay.app, licensed under CC BY-NC-SA 4.0.',
  'about.license':
    'Free software under the GPL-3.0. Not affiliated with YouTube or Google.',
  'about.link': 'github.com/DavidRamirez206/ClearTube-TV',

  'unsaved.title': 'You have unsaved changes',
  'unsaved.apply': 'Apply',
  'unsaved.discard': 'Discard',
  'unsaved.keep': 'Keep editing',

  'notify.welcome': 'ClearTube TV: press GREEN for settings',
  'notify.applied': 'Settings applied',
  'notify.discarded': 'Changes discarded',
  'notify.audioOn': 'Audio-only mode on',
  'notify.audioOff': 'Audio-only mode off',
  'notify.audioNoVideo': 'Audio-only mode: play a video first',
  'notify.audioOverlay': 'Audio-only mode. Press BLUE to show the video.',
  'notify.debugShown': 'Debug console shown',
  'notify.debugHidden': 'Debug console hidden',
  'notify.inspectorOn': 'Element inspector on',
  'notify.inspectorOff': 'Element inspector off',
  'notify.skipped': 'Skipped: {segment}',
  'notify.quality': '{selected} selected (max {max})',
  'notify.speed': 'Speed {speed}',

  'segment.sponsor': 'sponsor',
  'segment.intro': 'intro',
  'segment.outro': 'outro',
  'segment.interaction': 'interaction reminder',
  'segment.selfpromo': 'self-promotion',
  'segment.music_offtopic': 'non-music section',
  'segment.preview': 'recap or preview',

  'guide.options': 'CT Options',

  'choice.language.auto': 'Automatic',
  'choice.language.en': 'English',
  'choice.language.es': 'Español'
};

const es: Dictionary = {
  'menu.title': 'ClearTube TV',
  'menu.subtitle': 'Ajustes - versión {version}',
  'menu.unsaved': '{count} cambios sin guardar',
  'menu.unsavedOne': '1 cambio sin guardar',
  'menu.position': '{current} de {total}',
  'menu.on': 'SÍ',
  'menu.off': 'NO',
  'menu.requires': 'Activa primero "{parent}"',
  'menu.modified': 'Cambiado',

  'legend.select': 'Elegir',
  'legend.change': 'Cambiar',
  'legend.adjust': 'Ajustar',
  'legend.close': 'Cerrar',

  'section.ads': 'Anuncios y patrocinios',
  'section.playback': 'Reproducción',
  'section.content': 'Contenido',
  'section.interface': 'Interfaz',
  'section.actions': 'Acciones',
  'section.about': 'Acerca de',

  'action.apply': 'Aplicar cambios',
  'action.applyHint': 'Guardar y aplicar sin reiniciar',
  'action.applyNone': 'No hay cambios que aplicar',
  'action.reset': 'Restablecer valores',
  'action.resetHint': 'Devolver todas las opciones a su valor original',

  'about.data':
    'Usa datos de SponsorBlock y DeArrow de sponsor.ajay.app, con licencia CC BY-NC-SA 4.0.',
  'about.license':
    'Software libre bajo la GPL-3.0. Sin relación con YouTube ni Google.',
  'about.link': 'github.com/DavidRamirez206/ClearTube-TV',

  'unsaved.title': 'Tienes cambios sin guardar',
  'unsaved.apply': 'Aplicar',
  'unsaved.discard': 'Descartar',
  'unsaved.keep': 'Seguir editando',

  'notify.welcome': 'ClearTube TV: pulsa VERDE para los ajustes',
  'notify.applied': 'Ajustes aplicados',
  'notify.discarded': 'Cambios descartados',
  'notify.audioOn': 'Modo solo audio activado',
  'notify.audioOff': 'Modo solo audio desactivado',
  'notify.audioNoVideo': 'Modo solo audio: primero reproduce un video',
  'notify.audioOverlay': 'Modo solo audio. Pulsa AZUL para ver el video.',
  'notify.debugShown': 'Consola de depuración visible',
  'notify.debugHidden': 'Consola de depuración oculta',
  'notify.inspectorOn': 'Inspector de elementos activado',
  'notify.inspectorOff': 'Inspector de elementos desactivado',
  'notify.skipped': 'Saltado: {segment}',
  'notify.quality': '{selected} seleccionado (máx. {max})',
  'notify.speed': 'Velocidad {speed}',

  'segment.sponsor': 'patrocinio',
  'segment.intro': 'introducción',
  'segment.outro': 'cierre',
  'segment.interaction': 'recordatorio de interacción',
  'segment.selfpromo': 'autopromoción',
  'segment.music_offtopic': 'parte sin música',
  'segment.preview': 'resumen o avance',

  'guide.options': 'Opciones CT',

  'choice.language.auto': 'Automático',
  'choice.language.en': 'English',
  'choice.language.es': 'Español',

  // Options: option.<key>.desc / option.<key>.hint
  'option.enableAdBlock.desc': 'Bloquear anuncios',
  'option.enableAdBlock.hint':
    'Anuncios en videos, banners del inicio y mosaicos patrocinados',
  'option.enableSponsorBlock.desc': 'SponsorBlock',
  'option.enableSponsorBlock.hint':
    'Salta partes señaladas por la comunidad (sponsor.ajay.app)',
  'option.enableSponsorBlockSponsor.desc': 'Saltar patrocinios',
  'option.enableSponsorBlockInteraction.desc':
    'Saltar recordatorios de interacción',
  'option.enableSponsorBlockInteraction.hint':
    'Peticiones de "dale like y suscríbete"',
  'option.enableSponsorBlockSelfPromo.desc': 'Saltar autopromoción',
  'option.enableSponsorBlockIntro.desc': 'Saltar introducciones',
  'option.enableSponsorBlockOutro.desc': 'Saltar cierres y créditos',
  'option.enableSponsorBlockMusicOfftopic.desc':
    'Saltar partes sin música en videos musicales',
  'option.enableSponsorBlockPreview.desc': 'Saltar resúmenes y avances',
  'option.forceHighResVideo.desc': 'Calidad de video máxima',
  'option.forceHighResVideo.hint': 'Elige la resolución más alta disponible',
  'option.playbackSpeed.desc': 'Velocidad de reproducción',
  'option.playbackSpeed.hint':
    'Se aplica al empezar cada video. Usa IZQUIERDA/DERECHA.',
  'option.removeEndscreen.desc': 'Quitar pantallas finales',
  'option.removeEndscreen.hint':
    'Tarjetas que tapan los últimos segundos del video',
  'option.disablePreviews.desc': 'Desactivar vistas previas',
  'option.disablePreviews.hint':
    'No reproducir videos al seleccionar una miniatura',
  'option.removeShorts.desc': 'Ocultar Shorts',
  'option.removeShorts.hint': 'Inicio, suscripciones, búsqueda y menú lateral',
  'option.enableDeArrow.desc': 'DeArrow',
  'option.enableDeArrow.hint':
    'Cambia títulos engañosos por los de la comunidad (dearrow.ajay.app)',
  'option.enableDeArrowThumbnails.desc': 'Usar miniaturas de DeArrow',
  'option.enableDeArrowThumbnails.hint':
    'Miniaturas de la comunidad en lugar de las engañosas',
  'option.upgradeThumbnails.desc': 'Miniaturas en alta calidad',
  'option.hideLogo.desc': 'Ocultar el logo de YouTube',
  'option.showWatch.desc': 'Mostrar reloj',
  'option.autoAccountSelect.desc': 'Saltar selección de cuenta',
  'option.autoAccountSelect.hint': 'Omite "¿Quién está viendo?" al iniciar',
  'option.language.desc': 'Idioma',
  'option.language.hint': 'Idioma de los menús y avisos de ClearTube TV',
  'option.startupAnimation.desc': 'Animación de inicio',
  'option.startupAnimation.hint': 'Logo animado y sonido al abrir la app'
};

const dictionaries: Record<Language, Dictionary> = { en, es };

/** The language in use: the chosen one, or the system's when "auto". */
export function currentLanguage(): Language {
  let chosen: unknown = 'auto';
  try {
    chosen = configRead('language');
  } catch {
    // Unknown key in very old configs: fall back to the system language.
  }
  if (chosen === 'en' || chosen === 'es') return chosen;
  const system = String(
    (typeof navigator !== 'undefined' && navigator.language) || ''
  );
  return system.toLowerCase().startsWith('es') ? 'es' : 'en';
}

/**
 * Translated text for `key`, with `{name}` placeholders replaced. Falls
 * back to English, then to `fallback`, then to the key itself.
 */
export function t(
  key: string,
  params: Record<string, string | number> = {},
  fallback?: string
): string {
  const text =
    dictionaries[currentLanguage()][key] ?? en[key] ?? fallback ?? key;
  return text.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in params ? String(params[name]) : match
  );
}

/** Calls `callback` whenever the interface language may have changed. */
export function onLanguageChange(callback: () => void) {
  configAddChangeListener('language', () => callback());
}
