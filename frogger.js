import * as utils from "./utils.js";
import {
    View,
    Light,
    Mesh,
    LightCollection,
    Collection,
    TypedCollection, Material
} from "./class_definitions.js"
import {generateEllipsoidTriangles} from "./utils.js";
import {quat, vec3} from "./gl_lib";

var programInfo = {attribLocations: {}, uniformLocations: {}}
var sceneData = {view: View, lights: LightCollection, elements: TypedCollection}
var gl = null
var animation = {
    frame_counter: 0,
    frame_max_limit: 1000000
}

// var background_color = [0, 0, 0]


function setupWebGL() {
    console.log('Loading WebGL...');

    const imageCanvas = document.getElementById("myImageCanvas"); // create a 2d canvas
    const cw = imageCanvas.width, ch = imageCanvas.height;
    const imageContext = imageCanvas.getContext("2d");
    const bkgdImage = new Image();
    bkgdImage.crossOrigin = "Anonymous";
    bkgdImage.src = "/assets/sky.jpg";
    bkgdImage.onload = function () {
        const iw = bkgdImage.width, ih = bkgdImage.height;
        imageContext.drawImage(bkgdImage, 0, 0, iw, ih, 0, 0, cw, ch);
    }


    // Get the canvas and context
    const canvas = document.getElementById("myWebGLCanvas"); // create a js canvas
    gl = canvas.getContext("webgl"); // get a webgl object from it

    if (gl == null) {
        throw "unable to create gl context -- is your browser gl ready?";
    } else {
        // gl.clearColor(...backgroud_color, 1.0); // use black when we clear the frame buffer
        gl.clearColor(0, 0, 0, 0); // use black when we clear the frame buffer
        gl.clearDepth(1.0); // use max when we clear the depth buffer
        gl.enable(gl.DEPTH_TEST); // use hidden surface removal (with zbuffering);
    }

    console.log('WebGL Loaded.');

    return gl;
}

