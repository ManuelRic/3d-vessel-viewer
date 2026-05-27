export function initDateTimeWidget(){
    const dateTimeWidget = document.getElementById('datetime-widget');
    const portLocation = {
        city: 'Valencia',
        country: 'Spain'
    };
    const portTimeZones = {
        'Valencia, Spain': 'Europe/Madrid'
    };
    const portLocationKey = `${portLocation.city}, ${portLocation.country}`;
    const portTimeZone = portTimeZones[portLocationKey] ?? 'UTC';
    const portDateTimeFormatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: portTimeZone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
    });
    const portOffsetFormatter = new Intl.DateTimeFormat('en-US', {
        timeZone: portTimeZone,
        timeZoneName: 'shortOffset'
    });

    function getPart(parts, type) {
        return parts.find(part => part.type === type)?.value ?? '';
    }

    function getPortOffset(date) {
        const timeZoneName = getPart(
            portOffsetFormatter.formatToParts(date),
            'timeZoneName'
        );
        const match = timeZoneName.match(/^GMT([+-])(\d{1,2})(?::(\d{2}))?$/);

        if (!match) return '+00:00';

        const sign = match[1];
        const hours = match[2].padStart(2, '0');
        const minutes = match[3] ?? '00';

        return `${sign}${hours}:${minutes}`;
    }

    function getPortIsoString(date) {
        const parts = portDateTimeFormatter.formatToParts(date);
        const datePart = [
            getPart(parts, 'year'),
            getPart(parts, 'month'),
            getPart(parts, 'day')
        ].join('-');
        const timePart = [
            getPart(parts, 'hour'),
            getPart(parts, 'minute'),
            getPart(parts, 'second')
        ].join(':');

        return `${datePart}T${timePart}${getPortOffset(date)}`;
    }

    function updateDateTimeWidget() {
        if (!dateTimeWidget) return;

        dateTimeWidget.textContent = getPortIsoString(new Date());
    }

    updateDateTimeWidget();
    setInterval(updateDateTimeWidget, 1000);
}
