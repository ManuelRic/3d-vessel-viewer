import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { Water } from 'three/addons/objects/Water.js';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
import {
    shipsData,
    shipModelPaths
} from './boatData.js';
import {
    hideBoatDetails,
    showBoatDetails
} from './boatDetailCard.js';
import { initDateTimeWidget } from './generalData.js';


initDateTimeWidget();

// -------------------------------------------------------------------------------------------------------------------------------------------------
// THREE JS BEHAVIOUR
// -------------------------------------------------------------------------------------------------------------------------------------------------

// -----------------------------
// SCENE
// -----------------------------

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x050816);

// -----------------------------
// Sky
// -----------------------------


new RGBELoader().load(
    './images/sky/pure_sky_4k.hdr',
    function (texture) {
        texture.mapping = THREE.EquirectangularReflectionMapping;

        scene.background = texture;
        scene.environment = null;
    },
    undefined,
    function (error) {
        console.error('Error loading HDR skybox:', error);
    }
);

// -----------------------------
// CAMERA
// -----------------------------
const defaultCameraPosition = new THREE.Vector3(0, 80, 180);
const defaultCameraTarget = new THREE.Vector3(0, 0, 0);

const camera = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.1,
    15000
);

camera.position.copy(defaultCameraPosition);
camera.lookAt(defaultCameraTarget);
camera.layers.enable(1);
// -----------------------------
// RENDERER
// -----------------------------

const renderer = new THREE.WebGLRenderer({
    antialias: true
});

renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1;

document.body.appendChild(renderer.domElement);

// -----------------------------
// LIGHTS
// -----------------------------
let light = 2.5;

const ambientLight = new THREE.AmbientLight(0xffffff, light/8);
scene.add(ambientLight);

const sunLight = new THREE.DirectionalLight(0xfff7A4, light);
sunLight.position.set(80, 120, 60);
scene.add(sunLight);

const sunDirection = sunLight.position.clone().normalize();

// -----------------------------
// BUTTONS
// -----------------------------

const topViewButton = document.getElementById('top-view-button');
const toggleTrailButton = document.getElementById('toggle-trail');
let trailsVisible = true;

// -----------------------------
// CONTROLS
// -----------------------------

const controls = new OrbitControls(camera, renderer.domElement);
const cameraDampingFactor = 0.12;
const cameraTransitionDuration = 0.35;
const minShipFocusDistance = 65;
const maxShipFocusDistance = 150;
let cameraTransition = null;

controls.enableDamping = true;
controls.dampingFactor = cameraDampingFactor;
controls.enablePan = true;
controls.panSpeed = 1.1;
controls.screenSpacePanning = true;

// Left click drag pans around the map, right click drag looks around in place.
controls.mouseButtons = {
    LEFT: THREE.MOUSE.PAN,
    MIDDLE: THREE.MOUSE.DOLLY
};

controls.target.set(0, 0, 0);
controls.update();

function clearCameraMomentum() {
    controls.enableDamping = false;
    controls.update();
    controls.enableDamping = true;
    controls.dampingFactor = cameraDampingFactor;
}

function easeOutCubic(value) {
    return 1 - Math.pow(1 - value, 3);
}

function startCameraTransition(position, target) {
    clearCameraMomentum();

    cameraTransition = {
        startTime: performance.now() / 1000,
        duration: cameraTransitionDuration,
        startPosition: camera.position.clone(),
        endPosition: position.clone(),
        startTarget: controls.target.clone(),
        endTarget: target.clone()
    };
}

function updateCameraTransition(now) {
    if (!cameraTransition) return false;

    const progress = THREE.MathUtils.clamp(
        (now - cameraTransition.startTime) / cameraTransition.duration,
        0,
        1
    );
    const easedProgress = easeOutCubic(progress);

    camera.position.lerpVectors(
        cameraTransition.startPosition,
        cameraTransition.endPosition,
        easedProgress
    );
    controls.target.lerpVectors(
        cameraTransition.startTarget,
        cameraTransition.endTarget,
        easedProgress
    );

    if (progress >= 1) {
        camera.position.copy(cameraTransition.endPosition);
        controls.target.copy(cameraTransition.endTarget);
        cameraTransition = null;
        clearCameraMomentum();
    }

    return true;
}

