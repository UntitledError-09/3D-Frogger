/* GLOBAL CONSTANTS AND VARIABLES */

/* assignment specific globals */
import {mat4, vec3, vec4} from "./gl_lib";

const INPUT_TRIANGLES_URL = "triangles.json"; // triangles file loc
const INPUT_ELLIPSOIDS_URL = "ellipsoids.json"; // triangles file loc
const INPUT_LIGHTS_URL = "lights.json"; // triangles file loc
var INPUT_BACKGROUND = "sky.jpg";
var Eye = new vec4.fromValues(0.5, 0.5, -0.5, 1.0); // default eye position in world space
var Center = new vec3.fromValues(0.5, 0.5, 0.0); // default eye position in world space
var Up = new vec3.fromValues(0.0, 1.0, 0.0); // default eye position in world space
var rotationStep = degToRad(10);
var translationStep = 0.05;
var scalingStep = 1.2;
var SUBDIVISION = 30;
var makeItYourOwn = false;
var availableTextures = ["earth.png", "rocktile.jpg", "stars.jpg", "leaf.small.png", "retro.jpg"]

/* webgl globals */
var gl = null; // the all powerful gl object. It's all here folks!
export var inputMeshes;
var inputLights;
var programInfo;
var selectedMesh = null;

var perspectiveMatrix = mat4.create();
var modelViewMatrix = mat4.create();
var normalMatrix = mat4.create();
var imageContext;
var part3_flag = true;
var MIYO_angle = 0;

