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

// First, add this function to calculate the curve control point
function calculateCurveControlPoint(start, end) {
    // Calculate midpoint
    const midX = (start[1] + end[1]) / 2;
    const midY = (start[0] + end[0]) / 2;
    
    // Calculate the perpendicular offset for the curve
    // Adjust this multiplier to control how curved the line is
    const curvature = 0.2;
    const dx = end[1] - start[1];
    const dy = end[0] - start[0];
    const norm = Math.sqrt(dx * dx + dy * dy);
    
    // Create the control point perpendicular to the midpoint
    return [
        midY + curvature * (-dx / norm),
        midX + curvature * (dy / norm)
    ];
}

// Function to create an arc between two points
function createArc(start, end) {
    // Calculate the midpoint
    const latlngs = [];
    const offsetX = end[1] - start[1];
    const offsetY = end[0] - start[0];
    const center = [
        start[0] + offsetY / 2,
        start[1] + offsetX / 2
    ];
    
    // Calculate distance and radius
    const distance = Math.sqrt(Math.pow(offsetX, 2) + Math.pow(offsetY, 2));
    const radius = distance / 2;
    
    // Calculate the bearing between points
    const bearing1 = L.GeometryUtil.bearing(L.latLng(start), L.latLng(end));
    const bearing2 = bearing1 + 180;
    
    // Generate points along the arc
    const numPoints = 100;
    for (let i = 0; i <= numPoints; i++) {
        const angle = bearing1 + (bearing2 - bearing1) * (i / numPoints);
        const point = L.GeometryUtil.destination(
            L.latLng(center),
            angle,
            radius
        );
        latlngs.push([point.lat, point.lng]);
    }
    
    return latlngs;
}

// Function to add ports and curved paths to the map
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

        pathCoordinates.push(portCoord);
    });

    // Draw curved paths between consecutive ports
    if (pathCoordinates.length > 1) {
        for (let i = 0; i < pathCoordinates.length - 1; i++) {
            const start = pathCoordinates[i];
            const end = pathCoordinates[i + 1];
            
            // Calculate control point for quadratic curve
            const midPoint = [
                (start[0] + end[0]) / 2,
                (start[1] + end[1]) / 2
            ];
            
            // Offset the control point to create a curve
            const offset = 0.2; // Adjust this value to control curve intensity
            const dx = end[1] - start[1];
            const dy = end[0] - start[0];
            const controlPoint = [
                midPoint[0] - (dx * offset),
                midPoint[1] + (dy * offset)
            ];

            // Generate points along the quadratic curve
            const curvePoints = [];
            const steps = 50;
            
            for (let t = 0; t <= 1; t += 1/steps) {
                // Quadratic Bezier curve formula
                const lat = Math.pow(1-t, 2) * start[0] + 
                          2 * (1-t) * t * controlPoint[0] + 
                          Math.pow(t, 2) * end[0];
                          
                const lng = Math.pow(1-t, 2) * start[1] + 
                          2 * (1-t) * t * controlPoint[1] + 
                          Math.pow(t, 2) * end[1];
                          
                curvePoints.push([lat, lng]);
            }

            // Add the curved path to the map
            L.polyline(curvePoints, {
                color: '#2B65EC',  // Navy blue color
                weight: 3,
                opacity: 0.7,
                dashArray: '5, 10'  // Creates a dashed line effect
            }).addTo(map);
        }
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
