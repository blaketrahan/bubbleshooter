import animate;
import ui.View;
import ui.ImageView;
import ui.resource.Image as Image;

var img_circle = new Image({url: "resources/images/circle.png"});

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

        var circle = new ui.ImageView({
            superview: this,
            image: img_circle,
            x: 0,
            y: 0,
            width: this.style.width,
            height: this.style.height,
        });
    };
});