# Plan de responsive total (tablet + PC, excluyendo celulares)

Este documento define una estrategia responsive para **tablets y equipos de escritorio** basada en anchos de viewport usados globalmente en dispositivos comunes de múltiples fabricantes.

## 1) Rango soportado

- **No objetivo:** celulares (<768px).
- **Objetivo principal:** tablets y PC desde **768px hasta 4K+**.

## 2) Breakpoints aplicados

- **768–834px**: Tablet compacta (iPad mini, Galaxy Tab 8", Lenovo M8/M9 en horizontal).
- **835–1024px**: Tablet estándar (iPad 10.2/10.9, Xiaomi Pad, Huawei MatePad, Surface Go).
- **1025–1280px**: Tablet grande / laptop compacta (iPad Pro 11", Chromebooks 11").
- **1281–1366px**: Laptops HD comunes (1366×768; gama masiva en LATAM, Asia, África y Europa).
- **1367–1440px**: Laptops/QHD de productividad.
- **1441–1920px**: Desktop Full HD y QHD.
- **1921px+**: Monitores ultrawide, 2K y 4K.

## 3) Reglas de implementación en el sitio

1. `viewport` estándar web:
   - `width=device-width, initial-scale=1`.
2. Para anchos menores de 768px:
   - Se fija `min-width: 768px` y `overflow-x: auto` para **dejar fuera móviles** sin romper layout.
3. Ajustes progresivos por breakpoint:
   - Escalado de `max-width` del contenedor principal (`.sitewrap`).
   - Compactación de paddings en tablets.
   - Ajuste de tipografía y paneles para pantallas anchas (`1921px+`).
4. En páginas con panel lateral (lector principal):
   - En tablet, el aside sticky pasa a flujo normal para evitar choque vertical.

## 4) Cobertura internacional (referencia de familias)

- **Apple:** iPad mini, iPad, iPad Air, iPad Pro.
- **Samsung:** Galaxy Tab A/S (8" a 12.4").
- **Huawei:** MatePad series.
- **Xiaomi/Redmi:** Pad series.
- **Lenovo:** Tab M/P series.
- **Microsoft:** Surface Go/Pro (modos tablet y laptop).
- **Chromebook/PC global:** 1280, 1366, 1440, 1600, 1920 y superiores.

## 5) Checklist de validación sugerido

- Verificar lectura bíblica en paralelo a 768, 834, 1024, 1280, 1366, 1440, 1920 y 2560.
- Revisar barra superior, formularios, botones y paneles.
- Confirmar ausencia de solapamientos en encabezados sticky.
- Confirmar que en <768px se mantiene scroll horizontal intencional.
