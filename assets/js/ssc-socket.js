(function () {
  // Load socket.io client dynamically if not already loaded
  function connect() {
    if (typeof io === 'undefined') return;

    const socket = io({
      transports: ['websocket', 'polling'],
      reconnectionDelay: 2000,
      reconnectionAttempts: Infinity,
    });

    socket.on('connect', function () {
      console.log('[WS] Connected:', socket.id);
    });

    socket.on('disconnect', function () {
      console.log('[WS] Disconnected');
    });

    // EVENTS UPDATE — re-fetch and re-render events on any page that has the function
    socket.on('events:update', function () {
      console.log('[WS] events:update received');
      // events.html
      if (typeof fetchEvents === 'function' && typeof render === 'function' && typeof __eventsCache !== 'undefined') {
        fetchEvents().then(function () {
          if (typeof apply === 'function' && typeof currentFilters === 'function') {
            render(apply(__eventsCache, currentFilters()));
          }
        });
      }
      // home.html
      if (typeof loadEventsFromApi === 'function' && typeof renderHomeEvents === 'function') {
        loadEventsFromApi().then(function () { renderHomeEvents(); });
      }
      // admin.html
      if (typeof renderAll === 'function') {
        renderAll();
      }
    });

    // ARTISTS UPDATE
    socket.on('artists:update', function () {
      console.log('[WS] artists:update received');
      if (typeof renderAll === 'function') renderAll(); // admin
      if (typeof loadArtists === 'function') loadArtists(); // artist pages
      // home.html — artists section
      if (typeof window.sscLoadArtists === 'function') window.sscLoadArtists();
    });

    // SETTINGS UPDATE
    socket.on('settings:update', function () {
      console.log('[WS] settings:update received');
      if (typeof applySettings === 'function') applySettings();
      if (typeof renderAll === 'function') renderAll();
    });

    // TICKETS UPDATE — refresh ticket info on events page
    socket.on('tickets:update', function () {
      console.log('[WS] tickets:update received');
      if (typeof fetchTicketSummaries === 'function' && typeof __eventsCache !== 'undefined') {
        var ids = (__eventsCache || []).map(function(e){ return e.id; }).filter(Boolean);
        if (ids.length) fetchTicketSummaries(ids);
      }
      if (typeof refreshEventSummary === 'function' && typeof activeEvent !== 'undefined' && activeEvent) {
        refreshEventSummary(activeEvent.id);
      }
    });

    // MERCH UPDATE
    socket.on('merch:update', function () {
      console.log('[WS] merch:update received');
      if (typeof loadMerch === 'function') loadMerch();
      if (typeof renderAll === 'function') renderAll();
    });

    // Expose socket globally for debugging
    window._sscSocket = socket;
  }

  // Try to connect once DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', connect);
  } else {
    connect();
  }
})();