async function loadScene() {
    return new Promise(async (resolve, reject) => {
        const sceneDataFile = await (await fetch("/scene.json")).json();
        const meshLookupFile = await (await fetch("/meshes.json")).json();

        const lights = new LightCollection(sceneDataFile['lights'].map(light => new Light(light)));
        // lights.recalcTransformedPosition(view.matrix.model);
        const elements = new TypedCollection('elements', [Mesh], true);

        // update transformed light position on view_change
        window.addEventListener("view_change", (ev) => {
            console.log("Event: view_change :: light transformed light position");
            lights.recalcTransformedPosition(ev.detail.viewMatrices.model);
        });

        const view = new View(sceneDataFile['view']);

        let row_index = 0;

        // all rows
        const rows = new TypedCollection('rows', [Mesh], true);
        elements.add(rows);

        // start row
        const start_row = new TypedCollection('start_row', [Mesh], true);
        rows.add(start_row);
        const start_platform = new Mesh({
            name: "start_platform",
            type: "Cube",
            position: [0, 0, 0],
            rotation: [0, 0, 0, 0],
            scaling: [10, 0.4, 1]
        }, meshLookupFile, gl);
        start_row.add(start_platform);
        start_platform.material = new Material({
            ambient: [0.05, 0.05, 0.05],
            diffuse: [0.35, 0.35, 0.35],
            specular: [0.1, 0.1, 0.1],
            n: 30,
            // texture: 'road.jpg'
        });

        // road rows
        const road_rows = new TypedCollection('road_rows', [Mesh], true);
        rows.add(road_rows);
        const road_plane = new Mesh({
            name: "road_plane",
            type: "Plane",
            position: [0, 0, 3],
            rotation: [0, 0, 0, 0],
            scaling: [10, 1, 5]
        }, meshLookupFile, gl);
        road_rows.add(road_plane);
        road_plane.material = new Material({
            ambient: [0.05, 0.05, 0.05],
            diffuse: [0.05, 0.05, 0.05],
            specular: [0.1, 0.1, 0.1],
            n: 30,
            // texture: 'road.jpg'
        });
        for (let i = 1; i < 6; i++) {
            const road_row = new TypedCollection('road_row_' + i, [Mesh]);
            road_rows.add(road_row);
            const row_obj_size = 2 + 0.2 * i
            const row_start = -(Math.random() * 5 + 2);
            const row_o2o_dist = Math.random() * 5 + 5 + row_obj_size
            const row_obj_speed = 0.001 * (Math.random() - 0.5) + 0.0004
            road_row.behaviour_properties = {row_obj_size, row_start, row_o2o_dist, row_obj_speed}
            for (let j = 0; j < 5; j++) {
                const obj = new Mesh({
                    name: "obj_" + i + "_" + j,
                    type: "Cube",
                    position: [row_start + row_o2o_dist * j, 0.5, i],
                    rotation: [0, 0, 0, 0],
                    scaling: [row_obj_size, 1, 0.75],
                    animatable: true
                }, meshLookupFile, gl);
                road_row.add(obj);

                obj.material = new Material({
                    ambient: [0.05, 0.05, 0.05],
                    diffuse: [0.35, 0.35, 0.35],
                    specular: [1, 1, 1],
                    n: 30,
                    // texture: 'road.jpg'
                });

                obj.animation = {
                    step: {
                        translation: vec3.fromValues(row_obj_speed, 0, 0),
                    },
                    bounds: {
                        translation: [[-5, 5], null, null]
                    }
                }
            }
        }

        // median row
        const median_row = new TypedCollection('median_row', [Mesh], true);
        rows.add(median_row);
        const median_plane = new Mesh({
            name: "median_plane",
            type: "Cube",
            position: [0, 0, 6],
            rotation: [0, 0, 0, 0],
            scaling: [10, 0.4, 1]
        }, meshLookupFile, gl);
        median_row.add(median_plane);
        median_plane.material = new Material({
            ambient: [0.05, 0.05, 0.05],
            diffuse: [0.65, 0.65, 0.35],
            specular: [0.1, 0.1, 0.1],
            n: 30,
            // texture: 'road.jpg'
        });

        // river rows
        const river_rows = new TypedCollection('river_rows', [Mesh], true);
        rows.add(river_rows);
        const river_plane = new Mesh({
            name: "river_plane",
            type: "Plane",
            position: [0, 0, 9],
            rotation: [0, 0, 0, 0],
            scaling: [10, 1, 5]
        }, meshLookupFile, gl);
        river_rows.add(river_plane);
        river_plane.material = new Material({
            ambient: [0.05, 0.05, 0.05],
            diffuse: [0.05, 0.05, 0.65],
            specular: [0.1, 0.1, 0.1],
            n: 30,
            // texture: 'road.jpg'
        });
        for (let i = 7; i < 12; i++) {
            const river_row = new TypedCollection('river_row_' + i, [Mesh]);
            river_rows.add(river_row);
            const row_obj_size = 2 + 0.2 * i
            const row_start = -(Math.random() * 5 + 2);
            const row_o2o_dist = Math.random() * 5 + 5 + row_obj_size
            const row_obj_speed = 0.001 * (Math.random() - 0.5) + 0.0004
            river_row.behaviour_properties = {row_obj_size, row_start, row_o2o_dist, row_obj_speed}
            for (let j = 0; j < 5; j++) {
                const obj = new Mesh({
                    name: "obj_" + i + "_" + j,
                    type: "Cube",
                    position: [row_start + row_o2o_dist * j, 0, i],
                    rotation: [0, 0, 0, 0],
                    scaling: [row_obj_size, 1, 0.75],
                    animatable: true
                }, meshLookupFile, gl);
                river_row.add(obj);

                obj.material = new Material({
                    ambient: [0.05, 0.05, 0.05],
                    diffuse: [0.25, 0.15, 0.05],
                    specular: [1, 1, 1],
                    n: 30,
                    // texture: 'road.jpg'
                });

                obj.animation = {
                    step: {
                        translation: vec3.fromValues(row_obj_speed, 0, 0),
                    },
                    bounds: {
                        translation: [[-5, 5], null, null]
                    }
                }
            }
        }

        // end row
        const end_row = new TypedCollection('end_row', [Mesh], true);
        rows.add(end_row);
        // const end_plane = new Mesh({
        //     name: "end_plane",
        //     type: "Cube",
        //     position: [0, 0, 0],
        //     rotation: [0, 0, 0, 0],
        //     scaling: [10, 0.4, 1]
        // }, meshLookupFile, gl);
        // end_row.add(end_plane);
        // end_plane.material = new Material({
        //     ambient: [0.05, 0.05, 0.05],
        //     diffuse: [0.35, 0.65, 0.35],
        //     specular: [0.1, 0.1, 0.1],
        //     n: 30,
        //     // texture: 'road.jpg'
        // });
        const end_goals = new TypedCollection('end_goals', [Mesh], true);
        rows.add(end_goals);
        for (let i = 0; i < 5; i++) {
            const obj = new Mesh({
                name: "obj_" + 12 + "_" + i,
                type: "Cube",
                position: [(i-2)*2, 1, 12],
                rotation: [0, 0, 0, 0],
                scaling: [0.75, 2, 0.75]
            }, meshLookupFile, gl);
            end_goals.add(obj);

            obj.material = new Material({
                ambient: [0.05, 0.05, 0.05],
                diffuse: [0.45, 0.05, 0.05],
                specular: [1, 1, 1],
                n: 30,
                // texture: 'road.jpg'
            });
            obj.completed = false;
            obj.makeCompleted = () => {
                obj.completed = true;
                obj.material = new Material({
                    ambient: [0.05, 0.05, 0.05],
                    diffuse: [0.05, 0.45, 0.05],
                    specular: [1, 1, 1],
                    n: 30,
                    // texture: 'road.jpg'
                });
            }
        }

        // Player
        const player = new Mesh({
            name: "player",
            type: "Cube",
            position: [0, 0.7, 0],
            rotation: [0, 0, 0, 0],
            scaling: [0.5, 0.5, 1]
        }, meshLookupFile, gl);
        end_row.add(player);
        player.material = new Material({
            ambient: [0.05, 0.05, 0.05],
            diffuse: [0.35, 0.65, 0.35],
            specular: [0.1, 0.1, 0.1],
            n: 30,
            // texture: 'road.jpg'
        });

        sceneData = {view, lights, elements}
        return resolve(sceneData);
    });
}

