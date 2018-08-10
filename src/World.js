import animate;
import ui.View;
import ui.ImageView;
import ui.ViewPool as ViewPool;
import ui.resource.Image as Image;
import math.geom.Point as Point;
import math.util as util;

/*
    Images
*/
var img_stars = new Image({url: "resources/images/stars.png"});
var img_nebula = new Image({url: "resources/images/nebula.png"});
var img_blackhole = new Image({url: "resources/images/blackhole.png"});
var img_base = new Image({url: "resources/images/base.png"});
var debugcolor = new Image({url: "resources/images/debug.png"});
var img_attack_black = new Image({url: "resources/images/ball_black.png"});
var img_attack_bar = new Image({url: "resources/images/bar.png"});
var img_bubbles =
[
    new Image({url: "resources/images/ball_blue.png"}),
    new Image({url: "resources/images/ball_green.png"}),
    new Image({url: "resources/images/ball_purple.png"}),
    new Image({url: "resources/images/ball_red.png"}),
    new Image({url: "resources/images/ball_yellow.png"}),
];

/*
    A few useful vars
*/
var WORLD_SIZE = 1024 * 2;
var MAX_BUBBLES = 700;
var MAX_TYPES = 4;

/*
    World class
*/
exports = Class(ui.View, function (supr) {

    this.init = function (opts) {
        opts = merge(opts, {
            x: 0,
            y: 0,
        });

        supr(this, 'init', [opts]);

        // initialize a ViewPool for ImageViews
        this.imageViewPool = new ViewPool({
            ctor: ui.ImageView,
            initCount: MAX_BUBBLES,
            initOpts: {
                parent: this,
                width: 80,
                height: 80,
                offsetX: -80 * 0.5,
                offsetY: -80 * 0.5,
                anchorX: 40,
                anchorY: 40,
            }
        });

        /*
            Vars that will be initialized once
        */
        this.quadtree = null;
        this.base = null;
        this.UI_screen = null;
        this.stars = null;
        this.nebula = null;
        this.blackhole = null;

        this.build();
    };

    this.build = function () {
        /*
            Vars that will be initialized every round
        */
        this.halfwidth = this.style.width * 0.5;
        this.bubble_radius = 80;
        this.rotation = 0;
        this.pos = new Point(0,0);
        this.player_radius = 110/2;
        this.style.r = 0;

        if (this.UI_screen === null) {
            /*
                This screen will hold the bubble shadows on the edge of the screen
            */
            var screen_width = this.getParents()[0].maxwidth;
            this.UI_screen = new ui.View({
                superview: this,
                x: this.halfwidth,
                y: this.halfwidth,
                width: screen_width,
                height: this.halfwidth,
                offsetX: -screen_width * 0.5,
                offsetY: 0,
                anchorX: screen_width/2,
                anchorY: 0,
                zIndex: 100,
                opacity: 1,
            });
        }

        if (this.stars === null) {
            /*
                Parallax star background
            */
            this.stars = [];
            var screen_width = this.getParents()[0].maxwidth;
            for (var i = 0; i < 6; i++) {
                layer = new ui.ImageView({
                    superview: this,
                    image: img_stars,
                    x: this.halfwidth,
                    y: this.halfwidth,
                    width: this.halfwidth,
                    height: this.halfwidth,
                    offsetX: -this.halfwidth * 0.5,
                    offsetY: 0,
                    anchorX: this.halfwidth/2,
                    anchorY: 0,
                    zIndex: 0,
                    opacity: 1,
                });
                layer.style.opacity = 1 * ((i+1)/6);
                this.stars.push(layer);
            };
            /*
                Nebula background overlay
            */
            this.nebula = new ui.ImageView({
                superview: this,
                image: img_nebula,
                x: this.halfwidth,
                y: this.halfwidth,
                width: this.halfwidth,
                height: this.halfwidth,
                offsetX: -this.halfwidth * 0.5,
                offsetY: 0,
                anchorX: this.halfwidth/2,
                anchorY: 0,
                zIndex: 0,
                opacity: 0.75,
            });
            /*
                Central blackhole
            */
            this.blackhole = new ui.ImageView({
                superview: this,
                image: img_blackhole,
                x: this.halfwidth,
                y: this.halfwidth,
                width: img_blackhole.getWidth(),
                height: img_blackhole.getHeight(),
                offsetX: -img_blackhole.getWidth() * 0.5,
                offsetY: -img_blackhole.getHeight() * 0.5,
                anchorX: img_blackhole.getWidth() * 0.5,
                anchorY: img_blackhole.getHeight() * 0.5,
                zIndex: 3,
                opacity: 1,
            });
        }

        Bubbles.init(this);
        Bubbles.refill_depot(this.halfwidth, 1);

        if (this.base === null) {
            /*
                Stations that surround each bubble pickup
            */
            this.base = [];
            for (var i = 0; i < Bubbles.depot.length; i++) {
                var w = img_base.getWidth() * 0.5;
                var h = img_base.getHeight() * 0.5;
                var base = new ui.ImageView({
                    superview: this,
                    image: img_base,
                    x: Bubbles.depot[i].style.x,
                    y: Bubbles.depot[i].style.y,
                    width: w,
                    height: h,
                    offsetX: -w * 0.5,
                    offsetY: -h * 0.5,
                    anchorX: w * 0.5,
                    anchorY: h * 0.5,
                    zIndex: 3,
                    opacity: 1,
                });
                this.base.push(base);
            }
        }

        Enemy.init(this.halfwidth, this.halfwidth, this);
        HexMap.init(this);
        HexMap.calculate_hexmap();

        /*
            Create and fill quadtree with hex tile map
        */
        this.quadtree = init_quads(this.halfwidth * 2, this.halfwidth, this.halfwidth);

        for (var key in HexMap.pts) {
            if (HexMap.pts.hasOwnProperty(key)) {
                var pos = [HexMap.pts[key].x, HexMap.pts[key].y];
                find_and_add_to_quad(this.quadtree, HexMap.pts[key], pos, 0, this.quadtree.pos);
            }
        }

        /*
            Keep track of time and score and points against
        */
        this.score = {
            total: 0,
            against: 0,
            time: 0,
        };

        /*
            Reset rotations
        */
        this.style.r = 0;
        this.rotation = -this.style.r + 1.57079632679;
        this.pos.x = this.halfwidth + (Math.cos(this.rotation) * this.halfwidth * 0.9);
        this.pos.y = this.halfwidth + (Math.sin(this.rotation) * this.halfwidth * 0.9);
         // todo: find better place for these elements, so as to not rotate them every tick
        this.UI_screen.style.r = 0;
        this.nebula.style.r = 0;

        for (var i = 0; i < this.stars.length; i++) {
            this.stars[i].style.r = 0;
        }
    };

    this.reset = function () {

        Bubbles.reset();
        Enemy.reset();
        HexMap.reset();

        this.imageViewPool.releaseAllViews();
        this.build();
    };

    this.shoot = function () {
        Bubbles.shoot();
    };

    this.update = function (vel, dt) {
        this.score.time += dt;

        this.style.r += vel * 0.9; // todo: add dt to this

        this.rotation = -this.style.r + 1.57079632679;
        this.pos.x = this.halfwidth + (Math.cos(this.rotation) * this.halfwidth * 0.9);
        this.pos.y = this.halfwidth + (Math.sin(this.rotation) * this.halfwidth * 0.9);

         // todo: find better place for these elements, so as to not rotate them every tick
        this.UI_screen.style.r = -this.style.r;
        this.nebula.style.r = -this.style.r;

        for (var i = 0; i < this.stars.length; i++) {
            var weight = 6 - (5 * (i+1)/this.stars.length);
            this.stars[i].style.r = ((this.stars[i].style.r * (weight - 1)) + (-this.style.r)) / weight;
        }

        Bubbles.refill_depot(this.halfwidth, dt);

        Bubbles.depot_ui(this.UI_screen.style.x,
            this.UI_screen.style.y,
            this.UI_screen.style.r,
            this.UI_screen.style.anchorX,
            this.UI_screen.style.anchorY,
            this.UI_screen.style.width,
            this.UI_screen.style.height,
            this.UI_screen.style.offsetX);

        // note: switching bool here so that player_alive = true
        var player_alive = !Enemy.update(dt, vel, this.pos, this.player_radius);

        /*
            Check if player has picked up bubble
        */
        if (Bubbles.carried === null) {
            for (var i = 0; i < Bubbles.depot.length; i++) {
                if (Bubbles.depot[i] === null || Bubbles.depot[i].elapsed < 1) { continue; }
                if (intersect_circle_circle(this.pos.x, this.pos.y, Bubbles.depot[i].style.x, Bubbles.depot[i].style.y,
                    40, 40)) {
                    Bubbles.pickup(i);
                    break;
                }
            }
        }
        else {
            Bubbles.carried.style.x = this.pos.x;
            Bubbles.carried.style.y = this.pos.y;
        }

        /*
            Update moving bubbles, find collisions and filter out
        */
        var remaining_bubbles = [];

        for (var i = 0; i < Bubbles.active.length; i++) {
            var deactivate = false;

            var el = Bubbles.active[i];

            el.elapsed += dt * 1.15;

            if (el.elapsed >= 1) {
                el.elapsed = 1;
                deactivate = true;
                this.score.against++;
                this.imageViewPool.releaseView(Bubbles.active[i]);
            }
            else {
                /*
                    This will be a moving bubble
                */
                var v = el.elapsed;
                el.style.x = (this.halfwidth * v) + (el.start_x * (1 - v));
                el.style.y = (this.halfwidth * v) + (el.start_y * (1 - v));

                /*
                    Filter possible collisions by quad
                */
                var quadlist = [];
                get_quads_from_circle(this.quadtree, [el.style.x, el.style.y], 0, this.quadtree.pos, this.bubble_radius, quadlist);

                /*
                    Test each bubble in found quads
                */
                var overlap = 0;
                var detected_hex_key;
                for (var i_q = 0; i_q < quadlist.length; i_q++) {

                    for (var i_e = 0; i_e < quadlist[i_q].list_ents.length; i_e++) {

                        if (quadlist[i_q].list_ents[i_e].data === null) { continue; }

                        var bindex = quadlist[i_q].list_ents[i_e].data.bubble_index;
                        var target = Bubbles.list[bindex];
                        var curr_overlap = intersect_circle_circle(
                            el.style.x, el.style.y,
                            target.style.x,
                            target.style.y,
                            40, 40);

                        if (curr_overlap !== false && overlap < curr_overlap) {
                            overlap = curr_overlap;
                            detected_hex_key = quadlist[i_q].list_ents[i_e].key;
                        }
                    }
                }

                /*
                    Collision found, now find nearest empty hex tile
                */
                if (overlap > 0) {
                    deactivate = true;
                    var hexes = HexMap.get_neighbors(detected_hex_key);

                    var closest_hex = null;
                    var closest_dist = 9999999;
                    for (var hb = 0; hb < hexes.length; hb++) {

                        var key = hexes[hb];
                        if (HexMap.pts[key].data !== null) { continue; }

                        var ABx = HexMap.pts[key].x - el.style.x;
                        var ABy = HexMap.pts[key].y - el.style.y;
                        var d2 = (ABx*ABx) + (ABy*ABy);

                        if (d2 < closest_dist) {
                            closest_dist = d2;
                            closest_hex = key;
                        }
                    }

                    if (closest_hex !== null) {
                        el.style.x = HexMap.pts[closest_hex].x;
                        el.style.y = HexMap.pts[closest_hex].y;

                        Bubbles.attach(el, closest_hex);

                        function find_cluster (list, type, key, affected, time) {
                            var neighbors = HexMap.get_neighbors(key);

                            for (var i_n = 0; i_n < neighbors.length; i_n++) {
                                if (HexMap.pts[neighbors[i_n]].data === null) { continue; }
                                /*
                                    Keep track of time this hex was checked,
                                    so that game doesn't fall into endless loop.
                                */
                                var prev_time = HexMap.pts[neighbors[i_n]].time;
                                HexMap.pts[neighbors[i_n]].time = time;

                                if (prev_time !== time) {

                                    if (HexMap.pts[neighbors[i_n]].data.type === type) {
                                        list.push(neighbors[i_n]);
                                        find_cluster(list, type, neighbors[i_n], affected, time);
                                    }
                                    else {
                                        affected.push(neighbors[i_n]);
                                    }
                                }
                            }
                        }

                        function find_orphans (list, key, time2) {

                            var neighbors = HexMap.get_neighbors(key);

                            for (var i_n = 0; i_n < neighbors.length; i_n++) {

                                if (HexMap.pts[neighbors[i_n]].data === null) { continue; }
                                /*
                                    Keep track of time this hex was checked,
                                    so that game doesn't fall into endless loop.
                                */
                                var prev_time2 = HexMap.pts[neighbors[i_n]].time2;
                                HexMap.pts[neighbors[i_n]].time2 = time2;

                                if (prev_time2 !== time2) {
                                    list.push(neighbors[i_n]);
                                    find_orphans(list, neighbors[i_n], time2);
                                }
                            }
                        }

                        function has_ceiling (list) {
                            for (var i_h = 0; i_h < list.length; i_h++) {
                                if (HexMap.pts[list[i_h]].ceiling) return true;
                            }
                        }

                        function remove_cluster (list) {
                            for (var i_n = 0; i_n < list.length; i_n++) {
                                var index = HexMap.pts[list[i_n]].data.bubble_index;
                                HexMap.pts[list[i_n]].data = null;
                                Bubbles.clear(index);
                            }
                        }

                        var neighbors = HexMap.get_neighbors(closest_hex);
                        var type = el.data.type;
                        var like_neighbors = [];
                        var affected = [];
                        var orphans = [];

                        /*
                            Query neighbors for same type and store in a cluster
                            After removing that cluster, query affected neighbors of other types
                            If they are orphaned, remove them.
                        */
                        find_cluster(like_neighbors, type, closest_hex, affected, this.score.time);

                        if (like_neighbors.length > 2) {
                            this.score.total += like_neighbors.length;
                            remove_cluster(like_neighbors);

                            var found_ceiling = false;

                            for (var i_a = 0; i_a < affected.length; i_a++) {
                                if (HexMap.pts[affected[i_a]].time2 === this.score.time) { continue; }

                                // add first element
                                HexMap.pts[affected[i_a]].time2 = this.score.time;
                                orphans.push(affected[i_a]);

                                find_orphans(orphans, affected[i_a], this.score.time);

                                if (!has_ceiling(orphans)) {
                                    this.score.total += orphans.length;
                                    remove_cluster(orphans);
                                }

                                orphans.length = 0;
                            }
                        }
                    }
                }
            }
            /*
                Replace old moving bubble list with remaining bubbles.
            */
            if (!deactivate) {
                remaining_bubbles.push(Bubbles.active[i]);
            }
        }
        Bubbles.active = remaining_bubbles;

        if (this.score.time > 60) {
            player_alive = false;
        }

        return player_alive;
    };
});

