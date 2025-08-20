#!/bin/bash

# VoltDB Initialization Script
# Ovaj script će kreirati schema i učitati početne podatke u VoltDB

echo "🚀 Starting VoltDB initialization..."

# Provjera je li VoltDB kontejner pokrenut
if ! docker ps | grep -q voltdb-server; then
    echo "❌ VoltDB kontejner nije pokrenut!"
    echo "Pokretanje VoltDB kontejnera..."
    
    docker run -d \
      --name voltdb-server \
      --network voltdb-network \
      -p 21212:21212 \
      -p 8080:8080 \
      -p 3021:3021 \
      -e HOST_COUNT=1 \
      -e HOSTS=localhost \
      ilkinulas/voltdb:latest
    
    echo "⏳ Čekanje da se VoltDB pokrene (30 sekundi)..."
    sleep 30
fi

echo "📊 Checking VoltDB status..."

# Provjera VoltDB konekcije
if ! curl -s http://localhost:8080 > /dev/null; then
    echo "❌ VoltDB web konzola nije dostupna na portu 8080"
    echo "Provjera kontejnera..."
    docker logs voltdb-server
    exit 1
fi

echo "✅ VoltDB je pokrenut i dostupan"

# Kopiraj SQL datoteke u kontejner
echo "📂 Copying SQL files to VoltDB container..."

docker cp docker-config/schema.sql voltdb-server:/tmp/schema.sql
docker cp docker-config/insert-data.sql voltdb-server:/tmp/insert-data.sql

# Izvršavanje SQL schema-e
echo "🗃️ Creating database schema..."

docker exec -i voltdb-server sqlcmd < docker-config/schema.sql

if [ $? -eq 0 ]; then
    echo "✅ Schema successfully created"
else
    echo "❌ Schema creation failed"
    exit 1
fi

# Ubacivanje početnih podataka
echo "📊 Inserting initial data..."

docker exec -i voltdb-server sqlcmd < docker-config/insert-data.sql

if [ $? -eq 0 ]; then
    echo "✅ Data successfully inserted"
else
    echo "❌ Data insertion failed"
    exit 1
fi

echo "✅ VoltDB initialization completed successfully!"
echo ""
echo "🌐 VoltDB Web Console: http://localhost:8080"
echo "🔌 VoltDB Client Port: 21212"
echo "⚙️ Admin Port: 3021"
echo ""
echo "📝 Next steps:"
echo "1. Start the backend server: cd backend && npm start"
echo "2. Open frontend: cd frontend && open index.html in browser"
echo "3. Or serve frontend with: python -m http.server 8081"