// Keyboard Interactions
document.addEventListener('keydown', (ev) => {
    console.log(ev.key)
    // console.log("pre2:", modelViewMatrix)
    var translateVector = vec3.create();
    var rotateVector;
    var scaleVector;
    vec3.subtract(translateVector, Center, Eye);
    vec3.scale(translateVector, translateVector, translationStep);

    // mat4.getRotation(Up, modelViewMatrix)

    switch (ev.key) {
        // View Change
        case 'a':
            // translate eye left
            translateVector = vec4.fromValues(translationStep, 0, 0, 1)
            // mat4.rotate()
            vec4.add(Eye, Eye, translateVector)
            vec4.add(Center, Center, translateVector)
            break;
        case 'd':
            // translate eye left
            translateVector = vec4.fromValues(-translationStep, 0, 0, 1)
            vec4.add(Eye, Eye, translateVector)
            vec4.add(Center, Center, translateVector)
            break;
        case 'w':
            // translate eye forward
            translateVector = vec4.fromValues(0, 0, translationStep, 1)
            vec4.add(Eye, Eye, translateVector)
            vec4.add(Center, Center, translateVector)
            break;
        case 's':
            // translate eye backward
            translateVector = vec4.fromValues(0, 0, -translationStep, 1)
            vec4.add(Eye, Eye, translateVector)
            vec4.add(Center, Center, translateVector)
            break;
        case 'q':
            // translate eye up
            translateVector = vec4.fromValues(0, translationStep, 0, 1)
            vec4.add(Eye, Eye, translateVector)
            vec4.add(Center, Center, translateVector)
            break;
        case 'e':
            // translate eye down
            translateVector = vec4.fromValues(0, -translationStep, 0, 1)
            vec4.add(Eye, Eye, translateVector)
            vec4.add(Center, Center, translateVector)
            break;
        case 'A':
            // yaw eye left
            vec3.rotateY(Center, Center, Eye, rotationStep)
            break;
        case 'D':
            // yaw eye right
            vec3.rotateY(Center, Center, Eye, -rotationStep)
            break;
        case 'W':
            // pitch eye up
            vec3.rotateX(Center, Center, Eye, -rotationStep)
            vec3.rotateX(Up, Up, Eye, -rotationStep)
            break;
        case 'S':
            // pitch eye down
            vec3.rotateX(Center, Center, Eye, rotationStep)
            vec3.rotateX(Up, Up, Eye, rotationStep)
            break;
        case 'ArrowRight':
            // select next mesh
            if (selectedMesh !== null) {
                inputMeshes[selectedMesh].toggleSelection(false);
                console.log(selectedMesh, (selectedMesh + 1) % inputMeshes.length)
                selectedMesh = (selectedMesh + 1) % inputMeshes.length
            } else {
                selectedMesh = 0;
            }
            inputMeshes[selectedMesh].toggleSelection(true);
            break;
        case 'ArrowLeft':
            // select previous mesh
            if (selectedMesh !== null) {
                inputMeshes[selectedMesh].toggleSelection(false);
                console.log(selectedMesh, (selectedMesh + 1) % inputMeshes.length)
                selectedMesh = (selectedMesh - 1) % inputMeshes.length
            } else {
                selectedMesh = inputMeshes.length - 1;
            }
            if (selectedMesh < 0) {
                selectedMesh = inputMeshes.length - 1;
            }
            inputMeshes[selectedMesh].toggleSelection(true);
            break;
        case ' ':
            // deselect mesh
            if (selectedMesh !== null) {
                inputMeshes[selectedMesh].toggleSelection(false);
            }
            selectedMesh = null
            break;
        case 'k':
            // translate selection left
            if (selectedMesh !== null) {
                translateVector = vec3.fromValues(translationStep, 0, 0)
                inputMeshes[selectedMesh].translate(translateVector);
            }
            break;
        case ';':
            // translate selection right
            if (selectedMesh !== null) {
                translateVector = vec3.fromValues(-translationStep, 0, 0)
                inputMeshes[selectedMesh].translate(translateVector);
            }
            break;
        case 'o':
            // translate selection forward
            if (selectedMesh !== null) {
                translateVector = vec3.fromValues(0, 0, translationStep)
                inputMeshes[selectedMesh].translate(translateVector);
            }
            break;
        case 'l':
            // translate selection backward
            if (selectedMesh !== null) {
                translateVector = vec3.fromValues(0, 0, -translationStep)
                inputMeshes[selectedMesh].translate(translateVector);
            }
            break;
        case 'i':
            // translate selection up
            if (selectedMesh !== null) {
                translateVector = vec3.fromValues(0, translationStep, 0)
                inputMeshes[selectedMesh].translate(translateVector);
            }
            break;
        case 'p':
            // translate selection down
            if (selectedMesh !== null) {
                translateVector = vec3.fromValues(0, -translationStep, 0)
                inputMeshes[selectedMesh].translate(translateVector);
            }
            break;
        case 'K':
            // yaw selection left
            if (selectedMesh !== null) {
                rotateVector = vec3.fromValues(0, 1, 0)
                inputMeshes[selectedMesh].rotate(rotateVector);
            }
            break;
        case ':':
            // yaw selection right
            if (selectedMesh !== null) {
                rotateVector = vec3.fromValues(0, -1, 0)
                inputMeshes[selectedMesh].rotate(rotateVector);
            }
            break;
        case 'O':
            // pitch selection up
            if (selectedMesh !== null) {
                rotateVector = vec3.fromValues(1, 0, 0)
                inputMeshes[selectedMesh].rotate(rotateVector);
            }
            break;
        case 'L':
            // pitch selection down
            if (selectedMesh !== null) {
                rotateVector = vec3.fromValues(-1, 0, 0)
                inputMeshes[selectedMesh].rotate(rotateVector);
            }
            break;
        case 'I':
            // roll selection clockwise
            if (selectedMesh !== null) {
                rotateVector = vec3.fromValues(0, 0, -1)
                inputMeshes[selectedMesh].rotate(rotateVector);
            }
            break;
        case 'P':
            // roll selection anti-clockwise
            if (selectedMesh !== null) {
                rotateVector = vec3.fromValues(0, 0, 1)
                inputMeshes[selectedMesh].rotate(rotateVector);
            }
            break;
        case '!':
            // re-run main with make it your own
            main({makeItYourOwn: true})
            break;
        case 'b':
            // switch between replace and modulate modes
            part3_flag = !part3_flag;
            break;
    }

    // refresh perspective and model view with current eye, lookAt, and up
    mat4.lookAt(modelViewMatrix, Eye, Center, Up)
    // recalculate normal matrix
    mat4.invert(normalMatrix, modelViewMatrix)
    mat4.transpose(normalMatrix, normalMatrix)
})

