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

    _.extend(Audio.prototype, {
        buffers: {},

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
            return new Sound(this.context, this.buffers[filename], options);
        }
    });
    Audio.crossFade = function (fromSound, toSound, options) {
        fromSound.fadeDown(options);
        toSound.fadeUp(options);
    };
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

                this.gainNode.connect(this.context.destination);

                if (options.loop) {
                    this.sourceNode.loop = true;
                    if (_.isArray(options.loop)) {
                        this.sourceNode.loopStart = options.loop[0];
                        this.sourceNode.loopEnd = options.loop[1];
                    }
                }

                if (_.isNumber(options.autoplay)) {
                    this.sourceNode.start(options.autoplay);
                }
            }
        },
        play: function (options) {
            if (!this.context) return;

            options = options || {};
            options.when = options.when || 0;
            options.offset = options.offset || 0;
            options.volume = _.isNumber(options.volume) ? options.volume : 1;

            this.gainNode.gain.value = options.volume;

            if (options.duration) {
                this.sourceNode.start(options.when, options.offset, options.duration);
            } else {
                this.sourceNode.start(options.when, options.offset);
            }
        },
        stop: function (when) {
            if (!this.context) return;

            when = when || 0;

            this.sourceNode.stop(when);
        },
        fade: function (options) {
            if (!this.context) return;

            options = options || {};
            options.when = options.when || this.context.currentTime;
            options.volume = _.isNumber(options.volume) ? options.volume : 1;
            options.duration = options.duration || 1;

            this.gainNode.gain.setValueAtTime(this.gainNode.gain.value, options.when);
            this.gainNode.gain.linearRampToValueAtTime(options.volume, options.when + options.duration);
        },
        fadeUp: function (options) {
            if (!this.context) return;

            options = options || {};
            options.volume = 1;

            this.fade(options);
        },
        fadeDown: function (options) {
            if (!this.context) return;

            options = options || {};
            options.volume = 0;

            this.fade(options);
        },
        setVolume: function (value) {
            this.gainNode.gain.value = value;
        }
    });
    _.extend(Sound.prototype, Backbone.Events);
});
