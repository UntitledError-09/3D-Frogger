// Class Definitions for Frogger
import {mat4, vec3, vec4} from "./gl_lib";
import * as utils from "./utils.js"

class Material {
    constructor({ambient = [], diffuse = [], specular = [], texture = '', gl}) {
        this.ambient = vec3.fromValues(...ambient);
        this.diffuse = vec3.fromValues(...diffuse);
        this.specular = vec3.fromValues(...specular);

        // if texture defined, apply it
        if (texture?.length > 0 && gl) {
            this.texture = utils.initTexture(texture, gl);
        }
    }
}

// View
export class View {
    constructor(
        {
            eye = [0.5, 0.5, -0.5, 1.0],
            center = [0.5, 0.5, 0.0],
            up = [0.0, 1.0, 0.0],
            fov_y = 90,
            aspect_ratio = 1,
            z_near = 0.5,
            z_far = Infinity
        }
    ) {
        this.eye = vec4.fromValues(...eye);
        this.center = vec3.fromValues(...center);
        this.up = vec3.fromValues(...up);
        this.fov_y = utils.degToRad(fov_y);
        this.aspect_ratio = aspect_ratio;
        this.z_near = z_near;
        this.z_far = z_far;

        this.matrix = {
            perspective: mat4.create(),
            model: mat4.create(),
            view: mat4.create()
        };

        this.changeEvent = new CustomEvent("view_change", {detail: {viewMatrices: this.matrix}})

        this.updatePerspective();
        this.updateModelView();
    }

    updatePerspective() {
        // perspective matrix
        mat4.perspective(this.matrix.perspective, this.fov_y, this.aspect_ratio, this.z_near, this.z_far);

        // dispatch view change event
        dispatchEvent(this.changeEvent)
    }

    updateModelView() {
        // model matrix
        mat4.lookAt(this.matrix.model, this.eye, this.center, this.up);

        // normal matrix
        mat4.invert(this.matrix.view, this.matrix.model);
        mat4.transpose(this.matrix.view, this.matrix.view);

        // dispatch view change event
        dispatchEvent(this.changeEvent)
    }
}

export class Light {
    constructor(
        {
            position = [0,0,0],
            material = {
                ambient: [1,1,1],
                diffuse: [1,1,1],
                specular: [1,1,1]
            }
        }
    ) {
        this.position = vec3.fromValues(...position);
        this.material = {
            ambient: vec3.fromValues(...material.ambient),
            diffuse: vec3.fromValues(...material.diffuse),
            specular: vec3.fromValues(...material.specular)
        };
        this.transformedPosition = vec3.create()
    }

    recalcTransformedPosition(modelMatrix = mat4.create()) {
        vec3.transformMat4(this.transformedPosition, this.position, modelMatrix);
        return this.transformedPosition;
    }
}

export class Mesh {
    constructor(
        {
            name = "default cube",
            type = "Cube",
            position = [0,0,0],
            rotation = [0,0,0,0],
            scaling = [1,1,1]
        },
        meshLookUp = {
            "name": {
                "center": [],
                "vertices": [],
                "normals": [],
                "indices": [],
                "uvs": [],
                "material": {
                    "ambient": [1,1,1],
                    "diffuse": [1,1,1],
                    "specular": [1,1,1],
                    "texture": ''
                }
            }
        },
        gl = new WebGLRenderingContext
    ) {
        this.name = name;
        this.type = type;
        this.position = position;
        this.rotation = rotation;
        this.scaling = scaling;

        this.center = meshLookUp.name.center;
        this.vertices = meshLookUp.name.vertices;
        this.normals = meshLookUp.name.normals;
        this.indices = meshLookUp.name.indices;
        this.uvs = meshLookUp.name.uvs;
        this.material = new Material(meshLookUp.name.material);
        this.viewMatrix = mat4.create();

        // calc centroid, if center not set
        if (this.center === undefined) {
            this.center = vec3.create();
            this.vertices.forEach(vtx => {
                vec3.add(this.center, this.center, vec3.fromValues(...vtx));
            });
            vec3.scale(this.center, this.center, 1 / this.vertices.length);

            this.vertices.forEach(vtx => {
                vec3.subtract(vtx, vec3.fromValues(...vtx), this.center);
            });
        }

        // if texture defined, apply it
        if (this.material.texture) {
            this.texture = utils.initTexture(this.material.texture, gl);
        }

        // translate object to center position
        mat4.fromTranslation(this.viewMatrix, this.center);
        // // apply default rotation
        // this.rotate();

        this.vector = {
            vertex: [],
            normal: [],
            index: [],
            uv: []
        }

        // initialize vectors
        this.fillVectors();

        this.buffer = {};
        // send the texture coords to webGL
        this.buffer.uv = gl.createBuffer(); // init empty vertex coord buffer
        gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer.uv); // activate that buffer
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.vector.uv), gl.STATIC_DRAW); // coords to that buffer

        // send the vertex coords to webGL
        this.buffer.vertex = gl.createBuffer(); // init empty vertex coord buffer
        gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer.vertex); // activate that buffer
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.vector.vertex), gl.STATIC_DRAW); // coords to that buffer

        // send the normal vector to webGL
        this.buffer.normal = gl.createBuffer(); // init empty vertex coord buffer
        gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer.normal); // activate that buffer
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.vector.normal), gl.STATIC_DRAW); // coords to that buffer

        // send the triangle indices to webGL
        this.buffer.index = gl.createBuffer(); // init empty triangle index buffer
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.buffer.index); // activate that buffer
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(this.vector.index), gl.STATIC_DRAW); // indices to that buffer

    }

    fillVectors() {
        // set up the uvs array
        this.uvs?.forEach(uv => {
            this.vector.uv.push(...uv);
        }) // end for uvs in set

        // set up the vertex coord array
        this.vertices.forEach(vtx => {
            this.vector.vertex.push(...vtx);
        }) // end for vertices in set

        // set up the normal array
        this.normals.forEach(normal => {
            this.vector.normal.push(...normal);
        }) // end for normals in set

        // set up the triangle index array, adjusting indices across sets
        this.indices.forEach(index => {
            this.vector.index.push(...index);
        }) // end for triangles in set
    }

    translate = (translation = vec3.fromValues(0, 0, 0)) => {
        vec3.add(this.center, this.center, translation);
        // translate mesh model matrix to center
        mat4.translate(this.viewMatrix, this.viewMatrix, translation);
    }
    rotate = (rotationAxis = vec3.fromValues(0, 1, 0), amount = 0) => {
        // rotate mesh model matrix about axis
        mat4.rotate(this.viewMatrix, this.viewMatrix, amount, rotationAxis);
    }
    scale = (scaleFactor = vec3.fromValues(1, 1, 1)) => {
        // rotate mesh model matrix about axis
        mat4.scale(this.viewMatrix, this.viewMatrix, scaleFactor);
    }
}

