# HISTORIAL.md — Mapa del proyecto Landing-Page

> Guía rápida para ubicarse sin leer todo el código. Actualizar al final de cada cambio relevante (ver sección "Registro de cambios").
> Generado: 2026-10-18.

## 1. Qué es
Portafolio personal de una sola página (SPA estática) de **Nicolás Londoño Hernández** (Ciencias de la Computación). Idioma: español. Estética "terminal/CS": tema oscuro por defecto + claro, fondo de red neuronal en canvas, parallax con GSAP.

## 2. Stack
- **Vite 5** (único devDependency) + **JavaScript vanilla** (ES modules) + CSS puro. Sin framework, sin tests, sin linter.
- **GSAP 3.12.5 + ScrollTrigger** cargados por CDN (jsdelivr, `defer`) en `index.html`; en `main.js` se accede a los globales `gsap`/`ScrollTrigger` (reintenta cada 100 ms hasta que cargan).
- Fuentes Google: Syne (display), Outfit (body), JetBrains Mono (code).
- Scripts: `npm run dev` · `npm run build` (→ `dist/`) · `npm run preview`.
- `vite.config.js`: solo `base: './'`.

## 3. Despliegue
`.github/workflows/deploy.yml`: push a `main` (o manual) → Node 20 → `npm install` → `npm run build` → sube `./dist` a **GitHub Pages**.

## 4. Estructura de archivos
```
index.html            354 líneas — TODO el marcado (única página)
src/main.js           719 líneas — toda la lógica, IIFEs numeradas
src/style.css        1253 líneas — todo el estilo, secciones numeradas
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
| `#networkCanvas` | canvas fijo de fondo |
| `header#mainHeader` | logo `<Niko />`, `#navLinks` (inicio, sobre_mí, aptitudes, proyectos, contactar), `#themeToggle`, `#menuToggle` (hamburguesa) |
| `#inicio .hero` | capas de profundidad (`.hero-grid`, `.layer-deep` con `#binaryField`, `.layer-mid` con `.float-sym`), `#typedBadge`, h1 (`.hero-greet` "Soy" + `.name-highlight[data-split]`), descripción, botones (Ver proyectos, Descargar CV), LinkedIn, foto `.profile-frame` > `.profile-media` > img, `.stat-card` (3+ años / ∞), `.scroll-hint` |
| `#sobre-mi .about` | texto, `.code-snippet` (profile.js decorativo), `.skills-block` con `.skill-tag` (Power BI, Oracle, SAS EG, Linux/Git, SQL Server, SAS DI) |
| `#aptitudes .aptitudes` | 5 `.aptitude-card` con barra `.apt-fill[data-width]` (Problem Solving 90, Analytical 88, Databases 82, Data Analytics 78, Data Migration 75) |
| `#proyectos .projects` | un solo `.project-showcase`: "MIGRACIÓN CORE BPD" + `.achievements-grid` con 3 `.achievement-card` (DEP2024, DEP2025, DEP2025_2) |
| `footer#contacto` | CTA mailto `niko_londono@hotmail.com`, copyright 2026, "Built with Vite + Vanilla JS" |

Cada `.section-header` (y `.footer-content`) lleva un `.section-index` (01–04, número gigante con contorno, decorativo).
Cada `.achievement-img-wrap` envuelve la img en `.achievement-parallax` (capa 120% de alto para el parallax interno).
Atributos de animación: `data-reveal="up|left|right"` (revelado por scroll), `data-split` (nombre partido en letras), `style="--delay:Xs"` en cards.
Datos personales editables: textos en el HTML; email y LinkedIn en hero/footer.

## 6. src/main.js — módulos (IIFEs, orden del archivo)
1. **ThemeToggle** — `data-theme` en `<html>`, persiste en `localStorage['niko-theme']`, respeta `prefers-color-scheme`.
2. **ScrollProgress** — ancho de `#scroll-progress`.
3. **NetworkCanvas** — 55 nodos, `MAX_DIST` 145, repulsión del mouse (120 px), loop `requestAnimationFrame`; colores según tema.
4. **BinaryField** — texto 0/1 en `#binaryField`, cambia 15 bits cada 300 ms (setInterval).
5. **TypedBadge** — efecto máquina de escribir con array `phrases` en `#typedBadge`.
6. **SplitName** — parte `[data-split]` en `.word > .char` (aria-label conserva el texto; la última palabra lleva `.word--accent`).
7. **ParallaxEngine** — GSAP 3.12 + ScrollTrigger; se desactiva entero con `prefers-reduced-motion`.
   - *Entrada* (todas las anchuras): letras suben desde una máscara, `.profile-media` se revela con clip-path, esquinas escalan, stat cards se revelan.
   - *Escena fijada* (`buildScene`, ≥993px, se construye al terminar la entrada): hero con `pin` (`end: +=90%`, `scrub 0.8`, `refreshPriority: 1`). La grilla hace zoom, el campo binario se aleja, los símbolos salen hacia la cámara, el nombre se desarma letra por letra, el resto del texto se desvanece con blur y la foto gira hacia el centro mientras la img se recorta en "visor" (`CROP`) y las esquinas siguen el recorte.
   - *Mouse* (≥993px, puntero fino): `quickTo` por capa según profundidad; la foto se inclina (rotationX/Y).
   - *Secciones*: `.section-index` con yPercent ±45 (trigger: su encabezado), `.achievement-parallax` con yPercent ±7, `.code-snippet` flota (≥769px).
   - **Regla clave**: cada efecto usa propiedades distintas en el mismo elemento (entrada: yPercent/scale/clip-path; scroll: x/y/rotation/opacity; mouse: xPercent/yPercent o rotationX/Y). GSAP escribe `translate/scale: none` en línea, así que los elementos que anima NO deben centrarse con `translate` CSS ni tener `transition` sobre transform; las flotaciones CSS (`floatY`) usan la propiedad `translate` en keyframes (las animaciones CSS sí ganan al estilo en línea).
