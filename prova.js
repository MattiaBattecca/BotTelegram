const TelegramBot = require("node-telegram-bot-api");
const fs = require("fs");


const token = "5198221011:AAEjyVW7ftGxryc_Jpoe29RkQANN9cOfNow";
const bot = new TelegramBot(token, { polling: true });

var varTaglio = "";
var varNome = "";
var varData = "";
var varOra = "";

var prenotazioneInCorso = false;
var prenotazioneCompleta = false;


let IdMaxPrenotazione = 0;
let IdMaxBarbiere = 0;
let IdMaxServizio = 0;

//creo array per ogni tabella
let Prenotazioni;
let Barbieri;
let Servizi;

setDatabase();


bot.onText(/\/start/, (msg) => {
    var id = msg.chat.id;

    if (prenotazioneInCorso) {
        bot.sendMessage(id, 'Prenotazione annullata.');
        prenotazioneInCorso = false;
        prenotazioneCompleta = false;
    }

    bot.sendMessage(
        id,
        "👋🏻Ciao!👋🏻\nIl bot del nostro negozio ti aiuterà nelle semplici operazioni che puoi fare con noi😎\n\nInizia subito!!!",
        {
            "reply_markup": {
                "keyboard":
                    [
                        ["✂️ Prenota un taglio ✂️", "💈 Sfoglia servizi 💈"],
                        ["🗺️ Dove trovarci 🗺️"],
                        ["👦🏻 I nostri barbieri 👦🏻"]
                    ],
            },
        }
    );
});

bot.on("message", (msg) => {
    var id = msg.chat.id;
    var text = msg.text.toString();

    if (text == "✂️ Prenota un taglio ✂️") {
        prenotazioneInCorso = true;

        if (varTaglio == "" && varNome == "" && varData == "" && varOra == "") {
            bot.sendMessage(id, 'Scrivi /start per annullare').then(() => {
                displayServizi(id).then(() => {
                    let arrServ = [];
                    Servizi.forEach(s => {
                        arrServ.push([s.nome])
                    });
                    arrServ.push(["Annulla"]);
                    bot.sendMessage(id, "Seleziona taglio",
                        {
                            "reply_markup":
                            {
                                "keyboard": arrServ,
                                resize_keyboard: true,
                                one_time_keyboard: true
                            }
                        });
                });
            });
        }
    }


    else if (msg.text.toString() == "🗺️ Dove trovarci 🗺️") {
        bot.sendLocation(id, 44.923576, 9.911583);
        bot.sendMessage(id, "<b>Barba Scura</b>, Via L. Braibanti 20, Fiorenzuola (PC)", { parse_mode: "HTML" });
    }
    else if (msg.text.toString() == "👦🏻 I nostri barbieri 👦🏻") {
        var barbieri = readJsonFile("database/barbieri.json");
        barbieri.forEach((barbiere) => {
            bot.sendPhoto(id, barbiere.foto).then(() => {
                bot.sendMessage(id, "<b>" + barbiere.nome + " " + barbiere.cognome + "</b>\n\n<b>Anni:</b> " + barbiere.eta + "<b>\nSpecialità:</b> " + barbiere.specialita, { parse_mode: "HTML" });
            });
        });
    }

    else if (msg.text.toString() == "💈 Sfoglia servizi 💈") {
        displayServizi(id);
    }


    else if (prenotazioneInCorso && varTaglio == "" && varNome == "" && varData == "" && varOra == "" && !prenotazioneCompleta) {
        if (text == "Taglio classico" || text == "Scolpitura barba" || text == "Rasatura barba" || text == "Shampoo" || text == "Taglio classico + Shampoo") {
            varTaglio = text;
            bot.sendMessage(id, "Scrivi il tuo nome e cognome");
        }
    }

    else if (prenotazioneInCorso && varTaglio != "" && varNome == "" && varData == "" && varOra == "" && !prenotazioneCompleta) {
        varNome = text;
        bot.sendMessage(id, "Scrivi la data (GG/MM/AAAA)");
    }

    else if (prenotazioneInCorso && varTaglio != "" && varNome != "" && varData == "" && varOra == "" && !prenotazioneCompleta) {
        if (verificaData(text)) {
            varData = text;
            bot.sendMessage(id, "Scrivi l'ora (HH:MM)");
        }
        else {
            bot.sendMessage(id, "Data non corretta... Reinserisci");
        }
    }

    else if (prenotazioneInCorso && varTaglio != "" && varNome != "" && varData != "" && varOra == "" && !prenotazioneCompleta) {
        if (verificaOra(text)) {
            varOra = text;
            prenotazioneCompleta = true;
            bot.sendMessage(id, "Dati prenotazione inseriti con successo.\nDesideri inviare la prenotazione?",
                {
                    "reply_markup":
                    {
                        "keyboard": [
                            ["Invia"], ["Annulla"]
                        ],
                        resize_keyboard: true,
                        one_time_keyboard: true
                    }
                });
        }
        else {
            bot.sendMessage(id, "Orario non corretto... Reinserisci");
        }
    }

    else if (prenotazioneInCorso && varTaglio != "" && varNome != "" && varData != "" && varOra != "" && prenotazioneCompleta) {
        if (text == "Invia") {
            Prenotazioni.push({
                id: IdMaxPrenotazione + 1,
                nome: varNome,
                giorno: varData,
                ora: varOra,
                taglio: varTaglio
            });
            invioPrenotazione();

            bot.sendMessage(id, "Prenotazione inviata!\n\nTi aspettiamo il " + varData + " alle ore " + varOra,
                {
                    "reply_markup": {
                        "keyboard":
                            [
                                ["✂️ Prenota un taglio ✂️", "💈 Sfoglia servizi 💈"],
                                ["🗺️ Dove trovarci 🗺️"],
                                ["👦🏻 I nostri barbieri 👦🏻"]
                            ],
                    },
                });
        }
    }
});