function getCurrentCameraOffset() {
    if (cameraTransition) {
        return new THREE.Vector3().subVectors(
            cameraTransition.endPosition,
            cameraTransition.endTarget
        );
    }

    return new THREE.Vector3().subVectors(
        camera.position,
        controls.target
    );
}

function getShipFocusOffset() {
    const offset = getCurrentCameraOffset();

    if (offset.lengthSq() === 0) {
        return followOffset.clone();
    }

    const distance = THREE.MathUtils.clamp(
        offset.length(),
        minShipFocusDistance,
        maxShipFocusDistance
    );

    return offset.normalize().multiplyScalar(distance);
}

// -----------------------------
// CAMERA DRAG
// -----------------------------

const cameraDragThreshold = 5;
const cameraLookSensitivity = 0.005;
const minCameraLookPhi = 0.05;
const maxCameraLookPhi = Math.PI - 0.05;
let cameraPointerStart = null;
let cameraRightPointer = null;
let shiftLeftPanPointer = null;
let isCameraDragging = false;
let suppressNextClick = false;
let suppressClickTimeout = null;

function setLeftMouseAction(action) {
    controls.mouseButtons = {
        ...controls.mouseButtons,
        LEFT: action
    };
}

function getCameraOrbitTarget() {
    if (focusedShip) {
        return getShipCenter(focusedShip.model);
    }

    return defaultCameraTarget.clone();
}

function rotateCameraInPlace(movementX, movementY) {
    const lookDirection = new THREE.Vector3()
        .subVectors(controls.target, camera.position);

    if (lookDirection.lengthSq() === 0) {
        camera.getWorldDirection(lookDirection);
    }

    const lookSpherical = new THREE.Spherical().setFromVector3(lookDirection);

    lookSpherical.theta -= movementX * cameraLookSensitivity;
    lookSpherical.phi = THREE.MathUtils.clamp(
        lookSpherical.phi + movementY * cameraLookSensitivity,
        minCameraLookPhi,
        maxCameraLookPhi
    );

    lookDirection.setFromSpherical(lookSpherical);
    controls.target.copy(camera.position).add(lookDirection);
    controls.update();
}

function rotateCameraAroundTarget(movementX, movementY) {
    const orbitTarget = getCameraOrbitTarget();
    const cameraOffset = new THREE.Vector3()
        .subVectors(camera.position, orbitTarget);

    if (cameraOffset.lengthSq() === 0) return;

    const orbitSpherical = new THREE.Spherical().setFromVector3(cameraOffset);

    orbitSpherical.theta -= movementX * cameraLookSensitivity;
    orbitSpherical.phi = THREE.MathUtils.clamp(
        orbitSpherical.phi - movementY * cameraLookSensitivity,
        minCameraLookPhi,
        maxCameraLookPhi
    );

    cameraOffset.setFromSpherical(orbitSpherical);
    camera.position.copy(orbitTarget).add(cameraOffset);
    controls.target.copy(orbitTarget);
    controls.update();
}

function suppressClickAfterCameraDrag() {
    suppressNextClick = true;

    if (suppressClickTimeout) {
        clearTimeout(suppressClickTimeout);
    }

    suppressClickTimeout = setTimeout(function () {
        suppressNextClick = false;
        suppressClickTimeout = null;
    }, 250);
}

