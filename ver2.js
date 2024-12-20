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
  const ports = [];
  Papa.parse(data, {
    header: true, // Use the first row as column names
    skipEmptyLines: true,
    complete: function (results) {
      results.data.forEach((row) => {
        ports.push({
          day: row.day,
          date: row.date,
          port: row.port,
          country: row.country,
          attraction: row.attraction,
          type: row.type,
          description: row.description,
          arrival: parseInt(row.arrival),
          departure: parseInt(row.departure),
          efftime: parseInt(row.departure) + 12 - parseInt(row.arrival) -3,
          position: {
            lat: parseFloat(row.latitude),
            lng: parseFloat(row.longitude),
          },
          trackURL: row.trackURL || "", // Handle missing trackURL gracefully
        });
      });
    },
  });
  return ports;
}
  // Parse CSV for local attractions
  function parseLocalAttractions(data) {
    const rows = data.split("\n").slice(1);
    return rows.map((row) => {
      const [name, rank, type, port, latitude, longitude, time, notes, gview,cost,best_times,CCLink,GYG] = row.split(",");
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
        cost,
        best_times,
        CCLink,
        GYG
      };
    });
  }
  
  let directionsRenderer;
  let allMarkers = [];
  let allPaths = [];
  let currport = ''

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

  function clearMarkers() {
    allMarkers.forEach((mark) => {
      mark.setMap(null);
    });
    allMarkers = [];
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
          console.error("Directions request failed due to " + status);
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
  function LocalAttractions(map,  portName, directionsService, directionsRenderer,port) {
      
      const newSrc = `https://w.soundcloud.com/player/?url=${port.trackURL}&auto_play=true`;
      iframeElement.src = newSrc;

      widget.load(port.trackURL, { auto_play: true }, function(error) {
        
        if (error) {
            console.error("Error loading track:", error);
        } else {
            widget.play();
        }
    });

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
            item.style.alignItems = "center"; // Vertically align elements
            item.style.height = "15px";
            item.style.backgroundColor = typeColors[attraction.type] || typeColors.default;
        
            // Create a text container for the attraction name
            const textContainer = document.createElement("div");
            textContainer.style.flex = "1"; // Take up all available space on the left
            textContainer.innerText = `${attraction.name} [${attraction.rank}]`;
        
            // Time input field
            const timeInput = document.createElement("input");
            timeInput.type = "number";
            timeInput.value = attraction.time || 0; // Default time in hours
            timeInput.min = 0;
            timeInput.step = 0.5; // Allow half-hour increments
            timeInput.style.width = "35px"; // Adjust width as needed
            timeInput.style.height = "15px";
            timeInput.style.marginLeft = "10px"; // Space between the text and input
            timeInput.style.marginRight = "10px"; // Space between input and button
        
            // Update time in `addedAttractions` array when input changes
            timeInput.addEventListener("input", () => {
              const updatedTime = parseFloat(timeInput.value) || 0; // Default to 0 if input is invalid
              addedAttractions[index].time = updatedTime;
              document.getElementById("route-summary").innerHTML = ``; // Clear summary on edit
              document.getElementById("route-legs").innerHTML = ``; // Clear route summary
              planRoute(map, directionsService, currport, addedAttractions, directionsRenderer, true);

            });
        
            // Remove button
            const removeButton = document.createElement("span");
            removeButton.className = "remove-btn";
            removeButton.innerText = "X";
            removeButton.style.cursor = "pointer";
        
            // Remove button functionality
            removeButton.addEventListener("click", () => {
              item.remove(); // Remove the item from the list
              addedAttractions = addedAttractions.filter((a) => a.name !== attraction.name); // Update the addedAttractions array
              document.getElementById("route-summary").innerHTML = ``; // Clear route summary
              document.getElementById("route-legs").innerHTML = ``; // Clear route summary
              
              if (addedAttractions.length === 0) {
                planRoute(map, directionsService, currport, [], directionsRenderer, false);
                clearPaths();
                map.setZoom(5);
              } else{
                planRoute(map, directionsService, currport, addedAttractions, directionsRenderer, true);
              }
            });
        
            // Assemble the item
            item.appendChild(textContainer); // Left-aligned text
            item.appendChild(timeInput); // Right-aligned time input
            item.appendChild(removeButton); // Right-aligned remove button
            pathZoneDiv.appendChild(item);

            
            planRoute(map, directionsService, currport, addedAttractions, directionsRenderer, true);
            
          }
        }
      


        filteredAttractions.forEach((attraction, index) => {
          const markerColor = typeColors[attraction.type] || typeColors.default;
          
          // Create draggable element
          const draggableCircle = document.createElement("div");
          draggableCircle.className = "draggable-circle";
          draggableCircle.draggable = true;
          draggableCircle.style.display = "flex";
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
  
          allMarkers.push(marker);
          const infoWindow = new google.maps.InfoWindow();
          let hasRouteDrawn = false;
          let currentRoute = null;
          
          
          marker.addListener("click", async () => {
            // if (!hasRouteDrawn) {
              
  
            try {
              const { duration, polyline } = await drawRoute(
                directionsService,
                directionsRenderer,
                currport.position,
                attraction.position,
                "black"
              );
              hasRouteDrawn = true;
              currentRoute = polyline;

              let CCLinkHTML = attraction.CCLink 
              ? `<a href="${attraction.CCLink}" style="color: ${markerColor};">CelebCruise Excursion Link</a>` 
              : "";

              infoWindow.setContent(`
                <div>
                  <strong>Attraction #${index + 1}: ${attraction.name}</strong><br/>
                  ${attraction.notes}<br>
                  Best Times to be here: ${attraction.best_times}<br><br>
                  
                  Cost: £${attraction.cost}<br>
                  Trip Time (1-way): ${duration}<br/>
                  Time to Spend: ${attraction.time} hrs<br/>
                  <a href="${attraction.gview}" style="color: ${markerColor};">Google View</a><br/><br>
                  ${CCLinkHTML}
                </div>
              `);
            } catch (error) {
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
  
        
        
      });
  }

  


async function planRoute(map, directionsService, portt, addedAttractions, directionsRenderer, rflag) {
  if (addedAttractions.length === 0 && rflag == true){
    alert("Please drag and drop at least one attraction to the path zone.");
    return;
  }

  clearPaths();
  const waypoints = addedAttractions.map((attraction) => ({
    location: attraction.position,
    stopover: true,
  }));

  const request = {
    origin: portt.position,
    destination: portt.position,
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
      if (status === google.maps.DirectionsStatus.OK) {
        directionsRenderer.setDirections(result);
        const routePolyline = result.routes[0].overview_path;
          clearPaths();
          const polyline = new google.maps.Polyline(polylineOptions);
          polyline.setPath(routePolyline);
          polyline.setMap(directionsRenderer.getMap());      
          allPaths.push(polyline);    

          

          const legs = result.routes[0].legs;
          let segmentDetails = "";
          let totalDuration = 0;
    
          legs.forEach((leg, index) => {
            const legDurationInMinutes = (leg.duration.value / 60).toFixed(0); // Convert seconds to minutes
            
            const startName = index === 0 ? "Port" : addedAttractions[index - 1].name; // First leg starts at the port
            const endName = index < addedAttractions.length ? addedAttractions[index].name : "Port"; // Last leg ends at the port
            const endluxtime = index < addedAttractions.length ? addedAttractions[index].time : "";
            const endlux = index < addedAttractions.length ? `            Time at ${addedAttractions[index].name}: ${endluxtime} hrs` : "";
            
            totalDuration += leg.duration.value; // Accumulate total duration
            totalDuration += index < addedAttractions.length ? parseFloat(addedAttractions[index].time)*3600 : 0
            

            segmentDetails += `${index + 1}. (${startName} → ${endName}): ${legDurationInMinutes} mins<br>
                               ${endlux}<hr>`;

          });
    
          // Calculate total travel time
          let dur = "hrs";
          let tot = (totalDuration / 3600).toFixed(1);
          if (tot < 1) {
            tot = (totalDuration / 60).toFixed(1);
            dur = "mins";
          }
          
          if(rflag != false){
            // Update the route summary on the webpage
            let tott = `${tot} ${dur}`
            if(dur=="hrs" & tot>portt.efftime){
              console.log("RED")
              tott = `<span class="red-text">` + tott + `</span>`;
            }
            document.getElementById("route-summary").innerHTML = `<b><hr>Total Travel Time: </b>` + tott + `<hr><b><br>Time Taken for Each Segment:</b><br><br>`;

            document.getElementById("route-legs").innerHTML = `${segmentDetails}`;
          } else {
            
            map.setZoom(map.getZoom() - 15);}
      } else {
        console.error("Directions request failed due to " + status);
      }
    });
  } catch (error) {
  console.error("Error planning route:", error);
  }
}
  
  
  


  // Updated showPortDetails to display attractions in the info bar
  function showPortDetails(port) {
    getLocalAttractions(port.port, (attractions) => {
      // Start with port details
      let main_content = ``
      let content = `
        <h3>${port.port}, ${port.country}<br>Day ${port.day}</h3>
        <b>Arrival ${port.arrival} AM - Departure ${port.departure} PM</b><br>
        <i>Effective Time at Port: ${port.efftime} hrs</i><hr>
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
      document.getElementById("port-info").innerHTML = content + legend;
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
                        path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW, // Dotted pattern
                        scale: 1, // Size of the dots
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

const iframeElement = document.getElementById("soundcloud-player");
const widget = SC.Widget(iframeElement);
widget.setVolume(27);
  
  // Initialize the map and render routes/ports
  function initMap() {
    const map = new google.maps.Map(document.getElementById("map"), {
      center: { lat: 38.9365963, lng: 25.6210059 },
      zoom: 6.6,
    });
  
    // Create home button
    const homeButton = document.createElement("button");
    homeButton.id = "home-button";
    homeButton.textContent = "🏠";
    
    
    // Add hover effect
    homeButton.addEventListener("mouseover", () => {
      homeButton.style.backgroundColor = "#f0f0f0";
    });
    homeButton.addEventListener("mouseout", () => {
      homeButton.style.backgroundColor = "white";
    });
    
    // Function to reset to default view
    const resetToDefault = () => {
      map.setCenter({ lat: 38.9365963, lng: 25.6210059 });
      map.setZoom(6.6);
      clearMarkers();
      clearPaths();
      document.getElementById("route-planner").style.display = "none";
      document.getElementById("port-info").innerHTML = `<h1>Welcome to the Greece Trip Planner!</h1><p>Select a port on the map to view further details</p> `;
      document.getElementById("port-info2").innerHTML = ` <h2 style="text-align: center;"><u>7 Nights Cruise<br> Best of Greece</u></h2>
        <h3>Itinerary</h3>
        <li><strong>Day 1:</strong> Athens (Piraeus), Greece</li>
        <li><strong>Day 2:</strong> Santorini, Greece</li>
        <li><strong>Day 3:</strong> Kusadasi, Turkey</li>
        <li><strong>Day 4:</strong> Mykonos, Greece</li>
        <li><strong>Day 5:</strong> Volos, Greece</li>
        <li><strong>Day 6:</strong> Thessaloniki, Greece</li>
        <li><strong>Day 7:</strong> Back to Athens, Greece</li>`;
      document.getElementById("route-summary").innerHTML = "";
      document.getElementById("route-legs").innerHTML = "";
      addedAttractions = [];
    };
    
    homeButton.addEventListener("click", resetToDefault);
    
    // Add the home button to the map
    // map.controls[google.maps.ControlPosition.TOP_LEFT].push(homeButton);
    document.body.appendChild(homeButton);

    const directionsService = new google.maps.DirectionsService();
  
    let dummy = '';
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
          
          dummy = port;
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
            clearMarkers();
            map.setZoom(map.getZoom() + 5);
            map.setCenter(port.position);
            showPortDetails(port);
            addedAttractions = [];
            document.getElementById("route-summary").innerHTML = ``
            document.getElementById("route-legs").innerHTML = ``

            currport = port;
            LocalAttractions(map, port.port, directionsService, directionsRenderer, port);

            

          });

          
        });
        console.log(dummy.port);
        planRoute(map, directionsService, dummy, [], directionsRenderer, false);
      });

      
  }
  