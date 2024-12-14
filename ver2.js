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
  
  function parseLocalAttractions(data) {
    const rows = data.split("\n").slice(1); // Skip header row
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
  
  function getMarkerIcon() {
    // Default small circle icon for attractions
    return {
      path: google.maps.SymbolPath.CIRCLE,
      fillColor: "blue", // Color can be adjusted based on your needs
      fillOpacity: 0.5,
      strokeColor: "white",
      strokeWeight: 1,
      scale: 7, // Small circle
    };
  }
  
  function drawRoute(directionsService, directionsRenderer, start, end, color) {
    const request = {
      origin: start,
      destination: end,
      travelMode: google.maps.TravelMode.DRIVING,
      waypoints: [], // No waypoints for direct route
    };
    
    const polylineOptions = {
      strokeColor: color,
      strokeOpacity: 0.1,
      strokeWeight: 7,
    };
  
    directionsService.route(request, (result, status) => {
      if (status === google.maps.DirectionsStatus.OK) {
        directionsRenderer.setDirections(result);
  
        // Modify polyline for custom color (only for outbound route)
        const routePolyline = result.routes[0].overview_path;
        const polyline = new google.maps.Polyline(polylineOptions);
        polyline.setPath(routePolyline);
        polyline.setMap(directionsRenderer.getMap());
  
        // Calculate the time taken for the round trip
        const duration = result.routes[0].legs[0].duration.text; // Time taken for one-way trip
        const roundTripDuration = `Round trip: ${duration} (to and fro)`;
  
        // Create an InfoWindow to show the round trip duration
        const infoWindow = new google.maps.InfoWindow({
          content: roundTripDuration,
          position: routePolyline[0], // InfoWindow position at the start of the route
        });
  
        // Add click event to show the InfoWindow
        google.maps.event.addListener(polyline, "click", () => {
          infoWindow.open(directionsRenderer.getMap());
        });
      } else {
        console.error("Directions request failed due to " + status);
      }
    });
  }
  
  function fetchAndRenderLocalAttractions(map, portPosition, directionsService) {
    fetch("data/santorini_attractions.csv")
      .then((response) => response.text())
      .then((csvData) => {
        const attractions = parseLocalAttractions(csvData);
        attractions.forEach((attraction, index) => {
          const distance = google.maps.geometry.spherical.computeDistanceBetween(
            new google.maps.LatLng(portPosition.lat, portPosition.lng),
            new google.maps.LatLng(attraction.position.lat, attraction.position.lng)
          );
  
          // Only show attractions within 10 km
        //   if (distance <= 10000) {
            // Marker with a small circle icon
            const marker = new google.maps.Marker({
              position: attraction.position,
              map: map,
              icon: getMarkerIcon(),
              title: attraction.name,
            });
  
            // DirectionsRenderer for the outbound route (port -> attraction)
            const directionsRenderer = new google.maps.DirectionsRenderer({ suppressMarkers: true });
            directionsRenderer.setMap(map);
  
            // Assign a unique color for each route
            const routeColor = getRouteColor(index);
  
            // Draw route from port to attraction with the unique color
            drawRoute(directionsService, directionsRenderer, portPosition, attraction.position, routeColor);
        //   }
        });
      });
  }
  
  function getRouteColor(index) {
    // Use a predefined set of colors based on the attraction index (can be expanded)
    const routeColors = ["blue", "green", "purple", "orange", "red", "yellow"];
    return routeColors[index % routeColors.length]; // Cycle through available colors
  }
  
  function initMap() {
    const map = new google.maps.Map(document.getElementById("map"), {
      center: { lat: 37.9365963, lng: 25.6210059 },
      zoom: 6,
    });
  
    const directionsService = new google.maps.DirectionsService();
  
    fetch("data/itinerary.csv")
      .then((response) => response.text())
      .then((csvData) => {
        const ports = parseCSV(csvData);
  
        // Loop through ports to calculate and display routes
        for (let i = 0; i < ports.length - 1; i++) {
          const directionsRenderer = new google.maps.DirectionsRenderer({ suppressMarkers: false });
          directionsRenderer.setMap(map);
  
          // Draw route from port to next port (with a default color)
          drawRoute(
            directionsService,
            directionsRenderer,
            ports[i].position,
            ports[i + 1].position,
            "blue" // Default route color for port-to-port
          );
          
        }
  
        // Add markers for each port
        ports.forEach((port) => {
          const marker = new google.maps.Marker({
            position: port.position,
            map: map,
            title: `${port.port}`,
          });
  
          marker.addListener("dblclick", () => {
            // Zoom in and center on the port
            map.setZoom(12);
            map.setCenter(port.position);
  
            // Fetch and render local attractions and routes
            fetchAndRenderLocalAttractions(map, port.position, directionsService);
          });
  
          // Always display the local attractions and routes
          fetchAndRenderLocalAttractions(map, port.position, directionsService);
          fetchAndRenderLocalAttractions(map, port.position, directionsService);
        });
      });
  }
  