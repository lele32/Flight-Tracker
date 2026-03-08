import { collection, getDocs, addDoc, deleteDoc, updateDoc } from 'https://www.gstatic.com/firebasejs/12.10.0/firebase-firestore.js';

// Variable global para almacenar el mapa de Leaflet
let map = null;
let markers = {};
let allFlights = []; // Guardar todos los vuelos para filtrado
let currentPeriod = 'total'; // Período actual seleccionado
let currentTripType = 'all'; // Tipo de viaje seleccionado
let currentFlightData = null; // Datos del vuelo actual cargado desde la BD
let flightLines = []; // Almacenar las líneas de vuelo

// Base de datos de vuelos simulados
const flightDatabase = {
    // Aeromexico
    'AM': { airline: 'Aeromexico', routes: {
        '190': { destination: 'Nueva York', distance: 8500, country: 'Estados Unidos' },
        '191': { destination: 'México', distance: 2500, country: 'México' },
        '192': { destination: 'Los Ángeles', distance: 9000, country: 'Estados Unidos' }
    }},
    // American Airlines
    'AA': { airline: 'American Airlines', routes: {
        '100': { destination: 'Nueva York', distance: 8500, country: 'Estados Unidos' },
        '101': { destination: 'Miami', distance: 4500, country: 'Estados Unidos' },
        '102': { destination: 'Chicago', distance: 7500, country: 'Estados Unidos' },
        '953': { destination: 'Nueva York', distance: 8500, country: 'Estados Unidos' },
        '950': { destination: 'Los Ángeles', distance: 9000, country: 'Estados Unidos' },
        '951': { destination: 'Miami', distance: 4500, country: 'Estados Unidos' },
        '952': { destination: 'Chicago', distance: 7500, country: 'Estados Unidos' }
    }},
    // British Airways
    'BA': { airline: 'British Airways', routes: {
        '200': { destination: 'Londres', distance: 11000, country: 'Reino Unido' },
        '201': { destination: 'Manchester', distance: 11200, country: 'Reino Unido' }
    }},
    // Air France
    'AF': { airline: 'Air France', routes: {
        '300': { destination: 'París', distance: 10500, country: 'Francia' },
        '301': { destination: 'Lyon', distance: 10700, country: 'Francia' }
    }},
    // Lufthansa
    'LH': { airline: 'Lufthansa', routes: {
        '400': { destination: 'Berlín', distance: 12000, country: 'Alemania' },
        '401': { destination: 'Múnich', distance: 12200, country: 'Alemania' },
        '402': { destination: 'Fráncfort', distance: 11800, country: 'Alemania' }
    }},
    // Alitalia
    'AZ': { airline: 'Alitalia', routes: {
        '500': { destination: 'Roma', distance: 11500, country: 'Italia' },
        '501': { destination: 'Milán', distance: 11700, country: 'Italia' }
    }},
    // Iberia
    'IB': { airline: 'Iberia', routes: {
        '600': { destination: 'Madrid', distance: 10000, country: 'España' },
        '601': { destination: 'Barcelona', distance: 10100, country: 'España' }
    }},
    // KLM
    'KL': { airline: 'KLM', routes: {
        '700': { destination: 'Ámsterdam', distance: 11000, country: 'Países Bajos' }
    }},
    // Japan Airlines
    'JL': { airline: 'Japan Airlines', routes: {
        '800': { destination: 'Tokio', distance: 18000, country: 'Japón' },
        '801': { destination: 'Osaka', distance: 18200, country: 'Japón' }
    }},
    // Qantas
    'QF': { airline: 'Qantas', routes: {
        '900': { destination: 'Sídney', distance: 12000, country: 'Australia' },
        '901': { destination: 'Melbourne', distance: 11800, country: 'Australia' }
    }}
};

// Colores por aerolínea
const airlineColors = {
    'AM': '#FF6B35', // Aeromexico - Naranja rojizo
    'AA': '#0073CF', // American Airlines - Azul
    'BA': '#2E5C99', // British Airways - Azul oscuro
    'AF': '#002157', // Air France - Azul marino
    'LH': '#E31937', // Lufthansa - Rojo
    'AZ': '#0066CC', // Alitalia - Azul claro
    'IB': '#D71920', // Iberia - Rojo
    'KL': '#00A1E4', // KLM - Azul cielo
    'JL': '#ED1A3A', // Japan Airlines - Rojo
    'QF': '#E31837'  // Qantas - Rojo
};

