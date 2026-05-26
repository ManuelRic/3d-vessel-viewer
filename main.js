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
const worldUp = new THREE.Vector3(0, 1, 0);
const forwardBase = new THREE.Vector3(0, 0, 1);
const northDirection = new THREE.Vector3(0, 0, -1).normalize();

// -----------------------------
// LOADING SCREEN
// -----------------------------

const loadingScreen = document.getElementById('loading-screen');
const loadingBarFill = document.getElementById('loading-bar-fill');
const loadingAssetTotal = shipsData.length + 2;
let loadingAssetCount = 0;
let firstFrameRendered = false;

function updateLoadingProgress() {
    if (!loadingBarFill) return;

    const progress = loadingAssetTotal > 0 ?
        loadingAssetCount / loadingAssetTotal :
        1;

    loadingBarFill.style.width = `${Math.round(progress * 100)}%`;
}

function tryHideLoadingScreen() {
    if (
        !loadingScreen ||
        !firstFrameRendered ||
        loadingAssetCount < loadingAssetTotal
    ) {
        return;
    }

    loadingScreen.classList.add('is-hidden');
}

function markAssetLoaded() {
    loadingAssetCount = Math.min(loadingAssetCount + 1, loadingAssetTotal);
    updateLoadingProgress();
    tryHideLoadingScreen();
}

updateLoadingProgress();

// -----------------------------
// Sky
// -----------------------------


new RGBELoader().load(
    './images/sky/pure_sky_4k.hdr',
    function (texture) {
        texture.mapping = THREE.EquirectangularReflectionMapping;

        scene.background = texture;
        scene.environment = null;
        markAssetLoaded();
    },
    undefined,
    function (error) {
        console.error('Error loading HDR skybox:', error);
        markAssetLoaded();
    }
);

// -----------------------------
// CAMERA
// -----------------------------
const defaultCameraPosition = new THREE.Vector3(0, 80, 180);
const defaultCameraTarget = new THREE.Vector3(0, 0, 0);
const topViewCameraPosition = new THREE.Vector3(0, 800, 1);
const topViewCameraTarget = new THREE.Vector3(0, 0, 0);

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
const settingsButton = document.getElementById('settings');
const searchButton = document.getElementById('search-button');
const searchMenu = document.getElementById('search-menu');
const closeSearchMenuButton = document.getElementById('close-search-menu');
const vesselSearchInput = document.getElementById('vessel-search-input');
const vesselSearchResults = document.getElementById('vessel-search-results');
const settingsBackButton = document.getElementById('settings-back-button');
const settingsMenuTitle = document.querySelector('.controls-menu-title');
const settingsMainView = document.getElementById('settings-main-view');
const settingsControlsView = document.getElementById('settings-controls-view');
const settingsVisualizationView = document.getElementById('settings-visualization-view');
const controlsMenuButton = document.getElementById('controls-menu-button');
const visualizationMenuButton = document.getElementById('visualization-menu-button');
const controlsMenu = document.getElementById('controls-menu');
const closeControlsMenuButton = document.getElementById('close-controls-menu');
const toggleWaterEffectsButton = document.getElementById('toggle-water-effects');
const toggleLightDirectionButton = document.getElementById('toggle-light-direction');
const toggleCompassButton = document.getElementById('toggle-compass');
const compassWidget = document.querySelector('.compass-widget');
const compassNeedle = document.getElementById('compass-needle');
const compassCardinals = document.getElementById('compass-cardinals');
const compassDegrees = document.getElementById('compass-degrees');
let trailsVisible = true;
let waterEffectsEnabled = true;
let lightDirectionEnabled = true;
let compassVisible = true;

// -----------------------------
// COMPASS
// -----------------------------

const compassCameraForward = new THREE.Vector3();
const compassCameraRight = new THREE.Vector3();
const eastDirection = new THREE.Vector3()
    .crossVectors(northDirection, worldUp)
    .normalize();
let compassNeedleAngle = 0;
let hasCompassNeedleAngle = false;

