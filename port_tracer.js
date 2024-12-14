// Function to enable draggable curve with control points
function enableMultiControlCurve(map, start, end) {
  // Start and End markers
  const startMarker = new google.maps.Marker({
    position: start,
    map,
    draggable: true,
    title: "Start Point",
    icon: "http://maps.google.com/mapfiles/ms/icons/green-dot.png",
  });

  const endMarker = new google.maps.Marker({
    position: end,
    map,
    draggable: true,
    title: "End Point",
    icon: "http://maps.google.com/mapfiles/ms/icons/red-dot.png",
  });

  // Generate 10 draggable control points
  const numControlPoints = 10;
  const controlMarkers = [];
  const polyline = new google.maps.Polyline({
    path: [],
    strokeColor: "blue",
    strokeOpacity: 0.8,
    strokeWeight: 2,
    map: map,
  });

  function initializeControlPoints() {
    for (let i = 1; i <= numControlPoints; i++) {
      const fraction = i / (numControlPoints + 1);
      const controlLat = start.lat + (end.lat - start.lat) * fraction;
      const controlLng = start.lng + (end.lng - start.lng) * fraction;

      const controlMarker = new google.maps.Marker({
        position: { lat: controlLat, lng: controlLng },
        map,
        draggable: true,
        title: `Control Point ${i}`,
        icon: "http://maps.google.com/mapfiles/ms/icons/yellow-dot.png",
      });
      controlMarkers.push(controlMarker);
    }
  }

  function updateCurve() {
    const path = [startMarker.getPosition().toJSON()];
    controlMarkers.forEach((marker) => {
      path.push(marker.getPosition().toJSON());
    });
    path.push(endMarker.getPosition().toJSON());

    polyline.setPath(path);
  }

  // Initialize control points and curve
  initializeControlPoints();
  updateCurve();

  // Add event listeners to update curve on drag
  startMarker.addListener("drag", updateCurve);
  endMarker.addListener("drag", updateCurve);
  controlMarkers.forEach((marker) => {
    marker.addListener("drag", updateCurve);
  });

  // Function to save the control points for reuse
  function saveControlPoints() {
    const savedPoints = [
      startMarker.getPosition().toJSON(),
      ...controlMarkers.map((marker) => marker.getPosition().toJSON()),
      endMarker.getPosition().toJSON(),
    ];
    console.log("Saved Control Points:", JSON.stringify(savedPoints));
  }

  // Save button to log control points to console
  const saveButton = document.createElement("button");
  saveButton.textContent = "Save Control Points";
  saveButton.style.position = "absolute";
  saveButton.style.top = "10px";
  saveButton.style.left = "10px";
  saveButton.style.zIndex = "1000";
  saveButton.onclick = saveControlPoints;
  map.controls[google.maps.ControlPosition.TOP_LEFT].push(saveButton);
}

function loadFinalCurve(map, savedPoints) {
  const finalCurve = new google.maps.Polyline({
    path: savedPoints, // Control points define the path
    strokeColor: "blue",
    strokeOpacity: 0.8,
    strokeWeight: 2,
    map: map,
  });

  // Add Start (green) and End (red) markers only
  new google.maps.Marker({
    position: savedPoints[0], // Start Point
    map: map,
    title: "Start Point",
    icon: "http://maps.google.com/mapfiles/ms/icons/green-dot.png",
  });

  new google.maps.Marker({
    position: savedPoints[savedPoints.length - 1], // End Point
    map: map,
    title: "End Point",
    icon: "http://maps.google.com/mapfiles/ms/icons/red-dot.png",
  });
}

// Initialize map
function initMap() {
  const map = new google.maps.Map(document.getElementById("map"), {
    center: { lat: 37.9365963, lng: 25.6210059 },
    zoom: 6.6,
  });

  // Example start and end points
  const start = { lat: 37.9447622, lng: 23.6383111}; // Example start
  const end = { lat: 36.386160, lng: 25.430320 };   // Example end

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
}
