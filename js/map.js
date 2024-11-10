// Initialize the map centered on Greece
const map = L.map('map').setView([37.9838, 23.7275], 6); // Centered near Athens

// Add a base tile layer from OpenStreetMap
L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}', {
    maxZoom: 18,
    attribution: '&copy; Esri, &copy; OpenStreetMap contributors'
}).addTo(map);

// Load itinerary data from CSV
let itineraryData;
loadCSV('data/itinerary.csv').then(data => {
    itineraryData = data;
    addPortsToMap(itineraryData);
});

// Define the default icon (used for each port marker)
const defaultIcon = L.icon({
    iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png', // Default pin icon URL
    iconSize: [25, 41],  // Size of the default marker icon
    iconAnchor: [12, 41],  // Anchor point of the icon (where the marker "sticks" to the map)
    popupAnchor: [0, -41]  // Where the popup will be positioned (above the marker)
});

// Create day label style for markers
const createDayLabel = (day) => {
    return L.divIcon({
        className: 'day-label',
        html: `<div style="font-size: 12px; font-weight: bold; color: white; text-align: center; background-color: black; border-radius: 50%; width: 20px; height: 20px; line-height: 20px;">${day}</div>`,
        iconSize: [20, 20],  // Size of the overlay (day label)
        iconAnchor: [10, 10]  // Anchor point for the overlay to be centered above the marker
    });
};

// Function to add ports and path to the map
function addPortsToMap(data) {
    let pathCoordinates = [];

    // Add markers and store coordinates
    data.forEach(port => {
        const portCoord = [parseFloat(port.Latitude), parseFloat(port.Longitude)];

        // Validate coordinates
        if (isNaN(portCoord[0]) || isNaN(portCoord[1])) {
            console.error(`Invalid coordinates for port: ${port.port}`);
            return;
        }

        // Create port marker with the default icon
        const marker = L.marker(portCoord, { icon: defaultIcon }).addTo(map)
            .bindPopup(`<strong>${port.port}</strong><br>${port.country}<br><em>${port.attraction}</em><br>${port.description}`)
            .on('click', () => showPortDetails(port));

        // Create a custom day label on top of the marker
        const dayLabel = createDayLabel(port.day);
        L.marker(portCoord, { icon: dayLabel }).addTo(map);

        // Store coordinates for the polyline path
        pathCoordinates.push(portCoord);
    });

    // Draw straight line path between ports (only if there are multiple ports)
    if (pathCoordinates.length > 1) {
        L.polyline(pathCoordinates, { color: 'brown', weight: 3, opacity: 0.5 }).addTo(map);
    }
}

// Function to display port details in the sidebar
function showPortDetails(port) {
    document.getElementById('port-info').innerHTML = `
        <h3>${port.port}, ${port.country}</h3>
        <p>Day ${port.day}</p>
        <p>${port.attraction} - ${port.type}</p>
        <p>${port.description}</p>
    `;
    updateAttractionsList(port.port);
}

// Function to update the list of attractions for the selected port
function updateAttractionsList(portName) {
    const attractionList = document.getElementById('attraction-list');
    attractionList.innerHTML = '';
    itineraryData
        .filter(item => item.port === portName)
        .forEach(item => {
            const li = document.createElement('li');
            li.textContent = `${item.attraction} - ${item.type}: ${item.description}`;
            attractionList.appendChild(li);
        });
}
