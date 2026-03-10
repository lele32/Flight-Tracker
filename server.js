const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 3000;

// Habilitar CORS para todos los orígenes en desarrollo
app.use(cors());
app.use(express.json());

function haversineDistanceKm(lat1, lon1, lat2, lon2) {
    const toRad = (deg) => (deg * Math.PI) / 180;
    const R = 6371;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c);
}

function pickFlightCandidate(items) {
    return (items || []).find((flight) => {
        const dep = flight?.departure;
        const arr = flight?.arrival;
        return dep?.airport && arr?.airport;
    });
}

async function getAirportDetails(iataCode, apiKey) {
    const iata = String(iataCode || '').trim().toUpperCase();
    if (!iata) return null;

    const url = `https://api.aviationstack.com/v1/airports?access_key=${encodeURIComponent(apiKey)}&iata_code=${encodeURIComponent(iata)}&limit=1`;
    const response = await fetch(url);
    if (!response.ok) return null;

    const payload = await response.json();
    const airport = payload?.data?.[0];
    const lat = Number(airport?.latitude);
    const lon = Number(airport?.longitude);
    const hasCoords = Number.isFinite(lat) && Number.isFinite(lon);

    return { 
        lat: hasCoords ? lat : null,
        lon: hasCoords ? lon : null,
        city: airport?.city || null,
        country: airport?.country_name || airport?.country_iso2 || null,
        airportName: airport?.airport_name || null
    };
}

app.get('/lookupFlight', async (req, res) => {
    // Autenticación desactivada para desarrollo local
    
    const flightNumberRaw = String(req.query.flightNumber || '').trim().toUpperCase();
    if (!/^[A-Z0-9-]{3,8}$/.test(flightNumberRaw)) {
        return res.status(400).json({ error: 'invalid-flight-number' });
    }

    const apiKey = '737c0c899deb095b6fa805974f9c2b7b';

    try {
        const flightsUrl = `https://api.aviationstack.com/v1/flights?access_key=${encodeURIComponent(apiKey)}&flight_iata=${encodeURIComponent(flightNumberRaw)}&limit=10`;
        const flightsResponse = await fetch(flightsUrl);
        if (!flightsResponse.ok) {
            return res.status(502).json({ error: 'provider-unavailable' });
        }

        const flightsPayload = await flightsResponse.json();
        if (flightsPayload?.error) {
            console.warn('Aviationstack error', flightsPayload.error);
            return res.status(200).json({ found: false });
        }

        const item = pickFlightCandidate(flightsPayload?.data);
        if (!item) {
            return res.status(200).json({ found: false });
        }

        const departure = item.departure || {};
        const arrival = item.arrival || {};

        const depDetails = await getAirportDetails(departure.iata, apiKey);
        const arrDetails = await getAirportDetails(arrival.iata, apiKey);

        const origin = depDetails?.city || departure.city || departure.airport || departure.iata || 'Desconocido';
        const destination = arrDetails?.city || arrival.city || arrival.airport || arrival.iata || 'Desconocido';

        let distance = 1000;
        let country = arrDetails?.country || arrival.country || 'Desconocido';
        if (depDetails?.lat != null && depDetails?.lon != null && arrDetails?.lat != null && arrDetails?.lon != null) {
            distance = haversineDistanceKm(depDetails.lat, depDetails.lon, arrDetails.lat, arrDetails.lon);
        }

        res.status(200).json({
            found: true,
            origin,
            destination,
            distance: Math.max(100, distance),
            country,
            departureIata: departure.iata || null,
            arrivalIata: arrival.iata || null
        });
    } catch (error) {
        console.error('lookupFlight failed', error);
        res.status(500).json({ error: 'internal-error' });
    }
});

app.listen(PORT, () => {
    console.log(`✅ Backend corriendo en http://localhost:${PORT}`);
    console.log(`   Endpoint: http://localhost:${PORT}/lookupFlight`);
});
