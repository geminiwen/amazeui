define(function(require, exports, module) {
    'use strict';

    // Zepto animate extend
    require('zepto.extend.fx');

    // Zepto data extend
    require('zepto.extend.data');

    // Zepto selector extend
    require('zepto.extend.selector');


    var $ = window.Zepto,
        UI = $.AMUI || {},
        $win = $(window),
        doc = window.document,
        FastClick = require('util.fastclick'),
        $html = $('html');

    UI.support = {};
    UI.support.transition = (function() {

        var transitionEnd = (function() {
            // https://developer.mozilla.org/en-US/docs/Web/Events/transitionend#Browser_compatibility
            var element = doc.body || doc.documentElement,
                transEndEventNames = {
                    WebkitTransition: 'webkitTransitionEnd',
                    MozTransition: 'transitionend',
                    OTransition: 'oTransitionEnd otransitionend',
                    transition: 'transitionend'
                },
                name;

            for (name in transEndEventNames) {
                if (element.style[name] !== undefined) return transEndEventNames[name];
            }
        })();

        return transitionEnd && {end: transitionEnd};

    })();

    UI.support.animation = (function() {

        var animationEnd = (function() {

            var element = doc.body || doc.documentElement,
                animEndEventNames = {
                    WebkitAnimation: 'webkitAnimationEnd',
                    MozAnimation: 'animationend',
                    OAnimation: 'oAnimationEnd oanimationend',
                    animation: 'animationend'
                }, name;

            for (name in animEndEventNames) {
                if (element.style[name] !== undefined) return animEndEventNames[name];
            }
        })();

        return animationEnd && {end: animationEnd};
    })();

    UI.support.requestAnimationFrame = window.requestAnimationFrame || window.webkitRequestAnimationFrame || window.mozRequestAnimationFrame || window.msRequestAnimationFrame || window.oRequestAnimationFrame || function(callback) {
        window.setTimeout(callback, 1000 / 60);
    };

    UI.support.touch = (
    ('ontouchstart' in window && navigator.userAgent.toLowerCase().match(/mobile|tablet/)) ||
    (window.DocumentTouch && document instanceof window.DocumentTouch) ||
    (window.navigator['msPointerEnabled'] && window.navigator['msMaxTouchPoints'] > 0) || //IE 10
    (window.navigator['pointerEnabled'] && window.navigator['maxTouchPoints'] > 0) || //IE >=11
    false);

    // https://developer.mozilla.org/zh-CN/docs/DOM/MutationObserver
    UI.support.mutationobserver = (window.MutationObserver || window.WebKitMutationObserver || window.MozMutationObserver || null);

    UI.utils = {};

    /**
     * Debounce function
     * @param {function} func  Function to be debounced
     * @param {number} wait Function execution threshold in milliseconds
     * @param {bool} immediate  Whether the function should be called at
     *                          the beginning of the delay instead of the
     *                          end. Default is false.
     * @desc Executes a function when it stops being invoked for n seconds
     * @via  _.debounce() http://underscorejs.org
     */

    UI.utils.debounce = function(func, wait, immediate) {
        var timeout;
        return function() {
            var context = this, args = arguments;
            var later = function() {
                timeout = null;
                if (!immediate) func.apply(context, args);
            };
            var callNow = immediate && !timeout;
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
            if (callNow) func.apply(context, args);
        };
    };

    UI.utils.isInView = function(element, options) {

        var $element = $(element);

        var visible = !!($element.width() || $element.height()) && $element.css("display") !== "none";

        if (!visible) {
            return false;
        }

        var window_left = $win.scrollLeft(), window_top = $win.scrollTop(), offset = $element.offset(), left = offset.left, top = offset.top;

        options = $.extend({topOffset: 0, leftOffset: 0}, options);

        return (top + $element.height() >= window_top && top - options.topOffset <= window_top + $win.height() &&
        left + $element.width() >= window_left && left - options.leftOffset <= window_left + $win.width());
    };

    UI.utils.parseOptions = UI.utils.options = function(string) {

        if ($.isPlainObject(string)) return string;

        var start = (string ? string.indexOf("{") : -1), options = {};

        if (start != -1) {
            try {
                options = (new Function("", "var json = " + string.substr(start) + "; return JSON.parse(JSON.stringify(json));"))();
            } catch (e) {
            }
        }

        return options;
    };

    UI.utils.generateGUID = function(namespace) {
        var uid = namespace + '-' || 'am-';

        do {
            uid += Math.random().toString(36).substring(2, 7);
        } while (document.getElementById(uid));

        return uid;
    };

    $.AMUI = UI;

    // http://blog.alexmaccaw.com/css-transitions
    $.fn.emulateTransitionEnd = function(duration) {
        var called = false, $el = this;
        $(this).one(UI.support.transition.end, function() {
            called = true
        });
        var callback = function() {
            if (!called) {
                $($el).trigger(UI.support.transition.end);
            }
            $el.transitionEndTimmer = undefined;
        };
        this.transitionEndTimmer = setTimeout(callback, duration);
        return this;
    };

    $.fn.redraw = function() {
        $(this).each(function() {
            var redraw = this.offsetHeight;
        });
        return this;
    };

    $.fn.transitionEnd = function(callback) {
        var endEvent = UI.support.transition.end,
            dom = this;

        function fireCallBack(e) {
            callback.call(this, e);
            endEvent && dom.off(endEvent, fireCallBack);
        }

        if (callback && endEvent) {
            dom.on(endEvent, fireCallBack);
        }
        return this;
    };

    $.fn.removeClassRegEx = function() {
        return this.each(function(regex) {
            var classes = $(this).attr('class');

            if (!classes || !regex) return false;

            var classArray = [];
            classes = classes.split(' ');

            for (var i = 0, len = classes.length; i < len; i++) if (!classes[i].match(regex)) classArray.push(classes[i]);

            $(this).attr('class', classArray.join(' '));
        });
    };

    //
    $.fn.alterClass = function(removals, additions) {
        var self = this;

        if (removals.indexOf('*') === -1) {
            // Use native jQuery methods if there is no wildcard matching
            self.removeClass(removals);
            return !additions ? self : self.addClass(additions);
        }

        var classPattern = new RegExp('\\s' +
        removals.
            replace(/\*/g, '[A-Za-z0-9-_]+').
            split(' ').
            join('\\s|\\s') +
        '\\s', 'g');

        self.each(function(i, it) {
            var cn = ' ' + it.className + ' ';
            while (classPattern.test(cn)) {
                cn = cn.replace(classPattern, ' ');
            }
            it.className = $.trim(cn);
        });

        return !additions ? self : self.addClass(additions);
    };

    $.fn.getHeight = function() {
        var $ele = $(this), height = 'auto';

        if ($ele.is(':visible')) {
            height = $ele.height();
        } else {
            var tmp = {
                position: $ele.css('position'),
                visibility: $ele.css('visibility'),
                display: $ele.css('display')
            };

            height = $ele.css({position: 'absolute', visibility: 'hidden', display: 'block'}).height();

            $ele.css(tmp); // reset element
        }

        return height;
    };

    $.fn.getSize = function() {
        var $el = $(this);
        if ($el.css('display') !== 'none') {
            return {
                width: $el.width(),
                height: $el.height()
            };
        }

        var old = {
                position: $el.css('position'),
                visibility: $el.css('visibility'),
                display: $el.css('display')
            },
            tmpStyle = {display: 'block', position: 'absolute', visibility: 'hidden'};

        $el.css(tmpStyle);
        var width = $el.width(),
            height = $el.height();

        $el.css(old);
        return {
            width: width,
            height: height
        };

    };

    // adding :visible and :hidden to zepto
    // https://github.com/jquery/jquery/blob/73e120116ce13b992d5229b3e10fcc19f9505a15/src/css/hiddenVisibleSelectors.js
    var _is = $.fn.is, _filter = $.fn.filter;

    function visible(elem) {
        elem = $(elem);
        return !!(elem.width() || elem.height()) && elem.css("display") !== "none";
    }

    $.fn.is = function(sel) {
        if (sel === ':visible') {
            return visible(this);
        }
        if (sel === ':hidden') {
            return !visible(this);
        }
        return _is.call(this, sel);
    };

    $.fn.filter = function(sel) {
        if (sel === ':visible') {
            return $([].filter.call(this, visible));
        }
        if (sel === ':hidden') {
            return $([].filter.call(this, function(elem) {
                return !visible(elem);
            }));
        }
        return _filter.call(this, sel);
    };


    // handle multiple browsers for requestAnimationFrame()
    // http://www.paulirish.com/2011/requestanimationframe-for-smart-animating/
    // https://github.com/gnarf/jquery-requestAnimationFrame
    UI.utils.rAF = (function() {
        return window.requestAnimationFrame ||
        window.webkitRequestAnimationFrame ||
        window.mozRequestAnimationFrame ||
            //window.oRequestAnimationFrame ||
            // if all else fails, use setTimeout
        function(callback) {
            return window.setTimeout(callback, 1000 / 60); // shoot for 60 fps
        };
    })();

    // handle multiple browsers for cancelAnimationFrame()
    UI.utils.cancelAF = (function() {
        return window.cancelAnimationFrame ||
        window.webkitCancelAnimationFrame ||
        window.mozCancelAnimationFrame ||
            //window.oCancelAnimationFrame ||
        function(id) {
            window.clearTimeout(id);
        };
    })();

    // via http://davidwalsh.name/detect-scrollbar-width
    UI.utils.measureScrollbar = function() {
        if (document.body.clientWidth >= window.innerWidth) return 0;

        // if ($html.width() >= window.innerWidth) return;
        // var scrollbarWidth = window.innerWidth - $html.width();

        var $measure = $('<div style="width: 100px;height: 100px;overflow: scroll;position: absolute;top: -9999px;"></div>');

        $(document.body).append($measure);

        var scrollbarWidth = $measure[0].offsetWidth - $measure[0].clientWidth;

        $measure.remove();

        return scrollbarWidth;
    };

    UI.utils.imageLoader = function($image, callback) {
        function loaded() {
            callback($image[0]);
        }

        function bindLoad() {
            this.one('load', loaded);
            if (/MSIE (\d+\.\d+);/.test(navigator.userAgent)) {
                var src = this.attr('src'),
                    param = src.match(/\?/) ? '&' : '?';

                param += 'random=' + (new Date()).getTime();
                this.attr('src', src + param);
            }
        }

        if (!$image.attr('src')) {
            loaded();
            return;
        }

        if ($image[0].complete || $image[0].readyState === 4) {
            loaded();
        } else {
            bindLoad.call($image);
        }
    };

    /**
     * https://github.com/cho45/micro-template.js
     * (c) cho45 http://cho45.github.com/mit-license
     */

    UI.template = function(id, data) {
        var me = arguments.callee;

        if (!me.cache[id]) me.cache[id] = (function () {
            var name = id,
                string = /^[\w\-]+$/.test(id) ? me.get(id): (name = 'template(string)', id); // no warnings
            var line = 1, body = (
            "try { " +
            (me.variable ?  "var " + me.variable + " = this.stash;" : "with (this.stash) { ") +
            "this.ret += '"  +
            string.
                replace(/<%/g, '\x11').replace(/%>/g, '\x13'). // if you want other tag, just edit this line
                replace(/'(?![^\x11\x13]+?\x13)/g, '\\x27').
                replace(/^\s*|\s*$/g, '').
                replace(/\n/g, function () { return "';\nthis.line = " + (++line) + "; this.ret += '\\n" }).
                replace(/\x11-(.+?)\x13/g, "' + ($1) + '").
                replace(/\x11=(.+?)\x13/g, "' + this.escapeHTML($1) + '").
                replace(/\x11(.+?)\x13/g, "'; $1; this.ret += '") +
            "'; " + (me.variable ? "" : "}") + "return this.ret;" +
            "} catch (e) { throw 'TemplateError: ' + e + ' (on " + name + "' + ' line ' + this.line + ')'; } " +
            "//@ sourceURL=" + name + "\n" // source map
            ).replace(/this\.ret \+= '';/g, '');
            var func = new Function(body);
            var map  = { '&' : '&amp;', '<' : '&lt;', '>' : '&gt;', '\x22' : '&#x22;', '\x27' : '&#x27;' };
            var escapeHTML = function (string) { return (''+string).replace(/[&<>\'\"]/g, function (_) { return map[_] }) };
            return function (stash) { return func.call(me.context = { escapeHTML: escapeHTML, line: 1, ret : '', stash: stash }) };
        })();
        return data ? me.cache[id](data) : me.cache[id];
    };

    UI.template.cache = {};

    UI.template.get = function(id) {
        if (id) {
            var element = document.getElementById(id);
            return element && element.innerHTML || '';
        }
    };

    // Attach FastClick on touch devices
    if (UI.support.touch) {
        $html.addClass('am-touch');

        $(function() {
            FastClick.attach(document.body);
        });
    }

    $(function() {
        var $body = $('body');

        // trigger domready event
        $(document).trigger('domready:amui');

        $html.removeClass('no-js').addClass('js');

        UI.support.animation && $html.addClass('cssanimations');

        // iOS standalone mode
        if (window.navigator.standalone) {
            $html.addClass('am-standalone');
        }

        $('.am-topbar-fixed-top').length && $body.addClass('am-with-topbar-fixed-top');

        $('.am-topbar-fixed-bottom').length && $body.addClass('am-with-topbar-fixed-bottom');

        // Remove responsive classes in .am-layout
        var $layout = $('.am-layout');
        $layout.find('[class*="md-block-grid"]').alterClass('md-block-grid-*');
        $layout.find('[class*="lg-block-grid"]').alterClass('lg-block-grid');

        // widgets not in .am-layout
        $('[data-am-widget]').each(function() {
            var $widget = $(this);
            // console.log($widget.parents('.am-layout').length)
            if ($widget.parents('.am-layout').length === 0) {
                $widget.addClass('am-no-layout');
            }
        });
    });

    module.exports = UI;
});
