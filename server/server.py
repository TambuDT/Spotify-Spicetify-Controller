import asyncio
import websockets

# Lista per memorizzare le connessioni WebSocket
clients = []

# Funzione per gestire la connessione con Spicetify
async def spicetify_handler(websocket):
    clients.append(websocket)
    try:
        while True:
            message = await websocket.recv()
            print(f"Spicetify received: {message}")
    except websockets.ConnectionClosed:
        print("Spicetify disconnected")
    finally:
        clients.remove(websocket)

# Funzione per gestire la connessione con la pagina HTML
async def html_handler(websocket):
    clients.append(websocket)
    try:
        while True:
            message = await websocket.recv()
            print(f"HTML received: {message}")
            # Invia il messaggio a tutti i client (Spicetify)
            for client in clients:
                if client != websocket:
                    await client.send(message)
    except websockets.ConnectionClosed:
        print("HTML client disconnected")
    finally:
        clients.remove(websocket)

# Funzione principale per avviare il server WebSocket
async def main():
    # Avvia il server WebSocket per la pagina HTML sulla porta 8765
    spicetify_server = websockets.serve(html_handler, "127.0.0.1", 8765)
    html_server = websockets.serve(html_handler, "192.168.1.59", 8766)
    # il server e attendi indefinitamente
    await asyncio.gather(html_server, spicetify_server)
    await asyncio.Future()  # run forever

# Esegue la funzione main utilizzando il loop di eventi di asyncio
asyncio.run(main())