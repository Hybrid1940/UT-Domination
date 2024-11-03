import board
import neopixel
import paho.mqtt.client as mqtt
import board
import neopixel
import time
import threading
import json






DEBUG = True
p = neopixel.NeoPixel(board.D18, 120, auto_write=False)

# to only take latest quickly (and be idempotent if unplugged), we'll loop seperately
lock = threading.Lock()

current_state = {}

def on_message(client, userdata, message):
    # userdata is the structure we choose to provide, here it's a list()
    if (message.topic.startswith("dom/bldg")):
        num = int(message.topic.split('/')[2])

        with lock:
            global current_state
            if DEBUG: print(time.time())
            mes = message.payload
            if not mes: return
            mess = json.loads(message.payload.decode())
            if len(mess) != 3:
                print("not a 3 len array")
                return
            current_state[num] = json.loads(message.payload.decode())

            if DEBUG: print(current_state)

            if DEBUG: print(mes)

    # We only want to process 10 messages
   

def on_connect(client, userdata, flags, reason_code, properties):
    if reason_code.is_failure:
        print(f"Failed to connect: {reason_code}. loop_forever() will retry connection")
    else:
        print(f"Successfully connected")
        # we should always subscribe from on_connect callback to be sure
        # our subscribed is persisted across reconnections.
        client.subscribe("$SYS/#")
        client.subscribe("dom/bldg/+/color")


if __name__ == "__main__":
    mqttc = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2)
    mqttc.on_connect = on_connect
    mqttc.on_message = on_message
    print("connecting")
    print(mqttc.connect("localhost"))
    
    mqttc.loop_start()
    while True:
        lasttime = time.time()
        with lock:
            for k,v in current_state.items():
                p[k + 1] = (min(0x20,v[1]), min(0x20,v[0]), min(0x20,v[2]))
            p.show()
        time.sleep((1/30) - (time.time() - lasttime)) # run loop at 30Hz
    mqttc.loop_stop()



for i in range(100):
    pixels[i] = (10, 10, 10)
pixels.show()

