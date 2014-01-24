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
            this.listenTo(Game, 'keyup', this.nav);
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
            }
            this.rerender();
        },
        destroy: function () {
            this.stopListening();
            this.$el.remove();
        }
    });

    var State = View.extend({
        initialize: function () {
            View.prototype.initialize.apply(this, arguments);
            this.tmpl = Handlebars.compile($('[name='+this.name+']').val());
            Game.states[this.name] = this;
        },
        render: function () {
            this.menu = new Menu({
                menuItems: this.menuItems
            });
            this.menu.render();
            this.setElement(this.tmpl({
                global: Game.state,
                state: Game.activeState,
                player: Game.player
            }));
            this.$el.append(this.menu.$el);

            Game.activeState = this;
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
            "keyup": function (e) { this.trigger("keyup", e); }
        },
        goto: function (stateName) {
            if (this.activeState) {
                this.activeState.destroy();
            }
            var state = this.states[stateName];
            state.render();
            this.$el.prepend(state.$el);
            this.messageArea.text('');
        },
        displayMessage: function (html) {
            this.messageArea.html(html);
        }
    });

    var deadMenu =  [
        {
            description: "Restart game.",
            action: function () { Game.beginGame(); }
        },
        {
            description: "Quit.",
            action: function () {
                $('body').css('background','black');
                $('body').html('');
            }
        }
    ];

    window.Game = Game;
    window.State = State;
});
