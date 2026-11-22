<p align="center">
  <img src="assets/brand/logo.svg" alt="Logo de YouTube Premium" width="128" height="128">
</p>

<h1 align="center">YouTube Premium</h1>

<p align="center"><a href="README.md">English</a> | <b>Español</b></p>

<p align="center">
  Cliente no oficial y de código abierto de YouTube para televisores Samsung
  Tizen y LG webOS, con bloqueo de anuncios, SponsorBlock, DeArrow y opciones
  de reproducción adicionales.
</p>

<p align="center">
  <a href="https://github.com/DavidRamirez206/youtube-premium/actions/workflows/ci.yml"><img src="https://github.com/DavidRamirez206/youtube-premium/actions/workflows/ci.yml/badge.svg" alt="Estado de CI"></a>
  <a href="https://github.com/DavidRamirez206/youtube-premium/releases/latest"><img src="https://img.shields.io/github/v/release/DavidRamirez206/youtube-premium" alt="Última versión"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-GPL--3.0--only-blue" alt="Licencia: GPL-3.0-only"></a>
</p>

> [!IMPORTANT]
> YouTube Premium es un proyecto independiente. No está afiliado, respaldado
> ni patrocinado por Google LLC, YouTube, Samsung Electronics ni LG
> Electronics. "YouTube" es una marca de Google LLC. Lee el
> [aviso legal y las condiciones de uso](DISCLAIMER.md) antes de instalar.

## Contenido

