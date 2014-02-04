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
            if (this.room.choiceMade) {
                this.validItems = [];
            } else {
                this.validItems = _.filter(this.menuItems, function (item) {
                    if (!_.isFunction(item.showWhen)) {
                        return true;
                    } else {
                        return item.showWhen.apply(Game.activeRoom);
                    }
                });
            }
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
                menuItems: this.menuItems || [],
                room: this
            });
            this.setup();
        },
        setup: function () {},
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
        keycodesPreventDefaultBlacklist: [8],
        rooms: {},
        el: $('body'),
        messageArea: $('#most-recent-message'),
        events: {
            "keydown": "keydown"
        },
        goto: function (roomName) {
            if (this.activeRoom) {
                this.activeRoom.destroy();
            }
            var room = this.rooms[roomName];
            Game.activeRoom = room;

            room.render();
            this.$el.prepend(room.$el);
            this.messageArea.text('');
        },
        displayMessage: function (html) {
            this.messageArea.html(html);
        },
        keydown: function (e) {
            if (_.contains(this.keycodesPreventDefaultBlacklist, e.which)) {
                e.preventDefault();
            }

            if (this.activeRoom) {
                this.activeRoom.menu.nav(e);
            }
            this.walk(e);
            this.pullRipcord(e);
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

            this.chooseNextLandmark();

            console.log ( "walkThreshold: " + Game.player.walkThreshold );
            console.log ( "stability: " + Game.player.stability );
            console.log ( "distanceMultiplier: " + Game.player.distanceMultiplier );
            console.log ( "returnEase: " + Game.player.returnEase );
        },
        chooseNextLandmark: function () {
            var nextLandmark = Game.path.landmarks[Game.path.roomsChosen.length];
            console.log("nextLandmark.distance: ", nextLandmark.distance, " Game.player.distance: ", Game.player.distance);
            if (Game.player.distance >= nextLandmark.distance) {
                var roomChosen = _.sample(nextLandmark.roomNames);
                Game.path.roomsChosen.push(roomChosen);
                Game.goto(roomChosen);
            }
        },
        takeStep: function (foot) {
            var currentTime = new Date();
            if (Game.state.lastFoot) {
                if (Game.state.lastFoot == foot) {  //if same leg is used, trip
                    this.trip();
                } else {
                    var timeDiff = currentTime.getTime() - Game.state.LastStepTime.getTime();
                    console.log ( "timeDiff: " + timeDiff );

                    if (timeDiff < Game.player.walkThreshold && timeDiff > Game.player.tripThreshold) { //if speed is a little too fast, decrease stability
                        Game.player.stability--;
                        if (Game.player.stability > 0) {
                            $('body').addClass('unstable');
                        }
                        else if (Game.player.stability <= 0) { //if stability gets too low, trip
                            this.trip();
                        }
                    } else if (timeDiff <= Game.player.tripThreshold) { //if speed is crazy fast, just trip
                            this.trip();
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
        },
        trip: function () {
            Game.player.distanceMultiplier = 0;
            Game.player.stability = Game.player.maxStability;
            $('body').addClass('trip');
            this.trigger('trip');
        },
        pullRipcord: function (e) {
            if (e.which == 8) { //backspace
                Game.displayMessage("THE RIPCORD HAS BEEN PULLED!");
                Game.path.ripcordIntervalId = setInterval(this.retraction,300);
            }
        },
        retraction: function () {
            var prevDistance = Game.path.landmarks[Game.path.roomsChosen.length - 1].distance;
            if (Game.player.distance < prevDistance) {
                Game.path.roomsChosen.pop();
                var prevRoom = _.last(Game.path.roomsChosen);
                if (prevRoom) {
                    Game.goto(prevRoom);
                } else {
                    clearInterval(Game.path.ripcordIntervalId);
                    clearTimeout(Game.state.oxygenTimeoutId);
                    Game.displayMessage("YOU HAVE RETURNED TO THE SUBMARINE... ALIVE!");
                }
            }
            Game.player.distance -= 20;
            console.log(Game.player.distance);
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

