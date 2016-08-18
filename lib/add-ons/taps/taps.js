/**
 * taps.js
 */
(function() {

    var ua = navigator.userAgent,
        isChrome = /chrome/i.exec(ua),
        isAndroid = /android/i.exec(ua),
        hasTouch = 'ontouchstart' in window && !(isChrome && !isAndroid),
        startEvent = hasTouch ? 'touchstart' : 'mousedown',
        stopEvents = hasTouch ? ['touchend'/*, 'touchcancel'*/] : ['mouseup'/*, 'mouseleave'*/],
        moveEvent = hasTouch ? 'touchmove' : 'mousemove',
        start = {},
        motion = false,
        root = document.documentElement,
        motionThreshold = 10;

    var page = function(coord, event) {
        return (hasTouch ? event.touches[0] : event)['page' + coord.toUpperCase()];
    };

    var startHandler = function(event) {
        var time = performance.now();
        // console.log('[' + time.toFixed(3) + '] ' + event.type);
        start.time = time;
        start.target = event.target;
        start.x = page('x', event);
        start.y = page('y', event);
        motion = false;

        for (var i = 0; i < stopEvents.length; i++) {
            root.addEventListener(stopEvents[i], stopHandler, true);
        }
        root.addEventListener(moveEvent, moveHandler, true);
    };

    var moveHandler = function(event) {
        // console.log('[' + performance.now().toFixed(3) + '] ' + event.type);

        var dx = Math.abs(page('x', event) - start.x),
            dy = Math.abs(page('y', event) - start.y);

        motion = dx > motionThreshold || dy > motionThreshold;
        // console.log('motion: ' + motion);
        // if (!motion) return;
    };

    var stopHandler = function(event) {
        // console.log('[' + performance.now().toFixed(3) + '] ' + event.type);
        if (!motion) {
            var tapEvent = new CustomEvent('tap', {
                detail: {},
                bubbles: true
            });
            event.target.dispatchEvent(tapEvent);
            event.preventDefault();
        }

        for (var i = 0; i < stopEvents.length; i++) {
            root.removeEventListener(stopEvents[i], stopHandler, true);
        }
        root.removeEventListener(moveEvent, moveHandler, true);
    };

    root.addEventListener(startEvent, startHandler, true);
})();