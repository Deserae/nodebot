// Copyright 2018 Google Inc.
//
//  Licensed under the Apache License, Version 2.0 (the "License");
//  you may not use this file except in compliance with the License.
//  You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
//  Unless required by applicable law or agreed to in writing, software
//  distributed under the License is distributed on an "AS IS" BASIS,
//  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//  See the License for the specific language governing permissions and
//  limitations under the License.

const timeout = ms => new Promise(res => setTimeout(res, ms));

var five = require("johnny-five"),
  board, button;

board = new five.Board();

board.on("ready", function() {

  var leftMotor = new five.Motors([
    { pins: { dir: 12, pwm: 11 }, invertPWM: true }
  ]);

   var rightMotor = new five.Motors([
     { pins: { dir: 4, pwm: 5}, invertPWM: true }
   ]);

   var servo1 = new five.Servo(3);
   var servo2 = new five.Servo(9);

  var servos = [{
    servo: servo1,
    start: 90,
    step: 1
  }, {
    servo: servo2,
    start: 110,
    step: -1
  }];

  var sweeperRange = 40;
  var remoteMode = true;

  var keySpeed = 100;
  var lastAction;
  var sweeperState;

  var controls = {
    reverse(x) {
      leftMotor.forward(x);
      rightMotor.reverse(x);
      lastAction = 'reverse';
    },
    forward(x) {
      leftMotor.reverse(x);
      rightMotor.forward(x);
      lastAction = 'forward';
    },
    left(x) {
      leftMotor.reverse(x);
      rightMotor.reverse(x);
      lastAction = 'left';
    },
    right(x) {
      leftMotor.forward(x);
      rightMotor.forward(x);
      lastAction = 'right';
    },
    stop() {
      controls.forward(0);
      lastAction = 'stop';
    },
    async sequence() {
      controls.forward(100);
      await timeout(1000);
      controls.reverse(100);
      await timeout(1000);
      controls.left(100);
      await timeout(1000);
      controls.right(100);
      await timeout(1000);
      controls.stop();
    },
    async random() {
      var actionNumber = Math.floor(Math.random() * 4);
      var action = [
        'forward',
        'reverse',
        'left',
        'right'
      ][actionNumber];
      var duration = Math.random()*3000;
      var speed = 100 + Math.random(200);
      controls[action](speed);
      await timeout(duration);
      await controls.random();
    },
    async sweepers(speed, keepGoing) {
      if (keepGoing && !sweeperState) {
        return;
      }
      if (!keepGoing && sweeperState) {
        sweeperState = false;
        return;
      }
      sweeperState = true;
      for (var i=0; i<sweeperRange; i++) {
        for (var servo of servos) {
          servo.servo.to(servo.start + i*servo.step);
        }
        await timeout(20);
      }
      for (var i=sweeperRange; i>=0; i--) {
        for (var servo of servos) {
          servo.servo.to(servo.start + i*servo.step);
        }
        await timeout(20);
      }
      await controls.sweepers(0, true);
    },
    keySpeed(speed) {
      keySpeed = speed;
      if (lastAction) {
        controls[lastAction](speed);
      }
    },
    keySpeed1() {
      controls.keySpeed(100);
    },
    keySpeed2() {
      controls.keySpeed(150);
    },
    keySpeed3() {
      controls.keySpeed(200);
    },
    go() {
      controls.sweepers();
      controls.random();
    },
    remote() {
      remoteMode = !remoteMode;
    }
  }


  board.repl.inject({
    leftMotor,
    rightMotor,
    controls,
    servo1,
    servo2,
    go: controls.go,
    remote: controls.remote
  });

  process.stdin.on('keypress', (str, key) => {
    var action = {
      'w' : 'forward',
      's' : 'reverse',
      'a' : 'left',
      'd' : 'right',
      'x' : 'stop',
      'space' : 'sweepers',
      'backspace' : 'remote',
      '1' : 'keySpeed1',
      '2' : 'keySpeed2',
      '3' : 'keySpeed3',
    }[key.name];
    if (action && remoteMode) {
      controls[action](keySpeed);
    }
    if (!action && remoteMode) {
      console.log(key);
    }
  });
});
