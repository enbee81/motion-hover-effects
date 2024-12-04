function clamp(number, min, max) {
  return Math.max(min, Math.min(number, max));
}

// Get DOM elements
const container = document.getElementById("canvasContainer");
const img = container.querySelector("img");

// Setup scene
const scene = new THREE.Scene();
const renderer = new THREE.WebGLRenderer();
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setClearColor(0xeeeeee, 1);
renderer.physicallyCorrectLights = true;
renderer.outputEncoding = THREE.sRGBEncoding;

// Add renderer to DOM
container.appendChild(renderer.domElement);

// Setup camera
const camera = new THREE.OrthographicCamera(-0.5, 0.5, 0.5, -0.5, -1000, 1000);
camera.position.set(0, 0, 2);

// Setup variables
let time = 0;
let size = parseFloat(container.getAttribute("data-grid")) || 34;
let mouseStrength = parseFloat(container.getAttribute("data-strength")) || 1;
let mouseRange = parseFloat(container.getAttribute("data-mouse")) || 0.25;
let relaxation = 0.9;

const mouse = {
  x: 0,
  y: 0,
  prevX: 0,
  prevY: 0,
  vX: 0,
  vY: 0,
};

// Create texture and material
const texture = new THREE.Texture(img);
texture.needsUpdate = true;

const dataTexture = createDataTexture();

const material = new THREE.ShaderMaterial({
  extensions: {
    derivatives: "#extension GL_OES_standard_derivatives : enable",
  },
  side: THREE.DoubleSide,
  uniforms: {
    time: { value: 0 },
    resolution: { value: new THREE.Vector4() },
    uTexture: { value: texture },
    uDataTexture: { value: dataTexture },
  },
  vertexShader: document.getElementById("vertexShader").textContent,
  fragmentShader: document.getElementById("fragmentShader").textContent,
});

// Create and add mesh
const geometry = new THREE.PlaneGeometry(1, 1, 1, 1);
const plane = new THREE.Mesh(geometry, material);
scene.add(plane);

// Handle window resize
function resize() {
  const width = container.offsetWidth;
  const height = container.offsetHeight;

  renderer.setSize(width, height);

  const imageAspect = 1 / 1.5;
  const a1 = height / width > imageAspect ? (width / height) * imageAspect : 1;
  const a2 = height / width > imageAspect ? 1 : height / width / imageAspect;

  material.uniforms.resolution.value.set(width, height, a1, a2);

  regenerateGrid();
}

window.addEventListener("resize", resize);
resize();

// Handle mouse movement
window.addEventListener("mousemove", (e) => {
  mouse.x = e.clientX / container.offsetWidth;
  mouse.y = e.clientY / container.offsetHeight;

  mouse.vX = mouse.x - mouse.prevX;
  mouse.vY = mouse.y - mouse.prevY;

  mouse.prevX = mouse.x;
  mouse.prevY = mouse.y;
});

// Create data texture
function createDataTexture() {
  const data = new Float32Array(3 * size * size);

  for (let i = 0; i < size * size; i++) {
    const stride = i * 3;
    data[stride] = Math.random() * 255 - 125;
    data[stride + 1] = Math.random() * 255 - 125;
    data[stride + 2] = Math.random() * 255 - 125;
  }

  const texture = new THREE.DataTexture(
    data,
    size,
    size,
    THREE.RGBFormat,
    THREE.FloatType
  );

  texture.magFilter = texture.minFilter = THREE.NearestFilter;
  return texture;
}

function regenerateGrid() {
  dataTexture.needsUpdate = true;
}

// Update and render
function updateDataTexture() {
  const data = dataTexture.image.data;

  for (let i = 0; i < data.length; i += 3) {
    data[i] *= relaxation;
    data[i + 1] *= relaxation;
  }

  const gridMouseX = size * mouse.x;
  const gridMouseY = size * (1 - mouse.y);
  const maxDist = size * mouseRange;
  const aspect = container.offsetHeight / container.offsetWidth;

  for (let i = 0; i < size; i++) {
    for (let j = 0; j < size; j++) {
      const distance = (gridMouseX - i) ** 2 / aspect + (gridMouseY - j) ** 2;

      if (distance < maxDist ** 2) {
        const index = 3 * (i + size * j);
        const power = clamp(maxDist / Math.sqrt(distance), 0, 10);

        data[index] += mouseStrength * 100 * mouse.vX * power;
        data[index + 1] -= mouseStrength * 100 * mouse.vY * power;
      }
    }
  }

  mouse.vX *= 0.9;
  mouse.vY *= 0.9;
  dataTexture.needsUpdate = true;
}

function render() {
  time += 0.05;
  updateDataTexture();
  material.uniforms.time.value = time;
  renderer.render(scene, camera);
  requestAnimationFrame(render);
}

// Start animation when DOM is loaded
window.addEventListener("DOMContentLoaded", render);
