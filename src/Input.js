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

        // todo: research how much these events are firing
        // todo: is it better to put logic here or inside main loop?
        this.on('InputMove', bind(this, function (event, point) {
          this.px = point.x;
        }));

        this.on('InputSelect', bind(this, function (event, point) {
          this.emit('input:fire');
        }));
    }

});