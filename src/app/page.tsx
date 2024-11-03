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

interface Users {
  [key: string]: number;
}

export default function Home() {
  const clientRef = useRef<MqttClient | null>(null);
  const [coordinatesMap, setCoordinatesMap] = useState(new Map<string, Coordinate>());
  const [colorsMap, setColorsMap] = useState(new Map<string, Color>());
  const [namesMap, setNamesMap] = useState(new Map<string, string | null>());
  const [teamsMap, setTeamsMap] = useState(new Map<string, Teams>());
  const [usersMap, setUsersMap] = useState(new Map<string, Users>()); // New map for users
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
        } else if (topic.endsWith('/users')) {
          try {
            const data = JSON.parse(message.toString());
            if (typeof data === 'object' && data !== null) {
              const isValidUsersData = Object.values(data).every(value => typeof value === 'number');
              if (isValidUsersData) {
                setUsersMap(prevMap => {
                  const newMap = new Map(prevMap);
                  newMap.set(buildingId, data); // Store users data in usersMap
                  return newMap;
                });
              } else {
                console.warn("Invalid user scores format:", data);
              }
            } else {
              console.warn("Users data is not an object:", data);
            }
          } catch (error) {
            console.error("Error parsing users data:", error, "Raw message:", message.toString());
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
  const users = []; // Array to hold users data for each building

  for (const [buildingId, coord] of coordinatesMap.entries()) {
    if (coord.lat >= -90 && coord.lat <= 90 && coord.lng >= -180 && coord.lng <= 180) {
      coordinates.push([coord.lat, coord.lng]);
      colors.push(colorsMap.has(buildingId) ? rgbToHex(colorsMap.get(buildingId)!) : '#000000');
      names.push(namesMap.get(buildingId) || null);
      teams.push(teamsMap.get(buildingId) || {});
      users.push(usersMap.get(buildingId) || {}); // Add users data to the array
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

  // Extract usernames for building 32 if available
  const building32Users = usersMap.get("32") ? Object.keys(usersMap.get("32")) : [];

  return (
    <div>
      <main>
        <div style={{
          textAlign: 'center',
          marginBottom: '10px',
          padding: '20px',
          color: 'white',
          background: 'linear-gradient(90deg, #BF5700, #FF6B00)', // Burnt orange gradient
          borderRadius: '8px',
          boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.3)',
        }}>
          <h1 style={{
            fontSize: '3em',
            fontWeight: 'bold',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            textShadow: '2px 2px 8px rgba(0, 0, 0, 0.5)',
            fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif',
          }}>
            TakeOver UT
          </h1>
        </div>
        <MapComponent latitude={30.286} longitude={-97.7394} zoom={5} coordinates={coordinates} color={colors} names={names} teams={teams} users={users} />
        <div style={{ textAlign: 'center' }}>
          <button onClick={showModal ? closeCamera : openCamera} style={{
            marginTop: '20px',
            padding: '12px 20px',
            fontSize: '1.2em',
            borderRadius: '8px',
            border: 'none',
            color: 'white',
            background: 'linear-gradient(90deg, #BF5700, #FF6B00)', // Burnt orange gradient
            boxShadow: '0px 4px 8px rgba(0, 0, 0, 0.3)',
            cursor: 'pointer',
            fontWeight: 'bold',
            transition: 'transform 0.2s ease, box-shadow 0.2s ease',
          }}
          onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
          onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
          >
            {showModal ? "Close Camera" : "Open Camera"}
          </button>
        </div>
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <div style={{
            width: '45%',
            marginRight: '40px',
            padding: '20px',
            color: 'white',
            background: '#0000ff', // Burnt orange gradient
            textAlign: 'center',
            boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.3)',
            borderRadius: '8px',
            marginTop: '20px',
          }}>
            <h2 style={{
              fontSize: '2em',
              fontWeight: 'bold',
              margin: '0',
            }}>
              Team 1 - Score: 150
            </h2>
            <p style={{
              fontSize: '1.25em',
              margin: '0',
              opacity: '0.95',
            }}>
              Member 1: 80 points<br />
              Member 2: 70 points
            </p>
          </div>
          <div style={{
            width: '45%',
            padding: '20px',
            color: 'white',
            background: '#ff0000', // Burnt orange gradient
            textAlign: 'center',
            boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.3)',
            borderRadius: '8px',
            marginTop: '20px',
          }}>
            <h2 style={{
              fontSize: '2em',
              fontWeight: 'bold',
              margin: '0',
            }}>
              Team 1 - Score: 150
            </h2>
            <p style={{
              fontSize: '1.25em',
              margin: '0',
              opacity: '0.95',
            }}>
              Member 1: 80 points<br />
              Member 2: 70 points
            </p>
          </div>

        </div>

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
              background: 'linear-gradient(90deg, #BF5700, #FF6B00)', // Burnt orange gradient
              color: 'white',
              padding: '20px',
              borderRadius: '8px',
              width: '90%',
              maxWidth: '500px',
              textAlign: 'center',
              boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.3)',
            }}>
              <h2 style={{
                fontSize: '1.8em',
                fontWeight: 'bold',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                textShadow: '2px 2px 6px rgba(0, 0, 0, 0.3)',
                marginBottom: '20px',
              }}>Camera</h2>
              <video ref={videoRef} autoPlay style={{ width: '100%', maxHeight: '400px', borderRadius: '8px' }} />
              <button onClick={takePhoto} style={{
                marginTop: '20px',
                padding: '10px 20px',
                fontSize: '1.2em',
                borderRadius: '8px',
                border: 'none',
                color: 'white',
                background: 'linear-gradient(90deg, #BF5700, #FF6B00)',
                boxShadow: '0px 4px 8px rgba(0, 0, 0, 0.3)',
                cursor: 'pointer',
                fontWeight: 'bold',
                transition: 'transform 0.2s ease, box-shadow 0.2s ease',
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
              >Take Photo</button>

              <canvas ref={canvasRef} style={{ display: 'none' }} width="640" height="480"></canvas>
              {capturedImage && (
                <div style={{ display: 'flex', justifyContent: 'center', marginTop: '20px' }}>
                  <img src={capturedImage} alt="Captured" style={{ width: '50%', maxHeight: '200px', objectFit: 'contain', borderRadius: '8px' }} />
                </div>
              )}

              {/* Dropdown for Team Members populated with users from building 32 */}
              <div style={{ marginTop: '20px' }}>
                <label htmlFor="teamMember" style={{ display: 'block', marginBottom: '8px', color: 'white' }}>Select Team Member:</label>
                <select id="teamMember" style={{
                  padding: '10px',
                  fontSize: '1em',
                  width: '100%',
                  maxWidth: '400px',
                  borderRadius: '4px',
                  border: '1px solid #ccc',
                  backgroundColor: 'white', // White background
                  color: 'black', // Black text
                  appearance: 'none',
                  boxShadow: '0px 4px 8px rgba(0, 0, 0, 0.1)', // Light shadow for depth
                }}>
                  <option value="">Choose a member</option>
                  {building32Users.map((user, index) => (
                    <option key={index} value={user}>{user}</option>
                  ))}
                </select>
              </div>


              {/* Submission and Close Buttons */}
              <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginTop: '20px' }}>
                <button onClick={() => {
                  closeCamera(); // Close the modal after the alert
                }} style={{
                  padding: '10px 20px',
                  fontSize: '1.2em',
                  background: 'linear-gradient(90deg, #BF5700, #FF6B00)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  boxShadow: '0px 4px 8px rgba(0, 0, 0, 0.3)',
                  transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                }}
                onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                >
                  Submit
                </button>
                <button onClick={closeCamera} style={{
                  padding: '10px 20px',
                  fontSize: '1.2em',
                  background: 'linear-gradient(90deg, #BF5700, #FF6B00)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  boxShadow: '0px 4px 8px rgba(0, 0, 0, 0.3)',
                  transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                }}
                onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}


        <ul>
          {Array.from(coordinatesMap.entries()).map(([buildingId, coord], index) => (
            <li key={index}>
              <div>Building {buildingId}</div>
              <div>Lat: {coord.lat}, Lng: {coord.lng}</div>
              <div>Color: {colorsMap.get(buildingId) ? rgbToHex(colorsMap.get(buildingId)!) : 'Black'}</div>
              <div>Name: {namesMap.get(buildingId) || 'Unnamed'}</div>
              <div>Teams: {JSON.stringify(teamsMap.get(buildingId) || {})}</div>
              <div>Users: {JSON.stringify(usersMap.get(buildingId) || {})}</div>
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}