renderer.domElement.addEventListener('pointerdown', function (event) {
    if (event.button === 2) {
        event.preventDefault();
        event.stopImmediatePropagation();

        cameraRightPointer = {
            id: event.pointerId,
            x: event.clientX,
            y: event.clientY
        };

        renderer.domElement.setPointerCapture(event.pointerId);
        cameraTransition = null;

        if (!event.shiftKey) {
            followShip = false;
            focusedShip = false;
        }

        clearCameraMomentum();
        return;
    }

    if (event.button !== 0) return;

    if (event.shiftKey) {
        shiftLeftPanPointer = event.pointerId;
        setLeftMouseAction(THREE.MOUSE.ROTATE);
    } else {
        setLeftMouseAction(THREE.MOUSE.PAN);
    }

    cameraPointerStart = {
        x: event.clientX,
        y: event.clientY
    };
    isCameraDragging = false;
}, true);

renderer.domElement.addEventListener('pointermove', function (event) {
    if (cameraRightPointer && event.pointerId === cameraRightPointer.id) {
        event.preventDefault();

        const movementX = event.clientX - cameraRightPointer.x;
        const movementY = event.clientY - cameraRightPointer.y;

        cameraRightPointer.x = event.clientX;
        cameraRightPointer.y = event.clientY;

        if (event.shiftKey) {
            rotateCameraInPlace(movementX, movementY);
        } else {
            rotateCameraAroundTarget(movementX, movementY);
        }

        return;
    }

    if (!cameraPointerStart) return;

    const dragDistance = Math.hypot(
        event.clientX - cameraPointerStart.x,
        event.clientY - cameraPointerStart.y
    );

    if (dragDistance < cameraDragThreshold) return;

    isCameraDragging = true;
    suppressClickAfterCameraDrag();
    cameraTransition = null;
    followShip = false;
    focusedShip = false;
});

renderer.domElement.addEventListener('pointerup', function (event) {
    if (cameraRightPointer && event.pointerId === cameraRightPointer.id) {
        renderer.domElement.releasePointerCapture(event.pointerId);
        cameraRightPointer = null;
        clearCameraMomentum();
        return;
    }

    if (shiftLeftPanPointer === event.pointerId) {
        shiftLeftPanPointer = null;
        setLeftMouseAction(THREE.MOUSE.PAN);
    }

    cameraPointerStart = null;
    isCameraDragging = false;
});

renderer.domElement.addEventListener('pointercancel', function (event) {
    if (cameraRightPointer && event.pointerId === cameraRightPointer.id) {
        cameraRightPointer = null;
        clearCameraMomentum();
        return;
    }

    if (shiftLeftPanPointer === event.pointerId) {
        shiftLeftPanPointer = null;
        setLeftMouseAction(THREE.MOUSE.PAN);
    }

    cameraPointerStart = null;
    isCameraDragging = false;
});

renderer.domElement.addEventListener('contextmenu', function (event) {
    event.preventDefault();
});

// -----------------------------
// WATER
// -----------------------------
const waterWidth = 3000;
const waterHeight = 3000;
const waterGeometry = new THREE.PlaneGeometry(waterWidth, waterHeight);
const darkWaterColor = new THREE.Color(0x02070c);
const litWaterColor = new THREE.Color(0x1f4f7a);

const water = new Water(
    waterGeometry,
    {
        textureWidth: 1024,
        textureHeight: 1024,

        waterNormals: new THREE.TextureLoader().load(
            './textures/water.jpg',
            function (texture) {
                texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
            }
        ),

        sunDirection: sunDirection,
        sunColor: sunLight.color,
        waterColor: 0x1f4f7a,
        distortionScale: 1,
    }
);

water.rotation.x = -Math.PI / 2;
water.position.set(0, 0.5, 0);
scene.add(water);

function updateWaterSunFromLight() {
    const lightLevel = THREE.MathUtils.clamp(sunLight.intensity / 1.5, 0, 1);

    water.material.uniforms['sunDirection'].value
        .copy(sunLight.position)
        .normalize();

    water.material.uniforms['sunColor'].value
        .copy(sunLight.color)
        .multiplyScalar(lightLevel);

    water.material.uniforms['waterColor'].value
        .copy(darkWaterColor)
        .lerp(litWaterColor, lightLevel);
}