function get_random_inclusive (min, max)
{
    max++;
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min)) + min;
}
/* ---------------------------------------------------
    BUBBLES
*/
var Bubbles = {
    parent: null,
    list: [], // bubbles
    empties: [], // empty indices in bubble list
    active: [], // bubbles not paired with hex (ie, moving)
    max_length: MAX_BUBBLES, // todo: replace this with max hexes + some for active
    depot: [null,null,null],
    shadow: [],
    carried: null,
    clear: function (index) {
        this.list[index].data = null;
        this.parent.imageViewPool.releaseView(this.list[index]);
        this.empties.push(index);
    },
    reset: function () {
        for (var i = 0; i < this.list.length; i++) {
            this.clear(i);
        }
        this.list = [];
        for (var i = 0; i < this.active.length; i++) {
            if (this.active) {
                this.parent.imageViewPool.releaseView(this.active[i]);
            }
        }
        this.active = [];
        for (var i = 0; i < this.depot.length; i++) {
            if (this.depot) {
                this.parent.imageViewPool.releaseView(this.depot[i]);
            }
        }
        this.depot = [null, null, null];
        if (this.carried) {
            this.parent.imageViewPool.releaseView(this.carried);
        }
        this.carried = null;
        for (var i = 0; i < this.shadow.length; i++) {
            if (this.shadow) {
                this.parent.imageViewPool.releaseView(this.shadow[i]);
            }
        }
        this.shadow = [];
        this.empties = [];
    },
    init: function(parent) {
        this.parent = parent;
        /*
            Create the bubble shadows that show depots on the edge of screen
        */
        for (var i = 0; i < this.depot.length; i++) {

            var bubble = this.parent.imageViewPool.obtainView();
            bubble.updateOpts({
                superview: this.parent.UI_screen,
                visible: true,
                x: 0,
                y: 0,
                width: 80*1.25,
                height: 80*1.25,
                offsetX: -80*1.25 * 0.5,
                offsetY: -80*1.25 * 0.5,
                anchorX: 40*1.25,
                anchorY: 40*1.25,
                opacity: 0.75,
                zIndex: 100,
                scale: 1,
            });
            this.shadow.push(bubble);
        }
    },
    attach: function (el, key) {
        /*
            Pair bubble and hex together
            Also, returns an empty index in the bubble list.
        */
        var index = null;

        if (this.list.length >= this.max_length)
        {
            index = this.get_an_index();
            this.list[index] = el;
        } else {
            index = this.list.length;
            this.list.push(el);
        }

        el.data.hex_key = key;

        HexMap.pts[key].data = {
            bubble_index: index,
            type: el.data.type,
        };
    },
    create: function (x, y, key = null, t = 0, d = -1) {
        /*
            Creates a single bubble
        */
        var type = t || get_random_inclusive(0, MAX_TYPES);

        var bubble = this.parent.imageViewPool.obtainView();
        bubble.updateOpts({
            image: img_bubbles[type],
            visible: true,
            x: x,
            y: y,
            width: 80,
            height: 80,
            offsetX: -80 * 0.5,
            offsetY: -80 * 0.5,
            anchorX: 40,
            anchorY: 40,
            opacity: 1,
            zIndex: 40,
            scale: 1,
        });

        bubble.data = {
            hex_key: null,
            type: type,
        };
        bubble.start_x = x;
        bubble.start_y = y;
        bubble.elapsed = 0;

        if (key !== null) {
            this.attach(bubble, key);
        }
        else if (d >= 0) {
            this.depot[d] = bubble;
        }
        else {
            this.active.push(bubble);
        }
    },
    get_an_index: function () {
        return this.empties.pop();
    },
    refill_depot: function (radius, dt) {
        /*
            Replenish bubble pickup stations
        */
        for (var i = 0; i < this.depot.length; i++) {

            if (this.depot[i] === null) {
                var degrees = (360/this.depot.length) * i;

                var r = degrees * Math.PI / 180;
                var x = radius + (Math.cos(r) * radius * 0.9);
                var y = radius + (Math.sin(r) * radius * 0.9);

                this.create(x, y, null, 0, i);
                this.depot[i].elapsed = dt;
                this.depot[i].rotation = r;
                this.shadow[i].setImage(this.depot[i].getImage());
            } else {
                if (this.depot[i].elapsed < 1) {
                    this.depot[i].elapsed += dt/2;
                    this.depot[i].style.scale = this.depot[i].elapsed/1;
                } else {
                    this.depot[i].elapsed = 1;
                    this.depot[i].style.scale = 1;
                }
            }
        }
    },
    depot_ui: function (x, y, r, anchorX, anchorY, w, h, offsetX) {
        /*
            This is how the shadows are plotted on the edge of the screen
        */
        // todo: maybe this can be optimized, because
        // the center of rotation of the rect is at 0,0
        for (var i = 0; i < this.depot.length; i++) {
            var relX = this.depot[i].style.x - x;
            var relY = this.depot[i].style.y - y;
            var angle = -r;
            var angleCos = Math.cos(angle);
            var angleSin = Math.sin(angle);
            var localX = angleCos * relX - angleSin * relY;
            var localY = angleSin * relX + angleCos * relY;
            if (localX >= -anchorX && localX <= w - anchorX && localY >= -anchorY && localY <= h - anchorY) {
                this.shadow[i].style.opacity = 0;
            } else {
                this.shadow[i].style.opacity = 0.75;
                this.shadow[i].style.x = util.clip(localX-offsetX, 0, w);
                this.shadow[i].style.y = util.clip(localY, 0, h);
            }
        }
    },
    pickup: function (d) {
        /*
            Move depot bubble to carried bubble list
        */
        this.carried = this.depot[d];
        this.carried.elapsed = 0;
        this.depot[d] = null;
        return this.carried.data.type;
    },
    shoot: function () {
        /*
            Move carried bubble to active bubble list
        */
        if (this.carried === null) return;
        this.carried.start_x = this.carried.style.x;
        this.carried.start_y = this.carried.style.y;
        this.active.push(this.carried);
        this.carried = null;
    }
};

