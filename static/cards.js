var PI = Math.PI;

function sign(x) {
    if (x < 0) return -1;
    if (x > 0) return 1;
    return 0;
}

function constrain(x, a, b) {
    if (a > b) {
        var temp = a;
        a = b;
        b = a;
    }
    return Math.max(a, Math.min(x, b));
}

class Ctx {
    constructor(ctx) {
        this.raw_ctx = ctx;
    }

    wipe() {
        this.raw_ctx.clearRect(-10, -10, $(document).width() + 20, $(document).height() + 20);
    }

    ellipse(x, y, w, h) {
        this.raw_ctx.beginPath();
        h = h || w
        this.raw_ctx.ellipse(x, y, w, h, 0, 0, 2 * Math.PI);
        this.raw_ctx.fill();
    }

    black() {
        this.raw_ctx.fillStyle = "black";
    }

    fill(col) {
        this.raw_ctx.fillStyle = col;
    }

    stroke(col) {
        this.raw_ctx.strokeStyle = col;
    }

    spot(x, y) {
        this.ellipse(x, y, 5, 5);
    }

    text(str, x, y) {
        this.raw_ctx.fillText(str, x, y);
    }

    save() {
        this.raw_ctx.save();
    }

    restore() {
        this.raw_ctx.restore();
    }

    rect(x, y, w, h) {
        this.raw_ctx.fillRect(x, y, w, h);
    }

    strokeRect(x, y, w, h) {
        this.raw_ctx.strokeRect(x, y, w, h);
    }

    translate(x, y) {
        this.raw_ctx.translate(x, y);
    }

    rotate(q) {
        this.raw_ctx.rotate(q);
    }

    drawImage(img, x, y, w, h) {
        this.raw_ctx.drawImage(img, x, y, w, h);
    }

    textWidth(text) {
        return this.raw_ctx.measureText(text).width;
    }

    centerText(text, x, y) {
        var width = this.textWidth(text);
        this.text(text, x - width / 2, y);
    }

    font(fontFace, fontSize) {
        this.raw_ctx.font = fontSize + 'px ' + fontFace;
    }
}

class CardTable {
    constructor() {
        this.canvas = createCanvas(this);
        this.ctx = new Ctx(this.canvas.getContext("2d"));

        $("body").prepend(this.canvas);

        this.card_piles = [];
        this.fps = 0;
    }

    beginLoop() {
        this.lastFrame = Date.now();
        this.loop();
    }

    loop() {
        this.canvasW = document.body.clientWidth;
        this.canvasH = document.body.clientHeight;
        this.canvas.width = this.canvasW;
        this.canvas.height = this.canvasH;

        var thisFrame = Date.now();
        var elapsed = thisFrame - this.lastFrame;

        window.requestAnimationFrame(() => {
            this.loop()
        });

        this.update(elapsed);
        this.draw();

        this.lastFrame = thisFrame;
    }

    resize(w, h) {
        this.card_piles.map((card_pile) => card_pile._resize(w, h));
    }

    update(elapsed) {
        this.resize(this.canvas.width, this.canvas.height);

        this.fps = Math.floor(0.8 * this.fps + 0.2 * 1000 / elapsed);
        var hovered = false;
        var index = -1;
        for (var i = 0; i < this.card_piles.length; i++) {
            if (this.card_piles[i].hovered) {
                hovered = true;
                index = i;
                break;
            }
        }
        if (!hovered) {
            this.card_piles.map((card_pile) => {
                card_pile.hovered = false;
                card_pile.locked = false;
            });
        } else {
            for (var i = 0; i < this.card_piles.length; i++) {
                this.card_piles[i].locked = false;
                if (i !== index) {
                    this.card_piles[i].hovered = false;
                    this.card_piles[i].locked = true;
                }
            }
        }
        var temp_lock = false;
        for (var card_pile of this.card_piles) {
            if (temp_lock) {
                card_pile.locked = true;
            }
            card_pile.update(elapsed);
            temp_lock = temp_lock || card_pile.hovered;
        }
    }

    draw() {
        this.ctx.wipe();
        this.ctx.black();


        this.card_piles.map((card_pile) => {
            if (!card_pile.hovered) card_pile.draw(this.ctx);
        });

        this.card_piles.map((card_pile) => {
            if (card_pile.hovered) card_pile.draw(this.ctx);
        });
    }