// Mensaje de inicio
console.log('%c✈️ Flight Tracker iniciado', 'color: #667eea; font-size: 16px; font-weight: bold;');
console.log('%cNota: Los errores de "SES" o "runtime.lastError" son de extensiones del navegador, no de la app', 'color: #FFB800; font-size: 12px;');

// Esperar a que Firebase esté listo
document.addEventListener('DOMContentLoaded', () => {
    console.log('%c📡 Inicializando componentes...', 'color: #667eea; font-size: 12px;');
    initializeMap();
    setupFilters();
    loadFlights();
    setupForm();
});

function initializeMap() {
    // Crear el mapa centrado en el mundo
    map = L.map('map').setView([20, 0], 2);
    
    // Estilo oscuro minimalista alineado con la UI
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '© OpenStreetMap contributors © CARTO',
        maxZoom: 20,
        subdomains: 'abcd'
    }).addTo(map);
}

function setupFilters() {
    const radios = document.querySelectorAll('input[name="period"]');
    radios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            currentPeriod = e.target.value;
            processFlights(allFlights);
        });
    });

    const tripTypeFilter = document.getElementById('trip-type-filter');
    if (tripTypeFilter) {
        tripTypeFilter.addEventListener('change', (e) => {
            currentTripType = e.target.value;
            processFlights(allFlights);
        });
    }
}

function lookupFlight(flightNumber) {
    const code = flightNumber.substring(0, 2).toUpperCase();
    const number = flightNumber.substring(2).toUpperCase();
    
    if (flightDatabase[code] && flightDatabase[code].routes[number]) {
        return flightDatabase[code].routes[number];
    }
    return null;
}

