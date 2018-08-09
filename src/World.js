import animate;
import ui.View;
import ui.ImageView;
import ui.resource.Image as Image;

var img_circle = new Image({url: "resources/images/circle.png"});
var debugcolor = new Image({url: "resources/images/debug.png"});

"use strict";

var img_bubbles =
[
    new Image({url: "resources/images/ball_blue.png"}),
    new Image({url: "resources/images/ball_green.png"}),
    new Image({url: "resources/images/ball_purple.png"}),
    new Image({url: "resources/images/ball_red.png"}),
    new Image({url: "resources/images/ball_yellow.png"}),
];

// todo: remove this
var temp_stuff;

var Score = {
    total: 0,
    against: 0,
    time: 0,
};

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
        temp_stuff = this;
        this.halfwidth = this.style.width * 0.5;
        this.bubble_radius = 80;

        this.prev_r = 0;

        var circle = new ui.ImageView({
            superview: this,
            image: img_circle,
            x: 0,
            y: 0,
            width: this.style.width,
            height: this.style.height,
        });

        HexMap.calculate_hexmap();

        this.quadtree = init_quads(this.halfwidth * 2, this.halfwidth, this.halfwidth);

        for (var key in HexMap.pts) {
            if (HexMap.pts.hasOwnProperty(key)) {
                var pos = [HexMap.pts[key].x, HexMap.pts[key].y];
                find_and_add_to_quad(this.quadtree, HexMap.pts[key], pos, 0, this.quadtree.pos);
            }
        }
    };

    this.shoot = function (color) {
        var r = -this.style.r + 1.57079632679; // todo: this
        var next_x = this.halfwidth + (Math.cos(r) * this.halfwidth * 0.9);
        var next_y = this.halfwidth + (Math.sin(r) * this.halfwidth * 0.9);

        var type = get_random_inclusive(0,4);

        Bubbles.create(next_x, next_y, null, type);

        this.prev_r = r;
    };

    this.update = function (vel, dt) {
        // todo: cap radians
        Score.time += dt;

        this.style.r += vel; // todo: add dt to this

        // check for ammo pickup

        var remaining_bubbles = [];

        // lerp each bubble to center
        for (var i = 0; i < Bubbles.active.length; i++) {
            var deactivate = false;

            var el = Bubbles.active[i];

            el.prev_x = el.style.x;
            el.prev_y = el.style.y;

            el.elapsed += dt * 0.125;
            if (el.elapsed >= 1) {
                console.log("OK");
                el.elapsed = 1;
                deactivate = true;
            }

            var v = el.elapsed;
            el.style.x = (this.halfwidth * v) + (el.style.x * (1 - v));
            el.style.y = (this.halfwidth * v) + (el.style.y * (1 - v));

            if (el.elapsed < 1) {
                var quadlist = [];
                get_quads_from_circle(this.quadtree, [el.style.x, el.style.y], 0, this.quadtree.pos, this.bubble_radius, quadlist);

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

                if (overlap > 0) {
                    deactivate = true;
                    var hexes = HexMap.get_neighbors(detected_hex_key);

                    // Find empty hex
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
                                Score.total++;
                            }
                        }

                        var neighbors = HexMap.get_neighbors(closest_hex);
                        var type = el.data.type;
                        var like_neighbors = [];
                        var affected = [];
                        var orphans = [];

                        find_cluster(like_neighbors, type, closest_hex, affected, Score.time);

                        if (like_neighbors.length > 2) {
                            remove_cluster(like_neighbors);

                            for (var i_a = 0; i_a < affected.length; i_a++) {
                                if (HexMap.pts[affected[i_a]].time2 === Score.time) { continue; }

                                // add first element
                                HexMap.pts[affected[i_a]].time2 = Score.time;
                                orphans.push(affected[i_a]);

                                find_orphans(orphans, affected[i_a], Score.time);

                                if (!has_ceiling(orphans)) {
                                    remove_cluster(orphans);
                                }

                                orphans.length = 0;
                            }
                        }
                    }
                }
            }
            else {
                Bubbles.active[i].removeFromSuperview();
            }
            if (!deactivate) {
                remaining_bubbles.push(Bubbles.active[i]);
            }
        }
        Bubbles.active = remaining_bubbles;
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
    list: [], // bubbles
    empties: [], // empty indices in bubble list
    active: [], // bubbles not paired with hex (ie, moving)
    max_length: 700, // todo: replace this with max hexes + some for active
    attach: function (el, key) {
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
    create: function (x, y, key = null, t = 0) {

        var type = t || get_random_inclusive(0,4);

        var bubble = new ui.ImageView({
            superview: temp_stuff,
            image: img_bubbles[type],
            x: x,
            y: y,
            width: 80,
            height: 80,
            offsetX: -80 * 0.5,
            offsetY: -80 * 0.5,
        });

        bubble.data = {
            hex_key: null,
            type: type,
        };
        bubble.elapsed = 0;
        bubble.prev_x = x;
        bubble.prev_y = y;

        if (key !== null) {
            this.attach(bubble, key);
        } else {
            this.active.push(bubble);
        }
    },
    get_an_index: function () {
        return this.empties.pop(); // todo: TEST THIS!!!!
    },
    clear: function (index) {
        this.list[index].data = null;
        this.list[index].removeFromSuperview();
        this.empties.push(index);
    },
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
    pts: [],
    get_neighbors: function (key) {
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
        var layout = Layout(layout_flat, {x:50,y:50}, {x:temp_stuff.halfwidth,y:temp_stuff.halfwidth});

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
        console.log(count);
    },
};
/* ---------------------------------------------------
    COLLISION
*/
function minkowski_circle_square (cx, cy, cr, sx, sy, w) {
    // minkowski
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
    var x = bx - ax;
    var y = by - ay;
    x *= x;
    y *= y;
    var dist = (x + y);
    var r = (ar + br);
    return (dist - (r*r) <= 0);
}
/* ---------------------------------------------------
    QUAD TREES
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
        // console.log(i);
        if (minkowski_circle_square(pos[0], pos[1], radius/2, quads[i].pos[0], quads[i].pos[1], quads[i].width)) {
            if (quads[i].has_children) {
                get_quads_from_circle(tree, pos, quads[i], quads[i].pos, radius, quadlist);
            } else {
                quadlist.push(quads[i]);
            }
        }
    }
}