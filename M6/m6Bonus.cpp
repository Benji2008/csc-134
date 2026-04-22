#include <iostream>
#include <fstream>
#include <cmath>
#include <cstdlib>
#include <ctime>
#include <string>
#include <vector>
#include <functional>

// ── helpers ──────────────────────────────────────────────────────────────────

struct RGB { int r, g, b; };

static unsigned seed_val = 0;
int rng(int lo, int hi) {
    seed_val = seed_val * 1664525u + 1013904223u;
    return lo + (int)((seed_val >> 16) % (unsigned)(hi - lo + 1));
}
double rngf(double lo, double hi) {
    seed_val = seed_val * 1664525u + 1013904223u;
    double t = (double)(seed_val >> 16) / 65536.0;
    return lo + t * (hi - lo);
}

int clamp(int v, int lo = 0, int hi = 255) {
    return v < lo ? lo : (v > hi ? hi : v);
}

// ── canvas ───────────────────────────────────────────────────────────────────

const int W = 400, H = 400;
RGB canvas[H][W];

void fill(RGB c) {
    for (int y = 0; y < H; y++)
        for (int x = 0; x < W; x++)
            canvas[y][x] = c;
}

void setpx(int x, int y, RGB c) {
    if (x >= 0 && x < W && y >= 0 && y < H)
        canvas[y][x] = c;
}

RGB getpx(int x, int y) {
    if (x < 0 || x >= W || y < 0 || y >= H) return {0,0,0};
    return canvas[y][x];
}

// Blend src onto dst with alpha 0..255
void blend(int x, int y, RGB c, int alpha) {
    if (x < 0 || x >= W || y < 0 || y >= H) return;
    RGB &d = canvas[y][x];
    d.r = clamp((c.r * alpha + d.r * (255 - alpha)) / 255);
    d.g = clamp((c.g * alpha + d.g * (255 - alpha)) / 255);
    d.b = clamp((c.b * alpha + d.b * (255 - alpha)) / 255);
}

// ── drawing primitives ───────────────────────────────────────────────────────

void hline(int x0, int x1, int y, RGB c) {
    if (y < 0 || y >= H) return;
    for (int x = x0; x <= x1; x++) setpx(x, y, c);
}

void rect_filled(int x0, int y0, int x1, int y1, RGB c) {
    for (int y = y0; y <= y1; y++) hline(x0, x1, y, c);
}

void circle_filled(int cx, int cy, int r, RGB c) {
    for (int dy = -r; dy <= r; dy++)
        for (int dx = -r; dx <= r; dx++)
            if (dx*dx + dy*dy <= r*r) setpx(cx+dx, cy+dy, c);
}

void ellipse_filled(int cx, int cy, int rx, int ry, RGB c) {
    for (int dy = -ry; dy <= ry; dy++)
        for (int dx = -rx; dx <= rx; dx++) {
            double nx = (double)dx / rx, ny = (double)dy / ry;
            if (nx*nx + ny*ny <= 1.0) setpx(cx+dx, cy+dy, c);
        }
}

void circle_aa(int cx, int cy, int r, RGB c, int alpha = 200) {
    for (int dy = -r-1; dy <= r+1; dy++)
        for (int dx = -r-1; dx <= r+1; dx++) {
            double d = std::sqrt((double)(dx*dx + dy*dy));
            double a = clamp((int)((r + 0.5 - d) * 255), 0, 255);
            blend(cx+dx, cy+dy, c, (int)(a * alpha / 255));
        }
}

// Bresenham line
void line(int x0, int y0, int x1, int y1, RGB c, int thick = 1) {
    int dx = std::abs(x1-x0), dy = std::abs(y1-y0);
    int sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    int err = dx - dy;
    while (true) {
        for (int tx = -thick/2; tx <= thick/2; tx++)
            for (int ty = -thick/2; ty <= thick/2; ty++)
                setpx(x0+tx, y0+ty, c);
        if (x0 == x1 && y0 == y1) break;
        int e2 = 2*err;
        if (e2 > -dy) { err -= dy; x0 += sx; }
        if (e2 <  dx) { err += dx; y0 += sy; }
    }
}

