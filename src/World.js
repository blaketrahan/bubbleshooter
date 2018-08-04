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

        var circle = new ui.ImageView({
            superview: this,
            image: img_circle,
            x: 0,
            y: 0,
            width: this.style.width,
            height: this.style.height,
        });

        this.bubbles = [];

        var bw = img_bubbles[0].getWidth();
        var bh = img_bubbles[0].getHeight();

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

        init_quads(this.halfwidth * 2, this.halfwidth, this.halfwidth);
        // console.log(toptree);

        // todo: add bubbles to quads
    };

    this.shoot = function (color) {
        var r = -this.style.r + 1.57079632679; // todo: this
        var next_x = this.halfwidth + (Math.cos(r) * this.halfwidth);
        var next_y = this.halfwidth + (Math.sin(r) * this.halfwidth);

        this.bubble.style.x = next_x;
        this.bubble.style.y = next_y;
        console.log("gotcha boss");
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
    QUAD TREES

    Keep orbs in quad trees:
    1. when shooting orb into grid, check quads for collision
    2. check collided orb for cluster
    3. if cluster is found, check each orb touching cluster for orphaned orbs
    4. remove cluster and orphaned orbs

    notes:
        quads are created as needed, but disabled and reused instead of deleted.
*/
var MAX_ENTITIES = 10;
var MAX_LEVELS = 4;
var toptree;

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
    toptree = QuadTree(0, true, quad_size, midpointx, midpointy);
    quad_size *= 0.5; // halve it for children

    for (var i = 0; i < 4; i++) {
        toptree.quads[i] = QuadTree(1, false, quad_size, midpointx, midpointy);
    }
    toptree.quads[0].pos = [ -quad_size/2,  quad_size/2 ];
    toptree.quads[1].pos = [  quad_size/2,  quad_size/2 ];
    toptree.quads[2].pos = [  quad_size/2, -quad_size/2 ];
    toptree.quads[3].pos = [ -quad_size/2, -quad_size/2 ];
}

function clear_quads (tree) {
    for (var i = 0; i < 4; i++) {
        tree.quads[i].list_ents.length = 0;
        tree.quads[i].has_children = false;
    }
}

function add_to_quad (tree, quad, entity) {
    quad.list_ents.push(entity); // todo: make sure this is a reference
    if (quad.list_ents.length > MAX_ENTITIES && quad.level < MAX_LEVELS)
    {
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
        find_and_add_to_quad(tree, entity, pos, found_quad, found_quad.pos);
    }
    else {
        add_to_quad(tree, found_quad, entity);
    }
}

function split_quad (tree, quad) {
    quad.has_children = true;
    var level = quad.level+1;
    var width = quad.width * 0.5;

    for (var i = 0; i < 4; i++) {
        quad.quads[i] = QuadTree(level, false, width, quad.pos[0], quad.pos[1]);
    }

    quad.quads[0].pos[0] = quad.pos[0] + [ -half_width ];
    quad.quads[1].pos[0] = quad.pos[0] + [  half_width ];
    quad.quads[2].pos[0] = quad.pos[0] + [  half_width ];
    quad.quads[3].pos[0] = quad.pos[0] + [ -half_width ];

    quad.quads[0].pos[1] = quad.pos[1] + [  half_width ];
    quad.quads[1].pos[1] = quad.pos[1] + [  half_width ];
    quad.quads[2].pos[1] = quad.pos[1] + [ -half_width ];
    quad.quads[3].pos[1] = quad.pos[1] + [ -half_width ];

    for (var i = 0; i < quad.list_ents.length; i++)
    {
        find_and_add_to_quad(tree, quad.list_ents[i], quad.list_ents[i].pos, quad, quad.pos, 0, [0,0]);
    }
}

// QuadTree::Quad* get_quad_from_pos(QuadTree* tree, vec2 pos, QuadTree::Quad* found_quad = 0, vec2 quad_pos = vec2(0,0))
// {
//     QuadTree::Quad* quads;

//     if (found_quad == 0) {
//         quads = tree->quads;
//     } else {
//         quads = found_quad->quads;
//     }

//     if (pos.x <= quad_pos.x && pos.y >= quad_pos.y)
//         found_quad = &quads[0];
//     else if (pos.x >= quad_pos.x && pos.y >= quad_pos.y)
//         found_quad = &quads[1];
//     else if (pos.x >= quad_pos.x && pos.y <= quad_pos.y)
//         found_quad = &quads[2];
//     else if (pos.x <= quad_pos.x && pos.y <= quad_pos.y)
//         found_quad = &quads[3];

//     if (found_quad->has_children)
//     {
//         get_quad_from_pos(tree,pos,found_quad, found_quad->pos);
//     }
//     else
//     {
//         return found_quad;
//     }
// }

// blist* get_list_from_quad(QuadTree* tree, vec2 pos)
// {
//     QuadTree::Quad* fq = get_quad_from_pos(tree,pos);
//     return &fq->list_ents;
// }