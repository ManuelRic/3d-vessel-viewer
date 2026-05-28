function getBoatInfoPanel() {
    return document.getElementById('boat-info-panel');
}

function renderBoatDetails(details) {
    return `
        <div class="boat-header">
            <button
                class="boat-card-close"
                type="button"
                aria-label="Close vessel information"
            >
                <svg
                    class="boat-card-close-icon"
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    aria-hidden="true"
                    focusable="false"
                >
                    <path d="M18 6 6 18"/>
                    <path d="m6 6 12 12"/>
                </svg>
            </button>
            <img
                class="boat-flag"
                src="${details.flagImage}"
                alt="${details.flag} Flag"
            >

            <div class="boat-title">
                <h2>${details.name}</h2>

                <div class="boat-subtitle">
                    ${details.type} - IMO ${details.imo}
                </div>
            </div>
            
            <button
                class="boat-card-toggle"
                type="button"
                aria-expanded="true"
                aria-label="Collapse vessel information"
            >
                <svg
                    class="boat-card-toggle-icon"
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    role="img"
                    aria-hidden="true"
                >
                    <path d="m6 9 6 6 6-6"/>
                </svg>
            </button>
        </div>

        <div class="boat-card-body">
            <div class="boat-section">
                <div class="boat-section-title">Voyage Data</div>

                <div class="boat-row">
                    <div class="boat-label">Destination</div>
                    <div class="boat-value">${details.destination}</div>
                </div>

                <div class="boat-row">
                    <div class="boat-label">ETA</div>
                    <div class="boat-value">${details.eta}</div>
                </div>

                <div class="boat-row">
                    <div class="boat-label">Speed</div>
                    <div class="boat-value">${details.speed}</div>
                </div>

                <div class="boat-row">
                    <div class="boat-label">Course</div>
                    <div class="boat-value boat-course-value">${details.course}</div>
                </div>

                <div class="boat-row">
                    <div class="boat-label">Draught</div>
                    <div class="boat-value">${details.draught}</div>
                </div>

                <div class="boat-row">
                    <div class="boat-label">Navigation</div>
                    <div class="status-badge">${details.status}</div>
                </div>
            </div>

            <div class="boat-section">
                <div class="boat-section-title">Ship Details</div>

                <div class="boat-row">
                    <div class="boat-label">MMSI</div>
                    <div class="boat-value">${details.mmsi}</div>
                </div>

                <div class="boat-row">
                    <div class="boat-label">Callsign</div>
                    <div class="boat-value">${details.callsign}</div>
                </div>

                <div class="boat-row">
                    <div class="boat-label">Flag</div>
                    <div class="boat-value">${details.flag}</div>
                </div>

                <div class="boat-row">
                    <div class="boat-label">Length / Beam</div>
                    <div class="boat-value">${details.lengthBeam}</div>
                </div>
            </div>
        </div>
    `;
}

function bindCollapseToggle(panel) {
    const toggle = panel.querySelector('.boat-card-toggle');

    if (!toggle) return;

    toggle.addEventListener('click', function () {
        const isCollapsed = panel.classList.toggle('is-collapsed');

        toggle.setAttribute('aria-expanded', String(!isCollapsed));
        toggle.setAttribute(
            'aria-label',
            isCollapsed ?
                'Expand vessel information' :
                'Collapse vessel information'
        );
    });
}

export function showBoatDetails(details) {
    const panel = getBoatInfoPanel();

    if (!panel) return;

    panel.innerHTML = renderBoatDetails(details);
    panel.classList.remove('is-collapsed');
    bindCollapseToggle(panel);
    bindCloseButton(panel);
    panel.classList.add('is-visible');
}

export function hideBoatDetails() {
    const panel = getBoatInfoPanel();

    if (!panel) return;

    panel.classList.remove('is-visible');
}

function bindCloseButton(panel) {
    const closeButton = panel.querySelector('.boat-card-close');

    if (!closeButton) return;

    closeButton.addEventListener('click', hideBoatDetails);
}
