import * as Three from "three";
//@ts-ignore
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
// @ts-ignore
import * as RgbQuant from "./js/rgbQuant";
import { PixelData } from "./types/types"

console.log("initialize");

const imagePath = "./pepe.png";
const colorDepth = 6
// Canvas
const canvas = document.querySelector("canvas.webgl");

// Scene
const scene = new Three.Scene();

// Sizes
const sizes = {
  width: 800,
  height: 600,
};

// Camera
const camera = new Three.PerspectiveCamera(-75, sizes.width / sizes.height);
camera.position.set(0, 0, 1000);
scene.add(camera);

// Clock
const clock = new Three.Clock();

// Controls
//@ts-ignore
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;

// Initialize Meshes Array
const meshes = []

// Renderer
const renderer = new Three.WebGLRenderer({
  canvas: canvas,
});
renderer.setSize(sizes.width, sizes.height);
renderer.setClearColor("grey", 1);
renderer.render(scene, camera);

// load imgae
const img = new Image();
img.src = imagePath;
const canvasReduced = <HTMLCanvasElement>document.getElementById("imageCanvas");

draw();


function animation() {
  const elapsedTime = clock.getElapsedTime();

  // Update controls
  controls.update();

  // Render
  renderer.render(scene, camera);

  // Call tick again on the next frame
  window.requestAnimationFrame(animation);
}

function draw() {
  console.log("draw");


  img.addEventListener("load", (srcImg) => {
    //#### LOAD SRC IMAGE ####
    const srcImageData = loadSrcImage();

    //#### REDUCE COLOR WITH GRAYSCALE ####
    const reducedImageDataArray = reduceColors(img, colorDepth, 0.2);
    console.log({ reducedImageData: reducedImageDataArray });
    putPixels(reducedImageDataArray, img.width, img.height, "imageCanvasReduced");

    // #### ENHANCE ARRAY with 1D Value and coordinates ####
    let arrayOneValue = enhancePixelData(reducedImageDataArray, img.height, img.width, 7);
    console.log({ arrayOneValue });

    arrayOneValue = arrayOneValue.filter((item: PixelData) => !item.ignore);

    // #### FILTER RELEVANT LAYERS ####
    filterMeshes(arrayOneValue);

    // START ANIMATION
    animation();
  });

}

function filterMeshes(arrayOneValue: PixelData[]) {
  const clusters = [
    {
      value: 1,
      color: 'green',
      zPosition: 0,
    },
  ];
  for (const cluster of clusters) {
    const material = new Three.MeshBasicMaterial({ color: cluster.color });
    arrayOneValue
      .filter((pix: any) => pix.mappedValue == cluster.value)
      .forEach((pixel: any, i: number) => {
        const geometry = new Three.TorusGeometry(3, 0.3, 2, 11);
        const torus = new Three.Mesh(geometry, material);
        torus.position.x = pixel.coordinates[0];
        torus.position.y = pixel.coordinates[1];
        scene.add(torus);
      });
  }
}

function enhancePixelData(imageDataArray: number[], newHeight: number, newWidth: number, takeEveryN: number): PixelData[] {
  const arrayOneValue: PixelData[] = [];
  const distinctRgbs: string[] = [];
  let j = 0;
  for (let i = 0; i < imageDataArray.length; i += 4) {
    j++;
    let ignore: boolean;
    if (j % takeEveryN == 0) {
      ignore = false;
    } else {
      ignore = true;
    }
    const value = `${imageDataArray[i]}_${imageDataArray[i + 1]}_${imageDataArray[i + 2]}`;
    let mappedValue: number;
    if (!distinctRgbs.includes(value)) {
      distinctRgbs.push(value);
      mappedValue = distinctRgbs.length + 1;
    } else {
      mappedValue = distinctRgbs.indexOf(value);
    }
    arrayOneValue.push({ mappedValue: mappedValue, ignore: ignore, coordinates: [] as any });
  }

  // add coordinates
  for (let y = 0; y < newHeight; y++) {
    for (let x = 0; x < newWidth; x++) {
      arrayOneValue[x + y * newWidth].coordinates = [x, y, 0];
    }
  }
  return arrayOneValue;
}

function loadSrcImage(): ImageData {
  console.log("loadSrcImage");

  canvasReduced.width = img.width;
  canvasReduced.height = img.height;
  const ctx = canvasReduced.getContext("2d");
  ctx.drawImage(img, 0, 0);
  img.style.display = "none";
  const imageData = ctx.getImageData(0, 0, canvasReduced.width, canvasReduced.height);
  return imageData;
}

function putPixels(subpxArr: number[], width: number, height: number, id: string): ImageData {
  let can = document.createElement('canvas');
  id && can.setAttribute('id', id);
  can.width = width;
  can.height = height;
  let ctx = can.getContext('2d');
  let imgd = ctx.createImageData(can.width, can.height);
  imgd.data.set(subpxArr);
  ctx.putImageData(imgd, 0, 0);
  document.body.appendChild(can);
  return imgd;
}

function reduceColors(img: HTMLImageElement, nColors: number, dithDelta: number): number[] {

  const rgbQuant = new RgbQuant({
    colors: nColors,
    reIndex: true,
    dithKern: "FloydSteinberg",
    dithDelta: dithDelta,
    useCache: false,
  });
  rgbQuant.sample(img);
  const reduced = rgbQuant.reduce(img);
  return reduced;
}