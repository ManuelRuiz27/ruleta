# Torneo Ruleta Mundialista

Aplicacion local React + Vite + TypeScript para una dinamica de asignacion por ruleta con participantes, banderas definitivas, capturas automaticas y tablero de grupos.

## Ejecutar

```bash
npm install
npm run dev
```

La app queda disponible en la URL que imprima Vite, normalmente `http://localhost:5173/`.

## Assets

El logo institucional principal esta en:

```txt
public/assets/recurso-3.png
```

Coloca las imagenes reales en:

```txt
public/participants/participante-01.png
public/participants/participante-02.png
...
public/participants/participante-16.png

public/flags/Alemania.jpg
public/flags/Argentina.jpg
...
```

Si falta una imagen, la interfaz muestra un placeholder y el flujo sigue funcionando.

## Uso

- `Espacio`, `Enter` o `Iniciar ruleta` arrancan una ronda.
- `Capturar resultado` guarda la captura de la ruleta en el siguiente slot del tablero.
- `Exportar tablero` descarga una imagen PNG del area de grupos.
- `Reiniciar torneo` limpia asignaciones y `localStorage`.
