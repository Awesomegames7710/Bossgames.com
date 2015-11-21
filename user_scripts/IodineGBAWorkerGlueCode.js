"use strict";
/*
 Copyright (C) 2012-2015 Grant Galitz
 
 Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
 
 The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
 
 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */
function IodineGBAWorkerShim() {
    this.gfx = null;
    this.audio = null;
    this.speed = null;
    this.saveExport = null;
    this.saveImport = null;
    this.worker = null;
    this.graphicsBuffer = null;
    this.graphicsLock = null;
    this.audioBuffer = null;
    this.audioLock = null;
    this.audioMetrics = null;
    this.initialize();
}
var tempvar = document.getElementsByTagName("script");
IodineGBAWorkerShim.prototype.filepath = tempvar[tempvar.length-1].src;
IodineGBAWorkerShim.prototype.initialize = function () {
    var parentObj = this;
    this.worker = new Worker(this.filepath.substring(0, (this.filepath.length | 0) - 3) + "Worker.js");
    this.worker.onmessage = function (event) {
        parentObj.decodeMessage(event.data);
    }
}
IodineGBAWorkerShim.prototype.sendMessageSingle = function (eventCode) {
    eventCode = eventCode | 0;
    this.worker.postMessage({messageID:eventCode});
}
IodineGBAWorkerShim.prototype.sendMessageDouble = function (eventCode, eventData) {
    eventCode = eventCode | 0;
    this.worker.postMessage({messageID:eventCode, payload:eventData});
}
IodineGBAWorkerShim.prototype.sendBufferBack = function (eventCode, eventData) {
    eventCode = eventCode | 0;
    this.worker.postMessage({messageID:eventCode, payload:eventData}, [eventData.buffer]);
}
IodineGBAWorkerShim.prototype.play = function () {
    this.sendMessageSingle(0);
}
IodineGBAWorkerShim.prototype.pause = function () {
    this.sendMessageSingle(1);
}
IodineGBAWorkerShim.prototype.restart = function () {
    this.sendMessageSingle(2);
}
IodineGBAWorkerShim.prototype.setIntervalRate = function (rate) {
    rate = rate | 0;
    this.sendMessageDouble(3, rate | 0);
}
IodineGBAWorkerShim.prototype.timerCallback = function (timestamp) {
    timestamp = +timestamp;
    //Using main thread timer as heartbeat for shared array buffer checking:
    //If audio API handle provided and we got a buffer reference:
    if (this.audio && this.audioLock) {
        //Waits while 1:
        //If buffer is ready to be consumed, it'll be turned from 2 to 1:
        this.waitForAccess(this.audioLock);
        //If we get the lock, it'll be 1 here:
        if (Atomics.load(this.audioLock, 0) == 1) {
            //Empty the buffer out:
            this.consumeAudioBuffer();
            //Mark as consumed:
            Atomics.store(this.audioLock, 0, 0);
        }
        //Push latest audio metrics with no buffering:
        Atomics.store(this.audioMetrics, 0, this.audio.remainingBuffer() | 0);
    }
    //If graphics callback handle provided and we got a buffer reference:
    if (this.gfx && this.graphicsLock) {
        //Waits while 1:
        //If buffer is ready to be consumed, it'll be turned from 2 to 1:
        this.waitForAccess(this.graphicsLock);
        //If we get the lock, it'll be 1 here:
        if (Atomics.load(this.graphicsLock, 0) == 1) {
            this.gfx(this.graphicsBuffer);
            //Mark as consumed:
            Atomics.store(this.graphicsLock, 0, 0);
        }
    }
    //Send timestamp to compute stats to forward back to this thread:
    this.sendMessageDouble(4, +timestamp);
}
IodineGBAWorkerShim.prototype.consumeAudioBuffer = function () {
    this.audio.push(this.audioBuffer, Atomics.load(this.audioMetrics, 1) | 0);
    Atomics.store(this.audioMetrics, 1, 0);
}
IodineGBAWorkerShim.prototype.attachGraphicsFrameHandler = function (gfx) {
    this.gfx = gfx;
    this.sendMessageSingle(5);
}
IodineGBAWorkerShim.prototype.attachAudioHandler = function (audio) {
    this.audio = audio;
    this.sendMessageSingle(6);
}
IodineGBAWorkerShim.prototype.enableAudio = function () {
    if (this.audio) {
        this.sendMessageSingle(7);
    }
}
IodineGBAWorkerShim.prototype.disableAudio = function () {
    if (this.audio) {
        this.sendMessageSingle(8);
    }
}
IodineGBAWorkerShim.prototype.toggleSkipBootROM = function (doEnable) {
    doEnable = doEnable | 0;
    this.sendMessageDouble(9, doEnable | 0);
}
IodineGBAWorkerShim.prototype.toggleDynamicSpeed = function (doEnable) {
    doEnable = doEnable | 0;
    this.sendMessageDouble(10, doEnable | 0);
}
IodineGBAWorkerShim.prototype.attachSpeedHandler = function (speed) {
    this.speed = speed;
    this.sendMessageSingle(11);
}
IodineGBAWorkerShim.prototype.keyDown = function (keyCode) {
    keyCode = keyCode | 0;
    this.sendMessageDouble(12, keyCode | 0);
}
IodineGBAWorkerShim.prototype.keyUp = function (keyCode) {
    keyCode = keyCode | 0;
    this.sendMessageDouble(13, keyCode | 0);
}
IodineGBAWorkerShim.prototype.incrementSpeed = function (newSpeed) {
    newSpeed = +newSpeed;
    this.sendMessageDouble(14, +newSpeed);
}
IodineGBAWorkerShim.prototype.attachBIOS = function (BIOS) {
    this.sendMessageDouble(15, BIOS);
}
IodineGBAWorkerShim.prototype.attachROM = function (ROM) {
    this.sendMessageDouble(16, ROM);
}
IodineGBAWorkerShim.prototype.exportSave = function () {
    this.sendMessageSingle(17);
}
IodineGBAWorkerShim.prototype.attachSaveExportHandler = function (saveExport) {
    this.saveExport = saveExport;
    this.sendMessageSingle(18);
}
IodineGBAWorkerShim.prototype.attachSaveImportHandler = function (saveImport) {
    this.saveImport = saveImport;
    this.sendMessageSingle(19);
}
IodineGBAWorkerShim.prototype.decodeMessage = function (data) {
    switch (data.messageID) {
        case 0:
            this.buffersInitialize(data.graphicsBuffer, data.gfxLock, data.audioBuffer, data.audioLock, data.audioMetrics);
            break;
        case 1:
            this.audioInitialize(data.channels | 0, +data.sampleRate, data.bufferLimit | 0);
            break;
        case 2:
            this.audioRegister();
            break;
        case 3:
            this.audioUnregister();
            break;
        case 4:
            this.audioSetBufferSpace(data.audioBufferContainAmount | 0);
            break;
        case 5:
            this.saveImportRequest(data.saveID);
            break;
        case 6:
            this.saveExportRequest(data.saveID, data.saveData);
            break;
        case 7:
            this.speedPush(+data.speed);
    }
}
IodineGBAWorkerShim.prototype.audioInitialize = function (channels, sampleRate, bufferLimit) {
    channels = channels | 0;
    sampleRate = +sampleRate;
    bufferLimit = bufferLimit | 0;
    if (this.audio) {
        this.audio.initialize(channels | 0, +sampleRate, bufferLimit | 0, function () {
            //Disable audio in the callback here:
            parentObj.disableAudio();
        });
    }
}
IodineGBAWorkerShim.prototype.audioRegister = function () {
    if (this.audio) {
        this.audio.register();
    }
}
IodineGBAWorkerShim.prototype.audioUnregister = function () {
    if (this.audio) {
        this.audio.unregister();
    }
}
IodineGBAWorkerShim.prototype.audioSetBufferSpace = function (bufferSpace) {
    bufferSpace = bufferSpace | 0;
    if (this.audio) {
        this.audio.setBufferSpace(bufferSpace | 0);
    }
}
IodineGBAWorkerShim.prototype.buffersInitialize = function (graphicsBuffer, gfxLock, audioBuffer, audioLock, audioMetrics) {
    this.graphicsBuffer = graphicsBuffer;
    this.graphicsLock = gfxLock;
    this.audioBuffer = audioBuffer;
    this.audioLock = audioLock;
    this.audioMetrics = audioMetrics;
}
IodineGBAWorkerShim.prototype.speedPush = function (speed) {
    speed = +speed;
    if (this.speed) {
        this.speed(+speed);
    }
}
IodineGBAWorkerShim.prototype.saveImportRequest = function (saveID) {
    if (this.saveImport) {
        var parentObj = this;
        this.saveImport(saveID, function (saveData) {
            parentObj.sendMessageDouble(20, saveData);
        },
        function () {
            parentObj.sendMessageSingle(21);
        });
    }
}
IodineGBAWorkerShim.prototype.saveExportRequest = function (saveID, saveData) {
    if (this.saveExport) {
        this.saveExport(saveID, saveData);
    }
}
IodineGBAWorkerShim.prototype.waitForAccess = function (buffer) {
    while (Atomics.compareExchange(buffer, 0, 2, 1) == 1);
}