async function displayServizi(id) {
    var servizi = readJsonFile("database/servizi.json");

    var res = "";
    servizi.forEach((servizio) => {
        res = res + "<b>" + servizio.nome + "</b>\n<b>Prezzo:</b> " + servizio.prezzo + " €\n\n"
    });

    bot.sendMessage(id, res, { parse_mode: "HTML" });
}

function readJsonFile(file) {
    var fs = require("fs");
    let contents = fs.readFileSync(file);
    let objsArray = [];
    objsArray = JSON.parse(contents);
    return objsArray;
}

function verificaData(text) {
    var fields = text.split('/');
    if (fields.length == 3) {
        var g = parseInt(fields[0]);
        var m = parseInt(fields[1]);
        var a = parseInt(fields[2]);
        if (!isNaN(g) && !isNaN(m) && !isNaN(a)) {
            if (g > 0 && g < 32) {
                if (m > 0 && m < 13) {
                    if (a > 2021) {
                        return true;
                    }
                }
            }
        }
    }
    return false;
}

function verificaOra(text) {
    var fields = text.split(':');
    if (fields.length == 2) {
        var o = parseInt(fields[0]);
        var m = parseInt(fields[1]);
        if (!isNaN(o) && !isNaN(m)) {
            if (o >= 9 && o <= 17) {
                if (m >= 0 && m <= 59) {
                    return true;
                }
            }
        }
    }
    return false;
}

function invioPrenotazione() {
    fs.writeFile("./database/prenotazioni.json", JSON.stringify(Prenotazioni), function (err) {
        if (err) {
            return console.log(err);
        } else {
            varTaglio = "";
            varNome = "";
            varData = "";
            varOra = "";
            prenotazioneInCorso = false;
            prenotazioneCompleta = false;
            setDatabase();
        }
    });
}

function setDatabase() {
    Prenotazioni = JSON.parse(fs.readFileSync("./database/prenotazioni.json"));
    Barbieri = JSON.parse(fs.readFileSync("./database/barbieri.json"));
    Servizi = JSON.parse(fs.readFileSync("./database/servizi.json"));

    //setto gli id da cui partire ad incrementare per ciascuna tabella
    Prenotazioni.forEach((p) => {
        if (IdMaxPrenotazione < p.id) {
            IdMaxPrenotazione = p.id;
        }
    });
    Barbieri.forEach((s) => {
        if (IdMaxBarbiere < s.id) {
            IdMaxBarbiere = s.id;
        }
    });
    Servizi.forEach((b) => {
        if (IdMaxServizio < b.id) {
            IdMaxServizio = b.id;
        }
    });

}