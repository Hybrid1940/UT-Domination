"use client";
import React, { useEffect, useRef } from 'react';
import 'mapbox-gl/dist/mapbox-gl.css';
import mapboxgl from 'mapbox-gl';

function formatSecondsToTime(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  const parts = [];
  if (hours > 0) parts.push(`${hours} ${hours === 1 ? 'hour' : 'hours'}`);
  if (minutes > 0) parts.push(`${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`);
  if (secs > 0 || parts.length === 0) parts.push(`${secs} ${secs === 1 ? 'second' : 'seconds'}`);

  return parts.join(', ');
}

mapboxgl.accessToken = 'pk.eyJ1IjoibWFiYTUxNTQiLCJhIjoiY20yYjA3NmJ6MGUyZjJycTJ6c2pwOGh6OSJ9.ZiD4bckgU5CWeDmvLd1hww';

const Map = ({ latitude = 30.286, longitude = -97.7394, zoom = 14, coordinates = [], color = [], names = [], teams = [], users = [] }) => {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const markersRef = useRef({}); // Store markers in an object keyed by coordinate

  useEffect(() => {
    if (map.current) return;

    const bounds = [
      [-97.7467 - 0.0145, 30.2815 - 0.0050],
      [-97.7315 + 0.0145, 30.2910 + 0.0090]
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
    coordinates.forEach((coord, index) => {
      if (
        Array.isArray(coord) &&
        coord.length === 2 &&
        typeof coord[0] === 'number' &&
        typeof coord[1] === 'number' &&
        coord[0] >= -90 && coord[0] <= 90 &&
        coord[1] >= -180 && coord[1] <= 180
      ) {
        const markerKey = `${coord[0]}-${coord[1]}`; // Unique key for each marker by location
        const markerColor = color[index] || 'black';
        const markerName = names[index] || "Unnamed Location";
        const teamScores = teams[index] || {};
        const userScores = users[index] || {};

        // Format team and user scores into HTML
        const teamScoresHTML = Object.entries(teamScores)
          .map(([team, score]) => `<strong>${team}</strong>: ${score}`)
          .join("<br>");
          
        const userScoresHTML = Object.entries(userScores)
          .sort(([, a], [, b]) => b - a)
          .map(([user, score]) => `<strong>${user}</strong>: ${formatSecondsToTime(score)}`)
          .join("<br>");
          
        const popupContent = `
          <div style="color: black;">
            <strong>${markerName}</strong><br>
            <div><strong>Teams:</strong><br>${teamScoresHTML}</div>
            <div style="margin-top: 8px;"><strong>Users:</strong><br>${userScoresHTML}</div>
          </div>
        `;

        if (markersRef.current[markerKey]) {
          // If marker exists, update its popup content
          markersRef.current[markerKey].getPopup().setHTML(popupContent);
        } else {
          // Create a new marker and popup
          const popup = new mapboxgl.Popup({ offset: 25 }).setHTML(popupContent);
          const marker = new mapboxgl.Marker({ color: markerColor })
            .setLngLat([coord[1], coord[0]])
            .setPopup(popup)
            .addTo(map.current);

          markersRef.current[markerKey] = marker; // Store the marker in the ref
        }
      } else {
        console.warn("Invalid coordinate detected and skipped:", coord);
      }
    });
  }, [coordinates, color, names, teams, users]);

  return <div ref={mapContainer} style={{ width: '100%', height: '550px' }} />;
};

export default Map;
