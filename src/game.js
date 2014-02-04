$(function () {
    Game.beginGame = function () {

        // Starting state
        Game.rooms = {};
        Game.state = {
            rooms: {

            }
        };
        Game.path = {
            events: [
                {
                    distance: 100,
                    roomNames: ['ocean-plateau']
                },
                {
                    distance: 200,
                    roomNames: ['ocean-2']
                },
                {
                    distance: 300,
                    roomNames: []
                },
                {
                    distance: 400,
                    roomNames: []
                }
            ],
            roomsChosen: []
        }
        Game.player = {
            canWalk: true,
            hasFlashbulbs: true,
            distance: 0,
            walkThreshold: 450,
            distanceMultiplier: 0,
            maxDistanceMultiplier: 4,
            maxStability: 5,
            returnEase: 3
        };
        Game.player.stability = Game.player.maxStability;
        Game.player.tripThreshold = Game.player.walkThreshold - 200;

        Game.drown = function () {
            Game.playSound('test-bubbling.mp3');
            Game.player.dead = true;
            Game.goto('player-dead-drowned');
            Game.showDeadMenu();
        }

        new Room({
            name: 'title-card',
            menuItems: [
                {
                    description: "1: Start Game",
                    action: function () {
                        Game.goto('ocean-empty');
                        Game.playSoundForever('desolation.mp3');

                        setTimeout(Game.drown,102000);
                    }
                }
            ]
        });

         new Room({
                name: 'ocean-empty'
         });
         new Room({
                name: 'player-dead-drowned'
         });
         new Room({
                name: 'player-dead-exploded'
         });

        new Room({
            name: 'ocean-plateau',

            menuItems: [
                {
                    description: "1: Walk around the perimeter",
                    action: function () {
                        this.perimeter = true;
                        this.choiceMade = true;
                        Game.player.distanceMultiplier = 0;
                        Game.player.maxDistanceMultiplier = 1;
                    },
                    showWhen: function () {
                        return !this.choiceMade;
                    }
                },
                {
                    description: "2: Walk across the plateau",
                    action: function () {
                        this.mineField = true;
                        this.choiceMade = true;
                        Game.player.returnEase--;
                        Game.player.walkThreshold = 900;
                    },
                    showWhen: function () {
                        return !this.choiceMade;
                    }
                },
                {
                    description: "3: Use Flashbulbs",
                    action: function () {
                        Game.player.hasFlashbulbs = false;
                        this.sawThings = true;
                    },
                    showWhen: function () {
                        return Game.player.hasFlashbulbs && !this.choiceMade;
                    }
                }
            ]
        });

        new Room({
            name: 'ocean-2',

            menuItems: [
                {
                    description: "1: Go through the seaweed",
                    action: function () {
                        this.seaweed = true;
                        this.choiceMade = true;
                        Game.player.returnEase--;
                        Game.player.stability = 1;
                        Game.player.maxStability = 1;
                        Game.displayMessage("Message 1");
                    },
                    showWhen: function () {
                        return !this.choiceMade;
                    }
                },
                {
                    description: "2: Option 2",
                    action: function () {
                        Game.displayMessage("Message 2");
                    }
                },
                {
                    description: "3: Option 3",
                    action: function () {
                        Game.displayMessage("Message 3");
                    },
                    showWhen: function () {
                        return Game.player.hasFlashbulbs;
                    }
                }
            ]
        });

        Game.goto('title-card');
    };


});