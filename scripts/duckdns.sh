#!/bin/bash

# Configuração DuckDNS
DOMAIN="geotask"
TOKEN="1e08b406-68fc-4c05-b98f-d3f80ad90b78"

# Atualiza IP
echo "Updating DuckDNS IP for $DOMAIN.duckdns.org..."
RESPONSE=$(curl -s "https://www.duckdns.org/update?domains=$DOMAIN&token=$TOKEN&ip=")

if [ "$RESPONSE" == "OK" ]; then
    echo "DuckDNS update successful."
else
    echo "DuckDNS update failed. Response: $RESPONSE"
    exit 1
fi
