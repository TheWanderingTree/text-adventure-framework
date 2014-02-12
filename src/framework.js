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
            if (!this.room.choiceMade && Game.state.exploring) {
                this.validItems = _.filter(this.menuItems, function (item) {
                    if (!_.isFunction(item.showWhen)) {
                        return true;
                    } else {
                        return item.showWhen.apply(Game.activeRoom);
                    }
                });
            } else {
                this.validItems = [];
                Game.player.canWalk = true;
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
        AVOID_OPTIONS: {
            LEFT: "left",
            RIGHT: "right",
            BOTH: "both"
        },
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
            if (!(Game.activeRoom.choiceMade)) {
                Game.player.canWalk = false;
            };
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
            this.obstacleResponse(e);
        },
        walk: function (e) {
            if (!Game.player.canWalk | !Game.state.exploring) return;

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
            console.log ( "obstacleProbability: " + Game.player.obstacleProbability );
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
                var timeDiff = currentTime.getTime() - Game.state.LastStepTime.getTime();
                console.log ( "timeDiff: " + timeDiff );

                var usedCorrectFoot = !(Game.state.lastFoot == foot),
                    isSteppingGood = timeDiff > Game.player.walkThreshold,
                    becameUnstable = !isSteppingGood && timeDiff > Game.player.tripThreshold;

                if (becameUnstable) {
                    Game.player.stability--;
                }

                var isTripping = !usedCorrectFoot || Game.player.stability <= 0 || timeDiff <= Game.player.tripThreshold;

                if (isTripping) {
                    Game.player.distanceMultiplier = 0;
                    Game.player.stability = Game.player.maxStability;
                    $('body').addClass('trip');
                    console.log('TRIP!');
                    this.trigger('trip');
                } else if (isSteppingGood || becameUnstable) {
                    Game.player.distance++; //award 1 distance per step
                    Game.player.distance += Game.player.distanceMultiplier; //add previous multiplier for chaining good steps
                    Game.player.distanceMultiplier++; //add to step chain

                    if (becameUnstable) {
                        $('body').addClass('unstable');
                    }
                }
                if (Game.player.distanceMultiplier > Game.player.maxDistanceMultiplier) { //limit multiplier
                    Game.player.distanceMultiplier = Game.player.maxDistanceMultiplier;
                }
            }
            Game.state.LastStepTime = currentTime; //store time key is pressed
            // console.log( "Game.state.LastStepTime: " + Game.state.LastStepTime );
            Game.state.lastFoot = foot; // set last key pressed
        },
        pullRipcord: function (e) {
            if (e.which == 8) { //backspace
                Game.displayMessage("THE RIPCORD HAS BEEN PULLED!");
                Game.state.exploring = false;
                Game.player.canWalk = false;
                this.obstacleProbabilitized = new Probability({
                    p: Game.player.obstacleProbability + '%',
                    f: _.bind(this.triggerRetractionObstacle, this)
                });
                Game.path.ripcordIntervalId = setInterval(_.bind(this.retraction, this),900);
                Game.activeRoom.rerender();
            }
        },
        retraction: function () {
            if (Game.path.encounteringObstacle) return;

            Game.state.retractionTime++;
            Game.player.distance -= Game.state.ripcordSpeed;
            Game.state.ripcordSpeed += 5;
            if (Game.state.ripcordSpeed > Game.state.maxRipcordSpeed) { Game.state.ripcordSpeed = Game.state.maxRipcordSpeed };
            console.log("------------------------------------------------------------------");
            console.log("Game.state.retractionTime: " + Game.state.retractionTime);
            console.log("Game.player.distance: " + Game.player.distance);
            console.log("Game.state.ripcordSpeed: " + Game.state.ripcordSpeed);
            var prevDistance = Game.path.landmarks[Game.path.roomsChosen.length - 1].distance;
            if (Game.player.distance < prevDistance) {
                Game.path.roomsChosen.pop();
                var prevRoom = _.last(Game.path.roomsChosen);
                if (prevRoom) {
                    Game.goto(prevRoom);
                }
            }
            if (Game.player.distance > 0) {
                if (Game.state.retractionTime%3 == 0) {
                    console.log("Probs!");
                    this.obstacleProbabilitized();
                }
            } else {
                clearInterval(Game.path.ripcordIntervalId);
                clearTimeout(Game.state.oxygenTimeoutId);
                Game.displayMessage("YOU HAVE RETURNED TO THE SUBMARINE... ALIVE!");
                Game.returnSafe();
            }
        },
        triggerRetractionObstacle: function (forTestIndex) {
            console.log("Obstacle Triggered!")
            Game.path.encounteringObstacle = true;
            $('body').removeClass('snag');
            Game.state.obstacle = {};
            if (forTestIndex) {
                Game.state.obstacle.chosen = Game.activeRoom.obstacles[forTestIndex];
            } else {
                Game.state.obstacle.chosen = _.sample(Game.activeRoom.obstacles);
            }
            Game.displayMessage(Game.state.obstacle.chosen.description);
            Game.playSound(Game.state.obstacle.chosen.sound);
            Game.state.obstacle.timeoutId = setTimeout(_.bind(Game.state.obstacle.chosen.onFail, Game.activeRoom),2000);
        },
        obstacleResponse: function (e) {
            if (!Game.path.encounteringObstacle) return;

            var foot = null;
            if (e.which == 65) { // a
                foot = Game.AVOID_OPTIONS.LEFT;
            } else if (e.which == 68) { // d
                foot = Game.AVOID_OPTIONS.RIGHT;
            }

            if (foot) {
                var currentTime = new Date();
                if (Game.state.obstacle.chosen.toAvoid != Game.AVOID_OPTIONS.BOTH) { //if left or right
                    if (foot == Game.state.obstacle.chosen.toAvoid) { //and chose correctly
                        this.obstaclePass();
                    } else { //fucked it up
                        this.obstacleFail();
                    }
                } else { // BOTH
                    if (Game.state.obstacle.lastFoot) {
                        var timeDiff = currentTime.getTime() - Game.state.obstacle.LastStepTime.getTime();
                        console.log (timeDiff);
                        if (timeDiff < 100 && Game.state.obstacle.lastFoot != foot) {
                            this.obstaclePass();
                        } else { //fucked it up
                            this.obstacleFail();
                        }
                    }
                }
                Game.state.obstacle.LastStepTime = currentTime; //store time key is pressed
                Game.state.obstacle.lastFoot = foot; // set last key pressed
            }
        },
        obstaclePass: function () {
            console.log("Obstacle Passed!")
            Game.path.encounteringObstacle = false;
            Game.displayMessage("");
            Game.pauseSound(Game.state.obstacle.chosen.sound);
            clearTimeout(Game.state.obstacle.timeoutId);
        },
        obstacleFail: function () {
            console.log("Obstacle Failed!")
            Game.path.encounteringObstacle = false;
            Game.displayMessage("");
            Game.pauseSound(Game.state.obstacle.chosen.sound);
            clearTimeout(Game.state.obstacle.timeoutId);
            Game.state.obstacle.chosen.onFail.apply(Game.activeRoom);
        },
        showDeadMenu: function () {
            Game.player.canWalk = false;
            Game.pauseSound('desolation.mp3');
            Game.activeRoom.menu.menuItems = deadMenu;
            Game.activeRoom.menu.selectedItem = 0;
            $('body').addClass('player-dead');
            Game.activeRoom.rerender();
        },
        showSurviveMenu: function () {
            Game.player.canWalk = false;
            Game.pauseSound('desolation.mp3');
            Game.activeRoom.menu.menuItems = surviveMenu;
            Game.activeRoom.menu.selectedItem = 0;
            $('body').addClass('player-survives');
            Game.activeRoom.rerender();
        },
        playSound: function (filename) {
            Game.audio = new Audio('../assets/sounds/' + filename);
            Game.audio.play();
        },
        playSoundForever: function (filename) {
            Game.audio = new Audio('../assets/sounds/' + filename);
            Game.audio.setAttribute('loop', true);
            Game.audio.play();
        },
        pauseSound: function () {
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

    var surviveMenu =  [
        {
            description: "1: Dive again",
            action: function () {
                $('body').removeClass('player-survives');
                Game.beginGame();
            }
        }
    ];

    window.Game = Game;
    window.Room = Room;
});

