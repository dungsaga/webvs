/**
 * Copyright (c) 2013-2015 Azeem Arshad
 * See the file license.txt for copying permission.
 */

(function(Webvs) {

// ResourceManager manages async loading and caching of resources.
// Basically, it maintains a map of fileNames to URI for the resource.
// When a request for resource fileName is received, the uri is looked up
// and the file is either async loaded or served from cache. This also manages
// a ready state with callbacks that tells when one or more resources are being loaded and
// when all resources are ready.
function ResourceManager(packs) {
    if(packs) {
        if(!_.isArray(packs)) {
            packs = [packs];
        }
        this.packs = packs;
    } else {
        this.packs = [];
    }
    this.clear();
}
Webvs.ResourceManager = Webvs.defineClass(ResourceManager, Object, Webvs.ModelLike, {
    // Register a filename and a URI in the resource manager.
    registerUri: function(fileName, uri) {
        if(_.isString(fileName) && _.isString(uri)) {
            this.uris[fileName] = uri;
        } else {
            _.extend(this.uris, fileName);
        }
    },

    get: function(key, value) {
        if(key == "uris") {
            return this.uris;
        } else if(key == "packs") {
            return this.packs;
        }
    },

    setAttribute: function(key, value, options) {
        if(key == "uris") {
            this.uris = value;
            return true;
        }
        return false;
    },

    toJSON: function() {
        return {
            uris: _.clone(this.uris)
        };
    },

    // Clears state, uri mappings and caches. Browser caches still apply.
    clear: function() {
        this.uris = {};
        this.images = {};
        this.waitCount = 0;
        this.ready = true;
    },

    destroy: function() {
        this.stopListening();
    },

    _getUri: function(fileName) {
        var uri = this.uris[fileName];
        if(uri) {
            return uri;
        }
        for(var i = this.packs.length-1;i >= 0;i--) {
            var pack = this.packs[i];
            if(pack.fileNames.indexOf(fileName) != -1) {
                return pack.prefix + fileName;
            }
        }
    },

    _loadStart: function() {
        this.waitCount++;
        if(this.waitCount == 1) {
            this.ready = false;
            this.trigger("wait");
        }
    },

    _loadEnd: function() {
        this.waitCount--;
        if(this.waitCount === 0) {
            this.ready = true;
            this.trigger("ready");
        }
    },
    
    // Loads an Image resource
    getImage: function(fileName, success, error, context) {
        context = context || this;
        var this_ = this;
        var image = this.images[fileName];
        if(image) { // check in cache
            if(success) {
                success.call(context, image);
            }
            return;
        }

        // load file
        var uri = this._getUri(fileName);
        if(!uri) {
            throw new Error("Unknown image file " + fileName);
        }
        image = new Image();
        if(uri.indexOf("data:") !== 0) {
            // add cross origin attribute for
            // remote images
            image.crossOrigin = "anonymous";
        }
        image.onload = function() {
            this_.images[fileName] = image;
            if(success) {
                success.call(context, image);
            }
            this_._loadEnd();
        };
        if(error) {
            image.onError = function() {
                if(error.call(context)) { 
    
                    // then we treat this load as complete
                    // and handled properly
                    this_._loadEnd();
                }
            };
        }
        this._loadStart();
        image.src = uri;
    }
});

})(Webvs);
