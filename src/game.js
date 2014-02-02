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
        Game.player = {
            distance: 0,
            distanceMultiplier: 0,
            hasFlashbulbs: true,
            enteredEvent1: false,
            maxStability: 5,
            maxDistanceMultiplier: 15
        };
        Game.player.stability = Game.player.maxStability;

        new State({
            name: 'title-card',
            menuItems: [
                {
                    description: "1: Start Game",
                    action: function () {
                        Game.goto('ocean-empty');
                        setTimeout(function() {
                            Game.player.dead = true;
                            Game.goto('player-dead-drowned');
                            Game.showDeadMenu();
                        },100000);
                    }
                }
            ]
        });

         new State({
                    name: 'ocean-empty',
                    menuItems: [
                        {

                        }
                    ]
         });

          new State({
                     name: 'player-dead-drowned',
                     menuItems: [
                         {

                         }
                     ]
          });

        new State({
            name: 'ocean-1',

            menuItems: [
                {
                    description: "1: Walk around the perimeter",
                    action: function () {
                        Game.displayMessage("The mines seemed like an unnecessary risk. I turned to the left and began trudging along the perimeter of the plateau...");
                    }
                },
                {
                    description: "2: Walk across the plateau",
                    action: function () {
                        Game.displayMessage("I didn't have time to circle around. I pushed forward into the minefield, confident that I could slip through unharmed...");
                    }
                },
                {
                    description: "3: Use Flashbulbs",
                    action: function () {
                        Game.displayMessage("The plateau was covered in explosive proximity mines, with just a few feet between each one. Around the perimeter, the terrain looked to be rough and uneven.");
                        Game.player.hasFlashbulbs = false;
                    },
                    showWhen: function () {
                        return Game.player.hasFlashbulbs;
                    }
                }
            ]
        });

        new State({
            name: 'ocean-2',

            menuItems: [
                {
                    description: "1: Option 1",
                    action: function () {
                        Game.displayMessage("Message 1");
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