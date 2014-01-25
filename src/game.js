$(function () {
    Game.beginGame = function () {
        // Starting state
        Game.state = {
            rooms: {
                lq: {
                    bedJumps: 0,
                    bedBroken: false,
                    playerHeardGrowling: false
                }
            }
        };
        Game.player = {};

        new State({
            name: 'title-card',
            menuItems: [
                {
                    description: "Start Game.",
                    action: function () {
                        if (!Game.state.sexyTimes) {
                            Game.state.sexyTimes = true;
                            return;
                        }
                        Game.goto('living-quarters');
                    },
                    showWhen: function () { return true; }
                }
            ]
        });

        new State({
            name: 'living-quarters',

            menuItems: [
                {
                    description: "Jump on bed.",
                    action: function () {
                        switch (Game.state.rooms.lq.bedJumps) {
                            case 0: Game.displayMessage("The bed squeaks a bit."); break;
                            case 1: Game.displayMessage("The bed sags heavily and makes unsettling noises."); break;
                            case 2:
                                Game.displayMessage("The bed crashes to pieces. You get impaled on a piece of bed frame and die.");
                                Game.player.dead = true;
                                break;
                        }
                        Game.state.rooms.lq.bedJumps++;
                    },
                    showWhen: function () { return true; }
                },
                {
                    description: "Look under bed.",
                    action: function () {
                        switch (Game.state.rooms.lq.bedJumps) {
                            case 0:
                                Game.displayMessage("A bed jumps out from under your bed and impales you through the chest. You die.");
                                Game.player.dead = true;
                                break;
                            case 1:
                                Game.displayMessage("An irritated goblin, shapled like a bed, jumps out from under your bed " +
                                    "and impales you, with grunts of satisfaction. You die.");
                                Game.player.dead = true;
                                break;
                            case 2: Game.displayMessage("You cannot see under the bed because it is sagging so dangerously. " +
                                "However, you hear growling coming from somewhere down there.");
                                Game.state.rooms.lq.playerHeardGrowling = true;
                                break;
                        }
                    },
                    showWhen: function () { return true; }
                },
                {
                    description: "Say, \"Hello?\ ... Is something there? ...\"",
                    action: function () {
                        Game.displayMessage("An irritated goblin, weasles it's way out from under the half-crushed " +
                            "bed with a long piece of broken bed frame and impales you, making swarthy thirsty noises. " +
                            "The last thing you hear is muffled cackling as you die.");
                        Game.player.dead = true;
                    },
                    showWhen: function () { return Game.state.rooms.lq.playerHeardGrowling; }
                }
            ]
        });

        Game.goto('title-card');
    };
});