updateWaterSunFromLight();
// -----------------------------
// BOAT
// -----------------------------

const gltfLoader = new GLTFLoader();

const ships = [];
let selectedShip = null;
let followShip = false;
let focusedShip = false;
let followOffset = new THREE.Vector3(0, 35, 80);

const boatBounds = 1500;
const collisionLookAheadFrames = 1500;
const collisionSafeDistance = 70;
const collisionClearanceDistance = 45;
const collisionCorrectionStrength = 1.4;
const avoidanceTurnMultiplier = 3.5;
const emergencyTurnMultiplier = 7;
const emergencySlowdown = 0.35;
const hullContactClearance = 4;
const overlapSeparationIterations = 3;
const headOnBearingLimit = THREE.MathUtils.degToRad(20);
const crossingBearingLimit = THREE.MathUtils.degToRad(112.5);

function randomBoatPosition() {
    return (Math.random() - 0.5) * boatBounds;
}

function getStarboardDirection(forward) {
    return new THREE.Vector3(forward.z, 0, -forward.x).normalize();
}

function getRelativeBearing(forward, relativePosition) {
    const directionToOther = relativePosition.clone().normalize();
    const starboard = getStarboardDirection(forward);

    return Math.atan2(
        starboard.dot(directionToOther),
        forward.dot(directionToOther)
    );
}

function getShipForward(ship) {
    return new THREE.Vector3(0, 0, 1).applyAxisAngle(
        new THREE.Vector3(0, 1, 0),
        ship.model.rotation.y - ship.forwardOffset
    );
}

function getShipCollisionRadius(shipModel) {
    const box = new THREE.Box3().setFromObject(shipModel);
    const size = new THREE.Vector3();
    box.getSize(size);

    return Math.sqrt(size.x * size.x + size.z * size.z) * 0.5;
}

function getShipTrailOffset(shipModel) {
    const box = new THREE.Box3().setFromObject(shipModel);
    const size = new THREE.Vector3();
    box.getSize(size);

    return Math.max(size.x, size.z) * 0.5;
}

function getVibrantTrailColor(color) {
    const trailColor = new THREE.Color(color);

    const hsl = {};
    trailColor.getHSL(hsl);

    hsl.s = Math.min(hsl.s * 1.5, 1);
    hsl.l = Math.min(hsl.l * 1.25, 0.75);

    trailColor.setHSL(hsl.h, hsl.s, hsl.l);

    return trailColor;
}

function getCollisionSafeDistance(ship, otherShip) {
    const hullDistance =
        ship.collisionRadius + otherShip.collisionRadius +
        collisionClearanceDistance;

    return Math.max(collisionSafeDistance, hullDistance);
}

function getColregAvoidanceDirection(
    shipForward,
    otherForward,
    relativePosition,
    shipSpeed,
    otherSpeed
) {
    const bearingToOther = getRelativeBearing(shipForward, relativePosition);
    const bearingFromOther = getRelativeBearing(
        otherForward,
        relativePosition.clone().multiplyScalar(-1)
    );
    const headingAlignment = shipForward.dot(otherForward);
    const otherIsAhead = Math.abs(bearingToOther) < crossingBearingLimit;
    const shipIsBehindOther = Math.abs(bearingFromOther) > crossingBearingLimit;
    const shipIsOvertaking =
        shipIsBehindOther && headingAlignment > 0.45 && shipSpeed > otherSpeed;

    if (shipIsOvertaking) {
        return getStarboardDirection(shipForward);
    }

    if (
        Math.abs(bearingToOther) < headOnBearingLimit &&
        headingAlignment < -0.55
    ) {
        return getStarboardDirection(shipForward);
    }

    if (otherIsAhead && bearingToOther > 0) {
        return getStarboardDirection(shipForward);
    }

    return null;
}

