import animate;
import ui.View;
import ui.ImageView;
import ui.resource.Image as Image;

var img_circle = new Image({url: "resources/images/circle.png"});

var img_bubbles =
[
    new Image({url: "resources/images/ball_blue-flat.png"}),
    new Image({url: "resources/images/ball_green-flat.png"}),
    new Image({url: "resources/images/ball_purple-flat.png"}),
    new Image({url: "resources/images/ball_red-flat.png"}),
    new Image({url: "resources/images/ball_yellow-flat.png"}),
];

var pts = [];

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

        var bw = this.bubble_radius;
        var bh = this.bubble_radius;

        calculate_hexmap(bw, 6, this.halfwidth, this.halfwidth, 3);

        for (var i = 0; i < pts.length; i++) {
            var color = get_random_inclusive(0,4);
            var bubble = new ui.ImageView({
                superview: this,
                image: img_bubbles[color],
                x: pts[i][0],
                y: pts[i][1],
                width: bw,
                height: bh,
                offsetX: -bw * 0.5,
                offsetY: -bh * 0.5,
            });

            this.bubbles.push(bubble);
        }

        this.quadtree = init_quads(this.halfwidth * 2, this.halfwidth, this.halfwidth);
        console.log(this.quadtree);

        for (var i = 0; i < this.bubbles.length; i++) {
            var pos = [this.bubbles[i].style.x, this.bubbles[i].style.y];
            find_and_add_to_quad(this.quadtree, this.bubbles[i], pos, 0, this.quadtree.pos);
        }

        console.log(this.quadtree);
    };

    this.shoot = function (color) {
        var r = -this.style.r + 1.57079632679; // todo: this
        var next_x = this.halfwidth + (Math.cos(r) * this.halfwidth * 0.9);
        var next_y = this.halfwidth + (Math.sin(r) * this.halfwidth * 0.9);

        var curr_bubble = new ui.ImageView({
            superview: this,
            image: img_bubbles[0],
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
        // get_quads_from_circle(this.quadtree, [next_x, next_y], 0, this.quadtree.pos, this.bubble_radius, quadlist);

        // for (var i = 0; i < quadlist.length; i++) {
        //     for (var k = 0; k < quadlist[i].list_ents.length; k++) {
        //         quadlist[i].list_ents[k].style.opacity = 0;
        //     }
        // }
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

            el.elapsed += dt/2;
            if (el.elapsed > 1) {
                el.elapsed = 1;
            }
            var v = el.elapsed;
            el.style.x = (this.halfwidth * v) + (el.style.x * (1 - v));
            el.style.y = (this.halfwidth * v) + (el.style.y * (1 - v));

            if (el.elapsed < 1) {
                var quadlist = [];
                get_quads_from_circle(this.quadtree, [el.style.x, el.style.y], 0, this.quadtree.pos, this.bubble_radius, quadlist);
                if  (quadlist.length > 0) {

                } else {
                    remaining_bubbles.push(this.active_bubbles[i]);
                }
                var deepest_overlap = 0;
                for (var q = 0; q < quadlist.length; q++) {
                    for (var k = 0; k < quadlist[q].list_ents.length; k++) {
                        // quadlist[q].list_ents[k].style.opacity = 0;

                        var overlap = intersect_circle_circle(
                            el.style.x, el.style.y,
                            quadlist[q].list_ents[k].style.x,
                            quadlist[q].list_ents[k].style.y,
                            40, 40);
                        if (overlap && overlap > deepest_overlap) {
                            deepest_overlap = overlap;
                            console.log(overlap);
                        }
                    }
                }
                console.log("deepest",deepest_overlap);
                if (deepest_overlap > 0) {
                    deactivate = true;
                }
            }
            if (!deactivate) {
                remaining_bubbles.push(this.active_bubbles[i]);
            }
        }
        this.active_bubbles = remaining_bubbles;
    };
});

function get_random_inclusive(min, max)
{
    max++;
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min)) + min;
}

function calculate_hexmap (diameter, reach, midpointx, midpointy, cutoff) {

    // flat hexagon grid

    // size = hexagon edge length
    // reach = amount of tiles extending from center
    // midpointx = middle of map x
    // midpointy = middle of map y
    // cutoff = center hexes that will be removed

    // d = corner to corner (x)
    // d2 = edge to edge (y)
    var size = diameter * 0.5;
    var d = 2 * size;
    var d2 = Math.sqrt(3) * size;

    var evenodd_x = false;
    var offset_x = -d;

    function distance_from_origin (x,y) {
        return Math.sqrt((x*x)+(y*y));
    }

    for (var y = -reach; y <= reach; y++) {
        if (evenodd_x) {
            offset_x = -d * 0.5;
        } else {
            offset_x = 0;
        }
        for (var x = -reach; x <= reach; x++) {

            // remove center and round corners of square grid
            // so that it is a hexagonal grid in a circle
            var cx = (x * d) - offset_x;
            var cy = (y * d2);

            var dist = distance_from_origin(cx,cy);

            if (dist+size > cutoff * diameter && dist+size < reach * diameter)
            {
                pts.push([midpointx + cx, midpointy + cy]);
            }
        }
        evenodd_x = !evenodd_x;
    }
}

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

    return (corner_dist <= (cr*cr));
}

function intersect_circle_circle (ax, ay, bx, by, ar, br) {
    var overlap = 0;
    var x = bx - ax;
    var y = by - ay;
    x *= x;
    y *= y;
    var dist = Math.sqrt(x + y);
    var r = (ar + br);
    if (dist - r <= 0) {
        overlap = r - dist;
    }
    return overlap;
}
/* ---------------------------------------------------
    QUAD TREES
*/
var MAX_ENTITIES = 10;
var MAX_LEVELS = 15;

function QuadTree ( m1, m2, m3, m4, m5) {
    return {
        list_ents: [],          // entities inside
        level: m1,              // int
        has_children: m2,       // bool
        width: m3,              // float
        pos: [m4,m5],           // vector pos
        quads: [null,null,null,null], // child quads
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

    if (found_quad == 0) {
        quads = tree.quads;
    }
    else {
        quads = found_quad.quads;
    }

    var i = 0;
    for (var i = 0; i < 4; i++) {
        if (minkowski_circle_square(pos[0], pos[1], radius, quads[i].pos[0], quads[i].pos[1], quads[i].width)) {
            if (quads[i].has_children) {
                return get_quads_from_circle(tree, pos, quads[i], quads[i].pos, radius, quadlist);
            } else {
                quadlist.push(quads[i]);
            }
        }
    }
}