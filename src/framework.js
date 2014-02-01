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
            $('body').removeClass('unstable ');

            if (e.which == 97) { // Numpad 1
                this.selectedItem = 0;
                this.chooseItem();

            } else if (e.which == 98) { // Numpad 2
                this.selectedItem = 1;
                this.chooseItem();

            } else if (e.which == 99) { // Numpad 3
                this.selectedItem = 2;
                this.chooseItem();

            }

            if (e.which == 65) { // a
                Game.state.LeftKeyTime = new Date(); //store time key is pressed
                console.log ( "Game.state.LeftKeyTime: " + Game.state.LeftKeyTime );

                if (Game.lastKey == 'Left') {  //if same leg is used, trip
                    Game.player.distanceMultiplier = 0;
                    $('body').addClass('trip');
                } else {
                    if (Game.lastKey == 'Right') { //if legs are alternating, check running speed
                        var TimeDiff = Math.abs(Game.state.LeftKeyTime.getTime() - Game.state.RightKeyTime.getTime());
                        console.log ( "TimeDiff: " + TimeDiff );
                        if (TimeDiff < 450 && TimeDiff > 250) { //if speed is a little too fast, increase instability
                            Game.player.stability ++;
                            if (Game.player.stability <= 5) {
                                $('body').addClass('unstable');
                            }
                            else if (Game.player.stability > 5) { //if chance to trip gets too high, trip
                                Game.player.distanceMultiplier = 0;
                                Game.player.stability = 0;
                                $('body').addClass('trip');
                            }
                        } else if (TimeDiff <= 250 ) { //if speed is crazy fast, just trip
                            Game.player.distanceMultiplier = 0;
                            Game.player.stability = 0;
                            $('body').addClass('trip');
                        }
                    }
                    Game.player.distance++; //award 1 distance per step
                    Game.player.distance+=Game.player.distanceMultiplier; //add previous multiplier for chaining good steps
                    Game.player.distanceMultiplier++; //add to step chain
                    if (Game.player.distanceMultiplier > 15) { //limit multiplier to 15
                        Game.player.distanceMultiplier = 15;
                    }
                }
                Game.lastKey = 'Left'; // set last key pressed

            } else if (e.which == 68) { // d
                Game.state.RightKeyTime = new Date();
                console.log ( "Game.state.RightKeyTime: " + Game.state.RightKeyTime );

                if (Game.lastKey == 'Right') {
                    Game.player.distanceMultiplier = 0;
                    $('body').addClass('trip');
                } else {
                    if (Game.lastKey == 'Left') {
                        var TimeDiff = Math.abs(Game.state.LeftKeyTime.getTime() - Game.state.RightKeyTime.getTime());
                        console.log ( "TimeDiff: " + TimeDiff );
                        if (TimeDiff < 450 && TimeDiff > 250) {
                            Game.player.stability ++;
                            if (Game.player.stability <= 5) {
                                $('body').addClass('unstable');
                            }
                            else if (Game.player.stability > 5) { //if chance to trip gets too high, trip
                                Game.player.distanceMultiplier = 0;
                                Game.player.stability = 0;
                                $('body').addClass('trip');
                            }
                        } else if (TimeDiff <= 250 ) { //if speed is crazy fast, just trip
                            Game.player.distanceMultiplier = 0;
                            Game.player.stability = 0;
                            $('body').addClass('trip');
                        }
                    }
                    Game.player.distance++;
                    Game.player.distance+=Game.player.distanceMultiplier;
                    Game.player.distanceMultiplier++;
                    if (Game.player.distanceMultiplier > 15) {
                        Game.player.distanceMultiplier = 15;
                    }
                }
                Game.lastKey = 'Right';
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
        takeStep: function () {

        },
        chooseItem: function () {
            var description = this.$el.find('.selected').text();
            var chosenItem = _.find(this.menuItems, function (item) { return item.description == description; });
            if (chosenItem) {
                chosenItem.action.apply(Game.activeState);
            }
            if (Game.player.dead) {
                Game.activeState.menu.menuItems = deadMenu;
                Game.activeState.menu.selectedItem = 0;
                $('body').addClass('player-dead');
            }
            Game.activeState.rerender();
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
                global: Game.state,
                state: Game.activeState,
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

