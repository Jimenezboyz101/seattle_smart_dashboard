document.addEventListener("DOMContentLoaded", () => {

  mapboxgl.accessToken = "pk.eyJ1Ijoib3N3YWxkb2ppbWVuZXoiLCJhIjoiY21reGJqc3NkMDhxbTNqcHh4OGNlYm94OSJ9.OKsd-KUnhUT0HP-tWB8Yqg";

  // Initialize map
  const map = new mapboxgl.Map({
    container: "map",
    style: "mapbox://styles/mapbox/light-v11",
    center: [-122.3321, 47.6062],
    zoom: 11
  });

  map.on("load", () => {

    fetch("https://services.arcgis.com/ZOyb2t4B0UYuYNYH/arcgis/rest/services/SDOT_Collisions_All_Years/FeatureServer/0/query?where=1%3D1&outFields=INJURIES,SERIOUSINJURIES,FATALITIES,INCDATE&outSR=4326&f=geojson")
      .then(response => response.json())
      .then(data => {

        // Add GeoJSON source
        map.addSource("collisions", {
          type: "geojson",
          data: data
        });

      })
      .catch(error => {
        console.error("Error fetching collision data:", error);
      });

  });

});