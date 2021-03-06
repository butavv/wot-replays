/*
    wotreplays.org mapgrid displayer
    (c) 2013 Scrambled

    Feel free to use and abuse at your own leisure

    Keep in mind that this grid system numbers grid cells from left to right, top to bottom, meaning that the 'A' row contains cells 0 to 9 
    whereas WG's minimap apparently does it top to bottom, left to right, meaning that the '1' row contains cells 0 to 9

    The "data-cellid" attribute contains the native cell id, the "data-wgcellid" contains the WG cell ID
*/
var MapGrid = function(options) {
    this.ident      = options.ident;
    this.width      = options.map.width;
    this.height     = options.map.height;
    this.bounds     = options.map.bounds;
    this.cellw      = options.map.width / 10;
    this.cellh      = options.map.height / 10;
    this.scellw     = options.map.width / 100;
    this.scellh     = options.map.height / 100;
    this.container  = options.container; // should be the ID of the container, not the element

    this.letters    = [ 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'J', 'K' ]; // no I in there
    this.handlers   = {
        cellclick:      [],
        subcellclick:   [],
        mapclick:       [],
    };
    this.items      = {};
    this.overlays   = {
        'item'      : $('<div/>').attr('id', 'overlay-item').addClass('item-overlay').css({ width: this.width + 'px', height: this.height + 'px', position: 'absolute', top: '0px', left: '0px' }),
        'viewer'    : $('<div/>').attr('id', 'overlay-viewer').addClass('viewer-overlay').css({ width: this.width + 'px', height: this.height + 'px', position: 'absolute', top: '0px', left: '0px' }),
        'cell'      : $('<div/>').attr('id', 'overlay-cell').addClass('cell-overlay').css({ width: this.width + 'px', height: this.height + 'px', position: 'absolute', top: '0px', left: '0px' }),
        'subcell'   : $('<div/>').attr('id', 'overlay-subcell').addClass('subcell-overlay').css({ width: this.width + 'px', height: this.height + 'px', position: 'absolute', top: '0px', left: '0px' }),
        'loader'    : $('<div/>').attr('id', 'overlay-loader').addClass('loader-overlay hide').css({ width: this.width + 'px', height: this.height + 'px', position: 'absolute', top: '0px', left: '0px' })
    };
}
MapGrid.prototype = {
    getAllOverlays: function() {
        var o = [];
        for(k in this.overlays) {
            o.push(this.overlays[k]);
        }
        return o;
    },
    getOverlay: function(name) {
        return this.overlays[name];
    },
    showLoader: function() {
        this.getOverlay('loader').removeClass('hide');
    },
    hideLoader: function() {
        this.getOverlay('loader').addClass('hide');
    },
    addItem: function(name, element) {
        this.items[name] = element;
        this.getOverlay('item').append(element);
    },
    getItem: function(name) {
        return this.items[name];
    },
    onMapClick: function(handler) {
        this.handlers.mapclick.push(handler);
    },
    onCellClick: function(handler) {
        this.handlers.cellclick.push(handler);
    },
    onSubCellClick: function(handler) {
        this.handlers.subcellclick.push(handler);
    },
    render: function() {
        var me = this;
        var mapGrid = $('<div/>').addClass('map-grid').css({ width: (this.width + 25) + 'px', position: 'relative' });
        var gridNumbers = $('<div/>').addClass('grid-numbers');
        var gridLetters = $('<div/>').addClass('grid-letters');
        for(i = 0; i < 10; i++) {
            $(gridNumbers).append($('<div/>').addClass('grid number').css({ width: this.cellw + 'px' }).text((i < 9) ? i + 1 : 0));
            $(gridLetters).append($('<div/>').addClass('grid letter').css({ height: this.cellh + 'px' }).text(this.letters[i]));
        }
        var map = $('<div/>').addClass('map map_' + this.ident).css({ width: this.width + 'px', height: this.height + 'px', position: 'relative' });
        for(x = 1; x < 11; x++) {
            for(y = 1; y < 10; y++) {
                $(map).append($('<div/>').addClass('grid line vertical').css({ 'left': (y * this.cellw) + 'px', height: this.height + 'px' })) 
            }
            $(map).append($('<div/>').addClass('grid line horizontal').css({ 'top': (x * this.cellh) + 'px', width: this.width + 'px' })) 
        }
        var cellcount = 0;
        for(x = 0; x < 10; x++) {
            for(y = 0; y < 10; y++) {
                var wgCellID = (y * 10) + x;
                this.getOverlay('cell').append(
                    $('<div/>')
                        .addClass('cell')
                        .attr('data-cellid', cellcount++)
                        .attr('data-wgcellid', wgCellID)
                        .attr('data-cellname', "" + this.letters[x] + "" + ((y < 9) ? (y + 1) : 0))
                        .css({ width: this.cellw + 'px', height: this.cellh + 'px', position: 'absolute', 'left': (y * this.cellh) + 'px', 'top': (x * this.cellw) + 'px' })
                )
            }
        }
        var subcellcount = 0;
        for(x = 0; x < 100; x++) {
            for(y = 0; y < 100; y++) {
                // don't be fooled by center-x center-y, i typoed on the x/y declaration above but too lazy to fix it 
                this.getOverlay('subcell').append(
                    $('<div/>')
                        .addClass('subcell')
                        .attr('data-subcellid', subcellcount++)
                        .css({ width: this.scellw + 'px', height: this.scellh + 'px', position: 'absolute', 'left': (y * this.scellh) + 'px', 'top': (x * this.scellw) + 'px' })
                        .attr('data-center-y', Math.floor(x * this.scellw + (this.scellw / 2)))
                        .attr('data-center-x', Math.floor(y * this.scellh + (this.scellh / 2)))
                )
            }
        }

        this.getAllOverlays().forEach(function(overlay) {
            $(map).append(overlay);
        });

        // set some handlers on the map
        $(map).on('click', function(evt) {
            var cx = evt.offsetX;
            var cy = evt.offsetY;

            var cell = me.getCellAt({ x: cx, y: cy });
            var subcell = me.getSubCellAt({ x: cx, y: cy });

            me.handlers.mapclick.forEach(function(handler) {
                handler.call(me, cell, subcell);
            });
            me.handlers.cellclick.forEach(function(handler) {
                handler.call(me, cell);
            });
            me.handlers.subcellclick.forEach(function(handler) {
                handler.call(me, subcell);
            });

        });
        $(mapGrid).append(
            gridNumbers, 
            $('<div/>').addClass('clearfix').append(
                gridLetters,
                map
            )
        );
        $(this.container).html(mapGrid);
    },
    game_to_map_coord: function(position) {
        try {
            if(position.length == 3) {
                var x = position[0];
                var y = position[2];
            } else if(position.length == 2) {
                var x = position[0];
                var y = position[1];
            }
            x = (x - this.bounds[0][0]) * (this.width / (this.bounds[1][0] - this.bounds[0][0] + 1));
            y = (this.bounds[1][1] - y) * (this.height / (this.bounds[1][1] - this.bounds[0][1] + 1));
            var res = { x: x, y: y };
            return res;
        } catch(err) {
            console.log('mapGrid.game_to_map_coord error: ', err);
            return null;
        }
    },
    getCellByName: function(name) {
        return $(this.container + ' div.cell[data-cellname="' + name + '"]');
    },
    coord_to_cell_id: function(coords) {
        var x = Math.floor(coords.x / this.cellw);
        var y = Math.floor(coords.y / this.cellh);
        return (y * 10) + x;
    },
    coord_to_subcell_id: function(coords) {
        var x = Math.floor(coords.x / this.scellw);
        var y = Math.floor(coords.y / this.scellh);
        return (y * 100) + x;
    },
    getSubcellCenterCoordinates: function(coords) {
        var subcell = this.getSubCellAt(coords);
        return { x: parseInt($(subcell).attr('data-center-x')), y: parseInt($(subcell).attr('data-center-y')) };
    },
    getSubCellCenterCoordinatesBySubCellID: function(subcellid) {
        var subcell = this.getSubCellByCellID(subcellid);
        return { x: parseInt($(subcell).attr('data-center-x')), y: parseInt($(subcell).attr('data-center-y')) };
    },
    getSubCellByCellID: function(subcellid) {
        return $(this.container + ' div.subcell[data-subcellid="' + subcellid + '"]');
    },
    getCellByCellID: function(cellid) {
        return $(this.container + ' div.cell[data-cellid="' + cellid + '"]');
    },
    getCellByWGCellID: function(cellid) {
        return $(this.container + ' div.cell[data-wgcellid="' + cellid + '"]');
    },
    getCellAt: function(coords) {
        return this.getCellByCellID(this.coord_to_cell_id(coords));
    },
    getSubCellAt: function(coords) {
        return this.getSubCellByCellID(this.coord_to_subcell_id(coords));
    },
    getAllSubCells: function() {
        return $(this.container + ' div.subcell');
    },
    callAttentionByWGCellID: function(cellid) {
        this.callAttention(this.getCellByWGCellID(cellid));
    },
    callAttention: function(cell) {
        if(!cell) return;
        var fadeIn  = 'rgba(255, 0, 0, 0.5)';
        var fadeOut = 'rgba(255, 0, 0, 0.0)';
        $(cell).stop().css({ 'border': 'transparent 1px solid' })
            .animate({ borderColor: fadeIn, backgroundColor: fadeIn }, 250)
            .animate({ borderColor: fadeOut, backgroundColor: fadeOut }, 500)
            .animate({ borderColor: fadeIn, backgroundColor: fadeIn }, 500)
            .animate({ borderColor: fadeOut, backgroundColor: fadeOut }, 500)
            .animate({ borderColor: fadeIn, backgroundColor: fadeIn }, 500)
            .animate({ borderColor: fadeOut, backgroundColor: fadeOut }, {
                duration: 250,
                complete: function() {
                    $(cell).stop().css({ 'border': 'transparent 0px solid', 'background-color': 'transparent' });
                }
            });
    }
};
var SpawnPoint = function() {
    this.position = null;
    this.enemy = false;
    this.friendly = false;
    this.el = $('<div/>').addClass('spawn');
    this.pointIndex = -1;
};
SpawnPoint.prototype = {
    clearClass: function() {
        this.el.removeClass('friendly').removeClass('neutral').removeClass('enemy');
    },
    render: function() {
        var cl = this.isNeutral() 
            ? 'neutral' : this.isEnemy()
                ? 'enemy' : 'friendly';
        this.el.addClass(cl + ' point-' + this.pointIndex);
        return this;
    },
    setPoint: function(p) {
        this.pointIndex = p;
    },
    setPosition: function(pos) {
        this.position = pos;
        this.el.css({ 'top': pos.y - 32, 'left': pos.x - 32 }); // since the icons are 64x64 
    },
    setEnemy: function() {
        this.friendly = false;
        this.enemy = true;
    },
    setFriendly: function() {
        this.friendly = true;
        this.enemy = false;
    },
    setNeutral: function() {
        this.enemy = false;
        this.friendly = false;
    },
    isEnemy: function() { return this.enemy },
    isFriendly: function() { return this.friendly },
    isNeutral: function() {
        return (this.enemy == false && this.friendly == false) ? true : false;
    },
};
var BasePoint = function() {
    this.friendly       = false;
    this.enemy          = false;
    this.position       = null;
    this.beingCaptured  = false;
    this.capturePoints  = 0;
    this.stateInit      = false;
    this.captured       = false;
    this.el             = $('<div/>').addClass('base');
    this.captureBar     = $('<div/>').css({ width: '64px', height: '10px', position: 'absolute', 'border': '#000 1px solid', 'background': '#000 none repeat scroll 0 0', top: '-8px', left: '0px' });
    this.captureBarP    = $('<div/>').css({ width: '0%', height: '10px', position: 'absolute', 'border': '#000 1px solid', top: '0px', left: '0px' });

    this.el.append(this.captureBar.append(this.captureBarP));
    this.captureBar.hide();
};
BasePoint.prototype = {
    clearClass: function() {
        this.el.removeClass('friendly').removeClass('neutral').removeClass('enemy');
    },
    render: function() {
        this.clearClass();
        var cl = this.isNeutral() 
            ? 'neutral' : this.isEnemy()
                ? 'enemy' : 'friendly';
        this.el.addClass(cl);
        return this;
    },
    stopCapturing: function() {
        if(this.captured) return;
        this.beingCaptured = false;
        this.captureBar.hide();
        this.captureBarP.css({ width: '0%' });
        this.capturePoints = 0;
    },
    captureProgress: function(points, isEnemy) {
        if(this.captured) return;
        if(!this.stateInit) return;
        if(points == 0) {
            this.stopCapturing();
            return;
        }
        if(isEnemy) {
            this.captureBarP.css({ 'background-color': '#0f0' });
        } else {
            this.captureBarP.css({ 'background-color': '#f00' });
        }
        this.beingCaptured = true;
        this.captureBar.show();
        this.captureBarP.css({ width: points + '%' });
        this.capturePoints = points;
    },
    _flashCount: 0,
    _flasher: function() {
        el = this.el;
        me = this;

        if(this._flashCount == 8) {
            el.css({ 'opacity': '0.75' });
        } else {
            el.fadeOut(250 / me._flashCount, function() {
                el.fadeIn(250 / me._flashCount, function() {
                    me._flashCount++;
                    me._flasher();
                });
            });
        }
    },
    hasBeenCaptured: function(isEnemy) {
        this.captureProgress(100, isEnemy);
        this.captured = true;

        this._flasher();
    },
    setEnemy: function() {
        this.friendly = false;
        this.enemy = true;
    },
    setFriendly: function() {
        this.friendly = true;
        this.enemy = false;
    },
    setPosition: function(pos) {
        this.position = pos;
        this.el.css({ 'top': pos.y - 32, 'left': pos.x - 32 }); // since the icons are 64x64 
    },
    setNeutral: function() {
        this.enemy = false;
        this.friendly = false;
    },
    isEnemy: function() { return this.enemy },
    isFriendly: function() { return this.friendly },
    isNeutral: function() {
        return (this.enemy == false && this.friendly == false) ? true : false;
    },
};