// Triangle filled (simple scan-line)
void triangle(int x0, int y0, int x1, int y1, int x2, int y2, RGB c) {
    // sort by y
    if (y0 > y1) { std::swap(x0,x1); std::swap(y0,y1); }
    if (y0 > y2) { std::swap(x0,x2); std::swap(y0,y2); }
    if (y1 > y2) { std::swap(x1,x2); std::swap(y1,y2); }
    auto edge = [](int xa,int ya,int xb,int yb,int y)->double{
        if (yb==ya) return xa;
        return xa + (double)(y-ya)*(xb-xa)/(yb-ya);
    };
    for (int y = y0; y <= y2; y++) {
        double xl = (y < y1) ? edge(x0,y0,x1,y1,y) : edge(x1,y1,x2,y2,y);
        double xr = edge(x0,y0,x2,y2,y);
        if (xl > xr) std::swap(xl, xr);
        hline((int)xl, (int)xr, y, c);
    }
}

// ── colour palettes ──────────────────────────────────────────────────────────

struct Palette {
    RGB sky, ground, wall, roof, door, window, grass,
        skin, hair, shirt, pants, sun, cloud, flower;
};

Palette daytimePalette() {
    return {
        {135,206,235}, {101,67,33},   {210,180,140}, {139,69,19},
        {101,67,33},   {173,216,230}, {124,252,0},
        {255,222,173}, {101,67,33},   {255,100,100}, {70,130,180},
        {255,255,100}, {255,255,255}, {255,100,150}
    };
}

Palette sunsetPalette() {
    Palette p = daytimePalette();
    p.sky    = {255,140,0};
    p.cloud  = {255,200,150};
    p.sun    = {255,60,0};
    p.grass  = {80,120,0};
    p.ground = {80,50,20};
    return p;
}

Palette nightPalette() {
    Palette p = daytimePalette();
    p.sky    = {10,10,40};
    p.cloud  = {50,50,80};
    p.sun    = {240,240,200};   // moon
    p.grass  = {30,70,20};
    p.ground = {40,25,10};
    p.wall   = {160,130,100};
    return p;
}

// ── scene elements ───────────────────────────────────────────────────────────

void drawSky(Palette &p) {
    // Gradient sky
    for (int y = 0; y < H*2/3; y++) {
        double t = (double)y / (H*2/3);
        RGB c = {
            clamp((int)(p.sky.r * (1-t) + p.sky.r*0.7 * t)),
            clamp((int)(p.sky.g * (1-t) + p.sky.g*0.8 * t)),
            clamp((int)(p.sky.b * (1-t) + p.sky.b*0.9 * t))
        };
        hline(0, W-1, y, c);
    }
}

void drawGround(Palette &p) {
    int gh = H*2/3;
    // Grass
    for (int y = gh; y < H; y++) {
        double t = (double)(y-gh) / (H-gh);
        RGB c = {
            clamp((int)(p.grass.r * (1-t) + p.ground.r * t)),
            clamp((int)(p.grass.g * (1-t) + p.ground.g * t)),
            clamp((int)(p.grass.b * (1-t) + p.ground.b * t))
        };
        hline(0, W-1, y, c);
    }
    // Grass tufts
    for (int i = 0; i < 60; i++) {
        int gx = rng(0, W-1), gy = rng(gh, gh+20);
        int h2 = rng(5,15);
        for (int j = 0; j < 3; j++) {
            int ox = rng(-3,3);
            line(gx+ox, gy, gx+ox+rng(-2,2), gy-h2,
                 {clamp(p.grass.r+rng(-20,30)),
                  clamp(p.grass.g+rng(-10,30)),
                  clamp(p.grass.b+rng(-10,10))}, 1);
        }
    }
}

void drawSun(Palette &p, int cx, int cy) {
    int r = rng(18, 30);
    circle_filled(cx, cy, r, p.sun);
    // Rays
    for (int i = 0; i < 8; i++) {
        double a = i * M_PI / 4.0;
        int x1 = cx + (int)((r+6) * std::cos(a));
        int y1 = cy + (int)((r+6) * std::sin(a));
        int x2 = cx + (int)((r+14) * std::cos(a));
        int y2 = cy + (int)((r+14) * std::sin(a));
        line(x1, y1, x2, y2, p.sun, 2);
    }
}

void drawCloud(Palette &p, int cx, int cy) {
    int alpha = (p.sky.r < 30) ? 160 : 230;   // dimmer at night
    for (int i = -1; i <= 1; i++) {
        circle_aa(cx + i*22, cy + (i==0 ? -8 : 0), 20 + (i==0)*8, p.cloud, alpha);
    }
}

