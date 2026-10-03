
fn sdSphere(
    p: vec3<f32>,
    s: vec3<f32>,
    r: f32,
    col: vec3<f32>
    ) -> vec4<f32>
{
    var d : f32 = length(p - s) - r;
    return vec4(d, col);
}

fn sdBox(
    p: vec3<f32>,
    b: vec3<f32>,
    col: vec3<f32>
) -> vec4<f32> {
    let q = abs(p) - b;
    let d = length(max(q, vec3<f32>(0.0))) + min(max(q.x, max(q.y, q.z)), 0.0);
    return vec4<f32>(d,col);
}

fn rotateY(p: vec3<f32>, angle: f32) -> vec3<f32> {
    let s = sin(angle);
    let c = cos(angle);
    return vec3<f32>(
        c * p.x + s * p.z,
        p.y,
        -s * p.x + c * p.z,
    );
}

fn smin(a: f32, b: f32, k: f32) -> f32 {
    let h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
    return mix(b, a, h) - k * h * (1.0 - h);
}

fn opUnion(a: vec4<f32>, b: vec4<f32>) -> vec4<f32> {
    return select(b, a, a.x < b.x); // if a is closer, keep all of a; else keep all of b
}

fn opSmoothUnion(a: vec4<f32>, b: vec4<f32>, k: f32) -> vec4<f32> {
    let h = clamp(0.5 + 0.5 * (b.x - a.x) / k, 0.0, 1.0);
    let d = mix(b.x, a.x, h) - k * h * (1.0 - h);
    let color = mix(b.yzw, a.yzw, h);
    return vec4<f32>(d, color);
}

fn map(p: vec3<f32>) -> vec4<f32>
{
    let t : f32 = uniforms.time; 
    let col1 = vec3(1,0.2,0.3);
    let col2 = vec3(0.0,1.0 ,0.1);

    let s = sdSphere(p, vec3(cos(t),sin(t),cos(t)), 1.0, col1);

    let box = rotateY(p - vec3<f32>(1.5,0.0,0.0), uniforms.time);

    let b = sdBox(box, vec3<f32>(1,1,1), col2);

    return opSmoothUnion(s,b,0.5);
}


@vertex
fn vs_main(@builtin(vertex_index) idx: u32) -> @builtin(position) vec4<f32> {

    var pos = array<vec2<f32>, 3>(
        vec2<f32>(-1.0, -1.0),
        vec2<f32>( 3.0, -1.0),
        vec2<f32>(-1.0,  3.0),
    );

    return vec4<f32>(pos[idx], 0.0, 1.0);
}

struct Uniforms {
    resolution: vec2<f32>,
    time: f32,
    _padding: f32,
}

struct CameraUniforms {
    worldPosition: vec3<f32>, // 12 bytes + 4 bytes padding
    worldRotation: vec3<f32>  // 12 bytes + 4 bytes padding
}

@group(0) @binding(0) var<uniform> uniforms: Uniforms;

fn calcNormal(p: vec3<f32>) -> vec3<f32> {
    let eps = 0.0001;

    let dx = vec3<f32>(eps, 0.0, 0.0);
    let dy = vec3<f32>(0.0, eps, 0.0);
    let dz = vec3<f32>(0.0, 0.0, eps);

    return normalize(vec3<f32>(
        map(p + dx)[0] - map(p - dx)[0],
        map(p + dy)[0] - map(p - dy)[0],
        map(p + dz)[0] - map(p - dz)[0]
    ));

}

@fragment
fn fs_main(@builtin(position) fragCoord: vec4<f32>) -> @location(0) vec4<f32> {

    // Initialization
    let uv : vec2<f32> = (fragCoord.xy * 2.0 - uniforms.resolution) / uniforms.resolution.y;
    let ro : vec3<f32> = vec3(0,0,-4); // ray origin (read form uniform)
    let rd : vec3<f32> = normalize(vec3(uv, 1));  // ray direction (read from uniform)
    var col : vec3<f32>; // final pixel color

    var t : f32 = 0; // total distance travelled

    // Raymarching ( Each pixel has a corresponding ray )
    for(var i = 0; i < 80; i++) {
        let p : vec3<f32> = ro + rd * t; // position along ray
        let d : vec4<f32> = map(p); // current distance to the scene

        if (d[0] < 0.001) {
            let n = calcNormal(p);
            let lightDir = normalize(vec3<f32>(1.0,-1.0,-1.0));
            let diffuse = max(dot(n,lightDir), 0.0);
            let albedo = d.yzw;
            col = albedo * diffuse;
            break; 
        }

        t += d[0]; // "march" along the ray

        if (t > 100.0) { 
            col = vec3<f32>(0.1,0.2,0.3);
            break;
        }
    }

    return vec4(col,1.0);
}