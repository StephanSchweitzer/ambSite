// Gets a picture ready to upload, so any photo works, including one taken
// on a phone. JPEG, PNG and GIF files under the size limit are sent as they
// are. Anything else (HEIC, WebP, a huge phone photo...) is redrawn in the
// browser and sent as a JPEG small enough to fit. The browser applies the
// photo's rotation while redrawing, so portraits don't arrive sideways.
var ImagePrep = (function () {
    var MAX_BYTES = 1.2 * 1024 * 1024;   // what the server accepts
    var MAX_SIDE = 4000;                 // longest side of a converted picture
    var SERVER_TYPES = ['image/jpeg', 'image/png', 'image/gif'];

    function loadImage(file) {
        return new Promise(function (resolve, reject) {
            var url = URL.createObjectURL(file);
            var img = new Image();
            img.onload = function () { resolve({ img: img, url: url }); };
            img.onerror = function () {
                URL.revokeObjectURL(url);
                reject(new Error("This browser can't open this picture. Please choose a JPEG or PNG file."));
            };
            img.src = url;
        });
    }

    function encode(img, scale, quality) {
        var canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
        canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
        var ctx = canvas.getContext('2d');
        // JPEG has no transparency: see-through parts become white
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        return new Promise(function (resolve, reject) {
            canvas.toBlob(function (blob) {
                blob ? resolve(blob) : reject(new Error('The picture could not be converted.'));
            }, 'image/jpeg', quality);
        });
    }

    function jpegName(name) {
        return (name || 'picture').replace(/\.[^.]*$/, '') + '.jpg';
    }

    // Resolves with the File to upload; rejects with an Error whose message
    // can be shown as it is.
    function prepare(file) {
        if (!file) {
            return Promise.reject(new Error('Please choose a picture.'));
        }
        if (SERVER_TYPES.indexOf(file.type) !== -1 && file.size <= MAX_BYTES) {
            return Promise.resolve(file);
        }
        if (file.type && file.type.indexOf('image/') !== 0 && !/\.(heic|heif)$/i.test(file.name)) {
            return Promise.reject(new Error("This file isn't a picture. Please choose a photo or image file."));
        }

        return loadImage(file).then(function (loaded) {
            var img = loaded.img;
            var scale = Math.min(1, MAX_SIDE / Math.max(img.naturalWidth, img.naturalHeight));
            var quality = 0.92;
            var tries = 0;

            function attempt() {
                return encode(img, scale, quality).then(function (blob) {
                    if (blob.size <= MAX_BYTES || tries >= 12) {
                        URL.revokeObjectURL(loaded.url);
                        if (blob.size > MAX_BYTES) {
                            throw new Error('This picture is too large even after shrinking it. Please choose a smaller one.');
                        }
                        return new File([blob], jpegName(file.name), { type: 'image/jpeg' });
                    }
                    tries++;
                    // Lower the quality a little first, then the size
                    if (quality > 0.8) {
                        quality -= 0.06;
                    } else {
                        scale *= 0.85;
                    }
                    return attempt();
                });
            }
            return attempt();
        });
    }

    return { prepare: prepare };
})();