void drawTree(int bx, int by, Palette &p) {
    // Trunk
    int th = rng(30, 60), tw = rng(6,10);
    RGB trunk = {clamp(p.ground.r+40), clamp(p.ground.g+20), clamp(p.ground.b)};
    rect_filled(bx-tw/2, by-th, bx+tw/2, by, trunk);
    // Canopy (layered circles)
    RGB leaf1 = {clamp(p.grass.r-20), clamp(p.grass.g+20), clamp(p.grass.b-10)};
    RGB leaf2 = {clamp(p.grass.r+10), clamp(p.grass.g+40), clamp(p.grass.b)};
    int cr = rng(20,35);
    circle_filled(bx, by-th, cr, leaf2);
    circle_filled(bx-cr/2, by-th+cr/3, cr-5, leaf1);
    circle_filled(bx+cr/2, by-th+cr/3, cr-5, leaf1);
}

void drawHouse(int bx, int by, int bw, int bh, Palette &p) {
    // Walls
    RGB wall = {clamp(p.wall.r+rng(-20,20)),
                clamp(p.wall.g+rng(-20,20)),
                clamp(p.wall.b+rng(-20,20))};
    rect_filled(bx, by, bx+bw, by+bh, wall);

    // Roof (triangle)
    RGB roof = {clamp(p.roof.r+rng(-20,20)),
                clamp(p.roof.g+rng(-10,10)),
                clamp(p.roof.b+rng(-10,10))};
    triangle(bx-10, by, bx+bw+10, by, bx+bw/2, by-bh/2, roof);

    // Door
    int dw = bw/5, dh = bh*2/5;
    int dx = bx + bw/2 - dw/2;
    rect_filled(dx, by+bh-dh, dx+dw, by+bh, p.door);
    // Door knob
    circle_filled(dx+dw-4, by+bh-dh/2, 2, {255,215,0});

    // Windows
    int ww = bw/6, wh = bh/5;
    // left window
    int lwx = bx + bw/6, lwy = by + bh/4;
    rect_filled(lwx, lwy, lwx+ww, lwy+wh, p.window);
    line(lwx+ww/2, lwy, lwx+ww/2, lwy+wh, {100,100,150}, 1);
    line(lwx, lwy+wh/2, lwx+ww, lwy+wh/2, {100,100,150}, 1);
    // right window
    int rwx = bx + bw - bw/6 - ww, rwy = lwy;
    rect_filled(rwx, rwy, rwx+ww, rwy+wh, p.window);
    line(rwx+ww/2, rwy, rwx+ww/2, rwy+wh, {100,100,150}, 1);
    line(rwx, rwy+wh/2, rwx+ww, rwy+wh/2, {100,100,150}, 1);

    // Chimney
    int chw = bw/10, chh = bh/4;
    int chx = bx + bw*3/4 - chw/2;
    int chy = by - bh/2 + chh/2;
    rect_filled(chx, chy, chx+chw, by, roof);
}

void drawPerson(int fx, int fy, Palette &p) {
    // fx,fy = feet position
    int legH = rng(25,40), bodyH = rng(20,30), headR = rng(8,13);
    RGB skin  = {clamp(p.skin.r+rng(-20,20)), clamp(p.skin.g+rng(-15,15)), clamp(p.skin.b+rng(-15,15))};
    RGB shirt = {rng(30,230), rng(30,230), rng(30,230)};
    RGB pants = {rng(20,100), rng(20,100), rng(100,200)};
    RGB hair  = {clamp(p.hair.r+rng(-30,30)), clamp(p.hair.g+rng(-20,20)), clamp(p.hair.b+rng(-20,20))};

    // Legs
    int lw = rng(4,7);
    rect_filled(fx-lw, fy-legH, fx,      fy, pants);
    rect_filled(fx+1,  fy-legH, fx+1+lw, fy, pants);
    // Body
    int bw = (int)(lw*2.2);
    rect_filled(fx-bw, fy-legH-bodyH, fx+bw, fy-legH, shirt);
    // Arms
    int armLen = (int)(bodyH*0.9);
    line(fx-bw, fy-legH-bodyH+4, fx-bw-rng(6,12), fy-legH-bodyH+4+armLen, shirt, 3);
    line(fx+bw, fy-legH-bodyH+4, fx+bw+rng(6,12), fy-legH-bodyH+4+armLen, shirt, 3);
    // Head
    int headY = fy-legH-bodyH-headR;
    circle_filled(fx, headY, headR, skin);
    // Hair
    circle_filled(fx, headY-headR/3, (int)(headR*0.85), hair);
    // Eyes
    setpx(fx-headR/3, headY-1, {30,30,30});
    setpx(fx+headR/3, headY-1, {30,30,30});
    // Smile
    for (int i = -2; i <= 2; i++)
        setpx(fx+i, headY+headR/3+1, {180,80,60});
}

