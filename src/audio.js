var Audio = function () {
    if (this.initialize) {
        this.initialize.apply(this, arguments);
    }
};
_.extend(Audio.prototype, {
    buffers: {},
    sounds: [],
    initialize: function (filenames) {
        try {
            window.AudioContext = window.AudioContext||window.webkitAudioContext;
            this.context = new AudioContext();

            filenames = filenames || [];

            for (var i = 0; i < filenames.length; i++) {
                this.loadFile(filenames[i]);
            }
        }
        catch(e) {
            console.error('Web Audio API is not supported in this browser');
        }
    },
    loadFile: function (filename) {
        if (!this.context) return;

        var me = this;
        var request = new XMLHttpRequest();
        request.open('GET', "../assets/sounds/" + filename, true);
        request.responseType = 'arraybuffer';

        me.buffers[filename] = null;

        request.onload = function() {
            me.context.decodeAudioData(request.response, function(buffer) {
                me.buffers[filename] = buffer;
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
    newSound: function (filename, options) {
        if (!this.context) return;

        options = options || {};

        if (this.buffers[filename]) {
            var source = this.context.createBufferSource();
            source.buffer = this.buffers[filename];
            source.connect(this.context.destination);

            if (options.loop) {
                source.loop = true;
                if (_.isArray(options.loop)) {
                    source.loopStart = options.loop[0];
                    source.loopEnd = options.loop[1];
                }
            }

            var sound = {
                source: source
            };
            var soundId = this.sounds.length;
            this.sounds.push(sound);

            if (_.isNumber(options.autoplay)) {
                source.start(options.autoplay);
            }
            return soundId;
        }
    },
    play: function (soundId, startTime) {
        if (!this.context) return;

        var sound = this.sounds[soundId];
        if (sound) {
            sound.source.start(startTime || 0);
        }
    },
    stop: function (soundId, stopTime) {
        if (!this.context) return;

        var sound = this.sounds[soundId];
        if (sound) {
            sound.source.stop(stopTime || 0);
        }
    }
});
_.extend(Audio.prototype, Backbone.Events);