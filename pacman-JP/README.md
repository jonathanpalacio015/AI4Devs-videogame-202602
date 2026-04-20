# Pac-Man Neon Rush (MVP)

Prototipo moderno del clásico Pac-Man, construido para navegador con enfoque retro-futurista, rendimiento fluido y base modular para escalar.

## Stack tecnológico

- HTML5 + CSS3 responsive
- JavaScript ES Modules (sin build step)
- Canvas 2D para render en tiempo real
- Web Audio API para feedback sonoro inmediato

## Características del MVP

- Pantalla de inicio con CTA claro
- Un juego completo con:
  - generación procedural de laberintos por nivel
  - sistema de puntuación y vidas
  - ranking local Top 5 persistente (localStorage) con nombre de jugador
  - selector de dificultad (fácil, normal, difícil)
  - barra de progreso de limpieza del nivel
  - IA enemiga adaptable al progreso del jugador
  - curva de dificultad rebalanceada (más justa con pocas vidas)
  - power-ups: ralentizar fantasmas, teletransporte y escudo temporal
  - animaciones de victoria y derrota
- Controles de teclado (flechas y WASD) y táctiles (mobile)
- Diseño responsive para desktop y mobile

## Arquitectura

Estructura modular:

- `index.html`: layout, HUD, menú, overlays y controles mobile
- `styles.css`: estilo retro-futurista, responsive y animaciones
- `src/main.js`: bootstrap de la app
- `src/game.js`: loop principal, estados, colisiones y render
- `src/maze.js`: generación procedural de nivel
- `src/entities/player.js`: lógica de Pac-Man
- `src/entities/ghost.js`: IA enemiga + pathfinding BFS
- `src/systems/input.js`: teclado + touch
- `src/systems/audio.js`: efectos sonoros Web Audio
- `src/systems/ui.js`: HUD, overlays y feedback visual
- `src/systems/leaderboard.js`: persistencia del ranking local

## Objetivos de performance

- Carga rápida (<3s en navegadores estándar, al no depender de bundling ni assets pesados)
- Render eficiente por frame con Canvas
- Lógica desacoplada para facilitar optimización futura

## Cómo ejecutarlo localmente

1. Ejecución directa (sin servidor): abre `pacman-JP/index.html` con doble clic.
  - En modo `file:///`, el juego carga `dist/pacman.bundle.js` (incluido en el repo).
2. Ejecución por servidor local (recomendado para desarrollo):
  - `python -m http.server 8080`
  - abre `http://localhost:8080/pacman-JP/`
3. También puedes entrar al índice principal `index.html` y seleccionar Pac-Man Neon Rush.

## Verificación de funcionamiento y responsividad

Validaciones técnicas aplicadas en esta iteración:

- Sin errores de análisis en HTML, CSS y JavaScript de los archivos principales.
- Render estable con canvas buffer fijo `756x756` y escalado visual mediante CSS (patrón recomendado para navegadores desktop/mobile).
- Breakpoints específicos:
  - Mobile: <= 820px (controles táctiles visibles, botones ampliados, canvas ajustado).
  - Tablet: 981px-1199px (HUD en 3 columnas y canvas optimizado).
  - Desktop: >= 1200px (layout en dos columnas para juego + paneles).
- Ejecución en navegador responsivo (desktop y celulares) sin build step, vía servidor estático o apertura directa del `index.html`.

Matriz sugerida de prueba manual rápida:

1. Desktop 1366x768: iniciar partida, pausar, completar nivel.
2. Tablet 1024x1366: jugar con touch y verificar HUD/progreso.
3. Mobile 390x844: controles táctiles, overlay y ranking sin desbordes.
4. Rotación portrait/landscape: comprobar reescalado del canvas.

## Publicación como enlace web (GitHub Pages)

1. Sube cambios al repositorio remoto.
2. En GitHub: `Settings > Pages`.
3. Selecciona branch `main` y carpeta `/ (root)`.
4. El enlace final quedará con formato:
   - `https://LIDR-academy.github.io/AI4Devs-videogame-202602/pacman-JP/`

## Prompts utilizados

1. "Crear una versión moderna y mejorada del clásico Pac-Man, optimizada para ejecutarse directamente en navegadores (desktop y mobile), que conserve la esencia nostálgica pero introduzca innovación en jugabilidad, diseño y escalabilidad."
2. "Implementar MVP con inicio, nivel procedural jugable, power-ups, IA adaptable, sistema de vidas/puntos y controles táctiles + teclado."
3. "Diseñar interfaz retro-futurista, minimalista y vibrante con feedback visual y sonoro inmediato."
4. "Documentar arquitectura modular, stack y roadmap para futuras expansiones de monetización y multijugador."

## Roadmap de mejoras (iteraciones)

1. Rankings online persistentes (API + tabla global).
2. Multiplayer competitivo (WebSocket) con salas.
3. Sistema de skins y personalización visual.
4. Modo historia por biomas y eventos dinámicos.
5. Monetización: skins premium y niveles temáticos.
