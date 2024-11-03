from parsekml import ans as all_coords
import paho.mqtt.client as mqtt
from paho.mqtt.client import Client as MqttClient
import json
from time import sleep,time
from threading import Lock
import traceback


team_data_lock = Lock()
team_data = {}

def on_message(client, userdata, message):
    try:
        global user_data
        # userdata is the structure we choose to provide, here it's a list()
        if (message.topic.startswith("owntracks/")):
            username = message.topic.split("/")[2]
            mes = message.payload

            if not mes: 
                print("empty payload")
                return
            mes = json.loads(message.payload.decode())

            if mes['_type'] != "location":
                return

            lat = mes["lat"]
            lng = mes["lon"]
            tst = mes["tst"]

            thing = {"lat": lat, "lng": lng, "tst": tst}
            with user_data_lock:
                if username in user_data["users"]:
                    user_data["users"][username] = (thing, user_data["users"][username][0])
                else:
                    user_data["users"][username] = (thing,thing)
            parse_user_data(client, username)
    except Exception as e:
        print(traceback.format_exc())


def on_connect(client, userdata, flags, reason_code, properties):
    if reason_code.is_failure:
        print(f"Failed to connect: {reason_code}. loop_forever() will retry connection")
    else:
        print(f"Successfully connected")
        # we should always subscribe from on_connect callback to be sure
        # our subscribed is persisted across reconnections.
        client.subscribe("$SYS/#")
        client.subscribe("owntracks/+/+")



if __name__ == "__main__":
    mqttc = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2)
    mqttc.on_connect = on_connect
    mqttc.on_message = on_message
    print("connecting")
    #print(mqttc.connect("localhost"))
    print(mqttc.connect("raspberrypi.local"))
    
    mqttc.loop_start()
    for num, i in all_coords.items():
        num, name, centroid, coords = i
        mqttc.publish(f"dom/bldg/{num}/name", name, retain=True)
        mqttc.publish(f"dom/bldg/{num}/coord", f"[{centroid[1]},{centroid[0]}]", retain=True)
    print('sent initial data, starting loop')
    while True:
        with team_data_lock:
            json.dump(team_data, open("teamdata.json", "w"))
        sleep(1) # run loop at 1hz
    mqttc.loop_stop()