void drawDog(int fx, int fy, Palette &p) {
    // fx,fy = rear feet
    RGB fur = {clamp(rng(100,200)), clamp(rng(60,140)), clamp(rng(20,80))};
    RGB dark = {clamp(fur.r-40), clamp(fur.g-30), clamp(fur.b-20)};
    RGB pink = {255,180,180};

    // Body
    int bw = rng(30,45), bh = rng(15,22);
    ellipse_filled(fx+bw/2, fy-bh/2, bw/2, bh/2, fur);

    // Legs (4)
    for (int i = 0; i < 4; i++) {
        int lx = fx + i*(bw/3);
        rect_filled(lx, fy-bh/4, lx+5, fy, dark);
    }

    // Head
    int hx = fx+bw+5, hy = fy-bh;
    circle_filled(hx, hy, bh/2+3, fur);

    // Ears (floppy)
    triangle(hx-5, hy-bh/2+2, hx+3, hy-bh/2+2, hx-8, hy+2, dark);

    // Snout
    ellipse_filled(hx+bh/2+2, hy+2, bh/4, bh/5, {fur.r+30<255?fur.r+30:255, fur.g, fur.b});
    // Nose
    circle_filled(hx+bh/2+bh/4+1, hy, 3, {30,20,20});
    // Eye
    circle_filled(hx+3, hy-3, 2, {30,20,20});

    // Tail (curve via short lines)
    int tx = fx, ty = fy-bh+2;
    for (int i = 0; i < 6; i++) {
        int nx = tx - 4 - i*2;
        int ny = ty - i*4;
        line(tx, ty, nx, ny, fur, 3);
        tx = nx; ty = ny;
    }

    // Tongue (panting)
    if (rng(0,1)) {
        ellipse_filled(hx+bh/2+2, hy+bh/4+3, 4, 5, pink);
    }
}

void drawCat(int fx, int fy, Palette &p) {
    RGB fur  = {clamp(rng(80,220)), clamp(rng(60,180)), clamp(rng(40,160))};
    RGB dark = {clamp(fur.r-50), clamp(fur.g-40), clamp(fur.b-30)};
    RGB eye  = {rng(0,80), rng(140,220), rng(0,80)};

    int bw = rng(18,28), bh = rng(12,18);
    // Body
    ellipse_filled(fx, fy-bh/2, bw, bh/2, fur);
    // Tail (arcing up)
    for (int i = 0; i < 8; i++) {
        int tx = fx-bw + i*4;
        int ty = fy - (int)(bh * std::sin(i * 0.35));
        circle_filled(tx, ty, 3, fur);
    }
    // Legs
    for (int i = -1; i <= 1; i+=2) {
        rect_filled(fx+i*bw/2-2, fy-bh/4, fx+i*bw/2+2, fy, dark);
    }
    // Head
    int hx = fx+bw+2, hy = fy-bh;
    circle_filled(hx, hy, bh/2+2, fur);
    // Ears (pointy)
    triangle(hx-4, hy-bh/2+1, hx+1, hy-bh/2+1, hx-2, hy-bh-6, fur);
    triangle(hx+2, hy-bh/2+1, hx+7, hy-bh/2+1, hx+5, hy-bh-6, fur);
    // Eyes
    ellipse_filled(hx-3, hy-1, 3, 2, eye);
    ellipse_filled(hx+5, hy-1, 3, 2, eye);
    // Pupils (vertical slit)
    line(hx-3, hy-3, hx-3, hy+1, {10,10,10}, 1);
    line(hx+5, hy-3, hx+5, hy+1, {10,10,10}, 1);
    // Whiskers
    line(hx+bh/2, hy+1, hx+bh+10, hy-2, dark, 1);
    line(hx+bh/2, hy+3, hx+bh+10, hy+4, dark, 1);
    line(hx+bh/2, hy+1, hx-5,     hy-2, dark, 1);
    line(hx+bh/2, hy+3, hx-5,     hy+4, dark, 1);
}