8. **RevealObserver** — IntersectionObserver sobre `[data-reveal]` → clase `.revealed`; también dispara barras.
9. **AptitudeBars** (+ función global `triggerBars`) — rellena `.apt-fill` según `data-width`.
10. **HeaderScroll** — clase `.scrolled` en header tras 50 px (variable `last` sin uso).
11. **MobileMenu** — abre/cierra `#navLinks`, bloquea scroll del body.
12. **SmoothScroll** — anclas `#...` con offset −80 px.
13. **MagneticCards** — tilt 3D en `.aptitude-card` (escribe `style.transform`; no animar esas cards con GSAP).
14. **CursorGlow** — resplandor que sigue el cursor en el hero (solo ≥1024 px), por transform con `gsap.quickTo`.
Al final: `console.log` de bienvenida "v2.0".

## 7. src/style.css — secciones numeradas
1 Design tokens (`:root` oscuro + `[data-theme="light"]`) · 2 Reset/base · 3 Scroll progress · 4 Network canvas · 5 Container (max 1120px) · 6 Header · 7 Theme toggle · 8 Hamburger · 9 Buttons · 10 Section common (+ `.section-index`) · 11 Parallax layers (binary, float-sym, keyframe `floatY` con `translate`) · 12 Hero (`.hero-grid`, `.hero-content` con `perspective`, nombre partido `.word/.char`, badge, `.profile-media`, profile-frame, stat-card, scroll-hint) · 13 About (code-snippet, skills) · 14 Aptitudes (progress bar) · 15 Projects showcase (`.achievement-parallax`) · 16 Footer · 17 Reveal animations (ease expo-out) · 18 Responsive (breakpoints 992 / 768 / 480) + `prefers-reduced-motion` (sin movimiento espacial, mantiene fundidos).

Tokens clave: `--bg-base/surface/card`, `--text-main/muted`, `--accent` (#4ea8de oscuro / #1e6bbf claro), `--accent-2` (mint), `--font-display/body/code`, `--radius-*`, `--shadow-*`. Cambios de color/tema se hacen aquí.

## 8. Dónde tocar para…
- Cambiar textos/datos personales, proyectos, skills → `index.html`.
- Cambiar CV → reemplazar PDF en `public/fotos/` y mantener el href de `index.html` (hero, línea ~94).
- Añadir proyecto/logro → nuevo `.achievement-card` en `#proyectos`.
- Ajustar parallax → módulo 7 de `main.js` (duración del pin: `end: '+=90%'`; recorte del visor: `CROP`; profundidades del mouse: array `layers`).
- Colores / tipografía / tema → tokens en `style.css` sección 1.
- Frases del badge → array `phrases` (módulo 5).

## 9. Observaciones / deuda conocida
- `public/ejemplos/*.txt` y `Captura de pantalla APTITUDES.png` no se usan en la app.
- El panel de preview oculto de Claude pausa `requestAnimationFrame`: al probar ahí, forzar `setInterval(() => gsap.ticker.tick(), 16)` desde la consola o la entrada se queda congelada.
- El detector de impeccable marca la grilla del hero (`.hero-grid`) como patrón genérico (advertencia); se mantuvo por ser parte de la identidad actual.
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
- 2026-10-18 · index.html, src/main.js, src/style.css · Parallax rehecho como "profundidad por capas": entrada con máscara, hero fijado con escena 3D (el nombre se desarma, la foto se convierte en visor), parallax por mouse, números de sección con contorno y parallax interno en las fotos de premios. También se corrigieron el bucle rAF duplicado al cambiar de tema, el selector `.project-card` obsoleto, CursorGlow (ahora por transform) y el conflicto de animaciones en About. Se quitó el texto con degradado del nombre (ahora "Nicolás" en texto principal y "Londoño" en acento).
- 2026-10-18 · HISTORIAL.md · creado.
