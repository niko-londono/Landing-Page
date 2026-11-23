# HISTORIAL.md — Mapa del proyecto Landing-Page

> Guía rápida para ubicarse sin leer todo el código. Actualizar al final de cada cambio relevante (ver sección "Registro de cambios").
> Generado: 2026-10-18.

## 1. Qué es
Portafolio personal de una sola página (SPA estática) de **Nicolás Londoño Hernández** (Ciencias de la Computación). Idioma: español. Estética "terminal/CS": tema oscuro por defecto + claro. Fondo inmersivo en WebGL (Three.js): túnel de texto en el hero por el que la cámara se zambulle al hacer scroll, y una nube de partículas que cambia de forma en cada sección. Scroll suave con Lenis + parallax con GSAP.

## 2. Stack
- **Vite 5** (devDependency) + **JavaScript vanilla** (ES modules) + CSS puro. Sin framework, sin tests, sin linter.
- Dependencias npm: **three 0.170** (escena WebGL, chunk aparte cargado con `import()` tras el primer pintado) y **lenis 1.1** (scroll suave).
- **GSAP 3.12.5 + ScrollTrigger** cargados por CDN (jsdelivr, `defer`) en `index.html`; en `main.js` se accede a los globales `gsap`/`ScrollTrigger` (reintenta cada 100 ms hasta que cargan).
- Fuentes Google: Syne (display), Outfit (body), JetBrains Mono (code).
- Scripts: `npm run dev` · `npm run build` (→ `dist/`) · `npm run preview`.
- `vite.config.js`: `base: './'` y `chunkSizeWarningLimit: 650` (el chunk de three pesa ~510 KB / 130 KB gzip).

## 3. Despliegue
`.github/workflows/deploy.yml`: push a `main` (o manual) → Node 20 → `npm install` → `npm run build` → sube `./dist` a **GitHub Pages**.

## 4. Estructura de archivos
```
index.html            398 líneas — TODO el marcado (única página)
src/main.js           ~780 líneas — lógica de la página, IIFEs numeradas
src/world/            escena Three.js (ver sección 6b)
  World.js            renderer, cámara, "journey" de scroll, tema, bucle
  tunnel.js           anillos de texto (vórtice del hero) + brillo final
  particles.js        nube de partículas con 4 formas (shader)
  post.js             EffectComposer: bloom + lente (aberración, viñeta, grano)
  noise.js            simplex noise GLSL
src/style.css        1447 líneas — todo el estilo, secciones numeradas
.claude/launch.json   config del dev server para el panel de preview (vite, puerto 5173)
public/fotos/         assets servidos en raíz (/fotos/...)
  foto_niko.JPG, favicon.png, DEP2024.jpeg, DEP2025.jpeg, DEP2025_2.jpeg,
  "Nicolas Londoño Hernandez CV.pdf", URL LINKEDING.txt,
  "Captura de pantalla APTITUDES.png" (sin referencia en el código)
public/ejemplos/      CSS/HTML/JS_PARALAX.txt — código de referencia de un parallax SVG; NO se usa en la app
.github/workflows/deploy.yml
```
Las rutas de assets en HTML son absolutas (`/fotos/...`, `/src/main.js`).

## 5. index.html — secciones (orden)
| Selector / id | Contenido |
|---|---|
| `#scroll-progress` | barra de progreso de scroll |
| `canvas#webgl` | escena Three.js fija detrás de todo (z-index 0, aparece con `.is-ready`) |
| `header#mainHeader` | logo `<Niko />`, `#navLinks` (inicio, sobre_mí, aptitudes, proyectos, contactar), `#themeToggle`, `#menuToggle` (hamburguesa) |
| `#inicio .hero` | `#typedBadge`, h1 (`.hero-greet` "Soy" + `.name-highlight[data-split]`), descripción, botones (Ver proyectos, Descargar CV), LinkedIn, foto `.profile-frame` > `.profile-media` > img, `.stat-card` (3+ años / ∞), `.scroll-hint` |
| `#sobre-mi .about` | texto, `.code-snippet` (profile.js decorativo), `.skills-block` con `.skill-tag` (Power BI, Oracle, SAS EG, Linux/Git, SQL Server, SAS DI) |
| `#aptitudes .aptitudes` | 5 `.aptitude-card` con barra `.apt-fill[data-width]` (Problem Solving 90, Analytical 88, Databases 82, Data Analytics 78, Data Migration 75) |
| `#proyectos .projects` | un solo `.project-showcase`: "MIGRACIÓN CORE BPD" + `.achievements-grid` (2fr/3fr) con 2 `article.achievement-card`: 2024 (DEP2024) y 2025 `--duo` (DEP2025_2 principal + DEP2025 como `.achievement-inset` flotante). Las fotos son `button[data-gallery][data-index]` → abren el lightbox |
| `dialog#lightbox` | visor de fotos (al final del body): `.lb-img`, `.lb-caption`, `.lb-counter`, botones cerrar/anterior/siguiente |
| `footer#contacto` | CTA mailto `niko_londono@hotmail.com`, copyright 2026, "Built with Vite + Three.js + GSAP" |