    addCardPile(cardPile) {
        cardPile.parent = this;
        this.card_piles.push(cardPile);
    }

    mousePressed() {
        this.card_piles.map((card_pile) => {
            if (card_pile.hovered) card_pile.mousePressed();
        });
    }
}

class Card {
    constructor() {
        this.size = {
            width: 0,
            height: 0,
        };
        this.targetSize = {
            width: 0,
            height: 0,
        };
        this.anchor = 'bottom';

        this.transform = new Transform();
        this.target = new Transform();
        this.hovered = false;

        this.parent = null;

        this.onClick = null;
    }

    get left() {
        var anch = this.adjustAnchor();
        return {
            x: this.transform.position.x + anch.x,
            y: this.transform.position.y + anch.y + this.size.height / 2
        }
    }

    get right() {
        var anch = this.adjustAnchor();
        return {
            x: this.transform.position.x + anch.x + this.size.width,
            y: this.transform.position.y + anch.y + this.size.height / 2
        }
    }

    get top() {
        var anch = this.adjustAnchor();
        return {
            x: this.transform.position.x + anch.x + this.size.width / 2,
            y: this.transform.position.y + anch.y
        }
    }

    get bottom() {
        var anch = this.adjustAnchor();
        return {
            x: this.transform.position.x + anch.x + this.size.width / 2,
            y: this.transform.position.y + anch.y + this.size.height
        }
    }

    get center() {
        var anch = this.adjustAnchor();
        return {
            x: this.transform.position.x + anch.x + this.size.width / 2,
            y: this.transform.position.y + anch.y + this.size.height / 2
        }
    }

    relative(rel) {
        switch(rel) {
            case "center":
                return this.center;
            case "top":
                return this.top;
            case "bottom":
                return this.bottom;
            case "left":
                return this.left;
            case "right":
                return this.right;
        }
    }

    mouseCollides(mouse) {
        var anch = this.adjustAnchor();
        if (this.transform.position.x < mouse.x - anch.x && mouse.x - anch.x < this.transform.position.x + this.size.width) {
            if (this.transform.position.y < mouse.y - anch.y && mouse.y - anch.y < this.transform.position.y + this.size.height) {
                return true;
            }
        }
        return false;
    }

    adjustAnchor() {
        var x, y;
        switch (this.anchor) {
            case "bottom":
                x = -this.size.width / 2;
                y = -this.size.height;
                break;
            case "center":
                x = -this.size.width / 2;
                y = -this.size.height / 2;
                break;
            case "top":
                x = -this.size.width / 2;
                y = 0;
                break;
            case "left":
                x = 0;
                y = -this.size.height / 2;
                break;
            case "right":
                x = -this.size.width;
                y = -this.size.height / 2;
                break;
        }
        return {
            x: x,
            y: y
        };
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.transform.position.x, this.transform.position.y);
        ctx.rotate(this.transform.rotation);
        var anch = this.adjustAnchor();
        this.drawCard(ctx, anch.x, anch.y, this.size.width, this.size.height);
        ctx.restore();
    }

    drawCard(ctx, x, y, w, h) {
        ctx.fill('white');
        ctx.stroke('black');
        ctx.rect(x, y, w, h);
        ctx.strokeRect(x, y, w, h);
    }

    update(elapsed) {
        this.transform.position.x = 0.15 * this.target.position.x + 0.85 * this.transform.position.x;
        this.transform.position.y = 0.15 * this.target.position.y + 0.85 * this.transform.position.y;
        this.transform.rotation = 0.15 * this.target.rotation + 0.85 * this.transform.rotation;
        //this.scale = 0.15 * this.targetScale + 0.85 * this.scale;
        this.size.width = 0.15 * this.targetSize.width + 0.85 * this.size.width;
        this.size.height = 0.15 * this.targetSize.height + 0.85 * this.size.height;
    }

    mousePressed() {
        if (this.onClick) {
            this.onClick();
        }
    }
}

class Button extends Card {
    constructor(text) {
        super();
        this.text = text;
    }

