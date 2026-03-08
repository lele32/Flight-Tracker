import { collection, getDocs, addDoc } from 'https://www.gstatic.com/firebasejs/12.10.0/firebase-firestore.js';

// Esperar a que Firebase esté listo
document.addEventListener('DOMContentLoaded', () => {
    loadFlights();
    setupForm();
});

async function setupForm() {
    const form = document.getElementById('flight-form');
    const loadSampleBtn = document.getElementById('load-sample');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const origin = document.getElementById('origin').value;
        const destination = document.getElementById('destination').value;
        const distance = parseInt(document.getElementById('distance').value);
        const date = document.getElementById('date').value;
        const country = document.getElementById('country').value;

        try {
            await addDoc(collection(window.db, 'flights'), {
                origin,
                destination,
                distance,
                date,
                country
            });
            alert('Vuelo agregado exitosamente');
            form.reset();
            loadFlights(); // Recargar datos
        } catch (error) {
            console.error('Error agregando vuelo:', error);
            alert('Error agregando vuelo');
        }
    });

    loadSampleBtn.addEventListener('click', async () => {
        if (confirm('¿Cargar 30 vuelos de ejemplo? Esto puede tomar un momento.')) {
            await loadSampleData();
            loadFlights();
        }
    });
}

async function loadSampleData() {
    const sampleFlights = [
        { origin: 'Buenos Aires', destination: 'Nueva York', distance: 8500, date: '2023-01-15', country: 'Estados Unidos' },
        { origin: 'Buenos Aires', destination: 'Londres', distance: 11000, date: '2023-02-20', country: 'Reino Unido' },
        { origin: 'Buenos Aires', destination: 'París', distance: 10500, date: '2023-03-10', country: 'Francia' },
        { origin: 'Buenos Aires', destination: 'Tokio', distance: 18000, date: '2023-04-05', country: 'Japón' },
        { origin: 'Buenos Aires', destination: 'Sídney', distance: 12000, date: '2023-05-12', country: 'Australia' },
        { origin: 'Buenos Aires', destination: 'Roma', distance: 11500, date: '2023-06-18', country: 'Italia' },
        { origin: 'Buenos Aires', destination: 'Madrid', distance: 10000, date: '2023-07-22', country: 'España' },
        { origin: 'Buenos Aires', destination: 'Berlín', distance: 12000, date: '2023-08-08', country: 'Alemania' },
        { origin: 'Buenos Aires', destination: 'Ámsterdam', distance: 11000, date: '2023-09-14', country: 'Países Bajos' },
        { origin: 'Buenos Aires', destination: 'Nueva York', distance: 8500, date: '2023-10-20', country: 'Estados Unidos' },
        { origin: 'Buenos Aires', destination: 'Londres', distance: 11000, date: '2023-11-25', country: 'Reino Unido' },
        { origin: 'Buenos Aires', destination: 'París', distance: 10500, date: '2023-12-01', country: 'Francia' },
        { origin: 'Buenos Aires', destination: 'Tokio', distance: 18000, date: '2024-01-10', country: 'Japón' },
        { origin: 'Buenos Aires', destination: 'Sídney', distance: 12000, date: '2024-02-15', country: 'Australia' },
        { origin: 'Buenos Aires', destination: 'Roma', distance: 11500, date: '2024-03-20', country: 'Italia' },
        { origin: 'Buenos Aires', destination: 'Madrid', distance: 10000, date: '2024-04-25', country: 'España' },
        { origin: 'Buenos Aires', destination: 'Berlín', distance: 12000, date: '2024-05-30', country: 'Alemania' },
        { origin: 'Buenos Aires', destination: 'Ámsterdam', distance: 11000, date: '2024-06-05', country: 'Países Bajos' },
        { origin: 'Buenos Aires', destination: 'Nueva York', distance: 8500, date: '2024-07-10', country: 'Estados Unidos' },
        { origin: 'Buenos Aires', destination: 'Londres', distance: 11000, date: '2024-08-15', country: 'Reino Unido' },
        { origin: 'Buenos Aires', destination: 'París', distance: 10500, date: '2024-09-20', country: 'Francia' },
        { origin: 'Buenos Aires', destination: 'Tokio', distance: 18000, date: '2024-10-25', country: 'Japón' },
        { origin: 'Buenos Aires', destination: 'Sídney', distance: 12000, date: '2024-11-30', country: 'Australia' },
        { origin: 'Buenos Aires', destination: 'Roma', distance: 11500, date: '2024-12-05', country: 'Italia' },
        { origin: 'Buenos Aires', destination: 'Madrid', distance: 10000, date: '2025-01-10', country: 'España' },
        { origin: 'Buenos Aires', destination: 'Berlín', distance: 12000, date: '2025-02-15', country: 'Alemania' },
        { origin: 'Buenos Aires', destination: 'Ámsterdam', distance: 11000, date: '2025-03-20', country: 'Países Bajos' },
        { origin: 'Buenos Aires', destination: 'Nueva York', distance: 8500, date: '2025-04-25', country: 'Estados Unidos' },
        { origin: 'Buenos Aires', destination: 'Londres', distance: 11000, date: '2025-05-30', country: 'Reino Unido' },
        { origin: 'Buenos Aires', destination: 'París', distance: 10500, date: '2025-06-05', country: 'Francia' }
    ];

    for (const flight of sampleFlights) {
        try {
            await addDoc(collection(window.db, 'flights'), flight);
        } catch (error) {
            console.error('Error agregando vuelo de ejemplo:', error);
        }
    }
    alert('Datos de ejemplo cargados');
}

