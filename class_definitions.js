// Class Definitions for Frogger
import {mat4, quat, vec3, vec4} from "./gl_lib";
import * as utils from "./utils.js"
import {handleLoadedTexture} from "./utils.js";

export class Material {
    constructor({ambient = [], diffuse = [], specular = [], alpha = 1.0, n = 1.0, texture = '', gl}) {
        this.ambient = vec3.fromValues(...ambient);
        this.diffuse = vec3.fromValues(...diffuse);
        this.specular = vec3.fromValues(...specular);
        this.alpha = alpha;
        this.n = n;

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
        this.z_far = z_far || Infinity;

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
        window.dispatchEvent(this.changeEvent)
    }

    updateModelView() {
        // model matrix
        mat4.lookAt(this.matrix.model, this.eye, this.center, this.up);

        // normal matrix
        mat4.invert(this.matrix.view, this.matrix.model);
        mat4.transpose(this.matrix.view, this.matrix.view);

        // dispatch view change event
        window.dispatchEvent(this.changeEvent)
    }
}

export class Light {
    constructor(
        {
            position = [0, 0, 0],
            material = {
                ambient: [1, 1, 1],
                diffuse: [1, 1, 1],
                specular: [1, 1, 1]
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
            position = [0, 0, 0],
            rotation = [0, 0, 0, 0],
            scaling = [1, 1, 1],
            animatable = false
        },
        meshLookUp = {
            "name": {
                "center": [],
                "vertices": [],
                "normals": [],
                "indices": [],
                "uvs": [],
                "material": {
                    "ambient": [1, 1, 1],
                    "diffuse": [1, 1, 1],
                    "specular": [1, 1, 1],
                    "texture": ''
                }
            }
        },
        gl = new WebGLRenderingContext()
    ) {
        this.name = name;
        this.type = type;
        this.position = vec3.fromValues(...position);
        this.rotation = quat.fromValues(...rotation);
        this.scaling = vec3.fromValues(...scaling);
        this.animatable = animatable;

        this.center = meshLookUp[type].center;
        this.vertices = meshLookUp[type].vertices;
        this.normals = meshLookUp[type].normals;
        this.indices = meshLookUp[type].indices;
        this.uvs = meshLookUp[type].uvs;
        this.material = new Material(meshLookUp[type].material);
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

            this.center = vec3.fromValues(0, 0, 0);
        }

        // if texture defined, apply it
        if (this.material.texture) {
            this.texture = utils.initTexture(this.material.texture, gl);
        }

        this.refreshViewMatrix()

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

    refreshViewMatrix() {
        // set mesh view matrix to default position, rotation, scaling
        mat4.fromRotationTranslationScaleOrigin(this.viewMatrix, this.rotation, this.position, this.scaling, this.center);
    }

    transform(
        {
            translation = vec3.fromValues(0, 0, 0),
            rotation = quat.fromValues(0, 0, 0, 0),
            scaleFactor = vec3.fromValues(1, 1, 1)
        }
    ) {
        vec3.add(this.position, this.position, translation);
        quat.add(this.rotation, this.rotation, rotation)
        vec3.multiply(this.scaling, this.scaling, scaleFactor)

        this.refreshViewMatrix()
    }
}

export class Collection {
    constructor(name) {
        this.name = name;
        this.array = [];
    }

    add(...items) {
        this.array.push(...items);
    }

    flatten() {
        const flattenedArray = [];

        const flattenRecursive = (item) => {
            if (item instanceof Collection) {
                flattenedArray.push(...item.flatten());
            } else {
                flattenedArray.push(item);
            }
        };

        this.array.forEach(flattenRecursive);

        return flattenedArray;
    }
}

export class TypedCollection extends Collection {
    constructor(name, acceptTypes, nestable) {
        super(name);
        this.nestable = nestable;
        this.acceptTypes = acceptTypes;
        if (this.nestable) {
            this.acceptTypes.push(this.constructor)
        }
    }

    add(...items) {
        if (this.acceptTypes) {
            items.forEach(item => {
                if (!this.acceptTypes.some(type => item instanceof type)) {
                    throw new Error(`Invalid type for item: ${item.constructor.name}`);
                }
            });
        }

        if (!this.nestable) {
            items.forEach(item => {
                if (item instanceof Collection) {
                    throw new Error("Nesting is not allowed in this TypedCollection");
                }
            });
        }

        super.add(...items);
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
        this.length = lightVector.length

        this.vector.light.forEach(light => {
            this.vector.position.push(...vec3.fromValues(...light.position));
            this.vector.material.ambient.push(...vec3.fromValues(...light.material.ambient));
            this.vector.material.diffuse.push(...vec3.fromValues(...light.material.diffuse));
            this.vector.material.specular.push(...vec3.fromValues(...light.material.specular));
        });
    }

    recalcTransformedPosition(modelMatrix = mat4.create()) {
        const transformedPosition = vec3.create();
        this.vector.transformedPosition = []
        this.vector.light.map(light => {
            vec3.transformMat4(transformedPosition, light.position, modelMatrix);
            this.vector.transformedPosition.push(...transformedPosition);
        })

        return this.vector.transformedPosition;
    }
}

export class Row extends TypedCollection {
    constructor(name, nestable = false) {
        super(name, [Mesh], nestable);
    }

    setProperties(obj_size, start_position, o2o_distance, obj_speed, obj_direction) {
        this.childrenProperties = {obj_size, start_position, o2o_distance, obj_speed, obj_direction}
    }

    toLast(index) {
        const temp = this.array.at(-1).position[0]
        this.array.push(this.array.splice(index, 1)[0])
        this.array.at(-1).position[0] = temp - (this.childrenProperties.o2o_distance * this.childrenProperties.obj_direction);
    }
}

export class RowObject extends Mesh {
    constructor(...args) {
        super(...args);
    }
}

export class Player extends Mesh {
    constructor(...args) {
        super(...args);
        this.reset_args = args
        this.event = {
            move: new CustomEvent('player_move', {detail: {position: this.center}}),
            reset: new CustomEvent('player_reset', {detail: {position: this.center}}),
            goal_reached: new CustomEvent('player_goal_reached', {detail: {score: this.score}})
        }
    }

    reset() {
        console.log("player reset")
        this.position = vec3.fromValues(...this.reset_args[0].position)
        this.rotation = quat.fromValues(...this.reset_args[0].rotation)
        this.scaling = vec3.fromValues(...this.reset_args[0].scaling)
        this.refreshViewMatrix()
    }
}