    drawCard(ctx, x, y, w, h) {
        ctx.fill(this.hovered ? '#aaa' : '#ccc');
        ctx.stroke('darkgray');
        ctx.rect(x, y, w, h);
        ctx.strokeRect(x, y, w, h);

        ctx.fill('black');
        ctx.font('Arial', 14);
        ctx.centerText(this.text, x + w/2, y + h/2);
    }
}

class BottomCard extends Card {

}

class NumberedCard extends Card {
    constructor(num) {
        super();
        this.num = num;
    }

    drawCard(ctx, x, y, w, h) {
        ctx.fill('white');
        ctx.stroke('black');
        ctx.rect(x, y, w, h);
        ctx.strokeRect(x, y, w, h);
        ctx.fill('black');
        ctx.text(this.num, x + 5, y + 15)
        ctx.ellipse(x + w / 2, y + h / 2, 10, 10);
    }
}

class PictureCard extends Card {
    constructor( image_address) {
        super();
        this.img = new Image();

        this.img.src = image_address;
    }

    drawCard(ctx, x, y, w, h) {
        ctx.drawImage(this.img, x, y, w, h);
        if (this.grayed_out) {
            ctx.fill('rgba(100, 100, 100, 0.6)');
            ctx.rect(x, y, w, h);
        }
    }
}

class BorderedPictureCard extends PictureCard {
    constructor( image_address, num) {
        super(image_address);
        this.num = num;
        this.border_active = true;
    }

    drawCard(ctx, x, y, w, h) {
        if (this.hovered && this.border_active) {
            ctx.fill('black');
            ctx.rect(x - 5, y - 5, w + 10, h + 10);

            ctx.font('Arial', 13);
            var tw = Math.max(ctx.textWidth(this.num) + 15, 30);
            ctx.rect(x + w / 2 - tw/2, y - 30, tw, 31);

            ctx.fill('white');
            ctx.centerText(this.num, x + w / 2, y - 12);
        }
        super.drawCard(ctx, x, y, w, h);
    }
}

function map(x, a, b, c, d) {
    if (c === d) {
        return c;
    }
    if (a === b) {
        return (c / 2 + d / 2);
    }
    return c + (x - a) * (d - c) / (b - a);
}

class Transform {
    constructor() {
        this.position = {
            x: 0,
            y: 0
        };
        this.rotation = 0;
    }
}

const CompressedPile = {
    spread: {
        perCard: false,
        centered: true,
        x: 0,
        y: 0,
        angle: 0,
    },
    disturbance: {
        x: 0,
        y: 0,
        angle: 0,
    },
    spreadFromHovered: {
        left: 50,
        right: 120,
    },
    leftOnTop: false,
    hover: {
        spreadFromHovered: {
            left: 50,
            right: 106,
        },
        enabled: true,
        spread: {
            centered: true,
            x: 200,
            y: 0,
            angle: 0,
        },
        disturbance: {
            x: 0,
            y: 0,
            angle: 0,
        }
    },
    hoveredCard: {
        enabled: true,
        scale: 1.4,
        defaultScale: 1,
        offset: {
            x: 0,
            y: 0,
        }
    }
}

const HandPile = {
    spread: {
        centered: true,
        perCard: false,
        x: 500,
        y: 0,
        angle: 0,
    },
    disturbance: {
        x: 0,
        y: 0,
        angle: 0,
    },
    spreadFromHovered: {
        left: 20,
        right: 70,
    },
    leftOnTop: false,
    hover: {
        spreadFromHovered: {
            left: 0,
            right: 0,
        },
        enabled: false,
        spread: {
            centered: true,
            x: 200,
            y: 0,
            angle: 0,
        },
        disturbance: {
            x: 0,
            y: 0,
            angle: 0,
        }
    },
    hoveredCard: {
        enabled: true,
        defaultScale: 1,
        scale: 1.6,
        offset: {
            x: 0,
            y: 0,
        }
    }
}

const DisplayRow = {
    spread: {
        centered: true,
        perCard: true,
        x: 0,
        y: 0,
    },
    disturbance: {
        x: 0,
        y: 0,
        angle: 0,
    },
    spreadFromHovered: {
        left: 0,
        right: 0,
    },
    leftOnTop: false,
    hover: {
        enabled: false,
    },
    hoveredCard: {
        enabled: true,
        defaultScale: 1,
        scale: 2,
        offset: {
            x: 0,
            y: 0,
        }
    }
}

