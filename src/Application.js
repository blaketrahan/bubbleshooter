/*
    todo:
        pause on rotation (and dont resize screen)
            or just resize everything
        sound
        game end
        back to main menu
        pilot tilt animation
*/

import device;
import ui.StackView as StackView;

import src.TitleScreen as TitleScreen;
import src.GameScreen as GameScreen;

var boundsWidth = 576;
var boundsHeight = 1024;
var baseWidth = boundsWidth;
var baseHeight = device.screen.height * (boundsWidth / device.screen.width);
var scale = device.screen.width / baseWidth;
var rightBoundary = baseWidth;
var leftBoundary = 0;

exports = Class(GC.Application, function () {

    this.initUI = function () {

        this.view.style.backgroundColor = '#1A99FB';
        this.view.style.scale = scale;

        var titlescreen = new TitleScreen({});

        var gamescreen = new GameScreen({
            width: baseWidth,
            height: baseHeight,
        });

        var rootView = new StackView({
            superview: this,
            x: 0,
            y: 0,
            width: baseWidth,
            height: baseHeight,
            clip: true,
        });

        rootView.push(titlescreen);

        titlescreen.on('titlescreen:start', function () {
            rootView.push(gamescreen);
            gamescreen.emit('app:start');
        });

        gamescreen.on('gamescreen:end', function () {
            rootView.pop();
            console.log("ENDED");
        });
    };

    this.launchUI = function () {};
});