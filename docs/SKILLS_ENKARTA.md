# Skills de diseño y estructura de Enkarta

Configuradas el 15 de octubre de 2026. Instalación de usuario en la carpeta `skills` de Codex; las reglas específicas de Enkarta viven en `AGENTS.md`, `PRODUCT.md` y `DESIGN.md`. No se copian ejecutables ni catálogos a `public/` y no son dependencias de la aplicación. Las versiones y la adaptación local se registran en `docs/skills-lock.json`, que es un inventario documental, no un cargador de skills.

## Cuándo usar cada una

| Skill | Función en Enkarta | Límite |
| --- | --- | --- |
| `impeccable` | Dirección y refinamiento visual; revisión de jerarquía, textos, navegación y coherencia. | Documentar y preservar lo existente; rediseñar solo la superficie solicitada. |
| `ui-ux-pro-max` | Consulta local de patrones y alternativas cuando la tarea requiera exploración. | Sus resultados son propuestas; no reemplazan el sistema existente ni los originales. |
| `web-design-guidelines` | Revisión de interacción, accesibilidad, formularios y móvil en los archivos afectados. | Leer las pautas oficiales actuales al revisar; sus hallazgos no autorizan cambios fuera del encargo. |
| `vercel-react-best-practices` | Rendimiento de React/Next.js, carga y consultas. | Filtrar por las versiones instaladas y conservar privacidad, permisos y comportamiento. |
| `vercel-composition-patterns` | Componentes reutilizables, variantes y estado compartido. | Componer no significa uniformar diseños; omitir las APIs exclusivas de React 19. |

Elegir la guía que corresponda al problema. En un trabajo visual amplio, Impeccable conduce la propuesta; UI UX Pro Max aporta consultas puntuales, las guías web revisan interacción y las skills de Vercel atienden la implementación. No ejecutar cinco auditorías completas para cada cambio pequeño.

## Conservación de invitaciones

El catálogo y la landing pueden mostrar invitaciones sin cambiar su diseño. El portal puede mejorar sus controles sin imponer su tema al lienzo. Los componentes compartidos y el CSS global requieren comprobar las variantes que consumen ese código.

Consultar primero `docs/INVITALI_RECURSOS.md`, `src/lib/invitation-assets.ts` y los manifiestos. No regenerar fotos, música, fuentes ni animaciones archivadas. No recomprimir o reserializar originales como supuesto paso de instalación u optimización. Mantener la URL completa, SHA-256 y biblioteca reutilizable; cualquier derivado se identifica por separado.

No se silencian reglas completas del detector ni se excluyen todas las invitaciones para evitar hallazgos. Un problema de accesibilidad se registra y se corrige en el ámbito autorizado, conservando el resto del diseño.

## Compatibilidad y ejecución en Windows

Estado verificado en `package.json`: Next.js 15.5.28, React 18, Tailwind CSS 3 y TypeScript. No aplicar `Activity`, `useEffectEvent`, `use()` ni recetas de refs de React 19; tampoco sintaxis de configuración de Tailwind 4. No actualizar dependencias para hacer coincidir un ejemplo externo.

Las cinco skills se invocan en Codex con su nombre, por ejemplo:

```text
$impeccable polish src/components/admin/host/HostRoster.tsx
$web-design-guidelines src/components/admin/host/HostRoster.tsx
$vercel-react-best-practices revisa el rendimiento del constructor sin modificar sus diseños
$vercel-composition-patterns revisa los componentes del constructor preservando las variantes
$ui-ux-pro-max consulta patrones de navegación móvil para el panel de Enkarta
```

Para ejecutar las herramientas desde PowerShell, resolver la carpeta de instalación sin asumir el directorio de trabajo:

```powershell
$enkartaSkillsRoot = if ($env:CODEX_HOME) {
    Join-Path $env:CODEX_HOME 'skills'
} else {
    Join-Path $env:USERPROFILE '.codex\skills'
}

python (Join-Path $enkartaSkillsRoot 'ui-ux-pro-max\scripts\search.py') 'keyboard focus modal' --domain ux --json
python (Join-Path $enkartaSkillsRoot 'ui-ux-pro-max\scripts\search.py') 'render performance' --stack react --json
& (Join-Path $enkartaSkillsRoot 'impeccable\scripts\impeccable.cmd') context --target src/components/admin/host/HostRoster.tsx
```

UI UX Pro Max se instaló con sus scripts, referencias y datos. Se adaptaron únicamente las rutas de su `SKILL.md` para resolver la carpeta real de la skill en Codex, en vez de una variable exclusiva de Claude. No se modificaron sus algoritmos ni catálogos.

