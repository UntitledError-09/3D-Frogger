import {mat4, vec3, vec4} from "./gl_lib";
import {View, Light, Mesh, LightCollection, MeshCollection, StaticMesh} from "./class_definitions.js"

function setupWebGL(){
    console.log('Loading WebGL...')

    const imageCanvas = document.getElementById("myImageCanvas"); // create a 2d canvas
    const cw = imageCanvas.width, ch = imageCanvas.height;
    const imageContext = imageCanvas.getContext("2d");
    // const bkgdImage = new Image();
    // bkgdImage.crossOrigin = "Anonymous";
    // bkgdImage.src = "" + INPUT_BACKGROUND;
    // bkgdImage.onload = function () {
    //     const iw = bkgdImage.width, ih = bkgdImage.height;
    //     imageContext.drawImage(bkgdImage, 0, 0, iw, ih, 0, 0, cw, ch);
    // }


    // Get the canvas and context
    const canvas = document.getElementById("myWebGLCanvas"); // create a js canvas
    var gl = canvas.getContext("webgl"); // get a webgl object from it

    if (gl == null) {
        throw "unable to create gl context -- is your browser gl ready?";
    } else {
        gl.clearColor(0.0, 0.0, 0.0, 1.0); // use black when we clear the frame buffer
        gl.clearDepth(1.0); // use max when we clear the depth buffer
        gl.enable(gl.DEPTH_TEST); // use hidden surface removal (with zbuffering)
    }

    console.log('WebGL Loaded.')

    return gl;
}

async function loadScene(gl= WebGLRenderingContext){
    return new Promise(async (resolve, reject) => {
        const sceneDataFile = await (await fetch("/scene.json")).json()
        const meshDataFile = await (await fetch("/meshes.json")).json()

        var sceneData = {
            view: new View(sceneDataFile['view']),
            lights: new LightCollection(sceneDataFile['lights'].map(light=>new Light(light))),
            staticElements: new MeshCollection(sceneDataFile['staticElements'].map(mesh=>new StaticMesh(mesh))),
            elements: null
        }


    })
}

function setupShaders(sceneData, gl) {
    var programInfo = null;
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

    return programInfo;
} // end setup shaders

function renderScene(
    programInfo = {attribLocations: {}, uniformLocations: {}},
    sceneData = {inputLights: [], inputMeshes: []},
    gl = WebGLRenderingContext
){

}

export async function main(options = {makeItYourOwn: false}) {
    try {
        const gl = setupWebGL(); // set up the webGL environment
        const sceneData = await loadScene(gl); // load in the triangles from tri file
        const programInfo = await setupShaders(sceneData, gl); // setup the webGL shaders
        await renderScene(programInfo, sceneData, gl); // draw the triangles using webGL
    } catch (e) {
        console.error(e)
    }
} // end main