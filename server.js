var express = require('express'),
    app = express(),
    gpio = require('pi-gpio'),
    pins = {
        stepPin: {
            pinNumber: 40,
            option: "output"
        },
        dirPin: {
            pinNumber: 39,
            option: "output"
        },
        raiseEndStop: {
            pinNumber: 37,
            option: "input"
        },
        lowerEndStop:{
            pinNumber: 35,
            option: "input"
        }
    },
    maxSteps = 10000,
    currentStep = 0,
    stopMotor = false,
    status;

app.set('view engine', 'jade');

app.set('title', "Pi Projector Screen Toggle")

// Open all pins for use
for (var pin in pins) {
    console.log(pins[pin].pinNumber);
    // gpio.open(pin.pinNumber, pin.option, function (err) {
    //     if (err) console.log("GPIO OPEN ERROR: " + err);

    //     console.log("Opened pin " + pin.pinNumber + " as an " + pin.option);
    // });
}

app.use(express.static('public'));

app.get('/', function (req, res) {
    res.render('index', {screenStatus: status});
});

app.get('/raise', function (req, res) {
    status = "raising";

    res.redirect('/', {screenStatus: status});

    raise();

    res.redirect('/', {screenStatus: status});
});

app.get('/lower', function (req, res) {
    status = "lowering";

    res.redirect('/', {screenStatus: status});

    lower();

    res.redirect('/', {screenStatus: status});
});

app.get('/stopMotor', function (req, res) {
    stopMotor();
    res.redirect('/', {screenStatus: status});
});

// Runs motor in the set direction
function move() {
    console.log("Projection Screen is currently " + status);

    if (currentStep >= maxSteps) {
        stopMotor();
    }

    getEndStops();

    gpio.write(pins.stepPin.pinNumber, 1, function () {
        sleep(10);

        gpio.write(pins.stepPin.pinNumber, 0, function () {
            sleep(10);

            currentStep++;

            if (!stopMotor) move();
        });
    });
}

// Stopping motor
function stopMotor () {
    if (currentStep < maxSteps) {
        console.log("Screen is currently stopped in a unkown state while " + status + ". You will have to rely on the mechanical End Stops to raise or lower the screen now.");

        status = " stopped in a unkown state while " + status + ". You will have to rely on the mechanical End Stops to raise or lower the screen now.";
    } else {
        currentStep = 0;

        if (status === "lowering") {
            status = lowered;
        } else if (status === "raising") {
            status = raised;
        }
    }

    stopMotor = true;
}

// Changing direction of motor
function raise () {
    stopMotor = false;

    gpio.write(pins.dirPin.pinNumber, 1, function () {
        move();
    });
}

// Changing direction of motor
function lower () {
    stopMotor = false;

    gpio.write(pins.dirPin.pinNumber, 0, function() {
        move();
    });
}

// Go to sleep
function sleep(milliseconds) {
    var start = new Date().getTime();

    for (var i = 0; i < 1e7; i++) {
        if ((new Date().getTime() - start) > milliseconds) {
            break;
        }
    }
}

// Get endstop values to make sure we can still move
function getEndStops () {
    gpio.read(pins.raiseEndStop.pinNumber, function(err, value) {
        if(err) console.log("GPIO READ ERROR: " + err);

        if (value === 0) {
            console.log("Raise Endstop triggered, stopping motor");
        }
    });

    gpio.read(pins.lowerEndStop.pinNumber, function(err, value) {
        if(err) console.log("GPIO READ ERROR: " + err);

        if (value === 0) {
            console.log("Lower Endstop triggered, stopping motor");
        }
    });
}

var server = app.listen(3000, function () {
    var host = server.address().address,
        port = server.address().port;

    console.log('Listening at http://%s:%s', host, port);
});

process.on('SIGINT', function () {
    console.log("Caught interrupt signal");

    for (var pin in pins) {
        // gpio.close(pin.pinNumber, function (err) {
        //     if(err) console.log("GPIO CLOSE ERROR: " + err);

        //     console.log("Closed pin " + pin.pinNumber);
        // });
    }

    console.log("All pins now closed, safe to exit.");

    process.exit();
});