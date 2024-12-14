// Parse CSV for itinerary data
const typeColors = {
  Nature: "green",
  History: "grey",
  Chill: "blue",
  Religion: "Red",
  Shopping: "brown",
  default: "black", // Fallback color
};


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
        
  
        // Loop through and display filtered attractions
        filteredAttractions.forEach((attraction, index) => {
          const markerColor = typeColors[attraction.type] || typeColors.default;
  
          const marker = new google.maps.Marker({
            position: attraction.position,
            map: map,
            icon: {
              path: google.maps.SymbolPath.CIRCLE,
              fillColor: markerColor,
              fillOpacity: 1,
              strokeColor: "black",
              strokeWeight: 2,
              scale: 12,
            },
            title: attraction.name,
            label: {
              text: (index + 1).toString(), // Number on marker
              color: "white",
              fontSize: "16px",
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
      let main_content = `
        <h3>${port.port}, ${port.country} - Day ${port.day}</h3>
        <h4>Arrival ${port.arrival} - Departure ${port.departure}</h4>
      `;

      let content = `
      <h3>Top Local Attractions</h3>
      `
  
      // Add attractions list with numbers
      if (attractions.length > 0) {
        attractions.forEach((attraction, index) => {
          // Define colors for each type of attraction
          
  
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
  
      legend = `
      <hr/>
      Attraction Type Legend:<br>
        <span style="color: green;">&#10140; Nature</span> <br>
        <span style="color: gray;">&#10140; History</span> <br>
        <span style="color: red;">&#10140; Religion</span> <br>
        <span style="color: blue;">&#10140; Chill</span> <br>
        <span style="color: brown;">&#10140; Shopping</span> <br>
        <span style="color: rgb(0, 0, 0);">&#10140; Others</span>
      `
      
      // Update the info bar content
      document.getElementById("port-info").innerHTML = content;
      document.getElementById("port-info2").innerHTML = main_content + legend;
    });
  }
  
  
  



  function plotPaths(map, paths) {
    paths.forEach(path => {
        const polyline = new google.maps.Polyline({
            path: path, // Each path is an array of lat-lng objects
            strokeOpacity: 0, // Hide the main line
            icons: [
                {
                    icon: {
                        path: google.maps.SymbolPath.CIRCLE, // Dotted pattern
                        scale: 2, // Size of the dots
                        fillOpacity: 1,
                        strokeOpacity: 1,
                        fillColor: "blue",
                        strokeColor: "blue"
                    },
                    offset: "0", // Start of the pattern
                    repeat: "10px" // Spacing between dots
                }
            ],
            map: map,
        });
    });
}

  
  // Initialize the map and render routes/ports
  function initMap() {
    const map = new google.maps.Map(document.getElementById("map"), {
      center: { lat: 38.9365963, lng: 25.6210059 },
      zoom: 6.6,
    });
  
    const directionsService = new google.maps.DirectionsService();
  
    fetch("data/itinerary.csv")
      .then((response) => response.text())
      .then((csvData) => {
        const ports = parseCSV(csvData);
  
        // Add markers for each port
        ports.forEach((port, index) => {
          // const marker = new google.maps.Marker({
          //   position: port.position,
          //   map: map,
          //   title: `${port.port}`,
          // });
          const marker = new google.maps.Marker({
            position: port.position,
            map: map,
            icon: {
              // path: google.maps.SymbolPath.BACKWARD_OPEN_ARROW,
              url: "images/port-icon.png",
              scaledSize: new google.maps.Size(50, 50),
              labelOrigin: new google.maps.Point(25, -10),
            },
            // title: attraction.name,
            label: {
              text: "Day " + (index + 1).toString(), // Number on marker
              color: "black",
              fontSize: "16px",
              fontWeight: "bold",
              className: "marker-number"
            },
          });

          fetch('data/port2port_ctrl.json')
          .then(response => response.json())
          .then(data => {
            console.log(data)
              plotPaths(map, data);
          })
          .catch(error => console.error('Error loading JSON:', error));

  
          marker.addListener("click", () => {
            map.setZoom(12);
            map.setCenter(port.position);
            showPortDetails(port);
            LocalAttractions(map, port.position,port.port, directionsService);
          });
        });
      });
  }
  