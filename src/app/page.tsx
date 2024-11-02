import Image from "next/image";
import React from 'react';
import Map from "./components/map";
import 'mapbox-gl/dist/mapbox-gl.css';
import {connectMqtt} from "./utils/mqttClient";


export default function Home() {
  return (
    <div className="">
      <main className="">
        <h1>UT Domination</h1>
        {/* integrate mqtt client */}

        {/* Map component */}
        <Map latitude={30.286} longitude={-97.7394} zoom={13} />

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

      </main>
    </div>
  );
}
