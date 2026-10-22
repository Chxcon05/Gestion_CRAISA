# Plugin de Figma: CRAISA · Leads UI Kit

Genera 8 pantallas editables (1440x900) con la identidad oficial de CRAISA (basada en el Libro de Marca 2025):

1. Login
2. Dashboard
3. Listado de leads
4. Nuevo lead
5. Detalle del lead
6. Cambio de estado (modal)
7. Exportar CSV (modal)
8. Componentes y tokens

Colores y tipografías extraídos directamente del manual: PMS 7686C (#143F7F), paraguas agrícola/construcción/carga/precisión y sello carbono neutral.

## Requisitos
- Figma Desktop (obligatorio para plugins de desarrollo)
- Conexión a internet solo para cargar fuentes al primer uso

## Cómo importar
1. Abrir Figma Desktop
2. `Plugins > Development > Import plugin from manifest...`
3. Seleccionar `figma-plugin/manifest.json` de este repositorio
4. Ejecutar el plugin desde `Plugins > Development > CRAISA · Leads UI Kit`

## Resultado
Crea una página llamada `CRAISA · Leads UI Kit` con todos los frames organizados horizontalmente, componentes base (badges, botones, inputs, tabla), y el logo de CRAISA incrustado.

## Editar
Todo es vectorial/editable. Si cambias el logo en el PDF, reemplaza `Logo_CRAISA_horizontal__full_color-removebg-preview.png` en `Downloads` y regenera `src/code.js` con `brandkit/extract.mjs` o directamente con sharp (ver notas del proyecto).

## Notas
- Usa datos ficticios (prototipo). No incluye integraciones externas.
- Los colores de líneas de negocio siguen la estrategia paraguas del manual.
- Los estados respetan el flujo definido en el alcance.