void drawBird(int cx, int cy, Palette &p) {
    // Simple flying bird silhouette
    RGB wing = {rng(40,120), rng(40,100), rng(60,140)};
    int size = rng(6,14);
    // Body
    ellipse_filled(cx, cy, size, size/2, wing);
    // Wings
    triangle(cx-size, cy, cx-size*3, cy-size/2, cx-size/2, cy-size/2, wing);
    triangle(cx+size, cy, cx+size*3, cy-size/2, cx+size/2, cy-size/2, wing);
    // Beak
    triangle(cx+size, cy, cx+size+6, cy+2, cx+size, cy+4, {255,180,0});
    // Eye
    circle_filled(cx+size/2, cy-1, 2, {20,20,20});
}

void drawFlower(int fx, int fy, Palette &p) {
    RGB petal = {rng(150,255), rng(0,100), rng(100,255)};
    RGB center = {255, 220, 0};
    int pr = rng(4,8), cr = rng(4,7);
    for (int i = 0; i < 6; i++) {
        double a = i * M_PI / 3.0;
        circle_filled(fx + (int)((pr+cr)*std::cos(a)),
                      fy + (int)((pr+cr)*std::sin(a)), pr, petal);
    }
    circle_filled(fx, fy, cr, center);
    // Stem
    line(fx, fy+cr, fx+rng(-3,3), fy+cr+rng(12,20), {0,120,0}, 2);
}

void drawStars(int count) {
    for (int i = 0; i < count; i++) {
        int x = rng(0, W-1), y = rng(0, H*2/3-1);
        int b = rng(180, 255);
        setpx(x, y, {b,b,clamp(b+rng(-20,20))});
        if (rng(0,4)==0) {   // bright star with cross
            setpx(x-1,y,{b,b,b}); setpx(x+1,y,{b,b,b});
            setpx(x,y-1,{b,b,b}); setpx(x,y+1,{b,b,b});
        }
    }
}

// ── scene composers ──────────────────────────────────────────────────────────

void sceneHouse() {
    Palette p = (rng(0,2)==0) ? sunsetPalette() : daytimePalette();
    fill({p.sky.r, p.sky.g, p.sky.b});
    drawSky(p);
    drawGround(p);

    // Sun / moon
    drawSun(p, rng(30,W-30), rng(20,H/4));

    // Clouds
    int nclouds = rng(2,5);
    for (int i = 0; i < nclouds; i++)
        drawCloud(p, rng(30,W-30), rng(10,H/4));

    // Trees
    int ntrees = rng(1,3);
    for (int i = 0; i < ntrees; i++) {
        int tx = rng(10, W-10);
        drawTree(tx, H*2/3, p);
    }

    // House
    int bw = rng(100,160), bh = rng(80,120);
    int bx = W/2 - bw/2, by = H*2/3 - bh;
    drawHouse(bx, by, bw, bh, p);

    // People
    int np = rng(0, 3);
    for (int i = 0; i < np; i++) {
        int px = rng(30, W-30);
        drawPerson(px, H*2/3, p);
    }

    // Flowers
    int nf = rng(3,10);
    for (int i = 0; i < nf; i++)
        drawFlower(rng(10,W-10), H*2/3 + rng(5,25), p);

    // Birds
    for (int i = 0; i < rng(0,4); i++)
        drawBird(rng(20,W-20), rng(10,H/3), p);
}

void scenePeople() {
    Palette p = daytimePalette();
    drawSky(p);
    drawGround(p);
    drawSun(p, rng(30,80), rng(20,60));
    for (int i = 0; i < rng(1,3); i++)
        drawCloud(p, rng(50,W-50), rng(10,H/4));
    for (int i = 0; i < rng(0,3); i++) {
        int tx = rng(10, W-10);
        drawTree(tx, H*2/3, p);
    }
    int np = rng(2,6);
    for (int i = 0; i < np; i++) {
        int px = W/(np+1) * (i+1) + rng(-20,20);
        drawPerson(px, H*2/3, p);
    }
    int nf = rng(4,12);
    for (int i = 0; i < nf; i++)
        drawFlower(rng(5,W-5), H*2/3 + rng(5,20), p);
}

