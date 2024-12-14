// Parse CSV for itinerary data
function parseCSV(data) {
    const rows = data.split("\n").slice(1); // Skip header row
    return rows.map((row) => {
      const [
        day,
        date,
        port,
        country,
        attraction,
        type,
        description,
        arrival,
        departure,
        latitude,
        longitude,
      ] = row.split(",");
      return {
        day,
        date,
        port,
        country,
        attraction,
        type,
        description,
        arrival,
        departure,
        position: {
          lat: parseFloat(latitude),
          lng: parseFloat(longitude),
        },
      };
    });
  }
  
  // Parse CSV for local attractions
  function parseLocalAttractions(data) {
    const rows = data.split("\n").slice(1);
    return rows.map((row) => {
      const [name, latitude, longitude, time, notes] = row.split(",");
      return {
        name,
        position: {
          lat: parseFloat(latitude),
          lng: parseFloat(longitude),
        },
        time,
        notes,
      };
    });
  }
  
  // Draw a geodesic (curved) route for waterway routes
  function drawCurvedRoute(map, start, end, color) {
    // Calculate control point for the curve
    const midPoint = {
      lat: (start.lat + end.lat) / 2,
      lng: (start.lng + end.lng) / 2,
    };
  
    const offset = 0.2; // Adjust for curvature
    const dx = end.lng - start.lng;
    const dy = end.lat - start.lat;
  
    const controlPoint = {
      lat: midPoint.lat - offset * dx,
      lng: midPoint.lng + offset * dy,
    };
  
    // Initialize the curve points with the start point
    const curvePoints = [{ lat: start.lat, lng: start.lng }];
  
    // Generate intermediate points along the quadratic Bézier curve
    const steps = 50; // Number of points along the curve
    for (let t = 0; t <= 1; t += 1 / steps) {
      const lat =
        Math.pow(1 - t, 2) * start.lat +
        2 * (1 - t) * t * controlPoint.lat +
        Math.pow(t, 2) * end.lat;
  
      const lng =
        Math.pow(1 - t, 2) * start.lng +
        2 * (1 - t) * t * controlPoint.lng +
        Math.pow(t, 2) * end.lng;
  
      curvePoints.push({ lat, lng });
    }
  
    // Add the endpoint explicitly to ensure it connects
    curvePoints.push({ lat: end.lat, lng: end.lng });
  
    // Create a polyline with the curved points
    const polyline = new google.maps.Polyline({
      path: curvePoints,
      geodesic: false,
      strokeColor: "indigo",
      strokeOpacity: 0.75,
      strokeWeight: 1.5,
    });
  
    polyline.setMap(map);
    return polyline;
  }
  
  
  // Draw a land route using Google Directions Service
  function drawRoute(directionsService, directionsRenderer, start, end, color) {
    const request = {
      origin: start,
      destination: end,
      travelMode: google.maps.TravelMode.DRIVING,
    };
  
    const polylineOptions = {
      strokeColor: color,
      strokeOpacity: 0.7,
      strokeWeight: 3,
    };
  
    return new Promise((resolve, reject) => {
      directionsService.route(request, (result, status) => {
        if (status === google.maps.DirectionsStatus.OK) {
          directionsRenderer.setDirections(result);
  
          // Customize polyline
          const routePolyline = result.routes[0].overview_path;
          const polyline = new google.maps.Polyline(polylineOptions);
          polyline.setPath(routePolyline);
          polyline.setMap(directionsRenderer.getMap());
  
          // Calculate trip duration
          const duration = result.routes[0].legs[0].duration.text;
          resolve({ duration, polyline });
        } else {
          console.log("Directions request failed due to " + status);
          reject("Failed to retrieve directions");
        }
      });
    });
  }
  
  // Display local attractions for a port
  function LocalAttractions(map, portPosition, directionsService) {
    fetch("data/santorini_attractions.csv")
      .then((response) => response.text())
      .then((csvData) => {
        const attractions = parseLocalAttractions(csvData);
        attractions.forEach((attraction) => {
          const marker = new google.maps.Marker({
            position: attraction.position,
            map: map,
            icon: {
              path: google.maps.SymbolPath.CIRCLE,
              fillColor: "indigo",
              fillOpacity: 0.7,
              strokeColor: "white",
              strokeWeight: 1,
              scale: 7,
            },
            title: attraction.name,
          });
  
          const infoWindow = new google.maps.InfoWindow();
          let hasRouteDrawn = false;
          let currentRoute = null;
  
          marker.addListener("click", async () => {
            if (!hasRouteDrawn) {
              const directionsRenderer = new google.maps.DirectionsRenderer({
                suppressMarkers: true,
              });
              directionsRenderer.setMap(map);
  
              try {
                const { duration, polyline } = await drawRoute(
                  directionsService,
                  directionsRenderer,
                  portPosition,
                  attraction.position,
                  "black"
                );
                hasRouteDrawn = true;
                currentRoute = polyline;
  
                infoWindow.setContent(
                  `<div><strong>${attraction.name}</strong><br/>
                  Trip Time (1-way): ${duration}<br/>
                  Time to Spend: ${attraction.time}<br/>
                  ${attraction.notes}</div>`
                );
              } catch (error) {
                console.log("Error drawing route:", error);
                infoWindow.setContent("<div>Error loading route</div>");
              }
            }
            infoWindow.open(map, marker);
  
            // Add listener to close button of the InfoWindow
            google.maps.event.addListener(infoWindow, "closeclick", () => {
              if (currentRoute) {
                currentRoute.setMap(null); // Remove the route from the map
                currentRoute = null;
                // hasRouteDrawn = false;
              }
            });
          });
        });
      });
  }
  
  // Show port details in a side panel
  function showPortDetails(port) {
    document.getElementById("port-info").innerHTML = `
      <h2>${port.port}, ${port.country}</h2>
      <h3>Day ${port.day}</h3>
      <h4>Arrival - Departure: ${port.arrival} to ${port.departure}</h4>
      <p>${port.attraction} - ${port.type}</p>
      <p>${port.description}</p>
    `;
  }
  
  // Initialize the map and render routes/ports
  function initMap() {
    const map = new google.maps.Map(document.getElementById("map"), {
      center: { lat: 37.9365963, lng: 25.6210059 },
      zoom: 6.6,
    });
  
    const directionsService = new google.maps.DirectionsService();
  
    fetch("data/itinerary.csv")
      .then((response) => response.text())
      .then((csvData) => {
        const ports = parseCSV(csvData);
  
        // Draw routes between ports
        for (let i = 0; i < ports.length - 1; i++) {
          const isWaterway = true; // Placeholder for logic to determine waterway routes
  
          if (isWaterway) {
            drawCurvedRoute(
              map,
              ports[i].position,
              ports[i + 1].position,
              "black"
            );
          } else {
            const directionsRenderer = new google.maps.DirectionsRenderer({
              suppressMarkers: true,
            });
            directionsRenderer.setMap(map);
            drawRoute(
              directionsService,
              directionsRenderer,
              ports[i].position,
              ports[i + 1].position,
              "blue"
            );
          }
        }
  
        // Add markers for each port
        ports.forEach((port) => {
          const marker = new google.maps.Marker({
            position: port.position,
            map: map,
            title: `${port.port}`,
          });
  
          marker.addListener("click", () => {
            map.setZoom(12);
            map.setCenter(port.position);
            showPortDetails(port);
            LocalAttractions(map, port.position, directionsService);
          });
        });
      });
  }
  