const SteadyHand = {
    spread: {
        centered: true,
        perCard: true,
        x: 60,
        y: 0,
        angle: 0,
    },
    disturbance: {
        x: 0,
        y: 0,
        angle: 0,
    },
    spreadFromHovered: {
        left: 0,
        right: 0,
    },
    leftOnTop: false,
    hover: {
        enabled: false,
    },
    hoveredCard: {
        enabled: true,
        defaultScale: 1,
        scale: 1.3,
        offset: {
            x: 0,
            y: 0,
        }
    }
}

function makeRect(w, h, place="top") {
    switch (place) {
        case "top":
            return new Rect(-w/2, -h, w, h);
        case "bottom":
            return new Rect(-w/2, 0, w, h);
        case "left":
            return new Rect(0, -h/2, w, h);
        case "right":
            return new Rect(-w, -h/2, w, h);
        case "center":
            return new Rect(-w/2, -h/2, w, h);
    }
}

class Rect {
    constructor(x, y, w, h) {
        this.x = x;
        this.y = y;
        this.w = w;
        this.h = h;
    }

    get left() {
        return {
            x: this.x,
            y: this.y + this.h / 2
        }
    }

    get right() {
        return {
            x: this.x + this.w,
            y: this.y + this.h / 2
        }
    }

    get top() {
        return {
            x: this.x + this.w / 2,
            y: this.y
        }
    }

    get bottom() {
        return {
            x: this.x + this.w / 2,
            y: this.y + this.h
        }
    }

    get center() {
        return {
            x: this.x + this.w/2,
            y: this.y + this.h/2
        }
    }

    relative(rel) {
        switch(rel) {
            case "center":
                return this.center;
            case "top":
                return this.top;
            case "bottom":
                return this.bottom;
            case "left":
                return this.left;
            case "right":
                return this.right;
        }
    }
}

class TextPile {
    constructor(x, y) {
        this.texts = [];
        this.transform = new Transform();
        this.transform.position.x = x;
        this.transform.position.y = y;
    }

    draw(ctx) {
        ctx.translate(this.transform.position.x, this.transform.position.y);
        this.texts.map((t) => t.draw(ctx));
    }

    empty() {
        this.texts = [];
    }

    addText(t) {
        this.texts.push(t);
    }

    update() {}

    removeText(t) {
        for (var i = 0; i < this.texts.length; i ++) {
            if (this.texts[i] === t) {
                this.texts.splice(i, 1);
                break;
            }
        }
    }

    move(pos, relative="center") {
        this.transform.position = pos;
    }

    removeNthText(n) {
        this.texts.splice(n, 1);
    }

    mousePressed() {}

    _resize(w, h) {
        this.resize(w, h);
        this.texts.map((t) => t.resize(w, h));
    }

    resize(w, h) {

    }
}

class Text {
    constructor(text, x, y, font, size, centered=true) {
        this.text = text;
        this.transform = new Transform();
        this.transform.position.x = x;
        this.transform.position.y = y;

        this.font = font;
        this.size = size;
        this.centered = centered;
    }

    resize(w, h) {

    }

    draw(ctx) {
        ctx.font(this.font, this.size);
        if (this.centered) {
            ctx.centerText(this.text, this.transform.position.x, this.transform.position.y);
        } else {
            ctx.text(this.text, this.transform.position.x, this.transform.position.y);
        }
    }
}

class CardPile {
    constructor(x, y, width, height, anchor, options, base) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;

        this.anchor = anchor;

        //this.rect = makeRect(width, height, anchor);
        this.baseCard = new BottomCard();
        this.baseCard.anchor = this.anchor;
        this.baseCard.size.width = this.width;
        this.baseCard.size.height = this.height;
        this.baseCard.targetSize.width = this.width;
        this.baseCard.targetSize.height = this.height;

        this.baseCard.drawCard = this.drawOutline;

        base = base || CompressedPile;
        options = options || {};
        this.transform = new Transform();
        this.transform.position.x = x;
        this.transform.position.y = y;
        this.options = $.extend(true, base, options);

        this.hovered = false;
        this.hovered_index = -1;
        this.locked = false;

        this.cards = [];

        this.onClick = null;

