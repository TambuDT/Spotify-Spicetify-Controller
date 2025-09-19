// Dichiarazione della variabile ws che conterrà l'oggetto WebSocket
let ws;
let port = 8765;



const Ready = async () => {
    const message = {
        type: 'SPOTIFYREADY',
        data: {
            state: true,
        }
    };
    ws.send(JSON.stringify(message));
    console.log('Messaggio di ready inviato');
}

const startMesagging = async () => {
    const message = {
        type: 'STARTMESSAGGING',
        data: {
            state: true,
        }
    };
    ws.send(JSON.stringify(message));
}

//funzione epr ottenere tutte le playlist dell'utente
async function waitForSpicetify() {
    return new Promise(resolve => {
        if (Spicetify?.CosmosAsync) {
            resolve();
        } else {
            const interval = setInterval(() => {
                if (Spicetify?.CosmosAsync) {
                    clearInterval(interval);
                    resolve();
                }
            }, 100);
        }
    });
}


async function getPreferredSongs() {
    await waitForSpicetify();

    const songList = await Spicetify.CosmosAsync.get("https://api.spotify.com/v1/me/tracks");
    console.log("Brani che ti piacciono:", songList);

    const playlist = await Spicetify.CosmosAsync.get("https://api.spotify.com/v1/me/playlists?limit=50");

    // Creiamo l'array semplificato
    const piPlaylist = playlist.items.map(item => ({
        image: item.images?.[0]?.url || '',      // prima immagine o vuota
        name: item.name || 'Unnamed',            // nome playlist
        link: item.external_urls?.spotify || '', // link Spotify
    }));

    const messagep = {
        type: 'PLAYLISTS_INFO',
        data: {
            playlists: piPlaylist
        }
    };
    // Invia l'oggetto come stringa JSON
    ws.send(JSON.stringify(messagep));

    const artists = await Spicetify.CosmosAsync.get("https://api.spotify.com/v1/me/following?type=artist&limit=50");

    // Creo array semplificato artisti
    const piArtista = artists.artists.items.map(item => ({
        image: item.images?.[0]?.url || '',      // prima immagine o vuota
        name: item.name || 'Unnamed',            // nome artista
        link: item.external_urls?.spotify || '', // link Spotify    
    }))

    const messagea = {
        type: 'ARTISTS_INFO',
        data: {
            artists: piArtista
        }
    };
    // Invia l'oggetto come stringa JSON
    ws.send(JSON.stringify(messagea));

    console.log("Lista delle playlist:", piPlaylist);
    console.log("Artisti che segui:", piArtista);

}



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

function getImageUrlByXPath(xpath) {
    const result = document.evaluate(
        xpath,
        document,
        null,
        XPathResult.FIRST_ORDERED_NODE_TYPE,
        null
    );
    return result.singleNodeValue ? result.singleNodeValue.src : null;
}

// Funzione per ottenere le informazioni della traccia corrente e inviarle
async function sendTrackInfo() {
    // Recupera i dati dal DOM
    const trackNameXPath = '//*[@id="main"]/div/div[2]/div[4]/aside/div/div[1]/div/div[2]/div[1]/div/span/span/div/span/a';
    const trackArtistsXPath = '//*[@id="main"]/div/div[2]/div[4]/aside/div/div[1]/div/div[2]/div[3]/div/span/span/div';
    const trackDurationXpath = '//*[@id="main"]/div/div[2]/div[4]/aside/div/div[2]/div/div[2]/div[3]'
    const trackImageXPath = '//*[@id="main"]/div/div[2]/div[4]/aside/div/div[1]/div/div[1]/div/button/div/div/img';


    const trackName = getElementTextByXPath(trackNameXPath);
    const trackArtists = getElementTextByXPath(trackArtistsXPath);
    const trackDuration = getElementTextByXPath(trackDurationXpath);
    const trackImgUrl = getImageUrlByXPath(trackImageXPath);
    const trackHeart = Spicetify.Player.getHeart()


    console.log(trackName)
    console.log(trackArtists)
    if (trackName && trackArtists) {

        const message = {
            type: 'TRACK_INFO',
            data: {
                trackName: trackName,
                trackArtists: trackArtists,
                trackDuration: trackDuration,
                trackImage: trackImgUrl,
                trackHeart: trackHeart
            }
        };
        // Invia l'oggetto come stringa JSON
        ws.send(JSON.stringify(message));
        console.log(`Messaggio inviato da spicetify: ${JSON.stringify(message.data)}`);
    } else {
        console.error('Could not find track information.');
    }
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
            state: Spicetify.Player.isPlaying() ? "true" : "false",
            repeat: Spicetify.Player.getRepeat(),
            shuffle: Spicetify.Player.getShuffle(),
            mute: Spicetify.Player.getMute(),
        }
    };

    ws.send(JSON.stringify(message));
    console.log(`Messaggio inviato da spicetify: ${JSON.stringify(message.data.state)}`);
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
async function sendProgress() {
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
}



async function executeCommand(message) {
    const command = message;
    const response = {
        type: 'COMMAND_RESPONSE', // Etichetta per indicare che è una risposta
        data: {
            command: command,
        }
    };

    async function extrackColors() {
        const currentTrack = Spicetify.Player.data.item;
        const colors = await Spicetify.colorExtractor(currentTrack.uri);
        const message = {
            type: 'COLORS_REQUEST', // Etichetta per indicare che è una risposta
            data: {
                colors: colors,
            }
        };
        // Invia l'oggetto come stringa JSON
        ws.send(JSON.stringify(message));
        console.log(`Messaggio inviato da spicetify: ${JSON.stringify(message.data)}`);
    }

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
            case "trackprogress":
                sendProgress();
                response.data.message = "Sending progress every second";
                break;
            case "mute":
                await Spicetify.Player.setMute(true);
                response.data.message = "Muted audio";
                break;
            case "unmute":
                await Spicetify.Player.setMute(false);
                response.data.message = "Unmuted audio";
                break;
            case "volumeup":
                await Spicetify.Player.increaseVolume();
                response.data.message = "Increased volume";
                break;
            case "volumedown":
                await Spicetify.Player.decreaseVolume();
                response.data.message = "Decreased volume";
                break;
            case "shuffle":
                await Spicetify.Player.toggleShuffle();
                response.data.message = "Change shuffle method";
                break;
            case "repeat":
                await Spicetify.Player.toggleRepeat();
                response.data.message = "Change repat method";
                break;
            case "colors":
                await extrackColors();
                response.data.message = "Color request";
                break;
            case "heart":
                await Spicetify.Player.toggleHeart();
                response.data.message = "Heart toggled";
                break;
            case "getplaylists":
                await getPreferredSongs();
                response.data.message = "Getting playlists";
                break;
            case "trackinfo":
                await sendTrackInfo();
                response.data.message = "Sent track info";
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
        await Ready();
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
                break;
            case 'BOTHREADY':
                if (message.data.state==true){
                    startMesagging();
                }
                break;
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
