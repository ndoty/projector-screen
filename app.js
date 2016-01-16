var express = require('express'),
    app = express(),
    server = require('http').Server(app),
    io = require('socket.io')(server),
    fs = require('fs'),
    gpio = require('pi-gpio'),
    pins = {
        stepPin: {
            pinNumber: 36,
            option: "output"
        },
        dirPin: {
            pinNumber: 38,
            option: "output"
        },
        enPin: {
            pinNumber: 40,
            option: "output"
        },
        raiseEndStop: {
            pinNumber: 35,
            option: "input pulldown"
        },
        lowerEndStop:{
            pinNumber: 37,
            option: "input pulldown"
        }
    },
    step = 0,
    // stepDelay = 0,
    status = '',
    stopMotor = false,
    webUIConnected = false,
    stream;

app.set('view engine', 'jade');

app.set('title', "Pi Projector Screen Toggle");

server.listen(3000);

io.on('connection', function (socket) {
    console.log("Web UI Connected");

    webUIConnected = true;

    stream = socket;

    checkLimits();

    socket.on('disconnect', function (data) {
        webUIConnected = false;

        console.log("Web UI Disconnected")
    });
});

openPins();

app.use(express.static('public'));

app.use(express.static(__dirname + '/bower_components'));

app.get('/', function (req, res) {
    res.render('index');
});

app.get('/raise', function (req, res) {
    resetTriggers();

    status = "raising";

    logMessage("Screen is currently " + status);

    raise();

    res.redirect(301, '/');
});

app.get('/lower', function (req, res) {
    resetTriggers();

    status = "lowering";

    logMessage("Screen is currently " + status);

    lower();

    res.redirect(301, '/');
});

app.get('/stopMotor', function (req, res) {
    stopMotor = true;

    logMessage("Screen was stopped manually\nIt may be in a odd state\nRaise or lower accordingly");

    res.redirect(301, '/');
});

function resetTriggers () {
    gpio.write(pins.enPin.pinNumber, 0, function () {
        stopMotor = false;
        step = 0;
    });
}

function logMessage (message) {
    console.log(message);

    // if (webUIConnected) {
    //     stream.emit('feedback', message);
    // }
}

function openPins () {
    // Open all pins for use
    for (var pin in pins) {
        console.log("Opening pin " + pins[pin].pinNumber + " as an " + pins[pin].option);

        gpio.open(pins[pin].pinNumber, pins[pin].option, function (err) {
            if (err) console.log("GPIO OPEN ERROR: " + err);
        });
    }

    console.log("All declared pins are now open and available for use");
}

function closePins () {
    for (var pin in pins) {
        console.log("Closing pin " + pins[pin].pinNumber);

        gpio.close(pins[pin].pinNumber, function (err) {
            if(err) console.log("GPIO CLOSE ERROR: " + err);
        });
    }

    console.log("All declared pins are now closed");
}

// Runs motor in the set direction
function move () {
    gpio.write(pins.stepPin.pinNumber, 1, function () {
        gpio.write(pins.stepPin.pinNumber, 0, function () {
            step++;

            // logMessage("Moved screen " + step + " steps");

            checkLimits();
        });
    });
}

function raise () {
    gpio.write(pins.dirPin.pinNumber, 1, function () {
        gpio.write(pins.enPin.pinNumber, 1, function () {
            checkLimits();
        })
    });
}

function lower () {
    gpio.write(pins.dirPin.pinNumber, 0, function() {
        gpio.write(pins.enPin.pinNumber, 1, function () {
            checkLimits();
        })
    });
}

// // Go to sleep
// function sleep (milliseconds) {
//     var start = new Date().getTime();

//     for (var i = 0; i < 1e7; i++) {
//         if ((new Date().getTime() - start) > milliseconds) {
//             break;
//         }
//     }
// }

// Make sure we can still move
function checkLimits (start) {
    if (status === "raising" && !stopMotor) {
        gpio.read(pins.raiseEndStop.pinNumber, function(err, value) {
            if(err) console.log("GPIO READ ERROR: " + err);

            if (value === 0) {
                move();
            } else {
                logMessage("Raise Endstop triggered\nScreen is raised");
            }
        });
    }

    if (status === "lowering" && !stopMotor) {
        gpio.read(pins.lowerEndStop.pinNumber, function(err, value) {
            if(err) console.log("GPIO READ ERROR: " + err);

            if (value === 0) {
                move();
            } else {
                logMessage("Lower Endstop triggered\nScreen is lowered");
            }
        });
    }
}

process.on('SIGINT', function () {
    if (webUIConnected) {
        stream.emit('feedback', "SERVER DOWN");
    }

    console.log("\nCaught interrupt signal");

    closePins();

    console.log("Safe to exit.");

    process.exit();
});

module.exports = app;