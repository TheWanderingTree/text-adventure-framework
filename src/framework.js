$(function () {
    Handlebars.registerHelper('equal', function (lside, rside, options) {
        if (lside == rside) {
            return options.fn();
        } else {
            return options.inverse();
        }
    });

    var View = Backbone.View.extend({
        initialize: function (options) {
            _.extend(this, options);
        }
    });

    var Menu = View.extend({
        tmpl: Handlebars.compile($('[name=action-menu]').val()),
        initialize: function () {
            View.prototype.initialize.apply(this, arguments);
            if (this.menuItems && this.menuItems.length) {
                this.selectedItem = 0;
            } else {
                this.selectedItem = null;
            }
        },
        render: function () {
            this.validItems = _.filter(this.menuItems, function (item) {
                if (!_.isFunction(item.showWhen)) {
                    return true;
                } else {
                    return item.showWhen.apply(Game.activeRoom);
                }
            });
            var str = this.tmpl({
                actions: _.pluck(this.validItems, "description"),
                selectedItem: this.selectedItem
            });
            this.setElement($(str));
        },
        rerender: function () {
            var old = this.$el;
            this.render();
            old.replaceWith(this.$el);
        },
        nav: function (e) {
            if (this.validItems.length == 0) return;

            if (_.contains([97,49], e.which)) { // Numpad 1
                this.selectedItem = 0;
                this.chooseItem();

            } else if (_.contains([98,50], e.which)) { // Numpad 2
                this.selectedItem = 1;
                this.chooseItem();

            } else if (_.contains([99,51], e.which)) { // Numpad 3
                this.selectedItem = 2;
                this.chooseItem();
            }

            this.rerender();
        },
        chooseItem: function () {
            Game.state.lastFoot = null;
            var chosenItem = this.menuItems[this.selectedItem];
            if (chosenItem) {
                chosenItem.action.apply(Game.activeRoom);
            }
            if (Game.player.dead) {
                Game.showDeadMenu();
            } else {
                Game.activeRoom.rerender();
            }
        },
        destroy: function () {
            this.stopListening();
            this.$el.remove();
        }
    });

    var Room = View.extend({
        initialize: function () {
            View.prototype.initialize.apply(this, arguments);
            var tmplStr = $('[name='+this.name+']').val();
            if (tmplStr) {
                this.tmpl = Handlebars.compile(tmplStr);
            } else {
                throw "Oops! No template exists for state: " + this.name;
            }
            Game.rooms[this.name] = this;
            this.menu = new Menu({
                menuItems: this.menuItems || []
            });
        },
        render: function () {
            this.menu.render();
            this.setElement(this.tmpl({
                state: Game.state,
                activeRoom: Game.activeRoom,
                player: Game.player
            }));
            this.$el.attr('id', this.name);
            this.$el.append(this.menu.$el);
            $('body').addClass(this.name);
        },
        rerender: function () {
            var old = this.$el;
            this.render();
            old.replaceWith(this.$el);
        },
        destroy: function () {
            this.menu.destroy();

            this.stopListening();
            this.$el.remove();
        }
    });

    var Game = new View({
        rooms: {},
        el: $('body'),
        messageArea: $('#most-recent-message'),
        events: {
            "keyup": "keyup"
        },
        goto: function (roomName) {
            if (this.activeRoom) {
                this.activeRoom.destroy();
            }
            var room = this.rooms[roomName];
            room.render();
            this.$el.prepend(room.$el);
            this.messageArea.text('');

            Game.activeRoom = room;
        },
        displayMessage: function (html) {
            this.messageArea.html(html);
        },
        keyup: function (e) {
            if (this.activeRoom) {
                this.activeRoom.menu.nav(e);
            }
            this.walk(e);
        },
        walk: function (e) {
            if (!Game.player.canWalk) return;

            //remove trip/unstable animation classes
            $('body').removeClass('trip');
            $('body').removeClass('unstable');

            if (e.which == 65) { // a
                this.takeStep('Left');
            } else if (e.which == 68) { // d
                this.takeStep('Right');
            }

            var nextEvent = Game.path.events[Game.path.roomsChosen.length];
            console.log("nextEvent.distance: ", nextEvent.distance, " Game.player.distance: ", Game.player.distance);
            if (Game.player.distance >= nextEvent.distance) {
                var roomChosen = _.sample(nextEvent.roomNames);
                Game.path.roomsChosen.push(roomChosen);
                Game.goto(roomChosen);
            }

            console.log ( "walkThreshold: " + Game.player.walkThreshold );
            console.log ( "stability: " + Game.player.stability );
            console.log ( "distanceMultiplier: " + Game.player.distanceMultiplier );
            console.log ( "returnEase: " + Game.player.returnEase );
        },
        takeStep: function (foot) {
            var currentTime = new Date();
            if (Game.state.lastFoot) {
                if (Game.state.lastFoot == foot) {  //if same leg is used, trip
                    Game.player.distanceMultiplier = 0;
                    $('body').addClass('trip');
                } else {
                    var timeDiff = currentTime.getTime() - Game.state.LastStepTime.getTime();
                    console.log ( "timeDiff: " + timeDiff );

                    if (timeDiff < Game.player.walkThreshold && timeDiff > Game.player.tripThreshold) { //if speed is a little too fast, decrease stability
                        Game.player.stability--;
                        if (Game.player.stability > 0) {
                            $('body').addClass('unstable');
                        }
                        else if (Game.player.stability < 0) { //if stability gets too low, trip
                            Game.player.distanceMultiplier = 0;
                            Game.player.stability = Game.player.maxStability;
                            $('body').addClass('trip');
                        }
                    } else if (timeDiff <= Game.player.tripThreshold) { //if speed is crazy fast, just trip
                        Game.player.distanceMultiplier = 0;
                        Game.player.stability = Game.player.maxStability;
                        $('body').addClass('trip');
                    }
                    Game.player.distance++; //award 1 distance per step
                    Game.player.distance += Game.player.distanceMultiplier; //add previous multiplier for chaining good steps
                    Game.player.distanceMultiplier++; //add to step chain
                    if (Game.player.distanceMultiplier > Game.player.maxDistanceMultiplier) { //limit multiplier
                        Game.player.distanceMultiplier = Game.player.maxDistanceMultiplier;
                    }
                }
            }
            Game.state.LastStepTime = currentTime; //store time key is pressed
            // console.log( "Game.state.LastStepTime: " + Game.state.LastStepTime );
            Game.state.lastFoot = foot; // set last key pressed

            if ((Game.activeRoom.mineField == true) && (Game.player.stability == 0)) {
                Game.player.dead = true;
                Game.goto('player-dead-exploded');
                Game.showDeadMenu();
                Game.playSound('explode.mp3');
            }
        },
        showDeadMenu: function () {
            Game.player.canWalk = false;
            Game.pauseSound('desolation.mp3');
            Game.activeRoom.menu.menuItems = deadMenu;
            Game.activeRoom.menu.selectedItem = 0;
            $('body').addClass('player-dead');
            Game.activeRoom.rerender();
        },
        playSound: function (filename) {
            var audio = new Audio('../assets/sounds/' + filename);
            audio.play();
        },
        playSoundForever: function (filename) {
            Game.audio = new Audio('../assets/sounds/' + filename);
            Game.audio.setAttribute('loop', true);
            Game.audio.play();
        },
        pauseSound: function (filename) {
            Game.audio.pause();
        }
    });

    var deadMenu =  [
        {
            description: "1: Restart game",
            action: function () {
                $('body').removeClass('player-dead');
                Game.beginGame();
            }
        }
    ];

    window.Game = Game;
    window.Room = Room;
});

