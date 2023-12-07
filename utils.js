// util functions for frogger
export function degToRad(deg) {
    return deg * Math.PI / 180;
}

export function radToDeg(deg) {
    return deg * 180 / Math.PI;
}

// get the JSON file from the passed URL
function getJSONFile(url, descr) {
    try {
        if ((typeof (url) !== "string") || (typeof (descr) !== "string"))
            throw "getJSONFile: parameter not a string";
        else {
            var httpReq = new XMLHttpRequest(); // a new http request
            httpReq.open("GET", url, false); // init the request
            httpReq.send(null); // send the request
            var startTime = Date.now();
            while ((httpReq.status !== 200) && (httpReq.readyState !== XMLHttpRequest.DONE)) {
                if ((Date.now() - startTime) > 3000)
                    break;
            } // until its loaded or we time out after three seconds
            if ((httpReq.status !== 200) || (httpReq.readyState !== XMLHttpRequest.DONE))
                throw "Unable to open " + descr + " file!";
            else
                return JSON.parse(httpReq.response);
        } // end if good params
    } // end try

    catch (e) {
        console.log(e);
        return (String.null);
    }
} // end get input json file

export function isPowerOf2(value) {
    return (value & (value - 1)) === 0;
}

export function handleLoadedTexture(texture, gl) {
    gl.bindTexture(gl.TEXTURE_2D, texture);
    // gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, texture.image);

    if (isPowerOf2(texture.image.width) && isPowerOf2(texture.image.height)) {
        // Yes, it's a power of 2. Generate mips.
        gl.generateMipmap(gl.TEXTURE_2D);
    } else {
        // No, it's not a power of 2. Turn of mips and set wrapping to clamp to edge
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        //gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    }
    texture.isLoaded = true;
    gl.bindTexture(gl.TEXTURE_2D, null);
}

//a function to initialize the textures for every object in space
export function initTexture(imgSrc, gl) {
    var texture = gl.createTexture();
    texture.image = new Image();
    texture.image.crossOrigin = 'anonymous';
    texture.isLoaded = false;
    texture.image.onload = function () {
        handleLoadedTexture(texture, gl);
    }

    if (imgSrc) {
        texture.image.src = imgSrc;     //"https://ncsucgclass.github.io/prog3/" + imgSrc;
    } else {
        texture.isLoaded = false;
    }

    return texture
}

function generateCuboidTriangles(width, height, depth) {
    const vertices = [
        [-width / 2, -height / 2, depth / 2], // 0
        [width / 2, -height / 2, depth / 2], // 1
        [width / 2, height / 2, depth / 2], // 2
        [-width / 2, height / 2, depth / 2], // 3
        [-width / 2, -height / 2, -depth / 2], // 4
        [width / 2, -height / 2, -depth / 2], // 5
        [width / 2, height / 2, -depth / 2], // 6
        [-width / 2, height / 2, -depth / 2] // 7
    ];

    const normals = [
        [0, 0, 1], // front
        [0, 0, 1], // front
        [1, 0, 0], // right
        [1, 0, 0], // right
        [0, 1, 0], // top
        [0, 1, 0], // top
        [0, 0, -1], // back
        [0, 0, -1], // back
        [-1, 0, 0], // left
        [-1, 0, 0], // left
        [0, -1, 0], // bottom
        [0, -1, 0] // bottom
    ];

    const uvs = [
        [0, 1], // 0
        [1, 1], // 1
        [1, 0], // 2
        [0, 0], // 3
        [0, 1], // 4
        [1, 1], // 5
        [1, 0], // 6
        [0, 0], // 7
    ];

    const triangles = [
        [0, 1, 2], // front
        [0, 2, 3],
        [1, 5, 6], // right
        [1, 6, 2],
        [4, 7, 6], // back
        [4, 6, 5],
        [0, 4, 5], // left
        [0, 5, 1],
        [3, 2, 6], // top
        [3, 6, 7],
        [0, 3, 7], // bottom
        [0, 7, 4]
    ];

    return {vertices, normals, uvs, triangles};
}
