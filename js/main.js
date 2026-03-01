document.addEventListener("DOMContentLoaded", () => {

  mapboxgl.accessToken = "pk.eyJ1Ijoib3N3YWxkb2ppbWVuZXoiLCJhIjoiY21reGJqc3NkMDhxbTNqcHh4OGNlYm94OSJ9.OKsd-KUnhUT0HP-tWB8Yqg";

  const slider = document.getElementById("timeSlider");
  const yearLabel = document.getElementById("selectedYear");

  yearLabel.textContent = slider.value;

  // Initialize map
  const map = new mapboxgl.Map({
    container: "map",
    style: "mapbox://styles/mapbox/light-v11",
    center: [-122.3321, 47.6062],
    zoom: 11
  });

  map.on("load", () => {

    map.addSource("collisions", {
      type: "geojson",
      data: {
        type: "FeatureCollection",
        features: []
      },
      cluster: true,
      clusterMaxZoom: 14,
      clusterRadius: 50
    });

    // layers
    addCollisionLayers(map);

    // interactions
    addClusterClickHandler(map);

    // Initial fetch for starting year
    fetchCollisionData(map, slider.value);
  });

  // When time slider moves
  slider.addEventListener("change", (e) => {
    const selectedYear = e.target.value;
    yearLabel.textContent = selectedYear;
    fetchCollisionData(map, selectedYear);
  });

});

// Add Collision Layers
function addCollisionLayers(map) {

  // Cluster circles
  map.addLayer({
    id: "clusters",
    type: "circle",
    source: "collisions",
    filter: ["has", "point_count"],
    paint: {
      "circle-color": [
        "step",
        ["get", "point_count"],
        "#51bbd6",
        100, "#f1f075",
        300, "#f28cb1"
      ],
      "circle-radius": [
        "step",
        ["get", "point_count"],
        18,
        100, 28,
        500, 38
      ],
      "circle-opacity": 0.85
    }
  });

  // Cluster count labels
  map.addLayer({
    id: "cluster-count",
    type: "symbol",
    source: "collisions",
    filter: ["has", "point_count"],
    layout: {
      "text-field": "{point_count_abbreviated}",
      "text-size": 12
    },
    paint: {
      "text-color": "#000000"
    }
  });

}

// Fetch Collision Data By Year
function fetchCollisionData(map, year) {

  const baseUrl = "https://services.arcgis.com/ZOyb2t4B0UYuYNYH/arcgis/rest/services/SDOT_Collisions_All_Years/FeatureServer/0/query";

  const whereClause = `
    INCDATE >= DATE '${year}-01-01'
    AND INCDATE < DATE '${Number(year) + 1}-01-01'
  `;

  const url = `${baseUrl}?where=${encodeURIComponent(whereClause)}
    &outFields=INJURIES,SERIOUSINJURIES,FATALITIES,INCDATE
    &outSR=4326
    &returnGeometry=true
    &f=geojson`;

  fetch(url)
    .then(response => response.json())
    .then(data => {
      console.log(`Loaded ${data.features.length} collisions for ${year}`);
      map.getSource("collisions").setData(data);
    })
    .catch(error => {
      console.error("Error fetching collision data:", error);
    });
}

// Cluster Click
function addClusterClickHandler(map) {

  map.on("click", "clusters", (e) => {
    const features = map.queryRenderedFeatures(e.point, {
      layers: ["clusters"]
    });

    const clusterId = features[0].properties.cluster_id;

    map.getSource("collisions").getClusterExpansionZoom(
      clusterId,
      (err, zoom) => {
        if (err) return;

        map.easeTo({
          center: features[0].geometry.coordinates,
          zoom: zoom
        });
      }
    );
  });

}