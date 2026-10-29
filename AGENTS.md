Reglas para los agentes que trabajen en este repositorio.

1. No matar procesos globales del sistema
Nunca ejecutes un comando que afecte a todos los procesos de un tipo del sistema. El usuario puede tener sus propias ventanas abiertas, con sesión iniciada o con trabajo sin guardar, y un Stop-Process en cascada se lo lleva.

Prohibido:

Get-Process chrome -ErrorAction SilentlyContinue | Stop-Process -Force
Ojo con el detalle de por qué engaña: Get-Process chrome devuelve todos los chrome.exe de la máquina, no solo las instancias que levantó el agente. El -ErrorAction SilentlyContinue y el | Out-Null lo hacen parecer limpio en la consola mientras destruye la sesión del usuario.

Vale igual para cualquier otro proceso: node, python, msedge.

2. Chrome headless: perfil aislado y PID propio
Para las capturas y las medidas con CDP, hay que lanzar una instancia propia que se pueda identificar y cerrar sin tocar nada ajeno.

Cada launch usa un --user-data-dir exclusivo, dentro de la carpeta temporal aprobada (%LOCALAPPDATA%\Temp\opencode), y se guarda el PID:

$perfil = "$env:LOCALAPPDATA\Temp\opencode\chrome-<algo-unico>"
$p = Start-Process -FilePath $chrome -WindowStyle Hidden -PassThru -ArgumentList @(
  "--headless=new", "--disable-gpu", "--hide-scrollbars",
  "--no-first-run", "--no-default-browser-check",
  "--user-data-dir=$perfil", "--remote-debugging-port=9222", "about:blank"
)
Al terminar, se cierra solo esa instancia. O por el PID guardado:

Stop-Process -Id $p.Id -Force
O, si hay procesos hijos y hace falta barrer la familia entera, filtrando por el perfil propio en la línea de comandos:

Get-CimInstance Win32_Process -Filter "Name='chrome.exe'" |
  Where-Object { $_.CommandLine -like "*$perfil*" } |
  ForEach-Object { Stop-Process -Id $_.ProcessId -Force }
Ese filtro por --user-data-dir es lo que hace seguro el paso: nunca coincide con el Chrome del usuario.

Dos trampas de headless, ya medidas
--window-size NO emula un móvil. Sin Emulation.setDeviceMetricsOverride, el headless ignora el <meta name="viewport"> y mide contra el viewport de escritorio. Una captura a "375px" sale con el layout de ~980px y produce diagnósticos falsos. Siempre Emulation.setDeviceMetricsOverride con mobile: true, y Emulation.setFocusEmulationEnabled antes de medir :focus.
Vite devuelve 200 OK con index.html (~650 bytes) para cualquier ruta inexistente, por el fallback de SPA. Un .jpg donde va un .jpeg no falla en las pruebas de red: se ve como un 200 normal. Lo que delata la imagen rota es el tamaño de la respuesta, muy lejos de los cientos de KB reales.
3. No crear archivos dentro del proyecto sin que se pidan
Los scripts de inspección, capturas y perfiles van a la carpeta temporal aprobada, nunca a la raíz del repo. Se borran al terminar.

Si de verdad hace falta un archivo temporal dentro del proyecto —para que Vite lo sirva, por ejemplo—, se nombra con _ al principio (_inspect.mjs, _diag.html), se avisa y se borra en la misma sesión. No queda en el repositorio.

4. No commitear hasta que se pidan
No hagas git commit ni git push por tu cuenta. Acumula los cambios y espera a que el usuario diga que commitee. Si el usuario lo pide, haz un solo commit con todo lo acumulado.

Esto evita saturar el historial con commits de cosas pequeñas.

Comandos de verificación
Antes de dar cualquier cambio por terminado:

npm run lint        # oxlint
npm run test:todo   # test + test:render + test:humo
npm run build       # vite build
Los tres deben pasar. test:todo incluye el render de las 39 rutas y la revisión de enlaces internos.

Convenciones del código
Comentarios y textos de interfaz en español, sin tildes (es lo que usa todo el repo: escucharia, publico, seccion).
Todo va estrictamente en orden alfabetico: listas de items en las tarjetas del home, arrays de modelos, marcas, secciones del submenu, opciones de menus desplegables y cualquier enumeracion visible o interna. Si se agrega un elemento nuevo, se inserta en su posicion alfabetica, no al final.
Los comentarios explican por qué, no qué hace el código, y son cortos: de 2 a 4 líneas. Nada de bloques de 40 líneas recontando lo que ya se ve en el JSX, ni de etiquetas de sección ({/* Hero */}, {/* Cifras clave */}), que no aportan nada. Lo que sí se escribe, aunque ocupe tres líneas, es la razón de una decisión que no se deduce del código: por qué un object-top, por qué un id con guiones, por qué el filtro vive en otro archivo, por qué un dato se dejó fuera. Cuando el motivo sea largo, se corta a lo que hace falta para no volver a meter lo mismo.
Sin caracteres CJK ni basura de otro idioma en el código: se coló un 若有 en un comentario y hubo que barrer src/ entero.
Ojo con el Preflight de Tailwind: pone font-size: inherit en h1..h6. Un título con solo md:text-6xl se renderiza a 16px por debajo del breakpoint, más pequeño que su propio párrafo.
Lo que hay dentro de public/ se sirve desde la raíz: /categorias/x.jpeg, nunca /public/categorias/x.jpeg.