async function setupForm() {
    const form = document.getElementById('flight-form');
    const flightNumberInput = document.getElementById('flight-number');
    const categoryInput = document.getElementById('category');
    const dateInput = document.getElementById('date');
    const loadSampleBtn = document.getElementById('load-sample');
    const submitBtn = document.getElementById('submit-btn');
    const flightInfo = document.getElementById('flight-info');
    const flightError = document.getElementById('flight-error');
    const openRegisterModalBtn = document.getElementById('open-register-modal');
    const closeRegisterModalBtn = document.getElementById('close-register-modal');
    const modalOverlay = document.getElementById('modal-overlay');
    const flightModal = document.getElementById('flight-modal');

    const openModal = () => {
        flightModal.classList.remove('modal-hidden');
        flightModal.classList.add('modal-visible');
        flightModal.setAttribute('aria-hidden', 'false');
    };

    const closeModal = () => {
        flightModal.classList.add('modal-hidden');
        flightModal.classList.remove('modal-visible');
        flightModal.setAttribute('aria-hidden', 'true');
    };

    openRegisterModalBtn.addEventListener('click', openModal);
    closeRegisterModalBtn.addEventListener('click', closeModal);
    modalOverlay.addEventListener('click', closeModal);
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && flightModal.classList.contains('modal-visible')) {
            closeModal();
        }
    });

    flightNumberInput.addEventListener('blur', () => {
        const flightNumber = flightNumberInput.value.trim();
        if (flightNumber.length >= 3) {
            const flightData = lookupFlight(flightNumber);
            if (flightData) {
                currentFlightData = flightData;
                document.getElementById('info-origin').textContent = 'Buenos Aires';
                document.getElementById('info-destination').textContent = flightData.destination;
                document.getElementById('info-distance').textContent = flightData.distance + ' km';
                document.getElementById('info-country').textContent = flightData.country;
                flightInfo.style.display = 'block';
                flightError.style.display = 'none';
                submitBtn.disabled = false;
            } else {
                flightInfo.style.display = 'none';
                flightError.style.display = 'block';
                flightError.textContent = `❌ Vuelo no encontrado. Ingresa un número válido (ej: AM190, BA200, LH400)`;
                submitBtn.disabled = true;
                currentFlightData = null;
            }
        }
    });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        if (!currentFlightData) {
            alert('Por favor, ingresa un número de vuelo válido');
            return;
        }

        const flightNumber = flightNumberInput.value.trim();
        const date = dateInput.value;
        const category = categoryInput.value;
        const origin = 'Buenos Aires';
        const destination = currentFlightData.destination;
        const distance = currentFlightData.distance;
        const country = currentFlightData.country;

        try {
            await addDoc(collection(window.db, 'flights'), {
                origin,
                destination,
                distance,
                date,
                country,
                flightNumber,
                category
            });
            console.log(`%c✅ Vuelo ${flightNumber} registrado exitosamente`, 'color: #28a745; font-size: 12px;');
            alert(`✈️ Vuelo ${flightNumber} registrado exitosamente`);
            form.reset();
            flightInfo.style.display = 'none';
            flightError.style.display = 'none';
            submitBtn.disabled = true;
            currentFlightData = null;
            loadFlights(); // Recargar datos
            closeModal();
        } catch (error) {
            console.error('Error registrando vuelo:', error);
            alert('Error registrando vuelo');
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
    // Primero, borrar todos los vuelos existentes
    try {
        const querySnapshot = await getDocs(collection(window.db, 'flights'));
        for (const doc of querySnapshot.docs) {
            await deleteDoc(doc.ref);
        }
        console.log('%c🗑️ Base de datos limpiada', 'color: #FFA500; font-size: 12px;');
    } catch (error) {
        console.warn('No se pudieron borrar los datos antiguos:', error);
    }

    const sampleFlights = [
        // American Airlines - Azul (#0073CF)
        { origin: 'Buenos Aires', destination: 'Nueva York', distance: 8500, date: '2025-01-15', country: 'Estados Unidos', flightNumber: 'AA953' },
        { origin: 'Buenos Aires', destination: 'Nueva York', distance: 8500, date: '2025-02-20', country: 'Estados Unidos', flightNumber: 'AA100' },
        { origin: 'Buenos Aires', destination: 'Miami', distance: 4500, date: '2025-03-10', country: 'Estados Unidos', flightNumber: 'AA951' },
        { origin: 'Buenos Aires', destination: 'Chicago', distance: 7500, date: '2025-04-05', country: 'Estados Unidos', flightNumber: 'AA952' },
        { origin: 'Buenos Aires', destination: 'Los Ángeles', distance: 9000, date: '2025-05-12', country: 'Estados Unidos', flightNumber: 'AA950' },

        // British Airways - Azul oscuro (#2E5C99)
        { origin: 'Buenos Aires', destination: 'Londres', distance: 11000, date: '2025-01-25', country: 'Reino Unido', flightNumber: 'BA200' },
        { origin: 'Buenos Aires', destination: 'Londres', distance: 11000, date: '2025-02-15', country: 'Reino Unido', flightNumber: 'BA200' },
        { origin: 'Buenos Aires', destination: 'Manchester', distance: 11200, date: '2025-03-20', country: 'Reino Unido', flightNumber: 'BA201' },

        // Air France - Azul marino (#002157)
        { origin: 'Buenos Aires', destination: 'París', distance: 10500, date: '2025-02-01', country: 'Francia', flightNumber: 'AF300' },
        { origin: 'Buenos Aires', destination: 'París', distance: 10500, date: '2025-03-15', country: 'Francia', flightNumber: 'AF300' },
        { origin: 'Buenos Aires', destination: 'Lyon', distance: 10700, date: '2025-04-10', country: 'Francia', flightNumber: 'AF301' },

        // Lufthansa - Rojo (#E31937)
        { origin: 'Buenos Aires', destination: 'Berlín', distance: 12000, date: '2025-01-30', country: 'Alemania', flightNumber: 'LH400' },
        { origin: 'Buenos Aires', destination: 'Berlín', distance: 12000, date: '2025-03-05', country: 'Alemania', flightNumber: 'LH400' },
        { origin: 'Buenos Aires', destination: 'Múnich', distance: 12200, date: '2025-04-20', country: 'Alemania', flightNumber: 'LH401' },
        { origin: 'Buenos Aires', destination: 'Fráncfort', distance: 11800, date: '2025-05-15', country: 'Alemania', flightNumber: 'LH402' },

        // Alitalia - Azul claro (#0066CC)
        { origin: 'Buenos Aires', destination: 'Roma', distance: 11500, date: '2025-02-10', country: 'Italia', flightNumber: 'AZ500' },
        { origin: 'Buenos Aires', destination: 'Roma', distance: 11500, date: '2025-04-01', country: 'Italia', flightNumber: 'AZ500' },
        { origin: 'Buenos Aires', destination: 'Milán', distance: 11700, date: '2025-05-05', country: 'Italia', flightNumber: 'AZ501' },

        // Iberia - Rojo (#D71920)
        { origin: 'Buenos Aires', destination: 'Madrid', distance: 10000, date: '2025-01-20', country: 'España', flightNumber: 'IB600' },
        { origin: 'Buenos Aires', destination: 'Madrid', distance: 10000, date: '2025-03-25', country: 'España', flightNumber: 'IB600' },
        { origin: 'Buenos Aires', destination: 'Barcelona', distance: 10100, date: '2025-04-30', country: 'España', flightNumber: 'IB601' },

        // KLM - Azul cielo (#00A1E4)
        { origin: 'Buenos Aires', destination: 'Ámsterdam', distance: 11000, date: '2025-02-05', country: 'Países Bajos', flightNumber: 'KL700' },
        { origin: 'Buenos Aires', destination: 'Ámsterdam', distance: 11000, date: '2025-04-15', country: 'Países Bajos', flightNumber: 'KL700' },

        // Japan Airlines - Rojo (#ED1A3A)
        { origin: 'Buenos Aires', destination: 'Tokio', distance: 18000, date: '2025-01-10', country: 'Japón', flightNumber: 'JL800' },
        { origin: 'Buenos Aires', destination: 'Tokio', distance: 18000, date: '2025-03-30', country: 'Japón', flightNumber: 'JL800' },
        { origin: 'Buenos Aires', destination: 'Osaka', distance: 18200, date: '2025-05-20', country: 'Japón', flightNumber: 'JL801' },

        // Qantas - Rojo (#E31837)
        { origin: 'Buenos Aires', destination: 'Sídney', distance: 12000, date: '2025-02-25', country: 'Australia', flightNumber: 'QF900' },
        { origin: 'Buenos Aires', destination: 'Sídney', distance: 12000, date: '2025-04-25', country: 'Australia', flightNumber: 'QF900' },
        { origin: 'Buenos Aires', destination: 'Melbourne', distance: 11800, date: '2025-05-25', country: 'Australia', flightNumber: 'QF901' },

        // Aeromexico - Naranja rojizo (#FF6B35)
        { origin: 'Buenos Aires', destination: 'Nueva York', distance: 8500, date: '2025-01-05', country: 'Estados Unidos', flightNumber: 'AM190' },
        { origin: 'Buenos Aires', destination: 'México', distance: 2500, date: '2025-02-28', country: 'México', flightNumber: 'AM191' },
        { origin: 'Buenos Aires', destination: 'Los Ángeles', distance: 9000, date: '2025-03-12', country: 'Estados Unidos', flightNumber: 'AM192' }
    ].map((flight, index) => ({
        ...flight,
        category: index % 2 === 0 ? 'Trabajo' : 'Personal'
    }));

    let successCount = 0;
    let errorCount = 0;

    for (const flight of sampleFlights) {
        try {
            await addDoc(collection(window.db, 'flights'), flight);
            successCount++;
        } catch (error) {
            console.error('Error agregando vuelo de ejemplo:', error);
            errorCount++;
        }
    }
    console.log(`%c✅ Datos cargados: ${successCount} vuelos agregados, ${errorCount} errores`, 'color: #28a745; font-size: 12px;');
    alert(`✈️ Se cargaron ${successCount} vuelos de ejemplo exitosamente!\n\nAhora puedes ver:\n• Marcadores de origen por aerolínea en Buenos Aires\n• Marcadores de destino con colores únicos\n• Líneas punteadas conectando cada ruta\n• Popups detallados con información por aerolínea`);
}