/* ---------------------------------------------------
    HEX MAP
*/
function Hex(q, r, s, data) {
    if (Math.round(q + r + s) !== 0) throw "q + r + s must be 0";
    return {
        q: q,
        r: r,
        s: s,
        x: 0,
        y: 0,
        key: "",
        ceiling: false,
        data: data,
        time: 0,
        time2: 0,
    };
}
function Orientation(f0, f1, f2, f3, b0, b1, b2, b3, start_angle) {
    return {f0: f0, f1: f1, f2: f2, f3: f3, b0: b0, b1: b1, b2: b2, b3: b3, start_angle: start_angle};
}
function Layout(orientation, size, origin) {
    return {
        orientation: orientation,
        size: size,
        origin: origin
    };
}
function hex_to_pixel(layout, h)
{
    var M = layout.orientation;
    var size = layout.size;
    var origin = layout.origin;
    var x = (M.f0 * h.q + M.f1 * h.r) * size.x;
    var y = (M.f2 * h.q + M.f3 * h.r) * size.y;
    return {x: x + origin.x, y: y + origin.y};
}
var hex_directions = [Hex(1, 0, -1), Hex(1, -1, 0), Hex(0, -1, 1), Hex(-1, 0, 1), Hex(-1, 1, 0), Hex(0, 1, -1)];
function hex_direction(direction)
{
    return hex_directions[direction];
}
function hex_add(a, b)
{
    return Hex(a.q + b.q, a.r + b.r, a.s + b.s);
}
function hex_neighbor(hex, direction)
{
    return hex_add(hex, hex_direction(direction));
}
function hex_neighbor_key(hex, direction)
{
    var key = hex_add(hex, hex_direction(direction));
    return key.q.toString() + key.r.toString() + (-key.q-key.r).toString();
}
var HexMap = {
    parent: null,
    pts: [],
    init: function (parent) {
        this.parent = parent;
    },
    reset: function() {
        for (var i = 0; i < this.pts.length; i++) {
            this.pts[i].data = null;
            this.pts[i].time = 0;
            this.pts[i].time2 = 0;
        }
    },
    get_neighbors: function (key) {
        /*
            Return list of neighbors by key
        */
        return [
            hex_neighbor_key(this.pts[key], 0),
            hex_neighbor_key(this.pts[key], 1),
            hex_neighbor_key(this.pts[key], 2),
            hex_neighbor_key(this.pts[key], 3),
            hex_neighbor_key(this.pts[key], 4),
            hex_neighbor_key(this.pts[key], 5),
        ];
    },
    calculate_hexmap: function () {
        /*
            Build hexmap and create bubbles based on inner and outer cutoff ranges
        */
        var map_radius = 13;
        for (var q = -map_radius; q <= map_radius; q++) {
            var r1 = Math.max(-map_radius, -q - map_radius);
            var r2 = Math.min(map_radius, -q + map_radius);
            for (var r = r1; r <= r2; r++) {
                var key = q.toString() + r.toString() + (-q-r).toString();
                this.pts[key] = Hex(q, r, -q-r, null);
            }
        }

        var layout_flat = Orientation(3.0 / 2.0, 0.0, Math.sqrt(3.0) / 2.0, Math.sqrt(3.0), 2.0 / 3.0, 0.0, -1.0 / 3.0, Math.sqrt(3.0) / 3.0, 0.0);
        var layout = Layout(layout_flat, {x:50,y:50}, {x:this.parent.halfwidth,y:this.parent.halfwidth});

        var inner_cutoff = 3;
        var outer_cutoff = 5;

        for (var key in this.pts) {
            if (this.pts.hasOwnProperty(key)) {

                var htp = hex_to_pixel(layout, this.pts[key]);
                this.pts[key].x = htp.x;
                this.pts[key].y = htp.y;
                this.pts[key].key = key;

                var AbsQ = Math.abs(this.pts[key].q);
                var AbsR = Math.abs(this.pts[key].r);
                var AbsS = Math.abs(this.pts[key].s);
                var inactive = (AbsQ < inner_cutoff && AbsR < inner_cutoff && AbsS < inner_cutoff) ||
                   (AbsQ > outer_cutoff || AbsR > outer_cutoff || AbsS > outer_cutoff);

                if (inactive) { continue; }

                Bubbles.create(htp.x, htp.y, key);
            }
        }

        /*
            Find the ceiling tiles
        */
        var count = 0;
        for (var key in this.pts) {
            if (this.pts.hasOwnProperty(key)) {
                count++;
                if (this.pts[key].data === null) { continue; }

                var AbsQ = Math.abs(this.pts[key].q);
                var AbsR = Math.abs(this.pts[key].r);
                var AbsS = Math.abs(this.pts[key].s);

                this.pts[key].ceiling = (AbsQ < inner_cutoff + 1 && AbsR < inner_cutoff + 1 && AbsS < inner_cutoff + 1);
            }
        }
    },
};
/* ---------------------------------------------------
    COLLISION
*/
function minkowski_circle_square (cx, cy, cr, sx, sy, w) {
    /*
        Minkowski circle square collision detection
    */
    var distx = Math.abs(cx - sx);
    var disty = Math.abs(cy - sy);

    if (distx > (w * 0.5 + cr)) { return false; }
    if (disty > (w * 0.5 + cr)) { return false; }

    if (distx <= (w * 0.5)) { return true; }
    if (disty <= (w * 0.5)) { return true; }

    var xoff = distx - w * 0.5;
    var yoff = disty - w * 0.5;

    var corner_dist = xoff * xoff + yoff * yoff;

    return (corner_dist <= (cr * cr));
}