function updateCompass() {
    if (!compassNeedle && !compassCardinals) return;

    camera.getWorldDirection(compassCameraForward);
    compassCameraForward.y = 0;

    if (compassCameraForward.lengthSq() < 0.0001) {
        compassCameraForward
            .subVectors(controls.target, camera.position)
            .setY(0);
    }

    if (compassCameraForward.lengthSq() < 0.0001) return;

    compassCameraForward.normalize();
    compassCameraRight
        .crossVectors(compassCameraForward, worldUp)
        .normalize();

    const screenX = northDirection.dot(compassCameraRight);
    const screenY = northDirection.dot(compassCameraForward);
    const angle = Math.atan2(screenX, screenY);

    if (!hasCompassNeedleAngle) {
        compassNeedleAngle = angle;
        hasCompassNeedleAngle = true;
    } else {
        const angleDelta = Math.atan2(
            Math.sin(angle - compassNeedleAngle),
            Math.cos(angle - compassNeedleAngle)
        );

        compassNeedleAngle += angleDelta;
    }

    const rotation = `rotate(${compassNeedleAngle}rad)`;

    if (compassNeedle) {
        compassNeedle.style.transform = rotation;
    }

    if (compassCardinals) {
        compassCardinals.style.transform = rotation;
    }

    if (compassDegrees) {
        const headingRadians = Math.atan2(
            compassCameraForward.dot(eastDirection),
            compassCameraForward.dot(northDirection)
        );
        const headingDegrees =
            (THREE.MathUtils.radToDeg(headingRadians) + 360) % 360;

        compassDegrees.textContent = `${Math.round(headingDegrees)}°`;
    }
}

// -----------------------------
// SEARCH
// -----------------------------

function setSearchMenuOpen(isOpen) {
    if (!searchMenu || !searchButton) return;

    if (isOpen) {
        setControlsMenuOpen(false);
    }

    searchMenu.classList.toggle('is-open', isOpen);
    searchMenu.setAttribute('aria-hidden', String(!isOpen));
    searchButton.setAttribute('aria-expanded', String(isOpen));

    if (isOpen) {
        renderSearchResults();
        requestAnimationFrame(function () {
            vesselSearchInput?.focus();
        });
    }
}

function focusShipFromSearch(ship) {
    clearTopViewRestoreState();

    focusedShip = ship;
    selectedShip = ship;
    followShip = true;

    clearHoverTimer();
    hideVesselHoverLabel();

    const shipCenter = getShipCenter(ship);

    followOffset.copy(getShipFocusOffset());

    startCameraTransition(
        new THREE.Vector3().copy(shipCenter).add(followOffset),
        shipCenter
    );

    showBoatDetails(ship.details);
    setSearchMenuOpen(false);
}

function createSearchResult(ship) {
    const button = document.createElement('button');
    const name = document.createElement('span');
    const meta = document.createElement('span');

    button.className = 'search-result-item';
    button.type = 'button';

    name.className = 'search-result-name';
    name.textContent = ship.details.name;

    meta.className = 'search-result-meta';
    meta.textContent = `${ship.details.type} - IMO ${ship.details.imo}`;

    button.append(name, meta);
    button.addEventListener('click', function () {
        focusShipFromSearch(ship);
    });

    return button;
}

function renderSearchResults() {
    if (!vesselSearchResults) return;

    const query = vesselSearchInput?.value.trim().toLowerCase() ?? '';
    const matches = ships
        .filter(function (ship) {
            if (!query) return true;

            return ship.details.name.toLowerCase().includes(query);
        })
        .sort(function (a, b) {
            return a.details.name.localeCompare(b.details.name);
        });

    if (matches.length === 0) {
        const empty = document.createElement('div');

        empty.className = 'search-empty';
        empty.textContent = query ?
            'No vessels found' :
            'No vessels loaded yet';

        vesselSearchResults.replaceChildren(empty);
        return;
    }

    vesselSearchResults.replaceChildren(
        ...matches.map(function (ship) {
            return createSearchResult(ship);
        })
    );
}

