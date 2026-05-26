export function initDateTimeWidget(){
    const dateTimeWidget = document.getElementById('datetime-widget');
    const valenciaTimeZone = 'Europe/Madrid';
    const valenciaDateTimeFormatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: valenciaTimeZone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        fractionalSecondDigits: 3,
        hour12: false
    });
    const valenciaOffsetFormatter = new Intl.DateTimeFormat('en-US', {
        timeZone: valenciaTimeZone,
        timeZoneName: 'shortOffset'
    });

    function getPart(parts, type) {
        return parts.find(part => part.type === type)?.value ?? '';
    }

    function getValenciaOffset(date) {
        const timeZoneName = getPart(
            valenciaOffsetFormatter.formatToParts(date),
            'timeZoneName'
        );
        const match = timeZoneName.match(/^GMT([+-])(\d{1,2})(?::(\d{2}))?$/);

        if (!match) return '+00:00';

        const sign = match[1];
        const hours = match[2].padStart(2, '0');
        const minutes = match[3] ?? '00';

        return `${sign}${hours}:${minutes}`;
    }

    function getValenciaIsoString(date) {
        const parts = valenciaDateTimeFormatter.formatToParts(date);
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
        const fractionalSecond = getPart(parts, 'fractionalSecond');

        return `${datePart}T${timePart}.${fractionalSecond}${getValenciaOffset(date)}`;
    }

    function updateDateTimeWidget() {
        if (!dateTimeWidget) return;

        dateTimeWidget.textContent = getValenciaIsoString(new Date());
    }

    updateDateTimeWidget();
    setInterval(updateDateTimeWidget, 1000);
}