function getCollisionAvoidanceDirection(ship) {
    const shipPosition = ship.model.position;
    const shipForward = getShipForward(ship);
    const shipVelocity = shipForward.clone().multiplyScalar(ship.speed);
    const avoidance = new THREE.Vector3();
    let maxUrgency = 0;
    let emergency = false;

    ships.forEach(function (otherShip) {
        if (otherShip === ship) return;

        const otherPosition = otherShip.model.position;
        const otherForward = getShipForward(otherShip);
        const otherVelocity = otherForward.clone().multiplyScalar(
            otherShip.speed
        );

        const relativePosition = new THREE.Vector3().subVectors(
            otherPosition,
            shipPosition
        );
        relativePosition.y = 0;
        const currentDistance = relativePosition.length();
        const pairSafeDistance = getCollisionSafeDistance(ship, otherShip);

        const relativeVelocity = new THREE.Vector3().subVectors(
            otherVelocity,
            shipVelocity
        );
        relativeVelocity.y = 0;

        const relativeSpeedSquared = relativeVelocity.lengthSq();
        if (relativeSpeedSquared < 0.000001) {
            if (currentDistance >= pairSafeDistance) return;

            const escapeDirection =
                currentDistance > 0 ?
                relativePosition.clone().multiplyScalar(-1).normalize() :
                getStarboardDirection(shipForward);
            const urgency = 1 - currentDistance / pairSafeDistance;

            emergency = true;
            maxUrgency = Math.max(maxUrgency, urgency);
            avoidance.addScaledVector(
                escapeDirection,
                urgency * collisionCorrectionStrength
            );
            return;
        }

        const closestTime = THREE.MathUtils.clamp(
            -relativePosition.dot(relativeVelocity) / relativeSpeedSquared,
            0,
            collisionLookAheadFrames
        );

        const futureSeparation = relativePosition.clone().addScaledVector(
            relativeVelocity,
            closestTime
        );
        const futureDistance = futureSeparation.length();

        if (
            futureDistance >= pairSafeDistance &&
            currentDistance >= pairSafeDistance
        ) {
            return;
        }

        let avoidanceDirection = getColregAvoidanceDirection(
            shipForward,
            otherForward,
            relativePosition,
            ship.speed,
            otherShip.speed
        );

        const currentUrgency = 1 - currentDistance / pairSafeDistance;
        const futureUrgency = 1 - futureDistance / pairSafeDistance;
        const urgency = Math.max(currentUrgency, futureUrgency);
        const closingFast = relativePosition.dot(relativeVelocity) < 0;

        if (!avoidanceDirection && urgency > 0.35 && closingFast) {
            const escapeDirection = relativePosition.clone().multiplyScalar(-1);
            escapeDirection.y = 0;

            if (escapeDirection.lengthSq() > 0) {
                avoidanceDirection = escapeDirection.normalize();
            }
        }

        if (!avoidanceDirection) return;

        if (urgency > 0.45 || currentDistance < pairSafeDistance * 0.75) {
            emergency = true;
        }

        maxUrgency = Math.max(maxUrgency, urgency);

        avoidance.addScaledVector(
            avoidanceDirection,
            urgency * collisionCorrectionStrength
        );
    });

    ship.avoidanceUrgency = maxUrgency;
    ship.emergencyAvoidance = emergency;

    return avoidance;
}

function separateOverlappingShips() {
    for (
        let iteration = 0;
        iteration < overlapSeparationIterations;
        iteration += 1
    ) {
        for (let i = 0; i < ships.length; i += 1) {
            for (let j = i + 1; j < ships.length; j += 1) {
                const ship = ships[i];
                const otherShip = ships[j];
                const separation = new THREE.Vector3().subVectors(
                    otherShip.model.position,
                    ship.model.position
                );

                separation.y = 0;

                const distance = separation.length();
                const hullContactDistance =
                    ship.collisionRadius + otherShip.collisionRadius +
                    hullContactClearance;

                if (distance >= hullContactDistance) continue;

                const pushDirection = distance > 0 ?
                    separation.normalize() :
                    getStarboardDirection(getShipForward(ship));
                const overlap = hullContactDistance - distance;
                const pushAmount = overlap * 0.5;

                ship.model.position.addScaledVector(
                    pushDirection,
                    -pushAmount
                );
                otherShip.model.position.addScaledVector(
                    pushDirection,
                    pushAmount
                );
            }
        }
    }
}