export class StaticMesh extends Mesh {
    constructor() {
        super(arguments);
    }

    translate(translation) {
        throw "StaticMesh error: function not allowed"
    }

    rotate(rotationAxis, rotationAngle) {
        throw "StaticMesh error: function not allowed"
    }

    scale(scaleFactor) {
        throw "StaticMesh error: function not allowed"
    }

    getVectors(){

    }
}

export class DynamicMesh extends Mesh {

}

export class MeshProperties {
    constructor() {
        this.position = position;
        this.rotation = rotation;
        this.scaling = scaling;
    }
}

export class LightCollection {
    constructor(lightVector = [Light]) {
        this.vector = {
            light: lightVector,
            material: {
                ambient: [],
                diffuse: [],
                specular: []
            },
            position: [],
            transformedPosition: []
        }

        this.vector.light.forEach(light=>{
            this.vector.position.push(vec3.fromValues(...light.position));
            this.vector.material.ambient.push(vec3.fromValues(...light.material.ambient));
            this.vector.material.diffuse.push(vec3.fromValues(...light.material.diffuse));
            this.vector.material.specular.push(vec3.fromValues(...light.material.specular));
        });
    }

    recalcTransformedPosition(modelMatrix = mat4.create()) {
        const transformedPosition = vec3.create();
        this.vector.transformedPosition = this.vector.position.map(position=>{
            vec3.transformMat4(transformedPosition, position, modelMatrix);
            return transformedPosition;
        })

        return this.vector.transformedPosition;
    }
}

export class MeshCollection {
    constructor(meshVector = [Mesh]) {
        this.vector = {
            mesh: meshVector,
            material: {
                ambient: [],
                diffuse: [],
                specular: []
            },
            position: [],
            transformedPosition: []
        }

        this.vector.mesh.forEach(mesh=>{
            this.vector.position.push(vec3.fromValues(...mesh.position));
            this.vector.material.ambient.push(vec3.fromValues(...mesh.material.ambient));
            this.vector.material.diffuse.push(vec3.fromValues(...mesh.material.diffuse));
            this.vector.material.specular.push(vec3.fromValues(...mesh.material.specular));
        });
    }

    recalcTransformedPosition(modelMatrix = mat4.create()) {
        const transformedPosition = vec3.create();
        this.vector.transformedPosition = this.vector.position.map(position=>{
            vec3.transformMat4(transformedPosition, position, modelMatrix);
            return transformedPosition;
        })

        return this.vector.transformedPosition;
    }
}

export class Player extends Mesh {
    constructor(
        args = {
            center: vec3.fromValues(0, 0, 0),
            rotation: vec4.fromValues(0, 1, 0, 0),
            vertices: [],
            normals: [],
            indices: [],
            uvs: [],
            material: [],
            dom_canvas: document.getElementById('webgl_canvas'),
            gl: WebGLRenderingContext
        }
    ) {
        super(args);
        this.dom_canvas = args.dom_canvas;
        this.event = {
            move: new CustomEvent('player_move', { detail: {position: this.center} }),
            reset: new CustomEvent('player_reset', {detail: {position: this.center}})
        }
        this.dom_canvas.addEventListener('keydown', this.inputHandler)
    }

    inputHandler(inputEvent) {
        // TODO: Write player controller
    }
}