void sceneDogs() {
    Palette p = daytimePalette();
    drawSky(p);
    drawGround(p);
    drawSun(p, rng(W-80,W-20), rng(10,50));
    for (int i = 0; i < rng(1,3); i++)
        drawCloud(p, rng(30,W-30), rng(10,H/4));
    for (int i = 0; i < rng(0,2); i++)
        drawTree(rng(10,W-10), H*2/3, p);
    int nd = rng(1,4);
    for (int i = 0; i < nd; i++) {
        int dx = rng(30, W-60);
        drawDog(dx, H*2/3, p);
    }
    // Maybe a person too
    if (rng(0,1)) drawPerson(rng(30,W-30), H*2/3, p);
}

void sceneCats() {
    Palette p = (rng(0,1)) ? nightPalette() : daytimePalette();
    fill({p.sky.r, p.sky.g, p.sky.b});
    drawSky(p);
    if (p.sky.r < 30) drawStars(120);
    drawGround(p);
    drawSun(p, rng(W/2-20,W/2+20), rng(10,40));
    int nc = rng(1,4);
    for (int i = 0; i < nc; i++) {
        int cx = rng(20,W-50);
        drawCat(cx, H*2/3, p);
    }
    for (int i = 0; i < rng(2,6); i++)
        drawFlower(rng(10,W-10), H*2/3 + rng(5,20), p);
}

void sceneMixed() {
    Palette p = daytimePalette();
    drawSky(p);
    drawGround(p);
    drawSun(p, rng(20,W-20), rng(10,60));
    for (int i = 0; i < rng(1,3); i++)
        drawCloud(p, rng(30,W-30), rng(10,H/4));
    // House in background
    int bw=90, bh=70;
    drawHouse(W/2-bw/2, H*2/3-bh, bw, bh, p);
    // Trees
    for (int i = 0; i < rng(1,3); i++)
        drawTree(rng(10,50), H*2/3, p);
    for (int i = 0; i < rng(1,3); i++)
        drawTree(rng(W-50,W-10), H*2/3, p);
    // Animals and people
    if (rng(0,1)) drawDog(rng(30,W/2-40), H*2/3, p);
    if (rng(0,1)) drawCat(rng(W/2+10,W-60), H*2/3, p);
    int np = rng(1,3);
    for (int i = 0; i < np; i++)
        drawPerson(rng(40,W-40), H*2/3, p);
    for (int i = 0; i < rng(3,8); i++)
        drawFlower(rng(5,W-5), H*2/3 + rng(5,25), p);
    for (int i = 0; i < rng(0,4); i++)
        drawBird(rng(20,W-20), rng(10,H/3), p);
}

// ── main ─────────────────────────────────────────────────────────────────────

int main(int argc, char* argv[]) {
    unsigned s = (unsigned)std::time(nullptr);
    if (argc > 1) s = (unsigned)std::atoi(argv[1]);
    seed_val = s;
    std::cout << "Seed: " << s << "\n";

    // Pick a scene randomly
    int scene = rng(0, 4);
    const char* names[] = {"house","people","dogs","cats","mixed"};
    std::cout << "Scene: " << names[scene] << "\n";

    fill({0,0,0});
    switch (scene) {
        case 0: sceneHouse();  break;
        case 1: scenePeople(); break;
        case 2: sceneDogs();   break;
        case 3: sceneCats();   break;
        default: sceneMixed(); break;
    }

    // Build output filename
    std::string fname = std::string("scene_") + names[scene] + "_" + std::to_string(s) + ".ppm";

    std::ofstream f(fname);
    if (!f) { std::cerr << "Cannot open " << fname << "\n"; return 1; }
    f << "P3\n" << W << " " << H << "\n255\n";
    for (int y = 0; y < H; y++) {
        for (int x = 0; x < W; x++) {
            f << canvas[y][x].r << " " << canvas[y][x].g << " " << canvas[y][x].b;
            if (x < W-1) f << "  ";
        }
        f << "\n";
    }
    f.close();
    std::cout << "Saved: " << fname << "\n";
    return 0;
}