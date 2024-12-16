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
      const [name, rank, type, port, latitude, longitude, time, notes, gview] = row.split(",");
      return {
        name,
        rank,
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
  
  let directionsRenderer;
  let allMarkers = [];
  let allPaths = [];

  function clearPaths() {
    // Clear directions from the map
    // if (directionsRenderer) {
    //   directionsRenderer.setMap(null);
    //   directionsRenderer = null; // Optional: Reset the directionsRenderer variable if needed
    // }

    // Clear all paths (if any)
    allPaths.forEach((path) => {
      path.setMap(null);
    });
  
    allPaths = [];
  }
  

  function toRoman(num) {
    if (isNaN(num))
      return NaN;
      var digits = String(+num).split(""),
          key = ["","C","CC","CCC","CD","D","DC","DCC","DCCC","CM",
                "","X","XX","XXX","XL","L","LX","LXX","LXXX","XC",
                "","I","II","III","IV","V","VI","VII","VIII","IX"],
          roman = "",
          i = 3;
      while (i--)
          roman = (key[+digits.pop() + (i * 10)] || "") + roman;
      return Array(+digits.join("") + 1).join("M") + roman;
}


  // Draw a land route using Google Directions Service
  function drawRoute(directionsService, directionsRenderer, start, end, color) {

    const request = {
      origin: start,
      destination: end,
      travelMode: google.maps.TravelMode.DRIVING,
    };
  
    const polylineOptions = {
      strokeColor: "#FF0000",
      strokeOpacity: 1,
      strokeWeight: 1,
    };
  
    return new Promise((resolve, reject) => {
      directionsService.route(request, (result, status) => {
        if (status === google.maps.DirectionsStatus.OK) {
          // directionsRenderer.setDirections(result);
  
          // Customize polyline
          const routePolyline = result.routes[0].overview_path;
          clearPaths();
          const polyline = new google.maps.Polyline(polylineOptions);
          polyline.setPath(routePolyline);
          polyline.setMap(directionsRenderer.getMap());      
          allPaths.push(polyline);    
  
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
  
  
  let addedAttractions = []; // For keeping track of planned attractions
  // Display local attractions for a port
  function LocalAttractions(map, portPosition, portName, directionsService, directionsRenderer) {
    fetch("data/local_attractions.csv")
      .then((response) => response.text())
      .then((csvData) => {
        const attractions = parseLocalAttractions(csvData);
  
        const filteredAttractions = attractions.filter(
          (attraction) => attraction.port === portName
        );
  
        let rp = document.getElementById("route-planner");
        rp.style.display = "block";
        const attractionListDiv = document.getElementById("attraction-list");
        const pathZoneDiv = document.getElementById("path-zone");
        attractionListDiv.innerHTML = ""; // Clear previous list
        pathZoneDiv.innerHTML = ""; // Clear previous path zone

        // Drag and drop setup
        pathZoneDiv.addEventListener("dragover", (e) => e.preventDefault());
        pathZoneDiv.addEventListener("drop", (e) => {
          e.preventDefault();
          const data = e.dataTransfer.getData("text");
          const draggedAttraction = JSON.parse(data);
          addAttractionToPath(draggedAttraction); 
        });

        
        

      function addAttractionToPath(attraction) {
        if (!addedAttractions.some((a) => a.name === attraction.name)) {
          addedAttractions.push(attraction);
          const index = addedAttractions.length - 1;

          const item = document.createElement("div");
          item.className = "path-item";
          item.style.display = "flex";  
          item.innerText = `${toRoman(index + 1)}.  ${attraction.name} [${attraction.rank}]`; 
          item.style.backgroundColor = typeColors[attraction.type] || typeColors.default;
      
          // Create a remove button
          let removeButton = document.createElement("span");
          removeButton.className = "remove-btn";
          removeButton.innerText = "X";
          removeButton.style.display = "flex";
          // removeButton.style.top = "0px";
          // removeButton.style.right = "10px";
          removeButton.style.cursor = "pointer";
          removeButton.style.marginLeft = "auto";

          item.style.justifyContent = "space-between";
          document.getElementById("route-summary").innerHTML = ``
          removeButton.addEventListener("click", () => {
            item.remove(); // Remove the item from the list
            document.getElementById("route-summary").innerHTML = ``
            addedAttractions = addedAttractions.filter(a => a.name !== attraction.name);  // Update the addedAttractions array
          });
      
          // // Append the button to the item
          item.appendChild(removeButton);
          
          pathZoneDiv.appendChild(item);
        }
      }
      


        filteredAttractions.forEach((attraction, index) => {
          const markerColor = typeColors[attraction.type] || typeColors.default;
          
          // Create draggable element
          const draggableCircle = document.createElement("div");
          draggableCircle.className = "draggable-circle";
          draggableCircle.draggable = true;
          draggableCircle.innerText = `${index + 1}`;
          draggableCircle.style.backgroundColor = markerColor;
          draggableCircle.style.borderColor = "black";
          draggableCircle.dataset.attraction = JSON.stringify(attraction);

          draggableCircle.addEventListener("dragstart", (e) => {
            e.dataTransfer.setData("text", draggableCircle.dataset.attraction);

        });

        attractionListDiv.appendChild(draggableCircle);

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
              text: (index + 1).toString(),
              color: "white",
              fontSize: "16px",
              fontWeight: "bold",
              className: "marker-number",
            },
          });
  
          const infoWindow = new google.maps.InfoWindow();
          let hasRouteDrawn = false;
          let currentRoute = null;
          
          
          marker.addListener("click", async () => {
            console.log(marker)
            // if (!hasRouteDrawn) {
              
  
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
            // }
            infoWindow.open(map, marker);
  
            google.maps.event.addListener(infoWindow, "closeclick", () => {
              if (currentRoute) {
                currentRoute.setMap(null);
                currentRoute = null;
              }
            });
          });
        });
  
        let button = document.getElementById("plot-route-btn");
        button.onclick = () => {
          planRoute(map, directionsService, portPosition, addedAttractions, directionsRenderer);
        }
        
      });
  }

  


async function planRoute(map, directionsService, portPosition, addedAttractions, directionsRenderer) {
  if (addedAttractions.length === 0) {
    alert("Please drag and drop at least one attraction to the path zone.");
    return;
  }



  console.log(addedAttractions);
  clearPaths();
  const waypoints = addedAttractions.map((attraction) => ({
    location: attraction.position,
    stopover: true,
  }));

  const request = {
    origin: portPosition,
    destination: portPosition,
    waypoints: waypoints,
    travelMode: google.maps.TravelMode.DRIVING,
    optimizeWaypoints: false,
  };

  const polylineOptions = {
    strokeColor: "#000000",
    strokeOpacity: 1,
    strokeWeight: 0,
    icons: [
      {
        icon: {
          path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
          scale: 2, // Adjust size of the arrow
          strokeColor: "#000000",
          strokeOpacity: 1,
        },
        offset: "0%",
        repeat: "100px", // Adjust distance between arrows
      },
    ],
  };
  

  try {
    directionsService.route(request, (result, status) => {
      console.log(result);
      if (status === google.maps.DirectionsStatus.OK) {
        directionsRenderer.setDirections(result);
        const routePolyline = result.routes[0].overview_path;
          clearPaths();
          const polyline = new google.maps.Polyline(polylineOptions);
          polyline.setPath(routePolyline);
          polyline.setMap(directionsRenderer.getMap());      
          allPaths.push(polyline);    

          const legs = result.routes[0].legs;
          let segmentDetails = "<b><br>Time Taken for Each Segment:</b><br>";
          let totalDuration = 0;
    
          legs.forEach((leg, index) => {
            const legDurationInMinutes = (leg.duration.value / 60).toFixed(0); // Convert seconds to minutes
            
            const startName = index === 0 ? "Port" : addedAttractions[index - 1].name; // First leg starts at the port
            const endName = index < addedAttractions.length ? addedAttractions[index].name : "Port"; // Last leg ends at the port
            const endluxtime = index < addedAttractions.length ? addedAttractions[index].time : "";
            const endlux = index < addedAttractions.length ? `            Time at ${addedAttractions[index].name}: ${endluxtime} hrs` : "";
            
            totalDuration += leg.duration.value; // Accumulate total duration
            console.log(totalDuration);
            totalDuration += index < addedAttractions.length ? parseFloat(addedAttractions[index].time)*3600 : 0
            console.log(totalDuration);

            segmentDetails += `<hr>${index + 1}. (${startName} → ${endName}): ${legDurationInMinutes} mins<br>
                               ${endlux}`;

          });
    
          // Calculate total travel time
          let dur = "hrs";
          let tot = (totalDuration / 3600).toFixed(1);
          if (tot < 1) {
            tot = (totalDuration / 60).toFixed(1);
            dur = "mins";
          }
    
          // Update the route summary on the webpage
          document.getElementById("route-summary").innerHTML = `
            ${segmentDetails}<br>
            <b><hr>Total Travel Time:</b> ${tot} ${dur}
          `;
      } else {
        console.error("Directions request failed due to " + status);
      }
    });
  } catch (error) {
    console.log("Error planning route:", error);
  }
}
  
  
  


  // Updated showPortDetails to display attractions in the info bar
  function showPortDetails(port) {
    getLocalAttractions(port.port, (attractions) => {
      // Start with port details
      let main_content = ``
      let content = `
        <h3>${port.port}, ${port.country} - Day ${port.day}</h3>
        <b><i>Arrival ${port.arrival} - Departure ${port.departure}</b></i><hr>
      `;

      content += `
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
            </a><br>
            <i>${attraction.notes}</i><p></p>
          `;
        });
      } else {
        content += "<p>WIP</p>";
      }
  
      // legend = `
      // <hr/>
      // Attraction Type Legend:<br>
      //   <span style="color: green;">&#10140; Nature</span> <br>
      //   <span style="color: gray;">&#10140; History</span> <br>
      //   <span style="color: red;">&#10140; Religion</span> <br>
      //   <span style="color: blue;">&#10140; Chill</span> <br>
      //   <span style="color: brown;">&#10140; Shopping</span> <br>
      //   <span style="color: rgb(0, 0, 0);">&#10140; Others</span>
      // `
      
      // Update the info bar content
      document.getElementById("port-info").innerHTML = content;
      document.getElementById("port-info2").innerHTML = main_content ;
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
              plotPaths(map, data);
          })
          .catch(error => console.error('Error loading JSON:', error));

          const directionsRenderer = new google.maps.DirectionsRenderer({
            suppressMarkers: true,
            map: map
          });

          marker.addListener("click", () => {
            map.setZoom(12);
            map.setCenter(port.position);
            showPortDetails(port);
            addedAttractions = [];
            document.getElementById("route-summary").innerHTML = ``
            LocalAttractions(map, port.position,port.port, directionsService, directionsRenderer);
          });
        });
      });
  }
  