Cada `.section-header` (y `.footer-content`) lleva un `.section-index` (01–04, número gigante con contorno, decorativo). Se quitaron las etiquetas `// 0X. about` (meta-labels).
Cada sección y el footer tienen una `.section-layer` con `.layer-sym` (glifos CS de fondo, `ls-a…ls-d`).
Capas de profundidad declarativas: `data-depth` (positivo = sube más rápido/más cerca, negativo = va más lento/más lejos). Lo llevan `.layer-sym`, `.section-title`, `.code-snippet`, `.skills-wrap` y los `.apt-depth` (envoltorio de cada `.aptitude-card`).
El primer párrafo de About tiene `data-scrub` (las palabras se iluminan al hacer scroll).
Cada `.achievement-img-wrap` envuelve la img en `.achievement-parallax` (capa 120% de alto para el parallax interno).
Atributos de animación: `data-reveal="up|left|right"` (revelado por scroll), `data-split` (nombre partido en letras), `data-depth`, `data-scrub`, `data-gallery`, `style="--delay:Xs"` en cards.
Datos personales editables: textos en el HTML; email y LinkedIn en hero/footer.

## 6. src/main.js — módulos (IIFEs, orden del archivo)
1. **ThemeToggle** — `data-theme` en `<html>`, persiste en `localStorage['niko-theme']`, respeta `prefers-color-scheme`.
2. **ScrollProgress** — ancho de `#scroll-progress`.
Arriba del archivo: `REDUCED` (prefers-reduced-motion), objeto compartido `stage` ({ lenis, velocity }) y promesa `gsapReady` (GSAP llega por CDN con `defer`).
3. **Stage** — crea Lenis (si no hay reduced-motion) movido por `gsap.ticker`, sincroniza `ScrollTrigger.update` y guarda la velocidad en `stage.velocity`; luego importa `./world/World.js` de forma diferida y llama a `createWorld`. Sin WebGL o si falla, quita el canvas y la página sigue igual.
5. **TypedBadge** — efecto máquina de escribir con array `phrases` en `#typedBadge`.
6. **SplitName** — parte `[data-split]` en `.word > .char` (aria-label conserva el texto; la última palabra lleva `.word--accent`).
7. **ParallaxEngine** — GSAP 3.12 + ScrollTrigger; se desactiva entero con `prefers-reduced-motion`.
   - *Entrada* (todas las anchuras): letras suben desde una máscara, `.profile-media` se revela con clip-path, esquinas escalan, stat cards se revelan.
   - *Escena fijada* (`buildScene`, ≥993px, se construye al terminar la entrada): hero con `pin` (`end: +=170%`, `scrub 0.8`, `refreshPriority: 1`). Mientras la cámara WebGL se zambulle en el túnel: el nombre se desarma letra por letra, el resto del texto se desvanece con blur y la foto gira hacia el centro mientras la img se recorta en "visor" (`CROP`) y las esquinas siguen el recorte; en la segunda mitad del pin la foto crece, se desenfoca y desaparece (la cámara "pasa" a través de ella).
   - *Mouse* (≥993px, puntero fino): `quickTo` por capa según profundidad; la foto se inclina (rotationX/Y).
   - *Secciones*: `.section-index` yPercent ±45 (trigger: su encabezado); todo `[data-depth]` se mueve `±depth × alto de ventana × 0.28` (0.12 en móvil) mientras cruza su sección; `[data-scrub]` palabras de opacidad 0.15→1 (helper `splitWords`, conserva `<strong>`); fotos de premios: `.achievement-parallax` yPercent ±7 + zoom 1.18→1 al entrar y brillo 1→0.45 al salir; `.achievement-inset` en una capa más cercana.
   - **Regla clave**: cada efecto usa propiedades distintas en el mismo elemento (entrada: yPercent/scale/clip-path; scroll: x/y/rotation/opacity; mouse: xPercent/yPercent o rotationX/Y). GSAP escribe `translate/scale: none` en línea, así que los elementos que anima NO deben centrarse con `translate` CSS ni tener `transition` sobre transform; las flotaciones CSS (`floatY`) usan la propiedad `translate` en keyframes (las animaciones CSS sí ganan al estilo en línea).
