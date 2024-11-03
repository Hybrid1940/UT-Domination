# UT Domination Developer Guide

## What is UT Domination

UT Domination is a game where players capture buildings across UT Austin and west campus by spending more time in a building than the opposing team. 

## Image Demonstrations

![frontend](https://github.com/user-attachments/assets/7354c0ad-bf67-4f1d-b0f2-f60794f96a5b)

![20241103_103731](https://github.com/user-attachments/assets/763275d9-efed-48e1-a03f-cc31894a21f7)

![20241103_103704](https://github.com/user-attachments/assets/3e3b43a3-3986-424e-b2c5-7c26acb587f5)


## Overall Hierarchial Structure

## Frontend

For the frontend, we utilized nextJS and mapbox (https://www.mapbox.com/) for our UI. We utilize mapbox for the map data and displays it individually for the user. This all communicates with the MQTT server that is running on a raspberry pi as well 

![frontend](https://github.com/user-attachments/assets/956c44b8-9076-4e83-8848-741aaf84f8a6)

## Backend

The backend is ran on 


## 3D Printing

For 3D printing, we utilized a entire pipeline from Google Earth that takes in a Google Earth snapshot of a cityscape and bring it into Blender. We utilize a Google Earth API through Google Cloud to access the map for Blosm. We utilized the Blosm (https://github.com/vvoovv/blosm) extension to extract various cityscapes of UT Austin.

![image](https://github.com/user-attachments/assets/a66cb80d-3f17-4115-a2bc-ce3cec8de09f)

We then convert the mesh from Blosm and simplify the mesh significantly. 

![image2](https://github.com/user-attachments/assets/78a278e7-efa1-4b03-a0a4-eaeb9b673326)


With the simplified mesh, we are able to scale it down and convert it to an STL file. We take that STL file into bambu slicer and make holes in the buildings using the add negative part feature, then we print the part.



## Location Binning

Using Google Earth, we are able to draw out polygons around major areas of interest 

<img width="596" alt="image" src="https://github.com/user-attachments/assets/b79c3b4b-d3bc-408e-be6c-67d49236c253">

We then can make multiple of them and have them exported as a KML file

<img width="401" alt="image" src="https://github.com/user-attachments/assets/592f384e-c317-44f1-a5a8-5b386ef5a5f8">

Afterwards, we export the KML file to parse out the LED name for the ordering with a Python script and that information is sent to the backend

## LED Setup

We obtain the ordering of the LEDs from the Location Binning and feed it into the LED drivers which map the output of each place on a map to the order of the LED. From there we use a LED node to update the values of the LED on the MQTT server. We mapped the LED setup with drivers to be indexed with our daisy chained indices. 


