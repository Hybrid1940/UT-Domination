"use client";
import React, { useEffect, useRef } from 'react';
import 'mapbox-gl/dist/mapbox-gl.css';
import mapboxgl from 'mapbox-gl';

mapboxgl.accessToken = 'pk.eyJ1IjoibWFiYTUxNTQiLCJhIjoiY20yYjA3NmJ6MGUyZjJycTJ6c2pwOGh6OSJ9.ZiD4bckgU5CWeDmvLd1hww';

const Map = ({ latitude = 30.286, longitude = -97.7394, zoom = 14, coordinates = [], color = [], names = [], teams = [] }) => {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const markersRef = useRef([]); // To store references to markers and clear them when coordinates update

  useEffect(() => {
    if (map.current) return;

    const bounds = [
      [-97.7467 - 0.0145, 30.2815 - 0.0050], // Northwest bound moved 1 mile further left and down
      [-97.7315 + 0.0145, 30.2910 + 0.0090]  // Southeast bound moved 1 mile further right and up
    ];

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v11',
      center: [longitude, latitude],
      zoom: zoom,
      maxBounds: bounds
    });
  }, [latitude, longitude, zoom]);

  useEffect(() => {
    // Clear existing markers
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    // Proceed with rendering markers if all entries are valid
    coordinates.forEach((coord, index) => {
      if (
        Array.isArray(coord) &&
        coord.length === 2 &&
        typeof coord[0] === 'number' &&
        typeof coord[1] === 'number' &&
        coord[0] >= -90 && coord[0] <= 90 &&  // Check latitude range
        coord[1] >= -180 && coord[1] <= 180   // Check longitude range
      ) {
        const markerColor = color[index] || 'black'; // Default color is black if no color is provided
        const markerName = names[index] || "Unnamed Location"; // Default name if not provided
        const teamScores = teams[index] || {}; // Default to an empty object if no team data

        // Format team scores into a readable format with line breaks
        const teamScoresHTML = Object.entries(teamScores)
          .map(([team, score]) => `<strong>${team}</strong>: ${score}`)
          .join("<br>");

        // Create a popup with name and team scores
        const popupContent = `<div><strong>${markerName}</strong><br>${teamScoresHTML}</div>`;
        const popup = new mapboxgl.Popup({ offset: 25 })
          .setHTML(popupContent);

        const marker = new mapboxgl.Marker({ color: markerColor })
          .setLngLat([coord[1], coord[0]]) // coord is [lat, lng]
          .setPopup(popup) // Attach the popup to the marker
          .addTo(map.current);

        markersRef.current.push(marker); // Store reference to the marker
      } else {
        console.warn("Invalid coordinate detected and skipped:", coord);
      }
    });
  }, [coordinates, color, names, teams]);

  return <div ref={mapContainer} style={{ width: '100%', height: '550px' }} />;
};

export default Map;