// ASSIGNMENT HELPER FUNCTIONS

function generateEllipsoidTriangles(majorAxisX, majorAxisY, majorAxisZ, subdivision = 30) {
    const vertices = [];
    const normals = [];
    const uvs = [];
    const triangles = [];

    for (let i = 0; i <= subdivision; i++) {
        const phi = (i * Math.PI) / subdivision;
        const cosPhi = Math.cos(phi);
        const sinPhi = Math.sin(phi);

        for (let j = 0; j <= subdivision; j++) {
            const theta = (j * 2 * Math.PI) / subdivision;
            const cosTheta = Math.cos(theta);
            const sinTheta = Math.sin(theta);

            const x = majorAxisX * sinPhi * cosTheta;
            const y = majorAxisY * sinPhi * sinTheta;
            const z = majorAxisZ * cosPhi;

            const u = 1 - j / subdivision;
            const v = 1 - i / subdivision;

            vertices.push([x, y, z]);
            normals.push([x / majorAxisX, y / majorAxisY, z / majorAxisZ]);
            uvs.push([u, v]);

            if (i < subdivision && j < subdivision) {
                const a = i * (subdivision + 1) + j;
                const b = a + subdivision + 1;
                const c = b + 1;
                const d = a + 1;
                triangles.push([a, b, d]);
                triangles.push([b, c, d]);
            }
        }
    }

    return {vertices, normals, uvs, triangles};
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


function degToRad(deg) {
    return deg * Math.PI / 180;
}

function radToDeg(deg) {
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

// set up the webGL environment
function setupWebGL() {
    if (makeItYourOwn) {
        INPUT_BACKGROUND = "stars.jpg"
    }
    var imageCanvas = document.getElementById("myImageCanvas"); // create a 2d canvas
    var cw = imageCanvas.width, ch = imageCanvas.height;
    imageContext = imageCanvas.getContext("2d");
    var bkgdImage = new Image();
    bkgdImage.crossOrigin = "Anonymous";
    bkgdImage.src = "" + INPUT_BACKGROUND;
    bkgdImage.onload = function () {
        var iw = bkgdImage.width, ih = bkgdImage.height;
        imageContext.drawImage(bkgdImage, 0, 0, iw, ih, 0, 0, cw, ch);
    }


    // Get the canvas and context
    var canvas = document.getElementById("myWebGLCanvas"); // create a js canvas
    gl = canvas.getContext("webgl"); // get a webgl object from it

    try {
        if (gl == null) {
            throw "unable to create gl context -- is your browser gl ready?";
        } else {
            //gl.clearColor(0.0, 0.0, 0.0, 1.0); // use black when we clear the frame buffer
            gl.clearDepth(1.0); // use max when we clear the depth buffer
            gl.enable(gl.DEPTH_TEST); // use hidden surface removal (with zbuffering)
        }
    } // end try

    catch (e) {
        console.log(e);
    } // end catch

} // end setupWebGL

function isPowerOf2(value) {
    return (value & (value - 1)) == 0;
}

function handleLoadedTexture(texture) {
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
function initTexture(imgSrc) {
    var texture = gl.createTexture();
    texture.image = new Image();
    texture.image.crossOrigin = 'anonymous';
    texture.isLoaded = false;
    texture.image.onload = function () {
        handleLoadedTexture(texture);
    }

    if (imgSrc) {
        texture.image.src = imgSrc;     //"https://ncsucgclass.github.io/prog3/" + imgSrc;
    } else {
        texture.isLoaded = false;
    }

    return texture
}

function initRandomMesh(mesh) {
    mesh.center = vec3.fromValues(Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random() * 2 - 1)
    mesh.material = {
        ambient: [0.05, 0.05, 0.05],
        diffuse: [Math.random(), Math.random(), Math.random()],
        // diffuse: [1, 1, 1],
        specular: [1, 1, 1],
        n: (Math.random() + 1) * 20,
        alpha: Math.random(),
        texture: availableTextures[Math.floor(Math.random() * availableTextures.length)]
    }
    mesh.rotationAxis = vec3.fromValues(Math.random(), Math.random(), Math.random())
    mesh.rotationAngle = Math.random() * Math.PI
    console.log(mesh)
    inputMeshes.push(mesh)
}

function loadMeshes(options = {makeItYourOwn: false}) {

    inputLights = getJSONFile(INPUT_LIGHTS_URL, "lights")
    if (inputLights === String.null) {
        throw "Unable to fetch lights!"
    }
    inputMeshes = getJSONFile(INPUT_TRIANGLES_URL, "triangles")
    if (inputMeshes === String.null) {
        throw "Unable to fetch triangles!"
    }
    var inputEllipsoids = getJSONFile(INPUT_ELLIPSOIDS_URL, "ellipsoids")
    if (inputMeshes === String.null) {
        throw "Unable to fetch ellipsoids!"
    }

    if (makeItYourOwn) {
        inputEllipsoids = []
        inputLights = [
            {"x": -1000, "y": 10, "z": -1000, "ambient": [1, 1, 1], "diffuse": [1, 1, 1], "specular": [1, 1, 1]},
        ]
        inputMeshes = []

        Eye = vec4.fromValues(0, 0, -1.5, 1)
        Center = vec3.fromValues(0, 0, -1.0)
        Up = vec3.fromValues(0, 1, 0)

        // random cuboids and ellipsoids
        // for (let i = 0; i < 30; i++) {
        //     initRandomMesh(generateCuboidTriangles(0.05 + Math.random() / 10, 0.05 + Math.random() / 10, 0.05 + Math.random() / 10))
        //     initRandomMesh(generateEllipsoidTriangles(0.05 + Math.random() / 10, 0.05 + Math.random() / 10, 0.05 + Math.random() / 10, SUBDIVISION))
        // }

        // earth
        var earth_mesh = generateEllipsoidTriangles(0.5, 0.5, 0.49, 30);
        earth_mesh.center = vec3.fromValues(0, 0, 0)
        earth_mesh.material = {
            ambient: [0.05, 0.05, 0.10],
            diffuse: [0.2, 0.2, 1.0],
            specular: [1, 1, 0.8],
            n: 2,
            alpha: 1.0,
            texture: "earth_filled.png"
        }
        earth_mesh.rotationAxis = vec3.fromValues(-1, 0, 0)
        earth_mesh.rotationAngle = degToRad(90)
        inputMeshes.push(earth_mesh)

        // moon
        var moon = generateEllipsoidTriangles(0.5 / 1.5, 0.49 / 1.5, 0.49 / 1.5, 30);
        moon.center = vec3.fromValues(-1.25, 1.25, 1.25)
        moon.material = {
            ambient: [0.05, 0.05, 0.10],
            diffuse: [0.2, 0.2, 1.0],
            specular: [1, 1, 0.8],
            n: 2,
            alpha: 1.0,
            texture: "moon.jpeg"
        }
        moon.rotationAxis = vec3.fromValues(-1, 0, 0)
        moon.rotationAngle = degToRad(90)
        inputMeshes.push(moon)
    }


    // init light sources
    inputLights.lightsArr = []
    inputLights.transLightsArr = []
    inputLights.ambientArr = []
    inputLights.diffuseArr = []
    inputLights.specularArr = []
    inputLights.forEach(light => {
        inputLights.lightsArr.push(light.x, light.y, light.z)
        inputLights.ambientArr.push(...light.ambient)
        inputLights.diffuseArr.push(...light.diffuse)
        inputLights.specularArr.push(...light.specular)
    })
    inputLights.lightsArr = new Float32Array(inputLights.lightsArr)
    inputLights.ambientArr = new Float32Array(inputLights.ambientArr)
    inputLights.diffuseArr = new Float32Array(inputLights.diffuseArr)
    inputLights.specularArr = new Float32Array(inputLights.specularArr)

    // // init ellipsoids
    // inputEllipsoids.forEach(ellipsoid => {
    //     var meshData = generateEllipsoidVertices(ellipsoid.a, ellipsoid.b, ellipsoid.c, NUM_LONGITUDES, NUM_LATITUDES)
    //     meshData.material = {
    //         ambient: ellipsoid.ambient,
    //         diffuse: ellipsoid.diffuse,
    //         specular: ellipsoid.specular,
    //         n: ellipsoid.n
    //     }
    //     meshData.center = vec3.fromValues(ellipsoid.x, ellipsoid.y, ellipsoid.z)
    //     inputMeshes.push(meshData)
    // })

    inputMeshes.forEach((mesh) => {
        mesh.texture = undefined;
        mesh.buffers = {};
        mesh.indexArr = [];
        mesh.uvArr = [];
        mesh.vertexArr = [];
        mesh.normalArr = [];
        mesh.viewMatrix = mat4.create();
        mesh.selected = null;
        mesh.toggleSelection = (select) => {
            // transform mesh model matrix to center
            mat4.fromTranslation(mesh.viewMatrix, mesh.center)
            if (select) {
                mesh.scale(vec3.fromValues(scalingStep, scalingStep, scalingStep))
            }
        };
        mesh.translate = (translation = vec3.create()) => {
            vec3.add(mesh.center, mesh.center, translation)
            // translate mesh model matrix to center
            mat4.translate(mesh.viewMatrix, mesh.viewMatrix, translation)
        }
        mesh.rotate = (rotationAxis = vec3.create(), amount = rotationStep) => {
            // rotate mesh model matrix about axis
            mat4.rotate(mesh.viewMatrix, mesh.viewMatrix, amount, rotationAxis)
        }
        mesh.scale = (scaleFactor = vec3.create()) => {
            // rotate mesh model matrix about axis
            mat4.scale(mesh.viewMatrix, mesh.viewMatrix, scaleFactor)
        }

        // calc centroid if center not set
        if (mesh.center === undefined) {
            mesh.center = vec3.create()
            mesh.vertices.forEach(vtx => {
                vec3.add(mesh.center, mesh.center, vec3.fromValues(...vtx))
            })
            vec3.scale(mesh.center, mesh.center, 1 / mesh.vertices.length)

            mesh.vertices.forEach(vtx => {
                vec3.subtract(vtx, vec3.fromValues(...vtx), mesh.center)
            })
        }
        mat4.fromTranslation(mesh.viewMatrix, mesh.center)
        if (mesh.rotationAxis && mesh.rotationAngle) {
            mesh.rotate(mesh.rotationAxis, mesh.rotationAngle)
        }

        if (mesh.material.texture) {
            mesh.texture = initTexture(mesh.material.texture)
        }


        // send the texture coords to webGL
        mesh.buffers.uv = gl.createBuffer(); // init empty vertex coord buffer
        gl.bindBuffer(gl.ARRAY_BUFFER, mesh.buffers.uv); // activate that buffer
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(mesh.uvArr), gl.STATIC_DRAW); // coords to that buffer

        // send the vertex coords to webGL
        mesh.buffers.vertex = gl.createBuffer(); // init empty vertex coord buffer
        gl.bindBuffer(gl.ARRAY_BUFFER, mesh.buffers.vertex); // activate that buffer
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(mesh.vertexArr), gl.STATIC_DRAW); // coords to that buffer

        // send the normal vector to webGL
        mesh.buffers.normal = gl.createBuffer(); // init empty vertex coord buffer
        gl.bindBuffer(gl.ARRAY_BUFFER, mesh.buffers.normal); // activate that buffer
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(mesh.normalArr), gl.STATIC_DRAW); // coords to that buffer

        // send the triangle indices to webGL
        mesh.buffers.index = gl.createBuffer(); // init empty triangle index buffer
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, mesh.buffers.index); // activate that buffer
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(mesh.indexArr), gl.STATIC_DRAW); // indices to that buffer

    }) // end for each triangle set

    // sorting meshes in reverse order of alpha
    inputMeshes.sort((mesh_a, mesh_b) => mesh_b.material.alpha - mesh_a.material.alpha)
}

