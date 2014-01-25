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

            if (e.which == 38) { // up
                this.selectedItem--;
                if (this.selectedItem < 0) {
                    this.selectedItem = 0;
                }
            } else if (e.which == 40) { // down
                this.selectedItem++;
                if (this.selectedItem > this.menuItems.length - 1) {
                    this.selectedItem = this.menuItems.length - 1;
                }
            } else if (e.which == 32 || e.which == 13) {
                this.chooseItem();
            }
            this.rerender();
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
                throw "Oops! No tmplate exists for state: " + this.name;
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
            description: "Restart game.",
            action: function () {
                $('body').removeClass('player-dead');
                Game.beginGame();
            }
        }
    ];

    window.Game = Game;
    window.State = State;
});
