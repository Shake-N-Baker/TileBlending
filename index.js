const { ipcRenderer } = require('electron');
const fs = require('fs');

let zoomedCanvas;
let canvas;
let inputTileWidth;
let inputTileHeight;
let zoomLevel = 1;
let isMouseDown = false;

function canvasInit() {
    zoomedCanvas = document.getElementById("zoomedCanvas");
    canvas = document.getElementById("canvas");
    inputTileWidth = document.getElementById("tileWidth");
    inputTileHeight = document.getElementById("tileHeight");
}

function load() {
    ipcRenderer.send('load-file');
}

ipcRenderer.on('file-loaded', (event, file) => {
    let context = zoomedCanvas.getContext('2d');
    let image = new Image();
    image.onload = () => {
        zoomedCanvas.width = canvas.width = image.width;
        zoomedCanvas.height = canvas.height = image.height;
        context.clearRect(0, 0, zoomedCanvas.width, zoomedCanvas.height);
        context.drawImage(image, 0, 0, zoomedCanvas.width, zoomedCanvas.height);
        
        let imageData = context.getImageData(0, 0, zoomedCanvas.width, zoomedCanvas.height);
        canvas.getContext("2d").putImageData(imageData, 0, 0);
    }
    image.src = file;
    zoomLevel = 1;
});

function save() {
    ipcRenderer.send('save-file');
}

ipcRenderer.on('file-saved', (event, filePath) => {
    let fileData = canvas.toDataURL("image/png");
    // Grab base64 from fileData which looks like: data:image/png;base64,iVBO...CYII=
    let encodedData = fileData.replace(/^data:image\/\w+;base64,/, "");
    let buffer = Buffer.from(encodedData, 'base64');
    fs.writeFile(filePath, buffer, (error) => {
        if (error) {
            console.log(`error: ${error}`);
        }
    });
});

function blendTest() {
    let context = canvas.getContext('2d');
    let imageData = context.getImageData(0, 0, canvas.width, canvas.height);
    let pixelData = imageData.data;
    let verticalPixelData = [];
    let horizontalPixelData = [];
    let totalPixelData = pixelData.length;
    let tileWidth = Number(inputTileWidth.value);
    let tileHeight = Number(inputTileHeight.value);
    let tilesWide = canvas.width / tileWidth;
    let tilesHigh = canvas.height / tileHeight;

    // Clone original pixel data
    for (let i = 0; i < totalPixelData; i += 1) {
        verticalPixelData[i] = pixelData[i];
        horizontalPixelData[i] = pixelData[i];
    }

    let pixelIndex = 0;
    for (let i = 0; i < totalPixelData; i += 4) {
        let pixelX = pixelIndex % canvas.width;
        let pixelY = Math.floor(pixelIndex / canvas.width);
        let red = pixelData[i];
        let green = pixelData[i + 1];
        let blue = pixelData[i + 2];
        let alpha = pixelData[i + 3];
        let verticalBlendRed = horizontalBlendRed = (0.65 * red);
        let verticalBlendGreen = horizontalBlendGreen = (0.65 * green);
        let verticalBlendBlue = horizontalBlendBlue = (0.65 * blue);

        if (pixelX % tileWidth === 0) { // Tile left side
            if (pixelX > 0) { // Not left edge
                let leftRed = pixelData[i - (tileWidth * 4)];
                let leftGreen = pixelData[i + 1 - (tileWidth * 4)];
                let leftBlue = pixelData[i + 2 - (tileWidth * 4)];
                verticalBlendRed += (0.35 * leftRed);
                verticalBlendGreen += (0.35 * leftGreen);
                verticalBlendBlue += (0.35 * leftBlue);
                verticalPixelData[i] = Math.min(Math.max(0, verticalBlendRed), 255);
                verticalPixelData[i + 1] = Math.min(Math.max(0, verticalBlendGreen), 255);
                verticalPixelData[i + 2] = Math.min(Math.max(0, verticalBlendBlue), 255);
            }
        } else if (pixelX % tileWidth === (tileWidth - 1)) { // Tile right side
            if (pixelX < (tileWidth * (tilesWide - 1))) { // Not right edge
                let rightRed = pixelData[i + (tileWidth * 4)];
                let rightGreen = pixelData[i + 1 + (tileWidth * 4)];
                let rightBlue = pixelData[i + 2 + (tileWidth * 4)];
                verticalBlendRed += (0.35 * rightRed);
                verticalBlendGreen += (0.35 * rightGreen);
                verticalBlendBlue += (0.35 * rightBlue);
                verticalPixelData[i] = Math.min(Math.max(0, verticalBlendRed), 255);
                verticalPixelData[i + 1] = Math.min(Math.max(0, verticalBlendGreen), 255);
                verticalPixelData[i + 2] = Math.min(Math.max(0, verticalBlendBlue), 255);
            }
        }

        if (pixelY % tileHeight === 0) { // Tile top side
            if (pixelY > 0) { // Not top edge
                let topRed = pixelData[i - (tileHeight * tilesWide * tileWidth * 4)];
                let topGreen = pixelData[i + 1 - (tileHeight * tilesWide * tileWidth * 4)];
                let topBlue = pixelData[i + 2 - (tileHeight * tilesWide * tileWidth * 4)];
                horizontalBlendRed += (0.35 * topRed);
                horizontalBlendGreen += (0.35 * topGreen);
                horizontalBlendBlue += (0.35 * topBlue);
                horizontalPixelData[i] = Math.min(Math.max(0, horizontalBlendRed), 255);
                horizontalPixelData[i + 1] = Math.min(Math.max(0, horizontalBlendGreen), 255);
                horizontalPixelData[i + 2] = Math.min(Math.max(0, horizontalBlendBlue), 255);
            }
        } else if (pixelY % tileHeight === (tileHeight - 1)) { // Tile bottom side
            if (pixelY < (tileHeight * (tilesHigh - 1))) { // Not bottom edge
                let bottomRed = pixelData[i + (tileHeight * tilesWide * tileWidth * 4)];
                let bottomGreen = pixelData[i + 1 + (tileHeight * tilesWide * tileWidth * 4)];
                let bottomBlue = pixelData[i + 2 + (tileHeight * tilesWide * tileWidth * 4)];
                horizontalBlendRed += (0.35 * bottomRed);
                horizontalBlendGreen += (0.35 * bottomGreen);
                horizontalBlendBlue += (0.35 * bottomBlue);
                horizontalPixelData[i] = Math.min(Math.max(0, horizontalBlendRed), 255);
                horizontalPixelData[i + 1] = Math.min(Math.max(0, horizontalBlendGreen), 255);
                horizontalPixelData[i + 2] = Math.min(Math.max(0, horizontalBlendBlue), 255);
            }
        }

        pixelIndex += 1;
    }

    // Replace existing pixel data with new pixel data
    for (let i = 0; i < totalPixelData; i += 1) {
        if (pixelData[i] !== verticalPixelData[i] && pixelData[i] !== horizontalPixelData[i]) {
            pixelData[i] = Math.round((verticalPixelData[i] + horizontalPixelData[i]) / 2);
        } else if (pixelData[i] !== verticalPixelData[i]) {
            pixelData[i] = Math.round(verticalPixelData[i]);
        } else if (pixelData[i] !== horizontalPixelData[i]) {
            pixelData[i] = Math.round(horizontalPixelData[i]);
        }
    }

    context.putImageData(imageData, 0, 0);

    let zoomedContext = zoomedCanvas.getContext('2d');
    zoomedContext.clearRect(0, 0, zoomedCanvas.width, zoomedCanvas.height);
    zoomedContext.drawImage(canvas, 0, 0);
}

