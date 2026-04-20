# Prompts utilizados

## Prompt maestro

> Usado como instrucción única para generar el 100 % de la aplicación tal como está construida.

```
Crea desde cero un videojuego completo llamado "Sir-pac", clon moderno del clásico
Pac-Man, que corra directamente en navegadores (desktop y mobile) sin dependencias
externas ni build step obligatorio. El resultado final debe ser un conjunto de
archivos listos para abrir con doble clic (file://) o mediante un servidor HTTP simple.

─── STACK Y ARQUITECTURA ───────────────────────────────────────────────────────

Lenguajes: HTML5, CSS3, JavaScript (ES Modules en desarrollo;
           IIFE bundle en dist/pacman.bundle.js para ejecución file://).
Render:    Canvas 2D con buffer fijo 756×756 px escalado vía CSS.
Audio:     Web Audio API (sin archivos externos).
Estructura de archivos:

  pacman-JP/
  ├── index.html
  ├── styles.css
  ├── dist/
  │   └── pacman.bundle.js        ← bundle IIFE generado con esbuild
  └── src/
      ├── main.js                 ← bootstrap y bindings de UI
      ├── game.js                 ← loop principal, estados, render
      ├── constants.js            ← TILE, DIRS, POWERUP_TYPES, FRUIT_TYPES, BOARD_SIZE=21
      ├── maze.js                 ← generación procedural de laberinto por nivel
      ├── utils.js                ← clamp, choice, distance, randInt
      ├── entities/
      │   ├── player.js           ← lógica Pac-Man
      │   └── ghost.js            ← IA enemiga BFS con normalización wrapX
      └── systems/
          ├── input.js            ← teclado (flechas/WASD) + touch
          ├── audio.js            ← efectos sonoros procedurales
          ├── ui.js               ← HUD, overlays, flash, leaderboard DOM
          └── leaderboard.js      ← Top 5 persistente en localStorage

index.html detecta el protocolo en tiempo de carga:
  - file://  → carga dist/pacman.bundle.js como script normal
  - http(s)  → carga src/main.js como type="module"

─── GAMEPLAY Y MECÁNICAS ───────────────────────────────────────────────────────

Niveles:     3 niveles MVP con laberintos procedurales distintos por nivel.
Vidas:       3 vidas; perder todas → Game Over con overlay de reintento.
Puntuación:  pellet=10 pts, energizador=60 pts, power-up=90 pts,
             fruta bonus=140+(nivel×20) pts, fantasma capturado=200 pts,
             nivel completado=350 pts.

Power-ups (3 tipos, aparición procedural en el laberinto):
  - Slow      → ralentiza fantasmas 7 s (color cyan)
  - Teleport  → teletransporta al jugador a celda segura (color dorado)
  - Shield    → escudo 8 s; al colisionar con fantasma normal lo regenera (color lima)

Energizadores: activan modo vulnerable en todos los fantasmas durante 7 s.
Fruta bonus:   aparece en el centro cada 11-19 s; desaparece a los 8 s.

Fantasmas (4, con roles BFS):
  - Blinky (rojo)   → persigue directamente
  - Pinky (rosa)    → embosca 4 tiles adelante del jugador
  - Inky (cyan)     → combinación Blinky + Pinky (impredecible)
  - Clyde (naranja) → persigue si está lejos (>5.5 tiles), huye si está cerca
  Todos usan BFS con normalización wrapX para el túnel horizontal.
  repathInterval = 0.28 s. Velocidad escalada por nivel, progreso y dificultad.

Temporizador por stage:
  - Tiempos base: nivel 1=120 s, nivel 2=100 s, nivel 3=85 s
  - Multiplicador: fácil×1.4, normal×1.0, difícil×0.7
  - Al llegar a 0 → el jugador pierde una vida y el timer se reinicia.
  - Últimos 10 s → el dígito parpadea en rojo (.timer-urgent).

Dificultad (selector en menú): fácil | normal | difícil
  - Afecta difficultyFactor (0.9 / 1.0 / 1.14) sobre velocidad de fantasmas.

─── LOOP Y RENDIMIENTO ─────────────────────────────────────────────────────────

Estado running → requestAnimationFrame puro (dt clampeado a 40 ms).
Estado idle (menu/paused/gameover/victory) → setTimeout(90 ms) + RAF para
  evitar un hot loop.
Render throttle: full FPS en running; 33 ms en animaciones de muerte/victoria;
  125 ms en idle completo.
Agresividad de fantasmas: calculada UNA vez por frame fuera del bucle de ghosts.
  fórmula: clamp((1 + level×0.085 + elapsed/130 + progress×0.42 + lifeAssist)
           × difficultyFactor, 0.94, 1.82)

─── INTERFAZ Y DISEÑO ──────────────────────────────────────────────────────────

Paleta retro-futurista: fondo #0a0f1f, acentos cyan #4becff, dorado #ffd447,
  rosa #ff4f8c, lima #99ff7f.
Tipografía: Orbitron (títulos/HUD) + Exo 2 (texto), cargadas desde Google Fonts.

Layout de una sola columna centrada (max-width 860 px) con el laberinto como
elemento principal. Orden visual de arriba hacia abajo:
  1. Header (nombre Sir-pac + subtítulo)
  2. Menú (nombre de jugador, selector de dificultad, botón Jugar/Cómo jugar)
  3. Canvas del laberinto (centrado, escalado con CSS hasta 780 px)
  4. Barra inferior de stats:
       [Puntaje grande — dorado] | [Vidas · Nivel · Estado · Top local] | [Tiempo grande — cyan]
  5. Barra de progreso de limpieza del nivel
  6. Controles táctiles (visible solo en mobile/touch)
  7. Panel de instrucciones (oculto, toggle con "Cómo jugar")
  8. Leaderboard Top 5 local

Overlays de nivel/gameover/victoria centrados sobre el canvas.
Flash verde al completar nivel, flash rosa al recibir daño.
Animación de muerte: Pac-Man se encoge en su posición.

Breakpoints responsive:
  ≤520 px  → stats comprimidos, texto reducido
  ≤820 px  → controles táctiles visibles, canvas max-height 52vh
  ≤980 px  → menú en columna
  981-1199 → canvas hasta 720 px
  ≥1200 px → canvas hasta 780 px

─── SALIDA ESPERADA ────────────────────────────────────────────────────────────

Genera TODOS los archivos completos sin placeholders.
Al terminar, el juego debe:
  ✓ Abrirse con doble clic en index.html (usa dist/pacman.bundle.js)
  ✓ Funcionar en http://localhost:8080/pacman-JP/ con ES Modules nativos
  ✓ Mostrar menú, iniciar partida, jugar 3 niveles y llegar a pantalla de victoria
  ✓ Guardar y mostrar Top 5 en localStorage
  ✓ Responder a teclado (flechas/WASD) y controles táctiles
  ✓ No lanzar errores de consola en Chrome/Firefox/Safari modernos
```