async function loadFlights() {
    try {
        const querySnapshot = await getDocs(collection(window.db, 'flights'));
        allFlights = [];
        for (const docSnapshot of querySnapshot.docs) {
            const data = docSnapshot.data();

            // Migra documentos antiguos sin categoria.
            if (!data.category) {
                data.category = 'Personal';
                await updateDoc(docSnapshot.ref, { category: 'Personal' });
            }

            allFlights.push(data);
        }
        console.log(`%c📊 ${allFlights.length} vuelos cargados`, 'color: #28a745; font-size: 12px;');
        processFlights(allFlights);
    } catch (error) {
        console.error('Error loading flights:', error);
        console.warn('Asegúrate de que Firestore esté configurado correctamente');
    }
}

function getFlightsByPeriod(flights, period) {
    if (period === 'total') return flights;
    
    const now = new Date();
    const targetDate = new Date();
    
    switch(period) {
        case '1month':
            targetDate.setMonth(now.getMonth() - 1);
            break;
        case '3months':
            targetDate.setMonth(now.getMonth() - 3);
            break;
        case '1year':
            targetDate.setFullYear(now.getFullYear() - 1);
            break;
        default:
            return flights;
    }
    
    return flights.filter(flight => {
        const flightDate = new Date(flight.date);
        return flightDate >= targetDate;
    });
}

