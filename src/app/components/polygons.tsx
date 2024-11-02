// data/polygons.js

export const polygons = {
    utTower: {
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [-97.7398, 30.2865],
            [-97.7392, 30.2865],
            [-97.7392, 30.2858],
            [-97.7398, 30.2858],
            [-97.7398, 30.2865]
          ]
        ]
      }
    },
    gatesDellComplex: {
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [
            [
                [-97.7370, 30.2866], // Bottom-left corner
                [-97.7363, 30.2866], // Bottom-right corner
                [-97.7363, 30.2861], // Top-right corner
                [-97.7370, 30.2861], // Top-left corner
                [-97.7370, 30.2866]  // Closing the polygon
              ]
        ]
      }
    },
    // Add more polygons here as needed
  };