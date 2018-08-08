import animate;
import ui.View;
import ui.ImageView;
import ui.resource.Image as Image;

var img_circle = new Image({url: "resources/images/circle.png"});
var debugcolor = new Image({url: "resources/images/debug.png"});

"use strict";

var img_bubbles =
[
    new Image({url: "resources/images/ball_blue-flat.png"}),
    new Image({url: "resources/images/ball_green-flat.png"}),
    new Image({url: "resources/images/ball_purple-flat.png"}),
    new Image({url: "resources/images/ball_red-flat.png"}),
    new Image({url: "resources/images/ball_yellow-flat.png"}),
];

// todo: remove this
var temp_list = [];
var temp_stuff;

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
        this.active_bubbles = [];
        this.prev_r = 0;

        var circle = new ui.ImageView({
            superview: this,
            image: img_circle,
            x: 0,
            y: 0,
            width: this.style.width,
            height: this.style.height,
        });

        this.bubbles = [];

        // HexMap.calculate_hexmap(bw, 13, this.halfwidth, this.halfwidth, 3);
        HexMap.calculate_hexmap(this.bubbles);

        this.quadtree = init_quads(this.halfwidth * 2, this.halfwidth, this.halfwidth);

        for (var i = 0; i < this.bubbles.length; i++) {
            this.bubbles[i].style.opacity = 0.1;
            var pos = [this.bubbles[i].style.x, this.bubbles[i].style.y];
            find_and_add_to_quad(this.quadtree, this.bubbles[i], pos, 0, this.quadtree.pos);
        }
        // console.log(this.quadtree);

        // console.log(this.quadtree);
    };

    this.shoot = function (color) {
        var r = -this.style.r + 1.57079632679; // todo: this
        var next_x = this.halfwidth + (Math.cos(r) * this.halfwidth * 0.9);
        var next_y = this.halfwidth + (Math.sin(r) * this.halfwidth * 0.9);

        var curr_bubble = new ui.ImageView({
            superview: this,
            image: img_bubbles[1],
            width: this.bubble_radius,
            height: this.bubble_radius,
            offsetX: -this.bubble_radius * 0.5,
            offsetY: -this.bubble_radius * 0.5,
            x: next_x,
            y: next_y,
        });

        curr_bubble.prev_x = next_x;
        curr_bubble.prev_y = next_y;

        curr_bubble.elapsed = 0;
        // curr_bubble.perp_vel = this.perp_vel;
        // console.log(curr_bubble.perp_vel);

        // 2D crossproduct (Y,-X), normalized
        // curr_bubble.crossproduct = [];
        // var y = next_y - this.halfwidth;
        // var x = next_x - this.halfwidth;
        // var vec_length = Math.sqrt(x * x + y * y);
        // curr_bubble.crossproduct[0] = (y) / vec_length;
        // curr_bubble.crossproduct[1] = -(x) / vec_length;

        // console.log(curr_bubble.crossproduct);

        this.active_bubbles.push(curr_bubble);

        // var quadlist = [];
        // console.log("-----");
        // get_quads_from_circle(this.quadtree, [next_x, next_y], 0, this.quadtree.pos, this.bubble_radius, quadlist);

        this.prev_r = r;
    };

    this.update = function (vel, dt) {
        // todo: cap radians
        this.style.r += vel; // todo: add dt to this

        var remaining_bubbles = [];

        // lerp each bubble to center
        for (var i = 0; i < this.active_bubbles.length; i++) {
            var deactivate = false;

            var el = this.active_bubbles[i];

            el.prev_x = el.style.x;
            el.prev_y = el.style.y;

            el.elapsed += dt * 0.125;
            if (el.elapsed > 1) {
                el.elapsed = 1;
            }
            var v = el.elapsed;
            el.style.x = (this.halfwidth * v) + (el.style.x * (1 - v));
            el.style.y = (this.halfwidth * v) + (el.style.y * (1 - v));

            if (el.elapsed < 1) {
                var quadlist = [];
                get_quads_from_circle(this.quadtree, [el.style.x, el.style.y], 0, this.quadtree.pos, this.bubble_radius, quadlist);

                var overlap = 0;
                var detected_hex_key;
                for (var q = 0; q < quadlist.length; q++) {
                    for (var k = 0; k < quadlist[q].list_ents.length; k++) {
                        quadlist[q].list_ents[k].style.opacity = 1;
                        var curr_overlap = intersect_circle_circle(
                            el.style.x, el.style.y,
                            quadlist[q].list_ents[k].style.x,
                            quadlist[q].list_ents[k].style.y,
                            41, 41);
                        // console.log(curr_overlap);
                        if (curr_overlap !== false && overlap < curr_overlap) {
                            // console.log(quadlist);
                            overlap = curr_overlap;
                            detected_hex_key = quadlist[q].list_ents[k].data.hex_key;
                        }
                    }
                }
                if (overlap > 0) {
                    deactivate = true;
                    // console.log(detected_hex_key);
                    var hexbubble_pair = HexMap.get_neighbors(detected_hex_key);
                    // console.log(hexbubble_pair);

                    // Find empty hex
                    var closest_hex = null;
                    var closest_dist = 9999999;
                    for (var hb = 0; hb < hexbubble_pair.length; hb++) {
                        var key = hexbubble_pair[hb];
                        if (HexMap.pts[key].data !== null) { continue; }
                        // console.log(HexMap.pts[key]);
                        var ABx = HexMap.pts[key].x - el.style.x;
                        var ABy = HexMap.pts[key].y - el.style.y;
                        var d2 = (ABx*ABx) + (ABy*ABy);
                        // console.log(d2);
                        if (d2 < closest_dist) {
                            closest_dist = d2;
                            closest_hex = key;
                        }
                    }
                    // console.log(closest_hex);
                    if (closest_hex !== null) {
                        el.style.x = HexMap.pts[closest_hex].x;
                        el.style.y = HexMap.pts[closest_hex].y;
                    }

                    // todo: pair hex and bubble
                }
            }
            if (!deactivate) {
                remaining_bubbles.push(this.active_bubbles[i]);
            }
        }
        this.active_bubbles = remaining_bubbles;
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
        data: data,
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
    calculate_hexmap: function (arr) {
        var map_radius = 11;
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

        for (var key in this.pts) {
            if (this.pts.hasOwnProperty(key)) {
                // if (this.pts[i].active) { continue; }
                var htp = hex_to_pixel(layout, this.pts[key]);
                this.pts[key].x = htp.x;
                this.pts[key].y = htp.y;

                var inner_cutoff = 3;
                var outer_cutoff = 5;
                var AbsQ = Math.abs(this.pts[key].q);
                var AbsR = Math.abs(this.pts[key].r);
                var AbsS = Math.abs(this.pts[key].s);
                var inactive = (AbsQ < inner_cutoff && AbsR < inner_cutoff && AbsS < inner_cutoff) ||
                   (AbsQ > outer_cutoff || AbsR > outer_cutoff || AbsS > outer_cutoff);

                if (inactive) { continue; }

                var bubble = new ui.ImageView({
                    superview: temp_stuff,
                    image: img_bubbles[0],
                    x: htp.x,
                    y: htp.y,
                    width: 80,
                    height: 80,
                    offsetX: -80 * 0.5,
                    offsetY: -80 * 0.5,
                });

                // pair bubble and hex
                bubble.data = {
                    hex_key: key,
                };
                this.pts[key].data = {
                    bubble_index: arr.length,
                };
                // console.log(this.pts[key].data);
                arr.push(bubble);
            }
        }

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
var MAX_ENTITIES = 8;
var MAX_LEVELS = 15;

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
        var pos = [quad.list_ents[i].style.x, quad.list_ents[i].style.y];
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