shipsData.forEach(function (shipData) {
    const modelPath = shipModelPaths[shipData.shipType];

    if (!modelPath) {
        console.error('Missing model path for ship type:', shipData.shipType);
        return;
    }

    gltfLoader.load(
        modelPath,

        function (gltf) {
            const shipModel = gltf.scene.clone(true);

            shipModel.position.set(
                shipData.startPosition.x,
                shipData.startPosition.y,
                shipData.startPosition.z
            );

            const shipScale = shipData.scale ?? 1;

            shipModel.scale.set(
                shipScale,
                shipScale,
                shipScale
            );

            scene.add(shipModel);

            const collisionRadius = getShipCollisionRadius(shipModel);
            const trailOffset =
                getShipTrailOffset(shipModel) *
                (shipData.trailOffsetMultiplier ?? 1);

            ships.push({
                model: shipModel,
                details: shipData,
                target: new THREE.Vector3(
                    randomBoatPosition(),
                    shipData.startPosition.y,
                    randomBoatPosition()
                ),
                speed: shipData.moveSpeed,
                turnSpeed: shipData.turnSpeed,
                forwardOffset: shipData.forwardOffset,
                scale: shipScale,
                trailPositions: [],
                trailTimes: [],
                trailLine: null,
                trailOutlineLine: null,
                trailColor: shipData.trailColor,
                collisionRadius: collisionRadius,
                trailOffset: trailOffset,
            });

            console.log('Ship loaded:', shipData.name, modelPath);
        },

        undefined,

        function (error) {
            console.error('Error loading ship:', shipData.name, error);
        }
    );
});

// -----------------------------
// RAYCASTER
// -----------------------------

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

function getShipUnderMouse(event) {
    if (ships.length === 0) return null;

    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);

    const shipModels = ships.map(ship => ship.model);
    const hits = raycaster.intersectObjects(shipModels, true);

    if (hits.length === 0) return null;

    const hitObject = hits[0].object;

    return ships.find(function (ship) {
        let current = hitObject;

        while (current) {
            if (current === ship.model) return true;
            current = current.parent;
        }

        return false;
    });
}

// -----------------------------
// BOAT CENTER
// -----------------------------

function getShipCenter(shipModel) {
    const box = new THREE.Box3().setFromObject(shipModel);
    const center = new THREE.Vector3();
    box.getCenter(center);
    return center;
}

// -----------------------------
// CLICK HANDLER
// -----------------------------
window.addEventListener('click', function (event) {
    if (suppressNextClick) {
        suppressNextClick = false;
        if (suppressClickTimeout) {
            clearTimeout(suppressClickTimeout);
            suppressClickTimeout = null;
        }
        return;
    }

    const clickedShip = getShipUnderMouse(event);

    if (!clickedShip) return;

    clearHoverTimer();
    hideVesselHoverLabel();

     if (selectedShip === clickedShip) {
        selectedShip = null;

        hideBoatDetails();
        return;
    }

    selectedShip = clickedShip;

    showBoatDetails(clickedShip.details);
});