8. **RevealObserver** — IntersectionObserver sobre `[data-reveal]` → clase `.revealed`; también dispara barras.
9. **AptitudeBars** (+ función global `triggerBars`) — rellena `.apt-fill` según `data-width`.
10. **HeaderScroll** — clase `.scrolled` en header tras 50 px (variable `last` sin uso).
11. **MobileMenu** — abre/cierra `#navLinks`, bloquea scroll del body.
12. **SmoothScroll** — anclas `#...` con offset −80 px (usa `lenis.scrollTo` si Lenis está activo).
13. **MagneticCards** — tilt 3D en `.aptitude-card` (escribe `style.transform`; no animar esas cards con GSAP).
15. **Lightbox** — `<dialog>` nativo; agrupa los `[data-gallery]` por nombre y los ordena por `data-index`. Flechas, ← → del teclado, swipe, Esc, clic en el fondo; la imagen crece desde la miniatura (FLIP con WAAPI, se omite con reduced-motion); bloquea el scroll mientras está abierto.
Al final: `console.log` de bienvenida "v2.0". El menú móvil y el lightbox llaman `stage.lenis.stop()/start()` al bloquear el scroll.

## 6b. src/world/ — escena WebGL
- **Journey**: `World.js` convierte `scrollY` en un número 0→4 con paradas medidas sobre las posiciones reales (incluye el pin-spacer): 0 = inicio, 1 = `#sobre-mi` empieza a entrar, 2/3/4 = top de `#aptitudes`/`#proyectos`/`#contacto` a mitad de pantalla. Se re-mide en resize, load, fonts y en cada `ScrollTrigger` refresh.
- **0→1 hero**: cámara de z=7 hasta el final del túnel (ease in-out, ligero roll). El punto de fuga sigue el centro de `.profile-frame` con `camera.setViewOffset` (se suelta al 50 %). Túnel: 38 anillos (26 en móvil) con frases en `LINES` (`tunnel.js`: nombre, NIKO en binario, SQL, stack, etc.), cada uno gira a su velocidad; más rápido con la velocidad de scroll.
- **1→4 secciones**: la cámara orbita una nube de partículas (9000 / 4200 en móvil) que se transforma: esfera neuronal (Sobre mí) → 5 columnas con alturas 90/88/82/78/75 % (Aptitudes; array `APTITUDES` en `particles.js`) → dos cubos con un flujo ETL entre ellos (Proyectos) → anillo/portal (Contacto). A mitad de cada transformación hay "tormenta" de ruido; el puntero empuja las partículas.
- **Post** (`post.js`): Render → Bloom (solo escritorio y tema oscuro) → OutputPass → lente (aberración cromática según velocidad de scroll, viñeta, grano). La lente va después de OutputPass a propósito (valores sRGB).
- **Tema**: lee `--bg-base`, `--text-main`, `--accent`, `--accent-2` y observa `data-theme`; en claro usa mezcla normal (tinta sobre papel) y sin bloom. El fondo se pone con `scene.background`, NO con `setClearColor` (three hornea el color en el espacio del target activo y con el composer salía gris).
- **Rendimiento**: pixel ratio máx. 1.75 (1.5 móvil), calidad adaptativa (si los primeros ~150 frames van lentos baja a pixel ratio 1 y quita bloom), pausa con la pestaña oculta. Reduced-motion: sin tiempo, sin zambullida ni puntero; el túnel se funde con la nube.
- En desarrollo existe `window.__world` ({ renderer, post, tunnel, cloud, camera }) para depurar desde la consola.

## 7. src/style.css — secciones numeradas
1 Design tokens (`:root` oscuro + `[data-theme="light"]`) · 2 Reset/base · 3 Scroll progress · 4 WebGL stage (`#webgl`) · 5 Container (max 1120px) · 6 Header · 7 Theme toggle · 8 Hamburger · 9 Buttons · 10 Section common (+ `.section-index`) · 12 Hero (`.hero-content` con `perspective`, nombre partido `.word/.char`, badge, `.profile-media`, profile-frame, stat-card, scroll-hint) · 13 About (code-snippet, skills) · 14 Aptitudes (progress bar) · 15 Projects showcase (`.achievement-parallax`) · 16 Footer · 17 Reveal animations (ease expo-out) · 18 Responsive (breakpoints 992 / 768 / 480) + `prefers-reduced-motion` (sin movimiento espacial, mantiene fundidos).

