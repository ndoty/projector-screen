var socket = io.connect('http://localhost');

socket.on('feedback', function (data) {
    document.getElementById('feedback').innerHTML = data;
});