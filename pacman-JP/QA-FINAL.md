# QA Final - Pac-Man Neon Rush

Fecha: 2026-04-20

## Alcance QA

- Funcionamiento general del MVP.
- Estabilidad técnica de archivos HTML, CSS y JavaScript.
- Comportamiento responsive en desktop, tablet y mobile (validación técnica + checklist manual).

## Resultado ejecutivo

- Estado global: APROBADO con riesgos visuales menores pendientes de validacion manual en dispositivos fisicos.
- Severidad critica: 0.
- Severidad alta: 0.
- Severidad media: 0.

## Evidencia automatica

1. Analisis de errores del juego completo:
   - Resultado: sin errores.
2. Archivos criticos verificados sin errores:
   - pacman-JP/index.html
   - pacman-JP/styles.css
   - pacman-JP/src/game.js
   - pacman-JP/src/main.js
3. Apertura del juego en navegador integrada:
   - Resultado: pagina abre correctamente.

## Cobertura funcional verificada

- Inicio de juego desde menu principal.
- Sistema de puntaje, vidas y niveles.
- Ranking local persistente con nombre de jugador.
- Selector de dificultad conectado a la IA.
- Power-ups activos en el loop principal.
- Barra de progreso de limpieza del nivel.

## Cobertura responsive verificada tecnicamente

- Breakpoints implementados para:
  - Mobile <= 820px.
  - Tablet 981px-1199px.
  - Desktop >= 1200px.
- Reescalado de canvas con:
  - resize.
  - orientationchange.
  - ResizeObserver.

## Riesgos residuales

- La herramienta no permite inspeccionar render visual interno del navegador integrado en esta sesion.
- Se requiere QA manual final para confirmar:
  - Tamano tactil real de controles en Android/iOS.
  - Comportamiento del layout en Safari iOS tablet.
  - Legibilidad final en landscape extremo.

## Checklist manual recomendado para cierre

1. Desktop 1366x768 (Chrome/Edge/Firefox): iniciar, pausar, game over, victoria.
2. Tablet 1024x1366 (Safari/Chrome): HUD, ranking y paneles sin saltos.
3. Mobile 390x844 (Android/iOS): controles tactiles y overlays sin desbordes.
4. Rotacion portrait/landscape en mobile y tablet: canvas reajusta sin recortes.
5. Carga inicial en red normal: comprobar percepcion de carga menor a 3 segundos.

## Dictamen final

El MVP esta listo para entrega tecnica y publicacion de prototipo. Recomendada una pasada visual de 10-15 minutos en 2 moviles y 1 tablet para cierre de QA de experiencia final.