function intersect_circle_circle (ax, ay, bx, by, ar, br) {
    /*
        Circle circle collision detection
    */
    var x = bx - ax;
    var y = by - ay;
    x *= x;
    y *= y;
    var dist = (x + y);
    var r = (ar + br);
    return (dist - (r*r) <= 0);
}
/* ---------------------------------------------------
    QUAD TREE
*/
/*
    This is just a basic quadtree
    Static objects are the only thing stored (hex tiles)
    The tree is created once at the start of the round,
    and never updated again, since hex tiles don't change.
*/
var MAX_ENTITIES = 15;
var MAX_LEVELS = 20;

function QuadTree ( m1, m2, m3, m4, m5) {
    return {
        list_ents: [],          // entities inside
        level: m1,              // int
        has_children: m2,       // bool
        width: m3,              // float
        pos: [m4,m5],           // vector pos
        quads: [null,null,null,null], // child quads
        image: null,
    };
}

function init_quads (quad_size, midpointx, midpointy) {
    var toptree = QuadTree(0, true, quad_size, midpointx, midpointy);
    halfwidth = quad_size * 0.5; // halve it for children

    for (var i = 0; i < 4; i++) {
        toptree.quads[i] = QuadTree(1, false, halfwidth, midpointx, midpointy);
    }

    toptree.quads[0].pos[0] = toptree.pos[0] - (halfwidth * 0.5);
    toptree.quads[1].pos[0] = toptree.pos[0] + (halfwidth * 0.5);
    toptree.quads[2].pos[0] = toptree.pos[0] + (halfwidth * 0.5);
    toptree.quads[3].pos[0] = toptree.pos[0] - (halfwidth * 0.5);

    toptree.quads[0].pos[1] = toptree.pos[1] + (halfwidth * 0.5);
    toptree.quads[1].pos[1] = toptree.pos[1] + (halfwidth * 0.5);
    toptree.quads[2].pos[1] = toptree.pos[1] - (halfwidth * 0.5);
    toptree.quads[3].pos[1] = toptree.pos[1] - (halfwidth * 0.5);

    return toptree;
}