// setup the webGL shaders
function setupShaders() {

    // define fragment shader in essl using es6 template strings
    var fShaderCode = `
        precision mediump float;
        
        uniform mat4 modelViewMatrix;
        uniform int textureLoaded;
        uniform float shineFactor, alpha;
        uniform vec3 ambientVtx, diffuseVtx, specularVtx;
        uniform vec3 ambientLight[${inputLights.length}], diffuseLight[${inputLights.length}], specularLight[${inputLights.length}];
        uniform vec3 transLight[${inputLights.length}];
        uniform sampler2D textureSampler;
        
        varying vec2 v_texCoord;
        varying vec3 transNormal, transPosition3;
        
        void main(void) {
            vec4 finalColor;
            
            vec3 N = normalize(transNormal);
            for(int i = 0; i < ${inputLights.length}; i++){
                vec3 L = normalize(transLight[i] - transPosition3);
                vec3 E = -normalize(transPosition3); 
                vec3 H = normalize(L + E);
                
                // lambert's cosine law
                float diffuseFactor = max(dot(N, L), 0.0);
                float specularFactor = pow(max(dot(N, H), 0.0), shineFactor);
                if(textureLoaded == 0){
                    finalColor += vec4(ambientVtx * ambientLight[i] + (diffuseVtx * diffuseLight[i]) * diffuseFactor + specularVtx * specularLight[i] * specularFactor, 1.0);
                } else {
                    finalColor += vec4(ambientVtx * ambientLight[i] + (diffuseVtx * diffuseLight[i]) * diffuseFactor + specularVtx * specularLight[i] * specularFactor, alpha) * texture2D(textureSampler, v_texCoord) ;
                    // finalColor += vec4(ambientVtx * ambientLight[i] + texture2D(textureSampler, vec2(v_texCoord.s, v_texCoord.t)).rgb * diffuseLight[i] * diffuseFactor + specularVtx * specularLight[i] * specularFactor, alpha);
                }
            }
            gl_FragColor = finalColor;
        }
    `;

    // define vertex shader in essl using es6 template strings
    var vShaderCode = `
        precision mediump float;
        
        attribute vec3 vertexPosition, vertexNormal;
        attribute vec2 a_texCoord;
        
        uniform mat4 perspectiveMatrix, modelViewMatrix, normalMatrix, meshViewMatrix;
        
        varying vec2 v_texCoord;
        varying vec3 transNormal, transPosition3;
        
        void main(void) {
            transNormal = vec3(normalMatrix * meshViewMatrix * vec4(vertexNormal, 0.0));
            vec4 transPosition = modelViewMatrix * meshViewMatrix * vec4(vertexPosition, 1.0);
            transPosition3 = vec3(transPosition) / transPosition.w;
        
            // flip x and y
            v_texCoord = vec2(1, 1) - a_texCoord;
            gl_Position = perspectiveMatrix * transPosition;
        }
    `;

    try {
        // console.log("fragment shader: "+fShaderCode);
        var fShader = gl.createShader(gl.FRAGMENT_SHADER); // create frag shader
        gl.shaderSource(fShader, fShaderCode); // attach code to shader
        gl.compileShader(fShader); // compile the code for gpu execution

        // console.log("vertex shader: "+vShaderCode);
        var vShader = gl.createShader(gl.VERTEX_SHADER); // create vertex shader
        gl.shaderSource(vShader, vShaderCode); // attach code to shader
        gl.compileShader(vShader); // compile the code for gpu execution

        if (!gl.getShaderParameter(fShader, gl.COMPILE_STATUS)) { // bad frag shader compile
            throw "error during fragment shader compile: " + gl.getShaderInfoLog(fShader);
            gl.deleteShader(fShader);
        } else if (!gl.getShaderParameter(vShader, gl.COMPILE_STATUS)) { // bad vertex shader compile
            throw "error during vertex shader compile: " + gl.getShaderInfoLog(vShader);
            gl.deleteShader(vShader);
        } else { // no compile errors
            var shaderProgram = gl.createProgram(); // create the single shader program
            gl.attachShader(shaderProgram, fShader); // put frag shader in program
            gl.attachShader(shaderProgram, vShader); // put vertex shader in program
            gl.linkProgram(shaderProgram); // link program into gl context

            if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) { // bad program link
                throw "error during shader program linking: " + gl.getProgramInfoLog(shaderProgram);
            } else { // no shader program link errors
                gl.useProgram(shaderProgram); // activate shader program (frag and vert)

                // init matrices
                mat4.perspective(perspectiveMatrix, degToRad(90), 1, 0.5, Infinity)
                mat4.lookAt(modelViewMatrix, Eye, Center, Up)
                mat4.invert(normalMatrix, modelViewMatrix)
                mat4.transpose(normalMatrix, normalMatrix)

                programInfo = {
                    attribLocations: {
                        a_texCoord: gl.getAttribLocation(shaderProgram, "a_texCoord"),
                        vertexPosition: gl.getAttribLocation(shaderProgram, "vertexPosition"),
                        vertexNormal: gl.getAttribLocation(shaderProgram, "vertexNormal"),
                    },
                    uniformLocations: {
                        perspectiveMatrix: gl.getUniformLocation(shaderProgram, "perspectiveMatrix"),
                        modelViewMatrix: gl.getUniformLocation(shaderProgram, "modelViewMatrix"),
                        normalMatrix: gl.getUniformLocation(shaderProgram, "normalMatrix"),
                        meshViewMatrix: gl.getUniformLocation(shaderProgram, "meshViewMatrix"),
                        textureLoaded: gl.getUniformLocation(shaderProgram, "textureLoaded"),
                        textureSampler: gl.getUniformLocation(shaderProgram, "textureSampler"),
                        alpha: gl.getUniformLocation(shaderProgram, "alpha"),
                        transLight: gl.getUniformLocation(shaderProgram, "transLight"),
                        ambientVtx: gl.getUniformLocation(shaderProgram, "ambientVtx"),
                        diffuseVtx: gl.getUniformLocation(shaderProgram, "diffuseVtx"),
                        shineFactor: gl.getUniformLocation(shaderProgram, "shineFactor"),
                        specularVtx: gl.getUniformLocation(shaderProgram, "specularVtx"),
                        ambientLight: gl.getUniformLocation(shaderProgram, "ambientLight"),
                        diffuseLight: gl.getUniformLocation(shaderProgram, "diffuseLight"),
                        specularLight: gl.getUniformLocation(shaderProgram, "specularLight"),
                    }
                }

                Object.keys(programInfo.attribLocations).forEach(key => {
                    gl.enableVertexAttribArray(programInfo.attribLocations[key])
                })
            } // end if no shader program link errors
        } // end if no compile errors
    } // end try

    catch (e) {
        console.log(e);
    } // end catch
} // end setup shaders

