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

    // Fetch data separately
    fetchCollisionData(map);
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

// Fetch Collision Data
function fetchCollisionData(map) {

  const url = "https://services.arcgis.com/ZOyb2t4B0UYuYNYH/arcgis/rest/services/SDOT_Collisions_All_Years/FeatureServer/0/query?where=1%3D1&outFields=INJURIES,SERIOUSINJURIES,FATALITIES,INCDATE&outSR=4326&f=geojson";

  fetch(url)
    .then(response => response.json())
    .then(data => {
      console.log("Collision data loaded:", data.features.length);
      map.getSource("collisions").setData(data);
    })
    .catch(error => {
      console.error("Error fetching collision data:", error);
    });
}

// Cluster Click Interaction
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