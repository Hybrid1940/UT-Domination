from fastkml import kml
import numpy as np
from matplotlib.path import Path


main = __name__ == "__main__"
# Load the KML file
kml_file_path = "Landmarks.kml"
with open(kml_file_path, "rb") as file:
    doc = file.read()

# Initialize KML parser and parse the document
k = kml.KML.class_from_string(doc)

ans = {} 
# Extract polygons without shapely
polygons = []
i = 0
for feature in k.features:
    for placemark in feature.features:
        if hasattr(placemark.geometry, 'exterior'):
            # Extract raw coordinates from the exterior (polygon boundary)
            name = placemark.name
            coords = [j[0:2] for j in list(placemark.geometry.exterior.coords)]
            polygons.append(coords)
            if main: print(f"Polygon {i} {name} coordinates:")
            for coord in coords:
                #print(coord)
                pass
            centroid = np.mean(coords, axis=0)
            if main: print(centroid)
            ans[str(i)] = (str(i), name.split(':')[0], centroid, Path(coords))
            if -1 in ans: del ans[-1]

            i+=1
