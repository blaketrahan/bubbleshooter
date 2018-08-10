import device;
import ui.StackView as StackView;

import src.TitleScreen as TitleScreen;
import src.GameScreen as GameScreen;

exports = Class(GC.Application, function () {

    this.initUI = function () {

        var boundsWidth = 576;
        var boundsHeight = 1024;
        var baseWidth = boundsWidth;
        var baseHeight = device.screen.height * (boundsWidth / device.screen.width);
        var scale = device.screen.width / baseWidth;
        var rightBoundary = baseWidth;
        var leftBoundary = 0;

        // todo: just a quick fix for short and wide screens
        if (baseWidth / baseHeight > 0.6) {
            boundsWidth = 576;
            boundsHeight = 1024;
            baseWidth = device.screen.width * (boundsHeight / device.screen.height);
            baseHeight = boundsHeight;
            scale = device.screen.height / baseHeight;
            rightBoundary = baseWidth;
            leftBoundary = 0;
        }

        this.view.style.backgroundColor = '#0A111F';
        this.view.style.scale = scale;

        var titlescreen = new TitleScreen({
            width: baseWidth,
            height: baseHeight,
            clip: true,
        });

        var gamescreen = new GameScreen({
            width: baseWidth,
            height: baseHeight,
            clip: true,
        });

        var rootView = new StackView({
            superview: this,
            x: 0,
            y: 0,
            width: baseWidth,
            height: baseHeight,
            clip: true,
        });

        rootView.push(titlescreen, true);

        titlescreen.on('titlescreen:start', function () {
            rootView.push(gamescreen, true);
            gamescreen.emit('app:start');
        });

        gamescreen.on('gamescreen:end', function () {
            rootView.pop(true);
        });
    };

    this.launchUI = function () {};
});