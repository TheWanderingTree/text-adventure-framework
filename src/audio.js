var Audio = function () {
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
        }
        catch(e) {
            console.error('Web Audio API is not supported in this browser');
        }

        filenames = filenames || [];

        for (var i = 0; i < filenames.length; i++) {
            this.loadFile(filenames[i]);
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
            });
        }
        request.send();
    },
    play: function (filename, options) {
        if (!this.context) return;

        options = options || {};
        options.startTime = options.startTime || 0;

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

            source.start(options.startTime);
        }
    }
});
_.extend(Audio.prototype, Backbone.Events);