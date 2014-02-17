$(function () {
    window.Audio = function () {
        if (this.initialize) {
            this.initialize.apply(this, arguments);
        }
    };
    window.Sound = function () {
        if (this.initialize) {
            this.initialize.apply(this, arguments);
        }
    };
    window.CrossFade = function () {
        if (this.initialize) {
            this.initialize.apply(this, arguments);
        }
    };

    _.extend(Audio.prototype, {
        buffers: {},
        managedSounds: {},
        initialize: function (filenames) {
            try {
                window.AudioContext = window.AudioContext||window.webkitAudioContext;
                this.context = new AudioContext();

                filenames = filenames || [];

                for (var i = 0; i < filenames.length; i++) {
                    this.loadAsArrayBuffer(filenames[i]);
                }
            }
            catch(e) {
                console.error('Web Audio API is not supported in this browser');
            }
        },
        loadAsArrayBuffer: function (filename) {
            if (!this.context) return;

            var me = this;
            var request = new XMLHttpRequest();
            request.open('GET', "../assets/sounds/" + filename, true);
            request.responseType = 'arraybuffer';

            me.buffers[filename] = null;

            request.onload = function() {
                me.context.decodeAudioData(request.response, function(buffer) {
                    me.buffers[filename] = buffer;

                    me.trigger(filename + ":loaded");

                    if (_.all(me.buffers,function (buffer) { return buffer !== null; })) {
                        me.trigger("all-loaded");
                    }
                }, function () {
                    me.buffers[filename] = false;
                    if (_.all(me.buffers,function (buffer) { return buffer !== null; })) {
                        me.trigger("all-loaded");
                    }
                });
            }
            request.send();
        },
        createSound: function (filename, options) {
            options = options || {};

            var sound = new Sound(this.context, this.buffers[filename], options);
            if (options.loop) {
                this.managedSounds[filename] = sound;
            }
            return sound;
        },
        get: function (filename) {
            return this.managedSounds[filename];
        },
        now: function () {
            return this.context.currentTime;
        },
        listener: function () {
            return this.context.listener;
        }
    });
    _.extend(Audio.prototype, Backbone.Events);

    _.extend(Sound.prototype, {
        initialize: function (context, buffer, options) {
            this.context = context;
            if (!this.context) return;

            options = options || {};

            if (buffer) {
                this.sourceNode = this.context.createBufferSource();
                this.sourceNode.buffer = buffer;

                this.gainNode = this.context.createGain();
                this.sourceNode.connect(this.gainNode);

                if (options.position) {
                    this.pannerNode = this.context.createPanner();
                    this.gainNode.connect(this.pannerNode);

                    options.position = _.isArray(options.position) ? options.position : [0,0,0];

                    this.setPosition(options.position[0], options.position[1], options.position[2]);

                    this.pannerNode.connect(this.context.destination);
                } else {
                    this.gainNode.connect(this.context.destination);
                }

                if (options.loop) {
                    this.sourceNode.loop = true;
                    if (_.isObject(options.loop)) {
                        if (options.loop.start) {
                            this.sourceNode.loopStart = options.loop.start;
                        }
                        if (options.loop.end) {
                            this.sourceNode.loopEnd = options.loop.end;
                        }
                    }
                }

                if (options.playbackRate) {
                    this.sourceNode.playbackRate.value = options.playbackRate;
                }

                this.setVolume(_.isNumber(options.volume) ? options.volume : 1);
            }
        },

        play: function (options) {
            if (!this.context) return;

            options = options || {};
            options.when = options.when || 0;
            options.offset = options.offset || 0;

            if (_.isNumber(options.volume)) {
                this.setVolume(options.volume);
            }

            if (options.duration) {
                this.sourceNode.start(options.when, options.offset, options.duration);
            } else {
                this.sourceNode.start(options.when, options.offset);
            }
            return this;
        },
        stop: function (when) {
            if (!this.context) return;

            when = when || 0;

            this.sourceNode.stop(when);
            return this;
        },

        fade: function (options) {
            if (!this.context) return;

            options = options || {};

            if (_.isNumber(options.volume)) {
                options.when = options.when || this.context.currentTime;
                options.duration = options.duration || 1;

                this.gainNode.gain.setValueAtTime(this.gainNode.gain.value, options.when);
                this.gainNode.gain.linearRampToValueAtTime(options.volume, options.when + options.duration);
            } else {
                console.error("Cannot fade to an undefined volume.");
            }
            return this;
        },
        fadeUp: function (options) {
            if (!this.context) return;

            options = options || {};
            options.volume = 1;

            this.fade(options);
            return this;
        },
        fadeDown: function (options) {
            if (!this.context) return;

            options = options || {};
            options.volume = 0;

            this.fade(options);
            return this;
        },

        setVolume: function (value) {
            this.gainNode.gain.value = value;
            return this;
        },
        setPosition: function (x, y, z) {
            if (!this.pannerNode) return;

            this.pannerNode.setPosition(x, y, z);
            return this;
        }
    });
    _.extend(Sound.prototype, Backbone.Events);


    _.extend(CrossFade.prototype, {
        initialize: function (fromSound, toSound, initMix) {
            this.fromSound = fromSound;
            this.toSound = toSound;
            this.setMix(initMix || 0);
        },
        setMix: function (value) {
            if (!_.isNumber(value) || value > 1 || value < 0) return;

            var gain1 = Math.cos(value * 0.5*Math.PI);
            var gain2 = Math.cos((1.0 - value) * 0.5*Math.PI);

            this.fromSound.setVolume(gain1);
            this.toSound.setVolume(gain2);
        }
    });
});
