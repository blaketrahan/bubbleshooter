import ui.View;
import ui.ImageView;

import ui.resource.Image as Image;

img_background = new Image({url: "resources/images/title_screen.png" });

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

        var background = new ui.ImageView({
            superview: this,
            x: 0,
            y: 0,
            image : img_background,
            width: img_background.getWidth(),
            height: img_background.getHeight(),
        });

        /*
            Buttons
        */
        var startbutton = new ui.View({
            superview: this,
            x: 58,
            y: 313,
            width: 200,
            height: 100,
        });

        startbutton.on('InputSelect', bind(this, function () {
            this.emit('titlescreen:start');
        }));
    }

});