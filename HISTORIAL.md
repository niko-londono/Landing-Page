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
index.html            345 líneas — TODO el marcado (única página)
src/main.js           594 líneas — toda la lógica, IIFEs numeradas
src/style.css        1184 líneas — todo el estilo, secciones numeradas
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
| `#inicio .hero` | capas parallax (`.layer-deep` con `#binaryField`, `.layer-mid` con `.float-sym`), `#typedBadge`, h1 nombre, descripción, botones (Ver proyectos, Descargar CV), LinkedIn, foto `.profile-frame` con `.stat-card` (3+ años / ∞), `.scroll-hint` |
| `#sobre-mi .about` | texto, `.code-snippet` (profile.js decorativo), `.skills-block` con `.skill-tag` (Power BI, Oracle, SAS EG, Linux/Git, SQL Server, SAS DI) |
| `#aptitudes .aptitudes` | 5 `.aptitude-card` con barra `.apt-fill[data-width]` (Problem Solving 90, Analytical 88, Databases 82, Data Analytics 78, Data Migration 75) |
| `#proyectos .projects` | un solo `.project-showcase`: "MIGRACIÓN CORE BPD" + `.achievements-grid` con 3 `.achievement-card` (DEP2024, DEP2025, DEP2025_2) |
| `footer#contacto` | CTA mailto `niko_londono@hotmail.com`, copyright 2026, "Built with Vite + Vanilla JS" |

Atributos de animación: `data-reveal="up|left|right"` (revelado por scroll), `data-parallax*`, `style="--delay:Xs"` en cards.
Datos personales editables: textos en el HTML; email y LinkedIn en hero/footer.

## 6. src/main.js — módulos (IIFEs, orden del archivo)
1. **ThemeToggle** — `data-theme` en `<html>`, persiste en `localStorage['niko-theme']`, respeta `prefers-color-scheme`; llama a `window._networkDraw`.
2. **ScrollProgress** — ancho de `#scroll-progress`.
3. **NetworkCanvas** — 55 nodos, `MAX_DIST` 145, repulsión del mouse (120 px), loop `requestAnimationFrame`; colores según tema.
4. **BinaryField** — texto 0/1 en `#binaryField`, cambia 15 bits cada 300 ms (setInterval).
5. **TypedBadge** — efecto máquina de escribir con array `phrases` en `#typedBadge`.
6. **ParallaxEngine** — GSAP ScrollTrigger con `scrub`; solo `min-width: 769px` y si no hay `prefers-reduced-motion`. Mueve capas del hero, texto, foto, stat cards, scroll hint, bloques de About y la variable CSS `--grid-opacity`.
7. **RevealObserver** — IntersectionObserver sobre `[data-reveal]` → clase `.revealed`; también dispara barras.
8. **AptitudeBars** (+ función global `triggerBars`) — rellena `.apt-fill` según `data-width`.
9. **HeaderScroll** — clase `.scrolled` en header tras 50 px (variable `last` sin uso).
10. **MobileMenu** — abre/cierra `#navLinks`, bloquea scroll del body.
11. **SmoothScroll** — anclas `#...` con offset −80 px.
12. **MagneticCards** — tilt 3D en `.project-card:not(.project-card--ghost), .aptitude-card` (⚠ `.project-card` ya no existe en el HTML; solo afecta aptitudes).
13. **CursorGlow** — resplandor que sigue el cursor en el hero (solo ≥1024 px).
Al final: `console.log` de bienvenida "v2.0".

## 7. src/style.css — secciones numeradas
1 Design tokens (`:root` oscuro + `[data-theme="light"]`) · 2 Reset/base · 3 Scroll progress · 4 Network canvas · 5 Container (max 1120px) · 6 Header · 7 Theme toggle · 8 Hamburger · 9 Buttons · 10 Section common · 11 Parallax layers (binary, float-sym) · 12 Hero (badge, profile-frame, stat-card, scroll-hint) · 13 About (code-snippet, skills) · 14 Aptitudes (progress bar) · 15 Projects showcase · 16 Footer · 17 Reveal animations · 18 Responsive (breakpoints 992 / 768 / 480) + `prefers-reduced-motion`.

Tokens clave: `--bg-base/surface/card`, `--text-main/muted`, `--accent` (#4ea8de oscuro / #1e6bbf claro), `--accent-2` (mint), `--font-display/body/code`, `--radius-*`, `--shadow-*`. Cambios de color/tema se hacen aquí.

## 8. Dónde tocar para…
- Cambiar textos/datos personales, proyectos, skills → `index.html`.
- Cambiar CV → reemplazar PDF en `public/fotos/` y mantener el href de `index.html` (hero, línea ~94).
- Añadir proyecto/logro → nuevo `.achievement-card` en `#proyectos`.
- Ajustar parallax → módulo 6 de `main.js`.
- Colores / tipografía / tema → tokens en `style.css` sección 1.
- Frases del badge → array `phrases` (módulo 5).

## 9. Observaciones / deuda conocida
- `public/ejemplos/*.txt` y `Captura de pantalla APTITUDES.png` no se usan en la app.
- `MagneticCards` referencia una clase inexistente (`.project-card`).
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
- _(vacío)_