function clear_quads (tree) {
    for (var i = 0; i < 4; i++) {
        tree.quads[i].list_ents.length = 0;
        tree.quads[i].has_children = false;
    }
}

function add_to_quad (tree, quad, entity) {
    quad.list_ents.push(entity); // todo: make sure this is a reference
    if (quad.list_ents.length > MAX_ENTITIES && quad.level < MAX_LEVELS) {
        split_quad(tree,quad);
    }
}

function find_and_add_to_quad (tree, entity, pos, found_quad, quad_pos) {
    var quads;

    if (found_quad == 0) {
        quads = tree.quads;
    }
    else {
        quads = found_quad.quads;
    }

    if (pos[0] <= quad_pos[0] && pos[1] >= quad_pos[1]) {
        found_quad = quads[0];
    }
    else if (pos[0] >= quad_pos[0] && pos[1] >= quad_pos[1]) {
        found_quad = quads[1];
    }
    else if (pos[0] >= quad_pos[0] && pos[1] <= quad_pos[1]) {
        found_quad = quads[2];
    }
    else if (pos[0] <= quad_pos[0] && pos[1] <= quad_pos[1]) {
        found_quad = quads[3];
    }

    if (found_quad.has_children) {
        return find_and_add_to_quad(tree, entity, pos, found_quad, found_quad.pos);
    }
    else {
        add_to_quad(tree, found_quad, entity);
    }
}

