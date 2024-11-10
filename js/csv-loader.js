async function loadCSV(file) {
    const response = await fetch(file);
    const data = await response.text();
    
    // Parsing the CSV data
    const parsedData = data.split('\n').slice(1).map(line => {
        const [day, date, port, country, attraction, type, description, arrival, departure, latitude, longitude] = line.split(',');
        
        // Ensure Latitude and Longitude are converted to numbers
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
            Latitude: parseFloat(latitude),  // Convert Latitude to a number
            Longitude: parseFloat(longitude)  // Convert Longitude to a number
        };
    });
    
    console.log(parsedData);  // Check the parsed data here
    return parsedData;
}
