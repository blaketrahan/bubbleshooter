import ui.View;
import ui.ImageView;

import ui.resource.Image as Image;

img_background = new Image({url: "resources/images/title_screen.png" });

exports = Class(ui.View, function (supr) {

    this.init = function (opts) {
        opts = merge(opts, {
            x: 0,
            y: 0,
            backgroundColor: '#000000'
        });

        supr(this, 'init', [opts]);

        this.build();
    };

    this.build = function () {

        var background = new ui.ImageView({
            superview: this,
            x: this.style.width*0.5,
            y: this.style.height*0.5,
            image : img_background,
            width: img_background.getWidth(),
            height: img_background.getHeight(),
            offsetX: -img_background.getWidth()*0.5,
            offsetY: -img_background.getHeight()*0.5,
        });

        /*
            Buttons
        */
        var startbutton = new ui.View({
            superview: this,
            x: 0,
            y: 0,
            width: this.style.width,
            height: this.style.height,
        });

        startbutton.on('InputSelect', bind(this, function () {
            this.emit('titlescreen:start');
        }));
    }

});