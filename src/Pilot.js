import animate;
import ui.View;
import ui.ImageView;
import ui.resource.Image as Image;

/*
    constants
*/
var img_pilot = new Image({url: "resources/images/pilot.png"});

exports = Class(ui.View, function (supr) {

    this.init = function (opts) {
        opts = merge(opts, {
            x: 0,
            y: 0,
            width: img_pilot.getWidth(),
            height: img_pilot.getHeight(),
            offsetX: -img_pilot.getWidth() * 0.5,
            offsetY: -img_pilot.getHeight(),
        });

        supr(this, 'init', [opts]);

        this.build();
    };

    this.build = function () {

        var pilot = new ui.ImageView({
            superview: this,
            image: img_pilot,
            x: 0,
            y: 0,
            width: img_pilot.getWidth(),
            height: img_pilot.getHeight(),
            opacity: 0.25,
        });
    };
});