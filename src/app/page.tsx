"use client";

import MapComponent from "./components/map";
import 'mapbox-gl/dist/mapbox-gl.css';

import React, { useEffect, useRef, useState } from 'react';
import mqtt, { MqttClient, IClientOptions } from 'mqtt';

const mqttUri = "wss://ut.playtakeover.tech"; // Replace with actual MQTT URI
const options: IClientOptions = {}; // Define any MQTT options here

interface Coordinate {
  lat: number;
  lng: number;
}

interface Color {
  r: number;
  g: number;
  b: number;
}

interface Teams {
  [key: string]: number;
}

export default function Home() {
  const clientRef = useRef<MqttClient | null>(null);
  const [coordinatesMap, setCoordinatesMap] = useState(new Map<string, Coordinate>());
  const [colorsMap, setColorsMap] = useState(new Map<string, Color>());
  const [namesMap, setNamesMap] = useState(new Map<string, string | null>());
  const [teamsMap, setTeamsMap] = useState(new Map<string, Teams>());

  useEffect(() => {
    if (!clientRef.current) {
      // Create the MQTT client and assign it to clientRef
      clientRef.current = mqtt.connect(mqttUri, options);

      clientRef.current.on('connect', () => {
        console.log(`Connected to MQTT broker at ${mqttUri}`);
        
        // Subscribe to all building coordinate, color, name, and team topics
        clientRef.current?.subscribe('dom/bldg/#', (err) => {
          if (err) {
            console.error(`Subscription error:`, err);
          } else {
            console.log('Subscribed to topic: dom/bldg/#');
          }
        });
      });

      // Handle incoming messages for coordinates, colors, names, and teams
      clientRef.current.on('message', (topic: string, message: Buffer) => {
        console.log("Received topic:", topic, "raw message:", message.toString());
        
        const buildingId = topic.split('/')[2]; // Extract building ID from topic (e.g., '6' from 'dom/bldg/6/coord')

        // Handle coordinate updates
        if (topic.endsWith('/coord')) {
          try {
            const data = JSON.parse(message.toString());
            if (Array.isArray(data) && data.length === 2 && 
                typeof data[0] === 'number' && typeof data[1] === 'number') {
              const [lat, lng] = data;
              setCoordinatesMap(prevMap => {
                const newMap = new Map(prevMap);
                newMap.set(buildingId, { lat, lng });
                return newMap;
              });
            }
          } catch (error) {
            console.error("Error parsing coordinate data:", error, "Raw message:", message.toString());
          }
        }

        // Handle color updates
        else if (topic.endsWith('/color')) {
          try {
            const data = JSON.parse(message.toString());
            if (Array.isArray(data) && data.length === 3 &&
                typeof data[0] === 'number' && typeof data[1] === 'number' && typeof data[2] === 'number') {
              const [r, g, b] = data;
              setColorsMap(prevMap => {
                const newMap = new Map(prevMap);
                newMap.set(buildingId, { r, g, b });
                return newMap;
              });
            }
          } catch (error) {
            console.error("Error parsing color data:", error, "Raw message:", message.toString());
          }
        }

        // Handle name updates
        else if (topic.endsWith('/name')) {
          const name = message.toString(); // Parse name as a string
          setNamesMap(prevMap => {
            const newMap = new Map(prevMap);
            newMap.set(buildingId, name || null); // Set to `null` if name is empty
            return newMap;
          });
        }

        // Handle team score updates
        else if (topic.endsWith('/teams')) {
          console.log("Received teams data:", message.toString());
          try {
            const data = JSON.parse(message.toString());
            if (typeof data === 'object' && data !== null) {
              // Verify all values are numbers to ensure they are valid scores
              const isValidTeamsData = Object.values(data).every(value => typeof value === 'number');
              if (isValidTeamsData) {
                setTeamsMap(prevMap => {
                  const newMap = new Map(prevMap);
                  newMap.set(buildingId, data); // Store teams data
                  return newMap;
                });
              } else {
                console.warn("Invalid team scores format:", data);
              }
            } else {
              console.warn("Teams data is not an object:", data);
            }
          } catch (error) {
            console.error("Error parsing teams data:", error, "Raw message:", message.toString());
          }
        }
      });
    }

    return () => {
      // Clean up the MQTT client on component unmount
      if (clientRef.current) {
        clientRef.current.unsubscribe('dom/bldg/#', (err) => {
          if (err) {
            console.error(`Unsubscription error:`, err);
          }
        });
        clientRef.current.end();
        clientRef.current = null;
      }
    };
  }, []);

  // Convert RGB color to hex format for MapComponent
  const rgbToHex = ({ r, g, b }: Color) =>
    `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;

  // Extract synchronized coordinates, colors, names, and teams arrays
  const coordinates = [];
  const colors = [];
  const names = [];
  const teams = [];

  for (const [buildingId, coord] of coordinatesMap.entries()) {
    // Check if the coordinate values are within a valid range before adding
    if (coord.lat >= -90 && coord.lat <= 90 && coord.lng >= -180 && coord.lng <= 180) {
      coordinates.push([coord.lat, coord.lng]);
      colors.push(colorsMap.has(buildingId) ? rgbToHex(colorsMap.get(buildingId)!) : '#000000'); // Default to black if color is not available
      names.push(namesMap.get(buildingId) || null); // Set to null if name is not available
      teams.push(teamsMap.get(buildingId) || {}); // Push team scores or an empty object if not available
    } else {
      console.warn(`Invalid coordinate range for building ${buildingId}:`, coord);
    }
  }

  console.log("Final coordinates:", coordinates);
  console.log("Final colors:", colors);
  console.log("Final names:", names);
  console.log("Final teams:", teams);

  return (
    <div>
      <main>
        <h1>UT Domination</h1>

        {/* MapComponent with synchronized coordinates, colors, names, and teams arrays */}
        <MapComponent latitude={30.286} longitude={-97.7394} zoom={13} coordinates={coordinates} color={colors} names={names} teams={teams} />

        {/* Team 1 Dropdown */}
        <details style={{ width: '100%', textAlign: 'center', backgroundColor: 'blue', color: 'white', padding: '10px', marginTop: '10px' }}>
          <summary style={{ cursor: 'pointer', fontSize: '1.5em' }}>Team 1</summary>
          <ul style={{ listStyleType: 'none', padding: 0, margin: '10px 0' }}>
            <li>Member 1</li>
            <li>Member 2</li>
            <li>Member 3</li>
          </ul>
        </details>

        {/* Team 2 Dropdown */}
        <details style={{ width: '100%', textAlign: 'center', backgroundColor: 'blue', color: 'white', padding: '10px', marginTop: '10px' }}>
          <summary style={{ cursor: 'pointer', fontSize: '1.5em' }}>Team 2</summary>
          <ul style={{ listStyleType: 'none', padding: 0, margin: '10px 0' }}>
            <li>Member 1</li>
            <li>Member 2</li>
            <li>Member 3</li>
          </ul>
        </details>

        {/* Display coordinates, colors, names, and team scores received from MQTT */}
        <ul>
          {Array.from(coordinatesMap.entries()).map(([buildingId, coord], index) => (
            <li key={index}>
              Building {buildingId} - Lat: {coord.lat}, Lng: {coord.lng}, 
              Color: {colorsMap.get(buildingId) ? rgbToHex(colorsMap.get(buildingId)!) : 'Black'},
              Name: {namesMap.get(buildingId) || 'Unnamed'},
              Teams: {JSON.stringify(teamsMap.get(buildingId) || {})}
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}