function getFlightsByTripType(flights, tripType) {
    if (tripType === 'all') return flights;
    return flights.filter(flight => (flight.category || 'Personal') === tripType);
}

function processFlights(flights) {
    // Filtrar vuelos según período seleccionado
    const periodFilteredFlights = getFlightsByPeriod(flights, currentPeriod);
    const filteredFlights = getFlightsByTripType(periodFilteredFlights, currentTripType);
    
    // Calcular kilómetros acumulados
    const totalKm = filteredFlights.reduce((sum, flight) => sum + (flight.distance || 0), 0);
    document.getElementById('total-km').textContent = `${totalKm.toLocaleString()} km`;

    // Destinos más frecuentes
    const destinationCount = {};
    filteredFlights.forEach(flight => {
        const dest = flight.destination;
        if (!destinationCount[dest]) {
            destinationCount[dest] = { count: 0, country: flight.country || '' };
        }
        destinationCount[dest].count += 1;
    });
    const sortedDestinations = Object.entries(destinationCount)
        .sort((a, b) => b[1].count - a[1].count)
        .slice(0, 5);
    const destList = document.getElementById('frequent-destinations');
    destList.innerHTML = '';
    sortedDestinations.forEach(([dest, data]) => {
        const li = document.createElement('li');
        li.textContent = `${getCountryFlag(data.country)} ${dest}: ${data.count}`;
        destList.appendChild(li);
    });

    // Países visitados
    const countries = new Set();
    filteredFlights.forEach(flight => {
        if (flight.country) countries.add(flight.country);
    });
    const countryList = document.getElementById('visited-countries');
    countryList.innerHTML = '';
    Array.from(countries).sort().forEach(country => {
        const li = document.createElement('li');
        li.textContent = `${getCountryFlag(country)} ${country}`;
        countryList.appendChild(li);
    });

    // Mapa interactivo
    renderMap(filteredFlights);
}

