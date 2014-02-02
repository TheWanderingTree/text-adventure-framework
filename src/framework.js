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
            var validItems = _.filter(this.menuItems, function (item) {
                if (!_.isFunction(item.showWhen)) {
                    return true;
                } else {
                    return item.showWhen();
                }
            });
            var str = this.tmpl({
                actions: _.pluck(validItems, "description"),
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
            if (this.selectedItem === null) return;

            //remove trip/unstable animation classes
            $('body').removeClass('trip');
            $('body').removeClass('unstable');

            console.log(e.which);

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

            if (e.which == 65) { // a
                this.takeStep('Left');
            } else if (e.which == 68) { // d
                this.takeStep('Right');
            }

            if ((Game.player.distance >= 50) && (Game.player.enteredEvent1 == false)) {
                Game.goto('ocean-1');
                Game.player.enteredEvent1 = true;
            };

            console.log ( "Distance: " + Game.player.distance );
            console.log ( "stability: " + Game.player.stability );
            console.log ( "distanceMultiplier: " + Game.player.distanceMultiplier );

            this.rerender();
        },
        takeStep: function (foot) {
            if (Game.activeState.name == 'ocean-empty') {
                var currentTime = new Date();
                if (Game.state.lastFoot) {
                    if (Game.state.lastFoot == foot) {  //if same leg is used, trip
                        Game.player.distanceMultiplier = 0;
                        $('body').addClass('trip');
                    } else {
                        var timeDiff = currentTime.getTime() - Game.state.LastStepTime.getTime();
                        console.log ( "timeDiff: " + timeDiff );

                        if (timeDiff < 450 && timeDiff > 250) { //if speed is a little too fast, increase instability
                            Game.player.stability--;
                            if (Game.player.stability > 0) {
                                $('body').addClass('unstable');
                            }
                            else if (Game.player.stability <= 0) { //if chance to trip gets too high, trip
                                Game.player.distanceMultiplier = 0;
                                Game.player.stability = Game.player.maxStability;
                                $('body').addClass('trip');
                            }
                        } else if (timeDiff <= 250) { //if speed is crazy fast, just trip
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
            }
        },
        chooseItem: function () {
            var description = this.$el.find('.selected').text();
            var chosenItem = _.find(this.menuItems, function (item) { return item.description == description; });
            if (chosenItem) {
                chosenItem.action.apply(Game.activeState);
            }
            if (Game.player.dead) {
                Game.showDeadMenu();
            } else {
                Game.activeState.rerender();
            }
        },
        destroy: function () {
            this.stopListening();
            this.$el.remove();
        }
    });

    var State = View.extend({
        initialize: function () {
            View.prototype.initialize.apply(this, arguments);
            var tmplStr = $('[name='+this.name+']').val();
            if (tmplStr) {
                this.tmpl = Handlebars.compile(tmplStr);
            } else {
                throw "Oops! No template exists for state: " + this.name;
            }
            Game.states[this.name] = this;
            this.menu = new Menu({
                menuItems: this.menuItems
            });
        },
        render: function () {
            this.menu.render();
            this.setElement(this.tmpl({
                state: Game.state,
                activeState: Game.activeState,
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
        states: {},
        el: $('body'),
        messageArea: $('#most-recent-message'),
        events: {
            "keyup": "keyup"
        },
        goto: function (stateName) {
            if (this.activeState) {
                this.activeState.destroy();
            }
            var state = this.states[stateName];
            state.render();
            this.$el.prepend(state.$el);
            this.messageArea.text('');

            Game.activeState = state;
        },
        displayMessage: function (html) {
            this.messageArea.html(html);
        },
        keyup: function (e) {
            if (this.activeState) {
                this.activeState.menu.nav(e);
            }
        },
        showDeadMenu: function () {
            Game.activeState.menu.menuItems = deadMenu;
            Game.activeState.menu.selectedItem = 0;
            $('body').addClass('player-dead');
            Game.activeState.rerender();
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
    window.State = State;
});