window.addEventListener('dblclick', function (event) {

    const clickedShip = getShipUnderMouse(event);

    if (!clickedShip) return;

    clearHoverTimer();
    hideVesselHoverLabel();

    if (focusedShip === clickedShip && followShip) {
        followShip = false;
        focusedShip = false;
        selectedShip = null;

        startCameraTransition(
            defaultCameraPosition,
            defaultCameraTarget
        );

        hideBoatDetails();
        return;
    }

    focusedShip = clickedShip;
    selectedShip = clickedShip;
    followShip = true;

    const shipCenter = getShipCenter(clickedShip.model);

    followOffset.copy(getShipFocusOffset());

    startCameraTransition(
        new THREE.Vector3().copy(shipCenter).add(followOffset),
        shipCenter
    );

    showBoatDetails(clickedShip.details);
});


// -----------------------------
// VESSEL HOVER
// -----------------------------

const vesselHoverLabel = document.getElementById('vessel-hover-label');
const vesselHoverDelay = 500;
let hoveredShip = null;
let hoverTimeout = null;
let latestHoverEvent = null;

function clearHoverTimer() {
    if (!hoverTimeout) return;

    clearTimeout(hoverTimeout);
    hoverTimeout = null;
}

function hideVesselHoverLabel() {
    if (!vesselHoverLabel) return;

    vesselHoverLabel.style.display = 'none';
}

function showVesselHoverLabel(ship, event) {
    if (!vesselHoverLabel) return;

    vesselHoverLabel.textContent = ship.details.name;
    vesselHoverLabel.style.left = `${event.clientX}px`;
    vesselHoverLabel.style.top = `${event.clientY}px`;
    vesselHoverLabel.style.display = 'block';
}

window.addEventListener('mousemove', function (event) {
    if (isCameraDragging) {
        clearHoverTimer();
        hideVesselHoverLabel();
        return;
    }

    latestHoverEvent = event;

    const ship = getShipUnderMouse(event);

    if (!ship) {
        hoveredShip = null;
        clearHoverTimer();
        hideVesselHoverLabel();
        return;
    }

    if (ship === selectedShip) {
        hoveredShip = null;
        clearHoverTimer();
        hideVesselHoverLabel();
        return;
    }

    if (ship !== hoveredShip) {
        hoveredShip = ship;
        clearHoverTimer();
        hideVesselHoverLabel();

        hoverTimeout = setTimeout(function () {
            if (hoveredShip === ship && latestHoverEvent) {
                showVesselHoverLabel(ship, latestHoverEvent);
            }
        }, vesselHoverDelay);
    }

    if (vesselHoverLabel && vesselHoverLabel.style.display === 'block') {
        showVesselHoverLabel(ship, event);
    }
});

// -----------------------------
// BIRD VIEW
// -----------------------------

topViewButton.addEventListener('click', function () {

    followShip = false;
    selectedShip = null;
    clearCameraMomentum();

    const center = new THREE.Vector3(0, 0, 0);

    startCameraTransition(
        new THREE.Vector3(0, 800, 0),
        center
    );

    hideBoatDetails();
});

// -----------------------------
// ANIMATION LOOP
// -----------------------------

/* UPDATE SHIP MOVEMENT */
function moveShip(ship) {
    const shipModel = ship.model;

    const toTarget = new THREE.Vector3().subVectors(
        ship.target,
        shipModel.position
    );

    toTarget.y = 0;

    const distance = toTarget.length();

    if (distance < 15) {
        ship.target.set(
            randomBoatPosition(),
            shipModel.position.y,
            randomBoatPosition()
        );

        return;
    }

    const avoidanceDirection = getCollisionAvoidanceDirection(ship);
    const hasCollisionRisk = avoidanceDirection.lengthSq() > 0;
    const desiredDirection = hasCollisionRisk ?
        avoidanceDirection.clone() :
        toTarget.normalize();

    if (desiredDirection.lengthSq() === 0) {
        return;
    }

    desiredDirection.normalize();

    const targetAngle =
        Math.atan2(desiredDirection.x, desiredDirection.z) +
        ship.forwardOffset;

    let angleDifference = targetAngle - shipModel.rotation.y;

    angleDifference = Math.atan2(
        Math.sin(angleDifference),
        Math.cos(angleDifference)
    );

    const turnMultiplier =
        ship.emergencyAvoidance ? emergencyTurnMultiplier :
        hasCollisionRisk ? avoidanceTurnMultiplier :
        1;

    shipModel.rotation.y +=
        angleDifference * ship.turnSpeed * turnMultiplier;

    const forward = getShipForward(ship);
    const speedMultiplier = ship.emergencyAvoidance ?
        emergencySlowdown :
        1 - ship.avoidanceUrgency * 0.35;

    shipModel.position.addScaledVector(
        forward,
        ship.speed * Math.max(speedMultiplier, emergencySlowdown)
    );
}