Tokens clave: `--glass`/`--glass-blur` (tarjetas translúcidas para que se vea el 3D detrás; las secciones tienen fondo transparente), `--bg-base/surface/card`, `--text-main/muted`, `--accent` (#4ea8de oscuro / #1e6bbf claro), `--accent-2` (mint), `--font-display/body/code`, `--radius-*`, `--shadow-*`. Cambios de color/tema se hacen aquí.

## 8. Dónde tocar para…
- Cambiar textos/datos personales, proyectos, skills → `index.html`.
- Cambiar CV → reemplazar PDF en `public/fotos/` y mantener el href de `index.html` (hero, línea ~94).
- Añadir proyecto/logro → nuevo `article.achievement-card` en `#proyectos` (foto dentro de `button.achievement-media[data-gallery]` > `.achievement-parallax` > img). Más fotos del mismo premio = mismo `data-gallery` con otro `data-index`.
- Dar profundidad a un elemento nuevo → `data-depth="0.3"` (solo si no tiene transform/transition CSS propio; si lo tiene, envolverlo como `.apt-depth`).
- Textos del túnel → array `LINES` en `src/world/tunnel.js`. Formas/colores de partículas → `buildShapes` en `src/world/particles.js`. Recorrido de cámara, opacidades y cuándo cambia cada forma → función `frame` de `src/world/World.js`.
- Ajustar parallax → módulo 7 de `main.js` (duración del pin: `end: '+=170%'`; recorte del visor: `CROP`; profundidades del mouse: array `layers`).
- Colores / tipografía / tema → tokens en `style.css` sección 1.
- Frases del badge → array `phrases` (módulo 5).

## 9. Observaciones / deuda conocida
- `public/ejemplos/*.txt` y `Captura de pantalla APTITUDES.png` no se usan en la app.
- El panel de preview oculto de Claude pausa `requestAnimationFrame`: al probar ahí, forzar `setInterval(() => gsap.ticker.tick(), 16)` desde la consola o la entrada se queda congelada.
- El panel oculto también pausa el bucle de `World.js`; las capturas pueden salir a mitad del fundido del canvas.
- Variable `last` en HeaderScroll sin uso; `triggerBars` se invoca desde dos observers (redundante).
- `<link rel="icon" href="/fotos/favicon.png">` y demás rutas absolutas dependen de que el sitio se sirva en la raíz (con `base: './'` en Vite y Pages en subruta podrían romperse; verificar si se usa URL de repo).
- Sin tests ni linter; verificación manual vía `npm run dev`.

## 10. Registro de cambios (commits de git)
| Fecha | Commit | Descripción |
|---|---|---|
| 2026-10-18 | ed377f9 | actualizar cv |
| 2026-05-09 | 28e4f4b | fix visual |
| 2026-05-06 | ecb0a86 | paralax profesional (GSAP ScrollTrigger) |
| 2026-05-06 | 3718134 | fix general |
| 2026-04-28 | cf926e1 | actualizar datos |
| 2026-04-26 | 05e0d3a, dc42c48 | actualizar datos |
| 2026-04-26 | 74d02f7 | base |

### Cambios futuros (añadir arriba, formato: fecha · archivos · qué y por qué)
- 2026-11-23 · src/world/* (nuevo), src/main.js, src/style.css, index.html, package.json, vite.config.js · Inmersión 3D con Three.js inspirada en contentarchitecture.dev: túnel/vórtice de texto alrededor de la foto en el hero, la cámara se zambulle al hacer scroll (pin alargado a +=170 %), y una nube de partículas que se transforma por sección (esfera → columnas de aptitudes → migración ETL → portal). Postproceso con bloom, aberración cromática por velocidad, viñeta y grano. Lenis para scroll suave. Se eliminaron NetworkCanvas, BinaryField, CursorGlow, la grilla y los símbolos flotantes del hero (los reemplaza la escena). Secciones con fondo transparente y tarjetas de cristal (`--glass`).
- 2026-10-18 · index.html, src/main.js, src/style.css · Parallax por capas en todas las secciones (glifos de fondo, títulos, tarjetas de aptitudes a distintas velocidades, palabras que se iluminan en About, fotos con zoom/oscurecido), referencia ORYZO/Lusion + gpt-taste. Fotos 2025 unidas en una sola tarjeta (DEP2025_2 + DEP2025 flotante), lightbox para ver fotos en grande, trofeo emoji → SVG, padding de secciones más amplio, sin meta-labels `// 0X`.
- 2026-10-18 · index.html, src/main.js, src/style.css · Parallax rehecho como "profundidad por capas": entrada con máscara, hero fijado con escena 3D (el nombre se desarma, la foto se convierte en visor), parallax por mouse, números de sección con contorno y parallax interno en las fotos de premios. También se corrigieron el bucle rAF duplicado al cambiar de tema, el selector `.project-card` obsoleto, CursorGlow (ahora por transform) y el conflicto de animaciones en About. Se quitó el texto con degradado del nombre (ahora "Nicolás" en texto principal y "Londoño" en acento).
- 2026-10-18 · HISTORIAL.md · creado.