function renderMap(flights) {
    if (!map) return;

    // Limpiar marcadores y líneas previos
    Object.values(markers).forEach(marker => map.removeLayer(marker));
    markers = {};
    flightLines.forEach(line => map.removeLayer(line));
    flightLines = [];

    // Coordenadas de ciudades
    const cityCoords = {
        'Nueva York': [40.7128, -74.0060],
        'Miami': [25.7617, -80.1918],
        'Chicago': [41.8781, -87.6298],
        'Los Ángeles': [34.0522, -118.2437],
        'México': [19.4326, -99.1332],
        'Londres': [51.5074, -0.1278],
        'Manchester': [53.4808, -2.2426],
        'París': [48.8566, 2.3522],
        'Lyon': [45.7640, 4.8357],
        'Tokio': [35.6762, 139.6503],
        'Osaka': [34.6937, 135.5023],
        'Sídney': [-33.8688, 151.2093],
        'Melbourne': [-37.8136, 144.9631],
        'Roma': [41.9028, 12.4964],
        'Madrid': [40.4168, -3.7038],
        'Barcelona': [41.3851, 2.1734],
        'Berlín': [52.5200, 13.4050],
        'Múnich': [48.1351, 11.5820],
        'Fráncfort': [50.1109, 8.6821],
        'Ámsterdam': [52.3676, 4.9041],
        'Buenos Aires': [-34.6037, -58.3816]
    };

    // Coordenadas de Buenos Aires (origen)
    const buenosAiresCoords = cityCoords['Buenos Aires'];

    // Filtrar vuelos que tengan flightNumber
    const validFlights = flights.filter(f => f.flightNumber);

    // Agrupar vuelos por aerolínea
    const flightsByAirline = {};
    validFlights.forEach(flight => {
        const airlineCode = flight.flightNumber.substring(0, 2).toUpperCase();
        if (!flightsByAirline[airlineCode]) {
            flightsByAirline[airlineCode] = [];
        }
        flightsByAirline[airlineCode].push(flight);
    });

    // Crear marcadores para cada aerolínea en Buenos Aires (origen)
    Object.entries(flightsByAirline).forEach(([airlineCode, airlineFlights]) => {
        const airlineColor = airlineColors[airlineCode] || '#0A84FF';
        const airlineName = flightDatabase[airlineCode]?.airline || airlineCode;
        const totalFlights = airlineFlights.length;
        const totalDistance = airlineFlights.reduce((sum, f) => sum + f.distance, 0);
        const topDestination = airlineFlights[0]?.destination;
        const topCountry = airlineFlights[0]?.country;

        // Crear popup para el marcador de origen
        const originPopupContent = `
            <div style="font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif; min-width: 250px;">
                <h3 style="margin: 0 0 10px 0; color: ${airlineColor};">🏠 ${airlineName} - Buenos Aires</h3>
                <p style="margin: 5px 0; color: #d1d5db;"><strong>Vuelos Salientes:</strong> ${totalFlights}</p>
                <p style="margin: 5px 0; color: #d1d5db;"><strong>Distancia Total:</strong> ${totalDistance.toLocaleString()} km</p>
                <p style="margin: 5px 0; color: #d1d5db;"><strong>Ruta destacada:</strong> ${getCountryFlag(topCountry)} ${topDestination || 'N/A'}</p>
                <hr style="border: none; border-top: 1px solid #343434; margin: 10px 0;">
                <div style="max-height: 200px; overflow-y: auto; font-size: 12px;">
                    ${airlineFlights.map(f => `<div style="padding: 5px 0; border-bottom: 1px solid #2a2a2a; color: #ebebeb;">
                        <strong>${f.flightNumber}</strong> → ${getCountryFlag(f.country)} ${f.destination}<br>
                        <small style="color: #a3a3a3;">${f.date} - ${f.distance} km - ${getCategoryBadge(f.category)}</small>
                    </div>`).join('')}
                </div>
            </div>
        `;

        // Crear marcador de origen con color de aerolínea
        const originMarkerIcon = L.divIcon({
            className: 'origin-marker',
            html: `<div class="origin-marker-inner" style="background: linear-gradient(135deg, ${airlineColor}, ${airlineColor}dd); border-color: ${airlineColor};"></div>`,
            iconSize: [20, 20],
            iconAnchor: [10, 10],
            popupAnchor: [0, -10]
        });

        const originMarker = L.marker(buenosAiresCoords, {icon: originMarkerIcon})
            .bindPopup(originPopupContent)
            .addTo(map);

        markers[`origin_${airlineCode}`] = originMarker;
    });

    // Agrupar vuelos por aerolínea y destino para crear líneas por aerolínea
    const flightRoutes = {};
    validFlights.forEach(flight => {
        const airlineCode = flight.flightNumber.substring(0, 2).toUpperCase();
        const destination = flight.destination;
        const key = `${airlineCode}_${destination}`;
        if (!flightRoutes[key]) {
            flightRoutes[key] = {
                airline: airlineCode,
                destination: destination,
                flights: []
            };
        }
        flightRoutes[key].flights.push(flight);
    });

    // Crear líneas punteadas y marcadores de destino por aerolínea
    const destMarkers = {}; // Para evitar duplicar marcadores de destino
    
    Object.entries(flightRoutes).forEach(([routeKey, route]) => {
        const destCoords = cityCoords[route.destination];
        if (destCoords && buenosAiresCoords) {
            const airlineColor = airlineColors[route.airline] || '#0A84FF';

            // Crear línea punteada para esta ruta específica de aerolínea
            const flightLine = L.polyline([buenosAiresCoords, destCoords], {
                color: airlineColor,
                weight: 2,
                opacity: 0.8,
                dashArray: '10, 10',
                className: 'flight-route'
            }).addTo(map);

            flightLines.push(flightLine);
        }
    });

    // Agrupar vuelos por destino para crear marcadores
    const flightsByDestination = {};
    validFlights.forEach(flight => {
        if (!flightsByDestination[flight.destination]) {
            flightsByDestination[flight.destination] = {};
        }
        const airlineCode = flight.flightNumber.substring(0, 2).toUpperCase();
        if (!flightsByDestination[flight.destination][airlineCode]) {
            flightsByDestination[flight.destination][airlineCode] = [];
        }
        flightsByDestination[flight.destination][airlineCode].push(flight);
    });

    // Crear marcadores de destino
    Object.entries(flightsByDestination).forEach(([destination, airlines]) => {
        const destCoords = cityCoords[destination];
        if (destCoords && buenosAiresCoords) {
            // Obtener el primer airline para el color del marcador
            const airlineCodes = Object.keys(airlines);
            const primaryAirline = airlineCodes[0];
            const markerColor = airlineColors[primaryAirline] || '#0A84FF';
            
            // Crear HTML personalizado para el popup
            const totalFlights = Object.values(airlines).flat().length;
            const totalDistance = Object.values(airlines).flat().reduce((sum, f) => sum + f.distance, 0);

            const airlineDetails = Object.entries(airlines).map(([airlineCode, flightList]) => {
                const airlineName = flightDatabase[airlineCode]?.airline || airlineCode;
                const flightNumbers = flightList.map(f => f.flightNumber).join(', ');
                return `<div style="margin: 8px 0; padding: 8px; background: rgba(255,255,255,0.1); border-radius: 5px; border-left: 3px solid ${airlineColors[airlineCode] || '#0A84FF'};">
                    <strong style="color: ${airlineColors[airlineCode] || '#0A84FF'};">${airlineName}</strong><br>
                    <small style="color: #d4d4d4;">Vuelos: ${flightNumbers}</small><br>
                    <small style="color: #d4d4d4;">Cantidad: ${flightList.length}</small><br>
                    <small style="color: #d4d4d4;">Categorias: ${Array.from(new Set(flightList.map(f => getCategoryBadge(f.category)))).join(', ')}</small>
                </div>`;
            }).join('');

            const popupContent = `
                <div style="font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif; min-width: 280px;">
                    <h3 style="margin: 0 0 10px 0; color: #0f5ba8;">✈️ ${getCountryFlag(Object.values(airlines)[0][0]?.country)} ${destination}</h3>
                    <p style="margin: 5px 0; color: #d1d5db;"><strong>Total de Vuelos:</strong> ${totalFlights}</p>
                    <p style="margin: 5px 0; color: #d1d5db;"><strong>Distancia Total:</strong> ${totalDistance.toLocaleString()} km</p>
                    <hr style="border: none; border-top: 1px solid #343434; margin: 10px 0;">
                    <div style="max-height: 250px; overflow-y: auto; font-size: 12px;">
                        ${airlineDetails}
                        <hr style="border: none; border-top: 1px solid #343434; margin: 10px 0;">
                        <div style="font-weight: 600; margin-bottom: 8px; color: #e7e7e7;">Todos los vuelos:</div>
                        ${Object.values(airlines).flat().map(f => `<div style="padding: 5px 0; border-bottom: 1px solid #2a2a2a; color: #d4d4d4;">
                            <strong style="color: ${airlineColors[f.flightNumber.substring(0, 2).toUpperCase()] || '#0A84FF'};">${f.flightNumber}</strong> - ${f.date} - ${f.distance} km - ${getCategoryBadge(f.category)}
                        </div>`).join('')}
                    </div>
                </div>
            `;

            // Crear marcador personalizado con color de aerolínea
            const markerIcon = L.divIcon({
                className: 'custom-marker',
                html: `<div class="marker-inner" style="background: linear-gradient(135deg, ${markerColor}, ${markerColor}dd);"></div>`,
                iconSize: [24, 24],
                iconAnchor: [12, 12],
                popupAnchor: [0, -12]
            });

            const marker = L.marker(destCoords, {icon: markerIcon})
                .bindPopup(popupContent)
                .addTo(map);

            markers[destination] = marker;
        }
    });
}

function getCountryFlag(country) {
    const countryFlags = {
        'Estados Unidos': '🇺🇸',
        'México': '🇲🇽',
        'Reino Unido': '🇬🇧',
        'Francia': '🇫🇷',
        'Alemania': '🇩🇪',
        'Italia': '🇮🇹',
        'España': '🇪🇸',
        'Países Bajos': '🇳🇱',
        'Japón': '🇯🇵',
        'Australia': '🇦🇺',
        'Argentina': '🇦🇷'
    };

    return countryFlags[country] || '🏳️';
}

function getCategoryBadge(category) {
    return category === 'Trabajo' ? '💼 Trabajo' : '🧳 Personal';
}