---

## Prompts de refinamiento aplicados

Después del prompt maestro se aplicaron los siguientes ajustes en orden:

1. **Corrección de módulo roto** — "Hay un error de parseo en game.js por llaves extra al final del archivo; corrígelo sin alterar la lógica."
2. **Soporte file://** — "El juego no carga con doble clic porque los ES Modules están bloqueados en file://. Genera un bundle IIFE con esbuild y agrégalo; el index.html debe detectar el protocolo y cargar el bundle o los módulos según corresponda."
3. **Fix crash BFS** — "Se produce `Set maximum size exceeded` en ghost.js durante el pathfinding. El bug está en que las coordenadas X del túnel horizontal no se normalizan con wrapX antes de insertarlas en el Set de visitados."
4. **Fix inestabilidad / freeze** — "El juego se congela tras varios minutos. Reemplaza el RAF continuo en estados idle por setTimeout(90ms)+RAF, añade throttle de render por estado y mueve getAggressionFactor() fuera del bucle de fantasmas."
5. **Timer por stage** — "Añadir un temporizador regresivo por nivel cuyo tiempo inicial dependa del número de nivel y la dificultad seleccionada. Al agotarse, el jugador pierde una vida y el timer se reinicia. Mostrar en HUD con parpadeo rojo en los últimos 10 s."
6. **Layout: laberinto centrado, stats abajo** — "Mover el HUD de estadísticas (puntaje y tiempo prominentes, resto mini) a una barra debajo del canvas. El leaderboard va al final de la página. El laberinto debe quedar centrado en una columna de max-width 860 px en todas las resoluciones."
