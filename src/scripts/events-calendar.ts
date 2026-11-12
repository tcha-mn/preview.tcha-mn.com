import dayjs from 'dayjs';
import { Modal } from 'flowbite';
import { Calendar } from 'fullcalendar';
import dayGridPlugin from 'fullcalendar/daygrid';
import listPlugin from 'fullcalendar/list';
import googleCalendarPlugin from '@fullcalendar/google-calendar';
import classicThemePlugin from 'fullcalendar/themes/classic';

const sanitizeLimitedHtml = (value: string | null | undefined) => {
  if (!value || typeof value !== 'string') {
    return '';
  }

  const allowedTags = new Set(['A', 'B', 'BR']);
  const doc = new DOMParser().parseFromString(value, 'text/html');

  const sanitizeNode = (node: Node) => {
    [...node.childNodes].forEach((child) => {
      if (child instanceof Element) {
        const element = child;
        const tagName = element.tagName.toUpperCase();

        if (!allowedTags.has(tagName)) {
          const textNode = doc.createTextNode(element.textContent || '');
          element.replaceWith(textNode);
          return;
        }

        if (tagName === 'A') {
          const href = element.getAttribute('href') || '';
          const isSafeHref =
            href.startsWith('http://') ||
            href.startsWith('https://') ||
            href.startsWith('mailto:') ||
            href.startsWith('tel:') ||
            href.startsWith('/');

          const target = element.getAttribute('target') || '';
          const rel = element.getAttribute('rel') || '';

          [...element.attributes].forEach((attr) => element.removeAttribute(attr.name));

          if (isSafeHref) {
            element.setAttribute('href', href);
          }
          if (target) {
            element.setAttribute('target', target);
          }
          if (target === '_blank') {
            const relParts = new Set(rel.split(/\s+/).filter(Boolean));
            relParts.add('noopener');
            relParts.add('noreferrer');
            element.setAttribute('rel', [...relParts].join(' '));
          } else if (rel) {
            element.setAttribute('rel', rel);
          }
        } else {
          [...element.attributes].forEach((attr) => element.removeAttribute(attr.name));
        }
      }

      if (child.childNodes && child.childNodes.length > 0) {
        sanitizeNode(child);
      }
    });
  };

  sanitizeNode(doc.body);
  return doc.body.innerHTML;
};

const htmlToText = (value: string | null | undefined) => {
  if (!value) return '';
  const div = document.createElement('div');
  div.innerHTML = value;
  return (div.textContent || '').trim();
};

export function mountEventsCalendar(): () => void {
  const calendarEl = document.getElementById('calendar');
  const modalEl = document.getElementById('eventModal');
  if (!calendarEl || !modalEl) {
    return () => {};
  }

  const eventModal = new Modal(modalEl, {}, { id: 'eventModal', override: true });
  const closeButton = document.getElementById('eventModal-close');
  const closeEventModal = () => eventModal.hide();
  closeButton?.addEventListener('click', closeEventModal);

  const calendar = new Calendar(calendarEl, {
    className: 'tcha-calendar',
    plugins: [dayGridPlugin, listPlugin, googleCalendarPlugin, classicThemePlugin],
    googleCalendarApiKey: 'AIzaSyDDtm0Kq9peyIES6MurVMzvpj0qxPd57es',
    events: {
      googleCalendarId: 'tcha-mn.com_vhub6lsh2nqen4saf0aeb9oe28@group.calendar.google.com',
    },
    initialView: 'dayGridMonth',
    headerToolbar: {
      start: 'prev,next today',
      center: 'title',
      end: 'dayGridMonth,listMonth',
    },
    buttons: {
      today: { text: 'today' },
      dayGridMonth: { text: 'month' },
      listMonth: { text: 'list' },
    },
    toolbarTitleClass: 'tcha-calendar-toolbar-title',
    buttonClass: (info) =>
      info.isIconOnly ? 'tcha-calendar-button tcha-calendar-icon-only-button' : 'tcha-calendar-button',
    eventClass: 'tcha-calendar-event',
    eventInnerClass: 'tcha-calendar-event-inner',
    moreLinkInnerClass: 'tcha-calendar-more-link-inner',
    dayHeaderClass: 'tcha-calendar-day-header',
    dayHeaderInnerClass: 'tcha-calendar-day-header-inner',
    listDayHeaderClass: 'tcha-calendar-day-header',
    listDayHeaderInnerClass: 'tcha-calendar-day-header-inner',
    dayCellTopInnerClass: 'tcha-calendar-date-number',
    eventClick(info) {
      info.jsEvent.preventDefault();
      const titleEl = document.getElementById('eventModal-title');
      if (titleEl) {
        titleEl.textContent = info.event.title || '';
      }

      const subtitleEl = document.getElementById('eventModal-subtitle');
      if (subtitleEl) {
        if (info.event.allDay) {
          subtitleEl.textContent = 'All Day';
        } else if (info.event.start && info.event.end) {
          subtitleEl.textContent = `${dayjs(info.event.start).format('h:mm a')} - ${dayjs(info.event.end).format('h:mm a')}`;
        } else if (info.event.start) {
          subtitleEl.textContent = dayjs(info.event.start).format('h:mm a');
        } else {
          subtitleEl.textContent = 'Time TBD';
        }
      }

      const locationWrapper = document.getElementById('eventModal-location-wrapper');
      const locationEl = document.getElementById('eventModal-location');
      const rawLocation = info.event.extendedProps.location || '';
      const sanitizedLocation = sanitizeLimitedHtml(rawLocation);
      if (locationWrapper && locationEl) {
        locationWrapper.hidden = !sanitizedLocation;
        locationEl.innerHTML = sanitizedLocation;
        if (sanitizedLocation) {
          const locationText = htmlToText(sanitizedLocation);
          if (locationText) {
            const lineBreak = document.createElement('br');
            const mapLink = document.createElement('a');
            mapLink.target = '_blank';
            mapLink.rel = 'noopener noreferrer';
            mapLink.href = `https://maps.google.com/?q=${encodeURIComponent(locationText)}`;
            mapLink.textContent = 'see map';
            locationEl.appendChild(lineBreak);
            locationEl.appendChild(document.createTextNode('('));
            locationEl.appendChild(mapLink);
            locationEl.appendChild(document.createTextNode(')'));
          }
        }
      }

      const descriptionWrapper = document.getElementById('eventModal-description-wrapper');
      const descriptionEl = document.getElementById('eventModal-description');
      const rawDescription = info.event.extendedProps.description || '';
      const sanitizedDescription = sanitizeLimitedHtml(rawDescription);
      if (descriptionWrapper && descriptionEl) {
        descriptionWrapper.hidden = !sanitizedDescription;
        descriptionEl.innerHTML = sanitizedDescription;
      }
      eventModal.show();
    },
  });

  calendar.render();
  return () => {
    calendar.destroy();
    closeButton?.removeEventListener('click', closeEventModal);
  };
}