function split_quad (tree, quad) {
    quad.has_children = true;
    var level = quad.level+1;
    var halfwidth = quad.width * 0.5;

    for (var i = 0; i < 4; i++) {
        quad.quads[i] = QuadTree(level, false, halfwidth, quad.pos[0], quad.pos[1]);
    }

    quad.quads[0].pos[0] = quad.pos[0] - (halfwidth * 0.5);
    quad.quads[1].pos[0] = quad.pos[0] + (halfwidth * 0.5);
    quad.quads[2].pos[0] = quad.pos[0] + (halfwidth * 0.5);
    quad.quads[3].pos[0] = quad.pos[0] - (halfwidth * 0.5);

    quad.quads[0].pos[1] = quad.pos[1] + (halfwidth * 0.5);
    quad.quads[1].pos[1] = quad.pos[1] + (halfwidth * 0.5);
    quad.quads[2].pos[1] = quad.pos[1] - (halfwidth * 0.5);
    quad.quads[3].pos[1] = quad.pos[1] - (halfwidth * 0.5);

    /*
        Convenient views for debugging
    */
    // for (var i = 0; i < 4; i++) {
    //     quad.quads[i].image = new ui.ImageView({
    //         superview: temp_stuff,
    //         image: debugcolor,
    //         x: quad.quads[i].pos[0],
    //         y: quad.quads[i].pos[1],
    //         width: halfwidth,
    //         height: halfwidth,
    //         offsetX: -halfwidth * 0.5,
    //         offsetY: -halfwidth * 0.5,
    //     });
    // }

    for (var i = 0; i < quad.list_ents.length; i++) {
        var pos = [quad.list_ents[i].x, quad.list_ents[i].y];
        find_and_add_to_quad(tree, quad.list_ents[i], pos, quad, quad.pos);
    }
}

