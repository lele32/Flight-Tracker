# Dashboard de Vuelos

Una aplicación web simple para rastrear y visualizar información de vuelos usando HTML, CSS, JavaScript y Firebase.

## Características

- **Kilómetros Acumulados**: Muestra la suma total de distancias de todos los vuelos.
- **Destinos Más Frecuentes**: Lista los 5 destinos más visitados.
- **Países Visitados**: Lista única de países visitados.
- **Mapa Interactivo**: Muestra marcadores rojos en un mapa del mundo para cada destino visitado. Haz clic en un marcador para ver detalles.
- **Formulario de Agregado**: Permite agregar nuevos vuelos manualmente.
- **Carga de Datos de Ejemplo**: Botón para cargar 30 vuelos de ejemplo automáticamente.

## Configuración

1. Crea un proyecto en [Firebase](https://console.firebase.google.com/).
2. Habilita Firestore en tu proyecto.
3. Obtén las claves de configuración de Firebase.
4. Reemplaza los placeholders en `index.html` con tus claves reales (ya están configuradas en el código actual).
5. Asegúrate de que Firestore tenga reglas que permitan lecturas y escrituras (por defecto en modo de prueba).

## Estructura de Datos

Crea una colección llamada `flights` en Firestore con documentos que tengan campos como:
- `origin`: Ciudad de origen
- `destination`: Ciudad de destino
- `distance`: Distancia en km (número)
- `date`: Fecha del vuelo
- `country`: País del destino

## Uso

1. Abre `index.html` en un navegador web.
2. Haz clic en "Cargar Datos de Ejemplo" para poblar la base de datos con 30 vuelos de muestra.
3. Usa el formulario para agregar vuelos manualmente.
4. Los datos se actualizan automáticamente en el dashboard.

## Notas

- El mapa usa una imagen de fondo del mundo. Para un mapa más interactivo, considera integrar una biblioteca como Leaflet.
- Las coordenadas de las ciudades están hardcodeadas en `script.js`. Expándelas según sea necesario.
- Asegúrate de tener una conexión a internet para que funcione Firebase.