// -----------------------------
// CONTROLS
// -----------------------------

const controls = new OrbitControls(camera, renderer.domElement);
const cameraDampingFactor = 0.12;
const cameraTransitionDuration = 0.35;
const topViewTransitionDuration = 0.85;
const minShipFocusDistance = 65;
const maxShipFocusDistance = 150;
let cameraTransition = null;

controls.enableDamping = true;
controls.dampingFactor = cameraDampingFactor;
controls.enablePan = true;
controls.panSpeed = 1.1;
controls.screenSpacePanning = true;

// Left click drag pans around the map, right click drag orbits the selected vessel.
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

function updateControlsWithoutDamping() {
    const wasDampingEnabled = controls.enableDamping;

    controls.enableDamping = false;
    controls.update();
    controls.enableDamping = wasDampingEnabled;
    controls.dampingFactor = cameraDampingFactor;
}

function easeOutCubic(value) {
    return 1 - Math.pow(1 - value, 3);
}

function startCameraTransition(
    position,
    target,
    duration = cameraTransitionDuration
) {
    clearCameraMomentum();

    cameraTransition = {
        startTime: performance.now() / 1000,
        duration: duration,
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

function setTopViewActive(active) {
    isTopViewActive = active;
    topViewButton.setAttribute('aria-pressed', String(isTopViewActive));
    topViewButton.classList.toggle('is-active', isTopViewActive);
}

function clearTopViewRestoreState() {
    topViewRestoreState = null;
    setTopViewActive(false);
}

function getCurrentCameraViewState() {
    if (cameraTransition) {
        return {
            position: cameraTransition.endPosition.clone(),
            target: cameraTransition.endTarget.clone(),
            selectedShip: selectedShip,
            focusedShip: focusedShip,
            followShip: followShip
        };
    }

    return {
        position: camera.position.clone(),
        target: controls.target.clone(),
        selectedShip: selectedShip,
        focusedShip: focusedShip,
        followShip: followShip
    };
}

function restoreCameraViewState(viewState) {
    selectedShip = viewState.selectedShip;
    focusedShip = viewState.focusedShip;
    followShip = viewState.followShip;

    startCameraTransition(
        viewState.position,
        viewState.target,
        topViewTransitionDuration
    );

    if (selectedShip) {
        showBoatDetails(selectedShip.details);
    } else {
        hideBoatDetails();
    }
}

// -----------------------------
// CAMERA DRAG
// -----------------------------

const cameraDragThreshold = 5;
const cameraLookSensitivity = 0.005;
const shiftRightLookSmoothing = 0.22;
const minCameraLookPhi = 0.05;
const maxCameraLookPhi = Math.PI - 0.05;
const cameraOrbitPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.5);
const screenCenter = new THREE.Vector2(0, 0);
const centerRaycaster = new THREE.Raycaster();
const centerOrbitPoint = new THREE.Vector3();
let cameraPointerStart = null;
let cameraRightPointer = null;
let shiftLeftPanPointer = null;
let pendingShiftRightLookDelta = new THREE.Vector2();
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
        return getShipCenter(focusedShip);
    }

    centerRaycaster.setFromCamera(screenCenter, camera);

    if (centerRaycaster.ray.intersectPlane(cameraOrbitPlane, centerOrbitPoint)) {
        return centerOrbitPoint.clone();
    }

    return controls.target.clone();
}

function queueSmoothCameraLook(movementX, movementY) {
    pendingShiftRightLookDelta.x += movementX;
    pendingShiftRightLookDelta.y += movementY;
}

