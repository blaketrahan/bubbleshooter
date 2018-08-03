import animate;
import ui.View;
import ui.ImageView;
import ui.TextView;

import src.Pilot as Pilot;
import src.World as World;
import src.Input as Input;

var lang = 'en';

exports = Class(ui.View, function (supr) {

    this.init = function (opts) {
        opts = merge(opts, {
            x: 0,
            y: 0,
        });

        supr(this, 'init', [opts]);

        this.build();
    };

    this.build = function () {
        this.on('app:start', start_game_flow.bind(this));

        this.midpoint = this.style.width * 0.5;
        this.maxwidth = this.style.width;

        /*
            Screen Messages
        */
        this.messages = new ui.TextView({
            superview: this,
            x: 0,
            y: 15,
            width: 320,
            height: 50,
            autoSize: false,
            size: 38,
            verticalAlign: 'middle',
            horizontalAlign: 'center',
            wrap: false,
            color: '#FFFFFF',
            blockEvents: true,
        });

        /*
            Player
        */
        this.pilot = new Pilot({
            superview: this,
            x: this.style.width * 0.5,
            y: this.style.height,
            blockEvents: true,
        });

        /*
            World
        */
        // needs to be twice as big as longest side of gamescreen
        this.world = new World({
            superview: this,
            width: this.style.height * 2,
            height: this.style.height * 2,
            x: (-this.style.height) + (this.style.width * 0.5),
            y: -this.style.height,
            blockEvents: true,
            anchorX: this.style.height,
            anchorY: this.style.height,
        });

        /*
            Input Layer
        */
        this.input = new Input({
            superview: this,
            x: 0,
            y: 0,
            width: this.style.width,
            height: this.style.height,
        });
    };
});

function start_game_flow () {
    var that = this;

    animate(that.messages).wait(500)
        .then(function () {
            that.messages.setText(text.READY);
        }).wait(500).then(function () {
            that.messages.setText(text.GO);
            game_on = true;
            play_game.call(that);
        });
}

function play_game () {
    that = this;

    that.tick = function (dt) {
        // get input on -0.5 to 0.5 scale
        var local_x = (this.input.px - this.midpoint) / this.maxwidth;

        // todo: cap radians
        this.world.style.r += local_x * 0.1;
    };
}


var localized_strings = {
    en: {
        READY: "READY PILOT",
        GO: "GO",
    }
};

//object of strings used in game
var text = localized_strings[lang.toLowerCase()];