        this.parent = null;
    }

    drawOutline(ctx, x, y, w, h) {
        ctx.stroke('grey');
        ctx.strokeRect(x, y, w, h);
    }

    move(pos, relative="center") {
        this.transform.position = pos;
        if (this.baseCard) {
            var p = this.baseCard.relative(relative);
            this.transform.position.x -= p.x;
            this.transform.position.y -= p.y;
        }
    }

    get left() {
        return {
            x: this.transform.position.x + this.baseCard.left.x,
            y: this.transform.position.y + this.baseCard.left.y
        }
    }

    get right() {
        return {
            x: this.transform.position.x + this.baseCard.right.x,
            y: this.transform.position.y + this.baseCard.right.y
        }
    }

    get top() {
        return {
            x: this.transform.position.x + this.baseCard.top.x,
            y: this.transform.position.y + this.baseCard.top.y
        }
    }

    get bottom() {
        return {
            x: this.transform.position.x + this.baseCard.bottom.x,
            y: this.transform.position.y + this.baseCard.bottom.y
        }
    }

    get center() {
        return {
            x: this.transform.position.x + this.baseCard.center.x,
            y: this.transform.position.y + this.baseCard.center.y
        }
    }

    _resize(w, h) {
        this.resize(w, h);
    }

    resize(w, h) {

    }

    update(elapsed) {
        var m = {
            x: Mouse.x - this.transform.position.x,
            y: Mouse.y - this.transform.position.y
        };
        var i = 0;

        this.hovered = false;
        if (!this.locked) {

            var changed = false;
            var skip = false;
            for (var i = 0; i < this.cards.length; i++) {
                var card = this.cards[i];
                if (card.hovered && card.mouseCollides(m)) {
                    skip = true;
                    this.hovered = true;
                    this.hovered_index = i;
                }
            }

            if (!skip) {
                for (i = this.cards.length - 1; i >= 0; i--) {
                    var card = this.cards[i];
                    if (card.mouseCollides(m)) {
                        if (!card.hovered) {
                            changed = true;
                        }
                        card.hovered = true;
                        this.hovered = true;
                        this.hovered_index = i;
                        break;
                    } else {
                        if (card.hovered) {
                            changed = true;
                        }
                        card.hovered = false;
                    }
                }
                i--;
                for (; i >= 0; i--) {
                    if (this.cards[i].hovered) {
                        changed = true;
                    }
                    this.cards[i].hovered = false;
                }
            }
            this.cards.map((card) => card.update(elapsed));

            if (changed) {
                this.updateTransforms();
            }
        }
        if (this.locked) {
            this.updateTransforms();

            this.cards.map((card) => card.update(elapsed));
        }
    }

    updateTransforms() {
        var opt = (this.hovered && this.options.hover.enabled) ? this.options.hover : this.options;

        for (var i = 0; i < this.cards.length; i++) {
            var card = this.cards[i];
            if (opt.spread.perCard) {
                var spreadW = opt.spread.x * (this.cards.length-1);
                var spreadH = opt.spread.y * (this.cards.length-1);

                if (opt.spread.centered) {
                    var left = -spreadW / 2;
                    var right = spreadW / 2;
                    var top = -spreadH / 2;
                    var bottom = spreadH / 2;
                } else if (!opt.spread.fromRight) {
                    var right = spreadW;
                    var left = 0;
                    var top = spreadH;
                    var bottom = 0;
                } else {
                    var left = spreadW;
                    var right = 0;
                    var top = 0;
                    var bottom = spreadH;
                }


                card.target.position.x = map(i, 0, this.cards.length - 1,
                        (opt.leftOnTop ? -1 : 1) * left,
                        (opt.leftOnTop ? -1 : 1) * right) +
                    Math.random() * opt.disturbance.x;

                //var top = -spreadH / 2;
                //var bottom = spreadH / 2;
                card.target.position.y = map(i, 0, this.cards.length - 1,
                    top, bottom) + Math.random() * opt.disturbance.y;

                card.target.rotation = map(i, 0, this.cards.length - 1, -opt.spread.angle / 2, opt.spread.angle / 2) + Math.random() * opt.disturbance.angle;
            } else {
                card.target.position.x = map(i, 0, this.cards.length - 1,
                        (opt.leftOnTop ? -1 : 1) * -opt.spread.x / 2,
                        (opt.leftOnTop ? -1 : 1) * opt.spread.x / 2) +
                    Math.random() * opt.disturbance.x;

                card.target.position.y = map(i, 0, this.cards.length - 1, -opt.spread.y / 2, opt.spread.y / 2) +
                    Math.random() * opt.disturbance.y;

                card.target.rotation = map(i, 0, this.cards.length - 1, -opt.spread.angle / 2, opt.spread.angle / 2) + Math.random() * opt.disturbance.angle;
            }
        }

        for (var i = 0; i < this.cards.length; i++) {
            if (this.hovered) {
                if (i < this.hovered_index) {
                    this.cards[i].target.position.x -= opt.spreadFromHovered.left;
                }
                if (i > this.hovered_index) {
                    this.cards[i].target.position.x += opt.spreadFromHovered.right;
                }
            }
            if (this.cards[i].hovered && this.options.hoveredCard.enabled) {
                this.cards[i].targetSize.width = this.width * this.options.hoveredCard.scale;
                this.cards[i].targetSize.height = this.height * this.options.hoveredCard.scale;
                this.cards[i].target.position.x += this.options.hoveredCard.offset.x;
                this.cards[i].target.position.y += this.options.hoveredCard.offset.y;
            } else if (this.options.hoveredCard.enabled) {
                this.cards[i].targetSize.width = this.width * this.options.hoveredCard.defaultScale;
                this.cards[i].targetSize.height = this.height * this.options.hoveredCard.defaultScale;
            }
        }
    }

    skipAnimations() {
        this.updateTransforms();
        this.cards.map((card) => {
            card.transform.position.x = card.target.position.x;
            card.transform.position.y = card.target.position.y;
            card.transform.rotation = card.target.rotation;
            card.size.width = card.targetSize.width;
            card.size.height = card.targetSize.height;
        });
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.transform.position.x, this.transform.position.y);

        this.baseCard.draw(ctx);

        this.cards.map((card) => card.draw(ctx));

        this.cards.map((card) => {
            if (card.hovered) card.draw(ctx)
        });

        ctx.restore();
    }

    stealCard(card) {
        card.parent.removeCard(card);
        var real = {
            x: card.parent.transform.position.x + card.transform.position.x,
            y: card.parent.transform.position.y + card.transform.position.y
        }
        real.x -= this.transform.position.x;
        real.y -= this.transform.position.y;

        card.transform.position.x = real.x;
        card.transform.position.y = real.y;
        this.addCard(card);
    }

    empty() {
        this.cards = [];
        this.updateTransforms();
    }

    addCard(card) {
        card.anchor = this.anchor;
        card.size.width = this.width;
        card.size.height = this.height;
        card.targetSize.width = this.width;
        card.targetSize.height = this.height;
        this.cards.push(card);
        card.parent = this;
        this.updateTransforms();
    }

    removeCard(card) {
        for (var i = 0; i < this.cards.length; i++) {
            if (this.cards[i] === card) {
                this.cards.splice(i, 1);
                break;
            }
        }
        if (card.hovered) this.hovered = false;
        card.hovered = false;
        this.updateTransforms();
    }

    removeNthCard(n) {
        if (this.cards[n].hovered) this.hovered = false;
        this.cards[n].hovered = false;
        this.cards.splice(n, 1);
        this.updateTransforms();
    }

    mousePressed() {
        if (this.onClick) {
            this.onClick();
        }
        this.cards.map((card) => {
            if (card.hovered) card.mousePressed()
        });
    }
}

function createCanvas(parent) {
    var canvas = $("<canvas></canvas>").attr("id", "canvas")[0];
    $(canvas).css({
        "display": "block",
    });
    $(canvas).mousemove(function(event) {
        var parentOffset = $(this).parent().offset();
        Mouse.x = event.pageX - parentOffset.left;
        Mouse.y = event.pageY - parentOffset.top;
    })
    $(canvas).on('click', function() {
        parent.mousePressed();
    });
    return canvas;
}

var Mouse = {
    x: -1000,
    y: -1000,
}

$(document).ready(function() {
    $("html").css({
        "overflow": "hidden",
        "height": "100%"
    });
    $("body").css({
        "overflow": "hidden",
        "height": "100%"
    });

});
