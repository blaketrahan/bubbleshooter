import animate;
import ui.View;
import ui.ImageView;
import ui.TextView;

import src.Pilot as Pilot;
import src.World as World;

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
        this.ammo = 1;
        this.active_shots = 0;

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

        var dock_height = 50;

        /*
            Player
        */
        this.pilot = new Pilot({
            superview: this,
            x: this.style.width * 0.5,
            y: this.style.height - dock_height,
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
        this.input = new ui.View({
            superview: this,
            x: 0,
            y: 0,
            width: this.style.width,
            height: this.style.height,
        });

        this.px = 0;

        // todo: research how much these events are firing
        // todo: is it better to put logic here or inside main loop?
        this.input.on('InputMove', bind(this, function (event, point) {
          this.px = point.x;
        }));

        this.input.on('InputSelect', bind(this, function (event, point) {

            if (this.ammo > 0) {
                // Add bullet to world, empty ammo.
                this.world.shoot(this.ammo);
                // this.ammo = 0;
            }
        }));
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
    var that = this;

    that.tick = function (ms) {
        var dt = ms/1000;
        // get input on -0.5 to 0.5 scale
        var local_x = (that.px - that.midpoint) / that.maxwidth;

        var vel = local_x * 0.05;

        this.world.update(vel, dt);
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