function updateSmoothCameraLook() {
    if (pendingShiftRightLookDelta.lengthSq() < 0.01) {
        pendingShiftRightLookDelta.set(0, 0);
        return;
    }

    const movementX = pendingShiftRightLookDelta.x * shiftRightLookSmoothing;
    const movementY = pendingShiftRightLookDelta.y * shiftRightLookSmoothing;

    pendingShiftRightLookDelta.x -= movementX;
    pendingShiftRightLookDelta.y -= movementY;

    rotateCameraInPlace(movementX, movementY);
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
    updateControlsWithoutDamping();
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
    updateControlsWithoutDamping();
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
        pendingShiftRightLookDelta.set(0, 0);

        renderer.domElement.setPointerCapture(event.pointerId);
        cameraTransition = null;
        setCanvasCursor('grabbing');
        clearTopViewRestoreState();

        if (event.shiftKey) {
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
            queueSmoothCameraLook(movementX, movementY);
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
    setCanvasCursor('grabbing');
    suppressClickAfterCameraDrag();
    cameraTransition = null;
    clearTopViewRestoreState();
    followShip = false;
    focusedShip = false;
});

renderer.domElement.addEventListener('pointerup', function (event) {
    if (cameraRightPointer && event.pointerId === cameraRightPointer.id) {
        renderer.domElement.releasePointerCapture(event.pointerId);
        cameraRightPointer = null;
        setCanvasCursor('grab');
        clearCameraMomentum();
        return;
    }

    if (shiftLeftPanPointer === event.pointerId) {
        shiftLeftPanPointer = null;
        setLeftMouseAction(THREE.MOUSE.PAN);
    }

    cameraPointerStart = null;
    isCameraDragging = false;
    setCanvasCursor('grab');
});

