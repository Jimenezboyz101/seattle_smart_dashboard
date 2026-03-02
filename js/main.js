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

    map.addSource("collisions-clustered", {
      type: "geojson",
      data: {
        type: "FeatureCollection",
        features: []
      },
      cluster: true,
      clusterMaxZoom: 14,
      clusterRadius: 50
    });

    map.addSource("collisions-points", {
      type: "geojson",
      data: {
        type: "FeatureCollection",
        features: []
      }
    });
    
    addCollisionLayers(map);

    setupLayerToggle(map);

    setupSeverityFilter(map);

    // layers

    // collision points with severity-based colouring
    map.addLayer({
      id: "collision-points",
      type: "circle",
      source: "collisions-points",
      paint: {
        "circle-radius": 4,
        "circle-opacity": 0.7,
        "circle-color": [
        "case",

        [">", ["get", "FATALITIES"], 0],
        "#d62828",

        [">", ["get", "SERIOUSINJURIES"], 0],
        "#f77f00",

        [">", ["get", "INJURIES"], 0],
        "#fcbf49",

        // Default (no injury)
        "#457b9d"
      ]
    },

    layout: {
      visibility: "none"
    }
  });

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
    source: "collisions-clustered",
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
    source: "collisions-clustered",
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
      map.getSource("collisions-clustered").setData(data);
      map.getSource("collisions-points").setData(data);

      generateSeverityChart(data);
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

    map.getSource("collisions-clustered").getClusterExpansionZoom(
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

// Toggle Menu
function setupLayerToggle(map) {
  const radios = document.querySelectorAll('input[name="mapLayer"]');

  radios.forEach(radio => {
    radio.addEventListener("change", (e) => {
      const selected = e.target.value;

      map.setLayoutProperty("clusters", "visibility", "none");
      map.setLayoutProperty("cluster-count", "visibility", "none");
      map.setLayoutProperty("collision-points", "visibility", "none");

      if (selected === "cluster") {
        map.setLayoutProperty("clusters", "visibility", "visible");
        map.setLayoutProperty("cluster-count", "visibility", "visible");
      }

      if (selected === "points") {
        map.setLayoutProperty("collision-points", "visibility", "visible");
      }
    });
  });
}

// Severity Filter
function setupSeverityFilter(map) {
  const dropdown = document.getElementById("severityFilter");

  dropdown.addEventListener("change", (e) => {
    const value = e.target.value;

    let filter;

    if (value === "fatal") {
      filter = ["all",
        ["!", ["has", "point_count"]],
        [">", ["get", "FATALITIES"], 0]
      ];
    }

    else if (value === "serious") {
      filter = ["all",
        ["!", ["has", "point_count"]],
        [">", ["get", "SERIOUSINJURIES"], 0]
      ];
    }

    else if (value === "minor") {
      filter = ["all",
        ["!", ["has", "point_count"]],
        [">", ["get", "INJURIES"], 0]
      ];
    }

    else {
      filter = ["!", ["has", "point_count"]];
    }

    map.setFilter("collision-points", filter);
  });
}

// Severity Chart
function generateSeverityChart(data) {

  let fatal = 0;
  let serious = 0;
  let minor = 0;
  let none = 0;

  data.features.forEach(feature => {

    if (feature.properties.FATALITIES > 0) {
      fatal++;
    }
    else if (feature.properties.SERIOUSINJURIES > 0) {
      serious++;
    }
    else if (feature.properties.INJURIES > 0) {
      minor++;
    }
    else {
      none++;
    }

  });

  c3.generate({
    bindto: '#barChart',
    
    size: {
    height: 250,   // adjust as needed
    width: 400     // adjust as needed
  },
    data: {
      columns: [
        ['Fatal', fatal],
        ['Serious Injury', serious],
        ['Minor Injury', minor],
        ['No Injury', none]
      ],
      type: 'bar',
      colors: {
        Fatal: '#d62828',
        'Serious Injury': '#f77f00',
        'Minor Injury': '#fcbf49',
        'No Injury': '#457b9d'
      }
    },
    axis: {
      y: {
        label: {
          text: 'Number of Collisions',
          position: 'outer-middle'
        }
      }
    }
  });

}