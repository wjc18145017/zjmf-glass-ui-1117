/* ==========================================================================
   智简魔方 · 内联 SVG 图标集（禁止 emoji）
   用法：Icons.svg('server') / Icons.svg('cloud', { size: 20, cls: 'x' })
   ========================================================================== */
(function () {
  'use strict';

  /* 统一 24x24 视觉网格，描边图标默认描边宽度 1.7 */
  var STROKE = {
    logo:
      '<path d="M12 2.6 19.6 5.6v6.1c0 4.6-3.2 8.3-7.6 9.7-4.4-1.4-7.6-5.1-7.6-9.7V5.6z"/>' +
      '<path d="M12 8.2l3.2 1.9v3.8L12 15.8l-3.2-1.9v-3.8z"/>',
    shield:
      '<path d="M12 2.8l7.4 2.9v6c0 4.4-3.1 8-7.4 9.5-4.3-1.5-7.4-5.1-7.4-9.5V5.7z"/>',
    'shield-check':
      '<path d="M12 2.8l7.4 2.9v6c0 4.4-3.1 8-7.4 9.5-4.3-1.5-7.4-5.1-7.4-9.5V5.7z"/>' +
      '<path d="M8.6 12.1l2.5 2.5 4.4-4.7"/>',
    cloud: '<path d="M17.5 18H7.2a4.2 4.2 0 0 1-.7-8.35 5.2 5.2 0 0 1 9.95-1.4A4.1 4.1 0 0 1 17.5 18z"/>',
    server:
      '<rect x="5" y="2.8" width="14" height="18.4" rx="3"/>' +
      '<path d="M9 7.5h6M9 11.5h6"/>' +
      '<circle cx="9" cy="16.4" r="1"/>',
    cart:
      '<circle cx="9.2" cy="19.8" r="1.4"/><circle cx="18" cy="19.8" r="1.4"/>' +
      '<path d="M2.6 3.6h2.3l2.5 11h11.5l2.3-7.4H6.1"/>',
    user: '<circle cx="12" cy="8" r="3.6"/><path d="M4.6 20.2a7.8 7.8 0 0 1 14.8 0"/>',
    users:
      '<circle cx="9" cy="8" r="3.2"/><path d="M3 19.5a6.4 6.4 0 0 1 12 0"/>' +
      '<path d="M16 5.4a3.2 3.2 0 0 1 0 6.1"/><path d="M18 13.7a6.4 6.4 0 0 1 3 5.8"/>',
    home:
      '<path d="M4 10.4 12 3.4l8 7v9.1A1.5 1.5 0 0 1 18.5 21h-13A1.5 1.5 0 0 1 4 19.5z"/>' +
      '<path d="M9.5 21v-5.6h5V21"/>',
    ticket:
      '<path d="M3.6 9.2V6.4A1.4 1.4 0 0 1 5 5h14a1.4 1.4 0 0 1 1.4 1.4v2.8a2.8 2.8 0 0 0 0 5.6v2.8A1.4 1.4 0 0 1 19 19H5a1.4 1.4 0 0 1-1.4-1.4v-2.8a2.8 2.8 0 0 0 0-5.6z"/>' +
      '<path d="M14.2 9.4v1.4M14.2 13.2v1.4"/>',
    wallet:
      '<path d="M3.8 8.2A2.6 2.6 0 0 1 6.4 5.6h11.2A2.6 2.6 0 0 1 20.2 8.2v8.6A2.6 2.6 0 0 1 17.6 19.4H6.4A2.6 2.6 0 0 1 3.8 16.8z"/>' +
      '<path d="M3.8 10.4h16.4"/><circle cx="16.4" cy="14.8" r="1.2"/>',
    key:
      '<circle cx="8" cy="8" r="3.9"/><path d="M10.9 10.9l8.4 8.4"/>' +
      '<path d="M16.3 16.3l1.9-1.9"/><path d="M14.4 18.2l1.9-1.9"/>',
    bell:
      '<path d="M6.1 9.2a5.9 5.9 0 0 1 11.8 0c0 4.4 1.6 5.3 2.2 6.5H3.9c.6-1.2 2.2-2.1 2.2-6.5z"/>' +
      '<path d="M9.8 18.6a2.3 2.3 0 0 0 4.4 0"/>',
    'bell-ring':
      '<path d="M6.1 9.2a5.9 5.9 0 0 1 11.8 0c0 4.4 1.6 5.3 2.2 6.5H3.9c.6-1.2 2.2-2.1 2.2-6.5z"/>' +
      '<path d="M9.8 18.6a2.3 2.3 0 0 0 4.4 0"/><path d="M3 4l1.6 1.6M21 4l-1.6 1.6"/>',
    sliders:
      '<path d="M4 7h8M18.8 7H20M4 17h3.2M11.8 17H20"/>' +
      '<circle cx="15.4" cy="7" r="2.4"/><circle cx="9" cy="17" r="2.4"/>',
    search: '<circle cx="10.4" cy="10.4" r="6.5"/><path d="M15.2 15.2L20.6 20.6"/>',
    menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
    close: '<path d="M6 6l12 12M18 6L6 18"/>',
    'chevron-down': '<path d="M6 9.4l6 6 6-6"/>',
    'chevron-up': '<path d="M6 14.6l6-6 6 6"/>',
    'chevron-right': '<path d="M9.4 6l6 6-6 6"/>',
    'chevron-left': '<path d="M14.6 6l-6 6 6 6"/>',
    'arrow-right': '<path d="M4 12h15.6"/><path d="M13.8 6.2l5.8 5.8-5.8 5.8"/>',
    'arrow-left': '<path d="M20 12H4.4"/><path d="M10.2 6.2L4.4 12l5.8 5.8"/>',
    'arrow-up': '<path d="M12 20V4.4"/><path d="M6.2 10.2L12 4.4l5.8 5.8"/>',
    'arrow-down': '<path d="M12 4v15.6"/><path d="M6.2 13.8L12 19.6l5.8-5.8"/>',
    'arrow-up-right': '<path d="M7 17 17 7"/><path d="M9.4 7h7.6v7.6"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    minus: '<path d="M5 12h14"/>',
    check: '<path d="M4.4 12.6l5 5 10-11.2"/>',
    'check-circle': '<circle cx="12" cy="12" r="8.8"/><path d="M8 12.3l2.8 2.8 5.4-5.6"/>',
    'x-circle': '<circle cx="12" cy="12" r="8.8"/><path d="M9 9l6 6M15 9l-6 6"/>',
    'alert-triangle':
      '<path d="M12 3.4 21.4 19.6H2.6z"/><path d="M12 9v4.6"/><path d="M12 16.7h.01"/>',
    'alert-circle':
      '<circle cx="12" cy="12" r="8.8"/><path d="M12 7.4v5.6"/><path d="M12 16.6h.01"/>',
    info: '<circle cx="12" cy="12" r="8.8"/><path d="M12 11v5.6"/><path d="M12 7.8h.01"/>',
    help:
      '<circle cx="12" cy="12" r="8.8"/>' +
      '<path d="M9.5 9.3a2.6 2.6 0 1 1 3.9 2.4c-.9.5-1.4 1-1.4 2.1"/><path d="M12 16.8h.01"/>',
    logout:
      '<path d="M15.6 4.6h2.8A1.6 1.6 0 0 1 20 6.2v11.6A1.6 1.6 0 0 1 18.4 19.4h-2.8"/>' +
      '<path d="M10 8l-4 4 4 4"/><path d="M6 12h9.4"/>',
    login:
      '<path d="M8.4 4.6H5.6A1.6 1.6 0 0 0 4 6.2v11.6A1.6 1.6 0 0 0 5.6 19.4h2.8"/>' +
      '<path d="M14 8l4 4-4 4"/><path d="M18 12H8.6"/>',
    edit:
      '<path d="M4 20h4L18.6 9.4a2.1 2.1 0 0 0-3-3L5 17z"/><path d="M13.4 6.6l3 3"/>',
    trash:
      '<path d="M4 7h16"/><path d="M9.5 7V4.5h5V7"/>' +
      '<path d="M6.5 7l.9 12.4A1.7 1.7 0 0 0 9.1 21h5.8a1.7 1.7 0 0 0 1.7-1.6L17.5 7"/>' +
      '<path d="M10 11v6M14 11v6"/>',
    copy:
      '<rect x="9" y="3" width="12" height="12" rx="2"/>' +
      '<path d="M15 15v3.2A2 2 0 0 1 13 20.2H5A2 2 0 0 1 3 18.2V8A2 2 0 0 1 5 6h3.2"/>',
    eye:
      '<path d="M2.6 12S6.2 5.6 12 5.6 21.4 12 21.4 12 17.8 18.4 12 18.4 2.6 12 2.6 12z"/>' +
      '<circle cx="12" cy="12" r="3"/>',
    'eye-off':
      '<path d="M9.6 5.9A9.6 9.6 0 0 1 12 5.6c5.8 0 9.4 6.4 9.4 6.4a18 18 0 0 1-3.1 3.8"/>' +
      '<path d="M6.2 7.6A17.6 17.6 0 0 0 2.6 12S6.2 18.4 12 18.4c1.6 0 3-.5 4.2-1.3"/>' +
      '<path d="M3 3l18 18"/>',
    upload:
      '<path d="M12 16.2V4.4"/><path d="M7 9.4L12 4.4l5 5"/>' +
      '<path d="M4 15.4v2.6A2 2 0 0 0 6 20h12a2 2 0 0 0 2-2v-2.6"/>',
    download:
      '<path d="M12 4.2v11.8"/><path d="M7 11l5 5 5-5"/>' +
      '<path d="M4 15.4v2.6A2 2 0 0 0 6 20h12a2 2 0 0 0 2-2v-2.6"/>',
    refresh:
      '<path d="M19.8 12a7.8 7.8 0 1 1-2.4-5.7"/><path d="M20.4 4.2v5.4h-5.4"/>',
    external:
      '<path d="M14 4h6v6"/><path d="M20 4l-8.8 8.8"/>' +
      '<path d="M18 14v4.4A1.6 1.6 0 0 1 16.4 20H5.6A1.6 1.6 0 0 1 4 18.4V7.6A1.6 1.6 0 0 1 5.6 6H10"/>',
    play: '<path d="M7.4 4.6 19 12l-11.6 7.4z"/>',
    pause: '<path d="M9 5v14M15 5v14"/>',
    power:
      '<path d="M12 3.4v7.6"/><path d="M6.6 6.4a7.9 7.9 0 1 0 10.8 0"/>',
    terminal:
      '<rect x="3" y="4.4" width="18" height="15.2" rx="3"/>' +
      '<path d="M7.4 9.6l2.6 2.6-2.6 2.6"/><path d="M13 15h4"/>',
    globe:
      '<circle cx="12" cy="12" r="8.8"/><path d="M3.4 12h17.2"/>' +
      '<ellipse cx="12" cy="12" rx="4.2" ry="8.8"/>',
    cpu:
      '<rect x="6.6" y="6.6" width="10.8" height="10.8" rx="2"/>' +
      '<path d="M10 3.2v3.4M14 3.2v3.4M10 17.4v3.4M14 17.4v3.4"/>' +
      '<path d="M3.2 10h3.4M3.2 14h3.4M17.4 10h3.4M17.4 14h3.4"/>',
    ram:
      '<rect x="3" y="7.4" width="18" height="9.2" rx="2"/>' +
      '<path d="M7 16.6v3.2M12 16.6v3.2M17 16.6v3.2"/><path d="M7 10.6h10"/>',
    disk:
      '<rect x="3.4" y="5" width="17.2" height="14" rx="3"/><circle cx="12" cy="12" r="3.6"/>' +
      '<path d="M12 15.4V12"/><circle cx="17" cy="8.6" r=".9"/>',
    network:
      '<rect x="9" y="2.8" width="6" height="5" rx="1.6"/>' +
      '<rect x="2.6" y="16.2" width="6" height="5" rx="1.6"/>' +
      '<rect x="15.4" y="16.2" width="6" height="5" rx="1.6"/>' +
      '<path d="M12 7.8v4.2M5.6 16.2v-4.2h12.8v4.2"/>',
    wifi:
      '<path d="M3.2 9a13 13 0 0 1 17.6 0"/><path d="M6.6 12.4a8.4 8.4 0 0 1 10.8 0"/>' +
      '<path d="M10 15.9a4 4 0 0 1 4 0"/><circle cx="12" cy="19.2" r="1"/>',
    sun:
      '<circle cx="12" cy="12" r="4.2"/>' +
      '<path d="M12 2.6v2M12 19.4v2M2.6 12h2M19.4 12h2"/>' +
      '<path d="M5.1 5.1l1.4 1.4M17.5 17.5l1.4 1.4M18.9 5.1l-1.4 1.4M6.5 17.5L5.1 18.9"/>',
    moon: '<path d="M20 14.6A8.6 8.6 0 1 1 9.4 4a6.7 6.7 0 0 0 10.6 10.6z"/>',
    monitor:
      '<rect x="2.6" y="4" width="18.8" height="12.4" rx="2.6"/>' +
      '<path d="M8 20h8M12 16.4V20"/>',
    palette:
      '<circle cx="12" cy="12" r="8.6"/>' +
      '<circle cx="7.6" cy="9.2" r="1"/><circle cx="12.4" cy="6.6" r="1"/><circle cx="6.9" cy="14" r="1"/>' +
      '<path d="M12 20.6c1.6 0 2.6-1.1 2.6-2.3"/>',
    chart:
      '<path d="M4 20V4"/><path d="M4 20h16"/>' +
      '<path d="M7.8 20v-4.6M12 20v-8.2M16.2 20v-12"/>',
    activity: '<path d="M3 12h3.6l2.6-6.2 4.8 12 2.6-5.8H21"/>',
    box:
      '<path d="M3.6 8.4 12 4l8.4 4.4v7.2L12 20 3.6 15.6z"/>' +
      '<path d="M3.6 8.4 12 12.8l8.4-4.4M12 12.8V20"/>',
    layers:
      '<path d="M12 3.6 20.4 8 12 12.4 3.6 8z"/><path d="M3.6 12 12 16.4 20.4 12"/>' +
      '<path d="M3.6 16 12 20.4 20.4 16"/>',
    zap: '<path d="M12.6 2.6 4 13.4h6.2L9.4 21.4 20 10h-6.6z"/>',
    database:
      '<ellipse cx="12" cy="5.8" rx="8" ry="3"/>' +
      '<path d="M4 5.8v6.2c0 1.7 3.6 3 8 3s8-1.3 8-3V5.8"/>' +
      '<path d="M4 12v6.2c0 1.7 3.6 3 8 3s8-1.3 8-3V12"/>',
    rocket:
      '<path d="M12 3.4c3.6 1.6 5.5 5 5.5 9L12 17l-5.5-4.6c0-4 1.9-7.4 5.5-9z"/>' +
      '<circle cx="12" cy="9.6" r="1.8"/>' +
      '<path d="M6.6 12.4 4 15.6l3.1.6M17.4 12.4 20 15.6l-3.1.6"/>',
    megaphone:
      '<path d="M5 9.6h3L17 5v14l-9-4.6H5z"/>' +
      '<path d="M8 14.6v4.4a1.6 1.6 0 0 0 3.2 0v-3.6"/>',
    lock:
      '<rect x="4.4" y="10.4" width="15.2" height="10" rx="2.6"/>' +
      '<path d="M8 10.4V7a4 4 0 0 1 8 0v3.4"/><circle cx="12" cy="15.4" r="1.2"/>',
    unlock:
      '<rect x="4.4" y="10.4" width="15.2" height="10" rx="2.6"/>' +
      '<path d="M8 10.4V7a4 4 0 0 1 7.6-1.8"/><circle cx="12" cy="15.4" r="1.2"/>',
    mail:
      '<rect x="2.6" y="5" width="18.8" height="14" rx="2.6"/>' +
      '<path d="M3.6 7.4 12 13l8.4-5.6"/>',
    phone:
      '<path d="M6.6 3.4h3l1.5 4-2 2a12 12 0 0 0 5.4 5.4l2-2 4 1.5v3A2 2 0 0 1 18.4 19.4 15.4 15.4 0 0 1-3.8-15.8A2 2 0 0 1 6.6 3.4z"/>',
    'id-card':
      '<rect x="2.6" y="5" width="18.8" height="14" rx="2.6"/><circle cx="8" cy="10.8" r="2"/>' +
      '<path d="M5 16.2a3.4 3.4 0 0 1 6 0"/><path d="M14 10h4.4M14 13.6h4.4"/>',
    calendar:
      '<rect x="3.4" y="5" width="17.2" height="15.4" rx="2.6"/>' +
      '<path d="M3.4 9.4h17.2"/><path d="M8 3v4M16 3v4"/>',
    clock: '<circle cx="12" cy="12" r="8.8"/><path d="M12 7v5.4l3.4 2"/>',
    filter: '<path d="M3.4 5h17.2l-6.6 7.6v5.4l-4 2.2v-7.6z"/>',
    grid:
      '<rect x="3.4" y="3.4" width="7.2" height="7.2" rx="1.6"/>' +
      '<rect x="13.4" y="3.4" width="7.2" height="7.2" rx="1.6"/>' +
      '<rect x="3.4" y="13.4" width="7.2" height="7.2" rx="1.6"/>' +
      '<rect x="13.4" y="13.4" width="7.2" height="7.2" rx="1.6"/>',
    list: '<path d="M8 6h12M8 12h12M8 18h12"/><path d="M4 6h.01M4 12h.01M4 18h.01"/>',
    star:
      '<path d="M12 3.4l2.6 5.4 5.9.8-4.3 4.1 1.1 5.8L12 16.7l-5.3 2.8 1.1-5.8L3.5 9.6l5.9-.8z"/>',
    tag:
      '<path d="M11.6 3.4H19a1.6 1.6 0 0 1 1.6 1.6v7.4L12 20.6 3.4 12z"/>' +
      '<circle cx="16" cy="8" r="1.4"/>',
    'credit-card':
      '<rect x="2.6" y="5.4" width="18.8" height="13.2" rx="2.6"/>' +
      '<path d="M2.6 10h18.8"/><path d="M6 14.6h3"/>',
    sparkles:
      '<path d="M11.6 3.6l1.5 4.3 4.3 1.5-4.3 1.5-1.5 4.4-1.5-4.4L5.8 9.4l4.3-1.5z"/>' +
      '<path d="M18.4 15.6l.7 2 2 .7-2 .8-.7 2-.8-2-2-.8 2-.7z"/>',
    book:
      '<path d="M4 5.6A2.2 2.2 0 0 1 6.2 3.4H20v14.8H6.2A2.2 2.2 0 0 0 4 20.4z"/>' +
      '<path d="M4 18.2A2.2 2.2 0 0 1 6.2 16H20"/>',
    message:
      '<path d="M4 5.4h16a1.6 1.6 0 0 1 1.6 1.6v8.6a1.6 1.6 0 0 1-1.6 1.6H9.4L4.6 21l.8-3.8H4A1.6 1.6 0 0 1 2.4 15.6V7A1.6 1.6 0 0 1 4 5.4z"/>',
    send:
      '<path d="M20.6 3.4 10.4 13.6"/><path d="M20.6 3.4l-6.4 17.2-3.8-6.9-6.9-3.8z"/>',
    gauge: '<path d="M4 17a9 9 0 1 1 16 0"/><path d="M12 12l4-3"/><circle cx="12" cy="17" r="1"/>',
    code: '<path d="M8.6 6.4 3 12l5.6 5.6M15.4 6.4 21 12l-5.6 5.6"/>',
    link:
      '<path d="M9.6 14.4 14.4 9.6"/>' +
      '<path d="M11 6.6l1.4-1.4a4.4 4.4 0 0 1 6.2 6.2L17.2 12.8"/>' +
      '<path d="M13 17.4 11.6 18.8a4.4 4.4 0 0 1-6.2-6.2L6.8 11.2"/>',
    image:
      '<rect x="3" y="4.4" width="18" height="15.2" rx="2.6"/>' +
      '<circle cx="8.4" cy="9.8" r="1.6"/><path d="M4 16.8l5-5 4 4 3-2.6 4 4"/>',
    save:
      '<path d="M4.6 4.4h10.8L20 8.8v10.8A1.6 1.6 0 0 1 18.4 21.2H5.6A1.6 1.6 0 0 1 4 19.6z"/>' +
      '<path d="M8 4.4v4.8h7V4.4"/><path d="M8 21.2v-6h8v6"/>',
    more:
      '<circle cx="6" cy="12" r="1.2"/><circle cx="12" cy="12" r="1.2"/><circle cx="18" cy="12" r="1.2"/>',
    inbox:
      '<path d="M3.6 12 6 4.4h12L20.4 12v6A1.6 1.6 0 0 1 18.8 19.6H5.2A1.6 1.6 0 0 1 3.6 18z"/>' +
      '<path d="M3.6 12H8.8l1 2.6h4.4l1-2.6h5.2"/>',
    'file-text':
      '<path d="M6.2 3.4h7.6L18.4 8v11.6A1.6 1.6 0 0 1 16.8 21.2H6.2A1.6 1.6 0 0 1 4.6 19.6V5A1.6 1.6 0 0 1 6.2 3.4z"/>' +
      '<path d="M13.8 3.4V8h4.6"/><path d="M8 12.4h8M8 16.4h5"/>',
    sort:
      '<path d="M7 20V5.4M4 8.4L7 5.4l3 3"/><path d="M17 4v14.6M14 15.6l3 3 3-3"/>',
    gem:
      '<path d="M6.4 3.6h11.2L21 9.2 12 20.6 3 9.2z"/>' +
      '<path d="M3 9.2h18M8.2 9.2 12 20.6l3.8-11.4M8.2 9.2 6.4 3.6M15.8 9.2l1.8-5.6"/>',
    pulse:
      '<path d="M3 12h4l2-5 4.8 10 2.6-5H21"/>',
    'arrow-path':
      '<path d="M4.2 12a7.8 7.8 0 0 1 13.2-5.6"/><path d="M17.6 3.4v4h-4"/>' +
      '<path d="M19.8 12a7.8 7.8 0 0 1-13.2 5.6"/><path d="M6.4 20.6v-4h4"/>',
    percentage:
      '<path d="M18.6 5.4 5.4 18.6"/><circle cx="7.4" cy="7.4" r="2.6"/><circle cx="16.6" cy="16.6" r="2.6"/>',
    cpu2:
      '<rect x="6.6" y="6.6" width="10.8" height="10.8" rx="2"/>' +
      '<path d="M10 3.2v3.4M14 3.2v3.4M10 17.4v3.4M14 17.4v3.4"/>'
  };

  /* 实心图标（品牌、星标等） */
  var FILLED = {
    'logo-solid':
      '<path d="M12 2.6 19.6 5.6v6.1c0 4.6-3.2 8.3-7.6 9.7-4.4-1.4-7.6-5.1-7.6-9.7V5.6z"/>',
    'star-solid':
      '<path d="M12 3.4l2.6 5.4 5.9.8-4.3 4.1 1.1 5.8L12 16.7l-5.3 2.8 1.1-5.8L3.5 9.6l5.9-.8z"/>',
    'heart-solid':
      '<path d="M12 20.4 4.4 12.8a4.6 4.6 0 0 1 6.5-6.5L12 7.4l1.1-1.1a4.6 4.6 0 0 1 6.5 6.5z"/>',
    'dot-solid': '<circle cx="12" cy="12" r="4.2"/>'
  };

  var aliases = {
    gear: 'sliders',
    cog: 'sliders',
    setting: 'sliders',
    settings: 'sliders',
    user2: 'user',
    'log-out': 'logout',
    'sign-in': 'login',
    signin: 'login',
    signout: 'logout',
    close2: 'close',
    x: 'close',
    ok: 'check',
    success: 'check-circle',
    error: 'x-circle',
    warning: 'alert-triangle',
    danger: 'alert-triangle',
    memory: 'ram',
    hdd: 'disk',
    'hard-drive': 'disk',
    storage: 'database',
    'bar-chart': 'chart',
    analytics: 'chart',
    dashboard: 'gauge',
    announcement: 'megaphone',
    notice: 'bell',
    notification: 'bell',
    'ticket-open': 'ticket',
    'credit': 'credit-card',
    money: 'wallet',
    billing: 'wallet',
    'renew': 'refresh',
    'edit-2': 'edit',
    'trash-2': 'trash',
    'external-link': 'external',
    'map-pin': 'globe',
    'data': 'database',
    'power-off': 'power',
    'restart': 'refresh',
    'sparkle': 'sparkles',
    'ai': 'sparkles'
  };

  function resolve(name) {
    if (STROKE[name]) return { name: name, inner: STROKE[name], filled: false };
    if (FILLED[name]) return { name: name, inner: FILLED[name], filled: true };
    var alias = aliases[name];
    if (alias) return resolve(alias);
    return { name: 'unknown', inner: '<circle cx="12" cy="12" r="8.8"/><path d="M12 8v8M8 12h8"/>', filled: false };
  }

  function svg(name, opts) {
    opts = opts || {};
    var size = opts.size || 18;
    var cls = opts.cls ? ' ' + opts.cls : '';
    var stroke = opts.stroke || 1.7;
    var r = resolve(name);
    var attrs = r.filled
      ? 'fill="currentColor" stroke="none"'
      : 'fill="none" stroke="currentColor" stroke-width="' + stroke + '" stroke-linecap="round" stroke-linejoin="round"';
    return (
      '<svg class="icon' + cls + '" viewBox="0 0 24 24" width="' + size + '" height="' + size + '" ' +
      attrs + ' aria-hidden="true" focusable="false" data-icon="' + r.name + '">' + r.inner + '</svg>'
    );
  }

  window.Icons = {
    stroke: STROKE,
    filled: FILLED,
    aliases: aliases,
    has: function (name) { return !!(STROKE[name] || FILLED[name] || aliases[name]); },
    svg: svg
  };
  window.icon = svg;
})();
