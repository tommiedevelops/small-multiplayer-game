// Initialize renderer
// Initialize empty scene
// Hardcode some stuff into the scene for now

import { Renderer } from "./renderer/renderer"
import { SceneGraph, SceneData }  from "./scene/scene_graph.js"
import Mesh from "./assets/mesh"

// Temporary
import { Mat3, mat3, Mat4, mat4, Vec3, vec3, Vec2, vec2, Vec4, vec4, quat } from "wgpu-matrix"
import { networkIcon } from "@colyseus/sdk/debug/icons";
import NetworkClient from "./services/NetworkClient";

async function main()
{

    const canvas = document.querySelector("canvas") as HTMLCanvasElement;

    // Connect to server
   let networkClient : NetworkClient = new NetworkClient("http://localhost:2567"); 

    // Retrieve Scene (for now hardcoded but in future from server and probably part of main loop)
    const httpResponse = await fetch("./scenes/scene.json");

    if(!httpResponse.ok) {
        console.error("HTTP-Error: " + httpResponse.status);
        return;
    }

    let sceneData : SceneData = await httpResponse.json(); // Validate success?

    console.log(sceneData);

    let scene = new SceneGraph(sceneData);

    const cam_position = vec3.create(0,0,-5);
    const cam_forward = vec3.create(0,0,0);
    const cam_up = vec3.create(0,1,0);
    const cam_fov = 45 * Math.PI / 180; // radians
    const cam_near = 1;
    const cam_far = 20;
    const cam_aspect = canvas.width / canvas.height; 

    //const modelMat : Mat4 = mat4.multiply(mat4.multiply(meshTranslation, meshRotation), meshScale);
    //const viewMat  : Mat4 = mat4.lookAt(cam_position, cam_target, cam_up);
    //const projMat  : Mat4 = mat4.perspective(cam_fov, cam_aspect, cam_near, cam_far);

    let renderer : Renderer = await Renderer.create(canvas);

    const modelUniformBufferSize : number = 64;  //mat4x4<f32>
    const viewUniformBufferSize  : number = 64;  //mat4x4<f32>
    const projUniformBufferSize  : number = 64;  //mat4x4<f32>

    const modUniformBuffer  = renderer.createBuffer(modelUniformBufferSize, GPUBufferUsage.UNIFORM);
    const viewUniformBuffer = renderer.createBuffer(viewUniformBufferSize, GPUBufferUsage.UNIFORM);
    const projUniformBuffer = renderer.createBuffer(projUniformBufferSize, GPUBufferUsage.UNIFORM);

    const shaderFileResponse = await fetch("./shaders/brick_tower.wgsl");
    const source : string = await shaderFileResponse.text();

    const shader = renderer.createShader(source, "brick_tower");
    const pipeline = renderer.createPipeline(shader, shader, "brick_tower");

    const uniformBuffer = renderer.createBuffer(16, GPUBufferUsage.UNIFORM);
    const cameraBuffer  = renderer.createBuffer(32,  GPUBufferUsage.UNIFORM);

    let bindGroup = renderer.createBindGroup(
        pipeline.getBindGroupLayout(0), 
        [
            {binding: 0, resource: {buffer: uniformBuffer}},
            {binding: 1, resource: {buffer: cameraBuffer}},
        ]
    );

    // Observer for resizing the canvas
    const observer = new ResizeObserver(entries => {
        for (const entry of entries) {

            const canvas = entry.target as HTMLCanvasElement;
            const width = entry.contentBoxSize[0].inlineSize;
            const height = entry.contentBoxSize[0].blockSize;

            canvas.width = Math.max(1, Math.min(width, renderer.getDevice().limits.maxTextureDimension2D));
            canvas.height = Math.max(1, Math.min(height, renderer.getDevice().limits.maxTextureDimension2D));

            renderer.onCanvasResize(canvas.width, canvas.height);
        }
    });

    observer.observe(canvas);

    // Main Loop
    let start = Date.now();
    let totalTime = 0;

    function frame() {

        // Update Time
        let dt = Date.now() - start;
        totalTime += dt / 1000; // number of seconds passed
        start = Date.now();

        // Poll Events (Network, Input, Other)

        // Update Scripts 
        // Pass deltaTime and EventQueue (time stamped)

        // Emit Events (Custom, Network)

        // Update Physics

        // Read Scene

        // Update Uniforms to be passed to GPU

        let uniformData = new Float32Array([
            canvas.width, canvas.height, totalTime, 0
        ])

        let cameraData = new Float32Array([
            cam_position[0], cam_position[1], cam_position[2], /* pad for 16b align*/ 0,
            cam_forward[0],  cam_forward[1],  cam_forward[2],  /* pad for 16b align*/0
        ]);

        // Pass Uniforms to GPU
        renderer.writeBuffer(uniformBuffer, uniformData);
        renderer.writeBuffer(cameraBuffer, cameraData);

        // Set up Render Pass(es) and encode commands for the GPU
        const { encoder, pass } = renderer.beginFrame();
        pass.setPipeline(pipeline);
        pass.setBindGroup(0, bindGroup);
        pass.draw(3);

        // Send instructions to the GPU
        renderer.endFrame(encoder, pass);

        // Ask browser to render the frame
        requestAnimationFrame(frame);
    }

    // Ask browswer to render the frame
    requestAnimationFrame(frame);
}

main();
