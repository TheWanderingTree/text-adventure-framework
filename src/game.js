$(function () {
    Game.beginGame = function () {

        // Starting state
        Game.rooms = {};
        Game.state = {
            rooms: {

            },
            retractionTime: 0,
            ripcordSpeed: 0,
            maxRipcordSpeed: 40,
            exploring: true
        };
        Game.path = {
            landmarks: [
                {
                    distance: 0,
                    roomNames: ['ocean-empty']
                },
                {
                    distance: 200,
                    roomNames: ['ocean-plateau']
                },
                {
                    distance: 400,
                    roomNames: ['ocean-seaweed']
                },
                {
                    distance: 600,
                    roomNames: ['ocean-chasm']
                },
                {
                    distance: 800,
                    roomNames: ['ocean-wreck']
                }
            ],
            roomsChosen: [],
            encounteringObstacle: false
        }
        Game.player = {
            canWalk: false,
            hasFlashbulbs: true,
            distance: 0,
            walkThreshold: 450,
            distanceMultiplier: 0,
            maxDistanceMultiplier: 14,
            maxStability: 5,
            obstacleProbability: 25
        };
        Game.player.stability = Game.player.maxStability;
        Game.player.tripThreshold = Game.player.walkThreshold - 200;

        Game.drown = function () {
            Game.playSound('test-bubbling.mp3');
            Game.player.dead = true;
            Game.goto('player-dead-drowned');
            Game.showDeadMenu();
        }

        Game.returnSafe = function () {
            Game.goto('submarine-airlock')
            Game.showSurviveMenu();
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
            name: 'ocean-empty',

            setup: function () {
                this.choiceMade = true;
            },

            obstacles: [
                {
                    description: "I sensed something approaching on my left...",
                    sound: "tick.wav",
                    toAvoid: Game.AVOID_OPTIONS.LEFT,
                    onFail: function () { this.snagged(); }
                }
            ],

            snagged: function () {
                $('body').addClass('snag');
                Game.playSound('snagged.wav');
                Game.state.ripcordSpeed = 0;
            }
        });

        new Room({
           name: 'player-dead-drowned'
        });
        new Room({
           name: 'player-dead-exploded'
        });
        new Room({
           name: 'submarine-airlock'
        });
        new Room({
            name: 'ocean-plateau',

            setup: function () {
                var me = this;
                this.listenTo(Game,"trip",function () {
                    if (Game.activeRoom == me && me.mineField) {
                        Game.activeRoom.explode();
                    }
                });
            },

            obstacles: [
                {
                    description: "You hear a ticking sound behind you... *cough* on your left I think.",
                    sound: "tick.wav",
                    toAvoid: Game.AVOID_OPTIONS.LEFT,
                    onFail: function () { this.explode(); }
                },
                {
                    description: "You hear a ticking sound behind you... *cough* on your right I think.",
                    sound: "tick.wav",
                    toAvoid: Game.AVOID_OPTIONS.RIGHT,
                    onFail: function () { this.explode(); }
                },
                {
                    description: "You hear a ticking sound behind you... *cough* YEAH IT'S RIGHT BEHIND YOU.",
                    sound: "tick.wav",
                    toAvoid: Game.AVOID_OPTIONS.BOTH,
                    onFail: function () { this.explode(); }
                }
            ],

            menuItems: [
                {
                    description: "1: Walk around the perimeter",
                    action: function () {
                        this.mineField = false;
                        this.choiceMade = true;
                        Game.player.distanceMultiplier = 0;
                        Game.player.maxDistanceMultiplier = 3;
                    }
                },
                {
                    description: "2: Walk across the plateau",
                    action: function () {
                        this.mineField = true;
                        this.choiceMade = true;
                        Game.player.obstacleProbability += 20;
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
                Game.player.dead = true;
                $('body').removeClass('trip');
                Game.goto('player-dead-exploded');
                Game.showDeadMenu();
                Game.playSound('explode.mp3');
            }
        });

        new Room({
            name: 'ocean-seaweed',

            menuItems: [
                {
                    description: "1: Go through the seaweed",
                    action: function () {
                        this.choiceMade = true;
                        this.seaweed = true;
                        Game.player.obstacleProbability += 10;
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