async function loadFlights() {
    try {
        const querySnapshot = await getDocs(collection(window.db, 'flights'));
        const flights = [];
        querySnapshot.forEach((doc) => {
            flights.push(doc.data());
        });
        processFlights(flights);
    } catch (error) {
        console.error('Error loading flights:', error);
    }
}

function processFlights(flights) {
    // Calcular kilómetros acumulados
    const totalKm = flights.reduce((sum, flight) => sum + (flight.distance || 0), 0);
    document.getElementById('total-km').textContent = `${totalKm.toLocaleString()} km`;

    // Destinos más frecuentes
    const destinationCount = {};
    flights.forEach(flight => {
        const dest = flight.destination;
        destinationCount[dest] = (destinationCount[dest] || 0) + 1;
    });
    const sortedDestinations = Object.entries(destinationCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);
    const destList = document.getElementById('frequent-destinations');
    destList.innerHTML = '';
    sortedDestinations.forEach(([dest, count]) => {
        const li = document.createElement('li');
        li.textContent = `${dest}: ${count} vuelo(s)`;
        destList.appendChild(li);
    });

    // Países visitados
    const countries = new Set();
    flights.forEach(flight => {
        if (flight.country) countries.add(flight.country);
    });
    const countryList = document.getElementById('visited-countries');
    countryList.innerHTML = '';
    Array.from(countries).sort().forEach(country => {
        const li = document.createElement('li');
        li.textContent = country;
        countryList.appendChild(li);
    });

    // Mapa interactivo
    renderMap(flights);
}

function renderMap(flights) {
    const mapDiv = document.getElementById('map');
    mapDiv.innerHTML = ''; // Limpiar

    // Coordenadas aproximadas de ciudades (puedes expandir esta lista)
    const cityCoords = {
        'Nueva York': [40.7128, -74.0060],
        'Londres': [51.5074, -0.1278],
        'París': [48.8566, 2.3522],
        'Tokio': [35.6762, 139.6503],
        'Sídney': [-33.8688, 151.2093],
        'Roma': [41.9028, 12.4964],
        'Madrid': [40.4168, -3.7038],
        'Berlín': [52.5200, 13.4050],
        'Ámsterdam': [52.3676, 4.9041]
        // Agrega más ciudades según sea necesario
    };

    flights.forEach(flight => {
        const coords = cityCoords[flight.destination];
        if (coords) {
            const marker = document.createElement('div');
            marker.className = 'marker';
            marker.style.left = `${(coords[1] + 180) / 360 * 100}%`;
            marker.style.top = `${(90 - coords[0]) / 180 * 100}%`;
            marker.title = `${flight.destination} - ${flight.distance} km`;
            marker.addEventListener('click', () => {
                alert(`Destino: ${flight.destination}\nDistancia: ${flight.distance} km\nFecha: ${flight.date}`);
            });
            mapDiv.appendChild(marker);
        }
    });
}