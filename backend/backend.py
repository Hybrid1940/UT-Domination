from parsekml import ans as all_coords
import paho.mqtt.client as mqtt
from paho.mqtt.client import Client as MqttClient
import json
from time import sleep,time
from threading import Lock
import traceback

user_data_lock = Lock()
user_data = {"users": {}, "bldg": {}}

try:
    user_data = json.load(open("userdata.json", "r"))
    print("just loaded", user_data)
    print("file found, reading")
except:
    print("file not found, proceeding as is with empty data")

DEBUG = False


teams = [
    ['mahesh', 'karmanyaah', 'pohan', 'shreya'], # blue
    ['sarthak', 'hasif', 'chetan'] # red
]

def compute_team_score(client : MqttClient):
    bldg = {}
    total = {"Red": 0, "Blue" : 0}
    for id, _ in enumerate(all_coords):
        userscores = user_data["bldg"].get(str(id), None)
        #print("userscores for this building", id, userscores)
        #print(id, userscores, user_data["bldg"])
        if userscores is None:
            color = [0,255,0]
            #print("color")
            client.publish(f"dom/bldg/{id}/color", json.dumps(color), retain=True)
            continue
        bldg[id] = {"Red": 0,"Blue": 0}
        for username, score in userscores.items():
            teamnum = "Red" if username in teams[0] else "Blue" if username in teams[1] else 99
            if teamnum == 99:
                print('unknown team user', username)
            bldg[id][teamnum] += score
        color = [0,0,0]
        if bldg[id]["Red"] > bldg[id]["Blue"]:
            color = [255,0,0]
            total["Red"]+=1
        elif bldg[id]["Red"] < bldg[id]["Blue"]:
            color = [0,0,255]
            total["Blue"]+=1
        else:
            color = [0,255,0]
            total["Red"] += .5
            total["Blue"] += .5
        client.publish(f"dom/bldg/{id}/color", json.dumps(color), retain=True)
        client.publish(f"dom/bldg/{id}/teams", json.dumps(bldg[id]), retain=True)
    client.publish(f"dom/bldg/teams", json.dumps(total), retain=True)
    #print("capture_team_score", bldg, total)

    pass
def bin_bldg(in_coord, username_for_debugging):
    lat = in_coord["lat"]
    lng = in_coord["lng"]

    for i, c in all_coords.items():
        poly_matplotlib_path = c[3]
        contains = poly_matplotlib_path.contains_point((lng,lat))
        #if DEBUG:
        #    print(contains)
        if contains:
            if False and DEBUG: print(f"found {username_for_debugging} in" ,c[0:2])
            return i
    print(username_for_debugging, "NOT FOUND IN BLDG", in_coord)


def publish_bldg_data(client: MqttClient, bldg_id):
    global user_data
    username_time_mapping = user_data["bldg"].get(str(bldg_id), {})
    if username_time_mapping: print(username_time_mapping)
    client.publish(f"dom/bldg/{bldg_id}/users", json.dumps(username_time_mapping), retain=True)
    



def parse_user_data(client, username):
    global user_data
    coord = []
    udata = user_data["users"][username]
    coord.append(udata[0]) #new
    coord.append(udata[1]) #old
    new_bldg = bin_bldg(coord[0], username)
    old_bldg = bin_bldg(coord[1], username)
    if (new_bldg == old_bldg):
        if DEBUG:
            print(all_coords[new_bldg][1], "matched user", username, "time", coord[0]["tst"] - coord[1]["tst"])
        bldg_id = str(all_coords[new_bldg][0])
        if bldg_id not in user_data["bldg"]:
            print('did not find bldg', bldg_id)
            user_data["bldg"][bldg_id] = {}
        if username not in user_data["bldg"][bldg_id]:
            print('did not find user in building', bldg_id, username, user_data)
        a = user_data["bldg"][bldg_id].get(username, 0)
        user_data["bldg"][bldg_id][username] = a + coord[0]["tst"] - coord[1]["tst"]
        publish_bldg_data(client, bldg_id)
        



def on_message(client, userdata, message):
    global user_data
    try:
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
                compute_team_score(client)
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
        with user_data_lock:
            publish_bldg_data(mqttc, str(num))
            compute_team_score(mqttc)
    print('sent initial data, starting loop')
    while True:
        #print(user_data)
        with user_data_lock:
            #print('saved')
            json.dump(user_data, open("userdata.json", "w"))
        sleep(1) # run loop at 1hz
    mqttc.loop_stop()
