$(function () {
    Game.beginGame = function () {

        // Starting state
        Game.rooms = {};
        Game.state = {
            rooms: {

            }
        };
        Game.path = {
            landmarks: [
                {
                    distance: 0,
                    roomNames: ['ocean-empty']
                },
                {
                    distance: 100,
                    roomNames: ['ocean-plateau']
                },
                {
                    distance: 200,
                    roomNames: ['ocean-seaweed']
                },
                {
                    distance: 300,
                    roomNames: ['ocean-chasm']
                },
                {
                    distance: 400,
                    roomNames: ['ocean-wreck']
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
                        Game.chooseNextLandmark();
                        Game.playSoundForever('desolation.mp3');

                        Game.state.oxygenTimeoutId = setTimeout(Game.drown,102000);
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

            setup: function () {
                this.listenTo(Game,"trip",this.explode);
            },

            menuItems: [
                {
                    description: "1: Walk around the perimeter",
                    action: function () {
                        this.mineField = false;
                        this.choiceMade = true;
                        Game.player.distanceMultiplier = 0;
                        Game.player.maxDistanceMultiplier = 1;
                    }
                },
                {
                    description: "2: Walk across the plateau",
                    action: function () {
                        this.mineField = true;
                        this.choiceMade = true;
                        Game.player.returnEase--;
                        Game.player.walkThreshold = 900;
                    }
                },
                {
                    description: "3: Use Flashbulbs",
                    action: function () {
                        Game.player.hasFlashbulbs = false;
                        this.sawThings = true;
                    },
                    showWhen: function () {
                        return Game.player.hasFlashbulbs;
                    }
                }
            ],

            explode: function () {
                if (Game.activeRoom == this && this.mineField == true) {
                    Game.player.dead = true;
                    $('body').removeClass('trip');
                    Game.goto('player-dead-exploded');
                    Game.showDeadMenu();
                    Game.playSound('explode.mp3');
                }
            }
        });

        new Room({
            name: 'ocean-seaweed',

            menuItems: [
                {
                    description: "1: Go through the seaweed",
                    action: function () {
                        this.seaweed = true;
                        this.choiceMade = true;
                        Game.player.returnEase--;
                        Game.player.stability = 1;
                        Game.player.maxStability = 1;
                    }
                },
                {
                    description: "2: Circumvent the seaweed",
                    action: function () {
                        this.choiceMade = true;
                        this.seaweed = false;
                    }
                }
            ]
        });

        new Room({
               name: 'ocean-chasm'
        });

        new Room({
               name: 'ocean-wreck'
        });

        Game.goto('title-card');
    };


});