renderer.domElement.addEventListener('pointercancel', function (event) {
    if (cameraRightPointer && event.pointerId === cameraRightPointer.id) {
        cameraRightPointer = null;
        setCanvasCursor('grab');
        clearCameraMomentum();
        return;
    }

    if (shiftLeftPanPointer === event.pointerId) {
        shiftLeftPanPointer = null;
        setLeftMouseAction(THREE.MOUSE.PAN);
    }

    cameraPointerStart = null;
    isCameraDragging = false;
    setCanvasCursor('grab');
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
const plainWaterMaterial = new THREE.MeshStandardMaterial({
    color: litWaterColor,
    roughness: 0.92,
    metalness: 0
});

const water = new Water(
    waterGeometry,
    {
        textureWidth: 1024,
        textureHeight: 1024,

        waterNormals: new THREE.TextureLoader().load(
            './textures/water.jpg',
            function (texture) {
                texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
                markAssetLoaded();
            },
            undefined,
            function (error) {
                console.error('Error loading water texture:', error);
                markAssetLoaded();
            }
        ),

        sunDirection: sunDirection,
        sunColor: sunLight.color,
        waterColor: 0x1f4f7a,
        distortionScale: 1,
    }
);

const waterEffectsMaterial = water.material;
const plainWater = new THREE.Mesh(waterGeometry, plainWaterMaterial);

water.rotation.x = -Math.PI / 2;
water.position.set(0, 0.5, 0);
scene.add(water);

plainWater.rotation.x = -Math.PI / 2;
plainWater.position.copy(water.position);
plainWater.visible = false;
scene.add(plainWater);

function updateWaterSunFromLight() {
    if (!waterEffectsEnabled) {
        plainWaterMaterial.color
            .copy(darkWaterColor)
            .lerp(litWaterColor, lightDirectionEnabled ? 1 : 0.45);
        return;
    }

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

function updateWaterEffectsButton() {
    toggleWaterEffectsButton.setAttribute(
        'aria-pressed',
        String(waterEffectsEnabled)
    );
    toggleWaterEffectsButton.classList.toggle('is-off', !waterEffectsEnabled);
}

function updateLightDirectionButton() {
    toggleLightDirectionButton.setAttribute(
        'aria-pressed',
        String(lightDirectionEnabled)
    );
    toggleLightDirectionButton.classList.toggle(
        'is-off',
        !lightDirectionEnabled
    );
}

function updateCompassButton() {
    if (!toggleCompassButton) return;

    toggleCompassButton.setAttribute('aria-pressed', String(compassVisible));
    toggleCompassButton.classList.toggle('is-off', !compassVisible);
}

function setWaterEffectsEnabled(enabled) {
    waterEffectsEnabled = enabled;
    water.visible = waterEffectsEnabled;
    plainWater.visible = !waterEffectsEnabled;
    updateWaterSunFromLight();
    updateWaterEffectsButton();
}

function setLightDirectionEnabled(enabled) {
    lightDirectionEnabled = enabled;
    sunLight.visible = lightDirectionEnabled;
    sunLight.intensity = lightDirectionEnabled ? light : 0;
    ambientLight.intensity = lightDirectionEnabled ? light / 8 : light * 0.8;
    updateWaterSunFromLight();
    updateLightDirectionButton();
}

function setCompassVisible(isVisible) {
    compassVisible = isVisible;

    if (compassWidget) {
        compassWidget.classList.toggle('is-hidden', !compassVisible);
    }

    updateCompassButton();
}

function setSettingsView(viewName) {
    const isMainView = viewName === 'main';

    controlsMenu?.classList.toggle('is-subview', !isMainView);
    settingsMainView?.classList.toggle('is-active', isMainView);
    settingsControlsView?.classList.toggle('is-active', viewName === 'controls');
    settingsVisualizationView?.classList.toggle(
        'is-active',
        viewName === 'visualization'
    );

    if (settingsBackButton) {
        settingsBackButton.setAttribute('aria-hidden', String(isMainView));
    }

    if (settingsMenuTitle) {
        settingsMenuTitle.textContent =
            viewName === 'controls' ? 'Controls' :
            viewName === 'visualization' ? 'Visualization' :
            'Settings';
    }
}

function setControlsMenuOpen(isOpen) {
    if (isOpen) {
        setSearchMenuOpen(false);
    }

    controlsMenu.classList.toggle('is-open', isOpen);
    controlsMenu.setAttribute('aria-hidden', String(!isOpen));
    settingsButton.setAttribute('aria-expanded', String(isOpen));

    if (!isOpen) {
        setSettingsView('main');
    }
}

settingsButton.addEventListener('click', function (event) {
    event.stopPropagation();
    setControlsMenuOpen(!controlsMenu.classList.contains('is-open'));
});

searchButton?.addEventListener('click', function (event) {
    event.stopPropagation();
    setSearchMenuOpen(!searchMenu.classList.contains('is-open'));
});

controlsMenu.addEventListener('click', function (event) {
    event.stopPropagation();
});

searchMenu?.addEventListener('click', function (event) {
    event.stopPropagation();
});

closeSearchMenuButton?.addEventListener('click', function () {
    setSearchMenuOpen(false);
});

vesselSearchInput?.addEventListener('input', renderSearchResults);

settingsBackButton?.addEventListener('click', function () {
    setSettingsView('main');
});

controlsMenuButton?.addEventListener('click', function () {
    setSettingsView('controls');
});

visualizationMenuButton?.addEventListener('click', function () {
    setSettingsView('visualization');
});

closeControlsMenuButton.addEventListener('click', function () {
    setControlsMenuOpen(false);
});

toggleWaterEffectsButton.addEventListener('click', function () {
    setWaterEffectsEnabled(!waterEffectsEnabled);
});

toggleLightDirectionButton.addEventListener('click', function () {
    setLightDirectionEnabled(!lightDirectionEnabled);
});

if (toggleCompassButton) {
    toggleCompassButton.addEventListener('click', function () {
        setCompassVisible(!compassVisible);
    });
}

window.addEventListener('keydown', function (event) {
    if (event.key === 'Escape') {
        setControlsMenuOpen(false);
        setSearchMenuOpen(false);
    }
});

updateWaterEffectsButton();
updateLightDirectionButton();
updateCompassButton();
// -----------------------------
// BOAT
// -----------------------------

const gltfLoader = new GLTFLoader();

const ships = [];
const shipModels = [];
let selectedShip = null;
let followShip = false;
let focusedShip = false;
let followOffset = new THREE.Vector3(0, 35, 80);
const desiredCameraPosition = new THREE.Vector3();
let topViewRestoreState = null;
let isTopViewActive = false;

setTopViewActive(false);

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
    return forwardBase.clone().applyAxisAngle(
        worldUp,
        ship.model.rotation.y - ship.forwardOffset
    );
}

function getShipCollisionRadius(shipModel) {
    const box = new THREE.Box3().setFromObject(shipModel);
    const size = new THREE.Vector3();
    box.getSize(size);

    return Math.sqrt(size.x * size.x + size.z * size.z) * 0.5;
}

function getShipCenterOffset(shipModel) {
    const box = new THREE.Box3().setFromObject(shipModel);
    const center = new THREE.Vector3();
    box.getCenter(center);

    return shipModel.worldToLocal(center.clone());
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
        markAssetLoaded();
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
            shipModel.updateMatrixWorld(true);

            const collisionRadius = getShipCollisionRadius(shipModel);
            const centerOffset = getShipCenterOffset(shipModel);
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
                centerOffset: centerOffset,
                trailPositions: [],
                trailTimes: [],
                trailLine: null,
                trailColor: shipData.trailColor,
                collisionRadius: collisionRadius,
                trailOffset: trailOffset,
            });

            shipModels.push(shipModel);
            renderSearchResults();
            markAssetLoaded();
        },

        undefined,

        function (error) {
            console.error('Error loading ship:', shipData.name, error);
            markAssetLoaded();
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

function getShipCenter(ship) {
    if (ship.centerOffset) {
        return ship.model.localToWorld(ship.centerOffset.clone());
    }

    const box = new THREE.Box3().setFromObject(ship.model);
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
        clearTopViewRestoreState();
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

    clearTopViewRestoreState();
    focusedShip = clickedShip;
    selectedShip = clickedShip;
    followShip = true;

    const shipCenter = getShipCenter(clickedShip);

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

function setCanvasCursor(cursor) {
    renderer.domElement.style.cursor = cursor;
}

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

function updateVesselHover(event) {
    if (isCameraDragging) {
        setCanvasCursor('grabbing');
        clearHoverTimer();
        hideVesselHoverLabel();
        return;
    }

    latestHoverEvent = event;

    const ship = getShipUnderMouse(event);

    if (!ship) {
        setCanvasCursor('grab');
        hoveredShip = null;
        clearHoverTimer();
        hideVesselHoverLabel();
        return;
    }

    setCanvasCursor('pointer');

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
}

window.addEventListener('mousemove', function (event) {
    updateVesselHover(event);
});

window.addEventListener('mouseleave', function () {
    setCanvasCursor('grab');
    hoveredShip = null;
    latestHoverEvent = null;
    clearHoverTimer();
    hideVesselHoverLabel();
});

// -----------------------------
// BIRD VIEW
// -----------------------------

topViewButton.addEventListener('click', function () {
    if (isTopViewActive && topViewRestoreState) {
        const restoreState = topViewRestoreState;

        topViewRestoreState = null;
        setTopViewActive(false);
        restoreCameraViewState(restoreState);
        return;
    }

    topViewRestoreState = getCurrentCameraViewState();
    setTopViewActive(true);

    followShip = false;
    focusedShip = false;
    selectedShip = null;
    clearCameraMomentum();

    startCameraTransition(
        topViewCameraPosition,
        topViewCameraTarget,
        topViewTransitionDuration
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

    if (waterEffectsEnabled) {
        waterEffectsMaterial.uniforms['time'].value += 1.0 / 60.0;
    }

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

    if (!isCameraTransitioning) {
        updateSmoothCameraLook();
    }

    if (focusedShip && followShip && !isCameraTransitioning) {
        const shipCenter = getShipCenter(focusedShip);

        followOffset.copy(camera.position).sub(controls.target);

        desiredCameraPosition.copy(shipCenter).add(followOffset);

        camera.position.lerp(desiredCameraPosition, 0.08);
        controls.target.lerp(shipCenter, 0.08);
    }

    controls.update();
    updateCompass();

    renderer.render(scene, camera);

    if (!firstFrameRendered) {
        firstFrameRendered = true;
        tryHideLoadingScreen();
    }
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