function setupShaders() {
    var inputLights = sceneData.lights
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


    var vShader = gl.createShader(gl.VERTEX_SHADER); // create vertex shader
    gl.shaderSource(vShader, vShaderCode); // attach code to shader
    gl.compileShader(vShader); // compile the code for gpu execution

    var fShader = gl.createShader(gl.FRAGMENT_SHADER); // create frag shader
    gl.shaderSource(fShader, fShaderCode); // attach code to shader
    gl.compileShader(fShader); // compile the code for gpu execution

    if (!gl.getShaderParameter(fShader, gl.COMPILE_STATUS)) { // bad frag shader compile
        throw "error during fragment shader compile: " + gl.getShaderInfoLog(fShader);
    } else if (!gl.getShaderParameter(vShader, gl.COMPILE_STATUS)) { // bad vertex shader compile
        throw "error during vertex shader compile: " + gl.getShaderInfoLog(vShader);
    } else { // no compile errors
        var shaderProgram = gl.createProgram(); // create the single shader program
        gl.attachShader(shaderProgram, fShader); // put frag shader in program
        gl.attachShader(shaderProgram, vShader); // put vertex shader in program
        gl.linkProgram(shaderProgram); // link program into gl context

        if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) { // bad program link
            throw "error during shader program linking: " + gl.getProgramInfoLog(shaderProgram);
        } else { // no shader program link errors
            gl.useProgram(shaderProgram); // activate shader program (frag and vert);

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
                gl.enableVertexAttribArray(programInfo.attribLocations[key]);
            });
        } // end if no shader program link errors
    } // end if no compile errors

    return programInfo;
} // end setup shaders