function get_quad_from_pos (tree, pos, found_quad, quad_pos) {
    var quads;

    if (found_quad == 0) {
        quads = tree.quads;
    }
    else {
        quads = found_quad.quads;
    }

    if (pos[0] <= quad_pos[0] && pos[1] >= quad_pos[1]) {
        found_quad = quads[0];
    }
    else if (pos[0] >= quad_pos[0] && pos[1] >= quad_pos[1]) {
        found_quad = quads[1];
    }
    else if (pos[0] >= quad_pos[0] && pos[1] <= quad_pos[1]) {
        found_quad = quads[2];
    }
    else if (pos[0] <= quad_pos[0] && pos[1] <= quad_pos[1]) {
        found_quad = quads[3];
    }

    if (found_quad.has_children) {
        return get_quad_from_pos(tree, pos, found_quad, found_quad.pos);
    }
    else {
        return found_quad;
    }
}


function get_quads_from_circle (tree, pos, found_quad, quad_pos, radius, quadlist) {
    // uses minkowski difference to check which quads a circle is intersecting
    var quads;

    if (found_quad === 0) {
        quads = tree.quads;
    }
    else {
        quads = found_quad.quads;
    }

    for (var i = 0; i < 4; i++) {
        if (minkowski_circle_square(pos[0], pos[1], radius/2, quads[i].pos[0], quads[i].pos[1], quads[i].width)) {
            if (quads[i].has_children) {
                get_quads_from_circle(tree, pos, quads[i], quads[i].pos, radius, quadlist);
            } else {
                quadlist.push(quads[i]);
            }
        }
    }
}

/* ---------------------------------------------------
    ENEMIES AND ATTACKS
*/
function Attack (init_func, fire_func, move_func, collision_func) {
    /*
        This is the base for each attack
        They are initialized inside Enemy object.
    */
    var obj = {
        parent: null,
        el: [],
        curr: 0,
        active: true,
        elapsed: 0,
        cooldown: 5,
        direciton: 0,
        target: 0,
        fire: fire_func,
        move: move_func,
        collision: collision_func,
    };
    bind(obj, init_func)();
    return obj;
}

