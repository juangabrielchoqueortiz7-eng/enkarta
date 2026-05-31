# Elementos de las invitaciones

Sube aquí los elementos que exportes de Canva (orquídeas, coronas, plumas,
corazón, íconos, fondos, etc.). Todo lo que esté en `public/` queda disponible
en la web en la raíz del sitio.

## Dónde subir

Una carpeta por plantilla:

```
public/invitations/
  azure/        ← elementos de Azure  (azul marino / orquídeas)
  primicia/     ← elementos de Primicia (periódico B&N)
  passport/     ← elementos de Passport (verde salvia / viaje)
```

Ejemplo: si subes `public/invitations/azure/corona.svg`, en el código se usa así:

```tsx
<img src="/invitations/azure/corona.svg" alt="" />
```

(la ruta empieza en `/invitations/...`, sin `public`).

## Formato recomendado

1. **SVG** (preferido): es vectorial, se ve nítido en cualquier tamaño y pesa poco.
   - Si el elemento es de **un solo color** (line-art), exporta en SVG y yo puedo
     recolorearlo y animarlo desde el código.
2. **PNG con fondo transparente**: sirve también, pero no se puede recolorear.
   - Exporta a 2x o 3x de tamaño para que no se vea pixelado.

## Nombres sugeridos (para que yo los encuentre fácil)

- `cover-florals.svg` / `corner-florals.svg` — orquídeas de las esquinas
- `wreath.svg` — corona circular con los nombres
- `feather.svg` — pluma
- `heart.svg` — corazón / ornamento
- `divider.svg` — separador floral
- `icon-ceremonia.svg`, `icon-recepcion.svg`, `icon-dresscode.svg`,
  `icon-itinerario-*.svg` — íconos
- `bg.jpg` / `bg.png` — fondo/acuarela

Cuando subas algo, dime el nombre del archivo y reemplazo mis dibujos hechos
a mano por tus elementos de Canva.
