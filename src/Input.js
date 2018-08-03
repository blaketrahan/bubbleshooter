import ui.View;

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

        this.px = 0;

        this.on('InputMove', bind(this, function (event, point) {
          this.px = point.x;
        }));
    }

});