var Enemy = {
    parent: null,
    attack: [],
    n: 0, // which attack to use next
    origin: 0,
    elapsed: 0,
    reset: function () {
        this.elapsed = 0;
        this.n = 0;
        for (var i = 0; i < this.attack.length; i++) {
            for (var k = 0; k < this.attack[i].el.length; k++) {
                this.parent.imageViewPool.releaseView(this.attack[i].el[k]);
            }
        }
        this.attack = [];
    },
    init: function (x, y, parent) {
        this.origin = new Point(x, y);
        this.elapsed = 0;
        this.parent = parent;

        var fireball = Attack(
            function() {
                /*
                    Init and return render elements
                */
                this.el = [];
                for (var i = 0; i < 4; i++) {
                    var obj = parent.imageViewPool.obtainView();
                    obj.updateOpts({
                        superview: parent,
                        image: img_attack_black,
                        x: x,
                        y: y,
                        width: 70,
                        height: 70,
                        offsetX: -70 * 0.5,
                        offsetY: -70 * 0.5,
                        anchorX: 35,
                        anchorY: 35,
                        zIndex: 50,
                        opacity: 1,
                        visible: false,
                        scale: 1,
                    });
                    obj.target = new Point(x, y);
                    obj.elapsed = 0;
                    obj.active = false;
                    obj.origin = new Point(x, y);
                    this.el.push(obj);
                }
                this.cooldown = 3 + (0.5 * this.el.length);
                this.parent = parent;
            },
            function(dt, dir, pos, origin) {
                /*
                    On fire
                */
                this.elapsed += dt;
                if (this.elapsed >= 0.5) {

                    if (this.curr === 0) {
                        this.dir = (dir < 0 ? -0.1 : 0.1);
                        // this.target = (new Point(pos))
                    }

                    this.elapsed = 0;

                    var el = this.el[this.curr];
                    el.active = true;
                    el.elapsed = 0;
                    el.target = new Point(pos);
                    el.target.subtract(origin);
                    el.target.rotate((-this.dir * 4) + this.dir * this.curr);
                    el.target.scale(2);
                    el.target.translate(origin);
                    el.origin = new Point(origin);
                    el.style.visible = true;

                    this.curr++;

                    if (this.curr >= this.el.length) {
                        this.active = false;
                        this.curr = 0;
                    }
                }
            },
            function(dt) {
                /*
                    Update tick
                */
                for (var i = 0; i < this.el.length; i++) {
                    var el = this.el[i];
                    if (!el.active) { continue; }

                    el.elapsed += dt/2;
                    var v = el.elapsed;

                    if (v > 1) {
                        el.elapsed = 0;
                        el.active = false;
                        el.style.visible = false;
                    }
                    el.style.x = (el.target.x * v) + (el.origin.x * (1 - v));
                    el.style.y = (el.target.y * v) + (el.origin.y * (1 - v));
                }
            },
            function(pos, radius) {
                /*
                    Collision
                */
                for (var i = 0; i < this.el.length; i++) {
                    if (minkowski_circle_square(pos.x, pos.y, radius, this.el[i].style.x, this.el[i].style.y, this.el[i].style.width)) {
                        return true;
                    }
                }
            },
        );

        var whitebar = Attack(
            function() {
                /*
                    Init and return render elements
                */
                this.el = [];
                for (var i = 0; i < 6; i++) {
                    var obj = parent.imageViewPool.obtainView();
                    obj.updateOpts({
                        superview: parent,
                        image: img_attack_bar,
                        x: x,
                        y: y,
                        width: 300,
                        height: 60,
                        offsetX: -300 * 0.5,
                        offsetY: -60 * 0.5,
                        anchorX: 150,
                        anchorY: 30,
                        zIndex: 50,
                        opacity: 1,
                        visible: false,
                        scale: 1,
                    });
                    obj.target = new Point(x, y);
                    obj.elapsed = 0;
                    obj.active = false;
                    obj.origin = new Point(x, y);
                    this.el.push(obj);
                }
                this.cooldown = 4;//this.cooldown * 2;
                this.parent = parent;
            },
            function(dt, dir, pos, origin) {
                /*
                    On fire
                */
                this.dir = 1;
                this.target = new Point(WORLD_SIZE, WORLD_SIZE);

                this.elapsed = 0;
                for (var i = 0; i < this.el.length; i++) {
                    var rotation = (Math.PI * 2) * ((i+1)/this.el.length);
                    var el = this.el[i];
                    el.active = true;
                    el.elapsed = 0;
                    el.target = new Point(this.target);
                    el.target.subtract(origin);
                    el.target.rotate(rotation);
                    el.target.translate(origin);
                    el.origin = new Point(origin);
                    el.style.r = rotation - 0.7853981634;
                    el.style.visible = true;
                    el.style.scale = 0;
                }

                this.active = false;
            },
            function(dt) {
                /*
                    Update tick
                */
                for (var i = 0; i < this.el.length; i++) {
                    var el = this.el[i];
                    if (!el.active) { continue; }

                    el.elapsed += dt/4;
                    var v = el.elapsed;
                    el.style.scale = v * 2.1;

                    if (v > 1) {
                        el.elapsed = 0;
                        el.active = false;
                        el.style.visbile = false;
                    }
                    el.style.x = (el.target.x * v) + (el.origin.x * (1 - v));
                    el.style.y = (el.target.y * v) + (el.origin.y * (1 - v));
                }
            },
            function(pos, radius) {
                /*
                    Collision
                */
                for (var i = 0; i < this.el.length; i++) {
                    if (this.el[i].elapsed < 0.58 || this.el[i].elapsed > 0.65) { continue; }
                    if (minkowski_circle_square(pos.x, pos.y, radius, this.el[i].style.x, this.el[i].style.y, this.el[i].style.width)) {
                        return true;
                    }
                }
            },
        );

        this.attack.push(fireball);
        this.attack.push(whitebar);
    },
    update: function (dt, dir, pos, radius) {
        /*
            Update all attacks and check for player collision
        */
        this.elapsed += dt;
        if (this.elapsed >= this.attack[this.n].cooldown) {
            this.elapsed = 0;
            this.n = this.n + 1 >= this.attack.length ? 0 : this.n + 1;
            this.attack[this.n].active = true;
        }

        if (this.attack[this.n].active) {
            this.attack[this.n].fire(dt, dir, pos, this.origin);
        }

        for (var i = 0; i < this.attack.length; i++) {
            this.attack[i].move(dt);
            if (this.attack[i].collision(pos, radius)) {
                return true;
            }
        }

        return false; // no collision
    }
};