- [Descripción](#descripción)
- [Funciones](#funciones)
- [Compatibilidad](#compatibilidad)
- [Instalación en Samsung (Tizen)](#instalación-en-samsung-tizen)
- [Instalación en LG (webOS)](#instalación-en-lg-webos)
- [Uso](#uso)
- [Ajustes](#ajustes)
- [Televisores Tizen antiguos (3.0 a 5.5)](#televisores-tizen-antiguos-30-a-55)
- [Privacidad](#privacidad)
- [Problemas conocidos](#problemas-conocidos)
- [Compilar desde el código fuente](#compilar-desde-el-código-fuente)
- [Contribuir](#contribuir)
- [Créditos](#créditos)
- [Licencia](#licencia)

## Descripción

YouTube Premium abre la interfaz oficial de YouTube TV (`youtube.com/tv`), la
misma que usa la aplicación del televisor, y aplica sus modificaciones en el
propio dispositivo: tu cuenta, suscripciones, historial y recomendaciones
funcionan como siempre. Este proyecto no aloja, copia ni redistribuye ningún
vídeo.

## Funciones

| Función                                   | Descripción                                                                                                       |
| ----------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Bloqueo de anuncios                       | Quita los anuncios de vídeo, los banners de la página principal y los mosaicos patrocinados.                      |
| [SponsorBlock](https://sponsor.ajay.app/) | Salta los segmentos patrocinados, los recordatorios de interacción y la autopromoción. El resto es opcional.      |
| Calidad de vídeo máxima                   | Elige la resolución más alta disponible en cada vídeo.                                                            |
| Miniaturas de alta calidad                | Sustituye las miniaturas de baja resolución por versiones de mayor calidad.                                       |
| Quitar pantallas finales                  | Oculta las tarjetas que tapan los últimos segundos del vídeo.                                                     |
| [DeArrow](https://dearrow.ajay.app/)      | Sustituye los títulos y miniaturas engañosos por los que envía la comunidad (opcional).                           |
| Velocidad de reproducción                 | Empieza cada vídeo a la velocidad elegida, de 0,75x a 2x.                                                         |
| Historial de reproducción                 | Los vídeos vistos con los anuncios bloqueados se siguen guardando en el historial de YouTube.                     |
| Ocultar Shorts                            | Quita los Shorts de inicio, suscripciones, búsqueda y el menú lateral (opcional).                                 |
| Desactivar vistas previas                 | Evita que los vídeos se reproduzcan solos al seleccionar una miniatura (opcional).                                |
| Modo solo audio                           | Oculta la imagen y mantiene el sonido (botón Azul).                                                               |
| Reloj en pantalla                         | Muestra la hora sobre la interfaz (opcional).                                                                     |
| Ocultar el logo                           | Oculta el logo de YouTube de la interfaz (opcional).                                                              |
| Saltar selección de cuenta                | Omite la pantalla "¿Quién está viendo?" al iniciar (opcional).                                                    |
| Menú de ajustes                           | Se abre con el botón Verde o con "Más Opciones" en el menú lateral de YouTube. Los cambios se aplican al momento. |
| Idiomas                                   | El menú y los avisos de YouTube Premium están en inglés y en español.                                             |
| Animación de inicio                       | Logo animado y un sonido corto al abrir la aplicación (opcional).                                                 |

## Compatibilidad

| Plataforma    | Versiones         | Estado                                                                                                |
| ------------- | ----------------- | ----------------------------------------------------------------------------------------------------- |
| Samsung Tizen | 6.0 y posteriores | Compatible. Probado en Tizen 10.0 (UN43M70HAKXZL).                                                    |
| Samsung Tizen | 3.0 a 5.5         | Compatible con un proxy local. Ver [Televisores Tizen antiguos](#televisores-tizen-antiguos-30-a-55). |
| LG webOS      | 3.0 y posteriores | Compatible mediante el código original de youtube-webos.                                              |

## Instalación en Samsung (Tizen)

Los televisores Samsung solo ejecutan aplicaciones firmadas con un
certificado que incluye el ID del televisor. Por eso los paquetes se publican
**sin firmar**: los firmas una vez con tu propio certificado gratuito de
Samsung.

### 1. Descarga el paquete

Descarga `YouTubePremium_<versión>_tizen_unsigned.wgt` de la
[última versión](https://github.com/DavidRamirez206/youtube-premium/releases/latest)
y, si quieres, verifícalo como se explica en [SECURITY.md](SECURITY.md#release-integrity).

### 2. Activa el modo desarrollador en el televisor

1. Abre el panel **Aplicaciones** del televisor.
2. Marca `1`, `2`, `3`, `4`, `5` con el control para abrir el diálogo del modo desarrollador.
3. Activa el **modo desarrollador** e introduce la IP local de tu computadora.
4. Reinicia el televisor manteniendo pulsado el botón de encendido hasta que se apague y vuelva a encender.

La IP del televisor aparece en **Configuración > General > Red > Estado de
la red > Configuración IP**.

### 3. Firma e instala

Elige uno de estos métodos.

**Opción A: línea de comandos de Tizen Studio**

1. Instala [Tizen Studio](https://developer.tizen.org/development/tizen-studio/download)
   con los paquetes **TV Extensions** y **Samsung Certificate Extension**.
2. Conéctate al televisor:

   ```sh
   sdb connect <ip-del-tv>:26101
   sdb devices
   ```

3. En el **Certificate Manager**, crea un perfil de certificado **Samsung**
   (por ejemplo `MiTV`) para el tipo de dispositivo **TV**. Inicia sesión con
   una cuenta Samsung cuando lo pida; el ID del televisor conectado se añade
   automáticamente.
4. Firma e instala el paquete:

   ```sh
   mkdir youtube-premium && cd youtube-premium
   unzip ../YouTubePremium_<versión>_tizen_unsigned.wgt
   tizen package -t wgt -s MiTV -- .
   tizen install -n YouTubePremium*.wgt -s <ip-del-tv>:26101
   ```

**Opción B: instaladores gráficos**

Herramientas de la comunidad como Apps2Samsung pueden generar el
certificado, firmar el paquete e instalarlo sin Tizen Studio. Las mantienen
terceros; revísalas antes de usarlas.

### 4. Abre la aplicación

YouTube Premium aparece en la lista de **Aplicaciones** del televisor.
Después puedes desactivar el modo desarrollador; la aplicación sigue
funcionando hasta que caduque el certificado, y entonces hay que volver a
firmarla e instalarla.

### Actualizar

Instala la nueva versión encima de la anterior con el mismo perfil de
certificado. Se conservan los ajustes y la sesión iniciada. Un paquete
firmado con otro certificado debe instalarse después de desinstalar la
versión anterior.

## Instalación en LG (webOS)

### 1. Descarga el paquete

Descarga `YouTubePremium_<versión>_webos.ipk` de la
[última versión](https://github.com/DavidRamirez206/youtube-premium/releases/latest).

### 2. Activa el modo desarrollador en el televisor

Sáltate este paso si el televisor tiene root y el
[Homebrew Channel](https://github.com/webosbrew/webos-homebrew-channel).

1. Crea una cuenta gratuita en [webostv.developer.lge.com](https://webostv.developer.lge.com/)
   e inicia sesión con ella en el televisor.
2. Instala la aplicación **Developer Mode** desde la LG Content Store y ábrela.
3. Activa **Dev Mode Status** y acepta el reinicio.
4. Abre otra vez **Developer Mode**, activa **Key Server** y apunta la IP y
   la frase de acceso (passphrase) que aparecen en pantalla.

La sesión del modo desarrollador dura unas 50 horas. Abre la aplicación
Developer Mode y pulsa **Extend** antes de que se acabe; cuando caduca, se
borran las aplicaciones de desarrollador instaladas.

### 3. Instala

Elige uno de estos métodos.

**Opción A: webOS Dev Manager (recomendada)**

1. Instala [webOS Dev Manager](https://github.com/webosbrew/dev-manager-desktop)
   en la computadora.
2. Añade el televisor con su IP y la frase de acceso del paso 2.
3. Abre la pestaña **Apps** e instala el archivo `.ipk`.

**Opción B: Homebrew Channel (televisores con root)**

Copia el archivo `.ipk` al televisor e instálalo desde el Homebrew Channel,
o instálalo con webOS Dev Manager como arriba. Los televisores con root no
dependen de la sesión del modo desarrollador.

**Opción C: webOS CLI**

1. Instala el [webOS CLI](https://webostv.developer.lge.com/develop/tools/cli-installation)
   (comandos `ares-*`).
2. Añade el televisor y obtén su clave con la frase de acceso del paso 2:

   ```sh
   ares-setup-device --add tv -i "host=<ip-del-tv>" -i "port=9922" -i "username=prisoner"
   ares-novacom --device tv --getkey
   ```

3. Instala y abre la aplicación:

   ```sh
   ares-install --device tv YouTubePremium_<versión>_webos.ipk
   ares-launch --device tv youtube.leanback.v4
   ```

### 4. Abre la aplicación

YouTube Premium aparece en la lista de aplicaciones. Para actualizarla,
instala de la misma forma el `.ipk` de la nueva versión; los ajustes se
conservan.

## Uso

| Botón del control   | Acción                                                                  |
| ------------------- | ----------------------------------------------------------------------- |
| Verde               | Abre o cierra el menú de ajustes de YouTube Premium.                    |
| Arriba / Abajo      | Se mueve por el menú de ajustes.                                        |
| OK                  | Activa o desactiva la opción elegida, o recorre sus valores.            |
| Izquierda / Derecha | Cambia el valor de opciones como la velocidad de reproducción.          |
| Atrás               | Cierra el menú de ajustes, o la barra de cambios sin guardar.           |
| Azul                | Activa o desactiva el modo solo audio durante un vídeo.                 |
| Rojo                | Muestra u oculta la consola de depuración en pantalla.                  |
| Amarillo            | Muestra u oculta el inspector de elementos de la interfaz (desarrollo). |

## Ajustes

El menú se abre con el botón Verde o desde la entrada "Más Opciones" del
menú lateral de YouTube, justo encima de la Configuración de YouTube. Sus
colores siguen el tema claro u oscuro de YouTube.

Los cambios se van acumulando mientras el menú está abierto y se aplican
juntos con "Aplicar cambios", sin reiniciar la aplicación ni detener el
vídeo. Si cierras el menú con cambios sin guardar, aparece una barra para
aplicarlos, descartarlos o seguir editando. "Restablecer valores" devuelve
todas las opciones a su valor original, que también se aplica con "Aplicar
cambios".

| Sección                | Opción                                       | Por defecto |
| ---------------------- | -------------------------------------------- | ----------- |
| Anuncios y patrocinios | Bloquear anuncios                            | Sí          |
|                        | SponsorBlock                                 | Sí          |
|                        | Saltar segmentos patrocinados                | Sí          |
|                        | Saltar recordatorios de interacción          | Sí          |
|                        | Saltar autopromoción                         | Sí          |
|                        | Saltar introducciones                        | No          |
|                        | Saltar cierres y créditos                    | No          |
|                        | Saltar partes sin música en vídeos musicales | No          |
|                        | Saltar resúmenes y avances                   | No          |
| Reproducción           | Calidad de vídeo máxima                      | Sí          |
|                        | Velocidad de reproducción                    | 1x          |
|                        | Quitar pantallas finales                     | Sí          |
|                        | Guardar historial de reproducción            | Sí          |
|                        | Desactivar vistas previas                    | No          |
| Contenido              | Ocultar Shorts                               | No          |
|                        | DeArrow                                      | No          |
|                        | Usar miniaturas de DeArrow                   | Sí          |
|                        | Miniaturas de alta calidad                   | Sí          |
| Interfaz               | Ocultar el logo de YouTube                   | No          |
|                        | Mostrar reloj                                | No          |
|                        | Saltar selección de cuenta                   | No          |
|                        | Animación de inicio                          | Sí          |
|                        | Idioma                                       | Automático  |

Las categorías de SponsorBlock solo se aplican con SponsorBlock activado, y
la opción de miniaturas de DeArrow solo con DeArrow activado; el menú las
muestra desactivadas hasta que se activa la opción principal. Los Shorts se
muestran salvo que actives "Ocultar Shorts".

"Guardar historial de reproducción" solo importa mientras se bloquean los
anuncios: para evitar las ralentizaciones de YouTube contra los bloqueadores,
las peticiones del reproductor se marcan como vista previa, y YouTube no las
guarda en el historial. Con la opción activada, los vídeos que se reproducen
desde la página del vídeo no se marcan.

"Idioma" fija el idioma del menú y los avisos de YouTube Premium.
"Automático" sigue el idioma del televisor. La interfaz de YouTube sigue el
idioma de la cuenta de YouTube.

Los ajustes se guardan solo en el televisor.

## Televisores Tizen antiguos (3.0 a 5.5)

En Tizen 5.5 y anteriores, YouTube rechaza las peticiones a su API que vienen
de aplicaciones locales. YouTube Premium puede enviarlas a través de un
pequeño proxy que se ejecuta en una computadora de la misma red:

```sh
pnpm install
pnpm proxy
```

La aplicación encuentra el proxy automáticamente al iniciar y muestra un
aviso mientras lo usa. El proxy solo reenvía peticiones HTTPS a
`youtube.com`. La computadora debe estar encendida mientras se usa el
televisor. Tizen 6.0 y posteriores no lo necesitan.

## Privacidad

YouTube Premium no tiene analíticas y no recoge datos personales. Además de
YouTube, la aplicación solo contacta con los servicios que actives:

| Servicio                                                     | Datos enviados                                     | Cuándo                                  |
| ------------------------------------------------------------ | -------------------------------------------------- | --------------------------------------- |
| SponsorBlock (`sponsor.ajay.app`, con un espejo de respaldo) | Primeros caracteres de un hash del ID del vídeo    | Con SponsorBlock activado               |
| DeArrow (`sponsor.ajay.app`)                                 | Primeros caracteres de un hash de cada ID de vídeo | Con DeArrow activado                    |
| Miniaturas de DeArrow (`dearrow-thumb.ajay.app`)             | ID de cada vídeo con miniatura de la comunidad     | Con las miniaturas de DeArrow activadas |
| Proxy local                                                  | Peticiones a la API de YouTube                     | Solo en Tizen 5.5 y anteriores          |

Consulta [DISCLAIMER.md](DISCLAIMER.md) para más detalles.

## Problemas conocidos

- Las miniaturas de vista previa de la barra de progreso pueden verse en
  negro al adelantar (hay una corrección incluida, pero aún no está
  confirmada en todos los televisores).

Informa de los problemas en el
[gestor de incidencias](https://github.com/DavidRamirez206/youtube-premium/issues).
Los problemas de seguridad se informan en privado como se explica en
[SECURITY.md](SECURITY.md).

## Compilar desde el código fuente

Requisitos: Node.js 22 o posterior y Corepack (incluido con Node.js).

```sh
git clone https://github.com/DavidRamirez206/youtube-premium.git
cd youtube-premium
corepack enable
pnpm install
```

| Comando              | Resultado                                                |
| -------------------- | -------------------------------------------------------- |
| `pnpm build:tizen`   | Compila la aplicación en `dist/`.                        |
| `pnpm package:tizen` | Crea un `.wgt` de Tizen sin firmar a partir de `dist/`.  |
| `pnpm package:webos` | Crea un `.ipk` de webOS a partir de `dist/`.             |
| `pnpm test`          | Ejecuta las pruebas unitarias.                           |
| `pnpm test:coverage` | Ejecuta las pruebas unitarias con informe de cobertura.  |
| `pnpm lint:all`      | Ejecuta ESLint, el compilador de TypeScript y Prettier.  |
| `pnpm test:compat`   | Comprueba que los paquetes son compatibles con ES5.      |
| `pnpm icons`         | Vuelve a generar los iconos a partir de `assets/brand/`. |

Estructura del proyecto:

```text
src/
  index.js           Punto de entrada del cargador (se ejecuta en index.html)
  userScript.ts      Punto de entrada que se inyecta en YouTube TV
  core/              Configuración y utilidades compartidas
  loader/            Cargador de Tizen, manejo de URL y detección del proxy
  hooks/             Intercepción de fetch y JSON
  app_api/           Integración con el registro de comandos de YouTube TV
  player_api/        Integración con el reproductor de vídeo
  features/          Un módulo por función
  ui/                Menú de ajustes, avisos y consola de depuración
  styles/            Correcciones de estilo de la interfaz
  polyfills/         Polyfills para navegadores de televisores antiguos
test/                Pruebas unitarias (Vitest y jsdom)
tools/               Scripts de empaquetado, versiones y proxy
assets/              Iconos, imágenes de inicio y manifiestos de cada plataforma
```

## Contribuir

Las contribuciones son bienvenidas. Los commits siguen
[Conventional Commits](https://www.conventionalcommits.org/) en inglés, y
cada cambio debe pasar `pnpm lint:all`, `pnpm test` y `pnpm build:tizen`.
Las funciones nuevas y las correcciones deben incluir pruebas unitarias.

## Créditos

YouTube Premium es una versión modificada de
[youtube-tizenos](https://github.com/TheMysticle/youtube-tizenos) de
TheMysticle, que a su vez es una adaptación a Tizen de
[youtube-webos](https://github.com/webosbrew/youtube-webos) del proyecto webOS
Homebrew y sus colaboradores. La lista completa de autores está en el
historial de Git.

Servicios y proyectos de terceros:

- [SponsorBlock](https://sponsor.ajay.app/) y [DeArrow](https://dearrow.ajay.app/)
  de Ajay Ramachandran y colaboradores. Usa datos de SponsorBlock y DeArrow
  de https://sponsor.ajay.app/, con licencia
  [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/).
- Reglas de filtrado de anuncios basadas en los filtros de
  [uBlock Origin](https://github.com/gorhill/uBlock).
- La animación de inicio usa un subconjunto de la fuente
  [Roboto](https://github.com/googlefonts/roboto) de Google, con licencia
  Apache 2.0.

## Licencia

YouTube Premium es software libre con licencia
[GNU General Public License v3.0 only](LICENSE), con los
[términos adicionales](ADDITIONAL-TERMS.md) que permite su sección 7.
"YouTube", "YouTube Premium" y el logo de YouTube son marcas de Google LLC;
consulta [TRADEMARKS.md](TRADEMARKS.md). Consulta [NOTICE](NOTICE) para la
información de copyright.