function zoomIn() {
    zoomLevel *= 2;
    zoomedCanvas.width = canvas.width * zoomLevel;
    zoomedCanvas.height = canvas.height * zoomLevel;

    // Don't smooth pixels
    let context = zoomedCanvas.getContext('2d');
    context.imageSmoothingEnabled = false;
    context.mozImageSmoothingEnabled = false;
    context.webkitImageSmoothingEnabled = false;
    context.msImageSmoothingEnabled = false;
    
    context.scale(zoomLevel, zoomLevel);
    context.clearRect(0, 0, zoomedCanvas.width, zoomedCanvas.height);
    context.drawImage(canvas, 0, 0);
}

function zoomOut() {
    zoomLevel /= 2;
    zoomedCanvas.width = canvas.width * zoomLevel;
    zoomedCanvas.height = canvas.height * zoomLevel;

    // Don't smooth pixels
    let context = zoomedCanvas.getContext('2d');
    context.imageSmoothingEnabled = false;
    context.mozImageSmoothingEnabled = false;
    context.webkitImageSmoothingEnabled = false;
    context.msImageSmoothingEnabled = false;
    
    context.scale(zoomLevel, zoomLevel);
    context.clearRect(0, 0, zoomedCanvas.width, zoomedCanvas.height);
    context.drawImage(canvas, 0, 0);
}

function mouseDown(event) {
    const rect = zoomedCanvas.getBoundingClientRect();
    const x = Math.floor((event.clientX - rect.left) / zoomLevel);
    const y = Math.floor((event.clientY - rect.top) / zoomLevel);

    isMouseDown = true;

    let zoomedContext = zoomedCanvas.getContext('2d');
    zoomedContext.fillStyle = `rgba(${0},${0},${0},${255/255})`;
    zoomedContext.fillRect(x, y, 1, 1);
    let context = canvas.getContext('2d');
    context.fillStyle = `rgba(${0},${0},${0},${255/255})`;
    context.fillRect(x, y, 1, 1);
}

function mouseUp(event) {
    const rect = zoomedCanvas.getBoundingClientRect();
    const x = Math.floor((event.clientX - rect.left) / zoomLevel);
    const y = Math.floor((event.clientY - rect.top) / zoomLevel);

    isMouseDown = false;
}

function mouseMove(event) {
    const rect = zoomedCanvas.getBoundingClientRect();
    const x = Math.floor((event.clientX - rect.left) / zoomLevel);
    const y = Math.floor((event.clientY - rect.top) / zoomLevel);

    if (isMouseDown) {
        let zoomedContext = zoomedCanvas.getContext('2d');
        zoomedContext.fillStyle = `rgba(${0},${0},${0},${255/255})`;
        zoomedContext.fillRect(x, y, 1, 1);
        let context = canvas.getContext('2d');
        context.fillStyle = `rgba(${0},${0},${0},${255/255})`;
        context.fillRect(x, y, 1, 1);
    }
}