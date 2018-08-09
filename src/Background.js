import ui.View;
import ui.ImageView;
import ui.resource.Image as Image;

var img_stars = new Image({url: "resources/images/stars.png"});

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
        this.stars = [];
        for (var i = 0; i < 6; i++) {
            var layer = new ui.ImageView({
                superview: this,
                image: img_stars,
                x: 0,
                y: 0,
                width: this.style.width,
                height: this.style.height,
                anchorX: this.style.width/2,
                anchory: this.style.height/2,
            });
            layer.style.r += 0.008 * i;
            layer.style.opacity = 1 * ((i+1)/6);
            this.stars.push(layer);
        };
    };
});