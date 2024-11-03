sudo apt install python3 python3-pip vim mosquitto mosquitto-clients git
pip install --force-reinstall adafruit-blinka
sudo pip3 install rpi_ws281x adafruit-circuitpython-neopixel
sudo systemctl enable --now mosquitto



no set up cloudflared from the web
#sudo mkdir -p --mode=0755 /usr/share/keyrings
#curl -fsSL https://pkg.cloudflare.com/cloudflare-main.gpg | sudo tee /usr/share/keyrings/cloudflare-main.gpg >/dev/null
#echo "deb [signed-by=/usr/share/keyrings/cloudflare-main.gpg] https://pkg.cloudflare.com/cloudflared $(lsb_release -cs) main" | sudo tee /etc/apt/sources.list.d/cloudflared.list
#sudo apt-get update && sudo apt-get install cloudflared
