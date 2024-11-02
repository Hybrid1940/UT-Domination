// components/Map.js
"use client";
import React, { useEffect, useRef } from 'react';
import 'mapbox-gl/dist/mapbox-gl.css';
import mapboxgl from 'mapbox-gl';
import { polygons } from './polygons';

mapboxgl.accessToken = 'pk.eyJ1IjoibWFiYTUxNTQiLCJhIjoiY20yYjA3NmJ6MGUyZjJycTJ6c2pwOGh6OSJ9.ZiD4bckgU5CWeDmvLd1hww';

const Map = ({ latitude = 30.286, longitude = -97.7394, zoom = 14 }) => {
  const mapContainer = useRef(null);
  const map = useRef(null);

  useEffect(() => {
    if (map.current) return;

    const bounds = [
      [-97.7467, 30.2815],
      [-97.7315, 30.2910]
    ];

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v11',
      center: [longitude, latitude],
      zoom: zoom,
      maxBounds: bounds
    });

    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

    // Add each polygon from the polygons file with borders
    map.current.on('load', () => {
      Object.keys(polygons).forEach((key) => {
        // Add polygon as a source
        map.current.addSource(key, {
          type: 'geojson',
          data: polygons[key],
        });

        // Add a fill layer to display the polygon with a border
        map.current.addLayer({
          id: `${key}-fill`,
          type: 'fill',
          source: key,
          paint: {
            'fill-color': '#888888', // Set the fill color
            'fill-opacity': 0.5,     // Set the fill opacity
          }
        });

        // Add a line layer to display the border of the polygon
        map.current.addLayer({
          id: `${key}-border`,
          type: 'line',
          source: key,
          paint: {
            'line-color': '#FF0000', // Set the border color
            'line-width': 2,         // Set the border width
          }
        });
      });
    });

    // Add a singular point marker at the UT Tower location
    const utTowerCoordinates = [-97.7394, 30.2861]; // Coordinates for UT Tower

    // Create a popup with the desired content
    const popup = new mapboxgl.Popup({ offset: 25 }).setText(
      'UT Tower - University of Texas at Austin'
    );

    // Create the marker and attach the popup
    new mapboxgl.Marker({ color: 'purple' })
      .setLngLat(utTowerCoordinates)
      .setPopup(popup) // Attach the popup to the marker
      .addTo(map.current);

  }, [latitude, longitude, zoom]);

  return <div ref={mapContainer} style={{ width: '100%', height: '550px' }} />;
};

export default Map;