El motor oficial de Impeccable se descarga mediante su lanzador, fijado por `scripts/VERSION` y verificado contra el SHA-256 publicado. No forma parte del despliegue web. Los hooks automáticos quedan desactivados en `.impeccable/config.json`; las skills funcionan por invocación y selección contextual de Codex. Esta configuración no instala un hook que reaccione a cada edición. La elección entre diseñar primero una imagen o implementar directamente queda sin fijar porque no se ha pedido una superficie nueva.

## Verificación y mantenimiento

- Las cinco carpetas deben contener `SKILL.md`; las guías extensas incluyen sus reglas y referencias, no solo el archivo de entrada.
- Verificar frontmatter con `skill-creator/scripts/quick_validate.py` cuando se adapte una skill.
- Verificar una búsqueda real de UI UX Pro Max y el lanzador/contexto de Impeccable; no basta con listar las carpetas.
- Mantener versiones fijadas. Una actualización requiere revisar cambios y conservar la adaptación de rutas y las reglas de este proyecto; no ejecutar actualización automática por una tarea visual corriente.
- Para cambios posteriores de código, ejecutar las comprobaciones pertinentes de `package.json`; una instalación de herramientas no acredita regresiones de la aplicación ni conformidad visual.

BCP permanece desactivado. La configuración de skills no cambia proveedores de pago, variables de Vercel, datos de Supabase ni publicaciones.

## Resultado de la instalación

- Cinco skills válidas según el validador oficial; 226 archivos de origen comprobados contra los commits fijados. La única adaptación de contenido es la resolución de rutas en el `SKILL.md` de UI UX Pro Max.
- Dos búsquedas reales de UI UX Pro Max devolvieron resultados; Impeccable resolvió este proyecto, `PRODUCT.md`, `DESIGN.md` y un componente existente. Su consulta de estado confirmó los hooks desactivados y ninguna regla de auditoría silenciada.
- Se compararon por SHA-256 los 885 archivos presentes en `src/`, `public/` e `Iconos INVITALI/` antes y después: cero modificados, eliminados o añadidos en esas carpetas.
- No se ejecutó un build ni la suite de la aplicación porque no cambió su código. No se desplegó ni se hicieron operaciones de base de datos o bancarias.

Evidencia resumida y versiones: `docs/skills-lock.json`. Las skills estarán disponibles para los siguientes mensajes de Codex.

## Skill de fidelidad Invitali · 22 de octubre de 2026

La skill adicional `enkarta-invitali-fidelity` vive en `.agents/skills/enkarta-invitali-fidelity/` dentro del repositorio y se instala también en la carpeta de skills del usuario. Se usa para analizar o reproducir una muestra específica, conservando las otras variantes. Su procedencia es el análisis público de 30 páginas y 31 hojas CSS enlazadas de Invitali; el inventario de URLs y hashes está en sus referencias.

No añade WordPress ni Elementor a Enkarta, no cambia precios ni recursos y no demuestra equivalencia visual. Distingue CSS declarado, estilo computado y comportamiento observado. El navegador automatizado está deshabilitado en esta sesión: el análisis no acredita «idéntico sin diferencias» ni un constructor privado. Para replicar una muestra, compara recursos completos y composición en ambos tamaños cuando exista acceso visual.

La instalación del proyecto usa la ubicación de descubrimiento `.agents/skills/enkarta-invitali-fidelity/`. `AGENTS.md` remite a esta copia local para mantener el criterio del proyecto. La copia de usuario anterior permanece disponible; no se fusionan sus instrucciones automáticamente.

### Comparación renderizada posterior · 22 de octubre de 2026

Tras reiniciar la aplicación, el navegador integrado quedó operativo. La limitación descrita en el estudio inicial ya no impide inspeccionar las muestras públicas. Se compararon Paradise de Invitali y Verdealma de Enkarta a 390 × 844 y 1440 × 900, con capturas de entrada y regiones abiertas, estilos computados y registro de diferencias. El resultado está en [COMPARACION_VISUAL_INVITALI_PARADISE.md](COMPARACION_VISUAL_INVITALI_PARADISE.md).

La evidencia confirma que la variante actual difiere en entrada, geometría, fuentes, fondos, fotografías, iconos, cronograma y hospedaje. No se modificaron sus recursos ni se certificaron las demás variantes. Una futura reproducción requiere un perfil independiente y verificación de recursos por URL/hash. No se midieron Core Web Vitals ni se certificó equivalencia temporal de animaciones o archivos tipográficos cargados.