/* UPDATE SHIP TRAIL */
function updateShipTrail(ship, now) {
    const forward = getShipForward(ship);

    const position = ship.model.position.clone();

    position.addScaledVector(forward, -ship.trailOffset);

    position.y = 2;

    ship.trailPositions.push(position);
    ship.trailTimes.push(now);

    while (
        ship.trailTimes.length > 0 &&
        now - ship.trailTimes[0] > 220
    ) {
        ship.trailTimes.shift();
        ship.trailPositions.shift();
    }

    if (ship.trailPositions.length < 2) {
        return;
    }

    const trailCurve = new THREE.CatmullRomCurve3(ship.trailPositions);
    const trailGeometry = new THREE.TubeGeometry(
        trailCurve,
        Math.min(ship.trailPositions.length * 2, 100),
        1,
        10,
        false
    );

    if (!ship.trailLine) {
        const material = new THREE.MeshBasicMaterial({
            color: getVibrantTrailColor(ship.trailColor),
            transparent: true,
            opacity: 1,
            depthWrite: false
        });

        ship.trailLine = new THREE.Mesh(trailGeometry, material);
        ship.trailLine.layers.set(1);
        scene.add(ship.trailLine);
    } else {
        ship.trailLine.geometry.dispose();
        ship.trailLine.geometry = trailGeometry;
    }

    ship.trailLine.visible = trailsVisible;
}

function setShipTrailVisibility(ship, isVisible) {
    if (ship.trailLine) {
        ship.trailLine.visible = isVisible;
    }

    if (ship.trailOutlineLine) {
        ship.trailOutlineLine.visible = isVisible;
    }
}

function setTrailsVisible(isVisible) {
    trailsVisible = isVisible;

    ships.forEach(function (ship) {
        setShipTrailVisibility(ship, trailsVisible);
    });

    toggleTrailButton.setAttribute('aria-pressed', String(trailsVisible));
    toggleTrailButton.classList.toggle('is-off', !trailsVisible);
}

toggleTrailButton.addEventListener('click', function () {
    setTrailsVisible(!trailsVisible);
});

setTrailsVisible(trailsVisible);

let trailSimulationTime = 0;

function animate() {
    requestAnimationFrame(animate);

    updateWaterSunFromLight();
    water.material.uniforms['time'].value += 1.0 / 60.0;
    trailSimulationTime += 1.0 / 60.0;

    const now = performance.now() / 1000;

    ships.forEach(function (ship) {
        moveShip(ship);
    });

    separateOverlappingShips();

    ships.forEach(function (ship) {
        updateShipTrail(ship, trailSimulationTime);
    });

    const isCameraTransitioning = updateCameraTransition(now);

    if (focusedShip && followShip && !isCameraTransitioning) {
        const shipCenter = getShipCenter(focusedShip.model);

        followOffset.copy(camera.position).sub(controls.target);

        const desiredCameraPosition = new THREE.Vector3()
            .copy(shipCenter)
            .add(followOffset);

        camera.position.lerp(desiredCameraPosition, 0.08);
        controls.target.lerp(shipCenter, 0.08);
    }

    controls.update();
    renderer.render(scene, camera);
}

animate();

// -----------------------------
// RESIZE
// -----------------------------

window.addEventListener('resize', function () {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize(window.innerWidth, window.innerHeight);
});
