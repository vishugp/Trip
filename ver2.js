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
      const [name, type, port, latitude, longitude, time, notes, gview] = row.split(",");
      return {
        name,
        type,
        port,
        position: {
          lat: parseFloat(latitude),
          lng: parseFloat(longitude),
        },
        time,
        notes,
        gview,
      };
    });
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
  
  function getLocalAttractions(portName, callback) {
    fetch("data/local_attractions.csv")
      .then((response) => response.text())
      .then((csvData) => {
        const attractions = parseLocalAttractions(csvData);
        const filteredAttractions = attractions.filter(
          (attraction) => attraction.port === portName
        );
        callback(filteredAttractions);
      });
  }
  
  // Display local attractions for a port
  function LocalAttractions(map, portPosition, portName, directionsService) {
    fetch("data/local_attractions.csv")
      .then((response) => response.text())
      .then((csvData) => {
        const attractions = parseLocalAttractions(csvData);
  
        // Filter attractions based on the selected port
        const filteredAttractions = attractions.filter(
          (attraction) => attraction.port === portName
        );
  
        // Define colors for each type of attraction
        const typeColors = {
          Nature: "green",
          History: "brown",
          Chill: "blue",
          default: "gray", // Fallback color
        };
  
        // Loop through and display filtered attractions
        filteredAttractions.forEach((attraction, index) => {
          const markerColor = typeColors[attraction.type] || typeColors.default;
  
          const marker = new google.maps.Marker({
            position: attraction.position,
            map: map,
            icon: {
              path: google.maps.SymbolPath.CIRCLE,
              fillColor: markerColor,
              fillOpacity: 0.9,
              strokeColor: "white",
              strokeWeight: 1,
              scale: 10,
            },
            title: attraction.name,
            label: {
              text: (index + 1).toString(), // Number on marker
              color: "white",
              fontSize: "14px",
              fontWeight: "bold",
              className: "marker-number"
            },
          });
  
          const infoWindow = new google.maps.InfoWindow();
          let hasRouteDrawn = false;
          let currentRoute = null;
  
          // Add click listener to display route and details
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
  
                // Set content with colorized links and number
                infoWindow.setContent(`
                  <div>
                    <strong>Attraction #${index + 1}: ${attraction.name}</strong><br/>
                    ${attraction.notes}<br><br>
                    Trip Time (1-way): ${duration}<br/>
                    Time to Spend: ${attraction.time}<br/>
                    <a href="${attraction.gview}" style="color: ${markerColor};">Google View</a><br/>
                  </div>
                `);
              } catch (error) {
                console.log("Error drawing route:", error);
                infoWindow.setContent("<div>Error loading route</div>");
              }
            }
            infoWindow.open(map, marker);
  
            // Close button listener to remove route
            google.maps.event.addListener(infoWindow, "closeclick", () => {
              if (currentRoute) {
                currentRoute.setMap(null);
                currentRoute = null;
              }
            });
          });
        });
      });
  }
  
  
  
  // Show port details in a side panel
  
  
  // Updated showPortDetails to display attractions in the info bar
  function showPortDetails(port) {
    getLocalAttractions(port.port, (attractions) => {
      // Start with port details
      let content = `
        <h2>${port.port}, ${port.country}</h2>
        <h3>Day ${port.day}</h3>
        <h4>Arrival ${port.arrival} - Departure ${port.departure}</h4>
        <p>${port.attraction} - ${port.type}</p>
        <p>${port.description}</p>
        <hr/>
        <h3>Top Local Attractions</h3>
      `;
  
      // Add attractions list with numbers
      if (attractions.length > 0) {
        attractions.forEach((attraction, index) => {
          // Define colors for each type of attraction
          const typeColors = {
            Nature: "green",
            History: "brown",
            Chill: "blue",
            default: "gray", // Fallback color
          };
  
          const markerColor = typeColors[attraction.type] || typeColors.default;
  
          content += `
            <a href="${attraction.gview}" style="color: ${markerColor};">
              <strong>#${index + 1} ${attraction.name}</strong>
            </a> : ${attraction.time}<br>
            <i>${attraction.notes}</i><p></p>
          `;
        });
      } else {
        content += "<p>WIP</p>";
      }
  
      // Update the info bar content
      document.getElementById("port-info").innerHTML = content;
    });
  }
  
  
  
  function loadFinalCurve(map, savedPoints) {
    const finalCurve = new google.maps.Polyline({
      path: savedPoints, // Control points define the path
      strokeColor: "blue",
      strokeOpacity: 0.8,
      strokeWeight: 2,
      map: map,
    });
  
    // // Add Start (green) and End (red) markers only
    // new google.maps.Marker({
    //   position: savedPoints[0], // Start Point
    //   map: map,
    //   title: "Start Point",
    //   icon: "http://maps.google.com/mapfiles/ms/icons/green-dot.png",
    // });
  
    // new google.maps.Marker({
    //   position: savedPoints[savedPoints.length - 1], // End Point
    //   map: map,
    //   title: "End Point",
    //   icon: "http://maps.google.com/mapfiles/ms/icons/red-dot.png",
    // });
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
  
          // if (isWaterway) {
          //   drawCurvedRoute(
          //     map,
          //     ports[i].position,
          //     ports[i + 1].position,
          //     "black"
          //   );
          // } else {
          //   const directionsRenderer = new google.maps.DirectionsRenderer({
          //     suppressMarkers: true,
          //   });
          //   directionsRenderer.setMap(map);
          //   drawRoute(
          //     directionsService,
          //     directionsRenderer,
          //     ports[i].position,
          //     ports[i + 1].position,
          //     "blue"
          //   );
          // }
        }
        const savedPoints = [
          {"lat":37.9447622,"lng":23.6383111},
          {"lat":37.935872223371085,"lng":23.61891661767577},
          {"lat":37.586329017795244,"lng":23.68191959628906},
          {"lat":37.337567931247754,"lng":23.765865262890628},
          {"lat":37.01399540672741,"lng":23.921908707812513},
          {"lat":36.699357434733216,"lng":24.14352679873045},
          {"lat":36.519080799725764,"lng":24.442392509277333},
          {"lat":36.43814737116244,"lng":24.817132548437495},
          {"lat":36.382344294429245,"lng":25.139344206250005},
          {"lat":36.368243769463376,"lng":25.32079353496095},
          {"lat":36.39109941783127,"lng":25.422549069421407},
          {"lat":36.38919886699087,"lng":25.428447818107593},
          {"lat":36.38819886699087,"lng":25.428447818107593},
          {"lat":36.38719886699087,"lng":25.428447818107593},
          {"lat":36.38619886699087,"lng":25.428447818107593}];
      
        // Enable draggable curve with control points
        // enableMultiControlCurve(map, start, end);
        loadFinalCurve(map, savedPoints);
        
  
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
            LocalAttractions(map, port.position,port.port, directionsService);
          });
        });
      });
  }
  