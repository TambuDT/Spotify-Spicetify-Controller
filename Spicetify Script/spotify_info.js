// Dichiarazione della variabile ws che conterrà l'oggetto WebSocket
let ws;
let port = 8765;

// Funzione per ottenere il testo di un elemento tramite XPath
function getElementTextByXPath(xpath) {
    const result = document.evaluate(
        xpath,
        document,
        null,
        XPathResult.FIRST_ORDERED_NODE_TYPE,
        null
    );
    return result.singleNodeValue ? result.singleNodeValue.textContent.trim() : null;
}

function isPlayingSimple() {
    // Invia il messaggio "isplaying" al server
    const message = {
        type: 'PLAYER_STATE',
        data: {
            state: Spicetify.Player.isPlaying() ? "true" : "false"
        }
    };

    ws.send(JSON.stringify(message));
    console.log(`Messaggio inviato da spicetify: ${JSON.stringify(message.data.state)}`);
}

// Funzione per inviare un messaggio al server per verificare se la canzone è in riproduzione
function isPlaying() {
    // Invia il messaggio "isplaying" al server
    const message = {
        type: 'PLAYER_STATE',
        data: {
            state: Spicetify.Player.isPlaying() ? "true" : "false"
        }
    };

    ws.send(JSON.stringify(message));
    console.log(`Messaggio inviato da spicetify: ${JSON.stringify(message.data.state)}`);
    sendTrackInfo();
}

// Aggiungi un listener per rilevare comportamneti del player
Spicetify.Player.addEventListener("songchange", async () => {
    await new Promise(resolve => setTimeout(resolve, 500));
    await sendTrackInfo();
});
Spicetify.Player.addEventListener("onplaypause", async () => {
    await new Promise(resolve => setTimeout(resolve, 500));
    await isPlayingSimple();
});

// Funzione per inviare il progresso della traccia ogni secondo solo se la traccia è in riproduzione
function sendProgressEverySecond() {
    setInterval(async () => {
        if (Spicetify.Player.isPlaying()) {
            var percentage = await Spicetify.Player.getProgressPercent();
            percentage = Math.floor(percentage * 100); // Moltiplica la percentuale per 100 e rimuovi le cifre decimali
            var progress = await Spicetify.Player.getProgress();
            var totalSeconds = Math.floor(progress / 1000);
            var hours = Math.floor(totalSeconds / 3600);
            var minutes = Math.floor((totalSeconds % 3600) / 60);
            var seconds = totalSeconds % 60;

            // Aggiungi uno zero davanti ai secondi se sono cifre singole
            var formattedSeconds = String(seconds).padStart(2, '0');
            var formattedMinutes = hours > 0 ? String(minutes).padStart(2, '0') : String(minutes);
            var formattedProgress = hours > 0 
                ? `${hours}:${formattedMinutes}:${formattedSeconds}` 
                : `${minutes}:${formattedSeconds}`;

            console.log(formattedProgress);
            console.log(percentage);

            const message = {
                type: 'TRACK_PROGRESS',
                data: {
                    progress: formattedProgress,
                    percentage: percentage
                }
            };

            ws.send(JSON.stringify(message));
        }
    }, 1000); // Esegui ogni secondo
}

// Inizia a inviare il progresso della traccia ogni secondo
sendProgressEverySecond();


// Funzione per ottenere le informazioni della traccia corrente e inviarle
async function sendTrackInfo() {
    // Recupera i dati dal DOM
    const trackNameXPath = '/html/body/div[3]/div/div[2]/div[3]/footer/div/div[1]/div/div[2]/div[1]/div/div/div/div/span/a';
    const trackArtistsXPath = '/html/body/div[3]/div/div[2]/div[3]/footer/div/div[1]/div/div[2]/div[3]/div/div/div/div';
    const trackDurationXpath = '/html/body/div[3]/div/div[2]/div[3]/footer/div/div[2]/div/div[2]/div[3]'
    const trackName = getElementTextByXPath(trackNameXPath);
    const trackArtists = getElementTextByXPath(trackArtistsXPath);
    const trackDuration = getElementTextByXPath(trackDurationXpath);

    if (trackName && trackArtists) {

        const message = {
            type: 'TRACK_INFO',
            data: {
                trackName: trackName,
                trackArtists: trackArtists,
                trackDuration: trackDuration
            }
        };
        // Invia l'oggetto come stringa JSON
        ws.send(JSON.stringify(message));
        console.log(`Messaggio inviato da spicetify: ${JSON.stringify(message.data)}`);
    } else {
        console.error('Could not find track information.');
    }
}


