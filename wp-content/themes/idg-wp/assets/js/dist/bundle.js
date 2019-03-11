/**!
 * @fileOverview Kickass library to create and place poppers near their reference elements.
 * @version 1.14.7
 * @license
 * Copyright (c) 2016 Federico Zivolo and contributors
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */
(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
	typeof define === 'function' && define.amd ? define(factory) :
	(global.Popper = factory());
}(this, (function () { 'use strict';

var isBrowser = typeof window !== 'undefined' && typeof document !== 'undefined';

var longerTimeoutBrowsers = ['Edge', 'Trident', 'Firefox'];
var timeoutDuration = 0;
for (var i = 0; i < longerTimeoutBrowsers.length; i += 1) {
  if (isBrowser && navigator.userAgent.indexOf(longerTimeoutBrowsers[i]) >= 0) {
    timeoutDuration = 1;
    break;
  }
}

function microtaskDebounce(fn) {
  var called = false;
  return function () {
    if (called) {
      return;
    }
    called = true;
    window.Promise.resolve().then(function () {
      called = false;
      fn();
    });
  };
}

function taskDebounce(fn) {
  var scheduled = false;
  return function () {
    if (!scheduled) {
      scheduled = true;
      setTimeout(function () {
        scheduled = false;
        fn();
      }, timeoutDuration);
    }
  };
}

var supportsMicroTasks = isBrowser && window.Promise;

/**
* Create a debounced version of a method, that's asynchronously deferred
* but called in the minimum time possible.
*
* @method
* @memberof Popper.Utils
* @argument {Function} fn
* @returns {Function}
*/
var debounce = supportsMicroTasks ? microtaskDebounce : taskDebounce;

/**
 * Check if the given variable is a function
 * @method
 * @memberof Popper.Utils
 * @argument {Any} functionToCheck - variable to check
 * @returns {Boolean} answer to: is a function?
 */
function isFunction(functionToCheck) {
  var getType = {};
  return functionToCheck && getType.toString.call(functionToCheck) === '[object Function]';
}

/**
 * Get CSS computed property of the given element
 * @method
 * @memberof Popper.Utils
 * @argument {Eement} element
 * @argument {String} property
 */
function getStyleComputedProperty(element, property) {
  if (element.nodeType !== 1) {
    return [];
  }
  // NOTE: 1 DOM access here
  var window = element.ownerDocument.defaultView;
  var css = window.getComputedStyle(element, null);
  return property ? css[property] : css;
}

/**
 * Returns the parentNode or the host of the element
 * @method
 * @memberof Popper.Utils
 * @argument {Element} element
 * @returns {Element} parent
 */
function getParentNode(element) {
  if (element.nodeName === 'HTML') {
    return element;
  }
  return element.parentNode || element.host;
}

/**
 * Returns the scrolling parent of the given element
 * @method
 * @memberof Popper.Utils
 * @argument {Element} element
 * @returns {Element} scroll parent
 */
function getScrollParent(element) {
  // Return body, `getScroll` will take care to get the correct `scrollTop` from it
  if (!element) {
    return document.body;
  }

  switch (element.nodeName) {
    case 'HTML':
    case 'BODY':
      return element.ownerDocument.body;
    case '#document':
      return element.body;
  }

  // Firefox want us to check `-x` and `-y` variations as well

  var _getStyleComputedProp = getStyleComputedProperty(element),
      overflow = _getStyleComputedProp.overflow,
      overflowX = _getStyleComputedProp.overflowX,
      overflowY = _getStyleComputedProp.overflowY;

  if (/(auto|scroll|overlay)/.test(overflow + overflowY + overflowX)) {
    return element;
  }

  return getScrollParent(getParentNode(element));
}

var isIE11 = isBrowser && !!(window.MSInputMethodContext && document.documentMode);
var isIE10 = isBrowser && /MSIE 10/.test(navigator.userAgent);

/**
 * Determines if the browser is Internet Explorer
 * @method
 * @memberof Popper.Utils
 * @param {Number} version to check
 * @returns {Boolean} isIE
 */
function isIE(version) {
  if (version === 11) {
    return isIE11;
  }
  if (version === 10) {
    return isIE10;
  }
  return isIE11 || isIE10;
}

/**
 * Returns the offset parent of the given element
 * @method
 * @memberof Popper.Utils
 * @argument {Element} element
 * @returns {Element} offset parent
 */
function getOffsetParent(element) {
  if (!element) {
    return document.documentElement;
  }

  var noOffsetParent = isIE(10) ? document.body : null;

  // NOTE: 1 DOM access here
  var offsetParent = element.offsetParent || null;
  // Skip hidden elements which don't have an offsetParent
  while (offsetParent === noOffsetParent && element.nextElementSibling) {
    offsetParent = (element = element.nextElementSibling).offsetParent;
  }

  var nodeName = offsetParent && offsetParent.nodeName;

  if (!nodeName || nodeName === 'BODY' || nodeName === 'HTML') {
    return element ? element.ownerDocument.documentElement : document.documentElement;
  }

  // .offsetParent will return the closest TH, TD or TABLE in case
  // no offsetParent is present, I hate this job...
  if (['TH', 'TD', 'TABLE'].indexOf(offsetParent.nodeName) !== -1 && getStyleComputedProperty(offsetParent, 'position') === 'static') {
    return getOffsetParent(offsetParent);
  }

  return offsetParent;
}

function isOffsetContainer(element) {
  var nodeName = element.nodeName;

  if (nodeName === 'BODY') {
    return false;
  }
  return nodeName === 'HTML' || getOffsetParent(element.firstElementChild) === element;
}

/**
 * Finds the root node (document, shadowDOM root) of the given element
 * @method
 * @memberof Popper.Utils
 * @argument {Element} node
 * @returns {Element} root node
 */
function getRoot(node) {
  if (node.parentNode !== null) {
    return getRoot(node.parentNode);
  }

  return node;
}

/**
 * Finds the offset parent common to the two provided nodes
 * @method
 * @memberof Popper.Utils
 * @argument {Element} element1
 * @argument {Element} element2
 * @returns {Element} common offset parent
 */
function findCommonOffsetParent(element1, element2) {
  // This check is needed to avoid errors in case one of the elements isn't defined for any reason
  if (!element1 || !element1.nodeType || !element2 || !element2.nodeType) {
    return document.documentElement;
  }

  // Here we make sure to give as "start" the element that comes first in the DOM
  var order = element1.compareDocumentPosition(element2) & Node.DOCUMENT_POSITION_FOLLOWING;
  var start = order ? element1 : element2;
  var end = order ? element2 : element1;

  // Get common ancestor container
  var range = document.createRange();
  range.setStart(start, 0);
  range.setEnd(end, 0);
  var commonAncestorContainer = range.commonAncestorContainer;

  // Both nodes are inside #document

  if (element1 !== commonAncestorContainer && element2 !== commonAncestorContainer || start.contains(end)) {
    if (isOffsetContainer(commonAncestorContainer)) {
      return commonAncestorContainer;
    }

    return getOffsetParent(commonAncestorContainer);
  }

  // one of the nodes is inside shadowDOM, find which one
  var element1root = getRoot(element1);
  if (element1root.host) {
    return findCommonOffsetParent(element1root.host, element2);
  } else {
    return findCommonOffsetParent(element1, getRoot(element2).host);
  }
}

/**
 * Gets the scroll value of the given element in the given side (top and left)
 * @method
 * @memberof Popper.Utils
 * @argument {Element} element
 * @argument {String} side `top` or `left`
 * @returns {number} amount of scrolled pixels
 */
function getScroll(element) {
  var side = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 'top';

  var upperSide = side === 'top' ? 'scrollTop' : 'scrollLeft';
  var nodeName = element.nodeName;

  if (nodeName === 'BODY' || nodeName === 'HTML') {
    var html = element.ownerDocument.documentElement;
    var scrollingElement = element.ownerDocument.scrollingElement || html;
    return scrollingElement[upperSide];
  }

  return element[upperSide];
}

/*
 * Sum or subtract the element scroll values (left and top) from a given rect object
 * @method
 * @memberof Popper.Utils
 * @param {Object} rect - Rect object you want to change
 * @param {HTMLElement} element - The element from the function reads the scroll values
 * @param {Boolean} subtract - set to true if you want to subtract the scroll values
 * @return {Object} rect - The modifier rect object
 */
function includeScroll(rect, element) {
  var subtract = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : false;

  var scrollTop = getScroll(element, 'top');
  var scrollLeft = getScroll(element, 'left');
  var modifier = subtract ? -1 : 1;
  rect.top += scrollTop * modifier;
  rect.bottom += scrollTop * modifier;
  rect.left += scrollLeft * modifier;
  rect.right += scrollLeft * modifier;
  return rect;
}

/*
 * Helper to detect borders of a given element
 * @method
 * @memberof Popper.Utils
 * @param {CSSStyleDeclaration} styles
 * Result of `getStyleComputedProperty` on the given element
 * @param {String} axis - `x` or `y`
 * @return {number} borders - The borders size of the given axis
 */

function getBordersSize(styles, axis) {
  var sideA = axis === 'x' ? 'Left' : 'Top';
  var sideB = sideA === 'Left' ? 'Right' : 'Bottom';

  return parseFloat(styles['border' + sideA + 'Width'], 10) + parseFloat(styles['border' + sideB + 'Width'], 10);
}

function getSize(axis, body, html, computedStyle) {
  return Math.max(body['offset' + axis], body['scroll' + axis], html['client' + axis], html['offset' + axis], html['scroll' + axis], isIE(10) ? parseInt(html['offset' + axis]) + parseInt(computedStyle['margin' + (axis === 'Height' ? 'Top' : 'Left')]) + parseInt(computedStyle['margin' + (axis === 'Height' ? 'Bottom' : 'Right')]) : 0);
}

function getWindowSizes(document) {
  var body = document.body;
  var html = document.documentElement;
  var computedStyle = isIE(10) && getComputedStyle(html);

  return {
    height: getSize('Height', body, html, computedStyle),
    width: getSize('Width', body, html, computedStyle)
  };
}

var classCallCheck = function (instance, Constructor) {
  if (!(instance instanceof Constructor)) {
    throw new TypeError("Cannot call a class as a function");
  }
};

var createClass = function () {
  function defineProperties(target, props) {
    for (var i = 0; i < props.length; i++) {
      var descriptor = props[i];
      descriptor.enumerable = descriptor.enumerable || false;
      descriptor.configurable = true;
      if ("value" in descriptor) descriptor.writable = true;
      Object.defineProperty(target, descriptor.key, descriptor);
    }
  }

  return function (Constructor, protoProps, staticProps) {
    if (protoProps) defineProperties(Constructor.prototype, protoProps);
    if (staticProps) defineProperties(Constructor, staticProps);
    return Constructor;
  };
}();





var defineProperty = function (obj, key, value) {
  if (key in obj) {
    Object.defineProperty(obj, key, {
      value: value,
      enumerable: true,
      configurable: true,
      writable: true
    });
  } else {
    obj[key] = value;
  }

  return obj;
};

var _extends = Object.assign || function (target) {
  for (var i = 1; i < arguments.length; i++) {
    var source = arguments[i];

    for (var key in source) {
      if (Object.prototype.hasOwnProperty.call(source, key)) {
        target[key] = source[key];
      }
    }
  }

  return target;
};

/**
 * Given element offsets, generate an output similar to getBoundingClientRect
 * @method
 * @memberof Popper.Utils
 * @argument {Object} offsets
 * @returns {Object} ClientRect like output
 */
function getClientRect(offsets) {
  return _extends({}, offsets, {
    right: offsets.left + offsets.width,
    bottom: offsets.top + offsets.height
  });
}

/**
 * Get bounding client rect of given element
 * @method
 * @memberof Popper.Utils
 * @param {HTMLElement} element
 * @return {Object} client rect
 */
function getBoundingClientRect(element) {
  var rect = {};

  // IE10 10 FIX: Please, don't ask, the element isn't
  // considered in DOM in some circumstances...
  // This isn't reproducible in IE10 compatibility mode of IE11
  try {
    if (isIE(10)) {
      rect = element.getBoundingClientRect();
      var scrollTop = getScroll(element, 'top');
      var scrollLeft = getScroll(element, 'left');
      rect.top += scrollTop;
      rect.left += scrollLeft;
      rect.bottom += scrollTop;
      rect.right += scrollLeft;
    } else {
      rect = element.getBoundingClientRect();
    }
  } catch (e) {}

  var result = {
    left: rect.left,
    top: rect.top,
    width: rect.right - rect.left,
    height: rect.bottom - rect.top
  };

  // subtract scrollbar size from sizes
  var sizes = element.nodeName === 'HTML' ? getWindowSizes(element.ownerDocument) : {};
  var width = sizes.width || element.clientWidth || result.right - result.left;
  var height = sizes.height || element.clientHeight || result.bottom - result.top;

  var horizScrollbar = element.offsetWidth - width;
  var vertScrollbar = element.offsetHeight - height;

  // if an hypothetical scrollbar is detected, we must be sure it's not a `border`
  // we make this check conditional for performance reasons
  if (horizScrollbar || vertScrollbar) {
    var styles = getStyleComputedProperty(element);
    horizScrollbar -= getBordersSize(styles, 'x');
    vertScrollbar -= getBordersSize(styles, 'y');

    result.width -= horizScrollbar;
    result.height -= vertScrollbar;
  }

  return getClientRect(result);
}

function getOffsetRectRelativeToArbitraryNode(children, parent) {
  var fixedPosition = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : false;

  var isIE10 = isIE(10);
  var isHTML = parent.nodeName === 'HTML';
  var childrenRect = getBoundingClientRect(children);
  var parentRect = getBoundingClientRect(parent);
  var scrollParent = getScrollParent(children);

  var styles = getStyleComputedProperty(parent);
  var borderTopWidth = parseFloat(styles.borderTopWidth, 10);
  var borderLeftWidth = parseFloat(styles.borderLeftWidth, 10);

  // In cases where the parent is fixed, we must ignore negative scroll in offset calc
  if (fixedPosition && isHTML) {
    parentRect.top = Math.max(parentRect.top, 0);
    parentRect.left = Math.max(parentRect.left, 0);
  }
  var offsets = getClientRect({
    top: childrenRect.top - parentRect.top - borderTopWidth,
    left: childrenRect.left - parentRect.left - borderLeftWidth,
    width: childrenRect.width,
    height: childrenRect.height
  });
  offsets.marginTop = 0;
  offsets.marginLeft = 0;

  // Subtract margins of documentElement in case it's being used as parent
  // we do this only on HTML because it's the only element that behaves
  // differently when margins are applied to it. The margins are included in
  // the box of the documentElement, in the other cases not.
  if (!isIE10 && isHTML) {
    var marginTop = parseFloat(styles.marginTop, 10);
    var marginLeft = parseFloat(styles.marginLeft, 10);

    offsets.top -= borderTopWidth - marginTop;
    offsets.bottom -= borderTopWidth - marginTop;
    offsets.left -= borderLeftWidth - marginLeft;
    offsets.right -= borderLeftWidth - marginLeft;

    // Attach marginTop and marginLeft because in some circumstances we may need them
    offsets.marginTop = marginTop;
    offsets.marginLeft = marginLeft;
  }

  if (isIE10 && !fixedPosition ? parent.contains(scrollParent) : parent === scrollParent && scrollParent.nodeName !== 'BODY') {
    offsets = includeScroll(offsets, parent);
  }

  return offsets;
}

function getViewportOffsetRectRelativeToArtbitraryNode(element) {
  var excludeScroll = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;

  var html = element.ownerDocument.documentElement;
  var relativeOffset = getOffsetRectRelativeToArbitraryNode(element, html);
  var width = Math.max(html.clientWidth, window.innerWidth || 0);
  var height = Math.max(html.clientHeight, window.innerHeight || 0);

  var scrollTop = !excludeScroll ? getScroll(html) : 0;
  var scrollLeft = !excludeScroll ? getScroll(html, 'left') : 0;

  var offset = {
    top: scrollTop - relativeOffset.top + relativeOffset.marginTop,
    left: scrollLeft - relativeOffset.left + relativeOffset.marginLeft,
    width: width,
    height: height
  };

  return getClientRect(offset);
}

/**
 * Check if the given element is fixed or is inside a fixed parent
 * @method
 * @memberof Popper.Utils
 * @argument {Element} element
 * @argument {Element} customContainer
 * @returns {Boolean} answer to "isFixed?"
 */
function isFixed(element) {
  var nodeName = element.nodeName;
  if (nodeName === 'BODY' || nodeName === 'HTML') {
    return false;
  }
  if (getStyleComputedProperty(element, 'position') === 'fixed') {
    return true;
  }
  var parentNode = getParentNode(element);
  if (!parentNode) {
    return false;
  }
  return isFixed(parentNode);
}

/**
 * Finds the first parent of an element that has a transformed property defined
 * @method
 * @memberof Popper.Utils
 * @argument {Element} element
 * @returns {Element} first transformed parent or documentElement
 */

function getFixedPositionOffsetParent(element) {
  // This check is needed to avoid errors in case one of the elements isn't defined for any reason
  if (!element || !element.parentElement || isIE()) {
    return document.documentElement;
  }
  var el = element.parentElement;
  while (el && getStyleComputedProperty(el, 'transform') === 'none') {
    el = el.parentElement;
  }
  return el || document.documentElement;
}

/**
 * Computed the boundaries limits and return them
 * @method
 * @memberof Popper.Utils
 * @param {HTMLElement} popper
 * @param {HTMLElement} reference
 * @param {number} padding
 * @param {HTMLElement} boundariesElement - Element used to define the boundaries
 * @param {Boolean} fixedPosition - Is in fixed position mode
 * @returns {Object} Coordinates of the boundaries
 */
function getBoundaries(popper, reference, padding, boundariesElement) {
  var fixedPosition = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : false;

  // NOTE: 1 DOM access here

  var boundaries = { top: 0, left: 0 };
  var offsetParent = fixedPosition ? getFixedPositionOffsetParent(popper) : findCommonOffsetParent(popper, reference);

  // Handle viewport case
  if (boundariesElement === 'viewport') {
    boundaries = getViewportOffsetRectRelativeToArtbitraryNode(offsetParent, fixedPosition);
  } else {
    // Handle other cases based on DOM element used as boundaries
    var boundariesNode = void 0;
    if (boundariesElement === 'scrollParent') {
      boundariesNode = getScrollParent(getParentNode(reference));
      if (boundariesNode.nodeName === 'BODY') {
        boundariesNode = popper.ownerDocument.documentElement;
      }
    } else if (boundariesElement === 'window') {
      boundariesNode = popper.ownerDocument.documentElement;
    } else {
      boundariesNode = boundariesElement;
    }

    var offsets = getOffsetRectRelativeToArbitraryNode(boundariesNode, offsetParent, fixedPosition);

    // In case of HTML, we need a different computation
    if (boundariesNode.nodeName === 'HTML' && !isFixed(offsetParent)) {
      var _getWindowSizes = getWindowSizes(popper.ownerDocument),
          height = _getWindowSizes.height,
          width = _getWindowSizes.width;

      boundaries.top += offsets.top - offsets.marginTop;
      boundaries.bottom = height + offsets.top;
      boundaries.left += offsets.left - offsets.marginLeft;
      boundaries.right = width + offsets.left;
    } else {
      // for all the other DOM elements, this one is good
      boundaries = offsets;
    }
  }

  // Add paddings
  padding = padding || 0;
  var isPaddingNumber = typeof padding === 'number';
  boundaries.left += isPaddingNumber ? padding : padding.left || 0;
  boundaries.top += isPaddingNumber ? padding : padding.top || 0;
  boundaries.right -= isPaddingNumber ? padding : padding.right || 0;
  boundaries.bottom -= isPaddingNumber ? padding : padding.bottom || 0;

  return boundaries;
}

function getArea(_ref) {
  var width = _ref.width,
      height = _ref.height;

  return width * height;
}

/**
 * Utility used to transform the `auto` placement to the placement with more
 * available space.
 * @method
 * @memberof Popper.Utils
 * @argument {Object} data - The data object generated by update method
 * @argument {Object} options - Modifiers configuration and options
 * @returns {Object} The data object, properly modified
 */
function computeAutoPlacement(placement, refRect, popper, reference, boundariesElement) {
  var padding = arguments.length > 5 && arguments[5] !== undefined ? arguments[5] : 0;

  if (placement.indexOf('auto') === -1) {
    return placement;
  }

  var boundaries = getBoundaries(popper, reference, padding, boundariesElement);

  var rects = {
    top: {
      width: boundaries.width,
      height: refRect.top - boundaries.top
    },
    right: {
      width: boundaries.right - refRect.right,
      height: boundaries.height
    },
    bottom: {
      width: boundaries.width,
      height: boundaries.bottom - refRect.bottom
    },
    left: {
      width: refRect.left - boundaries.left,
      height: boundaries.height
    }
  };

  var sortedAreas = Object.keys(rects).map(function (key) {
    return _extends({
      key: key
    }, rects[key], {
      area: getArea(rects[key])
    });
  }).sort(function (a, b) {
    return b.area - a.area;
  });

  var filteredAreas = sortedAreas.filter(function (_ref2) {
    var width = _ref2.width,
        height = _ref2.height;
    return width >= popper.clientWidth && height >= popper.clientHeight;
  });

  var computedPlacement = filteredAreas.length > 0 ? filteredAreas[0].key : sortedAreas[0].key;

  var variation = placement.split('-')[1];

  return computedPlacement + (variation ? '-' + variation : '');
}

/**
 * Get offsets to the reference element
 * @method
 * @memberof Popper.Utils
 * @param {Object} state
 * @param {Element} popper - the popper element
 * @param {Element} reference - the reference element (the popper will be relative to this)
 * @param {Element} fixedPosition - is in fixed position mode
 * @returns {Object} An object containing the offsets which will be applied to the popper
 */
function getReferenceOffsets(state, popper, reference) {
  var fixedPosition = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : null;

  var commonOffsetParent = fixedPosition ? getFixedPositionOffsetParent(popper) : findCommonOffsetParent(popper, reference);
  return getOffsetRectRelativeToArbitraryNode(reference, commonOffsetParent, fixedPosition);
}

/**
 * Get the outer sizes of the given element (offset size + margins)
 * @method
 * @memberof Popper.Utils
 * @argument {Element} element
 * @returns {Object} object containing width and height properties
 */
function getOuterSizes(element) {
  var window = element.ownerDocument.defaultView;
  var styles = window.getComputedStyle(element);
  var x = parseFloat(styles.marginTop || 0) + parseFloat(styles.marginBottom || 0);
  var y = parseFloat(styles.marginLeft || 0) + parseFloat(styles.marginRight || 0);
  var result = {
    width: element.offsetWidth + y,
    height: element.offsetHeight + x
  };
  return result;
}

/**
 * Get the opposite placement of the given one
 * @method
 * @memberof Popper.Utils
 * @argument {String} placement
 * @returns {String} flipped placement
 */
function getOppositePlacement(placement) {
  var hash = { left: 'right', right: 'left', bottom: 'top', top: 'bottom' };
  return placement.replace(/left|right|bottom|top/g, function (matched) {
    return hash[matched];
  });
}

/**
 * Get offsets to the popper
 * @method
 * @memberof Popper.Utils
 * @param {Object} position - CSS position the Popper will get applied
 * @param {HTMLElement} popper - the popper element
 * @param {Object} referenceOffsets - the reference offsets (the popper will be relative to this)
 * @param {String} placement - one of the valid placement options
 * @returns {Object} popperOffsets - An object containing the offsets which will be applied to the popper
 */
function getPopperOffsets(popper, referenceOffsets, placement) {
  placement = placement.split('-')[0];

  // Get popper node sizes
  var popperRect = getOuterSizes(popper);

  // Add position, width and height to our offsets object
  var popperOffsets = {
    width: popperRect.width,
    height: popperRect.height
  };

  // depending by the popper placement we have to compute its offsets slightly differently
  var isHoriz = ['right', 'left'].indexOf(placement) !== -1;
  var mainSide = isHoriz ? 'top' : 'left';
  var secondarySide = isHoriz ? 'left' : 'top';
  var measurement = isHoriz ? 'height' : 'width';
  var secondaryMeasurement = !isHoriz ? 'height' : 'width';

  popperOffsets[mainSide] = referenceOffsets[mainSide] + referenceOffsets[measurement] / 2 - popperRect[measurement] / 2;
  if (placement === secondarySide) {
    popperOffsets[secondarySide] = referenceOffsets[secondarySide] - popperRect[secondaryMeasurement];
  } else {
    popperOffsets[secondarySide] = referenceOffsets[getOppositePlacement(secondarySide)];
  }

  return popperOffsets;
}

/**
 * Mimics the `find` method of Array
 * @method
 * @memberof Popper.Utils
 * @argument {Array} arr
 * @argument prop
 * @argument value
 * @returns index or -1
 */
function find(arr, check) {
  // use native find if supported
  if (Array.prototype.find) {
    return arr.find(check);
  }

  // use `filter` to obtain the same behavior of `find`
  return arr.filter(check)[0];
}

/**
 * Return the index of the matching object
 * @method
 * @memberof Popper.Utils
 * @argument {Array} arr
 * @argument prop
 * @argument value
 * @returns index or -1
 */
function findIndex(arr, prop, value) {
  // use native findIndex if supported
  if (Array.prototype.findIndex) {
    return arr.findIndex(function (cur) {
      return cur[prop] === value;
    });
  }

  // use `find` + `indexOf` if `findIndex` isn't supported
  var match = find(arr, function (obj) {
    return obj[prop] === value;
  });
  return arr.indexOf(match);
}

/**
 * Loop trough the list of modifiers and run them in order,
 * each of them will then edit the data object.
 * @method
 * @memberof Popper.Utils
 * @param {dataObject} data
 * @param {Array} modifiers
 * @param {String} ends - Optional modifier name used as stopper
 * @returns {dataObject}
 */
function runModifiers(modifiers, data, ends) {
  var modifiersToRun = ends === undefined ? modifiers : modifiers.slice(0, findIndex(modifiers, 'name', ends));

  modifiersToRun.forEach(function (modifier) {
    if (modifier['function']) {
      // eslint-disable-line dot-notation
      console.warn('`modifier.function` is deprecated, use `modifier.fn`!');
    }
    var fn = modifier['function'] || modifier.fn; // eslint-disable-line dot-notation
    if (modifier.enabled && isFunction(fn)) {
      // Add properties to offsets to make them a complete clientRect object
      // we do this before each modifier to make sure the previous one doesn't
      // mess with these values
      data.offsets.popper = getClientRect(data.offsets.popper);
      data.offsets.reference = getClientRect(data.offsets.reference);

      data = fn(data, modifier);
    }
  });

  return data;
}

/**
 * Updates the position of the popper, computing the new offsets and applying
 * the new style.<br />
 * Prefer `scheduleUpdate` over `update` because of performance reasons.
 * @method
 * @memberof Popper
 */
function update() {
  // if popper is destroyed, don't perform any further update
  if (this.state.isDestroyed) {
    return;
  }

  var data = {
    instance: this,
    styles: {},
    arrowStyles: {},
    attributes: {},
    flipped: false,
    offsets: {}
  };

  // compute reference element offsets
  data.offsets.reference = getReferenceOffsets(this.state, this.popper, this.reference, this.options.positionFixed);

  // compute auto placement, store placement inside the data object,
  // modifiers will be able to edit `placement` if needed
  // and refer to originalPlacement to know the original value
  data.placement = computeAutoPlacement(this.options.placement, data.offsets.reference, this.popper, this.reference, this.options.modifiers.flip.boundariesElement, this.options.modifiers.flip.padding);

  // store the computed placement inside `originalPlacement`
  data.originalPlacement = data.placement;

  data.positionFixed = this.options.positionFixed;

  // compute the popper offsets
  data.offsets.popper = getPopperOffsets(this.popper, data.offsets.reference, data.placement);

  data.offsets.popper.position = this.options.positionFixed ? 'fixed' : 'absolute';

  // run the modifiers
  data = runModifiers(this.modifiers, data);

  // the first `update` will call `onCreate` callback
  // the other ones will call `onUpdate` callback
  if (!this.state.isCreated) {
    this.state.isCreated = true;
    this.options.onCreate(data);
  } else {
    this.options.onUpdate(data);
  }
}

/**
 * Helper used to know if the given modifier is enabled.
 * @method
 * @memberof Popper.Utils
 * @returns {Boolean}
 */
function isModifierEnabled(modifiers, modifierName) {
  return modifiers.some(function (_ref) {
    var name = _ref.name,
        enabled = _ref.enabled;
    return enabled && name === modifierName;
  });
}

/**
 * Get the prefixed supported property name
 * @method
 * @memberof Popper.Utils
 * @argument {String} property (camelCase)
 * @returns {String} prefixed property (camelCase or PascalCase, depending on the vendor prefix)
 */
function getSupportedPropertyName(property) {
  var prefixes = [false, 'ms', 'Webkit', 'Moz', 'O'];
  var upperProp = property.charAt(0).toUpperCase() + property.slice(1);

  for (var i = 0; i < prefixes.length; i++) {
    var prefix = prefixes[i];
    var toCheck = prefix ? '' + prefix + upperProp : property;
    if (typeof document.body.style[toCheck] !== 'undefined') {
      return toCheck;
    }
  }
  return null;
}

/**
 * Destroys the popper.
 * @method
 * @memberof Popper
 */
function destroy() {
  this.state.isDestroyed = true;

  // touch DOM only if `applyStyle` modifier is enabled
  if (isModifierEnabled(this.modifiers, 'applyStyle')) {
    this.popper.removeAttribute('x-placement');
    this.popper.style.position = '';
    this.popper.style.top = '';
    this.popper.style.left = '';
    this.popper.style.right = '';
    this.popper.style.bottom = '';
    this.popper.style.willChange = '';
    this.popper.style[getSupportedPropertyName('transform')] = '';
  }

  this.disableEventListeners();

  // remove the popper if user explicity asked for the deletion on destroy
  // do not use `remove` because IE11 doesn't support it
  if (this.options.removeOnDestroy) {
    this.popper.parentNode.removeChild(this.popper);
  }
  return this;
}

/**
 * Get the window associated with the element
 * @argument {Element} element
 * @returns {Window}
 */
function getWindow(element) {
  var ownerDocument = element.ownerDocument;
  return ownerDocument ? ownerDocument.defaultView : window;
}

function attachToScrollParents(scrollParent, event, callback, scrollParents) {
  var isBody = scrollParent.nodeName === 'BODY';
  var target = isBody ? scrollParent.ownerDocument.defaultView : scrollParent;
  target.addEventListener(event, callback, { passive: true });

  if (!isBody) {
    attachToScrollParents(getScrollParent(target.parentNode), event, callback, scrollParents);
  }
  scrollParents.push(target);
}

/**
 * Setup needed event listeners used to update the popper position
 * @method
 * @memberof Popper.Utils
 * @private
 */
function setupEventListeners(reference, options, state, updateBound) {
  // Resize event listener on window
  state.updateBound = updateBound;
  getWindow(reference).addEventListener('resize', state.updateBound, { passive: true });

  // Scroll event listener on scroll parents
  var scrollElement = getScrollParent(reference);
  attachToScrollParents(scrollElement, 'scroll', state.updateBound, state.scrollParents);
  state.scrollElement = scrollElement;
  state.eventsEnabled = true;

  return state;
}

/**
 * It will add resize/scroll events and start recalculating
 * position of the popper element when they are triggered.
 * @method
 * @memberof Popper
 */
function enableEventListeners() {
  if (!this.state.eventsEnabled) {
    this.state = setupEventListeners(this.reference, this.options, this.state, this.scheduleUpdate);
  }
}

/**
 * Remove event listeners used to update the popper position
 * @method
 * @memberof Popper.Utils
 * @private
 */
function removeEventListeners(reference, state) {
  // Remove resize event listener on window
  getWindow(reference).removeEventListener('resize', state.updateBound);

  // Remove scroll event listener on scroll parents
  state.scrollParents.forEach(function (target) {
    target.removeEventListener('scroll', state.updateBound);
  });

  // Reset state
  state.updateBound = null;
  state.scrollParents = [];
  state.scrollElement = null;
  state.eventsEnabled = false;
  return state;
}

/**
 * It will remove resize/scroll events and won't recalculate popper position
 * when they are triggered. It also won't trigger `onUpdate` callback anymore,
 * unless you call `update` method manually.
 * @method
 * @memberof Popper
 */
function disableEventListeners() {
  if (this.state.eventsEnabled) {
    cancelAnimationFrame(this.scheduleUpdate);
    this.state = removeEventListeners(this.reference, this.state);
  }
}

/**
 * Tells if a given input is a number
 * @method
 * @memberof Popper.Utils
 * @param {*} input to check
 * @return {Boolean}
 */
function isNumeric(n) {
  return n !== '' && !isNaN(parseFloat(n)) && isFinite(n);
}

/**
 * Set the style to the given popper
 * @method
 * @memberof Popper.Utils
 * @argument {Element} element - Element to apply the style to
 * @argument {Object} styles
 * Object with a list of properties and values which will be applied to the element
 */
function setStyles(element, styles) {
  Object.keys(styles).forEach(function (prop) {
    var unit = '';
    // add unit if the value is numeric and is one of the following
    if (['width', 'height', 'top', 'right', 'bottom', 'left'].indexOf(prop) !== -1 && isNumeric(styles[prop])) {
      unit = 'px';
    }
    element.style[prop] = styles[prop] + unit;
  });
}

/**
 * Set the attributes to the given popper
 * @method
 * @memberof Popper.Utils
 * @argument {Element} element - Element to apply the attributes to
 * @argument {Object} styles
 * Object with a list of properties and values which will be applied to the element
 */
function setAttributes(element, attributes) {
  Object.keys(attributes).forEach(function (prop) {
    var value = attributes[prop];
    if (value !== false) {
      element.setAttribute(prop, attributes[prop]);
    } else {
      element.removeAttribute(prop);
    }
  });
}

/**
 * @function
 * @memberof Modifiers
 * @argument {Object} data - The data object generated by `update` method
 * @argument {Object} data.styles - List of style properties - values to apply to popper element
 * @argument {Object} data.attributes - List of attribute properties - values to apply to popper element
 * @argument {Object} options - Modifiers configuration and options
 * @returns {Object} The same data object
 */
function applyStyle(data) {
  // any property present in `data.styles` will be applied to the popper,
  // in this way we can make the 3rd party modifiers add custom styles to it
  // Be aware, modifiers could override the properties defined in the previous
  // lines of this modifier!
  setStyles(data.instance.popper, data.styles);

  // any property present in `data.attributes` will be applied to the popper,
  // they will be set as HTML attributes of the element
  setAttributes(data.instance.popper, data.attributes);

  // if arrowElement is defined and arrowStyles has some properties
  if (data.arrowElement && Object.keys(data.arrowStyles).length) {
    setStyles(data.arrowElement, data.arrowStyles);
  }

  return data;
}

/**
 * Set the x-placement attribute before everything else because it could be used
 * to add margins to the popper margins needs to be calculated to get the
 * correct popper offsets.
 * @method
 * @memberof Popper.modifiers
 * @param {HTMLElement} reference - The reference element used to position the popper
 * @param {HTMLElement} popper - The HTML element used as popper
 * @param {Object} options - Popper.js options
 */
function applyStyleOnLoad(reference, popper, options, modifierOptions, state) {
  // compute reference element offsets
  var referenceOffsets = getReferenceOffsets(state, popper, reference, options.positionFixed);

  // compute auto placement, store placement inside the data object,
  // modifiers will be able to edit `placement` if needed
  // and refer to originalPlacement to know the original value
  var placement = computeAutoPlacement(options.placement, referenceOffsets, popper, reference, options.modifiers.flip.boundariesElement, options.modifiers.flip.padding);

  popper.setAttribute('x-placement', placement);

  // Apply `position` to popper before anything else because
  // without the position applied we can't guarantee correct computations
  setStyles(popper, { position: options.positionFixed ? 'fixed' : 'absolute' });

  return options;
}

/**
 * @function
 * @memberof Popper.Utils
 * @argument {Object} data - The data object generated by `update` method
 * @argument {Boolean} shouldRound - If the offsets should be rounded at all
 * @returns {Object} The popper's position offsets rounded
 *
 * The tale of pixel-perfect positioning. It's still not 100% perfect, but as
 * good as it can be within reason.
 * Discussion here: https://github.com/FezVrasta/popper.js/pull/715
 *
 * Low DPI screens cause a popper to be blurry if not using full pixels (Safari
 * as well on High DPI screens).
 *
 * Firefox prefers no rounding for positioning and does not have blurriness on
 * high DPI screens.
 *
 * Only horizontal placement and left/right values need to be considered.
 */
function getRoundedOffsets(data, shouldRound) {
  var _data$offsets = data.offsets,
      popper = _data$offsets.popper,
      reference = _data$offsets.reference;
  var round = Math.round,
      floor = Math.floor;

  var noRound = function noRound(v) {
    return v;
  };

  var referenceWidth = round(reference.width);
  var popperWidth = round(popper.width);

  var isVertical = ['left', 'right'].indexOf(data.placement) !== -1;
  var isVariation = data.placement.indexOf('-') !== -1;
  var sameWidthParity = referenceWidth % 2 === popperWidth % 2;
  var bothOddWidth = referenceWidth % 2 === 1 && popperWidth % 2 === 1;

  var horizontalToInteger = !shouldRound ? noRound : isVertical || isVariation || sameWidthParity ? round : floor;
  var verticalToInteger = !shouldRound ? noRound : round;

  return {
    left: horizontalToInteger(bothOddWidth && !isVariation && shouldRound ? popper.left - 1 : popper.left),
    top: verticalToInteger(popper.top),
    bottom: verticalToInteger(popper.bottom),
    right: horizontalToInteger(popper.right)
  };
}

var isFirefox = isBrowser && /Firefox/i.test(navigator.userAgent);

/**
 * @function
 * @memberof Modifiers
 * @argument {Object} data - The data object generated by `update` method
 * @argument {Object} options - Modifiers configuration and options
 * @returns {Object} The data object, properly modified
 */
function computeStyle(data, options) {
  var x = options.x,
      y = options.y;
  var popper = data.offsets.popper;

  // Remove this legacy support in Popper.js v2

  var legacyGpuAccelerationOption = find(data.instance.modifiers, function (modifier) {
    return modifier.name === 'applyStyle';
  }).gpuAcceleration;
  if (legacyGpuAccelerationOption !== undefined) {
    console.warn('WARNING: `gpuAcceleration` option moved to `computeStyle` modifier and will not be supported in future versions of Popper.js!');
  }
  var gpuAcceleration = legacyGpuAccelerationOption !== undefined ? legacyGpuAccelerationOption : options.gpuAcceleration;

  var offsetParent = getOffsetParent(data.instance.popper);
  var offsetParentRect = getBoundingClientRect(offsetParent);

  // Styles
  var styles = {
    position: popper.position
  };

  var offsets = getRoundedOffsets(data, window.devicePixelRatio < 2 || !isFirefox);

  var sideA = x === 'bottom' ? 'top' : 'bottom';
  var sideB = y === 'right' ? 'left' : 'right';

  // if gpuAcceleration is set to `true` and transform is supported,
  //  we use `translate3d` to apply the position to the popper we
  // automatically use the supported prefixed version if needed
  var prefixedProperty = getSupportedPropertyName('transform');

  // now, let's make a step back and look at this code closely (wtf?)
  // If the content of the popper grows once it's been positioned, it
  // may happen that the popper gets misplaced because of the new content
  // overflowing its reference element
  // To avoid this problem, we provide two options (x and y), which allow
  // the consumer to define the offset origin.
  // If we position a popper on top of a reference element, we can set
  // `x` to `top` to make the popper grow towards its top instead of
  // its bottom.
  var left = void 0,
      top = void 0;
  if (sideA === 'bottom') {
    // when offsetParent is <html> the positioning is relative to the bottom of the screen (excluding the scrollbar)
    // and not the bottom of the html element
    if (offsetParent.nodeName === 'HTML') {
      top = -offsetParent.clientHeight + offsets.bottom;
    } else {
      top = -offsetParentRect.height + offsets.bottom;
    }
  } else {
    top = offsets.top;
  }
  if (sideB === 'right') {
    if (offsetParent.nodeName === 'HTML') {
      left = -offsetParent.clientWidth + offsets.right;
    } else {
      left = -offsetParentRect.width + offsets.right;
    }
  } else {
    left = offsets.left;
  }
  if (gpuAcceleration && prefixedProperty) {
    styles[prefixedProperty] = 'translate3d(' + left + 'px, ' + top + 'px, 0)';
    styles[sideA] = 0;
    styles[sideB] = 0;
    styles.willChange = 'transform';
  } else {
    // othwerise, we use the standard `top`, `left`, `bottom` and `right` properties
    var invertTop = sideA === 'bottom' ? -1 : 1;
    var invertLeft = sideB === 'right' ? -1 : 1;
    styles[sideA] = top * invertTop;
    styles[sideB] = left * invertLeft;
    styles.willChange = sideA + ', ' + sideB;
  }

  // Attributes
  var attributes = {
    'x-placement': data.placement
  };

  // Update `data` attributes, styles and arrowStyles
  data.attributes = _extends({}, attributes, data.attributes);
  data.styles = _extends({}, styles, data.styles);
  data.arrowStyles = _extends({}, data.offsets.arrow, data.arrowStyles);

  return data;
}

/**
 * Helper used to know if the given modifier depends from another one.<br />
 * It checks if the needed modifier is listed and enabled.
 * @method
 * @memberof Popper.Utils
 * @param {Array} modifiers - list of modifiers
 * @param {String} requestingName - name of requesting modifier
 * @param {String} requestedName - name of requested modifier
 * @returns {Boolean}
 */
function isModifierRequired(modifiers, requestingName, requestedName) {
  var requesting = find(modifiers, function (_ref) {
    var name = _ref.name;
    return name === requestingName;
  });

  var isRequired = !!requesting && modifiers.some(function (modifier) {
    return modifier.name === requestedName && modifier.enabled && modifier.order < requesting.order;
  });

  if (!isRequired) {
    var _requesting = '`' + requestingName + '`';
    var requested = '`' + requestedName + '`';
    console.warn(requested + ' modifier is required by ' + _requesting + ' modifier in order to work, be sure to include it before ' + _requesting + '!');
  }
  return isRequired;
}

/**
 * @function
 * @memberof Modifiers
 * @argument {Object} data - The data object generated by update method
 * @argument {Object} options - Modifiers configuration and options
 * @returns {Object} The data object, properly modified
 */
function arrow(data, options) {
  var _data$offsets$arrow;

  // arrow depends on keepTogether in order to work
  if (!isModifierRequired(data.instance.modifiers, 'arrow', 'keepTogether')) {
    return data;
  }

  var arrowElement = options.element;

  // if arrowElement is a string, suppose it's a CSS selector
  if (typeof arrowElement === 'string') {
    arrowElement = data.instance.popper.querySelector(arrowElement);

    // if arrowElement is not found, don't run the modifier
    if (!arrowElement) {
      return data;
    }
  } else {
    // if the arrowElement isn't a query selector we must check that the
    // provided DOM node is child of its popper node
    if (!data.instance.popper.contains(arrowElement)) {
      console.warn('WARNING: `arrow.element` must be child of its popper element!');
      return data;
    }
  }

  var placement = data.placement.split('-')[0];
  var _data$offsets = data.offsets,
      popper = _data$offsets.popper,
      reference = _data$offsets.reference;

  var isVertical = ['left', 'right'].indexOf(placement) !== -1;

  var len = isVertical ? 'height' : 'width';
  var sideCapitalized = isVertical ? 'Top' : 'Left';
  var side = sideCapitalized.toLowerCase();
  var altSide = isVertical ? 'left' : 'top';
  var opSide = isVertical ? 'bottom' : 'right';
  var arrowElementSize = getOuterSizes(arrowElement)[len];

  //
  // extends keepTogether behavior making sure the popper and its
  // reference have enough pixels in conjunction
  //

  // top/left side
  if (reference[opSide] - arrowElementSize < popper[side]) {
    data.offsets.popper[side] -= popper[side] - (reference[opSide] - arrowElementSize);
  }
  // bottom/right side
  if (reference[side] + arrowElementSize > popper[opSide]) {
    data.offsets.popper[side] += reference[side] + arrowElementSize - popper[opSide];
  }
  data.offsets.popper = getClientRect(data.offsets.popper);

  // compute center of the popper
  var center = reference[side] + reference[len] / 2 - arrowElementSize / 2;

  // Compute the sideValue using the updated popper offsets
  // take popper margin in account because we don't have this info available
  var css = getStyleComputedProperty(data.instance.popper);
  var popperMarginSide = parseFloat(css['margin' + sideCapitalized], 10);
  var popperBorderSide = parseFloat(css['border' + sideCapitalized + 'Width'], 10);
  var sideValue = center - data.offsets.popper[side] - popperMarginSide - popperBorderSide;

  // prevent arrowElement from being placed not contiguously to its popper
  sideValue = Math.max(Math.min(popper[len] - arrowElementSize, sideValue), 0);

  data.arrowElement = arrowElement;
  data.offsets.arrow = (_data$offsets$arrow = {}, defineProperty(_data$offsets$arrow, side, Math.round(sideValue)), defineProperty(_data$offsets$arrow, altSide, ''), _data$offsets$arrow);

  return data;
}

/**
 * Get the opposite placement variation of the given one
 * @method
 * @memberof Popper.Utils
 * @argument {String} placement variation
 * @returns {String} flipped placement variation
 */
function getOppositeVariation(variation) {
  if (variation === 'end') {
    return 'start';
  } else if (variation === 'start') {
    return 'end';
  }
  return variation;
}

/**
 * List of accepted placements to use as values of the `placement` option.<br />
 * Valid placements are:
 * - `auto`
 * - `top`
 * - `right`
 * - `bottom`
 * - `left`
 *
 * Each placement can have a variation from this list:
 * - `-start`
 * - `-end`
 *
 * Variations are interpreted easily if you think of them as the left to right
 * written languages. Horizontally (`top` and `bottom`), `start` is left and `end`
 * is right.<br />
 * Vertically (`left` and `right`), `start` is top and `end` is bottom.
 *
 * Some valid examples are:
 * - `top-end` (on top of reference, right aligned)
 * - `right-start` (on right of reference, top aligned)
 * - `bottom` (on bottom, centered)
 * - `auto-end` (on the side with more space available, alignment depends by placement)
 *
 * @static
 * @type {Array}
 * @enum {String}
 * @readonly
 * @method placements
 * @memberof Popper
 */
var placements = ['auto-start', 'auto', 'auto-end', 'top-start', 'top', 'top-end', 'right-start', 'right', 'right-end', 'bottom-end', 'bottom', 'bottom-start', 'left-end', 'left', 'left-start'];

// Get rid of `auto` `auto-start` and `auto-end`
var validPlacements = placements.slice(3);

/**
 * Given an initial placement, returns all the subsequent placements
 * clockwise (or counter-clockwise).
 *
 * @method
 * @memberof Popper.Utils
 * @argument {String} placement - A valid placement (it accepts variations)
 * @argument {Boolean} counter - Set to true to walk the placements counterclockwise
 * @returns {Array} placements including their variations
 */
function clockwise(placement) {
  var counter = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;

  var index = validPlacements.indexOf(placement);
  var arr = validPlacements.slice(index + 1).concat(validPlacements.slice(0, index));
  return counter ? arr.reverse() : arr;
}

var BEHAVIORS = {
  FLIP: 'flip',
  CLOCKWISE: 'clockwise',
  COUNTERCLOCKWISE: 'counterclockwise'
};

/**
 * @function
 * @memberof Modifiers
 * @argument {Object} data - The data object generated by update method
 * @argument {Object} options - Modifiers configuration and options
 * @returns {Object} The data object, properly modified
 */
function flip(data, options) {
  // if `inner` modifier is enabled, we can't use the `flip` modifier
  if (isModifierEnabled(data.instance.modifiers, 'inner')) {
    return data;
  }

  if (data.flipped && data.placement === data.originalPlacement) {
    // seems like flip is trying to loop, probably there's not enough space on any of the flippable sides
    return data;
  }

  var boundaries = getBoundaries(data.instance.popper, data.instance.reference, options.padding, options.boundariesElement, data.positionFixed);

  var placement = data.placement.split('-')[0];
  var placementOpposite = getOppositePlacement(placement);
  var variation = data.placement.split('-')[1] || '';

  var flipOrder = [];

  switch (options.behavior) {
    case BEHAVIORS.FLIP:
      flipOrder = [placement, placementOpposite];
      break;
    case BEHAVIORS.CLOCKWISE:
      flipOrder = clockwise(placement);
      break;
    case BEHAVIORS.COUNTERCLOCKWISE:
      flipOrder = clockwise(placement, true);
      break;
    default:
      flipOrder = options.behavior;
  }

  flipOrder.forEach(function (step, index) {
    if (placement !== step || flipOrder.length === index + 1) {
      return data;
    }

    placement = data.placement.split('-')[0];
    placementOpposite = getOppositePlacement(placement);

    var popperOffsets = data.offsets.popper;
    var refOffsets = data.offsets.reference;

    // using floor because the reference offsets may contain decimals we are not going to consider here
    var floor = Math.floor;
    var overlapsRef = placement === 'left' && floor(popperOffsets.right) > floor(refOffsets.left) || placement === 'right' && floor(popperOffsets.left) < floor(refOffsets.right) || placement === 'top' && floor(popperOffsets.bottom) > floor(refOffsets.top) || placement === 'bottom' && floor(popperOffsets.top) < floor(refOffsets.bottom);

    var overflowsLeft = floor(popperOffsets.left) < floor(boundaries.left);
    var overflowsRight = floor(popperOffsets.right) > floor(boundaries.right);
    var overflowsTop = floor(popperOffsets.top) < floor(boundaries.top);
    var overflowsBottom = floor(popperOffsets.bottom) > floor(boundaries.bottom);

    var overflowsBoundaries = placement === 'left' && overflowsLeft || placement === 'right' && overflowsRight || placement === 'top' && overflowsTop || placement === 'bottom' && overflowsBottom;

    // flip the variation if required
    var isVertical = ['top', 'bottom'].indexOf(placement) !== -1;
    var flippedVariation = !!options.flipVariations && (isVertical && variation === 'start' && overflowsLeft || isVertical && variation === 'end' && overflowsRight || !isVertical && variation === 'start' && overflowsTop || !isVertical && variation === 'end' && overflowsBottom);

    if (overlapsRef || overflowsBoundaries || flippedVariation) {
      // this boolean to detect any flip loop
      data.flipped = true;

      if (overlapsRef || overflowsBoundaries) {
        placement = flipOrder[index + 1];
      }

      if (flippedVariation) {
        variation = getOppositeVariation(variation);
      }

      data.placement = placement + (variation ? '-' + variation : '');

      // this object contains `position`, we want to preserve it along with
      // any additional property we may add in the future
      data.offsets.popper = _extends({}, data.offsets.popper, getPopperOffsets(data.instance.popper, data.offsets.reference, data.placement));

      data = runModifiers(data.instance.modifiers, data, 'flip');
    }
  });
  return data;
}

/**
 * @function
 * @memberof Modifiers
 * @argument {Object} data - The data object generated by update method
 * @argument {Object} options - Modifiers configuration and options
 * @returns {Object} The data object, properly modified
 */
function keepTogether(data) {
  var _data$offsets = data.offsets,
      popper = _data$offsets.popper,
      reference = _data$offsets.reference;

  var placement = data.placement.split('-')[0];
  var floor = Math.floor;
  var isVertical = ['top', 'bottom'].indexOf(placement) !== -1;
  var side = isVertical ? 'right' : 'bottom';
  var opSide = isVertical ? 'left' : 'top';
  var measurement = isVertical ? 'width' : 'height';

  if (popper[side] < floor(reference[opSide])) {
    data.offsets.popper[opSide] = floor(reference[opSide]) - popper[measurement];
  }
  if (popper[opSide] > floor(reference[side])) {
    data.offsets.popper[opSide] = floor(reference[side]);
  }

  return data;
}

/**
 * Converts a string containing value + unit into a px value number
 * @function
 * @memberof {modifiers~offset}
 * @private
 * @argument {String} str - Value + unit string
 * @argument {String} measurement - `height` or `width`
 * @argument {Object} popperOffsets
 * @argument {Object} referenceOffsets
 * @returns {Number|String}
 * Value in pixels, or original string if no values were extracted
 */
function toValue(str, measurement, popperOffsets, referenceOffsets) {
  // separate value from unit
  var split = str.match(/((?:\-|\+)?\d*\.?\d*)(.*)/);
  var value = +split[1];
  var unit = split[2];

  // If it's not a number it's an operator, I guess
  if (!value) {
    return str;
  }

  if (unit.indexOf('%') === 0) {
    var element = void 0;
    switch (unit) {
      case '%p':
        element = popperOffsets;
        break;
      case '%':
      case '%r':
      default:
        element = referenceOffsets;
    }

    var rect = getClientRect(element);
    return rect[measurement] / 100 * value;
  } else if (unit === 'vh' || unit === 'vw') {
    // if is a vh or vw, we calculate the size based on the viewport
    var size = void 0;
    if (unit === 'vh') {
      size = Math.max(document.documentElement.clientHeight, window.innerHeight || 0);
    } else {
      size = Math.max(document.documentElement.clientWidth, window.innerWidth || 0);
    }
    return size / 100 * value;
  } else {
    // if is an explicit pixel unit, we get rid of the unit and keep the value
    // if is an implicit unit, it's px, and we return just the value
    return value;
  }
}

/**
 * Parse an `offset` string to extrapolate `x` and `y` numeric offsets.
 * @function
 * @memberof {modifiers~offset}
 * @private
 * @argument {String} offset
 * @argument {Object} popperOffsets
 * @argument {Object} referenceOffsets
 * @argument {String} basePlacement
 * @returns {Array} a two cells array with x and y offsets in numbers
 */
function parseOffset(offset, popperOffsets, referenceOffsets, basePlacement) {
  var offsets = [0, 0];

  // Use height if placement is left or right and index is 0 otherwise use width
  // in this way the first offset will use an axis and the second one
  // will use the other one
  var useHeight = ['right', 'left'].indexOf(basePlacement) !== -1;

  // Split the offset string to obtain a list of values and operands
  // The regex addresses values with the plus or minus sign in front (+10, -20, etc)
  var fragments = offset.split(/(\+|\-)/).map(function (frag) {
    return frag.trim();
  });

  // Detect if the offset string contains a pair of values or a single one
  // they could be separated by comma or space
  var divider = fragments.indexOf(find(fragments, function (frag) {
    return frag.search(/,|\s/) !== -1;
  }));

  if (fragments[divider] && fragments[divider].indexOf(',') === -1) {
    console.warn('Offsets separated by white space(s) are deprecated, use a comma (,) instead.');
  }

  // If divider is found, we divide the list of values and operands to divide
  // them by ofset X and Y.
  var splitRegex = /\s*,\s*|\s+/;
  var ops = divider !== -1 ? [fragments.slice(0, divider).concat([fragments[divider].split(splitRegex)[0]]), [fragments[divider].split(splitRegex)[1]].concat(fragments.slice(divider + 1))] : [fragments];

  // Convert the values with units to absolute pixels to allow our computations
  ops = ops.map(function (op, index) {
    // Most of the units rely on the orientation of the popper
    var measurement = (index === 1 ? !useHeight : useHeight) ? 'height' : 'width';
    var mergeWithPrevious = false;
    return op
    // This aggregates any `+` or `-` sign that aren't considered operators
    // e.g.: 10 + +5 => [10, +, +5]
    .reduce(function (a, b) {
      if (a[a.length - 1] === '' && ['+', '-'].indexOf(b) !== -1) {
        a[a.length - 1] = b;
        mergeWithPrevious = true;
        return a;
      } else if (mergeWithPrevious) {
        a[a.length - 1] += b;
        mergeWithPrevious = false;
        return a;
      } else {
        return a.concat(b);
      }
    }, [])
    // Here we convert the string values into number values (in px)
    .map(function (str) {
      return toValue(str, measurement, popperOffsets, referenceOffsets);
    });
  });

  // Loop trough the offsets arrays and execute the operations
  ops.forEach(function (op, index) {
    op.forEach(function (frag, index2) {
      if (isNumeric(frag)) {
        offsets[index] += frag * (op[index2 - 1] === '-' ? -1 : 1);
      }
    });
  });
  return offsets;
}

/**
 * @function
 * @memberof Modifiers
 * @argument {Object} data - The data object generated by update method
 * @argument {Object} options - Modifiers configuration and options
 * @argument {Number|String} options.offset=0
 * The offset value as described in the modifier description
 * @returns {Object} The data object, properly modified
 */
function offset(data, _ref) {
  var offset = _ref.offset;
  var placement = data.placement,
      _data$offsets = data.offsets,
      popper = _data$offsets.popper,
      reference = _data$offsets.reference;

  var basePlacement = placement.split('-')[0];

  var offsets = void 0;
  if (isNumeric(+offset)) {
    offsets = [+offset, 0];
  } else {
    offsets = parseOffset(offset, popper, reference, basePlacement);
  }

  if (basePlacement === 'left') {
    popper.top += offsets[0];
    popper.left -= offsets[1];
  } else if (basePlacement === 'right') {
    popper.top += offsets[0];
    popper.left += offsets[1];
  } else if (basePlacement === 'top') {
    popper.left += offsets[0];
    popper.top -= offsets[1];
  } else if (basePlacement === 'bottom') {
    popper.left += offsets[0];
    popper.top += offsets[1];
  }

  data.popper = popper;
  return data;
}

/**
 * @function
 * @memberof Modifiers
 * @argument {Object} data - The data object generated by `update` method
 * @argument {Object} options - Modifiers configuration and options
 * @returns {Object} The data object, properly modified
 */
function preventOverflow(data, options) {
  var boundariesElement = options.boundariesElement || getOffsetParent(data.instance.popper);

  // If offsetParent is the reference element, we really want to
  // go one step up and use the next offsetParent as reference to
  // avoid to make this modifier completely useless and look like broken
  if (data.instance.reference === boundariesElement) {
    boundariesElement = getOffsetParent(boundariesElement);
  }

  // NOTE: DOM access here
  // resets the popper's position so that the document size can be calculated excluding
  // the size of the popper element itself
  var transformProp = getSupportedPropertyName('transform');
  var popperStyles = data.instance.popper.style; // assignment to help minification
  var top = popperStyles.top,
      left = popperStyles.left,
      transform = popperStyles[transformProp];

  popperStyles.top = '';
  popperStyles.left = '';
  popperStyles[transformProp] = '';

  var boundaries = getBoundaries(data.instance.popper, data.instance.reference, options.padding, boundariesElement, data.positionFixed);

  // NOTE: DOM access here
  // restores the original style properties after the offsets have been computed
  popperStyles.top = top;
  popperStyles.left = left;
  popperStyles[transformProp] = transform;

  options.boundaries = boundaries;

  var order = options.priority;
  var popper = data.offsets.popper;

  var check = {
    primary: function primary(placement) {
      var value = popper[placement];
      if (popper[placement] < boundaries[placement] && !options.escapeWithReference) {
        value = Math.max(popper[placement], boundaries[placement]);
      }
      return defineProperty({}, placement, value);
    },
    secondary: function secondary(placement) {
      var mainSide = placement === 'right' ? 'left' : 'top';
      var value = popper[mainSide];
      if (popper[placement] > boundaries[placement] && !options.escapeWithReference) {
        value = Math.min(popper[mainSide], boundaries[placement] - (placement === 'right' ? popper.width : popper.height));
      }
      return defineProperty({}, mainSide, value);
    }
  };

  order.forEach(function (placement) {
    var side = ['left', 'top'].indexOf(placement) !== -1 ? 'primary' : 'secondary';
    popper = _extends({}, popper, check[side](placement));
  });

  data.offsets.popper = popper;

  return data;
}

/**
 * @function
 * @memberof Modifiers
 * @argument {Object} data - The data object generated by `update` method
 * @argument {Object} options - Modifiers configuration and options
 * @returns {Object} The data object, properly modified
 */
function shift(data) {
  var placement = data.placement;
  var basePlacement = placement.split('-')[0];
  var shiftvariation = placement.split('-')[1];

  // if shift shiftvariation is specified, run the modifier
  if (shiftvariation) {
    var _data$offsets = data.offsets,
        reference = _data$offsets.reference,
        popper = _data$offsets.popper;

    var isVertical = ['bottom', 'top'].indexOf(basePlacement) !== -1;
    var side = isVertical ? 'left' : 'top';
    var measurement = isVertical ? 'width' : 'height';

    var shiftOffsets = {
      start: defineProperty({}, side, reference[side]),
      end: defineProperty({}, side, reference[side] + reference[measurement] - popper[measurement])
    };

    data.offsets.popper = _extends({}, popper, shiftOffsets[shiftvariation]);
  }

  return data;
}

/**
 * @function
 * @memberof Modifiers
 * @argument {Object} data - The data object generated by update method
 * @argument {Object} options - Modifiers configuration and options
 * @returns {Object} The data object, properly modified
 */
function hide(data) {
  if (!isModifierRequired(data.instance.modifiers, 'hide', 'preventOverflow')) {
    return data;
  }

  var refRect = data.offsets.reference;
  var bound = find(data.instance.modifiers, function (modifier) {
    return modifier.name === 'preventOverflow';
  }).boundaries;

  if (refRect.bottom < bound.top || refRect.left > bound.right || refRect.top > bound.bottom || refRect.right < bound.left) {
    // Avoid unnecessary DOM access if visibility hasn't changed
    if (data.hide === true) {
      return data;
    }

    data.hide = true;
    data.attributes['x-out-of-boundaries'] = '';
  } else {
    // Avoid unnecessary DOM access if visibility hasn't changed
    if (data.hide === false) {
      return data;
    }

    data.hide = false;
    data.attributes['x-out-of-boundaries'] = false;
  }

  return data;
}

/**
 * @function
 * @memberof Modifiers
 * @argument {Object} data - The data object generated by `update` method
 * @argument {Object} options - Modifiers configuration and options
 * @returns {Object} The data object, properly modified
 */
function inner(data) {
  var placement = data.placement;
  var basePlacement = placement.split('-')[0];
  var _data$offsets = data.offsets,
      popper = _data$offsets.popper,
      reference = _data$offsets.reference;

  var isHoriz = ['left', 'right'].indexOf(basePlacement) !== -1;

  var subtractLength = ['top', 'left'].indexOf(basePlacement) === -1;

  popper[isHoriz ? 'left' : 'top'] = reference[basePlacement] - (subtractLength ? popper[isHoriz ? 'width' : 'height'] : 0);

  data.placement = getOppositePlacement(placement);
  data.offsets.popper = getClientRect(popper);

  return data;
}

/**
 * Modifier function, each modifier can have a function of this type assigned
 * to its `fn` property.<br />
 * These functions will be called on each update, this means that you must
 * make sure they are performant enough to avoid performance bottlenecks.
 *
 * @function ModifierFn
 * @argument {dataObject} data - The data object generated by `update` method
 * @argument {Object} options - Modifiers configuration and options
 * @returns {dataObject} The data object, properly modified
 */

/**
 * Modifiers are plugins used to alter the behavior of your poppers.<br />
 * Popper.js uses a set of 9 modifiers to provide all the basic functionalities
 * needed by the library.
 *
 * Usually you don't want to override the `order`, `fn` and `onLoad` props.
 * All the other properties are configurations that could be tweaked.
 * @namespace modifiers
 */
var modifiers = {
  /**
   * Modifier used to shift the popper on the start or end of its reference
   * element.<br />
   * It will read the variation of the `placement` property.<br />
   * It can be one either `-end` or `-start`.
   * @memberof modifiers
   * @inner
   */
  shift: {
    /** @prop {number} order=100 - Index used to define the order of execution */
    order: 100,
    /** @prop {Boolean} enabled=true - Whether the modifier is enabled or not */
    enabled: true,
    /** @prop {ModifierFn} */
    fn: shift
  },

  /**
   * The `offset` modifier can shift your popper on both its axis.
   *
   * It accepts the following units:
   * - `px` or unit-less, interpreted as pixels
   * - `%` or `%r`, percentage relative to the length of the reference element
   * - `%p`, percentage relative to the length of the popper element
   * - `vw`, CSS viewport width unit
   * - `vh`, CSS viewport height unit
   *
   * For length is intended the main axis relative to the placement of the popper.<br />
   * This means that if the placement is `top` or `bottom`, the length will be the
   * `width`. In case of `left` or `right`, it will be the `height`.
   *
   * You can provide a single value (as `Number` or `String`), or a pair of values
   * as `String` divided by a comma or one (or more) white spaces.<br />
   * The latter is a deprecated method because it leads to confusion and will be
   * removed in v2.<br />
   * Additionally, it accepts additions and subtractions between different units.
   * Note that multiplications and divisions aren't supported.
   *
   * Valid examples are:
   * ```
   * 10
   * '10%'
   * '10, 10'
   * '10%, 10'
   * '10 + 10%'
   * '10 - 5vh + 3%'
   * '-10px + 5vh, 5px - 6%'
   * ```
   * > **NB**: If you desire to apply offsets to your poppers in a way that may make them overlap
   * > with their reference element, unfortunately, you will have to disable the `flip` modifier.
   * > You can read more on this at this [issue](https://github.com/FezVrasta/popper.js/issues/373).
   *
   * @memberof modifiers
   * @inner
   */
  offset: {
    /** @prop {number} order=200 - Index used to define the order of execution */
    order: 200,
    /** @prop {Boolean} enabled=true - Whether the modifier is enabled or not */
    enabled: true,
    /** @prop {ModifierFn} */
    fn: offset,
    /** @prop {Number|String} offset=0
     * The offset value as described in the modifier description
     */
    offset: 0
  },

  /**
   * Modifier used to prevent the popper from being positioned outside the boundary.
   *
   * A scenario exists where the reference itself is not within the boundaries.<br />
   * We can say it has "escaped the boundaries" — or just "escaped".<br />
   * In this case we need to decide whether the popper should either:
   *
   * - detach from the reference and remain "trapped" in the boundaries, or
   * - if it should ignore the boundary and "escape with its reference"
   *
   * When `escapeWithReference` is set to`true` and reference is completely
   * outside its boundaries, the popper will overflow (or completely leave)
   * the boundaries in order to remain attached to the edge of the reference.
   *
   * @memberof modifiers
   * @inner
   */
  preventOverflow: {
    /** @prop {number} order=300 - Index used to define the order of execution */
    order: 300,
    /** @prop {Boolean} enabled=true - Whether the modifier is enabled or not */
    enabled: true,
    /** @prop {ModifierFn} */
    fn: preventOverflow,
    /**
     * @prop {Array} [priority=['left','right','top','bottom']]
     * Popper will try to prevent overflow following these priorities by default,
     * then, it could overflow on the left and on top of the `boundariesElement`
     */
    priority: ['left', 'right', 'top', 'bottom'],
    /**
     * @prop {number} padding=5
     * Amount of pixel used to define a minimum distance between the boundaries
     * and the popper. This makes sure the popper always has a little padding
     * between the edges of its container
     */
    padding: 5,
    /**
     * @prop {String|HTMLElement} boundariesElement='scrollParent'
     * Boundaries used by the modifier. Can be `scrollParent`, `window`,
     * `viewport` or any DOM element.
     */
    boundariesElement: 'scrollParent'
  },

  /**
   * Modifier used to make sure the reference and its popper stay near each other
   * without leaving any gap between the two. Especially useful when the arrow is
   * enabled and you want to ensure that it points to its reference element.
   * It cares only about the first axis. You can still have poppers with margin
   * between the popper and its reference element.
   * @memberof modifiers
   * @inner
   */
  keepTogether: {
    /** @prop {number} order=400 - Index used to define the order of execution */
    order: 400,
    /** @prop {Boolean} enabled=true - Whether the modifier is enabled or not */
    enabled: true,
    /** @prop {ModifierFn} */
    fn: keepTogether
  },

  /**
   * This modifier is used to move the `arrowElement` of the popper to make
   * sure it is positioned between the reference element and its popper element.
   * It will read the outer size of the `arrowElement` node to detect how many
   * pixels of conjunction are needed.
   *
   * It has no effect if no `arrowElement` is provided.
   * @memberof modifiers
   * @inner
   */
  arrow: {
    /** @prop {number} order=500 - Index used to define the order of execution */
    order: 500,
    /** @prop {Boolean} enabled=true - Whether the modifier is enabled or not */
    enabled: true,
    /** @prop {ModifierFn} */
    fn: arrow,
    /** @prop {String|HTMLElement} element='[x-arrow]' - Selector or node used as arrow */
    element: '[x-arrow]'
  },

  /**
   * Modifier used to flip the popper's placement when it starts to overlap its
   * reference element.
   *
   * Requires the `preventOverflow` modifier before it in order to work.
   *
   * **NOTE:** this modifier will interrupt the current update cycle and will
   * restart it if it detects the need to flip the placement.
   * @memberof modifiers
   * @inner
   */
  flip: {
    /** @prop {number} order=600 - Index used to define the order of execution */
    order: 600,
    /** @prop {Boolean} enabled=true - Whether the modifier is enabled or not */
    enabled: true,
    /** @prop {ModifierFn} */
    fn: flip,
    /**
     * @prop {String|Array} behavior='flip'
     * The behavior used to change the popper's placement. It can be one of
     * `flip`, `clockwise`, `counterclockwise` or an array with a list of valid
     * placements (with optional variations)
     */
    behavior: 'flip',
    /**
     * @prop {number} padding=5
     * The popper will flip if it hits the edges of the `boundariesElement`
     */
    padding: 5,
    /**
     * @prop {String|HTMLElement} boundariesElement='viewport'
     * The element which will define the boundaries of the popper position.
     * The popper will never be placed outside of the defined boundaries
     * (except if `keepTogether` is enabled)
     */
    boundariesElement: 'viewport'
  },

  /**
   * Modifier used to make the popper flow toward the inner of the reference element.
   * By default, when this modifier is disabled, the popper will be placed outside
   * the reference element.
   * @memberof modifiers
   * @inner
   */
  inner: {
    /** @prop {number} order=700 - Index used to define the order of execution */
    order: 700,
    /** @prop {Boolean} enabled=false - Whether the modifier is enabled or not */
    enabled: false,
    /** @prop {ModifierFn} */
    fn: inner
  },

  /**
   * Modifier used to hide the popper when its reference element is outside of the
   * popper boundaries. It will set a `x-out-of-boundaries` attribute which can
   * be used to hide with a CSS selector the popper when its reference is
   * out of boundaries.
   *
   * Requires the `preventOverflow` modifier before it in order to work.
   * @memberof modifiers
   * @inner
   */
  hide: {
    /** @prop {number} order=800 - Index used to define the order of execution */
    order: 800,
    /** @prop {Boolean} enabled=true - Whether the modifier is enabled or not */
    enabled: true,
    /** @prop {ModifierFn} */
    fn: hide
  },

  /**
   * Computes the style that will be applied to the popper element to gets
   * properly positioned.
   *
   * Note that this modifier will not touch the DOM, it just prepares the styles
   * so that `applyStyle` modifier can apply it. This separation is useful
   * in case you need to replace `applyStyle` with a custom implementation.
   *
   * This modifier has `850` as `order` value to maintain backward compatibility
   * with previous versions of Popper.js. Expect the modifiers ordering method
   * to change in future major versions of the library.
   *
   * @memberof modifiers
   * @inner
   */
  computeStyle: {
    /** @prop {number} order=850 - Index used to define the order of execution */
    order: 850,
    /** @prop {Boolean} enabled=true - Whether the modifier is enabled or not */
    enabled: true,
    /** @prop {ModifierFn} */
    fn: computeStyle,
    /**
     * @prop {Boolean} gpuAcceleration=true
     * If true, it uses the CSS 3D transformation to position the popper.
     * Otherwise, it will use the `top` and `left` properties
     */
    gpuAcceleration: true,
    /**
     * @prop {string} [x='bottom']
     * Where to anchor the X axis (`bottom` or `top`). AKA X offset origin.
     * Change this if your popper should grow in a direction different from `bottom`
     */
    x: 'bottom',
    /**
     * @prop {string} [x='left']
     * Where to anchor the Y axis (`left` or `right`). AKA Y offset origin.
     * Change this if your popper should grow in a direction different from `right`
     */
    y: 'right'
  },

  /**
   * Applies the computed styles to the popper element.
   *
   * All the DOM manipulations are limited to this modifier. This is useful in case
   * you want to integrate Popper.js inside a framework or view library and you
   * want to delegate all the DOM manipulations to it.
   *
   * Note that if you disable this modifier, you must make sure the popper element
   * has its position set to `absolute` before Popper.js can do its work!
   *
   * Just disable this modifier and define your own to achieve the desired effect.
   *
   * @memberof modifiers
   * @inner
   */
  applyStyle: {
    /** @prop {number} order=900 - Index used to define the order of execution */
    order: 900,
    /** @prop {Boolean} enabled=true - Whether the modifier is enabled or not */
    enabled: true,
    /** @prop {ModifierFn} */
    fn: applyStyle,
    /** @prop {Function} */
    onLoad: applyStyleOnLoad,
    /**
     * @deprecated since version 1.10.0, the property moved to `computeStyle` modifier
     * @prop {Boolean} gpuAcceleration=true
     * If true, it uses the CSS 3D transformation to position the popper.
     * Otherwise, it will use the `top` and `left` properties
     */
    gpuAcceleration: undefined
  }
};

/**
 * The `dataObject` is an object containing all the information used by Popper.js.
 * This object is passed to modifiers and to the `onCreate` and `onUpdate` callbacks.
 * @name dataObject
 * @property {Object} data.instance The Popper.js instance
 * @property {String} data.placement Placement applied to popper
 * @property {String} data.originalPlacement Placement originally defined on init
 * @property {Boolean} data.flipped True if popper has been flipped by flip modifier
 * @property {Boolean} data.hide True if the reference element is out of boundaries, useful to know when to hide the popper
 * @property {HTMLElement} data.arrowElement Node used as arrow by arrow modifier
 * @property {Object} data.styles Any CSS property defined here will be applied to the popper. It expects the JavaScript nomenclature (eg. `marginBottom`)
 * @property {Object} data.arrowStyles Any CSS property defined here will be applied to the popper arrow. It expects the JavaScript nomenclature (eg. `marginBottom`)
 * @property {Object} data.boundaries Offsets of the popper boundaries
 * @property {Object} data.offsets The measurements of popper, reference and arrow elements
 * @property {Object} data.offsets.popper `top`, `left`, `width`, `height` values
 * @property {Object} data.offsets.reference `top`, `left`, `width`, `height` values
 * @property {Object} data.offsets.arrow] `top` and `left` offsets, only one of them will be different from 0
 */

/**
 * Default options provided to Popper.js constructor.<br />
 * These can be overridden using the `options` argument of Popper.js.<br />
 * To override an option, simply pass an object with the same
 * structure of the `options` object, as the 3rd argument. For example:
 * ```
 * new Popper(ref, pop, {
 *   modifiers: {
 *     preventOverflow: { enabled: false }
 *   }
 * })
 * ```
 * @type {Object}
 * @static
 * @memberof Popper
 */
var Defaults = {
  /**
   * Popper's placement.
   * @prop {Popper.placements} placement='bottom'
   */
  placement: 'bottom',

  /**
   * Set this to true if you want popper to position it self in 'fixed' mode
   * @prop {Boolean} positionFixed=false
   */
  positionFixed: false,

  /**
   * Whether events (resize, scroll) are initially enabled.
   * @prop {Boolean} eventsEnabled=true
   */
  eventsEnabled: true,

  /**
   * Set to true if you want to automatically remove the popper when
   * you call the `destroy` method.
   * @prop {Boolean} removeOnDestroy=false
   */
  removeOnDestroy: false,

  /**
   * Callback called when the popper is created.<br />
   * By default, it is set to no-op.<br />
   * Access Popper.js instance with `data.instance`.
   * @prop {onCreate}
   */
  onCreate: function onCreate() {},

  /**
   * Callback called when the popper is updated. This callback is not called
   * on the initialization/creation of the popper, but only on subsequent
   * updates.<br />
   * By default, it is set to no-op.<br />
   * Access Popper.js instance with `data.instance`.
   * @prop {onUpdate}
   */
  onUpdate: function onUpdate() {},

  /**
   * List of modifiers used to modify the offsets before they are applied to the popper.
   * They provide most of the functionalities of Popper.js.
   * @prop {modifiers}
   */
  modifiers: modifiers
};

/**
 * @callback onCreate
 * @param {dataObject} data
 */

/**
 * @callback onUpdate
 * @param {dataObject} data
 */

// Utils
// Methods
var Popper = function () {
  /**
   * Creates a new Popper.js instance.
   * @class Popper
   * @param {HTMLElement|referenceObject} reference - The reference element used to position the popper
   * @param {HTMLElement} popper - The HTML element used as the popper
   * @param {Object} options - Your custom options to override the ones defined in [Defaults](#defaults)
   * @return {Object} instance - The generated Popper.js instance
   */
  function Popper(reference, popper) {
    var _this = this;

    var options = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
    classCallCheck(this, Popper);

    this.scheduleUpdate = function () {
      return requestAnimationFrame(_this.update);
    };

    // make update() debounced, so that it only runs at most once-per-tick
    this.update = debounce(this.update.bind(this));

    // with {} we create a new object with the options inside it
    this.options = _extends({}, Popper.Defaults, options);

    // init state
    this.state = {
      isDestroyed: false,
      isCreated: false,
      scrollParents: []
    };

    // get reference and popper elements (allow jQuery wrappers)
    this.reference = reference && reference.jquery ? reference[0] : reference;
    this.popper = popper && popper.jquery ? popper[0] : popper;

    // Deep merge modifiers options
    this.options.modifiers = {};
    Object.keys(_extends({}, Popper.Defaults.modifiers, options.modifiers)).forEach(function (name) {
      _this.options.modifiers[name] = _extends({}, Popper.Defaults.modifiers[name] || {}, options.modifiers ? options.modifiers[name] : {});
    });

    // Refactoring modifiers' list (Object => Array)
    this.modifiers = Object.keys(this.options.modifiers).map(function (name) {
      return _extends({
        name: name
      }, _this.options.modifiers[name]);
    })
    // sort the modifiers by order
    .sort(function (a, b) {
      return a.order - b.order;
    });

    // modifiers have the ability to execute arbitrary code when Popper.js get inited
    // such code is executed in the same order of its modifier
    // they could add new properties to their options configuration
    // BE AWARE: don't add options to `options.modifiers.name` but to `modifierOptions`!
    this.modifiers.forEach(function (modifierOptions) {
      if (modifierOptions.enabled && isFunction(modifierOptions.onLoad)) {
        modifierOptions.onLoad(_this.reference, _this.popper, _this.options, modifierOptions, _this.state);
      }
    });

    // fire the first update to position the popper in the right place
    this.update();

    var eventsEnabled = this.options.eventsEnabled;
    if (eventsEnabled) {
      // setup event listeners, they will take care of update the position in specific situations
      this.enableEventListeners();
    }

    this.state.eventsEnabled = eventsEnabled;
  }

  // We can't use class properties because they don't get listed in the
  // class prototype and break stuff like Sinon stubs


  createClass(Popper, [{
    key: 'update',
    value: function update$$1() {
      return update.call(this);
    }
  }, {
    key: 'destroy',
    value: function destroy$$1() {
      return destroy.call(this);
    }
  }, {
    key: 'enableEventListeners',
    value: function enableEventListeners$$1() {
      return enableEventListeners.call(this);
    }
  }, {
    key: 'disableEventListeners',
    value: function disableEventListeners$$1() {
      return disableEventListeners.call(this);
    }

    /**
     * Schedules an update. It will run on the next UI update available.
     * @method scheduleUpdate
     * @memberof Popper
     */


    /**
     * Collection of utilities useful when writing custom modifiers.
     * Starting from version 1.7, this method is available only if you
     * include `popper-utils.js` before `popper.js`.
     *
     * **DEPRECATION**: This way to access PopperUtils is deprecated
     * and will be removed in v2! Use the PopperUtils module directly instead.
     * Due to the high instability of the methods contained in Utils, we can't
     * guarantee them to follow semver. Use them at your own risk!
     * @static
     * @private
     * @type {Object}
     * @deprecated since version 1.8
     * @member Utils
     * @memberof Popper
     */

  }]);
  return Popper;
}();

/**
 * The `referenceObject` is an object that provides an interface compatible with Popper.js
 * and lets you use it as replacement of a real DOM node.<br />
 * You can use this method to position a popper relatively to a set of coordinates
 * in case you don't have a DOM node to use as reference.
 *
 * ```
 * new Popper(referenceObject, popperNode);
 * ```
 *
 * NB: This feature isn't supported in Internet Explorer 10.
 * @name referenceObject
 * @property {Function} data.getBoundingClientRect
 * A function that returns a set of coordinates compatible with the native `getBoundingClientRect` method.
 * @property {number} data.clientWidth
 * An ES6 getter that will return the width of the virtual reference element.
 * @property {number} data.clientHeight
 * An ES6 getter that will return the height of the virtual reference element.
 */


Popper.Utils = (typeof window !== 'undefined' ? window : global).PopperUtils;
Popper.placements = placements;
Popper.Defaults = Defaults;

return Popper;

})));
//# sourceMappingURL=popper.js.map

/*!
  * Bootstrap v4.2.1 (https://getbootstrap.com/)
  * Copyright 2011-2018 The Bootstrap Authors (https://github.com/twbs/bootstrap/graphs/contributors)
  * Licensed under MIT (https://github.com/twbs/bootstrap/blob/master/LICENSE)
  */
(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('popper.js'), require('jquery')) :
  typeof define === 'function' && define.amd ? define(['exports', 'popper.js', 'jquery'], factory) :
  (factory((global.bootstrap = {}),global.Popper,global.jQuery));
}(this, (function (exports,Popper,$) { 'use strict';

  Popper = Popper && Popper.hasOwnProperty('default') ? Popper['default'] : Popper;
  $ = $ && $.hasOwnProperty('default') ? $['default'] : $;

  function _defineProperties(target, props) {
    for (var i = 0; i < props.length; i++) {
      var descriptor = props[i];
      descriptor.enumerable = descriptor.enumerable || false;
      descriptor.configurable = true;
      if ("value" in descriptor) descriptor.writable = true;
      Object.defineProperty(target, descriptor.key, descriptor);
    }
  }

  function _createClass(Constructor, protoProps, staticProps) {
    if (protoProps) _defineProperties(Constructor.prototype, protoProps);
    if (staticProps) _defineProperties(Constructor, staticProps);
    return Constructor;
  }

  function _defineProperty(obj, key, value) {
    if (key in obj) {
      Object.defineProperty(obj, key, {
        value: value,
        enumerable: true,
        configurable: true,
        writable: true
      });
    } else {
      obj[key] = value;
    }

    return obj;
  }

  function _objectSpread(target) {
    for (var i = 1; i < arguments.length; i++) {
      var source = arguments[i] != null ? arguments[i] : {};
      var ownKeys = Object.keys(source);

      if (typeof Object.getOwnPropertySymbols === 'function') {
        ownKeys = ownKeys.concat(Object.getOwnPropertySymbols(source).filter(function (sym) {
          return Object.getOwnPropertyDescriptor(source, sym).enumerable;
        }));
      }

      ownKeys.forEach(function (key) {
        _defineProperty(target, key, source[key]);
      });
    }

    return target;
  }

  function _inheritsLoose(subClass, superClass) {
    subClass.prototype = Object.create(superClass.prototype);
    subClass.prototype.constructor = subClass;
    subClass.__proto__ = superClass;
  }

  /**
   * --------------------------------------------------------------------------
   * Bootstrap (v4.2.1): util.js
   * Licensed under MIT (https://github.com/twbs/bootstrap/blob/master/LICENSE)
   * --------------------------------------------------------------------------
   */
  /**
   * ------------------------------------------------------------------------
   * Private TransitionEnd Helpers
   * ------------------------------------------------------------------------
   */

  var TRANSITION_END = 'transitionend';
  var MAX_UID = 1000000;
  var MILLISECONDS_MULTIPLIER = 1000; // Shoutout AngusCroll (https://goo.gl/pxwQGp)

  function toType(obj) {
    return {}.toString.call(obj).match(/\s([a-z]+)/i)[1].toLowerCase();
  }

  function getSpecialTransitionEndEvent() {
    return {
      bindType: TRANSITION_END,
      delegateType: TRANSITION_END,
      handle: function handle(event) {
        if ($(event.target).is(this)) {
          return event.handleObj.handler.apply(this, arguments); // eslint-disable-line prefer-rest-params
        }

        return undefined; // eslint-disable-line no-undefined
      }
    };
  }

  function transitionEndEmulator(duration) {
    var _this = this;

    var called = false;
    $(this).one(Util.TRANSITION_END, function () {
      called = true;
    });
    setTimeout(function () {
      if (!called) {
        Util.triggerTransitionEnd(_this);
      }
    }, duration);
    return this;
  }

  function setTransitionEndSupport() {
    $.fn.emulateTransitionEnd = transitionEndEmulator;
    $.event.special[Util.TRANSITION_END] = getSpecialTransitionEndEvent();
  }
  /**
   * --------------------------------------------------------------------------
   * Public Util Api
   * --------------------------------------------------------------------------
   */


  var Util = {
    TRANSITION_END: 'bsTransitionEnd',
    getUID: function getUID(prefix) {
      do {
        // eslint-disable-next-line no-bitwise
        prefix += ~~(Math.random() * MAX_UID); // "~~" acts like a faster Math.floor() here
      } while (document.getElementById(prefix));

      return prefix;
    },
    getSelectorFromElement: function getSelectorFromElement(element) {
      var selector = element.getAttribute('data-target');

      if (!selector || selector === '#') {
        var hrefAttr = element.getAttribute('href');
        selector = hrefAttr && hrefAttr !== '#' ? hrefAttr.trim() : '';
      }

      return selector && document.querySelector(selector) ? selector : null;
    },
    getTransitionDurationFromElement: function getTransitionDurationFromElement(element) {
      if (!element) {
        return 0;
      } // Get transition-duration of the element


      var transitionDuration = $(element).css('transition-duration');
      var transitionDelay = $(element).css('transition-delay');
      var floatTransitionDuration = parseFloat(transitionDuration);
      var floatTransitionDelay = parseFloat(transitionDelay); // Return 0 if element or transition duration is not found

      if (!floatTransitionDuration && !floatTransitionDelay) {
        return 0;
      } // If multiple durations are defined, take the first


      transitionDuration = transitionDuration.split(',')[0];
      transitionDelay = transitionDelay.split(',')[0];
      return (parseFloat(transitionDuration) + parseFloat(transitionDelay)) * MILLISECONDS_MULTIPLIER;
    },
    reflow: function reflow(element) {
      return element.offsetHeight;
    },
    triggerTransitionEnd: function triggerTransitionEnd(element) {
      $(element).trigger(TRANSITION_END);
    },
    // TODO: Remove in v5
    supportsTransitionEnd: function supportsTransitionEnd() {
      return Boolean(TRANSITION_END);
    },
    isElement: function isElement(obj) {
      return (obj[0] || obj).nodeType;
    },
    typeCheckConfig: function typeCheckConfig(componentName, config, configTypes) {
      for (var property in configTypes) {
        if (Object.prototype.hasOwnProperty.call(configTypes, property)) {
          var expectedTypes = configTypes[property];
          var value = config[property];
          var valueType = value && Util.isElement(value) ? 'element' : toType(value);

          if (!new RegExp(expectedTypes).test(valueType)) {
            throw new Error(componentName.toUpperCase() + ": " + ("Option \"" + property + "\" provided type \"" + valueType + "\" ") + ("but expected type \"" + expectedTypes + "\"."));
          }
        }
      }
    },
    findShadowRoot: function findShadowRoot(element) {
      if (!document.documentElement.attachShadow) {
        return null;
      } // Can find the shadow root otherwise it'll return the document


      if (typeof element.getRootNode === 'function') {
        var root = element.getRootNode();
        return root instanceof ShadowRoot ? root : null;
      }

      if (element instanceof ShadowRoot) {
        return element;
      } // when we don't find a shadow root


      if (!element.parentNode) {
        return null;
      }

      return Util.findShadowRoot(element.parentNode);
    }
  };
  setTransitionEndSupport();

  /**
   * ------------------------------------------------------------------------
   * Constants
   * ------------------------------------------------------------------------
   */

  var NAME = 'alert';
  var VERSION = '4.2.1';
  var DATA_KEY = 'bs.alert';
  var EVENT_KEY = "." + DATA_KEY;
  var DATA_API_KEY = '.data-api';
  var JQUERY_NO_CONFLICT = $.fn[NAME];
  var Selector = {
    DISMISS: '[data-dismiss="alert"]'
  };
  var Event = {
    CLOSE: "close" + EVENT_KEY,
    CLOSED: "closed" + EVENT_KEY,
    CLICK_DATA_API: "click" + EVENT_KEY + DATA_API_KEY
  };
  var ClassName = {
    ALERT: 'alert',
    FADE: 'fade',
    SHOW: 'show'
    /**
     * ------------------------------------------------------------------------
     * Class Definition
     * ------------------------------------------------------------------------
     */

  };

  var Alert =
  /*#__PURE__*/
  function () {
    function Alert(element) {
      this._element = element;
    } // Getters


    var _proto = Alert.prototype;

    // Public
    _proto.close = function close(element) {
      var rootElement = this._element;

      if (element) {
        rootElement = this._getRootElement(element);
      }

      var customEvent = this._triggerCloseEvent(rootElement);

      if (customEvent.isDefaultPrevented()) {
        return;
      }

      this._removeElement(rootElement);
    };

    _proto.dispose = function dispose() {
      $.removeData(this._element, DATA_KEY);
      this._element = null;
    }; // Private


    _proto._getRootElement = function _getRootElement(element) {
      var selector = Util.getSelectorFromElement(element);
      var parent = false;

      if (selector) {
        parent = document.querySelector(selector);
      }

      if (!parent) {
        parent = $(element).closest("." + ClassName.ALERT)[0];
      }

      return parent;
    };

    _proto._triggerCloseEvent = function _triggerCloseEvent(element) {
      var closeEvent = $.Event(Event.CLOSE);
      $(element).trigger(closeEvent);
      return closeEvent;
    };

    _proto._removeElement = function _removeElement(element) {
      var _this = this;

      $(element).removeClass(ClassName.SHOW);

      if (!$(element).hasClass(ClassName.FADE)) {
        this._destroyElement(element);

        return;
      }

      var transitionDuration = Util.getTransitionDurationFromElement(element);
      $(element).one(Util.TRANSITION_END, function (event) {
        return _this._destroyElement(element, event);
      }).emulateTransitionEnd(transitionDuration);
    };

    _proto._destroyElement = function _destroyElement(element) {
      $(element).detach().trigger(Event.CLOSED).remove();
    }; // Static


    Alert._jQueryInterface = function _jQueryInterface(config) {
      return this.each(function () {
        var $element = $(this);
        var data = $element.data(DATA_KEY);

        if (!data) {
          data = new Alert(this);
          $element.data(DATA_KEY, data);
        }

        if (config === 'close') {
          data[config](this);
        }
      });
    };

    Alert._handleDismiss = function _handleDismiss(alertInstance) {
      return function (event) {
        if (event) {
          event.preventDefault();
        }

        alertInstance.close(this);
      };
    };

    _createClass(Alert, null, [{
      key: "VERSION",
      get: function get() {
        return VERSION;
      }
    }]);

    return Alert;
  }();
  /**
   * ------------------------------------------------------------------------
   * Data Api implementation
   * ------------------------------------------------------------------------
   */


  $(document).on(Event.CLICK_DATA_API, Selector.DISMISS, Alert._handleDismiss(new Alert()));
  /**
   * ------------------------------------------------------------------------
   * jQuery
   * ------------------------------------------------------------------------
   */

  $.fn[NAME] = Alert._jQueryInterface;
  $.fn[NAME].Constructor = Alert;

  $.fn[NAME].noConflict = function () {
    $.fn[NAME] = JQUERY_NO_CONFLICT;
    return Alert._jQueryInterface;
  };

  /**
   * ------------------------------------------------------------------------
   * Constants
   * ------------------------------------------------------------------------
   */

  var NAME$1 = 'button';
  var VERSION$1 = '4.2.1';
  var DATA_KEY$1 = 'bs.button';
  var EVENT_KEY$1 = "." + DATA_KEY$1;
  var DATA_API_KEY$1 = '.data-api';
  var JQUERY_NO_CONFLICT$1 = $.fn[NAME$1];
  var ClassName$1 = {
    ACTIVE: 'active',
    BUTTON: 'btn',
    FOCUS: 'focus'
  };
  var Selector$1 = {
    DATA_TOGGLE_CARROT: '[data-toggle^="button"]',
    DATA_TOGGLE: '[data-toggle="buttons"]',
    INPUT: 'input:not([type="hidden"])',
    ACTIVE: '.active',
    BUTTON: '.btn'
  };
  var Event$1 = {
    CLICK_DATA_API: "click" + EVENT_KEY$1 + DATA_API_KEY$1,
    FOCUS_BLUR_DATA_API: "focus" + EVENT_KEY$1 + DATA_API_KEY$1 + " " + ("blur" + EVENT_KEY$1 + DATA_API_KEY$1)
    /**
     * ------------------------------------------------------------------------
     * Class Definition
     * ------------------------------------------------------------------------
     */

  };

  var Button =
  /*#__PURE__*/
  function () {
    function Button(element) {
      this._element = element;
    } // Getters


    var _proto = Button.prototype;

    // Public
    _proto.toggle = function toggle() {
      var triggerChangeEvent = true;
      var addAriaPressed = true;
      var rootElement = $(this._element).closest(Selector$1.DATA_TOGGLE)[0];

      if (rootElement) {
        var input = this._element.querySelector(Selector$1.INPUT);

        if (input) {
          if (input.type === 'radio') {
            if (input.checked && this._element.classList.contains(ClassName$1.ACTIVE)) {
              triggerChangeEvent = false;
            } else {
              var activeElement = rootElement.querySelector(Selector$1.ACTIVE);

              if (activeElement) {
                $(activeElement).removeClass(ClassName$1.ACTIVE);
              }
            }
          }

          if (triggerChangeEvent) {
            if (input.hasAttribute('disabled') || rootElement.hasAttribute('disabled') || input.classList.contains('disabled') || rootElement.classList.contains('disabled')) {
              return;
            }

            input.checked = !this._element.classList.contains(ClassName$1.ACTIVE);
            $(input).trigger('change');
          }

          input.focus();
          addAriaPressed = false;
        }
      }

      if (addAriaPressed) {
        this._element.setAttribute('aria-pressed', !this._element.classList.contains(ClassName$1.ACTIVE));
      }

      if (triggerChangeEvent) {
        $(this._element).toggleClass(ClassName$1.ACTIVE);
      }
    };

    _proto.dispose = function dispose() {
      $.removeData(this._element, DATA_KEY$1);
      this._element = null;
    }; // Static


    Button._jQueryInterface = function _jQueryInterface(config) {
      return this.each(function () {
        var data = $(this).data(DATA_KEY$1);

        if (!data) {
          data = new Button(this);
          $(this).data(DATA_KEY$1, data);
        }

        if (config === 'toggle') {
          data[config]();
        }
      });
    };

    _createClass(Button, null, [{
      key: "VERSION",
      get: function get() {
        return VERSION$1;
      }
    }]);

    return Button;
  }();
  /**
   * ------------------------------------------------------------------------
   * Data Api implementation
   * ------------------------------------------------------------------------
   */


  $(document).on(Event$1.CLICK_DATA_API, Selector$1.DATA_TOGGLE_CARROT, function (event) {
    event.preventDefault();
    var button = event.target;

    if (!$(button).hasClass(ClassName$1.BUTTON)) {
      button = $(button).closest(Selector$1.BUTTON);
    }

    Button._jQueryInterface.call($(button), 'toggle');
  }).on(Event$1.FOCUS_BLUR_DATA_API, Selector$1.DATA_TOGGLE_CARROT, function (event) {
    var button = $(event.target).closest(Selector$1.BUTTON)[0];
    $(button).toggleClass(ClassName$1.FOCUS, /^focus(in)?$/.test(event.type));
  });
  /**
   * ------------------------------------------------------------------------
   * jQuery
   * ------------------------------------------------------------------------
   */

  $.fn[NAME$1] = Button._jQueryInterface;
  $.fn[NAME$1].Constructor = Button;

  $.fn[NAME$1].noConflict = function () {
    $.fn[NAME$1] = JQUERY_NO_CONFLICT$1;
    return Button._jQueryInterface;
  };

  /**
   * ------------------------------------------------------------------------
   * Constants
   * ------------------------------------------------------------------------
   */

  var NAME$2 = 'carousel';
  var VERSION$2 = '4.2.1';
  var DATA_KEY$2 = 'bs.carousel';
  var EVENT_KEY$2 = "." + DATA_KEY$2;
  var DATA_API_KEY$2 = '.data-api';
  var JQUERY_NO_CONFLICT$2 = $.fn[NAME$2];
  var ARROW_LEFT_KEYCODE = 37; // KeyboardEvent.which value for left arrow key

  var ARROW_RIGHT_KEYCODE = 39; // KeyboardEvent.which value for right arrow key

  var TOUCHEVENT_COMPAT_WAIT = 500; // Time for mouse compat events to fire after touch

  var SWIPE_THRESHOLD = 40;
  var Default = {
    interval: 5000,
    keyboard: true,
    slide: false,
    pause: 'hover',
    wrap: true,
    touch: true
  };
  var DefaultType = {
    interval: '(number|boolean)',
    keyboard: 'boolean',
    slide: '(boolean|string)',
    pause: '(string|boolean)',
    wrap: 'boolean',
    touch: 'boolean'
  };
  var Direction = {
    NEXT: 'next',
    PREV: 'prev',
    LEFT: 'left',
    RIGHT: 'right'
  };
  var Event$2 = {
    SLIDE: "slide" + EVENT_KEY$2,
    SLID: "slid" + EVENT_KEY$2,
    KEYDOWN: "keydown" + EVENT_KEY$2,
    MOUSEENTER: "mouseenter" + EVENT_KEY$2,
    MOUSELEAVE: "mouseleave" + EVENT_KEY$2,
    TOUCHSTART: "touchstart" + EVENT_KEY$2,
    TOUCHMOVE: "touchmove" + EVENT_KEY$2,
    TOUCHEND: "touchend" + EVENT_KEY$2,
    POINTERDOWN: "pointerdown" + EVENT_KEY$2,
    POINTERUP: "pointerup" + EVENT_KEY$2,
    DRAG_START: "dragstart" + EVENT_KEY$2,
    LOAD_DATA_API: "load" + EVENT_KEY$2 + DATA_API_KEY$2,
    CLICK_DATA_API: "click" + EVENT_KEY$2 + DATA_API_KEY$2
  };
  var ClassName$2 = {
    CAROUSEL: 'carousel',
    ACTIVE: 'active',
    SLIDE: 'slide',
    RIGHT: 'carousel-item-right',
    LEFT: 'carousel-item-left',
    NEXT: 'carousel-item-next',
    PREV: 'carousel-item-prev',
    ITEM: 'carousel-item',
    POINTER_EVENT: 'pointer-event'
  };
  var Selector$2 = {
    ACTIVE: '.active',
    ACTIVE_ITEM: '.active.carousel-item',
    ITEM: '.carousel-item',
    ITEM_IMG: '.carousel-item img',
    NEXT_PREV: '.carousel-item-next, .carousel-item-prev',
    INDICATORS: '.carousel-indicators',
    DATA_SLIDE: '[data-slide], [data-slide-to]',
    DATA_RIDE: '[data-ride="carousel"]'
  };
  var PointerType = {
    TOUCH: 'touch',
    PEN: 'pen'
    /**
     * ------------------------------------------------------------------------
     * Class Definition
     * ------------------------------------------------------------------------
     */

  };

  var Carousel =
  /*#__PURE__*/
  function () {
    function Carousel(element, config) {
      this._items = null;
      this._interval = null;
      this._activeElement = null;
      this._isPaused = false;
      this._isSliding = false;
      this.touchTimeout = null;
      this.touchStartX = 0;
      this.touchDeltaX = 0;
      this._config = this._getConfig(config);
      this._element = element;
      this._indicatorsElement = this._element.querySelector(Selector$2.INDICATORS);
      this._touchSupported = 'ontouchstart' in document.documentElement || navigator.maxTouchPoints > 0;
      this._pointerEvent = Boolean(window.PointerEvent || window.MSPointerEvent);

      this._addEventListeners();
    } // Getters


    var _proto = Carousel.prototype;

    // Public
    _proto.next = function next() {
      if (!this._isSliding) {
        this._slide(Direction.NEXT);
      }
    };

    _proto.nextWhenVisible = function nextWhenVisible() {
      // Don't call next when the page isn't visible
      // or the carousel or its parent isn't visible
      if (!document.hidden && $(this._element).is(':visible') && $(this._element).css('visibility') !== 'hidden') {
        this.next();
      }
    };

    _proto.prev = function prev() {
      if (!this._isSliding) {
        this._slide(Direction.PREV);
      }
    };

    _proto.pause = function pause(event) {
      if (!event) {
        this._isPaused = true;
      }

      if (this._element.querySelector(Selector$2.NEXT_PREV)) {
        Util.triggerTransitionEnd(this._element);
        this.cycle(true);
      }

      clearInterval(this._interval);
      this._interval = null;
    };

    _proto.cycle = function cycle(event) {
      if (!event) {
        this._isPaused = false;
      }

      if (this._interval) {
        clearInterval(this._interval);
        this._interval = null;
      }

      if (this._config.interval && !this._isPaused) {
        this._interval = setInterval((document.visibilityState ? this.nextWhenVisible : this.next).bind(this), this._config.interval);
      }
    };

    _proto.to = function to(index) {
      var _this = this;

      this._activeElement = this._element.querySelector(Selector$2.ACTIVE_ITEM);

      var activeIndex = this._getItemIndex(this._activeElement);

      if (index > this._items.length - 1 || index < 0) {
        return;
      }

      if (this._isSliding) {
        $(this._element).one(Event$2.SLID, function () {
          return _this.to(index);
        });
        return;
      }

      if (activeIndex === index) {
        this.pause();
        this.cycle();
        return;
      }

      var direction = index > activeIndex ? Direction.NEXT : Direction.PREV;

      this._slide(direction, this._items[index]);
    };

    _proto.dispose = function dispose() {
      $(this._element).off(EVENT_KEY$2);
      $.removeData(this._element, DATA_KEY$2);
      this._items = null;
      this._config = null;
      this._element = null;
      this._interval = null;
      this._isPaused = null;
      this._isSliding = null;
      this._activeElement = null;
      this._indicatorsElement = null;
    }; // Private


    _proto._getConfig = function _getConfig(config) {
      config = _objectSpread({}, Default, config);
      Util.typeCheckConfig(NAME$2, config, DefaultType);
      return config;
    };

    _proto._handleSwipe = function _handleSwipe() {
      var absDeltax = Math.abs(this.touchDeltaX);

      if (absDeltax <= SWIPE_THRESHOLD) {
        return;
      }

      var direction = absDeltax / this.touchDeltaX; // swipe left

      if (direction > 0) {
        this.prev();
      } // swipe right


      if (direction < 0) {
        this.next();
      }
    };

    _proto._addEventListeners = function _addEventListeners() {
      var _this2 = this;

      if (this._config.keyboard) {
        $(this._element).on(Event$2.KEYDOWN, function (event) {
          return _this2._keydown(event);
        });
      }

      if (this._config.pause === 'hover') {
        $(this._element).on(Event$2.MOUSEENTER, function (event) {
          return _this2.pause(event);
        }).on(Event$2.MOUSELEAVE, function (event) {
          return _this2.cycle(event);
        });
      }

      this._addTouchEventListeners();
    };

    _proto._addTouchEventListeners = function _addTouchEventListeners() {
      var _this3 = this;

      if (!this._touchSupported) {
        return;
      }

      var start = function start(event) {
        if (_this3._pointerEvent && PointerType[event.originalEvent.pointerType.toUpperCase()]) {
          _this3.touchStartX = event.originalEvent.clientX;
        } else if (!_this3._pointerEvent) {
          _this3.touchStartX = event.originalEvent.touches[0].clientX;
        }
      };

      var move = function move(event) {
        // ensure swiping with one touch and not pinching
        if (event.originalEvent.touches && event.originalEvent.touches.length > 1) {
          _this3.touchDeltaX = 0;
        } else {
          _this3.touchDeltaX = event.originalEvent.touches[0].clientX - _this3.touchStartX;
        }
      };

      var end = function end(event) {
        if (_this3._pointerEvent && PointerType[event.originalEvent.pointerType.toUpperCase()]) {
          _this3.touchDeltaX = event.originalEvent.clientX - _this3.touchStartX;
        }

        _this3._handleSwipe();

        if (_this3._config.pause === 'hover') {
          // If it's a touch-enabled device, mouseenter/leave are fired as
          // part of the mouse compatibility events on first tap - the carousel
          // would stop cycling until user tapped out of it;
          // here, we listen for touchend, explicitly pause the carousel
          // (as if it's the second time we tap on it, mouseenter compat event
          // is NOT fired) and after a timeout (to allow for mouse compatibility
          // events to fire) we explicitly restart cycling
          _this3.pause();

          if (_this3.touchTimeout) {
            clearTimeout(_this3.touchTimeout);
          }

          _this3.touchTimeout = setTimeout(function (event) {
            return _this3.cycle(event);
          }, TOUCHEVENT_COMPAT_WAIT + _this3._config.interval);
        }
      };

      $(this._element.querySelectorAll(Selector$2.ITEM_IMG)).on(Event$2.DRAG_START, function (e) {
        return e.preventDefault();
      });

      if (this._pointerEvent) {
        $(this._element).on(Event$2.POINTERDOWN, function (event) {
          return start(event);
        });
        $(this._element).on(Event$2.POINTERUP, function (event) {
          return end(event);
        });

        this._element.classList.add(ClassName$2.POINTER_EVENT);
      } else {
        $(this._element).on(Event$2.TOUCHSTART, function (event) {
          return start(event);
        });
        $(this._element).on(Event$2.TOUCHMOVE, function (event) {
          return move(event);
        });
        $(this._element).on(Event$2.TOUCHEND, function (event) {
          return end(event);
        });
      }
    };

    _proto._keydown = function _keydown(event) {
      if (/input|textarea/i.test(event.target.tagName)) {
        return;
      }

      switch (event.which) {
        case ARROW_LEFT_KEYCODE:
          event.preventDefault();
          this.prev();
          break;

        case ARROW_RIGHT_KEYCODE:
          event.preventDefault();
          this.next();
          break;

        default:
      }
    };

    _proto._getItemIndex = function _getItemIndex(element) {
      this._items = element && element.parentNode ? [].slice.call(element.parentNode.querySelectorAll(Selector$2.ITEM)) : [];
      return this._items.indexOf(element);
    };

    _proto._getItemByDirection = function _getItemByDirection(direction, activeElement) {
      var isNextDirection = direction === Direction.NEXT;
      var isPrevDirection = direction === Direction.PREV;

      var activeIndex = this._getItemIndex(activeElement);

      var lastItemIndex = this._items.length - 1;
      var isGoingToWrap = isPrevDirection && activeIndex === 0 || isNextDirection && activeIndex === lastItemIndex;

      if (isGoingToWrap && !this._config.wrap) {
        return activeElement;
      }

      var delta = direction === Direction.PREV ? -1 : 1;
      var itemIndex = (activeIndex + delta) % this._items.length;
      return itemIndex === -1 ? this._items[this._items.length - 1] : this._items[itemIndex];
    };

    _proto._triggerSlideEvent = function _triggerSlideEvent(relatedTarget, eventDirectionName) {
      var targetIndex = this._getItemIndex(relatedTarget);

      var fromIndex = this._getItemIndex(this._element.querySelector(Selector$2.ACTIVE_ITEM));

      var slideEvent = $.Event(Event$2.SLIDE, {
        relatedTarget: relatedTarget,
        direction: eventDirectionName,
        from: fromIndex,
        to: targetIndex
      });
      $(this._element).trigger(slideEvent);
      return slideEvent;
    };

    _proto._setActiveIndicatorElement = function _setActiveIndicatorElement(element) {
      if (this._indicatorsElement) {
        var indicators = [].slice.call(this._indicatorsElement.querySelectorAll(Selector$2.ACTIVE));
        $(indicators).removeClass(ClassName$2.ACTIVE);

        var nextIndicator = this._indicatorsElement.children[this._getItemIndex(element)];

        if (nextIndicator) {
          $(nextIndicator).addClass(ClassName$2.ACTIVE);
        }
      }
    };

    _proto._slide = function _slide(direction, element) {
      var _this4 = this;

      var activeElement = this._element.querySelector(Selector$2.ACTIVE_ITEM);

      var activeElementIndex = this._getItemIndex(activeElement);

      var nextElement = element || activeElement && this._getItemByDirection(direction, activeElement);

      var nextElementIndex = this._getItemIndex(nextElement);

      var isCycling = Boolean(this._interval);
      var directionalClassName;
      var orderClassName;
      var eventDirectionName;

      if (direction === Direction.NEXT) {
        directionalClassName = ClassName$2.LEFT;
        orderClassName = ClassName$2.NEXT;
        eventDirectionName = Direction.LEFT;
      } else {
        directionalClassName = ClassName$2.RIGHT;
        orderClassName = ClassName$2.PREV;
        eventDirectionName = Direction.RIGHT;
      }

      if (nextElement && $(nextElement).hasClass(ClassName$2.ACTIVE)) {
        this._isSliding = false;
        return;
      }

      var slideEvent = this._triggerSlideEvent(nextElement, eventDirectionName);

      if (slideEvent.isDefaultPrevented()) {
        return;
      }

      if (!activeElement || !nextElement) {
        // Some weirdness is happening, so we bail
        return;
      }

      this._isSliding = true;

      if (isCycling) {
        this.pause();
      }

      this._setActiveIndicatorElement(nextElement);

      var slidEvent = $.Event(Event$2.SLID, {
        relatedTarget: nextElement,
        direction: eventDirectionName,
        from: activeElementIndex,
        to: nextElementIndex
      });

      if ($(this._element).hasClass(ClassName$2.SLIDE)) {
        $(nextElement).addClass(orderClassName);
        Util.reflow(nextElement);
        $(activeElement).addClass(directionalClassName);
        $(nextElement).addClass(directionalClassName);
        var nextElementInterval = parseInt(nextElement.getAttribute('data-interval'), 10);

        if (nextElementInterval) {
          this._config.defaultInterval = this._config.defaultInterval || this._config.interval;
          this._config.interval = nextElementInterval;
        } else {
          this._config.interval = this._config.defaultInterval || this._config.interval;
        }

        var transitionDuration = Util.getTransitionDurationFromElement(activeElement);
        $(activeElement).one(Util.TRANSITION_END, function () {
          $(nextElement).removeClass(directionalClassName + " " + orderClassName).addClass(ClassName$2.ACTIVE);
          $(activeElement).removeClass(ClassName$2.ACTIVE + " " + orderClassName + " " + directionalClassName);
          _this4._isSliding = false;
          setTimeout(function () {
            return $(_this4._element).trigger(slidEvent);
          }, 0);
        }).emulateTransitionEnd(transitionDuration);
      } else {
        $(activeElement).removeClass(ClassName$2.ACTIVE);
        $(nextElement).addClass(ClassName$2.ACTIVE);
        this._isSliding = false;
        $(this._element).trigger(slidEvent);
      }

      if (isCycling) {
        this.cycle();
      }
    }; // Static


    Carousel._jQueryInterface = function _jQueryInterface(config) {
      return this.each(function () {
        var data = $(this).data(DATA_KEY$2);

        var _config = _objectSpread({}, Default, $(this).data());

        if (typeof config === 'object') {
          _config = _objectSpread({}, _config, config);
        }

        var action = typeof config === 'string' ? config : _config.slide;

        if (!data) {
          data = new Carousel(this, _config);
          $(this).data(DATA_KEY$2, data);
        }

        if (typeof config === 'number') {
          data.to(config);
        } else if (typeof action === 'string') {
          if (typeof data[action] === 'undefined') {
            throw new TypeError("No method named \"" + action + "\"");
          }

          data[action]();
        } else if (_config.interval) {
          data.pause();
          data.cycle();
        }
      });
    };

    Carousel._dataApiClickHandler = function _dataApiClickHandler(event) {
      var selector = Util.getSelectorFromElement(this);

      if (!selector) {
        return;
      }

      var target = $(selector)[0];

      if (!target || !$(target).hasClass(ClassName$2.CAROUSEL)) {
        return;
      }

      var config = _objectSpread({}, $(target).data(), $(this).data());

      var slideIndex = this.getAttribute('data-slide-to');

      if (slideIndex) {
        config.interval = false;
      }

      Carousel._jQueryInterface.call($(target), config);

      if (slideIndex) {
        $(target).data(DATA_KEY$2).to(slideIndex);
      }

      event.preventDefault();
    };

    _createClass(Carousel, null, [{
      key: "VERSION",
      get: function get() {
        return VERSION$2;
      }
    }, {
      key: "Default",
      get: function get() {
        return Default;
      }
    }]);

    return Carousel;
  }();
  /**
   * ------------------------------------------------------------------------
   * Data Api implementation
   * ------------------------------------------------------------------------
   */


  $(document).on(Event$2.CLICK_DATA_API, Selector$2.DATA_SLIDE, Carousel._dataApiClickHandler);
  $(window).on(Event$2.LOAD_DATA_API, function () {
    var carousels = [].slice.call(document.querySelectorAll(Selector$2.DATA_RIDE));

    for (var i = 0, len = carousels.length; i < len; i++) {
      var $carousel = $(carousels[i]);

      Carousel._jQueryInterface.call($carousel, $carousel.data());
    }
  });
  /**
   * ------------------------------------------------------------------------
   * jQuery
   * ------------------------------------------------------------------------
   */

  $.fn[NAME$2] = Carousel._jQueryInterface;
  $.fn[NAME$2].Constructor = Carousel;

  $.fn[NAME$2].noConflict = function () {
    $.fn[NAME$2] = JQUERY_NO_CONFLICT$2;
    return Carousel._jQueryInterface;
  };

  /**
   * ------------------------------------------------------------------------
   * Constants
   * ------------------------------------------------------------------------
   */

  var NAME$3 = 'collapse';
  var VERSION$3 = '4.2.1';
  var DATA_KEY$3 = 'bs.collapse';
  var EVENT_KEY$3 = "." + DATA_KEY$3;
  var DATA_API_KEY$3 = '.data-api';
  var JQUERY_NO_CONFLICT$3 = $.fn[NAME$3];
  var Default$1 = {
    toggle: true,
    parent: ''
  };
  var DefaultType$1 = {
    toggle: 'boolean',
    parent: '(string|element)'
  };
  var Event$3 = {
    SHOW: "show" + EVENT_KEY$3,
    SHOWN: "shown" + EVENT_KEY$3,
    HIDE: "hide" + EVENT_KEY$3,
    HIDDEN: "hidden" + EVENT_KEY$3,
    CLICK_DATA_API: "click" + EVENT_KEY$3 + DATA_API_KEY$3
  };
  var ClassName$3 = {
    SHOW: 'show',
    COLLAPSE: 'collapse',
    COLLAPSING: 'collapsing',
    COLLAPSED: 'collapsed'
  };
  var Dimension = {
    WIDTH: 'width',
    HEIGHT: 'height'
  };
  var Selector$3 = {
    ACTIVES: '.show, .collapsing',
    DATA_TOGGLE: '[data-toggle="collapse"]'
    /**
     * ------------------------------------------------------------------------
     * Class Definition
     * ------------------------------------------------------------------------
     */

  };

  var Collapse =
  /*#__PURE__*/
  function () {
    function Collapse(element, config) {
      this._isTransitioning = false;
      this._element = element;
      this._config = this._getConfig(config);
      this._triggerArray = [].slice.call(document.querySelectorAll("[data-toggle=\"collapse\"][href=\"#" + element.id + "\"]," + ("[data-toggle=\"collapse\"][data-target=\"#" + element.id + "\"]")));
      var toggleList = [].slice.call(document.querySelectorAll(Selector$3.DATA_TOGGLE));

      for (var i = 0, len = toggleList.length; i < len; i++) {
        var elem = toggleList[i];
        var selector = Util.getSelectorFromElement(elem);
        var filterElement = [].slice.call(document.querySelectorAll(selector)).filter(function (foundElem) {
          return foundElem === element;
        });

        if (selector !== null && filterElement.length > 0) {
          this._selector = selector;

          this._triggerArray.push(elem);
        }
      }

      this._parent = this._config.parent ? this._getParent() : null;

      if (!this._config.parent) {
        this._addAriaAndCollapsedClass(this._element, this._triggerArray);
      }

      if (this._config.toggle) {
        this.toggle();
      }
    } // Getters


    var _proto = Collapse.prototype;

    // Public
    _proto.toggle = function toggle() {
      if ($(this._element).hasClass(ClassName$3.SHOW)) {
        this.hide();
      } else {
        this.show();
      }
    };

    _proto.show = function show() {
      var _this = this;

      if (this._isTransitioning || $(this._element).hasClass(ClassName$3.SHOW)) {
        return;
      }

      var actives;
      var activesData;

      if (this._parent) {
        actives = [].slice.call(this._parent.querySelectorAll(Selector$3.ACTIVES)).filter(function (elem) {
          if (typeof _this._config.parent === 'string') {
            return elem.getAttribute('data-parent') === _this._config.parent;
          }

          return elem.classList.contains(ClassName$3.COLLAPSE);
        });

        if (actives.length === 0) {
          actives = null;
        }
      }

      if (actives) {
        activesData = $(actives).not(this._selector).data(DATA_KEY$3);

        if (activesData && activesData._isTransitioning) {
          return;
        }
      }

      var startEvent = $.Event(Event$3.SHOW);
      $(this._element).trigger(startEvent);

      if (startEvent.isDefaultPrevented()) {
        return;
      }

      if (actives) {
        Collapse._jQueryInterface.call($(actives).not(this._selector), 'hide');

        if (!activesData) {
          $(actives).data(DATA_KEY$3, null);
        }
      }

      var dimension = this._getDimension();

      $(this._element).removeClass(ClassName$3.COLLAPSE).addClass(ClassName$3.COLLAPSING);
      this._element.style[dimension] = 0;

      if (this._triggerArray.length) {
        $(this._triggerArray).removeClass(ClassName$3.COLLAPSED).attr('aria-expanded', true);
      }

      this.setTransitioning(true);

      var complete = function complete() {
        $(_this._element).removeClass(ClassName$3.COLLAPSING).addClass(ClassName$3.COLLAPSE).addClass(ClassName$3.SHOW);
        _this._element.style[dimension] = '';

        _this.setTransitioning(false);

        $(_this._element).trigger(Event$3.SHOWN);
      };

      var capitalizedDimension = dimension[0].toUpperCase() + dimension.slice(1);
      var scrollSize = "scroll" + capitalizedDimension;
      var transitionDuration = Util.getTransitionDurationFromElement(this._element);
      $(this._element).one(Util.TRANSITION_END, complete).emulateTransitionEnd(transitionDuration);
      this._element.style[dimension] = this._element[scrollSize] + "px";
    };

    _proto.hide = function hide() {
      var _this2 = this;

      if (this._isTransitioning || !$(this._element).hasClass(ClassName$3.SHOW)) {
        return;
      }

      var startEvent = $.Event(Event$3.HIDE);
      $(this._element).trigger(startEvent);

      if (startEvent.isDefaultPrevented()) {
        return;
      }

      var dimension = this._getDimension();

      this._element.style[dimension] = this._element.getBoundingClientRect()[dimension] + "px";
      Util.reflow(this._element);
      $(this._element).addClass(ClassName$3.COLLAPSING).removeClass(ClassName$3.COLLAPSE).removeClass(ClassName$3.SHOW);
      var triggerArrayLength = this._triggerArray.length;

      if (triggerArrayLength > 0) {
        for (var i = 0; i < triggerArrayLength; i++) {
          var trigger = this._triggerArray[i];
          var selector = Util.getSelectorFromElement(trigger);

          if (selector !== null) {
            var $elem = $([].slice.call(document.querySelectorAll(selector)));

            if (!$elem.hasClass(ClassName$3.SHOW)) {
              $(trigger).addClass(ClassName$3.COLLAPSED).attr('aria-expanded', false);
            }
          }
        }
      }

      this.setTransitioning(true);

      var complete = function complete() {
        _this2.setTransitioning(false);

        $(_this2._element).removeClass(ClassName$3.COLLAPSING).addClass(ClassName$3.COLLAPSE).trigger(Event$3.HIDDEN);
      };

      this._element.style[dimension] = '';
      var transitionDuration = Util.getTransitionDurationFromElement(this._element);
      $(this._element).one(Util.TRANSITION_END, complete).emulateTransitionEnd(transitionDuration);
    };

    _proto.setTransitioning = function setTransitioning(isTransitioning) {
      this._isTransitioning = isTransitioning;
    };

    _proto.dispose = function dispose() {
      $.removeData(this._element, DATA_KEY$3);
      this._config = null;
      this._parent = null;
      this._element = null;
      this._triggerArray = null;
      this._isTransitioning = null;
    }; // Private


    _proto._getConfig = function _getConfig(config) {
      config = _objectSpread({}, Default$1, config);
      config.toggle = Boolean(config.toggle); // Coerce string values

      Util.typeCheckConfig(NAME$3, config, DefaultType$1);
      return config;
    };

    _proto._getDimension = function _getDimension() {
      var hasWidth = $(this._element).hasClass(Dimension.WIDTH);
      return hasWidth ? Dimension.WIDTH : Dimension.HEIGHT;
    };

    _proto._getParent = function _getParent() {
      var _this3 = this;

      var parent;

      if (Util.isElement(this._config.parent)) {
        parent = this._config.parent; // It's a jQuery object

        if (typeof this._config.parent.jquery !== 'undefined') {
          parent = this._config.parent[0];
        }
      } else {
        parent = document.querySelector(this._config.parent);
      }

      var selector = "[data-toggle=\"collapse\"][data-parent=\"" + this._config.parent + "\"]";
      var children = [].slice.call(parent.querySelectorAll(selector));
      $(children).each(function (i, element) {
        _this3._addAriaAndCollapsedClass(Collapse._getTargetFromElement(element), [element]);
      });
      return parent;
    };

    _proto._addAriaAndCollapsedClass = function _addAriaAndCollapsedClass(element, triggerArray) {
      var isOpen = $(element).hasClass(ClassName$3.SHOW);

      if (triggerArray.length) {
        $(triggerArray).toggleClass(ClassName$3.COLLAPSED, !isOpen).attr('aria-expanded', isOpen);
      }
    }; // Static


    Collapse._getTargetFromElement = function _getTargetFromElement(element) {
      var selector = Util.getSelectorFromElement(element);
      return selector ? document.querySelector(selector) : null;
    };

    Collapse._jQueryInterface = function _jQueryInterface(config) {
      return this.each(function () {
        var $this = $(this);
        var data = $this.data(DATA_KEY$3);

        var _config = _objectSpread({}, Default$1, $this.data(), typeof config === 'object' && config ? config : {});

        if (!data && _config.toggle && /show|hide/.test(config)) {
          _config.toggle = false;
        }

        if (!data) {
          data = new Collapse(this, _config);
          $this.data(DATA_KEY$3, data);
        }

        if (typeof config === 'string') {
          if (typeof data[config] === 'undefined') {
            throw new TypeError("No method named \"" + config + "\"");
          }

          data[config]();
        }
      });
    };

    _createClass(Collapse, null, [{
      key: "VERSION",
      get: function get() {
        return VERSION$3;
      }
    }, {
      key: "Default",
      get: function get() {
        return Default$1;
      }
    }]);

    return Collapse;
  }();
  /**
   * ------------------------------------------------------------------------
   * Data Api implementation
   * ------------------------------------------------------------------------
   */


  $(document).on(Event$3.CLICK_DATA_API, Selector$3.DATA_TOGGLE, function (event) {
    // preventDefault only for <a> elements (which change the URL) not inside the collapsible element
    if (event.currentTarget.tagName === 'A') {
      event.preventDefault();
    }

    var $trigger = $(this);
    var selector = Util.getSelectorFromElement(this);
    var selectors = [].slice.call(document.querySelectorAll(selector));
    $(selectors).each(function () {
      var $target = $(this);
      var data = $target.data(DATA_KEY$3);
      var config = data ? 'toggle' : $trigger.data();

      Collapse._jQueryInterface.call($target, config);
    });
  });
  /**
   * ------------------------------------------------------------------------
   * jQuery
   * ------------------------------------------------------------------------
   */

  $.fn[NAME$3] = Collapse._jQueryInterface;
  $.fn[NAME$3].Constructor = Collapse;

  $.fn[NAME$3].noConflict = function () {
    $.fn[NAME$3] = JQUERY_NO_CONFLICT$3;
    return Collapse._jQueryInterface;
  };

  /**
   * ------------------------------------------------------------------------
   * Constants
   * ------------------------------------------------------------------------
   */

  var NAME$4 = 'dropdown';
  var VERSION$4 = '4.2.1';
  var DATA_KEY$4 = 'bs.dropdown';
  var EVENT_KEY$4 = "." + DATA_KEY$4;
  var DATA_API_KEY$4 = '.data-api';
  var JQUERY_NO_CONFLICT$4 = $.fn[NAME$4];
  var ESCAPE_KEYCODE = 27; // KeyboardEvent.which value for Escape (Esc) key

  var SPACE_KEYCODE = 32; // KeyboardEvent.which value for space key

  var TAB_KEYCODE = 9; // KeyboardEvent.which value for tab key

  var ARROW_UP_KEYCODE = 38; // KeyboardEvent.which value for up arrow key

  var ARROW_DOWN_KEYCODE = 40; // KeyboardEvent.which value for down arrow key

  var RIGHT_MOUSE_BUTTON_WHICH = 3; // MouseEvent.which value for the right button (assuming a right-handed mouse)

  var REGEXP_KEYDOWN = new RegExp(ARROW_UP_KEYCODE + "|" + ARROW_DOWN_KEYCODE + "|" + ESCAPE_KEYCODE);
  var Event$4 = {
    HIDE: "hide" + EVENT_KEY$4,
    HIDDEN: "hidden" + EVENT_KEY$4,
    SHOW: "show" + EVENT_KEY$4,
    SHOWN: "shown" + EVENT_KEY$4,
    CLICK: "click" + EVENT_KEY$4,
    CLICK_DATA_API: "click" + EVENT_KEY$4 + DATA_API_KEY$4,
    KEYDOWN_DATA_API: "keydown" + EVENT_KEY$4 + DATA_API_KEY$4,
    KEYUP_DATA_API: "keyup" + EVENT_KEY$4 + DATA_API_KEY$4
  };
  var ClassName$4 = {
    DISABLED: 'disabled',
    SHOW: 'show',
    DROPUP: 'dropup',
    DROPRIGHT: 'dropright',
    DROPLEFT: 'dropleft',
    MENURIGHT: 'dropdown-menu-right',
    MENULEFT: 'dropdown-menu-left',
    POSITION_STATIC: 'position-static'
  };
  var Selector$4 = {
    DATA_TOGGLE: '[data-toggle="dropdown"]',
    FORM_CHILD: '.dropdown form',
    MENU: '.dropdown-menu',
    NAVBAR_NAV: '.navbar-nav',
    VISIBLE_ITEMS: '.dropdown-menu .dropdown-item:not(.disabled):not(:disabled)'
  };
  var AttachmentMap = {
    TOP: 'top-start',
    TOPEND: 'top-end',
    BOTTOM: 'bottom-start',
    BOTTOMEND: 'bottom-end',
    RIGHT: 'right-start',
    RIGHTEND: 'right-end',
    LEFT: 'left-start',
    LEFTEND: 'left-end'
  };
  var Default$2 = {
    offset: 0,
    flip: true,
    boundary: 'scrollParent',
    reference: 'toggle',
    display: 'dynamic'
  };
  var DefaultType$2 = {
    offset: '(number|string|function)',
    flip: 'boolean',
    boundary: '(string|element)',
    reference: '(string|element)',
    display: 'string'
    /**
     * ------------------------------------------------------------------------
     * Class Definition
     * ------------------------------------------------------------------------
     */

  };

  var Dropdown =
  /*#__PURE__*/
  function () {
    function Dropdown(element, config) {
      this._element = element;
      this._popper = null;
      this._config = this._getConfig(config);
      this._menu = this._getMenuElement();
      this._inNavbar = this._detectNavbar();

      this._addEventListeners();
    } // Getters


    var _proto = Dropdown.prototype;

    // Public
    _proto.toggle = function toggle() {
      if (this._element.disabled || $(this._element).hasClass(ClassName$4.DISABLED)) {
        return;
      }

      var parent = Dropdown._getParentFromElement(this._element);

      var isActive = $(this._menu).hasClass(ClassName$4.SHOW);

      Dropdown._clearMenus();

      if (isActive) {
        return;
      }

      var relatedTarget = {
        relatedTarget: this._element
      };
      var showEvent = $.Event(Event$4.SHOW, relatedTarget);
      $(parent).trigger(showEvent);

      if (showEvent.isDefaultPrevented()) {
        return;
      } // Disable totally Popper.js for Dropdown in Navbar


      if (!this._inNavbar) {
        /**
         * Check for Popper dependency
         * Popper - https://popper.js.org
         */
        if (typeof Popper === 'undefined') {
          throw new TypeError('Bootstrap\'s dropdowns require Popper.js (https://popper.js.org/)');
        }

        var referenceElement = this._element;

        if (this._config.reference === 'parent') {
          referenceElement = parent;
        } else if (Util.isElement(this._config.reference)) {
          referenceElement = this._config.reference; // Check if it's jQuery element

          if (typeof this._config.reference.jquery !== 'undefined') {
            referenceElement = this._config.reference[0];
          }
        } // If boundary is not `scrollParent`, then set position to `static`
        // to allow the menu to "escape" the scroll parent's boundaries
        // https://github.com/twbs/bootstrap/issues/24251


        if (this._config.boundary !== 'scrollParent') {
          $(parent).addClass(ClassName$4.POSITION_STATIC);
        }

        this._popper = new Popper(referenceElement, this._menu, this._getPopperConfig());
      } // If this is a touch-enabled device we add extra
      // empty mouseover listeners to the body's immediate children;
      // only needed because of broken event delegation on iOS
      // https://www.quirksmode.org/blog/archives/2014/02/mouse_event_bub.html


      if ('ontouchstart' in document.documentElement && $(parent).closest(Selector$4.NAVBAR_NAV).length === 0) {
        $(document.body).children().on('mouseover', null, $.noop);
      }

      this._element.focus();

      this._element.setAttribute('aria-expanded', true);

      $(this._menu).toggleClass(ClassName$4.SHOW);
      $(parent).toggleClass(ClassName$4.SHOW).trigger($.Event(Event$4.SHOWN, relatedTarget));
    };

    _proto.show = function show() {
      if (this._element.disabled || $(this._element).hasClass(ClassName$4.DISABLED) || $(this._menu).hasClass(ClassName$4.SHOW)) {
        return;
      }

      var relatedTarget = {
        relatedTarget: this._element
      };
      var showEvent = $.Event(Event$4.SHOW, relatedTarget);

      var parent = Dropdown._getParentFromElement(this._element);

      $(parent).trigger(showEvent);

      if (showEvent.isDefaultPrevented()) {
        return;
      }

      $(this._menu).toggleClass(ClassName$4.SHOW);
      $(parent).toggleClass(ClassName$4.SHOW).trigger($.Event(Event$4.SHOWN, relatedTarget));
    };

    _proto.hide = function hide() {
      if (this._element.disabled || $(this._element).hasClass(ClassName$4.DISABLED) || !$(this._menu).hasClass(ClassName$4.SHOW)) {
        return;
      }

      var relatedTarget = {
        relatedTarget: this._element
      };
      var hideEvent = $.Event(Event$4.HIDE, relatedTarget);

      var parent = Dropdown._getParentFromElement(this._element);

      $(parent).trigger(hideEvent);

      if (hideEvent.isDefaultPrevented()) {
        return;
      }

      $(this._menu).toggleClass(ClassName$4.SHOW);
      $(parent).toggleClass(ClassName$4.SHOW).trigger($.Event(Event$4.HIDDEN, relatedTarget));
    };

    _proto.dispose = function dispose() {
      $.removeData(this._element, DATA_KEY$4);
      $(this._element).off(EVENT_KEY$4);
      this._element = null;
      this._menu = null;

      if (this._popper !== null) {
        this._popper.destroy();

        this._popper = null;
      }
    };

    _proto.update = function update() {
      this._inNavbar = this._detectNavbar();

      if (this._popper !== null) {
        this._popper.scheduleUpdate();
      }
    }; // Private


    _proto._addEventListeners = function _addEventListeners() {
      var _this = this;

      $(this._element).on(Event$4.CLICK, function (event) {
        event.preventDefault();
        event.stopPropagation();

        _this.toggle();
      });
    };

    _proto._getConfig = function _getConfig(config) {
      config = _objectSpread({}, this.constructor.Default, $(this._element).data(), config);
      Util.typeCheckConfig(NAME$4, config, this.constructor.DefaultType);
      return config;
    };

    _proto._getMenuElement = function _getMenuElement() {
      if (!this._menu) {
        var parent = Dropdown._getParentFromElement(this._element);

        if (parent) {
          this._menu = parent.querySelector(Selector$4.MENU);
        }
      }

      return this._menu;
    };

    _proto._getPlacement = function _getPlacement() {
      var $parentDropdown = $(this._element.parentNode);
      var placement = AttachmentMap.BOTTOM; // Handle dropup

      if ($parentDropdown.hasClass(ClassName$4.DROPUP)) {
        placement = AttachmentMap.TOP;

        if ($(this._menu).hasClass(ClassName$4.MENURIGHT)) {
          placement = AttachmentMap.TOPEND;
        }
      } else if ($parentDropdown.hasClass(ClassName$4.DROPRIGHT)) {
        placement = AttachmentMap.RIGHT;
      } else if ($parentDropdown.hasClass(ClassName$4.DROPLEFT)) {
        placement = AttachmentMap.LEFT;
      } else if ($(this._menu).hasClass(ClassName$4.MENURIGHT)) {
        placement = AttachmentMap.BOTTOMEND;
      }

      return placement;
    };

    _proto._detectNavbar = function _detectNavbar() {
      return $(this._element).closest('.navbar').length > 0;
    };

    _proto._getPopperConfig = function _getPopperConfig() {
      var _this2 = this;

      var offsetConf = {};

      if (typeof this._config.offset === 'function') {
        offsetConf.fn = function (data) {
          data.offsets = _objectSpread({}, data.offsets, _this2._config.offset(data.offsets) || {});
          return data;
        };
      } else {
        offsetConf.offset = this._config.offset;
      }

      var popperConfig = {
        placement: this._getPlacement(),
        modifiers: {
          offset: offsetConf,
          flip: {
            enabled: this._config.flip
          },
          preventOverflow: {
            boundariesElement: this._config.boundary
          }
        } // Disable Popper.js if we have a static display

      };

      if (this._config.display === 'static') {
        popperConfig.modifiers.applyStyle = {
          enabled: false
        };
      }

      return popperConfig;
    }; // Static


    Dropdown._jQueryInterface = function _jQueryInterface(config) {
      return this.each(function () {
        var data = $(this).data(DATA_KEY$4);

        var _config = typeof config === 'object' ? config : null;

        if (!data) {
          data = new Dropdown(this, _config);
          $(this).data(DATA_KEY$4, data);
        }

        if (typeof config === 'string') {
          if (typeof data[config] === 'undefined') {
            throw new TypeError("No method named \"" + config + "\"");
          }

          data[config]();
        }
      });
    };

    Dropdown._clearMenus = function _clearMenus(event) {
      if (event && (event.which === RIGHT_MOUSE_BUTTON_WHICH || event.type === 'keyup' && event.which !== TAB_KEYCODE)) {
        return;
      }

      var toggles = [].slice.call(document.querySelectorAll(Selector$4.DATA_TOGGLE));

      for (var i = 0, len = toggles.length; i < len; i++) {
        var parent = Dropdown._getParentFromElement(toggles[i]);

        var context = $(toggles[i]).data(DATA_KEY$4);
        var relatedTarget = {
          relatedTarget: toggles[i]
        };

        if (event && event.type === 'click') {
          relatedTarget.clickEvent = event;
        }

        if (!context) {
          continue;
        }

        var dropdownMenu = context._menu;

        if (!$(parent).hasClass(ClassName$4.SHOW)) {
          continue;
        }

        if (event && (event.type === 'click' && /input|textarea/i.test(event.target.tagName) || event.type === 'keyup' && event.which === TAB_KEYCODE) && $.contains(parent, event.target)) {
          continue;
        }

        var hideEvent = $.Event(Event$4.HIDE, relatedTarget);
        $(parent).trigger(hideEvent);

        if (hideEvent.isDefaultPrevented()) {
          continue;
        } // If this is a touch-enabled device we remove the extra
        // empty mouseover listeners we added for iOS support


        if ('ontouchstart' in document.documentElement) {
          $(document.body).children().off('mouseover', null, $.noop);
        }

        toggles[i].setAttribute('aria-expanded', 'false');
        $(dropdownMenu).removeClass(ClassName$4.SHOW);
        $(parent).removeClass(ClassName$4.SHOW).trigger($.Event(Event$4.HIDDEN, relatedTarget));
      }
    };

    Dropdown._getParentFromElement = function _getParentFromElement(element) {
      var parent;
      var selector = Util.getSelectorFromElement(element);

      if (selector) {
        parent = document.querySelector(selector);
      }

      return parent || element.parentNode;
    }; // eslint-disable-next-line complexity


    Dropdown._dataApiKeydownHandler = function _dataApiKeydownHandler(event) {
      // If not input/textarea:
      //  - And not a key in REGEXP_KEYDOWN => not a dropdown command
      // If input/textarea:
      //  - If space key => not a dropdown command
      //  - If key is other than escape
      //    - If key is not up or down => not a dropdown command
      //    - If trigger inside the menu => not a dropdown command
      if (/input|textarea/i.test(event.target.tagName) ? event.which === SPACE_KEYCODE || event.which !== ESCAPE_KEYCODE && (event.which !== ARROW_DOWN_KEYCODE && event.which !== ARROW_UP_KEYCODE || $(event.target).closest(Selector$4.MENU).length) : !REGEXP_KEYDOWN.test(event.which)) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      if (this.disabled || $(this).hasClass(ClassName$4.DISABLED)) {
        return;
      }

      var parent = Dropdown._getParentFromElement(this);

      var isActive = $(parent).hasClass(ClassName$4.SHOW);

      if (!isActive || isActive && (event.which === ESCAPE_KEYCODE || event.which === SPACE_KEYCODE)) {
        if (event.which === ESCAPE_KEYCODE) {
          var toggle = parent.querySelector(Selector$4.DATA_TOGGLE);
          $(toggle).trigger('focus');
        }

        $(this).trigger('click');
        return;
      }

      var items = [].slice.call(parent.querySelectorAll(Selector$4.VISIBLE_ITEMS));

      if (items.length === 0) {
        return;
      }

      var index = items.indexOf(event.target);

      if (event.which === ARROW_UP_KEYCODE && index > 0) {
        // Up
        index--;
      }

      if (event.which === ARROW_DOWN_KEYCODE && index < items.length - 1) {
        // Down
        index++;
      }

      if (index < 0) {
        index = 0;
      }

      items[index].focus();
    };

    _createClass(Dropdown, null, [{
      key: "VERSION",
      get: function get() {
        return VERSION$4;
      }
    }, {
      key: "Default",
      get: function get() {
        return Default$2;
      }
    }, {
      key: "DefaultType",
      get: function get() {
        return DefaultType$2;
      }
    }]);

    return Dropdown;
  }();
  /**
   * ------------------------------------------------------------------------
   * Data Api implementation
   * ------------------------------------------------------------------------
   */


  $(document).on(Event$4.KEYDOWN_DATA_API, Selector$4.DATA_TOGGLE, Dropdown._dataApiKeydownHandler).on(Event$4.KEYDOWN_DATA_API, Selector$4.MENU, Dropdown._dataApiKeydownHandler).on(Event$4.CLICK_DATA_API + " " + Event$4.KEYUP_DATA_API, Dropdown._clearMenus).on(Event$4.CLICK_DATA_API, Selector$4.DATA_TOGGLE, function (event) {
    event.preventDefault();
    event.stopPropagation();

    Dropdown._jQueryInterface.call($(this), 'toggle');
  }).on(Event$4.CLICK_DATA_API, Selector$4.FORM_CHILD, function (e) {
    e.stopPropagation();
  });
  /**
   * ------------------------------------------------------------------------
   * jQuery
   * ------------------------------------------------------------------------
   */

  $.fn[NAME$4] = Dropdown._jQueryInterface;
  $.fn[NAME$4].Constructor = Dropdown;

  $.fn[NAME$4].noConflict = function () {
    $.fn[NAME$4] = JQUERY_NO_CONFLICT$4;
    return Dropdown._jQueryInterface;
  };

  /**
   * ------------------------------------------------------------------------
   * Constants
   * ------------------------------------------------------------------------
   */

  var NAME$5 = 'modal';
  var VERSION$5 = '4.2.1';
  var DATA_KEY$5 = 'bs.modal';
  var EVENT_KEY$5 = "." + DATA_KEY$5;
  var DATA_API_KEY$5 = '.data-api';
  var JQUERY_NO_CONFLICT$5 = $.fn[NAME$5];
  var ESCAPE_KEYCODE$1 = 27; // KeyboardEvent.which value for Escape (Esc) key

  var Default$3 = {
    backdrop: true,
    keyboard: true,
    focus: true,
    show: true
  };
  var DefaultType$3 = {
    backdrop: '(boolean|string)',
    keyboard: 'boolean',
    focus: 'boolean',
    show: 'boolean'
  };
  var Event$5 = {
    HIDE: "hide" + EVENT_KEY$5,
    HIDDEN: "hidden" + EVENT_KEY$5,
    SHOW: "show" + EVENT_KEY$5,
    SHOWN: "shown" + EVENT_KEY$5,
    FOCUSIN: "focusin" + EVENT_KEY$5,
    RESIZE: "resize" + EVENT_KEY$5,
    CLICK_DISMISS: "click.dismiss" + EVENT_KEY$5,
    KEYDOWN_DISMISS: "keydown.dismiss" + EVENT_KEY$5,
    MOUSEUP_DISMISS: "mouseup.dismiss" + EVENT_KEY$5,
    MOUSEDOWN_DISMISS: "mousedown.dismiss" + EVENT_KEY$5,
    CLICK_DATA_API: "click" + EVENT_KEY$5 + DATA_API_KEY$5
  };
  var ClassName$5 = {
    SCROLLBAR_MEASURER: 'modal-scrollbar-measure',
    BACKDROP: 'modal-backdrop',
    OPEN: 'modal-open',
    FADE: 'fade',
    SHOW: 'show'
  };
  var Selector$5 = {
    DIALOG: '.modal-dialog',
    DATA_TOGGLE: '[data-toggle="modal"]',
    DATA_DISMISS: '[data-dismiss="modal"]',
    FIXED_CONTENT: '.fixed-top, .fixed-bottom, .is-fixed, .sticky-top',
    STICKY_CONTENT: '.sticky-top'
    /**
     * ------------------------------------------------------------------------
     * Class Definition
     * ------------------------------------------------------------------------
     */

  };

  var Modal =
  /*#__PURE__*/
  function () {
    function Modal(element, config) {
      this._config = this._getConfig(config);
      this._element = element;
      this._dialog = element.querySelector(Selector$5.DIALOG);
      this._backdrop = null;
      this._isShown = false;
      this._isBodyOverflowing = false;
      this._ignoreBackdropClick = false;
      this._isTransitioning = false;
      this._scrollbarWidth = 0;
    } // Getters


    var _proto = Modal.prototype;

    // Public
    _proto.toggle = function toggle(relatedTarget) {
      return this._isShown ? this.hide() : this.show(relatedTarget);
    };

    _proto.show = function show(relatedTarget) {
      var _this = this;

      if (this._isShown || this._isTransitioning) {
        return;
      }

      if ($(this._element).hasClass(ClassName$5.FADE)) {
        this._isTransitioning = true;
      }

      var showEvent = $.Event(Event$5.SHOW, {
        relatedTarget: relatedTarget
      });
      $(this._element).trigger(showEvent);

      if (this._isShown || showEvent.isDefaultPrevented()) {
        return;
      }

      this._isShown = true;

      this._checkScrollbar();

      this._setScrollbar();

      this._adjustDialog();

      this._setEscapeEvent();

      this._setResizeEvent();

      $(this._element).on(Event$5.CLICK_DISMISS, Selector$5.DATA_DISMISS, function (event) {
        return _this.hide(event);
      });
      $(this._dialog).on(Event$5.MOUSEDOWN_DISMISS, function () {
        $(_this._element).one(Event$5.MOUSEUP_DISMISS, function (event) {
          if ($(event.target).is(_this._element)) {
            _this._ignoreBackdropClick = true;
          }
        });
      });

      this._showBackdrop(function () {
        return _this._showElement(relatedTarget);
      });
    };

    _proto.hide = function hide(event) {
      var _this2 = this;

      if (event) {
        event.preventDefault();
      }

      if (!this._isShown || this._isTransitioning) {
        return;
      }

      var hideEvent = $.Event(Event$5.HIDE);
      $(this._element).trigger(hideEvent);

      if (!this._isShown || hideEvent.isDefaultPrevented()) {
        return;
      }

      this._isShown = false;
      var transition = $(this._element).hasClass(ClassName$5.FADE);

      if (transition) {
        this._isTransitioning = true;
      }

      this._setEscapeEvent();

      this._setResizeEvent();

      $(document).off(Event$5.FOCUSIN);
      $(this._element).removeClass(ClassName$5.SHOW);
      $(this._element).off(Event$5.CLICK_DISMISS);
      $(this._dialog).off(Event$5.MOUSEDOWN_DISMISS);

      if (transition) {
        var transitionDuration = Util.getTransitionDurationFromElement(this._element);
        $(this._element).one(Util.TRANSITION_END, function (event) {
          return _this2._hideModal(event);
        }).emulateTransitionEnd(transitionDuration);
      } else {
        this._hideModal();
      }
    };

    _proto.dispose = function dispose() {
      [window, this._element, this._dialog].forEach(function (htmlElement) {
        return $(htmlElement).off(EVENT_KEY$5);
      });
      /**
       * `document` has 2 events `Event.FOCUSIN` and `Event.CLICK_DATA_API`
       * Do not move `document` in `htmlElements` array
       * It will remove `Event.CLICK_DATA_API` event that should remain
       */

      $(document).off(Event$5.FOCUSIN);
      $.removeData(this._element, DATA_KEY$5);
      this._config = null;
      this._element = null;
      this._dialog = null;
      this._backdrop = null;
      this._isShown = null;
      this._isBodyOverflowing = null;
      this._ignoreBackdropClick = null;
      this._isTransitioning = null;
      this._scrollbarWidth = null;
    };

    _proto.handleUpdate = function handleUpdate() {
      this._adjustDialog();
    }; // Private


    _proto._getConfig = function _getConfig(config) {
      config = _objectSpread({}, Default$3, config);
      Util.typeCheckConfig(NAME$5, config, DefaultType$3);
      return config;
    };

    _proto._showElement = function _showElement(relatedTarget) {
      var _this3 = this;

      var transition = $(this._element).hasClass(ClassName$5.FADE);

      if (!this._element.parentNode || this._element.parentNode.nodeType !== Node.ELEMENT_NODE) {
        // Don't move modal's DOM position
        document.body.appendChild(this._element);
      }

      this._element.style.display = 'block';

      this._element.removeAttribute('aria-hidden');

      this._element.setAttribute('aria-modal', true);

      this._element.scrollTop = 0;

      if (transition) {
        Util.reflow(this._element);
      }

      $(this._element).addClass(ClassName$5.SHOW);

      if (this._config.focus) {
        this._enforceFocus();
      }

      var shownEvent = $.Event(Event$5.SHOWN, {
        relatedTarget: relatedTarget
      });

      var transitionComplete = function transitionComplete() {
        if (_this3._config.focus) {
          _this3._element.focus();
        }

        _this3._isTransitioning = false;
        $(_this3._element).trigger(shownEvent);
      };

      if (transition) {
        var transitionDuration = Util.getTransitionDurationFromElement(this._dialog);
        $(this._dialog).one(Util.TRANSITION_END, transitionComplete).emulateTransitionEnd(transitionDuration);
      } else {
        transitionComplete();
      }
    };

    _proto._enforceFocus = function _enforceFocus() {
      var _this4 = this;

      $(document).off(Event$5.FOCUSIN) // Guard against infinite focus loop
      .on(Event$5.FOCUSIN, function (event) {
        if (document !== event.target && _this4._element !== event.target && $(_this4._element).has(event.target).length === 0) {
          _this4._element.focus();
        }
      });
    };

    _proto._setEscapeEvent = function _setEscapeEvent() {
      var _this5 = this;

      if (this._isShown && this._config.keyboard) {
        $(this._element).on(Event$5.KEYDOWN_DISMISS, function (event) {
          if (event.which === ESCAPE_KEYCODE$1) {
            event.preventDefault();

            _this5.hide();
          }
        });
      } else if (!this._isShown) {
        $(this._element).off(Event$5.KEYDOWN_DISMISS);
      }
    };

    _proto._setResizeEvent = function _setResizeEvent() {
      var _this6 = this;

      if (this._isShown) {
        $(window).on(Event$5.RESIZE, function (event) {
          return _this6.handleUpdate(event);
        });
      } else {
        $(window).off(Event$5.RESIZE);
      }
    };

    _proto._hideModal = function _hideModal() {
      var _this7 = this;

      this._element.style.display = 'none';

      this._element.setAttribute('aria-hidden', true);

      this._element.removeAttribute('aria-modal');

      this._isTransitioning = false;

      this._showBackdrop(function () {
        $(document.body).removeClass(ClassName$5.OPEN);

        _this7._resetAdjustments();

        _this7._resetScrollbar();

        $(_this7._element).trigger(Event$5.HIDDEN);
      });
    };

    _proto._removeBackdrop = function _removeBackdrop() {
      if (this._backdrop) {
        $(this._backdrop).remove();
        this._backdrop = null;
      }
    };

    _proto._showBackdrop = function _showBackdrop(callback) {
      var _this8 = this;

      var animate = $(this._element).hasClass(ClassName$5.FADE) ? ClassName$5.FADE : '';

      if (this._isShown && this._config.backdrop) {
        this._backdrop = document.createElement('div');
        this._backdrop.className = ClassName$5.BACKDROP;

        if (animate) {
          this._backdrop.classList.add(animate);
        }

        $(this._backdrop).appendTo(document.body);
        $(this._element).on(Event$5.CLICK_DISMISS, function (event) {
          if (_this8._ignoreBackdropClick) {
            _this8._ignoreBackdropClick = false;
            return;
          }

          if (event.target !== event.currentTarget) {
            return;
          }

          if (_this8._config.backdrop === 'static') {
            _this8._element.focus();
          } else {
            _this8.hide();
          }
        });

        if (animate) {
          Util.reflow(this._backdrop);
        }

        $(this._backdrop).addClass(ClassName$5.SHOW);

        if (!callback) {
          return;
        }

        if (!animate) {
          callback();
          return;
        }

        var backdropTransitionDuration = Util.getTransitionDurationFromElement(this._backdrop);
        $(this._backdrop).one(Util.TRANSITION_END, callback).emulateTransitionEnd(backdropTransitionDuration);
      } else if (!this._isShown && this._backdrop) {
        $(this._backdrop).removeClass(ClassName$5.SHOW);

        var callbackRemove = function callbackRemove() {
          _this8._removeBackdrop();

          if (callback) {
            callback();
          }
        };

        if ($(this._element).hasClass(ClassName$5.FADE)) {
          var _backdropTransitionDuration = Util.getTransitionDurationFromElement(this._backdrop);

          $(this._backdrop).one(Util.TRANSITION_END, callbackRemove).emulateTransitionEnd(_backdropTransitionDuration);
        } else {
          callbackRemove();
        }
      } else if (callback) {
        callback();
      }
    }; // ----------------------------------------------------------------------
    // the following methods are used to handle overflowing modals
    // todo (fat): these should probably be refactored out of modal.js
    // ----------------------------------------------------------------------


    _proto._adjustDialog = function _adjustDialog() {
      var isModalOverflowing = this._element.scrollHeight > document.documentElement.clientHeight;

      if (!this._isBodyOverflowing && isModalOverflowing) {
        this._element.style.paddingLeft = this._scrollbarWidth + "px";
      }

      if (this._isBodyOverflowing && !isModalOverflowing) {
        this._element.style.paddingRight = this._scrollbarWidth + "px";
      }
    };

    _proto._resetAdjustments = function _resetAdjustments() {
      this._element.style.paddingLeft = '';
      this._element.style.paddingRight = '';
    };

    _proto._checkScrollbar = function _checkScrollbar() {
      var rect = document.body.getBoundingClientRect();
      this._isBodyOverflowing = rect.left + rect.right < window.innerWidth;
      this._scrollbarWidth = this._getScrollbarWidth();
    };

    _proto._setScrollbar = function _setScrollbar() {
      var _this9 = this;

      if (this._isBodyOverflowing) {
        // Note: DOMNode.style.paddingRight returns the actual value or '' if not set
        //   while $(DOMNode).css('padding-right') returns the calculated value or 0 if not set
        var fixedContent = [].slice.call(document.querySelectorAll(Selector$5.FIXED_CONTENT));
        var stickyContent = [].slice.call(document.querySelectorAll(Selector$5.STICKY_CONTENT)); // Adjust fixed content padding

        $(fixedContent).each(function (index, element) {
          var actualPadding = element.style.paddingRight;
          var calculatedPadding = $(element).css('padding-right');
          $(element).data('padding-right', actualPadding).css('padding-right', parseFloat(calculatedPadding) + _this9._scrollbarWidth + "px");
        }); // Adjust sticky content margin

        $(stickyContent).each(function (index, element) {
          var actualMargin = element.style.marginRight;
          var calculatedMargin = $(element).css('margin-right');
          $(element).data('margin-right', actualMargin).css('margin-right', parseFloat(calculatedMargin) - _this9._scrollbarWidth + "px");
        }); // Adjust body padding

        var actualPadding = document.body.style.paddingRight;
        var calculatedPadding = $(document.body).css('padding-right');
        $(document.body).data('padding-right', actualPadding).css('padding-right', parseFloat(calculatedPadding) + this._scrollbarWidth + "px");
      }

      $(document.body).addClass(ClassName$5.OPEN);
    };

    _proto._resetScrollbar = function _resetScrollbar() {
      // Restore fixed content padding
      var fixedContent = [].slice.call(document.querySelectorAll(Selector$5.FIXED_CONTENT));
      $(fixedContent).each(function (index, element) {
        var padding = $(element).data('padding-right');
        $(element).removeData('padding-right');
        element.style.paddingRight = padding ? padding : '';
      }); // Restore sticky content

      var elements = [].slice.call(document.querySelectorAll("" + Selector$5.STICKY_CONTENT));
      $(elements).each(function (index, element) {
        var margin = $(element).data('margin-right');

        if (typeof margin !== 'undefined') {
          $(element).css('margin-right', margin).removeData('margin-right');
        }
      }); // Restore body padding

      var padding = $(document.body).data('padding-right');
      $(document.body).removeData('padding-right');
      document.body.style.paddingRight = padding ? padding : '';
    };

    _proto._getScrollbarWidth = function _getScrollbarWidth() {
      // thx d.walsh
      var scrollDiv = document.createElement('div');
      scrollDiv.className = ClassName$5.SCROLLBAR_MEASURER;
      document.body.appendChild(scrollDiv);
      var scrollbarWidth = scrollDiv.getBoundingClientRect().width - scrollDiv.clientWidth;
      document.body.removeChild(scrollDiv);
      return scrollbarWidth;
    }; // Static


    Modal._jQueryInterface = function _jQueryInterface(config, relatedTarget) {
      return this.each(function () {
        var data = $(this).data(DATA_KEY$5);

        var _config = _objectSpread({}, Default$3, $(this).data(), typeof config === 'object' && config ? config : {});

        if (!data) {
          data = new Modal(this, _config);
          $(this).data(DATA_KEY$5, data);
        }

        if (typeof config === 'string') {
          if (typeof data[config] === 'undefined') {
            throw new TypeError("No method named \"" + config + "\"");
          }

          data[config](relatedTarget);
        } else if (_config.show) {
          data.show(relatedTarget);
        }
      });
    };

    _createClass(Modal, null, [{
      key: "VERSION",
      get: function get() {
        return VERSION$5;
      }
    }, {
      key: "Default",
      get: function get() {
        return Default$3;
      }
    }]);

    return Modal;
  }();
  /**
   * ------------------------------------------------------------------------
   * Data Api implementation
   * ------------------------------------------------------------------------
   */


  $(document).on(Event$5.CLICK_DATA_API, Selector$5.DATA_TOGGLE, function (event) {
    var _this10 = this;

    var target;
    var selector = Util.getSelectorFromElement(this);

    if (selector) {
      target = document.querySelector(selector);
    }

    var config = $(target).data(DATA_KEY$5) ? 'toggle' : _objectSpread({}, $(target).data(), $(this).data());

    if (this.tagName === 'A' || this.tagName === 'AREA') {
      event.preventDefault();
    }

    var $target = $(target).one(Event$5.SHOW, function (showEvent) {
      if (showEvent.isDefaultPrevented()) {
        // Only register focus restorer if modal will actually get shown
        return;
      }

      $target.one(Event$5.HIDDEN, function () {
        if ($(_this10).is(':visible')) {
          _this10.focus();
        }
      });
    });

    Modal._jQueryInterface.call($(target), config, this);
  });
  /**
   * ------------------------------------------------------------------------
   * jQuery
   * ------------------------------------------------------------------------
   */

  $.fn[NAME$5] = Modal._jQueryInterface;
  $.fn[NAME$5].Constructor = Modal;

  $.fn[NAME$5].noConflict = function () {
    $.fn[NAME$5] = JQUERY_NO_CONFLICT$5;
    return Modal._jQueryInterface;
  };

  /**
   * ------------------------------------------------------------------------
   * Constants
   * ------------------------------------------------------------------------
   */

  var NAME$6 = 'tooltip';
  var VERSION$6 = '4.2.1';
  var DATA_KEY$6 = 'bs.tooltip';
  var EVENT_KEY$6 = "." + DATA_KEY$6;
  var JQUERY_NO_CONFLICT$6 = $.fn[NAME$6];
  var CLASS_PREFIX = 'bs-tooltip';
  var BSCLS_PREFIX_REGEX = new RegExp("(^|\\s)" + CLASS_PREFIX + "\\S+", 'g');
  var DefaultType$4 = {
    animation: 'boolean',
    template: 'string',
    title: '(string|element|function)',
    trigger: 'string',
    delay: '(number|object)',
    html: 'boolean',
    selector: '(string|boolean)',
    placement: '(string|function)',
    offset: '(number|string)',
    container: '(string|element|boolean)',
    fallbackPlacement: '(string|array)',
    boundary: '(string|element)'
  };
  var AttachmentMap$1 = {
    AUTO: 'auto',
    TOP: 'top',
    RIGHT: 'right',
    BOTTOM: 'bottom',
    LEFT: 'left'
  };
  var Default$4 = {
    animation: true,
    template: '<div class="tooltip" role="tooltip">' + '<div class="arrow"></div>' + '<div class="tooltip-inner"></div></div>',
    trigger: 'hover focus',
    title: '',
    delay: 0,
    html: false,
    selector: false,
    placement: 'top',
    offset: 0,
    container: false,
    fallbackPlacement: 'flip',
    boundary: 'scrollParent'
  };
  var HoverState = {
    SHOW: 'show',
    OUT: 'out'
  };
  var Event$6 = {
    HIDE: "hide" + EVENT_KEY$6,
    HIDDEN: "hidden" + EVENT_KEY$6,
    SHOW: "show" + EVENT_KEY$6,
    SHOWN: "shown" + EVENT_KEY$6,
    INSERTED: "inserted" + EVENT_KEY$6,
    CLICK: "click" + EVENT_KEY$6,
    FOCUSIN: "focusin" + EVENT_KEY$6,
    FOCUSOUT: "focusout" + EVENT_KEY$6,
    MOUSEENTER: "mouseenter" + EVENT_KEY$6,
    MOUSELEAVE: "mouseleave" + EVENT_KEY$6
  };
  var ClassName$6 = {
    FADE: 'fade',
    SHOW: 'show'
  };
  var Selector$6 = {
    TOOLTIP: '.tooltip',
    TOOLTIP_INNER: '.tooltip-inner',
    ARROW: '.arrow'
  };
  var Trigger = {
    HOVER: 'hover',
    FOCUS: 'focus',
    CLICK: 'click',
    MANUAL: 'manual'
    /**
     * ------------------------------------------------------------------------
     * Class Definition
     * ------------------------------------------------------------------------
     */

  };

  var Tooltip =
  /*#__PURE__*/
  function () {
    function Tooltip(element, config) {
      /**
       * Check for Popper dependency
       * Popper - https://popper.js.org
       */
      if (typeof Popper === 'undefined') {
        throw new TypeError('Bootstrap\'s tooltips require Popper.js (https://popper.js.org/)');
      } // private


      this._isEnabled = true;
      this._timeout = 0;
      this._hoverState = '';
      this._activeTrigger = {};
      this._popper = null; // Protected

      this.element = element;
      this.config = this._getConfig(config);
      this.tip = null;

      this._setListeners();
    } // Getters


    var _proto = Tooltip.prototype;

    // Public
    _proto.enable = function enable() {
      this._isEnabled = true;
    };

    _proto.disable = function disable() {
      this._isEnabled = false;
    };

    _proto.toggleEnabled = function toggleEnabled() {
      this._isEnabled = !this._isEnabled;
    };

    _proto.toggle = function toggle(event) {
      if (!this._isEnabled) {
        return;
      }

      if (event) {
        var dataKey = this.constructor.DATA_KEY;
        var context = $(event.currentTarget).data(dataKey);

        if (!context) {
          context = new this.constructor(event.currentTarget, this._getDelegateConfig());
          $(event.currentTarget).data(dataKey, context);
        }

        context._activeTrigger.click = !context._activeTrigger.click;

        if (context._isWithActiveTrigger()) {
          context._enter(null, context);
        } else {
          context._leave(null, context);
        }
      } else {
        if ($(this.getTipElement()).hasClass(ClassName$6.SHOW)) {
          this._leave(null, this);

          return;
        }

        this._enter(null, this);
      }
    };

    _proto.dispose = function dispose() {
      clearTimeout(this._timeout);
      $.removeData(this.element, this.constructor.DATA_KEY);
      $(this.element).off(this.constructor.EVENT_KEY);
      $(this.element).closest('.modal').off('hide.bs.modal');

      if (this.tip) {
        $(this.tip).remove();
      }

      this._isEnabled = null;
      this._timeout = null;
      this._hoverState = null;
      this._activeTrigger = null;

      if (this._popper !== null) {
        this._popper.destroy();
      }

      this._popper = null;
      this.element = null;
      this.config = null;
      this.tip = null;
    };

    _proto.show = function show() {
      var _this = this;

      if ($(this.element).css('display') === 'none') {
        throw new Error('Please use show on visible elements');
      }

      var showEvent = $.Event(this.constructor.Event.SHOW);

      if (this.isWithContent() && this._isEnabled) {
        $(this.element).trigger(showEvent);
        var shadowRoot = Util.findShadowRoot(this.element);
        var isInTheDom = $.contains(shadowRoot !== null ? shadowRoot : this.element.ownerDocument.documentElement, this.element);

        if (showEvent.isDefaultPrevented() || !isInTheDom) {
          return;
        }

        var tip = this.getTipElement();
        var tipId = Util.getUID(this.constructor.NAME);
        tip.setAttribute('id', tipId);
        this.element.setAttribute('aria-describedby', tipId);
        this.setContent();

        if (this.config.animation) {
          $(tip).addClass(ClassName$6.FADE);
        }

        var placement = typeof this.config.placement === 'function' ? this.config.placement.call(this, tip, this.element) : this.config.placement;

        var attachment = this._getAttachment(placement);

        this.addAttachmentClass(attachment);

        var container = this._getContainer();

        $(tip).data(this.constructor.DATA_KEY, this);

        if (!$.contains(this.element.ownerDocument.documentElement, this.tip)) {
          $(tip).appendTo(container);
        }

        $(this.element).trigger(this.constructor.Event.INSERTED);
        this._popper = new Popper(this.element, tip, {
          placement: attachment,
          modifiers: {
            offset: {
              offset: this.config.offset
            },
            flip: {
              behavior: this.config.fallbackPlacement
            },
            arrow: {
              element: Selector$6.ARROW
            },
            preventOverflow: {
              boundariesElement: this.config.boundary
            }
          },
          onCreate: function onCreate(data) {
            if (data.originalPlacement !== data.placement) {
              _this._handlePopperPlacementChange(data);
            }
          },
          onUpdate: function onUpdate(data) {
            return _this._handlePopperPlacementChange(data);
          }
        });
        $(tip).addClass(ClassName$6.SHOW); // If this is a touch-enabled device we add extra
        // empty mouseover listeners to the body's immediate children;
        // only needed because of broken event delegation on iOS
        // https://www.quirksmode.org/blog/archives/2014/02/mouse_event_bub.html

        if ('ontouchstart' in document.documentElement) {
          $(document.body).children().on('mouseover', null, $.noop);
        }

        var complete = function complete() {
          if (_this.config.animation) {
            _this._fixTransition();
          }

          var prevHoverState = _this._hoverState;
          _this._hoverState = null;
          $(_this.element).trigger(_this.constructor.Event.SHOWN);

          if (prevHoverState === HoverState.OUT) {
            _this._leave(null, _this);
          }
        };

        if ($(this.tip).hasClass(ClassName$6.FADE)) {
          var transitionDuration = Util.getTransitionDurationFromElement(this.tip);
          $(this.tip).one(Util.TRANSITION_END, complete).emulateTransitionEnd(transitionDuration);
        } else {
          complete();
        }
      }
    };

    _proto.hide = function hide(callback) {
      var _this2 = this;

      var tip = this.getTipElement();
      var hideEvent = $.Event(this.constructor.Event.HIDE);

      var complete = function complete() {
        if (_this2._hoverState !== HoverState.SHOW && tip.parentNode) {
          tip.parentNode.removeChild(tip);
        }

        _this2._cleanTipClass();

        _this2.element.removeAttribute('aria-describedby');

        $(_this2.element).trigger(_this2.constructor.Event.HIDDEN);

        if (_this2._popper !== null) {
          _this2._popper.destroy();
        }

        if (callback) {
          callback();
        }
      };

      $(this.element).trigger(hideEvent);

      if (hideEvent.isDefaultPrevented()) {
        return;
      }

      $(tip).removeClass(ClassName$6.SHOW); // If this is a touch-enabled device we remove the extra
      // empty mouseover listeners we added for iOS support

      if ('ontouchstart' in document.documentElement) {
        $(document.body).children().off('mouseover', null, $.noop);
      }

      this._activeTrigger[Trigger.CLICK] = false;
      this._activeTrigger[Trigger.FOCUS] = false;
      this._activeTrigger[Trigger.HOVER] = false;

      if ($(this.tip).hasClass(ClassName$6.FADE)) {
        var transitionDuration = Util.getTransitionDurationFromElement(tip);
        $(tip).one(Util.TRANSITION_END, complete).emulateTransitionEnd(transitionDuration);
      } else {
        complete();
      }

      this._hoverState = '';
    };

    _proto.update = function update() {
      if (this._popper !== null) {
        this._popper.scheduleUpdate();
      }
    }; // Protected


    _proto.isWithContent = function isWithContent() {
      return Boolean(this.getTitle());
    };

    _proto.addAttachmentClass = function addAttachmentClass(attachment) {
      $(this.getTipElement()).addClass(CLASS_PREFIX + "-" + attachment);
    };

    _proto.getTipElement = function getTipElement() {
      this.tip = this.tip || $(this.config.template)[0];
      return this.tip;
    };

    _proto.setContent = function setContent() {
      var tip = this.getTipElement();
      this.setElementContent($(tip.querySelectorAll(Selector$6.TOOLTIP_INNER)), this.getTitle());
      $(tip).removeClass(ClassName$6.FADE + " " + ClassName$6.SHOW);
    };

    _proto.setElementContent = function setElementContent($element, content) {
      var html = this.config.html;

      if (typeof content === 'object' && (content.nodeType || content.jquery)) {
        // Content is a DOM node or a jQuery
        if (html) {
          if (!$(content).parent().is($element)) {
            $element.empty().append(content);
          }
        } else {
          $element.text($(content).text());
        }
      } else {
        $element[html ? 'html' : 'text'](content);
      }
    };

    _proto.getTitle = function getTitle() {
      var title = this.element.getAttribute('data-original-title');

      if (!title) {
        title = typeof this.config.title === 'function' ? this.config.title.call(this.element) : this.config.title;
      }

      return title;
    }; // Private


    _proto._getContainer = function _getContainer() {
      if (this.config.container === false) {
        return document.body;
      }

      if (Util.isElement(this.config.container)) {
        return $(this.config.container);
      }

      return $(document).find(this.config.container);
    };

    _proto._getAttachment = function _getAttachment(placement) {
      return AttachmentMap$1[placement.toUpperCase()];
    };

    _proto._setListeners = function _setListeners() {
      var _this3 = this;

      var triggers = this.config.trigger.split(' ');
      triggers.forEach(function (trigger) {
        if (trigger === 'click') {
          $(_this3.element).on(_this3.constructor.Event.CLICK, _this3.config.selector, function (event) {
            return _this3.toggle(event);
          });
        } else if (trigger !== Trigger.MANUAL) {
          var eventIn = trigger === Trigger.HOVER ? _this3.constructor.Event.MOUSEENTER : _this3.constructor.Event.FOCUSIN;
          var eventOut = trigger === Trigger.HOVER ? _this3.constructor.Event.MOUSELEAVE : _this3.constructor.Event.FOCUSOUT;
          $(_this3.element).on(eventIn, _this3.config.selector, function (event) {
            return _this3._enter(event);
          }).on(eventOut, _this3.config.selector, function (event) {
            return _this3._leave(event);
          });
        }
      });
      $(this.element).closest('.modal').on('hide.bs.modal', function () {
        if (_this3.element) {
          _this3.hide();
        }
      });

      if (this.config.selector) {
        this.config = _objectSpread({}, this.config, {
          trigger: 'manual',
          selector: ''
        });
      } else {
        this._fixTitle();
      }
    };

    _proto._fixTitle = function _fixTitle() {
      var titleType = typeof this.element.getAttribute('data-original-title');

      if (this.element.getAttribute('title') || titleType !== 'string') {
        this.element.setAttribute('data-original-title', this.element.getAttribute('title') || '');
        this.element.setAttribute('title', '');
      }
    };

    _proto._enter = function _enter(event, context) {
      var dataKey = this.constructor.DATA_KEY;
      context = context || $(event.currentTarget).data(dataKey);

      if (!context) {
        context = new this.constructor(event.currentTarget, this._getDelegateConfig());
        $(event.currentTarget).data(dataKey, context);
      }

      if (event) {
        context._activeTrigger[event.type === 'focusin' ? Trigger.FOCUS : Trigger.HOVER] = true;
      }

      if ($(context.getTipElement()).hasClass(ClassName$6.SHOW) || context._hoverState === HoverState.SHOW) {
        context._hoverState = HoverState.SHOW;
        return;
      }

      clearTimeout(context._timeout);
      context._hoverState = HoverState.SHOW;

      if (!context.config.delay || !context.config.delay.show) {
        context.show();
        return;
      }

      context._timeout = setTimeout(function () {
        if (context._hoverState === HoverState.SHOW) {
          context.show();
        }
      }, context.config.delay.show);
    };

    _proto._leave = function _leave(event, context) {
      var dataKey = this.constructor.DATA_KEY;
      context = context || $(event.currentTarget).data(dataKey);

      if (!context) {
        context = new this.constructor(event.currentTarget, this._getDelegateConfig());
        $(event.currentTarget).data(dataKey, context);
      }

      if (event) {
        context._activeTrigger[event.type === 'focusout' ? Trigger.FOCUS : Trigger.HOVER] = false;
      }

      if (context._isWithActiveTrigger()) {
        return;
      }

      clearTimeout(context._timeout);
      context._hoverState = HoverState.OUT;

      if (!context.config.delay || !context.config.delay.hide) {
        context.hide();
        return;
      }

      context._timeout = setTimeout(function () {
        if (context._hoverState === HoverState.OUT) {
          context.hide();
        }
      }, context.config.delay.hide);
    };

    _proto._isWithActiveTrigger = function _isWithActiveTrigger() {
      for (var trigger in this._activeTrigger) {
        if (this._activeTrigger[trigger]) {
          return true;
        }
      }

      return false;
    };

    _proto._getConfig = function _getConfig(config) {
      config = _objectSpread({}, this.constructor.Default, $(this.element).data(), typeof config === 'object' && config ? config : {});

      if (typeof config.delay === 'number') {
        config.delay = {
          show: config.delay,
          hide: config.delay
        };
      }

      if (typeof config.title === 'number') {
        config.title = config.title.toString();
      }

      if (typeof config.content === 'number') {
        config.content = config.content.toString();
      }

      Util.typeCheckConfig(NAME$6, config, this.constructor.DefaultType);
      return config;
    };

    _proto._getDelegateConfig = function _getDelegateConfig() {
      var config = {};

      if (this.config) {
        for (var key in this.config) {
          if (this.constructor.Default[key] !== this.config[key]) {
            config[key] = this.config[key];
          }
        }
      }

      return config;
    };

    _proto._cleanTipClass = function _cleanTipClass() {
      var $tip = $(this.getTipElement());
      var tabClass = $tip.attr('class').match(BSCLS_PREFIX_REGEX);

      if (tabClass !== null && tabClass.length) {
        $tip.removeClass(tabClass.join(''));
      }
    };

    _proto._handlePopperPlacementChange = function _handlePopperPlacementChange(popperData) {
      var popperInstance = popperData.instance;
      this.tip = popperInstance.popper;

      this._cleanTipClass();

      this.addAttachmentClass(this._getAttachment(popperData.placement));
    };

    _proto._fixTransition = function _fixTransition() {
      var tip = this.getTipElement();
      var initConfigAnimation = this.config.animation;

      if (tip.getAttribute('x-placement') !== null) {
        return;
      }

      $(tip).removeClass(ClassName$6.FADE);
      this.config.animation = false;
      this.hide();
      this.show();
      this.config.animation = initConfigAnimation;
    }; // Static


    Tooltip._jQueryInterface = function _jQueryInterface(config) {
      return this.each(function () {
        var data = $(this).data(DATA_KEY$6);

        var _config = typeof config === 'object' && config;

        if (!data && /dispose|hide/.test(config)) {
          return;
        }

        if (!data) {
          data = new Tooltip(this, _config);
          $(this).data(DATA_KEY$6, data);
        }

        if (typeof config === 'string') {
          if (typeof data[config] === 'undefined') {
            throw new TypeError("No method named \"" + config + "\"");
          }

          data[config]();
        }
      });
    };

    _createClass(Tooltip, null, [{
      key: "VERSION",
      get: function get() {
        return VERSION$6;
      }
    }, {
      key: "Default",
      get: function get() {
        return Default$4;
      }
    }, {
      key: "NAME",
      get: function get() {
        return NAME$6;
      }
    }, {
      key: "DATA_KEY",
      get: function get() {
        return DATA_KEY$6;
      }
    }, {
      key: "Event",
      get: function get() {
        return Event$6;
      }
    }, {
      key: "EVENT_KEY",
      get: function get() {
        return EVENT_KEY$6;
      }
    }, {
      key: "DefaultType",
      get: function get() {
        return DefaultType$4;
      }
    }]);

    return Tooltip;
  }();
  /**
   * ------------------------------------------------------------------------
   * jQuery
   * ------------------------------------------------------------------------
   */


  $.fn[NAME$6] = Tooltip._jQueryInterface;
  $.fn[NAME$6].Constructor = Tooltip;

  $.fn[NAME$6].noConflict = function () {
    $.fn[NAME$6] = JQUERY_NO_CONFLICT$6;
    return Tooltip._jQueryInterface;
  };

  /**
   * ------------------------------------------------------------------------
   * Constants
   * ------------------------------------------------------------------------
   */

  var NAME$7 = 'popover';
  var VERSION$7 = '4.2.1';
  var DATA_KEY$7 = 'bs.popover';
  var EVENT_KEY$7 = "." + DATA_KEY$7;
  var JQUERY_NO_CONFLICT$7 = $.fn[NAME$7];
  var CLASS_PREFIX$1 = 'bs-popover';
  var BSCLS_PREFIX_REGEX$1 = new RegExp("(^|\\s)" + CLASS_PREFIX$1 + "\\S+", 'g');

  var Default$5 = _objectSpread({}, Tooltip.Default, {
    placement: 'right',
    trigger: 'click',
    content: '',
    template: '<div class="popover" role="tooltip">' + '<div class="arrow"></div>' + '<h3 class="popover-header"></h3>' + '<div class="popover-body"></div></div>'
  });

  var DefaultType$5 = _objectSpread({}, Tooltip.DefaultType, {
    content: '(string|element|function)'
  });

  var ClassName$7 = {
    FADE: 'fade',
    SHOW: 'show'
  };
  var Selector$7 = {
    TITLE: '.popover-header',
    CONTENT: '.popover-body'
  };
  var Event$7 = {
    HIDE: "hide" + EVENT_KEY$7,
    HIDDEN: "hidden" + EVENT_KEY$7,
    SHOW: "show" + EVENT_KEY$7,
    SHOWN: "shown" + EVENT_KEY$7,
    INSERTED: "inserted" + EVENT_KEY$7,
    CLICK: "click" + EVENT_KEY$7,
    FOCUSIN: "focusin" + EVENT_KEY$7,
    FOCUSOUT: "focusout" + EVENT_KEY$7,
    MOUSEENTER: "mouseenter" + EVENT_KEY$7,
    MOUSELEAVE: "mouseleave" + EVENT_KEY$7
    /**
     * ------------------------------------------------------------------------
     * Class Definition
     * ------------------------------------------------------------------------
     */

  };

  var Popover =
  /*#__PURE__*/
  function (_Tooltip) {
    _inheritsLoose(Popover, _Tooltip);

    function Popover() {
      return _Tooltip.apply(this, arguments) || this;
    }

    var _proto = Popover.prototype;

    // Overrides
    _proto.isWithContent = function isWithContent() {
      return this.getTitle() || this._getContent();
    };

    _proto.addAttachmentClass = function addAttachmentClass(attachment) {
      $(this.getTipElement()).addClass(CLASS_PREFIX$1 + "-" + attachment);
    };

    _proto.getTipElement = function getTipElement() {
      this.tip = this.tip || $(this.config.template)[0];
      return this.tip;
    };

    _proto.setContent = function setContent() {
      var $tip = $(this.getTipElement()); // We use append for html objects to maintain js events

      this.setElementContent($tip.find(Selector$7.TITLE), this.getTitle());

      var content = this._getContent();

      if (typeof content === 'function') {
        content = content.call(this.element);
      }

      this.setElementContent($tip.find(Selector$7.CONTENT), content);
      $tip.removeClass(ClassName$7.FADE + " " + ClassName$7.SHOW);
    }; // Private


    _proto._getContent = function _getContent() {
      return this.element.getAttribute('data-content') || this.config.content;
    };

    _proto._cleanTipClass = function _cleanTipClass() {
      var $tip = $(this.getTipElement());
      var tabClass = $tip.attr('class').match(BSCLS_PREFIX_REGEX$1);

      if (tabClass !== null && tabClass.length > 0) {
        $tip.removeClass(tabClass.join(''));
      }
    }; // Static


    Popover._jQueryInterface = function _jQueryInterface(config) {
      return this.each(function () {
        var data = $(this).data(DATA_KEY$7);

        var _config = typeof config === 'object' ? config : null;

        if (!data && /dispose|hide/.test(config)) {
          return;
        }

        if (!data) {
          data = new Popover(this, _config);
          $(this).data(DATA_KEY$7, data);
        }

        if (typeof config === 'string') {
          if (typeof data[config] === 'undefined') {
            throw new TypeError("No method named \"" + config + "\"");
          }

          data[config]();
        }
      });
    };

    _createClass(Popover, null, [{
      key: "VERSION",
      // Getters
      get: function get() {
        return VERSION$7;
      }
    }, {
      key: "Default",
      get: function get() {
        return Default$5;
      }
    }, {
      key: "NAME",
      get: function get() {
        return NAME$7;
      }
    }, {
      key: "DATA_KEY",
      get: function get() {
        return DATA_KEY$7;
      }
    }, {
      key: "Event",
      get: function get() {
        return Event$7;
      }
    }, {
      key: "EVENT_KEY",
      get: function get() {
        return EVENT_KEY$7;
      }
    }, {
      key: "DefaultType",
      get: function get() {
        return DefaultType$5;
      }
    }]);

    return Popover;
  }(Tooltip);
  /**
   * ------------------------------------------------------------------------
   * jQuery
   * ------------------------------------------------------------------------
   */


  $.fn[NAME$7] = Popover._jQueryInterface;
  $.fn[NAME$7].Constructor = Popover;

  $.fn[NAME$7].noConflict = function () {
    $.fn[NAME$7] = JQUERY_NO_CONFLICT$7;
    return Popover._jQueryInterface;
  };

  /**
   * ------------------------------------------------------------------------
   * Constants
   * ------------------------------------------------------------------------
   */

  var NAME$8 = 'scrollspy';
  var VERSION$8 = '4.2.1';
  var DATA_KEY$8 = 'bs.scrollspy';
  var EVENT_KEY$8 = "." + DATA_KEY$8;
  var DATA_API_KEY$6 = '.data-api';
  var JQUERY_NO_CONFLICT$8 = $.fn[NAME$8];
  var Default$6 = {
    offset: 10,
    method: 'auto',
    target: ''
  };
  var DefaultType$6 = {
    offset: 'number',
    method: 'string',
    target: '(string|element)'
  };
  var Event$8 = {
    ACTIVATE: "activate" + EVENT_KEY$8,
    SCROLL: "scroll" + EVENT_KEY$8,
    LOAD_DATA_API: "load" + EVENT_KEY$8 + DATA_API_KEY$6
  };
  var ClassName$8 = {
    DROPDOWN_ITEM: 'dropdown-item',
    DROPDOWN_MENU: 'dropdown-menu',
    ACTIVE: 'active'
  };
  var Selector$8 = {
    DATA_SPY: '[data-spy="scroll"]',
    ACTIVE: '.active',
    NAV_LIST_GROUP: '.nav, .list-group',
    NAV_LINKS: '.nav-link',
    NAV_ITEMS: '.nav-item',
    LIST_ITEMS: '.list-group-item',
    DROPDOWN: '.dropdown',
    DROPDOWN_ITEMS: '.dropdown-item',
    DROPDOWN_TOGGLE: '.dropdown-toggle'
  };
  var OffsetMethod = {
    OFFSET: 'offset',
    POSITION: 'position'
    /**
     * ------------------------------------------------------------------------
     * Class Definition
     * ------------------------------------------------------------------------
     */

  };

  var ScrollSpy =
  /*#__PURE__*/
  function () {
    function ScrollSpy(element, config) {
      var _this = this;

      this._element = element;
      this._scrollElement = element.tagName === 'BODY' ? window : element;
      this._config = this._getConfig(config);
      this._selector = this._config.target + " " + Selector$8.NAV_LINKS + "," + (this._config.target + " " + Selector$8.LIST_ITEMS + ",") + (this._config.target + " " + Selector$8.DROPDOWN_ITEMS);
      this._offsets = [];
      this._targets = [];
      this._activeTarget = null;
      this._scrollHeight = 0;
      $(this._scrollElement).on(Event$8.SCROLL, function (event) {
        return _this._process(event);
      });
      this.refresh();

      this._process();
    } // Getters


    var _proto = ScrollSpy.prototype;

    // Public
    _proto.refresh = function refresh() {
      var _this2 = this;

      var autoMethod = this._scrollElement === this._scrollElement.window ? OffsetMethod.OFFSET : OffsetMethod.POSITION;
      var offsetMethod = this._config.method === 'auto' ? autoMethod : this._config.method;
      var offsetBase = offsetMethod === OffsetMethod.POSITION ? this._getScrollTop() : 0;
      this._offsets = [];
      this._targets = [];
      this._scrollHeight = this._getScrollHeight();
      var targets = [].slice.call(document.querySelectorAll(this._selector));
      targets.map(function (element) {
        var target;
        var targetSelector = Util.getSelectorFromElement(element);

        if (targetSelector) {
          target = document.querySelector(targetSelector);
        }

        if (target) {
          var targetBCR = target.getBoundingClientRect();

          if (targetBCR.width || targetBCR.height) {
            // TODO (fat): remove sketch reliance on jQuery position/offset
            return [$(target)[offsetMethod]().top + offsetBase, targetSelector];
          }
        }

        return null;
      }).filter(function (item) {
        return item;
      }).sort(function (a, b) {
        return a[0] - b[0];
      }).forEach(function (item) {
        _this2._offsets.push(item[0]);

        _this2._targets.push(item[1]);
      });
    };

    _proto.dispose = function dispose() {
      $.removeData(this._element, DATA_KEY$8);
      $(this._scrollElement).off(EVENT_KEY$8);
      this._element = null;
      this._scrollElement = null;
      this._config = null;
      this._selector = null;
      this._offsets = null;
      this._targets = null;
      this._activeTarget = null;
      this._scrollHeight = null;
    }; // Private


    _proto._getConfig = function _getConfig(config) {
      config = _objectSpread({}, Default$6, typeof config === 'object' && config ? config : {});

      if (typeof config.target !== 'string') {
        var id = $(config.target).attr('id');

        if (!id) {
          id = Util.getUID(NAME$8);
          $(config.target).attr('id', id);
        }

        config.target = "#" + id;
      }

      Util.typeCheckConfig(NAME$8, config, DefaultType$6);
      return config;
    };

    _proto._getScrollTop = function _getScrollTop() {
      return this._scrollElement === window ? this._scrollElement.pageYOffset : this._scrollElement.scrollTop;
    };

    _proto._getScrollHeight = function _getScrollHeight() {
      return this._scrollElement.scrollHeight || Math.max(document.body.scrollHeight, document.documentElement.scrollHeight);
    };

    _proto._getOffsetHeight = function _getOffsetHeight() {
      return this._scrollElement === window ? window.innerHeight : this._scrollElement.getBoundingClientRect().height;
    };

    _proto._process = function _process() {
      var scrollTop = this._getScrollTop() + this._config.offset;

      var scrollHeight = this._getScrollHeight();

      var maxScroll = this._config.offset + scrollHeight - this._getOffsetHeight();

      if (this._scrollHeight !== scrollHeight) {
        this.refresh();
      }

      if (scrollTop >= maxScroll) {
        var target = this._targets[this._targets.length - 1];

        if (this._activeTarget !== target) {
          this._activate(target);
        }

        return;
      }

      if (this._activeTarget && scrollTop < this._offsets[0] && this._offsets[0] > 0) {
        this._activeTarget = null;

        this._clear();

        return;
      }

      var offsetLength = this._offsets.length;

      for (var i = offsetLength; i--;) {
        var isActiveTarget = this._activeTarget !== this._targets[i] && scrollTop >= this._offsets[i] && (typeof this._offsets[i + 1] === 'undefined' || scrollTop < this._offsets[i + 1]);

        if (isActiveTarget) {
          this._activate(this._targets[i]);
        }
      }
    };

    _proto._activate = function _activate(target) {
      this._activeTarget = target;

      this._clear();

      var queries = this._selector.split(',').map(function (selector) {
        return selector + "[data-target=\"" + target + "\"]," + selector + "[href=\"" + target + "\"]";
      });

      var $link = $([].slice.call(document.querySelectorAll(queries.join(','))));

      if ($link.hasClass(ClassName$8.DROPDOWN_ITEM)) {
        $link.closest(Selector$8.DROPDOWN).find(Selector$8.DROPDOWN_TOGGLE).addClass(ClassName$8.ACTIVE);
        $link.addClass(ClassName$8.ACTIVE);
      } else {
        // Set triggered link as active
        $link.addClass(ClassName$8.ACTIVE); // Set triggered links parents as active
        // With both <ul> and <nav> markup a parent is the previous sibling of any nav ancestor

        $link.parents(Selector$8.NAV_LIST_GROUP).prev(Selector$8.NAV_LINKS + ", " + Selector$8.LIST_ITEMS).addClass(ClassName$8.ACTIVE); // Handle special case when .nav-link is inside .nav-item

        $link.parents(Selector$8.NAV_LIST_GROUP).prev(Selector$8.NAV_ITEMS).children(Selector$8.NAV_LINKS).addClass(ClassName$8.ACTIVE);
      }

      $(this._scrollElement).trigger(Event$8.ACTIVATE, {
        relatedTarget: target
      });
    };

    _proto._clear = function _clear() {
      [].slice.call(document.querySelectorAll(this._selector)).filter(function (node) {
        return node.classList.contains(ClassName$8.ACTIVE);
      }).forEach(function (node) {
        return node.classList.remove(ClassName$8.ACTIVE);
      });
    }; // Static


    ScrollSpy._jQueryInterface = function _jQueryInterface(config) {
      return this.each(function () {
        var data = $(this).data(DATA_KEY$8);

        var _config = typeof config === 'object' && config;

        if (!data) {
          data = new ScrollSpy(this, _config);
          $(this).data(DATA_KEY$8, data);
        }

        if (typeof config === 'string') {
          if (typeof data[config] === 'undefined') {
            throw new TypeError("No method named \"" + config + "\"");
          }

          data[config]();
        }
      });
    };

    _createClass(ScrollSpy, null, [{
      key: "VERSION",
      get: function get() {
        return VERSION$8;
      }
    }, {
      key: "Default",
      get: function get() {
        return Default$6;
      }
    }]);

    return ScrollSpy;
  }();
  /**
   * ------------------------------------------------------------------------
   * Data Api implementation
   * ------------------------------------------------------------------------
   */


  $(window).on(Event$8.LOAD_DATA_API, function () {
    var scrollSpys = [].slice.call(document.querySelectorAll(Selector$8.DATA_SPY));
    var scrollSpysLength = scrollSpys.length;

    for (var i = scrollSpysLength; i--;) {
      var $spy = $(scrollSpys[i]);

      ScrollSpy._jQueryInterface.call($spy, $spy.data());
    }
  });
  /**
   * ------------------------------------------------------------------------
   * jQuery
   * ------------------------------------------------------------------------
   */

  $.fn[NAME$8] = ScrollSpy._jQueryInterface;
  $.fn[NAME$8].Constructor = ScrollSpy;

  $.fn[NAME$8].noConflict = function () {
    $.fn[NAME$8] = JQUERY_NO_CONFLICT$8;
    return ScrollSpy._jQueryInterface;
  };

  /**
   * ------------------------------------------------------------------------
   * Constants
   * ------------------------------------------------------------------------
   */

  var NAME$9 = 'tab';
  var VERSION$9 = '4.2.1';
  var DATA_KEY$9 = 'bs.tab';
  var EVENT_KEY$9 = "." + DATA_KEY$9;
  var DATA_API_KEY$7 = '.data-api';
  var JQUERY_NO_CONFLICT$9 = $.fn[NAME$9];
  var Event$9 = {
    HIDE: "hide" + EVENT_KEY$9,
    HIDDEN: "hidden" + EVENT_KEY$9,
    SHOW: "show" + EVENT_KEY$9,
    SHOWN: "shown" + EVENT_KEY$9,
    CLICK_DATA_API: "click" + EVENT_KEY$9 + DATA_API_KEY$7
  };
  var ClassName$9 = {
    DROPDOWN_MENU: 'dropdown-menu',
    ACTIVE: 'active',
    DISABLED: 'disabled',
    FADE: 'fade',
    SHOW: 'show'
  };
  var Selector$9 = {
    DROPDOWN: '.dropdown',
    NAV_LIST_GROUP: '.nav, .list-group',
    ACTIVE: '.active',
    ACTIVE_UL: '> li > .active',
    DATA_TOGGLE: '[data-toggle="tab"], [data-toggle="pill"], [data-toggle="list"]',
    DROPDOWN_TOGGLE: '.dropdown-toggle',
    DROPDOWN_ACTIVE_CHILD: '> .dropdown-menu .active'
    /**
     * ------------------------------------------------------------------------
     * Class Definition
     * ------------------------------------------------------------------------
     */

  };

  var Tab =
  /*#__PURE__*/
  function () {
    function Tab(element) {
      this._element = element;
    } // Getters


    var _proto = Tab.prototype;

    // Public
    _proto.show = function show() {
      var _this = this;

      if (this._element.parentNode && this._element.parentNode.nodeType === Node.ELEMENT_NODE && $(this._element).hasClass(ClassName$9.ACTIVE) || $(this._element).hasClass(ClassName$9.DISABLED)) {
        return;
      }

      var target;
      var previous;
      var listElement = $(this._element).closest(Selector$9.NAV_LIST_GROUP)[0];
      var selector = Util.getSelectorFromElement(this._element);

      if (listElement) {
        var itemSelector = listElement.nodeName === 'UL' || listElement.nodeName === 'OL' ? Selector$9.ACTIVE_UL : Selector$9.ACTIVE;
        previous = $.makeArray($(listElement).find(itemSelector));
        previous = previous[previous.length - 1];
      }

      var hideEvent = $.Event(Event$9.HIDE, {
        relatedTarget: this._element
      });
      var showEvent = $.Event(Event$9.SHOW, {
        relatedTarget: previous
      });

      if (previous) {
        $(previous).trigger(hideEvent);
      }

      $(this._element).trigger(showEvent);

      if (showEvent.isDefaultPrevented() || hideEvent.isDefaultPrevented()) {
        return;
      }

      if (selector) {
        target = document.querySelector(selector);
      }

      this._activate(this._element, listElement);

      var complete = function complete() {
        var hiddenEvent = $.Event(Event$9.HIDDEN, {
          relatedTarget: _this._element
        });
        var shownEvent = $.Event(Event$9.SHOWN, {
          relatedTarget: previous
        });
        $(previous).trigger(hiddenEvent);
        $(_this._element).trigger(shownEvent);
      };

      if (target) {
        this._activate(target, target.parentNode, complete);
      } else {
        complete();
      }
    };

    _proto.dispose = function dispose() {
      $.removeData(this._element, DATA_KEY$9);
      this._element = null;
    }; // Private


    _proto._activate = function _activate(element, container, callback) {
      var _this2 = this;

      var activeElements = container && (container.nodeName === 'UL' || container.nodeName === 'OL') ? $(container).find(Selector$9.ACTIVE_UL) : $(container).children(Selector$9.ACTIVE);
      var active = activeElements[0];
      var isTransitioning = callback && active && $(active).hasClass(ClassName$9.FADE);

      var complete = function complete() {
        return _this2._transitionComplete(element, active, callback);
      };

      if (active && isTransitioning) {
        var transitionDuration = Util.getTransitionDurationFromElement(active);
        $(active).removeClass(ClassName$9.SHOW).one(Util.TRANSITION_END, complete).emulateTransitionEnd(transitionDuration);
      } else {
        complete();
      }
    };

    _proto._transitionComplete = function _transitionComplete(element, active, callback) {
      if (active) {
        $(active).removeClass(ClassName$9.ACTIVE);
        var dropdownChild = $(active.parentNode).find(Selector$9.DROPDOWN_ACTIVE_CHILD)[0];

        if (dropdownChild) {
          $(dropdownChild).removeClass(ClassName$9.ACTIVE);
        }

        if (active.getAttribute('role') === 'tab') {
          active.setAttribute('aria-selected', false);
        }
      }

      $(element).addClass(ClassName$9.ACTIVE);

      if (element.getAttribute('role') === 'tab') {
        element.setAttribute('aria-selected', true);
      }

      Util.reflow(element);
      $(element).addClass(ClassName$9.SHOW);

      if (element.parentNode && $(element.parentNode).hasClass(ClassName$9.DROPDOWN_MENU)) {
        var dropdownElement = $(element).closest(Selector$9.DROPDOWN)[0];

        if (dropdownElement) {
          var dropdownToggleList = [].slice.call(dropdownElement.querySelectorAll(Selector$9.DROPDOWN_TOGGLE));
          $(dropdownToggleList).addClass(ClassName$9.ACTIVE);
        }

        element.setAttribute('aria-expanded', true);
      }

      if (callback) {
        callback();
      }
    }; // Static


    Tab._jQueryInterface = function _jQueryInterface(config) {
      return this.each(function () {
        var $this = $(this);
        var data = $this.data(DATA_KEY$9);

        if (!data) {
          data = new Tab(this);
          $this.data(DATA_KEY$9, data);
        }

        if (typeof config === 'string') {
          if (typeof data[config] === 'undefined') {
            throw new TypeError("No method named \"" + config + "\"");
          }

          data[config]();
        }
      });
    };

    _createClass(Tab, null, [{
      key: "VERSION",
      get: function get() {
        return VERSION$9;
      }
    }]);

    return Tab;
  }();
  /**
   * ------------------------------------------------------------------------
   * Data Api implementation
   * ------------------------------------------------------------------------
   */


  $(document).on(Event$9.CLICK_DATA_API, Selector$9.DATA_TOGGLE, function (event) {
    event.preventDefault();

    Tab._jQueryInterface.call($(this), 'show');
  });
  /**
   * ------------------------------------------------------------------------
   * jQuery
   * ------------------------------------------------------------------------
   */

  $.fn[NAME$9] = Tab._jQueryInterface;
  $.fn[NAME$9].Constructor = Tab;

  $.fn[NAME$9].noConflict = function () {
    $.fn[NAME$9] = JQUERY_NO_CONFLICT$9;
    return Tab._jQueryInterface;
  };

  /**
   * ------------------------------------------------------------------------
   * Constants
   * ------------------------------------------------------------------------
   */

  var NAME$a = 'toast';
  var VERSION$a = '4.2.1';
  var DATA_KEY$a = 'bs.toast';
  var EVENT_KEY$a = "." + DATA_KEY$a;
  var JQUERY_NO_CONFLICT$a = $.fn[NAME$a];
  var Event$a = {
    CLICK_DISMISS: "click.dismiss" + EVENT_KEY$a,
    HIDE: "hide" + EVENT_KEY$a,
    HIDDEN: "hidden" + EVENT_KEY$a,
    SHOW: "show" + EVENT_KEY$a,
    SHOWN: "shown" + EVENT_KEY$a
  };
  var ClassName$a = {
    FADE: 'fade',
    HIDE: 'hide',
    SHOW: 'show',
    SHOWING: 'showing'
  };
  var DefaultType$7 = {
    animation: 'boolean',
    autohide: 'boolean',
    delay: 'number'
  };
  var Default$7 = {
    animation: true,
    autohide: true,
    delay: 500
  };
  var Selector$a = {
    DATA_DISMISS: '[data-dismiss="toast"]'
    /**
     * ------------------------------------------------------------------------
     * Class Definition
     * ------------------------------------------------------------------------
     */

  };

  var Toast =
  /*#__PURE__*/
  function () {
    function Toast(element, config) {
      this._element = element;
      this._config = this._getConfig(config);
      this._timeout = null;

      this._setListeners();
    } // Getters


    var _proto = Toast.prototype;

    // Public
    _proto.show = function show() {
      var _this = this;

      $(this._element).trigger(Event$a.SHOW);

      if (this._config.animation) {
        this._element.classList.add(ClassName$a.FADE);
      }

      var complete = function complete() {
        _this._element.classList.remove(ClassName$a.SHOWING);

        _this._element.classList.add(ClassName$a.SHOW);

        $(_this._element).trigger(Event$a.SHOWN);

        if (_this._config.autohide) {
          _this.hide();
        }
      };

      this._element.classList.remove(ClassName$a.HIDE);

      this._element.classList.add(ClassName$a.SHOWING);

      if (this._config.animation) {
        var transitionDuration = Util.getTransitionDurationFromElement(this._element);
        $(this._element).one(Util.TRANSITION_END, complete).emulateTransitionEnd(transitionDuration);
      } else {
        complete();
      }
    };

    _proto.hide = function hide(withoutTimeout) {
      var _this2 = this;

      if (!this._element.classList.contains(ClassName$a.SHOW)) {
        return;
      }

      $(this._element).trigger(Event$a.HIDE);

      if (withoutTimeout) {
        this._close();
      } else {
        this._timeout = setTimeout(function () {
          _this2._close();
        }, this._config.delay);
      }
    };

    _proto.dispose = function dispose() {
      clearTimeout(this._timeout);
      this._timeout = null;

      if (this._element.classList.contains(ClassName$a.SHOW)) {
        this._element.classList.remove(ClassName$a.SHOW);
      }

      $(this._element).off(Event$a.CLICK_DISMISS);
      $.removeData(this._element, DATA_KEY$a);
      this._element = null;
      this._config = null;
    }; // Private


    _proto._getConfig = function _getConfig(config) {
      config = _objectSpread({}, Default$7, $(this._element).data(), typeof config === 'object' && config ? config : {});
      Util.typeCheckConfig(NAME$a, config, this.constructor.DefaultType);
      return config;
    };

    _proto._setListeners = function _setListeners() {
      var _this3 = this;

      $(this._element).on(Event$a.CLICK_DISMISS, Selector$a.DATA_DISMISS, function () {
        return _this3.hide(true);
      });
    };

    _proto._close = function _close() {
      var _this4 = this;

      var complete = function complete() {
        _this4._element.classList.add(ClassName$a.HIDE);

        $(_this4._element).trigger(Event$a.HIDDEN);
      };

      this._element.classList.remove(ClassName$a.SHOW);

      if (this._config.animation) {
        var transitionDuration = Util.getTransitionDurationFromElement(this._element);
        $(this._element).one(Util.TRANSITION_END, complete).emulateTransitionEnd(transitionDuration);
      } else {
        complete();
      }
    }; // Static


    Toast._jQueryInterface = function _jQueryInterface(config) {
      return this.each(function () {
        var $element = $(this);
        var data = $element.data(DATA_KEY$a);

        var _config = typeof config === 'object' && config;

        if (!data) {
          data = new Toast(this, _config);
          $element.data(DATA_KEY$a, data);
        }

        if (typeof config === 'string') {
          if (typeof data[config] === 'undefined') {
            throw new TypeError("No method named \"" + config + "\"");
          }

          data[config](this);
        }
      });
    };

    _createClass(Toast, null, [{
      key: "VERSION",
      get: function get() {
        return VERSION$a;
      }
    }, {
      key: "DefaultType",
      get: function get() {
        return DefaultType$7;
      }
    }]);

    return Toast;
  }();
  /**
   * ------------------------------------------------------------------------
   * jQuery
   * ------------------------------------------------------------------------
   */


  $.fn[NAME$a] = Toast._jQueryInterface;
  $.fn[NAME$a].Constructor = Toast;

  $.fn[NAME$a].noConflict = function () {
    $.fn[NAME$a] = JQUERY_NO_CONFLICT$a;
    return Toast._jQueryInterface;
  };

  /**
   * --------------------------------------------------------------------------
   * Bootstrap (v4.2.1): index.js
   * Licensed under MIT (https://github.com/twbs/bootstrap/blob/master/LICENSE)
   * --------------------------------------------------------------------------
   */

  (function () {
    if (typeof $ === 'undefined') {
      throw new TypeError('Bootstrap\'s JavaScript requires jQuery. jQuery must be included before Bootstrap\'s JavaScript.');
    }

    var version = $.fn.jquery.split(' ')[0].split('.');
    var minMajor = 1;
    var ltMajor = 2;
    var minMinor = 9;
    var minPatch = 1;
    var maxMajor = 4;

    if (version[0] < ltMajor && version[1] < minMinor || version[0] === minMajor && version[1] === minMinor && version[2] < minPatch || version[0] >= maxMajor) {
      throw new Error('Bootstrap\'s JavaScript requires at least jQuery v1.9.1 but less than v4.0.0');
    }
  })();

  exports.Util = Util;
  exports.Alert = Alert;
  exports.Button = Button;
  exports.Carousel = Carousel;
  exports.Collapse = Collapse;
  exports.Dropdown = Dropdown;
  exports.Modal = Modal;
  exports.Popover = Popover;
  exports.Scrollspy = ScrollSpy;
  exports.Tab = Tab;
  exports.Toast = Toast;
  exports.Tooltip = Tooltip;

  Object.defineProperty(exports, '__esModule', { value: true });

})));
//# sourceMappingURL=bootstrap.js.map

!function(e,t){if("function"==typeof define&&define.amd)define(["exports"],t);else if("undefined"!=typeof exports)t(exports);else{var o={};t(o),e.bodyScrollLock=o}}(this,function(exports){"use strict";function r(e){if(Array.isArray(e)){for(var t=0,o=Array(e.length);t<e.length;t++)o[t]=e[t];return o}return Array.from(e)}Object.defineProperty(exports,"__esModule",{value:!0});var l=!1;if("undefined"!=typeof window){var e={get passive(){l=!0}};window.addEventListener("testPassive",null,e),window.removeEventListener("testPassive",null,e)}var d="undefined"!=typeof window&&window.navigator&&window.navigator.platform&&/iP(ad|hone|od)/.test(window.navigator.platform),c=[],u=!1,a=-1,s=void 0,v=void 0,f=function(t){return c.some(function(e){return!(!e.options.allowTouchMove||!e.options.allowTouchMove(t))})},m=function(e){var t=e||window.event;return!!f(t.target)||(1<t.touches.length||(t.preventDefault&&t.preventDefault(),!1))},o=function(){setTimeout(function(){void 0!==v&&(document.body.style.paddingRight=v,v=void 0),void 0!==s&&(document.body.style.overflow=s,s=void 0)})};exports.disableBodyScroll=function(i,e){if(d){if(!i)return void console.error("disableBodyScroll unsuccessful - targetElement must be provided when calling disableBodyScroll on IOS devices.");if(i&&!c.some(function(e){return e.targetElement===i})){var t={targetElement:i,options:e||{}};c=[].concat(r(c),[t]),i.ontouchstart=function(e){1===e.targetTouches.length&&(a=e.targetTouches[0].clientY)},i.ontouchmove=function(e){var t,o,n,r;1===e.targetTouches.length&&(o=i,r=(t=e).targetTouches[0].clientY-a,!f(t.target)&&(o&&0===o.scrollTop&&0<r?m(t):(n=o)&&n.scrollHeight-n.scrollTop<=n.clientHeight&&r<0?m(t):t.stopPropagation()))},u||(document.addEventListener("touchmove",m,l?{passive:!1}:void 0),u=!0)}}else{n=e,setTimeout(function(){if(void 0===v){var e=!!n&&!0===n.reserveScrollBarGap,t=window.innerWidth-document.documentElement.clientWidth;e&&0<t&&(v=document.body.style.paddingRight,document.body.style.paddingRight=t+"px")}void 0===s&&(s=document.body.style.overflow,document.body.style.overflow="hidden")});var o={targetElement:i,options:e||{}};c=[].concat(r(c),[o])}var n},exports.clearAllBodyScrollLocks=function(){d?(c.forEach(function(e){e.targetElement.ontouchstart=null,e.targetElement.ontouchmove=null}),u&&(document.removeEventListener("touchmove",m,l?{passive:!1}:void 0),u=!1),c=[],a=-1):(o(),c=[])},exports.enableBodyScroll=function(t){if(d){if(!t)return void console.error("enableBodyScroll unsuccessful - targetElement must be provided when calling enableBodyScroll on IOS devices.");t.ontouchstart=null,t.ontouchmove=null,c=c.filter(function(e){return e.targetElement!==t}),u&&0===c.length&&(document.removeEventListener("touchmove",m,l?{passive:!1}:void 0),u=!1)}else 1===c.length&&c[0].targetElement===t?(o(),c=[]):c=c.filter(function(e){return e.targetElement!==t})}});

var cookie = function (key, value, options) {

	// key and at least value given, set cookie...
	if (arguments.length > 1 && String(value) !== "[object Object]") {
		options = jQuery.extend({}, options);

		if (value === null || value === undefined) {
			options.expires = -1;
		}

		if (typeof options.expires === 'number') {
			var days = options.expires, t = options.expires = new Date();
			t.setDate(t.getDate() + days);
		}

		value = String(value);

		return (document.cookie = [
			encodeURIComponent(key), '=',
			options.raw ? value : encodeURIComponent(value),
			options.expires ? '; expires=' + options.expires.toUTCString() : '', // use expires attribute, max-age is not supported by IE
			'; path=/',
			options.secure ? '; secure' : ''
		].join(''));
	}

	// key and possibly options given, get cookie...
	options = value || {};
	var result, decode = options.raw ? function (s) { return s; } : decodeURIComponent;
	return (result = new RegExp('(?:^|; )' + encodeURIComponent(key) + '=([^;]*)').exec(document.cookie)) ? decode(result[1]) : null;
};

// ==================================================
// fancyBox v3.5.2
//
// Licensed GPLv3 for open source use
// or fancyBox Commercial License for commercial use
//
// http://fancyapps.com/fancybox/
// Copyright 2018 fancyApps
//
// ==================================================
(function(window, document, $, undefined) {
	"use strict";

	window.console = window.console || {
		info: function(stuff) {}
	};

	// If there's no jQuery, fancyBox can't work
	// =========================================

	if (!$) {
		return;
	}

	// Check if fancyBox is already initialized
	// ========================================

	if ($.fn.fancybox) {
		console.info("fancyBox already initialized");

		return;
	}

	// Private default settings
	// ========================

	var defaults = {
		// Close existing modals
		// Set this to false if you do not need to stack multiple instances
		closeExisting: false,

		// Enable infinite gallery navigation
		loop: false,

		// Horizontal space between slides
		gutter: 50,

		// Enable keyboard navigation
		keyboard: true,

		// Should allow caption to overlap the content
		preventCaptionOverlap: true,

		// Should display navigation arrows at the screen edges
		arrows: true,

		// Should display counter at the top left corner
		infobar: true,

		// Should display close button (using `btnTpl.smallBtn` template) over the content
		// Can be true, false, "auto"
		// If "auto" - will be automatically enabled for "html", "inline" or "ajax" items
		smallBtn: "auto",

		// Should display toolbar (buttons at the top)
		// Can be true, false, "auto"
		// If "auto" - will be automatically hidden if "smallBtn" is enabled
		toolbar: "auto",

		// What buttons should appear in the top right corner.
		// Buttons will be created using templates from `btnTpl` option
		// and they will be placed into toolbar (class="fancybox-toolbar"` element)
		buttons: [
			"zoom",
			//"share",
			"slideShow",
			//"fullScreen",
			//"download",
			"thumbs",
			"close"
		],

		// Detect "idle" time in seconds
		idleTime: 3,

		// Disable right-click and use simple image protection for images
		protect: false,

		// Shortcut to make content "modal" - disable keyboard navigtion, hide buttons, etc
		modal: false,

		image: {
			// Wait for images to load before displaying
			//   true  - wait for image to load and then display;
			//   false - display thumbnail and load the full-sized image over top,
			//           requires predefined image dimensions (`data-width` and `data-height` attributes)
			preload: false
		},

		ajax: {
			// Object containing settings for ajax request
			settings: {
				// This helps to indicate that request comes from the modal
				// Feel free to change naming
				data: {
					fancybox: true
				}
			}
		},

		iframe: {
			// Iframe template
			tpl:
				'<iframe id="fancybox-frame{rnd}" name="fancybox-frame{rnd}" class="fancybox-iframe" allowfullscreen allow="autoplay; fullscreen" src=""></iframe>',

			// Preload iframe before displaying it
			// This allows to calculate iframe content width and height
			// (note: Due to "Same Origin Policy", you can't get cross domain data).
			preload: true,

			// Custom CSS styling for iframe wrapping element
			// You can use this to set custom iframe dimensions
			css: {},

			// Iframe tag attributes
			attr: {
				scrolling: "auto"
			}
		},

		// For HTML5 video only
		video: {
			tpl:
				'<video class="fancybox-video" controls controlsList="nodownload" poster="{{poster}}">' +
				'<source src="{{src}}" type="{{format}}" />' +
				'Sorry, your browser doesn\'t support embedded videos, <a href="{{src}}">download</a> and watch with your favorite video player!' +
				"</video>",
			format: "", // custom video format
			autoStart: true
		},

		// Default content type if cannot be detected automatically
		defaultType: "image",

		// Open/close animation type
		// Possible values:
		//   false            - disable
		//   "zoom"           - zoom images from/to thumbnail
		//   "fade"
		//   "zoom-in-out"
		//
		animationEffect: "zoom",

		// Duration in ms for open/close animation
		animationDuration: 366,

		// Should image change opacity while zooming
		// If opacity is "auto", then opacity will be changed if image and thumbnail have different aspect ratios
		zoomOpacity: "auto",

		// Transition effect between slides
		//
		// Possible values:
		//   false            - disable
		//   "fade'
		//   "slide'
		//   "circular'
		//   "tube'
		//   "zoom-in-out'
		//   "rotate'
		//
		transitionEffect: "fade",

		// Duration in ms for transition animation
		transitionDuration: 366,

		// Custom CSS class for slide element
		slideClass: "",

		// Custom CSS class for layout
		baseClass: "",

		// Base template for layout
		baseTpl:
			'<div class="fancybox-container" role="dialog" tabindex="-1">' +
			'<div class="fancybox-bg"></div>' +
			'<div class="fancybox-inner">' +
			'<div class="fancybox-infobar"><span data-fancybox-index></span>&nbsp;/&nbsp;<span data-fancybox-count></span></div>' +
			'<div class="fancybox-toolbar">{{buttons}}</div>' +
			'<div class="fancybox-navigation">{{arrows}}</div>' +
			'<div class="fancybox-stage"></div>' +
			'<div class="fancybox-caption"></div>' +
			"</div>" +
			"</div>",

		// Loading indicator template
		spinnerTpl: '<div class="fancybox-loading"></div>',

		// Error message template
		errorTpl: '<div class="fancybox-error"><p>{{ERROR}}</p></div>',

		btnTpl: {
			download:
				'<a download data-fancybox-download class="fancybox-button fancybox-button--download" title="{{DOWNLOAD}}" href="javascript:;">' +
				'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M18.62 17.09V19H5.38v-1.91zm-2.97-6.96L17 11.45l-5 4.87-5-4.87 1.36-1.32 2.68 2.64V5h1.92v7.77z"/></svg>' +
				"</a>",

			zoom:
				'<button data-fancybox-zoom class="fancybox-button fancybox-button--zoom" title="{{ZOOM}}">' +
				'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M18.7 17.3l-3-3a5.9 5.9 0 0 0-.6-7.6 5.9 5.9 0 0 0-8.4 0 5.9 5.9 0 0 0 0 8.4 5.9 5.9 0 0 0 7.7.7l3 3a1 1 0 0 0 1.3 0c.4-.5.4-1 0-1.5zM8.1 13.8a4 4 0 0 1 0-5.7 4 4 0 0 1 5.7 0 4 4 0 0 1 0 5.7 4 4 0 0 1-5.7 0z"/></svg>' +
				"</button>",

			close:
				'<button data-fancybox-close class="fancybox-button fancybox-button--close" title="{{CLOSE}}">' +
				'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12 10.6L6.6 5.2 5.2 6.6l5.4 5.4-5.4 5.4 1.4 1.4 5.4-5.4 5.4 5.4 1.4-1.4-5.4-5.4 5.4-5.4-1.4-1.4-5.4 5.4z"/></svg>' +
				"</button>",

			// Arrows
			arrowLeft:
				'<button data-fancybox-prev class="fancybox-button fancybox-button--arrow_left" title="{{PREV}}">' +
				'<div><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M11.28 15.7l-1.34 1.37L5 12l4.94-5.07 1.34 1.38-2.68 2.72H19v1.94H8.6z"/></svg></div>' +
				"</button>",

			arrowRight:
				'<button data-fancybox-next class="fancybox-button fancybox-button--arrow_right" title="{{NEXT}}">' +
				'<div><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M15.4 12.97l-2.68 2.72 1.34 1.38L19 12l-4.94-5.07-1.34 1.38 2.68 2.72H5v1.94z"/></svg></div>' +
				"</button>",

			// This small close button will be appended to your html/inline/ajax content by default,
			// if "smallBtn" option is not set to false
			smallBtn:
				'<button type="button" data-fancybox-close class="fancybox-button fancybox-close-small" title="{{CLOSE}}">' +
				'<svg xmlns="http://www.w3.org/2000/svg" version="1" viewBox="0 0 24 24"><path d="M13 12l5-5-1-1-5 5-5-5-1 1 5 5-5 5 1 1 5-5 5 5 1-1z"/></svg>' +
				"</button>"
		},

		// Container is injected into this element
		parentEl: "body",

		// Hide browser vertical scrollbars; use at your own risk
		hideScrollbar: true,

		// Focus handling
		// ==============

		// Try to focus on the first focusable element after opening
		autoFocus: true,

		// Put focus back to active element after closing
		backFocus: true,

		// Do not let user to focus on element outside modal content
		trapFocus: true,

		// Module specific options
		// =======================

		fullScreen: {
			autoStart: false
		},

		// Set `touch: false` to disable panning/swiping
		touch: {
			vertical: true, // Allow to drag content vertically
			momentum: true // Continue movement after releasing mouse/touch when panning
		},

		// Hash value when initializing manually,
		// set `false` to disable hash change
		hash: null,

		// Customize or add new media types
		// Example:
		/*
      media : {
        youtube : {
          params : {
            autoplay : 0
          }
        }
      }
    */
		media: {},

		slideShow: {
			autoStart: false,
			speed: 3000
		},

		thumbs: {
			autoStart: false, // Display thumbnails on opening
			hideOnClose: true, // Hide thumbnail grid when closing animation starts
			parentEl: ".fancybox-container", // Container is injected into this element
			axis: "y" // Vertical (y) or horizontal (x) scrolling
		},

		// Use mousewheel to navigate gallery
		// If 'auto' - enabled for images only
		wheel: "auto",

		// Callbacks
		//==========

		// See Documentation/API/Events for more information
		// Example:
		/*
      afterShow: function( instance, current ) {
        console.info( 'Clicked element:' );
        console.info( current.opts.$orig );
      }
    */

		onInit: $.noop, // When instance has been initialized

		beforeLoad: $.noop, // Before the content of a slide is being loaded
		afterLoad: $.noop, // When the content of a slide is done loading

		beforeShow: $.noop, // Before open animation starts
		afterShow: $.noop, // When content is done loading and animating

		beforeClose: $.noop, // Before the instance attempts to close. Return false to cancel the close.
		afterClose: $.noop, // After instance has been closed

		onActivate: $.noop, // When instance is brought to front
		onDeactivate: $.noop, // When other instance has been activated

		// Interaction
		// ===========

		// Use options below to customize taken action when user clicks or double clicks on the fancyBox area,
		// each option can be string or method that returns value.
		//
		// Possible values:
		//   "close"           - close instance
		//   "next"            - move to next gallery item
		//   "nextOrClose"     - move to next gallery item or close if gallery has only one item
		//   "toggleControls"  - show/hide controls
		//   "zoom"            - zoom image (if loaded)
		//   false             - do nothing

		// Clicked on the content
		clickContent: function(current, event) {
			return current.type === "image" ? "zoom" : false;
		},

		// Clicked on the slide
		clickSlide: "close",

		// Clicked on the background (backdrop) element;
		// if you have not changed the layout, then most likely you need to use `clickSlide` option
		clickOutside: "close",

		// Same as previous two, but for double click
		dblclickContent: false,
		dblclickSlide: false,
		dblclickOutside: false,

		// Custom options when mobile device is detected
		// =============================================

		mobile: {
			preventCaptionOverlap: false,
			idleTime: false,
			clickContent: function(current, event) {
				return current.type === "image" ? "toggleControls" : false;
			},
			clickSlide: function(current, event) {
				return current.type === "image" ? "toggleControls" : "close";
			},
			dblclickContent: function(current, event) {
				return current.type === "image" ? "zoom" : false;
			},
			dblclickSlide: function(current, event) {
				return current.type === "image" ? "zoom" : false;
			}
		},

		// Internationalization
		// ====================

		lang: "en",
		i18n: {
			en: {
				CLOSE: "Close",
				NEXT: "Next",
				PREV: "Previous",
				ERROR: "The requested content cannot be loaded. <br/> Please try again later.",
				PLAY_START: "Start slideshow",
				PLAY_STOP: "Pause slideshow",
				FULL_SCREEN: "Full screen",
				THUMBS: "Thumbnails",
				DOWNLOAD: "Download",
				SHARE: "Share",
				ZOOM: "Zoom"
			},
			de: {
				CLOSE: "Schliessen",
				NEXT: "Weiter",
				PREV: "Zurück",
				ERROR: "Die angeforderten Daten konnten nicht geladen werden. <br/> Bitte versuchen Sie es später nochmal.",
				PLAY_START: "Diaschau starten",
				PLAY_STOP: "Diaschau beenden",
				FULL_SCREEN: "Vollbild",
				THUMBS: "Vorschaubilder",
				DOWNLOAD: "Herunterladen",
				SHARE: "Teilen",
				ZOOM: "Maßstab"
			}
		}
	};

	// Few useful variables and methods
	// ================================

	var $W = $(window);
	var $D = $(document);

	var called = 0;

	// Check if an object is a jQuery object and not a native JavaScript object
	// ========================================================================
	var isQuery = function(obj) {
		return obj && obj.hasOwnProperty && obj instanceof $;
	};

	// Handle multiple browsers for "requestAnimationFrame" and "cancelAnimationFrame"
	// ===============================================================================
	var requestAFrame = (function() {
		return (
			window.requestAnimationFrame ||
			window.webkitRequestAnimationFrame ||
			window.mozRequestAnimationFrame ||
			window.oRequestAnimationFrame ||
			// if all else fails, use setTimeout
			function(callback) {
				return window.setTimeout(callback, 1000 / 60);
			}
		);
	})();

	var cancelAFrame = (function() {
		return (
			window.cancelAnimationFrame ||
			window.webkitCancelAnimationFrame ||
			window.mozCancelAnimationFrame ||
			window.oCancelAnimationFrame ||
			function(id) {
				window.clearTimeout(id);
			}
		);
	})();

	// Detect the supported transition-end event property name
	// =======================================================
	var transitionEnd = (function() {
		var el = document.createElement("fakeelement"),
			t;

		var transitions = {
			transition: "transitionend",
			OTransition: "oTransitionEnd",
			MozTransition: "transitionend",
			WebkitTransition: "webkitTransitionEnd"
		};

		for (t in transitions) {
			if (el.style[t] !== undefined) {
				return transitions[t];
			}
		}

		return "transitionend";
	})();

	// Force redraw on an element.
	// This helps in cases where the browser doesn't redraw an updated element properly
	// ================================================================================
	var forceRedraw = function($el) {
		return $el && $el.length && $el[0].offsetHeight;
	};

	// Exclude array (`buttons`) options from deep merging
	// ===================================================
	var mergeOpts = function(opts1, opts2) {
		var rez = $.extend(true, {}, opts1, opts2);

		$.each(opts2, function(key, value) {
			if ($.isArray(value)) {
				rez[key] = value;
			}
		});

		return rez;
	};

	// How much of an element is visible in viewport
	// =============================================

	var inViewport = function(elem) {
		var elemCenter, rez;

		if (!elem || elem.ownerDocument !== document) {
			return false;
		}

		$(".fancybox-container").css("pointer-events", "none");

		elemCenter = {
			x: elem.getBoundingClientRect().left + elem.offsetWidth / 2,
			y: elem.getBoundingClientRect().top + elem.offsetHeight / 2
		};

		rez = document.elementFromPoint(elemCenter.x, elemCenter.y) === elem;

		$(".fancybox-container").css("pointer-events", "");

		return rez;
	};

	// Class definition
	// ================

	var FancyBox = function(content, opts, index) {
		var self = this;

		self.opts = mergeOpts({index: index}, $.fancybox.defaults);

		if ($.isPlainObject(opts)) {
			self.opts = mergeOpts(self.opts, opts);
		}

		if ($.fancybox.isMobile) {
			self.opts = mergeOpts(self.opts, self.opts.mobile);
		}

		self.id = self.opts.id || ++called;

		self.currIndex = parseInt(self.opts.index, 10) || 0;
		self.prevIndex = null;

		self.prevPos = null;
		self.currPos = 0;

		self.firstRun = true;

		// All group items
		self.group = [];

		// Existing slides (for current, next and previous gallery items)
		self.slides = {};

		// Create group elements
		self.addContent(content);

		if (!self.group.length) {
			return;
		}

		self.init();
	};

	$.extend(FancyBox.prototype, {
		// Create DOM structure
		// ====================

		init: function() {
			var self = this,
				firstItem = self.group[self.currIndex],
				firstItemOpts = firstItem.opts,
				$container,
				buttonStr;

			if (firstItemOpts.closeExisting) {
				$.fancybox.close(true);
			}

			// Hide scrollbars
			// ===============

			$("body").addClass("fancybox-active");

			if (
				!$.fancybox.getInstance() &&
				firstItemOpts.hideScrollbar !== false &&
				!$.fancybox.isMobile &&
				document.body.scrollHeight > window.innerHeight
			) {
				$("head").append(
					'<style id="fancybox-style-noscroll" type="text/css">.compensate-for-scrollbar{margin-right:' +
					(window.innerWidth - document.documentElement.clientWidth) +
					"px;}</style>"
				);

				$("body").addClass("compensate-for-scrollbar");
			}

			// Build html markup and set references
			// ====================================

			// Build html code for buttons and insert into main template
			buttonStr = "";

			$.each(firstItemOpts.buttons, function(index, value) {
				buttonStr += firstItemOpts.btnTpl[value] || "";
			});

			// Create markup from base template, it will be initially hidden to
			// avoid unnecessary work like painting while initializing is not complete
			$container = $(
				self.translate(
					self,
					firstItemOpts.baseTpl
						.replace("{{buttons}}", buttonStr)
						.replace("{{arrows}}", firstItemOpts.btnTpl.arrowLeft + firstItemOpts.btnTpl.arrowRight)
				)
			)
				.attr("id", "fancybox-container-" + self.id)
				.addClass(firstItemOpts.baseClass)
				.data("FancyBox", self)
				.appendTo(firstItemOpts.parentEl);

			// Create object holding references to jQuery wrapped nodes
			self.$refs = {
				container: $container
			};

			["bg", "inner", "infobar", "toolbar", "stage", "caption", "navigation"].forEach(function(item) {
				self.$refs[item] = $container.find(".fancybox-" + item);
			});

			self.trigger("onInit");

			// Enable events, deactive previous instances
			self.activate();

			// Build slides, load and reveal content
			self.jumpTo(self.currIndex);
		},

		// Simple i18n support - replaces object keys found in template
		// with corresponding values
		// ============================================================

		translate: function(obj, str) {
			var arr = obj.opts.i18n[obj.opts.lang] || obj.opts.i18n.en;

			return str.replace(/\{\{(\w+)\}\}/g, function(match, n) {
				var value = arr[n];

				if (value === undefined) {
					return match;
				}

				return value;
			});
		},

		// Populate current group with fresh content
		// Check if each object has valid type and content
		// ===============================================

		addContent: function(content) {
			var self = this,
				items = $.makeArray(content),
				thumbs;

			$.each(items, function(i, item) {
				var obj = {},
					opts = {},
					$item,
					type,
					found,
					src,
					srcParts;

				// Step 1 - Make sure we have an object
				// ====================================

				if ($.isPlainObject(item)) {
					// We probably have manual usage here, something like
					// $.fancybox.open( [ { src : "image.jpg", type : "image" } ] )

					obj = item;
					opts = item.opts || item;
				} else if ($.type(item) === "object" && $(item).length) {
					// Here we probably have jQuery collection returned by some selector
					$item = $(item);

					// Support attributes like `data-options='{"touch" : false}'` and `data-touch='false'`
					opts = $item.data() || {};
					opts = $.extend(true, {}, opts, opts.options);

					// Here we store clicked element
					opts.$orig = $item;

					obj.src = self.opts.src || opts.src || $item.attr("href");

					// Assume that simple syntax is used, for example:
					//   `$.fancybox.open( $("#test"), {} );`
					if (!obj.type && !obj.src) {
						obj.type = "inline";
						obj.src = item;
					}
				} else {
					// Assume we have a simple html code, for example:
					//   $.fancybox.open( '<div><h1>Hi!</h1></div>' );
					obj = {
						type: "html",
						src: item + ""
					};
				}

				// Each gallery object has full collection of options
				obj.opts = $.extend(true, {}, self.opts, opts);

				// Do not merge buttons array
				if ($.isArray(opts.buttons)) {
					obj.opts.buttons = opts.buttons;
				}

				if ($.fancybox.isMobile && obj.opts.mobile) {
					obj.opts = mergeOpts(obj.opts, obj.opts.mobile);
				}

				// Step 2 - Make sure we have content type, if not - try to guess
				// ==============================================================

				type = obj.type || obj.opts.type;
				src = obj.src || "";

				if (!type && src) {
					if ((found = src.match(/\.(mp4|mov|ogv|webm)((\?|#).*)?$/i))) {
						type = "video";

						if (!obj.opts.video.format) {
							obj.opts.video.format = "video/" + (found[1] === "ogv" ? "ogg" : found[1]);
						}
					} else if (src.match(/(^data:image\/[a-z0-9+\/=]*,)|(\.(jp(e|g|eg)|gif|png|bmp|webp|svg|ico)((\?|#).*)?$)/i)) {
						type = "image";
					} else if (src.match(/\.(pdf)((\?|#).*)?$/i)) {
						type = "iframe";
						obj = $.extend(true, obj, {contentType: "pdf", opts: {iframe: {preload: false}}});
					} else if (src.charAt(0) === "#") {
						type = "inline";
					}
				}

				if (type) {
					obj.type = type;
				} else {
					self.trigger("objectNeedsType", obj);
				}

				if (!obj.contentType) {
					obj.contentType = $.inArray(obj.type, ["html", "inline", "ajax"]) > -1 ? "html" : obj.type;
				}

				// Step 3 - Some adjustments
				// =========================

				obj.index = self.group.length;

				if (obj.opts.smallBtn == "auto") {
					obj.opts.smallBtn = $.inArray(obj.type, ["html", "inline", "ajax"]) > -1;
				}

				if (obj.opts.toolbar === "auto") {
					obj.opts.toolbar = !obj.opts.smallBtn;
				}

				// Find thumbnail image, check if exists and if is in the viewport
				obj.$thumb = obj.opts.$thumb || null;

				if (obj.opts.$trigger && obj.index === self.opts.index) {
					obj.$thumb = obj.opts.$trigger.find("img:first");

					if (obj.$thumb.length) {
						obj.opts.$orig = obj.opts.$trigger;
					}
				}

				if (!(obj.$thumb && obj.$thumb.length) && obj.opts.$orig) {
					obj.$thumb = obj.opts.$orig.find("img:first");
				}

				if (obj.$thumb && !obj.$thumb.length) {
					obj.$thumb = null;
				}

				obj.thumb = obj.opts.thumb || (obj.$thumb ? obj.$thumb[0].src : null);

				// "caption" is a "special" option, it can be used to customize caption per gallery item
				if ($.type(obj.opts.caption) === "function") {
					obj.opts.caption = obj.opts.caption.apply(item, [self, obj]);
				}

				if ($.type(self.opts.caption) === "function") {
					obj.opts.caption = self.opts.caption.apply(item, [self, obj]);
				}

				// Make sure we have caption as a string or jQuery object
				if (!(obj.opts.caption instanceof $)) {
					obj.opts.caption = obj.opts.caption === undefined ? "" : obj.opts.caption + "";
				}

				// Check if url contains "filter" used to filter the content
				// Example: "ajax.html #something"
				if (obj.type === "ajax") {
					srcParts = src.split(/\s+/, 2);

					if (srcParts.length > 1) {
						obj.src = srcParts.shift();

						obj.opts.filter = srcParts.shift();
					}
				}

				// Hide all buttons and disable interactivity for modal items
				if (obj.opts.modal) {
					obj.opts = $.extend(true, obj.opts, {
						trapFocus: true,
						// Remove buttons
						infobar: 0,
						toolbar: 0,

						smallBtn: 0,

						// Disable keyboard navigation
						keyboard: 0,

						// Disable some modules
						slideShow: 0,
						fullScreen: 0,
						thumbs: 0,
						touch: 0,

						// Disable click event handlers
						clickContent: false,
						clickSlide: false,
						clickOutside: false,
						dblclickContent: false,
						dblclickSlide: false,
						dblclickOutside: false
					});
				}

				// Step 4 - Add processed object to group
				// ======================================

				self.group.push(obj);
			});

			// Update controls if gallery is already opened
			if (Object.keys(self.slides).length) {
				self.updateControls();

				// Update thumbnails, if needed
				thumbs = self.Thumbs;

				if (thumbs && thumbs.isActive) {
					thumbs.create();

					thumbs.focus();
				}
			}
		},

		// Attach an event handler functions for:
		//   - navigation buttons
		//   - browser scrolling, resizing;
		//   - focusing
		//   - keyboard
		//   - detecting inactivity
		// ======================================

		addEvents: function() {
			var self = this;

			self.removeEvents();

			// Make navigation elements clickable
			// ==================================

			self.$refs.container
				.on("click.fb-close", "[data-fancybox-close]", function(e) {
					e.stopPropagation();
					e.preventDefault();

					self.close(e);
				})
				.on("touchstart.fb-prev click.fb-prev", "[data-fancybox-prev]", function(e) {
					e.stopPropagation();
					e.preventDefault();

					self.previous();
				})
				.on("touchstart.fb-next click.fb-next", "[data-fancybox-next]", function(e) {
					e.stopPropagation();
					e.preventDefault();

					self.next();
				})
				.on("click.fb", "[data-fancybox-zoom]", function(e) {
					// Click handler for zoom button
					self[self.isScaledDown() ? "scaleToActual" : "scaleToFit"]();
				});

			// Handle page scrolling and browser resizing
			// ==========================================

			$W.on("orientationchange.fb resize.fb", function(e) {
				if (e && e.originalEvent && e.originalEvent.type === "resize") {
					if (self.requestId) {
						cancelAFrame(self.requestId);
					}

					self.requestId = requestAFrame(function() {
						self.update(e);
					});
				} else {
					if (self.current && self.current.type === "iframe") {
						self.$refs.stage.hide();
					}

					setTimeout(function() {
						self.$refs.stage.show();

						self.update(e);
					}, $.fancybox.isMobile ? 600 : 250);
				}
			});

			$D.on("keydown.fb", function(e) {
				var instance = $.fancybox ? $.fancybox.getInstance() : null,
					current = instance.current,
					keycode = e.keyCode || e.which;

				// Trap keyboard focus inside of the modal
				// =======================================

				if (keycode == 9) {
					if (current.opts.trapFocus) {
						self.focus(e);
					}

					return;
				}

				// Enable keyboard navigation
				// ==========================

				if (!current.opts.keyboard || e.ctrlKey || e.altKey || e.shiftKey || $(e.target).is("input") || $(e.target).is("textarea")) {
					return;
				}

				// Backspace and Esc keys
				if (keycode === 8 || keycode === 27) {
					e.preventDefault();

					self.close(e);

					return;
				}

				// Left arrow and Up arrow
				if (keycode === 37 || keycode === 38) {
					e.preventDefault();

					self.previous();

					return;
				}

				// Righ arrow and Down arrow
				if (keycode === 39 || keycode === 40) {
					e.preventDefault();

					self.next();

					return;
				}

				self.trigger("afterKeydown", e, keycode);
			});

			// Hide controls after some inactivity period
			if (self.group[self.currIndex].opts.idleTime) {
				self.idleSecondsCounter = 0;

				$D.on(
					"mousemove.fb-idle mouseleave.fb-idle mousedown.fb-idle touchstart.fb-idle touchmove.fb-idle scroll.fb-idle keydown.fb-idle",
					function(e) {
						self.idleSecondsCounter = 0;

						if (self.isIdle) {
							self.showControls();
						}

						self.isIdle = false;
					}
				);

				self.idleInterval = window.setInterval(function() {
					self.idleSecondsCounter++;

					if (self.idleSecondsCounter >= self.group[self.currIndex].opts.idleTime && !self.isDragging) {
						self.isIdle = true;
						self.idleSecondsCounter = 0;

						self.hideControls();
					}
				}, 1000);
			}
		},

		// Remove events added by the core
		// ===============================

		removeEvents: function() {
			var self = this;

			$W.off("orientationchange.fb resize.fb");
			$D.off("keydown.fb .fb-idle");

			this.$refs.container.off(".fb-close .fb-prev .fb-next");

			if (self.idleInterval) {
				window.clearInterval(self.idleInterval);

				self.idleInterval = null;
			}
		},

		// Change to previous gallery item
		// ===============================

		previous: function(duration) {
			return this.jumpTo(this.currPos - 1, duration);
		},

		// Change to next gallery item
		// ===========================

		next: function(duration) {
			return this.jumpTo(this.currPos + 1, duration);
		},

		// Switch to selected gallery item
		// ===============================

		jumpTo: function(pos, duration) {
			var self = this,
				groupLen = self.group.length,
				firstRun,
				isMoved,
				loop,
				current,
				previous,
				slidePos,
				stagePos,
				prop,
				diff;

			if (self.isDragging || self.isClosing || (self.isAnimating && self.firstRun)) {
				return;
			}

			// Should loop?
			pos = parseInt(pos, 10);
			loop = self.current ? self.current.opts.loop : self.opts.loop;

			if (!loop && (pos < 0 || pos >= groupLen)) {
				return false;
			}

			// Check if opening for the first time; this helps to speed things up
			firstRun = self.firstRun = !Object.keys(self.slides).length;

			// Create slides
			previous = self.current;

			self.prevIndex = self.currIndex;
			self.prevPos = self.currPos;

			current = self.createSlide(pos);

			if (groupLen > 1) {
				if (loop || current.index < groupLen - 1) {
					self.createSlide(pos + 1);
				}

				if (loop || current.index > 0) {
					self.createSlide(pos - 1);
				}
			}

			self.current = current;
			self.currIndex = current.index;
			self.currPos = current.pos;

			self.trigger("beforeShow", firstRun);

			self.updateControls();

			// Validate duration length
			current.forcedDuration = undefined;

			if ($.isNumeric(duration)) {
				current.forcedDuration = duration;
			} else {
				duration = current.opts[firstRun ? "animationDuration" : "transitionDuration"];
			}

			duration = parseInt(duration, 10);

			// Check if user has swiped the slides or if still animating
			isMoved = self.isMoved(current);

			// Make sure current slide is visible
			current.$slide.addClass("fancybox-slide--current");

			// Fresh start - reveal container, current slide and start loading content
			if (firstRun) {
				if (current.opts.animationEffect && duration) {
					self.$refs.container.css("transition-duration", duration + "ms");
				}

				self.$refs.container.addClass("fancybox-is-open").trigger("focus");

				// Attempt to load content into slide
				// This will later call `afterLoad` -> `revealContent`
				self.loadSlide(current);

				self.preload("image");

				return;
			}

			// Get actual slide/stage positions (before cleaning up)
			slidePos = $.fancybox.getTranslate(previous.$slide);
			stagePos = $.fancybox.getTranslate(self.$refs.stage);

			// Clean up all slides
			$.each(self.slides, function(index, slide) {
				$.fancybox.stop(slide.$slide, true);
			});

			if (previous.pos !== current.pos) {
				previous.isComplete = false;
			}

			previous.$slide.removeClass("fancybox-slide--complete fancybox-slide--current");

			// If slides are out of place, then animate them to correct position
			if (isMoved) {
				// Calculate horizontal swipe distance
				diff = slidePos.left - (previous.pos * slidePos.width + previous.pos * previous.opts.gutter);

				$.each(self.slides, function(index, slide) {
					slide.$slide.removeClass("fancybox-animated").removeClass(function(index, className) {
						return (className.match(/(^|\s)fancybox-fx-\S+/g) || []).join(" ");
					});

					// Make sure that each slide is in equal distance
					// This is mostly needed for freshly added slides, because they are not yet positioned
					var leftPos = slide.pos * slidePos.width + slide.pos * slide.opts.gutter;

					$.fancybox.setTranslate(slide.$slide, {top: 0, left: leftPos - stagePos.left + diff});

					if (slide.pos !== current.pos) {
						slide.$slide.addClass("fancybox-slide--" + (slide.pos > current.pos ? "next" : "previous"));
					}

					// Redraw to make sure that transition will start
					forceRedraw(slide.$slide);

					// Animate the slide
					$.fancybox.animate(
						slide.$slide,
						{
							top: 0,
							left: (slide.pos - current.pos) * slidePos.width + (slide.pos - current.pos) * slide.opts.gutter
						},
						duration,
						function() {
							slide.$slide
								.css({
									transform: "",
									opacity: ""
								})
								.removeClass("fancybox-slide--next fancybox-slide--previous");

							if (slide.pos === self.currPos) {
								self.complete();
							}
						}
					);
				});
			} else if (duration && current.opts.transitionEffect) {
				// Set transition effect for previously active slide
				prop = "fancybox-animated fancybox-fx-" + current.opts.transitionEffect;

				previous.$slide.addClass("fancybox-slide--" + (previous.pos > current.pos ? "next" : "previous"));

				$.fancybox.animate(
					previous.$slide,
					prop,
					duration,
					function() {
						previous.$slide.removeClass(prop).removeClass("fancybox-slide--next fancybox-slide--previous");
					},
					false
				);
			}

			if (current.isLoaded) {
				self.revealContent(current);
			} else {
				self.loadSlide(current);
			}

			self.preload("image");
		},

		// Create new "slide" element
		// These are gallery items  that are actually added to DOM
		// =======================================================

		createSlide: function(pos) {
			var self = this,
				$slide,
				index;

			index = pos % self.group.length;
			index = index < 0 ? self.group.length + index : index;

			if (!self.slides[pos] && self.group[index]) {
				$slide = $('<div class="fancybox-slide"></div>').appendTo(self.$refs.stage);

				self.slides[pos] = $.extend(true, {}, self.group[index], {
					pos: pos,
					$slide: $slide,
					isLoaded: false
				});

				self.updateSlide(self.slides[pos]);
			}

			return self.slides[pos];
		},

		// Scale image to the actual size of the image;
		// x and y values should be relative to the slide
		// ==============================================

		scaleToActual: function(x, y, duration) {
			var self = this,
				current = self.current,
				$content = current.$content,
				canvasWidth = $.fancybox.getTranslate(current.$slide).width,
				canvasHeight = $.fancybox.getTranslate(current.$slide).height,
				newImgWidth = current.width,
				newImgHeight = current.height,
				imgPos,
				posX,
				posY,
				scaleX,
				scaleY;

			if (self.isAnimating || self.isMoved() || !$content || !(current.type == "image" && current.isLoaded && !current.hasError)) {
				return;
			}

			self.isAnimating = true;

			$.fancybox.stop($content);

			x = x === undefined ? canvasWidth * 0.5 : x;
			y = y === undefined ? canvasHeight * 0.5 : y;

			imgPos = $.fancybox.getTranslate($content);

			imgPos.top -= $.fancybox.getTranslate(current.$slide).top;
			imgPos.left -= $.fancybox.getTranslate(current.$slide).left;

			scaleX = newImgWidth / imgPos.width;
			scaleY = newImgHeight / imgPos.height;

			// Get center position for original image
			posX = canvasWidth * 0.5 - newImgWidth * 0.5;
			posY = canvasHeight * 0.5 - newImgHeight * 0.5;

			// Make sure image does not move away from edges
			if (newImgWidth > canvasWidth) {
				posX = imgPos.left * scaleX - (x * scaleX - x);

				if (posX > 0) {
					posX = 0;
				}

				if (posX < canvasWidth - newImgWidth) {
					posX = canvasWidth - newImgWidth;
				}
			}

			if (newImgHeight > canvasHeight) {
				posY = imgPos.top * scaleY - (y * scaleY - y);

				if (posY > 0) {
					posY = 0;
				}

				if (posY < canvasHeight - newImgHeight) {
					posY = canvasHeight - newImgHeight;
				}
			}

			self.updateCursor(newImgWidth, newImgHeight);

			$.fancybox.animate(
				$content,
				{
					top: posY,
					left: posX,
					scaleX: scaleX,
					scaleY: scaleY
				},
				duration || 330,
				function() {
					self.isAnimating = false;
				}
			);

			// Stop slideshow
			if (self.SlideShow && self.SlideShow.isActive) {
				self.SlideShow.stop();
			}
		},

		// Scale image to fit inside parent element
		// ========================================

		scaleToFit: function(duration) {
			var self = this,
				current = self.current,
				$content = current.$content,
				end;

			if (self.isAnimating || self.isMoved() || !$content || !(current.type == "image" && current.isLoaded && !current.hasError)) {
				return;
			}

			self.isAnimating = true;

			$.fancybox.stop($content);

			end = self.getFitPos(current);

			self.updateCursor(end.width, end.height);

			$.fancybox.animate(
				$content,
				{
					top: end.top,
					left: end.left,
					scaleX: end.width / $content.width(),
					scaleY: end.height / $content.height()
				},
				duration || 330,
				function() {
					self.isAnimating = false;
				}
			);
		},

		// Calculate image size to fit inside viewport
		// ===========================================

		getFitPos: function(slide) {
			var self = this,
				$content = slide.$content,
				$slide = slide.$slide,
				width = slide.width || slide.opts.width,
				height = slide.height || slide.opts.height,
				maxWidth,
				maxHeight,
				minRatio,
				aspectRatio,
				rez = {};

			if (!slide.isLoaded || !$content || !$content.length) {
				return false;
			}

			maxWidth = $.fancybox.getTranslate(self.$refs.stage).width;
			maxHeight = $.fancybox.getTranslate(self.$refs.stage).height;

			maxWidth -=
				parseFloat($slide.css("paddingLeft")) +
				parseFloat($slide.css("paddingRight")) +
				parseFloat($content.css("marginLeft")) +
				parseFloat($content.css("marginRight"));

			maxHeight -=
				parseFloat($slide.css("paddingTop")) +
				parseFloat($slide.css("paddingBottom")) +
				parseFloat($content.css("marginTop")) +
				parseFloat($content.css("marginBottom"));

			if (!width || !height) {
				width = maxWidth;
				height = maxHeight;
			}

			minRatio = Math.min(1, maxWidth / width, maxHeight / height);

			width = minRatio * width;
			height = minRatio * height;

			// Adjust width/height to precisely fit into container
			if (width > maxWidth - 0.5) {
				width = maxWidth;
			}

			if (height > maxHeight - 0.5) {
				height = maxHeight;
			}

			if (slide.type === "image") {
				rez.top = Math.floor((maxHeight - height) * 0.5) + parseFloat($slide.css("paddingTop"));
				rez.left = Math.floor((maxWidth - width) * 0.5) + parseFloat($slide.css("paddingLeft"));
			} else if (slide.contentType === "video") {
				// Force aspect ratio for the video
				// "I say the whole world must learn of our peaceful ways… by force!"
				aspectRatio = slide.opts.width && slide.opts.height ? width / height : slide.opts.ratio || 16 / 9;

				if (height > width / aspectRatio) {
					height = width / aspectRatio;
				} else if (width > height * aspectRatio) {
					width = height * aspectRatio;
				}
			}

			rez.width = width;
			rez.height = height;

			return rez;
		},

		// Update content size and position for all slides
		// ==============================================

		update: function(e) {
			var self = this;

			$.each(self.slides, function(key, slide) {
				self.updateSlide(slide, e);
			});
		},

		// Update slide content position and size
		// ======================================

		updateSlide: function(slide, e) {
			var self = this,
				$content = slide && slide.$content,
				width = slide.width || slide.opts.width,
				height = slide.height || slide.opts.height,
				$slide = slide.$slide;

			// First, prevent caption overlap, if needed
			self.adjustCaption(slide);

			// Then resize content to fit inside the slide
			if ($content && (width || height || slide.contentType === "video") && !slide.hasError) {
				$.fancybox.stop($content);

				$.fancybox.setTranslate($content, self.getFitPos(slide));

				if (slide.pos === self.currPos) {
					self.isAnimating = false;

					self.updateCursor();
				}
			}

			// Then some adjustments
			self.adjustLayout(slide);

			if ($slide.length) {
				$slide.trigger("refresh");

				if (slide.pos === self.currPos) {
					self.$refs.toolbar
						.add(self.$refs.navigation.find(".fancybox-button--arrow_right"))
						.toggleClass("compensate-for-scrollbar", $slide.get(0).scrollHeight > $slide.get(0).clientHeight);
				}
			}

			self.trigger("onUpdate", slide, e);
		},

		// Horizontally center slide
		// =========================

		centerSlide: function(duration) {
			var self = this,
				current = self.current,
				$slide = current.$slide;

			if (self.isClosing || !current) {
				return;
			}

			$slide.siblings().css({
				transform: "",
				opacity: ""
			});

			$slide
				.parent()
				.children()
				.removeClass("fancybox-slide--previous fancybox-slide--next");

			$.fancybox.animate(
				$slide,
				{
					top: 0,
					left: 0,
					opacity: 1
				},
				duration === undefined ? 0 : duration,
				function() {
					// Clean up
					$slide.css({
						transform: "",
						opacity: ""
					});

					if (!current.isComplete) {
						self.complete();
					}
				},
				false
			);
		},

		// Check if current slide is moved (swiped)
		// ========================================

		isMoved: function(slide) {
			var current = slide || this.current,
				slidePos,
				stagePos;

			if (!current) {
				return false;
			}

			stagePos = $.fancybox.getTranslate(this.$refs.stage);
			slidePos = $.fancybox.getTranslate(current.$slide);

			return (
				!current.$slide.hasClass("fancybox-animated") &&
				(Math.abs(slidePos.top - stagePos.top) > 0.5 || Math.abs(slidePos.left - stagePos.left) > 0.5)
			);
		},

		// Update cursor style depending if content can be zoomed
		// ======================================================

		updateCursor: function(nextWidth, nextHeight) {
			var self = this,
				current = self.current,
				$container = self.$refs.container,
				canPan,
				isZoomable;

			if (!current || self.isClosing || !self.Guestures) {
				return;
			}

			$container.removeClass("fancybox-is-zoomable fancybox-can-zoomIn fancybox-can-zoomOut fancybox-can-swipe fancybox-can-pan");

			canPan = self.canPan(nextWidth, nextHeight);

			isZoomable = canPan ? true : self.isZoomable();

			$container.toggleClass("fancybox-is-zoomable", isZoomable);

			$("[data-fancybox-zoom]").prop("disabled", !isZoomable);

			if (canPan) {
				$container.addClass("fancybox-can-pan");
			} else if (
				isZoomable &&
				(current.opts.clickContent === "zoom" || ($.isFunction(current.opts.clickContent) && current.opts.clickContent(current) == "zoom"))
			) {
				$container.addClass("fancybox-can-zoomIn");
			} else if (current.opts.touch && (current.opts.touch.vertical || self.group.length > 1) && current.contentType !== "video") {
				$container.addClass("fancybox-can-swipe");
			}
		},

		// Check if current slide is zoomable
		// ==================================

		isZoomable: function() {
			var self = this,
				current = self.current,
				fitPos;

			// Assume that slide is zoomable if:
			//   - image is still loading
			//   - actual size of the image is smaller than available area
			if (current && !self.isClosing && current.type === "image" && !current.hasError) {
				if (!current.isLoaded) {
					return true;
				}

				fitPos = self.getFitPos(current);

				if (fitPos && (current.width > fitPos.width || current.height > fitPos.height)) {
					return true;
				}
			}

			return false;
		},

		// Check if current image dimensions are smaller than actual
		// =========================================================

		isScaledDown: function(nextWidth, nextHeight) {
			var self = this,
				rez = false,
				current = self.current,
				$content = current.$content;

			if (nextWidth !== undefined && nextHeight !== undefined) {
				rez = nextWidth < current.width && nextHeight < current.height;
			} else if ($content) {
				rez = $.fancybox.getTranslate($content);
				rez = rez.width < current.width && rez.height < current.height;
			}

			return rez;
		},

		// Check if image dimensions exceed parent element
		// ===============================================

		canPan: function(nextWidth, nextHeight) {
			var self = this,
				current = self.current,
				pos = null,
				rez = false;

			if (current.type === "image" && (current.isComplete || (nextWidth && nextHeight)) && !current.hasError) {
				rez = self.getFitPos(current);

				if (nextWidth !== undefined && nextHeight !== undefined) {
					pos = {width: nextWidth, height: nextHeight};
				} else if (current.isComplete) {
					pos = $.fancybox.getTranslate(current.$content);
				}

				if (pos && rez) {
					rez = Math.abs(pos.width - rez.width) > 1.5 || Math.abs(pos.height - rez.height) > 1.5;
				}
			}

			return rez;
		},

		// Load content into the slide
		// ===========================

		loadSlide: function(slide) {
			var self = this,
				type,
				$slide,
				ajaxLoad;

			if (slide.isLoading || slide.isLoaded) {
				return;
			}

			slide.isLoading = true;

			if (self.trigger("beforeLoad", slide) === false) {
				slide.isLoading = false;

				return false;
			}

			type = slide.type;
			$slide = slide.$slide;

			$slide
				.off("refresh")
				.trigger("onReset")
				.addClass(slide.opts.slideClass);

			// Create content depending on the type
			switch (type) {
				case "image":
					self.setImage(slide);

					break;

				case "iframe":
					self.setIframe(slide);

					break;

				case "html":
					self.setContent(slide, slide.src || slide.content);

					break;

				case "video":
					self.setContent(
						slide,
						slide.opts.video.tpl
							.replace(/\{\{src\}\}/gi, slide.src)
							.replace("{{format}}", slide.opts.videoFormat || slide.opts.video.format || "")
							.replace("{{poster}}", slide.thumb || "")
					);

					break;

				case "inline":
					if ($(slide.src).length) {
						self.setContent(slide, $(slide.src));
					} else {
						self.setError(slide);
					}

					break;

				case "ajax":
					self.showLoading(slide);

					ajaxLoad = $.ajax(
						$.extend({}, slide.opts.ajax.settings, {
							url: slide.src,
							success: function(data, textStatus) {
								if (textStatus === "success") {
									self.setContent(slide, data);
								}
							},
							error: function(jqXHR, textStatus) {
								if (jqXHR && textStatus !== "abort") {
									self.setError(slide);
								}
							}
						})
					);

					$slide.one("onReset", function() {
						ajaxLoad.abort();
					});

					break;

				default:
					self.setError(slide);

					break;
			}

			return true;
		},

		// Use thumbnail image, if possible
		// ================================

		setImage: function(slide) {
			var self = this,
				ghost;

			// Check if need to show loading icon
			setTimeout(function() {
				var $img = slide.$image;

				if (!self.isClosing && slide.isLoading && (!$img || !$img.length || !$img[0].complete) && !slide.hasError) {
					self.showLoading(slide);
				}
			}, 50);

			//Check if image has srcset
			self.checkSrcset(slide);

			// This will be wrapper containing both ghost and actual image
			slide.$content = $('<div class="fancybox-content"></div>')
				.addClass("fancybox-is-hidden")
				.appendTo(slide.$slide.addClass("fancybox-slide--image"));

			// If we have a thumbnail, we can display it while actual image is loading
			// Users will not stare at black screen and actual image will appear gradually
			if (slide.opts.preload !== false && slide.opts.width && slide.opts.height && slide.thumb) {
				slide.width = slide.opts.width;
				slide.height = slide.opts.height;

				ghost = document.createElement("img");

				ghost.onerror = function() {
					$(this).remove();

					slide.$ghost = null;
				};

				ghost.onload = function() {
					self.afterLoad(slide);
				};

				slide.$ghost = $(ghost)
					.addClass("fancybox-image")
					.appendTo(slide.$content)
					.attr("src", slide.thumb);
			}

			// Start loading actual image
			self.setBigImage(slide);
		},

		// Check if image has srcset and get the source
		// ============================================
		checkSrcset: function(slide) {
			var srcset = slide.opts.srcset || slide.opts.image.srcset,
				found,
				temp,
				pxRatio,
				windowWidth;

			// If we have "srcset", then we need to find first matching "src" value.
			// This is necessary, because when you set an src attribute, the browser will preload the image
			// before any javascript or even CSS is applied.
			if (srcset) {
				pxRatio = window.devicePixelRatio || 1;
				windowWidth = window.innerWidth * pxRatio;

				temp = srcset.split(",").map(function(el) {
					var ret = {};

					el.trim()
						.split(/\s+/)
						.forEach(function(el, i) {
							var value = parseInt(el.substring(0, el.length - 1), 10);

							if (i === 0) {
								return (ret.url = el);
							}

							if (value) {
								ret.value = value;
								ret.postfix = el[el.length - 1];
							}
						});

					return ret;
				});

				// Sort by value
				temp.sort(function(a, b) {
					return a.value - b.value;
				});

				// Ok, now we have an array of all srcset values
				for (var j = 0; j < temp.length; j++) {
					var el = temp[j];

					if ((el.postfix === "w" && el.value >= windowWidth) || (el.postfix === "x" && el.value >= pxRatio)) {
						found = el;
						break;
					}
				}

				// If not found, take the last one
				if (!found && temp.length) {
					found = temp[temp.length - 1];
				}

				if (found) {
					slide.src = found.url;

					// If we have default width/height values, we can calculate height for matching source
					if (slide.width && slide.height && found.postfix == "w") {
						slide.height = (slide.width / slide.height) * found.value;
						slide.width = found.value;
					}

					slide.opts.srcset = srcset;
				}
			}
		},

		// Create full-size image
		// ======================

		setBigImage: function(slide) {
			var self = this,
				img = document.createElement("img"),
				$img = $(img);

			slide.$image = $img
				.one("error", function() {
					self.setError(slide);
				})
				.one("load", function() {
					var sizes;

					if (!slide.$ghost) {
						self.resolveImageSlideSize(slide, this.naturalWidth, this.naturalHeight);

						self.afterLoad(slide);
					}

					if (self.isClosing) {
						return;
					}

					if (slide.opts.srcset) {
						sizes = slide.opts.sizes;

						if (!sizes || sizes === "auto") {
							sizes =
								(slide.width / slide.height > 1 && $W.width() / $W.height() > 1 ? "100" : Math.round((slide.width / slide.height) * 100)) +
								"vw";
						}

						$img.attr("sizes", sizes).attr("srcset", slide.opts.srcset);
					}

					// Hide temporary image after some delay
					if (slide.$ghost) {
						setTimeout(function() {
							if (slide.$ghost && !self.isClosing) {
								slide.$ghost.hide();
							}
						}, Math.min(300, Math.max(1000, slide.height / 1600)));
					}

					self.hideLoading(slide);
				})
				.addClass("fancybox-image")
				.attr("src", slide.src)
				.appendTo(slide.$content);

			if ((img.complete || img.readyState == "complete") && $img.naturalWidth && $img.naturalHeight) {
				$img.trigger("load");
			} else if (img.error) {
				$img.trigger("error");
			}
		},

		// Computes the slide size from image size and maxWidth/maxHeight
		// ==============================================================

		resolveImageSlideSize: function(slide, imgWidth, imgHeight) {
			var maxWidth = parseInt(slide.opts.width, 10),
				maxHeight = parseInt(slide.opts.height, 10);

			// Sets the default values from the image
			slide.width = imgWidth;
			slide.height = imgHeight;

			if (maxWidth > 0) {
				slide.width = maxWidth;
				slide.height = Math.floor((maxWidth * imgHeight) / imgWidth);
			}

			if (maxHeight > 0) {
				slide.width = Math.floor((maxHeight * imgWidth) / imgHeight);
				slide.height = maxHeight;
			}
		},

		// Create iframe wrapper, iframe and bindings
		// ==========================================

		setIframe: function(slide) {
			var self = this,
				opts = slide.opts.iframe,
				$slide = slide.$slide,
				$iframe;

			// Fix responsive iframes on iOS (along with `position:absolute;` for iframe element)
			if ($.fancybox.isMobile) {
				opts.css.overflow = "scroll";
			}

			slide.$content = $('<div class="fancybox-content' + (opts.preload ? " fancybox-is-hidden" : "") + '"></div>')
				.css(opts.css)
				.appendTo($slide);

			$slide.addClass("fancybox-slide--" + slide.contentType);

			slide.$iframe = $iframe = $(opts.tpl.replace(/\{rnd\}/g, new Date().getTime()))
				.attr(opts.attr)
				.appendTo(slide.$content);

			if (opts.preload) {
				self.showLoading(slide);

				// Unfortunately, it is not always possible to determine if iframe is successfully loaded
				// (due to browser security policy)

				$iframe.on("load.fb error.fb", function(e) {
					this.isReady = 1;

					slide.$slide.trigger("refresh");

					self.afterLoad(slide);
				});

				// Recalculate iframe content size
				// ===============================

				$slide.on("refresh.fb", function() {
					var $content = slide.$content,
						frameWidth = opts.css.width,
						frameHeight = opts.css.height,
						$contents,
						$body;

					if ($iframe[0].isReady !== 1) {
						return;
					}

					try {
						$contents = $iframe.contents();
						$body = $contents.find("body");
					} catch (ignore) {}

					// Calculate contnet dimensions if it is accessible
					if ($body && $body.length && $body.children().length) {
						// Avoid scrolling to top (if multiple instances)
						$slide.css("overflow", "visible");

						$content.css({
							width: "100%",
							"max-width": "100%",
							height: "9999px"
						});

						if (frameWidth === undefined) {
							frameWidth = Math.ceil(Math.max($body[0].clientWidth, $body.outerWidth(true)));
						}

						$content.css("width", frameWidth ? frameWidth : "").css("max-width", "");

						if (frameHeight === undefined) {
							frameHeight = Math.ceil(Math.max($body[0].clientHeight, $body.outerHeight(true)));
						}

						$content.css("height", frameHeight ? frameHeight : "");

						$slide.css("overflow", "auto");
					}

					$content.removeClass("fancybox-is-hidden");
				});
			} else {
				self.afterLoad(slide);
			}

			$iframe.attr("src", slide.src);

			// Remove iframe if closing or changing gallery item
			$slide.one("onReset", function() {
				// This helps IE not to throw errors when closing
				try {
					$(this)
						.find("iframe")
						.hide()
						.unbind()
						.attr("src", "//about:blank");
				} catch (ignore) {}

				$(this)
					.off("refresh.fb")
					.empty();

				slide.isLoaded = false;
				slide.isRevealed = false;
			});
		},

		// Wrap and append content to the slide
		// ======================================

		setContent: function(slide, content) {
			var self = this;

			if (self.isClosing) {
				return;
			}

			self.hideLoading(slide);

			if (slide.$content) {
				$.fancybox.stop(slide.$content);
			}

			slide.$slide.empty();

			// If content is a jQuery object, then it will be moved to the slide.
			// The placeholder is created so we will know where to put it back.
			if (isQuery(content) && content.parent().length) {
				// Make sure content is not already moved to fancyBox
				if (content.hasClass("fancybox-content") || content.parent().hasClass("fancybox-content")) {
					content.parents(".fancybox-slide").trigger("onReset");
				}

				// Create temporary element marking original place of the content
				slide.$placeholder = $("<div>")
					.hide()
					.insertAfter(content);

				// Make sure content is visible
				content.css("display", "inline-block");
			} else if (!slide.hasError) {
				// If content is just a plain text, try to convert it to html
				if ($.type(content) === "string") {
					content = $("<div>")
						.append($.trim(content))
						.contents();
				}

				// If "filter" option is provided, then filter content
				if (slide.opts.filter) {
					content = $("<div>")
						.html(content)
						.find(slide.opts.filter);
				}
			}

			slide.$slide.one("onReset", function() {
				// Pause all html5 video/audio
				$(this)
					.find("video,audio")
					.trigger("pause");

				// Put content back
				if (slide.$placeholder) {
					slide.$placeholder.after(content.removeClass("fancybox-content").hide()).remove();

					slide.$placeholder = null;
				}

				// Remove custom close button
				if (slide.$smallBtn) {
					slide.$smallBtn.remove();

					slide.$smallBtn = null;
				}

				// Remove content and mark slide as not loaded
				if (!slide.hasError) {
					$(this).empty();

					slide.isLoaded = false;
					slide.isRevealed = false;
				}
			});

			$(content).appendTo(slide.$slide);

			if ($(content).is("video,audio")) {
				$(content).addClass("fancybox-video");

				$(content).wrap("<div></div>");

				slide.contentType = "video";

				slide.opts.width = slide.opts.width || $(content).attr("width");
				slide.opts.height = slide.opts.height || $(content).attr("height");
			}

			slide.$content = slide.$slide
				.children()
				.filter("div,form,main,video,audio,article,.fancybox-content")
				.first();

			slide.$content.siblings().hide();

			// Re-check if there is a valid content
			// (in some cases, ajax response can contain various elements or plain text)
			if (!slide.$content.length) {
				slide.$content = slide.$slide
					.wrapInner("<div></div>")
					.children()
					.first();
			}

			slide.$content.addClass("fancybox-content");

			slide.$slide.addClass("fancybox-slide--" + slide.contentType);

			self.afterLoad(slide);
		},

		// Display error message
		// =====================

		setError: function(slide) {
			slide.hasError = true;

			slide.$slide
				.trigger("onReset")
				.removeClass("fancybox-slide--" + slide.contentType)
				.addClass("fancybox-slide--error");

			slide.contentType = "html";

			this.setContent(slide, this.translate(slide, slide.opts.errorTpl));

			if (slide.pos === this.currPos) {
				this.isAnimating = false;
			}
		},

		// Show loading icon inside the slide
		// ==================================

		showLoading: function(slide) {
			var self = this;

			slide = slide || self.current;

			if (slide && !slide.$spinner) {
				slide.$spinner = $(self.translate(self, self.opts.spinnerTpl))
					.appendTo(slide.$slide)
					.hide()
					.fadeIn("fast");
			}
		},

		// Remove loading icon from the slide
		// ==================================

		hideLoading: function(slide) {
			var self = this;

			slide = slide || self.current;

			if (slide && slide.$spinner) {
				slide.$spinner.stop().remove();

				delete slide.$spinner;
			}
		},

		// Adjustments after slide content has been loaded
		// ===============================================

		afterLoad: function(slide) {
			var self = this;

			if (self.isClosing) {
				return;
			}

			slide.isLoading = false;
			slide.isLoaded = true;

			self.trigger("afterLoad", slide);

			self.hideLoading(slide);

			// Add small close button
			if (slide.opts.smallBtn && (!slide.$smallBtn || !slide.$smallBtn.length)) {
				slide.$smallBtn = $(self.translate(slide, slide.opts.btnTpl.smallBtn)).appendTo(slide.$content);
			}

			// Disable right click
			if (slide.opts.protect && slide.$content && !slide.hasError) {
				slide.$content.on("contextmenu.fb", function(e) {
					if (e.button == 2) {
						e.preventDefault();
					}

					return true;
				});

				// Add fake element on top of the image
				// This makes a bit harder for user to select image
				if (slide.type === "image") {
					$('<div class="fancybox-spaceball"></div>').appendTo(slide.$content);
				}
			}

			self.adjustCaption(slide);

			self.adjustLayout(slide);

			if (slide.pos === self.currPos) {
				self.updateCursor();
			}

			self.revealContent(slide);
		},

		// Prevent caption overlap,
		// fix css inconsistency across browsers
		// =====================================

		adjustCaption: function(slide) {
			var self = this,
				current = slide || self.current,
				caption = current.opts.caption,
				$caption = self.$refs.caption,
				captionH = false;

			if (current.opts.preventCaptionOverlap && caption && caption.length) {
				if (current.pos !== self.currPos) {
					$caption = $caption
						.clone()
						.empty()
						.appendTo($caption.parent());

					$caption.html(caption);

					captionH = $caption.outerHeight(true);

					$caption.empty().remove();
				} else if (self.$caption) {
					captionH = self.$caption.outerHeight(true);
				}

				current.$slide.css("padding-bottom", captionH || "");
			}
		},

		// Simple hack to fix inconsistency across browsers, described here (affects Edge, too):
		// https://bugzilla.mozilla.org/show_bug.cgi?id=748518
		// ====================================================================================

		adjustLayout: function(slide) {
			var self = this,
				current = slide || self.current,
				scrollHeight,
				marginBottom,
				inlinePadding,
				actualPadding;

			if (current.isLoaded && current.opts.disableLayoutFix !== true) {
				current.$content.css("margin-bottom", "");

				// If we would always set margin-bottom for the content,
				// then it would potentially break vertical align
				if (current.$content.outerHeight() > current.$slide.height() + 0.5) {
					inlinePadding = current.$slide[0].style["padding-bottom"];
					actualPadding = current.$slide.css("padding-bottom");

					if (parseFloat(actualPadding) > 0) {
						scrollHeight = current.$slide[0].scrollHeight;

						current.$slide.css("padding-bottom", 0);

						if (Math.abs(scrollHeight - current.$slide[0].scrollHeight) < 1) {
							marginBottom = actualPadding;
						}

						current.$slide.css("padding-bottom", inlinePadding);
					}
				}

				current.$content.css("margin-bottom", marginBottom);
			}
		},

		// Make content visible
		// This method is called right after content has been loaded or
		// user navigates gallery and transition should start
		// ============================================================

		revealContent: function(slide) {
			var self = this,
				$slide = slide.$slide,
				end = false,
				start = false,
				isMoved = self.isMoved(slide),
				isRevealed = slide.isRevealed,
				effect,
				effectClassName,
				duration,
				opacity;

			slide.isRevealed = true;

			effect = slide.opts[self.firstRun ? "animationEffect" : "transitionEffect"];
			duration = slide.opts[self.firstRun ? "animationDuration" : "transitionDuration"];

			duration = parseInt(slide.forcedDuration === undefined ? duration : slide.forcedDuration, 10);

			if (isMoved || slide.pos !== self.currPos || !duration) {
				effect = false;
			}

			// Check if can zoom
			if (effect === "zoom") {
				if (slide.pos === self.currPos && duration && slide.type === "image" && !slide.hasError && (start = self.getThumbPos(slide))) {
					end = self.getFitPos(slide);
				} else {
					effect = "fade";
				}
			}

			// Zoom animation
			// ==============
			if (effect === "zoom") {
				self.isAnimating = true;

				end.scaleX = end.width / start.width;
				end.scaleY = end.height / start.height;

				// Check if we need to animate opacity
				opacity = slide.opts.zoomOpacity;

				if (opacity == "auto") {
					opacity = Math.abs(slide.width / slide.height - start.width / start.height) > 0.1;
				}

				if (opacity) {
					start.opacity = 0.1;
					end.opacity = 1;
				}

				// Draw image at start position
				$.fancybox.setTranslate(slide.$content.removeClass("fancybox-is-hidden"), start);

				forceRedraw(slide.$content);

				// Start animation
				$.fancybox.animate(slide.$content, end, duration, function() {
					self.isAnimating = false;

					self.complete();
				});

				return;
			}

			self.updateSlide(slide);

			// Simply show content if no effect
			// ================================
			if (!effect) {
				slide.$content.removeClass("fancybox-is-hidden");

				if (!isRevealed && isMoved && slide.type === "image" && !slide.hasError) {
					slide.$content.hide().fadeIn("fast");
				}

				if (slide.pos === self.currPos) {
					self.complete();
				}

				return;
			}

			// Prepare for CSS transiton
			// =========================
			$.fancybox.stop($slide);

			//effectClassName = "fancybox-animated fancybox-slide--" + (slide.pos >= self.prevPos ? "next" : "previous") + " fancybox-fx-" + effect;
			effectClassName = "fancybox-slide--" + (slide.pos >= self.prevPos ? "next" : "previous") + " fancybox-animated fancybox-fx-" + effect;

			$slide.addClass(effectClassName).removeClass("fancybox-slide--current"); //.addClass(effectClassName);

			slide.$content.removeClass("fancybox-is-hidden");

			// Force reflow
			forceRedraw($slide);

			if (slide.type !== "image") {
				slide.$content.hide().show(0);
			}

			$.fancybox.animate(
				$slide,
				"fancybox-slide--current",
				duration,
				function() {
					$slide.removeClass(effectClassName).css({
						transform: "",
						opacity: ""
					});

					if (slide.pos === self.currPos) {
						self.complete();
					}
				},
				true
			);
		},

		// Check if we can and have to zoom from thumbnail
		//================================================

		getThumbPos: function(slide) {
			var rez = false,
				$thumb = slide.$thumb,
				thumbPos,
				btw,
				brw,
				bbw,
				blw;

			if (!$thumb || !inViewport($thumb[0])) {
				return false;
			}

			thumbPos = $.fancybox.getTranslate($thumb);

			btw = parseFloat($thumb.css("border-top-width") || 0);
			brw = parseFloat($thumb.css("border-right-width") || 0);
			bbw = parseFloat($thumb.css("border-bottom-width") || 0);
			blw = parseFloat($thumb.css("border-left-width") || 0);

			rez = {
				top: thumbPos.top + btw,
				left: thumbPos.left + blw,
				width: thumbPos.width - brw - blw,
				height: thumbPos.height - btw - bbw,
				scaleX: 1,
				scaleY: 1
			};

			return thumbPos.width > 0 && thumbPos.height > 0 ? rez : false;
		},

		// Final adjustments after current gallery item is moved to position
		// and it`s content is loaded
		// ==================================================================

		complete: function() {
			var self = this,
				current = self.current,
				slides = {},
				$el;

			if (self.isMoved() || !current.isLoaded) {
				return;
			}

			if (!current.isComplete) {
				current.isComplete = true;

				current.$slide.siblings().trigger("onReset");

				self.preload("inline");

				// Trigger any CSS transiton inside the slide
				forceRedraw(current.$slide);

				current.$slide.addClass("fancybox-slide--complete");

				// Remove unnecessary slides
				$.each(self.slides, function(key, slide) {
					if (slide.pos >= self.currPos - 1 && slide.pos <= self.currPos + 1) {
						slides[slide.pos] = slide;
					} else if (slide) {
						$.fancybox.stop(slide.$slide);

						slide.$slide.off().remove();
					}
				});

				self.slides = slides;
			}

			self.isAnimating = false;

			self.updateCursor();

			self.trigger("afterShow");

			// Autoplay first html5 video/audio
			if (!!current.opts.video.autoStart) {
				current.$slide
					.find("video,audio")
					.filter(":visible:first")
					.trigger("play")
					.one("ended", function() {
						if (this.webkitExitFullscreen) {
							this.webkitExitFullscreen();
						}

						self.next();
					});
			}

			// Try to focus on the first focusable element
			if (current.opts.autoFocus && current.contentType === "html") {
				// Look for the first input with autofocus attribute
				$el = current.$content.find("input[autofocus]:enabled:visible:first");

				if ($el.length) {
					$el.trigger("focus");
				} else {
					self.focus(null, true);
				}
			}

			// Avoid jumping
			current.$slide.scrollTop(0).scrollLeft(0);
		},

		// Preload next and previous slides
		// ================================

		preload: function(type) {
			var self = this,
				prev,
				next;

			if (self.group.length < 2) {
				return;
			}

			next = self.slides[self.currPos + 1];
			prev = self.slides[self.currPos - 1];

			if (prev && prev.type === type) {
				self.loadSlide(prev);
			}

			if (next && next.type === type) {
				self.loadSlide(next);
			}
		},

		// Try to find and focus on the first focusable element
		// ====================================================

		focus: function(e, firstRun) {
			var self = this,
				focusableStr = [
					"a[href]",
					"area[href]",
					'input:not([disabled]):not([type="hidden"]):not([aria-hidden])',
					"select:not([disabled]):not([aria-hidden])",
					"textarea:not([disabled]):not([aria-hidden])",
					"button:not([disabled]):not([aria-hidden])",
					"iframe",
					"object",
					"embed",
					"[contenteditable]",
					'[tabindex]:not([tabindex^="-"])'
				].join(","),
				focusableItems,
				focusedItemIndex;

			if (self.isClosing) {
				return;
			}

			if (e || !self.current || !self.current.isComplete) {
				// Focus on any element inside fancybox
				focusableItems = self.$refs.container.find("*:visible");
			} else {
				// Focus inside current slide
				focusableItems = self.current.$slide.find("*:visible" + (firstRun ? ":not(.fancybox-close-small)" : ""));
			}

			focusableItems = focusableItems.filter(focusableStr).filter(function() {
				return $(this).css("visibility") !== "hidden" && !$(this).hasClass("disabled");
			});

			if (focusableItems.length) {
				focusedItemIndex = focusableItems.index(document.activeElement);

				if (e && e.shiftKey) {
					// Back tab
					if (focusedItemIndex < 0 || focusedItemIndex == 0) {
						e.preventDefault();

						focusableItems.eq(focusableItems.length - 1).trigger("focus");
					}
				} else {
					// Outside or Forward tab
					if (focusedItemIndex < 0 || focusedItemIndex == focusableItems.length - 1) {
						if (e) {
							e.preventDefault();
						}

						focusableItems.eq(0).trigger("focus");
					}
				}
			} else {
				self.$refs.container.trigger("focus");
			}
		},

		// Activates current instance - brings container to the front and enables keyboard,
		// notifies other instances about deactivating
		// =================================================================================

		activate: function() {
			var self = this;

			// Deactivate all instances
			$(".fancybox-container").each(function() {
				var instance = $(this).data("FancyBox");

				// Skip self and closing instances
				if (instance && instance.id !== self.id && !instance.isClosing) {
					instance.trigger("onDeactivate");

					instance.removeEvents();

					instance.isVisible = false;
				}
			});

			self.isVisible = true;

			if (self.current || self.isIdle) {
				self.update();

				self.updateControls();
			}

			self.trigger("onActivate");

			self.addEvents();
		},

		// Start closing procedure
		// This will start "zoom-out" animation if needed and clean everything up afterwards
		// =================================================================================

		close: function(e, d) {
			var self = this,
				current = self.current,
				effect,
				duration,
				$content,
				domRect,
				opacity,
				start,
				end;

			var done = function() {
				self.cleanUp(e);
			};

			if (self.isClosing) {
				return false;
			}

			self.isClosing = true;

			// If beforeClose callback prevents closing, make sure content is centered
			if (self.trigger("beforeClose", e) === false) {
				self.isClosing = false;

				requestAFrame(function() {
					self.update();
				});

				return false;
			}

			// Remove all events
			// If there are multiple instances, they will be set again by "activate" method
			self.removeEvents();

			$content = current.$content;
			effect = current.opts.animationEffect;
			duration = $.isNumeric(d) ? d : effect ? current.opts.animationDuration : 0;

			current.$slide.removeClass("fancybox-slide--complete fancybox-slide--next fancybox-slide--previous fancybox-animated");

			if (e !== true) {
				$.fancybox.stop(current.$slide);
			} else {
				effect = false;
			}

			// Remove other slides
			current.$slide
				.siblings()
				.trigger("onReset")
				.remove();

			// Trigger animations
			if (duration) {
				self.$refs.container
					.removeClass("fancybox-is-open")
					.addClass("fancybox-is-closing")
					.css("transition-duration", duration + "ms");
			}

			// Clean up
			self.hideLoading(current);

			self.hideControls(true);

			self.updateCursor();

			// Check if possible to zoom-out
			if (
				effect === "zoom" &&
				!($content && duration && current.type === "image" && !self.isMoved() && !current.hasError && (end = self.getThumbPos(current)))
			) {
				effect = "fade";
			}

			if (effect === "zoom") {
				$.fancybox.stop($content);

				domRect = $.fancybox.getTranslate($content);

				start = {
					top: domRect.top,
					left: domRect.left,
					scaleX: domRect.width / end.width,
					scaleY: domRect.height / end.height,
					width: end.width,
					height: end.height
				};

				// Check if we need to animate opacity
				opacity = current.opts.zoomOpacity;

				if (opacity == "auto") {
					opacity = Math.abs(current.width / current.height - end.width / end.height) > 0.1;
				}

				if (opacity) {
					end.opacity = 0;
				}

				$.fancybox.setTranslate($content, start);

				forceRedraw($content);

				$.fancybox.animate($content, end, duration, done);

				return true;
			}

			if (effect && duration) {
				$.fancybox.animate(
					current.$slide.addClass("fancybox-slide--previous").removeClass("fancybox-slide--current"),
					"fancybox-animated fancybox-fx-" + effect,
					duration,
					done
				);
			} else {
				// If skip animation
				if (e === true) {
					setTimeout(done, duration);
				} else {
					done();
				}
			}

			return true;
		},

		// Final adjustments after removing the instance
		// =============================================

		cleanUp: function(e) {
			var self = this,
				instance,
				$focus = self.current.opts.$orig,
				x,
				y;

			self.current.$slide.trigger("onReset");

			self.$refs.container.empty().remove();

			self.trigger("afterClose", e);

			// Place back focus
			if (!!self.current.opts.backFocus) {
				if (!$focus || !$focus.length || !$focus.is(":visible")) {
					$focus = self.$trigger;
				}

				if ($focus && $focus.length) {
					x = window.scrollX;
					y = window.scrollY;

					$focus.trigger("focus");

					$("html, body")
						.scrollTop(y)
						.scrollLeft(x);
				}
			}

			self.current = null;

			// Check if there are other instances
			instance = $.fancybox.getInstance();

			if (instance) {
				instance.activate();
			} else {
				$("body").removeClass("fancybox-active compensate-for-scrollbar");

				$("#fancybox-style-noscroll").remove();
			}
		},

		// Call callback and trigger an event
		// ==================================

		trigger: function(name, slide) {
			var args = Array.prototype.slice.call(arguments, 1),
				self = this,
				obj = slide && slide.opts ? slide : self.current,
				rez;

			if (obj) {
				args.unshift(obj);
			} else {
				obj = self;
			}

			args.unshift(self);

			if ($.isFunction(obj.opts[name])) {
				rez = obj.opts[name].apply(obj, args);
			}

			if (rez === false) {
				return rez;
			}

			if (name === "afterClose" || !self.$refs) {
				$D.trigger(name + ".fb", args);
			} else {
				self.$refs.container.trigger(name + ".fb", args);
			}
		},

		// Update infobar values, navigation button states and reveal caption
		// ==================================================================

		updateControls: function() {
			var self = this,
				current = self.current,
				index = current.index,
				$container = self.$refs.container,
				$caption = self.$refs.caption,
				caption = current.opts.caption;

			// Recalculate content dimensions
			current.$slide.trigger("refresh");

			self.$caption = caption && caption.length ? $caption.html(caption) : null;

			if (!self.hasHiddenControls && !self.isIdle) {
				self.showControls();
			}

			// Update info and navigation elements
			$container.find("[data-fancybox-count]").html(self.group.length);
			$container.find("[data-fancybox-index]").html(index + 1);

			$container.find("[data-fancybox-prev]").prop("disabled", !current.opts.loop && index <= 0);
			$container.find("[data-fancybox-next]").prop("disabled", !current.opts.loop && index >= self.group.length - 1);

			if (current.type === "image") {
				// Re-enable buttons; update download button source
				$container
					.find("[data-fancybox-zoom]")
					.show()
					.end()
					.find("[data-fancybox-download]")
					.attr("href", current.opts.image.src || current.src)
					.show();
			} else if (current.opts.toolbar) {
				$container.find("[data-fancybox-download],[data-fancybox-zoom]").hide();
			}

			// Make sure focus is not on disabled button/element
			if ($(document.activeElement).is(":hidden,[disabled]")) {
				self.$refs.container.trigger("focus");
			}
		},

		// Hide toolbar and caption
		// ========================

		hideControls: function(andCaption) {
			var self = this,
				arr = ["infobar", "toolbar", "nav"];

			if (andCaption || !self.current.opts.preventCaptionOverlap) {
				arr.push("caption");
			}

			this.$refs.container.removeClass(
				arr
					.map(function(i) {
						return "fancybox-show-" + i;
					})
					.join(" ")
			);

			this.hasHiddenControls = true;
		},

		showControls: function() {
			var self = this,
				opts = self.current ? self.current.opts : self.opts,
				$container = self.$refs.container;

			self.hasHiddenControls = false;
			self.idleSecondsCounter = 0;

			$container
				.toggleClass("fancybox-show-toolbar", !!(opts.toolbar && opts.buttons))
				.toggleClass("fancybox-show-infobar", !!(opts.infobar && self.group.length > 1))
				.toggleClass("fancybox-show-caption", !!self.$caption)
				.toggleClass("fancybox-show-nav", !!(opts.arrows && self.group.length > 1))
				.toggleClass("fancybox-is-modal", !!opts.modal);
		},

		// Toggle toolbar and caption
		// ==========================

		toggleControls: function() {
			if (this.hasHiddenControls) {
				this.showControls();
			} else {
				this.hideControls();
			}
		}
	});

	$.fancybox = {
		version: "3.5.2",
		defaults: defaults,

		// Get current instance and execute a command.
		//
		// Examples of usage:
		//
		//   $instance = $.fancybox.getInstance();
		//   $.fancybox.getInstance().jumpTo( 1 );
		//   $.fancybox.getInstance( 'jumpTo', 1 );
		//   $.fancybox.getInstance( function() {
		//       console.info( this.currIndex );
		//   });
		// ======================================================

		getInstance: function(command) {
			var instance = $('.fancybox-container:not(".fancybox-is-closing"):last').data("FancyBox"),
				args = Array.prototype.slice.call(arguments, 1);

			if (instance instanceof FancyBox) {
				if ($.type(command) === "string") {
					instance[command].apply(instance, args);
				} else if ($.type(command) === "function") {
					command.apply(instance, args);
				}

				return instance;
			}

			return false;
		},

		// Create new instance
		// ===================

		open: function(items, opts, index) {
			return new FancyBox(items, opts, index);
		},

		// Close current or all instances
		// ==============================

		close: function(all) {
			var instance = this.getInstance();

			if (instance) {
				instance.close();

				// Try to find and close next instance
				if (all === true) {
					this.close(all);
				}
			}
		},

		// Close all instances and unbind all events
		// =========================================

		destroy: function() {
			this.close(true);

			$D.add("body").off("click.fb-start", "**");
		},

		// Try to detect mobile devices
		// ============================

		isMobile: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent),

		// Detect if 'translate3d' support is available
		// ============================================

		use3d: (function() {
			var div = document.createElement("div");

			return (
				window.getComputedStyle &&
				window.getComputedStyle(div) &&
				window.getComputedStyle(div).getPropertyValue("transform") &&
				!(document.documentMode && document.documentMode < 11)
			);
		})(),

		// Helper function to get current visual state of an element
		// returns array[ top, left, horizontal-scale, vertical-scale, opacity ]
		// =====================================================================

		getTranslate: function($el) {
			var domRect;

			if (!$el || !$el.length) {
				return false;
			}

			domRect = $el[0].getBoundingClientRect();

			return {
				top: domRect.top || 0,
				left: domRect.left || 0,
				width: domRect.width,
				height: domRect.height,
				opacity: parseFloat($el.css("opacity"))
			};
		},

		// Shortcut for setting "translate3d" properties for element
		// Can set be used to set opacity, too
		// ========================================================

		setTranslate: function($el, props) {
			var str = "",
				css = {};

			if (!$el || !props) {
				return;
			}

			if (props.left !== undefined || props.top !== undefined) {
				str =
					(props.left === undefined ? $el.position().left : props.left) +
					"px, " +
					(props.top === undefined ? $el.position().top : props.top) +
					"px";

				if (this.use3d) {
					str = "translate3d(" + str + ", 0px)";
				} else {
					str = "translate(" + str + ")";
				}
			}

			if (props.scaleX !== undefined && props.scaleY !== undefined) {
				str += " scale(" + props.scaleX + ", " + props.scaleY + ")";
			} else if (props.scaleX !== undefined) {
				str += " scaleX(" + props.scaleX + ")";
			}

			if (str.length) {
				css.transform = str;
			}

			if (props.opacity !== undefined) {
				css.opacity = props.opacity;
			}

			if (props.width !== undefined) {
				css.width = props.width;
			}

			if (props.height !== undefined) {
				css.height = props.height;
			}

			return $el.css(css);
		},

		// Simple CSS transition handler
		// =============================

		animate: function($el, to, duration, callback, leaveAnimationName) {
			var self = this,
				from;

			if ($.isFunction(duration)) {
				callback = duration;
				duration = null;
			}

			self.stop($el);

			from = self.getTranslate($el);

			$el.on(transitionEnd, function(e) {
				// Skip events from child elements and z-index change
				if (e && e.originalEvent && (!$el.is(e.originalEvent.target) || e.originalEvent.propertyName == "z-index")) {
					return;
				}

				self.stop($el);

				if ($.isNumeric(duration)) {
					$el.css("transition-duration", "");
				}

				if ($.isPlainObject(to)) {
					if (to.scaleX !== undefined && to.scaleY !== undefined) {
						self.setTranslate($el, {
							top: to.top,
							left: to.left,
							width: from.width * to.scaleX,
							height: from.height * to.scaleY,
							scaleX: 1,
							scaleY: 1
						});
					}
				} else if (leaveAnimationName !== true) {
					$el.removeClass(to);
				}

				if ($.isFunction(callback)) {
					callback(e);
				}
			});

			if ($.isNumeric(duration)) {
				$el.css("transition-duration", duration + "ms");
			}

			// Start animation by changing CSS properties or class name
			if ($.isPlainObject(to)) {
				if (to.scaleX !== undefined && to.scaleY !== undefined) {
					delete to.width;
					delete to.height;

					if ($el.parent().hasClass("fancybox-slide--image")) {
						$el.parent().addClass("fancybox-is-scaling");
					}
				}

				$.fancybox.setTranslate($el, to);
			} else {
				$el.addClass(to);
			}

			// Make sure that `transitionend` callback gets fired
			$el.data(
				"timer",
				setTimeout(function() {
					$el.trigger(transitionEnd);
				}, duration + 33)
			);
		},

		stop: function($el, callCallback) {
			if ($el && $el.length) {
				clearTimeout($el.data("timer"));

				if (callCallback) {
					$el.trigger(transitionEnd);
				}

				$el.off(transitionEnd).css("transition-duration", "");

				$el.parent().removeClass("fancybox-is-scaling");
			}
		}
	};

	// Default click handler for "fancyboxed" links
	// ============================================

	function _run(e, opts) {
		var items = [],
			index = 0,
			$target,
			value,
			instance;

		// Avoid opening multiple times
		if (e && e.isDefaultPrevented()) {
			return;
		}

		e.preventDefault();

		opts = opts || {};

		if (e && e.data) {
			opts = mergeOpts(e.data.options, opts);
		}

		$target = opts.$target || $(e.currentTarget).trigger("blur");
		instance = $.fancybox.getInstance();

		if (instance && instance.$trigger && instance.$trigger.is($target)) {
			return;
		}

		if (opts.selector) {
			items = $(opts.selector);
		} else {
			// Get all related items and find index for clicked one
			value = $target.attr("data-fancybox") || "";

			if (value) {
				items = e.data ? e.data.items : [];
				items = items.length ? items.filter('[data-fancybox="' + value + '"]') : $('[data-fancybox="' + value + '"]');
			} else {
				items = [$target];
			}
		}

		index = $(items).index($target);

		// Sometimes current item can not be found
		if (index < 0) {
			index = 0;
		}

		instance = $.fancybox.open(items, opts, index);

		// Save last active element
		instance.$trigger = $target;
	}

	// Create a jQuery plugin
	// ======================

	$.fn.fancybox = function(options) {
		var selector;

		options = options || {};
		selector = options.selector || false;

		if (selector) {
			// Use body element instead of document so it executes first
			$("body")
				.off("click.fb-start", selector)
				.on("click.fb-start", selector, {options: options}, _run);
		} else {
			this.off("click.fb-start").on(
				"click.fb-start",
				{
					items: this,
					options: options
				},
				_run
			);
		}

		return this;
	};

	// Self initializing plugin for all elements having `data-fancybox` attribute
	// ==========================================================================

	$D.on("click.fb-start", "[data-fancybox]", _run);

	// Enable "trigger elements"
	// =========================

	$D.on("click.fb-start", "[data-fancybox-trigger]", function(e) {
		$('[data-fancybox="' + $(this).attr("data-fancybox-trigger") + '"]')
			.eq($(this).attr("data-fancybox-index") || 0)
			.trigger("click.fb-start", {
				$trigger: $(this)
			});
	});

	// Track focus event for better accessibility styling
	// ==================================================
	(function() {
		var buttonStr = ".fancybox-button",
			focusStr = "fancybox-focus",
			$pressed = null;

		$D.on("mousedown mouseup focus blur", buttonStr, function(e) {
			switch (e.type) {
				case "mousedown":
					$pressed = $(this);
					break;
				case "mouseup":
					$pressed = null;
					break;
				case "focusin":
					$(buttonStr).removeClass(focusStr);

					if (!$(this).is($pressed) && !$(this).is("[disabled]")) {
						$(this).addClass(focusStr);
					}
					break;
				case "focusout":
					$(buttonStr).removeClass(focusStr);
					break;
			}
		});
	})();
})(window, document, jQuery);

// ==========================================================================
//
// Media
// Adds additional media type support
//
// ==========================================================================
(function($) {
	"use strict";

	// Object containing properties for each media type
	var defaults = {
		youtube: {
			matcher: /(youtube\.com|youtu\.be|youtube\-nocookie\.com)\/(watch\?(.*&)?v=|v\/|u\/|embed\/?)?(videoseries\?list=(.*)|[\w-]{11}|\?listType=(.*)&list=(.*))(.*)/i,
			params: {
				autoplay: 1,
				autohide: 1,
				fs: 1,
				rel: 0,
				hd: 1,
				wmode: "transparent",
				enablejsapi: 1,
				html5: 1
			},
			paramPlace: 8,
			type: "iframe",
			url: "//www.youtube-nocookie.com/embed/$4",
			thumb: "//img.youtube.com/vi/$4/hqdefault.jpg"
		},

		vimeo: {
			matcher: /^.+vimeo.com\/(.*\/)?([\d]+)(.*)?/,
			params: {
				autoplay: 1,
				hd: 1,
				show_title: 1,
				show_byline: 1,
				show_portrait: 0,
				fullscreen: 1
			},
			paramPlace: 3,
			type: "iframe",
			url: "//player.vimeo.com/video/$2"
		},

		instagram: {
			matcher: /(instagr\.am|instagram\.com)\/p\/([a-zA-Z0-9_\-]+)\/?/i,
			type: "image",
			url: "//$1/p/$2/media/?size=l"
		},

		// Examples:
		// http://maps.google.com/?ll=48.857995,2.294297&spn=0.007666,0.021136&t=m&z=16
		// https://www.google.com/maps/@37.7852006,-122.4146355,14.65z
		// https://www.google.com/maps/@52.2111123,2.9237542,6.61z?hl=en
		// https://www.google.com/maps/place/Googleplex/@37.4220041,-122.0833494,17z/data=!4m5!3m4!1s0x0:0x6c296c66619367e0!8m2!3d37.4219998!4d-122.0840572
		gmap_place: {
			matcher: /(maps\.)?google\.([a-z]{2,3}(\.[a-z]{2})?)\/(((maps\/(place\/(.*)\/)?\@(.*),(\d+.?\d+?)z))|(\?ll=))(.*)?/i,
			type: "iframe",
			url: function(rez) {
				return (
					"//maps.google." +
					rez[2] +
					"/?ll=" +
					(rez[9] ? rez[9] + "&z=" + Math.floor(rez[10]) + (rez[12] ? rez[12].replace(/^\//, "&") : "") : rez[12] + "").replace(/\?/, "&") +
					"&output=" +
					(rez[12] && rez[12].indexOf("layer=c") > 0 ? "svembed" : "embed")
				);
			}
		},

		// Examples:
		// https://www.google.com/maps/search/Empire+State+Building/
		// https://www.google.com/maps/search/?api=1&query=centurylink+field
		// https://www.google.com/maps/search/?api=1&query=47.5951518,-122.3316393
		gmap_search: {
			matcher: /(maps\.)?google\.([a-z]{2,3}(\.[a-z]{2})?)\/(maps\/search\/)(.*)/i,
			type: "iframe",
			url: function(rez) {
				return "//maps.google." + rez[2] + "/maps?q=" + rez[5].replace("query=", "q=").replace("api=1", "") + "&output=embed";
			}
		}
	};

	// Formats matching url to final form
	var format = function(url, rez, params) {
		if (!url) {
			return;
		}

		params = params || "";

		if ($.type(params) === "object") {
			params = $.param(params, true);
		}

		$.each(rez, function(key, value) {
			url = url.replace("$" + key, value || "");
		});

		if (params.length) {
			url += (url.indexOf("?") > 0 ? "&" : "?") + params;
		}

		return url;
	};

	$(document).on("objectNeedsType.fb", function(e, instance, item) {
		var url = item.src || "",
			type = false,
			media,
			thumb,
			rez,
			params,
			urlParams,
			paramObj,
			provider;

		media = $.extend(true, {}, defaults, item.opts.media);

		// Look for any matching media type
		$.each(media, function(providerName, providerOpts) {
			rez = url.match(providerOpts.matcher);

			if (!rez) {
				return;
			}

			type = providerOpts.type;
			provider = providerName;
			paramObj = {};

			if (providerOpts.paramPlace && rez[providerOpts.paramPlace]) {
				urlParams = rez[providerOpts.paramPlace];

				if (urlParams[0] == "?") {
					urlParams = urlParams.substring(1);
				}

				urlParams = urlParams.split("&");

				for (var m = 0; m < urlParams.length; ++m) {
					var p = urlParams[m].split("=", 2);

					if (p.length == 2) {
						paramObj[p[0]] = decodeURIComponent(p[1].replace(/\+/g, " "));
					}
				}
			}

			params = $.extend(true, {}, providerOpts.params, item.opts[providerName], paramObj);

			url =
				$.type(providerOpts.url) === "function" ? providerOpts.url.call(this, rez, params, item) : format(providerOpts.url, rez, params);

			thumb =
				$.type(providerOpts.thumb) === "function" ? providerOpts.thumb.call(this, rez, params, item) : format(providerOpts.thumb, rez);

			if (providerName === "youtube") {
				url = url.replace(/&t=((\d+)m)?(\d+)s/, function(match, p1, m, s) {
					return "&start=" + ((m ? parseInt(m, 10) * 60 : 0) + parseInt(s, 10));
				});
			} else if (providerName === "vimeo") {
				url = url.replace("&%23", "#");
			}

			return false;
		});

		// If it is found, then change content type and update the url

		if (type) {
			if (!item.opts.thumb && !(item.opts.$thumb && item.opts.$thumb.length)) {
				item.opts.thumb = thumb;
			}

			if (type === "iframe") {
				item.opts = $.extend(true, item.opts, {
					iframe: {
						preload: false,
						attr: {
							scrolling: "no"
						}
					}
				});
			}

			$.extend(item, {
				type: type,
				src: url,
				origSrc: item.src,
				contentSource: provider,
				contentType: type === "image" ? "image" : provider == "gmap_place" || provider == "gmap_search" ? "map" : "video"
			});
		} else if (url) {
			item.type = item.opts.defaultType;
		}
	});

	// Load YouTube/Video API on request to detect when video finished playing
	var VideoAPILoader = {
		youtube: {
			src: "https://www.youtube.com/iframe_api",
			class: "YT",
			loading: false,
			loaded: false
		},

		vimeo: {
			src: "https://player.vimeo.com/api/player.js",
			class: "Vimeo",
			loading: false,
			loaded: false
		},

		load: function(vendor) {
			var _this = this,
				script;

			if (this[vendor].loaded) {
				setTimeout(function() {
					_this.done(vendor);
				});
				return;
			}

			if (this[vendor].loading) {
				return;
			}

			this[vendor].loading = true;

			script = document.createElement("script");
			script.type = "text/javascript";
			script.src = this[vendor].src;

			if (vendor === "youtube") {
				window.onYouTubeIframeAPIReady = function() {
					_this[vendor].loaded = true;
					_this.done(vendor);
				};
			} else {
				script.onload = function() {
					_this[vendor].loaded = true;
					_this.done(vendor);
				};
			}

			document.body.appendChild(script);
		},
		done: function(vendor) {
			var instance, $el, player;

			if (vendor === "youtube") {
				delete window.onYouTubeIframeAPIReady;
			}

			instance = $.fancybox.getInstance();

			if (instance) {
				$el = instance.current.$content.find("iframe");

				if (vendor === "youtube" && YT !== undefined && YT) {
					player = new YT.Player($el.attr("id"), {
						events: {
							onStateChange: function(e) {
								if (e.data == 0) {
									instance.next();
								}
							}
						}
					});
				} else if (vendor === "vimeo" && Vimeo !== undefined && Vimeo) {
					player = new Vimeo.Player($el);

					player.on("ended", function() {
						instance.next();
					});
				}
			}
		}
	};

	$(document).on({
		"afterShow.fb": function(e, instance, current) {
			if (instance.group.length > 1 && (current.contentSource === "youtube" || current.contentSource === "vimeo")) {
				VideoAPILoader.load(current.contentSource);
			}
		}
	});
})(jQuery);

// ==========================================================================
//
// Guestures
// Adds touch guestures, handles click and tap events
//
// ==========================================================================
(function(window, document, $) {
	"use strict";

	var requestAFrame = (function() {
		return (
			window.requestAnimationFrame ||
			window.webkitRequestAnimationFrame ||
			window.mozRequestAnimationFrame ||
			window.oRequestAnimationFrame ||
			// if all else fails, use setTimeout
			function(callback) {
				return window.setTimeout(callback, 1000 / 60);
			}
		);
	})();

	var cancelAFrame = (function() {
		return (
			window.cancelAnimationFrame ||
			window.webkitCancelAnimationFrame ||
			window.mozCancelAnimationFrame ||
			window.oCancelAnimationFrame ||
			function(id) {
				window.clearTimeout(id);
			}
		);
	})();

	var getPointerXY = function(e) {
		var result = [];

		e = e.originalEvent || e || window.e;
		e = e.touches && e.touches.length ? e.touches : e.changedTouches && e.changedTouches.length ? e.changedTouches : [e];

		for (var key in e) {
			if (e[key].pageX) {
				result.push({
					x: e[key].pageX,
					y: e[key].pageY
				});
			} else if (e[key].clientX) {
				result.push({
					x: e[key].clientX,
					y: e[key].clientY
				});
			}
		}

		return result;
	};

	var distance = function(point2, point1, what) {
		if (!point1 || !point2) {
			return 0;
		}

		if (what === "x") {
			return point2.x - point1.x;
		} else if (what === "y") {
			return point2.y - point1.y;
		}

		return Math.sqrt(Math.pow(point2.x - point1.x, 2) + Math.pow(point2.y - point1.y, 2));
	};

	var isClickable = function($el) {
		if (
			$el.is('a,area,button,[role="button"],input,label,select,summary,textarea,video,audio,iframe') ||
			$.isFunction($el.get(0).onclick) ||
			$el.data("selectable")
		) {
			return true;
		}

		// Check for attributes like data-fancybox-next or data-fancybox-close
		for (var i = 0, atts = $el[0].attributes, n = atts.length; i < n; i++) {
			if (atts[i].nodeName.substr(0, 14) === "data-fancybox-") {
				return true;
			}
		}

		return false;
	};

	var hasScrollbars = function(el) {
		var overflowY = window.getComputedStyle(el)["overflow-y"],
			overflowX = window.getComputedStyle(el)["overflow-x"],
			vertical = (overflowY === "scroll" || overflowY === "auto") && el.scrollHeight > el.clientHeight,
			horizontal = (overflowX === "scroll" || overflowX === "auto") && el.scrollWidth > el.clientWidth;

		return vertical || horizontal;
	};

	var isScrollable = function($el) {
		var rez = false;

		while (true) {
			rez = hasScrollbars($el.get(0));

			if (rez) {
				break;
			}

			$el = $el.parent();

			if (!$el.length || $el.hasClass("fancybox-stage") || $el.is("body")) {
				break;
			}
		}

		return rez;
	};

	var Guestures = function(instance) {
		var self = this;

		self.instance = instance;

		self.$bg = instance.$refs.bg;
		self.$stage = instance.$refs.stage;
		self.$container = instance.$refs.container;

		self.destroy();

		self.$container.on("touchstart.fb.touch mousedown.fb.touch", $.proxy(self, "ontouchstart"));
	};

	Guestures.prototype.destroy = function() {
		var self = this;

		self.$container.off(".fb.touch");

		$(document).off(".fb.touch");

		if (self.requestId) {
			cancelAFrame(self.requestId);
			self.requestId = null;
		}

		if (self.tapped) {
			clearTimeout(self.tapped);
			self.tapped = null;
		}
	};

	Guestures.prototype.ontouchstart = function(e) {
		var self = this,
			$target = $(e.target),
			instance = self.instance,
			current = instance.current,
			$slide = current.$slide,
			$content = current.$content,
			isTouchDevice = e.type == "touchstart";

		// Do not respond to both (touch and mouse) events
		if (isTouchDevice) {
			self.$container.off("mousedown.fb.touch");
		}

		// Ignore right click
		if (e.originalEvent && e.originalEvent.button == 2) {
			return;
		}

		// Ignore taping on links, buttons, input elements
		if (!$slide.length || !$target.length || isClickable($target) || isClickable($target.parent())) {
			return;
		}
		// Ignore clicks on the scrollbar
		if (!$target.is("img") && e.originalEvent.clientX > $target[0].clientWidth + $target.offset().left) {
			return;
		}

		// Ignore clicks while zooming or closing
		if (!current || instance.isAnimating || current.$slide.hasClass("fancybox-animated")) {
			e.stopPropagation();
			e.preventDefault();

			return;
		}

		self.realPoints = self.startPoints = getPointerXY(e);

		if (!self.startPoints.length) {
			return;
		}

		// Allow other scripts to catch touch event if "touch" is set to false
		if (current.touch) {
			e.stopPropagation();
		}

		self.startEvent = e;

		self.canTap = true;
		self.$target = $target;
		self.$content = $content;
		self.opts = current.opts.touch;

		self.isPanning = false;
		self.isSwiping = false;
		self.isZooming = false;
		self.isScrolling = false;
		self.canPan = instance.canPan();

		self.startTime = new Date().getTime();
		self.distanceX = self.distanceY = self.distance = 0;

		self.canvasWidth = Math.round($slide[0].clientWidth);
		self.canvasHeight = Math.round($slide[0].clientHeight);

		self.contentLastPos = null;
		self.contentStartPos = $.fancybox.getTranslate(self.$content) || {top: 0, left: 0};
		self.sliderStartPos = $.fancybox.getTranslate($slide);

		// Since position will be absolute, but we need to make it relative to the stage
		self.stagePos = $.fancybox.getTranslate(instance.$refs.stage);

		self.sliderStartPos.top -= self.stagePos.top;
		self.sliderStartPos.left -= self.stagePos.left;

		self.contentStartPos.top -= self.stagePos.top;
		self.contentStartPos.left -= self.stagePos.left;

		$(document)
			.off(".fb.touch")
			.on(isTouchDevice ? "touchend.fb.touch touchcancel.fb.touch" : "mouseup.fb.touch mouseleave.fb.touch", $.proxy(self, "ontouchend"))
			.on(isTouchDevice ? "touchmove.fb.touch" : "mousemove.fb.touch", $.proxy(self, "ontouchmove"));

		if ($.fancybox.isMobile) {
			document.addEventListener("scroll", self.onscroll, true);
		}

		// Skip if clicked outside the sliding area
		if (!(self.opts || self.canPan) || !($target.is(self.$stage) || self.$stage.find($target).length)) {
			if ($target.is(".fancybox-image")) {
				e.preventDefault();
			}

			if (!($.fancybox.isMobile && $target.hasClass("fancybox-caption"))) {
				return;
			}
		}

		self.isScrollable = isScrollable($target) || isScrollable($target.parent());

		// Check if element is scrollable and try to prevent default behavior (scrolling)
		if (!($.fancybox.isMobile && self.isScrollable)) {
			e.preventDefault();
		}

		// One finger or mouse click - swipe or pan an image
		if (self.startPoints.length === 1 || current.hasError) {
			if (self.canPan) {
				$.fancybox.stop(self.$content);

				self.isPanning = true;
			} else {
				self.isSwiping = true;
			}

			self.$container.addClass("fancybox-is-grabbing");
		}

		// Two fingers - zoom image
		if (self.startPoints.length === 2 && current.type === "image" && (current.isLoaded || current.$ghost)) {
			self.canTap = false;
			self.isSwiping = false;
			self.isPanning = false;

			self.isZooming = true;

			$.fancybox.stop(self.$content);

			self.centerPointStartX = (self.startPoints[0].x + self.startPoints[1].x) * 0.5 - $(window).scrollLeft();
			self.centerPointStartY = (self.startPoints[0].y + self.startPoints[1].y) * 0.5 - $(window).scrollTop();

			self.percentageOfImageAtPinchPointX = (self.centerPointStartX - self.contentStartPos.left) / self.contentStartPos.width;
			self.percentageOfImageAtPinchPointY = (self.centerPointStartY - self.contentStartPos.top) / self.contentStartPos.height;

			self.startDistanceBetweenFingers = distance(self.startPoints[0], self.startPoints[1]);
		}
	};

	Guestures.prototype.onscroll = function(e) {
		var self = this;

		self.isScrolling = true;

		document.removeEventListener("scroll", self.onscroll, true);
	};

	Guestures.prototype.ontouchmove = function(e) {
		var self = this;

		// Make sure user has not released over iframe or disabled element
		if (e.originalEvent.buttons !== undefined && e.originalEvent.buttons === 0) {
			self.ontouchend(e);
			return;
		}

		if (self.isScrolling) {
			self.canTap = false;
			return;
		}

		self.newPoints = getPointerXY(e);

		if (!(self.opts || self.canPan) || !self.newPoints.length || !self.newPoints.length) {
			return;
		}

		if (!(self.isSwiping && self.isSwiping === true)) {
			e.preventDefault();
		}

		self.distanceX = distance(self.newPoints[0], self.startPoints[0], "x");
		self.distanceY = distance(self.newPoints[0], self.startPoints[0], "y");

		self.distance = distance(self.newPoints[0], self.startPoints[0]);

		// Skip false ontouchmove events (Chrome)
		if (self.distance > 0) {
			if (self.isSwiping) {
				self.onSwipe(e);
			} else if (self.isPanning) {
				self.onPan();
			} else if (self.isZooming) {
				self.onZoom();
			}
		}
	};

	Guestures.prototype.onSwipe = function(e) {
		var self = this,
			instance = self.instance,
			swiping = self.isSwiping,
			left = self.sliderStartPos.left || 0,
			angle;

		// If direction is not yet determined
		if (swiping === true) {
			// We need at least 10px distance to correctly calculate an angle
			if (Math.abs(self.distance) > 10) {
				self.canTap = false;

				if (instance.group.length < 2 && self.opts.vertical) {
					self.isSwiping = "y";
				} else if (instance.isDragging || self.opts.vertical === false || (self.opts.vertical === "auto" && $(window).width() > 800)) {
					self.isSwiping = "x";
				} else {
					angle = Math.abs((Math.atan2(self.distanceY, self.distanceX) * 180) / Math.PI);

					self.isSwiping = angle > 45 && angle < 135 ? "y" : "x";
				}

				if (self.isSwiping === "y" && $.fancybox.isMobile && self.isScrollable) {
					self.isScrolling = true;

					return;
				}

				instance.isDragging = self.isSwiping;

				// Reset points to avoid jumping, because we dropped first swipes to calculate the angle
				self.startPoints = self.newPoints;

				$.each(instance.slides, function(index, slide) {
					var slidePos, stagePos;

					$.fancybox.stop(slide.$slide);

					slidePos = $.fancybox.getTranslate(slide.$slide);
					stagePos = $.fancybox.getTranslate(instance.$refs.stage);

					slide.$slide
						.css({
							transform: "",
							opacity: "",
							"transition-duration": ""
						})
						.removeClass("fancybox-animated")
						.removeClass(function(index, className) {
							return (className.match(/(^|\s)fancybox-fx-\S+/g) || []).join(" ");
						});

					if (slide.pos === instance.current.pos) {
						self.sliderStartPos.top = slidePos.top - stagePos.top;
						self.sliderStartPos.left = slidePos.left - stagePos.left;
					}

					$.fancybox.setTranslate(slide.$slide, {
						top: slidePos.top - stagePos.top,
						left: slidePos.left - stagePos.left
					});
				});

				// Stop slideshow
				if (instance.SlideShow && instance.SlideShow.isActive) {
					instance.SlideShow.stop();
				}
			}

			return;
		}

		// Sticky edges
		if (swiping == "x") {
			if (
				self.distanceX > 0 &&
				(self.instance.group.length < 2 || (self.instance.current.index === 0 && !self.instance.current.opts.loop))
			) {
				left = left + Math.pow(self.distanceX, 0.8);
			} else if (
				self.distanceX < 0 &&
				(self.instance.group.length < 2 ||
					(self.instance.current.index === self.instance.group.length - 1 && !self.instance.current.opts.loop))
			) {
				left = left - Math.pow(-self.distanceX, 0.8);
			} else {
				left = left + self.distanceX;
			}
		}

		self.sliderLastPos = {
			top: swiping == "x" ? 0 : self.sliderStartPos.top + self.distanceY,
			left: left
		};

		if (self.requestId) {
			cancelAFrame(self.requestId);

			self.requestId = null;
		}

		self.requestId = requestAFrame(function() {
			if (self.sliderLastPos) {
				$.each(self.instance.slides, function(index, slide) {
					var pos = slide.pos - self.instance.currPos;

					$.fancybox.setTranslate(slide.$slide, {
						top: self.sliderLastPos.top,
						left: self.sliderLastPos.left + pos * self.canvasWidth + pos * slide.opts.gutter
					});
				});

				self.$container.addClass("fancybox-is-sliding");
			}
		});
	};

	Guestures.prototype.onPan = function() {
		var self = this;

		// Prevent accidental movement (sometimes, when tapping casually, finger can move a bit)
		if (distance(self.newPoints[0], self.realPoints[0]) < ($.fancybox.isMobile ? 10 : 5)) {
			self.startPoints = self.newPoints;
			return;
		}

		self.canTap = false;

		self.contentLastPos = self.limitMovement();

		if (self.requestId) {
			cancelAFrame(self.requestId);
		}

		self.requestId = requestAFrame(function() {
			$.fancybox.setTranslate(self.$content, self.contentLastPos);
		});
	};

	// Make panning sticky to the edges
	Guestures.prototype.limitMovement = function() {
		var self = this;

		var canvasWidth = self.canvasWidth;
		var canvasHeight = self.canvasHeight;

		var distanceX = self.distanceX;
		var distanceY = self.distanceY;

		var contentStartPos = self.contentStartPos;

		var currentOffsetX = contentStartPos.left;
		var currentOffsetY = contentStartPos.top;

		var currentWidth = contentStartPos.width;
		var currentHeight = contentStartPos.height;

		var minTranslateX, minTranslateY, maxTranslateX, maxTranslateY, newOffsetX, newOffsetY;

		if (currentWidth > canvasWidth) {
			newOffsetX = currentOffsetX + distanceX;
		} else {
			newOffsetX = currentOffsetX;
		}

		newOffsetY = currentOffsetY + distanceY;

		// Slow down proportionally to traveled distance
		minTranslateX = Math.max(0, canvasWidth * 0.5 - currentWidth * 0.5);
		minTranslateY = Math.max(0, canvasHeight * 0.5 - currentHeight * 0.5);

		maxTranslateX = Math.min(canvasWidth - currentWidth, canvasWidth * 0.5 - currentWidth * 0.5);
		maxTranslateY = Math.min(canvasHeight - currentHeight, canvasHeight * 0.5 - currentHeight * 0.5);

		//   ->
		if (distanceX > 0 && newOffsetX > minTranslateX) {
			newOffsetX = minTranslateX - 1 + Math.pow(-minTranslateX + currentOffsetX + distanceX, 0.8) || 0;
		}

		//    <-
		if (distanceX < 0 && newOffsetX < maxTranslateX) {
			newOffsetX = maxTranslateX + 1 - Math.pow(maxTranslateX - currentOffsetX - distanceX, 0.8) || 0;
		}

		//   \/
		if (distanceY > 0 && newOffsetY > minTranslateY) {
			newOffsetY = minTranslateY - 1 + Math.pow(-minTranslateY + currentOffsetY + distanceY, 0.8) || 0;
		}

		//   /\
		if (distanceY < 0 && newOffsetY < maxTranslateY) {
			newOffsetY = maxTranslateY + 1 - Math.pow(maxTranslateY - currentOffsetY - distanceY, 0.8) || 0;
		}

		return {
			top: newOffsetY,
			left: newOffsetX
		};
	};

	Guestures.prototype.limitPosition = function(newOffsetX, newOffsetY, newWidth, newHeight) {
		var self = this;

		var canvasWidth = self.canvasWidth;
		var canvasHeight = self.canvasHeight;

		if (newWidth > canvasWidth) {
			newOffsetX = newOffsetX > 0 ? 0 : newOffsetX;
			newOffsetX = newOffsetX < canvasWidth - newWidth ? canvasWidth - newWidth : newOffsetX;
		} else {
			// Center horizontally
			newOffsetX = Math.max(0, canvasWidth / 2 - newWidth / 2);
		}

		if (newHeight > canvasHeight) {
			newOffsetY = newOffsetY > 0 ? 0 : newOffsetY;
			newOffsetY = newOffsetY < canvasHeight - newHeight ? canvasHeight - newHeight : newOffsetY;
		} else {
			// Center vertically
			newOffsetY = Math.max(0, canvasHeight / 2 - newHeight / 2);
		}

		return {
			top: newOffsetY,
			left: newOffsetX
		};
	};

	Guestures.prototype.onZoom = function() {
		var self = this;

		// Calculate current distance between points to get pinch ratio and new width and height
		var contentStartPos = self.contentStartPos;

		var currentWidth = contentStartPos.width;
		var currentHeight = contentStartPos.height;

		var currentOffsetX = contentStartPos.left;
		var currentOffsetY = contentStartPos.top;

		var endDistanceBetweenFingers = distance(self.newPoints[0], self.newPoints[1]);

		var pinchRatio = endDistanceBetweenFingers / self.startDistanceBetweenFingers;

		var newWidth = Math.floor(currentWidth * pinchRatio);
		var newHeight = Math.floor(currentHeight * pinchRatio);

		// This is the translation due to pinch-zooming
		var translateFromZoomingX = (currentWidth - newWidth) * self.percentageOfImageAtPinchPointX;
		var translateFromZoomingY = (currentHeight - newHeight) * self.percentageOfImageAtPinchPointY;

		// Point between the two touches
		var centerPointEndX = (self.newPoints[0].x + self.newPoints[1].x) / 2 - $(window).scrollLeft();
		var centerPointEndY = (self.newPoints[0].y + self.newPoints[1].y) / 2 - $(window).scrollTop();

		// And this is the translation due to translation of the centerpoint
		// between the two fingers
		var translateFromTranslatingX = centerPointEndX - self.centerPointStartX;
		var translateFromTranslatingY = centerPointEndY - self.centerPointStartY;

		// The new offset is the old/current one plus the total translation
		var newOffsetX = currentOffsetX + (translateFromZoomingX + translateFromTranslatingX);
		var newOffsetY = currentOffsetY + (translateFromZoomingY + translateFromTranslatingY);

		var newPos = {
			top: newOffsetY,
			left: newOffsetX,
			scaleX: pinchRatio,
			scaleY: pinchRatio
		};

		self.canTap = false;

		self.newWidth = newWidth;
		self.newHeight = newHeight;

		self.contentLastPos = newPos;

		if (self.requestId) {
			cancelAFrame(self.requestId);
		}

		self.requestId = requestAFrame(function() {
			$.fancybox.setTranslate(self.$content, self.contentLastPos);
		});
	};

	Guestures.prototype.ontouchend = function(e) {
		var self = this;

		var swiping = self.isSwiping;
		var panning = self.isPanning;
		var zooming = self.isZooming;
		var scrolling = self.isScrolling;

		self.endPoints = getPointerXY(e);
		self.dMs = Math.max(new Date().getTime() - self.startTime, 1);

		self.$container.removeClass("fancybox-is-grabbing");

		$(document).off(".fb.touch");

		document.removeEventListener("scroll", self.onscroll, true);

		if (self.requestId) {
			cancelAFrame(self.requestId);

			self.requestId = null;
		}

		self.isSwiping = false;
		self.isPanning = false;
		self.isZooming = false;
		self.isScrolling = false;

		self.instance.isDragging = false;

		if (self.canTap) {
			return self.onTap(e);
		}

		self.speed = 100;

		// Speed in px/ms
		self.velocityX = (self.distanceX / self.dMs) * 0.5;
		self.velocityY = (self.distanceY / self.dMs) * 0.5;

		if (panning) {
			self.endPanning();
		} else if (zooming) {
			self.endZooming();
		} else {
			self.endSwiping(swiping, scrolling);
		}

		return;
	};

	Guestures.prototype.endSwiping = function(swiping, scrolling) {
		var self = this,
			ret = false,
			len = self.instance.group.length,
			distanceX = Math.abs(self.distanceX),
			canAdvance = swiping == "x" && len > 1 && ((self.dMs > 130 && distanceX > 10) || distanceX > 50),
			speedX = 300;

		self.sliderLastPos = null;

		// Close if swiped vertically / navigate if horizontally
		if (swiping == "y" && !scrolling && Math.abs(self.distanceY) > 50) {
			// Continue vertical movement
			$.fancybox.animate(
				self.instance.current.$slide,
				{
					top: self.sliderStartPos.top + self.distanceY + self.velocityY * 150,
					opacity: 0
				},
				200
			);
			ret = self.instance.close(true, 250);
		} else if (canAdvance && self.distanceX > 0) {
			ret = self.instance.previous(speedX);
		} else if (canAdvance && self.distanceX < 0) {
			ret = self.instance.next(speedX);
		}

		if (ret === false && (swiping == "x" || swiping == "y")) {
			self.instance.centerSlide(200);
		}

		self.$container.removeClass("fancybox-is-sliding");
	};

	// Limit panning from edges
	// ========================
	Guestures.prototype.endPanning = function() {
		var self = this,
			newOffsetX,
			newOffsetY,
			newPos;

		if (!self.contentLastPos) {
			return;
		}

		if (self.opts.momentum === false || self.dMs > 350) {
			newOffsetX = self.contentLastPos.left;
			newOffsetY = self.contentLastPos.top;
		} else {
			// Continue movement
			newOffsetX = self.contentLastPos.left + self.velocityX * 500;
			newOffsetY = self.contentLastPos.top + self.velocityY * 500;
		}

		newPos = self.limitPosition(newOffsetX, newOffsetY, self.contentStartPos.width, self.contentStartPos.height);

		newPos.width = self.contentStartPos.width;
		newPos.height = self.contentStartPos.height;

		$.fancybox.animate(self.$content, newPos, 330);
	};

	Guestures.prototype.endZooming = function() {
		var self = this;

		var current = self.instance.current;

		var newOffsetX, newOffsetY, newPos, reset;

		var newWidth = self.newWidth;
		var newHeight = self.newHeight;

		if (!self.contentLastPos) {
			return;
		}

		newOffsetX = self.contentLastPos.left;
		newOffsetY = self.contentLastPos.top;

		reset = {
			top: newOffsetY,
			left: newOffsetX,
			width: newWidth,
			height: newHeight,
			scaleX: 1,
			scaleY: 1
		};

		// Reset scalex/scaleY values; this helps for perfomance and does not break animation
		$.fancybox.setTranslate(self.$content, reset);

		if (newWidth < self.canvasWidth && newHeight < self.canvasHeight) {
			self.instance.scaleToFit(150);
		} else if (newWidth > current.width || newHeight > current.height) {
			self.instance.scaleToActual(self.centerPointStartX, self.centerPointStartY, 150);
		} else {
			newPos = self.limitPosition(newOffsetX, newOffsetY, newWidth, newHeight);

			$.fancybox.animate(self.$content, newPos, 150);
		}
	};

	Guestures.prototype.onTap = function(e) {
		var self = this;
		var $target = $(e.target);

		var instance = self.instance;
		var current = instance.current;

		var endPoints = (e && getPointerXY(e)) || self.startPoints;

		var tapX = endPoints[0] ? endPoints[0].x - $(window).scrollLeft() - self.stagePos.left : 0;
		var tapY = endPoints[0] ? endPoints[0].y - $(window).scrollTop() - self.stagePos.top : 0;

		var where;

		var process = function(prefix) {
			var action = current.opts[prefix];

			if ($.isFunction(action)) {
				action = action.apply(instance, [current, e]);
			}

			if (!action) {
				return;
			}

			switch (action) {
				case "close":
					instance.close(self.startEvent);

					break;

				case "toggleControls":
					instance.toggleControls();

					break;

				case "next":
					instance.next();

					break;

				case "nextOrClose":
					if (instance.group.length > 1) {
						instance.next();
					} else {
						instance.close(self.startEvent);
					}

					break;

				case "zoom":
					if (current.type == "image" && (current.isLoaded || current.$ghost)) {
						if (instance.canPan()) {
							instance.scaleToFit();
						} else if (instance.isScaledDown()) {
							instance.scaleToActual(tapX, tapY);
						} else if (instance.group.length < 2) {
							instance.close(self.startEvent);
						}
					}

					break;
			}
		};

		// Ignore right click
		if (e.originalEvent && e.originalEvent.button == 2) {
			return;
		}

		// Skip if clicked on the scrollbar
		if (!$target.is("img") && tapX > $target[0].clientWidth + $target.offset().left) {
			return;
		}

		// Check where is clicked
		if ($target.is(".fancybox-bg,.fancybox-inner,.fancybox-outer,.fancybox-container")) {
			where = "Outside";
		} else if ($target.is(".fancybox-slide")) {
			where = "Slide";
		} else if (
			instance.current.$content &&
			instance.current.$content
				.find($target)
				.addBack()
				.filter($target).length
		) {
			where = "Content";
		} else {
			return;
		}

		// Check if this is a double tap
		if (self.tapped) {
			// Stop previously created single tap
			clearTimeout(self.tapped);
			self.tapped = null;

			// Skip if distance between taps is too big
			if (Math.abs(tapX - self.tapX) > 50 || Math.abs(tapY - self.tapY) > 50) {
				return this;
			}

			// OK, now we assume that this is a double-tap
			process("dblclick" + where);
		} else {
			// Single tap will be processed if user has not clicked second time within 300ms
			// or there is no need to wait for double-tap
			self.tapX = tapX;
			self.tapY = tapY;

			if (current.opts["dblclick" + where] && current.opts["dblclick" + where] !== current.opts["click" + where]) {
				self.tapped = setTimeout(function() {
					self.tapped = null;

					if (!instance.isAnimating) {
						process("click" + where);
					}
				}, 500);
			} else {
				process("click" + where);
			}
		}

		return this;
	};

	$(document)
		.on("onActivate.fb", function(e, instance) {
			if (instance && !instance.Guestures) {
				instance.Guestures = new Guestures(instance);
			}
		})
		.on("beforeClose.fb", function(e, instance) {
			if (instance && instance.Guestures) {
				instance.Guestures.destroy();
			}
		});
})(window, document, jQuery);

// ==========================================================================
//
// SlideShow
// Enables slideshow functionality
//
// Example of usage:
// $.fancybox.getInstance().SlideShow.start()
//
// ==========================================================================
(function(document, $) {
	"use strict";

	$.extend(true, $.fancybox.defaults, {
		btnTpl: {
			slideShow:
				'<button data-fancybox-play class="fancybox-button fancybox-button--play" title="{{PLAY_START}}">' +
				'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M6.5 5.4v13.2l11-6.6z"/></svg>' +
				'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M8.33 5.75h2.2v12.5h-2.2V5.75zm5.15 0h2.2v12.5h-2.2V5.75z"/></svg>' +
				"</button>"
		},
		slideShow: {
			autoStart: false,
			speed: 3000,
			progress: true
		}
	});

	var SlideShow = function(instance) {
		this.instance = instance;
		this.init();
	};

	$.extend(SlideShow.prototype, {
		timer: null,
		isActive: false,
		$button: null,

		init: function() {
			var self = this,
				instance = self.instance,
				opts = instance.group[instance.currIndex].opts.slideShow;

			self.$button = instance.$refs.toolbar.find("[data-fancybox-play]").on("click", function() {
				self.toggle();
			});

			if (instance.group.length < 2 || !opts) {
				self.$button.hide();
			} else if (opts.progress) {
				self.$progress = $('<div class="fancybox-progress"></div>').appendTo(instance.$refs.inner);
			}
		},

		set: function(force) {
			var self = this,
				instance = self.instance,
				current = instance.current;

			// Check if reached last element
			if (current && (force === true || current.opts.loop || instance.currIndex < instance.group.length - 1)) {
				if (self.isActive && current.contentType !== "video") {
					if (self.$progress) {
						$.fancybox.animate(self.$progress.show(), {scaleX: 1}, current.opts.slideShow.speed);
					}

					self.timer = setTimeout(function() {
						if (!instance.current.opts.loop && instance.current.index == instance.group.length - 1) {
							instance.jumpTo(0);
						} else {
							instance.next();
						}
					}, current.opts.slideShow.speed);
				}
			} else {
				self.stop();
				instance.idleSecondsCounter = 0;
				instance.showControls();
			}
		},

		clear: function() {
			var self = this;

			clearTimeout(self.timer);

			self.timer = null;

			if (self.$progress) {
				self.$progress.removeAttr("style").hide();
			}
		},

		start: function() {
			var self = this,
				current = self.instance.current;

			if (current) {
				self.$button
					.attr("title", (current.opts.i18n[current.opts.lang] || current.opts.i18n.en).PLAY_STOP)
					.removeClass("fancybox-button--play")
					.addClass("fancybox-button--pause");

				self.isActive = true;

				if (current.isComplete) {
					self.set(true);
				}

				self.instance.trigger("onSlideShowChange", true);
			}
		},

		stop: function() {
			var self = this,
				current = self.instance.current;

			self.clear();

			self.$button
				.attr("title", (current.opts.i18n[current.opts.lang] || current.opts.i18n.en).PLAY_START)
				.removeClass("fancybox-button--pause")
				.addClass("fancybox-button--play");

			self.isActive = false;

			self.instance.trigger("onSlideShowChange", false);

			if (self.$progress) {
				self.$progress.removeAttr("style").hide();
			}
		},

		toggle: function() {
			var self = this;

			if (self.isActive) {
				self.stop();
			} else {
				self.start();
			}
		}
	});

	$(document).on({
		"onInit.fb": function(e, instance) {
			if (instance && !instance.SlideShow) {
				instance.SlideShow = new SlideShow(instance);
			}
		},

		"beforeShow.fb": function(e, instance, current, firstRun) {
			var SlideShow = instance && instance.SlideShow;

			if (firstRun) {
				if (SlideShow && current.opts.slideShow.autoStart) {
					SlideShow.start();
				}
			} else if (SlideShow && SlideShow.isActive) {
				SlideShow.clear();
			}
		},

		"afterShow.fb": function(e, instance, current) {
			var SlideShow = instance && instance.SlideShow;

			if (SlideShow && SlideShow.isActive) {
				SlideShow.set();
			}
		},

		"afterKeydown.fb": function(e, instance, current, keypress, keycode) {
			var SlideShow = instance && instance.SlideShow;

			// "P" or Spacebar
			if (SlideShow && current.opts.slideShow && (keycode === 80 || keycode === 32) && !$(document.activeElement).is("button,a,input")) {
				keypress.preventDefault();

				SlideShow.toggle();
			}
		},

		"beforeClose.fb onDeactivate.fb": function(e, instance) {
			var SlideShow = instance && instance.SlideShow;

			if (SlideShow) {
				SlideShow.stop();
			}
		}
	});

	// Page Visibility API to pause slideshow when window is not active
	$(document).on("visibilitychange", function() {
		var instance = $.fancybox.getInstance(),
			SlideShow = instance && instance.SlideShow;

		if (SlideShow && SlideShow.isActive) {
			if (document.hidden) {
				SlideShow.clear();
			} else {
				SlideShow.set();
			}
		}
	});
})(document, jQuery);

// ==========================================================================
//
// FullScreen
// Adds fullscreen functionality
//
// ==========================================================================
(function(document, $) {
	"use strict";

	// Collection of methods supported by user browser
	var fn = (function() {
		var fnMap = [
			["requestFullscreen", "exitFullscreen", "fullscreenElement", "fullscreenEnabled", "fullscreenchange", "fullscreenerror"],
			// new WebKit
			[
				"webkitRequestFullscreen",
				"webkitExitFullscreen",
				"webkitFullscreenElement",
				"webkitFullscreenEnabled",
				"webkitfullscreenchange",
				"webkitfullscreenerror"
			],
			// old WebKit (Safari 5.1)
			[
				"webkitRequestFullScreen",
				"webkitCancelFullScreen",
				"webkitCurrentFullScreenElement",
				"webkitCancelFullScreen",
				"webkitfullscreenchange",
				"webkitfullscreenerror"
			],
			[
				"mozRequestFullScreen",
				"mozCancelFullScreen",
				"mozFullScreenElement",
				"mozFullScreenEnabled",
				"mozfullscreenchange",
				"mozfullscreenerror"
			],
			["msRequestFullscreen", "msExitFullscreen", "msFullscreenElement", "msFullscreenEnabled", "MSFullscreenChange", "MSFullscreenError"]
		];

		var ret = {};

		for (var i = 0; i < fnMap.length; i++) {
			var val = fnMap[i];

			if (val && val[1] in document) {
				for (var j = 0; j < val.length; j++) {
					ret[fnMap[0][j]] = val[j];
				}

				return ret;
			}
		}

		return false;
	})();

	if (fn) {
		var FullScreen = {
			request: function(elem) {
				elem = elem || document.documentElement;

				elem[fn.requestFullscreen](elem.ALLOW_KEYBOARD_INPUT);
			},
			exit: function() {
				document[fn.exitFullscreen]();
			},
			toggle: function(elem) {
				elem = elem || document.documentElement;

				if (this.isFullscreen()) {
					this.exit();
				} else {
					this.request(elem);
				}
			},
			isFullscreen: function() {
				return Boolean(document[fn.fullscreenElement]);
			},
			enabled: function() {
				return Boolean(document[fn.fullscreenEnabled]);
			}
		};

		$.extend(true, $.fancybox.defaults, {
			btnTpl: {
				fullScreen:
					'<button data-fancybox-fullscreen class="fancybox-button fancybox-button--fsenter" title="{{FULL_SCREEN}}">' +
					'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/></svg>' +
					'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M5 16h3v3h2v-5H5zm3-8H5v2h5V5H8zm6 11h2v-3h3v-2h-5zm2-11V5h-2v5h5V8z"/></svg>' +
					"</button>"
			},
			fullScreen: {
				autoStart: false
			}
		});

		$(document).on(fn.fullscreenchange, function() {
			var isFullscreen = FullScreen.isFullscreen(),
				instance = $.fancybox.getInstance();

			if (instance) {
				// If image is zooming, then force to stop and reposition properly
				if (instance.current && instance.current.type === "image" && instance.isAnimating) {
					instance.current.$content.css("transition", "none");

					instance.isAnimating = false;

					instance.update(true, true, 0);
				}

				instance.trigger("onFullscreenChange", isFullscreen);

				instance.$refs.container.toggleClass("fancybox-is-fullscreen", isFullscreen);

				instance.$refs.toolbar
					.find("[data-fancybox-fullscreen]")
					.toggleClass("fancybox-button--fsenter", !isFullscreen)
					.toggleClass("fancybox-button--fsexit", isFullscreen);
			}
		});
	}

	$(document).on({
		"onInit.fb": function(e, instance) {
			var $container;

			if (!fn) {
				instance.$refs.toolbar.find("[data-fancybox-fullscreen]").remove();

				return;
			}

			if (instance && instance.group[instance.currIndex].opts.fullScreen) {
				$container = instance.$refs.container;

				$container.on("click.fb-fullscreen", "[data-fancybox-fullscreen]", function(e) {
					e.stopPropagation();
					e.preventDefault();

					FullScreen.toggle();
				});

				if (instance.opts.fullScreen && instance.opts.fullScreen.autoStart === true) {
					FullScreen.request();
				}

				// Expose API
				instance.FullScreen = FullScreen;
			} else if (instance) {
				instance.$refs.toolbar.find("[data-fancybox-fullscreen]").hide();
			}
		},

		"afterKeydown.fb": function(e, instance, current, keypress, keycode) {
			// "F"
			if (instance && instance.FullScreen && keycode === 70) {
				keypress.preventDefault();

				instance.FullScreen.toggle();
			}
		},

		"beforeClose.fb": function(e, instance) {
			if (instance && instance.FullScreen && instance.$refs.container.hasClass("fancybox-is-fullscreen")) {
				FullScreen.exit();
			}
		}
	});
})(document, jQuery);

// ==========================================================================
//
// Thumbs
// Displays thumbnails in a grid
//
// ==========================================================================
(function(document, $) {
	"use strict";

	var CLASS = "fancybox-thumbs",
		CLASS_ACTIVE = CLASS + "-active";

	// Make sure there are default values
	$.fancybox.defaults = $.extend(
		true,
		{
			btnTpl: {
				thumbs:
					'<button data-fancybox-thumbs class="fancybox-button fancybox-button--thumbs" title="{{THUMBS}}">' +
					'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M14.59 14.59h3.76v3.76h-3.76v-3.76zm-4.47 0h3.76v3.76h-3.76v-3.76zm-4.47 0h3.76v3.76H5.65v-3.76zm8.94-4.47h3.76v3.76h-3.76v-3.76zm-4.47 0h3.76v3.76h-3.76v-3.76zm-4.47 0h3.76v3.76H5.65v-3.76zm8.94-4.47h3.76v3.76h-3.76V5.65zm-4.47 0h3.76v3.76h-3.76V5.65zm-4.47 0h3.76v3.76H5.65V5.65z"/></svg>' +
					"</button>"
			},
			thumbs: {
				autoStart: false, // Display thumbnails on opening
				hideOnClose: true, // Hide thumbnail grid when closing animation starts
				parentEl: ".fancybox-container", // Container is injected into this element
				axis: "y" // Vertical (y) or horizontal (x) scrolling
			}
		},
		$.fancybox.defaults
	);

	var FancyThumbs = function(instance) {
		this.init(instance);
	};

	$.extend(FancyThumbs.prototype, {
		$button: null,
		$grid: null,
		$list: null,
		isVisible: false,
		isActive: false,

		init: function(instance) {
			var self = this,
				group = instance.group,
				enabled = 0;

			self.instance = instance;
			self.opts = group[instance.currIndex].opts.thumbs;

			instance.Thumbs = self;

			self.$button = instance.$refs.toolbar.find("[data-fancybox-thumbs]");

			// Enable thumbs if at least two group items have thumbnails
			for (var i = 0, len = group.length; i < len; i++) {
				if (group[i].thumb) {
					enabled++;
				}

				if (enabled > 1) {
					break;
				}
			}

			if (enabled > 1 && !!self.opts) {
				self.$button.removeAttr("style").on("click", function() {
					self.toggle();
				});

				self.isActive = true;
			} else {
				self.$button.hide();
			}
		},

		create: function() {
			var self = this,
				instance = self.instance,
				parentEl = self.opts.parentEl,
				list = [],
				src;

			if (!self.$grid) {
				// Create main element
				self.$grid = $('<div class="' + CLASS + " " + CLASS + "-" + self.opts.axis + '"></div>').appendTo(
					instance.$refs.container
						.find(parentEl)
						.addBack()
						.filter(parentEl)
				);

				// Add "click" event that performs gallery navigation
				self.$grid.on("click", "a", function() {
					instance.jumpTo($(this).attr("data-index"));
				});
			}

			// Build the list
			if (!self.$list) {
				self.$list = $('<div class="' + CLASS + '__list">').appendTo(self.$grid);
			}

			$.each(instance.group, function(i, item) {
				src = item.thumb;

				if (!src && item.type === "image") {
					src = item.src;
				}

				list.push(
					'<a href="javascript:;" tabindex="0" data-index="' +
					i +
					'"' +
					(src && src.length ? ' style="background-image:url(' + src + ')"' : 'class="fancybox-thumbs-missing"') +
					"></a>"
				);
			});

			self.$list[0].innerHTML = list.join("");

			if (self.opts.axis === "x") {
				// Set fixed width for list element to enable horizontal scrolling
				self.$list.width(
					parseInt(self.$grid.css("padding-right"), 10) +
					instance.group.length *
					self.$list
						.children()
						.eq(0)
						.outerWidth(true)
				);
			}
		},

		focus: function(duration) {
			var self = this,
				$list = self.$list,
				$grid = self.$grid,
				thumb,
				thumbPos;

			if (!self.instance.current) {
				return;
			}

			thumb = $list
				.children()
				.removeClass(CLASS_ACTIVE)
				.filter('[data-index="' + self.instance.current.index + '"]')
				.addClass(CLASS_ACTIVE);

			thumbPos = thumb.position();

			// Check if need to scroll to make current thumb visible
			if (self.opts.axis === "y" && (thumbPos.top < 0 || thumbPos.top > $list.height() - thumb.outerHeight())) {
				$list.stop().animate(
					{
						scrollTop: $list.scrollTop() + thumbPos.top
					},
					duration
				);
			} else if (
				self.opts.axis === "x" &&
				(thumbPos.left < $grid.scrollLeft() || thumbPos.left > $grid.scrollLeft() + ($grid.width() - thumb.outerWidth()))
			) {
				$list
					.parent()
					.stop()
					.animate(
						{
							scrollLeft: thumbPos.left
						},
						duration
					);
			}
		},

		update: function() {
			var that = this;
			that.instance.$refs.container.toggleClass("fancybox-show-thumbs", this.isVisible);

			if (that.isVisible) {
				if (!that.$grid) {
					that.create();
				}

				that.instance.trigger("onThumbsShow");

				that.focus(0);
			} else if (that.$grid) {
				that.instance.trigger("onThumbsHide");
			}

			// Update content position
			that.instance.update();
		},

		hide: function() {
			this.isVisible = false;
			this.update();
		},

		show: function() {
			this.isVisible = true;
			this.update();
		},

		toggle: function() {
			this.isVisible = !this.isVisible;
			this.update();
		}
	});

	$(document).on({
		"onInit.fb": function(e, instance) {
			var Thumbs;

			if (instance && !instance.Thumbs) {
				Thumbs = new FancyThumbs(instance);

				if (Thumbs.isActive && Thumbs.opts.autoStart === true) {
					Thumbs.show();
				}
			}
		},

		"beforeShow.fb": function(e, instance, item, firstRun) {
			var Thumbs = instance && instance.Thumbs;

			if (Thumbs && Thumbs.isVisible) {
				Thumbs.focus(firstRun ? 0 : 250);
			}
		},

		"afterKeydown.fb": function(e, instance, current, keypress, keycode) {
			var Thumbs = instance && instance.Thumbs;

			// "G"
			if (Thumbs && Thumbs.isActive && keycode === 71) {
				keypress.preventDefault();

				Thumbs.toggle();
			}
		},

		"beforeClose.fb": function(e, instance) {
			var Thumbs = instance && instance.Thumbs;

			if (Thumbs && Thumbs.isVisible && Thumbs.opts.hideOnClose !== false) {
				Thumbs.$grid.hide();
			}
		}
	});
})(document, jQuery);

//// ==========================================================================
//
// Share
// Displays simple form for sharing current url
//
// ==========================================================================
(function(document, $) {
	"use strict";

	$.extend(true, $.fancybox.defaults, {
		btnTpl: {
			share:
				'<button data-fancybox-share class="fancybox-button fancybox-button--share" title="{{SHARE}}">' +
				'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M2.55 19c1.4-8.4 9.1-9.8 11.9-9.8V5l7 7-7 6.3v-3.5c-2.8 0-10.5 2.1-11.9 4.2z"/></svg>' +
				"</button>"
		},
		share: {
			url: function(instance, item) {
				return (
					(!instance.currentHash && !(item.type === "inline" || item.type === "html") ? item.origSrc || item.src : false) || window.location
				);
			},
			tpl:
				'<div class="fancybox-share">' +
				"<h1>{{SHARE}}</h1>" +
				"<p>" +
				'<a class="fancybox-share__button fancybox-share__button--fb" href="https://www.facebook.com/sharer/sharer.php?u={{url}}">' +
				'<svg viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg"><path d="m287 456v-299c0-21 6-35 35-35h38v-63c-7-1-29-3-55-3-54 0-91 33-91 94v306m143-254h-205v72h196" /></svg>' +
				"<span>Facebook</span>" +
				"</a>" +
				'<a class="fancybox-share__button fancybox-share__button--tw" href="https://twitter.com/intent/tweet?url={{url}}&text={{descr}}">' +
				'<svg viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg"><path d="m456 133c-14 7-31 11-47 13 17-10 30-27 37-46-15 10-34 16-52 20-61-62-157-7-141 75-68-3-129-35-169-85-22 37-11 86 26 109-13 0-26-4-37-9 0 39 28 72 65 80-12 3-25 4-37 2 10 33 41 57 77 57-42 30-77 38-122 34 170 111 378-32 359-208 16-11 30-25 41-42z" /></svg>' +
				"<span>Twitter</span>" +
				"</a>" +
				'<a class="fancybox-share__button fancybox-share__button--pt" href="https://www.pinterest.com/pin/create/button/?url={{url}}&description={{descr}}&media={{media}}">' +
				'<svg viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg"><path d="m265 56c-109 0-164 78-164 144 0 39 15 74 47 87 5 2 10 0 12-5l4-19c2-6 1-8-3-13-9-11-15-25-15-45 0-58 43-110 113-110 62 0 96 38 96 88 0 67-30 122-73 122-24 0-42-19-36-44 6-29 20-60 20-81 0-19-10-35-31-35-25 0-44 26-44 60 0 21 7 36 7 36l-30 125c-8 37-1 83 0 87 0 3 4 4 5 2 2-3 32-39 42-75l16-64c8 16 31 29 56 29 74 0 124-67 124-157 0-69-58-132-146-132z" fill="#fff"/></svg>' +
				"<span>Pinterest</span>" +
				"</a>" +
				"</p>" +
				'<p><input class="fancybox-share__input" type="text" value="{{url_raw}}" onclick="select()" /></p>' +
				"</div>"
		}
	});

	function escapeHtml(string) {
		var entityMap = {
			"&": "&amp;",
			"<": "&lt;",
			">": "&gt;",
			'"': "&quot;",
			"'": "&#39;",
			"/": "&#x2F;",
			"`": "&#x60;",
			"=": "&#x3D;"
		};

		return String(string).replace(/[&<>"'`=\/]/g, function(s) {
			return entityMap[s];
		});
	}

	$(document).on("click", "[data-fancybox-share]", function() {
		var instance = $.fancybox.getInstance(),
			current = instance.current || null,
			url,
			tpl;

		if (!current) {
			return;
		}

		if ($.type(current.opts.share.url) === "function") {
			url = current.opts.share.url.apply(current, [instance, current]);
		}

		tpl = current.opts.share.tpl
			.replace(/\{\{media\}\}/g, current.type === "image" ? encodeURIComponent(current.src) : "")
			.replace(/\{\{url\}\}/g, encodeURIComponent(url))
			.replace(/\{\{url_raw\}\}/g, escapeHtml(url))
			.replace(/\{\{descr\}\}/g, instance.$caption ? encodeURIComponent(instance.$caption.text()) : "");

		$.fancybox.open({
			src: instance.translate(instance, tpl),
			type: "html",
			opts: {
				touch: false,
				animationEffect: false,
				afterLoad: function(shareInstance, shareCurrent) {
					// Close self if parent instance is closing
					instance.$refs.container.one("beforeClose.fb", function() {
						shareInstance.close(null, 0);
					});

					// Opening links in a popup window
					shareCurrent.$content.find(".fancybox-share__button").click(function() {
						window.open(this.href, "Share", "width=550, height=450");
						return false;
					});
				},
				mobile: {
					autoFocus: false
				}
			}
		});
	});
})(document, jQuery);

// ==========================================================================
//
// Hash
// Enables linking to each modal
//
// ==========================================================================
(function(window, document, $) {
	"use strict";

	// Simple $.escapeSelector polyfill (for jQuery prior v3)
	if (!$.escapeSelector) {
		$.escapeSelector = function(sel) {
			var rcssescape = /([\0-\x1f\x7f]|^-?\d)|^-$|[^\x80-\uFFFF\w-]/g;
			var fcssescape = function(ch, asCodePoint) {
				if (asCodePoint) {
					// U+0000 NULL becomes U+FFFD REPLACEMENT CHARACTER
					if (ch === "\0") {
						return "\uFFFD";
					}

					// Control characters and (dependent upon position) numbers get escaped as code points
					return ch.slice(0, -1) + "\\" + ch.charCodeAt(ch.length - 1).toString(16) + " ";
				}

				// Other potentially-special ASCII characters get backslash-escaped
				return "\\" + ch;
			};

			return (sel + "").replace(rcssescape, fcssescape);
		};
	}

	// Get info about gallery name and current index from url
	function parseUrl() {
		var hash = window.location.hash.substr(1),
			rez = hash.split("-"),
			index = rez.length > 1 && /^\+?\d+$/.test(rez[rez.length - 1]) ? parseInt(rez.pop(-1), 10) || 1 : 1,
			gallery = rez.join("-");

		return {
			hash: hash,
			/* Index is starting from 1 */
			index: index < 1 ? 1 : index,
			gallery: gallery
		};
	}

	// Trigger click evnt on links to open new fancyBox instance
	function triggerFromUrl(url) {
		if (url.gallery !== "") {
			// If we can find element matching 'data-fancybox' atribute,
			// then triggering click event should start fancyBox
			$("[data-fancybox='" + $.escapeSelector(url.gallery) + "']")
				.eq(url.index - 1)
				.focus()
				.trigger("click.fb-start");
		}
	}

	// Get gallery name from current instance
	function getGalleryID(instance) {
		var opts, ret;

		if (!instance) {
			return false;
		}

		opts = instance.current ? instance.current.opts : instance.opts;
		ret = opts.hash || (opts.$orig ? opts.$orig.data("fancybox") || opts.$orig.data("fancybox-trigger") : "");

		return ret === "" ? false : ret;
	}

	// Start when DOM becomes ready
	$(function() {
		// Check if user has disabled this module
		if ($.fancybox.defaults.hash === false) {
			return;
		}

		// Update hash when opening/closing fancyBox
		$(document).on({
			"onInit.fb": function(e, instance) {
				var url, gallery;

				if (instance.group[instance.currIndex].opts.hash === false) {
					return;
				}

				url = parseUrl();
				gallery = getGalleryID(instance);

				// Make sure gallery start index matches index from hash
				if (gallery && url.gallery && gallery == url.gallery) {
					instance.currIndex = url.index - 1;
				}
			},

			"beforeShow.fb": function(e, instance, current, firstRun) {
				var gallery;

				if (!current || current.opts.hash === false) {
					return;
				}

				// Check if need to update window hash
				gallery = getGalleryID(instance);

				if (!gallery) {
					return;
				}

				// Variable containing last hash value set by fancyBox
				// It will be used to determine if fancyBox needs to close after hash change is detected
				instance.currentHash = gallery + (instance.group.length > 1 ? "-" + (current.index + 1) : "");

				// If current hash is the same (this instance most likely is opened by hashchange), then do nothing
				if (window.location.hash === "#" + instance.currentHash) {
					return;
				}

				if (firstRun && !instance.origHash) {
					instance.origHash = window.location.hash;
				}

				if (instance.hashTimer) {
					clearTimeout(instance.hashTimer);
				}

				// Update hash
				instance.hashTimer = setTimeout(function() {
					if ("replaceState" in window.history) {
						window.history[firstRun ? "pushState" : "replaceState"](
							{},
							document.title,
							window.location.pathname + window.location.search + "#" + instance.currentHash
						);

						if (firstRun) {
							instance.hasCreatedHistory = true;
						}
					} else {
						window.location.hash = instance.currentHash;
					}

					instance.hashTimer = null;
				}, 300);
			},

			"beforeClose.fb": function(e, instance, current) {
				if (current.opts.hash === false) {
					return;
				}

				clearTimeout(instance.hashTimer);

				// Goto previous history entry
				if (instance.currentHash && instance.hasCreatedHistory) {
					window.history.back();
				} else if (instance.currentHash) {
					if ("replaceState" in window.history) {
						window.history.replaceState({}, document.title, window.location.pathname + window.location.search + (instance.origHash || ""));
					} else {
						window.location.hash = instance.origHash;
					}
				}

				instance.currentHash = null;
			}
		});

		// Check if need to start/close after url has changed
		$(window).on("hashchange.fb", function() {
			var url = parseUrl(),
				fb = null;

			// Find last fancyBox instance that has "hash"
			$.each(
				$(".fancybox-container")
					.get()
					.reverse(),
				function(index, value) {
					var tmp = $(value).data("FancyBox");

					if (tmp && tmp.currentHash) {
						fb = tmp;
						return false;
					}
				}
			);

			if (fb) {
				// Now, compare hash values
				if (fb.currentHash !== url.gallery + "-" + url.index && !(url.index === 1 && fb.currentHash == url.gallery)) {
					fb.currentHash = null;

					fb.close();
				}
			} else if (url.gallery !== "") {
				triggerFromUrl(url);
			}
		});

		// Check current hash and trigger click event on matching element to start fancyBox, if needed
		setTimeout(function() {
			if (!$.fancybox.getInstance()) {
				triggerFromUrl(parseUrl());
			}
		}, 50);
	});
})(window, document, jQuery);

// ==========================================================================
//
// Wheel
// Basic mouse weheel support for gallery navigation
//
// ==========================================================================
(function(document, $) {
	"use strict";

	var prevTime = new Date().getTime();

	$(document).on({
		"onInit.fb": function(e, instance, current) {
			instance.$refs.stage.on("mousewheel DOMMouseScroll wheel MozMousePixelScroll", function(e) {
				var current = instance.current,
					currTime = new Date().getTime();

				if (instance.group.length < 2 || current.opts.wheel === false || (current.opts.wheel === "auto" && current.type !== "image")) {
					return;
				}

				e.preventDefault();
				e.stopPropagation();

				if (current.$slide.hasClass("fancybox-animated")) {
					return;
				}

				e = e.originalEvent || e;

				if (currTime - prevTime < 250) {
					return;
				}

				prevTime = currTime;

				instance[(-e.deltaY || -e.deltaX || e.wheelDelta || -e.detail) < 0 ? "next" : "previous"]();
			});
		}
	});
})(document, jQuery);

(function ($) {
	$(document).ready(function () {
		app.init();
	});

	var app = {
		init: function () {
			this.accessibility();
			this.utils();
			this.menu();
			this.carousel();
			this.multimedia();
		},

		/**
		 * Accessibility functions
		 *
		 */
		accessibility: function () {
			// High contrast
			$('#high-contrast-btn').click(function (e) {
				e.preventDefault();
				var highContrast = cookie('high-contrast');

				if (highContrast === 'on') {
					cookie('high-contrast', 'off');
					$('body').removeClass('high-contrast');
				} else {
					cookie('high-contrast', 'on');
					$('body').addClass('high-contrast');
				}
			})
		},

		/**
		 * Menu Functions
		 *
		 */
		menu: function () {

			// High contrast
			$('#menu-toggle').click(function () {
				$('body').toggleClass('menu-active');

				if ($('body').hasClass('menu-active')) {
					bodyScrollLock.disableBodyScroll(document.querySelector('.scrollTarget'),{
						allowTouchMove: el => (el.tagName === 'div')
  				});

				}
			})

			$('#menu-wrapper, #menu-toggle').click(function(event){
				event.stopPropagation();
			});

			$('body, .close-menu').click(function(event){
				$('body').removeClass('menu-active');

				bodyScrollLock.clearAllBodyScrollLocks();
			});

			$('.widget_nav_menu').click(function() {
				$(this).toggleClass('active');
			});
		},

		carousel: function() {
			var $carousel = $('#jumbotron-carousel');

			app.swipedetect($carousel.find('.carousel-inner')[0], function(swipedir){
					if (swipedir === 'right') {
						$carousel.carousel('prev');
					}

					if (swipedir === 'left') {
						$carousel.carousel('next');
					}
			});
		},

		/**
		 * Utility functions, used on all sites
		 *
		 */
		utils: function () {
			// Enable bootstrap tooltip
			$('[data-toggle="tooltip"]').tooltip();

			// Fancybox for gallery media
			if( $('.gallery').length ){
				$('.gallery-item').each( function () {
					var caption = $(this).find('.gallery-caption').text();
					$(this).find('a').attr( 'data-caption', caption );
				});
				$('.gallery-item a').attr( 'data-fancybox', 'group' );
				$('.gallery-item a').fancybox({});
			}

			$('.toggle-active').click( function() {
				$(this).parent().toggleClass('active');
			});

			$('a.share-link').on('click', function(event) {
				event.preventDefault();
				var url = $(this).attr('href');
				showModal(url);
			});

			function showModal(url){
				window.open(url, "shareWindow", "width=600, height=400");
				return false;
			}
		},

		// credit: http://www.javascriptkit.com/javatutors/touchevents2.shtml
		swipedetect: function(el, callback){

			var touchsurface = Array.isArray(el) ? el : [el],
					swipedir,
					startX,
					startY,
					distX,
					distY,
					threshold = 100, //required min distance traveled to be considered swipe
					restraint = 100, // maximum distance allowed at the same time in perpendicular direction
					allowedTime = 300, // maximum time allowed to travel that distance
					elapsedTime,
					startTime,
					handleswipe = callback || function(swipedir){};

			touchsurface.forEach( (element) => {
				if (!element) return;

				element.addEventListener('touchstart', function(e){

					var touchobj = e.changedTouches[0];
					swipedir = 'none';
					dist = 0;
					startX = touchobj.pageX;
					startY = touchobj.pageY;
					startTime = new Date().getTime(); // record time when finger first makes contact with surface

				}, false);

				element.addEventListener('touchend', function(e){
					var touchobj = e.changedTouches[0];
					distX = touchobj.pageX - startX; // get horizontal dist traveled by finger while in contact with surface
					distY = touchobj.pageY - startY; // get vertical dist traveled by finger while in contact with surface
					elapsedTime = new Date().getTime() - startTime; // get time elapsed

					if (elapsedTime <= allowedTime) { // first condition for awipe met
							if (Math.abs(distX) >= threshold && Math.abs(distY) <= restraint){ // 2nd condition for horizontal swipe met
								swipedir = (distX < 0)? 'left' : 'right'; // if dist traveled is negative, it indicates left swipe
							}

							else if (Math.abs(distY) >= threshold && Math.abs(distX) <= restraint){ // 2nd condition for vertical swipe met
								swipedir = (distY < 0)? 'up' : 'down'; // if dist traveled is negative, it indicates up swipe
							}
					}

					handleswipe(swipedir);
				}, false)
			});
		},

		agenda: function () {
			$('#datepicker').datepicker({
				dayNamesMin: ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab']
			});

			$('.monthpicker').on('click', function (e) {
				e.preventDefault();
				$('.monthpicker').datepicker('show');
			});
		},

		multimedia: function () {
			$('#play-multimedia-video').click(function (e) {
				e.preventDefault();

				var vID = $(this).data('video-src'),
					vidWidth = 1150,
					vidHeight = 530;

				var iFrameCode = '<iframe class="idg-video-player" width="' + vidWidth + '" height="'+ vidHeight +'" scrolling="no" allowtransparency="true" allowfullscreen="true" src="https://www.youtube.com/embed/'+  vID +'?rel=0&wmode=transparent&showinfo=0&autoplay=1" frameborder="0" allow="autoplay"></iframe>';

				$('#multimidia .highlight').addClass('highlight-video-player').html(iFrameCode);

			})
		}
	};
})(jQuery);

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiIiwic291cmNlcyI6WyJidW5kbGUuanMiXSwic291cmNlc0NvbnRlbnQiOlsiLyoqIVxuICogQGZpbGVPdmVydmlldyBLaWNrYXNzIGxpYnJhcnkgdG8gY3JlYXRlIGFuZCBwbGFjZSBwb3BwZXJzIG5lYXIgdGhlaXIgcmVmZXJlbmNlIGVsZW1lbnRzLlxuICogQHZlcnNpb24gMS4xNC43XG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IChjKSAyMDE2IEZlZGVyaWNvIFppdm9sbyBhbmQgY29udHJpYnV0b3JzXG4gKlxuICogUGVybWlzc2lvbiBpcyBoZXJlYnkgZ3JhbnRlZCwgZnJlZSBvZiBjaGFyZ2UsIHRvIGFueSBwZXJzb24gb2J0YWluaW5nIGEgY29weVxuICogb2YgdGhpcyBzb2Z0d2FyZSBhbmQgYXNzb2NpYXRlZCBkb2N1bWVudGF0aW9uIGZpbGVzICh0aGUgXCJTb2Z0d2FyZVwiKSwgdG8gZGVhbFxuICogaW4gdGhlIFNvZnR3YXJlIHdpdGhvdXQgcmVzdHJpY3Rpb24sIGluY2x1ZGluZyB3aXRob3V0IGxpbWl0YXRpb24gdGhlIHJpZ2h0c1xuICogdG8gdXNlLCBjb3B5LCBtb2RpZnksIG1lcmdlLCBwdWJsaXNoLCBkaXN0cmlidXRlLCBzdWJsaWNlbnNlLCBhbmQvb3Igc2VsbFxuICogY29waWVzIG9mIHRoZSBTb2Z0d2FyZSwgYW5kIHRvIHBlcm1pdCBwZXJzb25zIHRvIHdob20gdGhlIFNvZnR3YXJlIGlzXG4gKiBmdXJuaXNoZWQgdG8gZG8gc28sIHN1YmplY3QgdG8gdGhlIGZvbGxvd2luZyBjb25kaXRpb25zOlxuICpcbiAqIFRoZSBhYm92ZSBjb3B5cmlnaHQgbm90aWNlIGFuZCB0aGlzIHBlcm1pc3Npb24gbm90aWNlIHNoYWxsIGJlIGluY2x1ZGVkIGluIGFsbFxuICogY29waWVzIG9yIHN1YnN0YW50aWFsIHBvcnRpb25zIG9mIHRoZSBTb2Z0d2FyZS5cbiAqXG4gKiBUSEUgU09GVFdBUkUgSVMgUFJPVklERUQgXCJBUyBJU1wiLCBXSVRIT1VUIFdBUlJBTlRZIE9GIEFOWSBLSU5ELCBFWFBSRVNTIE9SXG4gKiBJTVBMSUVELCBJTkNMVURJTkcgQlVUIE5PVCBMSU1JVEVEIFRPIFRIRSBXQVJSQU5USUVTIE9GIE1FUkNIQU5UQUJJTElUWSxcbiAqIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFIEFORCBOT05JTkZSSU5HRU1FTlQuIElOIE5PIEVWRU5UIFNIQUxMIFRIRVxuICogQVVUSE9SUyBPUiBDT1BZUklHSFQgSE9MREVSUyBCRSBMSUFCTEUgRk9SIEFOWSBDTEFJTSwgREFNQUdFUyBPUiBPVEhFUlxuICogTElBQklMSVRZLCBXSEVUSEVSIElOIEFOIEFDVElPTiBPRiBDT05UUkFDVCwgVE9SVCBPUiBPVEhFUldJU0UsIEFSSVNJTkcgRlJPTSxcbiAqIE9VVCBPRiBPUiBJTiBDT05ORUNUSU9OIFdJVEggVEhFIFNPRlRXQVJFIE9SIFRIRSBVU0UgT1IgT1RIRVIgREVBTElOR1MgSU4gVEhFXG4gKiBTT0ZUV0FSRS5cbiAqL1xuKGZ1bmN0aW9uIChnbG9iYWwsIGZhY3RvcnkpIHtcblx0dHlwZW9mIGV4cG9ydHMgPT09ICdvYmplY3QnICYmIHR5cGVvZiBtb2R1bGUgIT09ICd1bmRlZmluZWQnID8gbW9kdWxlLmV4cG9ydHMgPSBmYWN0b3J5KCkgOlxuXHR0eXBlb2YgZGVmaW5lID09PSAnZnVuY3Rpb24nICYmIGRlZmluZS5hbWQgPyBkZWZpbmUoZmFjdG9yeSkgOlxuXHQoZ2xvYmFsLlBvcHBlciA9IGZhY3RvcnkoKSk7XG59KHRoaXMsIChmdW5jdGlvbiAoKSB7ICd1c2Ugc3RyaWN0JztcblxudmFyIGlzQnJvd3NlciA9IHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnICYmIHR5cGVvZiBkb2N1bWVudCAhPT0gJ3VuZGVmaW5lZCc7XG5cbnZhciBsb25nZXJUaW1lb3V0QnJvd3NlcnMgPSBbJ0VkZ2UnLCAnVHJpZGVudCcsICdGaXJlZm94J107XG52YXIgdGltZW91dER1cmF0aW9uID0gMDtcbmZvciAodmFyIGkgPSAwOyBpIDwgbG9uZ2VyVGltZW91dEJyb3dzZXJzLmxlbmd0aDsgaSArPSAxKSB7XG4gIGlmIChpc0Jyb3dzZXIgJiYgbmF2aWdhdG9yLnVzZXJBZ2VudC5pbmRleE9mKGxvbmdlclRpbWVvdXRCcm93c2Vyc1tpXSkgPj0gMCkge1xuICAgIHRpbWVvdXREdXJhdGlvbiA9IDE7XG4gICAgYnJlYWs7XG4gIH1cbn1cblxuZnVuY3Rpb24gbWljcm90YXNrRGVib3VuY2UoZm4pIHtcbiAgdmFyIGNhbGxlZCA9IGZhbHNlO1xuICByZXR1cm4gZnVuY3Rpb24gKCkge1xuICAgIGlmIChjYWxsZWQpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgY2FsbGVkID0gdHJ1ZTtcbiAgICB3aW5kb3cuUHJvbWlzZS5yZXNvbHZlKCkudGhlbihmdW5jdGlvbiAoKSB7XG4gICAgICBjYWxsZWQgPSBmYWxzZTtcbiAgICAgIGZuKCk7XG4gICAgfSk7XG4gIH07XG59XG5cbmZ1bmN0aW9uIHRhc2tEZWJvdW5jZShmbikge1xuICB2YXIgc2NoZWR1bGVkID0gZmFsc2U7XG4gIHJldHVybiBmdW5jdGlvbiAoKSB7XG4gICAgaWYgKCFzY2hlZHVsZWQpIHtcbiAgICAgIHNjaGVkdWxlZCA9IHRydWU7XG4gICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uICgpIHtcbiAgICAgICAgc2NoZWR1bGVkID0gZmFsc2U7XG4gICAgICAgIGZuKCk7XG4gICAgICB9LCB0aW1lb3V0RHVyYXRpb24pO1xuICAgIH1cbiAgfTtcbn1cblxudmFyIHN1cHBvcnRzTWljcm9UYXNrcyA9IGlzQnJvd3NlciAmJiB3aW5kb3cuUHJvbWlzZTtcblxuLyoqXG4qIENyZWF0ZSBhIGRlYm91bmNlZCB2ZXJzaW9uIG9mIGEgbWV0aG9kLCB0aGF0J3MgYXN5bmNocm9ub3VzbHkgZGVmZXJyZWRcbiogYnV0IGNhbGxlZCBpbiB0aGUgbWluaW11bSB0aW1lIHBvc3NpYmxlLlxuKlxuKiBAbWV0aG9kXG4qIEBtZW1iZXJvZiBQb3BwZXIuVXRpbHNcbiogQGFyZ3VtZW50IHtGdW5jdGlvbn0gZm5cbiogQHJldHVybnMge0Z1bmN0aW9ufVxuKi9cbnZhciBkZWJvdW5jZSA9IHN1cHBvcnRzTWljcm9UYXNrcyA/IG1pY3JvdGFza0RlYm91bmNlIDogdGFza0RlYm91bmNlO1xuXG4vKipcbiAqIENoZWNrIGlmIHRoZSBnaXZlbiB2YXJpYWJsZSBpcyBhIGZ1bmN0aW9uXG4gKiBAbWV0aG9kXG4gKiBAbWVtYmVyb2YgUG9wcGVyLlV0aWxzXG4gKiBAYXJndW1lbnQge0FueX0gZnVuY3Rpb25Ub0NoZWNrIC0gdmFyaWFibGUgdG8gY2hlY2tcbiAqIEByZXR1cm5zIHtCb29sZWFufSBhbnN3ZXIgdG86IGlzIGEgZnVuY3Rpb24/XG4gKi9cbmZ1bmN0aW9uIGlzRnVuY3Rpb24oZnVuY3Rpb25Ub0NoZWNrKSB7XG4gIHZhciBnZXRUeXBlID0ge307XG4gIHJldHVybiBmdW5jdGlvblRvQ2hlY2sgJiYgZ2V0VHlwZS50b1N0cmluZy5jYWxsKGZ1bmN0aW9uVG9DaGVjaykgPT09ICdbb2JqZWN0IEZ1bmN0aW9uXSc7XG59XG5cbi8qKlxuICogR2V0IENTUyBjb21wdXRlZCBwcm9wZXJ0eSBvZiB0aGUgZ2l2ZW4gZWxlbWVudFxuICogQG1ldGhvZFxuICogQG1lbWJlcm9mIFBvcHBlci5VdGlsc1xuICogQGFyZ3VtZW50IHtFZW1lbnR9IGVsZW1lbnRcbiAqIEBhcmd1bWVudCB7U3RyaW5nfSBwcm9wZXJ0eVxuICovXG5mdW5jdGlvbiBnZXRTdHlsZUNvbXB1dGVkUHJvcGVydHkoZWxlbWVudCwgcHJvcGVydHkpIHtcbiAgaWYgKGVsZW1lbnQubm9kZVR5cGUgIT09IDEpIHtcbiAgICByZXR1cm4gW107XG4gIH1cbiAgLy8gTk9URTogMSBET00gYWNjZXNzIGhlcmVcbiAgdmFyIHdpbmRvdyA9IGVsZW1lbnQub3duZXJEb2N1bWVudC5kZWZhdWx0VmlldztcbiAgdmFyIGNzcyA9IHdpbmRvdy5nZXRDb21wdXRlZFN0eWxlKGVsZW1lbnQsIG51bGwpO1xuICByZXR1cm4gcHJvcGVydHkgPyBjc3NbcHJvcGVydHldIDogY3NzO1xufVxuXG4vKipcbiAqIFJldHVybnMgdGhlIHBhcmVudE5vZGUgb3IgdGhlIGhvc3Qgb2YgdGhlIGVsZW1lbnRcbiAqIEBtZXRob2RcbiAqIEBtZW1iZXJvZiBQb3BwZXIuVXRpbHNcbiAqIEBhcmd1bWVudCB7RWxlbWVudH0gZWxlbWVudFxuICogQHJldHVybnMge0VsZW1lbnR9IHBhcmVudFxuICovXG5mdW5jdGlvbiBnZXRQYXJlbnROb2RlKGVsZW1lbnQpIHtcbiAgaWYgKGVsZW1lbnQubm9kZU5hbWUgPT09ICdIVE1MJykge1xuICAgIHJldHVybiBlbGVtZW50O1xuICB9XG4gIHJldHVybiBlbGVtZW50LnBhcmVudE5vZGUgfHwgZWxlbWVudC5ob3N0O1xufVxuXG4vKipcbiAqIFJldHVybnMgdGhlIHNjcm9sbGluZyBwYXJlbnQgb2YgdGhlIGdpdmVuIGVsZW1lbnRcbiAqIEBtZXRob2RcbiAqIEBtZW1iZXJvZiBQb3BwZXIuVXRpbHNcbiAqIEBhcmd1bWVudCB7RWxlbWVudH0gZWxlbWVudFxuICogQHJldHVybnMge0VsZW1lbnR9IHNjcm9sbCBwYXJlbnRcbiAqL1xuZnVuY3Rpb24gZ2V0U2Nyb2xsUGFyZW50KGVsZW1lbnQpIHtcbiAgLy8gUmV0dXJuIGJvZHksIGBnZXRTY3JvbGxgIHdpbGwgdGFrZSBjYXJlIHRvIGdldCB0aGUgY29ycmVjdCBgc2Nyb2xsVG9wYCBmcm9tIGl0XG4gIGlmICghZWxlbWVudCkge1xuICAgIHJldHVybiBkb2N1bWVudC5ib2R5O1xuICB9XG5cbiAgc3dpdGNoIChlbGVtZW50Lm5vZGVOYW1lKSB7XG4gICAgY2FzZSAnSFRNTCc6XG4gICAgY2FzZSAnQk9EWSc6XG4gICAgICByZXR1cm4gZWxlbWVudC5vd25lckRvY3VtZW50LmJvZHk7XG4gICAgY2FzZSAnI2RvY3VtZW50JzpcbiAgICAgIHJldHVybiBlbGVtZW50LmJvZHk7XG4gIH1cblxuICAvLyBGaXJlZm94IHdhbnQgdXMgdG8gY2hlY2sgYC14YCBhbmQgYC15YCB2YXJpYXRpb25zIGFzIHdlbGxcblxuICB2YXIgX2dldFN0eWxlQ29tcHV0ZWRQcm9wID0gZ2V0U3R5bGVDb21wdXRlZFByb3BlcnR5KGVsZW1lbnQpLFxuICAgICAgb3ZlcmZsb3cgPSBfZ2V0U3R5bGVDb21wdXRlZFByb3Aub3ZlcmZsb3csXG4gICAgICBvdmVyZmxvd1ggPSBfZ2V0U3R5bGVDb21wdXRlZFByb3Aub3ZlcmZsb3dYLFxuICAgICAgb3ZlcmZsb3dZID0gX2dldFN0eWxlQ29tcHV0ZWRQcm9wLm92ZXJmbG93WTtcblxuICBpZiAoLyhhdXRvfHNjcm9sbHxvdmVybGF5KS8udGVzdChvdmVyZmxvdyArIG92ZXJmbG93WSArIG92ZXJmbG93WCkpIHtcbiAgICByZXR1cm4gZWxlbWVudDtcbiAgfVxuXG4gIHJldHVybiBnZXRTY3JvbGxQYXJlbnQoZ2V0UGFyZW50Tm9kZShlbGVtZW50KSk7XG59XG5cbnZhciBpc0lFMTEgPSBpc0Jyb3dzZXIgJiYgISEod2luZG93Lk1TSW5wdXRNZXRob2RDb250ZXh0ICYmIGRvY3VtZW50LmRvY3VtZW50TW9kZSk7XG52YXIgaXNJRTEwID0gaXNCcm93c2VyICYmIC9NU0lFIDEwLy50ZXN0KG5hdmlnYXRvci51c2VyQWdlbnQpO1xuXG4vKipcbiAqIERldGVybWluZXMgaWYgdGhlIGJyb3dzZXIgaXMgSW50ZXJuZXQgRXhwbG9yZXJcbiAqIEBtZXRob2RcbiAqIEBtZW1iZXJvZiBQb3BwZXIuVXRpbHNcbiAqIEBwYXJhbSB7TnVtYmVyfSB2ZXJzaW9uIHRvIGNoZWNrXG4gKiBAcmV0dXJucyB7Qm9vbGVhbn0gaXNJRVxuICovXG5mdW5jdGlvbiBpc0lFKHZlcnNpb24pIHtcbiAgaWYgKHZlcnNpb24gPT09IDExKSB7XG4gICAgcmV0dXJuIGlzSUUxMTtcbiAgfVxuICBpZiAodmVyc2lvbiA9PT0gMTApIHtcbiAgICByZXR1cm4gaXNJRTEwO1xuICB9XG4gIHJldHVybiBpc0lFMTEgfHwgaXNJRTEwO1xufVxuXG4vKipcbiAqIFJldHVybnMgdGhlIG9mZnNldCBwYXJlbnQgb2YgdGhlIGdpdmVuIGVsZW1lbnRcbiAqIEBtZXRob2RcbiAqIEBtZW1iZXJvZiBQb3BwZXIuVXRpbHNcbiAqIEBhcmd1bWVudCB7RWxlbWVudH0gZWxlbWVudFxuICogQHJldHVybnMge0VsZW1lbnR9IG9mZnNldCBwYXJlbnRcbiAqL1xuZnVuY3Rpb24gZ2V0T2Zmc2V0UGFyZW50KGVsZW1lbnQpIHtcbiAgaWYgKCFlbGVtZW50KSB7XG4gICAgcmV0dXJuIGRvY3VtZW50LmRvY3VtZW50RWxlbWVudDtcbiAgfVxuXG4gIHZhciBub09mZnNldFBhcmVudCA9IGlzSUUoMTApID8gZG9jdW1lbnQuYm9keSA6IG51bGw7XG5cbiAgLy8gTk9URTogMSBET00gYWNjZXNzIGhlcmVcbiAgdmFyIG9mZnNldFBhcmVudCA9IGVsZW1lbnQub2Zmc2V0UGFyZW50IHx8IG51bGw7XG4gIC8vIFNraXAgaGlkZGVuIGVsZW1lbnRzIHdoaWNoIGRvbid0IGhhdmUgYW4gb2Zmc2V0UGFyZW50XG4gIHdoaWxlIChvZmZzZXRQYXJlbnQgPT09IG5vT2Zmc2V0UGFyZW50ICYmIGVsZW1lbnQubmV4dEVsZW1lbnRTaWJsaW5nKSB7XG4gICAgb2Zmc2V0UGFyZW50ID0gKGVsZW1lbnQgPSBlbGVtZW50Lm5leHRFbGVtZW50U2libGluZykub2Zmc2V0UGFyZW50O1xuICB9XG5cbiAgdmFyIG5vZGVOYW1lID0gb2Zmc2V0UGFyZW50ICYmIG9mZnNldFBhcmVudC5ub2RlTmFtZTtcblxuICBpZiAoIW5vZGVOYW1lIHx8IG5vZGVOYW1lID09PSAnQk9EWScgfHwgbm9kZU5hbWUgPT09ICdIVE1MJykge1xuICAgIHJldHVybiBlbGVtZW50ID8gZWxlbWVudC5vd25lckRvY3VtZW50LmRvY3VtZW50RWxlbWVudCA6IGRvY3VtZW50LmRvY3VtZW50RWxlbWVudDtcbiAgfVxuXG4gIC8vIC5vZmZzZXRQYXJlbnQgd2lsbCByZXR1cm4gdGhlIGNsb3Nlc3QgVEgsIFREIG9yIFRBQkxFIGluIGNhc2VcbiAgLy8gbm8gb2Zmc2V0UGFyZW50IGlzIHByZXNlbnQsIEkgaGF0ZSB0aGlzIGpvYi4uLlxuICBpZiAoWydUSCcsICdURCcsICdUQUJMRSddLmluZGV4T2Yob2Zmc2V0UGFyZW50Lm5vZGVOYW1lKSAhPT0gLTEgJiYgZ2V0U3R5bGVDb21wdXRlZFByb3BlcnR5KG9mZnNldFBhcmVudCwgJ3Bvc2l0aW9uJykgPT09ICdzdGF0aWMnKSB7XG4gICAgcmV0dXJuIGdldE9mZnNldFBhcmVudChvZmZzZXRQYXJlbnQpO1xuICB9XG5cbiAgcmV0dXJuIG9mZnNldFBhcmVudDtcbn1cblxuZnVuY3Rpb24gaXNPZmZzZXRDb250YWluZXIoZWxlbWVudCkge1xuICB2YXIgbm9kZU5hbWUgPSBlbGVtZW50Lm5vZGVOYW1lO1xuXG4gIGlmIChub2RlTmFtZSA9PT0gJ0JPRFknKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG4gIHJldHVybiBub2RlTmFtZSA9PT0gJ0hUTUwnIHx8IGdldE9mZnNldFBhcmVudChlbGVtZW50LmZpcnN0RWxlbWVudENoaWxkKSA9PT0gZWxlbWVudDtcbn1cblxuLyoqXG4gKiBGaW5kcyB0aGUgcm9vdCBub2RlIChkb2N1bWVudCwgc2hhZG93RE9NIHJvb3QpIG9mIHRoZSBnaXZlbiBlbGVtZW50XG4gKiBAbWV0aG9kXG4gKiBAbWVtYmVyb2YgUG9wcGVyLlV0aWxzXG4gKiBAYXJndW1lbnQge0VsZW1lbnR9IG5vZGVcbiAqIEByZXR1cm5zIHtFbGVtZW50fSByb290IG5vZGVcbiAqL1xuZnVuY3Rpb24gZ2V0Um9vdChub2RlKSB7XG4gIGlmIChub2RlLnBhcmVudE5vZGUgIT09IG51bGwpIHtcbiAgICByZXR1cm4gZ2V0Um9vdChub2RlLnBhcmVudE5vZGUpO1xuICB9XG5cbiAgcmV0dXJuIG5vZGU7XG59XG5cbi8qKlxuICogRmluZHMgdGhlIG9mZnNldCBwYXJlbnQgY29tbW9uIHRvIHRoZSB0d28gcHJvdmlkZWQgbm9kZXNcbiAqIEBtZXRob2RcbiAqIEBtZW1iZXJvZiBQb3BwZXIuVXRpbHNcbiAqIEBhcmd1bWVudCB7RWxlbWVudH0gZWxlbWVudDFcbiAqIEBhcmd1bWVudCB7RWxlbWVudH0gZWxlbWVudDJcbiAqIEByZXR1cm5zIHtFbGVtZW50fSBjb21tb24gb2Zmc2V0IHBhcmVudFxuICovXG5mdW5jdGlvbiBmaW5kQ29tbW9uT2Zmc2V0UGFyZW50KGVsZW1lbnQxLCBlbGVtZW50Mikge1xuICAvLyBUaGlzIGNoZWNrIGlzIG5lZWRlZCB0byBhdm9pZCBlcnJvcnMgaW4gY2FzZSBvbmUgb2YgdGhlIGVsZW1lbnRzIGlzbid0IGRlZmluZWQgZm9yIGFueSByZWFzb25cbiAgaWYgKCFlbGVtZW50MSB8fCAhZWxlbWVudDEubm9kZVR5cGUgfHwgIWVsZW1lbnQyIHx8ICFlbGVtZW50Mi5ub2RlVHlwZSkge1xuICAgIHJldHVybiBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQ7XG4gIH1cblxuICAvLyBIZXJlIHdlIG1ha2Ugc3VyZSB0byBnaXZlIGFzIFwic3RhcnRcIiB0aGUgZWxlbWVudCB0aGF0IGNvbWVzIGZpcnN0IGluIHRoZSBET01cbiAgdmFyIG9yZGVyID0gZWxlbWVudDEuY29tcGFyZURvY3VtZW50UG9zaXRpb24oZWxlbWVudDIpICYgTm9kZS5ET0NVTUVOVF9QT1NJVElPTl9GT0xMT1dJTkc7XG4gIHZhciBzdGFydCA9IG9yZGVyID8gZWxlbWVudDEgOiBlbGVtZW50MjtcbiAgdmFyIGVuZCA9IG9yZGVyID8gZWxlbWVudDIgOiBlbGVtZW50MTtcblxuICAvLyBHZXQgY29tbW9uIGFuY2VzdG9yIGNvbnRhaW5lclxuICB2YXIgcmFuZ2UgPSBkb2N1bWVudC5jcmVhdGVSYW5nZSgpO1xuICByYW5nZS5zZXRTdGFydChzdGFydCwgMCk7XG4gIHJhbmdlLnNldEVuZChlbmQsIDApO1xuICB2YXIgY29tbW9uQW5jZXN0b3JDb250YWluZXIgPSByYW5nZS5jb21tb25BbmNlc3RvckNvbnRhaW5lcjtcblxuICAvLyBCb3RoIG5vZGVzIGFyZSBpbnNpZGUgI2RvY3VtZW50XG5cbiAgaWYgKGVsZW1lbnQxICE9PSBjb21tb25BbmNlc3RvckNvbnRhaW5lciAmJiBlbGVtZW50MiAhPT0gY29tbW9uQW5jZXN0b3JDb250YWluZXIgfHwgc3RhcnQuY29udGFpbnMoZW5kKSkge1xuICAgIGlmIChpc09mZnNldENvbnRhaW5lcihjb21tb25BbmNlc3RvckNvbnRhaW5lcikpIHtcbiAgICAgIHJldHVybiBjb21tb25BbmNlc3RvckNvbnRhaW5lcjtcbiAgICB9XG5cbiAgICByZXR1cm4gZ2V0T2Zmc2V0UGFyZW50KGNvbW1vbkFuY2VzdG9yQ29udGFpbmVyKTtcbiAgfVxuXG4gIC8vIG9uZSBvZiB0aGUgbm9kZXMgaXMgaW5zaWRlIHNoYWRvd0RPTSwgZmluZCB3aGljaCBvbmVcbiAgdmFyIGVsZW1lbnQxcm9vdCA9IGdldFJvb3QoZWxlbWVudDEpO1xuICBpZiAoZWxlbWVudDFyb290Lmhvc3QpIHtcbiAgICByZXR1cm4gZmluZENvbW1vbk9mZnNldFBhcmVudChlbGVtZW50MXJvb3QuaG9zdCwgZWxlbWVudDIpO1xuICB9IGVsc2Uge1xuICAgIHJldHVybiBmaW5kQ29tbW9uT2Zmc2V0UGFyZW50KGVsZW1lbnQxLCBnZXRSb290KGVsZW1lbnQyKS5ob3N0KTtcbiAgfVxufVxuXG4vKipcbiAqIEdldHMgdGhlIHNjcm9sbCB2YWx1ZSBvZiB0aGUgZ2l2ZW4gZWxlbWVudCBpbiB0aGUgZ2l2ZW4gc2lkZSAodG9wIGFuZCBsZWZ0KVxuICogQG1ldGhvZFxuICogQG1lbWJlcm9mIFBvcHBlci5VdGlsc1xuICogQGFyZ3VtZW50IHtFbGVtZW50fSBlbGVtZW50XG4gKiBAYXJndW1lbnQge1N0cmluZ30gc2lkZSBgdG9wYCBvciBgbGVmdGBcbiAqIEByZXR1cm5zIHtudW1iZXJ9IGFtb3VudCBvZiBzY3JvbGxlZCBwaXhlbHNcbiAqL1xuZnVuY3Rpb24gZ2V0U2Nyb2xsKGVsZW1lbnQpIHtcbiAgdmFyIHNpZGUgPSBhcmd1bWVudHMubGVuZ3RoID4gMSAmJiBhcmd1bWVudHNbMV0gIT09IHVuZGVmaW5lZCA/IGFyZ3VtZW50c1sxXSA6ICd0b3AnO1xuXG4gIHZhciB1cHBlclNpZGUgPSBzaWRlID09PSAndG9wJyA/ICdzY3JvbGxUb3AnIDogJ3Njcm9sbExlZnQnO1xuICB2YXIgbm9kZU5hbWUgPSBlbGVtZW50Lm5vZGVOYW1lO1xuXG4gIGlmIChub2RlTmFtZSA9PT0gJ0JPRFknIHx8IG5vZGVOYW1lID09PSAnSFRNTCcpIHtcbiAgICB2YXIgaHRtbCA9IGVsZW1lbnQub3duZXJEb2N1bWVudC5kb2N1bWVudEVsZW1lbnQ7XG4gICAgdmFyIHNjcm9sbGluZ0VsZW1lbnQgPSBlbGVtZW50Lm93bmVyRG9jdW1lbnQuc2Nyb2xsaW5nRWxlbWVudCB8fCBodG1sO1xuICAgIHJldHVybiBzY3JvbGxpbmdFbGVtZW50W3VwcGVyU2lkZV07XG4gIH1cblxuICByZXR1cm4gZWxlbWVudFt1cHBlclNpZGVdO1xufVxuXG4vKlxuICogU3VtIG9yIHN1YnRyYWN0IHRoZSBlbGVtZW50IHNjcm9sbCB2YWx1ZXMgKGxlZnQgYW5kIHRvcCkgZnJvbSBhIGdpdmVuIHJlY3Qgb2JqZWN0XG4gKiBAbWV0aG9kXG4gKiBAbWVtYmVyb2YgUG9wcGVyLlV0aWxzXG4gKiBAcGFyYW0ge09iamVjdH0gcmVjdCAtIFJlY3Qgb2JqZWN0IHlvdSB3YW50IHRvIGNoYW5nZVxuICogQHBhcmFtIHtIVE1MRWxlbWVudH0gZWxlbWVudCAtIFRoZSBlbGVtZW50IGZyb20gdGhlIGZ1bmN0aW9uIHJlYWRzIHRoZSBzY3JvbGwgdmFsdWVzXG4gKiBAcGFyYW0ge0Jvb2xlYW59IHN1YnRyYWN0IC0gc2V0IHRvIHRydWUgaWYgeW91IHdhbnQgdG8gc3VidHJhY3QgdGhlIHNjcm9sbCB2YWx1ZXNcbiAqIEByZXR1cm4ge09iamVjdH0gcmVjdCAtIFRoZSBtb2RpZmllciByZWN0IG9iamVjdFxuICovXG5mdW5jdGlvbiBpbmNsdWRlU2Nyb2xsKHJlY3QsIGVsZW1lbnQpIHtcbiAgdmFyIHN1YnRyYWN0ID0gYXJndW1lbnRzLmxlbmd0aCA+IDIgJiYgYXJndW1lbnRzWzJdICE9PSB1bmRlZmluZWQgPyBhcmd1bWVudHNbMl0gOiBmYWxzZTtcblxuICB2YXIgc2Nyb2xsVG9wID0gZ2V0U2Nyb2xsKGVsZW1lbnQsICd0b3AnKTtcbiAgdmFyIHNjcm9sbExlZnQgPSBnZXRTY3JvbGwoZWxlbWVudCwgJ2xlZnQnKTtcbiAgdmFyIG1vZGlmaWVyID0gc3VidHJhY3QgPyAtMSA6IDE7XG4gIHJlY3QudG9wICs9IHNjcm9sbFRvcCAqIG1vZGlmaWVyO1xuICByZWN0LmJvdHRvbSArPSBzY3JvbGxUb3AgKiBtb2RpZmllcjtcbiAgcmVjdC5sZWZ0ICs9IHNjcm9sbExlZnQgKiBtb2RpZmllcjtcbiAgcmVjdC5yaWdodCArPSBzY3JvbGxMZWZ0ICogbW9kaWZpZXI7XG4gIHJldHVybiByZWN0O1xufVxuXG4vKlxuICogSGVscGVyIHRvIGRldGVjdCBib3JkZXJzIG9mIGEgZ2l2ZW4gZWxlbWVudFxuICogQG1ldGhvZFxuICogQG1lbWJlcm9mIFBvcHBlci5VdGlsc1xuICogQHBhcmFtIHtDU1NTdHlsZURlY2xhcmF0aW9ufSBzdHlsZXNcbiAqIFJlc3VsdCBvZiBgZ2V0U3R5bGVDb21wdXRlZFByb3BlcnR5YCBvbiB0aGUgZ2l2ZW4gZWxlbWVudFxuICogQHBhcmFtIHtTdHJpbmd9IGF4aXMgLSBgeGAgb3IgYHlgXG4gKiBAcmV0dXJuIHtudW1iZXJ9IGJvcmRlcnMgLSBUaGUgYm9yZGVycyBzaXplIG9mIHRoZSBnaXZlbiBheGlzXG4gKi9cblxuZnVuY3Rpb24gZ2V0Qm9yZGVyc1NpemUoc3R5bGVzLCBheGlzKSB7XG4gIHZhciBzaWRlQSA9IGF4aXMgPT09ICd4JyA/ICdMZWZ0JyA6ICdUb3AnO1xuICB2YXIgc2lkZUIgPSBzaWRlQSA9PT0gJ0xlZnQnID8gJ1JpZ2h0JyA6ICdCb3R0b20nO1xuXG4gIHJldHVybiBwYXJzZUZsb2F0KHN0eWxlc1snYm9yZGVyJyArIHNpZGVBICsgJ1dpZHRoJ10sIDEwKSArIHBhcnNlRmxvYXQoc3R5bGVzWydib3JkZXInICsgc2lkZUIgKyAnV2lkdGgnXSwgMTApO1xufVxuXG5mdW5jdGlvbiBnZXRTaXplKGF4aXMsIGJvZHksIGh0bWwsIGNvbXB1dGVkU3R5bGUpIHtcbiAgcmV0dXJuIE1hdGgubWF4KGJvZHlbJ29mZnNldCcgKyBheGlzXSwgYm9keVsnc2Nyb2xsJyArIGF4aXNdLCBodG1sWydjbGllbnQnICsgYXhpc10sIGh0bWxbJ29mZnNldCcgKyBheGlzXSwgaHRtbFsnc2Nyb2xsJyArIGF4aXNdLCBpc0lFKDEwKSA/IHBhcnNlSW50KGh0bWxbJ29mZnNldCcgKyBheGlzXSkgKyBwYXJzZUludChjb21wdXRlZFN0eWxlWydtYXJnaW4nICsgKGF4aXMgPT09ICdIZWlnaHQnID8gJ1RvcCcgOiAnTGVmdCcpXSkgKyBwYXJzZUludChjb21wdXRlZFN0eWxlWydtYXJnaW4nICsgKGF4aXMgPT09ICdIZWlnaHQnID8gJ0JvdHRvbScgOiAnUmlnaHQnKV0pIDogMCk7XG59XG5cbmZ1bmN0aW9uIGdldFdpbmRvd1NpemVzKGRvY3VtZW50KSB7XG4gIHZhciBib2R5ID0gZG9jdW1lbnQuYm9keTtcbiAgdmFyIGh0bWwgPSBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQ7XG4gIHZhciBjb21wdXRlZFN0eWxlID0gaXNJRSgxMCkgJiYgZ2V0Q29tcHV0ZWRTdHlsZShodG1sKTtcblxuICByZXR1cm4ge1xuICAgIGhlaWdodDogZ2V0U2l6ZSgnSGVpZ2h0JywgYm9keSwgaHRtbCwgY29tcHV0ZWRTdHlsZSksXG4gICAgd2lkdGg6IGdldFNpemUoJ1dpZHRoJywgYm9keSwgaHRtbCwgY29tcHV0ZWRTdHlsZSlcbiAgfTtcbn1cblxudmFyIGNsYXNzQ2FsbENoZWNrID0gZnVuY3Rpb24gKGluc3RhbmNlLCBDb25zdHJ1Y3Rvcikge1xuICBpZiAoIShpbnN0YW5jZSBpbnN0YW5jZW9mIENvbnN0cnVjdG9yKSkge1xuICAgIHRocm93IG5ldyBUeXBlRXJyb3IoXCJDYW5ub3QgY2FsbCBhIGNsYXNzIGFzIGEgZnVuY3Rpb25cIik7XG4gIH1cbn07XG5cbnZhciBjcmVhdGVDbGFzcyA9IGZ1bmN0aW9uICgpIHtcbiAgZnVuY3Rpb24gZGVmaW5lUHJvcGVydGllcyh0YXJnZXQsIHByb3BzKSB7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBwcm9wcy5sZW5ndGg7IGkrKykge1xuICAgICAgdmFyIGRlc2NyaXB0b3IgPSBwcm9wc1tpXTtcbiAgICAgIGRlc2NyaXB0b3IuZW51bWVyYWJsZSA9IGRlc2NyaXB0b3IuZW51bWVyYWJsZSB8fCBmYWxzZTtcbiAgICAgIGRlc2NyaXB0b3IuY29uZmlndXJhYmxlID0gdHJ1ZTtcbiAgICAgIGlmIChcInZhbHVlXCIgaW4gZGVzY3JpcHRvcikgZGVzY3JpcHRvci53cml0YWJsZSA9IHRydWU7XG4gICAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkodGFyZ2V0LCBkZXNjcmlwdG9yLmtleSwgZGVzY3JpcHRvcik7XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIGZ1bmN0aW9uIChDb25zdHJ1Y3RvciwgcHJvdG9Qcm9wcywgc3RhdGljUHJvcHMpIHtcbiAgICBpZiAocHJvdG9Qcm9wcykgZGVmaW5lUHJvcGVydGllcyhDb25zdHJ1Y3Rvci5wcm90b3R5cGUsIHByb3RvUHJvcHMpO1xuICAgIGlmIChzdGF0aWNQcm9wcykgZGVmaW5lUHJvcGVydGllcyhDb25zdHJ1Y3Rvciwgc3RhdGljUHJvcHMpO1xuICAgIHJldHVybiBDb25zdHJ1Y3RvcjtcbiAgfTtcbn0oKTtcblxuXG5cblxuXG52YXIgZGVmaW5lUHJvcGVydHkgPSBmdW5jdGlvbiAob2JqLCBrZXksIHZhbHVlKSB7XG4gIGlmIChrZXkgaW4gb2JqKSB7XG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KG9iaiwga2V5LCB7XG4gICAgICB2YWx1ZTogdmFsdWUsXG4gICAgICBlbnVtZXJhYmxlOiB0cnVlLFxuICAgICAgY29uZmlndXJhYmxlOiB0cnVlLFxuICAgICAgd3JpdGFibGU6IHRydWVcbiAgICB9KTtcbiAgfSBlbHNlIHtcbiAgICBvYmpba2V5XSA9IHZhbHVlO1xuICB9XG5cbiAgcmV0dXJuIG9iajtcbn07XG5cbnZhciBfZXh0ZW5kcyA9IE9iamVjdC5hc3NpZ24gfHwgZnVuY3Rpb24gKHRhcmdldCkge1xuICBmb3IgKHZhciBpID0gMTsgaSA8IGFyZ3VtZW50cy5sZW5ndGg7IGkrKykge1xuICAgIHZhciBzb3VyY2UgPSBhcmd1bWVudHNbaV07XG5cbiAgICBmb3IgKHZhciBrZXkgaW4gc291cmNlKSB7XG4gICAgICBpZiAoT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKHNvdXJjZSwga2V5KSkge1xuICAgICAgICB0YXJnZXRba2V5XSA9IHNvdXJjZVtrZXldO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiB0YXJnZXQ7XG59O1xuXG4vKipcbiAqIEdpdmVuIGVsZW1lbnQgb2Zmc2V0cywgZ2VuZXJhdGUgYW4gb3V0cHV0IHNpbWlsYXIgdG8gZ2V0Qm91bmRpbmdDbGllbnRSZWN0XG4gKiBAbWV0aG9kXG4gKiBAbWVtYmVyb2YgUG9wcGVyLlV0aWxzXG4gKiBAYXJndW1lbnQge09iamVjdH0gb2Zmc2V0c1xuICogQHJldHVybnMge09iamVjdH0gQ2xpZW50UmVjdCBsaWtlIG91dHB1dFxuICovXG5mdW5jdGlvbiBnZXRDbGllbnRSZWN0KG9mZnNldHMpIHtcbiAgcmV0dXJuIF9leHRlbmRzKHt9LCBvZmZzZXRzLCB7XG4gICAgcmlnaHQ6IG9mZnNldHMubGVmdCArIG9mZnNldHMud2lkdGgsXG4gICAgYm90dG9tOiBvZmZzZXRzLnRvcCArIG9mZnNldHMuaGVpZ2h0XG4gIH0pO1xufVxuXG4vKipcbiAqIEdldCBib3VuZGluZyBjbGllbnQgcmVjdCBvZiBnaXZlbiBlbGVtZW50XG4gKiBAbWV0aG9kXG4gKiBAbWVtYmVyb2YgUG9wcGVyLlV0aWxzXG4gKiBAcGFyYW0ge0hUTUxFbGVtZW50fSBlbGVtZW50XG4gKiBAcmV0dXJuIHtPYmplY3R9IGNsaWVudCByZWN0XG4gKi9cbmZ1bmN0aW9uIGdldEJvdW5kaW5nQ2xpZW50UmVjdChlbGVtZW50KSB7XG4gIHZhciByZWN0ID0ge307XG5cbiAgLy8gSUUxMCAxMCBGSVg6IFBsZWFzZSwgZG9uJ3QgYXNrLCB0aGUgZWxlbWVudCBpc24ndFxuICAvLyBjb25zaWRlcmVkIGluIERPTSBpbiBzb21lIGNpcmN1bXN0YW5jZXMuLi5cbiAgLy8gVGhpcyBpc24ndCByZXByb2R1Y2libGUgaW4gSUUxMCBjb21wYXRpYmlsaXR5IG1vZGUgb2YgSUUxMVxuICB0cnkge1xuICAgIGlmIChpc0lFKDEwKSkge1xuICAgICAgcmVjdCA9IGVsZW1lbnQuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XG4gICAgICB2YXIgc2Nyb2xsVG9wID0gZ2V0U2Nyb2xsKGVsZW1lbnQsICd0b3AnKTtcbiAgICAgIHZhciBzY3JvbGxMZWZ0ID0gZ2V0U2Nyb2xsKGVsZW1lbnQsICdsZWZ0Jyk7XG4gICAgICByZWN0LnRvcCArPSBzY3JvbGxUb3A7XG4gICAgICByZWN0LmxlZnQgKz0gc2Nyb2xsTGVmdDtcbiAgICAgIHJlY3QuYm90dG9tICs9IHNjcm9sbFRvcDtcbiAgICAgIHJlY3QucmlnaHQgKz0gc2Nyb2xsTGVmdDtcbiAgICB9IGVsc2Uge1xuICAgICAgcmVjdCA9IGVsZW1lbnQuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XG4gICAgfVxuICB9IGNhdGNoIChlKSB7fVxuXG4gIHZhciByZXN1bHQgPSB7XG4gICAgbGVmdDogcmVjdC5sZWZ0LFxuICAgIHRvcDogcmVjdC50b3AsXG4gICAgd2lkdGg6IHJlY3QucmlnaHQgLSByZWN0LmxlZnQsXG4gICAgaGVpZ2h0OiByZWN0LmJvdHRvbSAtIHJlY3QudG9wXG4gIH07XG5cbiAgLy8gc3VidHJhY3Qgc2Nyb2xsYmFyIHNpemUgZnJvbSBzaXplc1xuICB2YXIgc2l6ZXMgPSBlbGVtZW50Lm5vZGVOYW1lID09PSAnSFRNTCcgPyBnZXRXaW5kb3dTaXplcyhlbGVtZW50Lm93bmVyRG9jdW1lbnQpIDoge307XG4gIHZhciB3aWR0aCA9IHNpemVzLndpZHRoIHx8IGVsZW1lbnQuY2xpZW50V2lkdGggfHwgcmVzdWx0LnJpZ2h0IC0gcmVzdWx0LmxlZnQ7XG4gIHZhciBoZWlnaHQgPSBzaXplcy5oZWlnaHQgfHwgZWxlbWVudC5jbGllbnRIZWlnaHQgfHwgcmVzdWx0LmJvdHRvbSAtIHJlc3VsdC50b3A7XG5cbiAgdmFyIGhvcml6U2Nyb2xsYmFyID0gZWxlbWVudC5vZmZzZXRXaWR0aCAtIHdpZHRoO1xuICB2YXIgdmVydFNjcm9sbGJhciA9IGVsZW1lbnQub2Zmc2V0SGVpZ2h0IC0gaGVpZ2h0O1xuXG4gIC8vIGlmIGFuIGh5cG90aGV0aWNhbCBzY3JvbGxiYXIgaXMgZGV0ZWN0ZWQsIHdlIG11c3QgYmUgc3VyZSBpdCdzIG5vdCBhIGBib3JkZXJgXG4gIC8vIHdlIG1ha2UgdGhpcyBjaGVjayBjb25kaXRpb25hbCBmb3IgcGVyZm9ybWFuY2UgcmVhc29uc1xuICBpZiAoaG9yaXpTY3JvbGxiYXIgfHwgdmVydFNjcm9sbGJhcikge1xuICAgIHZhciBzdHlsZXMgPSBnZXRTdHlsZUNvbXB1dGVkUHJvcGVydHkoZWxlbWVudCk7XG4gICAgaG9yaXpTY3JvbGxiYXIgLT0gZ2V0Qm9yZGVyc1NpemUoc3R5bGVzLCAneCcpO1xuICAgIHZlcnRTY3JvbGxiYXIgLT0gZ2V0Qm9yZGVyc1NpemUoc3R5bGVzLCAneScpO1xuXG4gICAgcmVzdWx0LndpZHRoIC09IGhvcml6U2Nyb2xsYmFyO1xuICAgIHJlc3VsdC5oZWlnaHQgLT0gdmVydFNjcm9sbGJhcjtcbiAgfVxuXG4gIHJldHVybiBnZXRDbGllbnRSZWN0KHJlc3VsdCk7XG59XG5cbmZ1bmN0aW9uIGdldE9mZnNldFJlY3RSZWxhdGl2ZVRvQXJiaXRyYXJ5Tm9kZShjaGlsZHJlbiwgcGFyZW50KSB7XG4gIHZhciBmaXhlZFBvc2l0aW9uID0gYXJndW1lbnRzLmxlbmd0aCA+IDIgJiYgYXJndW1lbnRzWzJdICE9PSB1bmRlZmluZWQgPyBhcmd1bWVudHNbMl0gOiBmYWxzZTtcblxuICB2YXIgaXNJRTEwID0gaXNJRSgxMCk7XG4gIHZhciBpc0hUTUwgPSBwYXJlbnQubm9kZU5hbWUgPT09ICdIVE1MJztcbiAgdmFyIGNoaWxkcmVuUmVjdCA9IGdldEJvdW5kaW5nQ2xpZW50UmVjdChjaGlsZHJlbik7XG4gIHZhciBwYXJlbnRSZWN0ID0gZ2V0Qm91bmRpbmdDbGllbnRSZWN0KHBhcmVudCk7XG4gIHZhciBzY3JvbGxQYXJlbnQgPSBnZXRTY3JvbGxQYXJlbnQoY2hpbGRyZW4pO1xuXG4gIHZhciBzdHlsZXMgPSBnZXRTdHlsZUNvbXB1dGVkUHJvcGVydHkocGFyZW50KTtcbiAgdmFyIGJvcmRlclRvcFdpZHRoID0gcGFyc2VGbG9hdChzdHlsZXMuYm9yZGVyVG9wV2lkdGgsIDEwKTtcbiAgdmFyIGJvcmRlckxlZnRXaWR0aCA9IHBhcnNlRmxvYXQoc3R5bGVzLmJvcmRlckxlZnRXaWR0aCwgMTApO1xuXG4gIC8vIEluIGNhc2VzIHdoZXJlIHRoZSBwYXJlbnQgaXMgZml4ZWQsIHdlIG11c3QgaWdub3JlIG5lZ2F0aXZlIHNjcm9sbCBpbiBvZmZzZXQgY2FsY1xuICBpZiAoZml4ZWRQb3NpdGlvbiAmJiBpc0hUTUwpIHtcbiAgICBwYXJlbnRSZWN0LnRvcCA9IE1hdGgubWF4KHBhcmVudFJlY3QudG9wLCAwKTtcbiAgICBwYXJlbnRSZWN0LmxlZnQgPSBNYXRoLm1heChwYXJlbnRSZWN0LmxlZnQsIDApO1xuICB9XG4gIHZhciBvZmZzZXRzID0gZ2V0Q2xpZW50UmVjdCh7XG4gICAgdG9wOiBjaGlsZHJlblJlY3QudG9wIC0gcGFyZW50UmVjdC50b3AgLSBib3JkZXJUb3BXaWR0aCxcbiAgICBsZWZ0OiBjaGlsZHJlblJlY3QubGVmdCAtIHBhcmVudFJlY3QubGVmdCAtIGJvcmRlckxlZnRXaWR0aCxcbiAgICB3aWR0aDogY2hpbGRyZW5SZWN0LndpZHRoLFxuICAgIGhlaWdodDogY2hpbGRyZW5SZWN0LmhlaWdodFxuICB9KTtcbiAgb2Zmc2V0cy5tYXJnaW5Ub3AgPSAwO1xuICBvZmZzZXRzLm1hcmdpbkxlZnQgPSAwO1xuXG4gIC8vIFN1YnRyYWN0IG1hcmdpbnMgb2YgZG9jdW1lbnRFbGVtZW50IGluIGNhc2UgaXQncyBiZWluZyB1c2VkIGFzIHBhcmVudFxuICAvLyB3ZSBkbyB0aGlzIG9ubHkgb24gSFRNTCBiZWNhdXNlIGl0J3MgdGhlIG9ubHkgZWxlbWVudCB0aGF0IGJlaGF2ZXNcbiAgLy8gZGlmZmVyZW50bHkgd2hlbiBtYXJnaW5zIGFyZSBhcHBsaWVkIHRvIGl0LiBUaGUgbWFyZ2lucyBhcmUgaW5jbHVkZWQgaW5cbiAgLy8gdGhlIGJveCBvZiB0aGUgZG9jdW1lbnRFbGVtZW50LCBpbiB0aGUgb3RoZXIgY2FzZXMgbm90LlxuICBpZiAoIWlzSUUxMCAmJiBpc0hUTUwpIHtcbiAgICB2YXIgbWFyZ2luVG9wID0gcGFyc2VGbG9hdChzdHlsZXMubWFyZ2luVG9wLCAxMCk7XG4gICAgdmFyIG1hcmdpbkxlZnQgPSBwYXJzZUZsb2F0KHN0eWxlcy5tYXJnaW5MZWZ0LCAxMCk7XG5cbiAgICBvZmZzZXRzLnRvcCAtPSBib3JkZXJUb3BXaWR0aCAtIG1hcmdpblRvcDtcbiAgICBvZmZzZXRzLmJvdHRvbSAtPSBib3JkZXJUb3BXaWR0aCAtIG1hcmdpblRvcDtcbiAgICBvZmZzZXRzLmxlZnQgLT0gYm9yZGVyTGVmdFdpZHRoIC0gbWFyZ2luTGVmdDtcbiAgICBvZmZzZXRzLnJpZ2h0IC09IGJvcmRlckxlZnRXaWR0aCAtIG1hcmdpbkxlZnQ7XG5cbiAgICAvLyBBdHRhY2ggbWFyZ2luVG9wIGFuZCBtYXJnaW5MZWZ0IGJlY2F1c2UgaW4gc29tZSBjaXJjdW1zdGFuY2VzIHdlIG1heSBuZWVkIHRoZW1cbiAgICBvZmZzZXRzLm1hcmdpblRvcCA9IG1hcmdpblRvcDtcbiAgICBvZmZzZXRzLm1hcmdpbkxlZnQgPSBtYXJnaW5MZWZ0O1xuICB9XG5cbiAgaWYgKGlzSUUxMCAmJiAhZml4ZWRQb3NpdGlvbiA/IHBhcmVudC5jb250YWlucyhzY3JvbGxQYXJlbnQpIDogcGFyZW50ID09PSBzY3JvbGxQYXJlbnQgJiYgc2Nyb2xsUGFyZW50Lm5vZGVOYW1lICE9PSAnQk9EWScpIHtcbiAgICBvZmZzZXRzID0gaW5jbHVkZVNjcm9sbChvZmZzZXRzLCBwYXJlbnQpO1xuICB9XG5cbiAgcmV0dXJuIG9mZnNldHM7XG59XG5cbmZ1bmN0aW9uIGdldFZpZXdwb3J0T2Zmc2V0UmVjdFJlbGF0aXZlVG9BcnRiaXRyYXJ5Tm9kZShlbGVtZW50KSB7XG4gIHZhciBleGNsdWRlU2Nyb2xsID0gYXJndW1lbnRzLmxlbmd0aCA+IDEgJiYgYXJndW1lbnRzWzFdICE9PSB1bmRlZmluZWQgPyBhcmd1bWVudHNbMV0gOiBmYWxzZTtcblxuICB2YXIgaHRtbCA9IGVsZW1lbnQub3duZXJEb2N1bWVudC5kb2N1bWVudEVsZW1lbnQ7XG4gIHZhciByZWxhdGl2ZU9mZnNldCA9IGdldE9mZnNldFJlY3RSZWxhdGl2ZVRvQXJiaXRyYXJ5Tm9kZShlbGVtZW50LCBodG1sKTtcbiAgdmFyIHdpZHRoID0gTWF0aC5tYXgoaHRtbC5jbGllbnRXaWR0aCwgd2luZG93LmlubmVyV2lkdGggfHwgMCk7XG4gIHZhciBoZWlnaHQgPSBNYXRoLm1heChodG1sLmNsaWVudEhlaWdodCwgd2luZG93LmlubmVySGVpZ2h0IHx8IDApO1xuXG4gIHZhciBzY3JvbGxUb3AgPSAhZXhjbHVkZVNjcm9sbCA/IGdldFNjcm9sbChodG1sKSA6IDA7XG4gIHZhciBzY3JvbGxMZWZ0ID0gIWV4Y2x1ZGVTY3JvbGwgPyBnZXRTY3JvbGwoaHRtbCwgJ2xlZnQnKSA6IDA7XG5cbiAgdmFyIG9mZnNldCA9IHtcbiAgICB0b3A6IHNjcm9sbFRvcCAtIHJlbGF0aXZlT2Zmc2V0LnRvcCArIHJlbGF0aXZlT2Zmc2V0Lm1hcmdpblRvcCxcbiAgICBsZWZ0OiBzY3JvbGxMZWZ0IC0gcmVsYXRpdmVPZmZzZXQubGVmdCArIHJlbGF0aXZlT2Zmc2V0Lm1hcmdpbkxlZnQsXG4gICAgd2lkdGg6IHdpZHRoLFxuICAgIGhlaWdodDogaGVpZ2h0XG4gIH07XG5cbiAgcmV0dXJuIGdldENsaWVudFJlY3Qob2Zmc2V0KTtcbn1cblxuLyoqXG4gKiBDaGVjayBpZiB0aGUgZ2l2ZW4gZWxlbWVudCBpcyBmaXhlZCBvciBpcyBpbnNpZGUgYSBmaXhlZCBwYXJlbnRcbiAqIEBtZXRob2RcbiAqIEBtZW1iZXJvZiBQb3BwZXIuVXRpbHNcbiAqIEBhcmd1bWVudCB7RWxlbWVudH0gZWxlbWVudFxuICogQGFyZ3VtZW50IHtFbGVtZW50fSBjdXN0b21Db250YWluZXJcbiAqIEByZXR1cm5zIHtCb29sZWFufSBhbnN3ZXIgdG8gXCJpc0ZpeGVkP1wiXG4gKi9cbmZ1bmN0aW9uIGlzRml4ZWQoZWxlbWVudCkge1xuICB2YXIgbm9kZU5hbWUgPSBlbGVtZW50Lm5vZGVOYW1lO1xuICBpZiAobm9kZU5hbWUgPT09ICdCT0RZJyB8fCBub2RlTmFtZSA9PT0gJ0hUTUwnKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG4gIGlmIChnZXRTdHlsZUNvbXB1dGVkUHJvcGVydHkoZWxlbWVudCwgJ3Bvc2l0aW9uJykgPT09ICdmaXhlZCcpIHtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuICB2YXIgcGFyZW50Tm9kZSA9IGdldFBhcmVudE5vZGUoZWxlbWVudCk7XG4gIGlmICghcGFyZW50Tm9kZSkge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuICByZXR1cm4gaXNGaXhlZChwYXJlbnROb2RlKTtcbn1cblxuLyoqXG4gKiBGaW5kcyB0aGUgZmlyc3QgcGFyZW50IG9mIGFuIGVsZW1lbnQgdGhhdCBoYXMgYSB0cmFuc2Zvcm1lZCBwcm9wZXJ0eSBkZWZpbmVkXG4gKiBAbWV0aG9kXG4gKiBAbWVtYmVyb2YgUG9wcGVyLlV0aWxzXG4gKiBAYXJndW1lbnQge0VsZW1lbnR9IGVsZW1lbnRcbiAqIEByZXR1cm5zIHtFbGVtZW50fSBmaXJzdCB0cmFuc2Zvcm1lZCBwYXJlbnQgb3IgZG9jdW1lbnRFbGVtZW50XG4gKi9cblxuZnVuY3Rpb24gZ2V0Rml4ZWRQb3NpdGlvbk9mZnNldFBhcmVudChlbGVtZW50KSB7XG4gIC8vIFRoaXMgY2hlY2sgaXMgbmVlZGVkIHRvIGF2b2lkIGVycm9ycyBpbiBjYXNlIG9uZSBvZiB0aGUgZWxlbWVudHMgaXNuJ3QgZGVmaW5lZCBmb3IgYW55IHJlYXNvblxuICBpZiAoIWVsZW1lbnQgfHwgIWVsZW1lbnQucGFyZW50RWxlbWVudCB8fCBpc0lFKCkpIHtcbiAgICByZXR1cm4gZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50O1xuICB9XG4gIHZhciBlbCA9IGVsZW1lbnQucGFyZW50RWxlbWVudDtcbiAgd2hpbGUgKGVsICYmIGdldFN0eWxlQ29tcHV0ZWRQcm9wZXJ0eShlbCwgJ3RyYW5zZm9ybScpID09PSAnbm9uZScpIHtcbiAgICBlbCA9IGVsLnBhcmVudEVsZW1lbnQ7XG4gIH1cbiAgcmV0dXJuIGVsIHx8IGRvY3VtZW50LmRvY3VtZW50RWxlbWVudDtcbn1cblxuLyoqXG4gKiBDb21wdXRlZCB0aGUgYm91bmRhcmllcyBsaW1pdHMgYW5kIHJldHVybiB0aGVtXG4gKiBAbWV0aG9kXG4gKiBAbWVtYmVyb2YgUG9wcGVyLlV0aWxzXG4gKiBAcGFyYW0ge0hUTUxFbGVtZW50fSBwb3BwZXJcbiAqIEBwYXJhbSB7SFRNTEVsZW1lbnR9IHJlZmVyZW5jZVxuICogQHBhcmFtIHtudW1iZXJ9IHBhZGRpbmdcbiAqIEBwYXJhbSB7SFRNTEVsZW1lbnR9IGJvdW5kYXJpZXNFbGVtZW50IC0gRWxlbWVudCB1c2VkIHRvIGRlZmluZSB0aGUgYm91bmRhcmllc1xuICogQHBhcmFtIHtCb29sZWFufSBmaXhlZFBvc2l0aW9uIC0gSXMgaW4gZml4ZWQgcG9zaXRpb24gbW9kZVxuICogQHJldHVybnMge09iamVjdH0gQ29vcmRpbmF0ZXMgb2YgdGhlIGJvdW5kYXJpZXNcbiAqL1xuZnVuY3Rpb24gZ2V0Qm91bmRhcmllcyhwb3BwZXIsIHJlZmVyZW5jZSwgcGFkZGluZywgYm91bmRhcmllc0VsZW1lbnQpIHtcbiAgdmFyIGZpeGVkUG9zaXRpb24gPSBhcmd1bWVudHMubGVuZ3RoID4gNCAmJiBhcmd1bWVudHNbNF0gIT09IHVuZGVmaW5lZCA/IGFyZ3VtZW50c1s0XSA6IGZhbHNlO1xuXG4gIC8vIE5PVEU6IDEgRE9NIGFjY2VzcyBoZXJlXG5cbiAgdmFyIGJvdW5kYXJpZXMgPSB7IHRvcDogMCwgbGVmdDogMCB9O1xuICB2YXIgb2Zmc2V0UGFyZW50ID0gZml4ZWRQb3NpdGlvbiA/IGdldEZpeGVkUG9zaXRpb25PZmZzZXRQYXJlbnQocG9wcGVyKSA6IGZpbmRDb21tb25PZmZzZXRQYXJlbnQocG9wcGVyLCByZWZlcmVuY2UpO1xuXG4gIC8vIEhhbmRsZSB2aWV3cG9ydCBjYXNlXG4gIGlmIChib3VuZGFyaWVzRWxlbWVudCA9PT0gJ3ZpZXdwb3J0Jykge1xuICAgIGJvdW5kYXJpZXMgPSBnZXRWaWV3cG9ydE9mZnNldFJlY3RSZWxhdGl2ZVRvQXJ0Yml0cmFyeU5vZGUob2Zmc2V0UGFyZW50LCBmaXhlZFBvc2l0aW9uKTtcbiAgfSBlbHNlIHtcbiAgICAvLyBIYW5kbGUgb3RoZXIgY2FzZXMgYmFzZWQgb24gRE9NIGVsZW1lbnQgdXNlZCBhcyBib3VuZGFyaWVzXG4gICAgdmFyIGJvdW5kYXJpZXNOb2RlID0gdm9pZCAwO1xuICAgIGlmIChib3VuZGFyaWVzRWxlbWVudCA9PT0gJ3Njcm9sbFBhcmVudCcpIHtcbiAgICAgIGJvdW5kYXJpZXNOb2RlID0gZ2V0U2Nyb2xsUGFyZW50KGdldFBhcmVudE5vZGUocmVmZXJlbmNlKSk7XG4gICAgICBpZiAoYm91bmRhcmllc05vZGUubm9kZU5hbWUgPT09ICdCT0RZJykge1xuICAgICAgICBib3VuZGFyaWVzTm9kZSA9IHBvcHBlci5vd25lckRvY3VtZW50LmRvY3VtZW50RWxlbWVudDtcbiAgICAgIH1cbiAgICB9IGVsc2UgaWYgKGJvdW5kYXJpZXNFbGVtZW50ID09PSAnd2luZG93Jykge1xuICAgICAgYm91bmRhcmllc05vZGUgPSBwb3BwZXIub3duZXJEb2N1bWVudC5kb2N1bWVudEVsZW1lbnQ7XG4gICAgfSBlbHNlIHtcbiAgICAgIGJvdW5kYXJpZXNOb2RlID0gYm91bmRhcmllc0VsZW1lbnQ7XG4gICAgfVxuXG4gICAgdmFyIG9mZnNldHMgPSBnZXRPZmZzZXRSZWN0UmVsYXRpdmVUb0FyYml0cmFyeU5vZGUoYm91bmRhcmllc05vZGUsIG9mZnNldFBhcmVudCwgZml4ZWRQb3NpdGlvbik7XG5cbiAgICAvLyBJbiBjYXNlIG9mIEhUTUwsIHdlIG5lZWQgYSBkaWZmZXJlbnQgY29tcHV0YXRpb25cbiAgICBpZiAoYm91bmRhcmllc05vZGUubm9kZU5hbWUgPT09ICdIVE1MJyAmJiAhaXNGaXhlZChvZmZzZXRQYXJlbnQpKSB7XG4gICAgICB2YXIgX2dldFdpbmRvd1NpemVzID0gZ2V0V2luZG93U2l6ZXMocG9wcGVyLm93bmVyRG9jdW1lbnQpLFxuICAgICAgICAgIGhlaWdodCA9IF9nZXRXaW5kb3dTaXplcy5oZWlnaHQsXG4gICAgICAgICAgd2lkdGggPSBfZ2V0V2luZG93U2l6ZXMud2lkdGg7XG5cbiAgICAgIGJvdW5kYXJpZXMudG9wICs9IG9mZnNldHMudG9wIC0gb2Zmc2V0cy5tYXJnaW5Ub3A7XG4gICAgICBib3VuZGFyaWVzLmJvdHRvbSA9IGhlaWdodCArIG9mZnNldHMudG9wO1xuICAgICAgYm91bmRhcmllcy5sZWZ0ICs9IG9mZnNldHMubGVmdCAtIG9mZnNldHMubWFyZ2luTGVmdDtcbiAgICAgIGJvdW5kYXJpZXMucmlnaHQgPSB3aWR0aCArIG9mZnNldHMubGVmdDtcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gZm9yIGFsbCB0aGUgb3RoZXIgRE9NIGVsZW1lbnRzLCB0aGlzIG9uZSBpcyBnb29kXG4gICAgICBib3VuZGFyaWVzID0gb2Zmc2V0cztcbiAgICB9XG4gIH1cblxuICAvLyBBZGQgcGFkZGluZ3NcbiAgcGFkZGluZyA9IHBhZGRpbmcgfHwgMDtcbiAgdmFyIGlzUGFkZGluZ051bWJlciA9IHR5cGVvZiBwYWRkaW5nID09PSAnbnVtYmVyJztcbiAgYm91bmRhcmllcy5sZWZ0ICs9IGlzUGFkZGluZ051bWJlciA/IHBhZGRpbmcgOiBwYWRkaW5nLmxlZnQgfHwgMDtcbiAgYm91bmRhcmllcy50b3AgKz0gaXNQYWRkaW5nTnVtYmVyID8gcGFkZGluZyA6IHBhZGRpbmcudG9wIHx8IDA7XG4gIGJvdW5kYXJpZXMucmlnaHQgLT0gaXNQYWRkaW5nTnVtYmVyID8gcGFkZGluZyA6IHBhZGRpbmcucmlnaHQgfHwgMDtcbiAgYm91bmRhcmllcy5ib3R0b20gLT0gaXNQYWRkaW5nTnVtYmVyID8gcGFkZGluZyA6IHBhZGRpbmcuYm90dG9tIHx8IDA7XG5cbiAgcmV0dXJuIGJvdW5kYXJpZXM7XG59XG5cbmZ1bmN0aW9uIGdldEFyZWEoX3JlZikge1xuICB2YXIgd2lkdGggPSBfcmVmLndpZHRoLFxuICAgICAgaGVpZ2h0ID0gX3JlZi5oZWlnaHQ7XG5cbiAgcmV0dXJuIHdpZHRoICogaGVpZ2h0O1xufVxuXG4vKipcbiAqIFV0aWxpdHkgdXNlZCB0byB0cmFuc2Zvcm0gdGhlIGBhdXRvYCBwbGFjZW1lbnQgdG8gdGhlIHBsYWNlbWVudCB3aXRoIG1vcmVcbiAqIGF2YWlsYWJsZSBzcGFjZS5cbiAqIEBtZXRob2RcbiAqIEBtZW1iZXJvZiBQb3BwZXIuVXRpbHNcbiAqIEBhcmd1bWVudCB7T2JqZWN0fSBkYXRhIC0gVGhlIGRhdGEgb2JqZWN0IGdlbmVyYXRlZCBieSB1cGRhdGUgbWV0aG9kXG4gKiBAYXJndW1lbnQge09iamVjdH0gb3B0aW9ucyAtIE1vZGlmaWVycyBjb25maWd1cmF0aW9uIGFuZCBvcHRpb25zXG4gKiBAcmV0dXJucyB7T2JqZWN0fSBUaGUgZGF0YSBvYmplY3QsIHByb3Blcmx5IG1vZGlmaWVkXG4gKi9cbmZ1bmN0aW9uIGNvbXB1dGVBdXRvUGxhY2VtZW50KHBsYWNlbWVudCwgcmVmUmVjdCwgcG9wcGVyLCByZWZlcmVuY2UsIGJvdW5kYXJpZXNFbGVtZW50KSB7XG4gIHZhciBwYWRkaW5nID0gYXJndW1lbnRzLmxlbmd0aCA+IDUgJiYgYXJndW1lbnRzWzVdICE9PSB1bmRlZmluZWQgPyBhcmd1bWVudHNbNV0gOiAwO1xuXG4gIGlmIChwbGFjZW1lbnQuaW5kZXhPZignYXV0bycpID09PSAtMSkge1xuICAgIHJldHVybiBwbGFjZW1lbnQ7XG4gIH1cblxuICB2YXIgYm91bmRhcmllcyA9IGdldEJvdW5kYXJpZXMocG9wcGVyLCByZWZlcmVuY2UsIHBhZGRpbmcsIGJvdW5kYXJpZXNFbGVtZW50KTtcblxuICB2YXIgcmVjdHMgPSB7XG4gICAgdG9wOiB7XG4gICAgICB3aWR0aDogYm91bmRhcmllcy53aWR0aCxcbiAgICAgIGhlaWdodDogcmVmUmVjdC50b3AgLSBib3VuZGFyaWVzLnRvcFxuICAgIH0sXG4gICAgcmlnaHQ6IHtcbiAgICAgIHdpZHRoOiBib3VuZGFyaWVzLnJpZ2h0IC0gcmVmUmVjdC5yaWdodCxcbiAgICAgIGhlaWdodDogYm91bmRhcmllcy5oZWlnaHRcbiAgICB9LFxuICAgIGJvdHRvbToge1xuICAgICAgd2lkdGg6IGJvdW5kYXJpZXMud2lkdGgsXG4gICAgICBoZWlnaHQ6IGJvdW5kYXJpZXMuYm90dG9tIC0gcmVmUmVjdC5ib3R0b21cbiAgICB9LFxuICAgIGxlZnQ6IHtcbiAgICAgIHdpZHRoOiByZWZSZWN0LmxlZnQgLSBib3VuZGFyaWVzLmxlZnQsXG4gICAgICBoZWlnaHQ6IGJvdW5kYXJpZXMuaGVpZ2h0XG4gICAgfVxuICB9O1xuXG4gIHZhciBzb3J0ZWRBcmVhcyA9IE9iamVjdC5rZXlzKHJlY3RzKS5tYXAoZnVuY3Rpb24gKGtleSkge1xuICAgIHJldHVybiBfZXh0ZW5kcyh7XG4gICAgICBrZXk6IGtleVxuICAgIH0sIHJlY3RzW2tleV0sIHtcbiAgICAgIGFyZWE6IGdldEFyZWEocmVjdHNba2V5XSlcbiAgICB9KTtcbiAgfSkuc29ydChmdW5jdGlvbiAoYSwgYikge1xuICAgIHJldHVybiBiLmFyZWEgLSBhLmFyZWE7XG4gIH0pO1xuXG4gIHZhciBmaWx0ZXJlZEFyZWFzID0gc29ydGVkQXJlYXMuZmlsdGVyKGZ1bmN0aW9uIChfcmVmMikge1xuICAgIHZhciB3aWR0aCA9IF9yZWYyLndpZHRoLFxuICAgICAgICBoZWlnaHQgPSBfcmVmMi5oZWlnaHQ7XG4gICAgcmV0dXJuIHdpZHRoID49IHBvcHBlci5jbGllbnRXaWR0aCAmJiBoZWlnaHQgPj0gcG9wcGVyLmNsaWVudEhlaWdodDtcbiAgfSk7XG5cbiAgdmFyIGNvbXB1dGVkUGxhY2VtZW50ID0gZmlsdGVyZWRBcmVhcy5sZW5ndGggPiAwID8gZmlsdGVyZWRBcmVhc1swXS5rZXkgOiBzb3J0ZWRBcmVhc1swXS5rZXk7XG5cbiAgdmFyIHZhcmlhdGlvbiA9IHBsYWNlbWVudC5zcGxpdCgnLScpWzFdO1xuXG4gIHJldHVybiBjb21wdXRlZFBsYWNlbWVudCArICh2YXJpYXRpb24gPyAnLScgKyB2YXJpYXRpb24gOiAnJyk7XG59XG5cbi8qKlxuICogR2V0IG9mZnNldHMgdG8gdGhlIHJlZmVyZW5jZSBlbGVtZW50XG4gKiBAbWV0aG9kXG4gKiBAbWVtYmVyb2YgUG9wcGVyLlV0aWxzXG4gKiBAcGFyYW0ge09iamVjdH0gc3RhdGVcbiAqIEBwYXJhbSB7RWxlbWVudH0gcG9wcGVyIC0gdGhlIHBvcHBlciBlbGVtZW50XG4gKiBAcGFyYW0ge0VsZW1lbnR9IHJlZmVyZW5jZSAtIHRoZSByZWZlcmVuY2UgZWxlbWVudCAodGhlIHBvcHBlciB3aWxsIGJlIHJlbGF0aXZlIHRvIHRoaXMpXG4gKiBAcGFyYW0ge0VsZW1lbnR9IGZpeGVkUG9zaXRpb24gLSBpcyBpbiBmaXhlZCBwb3NpdGlvbiBtb2RlXG4gKiBAcmV0dXJucyB7T2JqZWN0fSBBbiBvYmplY3QgY29udGFpbmluZyB0aGUgb2Zmc2V0cyB3aGljaCB3aWxsIGJlIGFwcGxpZWQgdG8gdGhlIHBvcHBlclxuICovXG5mdW5jdGlvbiBnZXRSZWZlcmVuY2VPZmZzZXRzKHN0YXRlLCBwb3BwZXIsIHJlZmVyZW5jZSkge1xuICB2YXIgZml4ZWRQb3NpdGlvbiA9IGFyZ3VtZW50cy5sZW5ndGggPiAzICYmIGFyZ3VtZW50c1szXSAhPT0gdW5kZWZpbmVkID8gYXJndW1lbnRzWzNdIDogbnVsbDtcblxuICB2YXIgY29tbW9uT2Zmc2V0UGFyZW50ID0gZml4ZWRQb3NpdGlvbiA/IGdldEZpeGVkUG9zaXRpb25PZmZzZXRQYXJlbnQocG9wcGVyKSA6IGZpbmRDb21tb25PZmZzZXRQYXJlbnQocG9wcGVyLCByZWZlcmVuY2UpO1xuICByZXR1cm4gZ2V0T2Zmc2V0UmVjdFJlbGF0aXZlVG9BcmJpdHJhcnlOb2RlKHJlZmVyZW5jZSwgY29tbW9uT2Zmc2V0UGFyZW50LCBmaXhlZFBvc2l0aW9uKTtcbn1cblxuLyoqXG4gKiBHZXQgdGhlIG91dGVyIHNpemVzIG9mIHRoZSBnaXZlbiBlbGVtZW50IChvZmZzZXQgc2l6ZSArIG1hcmdpbnMpXG4gKiBAbWV0aG9kXG4gKiBAbWVtYmVyb2YgUG9wcGVyLlV0aWxzXG4gKiBAYXJndW1lbnQge0VsZW1lbnR9IGVsZW1lbnRcbiAqIEByZXR1cm5zIHtPYmplY3R9IG9iamVjdCBjb250YWluaW5nIHdpZHRoIGFuZCBoZWlnaHQgcHJvcGVydGllc1xuICovXG5mdW5jdGlvbiBnZXRPdXRlclNpemVzKGVsZW1lbnQpIHtcbiAgdmFyIHdpbmRvdyA9IGVsZW1lbnQub3duZXJEb2N1bWVudC5kZWZhdWx0VmlldztcbiAgdmFyIHN0eWxlcyA9IHdpbmRvdy5nZXRDb21wdXRlZFN0eWxlKGVsZW1lbnQpO1xuICB2YXIgeCA9IHBhcnNlRmxvYXQoc3R5bGVzLm1hcmdpblRvcCB8fCAwKSArIHBhcnNlRmxvYXQoc3R5bGVzLm1hcmdpbkJvdHRvbSB8fCAwKTtcbiAgdmFyIHkgPSBwYXJzZUZsb2F0KHN0eWxlcy5tYXJnaW5MZWZ0IHx8IDApICsgcGFyc2VGbG9hdChzdHlsZXMubWFyZ2luUmlnaHQgfHwgMCk7XG4gIHZhciByZXN1bHQgPSB7XG4gICAgd2lkdGg6IGVsZW1lbnQub2Zmc2V0V2lkdGggKyB5LFxuICAgIGhlaWdodDogZWxlbWVudC5vZmZzZXRIZWlnaHQgKyB4XG4gIH07XG4gIHJldHVybiByZXN1bHQ7XG59XG5cbi8qKlxuICogR2V0IHRoZSBvcHBvc2l0ZSBwbGFjZW1lbnQgb2YgdGhlIGdpdmVuIG9uZVxuICogQG1ldGhvZFxuICogQG1lbWJlcm9mIFBvcHBlci5VdGlsc1xuICogQGFyZ3VtZW50IHtTdHJpbmd9IHBsYWNlbWVudFxuICogQHJldHVybnMge1N0cmluZ30gZmxpcHBlZCBwbGFjZW1lbnRcbiAqL1xuZnVuY3Rpb24gZ2V0T3Bwb3NpdGVQbGFjZW1lbnQocGxhY2VtZW50KSB7XG4gIHZhciBoYXNoID0geyBsZWZ0OiAncmlnaHQnLCByaWdodDogJ2xlZnQnLCBib3R0b206ICd0b3AnLCB0b3A6ICdib3R0b20nIH07XG4gIHJldHVybiBwbGFjZW1lbnQucmVwbGFjZSgvbGVmdHxyaWdodHxib3R0b218dG9wL2csIGZ1bmN0aW9uIChtYXRjaGVkKSB7XG4gICAgcmV0dXJuIGhhc2hbbWF0Y2hlZF07XG4gIH0pO1xufVxuXG4vKipcbiAqIEdldCBvZmZzZXRzIHRvIHRoZSBwb3BwZXJcbiAqIEBtZXRob2RcbiAqIEBtZW1iZXJvZiBQb3BwZXIuVXRpbHNcbiAqIEBwYXJhbSB7T2JqZWN0fSBwb3NpdGlvbiAtIENTUyBwb3NpdGlvbiB0aGUgUG9wcGVyIHdpbGwgZ2V0IGFwcGxpZWRcbiAqIEBwYXJhbSB7SFRNTEVsZW1lbnR9IHBvcHBlciAtIHRoZSBwb3BwZXIgZWxlbWVudFxuICogQHBhcmFtIHtPYmplY3R9IHJlZmVyZW5jZU9mZnNldHMgLSB0aGUgcmVmZXJlbmNlIG9mZnNldHMgKHRoZSBwb3BwZXIgd2lsbCBiZSByZWxhdGl2ZSB0byB0aGlzKVxuICogQHBhcmFtIHtTdHJpbmd9IHBsYWNlbWVudCAtIG9uZSBvZiB0aGUgdmFsaWQgcGxhY2VtZW50IG9wdGlvbnNcbiAqIEByZXR1cm5zIHtPYmplY3R9IHBvcHBlck9mZnNldHMgLSBBbiBvYmplY3QgY29udGFpbmluZyB0aGUgb2Zmc2V0cyB3aGljaCB3aWxsIGJlIGFwcGxpZWQgdG8gdGhlIHBvcHBlclxuICovXG5mdW5jdGlvbiBnZXRQb3BwZXJPZmZzZXRzKHBvcHBlciwgcmVmZXJlbmNlT2Zmc2V0cywgcGxhY2VtZW50KSB7XG4gIHBsYWNlbWVudCA9IHBsYWNlbWVudC5zcGxpdCgnLScpWzBdO1xuXG4gIC8vIEdldCBwb3BwZXIgbm9kZSBzaXplc1xuICB2YXIgcG9wcGVyUmVjdCA9IGdldE91dGVyU2l6ZXMocG9wcGVyKTtcblxuICAvLyBBZGQgcG9zaXRpb24sIHdpZHRoIGFuZCBoZWlnaHQgdG8gb3VyIG9mZnNldHMgb2JqZWN0XG4gIHZhciBwb3BwZXJPZmZzZXRzID0ge1xuICAgIHdpZHRoOiBwb3BwZXJSZWN0LndpZHRoLFxuICAgIGhlaWdodDogcG9wcGVyUmVjdC5oZWlnaHRcbiAgfTtcblxuICAvLyBkZXBlbmRpbmcgYnkgdGhlIHBvcHBlciBwbGFjZW1lbnQgd2UgaGF2ZSB0byBjb21wdXRlIGl0cyBvZmZzZXRzIHNsaWdodGx5IGRpZmZlcmVudGx5XG4gIHZhciBpc0hvcml6ID0gWydyaWdodCcsICdsZWZ0J10uaW5kZXhPZihwbGFjZW1lbnQpICE9PSAtMTtcbiAgdmFyIG1haW5TaWRlID0gaXNIb3JpeiA/ICd0b3AnIDogJ2xlZnQnO1xuICB2YXIgc2Vjb25kYXJ5U2lkZSA9IGlzSG9yaXogPyAnbGVmdCcgOiAndG9wJztcbiAgdmFyIG1lYXN1cmVtZW50ID0gaXNIb3JpeiA/ICdoZWlnaHQnIDogJ3dpZHRoJztcbiAgdmFyIHNlY29uZGFyeU1lYXN1cmVtZW50ID0gIWlzSG9yaXogPyAnaGVpZ2h0JyA6ICd3aWR0aCc7XG5cbiAgcG9wcGVyT2Zmc2V0c1ttYWluU2lkZV0gPSByZWZlcmVuY2VPZmZzZXRzW21haW5TaWRlXSArIHJlZmVyZW5jZU9mZnNldHNbbWVhc3VyZW1lbnRdIC8gMiAtIHBvcHBlclJlY3RbbWVhc3VyZW1lbnRdIC8gMjtcbiAgaWYgKHBsYWNlbWVudCA9PT0gc2Vjb25kYXJ5U2lkZSkge1xuICAgIHBvcHBlck9mZnNldHNbc2Vjb25kYXJ5U2lkZV0gPSByZWZlcmVuY2VPZmZzZXRzW3NlY29uZGFyeVNpZGVdIC0gcG9wcGVyUmVjdFtzZWNvbmRhcnlNZWFzdXJlbWVudF07XG4gIH0gZWxzZSB7XG4gICAgcG9wcGVyT2Zmc2V0c1tzZWNvbmRhcnlTaWRlXSA9IHJlZmVyZW5jZU9mZnNldHNbZ2V0T3Bwb3NpdGVQbGFjZW1lbnQoc2Vjb25kYXJ5U2lkZSldO1xuICB9XG5cbiAgcmV0dXJuIHBvcHBlck9mZnNldHM7XG59XG5cbi8qKlxuICogTWltaWNzIHRoZSBgZmluZGAgbWV0aG9kIG9mIEFycmF5XG4gKiBAbWV0aG9kXG4gKiBAbWVtYmVyb2YgUG9wcGVyLlV0aWxzXG4gKiBAYXJndW1lbnQge0FycmF5fSBhcnJcbiAqIEBhcmd1bWVudCBwcm9wXG4gKiBAYXJndW1lbnQgdmFsdWVcbiAqIEByZXR1cm5zIGluZGV4IG9yIC0xXG4gKi9cbmZ1bmN0aW9uIGZpbmQoYXJyLCBjaGVjaykge1xuICAvLyB1c2UgbmF0aXZlIGZpbmQgaWYgc3VwcG9ydGVkXG4gIGlmIChBcnJheS5wcm90b3R5cGUuZmluZCkge1xuICAgIHJldHVybiBhcnIuZmluZChjaGVjayk7XG4gIH1cblxuICAvLyB1c2UgYGZpbHRlcmAgdG8gb2J0YWluIHRoZSBzYW1lIGJlaGF2aW9yIG9mIGBmaW5kYFxuICByZXR1cm4gYXJyLmZpbHRlcihjaGVjaylbMF07XG59XG5cbi8qKlxuICogUmV0dXJuIHRoZSBpbmRleCBvZiB0aGUgbWF0Y2hpbmcgb2JqZWN0XG4gKiBAbWV0aG9kXG4gKiBAbWVtYmVyb2YgUG9wcGVyLlV0aWxzXG4gKiBAYXJndW1lbnQge0FycmF5fSBhcnJcbiAqIEBhcmd1bWVudCBwcm9wXG4gKiBAYXJndW1lbnQgdmFsdWVcbiAqIEByZXR1cm5zIGluZGV4IG9yIC0xXG4gKi9cbmZ1bmN0aW9uIGZpbmRJbmRleChhcnIsIHByb3AsIHZhbHVlKSB7XG4gIC8vIHVzZSBuYXRpdmUgZmluZEluZGV4IGlmIHN1cHBvcnRlZFxuICBpZiAoQXJyYXkucHJvdG90eXBlLmZpbmRJbmRleCkge1xuICAgIHJldHVybiBhcnIuZmluZEluZGV4KGZ1bmN0aW9uIChjdXIpIHtcbiAgICAgIHJldHVybiBjdXJbcHJvcF0gPT09IHZhbHVlO1xuICAgIH0pO1xuICB9XG5cbiAgLy8gdXNlIGBmaW5kYCArIGBpbmRleE9mYCBpZiBgZmluZEluZGV4YCBpc24ndCBzdXBwb3J0ZWRcbiAgdmFyIG1hdGNoID0gZmluZChhcnIsIGZ1bmN0aW9uIChvYmopIHtcbiAgICByZXR1cm4gb2JqW3Byb3BdID09PSB2YWx1ZTtcbiAgfSk7XG4gIHJldHVybiBhcnIuaW5kZXhPZihtYXRjaCk7XG59XG5cbi8qKlxuICogTG9vcCB0cm91Z2ggdGhlIGxpc3Qgb2YgbW9kaWZpZXJzIGFuZCBydW4gdGhlbSBpbiBvcmRlcixcbiAqIGVhY2ggb2YgdGhlbSB3aWxsIHRoZW4gZWRpdCB0aGUgZGF0YSBvYmplY3QuXG4gKiBAbWV0aG9kXG4gKiBAbWVtYmVyb2YgUG9wcGVyLlV0aWxzXG4gKiBAcGFyYW0ge2RhdGFPYmplY3R9IGRhdGFcbiAqIEBwYXJhbSB7QXJyYXl9IG1vZGlmaWVyc1xuICogQHBhcmFtIHtTdHJpbmd9IGVuZHMgLSBPcHRpb25hbCBtb2RpZmllciBuYW1lIHVzZWQgYXMgc3RvcHBlclxuICogQHJldHVybnMge2RhdGFPYmplY3R9XG4gKi9cbmZ1bmN0aW9uIHJ1bk1vZGlmaWVycyhtb2RpZmllcnMsIGRhdGEsIGVuZHMpIHtcbiAgdmFyIG1vZGlmaWVyc1RvUnVuID0gZW5kcyA9PT0gdW5kZWZpbmVkID8gbW9kaWZpZXJzIDogbW9kaWZpZXJzLnNsaWNlKDAsIGZpbmRJbmRleChtb2RpZmllcnMsICduYW1lJywgZW5kcykpO1xuXG4gIG1vZGlmaWVyc1RvUnVuLmZvckVhY2goZnVuY3Rpb24gKG1vZGlmaWVyKSB7XG4gICAgaWYgKG1vZGlmaWVyWydmdW5jdGlvbiddKSB7XG4gICAgICAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIGRvdC1ub3RhdGlvblxuICAgICAgY29uc29sZS53YXJuKCdgbW9kaWZpZXIuZnVuY3Rpb25gIGlzIGRlcHJlY2F0ZWQsIHVzZSBgbW9kaWZpZXIuZm5gIScpO1xuICAgIH1cbiAgICB2YXIgZm4gPSBtb2RpZmllclsnZnVuY3Rpb24nXSB8fCBtb2RpZmllci5mbjsgLy8gZXNsaW50LWRpc2FibGUtbGluZSBkb3Qtbm90YXRpb25cbiAgICBpZiAobW9kaWZpZXIuZW5hYmxlZCAmJiBpc0Z1bmN0aW9uKGZuKSkge1xuICAgICAgLy8gQWRkIHByb3BlcnRpZXMgdG8gb2Zmc2V0cyB0byBtYWtlIHRoZW0gYSBjb21wbGV0ZSBjbGllbnRSZWN0IG9iamVjdFxuICAgICAgLy8gd2UgZG8gdGhpcyBiZWZvcmUgZWFjaCBtb2RpZmllciB0byBtYWtlIHN1cmUgdGhlIHByZXZpb3VzIG9uZSBkb2Vzbid0XG4gICAgICAvLyBtZXNzIHdpdGggdGhlc2UgdmFsdWVzXG4gICAgICBkYXRhLm9mZnNldHMucG9wcGVyID0gZ2V0Q2xpZW50UmVjdChkYXRhLm9mZnNldHMucG9wcGVyKTtcbiAgICAgIGRhdGEub2Zmc2V0cy5yZWZlcmVuY2UgPSBnZXRDbGllbnRSZWN0KGRhdGEub2Zmc2V0cy5yZWZlcmVuY2UpO1xuXG4gICAgICBkYXRhID0gZm4oZGF0YSwgbW9kaWZpZXIpO1xuICAgIH1cbiAgfSk7XG5cbiAgcmV0dXJuIGRhdGE7XG59XG5cbi8qKlxuICogVXBkYXRlcyB0aGUgcG9zaXRpb24gb2YgdGhlIHBvcHBlciwgY29tcHV0aW5nIHRoZSBuZXcgb2Zmc2V0cyBhbmQgYXBwbHlpbmdcbiAqIHRoZSBuZXcgc3R5bGUuPGJyIC8+XG4gKiBQcmVmZXIgYHNjaGVkdWxlVXBkYXRlYCBvdmVyIGB1cGRhdGVgIGJlY2F1c2Ugb2YgcGVyZm9ybWFuY2UgcmVhc29ucy5cbiAqIEBtZXRob2RcbiAqIEBtZW1iZXJvZiBQb3BwZXJcbiAqL1xuZnVuY3Rpb24gdXBkYXRlKCkge1xuICAvLyBpZiBwb3BwZXIgaXMgZGVzdHJveWVkLCBkb24ndCBwZXJmb3JtIGFueSBmdXJ0aGVyIHVwZGF0ZVxuICBpZiAodGhpcy5zdGF0ZS5pc0Rlc3Ryb3llZCkge1xuICAgIHJldHVybjtcbiAgfVxuXG4gIHZhciBkYXRhID0ge1xuICAgIGluc3RhbmNlOiB0aGlzLFxuICAgIHN0eWxlczoge30sXG4gICAgYXJyb3dTdHlsZXM6IHt9LFxuICAgIGF0dHJpYnV0ZXM6IHt9LFxuICAgIGZsaXBwZWQ6IGZhbHNlLFxuICAgIG9mZnNldHM6IHt9XG4gIH07XG5cbiAgLy8gY29tcHV0ZSByZWZlcmVuY2UgZWxlbWVudCBvZmZzZXRzXG4gIGRhdGEub2Zmc2V0cy5yZWZlcmVuY2UgPSBnZXRSZWZlcmVuY2VPZmZzZXRzKHRoaXMuc3RhdGUsIHRoaXMucG9wcGVyLCB0aGlzLnJlZmVyZW5jZSwgdGhpcy5vcHRpb25zLnBvc2l0aW9uRml4ZWQpO1xuXG4gIC8vIGNvbXB1dGUgYXV0byBwbGFjZW1lbnQsIHN0b3JlIHBsYWNlbWVudCBpbnNpZGUgdGhlIGRhdGEgb2JqZWN0LFxuICAvLyBtb2RpZmllcnMgd2lsbCBiZSBhYmxlIHRvIGVkaXQgYHBsYWNlbWVudGAgaWYgbmVlZGVkXG4gIC8vIGFuZCByZWZlciB0byBvcmlnaW5hbFBsYWNlbWVudCB0byBrbm93IHRoZSBvcmlnaW5hbCB2YWx1ZVxuICBkYXRhLnBsYWNlbWVudCA9IGNvbXB1dGVBdXRvUGxhY2VtZW50KHRoaXMub3B0aW9ucy5wbGFjZW1lbnQsIGRhdGEub2Zmc2V0cy5yZWZlcmVuY2UsIHRoaXMucG9wcGVyLCB0aGlzLnJlZmVyZW5jZSwgdGhpcy5vcHRpb25zLm1vZGlmaWVycy5mbGlwLmJvdW5kYXJpZXNFbGVtZW50LCB0aGlzLm9wdGlvbnMubW9kaWZpZXJzLmZsaXAucGFkZGluZyk7XG5cbiAgLy8gc3RvcmUgdGhlIGNvbXB1dGVkIHBsYWNlbWVudCBpbnNpZGUgYG9yaWdpbmFsUGxhY2VtZW50YFxuICBkYXRhLm9yaWdpbmFsUGxhY2VtZW50ID0gZGF0YS5wbGFjZW1lbnQ7XG5cbiAgZGF0YS5wb3NpdGlvbkZpeGVkID0gdGhpcy5vcHRpb25zLnBvc2l0aW9uRml4ZWQ7XG5cbiAgLy8gY29tcHV0ZSB0aGUgcG9wcGVyIG9mZnNldHNcbiAgZGF0YS5vZmZzZXRzLnBvcHBlciA9IGdldFBvcHBlck9mZnNldHModGhpcy5wb3BwZXIsIGRhdGEub2Zmc2V0cy5yZWZlcmVuY2UsIGRhdGEucGxhY2VtZW50KTtcblxuICBkYXRhLm9mZnNldHMucG9wcGVyLnBvc2l0aW9uID0gdGhpcy5vcHRpb25zLnBvc2l0aW9uRml4ZWQgPyAnZml4ZWQnIDogJ2Fic29sdXRlJztcblxuICAvLyBydW4gdGhlIG1vZGlmaWVyc1xuICBkYXRhID0gcnVuTW9kaWZpZXJzKHRoaXMubW9kaWZpZXJzLCBkYXRhKTtcblxuICAvLyB0aGUgZmlyc3QgYHVwZGF0ZWAgd2lsbCBjYWxsIGBvbkNyZWF0ZWAgY2FsbGJhY2tcbiAgLy8gdGhlIG90aGVyIG9uZXMgd2lsbCBjYWxsIGBvblVwZGF0ZWAgY2FsbGJhY2tcbiAgaWYgKCF0aGlzLnN0YXRlLmlzQ3JlYXRlZCkge1xuICAgIHRoaXMuc3RhdGUuaXNDcmVhdGVkID0gdHJ1ZTtcbiAgICB0aGlzLm9wdGlvbnMub25DcmVhdGUoZGF0YSk7XG4gIH0gZWxzZSB7XG4gICAgdGhpcy5vcHRpb25zLm9uVXBkYXRlKGRhdGEpO1xuICB9XG59XG5cbi8qKlxuICogSGVscGVyIHVzZWQgdG8ga25vdyBpZiB0aGUgZ2l2ZW4gbW9kaWZpZXIgaXMgZW5hYmxlZC5cbiAqIEBtZXRob2RcbiAqIEBtZW1iZXJvZiBQb3BwZXIuVXRpbHNcbiAqIEByZXR1cm5zIHtCb29sZWFufVxuICovXG5mdW5jdGlvbiBpc01vZGlmaWVyRW5hYmxlZChtb2RpZmllcnMsIG1vZGlmaWVyTmFtZSkge1xuICByZXR1cm4gbW9kaWZpZXJzLnNvbWUoZnVuY3Rpb24gKF9yZWYpIHtcbiAgICB2YXIgbmFtZSA9IF9yZWYubmFtZSxcbiAgICAgICAgZW5hYmxlZCA9IF9yZWYuZW5hYmxlZDtcbiAgICByZXR1cm4gZW5hYmxlZCAmJiBuYW1lID09PSBtb2RpZmllck5hbWU7XG4gIH0pO1xufVxuXG4vKipcbiAqIEdldCB0aGUgcHJlZml4ZWQgc3VwcG9ydGVkIHByb3BlcnR5IG5hbWVcbiAqIEBtZXRob2RcbiAqIEBtZW1iZXJvZiBQb3BwZXIuVXRpbHNcbiAqIEBhcmd1bWVudCB7U3RyaW5nfSBwcm9wZXJ0eSAoY2FtZWxDYXNlKVxuICogQHJldHVybnMge1N0cmluZ30gcHJlZml4ZWQgcHJvcGVydHkgKGNhbWVsQ2FzZSBvciBQYXNjYWxDYXNlLCBkZXBlbmRpbmcgb24gdGhlIHZlbmRvciBwcmVmaXgpXG4gKi9cbmZ1bmN0aW9uIGdldFN1cHBvcnRlZFByb3BlcnR5TmFtZShwcm9wZXJ0eSkge1xuICB2YXIgcHJlZml4ZXMgPSBbZmFsc2UsICdtcycsICdXZWJraXQnLCAnTW96JywgJ08nXTtcbiAgdmFyIHVwcGVyUHJvcCA9IHByb3BlcnR5LmNoYXJBdCgwKS50b1VwcGVyQ2FzZSgpICsgcHJvcGVydHkuc2xpY2UoMSk7XG5cbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBwcmVmaXhlcy5sZW5ndGg7IGkrKykge1xuICAgIHZhciBwcmVmaXggPSBwcmVmaXhlc1tpXTtcbiAgICB2YXIgdG9DaGVjayA9IHByZWZpeCA/ICcnICsgcHJlZml4ICsgdXBwZXJQcm9wIDogcHJvcGVydHk7XG4gICAgaWYgKHR5cGVvZiBkb2N1bWVudC5ib2R5LnN0eWxlW3RvQ2hlY2tdICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgcmV0dXJuIHRvQ2hlY2s7XG4gICAgfVxuICB9XG4gIHJldHVybiBudWxsO1xufVxuXG4vKipcbiAqIERlc3Ryb3lzIHRoZSBwb3BwZXIuXG4gKiBAbWV0aG9kXG4gKiBAbWVtYmVyb2YgUG9wcGVyXG4gKi9cbmZ1bmN0aW9uIGRlc3Ryb3koKSB7XG4gIHRoaXMuc3RhdGUuaXNEZXN0cm95ZWQgPSB0cnVlO1xuXG4gIC8vIHRvdWNoIERPTSBvbmx5IGlmIGBhcHBseVN0eWxlYCBtb2RpZmllciBpcyBlbmFibGVkXG4gIGlmIChpc01vZGlmaWVyRW5hYmxlZCh0aGlzLm1vZGlmaWVycywgJ2FwcGx5U3R5bGUnKSkge1xuICAgIHRoaXMucG9wcGVyLnJlbW92ZUF0dHJpYnV0ZSgneC1wbGFjZW1lbnQnKTtcbiAgICB0aGlzLnBvcHBlci5zdHlsZS5wb3NpdGlvbiA9ICcnO1xuICAgIHRoaXMucG9wcGVyLnN0eWxlLnRvcCA9ICcnO1xuICAgIHRoaXMucG9wcGVyLnN0eWxlLmxlZnQgPSAnJztcbiAgICB0aGlzLnBvcHBlci5zdHlsZS5yaWdodCA9ICcnO1xuICAgIHRoaXMucG9wcGVyLnN0eWxlLmJvdHRvbSA9ICcnO1xuICAgIHRoaXMucG9wcGVyLnN0eWxlLndpbGxDaGFuZ2UgPSAnJztcbiAgICB0aGlzLnBvcHBlci5zdHlsZVtnZXRTdXBwb3J0ZWRQcm9wZXJ0eU5hbWUoJ3RyYW5zZm9ybScpXSA9ICcnO1xuICB9XG5cbiAgdGhpcy5kaXNhYmxlRXZlbnRMaXN0ZW5lcnMoKTtcblxuICAvLyByZW1vdmUgdGhlIHBvcHBlciBpZiB1c2VyIGV4cGxpY2l0eSBhc2tlZCBmb3IgdGhlIGRlbGV0aW9uIG9uIGRlc3Ryb3lcbiAgLy8gZG8gbm90IHVzZSBgcmVtb3ZlYCBiZWNhdXNlIElFMTEgZG9lc24ndCBzdXBwb3J0IGl0XG4gIGlmICh0aGlzLm9wdGlvbnMucmVtb3ZlT25EZXN0cm95KSB7XG4gICAgdGhpcy5wb3BwZXIucGFyZW50Tm9kZS5yZW1vdmVDaGlsZCh0aGlzLnBvcHBlcik7XG4gIH1cbiAgcmV0dXJuIHRoaXM7XG59XG5cbi8qKlxuICogR2V0IHRoZSB3aW5kb3cgYXNzb2NpYXRlZCB3aXRoIHRoZSBlbGVtZW50XG4gKiBAYXJndW1lbnQge0VsZW1lbnR9IGVsZW1lbnRcbiAqIEByZXR1cm5zIHtXaW5kb3d9XG4gKi9cbmZ1bmN0aW9uIGdldFdpbmRvdyhlbGVtZW50KSB7XG4gIHZhciBvd25lckRvY3VtZW50ID0gZWxlbWVudC5vd25lckRvY3VtZW50O1xuICByZXR1cm4gb3duZXJEb2N1bWVudCA/IG93bmVyRG9jdW1lbnQuZGVmYXVsdFZpZXcgOiB3aW5kb3c7XG59XG5cbmZ1bmN0aW9uIGF0dGFjaFRvU2Nyb2xsUGFyZW50cyhzY3JvbGxQYXJlbnQsIGV2ZW50LCBjYWxsYmFjaywgc2Nyb2xsUGFyZW50cykge1xuICB2YXIgaXNCb2R5ID0gc2Nyb2xsUGFyZW50Lm5vZGVOYW1lID09PSAnQk9EWSc7XG4gIHZhciB0YXJnZXQgPSBpc0JvZHkgPyBzY3JvbGxQYXJlbnQub3duZXJEb2N1bWVudC5kZWZhdWx0VmlldyA6IHNjcm9sbFBhcmVudDtcbiAgdGFyZ2V0LmFkZEV2ZW50TGlzdGVuZXIoZXZlbnQsIGNhbGxiYWNrLCB7IHBhc3NpdmU6IHRydWUgfSk7XG5cbiAgaWYgKCFpc0JvZHkpIHtcbiAgICBhdHRhY2hUb1Njcm9sbFBhcmVudHMoZ2V0U2Nyb2xsUGFyZW50KHRhcmdldC5wYXJlbnROb2RlKSwgZXZlbnQsIGNhbGxiYWNrLCBzY3JvbGxQYXJlbnRzKTtcbiAgfVxuICBzY3JvbGxQYXJlbnRzLnB1c2godGFyZ2V0KTtcbn1cblxuLyoqXG4gKiBTZXR1cCBuZWVkZWQgZXZlbnQgbGlzdGVuZXJzIHVzZWQgdG8gdXBkYXRlIHRoZSBwb3BwZXIgcG9zaXRpb25cbiAqIEBtZXRob2RcbiAqIEBtZW1iZXJvZiBQb3BwZXIuVXRpbHNcbiAqIEBwcml2YXRlXG4gKi9cbmZ1bmN0aW9uIHNldHVwRXZlbnRMaXN0ZW5lcnMocmVmZXJlbmNlLCBvcHRpb25zLCBzdGF0ZSwgdXBkYXRlQm91bmQpIHtcbiAgLy8gUmVzaXplIGV2ZW50IGxpc3RlbmVyIG9uIHdpbmRvd1xuICBzdGF0ZS51cGRhdGVCb3VuZCA9IHVwZGF0ZUJvdW5kO1xuICBnZXRXaW5kb3cocmVmZXJlbmNlKS5hZGRFdmVudExpc3RlbmVyKCdyZXNpemUnLCBzdGF0ZS51cGRhdGVCb3VuZCwgeyBwYXNzaXZlOiB0cnVlIH0pO1xuXG4gIC8vIFNjcm9sbCBldmVudCBsaXN0ZW5lciBvbiBzY3JvbGwgcGFyZW50c1xuICB2YXIgc2Nyb2xsRWxlbWVudCA9IGdldFNjcm9sbFBhcmVudChyZWZlcmVuY2UpO1xuICBhdHRhY2hUb1Njcm9sbFBhcmVudHMoc2Nyb2xsRWxlbWVudCwgJ3Njcm9sbCcsIHN0YXRlLnVwZGF0ZUJvdW5kLCBzdGF0ZS5zY3JvbGxQYXJlbnRzKTtcbiAgc3RhdGUuc2Nyb2xsRWxlbWVudCA9IHNjcm9sbEVsZW1lbnQ7XG4gIHN0YXRlLmV2ZW50c0VuYWJsZWQgPSB0cnVlO1xuXG4gIHJldHVybiBzdGF0ZTtcbn1cblxuLyoqXG4gKiBJdCB3aWxsIGFkZCByZXNpemUvc2Nyb2xsIGV2ZW50cyBhbmQgc3RhcnQgcmVjYWxjdWxhdGluZ1xuICogcG9zaXRpb24gb2YgdGhlIHBvcHBlciBlbGVtZW50IHdoZW4gdGhleSBhcmUgdHJpZ2dlcmVkLlxuICogQG1ldGhvZFxuICogQG1lbWJlcm9mIFBvcHBlclxuICovXG5mdW5jdGlvbiBlbmFibGVFdmVudExpc3RlbmVycygpIHtcbiAgaWYgKCF0aGlzLnN0YXRlLmV2ZW50c0VuYWJsZWQpIHtcbiAgICB0aGlzLnN0YXRlID0gc2V0dXBFdmVudExpc3RlbmVycyh0aGlzLnJlZmVyZW5jZSwgdGhpcy5vcHRpb25zLCB0aGlzLnN0YXRlLCB0aGlzLnNjaGVkdWxlVXBkYXRlKTtcbiAgfVxufVxuXG4vKipcbiAqIFJlbW92ZSBldmVudCBsaXN0ZW5lcnMgdXNlZCB0byB1cGRhdGUgdGhlIHBvcHBlciBwb3NpdGlvblxuICogQG1ldGhvZFxuICogQG1lbWJlcm9mIFBvcHBlci5VdGlsc1xuICogQHByaXZhdGVcbiAqL1xuZnVuY3Rpb24gcmVtb3ZlRXZlbnRMaXN0ZW5lcnMocmVmZXJlbmNlLCBzdGF0ZSkge1xuICAvLyBSZW1vdmUgcmVzaXplIGV2ZW50IGxpc3RlbmVyIG9uIHdpbmRvd1xuICBnZXRXaW5kb3cocmVmZXJlbmNlKS5yZW1vdmVFdmVudExpc3RlbmVyKCdyZXNpemUnLCBzdGF0ZS51cGRhdGVCb3VuZCk7XG5cbiAgLy8gUmVtb3ZlIHNjcm9sbCBldmVudCBsaXN0ZW5lciBvbiBzY3JvbGwgcGFyZW50c1xuICBzdGF0ZS5zY3JvbGxQYXJlbnRzLmZvckVhY2goZnVuY3Rpb24gKHRhcmdldCkge1xuICAgIHRhcmdldC5yZW1vdmVFdmVudExpc3RlbmVyKCdzY3JvbGwnLCBzdGF0ZS51cGRhdGVCb3VuZCk7XG4gIH0pO1xuXG4gIC8vIFJlc2V0IHN0YXRlXG4gIHN0YXRlLnVwZGF0ZUJvdW5kID0gbnVsbDtcbiAgc3RhdGUuc2Nyb2xsUGFyZW50cyA9IFtdO1xuICBzdGF0ZS5zY3JvbGxFbGVtZW50ID0gbnVsbDtcbiAgc3RhdGUuZXZlbnRzRW5hYmxlZCA9IGZhbHNlO1xuICByZXR1cm4gc3RhdGU7XG59XG5cbi8qKlxuICogSXQgd2lsbCByZW1vdmUgcmVzaXplL3Njcm9sbCBldmVudHMgYW5kIHdvbid0IHJlY2FsY3VsYXRlIHBvcHBlciBwb3NpdGlvblxuICogd2hlbiB0aGV5IGFyZSB0cmlnZ2VyZWQuIEl0IGFsc28gd29uJ3QgdHJpZ2dlciBgb25VcGRhdGVgIGNhbGxiYWNrIGFueW1vcmUsXG4gKiB1bmxlc3MgeW91IGNhbGwgYHVwZGF0ZWAgbWV0aG9kIG1hbnVhbGx5LlxuICogQG1ldGhvZFxuICogQG1lbWJlcm9mIFBvcHBlclxuICovXG5mdW5jdGlvbiBkaXNhYmxlRXZlbnRMaXN0ZW5lcnMoKSB7XG4gIGlmICh0aGlzLnN0YXRlLmV2ZW50c0VuYWJsZWQpIHtcbiAgICBjYW5jZWxBbmltYXRpb25GcmFtZSh0aGlzLnNjaGVkdWxlVXBkYXRlKTtcbiAgICB0aGlzLnN0YXRlID0gcmVtb3ZlRXZlbnRMaXN0ZW5lcnModGhpcy5yZWZlcmVuY2UsIHRoaXMuc3RhdGUpO1xuICB9XG59XG5cbi8qKlxuICogVGVsbHMgaWYgYSBnaXZlbiBpbnB1dCBpcyBhIG51bWJlclxuICogQG1ldGhvZFxuICogQG1lbWJlcm9mIFBvcHBlci5VdGlsc1xuICogQHBhcmFtIHsqfSBpbnB1dCB0byBjaGVja1xuICogQHJldHVybiB7Qm9vbGVhbn1cbiAqL1xuZnVuY3Rpb24gaXNOdW1lcmljKG4pIHtcbiAgcmV0dXJuIG4gIT09ICcnICYmICFpc05hTihwYXJzZUZsb2F0KG4pKSAmJiBpc0Zpbml0ZShuKTtcbn1cblxuLyoqXG4gKiBTZXQgdGhlIHN0eWxlIHRvIHRoZSBnaXZlbiBwb3BwZXJcbiAqIEBtZXRob2RcbiAqIEBtZW1iZXJvZiBQb3BwZXIuVXRpbHNcbiAqIEBhcmd1bWVudCB7RWxlbWVudH0gZWxlbWVudCAtIEVsZW1lbnQgdG8gYXBwbHkgdGhlIHN0eWxlIHRvXG4gKiBAYXJndW1lbnQge09iamVjdH0gc3R5bGVzXG4gKiBPYmplY3Qgd2l0aCBhIGxpc3Qgb2YgcHJvcGVydGllcyBhbmQgdmFsdWVzIHdoaWNoIHdpbGwgYmUgYXBwbGllZCB0byB0aGUgZWxlbWVudFxuICovXG5mdW5jdGlvbiBzZXRTdHlsZXMoZWxlbWVudCwgc3R5bGVzKSB7XG4gIE9iamVjdC5rZXlzKHN0eWxlcykuZm9yRWFjaChmdW5jdGlvbiAocHJvcCkge1xuICAgIHZhciB1bml0ID0gJyc7XG4gICAgLy8gYWRkIHVuaXQgaWYgdGhlIHZhbHVlIGlzIG51bWVyaWMgYW5kIGlzIG9uZSBvZiB0aGUgZm9sbG93aW5nXG4gICAgaWYgKFsnd2lkdGgnLCAnaGVpZ2h0JywgJ3RvcCcsICdyaWdodCcsICdib3R0b20nLCAnbGVmdCddLmluZGV4T2YocHJvcCkgIT09IC0xICYmIGlzTnVtZXJpYyhzdHlsZXNbcHJvcF0pKSB7XG4gICAgICB1bml0ID0gJ3B4JztcbiAgICB9XG4gICAgZWxlbWVudC5zdHlsZVtwcm9wXSA9IHN0eWxlc1twcm9wXSArIHVuaXQ7XG4gIH0pO1xufVxuXG4vKipcbiAqIFNldCB0aGUgYXR0cmlidXRlcyB0byB0aGUgZ2l2ZW4gcG9wcGVyXG4gKiBAbWV0aG9kXG4gKiBAbWVtYmVyb2YgUG9wcGVyLlV0aWxzXG4gKiBAYXJndW1lbnQge0VsZW1lbnR9IGVsZW1lbnQgLSBFbGVtZW50IHRvIGFwcGx5IHRoZSBhdHRyaWJ1dGVzIHRvXG4gKiBAYXJndW1lbnQge09iamVjdH0gc3R5bGVzXG4gKiBPYmplY3Qgd2l0aCBhIGxpc3Qgb2YgcHJvcGVydGllcyBhbmQgdmFsdWVzIHdoaWNoIHdpbGwgYmUgYXBwbGllZCB0byB0aGUgZWxlbWVudFxuICovXG5mdW5jdGlvbiBzZXRBdHRyaWJ1dGVzKGVsZW1lbnQsIGF0dHJpYnV0ZXMpIHtcbiAgT2JqZWN0LmtleXMoYXR0cmlidXRlcykuZm9yRWFjaChmdW5jdGlvbiAocHJvcCkge1xuICAgIHZhciB2YWx1ZSA9IGF0dHJpYnV0ZXNbcHJvcF07XG4gICAgaWYgKHZhbHVlICE9PSBmYWxzZSkge1xuICAgICAgZWxlbWVudC5zZXRBdHRyaWJ1dGUocHJvcCwgYXR0cmlidXRlc1twcm9wXSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGVsZW1lbnQucmVtb3ZlQXR0cmlidXRlKHByb3ApO1xuICAgIH1cbiAgfSk7XG59XG5cbi8qKlxuICogQGZ1bmN0aW9uXG4gKiBAbWVtYmVyb2YgTW9kaWZpZXJzXG4gKiBAYXJndW1lbnQge09iamVjdH0gZGF0YSAtIFRoZSBkYXRhIG9iamVjdCBnZW5lcmF0ZWQgYnkgYHVwZGF0ZWAgbWV0aG9kXG4gKiBAYXJndW1lbnQge09iamVjdH0gZGF0YS5zdHlsZXMgLSBMaXN0IG9mIHN0eWxlIHByb3BlcnRpZXMgLSB2YWx1ZXMgdG8gYXBwbHkgdG8gcG9wcGVyIGVsZW1lbnRcbiAqIEBhcmd1bWVudCB7T2JqZWN0fSBkYXRhLmF0dHJpYnV0ZXMgLSBMaXN0IG9mIGF0dHJpYnV0ZSBwcm9wZXJ0aWVzIC0gdmFsdWVzIHRvIGFwcGx5IHRvIHBvcHBlciBlbGVtZW50XG4gKiBAYXJndW1lbnQge09iamVjdH0gb3B0aW9ucyAtIE1vZGlmaWVycyBjb25maWd1cmF0aW9uIGFuZCBvcHRpb25zXG4gKiBAcmV0dXJucyB7T2JqZWN0fSBUaGUgc2FtZSBkYXRhIG9iamVjdFxuICovXG5mdW5jdGlvbiBhcHBseVN0eWxlKGRhdGEpIHtcbiAgLy8gYW55IHByb3BlcnR5IHByZXNlbnQgaW4gYGRhdGEuc3R5bGVzYCB3aWxsIGJlIGFwcGxpZWQgdG8gdGhlIHBvcHBlcixcbiAgLy8gaW4gdGhpcyB3YXkgd2UgY2FuIG1ha2UgdGhlIDNyZCBwYXJ0eSBtb2RpZmllcnMgYWRkIGN1c3RvbSBzdHlsZXMgdG8gaXRcbiAgLy8gQmUgYXdhcmUsIG1vZGlmaWVycyBjb3VsZCBvdmVycmlkZSB0aGUgcHJvcGVydGllcyBkZWZpbmVkIGluIHRoZSBwcmV2aW91c1xuICAvLyBsaW5lcyBvZiB0aGlzIG1vZGlmaWVyIVxuICBzZXRTdHlsZXMoZGF0YS5pbnN0YW5jZS5wb3BwZXIsIGRhdGEuc3R5bGVzKTtcblxuICAvLyBhbnkgcHJvcGVydHkgcHJlc2VudCBpbiBgZGF0YS5hdHRyaWJ1dGVzYCB3aWxsIGJlIGFwcGxpZWQgdG8gdGhlIHBvcHBlcixcbiAgLy8gdGhleSB3aWxsIGJlIHNldCBhcyBIVE1MIGF0dHJpYnV0ZXMgb2YgdGhlIGVsZW1lbnRcbiAgc2V0QXR0cmlidXRlcyhkYXRhLmluc3RhbmNlLnBvcHBlciwgZGF0YS5hdHRyaWJ1dGVzKTtcblxuICAvLyBpZiBhcnJvd0VsZW1lbnQgaXMgZGVmaW5lZCBhbmQgYXJyb3dTdHlsZXMgaGFzIHNvbWUgcHJvcGVydGllc1xuICBpZiAoZGF0YS5hcnJvd0VsZW1lbnQgJiYgT2JqZWN0LmtleXMoZGF0YS5hcnJvd1N0eWxlcykubGVuZ3RoKSB7XG4gICAgc2V0U3R5bGVzKGRhdGEuYXJyb3dFbGVtZW50LCBkYXRhLmFycm93U3R5bGVzKTtcbiAgfVxuXG4gIHJldHVybiBkYXRhO1xufVxuXG4vKipcbiAqIFNldCB0aGUgeC1wbGFjZW1lbnQgYXR0cmlidXRlIGJlZm9yZSBldmVyeXRoaW5nIGVsc2UgYmVjYXVzZSBpdCBjb3VsZCBiZSB1c2VkXG4gKiB0byBhZGQgbWFyZ2lucyB0byB0aGUgcG9wcGVyIG1hcmdpbnMgbmVlZHMgdG8gYmUgY2FsY3VsYXRlZCB0byBnZXQgdGhlXG4gKiBjb3JyZWN0IHBvcHBlciBvZmZzZXRzLlxuICogQG1ldGhvZFxuICogQG1lbWJlcm9mIFBvcHBlci5tb2RpZmllcnNcbiAqIEBwYXJhbSB7SFRNTEVsZW1lbnR9IHJlZmVyZW5jZSAtIFRoZSByZWZlcmVuY2UgZWxlbWVudCB1c2VkIHRvIHBvc2l0aW9uIHRoZSBwb3BwZXJcbiAqIEBwYXJhbSB7SFRNTEVsZW1lbnR9IHBvcHBlciAtIFRoZSBIVE1MIGVsZW1lbnQgdXNlZCBhcyBwb3BwZXJcbiAqIEBwYXJhbSB7T2JqZWN0fSBvcHRpb25zIC0gUG9wcGVyLmpzIG9wdGlvbnNcbiAqL1xuZnVuY3Rpb24gYXBwbHlTdHlsZU9uTG9hZChyZWZlcmVuY2UsIHBvcHBlciwgb3B0aW9ucywgbW9kaWZpZXJPcHRpb25zLCBzdGF0ZSkge1xuICAvLyBjb21wdXRlIHJlZmVyZW5jZSBlbGVtZW50IG9mZnNldHNcbiAgdmFyIHJlZmVyZW5jZU9mZnNldHMgPSBnZXRSZWZlcmVuY2VPZmZzZXRzKHN0YXRlLCBwb3BwZXIsIHJlZmVyZW5jZSwgb3B0aW9ucy5wb3NpdGlvbkZpeGVkKTtcblxuICAvLyBjb21wdXRlIGF1dG8gcGxhY2VtZW50LCBzdG9yZSBwbGFjZW1lbnQgaW5zaWRlIHRoZSBkYXRhIG9iamVjdCxcbiAgLy8gbW9kaWZpZXJzIHdpbGwgYmUgYWJsZSB0byBlZGl0IGBwbGFjZW1lbnRgIGlmIG5lZWRlZFxuICAvLyBhbmQgcmVmZXIgdG8gb3JpZ2luYWxQbGFjZW1lbnQgdG8ga25vdyB0aGUgb3JpZ2luYWwgdmFsdWVcbiAgdmFyIHBsYWNlbWVudCA9IGNvbXB1dGVBdXRvUGxhY2VtZW50KG9wdGlvbnMucGxhY2VtZW50LCByZWZlcmVuY2VPZmZzZXRzLCBwb3BwZXIsIHJlZmVyZW5jZSwgb3B0aW9ucy5tb2RpZmllcnMuZmxpcC5ib3VuZGFyaWVzRWxlbWVudCwgb3B0aW9ucy5tb2RpZmllcnMuZmxpcC5wYWRkaW5nKTtcblxuICBwb3BwZXIuc2V0QXR0cmlidXRlKCd4LXBsYWNlbWVudCcsIHBsYWNlbWVudCk7XG5cbiAgLy8gQXBwbHkgYHBvc2l0aW9uYCB0byBwb3BwZXIgYmVmb3JlIGFueXRoaW5nIGVsc2UgYmVjYXVzZVxuICAvLyB3aXRob3V0IHRoZSBwb3NpdGlvbiBhcHBsaWVkIHdlIGNhbid0IGd1YXJhbnRlZSBjb3JyZWN0IGNvbXB1dGF0aW9uc1xuICBzZXRTdHlsZXMocG9wcGVyLCB7IHBvc2l0aW9uOiBvcHRpb25zLnBvc2l0aW9uRml4ZWQgPyAnZml4ZWQnIDogJ2Fic29sdXRlJyB9KTtcblxuICByZXR1cm4gb3B0aW9ucztcbn1cblxuLyoqXG4gKiBAZnVuY3Rpb25cbiAqIEBtZW1iZXJvZiBQb3BwZXIuVXRpbHNcbiAqIEBhcmd1bWVudCB7T2JqZWN0fSBkYXRhIC0gVGhlIGRhdGEgb2JqZWN0IGdlbmVyYXRlZCBieSBgdXBkYXRlYCBtZXRob2RcbiAqIEBhcmd1bWVudCB7Qm9vbGVhbn0gc2hvdWxkUm91bmQgLSBJZiB0aGUgb2Zmc2V0cyBzaG91bGQgYmUgcm91bmRlZCBhdCBhbGxcbiAqIEByZXR1cm5zIHtPYmplY3R9IFRoZSBwb3BwZXIncyBwb3NpdGlvbiBvZmZzZXRzIHJvdW5kZWRcbiAqXG4gKiBUaGUgdGFsZSBvZiBwaXhlbC1wZXJmZWN0IHBvc2l0aW9uaW5nLiBJdCdzIHN0aWxsIG5vdCAxMDAlIHBlcmZlY3QsIGJ1dCBhc1xuICogZ29vZCBhcyBpdCBjYW4gYmUgd2l0aGluIHJlYXNvbi5cbiAqIERpc2N1c3Npb24gaGVyZTogaHR0cHM6Ly9naXRodWIuY29tL0ZlelZyYXN0YS9wb3BwZXIuanMvcHVsbC83MTVcbiAqXG4gKiBMb3cgRFBJIHNjcmVlbnMgY2F1c2UgYSBwb3BwZXIgdG8gYmUgYmx1cnJ5IGlmIG5vdCB1c2luZyBmdWxsIHBpeGVscyAoU2FmYXJpXG4gKiBhcyB3ZWxsIG9uIEhpZ2ggRFBJIHNjcmVlbnMpLlxuICpcbiAqIEZpcmVmb3ggcHJlZmVycyBubyByb3VuZGluZyBmb3IgcG9zaXRpb25pbmcgYW5kIGRvZXMgbm90IGhhdmUgYmx1cnJpbmVzcyBvblxuICogaGlnaCBEUEkgc2NyZWVucy5cbiAqXG4gKiBPbmx5IGhvcml6b250YWwgcGxhY2VtZW50IGFuZCBsZWZ0L3JpZ2h0IHZhbHVlcyBuZWVkIHRvIGJlIGNvbnNpZGVyZWQuXG4gKi9cbmZ1bmN0aW9uIGdldFJvdW5kZWRPZmZzZXRzKGRhdGEsIHNob3VsZFJvdW5kKSB7XG4gIHZhciBfZGF0YSRvZmZzZXRzID0gZGF0YS5vZmZzZXRzLFxuICAgICAgcG9wcGVyID0gX2RhdGEkb2Zmc2V0cy5wb3BwZXIsXG4gICAgICByZWZlcmVuY2UgPSBfZGF0YSRvZmZzZXRzLnJlZmVyZW5jZTtcbiAgdmFyIHJvdW5kID0gTWF0aC5yb3VuZCxcbiAgICAgIGZsb29yID0gTWF0aC5mbG9vcjtcblxuICB2YXIgbm9Sb3VuZCA9IGZ1bmN0aW9uIG5vUm91bmQodikge1xuICAgIHJldHVybiB2O1xuICB9O1xuXG4gIHZhciByZWZlcmVuY2VXaWR0aCA9IHJvdW5kKHJlZmVyZW5jZS53aWR0aCk7XG4gIHZhciBwb3BwZXJXaWR0aCA9IHJvdW5kKHBvcHBlci53aWR0aCk7XG5cbiAgdmFyIGlzVmVydGljYWwgPSBbJ2xlZnQnLCAncmlnaHQnXS5pbmRleE9mKGRhdGEucGxhY2VtZW50KSAhPT0gLTE7XG4gIHZhciBpc1ZhcmlhdGlvbiA9IGRhdGEucGxhY2VtZW50LmluZGV4T2YoJy0nKSAhPT0gLTE7XG4gIHZhciBzYW1lV2lkdGhQYXJpdHkgPSByZWZlcmVuY2VXaWR0aCAlIDIgPT09IHBvcHBlcldpZHRoICUgMjtcbiAgdmFyIGJvdGhPZGRXaWR0aCA9IHJlZmVyZW5jZVdpZHRoICUgMiA9PT0gMSAmJiBwb3BwZXJXaWR0aCAlIDIgPT09IDE7XG5cbiAgdmFyIGhvcml6b250YWxUb0ludGVnZXIgPSAhc2hvdWxkUm91bmQgPyBub1JvdW5kIDogaXNWZXJ0aWNhbCB8fCBpc1ZhcmlhdGlvbiB8fCBzYW1lV2lkdGhQYXJpdHkgPyByb3VuZCA6IGZsb29yO1xuICB2YXIgdmVydGljYWxUb0ludGVnZXIgPSAhc2hvdWxkUm91bmQgPyBub1JvdW5kIDogcm91bmQ7XG5cbiAgcmV0dXJuIHtcbiAgICBsZWZ0OiBob3Jpem9udGFsVG9JbnRlZ2VyKGJvdGhPZGRXaWR0aCAmJiAhaXNWYXJpYXRpb24gJiYgc2hvdWxkUm91bmQgPyBwb3BwZXIubGVmdCAtIDEgOiBwb3BwZXIubGVmdCksXG4gICAgdG9wOiB2ZXJ0aWNhbFRvSW50ZWdlcihwb3BwZXIudG9wKSxcbiAgICBib3R0b206IHZlcnRpY2FsVG9JbnRlZ2VyKHBvcHBlci5ib3R0b20pLFxuICAgIHJpZ2h0OiBob3Jpem9udGFsVG9JbnRlZ2VyKHBvcHBlci5yaWdodClcbiAgfTtcbn1cblxudmFyIGlzRmlyZWZveCA9IGlzQnJvd3NlciAmJiAvRmlyZWZveC9pLnRlc3QobmF2aWdhdG9yLnVzZXJBZ2VudCk7XG5cbi8qKlxuICogQGZ1bmN0aW9uXG4gKiBAbWVtYmVyb2YgTW9kaWZpZXJzXG4gKiBAYXJndW1lbnQge09iamVjdH0gZGF0YSAtIFRoZSBkYXRhIG9iamVjdCBnZW5lcmF0ZWQgYnkgYHVwZGF0ZWAgbWV0aG9kXG4gKiBAYXJndW1lbnQge09iamVjdH0gb3B0aW9ucyAtIE1vZGlmaWVycyBjb25maWd1cmF0aW9uIGFuZCBvcHRpb25zXG4gKiBAcmV0dXJucyB7T2JqZWN0fSBUaGUgZGF0YSBvYmplY3QsIHByb3Blcmx5IG1vZGlmaWVkXG4gKi9cbmZ1bmN0aW9uIGNvbXB1dGVTdHlsZShkYXRhLCBvcHRpb25zKSB7XG4gIHZhciB4ID0gb3B0aW9ucy54LFxuICAgICAgeSA9IG9wdGlvbnMueTtcbiAgdmFyIHBvcHBlciA9IGRhdGEub2Zmc2V0cy5wb3BwZXI7XG5cbiAgLy8gUmVtb3ZlIHRoaXMgbGVnYWN5IHN1cHBvcnQgaW4gUG9wcGVyLmpzIHYyXG5cbiAgdmFyIGxlZ2FjeUdwdUFjY2VsZXJhdGlvbk9wdGlvbiA9IGZpbmQoZGF0YS5pbnN0YW5jZS5tb2RpZmllcnMsIGZ1bmN0aW9uIChtb2RpZmllcikge1xuICAgIHJldHVybiBtb2RpZmllci5uYW1lID09PSAnYXBwbHlTdHlsZSc7XG4gIH0pLmdwdUFjY2VsZXJhdGlvbjtcbiAgaWYgKGxlZ2FjeUdwdUFjY2VsZXJhdGlvbk9wdGlvbiAhPT0gdW5kZWZpbmVkKSB7XG4gICAgY29uc29sZS53YXJuKCdXQVJOSU5HOiBgZ3B1QWNjZWxlcmF0aW9uYCBvcHRpb24gbW92ZWQgdG8gYGNvbXB1dGVTdHlsZWAgbW9kaWZpZXIgYW5kIHdpbGwgbm90IGJlIHN1cHBvcnRlZCBpbiBmdXR1cmUgdmVyc2lvbnMgb2YgUG9wcGVyLmpzIScpO1xuICB9XG4gIHZhciBncHVBY2NlbGVyYXRpb24gPSBsZWdhY3lHcHVBY2NlbGVyYXRpb25PcHRpb24gIT09IHVuZGVmaW5lZCA/IGxlZ2FjeUdwdUFjY2VsZXJhdGlvbk9wdGlvbiA6IG9wdGlvbnMuZ3B1QWNjZWxlcmF0aW9uO1xuXG4gIHZhciBvZmZzZXRQYXJlbnQgPSBnZXRPZmZzZXRQYXJlbnQoZGF0YS5pbnN0YW5jZS5wb3BwZXIpO1xuICB2YXIgb2Zmc2V0UGFyZW50UmVjdCA9IGdldEJvdW5kaW5nQ2xpZW50UmVjdChvZmZzZXRQYXJlbnQpO1xuXG4gIC8vIFN0eWxlc1xuICB2YXIgc3R5bGVzID0ge1xuICAgIHBvc2l0aW9uOiBwb3BwZXIucG9zaXRpb25cbiAgfTtcblxuICB2YXIgb2Zmc2V0cyA9IGdldFJvdW5kZWRPZmZzZXRzKGRhdGEsIHdpbmRvdy5kZXZpY2VQaXhlbFJhdGlvIDwgMiB8fCAhaXNGaXJlZm94KTtcblxuICB2YXIgc2lkZUEgPSB4ID09PSAnYm90dG9tJyA/ICd0b3AnIDogJ2JvdHRvbSc7XG4gIHZhciBzaWRlQiA9IHkgPT09ICdyaWdodCcgPyAnbGVmdCcgOiAncmlnaHQnO1xuXG4gIC8vIGlmIGdwdUFjY2VsZXJhdGlvbiBpcyBzZXQgdG8gYHRydWVgIGFuZCB0cmFuc2Zvcm0gaXMgc3VwcG9ydGVkLFxuICAvLyAgd2UgdXNlIGB0cmFuc2xhdGUzZGAgdG8gYXBwbHkgdGhlIHBvc2l0aW9uIHRvIHRoZSBwb3BwZXIgd2VcbiAgLy8gYXV0b21hdGljYWxseSB1c2UgdGhlIHN1cHBvcnRlZCBwcmVmaXhlZCB2ZXJzaW9uIGlmIG5lZWRlZFxuICB2YXIgcHJlZml4ZWRQcm9wZXJ0eSA9IGdldFN1cHBvcnRlZFByb3BlcnR5TmFtZSgndHJhbnNmb3JtJyk7XG5cbiAgLy8gbm93LCBsZXQncyBtYWtlIGEgc3RlcCBiYWNrIGFuZCBsb29rIGF0IHRoaXMgY29kZSBjbG9zZWx5ICh3dGY/KVxuICAvLyBJZiB0aGUgY29udGVudCBvZiB0aGUgcG9wcGVyIGdyb3dzIG9uY2UgaXQncyBiZWVuIHBvc2l0aW9uZWQsIGl0XG4gIC8vIG1heSBoYXBwZW4gdGhhdCB0aGUgcG9wcGVyIGdldHMgbWlzcGxhY2VkIGJlY2F1c2Ugb2YgdGhlIG5ldyBjb250ZW50XG4gIC8vIG92ZXJmbG93aW5nIGl0cyByZWZlcmVuY2UgZWxlbWVudFxuICAvLyBUbyBhdm9pZCB0aGlzIHByb2JsZW0sIHdlIHByb3ZpZGUgdHdvIG9wdGlvbnMgKHggYW5kIHkpLCB3aGljaCBhbGxvd1xuICAvLyB0aGUgY29uc3VtZXIgdG8gZGVmaW5lIHRoZSBvZmZzZXQgb3JpZ2luLlxuICAvLyBJZiB3ZSBwb3NpdGlvbiBhIHBvcHBlciBvbiB0b3Agb2YgYSByZWZlcmVuY2UgZWxlbWVudCwgd2UgY2FuIHNldFxuICAvLyBgeGAgdG8gYHRvcGAgdG8gbWFrZSB0aGUgcG9wcGVyIGdyb3cgdG93YXJkcyBpdHMgdG9wIGluc3RlYWQgb2ZcbiAgLy8gaXRzIGJvdHRvbS5cbiAgdmFyIGxlZnQgPSB2b2lkIDAsXG4gICAgICB0b3AgPSB2b2lkIDA7XG4gIGlmIChzaWRlQSA9PT0gJ2JvdHRvbScpIHtcbiAgICAvLyB3aGVuIG9mZnNldFBhcmVudCBpcyA8aHRtbD4gdGhlIHBvc2l0aW9uaW5nIGlzIHJlbGF0aXZlIHRvIHRoZSBib3R0b20gb2YgdGhlIHNjcmVlbiAoZXhjbHVkaW5nIHRoZSBzY3JvbGxiYXIpXG4gICAgLy8gYW5kIG5vdCB0aGUgYm90dG9tIG9mIHRoZSBodG1sIGVsZW1lbnRcbiAgICBpZiAob2Zmc2V0UGFyZW50Lm5vZGVOYW1lID09PSAnSFRNTCcpIHtcbiAgICAgIHRvcCA9IC1vZmZzZXRQYXJlbnQuY2xpZW50SGVpZ2h0ICsgb2Zmc2V0cy5ib3R0b207XG4gICAgfSBlbHNlIHtcbiAgICAgIHRvcCA9IC1vZmZzZXRQYXJlbnRSZWN0LmhlaWdodCArIG9mZnNldHMuYm90dG9tO1xuICAgIH1cbiAgfSBlbHNlIHtcbiAgICB0b3AgPSBvZmZzZXRzLnRvcDtcbiAgfVxuICBpZiAoc2lkZUIgPT09ICdyaWdodCcpIHtcbiAgICBpZiAob2Zmc2V0UGFyZW50Lm5vZGVOYW1lID09PSAnSFRNTCcpIHtcbiAgICAgIGxlZnQgPSAtb2Zmc2V0UGFyZW50LmNsaWVudFdpZHRoICsgb2Zmc2V0cy5yaWdodDtcbiAgICB9IGVsc2Uge1xuICAgICAgbGVmdCA9IC1vZmZzZXRQYXJlbnRSZWN0LndpZHRoICsgb2Zmc2V0cy5yaWdodDtcbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgbGVmdCA9IG9mZnNldHMubGVmdDtcbiAgfVxuICBpZiAoZ3B1QWNjZWxlcmF0aW9uICYmIHByZWZpeGVkUHJvcGVydHkpIHtcbiAgICBzdHlsZXNbcHJlZml4ZWRQcm9wZXJ0eV0gPSAndHJhbnNsYXRlM2QoJyArIGxlZnQgKyAncHgsICcgKyB0b3AgKyAncHgsIDApJztcbiAgICBzdHlsZXNbc2lkZUFdID0gMDtcbiAgICBzdHlsZXNbc2lkZUJdID0gMDtcbiAgICBzdHlsZXMud2lsbENoYW5nZSA9ICd0cmFuc2Zvcm0nO1xuICB9IGVsc2Uge1xuICAgIC8vIG90aHdlcmlzZSwgd2UgdXNlIHRoZSBzdGFuZGFyZCBgdG9wYCwgYGxlZnRgLCBgYm90dG9tYCBhbmQgYHJpZ2h0YCBwcm9wZXJ0aWVzXG4gICAgdmFyIGludmVydFRvcCA9IHNpZGVBID09PSAnYm90dG9tJyA/IC0xIDogMTtcbiAgICB2YXIgaW52ZXJ0TGVmdCA9IHNpZGVCID09PSAncmlnaHQnID8gLTEgOiAxO1xuICAgIHN0eWxlc1tzaWRlQV0gPSB0b3AgKiBpbnZlcnRUb3A7XG4gICAgc3R5bGVzW3NpZGVCXSA9IGxlZnQgKiBpbnZlcnRMZWZ0O1xuICAgIHN0eWxlcy53aWxsQ2hhbmdlID0gc2lkZUEgKyAnLCAnICsgc2lkZUI7XG4gIH1cblxuICAvLyBBdHRyaWJ1dGVzXG4gIHZhciBhdHRyaWJ1dGVzID0ge1xuICAgICd4LXBsYWNlbWVudCc6IGRhdGEucGxhY2VtZW50XG4gIH07XG5cbiAgLy8gVXBkYXRlIGBkYXRhYCBhdHRyaWJ1dGVzLCBzdHlsZXMgYW5kIGFycm93U3R5bGVzXG4gIGRhdGEuYXR0cmlidXRlcyA9IF9leHRlbmRzKHt9LCBhdHRyaWJ1dGVzLCBkYXRhLmF0dHJpYnV0ZXMpO1xuICBkYXRhLnN0eWxlcyA9IF9leHRlbmRzKHt9LCBzdHlsZXMsIGRhdGEuc3R5bGVzKTtcbiAgZGF0YS5hcnJvd1N0eWxlcyA9IF9leHRlbmRzKHt9LCBkYXRhLm9mZnNldHMuYXJyb3csIGRhdGEuYXJyb3dTdHlsZXMpO1xuXG4gIHJldHVybiBkYXRhO1xufVxuXG4vKipcbiAqIEhlbHBlciB1c2VkIHRvIGtub3cgaWYgdGhlIGdpdmVuIG1vZGlmaWVyIGRlcGVuZHMgZnJvbSBhbm90aGVyIG9uZS48YnIgLz5cbiAqIEl0IGNoZWNrcyBpZiB0aGUgbmVlZGVkIG1vZGlmaWVyIGlzIGxpc3RlZCBhbmQgZW5hYmxlZC5cbiAqIEBtZXRob2RcbiAqIEBtZW1iZXJvZiBQb3BwZXIuVXRpbHNcbiAqIEBwYXJhbSB7QXJyYXl9IG1vZGlmaWVycyAtIGxpc3Qgb2YgbW9kaWZpZXJzXG4gKiBAcGFyYW0ge1N0cmluZ30gcmVxdWVzdGluZ05hbWUgLSBuYW1lIG9mIHJlcXVlc3RpbmcgbW9kaWZpZXJcbiAqIEBwYXJhbSB7U3RyaW5nfSByZXF1ZXN0ZWROYW1lIC0gbmFtZSBvZiByZXF1ZXN0ZWQgbW9kaWZpZXJcbiAqIEByZXR1cm5zIHtCb29sZWFufVxuICovXG5mdW5jdGlvbiBpc01vZGlmaWVyUmVxdWlyZWQobW9kaWZpZXJzLCByZXF1ZXN0aW5nTmFtZSwgcmVxdWVzdGVkTmFtZSkge1xuICB2YXIgcmVxdWVzdGluZyA9IGZpbmQobW9kaWZpZXJzLCBmdW5jdGlvbiAoX3JlZikge1xuICAgIHZhciBuYW1lID0gX3JlZi5uYW1lO1xuICAgIHJldHVybiBuYW1lID09PSByZXF1ZXN0aW5nTmFtZTtcbiAgfSk7XG5cbiAgdmFyIGlzUmVxdWlyZWQgPSAhIXJlcXVlc3RpbmcgJiYgbW9kaWZpZXJzLnNvbWUoZnVuY3Rpb24gKG1vZGlmaWVyKSB7XG4gICAgcmV0dXJuIG1vZGlmaWVyLm5hbWUgPT09IHJlcXVlc3RlZE5hbWUgJiYgbW9kaWZpZXIuZW5hYmxlZCAmJiBtb2RpZmllci5vcmRlciA8IHJlcXVlc3Rpbmcub3JkZXI7XG4gIH0pO1xuXG4gIGlmICghaXNSZXF1aXJlZCkge1xuICAgIHZhciBfcmVxdWVzdGluZyA9ICdgJyArIHJlcXVlc3RpbmdOYW1lICsgJ2AnO1xuICAgIHZhciByZXF1ZXN0ZWQgPSAnYCcgKyByZXF1ZXN0ZWROYW1lICsgJ2AnO1xuICAgIGNvbnNvbGUud2FybihyZXF1ZXN0ZWQgKyAnIG1vZGlmaWVyIGlzIHJlcXVpcmVkIGJ5ICcgKyBfcmVxdWVzdGluZyArICcgbW9kaWZpZXIgaW4gb3JkZXIgdG8gd29yaywgYmUgc3VyZSB0byBpbmNsdWRlIGl0IGJlZm9yZSAnICsgX3JlcXVlc3RpbmcgKyAnIScpO1xuICB9XG4gIHJldHVybiBpc1JlcXVpcmVkO1xufVxuXG4vKipcbiAqIEBmdW5jdGlvblxuICogQG1lbWJlcm9mIE1vZGlmaWVyc1xuICogQGFyZ3VtZW50IHtPYmplY3R9IGRhdGEgLSBUaGUgZGF0YSBvYmplY3QgZ2VuZXJhdGVkIGJ5IHVwZGF0ZSBtZXRob2RcbiAqIEBhcmd1bWVudCB7T2JqZWN0fSBvcHRpb25zIC0gTW9kaWZpZXJzIGNvbmZpZ3VyYXRpb24gYW5kIG9wdGlvbnNcbiAqIEByZXR1cm5zIHtPYmplY3R9IFRoZSBkYXRhIG9iamVjdCwgcHJvcGVybHkgbW9kaWZpZWRcbiAqL1xuZnVuY3Rpb24gYXJyb3coZGF0YSwgb3B0aW9ucykge1xuICB2YXIgX2RhdGEkb2Zmc2V0cyRhcnJvdztcblxuICAvLyBhcnJvdyBkZXBlbmRzIG9uIGtlZXBUb2dldGhlciBpbiBvcmRlciB0byB3b3JrXG4gIGlmICghaXNNb2RpZmllclJlcXVpcmVkKGRhdGEuaW5zdGFuY2UubW9kaWZpZXJzLCAnYXJyb3cnLCAna2VlcFRvZ2V0aGVyJykpIHtcbiAgICByZXR1cm4gZGF0YTtcbiAgfVxuXG4gIHZhciBhcnJvd0VsZW1lbnQgPSBvcHRpb25zLmVsZW1lbnQ7XG5cbiAgLy8gaWYgYXJyb3dFbGVtZW50IGlzIGEgc3RyaW5nLCBzdXBwb3NlIGl0J3MgYSBDU1Mgc2VsZWN0b3JcbiAgaWYgKHR5cGVvZiBhcnJvd0VsZW1lbnQgPT09ICdzdHJpbmcnKSB7XG4gICAgYXJyb3dFbGVtZW50ID0gZGF0YS5pbnN0YW5jZS5wb3BwZXIucXVlcnlTZWxlY3RvcihhcnJvd0VsZW1lbnQpO1xuXG4gICAgLy8gaWYgYXJyb3dFbGVtZW50IGlzIG5vdCBmb3VuZCwgZG9uJ3QgcnVuIHRoZSBtb2RpZmllclxuICAgIGlmICghYXJyb3dFbGVtZW50KSB7XG4gICAgICByZXR1cm4gZGF0YTtcbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgLy8gaWYgdGhlIGFycm93RWxlbWVudCBpc24ndCBhIHF1ZXJ5IHNlbGVjdG9yIHdlIG11c3QgY2hlY2sgdGhhdCB0aGVcbiAgICAvLyBwcm92aWRlZCBET00gbm9kZSBpcyBjaGlsZCBvZiBpdHMgcG9wcGVyIG5vZGVcbiAgICBpZiAoIWRhdGEuaW5zdGFuY2UucG9wcGVyLmNvbnRhaW5zKGFycm93RWxlbWVudCkpIHtcbiAgICAgIGNvbnNvbGUud2FybignV0FSTklORzogYGFycm93LmVsZW1lbnRgIG11c3QgYmUgY2hpbGQgb2YgaXRzIHBvcHBlciBlbGVtZW50IScpO1xuICAgICAgcmV0dXJuIGRhdGE7XG4gICAgfVxuICB9XG5cbiAgdmFyIHBsYWNlbWVudCA9IGRhdGEucGxhY2VtZW50LnNwbGl0KCctJylbMF07XG4gIHZhciBfZGF0YSRvZmZzZXRzID0gZGF0YS5vZmZzZXRzLFxuICAgICAgcG9wcGVyID0gX2RhdGEkb2Zmc2V0cy5wb3BwZXIsXG4gICAgICByZWZlcmVuY2UgPSBfZGF0YSRvZmZzZXRzLnJlZmVyZW5jZTtcblxuICB2YXIgaXNWZXJ0aWNhbCA9IFsnbGVmdCcsICdyaWdodCddLmluZGV4T2YocGxhY2VtZW50KSAhPT0gLTE7XG5cbiAgdmFyIGxlbiA9IGlzVmVydGljYWwgPyAnaGVpZ2h0JyA6ICd3aWR0aCc7XG4gIHZhciBzaWRlQ2FwaXRhbGl6ZWQgPSBpc1ZlcnRpY2FsID8gJ1RvcCcgOiAnTGVmdCc7XG4gIHZhciBzaWRlID0gc2lkZUNhcGl0YWxpemVkLnRvTG93ZXJDYXNlKCk7XG4gIHZhciBhbHRTaWRlID0gaXNWZXJ0aWNhbCA/ICdsZWZ0JyA6ICd0b3AnO1xuICB2YXIgb3BTaWRlID0gaXNWZXJ0aWNhbCA/ICdib3R0b20nIDogJ3JpZ2h0JztcbiAgdmFyIGFycm93RWxlbWVudFNpemUgPSBnZXRPdXRlclNpemVzKGFycm93RWxlbWVudClbbGVuXTtcblxuICAvL1xuICAvLyBleHRlbmRzIGtlZXBUb2dldGhlciBiZWhhdmlvciBtYWtpbmcgc3VyZSB0aGUgcG9wcGVyIGFuZCBpdHNcbiAgLy8gcmVmZXJlbmNlIGhhdmUgZW5vdWdoIHBpeGVscyBpbiBjb25qdW5jdGlvblxuICAvL1xuXG4gIC8vIHRvcC9sZWZ0IHNpZGVcbiAgaWYgKHJlZmVyZW5jZVtvcFNpZGVdIC0gYXJyb3dFbGVtZW50U2l6ZSA8IHBvcHBlcltzaWRlXSkge1xuICAgIGRhdGEub2Zmc2V0cy5wb3BwZXJbc2lkZV0gLT0gcG9wcGVyW3NpZGVdIC0gKHJlZmVyZW5jZVtvcFNpZGVdIC0gYXJyb3dFbGVtZW50U2l6ZSk7XG4gIH1cbiAgLy8gYm90dG9tL3JpZ2h0IHNpZGVcbiAgaWYgKHJlZmVyZW5jZVtzaWRlXSArIGFycm93RWxlbWVudFNpemUgPiBwb3BwZXJbb3BTaWRlXSkge1xuICAgIGRhdGEub2Zmc2V0cy5wb3BwZXJbc2lkZV0gKz0gcmVmZXJlbmNlW3NpZGVdICsgYXJyb3dFbGVtZW50U2l6ZSAtIHBvcHBlcltvcFNpZGVdO1xuICB9XG4gIGRhdGEub2Zmc2V0cy5wb3BwZXIgPSBnZXRDbGllbnRSZWN0KGRhdGEub2Zmc2V0cy5wb3BwZXIpO1xuXG4gIC8vIGNvbXB1dGUgY2VudGVyIG9mIHRoZSBwb3BwZXJcbiAgdmFyIGNlbnRlciA9IHJlZmVyZW5jZVtzaWRlXSArIHJlZmVyZW5jZVtsZW5dIC8gMiAtIGFycm93RWxlbWVudFNpemUgLyAyO1xuXG4gIC8vIENvbXB1dGUgdGhlIHNpZGVWYWx1ZSB1c2luZyB0aGUgdXBkYXRlZCBwb3BwZXIgb2Zmc2V0c1xuICAvLyB0YWtlIHBvcHBlciBtYXJnaW4gaW4gYWNjb3VudCBiZWNhdXNlIHdlIGRvbid0IGhhdmUgdGhpcyBpbmZvIGF2YWlsYWJsZVxuICB2YXIgY3NzID0gZ2V0U3R5bGVDb21wdXRlZFByb3BlcnR5KGRhdGEuaW5zdGFuY2UucG9wcGVyKTtcbiAgdmFyIHBvcHBlck1hcmdpblNpZGUgPSBwYXJzZUZsb2F0KGNzc1snbWFyZ2luJyArIHNpZGVDYXBpdGFsaXplZF0sIDEwKTtcbiAgdmFyIHBvcHBlckJvcmRlclNpZGUgPSBwYXJzZUZsb2F0KGNzc1snYm9yZGVyJyArIHNpZGVDYXBpdGFsaXplZCArICdXaWR0aCddLCAxMCk7XG4gIHZhciBzaWRlVmFsdWUgPSBjZW50ZXIgLSBkYXRhLm9mZnNldHMucG9wcGVyW3NpZGVdIC0gcG9wcGVyTWFyZ2luU2lkZSAtIHBvcHBlckJvcmRlclNpZGU7XG5cbiAgLy8gcHJldmVudCBhcnJvd0VsZW1lbnQgZnJvbSBiZWluZyBwbGFjZWQgbm90IGNvbnRpZ3VvdXNseSB0byBpdHMgcG9wcGVyXG4gIHNpZGVWYWx1ZSA9IE1hdGgubWF4KE1hdGgubWluKHBvcHBlcltsZW5dIC0gYXJyb3dFbGVtZW50U2l6ZSwgc2lkZVZhbHVlKSwgMCk7XG5cbiAgZGF0YS5hcnJvd0VsZW1lbnQgPSBhcnJvd0VsZW1lbnQ7XG4gIGRhdGEub2Zmc2V0cy5hcnJvdyA9IChfZGF0YSRvZmZzZXRzJGFycm93ID0ge30sIGRlZmluZVByb3BlcnR5KF9kYXRhJG9mZnNldHMkYXJyb3csIHNpZGUsIE1hdGgucm91bmQoc2lkZVZhbHVlKSksIGRlZmluZVByb3BlcnR5KF9kYXRhJG9mZnNldHMkYXJyb3csIGFsdFNpZGUsICcnKSwgX2RhdGEkb2Zmc2V0cyRhcnJvdyk7XG5cbiAgcmV0dXJuIGRhdGE7XG59XG5cbi8qKlxuICogR2V0IHRoZSBvcHBvc2l0ZSBwbGFjZW1lbnQgdmFyaWF0aW9uIG9mIHRoZSBnaXZlbiBvbmVcbiAqIEBtZXRob2RcbiAqIEBtZW1iZXJvZiBQb3BwZXIuVXRpbHNcbiAqIEBhcmd1bWVudCB7U3RyaW5nfSBwbGFjZW1lbnQgdmFyaWF0aW9uXG4gKiBAcmV0dXJucyB7U3RyaW5nfSBmbGlwcGVkIHBsYWNlbWVudCB2YXJpYXRpb25cbiAqL1xuZnVuY3Rpb24gZ2V0T3Bwb3NpdGVWYXJpYXRpb24odmFyaWF0aW9uKSB7XG4gIGlmICh2YXJpYXRpb24gPT09ICdlbmQnKSB7XG4gICAgcmV0dXJuICdzdGFydCc7XG4gIH0gZWxzZSBpZiAodmFyaWF0aW9uID09PSAnc3RhcnQnKSB7XG4gICAgcmV0dXJuICdlbmQnO1xuICB9XG4gIHJldHVybiB2YXJpYXRpb247XG59XG5cbi8qKlxuICogTGlzdCBvZiBhY2NlcHRlZCBwbGFjZW1lbnRzIHRvIHVzZSBhcyB2YWx1ZXMgb2YgdGhlIGBwbGFjZW1lbnRgIG9wdGlvbi48YnIgLz5cbiAqIFZhbGlkIHBsYWNlbWVudHMgYXJlOlxuICogLSBgYXV0b2BcbiAqIC0gYHRvcGBcbiAqIC0gYHJpZ2h0YFxuICogLSBgYm90dG9tYFxuICogLSBgbGVmdGBcbiAqXG4gKiBFYWNoIHBsYWNlbWVudCBjYW4gaGF2ZSBhIHZhcmlhdGlvbiBmcm9tIHRoaXMgbGlzdDpcbiAqIC0gYC1zdGFydGBcbiAqIC0gYC1lbmRgXG4gKlxuICogVmFyaWF0aW9ucyBhcmUgaW50ZXJwcmV0ZWQgZWFzaWx5IGlmIHlvdSB0aGluayBvZiB0aGVtIGFzIHRoZSBsZWZ0IHRvIHJpZ2h0XG4gKiB3cml0dGVuIGxhbmd1YWdlcy4gSG9yaXpvbnRhbGx5IChgdG9wYCBhbmQgYGJvdHRvbWApLCBgc3RhcnRgIGlzIGxlZnQgYW5kIGBlbmRgXG4gKiBpcyByaWdodC48YnIgLz5cbiAqIFZlcnRpY2FsbHkgKGBsZWZ0YCBhbmQgYHJpZ2h0YCksIGBzdGFydGAgaXMgdG9wIGFuZCBgZW5kYCBpcyBib3R0b20uXG4gKlxuICogU29tZSB2YWxpZCBleGFtcGxlcyBhcmU6XG4gKiAtIGB0b3AtZW5kYCAob24gdG9wIG9mIHJlZmVyZW5jZSwgcmlnaHQgYWxpZ25lZClcbiAqIC0gYHJpZ2h0LXN0YXJ0YCAob24gcmlnaHQgb2YgcmVmZXJlbmNlLCB0b3AgYWxpZ25lZClcbiAqIC0gYGJvdHRvbWAgKG9uIGJvdHRvbSwgY2VudGVyZWQpXG4gKiAtIGBhdXRvLWVuZGAgKG9uIHRoZSBzaWRlIHdpdGggbW9yZSBzcGFjZSBhdmFpbGFibGUsIGFsaWdubWVudCBkZXBlbmRzIGJ5IHBsYWNlbWVudClcbiAqXG4gKiBAc3RhdGljXG4gKiBAdHlwZSB7QXJyYXl9XG4gKiBAZW51bSB7U3RyaW5nfVxuICogQHJlYWRvbmx5XG4gKiBAbWV0aG9kIHBsYWNlbWVudHNcbiAqIEBtZW1iZXJvZiBQb3BwZXJcbiAqL1xudmFyIHBsYWNlbWVudHMgPSBbJ2F1dG8tc3RhcnQnLCAnYXV0bycsICdhdXRvLWVuZCcsICd0b3Atc3RhcnQnLCAndG9wJywgJ3RvcC1lbmQnLCAncmlnaHQtc3RhcnQnLCAncmlnaHQnLCAncmlnaHQtZW5kJywgJ2JvdHRvbS1lbmQnLCAnYm90dG9tJywgJ2JvdHRvbS1zdGFydCcsICdsZWZ0LWVuZCcsICdsZWZ0JywgJ2xlZnQtc3RhcnQnXTtcblxuLy8gR2V0IHJpZCBvZiBgYXV0b2AgYGF1dG8tc3RhcnRgIGFuZCBgYXV0by1lbmRgXG52YXIgdmFsaWRQbGFjZW1lbnRzID0gcGxhY2VtZW50cy5zbGljZSgzKTtcblxuLyoqXG4gKiBHaXZlbiBhbiBpbml0aWFsIHBsYWNlbWVudCwgcmV0dXJucyBhbGwgdGhlIHN1YnNlcXVlbnQgcGxhY2VtZW50c1xuICogY2xvY2t3aXNlIChvciBjb3VudGVyLWNsb2Nrd2lzZSkuXG4gKlxuICogQG1ldGhvZFxuICogQG1lbWJlcm9mIFBvcHBlci5VdGlsc1xuICogQGFyZ3VtZW50IHtTdHJpbmd9IHBsYWNlbWVudCAtIEEgdmFsaWQgcGxhY2VtZW50IChpdCBhY2NlcHRzIHZhcmlhdGlvbnMpXG4gKiBAYXJndW1lbnQge0Jvb2xlYW59IGNvdW50ZXIgLSBTZXQgdG8gdHJ1ZSB0byB3YWxrIHRoZSBwbGFjZW1lbnRzIGNvdW50ZXJjbG9ja3dpc2VcbiAqIEByZXR1cm5zIHtBcnJheX0gcGxhY2VtZW50cyBpbmNsdWRpbmcgdGhlaXIgdmFyaWF0aW9uc1xuICovXG5mdW5jdGlvbiBjbG9ja3dpc2UocGxhY2VtZW50KSB7XG4gIHZhciBjb3VudGVyID0gYXJndW1lbnRzLmxlbmd0aCA+IDEgJiYgYXJndW1lbnRzWzFdICE9PSB1bmRlZmluZWQgPyBhcmd1bWVudHNbMV0gOiBmYWxzZTtcblxuICB2YXIgaW5kZXggPSB2YWxpZFBsYWNlbWVudHMuaW5kZXhPZihwbGFjZW1lbnQpO1xuICB2YXIgYXJyID0gdmFsaWRQbGFjZW1lbnRzLnNsaWNlKGluZGV4ICsgMSkuY29uY2F0KHZhbGlkUGxhY2VtZW50cy5zbGljZSgwLCBpbmRleCkpO1xuICByZXR1cm4gY291bnRlciA/IGFyci5yZXZlcnNlKCkgOiBhcnI7XG59XG5cbnZhciBCRUhBVklPUlMgPSB7XG4gIEZMSVA6ICdmbGlwJyxcbiAgQ0xPQ0tXSVNFOiAnY2xvY2t3aXNlJyxcbiAgQ09VTlRFUkNMT0NLV0lTRTogJ2NvdW50ZXJjbG9ja3dpc2UnXG59O1xuXG4vKipcbiAqIEBmdW5jdGlvblxuICogQG1lbWJlcm9mIE1vZGlmaWVyc1xuICogQGFyZ3VtZW50IHtPYmplY3R9IGRhdGEgLSBUaGUgZGF0YSBvYmplY3QgZ2VuZXJhdGVkIGJ5IHVwZGF0ZSBtZXRob2RcbiAqIEBhcmd1bWVudCB7T2JqZWN0fSBvcHRpb25zIC0gTW9kaWZpZXJzIGNvbmZpZ3VyYXRpb24gYW5kIG9wdGlvbnNcbiAqIEByZXR1cm5zIHtPYmplY3R9IFRoZSBkYXRhIG9iamVjdCwgcHJvcGVybHkgbW9kaWZpZWRcbiAqL1xuZnVuY3Rpb24gZmxpcChkYXRhLCBvcHRpb25zKSB7XG4gIC8vIGlmIGBpbm5lcmAgbW9kaWZpZXIgaXMgZW5hYmxlZCwgd2UgY2FuJ3QgdXNlIHRoZSBgZmxpcGAgbW9kaWZpZXJcbiAgaWYgKGlzTW9kaWZpZXJFbmFibGVkKGRhdGEuaW5zdGFuY2UubW9kaWZpZXJzLCAnaW5uZXInKSkge1xuICAgIHJldHVybiBkYXRhO1xuICB9XG5cbiAgaWYgKGRhdGEuZmxpcHBlZCAmJiBkYXRhLnBsYWNlbWVudCA9PT0gZGF0YS5vcmlnaW5hbFBsYWNlbWVudCkge1xuICAgIC8vIHNlZW1zIGxpa2UgZmxpcCBpcyB0cnlpbmcgdG8gbG9vcCwgcHJvYmFibHkgdGhlcmUncyBub3QgZW5vdWdoIHNwYWNlIG9uIGFueSBvZiB0aGUgZmxpcHBhYmxlIHNpZGVzXG4gICAgcmV0dXJuIGRhdGE7XG4gIH1cblxuICB2YXIgYm91bmRhcmllcyA9IGdldEJvdW5kYXJpZXMoZGF0YS5pbnN0YW5jZS5wb3BwZXIsIGRhdGEuaW5zdGFuY2UucmVmZXJlbmNlLCBvcHRpb25zLnBhZGRpbmcsIG9wdGlvbnMuYm91bmRhcmllc0VsZW1lbnQsIGRhdGEucG9zaXRpb25GaXhlZCk7XG5cbiAgdmFyIHBsYWNlbWVudCA9IGRhdGEucGxhY2VtZW50LnNwbGl0KCctJylbMF07XG4gIHZhciBwbGFjZW1lbnRPcHBvc2l0ZSA9IGdldE9wcG9zaXRlUGxhY2VtZW50KHBsYWNlbWVudCk7XG4gIHZhciB2YXJpYXRpb24gPSBkYXRhLnBsYWNlbWVudC5zcGxpdCgnLScpWzFdIHx8ICcnO1xuXG4gIHZhciBmbGlwT3JkZXIgPSBbXTtcblxuICBzd2l0Y2ggKG9wdGlvbnMuYmVoYXZpb3IpIHtcbiAgICBjYXNlIEJFSEFWSU9SUy5GTElQOlxuICAgICAgZmxpcE9yZGVyID0gW3BsYWNlbWVudCwgcGxhY2VtZW50T3Bwb3NpdGVdO1xuICAgICAgYnJlYWs7XG4gICAgY2FzZSBCRUhBVklPUlMuQ0xPQ0tXSVNFOlxuICAgICAgZmxpcE9yZGVyID0gY2xvY2t3aXNlKHBsYWNlbWVudCk7XG4gICAgICBicmVhaztcbiAgICBjYXNlIEJFSEFWSU9SUy5DT1VOVEVSQ0xPQ0tXSVNFOlxuICAgICAgZmxpcE9yZGVyID0gY2xvY2t3aXNlKHBsYWNlbWVudCwgdHJ1ZSk7XG4gICAgICBicmVhaztcbiAgICBkZWZhdWx0OlxuICAgICAgZmxpcE9yZGVyID0gb3B0aW9ucy5iZWhhdmlvcjtcbiAgfVxuXG4gIGZsaXBPcmRlci5mb3JFYWNoKGZ1bmN0aW9uIChzdGVwLCBpbmRleCkge1xuICAgIGlmIChwbGFjZW1lbnQgIT09IHN0ZXAgfHwgZmxpcE9yZGVyLmxlbmd0aCA9PT0gaW5kZXggKyAxKSB7XG4gICAgICByZXR1cm4gZGF0YTtcbiAgICB9XG5cbiAgICBwbGFjZW1lbnQgPSBkYXRhLnBsYWNlbWVudC5zcGxpdCgnLScpWzBdO1xuICAgIHBsYWNlbWVudE9wcG9zaXRlID0gZ2V0T3Bwb3NpdGVQbGFjZW1lbnQocGxhY2VtZW50KTtcblxuICAgIHZhciBwb3BwZXJPZmZzZXRzID0gZGF0YS5vZmZzZXRzLnBvcHBlcjtcbiAgICB2YXIgcmVmT2Zmc2V0cyA9IGRhdGEub2Zmc2V0cy5yZWZlcmVuY2U7XG5cbiAgICAvLyB1c2luZyBmbG9vciBiZWNhdXNlIHRoZSByZWZlcmVuY2Ugb2Zmc2V0cyBtYXkgY29udGFpbiBkZWNpbWFscyB3ZSBhcmUgbm90IGdvaW5nIHRvIGNvbnNpZGVyIGhlcmVcbiAgICB2YXIgZmxvb3IgPSBNYXRoLmZsb29yO1xuICAgIHZhciBvdmVybGFwc1JlZiA9IHBsYWNlbWVudCA9PT0gJ2xlZnQnICYmIGZsb29yKHBvcHBlck9mZnNldHMucmlnaHQpID4gZmxvb3IocmVmT2Zmc2V0cy5sZWZ0KSB8fCBwbGFjZW1lbnQgPT09ICdyaWdodCcgJiYgZmxvb3IocG9wcGVyT2Zmc2V0cy5sZWZ0KSA8IGZsb29yKHJlZk9mZnNldHMucmlnaHQpIHx8IHBsYWNlbWVudCA9PT0gJ3RvcCcgJiYgZmxvb3IocG9wcGVyT2Zmc2V0cy5ib3R0b20pID4gZmxvb3IocmVmT2Zmc2V0cy50b3ApIHx8IHBsYWNlbWVudCA9PT0gJ2JvdHRvbScgJiYgZmxvb3IocG9wcGVyT2Zmc2V0cy50b3ApIDwgZmxvb3IocmVmT2Zmc2V0cy5ib3R0b20pO1xuXG4gICAgdmFyIG92ZXJmbG93c0xlZnQgPSBmbG9vcihwb3BwZXJPZmZzZXRzLmxlZnQpIDwgZmxvb3IoYm91bmRhcmllcy5sZWZ0KTtcbiAgICB2YXIgb3ZlcmZsb3dzUmlnaHQgPSBmbG9vcihwb3BwZXJPZmZzZXRzLnJpZ2h0KSA+IGZsb29yKGJvdW5kYXJpZXMucmlnaHQpO1xuICAgIHZhciBvdmVyZmxvd3NUb3AgPSBmbG9vcihwb3BwZXJPZmZzZXRzLnRvcCkgPCBmbG9vcihib3VuZGFyaWVzLnRvcCk7XG4gICAgdmFyIG92ZXJmbG93c0JvdHRvbSA9IGZsb29yKHBvcHBlck9mZnNldHMuYm90dG9tKSA+IGZsb29yKGJvdW5kYXJpZXMuYm90dG9tKTtcblxuICAgIHZhciBvdmVyZmxvd3NCb3VuZGFyaWVzID0gcGxhY2VtZW50ID09PSAnbGVmdCcgJiYgb3ZlcmZsb3dzTGVmdCB8fCBwbGFjZW1lbnQgPT09ICdyaWdodCcgJiYgb3ZlcmZsb3dzUmlnaHQgfHwgcGxhY2VtZW50ID09PSAndG9wJyAmJiBvdmVyZmxvd3NUb3AgfHwgcGxhY2VtZW50ID09PSAnYm90dG9tJyAmJiBvdmVyZmxvd3NCb3R0b207XG5cbiAgICAvLyBmbGlwIHRoZSB2YXJpYXRpb24gaWYgcmVxdWlyZWRcbiAgICB2YXIgaXNWZXJ0aWNhbCA9IFsndG9wJywgJ2JvdHRvbSddLmluZGV4T2YocGxhY2VtZW50KSAhPT0gLTE7XG4gICAgdmFyIGZsaXBwZWRWYXJpYXRpb24gPSAhIW9wdGlvbnMuZmxpcFZhcmlhdGlvbnMgJiYgKGlzVmVydGljYWwgJiYgdmFyaWF0aW9uID09PSAnc3RhcnQnICYmIG92ZXJmbG93c0xlZnQgfHwgaXNWZXJ0aWNhbCAmJiB2YXJpYXRpb24gPT09ICdlbmQnICYmIG92ZXJmbG93c1JpZ2h0IHx8ICFpc1ZlcnRpY2FsICYmIHZhcmlhdGlvbiA9PT0gJ3N0YXJ0JyAmJiBvdmVyZmxvd3NUb3AgfHwgIWlzVmVydGljYWwgJiYgdmFyaWF0aW9uID09PSAnZW5kJyAmJiBvdmVyZmxvd3NCb3R0b20pO1xuXG4gICAgaWYgKG92ZXJsYXBzUmVmIHx8IG92ZXJmbG93c0JvdW5kYXJpZXMgfHwgZmxpcHBlZFZhcmlhdGlvbikge1xuICAgICAgLy8gdGhpcyBib29sZWFuIHRvIGRldGVjdCBhbnkgZmxpcCBsb29wXG4gICAgICBkYXRhLmZsaXBwZWQgPSB0cnVlO1xuXG4gICAgICBpZiAob3ZlcmxhcHNSZWYgfHwgb3ZlcmZsb3dzQm91bmRhcmllcykge1xuICAgICAgICBwbGFjZW1lbnQgPSBmbGlwT3JkZXJbaW5kZXggKyAxXTtcbiAgICAgIH1cblxuICAgICAgaWYgKGZsaXBwZWRWYXJpYXRpb24pIHtcbiAgICAgICAgdmFyaWF0aW9uID0gZ2V0T3Bwb3NpdGVWYXJpYXRpb24odmFyaWF0aW9uKTtcbiAgICAgIH1cblxuICAgICAgZGF0YS5wbGFjZW1lbnQgPSBwbGFjZW1lbnQgKyAodmFyaWF0aW9uID8gJy0nICsgdmFyaWF0aW9uIDogJycpO1xuXG4gICAgICAvLyB0aGlzIG9iamVjdCBjb250YWlucyBgcG9zaXRpb25gLCB3ZSB3YW50IHRvIHByZXNlcnZlIGl0IGFsb25nIHdpdGhcbiAgICAgIC8vIGFueSBhZGRpdGlvbmFsIHByb3BlcnR5IHdlIG1heSBhZGQgaW4gdGhlIGZ1dHVyZVxuICAgICAgZGF0YS5vZmZzZXRzLnBvcHBlciA9IF9leHRlbmRzKHt9LCBkYXRhLm9mZnNldHMucG9wcGVyLCBnZXRQb3BwZXJPZmZzZXRzKGRhdGEuaW5zdGFuY2UucG9wcGVyLCBkYXRhLm9mZnNldHMucmVmZXJlbmNlLCBkYXRhLnBsYWNlbWVudCkpO1xuXG4gICAgICBkYXRhID0gcnVuTW9kaWZpZXJzKGRhdGEuaW5zdGFuY2UubW9kaWZpZXJzLCBkYXRhLCAnZmxpcCcpO1xuICAgIH1cbiAgfSk7XG4gIHJldHVybiBkYXRhO1xufVxuXG4vKipcbiAqIEBmdW5jdGlvblxuICogQG1lbWJlcm9mIE1vZGlmaWVyc1xuICogQGFyZ3VtZW50IHtPYmplY3R9IGRhdGEgLSBUaGUgZGF0YSBvYmplY3QgZ2VuZXJhdGVkIGJ5IHVwZGF0ZSBtZXRob2RcbiAqIEBhcmd1bWVudCB7T2JqZWN0fSBvcHRpb25zIC0gTW9kaWZpZXJzIGNvbmZpZ3VyYXRpb24gYW5kIG9wdGlvbnNcbiAqIEByZXR1cm5zIHtPYmplY3R9IFRoZSBkYXRhIG9iamVjdCwgcHJvcGVybHkgbW9kaWZpZWRcbiAqL1xuZnVuY3Rpb24ga2VlcFRvZ2V0aGVyKGRhdGEpIHtcbiAgdmFyIF9kYXRhJG9mZnNldHMgPSBkYXRhLm9mZnNldHMsXG4gICAgICBwb3BwZXIgPSBfZGF0YSRvZmZzZXRzLnBvcHBlcixcbiAgICAgIHJlZmVyZW5jZSA9IF9kYXRhJG9mZnNldHMucmVmZXJlbmNlO1xuXG4gIHZhciBwbGFjZW1lbnQgPSBkYXRhLnBsYWNlbWVudC5zcGxpdCgnLScpWzBdO1xuICB2YXIgZmxvb3IgPSBNYXRoLmZsb29yO1xuICB2YXIgaXNWZXJ0aWNhbCA9IFsndG9wJywgJ2JvdHRvbSddLmluZGV4T2YocGxhY2VtZW50KSAhPT0gLTE7XG4gIHZhciBzaWRlID0gaXNWZXJ0aWNhbCA/ICdyaWdodCcgOiAnYm90dG9tJztcbiAgdmFyIG9wU2lkZSA9IGlzVmVydGljYWwgPyAnbGVmdCcgOiAndG9wJztcbiAgdmFyIG1lYXN1cmVtZW50ID0gaXNWZXJ0aWNhbCA/ICd3aWR0aCcgOiAnaGVpZ2h0JztcblxuICBpZiAocG9wcGVyW3NpZGVdIDwgZmxvb3IocmVmZXJlbmNlW29wU2lkZV0pKSB7XG4gICAgZGF0YS5vZmZzZXRzLnBvcHBlcltvcFNpZGVdID0gZmxvb3IocmVmZXJlbmNlW29wU2lkZV0pIC0gcG9wcGVyW21lYXN1cmVtZW50XTtcbiAgfVxuICBpZiAocG9wcGVyW29wU2lkZV0gPiBmbG9vcihyZWZlcmVuY2Vbc2lkZV0pKSB7XG4gICAgZGF0YS5vZmZzZXRzLnBvcHBlcltvcFNpZGVdID0gZmxvb3IocmVmZXJlbmNlW3NpZGVdKTtcbiAgfVxuXG4gIHJldHVybiBkYXRhO1xufVxuXG4vKipcbiAqIENvbnZlcnRzIGEgc3RyaW5nIGNvbnRhaW5pbmcgdmFsdWUgKyB1bml0IGludG8gYSBweCB2YWx1ZSBudW1iZXJcbiAqIEBmdW5jdGlvblxuICogQG1lbWJlcm9mIHttb2RpZmllcnN+b2Zmc2V0fVxuICogQHByaXZhdGVcbiAqIEBhcmd1bWVudCB7U3RyaW5nfSBzdHIgLSBWYWx1ZSArIHVuaXQgc3RyaW5nXG4gKiBAYXJndW1lbnQge1N0cmluZ30gbWVhc3VyZW1lbnQgLSBgaGVpZ2h0YCBvciBgd2lkdGhgXG4gKiBAYXJndW1lbnQge09iamVjdH0gcG9wcGVyT2Zmc2V0c1xuICogQGFyZ3VtZW50IHtPYmplY3R9IHJlZmVyZW5jZU9mZnNldHNcbiAqIEByZXR1cm5zIHtOdW1iZXJ8U3RyaW5nfVxuICogVmFsdWUgaW4gcGl4ZWxzLCBvciBvcmlnaW5hbCBzdHJpbmcgaWYgbm8gdmFsdWVzIHdlcmUgZXh0cmFjdGVkXG4gKi9cbmZ1bmN0aW9uIHRvVmFsdWUoc3RyLCBtZWFzdXJlbWVudCwgcG9wcGVyT2Zmc2V0cywgcmVmZXJlbmNlT2Zmc2V0cykge1xuICAvLyBzZXBhcmF0ZSB2YWx1ZSBmcm9tIHVuaXRcbiAgdmFyIHNwbGl0ID0gc3RyLm1hdGNoKC8oKD86XFwtfFxcKyk/XFxkKlxcLj9cXGQqKSguKikvKTtcbiAgdmFyIHZhbHVlID0gK3NwbGl0WzFdO1xuICB2YXIgdW5pdCA9IHNwbGl0WzJdO1xuXG4gIC8vIElmIGl0J3Mgbm90IGEgbnVtYmVyIGl0J3MgYW4gb3BlcmF0b3IsIEkgZ3Vlc3NcbiAgaWYgKCF2YWx1ZSkge1xuICAgIHJldHVybiBzdHI7XG4gIH1cblxuICBpZiAodW5pdC5pbmRleE9mKCclJykgPT09IDApIHtcbiAgICB2YXIgZWxlbWVudCA9IHZvaWQgMDtcbiAgICBzd2l0Y2ggKHVuaXQpIHtcbiAgICAgIGNhc2UgJyVwJzpcbiAgICAgICAgZWxlbWVudCA9IHBvcHBlck9mZnNldHM7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAnJSc6XG4gICAgICBjYXNlICclcic6XG4gICAgICBkZWZhdWx0OlxuICAgICAgICBlbGVtZW50ID0gcmVmZXJlbmNlT2Zmc2V0cztcbiAgICB9XG5cbiAgICB2YXIgcmVjdCA9IGdldENsaWVudFJlY3QoZWxlbWVudCk7XG4gICAgcmV0dXJuIHJlY3RbbWVhc3VyZW1lbnRdIC8gMTAwICogdmFsdWU7XG4gIH0gZWxzZSBpZiAodW5pdCA9PT0gJ3ZoJyB8fCB1bml0ID09PSAndncnKSB7XG4gICAgLy8gaWYgaXMgYSB2aCBvciB2dywgd2UgY2FsY3VsYXRlIHRoZSBzaXplIGJhc2VkIG9uIHRoZSB2aWV3cG9ydFxuICAgIHZhciBzaXplID0gdm9pZCAwO1xuICAgIGlmICh1bml0ID09PSAndmgnKSB7XG4gICAgICBzaXplID0gTWF0aC5tYXgoZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LmNsaWVudEhlaWdodCwgd2luZG93LmlubmVySGVpZ2h0IHx8IDApO1xuICAgIH0gZWxzZSB7XG4gICAgICBzaXplID0gTWF0aC5tYXgoZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LmNsaWVudFdpZHRoLCB3aW5kb3cuaW5uZXJXaWR0aCB8fCAwKTtcbiAgICB9XG4gICAgcmV0dXJuIHNpemUgLyAxMDAgKiB2YWx1ZTtcbiAgfSBlbHNlIHtcbiAgICAvLyBpZiBpcyBhbiBleHBsaWNpdCBwaXhlbCB1bml0LCB3ZSBnZXQgcmlkIG9mIHRoZSB1bml0IGFuZCBrZWVwIHRoZSB2YWx1ZVxuICAgIC8vIGlmIGlzIGFuIGltcGxpY2l0IHVuaXQsIGl0J3MgcHgsIGFuZCB3ZSByZXR1cm4ganVzdCB0aGUgdmFsdWVcbiAgICByZXR1cm4gdmFsdWU7XG4gIH1cbn1cblxuLyoqXG4gKiBQYXJzZSBhbiBgb2Zmc2V0YCBzdHJpbmcgdG8gZXh0cmFwb2xhdGUgYHhgIGFuZCBgeWAgbnVtZXJpYyBvZmZzZXRzLlxuICogQGZ1bmN0aW9uXG4gKiBAbWVtYmVyb2Yge21vZGlmaWVyc35vZmZzZXR9XG4gKiBAcHJpdmF0ZVxuICogQGFyZ3VtZW50IHtTdHJpbmd9IG9mZnNldFxuICogQGFyZ3VtZW50IHtPYmplY3R9IHBvcHBlck9mZnNldHNcbiAqIEBhcmd1bWVudCB7T2JqZWN0fSByZWZlcmVuY2VPZmZzZXRzXG4gKiBAYXJndW1lbnQge1N0cmluZ30gYmFzZVBsYWNlbWVudFxuICogQHJldHVybnMge0FycmF5fSBhIHR3byBjZWxscyBhcnJheSB3aXRoIHggYW5kIHkgb2Zmc2V0cyBpbiBudW1iZXJzXG4gKi9cbmZ1bmN0aW9uIHBhcnNlT2Zmc2V0KG9mZnNldCwgcG9wcGVyT2Zmc2V0cywgcmVmZXJlbmNlT2Zmc2V0cywgYmFzZVBsYWNlbWVudCkge1xuICB2YXIgb2Zmc2V0cyA9IFswLCAwXTtcblxuICAvLyBVc2UgaGVpZ2h0IGlmIHBsYWNlbWVudCBpcyBsZWZ0IG9yIHJpZ2h0IGFuZCBpbmRleCBpcyAwIG90aGVyd2lzZSB1c2Ugd2lkdGhcbiAgLy8gaW4gdGhpcyB3YXkgdGhlIGZpcnN0IG9mZnNldCB3aWxsIHVzZSBhbiBheGlzIGFuZCB0aGUgc2Vjb25kIG9uZVxuICAvLyB3aWxsIHVzZSB0aGUgb3RoZXIgb25lXG4gIHZhciB1c2VIZWlnaHQgPSBbJ3JpZ2h0JywgJ2xlZnQnXS5pbmRleE9mKGJhc2VQbGFjZW1lbnQpICE9PSAtMTtcblxuICAvLyBTcGxpdCB0aGUgb2Zmc2V0IHN0cmluZyB0byBvYnRhaW4gYSBsaXN0IG9mIHZhbHVlcyBhbmQgb3BlcmFuZHNcbiAgLy8gVGhlIHJlZ2V4IGFkZHJlc3NlcyB2YWx1ZXMgd2l0aCB0aGUgcGx1cyBvciBtaW51cyBzaWduIGluIGZyb250ICgrMTAsIC0yMCwgZXRjKVxuICB2YXIgZnJhZ21lbnRzID0gb2Zmc2V0LnNwbGl0KC8oXFwrfFxcLSkvKS5tYXAoZnVuY3Rpb24gKGZyYWcpIHtcbiAgICByZXR1cm4gZnJhZy50cmltKCk7XG4gIH0pO1xuXG4gIC8vIERldGVjdCBpZiB0aGUgb2Zmc2V0IHN0cmluZyBjb250YWlucyBhIHBhaXIgb2YgdmFsdWVzIG9yIGEgc2luZ2xlIG9uZVxuICAvLyB0aGV5IGNvdWxkIGJlIHNlcGFyYXRlZCBieSBjb21tYSBvciBzcGFjZVxuICB2YXIgZGl2aWRlciA9IGZyYWdtZW50cy5pbmRleE9mKGZpbmQoZnJhZ21lbnRzLCBmdW5jdGlvbiAoZnJhZykge1xuICAgIHJldHVybiBmcmFnLnNlYXJjaCgvLHxcXHMvKSAhPT0gLTE7XG4gIH0pKTtcblxuICBpZiAoZnJhZ21lbnRzW2RpdmlkZXJdICYmIGZyYWdtZW50c1tkaXZpZGVyXS5pbmRleE9mKCcsJykgPT09IC0xKSB7XG4gICAgY29uc29sZS53YXJuKCdPZmZzZXRzIHNlcGFyYXRlZCBieSB3aGl0ZSBzcGFjZShzKSBhcmUgZGVwcmVjYXRlZCwgdXNlIGEgY29tbWEgKCwpIGluc3RlYWQuJyk7XG4gIH1cblxuICAvLyBJZiBkaXZpZGVyIGlzIGZvdW5kLCB3ZSBkaXZpZGUgdGhlIGxpc3Qgb2YgdmFsdWVzIGFuZCBvcGVyYW5kcyB0byBkaXZpZGVcbiAgLy8gdGhlbSBieSBvZnNldCBYIGFuZCBZLlxuICB2YXIgc3BsaXRSZWdleCA9IC9cXHMqLFxccyp8XFxzKy87XG4gIHZhciBvcHMgPSBkaXZpZGVyICE9PSAtMSA/IFtmcmFnbWVudHMuc2xpY2UoMCwgZGl2aWRlcikuY29uY2F0KFtmcmFnbWVudHNbZGl2aWRlcl0uc3BsaXQoc3BsaXRSZWdleClbMF1dKSwgW2ZyYWdtZW50c1tkaXZpZGVyXS5zcGxpdChzcGxpdFJlZ2V4KVsxXV0uY29uY2F0KGZyYWdtZW50cy5zbGljZShkaXZpZGVyICsgMSkpXSA6IFtmcmFnbWVudHNdO1xuXG4gIC8vIENvbnZlcnQgdGhlIHZhbHVlcyB3aXRoIHVuaXRzIHRvIGFic29sdXRlIHBpeGVscyB0byBhbGxvdyBvdXIgY29tcHV0YXRpb25zXG4gIG9wcyA9IG9wcy5tYXAoZnVuY3Rpb24gKG9wLCBpbmRleCkge1xuICAgIC8vIE1vc3Qgb2YgdGhlIHVuaXRzIHJlbHkgb24gdGhlIG9yaWVudGF0aW9uIG9mIHRoZSBwb3BwZXJcbiAgICB2YXIgbWVhc3VyZW1lbnQgPSAoaW5kZXggPT09IDEgPyAhdXNlSGVpZ2h0IDogdXNlSGVpZ2h0KSA/ICdoZWlnaHQnIDogJ3dpZHRoJztcbiAgICB2YXIgbWVyZ2VXaXRoUHJldmlvdXMgPSBmYWxzZTtcbiAgICByZXR1cm4gb3BcbiAgICAvLyBUaGlzIGFnZ3JlZ2F0ZXMgYW55IGArYCBvciBgLWAgc2lnbiB0aGF0IGFyZW4ndCBjb25zaWRlcmVkIG9wZXJhdG9yc1xuICAgIC8vIGUuZy46IDEwICsgKzUgPT4gWzEwLCArLCArNV1cbiAgICAucmVkdWNlKGZ1bmN0aW9uIChhLCBiKSB7XG4gICAgICBpZiAoYVthLmxlbmd0aCAtIDFdID09PSAnJyAmJiBbJysnLCAnLSddLmluZGV4T2YoYikgIT09IC0xKSB7XG4gICAgICAgIGFbYS5sZW5ndGggLSAxXSA9IGI7XG4gICAgICAgIG1lcmdlV2l0aFByZXZpb3VzID0gdHJ1ZTtcbiAgICAgICAgcmV0dXJuIGE7XG4gICAgICB9IGVsc2UgaWYgKG1lcmdlV2l0aFByZXZpb3VzKSB7XG4gICAgICAgIGFbYS5sZW5ndGggLSAxXSArPSBiO1xuICAgICAgICBtZXJnZVdpdGhQcmV2aW91cyA9IGZhbHNlO1xuICAgICAgICByZXR1cm4gYTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiBhLmNvbmNhdChiKTtcbiAgICAgIH1cbiAgICB9LCBbXSlcbiAgICAvLyBIZXJlIHdlIGNvbnZlcnQgdGhlIHN0cmluZyB2YWx1ZXMgaW50byBudW1iZXIgdmFsdWVzIChpbiBweClcbiAgICAubWFwKGZ1bmN0aW9uIChzdHIpIHtcbiAgICAgIHJldHVybiB0b1ZhbHVlKHN0ciwgbWVhc3VyZW1lbnQsIHBvcHBlck9mZnNldHMsIHJlZmVyZW5jZU9mZnNldHMpO1xuICAgIH0pO1xuICB9KTtcblxuICAvLyBMb29wIHRyb3VnaCB0aGUgb2Zmc2V0cyBhcnJheXMgYW5kIGV4ZWN1dGUgdGhlIG9wZXJhdGlvbnNcbiAgb3BzLmZvckVhY2goZnVuY3Rpb24gKG9wLCBpbmRleCkge1xuICAgIG9wLmZvckVhY2goZnVuY3Rpb24gKGZyYWcsIGluZGV4Mikge1xuICAgICAgaWYgKGlzTnVtZXJpYyhmcmFnKSkge1xuICAgICAgICBvZmZzZXRzW2luZGV4XSArPSBmcmFnICogKG9wW2luZGV4MiAtIDFdID09PSAnLScgPyAtMSA6IDEpO1xuICAgICAgfVxuICAgIH0pO1xuICB9KTtcbiAgcmV0dXJuIG9mZnNldHM7XG59XG5cbi8qKlxuICogQGZ1bmN0aW9uXG4gKiBAbWVtYmVyb2YgTW9kaWZpZXJzXG4gKiBAYXJndW1lbnQge09iamVjdH0gZGF0YSAtIFRoZSBkYXRhIG9iamVjdCBnZW5lcmF0ZWQgYnkgdXBkYXRlIG1ldGhvZFxuICogQGFyZ3VtZW50IHtPYmplY3R9IG9wdGlvbnMgLSBNb2RpZmllcnMgY29uZmlndXJhdGlvbiBhbmQgb3B0aW9uc1xuICogQGFyZ3VtZW50IHtOdW1iZXJ8U3RyaW5nfSBvcHRpb25zLm9mZnNldD0wXG4gKiBUaGUgb2Zmc2V0IHZhbHVlIGFzIGRlc2NyaWJlZCBpbiB0aGUgbW9kaWZpZXIgZGVzY3JpcHRpb25cbiAqIEByZXR1cm5zIHtPYmplY3R9IFRoZSBkYXRhIG9iamVjdCwgcHJvcGVybHkgbW9kaWZpZWRcbiAqL1xuZnVuY3Rpb24gb2Zmc2V0KGRhdGEsIF9yZWYpIHtcbiAgdmFyIG9mZnNldCA9IF9yZWYub2Zmc2V0O1xuICB2YXIgcGxhY2VtZW50ID0gZGF0YS5wbGFjZW1lbnQsXG4gICAgICBfZGF0YSRvZmZzZXRzID0gZGF0YS5vZmZzZXRzLFxuICAgICAgcG9wcGVyID0gX2RhdGEkb2Zmc2V0cy5wb3BwZXIsXG4gICAgICByZWZlcmVuY2UgPSBfZGF0YSRvZmZzZXRzLnJlZmVyZW5jZTtcblxuICB2YXIgYmFzZVBsYWNlbWVudCA9IHBsYWNlbWVudC5zcGxpdCgnLScpWzBdO1xuXG4gIHZhciBvZmZzZXRzID0gdm9pZCAwO1xuICBpZiAoaXNOdW1lcmljKCtvZmZzZXQpKSB7XG4gICAgb2Zmc2V0cyA9IFsrb2Zmc2V0LCAwXTtcbiAgfSBlbHNlIHtcbiAgICBvZmZzZXRzID0gcGFyc2VPZmZzZXQob2Zmc2V0LCBwb3BwZXIsIHJlZmVyZW5jZSwgYmFzZVBsYWNlbWVudCk7XG4gIH1cblxuICBpZiAoYmFzZVBsYWNlbWVudCA9PT0gJ2xlZnQnKSB7XG4gICAgcG9wcGVyLnRvcCArPSBvZmZzZXRzWzBdO1xuICAgIHBvcHBlci5sZWZ0IC09IG9mZnNldHNbMV07XG4gIH0gZWxzZSBpZiAoYmFzZVBsYWNlbWVudCA9PT0gJ3JpZ2h0Jykge1xuICAgIHBvcHBlci50b3AgKz0gb2Zmc2V0c1swXTtcbiAgICBwb3BwZXIubGVmdCArPSBvZmZzZXRzWzFdO1xuICB9IGVsc2UgaWYgKGJhc2VQbGFjZW1lbnQgPT09ICd0b3AnKSB7XG4gICAgcG9wcGVyLmxlZnQgKz0gb2Zmc2V0c1swXTtcbiAgICBwb3BwZXIudG9wIC09IG9mZnNldHNbMV07XG4gIH0gZWxzZSBpZiAoYmFzZVBsYWNlbWVudCA9PT0gJ2JvdHRvbScpIHtcbiAgICBwb3BwZXIubGVmdCArPSBvZmZzZXRzWzBdO1xuICAgIHBvcHBlci50b3AgKz0gb2Zmc2V0c1sxXTtcbiAgfVxuXG4gIGRhdGEucG9wcGVyID0gcG9wcGVyO1xuICByZXR1cm4gZGF0YTtcbn1cblxuLyoqXG4gKiBAZnVuY3Rpb25cbiAqIEBtZW1iZXJvZiBNb2RpZmllcnNcbiAqIEBhcmd1bWVudCB7T2JqZWN0fSBkYXRhIC0gVGhlIGRhdGEgb2JqZWN0IGdlbmVyYXRlZCBieSBgdXBkYXRlYCBtZXRob2RcbiAqIEBhcmd1bWVudCB7T2JqZWN0fSBvcHRpb25zIC0gTW9kaWZpZXJzIGNvbmZpZ3VyYXRpb24gYW5kIG9wdGlvbnNcbiAqIEByZXR1cm5zIHtPYmplY3R9IFRoZSBkYXRhIG9iamVjdCwgcHJvcGVybHkgbW9kaWZpZWRcbiAqL1xuZnVuY3Rpb24gcHJldmVudE92ZXJmbG93KGRhdGEsIG9wdGlvbnMpIHtcbiAgdmFyIGJvdW5kYXJpZXNFbGVtZW50ID0gb3B0aW9ucy5ib3VuZGFyaWVzRWxlbWVudCB8fCBnZXRPZmZzZXRQYXJlbnQoZGF0YS5pbnN0YW5jZS5wb3BwZXIpO1xuXG4gIC8vIElmIG9mZnNldFBhcmVudCBpcyB0aGUgcmVmZXJlbmNlIGVsZW1lbnQsIHdlIHJlYWxseSB3YW50IHRvXG4gIC8vIGdvIG9uZSBzdGVwIHVwIGFuZCB1c2UgdGhlIG5leHQgb2Zmc2V0UGFyZW50IGFzIHJlZmVyZW5jZSB0b1xuICAvLyBhdm9pZCB0byBtYWtlIHRoaXMgbW9kaWZpZXIgY29tcGxldGVseSB1c2VsZXNzIGFuZCBsb29rIGxpa2UgYnJva2VuXG4gIGlmIChkYXRhLmluc3RhbmNlLnJlZmVyZW5jZSA9PT0gYm91bmRhcmllc0VsZW1lbnQpIHtcbiAgICBib3VuZGFyaWVzRWxlbWVudCA9IGdldE9mZnNldFBhcmVudChib3VuZGFyaWVzRWxlbWVudCk7XG4gIH1cblxuICAvLyBOT1RFOiBET00gYWNjZXNzIGhlcmVcbiAgLy8gcmVzZXRzIHRoZSBwb3BwZXIncyBwb3NpdGlvbiBzbyB0aGF0IHRoZSBkb2N1bWVudCBzaXplIGNhbiBiZSBjYWxjdWxhdGVkIGV4Y2x1ZGluZ1xuICAvLyB0aGUgc2l6ZSBvZiB0aGUgcG9wcGVyIGVsZW1lbnQgaXRzZWxmXG4gIHZhciB0cmFuc2Zvcm1Qcm9wID0gZ2V0U3VwcG9ydGVkUHJvcGVydHlOYW1lKCd0cmFuc2Zvcm0nKTtcbiAgdmFyIHBvcHBlclN0eWxlcyA9IGRhdGEuaW5zdGFuY2UucG9wcGVyLnN0eWxlOyAvLyBhc3NpZ25tZW50IHRvIGhlbHAgbWluaWZpY2F0aW9uXG4gIHZhciB0b3AgPSBwb3BwZXJTdHlsZXMudG9wLFxuICAgICAgbGVmdCA9IHBvcHBlclN0eWxlcy5sZWZ0LFxuICAgICAgdHJhbnNmb3JtID0gcG9wcGVyU3R5bGVzW3RyYW5zZm9ybVByb3BdO1xuXG4gIHBvcHBlclN0eWxlcy50b3AgPSAnJztcbiAgcG9wcGVyU3R5bGVzLmxlZnQgPSAnJztcbiAgcG9wcGVyU3R5bGVzW3RyYW5zZm9ybVByb3BdID0gJyc7XG5cbiAgdmFyIGJvdW5kYXJpZXMgPSBnZXRCb3VuZGFyaWVzKGRhdGEuaW5zdGFuY2UucG9wcGVyLCBkYXRhLmluc3RhbmNlLnJlZmVyZW5jZSwgb3B0aW9ucy5wYWRkaW5nLCBib3VuZGFyaWVzRWxlbWVudCwgZGF0YS5wb3NpdGlvbkZpeGVkKTtcblxuICAvLyBOT1RFOiBET00gYWNjZXNzIGhlcmVcbiAgLy8gcmVzdG9yZXMgdGhlIG9yaWdpbmFsIHN0eWxlIHByb3BlcnRpZXMgYWZ0ZXIgdGhlIG9mZnNldHMgaGF2ZSBiZWVuIGNvbXB1dGVkXG4gIHBvcHBlclN0eWxlcy50b3AgPSB0b3A7XG4gIHBvcHBlclN0eWxlcy5sZWZ0ID0gbGVmdDtcbiAgcG9wcGVyU3R5bGVzW3RyYW5zZm9ybVByb3BdID0gdHJhbnNmb3JtO1xuXG4gIG9wdGlvbnMuYm91bmRhcmllcyA9IGJvdW5kYXJpZXM7XG5cbiAgdmFyIG9yZGVyID0gb3B0aW9ucy5wcmlvcml0eTtcbiAgdmFyIHBvcHBlciA9IGRhdGEub2Zmc2V0cy5wb3BwZXI7XG5cbiAgdmFyIGNoZWNrID0ge1xuICAgIHByaW1hcnk6IGZ1bmN0aW9uIHByaW1hcnkocGxhY2VtZW50KSB7XG4gICAgICB2YXIgdmFsdWUgPSBwb3BwZXJbcGxhY2VtZW50XTtcbiAgICAgIGlmIChwb3BwZXJbcGxhY2VtZW50XSA8IGJvdW5kYXJpZXNbcGxhY2VtZW50XSAmJiAhb3B0aW9ucy5lc2NhcGVXaXRoUmVmZXJlbmNlKSB7XG4gICAgICAgIHZhbHVlID0gTWF0aC5tYXgocG9wcGVyW3BsYWNlbWVudF0sIGJvdW5kYXJpZXNbcGxhY2VtZW50XSk7XG4gICAgICB9XG4gICAgICByZXR1cm4gZGVmaW5lUHJvcGVydHkoe30sIHBsYWNlbWVudCwgdmFsdWUpO1xuICAgIH0sXG4gICAgc2Vjb25kYXJ5OiBmdW5jdGlvbiBzZWNvbmRhcnkocGxhY2VtZW50KSB7XG4gICAgICB2YXIgbWFpblNpZGUgPSBwbGFjZW1lbnQgPT09ICdyaWdodCcgPyAnbGVmdCcgOiAndG9wJztcbiAgICAgIHZhciB2YWx1ZSA9IHBvcHBlclttYWluU2lkZV07XG4gICAgICBpZiAocG9wcGVyW3BsYWNlbWVudF0gPiBib3VuZGFyaWVzW3BsYWNlbWVudF0gJiYgIW9wdGlvbnMuZXNjYXBlV2l0aFJlZmVyZW5jZSkge1xuICAgICAgICB2YWx1ZSA9IE1hdGgubWluKHBvcHBlclttYWluU2lkZV0sIGJvdW5kYXJpZXNbcGxhY2VtZW50XSAtIChwbGFjZW1lbnQgPT09ICdyaWdodCcgPyBwb3BwZXIud2lkdGggOiBwb3BwZXIuaGVpZ2h0KSk7XG4gICAgICB9XG4gICAgICByZXR1cm4gZGVmaW5lUHJvcGVydHkoe30sIG1haW5TaWRlLCB2YWx1ZSk7XG4gICAgfVxuICB9O1xuXG4gIG9yZGVyLmZvckVhY2goZnVuY3Rpb24gKHBsYWNlbWVudCkge1xuICAgIHZhciBzaWRlID0gWydsZWZ0JywgJ3RvcCddLmluZGV4T2YocGxhY2VtZW50KSAhPT0gLTEgPyAncHJpbWFyeScgOiAnc2Vjb25kYXJ5JztcbiAgICBwb3BwZXIgPSBfZXh0ZW5kcyh7fSwgcG9wcGVyLCBjaGVja1tzaWRlXShwbGFjZW1lbnQpKTtcbiAgfSk7XG5cbiAgZGF0YS5vZmZzZXRzLnBvcHBlciA9IHBvcHBlcjtcblxuICByZXR1cm4gZGF0YTtcbn1cblxuLyoqXG4gKiBAZnVuY3Rpb25cbiAqIEBtZW1iZXJvZiBNb2RpZmllcnNcbiAqIEBhcmd1bWVudCB7T2JqZWN0fSBkYXRhIC0gVGhlIGRhdGEgb2JqZWN0IGdlbmVyYXRlZCBieSBgdXBkYXRlYCBtZXRob2RcbiAqIEBhcmd1bWVudCB7T2JqZWN0fSBvcHRpb25zIC0gTW9kaWZpZXJzIGNvbmZpZ3VyYXRpb24gYW5kIG9wdGlvbnNcbiAqIEByZXR1cm5zIHtPYmplY3R9IFRoZSBkYXRhIG9iamVjdCwgcHJvcGVybHkgbW9kaWZpZWRcbiAqL1xuZnVuY3Rpb24gc2hpZnQoZGF0YSkge1xuICB2YXIgcGxhY2VtZW50ID0gZGF0YS5wbGFjZW1lbnQ7XG4gIHZhciBiYXNlUGxhY2VtZW50ID0gcGxhY2VtZW50LnNwbGl0KCctJylbMF07XG4gIHZhciBzaGlmdHZhcmlhdGlvbiA9IHBsYWNlbWVudC5zcGxpdCgnLScpWzFdO1xuXG4gIC8vIGlmIHNoaWZ0IHNoaWZ0dmFyaWF0aW9uIGlzIHNwZWNpZmllZCwgcnVuIHRoZSBtb2RpZmllclxuICBpZiAoc2hpZnR2YXJpYXRpb24pIHtcbiAgICB2YXIgX2RhdGEkb2Zmc2V0cyA9IGRhdGEub2Zmc2V0cyxcbiAgICAgICAgcmVmZXJlbmNlID0gX2RhdGEkb2Zmc2V0cy5yZWZlcmVuY2UsXG4gICAgICAgIHBvcHBlciA9IF9kYXRhJG9mZnNldHMucG9wcGVyO1xuXG4gICAgdmFyIGlzVmVydGljYWwgPSBbJ2JvdHRvbScsICd0b3AnXS5pbmRleE9mKGJhc2VQbGFjZW1lbnQpICE9PSAtMTtcbiAgICB2YXIgc2lkZSA9IGlzVmVydGljYWwgPyAnbGVmdCcgOiAndG9wJztcbiAgICB2YXIgbWVhc3VyZW1lbnQgPSBpc1ZlcnRpY2FsID8gJ3dpZHRoJyA6ICdoZWlnaHQnO1xuXG4gICAgdmFyIHNoaWZ0T2Zmc2V0cyA9IHtcbiAgICAgIHN0YXJ0OiBkZWZpbmVQcm9wZXJ0eSh7fSwgc2lkZSwgcmVmZXJlbmNlW3NpZGVdKSxcbiAgICAgIGVuZDogZGVmaW5lUHJvcGVydHkoe30sIHNpZGUsIHJlZmVyZW5jZVtzaWRlXSArIHJlZmVyZW5jZVttZWFzdXJlbWVudF0gLSBwb3BwZXJbbWVhc3VyZW1lbnRdKVxuICAgIH07XG5cbiAgICBkYXRhLm9mZnNldHMucG9wcGVyID0gX2V4dGVuZHMoe30sIHBvcHBlciwgc2hpZnRPZmZzZXRzW3NoaWZ0dmFyaWF0aW9uXSk7XG4gIH1cblxuICByZXR1cm4gZGF0YTtcbn1cblxuLyoqXG4gKiBAZnVuY3Rpb25cbiAqIEBtZW1iZXJvZiBNb2RpZmllcnNcbiAqIEBhcmd1bWVudCB7T2JqZWN0fSBkYXRhIC0gVGhlIGRhdGEgb2JqZWN0IGdlbmVyYXRlZCBieSB1cGRhdGUgbWV0aG9kXG4gKiBAYXJndW1lbnQge09iamVjdH0gb3B0aW9ucyAtIE1vZGlmaWVycyBjb25maWd1cmF0aW9uIGFuZCBvcHRpb25zXG4gKiBAcmV0dXJucyB7T2JqZWN0fSBUaGUgZGF0YSBvYmplY3QsIHByb3Blcmx5IG1vZGlmaWVkXG4gKi9cbmZ1bmN0aW9uIGhpZGUoZGF0YSkge1xuICBpZiAoIWlzTW9kaWZpZXJSZXF1aXJlZChkYXRhLmluc3RhbmNlLm1vZGlmaWVycywgJ2hpZGUnLCAncHJldmVudE92ZXJmbG93JykpIHtcbiAgICByZXR1cm4gZGF0YTtcbiAgfVxuXG4gIHZhciByZWZSZWN0ID0gZGF0YS5vZmZzZXRzLnJlZmVyZW5jZTtcbiAgdmFyIGJvdW5kID0gZmluZChkYXRhLmluc3RhbmNlLm1vZGlmaWVycywgZnVuY3Rpb24gKG1vZGlmaWVyKSB7XG4gICAgcmV0dXJuIG1vZGlmaWVyLm5hbWUgPT09ICdwcmV2ZW50T3ZlcmZsb3cnO1xuICB9KS5ib3VuZGFyaWVzO1xuXG4gIGlmIChyZWZSZWN0LmJvdHRvbSA8IGJvdW5kLnRvcCB8fCByZWZSZWN0LmxlZnQgPiBib3VuZC5yaWdodCB8fCByZWZSZWN0LnRvcCA+IGJvdW5kLmJvdHRvbSB8fCByZWZSZWN0LnJpZ2h0IDwgYm91bmQubGVmdCkge1xuICAgIC8vIEF2b2lkIHVubmVjZXNzYXJ5IERPTSBhY2Nlc3MgaWYgdmlzaWJpbGl0eSBoYXNuJ3QgY2hhbmdlZFxuICAgIGlmIChkYXRhLmhpZGUgPT09IHRydWUpIHtcbiAgICAgIHJldHVybiBkYXRhO1xuICAgIH1cblxuICAgIGRhdGEuaGlkZSA9IHRydWU7XG4gICAgZGF0YS5hdHRyaWJ1dGVzWyd4LW91dC1vZi1ib3VuZGFyaWVzJ10gPSAnJztcbiAgfSBlbHNlIHtcbiAgICAvLyBBdm9pZCB1bm5lY2Vzc2FyeSBET00gYWNjZXNzIGlmIHZpc2liaWxpdHkgaGFzbid0IGNoYW5nZWRcbiAgICBpZiAoZGF0YS5oaWRlID09PSBmYWxzZSkge1xuICAgICAgcmV0dXJuIGRhdGE7XG4gICAgfVxuXG4gICAgZGF0YS5oaWRlID0gZmFsc2U7XG4gICAgZGF0YS5hdHRyaWJ1dGVzWyd4LW91dC1vZi1ib3VuZGFyaWVzJ10gPSBmYWxzZTtcbiAgfVxuXG4gIHJldHVybiBkYXRhO1xufVxuXG4vKipcbiAqIEBmdW5jdGlvblxuICogQG1lbWJlcm9mIE1vZGlmaWVyc1xuICogQGFyZ3VtZW50IHtPYmplY3R9IGRhdGEgLSBUaGUgZGF0YSBvYmplY3QgZ2VuZXJhdGVkIGJ5IGB1cGRhdGVgIG1ldGhvZFxuICogQGFyZ3VtZW50IHtPYmplY3R9IG9wdGlvbnMgLSBNb2RpZmllcnMgY29uZmlndXJhdGlvbiBhbmQgb3B0aW9uc1xuICogQHJldHVybnMge09iamVjdH0gVGhlIGRhdGEgb2JqZWN0LCBwcm9wZXJseSBtb2RpZmllZFxuICovXG5mdW5jdGlvbiBpbm5lcihkYXRhKSB7XG4gIHZhciBwbGFjZW1lbnQgPSBkYXRhLnBsYWNlbWVudDtcbiAgdmFyIGJhc2VQbGFjZW1lbnQgPSBwbGFjZW1lbnQuc3BsaXQoJy0nKVswXTtcbiAgdmFyIF9kYXRhJG9mZnNldHMgPSBkYXRhLm9mZnNldHMsXG4gICAgICBwb3BwZXIgPSBfZGF0YSRvZmZzZXRzLnBvcHBlcixcbiAgICAgIHJlZmVyZW5jZSA9IF9kYXRhJG9mZnNldHMucmVmZXJlbmNlO1xuXG4gIHZhciBpc0hvcml6ID0gWydsZWZ0JywgJ3JpZ2h0J10uaW5kZXhPZihiYXNlUGxhY2VtZW50KSAhPT0gLTE7XG5cbiAgdmFyIHN1YnRyYWN0TGVuZ3RoID0gWyd0b3AnLCAnbGVmdCddLmluZGV4T2YoYmFzZVBsYWNlbWVudCkgPT09IC0xO1xuXG4gIHBvcHBlcltpc0hvcml6ID8gJ2xlZnQnIDogJ3RvcCddID0gcmVmZXJlbmNlW2Jhc2VQbGFjZW1lbnRdIC0gKHN1YnRyYWN0TGVuZ3RoID8gcG9wcGVyW2lzSG9yaXogPyAnd2lkdGgnIDogJ2hlaWdodCddIDogMCk7XG5cbiAgZGF0YS5wbGFjZW1lbnQgPSBnZXRPcHBvc2l0ZVBsYWNlbWVudChwbGFjZW1lbnQpO1xuICBkYXRhLm9mZnNldHMucG9wcGVyID0gZ2V0Q2xpZW50UmVjdChwb3BwZXIpO1xuXG4gIHJldHVybiBkYXRhO1xufVxuXG4vKipcbiAqIE1vZGlmaWVyIGZ1bmN0aW9uLCBlYWNoIG1vZGlmaWVyIGNhbiBoYXZlIGEgZnVuY3Rpb24gb2YgdGhpcyB0eXBlIGFzc2lnbmVkXG4gKiB0byBpdHMgYGZuYCBwcm9wZXJ0eS48YnIgLz5cbiAqIFRoZXNlIGZ1bmN0aW9ucyB3aWxsIGJlIGNhbGxlZCBvbiBlYWNoIHVwZGF0ZSwgdGhpcyBtZWFucyB0aGF0IHlvdSBtdXN0XG4gKiBtYWtlIHN1cmUgdGhleSBhcmUgcGVyZm9ybWFudCBlbm91Z2ggdG8gYXZvaWQgcGVyZm9ybWFuY2UgYm90dGxlbmVja3MuXG4gKlxuICogQGZ1bmN0aW9uIE1vZGlmaWVyRm5cbiAqIEBhcmd1bWVudCB7ZGF0YU9iamVjdH0gZGF0YSAtIFRoZSBkYXRhIG9iamVjdCBnZW5lcmF0ZWQgYnkgYHVwZGF0ZWAgbWV0aG9kXG4gKiBAYXJndW1lbnQge09iamVjdH0gb3B0aW9ucyAtIE1vZGlmaWVycyBjb25maWd1cmF0aW9uIGFuZCBvcHRpb25zXG4gKiBAcmV0dXJucyB7ZGF0YU9iamVjdH0gVGhlIGRhdGEgb2JqZWN0LCBwcm9wZXJseSBtb2RpZmllZFxuICovXG5cbi8qKlxuICogTW9kaWZpZXJzIGFyZSBwbHVnaW5zIHVzZWQgdG8gYWx0ZXIgdGhlIGJlaGF2aW9yIG9mIHlvdXIgcG9wcGVycy48YnIgLz5cbiAqIFBvcHBlci5qcyB1c2VzIGEgc2V0IG9mIDkgbW9kaWZpZXJzIHRvIHByb3ZpZGUgYWxsIHRoZSBiYXNpYyBmdW5jdGlvbmFsaXRpZXNcbiAqIG5lZWRlZCBieSB0aGUgbGlicmFyeS5cbiAqXG4gKiBVc3VhbGx5IHlvdSBkb24ndCB3YW50IHRvIG92ZXJyaWRlIHRoZSBgb3JkZXJgLCBgZm5gIGFuZCBgb25Mb2FkYCBwcm9wcy5cbiAqIEFsbCB0aGUgb3RoZXIgcHJvcGVydGllcyBhcmUgY29uZmlndXJhdGlvbnMgdGhhdCBjb3VsZCBiZSB0d2Vha2VkLlxuICogQG5hbWVzcGFjZSBtb2RpZmllcnNcbiAqL1xudmFyIG1vZGlmaWVycyA9IHtcbiAgLyoqXG4gICAqIE1vZGlmaWVyIHVzZWQgdG8gc2hpZnQgdGhlIHBvcHBlciBvbiB0aGUgc3RhcnQgb3IgZW5kIG9mIGl0cyByZWZlcmVuY2VcbiAgICogZWxlbWVudC48YnIgLz5cbiAgICogSXQgd2lsbCByZWFkIHRoZSB2YXJpYXRpb24gb2YgdGhlIGBwbGFjZW1lbnRgIHByb3BlcnR5LjxiciAvPlxuICAgKiBJdCBjYW4gYmUgb25lIGVpdGhlciBgLWVuZGAgb3IgYC1zdGFydGAuXG4gICAqIEBtZW1iZXJvZiBtb2RpZmllcnNcbiAgICogQGlubmVyXG4gICAqL1xuICBzaGlmdDoge1xuICAgIC8qKiBAcHJvcCB7bnVtYmVyfSBvcmRlcj0xMDAgLSBJbmRleCB1c2VkIHRvIGRlZmluZSB0aGUgb3JkZXIgb2YgZXhlY3V0aW9uICovXG4gICAgb3JkZXI6IDEwMCxcbiAgICAvKiogQHByb3Age0Jvb2xlYW59IGVuYWJsZWQ9dHJ1ZSAtIFdoZXRoZXIgdGhlIG1vZGlmaWVyIGlzIGVuYWJsZWQgb3Igbm90ICovXG4gICAgZW5hYmxlZDogdHJ1ZSxcbiAgICAvKiogQHByb3Age01vZGlmaWVyRm59ICovXG4gICAgZm46IHNoaWZ0XG4gIH0sXG5cbiAgLyoqXG4gICAqIFRoZSBgb2Zmc2V0YCBtb2RpZmllciBjYW4gc2hpZnQgeW91ciBwb3BwZXIgb24gYm90aCBpdHMgYXhpcy5cbiAgICpcbiAgICogSXQgYWNjZXB0cyB0aGUgZm9sbG93aW5nIHVuaXRzOlxuICAgKiAtIGBweGAgb3IgdW5pdC1sZXNzLCBpbnRlcnByZXRlZCBhcyBwaXhlbHNcbiAgICogLSBgJWAgb3IgYCVyYCwgcGVyY2VudGFnZSByZWxhdGl2ZSB0byB0aGUgbGVuZ3RoIG9mIHRoZSByZWZlcmVuY2UgZWxlbWVudFxuICAgKiAtIGAlcGAsIHBlcmNlbnRhZ2UgcmVsYXRpdmUgdG8gdGhlIGxlbmd0aCBvZiB0aGUgcG9wcGVyIGVsZW1lbnRcbiAgICogLSBgdndgLCBDU1Mgdmlld3BvcnQgd2lkdGggdW5pdFxuICAgKiAtIGB2aGAsIENTUyB2aWV3cG9ydCBoZWlnaHQgdW5pdFxuICAgKlxuICAgKiBGb3IgbGVuZ3RoIGlzIGludGVuZGVkIHRoZSBtYWluIGF4aXMgcmVsYXRpdmUgdG8gdGhlIHBsYWNlbWVudCBvZiB0aGUgcG9wcGVyLjxiciAvPlxuICAgKiBUaGlzIG1lYW5zIHRoYXQgaWYgdGhlIHBsYWNlbWVudCBpcyBgdG9wYCBvciBgYm90dG9tYCwgdGhlIGxlbmd0aCB3aWxsIGJlIHRoZVxuICAgKiBgd2lkdGhgLiBJbiBjYXNlIG9mIGBsZWZ0YCBvciBgcmlnaHRgLCBpdCB3aWxsIGJlIHRoZSBgaGVpZ2h0YC5cbiAgICpcbiAgICogWW91IGNhbiBwcm92aWRlIGEgc2luZ2xlIHZhbHVlIChhcyBgTnVtYmVyYCBvciBgU3RyaW5nYCksIG9yIGEgcGFpciBvZiB2YWx1ZXNcbiAgICogYXMgYFN0cmluZ2AgZGl2aWRlZCBieSBhIGNvbW1hIG9yIG9uZSAob3IgbW9yZSkgd2hpdGUgc3BhY2VzLjxiciAvPlxuICAgKiBUaGUgbGF0dGVyIGlzIGEgZGVwcmVjYXRlZCBtZXRob2QgYmVjYXVzZSBpdCBsZWFkcyB0byBjb25mdXNpb24gYW5kIHdpbGwgYmVcbiAgICogcmVtb3ZlZCBpbiB2Mi48YnIgLz5cbiAgICogQWRkaXRpb25hbGx5LCBpdCBhY2NlcHRzIGFkZGl0aW9ucyBhbmQgc3VidHJhY3Rpb25zIGJldHdlZW4gZGlmZmVyZW50IHVuaXRzLlxuICAgKiBOb3RlIHRoYXQgbXVsdGlwbGljYXRpb25zIGFuZCBkaXZpc2lvbnMgYXJlbid0IHN1cHBvcnRlZC5cbiAgICpcbiAgICogVmFsaWQgZXhhbXBsZXMgYXJlOlxuICAgKiBgYGBcbiAgICogMTBcbiAgICogJzEwJSdcbiAgICogJzEwLCAxMCdcbiAgICogJzEwJSwgMTAnXG4gICAqICcxMCArIDEwJSdcbiAgICogJzEwIC0gNXZoICsgMyUnXG4gICAqICctMTBweCArIDV2aCwgNXB4IC0gNiUnXG4gICAqIGBgYFxuICAgKiA+ICoqTkIqKjogSWYgeW91IGRlc2lyZSB0byBhcHBseSBvZmZzZXRzIHRvIHlvdXIgcG9wcGVycyBpbiBhIHdheSB0aGF0IG1heSBtYWtlIHRoZW0gb3ZlcmxhcFxuICAgKiA+IHdpdGggdGhlaXIgcmVmZXJlbmNlIGVsZW1lbnQsIHVuZm9ydHVuYXRlbHksIHlvdSB3aWxsIGhhdmUgdG8gZGlzYWJsZSB0aGUgYGZsaXBgIG1vZGlmaWVyLlxuICAgKiA+IFlvdSBjYW4gcmVhZCBtb3JlIG9uIHRoaXMgYXQgdGhpcyBbaXNzdWVdKGh0dHBzOi8vZ2l0aHViLmNvbS9GZXpWcmFzdGEvcG9wcGVyLmpzL2lzc3Vlcy8zNzMpLlxuICAgKlxuICAgKiBAbWVtYmVyb2YgbW9kaWZpZXJzXG4gICAqIEBpbm5lclxuICAgKi9cbiAgb2Zmc2V0OiB7XG4gICAgLyoqIEBwcm9wIHtudW1iZXJ9IG9yZGVyPTIwMCAtIEluZGV4IHVzZWQgdG8gZGVmaW5lIHRoZSBvcmRlciBvZiBleGVjdXRpb24gKi9cbiAgICBvcmRlcjogMjAwLFxuICAgIC8qKiBAcHJvcCB7Qm9vbGVhbn0gZW5hYmxlZD10cnVlIC0gV2hldGhlciB0aGUgbW9kaWZpZXIgaXMgZW5hYmxlZCBvciBub3QgKi9cbiAgICBlbmFibGVkOiB0cnVlLFxuICAgIC8qKiBAcHJvcCB7TW9kaWZpZXJGbn0gKi9cbiAgICBmbjogb2Zmc2V0LFxuICAgIC8qKiBAcHJvcCB7TnVtYmVyfFN0cmluZ30gb2Zmc2V0PTBcbiAgICAgKiBUaGUgb2Zmc2V0IHZhbHVlIGFzIGRlc2NyaWJlZCBpbiB0aGUgbW9kaWZpZXIgZGVzY3JpcHRpb25cbiAgICAgKi9cbiAgICBvZmZzZXQ6IDBcbiAgfSxcblxuICAvKipcbiAgICogTW9kaWZpZXIgdXNlZCB0byBwcmV2ZW50IHRoZSBwb3BwZXIgZnJvbSBiZWluZyBwb3NpdGlvbmVkIG91dHNpZGUgdGhlIGJvdW5kYXJ5LlxuICAgKlxuICAgKiBBIHNjZW5hcmlvIGV4aXN0cyB3aGVyZSB0aGUgcmVmZXJlbmNlIGl0c2VsZiBpcyBub3Qgd2l0aGluIHRoZSBib3VuZGFyaWVzLjxiciAvPlxuICAgKiBXZSBjYW4gc2F5IGl0IGhhcyBcImVzY2FwZWQgdGhlIGJvdW5kYXJpZXNcIiDigJQgb3IganVzdCBcImVzY2FwZWRcIi48YnIgLz5cbiAgICogSW4gdGhpcyBjYXNlIHdlIG5lZWQgdG8gZGVjaWRlIHdoZXRoZXIgdGhlIHBvcHBlciBzaG91bGQgZWl0aGVyOlxuICAgKlxuICAgKiAtIGRldGFjaCBmcm9tIHRoZSByZWZlcmVuY2UgYW5kIHJlbWFpbiBcInRyYXBwZWRcIiBpbiB0aGUgYm91bmRhcmllcywgb3JcbiAgICogLSBpZiBpdCBzaG91bGQgaWdub3JlIHRoZSBib3VuZGFyeSBhbmQgXCJlc2NhcGUgd2l0aCBpdHMgcmVmZXJlbmNlXCJcbiAgICpcbiAgICogV2hlbiBgZXNjYXBlV2l0aFJlZmVyZW5jZWAgaXMgc2V0IHRvYHRydWVgIGFuZCByZWZlcmVuY2UgaXMgY29tcGxldGVseVxuICAgKiBvdXRzaWRlIGl0cyBib3VuZGFyaWVzLCB0aGUgcG9wcGVyIHdpbGwgb3ZlcmZsb3cgKG9yIGNvbXBsZXRlbHkgbGVhdmUpXG4gICAqIHRoZSBib3VuZGFyaWVzIGluIG9yZGVyIHRvIHJlbWFpbiBhdHRhY2hlZCB0byB0aGUgZWRnZSBvZiB0aGUgcmVmZXJlbmNlLlxuICAgKlxuICAgKiBAbWVtYmVyb2YgbW9kaWZpZXJzXG4gICAqIEBpbm5lclxuICAgKi9cbiAgcHJldmVudE92ZXJmbG93OiB7XG4gICAgLyoqIEBwcm9wIHtudW1iZXJ9IG9yZGVyPTMwMCAtIEluZGV4IHVzZWQgdG8gZGVmaW5lIHRoZSBvcmRlciBvZiBleGVjdXRpb24gKi9cbiAgICBvcmRlcjogMzAwLFxuICAgIC8qKiBAcHJvcCB7Qm9vbGVhbn0gZW5hYmxlZD10cnVlIC0gV2hldGhlciB0aGUgbW9kaWZpZXIgaXMgZW5hYmxlZCBvciBub3QgKi9cbiAgICBlbmFibGVkOiB0cnVlLFxuICAgIC8qKiBAcHJvcCB7TW9kaWZpZXJGbn0gKi9cbiAgICBmbjogcHJldmVudE92ZXJmbG93LFxuICAgIC8qKlxuICAgICAqIEBwcm9wIHtBcnJheX0gW3ByaW9yaXR5PVsnbGVmdCcsJ3JpZ2h0JywndG9wJywnYm90dG9tJ11dXG4gICAgICogUG9wcGVyIHdpbGwgdHJ5IHRvIHByZXZlbnQgb3ZlcmZsb3cgZm9sbG93aW5nIHRoZXNlIHByaW9yaXRpZXMgYnkgZGVmYXVsdCxcbiAgICAgKiB0aGVuLCBpdCBjb3VsZCBvdmVyZmxvdyBvbiB0aGUgbGVmdCBhbmQgb24gdG9wIG9mIHRoZSBgYm91bmRhcmllc0VsZW1lbnRgXG4gICAgICovXG4gICAgcHJpb3JpdHk6IFsnbGVmdCcsICdyaWdodCcsICd0b3AnLCAnYm90dG9tJ10sXG4gICAgLyoqXG4gICAgICogQHByb3Age251bWJlcn0gcGFkZGluZz01XG4gICAgICogQW1vdW50IG9mIHBpeGVsIHVzZWQgdG8gZGVmaW5lIGEgbWluaW11bSBkaXN0YW5jZSBiZXR3ZWVuIHRoZSBib3VuZGFyaWVzXG4gICAgICogYW5kIHRoZSBwb3BwZXIuIFRoaXMgbWFrZXMgc3VyZSB0aGUgcG9wcGVyIGFsd2F5cyBoYXMgYSBsaXR0bGUgcGFkZGluZ1xuICAgICAqIGJldHdlZW4gdGhlIGVkZ2VzIG9mIGl0cyBjb250YWluZXJcbiAgICAgKi9cbiAgICBwYWRkaW5nOiA1LFxuICAgIC8qKlxuICAgICAqIEBwcm9wIHtTdHJpbmd8SFRNTEVsZW1lbnR9IGJvdW5kYXJpZXNFbGVtZW50PSdzY3JvbGxQYXJlbnQnXG4gICAgICogQm91bmRhcmllcyB1c2VkIGJ5IHRoZSBtb2RpZmllci4gQ2FuIGJlIGBzY3JvbGxQYXJlbnRgLCBgd2luZG93YCxcbiAgICAgKiBgdmlld3BvcnRgIG9yIGFueSBET00gZWxlbWVudC5cbiAgICAgKi9cbiAgICBib3VuZGFyaWVzRWxlbWVudDogJ3Njcm9sbFBhcmVudCdcbiAgfSxcblxuICAvKipcbiAgICogTW9kaWZpZXIgdXNlZCB0byBtYWtlIHN1cmUgdGhlIHJlZmVyZW5jZSBhbmQgaXRzIHBvcHBlciBzdGF5IG5lYXIgZWFjaCBvdGhlclxuICAgKiB3aXRob3V0IGxlYXZpbmcgYW55IGdhcCBiZXR3ZWVuIHRoZSB0d28uIEVzcGVjaWFsbHkgdXNlZnVsIHdoZW4gdGhlIGFycm93IGlzXG4gICAqIGVuYWJsZWQgYW5kIHlvdSB3YW50IHRvIGVuc3VyZSB0aGF0IGl0IHBvaW50cyB0byBpdHMgcmVmZXJlbmNlIGVsZW1lbnQuXG4gICAqIEl0IGNhcmVzIG9ubHkgYWJvdXQgdGhlIGZpcnN0IGF4aXMuIFlvdSBjYW4gc3RpbGwgaGF2ZSBwb3BwZXJzIHdpdGggbWFyZ2luXG4gICAqIGJldHdlZW4gdGhlIHBvcHBlciBhbmQgaXRzIHJlZmVyZW5jZSBlbGVtZW50LlxuICAgKiBAbWVtYmVyb2YgbW9kaWZpZXJzXG4gICAqIEBpbm5lclxuICAgKi9cbiAga2VlcFRvZ2V0aGVyOiB7XG4gICAgLyoqIEBwcm9wIHtudW1iZXJ9IG9yZGVyPTQwMCAtIEluZGV4IHVzZWQgdG8gZGVmaW5lIHRoZSBvcmRlciBvZiBleGVjdXRpb24gKi9cbiAgICBvcmRlcjogNDAwLFxuICAgIC8qKiBAcHJvcCB7Qm9vbGVhbn0gZW5hYmxlZD10cnVlIC0gV2hldGhlciB0aGUgbW9kaWZpZXIgaXMgZW5hYmxlZCBvciBub3QgKi9cbiAgICBlbmFibGVkOiB0cnVlLFxuICAgIC8qKiBAcHJvcCB7TW9kaWZpZXJGbn0gKi9cbiAgICBmbjoga2VlcFRvZ2V0aGVyXG4gIH0sXG5cbiAgLyoqXG4gICAqIFRoaXMgbW9kaWZpZXIgaXMgdXNlZCB0byBtb3ZlIHRoZSBgYXJyb3dFbGVtZW50YCBvZiB0aGUgcG9wcGVyIHRvIG1ha2VcbiAgICogc3VyZSBpdCBpcyBwb3NpdGlvbmVkIGJldHdlZW4gdGhlIHJlZmVyZW5jZSBlbGVtZW50IGFuZCBpdHMgcG9wcGVyIGVsZW1lbnQuXG4gICAqIEl0IHdpbGwgcmVhZCB0aGUgb3V0ZXIgc2l6ZSBvZiB0aGUgYGFycm93RWxlbWVudGAgbm9kZSB0byBkZXRlY3QgaG93IG1hbnlcbiAgICogcGl4ZWxzIG9mIGNvbmp1bmN0aW9uIGFyZSBuZWVkZWQuXG4gICAqXG4gICAqIEl0IGhhcyBubyBlZmZlY3QgaWYgbm8gYGFycm93RWxlbWVudGAgaXMgcHJvdmlkZWQuXG4gICAqIEBtZW1iZXJvZiBtb2RpZmllcnNcbiAgICogQGlubmVyXG4gICAqL1xuICBhcnJvdzoge1xuICAgIC8qKiBAcHJvcCB7bnVtYmVyfSBvcmRlcj01MDAgLSBJbmRleCB1c2VkIHRvIGRlZmluZSB0aGUgb3JkZXIgb2YgZXhlY3V0aW9uICovXG4gICAgb3JkZXI6IDUwMCxcbiAgICAvKiogQHByb3Age0Jvb2xlYW59IGVuYWJsZWQ9dHJ1ZSAtIFdoZXRoZXIgdGhlIG1vZGlmaWVyIGlzIGVuYWJsZWQgb3Igbm90ICovXG4gICAgZW5hYmxlZDogdHJ1ZSxcbiAgICAvKiogQHByb3Age01vZGlmaWVyRm59ICovXG4gICAgZm46IGFycm93LFxuICAgIC8qKiBAcHJvcCB7U3RyaW5nfEhUTUxFbGVtZW50fSBlbGVtZW50PSdbeC1hcnJvd10nIC0gU2VsZWN0b3Igb3Igbm9kZSB1c2VkIGFzIGFycm93ICovXG4gICAgZWxlbWVudDogJ1t4LWFycm93XSdcbiAgfSxcblxuICAvKipcbiAgICogTW9kaWZpZXIgdXNlZCB0byBmbGlwIHRoZSBwb3BwZXIncyBwbGFjZW1lbnQgd2hlbiBpdCBzdGFydHMgdG8gb3ZlcmxhcCBpdHNcbiAgICogcmVmZXJlbmNlIGVsZW1lbnQuXG4gICAqXG4gICAqIFJlcXVpcmVzIHRoZSBgcHJldmVudE92ZXJmbG93YCBtb2RpZmllciBiZWZvcmUgaXQgaW4gb3JkZXIgdG8gd29yay5cbiAgICpcbiAgICogKipOT1RFOioqIHRoaXMgbW9kaWZpZXIgd2lsbCBpbnRlcnJ1cHQgdGhlIGN1cnJlbnQgdXBkYXRlIGN5Y2xlIGFuZCB3aWxsXG4gICAqIHJlc3RhcnQgaXQgaWYgaXQgZGV0ZWN0cyB0aGUgbmVlZCB0byBmbGlwIHRoZSBwbGFjZW1lbnQuXG4gICAqIEBtZW1iZXJvZiBtb2RpZmllcnNcbiAgICogQGlubmVyXG4gICAqL1xuICBmbGlwOiB7XG4gICAgLyoqIEBwcm9wIHtudW1iZXJ9IG9yZGVyPTYwMCAtIEluZGV4IHVzZWQgdG8gZGVmaW5lIHRoZSBvcmRlciBvZiBleGVjdXRpb24gKi9cbiAgICBvcmRlcjogNjAwLFxuICAgIC8qKiBAcHJvcCB7Qm9vbGVhbn0gZW5hYmxlZD10cnVlIC0gV2hldGhlciB0aGUgbW9kaWZpZXIgaXMgZW5hYmxlZCBvciBub3QgKi9cbiAgICBlbmFibGVkOiB0cnVlLFxuICAgIC8qKiBAcHJvcCB7TW9kaWZpZXJGbn0gKi9cbiAgICBmbjogZmxpcCxcbiAgICAvKipcbiAgICAgKiBAcHJvcCB7U3RyaW5nfEFycmF5fSBiZWhhdmlvcj0nZmxpcCdcbiAgICAgKiBUaGUgYmVoYXZpb3IgdXNlZCB0byBjaGFuZ2UgdGhlIHBvcHBlcidzIHBsYWNlbWVudC4gSXQgY2FuIGJlIG9uZSBvZlxuICAgICAqIGBmbGlwYCwgYGNsb2Nrd2lzZWAsIGBjb3VudGVyY2xvY2t3aXNlYCBvciBhbiBhcnJheSB3aXRoIGEgbGlzdCBvZiB2YWxpZFxuICAgICAqIHBsYWNlbWVudHMgKHdpdGggb3B0aW9uYWwgdmFyaWF0aW9ucylcbiAgICAgKi9cbiAgICBiZWhhdmlvcjogJ2ZsaXAnLFxuICAgIC8qKlxuICAgICAqIEBwcm9wIHtudW1iZXJ9IHBhZGRpbmc9NVxuICAgICAqIFRoZSBwb3BwZXIgd2lsbCBmbGlwIGlmIGl0IGhpdHMgdGhlIGVkZ2VzIG9mIHRoZSBgYm91bmRhcmllc0VsZW1lbnRgXG4gICAgICovXG4gICAgcGFkZGluZzogNSxcbiAgICAvKipcbiAgICAgKiBAcHJvcCB7U3RyaW5nfEhUTUxFbGVtZW50fSBib3VuZGFyaWVzRWxlbWVudD0ndmlld3BvcnQnXG4gICAgICogVGhlIGVsZW1lbnQgd2hpY2ggd2lsbCBkZWZpbmUgdGhlIGJvdW5kYXJpZXMgb2YgdGhlIHBvcHBlciBwb3NpdGlvbi5cbiAgICAgKiBUaGUgcG9wcGVyIHdpbGwgbmV2ZXIgYmUgcGxhY2VkIG91dHNpZGUgb2YgdGhlIGRlZmluZWQgYm91bmRhcmllc1xuICAgICAqIChleGNlcHQgaWYgYGtlZXBUb2dldGhlcmAgaXMgZW5hYmxlZClcbiAgICAgKi9cbiAgICBib3VuZGFyaWVzRWxlbWVudDogJ3ZpZXdwb3J0J1xuICB9LFxuXG4gIC8qKlxuICAgKiBNb2RpZmllciB1c2VkIHRvIG1ha2UgdGhlIHBvcHBlciBmbG93IHRvd2FyZCB0aGUgaW5uZXIgb2YgdGhlIHJlZmVyZW5jZSBlbGVtZW50LlxuICAgKiBCeSBkZWZhdWx0LCB3aGVuIHRoaXMgbW9kaWZpZXIgaXMgZGlzYWJsZWQsIHRoZSBwb3BwZXIgd2lsbCBiZSBwbGFjZWQgb3V0c2lkZVxuICAgKiB0aGUgcmVmZXJlbmNlIGVsZW1lbnQuXG4gICAqIEBtZW1iZXJvZiBtb2RpZmllcnNcbiAgICogQGlubmVyXG4gICAqL1xuICBpbm5lcjoge1xuICAgIC8qKiBAcHJvcCB7bnVtYmVyfSBvcmRlcj03MDAgLSBJbmRleCB1c2VkIHRvIGRlZmluZSB0aGUgb3JkZXIgb2YgZXhlY3V0aW9uICovXG4gICAgb3JkZXI6IDcwMCxcbiAgICAvKiogQHByb3Age0Jvb2xlYW59IGVuYWJsZWQ9ZmFsc2UgLSBXaGV0aGVyIHRoZSBtb2RpZmllciBpcyBlbmFibGVkIG9yIG5vdCAqL1xuICAgIGVuYWJsZWQ6IGZhbHNlLFxuICAgIC8qKiBAcHJvcCB7TW9kaWZpZXJGbn0gKi9cbiAgICBmbjogaW5uZXJcbiAgfSxcblxuICAvKipcbiAgICogTW9kaWZpZXIgdXNlZCB0byBoaWRlIHRoZSBwb3BwZXIgd2hlbiBpdHMgcmVmZXJlbmNlIGVsZW1lbnQgaXMgb3V0c2lkZSBvZiB0aGVcbiAgICogcG9wcGVyIGJvdW5kYXJpZXMuIEl0IHdpbGwgc2V0IGEgYHgtb3V0LW9mLWJvdW5kYXJpZXNgIGF0dHJpYnV0ZSB3aGljaCBjYW5cbiAgICogYmUgdXNlZCB0byBoaWRlIHdpdGggYSBDU1Mgc2VsZWN0b3IgdGhlIHBvcHBlciB3aGVuIGl0cyByZWZlcmVuY2UgaXNcbiAgICogb3V0IG9mIGJvdW5kYXJpZXMuXG4gICAqXG4gICAqIFJlcXVpcmVzIHRoZSBgcHJldmVudE92ZXJmbG93YCBtb2RpZmllciBiZWZvcmUgaXQgaW4gb3JkZXIgdG8gd29yay5cbiAgICogQG1lbWJlcm9mIG1vZGlmaWVyc1xuICAgKiBAaW5uZXJcbiAgICovXG4gIGhpZGU6IHtcbiAgICAvKiogQHByb3Age251bWJlcn0gb3JkZXI9ODAwIC0gSW5kZXggdXNlZCB0byBkZWZpbmUgdGhlIG9yZGVyIG9mIGV4ZWN1dGlvbiAqL1xuICAgIG9yZGVyOiA4MDAsXG4gICAgLyoqIEBwcm9wIHtCb29sZWFufSBlbmFibGVkPXRydWUgLSBXaGV0aGVyIHRoZSBtb2RpZmllciBpcyBlbmFibGVkIG9yIG5vdCAqL1xuICAgIGVuYWJsZWQ6IHRydWUsXG4gICAgLyoqIEBwcm9wIHtNb2RpZmllckZufSAqL1xuICAgIGZuOiBoaWRlXG4gIH0sXG5cbiAgLyoqXG4gICAqIENvbXB1dGVzIHRoZSBzdHlsZSB0aGF0IHdpbGwgYmUgYXBwbGllZCB0byB0aGUgcG9wcGVyIGVsZW1lbnQgdG8gZ2V0c1xuICAgKiBwcm9wZXJseSBwb3NpdGlvbmVkLlxuICAgKlxuICAgKiBOb3RlIHRoYXQgdGhpcyBtb2RpZmllciB3aWxsIG5vdCB0b3VjaCB0aGUgRE9NLCBpdCBqdXN0IHByZXBhcmVzIHRoZSBzdHlsZXNcbiAgICogc28gdGhhdCBgYXBwbHlTdHlsZWAgbW9kaWZpZXIgY2FuIGFwcGx5IGl0LiBUaGlzIHNlcGFyYXRpb24gaXMgdXNlZnVsXG4gICAqIGluIGNhc2UgeW91IG5lZWQgdG8gcmVwbGFjZSBgYXBwbHlTdHlsZWAgd2l0aCBhIGN1c3RvbSBpbXBsZW1lbnRhdGlvbi5cbiAgICpcbiAgICogVGhpcyBtb2RpZmllciBoYXMgYDg1MGAgYXMgYG9yZGVyYCB2YWx1ZSB0byBtYWludGFpbiBiYWNrd2FyZCBjb21wYXRpYmlsaXR5XG4gICAqIHdpdGggcHJldmlvdXMgdmVyc2lvbnMgb2YgUG9wcGVyLmpzLiBFeHBlY3QgdGhlIG1vZGlmaWVycyBvcmRlcmluZyBtZXRob2RcbiAgICogdG8gY2hhbmdlIGluIGZ1dHVyZSBtYWpvciB2ZXJzaW9ucyBvZiB0aGUgbGlicmFyeS5cbiAgICpcbiAgICogQG1lbWJlcm9mIG1vZGlmaWVyc1xuICAgKiBAaW5uZXJcbiAgICovXG4gIGNvbXB1dGVTdHlsZToge1xuICAgIC8qKiBAcHJvcCB7bnVtYmVyfSBvcmRlcj04NTAgLSBJbmRleCB1c2VkIHRvIGRlZmluZSB0aGUgb3JkZXIgb2YgZXhlY3V0aW9uICovXG4gICAgb3JkZXI6IDg1MCxcbiAgICAvKiogQHByb3Age0Jvb2xlYW59IGVuYWJsZWQ9dHJ1ZSAtIFdoZXRoZXIgdGhlIG1vZGlmaWVyIGlzIGVuYWJsZWQgb3Igbm90ICovXG4gICAgZW5hYmxlZDogdHJ1ZSxcbiAgICAvKiogQHByb3Age01vZGlmaWVyRm59ICovXG4gICAgZm46IGNvbXB1dGVTdHlsZSxcbiAgICAvKipcbiAgICAgKiBAcHJvcCB7Qm9vbGVhbn0gZ3B1QWNjZWxlcmF0aW9uPXRydWVcbiAgICAgKiBJZiB0cnVlLCBpdCB1c2VzIHRoZSBDU1MgM0QgdHJhbnNmb3JtYXRpb24gdG8gcG9zaXRpb24gdGhlIHBvcHBlci5cbiAgICAgKiBPdGhlcndpc2UsIGl0IHdpbGwgdXNlIHRoZSBgdG9wYCBhbmQgYGxlZnRgIHByb3BlcnRpZXNcbiAgICAgKi9cbiAgICBncHVBY2NlbGVyYXRpb246IHRydWUsXG4gICAgLyoqXG4gICAgICogQHByb3Age3N0cmluZ30gW3g9J2JvdHRvbSddXG4gICAgICogV2hlcmUgdG8gYW5jaG9yIHRoZSBYIGF4aXMgKGBib3R0b21gIG9yIGB0b3BgKS4gQUtBIFggb2Zmc2V0IG9yaWdpbi5cbiAgICAgKiBDaGFuZ2UgdGhpcyBpZiB5b3VyIHBvcHBlciBzaG91bGQgZ3JvdyBpbiBhIGRpcmVjdGlvbiBkaWZmZXJlbnQgZnJvbSBgYm90dG9tYFxuICAgICAqL1xuICAgIHg6ICdib3R0b20nLFxuICAgIC8qKlxuICAgICAqIEBwcm9wIHtzdHJpbmd9IFt4PSdsZWZ0J11cbiAgICAgKiBXaGVyZSB0byBhbmNob3IgdGhlIFkgYXhpcyAoYGxlZnRgIG9yIGByaWdodGApLiBBS0EgWSBvZmZzZXQgb3JpZ2luLlxuICAgICAqIENoYW5nZSB0aGlzIGlmIHlvdXIgcG9wcGVyIHNob3VsZCBncm93IGluIGEgZGlyZWN0aW9uIGRpZmZlcmVudCBmcm9tIGByaWdodGBcbiAgICAgKi9cbiAgICB5OiAncmlnaHQnXG4gIH0sXG5cbiAgLyoqXG4gICAqIEFwcGxpZXMgdGhlIGNvbXB1dGVkIHN0eWxlcyB0byB0aGUgcG9wcGVyIGVsZW1lbnQuXG4gICAqXG4gICAqIEFsbCB0aGUgRE9NIG1hbmlwdWxhdGlvbnMgYXJlIGxpbWl0ZWQgdG8gdGhpcyBtb2RpZmllci4gVGhpcyBpcyB1c2VmdWwgaW4gY2FzZVxuICAgKiB5b3Ugd2FudCB0byBpbnRlZ3JhdGUgUG9wcGVyLmpzIGluc2lkZSBhIGZyYW1ld29yayBvciB2aWV3IGxpYnJhcnkgYW5kIHlvdVxuICAgKiB3YW50IHRvIGRlbGVnYXRlIGFsbCB0aGUgRE9NIG1hbmlwdWxhdGlvbnMgdG8gaXQuXG4gICAqXG4gICAqIE5vdGUgdGhhdCBpZiB5b3UgZGlzYWJsZSB0aGlzIG1vZGlmaWVyLCB5b3UgbXVzdCBtYWtlIHN1cmUgdGhlIHBvcHBlciBlbGVtZW50XG4gICAqIGhhcyBpdHMgcG9zaXRpb24gc2V0IHRvIGBhYnNvbHV0ZWAgYmVmb3JlIFBvcHBlci5qcyBjYW4gZG8gaXRzIHdvcmshXG4gICAqXG4gICAqIEp1c3QgZGlzYWJsZSB0aGlzIG1vZGlmaWVyIGFuZCBkZWZpbmUgeW91ciBvd24gdG8gYWNoaWV2ZSB0aGUgZGVzaXJlZCBlZmZlY3QuXG4gICAqXG4gICAqIEBtZW1iZXJvZiBtb2RpZmllcnNcbiAgICogQGlubmVyXG4gICAqL1xuICBhcHBseVN0eWxlOiB7XG4gICAgLyoqIEBwcm9wIHtudW1iZXJ9IG9yZGVyPTkwMCAtIEluZGV4IHVzZWQgdG8gZGVmaW5lIHRoZSBvcmRlciBvZiBleGVjdXRpb24gKi9cbiAgICBvcmRlcjogOTAwLFxuICAgIC8qKiBAcHJvcCB7Qm9vbGVhbn0gZW5hYmxlZD10cnVlIC0gV2hldGhlciB0aGUgbW9kaWZpZXIgaXMgZW5hYmxlZCBvciBub3QgKi9cbiAgICBlbmFibGVkOiB0cnVlLFxuICAgIC8qKiBAcHJvcCB7TW9kaWZpZXJGbn0gKi9cbiAgICBmbjogYXBwbHlTdHlsZSxcbiAgICAvKiogQHByb3Age0Z1bmN0aW9ufSAqL1xuICAgIG9uTG9hZDogYXBwbHlTdHlsZU9uTG9hZCxcbiAgICAvKipcbiAgICAgKiBAZGVwcmVjYXRlZCBzaW5jZSB2ZXJzaW9uIDEuMTAuMCwgdGhlIHByb3BlcnR5IG1vdmVkIHRvIGBjb21wdXRlU3R5bGVgIG1vZGlmaWVyXG4gICAgICogQHByb3Age0Jvb2xlYW59IGdwdUFjY2VsZXJhdGlvbj10cnVlXG4gICAgICogSWYgdHJ1ZSwgaXQgdXNlcyB0aGUgQ1NTIDNEIHRyYW5zZm9ybWF0aW9uIHRvIHBvc2l0aW9uIHRoZSBwb3BwZXIuXG4gICAgICogT3RoZXJ3aXNlLCBpdCB3aWxsIHVzZSB0aGUgYHRvcGAgYW5kIGBsZWZ0YCBwcm9wZXJ0aWVzXG4gICAgICovXG4gICAgZ3B1QWNjZWxlcmF0aW9uOiB1bmRlZmluZWRcbiAgfVxufTtcblxuLyoqXG4gKiBUaGUgYGRhdGFPYmplY3RgIGlzIGFuIG9iamVjdCBjb250YWluaW5nIGFsbCB0aGUgaW5mb3JtYXRpb24gdXNlZCBieSBQb3BwZXIuanMuXG4gKiBUaGlzIG9iamVjdCBpcyBwYXNzZWQgdG8gbW9kaWZpZXJzIGFuZCB0byB0aGUgYG9uQ3JlYXRlYCBhbmQgYG9uVXBkYXRlYCBjYWxsYmFja3MuXG4gKiBAbmFtZSBkYXRhT2JqZWN0XG4gKiBAcHJvcGVydHkge09iamVjdH0gZGF0YS5pbnN0YW5jZSBUaGUgUG9wcGVyLmpzIGluc3RhbmNlXG4gKiBAcHJvcGVydHkge1N0cmluZ30gZGF0YS5wbGFjZW1lbnQgUGxhY2VtZW50IGFwcGxpZWQgdG8gcG9wcGVyXG4gKiBAcHJvcGVydHkge1N0cmluZ30gZGF0YS5vcmlnaW5hbFBsYWNlbWVudCBQbGFjZW1lbnQgb3JpZ2luYWxseSBkZWZpbmVkIG9uIGluaXRcbiAqIEBwcm9wZXJ0eSB7Qm9vbGVhbn0gZGF0YS5mbGlwcGVkIFRydWUgaWYgcG9wcGVyIGhhcyBiZWVuIGZsaXBwZWQgYnkgZmxpcCBtb2RpZmllclxuICogQHByb3BlcnR5IHtCb29sZWFufSBkYXRhLmhpZGUgVHJ1ZSBpZiB0aGUgcmVmZXJlbmNlIGVsZW1lbnQgaXMgb3V0IG9mIGJvdW5kYXJpZXMsIHVzZWZ1bCB0byBrbm93IHdoZW4gdG8gaGlkZSB0aGUgcG9wcGVyXG4gKiBAcHJvcGVydHkge0hUTUxFbGVtZW50fSBkYXRhLmFycm93RWxlbWVudCBOb2RlIHVzZWQgYXMgYXJyb3cgYnkgYXJyb3cgbW9kaWZpZXJcbiAqIEBwcm9wZXJ0eSB7T2JqZWN0fSBkYXRhLnN0eWxlcyBBbnkgQ1NTIHByb3BlcnR5IGRlZmluZWQgaGVyZSB3aWxsIGJlIGFwcGxpZWQgdG8gdGhlIHBvcHBlci4gSXQgZXhwZWN0cyB0aGUgSmF2YVNjcmlwdCBub21lbmNsYXR1cmUgKGVnLiBgbWFyZ2luQm90dG9tYClcbiAqIEBwcm9wZXJ0eSB7T2JqZWN0fSBkYXRhLmFycm93U3R5bGVzIEFueSBDU1MgcHJvcGVydHkgZGVmaW5lZCBoZXJlIHdpbGwgYmUgYXBwbGllZCB0byB0aGUgcG9wcGVyIGFycm93LiBJdCBleHBlY3RzIHRoZSBKYXZhU2NyaXB0IG5vbWVuY2xhdHVyZSAoZWcuIGBtYXJnaW5Cb3R0b21gKVxuICogQHByb3BlcnR5IHtPYmplY3R9IGRhdGEuYm91bmRhcmllcyBPZmZzZXRzIG9mIHRoZSBwb3BwZXIgYm91bmRhcmllc1xuICogQHByb3BlcnR5IHtPYmplY3R9IGRhdGEub2Zmc2V0cyBUaGUgbWVhc3VyZW1lbnRzIG9mIHBvcHBlciwgcmVmZXJlbmNlIGFuZCBhcnJvdyBlbGVtZW50c1xuICogQHByb3BlcnR5IHtPYmplY3R9IGRhdGEub2Zmc2V0cy5wb3BwZXIgYHRvcGAsIGBsZWZ0YCwgYHdpZHRoYCwgYGhlaWdodGAgdmFsdWVzXG4gKiBAcHJvcGVydHkge09iamVjdH0gZGF0YS5vZmZzZXRzLnJlZmVyZW5jZSBgdG9wYCwgYGxlZnRgLCBgd2lkdGhgLCBgaGVpZ2h0YCB2YWx1ZXNcbiAqIEBwcm9wZXJ0eSB7T2JqZWN0fSBkYXRhLm9mZnNldHMuYXJyb3ddIGB0b3BgIGFuZCBgbGVmdGAgb2Zmc2V0cywgb25seSBvbmUgb2YgdGhlbSB3aWxsIGJlIGRpZmZlcmVudCBmcm9tIDBcbiAqL1xuXG4vKipcbiAqIERlZmF1bHQgb3B0aW9ucyBwcm92aWRlZCB0byBQb3BwZXIuanMgY29uc3RydWN0b3IuPGJyIC8+XG4gKiBUaGVzZSBjYW4gYmUgb3ZlcnJpZGRlbiB1c2luZyB0aGUgYG9wdGlvbnNgIGFyZ3VtZW50IG9mIFBvcHBlci5qcy48YnIgLz5cbiAqIFRvIG92ZXJyaWRlIGFuIG9wdGlvbiwgc2ltcGx5IHBhc3MgYW4gb2JqZWN0IHdpdGggdGhlIHNhbWVcbiAqIHN0cnVjdHVyZSBvZiB0aGUgYG9wdGlvbnNgIG9iamVjdCwgYXMgdGhlIDNyZCBhcmd1bWVudC4gRm9yIGV4YW1wbGU6XG4gKiBgYGBcbiAqIG5ldyBQb3BwZXIocmVmLCBwb3AsIHtcbiAqICAgbW9kaWZpZXJzOiB7XG4gKiAgICAgcHJldmVudE92ZXJmbG93OiB7IGVuYWJsZWQ6IGZhbHNlIH1cbiAqICAgfVxuICogfSlcbiAqIGBgYFxuICogQHR5cGUge09iamVjdH1cbiAqIEBzdGF0aWNcbiAqIEBtZW1iZXJvZiBQb3BwZXJcbiAqL1xudmFyIERlZmF1bHRzID0ge1xuICAvKipcbiAgICogUG9wcGVyJ3MgcGxhY2VtZW50LlxuICAgKiBAcHJvcCB7UG9wcGVyLnBsYWNlbWVudHN9IHBsYWNlbWVudD0nYm90dG9tJ1xuICAgKi9cbiAgcGxhY2VtZW50OiAnYm90dG9tJyxcblxuICAvKipcbiAgICogU2V0IHRoaXMgdG8gdHJ1ZSBpZiB5b3Ugd2FudCBwb3BwZXIgdG8gcG9zaXRpb24gaXQgc2VsZiBpbiAnZml4ZWQnIG1vZGVcbiAgICogQHByb3Age0Jvb2xlYW59IHBvc2l0aW9uRml4ZWQ9ZmFsc2VcbiAgICovXG4gIHBvc2l0aW9uRml4ZWQ6IGZhbHNlLFxuXG4gIC8qKlxuICAgKiBXaGV0aGVyIGV2ZW50cyAocmVzaXplLCBzY3JvbGwpIGFyZSBpbml0aWFsbHkgZW5hYmxlZC5cbiAgICogQHByb3Age0Jvb2xlYW59IGV2ZW50c0VuYWJsZWQ9dHJ1ZVxuICAgKi9cbiAgZXZlbnRzRW5hYmxlZDogdHJ1ZSxcblxuICAvKipcbiAgICogU2V0IHRvIHRydWUgaWYgeW91IHdhbnQgdG8gYXV0b21hdGljYWxseSByZW1vdmUgdGhlIHBvcHBlciB3aGVuXG4gICAqIHlvdSBjYWxsIHRoZSBgZGVzdHJveWAgbWV0aG9kLlxuICAgKiBAcHJvcCB7Qm9vbGVhbn0gcmVtb3ZlT25EZXN0cm95PWZhbHNlXG4gICAqL1xuICByZW1vdmVPbkRlc3Ryb3k6IGZhbHNlLFxuXG4gIC8qKlxuICAgKiBDYWxsYmFjayBjYWxsZWQgd2hlbiB0aGUgcG9wcGVyIGlzIGNyZWF0ZWQuPGJyIC8+XG4gICAqIEJ5IGRlZmF1bHQsIGl0IGlzIHNldCB0byBuby1vcC48YnIgLz5cbiAgICogQWNjZXNzIFBvcHBlci5qcyBpbnN0YW5jZSB3aXRoIGBkYXRhLmluc3RhbmNlYC5cbiAgICogQHByb3Age29uQ3JlYXRlfVxuICAgKi9cbiAgb25DcmVhdGU6IGZ1bmN0aW9uIG9uQ3JlYXRlKCkge30sXG5cbiAgLyoqXG4gICAqIENhbGxiYWNrIGNhbGxlZCB3aGVuIHRoZSBwb3BwZXIgaXMgdXBkYXRlZC4gVGhpcyBjYWxsYmFjayBpcyBub3QgY2FsbGVkXG4gICAqIG9uIHRoZSBpbml0aWFsaXphdGlvbi9jcmVhdGlvbiBvZiB0aGUgcG9wcGVyLCBidXQgb25seSBvbiBzdWJzZXF1ZW50XG4gICAqIHVwZGF0ZXMuPGJyIC8+XG4gICAqIEJ5IGRlZmF1bHQsIGl0IGlzIHNldCB0byBuby1vcC48YnIgLz5cbiAgICogQWNjZXNzIFBvcHBlci5qcyBpbnN0YW5jZSB3aXRoIGBkYXRhLmluc3RhbmNlYC5cbiAgICogQHByb3Age29uVXBkYXRlfVxuICAgKi9cbiAgb25VcGRhdGU6IGZ1bmN0aW9uIG9uVXBkYXRlKCkge30sXG5cbiAgLyoqXG4gICAqIExpc3Qgb2YgbW9kaWZpZXJzIHVzZWQgdG8gbW9kaWZ5IHRoZSBvZmZzZXRzIGJlZm9yZSB0aGV5IGFyZSBhcHBsaWVkIHRvIHRoZSBwb3BwZXIuXG4gICAqIFRoZXkgcHJvdmlkZSBtb3N0IG9mIHRoZSBmdW5jdGlvbmFsaXRpZXMgb2YgUG9wcGVyLmpzLlxuICAgKiBAcHJvcCB7bW9kaWZpZXJzfVxuICAgKi9cbiAgbW9kaWZpZXJzOiBtb2RpZmllcnNcbn07XG5cbi8qKlxuICogQGNhbGxiYWNrIG9uQ3JlYXRlXG4gKiBAcGFyYW0ge2RhdGFPYmplY3R9IGRhdGFcbiAqL1xuXG4vKipcbiAqIEBjYWxsYmFjayBvblVwZGF0ZVxuICogQHBhcmFtIHtkYXRhT2JqZWN0fSBkYXRhXG4gKi9cblxuLy8gVXRpbHNcbi8vIE1ldGhvZHNcbnZhciBQb3BwZXIgPSBmdW5jdGlvbiAoKSB7XG4gIC8qKlxuICAgKiBDcmVhdGVzIGEgbmV3IFBvcHBlci5qcyBpbnN0YW5jZS5cbiAgICogQGNsYXNzIFBvcHBlclxuICAgKiBAcGFyYW0ge0hUTUxFbGVtZW50fHJlZmVyZW5jZU9iamVjdH0gcmVmZXJlbmNlIC0gVGhlIHJlZmVyZW5jZSBlbGVtZW50IHVzZWQgdG8gcG9zaXRpb24gdGhlIHBvcHBlclxuICAgKiBAcGFyYW0ge0hUTUxFbGVtZW50fSBwb3BwZXIgLSBUaGUgSFRNTCBlbGVtZW50IHVzZWQgYXMgdGhlIHBvcHBlclxuICAgKiBAcGFyYW0ge09iamVjdH0gb3B0aW9ucyAtIFlvdXIgY3VzdG9tIG9wdGlvbnMgdG8gb3ZlcnJpZGUgdGhlIG9uZXMgZGVmaW5lZCBpbiBbRGVmYXVsdHNdKCNkZWZhdWx0cylcbiAgICogQHJldHVybiB7T2JqZWN0fSBpbnN0YW5jZSAtIFRoZSBnZW5lcmF0ZWQgUG9wcGVyLmpzIGluc3RhbmNlXG4gICAqL1xuICBmdW5jdGlvbiBQb3BwZXIocmVmZXJlbmNlLCBwb3BwZXIpIHtcbiAgICB2YXIgX3RoaXMgPSB0aGlzO1xuXG4gICAgdmFyIG9wdGlvbnMgPSBhcmd1bWVudHMubGVuZ3RoID4gMiAmJiBhcmd1bWVudHNbMl0gIT09IHVuZGVmaW5lZCA/IGFyZ3VtZW50c1syXSA6IHt9O1xuICAgIGNsYXNzQ2FsbENoZWNrKHRoaXMsIFBvcHBlcik7XG5cbiAgICB0aGlzLnNjaGVkdWxlVXBkYXRlID0gZnVuY3Rpb24gKCkge1xuICAgICAgcmV0dXJuIHJlcXVlc3RBbmltYXRpb25GcmFtZShfdGhpcy51cGRhdGUpO1xuICAgIH07XG5cbiAgICAvLyBtYWtlIHVwZGF0ZSgpIGRlYm91bmNlZCwgc28gdGhhdCBpdCBvbmx5IHJ1bnMgYXQgbW9zdCBvbmNlLXBlci10aWNrXG4gICAgdGhpcy51cGRhdGUgPSBkZWJvdW5jZSh0aGlzLnVwZGF0ZS5iaW5kKHRoaXMpKTtcblxuICAgIC8vIHdpdGgge30gd2UgY3JlYXRlIGEgbmV3IG9iamVjdCB3aXRoIHRoZSBvcHRpb25zIGluc2lkZSBpdFxuICAgIHRoaXMub3B0aW9ucyA9IF9leHRlbmRzKHt9LCBQb3BwZXIuRGVmYXVsdHMsIG9wdGlvbnMpO1xuXG4gICAgLy8gaW5pdCBzdGF0ZVxuICAgIHRoaXMuc3RhdGUgPSB7XG4gICAgICBpc0Rlc3Ryb3llZDogZmFsc2UsXG4gICAgICBpc0NyZWF0ZWQ6IGZhbHNlLFxuICAgICAgc2Nyb2xsUGFyZW50czogW11cbiAgICB9O1xuXG4gICAgLy8gZ2V0IHJlZmVyZW5jZSBhbmQgcG9wcGVyIGVsZW1lbnRzIChhbGxvdyBqUXVlcnkgd3JhcHBlcnMpXG4gICAgdGhpcy5yZWZlcmVuY2UgPSByZWZlcmVuY2UgJiYgcmVmZXJlbmNlLmpxdWVyeSA/IHJlZmVyZW5jZVswXSA6IHJlZmVyZW5jZTtcbiAgICB0aGlzLnBvcHBlciA9IHBvcHBlciAmJiBwb3BwZXIuanF1ZXJ5ID8gcG9wcGVyWzBdIDogcG9wcGVyO1xuXG4gICAgLy8gRGVlcCBtZXJnZSBtb2RpZmllcnMgb3B0aW9uc1xuICAgIHRoaXMub3B0aW9ucy5tb2RpZmllcnMgPSB7fTtcbiAgICBPYmplY3Qua2V5cyhfZXh0ZW5kcyh7fSwgUG9wcGVyLkRlZmF1bHRzLm1vZGlmaWVycywgb3B0aW9ucy5tb2RpZmllcnMpKS5mb3JFYWNoKGZ1bmN0aW9uIChuYW1lKSB7XG4gICAgICBfdGhpcy5vcHRpb25zLm1vZGlmaWVyc1tuYW1lXSA9IF9leHRlbmRzKHt9LCBQb3BwZXIuRGVmYXVsdHMubW9kaWZpZXJzW25hbWVdIHx8IHt9LCBvcHRpb25zLm1vZGlmaWVycyA/IG9wdGlvbnMubW9kaWZpZXJzW25hbWVdIDoge30pO1xuICAgIH0pO1xuXG4gICAgLy8gUmVmYWN0b3JpbmcgbW9kaWZpZXJzJyBsaXN0IChPYmplY3QgPT4gQXJyYXkpXG4gICAgdGhpcy5tb2RpZmllcnMgPSBPYmplY3Qua2V5cyh0aGlzLm9wdGlvbnMubW9kaWZpZXJzKS5tYXAoZnVuY3Rpb24gKG5hbWUpIHtcbiAgICAgIHJldHVybiBfZXh0ZW5kcyh7XG4gICAgICAgIG5hbWU6IG5hbWVcbiAgICAgIH0sIF90aGlzLm9wdGlvbnMubW9kaWZpZXJzW25hbWVdKTtcbiAgICB9KVxuICAgIC8vIHNvcnQgdGhlIG1vZGlmaWVycyBieSBvcmRlclxuICAgIC5zb3J0KGZ1bmN0aW9uIChhLCBiKSB7XG4gICAgICByZXR1cm4gYS5vcmRlciAtIGIub3JkZXI7XG4gICAgfSk7XG5cbiAgICAvLyBtb2RpZmllcnMgaGF2ZSB0aGUgYWJpbGl0eSB0byBleGVjdXRlIGFyYml0cmFyeSBjb2RlIHdoZW4gUG9wcGVyLmpzIGdldCBpbml0ZWRcbiAgICAvLyBzdWNoIGNvZGUgaXMgZXhlY3V0ZWQgaW4gdGhlIHNhbWUgb3JkZXIgb2YgaXRzIG1vZGlmaWVyXG4gICAgLy8gdGhleSBjb3VsZCBhZGQgbmV3IHByb3BlcnRpZXMgdG8gdGhlaXIgb3B0aW9ucyBjb25maWd1cmF0aW9uXG4gICAgLy8gQkUgQVdBUkU6IGRvbid0IGFkZCBvcHRpb25zIHRvIGBvcHRpb25zLm1vZGlmaWVycy5uYW1lYCBidXQgdG8gYG1vZGlmaWVyT3B0aW9uc2AhXG4gICAgdGhpcy5tb2RpZmllcnMuZm9yRWFjaChmdW5jdGlvbiAobW9kaWZpZXJPcHRpb25zKSB7XG4gICAgICBpZiAobW9kaWZpZXJPcHRpb25zLmVuYWJsZWQgJiYgaXNGdW5jdGlvbihtb2RpZmllck9wdGlvbnMub25Mb2FkKSkge1xuICAgICAgICBtb2RpZmllck9wdGlvbnMub25Mb2FkKF90aGlzLnJlZmVyZW5jZSwgX3RoaXMucG9wcGVyLCBfdGhpcy5vcHRpb25zLCBtb2RpZmllck9wdGlvbnMsIF90aGlzLnN0YXRlKTtcbiAgICAgIH1cbiAgICB9KTtcblxuICAgIC8vIGZpcmUgdGhlIGZpcnN0IHVwZGF0ZSB0byBwb3NpdGlvbiB0aGUgcG9wcGVyIGluIHRoZSByaWdodCBwbGFjZVxuICAgIHRoaXMudXBkYXRlKCk7XG5cbiAgICB2YXIgZXZlbnRzRW5hYmxlZCA9IHRoaXMub3B0aW9ucy5ldmVudHNFbmFibGVkO1xuICAgIGlmIChldmVudHNFbmFibGVkKSB7XG4gICAgICAvLyBzZXR1cCBldmVudCBsaXN0ZW5lcnMsIHRoZXkgd2lsbCB0YWtlIGNhcmUgb2YgdXBkYXRlIHRoZSBwb3NpdGlvbiBpbiBzcGVjaWZpYyBzaXR1YXRpb25zXG4gICAgICB0aGlzLmVuYWJsZUV2ZW50TGlzdGVuZXJzKCk7XG4gICAgfVxuXG4gICAgdGhpcy5zdGF0ZS5ldmVudHNFbmFibGVkID0gZXZlbnRzRW5hYmxlZDtcbiAgfVxuXG4gIC8vIFdlIGNhbid0IHVzZSBjbGFzcyBwcm9wZXJ0aWVzIGJlY2F1c2UgdGhleSBkb24ndCBnZXQgbGlzdGVkIGluIHRoZVxuICAvLyBjbGFzcyBwcm90b3R5cGUgYW5kIGJyZWFrIHN0dWZmIGxpa2UgU2lub24gc3R1YnNcblxuXG4gIGNyZWF0ZUNsYXNzKFBvcHBlciwgW3tcbiAgICBrZXk6ICd1cGRhdGUnLFxuICAgIHZhbHVlOiBmdW5jdGlvbiB1cGRhdGUkJDEoKSB7XG4gICAgICByZXR1cm4gdXBkYXRlLmNhbGwodGhpcyk7XG4gICAgfVxuICB9LCB7XG4gICAga2V5OiAnZGVzdHJveScsXG4gICAgdmFsdWU6IGZ1bmN0aW9uIGRlc3Ryb3kkJDEoKSB7XG4gICAgICByZXR1cm4gZGVzdHJveS5jYWxsKHRoaXMpO1xuICAgIH1cbiAgfSwge1xuICAgIGtleTogJ2VuYWJsZUV2ZW50TGlzdGVuZXJzJyxcbiAgICB2YWx1ZTogZnVuY3Rpb24gZW5hYmxlRXZlbnRMaXN0ZW5lcnMkJDEoKSB7XG4gICAgICByZXR1cm4gZW5hYmxlRXZlbnRMaXN0ZW5lcnMuY2FsbCh0aGlzKTtcbiAgICB9XG4gIH0sIHtcbiAgICBrZXk6ICdkaXNhYmxlRXZlbnRMaXN0ZW5lcnMnLFxuICAgIHZhbHVlOiBmdW5jdGlvbiBkaXNhYmxlRXZlbnRMaXN0ZW5lcnMkJDEoKSB7XG4gICAgICByZXR1cm4gZGlzYWJsZUV2ZW50TGlzdGVuZXJzLmNhbGwodGhpcyk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogU2NoZWR1bGVzIGFuIHVwZGF0ZS4gSXQgd2lsbCBydW4gb24gdGhlIG5leHQgVUkgdXBkYXRlIGF2YWlsYWJsZS5cbiAgICAgKiBAbWV0aG9kIHNjaGVkdWxlVXBkYXRlXG4gICAgICogQG1lbWJlcm9mIFBvcHBlclxuICAgICAqL1xuXG5cbiAgICAvKipcbiAgICAgKiBDb2xsZWN0aW9uIG9mIHV0aWxpdGllcyB1c2VmdWwgd2hlbiB3cml0aW5nIGN1c3RvbSBtb2RpZmllcnMuXG4gICAgICogU3RhcnRpbmcgZnJvbSB2ZXJzaW9uIDEuNywgdGhpcyBtZXRob2QgaXMgYXZhaWxhYmxlIG9ubHkgaWYgeW91XG4gICAgICogaW5jbHVkZSBgcG9wcGVyLXV0aWxzLmpzYCBiZWZvcmUgYHBvcHBlci5qc2AuXG4gICAgICpcbiAgICAgKiAqKkRFUFJFQ0FUSU9OKio6IFRoaXMgd2F5IHRvIGFjY2VzcyBQb3BwZXJVdGlscyBpcyBkZXByZWNhdGVkXG4gICAgICogYW5kIHdpbGwgYmUgcmVtb3ZlZCBpbiB2MiEgVXNlIHRoZSBQb3BwZXJVdGlscyBtb2R1bGUgZGlyZWN0bHkgaW5zdGVhZC5cbiAgICAgKiBEdWUgdG8gdGhlIGhpZ2ggaW5zdGFiaWxpdHkgb2YgdGhlIG1ldGhvZHMgY29udGFpbmVkIGluIFV0aWxzLCB3ZSBjYW4ndFxuICAgICAqIGd1YXJhbnRlZSB0aGVtIHRvIGZvbGxvdyBzZW12ZXIuIFVzZSB0aGVtIGF0IHlvdXIgb3duIHJpc2shXG4gICAgICogQHN0YXRpY1xuICAgICAqIEBwcml2YXRlXG4gICAgICogQHR5cGUge09iamVjdH1cbiAgICAgKiBAZGVwcmVjYXRlZCBzaW5jZSB2ZXJzaW9uIDEuOFxuICAgICAqIEBtZW1iZXIgVXRpbHNcbiAgICAgKiBAbWVtYmVyb2YgUG9wcGVyXG4gICAgICovXG5cbiAgfV0pO1xuICByZXR1cm4gUG9wcGVyO1xufSgpO1xuXG4vKipcbiAqIFRoZSBgcmVmZXJlbmNlT2JqZWN0YCBpcyBhbiBvYmplY3QgdGhhdCBwcm92aWRlcyBhbiBpbnRlcmZhY2UgY29tcGF0aWJsZSB3aXRoIFBvcHBlci5qc1xuICogYW5kIGxldHMgeW91IHVzZSBpdCBhcyByZXBsYWNlbWVudCBvZiBhIHJlYWwgRE9NIG5vZGUuPGJyIC8+XG4gKiBZb3UgY2FuIHVzZSB0aGlzIG1ldGhvZCB0byBwb3NpdGlvbiBhIHBvcHBlciByZWxhdGl2ZWx5IHRvIGEgc2V0IG9mIGNvb3JkaW5hdGVzXG4gKiBpbiBjYXNlIHlvdSBkb24ndCBoYXZlIGEgRE9NIG5vZGUgdG8gdXNlIGFzIHJlZmVyZW5jZS5cbiAqXG4gKiBgYGBcbiAqIG5ldyBQb3BwZXIocmVmZXJlbmNlT2JqZWN0LCBwb3BwZXJOb2RlKTtcbiAqIGBgYFxuICpcbiAqIE5COiBUaGlzIGZlYXR1cmUgaXNuJ3Qgc3VwcG9ydGVkIGluIEludGVybmV0IEV4cGxvcmVyIDEwLlxuICogQG5hbWUgcmVmZXJlbmNlT2JqZWN0XG4gKiBAcHJvcGVydHkge0Z1bmN0aW9ufSBkYXRhLmdldEJvdW5kaW5nQ2xpZW50UmVjdFxuICogQSBmdW5jdGlvbiB0aGF0IHJldHVybnMgYSBzZXQgb2YgY29vcmRpbmF0ZXMgY29tcGF0aWJsZSB3aXRoIHRoZSBuYXRpdmUgYGdldEJvdW5kaW5nQ2xpZW50UmVjdGAgbWV0aG9kLlxuICogQHByb3BlcnR5IHtudW1iZXJ9IGRhdGEuY2xpZW50V2lkdGhcbiAqIEFuIEVTNiBnZXR0ZXIgdGhhdCB3aWxsIHJldHVybiB0aGUgd2lkdGggb2YgdGhlIHZpcnR1YWwgcmVmZXJlbmNlIGVsZW1lbnQuXG4gKiBAcHJvcGVydHkge251bWJlcn0gZGF0YS5jbGllbnRIZWlnaHRcbiAqIEFuIEVTNiBnZXR0ZXIgdGhhdCB3aWxsIHJldHVybiB0aGUgaGVpZ2h0IG9mIHRoZSB2aXJ0dWFsIHJlZmVyZW5jZSBlbGVtZW50LlxuICovXG5cblxuUG9wcGVyLlV0aWxzID0gKHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnID8gd2luZG93IDogZ2xvYmFsKS5Qb3BwZXJVdGlscztcblBvcHBlci5wbGFjZW1lbnRzID0gcGxhY2VtZW50cztcblBvcHBlci5EZWZhdWx0cyA9IERlZmF1bHRzO1xuXG5yZXR1cm4gUG9wcGVyO1xuXG59KSkpO1xuLy8jIHNvdXJjZU1hcHBpbmdVUkw9cG9wcGVyLmpzLm1hcFxuXG4vKiFcbiAgKiBCb290c3RyYXAgdjQuMi4xIChodHRwczovL2dldGJvb3RzdHJhcC5jb20vKVxuICAqIENvcHlyaWdodCAyMDExLTIwMTggVGhlIEJvb3RzdHJhcCBBdXRob3JzIChodHRwczovL2dpdGh1Yi5jb20vdHdicy9ib290c3RyYXAvZ3JhcGhzL2NvbnRyaWJ1dG9ycylcbiAgKiBMaWNlbnNlZCB1bmRlciBNSVQgKGh0dHBzOi8vZ2l0aHViLmNvbS90d2JzL2Jvb3RzdHJhcC9ibG9iL21hc3Rlci9MSUNFTlNFKVxuICAqL1xuKGZ1bmN0aW9uIChnbG9iYWwsIGZhY3RvcnkpIHtcbiAgdHlwZW9mIGV4cG9ydHMgPT09ICdvYmplY3QnICYmIHR5cGVvZiBtb2R1bGUgIT09ICd1bmRlZmluZWQnID8gZmFjdG9yeShleHBvcnRzLCByZXF1aXJlKCdwb3BwZXIuanMnKSwgcmVxdWlyZSgnanF1ZXJ5JykpIDpcbiAgdHlwZW9mIGRlZmluZSA9PT0gJ2Z1bmN0aW9uJyAmJiBkZWZpbmUuYW1kID8gZGVmaW5lKFsnZXhwb3J0cycsICdwb3BwZXIuanMnLCAnanF1ZXJ5J10sIGZhY3RvcnkpIDpcbiAgKGZhY3RvcnkoKGdsb2JhbC5ib290c3RyYXAgPSB7fSksZ2xvYmFsLlBvcHBlcixnbG9iYWwualF1ZXJ5KSk7XG59KHRoaXMsIChmdW5jdGlvbiAoZXhwb3J0cyxQb3BwZXIsJCkgeyAndXNlIHN0cmljdCc7XG5cbiAgUG9wcGVyID0gUG9wcGVyICYmIFBvcHBlci5oYXNPd25Qcm9wZXJ0eSgnZGVmYXVsdCcpID8gUG9wcGVyWydkZWZhdWx0J10gOiBQb3BwZXI7XG4gICQgPSAkICYmICQuaGFzT3duUHJvcGVydHkoJ2RlZmF1bHQnKSA/ICRbJ2RlZmF1bHQnXSA6ICQ7XG5cbiAgZnVuY3Rpb24gX2RlZmluZVByb3BlcnRpZXModGFyZ2V0LCBwcm9wcykge1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgcHJvcHMubGVuZ3RoOyBpKyspIHtcbiAgICAgIHZhciBkZXNjcmlwdG9yID0gcHJvcHNbaV07XG4gICAgICBkZXNjcmlwdG9yLmVudW1lcmFibGUgPSBkZXNjcmlwdG9yLmVudW1lcmFibGUgfHwgZmFsc2U7XG4gICAgICBkZXNjcmlwdG9yLmNvbmZpZ3VyYWJsZSA9IHRydWU7XG4gICAgICBpZiAoXCJ2YWx1ZVwiIGluIGRlc2NyaXB0b3IpIGRlc2NyaXB0b3Iud3JpdGFibGUgPSB0cnVlO1xuICAgICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRhcmdldCwgZGVzY3JpcHRvci5rZXksIGRlc2NyaXB0b3IpO1xuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIF9jcmVhdGVDbGFzcyhDb25zdHJ1Y3RvciwgcHJvdG9Qcm9wcywgc3RhdGljUHJvcHMpIHtcbiAgICBpZiAocHJvdG9Qcm9wcykgX2RlZmluZVByb3BlcnRpZXMoQ29uc3RydWN0b3IucHJvdG90eXBlLCBwcm90b1Byb3BzKTtcbiAgICBpZiAoc3RhdGljUHJvcHMpIF9kZWZpbmVQcm9wZXJ0aWVzKENvbnN0cnVjdG9yLCBzdGF0aWNQcm9wcyk7XG4gICAgcmV0dXJuIENvbnN0cnVjdG9yO1xuICB9XG5cbiAgZnVuY3Rpb24gX2RlZmluZVByb3BlcnR5KG9iaiwga2V5LCB2YWx1ZSkge1xuICAgIGlmIChrZXkgaW4gb2JqKSB7XG4gICAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkob2JqLCBrZXksIHtcbiAgICAgICAgdmFsdWU6IHZhbHVlLFxuICAgICAgICBlbnVtZXJhYmxlOiB0cnVlLFxuICAgICAgICBjb25maWd1cmFibGU6IHRydWUsXG4gICAgICAgIHdyaXRhYmxlOiB0cnVlXG4gICAgICB9KTtcbiAgICB9IGVsc2Uge1xuICAgICAgb2JqW2tleV0gPSB2YWx1ZTtcbiAgICB9XG5cbiAgICByZXR1cm4gb2JqO1xuICB9XG5cbiAgZnVuY3Rpb24gX29iamVjdFNwcmVhZCh0YXJnZXQpIHtcbiAgICBmb3IgKHZhciBpID0gMTsgaSA8IGFyZ3VtZW50cy5sZW5ndGg7IGkrKykge1xuICAgICAgdmFyIHNvdXJjZSA9IGFyZ3VtZW50c1tpXSAhPSBudWxsID8gYXJndW1lbnRzW2ldIDoge307XG4gICAgICB2YXIgb3duS2V5cyA9IE9iamVjdC5rZXlzKHNvdXJjZSk7XG5cbiAgICAgIGlmICh0eXBlb2YgT2JqZWN0LmdldE93blByb3BlcnR5U3ltYm9scyA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICBvd25LZXlzID0gb3duS2V5cy5jb25jYXQoT2JqZWN0LmdldE93blByb3BlcnR5U3ltYm9scyhzb3VyY2UpLmZpbHRlcihmdW5jdGlvbiAoc3ltKSB7XG4gICAgICAgICAgcmV0dXJuIE9iamVjdC5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3Ioc291cmNlLCBzeW0pLmVudW1lcmFibGU7XG4gICAgICAgIH0pKTtcbiAgICAgIH1cblxuICAgICAgb3duS2V5cy5mb3JFYWNoKGZ1bmN0aW9uIChrZXkpIHtcbiAgICAgICAgX2RlZmluZVByb3BlcnR5KHRhcmdldCwga2V5LCBzb3VyY2Vba2V5XSk7XG4gICAgICB9KTtcbiAgICB9XG5cbiAgICByZXR1cm4gdGFyZ2V0O1xuICB9XG5cbiAgZnVuY3Rpb24gX2luaGVyaXRzTG9vc2Uoc3ViQ2xhc3MsIHN1cGVyQ2xhc3MpIHtcbiAgICBzdWJDbGFzcy5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKHN1cGVyQ2xhc3MucHJvdG90eXBlKTtcbiAgICBzdWJDbGFzcy5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBzdWJDbGFzcztcbiAgICBzdWJDbGFzcy5fX3Byb3RvX18gPSBzdXBlckNsYXNzO1xuICB9XG5cbiAgLyoqXG4gICAqIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAqIEJvb3RzdHJhcCAodjQuMi4xKTogdXRpbC5qc1xuICAgKiBMaWNlbnNlZCB1bmRlciBNSVQgKGh0dHBzOi8vZ2l0aHViLmNvbS90d2JzL2Jvb3RzdHJhcC9ibG9iL21hc3Rlci9MSUNFTlNFKVxuICAgKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgKi9cbiAgLyoqXG4gICAqIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgKiBQcml2YXRlIFRyYW5zaXRpb25FbmQgSGVscGVyc1xuICAgKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICovXG5cbiAgdmFyIFRSQU5TSVRJT05fRU5EID0gJ3RyYW5zaXRpb25lbmQnO1xuICB2YXIgTUFYX1VJRCA9IDEwMDAwMDA7XG4gIHZhciBNSUxMSVNFQ09ORFNfTVVMVElQTElFUiA9IDEwMDA7IC8vIFNob3V0b3V0IEFuZ3VzQ3JvbGwgKGh0dHBzOi8vZ29vLmdsL3B4d1FHcClcblxuICBmdW5jdGlvbiB0b1R5cGUob2JqKSB7XG4gICAgcmV0dXJuIHt9LnRvU3RyaW5nLmNhbGwob2JqKS5tYXRjaCgvXFxzKFthLXpdKykvaSlbMV0udG9Mb3dlckNhc2UoKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGdldFNwZWNpYWxUcmFuc2l0aW9uRW5kRXZlbnQoKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIGJpbmRUeXBlOiBUUkFOU0lUSU9OX0VORCxcbiAgICAgIGRlbGVnYXRlVHlwZTogVFJBTlNJVElPTl9FTkQsXG4gICAgICBoYW5kbGU6IGZ1bmN0aW9uIGhhbmRsZShldmVudCkge1xuICAgICAgICBpZiAoJChldmVudC50YXJnZXQpLmlzKHRoaXMpKSB7XG4gICAgICAgICAgcmV0dXJuIGV2ZW50LmhhbmRsZU9iai5oYW5kbGVyLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgcHJlZmVyLXJlc3QtcGFyYW1zXG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gdW5kZWZpbmVkOyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIG5vLXVuZGVmaW5lZFxuICAgICAgfVxuICAgIH07XG4gIH1cblxuICBmdW5jdGlvbiB0cmFuc2l0aW9uRW5kRW11bGF0b3IoZHVyYXRpb24pIHtcbiAgICB2YXIgX3RoaXMgPSB0aGlzO1xuXG4gICAgdmFyIGNhbGxlZCA9IGZhbHNlO1xuICAgICQodGhpcykub25lKFV0aWwuVFJBTlNJVElPTl9FTkQsIGZ1bmN0aW9uICgpIHtcbiAgICAgIGNhbGxlZCA9IHRydWU7XG4gICAgfSk7XG4gICAgc2V0VGltZW91dChmdW5jdGlvbiAoKSB7XG4gICAgICBpZiAoIWNhbGxlZCkge1xuICAgICAgICBVdGlsLnRyaWdnZXJUcmFuc2l0aW9uRW5kKF90aGlzKTtcbiAgICAgIH1cbiAgICB9LCBkdXJhdGlvbik7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICBmdW5jdGlvbiBzZXRUcmFuc2l0aW9uRW5kU3VwcG9ydCgpIHtcbiAgICAkLmZuLmVtdWxhdGVUcmFuc2l0aW9uRW5kID0gdHJhbnNpdGlvbkVuZEVtdWxhdG9yO1xuICAgICQuZXZlbnQuc3BlY2lhbFtVdGlsLlRSQU5TSVRJT05fRU5EXSA9IGdldFNwZWNpYWxUcmFuc2l0aW9uRW5kRXZlbnQoKTtcbiAgfVxuICAvKipcbiAgICogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICogUHVibGljIFV0aWwgQXBpXG4gICAqIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAqL1xuXG5cbiAgdmFyIFV0aWwgPSB7XG4gICAgVFJBTlNJVElPTl9FTkQ6ICdic1RyYW5zaXRpb25FbmQnLFxuICAgIGdldFVJRDogZnVuY3Rpb24gZ2V0VUlEKHByZWZpeCkge1xuICAgICAgZG8ge1xuICAgICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tYml0d2lzZVxuICAgICAgICBwcmVmaXggKz0gfn4oTWF0aC5yYW5kb20oKSAqIE1BWF9VSUQpOyAvLyBcIn5+XCIgYWN0cyBsaWtlIGEgZmFzdGVyIE1hdGguZmxvb3IoKSBoZXJlXG4gICAgICB9IHdoaWxlIChkb2N1bWVudC5nZXRFbGVtZW50QnlJZChwcmVmaXgpKTtcblxuICAgICAgcmV0dXJuIHByZWZpeDtcbiAgICB9LFxuICAgIGdldFNlbGVjdG9yRnJvbUVsZW1lbnQ6IGZ1bmN0aW9uIGdldFNlbGVjdG9yRnJvbUVsZW1lbnQoZWxlbWVudCkge1xuICAgICAgdmFyIHNlbGVjdG9yID0gZWxlbWVudC5nZXRBdHRyaWJ1dGUoJ2RhdGEtdGFyZ2V0Jyk7XG5cbiAgICAgIGlmICghc2VsZWN0b3IgfHwgc2VsZWN0b3IgPT09ICcjJykge1xuICAgICAgICB2YXIgaHJlZkF0dHIgPSBlbGVtZW50LmdldEF0dHJpYnV0ZSgnaHJlZicpO1xuICAgICAgICBzZWxlY3RvciA9IGhyZWZBdHRyICYmIGhyZWZBdHRyICE9PSAnIycgPyBocmVmQXR0ci50cmltKCkgOiAnJztcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHNlbGVjdG9yICYmIGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3Ioc2VsZWN0b3IpID8gc2VsZWN0b3IgOiBudWxsO1xuICAgIH0sXG4gICAgZ2V0VHJhbnNpdGlvbkR1cmF0aW9uRnJvbUVsZW1lbnQ6IGZ1bmN0aW9uIGdldFRyYW5zaXRpb25EdXJhdGlvbkZyb21FbGVtZW50KGVsZW1lbnQpIHtcbiAgICAgIGlmICghZWxlbWVudCkge1xuICAgICAgICByZXR1cm4gMDtcbiAgICAgIH0gLy8gR2V0IHRyYW5zaXRpb24tZHVyYXRpb24gb2YgdGhlIGVsZW1lbnRcblxuXG4gICAgICB2YXIgdHJhbnNpdGlvbkR1cmF0aW9uID0gJChlbGVtZW50KS5jc3MoJ3RyYW5zaXRpb24tZHVyYXRpb24nKTtcbiAgICAgIHZhciB0cmFuc2l0aW9uRGVsYXkgPSAkKGVsZW1lbnQpLmNzcygndHJhbnNpdGlvbi1kZWxheScpO1xuICAgICAgdmFyIGZsb2F0VHJhbnNpdGlvbkR1cmF0aW9uID0gcGFyc2VGbG9hdCh0cmFuc2l0aW9uRHVyYXRpb24pO1xuICAgICAgdmFyIGZsb2F0VHJhbnNpdGlvbkRlbGF5ID0gcGFyc2VGbG9hdCh0cmFuc2l0aW9uRGVsYXkpOyAvLyBSZXR1cm4gMCBpZiBlbGVtZW50IG9yIHRyYW5zaXRpb24gZHVyYXRpb24gaXMgbm90IGZvdW5kXG5cbiAgICAgIGlmICghZmxvYXRUcmFuc2l0aW9uRHVyYXRpb24gJiYgIWZsb2F0VHJhbnNpdGlvbkRlbGF5KSB7XG4gICAgICAgIHJldHVybiAwO1xuICAgICAgfSAvLyBJZiBtdWx0aXBsZSBkdXJhdGlvbnMgYXJlIGRlZmluZWQsIHRha2UgdGhlIGZpcnN0XG5cblxuICAgICAgdHJhbnNpdGlvbkR1cmF0aW9uID0gdHJhbnNpdGlvbkR1cmF0aW9uLnNwbGl0KCcsJylbMF07XG4gICAgICB0cmFuc2l0aW9uRGVsYXkgPSB0cmFuc2l0aW9uRGVsYXkuc3BsaXQoJywnKVswXTtcbiAgICAgIHJldHVybiAocGFyc2VGbG9hdCh0cmFuc2l0aW9uRHVyYXRpb24pICsgcGFyc2VGbG9hdCh0cmFuc2l0aW9uRGVsYXkpKSAqIE1JTExJU0VDT05EU19NVUxUSVBMSUVSO1xuICAgIH0sXG4gICAgcmVmbG93OiBmdW5jdGlvbiByZWZsb3coZWxlbWVudCkge1xuICAgICAgcmV0dXJuIGVsZW1lbnQub2Zmc2V0SGVpZ2h0O1xuICAgIH0sXG4gICAgdHJpZ2dlclRyYW5zaXRpb25FbmQ6IGZ1bmN0aW9uIHRyaWdnZXJUcmFuc2l0aW9uRW5kKGVsZW1lbnQpIHtcbiAgICAgICQoZWxlbWVudCkudHJpZ2dlcihUUkFOU0lUSU9OX0VORCk7XG4gICAgfSxcbiAgICAvLyBUT0RPOiBSZW1vdmUgaW4gdjVcbiAgICBzdXBwb3J0c1RyYW5zaXRpb25FbmQ6IGZ1bmN0aW9uIHN1cHBvcnRzVHJhbnNpdGlvbkVuZCgpIHtcbiAgICAgIHJldHVybiBCb29sZWFuKFRSQU5TSVRJT05fRU5EKTtcbiAgICB9LFxuICAgIGlzRWxlbWVudDogZnVuY3Rpb24gaXNFbGVtZW50KG9iaikge1xuICAgICAgcmV0dXJuIChvYmpbMF0gfHwgb2JqKS5ub2RlVHlwZTtcbiAgICB9LFxuICAgIHR5cGVDaGVja0NvbmZpZzogZnVuY3Rpb24gdHlwZUNoZWNrQ29uZmlnKGNvbXBvbmVudE5hbWUsIGNvbmZpZywgY29uZmlnVHlwZXMpIHtcbiAgICAgIGZvciAodmFyIHByb3BlcnR5IGluIGNvbmZpZ1R5cGVzKSB7XG4gICAgICAgIGlmIChPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwoY29uZmlnVHlwZXMsIHByb3BlcnR5KSkge1xuICAgICAgICAgIHZhciBleHBlY3RlZFR5cGVzID0gY29uZmlnVHlwZXNbcHJvcGVydHldO1xuICAgICAgICAgIHZhciB2YWx1ZSA9IGNvbmZpZ1twcm9wZXJ0eV07XG4gICAgICAgICAgdmFyIHZhbHVlVHlwZSA9IHZhbHVlICYmIFV0aWwuaXNFbGVtZW50KHZhbHVlKSA/ICdlbGVtZW50JyA6IHRvVHlwZSh2YWx1ZSk7XG5cbiAgICAgICAgICBpZiAoIW5ldyBSZWdFeHAoZXhwZWN0ZWRUeXBlcykudGVzdCh2YWx1ZVR5cGUpKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoY29tcG9uZW50TmFtZS50b1VwcGVyQ2FzZSgpICsgXCI6IFwiICsgKFwiT3B0aW9uIFxcXCJcIiArIHByb3BlcnR5ICsgXCJcXFwiIHByb3ZpZGVkIHR5cGUgXFxcIlwiICsgdmFsdWVUeXBlICsgXCJcXFwiIFwiKSArIChcImJ1dCBleHBlY3RlZCB0eXBlIFxcXCJcIiArIGV4cGVjdGVkVHlwZXMgKyBcIlxcXCIuXCIpKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9LFxuICAgIGZpbmRTaGFkb3dSb290OiBmdW5jdGlvbiBmaW5kU2hhZG93Um9vdChlbGVtZW50KSB7XG4gICAgICBpZiAoIWRvY3VtZW50LmRvY3VtZW50RWxlbWVudC5hdHRhY2hTaGFkb3cpIHtcbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICB9IC8vIENhbiBmaW5kIHRoZSBzaGFkb3cgcm9vdCBvdGhlcndpc2UgaXQnbGwgcmV0dXJuIHRoZSBkb2N1bWVudFxuXG5cbiAgICAgIGlmICh0eXBlb2YgZWxlbWVudC5nZXRSb290Tm9kZSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICB2YXIgcm9vdCA9IGVsZW1lbnQuZ2V0Um9vdE5vZGUoKTtcbiAgICAgICAgcmV0dXJuIHJvb3QgaW5zdGFuY2VvZiBTaGFkb3dSb290ID8gcm9vdCA6IG51bGw7XG4gICAgICB9XG5cbiAgICAgIGlmIChlbGVtZW50IGluc3RhbmNlb2YgU2hhZG93Um9vdCkge1xuICAgICAgICByZXR1cm4gZWxlbWVudDtcbiAgICAgIH0gLy8gd2hlbiB3ZSBkb24ndCBmaW5kIGEgc2hhZG93IHJvb3RcblxuXG4gICAgICBpZiAoIWVsZW1lbnQucGFyZW50Tm9kZSkge1xuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIFV0aWwuZmluZFNoYWRvd1Jvb3QoZWxlbWVudC5wYXJlbnROb2RlKTtcbiAgICB9XG4gIH07XG4gIHNldFRyYW5zaXRpb25FbmRTdXBwb3J0KCk7XG5cbiAgLyoqXG4gICAqIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgKiBDb25zdGFudHNcbiAgICogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAqL1xuXG4gIHZhciBOQU1FID0gJ2FsZXJ0JztcbiAgdmFyIFZFUlNJT04gPSAnNC4yLjEnO1xuICB2YXIgREFUQV9LRVkgPSAnYnMuYWxlcnQnO1xuICB2YXIgRVZFTlRfS0VZID0gXCIuXCIgKyBEQVRBX0tFWTtcbiAgdmFyIERBVEFfQVBJX0tFWSA9ICcuZGF0YS1hcGknO1xuICB2YXIgSlFVRVJZX05PX0NPTkZMSUNUID0gJC5mbltOQU1FXTtcbiAgdmFyIFNlbGVjdG9yID0ge1xuICAgIERJU01JU1M6ICdbZGF0YS1kaXNtaXNzPVwiYWxlcnRcIl0nXG4gIH07XG4gIHZhciBFdmVudCA9IHtcbiAgICBDTE9TRTogXCJjbG9zZVwiICsgRVZFTlRfS0VZLFxuICAgIENMT1NFRDogXCJjbG9zZWRcIiArIEVWRU5UX0tFWSxcbiAgICBDTElDS19EQVRBX0FQSTogXCJjbGlja1wiICsgRVZFTlRfS0VZICsgREFUQV9BUElfS0VZXG4gIH07XG4gIHZhciBDbGFzc05hbWUgPSB7XG4gICAgQUxFUlQ6ICdhbGVydCcsXG4gICAgRkFERTogJ2ZhZGUnLFxuICAgIFNIT1c6ICdzaG93J1xuICAgIC8qKlxuICAgICAqIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgICAqIENsYXNzIERlZmluaXRpb25cbiAgICAgKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICAgKi9cblxuICB9O1xuXG4gIHZhciBBbGVydCA9XG4gIC8qI19fUFVSRV9fKi9cbiAgZnVuY3Rpb24gKCkge1xuICAgIGZ1bmN0aW9uIEFsZXJ0KGVsZW1lbnQpIHtcbiAgICAgIHRoaXMuX2VsZW1lbnQgPSBlbGVtZW50O1xuICAgIH0gLy8gR2V0dGVyc1xuXG5cbiAgICB2YXIgX3Byb3RvID0gQWxlcnQucHJvdG90eXBlO1xuXG4gICAgLy8gUHVibGljXG4gICAgX3Byb3RvLmNsb3NlID0gZnVuY3Rpb24gY2xvc2UoZWxlbWVudCkge1xuICAgICAgdmFyIHJvb3RFbGVtZW50ID0gdGhpcy5fZWxlbWVudDtcblxuICAgICAgaWYgKGVsZW1lbnQpIHtcbiAgICAgICAgcm9vdEVsZW1lbnQgPSB0aGlzLl9nZXRSb290RWxlbWVudChlbGVtZW50KTtcbiAgICAgIH1cblxuICAgICAgdmFyIGN1c3RvbUV2ZW50ID0gdGhpcy5fdHJpZ2dlckNsb3NlRXZlbnQocm9vdEVsZW1lbnQpO1xuXG4gICAgICBpZiAoY3VzdG9tRXZlbnQuaXNEZWZhdWx0UHJldmVudGVkKCkpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICB0aGlzLl9yZW1vdmVFbGVtZW50KHJvb3RFbGVtZW50KTtcbiAgICB9O1xuXG4gICAgX3Byb3RvLmRpc3Bvc2UgPSBmdW5jdGlvbiBkaXNwb3NlKCkge1xuICAgICAgJC5yZW1vdmVEYXRhKHRoaXMuX2VsZW1lbnQsIERBVEFfS0VZKTtcbiAgICAgIHRoaXMuX2VsZW1lbnQgPSBudWxsO1xuICAgIH07IC8vIFByaXZhdGVcblxuXG4gICAgX3Byb3RvLl9nZXRSb290RWxlbWVudCA9IGZ1bmN0aW9uIF9nZXRSb290RWxlbWVudChlbGVtZW50KSB7XG4gICAgICB2YXIgc2VsZWN0b3IgPSBVdGlsLmdldFNlbGVjdG9yRnJvbUVsZW1lbnQoZWxlbWVudCk7XG4gICAgICB2YXIgcGFyZW50ID0gZmFsc2U7XG5cbiAgICAgIGlmIChzZWxlY3Rvcikge1xuICAgICAgICBwYXJlbnQgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKHNlbGVjdG9yKTtcbiAgICAgIH1cblxuICAgICAgaWYgKCFwYXJlbnQpIHtcbiAgICAgICAgcGFyZW50ID0gJChlbGVtZW50KS5jbG9zZXN0KFwiLlwiICsgQ2xhc3NOYW1lLkFMRVJUKVswXTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHBhcmVudDtcbiAgICB9O1xuXG4gICAgX3Byb3RvLl90cmlnZ2VyQ2xvc2VFdmVudCA9IGZ1bmN0aW9uIF90cmlnZ2VyQ2xvc2VFdmVudChlbGVtZW50KSB7XG4gICAgICB2YXIgY2xvc2VFdmVudCA9ICQuRXZlbnQoRXZlbnQuQ0xPU0UpO1xuICAgICAgJChlbGVtZW50KS50cmlnZ2VyKGNsb3NlRXZlbnQpO1xuICAgICAgcmV0dXJuIGNsb3NlRXZlbnQ7XG4gICAgfTtcblxuICAgIF9wcm90by5fcmVtb3ZlRWxlbWVudCA9IGZ1bmN0aW9uIF9yZW1vdmVFbGVtZW50KGVsZW1lbnQpIHtcbiAgICAgIHZhciBfdGhpcyA9IHRoaXM7XG5cbiAgICAgICQoZWxlbWVudCkucmVtb3ZlQ2xhc3MoQ2xhc3NOYW1lLlNIT1cpO1xuXG4gICAgICBpZiAoISQoZWxlbWVudCkuaGFzQ2xhc3MoQ2xhc3NOYW1lLkZBREUpKSB7XG4gICAgICAgIHRoaXMuX2Rlc3Ryb3lFbGVtZW50KGVsZW1lbnQpO1xuXG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgdmFyIHRyYW5zaXRpb25EdXJhdGlvbiA9IFV0aWwuZ2V0VHJhbnNpdGlvbkR1cmF0aW9uRnJvbUVsZW1lbnQoZWxlbWVudCk7XG4gICAgICAkKGVsZW1lbnQpLm9uZShVdGlsLlRSQU5TSVRJT05fRU5ELCBmdW5jdGlvbiAoZXZlbnQpIHtcbiAgICAgICAgcmV0dXJuIF90aGlzLl9kZXN0cm95RWxlbWVudChlbGVtZW50LCBldmVudCk7XG4gICAgICB9KS5lbXVsYXRlVHJhbnNpdGlvbkVuZCh0cmFuc2l0aW9uRHVyYXRpb24pO1xuICAgIH07XG5cbiAgICBfcHJvdG8uX2Rlc3Ryb3lFbGVtZW50ID0gZnVuY3Rpb24gX2Rlc3Ryb3lFbGVtZW50KGVsZW1lbnQpIHtcbiAgICAgICQoZWxlbWVudCkuZGV0YWNoKCkudHJpZ2dlcihFdmVudC5DTE9TRUQpLnJlbW92ZSgpO1xuICAgIH07IC8vIFN0YXRpY1xuXG5cbiAgICBBbGVydC5falF1ZXJ5SW50ZXJmYWNlID0gZnVuY3Rpb24gX2pRdWVyeUludGVyZmFjZShjb25maWcpIHtcbiAgICAgIHJldHVybiB0aGlzLmVhY2goZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgJGVsZW1lbnQgPSAkKHRoaXMpO1xuICAgICAgICB2YXIgZGF0YSA9ICRlbGVtZW50LmRhdGEoREFUQV9LRVkpO1xuXG4gICAgICAgIGlmICghZGF0YSkge1xuICAgICAgICAgIGRhdGEgPSBuZXcgQWxlcnQodGhpcyk7XG4gICAgICAgICAgJGVsZW1lbnQuZGF0YShEQVRBX0tFWSwgZGF0YSk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoY29uZmlnID09PSAnY2xvc2UnKSB7XG4gICAgICAgICAgZGF0YVtjb25maWddKHRoaXMpO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9O1xuXG4gICAgQWxlcnQuX2hhbmRsZURpc21pc3MgPSBmdW5jdGlvbiBfaGFuZGxlRGlzbWlzcyhhbGVydEluc3RhbmNlKSB7XG4gICAgICByZXR1cm4gZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgICAgIGlmIChldmVudCkge1xuICAgICAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgIH1cblxuICAgICAgICBhbGVydEluc3RhbmNlLmNsb3NlKHRoaXMpO1xuICAgICAgfTtcbiAgICB9O1xuXG4gICAgX2NyZWF0ZUNsYXNzKEFsZXJ0LCBudWxsLCBbe1xuICAgICAga2V5OiBcIlZFUlNJT05cIixcbiAgICAgIGdldDogZnVuY3Rpb24gZ2V0KCkge1xuICAgICAgICByZXR1cm4gVkVSU0lPTjtcbiAgICAgIH1cbiAgICB9XSk7XG5cbiAgICByZXR1cm4gQWxlcnQ7XG4gIH0oKTtcbiAgLyoqXG4gICAqIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgKiBEYXRhIEFwaSBpbXBsZW1lbnRhdGlvblxuICAgKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICovXG5cblxuICAkKGRvY3VtZW50KS5vbihFdmVudC5DTElDS19EQVRBX0FQSSwgU2VsZWN0b3IuRElTTUlTUywgQWxlcnQuX2hhbmRsZURpc21pc3MobmV3IEFsZXJ0KCkpKTtcbiAgLyoqXG4gICAqIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgKiBqUXVlcnlcbiAgICogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAqL1xuXG4gICQuZm5bTkFNRV0gPSBBbGVydC5falF1ZXJ5SW50ZXJmYWNlO1xuICAkLmZuW05BTUVdLkNvbnN0cnVjdG9yID0gQWxlcnQ7XG5cbiAgJC5mbltOQU1FXS5ub0NvbmZsaWN0ID0gZnVuY3Rpb24gKCkge1xuICAgICQuZm5bTkFNRV0gPSBKUVVFUllfTk9fQ09ORkxJQ1Q7XG4gICAgcmV0dXJuIEFsZXJ0Ll9qUXVlcnlJbnRlcmZhY2U7XG4gIH07XG5cbiAgLyoqXG4gICAqIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgKiBDb25zdGFudHNcbiAgICogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAqL1xuXG4gIHZhciBOQU1FJDEgPSAnYnV0dG9uJztcbiAgdmFyIFZFUlNJT04kMSA9ICc0LjIuMSc7XG4gIHZhciBEQVRBX0tFWSQxID0gJ2JzLmJ1dHRvbic7XG4gIHZhciBFVkVOVF9LRVkkMSA9IFwiLlwiICsgREFUQV9LRVkkMTtcbiAgdmFyIERBVEFfQVBJX0tFWSQxID0gJy5kYXRhLWFwaSc7XG4gIHZhciBKUVVFUllfTk9fQ09ORkxJQ1QkMSA9ICQuZm5bTkFNRSQxXTtcbiAgdmFyIENsYXNzTmFtZSQxID0ge1xuICAgIEFDVElWRTogJ2FjdGl2ZScsXG4gICAgQlVUVE9OOiAnYnRuJyxcbiAgICBGT0NVUzogJ2ZvY3VzJ1xuICB9O1xuICB2YXIgU2VsZWN0b3IkMSA9IHtcbiAgICBEQVRBX1RPR0dMRV9DQVJST1Q6ICdbZGF0YS10b2dnbGVePVwiYnV0dG9uXCJdJyxcbiAgICBEQVRBX1RPR0dMRTogJ1tkYXRhLXRvZ2dsZT1cImJ1dHRvbnNcIl0nLFxuICAgIElOUFVUOiAnaW5wdXQ6bm90KFt0eXBlPVwiaGlkZGVuXCJdKScsXG4gICAgQUNUSVZFOiAnLmFjdGl2ZScsXG4gICAgQlVUVE9OOiAnLmJ0bidcbiAgfTtcbiAgdmFyIEV2ZW50JDEgPSB7XG4gICAgQ0xJQ0tfREFUQV9BUEk6IFwiY2xpY2tcIiArIEVWRU5UX0tFWSQxICsgREFUQV9BUElfS0VZJDEsXG4gICAgRk9DVVNfQkxVUl9EQVRBX0FQSTogXCJmb2N1c1wiICsgRVZFTlRfS0VZJDEgKyBEQVRBX0FQSV9LRVkkMSArIFwiIFwiICsgKFwiYmx1clwiICsgRVZFTlRfS0VZJDEgKyBEQVRBX0FQSV9LRVkkMSlcbiAgICAvKipcbiAgICAgKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICAgKiBDbGFzcyBEZWZpbml0aW9uXG4gICAgICogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAgICovXG5cbiAgfTtcblxuICB2YXIgQnV0dG9uID1cbiAgLyojX19QVVJFX18qL1xuICBmdW5jdGlvbiAoKSB7XG4gICAgZnVuY3Rpb24gQnV0dG9uKGVsZW1lbnQpIHtcbiAgICAgIHRoaXMuX2VsZW1lbnQgPSBlbGVtZW50O1xuICAgIH0gLy8gR2V0dGVyc1xuXG5cbiAgICB2YXIgX3Byb3RvID0gQnV0dG9uLnByb3RvdHlwZTtcblxuICAgIC8vIFB1YmxpY1xuICAgIF9wcm90by50b2dnbGUgPSBmdW5jdGlvbiB0b2dnbGUoKSB7XG4gICAgICB2YXIgdHJpZ2dlckNoYW5nZUV2ZW50ID0gdHJ1ZTtcbiAgICAgIHZhciBhZGRBcmlhUHJlc3NlZCA9IHRydWU7XG4gICAgICB2YXIgcm9vdEVsZW1lbnQgPSAkKHRoaXMuX2VsZW1lbnQpLmNsb3Nlc3QoU2VsZWN0b3IkMS5EQVRBX1RPR0dMRSlbMF07XG5cbiAgICAgIGlmIChyb290RWxlbWVudCkge1xuICAgICAgICB2YXIgaW5wdXQgPSB0aGlzLl9lbGVtZW50LnF1ZXJ5U2VsZWN0b3IoU2VsZWN0b3IkMS5JTlBVVCk7XG5cbiAgICAgICAgaWYgKGlucHV0KSB7XG4gICAgICAgICAgaWYgKGlucHV0LnR5cGUgPT09ICdyYWRpbycpIHtcbiAgICAgICAgICAgIGlmIChpbnB1dC5jaGVja2VkICYmIHRoaXMuX2VsZW1lbnQuY2xhc3NMaXN0LmNvbnRhaW5zKENsYXNzTmFtZSQxLkFDVElWRSkpIHtcbiAgICAgICAgICAgICAgdHJpZ2dlckNoYW5nZUV2ZW50ID0gZmFsc2U7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICB2YXIgYWN0aXZlRWxlbWVudCA9IHJvb3RFbGVtZW50LnF1ZXJ5U2VsZWN0b3IoU2VsZWN0b3IkMS5BQ1RJVkUpO1xuXG4gICAgICAgICAgICAgIGlmIChhY3RpdmVFbGVtZW50KSB7XG4gICAgICAgICAgICAgICAgJChhY3RpdmVFbGVtZW50KS5yZW1vdmVDbGFzcyhDbGFzc05hbWUkMS5BQ1RJVkUpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgaWYgKHRyaWdnZXJDaGFuZ2VFdmVudCkge1xuICAgICAgICAgICAgaWYgKGlucHV0Lmhhc0F0dHJpYnV0ZSgnZGlzYWJsZWQnKSB8fCByb290RWxlbWVudC5oYXNBdHRyaWJ1dGUoJ2Rpc2FibGVkJykgfHwgaW5wdXQuY2xhc3NMaXN0LmNvbnRhaW5zKCdkaXNhYmxlZCcpIHx8IHJvb3RFbGVtZW50LmNsYXNzTGlzdC5jb250YWlucygnZGlzYWJsZWQnKSkge1xuICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlucHV0LmNoZWNrZWQgPSAhdGhpcy5fZWxlbWVudC5jbGFzc0xpc3QuY29udGFpbnMoQ2xhc3NOYW1lJDEuQUNUSVZFKTtcbiAgICAgICAgICAgICQoaW5wdXQpLnRyaWdnZXIoJ2NoYW5nZScpO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIGlucHV0LmZvY3VzKCk7XG4gICAgICAgICAgYWRkQXJpYVByZXNzZWQgPSBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICBpZiAoYWRkQXJpYVByZXNzZWQpIHtcbiAgICAgICAgdGhpcy5fZWxlbWVudC5zZXRBdHRyaWJ1dGUoJ2FyaWEtcHJlc3NlZCcsICF0aGlzLl9lbGVtZW50LmNsYXNzTGlzdC5jb250YWlucyhDbGFzc05hbWUkMS5BQ1RJVkUpKTtcbiAgICAgIH1cblxuICAgICAgaWYgKHRyaWdnZXJDaGFuZ2VFdmVudCkge1xuICAgICAgICAkKHRoaXMuX2VsZW1lbnQpLnRvZ2dsZUNsYXNzKENsYXNzTmFtZSQxLkFDVElWRSk7XG4gICAgICB9XG4gICAgfTtcblxuICAgIF9wcm90by5kaXNwb3NlID0gZnVuY3Rpb24gZGlzcG9zZSgpIHtcbiAgICAgICQucmVtb3ZlRGF0YSh0aGlzLl9lbGVtZW50LCBEQVRBX0tFWSQxKTtcbiAgICAgIHRoaXMuX2VsZW1lbnQgPSBudWxsO1xuICAgIH07IC8vIFN0YXRpY1xuXG5cbiAgICBCdXR0b24uX2pRdWVyeUludGVyZmFjZSA9IGZ1bmN0aW9uIF9qUXVlcnlJbnRlcmZhY2UoY29uZmlnKSB7XG4gICAgICByZXR1cm4gdGhpcy5lYWNoKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIGRhdGEgPSAkKHRoaXMpLmRhdGEoREFUQV9LRVkkMSk7XG5cbiAgICAgICAgaWYgKCFkYXRhKSB7XG4gICAgICAgICAgZGF0YSA9IG5ldyBCdXR0b24odGhpcyk7XG4gICAgICAgICAgJCh0aGlzKS5kYXRhKERBVEFfS0VZJDEsIGRhdGEpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGNvbmZpZyA9PT0gJ3RvZ2dsZScpIHtcbiAgICAgICAgICBkYXRhW2NvbmZpZ10oKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfTtcblxuICAgIF9jcmVhdGVDbGFzcyhCdXR0b24sIG51bGwsIFt7XG4gICAgICBrZXk6IFwiVkVSU0lPTlwiLFxuICAgICAgZ2V0OiBmdW5jdGlvbiBnZXQoKSB7XG4gICAgICAgIHJldHVybiBWRVJTSU9OJDE7XG4gICAgICB9XG4gICAgfV0pO1xuXG4gICAgcmV0dXJuIEJ1dHRvbjtcbiAgfSgpO1xuICAvKipcbiAgICogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAqIERhdGEgQXBpIGltcGxlbWVudGF0aW9uXG4gICAqIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgKi9cblxuXG4gICQoZG9jdW1lbnQpLm9uKEV2ZW50JDEuQ0xJQ0tfREFUQV9BUEksIFNlbGVjdG9yJDEuREFUQV9UT0dHTEVfQ0FSUk9ULCBmdW5jdGlvbiAoZXZlbnQpIHtcbiAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgIHZhciBidXR0b24gPSBldmVudC50YXJnZXQ7XG5cbiAgICBpZiAoISQoYnV0dG9uKS5oYXNDbGFzcyhDbGFzc05hbWUkMS5CVVRUT04pKSB7XG4gICAgICBidXR0b24gPSAkKGJ1dHRvbikuY2xvc2VzdChTZWxlY3RvciQxLkJVVFRPTik7XG4gICAgfVxuXG4gICAgQnV0dG9uLl9qUXVlcnlJbnRlcmZhY2UuY2FsbCgkKGJ1dHRvbiksICd0b2dnbGUnKTtcbiAgfSkub24oRXZlbnQkMS5GT0NVU19CTFVSX0RBVEFfQVBJLCBTZWxlY3RvciQxLkRBVEFfVE9HR0xFX0NBUlJPVCwgZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgdmFyIGJ1dHRvbiA9ICQoZXZlbnQudGFyZ2V0KS5jbG9zZXN0KFNlbGVjdG9yJDEuQlVUVE9OKVswXTtcbiAgICAkKGJ1dHRvbikudG9nZ2xlQ2xhc3MoQ2xhc3NOYW1lJDEuRk9DVVMsIC9eZm9jdXMoaW4pPyQvLnRlc3QoZXZlbnQudHlwZSkpO1xuICB9KTtcbiAgLyoqXG4gICAqIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgKiBqUXVlcnlcbiAgICogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAqL1xuXG4gICQuZm5bTkFNRSQxXSA9IEJ1dHRvbi5falF1ZXJ5SW50ZXJmYWNlO1xuICAkLmZuW05BTUUkMV0uQ29uc3RydWN0b3IgPSBCdXR0b247XG5cbiAgJC5mbltOQU1FJDFdLm5vQ29uZmxpY3QgPSBmdW5jdGlvbiAoKSB7XG4gICAgJC5mbltOQU1FJDFdID0gSlFVRVJZX05PX0NPTkZMSUNUJDE7XG4gICAgcmV0dXJuIEJ1dHRvbi5falF1ZXJ5SW50ZXJmYWNlO1xuICB9O1xuXG4gIC8qKlxuICAgKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICogQ29uc3RhbnRzXG4gICAqIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgKi9cblxuICB2YXIgTkFNRSQyID0gJ2Nhcm91c2VsJztcbiAgdmFyIFZFUlNJT04kMiA9ICc0LjIuMSc7XG4gIHZhciBEQVRBX0tFWSQyID0gJ2JzLmNhcm91c2VsJztcbiAgdmFyIEVWRU5UX0tFWSQyID0gXCIuXCIgKyBEQVRBX0tFWSQyO1xuICB2YXIgREFUQV9BUElfS0VZJDIgPSAnLmRhdGEtYXBpJztcbiAgdmFyIEpRVUVSWV9OT19DT05GTElDVCQyID0gJC5mbltOQU1FJDJdO1xuICB2YXIgQVJST1dfTEVGVF9LRVlDT0RFID0gMzc7IC8vIEtleWJvYXJkRXZlbnQud2hpY2ggdmFsdWUgZm9yIGxlZnQgYXJyb3cga2V5XG5cbiAgdmFyIEFSUk9XX1JJR0hUX0tFWUNPREUgPSAzOTsgLy8gS2V5Ym9hcmRFdmVudC53aGljaCB2YWx1ZSBmb3IgcmlnaHQgYXJyb3cga2V5XG5cbiAgdmFyIFRPVUNIRVZFTlRfQ09NUEFUX1dBSVQgPSA1MDA7IC8vIFRpbWUgZm9yIG1vdXNlIGNvbXBhdCBldmVudHMgdG8gZmlyZSBhZnRlciB0b3VjaFxuXG4gIHZhciBTV0lQRV9USFJFU0hPTEQgPSA0MDtcbiAgdmFyIERlZmF1bHQgPSB7XG4gICAgaW50ZXJ2YWw6IDUwMDAsXG4gICAga2V5Ym9hcmQ6IHRydWUsXG4gICAgc2xpZGU6IGZhbHNlLFxuICAgIHBhdXNlOiAnaG92ZXInLFxuICAgIHdyYXA6IHRydWUsXG4gICAgdG91Y2g6IHRydWVcbiAgfTtcbiAgdmFyIERlZmF1bHRUeXBlID0ge1xuICAgIGludGVydmFsOiAnKG51bWJlcnxib29sZWFuKScsXG4gICAga2V5Ym9hcmQ6ICdib29sZWFuJyxcbiAgICBzbGlkZTogJyhib29sZWFufHN0cmluZyknLFxuICAgIHBhdXNlOiAnKHN0cmluZ3xib29sZWFuKScsXG4gICAgd3JhcDogJ2Jvb2xlYW4nLFxuICAgIHRvdWNoOiAnYm9vbGVhbidcbiAgfTtcbiAgdmFyIERpcmVjdGlvbiA9IHtcbiAgICBORVhUOiAnbmV4dCcsXG4gICAgUFJFVjogJ3ByZXYnLFxuICAgIExFRlQ6ICdsZWZ0JyxcbiAgICBSSUdIVDogJ3JpZ2h0J1xuICB9O1xuICB2YXIgRXZlbnQkMiA9IHtcbiAgICBTTElERTogXCJzbGlkZVwiICsgRVZFTlRfS0VZJDIsXG4gICAgU0xJRDogXCJzbGlkXCIgKyBFVkVOVF9LRVkkMixcbiAgICBLRVlET1dOOiBcImtleWRvd25cIiArIEVWRU5UX0tFWSQyLFxuICAgIE1PVVNFRU5URVI6IFwibW91c2VlbnRlclwiICsgRVZFTlRfS0VZJDIsXG4gICAgTU9VU0VMRUFWRTogXCJtb3VzZWxlYXZlXCIgKyBFVkVOVF9LRVkkMixcbiAgICBUT1VDSFNUQVJUOiBcInRvdWNoc3RhcnRcIiArIEVWRU5UX0tFWSQyLFxuICAgIFRPVUNITU9WRTogXCJ0b3VjaG1vdmVcIiArIEVWRU5UX0tFWSQyLFxuICAgIFRPVUNIRU5EOiBcInRvdWNoZW5kXCIgKyBFVkVOVF9LRVkkMixcbiAgICBQT0lOVEVSRE9XTjogXCJwb2ludGVyZG93blwiICsgRVZFTlRfS0VZJDIsXG4gICAgUE9JTlRFUlVQOiBcInBvaW50ZXJ1cFwiICsgRVZFTlRfS0VZJDIsXG4gICAgRFJBR19TVEFSVDogXCJkcmFnc3RhcnRcIiArIEVWRU5UX0tFWSQyLFxuICAgIExPQURfREFUQV9BUEk6IFwibG9hZFwiICsgRVZFTlRfS0VZJDIgKyBEQVRBX0FQSV9LRVkkMixcbiAgICBDTElDS19EQVRBX0FQSTogXCJjbGlja1wiICsgRVZFTlRfS0VZJDIgKyBEQVRBX0FQSV9LRVkkMlxuICB9O1xuICB2YXIgQ2xhc3NOYW1lJDIgPSB7XG4gICAgQ0FST1VTRUw6ICdjYXJvdXNlbCcsXG4gICAgQUNUSVZFOiAnYWN0aXZlJyxcbiAgICBTTElERTogJ3NsaWRlJyxcbiAgICBSSUdIVDogJ2Nhcm91c2VsLWl0ZW0tcmlnaHQnLFxuICAgIExFRlQ6ICdjYXJvdXNlbC1pdGVtLWxlZnQnLFxuICAgIE5FWFQ6ICdjYXJvdXNlbC1pdGVtLW5leHQnLFxuICAgIFBSRVY6ICdjYXJvdXNlbC1pdGVtLXByZXYnLFxuICAgIElURU06ICdjYXJvdXNlbC1pdGVtJyxcbiAgICBQT0lOVEVSX0VWRU5UOiAncG9pbnRlci1ldmVudCdcbiAgfTtcbiAgdmFyIFNlbGVjdG9yJDIgPSB7XG4gICAgQUNUSVZFOiAnLmFjdGl2ZScsXG4gICAgQUNUSVZFX0lURU06ICcuYWN0aXZlLmNhcm91c2VsLWl0ZW0nLFxuICAgIElURU06ICcuY2Fyb3VzZWwtaXRlbScsXG4gICAgSVRFTV9JTUc6ICcuY2Fyb3VzZWwtaXRlbSBpbWcnLFxuICAgIE5FWFRfUFJFVjogJy5jYXJvdXNlbC1pdGVtLW5leHQsIC5jYXJvdXNlbC1pdGVtLXByZXYnLFxuICAgIElORElDQVRPUlM6ICcuY2Fyb3VzZWwtaW5kaWNhdG9ycycsXG4gICAgREFUQV9TTElERTogJ1tkYXRhLXNsaWRlXSwgW2RhdGEtc2xpZGUtdG9dJyxcbiAgICBEQVRBX1JJREU6ICdbZGF0YS1yaWRlPVwiY2Fyb3VzZWxcIl0nXG4gIH07XG4gIHZhciBQb2ludGVyVHlwZSA9IHtcbiAgICBUT1VDSDogJ3RvdWNoJyxcbiAgICBQRU46ICdwZW4nXG4gICAgLyoqXG4gICAgICogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAgICogQ2xhc3MgRGVmaW5pdGlvblxuICAgICAqIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgICAqL1xuXG4gIH07XG5cbiAgdmFyIENhcm91c2VsID1cbiAgLyojX19QVVJFX18qL1xuICBmdW5jdGlvbiAoKSB7XG4gICAgZnVuY3Rpb24gQ2Fyb3VzZWwoZWxlbWVudCwgY29uZmlnKSB7XG4gICAgICB0aGlzLl9pdGVtcyA9IG51bGw7XG4gICAgICB0aGlzLl9pbnRlcnZhbCA9IG51bGw7XG4gICAgICB0aGlzLl9hY3RpdmVFbGVtZW50ID0gbnVsbDtcbiAgICAgIHRoaXMuX2lzUGF1c2VkID0gZmFsc2U7XG4gICAgICB0aGlzLl9pc1NsaWRpbmcgPSBmYWxzZTtcbiAgICAgIHRoaXMudG91Y2hUaW1lb3V0ID0gbnVsbDtcbiAgICAgIHRoaXMudG91Y2hTdGFydFggPSAwO1xuICAgICAgdGhpcy50b3VjaERlbHRhWCA9IDA7XG4gICAgICB0aGlzLl9jb25maWcgPSB0aGlzLl9nZXRDb25maWcoY29uZmlnKTtcbiAgICAgIHRoaXMuX2VsZW1lbnQgPSBlbGVtZW50O1xuICAgICAgdGhpcy5faW5kaWNhdG9yc0VsZW1lbnQgPSB0aGlzLl9lbGVtZW50LnF1ZXJ5U2VsZWN0b3IoU2VsZWN0b3IkMi5JTkRJQ0FUT1JTKTtcbiAgICAgIHRoaXMuX3RvdWNoU3VwcG9ydGVkID0gJ29udG91Y2hzdGFydCcgaW4gZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50IHx8IG5hdmlnYXRvci5tYXhUb3VjaFBvaW50cyA+IDA7XG4gICAgICB0aGlzLl9wb2ludGVyRXZlbnQgPSBCb29sZWFuKHdpbmRvdy5Qb2ludGVyRXZlbnQgfHwgd2luZG93Lk1TUG9pbnRlckV2ZW50KTtcblxuICAgICAgdGhpcy5fYWRkRXZlbnRMaXN0ZW5lcnMoKTtcbiAgICB9IC8vIEdldHRlcnNcblxuXG4gICAgdmFyIF9wcm90byA9IENhcm91c2VsLnByb3RvdHlwZTtcblxuICAgIC8vIFB1YmxpY1xuICAgIF9wcm90by5uZXh0ID0gZnVuY3Rpb24gbmV4dCgpIHtcbiAgICAgIGlmICghdGhpcy5faXNTbGlkaW5nKSB7XG4gICAgICAgIHRoaXMuX3NsaWRlKERpcmVjdGlvbi5ORVhUKTtcbiAgICAgIH1cbiAgICB9O1xuXG4gICAgX3Byb3RvLm5leHRXaGVuVmlzaWJsZSA9IGZ1bmN0aW9uIG5leHRXaGVuVmlzaWJsZSgpIHtcbiAgICAgIC8vIERvbid0IGNhbGwgbmV4dCB3aGVuIHRoZSBwYWdlIGlzbid0IHZpc2libGVcbiAgICAgIC8vIG9yIHRoZSBjYXJvdXNlbCBvciBpdHMgcGFyZW50IGlzbid0IHZpc2libGVcbiAgICAgIGlmICghZG9jdW1lbnQuaGlkZGVuICYmICQodGhpcy5fZWxlbWVudCkuaXMoJzp2aXNpYmxlJykgJiYgJCh0aGlzLl9lbGVtZW50KS5jc3MoJ3Zpc2liaWxpdHknKSAhPT0gJ2hpZGRlbicpIHtcbiAgICAgICAgdGhpcy5uZXh0KCk7XG4gICAgICB9XG4gICAgfTtcblxuICAgIF9wcm90by5wcmV2ID0gZnVuY3Rpb24gcHJldigpIHtcbiAgICAgIGlmICghdGhpcy5faXNTbGlkaW5nKSB7XG4gICAgICAgIHRoaXMuX3NsaWRlKERpcmVjdGlvbi5QUkVWKTtcbiAgICAgIH1cbiAgICB9O1xuXG4gICAgX3Byb3RvLnBhdXNlID0gZnVuY3Rpb24gcGF1c2UoZXZlbnQpIHtcbiAgICAgIGlmICghZXZlbnQpIHtcbiAgICAgICAgdGhpcy5faXNQYXVzZWQgPSB0cnVlO1xuICAgICAgfVxuXG4gICAgICBpZiAodGhpcy5fZWxlbWVudC5xdWVyeVNlbGVjdG9yKFNlbGVjdG9yJDIuTkVYVF9QUkVWKSkge1xuICAgICAgICBVdGlsLnRyaWdnZXJUcmFuc2l0aW9uRW5kKHRoaXMuX2VsZW1lbnQpO1xuICAgICAgICB0aGlzLmN5Y2xlKHRydWUpO1xuICAgICAgfVxuXG4gICAgICBjbGVhckludGVydmFsKHRoaXMuX2ludGVydmFsKTtcbiAgICAgIHRoaXMuX2ludGVydmFsID0gbnVsbDtcbiAgICB9O1xuXG4gICAgX3Byb3RvLmN5Y2xlID0gZnVuY3Rpb24gY3ljbGUoZXZlbnQpIHtcbiAgICAgIGlmICghZXZlbnQpIHtcbiAgICAgICAgdGhpcy5faXNQYXVzZWQgPSBmYWxzZTtcbiAgICAgIH1cblxuICAgICAgaWYgKHRoaXMuX2ludGVydmFsKSB7XG4gICAgICAgIGNsZWFySW50ZXJ2YWwodGhpcy5faW50ZXJ2YWwpO1xuICAgICAgICB0aGlzLl9pbnRlcnZhbCA9IG51bGw7XG4gICAgICB9XG5cbiAgICAgIGlmICh0aGlzLl9jb25maWcuaW50ZXJ2YWwgJiYgIXRoaXMuX2lzUGF1c2VkKSB7XG4gICAgICAgIHRoaXMuX2ludGVydmFsID0gc2V0SW50ZXJ2YWwoKGRvY3VtZW50LnZpc2liaWxpdHlTdGF0ZSA/IHRoaXMubmV4dFdoZW5WaXNpYmxlIDogdGhpcy5uZXh0KS5iaW5kKHRoaXMpLCB0aGlzLl9jb25maWcuaW50ZXJ2YWwpO1xuICAgICAgfVxuICAgIH07XG5cbiAgICBfcHJvdG8udG8gPSBmdW5jdGlvbiB0byhpbmRleCkge1xuICAgICAgdmFyIF90aGlzID0gdGhpcztcblxuICAgICAgdGhpcy5fYWN0aXZlRWxlbWVudCA9IHRoaXMuX2VsZW1lbnQucXVlcnlTZWxlY3RvcihTZWxlY3RvciQyLkFDVElWRV9JVEVNKTtcblxuICAgICAgdmFyIGFjdGl2ZUluZGV4ID0gdGhpcy5fZ2V0SXRlbUluZGV4KHRoaXMuX2FjdGl2ZUVsZW1lbnQpO1xuXG4gICAgICBpZiAoaW5kZXggPiB0aGlzLl9pdGVtcy5sZW5ndGggLSAxIHx8IGluZGV4IDwgMCkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIGlmICh0aGlzLl9pc1NsaWRpbmcpIHtcbiAgICAgICAgJCh0aGlzLl9lbGVtZW50KS5vbmUoRXZlbnQkMi5TTElELCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgcmV0dXJuIF90aGlzLnRvKGluZGV4KTtcbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgaWYgKGFjdGl2ZUluZGV4ID09PSBpbmRleCkge1xuICAgICAgICB0aGlzLnBhdXNlKCk7XG4gICAgICAgIHRoaXMuY3ljbGUoKTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICB2YXIgZGlyZWN0aW9uID0gaW5kZXggPiBhY3RpdmVJbmRleCA/IERpcmVjdGlvbi5ORVhUIDogRGlyZWN0aW9uLlBSRVY7XG5cbiAgICAgIHRoaXMuX3NsaWRlKGRpcmVjdGlvbiwgdGhpcy5faXRlbXNbaW5kZXhdKTtcbiAgICB9O1xuXG4gICAgX3Byb3RvLmRpc3Bvc2UgPSBmdW5jdGlvbiBkaXNwb3NlKCkge1xuICAgICAgJCh0aGlzLl9lbGVtZW50KS5vZmYoRVZFTlRfS0VZJDIpO1xuICAgICAgJC5yZW1vdmVEYXRhKHRoaXMuX2VsZW1lbnQsIERBVEFfS0VZJDIpO1xuICAgICAgdGhpcy5faXRlbXMgPSBudWxsO1xuICAgICAgdGhpcy5fY29uZmlnID0gbnVsbDtcbiAgICAgIHRoaXMuX2VsZW1lbnQgPSBudWxsO1xuICAgICAgdGhpcy5faW50ZXJ2YWwgPSBudWxsO1xuICAgICAgdGhpcy5faXNQYXVzZWQgPSBudWxsO1xuICAgICAgdGhpcy5faXNTbGlkaW5nID0gbnVsbDtcbiAgICAgIHRoaXMuX2FjdGl2ZUVsZW1lbnQgPSBudWxsO1xuICAgICAgdGhpcy5faW5kaWNhdG9yc0VsZW1lbnQgPSBudWxsO1xuICAgIH07IC8vIFByaXZhdGVcblxuXG4gICAgX3Byb3RvLl9nZXRDb25maWcgPSBmdW5jdGlvbiBfZ2V0Q29uZmlnKGNvbmZpZykge1xuICAgICAgY29uZmlnID0gX29iamVjdFNwcmVhZCh7fSwgRGVmYXVsdCwgY29uZmlnKTtcbiAgICAgIFV0aWwudHlwZUNoZWNrQ29uZmlnKE5BTUUkMiwgY29uZmlnLCBEZWZhdWx0VHlwZSk7XG4gICAgICByZXR1cm4gY29uZmlnO1xuICAgIH07XG5cbiAgICBfcHJvdG8uX2hhbmRsZVN3aXBlID0gZnVuY3Rpb24gX2hhbmRsZVN3aXBlKCkge1xuICAgICAgdmFyIGFic0RlbHRheCA9IE1hdGguYWJzKHRoaXMudG91Y2hEZWx0YVgpO1xuXG4gICAgICBpZiAoYWJzRGVsdGF4IDw9IFNXSVBFX1RIUkVTSE9MRCkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIHZhciBkaXJlY3Rpb24gPSBhYnNEZWx0YXggLyB0aGlzLnRvdWNoRGVsdGFYOyAvLyBzd2lwZSBsZWZ0XG5cbiAgICAgIGlmIChkaXJlY3Rpb24gPiAwKSB7XG4gICAgICAgIHRoaXMucHJldigpO1xuICAgICAgfSAvLyBzd2lwZSByaWdodFxuXG5cbiAgICAgIGlmIChkaXJlY3Rpb24gPCAwKSB7XG4gICAgICAgIHRoaXMubmV4dCgpO1xuICAgICAgfVxuICAgIH07XG5cbiAgICBfcHJvdG8uX2FkZEV2ZW50TGlzdGVuZXJzID0gZnVuY3Rpb24gX2FkZEV2ZW50TGlzdGVuZXJzKCkge1xuICAgICAgdmFyIF90aGlzMiA9IHRoaXM7XG5cbiAgICAgIGlmICh0aGlzLl9jb25maWcua2V5Ym9hcmQpIHtcbiAgICAgICAgJCh0aGlzLl9lbGVtZW50KS5vbihFdmVudCQyLktFWURPV04sIGZ1bmN0aW9uIChldmVudCkge1xuICAgICAgICAgIHJldHVybiBfdGhpczIuX2tleWRvd24oZXZlbnQpO1xuICAgICAgICB9KTtcbiAgICAgIH1cblxuICAgICAgaWYgKHRoaXMuX2NvbmZpZy5wYXVzZSA9PT0gJ2hvdmVyJykge1xuICAgICAgICAkKHRoaXMuX2VsZW1lbnQpLm9uKEV2ZW50JDIuTU9VU0VFTlRFUiwgZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgICAgICAgcmV0dXJuIF90aGlzMi5wYXVzZShldmVudCk7XG4gICAgICAgIH0pLm9uKEV2ZW50JDIuTU9VU0VMRUFWRSwgZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgICAgICAgcmV0dXJuIF90aGlzMi5jeWNsZShldmVudCk7XG4gICAgICAgIH0pO1xuICAgICAgfVxuXG4gICAgICB0aGlzLl9hZGRUb3VjaEV2ZW50TGlzdGVuZXJzKCk7XG4gICAgfTtcblxuICAgIF9wcm90by5fYWRkVG91Y2hFdmVudExpc3RlbmVycyA9IGZ1bmN0aW9uIF9hZGRUb3VjaEV2ZW50TGlzdGVuZXJzKCkge1xuICAgICAgdmFyIF90aGlzMyA9IHRoaXM7XG5cbiAgICAgIGlmICghdGhpcy5fdG91Y2hTdXBwb3J0ZWQpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICB2YXIgc3RhcnQgPSBmdW5jdGlvbiBzdGFydChldmVudCkge1xuICAgICAgICBpZiAoX3RoaXMzLl9wb2ludGVyRXZlbnQgJiYgUG9pbnRlclR5cGVbZXZlbnQub3JpZ2luYWxFdmVudC5wb2ludGVyVHlwZS50b1VwcGVyQ2FzZSgpXSkge1xuICAgICAgICAgIF90aGlzMy50b3VjaFN0YXJ0WCA9IGV2ZW50Lm9yaWdpbmFsRXZlbnQuY2xpZW50WDtcbiAgICAgICAgfSBlbHNlIGlmICghX3RoaXMzLl9wb2ludGVyRXZlbnQpIHtcbiAgICAgICAgICBfdGhpczMudG91Y2hTdGFydFggPSBldmVudC5vcmlnaW5hbEV2ZW50LnRvdWNoZXNbMF0uY2xpZW50WDtcbiAgICAgICAgfVxuICAgICAgfTtcblxuICAgICAgdmFyIG1vdmUgPSBmdW5jdGlvbiBtb3ZlKGV2ZW50KSB7XG4gICAgICAgIC8vIGVuc3VyZSBzd2lwaW5nIHdpdGggb25lIHRvdWNoIGFuZCBub3QgcGluY2hpbmdcbiAgICAgICAgaWYgKGV2ZW50Lm9yaWdpbmFsRXZlbnQudG91Y2hlcyAmJiBldmVudC5vcmlnaW5hbEV2ZW50LnRvdWNoZXMubGVuZ3RoID4gMSkge1xuICAgICAgICAgIF90aGlzMy50b3VjaERlbHRhWCA9IDA7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgX3RoaXMzLnRvdWNoRGVsdGFYID0gZXZlbnQub3JpZ2luYWxFdmVudC50b3VjaGVzWzBdLmNsaWVudFggLSBfdGhpczMudG91Y2hTdGFydFg7XG4gICAgICAgIH1cbiAgICAgIH07XG5cbiAgICAgIHZhciBlbmQgPSBmdW5jdGlvbiBlbmQoZXZlbnQpIHtcbiAgICAgICAgaWYgKF90aGlzMy5fcG9pbnRlckV2ZW50ICYmIFBvaW50ZXJUeXBlW2V2ZW50Lm9yaWdpbmFsRXZlbnQucG9pbnRlclR5cGUudG9VcHBlckNhc2UoKV0pIHtcbiAgICAgICAgICBfdGhpczMudG91Y2hEZWx0YVggPSBldmVudC5vcmlnaW5hbEV2ZW50LmNsaWVudFggLSBfdGhpczMudG91Y2hTdGFydFg7XG4gICAgICAgIH1cblxuICAgICAgICBfdGhpczMuX2hhbmRsZVN3aXBlKCk7XG5cbiAgICAgICAgaWYgKF90aGlzMy5fY29uZmlnLnBhdXNlID09PSAnaG92ZXInKSB7XG4gICAgICAgICAgLy8gSWYgaXQncyBhIHRvdWNoLWVuYWJsZWQgZGV2aWNlLCBtb3VzZWVudGVyL2xlYXZlIGFyZSBmaXJlZCBhc1xuICAgICAgICAgIC8vIHBhcnQgb2YgdGhlIG1vdXNlIGNvbXBhdGliaWxpdHkgZXZlbnRzIG9uIGZpcnN0IHRhcCAtIHRoZSBjYXJvdXNlbFxuICAgICAgICAgIC8vIHdvdWxkIHN0b3AgY3ljbGluZyB1bnRpbCB1c2VyIHRhcHBlZCBvdXQgb2YgaXQ7XG4gICAgICAgICAgLy8gaGVyZSwgd2UgbGlzdGVuIGZvciB0b3VjaGVuZCwgZXhwbGljaXRseSBwYXVzZSB0aGUgY2Fyb3VzZWxcbiAgICAgICAgICAvLyAoYXMgaWYgaXQncyB0aGUgc2Vjb25kIHRpbWUgd2UgdGFwIG9uIGl0LCBtb3VzZWVudGVyIGNvbXBhdCBldmVudFxuICAgICAgICAgIC8vIGlzIE5PVCBmaXJlZCkgYW5kIGFmdGVyIGEgdGltZW91dCAodG8gYWxsb3cgZm9yIG1vdXNlIGNvbXBhdGliaWxpdHlcbiAgICAgICAgICAvLyBldmVudHMgdG8gZmlyZSkgd2UgZXhwbGljaXRseSByZXN0YXJ0IGN5Y2xpbmdcbiAgICAgICAgICBfdGhpczMucGF1c2UoKTtcblxuICAgICAgICAgIGlmIChfdGhpczMudG91Y2hUaW1lb3V0KSB7XG4gICAgICAgICAgICBjbGVhclRpbWVvdXQoX3RoaXMzLnRvdWNoVGltZW91dCk7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgX3RoaXMzLnRvdWNoVGltZW91dCA9IHNldFRpbWVvdXQoZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgICAgICAgICByZXR1cm4gX3RoaXMzLmN5Y2xlKGV2ZW50KTtcbiAgICAgICAgICB9LCBUT1VDSEVWRU5UX0NPTVBBVF9XQUlUICsgX3RoaXMzLl9jb25maWcuaW50ZXJ2YWwpO1xuICAgICAgICB9XG4gICAgICB9O1xuXG4gICAgICAkKHRoaXMuX2VsZW1lbnQucXVlcnlTZWxlY3RvckFsbChTZWxlY3RvciQyLklURU1fSU1HKSkub24oRXZlbnQkMi5EUkFHX1NUQVJULCBmdW5jdGlvbiAoZSkge1xuICAgICAgICByZXR1cm4gZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgfSk7XG5cbiAgICAgIGlmICh0aGlzLl9wb2ludGVyRXZlbnQpIHtcbiAgICAgICAgJCh0aGlzLl9lbGVtZW50KS5vbihFdmVudCQyLlBPSU5URVJET1dOLCBmdW5jdGlvbiAoZXZlbnQpIHtcbiAgICAgICAgICByZXR1cm4gc3RhcnQoZXZlbnQpO1xuICAgICAgICB9KTtcbiAgICAgICAgJCh0aGlzLl9lbGVtZW50KS5vbihFdmVudCQyLlBPSU5URVJVUCwgZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgICAgICAgcmV0dXJuIGVuZChldmVudCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHRoaXMuX2VsZW1lbnQuY2xhc3NMaXN0LmFkZChDbGFzc05hbWUkMi5QT0lOVEVSX0VWRU5UKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgICQodGhpcy5fZWxlbWVudCkub24oRXZlbnQkMi5UT1VDSFNUQVJULCBmdW5jdGlvbiAoZXZlbnQpIHtcbiAgICAgICAgICByZXR1cm4gc3RhcnQoZXZlbnQpO1xuICAgICAgICB9KTtcbiAgICAgICAgJCh0aGlzLl9lbGVtZW50KS5vbihFdmVudCQyLlRPVUNITU9WRSwgZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgICAgICAgcmV0dXJuIG1vdmUoZXZlbnQpO1xuICAgICAgICB9KTtcbiAgICAgICAgJCh0aGlzLl9lbGVtZW50KS5vbihFdmVudCQyLlRPVUNIRU5ELCBmdW5jdGlvbiAoZXZlbnQpIHtcbiAgICAgICAgICByZXR1cm4gZW5kKGV2ZW50KTtcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfTtcblxuICAgIF9wcm90by5fa2V5ZG93biA9IGZ1bmN0aW9uIF9rZXlkb3duKGV2ZW50KSB7XG4gICAgICBpZiAoL2lucHV0fHRleHRhcmVhL2kudGVzdChldmVudC50YXJnZXQudGFnTmFtZSkpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICBzd2l0Y2ggKGV2ZW50LndoaWNoKSB7XG4gICAgICAgIGNhc2UgQVJST1dfTEVGVF9LRVlDT0RFOlxuICAgICAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgdGhpcy5wcmV2KCk7XG4gICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgY2FzZSBBUlJPV19SSUdIVF9LRVlDT0RFOlxuICAgICAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgdGhpcy5uZXh0KCk7XG4gICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgZGVmYXVsdDpcbiAgICAgIH1cbiAgICB9O1xuXG4gICAgX3Byb3RvLl9nZXRJdGVtSW5kZXggPSBmdW5jdGlvbiBfZ2V0SXRlbUluZGV4KGVsZW1lbnQpIHtcbiAgICAgIHRoaXMuX2l0ZW1zID0gZWxlbWVudCAmJiBlbGVtZW50LnBhcmVudE5vZGUgPyBbXS5zbGljZS5jYWxsKGVsZW1lbnQucGFyZW50Tm9kZS5xdWVyeVNlbGVjdG9yQWxsKFNlbGVjdG9yJDIuSVRFTSkpIDogW107XG4gICAgICByZXR1cm4gdGhpcy5faXRlbXMuaW5kZXhPZihlbGVtZW50KTtcbiAgICB9O1xuXG4gICAgX3Byb3RvLl9nZXRJdGVtQnlEaXJlY3Rpb24gPSBmdW5jdGlvbiBfZ2V0SXRlbUJ5RGlyZWN0aW9uKGRpcmVjdGlvbiwgYWN0aXZlRWxlbWVudCkge1xuICAgICAgdmFyIGlzTmV4dERpcmVjdGlvbiA9IGRpcmVjdGlvbiA9PT0gRGlyZWN0aW9uLk5FWFQ7XG4gICAgICB2YXIgaXNQcmV2RGlyZWN0aW9uID0gZGlyZWN0aW9uID09PSBEaXJlY3Rpb24uUFJFVjtcblxuICAgICAgdmFyIGFjdGl2ZUluZGV4ID0gdGhpcy5fZ2V0SXRlbUluZGV4KGFjdGl2ZUVsZW1lbnQpO1xuXG4gICAgICB2YXIgbGFzdEl0ZW1JbmRleCA9IHRoaXMuX2l0ZW1zLmxlbmd0aCAtIDE7XG4gICAgICB2YXIgaXNHb2luZ1RvV3JhcCA9IGlzUHJldkRpcmVjdGlvbiAmJiBhY3RpdmVJbmRleCA9PT0gMCB8fCBpc05leHREaXJlY3Rpb24gJiYgYWN0aXZlSW5kZXggPT09IGxhc3RJdGVtSW5kZXg7XG5cbiAgICAgIGlmIChpc0dvaW5nVG9XcmFwICYmICF0aGlzLl9jb25maWcud3JhcCkge1xuICAgICAgICByZXR1cm4gYWN0aXZlRWxlbWVudDtcbiAgICAgIH1cblxuICAgICAgdmFyIGRlbHRhID0gZGlyZWN0aW9uID09PSBEaXJlY3Rpb24uUFJFViA/IC0xIDogMTtcbiAgICAgIHZhciBpdGVtSW5kZXggPSAoYWN0aXZlSW5kZXggKyBkZWx0YSkgJSB0aGlzLl9pdGVtcy5sZW5ndGg7XG4gICAgICByZXR1cm4gaXRlbUluZGV4ID09PSAtMSA/IHRoaXMuX2l0ZW1zW3RoaXMuX2l0ZW1zLmxlbmd0aCAtIDFdIDogdGhpcy5faXRlbXNbaXRlbUluZGV4XTtcbiAgICB9O1xuXG4gICAgX3Byb3RvLl90cmlnZ2VyU2xpZGVFdmVudCA9IGZ1bmN0aW9uIF90cmlnZ2VyU2xpZGVFdmVudChyZWxhdGVkVGFyZ2V0LCBldmVudERpcmVjdGlvbk5hbWUpIHtcbiAgICAgIHZhciB0YXJnZXRJbmRleCA9IHRoaXMuX2dldEl0ZW1JbmRleChyZWxhdGVkVGFyZ2V0KTtcblxuICAgICAgdmFyIGZyb21JbmRleCA9IHRoaXMuX2dldEl0ZW1JbmRleCh0aGlzLl9lbGVtZW50LnF1ZXJ5U2VsZWN0b3IoU2VsZWN0b3IkMi5BQ1RJVkVfSVRFTSkpO1xuXG4gICAgICB2YXIgc2xpZGVFdmVudCA9ICQuRXZlbnQoRXZlbnQkMi5TTElERSwge1xuICAgICAgICByZWxhdGVkVGFyZ2V0OiByZWxhdGVkVGFyZ2V0LFxuICAgICAgICBkaXJlY3Rpb246IGV2ZW50RGlyZWN0aW9uTmFtZSxcbiAgICAgICAgZnJvbTogZnJvbUluZGV4LFxuICAgICAgICB0bzogdGFyZ2V0SW5kZXhcbiAgICAgIH0pO1xuICAgICAgJCh0aGlzLl9lbGVtZW50KS50cmlnZ2VyKHNsaWRlRXZlbnQpO1xuICAgICAgcmV0dXJuIHNsaWRlRXZlbnQ7XG4gICAgfTtcblxuICAgIF9wcm90by5fc2V0QWN0aXZlSW5kaWNhdG9yRWxlbWVudCA9IGZ1bmN0aW9uIF9zZXRBY3RpdmVJbmRpY2F0b3JFbGVtZW50KGVsZW1lbnQpIHtcbiAgICAgIGlmICh0aGlzLl9pbmRpY2F0b3JzRWxlbWVudCkge1xuICAgICAgICB2YXIgaW5kaWNhdG9ycyA9IFtdLnNsaWNlLmNhbGwodGhpcy5faW5kaWNhdG9yc0VsZW1lbnQucXVlcnlTZWxlY3RvckFsbChTZWxlY3RvciQyLkFDVElWRSkpO1xuICAgICAgICAkKGluZGljYXRvcnMpLnJlbW92ZUNsYXNzKENsYXNzTmFtZSQyLkFDVElWRSk7XG5cbiAgICAgICAgdmFyIG5leHRJbmRpY2F0b3IgPSB0aGlzLl9pbmRpY2F0b3JzRWxlbWVudC5jaGlsZHJlblt0aGlzLl9nZXRJdGVtSW5kZXgoZWxlbWVudCldO1xuXG4gICAgICAgIGlmIChuZXh0SW5kaWNhdG9yKSB7XG4gICAgICAgICAgJChuZXh0SW5kaWNhdG9yKS5hZGRDbGFzcyhDbGFzc05hbWUkMi5BQ1RJVkUpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfTtcblxuICAgIF9wcm90by5fc2xpZGUgPSBmdW5jdGlvbiBfc2xpZGUoZGlyZWN0aW9uLCBlbGVtZW50KSB7XG4gICAgICB2YXIgX3RoaXM0ID0gdGhpcztcblxuICAgICAgdmFyIGFjdGl2ZUVsZW1lbnQgPSB0aGlzLl9lbGVtZW50LnF1ZXJ5U2VsZWN0b3IoU2VsZWN0b3IkMi5BQ1RJVkVfSVRFTSk7XG5cbiAgICAgIHZhciBhY3RpdmVFbGVtZW50SW5kZXggPSB0aGlzLl9nZXRJdGVtSW5kZXgoYWN0aXZlRWxlbWVudCk7XG5cbiAgICAgIHZhciBuZXh0RWxlbWVudCA9IGVsZW1lbnQgfHwgYWN0aXZlRWxlbWVudCAmJiB0aGlzLl9nZXRJdGVtQnlEaXJlY3Rpb24oZGlyZWN0aW9uLCBhY3RpdmVFbGVtZW50KTtcblxuICAgICAgdmFyIG5leHRFbGVtZW50SW5kZXggPSB0aGlzLl9nZXRJdGVtSW5kZXgobmV4dEVsZW1lbnQpO1xuXG4gICAgICB2YXIgaXNDeWNsaW5nID0gQm9vbGVhbih0aGlzLl9pbnRlcnZhbCk7XG4gICAgICB2YXIgZGlyZWN0aW9uYWxDbGFzc05hbWU7XG4gICAgICB2YXIgb3JkZXJDbGFzc05hbWU7XG4gICAgICB2YXIgZXZlbnREaXJlY3Rpb25OYW1lO1xuXG4gICAgICBpZiAoZGlyZWN0aW9uID09PSBEaXJlY3Rpb24uTkVYVCkge1xuICAgICAgICBkaXJlY3Rpb25hbENsYXNzTmFtZSA9IENsYXNzTmFtZSQyLkxFRlQ7XG4gICAgICAgIG9yZGVyQ2xhc3NOYW1lID0gQ2xhc3NOYW1lJDIuTkVYVDtcbiAgICAgICAgZXZlbnREaXJlY3Rpb25OYW1lID0gRGlyZWN0aW9uLkxFRlQ7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBkaXJlY3Rpb25hbENsYXNzTmFtZSA9IENsYXNzTmFtZSQyLlJJR0hUO1xuICAgICAgICBvcmRlckNsYXNzTmFtZSA9IENsYXNzTmFtZSQyLlBSRVY7XG4gICAgICAgIGV2ZW50RGlyZWN0aW9uTmFtZSA9IERpcmVjdGlvbi5SSUdIVDtcbiAgICAgIH1cblxuICAgICAgaWYgKG5leHRFbGVtZW50ICYmICQobmV4dEVsZW1lbnQpLmhhc0NsYXNzKENsYXNzTmFtZSQyLkFDVElWRSkpIHtcbiAgICAgICAgdGhpcy5faXNTbGlkaW5nID0gZmFsc2U7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgdmFyIHNsaWRlRXZlbnQgPSB0aGlzLl90cmlnZ2VyU2xpZGVFdmVudChuZXh0RWxlbWVudCwgZXZlbnREaXJlY3Rpb25OYW1lKTtcblxuICAgICAgaWYgKHNsaWRlRXZlbnQuaXNEZWZhdWx0UHJldmVudGVkKCkpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICBpZiAoIWFjdGl2ZUVsZW1lbnQgfHwgIW5leHRFbGVtZW50KSB7XG4gICAgICAgIC8vIFNvbWUgd2VpcmRuZXNzIGlzIGhhcHBlbmluZywgc28gd2UgYmFpbFxuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIHRoaXMuX2lzU2xpZGluZyA9IHRydWU7XG5cbiAgICAgIGlmIChpc0N5Y2xpbmcpIHtcbiAgICAgICAgdGhpcy5wYXVzZSgpO1xuICAgICAgfVxuXG4gICAgICB0aGlzLl9zZXRBY3RpdmVJbmRpY2F0b3JFbGVtZW50KG5leHRFbGVtZW50KTtcblxuICAgICAgdmFyIHNsaWRFdmVudCA9ICQuRXZlbnQoRXZlbnQkMi5TTElELCB7XG4gICAgICAgIHJlbGF0ZWRUYXJnZXQ6IG5leHRFbGVtZW50LFxuICAgICAgICBkaXJlY3Rpb246IGV2ZW50RGlyZWN0aW9uTmFtZSxcbiAgICAgICAgZnJvbTogYWN0aXZlRWxlbWVudEluZGV4LFxuICAgICAgICB0bzogbmV4dEVsZW1lbnRJbmRleFxuICAgICAgfSk7XG5cbiAgICAgIGlmICgkKHRoaXMuX2VsZW1lbnQpLmhhc0NsYXNzKENsYXNzTmFtZSQyLlNMSURFKSkge1xuICAgICAgICAkKG5leHRFbGVtZW50KS5hZGRDbGFzcyhvcmRlckNsYXNzTmFtZSk7XG4gICAgICAgIFV0aWwucmVmbG93KG5leHRFbGVtZW50KTtcbiAgICAgICAgJChhY3RpdmVFbGVtZW50KS5hZGRDbGFzcyhkaXJlY3Rpb25hbENsYXNzTmFtZSk7XG4gICAgICAgICQobmV4dEVsZW1lbnQpLmFkZENsYXNzKGRpcmVjdGlvbmFsQ2xhc3NOYW1lKTtcbiAgICAgICAgdmFyIG5leHRFbGVtZW50SW50ZXJ2YWwgPSBwYXJzZUludChuZXh0RWxlbWVudC5nZXRBdHRyaWJ1dGUoJ2RhdGEtaW50ZXJ2YWwnKSwgMTApO1xuXG4gICAgICAgIGlmIChuZXh0RWxlbWVudEludGVydmFsKSB7XG4gICAgICAgICAgdGhpcy5fY29uZmlnLmRlZmF1bHRJbnRlcnZhbCA9IHRoaXMuX2NvbmZpZy5kZWZhdWx0SW50ZXJ2YWwgfHwgdGhpcy5fY29uZmlnLmludGVydmFsO1xuICAgICAgICAgIHRoaXMuX2NvbmZpZy5pbnRlcnZhbCA9IG5leHRFbGVtZW50SW50ZXJ2YWw7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgdGhpcy5fY29uZmlnLmludGVydmFsID0gdGhpcy5fY29uZmlnLmRlZmF1bHRJbnRlcnZhbCB8fCB0aGlzLl9jb25maWcuaW50ZXJ2YWw7XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgdHJhbnNpdGlvbkR1cmF0aW9uID0gVXRpbC5nZXRUcmFuc2l0aW9uRHVyYXRpb25Gcm9tRWxlbWVudChhY3RpdmVFbGVtZW50KTtcbiAgICAgICAgJChhY3RpdmVFbGVtZW50KS5vbmUoVXRpbC5UUkFOU0lUSU9OX0VORCwgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICQobmV4dEVsZW1lbnQpLnJlbW92ZUNsYXNzKGRpcmVjdGlvbmFsQ2xhc3NOYW1lICsgXCIgXCIgKyBvcmRlckNsYXNzTmFtZSkuYWRkQ2xhc3MoQ2xhc3NOYW1lJDIuQUNUSVZFKTtcbiAgICAgICAgICAkKGFjdGl2ZUVsZW1lbnQpLnJlbW92ZUNsYXNzKENsYXNzTmFtZSQyLkFDVElWRSArIFwiIFwiICsgb3JkZXJDbGFzc05hbWUgKyBcIiBcIiArIGRpcmVjdGlvbmFsQ2xhc3NOYW1lKTtcbiAgICAgICAgICBfdGhpczQuX2lzU2xpZGluZyA9IGZhbHNlO1xuICAgICAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuICQoX3RoaXM0Ll9lbGVtZW50KS50cmlnZ2VyKHNsaWRFdmVudCk7XG4gICAgICAgICAgfSwgMCk7XG4gICAgICAgIH0pLmVtdWxhdGVUcmFuc2l0aW9uRW5kKHRyYW5zaXRpb25EdXJhdGlvbik7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAkKGFjdGl2ZUVsZW1lbnQpLnJlbW92ZUNsYXNzKENsYXNzTmFtZSQyLkFDVElWRSk7XG4gICAgICAgICQobmV4dEVsZW1lbnQpLmFkZENsYXNzKENsYXNzTmFtZSQyLkFDVElWRSk7XG4gICAgICAgIHRoaXMuX2lzU2xpZGluZyA9IGZhbHNlO1xuICAgICAgICAkKHRoaXMuX2VsZW1lbnQpLnRyaWdnZXIoc2xpZEV2ZW50KTtcbiAgICAgIH1cblxuICAgICAgaWYgKGlzQ3ljbGluZykge1xuICAgICAgICB0aGlzLmN5Y2xlKCk7XG4gICAgICB9XG4gICAgfTsgLy8gU3RhdGljXG5cblxuICAgIENhcm91c2VsLl9qUXVlcnlJbnRlcmZhY2UgPSBmdW5jdGlvbiBfalF1ZXJ5SW50ZXJmYWNlKGNvbmZpZykge1xuICAgICAgcmV0dXJuIHRoaXMuZWFjaChmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBkYXRhID0gJCh0aGlzKS5kYXRhKERBVEFfS0VZJDIpO1xuXG4gICAgICAgIHZhciBfY29uZmlnID0gX29iamVjdFNwcmVhZCh7fSwgRGVmYXVsdCwgJCh0aGlzKS5kYXRhKCkpO1xuXG4gICAgICAgIGlmICh0eXBlb2YgY29uZmlnID09PSAnb2JqZWN0Jykge1xuICAgICAgICAgIF9jb25maWcgPSBfb2JqZWN0U3ByZWFkKHt9LCBfY29uZmlnLCBjb25maWcpO1xuICAgICAgICB9XG5cbiAgICAgICAgdmFyIGFjdGlvbiA9IHR5cGVvZiBjb25maWcgPT09ICdzdHJpbmcnID8gY29uZmlnIDogX2NvbmZpZy5zbGlkZTtcblxuICAgICAgICBpZiAoIWRhdGEpIHtcbiAgICAgICAgICBkYXRhID0gbmV3IENhcm91c2VsKHRoaXMsIF9jb25maWcpO1xuICAgICAgICAgICQodGhpcykuZGF0YShEQVRBX0tFWSQyLCBkYXRhKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh0eXBlb2YgY29uZmlnID09PSAnbnVtYmVyJykge1xuICAgICAgICAgIGRhdGEudG8oY29uZmlnKTtcbiAgICAgICAgfSBlbHNlIGlmICh0eXBlb2YgYWN0aW9uID09PSAnc3RyaW5nJykge1xuICAgICAgICAgIGlmICh0eXBlb2YgZGF0YVthY3Rpb25dID09PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihcIk5vIG1ldGhvZCBuYW1lZCBcXFwiXCIgKyBhY3Rpb24gKyBcIlxcXCJcIik7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgZGF0YVthY3Rpb25dKCk7XG4gICAgICAgIH0gZWxzZSBpZiAoX2NvbmZpZy5pbnRlcnZhbCkge1xuICAgICAgICAgIGRhdGEucGF1c2UoKTtcbiAgICAgICAgICBkYXRhLmN5Y2xlKCk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH07XG5cbiAgICBDYXJvdXNlbC5fZGF0YUFwaUNsaWNrSGFuZGxlciA9IGZ1bmN0aW9uIF9kYXRhQXBpQ2xpY2tIYW5kbGVyKGV2ZW50KSB7XG4gICAgICB2YXIgc2VsZWN0b3IgPSBVdGlsLmdldFNlbGVjdG9yRnJvbUVsZW1lbnQodGhpcyk7XG5cbiAgICAgIGlmICghc2VsZWN0b3IpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICB2YXIgdGFyZ2V0ID0gJChzZWxlY3RvcilbMF07XG5cbiAgICAgIGlmICghdGFyZ2V0IHx8ICEkKHRhcmdldCkuaGFzQ2xhc3MoQ2xhc3NOYW1lJDIuQ0FST1VTRUwpKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgdmFyIGNvbmZpZyA9IF9vYmplY3RTcHJlYWQoe30sICQodGFyZ2V0KS5kYXRhKCksICQodGhpcykuZGF0YSgpKTtcblxuICAgICAgdmFyIHNsaWRlSW5kZXggPSB0aGlzLmdldEF0dHJpYnV0ZSgnZGF0YS1zbGlkZS10bycpO1xuXG4gICAgICBpZiAoc2xpZGVJbmRleCkge1xuICAgICAgICBjb25maWcuaW50ZXJ2YWwgPSBmYWxzZTtcbiAgICAgIH1cblxuICAgICAgQ2Fyb3VzZWwuX2pRdWVyeUludGVyZmFjZS5jYWxsKCQodGFyZ2V0KSwgY29uZmlnKTtcblxuICAgICAgaWYgKHNsaWRlSW5kZXgpIHtcbiAgICAgICAgJCh0YXJnZXQpLmRhdGEoREFUQV9LRVkkMikudG8oc2xpZGVJbmRleCk7XG4gICAgICB9XG5cbiAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgfTtcblxuICAgIF9jcmVhdGVDbGFzcyhDYXJvdXNlbCwgbnVsbCwgW3tcbiAgICAgIGtleTogXCJWRVJTSU9OXCIsXG4gICAgICBnZXQ6IGZ1bmN0aW9uIGdldCgpIHtcbiAgICAgICAgcmV0dXJuIFZFUlNJT04kMjtcbiAgICAgIH1cbiAgICB9LCB7XG4gICAgICBrZXk6IFwiRGVmYXVsdFwiLFxuICAgICAgZ2V0OiBmdW5jdGlvbiBnZXQoKSB7XG4gICAgICAgIHJldHVybiBEZWZhdWx0O1xuICAgICAgfVxuICAgIH1dKTtcblxuICAgIHJldHVybiBDYXJvdXNlbDtcbiAgfSgpO1xuICAvKipcbiAgICogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAqIERhdGEgQXBpIGltcGxlbWVudGF0aW9uXG4gICAqIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgKi9cblxuXG4gICQoZG9jdW1lbnQpLm9uKEV2ZW50JDIuQ0xJQ0tfREFUQV9BUEksIFNlbGVjdG9yJDIuREFUQV9TTElERSwgQ2Fyb3VzZWwuX2RhdGFBcGlDbGlja0hhbmRsZXIpO1xuICAkKHdpbmRvdykub24oRXZlbnQkMi5MT0FEX0RBVEFfQVBJLCBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIGNhcm91c2VscyA9IFtdLnNsaWNlLmNhbGwoZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbChTZWxlY3RvciQyLkRBVEFfUklERSkpO1xuXG4gICAgZm9yICh2YXIgaSA9IDAsIGxlbiA9IGNhcm91c2Vscy5sZW5ndGg7IGkgPCBsZW47IGkrKykge1xuICAgICAgdmFyICRjYXJvdXNlbCA9ICQoY2Fyb3VzZWxzW2ldKTtcblxuICAgICAgQ2Fyb3VzZWwuX2pRdWVyeUludGVyZmFjZS5jYWxsKCRjYXJvdXNlbCwgJGNhcm91c2VsLmRhdGEoKSk7XG4gICAgfVxuICB9KTtcbiAgLyoqXG4gICAqIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgKiBqUXVlcnlcbiAgICogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAqL1xuXG4gICQuZm5bTkFNRSQyXSA9IENhcm91c2VsLl9qUXVlcnlJbnRlcmZhY2U7XG4gICQuZm5bTkFNRSQyXS5Db25zdHJ1Y3RvciA9IENhcm91c2VsO1xuXG4gICQuZm5bTkFNRSQyXS5ub0NvbmZsaWN0ID0gZnVuY3Rpb24gKCkge1xuICAgICQuZm5bTkFNRSQyXSA9IEpRVUVSWV9OT19DT05GTElDVCQyO1xuICAgIHJldHVybiBDYXJvdXNlbC5falF1ZXJ5SW50ZXJmYWNlO1xuICB9O1xuXG4gIC8qKlxuICAgKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICogQ29uc3RhbnRzXG4gICAqIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgKi9cblxuICB2YXIgTkFNRSQzID0gJ2NvbGxhcHNlJztcbiAgdmFyIFZFUlNJT04kMyA9ICc0LjIuMSc7XG4gIHZhciBEQVRBX0tFWSQzID0gJ2JzLmNvbGxhcHNlJztcbiAgdmFyIEVWRU5UX0tFWSQzID0gXCIuXCIgKyBEQVRBX0tFWSQzO1xuICB2YXIgREFUQV9BUElfS0VZJDMgPSAnLmRhdGEtYXBpJztcbiAgdmFyIEpRVUVSWV9OT19DT05GTElDVCQzID0gJC5mbltOQU1FJDNdO1xuICB2YXIgRGVmYXVsdCQxID0ge1xuICAgIHRvZ2dsZTogdHJ1ZSxcbiAgICBwYXJlbnQ6ICcnXG4gIH07XG4gIHZhciBEZWZhdWx0VHlwZSQxID0ge1xuICAgIHRvZ2dsZTogJ2Jvb2xlYW4nLFxuICAgIHBhcmVudDogJyhzdHJpbmd8ZWxlbWVudCknXG4gIH07XG4gIHZhciBFdmVudCQzID0ge1xuICAgIFNIT1c6IFwic2hvd1wiICsgRVZFTlRfS0VZJDMsXG4gICAgU0hPV046IFwic2hvd25cIiArIEVWRU5UX0tFWSQzLFxuICAgIEhJREU6IFwiaGlkZVwiICsgRVZFTlRfS0VZJDMsXG4gICAgSElEREVOOiBcImhpZGRlblwiICsgRVZFTlRfS0VZJDMsXG4gICAgQ0xJQ0tfREFUQV9BUEk6IFwiY2xpY2tcIiArIEVWRU5UX0tFWSQzICsgREFUQV9BUElfS0VZJDNcbiAgfTtcbiAgdmFyIENsYXNzTmFtZSQzID0ge1xuICAgIFNIT1c6ICdzaG93JyxcbiAgICBDT0xMQVBTRTogJ2NvbGxhcHNlJyxcbiAgICBDT0xMQVBTSU5HOiAnY29sbGFwc2luZycsXG4gICAgQ09MTEFQU0VEOiAnY29sbGFwc2VkJ1xuICB9O1xuICB2YXIgRGltZW5zaW9uID0ge1xuICAgIFdJRFRIOiAnd2lkdGgnLFxuICAgIEhFSUdIVDogJ2hlaWdodCdcbiAgfTtcbiAgdmFyIFNlbGVjdG9yJDMgPSB7XG4gICAgQUNUSVZFUzogJy5zaG93LCAuY29sbGFwc2luZycsXG4gICAgREFUQV9UT0dHTEU6ICdbZGF0YS10b2dnbGU9XCJjb2xsYXBzZVwiXSdcbiAgICAvKipcbiAgICAgKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICAgKiBDbGFzcyBEZWZpbml0aW9uXG4gICAgICogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAgICovXG5cbiAgfTtcblxuICB2YXIgQ29sbGFwc2UgPVxuICAvKiNfX1BVUkVfXyovXG4gIGZ1bmN0aW9uICgpIHtcbiAgICBmdW5jdGlvbiBDb2xsYXBzZShlbGVtZW50LCBjb25maWcpIHtcbiAgICAgIHRoaXMuX2lzVHJhbnNpdGlvbmluZyA9IGZhbHNlO1xuICAgICAgdGhpcy5fZWxlbWVudCA9IGVsZW1lbnQ7XG4gICAgICB0aGlzLl9jb25maWcgPSB0aGlzLl9nZXRDb25maWcoY29uZmlnKTtcbiAgICAgIHRoaXMuX3RyaWdnZXJBcnJheSA9IFtdLnNsaWNlLmNhbGwoZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbChcIltkYXRhLXRvZ2dsZT1cXFwiY29sbGFwc2VcXFwiXVtocmVmPVxcXCIjXCIgKyBlbGVtZW50LmlkICsgXCJcXFwiXSxcIiArIChcIltkYXRhLXRvZ2dsZT1cXFwiY29sbGFwc2VcXFwiXVtkYXRhLXRhcmdldD1cXFwiI1wiICsgZWxlbWVudC5pZCArIFwiXFxcIl1cIikpKTtcbiAgICAgIHZhciB0b2dnbGVMaXN0ID0gW10uc2xpY2UuY2FsbChkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKFNlbGVjdG9yJDMuREFUQV9UT0dHTEUpKTtcblxuICAgICAgZm9yICh2YXIgaSA9IDAsIGxlbiA9IHRvZ2dsZUxpc3QubGVuZ3RoOyBpIDwgbGVuOyBpKyspIHtcbiAgICAgICAgdmFyIGVsZW0gPSB0b2dnbGVMaXN0W2ldO1xuICAgICAgICB2YXIgc2VsZWN0b3IgPSBVdGlsLmdldFNlbGVjdG9yRnJvbUVsZW1lbnQoZWxlbSk7XG4gICAgICAgIHZhciBmaWx0ZXJFbGVtZW50ID0gW10uc2xpY2UuY2FsbChkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKHNlbGVjdG9yKSkuZmlsdGVyKGZ1bmN0aW9uIChmb3VuZEVsZW0pIHtcbiAgICAgICAgICByZXR1cm4gZm91bmRFbGVtID09PSBlbGVtZW50O1xuICAgICAgICB9KTtcblxuICAgICAgICBpZiAoc2VsZWN0b3IgIT09IG51bGwgJiYgZmlsdGVyRWxlbWVudC5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgdGhpcy5fc2VsZWN0b3IgPSBzZWxlY3RvcjtcblxuICAgICAgICAgIHRoaXMuX3RyaWdnZXJBcnJheS5wdXNoKGVsZW0pO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIHRoaXMuX3BhcmVudCA9IHRoaXMuX2NvbmZpZy5wYXJlbnQgPyB0aGlzLl9nZXRQYXJlbnQoKSA6IG51bGw7XG5cbiAgICAgIGlmICghdGhpcy5fY29uZmlnLnBhcmVudCkge1xuICAgICAgICB0aGlzLl9hZGRBcmlhQW5kQ29sbGFwc2VkQ2xhc3ModGhpcy5fZWxlbWVudCwgdGhpcy5fdHJpZ2dlckFycmF5KTtcbiAgICAgIH1cblxuICAgICAgaWYgKHRoaXMuX2NvbmZpZy50b2dnbGUpIHtcbiAgICAgICAgdGhpcy50b2dnbGUoKTtcbiAgICAgIH1cbiAgICB9IC8vIEdldHRlcnNcblxuXG4gICAgdmFyIF9wcm90byA9IENvbGxhcHNlLnByb3RvdHlwZTtcblxuICAgIC8vIFB1YmxpY1xuICAgIF9wcm90by50b2dnbGUgPSBmdW5jdGlvbiB0b2dnbGUoKSB7XG4gICAgICBpZiAoJCh0aGlzLl9lbGVtZW50KS5oYXNDbGFzcyhDbGFzc05hbWUkMy5TSE9XKSkge1xuICAgICAgICB0aGlzLmhpZGUoKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMuc2hvdygpO1xuICAgICAgfVxuICAgIH07XG5cbiAgICBfcHJvdG8uc2hvdyA9IGZ1bmN0aW9uIHNob3coKSB7XG4gICAgICB2YXIgX3RoaXMgPSB0aGlzO1xuXG4gICAgICBpZiAodGhpcy5faXNUcmFuc2l0aW9uaW5nIHx8ICQodGhpcy5fZWxlbWVudCkuaGFzQ2xhc3MoQ2xhc3NOYW1lJDMuU0hPVykpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICB2YXIgYWN0aXZlcztcbiAgICAgIHZhciBhY3RpdmVzRGF0YTtcblxuICAgICAgaWYgKHRoaXMuX3BhcmVudCkge1xuICAgICAgICBhY3RpdmVzID0gW10uc2xpY2UuY2FsbCh0aGlzLl9wYXJlbnQucXVlcnlTZWxlY3RvckFsbChTZWxlY3RvciQzLkFDVElWRVMpKS5maWx0ZXIoZnVuY3Rpb24gKGVsZW0pIHtcbiAgICAgICAgICBpZiAodHlwZW9mIF90aGlzLl9jb25maWcucGFyZW50ID09PSAnc3RyaW5nJykge1xuICAgICAgICAgICAgcmV0dXJuIGVsZW0uZ2V0QXR0cmlidXRlKCdkYXRhLXBhcmVudCcpID09PSBfdGhpcy5fY29uZmlnLnBhcmVudDtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICByZXR1cm4gZWxlbS5jbGFzc0xpc3QuY29udGFpbnMoQ2xhc3NOYW1lJDMuQ09MTEFQU0UpO1xuICAgICAgICB9KTtcblxuICAgICAgICBpZiAoYWN0aXZlcy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICBhY3RpdmVzID0gbnVsbDtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICBpZiAoYWN0aXZlcykge1xuICAgICAgICBhY3RpdmVzRGF0YSA9ICQoYWN0aXZlcykubm90KHRoaXMuX3NlbGVjdG9yKS5kYXRhKERBVEFfS0VZJDMpO1xuXG4gICAgICAgIGlmIChhY3RpdmVzRGF0YSAmJiBhY3RpdmVzRGF0YS5faXNUcmFuc2l0aW9uaW5nKSB7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIHZhciBzdGFydEV2ZW50ID0gJC5FdmVudChFdmVudCQzLlNIT1cpO1xuICAgICAgJCh0aGlzLl9lbGVtZW50KS50cmlnZ2VyKHN0YXJ0RXZlbnQpO1xuXG4gICAgICBpZiAoc3RhcnRFdmVudC5pc0RlZmF1bHRQcmV2ZW50ZWQoKSkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIGlmIChhY3RpdmVzKSB7XG4gICAgICAgIENvbGxhcHNlLl9qUXVlcnlJbnRlcmZhY2UuY2FsbCgkKGFjdGl2ZXMpLm5vdCh0aGlzLl9zZWxlY3RvciksICdoaWRlJyk7XG5cbiAgICAgICAgaWYgKCFhY3RpdmVzRGF0YSkge1xuICAgICAgICAgICQoYWN0aXZlcykuZGF0YShEQVRBX0tFWSQzLCBudWxsKTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICB2YXIgZGltZW5zaW9uID0gdGhpcy5fZ2V0RGltZW5zaW9uKCk7XG5cbiAgICAgICQodGhpcy5fZWxlbWVudCkucmVtb3ZlQ2xhc3MoQ2xhc3NOYW1lJDMuQ09MTEFQU0UpLmFkZENsYXNzKENsYXNzTmFtZSQzLkNPTExBUFNJTkcpO1xuICAgICAgdGhpcy5fZWxlbWVudC5zdHlsZVtkaW1lbnNpb25dID0gMDtcblxuICAgICAgaWYgKHRoaXMuX3RyaWdnZXJBcnJheS5sZW5ndGgpIHtcbiAgICAgICAgJCh0aGlzLl90cmlnZ2VyQXJyYXkpLnJlbW92ZUNsYXNzKENsYXNzTmFtZSQzLkNPTExBUFNFRCkuYXR0cignYXJpYS1leHBhbmRlZCcsIHRydWUpO1xuICAgICAgfVxuXG4gICAgICB0aGlzLnNldFRyYW5zaXRpb25pbmcodHJ1ZSk7XG5cbiAgICAgIHZhciBjb21wbGV0ZSA9IGZ1bmN0aW9uIGNvbXBsZXRlKCkge1xuICAgICAgICAkKF90aGlzLl9lbGVtZW50KS5yZW1vdmVDbGFzcyhDbGFzc05hbWUkMy5DT0xMQVBTSU5HKS5hZGRDbGFzcyhDbGFzc05hbWUkMy5DT0xMQVBTRSkuYWRkQ2xhc3MoQ2xhc3NOYW1lJDMuU0hPVyk7XG4gICAgICAgIF90aGlzLl9lbGVtZW50LnN0eWxlW2RpbWVuc2lvbl0gPSAnJztcblxuICAgICAgICBfdGhpcy5zZXRUcmFuc2l0aW9uaW5nKGZhbHNlKTtcblxuICAgICAgICAkKF90aGlzLl9lbGVtZW50KS50cmlnZ2VyKEV2ZW50JDMuU0hPV04pO1xuICAgICAgfTtcblxuICAgICAgdmFyIGNhcGl0YWxpemVkRGltZW5zaW9uID0gZGltZW5zaW9uWzBdLnRvVXBwZXJDYXNlKCkgKyBkaW1lbnNpb24uc2xpY2UoMSk7XG4gICAgICB2YXIgc2Nyb2xsU2l6ZSA9IFwic2Nyb2xsXCIgKyBjYXBpdGFsaXplZERpbWVuc2lvbjtcbiAgICAgIHZhciB0cmFuc2l0aW9uRHVyYXRpb24gPSBVdGlsLmdldFRyYW5zaXRpb25EdXJhdGlvbkZyb21FbGVtZW50KHRoaXMuX2VsZW1lbnQpO1xuICAgICAgJCh0aGlzLl9lbGVtZW50KS5vbmUoVXRpbC5UUkFOU0lUSU9OX0VORCwgY29tcGxldGUpLmVtdWxhdGVUcmFuc2l0aW9uRW5kKHRyYW5zaXRpb25EdXJhdGlvbik7XG4gICAgICB0aGlzLl9lbGVtZW50LnN0eWxlW2RpbWVuc2lvbl0gPSB0aGlzLl9lbGVtZW50W3Njcm9sbFNpemVdICsgXCJweFwiO1xuICAgIH07XG5cbiAgICBfcHJvdG8uaGlkZSA9IGZ1bmN0aW9uIGhpZGUoKSB7XG4gICAgICB2YXIgX3RoaXMyID0gdGhpcztcblxuICAgICAgaWYgKHRoaXMuX2lzVHJhbnNpdGlvbmluZyB8fCAhJCh0aGlzLl9lbGVtZW50KS5oYXNDbGFzcyhDbGFzc05hbWUkMy5TSE9XKSkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIHZhciBzdGFydEV2ZW50ID0gJC5FdmVudChFdmVudCQzLkhJREUpO1xuICAgICAgJCh0aGlzLl9lbGVtZW50KS50cmlnZ2VyKHN0YXJ0RXZlbnQpO1xuXG4gICAgICBpZiAoc3RhcnRFdmVudC5pc0RlZmF1bHRQcmV2ZW50ZWQoKSkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIHZhciBkaW1lbnNpb24gPSB0aGlzLl9nZXREaW1lbnNpb24oKTtcblxuICAgICAgdGhpcy5fZWxlbWVudC5zdHlsZVtkaW1lbnNpb25dID0gdGhpcy5fZWxlbWVudC5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKVtkaW1lbnNpb25dICsgXCJweFwiO1xuICAgICAgVXRpbC5yZWZsb3codGhpcy5fZWxlbWVudCk7XG4gICAgICAkKHRoaXMuX2VsZW1lbnQpLmFkZENsYXNzKENsYXNzTmFtZSQzLkNPTExBUFNJTkcpLnJlbW92ZUNsYXNzKENsYXNzTmFtZSQzLkNPTExBUFNFKS5yZW1vdmVDbGFzcyhDbGFzc05hbWUkMy5TSE9XKTtcbiAgICAgIHZhciB0cmlnZ2VyQXJyYXlMZW5ndGggPSB0aGlzLl90cmlnZ2VyQXJyYXkubGVuZ3RoO1xuXG4gICAgICBpZiAodHJpZ2dlckFycmF5TGVuZ3RoID4gMCkge1xuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHRyaWdnZXJBcnJheUxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgdmFyIHRyaWdnZXIgPSB0aGlzLl90cmlnZ2VyQXJyYXlbaV07XG4gICAgICAgICAgdmFyIHNlbGVjdG9yID0gVXRpbC5nZXRTZWxlY3RvckZyb21FbGVtZW50KHRyaWdnZXIpO1xuXG4gICAgICAgICAgaWYgKHNlbGVjdG9yICE9PSBudWxsKSB7XG4gICAgICAgICAgICB2YXIgJGVsZW0gPSAkKFtdLnNsaWNlLmNhbGwoZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbChzZWxlY3RvcikpKTtcblxuICAgICAgICAgICAgaWYgKCEkZWxlbS5oYXNDbGFzcyhDbGFzc05hbWUkMy5TSE9XKSkge1xuICAgICAgICAgICAgICAkKHRyaWdnZXIpLmFkZENsYXNzKENsYXNzTmFtZSQzLkNPTExBUFNFRCkuYXR0cignYXJpYS1leHBhbmRlZCcsIGZhbHNlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgdGhpcy5zZXRUcmFuc2l0aW9uaW5nKHRydWUpO1xuXG4gICAgICB2YXIgY29tcGxldGUgPSBmdW5jdGlvbiBjb21wbGV0ZSgpIHtcbiAgICAgICAgX3RoaXMyLnNldFRyYW5zaXRpb25pbmcoZmFsc2UpO1xuXG4gICAgICAgICQoX3RoaXMyLl9lbGVtZW50KS5yZW1vdmVDbGFzcyhDbGFzc05hbWUkMy5DT0xMQVBTSU5HKS5hZGRDbGFzcyhDbGFzc05hbWUkMy5DT0xMQVBTRSkudHJpZ2dlcihFdmVudCQzLkhJRERFTik7XG4gICAgICB9O1xuXG4gICAgICB0aGlzLl9lbGVtZW50LnN0eWxlW2RpbWVuc2lvbl0gPSAnJztcbiAgICAgIHZhciB0cmFuc2l0aW9uRHVyYXRpb24gPSBVdGlsLmdldFRyYW5zaXRpb25EdXJhdGlvbkZyb21FbGVtZW50KHRoaXMuX2VsZW1lbnQpO1xuICAgICAgJCh0aGlzLl9lbGVtZW50KS5vbmUoVXRpbC5UUkFOU0lUSU9OX0VORCwgY29tcGxldGUpLmVtdWxhdGVUcmFuc2l0aW9uRW5kKHRyYW5zaXRpb25EdXJhdGlvbik7XG4gICAgfTtcblxuICAgIF9wcm90by5zZXRUcmFuc2l0aW9uaW5nID0gZnVuY3Rpb24gc2V0VHJhbnNpdGlvbmluZyhpc1RyYW5zaXRpb25pbmcpIHtcbiAgICAgIHRoaXMuX2lzVHJhbnNpdGlvbmluZyA9IGlzVHJhbnNpdGlvbmluZztcbiAgICB9O1xuXG4gICAgX3Byb3RvLmRpc3Bvc2UgPSBmdW5jdGlvbiBkaXNwb3NlKCkge1xuICAgICAgJC5yZW1vdmVEYXRhKHRoaXMuX2VsZW1lbnQsIERBVEFfS0VZJDMpO1xuICAgICAgdGhpcy5fY29uZmlnID0gbnVsbDtcbiAgICAgIHRoaXMuX3BhcmVudCA9IG51bGw7XG4gICAgICB0aGlzLl9lbGVtZW50ID0gbnVsbDtcbiAgICAgIHRoaXMuX3RyaWdnZXJBcnJheSA9IG51bGw7XG4gICAgICB0aGlzLl9pc1RyYW5zaXRpb25pbmcgPSBudWxsO1xuICAgIH07IC8vIFByaXZhdGVcblxuXG4gICAgX3Byb3RvLl9nZXRDb25maWcgPSBmdW5jdGlvbiBfZ2V0Q29uZmlnKGNvbmZpZykge1xuICAgICAgY29uZmlnID0gX29iamVjdFNwcmVhZCh7fSwgRGVmYXVsdCQxLCBjb25maWcpO1xuICAgICAgY29uZmlnLnRvZ2dsZSA9IEJvb2xlYW4oY29uZmlnLnRvZ2dsZSk7IC8vIENvZXJjZSBzdHJpbmcgdmFsdWVzXG5cbiAgICAgIFV0aWwudHlwZUNoZWNrQ29uZmlnKE5BTUUkMywgY29uZmlnLCBEZWZhdWx0VHlwZSQxKTtcbiAgICAgIHJldHVybiBjb25maWc7XG4gICAgfTtcblxuICAgIF9wcm90by5fZ2V0RGltZW5zaW9uID0gZnVuY3Rpb24gX2dldERpbWVuc2lvbigpIHtcbiAgICAgIHZhciBoYXNXaWR0aCA9ICQodGhpcy5fZWxlbWVudCkuaGFzQ2xhc3MoRGltZW5zaW9uLldJRFRIKTtcbiAgICAgIHJldHVybiBoYXNXaWR0aCA/IERpbWVuc2lvbi5XSURUSCA6IERpbWVuc2lvbi5IRUlHSFQ7XG4gICAgfTtcblxuICAgIF9wcm90by5fZ2V0UGFyZW50ID0gZnVuY3Rpb24gX2dldFBhcmVudCgpIHtcbiAgICAgIHZhciBfdGhpczMgPSB0aGlzO1xuXG4gICAgICB2YXIgcGFyZW50O1xuXG4gICAgICBpZiAoVXRpbC5pc0VsZW1lbnQodGhpcy5fY29uZmlnLnBhcmVudCkpIHtcbiAgICAgICAgcGFyZW50ID0gdGhpcy5fY29uZmlnLnBhcmVudDsgLy8gSXQncyBhIGpRdWVyeSBvYmplY3RcblxuICAgICAgICBpZiAodHlwZW9mIHRoaXMuX2NvbmZpZy5wYXJlbnQuanF1ZXJ5ICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgIHBhcmVudCA9IHRoaXMuX2NvbmZpZy5wYXJlbnRbMF07XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHBhcmVudCA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IodGhpcy5fY29uZmlnLnBhcmVudCk7XG4gICAgICB9XG5cbiAgICAgIHZhciBzZWxlY3RvciA9IFwiW2RhdGEtdG9nZ2xlPVxcXCJjb2xsYXBzZVxcXCJdW2RhdGEtcGFyZW50PVxcXCJcIiArIHRoaXMuX2NvbmZpZy5wYXJlbnQgKyBcIlxcXCJdXCI7XG4gICAgICB2YXIgY2hpbGRyZW4gPSBbXS5zbGljZS5jYWxsKHBhcmVudC5xdWVyeVNlbGVjdG9yQWxsKHNlbGVjdG9yKSk7XG4gICAgICAkKGNoaWxkcmVuKS5lYWNoKGZ1bmN0aW9uIChpLCBlbGVtZW50KSB7XG4gICAgICAgIF90aGlzMy5fYWRkQXJpYUFuZENvbGxhcHNlZENsYXNzKENvbGxhcHNlLl9nZXRUYXJnZXRGcm9tRWxlbWVudChlbGVtZW50KSwgW2VsZW1lbnRdKTtcbiAgICAgIH0pO1xuICAgICAgcmV0dXJuIHBhcmVudDtcbiAgICB9O1xuXG4gICAgX3Byb3RvLl9hZGRBcmlhQW5kQ29sbGFwc2VkQ2xhc3MgPSBmdW5jdGlvbiBfYWRkQXJpYUFuZENvbGxhcHNlZENsYXNzKGVsZW1lbnQsIHRyaWdnZXJBcnJheSkge1xuICAgICAgdmFyIGlzT3BlbiA9ICQoZWxlbWVudCkuaGFzQ2xhc3MoQ2xhc3NOYW1lJDMuU0hPVyk7XG5cbiAgICAgIGlmICh0cmlnZ2VyQXJyYXkubGVuZ3RoKSB7XG4gICAgICAgICQodHJpZ2dlckFycmF5KS50b2dnbGVDbGFzcyhDbGFzc05hbWUkMy5DT0xMQVBTRUQsICFpc09wZW4pLmF0dHIoJ2FyaWEtZXhwYW5kZWQnLCBpc09wZW4pO1xuICAgICAgfVxuICAgIH07IC8vIFN0YXRpY1xuXG5cbiAgICBDb2xsYXBzZS5fZ2V0VGFyZ2V0RnJvbUVsZW1lbnQgPSBmdW5jdGlvbiBfZ2V0VGFyZ2V0RnJvbUVsZW1lbnQoZWxlbWVudCkge1xuICAgICAgdmFyIHNlbGVjdG9yID0gVXRpbC5nZXRTZWxlY3RvckZyb21FbGVtZW50KGVsZW1lbnQpO1xuICAgICAgcmV0dXJuIHNlbGVjdG9yID8gZG9jdW1lbnQucXVlcnlTZWxlY3RvcihzZWxlY3RvcikgOiBudWxsO1xuICAgIH07XG5cbiAgICBDb2xsYXBzZS5falF1ZXJ5SW50ZXJmYWNlID0gZnVuY3Rpb24gX2pRdWVyeUludGVyZmFjZShjb25maWcpIHtcbiAgICAgIHJldHVybiB0aGlzLmVhY2goZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgJHRoaXMgPSAkKHRoaXMpO1xuICAgICAgICB2YXIgZGF0YSA9ICR0aGlzLmRhdGEoREFUQV9LRVkkMyk7XG5cbiAgICAgICAgdmFyIF9jb25maWcgPSBfb2JqZWN0U3ByZWFkKHt9LCBEZWZhdWx0JDEsICR0aGlzLmRhdGEoKSwgdHlwZW9mIGNvbmZpZyA9PT0gJ29iamVjdCcgJiYgY29uZmlnID8gY29uZmlnIDoge30pO1xuXG4gICAgICAgIGlmICghZGF0YSAmJiBfY29uZmlnLnRvZ2dsZSAmJiAvc2hvd3xoaWRlLy50ZXN0KGNvbmZpZykpIHtcbiAgICAgICAgICBfY29uZmlnLnRvZ2dsZSA9IGZhbHNlO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKCFkYXRhKSB7XG4gICAgICAgICAgZGF0YSA9IG5ldyBDb2xsYXBzZSh0aGlzLCBfY29uZmlnKTtcbiAgICAgICAgICAkdGhpcy5kYXRhKERBVEFfS0VZJDMsIGRhdGEpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHR5cGVvZiBjb25maWcgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgaWYgKHR5cGVvZiBkYXRhW2NvbmZpZ10gPT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKFwiTm8gbWV0aG9kIG5hbWVkIFxcXCJcIiArIGNvbmZpZyArIFwiXFxcIlwiKTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBkYXRhW2NvbmZpZ10oKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfTtcblxuICAgIF9jcmVhdGVDbGFzcyhDb2xsYXBzZSwgbnVsbCwgW3tcbiAgICAgIGtleTogXCJWRVJTSU9OXCIsXG4gICAgICBnZXQ6IGZ1bmN0aW9uIGdldCgpIHtcbiAgICAgICAgcmV0dXJuIFZFUlNJT04kMztcbiAgICAgIH1cbiAgICB9LCB7XG4gICAgICBrZXk6IFwiRGVmYXVsdFwiLFxuICAgICAgZ2V0OiBmdW5jdGlvbiBnZXQoKSB7XG4gICAgICAgIHJldHVybiBEZWZhdWx0JDE7XG4gICAgICB9XG4gICAgfV0pO1xuXG4gICAgcmV0dXJuIENvbGxhcHNlO1xuICB9KCk7XG4gIC8qKlxuICAgKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICogRGF0YSBBcGkgaW1wbGVtZW50YXRpb25cbiAgICogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAqL1xuXG5cbiAgJChkb2N1bWVudCkub24oRXZlbnQkMy5DTElDS19EQVRBX0FQSSwgU2VsZWN0b3IkMy5EQVRBX1RPR0dMRSwgZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgLy8gcHJldmVudERlZmF1bHQgb25seSBmb3IgPGE+IGVsZW1lbnRzICh3aGljaCBjaGFuZ2UgdGhlIFVSTCkgbm90IGluc2lkZSB0aGUgY29sbGFwc2libGUgZWxlbWVudFxuICAgIGlmIChldmVudC5jdXJyZW50VGFyZ2V0LnRhZ05hbWUgPT09ICdBJykge1xuICAgICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgICB9XG5cbiAgICB2YXIgJHRyaWdnZXIgPSAkKHRoaXMpO1xuICAgIHZhciBzZWxlY3RvciA9IFV0aWwuZ2V0U2VsZWN0b3JGcm9tRWxlbWVudCh0aGlzKTtcbiAgICB2YXIgc2VsZWN0b3JzID0gW10uc2xpY2UuY2FsbChkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKHNlbGVjdG9yKSk7XG4gICAgJChzZWxlY3RvcnMpLmVhY2goZnVuY3Rpb24gKCkge1xuICAgICAgdmFyICR0YXJnZXQgPSAkKHRoaXMpO1xuICAgICAgdmFyIGRhdGEgPSAkdGFyZ2V0LmRhdGEoREFUQV9LRVkkMyk7XG4gICAgICB2YXIgY29uZmlnID0gZGF0YSA/ICd0b2dnbGUnIDogJHRyaWdnZXIuZGF0YSgpO1xuXG4gICAgICBDb2xsYXBzZS5falF1ZXJ5SW50ZXJmYWNlLmNhbGwoJHRhcmdldCwgY29uZmlnKTtcbiAgICB9KTtcbiAgfSk7XG4gIC8qKlxuICAgKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICogalF1ZXJ5XG4gICAqIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgKi9cblxuICAkLmZuW05BTUUkM10gPSBDb2xsYXBzZS5falF1ZXJ5SW50ZXJmYWNlO1xuICAkLmZuW05BTUUkM10uQ29uc3RydWN0b3IgPSBDb2xsYXBzZTtcblxuICAkLmZuW05BTUUkM10ubm9Db25mbGljdCA9IGZ1bmN0aW9uICgpIHtcbiAgICAkLmZuW05BTUUkM10gPSBKUVVFUllfTk9fQ09ORkxJQ1QkMztcbiAgICByZXR1cm4gQ29sbGFwc2UuX2pRdWVyeUludGVyZmFjZTtcbiAgfTtcblxuICAvKipcbiAgICogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAqIENvbnN0YW50c1xuICAgKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICovXG5cbiAgdmFyIE5BTUUkNCA9ICdkcm9wZG93bic7XG4gIHZhciBWRVJTSU9OJDQgPSAnNC4yLjEnO1xuICB2YXIgREFUQV9LRVkkNCA9ICdicy5kcm9wZG93bic7XG4gIHZhciBFVkVOVF9LRVkkNCA9IFwiLlwiICsgREFUQV9LRVkkNDtcbiAgdmFyIERBVEFfQVBJX0tFWSQ0ID0gJy5kYXRhLWFwaSc7XG4gIHZhciBKUVVFUllfTk9fQ09ORkxJQ1QkNCA9ICQuZm5bTkFNRSQ0XTtcbiAgdmFyIEVTQ0FQRV9LRVlDT0RFID0gMjc7IC8vIEtleWJvYXJkRXZlbnQud2hpY2ggdmFsdWUgZm9yIEVzY2FwZSAoRXNjKSBrZXlcblxuICB2YXIgU1BBQ0VfS0VZQ09ERSA9IDMyOyAvLyBLZXlib2FyZEV2ZW50LndoaWNoIHZhbHVlIGZvciBzcGFjZSBrZXlcblxuICB2YXIgVEFCX0tFWUNPREUgPSA5OyAvLyBLZXlib2FyZEV2ZW50LndoaWNoIHZhbHVlIGZvciB0YWIga2V5XG5cbiAgdmFyIEFSUk9XX1VQX0tFWUNPREUgPSAzODsgLy8gS2V5Ym9hcmRFdmVudC53aGljaCB2YWx1ZSBmb3IgdXAgYXJyb3cga2V5XG5cbiAgdmFyIEFSUk9XX0RPV05fS0VZQ09ERSA9IDQwOyAvLyBLZXlib2FyZEV2ZW50LndoaWNoIHZhbHVlIGZvciBkb3duIGFycm93IGtleVxuXG4gIHZhciBSSUdIVF9NT1VTRV9CVVRUT05fV0hJQ0ggPSAzOyAvLyBNb3VzZUV2ZW50LndoaWNoIHZhbHVlIGZvciB0aGUgcmlnaHQgYnV0dG9uIChhc3N1bWluZyBhIHJpZ2h0LWhhbmRlZCBtb3VzZSlcblxuICB2YXIgUkVHRVhQX0tFWURPV04gPSBuZXcgUmVnRXhwKEFSUk9XX1VQX0tFWUNPREUgKyBcInxcIiArIEFSUk9XX0RPV05fS0VZQ09ERSArIFwifFwiICsgRVNDQVBFX0tFWUNPREUpO1xuICB2YXIgRXZlbnQkNCA9IHtcbiAgICBISURFOiBcImhpZGVcIiArIEVWRU5UX0tFWSQ0LFxuICAgIEhJRERFTjogXCJoaWRkZW5cIiArIEVWRU5UX0tFWSQ0LFxuICAgIFNIT1c6IFwic2hvd1wiICsgRVZFTlRfS0VZJDQsXG4gICAgU0hPV046IFwic2hvd25cIiArIEVWRU5UX0tFWSQ0LFxuICAgIENMSUNLOiBcImNsaWNrXCIgKyBFVkVOVF9LRVkkNCxcbiAgICBDTElDS19EQVRBX0FQSTogXCJjbGlja1wiICsgRVZFTlRfS0VZJDQgKyBEQVRBX0FQSV9LRVkkNCxcbiAgICBLRVlET1dOX0RBVEFfQVBJOiBcImtleWRvd25cIiArIEVWRU5UX0tFWSQ0ICsgREFUQV9BUElfS0VZJDQsXG4gICAgS0VZVVBfREFUQV9BUEk6IFwia2V5dXBcIiArIEVWRU5UX0tFWSQ0ICsgREFUQV9BUElfS0VZJDRcbiAgfTtcbiAgdmFyIENsYXNzTmFtZSQ0ID0ge1xuICAgIERJU0FCTEVEOiAnZGlzYWJsZWQnLFxuICAgIFNIT1c6ICdzaG93JyxcbiAgICBEUk9QVVA6ICdkcm9wdXAnLFxuICAgIERST1BSSUdIVDogJ2Ryb3ByaWdodCcsXG4gICAgRFJPUExFRlQ6ICdkcm9wbGVmdCcsXG4gICAgTUVOVVJJR0hUOiAnZHJvcGRvd24tbWVudS1yaWdodCcsXG4gICAgTUVOVUxFRlQ6ICdkcm9wZG93bi1tZW51LWxlZnQnLFxuICAgIFBPU0lUSU9OX1NUQVRJQzogJ3Bvc2l0aW9uLXN0YXRpYydcbiAgfTtcbiAgdmFyIFNlbGVjdG9yJDQgPSB7XG4gICAgREFUQV9UT0dHTEU6ICdbZGF0YS10b2dnbGU9XCJkcm9wZG93blwiXScsXG4gICAgRk9STV9DSElMRDogJy5kcm9wZG93biBmb3JtJyxcbiAgICBNRU5VOiAnLmRyb3Bkb3duLW1lbnUnLFxuICAgIE5BVkJBUl9OQVY6ICcubmF2YmFyLW5hdicsXG4gICAgVklTSUJMRV9JVEVNUzogJy5kcm9wZG93bi1tZW51IC5kcm9wZG93bi1pdGVtOm5vdCguZGlzYWJsZWQpOm5vdCg6ZGlzYWJsZWQpJ1xuICB9O1xuICB2YXIgQXR0YWNobWVudE1hcCA9IHtcbiAgICBUT1A6ICd0b3Atc3RhcnQnLFxuICAgIFRPUEVORDogJ3RvcC1lbmQnLFxuICAgIEJPVFRPTTogJ2JvdHRvbS1zdGFydCcsXG4gICAgQk9UVE9NRU5EOiAnYm90dG9tLWVuZCcsXG4gICAgUklHSFQ6ICdyaWdodC1zdGFydCcsXG4gICAgUklHSFRFTkQ6ICdyaWdodC1lbmQnLFxuICAgIExFRlQ6ICdsZWZ0LXN0YXJ0JyxcbiAgICBMRUZURU5EOiAnbGVmdC1lbmQnXG4gIH07XG4gIHZhciBEZWZhdWx0JDIgPSB7XG4gICAgb2Zmc2V0OiAwLFxuICAgIGZsaXA6IHRydWUsXG4gICAgYm91bmRhcnk6ICdzY3JvbGxQYXJlbnQnLFxuICAgIHJlZmVyZW5jZTogJ3RvZ2dsZScsXG4gICAgZGlzcGxheTogJ2R5bmFtaWMnXG4gIH07XG4gIHZhciBEZWZhdWx0VHlwZSQyID0ge1xuICAgIG9mZnNldDogJyhudW1iZXJ8c3RyaW5nfGZ1bmN0aW9uKScsXG4gICAgZmxpcDogJ2Jvb2xlYW4nLFxuICAgIGJvdW5kYXJ5OiAnKHN0cmluZ3xlbGVtZW50KScsXG4gICAgcmVmZXJlbmNlOiAnKHN0cmluZ3xlbGVtZW50KScsXG4gICAgZGlzcGxheTogJ3N0cmluZydcbiAgICAvKipcbiAgICAgKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICAgKiBDbGFzcyBEZWZpbml0aW9uXG4gICAgICogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAgICovXG5cbiAgfTtcblxuICB2YXIgRHJvcGRvd24gPVxuICAvKiNfX1BVUkVfXyovXG4gIGZ1bmN0aW9uICgpIHtcbiAgICBmdW5jdGlvbiBEcm9wZG93bihlbGVtZW50LCBjb25maWcpIHtcbiAgICAgIHRoaXMuX2VsZW1lbnQgPSBlbGVtZW50O1xuICAgICAgdGhpcy5fcG9wcGVyID0gbnVsbDtcbiAgICAgIHRoaXMuX2NvbmZpZyA9IHRoaXMuX2dldENvbmZpZyhjb25maWcpO1xuICAgICAgdGhpcy5fbWVudSA9IHRoaXMuX2dldE1lbnVFbGVtZW50KCk7XG4gICAgICB0aGlzLl9pbk5hdmJhciA9IHRoaXMuX2RldGVjdE5hdmJhcigpO1xuXG4gICAgICB0aGlzLl9hZGRFdmVudExpc3RlbmVycygpO1xuICAgIH0gLy8gR2V0dGVyc1xuXG5cbiAgICB2YXIgX3Byb3RvID0gRHJvcGRvd24ucHJvdG90eXBlO1xuXG4gICAgLy8gUHVibGljXG4gICAgX3Byb3RvLnRvZ2dsZSA9IGZ1bmN0aW9uIHRvZ2dsZSgpIHtcbiAgICAgIGlmICh0aGlzLl9lbGVtZW50LmRpc2FibGVkIHx8ICQodGhpcy5fZWxlbWVudCkuaGFzQ2xhc3MoQ2xhc3NOYW1lJDQuRElTQUJMRUQpKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgdmFyIHBhcmVudCA9IERyb3Bkb3duLl9nZXRQYXJlbnRGcm9tRWxlbWVudCh0aGlzLl9lbGVtZW50KTtcblxuICAgICAgdmFyIGlzQWN0aXZlID0gJCh0aGlzLl9tZW51KS5oYXNDbGFzcyhDbGFzc05hbWUkNC5TSE9XKTtcblxuICAgICAgRHJvcGRvd24uX2NsZWFyTWVudXMoKTtcblxuICAgICAgaWYgKGlzQWN0aXZlKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgdmFyIHJlbGF0ZWRUYXJnZXQgPSB7XG4gICAgICAgIHJlbGF0ZWRUYXJnZXQ6IHRoaXMuX2VsZW1lbnRcbiAgICAgIH07XG4gICAgICB2YXIgc2hvd0V2ZW50ID0gJC5FdmVudChFdmVudCQ0LlNIT1csIHJlbGF0ZWRUYXJnZXQpO1xuICAgICAgJChwYXJlbnQpLnRyaWdnZXIoc2hvd0V2ZW50KTtcblxuICAgICAgaWYgKHNob3dFdmVudC5pc0RlZmF1bHRQcmV2ZW50ZWQoKSkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9IC8vIERpc2FibGUgdG90YWxseSBQb3BwZXIuanMgZm9yIERyb3Bkb3duIGluIE5hdmJhclxuXG5cbiAgICAgIGlmICghdGhpcy5faW5OYXZiYXIpIHtcbiAgICAgICAgLyoqXG4gICAgICAgICAqIENoZWNrIGZvciBQb3BwZXIgZGVwZW5kZW5jeVxuICAgICAgICAgKiBQb3BwZXIgLSBodHRwczovL3BvcHBlci5qcy5vcmdcbiAgICAgICAgICovXG4gICAgICAgIGlmICh0eXBlb2YgUG9wcGVyID09PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ0Jvb3RzdHJhcFxcJ3MgZHJvcGRvd25zIHJlcXVpcmUgUG9wcGVyLmpzIChodHRwczovL3BvcHBlci5qcy5vcmcvKScpO1xuICAgICAgICB9XG5cbiAgICAgICAgdmFyIHJlZmVyZW5jZUVsZW1lbnQgPSB0aGlzLl9lbGVtZW50O1xuXG4gICAgICAgIGlmICh0aGlzLl9jb25maWcucmVmZXJlbmNlID09PSAncGFyZW50Jykge1xuICAgICAgICAgIHJlZmVyZW5jZUVsZW1lbnQgPSBwYXJlbnQ7XG4gICAgICAgIH0gZWxzZSBpZiAoVXRpbC5pc0VsZW1lbnQodGhpcy5fY29uZmlnLnJlZmVyZW5jZSkpIHtcbiAgICAgICAgICByZWZlcmVuY2VFbGVtZW50ID0gdGhpcy5fY29uZmlnLnJlZmVyZW5jZTsgLy8gQ2hlY2sgaWYgaXQncyBqUXVlcnkgZWxlbWVudFxuXG4gICAgICAgICAgaWYgKHR5cGVvZiB0aGlzLl9jb25maWcucmVmZXJlbmNlLmpxdWVyeSAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgIHJlZmVyZW5jZUVsZW1lbnQgPSB0aGlzLl9jb25maWcucmVmZXJlbmNlWzBdO1xuICAgICAgICAgIH1cbiAgICAgICAgfSAvLyBJZiBib3VuZGFyeSBpcyBub3QgYHNjcm9sbFBhcmVudGAsIHRoZW4gc2V0IHBvc2l0aW9uIHRvIGBzdGF0aWNgXG4gICAgICAgIC8vIHRvIGFsbG93IHRoZSBtZW51IHRvIFwiZXNjYXBlXCIgdGhlIHNjcm9sbCBwYXJlbnQncyBib3VuZGFyaWVzXG4gICAgICAgIC8vIGh0dHBzOi8vZ2l0aHViLmNvbS90d2JzL2Jvb3RzdHJhcC9pc3N1ZXMvMjQyNTFcblxuXG4gICAgICAgIGlmICh0aGlzLl9jb25maWcuYm91bmRhcnkgIT09ICdzY3JvbGxQYXJlbnQnKSB7XG4gICAgICAgICAgJChwYXJlbnQpLmFkZENsYXNzKENsYXNzTmFtZSQ0LlBPU0lUSU9OX1NUQVRJQyk7XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLl9wb3BwZXIgPSBuZXcgUG9wcGVyKHJlZmVyZW5jZUVsZW1lbnQsIHRoaXMuX21lbnUsIHRoaXMuX2dldFBvcHBlckNvbmZpZygpKTtcbiAgICAgIH0gLy8gSWYgdGhpcyBpcyBhIHRvdWNoLWVuYWJsZWQgZGV2aWNlIHdlIGFkZCBleHRyYVxuICAgICAgLy8gZW1wdHkgbW91c2VvdmVyIGxpc3RlbmVycyB0byB0aGUgYm9keSdzIGltbWVkaWF0ZSBjaGlsZHJlbjtcbiAgICAgIC8vIG9ubHkgbmVlZGVkIGJlY2F1c2Ugb2YgYnJva2VuIGV2ZW50IGRlbGVnYXRpb24gb24gaU9TXG4gICAgICAvLyBodHRwczovL3d3dy5xdWlya3Ntb2RlLm9yZy9ibG9nL2FyY2hpdmVzLzIwMTQvMDIvbW91c2VfZXZlbnRfYnViLmh0bWxcblxuXG4gICAgICBpZiAoJ29udG91Y2hzdGFydCcgaW4gZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50ICYmICQocGFyZW50KS5jbG9zZXN0KFNlbGVjdG9yJDQuTkFWQkFSX05BVikubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICQoZG9jdW1lbnQuYm9keSkuY2hpbGRyZW4oKS5vbignbW91c2VvdmVyJywgbnVsbCwgJC5ub29wKTtcbiAgICAgIH1cblxuICAgICAgdGhpcy5fZWxlbWVudC5mb2N1cygpO1xuXG4gICAgICB0aGlzLl9lbGVtZW50LnNldEF0dHJpYnV0ZSgnYXJpYS1leHBhbmRlZCcsIHRydWUpO1xuXG4gICAgICAkKHRoaXMuX21lbnUpLnRvZ2dsZUNsYXNzKENsYXNzTmFtZSQ0LlNIT1cpO1xuICAgICAgJChwYXJlbnQpLnRvZ2dsZUNsYXNzKENsYXNzTmFtZSQ0LlNIT1cpLnRyaWdnZXIoJC5FdmVudChFdmVudCQ0LlNIT1dOLCByZWxhdGVkVGFyZ2V0KSk7XG4gICAgfTtcblxuICAgIF9wcm90by5zaG93ID0gZnVuY3Rpb24gc2hvdygpIHtcbiAgICAgIGlmICh0aGlzLl9lbGVtZW50LmRpc2FibGVkIHx8ICQodGhpcy5fZWxlbWVudCkuaGFzQ2xhc3MoQ2xhc3NOYW1lJDQuRElTQUJMRUQpIHx8ICQodGhpcy5fbWVudSkuaGFzQ2xhc3MoQ2xhc3NOYW1lJDQuU0hPVykpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICB2YXIgcmVsYXRlZFRhcmdldCA9IHtcbiAgICAgICAgcmVsYXRlZFRhcmdldDogdGhpcy5fZWxlbWVudFxuICAgICAgfTtcbiAgICAgIHZhciBzaG93RXZlbnQgPSAkLkV2ZW50KEV2ZW50JDQuU0hPVywgcmVsYXRlZFRhcmdldCk7XG5cbiAgICAgIHZhciBwYXJlbnQgPSBEcm9wZG93bi5fZ2V0UGFyZW50RnJvbUVsZW1lbnQodGhpcy5fZWxlbWVudCk7XG5cbiAgICAgICQocGFyZW50KS50cmlnZ2VyKHNob3dFdmVudCk7XG5cbiAgICAgIGlmIChzaG93RXZlbnQuaXNEZWZhdWx0UHJldmVudGVkKCkpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICAkKHRoaXMuX21lbnUpLnRvZ2dsZUNsYXNzKENsYXNzTmFtZSQ0LlNIT1cpO1xuICAgICAgJChwYXJlbnQpLnRvZ2dsZUNsYXNzKENsYXNzTmFtZSQ0LlNIT1cpLnRyaWdnZXIoJC5FdmVudChFdmVudCQ0LlNIT1dOLCByZWxhdGVkVGFyZ2V0KSk7XG4gICAgfTtcblxuICAgIF9wcm90by5oaWRlID0gZnVuY3Rpb24gaGlkZSgpIHtcbiAgICAgIGlmICh0aGlzLl9lbGVtZW50LmRpc2FibGVkIHx8ICQodGhpcy5fZWxlbWVudCkuaGFzQ2xhc3MoQ2xhc3NOYW1lJDQuRElTQUJMRUQpIHx8ICEkKHRoaXMuX21lbnUpLmhhc0NsYXNzKENsYXNzTmFtZSQ0LlNIT1cpKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgdmFyIHJlbGF0ZWRUYXJnZXQgPSB7XG4gICAgICAgIHJlbGF0ZWRUYXJnZXQ6IHRoaXMuX2VsZW1lbnRcbiAgICAgIH07XG4gICAgICB2YXIgaGlkZUV2ZW50ID0gJC5FdmVudChFdmVudCQ0LkhJREUsIHJlbGF0ZWRUYXJnZXQpO1xuXG4gICAgICB2YXIgcGFyZW50ID0gRHJvcGRvd24uX2dldFBhcmVudEZyb21FbGVtZW50KHRoaXMuX2VsZW1lbnQpO1xuXG4gICAgICAkKHBhcmVudCkudHJpZ2dlcihoaWRlRXZlbnQpO1xuXG4gICAgICBpZiAoaGlkZUV2ZW50LmlzRGVmYXVsdFByZXZlbnRlZCgpKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgJCh0aGlzLl9tZW51KS50b2dnbGVDbGFzcyhDbGFzc05hbWUkNC5TSE9XKTtcbiAgICAgICQocGFyZW50KS50b2dnbGVDbGFzcyhDbGFzc05hbWUkNC5TSE9XKS50cmlnZ2VyKCQuRXZlbnQoRXZlbnQkNC5ISURERU4sIHJlbGF0ZWRUYXJnZXQpKTtcbiAgICB9O1xuXG4gICAgX3Byb3RvLmRpc3Bvc2UgPSBmdW5jdGlvbiBkaXNwb3NlKCkge1xuICAgICAgJC5yZW1vdmVEYXRhKHRoaXMuX2VsZW1lbnQsIERBVEFfS0VZJDQpO1xuICAgICAgJCh0aGlzLl9lbGVtZW50KS5vZmYoRVZFTlRfS0VZJDQpO1xuICAgICAgdGhpcy5fZWxlbWVudCA9IG51bGw7XG4gICAgICB0aGlzLl9tZW51ID0gbnVsbDtcblxuICAgICAgaWYgKHRoaXMuX3BvcHBlciAhPT0gbnVsbCkge1xuICAgICAgICB0aGlzLl9wb3BwZXIuZGVzdHJveSgpO1xuXG4gICAgICAgIHRoaXMuX3BvcHBlciA9IG51bGw7XG4gICAgICB9XG4gICAgfTtcblxuICAgIF9wcm90by51cGRhdGUgPSBmdW5jdGlvbiB1cGRhdGUoKSB7XG4gICAgICB0aGlzLl9pbk5hdmJhciA9IHRoaXMuX2RldGVjdE5hdmJhcigpO1xuXG4gICAgICBpZiAodGhpcy5fcG9wcGVyICE9PSBudWxsKSB7XG4gICAgICAgIHRoaXMuX3BvcHBlci5zY2hlZHVsZVVwZGF0ZSgpO1xuICAgICAgfVxuICAgIH07IC8vIFByaXZhdGVcblxuXG4gICAgX3Byb3RvLl9hZGRFdmVudExpc3RlbmVycyA9IGZ1bmN0aW9uIF9hZGRFdmVudExpc3RlbmVycygpIHtcbiAgICAgIHZhciBfdGhpcyA9IHRoaXM7XG5cbiAgICAgICQodGhpcy5fZWxlbWVudCkub24oRXZlbnQkNC5DTElDSywgZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgIGV2ZW50LnN0b3BQcm9wYWdhdGlvbigpO1xuXG4gICAgICAgIF90aGlzLnRvZ2dsZSgpO1xuICAgICAgfSk7XG4gICAgfTtcblxuICAgIF9wcm90by5fZ2V0Q29uZmlnID0gZnVuY3Rpb24gX2dldENvbmZpZyhjb25maWcpIHtcbiAgICAgIGNvbmZpZyA9IF9vYmplY3RTcHJlYWQoe30sIHRoaXMuY29uc3RydWN0b3IuRGVmYXVsdCwgJCh0aGlzLl9lbGVtZW50KS5kYXRhKCksIGNvbmZpZyk7XG4gICAgICBVdGlsLnR5cGVDaGVja0NvbmZpZyhOQU1FJDQsIGNvbmZpZywgdGhpcy5jb25zdHJ1Y3Rvci5EZWZhdWx0VHlwZSk7XG4gICAgICByZXR1cm4gY29uZmlnO1xuICAgIH07XG5cbiAgICBfcHJvdG8uX2dldE1lbnVFbGVtZW50ID0gZnVuY3Rpb24gX2dldE1lbnVFbGVtZW50KCkge1xuICAgICAgaWYgKCF0aGlzLl9tZW51KSB7XG4gICAgICAgIHZhciBwYXJlbnQgPSBEcm9wZG93bi5fZ2V0UGFyZW50RnJvbUVsZW1lbnQodGhpcy5fZWxlbWVudCk7XG5cbiAgICAgICAgaWYgKHBhcmVudCkge1xuICAgICAgICAgIHRoaXMuX21lbnUgPSBwYXJlbnQucXVlcnlTZWxlY3RvcihTZWxlY3RvciQ0Lk1FTlUpO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIHJldHVybiB0aGlzLl9tZW51O1xuICAgIH07XG5cbiAgICBfcHJvdG8uX2dldFBsYWNlbWVudCA9IGZ1bmN0aW9uIF9nZXRQbGFjZW1lbnQoKSB7XG4gICAgICB2YXIgJHBhcmVudERyb3Bkb3duID0gJCh0aGlzLl9lbGVtZW50LnBhcmVudE5vZGUpO1xuICAgICAgdmFyIHBsYWNlbWVudCA9IEF0dGFjaG1lbnRNYXAuQk9UVE9NOyAvLyBIYW5kbGUgZHJvcHVwXG5cbiAgICAgIGlmICgkcGFyZW50RHJvcGRvd24uaGFzQ2xhc3MoQ2xhc3NOYW1lJDQuRFJPUFVQKSkge1xuICAgICAgICBwbGFjZW1lbnQgPSBBdHRhY2htZW50TWFwLlRPUDtcblxuICAgICAgICBpZiAoJCh0aGlzLl9tZW51KS5oYXNDbGFzcyhDbGFzc05hbWUkNC5NRU5VUklHSFQpKSB7XG4gICAgICAgICAgcGxhY2VtZW50ID0gQXR0YWNobWVudE1hcC5UT1BFTkQ7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSBpZiAoJHBhcmVudERyb3Bkb3duLmhhc0NsYXNzKENsYXNzTmFtZSQ0LkRST1BSSUdIVCkpIHtcbiAgICAgICAgcGxhY2VtZW50ID0gQXR0YWNobWVudE1hcC5SSUdIVDtcbiAgICAgIH0gZWxzZSBpZiAoJHBhcmVudERyb3Bkb3duLmhhc0NsYXNzKENsYXNzTmFtZSQ0LkRST1BMRUZUKSkge1xuICAgICAgICBwbGFjZW1lbnQgPSBBdHRhY2htZW50TWFwLkxFRlQ7XG4gICAgICB9IGVsc2UgaWYgKCQodGhpcy5fbWVudSkuaGFzQ2xhc3MoQ2xhc3NOYW1lJDQuTUVOVVJJR0hUKSkge1xuICAgICAgICBwbGFjZW1lbnQgPSBBdHRhY2htZW50TWFwLkJPVFRPTUVORDtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHBsYWNlbWVudDtcbiAgICB9O1xuXG4gICAgX3Byb3RvLl9kZXRlY3ROYXZiYXIgPSBmdW5jdGlvbiBfZGV0ZWN0TmF2YmFyKCkge1xuICAgICAgcmV0dXJuICQodGhpcy5fZWxlbWVudCkuY2xvc2VzdCgnLm5hdmJhcicpLmxlbmd0aCA+IDA7XG4gICAgfTtcblxuICAgIF9wcm90by5fZ2V0UG9wcGVyQ29uZmlnID0gZnVuY3Rpb24gX2dldFBvcHBlckNvbmZpZygpIHtcbiAgICAgIHZhciBfdGhpczIgPSB0aGlzO1xuXG4gICAgICB2YXIgb2Zmc2V0Q29uZiA9IHt9O1xuXG4gICAgICBpZiAodHlwZW9mIHRoaXMuX2NvbmZpZy5vZmZzZXQgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgb2Zmc2V0Q29uZi5mbiA9IGZ1bmN0aW9uIChkYXRhKSB7XG4gICAgICAgICAgZGF0YS5vZmZzZXRzID0gX29iamVjdFNwcmVhZCh7fSwgZGF0YS5vZmZzZXRzLCBfdGhpczIuX2NvbmZpZy5vZmZzZXQoZGF0YS5vZmZzZXRzKSB8fCB7fSk7XG4gICAgICAgICAgcmV0dXJuIGRhdGE7XG4gICAgICAgIH07XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBvZmZzZXRDb25mLm9mZnNldCA9IHRoaXMuX2NvbmZpZy5vZmZzZXQ7XG4gICAgICB9XG5cbiAgICAgIHZhciBwb3BwZXJDb25maWcgPSB7XG4gICAgICAgIHBsYWNlbWVudDogdGhpcy5fZ2V0UGxhY2VtZW50KCksXG4gICAgICAgIG1vZGlmaWVyczoge1xuICAgICAgICAgIG9mZnNldDogb2Zmc2V0Q29uZixcbiAgICAgICAgICBmbGlwOiB7XG4gICAgICAgICAgICBlbmFibGVkOiB0aGlzLl9jb25maWcuZmxpcFxuICAgICAgICAgIH0sXG4gICAgICAgICAgcHJldmVudE92ZXJmbG93OiB7XG4gICAgICAgICAgICBib3VuZGFyaWVzRWxlbWVudDogdGhpcy5fY29uZmlnLmJvdW5kYXJ5XG4gICAgICAgICAgfVxuICAgICAgICB9IC8vIERpc2FibGUgUG9wcGVyLmpzIGlmIHdlIGhhdmUgYSBzdGF0aWMgZGlzcGxheVxuXG4gICAgICB9O1xuXG4gICAgICBpZiAodGhpcy5fY29uZmlnLmRpc3BsYXkgPT09ICdzdGF0aWMnKSB7XG4gICAgICAgIHBvcHBlckNvbmZpZy5tb2RpZmllcnMuYXBwbHlTdHlsZSA9IHtcbiAgICAgICAgICBlbmFibGVkOiBmYWxzZVxuICAgICAgICB9O1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gcG9wcGVyQ29uZmlnO1xuICAgIH07IC8vIFN0YXRpY1xuXG5cbiAgICBEcm9wZG93bi5falF1ZXJ5SW50ZXJmYWNlID0gZnVuY3Rpb24gX2pRdWVyeUludGVyZmFjZShjb25maWcpIHtcbiAgICAgIHJldHVybiB0aGlzLmVhY2goZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgZGF0YSA9ICQodGhpcykuZGF0YShEQVRBX0tFWSQ0KTtcblxuICAgICAgICB2YXIgX2NvbmZpZyA9IHR5cGVvZiBjb25maWcgPT09ICdvYmplY3QnID8gY29uZmlnIDogbnVsbDtcblxuICAgICAgICBpZiAoIWRhdGEpIHtcbiAgICAgICAgICBkYXRhID0gbmV3IERyb3Bkb3duKHRoaXMsIF9jb25maWcpO1xuICAgICAgICAgICQodGhpcykuZGF0YShEQVRBX0tFWSQ0LCBkYXRhKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh0eXBlb2YgY29uZmlnID09PSAnc3RyaW5nJykge1xuICAgICAgICAgIGlmICh0eXBlb2YgZGF0YVtjb25maWddID09PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihcIk5vIG1ldGhvZCBuYW1lZCBcXFwiXCIgKyBjb25maWcgKyBcIlxcXCJcIik7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgZGF0YVtjb25maWddKCk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH07XG5cbiAgICBEcm9wZG93bi5fY2xlYXJNZW51cyA9IGZ1bmN0aW9uIF9jbGVhck1lbnVzKGV2ZW50KSB7XG4gICAgICBpZiAoZXZlbnQgJiYgKGV2ZW50LndoaWNoID09PSBSSUdIVF9NT1VTRV9CVVRUT05fV0hJQ0ggfHwgZXZlbnQudHlwZSA9PT0gJ2tleXVwJyAmJiBldmVudC53aGljaCAhPT0gVEFCX0tFWUNPREUpKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgdmFyIHRvZ2dsZXMgPSBbXS5zbGljZS5jYWxsKGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoU2VsZWN0b3IkNC5EQVRBX1RPR0dMRSkpO1xuXG4gICAgICBmb3IgKHZhciBpID0gMCwgbGVuID0gdG9nZ2xlcy5sZW5ndGg7IGkgPCBsZW47IGkrKykge1xuICAgICAgICB2YXIgcGFyZW50ID0gRHJvcGRvd24uX2dldFBhcmVudEZyb21FbGVtZW50KHRvZ2dsZXNbaV0pO1xuXG4gICAgICAgIHZhciBjb250ZXh0ID0gJCh0b2dnbGVzW2ldKS5kYXRhKERBVEFfS0VZJDQpO1xuICAgICAgICB2YXIgcmVsYXRlZFRhcmdldCA9IHtcbiAgICAgICAgICByZWxhdGVkVGFyZ2V0OiB0b2dnbGVzW2ldXG4gICAgICAgIH07XG5cbiAgICAgICAgaWYgKGV2ZW50ICYmIGV2ZW50LnR5cGUgPT09ICdjbGljaycpIHtcbiAgICAgICAgICByZWxhdGVkVGFyZ2V0LmNsaWNrRXZlbnQgPSBldmVudDtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICghY29udGV4dCkge1xuICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG5cbiAgICAgICAgdmFyIGRyb3Bkb3duTWVudSA9IGNvbnRleHQuX21lbnU7XG5cbiAgICAgICAgaWYgKCEkKHBhcmVudCkuaGFzQ2xhc3MoQ2xhc3NOYW1lJDQuU0hPVykpIHtcbiAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChldmVudCAmJiAoZXZlbnQudHlwZSA9PT0gJ2NsaWNrJyAmJiAvaW5wdXR8dGV4dGFyZWEvaS50ZXN0KGV2ZW50LnRhcmdldC50YWdOYW1lKSB8fCBldmVudC50eXBlID09PSAna2V5dXAnICYmIGV2ZW50LndoaWNoID09PSBUQUJfS0VZQ09ERSkgJiYgJC5jb250YWlucyhwYXJlbnQsIGV2ZW50LnRhcmdldCkpIHtcbiAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfVxuXG4gICAgICAgIHZhciBoaWRlRXZlbnQgPSAkLkV2ZW50KEV2ZW50JDQuSElERSwgcmVsYXRlZFRhcmdldCk7XG4gICAgICAgICQocGFyZW50KS50cmlnZ2VyKGhpZGVFdmVudCk7XG5cbiAgICAgICAgaWYgKGhpZGVFdmVudC5pc0RlZmF1bHRQcmV2ZW50ZWQoKSkge1xuICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9IC8vIElmIHRoaXMgaXMgYSB0b3VjaC1lbmFibGVkIGRldmljZSB3ZSByZW1vdmUgdGhlIGV4dHJhXG4gICAgICAgIC8vIGVtcHR5IG1vdXNlb3ZlciBsaXN0ZW5lcnMgd2UgYWRkZWQgZm9yIGlPUyBzdXBwb3J0XG5cblxuICAgICAgICBpZiAoJ29udG91Y2hzdGFydCcgaW4gZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50KSB7XG4gICAgICAgICAgJChkb2N1bWVudC5ib2R5KS5jaGlsZHJlbigpLm9mZignbW91c2VvdmVyJywgbnVsbCwgJC5ub29wKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRvZ2dsZXNbaV0uc2V0QXR0cmlidXRlKCdhcmlhLWV4cGFuZGVkJywgJ2ZhbHNlJyk7XG4gICAgICAgICQoZHJvcGRvd25NZW51KS5yZW1vdmVDbGFzcyhDbGFzc05hbWUkNC5TSE9XKTtcbiAgICAgICAgJChwYXJlbnQpLnJlbW92ZUNsYXNzKENsYXNzTmFtZSQ0LlNIT1cpLnRyaWdnZXIoJC5FdmVudChFdmVudCQ0LkhJRERFTiwgcmVsYXRlZFRhcmdldCkpO1xuICAgICAgfVxuICAgIH07XG5cbiAgICBEcm9wZG93bi5fZ2V0UGFyZW50RnJvbUVsZW1lbnQgPSBmdW5jdGlvbiBfZ2V0UGFyZW50RnJvbUVsZW1lbnQoZWxlbWVudCkge1xuICAgICAgdmFyIHBhcmVudDtcbiAgICAgIHZhciBzZWxlY3RvciA9IFV0aWwuZ2V0U2VsZWN0b3JGcm9tRWxlbWVudChlbGVtZW50KTtcblxuICAgICAgaWYgKHNlbGVjdG9yKSB7XG4gICAgICAgIHBhcmVudCA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3Ioc2VsZWN0b3IpO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gcGFyZW50IHx8IGVsZW1lbnQucGFyZW50Tm9kZTtcbiAgICB9OyAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgY29tcGxleGl0eVxuXG5cbiAgICBEcm9wZG93bi5fZGF0YUFwaUtleWRvd25IYW5kbGVyID0gZnVuY3Rpb24gX2RhdGFBcGlLZXlkb3duSGFuZGxlcihldmVudCkge1xuICAgICAgLy8gSWYgbm90IGlucHV0L3RleHRhcmVhOlxuICAgICAgLy8gIC0gQW5kIG5vdCBhIGtleSBpbiBSRUdFWFBfS0VZRE9XTiA9PiBub3QgYSBkcm9wZG93biBjb21tYW5kXG4gICAgICAvLyBJZiBpbnB1dC90ZXh0YXJlYTpcbiAgICAgIC8vICAtIElmIHNwYWNlIGtleSA9PiBub3QgYSBkcm9wZG93biBjb21tYW5kXG4gICAgICAvLyAgLSBJZiBrZXkgaXMgb3RoZXIgdGhhbiBlc2NhcGVcbiAgICAgIC8vICAgIC0gSWYga2V5IGlzIG5vdCB1cCBvciBkb3duID0+IG5vdCBhIGRyb3Bkb3duIGNvbW1hbmRcbiAgICAgIC8vICAgIC0gSWYgdHJpZ2dlciBpbnNpZGUgdGhlIG1lbnUgPT4gbm90IGEgZHJvcGRvd24gY29tbWFuZFxuICAgICAgaWYgKC9pbnB1dHx0ZXh0YXJlYS9pLnRlc3QoZXZlbnQudGFyZ2V0LnRhZ05hbWUpID8gZXZlbnQud2hpY2ggPT09IFNQQUNFX0tFWUNPREUgfHwgZXZlbnQud2hpY2ggIT09IEVTQ0FQRV9LRVlDT0RFICYmIChldmVudC53aGljaCAhPT0gQVJST1dfRE9XTl9LRVlDT0RFICYmIGV2ZW50LndoaWNoICE9PSBBUlJPV19VUF9LRVlDT0RFIHx8ICQoZXZlbnQudGFyZ2V0KS5jbG9zZXN0KFNlbGVjdG9yJDQuTUVOVSkubGVuZ3RoKSA6ICFSRUdFWFBfS0VZRE9XTi50ZXN0KGV2ZW50LndoaWNoKSkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICBldmVudC5zdG9wUHJvcGFnYXRpb24oKTtcblxuICAgICAgaWYgKHRoaXMuZGlzYWJsZWQgfHwgJCh0aGlzKS5oYXNDbGFzcyhDbGFzc05hbWUkNC5ESVNBQkxFRCkpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICB2YXIgcGFyZW50ID0gRHJvcGRvd24uX2dldFBhcmVudEZyb21FbGVtZW50KHRoaXMpO1xuXG4gICAgICB2YXIgaXNBY3RpdmUgPSAkKHBhcmVudCkuaGFzQ2xhc3MoQ2xhc3NOYW1lJDQuU0hPVyk7XG5cbiAgICAgIGlmICghaXNBY3RpdmUgfHwgaXNBY3RpdmUgJiYgKGV2ZW50LndoaWNoID09PSBFU0NBUEVfS0VZQ09ERSB8fCBldmVudC53aGljaCA9PT0gU1BBQ0VfS0VZQ09ERSkpIHtcbiAgICAgICAgaWYgKGV2ZW50LndoaWNoID09PSBFU0NBUEVfS0VZQ09ERSkge1xuICAgICAgICAgIHZhciB0b2dnbGUgPSBwYXJlbnQucXVlcnlTZWxlY3RvcihTZWxlY3RvciQ0LkRBVEFfVE9HR0xFKTtcbiAgICAgICAgICAkKHRvZ2dsZSkudHJpZ2dlcignZm9jdXMnKTtcbiAgICAgICAgfVxuXG4gICAgICAgICQodGhpcykudHJpZ2dlcignY2xpY2snKTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICB2YXIgaXRlbXMgPSBbXS5zbGljZS5jYWxsKHBhcmVudC5xdWVyeVNlbGVjdG9yQWxsKFNlbGVjdG9yJDQuVklTSUJMRV9JVEVNUykpO1xuXG4gICAgICBpZiAoaXRlbXMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgdmFyIGluZGV4ID0gaXRlbXMuaW5kZXhPZihldmVudC50YXJnZXQpO1xuXG4gICAgICBpZiAoZXZlbnQud2hpY2ggPT09IEFSUk9XX1VQX0tFWUNPREUgJiYgaW5kZXggPiAwKSB7XG4gICAgICAgIC8vIFVwXG4gICAgICAgIGluZGV4LS07XG4gICAgICB9XG5cbiAgICAgIGlmIChldmVudC53aGljaCA9PT0gQVJST1dfRE9XTl9LRVlDT0RFICYmIGluZGV4IDwgaXRlbXMubGVuZ3RoIC0gMSkge1xuICAgICAgICAvLyBEb3duXG4gICAgICAgIGluZGV4Kys7XG4gICAgICB9XG5cbiAgICAgIGlmIChpbmRleCA8IDApIHtcbiAgICAgICAgaW5kZXggPSAwO1xuICAgICAgfVxuXG4gICAgICBpdGVtc1tpbmRleF0uZm9jdXMoKTtcbiAgICB9O1xuXG4gICAgX2NyZWF0ZUNsYXNzKERyb3Bkb3duLCBudWxsLCBbe1xuICAgICAga2V5OiBcIlZFUlNJT05cIixcbiAgICAgIGdldDogZnVuY3Rpb24gZ2V0KCkge1xuICAgICAgICByZXR1cm4gVkVSU0lPTiQ0O1xuICAgICAgfVxuICAgIH0sIHtcbiAgICAgIGtleTogXCJEZWZhdWx0XCIsXG4gICAgICBnZXQ6IGZ1bmN0aW9uIGdldCgpIHtcbiAgICAgICAgcmV0dXJuIERlZmF1bHQkMjtcbiAgICAgIH1cbiAgICB9LCB7XG4gICAgICBrZXk6IFwiRGVmYXVsdFR5cGVcIixcbiAgICAgIGdldDogZnVuY3Rpb24gZ2V0KCkge1xuICAgICAgICByZXR1cm4gRGVmYXVsdFR5cGUkMjtcbiAgICAgIH1cbiAgICB9XSk7XG5cbiAgICByZXR1cm4gRHJvcGRvd247XG4gIH0oKTtcbiAgLyoqXG4gICAqIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgKiBEYXRhIEFwaSBpbXBsZW1lbnRhdGlvblxuICAgKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICovXG5cblxuICAkKGRvY3VtZW50KS5vbihFdmVudCQ0LktFWURPV05fREFUQV9BUEksIFNlbGVjdG9yJDQuREFUQV9UT0dHTEUsIERyb3Bkb3duLl9kYXRhQXBpS2V5ZG93bkhhbmRsZXIpLm9uKEV2ZW50JDQuS0VZRE9XTl9EQVRBX0FQSSwgU2VsZWN0b3IkNC5NRU5VLCBEcm9wZG93bi5fZGF0YUFwaUtleWRvd25IYW5kbGVyKS5vbihFdmVudCQ0LkNMSUNLX0RBVEFfQVBJICsgXCIgXCIgKyBFdmVudCQ0LktFWVVQX0RBVEFfQVBJLCBEcm9wZG93bi5fY2xlYXJNZW51cykub24oRXZlbnQkNC5DTElDS19EQVRBX0FQSSwgU2VsZWN0b3IkNC5EQVRBX1RPR0dMRSwgZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgICBldmVudC5zdG9wUHJvcGFnYXRpb24oKTtcblxuICAgIERyb3Bkb3duLl9qUXVlcnlJbnRlcmZhY2UuY2FsbCgkKHRoaXMpLCAndG9nZ2xlJyk7XG4gIH0pLm9uKEV2ZW50JDQuQ0xJQ0tfREFUQV9BUEksIFNlbGVjdG9yJDQuRk9STV9DSElMRCwgZnVuY3Rpb24gKGUpIHtcbiAgICBlLnN0b3BQcm9wYWdhdGlvbigpO1xuICB9KTtcbiAgLyoqXG4gICAqIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgKiBqUXVlcnlcbiAgICogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAqL1xuXG4gICQuZm5bTkFNRSQ0XSA9IERyb3Bkb3duLl9qUXVlcnlJbnRlcmZhY2U7XG4gICQuZm5bTkFNRSQ0XS5Db25zdHJ1Y3RvciA9IERyb3Bkb3duO1xuXG4gICQuZm5bTkFNRSQ0XS5ub0NvbmZsaWN0ID0gZnVuY3Rpb24gKCkge1xuICAgICQuZm5bTkFNRSQ0XSA9IEpRVUVSWV9OT19DT05GTElDVCQ0O1xuICAgIHJldHVybiBEcm9wZG93bi5falF1ZXJ5SW50ZXJmYWNlO1xuICB9O1xuXG4gIC8qKlxuICAgKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICogQ29uc3RhbnRzXG4gICAqIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgKi9cblxuICB2YXIgTkFNRSQ1ID0gJ21vZGFsJztcbiAgdmFyIFZFUlNJT04kNSA9ICc0LjIuMSc7XG4gIHZhciBEQVRBX0tFWSQ1ID0gJ2JzLm1vZGFsJztcbiAgdmFyIEVWRU5UX0tFWSQ1ID0gXCIuXCIgKyBEQVRBX0tFWSQ1O1xuICB2YXIgREFUQV9BUElfS0VZJDUgPSAnLmRhdGEtYXBpJztcbiAgdmFyIEpRVUVSWV9OT19DT05GTElDVCQ1ID0gJC5mbltOQU1FJDVdO1xuICB2YXIgRVNDQVBFX0tFWUNPREUkMSA9IDI3OyAvLyBLZXlib2FyZEV2ZW50LndoaWNoIHZhbHVlIGZvciBFc2NhcGUgKEVzYykga2V5XG5cbiAgdmFyIERlZmF1bHQkMyA9IHtcbiAgICBiYWNrZHJvcDogdHJ1ZSxcbiAgICBrZXlib2FyZDogdHJ1ZSxcbiAgICBmb2N1czogdHJ1ZSxcbiAgICBzaG93OiB0cnVlXG4gIH07XG4gIHZhciBEZWZhdWx0VHlwZSQzID0ge1xuICAgIGJhY2tkcm9wOiAnKGJvb2xlYW58c3RyaW5nKScsXG4gICAga2V5Ym9hcmQ6ICdib29sZWFuJyxcbiAgICBmb2N1czogJ2Jvb2xlYW4nLFxuICAgIHNob3c6ICdib29sZWFuJ1xuICB9O1xuICB2YXIgRXZlbnQkNSA9IHtcbiAgICBISURFOiBcImhpZGVcIiArIEVWRU5UX0tFWSQ1LFxuICAgIEhJRERFTjogXCJoaWRkZW5cIiArIEVWRU5UX0tFWSQ1LFxuICAgIFNIT1c6IFwic2hvd1wiICsgRVZFTlRfS0VZJDUsXG4gICAgU0hPV046IFwic2hvd25cIiArIEVWRU5UX0tFWSQ1LFxuICAgIEZPQ1VTSU46IFwiZm9jdXNpblwiICsgRVZFTlRfS0VZJDUsXG4gICAgUkVTSVpFOiBcInJlc2l6ZVwiICsgRVZFTlRfS0VZJDUsXG4gICAgQ0xJQ0tfRElTTUlTUzogXCJjbGljay5kaXNtaXNzXCIgKyBFVkVOVF9LRVkkNSxcbiAgICBLRVlET1dOX0RJU01JU1M6IFwia2V5ZG93bi5kaXNtaXNzXCIgKyBFVkVOVF9LRVkkNSxcbiAgICBNT1VTRVVQX0RJU01JU1M6IFwibW91c2V1cC5kaXNtaXNzXCIgKyBFVkVOVF9LRVkkNSxcbiAgICBNT1VTRURPV05fRElTTUlTUzogXCJtb3VzZWRvd24uZGlzbWlzc1wiICsgRVZFTlRfS0VZJDUsXG4gICAgQ0xJQ0tfREFUQV9BUEk6IFwiY2xpY2tcIiArIEVWRU5UX0tFWSQ1ICsgREFUQV9BUElfS0VZJDVcbiAgfTtcbiAgdmFyIENsYXNzTmFtZSQ1ID0ge1xuICAgIFNDUk9MTEJBUl9NRUFTVVJFUjogJ21vZGFsLXNjcm9sbGJhci1tZWFzdXJlJyxcbiAgICBCQUNLRFJPUDogJ21vZGFsLWJhY2tkcm9wJyxcbiAgICBPUEVOOiAnbW9kYWwtb3BlbicsXG4gICAgRkFERTogJ2ZhZGUnLFxuICAgIFNIT1c6ICdzaG93J1xuICB9O1xuICB2YXIgU2VsZWN0b3IkNSA9IHtcbiAgICBESUFMT0c6ICcubW9kYWwtZGlhbG9nJyxcbiAgICBEQVRBX1RPR0dMRTogJ1tkYXRhLXRvZ2dsZT1cIm1vZGFsXCJdJyxcbiAgICBEQVRBX0RJU01JU1M6ICdbZGF0YS1kaXNtaXNzPVwibW9kYWxcIl0nLFxuICAgIEZJWEVEX0NPTlRFTlQ6ICcuZml4ZWQtdG9wLCAuZml4ZWQtYm90dG9tLCAuaXMtZml4ZWQsIC5zdGlja3ktdG9wJyxcbiAgICBTVElDS1lfQ09OVEVOVDogJy5zdGlja3ktdG9wJ1xuICAgIC8qKlxuICAgICAqIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgICAqIENsYXNzIERlZmluaXRpb25cbiAgICAgKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICAgKi9cblxuICB9O1xuXG4gIHZhciBNb2RhbCA9XG4gIC8qI19fUFVSRV9fKi9cbiAgZnVuY3Rpb24gKCkge1xuICAgIGZ1bmN0aW9uIE1vZGFsKGVsZW1lbnQsIGNvbmZpZykge1xuICAgICAgdGhpcy5fY29uZmlnID0gdGhpcy5fZ2V0Q29uZmlnKGNvbmZpZyk7XG4gICAgICB0aGlzLl9lbGVtZW50ID0gZWxlbWVudDtcbiAgICAgIHRoaXMuX2RpYWxvZyA9IGVsZW1lbnQucXVlcnlTZWxlY3RvcihTZWxlY3RvciQ1LkRJQUxPRyk7XG4gICAgICB0aGlzLl9iYWNrZHJvcCA9IG51bGw7XG4gICAgICB0aGlzLl9pc1Nob3duID0gZmFsc2U7XG4gICAgICB0aGlzLl9pc0JvZHlPdmVyZmxvd2luZyA9IGZhbHNlO1xuICAgICAgdGhpcy5faWdub3JlQmFja2Ryb3BDbGljayA9IGZhbHNlO1xuICAgICAgdGhpcy5faXNUcmFuc2l0aW9uaW5nID0gZmFsc2U7XG4gICAgICB0aGlzLl9zY3JvbGxiYXJXaWR0aCA9IDA7XG4gICAgfSAvLyBHZXR0ZXJzXG5cblxuICAgIHZhciBfcHJvdG8gPSBNb2RhbC5wcm90b3R5cGU7XG5cbiAgICAvLyBQdWJsaWNcbiAgICBfcHJvdG8udG9nZ2xlID0gZnVuY3Rpb24gdG9nZ2xlKHJlbGF0ZWRUYXJnZXQpIHtcbiAgICAgIHJldHVybiB0aGlzLl9pc1Nob3duID8gdGhpcy5oaWRlKCkgOiB0aGlzLnNob3cocmVsYXRlZFRhcmdldCk7XG4gICAgfTtcblxuICAgIF9wcm90by5zaG93ID0gZnVuY3Rpb24gc2hvdyhyZWxhdGVkVGFyZ2V0KSB7XG4gICAgICB2YXIgX3RoaXMgPSB0aGlzO1xuXG4gICAgICBpZiAodGhpcy5faXNTaG93biB8fCB0aGlzLl9pc1RyYW5zaXRpb25pbmcpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICBpZiAoJCh0aGlzLl9lbGVtZW50KS5oYXNDbGFzcyhDbGFzc05hbWUkNS5GQURFKSkge1xuICAgICAgICB0aGlzLl9pc1RyYW5zaXRpb25pbmcgPSB0cnVlO1xuICAgICAgfVxuXG4gICAgICB2YXIgc2hvd0V2ZW50ID0gJC5FdmVudChFdmVudCQ1LlNIT1csIHtcbiAgICAgICAgcmVsYXRlZFRhcmdldDogcmVsYXRlZFRhcmdldFxuICAgICAgfSk7XG4gICAgICAkKHRoaXMuX2VsZW1lbnQpLnRyaWdnZXIoc2hvd0V2ZW50KTtcblxuICAgICAgaWYgKHRoaXMuX2lzU2hvd24gfHwgc2hvd0V2ZW50LmlzRGVmYXVsdFByZXZlbnRlZCgpKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgdGhpcy5faXNTaG93biA9IHRydWU7XG5cbiAgICAgIHRoaXMuX2NoZWNrU2Nyb2xsYmFyKCk7XG5cbiAgICAgIHRoaXMuX3NldFNjcm9sbGJhcigpO1xuXG4gICAgICB0aGlzLl9hZGp1c3REaWFsb2coKTtcblxuICAgICAgdGhpcy5fc2V0RXNjYXBlRXZlbnQoKTtcblxuICAgICAgdGhpcy5fc2V0UmVzaXplRXZlbnQoKTtcblxuICAgICAgJCh0aGlzLl9lbGVtZW50KS5vbihFdmVudCQ1LkNMSUNLX0RJU01JU1MsIFNlbGVjdG9yJDUuREFUQV9ESVNNSVNTLCBmdW5jdGlvbiAoZXZlbnQpIHtcbiAgICAgICAgcmV0dXJuIF90aGlzLmhpZGUoZXZlbnQpO1xuICAgICAgfSk7XG4gICAgICAkKHRoaXMuX2RpYWxvZykub24oRXZlbnQkNS5NT1VTRURPV05fRElTTUlTUywgZnVuY3Rpb24gKCkge1xuICAgICAgICAkKF90aGlzLl9lbGVtZW50KS5vbmUoRXZlbnQkNS5NT1VTRVVQX0RJU01JU1MsIGZ1bmN0aW9uIChldmVudCkge1xuICAgICAgICAgIGlmICgkKGV2ZW50LnRhcmdldCkuaXMoX3RoaXMuX2VsZW1lbnQpKSB7XG4gICAgICAgICAgICBfdGhpcy5faWdub3JlQmFja2Ryb3BDbGljayA9IHRydWU7XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgIH0pO1xuXG4gICAgICB0aGlzLl9zaG93QmFja2Ryb3AoZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gX3RoaXMuX3Nob3dFbGVtZW50KHJlbGF0ZWRUYXJnZXQpO1xuICAgICAgfSk7XG4gICAgfTtcblxuICAgIF9wcm90by5oaWRlID0gZnVuY3Rpb24gaGlkZShldmVudCkge1xuICAgICAgdmFyIF90aGlzMiA9IHRoaXM7XG5cbiAgICAgIGlmIChldmVudCkge1xuICAgICAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgfVxuXG4gICAgICBpZiAoIXRoaXMuX2lzU2hvd24gfHwgdGhpcy5faXNUcmFuc2l0aW9uaW5nKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgdmFyIGhpZGVFdmVudCA9ICQuRXZlbnQoRXZlbnQkNS5ISURFKTtcbiAgICAgICQodGhpcy5fZWxlbWVudCkudHJpZ2dlcihoaWRlRXZlbnQpO1xuXG4gICAgICBpZiAoIXRoaXMuX2lzU2hvd24gfHwgaGlkZUV2ZW50LmlzRGVmYXVsdFByZXZlbnRlZCgpKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgdGhpcy5faXNTaG93biA9IGZhbHNlO1xuICAgICAgdmFyIHRyYW5zaXRpb24gPSAkKHRoaXMuX2VsZW1lbnQpLmhhc0NsYXNzKENsYXNzTmFtZSQ1LkZBREUpO1xuXG4gICAgICBpZiAodHJhbnNpdGlvbikge1xuICAgICAgICB0aGlzLl9pc1RyYW5zaXRpb25pbmcgPSB0cnVlO1xuICAgICAgfVxuXG4gICAgICB0aGlzLl9zZXRFc2NhcGVFdmVudCgpO1xuXG4gICAgICB0aGlzLl9zZXRSZXNpemVFdmVudCgpO1xuXG4gICAgICAkKGRvY3VtZW50KS5vZmYoRXZlbnQkNS5GT0NVU0lOKTtcbiAgICAgICQodGhpcy5fZWxlbWVudCkucmVtb3ZlQ2xhc3MoQ2xhc3NOYW1lJDUuU0hPVyk7XG4gICAgICAkKHRoaXMuX2VsZW1lbnQpLm9mZihFdmVudCQ1LkNMSUNLX0RJU01JU1MpO1xuICAgICAgJCh0aGlzLl9kaWFsb2cpLm9mZihFdmVudCQ1Lk1PVVNFRE9XTl9ESVNNSVNTKTtcblxuICAgICAgaWYgKHRyYW5zaXRpb24pIHtcbiAgICAgICAgdmFyIHRyYW5zaXRpb25EdXJhdGlvbiA9IFV0aWwuZ2V0VHJhbnNpdGlvbkR1cmF0aW9uRnJvbUVsZW1lbnQodGhpcy5fZWxlbWVudCk7XG4gICAgICAgICQodGhpcy5fZWxlbWVudCkub25lKFV0aWwuVFJBTlNJVElPTl9FTkQsIGZ1bmN0aW9uIChldmVudCkge1xuICAgICAgICAgIHJldHVybiBfdGhpczIuX2hpZGVNb2RhbChldmVudCk7XG4gICAgICAgIH0pLmVtdWxhdGVUcmFuc2l0aW9uRW5kKHRyYW5zaXRpb25EdXJhdGlvbik7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLl9oaWRlTW9kYWwoKTtcbiAgICAgIH1cbiAgICB9O1xuXG4gICAgX3Byb3RvLmRpc3Bvc2UgPSBmdW5jdGlvbiBkaXNwb3NlKCkge1xuICAgICAgW3dpbmRvdywgdGhpcy5fZWxlbWVudCwgdGhpcy5fZGlhbG9nXS5mb3JFYWNoKGZ1bmN0aW9uIChodG1sRWxlbWVudCkge1xuICAgICAgICByZXR1cm4gJChodG1sRWxlbWVudCkub2ZmKEVWRU5UX0tFWSQ1KTtcbiAgICAgIH0pO1xuICAgICAgLyoqXG4gICAgICAgKiBgZG9jdW1lbnRgIGhhcyAyIGV2ZW50cyBgRXZlbnQuRk9DVVNJTmAgYW5kIGBFdmVudC5DTElDS19EQVRBX0FQSWBcbiAgICAgICAqIERvIG5vdCBtb3ZlIGBkb2N1bWVudGAgaW4gYGh0bWxFbGVtZW50c2AgYXJyYXlcbiAgICAgICAqIEl0IHdpbGwgcmVtb3ZlIGBFdmVudC5DTElDS19EQVRBX0FQSWAgZXZlbnQgdGhhdCBzaG91bGQgcmVtYWluXG4gICAgICAgKi9cblxuICAgICAgJChkb2N1bWVudCkub2ZmKEV2ZW50JDUuRk9DVVNJTik7XG4gICAgICAkLnJlbW92ZURhdGEodGhpcy5fZWxlbWVudCwgREFUQV9LRVkkNSk7XG4gICAgICB0aGlzLl9jb25maWcgPSBudWxsO1xuICAgICAgdGhpcy5fZWxlbWVudCA9IG51bGw7XG4gICAgICB0aGlzLl9kaWFsb2cgPSBudWxsO1xuICAgICAgdGhpcy5fYmFja2Ryb3AgPSBudWxsO1xuICAgICAgdGhpcy5faXNTaG93biA9IG51bGw7XG4gICAgICB0aGlzLl9pc0JvZHlPdmVyZmxvd2luZyA9IG51bGw7XG4gICAgICB0aGlzLl9pZ25vcmVCYWNrZHJvcENsaWNrID0gbnVsbDtcbiAgICAgIHRoaXMuX2lzVHJhbnNpdGlvbmluZyA9IG51bGw7XG4gICAgICB0aGlzLl9zY3JvbGxiYXJXaWR0aCA9IG51bGw7XG4gICAgfTtcblxuICAgIF9wcm90by5oYW5kbGVVcGRhdGUgPSBmdW5jdGlvbiBoYW5kbGVVcGRhdGUoKSB7XG4gICAgICB0aGlzLl9hZGp1c3REaWFsb2coKTtcbiAgICB9OyAvLyBQcml2YXRlXG5cblxuICAgIF9wcm90by5fZ2V0Q29uZmlnID0gZnVuY3Rpb24gX2dldENvbmZpZyhjb25maWcpIHtcbiAgICAgIGNvbmZpZyA9IF9vYmplY3RTcHJlYWQoe30sIERlZmF1bHQkMywgY29uZmlnKTtcbiAgICAgIFV0aWwudHlwZUNoZWNrQ29uZmlnKE5BTUUkNSwgY29uZmlnLCBEZWZhdWx0VHlwZSQzKTtcbiAgICAgIHJldHVybiBjb25maWc7XG4gICAgfTtcblxuICAgIF9wcm90by5fc2hvd0VsZW1lbnQgPSBmdW5jdGlvbiBfc2hvd0VsZW1lbnQocmVsYXRlZFRhcmdldCkge1xuICAgICAgdmFyIF90aGlzMyA9IHRoaXM7XG5cbiAgICAgIHZhciB0cmFuc2l0aW9uID0gJCh0aGlzLl9lbGVtZW50KS5oYXNDbGFzcyhDbGFzc05hbWUkNS5GQURFKTtcblxuICAgICAgaWYgKCF0aGlzLl9lbGVtZW50LnBhcmVudE5vZGUgfHwgdGhpcy5fZWxlbWVudC5wYXJlbnROb2RlLm5vZGVUeXBlICE9PSBOb2RlLkVMRU1FTlRfTk9ERSkge1xuICAgICAgICAvLyBEb24ndCBtb3ZlIG1vZGFsJ3MgRE9NIHBvc2l0aW9uXG4gICAgICAgIGRvY3VtZW50LmJvZHkuYXBwZW5kQ2hpbGQodGhpcy5fZWxlbWVudCk7XG4gICAgICB9XG5cbiAgICAgIHRoaXMuX2VsZW1lbnQuc3R5bGUuZGlzcGxheSA9ICdibG9jayc7XG5cbiAgICAgIHRoaXMuX2VsZW1lbnQucmVtb3ZlQXR0cmlidXRlKCdhcmlhLWhpZGRlbicpO1xuXG4gICAgICB0aGlzLl9lbGVtZW50LnNldEF0dHJpYnV0ZSgnYXJpYS1tb2RhbCcsIHRydWUpO1xuXG4gICAgICB0aGlzLl9lbGVtZW50LnNjcm9sbFRvcCA9IDA7XG5cbiAgICAgIGlmICh0cmFuc2l0aW9uKSB7XG4gICAgICAgIFV0aWwucmVmbG93KHRoaXMuX2VsZW1lbnQpO1xuICAgICAgfVxuXG4gICAgICAkKHRoaXMuX2VsZW1lbnQpLmFkZENsYXNzKENsYXNzTmFtZSQ1LlNIT1cpO1xuXG4gICAgICBpZiAodGhpcy5fY29uZmlnLmZvY3VzKSB7XG4gICAgICAgIHRoaXMuX2VuZm9yY2VGb2N1cygpO1xuICAgICAgfVxuXG4gICAgICB2YXIgc2hvd25FdmVudCA9ICQuRXZlbnQoRXZlbnQkNS5TSE9XTiwge1xuICAgICAgICByZWxhdGVkVGFyZ2V0OiByZWxhdGVkVGFyZ2V0XG4gICAgICB9KTtcblxuICAgICAgdmFyIHRyYW5zaXRpb25Db21wbGV0ZSA9IGZ1bmN0aW9uIHRyYW5zaXRpb25Db21wbGV0ZSgpIHtcbiAgICAgICAgaWYgKF90aGlzMy5fY29uZmlnLmZvY3VzKSB7XG4gICAgICAgICAgX3RoaXMzLl9lbGVtZW50LmZvY3VzKCk7XG4gICAgICAgIH1cblxuICAgICAgICBfdGhpczMuX2lzVHJhbnNpdGlvbmluZyA9IGZhbHNlO1xuICAgICAgICAkKF90aGlzMy5fZWxlbWVudCkudHJpZ2dlcihzaG93bkV2ZW50KTtcbiAgICAgIH07XG5cbiAgICAgIGlmICh0cmFuc2l0aW9uKSB7XG4gICAgICAgIHZhciB0cmFuc2l0aW9uRHVyYXRpb24gPSBVdGlsLmdldFRyYW5zaXRpb25EdXJhdGlvbkZyb21FbGVtZW50KHRoaXMuX2RpYWxvZyk7XG4gICAgICAgICQodGhpcy5fZGlhbG9nKS5vbmUoVXRpbC5UUkFOU0lUSU9OX0VORCwgdHJhbnNpdGlvbkNvbXBsZXRlKS5lbXVsYXRlVHJhbnNpdGlvbkVuZCh0cmFuc2l0aW9uRHVyYXRpb24pO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdHJhbnNpdGlvbkNvbXBsZXRlKCk7XG4gICAgICB9XG4gICAgfTtcblxuICAgIF9wcm90by5fZW5mb3JjZUZvY3VzID0gZnVuY3Rpb24gX2VuZm9yY2VGb2N1cygpIHtcbiAgICAgIHZhciBfdGhpczQgPSB0aGlzO1xuXG4gICAgICAkKGRvY3VtZW50KS5vZmYoRXZlbnQkNS5GT0NVU0lOKSAvLyBHdWFyZCBhZ2FpbnN0IGluZmluaXRlIGZvY3VzIGxvb3BcbiAgICAgIC5vbihFdmVudCQ1LkZPQ1VTSU4sIGZ1bmN0aW9uIChldmVudCkge1xuICAgICAgICBpZiAoZG9jdW1lbnQgIT09IGV2ZW50LnRhcmdldCAmJiBfdGhpczQuX2VsZW1lbnQgIT09IGV2ZW50LnRhcmdldCAmJiAkKF90aGlzNC5fZWxlbWVudCkuaGFzKGV2ZW50LnRhcmdldCkubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgX3RoaXM0Ll9lbGVtZW50LmZvY3VzKCk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH07XG5cbiAgICBfcHJvdG8uX3NldEVzY2FwZUV2ZW50ID0gZnVuY3Rpb24gX3NldEVzY2FwZUV2ZW50KCkge1xuICAgICAgdmFyIF90aGlzNSA9IHRoaXM7XG5cbiAgICAgIGlmICh0aGlzLl9pc1Nob3duICYmIHRoaXMuX2NvbmZpZy5rZXlib2FyZCkge1xuICAgICAgICAkKHRoaXMuX2VsZW1lbnQpLm9uKEV2ZW50JDUuS0VZRE9XTl9ESVNNSVNTLCBmdW5jdGlvbiAoZXZlbnQpIHtcbiAgICAgICAgICBpZiAoZXZlbnQud2hpY2ggPT09IEVTQ0FQRV9LRVlDT0RFJDEpIHtcbiAgICAgICAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG5cbiAgICAgICAgICAgIF90aGlzNS5oaWRlKCk7XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgIH0gZWxzZSBpZiAoIXRoaXMuX2lzU2hvd24pIHtcbiAgICAgICAgJCh0aGlzLl9lbGVtZW50KS5vZmYoRXZlbnQkNS5LRVlET1dOX0RJU01JU1MpO1xuICAgICAgfVxuICAgIH07XG5cbiAgICBfcHJvdG8uX3NldFJlc2l6ZUV2ZW50ID0gZnVuY3Rpb24gX3NldFJlc2l6ZUV2ZW50KCkge1xuICAgICAgdmFyIF90aGlzNiA9IHRoaXM7XG5cbiAgICAgIGlmICh0aGlzLl9pc1Nob3duKSB7XG4gICAgICAgICQod2luZG93KS5vbihFdmVudCQ1LlJFU0laRSwgZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgICAgICAgcmV0dXJuIF90aGlzNi5oYW5kbGVVcGRhdGUoZXZlbnQpO1xuICAgICAgICB9KTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgICQod2luZG93KS5vZmYoRXZlbnQkNS5SRVNJWkUpO1xuICAgICAgfVxuICAgIH07XG5cbiAgICBfcHJvdG8uX2hpZGVNb2RhbCA9IGZ1bmN0aW9uIF9oaWRlTW9kYWwoKSB7XG4gICAgICB2YXIgX3RoaXM3ID0gdGhpcztcblxuICAgICAgdGhpcy5fZWxlbWVudC5zdHlsZS5kaXNwbGF5ID0gJ25vbmUnO1xuXG4gICAgICB0aGlzLl9lbGVtZW50LnNldEF0dHJpYnV0ZSgnYXJpYS1oaWRkZW4nLCB0cnVlKTtcblxuICAgICAgdGhpcy5fZWxlbWVudC5yZW1vdmVBdHRyaWJ1dGUoJ2FyaWEtbW9kYWwnKTtcblxuICAgICAgdGhpcy5faXNUcmFuc2l0aW9uaW5nID0gZmFsc2U7XG5cbiAgICAgIHRoaXMuX3Nob3dCYWNrZHJvcChmdW5jdGlvbiAoKSB7XG4gICAgICAgICQoZG9jdW1lbnQuYm9keSkucmVtb3ZlQ2xhc3MoQ2xhc3NOYW1lJDUuT1BFTik7XG5cbiAgICAgICAgX3RoaXM3Ll9yZXNldEFkanVzdG1lbnRzKCk7XG5cbiAgICAgICAgX3RoaXM3Ll9yZXNldFNjcm9sbGJhcigpO1xuXG4gICAgICAgICQoX3RoaXM3Ll9lbGVtZW50KS50cmlnZ2VyKEV2ZW50JDUuSElEREVOKTtcbiAgICAgIH0pO1xuICAgIH07XG5cbiAgICBfcHJvdG8uX3JlbW92ZUJhY2tkcm9wID0gZnVuY3Rpb24gX3JlbW92ZUJhY2tkcm9wKCkge1xuICAgICAgaWYgKHRoaXMuX2JhY2tkcm9wKSB7XG4gICAgICAgICQodGhpcy5fYmFja2Ryb3ApLnJlbW92ZSgpO1xuICAgICAgICB0aGlzLl9iYWNrZHJvcCA9IG51bGw7XG4gICAgICB9XG4gICAgfTtcblxuICAgIF9wcm90by5fc2hvd0JhY2tkcm9wID0gZnVuY3Rpb24gX3Nob3dCYWNrZHJvcChjYWxsYmFjaykge1xuICAgICAgdmFyIF90aGlzOCA9IHRoaXM7XG5cbiAgICAgIHZhciBhbmltYXRlID0gJCh0aGlzLl9lbGVtZW50KS5oYXNDbGFzcyhDbGFzc05hbWUkNS5GQURFKSA/IENsYXNzTmFtZSQ1LkZBREUgOiAnJztcblxuICAgICAgaWYgKHRoaXMuX2lzU2hvd24gJiYgdGhpcy5fY29uZmlnLmJhY2tkcm9wKSB7XG4gICAgICAgIHRoaXMuX2JhY2tkcm9wID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4gICAgICAgIHRoaXMuX2JhY2tkcm9wLmNsYXNzTmFtZSA9IENsYXNzTmFtZSQ1LkJBQ0tEUk9QO1xuXG4gICAgICAgIGlmIChhbmltYXRlKSB7XG4gICAgICAgICAgdGhpcy5fYmFja2Ryb3AuY2xhc3NMaXN0LmFkZChhbmltYXRlKTtcbiAgICAgICAgfVxuXG4gICAgICAgICQodGhpcy5fYmFja2Ryb3ApLmFwcGVuZFRvKGRvY3VtZW50LmJvZHkpO1xuICAgICAgICAkKHRoaXMuX2VsZW1lbnQpLm9uKEV2ZW50JDUuQ0xJQ0tfRElTTUlTUywgZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgICAgICAgaWYgKF90aGlzOC5faWdub3JlQmFja2Ryb3BDbGljaykge1xuICAgICAgICAgICAgX3RoaXM4Ll9pZ25vcmVCYWNrZHJvcENsaWNrID0gZmFsc2U7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgaWYgKGV2ZW50LnRhcmdldCAhPT0gZXZlbnQuY3VycmVudFRhcmdldCkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIGlmIChfdGhpczguX2NvbmZpZy5iYWNrZHJvcCA9PT0gJ3N0YXRpYycpIHtcbiAgICAgICAgICAgIF90aGlzOC5fZWxlbWVudC5mb2N1cygpO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBfdGhpczguaGlkZSgpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgaWYgKGFuaW1hdGUpIHtcbiAgICAgICAgICBVdGlsLnJlZmxvdyh0aGlzLl9iYWNrZHJvcCk7XG4gICAgICAgIH1cblxuICAgICAgICAkKHRoaXMuX2JhY2tkcm9wKS5hZGRDbGFzcyhDbGFzc05hbWUkNS5TSE9XKTtcblxuICAgICAgICBpZiAoIWNhbGxiYWNrKSB7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKCFhbmltYXRlKSB7XG4gICAgICAgICAgY2FsbGJhY2soKTtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgYmFja2Ryb3BUcmFuc2l0aW9uRHVyYXRpb24gPSBVdGlsLmdldFRyYW5zaXRpb25EdXJhdGlvbkZyb21FbGVtZW50KHRoaXMuX2JhY2tkcm9wKTtcbiAgICAgICAgJCh0aGlzLl9iYWNrZHJvcCkub25lKFV0aWwuVFJBTlNJVElPTl9FTkQsIGNhbGxiYWNrKS5lbXVsYXRlVHJhbnNpdGlvbkVuZChiYWNrZHJvcFRyYW5zaXRpb25EdXJhdGlvbik7XG4gICAgICB9IGVsc2UgaWYgKCF0aGlzLl9pc1Nob3duICYmIHRoaXMuX2JhY2tkcm9wKSB7XG4gICAgICAgICQodGhpcy5fYmFja2Ryb3ApLnJlbW92ZUNsYXNzKENsYXNzTmFtZSQ1LlNIT1cpO1xuXG4gICAgICAgIHZhciBjYWxsYmFja1JlbW92ZSA9IGZ1bmN0aW9uIGNhbGxiYWNrUmVtb3ZlKCkge1xuICAgICAgICAgIF90aGlzOC5fcmVtb3ZlQmFja2Ryb3AoKTtcblxuICAgICAgICAgIGlmIChjYWxsYmFjaykge1xuICAgICAgICAgICAgY2FsbGJhY2soKTtcbiAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgICAgaWYgKCQodGhpcy5fZWxlbWVudCkuaGFzQ2xhc3MoQ2xhc3NOYW1lJDUuRkFERSkpIHtcbiAgICAgICAgICB2YXIgX2JhY2tkcm9wVHJhbnNpdGlvbkR1cmF0aW9uID0gVXRpbC5nZXRUcmFuc2l0aW9uRHVyYXRpb25Gcm9tRWxlbWVudCh0aGlzLl9iYWNrZHJvcCk7XG5cbiAgICAgICAgICAkKHRoaXMuX2JhY2tkcm9wKS5vbmUoVXRpbC5UUkFOU0lUSU9OX0VORCwgY2FsbGJhY2tSZW1vdmUpLmVtdWxhdGVUcmFuc2l0aW9uRW5kKF9iYWNrZHJvcFRyYW5zaXRpb25EdXJhdGlvbik7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgY2FsbGJhY2tSZW1vdmUoKTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIGlmIChjYWxsYmFjaykge1xuICAgICAgICBjYWxsYmFjaygpO1xuICAgICAgfVxuICAgIH07IC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICAvLyB0aGUgZm9sbG93aW5nIG1ldGhvZHMgYXJlIHVzZWQgdG8gaGFuZGxlIG92ZXJmbG93aW5nIG1vZGFsc1xuICAgIC8vIHRvZG8gKGZhdCk6IHRoZXNlIHNob3VsZCBwcm9iYWJseSBiZSByZWZhY3RvcmVkIG91dCBvZiBtb2RhbC5qc1xuICAgIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuXG4gICAgX3Byb3RvLl9hZGp1c3REaWFsb2cgPSBmdW5jdGlvbiBfYWRqdXN0RGlhbG9nKCkge1xuICAgICAgdmFyIGlzTW9kYWxPdmVyZmxvd2luZyA9IHRoaXMuX2VsZW1lbnQuc2Nyb2xsSGVpZ2h0ID4gZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LmNsaWVudEhlaWdodDtcblxuICAgICAgaWYgKCF0aGlzLl9pc0JvZHlPdmVyZmxvd2luZyAmJiBpc01vZGFsT3ZlcmZsb3dpbmcpIHtcbiAgICAgICAgdGhpcy5fZWxlbWVudC5zdHlsZS5wYWRkaW5nTGVmdCA9IHRoaXMuX3Njcm9sbGJhcldpZHRoICsgXCJweFwiO1xuICAgICAgfVxuXG4gICAgICBpZiAodGhpcy5faXNCb2R5T3ZlcmZsb3dpbmcgJiYgIWlzTW9kYWxPdmVyZmxvd2luZykge1xuICAgICAgICB0aGlzLl9lbGVtZW50LnN0eWxlLnBhZGRpbmdSaWdodCA9IHRoaXMuX3Njcm9sbGJhcldpZHRoICsgXCJweFwiO1xuICAgICAgfVxuICAgIH07XG5cbiAgICBfcHJvdG8uX3Jlc2V0QWRqdXN0bWVudHMgPSBmdW5jdGlvbiBfcmVzZXRBZGp1c3RtZW50cygpIHtcbiAgICAgIHRoaXMuX2VsZW1lbnQuc3R5bGUucGFkZGluZ0xlZnQgPSAnJztcbiAgICAgIHRoaXMuX2VsZW1lbnQuc3R5bGUucGFkZGluZ1JpZ2h0ID0gJyc7XG4gICAgfTtcblxuICAgIF9wcm90by5fY2hlY2tTY3JvbGxiYXIgPSBmdW5jdGlvbiBfY2hlY2tTY3JvbGxiYXIoKSB7XG4gICAgICB2YXIgcmVjdCA9IGRvY3VtZW50LmJvZHkuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XG4gICAgICB0aGlzLl9pc0JvZHlPdmVyZmxvd2luZyA9IHJlY3QubGVmdCArIHJlY3QucmlnaHQgPCB3aW5kb3cuaW5uZXJXaWR0aDtcbiAgICAgIHRoaXMuX3Njcm9sbGJhcldpZHRoID0gdGhpcy5fZ2V0U2Nyb2xsYmFyV2lkdGgoKTtcbiAgICB9O1xuXG4gICAgX3Byb3RvLl9zZXRTY3JvbGxiYXIgPSBmdW5jdGlvbiBfc2V0U2Nyb2xsYmFyKCkge1xuICAgICAgdmFyIF90aGlzOSA9IHRoaXM7XG5cbiAgICAgIGlmICh0aGlzLl9pc0JvZHlPdmVyZmxvd2luZykge1xuICAgICAgICAvLyBOb3RlOiBET01Ob2RlLnN0eWxlLnBhZGRpbmdSaWdodCByZXR1cm5zIHRoZSBhY3R1YWwgdmFsdWUgb3IgJycgaWYgbm90IHNldFxuICAgICAgICAvLyAgIHdoaWxlICQoRE9NTm9kZSkuY3NzKCdwYWRkaW5nLXJpZ2h0JykgcmV0dXJucyB0aGUgY2FsY3VsYXRlZCB2YWx1ZSBvciAwIGlmIG5vdCBzZXRcbiAgICAgICAgdmFyIGZpeGVkQ29udGVudCA9IFtdLnNsaWNlLmNhbGwoZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbChTZWxlY3RvciQ1LkZJWEVEX0NPTlRFTlQpKTtcbiAgICAgICAgdmFyIHN0aWNreUNvbnRlbnQgPSBbXS5zbGljZS5jYWxsKGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoU2VsZWN0b3IkNS5TVElDS1lfQ09OVEVOVCkpOyAvLyBBZGp1c3QgZml4ZWQgY29udGVudCBwYWRkaW5nXG5cbiAgICAgICAgJChmaXhlZENvbnRlbnQpLmVhY2goZnVuY3Rpb24gKGluZGV4LCBlbGVtZW50KSB7XG4gICAgICAgICAgdmFyIGFjdHVhbFBhZGRpbmcgPSBlbGVtZW50LnN0eWxlLnBhZGRpbmdSaWdodDtcbiAgICAgICAgICB2YXIgY2FsY3VsYXRlZFBhZGRpbmcgPSAkKGVsZW1lbnQpLmNzcygncGFkZGluZy1yaWdodCcpO1xuICAgICAgICAgICQoZWxlbWVudCkuZGF0YSgncGFkZGluZy1yaWdodCcsIGFjdHVhbFBhZGRpbmcpLmNzcygncGFkZGluZy1yaWdodCcsIHBhcnNlRmxvYXQoY2FsY3VsYXRlZFBhZGRpbmcpICsgX3RoaXM5Ll9zY3JvbGxiYXJXaWR0aCArIFwicHhcIik7XG4gICAgICAgIH0pOyAvLyBBZGp1c3Qgc3RpY2t5IGNvbnRlbnQgbWFyZ2luXG5cbiAgICAgICAgJChzdGlja3lDb250ZW50KS5lYWNoKGZ1bmN0aW9uIChpbmRleCwgZWxlbWVudCkge1xuICAgICAgICAgIHZhciBhY3R1YWxNYXJnaW4gPSBlbGVtZW50LnN0eWxlLm1hcmdpblJpZ2h0O1xuICAgICAgICAgIHZhciBjYWxjdWxhdGVkTWFyZ2luID0gJChlbGVtZW50KS5jc3MoJ21hcmdpbi1yaWdodCcpO1xuICAgICAgICAgICQoZWxlbWVudCkuZGF0YSgnbWFyZ2luLXJpZ2h0JywgYWN0dWFsTWFyZ2luKS5jc3MoJ21hcmdpbi1yaWdodCcsIHBhcnNlRmxvYXQoY2FsY3VsYXRlZE1hcmdpbikgLSBfdGhpczkuX3Njcm9sbGJhcldpZHRoICsgXCJweFwiKTtcbiAgICAgICAgfSk7IC8vIEFkanVzdCBib2R5IHBhZGRpbmdcblxuICAgICAgICB2YXIgYWN0dWFsUGFkZGluZyA9IGRvY3VtZW50LmJvZHkuc3R5bGUucGFkZGluZ1JpZ2h0O1xuICAgICAgICB2YXIgY2FsY3VsYXRlZFBhZGRpbmcgPSAkKGRvY3VtZW50LmJvZHkpLmNzcygncGFkZGluZy1yaWdodCcpO1xuICAgICAgICAkKGRvY3VtZW50LmJvZHkpLmRhdGEoJ3BhZGRpbmctcmlnaHQnLCBhY3R1YWxQYWRkaW5nKS5jc3MoJ3BhZGRpbmctcmlnaHQnLCBwYXJzZUZsb2F0KGNhbGN1bGF0ZWRQYWRkaW5nKSArIHRoaXMuX3Njcm9sbGJhcldpZHRoICsgXCJweFwiKTtcbiAgICAgIH1cblxuICAgICAgJChkb2N1bWVudC5ib2R5KS5hZGRDbGFzcyhDbGFzc05hbWUkNS5PUEVOKTtcbiAgICB9O1xuXG4gICAgX3Byb3RvLl9yZXNldFNjcm9sbGJhciA9IGZ1bmN0aW9uIF9yZXNldFNjcm9sbGJhcigpIHtcbiAgICAgIC8vIFJlc3RvcmUgZml4ZWQgY29udGVudCBwYWRkaW5nXG4gICAgICB2YXIgZml4ZWRDb250ZW50ID0gW10uc2xpY2UuY2FsbChkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKFNlbGVjdG9yJDUuRklYRURfQ09OVEVOVCkpO1xuICAgICAgJChmaXhlZENvbnRlbnQpLmVhY2goZnVuY3Rpb24gKGluZGV4LCBlbGVtZW50KSB7XG4gICAgICAgIHZhciBwYWRkaW5nID0gJChlbGVtZW50KS5kYXRhKCdwYWRkaW5nLXJpZ2h0Jyk7XG4gICAgICAgICQoZWxlbWVudCkucmVtb3ZlRGF0YSgncGFkZGluZy1yaWdodCcpO1xuICAgICAgICBlbGVtZW50LnN0eWxlLnBhZGRpbmdSaWdodCA9IHBhZGRpbmcgPyBwYWRkaW5nIDogJyc7XG4gICAgICB9KTsgLy8gUmVzdG9yZSBzdGlja3kgY29udGVudFxuXG4gICAgICB2YXIgZWxlbWVudHMgPSBbXS5zbGljZS5jYWxsKGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoXCJcIiArIFNlbGVjdG9yJDUuU1RJQ0tZX0NPTlRFTlQpKTtcbiAgICAgICQoZWxlbWVudHMpLmVhY2goZnVuY3Rpb24gKGluZGV4LCBlbGVtZW50KSB7XG4gICAgICAgIHZhciBtYXJnaW4gPSAkKGVsZW1lbnQpLmRhdGEoJ21hcmdpbi1yaWdodCcpO1xuXG4gICAgICAgIGlmICh0eXBlb2YgbWFyZ2luICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICQoZWxlbWVudCkuY3NzKCdtYXJnaW4tcmlnaHQnLCBtYXJnaW4pLnJlbW92ZURhdGEoJ21hcmdpbi1yaWdodCcpO1xuICAgICAgICB9XG4gICAgICB9KTsgLy8gUmVzdG9yZSBib2R5IHBhZGRpbmdcblxuICAgICAgdmFyIHBhZGRpbmcgPSAkKGRvY3VtZW50LmJvZHkpLmRhdGEoJ3BhZGRpbmctcmlnaHQnKTtcbiAgICAgICQoZG9jdW1lbnQuYm9keSkucmVtb3ZlRGF0YSgncGFkZGluZy1yaWdodCcpO1xuICAgICAgZG9jdW1lbnQuYm9keS5zdHlsZS5wYWRkaW5nUmlnaHQgPSBwYWRkaW5nID8gcGFkZGluZyA6ICcnO1xuICAgIH07XG5cbiAgICBfcHJvdG8uX2dldFNjcm9sbGJhcldpZHRoID0gZnVuY3Rpb24gX2dldFNjcm9sbGJhcldpZHRoKCkge1xuICAgICAgLy8gdGh4IGQud2Fsc2hcbiAgICAgIHZhciBzY3JvbGxEaXYgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgICAgIHNjcm9sbERpdi5jbGFzc05hbWUgPSBDbGFzc05hbWUkNS5TQ1JPTExCQVJfTUVBU1VSRVI7XG4gICAgICBkb2N1bWVudC5ib2R5LmFwcGVuZENoaWxkKHNjcm9sbERpdik7XG4gICAgICB2YXIgc2Nyb2xsYmFyV2lkdGggPSBzY3JvbGxEaXYuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCkud2lkdGggLSBzY3JvbGxEaXYuY2xpZW50V2lkdGg7XG4gICAgICBkb2N1bWVudC5ib2R5LnJlbW92ZUNoaWxkKHNjcm9sbERpdik7XG4gICAgICByZXR1cm4gc2Nyb2xsYmFyV2lkdGg7XG4gICAgfTsgLy8gU3RhdGljXG5cblxuICAgIE1vZGFsLl9qUXVlcnlJbnRlcmZhY2UgPSBmdW5jdGlvbiBfalF1ZXJ5SW50ZXJmYWNlKGNvbmZpZywgcmVsYXRlZFRhcmdldCkge1xuICAgICAgcmV0dXJuIHRoaXMuZWFjaChmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBkYXRhID0gJCh0aGlzKS5kYXRhKERBVEFfS0VZJDUpO1xuXG4gICAgICAgIHZhciBfY29uZmlnID0gX29iamVjdFNwcmVhZCh7fSwgRGVmYXVsdCQzLCAkKHRoaXMpLmRhdGEoKSwgdHlwZW9mIGNvbmZpZyA9PT0gJ29iamVjdCcgJiYgY29uZmlnID8gY29uZmlnIDoge30pO1xuXG4gICAgICAgIGlmICghZGF0YSkge1xuICAgICAgICAgIGRhdGEgPSBuZXcgTW9kYWwodGhpcywgX2NvbmZpZyk7XG4gICAgICAgICAgJCh0aGlzKS5kYXRhKERBVEFfS0VZJDUsIGRhdGEpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHR5cGVvZiBjb25maWcgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgaWYgKHR5cGVvZiBkYXRhW2NvbmZpZ10gPT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKFwiTm8gbWV0aG9kIG5hbWVkIFxcXCJcIiArIGNvbmZpZyArIFwiXFxcIlwiKTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBkYXRhW2NvbmZpZ10ocmVsYXRlZFRhcmdldCk7XG4gICAgICAgIH0gZWxzZSBpZiAoX2NvbmZpZy5zaG93KSB7XG4gICAgICAgICAgZGF0YS5zaG93KHJlbGF0ZWRUYXJnZXQpO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9O1xuXG4gICAgX2NyZWF0ZUNsYXNzKE1vZGFsLCBudWxsLCBbe1xuICAgICAga2V5OiBcIlZFUlNJT05cIixcbiAgICAgIGdldDogZnVuY3Rpb24gZ2V0KCkge1xuICAgICAgICByZXR1cm4gVkVSU0lPTiQ1O1xuICAgICAgfVxuICAgIH0sIHtcbiAgICAgIGtleTogXCJEZWZhdWx0XCIsXG4gICAgICBnZXQ6IGZ1bmN0aW9uIGdldCgpIHtcbiAgICAgICAgcmV0dXJuIERlZmF1bHQkMztcbiAgICAgIH1cbiAgICB9XSk7XG5cbiAgICByZXR1cm4gTW9kYWw7XG4gIH0oKTtcbiAgLyoqXG4gICAqIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgKiBEYXRhIEFwaSBpbXBsZW1lbnRhdGlvblxuICAgKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICovXG5cblxuICAkKGRvY3VtZW50KS5vbihFdmVudCQ1LkNMSUNLX0RBVEFfQVBJLCBTZWxlY3RvciQ1LkRBVEFfVE9HR0xFLCBmdW5jdGlvbiAoZXZlbnQpIHtcbiAgICB2YXIgX3RoaXMxMCA9IHRoaXM7XG5cbiAgICB2YXIgdGFyZ2V0O1xuICAgIHZhciBzZWxlY3RvciA9IFV0aWwuZ2V0U2VsZWN0b3JGcm9tRWxlbWVudCh0aGlzKTtcblxuICAgIGlmIChzZWxlY3Rvcikge1xuICAgICAgdGFyZ2V0ID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcihzZWxlY3Rvcik7XG4gICAgfVxuXG4gICAgdmFyIGNvbmZpZyA9ICQodGFyZ2V0KS5kYXRhKERBVEFfS0VZJDUpID8gJ3RvZ2dsZScgOiBfb2JqZWN0U3ByZWFkKHt9LCAkKHRhcmdldCkuZGF0YSgpLCAkKHRoaXMpLmRhdGEoKSk7XG5cbiAgICBpZiAodGhpcy50YWdOYW1lID09PSAnQScgfHwgdGhpcy50YWdOYW1lID09PSAnQVJFQScpIHtcbiAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgfVxuXG4gICAgdmFyICR0YXJnZXQgPSAkKHRhcmdldCkub25lKEV2ZW50JDUuU0hPVywgZnVuY3Rpb24gKHNob3dFdmVudCkge1xuICAgICAgaWYgKHNob3dFdmVudC5pc0RlZmF1bHRQcmV2ZW50ZWQoKSkge1xuICAgICAgICAvLyBPbmx5IHJlZ2lzdGVyIGZvY3VzIHJlc3RvcmVyIGlmIG1vZGFsIHdpbGwgYWN0dWFsbHkgZ2V0IHNob3duXG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgJHRhcmdldC5vbmUoRXZlbnQkNS5ISURERU4sIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgaWYgKCQoX3RoaXMxMCkuaXMoJzp2aXNpYmxlJykpIHtcbiAgICAgICAgICBfdGhpczEwLmZvY3VzKCk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH0pO1xuXG4gICAgTW9kYWwuX2pRdWVyeUludGVyZmFjZS5jYWxsKCQodGFyZ2V0KSwgY29uZmlnLCB0aGlzKTtcbiAgfSk7XG4gIC8qKlxuICAgKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICogalF1ZXJ5XG4gICAqIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgKi9cblxuICAkLmZuW05BTUUkNV0gPSBNb2RhbC5falF1ZXJ5SW50ZXJmYWNlO1xuICAkLmZuW05BTUUkNV0uQ29uc3RydWN0b3IgPSBNb2RhbDtcblxuICAkLmZuW05BTUUkNV0ubm9Db25mbGljdCA9IGZ1bmN0aW9uICgpIHtcbiAgICAkLmZuW05BTUUkNV0gPSBKUVVFUllfTk9fQ09ORkxJQ1QkNTtcbiAgICByZXR1cm4gTW9kYWwuX2pRdWVyeUludGVyZmFjZTtcbiAgfTtcblxuICAvKipcbiAgICogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAqIENvbnN0YW50c1xuICAgKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICovXG5cbiAgdmFyIE5BTUUkNiA9ICd0b29sdGlwJztcbiAgdmFyIFZFUlNJT04kNiA9ICc0LjIuMSc7XG4gIHZhciBEQVRBX0tFWSQ2ID0gJ2JzLnRvb2x0aXAnO1xuICB2YXIgRVZFTlRfS0VZJDYgPSBcIi5cIiArIERBVEFfS0VZJDY7XG4gIHZhciBKUVVFUllfTk9fQ09ORkxJQ1QkNiA9ICQuZm5bTkFNRSQ2XTtcbiAgdmFyIENMQVNTX1BSRUZJWCA9ICdicy10b29sdGlwJztcbiAgdmFyIEJTQ0xTX1BSRUZJWF9SRUdFWCA9IG5ldyBSZWdFeHAoXCIoXnxcXFxccylcIiArIENMQVNTX1BSRUZJWCArIFwiXFxcXFMrXCIsICdnJyk7XG4gIHZhciBEZWZhdWx0VHlwZSQ0ID0ge1xuICAgIGFuaW1hdGlvbjogJ2Jvb2xlYW4nLFxuICAgIHRlbXBsYXRlOiAnc3RyaW5nJyxcbiAgICB0aXRsZTogJyhzdHJpbmd8ZWxlbWVudHxmdW5jdGlvbiknLFxuICAgIHRyaWdnZXI6ICdzdHJpbmcnLFxuICAgIGRlbGF5OiAnKG51bWJlcnxvYmplY3QpJyxcbiAgICBodG1sOiAnYm9vbGVhbicsXG4gICAgc2VsZWN0b3I6ICcoc3RyaW5nfGJvb2xlYW4pJyxcbiAgICBwbGFjZW1lbnQ6ICcoc3RyaW5nfGZ1bmN0aW9uKScsXG4gICAgb2Zmc2V0OiAnKG51bWJlcnxzdHJpbmcpJyxcbiAgICBjb250YWluZXI6ICcoc3RyaW5nfGVsZW1lbnR8Ym9vbGVhbiknLFxuICAgIGZhbGxiYWNrUGxhY2VtZW50OiAnKHN0cmluZ3xhcnJheSknLFxuICAgIGJvdW5kYXJ5OiAnKHN0cmluZ3xlbGVtZW50KSdcbiAgfTtcbiAgdmFyIEF0dGFjaG1lbnRNYXAkMSA9IHtcbiAgICBBVVRPOiAnYXV0bycsXG4gICAgVE9QOiAndG9wJyxcbiAgICBSSUdIVDogJ3JpZ2h0JyxcbiAgICBCT1RUT006ICdib3R0b20nLFxuICAgIExFRlQ6ICdsZWZ0J1xuICB9O1xuICB2YXIgRGVmYXVsdCQ0ID0ge1xuICAgIGFuaW1hdGlvbjogdHJ1ZSxcbiAgICB0ZW1wbGF0ZTogJzxkaXYgY2xhc3M9XCJ0b29sdGlwXCIgcm9sZT1cInRvb2x0aXBcIj4nICsgJzxkaXYgY2xhc3M9XCJhcnJvd1wiPjwvZGl2PicgKyAnPGRpdiBjbGFzcz1cInRvb2x0aXAtaW5uZXJcIj48L2Rpdj48L2Rpdj4nLFxuICAgIHRyaWdnZXI6ICdob3ZlciBmb2N1cycsXG4gICAgdGl0bGU6ICcnLFxuICAgIGRlbGF5OiAwLFxuICAgIGh0bWw6IGZhbHNlLFxuICAgIHNlbGVjdG9yOiBmYWxzZSxcbiAgICBwbGFjZW1lbnQ6ICd0b3AnLFxuICAgIG9mZnNldDogMCxcbiAgICBjb250YWluZXI6IGZhbHNlLFxuICAgIGZhbGxiYWNrUGxhY2VtZW50OiAnZmxpcCcsXG4gICAgYm91bmRhcnk6ICdzY3JvbGxQYXJlbnQnXG4gIH07XG4gIHZhciBIb3ZlclN0YXRlID0ge1xuICAgIFNIT1c6ICdzaG93JyxcbiAgICBPVVQ6ICdvdXQnXG4gIH07XG4gIHZhciBFdmVudCQ2ID0ge1xuICAgIEhJREU6IFwiaGlkZVwiICsgRVZFTlRfS0VZJDYsXG4gICAgSElEREVOOiBcImhpZGRlblwiICsgRVZFTlRfS0VZJDYsXG4gICAgU0hPVzogXCJzaG93XCIgKyBFVkVOVF9LRVkkNixcbiAgICBTSE9XTjogXCJzaG93blwiICsgRVZFTlRfS0VZJDYsXG4gICAgSU5TRVJURUQ6IFwiaW5zZXJ0ZWRcIiArIEVWRU5UX0tFWSQ2LFxuICAgIENMSUNLOiBcImNsaWNrXCIgKyBFVkVOVF9LRVkkNixcbiAgICBGT0NVU0lOOiBcImZvY3VzaW5cIiArIEVWRU5UX0tFWSQ2LFxuICAgIEZPQ1VTT1VUOiBcImZvY3Vzb3V0XCIgKyBFVkVOVF9LRVkkNixcbiAgICBNT1VTRUVOVEVSOiBcIm1vdXNlZW50ZXJcIiArIEVWRU5UX0tFWSQ2LFxuICAgIE1PVVNFTEVBVkU6IFwibW91c2VsZWF2ZVwiICsgRVZFTlRfS0VZJDZcbiAgfTtcbiAgdmFyIENsYXNzTmFtZSQ2ID0ge1xuICAgIEZBREU6ICdmYWRlJyxcbiAgICBTSE9XOiAnc2hvdydcbiAgfTtcbiAgdmFyIFNlbGVjdG9yJDYgPSB7XG4gICAgVE9PTFRJUDogJy50b29sdGlwJyxcbiAgICBUT09MVElQX0lOTkVSOiAnLnRvb2x0aXAtaW5uZXInLFxuICAgIEFSUk9XOiAnLmFycm93J1xuICB9O1xuICB2YXIgVHJpZ2dlciA9IHtcbiAgICBIT1ZFUjogJ2hvdmVyJyxcbiAgICBGT0NVUzogJ2ZvY3VzJyxcbiAgICBDTElDSzogJ2NsaWNrJyxcbiAgICBNQU5VQUw6ICdtYW51YWwnXG4gICAgLyoqXG4gICAgICogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAgICogQ2xhc3MgRGVmaW5pdGlvblxuICAgICAqIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgICAqL1xuXG4gIH07XG5cbiAgdmFyIFRvb2x0aXAgPVxuICAvKiNfX1BVUkVfXyovXG4gIGZ1bmN0aW9uICgpIHtcbiAgICBmdW5jdGlvbiBUb29sdGlwKGVsZW1lbnQsIGNvbmZpZykge1xuICAgICAgLyoqXG4gICAgICAgKiBDaGVjayBmb3IgUG9wcGVyIGRlcGVuZGVuY3lcbiAgICAgICAqIFBvcHBlciAtIGh0dHBzOi8vcG9wcGVyLmpzLm9yZ1xuICAgICAgICovXG4gICAgICBpZiAodHlwZW9mIFBvcHBlciA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignQm9vdHN0cmFwXFwncyB0b29sdGlwcyByZXF1aXJlIFBvcHBlci5qcyAoaHR0cHM6Ly9wb3BwZXIuanMub3JnLyknKTtcbiAgICAgIH0gLy8gcHJpdmF0ZVxuXG5cbiAgICAgIHRoaXMuX2lzRW5hYmxlZCA9IHRydWU7XG4gICAgICB0aGlzLl90aW1lb3V0ID0gMDtcbiAgICAgIHRoaXMuX2hvdmVyU3RhdGUgPSAnJztcbiAgICAgIHRoaXMuX2FjdGl2ZVRyaWdnZXIgPSB7fTtcbiAgICAgIHRoaXMuX3BvcHBlciA9IG51bGw7IC8vIFByb3RlY3RlZFxuXG4gICAgICB0aGlzLmVsZW1lbnQgPSBlbGVtZW50O1xuICAgICAgdGhpcy5jb25maWcgPSB0aGlzLl9nZXRDb25maWcoY29uZmlnKTtcbiAgICAgIHRoaXMudGlwID0gbnVsbDtcblxuICAgICAgdGhpcy5fc2V0TGlzdGVuZXJzKCk7XG4gICAgfSAvLyBHZXR0ZXJzXG5cblxuICAgIHZhciBfcHJvdG8gPSBUb29sdGlwLnByb3RvdHlwZTtcblxuICAgIC8vIFB1YmxpY1xuICAgIF9wcm90by5lbmFibGUgPSBmdW5jdGlvbiBlbmFibGUoKSB7XG4gICAgICB0aGlzLl9pc0VuYWJsZWQgPSB0cnVlO1xuICAgIH07XG5cbiAgICBfcHJvdG8uZGlzYWJsZSA9IGZ1bmN0aW9uIGRpc2FibGUoKSB7XG4gICAgICB0aGlzLl9pc0VuYWJsZWQgPSBmYWxzZTtcbiAgICB9O1xuXG4gICAgX3Byb3RvLnRvZ2dsZUVuYWJsZWQgPSBmdW5jdGlvbiB0b2dnbGVFbmFibGVkKCkge1xuICAgICAgdGhpcy5faXNFbmFibGVkID0gIXRoaXMuX2lzRW5hYmxlZDtcbiAgICB9O1xuXG4gICAgX3Byb3RvLnRvZ2dsZSA9IGZ1bmN0aW9uIHRvZ2dsZShldmVudCkge1xuICAgICAgaWYgKCF0aGlzLl9pc0VuYWJsZWQpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICBpZiAoZXZlbnQpIHtcbiAgICAgICAgdmFyIGRhdGFLZXkgPSB0aGlzLmNvbnN0cnVjdG9yLkRBVEFfS0VZO1xuICAgICAgICB2YXIgY29udGV4dCA9ICQoZXZlbnQuY3VycmVudFRhcmdldCkuZGF0YShkYXRhS2V5KTtcblxuICAgICAgICBpZiAoIWNvbnRleHQpIHtcbiAgICAgICAgICBjb250ZXh0ID0gbmV3IHRoaXMuY29uc3RydWN0b3IoZXZlbnQuY3VycmVudFRhcmdldCwgdGhpcy5fZ2V0RGVsZWdhdGVDb25maWcoKSk7XG4gICAgICAgICAgJChldmVudC5jdXJyZW50VGFyZ2V0KS5kYXRhKGRhdGFLZXksIGNvbnRleHQpO1xuICAgICAgICB9XG5cbiAgICAgICAgY29udGV4dC5fYWN0aXZlVHJpZ2dlci5jbGljayA9ICFjb250ZXh0Ll9hY3RpdmVUcmlnZ2VyLmNsaWNrO1xuXG4gICAgICAgIGlmIChjb250ZXh0Ll9pc1dpdGhBY3RpdmVUcmlnZ2VyKCkpIHtcbiAgICAgICAgICBjb250ZXh0Ll9lbnRlcihudWxsLCBjb250ZXh0KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBjb250ZXh0Ll9sZWF2ZShudWxsLCBjb250ZXh0KTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgaWYgKCQodGhpcy5nZXRUaXBFbGVtZW50KCkpLmhhc0NsYXNzKENsYXNzTmFtZSQ2LlNIT1cpKSB7XG4gICAgICAgICAgdGhpcy5fbGVhdmUobnVsbCwgdGhpcyk7XG5cbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLl9lbnRlcihudWxsLCB0aGlzKTtcbiAgICAgIH1cbiAgICB9O1xuXG4gICAgX3Byb3RvLmRpc3Bvc2UgPSBmdW5jdGlvbiBkaXNwb3NlKCkge1xuICAgICAgY2xlYXJUaW1lb3V0KHRoaXMuX3RpbWVvdXQpO1xuICAgICAgJC5yZW1vdmVEYXRhKHRoaXMuZWxlbWVudCwgdGhpcy5jb25zdHJ1Y3Rvci5EQVRBX0tFWSk7XG4gICAgICAkKHRoaXMuZWxlbWVudCkub2ZmKHRoaXMuY29uc3RydWN0b3IuRVZFTlRfS0VZKTtcbiAgICAgICQodGhpcy5lbGVtZW50KS5jbG9zZXN0KCcubW9kYWwnKS5vZmYoJ2hpZGUuYnMubW9kYWwnKTtcblxuICAgICAgaWYgKHRoaXMudGlwKSB7XG4gICAgICAgICQodGhpcy50aXApLnJlbW92ZSgpO1xuICAgICAgfVxuXG4gICAgICB0aGlzLl9pc0VuYWJsZWQgPSBudWxsO1xuICAgICAgdGhpcy5fdGltZW91dCA9IG51bGw7XG4gICAgICB0aGlzLl9ob3ZlclN0YXRlID0gbnVsbDtcbiAgICAgIHRoaXMuX2FjdGl2ZVRyaWdnZXIgPSBudWxsO1xuXG4gICAgICBpZiAodGhpcy5fcG9wcGVyICE9PSBudWxsKSB7XG4gICAgICAgIHRoaXMuX3BvcHBlci5kZXN0cm95KCk7XG4gICAgICB9XG5cbiAgICAgIHRoaXMuX3BvcHBlciA9IG51bGw7XG4gICAgICB0aGlzLmVsZW1lbnQgPSBudWxsO1xuICAgICAgdGhpcy5jb25maWcgPSBudWxsO1xuICAgICAgdGhpcy50aXAgPSBudWxsO1xuICAgIH07XG5cbiAgICBfcHJvdG8uc2hvdyA9IGZ1bmN0aW9uIHNob3coKSB7XG4gICAgICB2YXIgX3RoaXMgPSB0aGlzO1xuXG4gICAgICBpZiAoJCh0aGlzLmVsZW1lbnQpLmNzcygnZGlzcGxheScpID09PSAnbm9uZScpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdQbGVhc2UgdXNlIHNob3cgb24gdmlzaWJsZSBlbGVtZW50cycpO1xuICAgICAgfVxuXG4gICAgICB2YXIgc2hvd0V2ZW50ID0gJC5FdmVudCh0aGlzLmNvbnN0cnVjdG9yLkV2ZW50LlNIT1cpO1xuXG4gICAgICBpZiAodGhpcy5pc1dpdGhDb250ZW50KCkgJiYgdGhpcy5faXNFbmFibGVkKSB7XG4gICAgICAgICQodGhpcy5lbGVtZW50KS50cmlnZ2VyKHNob3dFdmVudCk7XG4gICAgICAgIHZhciBzaGFkb3dSb290ID0gVXRpbC5maW5kU2hhZG93Um9vdCh0aGlzLmVsZW1lbnQpO1xuICAgICAgICB2YXIgaXNJblRoZURvbSA9ICQuY29udGFpbnMoc2hhZG93Um9vdCAhPT0gbnVsbCA/IHNoYWRvd1Jvb3QgOiB0aGlzLmVsZW1lbnQub3duZXJEb2N1bWVudC5kb2N1bWVudEVsZW1lbnQsIHRoaXMuZWxlbWVudCk7XG5cbiAgICAgICAgaWYgKHNob3dFdmVudC5pc0RlZmF1bHRQcmV2ZW50ZWQoKSB8fCAhaXNJblRoZURvbSkge1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIHZhciB0aXAgPSB0aGlzLmdldFRpcEVsZW1lbnQoKTtcbiAgICAgICAgdmFyIHRpcElkID0gVXRpbC5nZXRVSUQodGhpcy5jb25zdHJ1Y3Rvci5OQU1FKTtcbiAgICAgICAgdGlwLnNldEF0dHJpYnV0ZSgnaWQnLCB0aXBJZCk7XG4gICAgICAgIHRoaXMuZWxlbWVudC5zZXRBdHRyaWJ1dGUoJ2FyaWEtZGVzY3JpYmVkYnknLCB0aXBJZCk7XG4gICAgICAgIHRoaXMuc2V0Q29udGVudCgpO1xuXG4gICAgICAgIGlmICh0aGlzLmNvbmZpZy5hbmltYXRpb24pIHtcbiAgICAgICAgICAkKHRpcCkuYWRkQ2xhc3MoQ2xhc3NOYW1lJDYuRkFERSk7XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgcGxhY2VtZW50ID0gdHlwZW9mIHRoaXMuY29uZmlnLnBsYWNlbWVudCA9PT0gJ2Z1bmN0aW9uJyA/IHRoaXMuY29uZmlnLnBsYWNlbWVudC5jYWxsKHRoaXMsIHRpcCwgdGhpcy5lbGVtZW50KSA6IHRoaXMuY29uZmlnLnBsYWNlbWVudDtcblxuICAgICAgICB2YXIgYXR0YWNobWVudCA9IHRoaXMuX2dldEF0dGFjaG1lbnQocGxhY2VtZW50KTtcblxuICAgICAgICB0aGlzLmFkZEF0dGFjaG1lbnRDbGFzcyhhdHRhY2htZW50KTtcblxuICAgICAgICB2YXIgY29udGFpbmVyID0gdGhpcy5fZ2V0Q29udGFpbmVyKCk7XG5cbiAgICAgICAgJCh0aXApLmRhdGEodGhpcy5jb25zdHJ1Y3Rvci5EQVRBX0tFWSwgdGhpcyk7XG5cbiAgICAgICAgaWYgKCEkLmNvbnRhaW5zKHRoaXMuZWxlbWVudC5vd25lckRvY3VtZW50LmRvY3VtZW50RWxlbWVudCwgdGhpcy50aXApKSB7XG4gICAgICAgICAgJCh0aXApLmFwcGVuZFRvKGNvbnRhaW5lcik7XG4gICAgICAgIH1cblxuICAgICAgICAkKHRoaXMuZWxlbWVudCkudHJpZ2dlcih0aGlzLmNvbnN0cnVjdG9yLkV2ZW50LklOU0VSVEVEKTtcbiAgICAgICAgdGhpcy5fcG9wcGVyID0gbmV3IFBvcHBlcih0aGlzLmVsZW1lbnQsIHRpcCwge1xuICAgICAgICAgIHBsYWNlbWVudDogYXR0YWNobWVudCxcbiAgICAgICAgICBtb2RpZmllcnM6IHtcbiAgICAgICAgICAgIG9mZnNldDoge1xuICAgICAgICAgICAgICBvZmZzZXQ6IHRoaXMuY29uZmlnLm9mZnNldFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGZsaXA6IHtcbiAgICAgICAgICAgICAgYmVoYXZpb3I6IHRoaXMuY29uZmlnLmZhbGxiYWNrUGxhY2VtZW50XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgYXJyb3c6IHtcbiAgICAgICAgICAgICAgZWxlbWVudDogU2VsZWN0b3IkNi5BUlJPV1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHByZXZlbnRPdmVyZmxvdzoge1xuICAgICAgICAgICAgICBib3VuZGFyaWVzRWxlbWVudDogdGhpcy5jb25maWcuYm91bmRhcnlcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9LFxuICAgICAgICAgIG9uQ3JlYXRlOiBmdW5jdGlvbiBvbkNyZWF0ZShkYXRhKSB7XG4gICAgICAgICAgICBpZiAoZGF0YS5vcmlnaW5hbFBsYWNlbWVudCAhPT0gZGF0YS5wbGFjZW1lbnQpIHtcbiAgICAgICAgICAgICAgX3RoaXMuX2hhbmRsZVBvcHBlclBsYWNlbWVudENoYW5nZShkYXRhKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9LFxuICAgICAgICAgIG9uVXBkYXRlOiBmdW5jdGlvbiBvblVwZGF0ZShkYXRhKSB7XG4gICAgICAgICAgICByZXR1cm4gX3RoaXMuX2hhbmRsZVBvcHBlclBsYWNlbWVudENoYW5nZShkYXRhKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICAkKHRpcCkuYWRkQ2xhc3MoQ2xhc3NOYW1lJDYuU0hPVyk7IC8vIElmIHRoaXMgaXMgYSB0b3VjaC1lbmFibGVkIGRldmljZSB3ZSBhZGQgZXh0cmFcbiAgICAgICAgLy8gZW1wdHkgbW91c2VvdmVyIGxpc3RlbmVycyB0byB0aGUgYm9keSdzIGltbWVkaWF0ZSBjaGlsZHJlbjtcbiAgICAgICAgLy8gb25seSBuZWVkZWQgYmVjYXVzZSBvZiBicm9rZW4gZXZlbnQgZGVsZWdhdGlvbiBvbiBpT1NcbiAgICAgICAgLy8gaHR0cHM6Ly93d3cucXVpcmtzbW9kZS5vcmcvYmxvZy9hcmNoaXZlcy8yMDE0LzAyL21vdXNlX2V2ZW50X2J1Yi5odG1sXG5cbiAgICAgICAgaWYgKCdvbnRvdWNoc3RhcnQnIGluIGRvY3VtZW50LmRvY3VtZW50RWxlbWVudCkge1xuICAgICAgICAgICQoZG9jdW1lbnQuYm9keSkuY2hpbGRyZW4oKS5vbignbW91c2VvdmVyJywgbnVsbCwgJC5ub29wKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHZhciBjb21wbGV0ZSA9IGZ1bmN0aW9uIGNvbXBsZXRlKCkge1xuICAgICAgICAgIGlmIChfdGhpcy5jb25maWcuYW5pbWF0aW9uKSB7XG4gICAgICAgICAgICBfdGhpcy5fZml4VHJhbnNpdGlvbigpO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIHZhciBwcmV2SG92ZXJTdGF0ZSA9IF90aGlzLl9ob3ZlclN0YXRlO1xuICAgICAgICAgIF90aGlzLl9ob3ZlclN0YXRlID0gbnVsbDtcbiAgICAgICAgICAkKF90aGlzLmVsZW1lbnQpLnRyaWdnZXIoX3RoaXMuY29uc3RydWN0b3IuRXZlbnQuU0hPV04pO1xuXG4gICAgICAgICAgaWYgKHByZXZIb3ZlclN0YXRlID09PSBIb3ZlclN0YXRlLk9VVCkge1xuICAgICAgICAgICAgX3RoaXMuX2xlYXZlKG51bGwsIF90aGlzKTtcbiAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgICAgaWYgKCQodGhpcy50aXApLmhhc0NsYXNzKENsYXNzTmFtZSQ2LkZBREUpKSB7XG4gICAgICAgICAgdmFyIHRyYW5zaXRpb25EdXJhdGlvbiA9IFV0aWwuZ2V0VHJhbnNpdGlvbkR1cmF0aW9uRnJvbUVsZW1lbnQodGhpcy50aXApO1xuICAgICAgICAgICQodGhpcy50aXApLm9uZShVdGlsLlRSQU5TSVRJT05fRU5ELCBjb21wbGV0ZSkuZW11bGF0ZVRyYW5zaXRpb25FbmQodHJhbnNpdGlvbkR1cmF0aW9uKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBjb21wbGV0ZSgpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfTtcblxuICAgIF9wcm90by5oaWRlID0gZnVuY3Rpb24gaGlkZShjYWxsYmFjaykge1xuICAgICAgdmFyIF90aGlzMiA9IHRoaXM7XG5cbiAgICAgIHZhciB0aXAgPSB0aGlzLmdldFRpcEVsZW1lbnQoKTtcbiAgICAgIHZhciBoaWRlRXZlbnQgPSAkLkV2ZW50KHRoaXMuY29uc3RydWN0b3IuRXZlbnQuSElERSk7XG5cbiAgICAgIHZhciBjb21wbGV0ZSA9IGZ1bmN0aW9uIGNvbXBsZXRlKCkge1xuICAgICAgICBpZiAoX3RoaXMyLl9ob3ZlclN0YXRlICE9PSBIb3ZlclN0YXRlLlNIT1cgJiYgdGlwLnBhcmVudE5vZGUpIHtcbiAgICAgICAgICB0aXAucGFyZW50Tm9kZS5yZW1vdmVDaGlsZCh0aXApO1xuICAgICAgICB9XG5cbiAgICAgICAgX3RoaXMyLl9jbGVhblRpcENsYXNzKCk7XG5cbiAgICAgICAgX3RoaXMyLmVsZW1lbnQucmVtb3ZlQXR0cmlidXRlKCdhcmlhLWRlc2NyaWJlZGJ5Jyk7XG5cbiAgICAgICAgJChfdGhpczIuZWxlbWVudCkudHJpZ2dlcihfdGhpczIuY29uc3RydWN0b3IuRXZlbnQuSElEREVOKTtcblxuICAgICAgICBpZiAoX3RoaXMyLl9wb3BwZXIgIT09IG51bGwpIHtcbiAgICAgICAgICBfdGhpczIuX3BvcHBlci5kZXN0cm95KCk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoY2FsbGJhY2spIHtcbiAgICAgICAgICBjYWxsYmFjaygpO1xuICAgICAgICB9XG4gICAgICB9O1xuXG4gICAgICAkKHRoaXMuZWxlbWVudCkudHJpZ2dlcihoaWRlRXZlbnQpO1xuXG4gICAgICBpZiAoaGlkZUV2ZW50LmlzRGVmYXVsdFByZXZlbnRlZCgpKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgJCh0aXApLnJlbW92ZUNsYXNzKENsYXNzTmFtZSQ2LlNIT1cpOyAvLyBJZiB0aGlzIGlzIGEgdG91Y2gtZW5hYmxlZCBkZXZpY2Ugd2UgcmVtb3ZlIHRoZSBleHRyYVxuICAgICAgLy8gZW1wdHkgbW91c2VvdmVyIGxpc3RlbmVycyB3ZSBhZGRlZCBmb3IgaU9TIHN1cHBvcnRcblxuICAgICAgaWYgKCdvbnRvdWNoc3RhcnQnIGluIGRvY3VtZW50LmRvY3VtZW50RWxlbWVudCkge1xuICAgICAgICAkKGRvY3VtZW50LmJvZHkpLmNoaWxkcmVuKCkub2ZmKCdtb3VzZW92ZXInLCBudWxsLCAkLm5vb3ApO1xuICAgICAgfVxuXG4gICAgICB0aGlzLl9hY3RpdmVUcmlnZ2VyW1RyaWdnZXIuQ0xJQ0tdID0gZmFsc2U7XG4gICAgICB0aGlzLl9hY3RpdmVUcmlnZ2VyW1RyaWdnZXIuRk9DVVNdID0gZmFsc2U7XG4gICAgICB0aGlzLl9hY3RpdmVUcmlnZ2VyW1RyaWdnZXIuSE9WRVJdID0gZmFsc2U7XG5cbiAgICAgIGlmICgkKHRoaXMudGlwKS5oYXNDbGFzcyhDbGFzc05hbWUkNi5GQURFKSkge1xuICAgICAgICB2YXIgdHJhbnNpdGlvbkR1cmF0aW9uID0gVXRpbC5nZXRUcmFuc2l0aW9uRHVyYXRpb25Gcm9tRWxlbWVudCh0aXApO1xuICAgICAgICAkKHRpcCkub25lKFV0aWwuVFJBTlNJVElPTl9FTkQsIGNvbXBsZXRlKS5lbXVsYXRlVHJhbnNpdGlvbkVuZCh0cmFuc2l0aW9uRHVyYXRpb24pO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY29tcGxldGUoKTtcbiAgICAgIH1cblxuICAgICAgdGhpcy5faG92ZXJTdGF0ZSA9ICcnO1xuICAgIH07XG5cbiAgICBfcHJvdG8udXBkYXRlID0gZnVuY3Rpb24gdXBkYXRlKCkge1xuICAgICAgaWYgKHRoaXMuX3BvcHBlciAhPT0gbnVsbCkge1xuICAgICAgICB0aGlzLl9wb3BwZXIuc2NoZWR1bGVVcGRhdGUoKTtcbiAgICAgIH1cbiAgICB9OyAvLyBQcm90ZWN0ZWRcblxuXG4gICAgX3Byb3RvLmlzV2l0aENvbnRlbnQgPSBmdW5jdGlvbiBpc1dpdGhDb250ZW50KCkge1xuICAgICAgcmV0dXJuIEJvb2xlYW4odGhpcy5nZXRUaXRsZSgpKTtcbiAgICB9O1xuXG4gICAgX3Byb3RvLmFkZEF0dGFjaG1lbnRDbGFzcyA9IGZ1bmN0aW9uIGFkZEF0dGFjaG1lbnRDbGFzcyhhdHRhY2htZW50KSB7XG4gICAgICAkKHRoaXMuZ2V0VGlwRWxlbWVudCgpKS5hZGRDbGFzcyhDTEFTU19QUkVGSVggKyBcIi1cIiArIGF0dGFjaG1lbnQpO1xuICAgIH07XG5cbiAgICBfcHJvdG8uZ2V0VGlwRWxlbWVudCA9IGZ1bmN0aW9uIGdldFRpcEVsZW1lbnQoKSB7XG4gICAgICB0aGlzLnRpcCA9IHRoaXMudGlwIHx8ICQodGhpcy5jb25maWcudGVtcGxhdGUpWzBdO1xuICAgICAgcmV0dXJuIHRoaXMudGlwO1xuICAgIH07XG5cbiAgICBfcHJvdG8uc2V0Q29udGVudCA9IGZ1bmN0aW9uIHNldENvbnRlbnQoKSB7XG4gICAgICB2YXIgdGlwID0gdGhpcy5nZXRUaXBFbGVtZW50KCk7XG4gICAgICB0aGlzLnNldEVsZW1lbnRDb250ZW50KCQodGlwLnF1ZXJ5U2VsZWN0b3JBbGwoU2VsZWN0b3IkNi5UT09MVElQX0lOTkVSKSksIHRoaXMuZ2V0VGl0bGUoKSk7XG4gICAgICAkKHRpcCkucmVtb3ZlQ2xhc3MoQ2xhc3NOYW1lJDYuRkFERSArIFwiIFwiICsgQ2xhc3NOYW1lJDYuU0hPVyk7XG4gICAgfTtcblxuICAgIF9wcm90by5zZXRFbGVtZW50Q29udGVudCA9IGZ1bmN0aW9uIHNldEVsZW1lbnRDb250ZW50KCRlbGVtZW50LCBjb250ZW50KSB7XG4gICAgICB2YXIgaHRtbCA9IHRoaXMuY29uZmlnLmh0bWw7XG5cbiAgICAgIGlmICh0eXBlb2YgY29udGVudCA9PT0gJ29iamVjdCcgJiYgKGNvbnRlbnQubm9kZVR5cGUgfHwgY29udGVudC5qcXVlcnkpKSB7XG4gICAgICAgIC8vIENvbnRlbnQgaXMgYSBET00gbm9kZSBvciBhIGpRdWVyeVxuICAgICAgICBpZiAoaHRtbCkge1xuICAgICAgICAgIGlmICghJChjb250ZW50KS5wYXJlbnQoKS5pcygkZWxlbWVudCkpIHtcbiAgICAgICAgICAgICRlbGVtZW50LmVtcHR5KCkuYXBwZW5kKGNvbnRlbnQpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAkZWxlbWVudC50ZXh0KCQoY29udGVudCkudGV4dCgpKTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgJGVsZW1lbnRbaHRtbCA/ICdodG1sJyA6ICd0ZXh0J10oY29udGVudCk7XG4gICAgICB9XG4gICAgfTtcblxuICAgIF9wcm90by5nZXRUaXRsZSA9IGZ1bmN0aW9uIGdldFRpdGxlKCkge1xuICAgICAgdmFyIHRpdGxlID0gdGhpcy5lbGVtZW50LmdldEF0dHJpYnV0ZSgnZGF0YS1vcmlnaW5hbC10aXRsZScpO1xuXG4gICAgICBpZiAoIXRpdGxlKSB7XG4gICAgICAgIHRpdGxlID0gdHlwZW9mIHRoaXMuY29uZmlnLnRpdGxlID09PSAnZnVuY3Rpb24nID8gdGhpcy5jb25maWcudGl0bGUuY2FsbCh0aGlzLmVsZW1lbnQpIDogdGhpcy5jb25maWcudGl0bGU7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiB0aXRsZTtcbiAgICB9OyAvLyBQcml2YXRlXG5cblxuICAgIF9wcm90by5fZ2V0Q29udGFpbmVyID0gZnVuY3Rpb24gX2dldENvbnRhaW5lcigpIHtcbiAgICAgIGlmICh0aGlzLmNvbmZpZy5jb250YWluZXIgPT09IGZhbHNlKSB7XG4gICAgICAgIHJldHVybiBkb2N1bWVudC5ib2R5O1xuICAgICAgfVxuXG4gICAgICBpZiAoVXRpbC5pc0VsZW1lbnQodGhpcy5jb25maWcuY29udGFpbmVyKSkge1xuICAgICAgICByZXR1cm4gJCh0aGlzLmNvbmZpZy5jb250YWluZXIpO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gJChkb2N1bWVudCkuZmluZCh0aGlzLmNvbmZpZy5jb250YWluZXIpO1xuICAgIH07XG5cbiAgICBfcHJvdG8uX2dldEF0dGFjaG1lbnQgPSBmdW5jdGlvbiBfZ2V0QXR0YWNobWVudChwbGFjZW1lbnQpIHtcbiAgICAgIHJldHVybiBBdHRhY2htZW50TWFwJDFbcGxhY2VtZW50LnRvVXBwZXJDYXNlKCldO1xuICAgIH07XG5cbiAgICBfcHJvdG8uX3NldExpc3RlbmVycyA9IGZ1bmN0aW9uIF9zZXRMaXN0ZW5lcnMoKSB7XG4gICAgICB2YXIgX3RoaXMzID0gdGhpcztcblxuICAgICAgdmFyIHRyaWdnZXJzID0gdGhpcy5jb25maWcudHJpZ2dlci5zcGxpdCgnICcpO1xuICAgICAgdHJpZ2dlcnMuZm9yRWFjaChmdW5jdGlvbiAodHJpZ2dlcikge1xuICAgICAgICBpZiAodHJpZ2dlciA9PT0gJ2NsaWNrJykge1xuICAgICAgICAgICQoX3RoaXMzLmVsZW1lbnQpLm9uKF90aGlzMy5jb25zdHJ1Y3Rvci5FdmVudC5DTElDSywgX3RoaXMzLmNvbmZpZy5zZWxlY3RvciwgZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgICAgICAgICByZXR1cm4gX3RoaXMzLnRvZ2dsZShldmVudCk7XG4gICAgICAgICAgfSk7XG4gICAgICAgIH0gZWxzZSBpZiAodHJpZ2dlciAhPT0gVHJpZ2dlci5NQU5VQUwpIHtcbiAgICAgICAgICB2YXIgZXZlbnRJbiA9IHRyaWdnZXIgPT09IFRyaWdnZXIuSE9WRVIgPyBfdGhpczMuY29uc3RydWN0b3IuRXZlbnQuTU9VU0VFTlRFUiA6IF90aGlzMy5jb25zdHJ1Y3Rvci5FdmVudC5GT0NVU0lOO1xuICAgICAgICAgIHZhciBldmVudE91dCA9IHRyaWdnZXIgPT09IFRyaWdnZXIuSE9WRVIgPyBfdGhpczMuY29uc3RydWN0b3IuRXZlbnQuTU9VU0VMRUFWRSA6IF90aGlzMy5jb25zdHJ1Y3Rvci5FdmVudC5GT0NVU09VVDtcbiAgICAgICAgICAkKF90aGlzMy5lbGVtZW50KS5vbihldmVudEluLCBfdGhpczMuY29uZmlnLnNlbGVjdG9yLCBmdW5jdGlvbiAoZXZlbnQpIHtcbiAgICAgICAgICAgIHJldHVybiBfdGhpczMuX2VudGVyKGV2ZW50KTtcbiAgICAgICAgICB9KS5vbihldmVudE91dCwgX3RoaXMzLmNvbmZpZy5zZWxlY3RvciwgZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgICAgICAgICByZXR1cm4gX3RoaXMzLl9sZWF2ZShldmVudCk7XG4gICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgICAgJCh0aGlzLmVsZW1lbnQpLmNsb3Nlc3QoJy5tb2RhbCcpLm9uKCdoaWRlLmJzLm1vZGFsJywgZnVuY3Rpb24gKCkge1xuICAgICAgICBpZiAoX3RoaXMzLmVsZW1lbnQpIHtcbiAgICAgICAgICBfdGhpczMuaGlkZSgpO1xuICAgICAgICB9XG4gICAgICB9KTtcblxuICAgICAgaWYgKHRoaXMuY29uZmlnLnNlbGVjdG9yKSB7XG4gICAgICAgIHRoaXMuY29uZmlnID0gX29iamVjdFNwcmVhZCh7fSwgdGhpcy5jb25maWcsIHtcbiAgICAgICAgICB0cmlnZ2VyOiAnbWFudWFsJyxcbiAgICAgICAgICBzZWxlY3RvcjogJydcbiAgICAgICAgfSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLl9maXhUaXRsZSgpO1xuICAgICAgfVxuICAgIH07XG5cbiAgICBfcHJvdG8uX2ZpeFRpdGxlID0gZnVuY3Rpb24gX2ZpeFRpdGxlKCkge1xuICAgICAgdmFyIHRpdGxlVHlwZSA9IHR5cGVvZiB0aGlzLmVsZW1lbnQuZ2V0QXR0cmlidXRlKCdkYXRhLW9yaWdpbmFsLXRpdGxlJyk7XG5cbiAgICAgIGlmICh0aGlzLmVsZW1lbnQuZ2V0QXR0cmlidXRlKCd0aXRsZScpIHx8IHRpdGxlVHlwZSAhPT0gJ3N0cmluZycpIHtcbiAgICAgICAgdGhpcy5lbGVtZW50LnNldEF0dHJpYnV0ZSgnZGF0YS1vcmlnaW5hbC10aXRsZScsIHRoaXMuZWxlbWVudC5nZXRBdHRyaWJ1dGUoJ3RpdGxlJykgfHwgJycpO1xuICAgICAgICB0aGlzLmVsZW1lbnQuc2V0QXR0cmlidXRlKCd0aXRsZScsICcnKTtcbiAgICAgIH1cbiAgICB9O1xuXG4gICAgX3Byb3RvLl9lbnRlciA9IGZ1bmN0aW9uIF9lbnRlcihldmVudCwgY29udGV4dCkge1xuICAgICAgdmFyIGRhdGFLZXkgPSB0aGlzLmNvbnN0cnVjdG9yLkRBVEFfS0VZO1xuICAgICAgY29udGV4dCA9IGNvbnRleHQgfHwgJChldmVudC5jdXJyZW50VGFyZ2V0KS5kYXRhKGRhdGFLZXkpO1xuXG4gICAgICBpZiAoIWNvbnRleHQpIHtcbiAgICAgICAgY29udGV4dCA9IG5ldyB0aGlzLmNvbnN0cnVjdG9yKGV2ZW50LmN1cnJlbnRUYXJnZXQsIHRoaXMuX2dldERlbGVnYXRlQ29uZmlnKCkpO1xuICAgICAgICAkKGV2ZW50LmN1cnJlbnRUYXJnZXQpLmRhdGEoZGF0YUtleSwgY29udGV4dCk7XG4gICAgICB9XG5cbiAgICAgIGlmIChldmVudCkge1xuICAgICAgICBjb250ZXh0Ll9hY3RpdmVUcmlnZ2VyW2V2ZW50LnR5cGUgPT09ICdmb2N1c2luJyA/IFRyaWdnZXIuRk9DVVMgOiBUcmlnZ2VyLkhPVkVSXSA9IHRydWU7XG4gICAgICB9XG5cbiAgICAgIGlmICgkKGNvbnRleHQuZ2V0VGlwRWxlbWVudCgpKS5oYXNDbGFzcyhDbGFzc05hbWUkNi5TSE9XKSB8fCBjb250ZXh0Ll9ob3ZlclN0YXRlID09PSBIb3ZlclN0YXRlLlNIT1cpIHtcbiAgICAgICAgY29udGV4dC5faG92ZXJTdGF0ZSA9IEhvdmVyU3RhdGUuU0hPVztcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICBjbGVhclRpbWVvdXQoY29udGV4dC5fdGltZW91dCk7XG4gICAgICBjb250ZXh0Ll9ob3ZlclN0YXRlID0gSG92ZXJTdGF0ZS5TSE9XO1xuXG4gICAgICBpZiAoIWNvbnRleHQuY29uZmlnLmRlbGF5IHx8ICFjb250ZXh0LmNvbmZpZy5kZWxheS5zaG93KSB7XG4gICAgICAgIGNvbnRleHQuc2hvdygpO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIGNvbnRleHQuX3RpbWVvdXQgPSBzZXRUaW1lb3V0KGZ1bmN0aW9uICgpIHtcbiAgICAgICAgaWYgKGNvbnRleHQuX2hvdmVyU3RhdGUgPT09IEhvdmVyU3RhdGUuU0hPVykge1xuICAgICAgICAgIGNvbnRleHQuc2hvdygpO1xuICAgICAgICB9XG4gICAgICB9LCBjb250ZXh0LmNvbmZpZy5kZWxheS5zaG93KTtcbiAgICB9O1xuXG4gICAgX3Byb3RvLl9sZWF2ZSA9IGZ1bmN0aW9uIF9sZWF2ZShldmVudCwgY29udGV4dCkge1xuICAgICAgdmFyIGRhdGFLZXkgPSB0aGlzLmNvbnN0cnVjdG9yLkRBVEFfS0VZO1xuICAgICAgY29udGV4dCA9IGNvbnRleHQgfHwgJChldmVudC5jdXJyZW50VGFyZ2V0KS5kYXRhKGRhdGFLZXkpO1xuXG4gICAgICBpZiAoIWNvbnRleHQpIHtcbiAgICAgICAgY29udGV4dCA9IG5ldyB0aGlzLmNvbnN0cnVjdG9yKGV2ZW50LmN1cnJlbnRUYXJnZXQsIHRoaXMuX2dldERlbGVnYXRlQ29uZmlnKCkpO1xuICAgICAgICAkKGV2ZW50LmN1cnJlbnRUYXJnZXQpLmRhdGEoZGF0YUtleSwgY29udGV4dCk7XG4gICAgICB9XG5cbiAgICAgIGlmIChldmVudCkge1xuICAgICAgICBjb250ZXh0Ll9hY3RpdmVUcmlnZ2VyW2V2ZW50LnR5cGUgPT09ICdmb2N1c291dCcgPyBUcmlnZ2VyLkZPQ1VTIDogVHJpZ2dlci5IT1ZFUl0gPSBmYWxzZTtcbiAgICAgIH1cblxuICAgICAgaWYgKGNvbnRleHQuX2lzV2l0aEFjdGl2ZVRyaWdnZXIoKSkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIGNsZWFyVGltZW91dChjb250ZXh0Ll90aW1lb3V0KTtcbiAgICAgIGNvbnRleHQuX2hvdmVyU3RhdGUgPSBIb3ZlclN0YXRlLk9VVDtcblxuICAgICAgaWYgKCFjb250ZXh0LmNvbmZpZy5kZWxheSB8fCAhY29udGV4dC5jb25maWcuZGVsYXkuaGlkZSkge1xuICAgICAgICBjb250ZXh0LmhpZGUoKTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICBjb250ZXh0Ll90aW1lb3V0ID0gc2V0VGltZW91dChmdW5jdGlvbiAoKSB7XG4gICAgICAgIGlmIChjb250ZXh0Ll9ob3ZlclN0YXRlID09PSBIb3ZlclN0YXRlLk9VVCkge1xuICAgICAgICAgIGNvbnRleHQuaGlkZSgpO1xuICAgICAgICB9XG4gICAgICB9LCBjb250ZXh0LmNvbmZpZy5kZWxheS5oaWRlKTtcbiAgICB9O1xuXG4gICAgX3Byb3RvLl9pc1dpdGhBY3RpdmVUcmlnZ2VyID0gZnVuY3Rpb24gX2lzV2l0aEFjdGl2ZVRyaWdnZXIoKSB7XG4gICAgICBmb3IgKHZhciB0cmlnZ2VyIGluIHRoaXMuX2FjdGl2ZVRyaWdnZXIpIHtcbiAgICAgICAgaWYgKHRoaXMuX2FjdGl2ZVRyaWdnZXJbdHJpZ2dlcl0pIHtcbiAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfTtcblxuICAgIF9wcm90by5fZ2V0Q29uZmlnID0gZnVuY3Rpb24gX2dldENvbmZpZyhjb25maWcpIHtcbiAgICAgIGNvbmZpZyA9IF9vYmplY3RTcHJlYWQoe30sIHRoaXMuY29uc3RydWN0b3IuRGVmYXVsdCwgJCh0aGlzLmVsZW1lbnQpLmRhdGEoKSwgdHlwZW9mIGNvbmZpZyA9PT0gJ29iamVjdCcgJiYgY29uZmlnID8gY29uZmlnIDoge30pO1xuXG4gICAgICBpZiAodHlwZW9mIGNvbmZpZy5kZWxheSA9PT0gJ251bWJlcicpIHtcbiAgICAgICAgY29uZmlnLmRlbGF5ID0ge1xuICAgICAgICAgIHNob3c6IGNvbmZpZy5kZWxheSxcbiAgICAgICAgICBoaWRlOiBjb25maWcuZGVsYXlcbiAgICAgICAgfTtcbiAgICAgIH1cblxuICAgICAgaWYgKHR5cGVvZiBjb25maWcudGl0bGUgPT09ICdudW1iZXInKSB7XG4gICAgICAgIGNvbmZpZy50aXRsZSA9IGNvbmZpZy50aXRsZS50b1N0cmluZygpO1xuICAgICAgfVxuXG4gICAgICBpZiAodHlwZW9mIGNvbmZpZy5jb250ZW50ID09PSAnbnVtYmVyJykge1xuICAgICAgICBjb25maWcuY29udGVudCA9IGNvbmZpZy5jb250ZW50LnRvU3RyaW5nKCk7XG4gICAgICB9XG5cbiAgICAgIFV0aWwudHlwZUNoZWNrQ29uZmlnKE5BTUUkNiwgY29uZmlnLCB0aGlzLmNvbnN0cnVjdG9yLkRlZmF1bHRUeXBlKTtcbiAgICAgIHJldHVybiBjb25maWc7XG4gICAgfTtcblxuICAgIF9wcm90by5fZ2V0RGVsZWdhdGVDb25maWcgPSBmdW5jdGlvbiBfZ2V0RGVsZWdhdGVDb25maWcoKSB7XG4gICAgICB2YXIgY29uZmlnID0ge307XG5cbiAgICAgIGlmICh0aGlzLmNvbmZpZykge1xuICAgICAgICBmb3IgKHZhciBrZXkgaW4gdGhpcy5jb25maWcpIHtcbiAgICAgICAgICBpZiAodGhpcy5jb25zdHJ1Y3Rvci5EZWZhdWx0W2tleV0gIT09IHRoaXMuY29uZmlnW2tleV0pIHtcbiAgICAgICAgICAgIGNvbmZpZ1trZXldID0gdGhpcy5jb25maWdba2V5XTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgcmV0dXJuIGNvbmZpZztcbiAgICB9O1xuXG4gICAgX3Byb3RvLl9jbGVhblRpcENsYXNzID0gZnVuY3Rpb24gX2NsZWFuVGlwQ2xhc3MoKSB7XG4gICAgICB2YXIgJHRpcCA9ICQodGhpcy5nZXRUaXBFbGVtZW50KCkpO1xuICAgICAgdmFyIHRhYkNsYXNzID0gJHRpcC5hdHRyKCdjbGFzcycpLm1hdGNoKEJTQ0xTX1BSRUZJWF9SRUdFWCk7XG5cbiAgICAgIGlmICh0YWJDbGFzcyAhPT0gbnVsbCAmJiB0YWJDbGFzcy5sZW5ndGgpIHtcbiAgICAgICAgJHRpcC5yZW1vdmVDbGFzcyh0YWJDbGFzcy5qb2luKCcnKSk7XG4gICAgICB9XG4gICAgfTtcblxuICAgIF9wcm90by5faGFuZGxlUG9wcGVyUGxhY2VtZW50Q2hhbmdlID0gZnVuY3Rpb24gX2hhbmRsZVBvcHBlclBsYWNlbWVudENoYW5nZShwb3BwZXJEYXRhKSB7XG4gICAgICB2YXIgcG9wcGVySW5zdGFuY2UgPSBwb3BwZXJEYXRhLmluc3RhbmNlO1xuICAgICAgdGhpcy50aXAgPSBwb3BwZXJJbnN0YW5jZS5wb3BwZXI7XG5cbiAgICAgIHRoaXMuX2NsZWFuVGlwQ2xhc3MoKTtcblxuICAgICAgdGhpcy5hZGRBdHRhY2htZW50Q2xhc3ModGhpcy5fZ2V0QXR0YWNobWVudChwb3BwZXJEYXRhLnBsYWNlbWVudCkpO1xuICAgIH07XG5cbiAgICBfcHJvdG8uX2ZpeFRyYW5zaXRpb24gPSBmdW5jdGlvbiBfZml4VHJhbnNpdGlvbigpIHtcbiAgICAgIHZhciB0aXAgPSB0aGlzLmdldFRpcEVsZW1lbnQoKTtcbiAgICAgIHZhciBpbml0Q29uZmlnQW5pbWF0aW9uID0gdGhpcy5jb25maWcuYW5pbWF0aW9uO1xuXG4gICAgICBpZiAodGlwLmdldEF0dHJpYnV0ZSgneC1wbGFjZW1lbnQnKSAhPT0gbnVsbCkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgICQodGlwKS5yZW1vdmVDbGFzcyhDbGFzc05hbWUkNi5GQURFKTtcbiAgICAgIHRoaXMuY29uZmlnLmFuaW1hdGlvbiA9IGZhbHNlO1xuICAgICAgdGhpcy5oaWRlKCk7XG4gICAgICB0aGlzLnNob3coKTtcbiAgICAgIHRoaXMuY29uZmlnLmFuaW1hdGlvbiA9IGluaXRDb25maWdBbmltYXRpb247XG4gICAgfTsgLy8gU3RhdGljXG5cblxuICAgIFRvb2x0aXAuX2pRdWVyeUludGVyZmFjZSA9IGZ1bmN0aW9uIF9qUXVlcnlJbnRlcmZhY2UoY29uZmlnKSB7XG4gICAgICByZXR1cm4gdGhpcy5lYWNoKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIGRhdGEgPSAkKHRoaXMpLmRhdGEoREFUQV9LRVkkNik7XG5cbiAgICAgICAgdmFyIF9jb25maWcgPSB0eXBlb2YgY29uZmlnID09PSAnb2JqZWN0JyAmJiBjb25maWc7XG5cbiAgICAgICAgaWYgKCFkYXRhICYmIC9kaXNwb3NlfGhpZGUvLnRlc3QoY29uZmlnKSkge1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICghZGF0YSkge1xuICAgICAgICAgIGRhdGEgPSBuZXcgVG9vbHRpcCh0aGlzLCBfY29uZmlnKTtcbiAgICAgICAgICAkKHRoaXMpLmRhdGEoREFUQV9LRVkkNiwgZGF0YSk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAodHlwZW9mIGNvbmZpZyA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgICBpZiAodHlwZW9mIGRhdGFbY29uZmlnXSA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoXCJObyBtZXRob2QgbmFtZWQgXFxcIlwiICsgY29uZmlnICsgXCJcXFwiXCIpO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIGRhdGFbY29uZmlnXSgpO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9O1xuXG4gICAgX2NyZWF0ZUNsYXNzKFRvb2x0aXAsIG51bGwsIFt7XG4gICAgICBrZXk6IFwiVkVSU0lPTlwiLFxuICAgICAgZ2V0OiBmdW5jdGlvbiBnZXQoKSB7XG4gICAgICAgIHJldHVybiBWRVJTSU9OJDY7XG4gICAgICB9XG4gICAgfSwge1xuICAgICAga2V5OiBcIkRlZmF1bHRcIixcbiAgICAgIGdldDogZnVuY3Rpb24gZ2V0KCkge1xuICAgICAgICByZXR1cm4gRGVmYXVsdCQ0O1xuICAgICAgfVxuICAgIH0sIHtcbiAgICAgIGtleTogXCJOQU1FXCIsXG4gICAgICBnZXQ6IGZ1bmN0aW9uIGdldCgpIHtcbiAgICAgICAgcmV0dXJuIE5BTUUkNjtcbiAgICAgIH1cbiAgICB9LCB7XG4gICAgICBrZXk6IFwiREFUQV9LRVlcIixcbiAgICAgIGdldDogZnVuY3Rpb24gZ2V0KCkge1xuICAgICAgICByZXR1cm4gREFUQV9LRVkkNjtcbiAgICAgIH1cbiAgICB9LCB7XG4gICAgICBrZXk6IFwiRXZlbnRcIixcbiAgICAgIGdldDogZnVuY3Rpb24gZ2V0KCkge1xuICAgICAgICByZXR1cm4gRXZlbnQkNjtcbiAgICAgIH1cbiAgICB9LCB7XG4gICAgICBrZXk6IFwiRVZFTlRfS0VZXCIsXG4gICAgICBnZXQ6IGZ1bmN0aW9uIGdldCgpIHtcbiAgICAgICAgcmV0dXJuIEVWRU5UX0tFWSQ2O1xuICAgICAgfVxuICAgIH0sIHtcbiAgICAgIGtleTogXCJEZWZhdWx0VHlwZVwiLFxuICAgICAgZ2V0OiBmdW5jdGlvbiBnZXQoKSB7XG4gICAgICAgIHJldHVybiBEZWZhdWx0VHlwZSQ0O1xuICAgICAgfVxuICAgIH1dKTtcblxuICAgIHJldHVybiBUb29sdGlwO1xuICB9KCk7XG4gIC8qKlxuICAgKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICogalF1ZXJ5XG4gICAqIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgKi9cblxuXG4gICQuZm5bTkFNRSQ2XSA9IFRvb2x0aXAuX2pRdWVyeUludGVyZmFjZTtcbiAgJC5mbltOQU1FJDZdLkNvbnN0cnVjdG9yID0gVG9vbHRpcDtcblxuICAkLmZuW05BTUUkNl0ubm9Db25mbGljdCA9IGZ1bmN0aW9uICgpIHtcbiAgICAkLmZuW05BTUUkNl0gPSBKUVVFUllfTk9fQ09ORkxJQ1QkNjtcbiAgICByZXR1cm4gVG9vbHRpcC5falF1ZXJ5SW50ZXJmYWNlO1xuICB9O1xuXG4gIC8qKlxuICAgKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICogQ29uc3RhbnRzXG4gICAqIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgKi9cblxuICB2YXIgTkFNRSQ3ID0gJ3BvcG92ZXInO1xuICB2YXIgVkVSU0lPTiQ3ID0gJzQuMi4xJztcbiAgdmFyIERBVEFfS0VZJDcgPSAnYnMucG9wb3Zlcic7XG4gIHZhciBFVkVOVF9LRVkkNyA9IFwiLlwiICsgREFUQV9LRVkkNztcbiAgdmFyIEpRVUVSWV9OT19DT05GTElDVCQ3ID0gJC5mbltOQU1FJDddO1xuICB2YXIgQ0xBU1NfUFJFRklYJDEgPSAnYnMtcG9wb3Zlcic7XG4gIHZhciBCU0NMU19QUkVGSVhfUkVHRVgkMSA9IG5ldyBSZWdFeHAoXCIoXnxcXFxccylcIiArIENMQVNTX1BSRUZJWCQxICsgXCJcXFxcUytcIiwgJ2cnKTtcblxuICB2YXIgRGVmYXVsdCQ1ID0gX29iamVjdFNwcmVhZCh7fSwgVG9vbHRpcC5EZWZhdWx0LCB7XG4gICAgcGxhY2VtZW50OiAncmlnaHQnLFxuICAgIHRyaWdnZXI6ICdjbGljaycsXG4gICAgY29udGVudDogJycsXG4gICAgdGVtcGxhdGU6ICc8ZGl2IGNsYXNzPVwicG9wb3ZlclwiIHJvbGU9XCJ0b29sdGlwXCI+JyArICc8ZGl2IGNsYXNzPVwiYXJyb3dcIj48L2Rpdj4nICsgJzxoMyBjbGFzcz1cInBvcG92ZXItaGVhZGVyXCI+PC9oMz4nICsgJzxkaXYgY2xhc3M9XCJwb3BvdmVyLWJvZHlcIj48L2Rpdj48L2Rpdj4nXG4gIH0pO1xuXG4gIHZhciBEZWZhdWx0VHlwZSQ1ID0gX29iamVjdFNwcmVhZCh7fSwgVG9vbHRpcC5EZWZhdWx0VHlwZSwge1xuICAgIGNvbnRlbnQ6ICcoc3RyaW5nfGVsZW1lbnR8ZnVuY3Rpb24pJ1xuICB9KTtcblxuICB2YXIgQ2xhc3NOYW1lJDcgPSB7XG4gICAgRkFERTogJ2ZhZGUnLFxuICAgIFNIT1c6ICdzaG93J1xuICB9O1xuICB2YXIgU2VsZWN0b3IkNyA9IHtcbiAgICBUSVRMRTogJy5wb3BvdmVyLWhlYWRlcicsXG4gICAgQ09OVEVOVDogJy5wb3BvdmVyLWJvZHknXG4gIH07XG4gIHZhciBFdmVudCQ3ID0ge1xuICAgIEhJREU6IFwiaGlkZVwiICsgRVZFTlRfS0VZJDcsXG4gICAgSElEREVOOiBcImhpZGRlblwiICsgRVZFTlRfS0VZJDcsXG4gICAgU0hPVzogXCJzaG93XCIgKyBFVkVOVF9LRVkkNyxcbiAgICBTSE9XTjogXCJzaG93blwiICsgRVZFTlRfS0VZJDcsXG4gICAgSU5TRVJURUQ6IFwiaW5zZXJ0ZWRcIiArIEVWRU5UX0tFWSQ3LFxuICAgIENMSUNLOiBcImNsaWNrXCIgKyBFVkVOVF9LRVkkNyxcbiAgICBGT0NVU0lOOiBcImZvY3VzaW5cIiArIEVWRU5UX0tFWSQ3LFxuICAgIEZPQ1VTT1VUOiBcImZvY3Vzb3V0XCIgKyBFVkVOVF9LRVkkNyxcbiAgICBNT1VTRUVOVEVSOiBcIm1vdXNlZW50ZXJcIiArIEVWRU5UX0tFWSQ3LFxuICAgIE1PVVNFTEVBVkU6IFwibW91c2VsZWF2ZVwiICsgRVZFTlRfS0VZJDdcbiAgICAvKipcbiAgICAgKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICAgKiBDbGFzcyBEZWZpbml0aW9uXG4gICAgICogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAgICovXG5cbiAgfTtcblxuICB2YXIgUG9wb3ZlciA9XG4gIC8qI19fUFVSRV9fKi9cbiAgZnVuY3Rpb24gKF9Ub29sdGlwKSB7XG4gICAgX2luaGVyaXRzTG9vc2UoUG9wb3ZlciwgX1Rvb2x0aXApO1xuXG4gICAgZnVuY3Rpb24gUG9wb3ZlcigpIHtcbiAgICAgIHJldHVybiBfVG9vbHRpcC5hcHBseSh0aGlzLCBhcmd1bWVudHMpIHx8IHRoaXM7XG4gICAgfVxuXG4gICAgdmFyIF9wcm90byA9IFBvcG92ZXIucHJvdG90eXBlO1xuXG4gICAgLy8gT3ZlcnJpZGVzXG4gICAgX3Byb3RvLmlzV2l0aENvbnRlbnQgPSBmdW5jdGlvbiBpc1dpdGhDb250ZW50KCkge1xuICAgICAgcmV0dXJuIHRoaXMuZ2V0VGl0bGUoKSB8fCB0aGlzLl9nZXRDb250ZW50KCk7XG4gICAgfTtcblxuICAgIF9wcm90by5hZGRBdHRhY2htZW50Q2xhc3MgPSBmdW5jdGlvbiBhZGRBdHRhY2htZW50Q2xhc3MoYXR0YWNobWVudCkge1xuICAgICAgJCh0aGlzLmdldFRpcEVsZW1lbnQoKSkuYWRkQ2xhc3MoQ0xBU1NfUFJFRklYJDEgKyBcIi1cIiArIGF0dGFjaG1lbnQpO1xuICAgIH07XG5cbiAgICBfcHJvdG8uZ2V0VGlwRWxlbWVudCA9IGZ1bmN0aW9uIGdldFRpcEVsZW1lbnQoKSB7XG4gICAgICB0aGlzLnRpcCA9IHRoaXMudGlwIHx8ICQodGhpcy5jb25maWcudGVtcGxhdGUpWzBdO1xuICAgICAgcmV0dXJuIHRoaXMudGlwO1xuICAgIH07XG5cbiAgICBfcHJvdG8uc2V0Q29udGVudCA9IGZ1bmN0aW9uIHNldENvbnRlbnQoKSB7XG4gICAgICB2YXIgJHRpcCA9ICQodGhpcy5nZXRUaXBFbGVtZW50KCkpOyAvLyBXZSB1c2UgYXBwZW5kIGZvciBodG1sIG9iamVjdHMgdG8gbWFpbnRhaW4ganMgZXZlbnRzXG5cbiAgICAgIHRoaXMuc2V0RWxlbWVudENvbnRlbnQoJHRpcC5maW5kKFNlbGVjdG9yJDcuVElUTEUpLCB0aGlzLmdldFRpdGxlKCkpO1xuXG4gICAgICB2YXIgY29udGVudCA9IHRoaXMuX2dldENvbnRlbnQoKTtcblxuICAgICAgaWYgKHR5cGVvZiBjb250ZW50ID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIGNvbnRlbnQgPSBjb250ZW50LmNhbGwodGhpcy5lbGVtZW50KTtcbiAgICAgIH1cblxuICAgICAgdGhpcy5zZXRFbGVtZW50Q29udGVudCgkdGlwLmZpbmQoU2VsZWN0b3IkNy5DT05URU5UKSwgY29udGVudCk7XG4gICAgICAkdGlwLnJlbW92ZUNsYXNzKENsYXNzTmFtZSQ3LkZBREUgKyBcIiBcIiArIENsYXNzTmFtZSQ3LlNIT1cpO1xuICAgIH07IC8vIFByaXZhdGVcblxuXG4gICAgX3Byb3RvLl9nZXRDb250ZW50ID0gZnVuY3Rpb24gX2dldENvbnRlbnQoKSB7XG4gICAgICByZXR1cm4gdGhpcy5lbGVtZW50LmdldEF0dHJpYnV0ZSgnZGF0YS1jb250ZW50JykgfHwgdGhpcy5jb25maWcuY29udGVudDtcbiAgICB9O1xuXG4gICAgX3Byb3RvLl9jbGVhblRpcENsYXNzID0gZnVuY3Rpb24gX2NsZWFuVGlwQ2xhc3MoKSB7XG4gICAgICB2YXIgJHRpcCA9ICQodGhpcy5nZXRUaXBFbGVtZW50KCkpO1xuICAgICAgdmFyIHRhYkNsYXNzID0gJHRpcC5hdHRyKCdjbGFzcycpLm1hdGNoKEJTQ0xTX1BSRUZJWF9SRUdFWCQxKTtcblxuICAgICAgaWYgKHRhYkNsYXNzICE9PSBudWxsICYmIHRhYkNsYXNzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgJHRpcC5yZW1vdmVDbGFzcyh0YWJDbGFzcy5qb2luKCcnKSk7XG4gICAgICB9XG4gICAgfTsgLy8gU3RhdGljXG5cblxuICAgIFBvcG92ZXIuX2pRdWVyeUludGVyZmFjZSA9IGZ1bmN0aW9uIF9qUXVlcnlJbnRlcmZhY2UoY29uZmlnKSB7XG4gICAgICByZXR1cm4gdGhpcy5lYWNoKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIGRhdGEgPSAkKHRoaXMpLmRhdGEoREFUQV9LRVkkNyk7XG5cbiAgICAgICAgdmFyIF9jb25maWcgPSB0eXBlb2YgY29uZmlnID09PSAnb2JqZWN0JyA/IGNvbmZpZyA6IG51bGw7XG5cbiAgICAgICAgaWYgKCFkYXRhICYmIC9kaXNwb3NlfGhpZGUvLnRlc3QoY29uZmlnKSkge1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICghZGF0YSkge1xuICAgICAgICAgIGRhdGEgPSBuZXcgUG9wb3Zlcih0aGlzLCBfY29uZmlnKTtcbiAgICAgICAgICAkKHRoaXMpLmRhdGEoREFUQV9LRVkkNywgZGF0YSk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAodHlwZW9mIGNvbmZpZyA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgICBpZiAodHlwZW9mIGRhdGFbY29uZmlnXSA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoXCJObyBtZXRob2QgbmFtZWQgXFxcIlwiICsgY29uZmlnICsgXCJcXFwiXCIpO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIGRhdGFbY29uZmlnXSgpO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9O1xuXG4gICAgX2NyZWF0ZUNsYXNzKFBvcG92ZXIsIG51bGwsIFt7XG4gICAgICBrZXk6IFwiVkVSU0lPTlwiLFxuICAgICAgLy8gR2V0dGVyc1xuICAgICAgZ2V0OiBmdW5jdGlvbiBnZXQoKSB7XG4gICAgICAgIHJldHVybiBWRVJTSU9OJDc7XG4gICAgICB9XG4gICAgfSwge1xuICAgICAga2V5OiBcIkRlZmF1bHRcIixcbiAgICAgIGdldDogZnVuY3Rpb24gZ2V0KCkge1xuICAgICAgICByZXR1cm4gRGVmYXVsdCQ1O1xuICAgICAgfVxuICAgIH0sIHtcbiAgICAgIGtleTogXCJOQU1FXCIsXG4gICAgICBnZXQ6IGZ1bmN0aW9uIGdldCgpIHtcbiAgICAgICAgcmV0dXJuIE5BTUUkNztcbiAgICAgIH1cbiAgICB9LCB7XG4gICAgICBrZXk6IFwiREFUQV9LRVlcIixcbiAgICAgIGdldDogZnVuY3Rpb24gZ2V0KCkge1xuICAgICAgICByZXR1cm4gREFUQV9LRVkkNztcbiAgICAgIH1cbiAgICB9LCB7XG4gICAgICBrZXk6IFwiRXZlbnRcIixcbiAgICAgIGdldDogZnVuY3Rpb24gZ2V0KCkge1xuICAgICAgICByZXR1cm4gRXZlbnQkNztcbiAgICAgIH1cbiAgICB9LCB7XG4gICAgICBrZXk6IFwiRVZFTlRfS0VZXCIsXG4gICAgICBnZXQ6IGZ1bmN0aW9uIGdldCgpIHtcbiAgICAgICAgcmV0dXJuIEVWRU5UX0tFWSQ3O1xuICAgICAgfVxuICAgIH0sIHtcbiAgICAgIGtleTogXCJEZWZhdWx0VHlwZVwiLFxuICAgICAgZ2V0OiBmdW5jdGlvbiBnZXQoKSB7XG4gICAgICAgIHJldHVybiBEZWZhdWx0VHlwZSQ1O1xuICAgICAgfVxuICAgIH1dKTtcblxuICAgIHJldHVybiBQb3BvdmVyO1xuICB9KFRvb2x0aXApO1xuICAvKipcbiAgICogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAqIGpRdWVyeVxuICAgKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICovXG5cblxuICAkLmZuW05BTUUkN10gPSBQb3BvdmVyLl9qUXVlcnlJbnRlcmZhY2U7XG4gICQuZm5bTkFNRSQ3XS5Db25zdHJ1Y3RvciA9IFBvcG92ZXI7XG5cbiAgJC5mbltOQU1FJDddLm5vQ29uZmxpY3QgPSBmdW5jdGlvbiAoKSB7XG4gICAgJC5mbltOQU1FJDddID0gSlFVRVJZX05PX0NPTkZMSUNUJDc7XG4gICAgcmV0dXJuIFBvcG92ZXIuX2pRdWVyeUludGVyZmFjZTtcbiAgfTtcblxuICAvKipcbiAgICogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAqIENvbnN0YW50c1xuICAgKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICovXG5cbiAgdmFyIE5BTUUkOCA9ICdzY3JvbGxzcHknO1xuICB2YXIgVkVSU0lPTiQ4ID0gJzQuMi4xJztcbiAgdmFyIERBVEFfS0VZJDggPSAnYnMuc2Nyb2xsc3B5JztcbiAgdmFyIEVWRU5UX0tFWSQ4ID0gXCIuXCIgKyBEQVRBX0tFWSQ4O1xuICB2YXIgREFUQV9BUElfS0VZJDYgPSAnLmRhdGEtYXBpJztcbiAgdmFyIEpRVUVSWV9OT19DT05GTElDVCQ4ID0gJC5mbltOQU1FJDhdO1xuICB2YXIgRGVmYXVsdCQ2ID0ge1xuICAgIG9mZnNldDogMTAsXG4gICAgbWV0aG9kOiAnYXV0bycsXG4gICAgdGFyZ2V0OiAnJ1xuICB9O1xuICB2YXIgRGVmYXVsdFR5cGUkNiA9IHtcbiAgICBvZmZzZXQ6ICdudW1iZXInLFxuICAgIG1ldGhvZDogJ3N0cmluZycsXG4gICAgdGFyZ2V0OiAnKHN0cmluZ3xlbGVtZW50KSdcbiAgfTtcbiAgdmFyIEV2ZW50JDggPSB7XG4gICAgQUNUSVZBVEU6IFwiYWN0aXZhdGVcIiArIEVWRU5UX0tFWSQ4LFxuICAgIFNDUk9MTDogXCJzY3JvbGxcIiArIEVWRU5UX0tFWSQ4LFxuICAgIExPQURfREFUQV9BUEk6IFwibG9hZFwiICsgRVZFTlRfS0VZJDggKyBEQVRBX0FQSV9LRVkkNlxuICB9O1xuICB2YXIgQ2xhc3NOYW1lJDggPSB7XG4gICAgRFJPUERPV05fSVRFTTogJ2Ryb3Bkb3duLWl0ZW0nLFxuICAgIERST1BET1dOX01FTlU6ICdkcm9wZG93bi1tZW51JyxcbiAgICBBQ1RJVkU6ICdhY3RpdmUnXG4gIH07XG4gIHZhciBTZWxlY3RvciQ4ID0ge1xuICAgIERBVEFfU1BZOiAnW2RhdGEtc3B5PVwic2Nyb2xsXCJdJyxcbiAgICBBQ1RJVkU6ICcuYWN0aXZlJyxcbiAgICBOQVZfTElTVF9HUk9VUDogJy5uYXYsIC5saXN0LWdyb3VwJyxcbiAgICBOQVZfTElOS1M6ICcubmF2LWxpbmsnLFxuICAgIE5BVl9JVEVNUzogJy5uYXYtaXRlbScsXG4gICAgTElTVF9JVEVNUzogJy5saXN0LWdyb3VwLWl0ZW0nLFxuICAgIERST1BET1dOOiAnLmRyb3Bkb3duJyxcbiAgICBEUk9QRE9XTl9JVEVNUzogJy5kcm9wZG93bi1pdGVtJyxcbiAgICBEUk9QRE9XTl9UT0dHTEU6ICcuZHJvcGRvd24tdG9nZ2xlJ1xuICB9O1xuICB2YXIgT2Zmc2V0TWV0aG9kID0ge1xuICAgIE9GRlNFVDogJ29mZnNldCcsXG4gICAgUE9TSVRJT046ICdwb3NpdGlvbidcbiAgICAvKipcbiAgICAgKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICAgKiBDbGFzcyBEZWZpbml0aW9uXG4gICAgICogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAgICovXG5cbiAgfTtcblxuICB2YXIgU2Nyb2xsU3B5ID1cbiAgLyojX19QVVJFX18qL1xuICBmdW5jdGlvbiAoKSB7XG4gICAgZnVuY3Rpb24gU2Nyb2xsU3B5KGVsZW1lbnQsIGNvbmZpZykge1xuICAgICAgdmFyIF90aGlzID0gdGhpcztcblxuICAgICAgdGhpcy5fZWxlbWVudCA9IGVsZW1lbnQ7XG4gICAgICB0aGlzLl9zY3JvbGxFbGVtZW50ID0gZWxlbWVudC50YWdOYW1lID09PSAnQk9EWScgPyB3aW5kb3cgOiBlbGVtZW50O1xuICAgICAgdGhpcy5fY29uZmlnID0gdGhpcy5fZ2V0Q29uZmlnKGNvbmZpZyk7XG4gICAgICB0aGlzLl9zZWxlY3RvciA9IHRoaXMuX2NvbmZpZy50YXJnZXQgKyBcIiBcIiArIFNlbGVjdG9yJDguTkFWX0xJTktTICsgXCIsXCIgKyAodGhpcy5fY29uZmlnLnRhcmdldCArIFwiIFwiICsgU2VsZWN0b3IkOC5MSVNUX0lURU1TICsgXCIsXCIpICsgKHRoaXMuX2NvbmZpZy50YXJnZXQgKyBcIiBcIiArIFNlbGVjdG9yJDguRFJPUERPV05fSVRFTVMpO1xuICAgICAgdGhpcy5fb2Zmc2V0cyA9IFtdO1xuICAgICAgdGhpcy5fdGFyZ2V0cyA9IFtdO1xuICAgICAgdGhpcy5fYWN0aXZlVGFyZ2V0ID0gbnVsbDtcbiAgICAgIHRoaXMuX3Njcm9sbEhlaWdodCA9IDA7XG4gICAgICAkKHRoaXMuX3Njcm9sbEVsZW1lbnQpLm9uKEV2ZW50JDguU0NST0xMLCBmdW5jdGlvbiAoZXZlbnQpIHtcbiAgICAgICAgcmV0dXJuIF90aGlzLl9wcm9jZXNzKGV2ZW50KTtcbiAgICAgIH0pO1xuICAgICAgdGhpcy5yZWZyZXNoKCk7XG5cbiAgICAgIHRoaXMuX3Byb2Nlc3MoKTtcbiAgICB9IC8vIEdldHRlcnNcblxuXG4gICAgdmFyIF9wcm90byA9IFNjcm9sbFNweS5wcm90b3R5cGU7XG5cbiAgICAvLyBQdWJsaWNcbiAgICBfcHJvdG8ucmVmcmVzaCA9IGZ1bmN0aW9uIHJlZnJlc2goKSB7XG4gICAgICB2YXIgX3RoaXMyID0gdGhpcztcblxuICAgICAgdmFyIGF1dG9NZXRob2QgPSB0aGlzLl9zY3JvbGxFbGVtZW50ID09PSB0aGlzLl9zY3JvbGxFbGVtZW50LndpbmRvdyA/IE9mZnNldE1ldGhvZC5PRkZTRVQgOiBPZmZzZXRNZXRob2QuUE9TSVRJT047XG4gICAgICB2YXIgb2Zmc2V0TWV0aG9kID0gdGhpcy5fY29uZmlnLm1ldGhvZCA9PT0gJ2F1dG8nID8gYXV0b01ldGhvZCA6IHRoaXMuX2NvbmZpZy5tZXRob2Q7XG4gICAgICB2YXIgb2Zmc2V0QmFzZSA9IG9mZnNldE1ldGhvZCA9PT0gT2Zmc2V0TWV0aG9kLlBPU0lUSU9OID8gdGhpcy5fZ2V0U2Nyb2xsVG9wKCkgOiAwO1xuICAgICAgdGhpcy5fb2Zmc2V0cyA9IFtdO1xuICAgICAgdGhpcy5fdGFyZ2V0cyA9IFtdO1xuICAgICAgdGhpcy5fc2Nyb2xsSGVpZ2h0ID0gdGhpcy5fZ2V0U2Nyb2xsSGVpZ2h0KCk7XG4gICAgICB2YXIgdGFyZ2V0cyA9IFtdLnNsaWNlLmNhbGwoZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbCh0aGlzLl9zZWxlY3RvcikpO1xuICAgICAgdGFyZ2V0cy5tYXAoZnVuY3Rpb24gKGVsZW1lbnQpIHtcbiAgICAgICAgdmFyIHRhcmdldDtcbiAgICAgICAgdmFyIHRhcmdldFNlbGVjdG9yID0gVXRpbC5nZXRTZWxlY3RvckZyb21FbGVtZW50KGVsZW1lbnQpO1xuXG4gICAgICAgIGlmICh0YXJnZXRTZWxlY3Rvcikge1xuICAgICAgICAgIHRhcmdldCA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IodGFyZ2V0U2VsZWN0b3IpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHRhcmdldCkge1xuICAgICAgICAgIHZhciB0YXJnZXRCQ1IgPSB0YXJnZXQuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XG5cbiAgICAgICAgICBpZiAodGFyZ2V0QkNSLndpZHRoIHx8IHRhcmdldEJDUi5oZWlnaHQpIHtcbiAgICAgICAgICAgIC8vIFRPRE8gKGZhdCk6IHJlbW92ZSBza2V0Y2ggcmVsaWFuY2Ugb24galF1ZXJ5IHBvc2l0aW9uL29mZnNldFxuICAgICAgICAgICAgcmV0dXJuIFskKHRhcmdldClbb2Zmc2V0TWV0aG9kXSgpLnRvcCArIG9mZnNldEJhc2UsIHRhcmdldFNlbGVjdG9yXTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgIH0pLmZpbHRlcihmdW5jdGlvbiAoaXRlbSkge1xuICAgICAgICByZXR1cm4gaXRlbTtcbiAgICAgIH0pLnNvcnQoZnVuY3Rpb24gKGEsIGIpIHtcbiAgICAgICAgcmV0dXJuIGFbMF0gLSBiWzBdO1xuICAgICAgfSkuZm9yRWFjaChmdW5jdGlvbiAoaXRlbSkge1xuICAgICAgICBfdGhpczIuX29mZnNldHMucHVzaChpdGVtWzBdKTtcblxuICAgICAgICBfdGhpczIuX3RhcmdldHMucHVzaChpdGVtWzFdKTtcbiAgICAgIH0pO1xuICAgIH07XG5cbiAgICBfcHJvdG8uZGlzcG9zZSA9IGZ1bmN0aW9uIGRpc3Bvc2UoKSB7XG4gICAgICAkLnJlbW92ZURhdGEodGhpcy5fZWxlbWVudCwgREFUQV9LRVkkOCk7XG4gICAgICAkKHRoaXMuX3Njcm9sbEVsZW1lbnQpLm9mZihFVkVOVF9LRVkkOCk7XG4gICAgICB0aGlzLl9lbGVtZW50ID0gbnVsbDtcbiAgICAgIHRoaXMuX3Njcm9sbEVsZW1lbnQgPSBudWxsO1xuICAgICAgdGhpcy5fY29uZmlnID0gbnVsbDtcbiAgICAgIHRoaXMuX3NlbGVjdG9yID0gbnVsbDtcbiAgICAgIHRoaXMuX29mZnNldHMgPSBudWxsO1xuICAgICAgdGhpcy5fdGFyZ2V0cyA9IG51bGw7XG4gICAgICB0aGlzLl9hY3RpdmVUYXJnZXQgPSBudWxsO1xuICAgICAgdGhpcy5fc2Nyb2xsSGVpZ2h0ID0gbnVsbDtcbiAgICB9OyAvLyBQcml2YXRlXG5cblxuICAgIF9wcm90by5fZ2V0Q29uZmlnID0gZnVuY3Rpb24gX2dldENvbmZpZyhjb25maWcpIHtcbiAgICAgIGNvbmZpZyA9IF9vYmplY3RTcHJlYWQoe30sIERlZmF1bHQkNiwgdHlwZW9mIGNvbmZpZyA9PT0gJ29iamVjdCcgJiYgY29uZmlnID8gY29uZmlnIDoge30pO1xuXG4gICAgICBpZiAodHlwZW9mIGNvbmZpZy50YXJnZXQgIT09ICdzdHJpbmcnKSB7XG4gICAgICAgIHZhciBpZCA9ICQoY29uZmlnLnRhcmdldCkuYXR0cignaWQnKTtcblxuICAgICAgICBpZiAoIWlkKSB7XG4gICAgICAgICAgaWQgPSBVdGlsLmdldFVJRChOQU1FJDgpO1xuICAgICAgICAgICQoY29uZmlnLnRhcmdldCkuYXR0cignaWQnLCBpZCk7XG4gICAgICAgIH1cblxuICAgICAgICBjb25maWcudGFyZ2V0ID0gXCIjXCIgKyBpZDtcbiAgICAgIH1cblxuICAgICAgVXRpbC50eXBlQ2hlY2tDb25maWcoTkFNRSQ4LCBjb25maWcsIERlZmF1bHRUeXBlJDYpO1xuICAgICAgcmV0dXJuIGNvbmZpZztcbiAgICB9O1xuXG4gICAgX3Byb3RvLl9nZXRTY3JvbGxUb3AgPSBmdW5jdGlvbiBfZ2V0U2Nyb2xsVG9wKCkge1xuICAgICAgcmV0dXJuIHRoaXMuX3Njcm9sbEVsZW1lbnQgPT09IHdpbmRvdyA/IHRoaXMuX3Njcm9sbEVsZW1lbnQucGFnZVlPZmZzZXQgOiB0aGlzLl9zY3JvbGxFbGVtZW50LnNjcm9sbFRvcDtcbiAgICB9O1xuXG4gICAgX3Byb3RvLl9nZXRTY3JvbGxIZWlnaHQgPSBmdW5jdGlvbiBfZ2V0U2Nyb2xsSGVpZ2h0KCkge1xuICAgICAgcmV0dXJuIHRoaXMuX3Njcm9sbEVsZW1lbnQuc2Nyb2xsSGVpZ2h0IHx8IE1hdGgubWF4KGRvY3VtZW50LmJvZHkuc2Nyb2xsSGVpZ2h0LCBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQuc2Nyb2xsSGVpZ2h0KTtcbiAgICB9O1xuXG4gICAgX3Byb3RvLl9nZXRPZmZzZXRIZWlnaHQgPSBmdW5jdGlvbiBfZ2V0T2Zmc2V0SGVpZ2h0KCkge1xuICAgICAgcmV0dXJuIHRoaXMuX3Njcm9sbEVsZW1lbnQgPT09IHdpbmRvdyA/IHdpbmRvdy5pbm5lckhlaWdodCA6IHRoaXMuX3Njcm9sbEVsZW1lbnQuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCkuaGVpZ2h0O1xuICAgIH07XG5cbiAgICBfcHJvdG8uX3Byb2Nlc3MgPSBmdW5jdGlvbiBfcHJvY2VzcygpIHtcbiAgICAgIHZhciBzY3JvbGxUb3AgPSB0aGlzLl9nZXRTY3JvbGxUb3AoKSArIHRoaXMuX2NvbmZpZy5vZmZzZXQ7XG5cbiAgICAgIHZhciBzY3JvbGxIZWlnaHQgPSB0aGlzLl9nZXRTY3JvbGxIZWlnaHQoKTtcblxuICAgICAgdmFyIG1heFNjcm9sbCA9IHRoaXMuX2NvbmZpZy5vZmZzZXQgKyBzY3JvbGxIZWlnaHQgLSB0aGlzLl9nZXRPZmZzZXRIZWlnaHQoKTtcblxuICAgICAgaWYgKHRoaXMuX3Njcm9sbEhlaWdodCAhPT0gc2Nyb2xsSGVpZ2h0KSB7XG4gICAgICAgIHRoaXMucmVmcmVzaCgpO1xuICAgICAgfVxuXG4gICAgICBpZiAoc2Nyb2xsVG9wID49IG1heFNjcm9sbCkge1xuICAgICAgICB2YXIgdGFyZ2V0ID0gdGhpcy5fdGFyZ2V0c1t0aGlzLl90YXJnZXRzLmxlbmd0aCAtIDFdO1xuXG4gICAgICAgIGlmICh0aGlzLl9hY3RpdmVUYXJnZXQgIT09IHRhcmdldCkge1xuICAgICAgICAgIHRoaXMuX2FjdGl2YXRlKHRhcmdldCk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIGlmICh0aGlzLl9hY3RpdmVUYXJnZXQgJiYgc2Nyb2xsVG9wIDwgdGhpcy5fb2Zmc2V0c1swXSAmJiB0aGlzLl9vZmZzZXRzWzBdID4gMCkge1xuICAgICAgICB0aGlzLl9hY3RpdmVUYXJnZXQgPSBudWxsO1xuXG4gICAgICAgIHRoaXMuX2NsZWFyKCk7XG5cbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICB2YXIgb2Zmc2V0TGVuZ3RoID0gdGhpcy5fb2Zmc2V0cy5sZW5ndGg7XG5cbiAgICAgIGZvciAodmFyIGkgPSBvZmZzZXRMZW5ndGg7IGktLTspIHtcbiAgICAgICAgdmFyIGlzQWN0aXZlVGFyZ2V0ID0gdGhpcy5fYWN0aXZlVGFyZ2V0ICE9PSB0aGlzLl90YXJnZXRzW2ldICYmIHNjcm9sbFRvcCA+PSB0aGlzLl9vZmZzZXRzW2ldICYmICh0eXBlb2YgdGhpcy5fb2Zmc2V0c1tpICsgMV0gPT09ICd1bmRlZmluZWQnIHx8IHNjcm9sbFRvcCA8IHRoaXMuX29mZnNldHNbaSArIDFdKTtcblxuICAgICAgICBpZiAoaXNBY3RpdmVUYXJnZXQpIHtcbiAgICAgICAgICB0aGlzLl9hY3RpdmF0ZSh0aGlzLl90YXJnZXRzW2ldKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH07XG5cbiAgICBfcHJvdG8uX2FjdGl2YXRlID0gZnVuY3Rpb24gX2FjdGl2YXRlKHRhcmdldCkge1xuICAgICAgdGhpcy5fYWN0aXZlVGFyZ2V0ID0gdGFyZ2V0O1xuXG4gICAgICB0aGlzLl9jbGVhcigpO1xuXG4gICAgICB2YXIgcXVlcmllcyA9IHRoaXMuX3NlbGVjdG9yLnNwbGl0KCcsJykubWFwKGZ1bmN0aW9uIChzZWxlY3Rvcikge1xuICAgICAgICByZXR1cm4gc2VsZWN0b3IgKyBcIltkYXRhLXRhcmdldD1cXFwiXCIgKyB0YXJnZXQgKyBcIlxcXCJdLFwiICsgc2VsZWN0b3IgKyBcIltocmVmPVxcXCJcIiArIHRhcmdldCArIFwiXFxcIl1cIjtcbiAgICAgIH0pO1xuXG4gICAgICB2YXIgJGxpbmsgPSAkKFtdLnNsaWNlLmNhbGwoZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbChxdWVyaWVzLmpvaW4oJywnKSkpKTtcblxuICAgICAgaWYgKCRsaW5rLmhhc0NsYXNzKENsYXNzTmFtZSQ4LkRST1BET1dOX0lURU0pKSB7XG4gICAgICAgICRsaW5rLmNsb3Nlc3QoU2VsZWN0b3IkOC5EUk9QRE9XTikuZmluZChTZWxlY3RvciQ4LkRST1BET1dOX1RPR0dMRSkuYWRkQ2xhc3MoQ2xhc3NOYW1lJDguQUNUSVZFKTtcbiAgICAgICAgJGxpbmsuYWRkQ2xhc3MoQ2xhc3NOYW1lJDguQUNUSVZFKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIFNldCB0cmlnZ2VyZWQgbGluayBhcyBhY3RpdmVcbiAgICAgICAgJGxpbmsuYWRkQ2xhc3MoQ2xhc3NOYW1lJDguQUNUSVZFKTsgLy8gU2V0IHRyaWdnZXJlZCBsaW5rcyBwYXJlbnRzIGFzIGFjdGl2ZVxuICAgICAgICAvLyBXaXRoIGJvdGggPHVsPiBhbmQgPG5hdj4gbWFya3VwIGEgcGFyZW50IGlzIHRoZSBwcmV2aW91cyBzaWJsaW5nIG9mIGFueSBuYXYgYW5jZXN0b3JcblxuICAgICAgICAkbGluay5wYXJlbnRzKFNlbGVjdG9yJDguTkFWX0xJU1RfR1JPVVApLnByZXYoU2VsZWN0b3IkOC5OQVZfTElOS1MgKyBcIiwgXCIgKyBTZWxlY3RvciQ4LkxJU1RfSVRFTVMpLmFkZENsYXNzKENsYXNzTmFtZSQ4LkFDVElWRSk7IC8vIEhhbmRsZSBzcGVjaWFsIGNhc2Ugd2hlbiAubmF2LWxpbmsgaXMgaW5zaWRlIC5uYXYtaXRlbVxuXG4gICAgICAgICRsaW5rLnBhcmVudHMoU2VsZWN0b3IkOC5OQVZfTElTVF9HUk9VUCkucHJldihTZWxlY3RvciQ4Lk5BVl9JVEVNUykuY2hpbGRyZW4oU2VsZWN0b3IkOC5OQVZfTElOS1MpLmFkZENsYXNzKENsYXNzTmFtZSQ4LkFDVElWRSk7XG4gICAgICB9XG5cbiAgICAgICQodGhpcy5fc2Nyb2xsRWxlbWVudCkudHJpZ2dlcihFdmVudCQ4LkFDVElWQVRFLCB7XG4gICAgICAgIHJlbGF0ZWRUYXJnZXQ6IHRhcmdldFxuICAgICAgfSk7XG4gICAgfTtcblxuICAgIF9wcm90by5fY2xlYXIgPSBmdW5jdGlvbiBfY2xlYXIoKSB7XG4gICAgICBbXS5zbGljZS5jYWxsKGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwodGhpcy5fc2VsZWN0b3IpKS5maWx0ZXIoZnVuY3Rpb24gKG5vZGUpIHtcbiAgICAgICAgcmV0dXJuIG5vZGUuY2xhc3NMaXN0LmNvbnRhaW5zKENsYXNzTmFtZSQ4LkFDVElWRSk7XG4gICAgICB9KS5mb3JFYWNoKGZ1bmN0aW9uIChub2RlKSB7XG4gICAgICAgIHJldHVybiBub2RlLmNsYXNzTGlzdC5yZW1vdmUoQ2xhc3NOYW1lJDguQUNUSVZFKTtcbiAgICAgIH0pO1xuICAgIH07IC8vIFN0YXRpY1xuXG5cbiAgICBTY3JvbGxTcHkuX2pRdWVyeUludGVyZmFjZSA9IGZ1bmN0aW9uIF9qUXVlcnlJbnRlcmZhY2UoY29uZmlnKSB7XG4gICAgICByZXR1cm4gdGhpcy5lYWNoKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIGRhdGEgPSAkKHRoaXMpLmRhdGEoREFUQV9LRVkkOCk7XG5cbiAgICAgICAgdmFyIF9jb25maWcgPSB0eXBlb2YgY29uZmlnID09PSAnb2JqZWN0JyAmJiBjb25maWc7XG5cbiAgICAgICAgaWYgKCFkYXRhKSB7XG4gICAgICAgICAgZGF0YSA9IG5ldyBTY3JvbGxTcHkodGhpcywgX2NvbmZpZyk7XG4gICAgICAgICAgJCh0aGlzKS5kYXRhKERBVEFfS0VZJDgsIGRhdGEpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHR5cGVvZiBjb25maWcgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgaWYgKHR5cGVvZiBkYXRhW2NvbmZpZ10gPT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKFwiTm8gbWV0aG9kIG5hbWVkIFxcXCJcIiArIGNvbmZpZyArIFwiXFxcIlwiKTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBkYXRhW2NvbmZpZ10oKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfTtcblxuICAgIF9jcmVhdGVDbGFzcyhTY3JvbGxTcHksIG51bGwsIFt7XG4gICAgICBrZXk6IFwiVkVSU0lPTlwiLFxuICAgICAgZ2V0OiBmdW5jdGlvbiBnZXQoKSB7XG4gICAgICAgIHJldHVybiBWRVJTSU9OJDg7XG4gICAgICB9XG4gICAgfSwge1xuICAgICAga2V5OiBcIkRlZmF1bHRcIixcbiAgICAgIGdldDogZnVuY3Rpb24gZ2V0KCkge1xuICAgICAgICByZXR1cm4gRGVmYXVsdCQ2O1xuICAgICAgfVxuICAgIH1dKTtcblxuICAgIHJldHVybiBTY3JvbGxTcHk7XG4gIH0oKTtcbiAgLyoqXG4gICAqIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgKiBEYXRhIEFwaSBpbXBsZW1lbnRhdGlvblxuICAgKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICovXG5cblxuICAkKHdpbmRvdykub24oRXZlbnQkOC5MT0FEX0RBVEFfQVBJLCBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHNjcm9sbFNweXMgPSBbXS5zbGljZS5jYWxsKGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoU2VsZWN0b3IkOC5EQVRBX1NQWSkpO1xuICAgIHZhciBzY3JvbGxTcHlzTGVuZ3RoID0gc2Nyb2xsU3B5cy5sZW5ndGg7XG5cbiAgICBmb3IgKHZhciBpID0gc2Nyb2xsU3B5c0xlbmd0aDsgaS0tOykge1xuICAgICAgdmFyICRzcHkgPSAkKHNjcm9sbFNweXNbaV0pO1xuXG4gICAgICBTY3JvbGxTcHkuX2pRdWVyeUludGVyZmFjZS5jYWxsKCRzcHksICRzcHkuZGF0YSgpKTtcbiAgICB9XG4gIH0pO1xuICAvKipcbiAgICogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAqIGpRdWVyeVxuICAgKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICovXG5cbiAgJC5mbltOQU1FJDhdID0gU2Nyb2xsU3B5Ll9qUXVlcnlJbnRlcmZhY2U7XG4gICQuZm5bTkFNRSQ4XS5Db25zdHJ1Y3RvciA9IFNjcm9sbFNweTtcblxuICAkLmZuW05BTUUkOF0ubm9Db25mbGljdCA9IGZ1bmN0aW9uICgpIHtcbiAgICAkLmZuW05BTUUkOF0gPSBKUVVFUllfTk9fQ09ORkxJQ1QkODtcbiAgICByZXR1cm4gU2Nyb2xsU3B5Ll9qUXVlcnlJbnRlcmZhY2U7XG4gIH07XG5cbiAgLyoqXG4gICAqIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgKiBDb25zdGFudHNcbiAgICogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAqL1xuXG4gIHZhciBOQU1FJDkgPSAndGFiJztcbiAgdmFyIFZFUlNJT04kOSA9ICc0LjIuMSc7XG4gIHZhciBEQVRBX0tFWSQ5ID0gJ2JzLnRhYic7XG4gIHZhciBFVkVOVF9LRVkkOSA9IFwiLlwiICsgREFUQV9LRVkkOTtcbiAgdmFyIERBVEFfQVBJX0tFWSQ3ID0gJy5kYXRhLWFwaSc7XG4gIHZhciBKUVVFUllfTk9fQ09ORkxJQ1QkOSA9ICQuZm5bTkFNRSQ5XTtcbiAgdmFyIEV2ZW50JDkgPSB7XG4gICAgSElERTogXCJoaWRlXCIgKyBFVkVOVF9LRVkkOSxcbiAgICBISURERU46IFwiaGlkZGVuXCIgKyBFVkVOVF9LRVkkOSxcbiAgICBTSE9XOiBcInNob3dcIiArIEVWRU5UX0tFWSQ5LFxuICAgIFNIT1dOOiBcInNob3duXCIgKyBFVkVOVF9LRVkkOSxcbiAgICBDTElDS19EQVRBX0FQSTogXCJjbGlja1wiICsgRVZFTlRfS0VZJDkgKyBEQVRBX0FQSV9LRVkkN1xuICB9O1xuICB2YXIgQ2xhc3NOYW1lJDkgPSB7XG4gICAgRFJPUERPV05fTUVOVTogJ2Ryb3Bkb3duLW1lbnUnLFxuICAgIEFDVElWRTogJ2FjdGl2ZScsXG4gICAgRElTQUJMRUQ6ICdkaXNhYmxlZCcsXG4gICAgRkFERTogJ2ZhZGUnLFxuICAgIFNIT1c6ICdzaG93J1xuICB9O1xuICB2YXIgU2VsZWN0b3IkOSA9IHtcbiAgICBEUk9QRE9XTjogJy5kcm9wZG93bicsXG4gICAgTkFWX0xJU1RfR1JPVVA6ICcubmF2LCAubGlzdC1ncm91cCcsXG4gICAgQUNUSVZFOiAnLmFjdGl2ZScsXG4gICAgQUNUSVZFX1VMOiAnPiBsaSA+IC5hY3RpdmUnLFxuICAgIERBVEFfVE9HR0xFOiAnW2RhdGEtdG9nZ2xlPVwidGFiXCJdLCBbZGF0YS10b2dnbGU9XCJwaWxsXCJdLCBbZGF0YS10b2dnbGU9XCJsaXN0XCJdJyxcbiAgICBEUk9QRE9XTl9UT0dHTEU6ICcuZHJvcGRvd24tdG9nZ2xlJyxcbiAgICBEUk9QRE9XTl9BQ1RJVkVfQ0hJTEQ6ICc+IC5kcm9wZG93bi1tZW51IC5hY3RpdmUnXG4gICAgLyoqXG4gICAgICogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAgICogQ2xhc3MgRGVmaW5pdGlvblxuICAgICAqIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgICAqL1xuXG4gIH07XG5cbiAgdmFyIFRhYiA9XG4gIC8qI19fUFVSRV9fKi9cbiAgZnVuY3Rpb24gKCkge1xuICAgIGZ1bmN0aW9uIFRhYihlbGVtZW50KSB7XG4gICAgICB0aGlzLl9lbGVtZW50ID0gZWxlbWVudDtcbiAgICB9IC8vIEdldHRlcnNcblxuXG4gICAgdmFyIF9wcm90byA9IFRhYi5wcm90b3R5cGU7XG5cbiAgICAvLyBQdWJsaWNcbiAgICBfcHJvdG8uc2hvdyA9IGZ1bmN0aW9uIHNob3coKSB7XG4gICAgICB2YXIgX3RoaXMgPSB0aGlzO1xuXG4gICAgICBpZiAodGhpcy5fZWxlbWVudC5wYXJlbnROb2RlICYmIHRoaXMuX2VsZW1lbnQucGFyZW50Tm9kZS5ub2RlVHlwZSA9PT0gTm9kZS5FTEVNRU5UX05PREUgJiYgJCh0aGlzLl9lbGVtZW50KS5oYXNDbGFzcyhDbGFzc05hbWUkOS5BQ1RJVkUpIHx8ICQodGhpcy5fZWxlbWVudCkuaGFzQ2xhc3MoQ2xhc3NOYW1lJDkuRElTQUJMRUQpKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgdmFyIHRhcmdldDtcbiAgICAgIHZhciBwcmV2aW91cztcbiAgICAgIHZhciBsaXN0RWxlbWVudCA9ICQodGhpcy5fZWxlbWVudCkuY2xvc2VzdChTZWxlY3RvciQ5Lk5BVl9MSVNUX0dST1VQKVswXTtcbiAgICAgIHZhciBzZWxlY3RvciA9IFV0aWwuZ2V0U2VsZWN0b3JGcm9tRWxlbWVudCh0aGlzLl9lbGVtZW50KTtcblxuICAgICAgaWYgKGxpc3RFbGVtZW50KSB7XG4gICAgICAgIHZhciBpdGVtU2VsZWN0b3IgPSBsaXN0RWxlbWVudC5ub2RlTmFtZSA9PT0gJ1VMJyB8fCBsaXN0RWxlbWVudC5ub2RlTmFtZSA9PT0gJ09MJyA/IFNlbGVjdG9yJDkuQUNUSVZFX1VMIDogU2VsZWN0b3IkOS5BQ1RJVkU7XG4gICAgICAgIHByZXZpb3VzID0gJC5tYWtlQXJyYXkoJChsaXN0RWxlbWVudCkuZmluZChpdGVtU2VsZWN0b3IpKTtcbiAgICAgICAgcHJldmlvdXMgPSBwcmV2aW91c1twcmV2aW91cy5sZW5ndGggLSAxXTtcbiAgICAgIH1cblxuICAgICAgdmFyIGhpZGVFdmVudCA9ICQuRXZlbnQoRXZlbnQkOS5ISURFLCB7XG4gICAgICAgIHJlbGF0ZWRUYXJnZXQ6IHRoaXMuX2VsZW1lbnRcbiAgICAgIH0pO1xuICAgICAgdmFyIHNob3dFdmVudCA9ICQuRXZlbnQoRXZlbnQkOS5TSE9XLCB7XG4gICAgICAgIHJlbGF0ZWRUYXJnZXQ6IHByZXZpb3VzXG4gICAgICB9KTtcblxuICAgICAgaWYgKHByZXZpb3VzKSB7XG4gICAgICAgICQocHJldmlvdXMpLnRyaWdnZXIoaGlkZUV2ZW50KTtcbiAgICAgIH1cblxuICAgICAgJCh0aGlzLl9lbGVtZW50KS50cmlnZ2VyKHNob3dFdmVudCk7XG5cbiAgICAgIGlmIChzaG93RXZlbnQuaXNEZWZhdWx0UHJldmVudGVkKCkgfHwgaGlkZUV2ZW50LmlzRGVmYXVsdFByZXZlbnRlZCgpKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgaWYgKHNlbGVjdG9yKSB7XG4gICAgICAgIHRhcmdldCA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3Ioc2VsZWN0b3IpO1xuICAgICAgfVxuXG4gICAgICB0aGlzLl9hY3RpdmF0ZSh0aGlzLl9lbGVtZW50LCBsaXN0RWxlbWVudCk7XG5cbiAgICAgIHZhciBjb21wbGV0ZSA9IGZ1bmN0aW9uIGNvbXBsZXRlKCkge1xuICAgICAgICB2YXIgaGlkZGVuRXZlbnQgPSAkLkV2ZW50KEV2ZW50JDkuSElEREVOLCB7XG4gICAgICAgICAgcmVsYXRlZFRhcmdldDogX3RoaXMuX2VsZW1lbnRcbiAgICAgICAgfSk7XG4gICAgICAgIHZhciBzaG93bkV2ZW50ID0gJC5FdmVudChFdmVudCQ5LlNIT1dOLCB7XG4gICAgICAgICAgcmVsYXRlZFRhcmdldDogcHJldmlvdXNcbiAgICAgICAgfSk7XG4gICAgICAgICQocHJldmlvdXMpLnRyaWdnZXIoaGlkZGVuRXZlbnQpO1xuICAgICAgICAkKF90aGlzLl9lbGVtZW50KS50cmlnZ2VyKHNob3duRXZlbnQpO1xuICAgICAgfTtcblxuICAgICAgaWYgKHRhcmdldCkge1xuICAgICAgICB0aGlzLl9hY3RpdmF0ZSh0YXJnZXQsIHRhcmdldC5wYXJlbnROb2RlLCBjb21wbGV0ZSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBjb21wbGV0ZSgpO1xuICAgICAgfVxuICAgIH07XG5cbiAgICBfcHJvdG8uZGlzcG9zZSA9IGZ1bmN0aW9uIGRpc3Bvc2UoKSB7XG4gICAgICAkLnJlbW92ZURhdGEodGhpcy5fZWxlbWVudCwgREFUQV9LRVkkOSk7XG4gICAgICB0aGlzLl9lbGVtZW50ID0gbnVsbDtcbiAgICB9OyAvLyBQcml2YXRlXG5cblxuICAgIF9wcm90by5fYWN0aXZhdGUgPSBmdW5jdGlvbiBfYWN0aXZhdGUoZWxlbWVudCwgY29udGFpbmVyLCBjYWxsYmFjaykge1xuICAgICAgdmFyIF90aGlzMiA9IHRoaXM7XG5cbiAgICAgIHZhciBhY3RpdmVFbGVtZW50cyA9IGNvbnRhaW5lciAmJiAoY29udGFpbmVyLm5vZGVOYW1lID09PSAnVUwnIHx8IGNvbnRhaW5lci5ub2RlTmFtZSA9PT0gJ09MJykgPyAkKGNvbnRhaW5lcikuZmluZChTZWxlY3RvciQ5LkFDVElWRV9VTCkgOiAkKGNvbnRhaW5lcikuY2hpbGRyZW4oU2VsZWN0b3IkOS5BQ1RJVkUpO1xuICAgICAgdmFyIGFjdGl2ZSA9IGFjdGl2ZUVsZW1lbnRzWzBdO1xuICAgICAgdmFyIGlzVHJhbnNpdGlvbmluZyA9IGNhbGxiYWNrICYmIGFjdGl2ZSAmJiAkKGFjdGl2ZSkuaGFzQ2xhc3MoQ2xhc3NOYW1lJDkuRkFERSk7XG5cbiAgICAgIHZhciBjb21wbGV0ZSA9IGZ1bmN0aW9uIGNvbXBsZXRlKCkge1xuICAgICAgICByZXR1cm4gX3RoaXMyLl90cmFuc2l0aW9uQ29tcGxldGUoZWxlbWVudCwgYWN0aXZlLCBjYWxsYmFjayk7XG4gICAgICB9O1xuXG4gICAgICBpZiAoYWN0aXZlICYmIGlzVHJhbnNpdGlvbmluZykge1xuICAgICAgICB2YXIgdHJhbnNpdGlvbkR1cmF0aW9uID0gVXRpbC5nZXRUcmFuc2l0aW9uRHVyYXRpb25Gcm9tRWxlbWVudChhY3RpdmUpO1xuICAgICAgICAkKGFjdGl2ZSkucmVtb3ZlQ2xhc3MoQ2xhc3NOYW1lJDkuU0hPVykub25lKFV0aWwuVFJBTlNJVElPTl9FTkQsIGNvbXBsZXRlKS5lbXVsYXRlVHJhbnNpdGlvbkVuZCh0cmFuc2l0aW9uRHVyYXRpb24pO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY29tcGxldGUoKTtcbiAgICAgIH1cbiAgICB9O1xuXG4gICAgX3Byb3RvLl90cmFuc2l0aW9uQ29tcGxldGUgPSBmdW5jdGlvbiBfdHJhbnNpdGlvbkNvbXBsZXRlKGVsZW1lbnQsIGFjdGl2ZSwgY2FsbGJhY2spIHtcbiAgICAgIGlmIChhY3RpdmUpIHtcbiAgICAgICAgJChhY3RpdmUpLnJlbW92ZUNsYXNzKENsYXNzTmFtZSQ5LkFDVElWRSk7XG4gICAgICAgIHZhciBkcm9wZG93bkNoaWxkID0gJChhY3RpdmUucGFyZW50Tm9kZSkuZmluZChTZWxlY3RvciQ5LkRST1BET1dOX0FDVElWRV9DSElMRClbMF07XG5cbiAgICAgICAgaWYgKGRyb3Bkb3duQ2hpbGQpIHtcbiAgICAgICAgICAkKGRyb3Bkb3duQ2hpbGQpLnJlbW92ZUNsYXNzKENsYXNzTmFtZSQ5LkFDVElWRSk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoYWN0aXZlLmdldEF0dHJpYnV0ZSgncm9sZScpID09PSAndGFiJykge1xuICAgICAgICAgIGFjdGl2ZS5zZXRBdHRyaWJ1dGUoJ2FyaWEtc2VsZWN0ZWQnLCBmYWxzZSk7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgJChlbGVtZW50KS5hZGRDbGFzcyhDbGFzc05hbWUkOS5BQ1RJVkUpO1xuXG4gICAgICBpZiAoZWxlbWVudC5nZXRBdHRyaWJ1dGUoJ3JvbGUnKSA9PT0gJ3RhYicpIHtcbiAgICAgICAgZWxlbWVudC5zZXRBdHRyaWJ1dGUoJ2FyaWEtc2VsZWN0ZWQnLCB0cnVlKTtcbiAgICAgIH1cblxuICAgICAgVXRpbC5yZWZsb3coZWxlbWVudCk7XG4gICAgICAkKGVsZW1lbnQpLmFkZENsYXNzKENsYXNzTmFtZSQ5LlNIT1cpO1xuXG4gICAgICBpZiAoZWxlbWVudC5wYXJlbnROb2RlICYmICQoZWxlbWVudC5wYXJlbnROb2RlKS5oYXNDbGFzcyhDbGFzc05hbWUkOS5EUk9QRE9XTl9NRU5VKSkge1xuICAgICAgICB2YXIgZHJvcGRvd25FbGVtZW50ID0gJChlbGVtZW50KS5jbG9zZXN0KFNlbGVjdG9yJDkuRFJPUERPV04pWzBdO1xuXG4gICAgICAgIGlmIChkcm9wZG93bkVsZW1lbnQpIHtcbiAgICAgICAgICB2YXIgZHJvcGRvd25Ub2dnbGVMaXN0ID0gW10uc2xpY2UuY2FsbChkcm9wZG93bkVsZW1lbnQucXVlcnlTZWxlY3RvckFsbChTZWxlY3RvciQ5LkRST1BET1dOX1RPR0dMRSkpO1xuICAgICAgICAgICQoZHJvcGRvd25Ub2dnbGVMaXN0KS5hZGRDbGFzcyhDbGFzc05hbWUkOS5BQ1RJVkUpO1xuICAgICAgICB9XG5cbiAgICAgICAgZWxlbWVudC5zZXRBdHRyaWJ1dGUoJ2FyaWEtZXhwYW5kZWQnLCB0cnVlKTtcbiAgICAgIH1cblxuICAgICAgaWYgKGNhbGxiYWNrKSB7XG4gICAgICAgIGNhbGxiYWNrKCk7XG4gICAgICB9XG4gICAgfTsgLy8gU3RhdGljXG5cblxuICAgIFRhYi5falF1ZXJ5SW50ZXJmYWNlID0gZnVuY3Rpb24gX2pRdWVyeUludGVyZmFjZShjb25maWcpIHtcbiAgICAgIHJldHVybiB0aGlzLmVhY2goZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgJHRoaXMgPSAkKHRoaXMpO1xuICAgICAgICB2YXIgZGF0YSA9ICR0aGlzLmRhdGEoREFUQV9LRVkkOSk7XG5cbiAgICAgICAgaWYgKCFkYXRhKSB7XG4gICAgICAgICAgZGF0YSA9IG5ldyBUYWIodGhpcyk7XG4gICAgICAgICAgJHRoaXMuZGF0YShEQVRBX0tFWSQ5LCBkYXRhKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh0eXBlb2YgY29uZmlnID09PSAnc3RyaW5nJykge1xuICAgICAgICAgIGlmICh0eXBlb2YgZGF0YVtjb25maWddID09PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihcIk5vIG1ldGhvZCBuYW1lZCBcXFwiXCIgKyBjb25maWcgKyBcIlxcXCJcIik7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgZGF0YVtjb25maWddKCk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH07XG5cbiAgICBfY3JlYXRlQ2xhc3MoVGFiLCBudWxsLCBbe1xuICAgICAga2V5OiBcIlZFUlNJT05cIixcbiAgICAgIGdldDogZnVuY3Rpb24gZ2V0KCkge1xuICAgICAgICByZXR1cm4gVkVSU0lPTiQ5O1xuICAgICAgfVxuICAgIH1dKTtcblxuICAgIHJldHVybiBUYWI7XG4gIH0oKTtcbiAgLyoqXG4gICAqIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgKiBEYXRhIEFwaSBpbXBsZW1lbnRhdGlvblxuICAgKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICovXG5cblxuICAkKGRvY3VtZW50KS5vbihFdmVudCQ5LkNMSUNLX0RBVEFfQVBJLCBTZWxlY3RvciQ5LkRBVEFfVE9HR0xFLCBmdW5jdGlvbiAoZXZlbnQpIHtcbiAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuXG4gICAgVGFiLl9qUXVlcnlJbnRlcmZhY2UuY2FsbCgkKHRoaXMpLCAnc2hvdycpO1xuICB9KTtcbiAgLyoqXG4gICAqIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgKiBqUXVlcnlcbiAgICogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAqL1xuXG4gICQuZm5bTkFNRSQ5XSA9IFRhYi5falF1ZXJ5SW50ZXJmYWNlO1xuICAkLmZuW05BTUUkOV0uQ29uc3RydWN0b3IgPSBUYWI7XG5cbiAgJC5mbltOQU1FJDldLm5vQ29uZmxpY3QgPSBmdW5jdGlvbiAoKSB7XG4gICAgJC5mbltOQU1FJDldID0gSlFVRVJZX05PX0NPTkZMSUNUJDk7XG4gICAgcmV0dXJuIFRhYi5falF1ZXJ5SW50ZXJmYWNlO1xuICB9O1xuXG4gIC8qKlxuICAgKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICogQ29uc3RhbnRzXG4gICAqIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgKi9cblxuICB2YXIgTkFNRSRhID0gJ3RvYXN0JztcbiAgdmFyIFZFUlNJT04kYSA9ICc0LjIuMSc7XG4gIHZhciBEQVRBX0tFWSRhID0gJ2JzLnRvYXN0JztcbiAgdmFyIEVWRU5UX0tFWSRhID0gXCIuXCIgKyBEQVRBX0tFWSRhO1xuICB2YXIgSlFVRVJZX05PX0NPTkZMSUNUJGEgPSAkLmZuW05BTUUkYV07XG4gIHZhciBFdmVudCRhID0ge1xuICAgIENMSUNLX0RJU01JU1M6IFwiY2xpY2suZGlzbWlzc1wiICsgRVZFTlRfS0VZJGEsXG4gICAgSElERTogXCJoaWRlXCIgKyBFVkVOVF9LRVkkYSxcbiAgICBISURERU46IFwiaGlkZGVuXCIgKyBFVkVOVF9LRVkkYSxcbiAgICBTSE9XOiBcInNob3dcIiArIEVWRU5UX0tFWSRhLFxuICAgIFNIT1dOOiBcInNob3duXCIgKyBFVkVOVF9LRVkkYVxuICB9O1xuICB2YXIgQ2xhc3NOYW1lJGEgPSB7XG4gICAgRkFERTogJ2ZhZGUnLFxuICAgIEhJREU6ICdoaWRlJyxcbiAgICBTSE9XOiAnc2hvdycsXG4gICAgU0hPV0lORzogJ3Nob3dpbmcnXG4gIH07XG4gIHZhciBEZWZhdWx0VHlwZSQ3ID0ge1xuICAgIGFuaW1hdGlvbjogJ2Jvb2xlYW4nLFxuICAgIGF1dG9oaWRlOiAnYm9vbGVhbicsXG4gICAgZGVsYXk6ICdudW1iZXInXG4gIH07XG4gIHZhciBEZWZhdWx0JDcgPSB7XG4gICAgYW5pbWF0aW9uOiB0cnVlLFxuICAgIGF1dG9oaWRlOiB0cnVlLFxuICAgIGRlbGF5OiA1MDBcbiAgfTtcbiAgdmFyIFNlbGVjdG9yJGEgPSB7XG4gICAgREFUQV9ESVNNSVNTOiAnW2RhdGEtZGlzbWlzcz1cInRvYXN0XCJdJ1xuICAgIC8qKlxuICAgICAqIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgICAqIENsYXNzIERlZmluaXRpb25cbiAgICAgKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICAgKi9cblxuICB9O1xuXG4gIHZhciBUb2FzdCA9XG4gIC8qI19fUFVSRV9fKi9cbiAgZnVuY3Rpb24gKCkge1xuICAgIGZ1bmN0aW9uIFRvYXN0KGVsZW1lbnQsIGNvbmZpZykge1xuICAgICAgdGhpcy5fZWxlbWVudCA9IGVsZW1lbnQ7XG4gICAgICB0aGlzLl9jb25maWcgPSB0aGlzLl9nZXRDb25maWcoY29uZmlnKTtcbiAgICAgIHRoaXMuX3RpbWVvdXQgPSBudWxsO1xuXG4gICAgICB0aGlzLl9zZXRMaXN0ZW5lcnMoKTtcbiAgICB9IC8vIEdldHRlcnNcblxuXG4gICAgdmFyIF9wcm90byA9IFRvYXN0LnByb3RvdHlwZTtcblxuICAgIC8vIFB1YmxpY1xuICAgIF9wcm90by5zaG93ID0gZnVuY3Rpb24gc2hvdygpIHtcbiAgICAgIHZhciBfdGhpcyA9IHRoaXM7XG5cbiAgICAgICQodGhpcy5fZWxlbWVudCkudHJpZ2dlcihFdmVudCRhLlNIT1cpO1xuXG4gICAgICBpZiAodGhpcy5fY29uZmlnLmFuaW1hdGlvbikge1xuICAgICAgICB0aGlzLl9lbGVtZW50LmNsYXNzTGlzdC5hZGQoQ2xhc3NOYW1lJGEuRkFERSk7XG4gICAgICB9XG5cbiAgICAgIHZhciBjb21wbGV0ZSA9IGZ1bmN0aW9uIGNvbXBsZXRlKCkge1xuICAgICAgICBfdGhpcy5fZWxlbWVudC5jbGFzc0xpc3QucmVtb3ZlKENsYXNzTmFtZSRhLlNIT1dJTkcpO1xuXG4gICAgICAgIF90aGlzLl9lbGVtZW50LmNsYXNzTGlzdC5hZGQoQ2xhc3NOYW1lJGEuU0hPVyk7XG5cbiAgICAgICAgJChfdGhpcy5fZWxlbWVudCkudHJpZ2dlcihFdmVudCRhLlNIT1dOKTtcblxuICAgICAgICBpZiAoX3RoaXMuX2NvbmZpZy5hdXRvaGlkZSkge1xuICAgICAgICAgIF90aGlzLmhpZGUoKTtcbiAgICAgICAgfVxuICAgICAgfTtcblxuICAgICAgdGhpcy5fZWxlbWVudC5jbGFzc0xpc3QucmVtb3ZlKENsYXNzTmFtZSRhLkhJREUpO1xuXG4gICAgICB0aGlzLl9lbGVtZW50LmNsYXNzTGlzdC5hZGQoQ2xhc3NOYW1lJGEuU0hPV0lORyk7XG5cbiAgICAgIGlmICh0aGlzLl9jb25maWcuYW5pbWF0aW9uKSB7XG4gICAgICAgIHZhciB0cmFuc2l0aW9uRHVyYXRpb24gPSBVdGlsLmdldFRyYW5zaXRpb25EdXJhdGlvbkZyb21FbGVtZW50KHRoaXMuX2VsZW1lbnQpO1xuICAgICAgICAkKHRoaXMuX2VsZW1lbnQpLm9uZShVdGlsLlRSQU5TSVRJT05fRU5ELCBjb21wbGV0ZSkuZW11bGF0ZVRyYW5zaXRpb25FbmQodHJhbnNpdGlvbkR1cmF0aW9uKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGNvbXBsZXRlKCk7XG4gICAgICB9XG4gICAgfTtcblxuICAgIF9wcm90by5oaWRlID0gZnVuY3Rpb24gaGlkZSh3aXRob3V0VGltZW91dCkge1xuICAgICAgdmFyIF90aGlzMiA9IHRoaXM7XG5cbiAgICAgIGlmICghdGhpcy5fZWxlbWVudC5jbGFzc0xpc3QuY29udGFpbnMoQ2xhc3NOYW1lJGEuU0hPVykpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICAkKHRoaXMuX2VsZW1lbnQpLnRyaWdnZXIoRXZlbnQkYS5ISURFKTtcblxuICAgICAgaWYgKHdpdGhvdXRUaW1lb3V0KSB7XG4gICAgICAgIHRoaXMuX2Nsb3NlKCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLl90aW1lb3V0ID0gc2V0VGltZW91dChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgX3RoaXMyLl9jbG9zZSgpO1xuICAgICAgICB9LCB0aGlzLl9jb25maWcuZGVsYXkpO1xuICAgICAgfVxuICAgIH07XG5cbiAgICBfcHJvdG8uZGlzcG9zZSA9IGZ1bmN0aW9uIGRpc3Bvc2UoKSB7XG4gICAgICBjbGVhclRpbWVvdXQodGhpcy5fdGltZW91dCk7XG4gICAgICB0aGlzLl90aW1lb3V0ID0gbnVsbDtcblxuICAgICAgaWYgKHRoaXMuX2VsZW1lbnQuY2xhc3NMaXN0LmNvbnRhaW5zKENsYXNzTmFtZSRhLlNIT1cpKSB7XG4gICAgICAgIHRoaXMuX2VsZW1lbnQuY2xhc3NMaXN0LnJlbW92ZShDbGFzc05hbWUkYS5TSE9XKTtcbiAgICAgIH1cblxuICAgICAgJCh0aGlzLl9lbGVtZW50KS5vZmYoRXZlbnQkYS5DTElDS19ESVNNSVNTKTtcbiAgICAgICQucmVtb3ZlRGF0YSh0aGlzLl9lbGVtZW50LCBEQVRBX0tFWSRhKTtcbiAgICAgIHRoaXMuX2VsZW1lbnQgPSBudWxsO1xuICAgICAgdGhpcy5fY29uZmlnID0gbnVsbDtcbiAgICB9OyAvLyBQcml2YXRlXG5cblxuICAgIF9wcm90by5fZ2V0Q29uZmlnID0gZnVuY3Rpb24gX2dldENvbmZpZyhjb25maWcpIHtcbiAgICAgIGNvbmZpZyA9IF9vYmplY3RTcHJlYWQoe30sIERlZmF1bHQkNywgJCh0aGlzLl9lbGVtZW50KS5kYXRhKCksIHR5cGVvZiBjb25maWcgPT09ICdvYmplY3QnICYmIGNvbmZpZyA/IGNvbmZpZyA6IHt9KTtcbiAgICAgIFV0aWwudHlwZUNoZWNrQ29uZmlnKE5BTUUkYSwgY29uZmlnLCB0aGlzLmNvbnN0cnVjdG9yLkRlZmF1bHRUeXBlKTtcbiAgICAgIHJldHVybiBjb25maWc7XG4gICAgfTtcblxuICAgIF9wcm90by5fc2V0TGlzdGVuZXJzID0gZnVuY3Rpb24gX3NldExpc3RlbmVycygpIHtcbiAgICAgIHZhciBfdGhpczMgPSB0aGlzO1xuXG4gICAgICAkKHRoaXMuX2VsZW1lbnQpLm9uKEV2ZW50JGEuQ0xJQ0tfRElTTUlTUywgU2VsZWN0b3IkYS5EQVRBX0RJU01JU1MsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIF90aGlzMy5oaWRlKHRydWUpO1xuICAgICAgfSk7XG4gICAgfTtcblxuICAgIF9wcm90by5fY2xvc2UgPSBmdW5jdGlvbiBfY2xvc2UoKSB7XG4gICAgICB2YXIgX3RoaXM0ID0gdGhpcztcblxuICAgICAgdmFyIGNvbXBsZXRlID0gZnVuY3Rpb24gY29tcGxldGUoKSB7XG4gICAgICAgIF90aGlzNC5fZWxlbWVudC5jbGFzc0xpc3QuYWRkKENsYXNzTmFtZSRhLkhJREUpO1xuXG4gICAgICAgICQoX3RoaXM0Ll9lbGVtZW50KS50cmlnZ2VyKEV2ZW50JGEuSElEREVOKTtcbiAgICAgIH07XG5cbiAgICAgIHRoaXMuX2VsZW1lbnQuY2xhc3NMaXN0LnJlbW92ZShDbGFzc05hbWUkYS5TSE9XKTtcblxuICAgICAgaWYgKHRoaXMuX2NvbmZpZy5hbmltYXRpb24pIHtcbiAgICAgICAgdmFyIHRyYW5zaXRpb25EdXJhdGlvbiA9IFV0aWwuZ2V0VHJhbnNpdGlvbkR1cmF0aW9uRnJvbUVsZW1lbnQodGhpcy5fZWxlbWVudCk7XG4gICAgICAgICQodGhpcy5fZWxlbWVudCkub25lKFV0aWwuVFJBTlNJVElPTl9FTkQsIGNvbXBsZXRlKS5lbXVsYXRlVHJhbnNpdGlvbkVuZCh0cmFuc2l0aW9uRHVyYXRpb24pO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY29tcGxldGUoKTtcbiAgICAgIH1cbiAgICB9OyAvLyBTdGF0aWNcblxuXG4gICAgVG9hc3QuX2pRdWVyeUludGVyZmFjZSA9IGZ1bmN0aW9uIF9qUXVlcnlJbnRlcmZhY2UoY29uZmlnKSB7XG4gICAgICByZXR1cm4gdGhpcy5lYWNoKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyICRlbGVtZW50ID0gJCh0aGlzKTtcbiAgICAgICAgdmFyIGRhdGEgPSAkZWxlbWVudC5kYXRhKERBVEFfS0VZJGEpO1xuXG4gICAgICAgIHZhciBfY29uZmlnID0gdHlwZW9mIGNvbmZpZyA9PT0gJ29iamVjdCcgJiYgY29uZmlnO1xuXG4gICAgICAgIGlmICghZGF0YSkge1xuICAgICAgICAgIGRhdGEgPSBuZXcgVG9hc3QodGhpcywgX2NvbmZpZyk7XG4gICAgICAgICAgJGVsZW1lbnQuZGF0YShEQVRBX0tFWSRhLCBkYXRhKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh0eXBlb2YgY29uZmlnID09PSAnc3RyaW5nJykge1xuICAgICAgICAgIGlmICh0eXBlb2YgZGF0YVtjb25maWddID09PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihcIk5vIG1ldGhvZCBuYW1lZCBcXFwiXCIgKyBjb25maWcgKyBcIlxcXCJcIik7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgZGF0YVtjb25maWddKHRoaXMpO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9O1xuXG4gICAgX2NyZWF0ZUNsYXNzKFRvYXN0LCBudWxsLCBbe1xuICAgICAga2V5OiBcIlZFUlNJT05cIixcbiAgICAgIGdldDogZnVuY3Rpb24gZ2V0KCkge1xuICAgICAgICByZXR1cm4gVkVSU0lPTiRhO1xuICAgICAgfVxuICAgIH0sIHtcbiAgICAgIGtleTogXCJEZWZhdWx0VHlwZVwiLFxuICAgICAgZ2V0OiBmdW5jdGlvbiBnZXQoKSB7XG4gICAgICAgIHJldHVybiBEZWZhdWx0VHlwZSQ3O1xuICAgICAgfVxuICAgIH1dKTtcblxuICAgIHJldHVybiBUb2FzdDtcbiAgfSgpO1xuICAvKipcbiAgICogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAqIGpRdWVyeVxuICAgKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICovXG5cblxuICAkLmZuW05BTUUkYV0gPSBUb2FzdC5falF1ZXJ5SW50ZXJmYWNlO1xuICAkLmZuW05BTUUkYV0uQ29uc3RydWN0b3IgPSBUb2FzdDtcblxuICAkLmZuW05BTUUkYV0ubm9Db25mbGljdCA9IGZ1bmN0aW9uICgpIHtcbiAgICAkLmZuW05BTUUkYV0gPSBKUVVFUllfTk9fQ09ORkxJQ1QkYTtcbiAgICByZXR1cm4gVG9hc3QuX2pRdWVyeUludGVyZmFjZTtcbiAgfTtcblxuICAvKipcbiAgICogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICogQm9vdHN0cmFwICh2NC4yLjEpOiBpbmRleC5qc1xuICAgKiBMaWNlbnNlZCB1bmRlciBNSVQgKGh0dHBzOi8vZ2l0aHViLmNvbS90d2JzL2Jvb3RzdHJhcC9ibG9iL21hc3Rlci9MSUNFTlNFKVxuICAgKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgKi9cblxuICAoZnVuY3Rpb24gKCkge1xuICAgIGlmICh0eXBlb2YgJCA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ0Jvb3RzdHJhcFxcJ3MgSmF2YVNjcmlwdCByZXF1aXJlcyBqUXVlcnkuIGpRdWVyeSBtdXN0IGJlIGluY2x1ZGVkIGJlZm9yZSBCb290c3RyYXBcXCdzIEphdmFTY3JpcHQuJyk7XG4gICAgfVxuXG4gICAgdmFyIHZlcnNpb24gPSAkLmZuLmpxdWVyeS5zcGxpdCgnICcpWzBdLnNwbGl0KCcuJyk7XG4gICAgdmFyIG1pbk1ham9yID0gMTtcbiAgICB2YXIgbHRNYWpvciA9IDI7XG4gICAgdmFyIG1pbk1pbm9yID0gOTtcbiAgICB2YXIgbWluUGF0Y2ggPSAxO1xuICAgIHZhciBtYXhNYWpvciA9IDQ7XG5cbiAgICBpZiAodmVyc2lvblswXSA8IGx0TWFqb3IgJiYgdmVyc2lvblsxXSA8IG1pbk1pbm9yIHx8IHZlcnNpb25bMF0gPT09IG1pbk1ham9yICYmIHZlcnNpb25bMV0gPT09IG1pbk1pbm9yICYmIHZlcnNpb25bMl0gPCBtaW5QYXRjaCB8fCB2ZXJzaW9uWzBdID49IG1heE1ham9yKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ0Jvb3RzdHJhcFxcJ3MgSmF2YVNjcmlwdCByZXF1aXJlcyBhdCBsZWFzdCBqUXVlcnkgdjEuOS4xIGJ1dCBsZXNzIHRoYW4gdjQuMC4wJyk7XG4gICAgfVxuICB9KSgpO1xuXG4gIGV4cG9ydHMuVXRpbCA9IFV0aWw7XG4gIGV4cG9ydHMuQWxlcnQgPSBBbGVydDtcbiAgZXhwb3J0cy5CdXR0b24gPSBCdXR0b247XG4gIGV4cG9ydHMuQ2Fyb3VzZWwgPSBDYXJvdXNlbDtcbiAgZXhwb3J0cy5Db2xsYXBzZSA9IENvbGxhcHNlO1xuICBleHBvcnRzLkRyb3Bkb3duID0gRHJvcGRvd247XG4gIGV4cG9ydHMuTW9kYWwgPSBNb2RhbDtcbiAgZXhwb3J0cy5Qb3BvdmVyID0gUG9wb3ZlcjtcbiAgZXhwb3J0cy5TY3JvbGxzcHkgPSBTY3JvbGxTcHk7XG4gIGV4cG9ydHMuVGFiID0gVGFiO1xuICBleHBvcnRzLlRvYXN0ID0gVG9hc3Q7XG4gIGV4cG9ydHMuVG9vbHRpcCA9IFRvb2x0aXA7XG5cbiAgT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsICdfX2VzTW9kdWxlJywgeyB2YWx1ZTogdHJ1ZSB9KTtcblxufSkpKTtcbi8vIyBzb3VyY2VNYXBwaW5nVVJMPWJvb3RzdHJhcC5qcy5tYXBcblxuIWZ1bmN0aW9uKGUsdCl7aWYoXCJmdW5jdGlvblwiPT10eXBlb2YgZGVmaW5lJiZkZWZpbmUuYW1kKWRlZmluZShbXCJleHBvcnRzXCJdLHQpO2Vsc2UgaWYoXCJ1bmRlZmluZWRcIiE9dHlwZW9mIGV4cG9ydHMpdChleHBvcnRzKTtlbHNle3ZhciBvPXt9O3QobyksZS5ib2R5U2Nyb2xsTG9jaz1vfX0odGhpcyxmdW5jdGlvbihleHBvcnRzKXtcInVzZSBzdHJpY3RcIjtmdW5jdGlvbiByKGUpe2lmKEFycmF5LmlzQXJyYXkoZSkpe2Zvcih2YXIgdD0wLG89QXJyYXkoZS5sZW5ndGgpO3Q8ZS5sZW5ndGg7dCsrKW9bdF09ZVt0XTtyZXR1cm4gb31yZXR1cm4gQXJyYXkuZnJvbShlKX1PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cyxcIl9fZXNNb2R1bGVcIix7dmFsdWU6ITB9KTt2YXIgbD0hMTtpZihcInVuZGVmaW5lZFwiIT10eXBlb2Ygd2luZG93KXt2YXIgZT17Z2V0IHBhc3NpdmUoKXtsPSEwfX07d2luZG93LmFkZEV2ZW50TGlzdGVuZXIoXCJ0ZXN0UGFzc2l2ZVwiLG51bGwsZSksd2luZG93LnJlbW92ZUV2ZW50TGlzdGVuZXIoXCJ0ZXN0UGFzc2l2ZVwiLG51bGwsZSl9dmFyIGQ9XCJ1bmRlZmluZWRcIiE9dHlwZW9mIHdpbmRvdyYmd2luZG93Lm5hdmlnYXRvciYmd2luZG93Lm5hdmlnYXRvci5wbGF0Zm9ybSYmL2lQKGFkfGhvbmV8b2QpLy50ZXN0KHdpbmRvdy5uYXZpZ2F0b3IucGxhdGZvcm0pLGM9W10sdT0hMSxhPS0xLHM9dm9pZCAwLHY9dm9pZCAwLGY9ZnVuY3Rpb24odCl7cmV0dXJuIGMuc29tZShmdW5jdGlvbihlKXtyZXR1cm4hKCFlLm9wdGlvbnMuYWxsb3dUb3VjaE1vdmV8fCFlLm9wdGlvbnMuYWxsb3dUb3VjaE1vdmUodCkpfSl9LG09ZnVuY3Rpb24oZSl7dmFyIHQ9ZXx8d2luZG93LmV2ZW50O3JldHVybiEhZih0LnRhcmdldCl8fCgxPHQudG91Y2hlcy5sZW5ndGh8fCh0LnByZXZlbnREZWZhdWx0JiZ0LnByZXZlbnREZWZhdWx0KCksITEpKX0sbz1mdW5jdGlvbigpe3NldFRpbWVvdXQoZnVuY3Rpb24oKXt2b2lkIDAhPT12JiYoZG9jdW1lbnQuYm9keS5zdHlsZS5wYWRkaW5nUmlnaHQ9dix2PXZvaWQgMCksdm9pZCAwIT09cyYmKGRvY3VtZW50LmJvZHkuc3R5bGUub3ZlcmZsb3c9cyxzPXZvaWQgMCl9KX07ZXhwb3J0cy5kaXNhYmxlQm9keVNjcm9sbD1mdW5jdGlvbihpLGUpe2lmKGQpe2lmKCFpKXJldHVybiB2b2lkIGNvbnNvbGUuZXJyb3IoXCJkaXNhYmxlQm9keVNjcm9sbCB1bnN1Y2Nlc3NmdWwgLSB0YXJnZXRFbGVtZW50IG11c3QgYmUgcHJvdmlkZWQgd2hlbiBjYWxsaW5nIGRpc2FibGVCb2R5U2Nyb2xsIG9uIElPUyBkZXZpY2VzLlwiKTtpZihpJiYhYy5zb21lKGZ1bmN0aW9uKGUpe3JldHVybiBlLnRhcmdldEVsZW1lbnQ9PT1pfSkpe3ZhciB0PXt0YXJnZXRFbGVtZW50Omksb3B0aW9uczplfHx7fX07Yz1bXS5jb25jYXQocihjKSxbdF0pLGkub250b3VjaHN0YXJ0PWZ1bmN0aW9uKGUpezE9PT1lLnRhcmdldFRvdWNoZXMubGVuZ3RoJiYoYT1lLnRhcmdldFRvdWNoZXNbMF0uY2xpZW50WSl9LGkub250b3VjaG1vdmU9ZnVuY3Rpb24oZSl7dmFyIHQsbyxuLHI7MT09PWUudGFyZ2V0VG91Y2hlcy5sZW5ndGgmJihvPWkscj0odD1lKS50YXJnZXRUb3VjaGVzWzBdLmNsaWVudFktYSwhZih0LnRhcmdldCkmJihvJiYwPT09by5zY3JvbGxUb3AmJjA8cj9tKHQpOihuPW8pJiZuLnNjcm9sbEhlaWdodC1uLnNjcm9sbFRvcDw9bi5jbGllbnRIZWlnaHQmJnI8MD9tKHQpOnQuc3RvcFByb3BhZ2F0aW9uKCkpKX0sdXx8KGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoXCJ0b3VjaG1vdmVcIixtLGw/e3Bhc3NpdmU6ITF9OnZvaWQgMCksdT0hMCl9fWVsc2V7bj1lLHNldFRpbWVvdXQoZnVuY3Rpb24oKXtpZih2b2lkIDA9PT12KXt2YXIgZT0hIW4mJiEwPT09bi5yZXNlcnZlU2Nyb2xsQmFyR2FwLHQ9d2luZG93LmlubmVyV2lkdGgtZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LmNsaWVudFdpZHRoO2UmJjA8dCYmKHY9ZG9jdW1lbnQuYm9keS5zdHlsZS5wYWRkaW5nUmlnaHQsZG9jdW1lbnQuYm9keS5zdHlsZS5wYWRkaW5nUmlnaHQ9dCtcInB4XCIpfXZvaWQgMD09PXMmJihzPWRvY3VtZW50LmJvZHkuc3R5bGUub3ZlcmZsb3csZG9jdW1lbnQuYm9keS5zdHlsZS5vdmVyZmxvdz1cImhpZGRlblwiKX0pO3ZhciBvPXt0YXJnZXRFbGVtZW50Omksb3B0aW9uczplfHx7fX07Yz1bXS5jb25jYXQocihjKSxbb10pfXZhciBufSxleHBvcnRzLmNsZWFyQWxsQm9keVNjcm9sbExvY2tzPWZ1bmN0aW9uKCl7ZD8oYy5mb3JFYWNoKGZ1bmN0aW9uKGUpe2UudGFyZ2V0RWxlbWVudC5vbnRvdWNoc3RhcnQ9bnVsbCxlLnRhcmdldEVsZW1lbnQub250b3VjaG1vdmU9bnVsbH0pLHUmJihkb2N1bWVudC5yZW1vdmVFdmVudExpc3RlbmVyKFwidG91Y2htb3ZlXCIsbSxsP3twYXNzaXZlOiExfTp2b2lkIDApLHU9ITEpLGM9W10sYT0tMSk6KG8oKSxjPVtdKX0sZXhwb3J0cy5lbmFibGVCb2R5U2Nyb2xsPWZ1bmN0aW9uKHQpe2lmKGQpe2lmKCF0KXJldHVybiB2b2lkIGNvbnNvbGUuZXJyb3IoXCJlbmFibGVCb2R5U2Nyb2xsIHVuc3VjY2Vzc2Z1bCAtIHRhcmdldEVsZW1lbnQgbXVzdCBiZSBwcm92aWRlZCB3aGVuIGNhbGxpbmcgZW5hYmxlQm9keVNjcm9sbCBvbiBJT1MgZGV2aWNlcy5cIik7dC5vbnRvdWNoc3RhcnQ9bnVsbCx0Lm9udG91Y2htb3ZlPW51bGwsYz1jLmZpbHRlcihmdW5jdGlvbihlKXtyZXR1cm4gZS50YXJnZXRFbGVtZW50IT09dH0pLHUmJjA9PT1jLmxlbmd0aCYmKGRvY3VtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIoXCJ0b3VjaG1vdmVcIixtLGw/e3Bhc3NpdmU6ITF9OnZvaWQgMCksdT0hMSl9ZWxzZSAxPT09Yy5sZW5ndGgmJmNbMF0udGFyZ2V0RWxlbWVudD09PXQ/KG8oKSxjPVtdKTpjPWMuZmlsdGVyKGZ1bmN0aW9uKGUpe3JldHVybiBlLnRhcmdldEVsZW1lbnQhPT10fSl9fSk7XG5cbnZhciBjb29raWUgPSBmdW5jdGlvbiAoa2V5LCB2YWx1ZSwgb3B0aW9ucykge1xuXG5cdC8vIGtleSBhbmQgYXQgbGVhc3QgdmFsdWUgZ2l2ZW4sIHNldCBjb29raWUuLi5cblx0aWYgKGFyZ3VtZW50cy5sZW5ndGggPiAxICYmIFN0cmluZyh2YWx1ZSkgIT09IFwiW29iamVjdCBPYmplY3RdXCIpIHtcblx0XHRvcHRpb25zID0galF1ZXJ5LmV4dGVuZCh7fSwgb3B0aW9ucyk7XG5cblx0XHRpZiAodmFsdWUgPT09IG51bGwgfHwgdmFsdWUgPT09IHVuZGVmaW5lZCkge1xuXHRcdFx0b3B0aW9ucy5leHBpcmVzID0gLTE7XG5cdFx0fVxuXG5cdFx0aWYgKHR5cGVvZiBvcHRpb25zLmV4cGlyZXMgPT09ICdudW1iZXInKSB7XG5cdFx0XHR2YXIgZGF5cyA9IG9wdGlvbnMuZXhwaXJlcywgdCA9IG9wdGlvbnMuZXhwaXJlcyA9IG5ldyBEYXRlKCk7XG5cdFx0XHR0LnNldERhdGUodC5nZXREYXRlKCkgKyBkYXlzKTtcblx0XHR9XG5cblx0XHR2YWx1ZSA9IFN0cmluZyh2YWx1ZSk7XG5cblx0XHRyZXR1cm4gKGRvY3VtZW50LmNvb2tpZSA9IFtcblx0XHRcdGVuY29kZVVSSUNvbXBvbmVudChrZXkpLCAnPScsXG5cdFx0XHRvcHRpb25zLnJhdyA/IHZhbHVlIDogZW5jb2RlVVJJQ29tcG9uZW50KHZhbHVlKSxcblx0XHRcdG9wdGlvbnMuZXhwaXJlcyA/ICc7IGV4cGlyZXM9JyArIG9wdGlvbnMuZXhwaXJlcy50b1VUQ1N0cmluZygpIDogJycsIC8vIHVzZSBleHBpcmVzIGF0dHJpYnV0ZSwgbWF4LWFnZSBpcyBub3Qgc3VwcG9ydGVkIGJ5IElFXG5cdFx0XHQnOyBwYXRoPS8nLFxuXHRcdFx0b3B0aW9ucy5zZWN1cmUgPyAnOyBzZWN1cmUnIDogJydcblx0XHRdLmpvaW4oJycpKTtcblx0fVxuXG5cdC8vIGtleSBhbmQgcG9zc2libHkgb3B0aW9ucyBnaXZlbiwgZ2V0IGNvb2tpZS4uLlxuXHRvcHRpb25zID0gdmFsdWUgfHwge307XG5cdHZhciByZXN1bHQsIGRlY29kZSA9IG9wdGlvbnMucmF3ID8gZnVuY3Rpb24gKHMpIHsgcmV0dXJuIHM7IH0gOiBkZWNvZGVVUklDb21wb25lbnQ7XG5cdHJldHVybiAocmVzdWx0ID0gbmV3IFJlZ0V4cCgnKD86Xnw7ICknICsgZW5jb2RlVVJJQ29tcG9uZW50KGtleSkgKyAnPShbXjtdKiknKS5leGVjKGRvY3VtZW50LmNvb2tpZSkpID8gZGVjb2RlKHJlc3VsdFsxXSkgOiBudWxsO1xufTtcblxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIGZhbmN5Qm94IHYzLjUuMlxuLy9cbi8vIExpY2Vuc2VkIEdQTHYzIGZvciBvcGVuIHNvdXJjZSB1c2Vcbi8vIG9yIGZhbmN5Qm94IENvbW1lcmNpYWwgTGljZW5zZSBmb3IgY29tbWVyY2lhbCB1c2Vcbi8vXG4vLyBodHRwOi8vZmFuY3lhcHBzLmNvbS9mYW5jeWJveC9cbi8vIENvcHlyaWdodCAyMDE4IGZhbmN5QXBwc1xuLy9cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4oZnVuY3Rpb24od2luZG93LCBkb2N1bWVudCwgJCwgdW5kZWZpbmVkKSB7XG5cdFwidXNlIHN0cmljdFwiO1xuXG5cdHdpbmRvdy5jb25zb2xlID0gd2luZG93LmNvbnNvbGUgfHwge1xuXHRcdGluZm86IGZ1bmN0aW9uKHN0dWZmKSB7fVxuXHR9O1xuXG5cdC8vIElmIHRoZXJlJ3Mgbm8galF1ZXJ5LCBmYW5jeUJveCBjYW4ndCB3b3JrXG5cdC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cblx0aWYgKCEkKSB7XG5cdFx0cmV0dXJuO1xuXHR9XG5cblx0Ly8gQ2hlY2sgaWYgZmFuY3lCb3ggaXMgYWxyZWFkeSBpbml0aWFsaXplZFxuXHQvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cblx0aWYgKCQuZm4uZmFuY3lib3gpIHtcblx0XHRjb25zb2xlLmluZm8oXCJmYW5jeUJveCBhbHJlYWR5IGluaXRpYWxpemVkXCIpO1xuXG5cdFx0cmV0dXJuO1xuXHR9XG5cblx0Ly8gUHJpdmF0ZSBkZWZhdWx0IHNldHRpbmdzXG5cdC8vID09PT09PT09PT09PT09PT09PT09PT09PVxuXG5cdHZhciBkZWZhdWx0cyA9IHtcblx0XHQvLyBDbG9zZSBleGlzdGluZyBtb2RhbHNcblx0XHQvLyBTZXQgdGhpcyB0byBmYWxzZSBpZiB5b3UgZG8gbm90IG5lZWQgdG8gc3RhY2sgbXVsdGlwbGUgaW5zdGFuY2VzXG5cdFx0Y2xvc2VFeGlzdGluZzogZmFsc2UsXG5cblx0XHQvLyBFbmFibGUgaW5maW5pdGUgZ2FsbGVyeSBuYXZpZ2F0aW9uXG5cdFx0bG9vcDogZmFsc2UsXG5cblx0XHQvLyBIb3Jpem9udGFsIHNwYWNlIGJldHdlZW4gc2xpZGVzXG5cdFx0Z3V0dGVyOiA1MCxcblxuXHRcdC8vIEVuYWJsZSBrZXlib2FyZCBuYXZpZ2F0aW9uXG5cdFx0a2V5Ym9hcmQ6IHRydWUsXG5cblx0XHQvLyBTaG91bGQgYWxsb3cgY2FwdGlvbiB0byBvdmVybGFwIHRoZSBjb250ZW50XG5cdFx0cHJldmVudENhcHRpb25PdmVybGFwOiB0cnVlLFxuXG5cdFx0Ly8gU2hvdWxkIGRpc3BsYXkgbmF2aWdhdGlvbiBhcnJvd3MgYXQgdGhlIHNjcmVlbiBlZGdlc1xuXHRcdGFycm93czogdHJ1ZSxcblxuXHRcdC8vIFNob3VsZCBkaXNwbGF5IGNvdW50ZXIgYXQgdGhlIHRvcCBsZWZ0IGNvcm5lclxuXHRcdGluZm9iYXI6IHRydWUsXG5cblx0XHQvLyBTaG91bGQgZGlzcGxheSBjbG9zZSBidXR0b24gKHVzaW5nIGBidG5UcGwuc21hbGxCdG5gIHRlbXBsYXRlKSBvdmVyIHRoZSBjb250ZW50XG5cdFx0Ly8gQ2FuIGJlIHRydWUsIGZhbHNlLCBcImF1dG9cIlxuXHRcdC8vIElmIFwiYXV0b1wiIC0gd2lsbCBiZSBhdXRvbWF0aWNhbGx5IGVuYWJsZWQgZm9yIFwiaHRtbFwiLCBcImlubGluZVwiIG9yIFwiYWpheFwiIGl0ZW1zXG5cdFx0c21hbGxCdG46IFwiYXV0b1wiLFxuXG5cdFx0Ly8gU2hvdWxkIGRpc3BsYXkgdG9vbGJhciAoYnV0dG9ucyBhdCB0aGUgdG9wKVxuXHRcdC8vIENhbiBiZSB0cnVlLCBmYWxzZSwgXCJhdXRvXCJcblx0XHQvLyBJZiBcImF1dG9cIiAtIHdpbGwgYmUgYXV0b21hdGljYWxseSBoaWRkZW4gaWYgXCJzbWFsbEJ0blwiIGlzIGVuYWJsZWRcblx0XHR0b29sYmFyOiBcImF1dG9cIixcblxuXHRcdC8vIFdoYXQgYnV0dG9ucyBzaG91bGQgYXBwZWFyIGluIHRoZSB0b3AgcmlnaHQgY29ybmVyLlxuXHRcdC8vIEJ1dHRvbnMgd2lsbCBiZSBjcmVhdGVkIHVzaW5nIHRlbXBsYXRlcyBmcm9tIGBidG5UcGxgIG9wdGlvblxuXHRcdC8vIGFuZCB0aGV5IHdpbGwgYmUgcGxhY2VkIGludG8gdG9vbGJhciAoY2xhc3M9XCJmYW5jeWJveC10b29sYmFyXCJgIGVsZW1lbnQpXG5cdFx0YnV0dG9uczogW1xuXHRcdFx0XCJ6b29tXCIsXG5cdFx0XHQvL1wic2hhcmVcIixcblx0XHRcdFwic2xpZGVTaG93XCIsXG5cdFx0XHQvL1wiZnVsbFNjcmVlblwiLFxuXHRcdFx0Ly9cImRvd25sb2FkXCIsXG5cdFx0XHRcInRodW1ic1wiLFxuXHRcdFx0XCJjbG9zZVwiXG5cdFx0XSxcblxuXHRcdC8vIERldGVjdCBcImlkbGVcIiB0aW1lIGluIHNlY29uZHNcblx0XHRpZGxlVGltZTogMyxcblxuXHRcdC8vIERpc2FibGUgcmlnaHQtY2xpY2sgYW5kIHVzZSBzaW1wbGUgaW1hZ2UgcHJvdGVjdGlvbiBmb3IgaW1hZ2VzXG5cdFx0cHJvdGVjdDogZmFsc2UsXG5cblx0XHQvLyBTaG9ydGN1dCB0byBtYWtlIGNvbnRlbnQgXCJtb2RhbFwiIC0gZGlzYWJsZSBrZXlib2FyZCBuYXZpZ3Rpb24sIGhpZGUgYnV0dG9ucywgZXRjXG5cdFx0bW9kYWw6IGZhbHNlLFxuXG5cdFx0aW1hZ2U6IHtcblx0XHRcdC8vIFdhaXQgZm9yIGltYWdlcyB0byBsb2FkIGJlZm9yZSBkaXNwbGF5aW5nXG5cdFx0XHQvLyAgIHRydWUgIC0gd2FpdCBmb3IgaW1hZ2UgdG8gbG9hZCBhbmQgdGhlbiBkaXNwbGF5O1xuXHRcdFx0Ly8gICBmYWxzZSAtIGRpc3BsYXkgdGh1bWJuYWlsIGFuZCBsb2FkIHRoZSBmdWxsLXNpemVkIGltYWdlIG92ZXIgdG9wLFxuXHRcdFx0Ly8gICAgICAgICAgIHJlcXVpcmVzIHByZWRlZmluZWQgaW1hZ2UgZGltZW5zaW9ucyAoYGRhdGEtd2lkdGhgIGFuZCBgZGF0YS1oZWlnaHRgIGF0dHJpYnV0ZXMpXG5cdFx0XHRwcmVsb2FkOiBmYWxzZVxuXHRcdH0sXG5cblx0XHRhamF4OiB7XG5cdFx0XHQvLyBPYmplY3QgY29udGFpbmluZyBzZXR0aW5ncyBmb3IgYWpheCByZXF1ZXN0XG5cdFx0XHRzZXR0aW5nczoge1xuXHRcdFx0XHQvLyBUaGlzIGhlbHBzIHRvIGluZGljYXRlIHRoYXQgcmVxdWVzdCBjb21lcyBmcm9tIHRoZSBtb2RhbFxuXHRcdFx0XHQvLyBGZWVsIGZyZWUgdG8gY2hhbmdlIG5hbWluZ1xuXHRcdFx0XHRkYXRhOiB7XG5cdFx0XHRcdFx0ZmFuY3lib3g6IHRydWVcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH0sXG5cblx0XHRpZnJhbWU6IHtcblx0XHRcdC8vIElmcmFtZSB0ZW1wbGF0ZVxuXHRcdFx0dHBsOlxuXHRcdFx0XHQnPGlmcmFtZSBpZD1cImZhbmN5Ym94LWZyYW1le3JuZH1cIiBuYW1lPVwiZmFuY3lib3gtZnJhbWV7cm5kfVwiIGNsYXNzPVwiZmFuY3lib3gtaWZyYW1lXCIgYWxsb3dmdWxsc2NyZWVuIGFsbG93PVwiYXV0b3BsYXk7IGZ1bGxzY3JlZW5cIiBzcmM9XCJcIj48L2lmcmFtZT4nLFxuXG5cdFx0XHQvLyBQcmVsb2FkIGlmcmFtZSBiZWZvcmUgZGlzcGxheWluZyBpdFxuXHRcdFx0Ly8gVGhpcyBhbGxvd3MgdG8gY2FsY3VsYXRlIGlmcmFtZSBjb250ZW50IHdpZHRoIGFuZCBoZWlnaHRcblx0XHRcdC8vIChub3RlOiBEdWUgdG8gXCJTYW1lIE9yaWdpbiBQb2xpY3lcIiwgeW91IGNhbid0IGdldCBjcm9zcyBkb21haW4gZGF0YSkuXG5cdFx0XHRwcmVsb2FkOiB0cnVlLFxuXG5cdFx0XHQvLyBDdXN0b20gQ1NTIHN0eWxpbmcgZm9yIGlmcmFtZSB3cmFwcGluZyBlbGVtZW50XG5cdFx0XHQvLyBZb3UgY2FuIHVzZSB0aGlzIHRvIHNldCBjdXN0b20gaWZyYW1lIGRpbWVuc2lvbnNcblx0XHRcdGNzczoge30sXG5cblx0XHRcdC8vIElmcmFtZSB0YWcgYXR0cmlidXRlc1xuXHRcdFx0YXR0cjoge1xuXHRcdFx0XHRzY3JvbGxpbmc6IFwiYXV0b1wiXG5cdFx0XHR9XG5cdFx0fSxcblxuXHRcdC8vIEZvciBIVE1MNSB2aWRlbyBvbmx5XG5cdFx0dmlkZW86IHtcblx0XHRcdHRwbDpcblx0XHRcdFx0Jzx2aWRlbyBjbGFzcz1cImZhbmN5Ym94LXZpZGVvXCIgY29udHJvbHMgY29udHJvbHNMaXN0PVwibm9kb3dubG9hZFwiIHBvc3Rlcj1cInt7cG9zdGVyfX1cIj4nICtcblx0XHRcdFx0Jzxzb3VyY2Ugc3JjPVwie3tzcmN9fVwiIHR5cGU9XCJ7e2Zvcm1hdH19XCIgLz4nICtcblx0XHRcdFx0J1NvcnJ5LCB5b3VyIGJyb3dzZXIgZG9lc25cXCd0IHN1cHBvcnQgZW1iZWRkZWQgdmlkZW9zLCA8YSBocmVmPVwie3tzcmN9fVwiPmRvd25sb2FkPC9hPiBhbmQgd2F0Y2ggd2l0aCB5b3VyIGZhdm9yaXRlIHZpZGVvIHBsYXllciEnICtcblx0XHRcdFx0XCI8L3ZpZGVvPlwiLFxuXHRcdFx0Zm9ybWF0OiBcIlwiLCAvLyBjdXN0b20gdmlkZW8gZm9ybWF0XG5cdFx0XHRhdXRvU3RhcnQ6IHRydWVcblx0XHR9LFxuXG5cdFx0Ly8gRGVmYXVsdCBjb250ZW50IHR5cGUgaWYgY2Fubm90IGJlIGRldGVjdGVkIGF1dG9tYXRpY2FsbHlcblx0XHRkZWZhdWx0VHlwZTogXCJpbWFnZVwiLFxuXG5cdFx0Ly8gT3Blbi9jbG9zZSBhbmltYXRpb24gdHlwZVxuXHRcdC8vIFBvc3NpYmxlIHZhbHVlczpcblx0XHQvLyAgIGZhbHNlICAgICAgICAgICAgLSBkaXNhYmxlXG5cdFx0Ly8gICBcInpvb21cIiAgICAgICAgICAgLSB6b29tIGltYWdlcyBmcm9tL3RvIHRodW1ibmFpbFxuXHRcdC8vICAgXCJmYWRlXCJcblx0XHQvLyAgIFwiem9vbS1pbi1vdXRcIlxuXHRcdC8vXG5cdFx0YW5pbWF0aW9uRWZmZWN0OiBcInpvb21cIixcblxuXHRcdC8vIER1cmF0aW9uIGluIG1zIGZvciBvcGVuL2Nsb3NlIGFuaW1hdGlvblxuXHRcdGFuaW1hdGlvbkR1cmF0aW9uOiAzNjYsXG5cblx0XHQvLyBTaG91bGQgaW1hZ2UgY2hhbmdlIG9wYWNpdHkgd2hpbGUgem9vbWluZ1xuXHRcdC8vIElmIG9wYWNpdHkgaXMgXCJhdXRvXCIsIHRoZW4gb3BhY2l0eSB3aWxsIGJlIGNoYW5nZWQgaWYgaW1hZ2UgYW5kIHRodW1ibmFpbCBoYXZlIGRpZmZlcmVudCBhc3BlY3QgcmF0aW9zXG5cdFx0em9vbU9wYWNpdHk6IFwiYXV0b1wiLFxuXG5cdFx0Ly8gVHJhbnNpdGlvbiBlZmZlY3QgYmV0d2VlbiBzbGlkZXNcblx0XHQvL1xuXHRcdC8vIFBvc3NpYmxlIHZhbHVlczpcblx0XHQvLyAgIGZhbHNlICAgICAgICAgICAgLSBkaXNhYmxlXG5cdFx0Ly8gICBcImZhZGUnXG5cdFx0Ly8gICBcInNsaWRlJ1xuXHRcdC8vICAgXCJjaXJjdWxhcidcblx0XHQvLyAgIFwidHViZSdcblx0XHQvLyAgIFwiem9vbS1pbi1vdXQnXG5cdFx0Ly8gICBcInJvdGF0ZSdcblx0XHQvL1xuXHRcdHRyYW5zaXRpb25FZmZlY3Q6IFwiZmFkZVwiLFxuXG5cdFx0Ly8gRHVyYXRpb24gaW4gbXMgZm9yIHRyYW5zaXRpb24gYW5pbWF0aW9uXG5cdFx0dHJhbnNpdGlvbkR1cmF0aW9uOiAzNjYsXG5cblx0XHQvLyBDdXN0b20gQ1NTIGNsYXNzIGZvciBzbGlkZSBlbGVtZW50XG5cdFx0c2xpZGVDbGFzczogXCJcIixcblxuXHRcdC8vIEN1c3RvbSBDU1MgY2xhc3MgZm9yIGxheW91dFxuXHRcdGJhc2VDbGFzczogXCJcIixcblxuXHRcdC8vIEJhc2UgdGVtcGxhdGUgZm9yIGxheW91dFxuXHRcdGJhc2VUcGw6XG5cdFx0XHQnPGRpdiBjbGFzcz1cImZhbmN5Ym94LWNvbnRhaW5lclwiIHJvbGU9XCJkaWFsb2dcIiB0YWJpbmRleD1cIi0xXCI+JyArXG5cdFx0XHQnPGRpdiBjbGFzcz1cImZhbmN5Ym94LWJnXCI+PC9kaXY+JyArXG5cdFx0XHQnPGRpdiBjbGFzcz1cImZhbmN5Ym94LWlubmVyXCI+JyArXG5cdFx0XHQnPGRpdiBjbGFzcz1cImZhbmN5Ym94LWluZm9iYXJcIj48c3BhbiBkYXRhLWZhbmN5Ym94LWluZGV4Pjwvc3Bhbj4mbmJzcDsvJm5ic3A7PHNwYW4gZGF0YS1mYW5jeWJveC1jb3VudD48L3NwYW4+PC9kaXY+JyArXG5cdFx0XHQnPGRpdiBjbGFzcz1cImZhbmN5Ym94LXRvb2xiYXJcIj57e2J1dHRvbnN9fTwvZGl2PicgK1xuXHRcdFx0JzxkaXYgY2xhc3M9XCJmYW5jeWJveC1uYXZpZ2F0aW9uXCI+e3thcnJvd3N9fTwvZGl2PicgK1xuXHRcdFx0JzxkaXYgY2xhc3M9XCJmYW5jeWJveC1zdGFnZVwiPjwvZGl2PicgK1xuXHRcdFx0JzxkaXYgY2xhc3M9XCJmYW5jeWJveC1jYXB0aW9uXCI+PC9kaXY+JyArXG5cdFx0XHRcIjwvZGl2PlwiICtcblx0XHRcdFwiPC9kaXY+XCIsXG5cblx0XHQvLyBMb2FkaW5nIGluZGljYXRvciB0ZW1wbGF0ZVxuXHRcdHNwaW5uZXJUcGw6ICc8ZGl2IGNsYXNzPVwiZmFuY3lib3gtbG9hZGluZ1wiPjwvZGl2PicsXG5cblx0XHQvLyBFcnJvciBtZXNzYWdlIHRlbXBsYXRlXG5cdFx0ZXJyb3JUcGw6ICc8ZGl2IGNsYXNzPVwiZmFuY3lib3gtZXJyb3JcIj48cD57e0VSUk9SfX08L3A+PC9kaXY+JyxcblxuXHRcdGJ0blRwbDoge1xuXHRcdFx0ZG93bmxvYWQ6XG5cdFx0XHRcdCc8YSBkb3dubG9hZCBkYXRhLWZhbmN5Ym94LWRvd25sb2FkIGNsYXNzPVwiZmFuY3lib3gtYnV0dG9uIGZhbmN5Ym94LWJ1dHRvbi0tZG93bmxvYWRcIiB0aXRsZT1cInt7RE9XTkxPQUR9fVwiIGhyZWY9XCJqYXZhc2NyaXB0OjtcIj4nICtcblx0XHRcdFx0JzxzdmcgeG1sbnM9XCJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2Z1wiIHZpZXdCb3g9XCIwIDAgMjQgMjRcIj48cGF0aCBkPVwiTTE4LjYyIDE3LjA5VjE5SDUuMzh2LTEuOTF6bS0yLjk3LTYuOTZMMTcgMTEuNDVsLTUgNC44Ny01LTQuODcgMS4zNi0xLjMyIDIuNjggMi42NFY1aDEuOTJ2Ny43N3pcIi8+PC9zdmc+JyArXG5cdFx0XHRcdFwiPC9hPlwiLFxuXG5cdFx0XHR6b29tOlxuXHRcdFx0XHQnPGJ1dHRvbiBkYXRhLWZhbmN5Ym94LXpvb20gY2xhc3M9XCJmYW5jeWJveC1idXR0b24gZmFuY3lib3gtYnV0dG9uLS16b29tXCIgdGl0bGU9XCJ7e1pPT019fVwiPicgK1xuXHRcdFx0XHQnPHN2ZyB4bWxucz1cImh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnXCIgdmlld0JveD1cIjAgMCAyNCAyNFwiPjxwYXRoIGQ9XCJNMTguNyAxNy4zbC0zLTNhNS45IDUuOSAwIDAgMC0uNi03LjYgNS45IDUuOSAwIDAgMC04LjQgMCA1LjkgNS45IDAgMCAwIDAgOC40IDUuOSA1LjkgMCAwIDAgNy43LjdsMyAzYTEgMSAwIDAgMCAxLjMgMGMuNC0uNS40LTEgMC0xLjV6TTguMSAxMy44YTQgNCAwIDAgMSAwLTUuNyA0IDQgMCAwIDEgNS43IDAgNCA0IDAgMCAxIDAgNS43IDQgNCAwIDAgMS01LjcgMHpcIi8+PC9zdmc+JyArXG5cdFx0XHRcdFwiPC9idXR0b24+XCIsXG5cblx0XHRcdGNsb3NlOlxuXHRcdFx0XHQnPGJ1dHRvbiBkYXRhLWZhbmN5Ym94LWNsb3NlIGNsYXNzPVwiZmFuY3lib3gtYnV0dG9uIGZhbmN5Ym94LWJ1dHRvbi0tY2xvc2VcIiB0aXRsZT1cInt7Q0xPU0V9fVwiPicgK1xuXHRcdFx0XHQnPHN2ZyB4bWxucz1cImh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnXCIgdmlld0JveD1cIjAgMCAyNCAyNFwiPjxwYXRoIGQ9XCJNMTIgMTAuNkw2LjYgNS4yIDUuMiA2LjZsNS40IDUuNC01LjQgNS40IDEuNCAxLjQgNS40LTUuNCA1LjQgNS40IDEuNC0xLjQtNS40LTUuNCA1LjQtNS40LTEuNC0xLjQtNS40IDUuNHpcIi8+PC9zdmc+JyArXG5cdFx0XHRcdFwiPC9idXR0b24+XCIsXG5cblx0XHRcdC8vIEFycm93c1xuXHRcdFx0YXJyb3dMZWZ0OlxuXHRcdFx0XHQnPGJ1dHRvbiBkYXRhLWZhbmN5Ym94LXByZXYgY2xhc3M9XCJmYW5jeWJveC1idXR0b24gZmFuY3lib3gtYnV0dG9uLS1hcnJvd19sZWZ0XCIgdGl0bGU9XCJ7e1BSRVZ9fVwiPicgK1xuXHRcdFx0XHQnPGRpdj48c3ZnIHhtbG5zPVwiaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmdcIiB2aWV3Qm94PVwiMCAwIDI0IDI0XCI+PHBhdGggZD1cIk0xMS4yOCAxNS43bC0xLjM0IDEuMzdMNSAxMmw0Ljk0LTUuMDcgMS4zNCAxLjM4LTIuNjggMi43MkgxOXYxLjk0SDguNnpcIi8+PC9zdmc+PC9kaXY+JyArXG5cdFx0XHRcdFwiPC9idXR0b24+XCIsXG5cblx0XHRcdGFycm93UmlnaHQ6XG5cdFx0XHRcdCc8YnV0dG9uIGRhdGEtZmFuY3lib3gtbmV4dCBjbGFzcz1cImZhbmN5Ym94LWJ1dHRvbiBmYW5jeWJveC1idXR0b24tLWFycm93X3JpZ2h0XCIgdGl0bGU9XCJ7e05FWFR9fVwiPicgK1xuXHRcdFx0XHQnPGRpdj48c3ZnIHhtbG5zPVwiaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmdcIiB2aWV3Qm94PVwiMCAwIDI0IDI0XCI+PHBhdGggZD1cIk0xNS40IDEyLjk3bC0yLjY4IDIuNzIgMS4zNCAxLjM4TDE5IDEybC00Ljk0LTUuMDctMS4zNCAxLjM4IDIuNjggMi43Mkg1djEuOTR6XCIvPjwvc3ZnPjwvZGl2PicgK1xuXHRcdFx0XHRcIjwvYnV0dG9uPlwiLFxuXG5cdFx0XHQvLyBUaGlzIHNtYWxsIGNsb3NlIGJ1dHRvbiB3aWxsIGJlIGFwcGVuZGVkIHRvIHlvdXIgaHRtbC9pbmxpbmUvYWpheCBjb250ZW50IGJ5IGRlZmF1bHQsXG5cdFx0XHQvLyBpZiBcInNtYWxsQnRuXCIgb3B0aW9uIGlzIG5vdCBzZXQgdG8gZmFsc2Vcblx0XHRcdHNtYWxsQnRuOlxuXHRcdFx0XHQnPGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgZGF0YS1mYW5jeWJveC1jbG9zZSBjbGFzcz1cImZhbmN5Ym94LWJ1dHRvbiBmYW5jeWJveC1jbG9zZS1zbWFsbFwiIHRpdGxlPVwie3tDTE9TRX19XCI+JyArXG5cdFx0XHRcdCc8c3ZnIHhtbG5zPVwiaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmdcIiB2ZXJzaW9uPVwiMVwiIHZpZXdCb3g9XCIwIDAgMjQgMjRcIj48cGF0aCBkPVwiTTEzIDEybDUtNS0xLTEtNSA1LTUtNS0xIDEgNSA1LTUgNSAxIDEgNS01IDUgNSAxLTF6XCIvPjwvc3ZnPicgK1xuXHRcdFx0XHRcIjwvYnV0dG9uPlwiXG5cdFx0fSxcblxuXHRcdC8vIENvbnRhaW5lciBpcyBpbmplY3RlZCBpbnRvIHRoaXMgZWxlbWVudFxuXHRcdHBhcmVudEVsOiBcImJvZHlcIixcblxuXHRcdC8vIEhpZGUgYnJvd3NlciB2ZXJ0aWNhbCBzY3JvbGxiYXJzOyB1c2UgYXQgeW91ciBvd24gcmlza1xuXHRcdGhpZGVTY3JvbGxiYXI6IHRydWUsXG5cblx0XHQvLyBGb2N1cyBoYW5kbGluZ1xuXHRcdC8vID09PT09PT09PT09PT09XG5cblx0XHQvLyBUcnkgdG8gZm9jdXMgb24gdGhlIGZpcnN0IGZvY3VzYWJsZSBlbGVtZW50IGFmdGVyIG9wZW5pbmdcblx0XHRhdXRvRm9jdXM6IHRydWUsXG5cblx0XHQvLyBQdXQgZm9jdXMgYmFjayB0byBhY3RpdmUgZWxlbWVudCBhZnRlciBjbG9zaW5nXG5cdFx0YmFja0ZvY3VzOiB0cnVlLFxuXG5cdFx0Ly8gRG8gbm90IGxldCB1c2VyIHRvIGZvY3VzIG9uIGVsZW1lbnQgb3V0c2lkZSBtb2RhbCBjb250ZW50XG5cdFx0dHJhcEZvY3VzOiB0cnVlLFxuXG5cdFx0Ly8gTW9kdWxlIHNwZWNpZmljIG9wdGlvbnNcblx0XHQvLyA9PT09PT09PT09PT09PT09PT09PT09PVxuXG5cdFx0ZnVsbFNjcmVlbjoge1xuXHRcdFx0YXV0b1N0YXJ0OiBmYWxzZVxuXHRcdH0sXG5cblx0XHQvLyBTZXQgYHRvdWNoOiBmYWxzZWAgdG8gZGlzYWJsZSBwYW5uaW5nL3N3aXBpbmdcblx0XHR0b3VjaDoge1xuXHRcdFx0dmVydGljYWw6IHRydWUsIC8vIEFsbG93IHRvIGRyYWcgY29udGVudCB2ZXJ0aWNhbGx5XG5cdFx0XHRtb21lbnR1bTogdHJ1ZSAvLyBDb250aW51ZSBtb3ZlbWVudCBhZnRlciByZWxlYXNpbmcgbW91c2UvdG91Y2ggd2hlbiBwYW5uaW5nXG5cdFx0fSxcblxuXHRcdC8vIEhhc2ggdmFsdWUgd2hlbiBpbml0aWFsaXppbmcgbWFudWFsbHksXG5cdFx0Ly8gc2V0IGBmYWxzZWAgdG8gZGlzYWJsZSBoYXNoIGNoYW5nZVxuXHRcdGhhc2g6IG51bGwsXG5cblx0XHQvLyBDdXN0b21pemUgb3IgYWRkIG5ldyBtZWRpYSB0eXBlc1xuXHRcdC8vIEV4YW1wbGU6XG5cdFx0LypcbiAgICAgIG1lZGlhIDoge1xuICAgICAgICB5b3V0dWJlIDoge1xuICAgICAgICAgIHBhcmFtcyA6IHtcbiAgICAgICAgICAgIGF1dG9wbGF5IDogMFxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgICovXG5cdFx0bWVkaWE6IHt9LFxuXG5cdFx0c2xpZGVTaG93OiB7XG5cdFx0XHRhdXRvU3RhcnQ6IGZhbHNlLFxuXHRcdFx0c3BlZWQ6IDMwMDBcblx0XHR9LFxuXG5cdFx0dGh1bWJzOiB7XG5cdFx0XHRhdXRvU3RhcnQ6IGZhbHNlLCAvLyBEaXNwbGF5IHRodW1ibmFpbHMgb24gb3BlbmluZ1xuXHRcdFx0aGlkZU9uQ2xvc2U6IHRydWUsIC8vIEhpZGUgdGh1bWJuYWlsIGdyaWQgd2hlbiBjbG9zaW5nIGFuaW1hdGlvbiBzdGFydHNcblx0XHRcdHBhcmVudEVsOiBcIi5mYW5jeWJveC1jb250YWluZXJcIiwgLy8gQ29udGFpbmVyIGlzIGluamVjdGVkIGludG8gdGhpcyBlbGVtZW50XG5cdFx0XHRheGlzOiBcInlcIiAvLyBWZXJ0aWNhbCAoeSkgb3IgaG9yaXpvbnRhbCAoeCkgc2Nyb2xsaW5nXG5cdFx0fSxcblxuXHRcdC8vIFVzZSBtb3VzZXdoZWVsIHRvIG5hdmlnYXRlIGdhbGxlcnlcblx0XHQvLyBJZiAnYXV0bycgLSBlbmFibGVkIGZvciBpbWFnZXMgb25seVxuXHRcdHdoZWVsOiBcImF1dG9cIixcblxuXHRcdC8vIENhbGxiYWNrc1xuXHRcdC8vPT09PT09PT09PVxuXG5cdFx0Ly8gU2VlIERvY3VtZW50YXRpb24vQVBJL0V2ZW50cyBmb3IgbW9yZSBpbmZvcm1hdGlvblxuXHRcdC8vIEV4YW1wbGU6XG5cdFx0LypcbiAgICAgIGFmdGVyU2hvdzogZnVuY3Rpb24oIGluc3RhbmNlLCBjdXJyZW50ICkge1xuICAgICAgICBjb25zb2xlLmluZm8oICdDbGlja2VkIGVsZW1lbnQ6JyApO1xuICAgICAgICBjb25zb2xlLmluZm8oIGN1cnJlbnQub3B0cy4kb3JpZyApO1xuICAgICAgfVxuICAgICovXG5cblx0XHRvbkluaXQ6ICQubm9vcCwgLy8gV2hlbiBpbnN0YW5jZSBoYXMgYmVlbiBpbml0aWFsaXplZFxuXG5cdFx0YmVmb3JlTG9hZDogJC5ub29wLCAvLyBCZWZvcmUgdGhlIGNvbnRlbnQgb2YgYSBzbGlkZSBpcyBiZWluZyBsb2FkZWRcblx0XHRhZnRlckxvYWQ6ICQubm9vcCwgLy8gV2hlbiB0aGUgY29udGVudCBvZiBhIHNsaWRlIGlzIGRvbmUgbG9hZGluZ1xuXG5cdFx0YmVmb3JlU2hvdzogJC5ub29wLCAvLyBCZWZvcmUgb3BlbiBhbmltYXRpb24gc3RhcnRzXG5cdFx0YWZ0ZXJTaG93OiAkLm5vb3AsIC8vIFdoZW4gY29udGVudCBpcyBkb25lIGxvYWRpbmcgYW5kIGFuaW1hdGluZ1xuXG5cdFx0YmVmb3JlQ2xvc2U6ICQubm9vcCwgLy8gQmVmb3JlIHRoZSBpbnN0YW5jZSBhdHRlbXB0cyB0byBjbG9zZS4gUmV0dXJuIGZhbHNlIHRvIGNhbmNlbCB0aGUgY2xvc2UuXG5cdFx0YWZ0ZXJDbG9zZTogJC5ub29wLCAvLyBBZnRlciBpbnN0YW5jZSBoYXMgYmVlbiBjbG9zZWRcblxuXHRcdG9uQWN0aXZhdGU6ICQubm9vcCwgLy8gV2hlbiBpbnN0YW5jZSBpcyBicm91Z2h0IHRvIGZyb250XG5cdFx0b25EZWFjdGl2YXRlOiAkLm5vb3AsIC8vIFdoZW4gb3RoZXIgaW5zdGFuY2UgaGFzIGJlZW4gYWN0aXZhdGVkXG5cblx0XHQvLyBJbnRlcmFjdGlvblxuXHRcdC8vID09PT09PT09PT09XG5cblx0XHQvLyBVc2Ugb3B0aW9ucyBiZWxvdyB0byBjdXN0b21pemUgdGFrZW4gYWN0aW9uIHdoZW4gdXNlciBjbGlja3Mgb3IgZG91YmxlIGNsaWNrcyBvbiB0aGUgZmFuY3lCb3ggYXJlYSxcblx0XHQvLyBlYWNoIG9wdGlvbiBjYW4gYmUgc3RyaW5nIG9yIG1ldGhvZCB0aGF0IHJldHVybnMgdmFsdWUuXG5cdFx0Ly9cblx0XHQvLyBQb3NzaWJsZSB2YWx1ZXM6XG5cdFx0Ly8gICBcImNsb3NlXCIgICAgICAgICAgIC0gY2xvc2UgaW5zdGFuY2Vcblx0XHQvLyAgIFwibmV4dFwiICAgICAgICAgICAgLSBtb3ZlIHRvIG5leHQgZ2FsbGVyeSBpdGVtXG5cdFx0Ly8gICBcIm5leHRPckNsb3NlXCIgICAgIC0gbW92ZSB0byBuZXh0IGdhbGxlcnkgaXRlbSBvciBjbG9zZSBpZiBnYWxsZXJ5IGhhcyBvbmx5IG9uZSBpdGVtXG5cdFx0Ly8gICBcInRvZ2dsZUNvbnRyb2xzXCIgIC0gc2hvdy9oaWRlIGNvbnRyb2xzXG5cdFx0Ly8gICBcInpvb21cIiAgICAgICAgICAgIC0gem9vbSBpbWFnZSAoaWYgbG9hZGVkKVxuXHRcdC8vICAgZmFsc2UgICAgICAgICAgICAgLSBkbyBub3RoaW5nXG5cblx0XHQvLyBDbGlja2VkIG9uIHRoZSBjb250ZW50XG5cdFx0Y2xpY2tDb250ZW50OiBmdW5jdGlvbihjdXJyZW50LCBldmVudCkge1xuXHRcdFx0cmV0dXJuIGN1cnJlbnQudHlwZSA9PT0gXCJpbWFnZVwiID8gXCJ6b29tXCIgOiBmYWxzZTtcblx0XHR9LFxuXG5cdFx0Ly8gQ2xpY2tlZCBvbiB0aGUgc2xpZGVcblx0XHRjbGlja1NsaWRlOiBcImNsb3NlXCIsXG5cblx0XHQvLyBDbGlja2VkIG9uIHRoZSBiYWNrZ3JvdW5kIChiYWNrZHJvcCkgZWxlbWVudDtcblx0XHQvLyBpZiB5b3UgaGF2ZSBub3QgY2hhbmdlZCB0aGUgbGF5b3V0LCB0aGVuIG1vc3QgbGlrZWx5IHlvdSBuZWVkIHRvIHVzZSBgY2xpY2tTbGlkZWAgb3B0aW9uXG5cdFx0Y2xpY2tPdXRzaWRlOiBcImNsb3NlXCIsXG5cblx0XHQvLyBTYW1lIGFzIHByZXZpb3VzIHR3bywgYnV0IGZvciBkb3VibGUgY2xpY2tcblx0XHRkYmxjbGlja0NvbnRlbnQ6IGZhbHNlLFxuXHRcdGRibGNsaWNrU2xpZGU6IGZhbHNlLFxuXHRcdGRibGNsaWNrT3V0c2lkZTogZmFsc2UsXG5cblx0XHQvLyBDdXN0b20gb3B0aW9ucyB3aGVuIG1vYmlsZSBkZXZpY2UgaXMgZGV0ZWN0ZWRcblx0XHQvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuXHRcdG1vYmlsZToge1xuXHRcdFx0cHJldmVudENhcHRpb25PdmVybGFwOiBmYWxzZSxcblx0XHRcdGlkbGVUaW1lOiBmYWxzZSxcblx0XHRcdGNsaWNrQ29udGVudDogZnVuY3Rpb24oY3VycmVudCwgZXZlbnQpIHtcblx0XHRcdFx0cmV0dXJuIGN1cnJlbnQudHlwZSA9PT0gXCJpbWFnZVwiID8gXCJ0b2dnbGVDb250cm9sc1wiIDogZmFsc2U7XG5cdFx0XHR9LFxuXHRcdFx0Y2xpY2tTbGlkZTogZnVuY3Rpb24oY3VycmVudCwgZXZlbnQpIHtcblx0XHRcdFx0cmV0dXJuIGN1cnJlbnQudHlwZSA9PT0gXCJpbWFnZVwiID8gXCJ0b2dnbGVDb250cm9sc1wiIDogXCJjbG9zZVwiO1xuXHRcdFx0fSxcblx0XHRcdGRibGNsaWNrQ29udGVudDogZnVuY3Rpb24oY3VycmVudCwgZXZlbnQpIHtcblx0XHRcdFx0cmV0dXJuIGN1cnJlbnQudHlwZSA9PT0gXCJpbWFnZVwiID8gXCJ6b29tXCIgOiBmYWxzZTtcblx0XHRcdH0sXG5cdFx0XHRkYmxjbGlja1NsaWRlOiBmdW5jdGlvbihjdXJyZW50LCBldmVudCkge1xuXHRcdFx0XHRyZXR1cm4gY3VycmVudC50eXBlID09PSBcImltYWdlXCIgPyBcInpvb21cIiA6IGZhbHNlO1xuXHRcdFx0fVxuXHRcdH0sXG5cblx0XHQvLyBJbnRlcm5hdGlvbmFsaXphdGlvblxuXHRcdC8vID09PT09PT09PT09PT09PT09PT09XG5cblx0XHRsYW5nOiBcImVuXCIsXG5cdFx0aTE4bjoge1xuXHRcdFx0ZW46IHtcblx0XHRcdFx0Q0xPU0U6IFwiQ2xvc2VcIixcblx0XHRcdFx0TkVYVDogXCJOZXh0XCIsXG5cdFx0XHRcdFBSRVY6IFwiUHJldmlvdXNcIixcblx0XHRcdFx0RVJST1I6IFwiVGhlIHJlcXVlc3RlZCBjb250ZW50IGNhbm5vdCBiZSBsb2FkZWQuIDxici8+IFBsZWFzZSB0cnkgYWdhaW4gbGF0ZXIuXCIsXG5cdFx0XHRcdFBMQVlfU1RBUlQ6IFwiU3RhcnQgc2xpZGVzaG93XCIsXG5cdFx0XHRcdFBMQVlfU1RPUDogXCJQYXVzZSBzbGlkZXNob3dcIixcblx0XHRcdFx0RlVMTF9TQ1JFRU46IFwiRnVsbCBzY3JlZW5cIixcblx0XHRcdFx0VEhVTUJTOiBcIlRodW1ibmFpbHNcIixcblx0XHRcdFx0RE9XTkxPQUQ6IFwiRG93bmxvYWRcIixcblx0XHRcdFx0U0hBUkU6IFwiU2hhcmVcIixcblx0XHRcdFx0Wk9PTTogXCJab29tXCJcblx0XHRcdH0sXG5cdFx0XHRkZToge1xuXHRcdFx0XHRDTE9TRTogXCJTY2hsaWVzc2VuXCIsXG5cdFx0XHRcdE5FWFQ6IFwiV2VpdGVyXCIsXG5cdFx0XHRcdFBSRVY6IFwiWnVyw7xja1wiLFxuXHRcdFx0XHRFUlJPUjogXCJEaWUgYW5nZWZvcmRlcnRlbiBEYXRlbiBrb25udGVuIG5pY2h0IGdlbGFkZW4gd2VyZGVuLiA8YnIvPiBCaXR0ZSB2ZXJzdWNoZW4gU2llIGVzIHNww6R0ZXIgbm9jaG1hbC5cIixcblx0XHRcdFx0UExBWV9TVEFSVDogXCJEaWFzY2hhdSBzdGFydGVuXCIsXG5cdFx0XHRcdFBMQVlfU1RPUDogXCJEaWFzY2hhdSBiZWVuZGVuXCIsXG5cdFx0XHRcdEZVTExfU0NSRUVOOiBcIlZvbGxiaWxkXCIsXG5cdFx0XHRcdFRIVU1CUzogXCJWb3JzY2hhdWJpbGRlclwiLFxuXHRcdFx0XHRET1dOTE9BRDogXCJIZXJ1bnRlcmxhZGVuXCIsXG5cdFx0XHRcdFNIQVJFOiBcIlRlaWxlblwiLFxuXHRcdFx0XHRaT09NOiBcIk1hw59zdGFiXCJcblx0XHRcdH1cblx0XHR9XG5cdH07XG5cblx0Ly8gRmV3IHVzZWZ1bCB2YXJpYWJsZXMgYW5kIG1ldGhvZHNcblx0Ly8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuXHR2YXIgJFcgPSAkKHdpbmRvdyk7XG5cdHZhciAkRCA9ICQoZG9jdW1lbnQpO1xuXG5cdHZhciBjYWxsZWQgPSAwO1xuXG5cdC8vIENoZWNrIGlmIGFuIG9iamVjdCBpcyBhIGpRdWVyeSBvYmplY3QgYW5kIG5vdCBhIG5hdGl2ZSBKYXZhU2NyaXB0IG9iamVjdFxuXHQvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblx0dmFyIGlzUXVlcnkgPSBmdW5jdGlvbihvYmopIHtcblx0XHRyZXR1cm4gb2JqICYmIG9iai5oYXNPd25Qcm9wZXJ0eSAmJiBvYmogaW5zdGFuY2VvZiAkO1xuXHR9O1xuXG5cdC8vIEhhbmRsZSBtdWx0aXBsZSBicm93c2VycyBmb3IgXCJyZXF1ZXN0QW5pbWF0aW9uRnJhbWVcIiBhbmQgXCJjYW5jZWxBbmltYXRpb25GcmFtZVwiXG5cdC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblx0dmFyIHJlcXVlc3RBRnJhbWUgPSAoZnVuY3Rpb24oKSB7XG5cdFx0cmV0dXJuIChcblx0XHRcdHdpbmRvdy5yZXF1ZXN0QW5pbWF0aW9uRnJhbWUgfHxcblx0XHRcdHdpbmRvdy53ZWJraXRSZXF1ZXN0QW5pbWF0aW9uRnJhbWUgfHxcblx0XHRcdHdpbmRvdy5tb3pSZXF1ZXN0QW5pbWF0aW9uRnJhbWUgfHxcblx0XHRcdHdpbmRvdy5vUmVxdWVzdEFuaW1hdGlvbkZyYW1lIHx8XG5cdFx0XHQvLyBpZiBhbGwgZWxzZSBmYWlscywgdXNlIHNldFRpbWVvdXRcblx0XHRcdGZ1bmN0aW9uKGNhbGxiYWNrKSB7XG5cdFx0XHRcdHJldHVybiB3aW5kb3cuc2V0VGltZW91dChjYWxsYmFjaywgMTAwMCAvIDYwKTtcblx0XHRcdH1cblx0XHQpO1xuXHR9KSgpO1xuXG5cdHZhciBjYW5jZWxBRnJhbWUgPSAoZnVuY3Rpb24oKSB7XG5cdFx0cmV0dXJuIChcblx0XHRcdHdpbmRvdy5jYW5jZWxBbmltYXRpb25GcmFtZSB8fFxuXHRcdFx0d2luZG93LndlYmtpdENhbmNlbEFuaW1hdGlvbkZyYW1lIHx8XG5cdFx0XHR3aW5kb3cubW96Q2FuY2VsQW5pbWF0aW9uRnJhbWUgfHxcblx0XHRcdHdpbmRvdy5vQ2FuY2VsQW5pbWF0aW9uRnJhbWUgfHxcblx0XHRcdGZ1bmN0aW9uKGlkKSB7XG5cdFx0XHRcdHdpbmRvdy5jbGVhclRpbWVvdXQoaWQpO1xuXHRcdFx0fVxuXHRcdCk7XG5cdH0pKCk7XG5cblx0Ly8gRGV0ZWN0IHRoZSBzdXBwb3J0ZWQgdHJhbnNpdGlvbi1lbmQgZXZlbnQgcHJvcGVydHkgbmFtZVxuXHQvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cdHZhciB0cmFuc2l0aW9uRW5kID0gKGZ1bmN0aW9uKCkge1xuXHRcdHZhciBlbCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJmYWtlZWxlbWVudFwiKSxcblx0XHRcdHQ7XG5cblx0XHR2YXIgdHJhbnNpdGlvbnMgPSB7XG5cdFx0XHR0cmFuc2l0aW9uOiBcInRyYW5zaXRpb25lbmRcIixcblx0XHRcdE9UcmFuc2l0aW9uOiBcIm9UcmFuc2l0aW9uRW5kXCIsXG5cdFx0XHRNb3pUcmFuc2l0aW9uOiBcInRyYW5zaXRpb25lbmRcIixcblx0XHRcdFdlYmtpdFRyYW5zaXRpb246IFwid2Via2l0VHJhbnNpdGlvbkVuZFwiXG5cdFx0fTtcblxuXHRcdGZvciAodCBpbiB0cmFuc2l0aW9ucykge1xuXHRcdFx0aWYgKGVsLnN0eWxlW3RdICE9PSB1bmRlZmluZWQpIHtcblx0XHRcdFx0cmV0dXJuIHRyYW5zaXRpb25zW3RdO1xuXHRcdFx0fVxuXHRcdH1cblxuXHRcdHJldHVybiBcInRyYW5zaXRpb25lbmRcIjtcblx0fSkoKTtcblxuXHQvLyBGb3JjZSByZWRyYXcgb24gYW4gZWxlbWVudC5cblx0Ly8gVGhpcyBoZWxwcyBpbiBjYXNlcyB3aGVyZSB0aGUgYnJvd3NlciBkb2Vzbid0IHJlZHJhdyBhbiB1cGRhdGVkIGVsZW1lbnQgcHJvcGVybHlcblx0Ly8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblx0dmFyIGZvcmNlUmVkcmF3ID0gZnVuY3Rpb24oJGVsKSB7XG5cdFx0cmV0dXJuICRlbCAmJiAkZWwubGVuZ3RoICYmICRlbFswXS5vZmZzZXRIZWlnaHQ7XG5cdH07XG5cblx0Ly8gRXhjbHVkZSBhcnJheSAoYGJ1dHRvbnNgKSBvcHRpb25zIGZyb20gZGVlcCBtZXJnaW5nXG5cdC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXHR2YXIgbWVyZ2VPcHRzID0gZnVuY3Rpb24ob3B0czEsIG9wdHMyKSB7XG5cdFx0dmFyIHJleiA9ICQuZXh0ZW5kKHRydWUsIHt9LCBvcHRzMSwgb3B0czIpO1xuXG5cdFx0JC5lYWNoKG9wdHMyLCBmdW5jdGlvbihrZXksIHZhbHVlKSB7XG5cdFx0XHRpZiAoJC5pc0FycmF5KHZhbHVlKSkge1xuXHRcdFx0XHRyZXpba2V5XSA9IHZhbHVlO1xuXHRcdFx0fVxuXHRcdH0pO1xuXG5cdFx0cmV0dXJuIHJlejtcblx0fTtcblxuXHQvLyBIb3cgbXVjaCBvZiBhbiBlbGVtZW50IGlzIHZpc2libGUgaW4gdmlld3BvcnRcblx0Ly8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cblx0dmFyIGluVmlld3BvcnQgPSBmdW5jdGlvbihlbGVtKSB7XG5cdFx0dmFyIGVsZW1DZW50ZXIsIHJlejtcblxuXHRcdGlmICghZWxlbSB8fCBlbGVtLm93bmVyRG9jdW1lbnQgIT09IGRvY3VtZW50KSB7XG5cdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0fVxuXG5cdFx0JChcIi5mYW5jeWJveC1jb250YWluZXJcIikuY3NzKFwicG9pbnRlci1ldmVudHNcIiwgXCJub25lXCIpO1xuXG5cdFx0ZWxlbUNlbnRlciA9IHtcblx0XHRcdHg6IGVsZW0uZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCkubGVmdCArIGVsZW0ub2Zmc2V0V2lkdGggLyAyLFxuXHRcdFx0eTogZWxlbS5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKS50b3AgKyBlbGVtLm9mZnNldEhlaWdodCAvIDJcblx0XHR9O1xuXG5cdFx0cmV6ID0gZG9jdW1lbnQuZWxlbWVudEZyb21Qb2ludChlbGVtQ2VudGVyLngsIGVsZW1DZW50ZXIueSkgPT09IGVsZW07XG5cblx0XHQkKFwiLmZhbmN5Ym94LWNvbnRhaW5lclwiKS5jc3MoXCJwb2ludGVyLWV2ZW50c1wiLCBcIlwiKTtcblxuXHRcdHJldHVybiByZXo7XG5cdH07XG5cblx0Ly8gQ2xhc3MgZGVmaW5pdGlvblxuXHQvLyA9PT09PT09PT09PT09PT09XG5cblx0dmFyIEZhbmN5Qm94ID0gZnVuY3Rpb24oY29udGVudCwgb3B0cywgaW5kZXgpIHtcblx0XHR2YXIgc2VsZiA9IHRoaXM7XG5cblx0XHRzZWxmLm9wdHMgPSBtZXJnZU9wdHMoe2luZGV4OiBpbmRleH0sICQuZmFuY3lib3guZGVmYXVsdHMpO1xuXG5cdFx0aWYgKCQuaXNQbGFpbk9iamVjdChvcHRzKSkge1xuXHRcdFx0c2VsZi5vcHRzID0gbWVyZ2VPcHRzKHNlbGYub3B0cywgb3B0cyk7XG5cdFx0fVxuXG5cdFx0aWYgKCQuZmFuY3lib3guaXNNb2JpbGUpIHtcblx0XHRcdHNlbGYub3B0cyA9IG1lcmdlT3B0cyhzZWxmLm9wdHMsIHNlbGYub3B0cy5tb2JpbGUpO1xuXHRcdH1cblxuXHRcdHNlbGYuaWQgPSBzZWxmLm9wdHMuaWQgfHwgKytjYWxsZWQ7XG5cblx0XHRzZWxmLmN1cnJJbmRleCA9IHBhcnNlSW50KHNlbGYub3B0cy5pbmRleCwgMTApIHx8IDA7XG5cdFx0c2VsZi5wcmV2SW5kZXggPSBudWxsO1xuXG5cdFx0c2VsZi5wcmV2UG9zID0gbnVsbDtcblx0XHRzZWxmLmN1cnJQb3MgPSAwO1xuXG5cdFx0c2VsZi5maXJzdFJ1biA9IHRydWU7XG5cblx0XHQvLyBBbGwgZ3JvdXAgaXRlbXNcblx0XHRzZWxmLmdyb3VwID0gW107XG5cblx0XHQvLyBFeGlzdGluZyBzbGlkZXMgKGZvciBjdXJyZW50LCBuZXh0IGFuZCBwcmV2aW91cyBnYWxsZXJ5IGl0ZW1zKVxuXHRcdHNlbGYuc2xpZGVzID0ge307XG5cblx0XHQvLyBDcmVhdGUgZ3JvdXAgZWxlbWVudHNcblx0XHRzZWxmLmFkZENvbnRlbnQoY29udGVudCk7XG5cblx0XHRpZiAoIXNlbGYuZ3JvdXAubGVuZ3RoKSB7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXG5cdFx0c2VsZi5pbml0KCk7XG5cdH07XG5cblx0JC5leHRlbmQoRmFuY3lCb3gucHJvdG90eXBlLCB7XG5cdFx0Ly8gQ3JlYXRlIERPTSBzdHJ1Y3R1cmVcblx0XHQvLyA9PT09PT09PT09PT09PT09PT09PVxuXG5cdFx0aW5pdDogZnVuY3Rpb24oKSB7XG5cdFx0XHR2YXIgc2VsZiA9IHRoaXMsXG5cdFx0XHRcdGZpcnN0SXRlbSA9IHNlbGYuZ3JvdXBbc2VsZi5jdXJySW5kZXhdLFxuXHRcdFx0XHRmaXJzdEl0ZW1PcHRzID0gZmlyc3RJdGVtLm9wdHMsXG5cdFx0XHRcdCRjb250YWluZXIsXG5cdFx0XHRcdGJ1dHRvblN0cjtcblxuXHRcdFx0aWYgKGZpcnN0SXRlbU9wdHMuY2xvc2VFeGlzdGluZykge1xuXHRcdFx0XHQkLmZhbmN5Ym94LmNsb3NlKHRydWUpO1xuXHRcdFx0fVxuXG5cdFx0XHQvLyBIaWRlIHNjcm9sbGJhcnNcblx0XHRcdC8vID09PT09PT09PT09PT09PVxuXG5cdFx0XHQkKFwiYm9keVwiKS5hZGRDbGFzcyhcImZhbmN5Ym94LWFjdGl2ZVwiKTtcblxuXHRcdFx0aWYgKFxuXHRcdFx0XHQhJC5mYW5jeWJveC5nZXRJbnN0YW5jZSgpICYmXG5cdFx0XHRcdGZpcnN0SXRlbU9wdHMuaGlkZVNjcm9sbGJhciAhPT0gZmFsc2UgJiZcblx0XHRcdFx0ISQuZmFuY3lib3guaXNNb2JpbGUgJiZcblx0XHRcdFx0ZG9jdW1lbnQuYm9keS5zY3JvbGxIZWlnaHQgPiB3aW5kb3cuaW5uZXJIZWlnaHRcblx0XHRcdCkge1xuXHRcdFx0XHQkKFwiaGVhZFwiKS5hcHBlbmQoXG5cdFx0XHRcdFx0JzxzdHlsZSBpZD1cImZhbmN5Ym94LXN0eWxlLW5vc2Nyb2xsXCIgdHlwZT1cInRleHQvY3NzXCI+LmNvbXBlbnNhdGUtZm9yLXNjcm9sbGJhcnttYXJnaW4tcmlnaHQ6JyArXG5cdFx0XHRcdFx0KHdpbmRvdy5pbm5lcldpZHRoIC0gZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LmNsaWVudFdpZHRoKSArXG5cdFx0XHRcdFx0XCJweDt9PC9zdHlsZT5cIlxuXHRcdFx0XHQpO1xuXG5cdFx0XHRcdCQoXCJib2R5XCIpLmFkZENsYXNzKFwiY29tcGVuc2F0ZS1mb3Itc2Nyb2xsYmFyXCIpO1xuXHRcdFx0fVxuXG5cdFx0XHQvLyBCdWlsZCBodG1sIG1hcmt1cCBhbmQgc2V0IHJlZmVyZW5jZXNcblx0XHRcdC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG5cdFx0XHQvLyBCdWlsZCBodG1sIGNvZGUgZm9yIGJ1dHRvbnMgYW5kIGluc2VydCBpbnRvIG1haW4gdGVtcGxhdGVcblx0XHRcdGJ1dHRvblN0ciA9IFwiXCI7XG5cblx0XHRcdCQuZWFjaChmaXJzdEl0ZW1PcHRzLmJ1dHRvbnMsIGZ1bmN0aW9uKGluZGV4LCB2YWx1ZSkge1xuXHRcdFx0XHRidXR0b25TdHIgKz0gZmlyc3RJdGVtT3B0cy5idG5UcGxbdmFsdWVdIHx8IFwiXCI7XG5cdFx0XHR9KTtcblxuXHRcdFx0Ly8gQ3JlYXRlIG1hcmt1cCBmcm9tIGJhc2UgdGVtcGxhdGUsIGl0IHdpbGwgYmUgaW5pdGlhbGx5IGhpZGRlbiB0b1xuXHRcdFx0Ly8gYXZvaWQgdW5uZWNlc3Nhcnkgd29yayBsaWtlIHBhaW50aW5nIHdoaWxlIGluaXRpYWxpemluZyBpcyBub3QgY29tcGxldGVcblx0XHRcdCRjb250YWluZXIgPSAkKFxuXHRcdFx0XHRzZWxmLnRyYW5zbGF0ZShcblx0XHRcdFx0XHRzZWxmLFxuXHRcdFx0XHRcdGZpcnN0SXRlbU9wdHMuYmFzZVRwbFxuXHRcdFx0XHRcdFx0LnJlcGxhY2UoXCJ7e2J1dHRvbnN9fVwiLCBidXR0b25TdHIpXG5cdFx0XHRcdFx0XHQucmVwbGFjZShcInt7YXJyb3dzfX1cIiwgZmlyc3RJdGVtT3B0cy5idG5UcGwuYXJyb3dMZWZ0ICsgZmlyc3RJdGVtT3B0cy5idG5UcGwuYXJyb3dSaWdodClcblx0XHRcdFx0KVxuXHRcdFx0KVxuXHRcdFx0XHQuYXR0cihcImlkXCIsIFwiZmFuY3lib3gtY29udGFpbmVyLVwiICsgc2VsZi5pZClcblx0XHRcdFx0LmFkZENsYXNzKGZpcnN0SXRlbU9wdHMuYmFzZUNsYXNzKVxuXHRcdFx0XHQuZGF0YShcIkZhbmN5Qm94XCIsIHNlbGYpXG5cdFx0XHRcdC5hcHBlbmRUbyhmaXJzdEl0ZW1PcHRzLnBhcmVudEVsKTtcblxuXHRcdFx0Ly8gQ3JlYXRlIG9iamVjdCBob2xkaW5nIHJlZmVyZW5jZXMgdG8galF1ZXJ5IHdyYXBwZWQgbm9kZXNcblx0XHRcdHNlbGYuJHJlZnMgPSB7XG5cdFx0XHRcdGNvbnRhaW5lcjogJGNvbnRhaW5lclxuXHRcdFx0fTtcblxuXHRcdFx0W1wiYmdcIiwgXCJpbm5lclwiLCBcImluZm9iYXJcIiwgXCJ0b29sYmFyXCIsIFwic3RhZ2VcIiwgXCJjYXB0aW9uXCIsIFwibmF2aWdhdGlvblwiXS5mb3JFYWNoKGZ1bmN0aW9uKGl0ZW0pIHtcblx0XHRcdFx0c2VsZi4kcmVmc1tpdGVtXSA9ICRjb250YWluZXIuZmluZChcIi5mYW5jeWJveC1cIiArIGl0ZW0pO1xuXHRcdFx0fSk7XG5cblx0XHRcdHNlbGYudHJpZ2dlcihcIm9uSW5pdFwiKTtcblxuXHRcdFx0Ly8gRW5hYmxlIGV2ZW50cywgZGVhY3RpdmUgcHJldmlvdXMgaW5zdGFuY2VzXG5cdFx0XHRzZWxmLmFjdGl2YXRlKCk7XG5cblx0XHRcdC8vIEJ1aWxkIHNsaWRlcywgbG9hZCBhbmQgcmV2ZWFsIGNvbnRlbnRcblx0XHRcdHNlbGYuanVtcFRvKHNlbGYuY3VyckluZGV4KTtcblx0XHR9LFxuXG5cdFx0Ly8gU2ltcGxlIGkxOG4gc3VwcG9ydCAtIHJlcGxhY2VzIG9iamVjdCBrZXlzIGZvdW5kIGluIHRlbXBsYXRlXG5cdFx0Ly8gd2l0aCBjb3JyZXNwb25kaW5nIHZhbHVlc1xuXHRcdC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG5cdFx0dHJhbnNsYXRlOiBmdW5jdGlvbihvYmosIHN0cikge1xuXHRcdFx0dmFyIGFyciA9IG9iai5vcHRzLmkxOG5bb2JqLm9wdHMubGFuZ10gfHwgb2JqLm9wdHMuaTE4bi5lbjtcblxuXHRcdFx0cmV0dXJuIHN0ci5yZXBsYWNlKC9cXHtcXHsoXFx3KylcXH1cXH0vZywgZnVuY3Rpb24obWF0Y2gsIG4pIHtcblx0XHRcdFx0dmFyIHZhbHVlID0gYXJyW25dO1xuXG5cdFx0XHRcdGlmICh2YWx1ZSA9PT0gdW5kZWZpbmVkKSB7XG5cdFx0XHRcdFx0cmV0dXJuIG1hdGNoO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0cmV0dXJuIHZhbHVlO1xuXHRcdFx0fSk7XG5cdFx0fSxcblxuXHRcdC8vIFBvcHVsYXRlIGN1cnJlbnQgZ3JvdXAgd2l0aCBmcmVzaCBjb250ZW50XG5cdFx0Ly8gQ2hlY2sgaWYgZWFjaCBvYmplY3QgaGFzIHZhbGlkIHR5cGUgYW5kIGNvbnRlbnRcblx0XHQvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG5cdFx0YWRkQ29udGVudDogZnVuY3Rpb24oY29udGVudCkge1xuXHRcdFx0dmFyIHNlbGYgPSB0aGlzLFxuXHRcdFx0XHRpdGVtcyA9ICQubWFrZUFycmF5KGNvbnRlbnQpLFxuXHRcdFx0XHR0aHVtYnM7XG5cblx0XHRcdCQuZWFjaChpdGVtcywgZnVuY3Rpb24oaSwgaXRlbSkge1xuXHRcdFx0XHR2YXIgb2JqID0ge30sXG5cdFx0XHRcdFx0b3B0cyA9IHt9LFxuXHRcdFx0XHRcdCRpdGVtLFxuXHRcdFx0XHRcdHR5cGUsXG5cdFx0XHRcdFx0Zm91bmQsXG5cdFx0XHRcdFx0c3JjLFxuXHRcdFx0XHRcdHNyY1BhcnRzO1xuXG5cdFx0XHRcdC8vIFN0ZXAgMSAtIE1ha2Ugc3VyZSB3ZSBoYXZlIGFuIG9iamVjdFxuXHRcdFx0XHQvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuXHRcdFx0XHRpZiAoJC5pc1BsYWluT2JqZWN0KGl0ZW0pKSB7XG5cdFx0XHRcdFx0Ly8gV2UgcHJvYmFibHkgaGF2ZSBtYW51YWwgdXNhZ2UgaGVyZSwgc29tZXRoaW5nIGxpa2Vcblx0XHRcdFx0XHQvLyAkLmZhbmN5Ym94Lm9wZW4oIFsgeyBzcmMgOiBcImltYWdlLmpwZ1wiLCB0eXBlIDogXCJpbWFnZVwiIH0gXSApXG5cblx0XHRcdFx0XHRvYmogPSBpdGVtO1xuXHRcdFx0XHRcdG9wdHMgPSBpdGVtLm9wdHMgfHwgaXRlbTtcblx0XHRcdFx0fSBlbHNlIGlmICgkLnR5cGUoaXRlbSkgPT09IFwib2JqZWN0XCIgJiYgJChpdGVtKS5sZW5ndGgpIHtcblx0XHRcdFx0XHQvLyBIZXJlIHdlIHByb2JhYmx5IGhhdmUgalF1ZXJ5IGNvbGxlY3Rpb24gcmV0dXJuZWQgYnkgc29tZSBzZWxlY3RvclxuXHRcdFx0XHRcdCRpdGVtID0gJChpdGVtKTtcblxuXHRcdFx0XHRcdC8vIFN1cHBvcnQgYXR0cmlidXRlcyBsaWtlIGBkYXRhLW9wdGlvbnM9J3tcInRvdWNoXCIgOiBmYWxzZX0nYCBhbmQgYGRhdGEtdG91Y2g9J2ZhbHNlJ2Bcblx0XHRcdFx0XHRvcHRzID0gJGl0ZW0uZGF0YSgpIHx8IHt9O1xuXHRcdFx0XHRcdG9wdHMgPSAkLmV4dGVuZCh0cnVlLCB7fSwgb3B0cywgb3B0cy5vcHRpb25zKTtcblxuXHRcdFx0XHRcdC8vIEhlcmUgd2Ugc3RvcmUgY2xpY2tlZCBlbGVtZW50XG5cdFx0XHRcdFx0b3B0cy4kb3JpZyA9ICRpdGVtO1xuXG5cdFx0XHRcdFx0b2JqLnNyYyA9IHNlbGYub3B0cy5zcmMgfHwgb3B0cy5zcmMgfHwgJGl0ZW0uYXR0cihcImhyZWZcIik7XG5cblx0XHRcdFx0XHQvLyBBc3N1bWUgdGhhdCBzaW1wbGUgc3ludGF4IGlzIHVzZWQsIGZvciBleGFtcGxlOlxuXHRcdFx0XHRcdC8vICAgYCQuZmFuY3lib3gub3BlbiggJChcIiN0ZXN0XCIpLCB7fSApO2Bcblx0XHRcdFx0XHRpZiAoIW9iai50eXBlICYmICFvYmouc3JjKSB7XG5cdFx0XHRcdFx0XHRvYmoudHlwZSA9IFwiaW5saW5lXCI7XG5cdFx0XHRcdFx0XHRvYmouc3JjID0gaXRlbTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0Ly8gQXNzdW1lIHdlIGhhdmUgYSBzaW1wbGUgaHRtbCBjb2RlLCBmb3IgZXhhbXBsZTpcblx0XHRcdFx0XHQvLyAgICQuZmFuY3lib3gub3BlbiggJzxkaXY+PGgxPkhpITwvaDE+PC9kaXY+JyApO1xuXHRcdFx0XHRcdG9iaiA9IHtcblx0XHRcdFx0XHRcdHR5cGU6IFwiaHRtbFwiLFxuXHRcdFx0XHRcdFx0c3JjOiBpdGVtICsgXCJcIlxuXHRcdFx0XHRcdH07XG5cdFx0XHRcdH1cblxuXHRcdFx0XHQvLyBFYWNoIGdhbGxlcnkgb2JqZWN0IGhhcyBmdWxsIGNvbGxlY3Rpb24gb2Ygb3B0aW9uc1xuXHRcdFx0XHRvYmoub3B0cyA9ICQuZXh0ZW5kKHRydWUsIHt9LCBzZWxmLm9wdHMsIG9wdHMpO1xuXG5cdFx0XHRcdC8vIERvIG5vdCBtZXJnZSBidXR0b25zIGFycmF5XG5cdFx0XHRcdGlmICgkLmlzQXJyYXkob3B0cy5idXR0b25zKSkge1xuXHRcdFx0XHRcdG9iai5vcHRzLmJ1dHRvbnMgPSBvcHRzLmJ1dHRvbnM7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRpZiAoJC5mYW5jeWJveC5pc01vYmlsZSAmJiBvYmoub3B0cy5tb2JpbGUpIHtcblx0XHRcdFx0XHRvYmoub3B0cyA9IG1lcmdlT3B0cyhvYmoub3B0cywgb2JqLm9wdHMubW9iaWxlKTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdC8vIFN0ZXAgMiAtIE1ha2Ugc3VyZSB3ZSBoYXZlIGNvbnRlbnQgdHlwZSwgaWYgbm90IC0gdHJ5IHRvIGd1ZXNzXG5cdFx0XHRcdC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cblx0XHRcdFx0dHlwZSA9IG9iai50eXBlIHx8IG9iai5vcHRzLnR5cGU7XG5cdFx0XHRcdHNyYyA9IG9iai5zcmMgfHwgXCJcIjtcblxuXHRcdFx0XHRpZiAoIXR5cGUgJiYgc3JjKSB7XG5cdFx0XHRcdFx0aWYgKChmb3VuZCA9IHNyYy5tYXRjaCgvXFwuKG1wNHxtb3Z8b2d2fHdlYm0pKChcXD98IykuKik/JC9pKSkpIHtcblx0XHRcdFx0XHRcdHR5cGUgPSBcInZpZGVvXCI7XG5cblx0XHRcdFx0XHRcdGlmICghb2JqLm9wdHMudmlkZW8uZm9ybWF0KSB7XG5cdFx0XHRcdFx0XHRcdG9iai5vcHRzLnZpZGVvLmZvcm1hdCA9IFwidmlkZW8vXCIgKyAoZm91bmRbMV0gPT09IFwib2d2XCIgPyBcIm9nZ1wiIDogZm91bmRbMV0pO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH0gZWxzZSBpZiAoc3JjLm1hdGNoKC8oXmRhdGE6aW1hZ2VcXC9bYS16MC05K1xcLz1dKiwpfChcXC4oanAoZXxnfGVnKXxnaWZ8cG5nfGJtcHx3ZWJwfHN2Z3xpY28pKChcXD98IykuKik/JCkvaSkpIHtcblx0XHRcdFx0XHRcdHR5cGUgPSBcImltYWdlXCI7XG5cdFx0XHRcdFx0fSBlbHNlIGlmIChzcmMubWF0Y2goL1xcLihwZGYpKChcXD98IykuKik/JC9pKSkge1xuXHRcdFx0XHRcdFx0dHlwZSA9IFwiaWZyYW1lXCI7XG5cdFx0XHRcdFx0XHRvYmogPSAkLmV4dGVuZCh0cnVlLCBvYmosIHtjb250ZW50VHlwZTogXCJwZGZcIiwgb3B0czoge2lmcmFtZToge3ByZWxvYWQ6IGZhbHNlfX19KTtcblx0XHRcdFx0XHR9IGVsc2UgaWYgKHNyYy5jaGFyQXQoMCkgPT09IFwiI1wiKSB7XG5cdFx0XHRcdFx0XHR0eXBlID0gXCJpbmxpbmVcIjtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRpZiAodHlwZSkge1xuXHRcdFx0XHRcdG9iai50eXBlID0gdHlwZTtcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRzZWxmLnRyaWdnZXIoXCJvYmplY3ROZWVkc1R5cGVcIiwgb2JqKTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdGlmICghb2JqLmNvbnRlbnRUeXBlKSB7XG5cdFx0XHRcdFx0b2JqLmNvbnRlbnRUeXBlID0gJC5pbkFycmF5KG9iai50eXBlLCBbXCJodG1sXCIsIFwiaW5saW5lXCIsIFwiYWpheFwiXSkgPiAtMSA/IFwiaHRtbFwiIDogb2JqLnR5cGU7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHQvLyBTdGVwIDMgLSBTb21lIGFkanVzdG1lbnRzXG5cdFx0XHRcdC8vID09PT09PT09PT09PT09PT09PT09PT09PT1cblxuXHRcdFx0XHRvYmouaW5kZXggPSBzZWxmLmdyb3VwLmxlbmd0aDtcblxuXHRcdFx0XHRpZiAob2JqLm9wdHMuc21hbGxCdG4gPT0gXCJhdXRvXCIpIHtcblx0XHRcdFx0XHRvYmoub3B0cy5zbWFsbEJ0biA9ICQuaW5BcnJheShvYmoudHlwZSwgW1wiaHRtbFwiLCBcImlubGluZVwiLCBcImFqYXhcIl0pID4gLTE7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRpZiAob2JqLm9wdHMudG9vbGJhciA9PT0gXCJhdXRvXCIpIHtcblx0XHRcdFx0XHRvYmoub3B0cy50b29sYmFyID0gIW9iai5vcHRzLnNtYWxsQnRuO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0Ly8gRmluZCB0aHVtYm5haWwgaW1hZ2UsIGNoZWNrIGlmIGV4aXN0cyBhbmQgaWYgaXMgaW4gdGhlIHZpZXdwb3J0XG5cdFx0XHRcdG9iai4kdGh1bWIgPSBvYmoub3B0cy4kdGh1bWIgfHwgbnVsbDtcblxuXHRcdFx0XHRpZiAob2JqLm9wdHMuJHRyaWdnZXIgJiYgb2JqLmluZGV4ID09PSBzZWxmLm9wdHMuaW5kZXgpIHtcblx0XHRcdFx0XHRvYmouJHRodW1iID0gb2JqLm9wdHMuJHRyaWdnZXIuZmluZChcImltZzpmaXJzdFwiKTtcblxuXHRcdFx0XHRcdGlmIChvYmouJHRodW1iLmxlbmd0aCkge1xuXHRcdFx0XHRcdFx0b2JqLm9wdHMuJG9yaWcgPSBvYmoub3B0cy4kdHJpZ2dlcjtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRpZiAoIShvYmouJHRodW1iICYmIG9iai4kdGh1bWIubGVuZ3RoKSAmJiBvYmoub3B0cy4kb3JpZykge1xuXHRcdFx0XHRcdG9iai4kdGh1bWIgPSBvYmoub3B0cy4kb3JpZy5maW5kKFwiaW1nOmZpcnN0XCIpO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0aWYgKG9iai4kdGh1bWIgJiYgIW9iai4kdGh1bWIubGVuZ3RoKSB7XG5cdFx0XHRcdFx0b2JqLiR0aHVtYiA9IG51bGw7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRvYmoudGh1bWIgPSBvYmoub3B0cy50aHVtYiB8fCAob2JqLiR0aHVtYiA/IG9iai4kdGh1bWJbMF0uc3JjIDogbnVsbCk7XG5cblx0XHRcdFx0Ly8gXCJjYXB0aW9uXCIgaXMgYSBcInNwZWNpYWxcIiBvcHRpb24sIGl0IGNhbiBiZSB1c2VkIHRvIGN1c3RvbWl6ZSBjYXB0aW9uIHBlciBnYWxsZXJ5IGl0ZW1cblx0XHRcdFx0aWYgKCQudHlwZShvYmoub3B0cy5jYXB0aW9uKSA9PT0gXCJmdW5jdGlvblwiKSB7XG5cdFx0XHRcdFx0b2JqLm9wdHMuY2FwdGlvbiA9IG9iai5vcHRzLmNhcHRpb24uYXBwbHkoaXRlbSwgW3NlbGYsIG9ial0pO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0aWYgKCQudHlwZShzZWxmLm9wdHMuY2FwdGlvbikgPT09IFwiZnVuY3Rpb25cIikge1xuXHRcdFx0XHRcdG9iai5vcHRzLmNhcHRpb24gPSBzZWxmLm9wdHMuY2FwdGlvbi5hcHBseShpdGVtLCBbc2VsZiwgb2JqXSk7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHQvLyBNYWtlIHN1cmUgd2UgaGF2ZSBjYXB0aW9uIGFzIGEgc3RyaW5nIG9yIGpRdWVyeSBvYmplY3Rcblx0XHRcdFx0aWYgKCEob2JqLm9wdHMuY2FwdGlvbiBpbnN0YW5jZW9mICQpKSB7XG5cdFx0XHRcdFx0b2JqLm9wdHMuY2FwdGlvbiA9IG9iai5vcHRzLmNhcHRpb24gPT09IHVuZGVmaW5lZCA/IFwiXCIgOiBvYmoub3B0cy5jYXB0aW9uICsgXCJcIjtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdC8vIENoZWNrIGlmIHVybCBjb250YWlucyBcImZpbHRlclwiIHVzZWQgdG8gZmlsdGVyIHRoZSBjb250ZW50XG5cdFx0XHRcdC8vIEV4YW1wbGU6IFwiYWpheC5odG1sICNzb21ldGhpbmdcIlxuXHRcdFx0XHRpZiAob2JqLnR5cGUgPT09IFwiYWpheFwiKSB7XG5cdFx0XHRcdFx0c3JjUGFydHMgPSBzcmMuc3BsaXQoL1xccysvLCAyKTtcblxuXHRcdFx0XHRcdGlmIChzcmNQYXJ0cy5sZW5ndGggPiAxKSB7XG5cdFx0XHRcdFx0XHRvYmouc3JjID0gc3JjUGFydHMuc2hpZnQoKTtcblxuXHRcdFx0XHRcdFx0b2JqLm9wdHMuZmlsdGVyID0gc3JjUGFydHMuc2hpZnQoKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblxuXHRcdFx0XHQvLyBIaWRlIGFsbCBidXR0b25zIGFuZCBkaXNhYmxlIGludGVyYWN0aXZpdHkgZm9yIG1vZGFsIGl0ZW1zXG5cdFx0XHRcdGlmIChvYmoub3B0cy5tb2RhbCkge1xuXHRcdFx0XHRcdG9iai5vcHRzID0gJC5leHRlbmQodHJ1ZSwgb2JqLm9wdHMsIHtcblx0XHRcdFx0XHRcdHRyYXBGb2N1czogdHJ1ZSxcblx0XHRcdFx0XHRcdC8vIFJlbW92ZSBidXR0b25zXG5cdFx0XHRcdFx0XHRpbmZvYmFyOiAwLFxuXHRcdFx0XHRcdFx0dG9vbGJhcjogMCxcblxuXHRcdFx0XHRcdFx0c21hbGxCdG46IDAsXG5cblx0XHRcdFx0XHRcdC8vIERpc2FibGUga2V5Ym9hcmQgbmF2aWdhdGlvblxuXHRcdFx0XHRcdFx0a2V5Ym9hcmQ6IDAsXG5cblx0XHRcdFx0XHRcdC8vIERpc2FibGUgc29tZSBtb2R1bGVzXG5cdFx0XHRcdFx0XHRzbGlkZVNob3c6IDAsXG5cdFx0XHRcdFx0XHRmdWxsU2NyZWVuOiAwLFxuXHRcdFx0XHRcdFx0dGh1bWJzOiAwLFxuXHRcdFx0XHRcdFx0dG91Y2g6IDAsXG5cblx0XHRcdFx0XHRcdC8vIERpc2FibGUgY2xpY2sgZXZlbnQgaGFuZGxlcnNcblx0XHRcdFx0XHRcdGNsaWNrQ29udGVudDogZmFsc2UsXG5cdFx0XHRcdFx0XHRjbGlja1NsaWRlOiBmYWxzZSxcblx0XHRcdFx0XHRcdGNsaWNrT3V0c2lkZTogZmFsc2UsXG5cdFx0XHRcdFx0XHRkYmxjbGlja0NvbnRlbnQ6IGZhbHNlLFxuXHRcdFx0XHRcdFx0ZGJsY2xpY2tTbGlkZTogZmFsc2UsXG5cdFx0XHRcdFx0XHRkYmxjbGlja091dHNpZGU6IGZhbHNlXG5cdFx0XHRcdFx0fSk7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHQvLyBTdGVwIDQgLSBBZGQgcHJvY2Vzc2VkIG9iamVjdCB0byBncm91cFxuXHRcdFx0XHQvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG5cdFx0XHRcdHNlbGYuZ3JvdXAucHVzaChvYmopO1xuXHRcdFx0fSk7XG5cblx0XHRcdC8vIFVwZGF0ZSBjb250cm9scyBpZiBnYWxsZXJ5IGlzIGFscmVhZHkgb3BlbmVkXG5cdFx0XHRpZiAoT2JqZWN0LmtleXMoc2VsZi5zbGlkZXMpLmxlbmd0aCkge1xuXHRcdFx0XHRzZWxmLnVwZGF0ZUNvbnRyb2xzKCk7XG5cblx0XHRcdFx0Ly8gVXBkYXRlIHRodW1ibmFpbHMsIGlmIG5lZWRlZFxuXHRcdFx0XHR0aHVtYnMgPSBzZWxmLlRodW1icztcblxuXHRcdFx0XHRpZiAodGh1bWJzICYmIHRodW1icy5pc0FjdGl2ZSkge1xuXHRcdFx0XHRcdHRodW1icy5jcmVhdGUoKTtcblxuXHRcdFx0XHRcdHRodW1icy5mb2N1cygpO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fSxcblxuXHRcdC8vIEF0dGFjaCBhbiBldmVudCBoYW5kbGVyIGZ1bmN0aW9ucyBmb3I6XG5cdFx0Ly8gICAtIG5hdmlnYXRpb24gYnV0dG9uc1xuXHRcdC8vICAgLSBicm93c2VyIHNjcm9sbGluZywgcmVzaXppbmc7XG5cdFx0Ly8gICAtIGZvY3VzaW5nXG5cdFx0Ly8gICAtIGtleWJvYXJkXG5cdFx0Ly8gICAtIGRldGVjdGluZyBpbmFjdGl2aXR5XG5cdFx0Ly8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuXHRcdGFkZEV2ZW50czogZnVuY3Rpb24oKSB7XG5cdFx0XHR2YXIgc2VsZiA9IHRoaXM7XG5cblx0XHRcdHNlbGYucmVtb3ZlRXZlbnRzKCk7XG5cblx0XHRcdC8vIE1ha2UgbmF2aWdhdGlvbiBlbGVtZW50cyBjbGlja2FibGVcblx0XHRcdC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuXHRcdFx0c2VsZi4kcmVmcy5jb250YWluZXJcblx0XHRcdFx0Lm9uKFwiY2xpY2suZmItY2xvc2VcIiwgXCJbZGF0YS1mYW5jeWJveC1jbG9zZV1cIiwgZnVuY3Rpb24oZSkge1xuXHRcdFx0XHRcdGUuc3RvcFByb3BhZ2F0aW9uKCk7XG5cdFx0XHRcdFx0ZS5wcmV2ZW50RGVmYXVsdCgpO1xuXG5cdFx0XHRcdFx0c2VsZi5jbG9zZShlKTtcblx0XHRcdFx0fSlcblx0XHRcdFx0Lm9uKFwidG91Y2hzdGFydC5mYi1wcmV2IGNsaWNrLmZiLXByZXZcIiwgXCJbZGF0YS1mYW5jeWJveC1wcmV2XVwiLCBmdW5jdGlvbihlKSB7XG5cdFx0XHRcdFx0ZS5zdG9wUHJvcGFnYXRpb24oKTtcblx0XHRcdFx0XHRlLnByZXZlbnREZWZhdWx0KCk7XG5cblx0XHRcdFx0XHRzZWxmLnByZXZpb3VzKCk7XG5cdFx0XHRcdH0pXG5cdFx0XHRcdC5vbihcInRvdWNoc3RhcnQuZmItbmV4dCBjbGljay5mYi1uZXh0XCIsIFwiW2RhdGEtZmFuY3lib3gtbmV4dF1cIiwgZnVuY3Rpb24oZSkge1xuXHRcdFx0XHRcdGUuc3RvcFByb3BhZ2F0aW9uKCk7XG5cdFx0XHRcdFx0ZS5wcmV2ZW50RGVmYXVsdCgpO1xuXG5cdFx0XHRcdFx0c2VsZi5uZXh0KCk7XG5cdFx0XHRcdH0pXG5cdFx0XHRcdC5vbihcImNsaWNrLmZiXCIsIFwiW2RhdGEtZmFuY3lib3gtem9vbV1cIiwgZnVuY3Rpb24oZSkge1xuXHRcdFx0XHRcdC8vIENsaWNrIGhhbmRsZXIgZm9yIHpvb20gYnV0dG9uXG5cdFx0XHRcdFx0c2VsZltzZWxmLmlzU2NhbGVkRG93bigpID8gXCJzY2FsZVRvQWN0dWFsXCIgOiBcInNjYWxlVG9GaXRcIl0oKTtcblx0XHRcdFx0fSk7XG5cblx0XHRcdC8vIEhhbmRsZSBwYWdlIHNjcm9sbGluZyBhbmQgYnJvd3NlciByZXNpemluZ1xuXHRcdFx0Ly8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cblx0XHRcdCRXLm9uKFwib3JpZW50YXRpb25jaGFuZ2UuZmIgcmVzaXplLmZiXCIsIGZ1bmN0aW9uKGUpIHtcblx0XHRcdFx0aWYgKGUgJiYgZS5vcmlnaW5hbEV2ZW50ICYmIGUub3JpZ2luYWxFdmVudC50eXBlID09PSBcInJlc2l6ZVwiKSB7XG5cdFx0XHRcdFx0aWYgKHNlbGYucmVxdWVzdElkKSB7XG5cdFx0XHRcdFx0XHRjYW5jZWxBRnJhbWUoc2VsZi5yZXF1ZXN0SWQpO1xuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdHNlbGYucmVxdWVzdElkID0gcmVxdWVzdEFGcmFtZShmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRcdHNlbGYudXBkYXRlKGUpO1xuXHRcdFx0XHRcdH0pO1xuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdGlmIChzZWxmLmN1cnJlbnQgJiYgc2VsZi5jdXJyZW50LnR5cGUgPT09IFwiaWZyYW1lXCIpIHtcblx0XHRcdFx0XHRcdHNlbGYuJHJlZnMuc3RhZ2UuaGlkZSgpO1xuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0XHRzZWxmLiRyZWZzLnN0YWdlLnNob3coKTtcblxuXHRcdFx0XHRcdFx0c2VsZi51cGRhdGUoZSk7XG5cdFx0XHRcdFx0fSwgJC5mYW5jeWJveC5pc01vYmlsZSA/IDYwMCA6IDI1MCk7XG5cdFx0XHRcdH1cblx0XHRcdH0pO1xuXG5cdFx0XHQkRC5vbihcImtleWRvd24uZmJcIiwgZnVuY3Rpb24oZSkge1xuXHRcdFx0XHR2YXIgaW5zdGFuY2UgPSAkLmZhbmN5Ym94ID8gJC5mYW5jeWJveC5nZXRJbnN0YW5jZSgpIDogbnVsbCxcblx0XHRcdFx0XHRjdXJyZW50ID0gaW5zdGFuY2UuY3VycmVudCxcblx0XHRcdFx0XHRrZXljb2RlID0gZS5rZXlDb2RlIHx8IGUud2hpY2g7XG5cblx0XHRcdFx0Ly8gVHJhcCBrZXlib2FyZCBmb2N1cyBpbnNpZGUgb2YgdGhlIG1vZGFsXG5cdFx0XHRcdC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG5cdFx0XHRcdGlmIChrZXljb2RlID09IDkpIHtcblx0XHRcdFx0XHRpZiAoY3VycmVudC5vcHRzLnRyYXBGb2N1cykge1xuXHRcdFx0XHRcdFx0c2VsZi5mb2N1cyhlKTtcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRyZXR1cm47XG5cdFx0XHRcdH1cblxuXHRcdFx0XHQvLyBFbmFibGUga2V5Ym9hcmQgbmF2aWdhdGlvblxuXHRcdFx0XHQvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG5cdFx0XHRcdGlmICghY3VycmVudC5vcHRzLmtleWJvYXJkIHx8IGUuY3RybEtleSB8fCBlLmFsdEtleSB8fCBlLnNoaWZ0S2V5IHx8ICQoZS50YXJnZXQpLmlzKFwiaW5wdXRcIikgfHwgJChlLnRhcmdldCkuaXMoXCJ0ZXh0YXJlYVwiKSkge1xuXHRcdFx0XHRcdHJldHVybjtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdC8vIEJhY2tzcGFjZSBhbmQgRXNjIGtleXNcblx0XHRcdFx0aWYgKGtleWNvZGUgPT09IDggfHwga2V5Y29kZSA9PT0gMjcpIHtcblx0XHRcdFx0XHRlLnByZXZlbnREZWZhdWx0KCk7XG5cblx0XHRcdFx0XHRzZWxmLmNsb3NlKGUpO1xuXG5cdFx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0Ly8gTGVmdCBhcnJvdyBhbmQgVXAgYXJyb3dcblx0XHRcdFx0aWYgKGtleWNvZGUgPT09IDM3IHx8IGtleWNvZGUgPT09IDM4KSB7XG5cdFx0XHRcdFx0ZS5wcmV2ZW50RGVmYXVsdCgpO1xuXG5cdFx0XHRcdFx0c2VsZi5wcmV2aW91cygpO1xuXG5cdFx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0Ly8gUmlnaCBhcnJvdyBhbmQgRG93biBhcnJvd1xuXHRcdFx0XHRpZiAoa2V5Y29kZSA9PT0gMzkgfHwga2V5Y29kZSA9PT0gNDApIHtcblx0XHRcdFx0XHRlLnByZXZlbnREZWZhdWx0KCk7XG5cblx0XHRcdFx0XHRzZWxmLm5leHQoKTtcblxuXHRcdFx0XHRcdHJldHVybjtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdHNlbGYudHJpZ2dlcihcImFmdGVyS2V5ZG93blwiLCBlLCBrZXljb2RlKTtcblx0XHRcdH0pO1xuXG5cdFx0XHQvLyBIaWRlIGNvbnRyb2xzIGFmdGVyIHNvbWUgaW5hY3Rpdml0eSBwZXJpb2Rcblx0XHRcdGlmIChzZWxmLmdyb3VwW3NlbGYuY3VyckluZGV4XS5vcHRzLmlkbGVUaW1lKSB7XG5cdFx0XHRcdHNlbGYuaWRsZVNlY29uZHNDb3VudGVyID0gMDtcblxuXHRcdFx0XHQkRC5vbihcblx0XHRcdFx0XHRcIm1vdXNlbW92ZS5mYi1pZGxlIG1vdXNlbGVhdmUuZmItaWRsZSBtb3VzZWRvd24uZmItaWRsZSB0b3VjaHN0YXJ0LmZiLWlkbGUgdG91Y2htb3ZlLmZiLWlkbGUgc2Nyb2xsLmZiLWlkbGUga2V5ZG93bi5mYi1pZGxlXCIsXG5cdFx0XHRcdFx0ZnVuY3Rpb24oZSkge1xuXHRcdFx0XHRcdFx0c2VsZi5pZGxlU2Vjb25kc0NvdW50ZXIgPSAwO1xuXG5cdFx0XHRcdFx0XHRpZiAoc2VsZi5pc0lkbGUpIHtcblx0XHRcdFx0XHRcdFx0c2VsZi5zaG93Q29udHJvbHMoKTtcblx0XHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdFx0c2VsZi5pc0lkbGUgPSBmYWxzZTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdCk7XG5cblx0XHRcdFx0c2VsZi5pZGxlSW50ZXJ2YWwgPSB3aW5kb3cuc2V0SW50ZXJ2YWwoZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0c2VsZi5pZGxlU2Vjb25kc0NvdW50ZXIrKztcblxuXHRcdFx0XHRcdGlmIChzZWxmLmlkbGVTZWNvbmRzQ291bnRlciA+PSBzZWxmLmdyb3VwW3NlbGYuY3VyckluZGV4XS5vcHRzLmlkbGVUaW1lICYmICFzZWxmLmlzRHJhZ2dpbmcpIHtcblx0XHRcdFx0XHRcdHNlbGYuaXNJZGxlID0gdHJ1ZTtcblx0XHRcdFx0XHRcdHNlbGYuaWRsZVNlY29uZHNDb3VudGVyID0gMDtcblxuXHRcdFx0XHRcdFx0c2VsZi5oaWRlQ29udHJvbHMoKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH0sIDEwMDApO1xuXHRcdFx0fVxuXHRcdH0sXG5cblx0XHQvLyBSZW1vdmUgZXZlbnRzIGFkZGVkIGJ5IHRoZSBjb3JlXG5cdFx0Ly8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG5cdFx0cmVtb3ZlRXZlbnRzOiBmdW5jdGlvbigpIHtcblx0XHRcdHZhciBzZWxmID0gdGhpcztcblxuXHRcdFx0JFcub2ZmKFwib3JpZW50YXRpb25jaGFuZ2UuZmIgcmVzaXplLmZiXCIpO1xuXHRcdFx0JEQub2ZmKFwia2V5ZG93bi5mYiAuZmItaWRsZVwiKTtcblxuXHRcdFx0dGhpcy4kcmVmcy5jb250YWluZXIub2ZmKFwiLmZiLWNsb3NlIC5mYi1wcmV2IC5mYi1uZXh0XCIpO1xuXG5cdFx0XHRpZiAoc2VsZi5pZGxlSW50ZXJ2YWwpIHtcblx0XHRcdFx0d2luZG93LmNsZWFySW50ZXJ2YWwoc2VsZi5pZGxlSW50ZXJ2YWwpO1xuXG5cdFx0XHRcdHNlbGYuaWRsZUludGVydmFsID0gbnVsbDtcblx0XHRcdH1cblx0XHR9LFxuXG5cdFx0Ly8gQ2hhbmdlIHRvIHByZXZpb3VzIGdhbGxlcnkgaXRlbVxuXHRcdC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuXHRcdHByZXZpb3VzOiBmdW5jdGlvbihkdXJhdGlvbikge1xuXHRcdFx0cmV0dXJuIHRoaXMuanVtcFRvKHRoaXMuY3VyclBvcyAtIDEsIGR1cmF0aW9uKTtcblx0XHR9LFxuXG5cdFx0Ly8gQ2hhbmdlIHRvIG5leHQgZ2FsbGVyeSBpdGVtXG5cdFx0Ly8gPT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cblx0XHRuZXh0OiBmdW5jdGlvbihkdXJhdGlvbikge1xuXHRcdFx0cmV0dXJuIHRoaXMuanVtcFRvKHRoaXMuY3VyclBvcyArIDEsIGR1cmF0aW9uKTtcblx0XHR9LFxuXG5cdFx0Ly8gU3dpdGNoIHRvIHNlbGVjdGVkIGdhbGxlcnkgaXRlbVxuXHRcdC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuXHRcdGp1bXBUbzogZnVuY3Rpb24ocG9zLCBkdXJhdGlvbikge1xuXHRcdFx0dmFyIHNlbGYgPSB0aGlzLFxuXHRcdFx0XHRncm91cExlbiA9IHNlbGYuZ3JvdXAubGVuZ3RoLFxuXHRcdFx0XHRmaXJzdFJ1bixcblx0XHRcdFx0aXNNb3ZlZCxcblx0XHRcdFx0bG9vcCxcblx0XHRcdFx0Y3VycmVudCxcblx0XHRcdFx0cHJldmlvdXMsXG5cdFx0XHRcdHNsaWRlUG9zLFxuXHRcdFx0XHRzdGFnZVBvcyxcblx0XHRcdFx0cHJvcCxcblx0XHRcdFx0ZGlmZjtcblxuXHRcdFx0aWYgKHNlbGYuaXNEcmFnZ2luZyB8fCBzZWxmLmlzQ2xvc2luZyB8fCAoc2VsZi5pc0FuaW1hdGluZyAmJiBzZWxmLmZpcnN0UnVuKSkge1xuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR9XG5cblx0XHRcdC8vIFNob3VsZCBsb29wP1xuXHRcdFx0cG9zID0gcGFyc2VJbnQocG9zLCAxMCk7XG5cdFx0XHRsb29wID0gc2VsZi5jdXJyZW50ID8gc2VsZi5jdXJyZW50Lm9wdHMubG9vcCA6IHNlbGYub3B0cy5sb29wO1xuXG5cdFx0XHRpZiAoIWxvb3AgJiYgKHBvcyA8IDAgfHwgcG9zID49IGdyb3VwTGVuKSkge1xuXHRcdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0XHR9XG5cblx0XHRcdC8vIENoZWNrIGlmIG9wZW5pbmcgZm9yIHRoZSBmaXJzdCB0aW1lOyB0aGlzIGhlbHBzIHRvIHNwZWVkIHRoaW5ncyB1cFxuXHRcdFx0Zmlyc3RSdW4gPSBzZWxmLmZpcnN0UnVuID0gIU9iamVjdC5rZXlzKHNlbGYuc2xpZGVzKS5sZW5ndGg7XG5cblx0XHRcdC8vIENyZWF0ZSBzbGlkZXNcblx0XHRcdHByZXZpb3VzID0gc2VsZi5jdXJyZW50O1xuXG5cdFx0XHRzZWxmLnByZXZJbmRleCA9IHNlbGYuY3VyckluZGV4O1xuXHRcdFx0c2VsZi5wcmV2UG9zID0gc2VsZi5jdXJyUG9zO1xuXG5cdFx0XHRjdXJyZW50ID0gc2VsZi5jcmVhdGVTbGlkZShwb3MpO1xuXG5cdFx0XHRpZiAoZ3JvdXBMZW4gPiAxKSB7XG5cdFx0XHRcdGlmIChsb29wIHx8IGN1cnJlbnQuaW5kZXggPCBncm91cExlbiAtIDEpIHtcblx0XHRcdFx0XHRzZWxmLmNyZWF0ZVNsaWRlKHBvcyArIDEpO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0aWYgKGxvb3AgfHwgY3VycmVudC5pbmRleCA+IDApIHtcblx0XHRcdFx0XHRzZWxmLmNyZWF0ZVNsaWRlKHBvcyAtIDEpO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cblx0XHRcdHNlbGYuY3VycmVudCA9IGN1cnJlbnQ7XG5cdFx0XHRzZWxmLmN1cnJJbmRleCA9IGN1cnJlbnQuaW5kZXg7XG5cdFx0XHRzZWxmLmN1cnJQb3MgPSBjdXJyZW50LnBvcztcblxuXHRcdFx0c2VsZi50cmlnZ2VyKFwiYmVmb3JlU2hvd1wiLCBmaXJzdFJ1bik7XG5cblx0XHRcdHNlbGYudXBkYXRlQ29udHJvbHMoKTtcblxuXHRcdFx0Ly8gVmFsaWRhdGUgZHVyYXRpb24gbGVuZ3RoXG5cdFx0XHRjdXJyZW50LmZvcmNlZER1cmF0aW9uID0gdW5kZWZpbmVkO1xuXG5cdFx0XHRpZiAoJC5pc051bWVyaWMoZHVyYXRpb24pKSB7XG5cdFx0XHRcdGN1cnJlbnQuZm9yY2VkRHVyYXRpb24gPSBkdXJhdGlvbjtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdGR1cmF0aW9uID0gY3VycmVudC5vcHRzW2ZpcnN0UnVuID8gXCJhbmltYXRpb25EdXJhdGlvblwiIDogXCJ0cmFuc2l0aW9uRHVyYXRpb25cIl07XG5cdFx0XHR9XG5cblx0XHRcdGR1cmF0aW9uID0gcGFyc2VJbnQoZHVyYXRpb24sIDEwKTtcblxuXHRcdFx0Ly8gQ2hlY2sgaWYgdXNlciBoYXMgc3dpcGVkIHRoZSBzbGlkZXMgb3IgaWYgc3RpbGwgYW5pbWF0aW5nXG5cdFx0XHRpc01vdmVkID0gc2VsZi5pc01vdmVkKGN1cnJlbnQpO1xuXG5cdFx0XHQvLyBNYWtlIHN1cmUgY3VycmVudCBzbGlkZSBpcyB2aXNpYmxlXG5cdFx0XHRjdXJyZW50LiRzbGlkZS5hZGRDbGFzcyhcImZhbmN5Ym94LXNsaWRlLS1jdXJyZW50XCIpO1xuXG5cdFx0XHQvLyBGcmVzaCBzdGFydCAtIHJldmVhbCBjb250YWluZXIsIGN1cnJlbnQgc2xpZGUgYW5kIHN0YXJ0IGxvYWRpbmcgY29udGVudFxuXHRcdFx0aWYgKGZpcnN0UnVuKSB7XG5cdFx0XHRcdGlmIChjdXJyZW50Lm9wdHMuYW5pbWF0aW9uRWZmZWN0ICYmIGR1cmF0aW9uKSB7XG5cdFx0XHRcdFx0c2VsZi4kcmVmcy5jb250YWluZXIuY3NzKFwidHJhbnNpdGlvbi1kdXJhdGlvblwiLCBkdXJhdGlvbiArIFwibXNcIik7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRzZWxmLiRyZWZzLmNvbnRhaW5lci5hZGRDbGFzcyhcImZhbmN5Ym94LWlzLW9wZW5cIikudHJpZ2dlcihcImZvY3VzXCIpO1xuXG5cdFx0XHRcdC8vIEF0dGVtcHQgdG8gbG9hZCBjb250ZW50IGludG8gc2xpZGVcblx0XHRcdFx0Ly8gVGhpcyB3aWxsIGxhdGVyIGNhbGwgYGFmdGVyTG9hZGAgLT4gYHJldmVhbENvbnRlbnRgXG5cdFx0XHRcdHNlbGYubG9hZFNsaWRlKGN1cnJlbnQpO1xuXG5cdFx0XHRcdHNlbGYucHJlbG9hZChcImltYWdlXCIpO1xuXG5cdFx0XHRcdHJldHVybjtcblx0XHRcdH1cblxuXHRcdFx0Ly8gR2V0IGFjdHVhbCBzbGlkZS9zdGFnZSBwb3NpdGlvbnMgKGJlZm9yZSBjbGVhbmluZyB1cClcblx0XHRcdHNsaWRlUG9zID0gJC5mYW5jeWJveC5nZXRUcmFuc2xhdGUocHJldmlvdXMuJHNsaWRlKTtcblx0XHRcdHN0YWdlUG9zID0gJC5mYW5jeWJveC5nZXRUcmFuc2xhdGUoc2VsZi4kcmVmcy5zdGFnZSk7XG5cblx0XHRcdC8vIENsZWFuIHVwIGFsbCBzbGlkZXNcblx0XHRcdCQuZWFjaChzZWxmLnNsaWRlcywgZnVuY3Rpb24oaW5kZXgsIHNsaWRlKSB7XG5cdFx0XHRcdCQuZmFuY3lib3guc3RvcChzbGlkZS4kc2xpZGUsIHRydWUpO1xuXHRcdFx0fSk7XG5cblx0XHRcdGlmIChwcmV2aW91cy5wb3MgIT09IGN1cnJlbnQucG9zKSB7XG5cdFx0XHRcdHByZXZpb3VzLmlzQ29tcGxldGUgPSBmYWxzZTtcblx0XHRcdH1cblxuXHRcdFx0cHJldmlvdXMuJHNsaWRlLnJlbW92ZUNsYXNzKFwiZmFuY3lib3gtc2xpZGUtLWNvbXBsZXRlIGZhbmN5Ym94LXNsaWRlLS1jdXJyZW50XCIpO1xuXG5cdFx0XHQvLyBJZiBzbGlkZXMgYXJlIG91dCBvZiBwbGFjZSwgdGhlbiBhbmltYXRlIHRoZW0gdG8gY29ycmVjdCBwb3NpdGlvblxuXHRcdFx0aWYgKGlzTW92ZWQpIHtcblx0XHRcdFx0Ly8gQ2FsY3VsYXRlIGhvcml6b250YWwgc3dpcGUgZGlzdGFuY2Vcblx0XHRcdFx0ZGlmZiA9IHNsaWRlUG9zLmxlZnQgLSAocHJldmlvdXMucG9zICogc2xpZGVQb3Mud2lkdGggKyBwcmV2aW91cy5wb3MgKiBwcmV2aW91cy5vcHRzLmd1dHRlcik7XG5cblx0XHRcdFx0JC5lYWNoKHNlbGYuc2xpZGVzLCBmdW5jdGlvbihpbmRleCwgc2xpZGUpIHtcblx0XHRcdFx0XHRzbGlkZS4kc2xpZGUucmVtb3ZlQ2xhc3MoXCJmYW5jeWJveC1hbmltYXRlZFwiKS5yZW1vdmVDbGFzcyhmdW5jdGlvbihpbmRleCwgY2xhc3NOYW1lKSB7XG5cdFx0XHRcdFx0XHRyZXR1cm4gKGNsYXNzTmFtZS5tYXRjaCgvKF58XFxzKWZhbmN5Ym94LWZ4LVxcUysvZykgfHwgW10pLmpvaW4oXCIgXCIpO1xuXHRcdFx0XHRcdH0pO1xuXG5cdFx0XHRcdFx0Ly8gTWFrZSBzdXJlIHRoYXQgZWFjaCBzbGlkZSBpcyBpbiBlcXVhbCBkaXN0YW5jZVxuXHRcdFx0XHRcdC8vIFRoaXMgaXMgbW9zdGx5IG5lZWRlZCBmb3IgZnJlc2hseSBhZGRlZCBzbGlkZXMsIGJlY2F1c2UgdGhleSBhcmUgbm90IHlldCBwb3NpdGlvbmVkXG5cdFx0XHRcdFx0dmFyIGxlZnRQb3MgPSBzbGlkZS5wb3MgKiBzbGlkZVBvcy53aWR0aCArIHNsaWRlLnBvcyAqIHNsaWRlLm9wdHMuZ3V0dGVyO1xuXG5cdFx0XHRcdFx0JC5mYW5jeWJveC5zZXRUcmFuc2xhdGUoc2xpZGUuJHNsaWRlLCB7dG9wOiAwLCBsZWZ0OiBsZWZ0UG9zIC0gc3RhZ2VQb3MubGVmdCArIGRpZmZ9KTtcblxuXHRcdFx0XHRcdGlmIChzbGlkZS5wb3MgIT09IGN1cnJlbnQucG9zKSB7XG5cdFx0XHRcdFx0XHRzbGlkZS4kc2xpZGUuYWRkQ2xhc3MoXCJmYW5jeWJveC1zbGlkZS0tXCIgKyAoc2xpZGUucG9zID4gY3VycmVudC5wb3MgPyBcIm5leHRcIiA6IFwicHJldmlvdXNcIikpO1xuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdC8vIFJlZHJhdyB0byBtYWtlIHN1cmUgdGhhdCB0cmFuc2l0aW9uIHdpbGwgc3RhcnRcblx0XHRcdFx0XHRmb3JjZVJlZHJhdyhzbGlkZS4kc2xpZGUpO1xuXG5cdFx0XHRcdFx0Ly8gQW5pbWF0ZSB0aGUgc2xpZGVcblx0XHRcdFx0XHQkLmZhbmN5Ym94LmFuaW1hdGUoXG5cdFx0XHRcdFx0XHRzbGlkZS4kc2xpZGUsXG5cdFx0XHRcdFx0XHR7XG5cdFx0XHRcdFx0XHRcdHRvcDogMCxcblx0XHRcdFx0XHRcdFx0bGVmdDogKHNsaWRlLnBvcyAtIGN1cnJlbnQucG9zKSAqIHNsaWRlUG9zLndpZHRoICsgKHNsaWRlLnBvcyAtIGN1cnJlbnQucG9zKSAqIHNsaWRlLm9wdHMuZ3V0dGVyXG5cdFx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdFx0ZHVyYXRpb24sXG5cdFx0XHRcdFx0XHRmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRcdFx0c2xpZGUuJHNsaWRlXG5cdFx0XHRcdFx0XHRcdFx0LmNzcyh7XG5cdFx0XHRcdFx0XHRcdFx0XHR0cmFuc2Zvcm06IFwiXCIsXG5cdFx0XHRcdFx0XHRcdFx0XHRvcGFjaXR5OiBcIlwiXG5cdFx0XHRcdFx0XHRcdFx0fSlcblx0XHRcdFx0XHRcdFx0XHQucmVtb3ZlQ2xhc3MoXCJmYW5jeWJveC1zbGlkZS0tbmV4dCBmYW5jeWJveC1zbGlkZS0tcHJldmlvdXNcIik7XG5cblx0XHRcdFx0XHRcdFx0aWYgKHNsaWRlLnBvcyA9PT0gc2VsZi5jdXJyUG9zKSB7XG5cdFx0XHRcdFx0XHRcdFx0c2VsZi5jb21wbGV0ZSgpO1xuXHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0KTtcblx0XHRcdFx0fSk7XG5cdFx0XHR9IGVsc2UgaWYgKGR1cmF0aW9uICYmIGN1cnJlbnQub3B0cy50cmFuc2l0aW9uRWZmZWN0KSB7XG5cdFx0XHRcdC8vIFNldCB0cmFuc2l0aW9uIGVmZmVjdCBmb3IgcHJldmlvdXNseSBhY3RpdmUgc2xpZGVcblx0XHRcdFx0cHJvcCA9IFwiZmFuY3lib3gtYW5pbWF0ZWQgZmFuY3lib3gtZngtXCIgKyBjdXJyZW50Lm9wdHMudHJhbnNpdGlvbkVmZmVjdDtcblxuXHRcdFx0XHRwcmV2aW91cy4kc2xpZGUuYWRkQ2xhc3MoXCJmYW5jeWJveC1zbGlkZS0tXCIgKyAocHJldmlvdXMucG9zID4gY3VycmVudC5wb3MgPyBcIm5leHRcIiA6IFwicHJldmlvdXNcIikpO1xuXG5cdFx0XHRcdCQuZmFuY3lib3guYW5pbWF0ZShcblx0XHRcdFx0XHRwcmV2aW91cy4kc2xpZGUsXG5cdFx0XHRcdFx0cHJvcCxcblx0XHRcdFx0XHRkdXJhdGlvbixcblx0XHRcdFx0XHRmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRcdHByZXZpb3VzLiRzbGlkZS5yZW1vdmVDbGFzcyhwcm9wKS5yZW1vdmVDbGFzcyhcImZhbmN5Ym94LXNsaWRlLS1uZXh0IGZhbmN5Ym94LXNsaWRlLS1wcmV2aW91c1wiKTtcblx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdGZhbHNlXG5cdFx0XHRcdCk7XG5cdFx0XHR9XG5cblx0XHRcdGlmIChjdXJyZW50LmlzTG9hZGVkKSB7XG5cdFx0XHRcdHNlbGYucmV2ZWFsQ29udGVudChjdXJyZW50KTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdHNlbGYubG9hZFNsaWRlKGN1cnJlbnQpO1xuXHRcdFx0fVxuXG5cdFx0XHRzZWxmLnByZWxvYWQoXCJpbWFnZVwiKTtcblx0XHR9LFxuXG5cdFx0Ly8gQ3JlYXRlIG5ldyBcInNsaWRlXCIgZWxlbWVudFxuXHRcdC8vIFRoZXNlIGFyZSBnYWxsZXJ5IGl0ZW1zICB0aGF0IGFyZSBhY3R1YWxseSBhZGRlZCB0byBET01cblx0XHQvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cblx0XHRjcmVhdGVTbGlkZTogZnVuY3Rpb24ocG9zKSB7XG5cdFx0XHR2YXIgc2VsZiA9IHRoaXMsXG5cdFx0XHRcdCRzbGlkZSxcblx0XHRcdFx0aW5kZXg7XG5cblx0XHRcdGluZGV4ID0gcG9zICUgc2VsZi5ncm91cC5sZW5ndGg7XG5cdFx0XHRpbmRleCA9IGluZGV4IDwgMCA/IHNlbGYuZ3JvdXAubGVuZ3RoICsgaW5kZXggOiBpbmRleDtcblxuXHRcdFx0aWYgKCFzZWxmLnNsaWRlc1twb3NdICYmIHNlbGYuZ3JvdXBbaW5kZXhdKSB7XG5cdFx0XHRcdCRzbGlkZSA9ICQoJzxkaXYgY2xhc3M9XCJmYW5jeWJveC1zbGlkZVwiPjwvZGl2PicpLmFwcGVuZFRvKHNlbGYuJHJlZnMuc3RhZ2UpO1xuXG5cdFx0XHRcdHNlbGYuc2xpZGVzW3Bvc10gPSAkLmV4dGVuZCh0cnVlLCB7fSwgc2VsZi5ncm91cFtpbmRleF0sIHtcblx0XHRcdFx0XHRwb3M6IHBvcyxcblx0XHRcdFx0XHQkc2xpZGU6ICRzbGlkZSxcblx0XHRcdFx0XHRpc0xvYWRlZDogZmFsc2Vcblx0XHRcdFx0fSk7XG5cblx0XHRcdFx0c2VsZi51cGRhdGVTbGlkZShzZWxmLnNsaWRlc1twb3NdKTtcblx0XHRcdH1cblxuXHRcdFx0cmV0dXJuIHNlbGYuc2xpZGVzW3Bvc107XG5cdFx0fSxcblxuXHRcdC8vIFNjYWxlIGltYWdlIHRvIHRoZSBhY3R1YWwgc2l6ZSBvZiB0aGUgaW1hZ2U7XG5cdFx0Ly8geCBhbmQgeSB2YWx1ZXMgc2hvdWxkIGJlIHJlbGF0aXZlIHRvIHRoZSBzbGlkZVxuXHRcdC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuXHRcdHNjYWxlVG9BY3R1YWw6IGZ1bmN0aW9uKHgsIHksIGR1cmF0aW9uKSB7XG5cdFx0XHR2YXIgc2VsZiA9IHRoaXMsXG5cdFx0XHRcdGN1cnJlbnQgPSBzZWxmLmN1cnJlbnQsXG5cdFx0XHRcdCRjb250ZW50ID0gY3VycmVudC4kY29udGVudCxcblx0XHRcdFx0Y2FudmFzV2lkdGggPSAkLmZhbmN5Ym94LmdldFRyYW5zbGF0ZShjdXJyZW50LiRzbGlkZSkud2lkdGgsXG5cdFx0XHRcdGNhbnZhc0hlaWdodCA9ICQuZmFuY3lib3guZ2V0VHJhbnNsYXRlKGN1cnJlbnQuJHNsaWRlKS5oZWlnaHQsXG5cdFx0XHRcdG5ld0ltZ1dpZHRoID0gY3VycmVudC53aWR0aCxcblx0XHRcdFx0bmV3SW1nSGVpZ2h0ID0gY3VycmVudC5oZWlnaHQsXG5cdFx0XHRcdGltZ1Bvcyxcblx0XHRcdFx0cG9zWCxcblx0XHRcdFx0cG9zWSxcblx0XHRcdFx0c2NhbGVYLFxuXHRcdFx0XHRzY2FsZVk7XG5cblx0XHRcdGlmIChzZWxmLmlzQW5pbWF0aW5nIHx8IHNlbGYuaXNNb3ZlZCgpIHx8ICEkY29udGVudCB8fCAhKGN1cnJlbnQudHlwZSA9PSBcImltYWdlXCIgJiYgY3VycmVudC5pc0xvYWRlZCAmJiAhY3VycmVudC5oYXNFcnJvcikpIHtcblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0fVxuXG5cdFx0XHRzZWxmLmlzQW5pbWF0aW5nID0gdHJ1ZTtcblxuXHRcdFx0JC5mYW5jeWJveC5zdG9wKCRjb250ZW50KTtcblxuXHRcdFx0eCA9IHggPT09IHVuZGVmaW5lZCA/IGNhbnZhc1dpZHRoICogMC41IDogeDtcblx0XHRcdHkgPSB5ID09PSB1bmRlZmluZWQgPyBjYW52YXNIZWlnaHQgKiAwLjUgOiB5O1xuXG5cdFx0XHRpbWdQb3MgPSAkLmZhbmN5Ym94LmdldFRyYW5zbGF0ZSgkY29udGVudCk7XG5cblx0XHRcdGltZ1Bvcy50b3AgLT0gJC5mYW5jeWJveC5nZXRUcmFuc2xhdGUoY3VycmVudC4kc2xpZGUpLnRvcDtcblx0XHRcdGltZ1Bvcy5sZWZ0IC09ICQuZmFuY3lib3guZ2V0VHJhbnNsYXRlKGN1cnJlbnQuJHNsaWRlKS5sZWZ0O1xuXG5cdFx0XHRzY2FsZVggPSBuZXdJbWdXaWR0aCAvIGltZ1Bvcy53aWR0aDtcblx0XHRcdHNjYWxlWSA9IG5ld0ltZ0hlaWdodCAvIGltZ1Bvcy5oZWlnaHQ7XG5cblx0XHRcdC8vIEdldCBjZW50ZXIgcG9zaXRpb24gZm9yIG9yaWdpbmFsIGltYWdlXG5cdFx0XHRwb3NYID0gY2FudmFzV2lkdGggKiAwLjUgLSBuZXdJbWdXaWR0aCAqIDAuNTtcblx0XHRcdHBvc1kgPSBjYW52YXNIZWlnaHQgKiAwLjUgLSBuZXdJbWdIZWlnaHQgKiAwLjU7XG5cblx0XHRcdC8vIE1ha2Ugc3VyZSBpbWFnZSBkb2VzIG5vdCBtb3ZlIGF3YXkgZnJvbSBlZGdlc1xuXHRcdFx0aWYgKG5ld0ltZ1dpZHRoID4gY2FudmFzV2lkdGgpIHtcblx0XHRcdFx0cG9zWCA9IGltZ1Bvcy5sZWZ0ICogc2NhbGVYIC0gKHggKiBzY2FsZVggLSB4KTtcblxuXHRcdFx0XHRpZiAocG9zWCA+IDApIHtcblx0XHRcdFx0XHRwb3NYID0gMDtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdGlmIChwb3NYIDwgY2FudmFzV2lkdGggLSBuZXdJbWdXaWR0aCkge1xuXHRcdFx0XHRcdHBvc1ggPSBjYW52YXNXaWR0aCAtIG5ld0ltZ1dpZHRoO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cblx0XHRcdGlmIChuZXdJbWdIZWlnaHQgPiBjYW52YXNIZWlnaHQpIHtcblx0XHRcdFx0cG9zWSA9IGltZ1Bvcy50b3AgKiBzY2FsZVkgLSAoeSAqIHNjYWxlWSAtIHkpO1xuXG5cdFx0XHRcdGlmIChwb3NZID4gMCkge1xuXHRcdFx0XHRcdHBvc1kgPSAwO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0aWYgKHBvc1kgPCBjYW52YXNIZWlnaHQgLSBuZXdJbWdIZWlnaHQpIHtcblx0XHRcdFx0XHRwb3NZID0gY2FudmFzSGVpZ2h0IC0gbmV3SW1nSGVpZ2h0O1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cblx0XHRcdHNlbGYudXBkYXRlQ3Vyc29yKG5ld0ltZ1dpZHRoLCBuZXdJbWdIZWlnaHQpO1xuXG5cdFx0XHQkLmZhbmN5Ym94LmFuaW1hdGUoXG5cdFx0XHRcdCRjb250ZW50LFxuXHRcdFx0XHR7XG5cdFx0XHRcdFx0dG9wOiBwb3NZLFxuXHRcdFx0XHRcdGxlZnQ6IHBvc1gsXG5cdFx0XHRcdFx0c2NhbGVYOiBzY2FsZVgsXG5cdFx0XHRcdFx0c2NhbGVZOiBzY2FsZVlcblx0XHRcdFx0fSxcblx0XHRcdFx0ZHVyYXRpb24gfHwgMzMwLFxuXHRcdFx0XHRmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRzZWxmLmlzQW5pbWF0aW5nID0gZmFsc2U7XG5cdFx0XHRcdH1cblx0XHRcdCk7XG5cblx0XHRcdC8vIFN0b3Agc2xpZGVzaG93XG5cdFx0XHRpZiAoc2VsZi5TbGlkZVNob3cgJiYgc2VsZi5TbGlkZVNob3cuaXNBY3RpdmUpIHtcblx0XHRcdFx0c2VsZi5TbGlkZVNob3cuc3RvcCgpO1xuXHRcdFx0fVxuXHRcdH0sXG5cblx0XHQvLyBTY2FsZSBpbWFnZSB0byBmaXQgaW5zaWRlIHBhcmVudCBlbGVtZW50XG5cdFx0Ly8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG5cdFx0c2NhbGVUb0ZpdDogZnVuY3Rpb24oZHVyYXRpb24pIHtcblx0XHRcdHZhciBzZWxmID0gdGhpcyxcblx0XHRcdFx0Y3VycmVudCA9IHNlbGYuY3VycmVudCxcblx0XHRcdFx0JGNvbnRlbnQgPSBjdXJyZW50LiRjb250ZW50LFxuXHRcdFx0XHRlbmQ7XG5cblx0XHRcdGlmIChzZWxmLmlzQW5pbWF0aW5nIHx8IHNlbGYuaXNNb3ZlZCgpIHx8ICEkY29udGVudCB8fCAhKGN1cnJlbnQudHlwZSA9PSBcImltYWdlXCIgJiYgY3VycmVudC5pc0xvYWRlZCAmJiAhY3VycmVudC5oYXNFcnJvcikpIHtcblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0fVxuXG5cdFx0XHRzZWxmLmlzQW5pbWF0aW5nID0gdHJ1ZTtcblxuXHRcdFx0JC5mYW5jeWJveC5zdG9wKCRjb250ZW50KTtcblxuXHRcdFx0ZW5kID0gc2VsZi5nZXRGaXRQb3MoY3VycmVudCk7XG5cblx0XHRcdHNlbGYudXBkYXRlQ3Vyc29yKGVuZC53aWR0aCwgZW5kLmhlaWdodCk7XG5cblx0XHRcdCQuZmFuY3lib3guYW5pbWF0ZShcblx0XHRcdFx0JGNvbnRlbnQsXG5cdFx0XHRcdHtcblx0XHRcdFx0XHR0b3A6IGVuZC50b3AsXG5cdFx0XHRcdFx0bGVmdDogZW5kLmxlZnQsXG5cdFx0XHRcdFx0c2NhbGVYOiBlbmQud2lkdGggLyAkY29udGVudC53aWR0aCgpLFxuXHRcdFx0XHRcdHNjYWxlWTogZW5kLmhlaWdodCAvICRjb250ZW50LmhlaWdodCgpXG5cdFx0XHRcdH0sXG5cdFx0XHRcdGR1cmF0aW9uIHx8IDMzMCxcblx0XHRcdFx0ZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0c2VsZi5pc0FuaW1hdGluZyA9IGZhbHNlO1xuXHRcdFx0XHR9XG5cdFx0XHQpO1xuXHRcdH0sXG5cblx0XHQvLyBDYWxjdWxhdGUgaW1hZ2Ugc2l6ZSB0byBmaXQgaW5zaWRlIHZpZXdwb3J0XG5cdFx0Ly8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG5cdFx0Z2V0Rml0UG9zOiBmdW5jdGlvbihzbGlkZSkge1xuXHRcdFx0dmFyIHNlbGYgPSB0aGlzLFxuXHRcdFx0XHQkY29udGVudCA9IHNsaWRlLiRjb250ZW50LFxuXHRcdFx0XHQkc2xpZGUgPSBzbGlkZS4kc2xpZGUsXG5cdFx0XHRcdHdpZHRoID0gc2xpZGUud2lkdGggfHwgc2xpZGUub3B0cy53aWR0aCxcblx0XHRcdFx0aGVpZ2h0ID0gc2xpZGUuaGVpZ2h0IHx8IHNsaWRlLm9wdHMuaGVpZ2h0LFxuXHRcdFx0XHRtYXhXaWR0aCxcblx0XHRcdFx0bWF4SGVpZ2h0LFxuXHRcdFx0XHRtaW5SYXRpbyxcblx0XHRcdFx0YXNwZWN0UmF0aW8sXG5cdFx0XHRcdHJleiA9IHt9O1xuXG5cdFx0XHRpZiAoIXNsaWRlLmlzTG9hZGVkIHx8ICEkY29udGVudCB8fCAhJGNvbnRlbnQubGVuZ3RoKSB7XG5cdFx0XHRcdHJldHVybiBmYWxzZTtcblx0XHRcdH1cblxuXHRcdFx0bWF4V2lkdGggPSAkLmZhbmN5Ym94LmdldFRyYW5zbGF0ZShzZWxmLiRyZWZzLnN0YWdlKS53aWR0aDtcblx0XHRcdG1heEhlaWdodCA9ICQuZmFuY3lib3guZ2V0VHJhbnNsYXRlKHNlbGYuJHJlZnMuc3RhZ2UpLmhlaWdodDtcblxuXHRcdFx0bWF4V2lkdGggLT1cblx0XHRcdFx0cGFyc2VGbG9hdCgkc2xpZGUuY3NzKFwicGFkZGluZ0xlZnRcIikpICtcblx0XHRcdFx0cGFyc2VGbG9hdCgkc2xpZGUuY3NzKFwicGFkZGluZ1JpZ2h0XCIpKSArXG5cdFx0XHRcdHBhcnNlRmxvYXQoJGNvbnRlbnQuY3NzKFwibWFyZ2luTGVmdFwiKSkgK1xuXHRcdFx0XHRwYXJzZUZsb2F0KCRjb250ZW50LmNzcyhcIm1hcmdpblJpZ2h0XCIpKTtcblxuXHRcdFx0bWF4SGVpZ2h0IC09XG5cdFx0XHRcdHBhcnNlRmxvYXQoJHNsaWRlLmNzcyhcInBhZGRpbmdUb3BcIikpICtcblx0XHRcdFx0cGFyc2VGbG9hdCgkc2xpZGUuY3NzKFwicGFkZGluZ0JvdHRvbVwiKSkgK1xuXHRcdFx0XHRwYXJzZUZsb2F0KCRjb250ZW50LmNzcyhcIm1hcmdpblRvcFwiKSkgK1xuXHRcdFx0XHRwYXJzZUZsb2F0KCRjb250ZW50LmNzcyhcIm1hcmdpbkJvdHRvbVwiKSk7XG5cblx0XHRcdGlmICghd2lkdGggfHwgIWhlaWdodCkge1xuXHRcdFx0XHR3aWR0aCA9IG1heFdpZHRoO1xuXHRcdFx0XHRoZWlnaHQgPSBtYXhIZWlnaHQ7XG5cdFx0XHR9XG5cblx0XHRcdG1pblJhdGlvID0gTWF0aC5taW4oMSwgbWF4V2lkdGggLyB3aWR0aCwgbWF4SGVpZ2h0IC8gaGVpZ2h0KTtcblxuXHRcdFx0d2lkdGggPSBtaW5SYXRpbyAqIHdpZHRoO1xuXHRcdFx0aGVpZ2h0ID0gbWluUmF0aW8gKiBoZWlnaHQ7XG5cblx0XHRcdC8vIEFkanVzdCB3aWR0aC9oZWlnaHQgdG8gcHJlY2lzZWx5IGZpdCBpbnRvIGNvbnRhaW5lclxuXHRcdFx0aWYgKHdpZHRoID4gbWF4V2lkdGggLSAwLjUpIHtcblx0XHRcdFx0d2lkdGggPSBtYXhXaWR0aDtcblx0XHRcdH1cblxuXHRcdFx0aWYgKGhlaWdodCA+IG1heEhlaWdodCAtIDAuNSkge1xuXHRcdFx0XHRoZWlnaHQgPSBtYXhIZWlnaHQ7XG5cdFx0XHR9XG5cblx0XHRcdGlmIChzbGlkZS50eXBlID09PSBcImltYWdlXCIpIHtcblx0XHRcdFx0cmV6LnRvcCA9IE1hdGguZmxvb3IoKG1heEhlaWdodCAtIGhlaWdodCkgKiAwLjUpICsgcGFyc2VGbG9hdCgkc2xpZGUuY3NzKFwicGFkZGluZ1RvcFwiKSk7XG5cdFx0XHRcdHJlei5sZWZ0ID0gTWF0aC5mbG9vcigobWF4V2lkdGggLSB3aWR0aCkgKiAwLjUpICsgcGFyc2VGbG9hdCgkc2xpZGUuY3NzKFwicGFkZGluZ0xlZnRcIikpO1xuXHRcdFx0fSBlbHNlIGlmIChzbGlkZS5jb250ZW50VHlwZSA9PT0gXCJ2aWRlb1wiKSB7XG5cdFx0XHRcdC8vIEZvcmNlIGFzcGVjdCByYXRpbyBmb3IgdGhlIHZpZGVvXG5cdFx0XHRcdC8vIFwiSSBzYXkgdGhlIHdob2xlIHdvcmxkIG11c3QgbGVhcm4gb2Ygb3VyIHBlYWNlZnVsIHdheXPigKYgYnkgZm9yY2UhXCJcblx0XHRcdFx0YXNwZWN0UmF0aW8gPSBzbGlkZS5vcHRzLndpZHRoICYmIHNsaWRlLm9wdHMuaGVpZ2h0ID8gd2lkdGggLyBoZWlnaHQgOiBzbGlkZS5vcHRzLnJhdGlvIHx8IDE2IC8gOTtcblxuXHRcdFx0XHRpZiAoaGVpZ2h0ID4gd2lkdGggLyBhc3BlY3RSYXRpbykge1xuXHRcdFx0XHRcdGhlaWdodCA9IHdpZHRoIC8gYXNwZWN0UmF0aW87XG5cdFx0XHRcdH0gZWxzZSBpZiAod2lkdGggPiBoZWlnaHQgKiBhc3BlY3RSYXRpbykge1xuXHRcdFx0XHRcdHdpZHRoID0gaGVpZ2h0ICogYXNwZWN0UmF0aW87XG5cdFx0XHRcdH1cblx0XHRcdH1cblxuXHRcdFx0cmV6LndpZHRoID0gd2lkdGg7XG5cdFx0XHRyZXouaGVpZ2h0ID0gaGVpZ2h0O1xuXG5cdFx0XHRyZXR1cm4gcmV6O1xuXHRcdH0sXG5cblx0XHQvLyBVcGRhdGUgY29udGVudCBzaXplIGFuZCBwb3NpdGlvbiBmb3IgYWxsIHNsaWRlc1xuXHRcdC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuXHRcdHVwZGF0ZTogZnVuY3Rpb24oZSkge1xuXHRcdFx0dmFyIHNlbGYgPSB0aGlzO1xuXG5cdFx0XHQkLmVhY2goc2VsZi5zbGlkZXMsIGZ1bmN0aW9uKGtleSwgc2xpZGUpIHtcblx0XHRcdFx0c2VsZi51cGRhdGVTbGlkZShzbGlkZSwgZSk7XG5cdFx0XHR9KTtcblx0XHR9LFxuXG5cdFx0Ly8gVXBkYXRlIHNsaWRlIGNvbnRlbnQgcG9zaXRpb24gYW5kIHNpemVcblx0XHQvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG5cdFx0dXBkYXRlU2xpZGU6IGZ1bmN0aW9uKHNsaWRlLCBlKSB7XG5cdFx0XHR2YXIgc2VsZiA9IHRoaXMsXG5cdFx0XHRcdCRjb250ZW50ID0gc2xpZGUgJiYgc2xpZGUuJGNvbnRlbnQsXG5cdFx0XHRcdHdpZHRoID0gc2xpZGUud2lkdGggfHwgc2xpZGUub3B0cy53aWR0aCxcblx0XHRcdFx0aGVpZ2h0ID0gc2xpZGUuaGVpZ2h0IHx8IHNsaWRlLm9wdHMuaGVpZ2h0LFxuXHRcdFx0XHQkc2xpZGUgPSBzbGlkZS4kc2xpZGU7XG5cblx0XHRcdC8vIEZpcnN0LCBwcmV2ZW50IGNhcHRpb24gb3ZlcmxhcCwgaWYgbmVlZGVkXG5cdFx0XHRzZWxmLmFkanVzdENhcHRpb24oc2xpZGUpO1xuXG5cdFx0XHQvLyBUaGVuIHJlc2l6ZSBjb250ZW50IHRvIGZpdCBpbnNpZGUgdGhlIHNsaWRlXG5cdFx0XHRpZiAoJGNvbnRlbnQgJiYgKHdpZHRoIHx8IGhlaWdodCB8fCBzbGlkZS5jb250ZW50VHlwZSA9PT0gXCJ2aWRlb1wiKSAmJiAhc2xpZGUuaGFzRXJyb3IpIHtcblx0XHRcdFx0JC5mYW5jeWJveC5zdG9wKCRjb250ZW50KTtcblxuXHRcdFx0XHQkLmZhbmN5Ym94LnNldFRyYW5zbGF0ZSgkY29udGVudCwgc2VsZi5nZXRGaXRQb3Moc2xpZGUpKTtcblxuXHRcdFx0XHRpZiAoc2xpZGUucG9zID09PSBzZWxmLmN1cnJQb3MpIHtcblx0XHRcdFx0XHRzZWxmLmlzQW5pbWF0aW5nID0gZmFsc2U7XG5cblx0XHRcdFx0XHRzZWxmLnVwZGF0ZUN1cnNvcigpO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cblx0XHRcdC8vIFRoZW4gc29tZSBhZGp1c3RtZW50c1xuXHRcdFx0c2VsZi5hZGp1c3RMYXlvdXQoc2xpZGUpO1xuXG5cdFx0XHRpZiAoJHNsaWRlLmxlbmd0aCkge1xuXHRcdFx0XHQkc2xpZGUudHJpZ2dlcihcInJlZnJlc2hcIik7XG5cblx0XHRcdFx0aWYgKHNsaWRlLnBvcyA9PT0gc2VsZi5jdXJyUG9zKSB7XG5cdFx0XHRcdFx0c2VsZi4kcmVmcy50b29sYmFyXG5cdFx0XHRcdFx0XHQuYWRkKHNlbGYuJHJlZnMubmF2aWdhdGlvbi5maW5kKFwiLmZhbmN5Ym94LWJ1dHRvbi0tYXJyb3dfcmlnaHRcIikpXG5cdFx0XHRcdFx0XHQudG9nZ2xlQ2xhc3MoXCJjb21wZW5zYXRlLWZvci1zY3JvbGxiYXJcIiwgJHNsaWRlLmdldCgwKS5zY3JvbGxIZWlnaHQgPiAkc2xpZGUuZ2V0KDApLmNsaWVudEhlaWdodCk7XG5cdFx0XHRcdH1cblx0XHRcdH1cblxuXHRcdFx0c2VsZi50cmlnZ2VyKFwib25VcGRhdGVcIiwgc2xpZGUsIGUpO1xuXHRcdH0sXG5cblx0XHQvLyBIb3Jpem9udGFsbHkgY2VudGVyIHNsaWRlXG5cdFx0Ly8gPT09PT09PT09PT09PT09PT09PT09PT09PVxuXG5cdFx0Y2VudGVyU2xpZGU6IGZ1bmN0aW9uKGR1cmF0aW9uKSB7XG5cdFx0XHR2YXIgc2VsZiA9IHRoaXMsXG5cdFx0XHRcdGN1cnJlbnQgPSBzZWxmLmN1cnJlbnQsXG5cdFx0XHRcdCRzbGlkZSA9IGN1cnJlbnQuJHNsaWRlO1xuXG5cdFx0XHRpZiAoc2VsZi5pc0Nsb3NpbmcgfHwgIWN1cnJlbnQpIHtcblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0fVxuXG5cdFx0XHQkc2xpZGUuc2libGluZ3MoKS5jc3Moe1xuXHRcdFx0XHR0cmFuc2Zvcm06IFwiXCIsXG5cdFx0XHRcdG9wYWNpdHk6IFwiXCJcblx0XHRcdH0pO1xuXG5cdFx0XHQkc2xpZGVcblx0XHRcdFx0LnBhcmVudCgpXG5cdFx0XHRcdC5jaGlsZHJlbigpXG5cdFx0XHRcdC5yZW1vdmVDbGFzcyhcImZhbmN5Ym94LXNsaWRlLS1wcmV2aW91cyBmYW5jeWJveC1zbGlkZS0tbmV4dFwiKTtcblxuXHRcdFx0JC5mYW5jeWJveC5hbmltYXRlKFxuXHRcdFx0XHQkc2xpZGUsXG5cdFx0XHRcdHtcblx0XHRcdFx0XHR0b3A6IDAsXG5cdFx0XHRcdFx0bGVmdDogMCxcblx0XHRcdFx0XHRvcGFjaXR5OiAxXG5cdFx0XHRcdH0sXG5cdFx0XHRcdGR1cmF0aW9uID09PSB1bmRlZmluZWQgPyAwIDogZHVyYXRpb24sXG5cdFx0XHRcdGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdC8vIENsZWFuIHVwXG5cdFx0XHRcdFx0JHNsaWRlLmNzcyh7XG5cdFx0XHRcdFx0XHR0cmFuc2Zvcm06IFwiXCIsXG5cdFx0XHRcdFx0XHRvcGFjaXR5OiBcIlwiXG5cdFx0XHRcdFx0fSk7XG5cblx0XHRcdFx0XHRpZiAoIWN1cnJlbnQuaXNDb21wbGV0ZSkge1xuXHRcdFx0XHRcdFx0c2VsZi5jb21wbGV0ZSgpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fSxcblx0XHRcdFx0ZmFsc2Vcblx0XHRcdCk7XG5cdFx0fSxcblxuXHRcdC8vIENoZWNrIGlmIGN1cnJlbnQgc2xpZGUgaXMgbW92ZWQgKHN3aXBlZClcblx0XHQvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cblx0XHRpc01vdmVkOiBmdW5jdGlvbihzbGlkZSkge1xuXHRcdFx0dmFyIGN1cnJlbnQgPSBzbGlkZSB8fCB0aGlzLmN1cnJlbnQsXG5cdFx0XHRcdHNsaWRlUG9zLFxuXHRcdFx0XHRzdGFnZVBvcztcblxuXHRcdFx0aWYgKCFjdXJyZW50KSB7XG5cdFx0XHRcdHJldHVybiBmYWxzZTtcblx0XHRcdH1cblxuXHRcdFx0c3RhZ2VQb3MgPSAkLmZhbmN5Ym94LmdldFRyYW5zbGF0ZSh0aGlzLiRyZWZzLnN0YWdlKTtcblx0XHRcdHNsaWRlUG9zID0gJC5mYW5jeWJveC5nZXRUcmFuc2xhdGUoY3VycmVudC4kc2xpZGUpO1xuXG5cdFx0XHRyZXR1cm4gKFxuXHRcdFx0XHQhY3VycmVudC4kc2xpZGUuaGFzQ2xhc3MoXCJmYW5jeWJveC1hbmltYXRlZFwiKSAmJlxuXHRcdFx0XHQoTWF0aC5hYnMoc2xpZGVQb3MudG9wIC0gc3RhZ2VQb3MudG9wKSA+IDAuNSB8fCBNYXRoLmFicyhzbGlkZVBvcy5sZWZ0IC0gc3RhZ2VQb3MubGVmdCkgPiAwLjUpXG5cdFx0XHQpO1xuXHRcdH0sXG5cblx0XHQvLyBVcGRhdGUgY3Vyc29yIHN0eWxlIGRlcGVuZGluZyBpZiBjb250ZW50IGNhbiBiZSB6b29tZWRcblx0XHQvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuXHRcdHVwZGF0ZUN1cnNvcjogZnVuY3Rpb24obmV4dFdpZHRoLCBuZXh0SGVpZ2h0KSB7XG5cdFx0XHR2YXIgc2VsZiA9IHRoaXMsXG5cdFx0XHRcdGN1cnJlbnQgPSBzZWxmLmN1cnJlbnQsXG5cdFx0XHRcdCRjb250YWluZXIgPSBzZWxmLiRyZWZzLmNvbnRhaW5lcixcblx0XHRcdFx0Y2FuUGFuLFxuXHRcdFx0XHRpc1pvb21hYmxlO1xuXG5cdFx0XHRpZiAoIWN1cnJlbnQgfHwgc2VsZi5pc0Nsb3NpbmcgfHwgIXNlbGYuR3Vlc3R1cmVzKSB7XG5cdFx0XHRcdHJldHVybjtcblx0XHRcdH1cblxuXHRcdFx0JGNvbnRhaW5lci5yZW1vdmVDbGFzcyhcImZhbmN5Ym94LWlzLXpvb21hYmxlIGZhbmN5Ym94LWNhbi16b29tSW4gZmFuY3lib3gtY2FuLXpvb21PdXQgZmFuY3lib3gtY2FuLXN3aXBlIGZhbmN5Ym94LWNhbi1wYW5cIik7XG5cblx0XHRcdGNhblBhbiA9IHNlbGYuY2FuUGFuKG5leHRXaWR0aCwgbmV4dEhlaWdodCk7XG5cblx0XHRcdGlzWm9vbWFibGUgPSBjYW5QYW4gPyB0cnVlIDogc2VsZi5pc1pvb21hYmxlKCk7XG5cblx0XHRcdCRjb250YWluZXIudG9nZ2xlQ2xhc3MoXCJmYW5jeWJveC1pcy16b29tYWJsZVwiLCBpc1pvb21hYmxlKTtcblxuXHRcdFx0JChcIltkYXRhLWZhbmN5Ym94LXpvb21dXCIpLnByb3AoXCJkaXNhYmxlZFwiLCAhaXNab29tYWJsZSk7XG5cblx0XHRcdGlmIChjYW5QYW4pIHtcblx0XHRcdFx0JGNvbnRhaW5lci5hZGRDbGFzcyhcImZhbmN5Ym94LWNhbi1wYW5cIik7XG5cdFx0XHR9IGVsc2UgaWYgKFxuXHRcdFx0XHRpc1pvb21hYmxlICYmXG5cdFx0XHRcdChjdXJyZW50Lm9wdHMuY2xpY2tDb250ZW50ID09PSBcInpvb21cIiB8fCAoJC5pc0Z1bmN0aW9uKGN1cnJlbnQub3B0cy5jbGlja0NvbnRlbnQpICYmIGN1cnJlbnQub3B0cy5jbGlja0NvbnRlbnQoY3VycmVudCkgPT0gXCJ6b29tXCIpKVxuXHRcdFx0KSB7XG5cdFx0XHRcdCRjb250YWluZXIuYWRkQ2xhc3MoXCJmYW5jeWJveC1jYW4tem9vbUluXCIpO1xuXHRcdFx0fSBlbHNlIGlmIChjdXJyZW50Lm9wdHMudG91Y2ggJiYgKGN1cnJlbnQub3B0cy50b3VjaC52ZXJ0aWNhbCB8fCBzZWxmLmdyb3VwLmxlbmd0aCA+IDEpICYmIGN1cnJlbnQuY29udGVudFR5cGUgIT09IFwidmlkZW9cIikge1xuXHRcdFx0XHQkY29udGFpbmVyLmFkZENsYXNzKFwiZmFuY3lib3gtY2FuLXN3aXBlXCIpO1xuXHRcdFx0fVxuXHRcdH0sXG5cblx0XHQvLyBDaGVjayBpZiBjdXJyZW50IHNsaWRlIGlzIHpvb21hYmxlXG5cdFx0Ly8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG5cdFx0aXNab29tYWJsZTogZnVuY3Rpb24oKSB7XG5cdFx0XHR2YXIgc2VsZiA9IHRoaXMsXG5cdFx0XHRcdGN1cnJlbnQgPSBzZWxmLmN1cnJlbnQsXG5cdFx0XHRcdGZpdFBvcztcblxuXHRcdFx0Ly8gQXNzdW1lIHRoYXQgc2xpZGUgaXMgem9vbWFibGUgaWY6XG5cdFx0XHQvLyAgIC0gaW1hZ2UgaXMgc3RpbGwgbG9hZGluZ1xuXHRcdFx0Ly8gICAtIGFjdHVhbCBzaXplIG9mIHRoZSBpbWFnZSBpcyBzbWFsbGVyIHRoYW4gYXZhaWxhYmxlIGFyZWFcblx0XHRcdGlmIChjdXJyZW50ICYmICFzZWxmLmlzQ2xvc2luZyAmJiBjdXJyZW50LnR5cGUgPT09IFwiaW1hZ2VcIiAmJiAhY3VycmVudC5oYXNFcnJvcikge1xuXHRcdFx0XHRpZiAoIWN1cnJlbnQuaXNMb2FkZWQpIHtcblx0XHRcdFx0XHRyZXR1cm4gdHJ1ZTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdGZpdFBvcyA9IHNlbGYuZ2V0Rml0UG9zKGN1cnJlbnQpO1xuXG5cdFx0XHRcdGlmIChmaXRQb3MgJiYgKGN1cnJlbnQud2lkdGggPiBmaXRQb3Mud2lkdGggfHwgY3VycmVudC5oZWlnaHQgPiBmaXRQb3MuaGVpZ2h0KSkge1xuXHRcdFx0XHRcdHJldHVybiB0cnVlO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cblx0XHRcdHJldHVybiBmYWxzZTtcblx0XHR9LFxuXG5cdFx0Ly8gQ2hlY2sgaWYgY3VycmVudCBpbWFnZSBkaW1lbnNpb25zIGFyZSBzbWFsbGVyIHRoYW4gYWN0dWFsXG5cdFx0Ly8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cblx0XHRpc1NjYWxlZERvd246IGZ1bmN0aW9uKG5leHRXaWR0aCwgbmV4dEhlaWdodCkge1xuXHRcdFx0dmFyIHNlbGYgPSB0aGlzLFxuXHRcdFx0XHRyZXogPSBmYWxzZSxcblx0XHRcdFx0Y3VycmVudCA9IHNlbGYuY3VycmVudCxcblx0XHRcdFx0JGNvbnRlbnQgPSBjdXJyZW50LiRjb250ZW50O1xuXG5cdFx0XHRpZiAobmV4dFdpZHRoICE9PSB1bmRlZmluZWQgJiYgbmV4dEhlaWdodCAhPT0gdW5kZWZpbmVkKSB7XG5cdFx0XHRcdHJleiA9IG5leHRXaWR0aCA8IGN1cnJlbnQud2lkdGggJiYgbmV4dEhlaWdodCA8IGN1cnJlbnQuaGVpZ2h0O1xuXHRcdFx0fSBlbHNlIGlmICgkY29udGVudCkge1xuXHRcdFx0XHRyZXogPSAkLmZhbmN5Ym94LmdldFRyYW5zbGF0ZSgkY29udGVudCk7XG5cdFx0XHRcdHJleiA9IHJlei53aWR0aCA8IGN1cnJlbnQud2lkdGggJiYgcmV6LmhlaWdodCA8IGN1cnJlbnQuaGVpZ2h0O1xuXHRcdFx0fVxuXG5cdFx0XHRyZXR1cm4gcmV6O1xuXHRcdH0sXG5cblx0XHQvLyBDaGVjayBpZiBpbWFnZSBkaW1lbnNpb25zIGV4Y2VlZCBwYXJlbnQgZWxlbWVudFxuXHRcdC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cblx0XHRjYW5QYW46IGZ1bmN0aW9uKG5leHRXaWR0aCwgbmV4dEhlaWdodCkge1xuXHRcdFx0dmFyIHNlbGYgPSB0aGlzLFxuXHRcdFx0XHRjdXJyZW50ID0gc2VsZi5jdXJyZW50LFxuXHRcdFx0XHRwb3MgPSBudWxsLFxuXHRcdFx0XHRyZXogPSBmYWxzZTtcblxuXHRcdFx0aWYgKGN1cnJlbnQudHlwZSA9PT0gXCJpbWFnZVwiICYmIChjdXJyZW50LmlzQ29tcGxldGUgfHwgKG5leHRXaWR0aCAmJiBuZXh0SGVpZ2h0KSkgJiYgIWN1cnJlbnQuaGFzRXJyb3IpIHtcblx0XHRcdFx0cmV6ID0gc2VsZi5nZXRGaXRQb3MoY3VycmVudCk7XG5cblx0XHRcdFx0aWYgKG5leHRXaWR0aCAhPT0gdW5kZWZpbmVkICYmIG5leHRIZWlnaHQgIT09IHVuZGVmaW5lZCkge1xuXHRcdFx0XHRcdHBvcyA9IHt3aWR0aDogbmV4dFdpZHRoLCBoZWlnaHQ6IG5leHRIZWlnaHR9O1xuXHRcdFx0XHR9IGVsc2UgaWYgKGN1cnJlbnQuaXNDb21wbGV0ZSkge1xuXHRcdFx0XHRcdHBvcyA9ICQuZmFuY3lib3guZ2V0VHJhbnNsYXRlKGN1cnJlbnQuJGNvbnRlbnQpO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0aWYgKHBvcyAmJiByZXopIHtcblx0XHRcdFx0XHRyZXogPSBNYXRoLmFicyhwb3Mud2lkdGggLSByZXoud2lkdGgpID4gMS41IHx8IE1hdGguYWJzKHBvcy5oZWlnaHQgLSByZXouaGVpZ2h0KSA+IDEuNTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXG5cdFx0XHRyZXR1cm4gcmV6O1xuXHRcdH0sXG5cblx0XHQvLyBMb2FkIGNvbnRlbnQgaW50byB0aGUgc2xpZGVcblx0XHQvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuXHRcdGxvYWRTbGlkZTogZnVuY3Rpb24oc2xpZGUpIHtcblx0XHRcdHZhciBzZWxmID0gdGhpcyxcblx0XHRcdFx0dHlwZSxcblx0XHRcdFx0JHNsaWRlLFxuXHRcdFx0XHRhamF4TG9hZDtcblxuXHRcdFx0aWYgKHNsaWRlLmlzTG9hZGluZyB8fCBzbGlkZS5pc0xvYWRlZCkge1xuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR9XG5cblx0XHRcdHNsaWRlLmlzTG9hZGluZyA9IHRydWU7XG5cblx0XHRcdGlmIChzZWxmLnRyaWdnZXIoXCJiZWZvcmVMb2FkXCIsIHNsaWRlKSA9PT0gZmFsc2UpIHtcblx0XHRcdFx0c2xpZGUuaXNMb2FkaW5nID0gZmFsc2U7XG5cblx0XHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdFx0fVxuXG5cdFx0XHR0eXBlID0gc2xpZGUudHlwZTtcblx0XHRcdCRzbGlkZSA9IHNsaWRlLiRzbGlkZTtcblxuXHRcdFx0JHNsaWRlXG5cdFx0XHRcdC5vZmYoXCJyZWZyZXNoXCIpXG5cdFx0XHRcdC50cmlnZ2VyKFwib25SZXNldFwiKVxuXHRcdFx0XHQuYWRkQ2xhc3Moc2xpZGUub3B0cy5zbGlkZUNsYXNzKTtcblxuXHRcdFx0Ly8gQ3JlYXRlIGNvbnRlbnQgZGVwZW5kaW5nIG9uIHRoZSB0eXBlXG5cdFx0XHRzd2l0Y2ggKHR5cGUpIHtcblx0XHRcdFx0Y2FzZSBcImltYWdlXCI6XG5cdFx0XHRcdFx0c2VsZi5zZXRJbWFnZShzbGlkZSk7XG5cblx0XHRcdFx0XHRicmVhaztcblxuXHRcdFx0XHRjYXNlIFwiaWZyYW1lXCI6XG5cdFx0XHRcdFx0c2VsZi5zZXRJZnJhbWUoc2xpZGUpO1xuXG5cdFx0XHRcdFx0YnJlYWs7XG5cblx0XHRcdFx0Y2FzZSBcImh0bWxcIjpcblx0XHRcdFx0XHRzZWxmLnNldENvbnRlbnQoc2xpZGUsIHNsaWRlLnNyYyB8fCBzbGlkZS5jb250ZW50KTtcblxuXHRcdFx0XHRcdGJyZWFrO1xuXG5cdFx0XHRcdGNhc2UgXCJ2aWRlb1wiOlxuXHRcdFx0XHRcdHNlbGYuc2V0Q29udGVudChcblx0XHRcdFx0XHRcdHNsaWRlLFxuXHRcdFx0XHRcdFx0c2xpZGUub3B0cy52aWRlby50cGxcblx0XHRcdFx0XHRcdFx0LnJlcGxhY2UoL1xce1xce3NyY1xcfVxcfS9naSwgc2xpZGUuc3JjKVxuXHRcdFx0XHRcdFx0XHQucmVwbGFjZShcInt7Zm9ybWF0fX1cIiwgc2xpZGUub3B0cy52aWRlb0Zvcm1hdCB8fCBzbGlkZS5vcHRzLnZpZGVvLmZvcm1hdCB8fCBcIlwiKVxuXHRcdFx0XHRcdFx0XHQucmVwbGFjZShcInt7cG9zdGVyfX1cIiwgc2xpZGUudGh1bWIgfHwgXCJcIilcblx0XHRcdFx0XHQpO1xuXG5cdFx0XHRcdFx0YnJlYWs7XG5cblx0XHRcdFx0Y2FzZSBcImlubGluZVwiOlxuXHRcdFx0XHRcdGlmICgkKHNsaWRlLnNyYykubGVuZ3RoKSB7XG5cdFx0XHRcdFx0XHRzZWxmLnNldENvbnRlbnQoc2xpZGUsICQoc2xpZGUuc3JjKSk7XG5cdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdHNlbGYuc2V0RXJyb3Ioc2xpZGUpO1xuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdGJyZWFrO1xuXG5cdFx0XHRcdGNhc2UgXCJhamF4XCI6XG5cdFx0XHRcdFx0c2VsZi5zaG93TG9hZGluZyhzbGlkZSk7XG5cblx0XHRcdFx0XHRhamF4TG9hZCA9ICQuYWpheChcblx0XHRcdFx0XHRcdCQuZXh0ZW5kKHt9LCBzbGlkZS5vcHRzLmFqYXguc2V0dGluZ3MsIHtcblx0XHRcdFx0XHRcdFx0dXJsOiBzbGlkZS5zcmMsXG5cdFx0XHRcdFx0XHRcdHN1Y2Nlc3M6IGZ1bmN0aW9uKGRhdGEsIHRleHRTdGF0dXMpIHtcblx0XHRcdFx0XHRcdFx0XHRpZiAodGV4dFN0YXR1cyA9PT0gXCJzdWNjZXNzXCIpIHtcblx0XHRcdFx0XHRcdFx0XHRcdHNlbGYuc2V0Q29udGVudChzbGlkZSwgZGF0YSk7XG5cdFx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdFx0XHRlcnJvcjogZnVuY3Rpb24oanFYSFIsIHRleHRTdGF0dXMpIHtcblx0XHRcdFx0XHRcdFx0XHRpZiAoanFYSFIgJiYgdGV4dFN0YXR1cyAhPT0gXCJhYm9ydFwiKSB7XG5cdFx0XHRcdFx0XHRcdFx0XHRzZWxmLnNldEVycm9yKHNsaWRlKTtcblx0XHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdH0pXG5cdFx0XHRcdFx0KTtcblxuXHRcdFx0XHRcdCRzbGlkZS5vbmUoXCJvblJlc2V0XCIsIGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdFx0YWpheExvYWQuYWJvcnQoKTtcblx0XHRcdFx0XHR9KTtcblxuXHRcdFx0XHRcdGJyZWFrO1xuXG5cdFx0XHRcdGRlZmF1bHQ6XG5cdFx0XHRcdFx0c2VsZi5zZXRFcnJvcihzbGlkZSk7XG5cblx0XHRcdFx0XHRicmVhaztcblx0XHRcdH1cblxuXHRcdFx0cmV0dXJuIHRydWU7XG5cdFx0fSxcblxuXHRcdC8vIFVzZSB0aHVtYm5haWwgaW1hZ2UsIGlmIHBvc3NpYmxlXG5cdFx0Ly8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuXHRcdHNldEltYWdlOiBmdW5jdGlvbihzbGlkZSkge1xuXHRcdFx0dmFyIHNlbGYgPSB0aGlzLFxuXHRcdFx0XHRnaG9zdDtcblxuXHRcdFx0Ly8gQ2hlY2sgaWYgbmVlZCB0byBzaG93IGxvYWRpbmcgaWNvblxuXHRcdFx0c2V0VGltZW91dChmdW5jdGlvbigpIHtcblx0XHRcdFx0dmFyICRpbWcgPSBzbGlkZS4kaW1hZ2U7XG5cblx0XHRcdFx0aWYgKCFzZWxmLmlzQ2xvc2luZyAmJiBzbGlkZS5pc0xvYWRpbmcgJiYgKCEkaW1nIHx8ICEkaW1nLmxlbmd0aCB8fCAhJGltZ1swXS5jb21wbGV0ZSkgJiYgIXNsaWRlLmhhc0Vycm9yKSB7XG5cdFx0XHRcdFx0c2VsZi5zaG93TG9hZGluZyhzbGlkZSk7XG5cdFx0XHRcdH1cblx0XHRcdH0sIDUwKTtcblxuXHRcdFx0Ly9DaGVjayBpZiBpbWFnZSBoYXMgc3Jjc2V0XG5cdFx0XHRzZWxmLmNoZWNrU3Jjc2V0KHNsaWRlKTtcblxuXHRcdFx0Ly8gVGhpcyB3aWxsIGJlIHdyYXBwZXIgY29udGFpbmluZyBib3RoIGdob3N0IGFuZCBhY3R1YWwgaW1hZ2Vcblx0XHRcdHNsaWRlLiRjb250ZW50ID0gJCgnPGRpdiBjbGFzcz1cImZhbmN5Ym94LWNvbnRlbnRcIj48L2Rpdj4nKVxuXHRcdFx0XHQuYWRkQ2xhc3MoXCJmYW5jeWJveC1pcy1oaWRkZW5cIilcblx0XHRcdFx0LmFwcGVuZFRvKHNsaWRlLiRzbGlkZS5hZGRDbGFzcyhcImZhbmN5Ym94LXNsaWRlLS1pbWFnZVwiKSk7XG5cblx0XHRcdC8vIElmIHdlIGhhdmUgYSB0aHVtYm5haWwsIHdlIGNhbiBkaXNwbGF5IGl0IHdoaWxlIGFjdHVhbCBpbWFnZSBpcyBsb2FkaW5nXG5cdFx0XHQvLyBVc2VycyB3aWxsIG5vdCBzdGFyZSBhdCBibGFjayBzY3JlZW4gYW5kIGFjdHVhbCBpbWFnZSB3aWxsIGFwcGVhciBncmFkdWFsbHlcblx0XHRcdGlmIChzbGlkZS5vcHRzLnByZWxvYWQgIT09IGZhbHNlICYmIHNsaWRlLm9wdHMud2lkdGggJiYgc2xpZGUub3B0cy5oZWlnaHQgJiYgc2xpZGUudGh1bWIpIHtcblx0XHRcdFx0c2xpZGUud2lkdGggPSBzbGlkZS5vcHRzLndpZHRoO1xuXHRcdFx0XHRzbGlkZS5oZWlnaHQgPSBzbGlkZS5vcHRzLmhlaWdodDtcblxuXHRcdFx0XHRnaG9zdCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJpbWdcIik7XG5cblx0XHRcdFx0Z2hvc3Qub25lcnJvciA9IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdCQodGhpcykucmVtb3ZlKCk7XG5cblx0XHRcdFx0XHRzbGlkZS4kZ2hvc3QgPSBudWxsO1xuXHRcdFx0XHR9O1xuXG5cdFx0XHRcdGdob3N0Lm9ubG9hZCA9IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdHNlbGYuYWZ0ZXJMb2FkKHNsaWRlKTtcblx0XHRcdFx0fTtcblxuXHRcdFx0XHRzbGlkZS4kZ2hvc3QgPSAkKGdob3N0KVxuXHRcdFx0XHRcdC5hZGRDbGFzcyhcImZhbmN5Ym94LWltYWdlXCIpXG5cdFx0XHRcdFx0LmFwcGVuZFRvKHNsaWRlLiRjb250ZW50KVxuXHRcdFx0XHRcdC5hdHRyKFwic3JjXCIsIHNsaWRlLnRodW1iKTtcblx0XHRcdH1cblxuXHRcdFx0Ly8gU3RhcnQgbG9hZGluZyBhY3R1YWwgaW1hZ2Vcblx0XHRcdHNlbGYuc2V0QmlnSW1hZ2Uoc2xpZGUpO1xuXHRcdH0sXG5cblx0XHQvLyBDaGVjayBpZiBpbWFnZSBoYXMgc3Jjc2V0IGFuZCBnZXQgdGhlIHNvdXJjZVxuXHRcdC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cdFx0Y2hlY2tTcmNzZXQ6IGZ1bmN0aW9uKHNsaWRlKSB7XG5cdFx0XHR2YXIgc3Jjc2V0ID0gc2xpZGUub3B0cy5zcmNzZXQgfHwgc2xpZGUub3B0cy5pbWFnZS5zcmNzZXQsXG5cdFx0XHRcdGZvdW5kLFxuXHRcdFx0XHR0ZW1wLFxuXHRcdFx0XHRweFJhdGlvLFxuXHRcdFx0XHR3aW5kb3dXaWR0aDtcblxuXHRcdFx0Ly8gSWYgd2UgaGF2ZSBcInNyY3NldFwiLCB0aGVuIHdlIG5lZWQgdG8gZmluZCBmaXJzdCBtYXRjaGluZyBcInNyY1wiIHZhbHVlLlxuXHRcdFx0Ly8gVGhpcyBpcyBuZWNlc3NhcnksIGJlY2F1c2Ugd2hlbiB5b3Ugc2V0IGFuIHNyYyBhdHRyaWJ1dGUsIHRoZSBicm93c2VyIHdpbGwgcHJlbG9hZCB0aGUgaW1hZ2Vcblx0XHRcdC8vIGJlZm9yZSBhbnkgamF2YXNjcmlwdCBvciBldmVuIENTUyBpcyBhcHBsaWVkLlxuXHRcdFx0aWYgKHNyY3NldCkge1xuXHRcdFx0XHRweFJhdGlvID0gd2luZG93LmRldmljZVBpeGVsUmF0aW8gfHwgMTtcblx0XHRcdFx0d2luZG93V2lkdGggPSB3aW5kb3cuaW5uZXJXaWR0aCAqIHB4UmF0aW87XG5cblx0XHRcdFx0dGVtcCA9IHNyY3NldC5zcGxpdChcIixcIikubWFwKGZ1bmN0aW9uKGVsKSB7XG5cdFx0XHRcdFx0dmFyIHJldCA9IHt9O1xuXG5cdFx0XHRcdFx0ZWwudHJpbSgpXG5cdFx0XHRcdFx0XHQuc3BsaXQoL1xccysvKVxuXHRcdFx0XHRcdFx0LmZvckVhY2goZnVuY3Rpb24oZWwsIGkpIHtcblx0XHRcdFx0XHRcdFx0dmFyIHZhbHVlID0gcGFyc2VJbnQoZWwuc3Vic3RyaW5nKDAsIGVsLmxlbmd0aCAtIDEpLCAxMCk7XG5cblx0XHRcdFx0XHRcdFx0aWYgKGkgPT09IDApIHtcblx0XHRcdFx0XHRcdFx0XHRyZXR1cm4gKHJldC51cmwgPSBlbCk7XG5cdFx0XHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdFx0XHRpZiAodmFsdWUpIHtcblx0XHRcdFx0XHRcdFx0XHRyZXQudmFsdWUgPSB2YWx1ZTtcblx0XHRcdFx0XHRcdFx0XHRyZXQucG9zdGZpeCA9IGVsW2VsLmxlbmd0aCAtIDFdO1xuXHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHR9KTtcblxuXHRcdFx0XHRcdHJldHVybiByZXQ7XG5cdFx0XHRcdH0pO1xuXG5cdFx0XHRcdC8vIFNvcnQgYnkgdmFsdWVcblx0XHRcdFx0dGVtcC5zb3J0KGZ1bmN0aW9uKGEsIGIpIHtcblx0XHRcdFx0XHRyZXR1cm4gYS52YWx1ZSAtIGIudmFsdWU7XG5cdFx0XHRcdH0pO1xuXG5cdFx0XHRcdC8vIE9rLCBub3cgd2UgaGF2ZSBhbiBhcnJheSBvZiBhbGwgc3Jjc2V0IHZhbHVlc1xuXHRcdFx0XHRmb3IgKHZhciBqID0gMDsgaiA8IHRlbXAubGVuZ3RoOyBqKyspIHtcblx0XHRcdFx0XHR2YXIgZWwgPSB0ZW1wW2pdO1xuXG5cdFx0XHRcdFx0aWYgKChlbC5wb3N0Zml4ID09PSBcIndcIiAmJiBlbC52YWx1ZSA+PSB3aW5kb3dXaWR0aCkgfHwgKGVsLnBvc3RmaXggPT09IFwieFwiICYmIGVsLnZhbHVlID49IHB4UmF0aW8pKSB7XG5cdFx0XHRcdFx0XHRmb3VuZCA9IGVsO1xuXHRcdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cblx0XHRcdFx0Ly8gSWYgbm90IGZvdW5kLCB0YWtlIHRoZSBsYXN0IG9uZVxuXHRcdFx0XHRpZiAoIWZvdW5kICYmIHRlbXAubGVuZ3RoKSB7XG5cdFx0XHRcdFx0Zm91bmQgPSB0ZW1wW3RlbXAubGVuZ3RoIC0gMV07XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRpZiAoZm91bmQpIHtcblx0XHRcdFx0XHRzbGlkZS5zcmMgPSBmb3VuZC51cmw7XG5cblx0XHRcdFx0XHQvLyBJZiB3ZSBoYXZlIGRlZmF1bHQgd2lkdGgvaGVpZ2h0IHZhbHVlcywgd2UgY2FuIGNhbGN1bGF0ZSBoZWlnaHQgZm9yIG1hdGNoaW5nIHNvdXJjZVxuXHRcdFx0XHRcdGlmIChzbGlkZS53aWR0aCAmJiBzbGlkZS5oZWlnaHQgJiYgZm91bmQucG9zdGZpeCA9PSBcIndcIikge1xuXHRcdFx0XHRcdFx0c2xpZGUuaGVpZ2h0ID0gKHNsaWRlLndpZHRoIC8gc2xpZGUuaGVpZ2h0KSAqIGZvdW5kLnZhbHVlO1xuXHRcdFx0XHRcdFx0c2xpZGUud2lkdGggPSBmb3VuZC52YWx1ZTtcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRzbGlkZS5vcHRzLnNyY3NldCA9IHNyY3NldDtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH0sXG5cblx0XHQvLyBDcmVhdGUgZnVsbC1zaXplIGltYWdlXG5cdFx0Ly8gPT09PT09PT09PT09PT09PT09PT09PVxuXG5cdFx0c2V0QmlnSW1hZ2U6IGZ1bmN0aW9uKHNsaWRlKSB7XG5cdFx0XHR2YXIgc2VsZiA9IHRoaXMsXG5cdFx0XHRcdGltZyA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJpbWdcIiksXG5cdFx0XHRcdCRpbWcgPSAkKGltZyk7XG5cblx0XHRcdHNsaWRlLiRpbWFnZSA9ICRpbWdcblx0XHRcdFx0Lm9uZShcImVycm9yXCIsIGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdHNlbGYuc2V0RXJyb3Ioc2xpZGUpO1xuXHRcdFx0XHR9KVxuXHRcdFx0XHQub25lKFwibG9hZFwiLCBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHR2YXIgc2l6ZXM7XG5cblx0XHRcdFx0XHRpZiAoIXNsaWRlLiRnaG9zdCkge1xuXHRcdFx0XHRcdFx0c2VsZi5yZXNvbHZlSW1hZ2VTbGlkZVNpemUoc2xpZGUsIHRoaXMubmF0dXJhbFdpZHRoLCB0aGlzLm5hdHVyYWxIZWlnaHQpO1xuXG5cdFx0XHRcdFx0XHRzZWxmLmFmdGVyTG9hZChzbGlkZSk7XG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0aWYgKHNlbGYuaXNDbG9zaW5nKSB7XG5cdFx0XHRcdFx0XHRyZXR1cm47XG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0aWYgKHNsaWRlLm9wdHMuc3Jjc2V0KSB7XG5cdFx0XHRcdFx0XHRzaXplcyA9IHNsaWRlLm9wdHMuc2l6ZXM7XG5cblx0XHRcdFx0XHRcdGlmICghc2l6ZXMgfHwgc2l6ZXMgPT09IFwiYXV0b1wiKSB7XG5cdFx0XHRcdFx0XHRcdHNpemVzID1cblx0XHRcdFx0XHRcdFx0XHQoc2xpZGUud2lkdGggLyBzbGlkZS5oZWlnaHQgPiAxICYmICRXLndpZHRoKCkgLyAkVy5oZWlnaHQoKSA+IDEgPyBcIjEwMFwiIDogTWF0aC5yb3VuZCgoc2xpZGUud2lkdGggLyBzbGlkZS5oZWlnaHQpICogMTAwKSkgK1xuXHRcdFx0XHRcdFx0XHRcdFwidndcIjtcblx0XHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdFx0JGltZy5hdHRyKFwic2l6ZXNcIiwgc2l6ZXMpLmF0dHIoXCJzcmNzZXRcIiwgc2xpZGUub3B0cy5zcmNzZXQpO1xuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdC8vIEhpZGUgdGVtcG9yYXJ5IGltYWdlIGFmdGVyIHNvbWUgZGVsYXlcblx0XHRcdFx0XHRpZiAoc2xpZGUuJGdob3N0KSB7XG5cdFx0XHRcdFx0XHRzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdFx0XHRpZiAoc2xpZGUuJGdob3N0ICYmICFzZWxmLmlzQ2xvc2luZykge1xuXHRcdFx0XHRcdFx0XHRcdHNsaWRlLiRnaG9zdC5oaWRlKCk7XG5cdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdH0sIE1hdGgubWluKDMwMCwgTWF0aC5tYXgoMTAwMCwgc2xpZGUuaGVpZ2h0IC8gMTYwMCkpKTtcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRzZWxmLmhpZGVMb2FkaW5nKHNsaWRlKTtcblx0XHRcdFx0fSlcblx0XHRcdFx0LmFkZENsYXNzKFwiZmFuY3lib3gtaW1hZ2VcIilcblx0XHRcdFx0LmF0dHIoXCJzcmNcIiwgc2xpZGUuc3JjKVxuXHRcdFx0XHQuYXBwZW5kVG8oc2xpZGUuJGNvbnRlbnQpO1xuXG5cdFx0XHRpZiAoKGltZy5jb21wbGV0ZSB8fCBpbWcucmVhZHlTdGF0ZSA9PSBcImNvbXBsZXRlXCIpICYmICRpbWcubmF0dXJhbFdpZHRoICYmICRpbWcubmF0dXJhbEhlaWdodCkge1xuXHRcdFx0XHQkaW1nLnRyaWdnZXIoXCJsb2FkXCIpO1xuXHRcdFx0fSBlbHNlIGlmIChpbWcuZXJyb3IpIHtcblx0XHRcdFx0JGltZy50cmlnZ2VyKFwiZXJyb3JcIik7XG5cdFx0XHR9XG5cdFx0fSxcblxuXHRcdC8vIENvbXB1dGVzIHRoZSBzbGlkZSBzaXplIGZyb20gaW1hZ2Ugc2l6ZSBhbmQgbWF4V2lkdGgvbWF4SGVpZ2h0XG5cdFx0Ly8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuXHRcdHJlc29sdmVJbWFnZVNsaWRlU2l6ZTogZnVuY3Rpb24oc2xpZGUsIGltZ1dpZHRoLCBpbWdIZWlnaHQpIHtcblx0XHRcdHZhciBtYXhXaWR0aCA9IHBhcnNlSW50KHNsaWRlLm9wdHMud2lkdGgsIDEwKSxcblx0XHRcdFx0bWF4SGVpZ2h0ID0gcGFyc2VJbnQoc2xpZGUub3B0cy5oZWlnaHQsIDEwKTtcblxuXHRcdFx0Ly8gU2V0cyB0aGUgZGVmYXVsdCB2YWx1ZXMgZnJvbSB0aGUgaW1hZ2Vcblx0XHRcdHNsaWRlLndpZHRoID0gaW1nV2lkdGg7XG5cdFx0XHRzbGlkZS5oZWlnaHQgPSBpbWdIZWlnaHQ7XG5cblx0XHRcdGlmIChtYXhXaWR0aCA+IDApIHtcblx0XHRcdFx0c2xpZGUud2lkdGggPSBtYXhXaWR0aDtcblx0XHRcdFx0c2xpZGUuaGVpZ2h0ID0gTWF0aC5mbG9vcigobWF4V2lkdGggKiBpbWdIZWlnaHQpIC8gaW1nV2lkdGgpO1xuXHRcdFx0fVxuXG5cdFx0XHRpZiAobWF4SGVpZ2h0ID4gMCkge1xuXHRcdFx0XHRzbGlkZS53aWR0aCA9IE1hdGguZmxvb3IoKG1heEhlaWdodCAqIGltZ1dpZHRoKSAvIGltZ0hlaWdodCk7XG5cdFx0XHRcdHNsaWRlLmhlaWdodCA9IG1heEhlaWdodDtcblx0XHRcdH1cblx0XHR9LFxuXG5cdFx0Ly8gQ3JlYXRlIGlmcmFtZSB3cmFwcGVyLCBpZnJhbWUgYW5kIGJpbmRpbmdzXG5cdFx0Ly8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cblx0XHRzZXRJZnJhbWU6IGZ1bmN0aW9uKHNsaWRlKSB7XG5cdFx0XHR2YXIgc2VsZiA9IHRoaXMsXG5cdFx0XHRcdG9wdHMgPSBzbGlkZS5vcHRzLmlmcmFtZSxcblx0XHRcdFx0JHNsaWRlID0gc2xpZGUuJHNsaWRlLFxuXHRcdFx0XHQkaWZyYW1lO1xuXG5cdFx0XHQvLyBGaXggcmVzcG9uc2l2ZSBpZnJhbWVzIG9uIGlPUyAoYWxvbmcgd2l0aCBgcG9zaXRpb246YWJzb2x1dGU7YCBmb3IgaWZyYW1lIGVsZW1lbnQpXG5cdFx0XHRpZiAoJC5mYW5jeWJveC5pc01vYmlsZSkge1xuXHRcdFx0XHRvcHRzLmNzcy5vdmVyZmxvdyA9IFwic2Nyb2xsXCI7XG5cdFx0XHR9XG5cblx0XHRcdHNsaWRlLiRjb250ZW50ID0gJCgnPGRpdiBjbGFzcz1cImZhbmN5Ym94LWNvbnRlbnQnICsgKG9wdHMucHJlbG9hZCA/IFwiIGZhbmN5Ym94LWlzLWhpZGRlblwiIDogXCJcIikgKyAnXCI+PC9kaXY+Jylcblx0XHRcdFx0LmNzcyhvcHRzLmNzcylcblx0XHRcdFx0LmFwcGVuZFRvKCRzbGlkZSk7XG5cblx0XHRcdCRzbGlkZS5hZGRDbGFzcyhcImZhbmN5Ym94LXNsaWRlLS1cIiArIHNsaWRlLmNvbnRlbnRUeXBlKTtcblxuXHRcdFx0c2xpZGUuJGlmcmFtZSA9ICRpZnJhbWUgPSAkKG9wdHMudHBsLnJlcGxhY2UoL1xce3JuZFxcfS9nLCBuZXcgRGF0ZSgpLmdldFRpbWUoKSkpXG5cdFx0XHRcdC5hdHRyKG9wdHMuYXR0cilcblx0XHRcdFx0LmFwcGVuZFRvKHNsaWRlLiRjb250ZW50KTtcblxuXHRcdFx0aWYgKG9wdHMucHJlbG9hZCkge1xuXHRcdFx0XHRzZWxmLnNob3dMb2FkaW5nKHNsaWRlKTtcblxuXHRcdFx0XHQvLyBVbmZvcnR1bmF0ZWx5LCBpdCBpcyBub3QgYWx3YXlzIHBvc3NpYmxlIHRvIGRldGVybWluZSBpZiBpZnJhbWUgaXMgc3VjY2Vzc2Z1bGx5IGxvYWRlZFxuXHRcdFx0XHQvLyAoZHVlIHRvIGJyb3dzZXIgc2VjdXJpdHkgcG9saWN5KVxuXG5cdFx0XHRcdCRpZnJhbWUub24oXCJsb2FkLmZiIGVycm9yLmZiXCIsIGZ1bmN0aW9uKGUpIHtcblx0XHRcdFx0XHR0aGlzLmlzUmVhZHkgPSAxO1xuXG5cdFx0XHRcdFx0c2xpZGUuJHNsaWRlLnRyaWdnZXIoXCJyZWZyZXNoXCIpO1xuXG5cdFx0XHRcdFx0c2VsZi5hZnRlckxvYWQoc2xpZGUpO1xuXHRcdFx0XHR9KTtcblxuXHRcdFx0XHQvLyBSZWNhbGN1bGF0ZSBpZnJhbWUgY29udGVudCBzaXplXG5cdFx0XHRcdC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuXHRcdFx0XHQkc2xpZGUub24oXCJyZWZyZXNoLmZiXCIsIGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdHZhciAkY29udGVudCA9IHNsaWRlLiRjb250ZW50LFxuXHRcdFx0XHRcdFx0ZnJhbWVXaWR0aCA9IG9wdHMuY3NzLndpZHRoLFxuXHRcdFx0XHRcdFx0ZnJhbWVIZWlnaHQgPSBvcHRzLmNzcy5oZWlnaHQsXG5cdFx0XHRcdFx0XHQkY29udGVudHMsXG5cdFx0XHRcdFx0XHQkYm9keTtcblxuXHRcdFx0XHRcdGlmICgkaWZyYW1lWzBdLmlzUmVhZHkgIT09IDEpIHtcblx0XHRcdFx0XHRcdHJldHVybjtcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHR0cnkge1xuXHRcdFx0XHRcdFx0JGNvbnRlbnRzID0gJGlmcmFtZS5jb250ZW50cygpO1xuXHRcdFx0XHRcdFx0JGJvZHkgPSAkY29udGVudHMuZmluZChcImJvZHlcIik7XG5cdFx0XHRcdFx0fSBjYXRjaCAoaWdub3JlKSB7fVxuXG5cdFx0XHRcdFx0Ly8gQ2FsY3VsYXRlIGNvbnRuZXQgZGltZW5zaW9ucyBpZiBpdCBpcyBhY2Nlc3NpYmxlXG5cdFx0XHRcdFx0aWYgKCRib2R5ICYmICRib2R5Lmxlbmd0aCAmJiAkYm9keS5jaGlsZHJlbigpLmxlbmd0aCkge1xuXHRcdFx0XHRcdFx0Ly8gQXZvaWQgc2Nyb2xsaW5nIHRvIHRvcCAoaWYgbXVsdGlwbGUgaW5zdGFuY2VzKVxuXHRcdFx0XHRcdFx0JHNsaWRlLmNzcyhcIm92ZXJmbG93XCIsIFwidmlzaWJsZVwiKTtcblxuXHRcdFx0XHRcdFx0JGNvbnRlbnQuY3NzKHtcblx0XHRcdFx0XHRcdFx0d2lkdGg6IFwiMTAwJVwiLFxuXHRcdFx0XHRcdFx0XHRcIm1heC13aWR0aFwiOiBcIjEwMCVcIixcblx0XHRcdFx0XHRcdFx0aGVpZ2h0OiBcIjk5OTlweFwiXG5cdFx0XHRcdFx0XHR9KTtcblxuXHRcdFx0XHRcdFx0aWYgKGZyYW1lV2lkdGggPT09IHVuZGVmaW5lZCkge1xuXHRcdFx0XHRcdFx0XHRmcmFtZVdpZHRoID0gTWF0aC5jZWlsKE1hdGgubWF4KCRib2R5WzBdLmNsaWVudFdpZHRoLCAkYm9keS5vdXRlcldpZHRoKHRydWUpKSk7XG5cdFx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRcdCRjb250ZW50LmNzcyhcIndpZHRoXCIsIGZyYW1lV2lkdGggPyBmcmFtZVdpZHRoIDogXCJcIikuY3NzKFwibWF4LXdpZHRoXCIsIFwiXCIpO1xuXG5cdFx0XHRcdFx0XHRpZiAoZnJhbWVIZWlnaHQgPT09IHVuZGVmaW5lZCkge1xuXHRcdFx0XHRcdFx0XHRmcmFtZUhlaWdodCA9IE1hdGguY2VpbChNYXRoLm1heCgkYm9keVswXS5jbGllbnRIZWlnaHQsICRib2R5Lm91dGVySGVpZ2h0KHRydWUpKSk7XG5cdFx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRcdCRjb250ZW50LmNzcyhcImhlaWdodFwiLCBmcmFtZUhlaWdodCA/IGZyYW1lSGVpZ2h0IDogXCJcIik7XG5cblx0XHRcdFx0XHRcdCRzbGlkZS5jc3MoXCJvdmVyZmxvd1wiLCBcImF1dG9cIik7XG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0JGNvbnRlbnQucmVtb3ZlQ2xhc3MoXCJmYW5jeWJveC1pcy1oaWRkZW5cIik7XG5cdFx0XHRcdH0pO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0c2VsZi5hZnRlckxvYWQoc2xpZGUpO1xuXHRcdFx0fVxuXG5cdFx0XHQkaWZyYW1lLmF0dHIoXCJzcmNcIiwgc2xpZGUuc3JjKTtcblxuXHRcdFx0Ly8gUmVtb3ZlIGlmcmFtZSBpZiBjbG9zaW5nIG9yIGNoYW5naW5nIGdhbGxlcnkgaXRlbVxuXHRcdFx0JHNsaWRlLm9uZShcIm9uUmVzZXRcIiwgZnVuY3Rpb24oKSB7XG5cdFx0XHRcdC8vIFRoaXMgaGVscHMgSUUgbm90IHRvIHRocm93IGVycm9ycyB3aGVuIGNsb3Npbmdcblx0XHRcdFx0dHJ5IHtcblx0XHRcdFx0XHQkKHRoaXMpXG5cdFx0XHRcdFx0XHQuZmluZChcImlmcmFtZVwiKVxuXHRcdFx0XHRcdFx0LmhpZGUoKVxuXHRcdFx0XHRcdFx0LnVuYmluZCgpXG5cdFx0XHRcdFx0XHQuYXR0cihcInNyY1wiLCBcIi8vYWJvdXQ6YmxhbmtcIik7XG5cdFx0XHRcdH0gY2F0Y2ggKGlnbm9yZSkge31cblxuXHRcdFx0XHQkKHRoaXMpXG5cdFx0XHRcdFx0Lm9mZihcInJlZnJlc2guZmJcIilcblx0XHRcdFx0XHQuZW1wdHkoKTtcblxuXHRcdFx0XHRzbGlkZS5pc0xvYWRlZCA9IGZhbHNlO1xuXHRcdFx0XHRzbGlkZS5pc1JldmVhbGVkID0gZmFsc2U7XG5cdFx0XHR9KTtcblx0XHR9LFxuXG5cdFx0Ly8gV3JhcCBhbmQgYXBwZW5kIGNvbnRlbnQgdG8gdGhlIHNsaWRlXG5cdFx0Ly8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuXHRcdHNldENvbnRlbnQ6IGZ1bmN0aW9uKHNsaWRlLCBjb250ZW50KSB7XG5cdFx0XHR2YXIgc2VsZiA9IHRoaXM7XG5cblx0XHRcdGlmIChzZWxmLmlzQ2xvc2luZykge1xuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR9XG5cblx0XHRcdHNlbGYuaGlkZUxvYWRpbmcoc2xpZGUpO1xuXG5cdFx0XHRpZiAoc2xpZGUuJGNvbnRlbnQpIHtcblx0XHRcdFx0JC5mYW5jeWJveC5zdG9wKHNsaWRlLiRjb250ZW50KTtcblx0XHRcdH1cblxuXHRcdFx0c2xpZGUuJHNsaWRlLmVtcHR5KCk7XG5cblx0XHRcdC8vIElmIGNvbnRlbnQgaXMgYSBqUXVlcnkgb2JqZWN0LCB0aGVuIGl0IHdpbGwgYmUgbW92ZWQgdG8gdGhlIHNsaWRlLlxuXHRcdFx0Ly8gVGhlIHBsYWNlaG9sZGVyIGlzIGNyZWF0ZWQgc28gd2Ugd2lsbCBrbm93IHdoZXJlIHRvIHB1dCBpdCBiYWNrLlxuXHRcdFx0aWYgKGlzUXVlcnkoY29udGVudCkgJiYgY29udGVudC5wYXJlbnQoKS5sZW5ndGgpIHtcblx0XHRcdFx0Ly8gTWFrZSBzdXJlIGNvbnRlbnQgaXMgbm90IGFscmVhZHkgbW92ZWQgdG8gZmFuY3lCb3hcblx0XHRcdFx0aWYgKGNvbnRlbnQuaGFzQ2xhc3MoXCJmYW5jeWJveC1jb250ZW50XCIpIHx8IGNvbnRlbnQucGFyZW50KCkuaGFzQ2xhc3MoXCJmYW5jeWJveC1jb250ZW50XCIpKSB7XG5cdFx0XHRcdFx0Y29udGVudC5wYXJlbnRzKFwiLmZhbmN5Ym94LXNsaWRlXCIpLnRyaWdnZXIoXCJvblJlc2V0XCIpO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0Ly8gQ3JlYXRlIHRlbXBvcmFyeSBlbGVtZW50IG1hcmtpbmcgb3JpZ2luYWwgcGxhY2Ugb2YgdGhlIGNvbnRlbnRcblx0XHRcdFx0c2xpZGUuJHBsYWNlaG9sZGVyID0gJChcIjxkaXY+XCIpXG5cdFx0XHRcdFx0LmhpZGUoKVxuXHRcdFx0XHRcdC5pbnNlcnRBZnRlcihjb250ZW50KTtcblxuXHRcdFx0XHQvLyBNYWtlIHN1cmUgY29udGVudCBpcyB2aXNpYmxlXG5cdFx0XHRcdGNvbnRlbnQuY3NzKFwiZGlzcGxheVwiLCBcImlubGluZS1ibG9ja1wiKTtcblx0XHRcdH0gZWxzZSBpZiAoIXNsaWRlLmhhc0Vycm9yKSB7XG5cdFx0XHRcdC8vIElmIGNvbnRlbnQgaXMganVzdCBhIHBsYWluIHRleHQsIHRyeSB0byBjb252ZXJ0IGl0IHRvIGh0bWxcblx0XHRcdFx0aWYgKCQudHlwZShjb250ZW50KSA9PT0gXCJzdHJpbmdcIikge1xuXHRcdFx0XHRcdGNvbnRlbnQgPSAkKFwiPGRpdj5cIilcblx0XHRcdFx0XHRcdC5hcHBlbmQoJC50cmltKGNvbnRlbnQpKVxuXHRcdFx0XHRcdFx0LmNvbnRlbnRzKCk7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHQvLyBJZiBcImZpbHRlclwiIG9wdGlvbiBpcyBwcm92aWRlZCwgdGhlbiBmaWx0ZXIgY29udGVudFxuXHRcdFx0XHRpZiAoc2xpZGUub3B0cy5maWx0ZXIpIHtcblx0XHRcdFx0XHRjb250ZW50ID0gJChcIjxkaXY+XCIpXG5cdFx0XHRcdFx0XHQuaHRtbChjb250ZW50KVxuXHRcdFx0XHRcdFx0LmZpbmQoc2xpZGUub3B0cy5maWx0ZXIpO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cblx0XHRcdHNsaWRlLiRzbGlkZS5vbmUoXCJvblJlc2V0XCIsIGZ1bmN0aW9uKCkge1xuXHRcdFx0XHQvLyBQYXVzZSBhbGwgaHRtbDUgdmlkZW8vYXVkaW9cblx0XHRcdFx0JCh0aGlzKVxuXHRcdFx0XHRcdC5maW5kKFwidmlkZW8sYXVkaW9cIilcblx0XHRcdFx0XHQudHJpZ2dlcihcInBhdXNlXCIpO1xuXG5cdFx0XHRcdC8vIFB1dCBjb250ZW50IGJhY2tcblx0XHRcdFx0aWYgKHNsaWRlLiRwbGFjZWhvbGRlcikge1xuXHRcdFx0XHRcdHNsaWRlLiRwbGFjZWhvbGRlci5hZnRlcihjb250ZW50LnJlbW92ZUNsYXNzKFwiZmFuY3lib3gtY29udGVudFwiKS5oaWRlKCkpLnJlbW92ZSgpO1xuXG5cdFx0XHRcdFx0c2xpZGUuJHBsYWNlaG9sZGVyID0gbnVsbDtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdC8vIFJlbW92ZSBjdXN0b20gY2xvc2UgYnV0dG9uXG5cdFx0XHRcdGlmIChzbGlkZS4kc21hbGxCdG4pIHtcblx0XHRcdFx0XHRzbGlkZS4kc21hbGxCdG4ucmVtb3ZlKCk7XG5cblx0XHRcdFx0XHRzbGlkZS4kc21hbGxCdG4gPSBudWxsO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0Ly8gUmVtb3ZlIGNvbnRlbnQgYW5kIG1hcmsgc2xpZGUgYXMgbm90IGxvYWRlZFxuXHRcdFx0XHRpZiAoIXNsaWRlLmhhc0Vycm9yKSB7XG5cdFx0XHRcdFx0JCh0aGlzKS5lbXB0eSgpO1xuXG5cdFx0XHRcdFx0c2xpZGUuaXNMb2FkZWQgPSBmYWxzZTtcblx0XHRcdFx0XHRzbGlkZS5pc1JldmVhbGVkID0gZmFsc2U7XG5cdFx0XHRcdH1cblx0XHRcdH0pO1xuXG5cdFx0XHQkKGNvbnRlbnQpLmFwcGVuZFRvKHNsaWRlLiRzbGlkZSk7XG5cblx0XHRcdGlmICgkKGNvbnRlbnQpLmlzKFwidmlkZW8sYXVkaW9cIikpIHtcblx0XHRcdFx0JChjb250ZW50KS5hZGRDbGFzcyhcImZhbmN5Ym94LXZpZGVvXCIpO1xuXG5cdFx0XHRcdCQoY29udGVudCkud3JhcChcIjxkaXY+PC9kaXY+XCIpO1xuXG5cdFx0XHRcdHNsaWRlLmNvbnRlbnRUeXBlID0gXCJ2aWRlb1wiO1xuXG5cdFx0XHRcdHNsaWRlLm9wdHMud2lkdGggPSBzbGlkZS5vcHRzLndpZHRoIHx8ICQoY29udGVudCkuYXR0cihcIndpZHRoXCIpO1xuXHRcdFx0XHRzbGlkZS5vcHRzLmhlaWdodCA9IHNsaWRlLm9wdHMuaGVpZ2h0IHx8ICQoY29udGVudCkuYXR0cihcImhlaWdodFwiKTtcblx0XHRcdH1cblxuXHRcdFx0c2xpZGUuJGNvbnRlbnQgPSBzbGlkZS4kc2xpZGVcblx0XHRcdFx0LmNoaWxkcmVuKClcblx0XHRcdFx0LmZpbHRlcihcImRpdixmb3JtLG1haW4sdmlkZW8sYXVkaW8sYXJ0aWNsZSwuZmFuY3lib3gtY29udGVudFwiKVxuXHRcdFx0XHQuZmlyc3QoKTtcblxuXHRcdFx0c2xpZGUuJGNvbnRlbnQuc2libGluZ3MoKS5oaWRlKCk7XG5cblx0XHRcdC8vIFJlLWNoZWNrIGlmIHRoZXJlIGlzIGEgdmFsaWQgY29udGVudFxuXHRcdFx0Ly8gKGluIHNvbWUgY2FzZXMsIGFqYXggcmVzcG9uc2UgY2FuIGNvbnRhaW4gdmFyaW91cyBlbGVtZW50cyBvciBwbGFpbiB0ZXh0KVxuXHRcdFx0aWYgKCFzbGlkZS4kY29udGVudC5sZW5ndGgpIHtcblx0XHRcdFx0c2xpZGUuJGNvbnRlbnQgPSBzbGlkZS4kc2xpZGVcblx0XHRcdFx0XHQud3JhcElubmVyKFwiPGRpdj48L2Rpdj5cIilcblx0XHRcdFx0XHQuY2hpbGRyZW4oKVxuXHRcdFx0XHRcdC5maXJzdCgpO1xuXHRcdFx0fVxuXG5cdFx0XHRzbGlkZS4kY29udGVudC5hZGRDbGFzcyhcImZhbmN5Ym94LWNvbnRlbnRcIik7XG5cblx0XHRcdHNsaWRlLiRzbGlkZS5hZGRDbGFzcyhcImZhbmN5Ym94LXNsaWRlLS1cIiArIHNsaWRlLmNvbnRlbnRUeXBlKTtcblxuXHRcdFx0c2VsZi5hZnRlckxvYWQoc2xpZGUpO1xuXHRcdH0sXG5cblx0XHQvLyBEaXNwbGF5IGVycm9yIG1lc3NhZ2Vcblx0XHQvLyA9PT09PT09PT09PT09PT09PT09PT1cblxuXHRcdHNldEVycm9yOiBmdW5jdGlvbihzbGlkZSkge1xuXHRcdFx0c2xpZGUuaGFzRXJyb3IgPSB0cnVlO1xuXG5cdFx0XHRzbGlkZS4kc2xpZGVcblx0XHRcdFx0LnRyaWdnZXIoXCJvblJlc2V0XCIpXG5cdFx0XHRcdC5yZW1vdmVDbGFzcyhcImZhbmN5Ym94LXNsaWRlLS1cIiArIHNsaWRlLmNvbnRlbnRUeXBlKVxuXHRcdFx0XHQuYWRkQ2xhc3MoXCJmYW5jeWJveC1zbGlkZS0tZXJyb3JcIik7XG5cblx0XHRcdHNsaWRlLmNvbnRlbnRUeXBlID0gXCJodG1sXCI7XG5cblx0XHRcdHRoaXMuc2V0Q29udGVudChzbGlkZSwgdGhpcy50cmFuc2xhdGUoc2xpZGUsIHNsaWRlLm9wdHMuZXJyb3JUcGwpKTtcblxuXHRcdFx0aWYgKHNsaWRlLnBvcyA9PT0gdGhpcy5jdXJyUG9zKSB7XG5cdFx0XHRcdHRoaXMuaXNBbmltYXRpbmcgPSBmYWxzZTtcblx0XHRcdH1cblx0XHR9LFxuXG5cdFx0Ly8gU2hvdyBsb2FkaW5nIGljb24gaW5zaWRlIHRoZSBzbGlkZVxuXHRcdC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuXHRcdHNob3dMb2FkaW5nOiBmdW5jdGlvbihzbGlkZSkge1xuXHRcdFx0dmFyIHNlbGYgPSB0aGlzO1xuXG5cdFx0XHRzbGlkZSA9IHNsaWRlIHx8IHNlbGYuY3VycmVudDtcblxuXHRcdFx0aWYgKHNsaWRlICYmICFzbGlkZS4kc3Bpbm5lcikge1xuXHRcdFx0XHRzbGlkZS4kc3Bpbm5lciA9ICQoc2VsZi50cmFuc2xhdGUoc2VsZiwgc2VsZi5vcHRzLnNwaW5uZXJUcGwpKVxuXHRcdFx0XHRcdC5hcHBlbmRUbyhzbGlkZS4kc2xpZGUpXG5cdFx0XHRcdFx0LmhpZGUoKVxuXHRcdFx0XHRcdC5mYWRlSW4oXCJmYXN0XCIpO1xuXHRcdFx0fVxuXHRcdH0sXG5cblx0XHQvLyBSZW1vdmUgbG9hZGluZyBpY29uIGZyb20gdGhlIHNsaWRlXG5cdFx0Ly8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG5cdFx0aGlkZUxvYWRpbmc6IGZ1bmN0aW9uKHNsaWRlKSB7XG5cdFx0XHR2YXIgc2VsZiA9IHRoaXM7XG5cblx0XHRcdHNsaWRlID0gc2xpZGUgfHwgc2VsZi5jdXJyZW50O1xuXG5cdFx0XHRpZiAoc2xpZGUgJiYgc2xpZGUuJHNwaW5uZXIpIHtcblx0XHRcdFx0c2xpZGUuJHNwaW5uZXIuc3RvcCgpLnJlbW92ZSgpO1xuXG5cdFx0XHRcdGRlbGV0ZSBzbGlkZS4kc3Bpbm5lcjtcblx0XHRcdH1cblx0XHR9LFxuXG5cdFx0Ly8gQWRqdXN0bWVudHMgYWZ0ZXIgc2xpZGUgY29udGVudCBoYXMgYmVlbiBsb2FkZWRcblx0XHQvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG5cdFx0YWZ0ZXJMb2FkOiBmdW5jdGlvbihzbGlkZSkge1xuXHRcdFx0dmFyIHNlbGYgPSB0aGlzO1xuXG5cdFx0XHRpZiAoc2VsZi5pc0Nsb3NpbmcpIHtcblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0fVxuXG5cdFx0XHRzbGlkZS5pc0xvYWRpbmcgPSBmYWxzZTtcblx0XHRcdHNsaWRlLmlzTG9hZGVkID0gdHJ1ZTtcblxuXHRcdFx0c2VsZi50cmlnZ2VyKFwiYWZ0ZXJMb2FkXCIsIHNsaWRlKTtcblxuXHRcdFx0c2VsZi5oaWRlTG9hZGluZyhzbGlkZSk7XG5cblx0XHRcdC8vIEFkZCBzbWFsbCBjbG9zZSBidXR0b25cblx0XHRcdGlmIChzbGlkZS5vcHRzLnNtYWxsQnRuICYmICghc2xpZGUuJHNtYWxsQnRuIHx8ICFzbGlkZS4kc21hbGxCdG4ubGVuZ3RoKSkge1xuXHRcdFx0XHRzbGlkZS4kc21hbGxCdG4gPSAkKHNlbGYudHJhbnNsYXRlKHNsaWRlLCBzbGlkZS5vcHRzLmJ0blRwbC5zbWFsbEJ0bikpLmFwcGVuZFRvKHNsaWRlLiRjb250ZW50KTtcblx0XHRcdH1cblxuXHRcdFx0Ly8gRGlzYWJsZSByaWdodCBjbGlja1xuXHRcdFx0aWYgKHNsaWRlLm9wdHMucHJvdGVjdCAmJiBzbGlkZS4kY29udGVudCAmJiAhc2xpZGUuaGFzRXJyb3IpIHtcblx0XHRcdFx0c2xpZGUuJGNvbnRlbnQub24oXCJjb250ZXh0bWVudS5mYlwiLCBmdW5jdGlvbihlKSB7XG5cdFx0XHRcdFx0aWYgKGUuYnV0dG9uID09IDIpIHtcblx0XHRcdFx0XHRcdGUucHJldmVudERlZmF1bHQoKTtcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRyZXR1cm4gdHJ1ZTtcblx0XHRcdFx0fSk7XG5cblx0XHRcdFx0Ly8gQWRkIGZha2UgZWxlbWVudCBvbiB0b3Agb2YgdGhlIGltYWdlXG5cdFx0XHRcdC8vIFRoaXMgbWFrZXMgYSBiaXQgaGFyZGVyIGZvciB1c2VyIHRvIHNlbGVjdCBpbWFnZVxuXHRcdFx0XHRpZiAoc2xpZGUudHlwZSA9PT0gXCJpbWFnZVwiKSB7XG5cdFx0XHRcdFx0JCgnPGRpdiBjbGFzcz1cImZhbmN5Ym94LXNwYWNlYmFsbFwiPjwvZGl2PicpLmFwcGVuZFRvKHNsaWRlLiRjb250ZW50KTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXG5cdFx0XHRzZWxmLmFkanVzdENhcHRpb24oc2xpZGUpO1xuXG5cdFx0XHRzZWxmLmFkanVzdExheW91dChzbGlkZSk7XG5cblx0XHRcdGlmIChzbGlkZS5wb3MgPT09IHNlbGYuY3VyclBvcykge1xuXHRcdFx0XHRzZWxmLnVwZGF0ZUN1cnNvcigpO1xuXHRcdFx0fVxuXG5cdFx0XHRzZWxmLnJldmVhbENvbnRlbnQoc2xpZGUpO1xuXHRcdH0sXG5cblx0XHQvLyBQcmV2ZW50IGNhcHRpb24gb3ZlcmxhcCxcblx0XHQvLyBmaXggY3NzIGluY29uc2lzdGVuY3kgYWNyb3NzIGJyb3dzZXJzXG5cdFx0Ly8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG5cdFx0YWRqdXN0Q2FwdGlvbjogZnVuY3Rpb24oc2xpZGUpIHtcblx0XHRcdHZhciBzZWxmID0gdGhpcyxcblx0XHRcdFx0Y3VycmVudCA9IHNsaWRlIHx8IHNlbGYuY3VycmVudCxcblx0XHRcdFx0Y2FwdGlvbiA9IGN1cnJlbnQub3B0cy5jYXB0aW9uLFxuXHRcdFx0XHQkY2FwdGlvbiA9IHNlbGYuJHJlZnMuY2FwdGlvbixcblx0XHRcdFx0Y2FwdGlvbkggPSBmYWxzZTtcblxuXHRcdFx0aWYgKGN1cnJlbnQub3B0cy5wcmV2ZW50Q2FwdGlvbk92ZXJsYXAgJiYgY2FwdGlvbiAmJiBjYXB0aW9uLmxlbmd0aCkge1xuXHRcdFx0XHRpZiAoY3VycmVudC5wb3MgIT09IHNlbGYuY3VyclBvcykge1xuXHRcdFx0XHRcdCRjYXB0aW9uID0gJGNhcHRpb25cblx0XHRcdFx0XHRcdC5jbG9uZSgpXG5cdFx0XHRcdFx0XHQuZW1wdHkoKVxuXHRcdFx0XHRcdFx0LmFwcGVuZFRvKCRjYXB0aW9uLnBhcmVudCgpKTtcblxuXHRcdFx0XHRcdCRjYXB0aW9uLmh0bWwoY2FwdGlvbik7XG5cblx0XHRcdFx0XHRjYXB0aW9uSCA9ICRjYXB0aW9uLm91dGVySGVpZ2h0KHRydWUpO1xuXG5cdFx0XHRcdFx0JGNhcHRpb24uZW1wdHkoKS5yZW1vdmUoKTtcblx0XHRcdFx0fSBlbHNlIGlmIChzZWxmLiRjYXB0aW9uKSB7XG5cdFx0XHRcdFx0Y2FwdGlvbkggPSBzZWxmLiRjYXB0aW9uLm91dGVySGVpZ2h0KHRydWUpO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0Y3VycmVudC4kc2xpZGUuY3NzKFwicGFkZGluZy1ib3R0b21cIiwgY2FwdGlvbkggfHwgXCJcIik7XG5cdFx0XHR9XG5cdFx0fSxcblxuXHRcdC8vIFNpbXBsZSBoYWNrIHRvIGZpeCBpbmNvbnNpc3RlbmN5IGFjcm9zcyBicm93c2VycywgZGVzY3JpYmVkIGhlcmUgKGFmZmVjdHMgRWRnZSwgdG9vKTpcblx0XHQvLyBodHRwczovL2J1Z3ppbGxhLm1vemlsbGEub3JnL3Nob3dfYnVnLmNnaT9pZD03NDg1MThcblx0XHQvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuXHRcdGFkanVzdExheW91dDogZnVuY3Rpb24oc2xpZGUpIHtcblx0XHRcdHZhciBzZWxmID0gdGhpcyxcblx0XHRcdFx0Y3VycmVudCA9IHNsaWRlIHx8IHNlbGYuY3VycmVudCxcblx0XHRcdFx0c2Nyb2xsSGVpZ2h0LFxuXHRcdFx0XHRtYXJnaW5Cb3R0b20sXG5cdFx0XHRcdGlubGluZVBhZGRpbmcsXG5cdFx0XHRcdGFjdHVhbFBhZGRpbmc7XG5cblx0XHRcdGlmIChjdXJyZW50LmlzTG9hZGVkICYmIGN1cnJlbnQub3B0cy5kaXNhYmxlTGF5b3V0Rml4ICE9PSB0cnVlKSB7XG5cdFx0XHRcdGN1cnJlbnQuJGNvbnRlbnQuY3NzKFwibWFyZ2luLWJvdHRvbVwiLCBcIlwiKTtcblxuXHRcdFx0XHQvLyBJZiB3ZSB3b3VsZCBhbHdheXMgc2V0IG1hcmdpbi1ib3R0b20gZm9yIHRoZSBjb250ZW50LFxuXHRcdFx0XHQvLyB0aGVuIGl0IHdvdWxkIHBvdGVudGlhbGx5IGJyZWFrIHZlcnRpY2FsIGFsaWduXG5cdFx0XHRcdGlmIChjdXJyZW50LiRjb250ZW50Lm91dGVySGVpZ2h0KCkgPiBjdXJyZW50LiRzbGlkZS5oZWlnaHQoKSArIDAuNSkge1xuXHRcdFx0XHRcdGlubGluZVBhZGRpbmcgPSBjdXJyZW50LiRzbGlkZVswXS5zdHlsZVtcInBhZGRpbmctYm90dG9tXCJdO1xuXHRcdFx0XHRcdGFjdHVhbFBhZGRpbmcgPSBjdXJyZW50LiRzbGlkZS5jc3MoXCJwYWRkaW5nLWJvdHRvbVwiKTtcblxuXHRcdFx0XHRcdGlmIChwYXJzZUZsb2F0KGFjdHVhbFBhZGRpbmcpID4gMCkge1xuXHRcdFx0XHRcdFx0c2Nyb2xsSGVpZ2h0ID0gY3VycmVudC4kc2xpZGVbMF0uc2Nyb2xsSGVpZ2h0O1xuXG5cdFx0XHRcdFx0XHRjdXJyZW50LiRzbGlkZS5jc3MoXCJwYWRkaW5nLWJvdHRvbVwiLCAwKTtcblxuXHRcdFx0XHRcdFx0aWYgKE1hdGguYWJzKHNjcm9sbEhlaWdodCAtIGN1cnJlbnQuJHNsaWRlWzBdLnNjcm9sbEhlaWdodCkgPCAxKSB7XG5cdFx0XHRcdFx0XHRcdG1hcmdpbkJvdHRvbSA9IGFjdHVhbFBhZGRpbmc7XG5cdFx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRcdGN1cnJlbnQuJHNsaWRlLmNzcyhcInBhZGRpbmctYm90dG9tXCIsIGlubGluZVBhZGRpbmcpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXG5cdFx0XHRcdGN1cnJlbnQuJGNvbnRlbnQuY3NzKFwibWFyZ2luLWJvdHRvbVwiLCBtYXJnaW5Cb3R0b20pO1xuXHRcdFx0fVxuXHRcdH0sXG5cblx0XHQvLyBNYWtlIGNvbnRlbnQgdmlzaWJsZVxuXHRcdC8vIFRoaXMgbWV0aG9kIGlzIGNhbGxlZCByaWdodCBhZnRlciBjb250ZW50IGhhcyBiZWVuIGxvYWRlZCBvclxuXHRcdC8vIHVzZXIgbmF2aWdhdGVzIGdhbGxlcnkgYW5kIHRyYW5zaXRpb24gc2hvdWxkIHN0YXJ0XG5cdFx0Ly8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cblx0XHRyZXZlYWxDb250ZW50OiBmdW5jdGlvbihzbGlkZSkge1xuXHRcdFx0dmFyIHNlbGYgPSB0aGlzLFxuXHRcdFx0XHQkc2xpZGUgPSBzbGlkZS4kc2xpZGUsXG5cdFx0XHRcdGVuZCA9IGZhbHNlLFxuXHRcdFx0XHRzdGFydCA9IGZhbHNlLFxuXHRcdFx0XHRpc01vdmVkID0gc2VsZi5pc01vdmVkKHNsaWRlKSxcblx0XHRcdFx0aXNSZXZlYWxlZCA9IHNsaWRlLmlzUmV2ZWFsZWQsXG5cdFx0XHRcdGVmZmVjdCxcblx0XHRcdFx0ZWZmZWN0Q2xhc3NOYW1lLFxuXHRcdFx0XHRkdXJhdGlvbixcblx0XHRcdFx0b3BhY2l0eTtcblxuXHRcdFx0c2xpZGUuaXNSZXZlYWxlZCA9IHRydWU7XG5cblx0XHRcdGVmZmVjdCA9IHNsaWRlLm9wdHNbc2VsZi5maXJzdFJ1biA/IFwiYW5pbWF0aW9uRWZmZWN0XCIgOiBcInRyYW5zaXRpb25FZmZlY3RcIl07XG5cdFx0XHRkdXJhdGlvbiA9IHNsaWRlLm9wdHNbc2VsZi5maXJzdFJ1biA/IFwiYW5pbWF0aW9uRHVyYXRpb25cIiA6IFwidHJhbnNpdGlvbkR1cmF0aW9uXCJdO1xuXG5cdFx0XHRkdXJhdGlvbiA9IHBhcnNlSW50KHNsaWRlLmZvcmNlZER1cmF0aW9uID09PSB1bmRlZmluZWQgPyBkdXJhdGlvbiA6IHNsaWRlLmZvcmNlZER1cmF0aW9uLCAxMCk7XG5cblx0XHRcdGlmIChpc01vdmVkIHx8IHNsaWRlLnBvcyAhPT0gc2VsZi5jdXJyUG9zIHx8ICFkdXJhdGlvbikge1xuXHRcdFx0XHRlZmZlY3QgPSBmYWxzZTtcblx0XHRcdH1cblxuXHRcdFx0Ly8gQ2hlY2sgaWYgY2FuIHpvb21cblx0XHRcdGlmIChlZmZlY3QgPT09IFwiem9vbVwiKSB7XG5cdFx0XHRcdGlmIChzbGlkZS5wb3MgPT09IHNlbGYuY3VyclBvcyAmJiBkdXJhdGlvbiAmJiBzbGlkZS50eXBlID09PSBcImltYWdlXCIgJiYgIXNsaWRlLmhhc0Vycm9yICYmIChzdGFydCA9IHNlbGYuZ2V0VGh1bWJQb3Moc2xpZGUpKSkge1xuXHRcdFx0XHRcdGVuZCA9IHNlbGYuZ2V0Rml0UG9zKHNsaWRlKTtcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRlZmZlY3QgPSBcImZhZGVcIjtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXG5cdFx0XHQvLyBab29tIGFuaW1hdGlvblxuXHRcdFx0Ly8gPT09PT09PT09PT09PT1cblx0XHRcdGlmIChlZmZlY3QgPT09IFwiem9vbVwiKSB7XG5cdFx0XHRcdHNlbGYuaXNBbmltYXRpbmcgPSB0cnVlO1xuXG5cdFx0XHRcdGVuZC5zY2FsZVggPSBlbmQud2lkdGggLyBzdGFydC53aWR0aDtcblx0XHRcdFx0ZW5kLnNjYWxlWSA9IGVuZC5oZWlnaHQgLyBzdGFydC5oZWlnaHQ7XG5cblx0XHRcdFx0Ly8gQ2hlY2sgaWYgd2UgbmVlZCB0byBhbmltYXRlIG9wYWNpdHlcblx0XHRcdFx0b3BhY2l0eSA9IHNsaWRlLm9wdHMuem9vbU9wYWNpdHk7XG5cblx0XHRcdFx0aWYgKG9wYWNpdHkgPT0gXCJhdXRvXCIpIHtcblx0XHRcdFx0XHRvcGFjaXR5ID0gTWF0aC5hYnMoc2xpZGUud2lkdGggLyBzbGlkZS5oZWlnaHQgLSBzdGFydC53aWR0aCAvIHN0YXJ0LmhlaWdodCkgPiAwLjE7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRpZiAob3BhY2l0eSkge1xuXHRcdFx0XHRcdHN0YXJ0Lm9wYWNpdHkgPSAwLjE7XG5cdFx0XHRcdFx0ZW5kLm9wYWNpdHkgPSAxO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0Ly8gRHJhdyBpbWFnZSBhdCBzdGFydCBwb3NpdGlvblxuXHRcdFx0XHQkLmZhbmN5Ym94LnNldFRyYW5zbGF0ZShzbGlkZS4kY29udGVudC5yZW1vdmVDbGFzcyhcImZhbmN5Ym94LWlzLWhpZGRlblwiKSwgc3RhcnQpO1xuXG5cdFx0XHRcdGZvcmNlUmVkcmF3KHNsaWRlLiRjb250ZW50KTtcblxuXHRcdFx0XHQvLyBTdGFydCBhbmltYXRpb25cblx0XHRcdFx0JC5mYW5jeWJveC5hbmltYXRlKHNsaWRlLiRjb250ZW50LCBlbmQsIGR1cmF0aW9uLCBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRzZWxmLmlzQW5pbWF0aW5nID0gZmFsc2U7XG5cblx0XHRcdFx0XHRzZWxmLmNvbXBsZXRlKCk7XG5cdFx0XHRcdH0pO1xuXG5cdFx0XHRcdHJldHVybjtcblx0XHRcdH1cblxuXHRcdFx0c2VsZi51cGRhdGVTbGlkZShzbGlkZSk7XG5cblx0XHRcdC8vIFNpbXBseSBzaG93IGNvbnRlbnQgaWYgbm8gZWZmZWN0XG5cdFx0XHQvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXHRcdFx0aWYgKCFlZmZlY3QpIHtcblx0XHRcdFx0c2xpZGUuJGNvbnRlbnQucmVtb3ZlQ2xhc3MoXCJmYW5jeWJveC1pcy1oaWRkZW5cIik7XG5cblx0XHRcdFx0aWYgKCFpc1JldmVhbGVkICYmIGlzTW92ZWQgJiYgc2xpZGUudHlwZSA9PT0gXCJpbWFnZVwiICYmICFzbGlkZS5oYXNFcnJvcikge1xuXHRcdFx0XHRcdHNsaWRlLiRjb250ZW50LmhpZGUoKS5mYWRlSW4oXCJmYXN0XCIpO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0aWYgKHNsaWRlLnBvcyA9PT0gc2VsZi5jdXJyUG9zKSB7XG5cdFx0XHRcdFx0c2VsZi5jb21wbGV0ZSgpO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0fVxuXG5cdFx0XHQvLyBQcmVwYXJlIGZvciBDU1MgdHJhbnNpdG9uXG5cdFx0XHQvLyA9PT09PT09PT09PT09PT09PT09PT09PT09XG5cdFx0XHQkLmZhbmN5Ym94LnN0b3AoJHNsaWRlKTtcblxuXHRcdFx0Ly9lZmZlY3RDbGFzc05hbWUgPSBcImZhbmN5Ym94LWFuaW1hdGVkIGZhbmN5Ym94LXNsaWRlLS1cIiArIChzbGlkZS5wb3MgPj0gc2VsZi5wcmV2UG9zID8gXCJuZXh0XCIgOiBcInByZXZpb3VzXCIpICsgXCIgZmFuY3lib3gtZngtXCIgKyBlZmZlY3Q7XG5cdFx0XHRlZmZlY3RDbGFzc05hbWUgPSBcImZhbmN5Ym94LXNsaWRlLS1cIiArIChzbGlkZS5wb3MgPj0gc2VsZi5wcmV2UG9zID8gXCJuZXh0XCIgOiBcInByZXZpb3VzXCIpICsgXCIgZmFuY3lib3gtYW5pbWF0ZWQgZmFuY3lib3gtZngtXCIgKyBlZmZlY3Q7XG5cblx0XHRcdCRzbGlkZS5hZGRDbGFzcyhlZmZlY3RDbGFzc05hbWUpLnJlbW92ZUNsYXNzKFwiZmFuY3lib3gtc2xpZGUtLWN1cnJlbnRcIik7IC8vLmFkZENsYXNzKGVmZmVjdENsYXNzTmFtZSk7XG5cblx0XHRcdHNsaWRlLiRjb250ZW50LnJlbW92ZUNsYXNzKFwiZmFuY3lib3gtaXMtaGlkZGVuXCIpO1xuXG5cdFx0XHQvLyBGb3JjZSByZWZsb3dcblx0XHRcdGZvcmNlUmVkcmF3KCRzbGlkZSk7XG5cblx0XHRcdGlmIChzbGlkZS50eXBlICE9PSBcImltYWdlXCIpIHtcblx0XHRcdFx0c2xpZGUuJGNvbnRlbnQuaGlkZSgpLnNob3coMCk7XG5cdFx0XHR9XG5cblx0XHRcdCQuZmFuY3lib3guYW5pbWF0ZShcblx0XHRcdFx0JHNsaWRlLFxuXHRcdFx0XHRcImZhbmN5Ym94LXNsaWRlLS1jdXJyZW50XCIsXG5cdFx0XHRcdGR1cmF0aW9uLFxuXHRcdFx0XHRmdW5jdGlvbigpIHtcblx0XHRcdFx0XHQkc2xpZGUucmVtb3ZlQ2xhc3MoZWZmZWN0Q2xhc3NOYW1lKS5jc3Moe1xuXHRcdFx0XHRcdFx0dHJhbnNmb3JtOiBcIlwiLFxuXHRcdFx0XHRcdFx0b3BhY2l0eTogXCJcIlxuXHRcdFx0XHRcdH0pO1xuXG5cdFx0XHRcdFx0aWYgKHNsaWRlLnBvcyA9PT0gc2VsZi5jdXJyUG9zKSB7XG5cdFx0XHRcdFx0XHRzZWxmLmNvbXBsZXRlKCk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9LFxuXHRcdFx0XHR0cnVlXG5cdFx0XHQpO1xuXHRcdH0sXG5cblx0XHQvLyBDaGVjayBpZiB3ZSBjYW4gYW5kIGhhdmUgdG8gem9vbSBmcm9tIHRodW1ibmFpbFxuXHRcdC8vPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cblx0XHRnZXRUaHVtYlBvczogZnVuY3Rpb24oc2xpZGUpIHtcblx0XHRcdHZhciByZXogPSBmYWxzZSxcblx0XHRcdFx0JHRodW1iID0gc2xpZGUuJHRodW1iLFxuXHRcdFx0XHR0aHVtYlBvcyxcblx0XHRcdFx0YnR3LFxuXHRcdFx0XHRicncsXG5cdFx0XHRcdGJidyxcblx0XHRcdFx0Ymx3O1xuXG5cdFx0XHRpZiAoISR0aHVtYiB8fCAhaW5WaWV3cG9ydCgkdGh1bWJbMF0pKSB7XG5cdFx0XHRcdHJldHVybiBmYWxzZTtcblx0XHRcdH1cblxuXHRcdFx0dGh1bWJQb3MgPSAkLmZhbmN5Ym94LmdldFRyYW5zbGF0ZSgkdGh1bWIpO1xuXG5cdFx0XHRidHcgPSBwYXJzZUZsb2F0KCR0aHVtYi5jc3MoXCJib3JkZXItdG9wLXdpZHRoXCIpIHx8IDApO1xuXHRcdFx0YnJ3ID0gcGFyc2VGbG9hdCgkdGh1bWIuY3NzKFwiYm9yZGVyLXJpZ2h0LXdpZHRoXCIpIHx8IDApO1xuXHRcdFx0YmJ3ID0gcGFyc2VGbG9hdCgkdGh1bWIuY3NzKFwiYm9yZGVyLWJvdHRvbS13aWR0aFwiKSB8fCAwKTtcblx0XHRcdGJsdyA9IHBhcnNlRmxvYXQoJHRodW1iLmNzcyhcImJvcmRlci1sZWZ0LXdpZHRoXCIpIHx8IDApO1xuXG5cdFx0XHRyZXogPSB7XG5cdFx0XHRcdHRvcDogdGh1bWJQb3MudG9wICsgYnR3LFxuXHRcdFx0XHRsZWZ0OiB0aHVtYlBvcy5sZWZ0ICsgYmx3LFxuXHRcdFx0XHR3aWR0aDogdGh1bWJQb3Mud2lkdGggLSBicncgLSBibHcsXG5cdFx0XHRcdGhlaWdodDogdGh1bWJQb3MuaGVpZ2h0IC0gYnR3IC0gYmJ3LFxuXHRcdFx0XHRzY2FsZVg6IDEsXG5cdFx0XHRcdHNjYWxlWTogMVxuXHRcdFx0fTtcblxuXHRcdFx0cmV0dXJuIHRodW1iUG9zLndpZHRoID4gMCAmJiB0aHVtYlBvcy5oZWlnaHQgPiAwID8gcmV6IDogZmFsc2U7XG5cdFx0fSxcblxuXHRcdC8vIEZpbmFsIGFkanVzdG1lbnRzIGFmdGVyIGN1cnJlbnQgZ2FsbGVyeSBpdGVtIGlzIG1vdmVkIHRvIHBvc2l0aW9uXG5cdFx0Ly8gYW5kIGl0YHMgY29udGVudCBpcyBsb2FkZWRcblx0XHQvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuXHRcdGNvbXBsZXRlOiBmdW5jdGlvbigpIHtcblx0XHRcdHZhciBzZWxmID0gdGhpcyxcblx0XHRcdFx0Y3VycmVudCA9IHNlbGYuY3VycmVudCxcblx0XHRcdFx0c2xpZGVzID0ge30sXG5cdFx0XHRcdCRlbDtcblxuXHRcdFx0aWYgKHNlbGYuaXNNb3ZlZCgpIHx8ICFjdXJyZW50LmlzTG9hZGVkKSB7XG5cdFx0XHRcdHJldHVybjtcblx0XHRcdH1cblxuXHRcdFx0aWYgKCFjdXJyZW50LmlzQ29tcGxldGUpIHtcblx0XHRcdFx0Y3VycmVudC5pc0NvbXBsZXRlID0gdHJ1ZTtcblxuXHRcdFx0XHRjdXJyZW50LiRzbGlkZS5zaWJsaW5ncygpLnRyaWdnZXIoXCJvblJlc2V0XCIpO1xuXG5cdFx0XHRcdHNlbGYucHJlbG9hZChcImlubGluZVwiKTtcblxuXHRcdFx0XHQvLyBUcmlnZ2VyIGFueSBDU1MgdHJhbnNpdG9uIGluc2lkZSB0aGUgc2xpZGVcblx0XHRcdFx0Zm9yY2VSZWRyYXcoY3VycmVudC4kc2xpZGUpO1xuXG5cdFx0XHRcdGN1cnJlbnQuJHNsaWRlLmFkZENsYXNzKFwiZmFuY3lib3gtc2xpZGUtLWNvbXBsZXRlXCIpO1xuXG5cdFx0XHRcdC8vIFJlbW92ZSB1bm5lY2Vzc2FyeSBzbGlkZXNcblx0XHRcdFx0JC5lYWNoKHNlbGYuc2xpZGVzLCBmdW5jdGlvbihrZXksIHNsaWRlKSB7XG5cdFx0XHRcdFx0aWYgKHNsaWRlLnBvcyA+PSBzZWxmLmN1cnJQb3MgLSAxICYmIHNsaWRlLnBvcyA8PSBzZWxmLmN1cnJQb3MgKyAxKSB7XG5cdFx0XHRcdFx0XHRzbGlkZXNbc2xpZGUucG9zXSA9IHNsaWRlO1xuXHRcdFx0XHRcdH0gZWxzZSBpZiAoc2xpZGUpIHtcblx0XHRcdFx0XHRcdCQuZmFuY3lib3guc3RvcChzbGlkZS4kc2xpZGUpO1xuXG5cdFx0XHRcdFx0XHRzbGlkZS4kc2xpZGUub2ZmKCkucmVtb3ZlKCk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9KTtcblxuXHRcdFx0XHRzZWxmLnNsaWRlcyA9IHNsaWRlcztcblx0XHRcdH1cblxuXHRcdFx0c2VsZi5pc0FuaW1hdGluZyA9IGZhbHNlO1xuXG5cdFx0XHRzZWxmLnVwZGF0ZUN1cnNvcigpO1xuXG5cdFx0XHRzZWxmLnRyaWdnZXIoXCJhZnRlclNob3dcIik7XG5cblx0XHRcdC8vIEF1dG9wbGF5IGZpcnN0IGh0bWw1IHZpZGVvL2F1ZGlvXG5cdFx0XHRpZiAoISFjdXJyZW50Lm9wdHMudmlkZW8uYXV0b1N0YXJ0KSB7XG5cdFx0XHRcdGN1cnJlbnQuJHNsaWRlXG5cdFx0XHRcdFx0LmZpbmQoXCJ2aWRlbyxhdWRpb1wiKVxuXHRcdFx0XHRcdC5maWx0ZXIoXCI6dmlzaWJsZTpmaXJzdFwiKVxuXHRcdFx0XHRcdC50cmlnZ2VyKFwicGxheVwiKVxuXHRcdFx0XHRcdC5vbmUoXCJlbmRlZFwiLCBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRcdGlmICh0aGlzLndlYmtpdEV4aXRGdWxsc2NyZWVuKSB7XG5cdFx0XHRcdFx0XHRcdHRoaXMud2Via2l0RXhpdEZ1bGxzY3JlZW4oKTtcblx0XHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdFx0c2VsZi5uZXh0KCk7XG5cdFx0XHRcdFx0fSk7XG5cdFx0XHR9XG5cblx0XHRcdC8vIFRyeSB0byBmb2N1cyBvbiB0aGUgZmlyc3QgZm9jdXNhYmxlIGVsZW1lbnRcblx0XHRcdGlmIChjdXJyZW50Lm9wdHMuYXV0b0ZvY3VzICYmIGN1cnJlbnQuY29udGVudFR5cGUgPT09IFwiaHRtbFwiKSB7XG5cdFx0XHRcdC8vIExvb2sgZm9yIHRoZSBmaXJzdCBpbnB1dCB3aXRoIGF1dG9mb2N1cyBhdHRyaWJ1dGVcblx0XHRcdFx0JGVsID0gY3VycmVudC4kY29udGVudC5maW5kKFwiaW5wdXRbYXV0b2ZvY3VzXTplbmFibGVkOnZpc2libGU6Zmlyc3RcIik7XG5cblx0XHRcdFx0aWYgKCRlbC5sZW5ndGgpIHtcblx0XHRcdFx0XHQkZWwudHJpZ2dlcihcImZvY3VzXCIpO1xuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdHNlbGYuZm9jdXMobnVsbCwgdHJ1ZSk7XG5cdFx0XHRcdH1cblx0XHRcdH1cblxuXHRcdFx0Ly8gQXZvaWQganVtcGluZ1xuXHRcdFx0Y3VycmVudC4kc2xpZGUuc2Nyb2xsVG9wKDApLnNjcm9sbExlZnQoMCk7XG5cdFx0fSxcblxuXHRcdC8vIFByZWxvYWQgbmV4dCBhbmQgcHJldmlvdXMgc2xpZGVzXG5cdFx0Ly8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuXHRcdHByZWxvYWQ6IGZ1bmN0aW9uKHR5cGUpIHtcblx0XHRcdHZhciBzZWxmID0gdGhpcyxcblx0XHRcdFx0cHJldixcblx0XHRcdFx0bmV4dDtcblxuXHRcdFx0aWYgKHNlbGYuZ3JvdXAubGVuZ3RoIDwgMikge1xuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR9XG5cblx0XHRcdG5leHQgPSBzZWxmLnNsaWRlc1tzZWxmLmN1cnJQb3MgKyAxXTtcblx0XHRcdHByZXYgPSBzZWxmLnNsaWRlc1tzZWxmLmN1cnJQb3MgLSAxXTtcblxuXHRcdFx0aWYgKHByZXYgJiYgcHJldi50eXBlID09PSB0eXBlKSB7XG5cdFx0XHRcdHNlbGYubG9hZFNsaWRlKHByZXYpO1xuXHRcdFx0fVxuXG5cdFx0XHRpZiAobmV4dCAmJiBuZXh0LnR5cGUgPT09IHR5cGUpIHtcblx0XHRcdFx0c2VsZi5sb2FkU2xpZGUobmV4dCk7XG5cdFx0XHR9XG5cdFx0fSxcblxuXHRcdC8vIFRyeSB0byBmaW5kIGFuZCBmb2N1cyBvbiB0aGUgZmlyc3QgZm9jdXNhYmxlIGVsZW1lbnRcblx0XHQvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cblx0XHRmb2N1czogZnVuY3Rpb24oZSwgZmlyc3RSdW4pIHtcblx0XHRcdHZhciBzZWxmID0gdGhpcyxcblx0XHRcdFx0Zm9jdXNhYmxlU3RyID0gW1xuXHRcdFx0XHRcdFwiYVtocmVmXVwiLFxuXHRcdFx0XHRcdFwiYXJlYVtocmVmXVwiLFxuXHRcdFx0XHRcdCdpbnB1dDpub3QoW2Rpc2FibGVkXSk6bm90KFt0eXBlPVwiaGlkZGVuXCJdKTpub3QoW2FyaWEtaGlkZGVuXSknLFxuXHRcdFx0XHRcdFwic2VsZWN0Om5vdChbZGlzYWJsZWRdKTpub3QoW2FyaWEtaGlkZGVuXSlcIixcblx0XHRcdFx0XHRcInRleHRhcmVhOm5vdChbZGlzYWJsZWRdKTpub3QoW2FyaWEtaGlkZGVuXSlcIixcblx0XHRcdFx0XHRcImJ1dHRvbjpub3QoW2Rpc2FibGVkXSk6bm90KFthcmlhLWhpZGRlbl0pXCIsXG5cdFx0XHRcdFx0XCJpZnJhbWVcIixcblx0XHRcdFx0XHRcIm9iamVjdFwiLFxuXHRcdFx0XHRcdFwiZW1iZWRcIixcblx0XHRcdFx0XHRcIltjb250ZW50ZWRpdGFibGVdXCIsXG5cdFx0XHRcdFx0J1t0YWJpbmRleF06bm90KFt0YWJpbmRleF49XCItXCJdKSdcblx0XHRcdFx0XS5qb2luKFwiLFwiKSxcblx0XHRcdFx0Zm9jdXNhYmxlSXRlbXMsXG5cdFx0XHRcdGZvY3VzZWRJdGVtSW5kZXg7XG5cblx0XHRcdGlmIChzZWxmLmlzQ2xvc2luZykge1xuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR9XG5cblx0XHRcdGlmIChlIHx8ICFzZWxmLmN1cnJlbnQgfHwgIXNlbGYuY3VycmVudC5pc0NvbXBsZXRlKSB7XG5cdFx0XHRcdC8vIEZvY3VzIG9uIGFueSBlbGVtZW50IGluc2lkZSBmYW5jeWJveFxuXHRcdFx0XHRmb2N1c2FibGVJdGVtcyA9IHNlbGYuJHJlZnMuY29udGFpbmVyLmZpbmQoXCIqOnZpc2libGVcIik7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHQvLyBGb2N1cyBpbnNpZGUgY3VycmVudCBzbGlkZVxuXHRcdFx0XHRmb2N1c2FibGVJdGVtcyA9IHNlbGYuY3VycmVudC4kc2xpZGUuZmluZChcIio6dmlzaWJsZVwiICsgKGZpcnN0UnVuID8gXCI6bm90KC5mYW5jeWJveC1jbG9zZS1zbWFsbClcIiA6IFwiXCIpKTtcblx0XHRcdH1cblxuXHRcdFx0Zm9jdXNhYmxlSXRlbXMgPSBmb2N1c2FibGVJdGVtcy5maWx0ZXIoZm9jdXNhYmxlU3RyKS5maWx0ZXIoZnVuY3Rpb24oKSB7XG5cdFx0XHRcdHJldHVybiAkKHRoaXMpLmNzcyhcInZpc2liaWxpdHlcIikgIT09IFwiaGlkZGVuXCIgJiYgISQodGhpcykuaGFzQ2xhc3MoXCJkaXNhYmxlZFwiKTtcblx0XHRcdH0pO1xuXG5cdFx0XHRpZiAoZm9jdXNhYmxlSXRlbXMubGVuZ3RoKSB7XG5cdFx0XHRcdGZvY3VzZWRJdGVtSW5kZXggPSBmb2N1c2FibGVJdGVtcy5pbmRleChkb2N1bWVudC5hY3RpdmVFbGVtZW50KTtcblxuXHRcdFx0XHRpZiAoZSAmJiBlLnNoaWZ0S2V5KSB7XG5cdFx0XHRcdFx0Ly8gQmFjayB0YWJcblx0XHRcdFx0XHRpZiAoZm9jdXNlZEl0ZW1JbmRleCA8IDAgfHwgZm9jdXNlZEl0ZW1JbmRleCA9PSAwKSB7XG5cdFx0XHRcdFx0XHRlLnByZXZlbnREZWZhdWx0KCk7XG5cblx0XHRcdFx0XHRcdGZvY3VzYWJsZUl0ZW1zLmVxKGZvY3VzYWJsZUl0ZW1zLmxlbmd0aCAtIDEpLnRyaWdnZXIoXCJmb2N1c1wiKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0Ly8gT3V0c2lkZSBvciBGb3J3YXJkIHRhYlxuXHRcdFx0XHRcdGlmIChmb2N1c2VkSXRlbUluZGV4IDwgMCB8fCBmb2N1c2VkSXRlbUluZGV4ID09IGZvY3VzYWJsZUl0ZW1zLmxlbmd0aCAtIDEpIHtcblx0XHRcdFx0XHRcdGlmIChlKSB7XG5cdFx0XHRcdFx0XHRcdGUucHJldmVudERlZmF1bHQoKTtcblx0XHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdFx0Zm9jdXNhYmxlSXRlbXMuZXEoMCkudHJpZ2dlcihcImZvY3VzXCIpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0c2VsZi4kcmVmcy5jb250YWluZXIudHJpZ2dlcihcImZvY3VzXCIpO1xuXHRcdFx0fVxuXHRcdH0sXG5cblx0XHQvLyBBY3RpdmF0ZXMgY3VycmVudCBpbnN0YW5jZSAtIGJyaW5ncyBjb250YWluZXIgdG8gdGhlIGZyb250IGFuZCBlbmFibGVzIGtleWJvYXJkLFxuXHRcdC8vIG5vdGlmaWVzIG90aGVyIGluc3RhbmNlcyBhYm91dCBkZWFjdGl2YXRpbmdcblx0XHQvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuXHRcdGFjdGl2YXRlOiBmdW5jdGlvbigpIHtcblx0XHRcdHZhciBzZWxmID0gdGhpcztcblxuXHRcdFx0Ly8gRGVhY3RpdmF0ZSBhbGwgaW5zdGFuY2VzXG5cdFx0XHQkKFwiLmZhbmN5Ym94LWNvbnRhaW5lclwiKS5lYWNoKGZ1bmN0aW9uKCkge1xuXHRcdFx0XHR2YXIgaW5zdGFuY2UgPSAkKHRoaXMpLmRhdGEoXCJGYW5jeUJveFwiKTtcblxuXHRcdFx0XHQvLyBTa2lwIHNlbGYgYW5kIGNsb3NpbmcgaW5zdGFuY2VzXG5cdFx0XHRcdGlmIChpbnN0YW5jZSAmJiBpbnN0YW5jZS5pZCAhPT0gc2VsZi5pZCAmJiAhaW5zdGFuY2UuaXNDbG9zaW5nKSB7XG5cdFx0XHRcdFx0aW5zdGFuY2UudHJpZ2dlcihcIm9uRGVhY3RpdmF0ZVwiKTtcblxuXHRcdFx0XHRcdGluc3RhbmNlLnJlbW92ZUV2ZW50cygpO1xuXG5cdFx0XHRcdFx0aW5zdGFuY2UuaXNWaXNpYmxlID0gZmFsc2U7XG5cdFx0XHRcdH1cblx0XHRcdH0pO1xuXG5cdFx0XHRzZWxmLmlzVmlzaWJsZSA9IHRydWU7XG5cblx0XHRcdGlmIChzZWxmLmN1cnJlbnQgfHwgc2VsZi5pc0lkbGUpIHtcblx0XHRcdFx0c2VsZi51cGRhdGUoKTtcblxuXHRcdFx0XHRzZWxmLnVwZGF0ZUNvbnRyb2xzKCk7XG5cdFx0XHR9XG5cblx0XHRcdHNlbGYudHJpZ2dlcihcIm9uQWN0aXZhdGVcIik7XG5cblx0XHRcdHNlbGYuYWRkRXZlbnRzKCk7XG5cdFx0fSxcblxuXHRcdC8vIFN0YXJ0IGNsb3NpbmcgcHJvY2VkdXJlXG5cdFx0Ly8gVGhpcyB3aWxsIHN0YXJ0IFwiem9vbS1vdXRcIiBhbmltYXRpb24gaWYgbmVlZGVkIGFuZCBjbGVhbiBldmVyeXRoaW5nIHVwIGFmdGVyd2FyZHNcblx0XHQvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuXHRcdGNsb3NlOiBmdW5jdGlvbihlLCBkKSB7XG5cdFx0XHR2YXIgc2VsZiA9IHRoaXMsXG5cdFx0XHRcdGN1cnJlbnQgPSBzZWxmLmN1cnJlbnQsXG5cdFx0XHRcdGVmZmVjdCxcblx0XHRcdFx0ZHVyYXRpb24sXG5cdFx0XHRcdCRjb250ZW50LFxuXHRcdFx0XHRkb21SZWN0LFxuXHRcdFx0XHRvcGFjaXR5LFxuXHRcdFx0XHRzdGFydCxcblx0XHRcdFx0ZW5kO1xuXG5cdFx0XHR2YXIgZG9uZSA9IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRzZWxmLmNsZWFuVXAoZSk7XG5cdFx0XHR9O1xuXG5cdFx0XHRpZiAoc2VsZi5pc0Nsb3NpbmcpIHtcblx0XHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdFx0fVxuXG5cdFx0XHRzZWxmLmlzQ2xvc2luZyA9IHRydWU7XG5cblx0XHRcdC8vIElmIGJlZm9yZUNsb3NlIGNhbGxiYWNrIHByZXZlbnRzIGNsb3NpbmcsIG1ha2Ugc3VyZSBjb250ZW50IGlzIGNlbnRlcmVkXG5cdFx0XHRpZiAoc2VsZi50cmlnZ2VyKFwiYmVmb3JlQ2xvc2VcIiwgZSkgPT09IGZhbHNlKSB7XG5cdFx0XHRcdHNlbGYuaXNDbG9zaW5nID0gZmFsc2U7XG5cblx0XHRcdFx0cmVxdWVzdEFGcmFtZShmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRzZWxmLnVwZGF0ZSgpO1xuXHRcdFx0XHR9KTtcblxuXHRcdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0XHR9XG5cblx0XHRcdC8vIFJlbW92ZSBhbGwgZXZlbnRzXG5cdFx0XHQvLyBJZiB0aGVyZSBhcmUgbXVsdGlwbGUgaW5zdGFuY2VzLCB0aGV5IHdpbGwgYmUgc2V0IGFnYWluIGJ5IFwiYWN0aXZhdGVcIiBtZXRob2Rcblx0XHRcdHNlbGYucmVtb3ZlRXZlbnRzKCk7XG5cblx0XHRcdCRjb250ZW50ID0gY3VycmVudC4kY29udGVudDtcblx0XHRcdGVmZmVjdCA9IGN1cnJlbnQub3B0cy5hbmltYXRpb25FZmZlY3Q7XG5cdFx0XHRkdXJhdGlvbiA9ICQuaXNOdW1lcmljKGQpID8gZCA6IGVmZmVjdCA/IGN1cnJlbnQub3B0cy5hbmltYXRpb25EdXJhdGlvbiA6IDA7XG5cblx0XHRcdGN1cnJlbnQuJHNsaWRlLnJlbW92ZUNsYXNzKFwiZmFuY3lib3gtc2xpZGUtLWNvbXBsZXRlIGZhbmN5Ym94LXNsaWRlLS1uZXh0IGZhbmN5Ym94LXNsaWRlLS1wcmV2aW91cyBmYW5jeWJveC1hbmltYXRlZFwiKTtcblxuXHRcdFx0aWYgKGUgIT09IHRydWUpIHtcblx0XHRcdFx0JC5mYW5jeWJveC5zdG9wKGN1cnJlbnQuJHNsaWRlKTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdGVmZmVjdCA9IGZhbHNlO1xuXHRcdFx0fVxuXG5cdFx0XHQvLyBSZW1vdmUgb3RoZXIgc2xpZGVzXG5cdFx0XHRjdXJyZW50LiRzbGlkZVxuXHRcdFx0XHQuc2libGluZ3MoKVxuXHRcdFx0XHQudHJpZ2dlcihcIm9uUmVzZXRcIilcblx0XHRcdFx0LnJlbW92ZSgpO1xuXG5cdFx0XHQvLyBUcmlnZ2VyIGFuaW1hdGlvbnNcblx0XHRcdGlmIChkdXJhdGlvbikge1xuXHRcdFx0XHRzZWxmLiRyZWZzLmNvbnRhaW5lclxuXHRcdFx0XHRcdC5yZW1vdmVDbGFzcyhcImZhbmN5Ym94LWlzLW9wZW5cIilcblx0XHRcdFx0XHQuYWRkQ2xhc3MoXCJmYW5jeWJveC1pcy1jbG9zaW5nXCIpXG5cdFx0XHRcdFx0LmNzcyhcInRyYW5zaXRpb24tZHVyYXRpb25cIiwgZHVyYXRpb24gKyBcIm1zXCIpO1xuXHRcdFx0fVxuXG5cdFx0XHQvLyBDbGVhbiB1cFxuXHRcdFx0c2VsZi5oaWRlTG9hZGluZyhjdXJyZW50KTtcblxuXHRcdFx0c2VsZi5oaWRlQ29udHJvbHModHJ1ZSk7XG5cblx0XHRcdHNlbGYudXBkYXRlQ3Vyc29yKCk7XG5cblx0XHRcdC8vIENoZWNrIGlmIHBvc3NpYmxlIHRvIHpvb20tb3V0XG5cdFx0XHRpZiAoXG5cdFx0XHRcdGVmZmVjdCA9PT0gXCJ6b29tXCIgJiZcblx0XHRcdFx0ISgkY29udGVudCAmJiBkdXJhdGlvbiAmJiBjdXJyZW50LnR5cGUgPT09IFwiaW1hZ2VcIiAmJiAhc2VsZi5pc01vdmVkKCkgJiYgIWN1cnJlbnQuaGFzRXJyb3IgJiYgKGVuZCA9IHNlbGYuZ2V0VGh1bWJQb3MoY3VycmVudCkpKVxuXHRcdFx0KSB7XG5cdFx0XHRcdGVmZmVjdCA9IFwiZmFkZVwiO1xuXHRcdFx0fVxuXG5cdFx0XHRpZiAoZWZmZWN0ID09PSBcInpvb21cIikge1xuXHRcdFx0XHQkLmZhbmN5Ym94LnN0b3AoJGNvbnRlbnQpO1xuXG5cdFx0XHRcdGRvbVJlY3QgPSAkLmZhbmN5Ym94LmdldFRyYW5zbGF0ZSgkY29udGVudCk7XG5cblx0XHRcdFx0c3RhcnQgPSB7XG5cdFx0XHRcdFx0dG9wOiBkb21SZWN0LnRvcCxcblx0XHRcdFx0XHRsZWZ0OiBkb21SZWN0LmxlZnQsXG5cdFx0XHRcdFx0c2NhbGVYOiBkb21SZWN0LndpZHRoIC8gZW5kLndpZHRoLFxuXHRcdFx0XHRcdHNjYWxlWTogZG9tUmVjdC5oZWlnaHQgLyBlbmQuaGVpZ2h0LFxuXHRcdFx0XHRcdHdpZHRoOiBlbmQud2lkdGgsXG5cdFx0XHRcdFx0aGVpZ2h0OiBlbmQuaGVpZ2h0XG5cdFx0XHRcdH07XG5cblx0XHRcdFx0Ly8gQ2hlY2sgaWYgd2UgbmVlZCB0byBhbmltYXRlIG9wYWNpdHlcblx0XHRcdFx0b3BhY2l0eSA9IGN1cnJlbnQub3B0cy56b29tT3BhY2l0eTtcblxuXHRcdFx0XHRpZiAob3BhY2l0eSA9PSBcImF1dG9cIikge1xuXHRcdFx0XHRcdG9wYWNpdHkgPSBNYXRoLmFicyhjdXJyZW50LndpZHRoIC8gY3VycmVudC5oZWlnaHQgLSBlbmQud2lkdGggLyBlbmQuaGVpZ2h0KSA+IDAuMTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdGlmIChvcGFjaXR5KSB7XG5cdFx0XHRcdFx0ZW5kLm9wYWNpdHkgPSAwO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0JC5mYW5jeWJveC5zZXRUcmFuc2xhdGUoJGNvbnRlbnQsIHN0YXJ0KTtcblxuXHRcdFx0XHRmb3JjZVJlZHJhdygkY29udGVudCk7XG5cblx0XHRcdFx0JC5mYW5jeWJveC5hbmltYXRlKCRjb250ZW50LCBlbmQsIGR1cmF0aW9uLCBkb25lKTtcblxuXHRcdFx0XHRyZXR1cm4gdHJ1ZTtcblx0XHRcdH1cblxuXHRcdFx0aWYgKGVmZmVjdCAmJiBkdXJhdGlvbikge1xuXHRcdFx0XHQkLmZhbmN5Ym94LmFuaW1hdGUoXG5cdFx0XHRcdFx0Y3VycmVudC4kc2xpZGUuYWRkQ2xhc3MoXCJmYW5jeWJveC1zbGlkZS0tcHJldmlvdXNcIikucmVtb3ZlQ2xhc3MoXCJmYW5jeWJveC1zbGlkZS0tY3VycmVudFwiKSxcblx0XHRcdFx0XHRcImZhbmN5Ym94LWFuaW1hdGVkIGZhbmN5Ym94LWZ4LVwiICsgZWZmZWN0LFxuXHRcdFx0XHRcdGR1cmF0aW9uLFxuXHRcdFx0XHRcdGRvbmVcblx0XHRcdFx0KTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdC8vIElmIHNraXAgYW5pbWF0aW9uXG5cdFx0XHRcdGlmIChlID09PSB0cnVlKSB7XG5cdFx0XHRcdFx0c2V0VGltZW91dChkb25lLCBkdXJhdGlvbik7XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0ZG9uZSgpO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cblx0XHRcdHJldHVybiB0cnVlO1xuXHRcdH0sXG5cblx0XHQvLyBGaW5hbCBhZGp1c3RtZW50cyBhZnRlciByZW1vdmluZyB0aGUgaW5zdGFuY2Vcblx0XHQvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuXHRcdGNsZWFuVXA6IGZ1bmN0aW9uKGUpIHtcblx0XHRcdHZhciBzZWxmID0gdGhpcyxcblx0XHRcdFx0aW5zdGFuY2UsXG5cdFx0XHRcdCRmb2N1cyA9IHNlbGYuY3VycmVudC5vcHRzLiRvcmlnLFxuXHRcdFx0XHR4LFxuXHRcdFx0XHR5O1xuXG5cdFx0XHRzZWxmLmN1cnJlbnQuJHNsaWRlLnRyaWdnZXIoXCJvblJlc2V0XCIpO1xuXG5cdFx0XHRzZWxmLiRyZWZzLmNvbnRhaW5lci5lbXB0eSgpLnJlbW92ZSgpO1xuXG5cdFx0XHRzZWxmLnRyaWdnZXIoXCJhZnRlckNsb3NlXCIsIGUpO1xuXG5cdFx0XHQvLyBQbGFjZSBiYWNrIGZvY3VzXG5cdFx0XHRpZiAoISFzZWxmLmN1cnJlbnQub3B0cy5iYWNrRm9jdXMpIHtcblx0XHRcdFx0aWYgKCEkZm9jdXMgfHwgISRmb2N1cy5sZW5ndGggfHwgISRmb2N1cy5pcyhcIjp2aXNpYmxlXCIpKSB7XG5cdFx0XHRcdFx0JGZvY3VzID0gc2VsZi4kdHJpZ2dlcjtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdGlmICgkZm9jdXMgJiYgJGZvY3VzLmxlbmd0aCkge1xuXHRcdFx0XHRcdHggPSB3aW5kb3cuc2Nyb2xsWDtcblx0XHRcdFx0XHR5ID0gd2luZG93LnNjcm9sbFk7XG5cblx0XHRcdFx0XHQkZm9jdXMudHJpZ2dlcihcImZvY3VzXCIpO1xuXG5cdFx0XHRcdFx0JChcImh0bWwsIGJvZHlcIilcblx0XHRcdFx0XHRcdC5zY3JvbGxUb3AoeSlcblx0XHRcdFx0XHRcdC5zY3JvbGxMZWZ0KHgpO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cblx0XHRcdHNlbGYuY3VycmVudCA9IG51bGw7XG5cblx0XHRcdC8vIENoZWNrIGlmIHRoZXJlIGFyZSBvdGhlciBpbnN0YW5jZXNcblx0XHRcdGluc3RhbmNlID0gJC5mYW5jeWJveC5nZXRJbnN0YW5jZSgpO1xuXG5cdFx0XHRpZiAoaW5zdGFuY2UpIHtcblx0XHRcdFx0aW5zdGFuY2UuYWN0aXZhdGUoKTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdCQoXCJib2R5XCIpLnJlbW92ZUNsYXNzKFwiZmFuY3lib3gtYWN0aXZlIGNvbXBlbnNhdGUtZm9yLXNjcm9sbGJhclwiKTtcblxuXHRcdFx0XHQkKFwiI2ZhbmN5Ym94LXN0eWxlLW5vc2Nyb2xsXCIpLnJlbW92ZSgpO1xuXHRcdFx0fVxuXHRcdH0sXG5cblx0XHQvLyBDYWxsIGNhbGxiYWNrIGFuZCB0cmlnZ2VyIGFuIGV2ZW50XG5cdFx0Ly8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG5cdFx0dHJpZ2dlcjogZnVuY3Rpb24obmFtZSwgc2xpZGUpIHtcblx0XHRcdHZhciBhcmdzID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzLCAxKSxcblx0XHRcdFx0c2VsZiA9IHRoaXMsXG5cdFx0XHRcdG9iaiA9IHNsaWRlICYmIHNsaWRlLm9wdHMgPyBzbGlkZSA6IHNlbGYuY3VycmVudCxcblx0XHRcdFx0cmV6O1xuXG5cdFx0XHRpZiAob2JqKSB7XG5cdFx0XHRcdGFyZ3MudW5zaGlmdChvYmopO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0b2JqID0gc2VsZjtcblx0XHRcdH1cblxuXHRcdFx0YXJncy51bnNoaWZ0KHNlbGYpO1xuXG5cdFx0XHRpZiAoJC5pc0Z1bmN0aW9uKG9iai5vcHRzW25hbWVdKSkge1xuXHRcdFx0XHRyZXogPSBvYmoub3B0c1tuYW1lXS5hcHBseShvYmosIGFyZ3MpO1xuXHRcdFx0fVxuXG5cdFx0XHRpZiAocmV6ID09PSBmYWxzZSkge1xuXHRcdFx0XHRyZXR1cm4gcmV6O1xuXHRcdFx0fVxuXG5cdFx0XHRpZiAobmFtZSA9PT0gXCJhZnRlckNsb3NlXCIgfHwgIXNlbGYuJHJlZnMpIHtcblx0XHRcdFx0JEQudHJpZ2dlcihuYW1lICsgXCIuZmJcIiwgYXJncyk7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRzZWxmLiRyZWZzLmNvbnRhaW5lci50cmlnZ2VyKG5hbWUgKyBcIi5mYlwiLCBhcmdzKTtcblx0XHRcdH1cblx0XHR9LFxuXG5cdFx0Ly8gVXBkYXRlIGluZm9iYXIgdmFsdWVzLCBuYXZpZ2F0aW9uIGJ1dHRvbiBzdGF0ZXMgYW5kIHJldmVhbCBjYXB0aW9uXG5cdFx0Ly8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cblx0XHR1cGRhdGVDb250cm9sczogZnVuY3Rpb24oKSB7XG5cdFx0XHR2YXIgc2VsZiA9IHRoaXMsXG5cdFx0XHRcdGN1cnJlbnQgPSBzZWxmLmN1cnJlbnQsXG5cdFx0XHRcdGluZGV4ID0gY3VycmVudC5pbmRleCxcblx0XHRcdFx0JGNvbnRhaW5lciA9IHNlbGYuJHJlZnMuY29udGFpbmVyLFxuXHRcdFx0XHQkY2FwdGlvbiA9IHNlbGYuJHJlZnMuY2FwdGlvbixcblx0XHRcdFx0Y2FwdGlvbiA9IGN1cnJlbnQub3B0cy5jYXB0aW9uO1xuXG5cdFx0XHQvLyBSZWNhbGN1bGF0ZSBjb250ZW50IGRpbWVuc2lvbnNcblx0XHRcdGN1cnJlbnQuJHNsaWRlLnRyaWdnZXIoXCJyZWZyZXNoXCIpO1xuXG5cdFx0XHRzZWxmLiRjYXB0aW9uID0gY2FwdGlvbiAmJiBjYXB0aW9uLmxlbmd0aCA/ICRjYXB0aW9uLmh0bWwoY2FwdGlvbikgOiBudWxsO1xuXG5cdFx0XHRpZiAoIXNlbGYuaGFzSGlkZGVuQ29udHJvbHMgJiYgIXNlbGYuaXNJZGxlKSB7XG5cdFx0XHRcdHNlbGYuc2hvd0NvbnRyb2xzKCk7XG5cdFx0XHR9XG5cblx0XHRcdC8vIFVwZGF0ZSBpbmZvIGFuZCBuYXZpZ2F0aW9uIGVsZW1lbnRzXG5cdFx0XHQkY29udGFpbmVyLmZpbmQoXCJbZGF0YS1mYW5jeWJveC1jb3VudF1cIikuaHRtbChzZWxmLmdyb3VwLmxlbmd0aCk7XG5cdFx0XHQkY29udGFpbmVyLmZpbmQoXCJbZGF0YS1mYW5jeWJveC1pbmRleF1cIikuaHRtbChpbmRleCArIDEpO1xuXG5cdFx0XHQkY29udGFpbmVyLmZpbmQoXCJbZGF0YS1mYW5jeWJveC1wcmV2XVwiKS5wcm9wKFwiZGlzYWJsZWRcIiwgIWN1cnJlbnQub3B0cy5sb29wICYmIGluZGV4IDw9IDApO1xuXHRcdFx0JGNvbnRhaW5lci5maW5kKFwiW2RhdGEtZmFuY3lib3gtbmV4dF1cIikucHJvcChcImRpc2FibGVkXCIsICFjdXJyZW50Lm9wdHMubG9vcCAmJiBpbmRleCA+PSBzZWxmLmdyb3VwLmxlbmd0aCAtIDEpO1xuXG5cdFx0XHRpZiAoY3VycmVudC50eXBlID09PSBcImltYWdlXCIpIHtcblx0XHRcdFx0Ly8gUmUtZW5hYmxlIGJ1dHRvbnM7IHVwZGF0ZSBkb3dubG9hZCBidXR0b24gc291cmNlXG5cdFx0XHRcdCRjb250YWluZXJcblx0XHRcdFx0XHQuZmluZChcIltkYXRhLWZhbmN5Ym94LXpvb21dXCIpXG5cdFx0XHRcdFx0LnNob3coKVxuXHRcdFx0XHRcdC5lbmQoKVxuXHRcdFx0XHRcdC5maW5kKFwiW2RhdGEtZmFuY3lib3gtZG93bmxvYWRdXCIpXG5cdFx0XHRcdFx0LmF0dHIoXCJocmVmXCIsIGN1cnJlbnQub3B0cy5pbWFnZS5zcmMgfHwgY3VycmVudC5zcmMpXG5cdFx0XHRcdFx0LnNob3coKTtcblx0XHRcdH0gZWxzZSBpZiAoY3VycmVudC5vcHRzLnRvb2xiYXIpIHtcblx0XHRcdFx0JGNvbnRhaW5lci5maW5kKFwiW2RhdGEtZmFuY3lib3gtZG93bmxvYWRdLFtkYXRhLWZhbmN5Ym94LXpvb21dXCIpLmhpZGUoKTtcblx0XHRcdH1cblxuXHRcdFx0Ly8gTWFrZSBzdXJlIGZvY3VzIGlzIG5vdCBvbiBkaXNhYmxlZCBidXR0b24vZWxlbWVudFxuXHRcdFx0aWYgKCQoZG9jdW1lbnQuYWN0aXZlRWxlbWVudCkuaXMoXCI6aGlkZGVuLFtkaXNhYmxlZF1cIikpIHtcblx0XHRcdFx0c2VsZi4kcmVmcy5jb250YWluZXIudHJpZ2dlcihcImZvY3VzXCIpO1xuXHRcdFx0fVxuXHRcdH0sXG5cblx0XHQvLyBIaWRlIHRvb2xiYXIgYW5kIGNhcHRpb25cblx0XHQvLyA9PT09PT09PT09PT09PT09PT09PT09PT1cblxuXHRcdGhpZGVDb250cm9sczogZnVuY3Rpb24oYW5kQ2FwdGlvbikge1xuXHRcdFx0dmFyIHNlbGYgPSB0aGlzLFxuXHRcdFx0XHRhcnIgPSBbXCJpbmZvYmFyXCIsIFwidG9vbGJhclwiLCBcIm5hdlwiXTtcblxuXHRcdFx0aWYgKGFuZENhcHRpb24gfHwgIXNlbGYuY3VycmVudC5vcHRzLnByZXZlbnRDYXB0aW9uT3ZlcmxhcCkge1xuXHRcdFx0XHRhcnIucHVzaChcImNhcHRpb25cIik7XG5cdFx0XHR9XG5cblx0XHRcdHRoaXMuJHJlZnMuY29udGFpbmVyLnJlbW92ZUNsYXNzKFxuXHRcdFx0XHRhcnJcblx0XHRcdFx0XHQubWFwKGZ1bmN0aW9uKGkpIHtcblx0XHRcdFx0XHRcdHJldHVybiBcImZhbmN5Ym94LXNob3ctXCIgKyBpO1xuXHRcdFx0XHRcdH0pXG5cdFx0XHRcdFx0LmpvaW4oXCIgXCIpXG5cdFx0XHQpO1xuXG5cdFx0XHR0aGlzLmhhc0hpZGRlbkNvbnRyb2xzID0gdHJ1ZTtcblx0XHR9LFxuXG5cdFx0c2hvd0NvbnRyb2xzOiBmdW5jdGlvbigpIHtcblx0XHRcdHZhciBzZWxmID0gdGhpcyxcblx0XHRcdFx0b3B0cyA9IHNlbGYuY3VycmVudCA/IHNlbGYuY3VycmVudC5vcHRzIDogc2VsZi5vcHRzLFxuXHRcdFx0XHQkY29udGFpbmVyID0gc2VsZi4kcmVmcy5jb250YWluZXI7XG5cblx0XHRcdHNlbGYuaGFzSGlkZGVuQ29udHJvbHMgPSBmYWxzZTtcblx0XHRcdHNlbGYuaWRsZVNlY29uZHNDb3VudGVyID0gMDtcblxuXHRcdFx0JGNvbnRhaW5lclxuXHRcdFx0XHQudG9nZ2xlQ2xhc3MoXCJmYW5jeWJveC1zaG93LXRvb2xiYXJcIiwgISEob3B0cy50b29sYmFyICYmIG9wdHMuYnV0dG9ucykpXG5cdFx0XHRcdC50b2dnbGVDbGFzcyhcImZhbmN5Ym94LXNob3ctaW5mb2JhclwiLCAhIShvcHRzLmluZm9iYXIgJiYgc2VsZi5ncm91cC5sZW5ndGggPiAxKSlcblx0XHRcdFx0LnRvZ2dsZUNsYXNzKFwiZmFuY3lib3gtc2hvdy1jYXB0aW9uXCIsICEhc2VsZi4kY2FwdGlvbilcblx0XHRcdFx0LnRvZ2dsZUNsYXNzKFwiZmFuY3lib3gtc2hvdy1uYXZcIiwgISEob3B0cy5hcnJvd3MgJiYgc2VsZi5ncm91cC5sZW5ndGggPiAxKSlcblx0XHRcdFx0LnRvZ2dsZUNsYXNzKFwiZmFuY3lib3gtaXMtbW9kYWxcIiwgISFvcHRzLm1vZGFsKTtcblx0XHR9LFxuXG5cdFx0Ly8gVG9nZ2xlIHRvb2xiYXIgYW5kIGNhcHRpb25cblx0XHQvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG5cdFx0dG9nZ2xlQ29udHJvbHM6IGZ1bmN0aW9uKCkge1xuXHRcdFx0aWYgKHRoaXMuaGFzSGlkZGVuQ29udHJvbHMpIHtcblx0XHRcdFx0dGhpcy5zaG93Q29udHJvbHMoKTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdHRoaXMuaGlkZUNvbnRyb2xzKCk7XG5cdFx0XHR9XG5cdFx0fVxuXHR9KTtcblxuXHQkLmZhbmN5Ym94ID0ge1xuXHRcdHZlcnNpb246IFwiMy41LjJcIixcblx0XHRkZWZhdWx0czogZGVmYXVsdHMsXG5cblx0XHQvLyBHZXQgY3VycmVudCBpbnN0YW5jZSBhbmQgZXhlY3V0ZSBhIGNvbW1hbmQuXG5cdFx0Ly9cblx0XHQvLyBFeGFtcGxlcyBvZiB1c2FnZTpcblx0XHQvL1xuXHRcdC8vICAgJGluc3RhbmNlID0gJC5mYW5jeWJveC5nZXRJbnN0YW5jZSgpO1xuXHRcdC8vICAgJC5mYW5jeWJveC5nZXRJbnN0YW5jZSgpLmp1bXBUbyggMSApO1xuXHRcdC8vICAgJC5mYW5jeWJveC5nZXRJbnN0YW5jZSggJ2p1bXBUbycsIDEgKTtcblx0XHQvLyAgICQuZmFuY3lib3guZ2V0SW5zdGFuY2UoIGZ1bmN0aW9uKCkge1xuXHRcdC8vICAgICAgIGNvbnNvbGUuaW5mbyggdGhpcy5jdXJySW5kZXggKTtcblx0XHQvLyAgIH0pO1xuXHRcdC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG5cdFx0Z2V0SW5zdGFuY2U6IGZ1bmN0aW9uKGNvbW1hbmQpIHtcblx0XHRcdHZhciBpbnN0YW5jZSA9ICQoJy5mYW5jeWJveC1jb250YWluZXI6bm90KFwiLmZhbmN5Ym94LWlzLWNsb3NpbmdcIik6bGFzdCcpLmRhdGEoXCJGYW5jeUJveFwiKSxcblx0XHRcdFx0YXJncyA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cywgMSk7XG5cblx0XHRcdGlmIChpbnN0YW5jZSBpbnN0YW5jZW9mIEZhbmN5Qm94KSB7XG5cdFx0XHRcdGlmICgkLnR5cGUoY29tbWFuZCkgPT09IFwic3RyaW5nXCIpIHtcblx0XHRcdFx0XHRpbnN0YW5jZVtjb21tYW5kXS5hcHBseShpbnN0YW5jZSwgYXJncyk7XG5cdFx0XHRcdH0gZWxzZSBpZiAoJC50eXBlKGNvbW1hbmQpID09PSBcImZ1bmN0aW9uXCIpIHtcblx0XHRcdFx0XHRjb21tYW5kLmFwcGx5KGluc3RhbmNlLCBhcmdzKTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdHJldHVybiBpbnN0YW5jZTtcblx0XHRcdH1cblxuXHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdH0sXG5cblx0XHQvLyBDcmVhdGUgbmV3IGluc3RhbmNlXG5cdFx0Ly8gPT09PT09PT09PT09PT09PT09PVxuXG5cdFx0b3BlbjogZnVuY3Rpb24oaXRlbXMsIG9wdHMsIGluZGV4KSB7XG5cdFx0XHRyZXR1cm4gbmV3IEZhbmN5Qm94KGl0ZW1zLCBvcHRzLCBpbmRleCk7XG5cdFx0fSxcblxuXHRcdC8vIENsb3NlIGN1cnJlbnQgb3IgYWxsIGluc3RhbmNlc1xuXHRcdC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG5cdFx0Y2xvc2U6IGZ1bmN0aW9uKGFsbCkge1xuXHRcdFx0dmFyIGluc3RhbmNlID0gdGhpcy5nZXRJbnN0YW5jZSgpO1xuXG5cdFx0XHRpZiAoaW5zdGFuY2UpIHtcblx0XHRcdFx0aW5zdGFuY2UuY2xvc2UoKTtcblxuXHRcdFx0XHQvLyBUcnkgdG8gZmluZCBhbmQgY2xvc2UgbmV4dCBpbnN0YW5jZVxuXHRcdFx0XHRpZiAoYWxsID09PSB0cnVlKSB7XG5cdFx0XHRcdFx0dGhpcy5jbG9zZShhbGwpO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fSxcblxuXHRcdC8vIENsb3NlIGFsbCBpbnN0YW5jZXMgYW5kIHVuYmluZCBhbGwgZXZlbnRzXG5cdFx0Ly8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuXHRcdGRlc3Ryb3k6IGZ1bmN0aW9uKCkge1xuXHRcdFx0dGhpcy5jbG9zZSh0cnVlKTtcblxuXHRcdFx0JEQuYWRkKFwiYm9keVwiKS5vZmYoXCJjbGljay5mYi1zdGFydFwiLCBcIioqXCIpO1xuXHRcdH0sXG5cblx0XHQvLyBUcnkgdG8gZGV0ZWN0IG1vYmlsZSBkZXZpY2VzXG5cdFx0Ly8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG5cdFx0aXNNb2JpbGU6IC9BbmRyb2lkfHdlYk9TfGlQaG9uZXxpUGFkfGlQb2R8QmxhY2tCZXJyeXxJRU1vYmlsZXxPcGVyYSBNaW5pL2kudGVzdChuYXZpZ2F0b3IudXNlckFnZW50KSxcblxuXHRcdC8vIERldGVjdCBpZiAndHJhbnNsYXRlM2QnIHN1cHBvcnQgaXMgYXZhaWxhYmxlXG5cdFx0Ly8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuXHRcdHVzZTNkOiAoZnVuY3Rpb24oKSB7XG5cdFx0XHR2YXIgZGl2ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImRpdlwiKTtcblxuXHRcdFx0cmV0dXJuIChcblx0XHRcdFx0d2luZG93LmdldENvbXB1dGVkU3R5bGUgJiZcblx0XHRcdFx0d2luZG93LmdldENvbXB1dGVkU3R5bGUoZGl2KSAmJlxuXHRcdFx0XHR3aW5kb3cuZ2V0Q29tcHV0ZWRTdHlsZShkaXYpLmdldFByb3BlcnR5VmFsdWUoXCJ0cmFuc2Zvcm1cIikgJiZcblx0XHRcdFx0IShkb2N1bWVudC5kb2N1bWVudE1vZGUgJiYgZG9jdW1lbnQuZG9jdW1lbnRNb2RlIDwgMTEpXG5cdFx0XHQpO1xuXHRcdH0pKCksXG5cblx0XHQvLyBIZWxwZXIgZnVuY3Rpb24gdG8gZ2V0IGN1cnJlbnQgdmlzdWFsIHN0YXRlIG9mIGFuIGVsZW1lbnRcblx0XHQvLyByZXR1cm5zIGFycmF5WyB0b3AsIGxlZnQsIGhvcml6b250YWwtc2NhbGUsIHZlcnRpY2FsLXNjYWxlLCBvcGFjaXR5IF1cblx0XHQvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuXHRcdGdldFRyYW5zbGF0ZTogZnVuY3Rpb24oJGVsKSB7XG5cdFx0XHR2YXIgZG9tUmVjdDtcblxuXHRcdFx0aWYgKCEkZWwgfHwgISRlbC5sZW5ndGgpIHtcblx0XHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdFx0fVxuXG5cdFx0XHRkb21SZWN0ID0gJGVsWzBdLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO1xuXG5cdFx0XHRyZXR1cm4ge1xuXHRcdFx0XHR0b3A6IGRvbVJlY3QudG9wIHx8IDAsXG5cdFx0XHRcdGxlZnQ6IGRvbVJlY3QubGVmdCB8fCAwLFxuXHRcdFx0XHR3aWR0aDogZG9tUmVjdC53aWR0aCxcblx0XHRcdFx0aGVpZ2h0OiBkb21SZWN0LmhlaWdodCxcblx0XHRcdFx0b3BhY2l0eTogcGFyc2VGbG9hdCgkZWwuY3NzKFwib3BhY2l0eVwiKSlcblx0XHRcdH07XG5cdFx0fSxcblxuXHRcdC8vIFNob3J0Y3V0IGZvciBzZXR0aW5nIFwidHJhbnNsYXRlM2RcIiBwcm9wZXJ0aWVzIGZvciBlbGVtZW50XG5cdFx0Ly8gQ2FuIHNldCBiZSB1c2VkIHRvIHNldCBvcGFjaXR5LCB0b29cblx0XHQvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG5cdFx0c2V0VHJhbnNsYXRlOiBmdW5jdGlvbigkZWwsIHByb3BzKSB7XG5cdFx0XHR2YXIgc3RyID0gXCJcIixcblx0XHRcdFx0Y3NzID0ge307XG5cblx0XHRcdGlmICghJGVsIHx8ICFwcm9wcykge1xuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR9XG5cblx0XHRcdGlmIChwcm9wcy5sZWZ0ICE9PSB1bmRlZmluZWQgfHwgcHJvcHMudG9wICE9PSB1bmRlZmluZWQpIHtcblx0XHRcdFx0c3RyID1cblx0XHRcdFx0XHQocHJvcHMubGVmdCA9PT0gdW5kZWZpbmVkID8gJGVsLnBvc2l0aW9uKCkubGVmdCA6IHByb3BzLmxlZnQpICtcblx0XHRcdFx0XHRcInB4LCBcIiArXG5cdFx0XHRcdFx0KHByb3BzLnRvcCA9PT0gdW5kZWZpbmVkID8gJGVsLnBvc2l0aW9uKCkudG9wIDogcHJvcHMudG9wKSArXG5cdFx0XHRcdFx0XCJweFwiO1xuXG5cdFx0XHRcdGlmICh0aGlzLnVzZTNkKSB7XG5cdFx0XHRcdFx0c3RyID0gXCJ0cmFuc2xhdGUzZChcIiArIHN0ciArIFwiLCAwcHgpXCI7XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0c3RyID0gXCJ0cmFuc2xhdGUoXCIgKyBzdHIgKyBcIilcIjtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXG5cdFx0XHRpZiAocHJvcHMuc2NhbGVYICE9PSB1bmRlZmluZWQgJiYgcHJvcHMuc2NhbGVZICE9PSB1bmRlZmluZWQpIHtcblx0XHRcdFx0c3RyICs9IFwiIHNjYWxlKFwiICsgcHJvcHMuc2NhbGVYICsgXCIsIFwiICsgcHJvcHMuc2NhbGVZICsgXCIpXCI7XG5cdFx0XHR9IGVsc2UgaWYgKHByb3BzLnNjYWxlWCAhPT0gdW5kZWZpbmVkKSB7XG5cdFx0XHRcdHN0ciArPSBcIiBzY2FsZVgoXCIgKyBwcm9wcy5zY2FsZVggKyBcIilcIjtcblx0XHRcdH1cblxuXHRcdFx0aWYgKHN0ci5sZW5ndGgpIHtcblx0XHRcdFx0Y3NzLnRyYW5zZm9ybSA9IHN0cjtcblx0XHRcdH1cblxuXHRcdFx0aWYgKHByb3BzLm9wYWNpdHkgIT09IHVuZGVmaW5lZCkge1xuXHRcdFx0XHRjc3Mub3BhY2l0eSA9IHByb3BzLm9wYWNpdHk7XG5cdFx0XHR9XG5cblx0XHRcdGlmIChwcm9wcy53aWR0aCAhPT0gdW5kZWZpbmVkKSB7XG5cdFx0XHRcdGNzcy53aWR0aCA9IHByb3BzLndpZHRoO1xuXHRcdFx0fVxuXG5cdFx0XHRpZiAocHJvcHMuaGVpZ2h0ICE9PSB1bmRlZmluZWQpIHtcblx0XHRcdFx0Y3NzLmhlaWdodCA9IHByb3BzLmhlaWdodDtcblx0XHRcdH1cblxuXHRcdFx0cmV0dXJuICRlbC5jc3MoY3NzKTtcblx0XHR9LFxuXG5cdFx0Ly8gU2ltcGxlIENTUyB0cmFuc2l0aW9uIGhhbmRsZXJcblx0XHQvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG5cdFx0YW5pbWF0ZTogZnVuY3Rpb24oJGVsLCB0bywgZHVyYXRpb24sIGNhbGxiYWNrLCBsZWF2ZUFuaW1hdGlvbk5hbWUpIHtcblx0XHRcdHZhciBzZWxmID0gdGhpcyxcblx0XHRcdFx0ZnJvbTtcblxuXHRcdFx0aWYgKCQuaXNGdW5jdGlvbihkdXJhdGlvbikpIHtcblx0XHRcdFx0Y2FsbGJhY2sgPSBkdXJhdGlvbjtcblx0XHRcdFx0ZHVyYXRpb24gPSBudWxsO1xuXHRcdFx0fVxuXG5cdFx0XHRzZWxmLnN0b3AoJGVsKTtcblxuXHRcdFx0ZnJvbSA9IHNlbGYuZ2V0VHJhbnNsYXRlKCRlbCk7XG5cblx0XHRcdCRlbC5vbih0cmFuc2l0aW9uRW5kLCBmdW5jdGlvbihlKSB7XG5cdFx0XHRcdC8vIFNraXAgZXZlbnRzIGZyb20gY2hpbGQgZWxlbWVudHMgYW5kIHotaW5kZXggY2hhbmdlXG5cdFx0XHRcdGlmIChlICYmIGUub3JpZ2luYWxFdmVudCAmJiAoISRlbC5pcyhlLm9yaWdpbmFsRXZlbnQudGFyZ2V0KSB8fCBlLm9yaWdpbmFsRXZlbnQucHJvcGVydHlOYW1lID09IFwiei1pbmRleFwiKSkge1xuXHRcdFx0XHRcdHJldHVybjtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdHNlbGYuc3RvcCgkZWwpO1xuXG5cdFx0XHRcdGlmICgkLmlzTnVtZXJpYyhkdXJhdGlvbikpIHtcblx0XHRcdFx0XHQkZWwuY3NzKFwidHJhbnNpdGlvbi1kdXJhdGlvblwiLCBcIlwiKTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdGlmICgkLmlzUGxhaW5PYmplY3QodG8pKSB7XG5cdFx0XHRcdFx0aWYgKHRvLnNjYWxlWCAhPT0gdW5kZWZpbmVkICYmIHRvLnNjYWxlWSAhPT0gdW5kZWZpbmVkKSB7XG5cdFx0XHRcdFx0XHRzZWxmLnNldFRyYW5zbGF0ZSgkZWwsIHtcblx0XHRcdFx0XHRcdFx0dG9wOiB0by50b3AsXG5cdFx0XHRcdFx0XHRcdGxlZnQ6IHRvLmxlZnQsXG5cdFx0XHRcdFx0XHRcdHdpZHRoOiBmcm9tLndpZHRoICogdG8uc2NhbGVYLFxuXHRcdFx0XHRcdFx0XHRoZWlnaHQ6IGZyb20uaGVpZ2h0ICogdG8uc2NhbGVZLFxuXHRcdFx0XHRcdFx0XHRzY2FsZVg6IDEsXG5cdFx0XHRcdFx0XHRcdHNjYWxlWTogMVxuXHRcdFx0XHRcdFx0fSk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9IGVsc2UgaWYgKGxlYXZlQW5pbWF0aW9uTmFtZSAhPT0gdHJ1ZSkge1xuXHRcdFx0XHRcdCRlbC5yZW1vdmVDbGFzcyh0byk7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRpZiAoJC5pc0Z1bmN0aW9uKGNhbGxiYWNrKSkge1xuXHRcdFx0XHRcdGNhbGxiYWNrKGUpO1xuXHRcdFx0XHR9XG5cdFx0XHR9KTtcblxuXHRcdFx0aWYgKCQuaXNOdW1lcmljKGR1cmF0aW9uKSkge1xuXHRcdFx0XHQkZWwuY3NzKFwidHJhbnNpdGlvbi1kdXJhdGlvblwiLCBkdXJhdGlvbiArIFwibXNcIik7XG5cdFx0XHR9XG5cblx0XHRcdC8vIFN0YXJ0IGFuaW1hdGlvbiBieSBjaGFuZ2luZyBDU1MgcHJvcGVydGllcyBvciBjbGFzcyBuYW1lXG5cdFx0XHRpZiAoJC5pc1BsYWluT2JqZWN0KHRvKSkge1xuXHRcdFx0XHRpZiAodG8uc2NhbGVYICE9PSB1bmRlZmluZWQgJiYgdG8uc2NhbGVZICE9PSB1bmRlZmluZWQpIHtcblx0XHRcdFx0XHRkZWxldGUgdG8ud2lkdGg7XG5cdFx0XHRcdFx0ZGVsZXRlIHRvLmhlaWdodDtcblxuXHRcdFx0XHRcdGlmICgkZWwucGFyZW50KCkuaGFzQ2xhc3MoXCJmYW5jeWJveC1zbGlkZS0taW1hZ2VcIikpIHtcblx0XHRcdFx0XHRcdCRlbC5wYXJlbnQoKS5hZGRDbGFzcyhcImZhbmN5Ym94LWlzLXNjYWxpbmdcIik7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cblx0XHRcdFx0JC5mYW5jeWJveC5zZXRUcmFuc2xhdGUoJGVsLCB0byk7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHQkZWwuYWRkQ2xhc3ModG8pO1xuXHRcdFx0fVxuXG5cdFx0XHQvLyBNYWtlIHN1cmUgdGhhdCBgdHJhbnNpdGlvbmVuZGAgY2FsbGJhY2sgZ2V0cyBmaXJlZFxuXHRcdFx0JGVsLmRhdGEoXG5cdFx0XHRcdFwidGltZXJcIixcblx0XHRcdFx0c2V0VGltZW91dChmdW5jdGlvbigpIHtcblx0XHRcdFx0XHQkZWwudHJpZ2dlcih0cmFuc2l0aW9uRW5kKTtcblx0XHRcdFx0fSwgZHVyYXRpb24gKyAzMylcblx0XHRcdCk7XG5cdFx0fSxcblxuXHRcdHN0b3A6IGZ1bmN0aW9uKCRlbCwgY2FsbENhbGxiYWNrKSB7XG5cdFx0XHRpZiAoJGVsICYmICRlbC5sZW5ndGgpIHtcblx0XHRcdFx0Y2xlYXJUaW1lb3V0KCRlbC5kYXRhKFwidGltZXJcIikpO1xuXG5cdFx0XHRcdGlmIChjYWxsQ2FsbGJhY2spIHtcblx0XHRcdFx0XHQkZWwudHJpZ2dlcih0cmFuc2l0aW9uRW5kKTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdCRlbC5vZmYodHJhbnNpdGlvbkVuZCkuY3NzKFwidHJhbnNpdGlvbi1kdXJhdGlvblwiLCBcIlwiKTtcblxuXHRcdFx0XHQkZWwucGFyZW50KCkucmVtb3ZlQ2xhc3MoXCJmYW5jeWJveC1pcy1zY2FsaW5nXCIpO1xuXHRcdFx0fVxuXHRcdH1cblx0fTtcblxuXHQvLyBEZWZhdWx0IGNsaWNrIGhhbmRsZXIgZm9yIFwiZmFuY3lib3hlZFwiIGxpbmtzXG5cdC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cblx0ZnVuY3Rpb24gX3J1bihlLCBvcHRzKSB7XG5cdFx0dmFyIGl0ZW1zID0gW10sXG5cdFx0XHRpbmRleCA9IDAsXG5cdFx0XHQkdGFyZ2V0LFxuXHRcdFx0dmFsdWUsXG5cdFx0XHRpbnN0YW5jZTtcblxuXHRcdC8vIEF2b2lkIG9wZW5pbmcgbXVsdGlwbGUgdGltZXNcblx0XHRpZiAoZSAmJiBlLmlzRGVmYXVsdFByZXZlbnRlZCgpKSB7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXG5cdFx0ZS5wcmV2ZW50RGVmYXVsdCgpO1xuXG5cdFx0b3B0cyA9IG9wdHMgfHwge307XG5cblx0XHRpZiAoZSAmJiBlLmRhdGEpIHtcblx0XHRcdG9wdHMgPSBtZXJnZU9wdHMoZS5kYXRhLm9wdGlvbnMsIG9wdHMpO1xuXHRcdH1cblxuXHRcdCR0YXJnZXQgPSBvcHRzLiR0YXJnZXQgfHwgJChlLmN1cnJlbnRUYXJnZXQpLnRyaWdnZXIoXCJibHVyXCIpO1xuXHRcdGluc3RhbmNlID0gJC5mYW5jeWJveC5nZXRJbnN0YW5jZSgpO1xuXG5cdFx0aWYgKGluc3RhbmNlICYmIGluc3RhbmNlLiR0cmlnZ2VyICYmIGluc3RhbmNlLiR0cmlnZ2VyLmlzKCR0YXJnZXQpKSB7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXG5cdFx0aWYgKG9wdHMuc2VsZWN0b3IpIHtcblx0XHRcdGl0ZW1zID0gJChvcHRzLnNlbGVjdG9yKTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0Ly8gR2V0IGFsbCByZWxhdGVkIGl0ZW1zIGFuZCBmaW5kIGluZGV4IGZvciBjbGlja2VkIG9uZVxuXHRcdFx0dmFsdWUgPSAkdGFyZ2V0LmF0dHIoXCJkYXRhLWZhbmN5Ym94XCIpIHx8IFwiXCI7XG5cblx0XHRcdGlmICh2YWx1ZSkge1xuXHRcdFx0XHRpdGVtcyA9IGUuZGF0YSA/IGUuZGF0YS5pdGVtcyA6IFtdO1xuXHRcdFx0XHRpdGVtcyA9IGl0ZW1zLmxlbmd0aCA/IGl0ZW1zLmZpbHRlcignW2RhdGEtZmFuY3lib3g9XCInICsgdmFsdWUgKyAnXCJdJykgOiAkKCdbZGF0YS1mYW5jeWJveD1cIicgKyB2YWx1ZSArICdcIl0nKTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdGl0ZW1zID0gWyR0YXJnZXRdO1xuXHRcdFx0fVxuXHRcdH1cblxuXHRcdGluZGV4ID0gJChpdGVtcykuaW5kZXgoJHRhcmdldCk7XG5cblx0XHQvLyBTb21ldGltZXMgY3VycmVudCBpdGVtIGNhbiBub3QgYmUgZm91bmRcblx0XHRpZiAoaW5kZXggPCAwKSB7XG5cdFx0XHRpbmRleCA9IDA7XG5cdFx0fVxuXG5cdFx0aW5zdGFuY2UgPSAkLmZhbmN5Ym94Lm9wZW4oaXRlbXMsIG9wdHMsIGluZGV4KTtcblxuXHRcdC8vIFNhdmUgbGFzdCBhY3RpdmUgZWxlbWVudFxuXHRcdGluc3RhbmNlLiR0cmlnZ2VyID0gJHRhcmdldDtcblx0fVxuXG5cdC8vIENyZWF0ZSBhIGpRdWVyeSBwbHVnaW5cblx0Ly8gPT09PT09PT09PT09PT09PT09PT09PVxuXG5cdCQuZm4uZmFuY3lib3ggPSBmdW5jdGlvbihvcHRpb25zKSB7XG5cdFx0dmFyIHNlbGVjdG9yO1xuXG5cdFx0b3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG5cdFx0c2VsZWN0b3IgPSBvcHRpb25zLnNlbGVjdG9yIHx8IGZhbHNlO1xuXG5cdFx0aWYgKHNlbGVjdG9yKSB7XG5cdFx0XHQvLyBVc2UgYm9keSBlbGVtZW50IGluc3RlYWQgb2YgZG9jdW1lbnQgc28gaXQgZXhlY3V0ZXMgZmlyc3Rcblx0XHRcdCQoXCJib2R5XCIpXG5cdFx0XHRcdC5vZmYoXCJjbGljay5mYi1zdGFydFwiLCBzZWxlY3Rvcilcblx0XHRcdFx0Lm9uKFwiY2xpY2suZmItc3RhcnRcIiwgc2VsZWN0b3IsIHtvcHRpb25zOiBvcHRpb25zfSwgX3J1bik7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHRoaXMub2ZmKFwiY2xpY2suZmItc3RhcnRcIikub24oXG5cdFx0XHRcdFwiY2xpY2suZmItc3RhcnRcIixcblx0XHRcdFx0e1xuXHRcdFx0XHRcdGl0ZW1zOiB0aGlzLFxuXHRcdFx0XHRcdG9wdGlvbnM6IG9wdGlvbnNcblx0XHRcdFx0fSxcblx0XHRcdFx0X3J1blxuXHRcdFx0KTtcblx0XHR9XG5cblx0XHRyZXR1cm4gdGhpcztcblx0fTtcblxuXHQvLyBTZWxmIGluaXRpYWxpemluZyBwbHVnaW4gZm9yIGFsbCBlbGVtZW50cyBoYXZpbmcgYGRhdGEtZmFuY3lib3hgIGF0dHJpYnV0ZVxuXHQvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG5cdCRELm9uKFwiY2xpY2suZmItc3RhcnRcIiwgXCJbZGF0YS1mYW5jeWJveF1cIiwgX3J1bik7XG5cblx0Ly8gRW5hYmxlIFwidHJpZ2dlciBlbGVtZW50c1wiXG5cdC8vID09PT09PT09PT09PT09PT09PT09PT09PT1cblxuXHQkRC5vbihcImNsaWNrLmZiLXN0YXJ0XCIsIFwiW2RhdGEtZmFuY3lib3gtdHJpZ2dlcl1cIiwgZnVuY3Rpb24oZSkge1xuXHRcdCQoJ1tkYXRhLWZhbmN5Ym94PVwiJyArICQodGhpcykuYXR0cihcImRhdGEtZmFuY3lib3gtdHJpZ2dlclwiKSArICdcIl0nKVxuXHRcdFx0LmVxKCQodGhpcykuYXR0cihcImRhdGEtZmFuY3lib3gtaW5kZXhcIikgfHwgMClcblx0XHRcdC50cmlnZ2VyKFwiY2xpY2suZmItc3RhcnRcIiwge1xuXHRcdFx0XHQkdHJpZ2dlcjogJCh0aGlzKVxuXHRcdFx0fSk7XG5cdH0pO1xuXG5cdC8vIFRyYWNrIGZvY3VzIGV2ZW50IGZvciBiZXR0ZXIgYWNjZXNzaWJpbGl0eSBzdHlsaW5nXG5cdC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cdChmdW5jdGlvbigpIHtcblx0XHR2YXIgYnV0dG9uU3RyID0gXCIuZmFuY3lib3gtYnV0dG9uXCIsXG5cdFx0XHRmb2N1c1N0ciA9IFwiZmFuY3lib3gtZm9jdXNcIixcblx0XHRcdCRwcmVzc2VkID0gbnVsbDtcblxuXHRcdCRELm9uKFwibW91c2Vkb3duIG1vdXNldXAgZm9jdXMgYmx1clwiLCBidXR0b25TdHIsIGZ1bmN0aW9uKGUpIHtcblx0XHRcdHN3aXRjaCAoZS50eXBlKSB7XG5cdFx0XHRcdGNhc2UgXCJtb3VzZWRvd25cIjpcblx0XHRcdFx0XHQkcHJlc3NlZCA9ICQodGhpcyk7XG5cdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdGNhc2UgXCJtb3VzZXVwXCI6XG5cdFx0XHRcdFx0JHByZXNzZWQgPSBudWxsO1xuXHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHRjYXNlIFwiZm9jdXNpblwiOlxuXHRcdFx0XHRcdCQoYnV0dG9uU3RyKS5yZW1vdmVDbGFzcyhmb2N1c1N0cik7XG5cblx0XHRcdFx0XHRpZiAoISQodGhpcykuaXMoJHByZXNzZWQpICYmICEkKHRoaXMpLmlzKFwiW2Rpc2FibGVkXVwiKSkge1xuXHRcdFx0XHRcdFx0JCh0aGlzKS5hZGRDbGFzcyhmb2N1c1N0cik7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHRjYXNlIFwiZm9jdXNvdXRcIjpcblx0XHRcdFx0XHQkKGJ1dHRvblN0cikucmVtb3ZlQ2xhc3MoZm9jdXNTdHIpO1xuXHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0fVxuXHRcdH0pO1xuXHR9KSgpO1xufSkod2luZG93LCBkb2N1bWVudCwgalF1ZXJ5KTtcblxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vXG4vLyBNZWRpYVxuLy8gQWRkcyBhZGRpdGlvbmFsIG1lZGlhIHR5cGUgc3VwcG9ydFxuLy9cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4oZnVuY3Rpb24oJCkge1xuXHRcInVzZSBzdHJpY3RcIjtcblxuXHQvLyBPYmplY3QgY29udGFpbmluZyBwcm9wZXJ0aWVzIGZvciBlYWNoIG1lZGlhIHR5cGVcblx0dmFyIGRlZmF1bHRzID0ge1xuXHRcdHlvdXR1YmU6IHtcblx0XHRcdG1hdGNoZXI6IC8oeW91dHViZVxcLmNvbXx5b3V0dVxcLmJlfHlvdXR1YmVcXC1ub2Nvb2tpZVxcLmNvbSlcXC8od2F0Y2hcXD8oLiomKT92PXx2XFwvfHVcXC98ZW1iZWRcXC8/KT8odmlkZW9zZXJpZXNcXD9saXN0PSguKil8W1xcdy1dezExfXxcXD9saXN0VHlwZT0oLiopJmxpc3Q9KC4qKSkoLiopL2ksXG5cdFx0XHRwYXJhbXM6IHtcblx0XHRcdFx0YXV0b3BsYXk6IDEsXG5cdFx0XHRcdGF1dG9oaWRlOiAxLFxuXHRcdFx0XHRmczogMSxcblx0XHRcdFx0cmVsOiAwLFxuXHRcdFx0XHRoZDogMSxcblx0XHRcdFx0d21vZGU6IFwidHJhbnNwYXJlbnRcIixcblx0XHRcdFx0ZW5hYmxlanNhcGk6IDEsXG5cdFx0XHRcdGh0bWw1OiAxXG5cdFx0XHR9LFxuXHRcdFx0cGFyYW1QbGFjZTogOCxcblx0XHRcdHR5cGU6IFwiaWZyYW1lXCIsXG5cdFx0XHR1cmw6IFwiLy93d3cueW91dHViZS1ub2Nvb2tpZS5jb20vZW1iZWQvJDRcIixcblx0XHRcdHRodW1iOiBcIi8vaW1nLnlvdXR1YmUuY29tL3ZpLyQ0L2hxZGVmYXVsdC5qcGdcIlxuXHRcdH0sXG5cblx0XHR2aW1lbzoge1xuXHRcdFx0bWF0Y2hlcjogL14uK3ZpbWVvLmNvbVxcLyguKlxcLyk/KFtcXGRdKykoLiopPy8sXG5cdFx0XHRwYXJhbXM6IHtcblx0XHRcdFx0YXV0b3BsYXk6IDEsXG5cdFx0XHRcdGhkOiAxLFxuXHRcdFx0XHRzaG93X3RpdGxlOiAxLFxuXHRcdFx0XHRzaG93X2J5bGluZTogMSxcblx0XHRcdFx0c2hvd19wb3J0cmFpdDogMCxcblx0XHRcdFx0ZnVsbHNjcmVlbjogMVxuXHRcdFx0fSxcblx0XHRcdHBhcmFtUGxhY2U6IDMsXG5cdFx0XHR0eXBlOiBcImlmcmFtZVwiLFxuXHRcdFx0dXJsOiBcIi8vcGxheWVyLnZpbWVvLmNvbS92aWRlby8kMlwiXG5cdFx0fSxcblxuXHRcdGluc3RhZ3JhbToge1xuXHRcdFx0bWF0Y2hlcjogLyhpbnN0YWdyXFwuYW18aW5zdGFncmFtXFwuY29tKVxcL3BcXC8oW2EtekEtWjAtOV9cXC1dKylcXC8/L2ksXG5cdFx0XHR0eXBlOiBcImltYWdlXCIsXG5cdFx0XHR1cmw6IFwiLy8kMS9wLyQyL21lZGlhLz9zaXplPWxcIlxuXHRcdH0sXG5cblx0XHQvLyBFeGFtcGxlczpcblx0XHQvLyBodHRwOi8vbWFwcy5nb29nbGUuY29tLz9sbD00OC44NTc5OTUsMi4yOTQyOTcmc3BuPTAuMDA3NjY2LDAuMDIxMTM2JnQ9bSZ6PTE2XG5cdFx0Ly8gaHR0cHM6Ly93d3cuZ29vZ2xlLmNvbS9tYXBzL0AzNy43ODUyMDA2LC0xMjIuNDE0NjM1NSwxNC42NXpcblx0XHQvLyBodHRwczovL3d3dy5nb29nbGUuY29tL21hcHMvQDUyLjIxMTExMjMsMi45MjM3NTQyLDYuNjF6P2hsPWVuXG5cdFx0Ly8gaHR0cHM6Ly93d3cuZ29vZ2xlLmNvbS9tYXBzL3BsYWNlL0dvb2dsZXBsZXgvQDM3LjQyMjAwNDEsLTEyMi4wODMzNDk0LDE3ei9kYXRhPSE0bTUhM200ITFzMHgwOjB4NmMyOTZjNjY2MTkzNjdlMCE4bTIhM2QzNy40MjE5OTk4ITRkLTEyMi4wODQwNTcyXG5cdFx0Z21hcF9wbGFjZToge1xuXHRcdFx0bWF0Y2hlcjogLyhtYXBzXFwuKT9nb29nbGVcXC4oW2Etel17MiwzfShcXC5bYS16XXsyfSk/KVxcLygoKG1hcHNcXC8ocGxhY2VcXC8oLiopXFwvKT9cXEAoLiopLChcXGQrLj9cXGQrPyl6KSl8KFxcP2xsPSkpKC4qKT8vaSxcblx0XHRcdHR5cGU6IFwiaWZyYW1lXCIsXG5cdFx0XHR1cmw6IGZ1bmN0aW9uKHJleikge1xuXHRcdFx0XHRyZXR1cm4gKFxuXHRcdFx0XHRcdFwiLy9tYXBzLmdvb2dsZS5cIiArXG5cdFx0XHRcdFx0cmV6WzJdICtcblx0XHRcdFx0XHRcIi8/bGw9XCIgK1xuXHRcdFx0XHRcdChyZXpbOV0gPyByZXpbOV0gKyBcIiZ6PVwiICsgTWF0aC5mbG9vcihyZXpbMTBdKSArIChyZXpbMTJdID8gcmV6WzEyXS5yZXBsYWNlKC9eXFwvLywgXCImXCIpIDogXCJcIikgOiByZXpbMTJdICsgXCJcIikucmVwbGFjZSgvXFw/LywgXCImXCIpICtcblx0XHRcdFx0XHRcIiZvdXRwdXQ9XCIgK1xuXHRcdFx0XHRcdChyZXpbMTJdICYmIHJlelsxMl0uaW5kZXhPZihcImxheWVyPWNcIikgPiAwID8gXCJzdmVtYmVkXCIgOiBcImVtYmVkXCIpXG5cdFx0XHRcdCk7XG5cdFx0XHR9XG5cdFx0fSxcblxuXHRcdC8vIEV4YW1wbGVzOlxuXHRcdC8vIGh0dHBzOi8vd3d3Lmdvb2dsZS5jb20vbWFwcy9zZWFyY2gvRW1waXJlK1N0YXRlK0J1aWxkaW5nL1xuXHRcdC8vIGh0dHBzOi8vd3d3Lmdvb2dsZS5jb20vbWFwcy9zZWFyY2gvP2FwaT0xJnF1ZXJ5PWNlbnR1cnlsaW5rK2ZpZWxkXG5cdFx0Ly8gaHR0cHM6Ly93d3cuZ29vZ2xlLmNvbS9tYXBzL3NlYXJjaC8/YXBpPTEmcXVlcnk9NDcuNTk1MTUxOCwtMTIyLjMzMTYzOTNcblx0XHRnbWFwX3NlYXJjaDoge1xuXHRcdFx0bWF0Y2hlcjogLyhtYXBzXFwuKT9nb29nbGVcXC4oW2Etel17MiwzfShcXC5bYS16XXsyfSk/KVxcLyhtYXBzXFwvc2VhcmNoXFwvKSguKikvaSxcblx0XHRcdHR5cGU6IFwiaWZyYW1lXCIsXG5cdFx0XHR1cmw6IGZ1bmN0aW9uKHJleikge1xuXHRcdFx0XHRyZXR1cm4gXCIvL21hcHMuZ29vZ2xlLlwiICsgcmV6WzJdICsgXCIvbWFwcz9xPVwiICsgcmV6WzVdLnJlcGxhY2UoXCJxdWVyeT1cIiwgXCJxPVwiKS5yZXBsYWNlKFwiYXBpPTFcIiwgXCJcIikgKyBcIiZvdXRwdXQ9ZW1iZWRcIjtcblx0XHRcdH1cblx0XHR9XG5cdH07XG5cblx0Ly8gRm9ybWF0cyBtYXRjaGluZyB1cmwgdG8gZmluYWwgZm9ybVxuXHR2YXIgZm9ybWF0ID0gZnVuY3Rpb24odXJsLCByZXosIHBhcmFtcykge1xuXHRcdGlmICghdXJsKSB7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXG5cdFx0cGFyYW1zID0gcGFyYW1zIHx8IFwiXCI7XG5cblx0XHRpZiAoJC50eXBlKHBhcmFtcykgPT09IFwib2JqZWN0XCIpIHtcblx0XHRcdHBhcmFtcyA9ICQucGFyYW0ocGFyYW1zLCB0cnVlKTtcblx0XHR9XG5cblx0XHQkLmVhY2gocmV6LCBmdW5jdGlvbihrZXksIHZhbHVlKSB7XG5cdFx0XHR1cmwgPSB1cmwucmVwbGFjZShcIiRcIiArIGtleSwgdmFsdWUgfHwgXCJcIik7XG5cdFx0fSk7XG5cblx0XHRpZiAocGFyYW1zLmxlbmd0aCkge1xuXHRcdFx0dXJsICs9ICh1cmwuaW5kZXhPZihcIj9cIikgPiAwID8gXCImXCIgOiBcIj9cIikgKyBwYXJhbXM7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIHVybDtcblx0fTtcblxuXHQkKGRvY3VtZW50KS5vbihcIm9iamVjdE5lZWRzVHlwZS5mYlwiLCBmdW5jdGlvbihlLCBpbnN0YW5jZSwgaXRlbSkge1xuXHRcdHZhciB1cmwgPSBpdGVtLnNyYyB8fCBcIlwiLFxuXHRcdFx0dHlwZSA9IGZhbHNlLFxuXHRcdFx0bWVkaWEsXG5cdFx0XHR0aHVtYixcblx0XHRcdHJleixcblx0XHRcdHBhcmFtcyxcblx0XHRcdHVybFBhcmFtcyxcblx0XHRcdHBhcmFtT2JqLFxuXHRcdFx0cHJvdmlkZXI7XG5cblx0XHRtZWRpYSA9ICQuZXh0ZW5kKHRydWUsIHt9LCBkZWZhdWx0cywgaXRlbS5vcHRzLm1lZGlhKTtcblxuXHRcdC8vIExvb2sgZm9yIGFueSBtYXRjaGluZyBtZWRpYSB0eXBlXG5cdFx0JC5lYWNoKG1lZGlhLCBmdW5jdGlvbihwcm92aWRlck5hbWUsIHByb3ZpZGVyT3B0cykge1xuXHRcdFx0cmV6ID0gdXJsLm1hdGNoKHByb3ZpZGVyT3B0cy5tYXRjaGVyKTtcblxuXHRcdFx0aWYgKCFyZXopIHtcblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0fVxuXG5cdFx0XHR0eXBlID0gcHJvdmlkZXJPcHRzLnR5cGU7XG5cdFx0XHRwcm92aWRlciA9IHByb3ZpZGVyTmFtZTtcblx0XHRcdHBhcmFtT2JqID0ge307XG5cblx0XHRcdGlmIChwcm92aWRlck9wdHMucGFyYW1QbGFjZSAmJiByZXpbcHJvdmlkZXJPcHRzLnBhcmFtUGxhY2VdKSB7XG5cdFx0XHRcdHVybFBhcmFtcyA9IHJleltwcm92aWRlck9wdHMucGFyYW1QbGFjZV07XG5cblx0XHRcdFx0aWYgKHVybFBhcmFtc1swXSA9PSBcIj9cIikge1xuXHRcdFx0XHRcdHVybFBhcmFtcyA9IHVybFBhcmFtcy5zdWJzdHJpbmcoMSk7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHR1cmxQYXJhbXMgPSB1cmxQYXJhbXMuc3BsaXQoXCImXCIpO1xuXG5cdFx0XHRcdGZvciAodmFyIG0gPSAwOyBtIDwgdXJsUGFyYW1zLmxlbmd0aDsgKyttKSB7XG5cdFx0XHRcdFx0dmFyIHAgPSB1cmxQYXJhbXNbbV0uc3BsaXQoXCI9XCIsIDIpO1xuXG5cdFx0XHRcdFx0aWYgKHAubGVuZ3RoID09IDIpIHtcblx0XHRcdFx0XHRcdHBhcmFtT2JqW3BbMF1dID0gZGVjb2RlVVJJQ29tcG9uZW50KHBbMV0ucmVwbGFjZSgvXFwrL2csIFwiIFwiKSk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHR9XG5cblx0XHRcdHBhcmFtcyA9ICQuZXh0ZW5kKHRydWUsIHt9LCBwcm92aWRlck9wdHMucGFyYW1zLCBpdGVtLm9wdHNbcHJvdmlkZXJOYW1lXSwgcGFyYW1PYmopO1xuXG5cdFx0XHR1cmwgPVxuXHRcdFx0XHQkLnR5cGUocHJvdmlkZXJPcHRzLnVybCkgPT09IFwiZnVuY3Rpb25cIiA/IHByb3ZpZGVyT3B0cy51cmwuY2FsbCh0aGlzLCByZXosIHBhcmFtcywgaXRlbSkgOiBmb3JtYXQocHJvdmlkZXJPcHRzLnVybCwgcmV6LCBwYXJhbXMpO1xuXG5cdFx0XHR0aHVtYiA9XG5cdFx0XHRcdCQudHlwZShwcm92aWRlck9wdHMudGh1bWIpID09PSBcImZ1bmN0aW9uXCIgPyBwcm92aWRlck9wdHMudGh1bWIuY2FsbCh0aGlzLCByZXosIHBhcmFtcywgaXRlbSkgOiBmb3JtYXQocHJvdmlkZXJPcHRzLnRodW1iLCByZXopO1xuXG5cdFx0XHRpZiAocHJvdmlkZXJOYW1lID09PSBcInlvdXR1YmVcIikge1xuXHRcdFx0XHR1cmwgPSB1cmwucmVwbGFjZSgvJnQ9KChcXGQrKW0pPyhcXGQrKXMvLCBmdW5jdGlvbihtYXRjaCwgcDEsIG0sIHMpIHtcblx0XHRcdFx0XHRyZXR1cm4gXCImc3RhcnQ9XCIgKyAoKG0gPyBwYXJzZUludChtLCAxMCkgKiA2MCA6IDApICsgcGFyc2VJbnQocywgMTApKTtcblx0XHRcdFx0fSk7XG5cdFx0XHR9IGVsc2UgaWYgKHByb3ZpZGVyTmFtZSA9PT0gXCJ2aW1lb1wiKSB7XG5cdFx0XHRcdHVybCA9IHVybC5yZXBsYWNlKFwiJiUyM1wiLCBcIiNcIik7XG5cdFx0XHR9XG5cblx0XHRcdHJldHVybiBmYWxzZTtcblx0XHR9KTtcblxuXHRcdC8vIElmIGl0IGlzIGZvdW5kLCB0aGVuIGNoYW5nZSBjb250ZW50IHR5cGUgYW5kIHVwZGF0ZSB0aGUgdXJsXG5cblx0XHRpZiAodHlwZSkge1xuXHRcdFx0aWYgKCFpdGVtLm9wdHMudGh1bWIgJiYgIShpdGVtLm9wdHMuJHRodW1iICYmIGl0ZW0ub3B0cy4kdGh1bWIubGVuZ3RoKSkge1xuXHRcdFx0XHRpdGVtLm9wdHMudGh1bWIgPSB0aHVtYjtcblx0XHRcdH1cblxuXHRcdFx0aWYgKHR5cGUgPT09IFwiaWZyYW1lXCIpIHtcblx0XHRcdFx0aXRlbS5vcHRzID0gJC5leHRlbmQodHJ1ZSwgaXRlbS5vcHRzLCB7XG5cdFx0XHRcdFx0aWZyYW1lOiB7XG5cdFx0XHRcdFx0XHRwcmVsb2FkOiBmYWxzZSxcblx0XHRcdFx0XHRcdGF0dHI6IHtcblx0XHRcdFx0XHRcdFx0c2Nyb2xsaW5nOiBcIm5vXCJcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHR9XG5cdFx0XHRcdH0pO1xuXHRcdFx0fVxuXG5cdFx0XHQkLmV4dGVuZChpdGVtLCB7XG5cdFx0XHRcdHR5cGU6IHR5cGUsXG5cdFx0XHRcdHNyYzogdXJsLFxuXHRcdFx0XHRvcmlnU3JjOiBpdGVtLnNyYyxcblx0XHRcdFx0Y29udGVudFNvdXJjZTogcHJvdmlkZXIsXG5cdFx0XHRcdGNvbnRlbnRUeXBlOiB0eXBlID09PSBcImltYWdlXCIgPyBcImltYWdlXCIgOiBwcm92aWRlciA9PSBcImdtYXBfcGxhY2VcIiB8fCBwcm92aWRlciA9PSBcImdtYXBfc2VhcmNoXCIgPyBcIm1hcFwiIDogXCJ2aWRlb1wiXG5cdFx0XHR9KTtcblx0XHR9IGVsc2UgaWYgKHVybCkge1xuXHRcdFx0aXRlbS50eXBlID0gaXRlbS5vcHRzLmRlZmF1bHRUeXBlO1xuXHRcdH1cblx0fSk7XG5cblx0Ly8gTG9hZCBZb3VUdWJlL1ZpZGVvIEFQSSBvbiByZXF1ZXN0IHRvIGRldGVjdCB3aGVuIHZpZGVvIGZpbmlzaGVkIHBsYXlpbmdcblx0dmFyIFZpZGVvQVBJTG9hZGVyID0ge1xuXHRcdHlvdXR1YmU6IHtcblx0XHRcdHNyYzogXCJodHRwczovL3d3dy55b3V0dWJlLmNvbS9pZnJhbWVfYXBpXCIsXG5cdFx0XHRjbGFzczogXCJZVFwiLFxuXHRcdFx0bG9hZGluZzogZmFsc2UsXG5cdFx0XHRsb2FkZWQ6IGZhbHNlXG5cdFx0fSxcblxuXHRcdHZpbWVvOiB7XG5cdFx0XHRzcmM6IFwiaHR0cHM6Ly9wbGF5ZXIudmltZW8uY29tL2FwaS9wbGF5ZXIuanNcIixcblx0XHRcdGNsYXNzOiBcIlZpbWVvXCIsXG5cdFx0XHRsb2FkaW5nOiBmYWxzZSxcblx0XHRcdGxvYWRlZDogZmFsc2Vcblx0XHR9LFxuXG5cdFx0bG9hZDogZnVuY3Rpb24odmVuZG9yKSB7XG5cdFx0XHR2YXIgX3RoaXMgPSB0aGlzLFxuXHRcdFx0XHRzY3JpcHQ7XG5cblx0XHRcdGlmICh0aGlzW3ZlbmRvcl0ubG9hZGVkKSB7XG5cdFx0XHRcdHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0X3RoaXMuZG9uZSh2ZW5kb3IpO1xuXHRcdFx0XHR9KTtcblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0fVxuXG5cdFx0XHRpZiAodGhpc1t2ZW5kb3JdLmxvYWRpbmcpIHtcblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0fVxuXG5cdFx0XHR0aGlzW3ZlbmRvcl0ubG9hZGluZyA9IHRydWU7XG5cblx0XHRcdHNjcmlwdCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJzY3JpcHRcIik7XG5cdFx0XHRzY3JpcHQudHlwZSA9IFwidGV4dC9qYXZhc2NyaXB0XCI7XG5cdFx0XHRzY3JpcHQuc3JjID0gdGhpc1t2ZW5kb3JdLnNyYztcblxuXHRcdFx0aWYgKHZlbmRvciA9PT0gXCJ5b3V0dWJlXCIpIHtcblx0XHRcdFx0d2luZG93Lm9uWW91VHViZUlmcmFtZUFQSVJlYWR5ID0gZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0X3RoaXNbdmVuZG9yXS5sb2FkZWQgPSB0cnVlO1xuXHRcdFx0XHRcdF90aGlzLmRvbmUodmVuZG9yKTtcblx0XHRcdFx0fTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdHNjcmlwdC5vbmxvYWQgPSBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRfdGhpc1t2ZW5kb3JdLmxvYWRlZCA9IHRydWU7XG5cdFx0XHRcdFx0X3RoaXMuZG9uZSh2ZW5kb3IpO1xuXHRcdFx0XHR9O1xuXHRcdFx0fVxuXG5cdFx0XHRkb2N1bWVudC5ib2R5LmFwcGVuZENoaWxkKHNjcmlwdCk7XG5cdFx0fSxcblx0XHRkb25lOiBmdW5jdGlvbih2ZW5kb3IpIHtcblx0XHRcdHZhciBpbnN0YW5jZSwgJGVsLCBwbGF5ZXI7XG5cblx0XHRcdGlmICh2ZW5kb3IgPT09IFwieW91dHViZVwiKSB7XG5cdFx0XHRcdGRlbGV0ZSB3aW5kb3cub25Zb3VUdWJlSWZyYW1lQVBJUmVhZHk7XG5cdFx0XHR9XG5cblx0XHRcdGluc3RhbmNlID0gJC5mYW5jeWJveC5nZXRJbnN0YW5jZSgpO1xuXG5cdFx0XHRpZiAoaW5zdGFuY2UpIHtcblx0XHRcdFx0JGVsID0gaW5zdGFuY2UuY3VycmVudC4kY29udGVudC5maW5kKFwiaWZyYW1lXCIpO1xuXG5cdFx0XHRcdGlmICh2ZW5kb3IgPT09IFwieW91dHViZVwiICYmIFlUICE9PSB1bmRlZmluZWQgJiYgWVQpIHtcblx0XHRcdFx0XHRwbGF5ZXIgPSBuZXcgWVQuUGxheWVyKCRlbC5hdHRyKFwiaWRcIiksIHtcblx0XHRcdFx0XHRcdGV2ZW50czoge1xuXHRcdFx0XHRcdFx0XHRvblN0YXRlQ2hhbmdlOiBmdW5jdGlvbihlKSB7XG5cdFx0XHRcdFx0XHRcdFx0aWYgKGUuZGF0YSA9PSAwKSB7XG5cdFx0XHRcdFx0XHRcdFx0XHRpbnN0YW5jZS5uZXh0KCk7XG5cdFx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fSk7XG5cdFx0XHRcdH0gZWxzZSBpZiAodmVuZG9yID09PSBcInZpbWVvXCIgJiYgVmltZW8gIT09IHVuZGVmaW5lZCAmJiBWaW1lbykge1xuXHRcdFx0XHRcdHBsYXllciA9IG5ldyBWaW1lby5QbGF5ZXIoJGVsKTtcblxuXHRcdFx0XHRcdHBsYXllci5vbihcImVuZGVkXCIsIGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdFx0aW5zdGFuY2UubmV4dCgpO1xuXHRcdFx0XHRcdH0pO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fVxuXHR9O1xuXG5cdCQoZG9jdW1lbnQpLm9uKHtcblx0XHRcImFmdGVyU2hvdy5mYlwiOiBmdW5jdGlvbihlLCBpbnN0YW5jZSwgY3VycmVudCkge1xuXHRcdFx0aWYgKGluc3RhbmNlLmdyb3VwLmxlbmd0aCA+IDEgJiYgKGN1cnJlbnQuY29udGVudFNvdXJjZSA9PT0gXCJ5b3V0dWJlXCIgfHwgY3VycmVudC5jb250ZW50U291cmNlID09PSBcInZpbWVvXCIpKSB7XG5cdFx0XHRcdFZpZGVvQVBJTG9hZGVyLmxvYWQoY3VycmVudC5jb250ZW50U291cmNlKTtcblx0XHRcdH1cblx0XHR9XG5cdH0pO1xufSkoalF1ZXJ5KTtcblxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vXG4vLyBHdWVzdHVyZXNcbi8vIEFkZHMgdG91Y2ggZ3Vlc3R1cmVzLCBoYW5kbGVzIGNsaWNrIGFuZCB0YXAgZXZlbnRzXG4vL1xuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbihmdW5jdGlvbih3aW5kb3csIGRvY3VtZW50LCAkKSB7XG5cdFwidXNlIHN0cmljdFwiO1xuXG5cdHZhciByZXF1ZXN0QUZyYW1lID0gKGZ1bmN0aW9uKCkge1xuXHRcdHJldHVybiAoXG5cdFx0XHR3aW5kb3cucmVxdWVzdEFuaW1hdGlvbkZyYW1lIHx8XG5cdFx0XHR3aW5kb3cud2Via2l0UmVxdWVzdEFuaW1hdGlvbkZyYW1lIHx8XG5cdFx0XHR3aW5kb3cubW96UmVxdWVzdEFuaW1hdGlvbkZyYW1lIHx8XG5cdFx0XHR3aW5kb3cub1JlcXVlc3RBbmltYXRpb25GcmFtZSB8fFxuXHRcdFx0Ly8gaWYgYWxsIGVsc2UgZmFpbHMsIHVzZSBzZXRUaW1lb3V0XG5cdFx0XHRmdW5jdGlvbihjYWxsYmFjaykge1xuXHRcdFx0XHRyZXR1cm4gd2luZG93LnNldFRpbWVvdXQoY2FsbGJhY2ssIDEwMDAgLyA2MCk7XG5cdFx0XHR9XG5cdFx0KTtcblx0fSkoKTtcblxuXHR2YXIgY2FuY2VsQUZyYW1lID0gKGZ1bmN0aW9uKCkge1xuXHRcdHJldHVybiAoXG5cdFx0XHR3aW5kb3cuY2FuY2VsQW5pbWF0aW9uRnJhbWUgfHxcblx0XHRcdHdpbmRvdy53ZWJraXRDYW5jZWxBbmltYXRpb25GcmFtZSB8fFxuXHRcdFx0d2luZG93Lm1vekNhbmNlbEFuaW1hdGlvbkZyYW1lIHx8XG5cdFx0XHR3aW5kb3cub0NhbmNlbEFuaW1hdGlvbkZyYW1lIHx8XG5cdFx0XHRmdW5jdGlvbihpZCkge1xuXHRcdFx0XHR3aW5kb3cuY2xlYXJUaW1lb3V0KGlkKTtcblx0XHRcdH1cblx0XHQpO1xuXHR9KSgpO1xuXG5cdHZhciBnZXRQb2ludGVyWFkgPSBmdW5jdGlvbihlKSB7XG5cdFx0dmFyIHJlc3VsdCA9IFtdO1xuXG5cdFx0ZSA9IGUub3JpZ2luYWxFdmVudCB8fCBlIHx8IHdpbmRvdy5lO1xuXHRcdGUgPSBlLnRvdWNoZXMgJiYgZS50b3VjaGVzLmxlbmd0aCA/IGUudG91Y2hlcyA6IGUuY2hhbmdlZFRvdWNoZXMgJiYgZS5jaGFuZ2VkVG91Y2hlcy5sZW5ndGggPyBlLmNoYW5nZWRUb3VjaGVzIDogW2VdO1xuXG5cdFx0Zm9yICh2YXIga2V5IGluIGUpIHtcblx0XHRcdGlmIChlW2tleV0ucGFnZVgpIHtcblx0XHRcdFx0cmVzdWx0LnB1c2goe1xuXHRcdFx0XHRcdHg6IGVba2V5XS5wYWdlWCxcblx0XHRcdFx0XHR5OiBlW2tleV0ucGFnZVlcblx0XHRcdFx0fSk7XG5cdFx0XHR9IGVsc2UgaWYgKGVba2V5XS5jbGllbnRYKSB7XG5cdFx0XHRcdHJlc3VsdC5wdXNoKHtcblx0XHRcdFx0XHR4OiBlW2tleV0uY2xpZW50WCxcblx0XHRcdFx0XHR5OiBlW2tleV0uY2xpZW50WVxuXHRcdFx0XHR9KTtcblx0XHRcdH1cblx0XHR9XG5cblx0XHRyZXR1cm4gcmVzdWx0O1xuXHR9O1xuXG5cdHZhciBkaXN0YW5jZSA9IGZ1bmN0aW9uKHBvaW50MiwgcG9pbnQxLCB3aGF0KSB7XG5cdFx0aWYgKCFwb2ludDEgfHwgIXBvaW50Mikge1xuXHRcdFx0cmV0dXJuIDA7XG5cdFx0fVxuXG5cdFx0aWYgKHdoYXQgPT09IFwieFwiKSB7XG5cdFx0XHRyZXR1cm4gcG9pbnQyLnggLSBwb2ludDEueDtcblx0XHR9IGVsc2UgaWYgKHdoYXQgPT09IFwieVwiKSB7XG5cdFx0XHRyZXR1cm4gcG9pbnQyLnkgLSBwb2ludDEueTtcblx0XHR9XG5cblx0XHRyZXR1cm4gTWF0aC5zcXJ0KE1hdGgucG93KHBvaW50Mi54IC0gcG9pbnQxLngsIDIpICsgTWF0aC5wb3cocG9pbnQyLnkgLSBwb2ludDEueSwgMikpO1xuXHR9O1xuXG5cdHZhciBpc0NsaWNrYWJsZSA9IGZ1bmN0aW9uKCRlbCkge1xuXHRcdGlmIChcblx0XHRcdCRlbC5pcygnYSxhcmVhLGJ1dHRvbixbcm9sZT1cImJ1dHRvblwiXSxpbnB1dCxsYWJlbCxzZWxlY3Qsc3VtbWFyeSx0ZXh0YXJlYSx2aWRlbyxhdWRpbyxpZnJhbWUnKSB8fFxuXHRcdFx0JC5pc0Z1bmN0aW9uKCRlbC5nZXQoMCkub25jbGljaykgfHxcblx0XHRcdCRlbC5kYXRhKFwic2VsZWN0YWJsZVwiKVxuXHRcdCkge1xuXHRcdFx0cmV0dXJuIHRydWU7XG5cdFx0fVxuXG5cdFx0Ly8gQ2hlY2sgZm9yIGF0dHJpYnV0ZXMgbGlrZSBkYXRhLWZhbmN5Ym94LW5leHQgb3IgZGF0YS1mYW5jeWJveC1jbG9zZVxuXHRcdGZvciAodmFyIGkgPSAwLCBhdHRzID0gJGVsWzBdLmF0dHJpYnV0ZXMsIG4gPSBhdHRzLmxlbmd0aDsgaSA8IG47IGkrKykge1xuXHRcdFx0aWYgKGF0dHNbaV0ubm9kZU5hbWUuc3Vic3RyKDAsIDE0KSA9PT0gXCJkYXRhLWZhbmN5Ym94LVwiKSB7XG5cdFx0XHRcdHJldHVybiB0cnVlO1xuXHRcdFx0fVxuXHRcdH1cblxuXHRcdHJldHVybiBmYWxzZTtcblx0fTtcblxuXHR2YXIgaGFzU2Nyb2xsYmFycyA9IGZ1bmN0aW9uKGVsKSB7XG5cdFx0dmFyIG92ZXJmbG93WSA9IHdpbmRvdy5nZXRDb21wdXRlZFN0eWxlKGVsKVtcIm92ZXJmbG93LXlcIl0sXG5cdFx0XHRvdmVyZmxvd1ggPSB3aW5kb3cuZ2V0Q29tcHV0ZWRTdHlsZShlbClbXCJvdmVyZmxvdy14XCJdLFxuXHRcdFx0dmVydGljYWwgPSAob3ZlcmZsb3dZID09PSBcInNjcm9sbFwiIHx8IG92ZXJmbG93WSA9PT0gXCJhdXRvXCIpICYmIGVsLnNjcm9sbEhlaWdodCA+IGVsLmNsaWVudEhlaWdodCxcblx0XHRcdGhvcml6b250YWwgPSAob3ZlcmZsb3dYID09PSBcInNjcm9sbFwiIHx8IG92ZXJmbG93WCA9PT0gXCJhdXRvXCIpICYmIGVsLnNjcm9sbFdpZHRoID4gZWwuY2xpZW50V2lkdGg7XG5cblx0XHRyZXR1cm4gdmVydGljYWwgfHwgaG9yaXpvbnRhbDtcblx0fTtcblxuXHR2YXIgaXNTY3JvbGxhYmxlID0gZnVuY3Rpb24oJGVsKSB7XG5cdFx0dmFyIHJleiA9IGZhbHNlO1xuXG5cdFx0d2hpbGUgKHRydWUpIHtcblx0XHRcdHJleiA9IGhhc1Njcm9sbGJhcnMoJGVsLmdldCgwKSk7XG5cblx0XHRcdGlmIChyZXopIHtcblx0XHRcdFx0YnJlYWs7XG5cdFx0XHR9XG5cblx0XHRcdCRlbCA9ICRlbC5wYXJlbnQoKTtcblxuXHRcdFx0aWYgKCEkZWwubGVuZ3RoIHx8ICRlbC5oYXNDbGFzcyhcImZhbmN5Ym94LXN0YWdlXCIpIHx8ICRlbC5pcyhcImJvZHlcIikpIHtcblx0XHRcdFx0YnJlYWs7XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0cmV0dXJuIHJlejtcblx0fTtcblxuXHR2YXIgR3Vlc3R1cmVzID0gZnVuY3Rpb24oaW5zdGFuY2UpIHtcblx0XHR2YXIgc2VsZiA9IHRoaXM7XG5cblx0XHRzZWxmLmluc3RhbmNlID0gaW5zdGFuY2U7XG5cblx0XHRzZWxmLiRiZyA9IGluc3RhbmNlLiRyZWZzLmJnO1xuXHRcdHNlbGYuJHN0YWdlID0gaW5zdGFuY2UuJHJlZnMuc3RhZ2U7XG5cdFx0c2VsZi4kY29udGFpbmVyID0gaW5zdGFuY2UuJHJlZnMuY29udGFpbmVyO1xuXG5cdFx0c2VsZi5kZXN0cm95KCk7XG5cblx0XHRzZWxmLiRjb250YWluZXIub24oXCJ0b3VjaHN0YXJ0LmZiLnRvdWNoIG1vdXNlZG93bi5mYi50b3VjaFwiLCAkLnByb3h5KHNlbGYsIFwib250b3VjaHN0YXJ0XCIpKTtcblx0fTtcblxuXHRHdWVzdHVyZXMucHJvdG90eXBlLmRlc3Ryb3kgPSBmdW5jdGlvbigpIHtcblx0XHR2YXIgc2VsZiA9IHRoaXM7XG5cblx0XHRzZWxmLiRjb250YWluZXIub2ZmKFwiLmZiLnRvdWNoXCIpO1xuXG5cdFx0JChkb2N1bWVudCkub2ZmKFwiLmZiLnRvdWNoXCIpO1xuXG5cdFx0aWYgKHNlbGYucmVxdWVzdElkKSB7XG5cdFx0XHRjYW5jZWxBRnJhbWUoc2VsZi5yZXF1ZXN0SWQpO1xuXHRcdFx0c2VsZi5yZXF1ZXN0SWQgPSBudWxsO1xuXHRcdH1cblxuXHRcdGlmIChzZWxmLnRhcHBlZCkge1xuXHRcdFx0Y2xlYXJUaW1lb3V0KHNlbGYudGFwcGVkKTtcblx0XHRcdHNlbGYudGFwcGVkID0gbnVsbDtcblx0XHR9XG5cdH07XG5cblx0R3Vlc3R1cmVzLnByb3RvdHlwZS5vbnRvdWNoc3RhcnQgPSBmdW5jdGlvbihlKSB7XG5cdFx0dmFyIHNlbGYgPSB0aGlzLFxuXHRcdFx0JHRhcmdldCA9ICQoZS50YXJnZXQpLFxuXHRcdFx0aW5zdGFuY2UgPSBzZWxmLmluc3RhbmNlLFxuXHRcdFx0Y3VycmVudCA9IGluc3RhbmNlLmN1cnJlbnQsXG5cdFx0XHQkc2xpZGUgPSBjdXJyZW50LiRzbGlkZSxcblx0XHRcdCRjb250ZW50ID0gY3VycmVudC4kY29udGVudCxcblx0XHRcdGlzVG91Y2hEZXZpY2UgPSBlLnR5cGUgPT0gXCJ0b3VjaHN0YXJ0XCI7XG5cblx0XHQvLyBEbyBub3QgcmVzcG9uZCB0byBib3RoICh0b3VjaCBhbmQgbW91c2UpIGV2ZW50c1xuXHRcdGlmIChpc1RvdWNoRGV2aWNlKSB7XG5cdFx0XHRzZWxmLiRjb250YWluZXIub2ZmKFwibW91c2Vkb3duLmZiLnRvdWNoXCIpO1xuXHRcdH1cblxuXHRcdC8vIElnbm9yZSByaWdodCBjbGlja1xuXHRcdGlmIChlLm9yaWdpbmFsRXZlbnQgJiYgZS5vcmlnaW5hbEV2ZW50LmJ1dHRvbiA9PSAyKSB7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXG5cdFx0Ly8gSWdub3JlIHRhcGluZyBvbiBsaW5rcywgYnV0dG9ucywgaW5wdXQgZWxlbWVudHNcblx0XHRpZiAoISRzbGlkZS5sZW5ndGggfHwgISR0YXJnZXQubGVuZ3RoIHx8IGlzQ2xpY2thYmxlKCR0YXJnZXQpIHx8IGlzQ2xpY2thYmxlKCR0YXJnZXQucGFyZW50KCkpKSB7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXHRcdC8vIElnbm9yZSBjbGlja3Mgb24gdGhlIHNjcm9sbGJhclxuXHRcdGlmICghJHRhcmdldC5pcyhcImltZ1wiKSAmJiBlLm9yaWdpbmFsRXZlbnQuY2xpZW50WCA+ICR0YXJnZXRbMF0uY2xpZW50V2lkdGggKyAkdGFyZ2V0Lm9mZnNldCgpLmxlZnQpIHtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cblx0XHQvLyBJZ25vcmUgY2xpY2tzIHdoaWxlIHpvb21pbmcgb3IgY2xvc2luZ1xuXHRcdGlmICghY3VycmVudCB8fCBpbnN0YW5jZS5pc0FuaW1hdGluZyB8fCBjdXJyZW50LiRzbGlkZS5oYXNDbGFzcyhcImZhbmN5Ym94LWFuaW1hdGVkXCIpKSB7XG5cdFx0XHRlLnN0b3BQcm9wYWdhdGlvbigpO1xuXHRcdFx0ZS5wcmV2ZW50RGVmYXVsdCgpO1xuXG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXG5cdFx0c2VsZi5yZWFsUG9pbnRzID0gc2VsZi5zdGFydFBvaW50cyA9IGdldFBvaW50ZXJYWShlKTtcblxuXHRcdGlmICghc2VsZi5zdGFydFBvaW50cy5sZW5ndGgpIHtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cblx0XHQvLyBBbGxvdyBvdGhlciBzY3JpcHRzIHRvIGNhdGNoIHRvdWNoIGV2ZW50IGlmIFwidG91Y2hcIiBpcyBzZXQgdG8gZmFsc2Vcblx0XHRpZiAoY3VycmVudC50b3VjaCkge1xuXHRcdFx0ZS5zdG9wUHJvcGFnYXRpb24oKTtcblx0XHR9XG5cblx0XHRzZWxmLnN0YXJ0RXZlbnQgPSBlO1xuXG5cdFx0c2VsZi5jYW5UYXAgPSB0cnVlO1xuXHRcdHNlbGYuJHRhcmdldCA9ICR0YXJnZXQ7XG5cdFx0c2VsZi4kY29udGVudCA9ICRjb250ZW50O1xuXHRcdHNlbGYub3B0cyA9IGN1cnJlbnQub3B0cy50b3VjaDtcblxuXHRcdHNlbGYuaXNQYW5uaW5nID0gZmFsc2U7XG5cdFx0c2VsZi5pc1N3aXBpbmcgPSBmYWxzZTtcblx0XHRzZWxmLmlzWm9vbWluZyA9IGZhbHNlO1xuXHRcdHNlbGYuaXNTY3JvbGxpbmcgPSBmYWxzZTtcblx0XHRzZWxmLmNhblBhbiA9IGluc3RhbmNlLmNhblBhbigpO1xuXG5cdFx0c2VsZi5zdGFydFRpbWUgPSBuZXcgRGF0ZSgpLmdldFRpbWUoKTtcblx0XHRzZWxmLmRpc3RhbmNlWCA9IHNlbGYuZGlzdGFuY2VZID0gc2VsZi5kaXN0YW5jZSA9IDA7XG5cblx0XHRzZWxmLmNhbnZhc1dpZHRoID0gTWF0aC5yb3VuZCgkc2xpZGVbMF0uY2xpZW50V2lkdGgpO1xuXHRcdHNlbGYuY2FudmFzSGVpZ2h0ID0gTWF0aC5yb3VuZCgkc2xpZGVbMF0uY2xpZW50SGVpZ2h0KTtcblxuXHRcdHNlbGYuY29udGVudExhc3RQb3MgPSBudWxsO1xuXHRcdHNlbGYuY29udGVudFN0YXJ0UG9zID0gJC5mYW5jeWJveC5nZXRUcmFuc2xhdGUoc2VsZi4kY29udGVudCkgfHwge3RvcDogMCwgbGVmdDogMH07XG5cdFx0c2VsZi5zbGlkZXJTdGFydFBvcyA9ICQuZmFuY3lib3guZ2V0VHJhbnNsYXRlKCRzbGlkZSk7XG5cblx0XHQvLyBTaW5jZSBwb3NpdGlvbiB3aWxsIGJlIGFic29sdXRlLCBidXQgd2UgbmVlZCB0byBtYWtlIGl0IHJlbGF0aXZlIHRvIHRoZSBzdGFnZVxuXHRcdHNlbGYuc3RhZ2VQb3MgPSAkLmZhbmN5Ym94LmdldFRyYW5zbGF0ZShpbnN0YW5jZS4kcmVmcy5zdGFnZSk7XG5cblx0XHRzZWxmLnNsaWRlclN0YXJ0UG9zLnRvcCAtPSBzZWxmLnN0YWdlUG9zLnRvcDtcblx0XHRzZWxmLnNsaWRlclN0YXJ0UG9zLmxlZnQgLT0gc2VsZi5zdGFnZVBvcy5sZWZ0O1xuXG5cdFx0c2VsZi5jb250ZW50U3RhcnRQb3MudG9wIC09IHNlbGYuc3RhZ2VQb3MudG9wO1xuXHRcdHNlbGYuY29udGVudFN0YXJ0UG9zLmxlZnQgLT0gc2VsZi5zdGFnZVBvcy5sZWZ0O1xuXG5cdFx0JChkb2N1bWVudClcblx0XHRcdC5vZmYoXCIuZmIudG91Y2hcIilcblx0XHRcdC5vbihpc1RvdWNoRGV2aWNlID8gXCJ0b3VjaGVuZC5mYi50b3VjaCB0b3VjaGNhbmNlbC5mYi50b3VjaFwiIDogXCJtb3VzZXVwLmZiLnRvdWNoIG1vdXNlbGVhdmUuZmIudG91Y2hcIiwgJC5wcm94eShzZWxmLCBcIm9udG91Y2hlbmRcIikpXG5cdFx0XHQub24oaXNUb3VjaERldmljZSA/IFwidG91Y2htb3ZlLmZiLnRvdWNoXCIgOiBcIm1vdXNlbW92ZS5mYi50b3VjaFwiLCAkLnByb3h5KHNlbGYsIFwib250b3VjaG1vdmVcIikpO1xuXG5cdFx0aWYgKCQuZmFuY3lib3guaXNNb2JpbGUpIHtcblx0XHRcdGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoXCJzY3JvbGxcIiwgc2VsZi5vbnNjcm9sbCwgdHJ1ZSk7XG5cdFx0fVxuXG5cdFx0Ly8gU2tpcCBpZiBjbGlja2VkIG91dHNpZGUgdGhlIHNsaWRpbmcgYXJlYVxuXHRcdGlmICghKHNlbGYub3B0cyB8fCBzZWxmLmNhblBhbikgfHwgISgkdGFyZ2V0LmlzKHNlbGYuJHN0YWdlKSB8fCBzZWxmLiRzdGFnZS5maW5kKCR0YXJnZXQpLmxlbmd0aCkpIHtcblx0XHRcdGlmICgkdGFyZ2V0LmlzKFwiLmZhbmN5Ym94LWltYWdlXCIpKSB7XG5cdFx0XHRcdGUucHJldmVudERlZmF1bHQoKTtcblx0XHRcdH1cblxuXHRcdFx0aWYgKCEoJC5mYW5jeWJveC5pc01vYmlsZSAmJiAkdGFyZ2V0Lmhhc0NsYXNzKFwiZmFuY3lib3gtY2FwdGlvblwiKSkpIHtcblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0fVxuXHRcdH1cblxuXHRcdHNlbGYuaXNTY3JvbGxhYmxlID0gaXNTY3JvbGxhYmxlKCR0YXJnZXQpIHx8IGlzU2Nyb2xsYWJsZSgkdGFyZ2V0LnBhcmVudCgpKTtcblxuXHRcdC8vIENoZWNrIGlmIGVsZW1lbnQgaXMgc2Nyb2xsYWJsZSBhbmQgdHJ5IHRvIHByZXZlbnQgZGVmYXVsdCBiZWhhdmlvciAoc2Nyb2xsaW5nKVxuXHRcdGlmICghKCQuZmFuY3lib3guaXNNb2JpbGUgJiYgc2VsZi5pc1Njcm9sbGFibGUpKSB7XG5cdFx0XHRlLnByZXZlbnREZWZhdWx0KCk7XG5cdFx0fVxuXG5cdFx0Ly8gT25lIGZpbmdlciBvciBtb3VzZSBjbGljayAtIHN3aXBlIG9yIHBhbiBhbiBpbWFnZVxuXHRcdGlmIChzZWxmLnN0YXJ0UG9pbnRzLmxlbmd0aCA9PT0gMSB8fCBjdXJyZW50Lmhhc0Vycm9yKSB7XG5cdFx0XHRpZiAoc2VsZi5jYW5QYW4pIHtcblx0XHRcdFx0JC5mYW5jeWJveC5zdG9wKHNlbGYuJGNvbnRlbnQpO1xuXG5cdFx0XHRcdHNlbGYuaXNQYW5uaW5nID0gdHJ1ZTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdHNlbGYuaXNTd2lwaW5nID0gdHJ1ZTtcblx0XHRcdH1cblxuXHRcdFx0c2VsZi4kY29udGFpbmVyLmFkZENsYXNzKFwiZmFuY3lib3gtaXMtZ3JhYmJpbmdcIik7XG5cdFx0fVxuXG5cdFx0Ly8gVHdvIGZpbmdlcnMgLSB6b29tIGltYWdlXG5cdFx0aWYgKHNlbGYuc3RhcnRQb2ludHMubGVuZ3RoID09PSAyICYmIGN1cnJlbnQudHlwZSA9PT0gXCJpbWFnZVwiICYmIChjdXJyZW50LmlzTG9hZGVkIHx8IGN1cnJlbnQuJGdob3N0KSkge1xuXHRcdFx0c2VsZi5jYW5UYXAgPSBmYWxzZTtcblx0XHRcdHNlbGYuaXNTd2lwaW5nID0gZmFsc2U7XG5cdFx0XHRzZWxmLmlzUGFubmluZyA9IGZhbHNlO1xuXG5cdFx0XHRzZWxmLmlzWm9vbWluZyA9IHRydWU7XG5cblx0XHRcdCQuZmFuY3lib3guc3RvcChzZWxmLiRjb250ZW50KTtcblxuXHRcdFx0c2VsZi5jZW50ZXJQb2ludFN0YXJ0WCA9IChzZWxmLnN0YXJ0UG9pbnRzWzBdLnggKyBzZWxmLnN0YXJ0UG9pbnRzWzFdLngpICogMC41IC0gJCh3aW5kb3cpLnNjcm9sbExlZnQoKTtcblx0XHRcdHNlbGYuY2VudGVyUG9pbnRTdGFydFkgPSAoc2VsZi5zdGFydFBvaW50c1swXS55ICsgc2VsZi5zdGFydFBvaW50c1sxXS55KSAqIDAuNSAtICQod2luZG93KS5zY3JvbGxUb3AoKTtcblxuXHRcdFx0c2VsZi5wZXJjZW50YWdlT2ZJbWFnZUF0UGluY2hQb2ludFggPSAoc2VsZi5jZW50ZXJQb2ludFN0YXJ0WCAtIHNlbGYuY29udGVudFN0YXJ0UG9zLmxlZnQpIC8gc2VsZi5jb250ZW50U3RhcnRQb3Mud2lkdGg7XG5cdFx0XHRzZWxmLnBlcmNlbnRhZ2VPZkltYWdlQXRQaW5jaFBvaW50WSA9IChzZWxmLmNlbnRlclBvaW50U3RhcnRZIC0gc2VsZi5jb250ZW50U3RhcnRQb3MudG9wKSAvIHNlbGYuY29udGVudFN0YXJ0UG9zLmhlaWdodDtcblxuXHRcdFx0c2VsZi5zdGFydERpc3RhbmNlQmV0d2VlbkZpbmdlcnMgPSBkaXN0YW5jZShzZWxmLnN0YXJ0UG9pbnRzWzBdLCBzZWxmLnN0YXJ0UG9pbnRzWzFdKTtcblx0XHR9XG5cdH07XG5cblx0R3Vlc3R1cmVzLnByb3RvdHlwZS5vbnNjcm9sbCA9IGZ1bmN0aW9uKGUpIHtcblx0XHR2YXIgc2VsZiA9IHRoaXM7XG5cblx0XHRzZWxmLmlzU2Nyb2xsaW5nID0gdHJ1ZTtcblxuXHRcdGRvY3VtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIoXCJzY3JvbGxcIiwgc2VsZi5vbnNjcm9sbCwgdHJ1ZSk7XG5cdH07XG5cblx0R3Vlc3R1cmVzLnByb3RvdHlwZS5vbnRvdWNobW92ZSA9IGZ1bmN0aW9uKGUpIHtcblx0XHR2YXIgc2VsZiA9IHRoaXM7XG5cblx0XHQvLyBNYWtlIHN1cmUgdXNlciBoYXMgbm90IHJlbGVhc2VkIG92ZXIgaWZyYW1lIG9yIGRpc2FibGVkIGVsZW1lbnRcblx0XHRpZiAoZS5vcmlnaW5hbEV2ZW50LmJ1dHRvbnMgIT09IHVuZGVmaW5lZCAmJiBlLm9yaWdpbmFsRXZlbnQuYnV0dG9ucyA9PT0gMCkge1xuXHRcdFx0c2VsZi5vbnRvdWNoZW5kKGUpO1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblxuXHRcdGlmIChzZWxmLmlzU2Nyb2xsaW5nKSB7XG5cdFx0XHRzZWxmLmNhblRhcCA9IGZhbHNlO1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblxuXHRcdHNlbGYubmV3UG9pbnRzID0gZ2V0UG9pbnRlclhZKGUpO1xuXG5cdFx0aWYgKCEoc2VsZi5vcHRzIHx8IHNlbGYuY2FuUGFuKSB8fCAhc2VsZi5uZXdQb2ludHMubGVuZ3RoIHx8ICFzZWxmLm5ld1BvaW50cy5sZW5ndGgpIHtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cblx0XHRpZiAoIShzZWxmLmlzU3dpcGluZyAmJiBzZWxmLmlzU3dpcGluZyA9PT0gdHJ1ZSkpIHtcblx0XHRcdGUucHJldmVudERlZmF1bHQoKTtcblx0XHR9XG5cblx0XHRzZWxmLmRpc3RhbmNlWCA9IGRpc3RhbmNlKHNlbGYubmV3UG9pbnRzWzBdLCBzZWxmLnN0YXJ0UG9pbnRzWzBdLCBcInhcIik7XG5cdFx0c2VsZi5kaXN0YW5jZVkgPSBkaXN0YW5jZShzZWxmLm5ld1BvaW50c1swXSwgc2VsZi5zdGFydFBvaW50c1swXSwgXCJ5XCIpO1xuXG5cdFx0c2VsZi5kaXN0YW5jZSA9IGRpc3RhbmNlKHNlbGYubmV3UG9pbnRzWzBdLCBzZWxmLnN0YXJ0UG9pbnRzWzBdKTtcblxuXHRcdC8vIFNraXAgZmFsc2Ugb250b3VjaG1vdmUgZXZlbnRzIChDaHJvbWUpXG5cdFx0aWYgKHNlbGYuZGlzdGFuY2UgPiAwKSB7XG5cdFx0XHRpZiAoc2VsZi5pc1N3aXBpbmcpIHtcblx0XHRcdFx0c2VsZi5vblN3aXBlKGUpO1xuXHRcdFx0fSBlbHNlIGlmIChzZWxmLmlzUGFubmluZykge1xuXHRcdFx0XHRzZWxmLm9uUGFuKCk7XG5cdFx0XHR9IGVsc2UgaWYgKHNlbGYuaXNab29taW5nKSB7XG5cdFx0XHRcdHNlbGYub25ab29tKCk7XG5cdFx0XHR9XG5cdFx0fVxuXHR9O1xuXG5cdEd1ZXN0dXJlcy5wcm90b3R5cGUub25Td2lwZSA9IGZ1bmN0aW9uKGUpIHtcblx0XHR2YXIgc2VsZiA9IHRoaXMsXG5cdFx0XHRpbnN0YW5jZSA9IHNlbGYuaW5zdGFuY2UsXG5cdFx0XHRzd2lwaW5nID0gc2VsZi5pc1N3aXBpbmcsXG5cdFx0XHRsZWZ0ID0gc2VsZi5zbGlkZXJTdGFydFBvcy5sZWZ0IHx8IDAsXG5cdFx0XHRhbmdsZTtcblxuXHRcdC8vIElmIGRpcmVjdGlvbiBpcyBub3QgeWV0IGRldGVybWluZWRcblx0XHRpZiAoc3dpcGluZyA9PT0gdHJ1ZSkge1xuXHRcdFx0Ly8gV2UgbmVlZCBhdCBsZWFzdCAxMHB4IGRpc3RhbmNlIHRvIGNvcnJlY3RseSBjYWxjdWxhdGUgYW4gYW5nbGVcblx0XHRcdGlmIChNYXRoLmFicyhzZWxmLmRpc3RhbmNlKSA+IDEwKSB7XG5cdFx0XHRcdHNlbGYuY2FuVGFwID0gZmFsc2U7XG5cblx0XHRcdFx0aWYgKGluc3RhbmNlLmdyb3VwLmxlbmd0aCA8IDIgJiYgc2VsZi5vcHRzLnZlcnRpY2FsKSB7XG5cdFx0XHRcdFx0c2VsZi5pc1N3aXBpbmcgPSBcInlcIjtcblx0XHRcdFx0fSBlbHNlIGlmIChpbnN0YW5jZS5pc0RyYWdnaW5nIHx8IHNlbGYub3B0cy52ZXJ0aWNhbCA9PT0gZmFsc2UgfHwgKHNlbGYub3B0cy52ZXJ0aWNhbCA9PT0gXCJhdXRvXCIgJiYgJCh3aW5kb3cpLndpZHRoKCkgPiA4MDApKSB7XG5cdFx0XHRcdFx0c2VsZi5pc1N3aXBpbmcgPSBcInhcIjtcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRhbmdsZSA9IE1hdGguYWJzKChNYXRoLmF0YW4yKHNlbGYuZGlzdGFuY2VZLCBzZWxmLmRpc3RhbmNlWCkgKiAxODApIC8gTWF0aC5QSSk7XG5cblx0XHRcdFx0XHRzZWxmLmlzU3dpcGluZyA9IGFuZ2xlID4gNDUgJiYgYW5nbGUgPCAxMzUgPyBcInlcIiA6IFwieFwiO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0aWYgKHNlbGYuaXNTd2lwaW5nID09PSBcInlcIiAmJiAkLmZhbmN5Ym94LmlzTW9iaWxlICYmIHNlbGYuaXNTY3JvbGxhYmxlKSB7XG5cdFx0XHRcdFx0c2VsZi5pc1Njcm9sbGluZyA9IHRydWU7XG5cblx0XHRcdFx0XHRyZXR1cm47XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRpbnN0YW5jZS5pc0RyYWdnaW5nID0gc2VsZi5pc1N3aXBpbmc7XG5cblx0XHRcdFx0Ly8gUmVzZXQgcG9pbnRzIHRvIGF2b2lkIGp1bXBpbmcsIGJlY2F1c2Ugd2UgZHJvcHBlZCBmaXJzdCBzd2lwZXMgdG8gY2FsY3VsYXRlIHRoZSBhbmdsZVxuXHRcdFx0XHRzZWxmLnN0YXJ0UG9pbnRzID0gc2VsZi5uZXdQb2ludHM7XG5cblx0XHRcdFx0JC5lYWNoKGluc3RhbmNlLnNsaWRlcywgZnVuY3Rpb24oaW5kZXgsIHNsaWRlKSB7XG5cdFx0XHRcdFx0dmFyIHNsaWRlUG9zLCBzdGFnZVBvcztcblxuXHRcdFx0XHRcdCQuZmFuY3lib3guc3RvcChzbGlkZS4kc2xpZGUpO1xuXG5cdFx0XHRcdFx0c2xpZGVQb3MgPSAkLmZhbmN5Ym94LmdldFRyYW5zbGF0ZShzbGlkZS4kc2xpZGUpO1xuXHRcdFx0XHRcdHN0YWdlUG9zID0gJC5mYW5jeWJveC5nZXRUcmFuc2xhdGUoaW5zdGFuY2UuJHJlZnMuc3RhZ2UpO1xuXG5cdFx0XHRcdFx0c2xpZGUuJHNsaWRlXG5cdFx0XHRcdFx0XHQuY3NzKHtcblx0XHRcdFx0XHRcdFx0dHJhbnNmb3JtOiBcIlwiLFxuXHRcdFx0XHRcdFx0XHRvcGFjaXR5OiBcIlwiLFxuXHRcdFx0XHRcdFx0XHRcInRyYW5zaXRpb24tZHVyYXRpb25cIjogXCJcIlxuXHRcdFx0XHRcdFx0fSlcblx0XHRcdFx0XHRcdC5yZW1vdmVDbGFzcyhcImZhbmN5Ym94LWFuaW1hdGVkXCIpXG5cdFx0XHRcdFx0XHQucmVtb3ZlQ2xhc3MoZnVuY3Rpb24oaW5kZXgsIGNsYXNzTmFtZSkge1xuXHRcdFx0XHRcdFx0XHRyZXR1cm4gKGNsYXNzTmFtZS5tYXRjaCgvKF58XFxzKWZhbmN5Ym94LWZ4LVxcUysvZykgfHwgW10pLmpvaW4oXCIgXCIpO1xuXHRcdFx0XHRcdFx0fSk7XG5cblx0XHRcdFx0XHRpZiAoc2xpZGUucG9zID09PSBpbnN0YW5jZS5jdXJyZW50LnBvcykge1xuXHRcdFx0XHRcdFx0c2VsZi5zbGlkZXJTdGFydFBvcy50b3AgPSBzbGlkZVBvcy50b3AgLSBzdGFnZVBvcy50b3A7XG5cdFx0XHRcdFx0XHRzZWxmLnNsaWRlclN0YXJ0UG9zLmxlZnQgPSBzbGlkZVBvcy5sZWZ0IC0gc3RhZ2VQb3MubGVmdDtcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHQkLmZhbmN5Ym94LnNldFRyYW5zbGF0ZShzbGlkZS4kc2xpZGUsIHtcblx0XHRcdFx0XHRcdHRvcDogc2xpZGVQb3MudG9wIC0gc3RhZ2VQb3MudG9wLFxuXHRcdFx0XHRcdFx0bGVmdDogc2xpZGVQb3MubGVmdCAtIHN0YWdlUG9zLmxlZnRcblx0XHRcdFx0XHR9KTtcblx0XHRcdFx0fSk7XG5cblx0XHRcdFx0Ly8gU3RvcCBzbGlkZXNob3dcblx0XHRcdFx0aWYgKGluc3RhbmNlLlNsaWRlU2hvdyAmJiBpbnN0YW5jZS5TbGlkZVNob3cuaXNBY3RpdmUpIHtcblx0XHRcdFx0XHRpbnN0YW5jZS5TbGlkZVNob3cuc3RvcCgpO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cblx0XHRcdHJldHVybjtcblx0XHR9XG5cblx0XHQvLyBTdGlja3kgZWRnZXNcblx0XHRpZiAoc3dpcGluZyA9PSBcInhcIikge1xuXHRcdFx0aWYgKFxuXHRcdFx0XHRzZWxmLmRpc3RhbmNlWCA+IDAgJiZcblx0XHRcdFx0KHNlbGYuaW5zdGFuY2UuZ3JvdXAubGVuZ3RoIDwgMiB8fCAoc2VsZi5pbnN0YW5jZS5jdXJyZW50LmluZGV4ID09PSAwICYmICFzZWxmLmluc3RhbmNlLmN1cnJlbnQub3B0cy5sb29wKSlcblx0XHRcdCkge1xuXHRcdFx0XHRsZWZ0ID0gbGVmdCArIE1hdGgucG93KHNlbGYuZGlzdGFuY2VYLCAwLjgpO1xuXHRcdFx0fSBlbHNlIGlmIChcblx0XHRcdFx0c2VsZi5kaXN0YW5jZVggPCAwICYmXG5cdFx0XHRcdChzZWxmLmluc3RhbmNlLmdyb3VwLmxlbmd0aCA8IDIgfHxcblx0XHRcdFx0XHQoc2VsZi5pbnN0YW5jZS5jdXJyZW50LmluZGV4ID09PSBzZWxmLmluc3RhbmNlLmdyb3VwLmxlbmd0aCAtIDEgJiYgIXNlbGYuaW5zdGFuY2UuY3VycmVudC5vcHRzLmxvb3ApKVxuXHRcdFx0KSB7XG5cdFx0XHRcdGxlZnQgPSBsZWZ0IC0gTWF0aC5wb3coLXNlbGYuZGlzdGFuY2VYLCAwLjgpO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0bGVmdCA9IGxlZnQgKyBzZWxmLmRpc3RhbmNlWDtcblx0XHRcdH1cblx0XHR9XG5cblx0XHRzZWxmLnNsaWRlckxhc3RQb3MgPSB7XG5cdFx0XHR0b3A6IHN3aXBpbmcgPT0gXCJ4XCIgPyAwIDogc2VsZi5zbGlkZXJTdGFydFBvcy50b3AgKyBzZWxmLmRpc3RhbmNlWSxcblx0XHRcdGxlZnQ6IGxlZnRcblx0XHR9O1xuXG5cdFx0aWYgKHNlbGYucmVxdWVzdElkKSB7XG5cdFx0XHRjYW5jZWxBRnJhbWUoc2VsZi5yZXF1ZXN0SWQpO1xuXG5cdFx0XHRzZWxmLnJlcXVlc3RJZCA9IG51bGw7XG5cdFx0fVxuXG5cdFx0c2VsZi5yZXF1ZXN0SWQgPSByZXF1ZXN0QUZyYW1lKGZ1bmN0aW9uKCkge1xuXHRcdFx0aWYgKHNlbGYuc2xpZGVyTGFzdFBvcykge1xuXHRcdFx0XHQkLmVhY2goc2VsZi5pbnN0YW5jZS5zbGlkZXMsIGZ1bmN0aW9uKGluZGV4LCBzbGlkZSkge1xuXHRcdFx0XHRcdHZhciBwb3MgPSBzbGlkZS5wb3MgLSBzZWxmLmluc3RhbmNlLmN1cnJQb3M7XG5cblx0XHRcdFx0XHQkLmZhbmN5Ym94LnNldFRyYW5zbGF0ZShzbGlkZS4kc2xpZGUsIHtcblx0XHRcdFx0XHRcdHRvcDogc2VsZi5zbGlkZXJMYXN0UG9zLnRvcCxcblx0XHRcdFx0XHRcdGxlZnQ6IHNlbGYuc2xpZGVyTGFzdFBvcy5sZWZ0ICsgcG9zICogc2VsZi5jYW52YXNXaWR0aCArIHBvcyAqIHNsaWRlLm9wdHMuZ3V0dGVyXG5cdFx0XHRcdFx0fSk7XG5cdFx0XHRcdH0pO1xuXG5cdFx0XHRcdHNlbGYuJGNvbnRhaW5lci5hZGRDbGFzcyhcImZhbmN5Ym94LWlzLXNsaWRpbmdcIik7XG5cdFx0XHR9XG5cdFx0fSk7XG5cdH07XG5cblx0R3Vlc3R1cmVzLnByb3RvdHlwZS5vblBhbiA9IGZ1bmN0aW9uKCkge1xuXHRcdHZhciBzZWxmID0gdGhpcztcblxuXHRcdC8vIFByZXZlbnQgYWNjaWRlbnRhbCBtb3ZlbWVudCAoc29tZXRpbWVzLCB3aGVuIHRhcHBpbmcgY2FzdWFsbHksIGZpbmdlciBjYW4gbW92ZSBhIGJpdClcblx0XHRpZiAoZGlzdGFuY2Uoc2VsZi5uZXdQb2ludHNbMF0sIHNlbGYucmVhbFBvaW50c1swXSkgPCAoJC5mYW5jeWJveC5pc01vYmlsZSA/IDEwIDogNSkpIHtcblx0XHRcdHNlbGYuc3RhcnRQb2ludHMgPSBzZWxmLm5ld1BvaW50cztcblx0XHRcdHJldHVybjtcblx0XHR9XG5cblx0XHRzZWxmLmNhblRhcCA9IGZhbHNlO1xuXG5cdFx0c2VsZi5jb250ZW50TGFzdFBvcyA9IHNlbGYubGltaXRNb3ZlbWVudCgpO1xuXG5cdFx0aWYgKHNlbGYucmVxdWVzdElkKSB7XG5cdFx0XHRjYW5jZWxBRnJhbWUoc2VsZi5yZXF1ZXN0SWQpO1xuXHRcdH1cblxuXHRcdHNlbGYucmVxdWVzdElkID0gcmVxdWVzdEFGcmFtZShmdW5jdGlvbigpIHtcblx0XHRcdCQuZmFuY3lib3guc2V0VHJhbnNsYXRlKHNlbGYuJGNvbnRlbnQsIHNlbGYuY29udGVudExhc3RQb3MpO1xuXHRcdH0pO1xuXHR9O1xuXG5cdC8vIE1ha2UgcGFubmluZyBzdGlja3kgdG8gdGhlIGVkZ2VzXG5cdEd1ZXN0dXJlcy5wcm90b3R5cGUubGltaXRNb3ZlbWVudCA9IGZ1bmN0aW9uKCkge1xuXHRcdHZhciBzZWxmID0gdGhpcztcblxuXHRcdHZhciBjYW52YXNXaWR0aCA9IHNlbGYuY2FudmFzV2lkdGg7XG5cdFx0dmFyIGNhbnZhc0hlaWdodCA9IHNlbGYuY2FudmFzSGVpZ2h0O1xuXG5cdFx0dmFyIGRpc3RhbmNlWCA9IHNlbGYuZGlzdGFuY2VYO1xuXHRcdHZhciBkaXN0YW5jZVkgPSBzZWxmLmRpc3RhbmNlWTtcblxuXHRcdHZhciBjb250ZW50U3RhcnRQb3MgPSBzZWxmLmNvbnRlbnRTdGFydFBvcztcblxuXHRcdHZhciBjdXJyZW50T2Zmc2V0WCA9IGNvbnRlbnRTdGFydFBvcy5sZWZ0O1xuXHRcdHZhciBjdXJyZW50T2Zmc2V0WSA9IGNvbnRlbnRTdGFydFBvcy50b3A7XG5cblx0XHR2YXIgY3VycmVudFdpZHRoID0gY29udGVudFN0YXJ0UG9zLndpZHRoO1xuXHRcdHZhciBjdXJyZW50SGVpZ2h0ID0gY29udGVudFN0YXJ0UG9zLmhlaWdodDtcblxuXHRcdHZhciBtaW5UcmFuc2xhdGVYLCBtaW5UcmFuc2xhdGVZLCBtYXhUcmFuc2xhdGVYLCBtYXhUcmFuc2xhdGVZLCBuZXdPZmZzZXRYLCBuZXdPZmZzZXRZO1xuXG5cdFx0aWYgKGN1cnJlbnRXaWR0aCA+IGNhbnZhc1dpZHRoKSB7XG5cdFx0XHRuZXdPZmZzZXRYID0gY3VycmVudE9mZnNldFggKyBkaXN0YW5jZVg7XG5cdFx0fSBlbHNlIHtcblx0XHRcdG5ld09mZnNldFggPSBjdXJyZW50T2Zmc2V0WDtcblx0XHR9XG5cblx0XHRuZXdPZmZzZXRZID0gY3VycmVudE9mZnNldFkgKyBkaXN0YW5jZVk7XG5cblx0XHQvLyBTbG93IGRvd24gcHJvcG9ydGlvbmFsbHkgdG8gdHJhdmVsZWQgZGlzdGFuY2Vcblx0XHRtaW5UcmFuc2xhdGVYID0gTWF0aC5tYXgoMCwgY2FudmFzV2lkdGggKiAwLjUgLSBjdXJyZW50V2lkdGggKiAwLjUpO1xuXHRcdG1pblRyYW5zbGF0ZVkgPSBNYXRoLm1heCgwLCBjYW52YXNIZWlnaHQgKiAwLjUgLSBjdXJyZW50SGVpZ2h0ICogMC41KTtcblxuXHRcdG1heFRyYW5zbGF0ZVggPSBNYXRoLm1pbihjYW52YXNXaWR0aCAtIGN1cnJlbnRXaWR0aCwgY2FudmFzV2lkdGggKiAwLjUgLSBjdXJyZW50V2lkdGggKiAwLjUpO1xuXHRcdG1heFRyYW5zbGF0ZVkgPSBNYXRoLm1pbihjYW52YXNIZWlnaHQgLSBjdXJyZW50SGVpZ2h0LCBjYW52YXNIZWlnaHQgKiAwLjUgLSBjdXJyZW50SGVpZ2h0ICogMC41KTtcblxuXHRcdC8vICAgLT5cblx0XHRpZiAoZGlzdGFuY2VYID4gMCAmJiBuZXdPZmZzZXRYID4gbWluVHJhbnNsYXRlWCkge1xuXHRcdFx0bmV3T2Zmc2V0WCA9IG1pblRyYW5zbGF0ZVggLSAxICsgTWF0aC5wb3coLW1pblRyYW5zbGF0ZVggKyBjdXJyZW50T2Zmc2V0WCArIGRpc3RhbmNlWCwgMC44KSB8fCAwO1xuXHRcdH1cblxuXHRcdC8vICAgIDwtXG5cdFx0aWYgKGRpc3RhbmNlWCA8IDAgJiYgbmV3T2Zmc2V0WCA8IG1heFRyYW5zbGF0ZVgpIHtcblx0XHRcdG5ld09mZnNldFggPSBtYXhUcmFuc2xhdGVYICsgMSAtIE1hdGgucG93KG1heFRyYW5zbGF0ZVggLSBjdXJyZW50T2Zmc2V0WCAtIGRpc3RhbmNlWCwgMC44KSB8fCAwO1xuXHRcdH1cblxuXHRcdC8vICAgXFwvXG5cdFx0aWYgKGRpc3RhbmNlWSA+IDAgJiYgbmV3T2Zmc2V0WSA+IG1pblRyYW5zbGF0ZVkpIHtcblx0XHRcdG5ld09mZnNldFkgPSBtaW5UcmFuc2xhdGVZIC0gMSArIE1hdGgucG93KC1taW5UcmFuc2xhdGVZICsgY3VycmVudE9mZnNldFkgKyBkaXN0YW5jZVksIDAuOCkgfHwgMDtcblx0XHR9XG5cblx0XHQvLyAgIC9cXFxuXHRcdGlmIChkaXN0YW5jZVkgPCAwICYmIG5ld09mZnNldFkgPCBtYXhUcmFuc2xhdGVZKSB7XG5cdFx0XHRuZXdPZmZzZXRZID0gbWF4VHJhbnNsYXRlWSArIDEgLSBNYXRoLnBvdyhtYXhUcmFuc2xhdGVZIC0gY3VycmVudE9mZnNldFkgLSBkaXN0YW5jZVksIDAuOCkgfHwgMDtcblx0XHR9XG5cblx0XHRyZXR1cm4ge1xuXHRcdFx0dG9wOiBuZXdPZmZzZXRZLFxuXHRcdFx0bGVmdDogbmV3T2Zmc2V0WFxuXHRcdH07XG5cdH07XG5cblx0R3Vlc3R1cmVzLnByb3RvdHlwZS5saW1pdFBvc2l0aW9uID0gZnVuY3Rpb24obmV3T2Zmc2V0WCwgbmV3T2Zmc2V0WSwgbmV3V2lkdGgsIG5ld0hlaWdodCkge1xuXHRcdHZhciBzZWxmID0gdGhpcztcblxuXHRcdHZhciBjYW52YXNXaWR0aCA9IHNlbGYuY2FudmFzV2lkdGg7XG5cdFx0dmFyIGNhbnZhc0hlaWdodCA9IHNlbGYuY2FudmFzSGVpZ2h0O1xuXG5cdFx0aWYgKG5ld1dpZHRoID4gY2FudmFzV2lkdGgpIHtcblx0XHRcdG5ld09mZnNldFggPSBuZXdPZmZzZXRYID4gMCA/IDAgOiBuZXdPZmZzZXRYO1xuXHRcdFx0bmV3T2Zmc2V0WCA9IG5ld09mZnNldFggPCBjYW52YXNXaWR0aCAtIG5ld1dpZHRoID8gY2FudmFzV2lkdGggLSBuZXdXaWR0aCA6IG5ld09mZnNldFg7XG5cdFx0fSBlbHNlIHtcblx0XHRcdC8vIENlbnRlciBob3Jpem9udGFsbHlcblx0XHRcdG5ld09mZnNldFggPSBNYXRoLm1heCgwLCBjYW52YXNXaWR0aCAvIDIgLSBuZXdXaWR0aCAvIDIpO1xuXHRcdH1cblxuXHRcdGlmIChuZXdIZWlnaHQgPiBjYW52YXNIZWlnaHQpIHtcblx0XHRcdG5ld09mZnNldFkgPSBuZXdPZmZzZXRZID4gMCA/IDAgOiBuZXdPZmZzZXRZO1xuXHRcdFx0bmV3T2Zmc2V0WSA9IG5ld09mZnNldFkgPCBjYW52YXNIZWlnaHQgLSBuZXdIZWlnaHQgPyBjYW52YXNIZWlnaHQgLSBuZXdIZWlnaHQgOiBuZXdPZmZzZXRZO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHQvLyBDZW50ZXIgdmVydGljYWxseVxuXHRcdFx0bmV3T2Zmc2V0WSA9IE1hdGgubWF4KDAsIGNhbnZhc0hlaWdodCAvIDIgLSBuZXdIZWlnaHQgLyAyKTtcblx0XHR9XG5cblx0XHRyZXR1cm4ge1xuXHRcdFx0dG9wOiBuZXdPZmZzZXRZLFxuXHRcdFx0bGVmdDogbmV3T2Zmc2V0WFxuXHRcdH07XG5cdH07XG5cblx0R3Vlc3R1cmVzLnByb3RvdHlwZS5vblpvb20gPSBmdW5jdGlvbigpIHtcblx0XHR2YXIgc2VsZiA9IHRoaXM7XG5cblx0XHQvLyBDYWxjdWxhdGUgY3VycmVudCBkaXN0YW5jZSBiZXR3ZWVuIHBvaW50cyB0byBnZXQgcGluY2ggcmF0aW8gYW5kIG5ldyB3aWR0aCBhbmQgaGVpZ2h0XG5cdFx0dmFyIGNvbnRlbnRTdGFydFBvcyA9IHNlbGYuY29udGVudFN0YXJ0UG9zO1xuXG5cdFx0dmFyIGN1cnJlbnRXaWR0aCA9IGNvbnRlbnRTdGFydFBvcy53aWR0aDtcblx0XHR2YXIgY3VycmVudEhlaWdodCA9IGNvbnRlbnRTdGFydFBvcy5oZWlnaHQ7XG5cblx0XHR2YXIgY3VycmVudE9mZnNldFggPSBjb250ZW50U3RhcnRQb3MubGVmdDtcblx0XHR2YXIgY3VycmVudE9mZnNldFkgPSBjb250ZW50U3RhcnRQb3MudG9wO1xuXG5cdFx0dmFyIGVuZERpc3RhbmNlQmV0d2VlbkZpbmdlcnMgPSBkaXN0YW5jZShzZWxmLm5ld1BvaW50c1swXSwgc2VsZi5uZXdQb2ludHNbMV0pO1xuXG5cdFx0dmFyIHBpbmNoUmF0aW8gPSBlbmREaXN0YW5jZUJldHdlZW5GaW5nZXJzIC8gc2VsZi5zdGFydERpc3RhbmNlQmV0d2VlbkZpbmdlcnM7XG5cblx0XHR2YXIgbmV3V2lkdGggPSBNYXRoLmZsb29yKGN1cnJlbnRXaWR0aCAqIHBpbmNoUmF0aW8pO1xuXHRcdHZhciBuZXdIZWlnaHQgPSBNYXRoLmZsb29yKGN1cnJlbnRIZWlnaHQgKiBwaW5jaFJhdGlvKTtcblxuXHRcdC8vIFRoaXMgaXMgdGhlIHRyYW5zbGF0aW9uIGR1ZSB0byBwaW5jaC16b29taW5nXG5cdFx0dmFyIHRyYW5zbGF0ZUZyb21ab29taW5nWCA9IChjdXJyZW50V2lkdGggLSBuZXdXaWR0aCkgKiBzZWxmLnBlcmNlbnRhZ2VPZkltYWdlQXRQaW5jaFBvaW50WDtcblx0XHR2YXIgdHJhbnNsYXRlRnJvbVpvb21pbmdZID0gKGN1cnJlbnRIZWlnaHQgLSBuZXdIZWlnaHQpICogc2VsZi5wZXJjZW50YWdlT2ZJbWFnZUF0UGluY2hQb2ludFk7XG5cblx0XHQvLyBQb2ludCBiZXR3ZWVuIHRoZSB0d28gdG91Y2hlc1xuXHRcdHZhciBjZW50ZXJQb2ludEVuZFggPSAoc2VsZi5uZXdQb2ludHNbMF0ueCArIHNlbGYubmV3UG9pbnRzWzFdLngpIC8gMiAtICQod2luZG93KS5zY3JvbGxMZWZ0KCk7XG5cdFx0dmFyIGNlbnRlclBvaW50RW5kWSA9IChzZWxmLm5ld1BvaW50c1swXS55ICsgc2VsZi5uZXdQb2ludHNbMV0ueSkgLyAyIC0gJCh3aW5kb3cpLnNjcm9sbFRvcCgpO1xuXG5cdFx0Ly8gQW5kIHRoaXMgaXMgdGhlIHRyYW5zbGF0aW9uIGR1ZSB0byB0cmFuc2xhdGlvbiBvZiB0aGUgY2VudGVycG9pbnRcblx0XHQvLyBiZXR3ZWVuIHRoZSB0d28gZmluZ2Vyc1xuXHRcdHZhciB0cmFuc2xhdGVGcm9tVHJhbnNsYXRpbmdYID0gY2VudGVyUG9pbnRFbmRYIC0gc2VsZi5jZW50ZXJQb2ludFN0YXJ0WDtcblx0XHR2YXIgdHJhbnNsYXRlRnJvbVRyYW5zbGF0aW5nWSA9IGNlbnRlclBvaW50RW5kWSAtIHNlbGYuY2VudGVyUG9pbnRTdGFydFk7XG5cblx0XHQvLyBUaGUgbmV3IG9mZnNldCBpcyB0aGUgb2xkL2N1cnJlbnQgb25lIHBsdXMgdGhlIHRvdGFsIHRyYW5zbGF0aW9uXG5cdFx0dmFyIG5ld09mZnNldFggPSBjdXJyZW50T2Zmc2V0WCArICh0cmFuc2xhdGVGcm9tWm9vbWluZ1ggKyB0cmFuc2xhdGVGcm9tVHJhbnNsYXRpbmdYKTtcblx0XHR2YXIgbmV3T2Zmc2V0WSA9IGN1cnJlbnRPZmZzZXRZICsgKHRyYW5zbGF0ZUZyb21ab29taW5nWSArIHRyYW5zbGF0ZUZyb21UcmFuc2xhdGluZ1kpO1xuXG5cdFx0dmFyIG5ld1BvcyA9IHtcblx0XHRcdHRvcDogbmV3T2Zmc2V0WSxcblx0XHRcdGxlZnQ6IG5ld09mZnNldFgsXG5cdFx0XHRzY2FsZVg6IHBpbmNoUmF0aW8sXG5cdFx0XHRzY2FsZVk6IHBpbmNoUmF0aW9cblx0XHR9O1xuXG5cdFx0c2VsZi5jYW5UYXAgPSBmYWxzZTtcblxuXHRcdHNlbGYubmV3V2lkdGggPSBuZXdXaWR0aDtcblx0XHRzZWxmLm5ld0hlaWdodCA9IG5ld0hlaWdodDtcblxuXHRcdHNlbGYuY29udGVudExhc3RQb3MgPSBuZXdQb3M7XG5cblx0XHRpZiAoc2VsZi5yZXF1ZXN0SWQpIHtcblx0XHRcdGNhbmNlbEFGcmFtZShzZWxmLnJlcXVlc3RJZCk7XG5cdFx0fVxuXG5cdFx0c2VsZi5yZXF1ZXN0SWQgPSByZXF1ZXN0QUZyYW1lKGZ1bmN0aW9uKCkge1xuXHRcdFx0JC5mYW5jeWJveC5zZXRUcmFuc2xhdGUoc2VsZi4kY29udGVudCwgc2VsZi5jb250ZW50TGFzdFBvcyk7XG5cdFx0fSk7XG5cdH07XG5cblx0R3Vlc3R1cmVzLnByb3RvdHlwZS5vbnRvdWNoZW5kID0gZnVuY3Rpb24oZSkge1xuXHRcdHZhciBzZWxmID0gdGhpcztcblxuXHRcdHZhciBzd2lwaW5nID0gc2VsZi5pc1N3aXBpbmc7XG5cdFx0dmFyIHBhbm5pbmcgPSBzZWxmLmlzUGFubmluZztcblx0XHR2YXIgem9vbWluZyA9IHNlbGYuaXNab29taW5nO1xuXHRcdHZhciBzY3JvbGxpbmcgPSBzZWxmLmlzU2Nyb2xsaW5nO1xuXG5cdFx0c2VsZi5lbmRQb2ludHMgPSBnZXRQb2ludGVyWFkoZSk7XG5cdFx0c2VsZi5kTXMgPSBNYXRoLm1heChuZXcgRGF0ZSgpLmdldFRpbWUoKSAtIHNlbGYuc3RhcnRUaW1lLCAxKTtcblxuXHRcdHNlbGYuJGNvbnRhaW5lci5yZW1vdmVDbGFzcyhcImZhbmN5Ym94LWlzLWdyYWJiaW5nXCIpO1xuXG5cdFx0JChkb2N1bWVudCkub2ZmKFwiLmZiLnRvdWNoXCIpO1xuXG5cdFx0ZG9jdW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lcihcInNjcm9sbFwiLCBzZWxmLm9uc2Nyb2xsLCB0cnVlKTtcblxuXHRcdGlmIChzZWxmLnJlcXVlc3RJZCkge1xuXHRcdFx0Y2FuY2VsQUZyYW1lKHNlbGYucmVxdWVzdElkKTtcblxuXHRcdFx0c2VsZi5yZXF1ZXN0SWQgPSBudWxsO1xuXHRcdH1cblxuXHRcdHNlbGYuaXNTd2lwaW5nID0gZmFsc2U7XG5cdFx0c2VsZi5pc1Bhbm5pbmcgPSBmYWxzZTtcblx0XHRzZWxmLmlzWm9vbWluZyA9IGZhbHNlO1xuXHRcdHNlbGYuaXNTY3JvbGxpbmcgPSBmYWxzZTtcblxuXHRcdHNlbGYuaW5zdGFuY2UuaXNEcmFnZ2luZyA9IGZhbHNlO1xuXG5cdFx0aWYgKHNlbGYuY2FuVGFwKSB7XG5cdFx0XHRyZXR1cm4gc2VsZi5vblRhcChlKTtcblx0XHR9XG5cblx0XHRzZWxmLnNwZWVkID0gMTAwO1xuXG5cdFx0Ly8gU3BlZWQgaW4gcHgvbXNcblx0XHRzZWxmLnZlbG9jaXR5WCA9IChzZWxmLmRpc3RhbmNlWCAvIHNlbGYuZE1zKSAqIDAuNTtcblx0XHRzZWxmLnZlbG9jaXR5WSA9IChzZWxmLmRpc3RhbmNlWSAvIHNlbGYuZE1zKSAqIDAuNTtcblxuXHRcdGlmIChwYW5uaW5nKSB7XG5cdFx0XHRzZWxmLmVuZFBhbm5pbmcoKTtcblx0XHR9IGVsc2UgaWYgKHpvb21pbmcpIHtcblx0XHRcdHNlbGYuZW5kWm9vbWluZygpO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRzZWxmLmVuZFN3aXBpbmcoc3dpcGluZywgc2Nyb2xsaW5nKTtcblx0XHR9XG5cblx0XHRyZXR1cm47XG5cdH07XG5cblx0R3Vlc3R1cmVzLnByb3RvdHlwZS5lbmRTd2lwaW5nID0gZnVuY3Rpb24oc3dpcGluZywgc2Nyb2xsaW5nKSB7XG5cdFx0dmFyIHNlbGYgPSB0aGlzLFxuXHRcdFx0cmV0ID0gZmFsc2UsXG5cdFx0XHRsZW4gPSBzZWxmLmluc3RhbmNlLmdyb3VwLmxlbmd0aCxcblx0XHRcdGRpc3RhbmNlWCA9IE1hdGguYWJzKHNlbGYuZGlzdGFuY2VYKSxcblx0XHRcdGNhbkFkdmFuY2UgPSBzd2lwaW5nID09IFwieFwiICYmIGxlbiA+IDEgJiYgKChzZWxmLmRNcyA+IDEzMCAmJiBkaXN0YW5jZVggPiAxMCkgfHwgZGlzdGFuY2VYID4gNTApLFxuXHRcdFx0c3BlZWRYID0gMzAwO1xuXG5cdFx0c2VsZi5zbGlkZXJMYXN0UG9zID0gbnVsbDtcblxuXHRcdC8vIENsb3NlIGlmIHN3aXBlZCB2ZXJ0aWNhbGx5IC8gbmF2aWdhdGUgaWYgaG9yaXpvbnRhbGx5XG5cdFx0aWYgKHN3aXBpbmcgPT0gXCJ5XCIgJiYgIXNjcm9sbGluZyAmJiBNYXRoLmFicyhzZWxmLmRpc3RhbmNlWSkgPiA1MCkge1xuXHRcdFx0Ly8gQ29udGludWUgdmVydGljYWwgbW92ZW1lbnRcblx0XHRcdCQuZmFuY3lib3guYW5pbWF0ZShcblx0XHRcdFx0c2VsZi5pbnN0YW5jZS5jdXJyZW50LiRzbGlkZSxcblx0XHRcdFx0e1xuXHRcdFx0XHRcdHRvcDogc2VsZi5zbGlkZXJTdGFydFBvcy50b3AgKyBzZWxmLmRpc3RhbmNlWSArIHNlbGYudmVsb2NpdHlZICogMTUwLFxuXHRcdFx0XHRcdG9wYWNpdHk6IDBcblx0XHRcdFx0fSxcblx0XHRcdFx0MjAwXG5cdFx0XHQpO1xuXHRcdFx0cmV0ID0gc2VsZi5pbnN0YW5jZS5jbG9zZSh0cnVlLCAyNTApO1xuXHRcdH0gZWxzZSBpZiAoY2FuQWR2YW5jZSAmJiBzZWxmLmRpc3RhbmNlWCA+IDApIHtcblx0XHRcdHJldCA9IHNlbGYuaW5zdGFuY2UucHJldmlvdXMoc3BlZWRYKTtcblx0XHR9IGVsc2UgaWYgKGNhbkFkdmFuY2UgJiYgc2VsZi5kaXN0YW5jZVggPCAwKSB7XG5cdFx0XHRyZXQgPSBzZWxmLmluc3RhbmNlLm5leHQoc3BlZWRYKTtcblx0XHR9XG5cblx0XHRpZiAocmV0ID09PSBmYWxzZSAmJiAoc3dpcGluZyA9PSBcInhcIiB8fCBzd2lwaW5nID09IFwieVwiKSkge1xuXHRcdFx0c2VsZi5pbnN0YW5jZS5jZW50ZXJTbGlkZSgyMDApO1xuXHRcdH1cblxuXHRcdHNlbGYuJGNvbnRhaW5lci5yZW1vdmVDbGFzcyhcImZhbmN5Ym94LWlzLXNsaWRpbmdcIik7XG5cdH07XG5cblx0Ly8gTGltaXQgcGFubmluZyBmcm9tIGVkZ2VzXG5cdC8vID09PT09PT09PT09PT09PT09PT09PT09PVxuXHRHdWVzdHVyZXMucHJvdG90eXBlLmVuZFBhbm5pbmcgPSBmdW5jdGlvbigpIHtcblx0XHR2YXIgc2VsZiA9IHRoaXMsXG5cdFx0XHRuZXdPZmZzZXRYLFxuXHRcdFx0bmV3T2Zmc2V0WSxcblx0XHRcdG5ld1BvcztcblxuXHRcdGlmICghc2VsZi5jb250ZW50TGFzdFBvcykge1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblxuXHRcdGlmIChzZWxmLm9wdHMubW9tZW50dW0gPT09IGZhbHNlIHx8IHNlbGYuZE1zID4gMzUwKSB7XG5cdFx0XHRuZXdPZmZzZXRYID0gc2VsZi5jb250ZW50TGFzdFBvcy5sZWZ0O1xuXHRcdFx0bmV3T2Zmc2V0WSA9IHNlbGYuY29udGVudExhc3RQb3MudG9wO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHQvLyBDb250aW51ZSBtb3ZlbWVudFxuXHRcdFx0bmV3T2Zmc2V0WCA9IHNlbGYuY29udGVudExhc3RQb3MubGVmdCArIHNlbGYudmVsb2NpdHlYICogNTAwO1xuXHRcdFx0bmV3T2Zmc2V0WSA9IHNlbGYuY29udGVudExhc3RQb3MudG9wICsgc2VsZi52ZWxvY2l0eVkgKiA1MDA7XG5cdFx0fVxuXG5cdFx0bmV3UG9zID0gc2VsZi5saW1pdFBvc2l0aW9uKG5ld09mZnNldFgsIG5ld09mZnNldFksIHNlbGYuY29udGVudFN0YXJ0UG9zLndpZHRoLCBzZWxmLmNvbnRlbnRTdGFydFBvcy5oZWlnaHQpO1xuXG5cdFx0bmV3UG9zLndpZHRoID0gc2VsZi5jb250ZW50U3RhcnRQb3Mud2lkdGg7XG5cdFx0bmV3UG9zLmhlaWdodCA9IHNlbGYuY29udGVudFN0YXJ0UG9zLmhlaWdodDtcblxuXHRcdCQuZmFuY3lib3guYW5pbWF0ZShzZWxmLiRjb250ZW50LCBuZXdQb3MsIDMzMCk7XG5cdH07XG5cblx0R3Vlc3R1cmVzLnByb3RvdHlwZS5lbmRab29taW5nID0gZnVuY3Rpb24oKSB7XG5cdFx0dmFyIHNlbGYgPSB0aGlzO1xuXG5cdFx0dmFyIGN1cnJlbnQgPSBzZWxmLmluc3RhbmNlLmN1cnJlbnQ7XG5cblx0XHR2YXIgbmV3T2Zmc2V0WCwgbmV3T2Zmc2V0WSwgbmV3UG9zLCByZXNldDtcblxuXHRcdHZhciBuZXdXaWR0aCA9IHNlbGYubmV3V2lkdGg7XG5cdFx0dmFyIG5ld0hlaWdodCA9IHNlbGYubmV3SGVpZ2h0O1xuXG5cdFx0aWYgKCFzZWxmLmNvbnRlbnRMYXN0UG9zKSB7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXG5cdFx0bmV3T2Zmc2V0WCA9IHNlbGYuY29udGVudExhc3RQb3MubGVmdDtcblx0XHRuZXdPZmZzZXRZID0gc2VsZi5jb250ZW50TGFzdFBvcy50b3A7XG5cblx0XHRyZXNldCA9IHtcblx0XHRcdHRvcDogbmV3T2Zmc2V0WSxcblx0XHRcdGxlZnQ6IG5ld09mZnNldFgsXG5cdFx0XHR3aWR0aDogbmV3V2lkdGgsXG5cdFx0XHRoZWlnaHQ6IG5ld0hlaWdodCxcblx0XHRcdHNjYWxlWDogMSxcblx0XHRcdHNjYWxlWTogMVxuXHRcdH07XG5cblx0XHQvLyBSZXNldCBzY2FsZXgvc2NhbGVZIHZhbHVlczsgdGhpcyBoZWxwcyBmb3IgcGVyZm9tYW5jZSBhbmQgZG9lcyBub3QgYnJlYWsgYW5pbWF0aW9uXG5cdFx0JC5mYW5jeWJveC5zZXRUcmFuc2xhdGUoc2VsZi4kY29udGVudCwgcmVzZXQpO1xuXG5cdFx0aWYgKG5ld1dpZHRoIDwgc2VsZi5jYW52YXNXaWR0aCAmJiBuZXdIZWlnaHQgPCBzZWxmLmNhbnZhc0hlaWdodCkge1xuXHRcdFx0c2VsZi5pbnN0YW5jZS5zY2FsZVRvRml0KDE1MCk7XG5cdFx0fSBlbHNlIGlmIChuZXdXaWR0aCA+IGN1cnJlbnQud2lkdGggfHwgbmV3SGVpZ2h0ID4gY3VycmVudC5oZWlnaHQpIHtcblx0XHRcdHNlbGYuaW5zdGFuY2Uuc2NhbGVUb0FjdHVhbChzZWxmLmNlbnRlclBvaW50U3RhcnRYLCBzZWxmLmNlbnRlclBvaW50U3RhcnRZLCAxNTApO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRuZXdQb3MgPSBzZWxmLmxpbWl0UG9zaXRpb24obmV3T2Zmc2V0WCwgbmV3T2Zmc2V0WSwgbmV3V2lkdGgsIG5ld0hlaWdodCk7XG5cblx0XHRcdCQuZmFuY3lib3guYW5pbWF0ZShzZWxmLiRjb250ZW50LCBuZXdQb3MsIDE1MCk7XG5cdFx0fVxuXHR9O1xuXG5cdEd1ZXN0dXJlcy5wcm90b3R5cGUub25UYXAgPSBmdW5jdGlvbihlKSB7XG5cdFx0dmFyIHNlbGYgPSB0aGlzO1xuXHRcdHZhciAkdGFyZ2V0ID0gJChlLnRhcmdldCk7XG5cblx0XHR2YXIgaW5zdGFuY2UgPSBzZWxmLmluc3RhbmNlO1xuXHRcdHZhciBjdXJyZW50ID0gaW5zdGFuY2UuY3VycmVudDtcblxuXHRcdHZhciBlbmRQb2ludHMgPSAoZSAmJiBnZXRQb2ludGVyWFkoZSkpIHx8IHNlbGYuc3RhcnRQb2ludHM7XG5cblx0XHR2YXIgdGFwWCA9IGVuZFBvaW50c1swXSA/IGVuZFBvaW50c1swXS54IC0gJCh3aW5kb3cpLnNjcm9sbExlZnQoKSAtIHNlbGYuc3RhZ2VQb3MubGVmdCA6IDA7XG5cdFx0dmFyIHRhcFkgPSBlbmRQb2ludHNbMF0gPyBlbmRQb2ludHNbMF0ueSAtICQod2luZG93KS5zY3JvbGxUb3AoKSAtIHNlbGYuc3RhZ2VQb3MudG9wIDogMDtcblxuXHRcdHZhciB3aGVyZTtcblxuXHRcdHZhciBwcm9jZXNzID0gZnVuY3Rpb24ocHJlZml4KSB7XG5cdFx0XHR2YXIgYWN0aW9uID0gY3VycmVudC5vcHRzW3ByZWZpeF07XG5cblx0XHRcdGlmICgkLmlzRnVuY3Rpb24oYWN0aW9uKSkge1xuXHRcdFx0XHRhY3Rpb24gPSBhY3Rpb24uYXBwbHkoaW5zdGFuY2UsIFtjdXJyZW50LCBlXSk7XG5cdFx0XHR9XG5cblx0XHRcdGlmICghYWN0aW9uKSB7XG5cdFx0XHRcdHJldHVybjtcblx0XHRcdH1cblxuXHRcdFx0c3dpdGNoIChhY3Rpb24pIHtcblx0XHRcdFx0Y2FzZSBcImNsb3NlXCI6XG5cdFx0XHRcdFx0aW5zdGFuY2UuY2xvc2Uoc2VsZi5zdGFydEV2ZW50KTtcblxuXHRcdFx0XHRcdGJyZWFrO1xuXG5cdFx0XHRcdGNhc2UgXCJ0b2dnbGVDb250cm9sc1wiOlxuXHRcdFx0XHRcdGluc3RhbmNlLnRvZ2dsZUNvbnRyb2xzKCk7XG5cblx0XHRcdFx0XHRicmVhaztcblxuXHRcdFx0XHRjYXNlIFwibmV4dFwiOlxuXHRcdFx0XHRcdGluc3RhbmNlLm5leHQoKTtcblxuXHRcdFx0XHRcdGJyZWFrO1xuXG5cdFx0XHRcdGNhc2UgXCJuZXh0T3JDbG9zZVwiOlxuXHRcdFx0XHRcdGlmIChpbnN0YW5jZS5ncm91cC5sZW5ndGggPiAxKSB7XG5cdFx0XHRcdFx0XHRpbnN0YW5jZS5uZXh0KCk7XG5cdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdGluc3RhbmNlLmNsb3NlKHNlbGYuc3RhcnRFdmVudCk7XG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0YnJlYWs7XG5cblx0XHRcdFx0Y2FzZSBcInpvb21cIjpcblx0XHRcdFx0XHRpZiAoY3VycmVudC50eXBlID09IFwiaW1hZ2VcIiAmJiAoY3VycmVudC5pc0xvYWRlZCB8fCBjdXJyZW50LiRnaG9zdCkpIHtcblx0XHRcdFx0XHRcdGlmIChpbnN0YW5jZS5jYW5QYW4oKSkge1xuXHRcdFx0XHRcdFx0XHRpbnN0YW5jZS5zY2FsZVRvRml0KCk7XG5cdFx0XHRcdFx0XHR9IGVsc2UgaWYgKGluc3RhbmNlLmlzU2NhbGVkRG93bigpKSB7XG5cdFx0XHRcdFx0XHRcdGluc3RhbmNlLnNjYWxlVG9BY3R1YWwodGFwWCwgdGFwWSk7XG5cdFx0XHRcdFx0XHR9IGVsc2UgaWYgKGluc3RhbmNlLmdyb3VwLmxlbmd0aCA8IDIpIHtcblx0XHRcdFx0XHRcdFx0aW5zdGFuY2UuY2xvc2Uoc2VsZi5zdGFydEV2ZW50KTtcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRicmVhaztcblx0XHRcdH1cblx0XHR9O1xuXG5cdFx0Ly8gSWdub3JlIHJpZ2h0IGNsaWNrXG5cdFx0aWYgKGUub3JpZ2luYWxFdmVudCAmJiBlLm9yaWdpbmFsRXZlbnQuYnV0dG9uID09IDIpIHtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cblx0XHQvLyBTa2lwIGlmIGNsaWNrZWQgb24gdGhlIHNjcm9sbGJhclxuXHRcdGlmICghJHRhcmdldC5pcyhcImltZ1wiKSAmJiB0YXBYID4gJHRhcmdldFswXS5jbGllbnRXaWR0aCArICR0YXJnZXQub2Zmc2V0KCkubGVmdCkge1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblxuXHRcdC8vIENoZWNrIHdoZXJlIGlzIGNsaWNrZWRcblx0XHRpZiAoJHRhcmdldC5pcyhcIi5mYW5jeWJveC1iZywuZmFuY3lib3gtaW5uZXIsLmZhbmN5Ym94LW91dGVyLC5mYW5jeWJveC1jb250YWluZXJcIikpIHtcblx0XHRcdHdoZXJlID0gXCJPdXRzaWRlXCI7XG5cdFx0fSBlbHNlIGlmICgkdGFyZ2V0LmlzKFwiLmZhbmN5Ym94LXNsaWRlXCIpKSB7XG5cdFx0XHR3aGVyZSA9IFwiU2xpZGVcIjtcblx0XHR9IGVsc2UgaWYgKFxuXHRcdFx0aW5zdGFuY2UuY3VycmVudC4kY29udGVudCAmJlxuXHRcdFx0aW5zdGFuY2UuY3VycmVudC4kY29udGVudFxuXHRcdFx0XHQuZmluZCgkdGFyZ2V0KVxuXHRcdFx0XHQuYWRkQmFjaygpXG5cdFx0XHRcdC5maWx0ZXIoJHRhcmdldCkubGVuZ3RoXG5cdFx0KSB7XG5cdFx0XHR3aGVyZSA9IFwiQ29udGVudFwiO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXG5cdFx0Ly8gQ2hlY2sgaWYgdGhpcyBpcyBhIGRvdWJsZSB0YXBcblx0XHRpZiAoc2VsZi50YXBwZWQpIHtcblx0XHRcdC8vIFN0b3AgcHJldmlvdXNseSBjcmVhdGVkIHNpbmdsZSB0YXBcblx0XHRcdGNsZWFyVGltZW91dChzZWxmLnRhcHBlZCk7XG5cdFx0XHRzZWxmLnRhcHBlZCA9IG51bGw7XG5cblx0XHRcdC8vIFNraXAgaWYgZGlzdGFuY2UgYmV0d2VlbiB0YXBzIGlzIHRvbyBiaWdcblx0XHRcdGlmIChNYXRoLmFicyh0YXBYIC0gc2VsZi50YXBYKSA+IDUwIHx8IE1hdGguYWJzKHRhcFkgLSBzZWxmLnRhcFkpID4gNTApIHtcblx0XHRcdFx0cmV0dXJuIHRoaXM7XG5cdFx0XHR9XG5cblx0XHRcdC8vIE9LLCBub3cgd2UgYXNzdW1lIHRoYXQgdGhpcyBpcyBhIGRvdWJsZS10YXBcblx0XHRcdHByb2Nlc3MoXCJkYmxjbGlja1wiICsgd2hlcmUpO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHQvLyBTaW5nbGUgdGFwIHdpbGwgYmUgcHJvY2Vzc2VkIGlmIHVzZXIgaGFzIG5vdCBjbGlja2VkIHNlY29uZCB0aW1lIHdpdGhpbiAzMDBtc1xuXHRcdFx0Ly8gb3IgdGhlcmUgaXMgbm8gbmVlZCB0byB3YWl0IGZvciBkb3VibGUtdGFwXG5cdFx0XHRzZWxmLnRhcFggPSB0YXBYO1xuXHRcdFx0c2VsZi50YXBZID0gdGFwWTtcblxuXHRcdFx0aWYgKGN1cnJlbnQub3B0c1tcImRibGNsaWNrXCIgKyB3aGVyZV0gJiYgY3VycmVudC5vcHRzW1wiZGJsY2xpY2tcIiArIHdoZXJlXSAhPT0gY3VycmVudC5vcHRzW1wiY2xpY2tcIiArIHdoZXJlXSkge1xuXHRcdFx0XHRzZWxmLnRhcHBlZCA9IHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0c2VsZi50YXBwZWQgPSBudWxsO1xuXG5cdFx0XHRcdFx0aWYgKCFpbnN0YW5jZS5pc0FuaW1hdGluZykge1xuXHRcdFx0XHRcdFx0cHJvY2VzcyhcImNsaWNrXCIgKyB3aGVyZSk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9LCA1MDApO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0cHJvY2VzcyhcImNsaWNrXCIgKyB3aGVyZSk7XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0cmV0dXJuIHRoaXM7XG5cdH07XG5cblx0JChkb2N1bWVudClcblx0XHQub24oXCJvbkFjdGl2YXRlLmZiXCIsIGZ1bmN0aW9uKGUsIGluc3RhbmNlKSB7XG5cdFx0XHRpZiAoaW5zdGFuY2UgJiYgIWluc3RhbmNlLkd1ZXN0dXJlcykge1xuXHRcdFx0XHRpbnN0YW5jZS5HdWVzdHVyZXMgPSBuZXcgR3Vlc3R1cmVzKGluc3RhbmNlKTtcblx0XHRcdH1cblx0XHR9KVxuXHRcdC5vbihcImJlZm9yZUNsb3NlLmZiXCIsIGZ1bmN0aW9uKGUsIGluc3RhbmNlKSB7XG5cdFx0XHRpZiAoaW5zdGFuY2UgJiYgaW5zdGFuY2UuR3Vlc3R1cmVzKSB7XG5cdFx0XHRcdGluc3RhbmNlLkd1ZXN0dXJlcy5kZXN0cm95KCk7XG5cdFx0XHR9XG5cdFx0fSk7XG59KSh3aW5kb3csIGRvY3VtZW50LCBqUXVlcnkpO1xuXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy9cbi8vIFNsaWRlU2hvd1xuLy8gRW5hYmxlcyBzbGlkZXNob3cgZnVuY3Rpb25hbGl0eVxuLy9cbi8vIEV4YW1wbGUgb2YgdXNhZ2U6XG4vLyAkLmZhbmN5Ym94LmdldEluc3RhbmNlKCkuU2xpZGVTaG93LnN0YXJ0KClcbi8vXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuKGZ1bmN0aW9uKGRvY3VtZW50LCAkKSB7XG5cdFwidXNlIHN0cmljdFwiO1xuXG5cdCQuZXh0ZW5kKHRydWUsICQuZmFuY3lib3guZGVmYXVsdHMsIHtcblx0XHRidG5UcGw6IHtcblx0XHRcdHNsaWRlU2hvdzpcblx0XHRcdFx0JzxidXR0b24gZGF0YS1mYW5jeWJveC1wbGF5IGNsYXNzPVwiZmFuY3lib3gtYnV0dG9uIGZhbmN5Ym94LWJ1dHRvbi0tcGxheVwiIHRpdGxlPVwie3tQTEFZX1NUQVJUfX1cIj4nICtcblx0XHRcdFx0JzxzdmcgeG1sbnM9XCJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2Z1wiIHZpZXdCb3g9XCIwIDAgMjQgMjRcIj48cGF0aCBkPVwiTTYuNSA1LjR2MTMuMmwxMS02LjZ6XCIvPjwvc3ZnPicgK1xuXHRcdFx0XHQnPHN2ZyB4bWxucz1cImh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnXCIgdmlld0JveD1cIjAgMCAyNCAyNFwiPjxwYXRoIGQ9XCJNOC4zMyA1Ljc1aDIuMnYxMi41aC0yLjJWNS43NXptNS4xNSAwaDIuMnYxMi41aC0yLjJWNS43NXpcIi8+PC9zdmc+JyArXG5cdFx0XHRcdFwiPC9idXR0b24+XCJcblx0XHR9LFxuXHRcdHNsaWRlU2hvdzoge1xuXHRcdFx0YXV0b1N0YXJ0OiBmYWxzZSxcblx0XHRcdHNwZWVkOiAzMDAwLFxuXHRcdFx0cHJvZ3Jlc3M6IHRydWVcblx0XHR9XG5cdH0pO1xuXG5cdHZhciBTbGlkZVNob3cgPSBmdW5jdGlvbihpbnN0YW5jZSkge1xuXHRcdHRoaXMuaW5zdGFuY2UgPSBpbnN0YW5jZTtcblx0XHR0aGlzLmluaXQoKTtcblx0fTtcblxuXHQkLmV4dGVuZChTbGlkZVNob3cucHJvdG90eXBlLCB7XG5cdFx0dGltZXI6IG51bGwsXG5cdFx0aXNBY3RpdmU6IGZhbHNlLFxuXHRcdCRidXR0b246IG51bGwsXG5cblx0XHRpbml0OiBmdW5jdGlvbigpIHtcblx0XHRcdHZhciBzZWxmID0gdGhpcyxcblx0XHRcdFx0aW5zdGFuY2UgPSBzZWxmLmluc3RhbmNlLFxuXHRcdFx0XHRvcHRzID0gaW5zdGFuY2UuZ3JvdXBbaW5zdGFuY2UuY3VyckluZGV4XS5vcHRzLnNsaWRlU2hvdztcblxuXHRcdFx0c2VsZi4kYnV0dG9uID0gaW5zdGFuY2UuJHJlZnMudG9vbGJhci5maW5kKFwiW2RhdGEtZmFuY3lib3gtcGxheV1cIikub24oXCJjbGlja1wiLCBmdW5jdGlvbigpIHtcblx0XHRcdFx0c2VsZi50b2dnbGUoKTtcblx0XHRcdH0pO1xuXG5cdFx0XHRpZiAoaW5zdGFuY2UuZ3JvdXAubGVuZ3RoIDwgMiB8fCAhb3B0cykge1xuXHRcdFx0XHRzZWxmLiRidXR0b24uaGlkZSgpO1xuXHRcdFx0fSBlbHNlIGlmIChvcHRzLnByb2dyZXNzKSB7XG5cdFx0XHRcdHNlbGYuJHByb2dyZXNzID0gJCgnPGRpdiBjbGFzcz1cImZhbmN5Ym94LXByb2dyZXNzXCI+PC9kaXY+JykuYXBwZW5kVG8oaW5zdGFuY2UuJHJlZnMuaW5uZXIpO1xuXHRcdFx0fVxuXHRcdH0sXG5cblx0XHRzZXQ6IGZ1bmN0aW9uKGZvcmNlKSB7XG5cdFx0XHR2YXIgc2VsZiA9IHRoaXMsXG5cdFx0XHRcdGluc3RhbmNlID0gc2VsZi5pbnN0YW5jZSxcblx0XHRcdFx0Y3VycmVudCA9IGluc3RhbmNlLmN1cnJlbnQ7XG5cblx0XHRcdC8vIENoZWNrIGlmIHJlYWNoZWQgbGFzdCBlbGVtZW50XG5cdFx0XHRpZiAoY3VycmVudCAmJiAoZm9yY2UgPT09IHRydWUgfHwgY3VycmVudC5vcHRzLmxvb3AgfHwgaW5zdGFuY2UuY3VyckluZGV4IDwgaW5zdGFuY2UuZ3JvdXAubGVuZ3RoIC0gMSkpIHtcblx0XHRcdFx0aWYgKHNlbGYuaXNBY3RpdmUgJiYgY3VycmVudC5jb250ZW50VHlwZSAhPT0gXCJ2aWRlb1wiKSB7XG5cdFx0XHRcdFx0aWYgKHNlbGYuJHByb2dyZXNzKSB7XG5cdFx0XHRcdFx0XHQkLmZhbmN5Ym94LmFuaW1hdGUoc2VsZi4kcHJvZ3Jlc3Muc2hvdygpLCB7c2NhbGVYOiAxfSwgY3VycmVudC5vcHRzLnNsaWRlU2hvdy5zcGVlZCk7XG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0c2VsZi50aW1lciA9IHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0XHRpZiAoIWluc3RhbmNlLmN1cnJlbnQub3B0cy5sb29wICYmIGluc3RhbmNlLmN1cnJlbnQuaW5kZXggPT0gaW5zdGFuY2UuZ3JvdXAubGVuZ3RoIC0gMSkge1xuXHRcdFx0XHRcdFx0XHRpbnN0YW5jZS5qdW1wVG8oMCk7XG5cdFx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0XHRpbnN0YW5jZS5uZXh0KCk7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fSwgY3VycmVudC5vcHRzLnNsaWRlU2hvdy5zcGVlZCk7XG5cdFx0XHRcdH1cblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdHNlbGYuc3RvcCgpO1xuXHRcdFx0XHRpbnN0YW5jZS5pZGxlU2Vjb25kc0NvdW50ZXIgPSAwO1xuXHRcdFx0XHRpbnN0YW5jZS5zaG93Q29udHJvbHMoKTtcblx0XHRcdH1cblx0XHR9LFxuXG5cdFx0Y2xlYXI6IGZ1bmN0aW9uKCkge1xuXHRcdFx0dmFyIHNlbGYgPSB0aGlzO1xuXG5cdFx0XHRjbGVhclRpbWVvdXQoc2VsZi50aW1lcik7XG5cblx0XHRcdHNlbGYudGltZXIgPSBudWxsO1xuXG5cdFx0XHRpZiAoc2VsZi4kcHJvZ3Jlc3MpIHtcblx0XHRcdFx0c2VsZi4kcHJvZ3Jlc3MucmVtb3ZlQXR0cihcInN0eWxlXCIpLmhpZGUoKTtcblx0XHRcdH1cblx0XHR9LFxuXG5cdFx0c3RhcnQ6IGZ1bmN0aW9uKCkge1xuXHRcdFx0dmFyIHNlbGYgPSB0aGlzLFxuXHRcdFx0XHRjdXJyZW50ID0gc2VsZi5pbnN0YW5jZS5jdXJyZW50O1xuXG5cdFx0XHRpZiAoY3VycmVudCkge1xuXHRcdFx0XHRzZWxmLiRidXR0b25cblx0XHRcdFx0XHQuYXR0cihcInRpdGxlXCIsIChjdXJyZW50Lm9wdHMuaTE4bltjdXJyZW50Lm9wdHMubGFuZ10gfHwgY3VycmVudC5vcHRzLmkxOG4uZW4pLlBMQVlfU1RPUClcblx0XHRcdFx0XHQucmVtb3ZlQ2xhc3MoXCJmYW5jeWJveC1idXR0b24tLXBsYXlcIilcblx0XHRcdFx0XHQuYWRkQ2xhc3MoXCJmYW5jeWJveC1idXR0b24tLXBhdXNlXCIpO1xuXG5cdFx0XHRcdHNlbGYuaXNBY3RpdmUgPSB0cnVlO1xuXG5cdFx0XHRcdGlmIChjdXJyZW50LmlzQ29tcGxldGUpIHtcblx0XHRcdFx0XHRzZWxmLnNldCh0cnVlKTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdHNlbGYuaW5zdGFuY2UudHJpZ2dlcihcIm9uU2xpZGVTaG93Q2hhbmdlXCIsIHRydWUpO1xuXHRcdFx0fVxuXHRcdH0sXG5cblx0XHRzdG9wOiBmdW5jdGlvbigpIHtcblx0XHRcdHZhciBzZWxmID0gdGhpcyxcblx0XHRcdFx0Y3VycmVudCA9IHNlbGYuaW5zdGFuY2UuY3VycmVudDtcblxuXHRcdFx0c2VsZi5jbGVhcigpO1xuXG5cdFx0XHRzZWxmLiRidXR0b25cblx0XHRcdFx0LmF0dHIoXCJ0aXRsZVwiLCAoY3VycmVudC5vcHRzLmkxOG5bY3VycmVudC5vcHRzLmxhbmddIHx8IGN1cnJlbnQub3B0cy5pMThuLmVuKS5QTEFZX1NUQVJUKVxuXHRcdFx0XHQucmVtb3ZlQ2xhc3MoXCJmYW5jeWJveC1idXR0b24tLXBhdXNlXCIpXG5cdFx0XHRcdC5hZGRDbGFzcyhcImZhbmN5Ym94LWJ1dHRvbi0tcGxheVwiKTtcblxuXHRcdFx0c2VsZi5pc0FjdGl2ZSA9IGZhbHNlO1xuXG5cdFx0XHRzZWxmLmluc3RhbmNlLnRyaWdnZXIoXCJvblNsaWRlU2hvd0NoYW5nZVwiLCBmYWxzZSk7XG5cblx0XHRcdGlmIChzZWxmLiRwcm9ncmVzcykge1xuXHRcdFx0XHRzZWxmLiRwcm9ncmVzcy5yZW1vdmVBdHRyKFwic3R5bGVcIikuaGlkZSgpO1xuXHRcdFx0fVxuXHRcdH0sXG5cblx0XHR0b2dnbGU6IGZ1bmN0aW9uKCkge1xuXHRcdFx0dmFyIHNlbGYgPSB0aGlzO1xuXG5cdFx0XHRpZiAoc2VsZi5pc0FjdGl2ZSkge1xuXHRcdFx0XHRzZWxmLnN0b3AoKTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdHNlbGYuc3RhcnQoKTtcblx0XHRcdH1cblx0XHR9XG5cdH0pO1xuXG5cdCQoZG9jdW1lbnQpLm9uKHtcblx0XHRcIm9uSW5pdC5mYlwiOiBmdW5jdGlvbihlLCBpbnN0YW5jZSkge1xuXHRcdFx0aWYgKGluc3RhbmNlICYmICFpbnN0YW5jZS5TbGlkZVNob3cpIHtcblx0XHRcdFx0aW5zdGFuY2UuU2xpZGVTaG93ID0gbmV3IFNsaWRlU2hvdyhpbnN0YW5jZSk7XG5cdFx0XHR9XG5cdFx0fSxcblxuXHRcdFwiYmVmb3JlU2hvdy5mYlwiOiBmdW5jdGlvbihlLCBpbnN0YW5jZSwgY3VycmVudCwgZmlyc3RSdW4pIHtcblx0XHRcdHZhciBTbGlkZVNob3cgPSBpbnN0YW5jZSAmJiBpbnN0YW5jZS5TbGlkZVNob3c7XG5cblx0XHRcdGlmIChmaXJzdFJ1bikge1xuXHRcdFx0XHRpZiAoU2xpZGVTaG93ICYmIGN1cnJlbnQub3B0cy5zbGlkZVNob3cuYXV0b1N0YXJ0KSB7XG5cdFx0XHRcdFx0U2xpZGVTaG93LnN0YXJ0KCk7XG5cdFx0XHRcdH1cblx0XHRcdH0gZWxzZSBpZiAoU2xpZGVTaG93ICYmIFNsaWRlU2hvdy5pc0FjdGl2ZSkge1xuXHRcdFx0XHRTbGlkZVNob3cuY2xlYXIoKTtcblx0XHRcdH1cblx0XHR9LFxuXG5cdFx0XCJhZnRlclNob3cuZmJcIjogZnVuY3Rpb24oZSwgaW5zdGFuY2UsIGN1cnJlbnQpIHtcblx0XHRcdHZhciBTbGlkZVNob3cgPSBpbnN0YW5jZSAmJiBpbnN0YW5jZS5TbGlkZVNob3c7XG5cblx0XHRcdGlmIChTbGlkZVNob3cgJiYgU2xpZGVTaG93LmlzQWN0aXZlKSB7XG5cdFx0XHRcdFNsaWRlU2hvdy5zZXQoKTtcblx0XHRcdH1cblx0XHR9LFxuXG5cdFx0XCJhZnRlcktleWRvd24uZmJcIjogZnVuY3Rpb24oZSwgaW5zdGFuY2UsIGN1cnJlbnQsIGtleXByZXNzLCBrZXljb2RlKSB7XG5cdFx0XHR2YXIgU2xpZGVTaG93ID0gaW5zdGFuY2UgJiYgaW5zdGFuY2UuU2xpZGVTaG93O1xuXG5cdFx0XHQvLyBcIlBcIiBvciBTcGFjZWJhclxuXHRcdFx0aWYgKFNsaWRlU2hvdyAmJiBjdXJyZW50Lm9wdHMuc2xpZGVTaG93ICYmIChrZXljb2RlID09PSA4MCB8fCBrZXljb2RlID09PSAzMikgJiYgISQoZG9jdW1lbnQuYWN0aXZlRWxlbWVudCkuaXMoXCJidXR0b24sYSxpbnB1dFwiKSkge1xuXHRcdFx0XHRrZXlwcmVzcy5wcmV2ZW50RGVmYXVsdCgpO1xuXG5cdFx0XHRcdFNsaWRlU2hvdy50b2dnbGUoKTtcblx0XHRcdH1cblx0XHR9LFxuXG5cdFx0XCJiZWZvcmVDbG9zZS5mYiBvbkRlYWN0aXZhdGUuZmJcIjogZnVuY3Rpb24oZSwgaW5zdGFuY2UpIHtcblx0XHRcdHZhciBTbGlkZVNob3cgPSBpbnN0YW5jZSAmJiBpbnN0YW5jZS5TbGlkZVNob3c7XG5cblx0XHRcdGlmIChTbGlkZVNob3cpIHtcblx0XHRcdFx0U2xpZGVTaG93LnN0b3AoKTtcblx0XHRcdH1cblx0XHR9XG5cdH0pO1xuXG5cdC8vIFBhZ2UgVmlzaWJpbGl0eSBBUEkgdG8gcGF1c2Ugc2xpZGVzaG93IHdoZW4gd2luZG93IGlzIG5vdCBhY3RpdmVcblx0JChkb2N1bWVudCkub24oXCJ2aXNpYmlsaXR5Y2hhbmdlXCIsIGZ1bmN0aW9uKCkge1xuXHRcdHZhciBpbnN0YW5jZSA9ICQuZmFuY3lib3guZ2V0SW5zdGFuY2UoKSxcblx0XHRcdFNsaWRlU2hvdyA9IGluc3RhbmNlICYmIGluc3RhbmNlLlNsaWRlU2hvdztcblxuXHRcdGlmIChTbGlkZVNob3cgJiYgU2xpZGVTaG93LmlzQWN0aXZlKSB7XG5cdFx0XHRpZiAoZG9jdW1lbnQuaGlkZGVuKSB7XG5cdFx0XHRcdFNsaWRlU2hvdy5jbGVhcigpO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0U2xpZGVTaG93LnNldCgpO1xuXHRcdFx0fVxuXHRcdH1cblx0fSk7XG59KShkb2N1bWVudCwgalF1ZXJ5KTtcblxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vXG4vLyBGdWxsU2NyZWVuXG4vLyBBZGRzIGZ1bGxzY3JlZW4gZnVuY3Rpb25hbGl0eVxuLy9cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4oZnVuY3Rpb24oZG9jdW1lbnQsICQpIHtcblx0XCJ1c2Ugc3RyaWN0XCI7XG5cblx0Ly8gQ29sbGVjdGlvbiBvZiBtZXRob2RzIHN1cHBvcnRlZCBieSB1c2VyIGJyb3dzZXJcblx0dmFyIGZuID0gKGZ1bmN0aW9uKCkge1xuXHRcdHZhciBmbk1hcCA9IFtcblx0XHRcdFtcInJlcXVlc3RGdWxsc2NyZWVuXCIsIFwiZXhpdEZ1bGxzY3JlZW5cIiwgXCJmdWxsc2NyZWVuRWxlbWVudFwiLCBcImZ1bGxzY3JlZW5FbmFibGVkXCIsIFwiZnVsbHNjcmVlbmNoYW5nZVwiLCBcImZ1bGxzY3JlZW5lcnJvclwiXSxcblx0XHRcdC8vIG5ldyBXZWJLaXRcblx0XHRcdFtcblx0XHRcdFx0XCJ3ZWJraXRSZXF1ZXN0RnVsbHNjcmVlblwiLFxuXHRcdFx0XHRcIndlYmtpdEV4aXRGdWxsc2NyZWVuXCIsXG5cdFx0XHRcdFwid2Via2l0RnVsbHNjcmVlbkVsZW1lbnRcIixcblx0XHRcdFx0XCJ3ZWJraXRGdWxsc2NyZWVuRW5hYmxlZFwiLFxuXHRcdFx0XHRcIndlYmtpdGZ1bGxzY3JlZW5jaGFuZ2VcIixcblx0XHRcdFx0XCJ3ZWJraXRmdWxsc2NyZWVuZXJyb3JcIlxuXHRcdFx0XSxcblx0XHRcdC8vIG9sZCBXZWJLaXQgKFNhZmFyaSA1LjEpXG5cdFx0XHRbXG5cdFx0XHRcdFwid2Via2l0UmVxdWVzdEZ1bGxTY3JlZW5cIixcblx0XHRcdFx0XCJ3ZWJraXRDYW5jZWxGdWxsU2NyZWVuXCIsXG5cdFx0XHRcdFwid2Via2l0Q3VycmVudEZ1bGxTY3JlZW5FbGVtZW50XCIsXG5cdFx0XHRcdFwid2Via2l0Q2FuY2VsRnVsbFNjcmVlblwiLFxuXHRcdFx0XHRcIndlYmtpdGZ1bGxzY3JlZW5jaGFuZ2VcIixcblx0XHRcdFx0XCJ3ZWJraXRmdWxsc2NyZWVuZXJyb3JcIlxuXHRcdFx0XSxcblx0XHRcdFtcblx0XHRcdFx0XCJtb3pSZXF1ZXN0RnVsbFNjcmVlblwiLFxuXHRcdFx0XHRcIm1vekNhbmNlbEZ1bGxTY3JlZW5cIixcblx0XHRcdFx0XCJtb3pGdWxsU2NyZWVuRWxlbWVudFwiLFxuXHRcdFx0XHRcIm1vekZ1bGxTY3JlZW5FbmFibGVkXCIsXG5cdFx0XHRcdFwibW96ZnVsbHNjcmVlbmNoYW5nZVwiLFxuXHRcdFx0XHRcIm1vemZ1bGxzY3JlZW5lcnJvclwiXG5cdFx0XHRdLFxuXHRcdFx0W1wibXNSZXF1ZXN0RnVsbHNjcmVlblwiLCBcIm1zRXhpdEZ1bGxzY3JlZW5cIiwgXCJtc0Z1bGxzY3JlZW5FbGVtZW50XCIsIFwibXNGdWxsc2NyZWVuRW5hYmxlZFwiLCBcIk1TRnVsbHNjcmVlbkNoYW5nZVwiLCBcIk1TRnVsbHNjcmVlbkVycm9yXCJdXG5cdFx0XTtcblxuXHRcdHZhciByZXQgPSB7fTtcblxuXHRcdGZvciAodmFyIGkgPSAwOyBpIDwgZm5NYXAubGVuZ3RoOyBpKyspIHtcblx0XHRcdHZhciB2YWwgPSBmbk1hcFtpXTtcblxuXHRcdFx0aWYgKHZhbCAmJiB2YWxbMV0gaW4gZG9jdW1lbnQpIHtcblx0XHRcdFx0Zm9yICh2YXIgaiA9IDA7IGogPCB2YWwubGVuZ3RoOyBqKyspIHtcblx0XHRcdFx0XHRyZXRbZm5NYXBbMF1bal1dID0gdmFsW2pdO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0cmV0dXJuIHJldDtcblx0XHRcdH1cblx0XHR9XG5cblx0XHRyZXR1cm4gZmFsc2U7XG5cdH0pKCk7XG5cblx0aWYgKGZuKSB7XG5cdFx0dmFyIEZ1bGxTY3JlZW4gPSB7XG5cdFx0XHRyZXF1ZXN0OiBmdW5jdGlvbihlbGVtKSB7XG5cdFx0XHRcdGVsZW0gPSBlbGVtIHx8IGRvY3VtZW50LmRvY3VtZW50RWxlbWVudDtcblxuXHRcdFx0XHRlbGVtW2ZuLnJlcXVlc3RGdWxsc2NyZWVuXShlbGVtLkFMTE9XX0tFWUJPQVJEX0lOUFVUKTtcblx0XHRcdH0sXG5cdFx0XHRleGl0OiBmdW5jdGlvbigpIHtcblx0XHRcdFx0ZG9jdW1lbnRbZm4uZXhpdEZ1bGxzY3JlZW5dKCk7XG5cdFx0XHR9LFxuXHRcdFx0dG9nZ2xlOiBmdW5jdGlvbihlbGVtKSB7XG5cdFx0XHRcdGVsZW0gPSBlbGVtIHx8IGRvY3VtZW50LmRvY3VtZW50RWxlbWVudDtcblxuXHRcdFx0XHRpZiAodGhpcy5pc0Z1bGxzY3JlZW4oKSkge1xuXHRcdFx0XHRcdHRoaXMuZXhpdCgpO1xuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdHRoaXMucmVxdWVzdChlbGVtKTtcblx0XHRcdFx0fVxuXHRcdFx0fSxcblx0XHRcdGlzRnVsbHNjcmVlbjogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdHJldHVybiBCb29sZWFuKGRvY3VtZW50W2ZuLmZ1bGxzY3JlZW5FbGVtZW50XSk7XG5cdFx0XHR9LFxuXHRcdFx0ZW5hYmxlZDogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdHJldHVybiBCb29sZWFuKGRvY3VtZW50W2ZuLmZ1bGxzY3JlZW5FbmFibGVkXSk7XG5cdFx0XHR9XG5cdFx0fTtcblxuXHRcdCQuZXh0ZW5kKHRydWUsICQuZmFuY3lib3guZGVmYXVsdHMsIHtcblx0XHRcdGJ0blRwbDoge1xuXHRcdFx0XHRmdWxsU2NyZWVuOlxuXHRcdFx0XHRcdCc8YnV0dG9uIGRhdGEtZmFuY3lib3gtZnVsbHNjcmVlbiBjbGFzcz1cImZhbmN5Ym94LWJ1dHRvbiBmYW5jeWJveC1idXR0b24tLWZzZW50ZXJcIiB0aXRsZT1cInt7RlVMTF9TQ1JFRU59fVwiPicgK1xuXHRcdFx0XHRcdCc8c3ZnIHhtbG5zPVwiaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmdcIiB2aWV3Qm94PVwiMCAwIDI0IDI0XCI+PHBhdGggZD1cIk03IDE0SDV2NWg1di0ySDd2LTN6bS0yLTRoMlY3aDNWNUg1djV6bTEyIDdoLTN2Mmg1di01aC0ydjN6TTE0IDV2MmgzdjNoMlY1aC01elwiLz48L3N2Zz4nICtcblx0XHRcdFx0XHQnPHN2ZyB4bWxucz1cImh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnXCIgdmlld0JveD1cIjAgMCAyNCAyNFwiPjxwYXRoIGQ9XCJNNSAxNmgzdjNoMnYtNUg1em0zLThINXYyaDVWNUg4em02IDExaDJ2LTNoM3YtMmgtNXptMi0xMVY1aC0ydjVoNVY4elwiLz48L3N2Zz4nICtcblx0XHRcdFx0XHRcIjwvYnV0dG9uPlwiXG5cdFx0XHR9LFxuXHRcdFx0ZnVsbFNjcmVlbjoge1xuXHRcdFx0XHRhdXRvU3RhcnQ6IGZhbHNlXG5cdFx0XHR9XG5cdFx0fSk7XG5cblx0XHQkKGRvY3VtZW50KS5vbihmbi5mdWxsc2NyZWVuY2hhbmdlLCBmdW5jdGlvbigpIHtcblx0XHRcdHZhciBpc0Z1bGxzY3JlZW4gPSBGdWxsU2NyZWVuLmlzRnVsbHNjcmVlbigpLFxuXHRcdFx0XHRpbnN0YW5jZSA9ICQuZmFuY3lib3guZ2V0SW5zdGFuY2UoKTtcblxuXHRcdFx0aWYgKGluc3RhbmNlKSB7XG5cdFx0XHRcdC8vIElmIGltYWdlIGlzIHpvb21pbmcsIHRoZW4gZm9yY2UgdG8gc3RvcCBhbmQgcmVwb3NpdGlvbiBwcm9wZXJseVxuXHRcdFx0XHRpZiAoaW5zdGFuY2UuY3VycmVudCAmJiBpbnN0YW5jZS5jdXJyZW50LnR5cGUgPT09IFwiaW1hZ2VcIiAmJiBpbnN0YW5jZS5pc0FuaW1hdGluZykge1xuXHRcdFx0XHRcdGluc3RhbmNlLmN1cnJlbnQuJGNvbnRlbnQuY3NzKFwidHJhbnNpdGlvblwiLCBcIm5vbmVcIik7XG5cblx0XHRcdFx0XHRpbnN0YW5jZS5pc0FuaW1hdGluZyA9IGZhbHNlO1xuXG5cdFx0XHRcdFx0aW5zdGFuY2UudXBkYXRlKHRydWUsIHRydWUsIDApO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0aW5zdGFuY2UudHJpZ2dlcihcIm9uRnVsbHNjcmVlbkNoYW5nZVwiLCBpc0Z1bGxzY3JlZW4pO1xuXG5cdFx0XHRcdGluc3RhbmNlLiRyZWZzLmNvbnRhaW5lci50b2dnbGVDbGFzcyhcImZhbmN5Ym94LWlzLWZ1bGxzY3JlZW5cIiwgaXNGdWxsc2NyZWVuKTtcblxuXHRcdFx0XHRpbnN0YW5jZS4kcmVmcy50b29sYmFyXG5cdFx0XHRcdFx0LmZpbmQoXCJbZGF0YS1mYW5jeWJveC1mdWxsc2NyZWVuXVwiKVxuXHRcdFx0XHRcdC50b2dnbGVDbGFzcyhcImZhbmN5Ym94LWJ1dHRvbi0tZnNlbnRlclwiLCAhaXNGdWxsc2NyZWVuKVxuXHRcdFx0XHRcdC50b2dnbGVDbGFzcyhcImZhbmN5Ym94LWJ1dHRvbi0tZnNleGl0XCIsIGlzRnVsbHNjcmVlbik7XG5cdFx0XHR9XG5cdFx0fSk7XG5cdH1cblxuXHQkKGRvY3VtZW50KS5vbih7XG5cdFx0XCJvbkluaXQuZmJcIjogZnVuY3Rpb24oZSwgaW5zdGFuY2UpIHtcblx0XHRcdHZhciAkY29udGFpbmVyO1xuXG5cdFx0XHRpZiAoIWZuKSB7XG5cdFx0XHRcdGluc3RhbmNlLiRyZWZzLnRvb2xiYXIuZmluZChcIltkYXRhLWZhbmN5Ym94LWZ1bGxzY3JlZW5dXCIpLnJlbW92ZSgpO1xuXG5cdFx0XHRcdHJldHVybjtcblx0XHRcdH1cblxuXHRcdFx0aWYgKGluc3RhbmNlICYmIGluc3RhbmNlLmdyb3VwW2luc3RhbmNlLmN1cnJJbmRleF0ub3B0cy5mdWxsU2NyZWVuKSB7XG5cdFx0XHRcdCRjb250YWluZXIgPSBpbnN0YW5jZS4kcmVmcy5jb250YWluZXI7XG5cblx0XHRcdFx0JGNvbnRhaW5lci5vbihcImNsaWNrLmZiLWZ1bGxzY3JlZW5cIiwgXCJbZGF0YS1mYW5jeWJveC1mdWxsc2NyZWVuXVwiLCBmdW5jdGlvbihlKSB7XG5cdFx0XHRcdFx0ZS5zdG9wUHJvcGFnYXRpb24oKTtcblx0XHRcdFx0XHRlLnByZXZlbnREZWZhdWx0KCk7XG5cblx0XHRcdFx0XHRGdWxsU2NyZWVuLnRvZ2dsZSgpO1xuXHRcdFx0XHR9KTtcblxuXHRcdFx0XHRpZiAoaW5zdGFuY2Uub3B0cy5mdWxsU2NyZWVuICYmIGluc3RhbmNlLm9wdHMuZnVsbFNjcmVlbi5hdXRvU3RhcnQgPT09IHRydWUpIHtcblx0XHRcdFx0XHRGdWxsU2NyZWVuLnJlcXVlc3QoKTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdC8vIEV4cG9zZSBBUElcblx0XHRcdFx0aW5zdGFuY2UuRnVsbFNjcmVlbiA9IEZ1bGxTY3JlZW47XG5cdFx0XHR9IGVsc2UgaWYgKGluc3RhbmNlKSB7XG5cdFx0XHRcdGluc3RhbmNlLiRyZWZzLnRvb2xiYXIuZmluZChcIltkYXRhLWZhbmN5Ym94LWZ1bGxzY3JlZW5dXCIpLmhpZGUoKTtcblx0XHRcdH1cblx0XHR9LFxuXG5cdFx0XCJhZnRlcktleWRvd24uZmJcIjogZnVuY3Rpb24oZSwgaW5zdGFuY2UsIGN1cnJlbnQsIGtleXByZXNzLCBrZXljb2RlKSB7XG5cdFx0XHQvLyBcIkZcIlxuXHRcdFx0aWYgKGluc3RhbmNlICYmIGluc3RhbmNlLkZ1bGxTY3JlZW4gJiYga2V5Y29kZSA9PT0gNzApIHtcblx0XHRcdFx0a2V5cHJlc3MucHJldmVudERlZmF1bHQoKTtcblxuXHRcdFx0XHRpbnN0YW5jZS5GdWxsU2NyZWVuLnRvZ2dsZSgpO1xuXHRcdFx0fVxuXHRcdH0sXG5cblx0XHRcImJlZm9yZUNsb3NlLmZiXCI6IGZ1bmN0aW9uKGUsIGluc3RhbmNlKSB7XG5cdFx0XHRpZiAoaW5zdGFuY2UgJiYgaW5zdGFuY2UuRnVsbFNjcmVlbiAmJiBpbnN0YW5jZS4kcmVmcy5jb250YWluZXIuaGFzQ2xhc3MoXCJmYW5jeWJveC1pcy1mdWxsc2NyZWVuXCIpKSB7XG5cdFx0XHRcdEZ1bGxTY3JlZW4uZXhpdCgpO1xuXHRcdFx0fVxuXHRcdH1cblx0fSk7XG59KShkb2N1bWVudCwgalF1ZXJ5KTtcblxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vXG4vLyBUaHVtYnNcbi8vIERpc3BsYXlzIHRodW1ibmFpbHMgaW4gYSBncmlkXG4vL1xuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbihmdW5jdGlvbihkb2N1bWVudCwgJCkge1xuXHRcInVzZSBzdHJpY3RcIjtcblxuXHR2YXIgQ0xBU1MgPSBcImZhbmN5Ym94LXRodW1ic1wiLFxuXHRcdENMQVNTX0FDVElWRSA9IENMQVNTICsgXCItYWN0aXZlXCI7XG5cblx0Ly8gTWFrZSBzdXJlIHRoZXJlIGFyZSBkZWZhdWx0IHZhbHVlc1xuXHQkLmZhbmN5Ym94LmRlZmF1bHRzID0gJC5leHRlbmQoXG5cdFx0dHJ1ZSxcblx0XHR7XG5cdFx0XHRidG5UcGw6IHtcblx0XHRcdFx0dGh1bWJzOlxuXHRcdFx0XHRcdCc8YnV0dG9uIGRhdGEtZmFuY3lib3gtdGh1bWJzIGNsYXNzPVwiZmFuY3lib3gtYnV0dG9uIGZhbmN5Ym94LWJ1dHRvbi0tdGh1bWJzXCIgdGl0bGU9XCJ7e1RIVU1CU319XCI+JyArXG5cdFx0XHRcdFx0JzxzdmcgeG1sbnM9XCJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2Z1wiIHZpZXdCb3g9XCIwIDAgMjQgMjRcIj48cGF0aCBkPVwiTTE0LjU5IDE0LjU5aDMuNzZ2My43NmgtMy43NnYtMy43NnptLTQuNDcgMGgzLjc2djMuNzZoLTMuNzZ2LTMuNzZ6bS00LjQ3IDBoMy43NnYzLjc2SDUuNjV2LTMuNzZ6bTguOTQtNC40N2gzLjc2djMuNzZoLTMuNzZ2LTMuNzZ6bS00LjQ3IDBoMy43NnYzLjc2aC0zLjc2di0zLjc2em0tNC40NyAwaDMuNzZ2My43Nkg1LjY1di0zLjc2em04Ljk0LTQuNDdoMy43NnYzLjc2aC0zLjc2VjUuNjV6bS00LjQ3IDBoMy43NnYzLjc2aC0zLjc2VjUuNjV6bS00LjQ3IDBoMy43NnYzLjc2SDUuNjVWNS42NXpcIi8+PC9zdmc+JyArXG5cdFx0XHRcdFx0XCI8L2J1dHRvbj5cIlxuXHRcdFx0fSxcblx0XHRcdHRodW1iczoge1xuXHRcdFx0XHRhdXRvU3RhcnQ6IGZhbHNlLCAvLyBEaXNwbGF5IHRodW1ibmFpbHMgb24gb3BlbmluZ1xuXHRcdFx0XHRoaWRlT25DbG9zZTogdHJ1ZSwgLy8gSGlkZSB0aHVtYm5haWwgZ3JpZCB3aGVuIGNsb3NpbmcgYW5pbWF0aW9uIHN0YXJ0c1xuXHRcdFx0XHRwYXJlbnRFbDogXCIuZmFuY3lib3gtY29udGFpbmVyXCIsIC8vIENvbnRhaW5lciBpcyBpbmplY3RlZCBpbnRvIHRoaXMgZWxlbWVudFxuXHRcdFx0XHRheGlzOiBcInlcIiAvLyBWZXJ0aWNhbCAoeSkgb3IgaG9yaXpvbnRhbCAoeCkgc2Nyb2xsaW5nXG5cdFx0XHR9XG5cdFx0fSxcblx0XHQkLmZhbmN5Ym94LmRlZmF1bHRzXG5cdCk7XG5cblx0dmFyIEZhbmN5VGh1bWJzID0gZnVuY3Rpb24oaW5zdGFuY2UpIHtcblx0XHR0aGlzLmluaXQoaW5zdGFuY2UpO1xuXHR9O1xuXG5cdCQuZXh0ZW5kKEZhbmN5VGh1bWJzLnByb3RvdHlwZSwge1xuXHRcdCRidXR0b246IG51bGwsXG5cdFx0JGdyaWQ6IG51bGwsXG5cdFx0JGxpc3Q6IG51bGwsXG5cdFx0aXNWaXNpYmxlOiBmYWxzZSxcblx0XHRpc0FjdGl2ZTogZmFsc2UsXG5cblx0XHRpbml0OiBmdW5jdGlvbihpbnN0YW5jZSkge1xuXHRcdFx0dmFyIHNlbGYgPSB0aGlzLFxuXHRcdFx0XHRncm91cCA9IGluc3RhbmNlLmdyb3VwLFxuXHRcdFx0XHRlbmFibGVkID0gMDtcblxuXHRcdFx0c2VsZi5pbnN0YW5jZSA9IGluc3RhbmNlO1xuXHRcdFx0c2VsZi5vcHRzID0gZ3JvdXBbaW5zdGFuY2UuY3VyckluZGV4XS5vcHRzLnRodW1icztcblxuXHRcdFx0aW5zdGFuY2UuVGh1bWJzID0gc2VsZjtcblxuXHRcdFx0c2VsZi4kYnV0dG9uID0gaW5zdGFuY2UuJHJlZnMudG9vbGJhci5maW5kKFwiW2RhdGEtZmFuY3lib3gtdGh1bWJzXVwiKTtcblxuXHRcdFx0Ly8gRW5hYmxlIHRodW1icyBpZiBhdCBsZWFzdCB0d28gZ3JvdXAgaXRlbXMgaGF2ZSB0aHVtYm5haWxzXG5cdFx0XHRmb3IgKHZhciBpID0gMCwgbGVuID0gZ3JvdXAubGVuZ3RoOyBpIDwgbGVuOyBpKyspIHtcblx0XHRcdFx0aWYgKGdyb3VwW2ldLnRodW1iKSB7XG5cdFx0XHRcdFx0ZW5hYmxlZCsrO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0aWYgKGVuYWJsZWQgPiAxKSB7XG5cdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdH1cblx0XHRcdH1cblxuXHRcdFx0aWYgKGVuYWJsZWQgPiAxICYmICEhc2VsZi5vcHRzKSB7XG5cdFx0XHRcdHNlbGYuJGJ1dHRvbi5yZW1vdmVBdHRyKFwic3R5bGVcIikub24oXCJjbGlja1wiLCBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRzZWxmLnRvZ2dsZSgpO1xuXHRcdFx0XHR9KTtcblxuXHRcdFx0XHRzZWxmLmlzQWN0aXZlID0gdHJ1ZTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdHNlbGYuJGJ1dHRvbi5oaWRlKCk7XG5cdFx0XHR9XG5cdFx0fSxcblxuXHRcdGNyZWF0ZTogZnVuY3Rpb24oKSB7XG5cdFx0XHR2YXIgc2VsZiA9IHRoaXMsXG5cdFx0XHRcdGluc3RhbmNlID0gc2VsZi5pbnN0YW5jZSxcblx0XHRcdFx0cGFyZW50RWwgPSBzZWxmLm9wdHMucGFyZW50RWwsXG5cdFx0XHRcdGxpc3QgPSBbXSxcblx0XHRcdFx0c3JjO1xuXG5cdFx0XHRpZiAoIXNlbGYuJGdyaWQpIHtcblx0XHRcdFx0Ly8gQ3JlYXRlIG1haW4gZWxlbWVudFxuXHRcdFx0XHRzZWxmLiRncmlkID0gJCgnPGRpdiBjbGFzcz1cIicgKyBDTEFTUyArIFwiIFwiICsgQ0xBU1MgKyBcIi1cIiArIHNlbGYub3B0cy5heGlzICsgJ1wiPjwvZGl2PicpLmFwcGVuZFRvKFxuXHRcdFx0XHRcdGluc3RhbmNlLiRyZWZzLmNvbnRhaW5lclxuXHRcdFx0XHRcdFx0LmZpbmQocGFyZW50RWwpXG5cdFx0XHRcdFx0XHQuYWRkQmFjaygpXG5cdFx0XHRcdFx0XHQuZmlsdGVyKHBhcmVudEVsKVxuXHRcdFx0XHQpO1xuXG5cdFx0XHRcdC8vIEFkZCBcImNsaWNrXCIgZXZlbnQgdGhhdCBwZXJmb3JtcyBnYWxsZXJ5IG5hdmlnYXRpb25cblx0XHRcdFx0c2VsZi4kZ3JpZC5vbihcImNsaWNrXCIsIFwiYVwiLCBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRpbnN0YW5jZS5qdW1wVG8oJCh0aGlzKS5hdHRyKFwiZGF0YS1pbmRleFwiKSk7XG5cdFx0XHRcdH0pO1xuXHRcdFx0fVxuXG5cdFx0XHQvLyBCdWlsZCB0aGUgbGlzdFxuXHRcdFx0aWYgKCFzZWxmLiRsaXN0KSB7XG5cdFx0XHRcdHNlbGYuJGxpc3QgPSAkKCc8ZGl2IGNsYXNzPVwiJyArIENMQVNTICsgJ19fbGlzdFwiPicpLmFwcGVuZFRvKHNlbGYuJGdyaWQpO1xuXHRcdFx0fVxuXG5cdFx0XHQkLmVhY2goaW5zdGFuY2UuZ3JvdXAsIGZ1bmN0aW9uKGksIGl0ZW0pIHtcblx0XHRcdFx0c3JjID0gaXRlbS50aHVtYjtcblxuXHRcdFx0XHRpZiAoIXNyYyAmJiBpdGVtLnR5cGUgPT09IFwiaW1hZ2VcIikge1xuXHRcdFx0XHRcdHNyYyA9IGl0ZW0uc3JjO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0bGlzdC5wdXNoKFxuXHRcdFx0XHRcdCc8YSBocmVmPVwiamF2YXNjcmlwdDo7XCIgdGFiaW5kZXg9XCIwXCIgZGF0YS1pbmRleD1cIicgK1xuXHRcdFx0XHRcdGkgK1xuXHRcdFx0XHRcdCdcIicgK1xuXHRcdFx0XHRcdChzcmMgJiYgc3JjLmxlbmd0aCA/ICcgc3R5bGU9XCJiYWNrZ3JvdW5kLWltYWdlOnVybCgnICsgc3JjICsgJylcIicgOiAnY2xhc3M9XCJmYW5jeWJveC10aHVtYnMtbWlzc2luZ1wiJykgK1xuXHRcdFx0XHRcdFwiPjwvYT5cIlxuXHRcdFx0XHQpO1xuXHRcdFx0fSk7XG5cblx0XHRcdHNlbGYuJGxpc3RbMF0uaW5uZXJIVE1MID0gbGlzdC5qb2luKFwiXCIpO1xuXG5cdFx0XHRpZiAoc2VsZi5vcHRzLmF4aXMgPT09IFwieFwiKSB7XG5cdFx0XHRcdC8vIFNldCBmaXhlZCB3aWR0aCBmb3IgbGlzdCBlbGVtZW50IHRvIGVuYWJsZSBob3Jpem9udGFsIHNjcm9sbGluZ1xuXHRcdFx0XHRzZWxmLiRsaXN0LndpZHRoKFxuXHRcdFx0XHRcdHBhcnNlSW50KHNlbGYuJGdyaWQuY3NzKFwicGFkZGluZy1yaWdodFwiKSwgMTApICtcblx0XHRcdFx0XHRpbnN0YW5jZS5ncm91cC5sZW5ndGggKlxuXHRcdFx0XHRcdHNlbGYuJGxpc3Rcblx0XHRcdFx0XHRcdC5jaGlsZHJlbigpXG5cdFx0XHRcdFx0XHQuZXEoMClcblx0XHRcdFx0XHRcdC5vdXRlcldpZHRoKHRydWUpXG5cdFx0XHRcdCk7XG5cdFx0XHR9XG5cdFx0fSxcblxuXHRcdGZvY3VzOiBmdW5jdGlvbihkdXJhdGlvbikge1xuXHRcdFx0dmFyIHNlbGYgPSB0aGlzLFxuXHRcdFx0XHQkbGlzdCA9IHNlbGYuJGxpc3QsXG5cdFx0XHRcdCRncmlkID0gc2VsZi4kZ3JpZCxcblx0XHRcdFx0dGh1bWIsXG5cdFx0XHRcdHRodW1iUG9zO1xuXG5cdFx0XHRpZiAoIXNlbGYuaW5zdGFuY2UuY3VycmVudCkge1xuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR9XG5cblx0XHRcdHRodW1iID0gJGxpc3Rcblx0XHRcdFx0LmNoaWxkcmVuKClcblx0XHRcdFx0LnJlbW92ZUNsYXNzKENMQVNTX0FDVElWRSlcblx0XHRcdFx0LmZpbHRlcignW2RhdGEtaW5kZXg9XCInICsgc2VsZi5pbnN0YW5jZS5jdXJyZW50LmluZGV4ICsgJ1wiXScpXG5cdFx0XHRcdC5hZGRDbGFzcyhDTEFTU19BQ1RJVkUpO1xuXG5cdFx0XHR0aHVtYlBvcyA9IHRodW1iLnBvc2l0aW9uKCk7XG5cblx0XHRcdC8vIENoZWNrIGlmIG5lZWQgdG8gc2Nyb2xsIHRvIG1ha2UgY3VycmVudCB0aHVtYiB2aXNpYmxlXG5cdFx0XHRpZiAoc2VsZi5vcHRzLmF4aXMgPT09IFwieVwiICYmICh0aHVtYlBvcy50b3AgPCAwIHx8IHRodW1iUG9zLnRvcCA+ICRsaXN0LmhlaWdodCgpIC0gdGh1bWIub3V0ZXJIZWlnaHQoKSkpIHtcblx0XHRcdFx0JGxpc3Quc3RvcCgpLmFuaW1hdGUoXG5cdFx0XHRcdFx0e1xuXHRcdFx0XHRcdFx0c2Nyb2xsVG9wOiAkbGlzdC5zY3JvbGxUb3AoKSArIHRodW1iUG9zLnRvcFxuXHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0ZHVyYXRpb25cblx0XHRcdFx0KTtcblx0XHRcdH0gZWxzZSBpZiAoXG5cdFx0XHRcdHNlbGYub3B0cy5heGlzID09PSBcInhcIiAmJlxuXHRcdFx0XHQodGh1bWJQb3MubGVmdCA8ICRncmlkLnNjcm9sbExlZnQoKSB8fCB0aHVtYlBvcy5sZWZ0ID4gJGdyaWQuc2Nyb2xsTGVmdCgpICsgKCRncmlkLndpZHRoKCkgLSB0aHVtYi5vdXRlcldpZHRoKCkpKVxuXHRcdFx0KSB7XG5cdFx0XHRcdCRsaXN0XG5cdFx0XHRcdFx0LnBhcmVudCgpXG5cdFx0XHRcdFx0LnN0b3AoKVxuXHRcdFx0XHRcdC5hbmltYXRlKFxuXHRcdFx0XHRcdFx0e1xuXHRcdFx0XHRcdFx0XHRzY3JvbGxMZWZ0OiB0aHVtYlBvcy5sZWZ0XG5cdFx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdFx0ZHVyYXRpb25cblx0XHRcdFx0XHQpO1xuXHRcdFx0fVxuXHRcdH0sXG5cblx0XHR1cGRhdGU6IGZ1bmN0aW9uKCkge1xuXHRcdFx0dmFyIHRoYXQgPSB0aGlzO1xuXHRcdFx0dGhhdC5pbnN0YW5jZS4kcmVmcy5jb250YWluZXIudG9nZ2xlQ2xhc3MoXCJmYW5jeWJveC1zaG93LXRodW1ic1wiLCB0aGlzLmlzVmlzaWJsZSk7XG5cblx0XHRcdGlmICh0aGF0LmlzVmlzaWJsZSkge1xuXHRcdFx0XHRpZiAoIXRoYXQuJGdyaWQpIHtcblx0XHRcdFx0XHR0aGF0LmNyZWF0ZSgpO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0dGhhdC5pbnN0YW5jZS50cmlnZ2VyKFwib25UaHVtYnNTaG93XCIpO1xuXG5cdFx0XHRcdHRoYXQuZm9jdXMoMCk7XG5cdFx0XHR9IGVsc2UgaWYgKHRoYXQuJGdyaWQpIHtcblx0XHRcdFx0dGhhdC5pbnN0YW5jZS50cmlnZ2VyKFwib25UaHVtYnNIaWRlXCIpO1xuXHRcdFx0fVxuXG5cdFx0XHQvLyBVcGRhdGUgY29udGVudCBwb3NpdGlvblxuXHRcdFx0dGhhdC5pbnN0YW5jZS51cGRhdGUoKTtcblx0XHR9LFxuXG5cdFx0aGlkZTogZnVuY3Rpb24oKSB7XG5cdFx0XHR0aGlzLmlzVmlzaWJsZSA9IGZhbHNlO1xuXHRcdFx0dGhpcy51cGRhdGUoKTtcblx0XHR9LFxuXG5cdFx0c2hvdzogZnVuY3Rpb24oKSB7XG5cdFx0XHR0aGlzLmlzVmlzaWJsZSA9IHRydWU7XG5cdFx0XHR0aGlzLnVwZGF0ZSgpO1xuXHRcdH0sXG5cblx0XHR0b2dnbGU6IGZ1bmN0aW9uKCkge1xuXHRcdFx0dGhpcy5pc1Zpc2libGUgPSAhdGhpcy5pc1Zpc2libGU7XG5cdFx0XHR0aGlzLnVwZGF0ZSgpO1xuXHRcdH1cblx0fSk7XG5cblx0JChkb2N1bWVudCkub24oe1xuXHRcdFwib25Jbml0LmZiXCI6IGZ1bmN0aW9uKGUsIGluc3RhbmNlKSB7XG5cdFx0XHR2YXIgVGh1bWJzO1xuXG5cdFx0XHRpZiAoaW5zdGFuY2UgJiYgIWluc3RhbmNlLlRodW1icykge1xuXHRcdFx0XHRUaHVtYnMgPSBuZXcgRmFuY3lUaHVtYnMoaW5zdGFuY2UpO1xuXG5cdFx0XHRcdGlmIChUaHVtYnMuaXNBY3RpdmUgJiYgVGh1bWJzLm9wdHMuYXV0b1N0YXJ0ID09PSB0cnVlKSB7XG5cdFx0XHRcdFx0VGh1bWJzLnNob3coKTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH0sXG5cblx0XHRcImJlZm9yZVNob3cuZmJcIjogZnVuY3Rpb24oZSwgaW5zdGFuY2UsIGl0ZW0sIGZpcnN0UnVuKSB7XG5cdFx0XHR2YXIgVGh1bWJzID0gaW5zdGFuY2UgJiYgaW5zdGFuY2UuVGh1bWJzO1xuXG5cdFx0XHRpZiAoVGh1bWJzICYmIFRodW1icy5pc1Zpc2libGUpIHtcblx0XHRcdFx0VGh1bWJzLmZvY3VzKGZpcnN0UnVuID8gMCA6IDI1MCk7XG5cdFx0XHR9XG5cdFx0fSxcblxuXHRcdFwiYWZ0ZXJLZXlkb3duLmZiXCI6IGZ1bmN0aW9uKGUsIGluc3RhbmNlLCBjdXJyZW50LCBrZXlwcmVzcywga2V5Y29kZSkge1xuXHRcdFx0dmFyIFRodW1icyA9IGluc3RhbmNlICYmIGluc3RhbmNlLlRodW1icztcblxuXHRcdFx0Ly8gXCJHXCJcblx0XHRcdGlmIChUaHVtYnMgJiYgVGh1bWJzLmlzQWN0aXZlICYmIGtleWNvZGUgPT09IDcxKSB7XG5cdFx0XHRcdGtleXByZXNzLnByZXZlbnREZWZhdWx0KCk7XG5cblx0XHRcdFx0VGh1bWJzLnRvZ2dsZSgpO1xuXHRcdFx0fVxuXHRcdH0sXG5cblx0XHRcImJlZm9yZUNsb3NlLmZiXCI6IGZ1bmN0aW9uKGUsIGluc3RhbmNlKSB7XG5cdFx0XHR2YXIgVGh1bWJzID0gaW5zdGFuY2UgJiYgaW5zdGFuY2UuVGh1bWJzO1xuXG5cdFx0XHRpZiAoVGh1bWJzICYmIFRodW1icy5pc1Zpc2libGUgJiYgVGh1bWJzLm9wdHMuaGlkZU9uQ2xvc2UgIT09IGZhbHNlKSB7XG5cdFx0XHRcdFRodW1icy4kZ3JpZC5oaWRlKCk7XG5cdFx0XHR9XG5cdFx0fVxuXHR9KTtcbn0pKGRvY3VtZW50LCBqUXVlcnkpO1xuXG4vLy8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vL1xuLy8gU2hhcmVcbi8vIERpc3BsYXlzIHNpbXBsZSBmb3JtIGZvciBzaGFyaW5nIGN1cnJlbnQgdXJsXG4vL1xuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbihmdW5jdGlvbihkb2N1bWVudCwgJCkge1xuXHRcInVzZSBzdHJpY3RcIjtcblxuXHQkLmV4dGVuZCh0cnVlLCAkLmZhbmN5Ym94LmRlZmF1bHRzLCB7XG5cdFx0YnRuVHBsOiB7XG5cdFx0XHRzaGFyZTpcblx0XHRcdFx0JzxidXR0b24gZGF0YS1mYW5jeWJveC1zaGFyZSBjbGFzcz1cImZhbmN5Ym94LWJ1dHRvbiBmYW5jeWJveC1idXR0b24tLXNoYXJlXCIgdGl0bGU9XCJ7e1NIQVJFfX1cIj4nICtcblx0XHRcdFx0JzxzdmcgeG1sbnM9XCJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2Z1wiIHZpZXdCb3g9XCIwIDAgMjQgMjRcIj48cGF0aCBkPVwiTTIuNTUgMTljMS40LTguNCA5LjEtOS44IDExLjktOS44VjVsNyA3LTcgNi4zdi0zLjVjLTIuOCAwLTEwLjUgMi4xLTExLjkgNC4yelwiLz48L3N2Zz4nICtcblx0XHRcdFx0XCI8L2J1dHRvbj5cIlxuXHRcdH0sXG5cdFx0c2hhcmU6IHtcblx0XHRcdHVybDogZnVuY3Rpb24oaW5zdGFuY2UsIGl0ZW0pIHtcblx0XHRcdFx0cmV0dXJuIChcblx0XHRcdFx0XHQoIWluc3RhbmNlLmN1cnJlbnRIYXNoICYmICEoaXRlbS50eXBlID09PSBcImlubGluZVwiIHx8IGl0ZW0udHlwZSA9PT0gXCJodG1sXCIpID8gaXRlbS5vcmlnU3JjIHx8IGl0ZW0uc3JjIDogZmFsc2UpIHx8IHdpbmRvdy5sb2NhdGlvblxuXHRcdFx0XHQpO1xuXHRcdFx0fSxcblx0XHRcdHRwbDpcblx0XHRcdFx0JzxkaXYgY2xhc3M9XCJmYW5jeWJveC1zaGFyZVwiPicgK1xuXHRcdFx0XHRcIjxoMT57e1NIQVJFfX08L2gxPlwiICtcblx0XHRcdFx0XCI8cD5cIiArXG5cdFx0XHRcdCc8YSBjbGFzcz1cImZhbmN5Ym94LXNoYXJlX19idXR0b24gZmFuY3lib3gtc2hhcmVfX2J1dHRvbi0tZmJcIiBocmVmPVwiaHR0cHM6Ly93d3cuZmFjZWJvb2suY29tL3NoYXJlci9zaGFyZXIucGhwP3U9e3t1cmx9fVwiPicgK1xuXHRcdFx0XHQnPHN2ZyB2aWV3Qm94PVwiMCAwIDUxMiA1MTJcIiB4bWxucz1cImh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnXCI+PHBhdGggZD1cIm0yODcgNDU2di0yOTljMC0yMSA2LTM1IDM1LTM1aDM4di02M2MtNy0xLTI5LTMtNTUtMy01NCAwLTkxIDMzLTkxIDk0djMwNm0xNDMtMjU0aC0yMDV2NzJoMTk2XCIgLz48L3N2Zz4nICtcblx0XHRcdFx0XCI8c3Bhbj5GYWNlYm9vazwvc3Bhbj5cIiArXG5cdFx0XHRcdFwiPC9hPlwiICtcblx0XHRcdFx0JzxhIGNsYXNzPVwiZmFuY3lib3gtc2hhcmVfX2J1dHRvbiBmYW5jeWJveC1zaGFyZV9fYnV0dG9uLS10d1wiIGhyZWY9XCJodHRwczovL3R3aXR0ZXIuY29tL2ludGVudC90d2VldD91cmw9e3t1cmx9fSZ0ZXh0PXt7ZGVzY3J9fVwiPicgK1xuXHRcdFx0XHQnPHN2ZyB2aWV3Qm94PVwiMCAwIDUxMiA1MTJcIiB4bWxucz1cImh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnXCI+PHBhdGggZD1cIm00NTYgMTMzYy0xNCA3LTMxIDExLTQ3IDEzIDE3LTEwIDMwLTI3IDM3LTQ2LTE1IDEwLTM0IDE2LTUyIDIwLTYxLTYyLTE1Ny03LTE0MSA3NS02OC0zLTEyOS0zNS0xNjktODUtMjIgMzctMTEgODYgMjYgMTA5LTEzIDAtMjYtNC0zNy05IDAgMzkgMjggNzIgNjUgODAtMTIgMy0yNSA0LTM3IDIgMTAgMzMgNDEgNTcgNzcgNTctNDIgMzAtNzcgMzgtMTIyIDM0IDE3MCAxMTEgMzc4LTMyIDM1OS0yMDggMTYtMTEgMzAtMjUgNDEtNDJ6XCIgLz48L3N2Zz4nICtcblx0XHRcdFx0XCI8c3Bhbj5Ud2l0dGVyPC9zcGFuPlwiICtcblx0XHRcdFx0XCI8L2E+XCIgK1xuXHRcdFx0XHQnPGEgY2xhc3M9XCJmYW5jeWJveC1zaGFyZV9fYnV0dG9uIGZhbmN5Ym94LXNoYXJlX19idXR0b24tLXB0XCIgaHJlZj1cImh0dHBzOi8vd3d3LnBpbnRlcmVzdC5jb20vcGluL2NyZWF0ZS9idXR0b24vP3VybD17e3VybH19JmRlc2NyaXB0aW9uPXt7ZGVzY3J9fSZtZWRpYT17e21lZGlhfX1cIj4nICtcblx0XHRcdFx0Jzxzdmcgdmlld0JveD1cIjAgMCA1MTIgNTEyXCIgeG1sbnM9XCJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2Z1wiPjxwYXRoIGQ9XCJtMjY1IDU2Yy0xMDkgMC0xNjQgNzgtMTY0IDE0NCAwIDM5IDE1IDc0IDQ3IDg3IDUgMiAxMCAwIDEyLTVsNC0xOWMyLTYgMS04LTMtMTMtOS0xMS0xNS0yNS0xNS00NSAwLTU4IDQzLTExMCAxMTMtMTEwIDYyIDAgOTYgMzggOTYgODggMCA2Ny0zMCAxMjItNzMgMTIyLTI0IDAtNDItMTktMzYtNDQgNi0yOSAyMC02MCAyMC04MSAwLTE5LTEwLTM1LTMxLTM1LTI1IDAtNDQgMjYtNDQgNjAgMCAyMSA3IDM2IDcgMzZsLTMwIDEyNWMtOCAzNy0xIDgzIDAgODcgMCAzIDQgNCA1IDIgMi0zIDMyLTM5IDQyLTc1bDE2LTY0YzggMTYgMzEgMjkgNTYgMjkgNzQgMCAxMjQtNjcgMTI0LTE1NyAwLTY5LTU4LTEzMi0xNDYtMTMyelwiIGZpbGw9XCIjZmZmXCIvPjwvc3ZnPicgK1xuXHRcdFx0XHRcIjxzcGFuPlBpbnRlcmVzdDwvc3Bhbj5cIiArXG5cdFx0XHRcdFwiPC9hPlwiICtcblx0XHRcdFx0XCI8L3A+XCIgK1xuXHRcdFx0XHQnPHA+PGlucHV0IGNsYXNzPVwiZmFuY3lib3gtc2hhcmVfX2lucHV0XCIgdHlwZT1cInRleHRcIiB2YWx1ZT1cInt7dXJsX3Jhd319XCIgb25jbGljaz1cInNlbGVjdCgpXCIgLz48L3A+JyArXG5cdFx0XHRcdFwiPC9kaXY+XCJcblx0XHR9XG5cdH0pO1xuXG5cdGZ1bmN0aW9uIGVzY2FwZUh0bWwoc3RyaW5nKSB7XG5cdFx0dmFyIGVudGl0eU1hcCA9IHtcblx0XHRcdFwiJlwiOiBcIiZhbXA7XCIsXG5cdFx0XHRcIjxcIjogXCImbHQ7XCIsXG5cdFx0XHRcIj5cIjogXCImZ3Q7XCIsXG5cdFx0XHQnXCInOiBcIiZxdW90O1wiLFxuXHRcdFx0XCInXCI6IFwiJiMzOTtcIixcblx0XHRcdFwiL1wiOiBcIiYjeDJGO1wiLFxuXHRcdFx0XCJgXCI6IFwiJiN4NjA7XCIsXG5cdFx0XHRcIj1cIjogXCImI3gzRDtcIlxuXHRcdH07XG5cblx0XHRyZXR1cm4gU3RyaW5nKHN0cmluZykucmVwbGFjZSgvWyY8PlwiJ2A9XFwvXS9nLCBmdW5jdGlvbihzKSB7XG5cdFx0XHRyZXR1cm4gZW50aXR5TWFwW3NdO1xuXHRcdH0pO1xuXHR9XG5cblx0JChkb2N1bWVudCkub24oXCJjbGlja1wiLCBcIltkYXRhLWZhbmN5Ym94LXNoYXJlXVwiLCBmdW5jdGlvbigpIHtcblx0XHR2YXIgaW5zdGFuY2UgPSAkLmZhbmN5Ym94LmdldEluc3RhbmNlKCksXG5cdFx0XHRjdXJyZW50ID0gaW5zdGFuY2UuY3VycmVudCB8fCBudWxsLFxuXHRcdFx0dXJsLFxuXHRcdFx0dHBsO1xuXG5cdFx0aWYgKCFjdXJyZW50KSB7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXG5cdFx0aWYgKCQudHlwZShjdXJyZW50Lm9wdHMuc2hhcmUudXJsKSA9PT0gXCJmdW5jdGlvblwiKSB7XG5cdFx0XHR1cmwgPSBjdXJyZW50Lm9wdHMuc2hhcmUudXJsLmFwcGx5KGN1cnJlbnQsIFtpbnN0YW5jZSwgY3VycmVudF0pO1xuXHRcdH1cblxuXHRcdHRwbCA9IGN1cnJlbnQub3B0cy5zaGFyZS50cGxcblx0XHRcdC5yZXBsYWNlKC9cXHtcXHttZWRpYVxcfVxcfS9nLCBjdXJyZW50LnR5cGUgPT09IFwiaW1hZ2VcIiA/IGVuY29kZVVSSUNvbXBvbmVudChjdXJyZW50LnNyYykgOiBcIlwiKVxuXHRcdFx0LnJlcGxhY2UoL1xce1xce3VybFxcfVxcfS9nLCBlbmNvZGVVUklDb21wb25lbnQodXJsKSlcblx0XHRcdC5yZXBsYWNlKC9cXHtcXHt1cmxfcmF3XFx9XFx9L2csIGVzY2FwZUh0bWwodXJsKSlcblx0XHRcdC5yZXBsYWNlKC9cXHtcXHtkZXNjclxcfVxcfS9nLCBpbnN0YW5jZS4kY2FwdGlvbiA/IGVuY29kZVVSSUNvbXBvbmVudChpbnN0YW5jZS4kY2FwdGlvbi50ZXh0KCkpIDogXCJcIik7XG5cblx0XHQkLmZhbmN5Ym94Lm9wZW4oe1xuXHRcdFx0c3JjOiBpbnN0YW5jZS50cmFuc2xhdGUoaW5zdGFuY2UsIHRwbCksXG5cdFx0XHR0eXBlOiBcImh0bWxcIixcblx0XHRcdG9wdHM6IHtcblx0XHRcdFx0dG91Y2g6IGZhbHNlLFxuXHRcdFx0XHRhbmltYXRpb25FZmZlY3Q6IGZhbHNlLFxuXHRcdFx0XHRhZnRlckxvYWQ6IGZ1bmN0aW9uKHNoYXJlSW5zdGFuY2UsIHNoYXJlQ3VycmVudCkge1xuXHRcdFx0XHRcdC8vIENsb3NlIHNlbGYgaWYgcGFyZW50IGluc3RhbmNlIGlzIGNsb3Npbmdcblx0XHRcdFx0XHRpbnN0YW5jZS4kcmVmcy5jb250YWluZXIub25lKFwiYmVmb3JlQ2xvc2UuZmJcIiwgZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0XHRzaGFyZUluc3RhbmNlLmNsb3NlKG51bGwsIDApO1xuXHRcdFx0XHRcdH0pO1xuXG5cdFx0XHRcdFx0Ly8gT3BlbmluZyBsaW5rcyBpbiBhIHBvcHVwIHdpbmRvd1xuXHRcdFx0XHRcdHNoYXJlQ3VycmVudC4kY29udGVudC5maW5kKFwiLmZhbmN5Ym94LXNoYXJlX19idXR0b25cIikuY2xpY2soZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0XHR3aW5kb3cub3Blbih0aGlzLmhyZWYsIFwiU2hhcmVcIiwgXCJ3aWR0aD01NTAsIGhlaWdodD00NTBcIik7XG5cdFx0XHRcdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0XHRcdFx0fSk7XG5cdFx0XHRcdH0sXG5cdFx0XHRcdG1vYmlsZToge1xuXHRcdFx0XHRcdGF1dG9Gb2N1czogZmFsc2Vcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH0pO1xuXHR9KTtcbn0pKGRvY3VtZW50LCBqUXVlcnkpO1xuXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy9cbi8vIEhhc2hcbi8vIEVuYWJsZXMgbGlua2luZyB0byBlYWNoIG1vZGFsXG4vL1xuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbihmdW5jdGlvbih3aW5kb3csIGRvY3VtZW50LCAkKSB7XG5cdFwidXNlIHN0cmljdFwiO1xuXG5cdC8vIFNpbXBsZSAkLmVzY2FwZVNlbGVjdG9yIHBvbHlmaWxsIChmb3IgalF1ZXJ5IHByaW9yIHYzKVxuXHRpZiAoISQuZXNjYXBlU2VsZWN0b3IpIHtcblx0XHQkLmVzY2FwZVNlbGVjdG9yID0gZnVuY3Rpb24oc2VsKSB7XG5cdFx0XHR2YXIgcmNzc2VzY2FwZSA9IC8oW1xcMC1cXHgxZlxceDdmXXxeLT9cXGQpfF4tJHxbXlxceDgwLVxcdUZGRkZcXHctXS9nO1xuXHRcdFx0dmFyIGZjc3Nlc2NhcGUgPSBmdW5jdGlvbihjaCwgYXNDb2RlUG9pbnQpIHtcblx0XHRcdFx0aWYgKGFzQ29kZVBvaW50KSB7XG5cdFx0XHRcdFx0Ly8gVSswMDAwIE5VTEwgYmVjb21lcyBVK0ZGRkQgUkVQTEFDRU1FTlQgQ0hBUkFDVEVSXG5cdFx0XHRcdFx0aWYgKGNoID09PSBcIlxcMFwiKSB7XG5cdFx0XHRcdFx0XHRyZXR1cm4gXCJcXHVGRkZEXCI7XG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0Ly8gQ29udHJvbCBjaGFyYWN0ZXJzIGFuZCAoZGVwZW5kZW50IHVwb24gcG9zaXRpb24pIG51bWJlcnMgZ2V0IGVzY2FwZWQgYXMgY29kZSBwb2ludHNcblx0XHRcdFx0XHRyZXR1cm4gY2guc2xpY2UoMCwgLTEpICsgXCJcXFxcXCIgKyBjaC5jaGFyQ29kZUF0KGNoLmxlbmd0aCAtIDEpLnRvU3RyaW5nKDE2KSArIFwiIFwiO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0Ly8gT3RoZXIgcG90ZW50aWFsbHktc3BlY2lhbCBBU0NJSSBjaGFyYWN0ZXJzIGdldCBiYWNrc2xhc2gtZXNjYXBlZFxuXHRcdFx0XHRyZXR1cm4gXCJcXFxcXCIgKyBjaDtcblx0XHRcdH07XG5cblx0XHRcdHJldHVybiAoc2VsICsgXCJcIikucmVwbGFjZShyY3NzZXNjYXBlLCBmY3NzZXNjYXBlKTtcblx0XHR9O1xuXHR9XG5cblx0Ly8gR2V0IGluZm8gYWJvdXQgZ2FsbGVyeSBuYW1lIGFuZCBjdXJyZW50IGluZGV4IGZyb20gdXJsXG5cdGZ1bmN0aW9uIHBhcnNlVXJsKCkge1xuXHRcdHZhciBoYXNoID0gd2luZG93LmxvY2F0aW9uLmhhc2guc3Vic3RyKDEpLFxuXHRcdFx0cmV6ID0gaGFzaC5zcGxpdChcIi1cIiksXG5cdFx0XHRpbmRleCA9IHJlei5sZW5ndGggPiAxICYmIC9eXFwrP1xcZCskLy50ZXN0KHJleltyZXoubGVuZ3RoIC0gMV0pID8gcGFyc2VJbnQocmV6LnBvcCgtMSksIDEwKSB8fCAxIDogMSxcblx0XHRcdGdhbGxlcnkgPSByZXouam9pbihcIi1cIik7XG5cblx0XHRyZXR1cm4ge1xuXHRcdFx0aGFzaDogaGFzaCxcblx0XHRcdC8qIEluZGV4IGlzIHN0YXJ0aW5nIGZyb20gMSAqL1xuXHRcdFx0aW5kZXg6IGluZGV4IDwgMSA/IDEgOiBpbmRleCxcblx0XHRcdGdhbGxlcnk6IGdhbGxlcnlcblx0XHR9O1xuXHR9XG5cblx0Ly8gVHJpZ2dlciBjbGljayBldm50IG9uIGxpbmtzIHRvIG9wZW4gbmV3IGZhbmN5Qm94IGluc3RhbmNlXG5cdGZ1bmN0aW9uIHRyaWdnZXJGcm9tVXJsKHVybCkge1xuXHRcdGlmICh1cmwuZ2FsbGVyeSAhPT0gXCJcIikge1xuXHRcdFx0Ly8gSWYgd2UgY2FuIGZpbmQgZWxlbWVudCBtYXRjaGluZyAnZGF0YS1mYW5jeWJveCcgYXRyaWJ1dGUsXG5cdFx0XHQvLyB0aGVuIHRyaWdnZXJpbmcgY2xpY2sgZXZlbnQgc2hvdWxkIHN0YXJ0IGZhbmN5Qm94XG5cdFx0XHQkKFwiW2RhdGEtZmFuY3lib3g9J1wiICsgJC5lc2NhcGVTZWxlY3Rvcih1cmwuZ2FsbGVyeSkgKyBcIiddXCIpXG5cdFx0XHRcdC5lcSh1cmwuaW5kZXggLSAxKVxuXHRcdFx0XHQuZm9jdXMoKVxuXHRcdFx0XHQudHJpZ2dlcihcImNsaWNrLmZiLXN0YXJ0XCIpO1xuXHRcdH1cblx0fVxuXG5cdC8vIEdldCBnYWxsZXJ5IG5hbWUgZnJvbSBjdXJyZW50IGluc3RhbmNlXG5cdGZ1bmN0aW9uIGdldEdhbGxlcnlJRChpbnN0YW5jZSkge1xuXHRcdHZhciBvcHRzLCByZXQ7XG5cblx0XHRpZiAoIWluc3RhbmNlKSB7XG5cdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0fVxuXG5cdFx0b3B0cyA9IGluc3RhbmNlLmN1cnJlbnQgPyBpbnN0YW5jZS5jdXJyZW50Lm9wdHMgOiBpbnN0YW5jZS5vcHRzO1xuXHRcdHJldCA9IG9wdHMuaGFzaCB8fCAob3B0cy4kb3JpZyA/IG9wdHMuJG9yaWcuZGF0YShcImZhbmN5Ym94XCIpIHx8IG9wdHMuJG9yaWcuZGF0YShcImZhbmN5Ym94LXRyaWdnZXJcIikgOiBcIlwiKTtcblxuXHRcdHJldHVybiByZXQgPT09IFwiXCIgPyBmYWxzZSA6IHJldDtcblx0fVxuXG5cdC8vIFN0YXJ0IHdoZW4gRE9NIGJlY29tZXMgcmVhZHlcblx0JChmdW5jdGlvbigpIHtcblx0XHQvLyBDaGVjayBpZiB1c2VyIGhhcyBkaXNhYmxlZCB0aGlzIG1vZHVsZVxuXHRcdGlmICgkLmZhbmN5Ym94LmRlZmF1bHRzLmhhc2ggPT09IGZhbHNlKSB7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXG5cdFx0Ly8gVXBkYXRlIGhhc2ggd2hlbiBvcGVuaW5nL2Nsb3NpbmcgZmFuY3lCb3hcblx0XHQkKGRvY3VtZW50KS5vbih7XG5cdFx0XHRcIm9uSW5pdC5mYlwiOiBmdW5jdGlvbihlLCBpbnN0YW5jZSkge1xuXHRcdFx0XHR2YXIgdXJsLCBnYWxsZXJ5O1xuXG5cdFx0XHRcdGlmIChpbnN0YW5jZS5ncm91cFtpbnN0YW5jZS5jdXJySW5kZXhdLm9wdHMuaGFzaCA9PT0gZmFsc2UpIHtcblx0XHRcdFx0XHRyZXR1cm47XG5cdFx0XHRcdH1cblxuXHRcdFx0XHR1cmwgPSBwYXJzZVVybCgpO1xuXHRcdFx0XHRnYWxsZXJ5ID0gZ2V0R2FsbGVyeUlEKGluc3RhbmNlKTtcblxuXHRcdFx0XHQvLyBNYWtlIHN1cmUgZ2FsbGVyeSBzdGFydCBpbmRleCBtYXRjaGVzIGluZGV4IGZyb20gaGFzaFxuXHRcdFx0XHRpZiAoZ2FsbGVyeSAmJiB1cmwuZ2FsbGVyeSAmJiBnYWxsZXJ5ID09IHVybC5nYWxsZXJ5KSB7XG5cdFx0XHRcdFx0aW5zdGFuY2UuY3VyckluZGV4ID0gdXJsLmluZGV4IC0gMTtcblx0XHRcdFx0fVxuXHRcdFx0fSxcblxuXHRcdFx0XCJiZWZvcmVTaG93LmZiXCI6IGZ1bmN0aW9uKGUsIGluc3RhbmNlLCBjdXJyZW50LCBmaXJzdFJ1bikge1xuXHRcdFx0XHR2YXIgZ2FsbGVyeTtcblxuXHRcdFx0XHRpZiAoIWN1cnJlbnQgfHwgY3VycmVudC5vcHRzLmhhc2ggPT09IGZhbHNlKSB7XG5cdFx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0Ly8gQ2hlY2sgaWYgbmVlZCB0byB1cGRhdGUgd2luZG93IGhhc2hcblx0XHRcdFx0Z2FsbGVyeSA9IGdldEdhbGxlcnlJRChpbnN0YW5jZSk7XG5cblx0XHRcdFx0aWYgKCFnYWxsZXJ5KSB7XG5cdFx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0Ly8gVmFyaWFibGUgY29udGFpbmluZyBsYXN0IGhhc2ggdmFsdWUgc2V0IGJ5IGZhbmN5Qm94XG5cdFx0XHRcdC8vIEl0IHdpbGwgYmUgdXNlZCB0byBkZXRlcm1pbmUgaWYgZmFuY3lCb3ggbmVlZHMgdG8gY2xvc2UgYWZ0ZXIgaGFzaCBjaGFuZ2UgaXMgZGV0ZWN0ZWRcblx0XHRcdFx0aW5zdGFuY2UuY3VycmVudEhhc2ggPSBnYWxsZXJ5ICsgKGluc3RhbmNlLmdyb3VwLmxlbmd0aCA+IDEgPyBcIi1cIiArIChjdXJyZW50LmluZGV4ICsgMSkgOiBcIlwiKTtcblxuXHRcdFx0XHQvLyBJZiBjdXJyZW50IGhhc2ggaXMgdGhlIHNhbWUgKHRoaXMgaW5zdGFuY2UgbW9zdCBsaWtlbHkgaXMgb3BlbmVkIGJ5IGhhc2hjaGFuZ2UpLCB0aGVuIGRvIG5vdGhpbmdcblx0XHRcdFx0aWYgKHdpbmRvdy5sb2NhdGlvbi5oYXNoID09PSBcIiNcIiArIGluc3RhbmNlLmN1cnJlbnRIYXNoKSB7XG5cdFx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0aWYgKGZpcnN0UnVuICYmICFpbnN0YW5jZS5vcmlnSGFzaCkge1xuXHRcdFx0XHRcdGluc3RhbmNlLm9yaWdIYXNoID0gd2luZG93LmxvY2F0aW9uLmhhc2g7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRpZiAoaW5zdGFuY2UuaGFzaFRpbWVyKSB7XG5cdFx0XHRcdFx0Y2xlYXJUaW1lb3V0KGluc3RhbmNlLmhhc2hUaW1lcik7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHQvLyBVcGRhdGUgaGFzaFxuXHRcdFx0XHRpbnN0YW5jZS5oYXNoVGltZXIgPSBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdGlmIChcInJlcGxhY2VTdGF0ZVwiIGluIHdpbmRvdy5oaXN0b3J5KSB7XG5cdFx0XHRcdFx0XHR3aW5kb3cuaGlzdG9yeVtmaXJzdFJ1biA/IFwicHVzaFN0YXRlXCIgOiBcInJlcGxhY2VTdGF0ZVwiXShcblx0XHRcdFx0XHRcdFx0e30sXG5cdFx0XHRcdFx0XHRcdGRvY3VtZW50LnRpdGxlLFxuXHRcdFx0XHRcdFx0XHR3aW5kb3cubG9jYXRpb24ucGF0aG5hbWUgKyB3aW5kb3cubG9jYXRpb24uc2VhcmNoICsgXCIjXCIgKyBpbnN0YW5jZS5jdXJyZW50SGFzaFxuXHRcdFx0XHRcdFx0KTtcblxuXHRcdFx0XHRcdFx0aWYgKGZpcnN0UnVuKSB7XG5cdFx0XHRcdFx0XHRcdGluc3RhbmNlLmhhc0NyZWF0ZWRIaXN0b3J5ID0gdHJ1ZTtcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0d2luZG93LmxvY2F0aW9uLmhhc2ggPSBpbnN0YW5jZS5jdXJyZW50SGFzaDtcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRpbnN0YW5jZS5oYXNoVGltZXIgPSBudWxsO1xuXHRcdFx0XHR9LCAzMDApO1xuXHRcdFx0fSxcblxuXHRcdFx0XCJiZWZvcmVDbG9zZS5mYlwiOiBmdW5jdGlvbihlLCBpbnN0YW5jZSwgY3VycmVudCkge1xuXHRcdFx0XHRpZiAoY3VycmVudC5vcHRzLmhhc2ggPT09IGZhbHNlKSB7XG5cdFx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0Y2xlYXJUaW1lb3V0KGluc3RhbmNlLmhhc2hUaW1lcik7XG5cblx0XHRcdFx0Ly8gR290byBwcmV2aW91cyBoaXN0b3J5IGVudHJ5XG5cdFx0XHRcdGlmIChpbnN0YW5jZS5jdXJyZW50SGFzaCAmJiBpbnN0YW5jZS5oYXNDcmVhdGVkSGlzdG9yeSkge1xuXHRcdFx0XHRcdHdpbmRvdy5oaXN0b3J5LmJhY2soKTtcblx0XHRcdFx0fSBlbHNlIGlmIChpbnN0YW5jZS5jdXJyZW50SGFzaCkge1xuXHRcdFx0XHRcdGlmIChcInJlcGxhY2VTdGF0ZVwiIGluIHdpbmRvdy5oaXN0b3J5KSB7XG5cdFx0XHRcdFx0XHR3aW5kb3cuaGlzdG9yeS5yZXBsYWNlU3RhdGUoe30sIGRvY3VtZW50LnRpdGxlLCB3aW5kb3cubG9jYXRpb24ucGF0aG5hbWUgKyB3aW5kb3cubG9jYXRpb24uc2VhcmNoICsgKGluc3RhbmNlLm9yaWdIYXNoIHx8IFwiXCIpKTtcblx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0d2luZG93LmxvY2F0aW9uLmhhc2ggPSBpbnN0YW5jZS5vcmlnSGFzaDtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRpbnN0YW5jZS5jdXJyZW50SGFzaCA9IG51bGw7XG5cdFx0XHR9XG5cdFx0fSk7XG5cblx0XHQvLyBDaGVjayBpZiBuZWVkIHRvIHN0YXJ0L2Nsb3NlIGFmdGVyIHVybCBoYXMgY2hhbmdlZFxuXHRcdCQod2luZG93KS5vbihcImhhc2hjaGFuZ2UuZmJcIiwgZnVuY3Rpb24oKSB7XG5cdFx0XHR2YXIgdXJsID0gcGFyc2VVcmwoKSxcblx0XHRcdFx0ZmIgPSBudWxsO1xuXG5cdFx0XHQvLyBGaW5kIGxhc3QgZmFuY3lCb3ggaW5zdGFuY2UgdGhhdCBoYXMgXCJoYXNoXCJcblx0XHRcdCQuZWFjaChcblx0XHRcdFx0JChcIi5mYW5jeWJveC1jb250YWluZXJcIilcblx0XHRcdFx0XHQuZ2V0KClcblx0XHRcdFx0XHQucmV2ZXJzZSgpLFxuXHRcdFx0XHRmdW5jdGlvbihpbmRleCwgdmFsdWUpIHtcblx0XHRcdFx0XHR2YXIgdG1wID0gJCh2YWx1ZSkuZGF0YShcIkZhbmN5Qm94XCIpO1xuXG5cdFx0XHRcdFx0aWYgKHRtcCAmJiB0bXAuY3VycmVudEhhc2gpIHtcblx0XHRcdFx0XHRcdGZiID0gdG1wO1xuXHRcdFx0XHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0KTtcblxuXHRcdFx0aWYgKGZiKSB7XG5cdFx0XHRcdC8vIE5vdywgY29tcGFyZSBoYXNoIHZhbHVlc1xuXHRcdFx0XHRpZiAoZmIuY3VycmVudEhhc2ggIT09IHVybC5nYWxsZXJ5ICsgXCItXCIgKyB1cmwuaW5kZXggJiYgISh1cmwuaW5kZXggPT09IDEgJiYgZmIuY3VycmVudEhhc2ggPT0gdXJsLmdhbGxlcnkpKSB7XG5cdFx0XHRcdFx0ZmIuY3VycmVudEhhc2ggPSBudWxsO1xuXG5cdFx0XHRcdFx0ZmIuY2xvc2UoKTtcblx0XHRcdFx0fVxuXHRcdFx0fSBlbHNlIGlmICh1cmwuZ2FsbGVyeSAhPT0gXCJcIikge1xuXHRcdFx0XHR0cmlnZ2VyRnJvbVVybCh1cmwpO1xuXHRcdFx0fVxuXHRcdH0pO1xuXG5cdFx0Ly8gQ2hlY2sgY3VycmVudCBoYXNoIGFuZCB0cmlnZ2VyIGNsaWNrIGV2ZW50IG9uIG1hdGNoaW5nIGVsZW1lbnQgdG8gc3RhcnQgZmFuY3lCb3gsIGlmIG5lZWRlZFxuXHRcdHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XG5cdFx0XHRpZiAoISQuZmFuY3lib3guZ2V0SW5zdGFuY2UoKSkge1xuXHRcdFx0XHR0cmlnZ2VyRnJvbVVybChwYXJzZVVybCgpKTtcblx0XHRcdH1cblx0XHR9LCA1MCk7XG5cdH0pO1xufSkod2luZG93LCBkb2N1bWVudCwgalF1ZXJ5KTtcblxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vXG4vLyBXaGVlbFxuLy8gQmFzaWMgbW91c2Ugd2VoZWVsIHN1cHBvcnQgZm9yIGdhbGxlcnkgbmF2aWdhdGlvblxuLy9cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4oZnVuY3Rpb24oZG9jdW1lbnQsICQpIHtcblx0XCJ1c2Ugc3RyaWN0XCI7XG5cblx0dmFyIHByZXZUaW1lID0gbmV3IERhdGUoKS5nZXRUaW1lKCk7XG5cblx0JChkb2N1bWVudCkub24oe1xuXHRcdFwib25Jbml0LmZiXCI6IGZ1bmN0aW9uKGUsIGluc3RhbmNlLCBjdXJyZW50KSB7XG5cdFx0XHRpbnN0YW5jZS4kcmVmcy5zdGFnZS5vbihcIm1vdXNld2hlZWwgRE9NTW91c2VTY3JvbGwgd2hlZWwgTW96TW91c2VQaXhlbFNjcm9sbFwiLCBmdW5jdGlvbihlKSB7XG5cdFx0XHRcdHZhciBjdXJyZW50ID0gaW5zdGFuY2UuY3VycmVudCxcblx0XHRcdFx0XHRjdXJyVGltZSA9IG5ldyBEYXRlKCkuZ2V0VGltZSgpO1xuXG5cdFx0XHRcdGlmIChpbnN0YW5jZS5ncm91cC5sZW5ndGggPCAyIHx8IGN1cnJlbnQub3B0cy53aGVlbCA9PT0gZmFsc2UgfHwgKGN1cnJlbnQub3B0cy53aGVlbCA9PT0gXCJhdXRvXCIgJiYgY3VycmVudC50eXBlICE9PSBcImltYWdlXCIpKSB7XG5cdFx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0ZS5wcmV2ZW50RGVmYXVsdCgpO1xuXHRcdFx0XHRlLnN0b3BQcm9wYWdhdGlvbigpO1xuXG5cdFx0XHRcdGlmIChjdXJyZW50LiRzbGlkZS5oYXNDbGFzcyhcImZhbmN5Ym94LWFuaW1hdGVkXCIpKSB7XG5cdFx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0ZSA9IGUub3JpZ2luYWxFdmVudCB8fCBlO1xuXG5cdFx0XHRcdGlmIChjdXJyVGltZSAtIHByZXZUaW1lIDwgMjUwKSB7XG5cdFx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0cHJldlRpbWUgPSBjdXJyVGltZTtcblxuXHRcdFx0XHRpbnN0YW5jZVsoLWUuZGVsdGFZIHx8IC1lLmRlbHRhWCB8fCBlLndoZWVsRGVsdGEgfHwgLWUuZGV0YWlsKSA8IDAgPyBcIm5leHRcIiA6IFwicHJldmlvdXNcIl0oKTtcblx0XHRcdH0pO1xuXHRcdH1cblx0fSk7XG59KShkb2N1bWVudCwgalF1ZXJ5KTtcblxuKGZ1bmN0aW9uICgkKSB7XG5cdCQoZG9jdW1lbnQpLnJlYWR5KGZ1bmN0aW9uICgpIHtcblx0XHRhcHAuaW5pdCgpO1xuXHR9KTtcblxuXHR2YXIgYXBwID0ge1xuXHRcdGluaXQ6IGZ1bmN0aW9uICgpIHtcblx0XHRcdHRoaXMuYWNjZXNzaWJpbGl0eSgpO1xuXHRcdFx0dGhpcy51dGlscygpO1xuXHRcdFx0dGhpcy5tZW51KCk7XG5cdFx0XHR0aGlzLmNhcm91c2VsKCk7XG5cdFx0XHR0aGlzLm11bHRpbWVkaWEoKTtcblx0XHR9LFxuXG5cdFx0LyoqXG5cdFx0ICogQWNjZXNzaWJpbGl0eSBmdW5jdGlvbnNcblx0XHQgKlxuXHRcdCAqL1xuXHRcdGFjY2Vzc2liaWxpdHk6IGZ1bmN0aW9uICgpIHtcblx0XHRcdC8vIEhpZ2ggY29udHJhc3Rcblx0XHRcdCQoJyNoaWdoLWNvbnRyYXN0LWJ0bicpLmNsaWNrKGZ1bmN0aW9uIChlKSB7XG5cdFx0XHRcdGUucHJldmVudERlZmF1bHQoKTtcblx0XHRcdFx0dmFyIGhpZ2hDb250cmFzdCA9IGNvb2tpZSgnaGlnaC1jb250cmFzdCcpO1xuXG5cdFx0XHRcdGlmIChoaWdoQ29udHJhc3QgPT09ICdvbicpIHtcblx0XHRcdFx0XHRjb29raWUoJ2hpZ2gtY29udHJhc3QnLCAnb2ZmJyk7XG5cdFx0XHRcdFx0JCgnYm9keScpLnJlbW92ZUNsYXNzKCdoaWdoLWNvbnRyYXN0Jyk7XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0Y29va2llKCdoaWdoLWNvbnRyYXN0JywgJ29uJyk7XG5cdFx0XHRcdFx0JCgnYm9keScpLmFkZENsYXNzKCdoaWdoLWNvbnRyYXN0Jyk7XG5cdFx0XHRcdH1cblx0XHRcdH0pXG5cdFx0fSxcblxuXHRcdC8qKlxuXHRcdCAqIE1lbnUgRnVuY3Rpb25zXG5cdFx0ICpcblx0XHQgKi9cblx0XHRtZW51OiBmdW5jdGlvbiAoKSB7XG5cblx0XHRcdC8vIEhpZ2ggY29udHJhc3Rcblx0XHRcdCQoJyNtZW51LXRvZ2dsZScpLmNsaWNrKGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0JCgnYm9keScpLnRvZ2dsZUNsYXNzKCdtZW51LWFjdGl2ZScpO1xuXG5cdFx0XHRcdGlmICgkKCdib2R5JykuaGFzQ2xhc3MoJ21lbnUtYWN0aXZlJykpIHtcblx0XHRcdFx0XHRib2R5U2Nyb2xsTG9jay5kaXNhYmxlQm9keVNjcm9sbChkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcuc2Nyb2xsVGFyZ2V0Jykse1xuXHRcdFx0XHRcdFx0YWxsb3dUb3VjaE1vdmU6IGVsID0+IChlbC50YWdOYW1lID09PSAnZGl2JylcbiAgXHRcdFx0XHR9KTtcblxuXHRcdFx0XHR9XG5cdFx0XHR9KVxuXG5cdFx0XHQkKCcjbWVudS13cmFwcGVyLCAjbWVudS10b2dnbGUnKS5jbGljayhmdW5jdGlvbihldmVudCl7XG5cdFx0XHRcdGV2ZW50LnN0b3BQcm9wYWdhdGlvbigpO1xuXHRcdFx0fSk7XG5cblx0XHRcdCQoJ2JvZHksIC5jbG9zZS1tZW51JykuY2xpY2soZnVuY3Rpb24oZXZlbnQpe1xuXHRcdFx0XHQkKCdib2R5JykucmVtb3ZlQ2xhc3MoJ21lbnUtYWN0aXZlJyk7XG5cblx0XHRcdFx0Ym9keVNjcm9sbExvY2suY2xlYXJBbGxCb2R5U2Nyb2xsTG9ja3MoKTtcblx0XHRcdH0pO1xuXG5cdFx0XHQkKCcud2lkZ2V0X25hdl9tZW51JykuY2xpY2soZnVuY3Rpb24oKSB7XG5cdFx0XHRcdCQodGhpcykudG9nZ2xlQ2xhc3MoJ2FjdGl2ZScpO1xuXHRcdFx0fSk7XG5cdFx0fSxcblxuXHRcdGNhcm91c2VsOiBmdW5jdGlvbigpIHtcblx0XHRcdHZhciAkY2Fyb3VzZWwgPSAkKCcjanVtYm90cm9uLWNhcm91c2VsJyk7XG5cblx0XHRcdGFwcC5zd2lwZWRldGVjdCgkY2Fyb3VzZWwuZmluZCgnLmNhcm91c2VsLWlubmVyJylbMF0sIGZ1bmN0aW9uKHN3aXBlZGlyKXtcblx0XHRcdFx0XHRpZiAoc3dpcGVkaXIgPT09ICdyaWdodCcpIHtcblx0XHRcdFx0XHRcdCRjYXJvdXNlbC5jYXJvdXNlbCgncHJldicpO1xuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdGlmIChzd2lwZWRpciA9PT0gJ2xlZnQnKSB7XG5cdFx0XHRcdFx0XHQkY2Fyb3VzZWwuY2Fyb3VzZWwoJ25leHQnKTtcblx0XHRcdFx0XHR9XG5cdFx0XHR9KTtcblx0XHR9LFxuXG5cdFx0LyoqXG5cdFx0ICogVXRpbGl0eSBmdW5jdGlvbnMsIHVzZWQgb24gYWxsIHNpdGVzXG5cdFx0ICpcblx0XHQgKi9cblx0XHR1dGlsczogZnVuY3Rpb24gKCkge1xuXHRcdFx0Ly8gRW5hYmxlIGJvb3RzdHJhcCB0b29sdGlwXG5cdFx0XHQkKCdbZGF0YS10b2dnbGU9XCJ0b29sdGlwXCJdJykudG9vbHRpcCgpO1xuXG5cdFx0XHQvLyBGYW5jeWJveCBmb3IgZ2FsbGVyeSBtZWRpYVxuXHRcdFx0aWYoICQoJy5nYWxsZXJ5JykubGVuZ3RoICl7XG5cdFx0XHRcdCQoJy5nYWxsZXJ5LWl0ZW0nKS5lYWNoKCBmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdFx0dmFyIGNhcHRpb24gPSAkKHRoaXMpLmZpbmQoJy5nYWxsZXJ5LWNhcHRpb24nKS50ZXh0KCk7XG5cdFx0XHRcdFx0JCh0aGlzKS5maW5kKCdhJykuYXR0ciggJ2RhdGEtY2FwdGlvbicsIGNhcHRpb24gKTtcblx0XHRcdFx0fSk7XG5cdFx0XHRcdCQoJy5nYWxsZXJ5LWl0ZW0gYScpLmF0dHIoICdkYXRhLWZhbmN5Ym94JywgJ2dyb3VwJyApO1xuXHRcdFx0XHQkKCcuZ2FsbGVyeS1pdGVtIGEnKS5mYW5jeWJveCh7fSk7XG5cdFx0XHR9XG5cblx0XHRcdCQoJy50b2dnbGUtYWN0aXZlJykuY2xpY2soIGZ1bmN0aW9uKCkge1xuXHRcdFx0XHQkKHRoaXMpLnBhcmVudCgpLnRvZ2dsZUNsYXNzKCdhY3RpdmUnKTtcblx0XHRcdH0pO1xuXG5cdFx0XHQkKCdhLnNoYXJlLWxpbmsnKS5vbignY2xpY2snLCBmdW5jdGlvbihldmVudCkge1xuXHRcdFx0XHRldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuXHRcdFx0XHR2YXIgdXJsID0gJCh0aGlzKS5hdHRyKCdocmVmJyk7XG5cdFx0XHRcdHNob3dNb2RhbCh1cmwpO1xuXHRcdFx0fSk7XG5cblx0XHRcdGZ1bmN0aW9uIHNob3dNb2RhbCh1cmwpe1xuXHRcdFx0XHR3aW5kb3cub3Blbih1cmwsIFwic2hhcmVXaW5kb3dcIiwgXCJ3aWR0aD02MDAsIGhlaWdodD00MDBcIik7XG5cdFx0XHRcdHJldHVybiBmYWxzZTtcblx0XHRcdH1cblx0XHR9LFxuXG5cdFx0Ly8gY3JlZGl0OiBodHRwOi8vd3d3LmphdmFzY3JpcHRraXQuY29tL2phdmF0dXRvcnMvdG91Y2hldmVudHMyLnNodG1sXG5cdFx0c3dpcGVkZXRlY3Q6IGZ1bmN0aW9uKGVsLCBjYWxsYmFjayl7XG5cblx0XHRcdHZhciB0b3VjaHN1cmZhY2UgPSBBcnJheS5pc0FycmF5KGVsKSA/IGVsIDogW2VsXSxcblx0XHRcdFx0XHRzd2lwZWRpcixcblx0XHRcdFx0XHRzdGFydFgsXG5cdFx0XHRcdFx0c3RhcnRZLFxuXHRcdFx0XHRcdGRpc3RYLFxuXHRcdFx0XHRcdGRpc3RZLFxuXHRcdFx0XHRcdHRocmVzaG9sZCA9IDEwMCwgLy9yZXF1aXJlZCBtaW4gZGlzdGFuY2UgdHJhdmVsZWQgdG8gYmUgY29uc2lkZXJlZCBzd2lwZVxuXHRcdFx0XHRcdHJlc3RyYWludCA9IDEwMCwgLy8gbWF4aW11bSBkaXN0YW5jZSBhbGxvd2VkIGF0IHRoZSBzYW1lIHRpbWUgaW4gcGVycGVuZGljdWxhciBkaXJlY3Rpb25cblx0XHRcdFx0XHRhbGxvd2VkVGltZSA9IDMwMCwgLy8gbWF4aW11bSB0aW1lIGFsbG93ZWQgdG8gdHJhdmVsIHRoYXQgZGlzdGFuY2Vcblx0XHRcdFx0XHRlbGFwc2VkVGltZSxcblx0XHRcdFx0XHRzdGFydFRpbWUsXG5cdFx0XHRcdFx0aGFuZGxlc3dpcGUgPSBjYWxsYmFjayB8fCBmdW5jdGlvbihzd2lwZWRpcil7fTtcblxuXHRcdFx0dG91Y2hzdXJmYWNlLmZvckVhY2goIChlbGVtZW50KSA9PiB7XG5cdFx0XHRcdGlmICghZWxlbWVudCkgcmV0dXJuO1xuXG5cdFx0XHRcdGVsZW1lbnQuYWRkRXZlbnRMaXN0ZW5lcigndG91Y2hzdGFydCcsIGZ1bmN0aW9uKGUpe1xuXG5cdFx0XHRcdFx0dmFyIHRvdWNob2JqID0gZS5jaGFuZ2VkVG91Y2hlc1swXTtcblx0XHRcdFx0XHRzd2lwZWRpciA9ICdub25lJztcblx0XHRcdFx0XHRkaXN0ID0gMDtcblx0XHRcdFx0XHRzdGFydFggPSB0b3VjaG9iai5wYWdlWDtcblx0XHRcdFx0XHRzdGFydFkgPSB0b3VjaG9iai5wYWdlWTtcblx0XHRcdFx0XHRzdGFydFRpbWUgPSBuZXcgRGF0ZSgpLmdldFRpbWUoKTsgLy8gcmVjb3JkIHRpbWUgd2hlbiBmaW5nZXIgZmlyc3QgbWFrZXMgY29udGFjdCB3aXRoIHN1cmZhY2VcblxuXHRcdFx0XHR9LCBmYWxzZSk7XG5cblx0XHRcdFx0ZWxlbWVudC5hZGRFdmVudExpc3RlbmVyKCd0b3VjaGVuZCcsIGZ1bmN0aW9uKGUpe1xuXHRcdFx0XHRcdHZhciB0b3VjaG9iaiA9IGUuY2hhbmdlZFRvdWNoZXNbMF07XG5cdFx0XHRcdFx0ZGlzdFggPSB0b3VjaG9iai5wYWdlWCAtIHN0YXJ0WDsgLy8gZ2V0IGhvcml6b250YWwgZGlzdCB0cmF2ZWxlZCBieSBmaW5nZXIgd2hpbGUgaW4gY29udGFjdCB3aXRoIHN1cmZhY2Vcblx0XHRcdFx0XHRkaXN0WSA9IHRvdWNob2JqLnBhZ2VZIC0gc3RhcnRZOyAvLyBnZXQgdmVydGljYWwgZGlzdCB0cmF2ZWxlZCBieSBmaW5nZXIgd2hpbGUgaW4gY29udGFjdCB3aXRoIHN1cmZhY2Vcblx0XHRcdFx0XHRlbGFwc2VkVGltZSA9IG5ldyBEYXRlKCkuZ2V0VGltZSgpIC0gc3RhcnRUaW1lOyAvLyBnZXQgdGltZSBlbGFwc2VkXG5cblx0XHRcdFx0XHRpZiAoZWxhcHNlZFRpbWUgPD0gYWxsb3dlZFRpbWUpIHsgLy8gZmlyc3QgY29uZGl0aW9uIGZvciBhd2lwZSBtZXRcblx0XHRcdFx0XHRcdFx0aWYgKE1hdGguYWJzKGRpc3RYKSA+PSB0aHJlc2hvbGQgJiYgTWF0aC5hYnMoZGlzdFkpIDw9IHJlc3RyYWludCl7IC8vIDJuZCBjb25kaXRpb24gZm9yIGhvcml6b250YWwgc3dpcGUgbWV0XG5cdFx0XHRcdFx0XHRcdFx0c3dpcGVkaXIgPSAoZGlzdFggPCAwKT8gJ2xlZnQnIDogJ3JpZ2h0JzsgLy8gaWYgZGlzdCB0cmF2ZWxlZCBpcyBuZWdhdGl2ZSwgaXQgaW5kaWNhdGVzIGxlZnQgc3dpcGVcblx0XHRcdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0XHRcdGVsc2UgaWYgKE1hdGguYWJzKGRpc3RZKSA+PSB0aHJlc2hvbGQgJiYgTWF0aC5hYnMoZGlzdFgpIDw9IHJlc3RyYWludCl7IC8vIDJuZCBjb25kaXRpb24gZm9yIHZlcnRpY2FsIHN3aXBlIG1ldFxuXHRcdFx0XHRcdFx0XHRcdHN3aXBlZGlyID0gKGRpc3RZIDwgMCk/ICd1cCcgOiAnZG93bic7IC8vIGlmIGRpc3QgdHJhdmVsZWQgaXMgbmVnYXRpdmUsIGl0IGluZGljYXRlcyB1cCBzd2lwZVxuXHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0aGFuZGxlc3dpcGUoc3dpcGVkaXIpO1xuXHRcdFx0XHR9LCBmYWxzZSlcblx0XHRcdH0pO1xuXHRcdH0sXG5cblx0XHRhZ2VuZGE6IGZ1bmN0aW9uICgpIHtcblx0XHRcdCQoJyNkYXRlcGlja2VyJykuZGF0ZXBpY2tlcih7XG5cdFx0XHRcdGRheU5hbWVzTWluOiBbJ0RvbScsICdTZWcnLCAnVGVyJywgJ1F1YScsICdRdWknLCAnU2V4JywgJ1NhYiddXG5cdFx0XHR9KTtcblxuXHRcdFx0JCgnLm1vbnRocGlja2VyJykub24oJ2NsaWNrJywgZnVuY3Rpb24gKGUpIHtcblx0XHRcdFx0ZS5wcmV2ZW50RGVmYXVsdCgpO1xuXHRcdFx0XHQkKCcubW9udGhwaWNrZXInKS5kYXRlcGlja2VyKCdzaG93Jyk7XG5cdFx0XHR9KTtcblx0XHR9LFxuXG5cdFx0bXVsdGltZWRpYTogZnVuY3Rpb24gKCkge1xuXHRcdFx0JCgnI3BsYXktbXVsdGltZWRpYS12aWRlbycpLmNsaWNrKGZ1bmN0aW9uIChlKSB7XG5cdFx0XHRcdGUucHJldmVudERlZmF1bHQoKTtcblxuXHRcdFx0XHR2YXIgdklEID0gJCh0aGlzKS5kYXRhKCd2aWRlby1zcmMnKSxcblx0XHRcdFx0XHR2aWRXaWR0aCA9IDExNTAsXG5cdFx0XHRcdFx0dmlkSGVpZ2h0ID0gNTMwO1xuXG5cdFx0XHRcdHZhciBpRnJhbWVDb2RlID0gJzxpZnJhbWUgY2xhc3M9XCJpZGctdmlkZW8tcGxheWVyXCIgd2lkdGg9XCInICsgdmlkV2lkdGggKyAnXCIgaGVpZ2h0PVwiJysgdmlkSGVpZ2h0ICsnXCIgc2Nyb2xsaW5nPVwibm9cIiBhbGxvd3RyYW5zcGFyZW5jeT1cInRydWVcIiBhbGxvd2Z1bGxzY3JlZW49XCJ0cnVlXCIgc3JjPVwiaHR0cHM6Ly93d3cueW91dHViZS5jb20vZW1iZWQvJysgIHZJRCArJz9yZWw9MCZ3bW9kZT10cmFuc3BhcmVudCZzaG93aW5mbz0wJmF1dG9wbGF5PTFcIiBmcmFtZWJvcmRlcj1cIjBcIiBhbGxvdz1cImF1dG9wbGF5XCI+PC9pZnJhbWU+JztcblxuXHRcdFx0XHQkKCcjbXVsdGltaWRpYSAuaGlnaGxpZ2h0JykuYWRkQ2xhc3MoJ2hpZ2hsaWdodC12aWRlby1wbGF5ZXInKS5odG1sKGlGcmFtZUNvZGUpO1xuXG5cdFx0XHR9KVxuXHRcdH1cblx0fTtcbn0pKGpRdWVyeSk7XG4iXSwiZmlsZSI6ImJ1bmRsZS5qcyJ9
