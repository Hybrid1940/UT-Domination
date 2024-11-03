"use client";

import MapComponent from "./components/map";
import 'mapbox-gl/dist/mapbox-gl.css';
import React, { useEffect, useRef, useState } from 'react';
import mqtt, { MqttClient, IClientOptions } from 'mqtt';
import TimeDisplay from "./intToDate";

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
  const [showModal, setShowModal] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!clientRef.current) {
      clientRef.current = mqtt.connect(mqttUri, options);

      clientRef.current.on('connect', () => {
        console.log(`Connected to MQTT broker at ${mqttUri}`);
        clientRef.current?.subscribe('dom/bldg/#', (err) => {
          if (err) {
            console.error(`Subscription error:`, err);
          } else {
            console.log('Subscribed to topic: dom/bldg/#');
          }
        });
      });

      clientRef.current.on('message', (topic: string, message: Buffer) => {
        console.log("Received topic:", topic, "raw message:", message.toString());
        const buildingId = topic.split('/')[2];

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
        } else if (topic.endsWith('/color')) {
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
        } else if (topic.endsWith('/name')) {
          const name = message.toString();
          setNamesMap(prevMap => {
            const newMap = new Map(prevMap);
            newMap.set(buildingId, name || null);
            return newMap;
          });
        } else if (topic.endsWith('/teams')) {
          try {
            const data = JSON.parse(message.toString());
            if (typeof data === 'object' && data !== null) {
              const isValidTeamsData = Object.values(data).every(value => typeof value === 'number');
              if (isValidTeamsData) {
                setTeamsMap(prevMap => {
                  const newMap = new Map(prevMap);
                  newMap.set(buildingId, data);
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

  const rgbToHex = ({ r, g, b }: Color) =>
    `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;

  const coordinates = [];
  const colors = [];
  const names = [];
  const teams = [];

  for (const [buildingId, coord] of coordinatesMap.entries()) {
    if (coord.lat >= -90 && coord.lat <= 90 && coord.lng >= -180 && coord.lng <= 180) {
      coordinates.push([coord.lat, coord.lng]);
      colors.push(colorsMap.has(buildingId) ? rgbToHex(colorsMap.get(buildingId)!) : '#000000');
      names.push(namesMap.get(buildingId) || null);
      teams.push(teamsMap.get(buildingId) || {});
    } else {
      console.warn(`Invalid coordinate range for building ${buildingId}:`, coord);
    }
  }

  const openCamera = async () => {
    setShowModal(true);
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
    }
  };

  const closeCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setShowModal(false);
    setCapturedImage(null); // Clear captured image when closing the camera
  };

  const takePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d');
      if (context) {
        context.drawImage(videoRef.current, 0, 0, canvasRef.current.width, canvasRef.current.height);
        const imageDataUrl = canvasRef.current.toDataURL('image/png');
        setCapturedImage(imageDataUrl); // Save the captured image
      }
    }
  };

  return (
    <div>
      <main>
        <h1>UT Domination</h1>

        <MapComponent latitude={30.286} longitude={-97.7394} zoom={5} coordinates={coordinates} color={colors} names={names} teams={teams} />
        <button onClick={showModal ? closeCamera : openCamera} style={{ marginTop: '20px', padding: '10px', fontSize: '1.2em' }}>
          {showModal ? "Close Camera" : "Open Camera"}
        </button>

        {showModal && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000
          }}>
            <div style={{
              backgroundColor: 'white',
              padding: '20px',
              borderRadius: '8px',
              width: '90%',
              maxWidth: '500px',
              textAlign: 'center'
            }}>
              <h2>Camera</h2>
              <video ref={videoRef} autoPlay style={{ width: '100%', maxHeight: '400px' }} />
              <button onClick={takePhoto} style={{ marginTop: '10px', padding: '10px', fontSize: '1.2em' }}>Take Photo</button>

              <canvas ref={canvasRef} style={{ display: 'none' }} width="640" height="480"></canvas>
              {capturedImage && (
                <div style={{ display: 'flex', justifyContent: 'center', marginTop: '20px' }}>
                  <img src={capturedImage} alt="Captured" style={{ width: '50%', maxHeight: '200px', objectFit: 'contain' }} />
                </div>
              )}

              {/* Dropdown for Team Members */}
              <div style={{ marginTop: '20px' }}>
                <label htmlFor="teamMember" style={{ display: 'block', marginBottom: '8px' }}>Select Team Member:</label>
                <select id="teamMember" style={{
                  padding: '10px',
                  fontSize: '1em',
                  width: '100%',
                  maxWidth: '400px',
                  borderRadius: '4px',
                  border: '1px solid #ccc',
                  backgroundColor: '#007bff',
                  color: 'white',
                  appearance: 'none'
                }}>
                  <option value="">Choose a member</option>
                  <option value="member1">Team Member 1</option>
                  <option value="member2">Team Member 2</option>
                  <option value="member3">Team Member 3</option>
                  {/* Add more team members as needed */}
                </select>
              </div>

              {/* Submission and Close Buttons */}
              <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginTop: '20px' }}>
                <button onClick={() => {
                  alert("Submission successful!");
                  closeCamera(); // Close the modal after the alert
                }} style={{
                  padding: '10px',
                  fontSize: '1.2em',
                  backgroundColor: '#007bff',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}>
                  Submit
                </button>
                <button onClick={closeCamera} style={{
                  padding: '10px',
                  fontSize: '1.2em',
                  backgroundColor: '#007bff',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}>
                  Close
                </button>
              </div>
            </div>
          </div>
        )}




        <details style={{ width: '100%', textAlign: 'center', backgroundColor: 'blue', color: 'white', padding: '10px', marginTop: '10px' }}>
          <summary style={{ cursor: 'pointer', fontSize: '1.5em' }}>Team 1</summary>
          <ul style={{ listStyleType: 'none', padding: 0, margin: '10px 0' }}>
            <li>Member 1</li>
            <li>Member 2</li>
            <li>Member 3</li>
          </ul>
        </details>

        <details style={{ width: '100%', textAlign: 'center', backgroundColor: 'blue', color: 'white', padding: '10px', marginTop: '10px' }}>
          <summary style={{ cursor: 'pointer', fontSize: '1.5em' }}>Team 2</summary>
          <ul style={{ listStyleType: 'none', padding: 0, margin: '10px 0' }}>
            <li>Member 1</li>
            <li>Member 2</li>
            <li>Member 3</li>
          </ul>
        </details>

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