async function executeCommand(message) {
    const command = message;
    const response = {
        type: 'COMMAND_RESPONSE', // Etichetta per indicare che è una risposta
        data: {
            command: command,
        }
    };

    try {
        // Gestione del comando ricevuto
        switch (command) {
            case "play":
                await Spicetify.Player.play();
                await new Promise(resolve => setTimeout(resolve, 500)); // Aggiungi un ritardo di 500ms
                await isPlayingSimple();
                response.data.message = "Playback started";
                break;
            case "pause":
                await Spicetify.Player.pause();
                await new Promise(resolve => setTimeout(resolve, 500)); // Aggiungi un ritardo di 500ms
                await isPlayingSimple();
                response.data.message = "Playback paused";
                break;
            case "next":
                await Spicetify.Player.next();
                await new Promise(resolve => setTimeout(resolve, 500)); // Aggiungi un ritardo di 500ms
                await isPlaying();
                response.data.message = "Skipped to next track";
                break;
            case "previous":
                await Spicetify.Player.back();
                await new Promise(resolve => setTimeout(resolve, 500)); // Aggiungi un ritardo di 500ms
                await isPlaying();
                response.data.message = "Went to previous track";
                break;
            case "isplaying":
                await isPlaying();
                response.data.message = "Checked playback status";
                break;
            default:
                response.data.status = 'error';
                response.data.message = "Unknown command";
                console.warn("Comando non riconosciuto:", command);
                break;
        }
    } catch (error) {
        // Gestione degli errori durante l'esecuzione del comando
        response.data.status = 'error';
        response.data.message = `Error executing command: ${error.message}`;
    }

    // Invia il messaggio di risposta al server
    ws.send(JSON.stringify(response));
}




// Funzione per stabilire la connessione WebSocket
function connect() {
    // Creazione di una nuova connessione WebSocket al server specificato
    ws = new WebSocket(`ws://127.0.0.1:${port}`);

    // Evento chiamato quando la connessione WebSocket viene aperta
    ws.onopen = async function () {
        console.log(`Connesso al server sulla porta ${port}`); // Stampa un messaggio di connessione riuscita
        await new Promise(resolve => setTimeout(resolve, 500)); // Aggiungi un ritardo di 500ms
        await isPlaying();
    };

    // Evento chiamato quando un messaggio viene ricevuto dal server WebSocket
    ws.onmessage = function (event) {
        console.log(`Messaggio ricevuto dal server: ${event.data}`);

        let message;

        try {
            // Parsing del messaggio ricevuto
            message = JSON.parse(event.data);
        } catch (error) {
            console.error('Errore nel parsing del messaggio:', error);
            return;
        }

        // Switch per i diversi tipi di messaggio
        switch (message.type) {
            case 'COMMAND':
                executeCommand(message.data.command);
                break;

            case 'TRACK_INFO':
                sendTrackInfo();
            default:
                console.log("Tipo di messaggio non riconosciuto");
                break;
        }
    };

    // Evento chiamato quando la connessione WebSocket viene chiusa
    ws.onclose = function () {
        console.log('Il server è chiuso'); // Stampa un messaggio di disconnessione
        setTimeout(connect, 1000); // Tenta di riconnettersi ogni secondo

    };
}

// Chiama la funzione connect per stabilire la connessione WebSocket
connect();