function renderScene() {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT); // clear frame/depth buffers
    gl.enable(gl.CULL_FACE);
    gl.enable(gl.DEPTH_TEST);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    requestAnimationFrame(renderScene);

    // console.log(sceneData);

    // uniforms constant for entire frame
    gl.uniformMatrix4fv(programInfo.uniformLocations.perspectiveMatrix, false, sceneData.view.matrix.perspective);
    gl.uniformMatrix4fv(programInfo.uniformLocations.modelViewMatrix, false, sceneData.view.matrix.model);
    gl.uniformMatrix4fv(programInfo.uniformLocations.normalMatrix, false, sceneData.view.matrix.view);
    gl.uniform3fv(programInfo.uniformLocations.transLight, sceneData.lights.vector.transformedPosition);
    gl.uniform3fv(programInfo.uniformLocations.ambientLight, sceneData.lights.vector.material.ambient);
    gl.uniform3fv(programInfo.uniformLocations.diffuseLight, sceneData.lights.vector.material.diffuse);
    gl.uniform3fv(programInfo.uniformLocations.specularLight, sceneData.lights.vector.material.specular);

    // // painter's algorithm
    // sceneData.elements.recursiveReduce().sort((mesh_a, mesh_b) => {
    //     if (mesh_a.material.alpha === 1.0 || mesh_b.material.alpha === 1.0) {
    //         return 0;
    //     }
    //     return mesh_a.center[2] - mesh_b.center[2];
    // });


    sceneData.elements.flatten().forEach((mesh) => {
        // console.log(mesh.name);

        // do animation frame step
        if (mesh.animatable === true) {
            mesh.transform(mesh.animation.step);
        }

        // uniforms constant for a mesh
        gl.uniformMatrix4fv(programInfo.uniformLocations.meshViewMatrix, false, mesh.viewMatrix);
        gl.uniform3f(programInfo.uniformLocations.ambientVtx, ...mesh.material.ambient);
        gl.uniform3f(programInfo.uniformLocations.diffuseVtx, ...mesh.material.diffuse);
        gl.uniform3f(programInfo.uniformLocations.specularVtx, ...mesh.material.specular);
        gl.uniform1f(programInfo.uniformLocations.shineFactor, mesh.material.n);
        gl.uniform1f(programInfo.uniformLocations.alpha, mesh.material.alpha || 1.0);
        gl.uniform1i(programInfo.uniformLocations.textureLoaded, (!!mesh.texture) ? 1 : 0);

        if (mesh.texture) {
            // texture activate and bind
            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, mesh.texture);
            gl.uniform1i(programInfo.uniformLocations.textureSampler, 0);
        }

        if (mesh.material.alpha === 1.0) {
            gl.disable(gl.BLEND);
            gl.depthMask(true);
        } else {
            gl.enable(gl.BLEND);
            gl.depthMask(false);
        }

        // texture buffer: activate and feed into vertex shader
        gl.bindBuffer(gl.ARRAY_BUFFER, mesh.buffer.uv); // activate
        gl.vertexAttribPointer(programInfo.attribLocations.a_texCoord, 2, gl.FLOAT, false, 0, 0); // feed

        // vertex buffer: activate and feed into vertex shader
        gl.bindBuffer(gl.ARRAY_BUFFER, mesh.buffer.vertex); // activate
        gl.vertexAttribPointer(programInfo.attribLocations.vertexPosition, 3, gl.FLOAT, false, 0, 0); // feed

        // normal buffer: activate and feed into vertex shader
        gl.bindBuffer(gl.ARRAY_BUFFER, mesh.buffer.normal); // activate
        gl.vertexAttribPointer(programInfo.attribLocations.vertexNormal, 3, gl.FLOAT, false, 0, 0); // feed

        // triangle buffer: activate and render
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, mesh.buffer.index); // activate
        gl.drawElements(gl.TRIANGLES, mesh.vector.index.length, gl.UNSIGNED_SHORT, 0); // render
    }) // end for each triangle set
}

export async function main(options = {makeItYourOwn: false}) {
    try {
        setupWebGL(); // set up the webGL environment
        await loadScene(); // load in the triangles from tri file
        programInfo = setupShaders(); // setup the webGL shaders
        setInterval(() => {
            animation.frame_counter = (animation.frame_counter + 1) % animation.frame_max_limit
        }, 10);
        renderScene(); // draw the triangles using webGL
    } catch (e) {
        console.error(e);
    }
} // end main