// render the loaded model
function renderMeshes(triangleColors = []) {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT); // clear frame/depth buffers
    gl.enable(gl.CULL_FACE);
    gl.enable(gl.DEPTH_TEST);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    if (makeItYourOwn) {
        MIYO_angle = (MIYO_angle + 0.01) % 2 * Math.PI;
        // earth rotation
        inputMeshes[0].rotate(vec3.fromValues(0, 0, 1), 0.01);

        // moon revolution + rotation
        // inputMeshes[1].translate(vec3.fromValues(Math.sqrt(2) * degToRad(0.01 / 28), Math.sqrt(2) * degToRad(0.01 / 28), 0))
        // inputMeshes[1].rotate(vec3.fromValues(0, 0, 1), 0.01 / 28);
    }

    requestAnimationFrame(renderMeshes)

    // recalc light positions
    inputLights.transLightsArr = []
    inputLights.forEach(light => {
        light.transformedPosition = vec3.create()
        vec3.transformMat4(light.transformedPosition, vec3.fromValues(light.x, light.y, light.z), modelViewMatrix)
        inputLights.transLightsArr.push(...light.transformedPosition)
    })

    // uniforms constant for entire frame
    gl.uniformMatrix4fv(programInfo.uniformLocations.perspectiveMatrix, false, perspectiveMatrix);
    gl.uniformMatrix4fv(programInfo.uniformLocations.modelViewMatrix, false, modelViewMatrix);
    gl.uniformMatrix4fv(programInfo.uniformLocations.normalMatrix, false, normalMatrix);
    gl.uniform3fv(programInfo.uniformLocations.transLight, inputLights.transLightsArr);
    gl.uniform3fv(programInfo.uniformLocations.ambientLight, inputLights.ambientArr);
    gl.uniform3fv(programInfo.uniformLocations.diffuseLight, inputLights.diffuseArr);
    gl.uniform3fv(programInfo.uniformLocations.specularLight, inputLights.specularArr);

    // painter's algorithm
    inputMeshes.sort((mesh_a, mesh_b) => {
        if (mesh_a.material.alpha === 1.0 || mesh_b.material.alpha === 1.0) {
            return 0;
        }
        return mesh_a.center[2] - mesh_b.center[2];
    })

    inputMeshes.forEach((mesh) => {

        // uniforms constant for a mesh
        gl.uniformMatrix4fv(programInfo.uniformLocations.meshViewMatrix, false, mesh.viewMatrix);
        gl.uniform3f(programInfo.uniformLocations.ambientVtx, ...mesh.material.ambient);
        gl.uniform3f(programInfo.uniformLocations.diffuseVtx, ...mesh.material.diffuse);
        gl.uniform3f(programInfo.uniformLocations.specularVtx, ...mesh.material.specular);
        gl.uniform1f(programInfo.uniformLocations.shineFactor, mesh.material.n);
        gl.uniform1f(programInfo.uniformLocations.alpha, part3_flag ? (mesh.material.alpha || 1.0) : 1.0);
        gl.uniform1i(programInfo.uniformLocations.textureLoaded, (!!mesh.texture) ? 1 : 0);

        if (mesh.texture) {
            // texture activate and bind
            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, mesh.texture)
            gl.uniform1i(programInfo.uniformLocations.textureSampler, 0);
        }

        if (mesh.material.alpha === 1.0) {
            gl.disable(gl.BLEND);
            gl.depthMask(true);
        } else {
            gl.enable(gl.BLEND);
            gl.depthMask(false)
        }

        // texture buffer: activate and feed into vertex shader
        gl.bindBuffer(gl.ARRAY_BUFFER, mesh.buffers.uv); // activate
        gl.vertexAttribPointer(programInfo.attribLocations.a_texCoord, 2, gl.FLOAT, false, 0, 0); // feed

        // vertex buffer: activate and feed into vertex shader
        gl.bindBuffer(gl.ARRAY_BUFFER, mesh.buffers.vertex); // activate
        gl.vertexAttribPointer(programInfo.attribLocations.vertexPosition, 3, gl.FLOAT, false, 0, 0); // feed

        // normal buffer: activate and feed into vertex shader
        gl.bindBuffer(gl.ARRAY_BUFFER, mesh.buffers.normal); // activate
        gl.vertexAttribPointer(programInfo.attribLocations.vertexNormal, 3, gl.FLOAT, false, 0, 0); // feed

        // triangle buffer: activate and render
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, mesh.buffers.index); // activate
        gl.drawElements(gl.TRIANGLES, mesh.indexArr.length, gl.UNSIGNED_SHORT, 0); // render
    }) // end for each triangle set

}// end render triangles


/* MAIN -- HERE is where execution begins after window load */

export function main(options = {makeItYourOwn: false}) {
    makeItYourOwn = options.makeItYourOwn
    setupWebGL(); // set up the webGL environment
    loadMeshes(options); // load in the triangles from tri file
    setupShaders(); // setup the webGL shaders
    renderMeshes(); // draw the triangles using webGL

} // end main
