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

!function(e,t){if("function"==typeof define&&define.amd)define(["exports"],t);else if("undefined"!=typeof exports)t(exports);else{var o={};t(o),e.bodyScrollLock=o}}(this,function(exports){"use strict";function r(e){if(Array.isArray(e)){for(var t=0,o=Array(e.length);t<e.length;t++)o[t]=e[t];return o}return Array.from(e)}Object.defineProperty(exports,"__esModule",{value:!0});var l=!1;if("undefined"!=typeof window){var e={get passive(){l=!0}};window.addEventListener("testPassive",null,e),window.removeEventListener("testPassive",null,e)}var d="undefined"!=typeof window&&window.navigator&&window.navigator.platform&&/iP(ad|hone|od)/.test(window.navigator.platform),c=[],u=!1,a=-1,s=void 0,v=void 0,f=function(t){return c.some(function(e){return!(!e.options.allowTouchMove||!e.options.allowTouchMove(t))})},m=function(e){var t=e||window.event;return!!f(t.target)||(1<t.touches.length||(t.preventDefault&&t.preventDefault(),!1))},o=function(){setTimeout(function(){void 0!==v&&(document.body.style.paddingRight=v,v=void 0),void 0!==s&&(document.body.style.overflow=s,s=void 0)})};exports.disableBodyScroll=function(i,e){if(d){if(!i)return void console.error("disableBodyScroll unsuccessful - targetElement must be provided when calling disableBodyScroll on IOS devices.");if(i&&!c.some(function(e){return e.targetElement===i})){var t={targetElement:i,options:e||{}};c=[].concat(r(c),[t]),i.ontouchstart=function(e){1===e.targetTouches.length&&(a=e.targetTouches[0].clientY)},i.ontouchmove=function(e){var t,o,n,r;1===e.targetTouches.length&&(o=i,r=(t=e).targetTouches[0].clientY-a,!f(t.target)&&(o&&0===o.scrollTop&&0<r?m(t):(n=o)&&n.scrollHeight-n.scrollTop<=n.clientHeight&&r<0?m(t):t.stopPropagation()))},u||(document.addEventListener("touchmove",m,l?{passive:!1}:void 0),u=!0)}}else{n=e,setTimeout(function(){if(void 0===v){var e=!!n&&!0===n.reserveScrollBarGap,t=window.innerWidth-document.documentElement.clientWidth;e&&0<t&&(v=document.body.style.paddingRight,document.body.style.paddingRight=t+"px")}void 0===s&&(s=document.body.style.overflow,document.body.style.overflow="hidden")});var o={targetElement:i,options:e||{}};c=[].concat(r(c),[o])}var n},exports.clearAllBodyScrollLocks=function(){d?(c.forEach(function(e){e.targetElement.ontouchstart=null,e.targetElement.ontouchmove=null}),u&&(document.removeEventListener("touchmove",m,l?{passive:!1}:void 0),u=!1),c=[],a=-1):(o(),c=[])},exports.enableBodyScroll=function(t){if(d){if(!t)return void console.error("enableBodyScroll unsuccessful - targetElement must be provided when calling enableBodyScroll on IOS devices.");t.ontouchstart=null,t.ontouchmove=null,c=c.filter(function(e){return e.targetElement!==t}),u&&0===c.length&&(document.removeEventListener("touchmove",m,l?{passive:!1}:void 0),u=!1)}else 1===c.length&&c[0].targetElement===t?(o(),c=[]):c=c.filter(function(e){return e.targetElement!==t})}});

(function ($) {
	$(document).ready(function () {
		app.init();
	});

	var app = {
		init: function () {
			this.accessibility();
			this.utils();
			// this.agenda();
			this.menu();

			this.carousel();
			console.log('App here!');
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
			var offsetY = '0px';

      var body = document.body;

      body.addEventListener("touchstart", function bodyListner(e) {
      	console.log(e);
          if (e.target.id === "overlay") {
          	e.stopPropagation();
              toggleViewportScrolling(true);
              console.log('false');
          } else {
          	toggleViewportScrolling(false);
          }
      }, false);

      var freezeVp = function(e) {
          e.preventDefault();
      };

      function toggleViewportScrolling (bool) {
          if (bool === true) {
              body.addEventListener("touchmove", freezeVp, false);
          } else {
              body.removeEventListener("touchmove", freezeVp, false);
          }
      }

			// High contrast
			$('#menu-toggle').click(function () {
				$('body').toggleClass('menu-active');

				// offsetY = window.pageYOffset;

				// if ($('body').hasClass('menu-active')) {
				// 	$('body').css({
				// 		'position': 'fixed',
				// 		'top': '-' + offsetY + 'px'
				// 	});
				// }
			})

			$('#menu-wrapper, #menu-toggle').click(function(event){
				event.stopPropagation();
			});

			$('body, .close-menu').click(function(event){
				$('body').removeClass('menu-active');

				// $('body').css({
				// 	'position': 'static',
				// 	'top': 'auto'
				// });

				// console.log(offsetY);

				// document.body.scrollTop = offsetY;
				// document.documentElement.scrollTop = offsetY;
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
		}
	};
})(jQuery);

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiIiwic291cmNlcyI6WyJidW5kbGUuanMiXSwic291cmNlc0NvbnRlbnQiOlsiLyoqIVxuICogQGZpbGVPdmVydmlldyBLaWNrYXNzIGxpYnJhcnkgdG8gY3JlYXRlIGFuZCBwbGFjZSBwb3BwZXJzIG5lYXIgdGhlaXIgcmVmZXJlbmNlIGVsZW1lbnRzLlxuICogQHZlcnNpb24gMS4xNC43XG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IChjKSAyMDE2IEZlZGVyaWNvIFppdm9sbyBhbmQgY29udHJpYnV0b3JzXG4gKlxuICogUGVybWlzc2lvbiBpcyBoZXJlYnkgZ3JhbnRlZCwgZnJlZSBvZiBjaGFyZ2UsIHRvIGFueSBwZXJzb24gb2J0YWluaW5nIGEgY29weVxuICogb2YgdGhpcyBzb2Z0d2FyZSBhbmQgYXNzb2NpYXRlZCBkb2N1bWVudGF0aW9uIGZpbGVzICh0aGUgXCJTb2Z0d2FyZVwiKSwgdG8gZGVhbFxuICogaW4gdGhlIFNvZnR3YXJlIHdpdGhvdXQgcmVzdHJpY3Rpb24sIGluY2x1ZGluZyB3aXRob3V0IGxpbWl0YXRpb24gdGhlIHJpZ2h0c1xuICogdG8gdXNlLCBjb3B5LCBtb2RpZnksIG1lcmdlLCBwdWJsaXNoLCBkaXN0cmlidXRlLCBzdWJsaWNlbnNlLCBhbmQvb3Igc2VsbFxuICogY29waWVzIG9mIHRoZSBTb2Z0d2FyZSwgYW5kIHRvIHBlcm1pdCBwZXJzb25zIHRvIHdob20gdGhlIFNvZnR3YXJlIGlzXG4gKiBmdXJuaXNoZWQgdG8gZG8gc28sIHN1YmplY3QgdG8gdGhlIGZvbGxvd2luZyBjb25kaXRpb25zOlxuICpcbiAqIFRoZSBhYm92ZSBjb3B5cmlnaHQgbm90aWNlIGFuZCB0aGlzIHBlcm1pc3Npb24gbm90aWNlIHNoYWxsIGJlIGluY2x1ZGVkIGluIGFsbFxuICogY29waWVzIG9yIHN1YnN0YW50aWFsIHBvcnRpb25zIG9mIHRoZSBTb2Z0d2FyZS5cbiAqXG4gKiBUSEUgU09GVFdBUkUgSVMgUFJPVklERUQgXCJBUyBJU1wiLCBXSVRIT1VUIFdBUlJBTlRZIE9GIEFOWSBLSU5ELCBFWFBSRVNTIE9SXG4gKiBJTVBMSUVELCBJTkNMVURJTkcgQlVUIE5PVCBMSU1JVEVEIFRPIFRIRSBXQVJSQU5USUVTIE9GIE1FUkNIQU5UQUJJTElUWSxcbiAqIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFIEFORCBOT05JTkZSSU5HRU1FTlQuIElOIE5PIEVWRU5UIFNIQUxMIFRIRVxuICogQVVUSE9SUyBPUiBDT1BZUklHSFQgSE9MREVSUyBCRSBMSUFCTEUgRk9SIEFOWSBDTEFJTSwgREFNQUdFUyBPUiBPVEhFUlxuICogTElBQklMSVRZLCBXSEVUSEVSIElOIEFOIEFDVElPTiBPRiBDT05UUkFDVCwgVE9SVCBPUiBPVEhFUldJU0UsIEFSSVNJTkcgRlJPTSxcbiAqIE9VVCBPRiBPUiBJTiBDT05ORUNUSU9OIFdJVEggVEhFIFNPRlRXQVJFIE9SIFRIRSBVU0UgT1IgT1RIRVIgREVBTElOR1MgSU4gVEhFXG4gKiBTT0ZUV0FSRS5cbiAqL1xuKGZ1bmN0aW9uIChnbG9iYWwsIGZhY3RvcnkpIHtcblx0dHlwZW9mIGV4cG9ydHMgPT09ICdvYmplY3QnICYmIHR5cGVvZiBtb2R1bGUgIT09ICd1bmRlZmluZWQnID8gbW9kdWxlLmV4cG9ydHMgPSBmYWN0b3J5KCkgOlxuXHR0eXBlb2YgZGVmaW5lID09PSAnZnVuY3Rpb24nICYmIGRlZmluZS5hbWQgPyBkZWZpbmUoZmFjdG9yeSkgOlxuXHQoZ2xvYmFsLlBvcHBlciA9IGZhY3RvcnkoKSk7XG59KHRoaXMsIChmdW5jdGlvbiAoKSB7ICd1c2Ugc3RyaWN0JztcblxudmFyIGlzQnJvd3NlciA9IHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnICYmIHR5cGVvZiBkb2N1bWVudCAhPT0gJ3VuZGVmaW5lZCc7XG5cbnZhciBsb25nZXJUaW1lb3V0QnJvd3NlcnMgPSBbJ0VkZ2UnLCAnVHJpZGVudCcsICdGaXJlZm94J107XG52YXIgdGltZW91dER1cmF0aW9uID0gMDtcbmZvciAodmFyIGkgPSAwOyBpIDwgbG9uZ2VyVGltZW91dEJyb3dzZXJzLmxlbmd0aDsgaSArPSAxKSB7XG4gIGlmIChpc0Jyb3dzZXIgJiYgbmF2aWdhdG9yLnVzZXJBZ2VudC5pbmRleE9mKGxvbmdlclRpbWVvdXRCcm93c2Vyc1tpXSkgPj0gMCkge1xuICAgIHRpbWVvdXREdXJhdGlvbiA9IDE7XG4gICAgYnJlYWs7XG4gIH1cbn1cblxuZnVuY3Rpb24gbWljcm90YXNrRGVib3VuY2UoZm4pIHtcbiAgdmFyIGNhbGxlZCA9IGZhbHNlO1xuICByZXR1cm4gZnVuY3Rpb24gKCkge1xuICAgIGlmIChjYWxsZWQpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgY2FsbGVkID0gdHJ1ZTtcbiAgICB3aW5kb3cuUHJvbWlzZS5yZXNvbHZlKCkudGhlbihmdW5jdGlvbiAoKSB7XG4gICAgICBjYWxsZWQgPSBmYWxzZTtcbiAgICAgIGZuKCk7XG4gICAgfSk7XG4gIH07XG59XG5cbmZ1bmN0aW9uIHRhc2tEZWJvdW5jZShmbikge1xuICB2YXIgc2NoZWR1bGVkID0gZmFsc2U7XG4gIHJldHVybiBmdW5jdGlvbiAoKSB7XG4gICAgaWYgKCFzY2hlZHVsZWQpIHtcbiAgICAgIHNjaGVkdWxlZCA9IHRydWU7XG4gICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uICgpIHtcbiAgICAgICAgc2NoZWR1bGVkID0gZmFsc2U7XG4gICAgICAgIGZuKCk7XG4gICAgICB9LCB0aW1lb3V0RHVyYXRpb24pO1xuICAgIH1cbiAgfTtcbn1cblxudmFyIHN1cHBvcnRzTWljcm9UYXNrcyA9IGlzQnJvd3NlciAmJiB3aW5kb3cuUHJvbWlzZTtcblxuLyoqXG4qIENyZWF0ZSBhIGRlYm91bmNlZCB2ZXJzaW9uIG9mIGEgbWV0aG9kLCB0aGF0J3MgYXN5bmNocm9ub3VzbHkgZGVmZXJyZWRcbiogYnV0IGNhbGxlZCBpbiB0aGUgbWluaW11bSB0aW1lIHBvc3NpYmxlLlxuKlxuKiBAbWV0aG9kXG4qIEBtZW1iZXJvZiBQb3BwZXIuVXRpbHNcbiogQGFyZ3VtZW50IHtGdW5jdGlvbn0gZm5cbiogQHJldHVybnMge0Z1bmN0aW9ufVxuKi9cbnZhciBkZWJvdW5jZSA9IHN1cHBvcnRzTWljcm9UYXNrcyA/IG1pY3JvdGFza0RlYm91bmNlIDogdGFza0RlYm91bmNlO1xuXG4vKipcbiAqIENoZWNrIGlmIHRoZSBnaXZlbiB2YXJpYWJsZSBpcyBhIGZ1bmN0aW9uXG4gKiBAbWV0aG9kXG4gKiBAbWVtYmVyb2YgUG9wcGVyLlV0aWxzXG4gKiBAYXJndW1lbnQge0FueX0gZnVuY3Rpb25Ub0NoZWNrIC0gdmFyaWFibGUgdG8gY2hlY2tcbiAqIEByZXR1cm5zIHtCb29sZWFufSBhbnN3ZXIgdG86IGlzIGEgZnVuY3Rpb24/XG4gKi9cbmZ1bmN0aW9uIGlzRnVuY3Rpb24oZnVuY3Rpb25Ub0NoZWNrKSB7XG4gIHZhciBnZXRUeXBlID0ge307XG4gIHJldHVybiBmdW5jdGlvblRvQ2hlY2sgJiYgZ2V0VHlwZS50b1N0cmluZy5jYWxsKGZ1bmN0aW9uVG9DaGVjaykgPT09ICdbb2JqZWN0IEZ1bmN0aW9uXSc7XG59XG5cbi8qKlxuICogR2V0IENTUyBjb21wdXRlZCBwcm9wZXJ0eSBvZiB0aGUgZ2l2ZW4gZWxlbWVudFxuICogQG1ldGhvZFxuICogQG1lbWJlcm9mIFBvcHBlci5VdGlsc1xuICogQGFyZ3VtZW50IHtFZW1lbnR9IGVsZW1lbnRcbiAqIEBhcmd1bWVudCB7U3RyaW5nfSBwcm9wZXJ0eVxuICovXG5mdW5jdGlvbiBnZXRTdHlsZUNvbXB1dGVkUHJvcGVydHkoZWxlbWVudCwgcHJvcGVydHkpIHtcbiAgaWYgKGVsZW1lbnQubm9kZVR5cGUgIT09IDEpIHtcbiAgICByZXR1cm4gW107XG4gIH1cbiAgLy8gTk9URTogMSBET00gYWNjZXNzIGhlcmVcbiAgdmFyIHdpbmRvdyA9IGVsZW1lbnQub3duZXJEb2N1bWVudC5kZWZhdWx0VmlldztcbiAgdmFyIGNzcyA9IHdpbmRvdy5nZXRDb21wdXRlZFN0eWxlKGVsZW1lbnQsIG51bGwpO1xuICByZXR1cm4gcHJvcGVydHkgPyBjc3NbcHJvcGVydHldIDogY3NzO1xufVxuXG4vKipcbiAqIFJldHVybnMgdGhlIHBhcmVudE5vZGUgb3IgdGhlIGhvc3Qgb2YgdGhlIGVsZW1lbnRcbiAqIEBtZXRob2RcbiAqIEBtZW1iZXJvZiBQb3BwZXIuVXRpbHNcbiAqIEBhcmd1bWVudCB7RWxlbWVudH0gZWxlbWVudFxuICogQHJldHVybnMge0VsZW1lbnR9IHBhcmVudFxuICovXG5mdW5jdGlvbiBnZXRQYXJlbnROb2RlKGVsZW1lbnQpIHtcbiAgaWYgKGVsZW1lbnQubm9kZU5hbWUgPT09ICdIVE1MJykge1xuICAgIHJldHVybiBlbGVtZW50O1xuICB9XG4gIHJldHVybiBlbGVtZW50LnBhcmVudE5vZGUgfHwgZWxlbWVudC5ob3N0O1xufVxuXG4vKipcbiAqIFJldHVybnMgdGhlIHNjcm9sbGluZyBwYXJlbnQgb2YgdGhlIGdpdmVuIGVsZW1lbnRcbiAqIEBtZXRob2RcbiAqIEBtZW1iZXJvZiBQb3BwZXIuVXRpbHNcbiAqIEBhcmd1bWVudCB7RWxlbWVudH0gZWxlbWVudFxuICogQHJldHVybnMge0VsZW1lbnR9IHNjcm9sbCBwYXJlbnRcbiAqL1xuZnVuY3Rpb24gZ2V0U2Nyb2xsUGFyZW50KGVsZW1lbnQpIHtcbiAgLy8gUmV0dXJuIGJvZHksIGBnZXRTY3JvbGxgIHdpbGwgdGFrZSBjYXJlIHRvIGdldCB0aGUgY29ycmVjdCBgc2Nyb2xsVG9wYCBmcm9tIGl0XG4gIGlmICghZWxlbWVudCkge1xuICAgIHJldHVybiBkb2N1bWVudC5ib2R5O1xuICB9XG5cbiAgc3dpdGNoIChlbGVtZW50Lm5vZGVOYW1lKSB7XG4gICAgY2FzZSAnSFRNTCc6XG4gICAgY2FzZSAnQk9EWSc6XG4gICAgICByZXR1cm4gZWxlbWVudC5vd25lckRvY3VtZW50LmJvZHk7XG4gICAgY2FzZSAnI2RvY3VtZW50JzpcbiAgICAgIHJldHVybiBlbGVtZW50LmJvZHk7XG4gIH1cblxuICAvLyBGaXJlZm94IHdhbnQgdXMgdG8gY2hlY2sgYC14YCBhbmQgYC15YCB2YXJpYXRpb25zIGFzIHdlbGxcblxuICB2YXIgX2dldFN0eWxlQ29tcHV0ZWRQcm9wID0gZ2V0U3R5bGVDb21wdXRlZFByb3BlcnR5KGVsZW1lbnQpLFxuICAgICAgb3ZlcmZsb3cgPSBfZ2V0U3R5bGVDb21wdXRlZFByb3Aub3ZlcmZsb3csXG4gICAgICBvdmVyZmxvd1ggPSBfZ2V0U3R5bGVDb21wdXRlZFByb3Aub3ZlcmZsb3dYLFxuICAgICAgb3ZlcmZsb3dZID0gX2dldFN0eWxlQ29tcHV0ZWRQcm9wLm92ZXJmbG93WTtcblxuICBpZiAoLyhhdXRvfHNjcm9sbHxvdmVybGF5KS8udGVzdChvdmVyZmxvdyArIG92ZXJmbG93WSArIG92ZXJmbG93WCkpIHtcbiAgICByZXR1cm4gZWxlbWVudDtcbiAgfVxuXG4gIHJldHVybiBnZXRTY3JvbGxQYXJlbnQoZ2V0UGFyZW50Tm9kZShlbGVtZW50KSk7XG59XG5cbnZhciBpc0lFMTEgPSBpc0Jyb3dzZXIgJiYgISEod2luZG93Lk1TSW5wdXRNZXRob2RDb250ZXh0ICYmIGRvY3VtZW50LmRvY3VtZW50TW9kZSk7XG52YXIgaXNJRTEwID0gaXNCcm93c2VyICYmIC9NU0lFIDEwLy50ZXN0KG5hdmlnYXRvci51c2VyQWdlbnQpO1xuXG4vKipcbiAqIERldGVybWluZXMgaWYgdGhlIGJyb3dzZXIgaXMgSW50ZXJuZXQgRXhwbG9yZXJcbiAqIEBtZXRob2RcbiAqIEBtZW1iZXJvZiBQb3BwZXIuVXRpbHNcbiAqIEBwYXJhbSB7TnVtYmVyfSB2ZXJzaW9uIHRvIGNoZWNrXG4gKiBAcmV0dXJucyB7Qm9vbGVhbn0gaXNJRVxuICovXG5mdW5jdGlvbiBpc0lFKHZlcnNpb24pIHtcbiAgaWYgKHZlcnNpb24gPT09IDExKSB7XG4gICAgcmV0dXJuIGlzSUUxMTtcbiAgfVxuICBpZiAodmVyc2lvbiA9PT0gMTApIHtcbiAgICByZXR1cm4gaXNJRTEwO1xuICB9XG4gIHJldHVybiBpc0lFMTEgfHwgaXNJRTEwO1xufVxuXG4vKipcbiAqIFJldHVybnMgdGhlIG9mZnNldCBwYXJlbnQgb2YgdGhlIGdpdmVuIGVsZW1lbnRcbiAqIEBtZXRob2RcbiAqIEBtZW1iZXJvZiBQb3BwZXIuVXRpbHNcbiAqIEBhcmd1bWVudCB7RWxlbWVudH0gZWxlbWVudFxuICogQHJldHVybnMge0VsZW1lbnR9IG9mZnNldCBwYXJlbnRcbiAqL1xuZnVuY3Rpb24gZ2V0T2Zmc2V0UGFyZW50KGVsZW1lbnQpIHtcbiAgaWYgKCFlbGVtZW50KSB7XG4gICAgcmV0dXJuIGRvY3VtZW50LmRvY3VtZW50RWxlbWVudDtcbiAgfVxuXG4gIHZhciBub09mZnNldFBhcmVudCA9IGlzSUUoMTApID8gZG9jdW1lbnQuYm9keSA6IG51bGw7XG5cbiAgLy8gTk9URTogMSBET00gYWNjZXNzIGhlcmVcbiAgdmFyIG9mZnNldFBhcmVudCA9IGVsZW1lbnQub2Zmc2V0UGFyZW50IHx8IG51bGw7XG4gIC8vIFNraXAgaGlkZGVuIGVsZW1lbnRzIHdoaWNoIGRvbid0IGhhdmUgYW4gb2Zmc2V0UGFyZW50XG4gIHdoaWxlIChvZmZzZXRQYXJlbnQgPT09IG5vT2Zmc2V0UGFyZW50ICYmIGVsZW1lbnQubmV4dEVsZW1lbnRTaWJsaW5nKSB7XG4gICAgb2Zmc2V0UGFyZW50ID0gKGVsZW1lbnQgPSBlbGVtZW50Lm5leHRFbGVtZW50U2libGluZykub2Zmc2V0UGFyZW50O1xuICB9XG5cbiAgdmFyIG5vZGVOYW1lID0gb2Zmc2V0UGFyZW50ICYmIG9mZnNldFBhcmVudC5ub2RlTmFtZTtcblxuICBpZiAoIW5vZGVOYW1lIHx8IG5vZGVOYW1lID09PSAnQk9EWScgfHwgbm9kZU5hbWUgPT09ICdIVE1MJykge1xuICAgIHJldHVybiBlbGVtZW50ID8gZWxlbWVudC5vd25lckRvY3VtZW50LmRvY3VtZW50RWxlbWVudCA6IGRvY3VtZW50LmRvY3VtZW50RWxlbWVudDtcbiAgfVxuXG4gIC8vIC5vZmZzZXRQYXJlbnQgd2lsbCByZXR1cm4gdGhlIGNsb3Nlc3QgVEgsIFREIG9yIFRBQkxFIGluIGNhc2VcbiAgLy8gbm8gb2Zmc2V0UGFyZW50IGlzIHByZXNlbnQsIEkgaGF0ZSB0aGlzIGpvYi4uLlxuICBpZiAoWydUSCcsICdURCcsICdUQUJMRSddLmluZGV4T2Yob2Zmc2V0UGFyZW50Lm5vZGVOYW1lKSAhPT0gLTEgJiYgZ2V0U3R5bGVDb21wdXRlZFByb3BlcnR5KG9mZnNldFBhcmVudCwgJ3Bvc2l0aW9uJykgPT09ICdzdGF0aWMnKSB7XG4gICAgcmV0dXJuIGdldE9mZnNldFBhcmVudChvZmZzZXRQYXJlbnQpO1xuICB9XG5cbiAgcmV0dXJuIG9mZnNldFBhcmVudDtcbn1cblxuZnVuY3Rpb24gaXNPZmZzZXRDb250YWluZXIoZWxlbWVudCkge1xuICB2YXIgbm9kZU5hbWUgPSBlbGVtZW50Lm5vZGVOYW1lO1xuXG4gIGlmIChub2RlTmFtZSA9PT0gJ0JPRFknKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG4gIHJldHVybiBub2RlTmFtZSA9PT0gJ0hUTUwnIHx8IGdldE9mZnNldFBhcmVudChlbGVtZW50LmZpcnN0RWxlbWVudENoaWxkKSA9PT0gZWxlbWVudDtcbn1cblxuLyoqXG4gKiBGaW5kcyB0aGUgcm9vdCBub2RlIChkb2N1bWVudCwgc2hhZG93RE9NIHJvb3QpIG9mIHRoZSBnaXZlbiBlbGVtZW50XG4gKiBAbWV0aG9kXG4gKiBAbWVtYmVyb2YgUG9wcGVyLlV0aWxzXG4gKiBAYXJndW1lbnQge0VsZW1lbnR9IG5vZGVcbiAqIEByZXR1cm5zIHtFbGVtZW50fSByb290IG5vZGVcbiAqL1xuZnVuY3Rpb24gZ2V0Um9vdChub2RlKSB7XG4gIGlmIChub2RlLnBhcmVudE5vZGUgIT09IG51bGwpIHtcbiAgICByZXR1cm4gZ2V0Um9vdChub2RlLnBhcmVudE5vZGUpO1xuICB9XG5cbiAgcmV0dXJuIG5vZGU7XG59XG5cbi8qKlxuICogRmluZHMgdGhlIG9mZnNldCBwYXJlbnQgY29tbW9uIHRvIHRoZSB0d28gcHJvdmlkZWQgbm9kZXNcbiAqIEBtZXRob2RcbiAqIEBtZW1iZXJvZiBQb3BwZXIuVXRpbHNcbiAqIEBhcmd1bWVudCB7RWxlbWVudH0gZWxlbWVudDFcbiAqIEBhcmd1bWVudCB7RWxlbWVudH0gZWxlbWVudDJcbiAqIEByZXR1cm5zIHtFbGVtZW50fSBjb21tb24gb2Zmc2V0IHBhcmVudFxuICovXG5mdW5jdGlvbiBmaW5kQ29tbW9uT2Zmc2V0UGFyZW50KGVsZW1lbnQxLCBlbGVtZW50Mikge1xuICAvLyBUaGlzIGNoZWNrIGlzIG5lZWRlZCB0byBhdm9pZCBlcnJvcnMgaW4gY2FzZSBvbmUgb2YgdGhlIGVsZW1lbnRzIGlzbid0IGRlZmluZWQgZm9yIGFueSByZWFzb25cbiAgaWYgKCFlbGVtZW50MSB8fCAhZWxlbWVudDEubm9kZVR5cGUgfHwgIWVsZW1lbnQyIHx8ICFlbGVtZW50Mi5ub2RlVHlwZSkge1xuICAgIHJldHVybiBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQ7XG4gIH1cblxuICAvLyBIZXJlIHdlIG1ha2Ugc3VyZSB0byBnaXZlIGFzIFwic3RhcnRcIiB0aGUgZWxlbWVudCB0aGF0IGNvbWVzIGZpcnN0IGluIHRoZSBET01cbiAgdmFyIG9yZGVyID0gZWxlbWVudDEuY29tcGFyZURvY3VtZW50UG9zaXRpb24oZWxlbWVudDIpICYgTm9kZS5ET0NVTUVOVF9QT1NJVElPTl9GT0xMT1dJTkc7XG4gIHZhciBzdGFydCA9IG9yZGVyID8gZWxlbWVudDEgOiBlbGVtZW50MjtcbiAgdmFyIGVuZCA9IG9yZGVyID8gZWxlbWVudDIgOiBlbGVtZW50MTtcblxuICAvLyBHZXQgY29tbW9uIGFuY2VzdG9yIGNvbnRhaW5lclxuICB2YXIgcmFuZ2UgPSBkb2N1bWVudC5jcmVhdGVSYW5nZSgpO1xuICByYW5nZS5zZXRTdGFydChzdGFydCwgMCk7XG4gIHJhbmdlLnNldEVuZChlbmQsIDApO1xuICB2YXIgY29tbW9uQW5jZXN0b3JDb250YWluZXIgPSByYW5nZS5jb21tb25BbmNlc3RvckNvbnRhaW5lcjtcblxuICAvLyBCb3RoIG5vZGVzIGFyZSBpbnNpZGUgI2RvY3VtZW50XG5cbiAgaWYgKGVsZW1lbnQxICE9PSBjb21tb25BbmNlc3RvckNvbnRhaW5lciAmJiBlbGVtZW50MiAhPT0gY29tbW9uQW5jZXN0b3JDb250YWluZXIgfHwgc3RhcnQuY29udGFpbnMoZW5kKSkge1xuICAgIGlmIChpc09mZnNldENvbnRhaW5lcihjb21tb25BbmNlc3RvckNvbnRhaW5lcikpIHtcbiAgICAgIHJldHVybiBjb21tb25BbmNlc3RvckNvbnRhaW5lcjtcbiAgICB9XG5cbiAgICByZXR1cm4gZ2V0T2Zmc2V0UGFyZW50KGNvbW1vbkFuY2VzdG9yQ29udGFpbmVyKTtcbiAgfVxuXG4gIC8vIG9uZSBvZiB0aGUgbm9kZXMgaXMgaW5zaWRlIHNoYWRvd0RPTSwgZmluZCB3aGljaCBvbmVcbiAgdmFyIGVsZW1lbnQxcm9vdCA9IGdldFJvb3QoZWxlbWVudDEpO1xuICBpZiAoZWxlbWVudDFyb290Lmhvc3QpIHtcbiAgICByZXR1cm4gZmluZENvbW1vbk9mZnNldFBhcmVudChlbGVtZW50MXJvb3QuaG9zdCwgZWxlbWVudDIpO1xuICB9IGVsc2Uge1xuICAgIHJldHVybiBmaW5kQ29tbW9uT2Zmc2V0UGFyZW50KGVsZW1lbnQxLCBnZXRSb290KGVsZW1lbnQyKS5ob3N0KTtcbiAgfVxufVxuXG4vKipcbiAqIEdldHMgdGhlIHNjcm9sbCB2YWx1ZSBvZiB0aGUgZ2l2ZW4gZWxlbWVudCBpbiB0aGUgZ2l2ZW4gc2lkZSAodG9wIGFuZCBsZWZ0KVxuICogQG1ldGhvZFxuICogQG1lbWJlcm9mIFBvcHBlci5VdGlsc1xuICogQGFyZ3VtZW50IHtFbGVtZW50fSBlbGVtZW50XG4gKiBAYXJndW1lbnQge1N0cmluZ30gc2lkZSBgdG9wYCBvciBgbGVmdGBcbiAqIEByZXR1cm5zIHtudW1iZXJ9IGFtb3VudCBvZiBzY3JvbGxlZCBwaXhlbHNcbiAqL1xuZnVuY3Rpb24gZ2V0U2Nyb2xsKGVsZW1lbnQpIHtcbiAgdmFyIHNpZGUgPSBhcmd1bWVudHMubGVuZ3RoID4gMSAmJiBhcmd1bWVudHNbMV0gIT09IHVuZGVmaW5lZCA/IGFyZ3VtZW50c1sxXSA6ICd0b3AnO1xuXG4gIHZhciB1cHBlclNpZGUgPSBzaWRlID09PSAndG9wJyA/ICdzY3JvbGxUb3AnIDogJ3Njcm9sbExlZnQnO1xuICB2YXIgbm9kZU5hbWUgPSBlbGVtZW50Lm5vZGVOYW1lO1xuXG4gIGlmIChub2RlTmFtZSA9PT0gJ0JPRFknIHx8IG5vZGVOYW1lID09PSAnSFRNTCcpIHtcbiAgICB2YXIgaHRtbCA9IGVsZW1lbnQub3duZXJEb2N1bWVudC5kb2N1bWVudEVsZW1lbnQ7XG4gICAgdmFyIHNjcm9sbGluZ0VsZW1lbnQgPSBlbGVtZW50Lm93bmVyRG9jdW1lbnQuc2Nyb2xsaW5nRWxlbWVudCB8fCBodG1sO1xuICAgIHJldHVybiBzY3JvbGxpbmdFbGVtZW50W3VwcGVyU2lkZV07XG4gIH1cblxuICByZXR1cm4gZWxlbWVudFt1cHBlclNpZGVdO1xufVxuXG4vKlxuICogU3VtIG9yIHN1YnRyYWN0IHRoZSBlbGVtZW50IHNjcm9sbCB2YWx1ZXMgKGxlZnQgYW5kIHRvcCkgZnJvbSBhIGdpdmVuIHJlY3Qgb2JqZWN0XG4gKiBAbWV0aG9kXG4gKiBAbWVtYmVyb2YgUG9wcGVyLlV0aWxzXG4gKiBAcGFyYW0ge09iamVjdH0gcmVjdCAtIFJlY3Qgb2JqZWN0IHlvdSB3YW50IHRvIGNoYW5nZVxuICogQHBhcmFtIHtIVE1MRWxlbWVudH0gZWxlbWVudCAtIFRoZSBlbGVtZW50IGZyb20gdGhlIGZ1bmN0aW9uIHJlYWRzIHRoZSBzY3JvbGwgdmFsdWVzXG4gKiBAcGFyYW0ge0Jvb2xlYW59IHN1YnRyYWN0IC0gc2V0IHRvIHRydWUgaWYgeW91IHdhbnQgdG8gc3VidHJhY3QgdGhlIHNjcm9sbCB2YWx1ZXNcbiAqIEByZXR1cm4ge09iamVjdH0gcmVjdCAtIFRoZSBtb2RpZmllciByZWN0IG9iamVjdFxuICovXG5mdW5jdGlvbiBpbmNsdWRlU2Nyb2xsKHJlY3QsIGVsZW1lbnQpIHtcbiAgdmFyIHN1YnRyYWN0ID0gYXJndW1lbnRzLmxlbmd0aCA+IDIgJiYgYXJndW1lbnRzWzJdICE9PSB1bmRlZmluZWQgPyBhcmd1bWVudHNbMl0gOiBmYWxzZTtcblxuICB2YXIgc2Nyb2xsVG9wID0gZ2V0U2Nyb2xsKGVsZW1lbnQsICd0b3AnKTtcbiAgdmFyIHNjcm9sbExlZnQgPSBnZXRTY3JvbGwoZWxlbWVudCwgJ2xlZnQnKTtcbiAgdmFyIG1vZGlmaWVyID0gc3VidHJhY3QgPyAtMSA6IDE7XG4gIHJlY3QudG9wICs9IHNjcm9sbFRvcCAqIG1vZGlmaWVyO1xuICByZWN0LmJvdHRvbSArPSBzY3JvbGxUb3AgKiBtb2RpZmllcjtcbiAgcmVjdC5sZWZ0ICs9IHNjcm9sbExlZnQgKiBtb2RpZmllcjtcbiAgcmVjdC5yaWdodCArPSBzY3JvbGxMZWZ0ICogbW9kaWZpZXI7XG4gIHJldHVybiByZWN0O1xufVxuXG4vKlxuICogSGVscGVyIHRvIGRldGVjdCBib3JkZXJzIG9mIGEgZ2l2ZW4gZWxlbWVudFxuICogQG1ldGhvZFxuICogQG1lbWJlcm9mIFBvcHBlci5VdGlsc1xuICogQHBhcmFtIHtDU1NTdHlsZURlY2xhcmF0aW9ufSBzdHlsZXNcbiAqIFJlc3VsdCBvZiBgZ2V0U3R5bGVDb21wdXRlZFByb3BlcnR5YCBvbiB0aGUgZ2l2ZW4gZWxlbWVudFxuICogQHBhcmFtIHtTdHJpbmd9IGF4aXMgLSBgeGAgb3IgYHlgXG4gKiBAcmV0dXJuIHtudW1iZXJ9IGJvcmRlcnMgLSBUaGUgYm9yZGVycyBzaXplIG9mIHRoZSBnaXZlbiBheGlzXG4gKi9cblxuZnVuY3Rpb24gZ2V0Qm9yZGVyc1NpemUoc3R5bGVzLCBheGlzKSB7XG4gIHZhciBzaWRlQSA9IGF4aXMgPT09ICd4JyA/ICdMZWZ0JyA6ICdUb3AnO1xuICB2YXIgc2lkZUIgPSBzaWRlQSA9PT0gJ0xlZnQnID8gJ1JpZ2h0JyA6ICdCb3R0b20nO1xuXG4gIHJldHVybiBwYXJzZUZsb2F0KHN0eWxlc1snYm9yZGVyJyArIHNpZGVBICsgJ1dpZHRoJ10sIDEwKSArIHBhcnNlRmxvYXQoc3R5bGVzWydib3JkZXInICsgc2lkZUIgKyAnV2lkdGgnXSwgMTApO1xufVxuXG5mdW5jdGlvbiBnZXRTaXplKGF4aXMsIGJvZHksIGh0bWwsIGNvbXB1dGVkU3R5bGUpIHtcbiAgcmV0dXJuIE1hdGgubWF4KGJvZHlbJ29mZnNldCcgKyBheGlzXSwgYm9keVsnc2Nyb2xsJyArIGF4aXNdLCBodG1sWydjbGllbnQnICsgYXhpc10sIGh0bWxbJ29mZnNldCcgKyBheGlzXSwgaHRtbFsnc2Nyb2xsJyArIGF4aXNdLCBpc0lFKDEwKSA/IHBhcnNlSW50KGh0bWxbJ29mZnNldCcgKyBheGlzXSkgKyBwYXJzZUludChjb21wdXRlZFN0eWxlWydtYXJnaW4nICsgKGF4aXMgPT09ICdIZWlnaHQnID8gJ1RvcCcgOiAnTGVmdCcpXSkgKyBwYXJzZUludChjb21wdXRlZFN0eWxlWydtYXJnaW4nICsgKGF4aXMgPT09ICdIZWlnaHQnID8gJ0JvdHRvbScgOiAnUmlnaHQnKV0pIDogMCk7XG59XG5cbmZ1bmN0aW9uIGdldFdpbmRvd1NpemVzKGRvY3VtZW50KSB7XG4gIHZhciBib2R5ID0gZG9jdW1lbnQuYm9keTtcbiAgdmFyIGh0bWwgPSBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQ7XG4gIHZhciBjb21wdXRlZFN0eWxlID0gaXNJRSgxMCkgJiYgZ2V0Q29tcHV0ZWRTdHlsZShodG1sKTtcblxuICByZXR1cm4ge1xuICAgIGhlaWdodDogZ2V0U2l6ZSgnSGVpZ2h0JywgYm9keSwgaHRtbCwgY29tcHV0ZWRTdHlsZSksXG4gICAgd2lkdGg6IGdldFNpemUoJ1dpZHRoJywgYm9keSwgaHRtbCwgY29tcHV0ZWRTdHlsZSlcbiAgfTtcbn1cblxudmFyIGNsYXNzQ2FsbENoZWNrID0gZnVuY3Rpb24gKGluc3RhbmNlLCBDb25zdHJ1Y3Rvcikge1xuICBpZiAoIShpbnN0YW5jZSBpbnN0YW5jZW9mIENvbnN0cnVjdG9yKSkge1xuICAgIHRocm93IG5ldyBUeXBlRXJyb3IoXCJDYW5ub3QgY2FsbCBhIGNsYXNzIGFzIGEgZnVuY3Rpb25cIik7XG4gIH1cbn07XG5cbnZhciBjcmVhdGVDbGFzcyA9IGZ1bmN0aW9uICgpIHtcbiAgZnVuY3Rpb24gZGVmaW5lUHJvcGVydGllcyh0YXJnZXQsIHByb3BzKSB7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBwcm9wcy5sZW5ndGg7IGkrKykge1xuICAgICAgdmFyIGRlc2NyaXB0b3IgPSBwcm9wc1tpXTtcbiAgICAgIGRlc2NyaXB0b3IuZW51bWVyYWJsZSA9IGRlc2NyaXB0b3IuZW51bWVyYWJsZSB8fCBmYWxzZTtcbiAgICAgIGRlc2NyaXB0b3IuY29uZmlndXJhYmxlID0gdHJ1ZTtcbiAgICAgIGlmIChcInZhbHVlXCIgaW4gZGVzY3JpcHRvcikgZGVzY3JpcHRvci53cml0YWJsZSA9IHRydWU7XG4gICAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkodGFyZ2V0LCBkZXNjcmlwdG9yLmtleSwgZGVzY3JpcHRvcik7XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIGZ1bmN0aW9uIChDb25zdHJ1Y3RvciwgcHJvdG9Qcm9wcywgc3RhdGljUHJvcHMpIHtcbiAgICBpZiAocHJvdG9Qcm9wcykgZGVmaW5lUHJvcGVydGllcyhDb25zdHJ1Y3Rvci5wcm90b3R5cGUsIHByb3RvUHJvcHMpO1xuICAgIGlmIChzdGF0aWNQcm9wcykgZGVmaW5lUHJvcGVydGllcyhDb25zdHJ1Y3Rvciwgc3RhdGljUHJvcHMpO1xuICAgIHJldHVybiBDb25zdHJ1Y3RvcjtcbiAgfTtcbn0oKTtcblxuXG5cblxuXG52YXIgZGVmaW5lUHJvcGVydHkgPSBmdW5jdGlvbiAob2JqLCBrZXksIHZhbHVlKSB7XG4gIGlmIChrZXkgaW4gb2JqKSB7XG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KG9iaiwga2V5LCB7XG4gICAgICB2YWx1ZTogdmFsdWUsXG4gICAgICBlbnVtZXJhYmxlOiB0cnVlLFxuICAgICAgY29uZmlndXJhYmxlOiB0cnVlLFxuICAgICAgd3JpdGFibGU6IHRydWVcbiAgICB9KTtcbiAgfSBlbHNlIHtcbiAgICBvYmpba2V5XSA9IHZhbHVlO1xuICB9XG5cbiAgcmV0dXJuIG9iajtcbn07XG5cbnZhciBfZXh0ZW5kcyA9IE9iamVjdC5hc3NpZ24gfHwgZnVuY3Rpb24gKHRhcmdldCkge1xuICBmb3IgKHZhciBpID0gMTsgaSA8IGFyZ3VtZW50cy5sZW5ndGg7IGkrKykge1xuICAgIHZhciBzb3VyY2UgPSBhcmd1bWVudHNbaV07XG5cbiAgICBmb3IgKHZhciBrZXkgaW4gc291cmNlKSB7XG4gICAgICBpZiAoT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKHNvdXJjZSwga2V5KSkge1xuICAgICAgICB0YXJnZXRba2V5XSA9IHNvdXJjZVtrZXldO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiB0YXJnZXQ7XG59O1xuXG4vKipcbiAqIEdpdmVuIGVsZW1lbnQgb2Zmc2V0cywgZ2VuZXJhdGUgYW4gb3V0cHV0IHNpbWlsYXIgdG8gZ2V0Qm91bmRpbmdDbGllbnRSZWN0XG4gKiBAbWV0aG9kXG4gKiBAbWVtYmVyb2YgUG9wcGVyLlV0aWxzXG4gKiBAYXJndW1lbnQge09iamVjdH0gb2Zmc2V0c1xuICogQHJldHVybnMge09iamVjdH0gQ2xpZW50UmVjdCBsaWtlIG91dHB1dFxuICovXG5mdW5jdGlvbiBnZXRDbGllbnRSZWN0KG9mZnNldHMpIHtcbiAgcmV0dXJuIF9leHRlbmRzKHt9LCBvZmZzZXRzLCB7XG4gICAgcmlnaHQ6IG9mZnNldHMubGVmdCArIG9mZnNldHMud2lkdGgsXG4gICAgYm90dG9tOiBvZmZzZXRzLnRvcCArIG9mZnNldHMuaGVpZ2h0XG4gIH0pO1xufVxuXG4vKipcbiAqIEdldCBib3VuZGluZyBjbGllbnQgcmVjdCBvZiBnaXZlbiBlbGVtZW50XG4gKiBAbWV0aG9kXG4gKiBAbWVtYmVyb2YgUG9wcGVyLlV0aWxzXG4gKiBAcGFyYW0ge0hUTUxFbGVtZW50fSBlbGVtZW50XG4gKiBAcmV0dXJuIHtPYmplY3R9IGNsaWVudCByZWN0XG4gKi9cbmZ1bmN0aW9uIGdldEJvdW5kaW5nQ2xpZW50UmVjdChlbGVtZW50KSB7XG4gIHZhciByZWN0ID0ge307XG5cbiAgLy8gSUUxMCAxMCBGSVg6IFBsZWFzZSwgZG9uJ3QgYXNrLCB0aGUgZWxlbWVudCBpc24ndFxuICAvLyBjb25zaWRlcmVkIGluIERPTSBpbiBzb21lIGNpcmN1bXN0YW5jZXMuLi5cbiAgLy8gVGhpcyBpc24ndCByZXByb2R1Y2libGUgaW4gSUUxMCBjb21wYXRpYmlsaXR5IG1vZGUgb2YgSUUxMVxuICB0cnkge1xuICAgIGlmIChpc0lFKDEwKSkge1xuICAgICAgcmVjdCA9IGVsZW1lbnQuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XG4gICAgICB2YXIgc2Nyb2xsVG9wID0gZ2V0U2Nyb2xsKGVsZW1lbnQsICd0b3AnKTtcbiAgICAgIHZhciBzY3JvbGxMZWZ0ID0gZ2V0U2Nyb2xsKGVsZW1lbnQsICdsZWZ0Jyk7XG4gICAgICByZWN0LnRvcCArPSBzY3JvbGxUb3A7XG4gICAgICByZWN0LmxlZnQgKz0gc2Nyb2xsTGVmdDtcbiAgICAgIHJlY3QuYm90dG9tICs9IHNjcm9sbFRvcDtcbiAgICAgIHJlY3QucmlnaHQgKz0gc2Nyb2xsTGVmdDtcbiAgICB9IGVsc2Uge1xuICAgICAgcmVjdCA9IGVsZW1lbnQuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XG4gICAgfVxuICB9IGNhdGNoIChlKSB7fVxuXG4gIHZhciByZXN1bHQgPSB7XG4gICAgbGVmdDogcmVjdC5sZWZ0LFxuICAgIHRvcDogcmVjdC50b3AsXG4gICAgd2lkdGg6IHJlY3QucmlnaHQgLSByZWN0LmxlZnQsXG4gICAgaGVpZ2h0OiByZWN0LmJvdHRvbSAtIHJlY3QudG9wXG4gIH07XG5cbiAgLy8gc3VidHJhY3Qgc2Nyb2xsYmFyIHNpemUgZnJvbSBzaXplc1xuICB2YXIgc2l6ZXMgPSBlbGVtZW50Lm5vZGVOYW1lID09PSAnSFRNTCcgPyBnZXRXaW5kb3dTaXplcyhlbGVtZW50Lm93bmVyRG9jdW1lbnQpIDoge307XG4gIHZhciB3aWR0aCA9IHNpemVzLndpZHRoIHx8IGVsZW1lbnQuY2xpZW50V2lkdGggfHwgcmVzdWx0LnJpZ2h0IC0gcmVzdWx0LmxlZnQ7XG4gIHZhciBoZWlnaHQgPSBzaXplcy5oZWlnaHQgfHwgZWxlbWVudC5jbGllbnRIZWlnaHQgfHwgcmVzdWx0LmJvdHRvbSAtIHJlc3VsdC50b3A7XG5cbiAgdmFyIGhvcml6U2Nyb2xsYmFyID0gZWxlbWVudC5vZmZzZXRXaWR0aCAtIHdpZHRoO1xuICB2YXIgdmVydFNjcm9sbGJhciA9IGVsZW1lbnQub2Zmc2V0SGVpZ2h0IC0gaGVpZ2h0O1xuXG4gIC8vIGlmIGFuIGh5cG90aGV0aWNhbCBzY3JvbGxiYXIgaXMgZGV0ZWN0ZWQsIHdlIG11c3QgYmUgc3VyZSBpdCdzIG5vdCBhIGBib3JkZXJgXG4gIC8vIHdlIG1ha2UgdGhpcyBjaGVjayBjb25kaXRpb25hbCBmb3IgcGVyZm9ybWFuY2UgcmVhc29uc1xuICBpZiAoaG9yaXpTY3JvbGxiYXIgfHwgdmVydFNjcm9sbGJhcikge1xuICAgIHZhciBzdHlsZXMgPSBnZXRTdHlsZUNvbXB1dGVkUHJvcGVydHkoZWxlbWVudCk7XG4gICAgaG9yaXpTY3JvbGxiYXIgLT0gZ2V0Qm9yZGVyc1NpemUoc3R5bGVzLCAneCcpO1xuICAgIHZlcnRTY3JvbGxiYXIgLT0gZ2V0Qm9yZGVyc1NpemUoc3R5bGVzLCAneScpO1xuXG4gICAgcmVzdWx0LndpZHRoIC09IGhvcml6U2Nyb2xsYmFyO1xuICAgIHJlc3VsdC5oZWlnaHQgLT0gdmVydFNjcm9sbGJhcjtcbiAgfVxuXG4gIHJldHVybiBnZXRDbGllbnRSZWN0KHJlc3VsdCk7XG59XG5cbmZ1bmN0aW9uIGdldE9mZnNldFJlY3RSZWxhdGl2ZVRvQXJiaXRyYXJ5Tm9kZShjaGlsZHJlbiwgcGFyZW50KSB7XG4gIHZhciBmaXhlZFBvc2l0aW9uID0gYXJndW1lbnRzLmxlbmd0aCA+IDIgJiYgYXJndW1lbnRzWzJdICE9PSB1bmRlZmluZWQgPyBhcmd1bWVudHNbMl0gOiBmYWxzZTtcblxuICB2YXIgaXNJRTEwID0gaXNJRSgxMCk7XG4gIHZhciBpc0hUTUwgPSBwYXJlbnQubm9kZU5hbWUgPT09ICdIVE1MJztcbiAgdmFyIGNoaWxkcmVuUmVjdCA9IGdldEJvdW5kaW5nQ2xpZW50UmVjdChjaGlsZHJlbik7XG4gIHZhciBwYXJlbnRSZWN0ID0gZ2V0Qm91bmRpbmdDbGllbnRSZWN0KHBhcmVudCk7XG4gIHZhciBzY3JvbGxQYXJlbnQgPSBnZXRTY3JvbGxQYXJlbnQoY2hpbGRyZW4pO1xuXG4gIHZhciBzdHlsZXMgPSBnZXRTdHlsZUNvbXB1dGVkUHJvcGVydHkocGFyZW50KTtcbiAgdmFyIGJvcmRlclRvcFdpZHRoID0gcGFyc2VGbG9hdChzdHlsZXMuYm9yZGVyVG9wV2lkdGgsIDEwKTtcbiAgdmFyIGJvcmRlckxlZnRXaWR0aCA9IHBhcnNlRmxvYXQoc3R5bGVzLmJvcmRlckxlZnRXaWR0aCwgMTApO1xuXG4gIC8vIEluIGNhc2VzIHdoZXJlIHRoZSBwYXJlbnQgaXMgZml4ZWQsIHdlIG11c3QgaWdub3JlIG5lZ2F0aXZlIHNjcm9sbCBpbiBvZmZzZXQgY2FsY1xuICBpZiAoZml4ZWRQb3NpdGlvbiAmJiBpc0hUTUwpIHtcbiAgICBwYXJlbnRSZWN0LnRvcCA9IE1hdGgubWF4KHBhcmVudFJlY3QudG9wLCAwKTtcbiAgICBwYXJlbnRSZWN0LmxlZnQgPSBNYXRoLm1heChwYXJlbnRSZWN0LmxlZnQsIDApO1xuICB9XG4gIHZhciBvZmZzZXRzID0gZ2V0Q2xpZW50UmVjdCh7XG4gICAgdG9wOiBjaGlsZHJlblJlY3QudG9wIC0gcGFyZW50UmVjdC50b3AgLSBib3JkZXJUb3BXaWR0aCxcbiAgICBsZWZ0OiBjaGlsZHJlblJlY3QubGVmdCAtIHBhcmVudFJlY3QubGVmdCAtIGJvcmRlckxlZnRXaWR0aCxcbiAgICB3aWR0aDogY2hpbGRyZW5SZWN0LndpZHRoLFxuICAgIGhlaWdodDogY2hpbGRyZW5SZWN0LmhlaWdodFxuICB9KTtcbiAgb2Zmc2V0cy5tYXJnaW5Ub3AgPSAwO1xuICBvZmZzZXRzLm1hcmdpbkxlZnQgPSAwO1xuXG4gIC8vIFN1YnRyYWN0IG1hcmdpbnMgb2YgZG9jdW1lbnRFbGVtZW50IGluIGNhc2UgaXQncyBiZWluZyB1c2VkIGFzIHBhcmVudFxuICAvLyB3ZSBkbyB0aGlzIG9ubHkgb24gSFRNTCBiZWNhdXNlIGl0J3MgdGhlIG9ubHkgZWxlbWVudCB0aGF0IGJlaGF2ZXNcbiAgLy8gZGlmZmVyZW50bHkgd2hlbiBtYXJnaW5zIGFyZSBhcHBsaWVkIHRvIGl0LiBUaGUgbWFyZ2lucyBhcmUgaW5jbHVkZWQgaW5cbiAgLy8gdGhlIGJveCBvZiB0aGUgZG9jdW1lbnRFbGVtZW50LCBpbiB0aGUgb3RoZXIgY2FzZXMgbm90LlxuICBpZiAoIWlzSUUxMCAmJiBpc0hUTUwpIHtcbiAgICB2YXIgbWFyZ2luVG9wID0gcGFyc2VGbG9hdChzdHlsZXMubWFyZ2luVG9wLCAxMCk7XG4gICAgdmFyIG1hcmdpbkxlZnQgPSBwYXJzZUZsb2F0KHN0eWxlcy5tYXJnaW5MZWZ0LCAxMCk7XG5cbiAgICBvZmZzZXRzLnRvcCAtPSBib3JkZXJUb3BXaWR0aCAtIG1hcmdpblRvcDtcbiAgICBvZmZzZXRzLmJvdHRvbSAtPSBib3JkZXJUb3BXaWR0aCAtIG1hcmdpblRvcDtcbiAgICBvZmZzZXRzLmxlZnQgLT0gYm9yZGVyTGVmdFdpZHRoIC0gbWFyZ2luTGVmdDtcbiAgICBvZmZzZXRzLnJpZ2h0IC09IGJvcmRlckxlZnRXaWR0aCAtIG1hcmdpbkxlZnQ7XG5cbiAgICAvLyBBdHRhY2ggbWFyZ2luVG9wIGFuZCBtYXJnaW5MZWZ0IGJlY2F1c2UgaW4gc29tZSBjaXJjdW1zdGFuY2VzIHdlIG1heSBuZWVkIHRoZW1cbiAgICBvZmZzZXRzLm1hcmdpblRvcCA9IG1hcmdpblRvcDtcbiAgICBvZmZzZXRzLm1hcmdpbkxlZnQgPSBtYXJnaW5MZWZ0O1xuICB9XG5cbiAgaWYgKGlzSUUxMCAmJiAhZml4ZWRQb3NpdGlvbiA/IHBhcmVudC5jb250YWlucyhzY3JvbGxQYXJlbnQpIDogcGFyZW50ID09PSBzY3JvbGxQYXJlbnQgJiYgc2Nyb2xsUGFyZW50Lm5vZGVOYW1lICE9PSAnQk9EWScpIHtcbiAgICBvZmZzZXRzID0gaW5jbHVkZVNjcm9sbChvZmZzZXRzLCBwYXJlbnQpO1xuICB9XG5cbiAgcmV0dXJuIG9mZnNldHM7XG59XG5cbmZ1bmN0aW9uIGdldFZpZXdwb3J0T2Zmc2V0UmVjdFJlbGF0aXZlVG9BcnRiaXRyYXJ5Tm9kZShlbGVtZW50KSB7XG4gIHZhciBleGNsdWRlU2Nyb2xsID0gYXJndW1lbnRzLmxlbmd0aCA+IDEgJiYgYXJndW1lbnRzWzFdICE9PSB1bmRlZmluZWQgPyBhcmd1bWVudHNbMV0gOiBmYWxzZTtcblxuICB2YXIgaHRtbCA9IGVsZW1lbnQub3duZXJEb2N1bWVudC5kb2N1bWVudEVsZW1lbnQ7XG4gIHZhciByZWxhdGl2ZU9mZnNldCA9IGdldE9mZnNldFJlY3RSZWxhdGl2ZVRvQXJiaXRyYXJ5Tm9kZShlbGVtZW50LCBodG1sKTtcbiAgdmFyIHdpZHRoID0gTWF0aC5tYXgoaHRtbC5jbGllbnRXaWR0aCwgd2luZG93LmlubmVyV2lkdGggfHwgMCk7XG4gIHZhciBoZWlnaHQgPSBNYXRoLm1heChodG1sLmNsaWVudEhlaWdodCwgd2luZG93LmlubmVySGVpZ2h0IHx8IDApO1xuXG4gIHZhciBzY3JvbGxUb3AgPSAhZXhjbHVkZVNjcm9sbCA/IGdldFNjcm9sbChodG1sKSA6IDA7XG4gIHZhciBzY3JvbGxMZWZ0ID0gIWV4Y2x1ZGVTY3JvbGwgPyBnZXRTY3JvbGwoaHRtbCwgJ2xlZnQnKSA6IDA7XG5cbiAgdmFyIG9mZnNldCA9IHtcbiAgICB0b3A6IHNjcm9sbFRvcCAtIHJlbGF0aXZlT2Zmc2V0LnRvcCArIHJlbGF0aXZlT2Zmc2V0Lm1hcmdpblRvcCxcbiAgICBsZWZ0OiBzY3JvbGxMZWZ0IC0gcmVsYXRpdmVPZmZzZXQubGVmdCArIHJlbGF0aXZlT2Zmc2V0Lm1hcmdpbkxlZnQsXG4gICAgd2lkdGg6IHdpZHRoLFxuICAgIGhlaWdodDogaGVpZ2h0XG4gIH07XG5cbiAgcmV0dXJuIGdldENsaWVudFJlY3Qob2Zmc2V0KTtcbn1cblxuLyoqXG4gKiBDaGVjayBpZiB0aGUgZ2l2ZW4gZWxlbWVudCBpcyBmaXhlZCBvciBpcyBpbnNpZGUgYSBmaXhlZCBwYXJlbnRcbiAqIEBtZXRob2RcbiAqIEBtZW1iZXJvZiBQb3BwZXIuVXRpbHNcbiAqIEBhcmd1bWVudCB7RWxlbWVudH0gZWxlbWVudFxuICogQGFyZ3VtZW50IHtFbGVtZW50fSBjdXN0b21Db250YWluZXJcbiAqIEByZXR1cm5zIHtCb29sZWFufSBhbnN3ZXIgdG8gXCJpc0ZpeGVkP1wiXG4gKi9cbmZ1bmN0aW9uIGlzRml4ZWQoZWxlbWVudCkge1xuICB2YXIgbm9kZU5hbWUgPSBlbGVtZW50Lm5vZGVOYW1lO1xuICBpZiAobm9kZU5hbWUgPT09ICdCT0RZJyB8fCBub2RlTmFtZSA9PT0gJ0hUTUwnKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG4gIGlmIChnZXRTdHlsZUNvbXB1dGVkUHJvcGVydHkoZWxlbWVudCwgJ3Bvc2l0aW9uJykgPT09ICdmaXhlZCcpIHtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuICB2YXIgcGFyZW50Tm9kZSA9IGdldFBhcmVudE5vZGUoZWxlbWVudCk7XG4gIGlmICghcGFyZW50Tm9kZSkge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuICByZXR1cm4gaXNGaXhlZChwYXJlbnROb2RlKTtcbn1cblxuLyoqXG4gKiBGaW5kcyB0aGUgZmlyc3QgcGFyZW50IG9mIGFuIGVsZW1lbnQgdGhhdCBoYXMgYSB0cmFuc2Zvcm1lZCBwcm9wZXJ0eSBkZWZpbmVkXG4gKiBAbWV0aG9kXG4gKiBAbWVtYmVyb2YgUG9wcGVyLlV0aWxzXG4gKiBAYXJndW1lbnQge0VsZW1lbnR9IGVsZW1lbnRcbiAqIEByZXR1cm5zIHtFbGVtZW50fSBmaXJzdCB0cmFuc2Zvcm1lZCBwYXJlbnQgb3IgZG9jdW1lbnRFbGVtZW50XG4gKi9cblxuZnVuY3Rpb24gZ2V0Rml4ZWRQb3NpdGlvbk9mZnNldFBhcmVudChlbGVtZW50KSB7XG4gIC8vIFRoaXMgY2hlY2sgaXMgbmVlZGVkIHRvIGF2b2lkIGVycm9ycyBpbiBjYXNlIG9uZSBvZiB0aGUgZWxlbWVudHMgaXNuJ3QgZGVmaW5lZCBmb3IgYW55IHJlYXNvblxuICBpZiAoIWVsZW1lbnQgfHwgIWVsZW1lbnQucGFyZW50RWxlbWVudCB8fCBpc0lFKCkpIHtcbiAgICByZXR1cm4gZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50O1xuICB9XG4gIHZhciBlbCA9IGVsZW1lbnQucGFyZW50RWxlbWVudDtcbiAgd2hpbGUgKGVsICYmIGdldFN0eWxlQ29tcHV0ZWRQcm9wZXJ0eShlbCwgJ3RyYW5zZm9ybScpID09PSAnbm9uZScpIHtcbiAgICBlbCA9IGVsLnBhcmVudEVsZW1lbnQ7XG4gIH1cbiAgcmV0dXJuIGVsIHx8IGRvY3VtZW50LmRvY3VtZW50RWxlbWVudDtcbn1cblxuLyoqXG4gKiBDb21wdXRlZCB0aGUgYm91bmRhcmllcyBsaW1pdHMgYW5kIHJldHVybiB0aGVtXG4gKiBAbWV0aG9kXG4gKiBAbWVtYmVyb2YgUG9wcGVyLlV0aWxzXG4gKiBAcGFyYW0ge0hUTUxFbGVtZW50fSBwb3BwZXJcbiAqIEBwYXJhbSB7SFRNTEVsZW1lbnR9IHJlZmVyZW5jZVxuICogQHBhcmFtIHtudW1iZXJ9IHBhZGRpbmdcbiAqIEBwYXJhbSB7SFRNTEVsZW1lbnR9IGJvdW5kYXJpZXNFbGVtZW50IC0gRWxlbWVudCB1c2VkIHRvIGRlZmluZSB0aGUgYm91bmRhcmllc1xuICogQHBhcmFtIHtCb29sZWFufSBmaXhlZFBvc2l0aW9uIC0gSXMgaW4gZml4ZWQgcG9zaXRpb24gbW9kZVxuICogQHJldHVybnMge09iamVjdH0gQ29vcmRpbmF0ZXMgb2YgdGhlIGJvdW5kYXJpZXNcbiAqL1xuZnVuY3Rpb24gZ2V0Qm91bmRhcmllcyhwb3BwZXIsIHJlZmVyZW5jZSwgcGFkZGluZywgYm91bmRhcmllc0VsZW1lbnQpIHtcbiAgdmFyIGZpeGVkUG9zaXRpb24gPSBhcmd1bWVudHMubGVuZ3RoID4gNCAmJiBhcmd1bWVudHNbNF0gIT09IHVuZGVmaW5lZCA/IGFyZ3VtZW50c1s0XSA6IGZhbHNlO1xuXG4gIC8vIE5PVEU6IDEgRE9NIGFjY2VzcyBoZXJlXG5cbiAgdmFyIGJvdW5kYXJpZXMgPSB7IHRvcDogMCwgbGVmdDogMCB9O1xuICB2YXIgb2Zmc2V0UGFyZW50ID0gZml4ZWRQb3NpdGlvbiA/IGdldEZpeGVkUG9zaXRpb25PZmZzZXRQYXJlbnQocG9wcGVyKSA6IGZpbmRDb21tb25PZmZzZXRQYXJlbnQocG9wcGVyLCByZWZlcmVuY2UpO1xuXG4gIC8vIEhhbmRsZSB2aWV3cG9ydCBjYXNlXG4gIGlmIChib3VuZGFyaWVzRWxlbWVudCA9PT0gJ3ZpZXdwb3J0Jykge1xuICAgIGJvdW5kYXJpZXMgPSBnZXRWaWV3cG9ydE9mZnNldFJlY3RSZWxhdGl2ZVRvQXJ0Yml0cmFyeU5vZGUob2Zmc2V0UGFyZW50LCBmaXhlZFBvc2l0aW9uKTtcbiAgfSBlbHNlIHtcbiAgICAvLyBIYW5kbGUgb3RoZXIgY2FzZXMgYmFzZWQgb24gRE9NIGVsZW1lbnQgdXNlZCBhcyBib3VuZGFyaWVzXG4gICAgdmFyIGJvdW5kYXJpZXNOb2RlID0gdm9pZCAwO1xuICAgIGlmIChib3VuZGFyaWVzRWxlbWVudCA9PT0gJ3Njcm9sbFBhcmVudCcpIHtcbiAgICAgIGJvdW5kYXJpZXNOb2RlID0gZ2V0U2Nyb2xsUGFyZW50KGdldFBhcmVudE5vZGUocmVmZXJlbmNlKSk7XG4gICAgICBpZiAoYm91bmRhcmllc05vZGUubm9kZU5hbWUgPT09ICdCT0RZJykge1xuICAgICAgICBib3VuZGFyaWVzTm9kZSA9IHBvcHBlci5vd25lckRvY3VtZW50LmRvY3VtZW50RWxlbWVudDtcbiAgICAgIH1cbiAgICB9IGVsc2UgaWYgKGJvdW5kYXJpZXNFbGVtZW50ID09PSAnd2luZG93Jykge1xuICAgICAgYm91bmRhcmllc05vZGUgPSBwb3BwZXIub3duZXJEb2N1bWVudC5kb2N1bWVudEVsZW1lbnQ7XG4gICAgfSBlbHNlIHtcbiAgICAgIGJvdW5kYXJpZXNOb2RlID0gYm91bmRhcmllc0VsZW1lbnQ7XG4gICAgfVxuXG4gICAgdmFyIG9mZnNldHMgPSBnZXRPZmZzZXRSZWN0UmVsYXRpdmVUb0FyYml0cmFyeU5vZGUoYm91bmRhcmllc05vZGUsIG9mZnNldFBhcmVudCwgZml4ZWRQb3NpdGlvbik7XG5cbiAgICAvLyBJbiBjYXNlIG9mIEhUTUwsIHdlIG5lZWQgYSBkaWZmZXJlbnQgY29tcHV0YXRpb25cbiAgICBpZiAoYm91bmRhcmllc05vZGUubm9kZU5hbWUgPT09ICdIVE1MJyAmJiAhaXNGaXhlZChvZmZzZXRQYXJlbnQpKSB7XG4gICAgICB2YXIgX2dldFdpbmRvd1NpemVzID0gZ2V0V2luZG93U2l6ZXMocG9wcGVyLm93bmVyRG9jdW1lbnQpLFxuICAgICAgICAgIGhlaWdodCA9IF9nZXRXaW5kb3dTaXplcy5oZWlnaHQsXG4gICAgICAgICAgd2lkdGggPSBfZ2V0V2luZG93U2l6ZXMud2lkdGg7XG5cbiAgICAgIGJvdW5kYXJpZXMudG9wICs9IG9mZnNldHMudG9wIC0gb2Zmc2V0cy5tYXJnaW5Ub3A7XG4gICAgICBib3VuZGFyaWVzLmJvdHRvbSA9IGhlaWdodCArIG9mZnNldHMudG9wO1xuICAgICAgYm91bmRhcmllcy5sZWZ0ICs9IG9mZnNldHMubGVmdCAtIG9mZnNldHMubWFyZ2luTGVmdDtcbiAgICAgIGJvdW5kYXJpZXMucmlnaHQgPSB3aWR0aCArIG9mZnNldHMubGVmdDtcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gZm9yIGFsbCB0aGUgb3RoZXIgRE9NIGVsZW1lbnRzLCB0aGlzIG9uZSBpcyBnb29kXG4gICAgICBib3VuZGFyaWVzID0gb2Zmc2V0cztcbiAgICB9XG4gIH1cblxuICAvLyBBZGQgcGFkZGluZ3NcbiAgcGFkZGluZyA9IHBhZGRpbmcgfHwgMDtcbiAgdmFyIGlzUGFkZGluZ051bWJlciA9IHR5cGVvZiBwYWRkaW5nID09PSAnbnVtYmVyJztcbiAgYm91bmRhcmllcy5sZWZ0ICs9IGlzUGFkZGluZ051bWJlciA/IHBhZGRpbmcgOiBwYWRkaW5nLmxlZnQgfHwgMDtcbiAgYm91bmRhcmllcy50b3AgKz0gaXNQYWRkaW5nTnVtYmVyID8gcGFkZGluZyA6IHBhZGRpbmcudG9wIHx8IDA7XG4gIGJvdW5kYXJpZXMucmlnaHQgLT0gaXNQYWRkaW5nTnVtYmVyID8gcGFkZGluZyA6IHBhZGRpbmcucmlnaHQgfHwgMDtcbiAgYm91bmRhcmllcy5ib3R0b20gLT0gaXNQYWRkaW5nTnVtYmVyID8gcGFkZGluZyA6IHBhZGRpbmcuYm90dG9tIHx8IDA7XG5cbiAgcmV0dXJuIGJvdW5kYXJpZXM7XG59XG5cbmZ1bmN0aW9uIGdldEFyZWEoX3JlZikge1xuICB2YXIgd2lkdGggPSBfcmVmLndpZHRoLFxuICAgICAgaGVpZ2h0ID0gX3JlZi5oZWlnaHQ7XG5cbiAgcmV0dXJuIHdpZHRoICogaGVpZ2h0O1xufVxuXG4vKipcbiAqIFV0aWxpdHkgdXNlZCB0byB0cmFuc2Zvcm0gdGhlIGBhdXRvYCBwbGFjZW1lbnQgdG8gdGhlIHBsYWNlbWVudCB3aXRoIG1vcmVcbiAqIGF2YWlsYWJsZSBzcGFjZS5cbiAqIEBtZXRob2RcbiAqIEBtZW1iZXJvZiBQb3BwZXIuVXRpbHNcbiAqIEBhcmd1bWVudCB7T2JqZWN0fSBkYXRhIC0gVGhlIGRhdGEgb2JqZWN0IGdlbmVyYXRlZCBieSB1cGRhdGUgbWV0aG9kXG4gKiBAYXJndW1lbnQge09iamVjdH0gb3B0aW9ucyAtIE1vZGlmaWVycyBjb25maWd1cmF0aW9uIGFuZCBvcHRpb25zXG4gKiBAcmV0dXJucyB7T2JqZWN0fSBUaGUgZGF0YSBvYmplY3QsIHByb3Blcmx5IG1vZGlmaWVkXG4gKi9cbmZ1bmN0aW9uIGNvbXB1dGVBdXRvUGxhY2VtZW50KHBsYWNlbWVudCwgcmVmUmVjdCwgcG9wcGVyLCByZWZlcmVuY2UsIGJvdW5kYXJpZXNFbGVtZW50KSB7XG4gIHZhciBwYWRkaW5nID0gYXJndW1lbnRzLmxlbmd0aCA+IDUgJiYgYXJndW1lbnRzWzVdICE9PSB1bmRlZmluZWQgPyBhcmd1bWVudHNbNV0gOiAwO1xuXG4gIGlmIChwbGFjZW1lbnQuaW5kZXhPZignYXV0bycpID09PSAtMSkge1xuICAgIHJldHVybiBwbGFjZW1lbnQ7XG4gIH1cblxuICB2YXIgYm91bmRhcmllcyA9IGdldEJvdW5kYXJpZXMocG9wcGVyLCByZWZlcmVuY2UsIHBhZGRpbmcsIGJvdW5kYXJpZXNFbGVtZW50KTtcblxuICB2YXIgcmVjdHMgPSB7XG4gICAgdG9wOiB7XG4gICAgICB3aWR0aDogYm91bmRhcmllcy53aWR0aCxcbiAgICAgIGhlaWdodDogcmVmUmVjdC50b3AgLSBib3VuZGFyaWVzLnRvcFxuICAgIH0sXG4gICAgcmlnaHQ6IHtcbiAgICAgIHdpZHRoOiBib3VuZGFyaWVzLnJpZ2h0IC0gcmVmUmVjdC5yaWdodCxcbiAgICAgIGhlaWdodDogYm91bmRhcmllcy5oZWlnaHRcbiAgICB9LFxuICAgIGJvdHRvbToge1xuICAgICAgd2lkdGg6IGJvdW5kYXJpZXMud2lkdGgsXG4gICAgICBoZWlnaHQ6IGJvdW5kYXJpZXMuYm90dG9tIC0gcmVmUmVjdC5ib3R0b21cbiAgICB9LFxuICAgIGxlZnQ6IHtcbiAgICAgIHdpZHRoOiByZWZSZWN0LmxlZnQgLSBib3VuZGFyaWVzLmxlZnQsXG4gICAgICBoZWlnaHQ6IGJvdW5kYXJpZXMuaGVpZ2h0XG4gICAgfVxuICB9O1xuXG4gIHZhciBzb3J0ZWRBcmVhcyA9IE9iamVjdC5rZXlzKHJlY3RzKS5tYXAoZnVuY3Rpb24gKGtleSkge1xuICAgIHJldHVybiBfZXh0ZW5kcyh7XG4gICAgICBrZXk6IGtleVxuICAgIH0sIHJlY3RzW2tleV0sIHtcbiAgICAgIGFyZWE6IGdldEFyZWEocmVjdHNba2V5XSlcbiAgICB9KTtcbiAgfSkuc29ydChmdW5jdGlvbiAoYSwgYikge1xuICAgIHJldHVybiBiLmFyZWEgLSBhLmFyZWE7XG4gIH0pO1xuXG4gIHZhciBmaWx0ZXJlZEFyZWFzID0gc29ydGVkQXJlYXMuZmlsdGVyKGZ1bmN0aW9uIChfcmVmMikge1xuICAgIHZhciB3aWR0aCA9IF9yZWYyLndpZHRoLFxuICAgICAgICBoZWlnaHQgPSBfcmVmMi5oZWlnaHQ7XG4gICAgcmV0dXJuIHdpZHRoID49IHBvcHBlci5jbGllbnRXaWR0aCAmJiBoZWlnaHQgPj0gcG9wcGVyLmNsaWVudEhlaWdodDtcbiAgfSk7XG5cbiAgdmFyIGNvbXB1dGVkUGxhY2VtZW50ID0gZmlsdGVyZWRBcmVhcy5sZW5ndGggPiAwID8gZmlsdGVyZWRBcmVhc1swXS5rZXkgOiBzb3J0ZWRBcmVhc1swXS5rZXk7XG5cbiAgdmFyIHZhcmlhdGlvbiA9IHBsYWNlbWVudC5zcGxpdCgnLScpWzFdO1xuXG4gIHJldHVybiBjb21wdXRlZFBsYWNlbWVudCArICh2YXJpYXRpb24gPyAnLScgKyB2YXJpYXRpb24gOiAnJyk7XG59XG5cbi8qKlxuICogR2V0IG9mZnNldHMgdG8gdGhlIHJlZmVyZW5jZSBlbGVtZW50XG4gKiBAbWV0aG9kXG4gKiBAbWVtYmVyb2YgUG9wcGVyLlV0aWxzXG4gKiBAcGFyYW0ge09iamVjdH0gc3RhdGVcbiAqIEBwYXJhbSB7RWxlbWVudH0gcG9wcGVyIC0gdGhlIHBvcHBlciBlbGVtZW50XG4gKiBAcGFyYW0ge0VsZW1lbnR9IHJlZmVyZW5jZSAtIHRoZSByZWZlcmVuY2UgZWxlbWVudCAodGhlIHBvcHBlciB3aWxsIGJlIHJlbGF0aXZlIHRvIHRoaXMpXG4gKiBAcGFyYW0ge0VsZW1lbnR9IGZpeGVkUG9zaXRpb24gLSBpcyBpbiBmaXhlZCBwb3NpdGlvbiBtb2RlXG4gKiBAcmV0dXJucyB7T2JqZWN0fSBBbiBvYmplY3QgY29udGFpbmluZyB0aGUgb2Zmc2V0cyB3aGljaCB3aWxsIGJlIGFwcGxpZWQgdG8gdGhlIHBvcHBlclxuICovXG5mdW5jdGlvbiBnZXRSZWZlcmVuY2VPZmZzZXRzKHN0YXRlLCBwb3BwZXIsIHJlZmVyZW5jZSkge1xuICB2YXIgZml4ZWRQb3NpdGlvbiA9IGFyZ3VtZW50cy5sZW5ndGggPiAzICYmIGFyZ3VtZW50c1szXSAhPT0gdW5kZWZpbmVkID8gYXJndW1lbnRzWzNdIDogbnVsbDtcblxuICB2YXIgY29tbW9uT2Zmc2V0UGFyZW50ID0gZml4ZWRQb3NpdGlvbiA/IGdldEZpeGVkUG9zaXRpb25PZmZzZXRQYXJlbnQocG9wcGVyKSA6IGZpbmRDb21tb25PZmZzZXRQYXJlbnQocG9wcGVyLCByZWZlcmVuY2UpO1xuICByZXR1cm4gZ2V0T2Zmc2V0UmVjdFJlbGF0aXZlVG9BcmJpdHJhcnlOb2RlKHJlZmVyZW5jZSwgY29tbW9uT2Zmc2V0UGFyZW50LCBmaXhlZFBvc2l0aW9uKTtcbn1cblxuLyoqXG4gKiBHZXQgdGhlIG91dGVyIHNpemVzIG9mIHRoZSBnaXZlbiBlbGVtZW50IChvZmZzZXQgc2l6ZSArIG1hcmdpbnMpXG4gKiBAbWV0aG9kXG4gKiBAbWVtYmVyb2YgUG9wcGVyLlV0aWxzXG4gKiBAYXJndW1lbnQge0VsZW1lbnR9IGVsZW1lbnRcbiAqIEByZXR1cm5zIHtPYmplY3R9IG9iamVjdCBjb250YWluaW5nIHdpZHRoIGFuZCBoZWlnaHQgcHJvcGVydGllc1xuICovXG5mdW5jdGlvbiBnZXRPdXRlclNpemVzKGVsZW1lbnQpIHtcbiAgdmFyIHdpbmRvdyA9IGVsZW1lbnQub3duZXJEb2N1bWVudC5kZWZhdWx0VmlldztcbiAgdmFyIHN0eWxlcyA9IHdpbmRvdy5nZXRDb21wdXRlZFN0eWxlKGVsZW1lbnQpO1xuICB2YXIgeCA9IHBhcnNlRmxvYXQoc3R5bGVzLm1hcmdpblRvcCB8fCAwKSArIHBhcnNlRmxvYXQoc3R5bGVzLm1hcmdpbkJvdHRvbSB8fCAwKTtcbiAgdmFyIHkgPSBwYXJzZUZsb2F0KHN0eWxlcy5tYXJnaW5MZWZ0IHx8IDApICsgcGFyc2VGbG9hdChzdHlsZXMubWFyZ2luUmlnaHQgfHwgMCk7XG4gIHZhciByZXN1bHQgPSB7XG4gICAgd2lkdGg6IGVsZW1lbnQub2Zmc2V0V2lkdGggKyB5LFxuICAgIGhlaWdodDogZWxlbWVudC5vZmZzZXRIZWlnaHQgKyB4XG4gIH07XG4gIHJldHVybiByZXN1bHQ7XG59XG5cbi8qKlxuICogR2V0IHRoZSBvcHBvc2l0ZSBwbGFjZW1lbnQgb2YgdGhlIGdpdmVuIG9uZVxuICogQG1ldGhvZFxuICogQG1lbWJlcm9mIFBvcHBlci5VdGlsc1xuICogQGFyZ3VtZW50IHtTdHJpbmd9IHBsYWNlbWVudFxuICogQHJldHVybnMge1N0cmluZ30gZmxpcHBlZCBwbGFjZW1lbnRcbiAqL1xuZnVuY3Rpb24gZ2V0T3Bwb3NpdGVQbGFjZW1lbnQocGxhY2VtZW50KSB7XG4gIHZhciBoYXNoID0geyBsZWZ0OiAncmlnaHQnLCByaWdodDogJ2xlZnQnLCBib3R0b206ICd0b3AnLCB0b3A6ICdib3R0b20nIH07XG4gIHJldHVybiBwbGFjZW1lbnQucmVwbGFjZSgvbGVmdHxyaWdodHxib3R0b218dG9wL2csIGZ1bmN0aW9uIChtYXRjaGVkKSB7XG4gICAgcmV0dXJuIGhhc2hbbWF0Y2hlZF07XG4gIH0pO1xufVxuXG4vKipcbiAqIEdldCBvZmZzZXRzIHRvIHRoZSBwb3BwZXJcbiAqIEBtZXRob2RcbiAqIEBtZW1iZXJvZiBQb3BwZXIuVXRpbHNcbiAqIEBwYXJhbSB7T2JqZWN0fSBwb3NpdGlvbiAtIENTUyBwb3NpdGlvbiB0aGUgUG9wcGVyIHdpbGwgZ2V0IGFwcGxpZWRcbiAqIEBwYXJhbSB7SFRNTEVsZW1lbnR9IHBvcHBlciAtIHRoZSBwb3BwZXIgZWxlbWVudFxuICogQHBhcmFtIHtPYmplY3R9IHJlZmVyZW5jZU9mZnNldHMgLSB0aGUgcmVmZXJlbmNlIG9mZnNldHMgKHRoZSBwb3BwZXIgd2lsbCBiZSByZWxhdGl2ZSB0byB0aGlzKVxuICogQHBhcmFtIHtTdHJpbmd9IHBsYWNlbWVudCAtIG9uZSBvZiB0aGUgdmFsaWQgcGxhY2VtZW50IG9wdGlvbnNcbiAqIEByZXR1cm5zIHtPYmplY3R9IHBvcHBlck9mZnNldHMgLSBBbiBvYmplY3QgY29udGFpbmluZyB0aGUgb2Zmc2V0cyB3aGljaCB3aWxsIGJlIGFwcGxpZWQgdG8gdGhlIHBvcHBlclxuICovXG5mdW5jdGlvbiBnZXRQb3BwZXJPZmZzZXRzKHBvcHBlciwgcmVmZXJlbmNlT2Zmc2V0cywgcGxhY2VtZW50KSB7XG4gIHBsYWNlbWVudCA9IHBsYWNlbWVudC5zcGxpdCgnLScpWzBdO1xuXG4gIC8vIEdldCBwb3BwZXIgbm9kZSBzaXplc1xuICB2YXIgcG9wcGVyUmVjdCA9IGdldE91dGVyU2l6ZXMocG9wcGVyKTtcblxuICAvLyBBZGQgcG9zaXRpb24sIHdpZHRoIGFuZCBoZWlnaHQgdG8gb3VyIG9mZnNldHMgb2JqZWN0XG4gIHZhciBwb3BwZXJPZmZzZXRzID0ge1xuICAgIHdpZHRoOiBwb3BwZXJSZWN0LndpZHRoLFxuICAgIGhlaWdodDogcG9wcGVyUmVjdC5oZWlnaHRcbiAgfTtcblxuICAvLyBkZXBlbmRpbmcgYnkgdGhlIHBvcHBlciBwbGFjZW1lbnQgd2UgaGF2ZSB0byBjb21wdXRlIGl0cyBvZmZzZXRzIHNsaWdodGx5IGRpZmZlcmVudGx5XG4gIHZhciBpc0hvcml6ID0gWydyaWdodCcsICdsZWZ0J10uaW5kZXhPZihwbGFjZW1lbnQpICE9PSAtMTtcbiAgdmFyIG1haW5TaWRlID0gaXNIb3JpeiA/ICd0b3AnIDogJ2xlZnQnO1xuICB2YXIgc2Vjb25kYXJ5U2lkZSA9IGlzSG9yaXogPyAnbGVmdCcgOiAndG9wJztcbiAgdmFyIG1lYXN1cmVtZW50ID0gaXNIb3JpeiA/ICdoZWlnaHQnIDogJ3dpZHRoJztcbiAgdmFyIHNlY29uZGFyeU1lYXN1cmVtZW50ID0gIWlzSG9yaXogPyAnaGVpZ2h0JyA6ICd3aWR0aCc7XG5cbiAgcG9wcGVyT2Zmc2V0c1ttYWluU2lkZV0gPSByZWZlcmVuY2VPZmZzZXRzW21haW5TaWRlXSArIHJlZmVyZW5jZU9mZnNldHNbbWVhc3VyZW1lbnRdIC8gMiAtIHBvcHBlclJlY3RbbWVhc3VyZW1lbnRdIC8gMjtcbiAgaWYgKHBsYWNlbWVudCA9PT0gc2Vjb25kYXJ5U2lkZSkge1xuICAgIHBvcHBlck9mZnNldHNbc2Vjb25kYXJ5U2lkZV0gPSByZWZlcmVuY2VPZmZzZXRzW3NlY29uZGFyeVNpZGVdIC0gcG9wcGVyUmVjdFtzZWNvbmRhcnlNZWFzdXJlbWVudF07XG4gIH0gZWxzZSB7XG4gICAgcG9wcGVyT2Zmc2V0c1tzZWNvbmRhcnlTaWRlXSA9IHJlZmVyZW5jZU9mZnNldHNbZ2V0T3Bwb3NpdGVQbGFjZW1lbnQoc2Vjb25kYXJ5U2lkZSldO1xuICB9XG5cbiAgcmV0dXJuIHBvcHBlck9mZnNldHM7XG59XG5cbi8qKlxuICogTWltaWNzIHRoZSBgZmluZGAgbWV0aG9kIG9mIEFycmF5XG4gKiBAbWV0aG9kXG4gKiBAbWVtYmVyb2YgUG9wcGVyLlV0aWxzXG4gKiBAYXJndW1lbnQge0FycmF5fSBhcnJcbiAqIEBhcmd1bWVudCBwcm9wXG4gKiBAYXJndW1lbnQgdmFsdWVcbiAqIEByZXR1cm5zIGluZGV4IG9yIC0xXG4gKi9cbmZ1bmN0aW9uIGZpbmQoYXJyLCBjaGVjaykge1xuICAvLyB1c2UgbmF0aXZlIGZpbmQgaWYgc3VwcG9ydGVkXG4gIGlmIChBcnJheS5wcm90b3R5cGUuZmluZCkge1xuICAgIHJldHVybiBhcnIuZmluZChjaGVjayk7XG4gIH1cblxuICAvLyB1c2UgYGZpbHRlcmAgdG8gb2J0YWluIHRoZSBzYW1lIGJlaGF2aW9yIG9mIGBmaW5kYFxuICByZXR1cm4gYXJyLmZpbHRlcihjaGVjaylbMF07XG59XG5cbi8qKlxuICogUmV0dXJuIHRoZSBpbmRleCBvZiB0aGUgbWF0Y2hpbmcgb2JqZWN0XG4gKiBAbWV0aG9kXG4gKiBAbWVtYmVyb2YgUG9wcGVyLlV0aWxzXG4gKiBAYXJndW1lbnQge0FycmF5fSBhcnJcbiAqIEBhcmd1bWVudCBwcm9wXG4gKiBAYXJndW1lbnQgdmFsdWVcbiAqIEByZXR1cm5zIGluZGV4IG9yIC0xXG4gKi9cbmZ1bmN0aW9uIGZpbmRJbmRleChhcnIsIHByb3AsIHZhbHVlKSB7XG4gIC8vIHVzZSBuYXRpdmUgZmluZEluZGV4IGlmIHN1cHBvcnRlZFxuICBpZiAoQXJyYXkucHJvdG90eXBlLmZpbmRJbmRleCkge1xuICAgIHJldHVybiBhcnIuZmluZEluZGV4KGZ1bmN0aW9uIChjdXIpIHtcbiAgICAgIHJldHVybiBjdXJbcHJvcF0gPT09IHZhbHVlO1xuICAgIH0pO1xuICB9XG5cbiAgLy8gdXNlIGBmaW5kYCArIGBpbmRleE9mYCBpZiBgZmluZEluZGV4YCBpc24ndCBzdXBwb3J0ZWRcbiAgdmFyIG1hdGNoID0gZmluZChhcnIsIGZ1bmN0aW9uIChvYmopIHtcbiAgICByZXR1cm4gb2JqW3Byb3BdID09PSB2YWx1ZTtcbiAgfSk7XG4gIHJldHVybiBhcnIuaW5kZXhPZihtYXRjaCk7XG59XG5cbi8qKlxuICogTG9vcCB0cm91Z2ggdGhlIGxpc3Qgb2YgbW9kaWZpZXJzIGFuZCBydW4gdGhlbSBpbiBvcmRlcixcbiAqIGVhY2ggb2YgdGhlbSB3aWxsIHRoZW4gZWRpdCB0aGUgZGF0YSBvYmplY3QuXG4gKiBAbWV0aG9kXG4gKiBAbWVtYmVyb2YgUG9wcGVyLlV0aWxzXG4gKiBAcGFyYW0ge2RhdGFPYmplY3R9IGRhdGFcbiAqIEBwYXJhbSB7QXJyYXl9IG1vZGlmaWVyc1xuICogQHBhcmFtIHtTdHJpbmd9IGVuZHMgLSBPcHRpb25hbCBtb2RpZmllciBuYW1lIHVzZWQgYXMgc3RvcHBlclxuICogQHJldHVybnMge2RhdGFPYmplY3R9XG4gKi9cbmZ1bmN0aW9uIHJ1bk1vZGlmaWVycyhtb2RpZmllcnMsIGRhdGEsIGVuZHMpIHtcbiAgdmFyIG1vZGlmaWVyc1RvUnVuID0gZW5kcyA9PT0gdW5kZWZpbmVkID8gbW9kaWZpZXJzIDogbW9kaWZpZXJzLnNsaWNlKDAsIGZpbmRJbmRleChtb2RpZmllcnMsICduYW1lJywgZW5kcykpO1xuXG4gIG1vZGlmaWVyc1RvUnVuLmZvckVhY2goZnVuY3Rpb24gKG1vZGlmaWVyKSB7XG4gICAgaWYgKG1vZGlmaWVyWydmdW5jdGlvbiddKSB7XG4gICAgICAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIGRvdC1ub3RhdGlvblxuICAgICAgY29uc29sZS53YXJuKCdgbW9kaWZpZXIuZnVuY3Rpb25gIGlzIGRlcHJlY2F0ZWQsIHVzZSBgbW9kaWZpZXIuZm5gIScpO1xuICAgIH1cbiAgICB2YXIgZm4gPSBtb2RpZmllclsnZnVuY3Rpb24nXSB8fCBtb2RpZmllci5mbjsgLy8gZXNsaW50LWRpc2FibGUtbGluZSBkb3Qtbm90YXRpb25cbiAgICBpZiAobW9kaWZpZXIuZW5hYmxlZCAmJiBpc0Z1bmN0aW9uKGZuKSkge1xuICAgICAgLy8gQWRkIHByb3BlcnRpZXMgdG8gb2Zmc2V0cyB0byBtYWtlIHRoZW0gYSBjb21wbGV0ZSBjbGllbnRSZWN0IG9iamVjdFxuICAgICAgLy8gd2UgZG8gdGhpcyBiZWZvcmUgZWFjaCBtb2RpZmllciB0byBtYWtlIHN1cmUgdGhlIHByZXZpb3VzIG9uZSBkb2Vzbid0XG4gICAgICAvLyBtZXNzIHdpdGggdGhlc2UgdmFsdWVzXG4gICAgICBkYXRhLm9mZnNldHMucG9wcGVyID0gZ2V0Q2xpZW50UmVjdChkYXRhLm9mZnNldHMucG9wcGVyKTtcbiAgICAgIGRhdGEub2Zmc2V0cy5yZWZlcmVuY2UgPSBnZXRDbGllbnRSZWN0KGRhdGEub2Zmc2V0cy5yZWZlcmVuY2UpO1xuXG4gICAgICBkYXRhID0gZm4oZGF0YSwgbW9kaWZpZXIpO1xuICAgIH1cbiAgfSk7XG5cbiAgcmV0dXJuIGRhdGE7XG59XG5cbi8qKlxuICogVXBkYXRlcyB0aGUgcG9zaXRpb24gb2YgdGhlIHBvcHBlciwgY29tcHV0aW5nIHRoZSBuZXcgb2Zmc2V0cyBhbmQgYXBwbHlpbmdcbiAqIHRoZSBuZXcgc3R5bGUuPGJyIC8+XG4gKiBQcmVmZXIgYHNjaGVkdWxlVXBkYXRlYCBvdmVyIGB1cGRhdGVgIGJlY2F1c2Ugb2YgcGVyZm9ybWFuY2UgcmVhc29ucy5cbiAqIEBtZXRob2RcbiAqIEBtZW1iZXJvZiBQb3BwZXJcbiAqL1xuZnVuY3Rpb24gdXBkYXRlKCkge1xuICAvLyBpZiBwb3BwZXIgaXMgZGVzdHJveWVkLCBkb24ndCBwZXJmb3JtIGFueSBmdXJ0aGVyIHVwZGF0ZVxuICBpZiAodGhpcy5zdGF0ZS5pc0Rlc3Ryb3llZCkge1xuICAgIHJldHVybjtcbiAgfVxuXG4gIHZhciBkYXRhID0ge1xuICAgIGluc3RhbmNlOiB0aGlzLFxuICAgIHN0eWxlczoge30sXG4gICAgYXJyb3dTdHlsZXM6IHt9LFxuICAgIGF0dHJpYnV0ZXM6IHt9LFxuICAgIGZsaXBwZWQ6IGZhbHNlLFxuICAgIG9mZnNldHM6IHt9XG4gIH07XG5cbiAgLy8gY29tcHV0ZSByZWZlcmVuY2UgZWxlbWVudCBvZmZzZXRzXG4gIGRhdGEub2Zmc2V0cy5yZWZlcmVuY2UgPSBnZXRSZWZlcmVuY2VPZmZzZXRzKHRoaXMuc3RhdGUsIHRoaXMucG9wcGVyLCB0aGlzLnJlZmVyZW5jZSwgdGhpcy5vcHRpb25zLnBvc2l0aW9uRml4ZWQpO1xuXG4gIC8vIGNvbXB1dGUgYXV0byBwbGFjZW1lbnQsIHN0b3JlIHBsYWNlbWVudCBpbnNpZGUgdGhlIGRhdGEgb2JqZWN0LFxuICAvLyBtb2RpZmllcnMgd2lsbCBiZSBhYmxlIHRvIGVkaXQgYHBsYWNlbWVudGAgaWYgbmVlZGVkXG4gIC8vIGFuZCByZWZlciB0byBvcmlnaW5hbFBsYWNlbWVudCB0byBrbm93IHRoZSBvcmlnaW5hbCB2YWx1ZVxuICBkYXRhLnBsYWNlbWVudCA9IGNvbXB1dGVBdXRvUGxhY2VtZW50KHRoaXMub3B0aW9ucy5wbGFjZW1lbnQsIGRhdGEub2Zmc2V0cy5yZWZlcmVuY2UsIHRoaXMucG9wcGVyLCB0aGlzLnJlZmVyZW5jZSwgdGhpcy5vcHRpb25zLm1vZGlmaWVycy5mbGlwLmJvdW5kYXJpZXNFbGVtZW50LCB0aGlzLm9wdGlvbnMubW9kaWZpZXJzLmZsaXAucGFkZGluZyk7XG5cbiAgLy8gc3RvcmUgdGhlIGNvbXB1dGVkIHBsYWNlbWVudCBpbnNpZGUgYG9yaWdpbmFsUGxhY2VtZW50YFxuICBkYXRhLm9yaWdpbmFsUGxhY2VtZW50ID0gZGF0YS5wbGFjZW1lbnQ7XG5cbiAgZGF0YS5wb3NpdGlvbkZpeGVkID0gdGhpcy5vcHRpb25zLnBvc2l0aW9uRml4ZWQ7XG5cbiAgLy8gY29tcHV0ZSB0aGUgcG9wcGVyIG9mZnNldHNcbiAgZGF0YS5vZmZzZXRzLnBvcHBlciA9IGdldFBvcHBlck9mZnNldHModGhpcy5wb3BwZXIsIGRhdGEub2Zmc2V0cy5yZWZlcmVuY2UsIGRhdGEucGxhY2VtZW50KTtcblxuICBkYXRhLm9mZnNldHMucG9wcGVyLnBvc2l0aW9uID0gdGhpcy5vcHRpb25zLnBvc2l0aW9uRml4ZWQgPyAnZml4ZWQnIDogJ2Fic29sdXRlJztcblxuICAvLyBydW4gdGhlIG1vZGlmaWVyc1xuICBkYXRhID0gcnVuTW9kaWZpZXJzKHRoaXMubW9kaWZpZXJzLCBkYXRhKTtcblxuICAvLyB0aGUgZmlyc3QgYHVwZGF0ZWAgd2lsbCBjYWxsIGBvbkNyZWF0ZWAgY2FsbGJhY2tcbiAgLy8gdGhlIG90aGVyIG9uZXMgd2lsbCBjYWxsIGBvblVwZGF0ZWAgY2FsbGJhY2tcbiAgaWYgKCF0aGlzLnN0YXRlLmlzQ3JlYXRlZCkge1xuICAgIHRoaXMuc3RhdGUuaXNDcmVhdGVkID0gdHJ1ZTtcbiAgICB0aGlzLm9wdGlvbnMub25DcmVhdGUoZGF0YSk7XG4gIH0gZWxzZSB7XG4gICAgdGhpcy5vcHRpb25zLm9uVXBkYXRlKGRhdGEpO1xuICB9XG59XG5cbi8qKlxuICogSGVscGVyIHVzZWQgdG8ga25vdyBpZiB0aGUgZ2l2ZW4gbW9kaWZpZXIgaXMgZW5hYmxlZC5cbiAqIEBtZXRob2RcbiAqIEBtZW1iZXJvZiBQb3BwZXIuVXRpbHNcbiAqIEByZXR1cm5zIHtCb29sZWFufVxuICovXG5mdW5jdGlvbiBpc01vZGlmaWVyRW5hYmxlZChtb2RpZmllcnMsIG1vZGlmaWVyTmFtZSkge1xuICByZXR1cm4gbW9kaWZpZXJzLnNvbWUoZnVuY3Rpb24gKF9yZWYpIHtcbiAgICB2YXIgbmFtZSA9IF9yZWYubmFtZSxcbiAgICAgICAgZW5hYmxlZCA9IF9yZWYuZW5hYmxlZDtcbiAgICByZXR1cm4gZW5hYmxlZCAmJiBuYW1lID09PSBtb2RpZmllck5hbWU7XG4gIH0pO1xufVxuXG4vKipcbiAqIEdldCB0aGUgcHJlZml4ZWQgc3VwcG9ydGVkIHByb3BlcnR5IG5hbWVcbiAqIEBtZXRob2RcbiAqIEBtZW1iZXJvZiBQb3BwZXIuVXRpbHNcbiAqIEBhcmd1bWVudCB7U3RyaW5nfSBwcm9wZXJ0eSAoY2FtZWxDYXNlKVxuICogQHJldHVybnMge1N0cmluZ30gcHJlZml4ZWQgcHJvcGVydHkgKGNhbWVsQ2FzZSBvciBQYXNjYWxDYXNlLCBkZXBlbmRpbmcgb24gdGhlIHZlbmRvciBwcmVmaXgpXG4gKi9cbmZ1bmN0aW9uIGdldFN1cHBvcnRlZFByb3BlcnR5TmFtZShwcm9wZXJ0eSkge1xuICB2YXIgcHJlZml4ZXMgPSBbZmFsc2UsICdtcycsICdXZWJraXQnLCAnTW96JywgJ08nXTtcbiAgdmFyIHVwcGVyUHJvcCA9IHByb3BlcnR5LmNoYXJBdCgwKS50b1VwcGVyQ2FzZSgpICsgcHJvcGVydHkuc2xpY2UoMSk7XG5cbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBwcmVmaXhlcy5sZW5ndGg7IGkrKykge1xuICAgIHZhciBwcmVmaXggPSBwcmVmaXhlc1tpXTtcbiAgICB2YXIgdG9DaGVjayA9IHByZWZpeCA/ICcnICsgcHJlZml4ICsgdXBwZXJQcm9wIDogcHJvcGVydHk7XG4gICAgaWYgKHR5cGVvZiBkb2N1bWVudC5ib2R5LnN0eWxlW3RvQ2hlY2tdICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgcmV0dXJuIHRvQ2hlY2s7XG4gICAgfVxuICB9XG4gIHJldHVybiBudWxsO1xufVxuXG4vKipcbiAqIERlc3Ryb3lzIHRoZSBwb3BwZXIuXG4gKiBAbWV0aG9kXG4gKiBAbWVtYmVyb2YgUG9wcGVyXG4gKi9cbmZ1bmN0aW9uIGRlc3Ryb3koKSB7XG4gIHRoaXMuc3RhdGUuaXNEZXN0cm95ZWQgPSB0cnVlO1xuXG4gIC8vIHRvdWNoIERPTSBvbmx5IGlmIGBhcHBseVN0eWxlYCBtb2RpZmllciBpcyBlbmFibGVkXG4gIGlmIChpc01vZGlmaWVyRW5hYmxlZCh0aGlzLm1vZGlmaWVycywgJ2FwcGx5U3R5bGUnKSkge1xuICAgIHRoaXMucG9wcGVyLnJlbW92ZUF0dHJpYnV0ZSgneC1wbGFjZW1lbnQnKTtcbiAgICB0aGlzLnBvcHBlci5zdHlsZS5wb3NpdGlvbiA9ICcnO1xuICAgIHRoaXMucG9wcGVyLnN0eWxlLnRvcCA9ICcnO1xuICAgIHRoaXMucG9wcGVyLnN0eWxlLmxlZnQgPSAnJztcbiAgICB0aGlzLnBvcHBlci5zdHlsZS5yaWdodCA9ICcnO1xuICAgIHRoaXMucG9wcGVyLnN0eWxlLmJvdHRvbSA9ICcnO1xuICAgIHRoaXMucG9wcGVyLnN0eWxlLndpbGxDaGFuZ2UgPSAnJztcbiAgICB0aGlzLnBvcHBlci5zdHlsZVtnZXRTdXBwb3J0ZWRQcm9wZXJ0eU5hbWUoJ3RyYW5zZm9ybScpXSA9ICcnO1xuICB9XG5cbiAgdGhpcy5kaXNhYmxlRXZlbnRMaXN0ZW5lcnMoKTtcblxuICAvLyByZW1vdmUgdGhlIHBvcHBlciBpZiB1c2VyIGV4cGxpY2l0eSBhc2tlZCBmb3IgdGhlIGRlbGV0aW9uIG9uIGRlc3Ryb3lcbiAgLy8gZG8gbm90IHVzZSBgcmVtb3ZlYCBiZWNhdXNlIElFMTEgZG9lc24ndCBzdXBwb3J0IGl0XG4gIGlmICh0aGlzLm9wdGlvbnMucmVtb3ZlT25EZXN0cm95KSB7XG4gICAgdGhpcy5wb3BwZXIucGFyZW50Tm9kZS5yZW1vdmVDaGlsZCh0aGlzLnBvcHBlcik7XG4gIH1cbiAgcmV0dXJuIHRoaXM7XG59XG5cbi8qKlxuICogR2V0IHRoZSB3aW5kb3cgYXNzb2NpYXRlZCB3aXRoIHRoZSBlbGVtZW50XG4gKiBAYXJndW1lbnQge0VsZW1lbnR9IGVsZW1lbnRcbiAqIEByZXR1cm5zIHtXaW5kb3d9XG4gKi9cbmZ1bmN0aW9uIGdldFdpbmRvdyhlbGVtZW50KSB7XG4gIHZhciBvd25lckRvY3VtZW50ID0gZWxlbWVudC5vd25lckRvY3VtZW50O1xuICByZXR1cm4gb3duZXJEb2N1bWVudCA/IG93bmVyRG9jdW1lbnQuZGVmYXVsdFZpZXcgOiB3aW5kb3c7XG59XG5cbmZ1bmN0aW9uIGF0dGFjaFRvU2Nyb2xsUGFyZW50cyhzY3JvbGxQYXJlbnQsIGV2ZW50LCBjYWxsYmFjaywgc2Nyb2xsUGFyZW50cykge1xuICB2YXIgaXNCb2R5ID0gc2Nyb2xsUGFyZW50Lm5vZGVOYW1lID09PSAnQk9EWSc7XG4gIHZhciB0YXJnZXQgPSBpc0JvZHkgPyBzY3JvbGxQYXJlbnQub3duZXJEb2N1bWVudC5kZWZhdWx0VmlldyA6IHNjcm9sbFBhcmVudDtcbiAgdGFyZ2V0LmFkZEV2ZW50TGlzdGVuZXIoZXZlbnQsIGNhbGxiYWNrLCB7IHBhc3NpdmU6IHRydWUgfSk7XG5cbiAgaWYgKCFpc0JvZHkpIHtcbiAgICBhdHRhY2hUb1Njcm9sbFBhcmVudHMoZ2V0U2Nyb2xsUGFyZW50KHRhcmdldC5wYXJlbnROb2RlKSwgZXZlbnQsIGNhbGxiYWNrLCBzY3JvbGxQYXJlbnRzKTtcbiAgfVxuICBzY3JvbGxQYXJlbnRzLnB1c2godGFyZ2V0KTtcbn1cblxuLyoqXG4gKiBTZXR1cCBuZWVkZWQgZXZlbnQgbGlzdGVuZXJzIHVzZWQgdG8gdXBkYXRlIHRoZSBwb3BwZXIgcG9zaXRpb25cbiAqIEBtZXRob2RcbiAqIEBtZW1iZXJvZiBQb3BwZXIuVXRpbHNcbiAqIEBwcml2YXRlXG4gKi9cbmZ1bmN0aW9uIHNldHVwRXZlbnRMaXN0ZW5lcnMocmVmZXJlbmNlLCBvcHRpb25zLCBzdGF0ZSwgdXBkYXRlQm91bmQpIHtcbiAgLy8gUmVzaXplIGV2ZW50IGxpc3RlbmVyIG9uIHdpbmRvd1xuICBzdGF0ZS51cGRhdGVCb3VuZCA9IHVwZGF0ZUJvdW5kO1xuICBnZXRXaW5kb3cocmVmZXJlbmNlKS5hZGRFdmVudExpc3RlbmVyKCdyZXNpemUnLCBzdGF0ZS51cGRhdGVCb3VuZCwgeyBwYXNzaXZlOiB0cnVlIH0pO1xuXG4gIC8vIFNjcm9sbCBldmVudCBsaXN0ZW5lciBvbiBzY3JvbGwgcGFyZW50c1xuICB2YXIgc2Nyb2xsRWxlbWVudCA9IGdldFNjcm9sbFBhcmVudChyZWZlcmVuY2UpO1xuICBhdHRhY2hUb1Njcm9sbFBhcmVudHMoc2Nyb2xsRWxlbWVudCwgJ3Njcm9sbCcsIHN0YXRlLnVwZGF0ZUJvdW5kLCBzdGF0ZS5zY3JvbGxQYXJlbnRzKTtcbiAgc3RhdGUuc2Nyb2xsRWxlbWVudCA9IHNjcm9sbEVsZW1lbnQ7XG4gIHN0YXRlLmV2ZW50c0VuYWJsZWQgPSB0cnVlO1xuXG4gIHJldHVybiBzdGF0ZTtcbn1cblxuLyoqXG4gKiBJdCB3aWxsIGFkZCByZXNpemUvc2Nyb2xsIGV2ZW50cyBhbmQgc3RhcnQgcmVjYWxjdWxhdGluZ1xuICogcG9zaXRpb24gb2YgdGhlIHBvcHBlciBlbGVtZW50IHdoZW4gdGhleSBhcmUgdHJpZ2dlcmVkLlxuICogQG1ldGhvZFxuICogQG1lbWJlcm9mIFBvcHBlclxuICovXG5mdW5jdGlvbiBlbmFibGVFdmVudExpc3RlbmVycygpIHtcbiAgaWYgKCF0aGlzLnN0YXRlLmV2ZW50c0VuYWJsZWQpIHtcbiAgICB0aGlzLnN0YXRlID0gc2V0dXBFdmVudExpc3RlbmVycyh0aGlzLnJlZmVyZW5jZSwgdGhpcy5vcHRpb25zLCB0aGlzLnN0YXRlLCB0aGlzLnNjaGVkdWxlVXBkYXRlKTtcbiAgfVxufVxuXG4vKipcbiAqIFJlbW92ZSBldmVudCBsaXN0ZW5lcnMgdXNlZCB0byB1cGRhdGUgdGhlIHBvcHBlciBwb3NpdGlvblxuICogQG1ldGhvZFxuICogQG1lbWJlcm9mIFBvcHBlci5VdGlsc1xuICogQHByaXZhdGVcbiAqL1xuZnVuY3Rpb24gcmVtb3ZlRXZlbnRMaXN0ZW5lcnMocmVmZXJlbmNlLCBzdGF0ZSkge1xuICAvLyBSZW1vdmUgcmVzaXplIGV2ZW50IGxpc3RlbmVyIG9uIHdpbmRvd1xuICBnZXRXaW5kb3cocmVmZXJlbmNlKS5yZW1vdmVFdmVudExpc3RlbmVyKCdyZXNpemUnLCBzdGF0ZS51cGRhdGVCb3VuZCk7XG5cbiAgLy8gUmVtb3ZlIHNjcm9sbCBldmVudCBsaXN0ZW5lciBvbiBzY3JvbGwgcGFyZW50c1xuICBzdGF0ZS5zY3JvbGxQYXJlbnRzLmZvckVhY2goZnVuY3Rpb24gKHRhcmdldCkge1xuICAgIHRhcmdldC5yZW1vdmVFdmVudExpc3RlbmVyKCdzY3JvbGwnLCBzdGF0ZS51cGRhdGVCb3VuZCk7XG4gIH0pO1xuXG4gIC8vIFJlc2V0IHN0YXRlXG4gIHN0YXRlLnVwZGF0ZUJvdW5kID0gbnVsbDtcbiAgc3RhdGUuc2Nyb2xsUGFyZW50cyA9IFtdO1xuICBzdGF0ZS5zY3JvbGxFbGVtZW50ID0gbnVsbDtcbiAgc3RhdGUuZXZlbnRzRW5hYmxlZCA9IGZhbHNlO1xuICByZXR1cm4gc3RhdGU7XG59XG5cbi8qKlxuICogSXQgd2lsbCByZW1vdmUgcmVzaXplL3Njcm9sbCBldmVudHMgYW5kIHdvbid0IHJlY2FsY3VsYXRlIHBvcHBlciBwb3NpdGlvblxuICogd2hlbiB0aGV5IGFyZSB0cmlnZ2VyZWQuIEl0IGFsc28gd29uJ3QgdHJpZ2dlciBgb25VcGRhdGVgIGNhbGxiYWNrIGFueW1vcmUsXG4gKiB1bmxlc3MgeW91IGNhbGwgYHVwZGF0ZWAgbWV0aG9kIG1hbnVhbGx5LlxuICogQG1ldGhvZFxuICogQG1lbWJlcm9mIFBvcHBlclxuICovXG5mdW5jdGlvbiBkaXNhYmxlRXZlbnRMaXN0ZW5lcnMoKSB7XG4gIGlmICh0aGlzLnN0YXRlLmV2ZW50c0VuYWJsZWQpIHtcbiAgICBjYW5jZWxBbmltYXRpb25GcmFtZSh0aGlzLnNjaGVkdWxlVXBkYXRlKTtcbiAgICB0aGlzLnN0YXRlID0gcmVtb3ZlRXZlbnRMaXN0ZW5lcnModGhpcy5yZWZlcmVuY2UsIHRoaXMuc3RhdGUpO1xuICB9XG59XG5cbi8qKlxuICogVGVsbHMgaWYgYSBnaXZlbiBpbnB1dCBpcyBhIG51bWJlclxuICogQG1ldGhvZFxuICogQG1lbWJlcm9mIFBvcHBlci5VdGlsc1xuICogQHBhcmFtIHsqfSBpbnB1dCB0byBjaGVja1xuICogQHJldHVybiB7Qm9vbGVhbn1cbiAqL1xuZnVuY3Rpb24gaXNOdW1lcmljKG4pIHtcbiAgcmV0dXJuIG4gIT09ICcnICYmICFpc05hTihwYXJzZUZsb2F0KG4pKSAmJiBpc0Zpbml0ZShuKTtcbn1cblxuLyoqXG4gKiBTZXQgdGhlIHN0eWxlIHRvIHRoZSBnaXZlbiBwb3BwZXJcbiAqIEBtZXRob2RcbiAqIEBtZW1iZXJvZiBQb3BwZXIuVXRpbHNcbiAqIEBhcmd1bWVudCB7RWxlbWVudH0gZWxlbWVudCAtIEVsZW1lbnQgdG8gYXBwbHkgdGhlIHN0eWxlIHRvXG4gKiBAYXJndW1lbnQge09iamVjdH0gc3R5bGVzXG4gKiBPYmplY3Qgd2l0aCBhIGxpc3Qgb2YgcHJvcGVydGllcyBhbmQgdmFsdWVzIHdoaWNoIHdpbGwgYmUgYXBwbGllZCB0byB0aGUgZWxlbWVudFxuICovXG5mdW5jdGlvbiBzZXRTdHlsZXMoZWxlbWVudCwgc3R5bGVzKSB7XG4gIE9iamVjdC5rZXlzKHN0eWxlcykuZm9yRWFjaChmdW5jdGlvbiAocHJvcCkge1xuICAgIHZhciB1bml0ID0gJyc7XG4gICAgLy8gYWRkIHVuaXQgaWYgdGhlIHZhbHVlIGlzIG51bWVyaWMgYW5kIGlzIG9uZSBvZiB0aGUgZm9sbG93aW5nXG4gICAgaWYgKFsnd2lkdGgnLCAnaGVpZ2h0JywgJ3RvcCcsICdyaWdodCcsICdib3R0b20nLCAnbGVmdCddLmluZGV4T2YocHJvcCkgIT09IC0xICYmIGlzTnVtZXJpYyhzdHlsZXNbcHJvcF0pKSB7XG4gICAgICB1bml0ID0gJ3B4JztcbiAgICB9XG4gICAgZWxlbWVudC5zdHlsZVtwcm9wXSA9IHN0eWxlc1twcm9wXSArIHVuaXQ7XG4gIH0pO1xufVxuXG4vKipcbiAqIFNldCB0aGUgYXR0cmlidXRlcyB0byB0aGUgZ2l2ZW4gcG9wcGVyXG4gKiBAbWV0aG9kXG4gKiBAbWVtYmVyb2YgUG9wcGVyLlV0aWxzXG4gKiBAYXJndW1lbnQge0VsZW1lbnR9IGVsZW1lbnQgLSBFbGVtZW50IHRvIGFwcGx5IHRoZSBhdHRyaWJ1dGVzIHRvXG4gKiBAYXJndW1lbnQge09iamVjdH0gc3R5bGVzXG4gKiBPYmplY3Qgd2l0aCBhIGxpc3Qgb2YgcHJvcGVydGllcyBhbmQgdmFsdWVzIHdoaWNoIHdpbGwgYmUgYXBwbGllZCB0byB0aGUgZWxlbWVudFxuICovXG5mdW5jdGlvbiBzZXRBdHRyaWJ1dGVzKGVsZW1lbnQsIGF0dHJpYnV0ZXMpIHtcbiAgT2JqZWN0LmtleXMoYXR0cmlidXRlcykuZm9yRWFjaChmdW5jdGlvbiAocHJvcCkge1xuICAgIHZhciB2YWx1ZSA9IGF0dHJpYnV0ZXNbcHJvcF07XG4gICAgaWYgKHZhbHVlICE9PSBmYWxzZSkge1xuICAgICAgZWxlbWVudC5zZXRBdHRyaWJ1dGUocHJvcCwgYXR0cmlidXRlc1twcm9wXSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGVsZW1lbnQucmVtb3ZlQXR0cmlidXRlKHByb3ApO1xuICAgIH1cbiAgfSk7XG59XG5cbi8qKlxuICogQGZ1bmN0aW9uXG4gKiBAbWVtYmVyb2YgTW9kaWZpZXJzXG4gKiBAYXJndW1lbnQge09iamVjdH0gZGF0YSAtIFRoZSBkYXRhIG9iamVjdCBnZW5lcmF0ZWQgYnkgYHVwZGF0ZWAgbWV0aG9kXG4gKiBAYXJndW1lbnQge09iamVjdH0gZGF0YS5zdHlsZXMgLSBMaXN0IG9mIHN0eWxlIHByb3BlcnRpZXMgLSB2YWx1ZXMgdG8gYXBwbHkgdG8gcG9wcGVyIGVsZW1lbnRcbiAqIEBhcmd1bWVudCB7T2JqZWN0fSBkYXRhLmF0dHJpYnV0ZXMgLSBMaXN0IG9mIGF0dHJpYnV0ZSBwcm9wZXJ0aWVzIC0gdmFsdWVzIHRvIGFwcGx5IHRvIHBvcHBlciBlbGVtZW50XG4gKiBAYXJndW1lbnQge09iamVjdH0gb3B0aW9ucyAtIE1vZGlmaWVycyBjb25maWd1cmF0aW9uIGFuZCBvcHRpb25zXG4gKiBAcmV0dXJucyB7T2JqZWN0fSBUaGUgc2FtZSBkYXRhIG9iamVjdFxuICovXG5mdW5jdGlvbiBhcHBseVN0eWxlKGRhdGEpIHtcbiAgLy8gYW55IHByb3BlcnR5IHByZXNlbnQgaW4gYGRhdGEuc3R5bGVzYCB3aWxsIGJlIGFwcGxpZWQgdG8gdGhlIHBvcHBlcixcbiAgLy8gaW4gdGhpcyB3YXkgd2UgY2FuIG1ha2UgdGhlIDNyZCBwYXJ0eSBtb2RpZmllcnMgYWRkIGN1c3RvbSBzdHlsZXMgdG8gaXRcbiAgLy8gQmUgYXdhcmUsIG1vZGlmaWVycyBjb3VsZCBvdmVycmlkZSB0aGUgcHJvcGVydGllcyBkZWZpbmVkIGluIHRoZSBwcmV2aW91c1xuICAvLyBsaW5lcyBvZiB0aGlzIG1vZGlmaWVyIVxuICBzZXRTdHlsZXMoZGF0YS5pbnN0YW5jZS5wb3BwZXIsIGRhdGEuc3R5bGVzKTtcblxuICAvLyBhbnkgcHJvcGVydHkgcHJlc2VudCBpbiBgZGF0YS5hdHRyaWJ1dGVzYCB3aWxsIGJlIGFwcGxpZWQgdG8gdGhlIHBvcHBlcixcbiAgLy8gdGhleSB3aWxsIGJlIHNldCBhcyBIVE1MIGF0dHJpYnV0ZXMgb2YgdGhlIGVsZW1lbnRcbiAgc2V0QXR0cmlidXRlcyhkYXRhLmluc3RhbmNlLnBvcHBlciwgZGF0YS5hdHRyaWJ1dGVzKTtcblxuICAvLyBpZiBhcnJvd0VsZW1lbnQgaXMgZGVmaW5lZCBhbmQgYXJyb3dTdHlsZXMgaGFzIHNvbWUgcHJvcGVydGllc1xuICBpZiAoZGF0YS5hcnJvd0VsZW1lbnQgJiYgT2JqZWN0LmtleXMoZGF0YS5hcnJvd1N0eWxlcykubGVuZ3RoKSB7XG4gICAgc2V0U3R5bGVzKGRhdGEuYXJyb3dFbGVtZW50LCBkYXRhLmFycm93U3R5bGVzKTtcbiAgfVxuXG4gIHJldHVybiBkYXRhO1xufVxuXG4vKipcbiAqIFNldCB0aGUgeC1wbGFjZW1lbnQgYXR0cmlidXRlIGJlZm9yZSBldmVyeXRoaW5nIGVsc2UgYmVjYXVzZSBpdCBjb3VsZCBiZSB1c2VkXG4gKiB0byBhZGQgbWFyZ2lucyB0byB0aGUgcG9wcGVyIG1hcmdpbnMgbmVlZHMgdG8gYmUgY2FsY3VsYXRlZCB0byBnZXQgdGhlXG4gKiBjb3JyZWN0IHBvcHBlciBvZmZzZXRzLlxuICogQG1ldGhvZFxuICogQG1lbWJlcm9mIFBvcHBlci5tb2RpZmllcnNcbiAqIEBwYXJhbSB7SFRNTEVsZW1lbnR9IHJlZmVyZW5jZSAtIFRoZSByZWZlcmVuY2UgZWxlbWVudCB1c2VkIHRvIHBvc2l0aW9uIHRoZSBwb3BwZXJcbiAqIEBwYXJhbSB7SFRNTEVsZW1lbnR9IHBvcHBlciAtIFRoZSBIVE1MIGVsZW1lbnQgdXNlZCBhcyBwb3BwZXJcbiAqIEBwYXJhbSB7T2JqZWN0fSBvcHRpb25zIC0gUG9wcGVyLmpzIG9wdGlvbnNcbiAqL1xuZnVuY3Rpb24gYXBwbHlTdHlsZU9uTG9hZChyZWZlcmVuY2UsIHBvcHBlciwgb3B0aW9ucywgbW9kaWZpZXJPcHRpb25zLCBzdGF0ZSkge1xuICAvLyBjb21wdXRlIHJlZmVyZW5jZSBlbGVtZW50IG9mZnNldHNcbiAgdmFyIHJlZmVyZW5jZU9mZnNldHMgPSBnZXRSZWZlcmVuY2VPZmZzZXRzKHN0YXRlLCBwb3BwZXIsIHJlZmVyZW5jZSwgb3B0aW9ucy5wb3NpdGlvbkZpeGVkKTtcblxuICAvLyBjb21wdXRlIGF1dG8gcGxhY2VtZW50LCBzdG9yZSBwbGFjZW1lbnQgaW5zaWRlIHRoZSBkYXRhIG9iamVjdCxcbiAgLy8gbW9kaWZpZXJzIHdpbGwgYmUgYWJsZSB0byBlZGl0IGBwbGFjZW1lbnRgIGlmIG5lZWRlZFxuICAvLyBhbmQgcmVmZXIgdG8gb3JpZ2luYWxQbGFjZW1lbnQgdG8ga25vdyB0aGUgb3JpZ2luYWwgdmFsdWVcbiAgdmFyIHBsYWNlbWVudCA9IGNvbXB1dGVBdXRvUGxhY2VtZW50KG9wdGlvbnMucGxhY2VtZW50LCByZWZlcmVuY2VPZmZzZXRzLCBwb3BwZXIsIHJlZmVyZW5jZSwgb3B0aW9ucy5tb2RpZmllcnMuZmxpcC5ib3VuZGFyaWVzRWxlbWVudCwgb3B0aW9ucy5tb2RpZmllcnMuZmxpcC5wYWRkaW5nKTtcblxuICBwb3BwZXIuc2V0QXR0cmlidXRlKCd4LXBsYWNlbWVudCcsIHBsYWNlbWVudCk7XG5cbiAgLy8gQXBwbHkgYHBvc2l0aW9uYCB0byBwb3BwZXIgYmVmb3JlIGFueXRoaW5nIGVsc2UgYmVjYXVzZVxuICAvLyB3aXRob3V0IHRoZSBwb3NpdGlvbiBhcHBsaWVkIHdlIGNhbid0IGd1YXJhbnRlZSBjb3JyZWN0IGNvbXB1dGF0aW9uc1xuICBzZXRTdHlsZXMocG9wcGVyLCB7IHBvc2l0aW9uOiBvcHRpb25zLnBvc2l0aW9uRml4ZWQgPyAnZml4ZWQnIDogJ2Fic29sdXRlJyB9KTtcblxuICByZXR1cm4gb3B0aW9ucztcbn1cblxuLyoqXG4gKiBAZnVuY3Rpb25cbiAqIEBtZW1iZXJvZiBQb3BwZXIuVXRpbHNcbiAqIEBhcmd1bWVudCB7T2JqZWN0fSBkYXRhIC0gVGhlIGRhdGEgb2JqZWN0IGdlbmVyYXRlZCBieSBgdXBkYXRlYCBtZXRob2RcbiAqIEBhcmd1bWVudCB7Qm9vbGVhbn0gc2hvdWxkUm91bmQgLSBJZiB0aGUgb2Zmc2V0cyBzaG91bGQgYmUgcm91bmRlZCBhdCBhbGxcbiAqIEByZXR1cm5zIHtPYmplY3R9IFRoZSBwb3BwZXIncyBwb3NpdGlvbiBvZmZzZXRzIHJvdW5kZWRcbiAqXG4gKiBUaGUgdGFsZSBvZiBwaXhlbC1wZXJmZWN0IHBvc2l0aW9uaW5nLiBJdCdzIHN0aWxsIG5vdCAxMDAlIHBlcmZlY3QsIGJ1dCBhc1xuICogZ29vZCBhcyBpdCBjYW4gYmUgd2l0aGluIHJlYXNvbi5cbiAqIERpc2N1c3Npb24gaGVyZTogaHR0cHM6Ly9naXRodWIuY29tL0ZlelZyYXN0YS9wb3BwZXIuanMvcHVsbC83MTVcbiAqXG4gKiBMb3cgRFBJIHNjcmVlbnMgY2F1c2UgYSBwb3BwZXIgdG8gYmUgYmx1cnJ5IGlmIG5vdCB1c2luZyBmdWxsIHBpeGVscyAoU2FmYXJpXG4gKiBhcyB3ZWxsIG9uIEhpZ2ggRFBJIHNjcmVlbnMpLlxuICpcbiAqIEZpcmVmb3ggcHJlZmVycyBubyByb3VuZGluZyBmb3IgcG9zaXRpb25pbmcgYW5kIGRvZXMgbm90IGhhdmUgYmx1cnJpbmVzcyBvblxuICogaGlnaCBEUEkgc2NyZWVucy5cbiAqXG4gKiBPbmx5IGhvcml6b250YWwgcGxhY2VtZW50IGFuZCBsZWZ0L3JpZ2h0IHZhbHVlcyBuZWVkIHRvIGJlIGNvbnNpZGVyZWQuXG4gKi9cbmZ1bmN0aW9uIGdldFJvdW5kZWRPZmZzZXRzKGRhdGEsIHNob3VsZFJvdW5kKSB7XG4gIHZhciBfZGF0YSRvZmZzZXRzID0gZGF0YS5vZmZzZXRzLFxuICAgICAgcG9wcGVyID0gX2RhdGEkb2Zmc2V0cy5wb3BwZXIsXG4gICAgICByZWZlcmVuY2UgPSBfZGF0YSRvZmZzZXRzLnJlZmVyZW5jZTtcbiAgdmFyIHJvdW5kID0gTWF0aC5yb3VuZCxcbiAgICAgIGZsb29yID0gTWF0aC5mbG9vcjtcblxuICB2YXIgbm9Sb3VuZCA9IGZ1bmN0aW9uIG5vUm91bmQodikge1xuICAgIHJldHVybiB2O1xuICB9O1xuXG4gIHZhciByZWZlcmVuY2VXaWR0aCA9IHJvdW5kKHJlZmVyZW5jZS53aWR0aCk7XG4gIHZhciBwb3BwZXJXaWR0aCA9IHJvdW5kKHBvcHBlci53aWR0aCk7XG5cbiAgdmFyIGlzVmVydGljYWwgPSBbJ2xlZnQnLCAncmlnaHQnXS5pbmRleE9mKGRhdGEucGxhY2VtZW50KSAhPT0gLTE7XG4gIHZhciBpc1ZhcmlhdGlvbiA9IGRhdGEucGxhY2VtZW50LmluZGV4T2YoJy0nKSAhPT0gLTE7XG4gIHZhciBzYW1lV2lkdGhQYXJpdHkgPSByZWZlcmVuY2VXaWR0aCAlIDIgPT09IHBvcHBlcldpZHRoICUgMjtcbiAgdmFyIGJvdGhPZGRXaWR0aCA9IHJlZmVyZW5jZVdpZHRoICUgMiA9PT0gMSAmJiBwb3BwZXJXaWR0aCAlIDIgPT09IDE7XG5cbiAgdmFyIGhvcml6b250YWxUb0ludGVnZXIgPSAhc2hvdWxkUm91bmQgPyBub1JvdW5kIDogaXNWZXJ0aWNhbCB8fCBpc1ZhcmlhdGlvbiB8fCBzYW1lV2lkdGhQYXJpdHkgPyByb3VuZCA6IGZsb29yO1xuICB2YXIgdmVydGljYWxUb0ludGVnZXIgPSAhc2hvdWxkUm91bmQgPyBub1JvdW5kIDogcm91bmQ7XG5cbiAgcmV0dXJuIHtcbiAgICBsZWZ0OiBob3Jpem9udGFsVG9JbnRlZ2VyKGJvdGhPZGRXaWR0aCAmJiAhaXNWYXJpYXRpb24gJiYgc2hvdWxkUm91bmQgPyBwb3BwZXIubGVmdCAtIDEgOiBwb3BwZXIubGVmdCksXG4gICAgdG9wOiB2ZXJ0aWNhbFRvSW50ZWdlcihwb3BwZXIudG9wKSxcbiAgICBib3R0b206IHZlcnRpY2FsVG9JbnRlZ2VyKHBvcHBlci5ib3R0b20pLFxuICAgIHJpZ2h0OiBob3Jpem9udGFsVG9JbnRlZ2VyKHBvcHBlci5yaWdodClcbiAgfTtcbn1cblxudmFyIGlzRmlyZWZveCA9IGlzQnJvd3NlciAmJiAvRmlyZWZveC9pLnRlc3QobmF2aWdhdG9yLnVzZXJBZ2VudCk7XG5cbi8qKlxuICogQGZ1bmN0aW9uXG4gKiBAbWVtYmVyb2YgTW9kaWZpZXJzXG4gKiBAYXJndW1lbnQge09iamVjdH0gZGF0YSAtIFRoZSBkYXRhIG9iamVjdCBnZW5lcmF0ZWQgYnkgYHVwZGF0ZWAgbWV0aG9kXG4gKiBAYXJndW1lbnQge09iamVjdH0gb3B0aW9ucyAtIE1vZGlmaWVycyBjb25maWd1cmF0aW9uIGFuZCBvcHRpb25zXG4gKiBAcmV0dXJucyB7T2JqZWN0fSBUaGUgZGF0YSBvYmplY3QsIHByb3Blcmx5IG1vZGlmaWVkXG4gKi9cbmZ1bmN0aW9uIGNvbXB1dGVTdHlsZShkYXRhLCBvcHRpb25zKSB7XG4gIHZhciB4ID0gb3B0aW9ucy54LFxuICAgICAgeSA9IG9wdGlvbnMueTtcbiAgdmFyIHBvcHBlciA9IGRhdGEub2Zmc2V0cy5wb3BwZXI7XG5cbiAgLy8gUmVtb3ZlIHRoaXMgbGVnYWN5IHN1cHBvcnQgaW4gUG9wcGVyLmpzIHYyXG5cbiAgdmFyIGxlZ2FjeUdwdUFjY2VsZXJhdGlvbk9wdGlvbiA9IGZpbmQoZGF0YS5pbnN0YW5jZS5tb2RpZmllcnMsIGZ1bmN0aW9uIChtb2RpZmllcikge1xuICAgIHJldHVybiBtb2RpZmllci5uYW1lID09PSAnYXBwbHlTdHlsZSc7XG4gIH0pLmdwdUFjY2VsZXJhdGlvbjtcbiAgaWYgKGxlZ2FjeUdwdUFjY2VsZXJhdGlvbk9wdGlvbiAhPT0gdW5kZWZpbmVkKSB7XG4gICAgY29uc29sZS53YXJuKCdXQVJOSU5HOiBgZ3B1QWNjZWxlcmF0aW9uYCBvcHRpb24gbW92ZWQgdG8gYGNvbXB1dGVTdHlsZWAgbW9kaWZpZXIgYW5kIHdpbGwgbm90IGJlIHN1cHBvcnRlZCBpbiBmdXR1cmUgdmVyc2lvbnMgb2YgUG9wcGVyLmpzIScpO1xuICB9XG4gIHZhciBncHVBY2NlbGVyYXRpb24gPSBsZWdhY3lHcHVBY2NlbGVyYXRpb25PcHRpb24gIT09IHVuZGVmaW5lZCA/IGxlZ2FjeUdwdUFjY2VsZXJhdGlvbk9wdGlvbiA6IG9wdGlvbnMuZ3B1QWNjZWxlcmF0aW9uO1xuXG4gIHZhciBvZmZzZXRQYXJlbnQgPSBnZXRPZmZzZXRQYXJlbnQoZGF0YS5pbnN0YW5jZS5wb3BwZXIpO1xuICB2YXIgb2Zmc2V0UGFyZW50UmVjdCA9IGdldEJvdW5kaW5nQ2xpZW50UmVjdChvZmZzZXRQYXJlbnQpO1xuXG4gIC8vIFN0eWxlc1xuICB2YXIgc3R5bGVzID0ge1xuICAgIHBvc2l0aW9uOiBwb3BwZXIucG9zaXRpb25cbiAgfTtcblxuICB2YXIgb2Zmc2V0cyA9IGdldFJvdW5kZWRPZmZzZXRzKGRhdGEsIHdpbmRvdy5kZXZpY2VQaXhlbFJhdGlvIDwgMiB8fCAhaXNGaXJlZm94KTtcblxuICB2YXIgc2lkZUEgPSB4ID09PSAnYm90dG9tJyA/ICd0b3AnIDogJ2JvdHRvbSc7XG4gIHZhciBzaWRlQiA9IHkgPT09ICdyaWdodCcgPyAnbGVmdCcgOiAncmlnaHQnO1xuXG4gIC8vIGlmIGdwdUFjY2VsZXJhdGlvbiBpcyBzZXQgdG8gYHRydWVgIGFuZCB0cmFuc2Zvcm0gaXMgc3VwcG9ydGVkLFxuICAvLyAgd2UgdXNlIGB0cmFuc2xhdGUzZGAgdG8gYXBwbHkgdGhlIHBvc2l0aW9uIHRvIHRoZSBwb3BwZXIgd2VcbiAgLy8gYXV0b21hdGljYWxseSB1c2UgdGhlIHN1cHBvcnRlZCBwcmVmaXhlZCB2ZXJzaW9uIGlmIG5lZWRlZFxuICB2YXIgcHJlZml4ZWRQcm9wZXJ0eSA9IGdldFN1cHBvcnRlZFByb3BlcnR5TmFtZSgndHJhbnNmb3JtJyk7XG5cbiAgLy8gbm93LCBsZXQncyBtYWtlIGEgc3RlcCBiYWNrIGFuZCBsb29rIGF0IHRoaXMgY29kZSBjbG9zZWx5ICh3dGY/KVxuICAvLyBJZiB0aGUgY29udGVudCBvZiB0aGUgcG9wcGVyIGdyb3dzIG9uY2UgaXQncyBiZWVuIHBvc2l0aW9uZWQsIGl0XG4gIC8vIG1heSBoYXBwZW4gdGhhdCB0aGUgcG9wcGVyIGdldHMgbWlzcGxhY2VkIGJlY2F1c2Ugb2YgdGhlIG5ldyBjb250ZW50XG4gIC8vIG92ZXJmbG93aW5nIGl0cyByZWZlcmVuY2UgZWxlbWVudFxuICAvLyBUbyBhdm9pZCB0aGlzIHByb2JsZW0sIHdlIHByb3ZpZGUgdHdvIG9wdGlvbnMgKHggYW5kIHkpLCB3aGljaCBhbGxvd1xuICAvLyB0aGUgY29uc3VtZXIgdG8gZGVmaW5lIHRoZSBvZmZzZXQgb3JpZ2luLlxuICAvLyBJZiB3ZSBwb3NpdGlvbiBhIHBvcHBlciBvbiB0b3Agb2YgYSByZWZlcmVuY2UgZWxlbWVudCwgd2UgY2FuIHNldFxuICAvLyBgeGAgdG8gYHRvcGAgdG8gbWFrZSB0aGUgcG9wcGVyIGdyb3cgdG93YXJkcyBpdHMgdG9wIGluc3RlYWQgb2ZcbiAgLy8gaXRzIGJvdHRvbS5cbiAgdmFyIGxlZnQgPSB2b2lkIDAsXG4gICAgICB0b3AgPSB2b2lkIDA7XG4gIGlmIChzaWRlQSA9PT0gJ2JvdHRvbScpIHtcbiAgICAvLyB3aGVuIG9mZnNldFBhcmVudCBpcyA8aHRtbD4gdGhlIHBvc2l0aW9uaW5nIGlzIHJlbGF0aXZlIHRvIHRoZSBib3R0b20gb2YgdGhlIHNjcmVlbiAoZXhjbHVkaW5nIHRoZSBzY3JvbGxiYXIpXG4gICAgLy8gYW5kIG5vdCB0aGUgYm90dG9tIG9mIHRoZSBodG1sIGVsZW1lbnRcbiAgICBpZiAob2Zmc2V0UGFyZW50Lm5vZGVOYW1lID09PSAnSFRNTCcpIHtcbiAgICAgIHRvcCA9IC1vZmZzZXRQYXJlbnQuY2xpZW50SGVpZ2h0ICsgb2Zmc2V0cy5ib3R0b207XG4gICAgfSBlbHNlIHtcbiAgICAgIHRvcCA9IC1vZmZzZXRQYXJlbnRSZWN0LmhlaWdodCArIG9mZnNldHMuYm90dG9tO1xuICAgIH1cbiAgfSBlbHNlIHtcbiAgICB0b3AgPSBvZmZzZXRzLnRvcDtcbiAgfVxuICBpZiAoc2lkZUIgPT09ICdyaWdodCcpIHtcbiAgICBpZiAob2Zmc2V0UGFyZW50Lm5vZGVOYW1lID09PSAnSFRNTCcpIHtcbiAgICAgIGxlZnQgPSAtb2Zmc2V0UGFyZW50LmNsaWVudFdpZHRoICsgb2Zmc2V0cy5yaWdodDtcbiAgICB9IGVsc2Uge1xuICAgICAgbGVmdCA9IC1vZmZzZXRQYXJlbnRSZWN0LndpZHRoICsgb2Zmc2V0cy5yaWdodDtcbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgbGVmdCA9IG9mZnNldHMubGVmdDtcbiAgfVxuICBpZiAoZ3B1QWNjZWxlcmF0aW9uICYmIHByZWZpeGVkUHJvcGVydHkpIHtcbiAgICBzdHlsZXNbcHJlZml4ZWRQcm9wZXJ0eV0gPSAndHJhbnNsYXRlM2QoJyArIGxlZnQgKyAncHgsICcgKyB0b3AgKyAncHgsIDApJztcbiAgICBzdHlsZXNbc2lkZUFdID0gMDtcbiAgICBzdHlsZXNbc2lkZUJdID0gMDtcbiAgICBzdHlsZXMud2lsbENoYW5nZSA9ICd0cmFuc2Zvcm0nO1xuICB9IGVsc2Uge1xuICAgIC8vIG90aHdlcmlzZSwgd2UgdXNlIHRoZSBzdGFuZGFyZCBgdG9wYCwgYGxlZnRgLCBgYm90dG9tYCBhbmQgYHJpZ2h0YCBwcm9wZXJ0aWVzXG4gICAgdmFyIGludmVydFRvcCA9IHNpZGVBID09PSAnYm90dG9tJyA/IC0xIDogMTtcbiAgICB2YXIgaW52ZXJ0TGVmdCA9IHNpZGVCID09PSAncmlnaHQnID8gLTEgOiAxO1xuICAgIHN0eWxlc1tzaWRlQV0gPSB0b3AgKiBpbnZlcnRUb3A7XG4gICAgc3R5bGVzW3NpZGVCXSA9IGxlZnQgKiBpbnZlcnRMZWZ0O1xuICAgIHN0eWxlcy53aWxsQ2hhbmdlID0gc2lkZUEgKyAnLCAnICsgc2lkZUI7XG4gIH1cblxuICAvLyBBdHRyaWJ1dGVzXG4gIHZhciBhdHRyaWJ1dGVzID0ge1xuICAgICd4LXBsYWNlbWVudCc6IGRhdGEucGxhY2VtZW50XG4gIH07XG5cbiAgLy8gVXBkYXRlIGBkYXRhYCBhdHRyaWJ1dGVzLCBzdHlsZXMgYW5kIGFycm93U3R5bGVzXG4gIGRhdGEuYXR0cmlidXRlcyA9IF9leHRlbmRzKHt9LCBhdHRyaWJ1dGVzLCBkYXRhLmF0dHJpYnV0ZXMpO1xuICBkYXRhLnN0eWxlcyA9IF9leHRlbmRzKHt9LCBzdHlsZXMsIGRhdGEuc3R5bGVzKTtcbiAgZGF0YS5hcnJvd1N0eWxlcyA9IF9leHRlbmRzKHt9LCBkYXRhLm9mZnNldHMuYXJyb3csIGRhdGEuYXJyb3dTdHlsZXMpO1xuXG4gIHJldHVybiBkYXRhO1xufVxuXG4vKipcbiAqIEhlbHBlciB1c2VkIHRvIGtub3cgaWYgdGhlIGdpdmVuIG1vZGlmaWVyIGRlcGVuZHMgZnJvbSBhbm90aGVyIG9uZS48YnIgLz5cbiAqIEl0IGNoZWNrcyBpZiB0aGUgbmVlZGVkIG1vZGlmaWVyIGlzIGxpc3RlZCBhbmQgZW5hYmxlZC5cbiAqIEBtZXRob2RcbiAqIEBtZW1iZXJvZiBQb3BwZXIuVXRpbHNcbiAqIEBwYXJhbSB7QXJyYXl9IG1vZGlmaWVycyAtIGxpc3Qgb2YgbW9kaWZpZXJzXG4gKiBAcGFyYW0ge1N0cmluZ30gcmVxdWVzdGluZ05hbWUgLSBuYW1lIG9mIHJlcXVlc3RpbmcgbW9kaWZpZXJcbiAqIEBwYXJhbSB7U3RyaW5nfSByZXF1ZXN0ZWROYW1lIC0gbmFtZSBvZiByZXF1ZXN0ZWQgbW9kaWZpZXJcbiAqIEByZXR1cm5zIHtCb29sZWFufVxuICovXG5mdW5jdGlvbiBpc01vZGlmaWVyUmVxdWlyZWQobW9kaWZpZXJzLCByZXF1ZXN0aW5nTmFtZSwgcmVxdWVzdGVkTmFtZSkge1xuICB2YXIgcmVxdWVzdGluZyA9IGZpbmQobW9kaWZpZXJzLCBmdW5jdGlvbiAoX3JlZikge1xuICAgIHZhciBuYW1lID0gX3JlZi5uYW1lO1xuICAgIHJldHVybiBuYW1lID09PSByZXF1ZXN0aW5nTmFtZTtcbiAgfSk7XG5cbiAgdmFyIGlzUmVxdWlyZWQgPSAhIXJlcXVlc3RpbmcgJiYgbW9kaWZpZXJzLnNvbWUoZnVuY3Rpb24gKG1vZGlmaWVyKSB7XG4gICAgcmV0dXJuIG1vZGlmaWVyLm5hbWUgPT09IHJlcXVlc3RlZE5hbWUgJiYgbW9kaWZpZXIuZW5hYmxlZCAmJiBtb2RpZmllci5vcmRlciA8IHJlcXVlc3Rpbmcub3JkZXI7XG4gIH0pO1xuXG4gIGlmICghaXNSZXF1aXJlZCkge1xuICAgIHZhciBfcmVxdWVzdGluZyA9ICdgJyArIHJlcXVlc3RpbmdOYW1lICsgJ2AnO1xuICAgIHZhciByZXF1ZXN0ZWQgPSAnYCcgKyByZXF1ZXN0ZWROYW1lICsgJ2AnO1xuICAgIGNvbnNvbGUud2FybihyZXF1ZXN0ZWQgKyAnIG1vZGlmaWVyIGlzIHJlcXVpcmVkIGJ5ICcgKyBfcmVxdWVzdGluZyArICcgbW9kaWZpZXIgaW4gb3JkZXIgdG8gd29yaywgYmUgc3VyZSB0byBpbmNsdWRlIGl0IGJlZm9yZSAnICsgX3JlcXVlc3RpbmcgKyAnIScpO1xuICB9XG4gIHJldHVybiBpc1JlcXVpcmVkO1xufVxuXG4vKipcbiAqIEBmdW5jdGlvblxuICogQG1lbWJlcm9mIE1vZGlmaWVyc1xuICogQGFyZ3VtZW50IHtPYmplY3R9IGRhdGEgLSBUaGUgZGF0YSBvYmplY3QgZ2VuZXJhdGVkIGJ5IHVwZGF0ZSBtZXRob2RcbiAqIEBhcmd1bWVudCB7T2JqZWN0fSBvcHRpb25zIC0gTW9kaWZpZXJzIGNvbmZpZ3VyYXRpb24gYW5kIG9wdGlvbnNcbiAqIEByZXR1cm5zIHtPYmplY3R9IFRoZSBkYXRhIG9iamVjdCwgcHJvcGVybHkgbW9kaWZpZWRcbiAqL1xuZnVuY3Rpb24gYXJyb3coZGF0YSwgb3B0aW9ucykge1xuICB2YXIgX2RhdGEkb2Zmc2V0cyRhcnJvdztcblxuICAvLyBhcnJvdyBkZXBlbmRzIG9uIGtlZXBUb2dldGhlciBpbiBvcmRlciB0byB3b3JrXG4gIGlmICghaXNNb2RpZmllclJlcXVpcmVkKGRhdGEuaW5zdGFuY2UubW9kaWZpZXJzLCAnYXJyb3cnLCAna2VlcFRvZ2V0aGVyJykpIHtcbiAgICByZXR1cm4gZGF0YTtcbiAgfVxuXG4gIHZhciBhcnJvd0VsZW1lbnQgPSBvcHRpb25zLmVsZW1lbnQ7XG5cbiAgLy8gaWYgYXJyb3dFbGVtZW50IGlzIGEgc3RyaW5nLCBzdXBwb3NlIGl0J3MgYSBDU1Mgc2VsZWN0b3JcbiAgaWYgKHR5cGVvZiBhcnJvd0VsZW1lbnQgPT09ICdzdHJpbmcnKSB7XG4gICAgYXJyb3dFbGVtZW50ID0gZGF0YS5pbnN0YW5jZS5wb3BwZXIucXVlcnlTZWxlY3RvcihhcnJvd0VsZW1lbnQpO1xuXG4gICAgLy8gaWYgYXJyb3dFbGVtZW50IGlzIG5vdCBmb3VuZCwgZG9uJ3QgcnVuIHRoZSBtb2RpZmllclxuICAgIGlmICghYXJyb3dFbGVtZW50KSB7XG4gICAgICByZXR1cm4gZGF0YTtcbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgLy8gaWYgdGhlIGFycm93RWxlbWVudCBpc24ndCBhIHF1ZXJ5IHNlbGVjdG9yIHdlIG11c3QgY2hlY2sgdGhhdCB0aGVcbiAgICAvLyBwcm92aWRlZCBET00gbm9kZSBpcyBjaGlsZCBvZiBpdHMgcG9wcGVyIG5vZGVcbiAgICBpZiAoIWRhdGEuaW5zdGFuY2UucG9wcGVyLmNvbnRhaW5zKGFycm93RWxlbWVudCkpIHtcbiAgICAgIGNvbnNvbGUud2FybignV0FSTklORzogYGFycm93LmVsZW1lbnRgIG11c3QgYmUgY2hpbGQgb2YgaXRzIHBvcHBlciBlbGVtZW50IScpO1xuICAgICAgcmV0dXJuIGRhdGE7XG4gICAgfVxuICB9XG5cbiAgdmFyIHBsYWNlbWVudCA9IGRhdGEucGxhY2VtZW50LnNwbGl0KCctJylbMF07XG4gIHZhciBfZGF0YSRvZmZzZXRzID0gZGF0YS5vZmZzZXRzLFxuICAgICAgcG9wcGVyID0gX2RhdGEkb2Zmc2V0cy5wb3BwZXIsXG4gICAgICByZWZlcmVuY2UgPSBfZGF0YSRvZmZzZXRzLnJlZmVyZW5jZTtcblxuICB2YXIgaXNWZXJ0aWNhbCA9IFsnbGVmdCcsICdyaWdodCddLmluZGV4T2YocGxhY2VtZW50KSAhPT0gLTE7XG5cbiAgdmFyIGxlbiA9IGlzVmVydGljYWwgPyAnaGVpZ2h0JyA6ICd3aWR0aCc7XG4gIHZhciBzaWRlQ2FwaXRhbGl6ZWQgPSBpc1ZlcnRpY2FsID8gJ1RvcCcgOiAnTGVmdCc7XG4gIHZhciBzaWRlID0gc2lkZUNhcGl0YWxpemVkLnRvTG93ZXJDYXNlKCk7XG4gIHZhciBhbHRTaWRlID0gaXNWZXJ0aWNhbCA/ICdsZWZ0JyA6ICd0b3AnO1xuICB2YXIgb3BTaWRlID0gaXNWZXJ0aWNhbCA/ICdib3R0b20nIDogJ3JpZ2h0JztcbiAgdmFyIGFycm93RWxlbWVudFNpemUgPSBnZXRPdXRlclNpemVzKGFycm93RWxlbWVudClbbGVuXTtcblxuICAvL1xuICAvLyBleHRlbmRzIGtlZXBUb2dldGhlciBiZWhhdmlvciBtYWtpbmcgc3VyZSB0aGUgcG9wcGVyIGFuZCBpdHNcbiAgLy8gcmVmZXJlbmNlIGhhdmUgZW5vdWdoIHBpeGVscyBpbiBjb25qdW5jdGlvblxuICAvL1xuXG4gIC8vIHRvcC9sZWZ0IHNpZGVcbiAgaWYgKHJlZmVyZW5jZVtvcFNpZGVdIC0gYXJyb3dFbGVtZW50U2l6ZSA8IHBvcHBlcltzaWRlXSkge1xuICAgIGRhdGEub2Zmc2V0cy5wb3BwZXJbc2lkZV0gLT0gcG9wcGVyW3NpZGVdIC0gKHJlZmVyZW5jZVtvcFNpZGVdIC0gYXJyb3dFbGVtZW50U2l6ZSk7XG4gIH1cbiAgLy8gYm90dG9tL3JpZ2h0IHNpZGVcbiAgaWYgKHJlZmVyZW5jZVtzaWRlXSArIGFycm93RWxlbWVudFNpemUgPiBwb3BwZXJbb3BTaWRlXSkge1xuICAgIGRhdGEub2Zmc2V0cy5wb3BwZXJbc2lkZV0gKz0gcmVmZXJlbmNlW3NpZGVdICsgYXJyb3dFbGVtZW50U2l6ZSAtIHBvcHBlcltvcFNpZGVdO1xuICB9XG4gIGRhdGEub2Zmc2V0cy5wb3BwZXIgPSBnZXRDbGllbnRSZWN0KGRhdGEub2Zmc2V0cy5wb3BwZXIpO1xuXG4gIC8vIGNvbXB1dGUgY2VudGVyIG9mIHRoZSBwb3BwZXJcbiAgdmFyIGNlbnRlciA9IHJlZmVyZW5jZVtzaWRlXSArIHJlZmVyZW5jZVtsZW5dIC8gMiAtIGFycm93RWxlbWVudFNpemUgLyAyO1xuXG4gIC8vIENvbXB1dGUgdGhlIHNpZGVWYWx1ZSB1c2luZyB0aGUgdXBkYXRlZCBwb3BwZXIgb2Zmc2V0c1xuICAvLyB0YWtlIHBvcHBlciBtYXJnaW4gaW4gYWNjb3VudCBiZWNhdXNlIHdlIGRvbid0IGhhdmUgdGhpcyBpbmZvIGF2YWlsYWJsZVxuICB2YXIgY3NzID0gZ2V0U3R5bGVDb21wdXRlZFByb3BlcnR5KGRhdGEuaW5zdGFuY2UucG9wcGVyKTtcbiAgdmFyIHBvcHBlck1hcmdpblNpZGUgPSBwYXJzZUZsb2F0KGNzc1snbWFyZ2luJyArIHNpZGVDYXBpdGFsaXplZF0sIDEwKTtcbiAgdmFyIHBvcHBlckJvcmRlclNpZGUgPSBwYXJzZUZsb2F0KGNzc1snYm9yZGVyJyArIHNpZGVDYXBpdGFsaXplZCArICdXaWR0aCddLCAxMCk7XG4gIHZhciBzaWRlVmFsdWUgPSBjZW50ZXIgLSBkYXRhLm9mZnNldHMucG9wcGVyW3NpZGVdIC0gcG9wcGVyTWFyZ2luU2lkZSAtIHBvcHBlckJvcmRlclNpZGU7XG5cbiAgLy8gcHJldmVudCBhcnJvd0VsZW1lbnQgZnJvbSBiZWluZyBwbGFjZWQgbm90IGNvbnRpZ3VvdXNseSB0byBpdHMgcG9wcGVyXG4gIHNpZGVWYWx1ZSA9IE1hdGgubWF4KE1hdGgubWluKHBvcHBlcltsZW5dIC0gYXJyb3dFbGVtZW50U2l6ZSwgc2lkZVZhbHVlKSwgMCk7XG5cbiAgZGF0YS5hcnJvd0VsZW1lbnQgPSBhcnJvd0VsZW1lbnQ7XG4gIGRhdGEub2Zmc2V0cy5hcnJvdyA9IChfZGF0YSRvZmZzZXRzJGFycm93ID0ge30sIGRlZmluZVByb3BlcnR5KF9kYXRhJG9mZnNldHMkYXJyb3csIHNpZGUsIE1hdGgucm91bmQoc2lkZVZhbHVlKSksIGRlZmluZVByb3BlcnR5KF9kYXRhJG9mZnNldHMkYXJyb3csIGFsdFNpZGUsICcnKSwgX2RhdGEkb2Zmc2V0cyRhcnJvdyk7XG5cbiAgcmV0dXJuIGRhdGE7XG59XG5cbi8qKlxuICogR2V0IHRoZSBvcHBvc2l0ZSBwbGFjZW1lbnQgdmFyaWF0aW9uIG9mIHRoZSBnaXZlbiBvbmVcbiAqIEBtZXRob2RcbiAqIEBtZW1iZXJvZiBQb3BwZXIuVXRpbHNcbiAqIEBhcmd1bWVudCB7U3RyaW5nfSBwbGFjZW1lbnQgdmFyaWF0aW9uXG4gKiBAcmV0dXJucyB7U3RyaW5nfSBmbGlwcGVkIHBsYWNlbWVudCB2YXJpYXRpb25cbiAqL1xuZnVuY3Rpb24gZ2V0T3Bwb3NpdGVWYXJpYXRpb24odmFyaWF0aW9uKSB7XG4gIGlmICh2YXJpYXRpb24gPT09ICdlbmQnKSB7XG4gICAgcmV0dXJuICdzdGFydCc7XG4gIH0gZWxzZSBpZiAodmFyaWF0aW9uID09PSAnc3RhcnQnKSB7XG4gICAgcmV0dXJuICdlbmQnO1xuICB9XG4gIHJldHVybiB2YXJpYXRpb247XG59XG5cbi8qKlxuICogTGlzdCBvZiBhY2NlcHRlZCBwbGFjZW1lbnRzIHRvIHVzZSBhcyB2YWx1ZXMgb2YgdGhlIGBwbGFjZW1lbnRgIG9wdGlvbi48YnIgLz5cbiAqIFZhbGlkIHBsYWNlbWVudHMgYXJlOlxuICogLSBgYXV0b2BcbiAqIC0gYHRvcGBcbiAqIC0gYHJpZ2h0YFxuICogLSBgYm90dG9tYFxuICogLSBgbGVmdGBcbiAqXG4gKiBFYWNoIHBsYWNlbWVudCBjYW4gaGF2ZSBhIHZhcmlhdGlvbiBmcm9tIHRoaXMgbGlzdDpcbiAqIC0gYC1zdGFydGBcbiAqIC0gYC1lbmRgXG4gKlxuICogVmFyaWF0aW9ucyBhcmUgaW50ZXJwcmV0ZWQgZWFzaWx5IGlmIHlvdSB0aGluayBvZiB0aGVtIGFzIHRoZSBsZWZ0IHRvIHJpZ2h0XG4gKiB3cml0dGVuIGxhbmd1YWdlcy4gSG9yaXpvbnRhbGx5IChgdG9wYCBhbmQgYGJvdHRvbWApLCBgc3RhcnRgIGlzIGxlZnQgYW5kIGBlbmRgXG4gKiBpcyByaWdodC48YnIgLz5cbiAqIFZlcnRpY2FsbHkgKGBsZWZ0YCBhbmQgYHJpZ2h0YCksIGBzdGFydGAgaXMgdG9wIGFuZCBgZW5kYCBpcyBib3R0b20uXG4gKlxuICogU29tZSB2YWxpZCBleGFtcGxlcyBhcmU6XG4gKiAtIGB0b3AtZW5kYCAob24gdG9wIG9mIHJlZmVyZW5jZSwgcmlnaHQgYWxpZ25lZClcbiAqIC0gYHJpZ2h0LXN0YXJ0YCAob24gcmlnaHQgb2YgcmVmZXJlbmNlLCB0b3AgYWxpZ25lZClcbiAqIC0gYGJvdHRvbWAgKG9uIGJvdHRvbSwgY2VudGVyZWQpXG4gKiAtIGBhdXRvLWVuZGAgKG9uIHRoZSBzaWRlIHdpdGggbW9yZSBzcGFjZSBhdmFpbGFibGUsIGFsaWdubWVudCBkZXBlbmRzIGJ5IHBsYWNlbWVudClcbiAqXG4gKiBAc3RhdGljXG4gKiBAdHlwZSB7QXJyYXl9XG4gKiBAZW51bSB7U3RyaW5nfVxuICogQHJlYWRvbmx5XG4gKiBAbWV0aG9kIHBsYWNlbWVudHNcbiAqIEBtZW1iZXJvZiBQb3BwZXJcbiAqL1xudmFyIHBsYWNlbWVudHMgPSBbJ2F1dG8tc3RhcnQnLCAnYXV0bycsICdhdXRvLWVuZCcsICd0b3Atc3RhcnQnLCAndG9wJywgJ3RvcC1lbmQnLCAncmlnaHQtc3RhcnQnLCAncmlnaHQnLCAncmlnaHQtZW5kJywgJ2JvdHRvbS1lbmQnLCAnYm90dG9tJywgJ2JvdHRvbS1zdGFydCcsICdsZWZ0LWVuZCcsICdsZWZ0JywgJ2xlZnQtc3RhcnQnXTtcblxuLy8gR2V0IHJpZCBvZiBgYXV0b2AgYGF1dG8tc3RhcnRgIGFuZCBgYXV0by1lbmRgXG52YXIgdmFsaWRQbGFjZW1lbnRzID0gcGxhY2VtZW50cy5zbGljZSgzKTtcblxuLyoqXG4gKiBHaXZlbiBhbiBpbml0aWFsIHBsYWNlbWVudCwgcmV0dXJucyBhbGwgdGhlIHN1YnNlcXVlbnQgcGxhY2VtZW50c1xuICogY2xvY2t3aXNlIChvciBjb3VudGVyLWNsb2Nrd2lzZSkuXG4gKlxuICogQG1ldGhvZFxuICogQG1lbWJlcm9mIFBvcHBlci5VdGlsc1xuICogQGFyZ3VtZW50IHtTdHJpbmd9IHBsYWNlbWVudCAtIEEgdmFsaWQgcGxhY2VtZW50IChpdCBhY2NlcHRzIHZhcmlhdGlvbnMpXG4gKiBAYXJndW1lbnQge0Jvb2xlYW59IGNvdW50ZXIgLSBTZXQgdG8gdHJ1ZSB0byB3YWxrIHRoZSBwbGFjZW1lbnRzIGNvdW50ZXJjbG9ja3dpc2VcbiAqIEByZXR1cm5zIHtBcnJheX0gcGxhY2VtZW50cyBpbmNsdWRpbmcgdGhlaXIgdmFyaWF0aW9uc1xuICovXG5mdW5jdGlvbiBjbG9ja3dpc2UocGxhY2VtZW50KSB7XG4gIHZhciBjb3VudGVyID0gYXJndW1lbnRzLmxlbmd0aCA+IDEgJiYgYXJndW1lbnRzWzFdICE9PSB1bmRlZmluZWQgPyBhcmd1bWVudHNbMV0gOiBmYWxzZTtcblxuICB2YXIgaW5kZXggPSB2YWxpZFBsYWNlbWVudHMuaW5kZXhPZihwbGFjZW1lbnQpO1xuICB2YXIgYXJyID0gdmFsaWRQbGFjZW1lbnRzLnNsaWNlKGluZGV4ICsgMSkuY29uY2F0KHZhbGlkUGxhY2VtZW50cy5zbGljZSgwLCBpbmRleCkpO1xuICByZXR1cm4gY291bnRlciA/IGFyci5yZXZlcnNlKCkgOiBhcnI7XG59XG5cbnZhciBCRUhBVklPUlMgPSB7XG4gIEZMSVA6ICdmbGlwJyxcbiAgQ0xPQ0tXSVNFOiAnY2xvY2t3aXNlJyxcbiAgQ09VTlRFUkNMT0NLV0lTRTogJ2NvdW50ZXJjbG9ja3dpc2UnXG59O1xuXG4vKipcbiAqIEBmdW5jdGlvblxuICogQG1lbWJlcm9mIE1vZGlmaWVyc1xuICogQGFyZ3VtZW50IHtPYmplY3R9IGRhdGEgLSBUaGUgZGF0YSBvYmplY3QgZ2VuZXJhdGVkIGJ5IHVwZGF0ZSBtZXRob2RcbiAqIEBhcmd1bWVudCB7T2JqZWN0fSBvcHRpb25zIC0gTW9kaWZpZXJzIGNvbmZpZ3VyYXRpb24gYW5kIG9wdGlvbnNcbiAqIEByZXR1cm5zIHtPYmplY3R9IFRoZSBkYXRhIG9iamVjdCwgcHJvcGVybHkgbW9kaWZpZWRcbiAqL1xuZnVuY3Rpb24gZmxpcChkYXRhLCBvcHRpb25zKSB7XG4gIC8vIGlmIGBpbm5lcmAgbW9kaWZpZXIgaXMgZW5hYmxlZCwgd2UgY2FuJ3QgdXNlIHRoZSBgZmxpcGAgbW9kaWZpZXJcbiAgaWYgKGlzTW9kaWZpZXJFbmFibGVkKGRhdGEuaW5zdGFuY2UubW9kaWZpZXJzLCAnaW5uZXInKSkge1xuICAgIHJldHVybiBkYXRhO1xuICB9XG5cbiAgaWYgKGRhdGEuZmxpcHBlZCAmJiBkYXRhLnBsYWNlbWVudCA9PT0gZGF0YS5vcmlnaW5hbFBsYWNlbWVudCkge1xuICAgIC8vIHNlZW1zIGxpa2UgZmxpcCBpcyB0cnlpbmcgdG8gbG9vcCwgcHJvYmFibHkgdGhlcmUncyBub3QgZW5vdWdoIHNwYWNlIG9uIGFueSBvZiB0aGUgZmxpcHBhYmxlIHNpZGVzXG4gICAgcmV0dXJuIGRhdGE7XG4gIH1cblxuICB2YXIgYm91bmRhcmllcyA9IGdldEJvdW5kYXJpZXMoZGF0YS5pbnN0YW5jZS5wb3BwZXIsIGRhdGEuaW5zdGFuY2UucmVmZXJlbmNlLCBvcHRpb25zLnBhZGRpbmcsIG9wdGlvbnMuYm91bmRhcmllc0VsZW1lbnQsIGRhdGEucG9zaXRpb25GaXhlZCk7XG5cbiAgdmFyIHBsYWNlbWVudCA9IGRhdGEucGxhY2VtZW50LnNwbGl0KCctJylbMF07XG4gIHZhciBwbGFjZW1lbnRPcHBvc2l0ZSA9IGdldE9wcG9zaXRlUGxhY2VtZW50KHBsYWNlbWVudCk7XG4gIHZhciB2YXJpYXRpb24gPSBkYXRhLnBsYWNlbWVudC5zcGxpdCgnLScpWzFdIHx8ICcnO1xuXG4gIHZhciBmbGlwT3JkZXIgPSBbXTtcblxuICBzd2l0Y2ggKG9wdGlvbnMuYmVoYXZpb3IpIHtcbiAgICBjYXNlIEJFSEFWSU9SUy5GTElQOlxuICAgICAgZmxpcE9yZGVyID0gW3BsYWNlbWVudCwgcGxhY2VtZW50T3Bwb3NpdGVdO1xuICAgICAgYnJlYWs7XG4gICAgY2FzZSBCRUhBVklPUlMuQ0xPQ0tXSVNFOlxuICAgICAgZmxpcE9yZGVyID0gY2xvY2t3aXNlKHBsYWNlbWVudCk7XG4gICAgICBicmVhaztcbiAgICBjYXNlIEJFSEFWSU9SUy5DT1VOVEVSQ0xPQ0tXSVNFOlxuICAgICAgZmxpcE9yZGVyID0gY2xvY2t3aXNlKHBsYWNlbWVudCwgdHJ1ZSk7XG4gICAgICBicmVhaztcbiAgICBkZWZhdWx0OlxuICAgICAgZmxpcE9yZGVyID0gb3B0aW9ucy5iZWhhdmlvcjtcbiAgfVxuXG4gIGZsaXBPcmRlci5mb3JFYWNoKGZ1bmN0aW9uIChzdGVwLCBpbmRleCkge1xuICAgIGlmIChwbGFjZW1lbnQgIT09IHN0ZXAgfHwgZmxpcE9yZGVyLmxlbmd0aCA9PT0gaW5kZXggKyAxKSB7XG4gICAgICByZXR1cm4gZGF0YTtcbiAgICB9XG5cbiAgICBwbGFjZW1lbnQgPSBkYXRhLnBsYWNlbWVudC5zcGxpdCgnLScpWzBdO1xuICAgIHBsYWNlbWVudE9wcG9zaXRlID0gZ2V0T3Bwb3NpdGVQbGFjZW1lbnQocGxhY2VtZW50KTtcblxuICAgIHZhciBwb3BwZXJPZmZzZXRzID0gZGF0YS5vZmZzZXRzLnBvcHBlcjtcbiAgICB2YXIgcmVmT2Zmc2V0cyA9IGRhdGEub2Zmc2V0cy5yZWZlcmVuY2U7XG5cbiAgICAvLyB1c2luZyBmbG9vciBiZWNhdXNlIHRoZSByZWZlcmVuY2Ugb2Zmc2V0cyBtYXkgY29udGFpbiBkZWNpbWFscyB3ZSBhcmUgbm90IGdvaW5nIHRvIGNvbnNpZGVyIGhlcmVcbiAgICB2YXIgZmxvb3IgPSBNYXRoLmZsb29yO1xuICAgIHZhciBvdmVybGFwc1JlZiA9IHBsYWNlbWVudCA9PT0gJ2xlZnQnICYmIGZsb29yKHBvcHBlck9mZnNldHMucmlnaHQpID4gZmxvb3IocmVmT2Zmc2V0cy5sZWZ0KSB8fCBwbGFjZW1lbnQgPT09ICdyaWdodCcgJiYgZmxvb3IocG9wcGVyT2Zmc2V0cy5sZWZ0KSA8IGZsb29yKHJlZk9mZnNldHMucmlnaHQpIHx8IHBsYWNlbWVudCA9PT0gJ3RvcCcgJiYgZmxvb3IocG9wcGVyT2Zmc2V0cy5ib3R0b20pID4gZmxvb3IocmVmT2Zmc2V0cy50b3ApIHx8IHBsYWNlbWVudCA9PT0gJ2JvdHRvbScgJiYgZmxvb3IocG9wcGVyT2Zmc2V0cy50b3ApIDwgZmxvb3IocmVmT2Zmc2V0cy5ib3R0b20pO1xuXG4gICAgdmFyIG92ZXJmbG93c0xlZnQgPSBmbG9vcihwb3BwZXJPZmZzZXRzLmxlZnQpIDwgZmxvb3IoYm91bmRhcmllcy5sZWZ0KTtcbiAgICB2YXIgb3ZlcmZsb3dzUmlnaHQgPSBmbG9vcihwb3BwZXJPZmZzZXRzLnJpZ2h0KSA+IGZsb29yKGJvdW5kYXJpZXMucmlnaHQpO1xuICAgIHZhciBvdmVyZmxvd3NUb3AgPSBmbG9vcihwb3BwZXJPZmZzZXRzLnRvcCkgPCBmbG9vcihib3VuZGFyaWVzLnRvcCk7XG4gICAgdmFyIG92ZXJmbG93c0JvdHRvbSA9IGZsb29yKHBvcHBlck9mZnNldHMuYm90dG9tKSA+IGZsb29yKGJvdW5kYXJpZXMuYm90dG9tKTtcblxuICAgIHZhciBvdmVyZmxvd3NCb3VuZGFyaWVzID0gcGxhY2VtZW50ID09PSAnbGVmdCcgJiYgb3ZlcmZsb3dzTGVmdCB8fCBwbGFjZW1lbnQgPT09ICdyaWdodCcgJiYgb3ZlcmZsb3dzUmlnaHQgfHwgcGxhY2VtZW50ID09PSAndG9wJyAmJiBvdmVyZmxvd3NUb3AgfHwgcGxhY2VtZW50ID09PSAnYm90dG9tJyAmJiBvdmVyZmxvd3NCb3R0b207XG5cbiAgICAvLyBmbGlwIHRoZSB2YXJpYXRpb24gaWYgcmVxdWlyZWRcbiAgICB2YXIgaXNWZXJ0aWNhbCA9IFsndG9wJywgJ2JvdHRvbSddLmluZGV4T2YocGxhY2VtZW50KSAhPT0gLTE7XG4gICAgdmFyIGZsaXBwZWRWYXJpYXRpb24gPSAhIW9wdGlvbnMuZmxpcFZhcmlhdGlvbnMgJiYgKGlzVmVydGljYWwgJiYgdmFyaWF0aW9uID09PSAnc3RhcnQnICYmIG92ZXJmbG93c0xlZnQgfHwgaXNWZXJ0aWNhbCAmJiB2YXJpYXRpb24gPT09ICdlbmQnICYmIG92ZXJmbG93c1JpZ2h0IHx8ICFpc1ZlcnRpY2FsICYmIHZhcmlhdGlvbiA9PT0gJ3N0YXJ0JyAmJiBvdmVyZmxvd3NUb3AgfHwgIWlzVmVydGljYWwgJiYgdmFyaWF0aW9uID09PSAnZW5kJyAmJiBvdmVyZmxvd3NCb3R0b20pO1xuXG4gICAgaWYgKG92ZXJsYXBzUmVmIHx8IG92ZXJmbG93c0JvdW5kYXJpZXMgfHwgZmxpcHBlZFZhcmlhdGlvbikge1xuICAgICAgLy8gdGhpcyBib29sZWFuIHRvIGRldGVjdCBhbnkgZmxpcCBsb29wXG4gICAgICBkYXRhLmZsaXBwZWQgPSB0cnVlO1xuXG4gICAgICBpZiAob3ZlcmxhcHNSZWYgfHwgb3ZlcmZsb3dzQm91bmRhcmllcykge1xuICAgICAgICBwbGFjZW1lbnQgPSBmbGlwT3JkZXJbaW5kZXggKyAxXTtcbiAgICAgIH1cblxuICAgICAgaWYgKGZsaXBwZWRWYXJpYXRpb24pIHtcbiAgICAgICAgdmFyaWF0aW9uID0gZ2V0T3Bwb3NpdGVWYXJpYXRpb24odmFyaWF0aW9uKTtcbiAgICAgIH1cblxuICAgICAgZGF0YS5wbGFjZW1lbnQgPSBwbGFjZW1lbnQgKyAodmFyaWF0aW9uID8gJy0nICsgdmFyaWF0aW9uIDogJycpO1xuXG4gICAgICAvLyB0aGlzIG9iamVjdCBjb250YWlucyBgcG9zaXRpb25gLCB3ZSB3YW50IHRvIHByZXNlcnZlIGl0IGFsb25nIHdpdGhcbiAgICAgIC8vIGFueSBhZGRpdGlvbmFsIHByb3BlcnR5IHdlIG1heSBhZGQgaW4gdGhlIGZ1dHVyZVxuICAgICAgZGF0YS5vZmZzZXRzLnBvcHBlciA9IF9leHRlbmRzKHt9LCBkYXRhLm9mZnNldHMucG9wcGVyLCBnZXRQb3BwZXJPZmZzZXRzKGRhdGEuaW5zdGFuY2UucG9wcGVyLCBkYXRhLm9mZnNldHMucmVmZXJlbmNlLCBkYXRhLnBsYWNlbWVudCkpO1xuXG4gICAgICBkYXRhID0gcnVuTW9kaWZpZXJzKGRhdGEuaW5zdGFuY2UubW9kaWZpZXJzLCBkYXRhLCAnZmxpcCcpO1xuICAgIH1cbiAgfSk7XG4gIHJldHVybiBkYXRhO1xufVxuXG4vKipcbiAqIEBmdW5jdGlvblxuICogQG1lbWJlcm9mIE1vZGlmaWVyc1xuICogQGFyZ3VtZW50IHtPYmplY3R9IGRhdGEgLSBUaGUgZGF0YSBvYmplY3QgZ2VuZXJhdGVkIGJ5IHVwZGF0ZSBtZXRob2RcbiAqIEBhcmd1bWVudCB7T2JqZWN0fSBvcHRpb25zIC0gTW9kaWZpZXJzIGNvbmZpZ3VyYXRpb24gYW5kIG9wdGlvbnNcbiAqIEByZXR1cm5zIHtPYmplY3R9IFRoZSBkYXRhIG9iamVjdCwgcHJvcGVybHkgbW9kaWZpZWRcbiAqL1xuZnVuY3Rpb24ga2VlcFRvZ2V0aGVyKGRhdGEpIHtcbiAgdmFyIF9kYXRhJG9mZnNldHMgPSBkYXRhLm9mZnNldHMsXG4gICAgICBwb3BwZXIgPSBfZGF0YSRvZmZzZXRzLnBvcHBlcixcbiAgICAgIHJlZmVyZW5jZSA9IF9kYXRhJG9mZnNldHMucmVmZXJlbmNlO1xuXG4gIHZhciBwbGFjZW1lbnQgPSBkYXRhLnBsYWNlbWVudC5zcGxpdCgnLScpWzBdO1xuICB2YXIgZmxvb3IgPSBNYXRoLmZsb29yO1xuICB2YXIgaXNWZXJ0aWNhbCA9IFsndG9wJywgJ2JvdHRvbSddLmluZGV4T2YocGxhY2VtZW50KSAhPT0gLTE7XG4gIHZhciBzaWRlID0gaXNWZXJ0aWNhbCA/ICdyaWdodCcgOiAnYm90dG9tJztcbiAgdmFyIG9wU2lkZSA9IGlzVmVydGljYWwgPyAnbGVmdCcgOiAndG9wJztcbiAgdmFyIG1lYXN1cmVtZW50ID0gaXNWZXJ0aWNhbCA/ICd3aWR0aCcgOiAnaGVpZ2h0JztcblxuICBpZiAocG9wcGVyW3NpZGVdIDwgZmxvb3IocmVmZXJlbmNlW29wU2lkZV0pKSB7XG4gICAgZGF0YS5vZmZzZXRzLnBvcHBlcltvcFNpZGVdID0gZmxvb3IocmVmZXJlbmNlW29wU2lkZV0pIC0gcG9wcGVyW21lYXN1cmVtZW50XTtcbiAgfVxuICBpZiAocG9wcGVyW29wU2lkZV0gPiBmbG9vcihyZWZlcmVuY2Vbc2lkZV0pKSB7XG4gICAgZGF0YS5vZmZzZXRzLnBvcHBlcltvcFNpZGVdID0gZmxvb3IocmVmZXJlbmNlW3NpZGVdKTtcbiAgfVxuXG4gIHJldHVybiBkYXRhO1xufVxuXG4vKipcbiAqIENvbnZlcnRzIGEgc3RyaW5nIGNvbnRhaW5pbmcgdmFsdWUgKyB1bml0IGludG8gYSBweCB2YWx1ZSBudW1iZXJcbiAqIEBmdW5jdGlvblxuICogQG1lbWJlcm9mIHttb2RpZmllcnN+b2Zmc2V0fVxuICogQHByaXZhdGVcbiAqIEBhcmd1bWVudCB7U3RyaW5nfSBzdHIgLSBWYWx1ZSArIHVuaXQgc3RyaW5nXG4gKiBAYXJndW1lbnQge1N0cmluZ30gbWVhc3VyZW1lbnQgLSBgaGVpZ2h0YCBvciBgd2lkdGhgXG4gKiBAYXJndW1lbnQge09iamVjdH0gcG9wcGVyT2Zmc2V0c1xuICogQGFyZ3VtZW50IHtPYmplY3R9IHJlZmVyZW5jZU9mZnNldHNcbiAqIEByZXR1cm5zIHtOdW1iZXJ8U3RyaW5nfVxuICogVmFsdWUgaW4gcGl4ZWxzLCBvciBvcmlnaW5hbCBzdHJpbmcgaWYgbm8gdmFsdWVzIHdlcmUgZXh0cmFjdGVkXG4gKi9cbmZ1bmN0aW9uIHRvVmFsdWUoc3RyLCBtZWFzdXJlbWVudCwgcG9wcGVyT2Zmc2V0cywgcmVmZXJlbmNlT2Zmc2V0cykge1xuICAvLyBzZXBhcmF0ZSB2YWx1ZSBmcm9tIHVuaXRcbiAgdmFyIHNwbGl0ID0gc3RyLm1hdGNoKC8oKD86XFwtfFxcKyk/XFxkKlxcLj9cXGQqKSguKikvKTtcbiAgdmFyIHZhbHVlID0gK3NwbGl0WzFdO1xuICB2YXIgdW5pdCA9IHNwbGl0WzJdO1xuXG4gIC8vIElmIGl0J3Mgbm90IGEgbnVtYmVyIGl0J3MgYW4gb3BlcmF0b3IsIEkgZ3Vlc3NcbiAgaWYgKCF2YWx1ZSkge1xuICAgIHJldHVybiBzdHI7XG4gIH1cblxuICBpZiAodW5pdC5pbmRleE9mKCclJykgPT09IDApIHtcbiAgICB2YXIgZWxlbWVudCA9IHZvaWQgMDtcbiAgICBzd2l0Y2ggKHVuaXQpIHtcbiAgICAgIGNhc2UgJyVwJzpcbiAgICAgICAgZWxlbWVudCA9IHBvcHBlck9mZnNldHM7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAnJSc6XG4gICAgICBjYXNlICclcic6XG4gICAgICBkZWZhdWx0OlxuICAgICAgICBlbGVtZW50ID0gcmVmZXJlbmNlT2Zmc2V0cztcbiAgICB9XG5cbiAgICB2YXIgcmVjdCA9IGdldENsaWVudFJlY3QoZWxlbWVudCk7XG4gICAgcmV0dXJuIHJlY3RbbWVhc3VyZW1lbnRdIC8gMTAwICogdmFsdWU7XG4gIH0gZWxzZSBpZiAodW5pdCA9PT0gJ3ZoJyB8fCB1bml0ID09PSAndncnKSB7XG4gICAgLy8gaWYgaXMgYSB2aCBvciB2dywgd2UgY2FsY3VsYXRlIHRoZSBzaXplIGJhc2VkIG9uIHRoZSB2aWV3cG9ydFxuICAgIHZhciBzaXplID0gdm9pZCAwO1xuICAgIGlmICh1bml0ID09PSAndmgnKSB7XG4gICAgICBzaXplID0gTWF0aC5tYXgoZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LmNsaWVudEhlaWdodCwgd2luZG93LmlubmVySGVpZ2h0IHx8IDApO1xuICAgIH0gZWxzZSB7XG4gICAgICBzaXplID0gTWF0aC5tYXgoZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LmNsaWVudFdpZHRoLCB3aW5kb3cuaW5uZXJXaWR0aCB8fCAwKTtcbiAgICB9XG4gICAgcmV0dXJuIHNpemUgLyAxMDAgKiB2YWx1ZTtcbiAgfSBlbHNlIHtcbiAgICAvLyBpZiBpcyBhbiBleHBsaWNpdCBwaXhlbCB1bml0LCB3ZSBnZXQgcmlkIG9mIHRoZSB1bml0IGFuZCBrZWVwIHRoZSB2YWx1ZVxuICAgIC8vIGlmIGlzIGFuIGltcGxpY2l0IHVuaXQsIGl0J3MgcHgsIGFuZCB3ZSByZXR1cm4ganVzdCB0aGUgdmFsdWVcbiAgICByZXR1cm4gdmFsdWU7XG4gIH1cbn1cblxuLyoqXG4gKiBQYXJzZSBhbiBgb2Zmc2V0YCBzdHJpbmcgdG8gZXh0cmFwb2xhdGUgYHhgIGFuZCBgeWAgbnVtZXJpYyBvZmZzZXRzLlxuICogQGZ1bmN0aW9uXG4gKiBAbWVtYmVyb2Yge21vZGlmaWVyc35vZmZzZXR9XG4gKiBAcHJpdmF0ZVxuICogQGFyZ3VtZW50IHtTdHJpbmd9IG9mZnNldFxuICogQGFyZ3VtZW50IHtPYmplY3R9IHBvcHBlck9mZnNldHNcbiAqIEBhcmd1bWVudCB7T2JqZWN0fSByZWZlcmVuY2VPZmZzZXRzXG4gKiBAYXJndW1lbnQge1N0cmluZ30gYmFzZVBsYWNlbWVudFxuICogQHJldHVybnMge0FycmF5fSBhIHR3byBjZWxscyBhcnJheSB3aXRoIHggYW5kIHkgb2Zmc2V0cyBpbiBudW1iZXJzXG4gKi9cbmZ1bmN0aW9uIHBhcnNlT2Zmc2V0KG9mZnNldCwgcG9wcGVyT2Zmc2V0cywgcmVmZXJlbmNlT2Zmc2V0cywgYmFzZVBsYWNlbWVudCkge1xuICB2YXIgb2Zmc2V0cyA9IFswLCAwXTtcblxuICAvLyBVc2UgaGVpZ2h0IGlmIHBsYWNlbWVudCBpcyBsZWZ0IG9yIHJpZ2h0IGFuZCBpbmRleCBpcyAwIG90aGVyd2lzZSB1c2Ugd2lkdGhcbiAgLy8gaW4gdGhpcyB3YXkgdGhlIGZpcnN0IG9mZnNldCB3aWxsIHVzZSBhbiBheGlzIGFuZCB0aGUgc2Vjb25kIG9uZVxuICAvLyB3aWxsIHVzZSB0aGUgb3RoZXIgb25lXG4gIHZhciB1c2VIZWlnaHQgPSBbJ3JpZ2h0JywgJ2xlZnQnXS5pbmRleE9mKGJhc2VQbGFjZW1lbnQpICE9PSAtMTtcblxuICAvLyBTcGxpdCB0aGUgb2Zmc2V0IHN0cmluZyB0byBvYnRhaW4gYSBsaXN0IG9mIHZhbHVlcyBhbmQgb3BlcmFuZHNcbiAgLy8gVGhlIHJlZ2V4IGFkZHJlc3NlcyB2YWx1ZXMgd2l0aCB0aGUgcGx1cyBvciBtaW51cyBzaWduIGluIGZyb250ICgrMTAsIC0yMCwgZXRjKVxuICB2YXIgZnJhZ21lbnRzID0gb2Zmc2V0LnNwbGl0KC8oXFwrfFxcLSkvKS5tYXAoZnVuY3Rpb24gKGZyYWcpIHtcbiAgICByZXR1cm4gZnJhZy50cmltKCk7XG4gIH0pO1xuXG4gIC8vIERldGVjdCBpZiB0aGUgb2Zmc2V0IHN0cmluZyBjb250YWlucyBhIHBhaXIgb2YgdmFsdWVzIG9yIGEgc2luZ2xlIG9uZVxuICAvLyB0aGV5IGNvdWxkIGJlIHNlcGFyYXRlZCBieSBjb21tYSBvciBzcGFjZVxuICB2YXIgZGl2aWRlciA9IGZyYWdtZW50cy5pbmRleE9mKGZpbmQoZnJhZ21lbnRzLCBmdW5jdGlvbiAoZnJhZykge1xuICAgIHJldHVybiBmcmFnLnNlYXJjaCgvLHxcXHMvKSAhPT0gLTE7XG4gIH0pKTtcblxuICBpZiAoZnJhZ21lbnRzW2RpdmlkZXJdICYmIGZyYWdtZW50c1tkaXZpZGVyXS5pbmRleE9mKCcsJykgPT09IC0xKSB7XG4gICAgY29uc29sZS53YXJuKCdPZmZzZXRzIHNlcGFyYXRlZCBieSB3aGl0ZSBzcGFjZShzKSBhcmUgZGVwcmVjYXRlZCwgdXNlIGEgY29tbWEgKCwpIGluc3RlYWQuJyk7XG4gIH1cblxuICAvLyBJZiBkaXZpZGVyIGlzIGZvdW5kLCB3ZSBkaXZpZGUgdGhlIGxpc3Qgb2YgdmFsdWVzIGFuZCBvcGVyYW5kcyB0byBkaXZpZGVcbiAgLy8gdGhlbSBieSBvZnNldCBYIGFuZCBZLlxuICB2YXIgc3BsaXRSZWdleCA9IC9cXHMqLFxccyp8XFxzKy87XG4gIHZhciBvcHMgPSBkaXZpZGVyICE9PSAtMSA/IFtmcmFnbWVudHMuc2xpY2UoMCwgZGl2aWRlcikuY29uY2F0KFtmcmFnbWVudHNbZGl2aWRlcl0uc3BsaXQoc3BsaXRSZWdleClbMF1dKSwgW2ZyYWdtZW50c1tkaXZpZGVyXS5zcGxpdChzcGxpdFJlZ2V4KVsxXV0uY29uY2F0KGZyYWdtZW50cy5zbGljZShkaXZpZGVyICsgMSkpXSA6IFtmcmFnbWVudHNdO1xuXG4gIC8vIENvbnZlcnQgdGhlIHZhbHVlcyB3aXRoIHVuaXRzIHRvIGFic29sdXRlIHBpeGVscyB0byBhbGxvdyBvdXIgY29tcHV0YXRpb25zXG4gIG9wcyA9IG9wcy5tYXAoZnVuY3Rpb24gKG9wLCBpbmRleCkge1xuICAgIC8vIE1vc3Qgb2YgdGhlIHVuaXRzIHJlbHkgb24gdGhlIG9yaWVudGF0aW9uIG9mIHRoZSBwb3BwZXJcbiAgICB2YXIgbWVhc3VyZW1lbnQgPSAoaW5kZXggPT09IDEgPyAhdXNlSGVpZ2h0IDogdXNlSGVpZ2h0KSA/ICdoZWlnaHQnIDogJ3dpZHRoJztcbiAgICB2YXIgbWVyZ2VXaXRoUHJldmlvdXMgPSBmYWxzZTtcbiAgICByZXR1cm4gb3BcbiAgICAvLyBUaGlzIGFnZ3JlZ2F0ZXMgYW55IGArYCBvciBgLWAgc2lnbiB0aGF0IGFyZW4ndCBjb25zaWRlcmVkIG9wZXJhdG9yc1xuICAgIC8vIGUuZy46IDEwICsgKzUgPT4gWzEwLCArLCArNV1cbiAgICAucmVkdWNlKGZ1bmN0aW9uIChhLCBiKSB7XG4gICAgICBpZiAoYVthLmxlbmd0aCAtIDFdID09PSAnJyAmJiBbJysnLCAnLSddLmluZGV4T2YoYikgIT09IC0xKSB7XG4gICAgICAgIGFbYS5sZW5ndGggLSAxXSA9IGI7XG4gICAgICAgIG1lcmdlV2l0aFByZXZpb3VzID0gdHJ1ZTtcbiAgICAgICAgcmV0dXJuIGE7XG4gICAgICB9IGVsc2UgaWYgKG1lcmdlV2l0aFByZXZpb3VzKSB7XG4gICAgICAgIGFbYS5sZW5ndGggLSAxXSArPSBiO1xuICAgICAgICBtZXJnZVdpdGhQcmV2aW91cyA9IGZhbHNlO1xuICAgICAgICByZXR1cm4gYTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiBhLmNvbmNhdChiKTtcbiAgICAgIH1cbiAgICB9LCBbXSlcbiAgICAvLyBIZXJlIHdlIGNvbnZlcnQgdGhlIHN0cmluZyB2YWx1ZXMgaW50byBudW1iZXIgdmFsdWVzIChpbiBweClcbiAgICAubWFwKGZ1bmN0aW9uIChzdHIpIHtcbiAgICAgIHJldHVybiB0b1ZhbHVlKHN0ciwgbWVhc3VyZW1lbnQsIHBvcHBlck9mZnNldHMsIHJlZmVyZW5jZU9mZnNldHMpO1xuICAgIH0pO1xuICB9KTtcblxuICAvLyBMb29wIHRyb3VnaCB0aGUgb2Zmc2V0cyBhcnJheXMgYW5kIGV4ZWN1dGUgdGhlIG9wZXJhdGlvbnNcbiAgb3BzLmZvckVhY2goZnVuY3Rpb24gKG9wLCBpbmRleCkge1xuICAgIG9wLmZvckVhY2goZnVuY3Rpb24gKGZyYWcsIGluZGV4Mikge1xuICAgICAgaWYgKGlzTnVtZXJpYyhmcmFnKSkge1xuICAgICAgICBvZmZzZXRzW2luZGV4XSArPSBmcmFnICogKG9wW2luZGV4MiAtIDFdID09PSAnLScgPyAtMSA6IDEpO1xuICAgICAgfVxuICAgIH0pO1xuICB9KTtcbiAgcmV0dXJuIG9mZnNldHM7XG59XG5cbi8qKlxuICogQGZ1bmN0aW9uXG4gKiBAbWVtYmVyb2YgTW9kaWZpZXJzXG4gKiBAYXJndW1lbnQge09iamVjdH0gZGF0YSAtIFRoZSBkYXRhIG9iamVjdCBnZW5lcmF0ZWQgYnkgdXBkYXRlIG1ldGhvZFxuICogQGFyZ3VtZW50IHtPYmplY3R9IG9wdGlvbnMgLSBNb2RpZmllcnMgY29uZmlndXJhdGlvbiBhbmQgb3B0aW9uc1xuICogQGFyZ3VtZW50IHtOdW1iZXJ8U3RyaW5nfSBvcHRpb25zLm9mZnNldD0wXG4gKiBUaGUgb2Zmc2V0IHZhbHVlIGFzIGRlc2NyaWJlZCBpbiB0aGUgbW9kaWZpZXIgZGVzY3JpcHRpb25cbiAqIEByZXR1cm5zIHtPYmplY3R9IFRoZSBkYXRhIG9iamVjdCwgcHJvcGVybHkgbW9kaWZpZWRcbiAqL1xuZnVuY3Rpb24gb2Zmc2V0KGRhdGEsIF9yZWYpIHtcbiAgdmFyIG9mZnNldCA9IF9yZWYub2Zmc2V0O1xuICB2YXIgcGxhY2VtZW50ID0gZGF0YS5wbGFjZW1lbnQsXG4gICAgICBfZGF0YSRvZmZzZXRzID0gZGF0YS5vZmZzZXRzLFxuICAgICAgcG9wcGVyID0gX2RhdGEkb2Zmc2V0cy5wb3BwZXIsXG4gICAgICByZWZlcmVuY2UgPSBfZGF0YSRvZmZzZXRzLnJlZmVyZW5jZTtcblxuICB2YXIgYmFzZVBsYWNlbWVudCA9IHBsYWNlbWVudC5zcGxpdCgnLScpWzBdO1xuXG4gIHZhciBvZmZzZXRzID0gdm9pZCAwO1xuICBpZiAoaXNOdW1lcmljKCtvZmZzZXQpKSB7XG4gICAgb2Zmc2V0cyA9IFsrb2Zmc2V0LCAwXTtcbiAgfSBlbHNlIHtcbiAgICBvZmZzZXRzID0gcGFyc2VPZmZzZXQob2Zmc2V0LCBwb3BwZXIsIHJlZmVyZW5jZSwgYmFzZVBsYWNlbWVudCk7XG4gIH1cblxuICBpZiAoYmFzZVBsYWNlbWVudCA9PT0gJ2xlZnQnKSB7XG4gICAgcG9wcGVyLnRvcCArPSBvZmZzZXRzWzBdO1xuICAgIHBvcHBlci5sZWZ0IC09IG9mZnNldHNbMV07XG4gIH0gZWxzZSBpZiAoYmFzZVBsYWNlbWVudCA9PT0gJ3JpZ2h0Jykge1xuICAgIHBvcHBlci50b3AgKz0gb2Zmc2V0c1swXTtcbiAgICBwb3BwZXIubGVmdCArPSBvZmZzZXRzWzFdO1xuICB9IGVsc2UgaWYgKGJhc2VQbGFjZW1lbnQgPT09ICd0b3AnKSB7XG4gICAgcG9wcGVyLmxlZnQgKz0gb2Zmc2V0c1swXTtcbiAgICBwb3BwZXIudG9wIC09IG9mZnNldHNbMV07XG4gIH0gZWxzZSBpZiAoYmFzZVBsYWNlbWVudCA9PT0gJ2JvdHRvbScpIHtcbiAgICBwb3BwZXIubGVmdCArPSBvZmZzZXRzWzBdO1xuICAgIHBvcHBlci50b3AgKz0gb2Zmc2V0c1sxXTtcbiAgfVxuXG4gIGRhdGEucG9wcGVyID0gcG9wcGVyO1xuICByZXR1cm4gZGF0YTtcbn1cblxuLyoqXG4gKiBAZnVuY3Rpb25cbiAqIEBtZW1iZXJvZiBNb2RpZmllcnNcbiAqIEBhcmd1bWVudCB7T2JqZWN0fSBkYXRhIC0gVGhlIGRhdGEgb2JqZWN0IGdlbmVyYXRlZCBieSBgdXBkYXRlYCBtZXRob2RcbiAqIEBhcmd1bWVudCB7T2JqZWN0fSBvcHRpb25zIC0gTW9kaWZpZXJzIGNvbmZpZ3VyYXRpb24gYW5kIG9wdGlvbnNcbiAqIEByZXR1cm5zIHtPYmplY3R9IFRoZSBkYXRhIG9iamVjdCwgcHJvcGVybHkgbW9kaWZpZWRcbiAqL1xuZnVuY3Rpb24gcHJldmVudE92ZXJmbG93KGRhdGEsIG9wdGlvbnMpIHtcbiAgdmFyIGJvdW5kYXJpZXNFbGVtZW50ID0gb3B0aW9ucy5ib3VuZGFyaWVzRWxlbWVudCB8fCBnZXRPZmZzZXRQYXJlbnQoZGF0YS5pbnN0YW5jZS5wb3BwZXIpO1xuXG4gIC8vIElmIG9mZnNldFBhcmVudCBpcyB0aGUgcmVmZXJlbmNlIGVsZW1lbnQsIHdlIHJlYWxseSB3YW50IHRvXG4gIC8vIGdvIG9uZSBzdGVwIHVwIGFuZCB1c2UgdGhlIG5leHQgb2Zmc2V0UGFyZW50IGFzIHJlZmVyZW5jZSB0b1xuICAvLyBhdm9pZCB0byBtYWtlIHRoaXMgbW9kaWZpZXIgY29tcGxldGVseSB1c2VsZXNzIGFuZCBsb29rIGxpa2UgYnJva2VuXG4gIGlmIChkYXRhLmluc3RhbmNlLnJlZmVyZW5jZSA9PT0gYm91bmRhcmllc0VsZW1lbnQpIHtcbiAgICBib3VuZGFyaWVzRWxlbWVudCA9IGdldE9mZnNldFBhcmVudChib3VuZGFyaWVzRWxlbWVudCk7XG4gIH1cblxuICAvLyBOT1RFOiBET00gYWNjZXNzIGhlcmVcbiAgLy8gcmVzZXRzIHRoZSBwb3BwZXIncyBwb3NpdGlvbiBzbyB0aGF0IHRoZSBkb2N1bWVudCBzaXplIGNhbiBiZSBjYWxjdWxhdGVkIGV4Y2x1ZGluZ1xuICAvLyB0aGUgc2l6ZSBvZiB0aGUgcG9wcGVyIGVsZW1lbnQgaXRzZWxmXG4gIHZhciB0cmFuc2Zvcm1Qcm9wID0gZ2V0U3VwcG9ydGVkUHJvcGVydHlOYW1lKCd0cmFuc2Zvcm0nKTtcbiAgdmFyIHBvcHBlclN0eWxlcyA9IGRhdGEuaW5zdGFuY2UucG9wcGVyLnN0eWxlOyAvLyBhc3NpZ25tZW50IHRvIGhlbHAgbWluaWZpY2F0aW9uXG4gIHZhciB0b3AgPSBwb3BwZXJTdHlsZXMudG9wLFxuICAgICAgbGVmdCA9IHBvcHBlclN0eWxlcy5sZWZ0LFxuICAgICAgdHJhbnNmb3JtID0gcG9wcGVyU3R5bGVzW3RyYW5zZm9ybVByb3BdO1xuXG4gIHBvcHBlclN0eWxlcy50b3AgPSAnJztcbiAgcG9wcGVyU3R5bGVzLmxlZnQgPSAnJztcbiAgcG9wcGVyU3R5bGVzW3RyYW5zZm9ybVByb3BdID0gJyc7XG5cbiAgdmFyIGJvdW5kYXJpZXMgPSBnZXRCb3VuZGFyaWVzKGRhdGEuaW5zdGFuY2UucG9wcGVyLCBkYXRhLmluc3RhbmNlLnJlZmVyZW5jZSwgb3B0aW9ucy5wYWRkaW5nLCBib3VuZGFyaWVzRWxlbWVudCwgZGF0YS5wb3NpdGlvbkZpeGVkKTtcblxuICAvLyBOT1RFOiBET00gYWNjZXNzIGhlcmVcbiAgLy8gcmVzdG9yZXMgdGhlIG9yaWdpbmFsIHN0eWxlIHByb3BlcnRpZXMgYWZ0ZXIgdGhlIG9mZnNldHMgaGF2ZSBiZWVuIGNvbXB1dGVkXG4gIHBvcHBlclN0eWxlcy50b3AgPSB0b3A7XG4gIHBvcHBlclN0eWxlcy5sZWZ0ID0gbGVmdDtcbiAgcG9wcGVyU3R5bGVzW3RyYW5zZm9ybVByb3BdID0gdHJhbnNmb3JtO1xuXG4gIG9wdGlvbnMuYm91bmRhcmllcyA9IGJvdW5kYXJpZXM7XG5cbiAgdmFyIG9yZGVyID0gb3B0aW9ucy5wcmlvcml0eTtcbiAgdmFyIHBvcHBlciA9IGRhdGEub2Zmc2V0cy5wb3BwZXI7XG5cbiAgdmFyIGNoZWNrID0ge1xuICAgIHByaW1hcnk6IGZ1bmN0aW9uIHByaW1hcnkocGxhY2VtZW50KSB7XG4gICAgICB2YXIgdmFsdWUgPSBwb3BwZXJbcGxhY2VtZW50XTtcbiAgICAgIGlmIChwb3BwZXJbcGxhY2VtZW50XSA8IGJvdW5kYXJpZXNbcGxhY2VtZW50XSAmJiAhb3B0aW9ucy5lc2NhcGVXaXRoUmVmZXJlbmNlKSB7XG4gICAgICAgIHZhbHVlID0gTWF0aC5tYXgocG9wcGVyW3BsYWNlbWVudF0sIGJvdW5kYXJpZXNbcGxhY2VtZW50XSk7XG4gICAgICB9XG4gICAgICByZXR1cm4gZGVmaW5lUHJvcGVydHkoe30sIHBsYWNlbWVudCwgdmFsdWUpO1xuICAgIH0sXG4gICAgc2Vjb25kYXJ5OiBmdW5jdGlvbiBzZWNvbmRhcnkocGxhY2VtZW50KSB7XG4gICAgICB2YXIgbWFpblNpZGUgPSBwbGFjZW1lbnQgPT09ICdyaWdodCcgPyAnbGVmdCcgOiAndG9wJztcbiAgICAgIHZhciB2YWx1ZSA9IHBvcHBlclttYWluU2lkZV07XG4gICAgICBpZiAocG9wcGVyW3BsYWNlbWVudF0gPiBib3VuZGFyaWVzW3BsYWNlbWVudF0gJiYgIW9wdGlvbnMuZXNjYXBlV2l0aFJlZmVyZW5jZSkge1xuICAgICAgICB2YWx1ZSA9IE1hdGgubWluKHBvcHBlclttYWluU2lkZV0sIGJvdW5kYXJpZXNbcGxhY2VtZW50XSAtIChwbGFjZW1lbnQgPT09ICdyaWdodCcgPyBwb3BwZXIud2lkdGggOiBwb3BwZXIuaGVpZ2h0KSk7XG4gICAgICB9XG4gICAgICByZXR1cm4gZGVmaW5lUHJvcGVydHkoe30sIG1haW5TaWRlLCB2YWx1ZSk7XG4gICAgfVxuICB9O1xuXG4gIG9yZGVyLmZvckVhY2goZnVuY3Rpb24gKHBsYWNlbWVudCkge1xuICAgIHZhciBzaWRlID0gWydsZWZ0JywgJ3RvcCddLmluZGV4T2YocGxhY2VtZW50KSAhPT0gLTEgPyAncHJpbWFyeScgOiAnc2Vjb25kYXJ5JztcbiAgICBwb3BwZXIgPSBfZXh0ZW5kcyh7fSwgcG9wcGVyLCBjaGVja1tzaWRlXShwbGFjZW1lbnQpKTtcbiAgfSk7XG5cbiAgZGF0YS5vZmZzZXRzLnBvcHBlciA9IHBvcHBlcjtcblxuICByZXR1cm4gZGF0YTtcbn1cblxuLyoqXG4gKiBAZnVuY3Rpb25cbiAqIEBtZW1iZXJvZiBNb2RpZmllcnNcbiAqIEBhcmd1bWVudCB7T2JqZWN0fSBkYXRhIC0gVGhlIGRhdGEgb2JqZWN0IGdlbmVyYXRlZCBieSBgdXBkYXRlYCBtZXRob2RcbiAqIEBhcmd1bWVudCB7T2JqZWN0fSBvcHRpb25zIC0gTW9kaWZpZXJzIGNvbmZpZ3VyYXRpb24gYW5kIG9wdGlvbnNcbiAqIEByZXR1cm5zIHtPYmplY3R9IFRoZSBkYXRhIG9iamVjdCwgcHJvcGVybHkgbW9kaWZpZWRcbiAqL1xuZnVuY3Rpb24gc2hpZnQoZGF0YSkge1xuICB2YXIgcGxhY2VtZW50ID0gZGF0YS5wbGFjZW1lbnQ7XG4gIHZhciBiYXNlUGxhY2VtZW50ID0gcGxhY2VtZW50LnNwbGl0KCctJylbMF07XG4gIHZhciBzaGlmdHZhcmlhdGlvbiA9IHBsYWNlbWVudC5zcGxpdCgnLScpWzFdO1xuXG4gIC8vIGlmIHNoaWZ0IHNoaWZ0dmFyaWF0aW9uIGlzIHNwZWNpZmllZCwgcnVuIHRoZSBtb2RpZmllclxuICBpZiAoc2hpZnR2YXJpYXRpb24pIHtcbiAgICB2YXIgX2RhdGEkb2Zmc2V0cyA9IGRhdGEub2Zmc2V0cyxcbiAgICAgICAgcmVmZXJlbmNlID0gX2RhdGEkb2Zmc2V0cy5yZWZlcmVuY2UsXG4gICAgICAgIHBvcHBlciA9IF9kYXRhJG9mZnNldHMucG9wcGVyO1xuXG4gICAgdmFyIGlzVmVydGljYWwgPSBbJ2JvdHRvbScsICd0b3AnXS5pbmRleE9mKGJhc2VQbGFjZW1lbnQpICE9PSAtMTtcbiAgICB2YXIgc2lkZSA9IGlzVmVydGljYWwgPyAnbGVmdCcgOiAndG9wJztcbiAgICB2YXIgbWVhc3VyZW1lbnQgPSBpc1ZlcnRpY2FsID8gJ3dpZHRoJyA6ICdoZWlnaHQnO1xuXG4gICAgdmFyIHNoaWZ0T2Zmc2V0cyA9IHtcbiAgICAgIHN0YXJ0OiBkZWZpbmVQcm9wZXJ0eSh7fSwgc2lkZSwgcmVmZXJlbmNlW3NpZGVdKSxcbiAgICAgIGVuZDogZGVmaW5lUHJvcGVydHkoe30sIHNpZGUsIHJlZmVyZW5jZVtzaWRlXSArIHJlZmVyZW5jZVttZWFzdXJlbWVudF0gLSBwb3BwZXJbbWVhc3VyZW1lbnRdKVxuICAgIH07XG5cbiAgICBkYXRhLm9mZnNldHMucG9wcGVyID0gX2V4dGVuZHMoe30sIHBvcHBlciwgc2hpZnRPZmZzZXRzW3NoaWZ0dmFyaWF0aW9uXSk7XG4gIH1cblxuICByZXR1cm4gZGF0YTtcbn1cblxuLyoqXG4gKiBAZnVuY3Rpb25cbiAqIEBtZW1iZXJvZiBNb2RpZmllcnNcbiAqIEBhcmd1bWVudCB7T2JqZWN0fSBkYXRhIC0gVGhlIGRhdGEgb2JqZWN0IGdlbmVyYXRlZCBieSB1cGRhdGUgbWV0aG9kXG4gKiBAYXJndW1lbnQge09iamVjdH0gb3B0aW9ucyAtIE1vZGlmaWVycyBjb25maWd1cmF0aW9uIGFuZCBvcHRpb25zXG4gKiBAcmV0dXJucyB7T2JqZWN0fSBUaGUgZGF0YSBvYmplY3QsIHByb3Blcmx5IG1vZGlmaWVkXG4gKi9cbmZ1bmN0aW9uIGhpZGUoZGF0YSkge1xuICBpZiAoIWlzTW9kaWZpZXJSZXF1aXJlZChkYXRhLmluc3RhbmNlLm1vZGlmaWVycywgJ2hpZGUnLCAncHJldmVudE92ZXJmbG93JykpIHtcbiAgICByZXR1cm4gZGF0YTtcbiAgfVxuXG4gIHZhciByZWZSZWN0ID0gZGF0YS5vZmZzZXRzLnJlZmVyZW5jZTtcbiAgdmFyIGJvdW5kID0gZmluZChkYXRhLmluc3RhbmNlLm1vZGlmaWVycywgZnVuY3Rpb24gKG1vZGlmaWVyKSB7XG4gICAgcmV0dXJuIG1vZGlmaWVyLm5hbWUgPT09ICdwcmV2ZW50T3ZlcmZsb3cnO1xuICB9KS5ib3VuZGFyaWVzO1xuXG4gIGlmIChyZWZSZWN0LmJvdHRvbSA8IGJvdW5kLnRvcCB8fCByZWZSZWN0LmxlZnQgPiBib3VuZC5yaWdodCB8fCByZWZSZWN0LnRvcCA+IGJvdW5kLmJvdHRvbSB8fCByZWZSZWN0LnJpZ2h0IDwgYm91bmQubGVmdCkge1xuICAgIC8vIEF2b2lkIHVubmVjZXNzYXJ5IERPTSBhY2Nlc3MgaWYgdmlzaWJpbGl0eSBoYXNuJ3QgY2hhbmdlZFxuICAgIGlmIChkYXRhLmhpZGUgPT09IHRydWUpIHtcbiAgICAgIHJldHVybiBkYXRhO1xuICAgIH1cblxuICAgIGRhdGEuaGlkZSA9IHRydWU7XG4gICAgZGF0YS5hdHRyaWJ1dGVzWyd4LW91dC1vZi1ib3VuZGFyaWVzJ10gPSAnJztcbiAgfSBlbHNlIHtcbiAgICAvLyBBdm9pZCB1bm5lY2Vzc2FyeSBET00gYWNjZXNzIGlmIHZpc2liaWxpdHkgaGFzbid0IGNoYW5nZWRcbiAgICBpZiAoZGF0YS5oaWRlID09PSBmYWxzZSkge1xuICAgICAgcmV0dXJuIGRhdGE7XG4gICAgfVxuXG4gICAgZGF0YS5oaWRlID0gZmFsc2U7XG4gICAgZGF0YS5hdHRyaWJ1dGVzWyd4LW91dC1vZi1ib3VuZGFyaWVzJ10gPSBmYWxzZTtcbiAgfVxuXG4gIHJldHVybiBkYXRhO1xufVxuXG4vKipcbiAqIEBmdW5jdGlvblxuICogQG1lbWJlcm9mIE1vZGlmaWVyc1xuICogQGFyZ3VtZW50IHtPYmplY3R9IGRhdGEgLSBUaGUgZGF0YSBvYmplY3QgZ2VuZXJhdGVkIGJ5IGB1cGRhdGVgIG1ldGhvZFxuICogQGFyZ3VtZW50IHtPYmplY3R9IG9wdGlvbnMgLSBNb2RpZmllcnMgY29uZmlndXJhdGlvbiBhbmQgb3B0aW9uc1xuICogQHJldHVybnMge09iamVjdH0gVGhlIGRhdGEgb2JqZWN0LCBwcm9wZXJseSBtb2RpZmllZFxuICovXG5mdW5jdGlvbiBpbm5lcihkYXRhKSB7XG4gIHZhciBwbGFjZW1lbnQgPSBkYXRhLnBsYWNlbWVudDtcbiAgdmFyIGJhc2VQbGFjZW1lbnQgPSBwbGFjZW1lbnQuc3BsaXQoJy0nKVswXTtcbiAgdmFyIF9kYXRhJG9mZnNldHMgPSBkYXRhLm9mZnNldHMsXG4gICAgICBwb3BwZXIgPSBfZGF0YSRvZmZzZXRzLnBvcHBlcixcbiAgICAgIHJlZmVyZW5jZSA9IF9kYXRhJG9mZnNldHMucmVmZXJlbmNlO1xuXG4gIHZhciBpc0hvcml6ID0gWydsZWZ0JywgJ3JpZ2h0J10uaW5kZXhPZihiYXNlUGxhY2VtZW50KSAhPT0gLTE7XG5cbiAgdmFyIHN1YnRyYWN0TGVuZ3RoID0gWyd0b3AnLCAnbGVmdCddLmluZGV4T2YoYmFzZVBsYWNlbWVudCkgPT09IC0xO1xuXG4gIHBvcHBlcltpc0hvcml6ID8gJ2xlZnQnIDogJ3RvcCddID0gcmVmZXJlbmNlW2Jhc2VQbGFjZW1lbnRdIC0gKHN1YnRyYWN0TGVuZ3RoID8gcG9wcGVyW2lzSG9yaXogPyAnd2lkdGgnIDogJ2hlaWdodCddIDogMCk7XG5cbiAgZGF0YS5wbGFjZW1lbnQgPSBnZXRPcHBvc2l0ZVBsYWNlbWVudChwbGFjZW1lbnQpO1xuICBkYXRhLm9mZnNldHMucG9wcGVyID0gZ2V0Q2xpZW50UmVjdChwb3BwZXIpO1xuXG4gIHJldHVybiBkYXRhO1xufVxuXG4vKipcbiAqIE1vZGlmaWVyIGZ1bmN0aW9uLCBlYWNoIG1vZGlmaWVyIGNhbiBoYXZlIGEgZnVuY3Rpb24gb2YgdGhpcyB0eXBlIGFzc2lnbmVkXG4gKiB0byBpdHMgYGZuYCBwcm9wZXJ0eS48YnIgLz5cbiAqIFRoZXNlIGZ1bmN0aW9ucyB3aWxsIGJlIGNhbGxlZCBvbiBlYWNoIHVwZGF0ZSwgdGhpcyBtZWFucyB0aGF0IHlvdSBtdXN0XG4gKiBtYWtlIHN1cmUgdGhleSBhcmUgcGVyZm9ybWFudCBlbm91Z2ggdG8gYXZvaWQgcGVyZm9ybWFuY2UgYm90dGxlbmVja3MuXG4gKlxuICogQGZ1bmN0aW9uIE1vZGlmaWVyRm5cbiAqIEBhcmd1bWVudCB7ZGF0YU9iamVjdH0gZGF0YSAtIFRoZSBkYXRhIG9iamVjdCBnZW5lcmF0ZWQgYnkgYHVwZGF0ZWAgbWV0aG9kXG4gKiBAYXJndW1lbnQge09iamVjdH0gb3B0aW9ucyAtIE1vZGlmaWVycyBjb25maWd1cmF0aW9uIGFuZCBvcHRpb25zXG4gKiBAcmV0dXJucyB7ZGF0YU9iamVjdH0gVGhlIGRhdGEgb2JqZWN0LCBwcm9wZXJseSBtb2RpZmllZFxuICovXG5cbi8qKlxuICogTW9kaWZpZXJzIGFyZSBwbHVnaW5zIHVzZWQgdG8gYWx0ZXIgdGhlIGJlaGF2aW9yIG9mIHlvdXIgcG9wcGVycy48YnIgLz5cbiAqIFBvcHBlci5qcyB1c2VzIGEgc2V0IG9mIDkgbW9kaWZpZXJzIHRvIHByb3ZpZGUgYWxsIHRoZSBiYXNpYyBmdW5jdGlvbmFsaXRpZXNcbiAqIG5lZWRlZCBieSB0aGUgbGlicmFyeS5cbiAqXG4gKiBVc3VhbGx5IHlvdSBkb24ndCB3YW50IHRvIG92ZXJyaWRlIHRoZSBgb3JkZXJgLCBgZm5gIGFuZCBgb25Mb2FkYCBwcm9wcy5cbiAqIEFsbCB0aGUgb3RoZXIgcHJvcGVydGllcyBhcmUgY29uZmlndXJhdGlvbnMgdGhhdCBjb3VsZCBiZSB0d2Vha2VkLlxuICogQG5hbWVzcGFjZSBtb2RpZmllcnNcbiAqL1xudmFyIG1vZGlmaWVycyA9IHtcbiAgLyoqXG4gICAqIE1vZGlmaWVyIHVzZWQgdG8gc2hpZnQgdGhlIHBvcHBlciBvbiB0aGUgc3RhcnQgb3IgZW5kIG9mIGl0cyByZWZlcmVuY2VcbiAgICogZWxlbWVudC48YnIgLz5cbiAgICogSXQgd2lsbCByZWFkIHRoZSB2YXJpYXRpb24gb2YgdGhlIGBwbGFjZW1lbnRgIHByb3BlcnR5LjxiciAvPlxuICAgKiBJdCBjYW4gYmUgb25lIGVpdGhlciBgLWVuZGAgb3IgYC1zdGFydGAuXG4gICAqIEBtZW1iZXJvZiBtb2RpZmllcnNcbiAgICogQGlubmVyXG4gICAqL1xuICBzaGlmdDoge1xuICAgIC8qKiBAcHJvcCB7bnVtYmVyfSBvcmRlcj0xMDAgLSBJbmRleCB1c2VkIHRvIGRlZmluZSB0aGUgb3JkZXIgb2YgZXhlY3V0aW9uICovXG4gICAgb3JkZXI6IDEwMCxcbiAgICAvKiogQHByb3Age0Jvb2xlYW59IGVuYWJsZWQ9dHJ1ZSAtIFdoZXRoZXIgdGhlIG1vZGlmaWVyIGlzIGVuYWJsZWQgb3Igbm90ICovXG4gICAgZW5hYmxlZDogdHJ1ZSxcbiAgICAvKiogQHByb3Age01vZGlmaWVyRm59ICovXG4gICAgZm46IHNoaWZ0XG4gIH0sXG5cbiAgLyoqXG4gICAqIFRoZSBgb2Zmc2V0YCBtb2RpZmllciBjYW4gc2hpZnQgeW91ciBwb3BwZXIgb24gYm90aCBpdHMgYXhpcy5cbiAgICpcbiAgICogSXQgYWNjZXB0cyB0aGUgZm9sbG93aW5nIHVuaXRzOlxuICAgKiAtIGBweGAgb3IgdW5pdC1sZXNzLCBpbnRlcnByZXRlZCBhcyBwaXhlbHNcbiAgICogLSBgJWAgb3IgYCVyYCwgcGVyY2VudGFnZSByZWxhdGl2ZSB0byB0aGUgbGVuZ3RoIG9mIHRoZSByZWZlcmVuY2UgZWxlbWVudFxuICAgKiAtIGAlcGAsIHBlcmNlbnRhZ2UgcmVsYXRpdmUgdG8gdGhlIGxlbmd0aCBvZiB0aGUgcG9wcGVyIGVsZW1lbnRcbiAgICogLSBgdndgLCBDU1Mgdmlld3BvcnQgd2lkdGggdW5pdFxuICAgKiAtIGB2aGAsIENTUyB2aWV3cG9ydCBoZWlnaHQgdW5pdFxuICAgKlxuICAgKiBGb3IgbGVuZ3RoIGlzIGludGVuZGVkIHRoZSBtYWluIGF4aXMgcmVsYXRpdmUgdG8gdGhlIHBsYWNlbWVudCBvZiB0aGUgcG9wcGVyLjxiciAvPlxuICAgKiBUaGlzIG1lYW5zIHRoYXQgaWYgdGhlIHBsYWNlbWVudCBpcyBgdG9wYCBvciBgYm90dG9tYCwgdGhlIGxlbmd0aCB3aWxsIGJlIHRoZVxuICAgKiBgd2lkdGhgLiBJbiBjYXNlIG9mIGBsZWZ0YCBvciBgcmlnaHRgLCBpdCB3aWxsIGJlIHRoZSBgaGVpZ2h0YC5cbiAgICpcbiAgICogWW91IGNhbiBwcm92aWRlIGEgc2luZ2xlIHZhbHVlIChhcyBgTnVtYmVyYCBvciBgU3RyaW5nYCksIG9yIGEgcGFpciBvZiB2YWx1ZXNcbiAgICogYXMgYFN0cmluZ2AgZGl2aWRlZCBieSBhIGNvbW1hIG9yIG9uZSAob3IgbW9yZSkgd2hpdGUgc3BhY2VzLjxiciAvPlxuICAgKiBUaGUgbGF0dGVyIGlzIGEgZGVwcmVjYXRlZCBtZXRob2QgYmVjYXVzZSBpdCBsZWFkcyB0byBjb25mdXNpb24gYW5kIHdpbGwgYmVcbiAgICogcmVtb3ZlZCBpbiB2Mi48YnIgLz5cbiAgICogQWRkaXRpb25hbGx5LCBpdCBhY2NlcHRzIGFkZGl0aW9ucyBhbmQgc3VidHJhY3Rpb25zIGJldHdlZW4gZGlmZmVyZW50IHVuaXRzLlxuICAgKiBOb3RlIHRoYXQgbXVsdGlwbGljYXRpb25zIGFuZCBkaXZpc2lvbnMgYXJlbid0IHN1cHBvcnRlZC5cbiAgICpcbiAgICogVmFsaWQgZXhhbXBsZXMgYXJlOlxuICAgKiBgYGBcbiAgICogMTBcbiAgICogJzEwJSdcbiAgICogJzEwLCAxMCdcbiAgICogJzEwJSwgMTAnXG4gICAqICcxMCArIDEwJSdcbiAgICogJzEwIC0gNXZoICsgMyUnXG4gICAqICctMTBweCArIDV2aCwgNXB4IC0gNiUnXG4gICAqIGBgYFxuICAgKiA+ICoqTkIqKjogSWYgeW91IGRlc2lyZSB0byBhcHBseSBvZmZzZXRzIHRvIHlvdXIgcG9wcGVycyBpbiBhIHdheSB0aGF0IG1heSBtYWtlIHRoZW0gb3ZlcmxhcFxuICAgKiA+IHdpdGggdGhlaXIgcmVmZXJlbmNlIGVsZW1lbnQsIHVuZm9ydHVuYXRlbHksIHlvdSB3aWxsIGhhdmUgdG8gZGlzYWJsZSB0aGUgYGZsaXBgIG1vZGlmaWVyLlxuICAgKiA+IFlvdSBjYW4gcmVhZCBtb3JlIG9uIHRoaXMgYXQgdGhpcyBbaXNzdWVdKGh0dHBzOi8vZ2l0aHViLmNvbS9GZXpWcmFzdGEvcG9wcGVyLmpzL2lzc3Vlcy8zNzMpLlxuICAgKlxuICAgKiBAbWVtYmVyb2YgbW9kaWZpZXJzXG4gICAqIEBpbm5lclxuICAgKi9cbiAgb2Zmc2V0OiB7XG4gICAgLyoqIEBwcm9wIHtudW1iZXJ9IG9yZGVyPTIwMCAtIEluZGV4IHVzZWQgdG8gZGVmaW5lIHRoZSBvcmRlciBvZiBleGVjdXRpb24gKi9cbiAgICBvcmRlcjogMjAwLFxuICAgIC8qKiBAcHJvcCB7Qm9vbGVhbn0gZW5hYmxlZD10cnVlIC0gV2hldGhlciB0aGUgbW9kaWZpZXIgaXMgZW5hYmxlZCBvciBub3QgKi9cbiAgICBlbmFibGVkOiB0cnVlLFxuICAgIC8qKiBAcHJvcCB7TW9kaWZpZXJGbn0gKi9cbiAgICBmbjogb2Zmc2V0LFxuICAgIC8qKiBAcHJvcCB7TnVtYmVyfFN0cmluZ30gb2Zmc2V0PTBcbiAgICAgKiBUaGUgb2Zmc2V0IHZhbHVlIGFzIGRlc2NyaWJlZCBpbiB0aGUgbW9kaWZpZXIgZGVzY3JpcHRpb25cbiAgICAgKi9cbiAgICBvZmZzZXQ6IDBcbiAgfSxcblxuICAvKipcbiAgICogTW9kaWZpZXIgdXNlZCB0byBwcmV2ZW50IHRoZSBwb3BwZXIgZnJvbSBiZWluZyBwb3NpdGlvbmVkIG91dHNpZGUgdGhlIGJvdW5kYXJ5LlxuICAgKlxuICAgKiBBIHNjZW5hcmlvIGV4aXN0cyB3aGVyZSB0aGUgcmVmZXJlbmNlIGl0c2VsZiBpcyBub3Qgd2l0aGluIHRoZSBib3VuZGFyaWVzLjxiciAvPlxuICAgKiBXZSBjYW4gc2F5IGl0IGhhcyBcImVzY2FwZWQgdGhlIGJvdW5kYXJpZXNcIiDigJQgb3IganVzdCBcImVzY2FwZWRcIi48YnIgLz5cbiAgICogSW4gdGhpcyBjYXNlIHdlIG5lZWQgdG8gZGVjaWRlIHdoZXRoZXIgdGhlIHBvcHBlciBzaG91bGQgZWl0aGVyOlxuICAgKlxuICAgKiAtIGRldGFjaCBmcm9tIHRoZSByZWZlcmVuY2UgYW5kIHJlbWFpbiBcInRyYXBwZWRcIiBpbiB0aGUgYm91bmRhcmllcywgb3JcbiAgICogLSBpZiBpdCBzaG91bGQgaWdub3JlIHRoZSBib3VuZGFyeSBhbmQgXCJlc2NhcGUgd2l0aCBpdHMgcmVmZXJlbmNlXCJcbiAgICpcbiAgICogV2hlbiBgZXNjYXBlV2l0aFJlZmVyZW5jZWAgaXMgc2V0IHRvYHRydWVgIGFuZCByZWZlcmVuY2UgaXMgY29tcGxldGVseVxuICAgKiBvdXRzaWRlIGl0cyBib3VuZGFyaWVzLCB0aGUgcG9wcGVyIHdpbGwgb3ZlcmZsb3cgKG9yIGNvbXBsZXRlbHkgbGVhdmUpXG4gICAqIHRoZSBib3VuZGFyaWVzIGluIG9yZGVyIHRvIHJlbWFpbiBhdHRhY2hlZCB0byB0aGUgZWRnZSBvZiB0aGUgcmVmZXJlbmNlLlxuICAgKlxuICAgKiBAbWVtYmVyb2YgbW9kaWZpZXJzXG4gICAqIEBpbm5lclxuICAgKi9cbiAgcHJldmVudE92ZXJmbG93OiB7XG4gICAgLyoqIEBwcm9wIHtudW1iZXJ9IG9yZGVyPTMwMCAtIEluZGV4IHVzZWQgdG8gZGVmaW5lIHRoZSBvcmRlciBvZiBleGVjdXRpb24gKi9cbiAgICBvcmRlcjogMzAwLFxuICAgIC8qKiBAcHJvcCB7Qm9vbGVhbn0gZW5hYmxlZD10cnVlIC0gV2hldGhlciB0aGUgbW9kaWZpZXIgaXMgZW5hYmxlZCBvciBub3QgKi9cbiAgICBlbmFibGVkOiB0cnVlLFxuICAgIC8qKiBAcHJvcCB7TW9kaWZpZXJGbn0gKi9cbiAgICBmbjogcHJldmVudE92ZXJmbG93LFxuICAgIC8qKlxuICAgICAqIEBwcm9wIHtBcnJheX0gW3ByaW9yaXR5PVsnbGVmdCcsJ3JpZ2h0JywndG9wJywnYm90dG9tJ11dXG4gICAgICogUG9wcGVyIHdpbGwgdHJ5IHRvIHByZXZlbnQgb3ZlcmZsb3cgZm9sbG93aW5nIHRoZXNlIHByaW9yaXRpZXMgYnkgZGVmYXVsdCxcbiAgICAgKiB0aGVuLCBpdCBjb3VsZCBvdmVyZmxvdyBvbiB0aGUgbGVmdCBhbmQgb24gdG9wIG9mIHRoZSBgYm91bmRhcmllc0VsZW1lbnRgXG4gICAgICovXG4gICAgcHJpb3JpdHk6IFsnbGVmdCcsICdyaWdodCcsICd0b3AnLCAnYm90dG9tJ10sXG4gICAgLyoqXG4gICAgICogQHByb3Age251bWJlcn0gcGFkZGluZz01XG4gICAgICogQW1vdW50IG9mIHBpeGVsIHVzZWQgdG8gZGVmaW5lIGEgbWluaW11bSBkaXN0YW5jZSBiZXR3ZWVuIHRoZSBib3VuZGFyaWVzXG4gICAgICogYW5kIHRoZSBwb3BwZXIuIFRoaXMgbWFrZXMgc3VyZSB0aGUgcG9wcGVyIGFsd2F5cyBoYXMgYSBsaXR0bGUgcGFkZGluZ1xuICAgICAqIGJldHdlZW4gdGhlIGVkZ2VzIG9mIGl0cyBjb250YWluZXJcbiAgICAgKi9cbiAgICBwYWRkaW5nOiA1LFxuICAgIC8qKlxuICAgICAqIEBwcm9wIHtTdHJpbmd8SFRNTEVsZW1lbnR9IGJvdW5kYXJpZXNFbGVtZW50PSdzY3JvbGxQYXJlbnQnXG4gICAgICogQm91bmRhcmllcyB1c2VkIGJ5IHRoZSBtb2RpZmllci4gQ2FuIGJlIGBzY3JvbGxQYXJlbnRgLCBgd2luZG93YCxcbiAgICAgKiBgdmlld3BvcnRgIG9yIGFueSBET00gZWxlbWVudC5cbiAgICAgKi9cbiAgICBib3VuZGFyaWVzRWxlbWVudDogJ3Njcm9sbFBhcmVudCdcbiAgfSxcblxuICAvKipcbiAgICogTW9kaWZpZXIgdXNlZCB0byBtYWtlIHN1cmUgdGhlIHJlZmVyZW5jZSBhbmQgaXRzIHBvcHBlciBzdGF5IG5lYXIgZWFjaCBvdGhlclxuICAgKiB3aXRob3V0IGxlYXZpbmcgYW55IGdhcCBiZXR3ZWVuIHRoZSB0d28uIEVzcGVjaWFsbHkgdXNlZnVsIHdoZW4gdGhlIGFycm93IGlzXG4gICAqIGVuYWJsZWQgYW5kIHlvdSB3YW50IHRvIGVuc3VyZSB0aGF0IGl0IHBvaW50cyB0byBpdHMgcmVmZXJlbmNlIGVsZW1lbnQuXG4gICAqIEl0IGNhcmVzIG9ubHkgYWJvdXQgdGhlIGZpcnN0IGF4aXMuIFlvdSBjYW4gc3RpbGwgaGF2ZSBwb3BwZXJzIHdpdGggbWFyZ2luXG4gICAqIGJldHdlZW4gdGhlIHBvcHBlciBhbmQgaXRzIHJlZmVyZW5jZSBlbGVtZW50LlxuICAgKiBAbWVtYmVyb2YgbW9kaWZpZXJzXG4gICAqIEBpbm5lclxuICAgKi9cbiAga2VlcFRvZ2V0aGVyOiB7XG4gICAgLyoqIEBwcm9wIHtudW1iZXJ9IG9yZGVyPTQwMCAtIEluZGV4IHVzZWQgdG8gZGVmaW5lIHRoZSBvcmRlciBvZiBleGVjdXRpb24gKi9cbiAgICBvcmRlcjogNDAwLFxuICAgIC8qKiBAcHJvcCB7Qm9vbGVhbn0gZW5hYmxlZD10cnVlIC0gV2hldGhlciB0aGUgbW9kaWZpZXIgaXMgZW5hYmxlZCBvciBub3QgKi9cbiAgICBlbmFibGVkOiB0cnVlLFxuICAgIC8qKiBAcHJvcCB7TW9kaWZpZXJGbn0gKi9cbiAgICBmbjoga2VlcFRvZ2V0aGVyXG4gIH0sXG5cbiAgLyoqXG4gICAqIFRoaXMgbW9kaWZpZXIgaXMgdXNlZCB0byBtb3ZlIHRoZSBgYXJyb3dFbGVtZW50YCBvZiB0aGUgcG9wcGVyIHRvIG1ha2VcbiAgICogc3VyZSBpdCBpcyBwb3NpdGlvbmVkIGJldHdlZW4gdGhlIHJlZmVyZW5jZSBlbGVtZW50IGFuZCBpdHMgcG9wcGVyIGVsZW1lbnQuXG4gICAqIEl0IHdpbGwgcmVhZCB0aGUgb3V0ZXIgc2l6ZSBvZiB0aGUgYGFycm93RWxlbWVudGAgbm9kZSB0byBkZXRlY3QgaG93IG1hbnlcbiAgICogcGl4ZWxzIG9mIGNvbmp1bmN0aW9uIGFyZSBuZWVkZWQuXG4gICAqXG4gICAqIEl0IGhhcyBubyBlZmZlY3QgaWYgbm8gYGFycm93RWxlbWVudGAgaXMgcHJvdmlkZWQuXG4gICAqIEBtZW1iZXJvZiBtb2RpZmllcnNcbiAgICogQGlubmVyXG4gICAqL1xuICBhcnJvdzoge1xuICAgIC8qKiBAcHJvcCB7bnVtYmVyfSBvcmRlcj01MDAgLSBJbmRleCB1c2VkIHRvIGRlZmluZSB0aGUgb3JkZXIgb2YgZXhlY3V0aW9uICovXG4gICAgb3JkZXI6IDUwMCxcbiAgICAvKiogQHByb3Age0Jvb2xlYW59IGVuYWJsZWQ9dHJ1ZSAtIFdoZXRoZXIgdGhlIG1vZGlmaWVyIGlzIGVuYWJsZWQgb3Igbm90ICovXG4gICAgZW5hYmxlZDogdHJ1ZSxcbiAgICAvKiogQHByb3Age01vZGlmaWVyRm59ICovXG4gICAgZm46IGFycm93LFxuICAgIC8qKiBAcHJvcCB7U3RyaW5nfEhUTUxFbGVtZW50fSBlbGVtZW50PSdbeC1hcnJvd10nIC0gU2VsZWN0b3Igb3Igbm9kZSB1c2VkIGFzIGFycm93ICovXG4gICAgZWxlbWVudDogJ1t4LWFycm93XSdcbiAgfSxcblxuICAvKipcbiAgICogTW9kaWZpZXIgdXNlZCB0byBmbGlwIHRoZSBwb3BwZXIncyBwbGFjZW1lbnQgd2hlbiBpdCBzdGFydHMgdG8gb3ZlcmxhcCBpdHNcbiAgICogcmVmZXJlbmNlIGVsZW1lbnQuXG4gICAqXG4gICAqIFJlcXVpcmVzIHRoZSBgcHJldmVudE92ZXJmbG93YCBtb2RpZmllciBiZWZvcmUgaXQgaW4gb3JkZXIgdG8gd29yay5cbiAgICpcbiAgICogKipOT1RFOioqIHRoaXMgbW9kaWZpZXIgd2lsbCBpbnRlcnJ1cHQgdGhlIGN1cnJlbnQgdXBkYXRlIGN5Y2xlIGFuZCB3aWxsXG4gICAqIHJlc3RhcnQgaXQgaWYgaXQgZGV0ZWN0cyB0aGUgbmVlZCB0byBmbGlwIHRoZSBwbGFjZW1lbnQuXG4gICAqIEBtZW1iZXJvZiBtb2RpZmllcnNcbiAgICogQGlubmVyXG4gICAqL1xuICBmbGlwOiB7XG4gICAgLyoqIEBwcm9wIHtudW1iZXJ9IG9yZGVyPTYwMCAtIEluZGV4IHVzZWQgdG8gZGVmaW5lIHRoZSBvcmRlciBvZiBleGVjdXRpb24gKi9cbiAgICBvcmRlcjogNjAwLFxuICAgIC8qKiBAcHJvcCB7Qm9vbGVhbn0gZW5hYmxlZD10cnVlIC0gV2hldGhlciB0aGUgbW9kaWZpZXIgaXMgZW5hYmxlZCBvciBub3QgKi9cbiAgICBlbmFibGVkOiB0cnVlLFxuICAgIC8qKiBAcHJvcCB7TW9kaWZpZXJGbn0gKi9cbiAgICBmbjogZmxpcCxcbiAgICAvKipcbiAgICAgKiBAcHJvcCB7U3RyaW5nfEFycmF5fSBiZWhhdmlvcj0nZmxpcCdcbiAgICAgKiBUaGUgYmVoYXZpb3IgdXNlZCB0byBjaGFuZ2UgdGhlIHBvcHBlcidzIHBsYWNlbWVudC4gSXQgY2FuIGJlIG9uZSBvZlxuICAgICAqIGBmbGlwYCwgYGNsb2Nrd2lzZWAsIGBjb3VudGVyY2xvY2t3aXNlYCBvciBhbiBhcnJheSB3aXRoIGEgbGlzdCBvZiB2YWxpZFxuICAgICAqIHBsYWNlbWVudHMgKHdpdGggb3B0aW9uYWwgdmFyaWF0aW9ucylcbiAgICAgKi9cbiAgICBiZWhhdmlvcjogJ2ZsaXAnLFxuICAgIC8qKlxuICAgICAqIEBwcm9wIHtudW1iZXJ9IHBhZGRpbmc9NVxuICAgICAqIFRoZSBwb3BwZXIgd2lsbCBmbGlwIGlmIGl0IGhpdHMgdGhlIGVkZ2VzIG9mIHRoZSBgYm91bmRhcmllc0VsZW1lbnRgXG4gICAgICovXG4gICAgcGFkZGluZzogNSxcbiAgICAvKipcbiAgICAgKiBAcHJvcCB7U3RyaW5nfEhUTUxFbGVtZW50fSBib3VuZGFyaWVzRWxlbWVudD0ndmlld3BvcnQnXG4gICAgICogVGhlIGVsZW1lbnQgd2hpY2ggd2lsbCBkZWZpbmUgdGhlIGJvdW5kYXJpZXMgb2YgdGhlIHBvcHBlciBwb3NpdGlvbi5cbiAgICAgKiBUaGUgcG9wcGVyIHdpbGwgbmV2ZXIgYmUgcGxhY2VkIG91dHNpZGUgb2YgdGhlIGRlZmluZWQgYm91bmRhcmllc1xuICAgICAqIChleGNlcHQgaWYgYGtlZXBUb2dldGhlcmAgaXMgZW5hYmxlZClcbiAgICAgKi9cbiAgICBib3VuZGFyaWVzRWxlbWVudDogJ3ZpZXdwb3J0J1xuICB9LFxuXG4gIC8qKlxuICAgKiBNb2RpZmllciB1c2VkIHRvIG1ha2UgdGhlIHBvcHBlciBmbG93IHRvd2FyZCB0aGUgaW5uZXIgb2YgdGhlIHJlZmVyZW5jZSBlbGVtZW50LlxuICAgKiBCeSBkZWZhdWx0LCB3aGVuIHRoaXMgbW9kaWZpZXIgaXMgZGlzYWJsZWQsIHRoZSBwb3BwZXIgd2lsbCBiZSBwbGFjZWQgb3V0c2lkZVxuICAgKiB0aGUgcmVmZXJlbmNlIGVsZW1lbnQuXG4gICAqIEBtZW1iZXJvZiBtb2RpZmllcnNcbiAgICogQGlubmVyXG4gICAqL1xuICBpbm5lcjoge1xuICAgIC8qKiBAcHJvcCB7bnVtYmVyfSBvcmRlcj03MDAgLSBJbmRleCB1c2VkIHRvIGRlZmluZSB0aGUgb3JkZXIgb2YgZXhlY3V0aW9uICovXG4gICAgb3JkZXI6IDcwMCxcbiAgICAvKiogQHByb3Age0Jvb2xlYW59IGVuYWJsZWQ9ZmFsc2UgLSBXaGV0aGVyIHRoZSBtb2RpZmllciBpcyBlbmFibGVkIG9yIG5vdCAqL1xuICAgIGVuYWJsZWQ6IGZhbHNlLFxuICAgIC8qKiBAcHJvcCB7TW9kaWZpZXJGbn0gKi9cbiAgICBmbjogaW5uZXJcbiAgfSxcblxuICAvKipcbiAgICogTW9kaWZpZXIgdXNlZCB0byBoaWRlIHRoZSBwb3BwZXIgd2hlbiBpdHMgcmVmZXJlbmNlIGVsZW1lbnQgaXMgb3V0c2lkZSBvZiB0aGVcbiAgICogcG9wcGVyIGJvdW5kYXJpZXMuIEl0IHdpbGwgc2V0IGEgYHgtb3V0LW9mLWJvdW5kYXJpZXNgIGF0dHJpYnV0ZSB3aGljaCBjYW5cbiAgICogYmUgdXNlZCB0byBoaWRlIHdpdGggYSBDU1Mgc2VsZWN0b3IgdGhlIHBvcHBlciB3aGVuIGl0cyByZWZlcmVuY2UgaXNcbiAgICogb3V0IG9mIGJvdW5kYXJpZXMuXG4gICAqXG4gICAqIFJlcXVpcmVzIHRoZSBgcHJldmVudE92ZXJmbG93YCBtb2RpZmllciBiZWZvcmUgaXQgaW4gb3JkZXIgdG8gd29yay5cbiAgICogQG1lbWJlcm9mIG1vZGlmaWVyc1xuICAgKiBAaW5uZXJcbiAgICovXG4gIGhpZGU6IHtcbiAgICAvKiogQHByb3Age251bWJlcn0gb3JkZXI9ODAwIC0gSW5kZXggdXNlZCB0byBkZWZpbmUgdGhlIG9yZGVyIG9mIGV4ZWN1dGlvbiAqL1xuICAgIG9yZGVyOiA4MDAsXG4gICAgLyoqIEBwcm9wIHtCb29sZWFufSBlbmFibGVkPXRydWUgLSBXaGV0aGVyIHRoZSBtb2RpZmllciBpcyBlbmFibGVkIG9yIG5vdCAqL1xuICAgIGVuYWJsZWQ6IHRydWUsXG4gICAgLyoqIEBwcm9wIHtNb2RpZmllckZufSAqL1xuICAgIGZuOiBoaWRlXG4gIH0sXG5cbiAgLyoqXG4gICAqIENvbXB1dGVzIHRoZSBzdHlsZSB0aGF0IHdpbGwgYmUgYXBwbGllZCB0byB0aGUgcG9wcGVyIGVsZW1lbnQgdG8gZ2V0c1xuICAgKiBwcm9wZXJseSBwb3NpdGlvbmVkLlxuICAgKlxuICAgKiBOb3RlIHRoYXQgdGhpcyBtb2RpZmllciB3aWxsIG5vdCB0b3VjaCB0aGUgRE9NLCBpdCBqdXN0IHByZXBhcmVzIHRoZSBzdHlsZXNcbiAgICogc28gdGhhdCBgYXBwbHlTdHlsZWAgbW9kaWZpZXIgY2FuIGFwcGx5IGl0LiBUaGlzIHNlcGFyYXRpb24gaXMgdXNlZnVsXG4gICAqIGluIGNhc2UgeW91IG5lZWQgdG8gcmVwbGFjZSBgYXBwbHlTdHlsZWAgd2l0aCBhIGN1c3RvbSBpbXBsZW1lbnRhdGlvbi5cbiAgICpcbiAgICogVGhpcyBtb2RpZmllciBoYXMgYDg1MGAgYXMgYG9yZGVyYCB2YWx1ZSB0byBtYWludGFpbiBiYWNrd2FyZCBjb21wYXRpYmlsaXR5XG4gICAqIHdpdGggcHJldmlvdXMgdmVyc2lvbnMgb2YgUG9wcGVyLmpzLiBFeHBlY3QgdGhlIG1vZGlmaWVycyBvcmRlcmluZyBtZXRob2RcbiAgICogdG8gY2hhbmdlIGluIGZ1dHVyZSBtYWpvciB2ZXJzaW9ucyBvZiB0aGUgbGlicmFyeS5cbiAgICpcbiAgICogQG1lbWJlcm9mIG1vZGlmaWVyc1xuICAgKiBAaW5uZXJcbiAgICovXG4gIGNvbXB1dGVTdHlsZToge1xuICAgIC8qKiBAcHJvcCB7bnVtYmVyfSBvcmRlcj04NTAgLSBJbmRleCB1c2VkIHRvIGRlZmluZSB0aGUgb3JkZXIgb2YgZXhlY3V0aW9uICovXG4gICAgb3JkZXI6IDg1MCxcbiAgICAvKiogQHByb3Age0Jvb2xlYW59IGVuYWJsZWQ9dHJ1ZSAtIFdoZXRoZXIgdGhlIG1vZGlmaWVyIGlzIGVuYWJsZWQgb3Igbm90ICovXG4gICAgZW5hYmxlZDogdHJ1ZSxcbiAgICAvKiogQHByb3Age01vZGlmaWVyRm59ICovXG4gICAgZm46IGNvbXB1dGVTdHlsZSxcbiAgICAvKipcbiAgICAgKiBAcHJvcCB7Qm9vbGVhbn0gZ3B1QWNjZWxlcmF0aW9uPXRydWVcbiAgICAgKiBJZiB0cnVlLCBpdCB1c2VzIHRoZSBDU1MgM0QgdHJhbnNmb3JtYXRpb24gdG8gcG9zaXRpb24gdGhlIHBvcHBlci5cbiAgICAgKiBPdGhlcndpc2UsIGl0IHdpbGwgdXNlIHRoZSBgdG9wYCBhbmQgYGxlZnRgIHByb3BlcnRpZXNcbiAgICAgKi9cbiAgICBncHVBY2NlbGVyYXRpb246IHRydWUsXG4gICAgLyoqXG4gICAgICogQHByb3Age3N0cmluZ30gW3g9J2JvdHRvbSddXG4gICAgICogV2hlcmUgdG8gYW5jaG9yIHRoZSBYIGF4aXMgKGBib3R0b21gIG9yIGB0b3BgKS4gQUtBIFggb2Zmc2V0IG9yaWdpbi5cbiAgICAgKiBDaGFuZ2UgdGhpcyBpZiB5b3VyIHBvcHBlciBzaG91bGQgZ3JvdyBpbiBhIGRpcmVjdGlvbiBkaWZmZXJlbnQgZnJvbSBgYm90dG9tYFxuICAgICAqL1xuICAgIHg6ICdib3R0b20nLFxuICAgIC8qKlxuICAgICAqIEBwcm9wIHtzdHJpbmd9IFt4PSdsZWZ0J11cbiAgICAgKiBXaGVyZSB0byBhbmNob3IgdGhlIFkgYXhpcyAoYGxlZnRgIG9yIGByaWdodGApLiBBS0EgWSBvZmZzZXQgb3JpZ2luLlxuICAgICAqIENoYW5nZSB0aGlzIGlmIHlvdXIgcG9wcGVyIHNob3VsZCBncm93IGluIGEgZGlyZWN0aW9uIGRpZmZlcmVudCBmcm9tIGByaWdodGBcbiAgICAgKi9cbiAgICB5OiAncmlnaHQnXG4gIH0sXG5cbiAgLyoqXG4gICAqIEFwcGxpZXMgdGhlIGNvbXB1dGVkIHN0eWxlcyB0byB0aGUgcG9wcGVyIGVsZW1lbnQuXG4gICAqXG4gICAqIEFsbCB0aGUgRE9NIG1hbmlwdWxhdGlvbnMgYXJlIGxpbWl0ZWQgdG8gdGhpcyBtb2RpZmllci4gVGhpcyBpcyB1c2VmdWwgaW4gY2FzZVxuICAgKiB5b3Ugd2FudCB0byBpbnRlZ3JhdGUgUG9wcGVyLmpzIGluc2lkZSBhIGZyYW1ld29yayBvciB2aWV3IGxpYnJhcnkgYW5kIHlvdVxuICAgKiB3YW50IHRvIGRlbGVnYXRlIGFsbCB0aGUgRE9NIG1hbmlwdWxhdGlvbnMgdG8gaXQuXG4gICAqXG4gICAqIE5vdGUgdGhhdCBpZiB5b3UgZGlzYWJsZSB0aGlzIG1vZGlmaWVyLCB5b3UgbXVzdCBtYWtlIHN1cmUgdGhlIHBvcHBlciBlbGVtZW50XG4gICAqIGhhcyBpdHMgcG9zaXRpb24gc2V0IHRvIGBhYnNvbHV0ZWAgYmVmb3JlIFBvcHBlci5qcyBjYW4gZG8gaXRzIHdvcmshXG4gICAqXG4gICAqIEp1c3QgZGlzYWJsZSB0aGlzIG1vZGlmaWVyIGFuZCBkZWZpbmUgeW91ciBvd24gdG8gYWNoaWV2ZSB0aGUgZGVzaXJlZCBlZmZlY3QuXG4gICAqXG4gICAqIEBtZW1iZXJvZiBtb2RpZmllcnNcbiAgICogQGlubmVyXG4gICAqL1xuICBhcHBseVN0eWxlOiB7XG4gICAgLyoqIEBwcm9wIHtudW1iZXJ9IG9yZGVyPTkwMCAtIEluZGV4IHVzZWQgdG8gZGVmaW5lIHRoZSBvcmRlciBvZiBleGVjdXRpb24gKi9cbiAgICBvcmRlcjogOTAwLFxuICAgIC8qKiBAcHJvcCB7Qm9vbGVhbn0gZW5hYmxlZD10cnVlIC0gV2hldGhlciB0aGUgbW9kaWZpZXIgaXMgZW5hYmxlZCBvciBub3QgKi9cbiAgICBlbmFibGVkOiB0cnVlLFxuICAgIC8qKiBAcHJvcCB7TW9kaWZpZXJGbn0gKi9cbiAgICBmbjogYXBwbHlTdHlsZSxcbiAgICAvKiogQHByb3Age0Z1bmN0aW9ufSAqL1xuICAgIG9uTG9hZDogYXBwbHlTdHlsZU9uTG9hZCxcbiAgICAvKipcbiAgICAgKiBAZGVwcmVjYXRlZCBzaW5jZSB2ZXJzaW9uIDEuMTAuMCwgdGhlIHByb3BlcnR5IG1vdmVkIHRvIGBjb21wdXRlU3R5bGVgIG1vZGlmaWVyXG4gICAgICogQHByb3Age0Jvb2xlYW59IGdwdUFjY2VsZXJhdGlvbj10cnVlXG4gICAgICogSWYgdHJ1ZSwgaXQgdXNlcyB0aGUgQ1NTIDNEIHRyYW5zZm9ybWF0aW9uIHRvIHBvc2l0aW9uIHRoZSBwb3BwZXIuXG4gICAgICogT3RoZXJ3aXNlLCBpdCB3aWxsIHVzZSB0aGUgYHRvcGAgYW5kIGBsZWZ0YCBwcm9wZXJ0aWVzXG4gICAgICovXG4gICAgZ3B1QWNjZWxlcmF0aW9uOiB1bmRlZmluZWRcbiAgfVxufTtcblxuLyoqXG4gKiBUaGUgYGRhdGFPYmplY3RgIGlzIGFuIG9iamVjdCBjb250YWluaW5nIGFsbCB0aGUgaW5mb3JtYXRpb24gdXNlZCBieSBQb3BwZXIuanMuXG4gKiBUaGlzIG9iamVjdCBpcyBwYXNzZWQgdG8gbW9kaWZpZXJzIGFuZCB0byB0aGUgYG9uQ3JlYXRlYCBhbmQgYG9uVXBkYXRlYCBjYWxsYmFja3MuXG4gKiBAbmFtZSBkYXRhT2JqZWN0XG4gKiBAcHJvcGVydHkge09iamVjdH0gZGF0YS5pbnN0YW5jZSBUaGUgUG9wcGVyLmpzIGluc3RhbmNlXG4gKiBAcHJvcGVydHkge1N0cmluZ30gZGF0YS5wbGFjZW1lbnQgUGxhY2VtZW50IGFwcGxpZWQgdG8gcG9wcGVyXG4gKiBAcHJvcGVydHkge1N0cmluZ30gZGF0YS5vcmlnaW5hbFBsYWNlbWVudCBQbGFjZW1lbnQgb3JpZ2luYWxseSBkZWZpbmVkIG9uIGluaXRcbiAqIEBwcm9wZXJ0eSB7Qm9vbGVhbn0gZGF0YS5mbGlwcGVkIFRydWUgaWYgcG9wcGVyIGhhcyBiZWVuIGZsaXBwZWQgYnkgZmxpcCBtb2RpZmllclxuICogQHByb3BlcnR5IHtCb29sZWFufSBkYXRhLmhpZGUgVHJ1ZSBpZiB0aGUgcmVmZXJlbmNlIGVsZW1lbnQgaXMgb3V0IG9mIGJvdW5kYXJpZXMsIHVzZWZ1bCB0byBrbm93IHdoZW4gdG8gaGlkZSB0aGUgcG9wcGVyXG4gKiBAcHJvcGVydHkge0hUTUxFbGVtZW50fSBkYXRhLmFycm93RWxlbWVudCBOb2RlIHVzZWQgYXMgYXJyb3cgYnkgYXJyb3cgbW9kaWZpZXJcbiAqIEBwcm9wZXJ0eSB7T2JqZWN0fSBkYXRhLnN0eWxlcyBBbnkgQ1NTIHByb3BlcnR5IGRlZmluZWQgaGVyZSB3aWxsIGJlIGFwcGxpZWQgdG8gdGhlIHBvcHBlci4gSXQgZXhwZWN0cyB0aGUgSmF2YVNjcmlwdCBub21lbmNsYXR1cmUgKGVnLiBgbWFyZ2luQm90dG9tYClcbiAqIEBwcm9wZXJ0eSB7T2JqZWN0fSBkYXRhLmFycm93U3R5bGVzIEFueSBDU1MgcHJvcGVydHkgZGVmaW5lZCBoZXJlIHdpbGwgYmUgYXBwbGllZCB0byB0aGUgcG9wcGVyIGFycm93LiBJdCBleHBlY3RzIHRoZSBKYXZhU2NyaXB0IG5vbWVuY2xhdHVyZSAoZWcuIGBtYXJnaW5Cb3R0b21gKVxuICogQHByb3BlcnR5IHtPYmplY3R9IGRhdGEuYm91bmRhcmllcyBPZmZzZXRzIG9mIHRoZSBwb3BwZXIgYm91bmRhcmllc1xuICogQHByb3BlcnR5IHtPYmplY3R9IGRhdGEub2Zmc2V0cyBUaGUgbWVhc3VyZW1lbnRzIG9mIHBvcHBlciwgcmVmZXJlbmNlIGFuZCBhcnJvdyBlbGVtZW50c1xuICogQHByb3BlcnR5IHtPYmplY3R9IGRhdGEub2Zmc2V0cy5wb3BwZXIgYHRvcGAsIGBsZWZ0YCwgYHdpZHRoYCwgYGhlaWdodGAgdmFsdWVzXG4gKiBAcHJvcGVydHkge09iamVjdH0gZGF0YS5vZmZzZXRzLnJlZmVyZW5jZSBgdG9wYCwgYGxlZnRgLCBgd2lkdGhgLCBgaGVpZ2h0YCB2YWx1ZXNcbiAqIEBwcm9wZXJ0eSB7T2JqZWN0fSBkYXRhLm9mZnNldHMuYXJyb3ddIGB0b3BgIGFuZCBgbGVmdGAgb2Zmc2V0cywgb25seSBvbmUgb2YgdGhlbSB3aWxsIGJlIGRpZmZlcmVudCBmcm9tIDBcbiAqL1xuXG4vKipcbiAqIERlZmF1bHQgb3B0aW9ucyBwcm92aWRlZCB0byBQb3BwZXIuanMgY29uc3RydWN0b3IuPGJyIC8+XG4gKiBUaGVzZSBjYW4gYmUgb3ZlcnJpZGRlbiB1c2luZyB0aGUgYG9wdGlvbnNgIGFyZ3VtZW50IG9mIFBvcHBlci5qcy48YnIgLz5cbiAqIFRvIG92ZXJyaWRlIGFuIG9wdGlvbiwgc2ltcGx5IHBhc3MgYW4gb2JqZWN0IHdpdGggdGhlIHNhbWVcbiAqIHN0cnVjdHVyZSBvZiB0aGUgYG9wdGlvbnNgIG9iamVjdCwgYXMgdGhlIDNyZCBhcmd1bWVudC4gRm9yIGV4YW1wbGU6XG4gKiBgYGBcbiAqIG5ldyBQb3BwZXIocmVmLCBwb3AsIHtcbiAqICAgbW9kaWZpZXJzOiB7XG4gKiAgICAgcHJldmVudE92ZXJmbG93OiB7IGVuYWJsZWQ6IGZhbHNlIH1cbiAqICAgfVxuICogfSlcbiAqIGBgYFxuICogQHR5cGUge09iamVjdH1cbiAqIEBzdGF0aWNcbiAqIEBtZW1iZXJvZiBQb3BwZXJcbiAqL1xudmFyIERlZmF1bHRzID0ge1xuICAvKipcbiAgICogUG9wcGVyJ3MgcGxhY2VtZW50LlxuICAgKiBAcHJvcCB7UG9wcGVyLnBsYWNlbWVudHN9IHBsYWNlbWVudD0nYm90dG9tJ1xuICAgKi9cbiAgcGxhY2VtZW50OiAnYm90dG9tJyxcblxuICAvKipcbiAgICogU2V0IHRoaXMgdG8gdHJ1ZSBpZiB5b3Ugd2FudCBwb3BwZXIgdG8gcG9zaXRpb24gaXQgc2VsZiBpbiAnZml4ZWQnIG1vZGVcbiAgICogQHByb3Age0Jvb2xlYW59IHBvc2l0aW9uRml4ZWQ9ZmFsc2VcbiAgICovXG4gIHBvc2l0aW9uRml4ZWQ6IGZhbHNlLFxuXG4gIC8qKlxuICAgKiBXaGV0aGVyIGV2ZW50cyAocmVzaXplLCBzY3JvbGwpIGFyZSBpbml0aWFsbHkgZW5hYmxlZC5cbiAgICogQHByb3Age0Jvb2xlYW59IGV2ZW50c0VuYWJsZWQ9dHJ1ZVxuICAgKi9cbiAgZXZlbnRzRW5hYmxlZDogdHJ1ZSxcblxuICAvKipcbiAgICogU2V0IHRvIHRydWUgaWYgeW91IHdhbnQgdG8gYXV0b21hdGljYWxseSByZW1vdmUgdGhlIHBvcHBlciB3aGVuXG4gICAqIHlvdSBjYWxsIHRoZSBgZGVzdHJveWAgbWV0aG9kLlxuICAgKiBAcHJvcCB7Qm9vbGVhbn0gcmVtb3ZlT25EZXN0cm95PWZhbHNlXG4gICAqL1xuICByZW1vdmVPbkRlc3Ryb3k6IGZhbHNlLFxuXG4gIC8qKlxuICAgKiBDYWxsYmFjayBjYWxsZWQgd2hlbiB0aGUgcG9wcGVyIGlzIGNyZWF0ZWQuPGJyIC8+XG4gICAqIEJ5IGRlZmF1bHQsIGl0IGlzIHNldCB0byBuby1vcC48YnIgLz5cbiAgICogQWNjZXNzIFBvcHBlci5qcyBpbnN0YW5jZSB3aXRoIGBkYXRhLmluc3RhbmNlYC5cbiAgICogQHByb3Age29uQ3JlYXRlfVxuICAgKi9cbiAgb25DcmVhdGU6IGZ1bmN0aW9uIG9uQ3JlYXRlKCkge30sXG5cbiAgLyoqXG4gICAqIENhbGxiYWNrIGNhbGxlZCB3aGVuIHRoZSBwb3BwZXIgaXMgdXBkYXRlZC4gVGhpcyBjYWxsYmFjayBpcyBub3QgY2FsbGVkXG4gICAqIG9uIHRoZSBpbml0aWFsaXphdGlvbi9jcmVhdGlvbiBvZiB0aGUgcG9wcGVyLCBidXQgb25seSBvbiBzdWJzZXF1ZW50XG4gICAqIHVwZGF0ZXMuPGJyIC8+XG4gICAqIEJ5IGRlZmF1bHQsIGl0IGlzIHNldCB0byBuby1vcC48YnIgLz5cbiAgICogQWNjZXNzIFBvcHBlci5qcyBpbnN0YW5jZSB3aXRoIGBkYXRhLmluc3RhbmNlYC5cbiAgICogQHByb3Age29uVXBkYXRlfVxuICAgKi9cbiAgb25VcGRhdGU6IGZ1bmN0aW9uIG9uVXBkYXRlKCkge30sXG5cbiAgLyoqXG4gICAqIExpc3Qgb2YgbW9kaWZpZXJzIHVzZWQgdG8gbW9kaWZ5IHRoZSBvZmZzZXRzIGJlZm9yZSB0aGV5IGFyZSBhcHBsaWVkIHRvIHRoZSBwb3BwZXIuXG4gICAqIFRoZXkgcHJvdmlkZSBtb3N0IG9mIHRoZSBmdW5jdGlvbmFsaXRpZXMgb2YgUG9wcGVyLmpzLlxuICAgKiBAcHJvcCB7bW9kaWZpZXJzfVxuICAgKi9cbiAgbW9kaWZpZXJzOiBtb2RpZmllcnNcbn07XG5cbi8qKlxuICogQGNhbGxiYWNrIG9uQ3JlYXRlXG4gKiBAcGFyYW0ge2RhdGFPYmplY3R9IGRhdGFcbiAqL1xuXG4vKipcbiAqIEBjYWxsYmFjayBvblVwZGF0ZVxuICogQHBhcmFtIHtkYXRhT2JqZWN0fSBkYXRhXG4gKi9cblxuLy8gVXRpbHNcbi8vIE1ldGhvZHNcbnZhciBQb3BwZXIgPSBmdW5jdGlvbiAoKSB7XG4gIC8qKlxuICAgKiBDcmVhdGVzIGEgbmV3IFBvcHBlci5qcyBpbnN0YW5jZS5cbiAgICogQGNsYXNzIFBvcHBlclxuICAgKiBAcGFyYW0ge0hUTUxFbGVtZW50fHJlZmVyZW5jZU9iamVjdH0gcmVmZXJlbmNlIC0gVGhlIHJlZmVyZW5jZSBlbGVtZW50IHVzZWQgdG8gcG9zaXRpb24gdGhlIHBvcHBlclxuICAgKiBAcGFyYW0ge0hUTUxFbGVtZW50fSBwb3BwZXIgLSBUaGUgSFRNTCBlbGVtZW50IHVzZWQgYXMgdGhlIHBvcHBlclxuICAgKiBAcGFyYW0ge09iamVjdH0gb3B0aW9ucyAtIFlvdXIgY3VzdG9tIG9wdGlvbnMgdG8gb3ZlcnJpZGUgdGhlIG9uZXMgZGVmaW5lZCBpbiBbRGVmYXVsdHNdKCNkZWZhdWx0cylcbiAgICogQHJldHVybiB7T2JqZWN0fSBpbnN0YW5jZSAtIFRoZSBnZW5lcmF0ZWQgUG9wcGVyLmpzIGluc3RhbmNlXG4gICAqL1xuICBmdW5jdGlvbiBQb3BwZXIocmVmZXJlbmNlLCBwb3BwZXIpIHtcbiAgICB2YXIgX3RoaXMgPSB0aGlzO1xuXG4gICAgdmFyIG9wdGlvbnMgPSBhcmd1bWVudHMubGVuZ3RoID4gMiAmJiBhcmd1bWVudHNbMl0gIT09IHVuZGVmaW5lZCA/IGFyZ3VtZW50c1syXSA6IHt9O1xuICAgIGNsYXNzQ2FsbENoZWNrKHRoaXMsIFBvcHBlcik7XG5cbiAgICB0aGlzLnNjaGVkdWxlVXBkYXRlID0gZnVuY3Rpb24gKCkge1xuICAgICAgcmV0dXJuIHJlcXVlc3RBbmltYXRpb25GcmFtZShfdGhpcy51cGRhdGUpO1xuICAgIH07XG5cbiAgICAvLyBtYWtlIHVwZGF0ZSgpIGRlYm91bmNlZCwgc28gdGhhdCBpdCBvbmx5IHJ1bnMgYXQgbW9zdCBvbmNlLXBlci10aWNrXG4gICAgdGhpcy51cGRhdGUgPSBkZWJvdW5jZSh0aGlzLnVwZGF0ZS5iaW5kKHRoaXMpKTtcblxuICAgIC8vIHdpdGgge30gd2UgY3JlYXRlIGEgbmV3IG9iamVjdCB3aXRoIHRoZSBvcHRpb25zIGluc2lkZSBpdFxuICAgIHRoaXMub3B0aW9ucyA9IF9leHRlbmRzKHt9LCBQb3BwZXIuRGVmYXVsdHMsIG9wdGlvbnMpO1xuXG4gICAgLy8gaW5pdCBzdGF0ZVxuICAgIHRoaXMuc3RhdGUgPSB7XG4gICAgICBpc0Rlc3Ryb3llZDogZmFsc2UsXG4gICAgICBpc0NyZWF0ZWQ6IGZhbHNlLFxuICAgICAgc2Nyb2xsUGFyZW50czogW11cbiAgICB9O1xuXG4gICAgLy8gZ2V0IHJlZmVyZW5jZSBhbmQgcG9wcGVyIGVsZW1lbnRzIChhbGxvdyBqUXVlcnkgd3JhcHBlcnMpXG4gICAgdGhpcy5yZWZlcmVuY2UgPSByZWZlcmVuY2UgJiYgcmVmZXJlbmNlLmpxdWVyeSA/IHJlZmVyZW5jZVswXSA6IHJlZmVyZW5jZTtcbiAgICB0aGlzLnBvcHBlciA9IHBvcHBlciAmJiBwb3BwZXIuanF1ZXJ5ID8gcG9wcGVyWzBdIDogcG9wcGVyO1xuXG4gICAgLy8gRGVlcCBtZXJnZSBtb2RpZmllcnMgb3B0aW9uc1xuICAgIHRoaXMub3B0aW9ucy5tb2RpZmllcnMgPSB7fTtcbiAgICBPYmplY3Qua2V5cyhfZXh0ZW5kcyh7fSwgUG9wcGVyLkRlZmF1bHRzLm1vZGlmaWVycywgb3B0aW9ucy5tb2RpZmllcnMpKS5mb3JFYWNoKGZ1bmN0aW9uIChuYW1lKSB7XG4gICAgICBfdGhpcy5vcHRpb25zLm1vZGlmaWVyc1tuYW1lXSA9IF9leHRlbmRzKHt9LCBQb3BwZXIuRGVmYXVsdHMubW9kaWZpZXJzW25hbWVdIHx8IHt9LCBvcHRpb25zLm1vZGlmaWVycyA/IG9wdGlvbnMubW9kaWZpZXJzW25hbWVdIDoge30pO1xuICAgIH0pO1xuXG4gICAgLy8gUmVmYWN0b3JpbmcgbW9kaWZpZXJzJyBsaXN0IChPYmplY3QgPT4gQXJyYXkpXG4gICAgdGhpcy5tb2RpZmllcnMgPSBPYmplY3Qua2V5cyh0aGlzLm9wdGlvbnMubW9kaWZpZXJzKS5tYXAoZnVuY3Rpb24gKG5hbWUpIHtcbiAgICAgIHJldHVybiBfZXh0ZW5kcyh7XG4gICAgICAgIG5hbWU6IG5hbWVcbiAgICAgIH0sIF90aGlzLm9wdGlvbnMubW9kaWZpZXJzW25hbWVdKTtcbiAgICB9KVxuICAgIC8vIHNvcnQgdGhlIG1vZGlmaWVycyBieSBvcmRlclxuICAgIC5zb3J0KGZ1bmN0aW9uIChhLCBiKSB7XG4gICAgICByZXR1cm4gYS5vcmRlciAtIGIub3JkZXI7XG4gICAgfSk7XG5cbiAgICAvLyBtb2RpZmllcnMgaGF2ZSB0aGUgYWJpbGl0eSB0byBleGVjdXRlIGFyYml0cmFyeSBjb2RlIHdoZW4gUG9wcGVyLmpzIGdldCBpbml0ZWRcbiAgICAvLyBzdWNoIGNvZGUgaXMgZXhlY3V0ZWQgaW4gdGhlIHNhbWUgb3JkZXIgb2YgaXRzIG1vZGlmaWVyXG4gICAgLy8gdGhleSBjb3VsZCBhZGQgbmV3IHByb3BlcnRpZXMgdG8gdGhlaXIgb3B0aW9ucyBjb25maWd1cmF0aW9uXG4gICAgLy8gQkUgQVdBUkU6IGRvbid0IGFkZCBvcHRpb25zIHRvIGBvcHRpb25zLm1vZGlmaWVycy5uYW1lYCBidXQgdG8gYG1vZGlmaWVyT3B0aW9uc2AhXG4gICAgdGhpcy5tb2RpZmllcnMuZm9yRWFjaChmdW5jdGlvbiAobW9kaWZpZXJPcHRpb25zKSB7XG4gICAgICBpZiAobW9kaWZpZXJPcHRpb25zLmVuYWJsZWQgJiYgaXNGdW5jdGlvbihtb2RpZmllck9wdGlvbnMub25Mb2FkKSkge1xuICAgICAgICBtb2RpZmllck9wdGlvbnMub25Mb2FkKF90aGlzLnJlZmVyZW5jZSwgX3RoaXMucG9wcGVyLCBfdGhpcy5vcHRpb25zLCBtb2RpZmllck9wdGlvbnMsIF90aGlzLnN0YXRlKTtcbiAgICAgIH1cbiAgICB9KTtcblxuICAgIC8vIGZpcmUgdGhlIGZpcnN0IHVwZGF0ZSB0byBwb3NpdGlvbiB0aGUgcG9wcGVyIGluIHRoZSByaWdodCBwbGFjZVxuICAgIHRoaXMudXBkYXRlKCk7XG5cbiAgICB2YXIgZXZlbnRzRW5hYmxlZCA9IHRoaXMub3B0aW9ucy5ldmVudHNFbmFibGVkO1xuICAgIGlmIChldmVudHNFbmFibGVkKSB7XG4gICAgICAvLyBzZXR1cCBldmVudCBsaXN0ZW5lcnMsIHRoZXkgd2lsbCB0YWtlIGNhcmUgb2YgdXBkYXRlIHRoZSBwb3NpdGlvbiBpbiBzcGVjaWZpYyBzaXR1YXRpb25zXG4gICAgICB0aGlzLmVuYWJsZUV2ZW50TGlzdGVuZXJzKCk7XG4gICAgfVxuXG4gICAgdGhpcy5zdGF0ZS5ldmVudHNFbmFibGVkID0gZXZlbnRzRW5hYmxlZDtcbiAgfVxuXG4gIC8vIFdlIGNhbid0IHVzZSBjbGFzcyBwcm9wZXJ0aWVzIGJlY2F1c2UgdGhleSBkb24ndCBnZXQgbGlzdGVkIGluIHRoZVxuICAvLyBjbGFzcyBwcm90b3R5cGUgYW5kIGJyZWFrIHN0dWZmIGxpa2UgU2lub24gc3R1YnNcblxuXG4gIGNyZWF0ZUNsYXNzKFBvcHBlciwgW3tcbiAgICBrZXk6ICd1cGRhdGUnLFxuICAgIHZhbHVlOiBmdW5jdGlvbiB1cGRhdGUkJDEoKSB7XG4gICAgICByZXR1cm4gdXBkYXRlLmNhbGwodGhpcyk7XG4gICAgfVxuICB9LCB7XG4gICAga2V5OiAnZGVzdHJveScsXG4gICAgdmFsdWU6IGZ1bmN0aW9uIGRlc3Ryb3kkJDEoKSB7XG4gICAgICByZXR1cm4gZGVzdHJveS5jYWxsKHRoaXMpO1xuICAgIH1cbiAgfSwge1xuICAgIGtleTogJ2VuYWJsZUV2ZW50TGlzdGVuZXJzJyxcbiAgICB2YWx1ZTogZnVuY3Rpb24gZW5hYmxlRXZlbnRMaXN0ZW5lcnMkJDEoKSB7XG4gICAgICByZXR1cm4gZW5hYmxlRXZlbnRMaXN0ZW5lcnMuY2FsbCh0aGlzKTtcbiAgICB9XG4gIH0sIHtcbiAgICBrZXk6ICdkaXNhYmxlRXZlbnRMaXN0ZW5lcnMnLFxuICAgIHZhbHVlOiBmdW5jdGlvbiBkaXNhYmxlRXZlbnRMaXN0ZW5lcnMkJDEoKSB7XG4gICAgICByZXR1cm4gZGlzYWJsZUV2ZW50TGlzdGVuZXJzLmNhbGwodGhpcyk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogU2NoZWR1bGVzIGFuIHVwZGF0ZS4gSXQgd2lsbCBydW4gb24gdGhlIG5leHQgVUkgdXBkYXRlIGF2YWlsYWJsZS5cbiAgICAgKiBAbWV0aG9kIHNjaGVkdWxlVXBkYXRlXG4gICAgICogQG1lbWJlcm9mIFBvcHBlclxuICAgICAqL1xuXG5cbiAgICAvKipcbiAgICAgKiBDb2xsZWN0aW9uIG9mIHV0aWxpdGllcyB1c2VmdWwgd2hlbiB3cml0aW5nIGN1c3RvbSBtb2RpZmllcnMuXG4gICAgICogU3RhcnRpbmcgZnJvbSB2ZXJzaW9uIDEuNywgdGhpcyBtZXRob2QgaXMgYXZhaWxhYmxlIG9ubHkgaWYgeW91XG4gICAgICogaW5jbHVkZSBgcG9wcGVyLXV0aWxzLmpzYCBiZWZvcmUgYHBvcHBlci5qc2AuXG4gICAgICpcbiAgICAgKiAqKkRFUFJFQ0FUSU9OKio6IFRoaXMgd2F5IHRvIGFjY2VzcyBQb3BwZXJVdGlscyBpcyBkZXByZWNhdGVkXG4gICAgICogYW5kIHdpbGwgYmUgcmVtb3ZlZCBpbiB2MiEgVXNlIHRoZSBQb3BwZXJVdGlscyBtb2R1bGUgZGlyZWN0bHkgaW5zdGVhZC5cbiAgICAgKiBEdWUgdG8gdGhlIGhpZ2ggaW5zdGFiaWxpdHkgb2YgdGhlIG1ldGhvZHMgY29udGFpbmVkIGluIFV0aWxzLCB3ZSBjYW4ndFxuICAgICAqIGd1YXJhbnRlZSB0aGVtIHRvIGZvbGxvdyBzZW12ZXIuIFVzZSB0aGVtIGF0IHlvdXIgb3duIHJpc2shXG4gICAgICogQHN0YXRpY1xuICAgICAqIEBwcml2YXRlXG4gICAgICogQHR5cGUge09iamVjdH1cbiAgICAgKiBAZGVwcmVjYXRlZCBzaW5jZSB2ZXJzaW9uIDEuOFxuICAgICAqIEBtZW1iZXIgVXRpbHNcbiAgICAgKiBAbWVtYmVyb2YgUG9wcGVyXG4gICAgICovXG5cbiAgfV0pO1xuICByZXR1cm4gUG9wcGVyO1xufSgpO1xuXG4vKipcbiAqIFRoZSBgcmVmZXJlbmNlT2JqZWN0YCBpcyBhbiBvYmplY3QgdGhhdCBwcm92aWRlcyBhbiBpbnRlcmZhY2UgY29tcGF0aWJsZSB3aXRoIFBvcHBlci5qc1xuICogYW5kIGxldHMgeW91IHVzZSBpdCBhcyByZXBsYWNlbWVudCBvZiBhIHJlYWwgRE9NIG5vZGUuPGJyIC8+XG4gKiBZb3UgY2FuIHVzZSB0aGlzIG1ldGhvZCB0byBwb3NpdGlvbiBhIHBvcHBlciByZWxhdGl2ZWx5IHRvIGEgc2V0IG9mIGNvb3JkaW5hdGVzXG4gKiBpbiBjYXNlIHlvdSBkb24ndCBoYXZlIGEgRE9NIG5vZGUgdG8gdXNlIGFzIHJlZmVyZW5jZS5cbiAqXG4gKiBgYGBcbiAqIG5ldyBQb3BwZXIocmVmZXJlbmNlT2JqZWN0LCBwb3BwZXJOb2RlKTtcbiAqIGBgYFxuICpcbiAqIE5COiBUaGlzIGZlYXR1cmUgaXNuJ3Qgc3VwcG9ydGVkIGluIEludGVybmV0IEV4cGxvcmVyIDEwLlxuICogQG5hbWUgcmVmZXJlbmNlT2JqZWN0XG4gKiBAcHJvcGVydHkge0Z1bmN0aW9ufSBkYXRhLmdldEJvdW5kaW5nQ2xpZW50UmVjdFxuICogQSBmdW5jdGlvbiB0aGF0IHJldHVybnMgYSBzZXQgb2YgY29vcmRpbmF0ZXMgY29tcGF0aWJsZSB3aXRoIHRoZSBuYXRpdmUgYGdldEJvdW5kaW5nQ2xpZW50UmVjdGAgbWV0aG9kLlxuICogQHByb3BlcnR5IHtudW1iZXJ9IGRhdGEuY2xpZW50V2lkdGhcbiAqIEFuIEVTNiBnZXR0ZXIgdGhhdCB3aWxsIHJldHVybiB0aGUgd2lkdGggb2YgdGhlIHZpcnR1YWwgcmVmZXJlbmNlIGVsZW1lbnQuXG4gKiBAcHJvcGVydHkge251bWJlcn0gZGF0YS5jbGllbnRIZWlnaHRcbiAqIEFuIEVTNiBnZXR0ZXIgdGhhdCB3aWxsIHJldHVybiB0aGUgaGVpZ2h0IG9mIHRoZSB2aXJ0dWFsIHJlZmVyZW5jZSBlbGVtZW50LlxuICovXG5cblxuUG9wcGVyLlV0aWxzID0gKHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnID8gd2luZG93IDogZ2xvYmFsKS5Qb3BwZXJVdGlscztcblBvcHBlci5wbGFjZW1lbnRzID0gcGxhY2VtZW50cztcblBvcHBlci5EZWZhdWx0cyA9IERlZmF1bHRzO1xuXG5yZXR1cm4gUG9wcGVyO1xuXG59KSkpO1xuLy8jIHNvdXJjZU1hcHBpbmdVUkw9cG9wcGVyLmpzLm1hcFxuXG4vKiFcbiAgKiBCb290c3RyYXAgdjQuMi4xIChodHRwczovL2dldGJvb3RzdHJhcC5jb20vKVxuICAqIENvcHlyaWdodCAyMDExLTIwMTggVGhlIEJvb3RzdHJhcCBBdXRob3JzIChodHRwczovL2dpdGh1Yi5jb20vdHdicy9ib290c3RyYXAvZ3JhcGhzL2NvbnRyaWJ1dG9ycylcbiAgKiBMaWNlbnNlZCB1bmRlciBNSVQgKGh0dHBzOi8vZ2l0aHViLmNvbS90d2JzL2Jvb3RzdHJhcC9ibG9iL21hc3Rlci9MSUNFTlNFKVxuICAqL1xuKGZ1bmN0aW9uIChnbG9iYWwsIGZhY3RvcnkpIHtcbiAgdHlwZW9mIGV4cG9ydHMgPT09ICdvYmplY3QnICYmIHR5cGVvZiBtb2R1bGUgIT09ICd1bmRlZmluZWQnID8gZmFjdG9yeShleHBvcnRzLCByZXF1aXJlKCdwb3BwZXIuanMnKSwgcmVxdWlyZSgnanF1ZXJ5JykpIDpcbiAgdHlwZW9mIGRlZmluZSA9PT0gJ2Z1bmN0aW9uJyAmJiBkZWZpbmUuYW1kID8gZGVmaW5lKFsnZXhwb3J0cycsICdwb3BwZXIuanMnLCAnanF1ZXJ5J10sIGZhY3RvcnkpIDpcbiAgKGZhY3RvcnkoKGdsb2JhbC5ib290c3RyYXAgPSB7fSksZ2xvYmFsLlBvcHBlcixnbG9iYWwualF1ZXJ5KSk7XG59KHRoaXMsIChmdW5jdGlvbiAoZXhwb3J0cyxQb3BwZXIsJCkgeyAndXNlIHN0cmljdCc7XG5cbiAgUG9wcGVyID0gUG9wcGVyICYmIFBvcHBlci5oYXNPd25Qcm9wZXJ0eSgnZGVmYXVsdCcpID8gUG9wcGVyWydkZWZhdWx0J10gOiBQb3BwZXI7XG4gICQgPSAkICYmICQuaGFzT3duUHJvcGVydHkoJ2RlZmF1bHQnKSA/ICRbJ2RlZmF1bHQnXSA6ICQ7XG5cbiAgZnVuY3Rpb24gX2RlZmluZVByb3BlcnRpZXModGFyZ2V0LCBwcm9wcykge1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgcHJvcHMubGVuZ3RoOyBpKyspIHtcbiAgICAgIHZhciBkZXNjcmlwdG9yID0gcHJvcHNbaV07XG4gICAgICBkZXNjcmlwdG9yLmVudW1lcmFibGUgPSBkZXNjcmlwdG9yLmVudW1lcmFibGUgfHwgZmFsc2U7XG4gICAgICBkZXNjcmlwdG9yLmNvbmZpZ3VyYWJsZSA9IHRydWU7XG4gICAgICBpZiAoXCJ2YWx1ZVwiIGluIGRlc2NyaXB0b3IpIGRlc2NyaXB0b3Iud3JpdGFibGUgPSB0cnVlO1xuICAgICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRhcmdldCwgZGVzY3JpcHRvci5rZXksIGRlc2NyaXB0b3IpO1xuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIF9jcmVhdGVDbGFzcyhDb25zdHJ1Y3RvciwgcHJvdG9Qcm9wcywgc3RhdGljUHJvcHMpIHtcbiAgICBpZiAocHJvdG9Qcm9wcykgX2RlZmluZVByb3BlcnRpZXMoQ29uc3RydWN0b3IucHJvdG90eXBlLCBwcm90b1Byb3BzKTtcbiAgICBpZiAoc3RhdGljUHJvcHMpIF9kZWZpbmVQcm9wZXJ0aWVzKENvbnN0cnVjdG9yLCBzdGF0aWNQcm9wcyk7XG4gICAgcmV0dXJuIENvbnN0cnVjdG9yO1xuICB9XG5cbiAgZnVuY3Rpb24gX2RlZmluZVByb3BlcnR5KG9iaiwga2V5LCB2YWx1ZSkge1xuICAgIGlmIChrZXkgaW4gb2JqKSB7XG4gICAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkob2JqLCBrZXksIHtcbiAgICAgICAgdmFsdWU6IHZhbHVlLFxuICAgICAgICBlbnVtZXJhYmxlOiB0cnVlLFxuICAgICAgICBjb25maWd1cmFibGU6IHRydWUsXG4gICAgICAgIHdyaXRhYmxlOiB0cnVlXG4gICAgICB9KTtcbiAgICB9IGVsc2Uge1xuICAgICAgb2JqW2tleV0gPSB2YWx1ZTtcbiAgICB9XG5cbiAgICByZXR1cm4gb2JqO1xuICB9XG5cbiAgZnVuY3Rpb24gX29iamVjdFNwcmVhZCh0YXJnZXQpIHtcbiAgICBmb3IgKHZhciBpID0gMTsgaSA8IGFyZ3VtZW50cy5sZW5ndGg7IGkrKykge1xuICAgICAgdmFyIHNvdXJjZSA9IGFyZ3VtZW50c1tpXSAhPSBudWxsID8gYXJndW1lbnRzW2ldIDoge307XG4gICAgICB2YXIgb3duS2V5cyA9IE9iamVjdC5rZXlzKHNvdXJjZSk7XG5cbiAgICAgIGlmICh0eXBlb2YgT2JqZWN0LmdldE93blByb3BlcnR5U3ltYm9scyA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICBvd25LZXlzID0gb3duS2V5cy5jb25jYXQoT2JqZWN0LmdldE93blByb3BlcnR5U3ltYm9scyhzb3VyY2UpLmZpbHRlcihmdW5jdGlvbiAoc3ltKSB7XG4gICAgICAgICAgcmV0dXJuIE9iamVjdC5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3Ioc291cmNlLCBzeW0pLmVudW1lcmFibGU7XG4gICAgICAgIH0pKTtcbiAgICAgIH1cblxuICAgICAgb3duS2V5cy5mb3JFYWNoKGZ1bmN0aW9uIChrZXkpIHtcbiAgICAgICAgX2RlZmluZVByb3BlcnR5KHRhcmdldCwga2V5LCBzb3VyY2Vba2V5XSk7XG4gICAgICB9KTtcbiAgICB9XG5cbiAgICByZXR1cm4gdGFyZ2V0O1xuICB9XG5cbiAgZnVuY3Rpb24gX2luaGVyaXRzTG9vc2Uoc3ViQ2xhc3MsIHN1cGVyQ2xhc3MpIHtcbiAgICBzdWJDbGFzcy5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKHN1cGVyQ2xhc3MucHJvdG90eXBlKTtcbiAgICBzdWJDbGFzcy5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBzdWJDbGFzcztcbiAgICBzdWJDbGFzcy5fX3Byb3RvX18gPSBzdXBlckNsYXNzO1xuICB9XG5cbiAgLyoqXG4gICAqIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAqIEJvb3RzdHJhcCAodjQuMi4xKTogdXRpbC5qc1xuICAgKiBMaWNlbnNlZCB1bmRlciBNSVQgKGh0dHBzOi8vZ2l0aHViLmNvbS90d2JzL2Jvb3RzdHJhcC9ibG9iL21hc3Rlci9MSUNFTlNFKVxuICAgKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgKi9cbiAgLyoqXG4gICAqIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgKiBQcml2YXRlIFRyYW5zaXRpb25FbmQgSGVscGVyc1xuICAgKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICovXG5cbiAgdmFyIFRSQU5TSVRJT05fRU5EID0gJ3RyYW5zaXRpb25lbmQnO1xuICB2YXIgTUFYX1VJRCA9IDEwMDAwMDA7XG4gIHZhciBNSUxMSVNFQ09ORFNfTVVMVElQTElFUiA9IDEwMDA7IC8vIFNob3V0b3V0IEFuZ3VzQ3JvbGwgKGh0dHBzOi8vZ29vLmdsL3B4d1FHcClcblxuICBmdW5jdGlvbiB0b1R5cGUob2JqKSB7XG4gICAgcmV0dXJuIHt9LnRvU3RyaW5nLmNhbGwob2JqKS5tYXRjaCgvXFxzKFthLXpdKykvaSlbMV0udG9Mb3dlckNhc2UoKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGdldFNwZWNpYWxUcmFuc2l0aW9uRW5kRXZlbnQoKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIGJpbmRUeXBlOiBUUkFOU0lUSU9OX0VORCxcbiAgICAgIGRlbGVnYXRlVHlwZTogVFJBTlNJVElPTl9FTkQsXG4gICAgICBoYW5kbGU6IGZ1bmN0aW9uIGhhbmRsZShldmVudCkge1xuICAgICAgICBpZiAoJChldmVudC50YXJnZXQpLmlzKHRoaXMpKSB7XG4gICAgICAgICAgcmV0dXJuIGV2ZW50LmhhbmRsZU9iai5oYW5kbGVyLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgcHJlZmVyLXJlc3QtcGFyYW1zXG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gdW5kZWZpbmVkOyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIG5vLXVuZGVmaW5lZFxuICAgICAgfVxuICAgIH07XG4gIH1cblxuICBmdW5jdGlvbiB0cmFuc2l0aW9uRW5kRW11bGF0b3IoZHVyYXRpb24pIHtcbiAgICB2YXIgX3RoaXMgPSB0aGlzO1xuXG4gICAgdmFyIGNhbGxlZCA9IGZhbHNlO1xuICAgICQodGhpcykub25lKFV0aWwuVFJBTlNJVElPTl9FTkQsIGZ1bmN0aW9uICgpIHtcbiAgICAgIGNhbGxlZCA9IHRydWU7XG4gICAgfSk7XG4gICAgc2V0VGltZW91dChmdW5jdGlvbiAoKSB7XG4gICAgICBpZiAoIWNhbGxlZCkge1xuICAgICAgICBVdGlsLnRyaWdnZXJUcmFuc2l0aW9uRW5kKF90aGlzKTtcbiAgICAgIH1cbiAgICB9LCBkdXJhdGlvbik7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICBmdW5jdGlvbiBzZXRUcmFuc2l0aW9uRW5kU3VwcG9ydCgpIHtcbiAgICAkLmZuLmVtdWxhdGVUcmFuc2l0aW9uRW5kID0gdHJhbnNpdGlvbkVuZEVtdWxhdG9yO1xuICAgICQuZXZlbnQuc3BlY2lhbFtVdGlsLlRSQU5TSVRJT05fRU5EXSA9IGdldFNwZWNpYWxUcmFuc2l0aW9uRW5kRXZlbnQoKTtcbiAgfVxuICAvKipcbiAgICogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICogUHVibGljIFV0aWwgQXBpXG4gICAqIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAqL1xuXG5cbiAgdmFyIFV0aWwgPSB7XG4gICAgVFJBTlNJVElPTl9FTkQ6ICdic1RyYW5zaXRpb25FbmQnLFxuICAgIGdldFVJRDogZnVuY3Rpb24gZ2V0VUlEKHByZWZpeCkge1xuICAgICAgZG8ge1xuICAgICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tYml0d2lzZVxuICAgICAgICBwcmVmaXggKz0gfn4oTWF0aC5yYW5kb20oKSAqIE1BWF9VSUQpOyAvLyBcIn5+XCIgYWN0cyBsaWtlIGEgZmFzdGVyIE1hdGguZmxvb3IoKSBoZXJlXG4gICAgICB9IHdoaWxlIChkb2N1bWVudC5nZXRFbGVtZW50QnlJZChwcmVmaXgpKTtcblxuICAgICAgcmV0dXJuIHByZWZpeDtcbiAgICB9LFxuICAgIGdldFNlbGVjdG9yRnJvbUVsZW1lbnQ6IGZ1bmN0aW9uIGdldFNlbGVjdG9yRnJvbUVsZW1lbnQoZWxlbWVudCkge1xuICAgICAgdmFyIHNlbGVjdG9yID0gZWxlbWVudC5nZXRBdHRyaWJ1dGUoJ2RhdGEtdGFyZ2V0Jyk7XG5cbiAgICAgIGlmICghc2VsZWN0b3IgfHwgc2VsZWN0b3IgPT09ICcjJykge1xuICAgICAgICB2YXIgaHJlZkF0dHIgPSBlbGVtZW50LmdldEF0dHJpYnV0ZSgnaHJlZicpO1xuICAgICAgICBzZWxlY3RvciA9IGhyZWZBdHRyICYmIGhyZWZBdHRyICE9PSAnIycgPyBocmVmQXR0ci50cmltKCkgOiAnJztcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHNlbGVjdG9yICYmIGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3Ioc2VsZWN0b3IpID8gc2VsZWN0b3IgOiBudWxsO1xuICAgIH0sXG4gICAgZ2V0VHJhbnNpdGlvbkR1cmF0aW9uRnJvbUVsZW1lbnQ6IGZ1bmN0aW9uIGdldFRyYW5zaXRpb25EdXJhdGlvbkZyb21FbGVtZW50KGVsZW1lbnQpIHtcbiAgICAgIGlmICghZWxlbWVudCkge1xuICAgICAgICByZXR1cm4gMDtcbiAgICAgIH0gLy8gR2V0IHRyYW5zaXRpb24tZHVyYXRpb24gb2YgdGhlIGVsZW1lbnRcblxuXG4gICAgICB2YXIgdHJhbnNpdGlvbkR1cmF0aW9uID0gJChlbGVtZW50KS5jc3MoJ3RyYW5zaXRpb24tZHVyYXRpb24nKTtcbiAgICAgIHZhciB0cmFuc2l0aW9uRGVsYXkgPSAkKGVsZW1lbnQpLmNzcygndHJhbnNpdGlvbi1kZWxheScpO1xuICAgICAgdmFyIGZsb2F0VHJhbnNpdGlvbkR1cmF0aW9uID0gcGFyc2VGbG9hdCh0cmFuc2l0aW9uRHVyYXRpb24pO1xuICAgICAgdmFyIGZsb2F0VHJhbnNpdGlvbkRlbGF5ID0gcGFyc2VGbG9hdCh0cmFuc2l0aW9uRGVsYXkpOyAvLyBSZXR1cm4gMCBpZiBlbGVtZW50IG9yIHRyYW5zaXRpb24gZHVyYXRpb24gaXMgbm90IGZvdW5kXG5cbiAgICAgIGlmICghZmxvYXRUcmFuc2l0aW9uRHVyYXRpb24gJiYgIWZsb2F0VHJhbnNpdGlvbkRlbGF5KSB7XG4gICAgICAgIHJldHVybiAwO1xuICAgICAgfSAvLyBJZiBtdWx0aXBsZSBkdXJhdGlvbnMgYXJlIGRlZmluZWQsIHRha2UgdGhlIGZpcnN0XG5cblxuICAgICAgdHJhbnNpdGlvbkR1cmF0aW9uID0gdHJhbnNpdGlvbkR1cmF0aW9uLnNwbGl0KCcsJylbMF07XG4gICAgICB0cmFuc2l0aW9uRGVsYXkgPSB0cmFuc2l0aW9uRGVsYXkuc3BsaXQoJywnKVswXTtcbiAgICAgIHJldHVybiAocGFyc2VGbG9hdCh0cmFuc2l0aW9uRHVyYXRpb24pICsgcGFyc2VGbG9hdCh0cmFuc2l0aW9uRGVsYXkpKSAqIE1JTExJU0VDT05EU19NVUxUSVBMSUVSO1xuICAgIH0sXG4gICAgcmVmbG93OiBmdW5jdGlvbiByZWZsb3coZWxlbWVudCkge1xuICAgICAgcmV0dXJuIGVsZW1lbnQub2Zmc2V0SGVpZ2h0O1xuICAgIH0sXG4gICAgdHJpZ2dlclRyYW5zaXRpb25FbmQ6IGZ1bmN0aW9uIHRyaWdnZXJUcmFuc2l0aW9uRW5kKGVsZW1lbnQpIHtcbiAgICAgICQoZWxlbWVudCkudHJpZ2dlcihUUkFOU0lUSU9OX0VORCk7XG4gICAgfSxcbiAgICAvLyBUT0RPOiBSZW1vdmUgaW4gdjVcbiAgICBzdXBwb3J0c1RyYW5zaXRpb25FbmQ6IGZ1bmN0aW9uIHN1cHBvcnRzVHJhbnNpdGlvbkVuZCgpIHtcbiAgICAgIHJldHVybiBCb29sZWFuKFRSQU5TSVRJT05fRU5EKTtcbiAgICB9LFxuICAgIGlzRWxlbWVudDogZnVuY3Rpb24gaXNFbGVtZW50KG9iaikge1xuICAgICAgcmV0dXJuIChvYmpbMF0gfHwgb2JqKS5ub2RlVHlwZTtcbiAgICB9LFxuICAgIHR5cGVDaGVja0NvbmZpZzogZnVuY3Rpb24gdHlwZUNoZWNrQ29uZmlnKGNvbXBvbmVudE5hbWUsIGNvbmZpZywgY29uZmlnVHlwZXMpIHtcbiAgICAgIGZvciAodmFyIHByb3BlcnR5IGluIGNvbmZpZ1R5cGVzKSB7XG4gICAgICAgIGlmIChPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwoY29uZmlnVHlwZXMsIHByb3BlcnR5KSkge1xuICAgICAgICAgIHZhciBleHBlY3RlZFR5cGVzID0gY29uZmlnVHlwZXNbcHJvcGVydHldO1xuICAgICAgICAgIHZhciB2YWx1ZSA9IGNvbmZpZ1twcm9wZXJ0eV07XG4gICAgICAgICAgdmFyIHZhbHVlVHlwZSA9IHZhbHVlICYmIFV0aWwuaXNFbGVtZW50KHZhbHVlKSA/ICdlbGVtZW50JyA6IHRvVHlwZSh2YWx1ZSk7XG5cbiAgICAgICAgICBpZiAoIW5ldyBSZWdFeHAoZXhwZWN0ZWRUeXBlcykudGVzdCh2YWx1ZVR5cGUpKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoY29tcG9uZW50TmFtZS50b1VwcGVyQ2FzZSgpICsgXCI6IFwiICsgKFwiT3B0aW9uIFxcXCJcIiArIHByb3BlcnR5ICsgXCJcXFwiIHByb3ZpZGVkIHR5cGUgXFxcIlwiICsgdmFsdWVUeXBlICsgXCJcXFwiIFwiKSArIChcImJ1dCBleHBlY3RlZCB0eXBlIFxcXCJcIiArIGV4cGVjdGVkVHlwZXMgKyBcIlxcXCIuXCIpKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9LFxuICAgIGZpbmRTaGFkb3dSb290OiBmdW5jdGlvbiBmaW5kU2hhZG93Um9vdChlbGVtZW50KSB7XG4gICAgICBpZiAoIWRvY3VtZW50LmRvY3VtZW50RWxlbWVudC5hdHRhY2hTaGFkb3cpIHtcbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICB9IC8vIENhbiBmaW5kIHRoZSBzaGFkb3cgcm9vdCBvdGhlcndpc2UgaXQnbGwgcmV0dXJuIHRoZSBkb2N1bWVudFxuXG5cbiAgICAgIGlmICh0eXBlb2YgZWxlbWVudC5nZXRSb290Tm9kZSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICB2YXIgcm9vdCA9IGVsZW1lbnQuZ2V0Um9vdE5vZGUoKTtcbiAgICAgICAgcmV0dXJuIHJvb3QgaW5zdGFuY2VvZiBTaGFkb3dSb290ID8gcm9vdCA6IG51bGw7XG4gICAgICB9XG5cbiAgICAgIGlmIChlbGVtZW50IGluc3RhbmNlb2YgU2hhZG93Um9vdCkge1xuICAgICAgICByZXR1cm4gZWxlbWVudDtcbiAgICAgIH0gLy8gd2hlbiB3ZSBkb24ndCBmaW5kIGEgc2hhZG93IHJvb3RcblxuXG4gICAgICBpZiAoIWVsZW1lbnQucGFyZW50Tm9kZSkge1xuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIFV0aWwuZmluZFNoYWRvd1Jvb3QoZWxlbWVudC5wYXJlbnROb2RlKTtcbiAgICB9XG4gIH07XG4gIHNldFRyYW5zaXRpb25FbmRTdXBwb3J0KCk7XG5cbiAgLyoqXG4gICAqIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgKiBDb25zdGFudHNcbiAgICogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAqL1xuXG4gIHZhciBOQU1FID0gJ2FsZXJ0JztcbiAgdmFyIFZFUlNJT04gPSAnNC4yLjEnO1xuICB2YXIgREFUQV9LRVkgPSAnYnMuYWxlcnQnO1xuICB2YXIgRVZFTlRfS0VZID0gXCIuXCIgKyBEQVRBX0tFWTtcbiAgdmFyIERBVEFfQVBJX0tFWSA9ICcuZGF0YS1hcGknO1xuICB2YXIgSlFVRVJZX05PX0NPTkZMSUNUID0gJC5mbltOQU1FXTtcbiAgdmFyIFNlbGVjdG9yID0ge1xuICAgIERJU01JU1M6ICdbZGF0YS1kaXNtaXNzPVwiYWxlcnRcIl0nXG4gIH07XG4gIHZhciBFdmVudCA9IHtcbiAgICBDTE9TRTogXCJjbG9zZVwiICsgRVZFTlRfS0VZLFxuICAgIENMT1NFRDogXCJjbG9zZWRcIiArIEVWRU5UX0tFWSxcbiAgICBDTElDS19EQVRBX0FQSTogXCJjbGlja1wiICsgRVZFTlRfS0VZICsgREFUQV9BUElfS0VZXG4gIH07XG4gIHZhciBDbGFzc05hbWUgPSB7XG4gICAgQUxFUlQ6ICdhbGVydCcsXG4gICAgRkFERTogJ2ZhZGUnLFxuICAgIFNIT1c6ICdzaG93J1xuICAgIC8qKlxuICAgICAqIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgICAqIENsYXNzIERlZmluaXRpb25cbiAgICAgKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICAgKi9cblxuICB9O1xuXG4gIHZhciBBbGVydCA9XG4gIC8qI19fUFVSRV9fKi9cbiAgZnVuY3Rpb24gKCkge1xuICAgIGZ1bmN0aW9uIEFsZXJ0KGVsZW1lbnQpIHtcbiAgICAgIHRoaXMuX2VsZW1lbnQgPSBlbGVtZW50O1xuICAgIH0gLy8gR2V0dGVyc1xuXG5cbiAgICB2YXIgX3Byb3RvID0gQWxlcnQucHJvdG90eXBlO1xuXG4gICAgLy8gUHVibGljXG4gICAgX3Byb3RvLmNsb3NlID0gZnVuY3Rpb24gY2xvc2UoZWxlbWVudCkge1xuICAgICAgdmFyIHJvb3RFbGVtZW50ID0gdGhpcy5fZWxlbWVudDtcblxuICAgICAgaWYgKGVsZW1lbnQpIHtcbiAgICAgICAgcm9vdEVsZW1lbnQgPSB0aGlzLl9nZXRSb290RWxlbWVudChlbGVtZW50KTtcbiAgICAgIH1cblxuICAgICAgdmFyIGN1c3RvbUV2ZW50ID0gdGhpcy5fdHJpZ2dlckNsb3NlRXZlbnQocm9vdEVsZW1lbnQpO1xuXG4gICAgICBpZiAoY3VzdG9tRXZlbnQuaXNEZWZhdWx0UHJldmVudGVkKCkpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICB0aGlzLl9yZW1vdmVFbGVtZW50KHJvb3RFbGVtZW50KTtcbiAgICB9O1xuXG4gICAgX3Byb3RvLmRpc3Bvc2UgPSBmdW5jdGlvbiBkaXNwb3NlKCkge1xuICAgICAgJC5yZW1vdmVEYXRhKHRoaXMuX2VsZW1lbnQsIERBVEFfS0VZKTtcbiAgICAgIHRoaXMuX2VsZW1lbnQgPSBudWxsO1xuICAgIH07IC8vIFByaXZhdGVcblxuXG4gICAgX3Byb3RvLl9nZXRSb290RWxlbWVudCA9IGZ1bmN0aW9uIF9nZXRSb290RWxlbWVudChlbGVtZW50KSB7XG4gICAgICB2YXIgc2VsZWN0b3IgPSBVdGlsLmdldFNlbGVjdG9yRnJvbUVsZW1lbnQoZWxlbWVudCk7XG4gICAgICB2YXIgcGFyZW50ID0gZmFsc2U7XG5cbiAgICAgIGlmIChzZWxlY3Rvcikge1xuICAgICAgICBwYXJlbnQgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKHNlbGVjdG9yKTtcbiAgICAgIH1cblxuICAgICAgaWYgKCFwYXJlbnQpIHtcbiAgICAgICAgcGFyZW50ID0gJChlbGVtZW50KS5jbG9zZXN0KFwiLlwiICsgQ2xhc3NOYW1lLkFMRVJUKVswXTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHBhcmVudDtcbiAgICB9O1xuXG4gICAgX3Byb3RvLl90cmlnZ2VyQ2xvc2VFdmVudCA9IGZ1bmN0aW9uIF90cmlnZ2VyQ2xvc2VFdmVudChlbGVtZW50KSB7XG4gICAgICB2YXIgY2xvc2VFdmVudCA9ICQuRXZlbnQoRXZlbnQuQ0xPU0UpO1xuICAgICAgJChlbGVtZW50KS50cmlnZ2VyKGNsb3NlRXZlbnQpO1xuICAgICAgcmV0dXJuIGNsb3NlRXZlbnQ7XG4gICAgfTtcblxuICAgIF9wcm90by5fcmVtb3ZlRWxlbWVudCA9IGZ1bmN0aW9uIF9yZW1vdmVFbGVtZW50KGVsZW1lbnQpIHtcbiAgICAgIHZhciBfdGhpcyA9IHRoaXM7XG5cbiAgICAgICQoZWxlbWVudCkucmVtb3ZlQ2xhc3MoQ2xhc3NOYW1lLlNIT1cpO1xuXG4gICAgICBpZiAoISQoZWxlbWVudCkuaGFzQ2xhc3MoQ2xhc3NOYW1lLkZBREUpKSB7XG4gICAgICAgIHRoaXMuX2Rlc3Ryb3lFbGVtZW50KGVsZW1lbnQpO1xuXG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgdmFyIHRyYW5zaXRpb25EdXJhdGlvbiA9IFV0aWwuZ2V0VHJhbnNpdGlvbkR1cmF0aW9uRnJvbUVsZW1lbnQoZWxlbWVudCk7XG4gICAgICAkKGVsZW1lbnQpLm9uZShVdGlsLlRSQU5TSVRJT05fRU5ELCBmdW5jdGlvbiAoZXZlbnQpIHtcbiAgICAgICAgcmV0dXJuIF90aGlzLl9kZXN0cm95RWxlbWVudChlbGVtZW50LCBldmVudCk7XG4gICAgICB9KS5lbXVsYXRlVHJhbnNpdGlvbkVuZCh0cmFuc2l0aW9uRHVyYXRpb24pO1xuICAgIH07XG5cbiAgICBfcHJvdG8uX2Rlc3Ryb3lFbGVtZW50ID0gZnVuY3Rpb24gX2Rlc3Ryb3lFbGVtZW50KGVsZW1lbnQpIHtcbiAgICAgICQoZWxlbWVudCkuZGV0YWNoKCkudHJpZ2dlcihFdmVudC5DTE9TRUQpLnJlbW92ZSgpO1xuICAgIH07IC8vIFN0YXRpY1xuXG5cbiAgICBBbGVydC5falF1ZXJ5SW50ZXJmYWNlID0gZnVuY3Rpb24gX2pRdWVyeUludGVyZmFjZShjb25maWcpIHtcbiAgICAgIHJldHVybiB0aGlzLmVhY2goZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgJGVsZW1lbnQgPSAkKHRoaXMpO1xuICAgICAgICB2YXIgZGF0YSA9ICRlbGVtZW50LmRhdGEoREFUQV9LRVkpO1xuXG4gICAgICAgIGlmICghZGF0YSkge1xuICAgICAgICAgIGRhdGEgPSBuZXcgQWxlcnQodGhpcyk7XG4gICAgICAgICAgJGVsZW1lbnQuZGF0YShEQVRBX0tFWSwgZGF0YSk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoY29uZmlnID09PSAnY2xvc2UnKSB7XG4gICAgICAgICAgZGF0YVtjb25maWddKHRoaXMpO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9O1xuXG4gICAgQWxlcnQuX2hhbmRsZURpc21pc3MgPSBmdW5jdGlvbiBfaGFuZGxlRGlzbWlzcyhhbGVydEluc3RhbmNlKSB7XG4gICAgICByZXR1cm4gZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgICAgIGlmIChldmVudCkge1xuICAgICAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgIH1cblxuICAgICAgICBhbGVydEluc3RhbmNlLmNsb3NlKHRoaXMpO1xuICAgICAgfTtcbiAgICB9O1xuXG4gICAgX2NyZWF0ZUNsYXNzKEFsZXJ0LCBudWxsLCBbe1xuICAgICAga2V5OiBcIlZFUlNJT05cIixcbiAgICAgIGdldDogZnVuY3Rpb24gZ2V0KCkge1xuICAgICAgICByZXR1cm4gVkVSU0lPTjtcbiAgICAgIH1cbiAgICB9XSk7XG5cbiAgICByZXR1cm4gQWxlcnQ7XG4gIH0oKTtcbiAgLyoqXG4gICAqIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgKiBEYXRhIEFwaSBpbXBsZW1lbnRhdGlvblxuICAgKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICovXG5cblxuICAkKGRvY3VtZW50KS5vbihFdmVudC5DTElDS19EQVRBX0FQSSwgU2VsZWN0b3IuRElTTUlTUywgQWxlcnQuX2hhbmRsZURpc21pc3MobmV3IEFsZXJ0KCkpKTtcbiAgLyoqXG4gICAqIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgKiBqUXVlcnlcbiAgICogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAqL1xuXG4gICQuZm5bTkFNRV0gPSBBbGVydC5falF1ZXJ5SW50ZXJmYWNlO1xuICAkLmZuW05BTUVdLkNvbnN0cnVjdG9yID0gQWxlcnQ7XG5cbiAgJC5mbltOQU1FXS5ub0NvbmZsaWN0ID0gZnVuY3Rpb24gKCkge1xuICAgICQuZm5bTkFNRV0gPSBKUVVFUllfTk9fQ09ORkxJQ1Q7XG4gICAgcmV0dXJuIEFsZXJ0Ll9qUXVlcnlJbnRlcmZhY2U7XG4gIH07XG5cbiAgLyoqXG4gICAqIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgKiBDb25zdGFudHNcbiAgICogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAqL1xuXG4gIHZhciBOQU1FJDEgPSAnYnV0dG9uJztcbiAgdmFyIFZFUlNJT04kMSA9ICc0LjIuMSc7XG4gIHZhciBEQVRBX0tFWSQxID0gJ2JzLmJ1dHRvbic7XG4gIHZhciBFVkVOVF9LRVkkMSA9IFwiLlwiICsgREFUQV9LRVkkMTtcbiAgdmFyIERBVEFfQVBJX0tFWSQxID0gJy5kYXRhLWFwaSc7XG4gIHZhciBKUVVFUllfTk9fQ09ORkxJQ1QkMSA9ICQuZm5bTkFNRSQxXTtcbiAgdmFyIENsYXNzTmFtZSQxID0ge1xuICAgIEFDVElWRTogJ2FjdGl2ZScsXG4gICAgQlVUVE9OOiAnYnRuJyxcbiAgICBGT0NVUzogJ2ZvY3VzJ1xuICB9O1xuICB2YXIgU2VsZWN0b3IkMSA9IHtcbiAgICBEQVRBX1RPR0dMRV9DQVJST1Q6ICdbZGF0YS10b2dnbGVePVwiYnV0dG9uXCJdJyxcbiAgICBEQVRBX1RPR0dMRTogJ1tkYXRhLXRvZ2dsZT1cImJ1dHRvbnNcIl0nLFxuICAgIElOUFVUOiAnaW5wdXQ6bm90KFt0eXBlPVwiaGlkZGVuXCJdKScsXG4gICAgQUNUSVZFOiAnLmFjdGl2ZScsXG4gICAgQlVUVE9OOiAnLmJ0bidcbiAgfTtcbiAgdmFyIEV2ZW50JDEgPSB7XG4gICAgQ0xJQ0tfREFUQV9BUEk6IFwiY2xpY2tcIiArIEVWRU5UX0tFWSQxICsgREFUQV9BUElfS0VZJDEsXG4gICAgRk9DVVNfQkxVUl9EQVRBX0FQSTogXCJmb2N1c1wiICsgRVZFTlRfS0VZJDEgKyBEQVRBX0FQSV9LRVkkMSArIFwiIFwiICsgKFwiYmx1clwiICsgRVZFTlRfS0VZJDEgKyBEQVRBX0FQSV9LRVkkMSlcbiAgICAvKipcbiAgICAgKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICAgKiBDbGFzcyBEZWZpbml0aW9uXG4gICAgICogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAgICovXG5cbiAgfTtcblxuICB2YXIgQnV0dG9uID1cbiAgLyojX19QVVJFX18qL1xuICBmdW5jdGlvbiAoKSB7XG4gICAgZnVuY3Rpb24gQnV0dG9uKGVsZW1lbnQpIHtcbiAgICAgIHRoaXMuX2VsZW1lbnQgPSBlbGVtZW50O1xuICAgIH0gLy8gR2V0dGVyc1xuXG5cbiAgICB2YXIgX3Byb3RvID0gQnV0dG9uLnByb3RvdHlwZTtcblxuICAgIC8vIFB1YmxpY1xuICAgIF9wcm90by50b2dnbGUgPSBmdW5jdGlvbiB0b2dnbGUoKSB7XG4gICAgICB2YXIgdHJpZ2dlckNoYW5nZUV2ZW50ID0gdHJ1ZTtcbiAgICAgIHZhciBhZGRBcmlhUHJlc3NlZCA9IHRydWU7XG4gICAgICB2YXIgcm9vdEVsZW1lbnQgPSAkKHRoaXMuX2VsZW1lbnQpLmNsb3Nlc3QoU2VsZWN0b3IkMS5EQVRBX1RPR0dMRSlbMF07XG5cbiAgICAgIGlmIChyb290RWxlbWVudCkge1xuICAgICAgICB2YXIgaW5wdXQgPSB0aGlzLl9lbGVtZW50LnF1ZXJ5U2VsZWN0b3IoU2VsZWN0b3IkMS5JTlBVVCk7XG5cbiAgICAgICAgaWYgKGlucHV0KSB7XG4gICAgICAgICAgaWYgKGlucHV0LnR5cGUgPT09ICdyYWRpbycpIHtcbiAgICAgICAgICAgIGlmIChpbnB1dC5jaGVja2VkICYmIHRoaXMuX2VsZW1lbnQuY2xhc3NMaXN0LmNvbnRhaW5zKENsYXNzTmFtZSQxLkFDVElWRSkpIHtcbiAgICAgICAgICAgICAgdHJpZ2dlckNoYW5nZUV2ZW50ID0gZmFsc2U7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICB2YXIgYWN0aXZlRWxlbWVudCA9IHJvb3RFbGVtZW50LnF1ZXJ5U2VsZWN0b3IoU2VsZWN0b3IkMS5BQ1RJVkUpO1xuXG4gICAgICAgICAgICAgIGlmIChhY3RpdmVFbGVtZW50KSB7XG4gICAgICAgICAgICAgICAgJChhY3RpdmVFbGVtZW50KS5yZW1vdmVDbGFzcyhDbGFzc05hbWUkMS5BQ1RJVkUpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgaWYgKHRyaWdnZXJDaGFuZ2VFdmVudCkge1xuICAgICAgICAgICAgaWYgKGlucHV0Lmhhc0F0dHJpYnV0ZSgnZGlzYWJsZWQnKSB8fCByb290RWxlbWVudC5oYXNBdHRyaWJ1dGUoJ2Rpc2FibGVkJykgfHwgaW5wdXQuY2xhc3NMaXN0LmNvbnRhaW5zKCdkaXNhYmxlZCcpIHx8IHJvb3RFbGVtZW50LmNsYXNzTGlzdC5jb250YWlucygnZGlzYWJsZWQnKSkge1xuICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlucHV0LmNoZWNrZWQgPSAhdGhpcy5fZWxlbWVudC5jbGFzc0xpc3QuY29udGFpbnMoQ2xhc3NOYW1lJDEuQUNUSVZFKTtcbiAgICAgICAgICAgICQoaW5wdXQpLnRyaWdnZXIoJ2NoYW5nZScpO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIGlucHV0LmZvY3VzKCk7XG4gICAgICAgICAgYWRkQXJpYVByZXNzZWQgPSBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICBpZiAoYWRkQXJpYVByZXNzZWQpIHtcbiAgICAgICAgdGhpcy5fZWxlbWVudC5zZXRBdHRyaWJ1dGUoJ2FyaWEtcHJlc3NlZCcsICF0aGlzLl9lbGVtZW50LmNsYXNzTGlzdC5jb250YWlucyhDbGFzc05hbWUkMS5BQ1RJVkUpKTtcbiAgICAgIH1cblxuICAgICAgaWYgKHRyaWdnZXJDaGFuZ2VFdmVudCkge1xuICAgICAgICAkKHRoaXMuX2VsZW1lbnQpLnRvZ2dsZUNsYXNzKENsYXNzTmFtZSQxLkFDVElWRSk7XG4gICAgICB9XG4gICAgfTtcblxuICAgIF9wcm90by5kaXNwb3NlID0gZnVuY3Rpb24gZGlzcG9zZSgpIHtcbiAgICAgICQucmVtb3ZlRGF0YSh0aGlzLl9lbGVtZW50LCBEQVRBX0tFWSQxKTtcbiAgICAgIHRoaXMuX2VsZW1lbnQgPSBudWxsO1xuICAgIH07IC8vIFN0YXRpY1xuXG5cbiAgICBCdXR0b24uX2pRdWVyeUludGVyZmFjZSA9IGZ1bmN0aW9uIF9qUXVlcnlJbnRlcmZhY2UoY29uZmlnKSB7XG4gICAgICByZXR1cm4gdGhpcy5lYWNoKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIGRhdGEgPSAkKHRoaXMpLmRhdGEoREFUQV9LRVkkMSk7XG5cbiAgICAgICAgaWYgKCFkYXRhKSB7XG4gICAgICAgICAgZGF0YSA9IG5ldyBCdXR0b24odGhpcyk7XG4gICAgICAgICAgJCh0aGlzKS5kYXRhKERBVEFfS0VZJDEsIGRhdGEpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGNvbmZpZyA9PT0gJ3RvZ2dsZScpIHtcbiAgICAgICAgICBkYXRhW2NvbmZpZ10oKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfTtcblxuICAgIF9jcmVhdGVDbGFzcyhCdXR0b24sIG51bGwsIFt7XG4gICAgICBrZXk6IFwiVkVSU0lPTlwiLFxuICAgICAgZ2V0OiBmdW5jdGlvbiBnZXQoKSB7XG4gICAgICAgIHJldHVybiBWRVJTSU9OJDE7XG4gICAgICB9XG4gICAgfV0pO1xuXG4gICAgcmV0dXJuIEJ1dHRvbjtcbiAgfSgpO1xuICAvKipcbiAgICogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAqIERhdGEgQXBpIGltcGxlbWVudGF0aW9uXG4gICAqIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgKi9cblxuXG4gICQoZG9jdW1lbnQpLm9uKEV2ZW50JDEuQ0xJQ0tfREFUQV9BUEksIFNlbGVjdG9yJDEuREFUQV9UT0dHTEVfQ0FSUk9ULCBmdW5jdGlvbiAoZXZlbnQpIHtcbiAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgIHZhciBidXR0b24gPSBldmVudC50YXJnZXQ7XG5cbiAgICBpZiAoISQoYnV0dG9uKS5oYXNDbGFzcyhDbGFzc05hbWUkMS5CVVRUT04pKSB7XG4gICAgICBidXR0b24gPSAkKGJ1dHRvbikuY2xvc2VzdChTZWxlY3RvciQxLkJVVFRPTik7XG4gICAgfVxuXG4gICAgQnV0dG9uLl9qUXVlcnlJbnRlcmZhY2UuY2FsbCgkKGJ1dHRvbiksICd0b2dnbGUnKTtcbiAgfSkub24oRXZlbnQkMS5GT0NVU19CTFVSX0RBVEFfQVBJLCBTZWxlY3RvciQxLkRBVEFfVE9HR0xFX0NBUlJPVCwgZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgdmFyIGJ1dHRvbiA9ICQoZXZlbnQudGFyZ2V0KS5jbG9zZXN0KFNlbGVjdG9yJDEuQlVUVE9OKVswXTtcbiAgICAkKGJ1dHRvbikudG9nZ2xlQ2xhc3MoQ2xhc3NOYW1lJDEuRk9DVVMsIC9eZm9jdXMoaW4pPyQvLnRlc3QoZXZlbnQudHlwZSkpO1xuICB9KTtcbiAgLyoqXG4gICAqIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgKiBqUXVlcnlcbiAgICogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAqL1xuXG4gICQuZm5bTkFNRSQxXSA9IEJ1dHRvbi5falF1ZXJ5SW50ZXJmYWNlO1xuICAkLmZuW05BTUUkMV0uQ29uc3RydWN0b3IgPSBCdXR0b247XG5cbiAgJC5mbltOQU1FJDFdLm5vQ29uZmxpY3QgPSBmdW5jdGlvbiAoKSB7XG4gICAgJC5mbltOQU1FJDFdID0gSlFVRVJZX05PX0NPTkZMSUNUJDE7XG4gICAgcmV0dXJuIEJ1dHRvbi5falF1ZXJ5SW50ZXJmYWNlO1xuICB9O1xuXG4gIC8qKlxuICAgKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICogQ29uc3RhbnRzXG4gICAqIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgKi9cblxuICB2YXIgTkFNRSQyID0gJ2Nhcm91c2VsJztcbiAgdmFyIFZFUlNJT04kMiA9ICc0LjIuMSc7XG4gIHZhciBEQVRBX0tFWSQyID0gJ2JzLmNhcm91c2VsJztcbiAgdmFyIEVWRU5UX0tFWSQyID0gXCIuXCIgKyBEQVRBX0tFWSQyO1xuICB2YXIgREFUQV9BUElfS0VZJDIgPSAnLmRhdGEtYXBpJztcbiAgdmFyIEpRVUVSWV9OT19DT05GTElDVCQyID0gJC5mbltOQU1FJDJdO1xuICB2YXIgQVJST1dfTEVGVF9LRVlDT0RFID0gMzc7IC8vIEtleWJvYXJkRXZlbnQud2hpY2ggdmFsdWUgZm9yIGxlZnQgYXJyb3cga2V5XG5cbiAgdmFyIEFSUk9XX1JJR0hUX0tFWUNPREUgPSAzOTsgLy8gS2V5Ym9hcmRFdmVudC53aGljaCB2YWx1ZSBmb3IgcmlnaHQgYXJyb3cga2V5XG5cbiAgdmFyIFRPVUNIRVZFTlRfQ09NUEFUX1dBSVQgPSA1MDA7IC8vIFRpbWUgZm9yIG1vdXNlIGNvbXBhdCBldmVudHMgdG8gZmlyZSBhZnRlciB0b3VjaFxuXG4gIHZhciBTV0lQRV9USFJFU0hPTEQgPSA0MDtcbiAgdmFyIERlZmF1bHQgPSB7XG4gICAgaW50ZXJ2YWw6IDUwMDAsXG4gICAga2V5Ym9hcmQ6IHRydWUsXG4gICAgc2xpZGU6IGZhbHNlLFxuICAgIHBhdXNlOiAnaG92ZXInLFxuICAgIHdyYXA6IHRydWUsXG4gICAgdG91Y2g6IHRydWVcbiAgfTtcbiAgdmFyIERlZmF1bHRUeXBlID0ge1xuICAgIGludGVydmFsOiAnKG51bWJlcnxib29sZWFuKScsXG4gICAga2V5Ym9hcmQ6ICdib29sZWFuJyxcbiAgICBzbGlkZTogJyhib29sZWFufHN0cmluZyknLFxuICAgIHBhdXNlOiAnKHN0cmluZ3xib29sZWFuKScsXG4gICAgd3JhcDogJ2Jvb2xlYW4nLFxuICAgIHRvdWNoOiAnYm9vbGVhbidcbiAgfTtcbiAgdmFyIERpcmVjdGlvbiA9IHtcbiAgICBORVhUOiAnbmV4dCcsXG4gICAgUFJFVjogJ3ByZXYnLFxuICAgIExFRlQ6ICdsZWZ0JyxcbiAgICBSSUdIVDogJ3JpZ2h0J1xuICB9O1xuICB2YXIgRXZlbnQkMiA9IHtcbiAgICBTTElERTogXCJzbGlkZVwiICsgRVZFTlRfS0VZJDIsXG4gICAgU0xJRDogXCJzbGlkXCIgKyBFVkVOVF9LRVkkMixcbiAgICBLRVlET1dOOiBcImtleWRvd25cIiArIEVWRU5UX0tFWSQyLFxuICAgIE1PVVNFRU5URVI6IFwibW91c2VlbnRlclwiICsgRVZFTlRfS0VZJDIsXG4gICAgTU9VU0VMRUFWRTogXCJtb3VzZWxlYXZlXCIgKyBFVkVOVF9LRVkkMixcbiAgICBUT1VDSFNUQVJUOiBcInRvdWNoc3RhcnRcIiArIEVWRU5UX0tFWSQyLFxuICAgIFRPVUNITU9WRTogXCJ0b3VjaG1vdmVcIiArIEVWRU5UX0tFWSQyLFxuICAgIFRPVUNIRU5EOiBcInRvdWNoZW5kXCIgKyBFVkVOVF9LRVkkMixcbiAgICBQT0lOVEVSRE9XTjogXCJwb2ludGVyZG93blwiICsgRVZFTlRfS0VZJDIsXG4gICAgUE9JTlRFUlVQOiBcInBvaW50ZXJ1cFwiICsgRVZFTlRfS0VZJDIsXG4gICAgRFJBR19TVEFSVDogXCJkcmFnc3RhcnRcIiArIEVWRU5UX0tFWSQyLFxuICAgIExPQURfREFUQV9BUEk6IFwibG9hZFwiICsgRVZFTlRfS0VZJDIgKyBEQVRBX0FQSV9LRVkkMixcbiAgICBDTElDS19EQVRBX0FQSTogXCJjbGlja1wiICsgRVZFTlRfS0VZJDIgKyBEQVRBX0FQSV9LRVkkMlxuICB9O1xuICB2YXIgQ2xhc3NOYW1lJDIgPSB7XG4gICAgQ0FST1VTRUw6ICdjYXJvdXNlbCcsXG4gICAgQUNUSVZFOiAnYWN0aXZlJyxcbiAgICBTTElERTogJ3NsaWRlJyxcbiAgICBSSUdIVDogJ2Nhcm91c2VsLWl0ZW0tcmlnaHQnLFxuICAgIExFRlQ6ICdjYXJvdXNlbC1pdGVtLWxlZnQnLFxuICAgIE5FWFQ6ICdjYXJvdXNlbC1pdGVtLW5leHQnLFxuICAgIFBSRVY6ICdjYXJvdXNlbC1pdGVtLXByZXYnLFxuICAgIElURU06ICdjYXJvdXNlbC1pdGVtJyxcbiAgICBQT0lOVEVSX0VWRU5UOiAncG9pbnRlci1ldmVudCdcbiAgfTtcbiAgdmFyIFNlbGVjdG9yJDIgPSB7XG4gICAgQUNUSVZFOiAnLmFjdGl2ZScsXG4gICAgQUNUSVZFX0lURU06ICcuYWN0aXZlLmNhcm91c2VsLWl0ZW0nLFxuICAgIElURU06ICcuY2Fyb3VzZWwtaXRlbScsXG4gICAgSVRFTV9JTUc6ICcuY2Fyb3VzZWwtaXRlbSBpbWcnLFxuICAgIE5FWFRfUFJFVjogJy5jYXJvdXNlbC1pdGVtLW5leHQsIC5jYXJvdXNlbC1pdGVtLXByZXYnLFxuICAgIElORElDQVRPUlM6ICcuY2Fyb3VzZWwtaW5kaWNhdG9ycycsXG4gICAgREFUQV9TTElERTogJ1tkYXRhLXNsaWRlXSwgW2RhdGEtc2xpZGUtdG9dJyxcbiAgICBEQVRBX1JJREU6ICdbZGF0YS1yaWRlPVwiY2Fyb3VzZWxcIl0nXG4gIH07XG4gIHZhciBQb2ludGVyVHlwZSA9IHtcbiAgICBUT1VDSDogJ3RvdWNoJyxcbiAgICBQRU46ICdwZW4nXG4gICAgLyoqXG4gICAgICogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAgICogQ2xhc3MgRGVmaW5pdGlvblxuICAgICAqIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgICAqL1xuXG4gIH07XG5cbiAgdmFyIENhcm91c2VsID1cbiAgLyojX19QVVJFX18qL1xuICBmdW5jdGlvbiAoKSB7XG4gICAgZnVuY3Rpb24gQ2Fyb3VzZWwoZWxlbWVudCwgY29uZmlnKSB7XG4gICAgICB0aGlzLl9pdGVtcyA9IG51bGw7XG4gICAgICB0aGlzLl9pbnRlcnZhbCA9IG51bGw7XG4gICAgICB0aGlzLl9hY3RpdmVFbGVtZW50ID0gbnVsbDtcbiAgICAgIHRoaXMuX2lzUGF1c2VkID0gZmFsc2U7XG4gICAgICB0aGlzLl9pc1NsaWRpbmcgPSBmYWxzZTtcbiAgICAgIHRoaXMudG91Y2hUaW1lb3V0ID0gbnVsbDtcbiAgICAgIHRoaXMudG91Y2hTdGFydFggPSAwO1xuICAgICAgdGhpcy50b3VjaERlbHRhWCA9IDA7XG4gICAgICB0aGlzLl9jb25maWcgPSB0aGlzLl9nZXRDb25maWcoY29uZmlnKTtcbiAgICAgIHRoaXMuX2VsZW1lbnQgPSBlbGVtZW50O1xuICAgICAgdGhpcy5faW5kaWNhdG9yc0VsZW1lbnQgPSB0aGlzLl9lbGVtZW50LnF1ZXJ5U2VsZWN0b3IoU2VsZWN0b3IkMi5JTkRJQ0FUT1JTKTtcbiAgICAgIHRoaXMuX3RvdWNoU3VwcG9ydGVkID0gJ29udG91Y2hzdGFydCcgaW4gZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50IHx8IG5hdmlnYXRvci5tYXhUb3VjaFBvaW50cyA+IDA7XG4gICAgICB0aGlzLl9wb2ludGVyRXZlbnQgPSBCb29sZWFuKHdpbmRvdy5Qb2ludGVyRXZlbnQgfHwgd2luZG93Lk1TUG9pbnRlckV2ZW50KTtcblxuICAgICAgdGhpcy5fYWRkRXZlbnRMaXN0ZW5lcnMoKTtcbiAgICB9IC8vIEdldHRlcnNcblxuXG4gICAgdmFyIF9wcm90byA9IENhcm91c2VsLnByb3RvdHlwZTtcblxuICAgIC8vIFB1YmxpY1xuICAgIF9wcm90by5uZXh0ID0gZnVuY3Rpb24gbmV4dCgpIHtcbiAgICAgIGlmICghdGhpcy5faXNTbGlkaW5nKSB7XG4gICAgICAgIHRoaXMuX3NsaWRlKERpcmVjdGlvbi5ORVhUKTtcbiAgICAgIH1cbiAgICB9O1xuXG4gICAgX3Byb3RvLm5leHRXaGVuVmlzaWJsZSA9IGZ1bmN0aW9uIG5leHRXaGVuVmlzaWJsZSgpIHtcbiAgICAgIC8vIERvbid0IGNhbGwgbmV4dCB3aGVuIHRoZSBwYWdlIGlzbid0IHZpc2libGVcbiAgICAgIC8vIG9yIHRoZSBjYXJvdXNlbCBvciBpdHMgcGFyZW50IGlzbid0IHZpc2libGVcbiAgICAgIGlmICghZG9jdW1lbnQuaGlkZGVuICYmICQodGhpcy5fZWxlbWVudCkuaXMoJzp2aXNpYmxlJykgJiYgJCh0aGlzLl9lbGVtZW50KS5jc3MoJ3Zpc2liaWxpdHknKSAhPT0gJ2hpZGRlbicpIHtcbiAgICAgICAgdGhpcy5uZXh0KCk7XG4gICAgICB9XG4gICAgfTtcblxuICAgIF9wcm90by5wcmV2ID0gZnVuY3Rpb24gcHJldigpIHtcbiAgICAgIGlmICghdGhpcy5faXNTbGlkaW5nKSB7XG4gICAgICAgIHRoaXMuX3NsaWRlKERpcmVjdGlvbi5QUkVWKTtcbiAgICAgIH1cbiAgICB9O1xuXG4gICAgX3Byb3RvLnBhdXNlID0gZnVuY3Rpb24gcGF1c2UoZXZlbnQpIHtcbiAgICAgIGlmICghZXZlbnQpIHtcbiAgICAgICAgdGhpcy5faXNQYXVzZWQgPSB0cnVlO1xuICAgICAgfVxuXG4gICAgICBpZiAodGhpcy5fZWxlbWVudC5xdWVyeVNlbGVjdG9yKFNlbGVjdG9yJDIuTkVYVF9QUkVWKSkge1xuICAgICAgICBVdGlsLnRyaWdnZXJUcmFuc2l0aW9uRW5kKHRoaXMuX2VsZW1lbnQpO1xuICAgICAgICB0aGlzLmN5Y2xlKHRydWUpO1xuICAgICAgfVxuXG4gICAgICBjbGVhckludGVydmFsKHRoaXMuX2ludGVydmFsKTtcbiAgICAgIHRoaXMuX2ludGVydmFsID0gbnVsbDtcbiAgICB9O1xuXG4gICAgX3Byb3RvLmN5Y2xlID0gZnVuY3Rpb24gY3ljbGUoZXZlbnQpIHtcbiAgICAgIGlmICghZXZlbnQpIHtcbiAgICAgICAgdGhpcy5faXNQYXVzZWQgPSBmYWxzZTtcbiAgICAgIH1cblxuICAgICAgaWYgKHRoaXMuX2ludGVydmFsKSB7XG4gICAgICAgIGNsZWFySW50ZXJ2YWwodGhpcy5faW50ZXJ2YWwpO1xuICAgICAgICB0aGlzLl9pbnRlcnZhbCA9IG51bGw7XG4gICAgICB9XG5cbiAgICAgIGlmICh0aGlzLl9jb25maWcuaW50ZXJ2YWwgJiYgIXRoaXMuX2lzUGF1c2VkKSB7XG4gICAgICAgIHRoaXMuX2ludGVydmFsID0gc2V0SW50ZXJ2YWwoKGRvY3VtZW50LnZpc2liaWxpdHlTdGF0ZSA/IHRoaXMubmV4dFdoZW5WaXNpYmxlIDogdGhpcy5uZXh0KS5iaW5kKHRoaXMpLCB0aGlzLl9jb25maWcuaW50ZXJ2YWwpO1xuICAgICAgfVxuICAgIH07XG5cbiAgICBfcHJvdG8udG8gPSBmdW5jdGlvbiB0byhpbmRleCkge1xuICAgICAgdmFyIF90aGlzID0gdGhpcztcblxuICAgICAgdGhpcy5fYWN0aXZlRWxlbWVudCA9IHRoaXMuX2VsZW1lbnQucXVlcnlTZWxlY3RvcihTZWxlY3RvciQyLkFDVElWRV9JVEVNKTtcblxuICAgICAgdmFyIGFjdGl2ZUluZGV4ID0gdGhpcy5fZ2V0SXRlbUluZGV4KHRoaXMuX2FjdGl2ZUVsZW1lbnQpO1xuXG4gICAgICBpZiAoaW5kZXggPiB0aGlzLl9pdGVtcy5sZW5ndGggLSAxIHx8IGluZGV4IDwgMCkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIGlmICh0aGlzLl9pc1NsaWRpbmcpIHtcbiAgICAgICAgJCh0aGlzLl9lbGVtZW50KS5vbmUoRXZlbnQkMi5TTElELCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgcmV0dXJuIF90aGlzLnRvKGluZGV4KTtcbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgaWYgKGFjdGl2ZUluZGV4ID09PSBpbmRleCkge1xuICAgICAgICB0aGlzLnBhdXNlKCk7XG4gICAgICAgIHRoaXMuY3ljbGUoKTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICB2YXIgZGlyZWN0aW9uID0gaW5kZXggPiBhY3RpdmVJbmRleCA/IERpcmVjdGlvbi5ORVhUIDogRGlyZWN0aW9uLlBSRVY7XG5cbiAgICAgIHRoaXMuX3NsaWRlKGRpcmVjdGlvbiwgdGhpcy5faXRlbXNbaW5kZXhdKTtcbiAgICB9O1xuXG4gICAgX3Byb3RvLmRpc3Bvc2UgPSBmdW5jdGlvbiBkaXNwb3NlKCkge1xuICAgICAgJCh0aGlzLl9lbGVtZW50KS5vZmYoRVZFTlRfS0VZJDIpO1xuICAgICAgJC5yZW1vdmVEYXRhKHRoaXMuX2VsZW1lbnQsIERBVEFfS0VZJDIpO1xuICAgICAgdGhpcy5faXRlbXMgPSBudWxsO1xuICAgICAgdGhpcy5fY29uZmlnID0gbnVsbDtcbiAgICAgIHRoaXMuX2VsZW1lbnQgPSBudWxsO1xuICAgICAgdGhpcy5faW50ZXJ2YWwgPSBudWxsO1xuICAgICAgdGhpcy5faXNQYXVzZWQgPSBudWxsO1xuICAgICAgdGhpcy5faXNTbGlkaW5nID0gbnVsbDtcbiAgICAgIHRoaXMuX2FjdGl2ZUVsZW1lbnQgPSBudWxsO1xuICAgICAgdGhpcy5faW5kaWNhdG9yc0VsZW1lbnQgPSBudWxsO1xuICAgIH07IC8vIFByaXZhdGVcblxuXG4gICAgX3Byb3RvLl9nZXRDb25maWcgPSBmdW5jdGlvbiBfZ2V0Q29uZmlnKGNvbmZpZykge1xuICAgICAgY29uZmlnID0gX29iamVjdFNwcmVhZCh7fSwgRGVmYXVsdCwgY29uZmlnKTtcbiAgICAgIFV0aWwudHlwZUNoZWNrQ29uZmlnKE5BTUUkMiwgY29uZmlnLCBEZWZhdWx0VHlwZSk7XG4gICAgICByZXR1cm4gY29uZmlnO1xuICAgIH07XG5cbiAgICBfcHJvdG8uX2hhbmRsZVN3aXBlID0gZnVuY3Rpb24gX2hhbmRsZVN3aXBlKCkge1xuICAgICAgdmFyIGFic0RlbHRheCA9IE1hdGguYWJzKHRoaXMudG91Y2hEZWx0YVgpO1xuXG4gICAgICBpZiAoYWJzRGVsdGF4IDw9IFNXSVBFX1RIUkVTSE9MRCkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIHZhciBkaXJlY3Rpb24gPSBhYnNEZWx0YXggLyB0aGlzLnRvdWNoRGVsdGFYOyAvLyBzd2lwZSBsZWZ0XG5cbiAgICAgIGlmIChkaXJlY3Rpb24gPiAwKSB7XG4gICAgICAgIHRoaXMucHJldigpO1xuICAgICAgfSAvLyBzd2lwZSByaWdodFxuXG5cbiAgICAgIGlmIChkaXJlY3Rpb24gPCAwKSB7XG4gICAgICAgIHRoaXMubmV4dCgpO1xuICAgICAgfVxuICAgIH07XG5cbiAgICBfcHJvdG8uX2FkZEV2ZW50TGlzdGVuZXJzID0gZnVuY3Rpb24gX2FkZEV2ZW50TGlzdGVuZXJzKCkge1xuICAgICAgdmFyIF90aGlzMiA9IHRoaXM7XG5cbiAgICAgIGlmICh0aGlzLl9jb25maWcua2V5Ym9hcmQpIHtcbiAgICAgICAgJCh0aGlzLl9lbGVtZW50KS5vbihFdmVudCQyLktFWURPV04sIGZ1bmN0aW9uIChldmVudCkge1xuICAgICAgICAgIHJldHVybiBfdGhpczIuX2tleWRvd24oZXZlbnQpO1xuICAgICAgICB9KTtcbiAgICAgIH1cblxuICAgICAgaWYgKHRoaXMuX2NvbmZpZy5wYXVzZSA9PT0gJ2hvdmVyJykge1xuICAgICAgICAkKHRoaXMuX2VsZW1lbnQpLm9uKEV2ZW50JDIuTU9VU0VFTlRFUiwgZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgICAgICAgcmV0dXJuIF90aGlzMi5wYXVzZShldmVudCk7XG4gICAgICAgIH0pLm9uKEV2ZW50JDIuTU9VU0VMRUFWRSwgZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgICAgICAgcmV0dXJuIF90aGlzMi5jeWNsZShldmVudCk7XG4gICAgICAgIH0pO1xuICAgICAgfVxuXG4gICAgICB0aGlzLl9hZGRUb3VjaEV2ZW50TGlzdGVuZXJzKCk7XG4gICAgfTtcblxuICAgIF9wcm90by5fYWRkVG91Y2hFdmVudExpc3RlbmVycyA9IGZ1bmN0aW9uIF9hZGRUb3VjaEV2ZW50TGlzdGVuZXJzKCkge1xuICAgICAgdmFyIF90aGlzMyA9IHRoaXM7XG5cbiAgICAgIGlmICghdGhpcy5fdG91Y2hTdXBwb3J0ZWQpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICB2YXIgc3RhcnQgPSBmdW5jdGlvbiBzdGFydChldmVudCkge1xuICAgICAgICBpZiAoX3RoaXMzLl9wb2ludGVyRXZlbnQgJiYgUG9pbnRlclR5cGVbZXZlbnQub3JpZ2luYWxFdmVudC5wb2ludGVyVHlwZS50b1VwcGVyQ2FzZSgpXSkge1xuICAgICAgICAgIF90aGlzMy50b3VjaFN0YXJ0WCA9IGV2ZW50Lm9yaWdpbmFsRXZlbnQuY2xpZW50WDtcbiAgICAgICAgfSBlbHNlIGlmICghX3RoaXMzLl9wb2ludGVyRXZlbnQpIHtcbiAgICAgICAgICBfdGhpczMudG91Y2hTdGFydFggPSBldmVudC5vcmlnaW5hbEV2ZW50LnRvdWNoZXNbMF0uY2xpZW50WDtcbiAgICAgICAgfVxuICAgICAgfTtcblxuICAgICAgdmFyIG1vdmUgPSBmdW5jdGlvbiBtb3ZlKGV2ZW50KSB7XG4gICAgICAgIC8vIGVuc3VyZSBzd2lwaW5nIHdpdGggb25lIHRvdWNoIGFuZCBub3QgcGluY2hpbmdcbiAgICAgICAgaWYgKGV2ZW50Lm9yaWdpbmFsRXZlbnQudG91Y2hlcyAmJiBldmVudC5vcmlnaW5hbEV2ZW50LnRvdWNoZXMubGVuZ3RoID4gMSkge1xuICAgICAgICAgIF90aGlzMy50b3VjaERlbHRhWCA9IDA7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgX3RoaXMzLnRvdWNoRGVsdGFYID0gZXZlbnQub3JpZ2luYWxFdmVudC50b3VjaGVzWzBdLmNsaWVudFggLSBfdGhpczMudG91Y2hTdGFydFg7XG4gICAgICAgIH1cbiAgICAgIH07XG5cbiAgICAgIHZhciBlbmQgPSBmdW5jdGlvbiBlbmQoZXZlbnQpIHtcbiAgICAgICAgaWYgKF90aGlzMy5fcG9pbnRlckV2ZW50ICYmIFBvaW50ZXJUeXBlW2V2ZW50Lm9yaWdpbmFsRXZlbnQucG9pbnRlclR5cGUudG9VcHBlckNhc2UoKV0pIHtcbiAgICAgICAgICBfdGhpczMudG91Y2hEZWx0YVggPSBldmVudC5vcmlnaW5hbEV2ZW50LmNsaWVudFggLSBfdGhpczMudG91Y2hTdGFydFg7XG4gICAgICAgIH1cblxuICAgICAgICBfdGhpczMuX2hhbmRsZVN3aXBlKCk7XG5cbiAgICAgICAgaWYgKF90aGlzMy5fY29uZmlnLnBhdXNlID09PSAnaG92ZXInKSB7XG4gICAgICAgICAgLy8gSWYgaXQncyBhIHRvdWNoLWVuYWJsZWQgZGV2aWNlLCBtb3VzZWVudGVyL2xlYXZlIGFyZSBmaXJlZCBhc1xuICAgICAgICAgIC8vIHBhcnQgb2YgdGhlIG1vdXNlIGNvbXBhdGliaWxpdHkgZXZlbnRzIG9uIGZpcnN0IHRhcCAtIHRoZSBjYXJvdXNlbFxuICAgICAgICAgIC8vIHdvdWxkIHN0b3AgY3ljbGluZyB1bnRpbCB1c2VyIHRhcHBlZCBvdXQgb2YgaXQ7XG4gICAgICAgICAgLy8gaGVyZSwgd2UgbGlzdGVuIGZvciB0b3VjaGVuZCwgZXhwbGljaXRseSBwYXVzZSB0aGUgY2Fyb3VzZWxcbiAgICAgICAgICAvLyAoYXMgaWYgaXQncyB0aGUgc2Vjb25kIHRpbWUgd2UgdGFwIG9uIGl0LCBtb3VzZWVudGVyIGNvbXBhdCBldmVudFxuICAgICAgICAgIC8vIGlzIE5PVCBmaXJlZCkgYW5kIGFmdGVyIGEgdGltZW91dCAodG8gYWxsb3cgZm9yIG1vdXNlIGNvbXBhdGliaWxpdHlcbiAgICAgICAgICAvLyBldmVudHMgdG8gZmlyZSkgd2UgZXhwbGljaXRseSByZXN0YXJ0IGN5Y2xpbmdcbiAgICAgICAgICBfdGhpczMucGF1c2UoKTtcblxuICAgICAgICAgIGlmIChfdGhpczMudG91Y2hUaW1lb3V0KSB7XG4gICAgICAgICAgICBjbGVhclRpbWVvdXQoX3RoaXMzLnRvdWNoVGltZW91dCk7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgX3RoaXMzLnRvdWNoVGltZW91dCA9IHNldFRpbWVvdXQoZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgICAgICAgICByZXR1cm4gX3RoaXMzLmN5Y2xlKGV2ZW50KTtcbiAgICAgICAgICB9LCBUT1VDSEVWRU5UX0NPTVBBVF9XQUlUICsgX3RoaXMzLl9jb25maWcuaW50ZXJ2YWwpO1xuICAgICAgICB9XG4gICAgICB9O1xuXG4gICAgICAkKHRoaXMuX2VsZW1lbnQucXVlcnlTZWxlY3RvckFsbChTZWxlY3RvciQyLklURU1fSU1HKSkub24oRXZlbnQkMi5EUkFHX1NUQVJULCBmdW5jdGlvbiAoZSkge1xuICAgICAgICByZXR1cm4gZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgfSk7XG5cbiAgICAgIGlmICh0aGlzLl9wb2ludGVyRXZlbnQpIHtcbiAgICAgICAgJCh0aGlzLl9lbGVtZW50KS5vbihFdmVudCQyLlBPSU5URVJET1dOLCBmdW5jdGlvbiAoZXZlbnQpIHtcbiAgICAgICAgICByZXR1cm4gc3RhcnQoZXZlbnQpO1xuICAgICAgICB9KTtcbiAgICAgICAgJCh0aGlzLl9lbGVtZW50KS5vbihFdmVudCQyLlBPSU5URVJVUCwgZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgICAgICAgcmV0dXJuIGVuZChldmVudCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHRoaXMuX2VsZW1lbnQuY2xhc3NMaXN0LmFkZChDbGFzc05hbWUkMi5QT0lOVEVSX0VWRU5UKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgICQodGhpcy5fZWxlbWVudCkub24oRXZlbnQkMi5UT1VDSFNUQVJULCBmdW5jdGlvbiAoZXZlbnQpIHtcbiAgICAgICAgICByZXR1cm4gc3RhcnQoZXZlbnQpO1xuICAgICAgICB9KTtcbiAgICAgICAgJCh0aGlzLl9lbGVtZW50KS5vbihFdmVudCQyLlRPVUNITU9WRSwgZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgICAgICAgcmV0dXJuIG1vdmUoZXZlbnQpO1xuICAgICAgICB9KTtcbiAgICAgICAgJCh0aGlzLl9lbGVtZW50KS5vbihFdmVudCQyLlRPVUNIRU5ELCBmdW5jdGlvbiAoZXZlbnQpIHtcbiAgICAgICAgICByZXR1cm4gZW5kKGV2ZW50KTtcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfTtcblxuICAgIF9wcm90by5fa2V5ZG93biA9IGZ1bmN0aW9uIF9rZXlkb3duKGV2ZW50KSB7XG4gICAgICBpZiAoL2lucHV0fHRleHRhcmVhL2kudGVzdChldmVudC50YXJnZXQudGFnTmFtZSkpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICBzd2l0Y2ggKGV2ZW50LndoaWNoKSB7XG4gICAgICAgIGNhc2UgQVJST1dfTEVGVF9LRVlDT0RFOlxuICAgICAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgdGhpcy5wcmV2KCk7XG4gICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgY2FzZSBBUlJPV19SSUdIVF9LRVlDT0RFOlxuICAgICAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgdGhpcy5uZXh0KCk7XG4gICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgZGVmYXVsdDpcbiAgICAgIH1cbiAgICB9O1xuXG4gICAgX3Byb3RvLl9nZXRJdGVtSW5kZXggPSBmdW5jdGlvbiBfZ2V0SXRlbUluZGV4KGVsZW1lbnQpIHtcbiAgICAgIHRoaXMuX2l0ZW1zID0gZWxlbWVudCAmJiBlbGVtZW50LnBhcmVudE5vZGUgPyBbXS5zbGljZS5jYWxsKGVsZW1lbnQucGFyZW50Tm9kZS5xdWVyeVNlbGVjdG9yQWxsKFNlbGVjdG9yJDIuSVRFTSkpIDogW107XG4gICAgICByZXR1cm4gdGhpcy5faXRlbXMuaW5kZXhPZihlbGVtZW50KTtcbiAgICB9O1xuXG4gICAgX3Byb3RvLl9nZXRJdGVtQnlEaXJlY3Rpb24gPSBmdW5jdGlvbiBfZ2V0SXRlbUJ5RGlyZWN0aW9uKGRpcmVjdGlvbiwgYWN0aXZlRWxlbWVudCkge1xuICAgICAgdmFyIGlzTmV4dERpcmVjdGlvbiA9IGRpcmVjdGlvbiA9PT0gRGlyZWN0aW9uLk5FWFQ7XG4gICAgICB2YXIgaXNQcmV2RGlyZWN0aW9uID0gZGlyZWN0aW9uID09PSBEaXJlY3Rpb24uUFJFVjtcblxuICAgICAgdmFyIGFjdGl2ZUluZGV4ID0gdGhpcy5fZ2V0SXRlbUluZGV4KGFjdGl2ZUVsZW1lbnQpO1xuXG4gICAgICB2YXIgbGFzdEl0ZW1JbmRleCA9IHRoaXMuX2l0ZW1zLmxlbmd0aCAtIDE7XG4gICAgICB2YXIgaXNHb2luZ1RvV3JhcCA9IGlzUHJldkRpcmVjdGlvbiAmJiBhY3RpdmVJbmRleCA9PT0gMCB8fCBpc05leHREaXJlY3Rpb24gJiYgYWN0aXZlSW5kZXggPT09IGxhc3RJdGVtSW5kZXg7XG5cbiAgICAgIGlmIChpc0dvaW5nVG9XcmFwICYmICF0aGlzLl9jb25maWcud3JhcCkge1xuICAgICAgICByZXR1cm4gYWN0aXZlRWxlbWVudDtcbiAgICAgIH1cblxuICAgICAgdmFyIGRlbHRhID0gZGlyZWN0aW9uID09PSBEaXJlY3Rpb24uUFJFViA/IC0xIDogMTtcbiAgICAgIHZhciBpdGVtSW5kZXggPSAoYWN0aXZlSW5kZXggKyBkZWx0YSkgJSB0aGlzLl9pdGVtcy5sZW5ndGg7XG4gICAgICByZXR1cm4gaXRlbUluZGV4ID09PSAtMSA/IHRoaXMuX2l0ZW1zW3RoaXMuX2l0ZW1zLmxlbmd0aCAtIDFdIDogdGhpcy5faXRlbXNbaXRlbUluZGV4XTtcbiAgICB9O1xuXG4gICAgX3Byb3RvLl90cmlnZ2VyU2xpZGVFdmVudCA9IGZ1bmN0aW9uIF90cmlnZ2VyU2xpZGVFdmVudChyZWxhdGVkVGFyZ2V0LCBldmVudERpcmVjdGlvbk5hbWUpIHtcbiAgICAgIHZhciB0YXJnZXRJbmRleCA9IHRoaXMuX2dldEl0ZW1JbmRleChyZWxhdGVkVGFyZ2V0KTtcblxuICAgICAgdmFyIGZyb21JbmRleCA9IHRoaXMuX2dldEl0ZW1JbmRleCh0aGlzLl9lbGVtZW50LnF1ZXJ5U2VsZWN0b3IoU2VsZWN0b3IkMi5BQ1RJVkVfSVRFTSkpO1xuXG4gICAgICB2YXIgc2xpZGVFdmVudCA9ICQuRXZlbnQoRXZlbnQkMi5TTElERSwge1xuICAgICAgICByZWxhdGVkVGFyZ2V0OiByZWxhdGVkVGFyZ2V0LFxuICAgICAgICBkaXJlY3Rpb246IGV2ZW50RGlyZWN0aW9uTmFtZSxcbiAgICAgICAgZnJvbTogZnJvbUluZGV4LFxuICAgICAgICB0bzogdGFyZ2V0SW5kZXhcbiAgICAgIH0pO1xuICAgICAgJCh0aGlzLl9lbGVtZW50KS50cmlnZ2VyKHNsaWRlRXZlbnQpO1xuICAgICAgcmV0dXJuIHNsaWRlRXZlbnQ7XG4gICAgfTtcblxuICAgIF9wcm90by5fc2V0QWN0aXZlSW5kaWNhdG9yRWxlbWVudCA9IGZ1bmN0aW9uIF9zZXRBY3RpdmVJbmRpY2F0b3JFbGVtZW50KGVsZW1lbnQpIHtcbiAgICAgIGlmICh0aGlzLl9pbmRpY2F0b3JzRWxlbWVudCkge1xuICAgICAgICB2YXIgaW5kaWNhdG9ycyA9IFtdLnNsaWNlLmNhbGwodGhpcy5faW5kaWNhdG9yc0VsZW1lbnQucXVlcnlTZWxlY3RvckFsbChTZWxlY3RvciQyLkFDVElWRSkpO1xuICAgICAgICAkKGluZGljYXRvcnMpLnJlbW92ZUNsYXNzKENsYXNzTmFtZSQyLkFDVElWRSk7XG5cbiAgICAgICAgdmFyIG5leHRJbmRpY2F0b3IgPSB0aGlzLl9pbmRpY2F0b3JzRWxlbWVudC5jaGlsZHJlblt0aGlzLl9nZXRJdGVtSW5kZXgoZWxlbWVudCldO1xuXG4gICAgICAgIGlmIChuZXh0SW5kaWNhdG9yKSB7XG4gICAgICAgICAgJChuZXh0SW5kaWNhdG9yKS5hZGRDbGFzcyhDbGFzc05hbWUkMi5BQ1RJVkUpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfTtcblxuICAgIF9wcm90by5fc2xpZGUgPSBmdW5jdGlvbiBfc2xpZGUoZGlyZWN0aW9uLCBlbGVtZW50KSB7XG4gICAgICB2YXIgX3RoaXM0ID0gdGhpcztcblxuICAgICAgdmFyIGFjdGl2ZUVsZW1lbnQgPSB0aGlzLl9lbGVtZW50LnF1ZXJ5U2VsZWN0b3IoU2VsZWN0b3IkMi5BQ1RJVkVfSVRFTSk7XG5cbiAgICAgIHZhciBhY3RpdmVFbGVtZW50SW5kZXggPSB0aGlzLl9nZXRJdGVtSW5kZXgoYWN0aXZlRWxlbWVudCk7XG5cbiAgICAgIHZhciBuZXh0RWxlbWVudCA9IGVsZW1lbnQgfHwgYWN0aXZlRWxlbWVudCAmJiB0aGlzLl9nZXRJdGVtQnlEaXJlY3Rpb24oZGlyZWN0aW9uLCBhY3RpdmVFbGVtZW50KTtcblxuICAgICAgdmFyIG5leHRFbGVtZW50SW5kZXggPSB0aGlzLl9nZXRJdGVtSW5kZXgobmV4dEVsZW1lbnQpO1xuXG4gICAgICB2YXIgaXNDeWNsaW5nID0gQm9vbGVhbih0aGlzLl9pbnRlcnZhbCk7XG4gICAgICB2YXIgZGlyZWN0aW9uYWxDbGFzc05hbWU7XG4gICAgICB2YXIgb3JkZXJDbGFzc05hbWU7XG4gICAgICB2YXIgZXZlbnREaXJlY3Rpb25OYW1lO1xuXG4gICAgICBpZiAoZGlyZWN0aW9uID09PSBEaXJlY3Rpb24uTkVYVCkge1xuICAgICAgICBkaXJlY3Rpb25hbENsYXNzTmFtZSA9IENsYXNzTmFtZSQyLkxFRlQ7XG4gICAgICAgIG9yZGVyQ2xhc3NOYW1lID0gQ2xhc3NOYW1lJDIuTkVYVDtcbiAgICAgICAgZXZlbnREaXJlY3Rpb25OYW1lID0gRGlyZWN0aW9uLkxFRlQ7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBkaXJlY3Rpb25hbENsYXNzTmFtZSA9IENsYXNzTmFtZSQyLlJJR0hUO1xuICAgICAgICBvcmRlckNsYXNzTmFtZSA9IENsYXNzTmFtZSQyLlBSRVY7XG4gICAgICAgIGV2ZW50RGlyZWN0aW9uTmFtZSA9IERpcmVjdGlvbi5SSUdIVDtcbiAgICAgIH1cblxuICAgICAgaWYgKG5leHRFbGVtZW50ICYmICQobmV4dEVsZW1lbnQpLmhhc0NsYXNzKENsYXNzTmFtZSQyLkFDVElWRSkpIHtcbiAgICAgICAgdGhpcy5faXNTbGlkaW5nID0gZmFsc2U7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgdmFyIHNsaWRlRXZlbnQgPSB0aGlzLl90cmlnZ2VyU2xpZGVFdmVudChuZXh0RWxlbWVudCwgZXZlbnREaXJlY3Rpb25OYW1lKTtcblxuICAgICAgaWYgKHNsaWRlRXZlbnQuaXNEZWZhdWx0UHJldmVudGVkKCkpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICBpZiAoIWFjdGl2ZUVsZW1lbnQgfHwgIW5leHRFbGVtZW50KSB7XG4gICAgICAgIC8vIFNvbWUgd2VpcmRuZXNzIGlzIGhhcHBlbmluZywgc28gd2UgYmFpbFxuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIHRoaXMuX2lzU2xpZGluZyA9IHRydWU7XG5cbiAgICAgIGlmIChpc0N5Y2xpbmcpIHtcbiAgICAgICAgdGhpcy5wYXVzZSgpO1xuICAgICAgfVxuXG4gICAgICB0aGlzLl9zZXRBY3RpdmVJbmRpY2F0b3JFbGVtZW50KG5leHRFbGVtZW50KTtcblxuICAgICAgdmFyIHNsaWRFdmVudCA9ICQuRXZlbnQoRXZlbnQkMi5TTElELCB7XG4gICAgICAgIHJlbGF0ZWRUYXJnZXQ6IG5leHRFbGVtZW50LFxuICAgICAgICBkaXJlY3Rpb246IGV2ZW50RGlyZWN0aW9uTmFtZSxcbiAgICAgICAgZnJvbTogYWN0aXZlRWxlbWVudEluZGV4LFxuICAgICAgICB0bzogbmV4dEVsZW1lbnRJbmRleFxuICAgICAgfSk7XG5cbiAgICAgIGlmICgkKHRoaXMuX2VsZW1lbnQpLmhhc0NsYXNzKENsYXNzTmFtZSQyLlNMSURFKSkge1xuICAgICAgICAkKG5leHRFbGVtZW50KS5hZGRDbGFzcyhvcmRlckNsYXNzTmFtZSk7XG4gICAgICAgIFV0aWwucmVmbG93KG5leHRFbGVtZW50KTtcbiAgICAgICAgJChhY3RpdmVFbGVtZW50KS5hZGRDbGFzcyhkaXJlY3Rpb25hbENsYXNzTmFtZSk7XG4gICAgICAgICQobmV4dEVsZW1lbnQpLmFkZENsYXNzKGRpcmVjdGlvbmFsQ2xhc3NOYW1lKTtcbiAgICAgICAgdmFyIG5leHRFbGVtZW50SW50ZXJ2YWwgPSBwYXJzZUludChuZXh0RWxlbWVudC5nZXRBdHRyaWJ1dGUoJ2RhdGEtaW50ZXJ2YWwnKSwgMTApO1xuXG4gICAgICAgIGlmIChuZXh0RWxlbWVudEludGVydmFsKSB7XG4gICAgICAgICAgdGhpcy5fY29uZmlnLmRlZmF1bHRJbnRlcnZhbCA9IHRoaXMuX2NvbmZpZy5kZWZhdWx0SW50ZXJ2YWwgfHwgdGhpcy5fY29uZmlnLmludGVydmFsO1xuICAgICAgICAgIHRoaXMuX2NvbmZpZy5pbnRlcnZhbCA9IG5leHRFbGVtZW50SW50ZXJ2YWw7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgdGhpcy5fY29uZmlnLmludGVydmFsID0gdGhpcy5fY29uZmlnLmRlZmF1bHRJbnRlcnZhbCB8fCB0aGlzLl9jb25maWcuaW50ZXJ2YWw7XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgdHJhbnNpdGlvbkR1cmF0aW9uID0gVXRpbC5nZXRUcmFuc2l0aW9uRHVyYXRpb25Gcm9tRWxlbWVudChhY3RpdmVFbGVtZW50KTtcbiAgICAgICAgJChhY3RpdmVFbGVtZW50KS5vbmUoVXRpbC5UUkFOU0lUSU9OX0VORCwgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICQobmV4dEVsZW1lbnQpLnJlbW92ZUNsYXNzKGRpcmVjdGlvbmFsQ2xhc3NOYW1lICsgXCIgXCIgKyBvcmRlckNsYXNzTmFtZSkuYWRkQ2xhc3MoQ2xhc3NOYW1lJDIuQUNUSVZFKTtcbiAgICAgICAgICAkKGFjdGl2ZUVsZW1lbnQpLnJlbW92ZUNsYXNzKENsYXNzTmFtZSQyLkFDVElWRSArIFwiIFwiICsgb3JkZXJDbGFzc05hbWUgKyBcIiBcIiArIGRpcmVjdGlvbmFsQ2xhc3NOYW1lKTtcbiAgICAgICAgICBfdGhpczQuX2lzU2xpZGluZyA9IGZhbHNlO1xuICAgICAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuICQoX3RoaXM0Ll9lbGVtZW50KS50cmlnZ2VyKHNsaWRFdmVudCk7XG4gICAgICAgICAgfSwgMCk7XG4gICAgICAgIH0pLmVtdWxhdGVUcmFuc2l0aW9uRW5kKHRyYW5zaXRpb25EdXJhdGlvbik7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAkKGFjdGl2ZUVsZW1lbnQpLnJlbW92ZUNsYXNzKENsYXNzTmFtZSQyLkFDVElWRSk7XG4gICAgICAgICQobmV4dEVsZW1lbnQpLmFkZENsYXNzKENsYXNzTmFtZSQyLkFDVElWRSk7XG4gICAgICAgIHRoaXMuX2lzU2xpZGluZyA9IGZhbHNlO1xuICAgICAgICAkKHRoaXMuX2VsZW1lbnQpLnRyaWdnZXIoc2xpZEV2ZW50KTtcbiAgICAgIH1cblxuICAgICAgaWYgKGlzQ3ljbGluZykge1xuICAgICAgICB0aGlzLmN5Y2xlKCk7XG4gICAgICB9XG4gICAgfTsgLy8gU3RhdGljXG5cblxuICAgIENhcm91c2VsLl9qUXVlcnlJbnRlcmZhY2UgPSBmdW5jdGlvbiBfalF1ZXJ5SW50ZXJmYWNlKGNvbmZpZykge1xuICAgICAgcmV0dXJuIHRoaXMuZWFjaChmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBkYXRhID0gJCh0aGlzKS5kYXRhKERBVEFfS0VZJDIpO1xuXG4gICAgICAgIHZhciBfY29uZmlnID0gX29iamVjdFNwcmVhZCh7fSwgRGVmYXVsdCwgJCh0aGlzKS5kYXRhKCkpO1xuXG4gICAgICAgIGlmICh0eXBlb2YgY29uZmlnID09PSAnb2JqZWN0Jykge1xuICAgICAgICAgIF9jb25maWcgPSBfb2JqZWN0U3ByZWFkKHt9LCBfY29uZmlnLCBjb25maWcpO1xuICAgICAgICB9XG5cbiAgICAgICAgdmFyIGFjdGlvbiA9IHR5cGVvZiBjb25maWcgPT09ICdzdHJpbmcnID8gY29uZmlnIDogX2NvbmZpZy5zbGlkZTtcblxuICAgICAgICBpZiAoIWRhdGEpIHtcbiAgICAgICAgICBkYXRhID0gbmV3IENhcm91c2VsKHRoaXMsIF9jb25maWcpO1xuICAgICAgICAgICQodGhpcykuZGF0YShEQVRBX0tFWSQyLCBkYXRhKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh0eXBlb2YgY29uZmlnID09PSAnbnVtYmVyJykge1xuICAgICAgICAgIGRhdGEudG8oY29uZmlnKTtcbiAgICAgICAgfSBlbHNlIGlmICh0eXBlb2YgYWN0aW9uID09PSAnc3RyaW5nJykge1xuICAgICAgICAgIGlmICh0eXBlb2YgZGF0YVthY3Rpb25dID09PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihcIk5vIG1ldGhvZCBuYW1lZCBcXFwiXCIgKyBhY3Rpb24gKyBcIlxcXCJcIik7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgZGF0YVthY3Rpb25dKCk7XG4gICAgICAgIH0gZWxzZSBpZiAoX2NvbmZpZy5pbnRlcnZhbCkge1xuICAgICAgICAgIGRhdGEucGF1c2UoKTtcbiAgICAgICAgICBkYXRhLmN5Y2xlKCk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH07XG5cbiAgICBDYXJvdXNlbC5fZGF0YUFwaUNsaWNrSGFuZGxlciA9IGZ1bmN0aW9uIF9kYXRhQXBpQ2xpY2tIYW5kbGVyKGV2ZW50KSB7XG4gICAgICB2YXIgc2VsZWN0b3IgPSBVdGlsLmdldFNlbGVjdG9yRnJvbUVsZW1lbnQodGhpcyk7XG5cbiAgICAgIGlmICghc2VsZWN0b3IpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICB2YXIgdGFyZ2V0ID0gJChzZWxlY3RvcilbMF07XG5cbiAgICAgIGlmICghdGFyZ2V0IHx8ICEkKHRhcmdldCkuaGFzQ2xhc3MoQ2xhc3NOYW1lJDIuQ0FST1VTRUwpKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgdmFyIGNvbmZpZyA9IF9vYmplY3RTcHJlYWQoe30sICQodGFyZ2V0KS5kYXRhKCksICQodGhpcykuZGF0YSgpKTtcblxuICAgICAgdmFyIHNsaWRlSW5kZXggPSB0aGlzLmdldEF0dHJpYnV0ZSgnZGF0YS1zbGlkZS10bycpO1xuXG4gICAgICBpZiAoc2xpZGVJbmRleCkge1xuICAgICAgICBjb25maWcuaW50ZXJ2YWwgPSBmYWxzZTtcbiAgICAgIH1cblxuICAgICAgQ2Fyb3VzZWwuX2pRdWVyeUludGVyZmFjZS5jYWxsKCQodGFyZ2V0KSwgY29uZmlnKTtcblxuICAgICAgaWYgKHNsaWRlSW5kZXgpIHtcbiAgICAgICAgJCh0YXJnZXQpLmRhdGEoREFUQV9LRVkkMikudG8oc2xpZGVJbmRleCk7XG4gICAgICB9XG5cbiAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgfTtcblxuICAgIF9jcmVhdGVDbGFzcyhDYXJvdXNlbCwgbnVsbCwgW3tcbiAgICAgIGtleTogXCJWRVJTSU9OXCIsXG4gICAgICBnZXQ6IGZ1bmN0aW9uIGdldCgpIHtcbiAgICAgICAgcmV0dXJuIFZFUlNJT04kMjtcbiAgICAgIH1cbiAgICB9LCB7XG4gICAgICBrZXk6IFwiRGVmYXVsdFwiLFxuICAgICAgZ2V0OiBmdW5jdGlvbiBnZXQoKSB7XG4gICAgICAgIHJldHVybiBEZWZhdWx0O1xuICAgICAgfVxuICAgIH1dKTtcblxuICAgIHJldHVybiBDYXJvdXNlbDtcbiAgfSgpO1xuICAvKipcbiAgICogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAqIERhdGEgQXBpIGltcGxlbWVudGF0aW9uXG4gICAqIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgKi9cblxuXG4gICQoZG9jdW1lbnQpLm9uKEV2ZW50JDIuQ0xJQ0tfREFUQV9BUEksIFNlbGVjdG9yJDIuREFUQV9TTElERSwgQ2Fyb3VzZWwuX2RhdGFBcGlDbGlja0hhbmRsZXIpO1xuICAkKHdpbmRvdykub24oRXZlbnQkMi5MT0FEX0RBVEFfQVBJLCBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIGNhcm91c2VscyA9IFtdLnNsaWNlLmNhbGwoZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbChTZWxlY3RvciQyLkRBVEFfUklERSkpO1xuXG4gICAgZm9yICh2YXIgaSA9IDAsIGxlbiA9IGNhcm91c2Vscy5sZW5ndGg7IGkgPCBsZW47IGkrKykge1xuICAgICAgdmFyICRjYXJvdXNlbCA9ICQoY2Fyb3VzZWxzW2ldKTtcblxuICAgICAgQ2Fyb3VzZWwuX2pRdWVyeUludGVyZmFjZS5jYWxsKCRjYXJvdXNlbCwgJGNhcm91c2VsLmRhdGEoKSk7XG4gICAgfVxuICB9KTtcbiAgLyoqXG4gICAqIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgKiBqUXVlcnlcbiAgICogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAqL1xuXG4gICQuZm5bTkFNRSQyXSA9IENhcm91c2VsLl9qUXVlcnlJbnRlcmZhY2U7XG4gICQuZm5bTkFNRSQyXS5Db25zdHJ1Y3RvciA9IENhcm91c2VsO1xuXG4gICQuZm5bTkFNRSQyXS5ub0NvbmZsaWN0ID0gZnVuY3Rpb24gKCkge1xuICAgICQuZm5bTkFNRSQyXSA9IEpRVUVSWV9OT19DT05GTElDVCQyO1xuICAgIHJldHVybiBDYXJvdXNlbC5falF1ZXJ5SW50ZXJmYWNlO1xuICB9O1xuXG4gIC8qKlxuICAgKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICogQ29uc3RhbnRzXG4gICAqIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgKi9cblxuICB2YXIgTkFNRSQzID0gJ2NvbGxhcHNlJztcbiAgdmFyIFZFUlNJT04kMyA9ICc0LjIuMSc7XG4gIHZhciBEQVRBX0tFWSQzID0gJ2JzLmNvbGxhcHNlJztcbiAgdmFyIEVWRU5UX0tFWSQzID0gXCIuXCIgKyBEQVRBX0tFWSQzO1xuICB2YXIgREFUQV9BUElfS0VZJDMgPSAnLmRhdGEtYXBpJztcbiAgdmFyIEpRVUVSWV9OT19DT05GTElDVCQzID0gJC5mbltOQU1FJDNdO1xuICB2YXIgRGVmYXVsdCQxID0ge1xuICAgIHRvZ2dsZTogdHJ1ZSxcbiAgICBwYXJlbnQ6ICcnXG4gIH07XG4gIHZhciBEZWZhdWx0VHlwZSQxID0ge1xuICAgIHRvZ2dsZTogJ2Jvb2xlYW4nLFxuICAgIHBhcmVudDogJyhzdHJpbmd8ZWxlbWVudCknXG4gIH07XG4gIHZhciBFdmVudCQzID0ge1xuICAgIFNIT1c6IFwic2hvd1wiICsgRVZFTlRfS0VZJDMsXG4gICAgU0hPV046IFwic2hvd25cIiArIEVWRU5UX0tFWSQzLFxuICAgIEhJREU6IFwiaGlkZVwiICsgRVZFTlRfS0VZJDMsXG4gICAgSElEREVOOiBcImhpZGRlblwiICsgRVZFTlRfS0VZJDMsXG4gICAgQ0xJQ0tfREFUQV9BUEk6IFwiY2xpY2tcIiArIEVWRU5UX0tFWSQzICsgREFUQV9BUElfS0VZJDNcbiAgfTtcbiAgdmFyIENsYXNzTmFtZSQzID0ge1xuICAgIFNIT1c6ICdzaG93JyxcbiAgICBDT0xMQVBTRTogJ2NvbGxhcHNlJyxcbiAgICBDT0xMQVBTSU5HOiAnY29sbGFwc2luZycsXG4gICAgQ09MTEFQU0VEOiAnY29sbGFwc2VkJ1xuICB9O1xuICB2YXIgRGltZW5zaW9uID0ge1xuICAgIFdJRFRIOiAnd2lkdGgnLFxuICAgIEhFSUdIVDogJ2hlaWdodCdcbiAgfTtcbiAgdmFyIFNlbGVjdG9yJDMgPSB7XG4gICAgQUNUSVZFUzogJy5zaG93LCAuY29sbGFwc2luZycsXG4gICAgREFUQV9UT0dHTEU6ICdbZGF0YS10b2dnbGU9XCJjb2xsYXBzZVwiXSdcbiAgICAvKipcbiAgICAgKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICAgKiBDbGFzcyBEZWZpbml0aW9uXG4gICAgICogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAgICovXG5cbiAgfTtcblxuICB2YXIgQ29sbGFwc2UgPVxuICAvKiNfX1BVUkVfXyovXG4gIGZ1bmN0aW9uICgpIHtcbiAgICBmdW5jdGlvbiBDb2xsYXBzZShlbGVtZW50LCBjb25maWcpIHtcbiAgICAgIHRoaXMuX2lzVHJhbnNpdGlvbmluZyA9IGZhbHNlO1xuICAgICAgdGhpcy5fZWxlbWVudCA9IGVsZW1lbnQ7XG4gICAgICB0aGlzLl9jb25maWcgPSB0aGlzLl9nZXRDb25maWcoY29uZmlnKTtcbiAgICAgIHRoaXMuX3RyaWdnZXJBcnJheSA9IFtdLnNsaWNlLmNhbGwoZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbChcIltkYXRhLXRvZ2dsZT1cXFwiY29sbGFwc2VcXFwiXVtocmVmPVxcXCIjXCIgKyBlbGVtZW50LmlkICsgXCJcXFwiXSxcIiArIChcIltkYXRhLXRvZ2dsZT1cXFwiY29sbGFwc2VcXFwiXVtkYXRhLXRhcmdldD1cXFwiI1wiICsgZWxlbWVudC5pZCArIFwiXFxcIl1cIikpKTtcbiAgICAgIHZhciB0b2dnbGVMaXN0ID0gW10uc2xpY2UuY2FsbChkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKFNlbGVjdG9yJDMuREFUQV9UT0dHTEUpKTtcblxuICAgICAgZm9yICh2YXIgaSA9IDAsIGxlbiA9IHRvZ2dsZUxpc3QubGVuZ3RoOyBpIDwgbGVuOyBpKyspIHtcbiAgICAgICAgdmFyIGVsZW0gPSB0b2dnbGVMaXN0W2ldO1xuICAgICAgICB2YXIgc2VsZWN0b3IgPSBVdGlsLmdldFNlbGVjdG9yRnJvbUVsZW1lbnQoZWxlbSk7XG4gICAgICAgIHZhciBmaWx0ZXJFbGVtZW50ID0gW10uc2xpY2UuY2FsbChkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKHNlbGVjdG9yKSkuZmlsdGVyKGZ1bmN0aW9uIChmb3VuZEVsZW0pIHtcbiAgICAgICAgICByZXR1cm4gZm91bmRFbGVtID09PSBlbGVtZW50O1xuICAgICAgICB9KTtcblxuICAgICAgICBpZiAoc2VsZWN0b3IgIT09IG51bGwgJiYgZmlsdGVyRWxlbWVudC5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgdGhpcy5fc2VsZWN0b3IgPSBzZWxlY3RvcjtcblxuICAgICAgICAgIHRoaXMuX3RyaWdnZXJBcnJheS5wdXNoKGVsZW0pO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIHRoaXMuX3BhcmVudCA9IHRoaXMuX2NvbmZpZy5wYXJlbnQgPyB0aGlzLl9nZXRQYXJlbnQoKSA6IG51bGw7XG5cbiAgICAgIGlmICghdGhpcy5fY29uZmlnLnBhcmVudCkge1xuICAgICAgICB0aGlzLl9hZGRBcmlhQW5kQ29sbGFwc2VkQ2xhc3ModGhpcy5fZWxlbWVudCwgdGhpcy5fdHJpZ2dlckFycmF5KTtcbiAgICAgIH1cblxuICAgICAgaWYgKHRoaXMuX2NvbmZpZy50b2dnbGUpIHtcbiAgICAgICAgdGhpcy50b2dnbGUoKTtcbiAgICAgIH1cbiAgICB9IC8vIEdldHRlcnNcblxuXG4gICAgdmFyIF9wcm90byA9IENvbGxhcHNlLnByb3RvdHlwZTtcblxuICAgIC8vIFB1YmxpY1xuICAgIF9wcm90by50b2dnbGUgPSBmdW5jdGlvbiB0b2dnbGUoKSB7XG4gICAgICBpZiAoJCh0aGlzLl9lbGVtZW50KS5oYXNDbGFzcyhDbGFzc05hbWUkMy5TSE9XKSkge1xuICAgICAgICB0aGlzLmhpZGUoKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMuc2hvdygpO1xuICAgICAgfVxuICAgIH07XG5cbiAgICBfcHJvdG8uc2hvdyA9IGZ1bmN0aW9uIHNob3coKSB7XG4gICAgICB2YXIgX3RoaXMgPSB0aGlzO1xuXG4gICAgICBpZiAodGhpcy5faXNUcmFuc2l0aW9uaW5nIHx8ICQodGhpcy5fZWxlbWVudCkuaGFzQ2xhc3MoQ2xhc3NOYW1lJDMuU0hPVykpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICB2YXIgYWN0aXZlcztcbiAgICAgIHZhciBhY3RpdmVzRGF0YTtcblxuICAgICAgaWYgKHRoaXMuX3BhcmVudCkge1xuICAgICAgICBhY3RpdmVzID0gW10uc2xpY2UuY2FsbCh0aGlzLl9wYXJlbnQucXVlcnlTZWxlY3RvckFsbChTZWxlY3RvciQzLkFDVElWRVMpKS5maWx0ZXIoZnVuY3Rpb24gKGVsZW0pIHtcbiAgICAgICAgICBpZiAodHlwZW9mIF90aGlzLl9jb25maWcucGFyZW50ID09PSAnc3RyaW5nJykge1xuICAgICAgICAgICAgcmV0dXJuIGVsZW0uZ2V0QXR0cmlidXRlKCdkYXRhLXBhcmVudCcpID09PSBfdGhpcy5fY29uZmlnLnBhcmVudDtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICByZXR1cm4gZWxlbS5jbGFzc0xpc3QuY29udGFpbnMoQ2xhc3NOYW1lJDMuQ09MTEFQU0UpO1xuICAgICAgICB9KTtcblxuICAgICAgICBpZiAoYWN0aXZlcy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICBhY3RpdmVzID0gbnVsbDtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICBpZiAoYWN0aXZlcykge1xuICAgICAgICBhY3RpdmVzRGF0YSA9ICQoYWN0aXZlcykubm90KHRoaXMuX3NlbGVjdG9yKS5kYXRhKERBVEFfS0VZJDMpO1xuXG4gICAgICAgIGlmIChhY3RpdmVzRGF0YSAmJiBhY3RpdmVzRGF0YS5faXNUcmFuc2l0aW9uaW5nKSB7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIHZhciBzdGFydEV2ZW50ID0gJC5FdmVudChFdmVudCQzLlNIT1cpO1xuICAgICAgJCh0aGlzLl9lbGVtZW50KS50cmlnZ2VyKHN0YXJ0RXZlbnQpO1xuXG4gICAgICBpZiAoc3RhcnRFdmVudC5pc0RlZmF1bHRQcmV2ZW50ZWQoKSkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIGlmIChhY3RpdmVzKSB7XG4gICAgICAgIENvbGxhcHNlLl9qUXVlcnlJbnRlcmZhY2UuY2FsbCgkKGFjdGl2ZXMpLm5vdCh0aGlzLl9zZWxlY3RvciksICdoaWRlJyk7XG5cbiAgICAgICAgaWYgKCFhY3RpdmVzRGF0YSkge1xuICAgICAgICAgICQoYWN0aXZlcykuZGF0YShEQVRBX0tFWSQzLCBudWxsKTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICB2YXIgZGltZW5zaW9uID0gdGhpcy5fZ2V0RGltZW5zaW9uKCk7XG5cbiAgICAgICQodGhpcy5fZWxlbWVudCkucmVtb3ZlQ2xhc3MoQ2xhc3NOYW1lJDMuQ09MTEFQU0UpLmFkZENsYXNzKENsYXNzTmFtZSQzLkNPTExBUFNJTkcpO1xuICAgICAgdGhpcy5fZWxlbWVudC5zdHlsZVtkaW1lbnNpb25dID0gMDtcblxuICAgICAgaWYgKHRoaXMuX3RyaWdnZXJBcnJheS5sZW5ndGgpIHtcbiAgICAgICAgJCh0aGlzLl90cmlnZ2VyQXJyYXkpLnJlbW92ZUNsYXNzKENsYXNzTmFtZSQzLkNPTExBUFNFRCkuYXR0cignYXJpYS1leHBhbmRlZCcsIHRydWUpO1xuICAgICAgfVxuXG4gICAgICB0aGlzLnNldFRyYW5zaXRpb25pbmcodHJ1ZSk7XG5cbiAgICAgIHZhciBjb21wbGV0ZSA9IGZ1bmN0aW9uIGNvbXBsZXRlKCkge1xuICAgICAgICAkKF90aGlzLl9lbGVtZW50KS5yZW1vdmVDbGFzcyhDbGFzc05hbWUkMy5DT0xMQVBTSU5HKS5hZGRDbGFzcyhDbGFzc05hbWUkMy5DT0xMQVBTRSkuYWRkQ2xhc3MoQ2xhc3NOYW1lJDMuU0hPVyk7XG4gICAgICAgIF90aGlzLl9lbGVtZW50LnN0eWxlW2RpbWVuc2lvbl0gPSAnJztcblxuICAgICAgICBfdGhpcy5zZXRUcmFuc2l0aW9uaW5nKGZhbHNlKTtcblxuICAgICAgICAkKF90aGlzLl9lbGVtZW50KS50cmlnZ2VyKEV2ZW50JDMuU0hPV04pO1xuICAgICAgfTtcblxuICAgICAgdmFyIGNhcGl0YWxpemVkRGltZW5zaW9uID0gZGltZW5zaW9uWzBdLnRvVXBwZXJDYXNlKCkgKyBkaW1lbnNpb24uc2xpY2UoMSk7XG4gICAgICB2YXIgc2Nyb2xsU2l6ZSA9IFwic2Nyb2xsXCIgKyBjYXBpdGFsaXplZERpbWVuc2lvbjtcbiAgICAgIHZhciB0cmFuc2l0aW9uRHVyYXRpb24gPSBVdGlsLmdldFRyYW5zaXRpb25EdXJhdGlvbkZyb21FbGVtZW50KHRoaXMuX2VsZW1lbnQpO1xuICAgICAgJCh0aGlzLl9lbGVtZW50KS5vbmUoVXRpbC5UUkFOU0lUSU9OX0VORCwgY29tcGxldGUpLmVtdWxhdGVUcmFuc2l0aW9uRW5kKHRyYW5zaXRpb25EdXJhdGlvbik7XG4gICAgICB0aGlzLl9lbGVtZW50LnN0eWxlW2RpbWVuc2lvbl0gPSB0aGlzLl9lbGVtZW50W3Njcm9sbFNpemVdICsgXCJweFwiO1xuICAgIH07XG5cbiAgICBfcHJvdG8uaGlkZSA9IGZ1bmN0aW9uIGhpZGUoKSB7XG4gICAgICB2YXIgX3RoaXMyID0gdGhpcztcblxuICAgICAgaWYgKHRoaXMuX2lzVHJhbnNpdGlvbmluZyB8fCAhJCh0aGlzLl9lbGVtZW50KS5oYXNDbGFzcyhDbGFzc05hbWUkMy5TSE9XKSkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIHZhciBzdGFydEV2ZW50ID0gJC5FdmVudChFdmVudCQzLkhJREUpO1xuICAgICAgJCh0aGlzLl9lbGVtZW50KS50cmlnZ2VyKHN0YXJ0RXZlbnQpO1xuXG4gICAgICBpZiAoc3RhcnRFdmVudC5pc0RlZmF1bHRQcmV2ZW50ZWQoKSkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIHZhciBkaW1lbnNpb24gPSB0aGlzLl9nZXREaW1lbnNpb24oKTtcblxuICAgICAgdGhpcy5fZWxlbWVudC5zdHlsZVtkaW1lbnNpb25dID0gdGhpcy5fZWxlbWVudC5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKVtkaW1lbnNpb25dICsgXCJweFwiO1xuICAgICAgVXRpbC5yZWZsb3codGhpcy5fZWxlbWVudCk7XG4gICAgICAkKHRoaXMuX2VsZW1lbnQpLmFkZENsYXNzKENsYXNzTmFtZSQzLkNPTExBUFNJTkcpLnJlbW92ZUNsYXNzKENsYXNzTmFtZSQzLkNPTExBUFNFKS5yZW1vdmVDbGFzcyhDbGFzc05hbWUkMy5TSE9XKTtcbiAgICAgIHZhciB0cmlnZ2VyQXJyYXlMZW5ndGggPSB0aGlzLl90cmlnZ2VyQXJyYXkubGVuZ3RoO1xuXG4gICAgICBpZiAodHJpZ2dlckFycmF5TGVuZ3RoID4gMCkge1xuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHRyaWdnZXJBcnJheUxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgdmFyIHRyaWdnZXIgPSB0aGlzLl90cmlnZ2VyQXJyYXlbaV07XG4gICAgICAgICAgdmFyIHNlbGVjdG9yID0gVXRpbC5nZXRTZWxlY3RvckZyb21FbGVtZW50KHRyaWdnZXIpO1xuXG4gICAgICAgICAgaWYgKHNlbGVjdG9yICE9PSBudWxsKSB7XG4gICAgICAgICAgICB2YXIgJGVsZW0gPSAkKFtdLnNsaWNlLmNhbGwoZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbChzZWxlY3RvcikpKTtcblxuICAgICAgICAgICAgaWYgKCEkZWxlbS5oYXNDbGFzcyhDbGFzc05hbWUkMy5TSE9XKSkge1xuICAgICAgICAgICAgICAkKHRyaWdnZXIpLmFkZENsYXNzKENsYXNzTmFtZSQzLkNPTExBUFNFRCkuYXR0cignYXJpYS1leHBhbmRlZCcsIGZhbHNlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgdGhpcy5zZXRUcmFuc2l0aW9uaW5nKHRydWUpO1xuXG4gICAgICB2YXIgY29tcGxldGUgPSBmdW5jdGlvbiBjb21wbGV0ZSgpIHtcbiAgICAgICAgX3RoaXMyLnNldFRyYW5zaXRpb25pbmcoZmFsc2UpO1xuXG4gICAgICAgICQoX3RoaXMyLl9lbGVtZW50KS5yZW1vdmVDbGFzcyhDbGFzc05hbWUkMy5DT0xMQVBTSU5HKS5hZGRDbGFzcyhDbGFzc05hbWUkMy5DT0xMQVBTRSkudHJpZ2dlcihFdmVudCQzLkhJRERFTik7XG4gICAgICB9O1xuXG4gICAgICB0aGlzLl9lbGVtZW50LnN0eWxlW2RpbWVuc2lvbl0gPSAnJztcbiAgICAgIHZhciB0cmFuc2l0aW9uRHVyYXRpb24gPSBVdGlsLmdldFRyYW5zaXRpb25EdXJhdGlvbkZyb21FbGVtZW50KHRoaXMuX2VsZW1lbnQpO1xuICAgICAgJCh0aGlzLl9lbGVtZW50KS5vbmUoVXRpbC5UUkFOU0lUSU9OX0VORCwgY29tcGxldGUpLmVtdWxhdGVUcmFuc2l0aW9uRW5kKHRyYW5zaXRpb25EdXJhdGlvbik7XG4gICAgfTtcblxuICAgIF9wcm90by5zZXRUcmFuc2l0aW9uaW5nID0gZnVuY3Rpb24gc2V0VHJhbnNpdGlvbmluZyhpc1RyYW5zaXRpb25pbmcpIHtcbiAgICAgIHRoaXMuX2lzVHJhbnNpdGlvbmluZyA9IGlzVHJhbnNpdGlvbmluZztcbiAgICB9O1xuXG4gICAgX3Byb3RvLmRpc3Bvc2UgPSBmdW5jdGlvbiBkaXNwb3NlKCkge1xuICAgICAgJC5yZW1vdmVEYXRhKHRoaXMuX2VsZW1lbnQsIERBVEFfS0VZJDMpO1xuICAgICAgdGhpcy5fY29uZmlnID0gbnVsbDtcbiAgICAgIHRoaXMuX3BhcmVudCA9IG51bGw7XG4gICAgICB0aGlzLl9lbGVtZW50ID0gbnVsbDtcbiAgICAgIHRoaXMuX3RyaWdnZXJBcnJheSA9IG51bGw7XG4gICAgICB0aGlzLl9pc1RyYW5zaXRpb25pbmcgPSBudWxsO1xuICAgIH07IC8vIFByaXZhdGVcblxuXG4gICAgX3Byb3RvLl9nZXRDb25maWcgPSBmdW5jdGlvbiBfZ2V0Q29uZmlnKGNvbmZpZykge1xuICAgICAgY29uZmlnID0gX29iamVjdFNwcmVhZCh7fSwgRGVmYXVsdCQxLCBjb25maWcpO1xuICAgICAgY29uZmlnLnRvZ2dsZSA9IEJvb2xlYW4oY29uZmlnLnRvZ2dsZSk7IC8vIENvZXJjZSBzdHJpbmcgdmFsdWVzXG5cbiAgICAgIFV0aWwudHlwZUNoZWNrQ29uZmlnKE5BTUUkMywgY29uZmlnLCBEZWZhdWx0VHlwZSQxKTtcbiAgICAgIHJldHVybiBjb25maWc7XG4gICAgfTtcblxuICAgIF9wcm90by5fZ2V0RGltZW5zaW9uID0gZnVuY3Rpb24gX2dldERpbWVuc2lvbigpIHtcbiAgICAgIHZhciBoYXNXaWR0aCA9ICQodGhpcy5fZWxlbWVudCkuaGFzQ2xhc3MoRGltZW5zaW9uLldJRFRIKTtcbiAgICAgIHJldHVybiBoYXNXaWR0aCA/IERpbWVuc2lvbi5XSURUSCA6IERpbWVuc2lvbi5IRUlHSFQ7XG4gICAgfTtcblxuICAgIF9wcm90by5fZ2V0UGFyZW50ID0gZnVuY3Rpb24gX2dldFBhcmVudCgpIHtcbiAgICAgIHZhciBfdGhpczMgPSB0aGlzO1xuXG4gICAgICB2YXIgcGFyZW50O1xuXG4gICAgICBpZiAoVXRpbC5pc0VsZW1lbnQodGhpcy5fY29uZmlnLnBhcmVudCkpIHtcbiAgICAgICAgcGFyZW50ID0gdGhpcy5fY29uZmlnLnBhcmVudDsgLy8gSXQncyBhIGpRdWVyeSBvYmplY3RcblxuICAgICAgICBpZiAodHlwZW9mIHRoaXMuX2NvbmZpZy5wYXJlbnQuanF1ZXJ5ICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgIHBhcmVudCA9IHRoaXMuX2NvbmZpZy5wYXJlbnRbMF07XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHBhcmVudCA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IodGhpcy5fY29uZmlnLnBhcmVudCk7XG4gICAgICB9XG5cbiAgICAgIHZhciBzZWxlY3RvciA9IFwiW2RhdGEtdG9nZ2xlPVxcXCJjb2xsYXBzZVxcXCJdW2RhdGEtcGFyZW50PVxcXCJcIiArIHRoaXMuX2NvbmZpZy5wYXJlbnQgKyBcIlxcXCJdXCI7XG4gICAgICB2YXIgY2hpbGRyZW4gPSBbXS5zbGljZS5jYWxsKHBhcmVudC5xdWVyeVNlbGVjdG9yQWxsKHNlbGVjdG9yKSk7XG4gICAgICAkKGNoaWxkcmVuKS5lYWNoKGZ1bmN0aW9uIChpLCBlbGVtZW50KSB7XG4gICAgICAgIF90aGlzMy5fYWRkQXJpYUFuZENvbGxhcHNlZENsYXNzKENvbGxhcHNlLl9nZXRUYXJnZXRGcm9tRWxlbWVudChlbGVtZW50KSwgW2VsZW1lbnRdKTtcbiAgICAgIH0pO1xuICAgICAgcmV0dXJuIHBhcmVudDtcbiAgICB9O1xuXG4gICAgX3Byb3RvLl9hZGRBcmlhQW5kQ29sbGFwc2VkQ2xhc3MgPSBmdW5jdGlvbiBfYWRkQXJpYUFuZENvbGxhcHNlZENsYXNzKGVsZW1lbnQsIHRyaWdnZXJBcnJheSkge1xuICAgICAgdmFyIGlzT3BlbiA9ICQoZWxlbWVudCkuaGFzQ2xhc3MoQ2xhc3NOYW1lJDMuU0hPVyk7XG5cbiAgICAgIGlmICh0cmlnZ2VyQXJyYXkubGVuZ3RoKSB7XG4gICAgICAgICQodHJpZ2dlckFycmF5KS50b2dnbGVDbGFzcyhDbGFzc05hbWUkMy5DT0xMQVBTRUQsICFpc09wZW4pLmF0dHIoJ2FyaWEtZXhwYW5kZWQnLCBpc09wZW4pO1xuICAgICAgfVxuICAgIH07IC8vIFN0YXRpY1xuXG5cbiAgICBDb2xsYXBzZS5fZ2V0VGFyZ2V0RnJvbUVsZW1lbnQgPSBmdW5jdGlvbiBfZ2V0VGFyZ2V0RnJvbUVsZW1lbnQoZWxlbWVudCkge1xuICAgICAgdmFyIHNlbGVjdG9yID0gVXRpbC5nZXRTZWxlY3RvckZyb21FbGVtZW50KGVsZW1lbnQpO1xuICAgICAgcmV0dXJuIHNlbGVjdG9yID8gZG9jdW1lbnQucXVlcnlTZWxlY3RvcihzZWxlY3RvcikgOiBudWxsO1xuICAgIH07XG5cbiAgICBDb2xsYXBzZS5falF1ZXJ5SW50ZXJmYWNlID0gZnVuY3Rpb24gX2pRdWVyeUludGVyZmFjZShjb25maWcpIHtcbiAgICAgIHJldHVybiB0aGlzLmVhY2goZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgJHRoaXMgPSAkKHRoaXMpO1xuICAgICAgICB2YXIgZGF0YSA9ICR0aGlzLmRhdGEoREFUQV9LRVkkMyk7XG5cbiAgICAgICAgdmFyIF9jb25maWcgPSBfb2JqZWN0U3ByZWFkKHt9LCBEZWZhdWx0JDEsICR0aGlzLmRhdGEoKSwgdHlwZW9mIGNvbmZpZyA9PT0gJ29iamVjdCcgJiYgY29uZmlnID8gY29uZmlnIDoge30pO1xuXG4gICAgICAgIGlmICghZGF0YSAmJiBfY29uZmlnLnRvZ2dsZSAmJiAvc2hvd3xoaWRlLy50ZXN0KGNvbmZpZykpIHtcbiAgICAgICAgICBfY29uZmlnLnRvZ2dsZSA9IGZhbHNlO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKCFkYXRhKSB7XG4gICAgICAgICAgZGF0YSA9IG5ldyBDb2xsYXBzZSh0aGlzLCBfY29uZmlnKTtcbiAgICAgICAgICAkdGhpcy5kYXRhKERBVEFfS0VZJDMsIGRhdGEpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHR5cGVvZiBjb25maWcgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgaWYgKHR5cGVvZiBkYXRhW2NvbmZpZ10gPT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKFwiTm8gbWV0aG9kIG5hbWVkIFxcXCJcIiArIGNvbmZpZyArIFwiXFxcIlwiKTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBkYXRhW2NvbmZpZ10oKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfTtcblxuICAgIF9jcmVhdGVDbGFzcyhDb2xsYXBzZSwgbnVsbCwgW3tcbiAgICAgIGtleTogXCJWRVJTSU9OXCIsXG4gICAgICBnZXQ6IGZ1bmN0aW9uIGdldCgpIHtcbiAgICAgICAgcmV0dXJuIFZFUlNJT04kMztcbiAgICAgIH1cbiAgICB9LCB7XG4gICAgICBrZXk6IFwiRGVmYXVsdFwiLFxuICAgICAgZ2V0OiBmdW5jdGlvbiBnZXQoKSB7XG4gICAgICAgIHJldHVybiBEZWZhdWx0JDE7XG4gICAgICB9XG4gICAgfV0pO1xuXG4gICAgcmV0dXJuIENvbGxhcHNlO1xuICB9KCk7XG4gIC8qKlxuICAgKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICogRGF0YSBBcGkgaW1wbGVtZW50YXRpb25cbiAgICogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAqL1xuXG5cbiAgJChkb2N1bWVudCkub24oRXZlbnQkMy5DTElDS19EQVRBX0FQSSwgU2VsZWN0b3IkMy5EQVRBX1RPR0dMRSwgZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgLy8gcHJldmVudERlZmF1bHQgb25seSBmb3IgPGE+IGVsZW1lbnRzICh3aGljaCBjaGFuZ2UgdGhlIFVSTCkgbm90IGluc2lkZSB0aGUgY29sbGFwc2libGUgZWxlbWVudFxuICAgIGlmIChldmVudC5jdXJyZW50VGFyZ2V0LnRhZ05hbWUgPT09ICdBJykge1xuICAgICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgICB9XG5cbiAgICB2YXIgJHRyaWdnZXIgPSAkKHRoaXMpO1xuICAgIHZhciBzZWxlY3RvciA9IFV0aWwuZ2V0U2VsZWN0b3JGcm9tRWxlbWVudCh0aGlzKTtcbiAgICB2YXIgc2VsZWN0b3JzID0gW10uc2xpY2UuY2FsbChkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKHNlbGVjdG9yKSk7XG4gICAgJChzZWxlY3RvcnMpLmVhY2goZnVuY3Rpb24gKCkge1xuICAgICAgdmFyICR0YXJnZXQgPSAkKHRoaXMpO1xuICAgICAgdmFyIGRhdGEgPSAkdGFyZ2V0LmRhdGEoREFUQV9LRVkkMyk7XG4gICAgICB2YXIgY29uZmlnID0gZGF0YSA/ICd0b2dnbGUnIDogJHRyaWdnZXIuZGF0YSgpO1xuXG4gICAgICBDb2xsYXBzZS5falF1ZXJ5SW50ZXJmYWNlLmNhbGwoJHRhcmdldCwgY29uZmlnKTtcbiAgICB9KTtcbiAgfSk7XG4gIC8qKlxuICAgKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICogalF1ZXJ5XG4gICAqIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgKi9cblxuICAkLmZuW05BTUUkM10gPSBDb2xsYXBzZS5falF1ZXJ5SW50ZXJmYWNlO1xuICAkLmZuW05BTUUkM10uQ29uc3RydWN0b3IgPSBDb2xsYXBzZTtcblxuICAkLmZuW05BTUUkM10ubm9Db25mbGljdCA9IGZ1bmN0aW9uICgpIHtcbiAgICAkLmZuW05BTUUkM10gPSBKUVVFUllfTk9fQ09ORkxJQ1QkMztcbiAgICByZXR1cm4gQ29sbGFwc2UuX2pRdWVyeUludGVyZmFjZTtcbiAgfTtcblxuICAvKipcbiAgICogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAqIENvbnN0YW50c1xuICAgKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICovXG5cbiAgdmFyIE5BTUUkNCA9ICdkcm9wZG93bic7XG4gIHZhciBWRVJTSU9OJDQgPSAnNC4yLjEnO1xuICB2YXIgREFUQV9LRVkkNCA9ICdicy5kcm9wZG93bic7XG4gIHZhciBFVkVOVF9LRVkkNCA9IFwiLlwiICsgREFUQV9LRVkkNDtcbiAgdmFyIERBVEFfQVBJX0tFWSQ0ID0gJy5kYXRhLWFwaSc7XG4gIHZhciBKUVVFUllfTk9fQ09ORkxJQ1QkNCA9ICQuZm5bTkFNRSQ0XTtcbiAgdmFyIEVTQ0FQRV9LRVlDT0RFID0gMjc7IC8vIEtleWJvYXJkRXZlbnQud2hpY2ggdmFsdWUgZm9yIEVzY2FwZSAoRXNjKSBrZXlcblxuICB2YXIgU1BBQ0VfS0VZQ09ERSA9IDMyOyAvLyBLZXlib2FyZEV2ZW50LndoaWNoIHZhbHVlIGZvciBzcGFjZSBrZXlcblxuICB2YXIgVEFCX0tFWUNPREUgPSA5OyAvLyBLZXlib2FyZEV2ZW50LndoaWNoIHZhbHVlIGZvciB0YWIga2V5XG5cbiAgdmFyIEFSUk9XX1VQX0tFWUNPREUgPSAzODsgLy8gS2V5Ym9hcmRFdmVudC53aGljaCB2YWx1ZSBmb3IgdXAgYXJyb3cga2V5XG5cbiAgdmFyIEFSUk9XX0RPV05fS0VZQ09ERSA9IDQwOyAvLyBLZXlib2FyZEV2ZW50LndoaWNoIHZhbHVlIGZvciBkb3duIGFycm93IGtleVxuXG4gIHZhciBSSUdIVF9NT1VTRV9CVVRUT05fV0hJQ0ggPSAzOyAvLyBNb3VzZUV2ZW50LndoaWNoIHZhbHVlIGZvciB0aGUgcmlnaHQgYnV0dG9uIChhc3N1bWluZyBhIHJpZ2h0LWhhbmRlZCBtb3VzZSlcblxuICB2YXIgUkVHRVhQX0tFWURPV04gPSBuZXcgUmVnRXhwKEFSUk9XX1VQX0tFWUNPREUgKyBcInxcIiArIEFSUk9XX0RPV05fS0VZQ09ERSArIFwifFwiICsgRVNDQVBFX0tFWUNPREUpO1xuICB2YXIgRXZlbnQkNCA9IHtcbiAgICBISURFOiBcImhpZGVcIiArIEVWRU5UX0tFWSQ0LFxuICAgIEhJRERFTjogXCJoaWRkZW5cIiArIEVWRU5UX0tFWSQ0LFxuICAgIFNIT1c6IFwic2hvd1wiICsgRVZFTlRfS0VZJDQsXG4gICAgU0hPV046IFwic2hvd25cIiArIEVWRU5UX0tFWSQ0LFxuICAgIENMSUNLOiBcImNsaWNrXCIgKyBFVkVOVF9LRVkkNCxcbiAgICBDTElDS19EQVRBX0FQSTogXCJjbGlja1wiICsgRVZFTlRfS0VZJDQgKyBEQVRBX0FQSV9LRVkkNCxcbiAgICBLRVlET1dOX0RBVEFfQVBJOiBcImtleWRvd25cIiArIEVWRU5UX0tFWSQ0ICsgREFUQV9BUElfS0VZJDQsXG4gICAgS0VZVVBfREFUQV9BUEk6IFwia2V5dXBcIiArIEVWRU5UX0tFWSQ0ICsgREFUQV9BUElfS0VZJDRcbiAgfTtcbiAgdmFyIENsYXNzTmFtZSQ0ID0ge1xuICAgIERJU0FCTEVEOiAnZGlzYWJsZWQnLFxuICAgIFNIT1c6ICdzaG93JyxcbiAgICBEUk9QVVA6ICdkcm9wdXAnLFxuICAgIERST1BSSUdIVDogJ2Ryb3ByaWdodCcsXG4gICAgRFJPUExFRlQ6ICdkcm9wbGVmdCcsXG4gICAgTUVOVVJJR0hUOiAnZHJvcGRvd24tbWVudS1yaWdodCcsXG4gICAgTUVOVUxFRlQ6ICdkcm9wZG93bi1tZW51LWxlZnQnLFxuICAgIFBPU0lUSU9OX1NUQVRJQzogJ3Bvc2l0aW9uLXN0YXRpYydcbiAgfTtcbiAgdmFyIFNlbGVjdG9yJDQgPSB7XG4gICAgREFUQV9UT0dHTEU6ICdbZGF0YS10b2dnbGU9XCJkcm9wZG93blwiXScsXG4gICAgRk9STV9DSElMRDogJy5kcm9wZG93biBmb3JtJyxcbiAgICBNRU5VOiAnLmRyb3Bkb3duLW1lbnUnLFxuICAgIE5BVkJBUl9OQVY6ICcubmF2YmFyLW5hdicsXG4gICAgVklTSUJMRV9JVEVNUzogJy5kcm9wZG93bi1tZW51IC5kcm9wZG93bi1pdGVtOm5vdCguZGlzYWJsZWQpOm5vdCg6ZGlzYWJsZWQpJ1xuICB9O1xuICB2YXIgQXR0YWNobWVudE1hcCA9IHtcbiAgICBUT1A6ICd0b3Atc3RhcnQnLFxuICAgIFRPUEVORDogJ3RvcC1lbmQnLFxuICAgIEJPVFRPTTogJ2JvdHRvbS1zdGFydCcsXG4gICAgQk9UVE9NRU5EOiAnYm90dG9tLWVuZCcsXG4gICAgUklHSFQ6ICdyaWdodC1zdGFydCcsXG4gICAgUklHSFRFTkQ6ICdyaWdodC1lbmQnLFxuICAgIExFRlQ6ICdsZWZ0LXN0YXJ0JyxcbiAgICBMRUZURU5EOiAnbGVmdC1lbmQnXG4gIH07XG4gIHZhciBEZWZhdWx0JDIgPSB7XG4gICAgb2Zmc2V0OiAwLFxuICAgIGZsaXA6IHRydWUsXG4gICAgYm91bmRhcnk6ICdzY3JvbGxQYXJlbnQnLFxuICAgIHJlZmVyZW5jZTogJ3RvZ2dsZScsXG4gICAgZGlzcGxheTogJ2R5bmFtaWMnXG4gIH07XG4gIHZhciBEZWZhdWx0VHlwZSQyID0ge1xuICAgIG9mZnNldDogJyhudW1iZXJ8c3RyaW5nfGZ1bmN0aW9uKScsXG4gICAgZmxpcDogJ2Jvb2xlYW4nLFxuICAgIGJvdW5kYXJ5OiAnKHN0cmluZ3xlbGVtZW50KScsXG4gICAgcmVmZXJlbmNlOiAnKHN0cmluZ3xlbGVtZW50KScsXG4gICAgZGlzcGxheTogJ3N0cmluZydcbiAgICAvKipcbiAgICAgKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICAgKiBDbGFzcyBEZWZpbml0aW9uXG4gICAgICogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAgICovXG5cbiAgfTtcblxuICB2YXIgRHJvcGRvd24gPVxuICAvKiNfX1BVUkVfXyovXG4gIGZ1bmN0aW9uICgpIHtcbiAgICBmdW5jdGlvbiBEcm9wZG93bihlbGVtZW50LCBjb25maWcpIHtcbiAgICAgIHRoaXMuX2VsZW1lbnQgPSBlbGVtZW50O1xuICAgICAgdGhpcy5fcG9wcGVyID0gbnVsbDtcbiAgICAgIHRoaXMuX2NvbmZpZyA9IHRoaXMuX2dldENvbmZpZyhjb25maWcpO1xuICAgICAgdGhpcy5fbWVudSA9IHRoaXMuX2dldE1lbnVFbGVtZW50KCk7XG4gICAgICB0aGlzLl9pbk5hdmJhciA9IHRoaXMuX2RldGVjdE5hdmJhcigpO1xuXG4gICAgICB0aGlzLl9hZGRFdmVudExpc3RlbmVycygpO1xuICAgIH0gLy8gR2V0dGVyc1xuXG5cbiAgICB2YXIgX3Byb3RvID0gRHJvcGRvd24ucHJvdG90eXBlO1xuXG4gICAgLy8gUHVibGljXG4gICAgX3Byb3RvLnRvZ2dsZSA9IGZ1bmN0aW9uIHRvZ2dsZSgpIHtcbiAgICAgIGlmICh0aGlzLl9lbGVtZW50LmRpc2FibGVkIHx8ICQodGhpcy5fZWxlbWVudCkuaGFzQ2xhc3MoQ2xhc3NOYW1lJDQuRElTQUJMRUQpKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgdmFyIHBhcmVudCA9IERyb3Bkb3duLl9nZXRQYXJlbnRGcm9tRWxlbWVudCh0aGlzLl9lbGVtZW50KTtcblxuICAgICAgdmFyIGlzQWN0aXZlID0gJCh0aGlzLl9tZW51KS5oYXNDbGFzcyhDbGFzc05hbWUkNC5TSE9XKTtcblxuICAgICAgRHJvcGRvd24uX2NsZWFyTWVudXMoKTtcblxuICAgICAgaWYgKGlzQWN0aXZlKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgdmFyIHJlbGF0ZWRUYXJnZXQgPSB7XG4gICAgICAgIHJlbGF0ZWRUYXJnZXQ6IHRoaXMuX2VsZW1lbnRcbiAgICAgIH07XG4gICAgICB2YXIgc2hvd0V2ZW50ID0gJC5FdmVudChFdmVudCQ0LlNIT1csIHJlbGF0ZWRUYXJnZXQpO1xuICAgICAgJChwYXJlbnQpLnRyaWdnZXIoc2hvd0V2ZW50KTtcblxuICAgICAgaWYgKHNob3dFdmVudC5pc0RlZmF1bHRQcmV2ZW50ZWQoKSkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9IC8vIERpc2FibGUgdG90YWxseSBQb3BwZXIuanMgZm9yIERyb3Bkb3duIGluIE5hdmJhclxuXG5cbiAgICAgIGlmICghdGhpcy5faW5OYXZiYXIpIHtcbiAgICAgICAgLyoqXG4gICAgICAgICAqIENoZWNrIGZvciBQb3BwZXIgZGVwZW5kZW5jeVxuICAgICAgICAgKiBQb3BwZXIgLSBodHRwczovL3BvcHBlci5qcy5vcmdcbiAgICAgICAgICovXG4gICAgICAgIGlmICh0eXBlb2YgUG9wcGVyID09PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ0Jvb3RzdHJhcFxcJ3MgZHJvcGRvd25zIHJlcXVpcmUgUG9wcGVyLmpzIChodHRwczovL3BvcHBlci5qcy5vcmcvKScpO1xuICAgICAgICB9XG5cbiAgICAgICAgdmFyIHJlZmVyZW5jZUVsZW1lbnQgPSB0aGlzLl9lbGVtZW50O1xuXG4gICAgICAgIGlmICh0aGlzLl9jb25maWcucmVmZXJlbmNlID09PSAncGFyZW50Jykge1xuICAgICAgICAgIHJlZmVyZW5jZUVsZW1lbnQgPSBwYXJlbnQ7XG4gICAgICAgIH0gZWxzZSBpZiAoVXRpbC5pc0VsZW1lbnQodGhpcy5fY29uZmlnLnJlZmVyZW5jZSkpIHtcbiAgICAgICAgICByZWZlcmVuY2VFbGVtZW50ID0gdGhpcy5fY29uZmlnLnJlZmVyZW5jZTsgLy8gQ2hlY2sgaWYgaXQncyBqUXVlcnkgZWxlbWVudFxuXG4gICAgICAgICAgaWYgKHR5cGVvZiB0aGlzLl9jb25maWcucmVmZXJlbmNlLmpxdWVyeSAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgIHJlZmVyZW5jZUVsZW1lbnQgPSB0aGlzLl9jb25maWcucmVmZXJlbmNlWzBdO1xuICAgICAgICAgIH1cbiAgICAgICAgfSAvLyBJZiBib3VuZGFyeSBpcyBub3QgYHNjcm9sbFBhcmVudGAsIHRoZW4gc2V0IHBvc2l0aW9uIHRvIGBzdGF0aWNgXG4gICAgICAgIC8vIHRvIGFsbG93IHRoZSBtZW51IHRvIFwiZXNjYXBlXCIgdGhlIHNjcm9sbCBwYXJlbnQncyBib3VuZGFyaWVzXG4gICAgICAgIC8vIGh0dHBzOi8vZ2l0aHViLmNvbS90d2JzL2Jvb3RzdHJhcC9pc3N1ZXMvMjQyNTFcblxuXG4gICAgICAgIGlmICh0aGlzLl9jb25maWcuYm91bmRhcnkgIT09ICdzY3JvbGxQYXJlbnQnKSB7XG4gICAgICAgICAgJChwYXJlbnQpLmFkZENsYXNzKENsYXNzTmFtZSQ0LlBPU0lUSU9OX1NUQVRJQyk7XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLl9wb3BwZXIgPSBuZXcgUG9wcGVyKHJlZmVyZW5jZUVsZW1lbnQsIHRoaXMuX21lbnUsIHRoaXMuX2dldFBvcHBlckNvbmZpZygpKTtcbiAgICAgIH0gLy8gSWYgdGhpcyBpcyBhIHRvdWNoLWVuYWJsZWQgZGV2aWNlIHdlIGFkZCBleHRyYVxuICAgICAgLy8gZW1wdHkgbW91c2VvdmVyIGxpc3RlbmVycyB0byB0aGUgYm9keSdzIGltbWVkaWF0ZSBjaGlsZHJlbjtcbiAgICAgIC8vIG9ubHkgbmVlZGVkIGJlY2F1c2Ugb2YgYnJva2VuIGV2ZW50IGRlbGVnYXRpb24gb24gaU9TXG4gICAgICAvLyBodHRwczovL3d3dy5xdWlya3Ntb2RlLm9yZy9ibG9nL2FyY2hpdmVzLzIwMTQvMDIvbW91c2VfZXZlbnRfYnViLmh0bWxcblxuXG4gICAgICBpZiAoJ29udG91Y2hzdGFydCcgaW4gZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50ICYmICQocGFyZW50KS5jbG9zZXN0KFNlbGVjdG9yJDQuTkFWQkFSX05BVikubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICQoZG9jdW1lbnQuYm9keSkuY2hpbGRyZW4oKS5vbignbW91c2VvdmVyJywgbnVsbCwgJC5ub29wKTtcbiAgICAgIH1cblxuICAgICAgdGhpcy5fZWxlbWVudC5mb2N1cygpO1xuXG4gICAgICB0aGlzLl9lbGVtZW50LnNldEF0dHJpYnV0ZSgnYXJpYS1leHBhbmRlZCcsIHRydWUpO1xuXG4gICAgICAkKHRoaXMuX21lbnUpLnRvZ2dsZUNsYXNzKENsYXNzTmFtZSQ0LlNIT1cpO1xuICAgICAgJChwYXJlbnQpLnRvZ2dsZUNsYXNzKENsYXNzTmFtZSQ0LlNIT1cpLnRyaWdnZXIoJC5FdmVudChFdmVudCQ0LlNIT1dOLCByZWxhdGVkVGFyZ2V0KSk7XG4gICAgfTtcblxuICAgIF9wcm90by5zaG93ID0gZnVuY3Rpb24gc2hvdygpIHtcbiAgICAgIGlmICh0aGlzLl9lbGVtZW50LmRpc2FibGVkIHx8ICQodGhpcy5fZWxlbWVudCkuaGFzQ2xhc3MoQ2xhc3NOYW1lJDQuRElTQUJMRUQpIHx8ICQodGhpcy5fbWVudSkuaGFzQ2xhc3MoQ2xhc3NOYW1lJDQuU0hPVykpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICB2YXIgcmVsYXRlZFRhcmdldCA9IHtcbiAgICAgICAgcmVsYXRlZFRhcmdldDogdGhpcy5fZWxlbWVudFxuICAgICAgfTtcbiAgICAgIHZhciBzaG93RXZlbnQgPSAkLkV2ZW50KEV2ZW50JDQuU0hPVywgcmVsYXRlZFRhcmdldCk7XG5cbiAgICAgIHZhciBwYXJlbnQgPSBEcm9wZG93bi5fZ2V0UGFyZW50RnJvbUVsZW1lbnQodGhpcy5fZWxlbWVudCk7XG5cbiAgICAgICQocGFyZW50KS50cmlnZ2VyKHNob3dFdmVudCk7XG5cbiAgICAgIGlmIChzaG93RXZlbnQuaXNEZWZhdWx0UHJldmVudGVkKCkpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICAkKHRoaXMuX21lbnUpLnRvZ2dsZUNsYXNzKENsYXNzTmFtZSQ0LlNIT1cpO1xuICAgICAgJChwYXJlbnQpLnRvZ2dsZUNsYXNzKENsYXNzTmFtZSQ0LlNIT1cpLnRyaWdnZXIoJC5FdmVudChFdmVudCQ0LlNIT1dOLCByZWxhdGVkVGFyZ2V0KSk7XG4gICAgfTtcblxuICAgIF9wcm90by5oaWRlID0gZnVuY3Rpb24gaGlkZSgpIHtcbiAgICAgIGlmICh0aGlzLl9lbGVtZW50LmRpc2FibGVkIHx8ICQodGhpcy5fZWxlbWVudCkuaGFzQ2xhc3MoQ2xhc3NOYW1lJDQuRElTQUJMRUQpIHx8ICEkKHRoaXMuX21lbnUpLmhhc0NsYXNzKENsYXNzTmFtZSQ0LlNIT1cpKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgdmFyIHJlbGF0ZWRUYXJnZXQgPSB7XG4gICAgICAgIHJlbGF0ZWRUYXJnZXQ6IHRoaXMuX2VsZW1lbnRcbiAgICAgIH07XG4gICAgICB2YXIgaGlkZUV2ZW50ID0gJC5FdmVudChFdmVudCQ0LkhJREUsIHJlbGF0ZWRUYXJnZXQpO1xuXG4gICAgICB2YXIgcGFyZW50ID0gRHJvcGRvd24uX2dldFBhcmVudEZyb21FbGVtZW50KHRoaXMuX2VsZW1lbnQpO1xuXG4gICAgICAkKHBhcmVudCkudHJpZ2dlcihoaWRlRXZlbnQpO1xuXG4gICAgICBpZiAoaGlkZUV2ZW50LmlzRGVmYXVsdFByZXZlbnRlZCgpKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgJCh0aGlzLl9tZW51KS50b2dnbGVDbGFzcyhDbGFzc05hbWUkNC5TSE9XKTtcbiAgICAgICQocGFyZW50KS50b2dnbGVDbGFzcyhDbGFzc05hbWUkNC5TSE9XKS50cmlnZ2VyKCQuRXZlbnQoRXZlbnQkNC5ISURERU4sIHJlbGF0ZWRUYXJnZXQpKTtcbiAgICB9O1xuXG4gICAgX3Byb3RvLmRpc3Bvc2UgPSBmdW5jdGlvbiBkaXNwb3NlKCkge1xuICAgICAgJC5yZW1vdmVEYXRhKHRoaXMuX2VsZW1lbnQsIERBVEFfS0VZJDQpO1xuICAgICAgJCh0aGlzLl9lbGVtZW50KS5vZmYoRVZFTlRfS0VZJDQpO1xuICAgICAgdGhpcy5fZWxlbWVudCA9IG51bGw7XG4gICAgICB0aGlzLl9tZW51ID0gbnVsbDtcblxuICAgICAgaWYgKHRoaXMuX3BvcHBlciAhPT0gbnVsbCkge1xuICAgICAgICB0aGlzLl9wb3BwZXIuZGVzdHJveSgpO1xuXG4gICAgICAgIHRoaXMuX3BvcHBlciA9IG51bGw7XG4gICAgICB9XG4gICAgfTtcblxuICAgIF9wcm90by51cGRhdGUgPSBmdW5jdGlvbiB1cGRhdGUoKSB7XG4gICAgICB0aGlzLl9pbk5hdmJhciA9IHRoaXMuX2RldGVjdE5hdmJhcigpO1xuXG4gICAgICBpZiAodGhpcy5fcG9wcGVyICE9PSBudWxsKSB7XG4gICAgICAgIHRoaXMuX3BvcHBlci5zY2hlZHVsZVVwZGF0ZSgpO1xuICAgICAgfVxuICAgIH07IC8vIFByaXZhdGVcblxuXG4gICAgX3Byb3RvLl9hZGRFdmVudExpc3RlbmVycyA9IGZ1bmN0aW9uIF9hZGRFdmVudExpc3RlbmVycygpIHtcbiAgICAgIHZhciBfdGhpcyA9IHRoaXM7XG5cbiAgICAgICQodGhpcy5fZWxlbWVudCkub24oRXZlbnQkNC5DTElDSywgZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgIGV2ZW50LnN0b3BQcm9wYWdhdGlvbigpO1xuXG4gICAgICAgIF90aGlzLnRvZ2dsZSgpO1xuICAgICAgfSk7XG4gICAgfTtcblxuICAgIF9wcm90by5fZ2V0Q29uZmlnID0gZnVuY3Rpb24gX2dldENvbmZpZyhjb25maWcpIHtcbiAgICAgIGNvbmZpZyA9IF9vYmplY3RTcHJlYWQoe30sIHRoaXMuY29uc3RydWN0b3IuRGVmYXVsdCwgJCh0aGlzLl9lbGVtZW50KS5kYXRhKCksIGNvbmZpZyk7XG4gICAgICBVdGlsLnR5cGVDaGVja0NvbmZpZyhOQU1FJDQsIGNvbmZpZywgdGhpcy5jb25zdHJ1Y3Rvci5EZWZhdWx0VHlwZSk7XG4gICAgICByZXR1cm4gY29uZmlnO1xuICAgIH07XG5cbiAgICBfcHJvdG8uX2dldE1lbnVFbGVtZW50ID0gZnVuY3Rpb24gX2dldE1lbnVFbGVtZW50KCkge1xuICAgICAgaWYgKCF0aGlzLl9tZW51KSB7XG4gICAgICAgIHZhciBwYXJlbnQgPSBEcm9wZG93bi5fZ2V0UGFyZW50RnJvbUVsZW1lbnQodGhpcy5fZWxlbWVudCk7XG5cbiAgICAgICAgaWYgKHBhcmVudCkge1xuICAgICAgICAgIHRoaXMuX21lbnUgPSBwYXJlbnQucXVlcnlTZWxlY3RvcihTZWxlY3RvciQ0Lk1FTlUpO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIHJldHVybiB0aGlzLl9tZW51O1xuICAgIH07XG5cbiAgICBfcHJvdG8uX2dldFBsYWNlbWVudCA9IGZ1bmN0aW9uIF9nZXRQbGFjZW1lbnQoKSB7XG4gICAgICB2YXIgJHBhcmVudERyb3Bkb3duID0gJCh0aGlzLl9lbGVtZW50LnBhcmVudE5vZGUpO1xuICAgICAgdmFyIHBsYWNlbWVudCA9IEF0dGFjaG1lbnRNYXAuQk9UVE9NOyAvLyBIYW5kbGUgZHJvcHVwXG5cbiAgICAgIGlmICgkcGFyZW50RHJvcGRvd24uaGFzQ2xhc3MoQ2xhc3NOYW1lJDQuRFJPUFVQKSkge1xuICAgICAgICBwbGFjZW1lbnQgPSBBdHRhY2htZW50TWFwLlRPUDtcblxuICAgICAgICBpZiAoJCh0aGlzLl9tZW51KS5oYXNDbGFzcyhDbGFzc05hbWUkNC5NRU5VUklHSFQpKSB7XG4gICAgICAgICAgcGxhY2VtZW50ID0gQXR0YWNobWVudE1hcC5UT1BFTkQ7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSBpZiAoJHBhcmVudERyb3Bkb3duLmhhc0NsYXNzKENsYXNzTmFtZSQ0LkRST1BSSUdIVCkpIHtcbiAgICAgICAgcGxhY2VtZW50ID0gQXR0YWNobWVudE1hcC5SSUdIVDtcbiAgICAgIH0gZWxzZSBpZiAoJHBhcmVudERyb3Bkb3duLmhhc0NsYXNzKENsYXNzTmFtZSQ0LkRST1BMRUZUKSkge1xuICAgICAgICBwbGFjZW1lbnQgPSBBdHRhY2htZW50TWFwLkxFRlQ7XG4gICAgICB9IGVsc2UgaWYgKCQodGhpcy5fbWVudSkuaGFzQ2xhc3MoQ2xhc3NOYW1lJDQuTUVOVVJJR0hUKSkge1xuICAgICAgICBwbGFjZW1lbnQgPSBBdHRhY2htZW50TWFwLkJPVFRPTUVORDtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHBsYWNlbWVudDtcbiAgICB9O1xuXG4gICAgX3Byb3RvLl9kZXRlY3ROYXZiYXIgPSBmdW5jdGlvbiBfZGV0ZWN0TmF2YmFyKCkge1xuICAgICAgcmV0dXJuICQodGhpcy5fZWxlbWVudCkuY2xvc2VzdCgnLm5hdmJhcicpLmxlbmd0aCA+IDA7XG4gICAgfTtcblxuICAgIF9wcm90by5fZ2V0UG9wcGVyQ29uZmlnID0gZnVuY3Rpb24gX2dldFBvcHBlckNvbmZpZygpIHtcbiAgICAgIHZhciBfdGhpczIgPSB0aGlzO1xuXG4gICAgICB2YXIgb2Zmc2V0Q29uZiA9IHt9O1xuXG4gICAgICBpZiAodHlwZW9mIHRoaXMuX2NvbmZpZy5vZmZzZXQgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgb2Zmc2V0Q29uZi5mbiA9IGZ1bmN0aW9uIChkYXRhKSB7XG4gICAgICAgICAgZGF0YS5vZmZzZXRzID0gX29iamVjdFNwcmVhZCh7fSwgZGF0YS5vZmZzZXRzLCBfdGhpczIuX2NvbmZpZy5vZmZzZXQoZGF0YS5vZmZzZXRzKSB8fCB7fSk7XG4gICAgICAgICAgcmV0dXJuIGRhdGE7XG4gICAgICAgIH07XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBvZmZzZXRDb25mLm9mZnNldCA9IHRoaXMuX2NvbmZpZy5vZmZzZXQ7XG4gICAgICB9XG5cbiAgICAgIHZhciBwb3BwZXJDb25maWcgPSB7XG4gICAgICAgIHBsYWNlbWVudDogdGhpcy5fZ2V0UGxhY2VtZW50KCksXG4gICAgICAgIG1vZGlmaWVyczoge1xuICAgICAgICAgIG9mZnNldDogb2Zmc2V0Q29uZixcbiAgICAgICAgICBmbGlwOiB7XG4gICAgICAgICAgICBlbmFibGVkOiB0aGlzLl9jb25maWcuZmxpcFxuICAgICAgICAgIH0sXG4gICAgICAgICAgcHJldmVudE92ZXJmbG93OiB7XG4gICAgICAgICAgICBib3VuZGFyaWVzRWxlbWVudDogdGhpcy5fY29uZmlnLmJvdW5kYXJ5XG4gICAgICAgICAgfVxuICAgICAgICB9IC8vIERpc2FibGUgUG9wcGVyLmpzIGlmIHdlIGhhdmUgYSBzdGF0aWMgZGlzcGxheVxuXG4gICAgICB9O1xuXG4gICAgICBpZiAodGhpcy5fY29uZmlnLmRpc3BsYXkgPT09ICdzdGF0aWMnKSB7XG4gICAgICAgIHBvcHBlckNvbmZpZy5tb2RpZmllcnMuYXBwbHlTdHlsZSA9IHtcbiAgICAgICAgICBlbmFibGVkOiBmYWxzZVxuICAgICAgICB9O1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gcG9wcGVyQ29uZmlnO1xuICAgIH07IC8vIFN0YXRpY1xuXG5cbiAgICBEcm9wZG93bi5falF1ZXJ5SW50ZXJmYWNlID0gZnVuY3Rpb24gX2pRdWVyeUludGVyZmFjZShjb25maWcpIHtcbiAgICAgIHJldHVybiB0aGlzLmVhY2goZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgZGF0YSA9ICQodGhpcykuZGF0YShEQVRBX0tFWSQ0KTtcblxuICAgICAgICB2YXIgX2NvbmZpZyA9IHR5cGVvZiBjb25maWcgPT09ICdvYmplY3QnID8gY29uZmlnIDogbnVsbDtcblxuICAgICAgICBpZiAoIWRhdGEpIHtcbiAgICAgICAgICBkYXRhID0gbmV3IERyb3Bkb3duKHRoaXMsIF9jb25maWcpO1xuICAgICAgICAgICQodGhpcykuZGF0YShEQVRBX0tFWSQ0LCBkYXRhKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh0eXBlb2YgY29uZmlnID09PSAnc3RyaW5nJykge1xuICAgICAgICAgIGlmICh0eXBlb2YgZGF0YVtjb25maWddID09PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihcIk5vIG1ldGhvZCBuYW1lZCBcXFwiXCIgKyBjb25maWcgKyBcIlxcXCJcIik7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgZGF0YVtjb25maWddKCk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH07XG5cbiAgICBEcm9wZG93bi5fY2xlYXJNZW51cyA9IGZ1bmN0aW9uIF9jbGVhck1lbnVzKGV2ZW50KSB7XG4gICAgICBpZiAoZXZlbnQgJiYgKGV2ZW50LndoaWNoID09PSBSSUdIVF9NT1VTRV9CVVRUT05fV0hJQ0ggfHwgZXZlbnQudHlwZSA9PT0gJ2tleXVwJyAmJiBldmVudC53aGljaCAhPT0gVEFCX0tFWUNPREUpKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgdmFyIHRvZ2dsZXMgPSBbXS5zbGljZS5jYWxsKGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoU2VsZWN0b3IkNC5EQVRBX1RPR0dMRSkpO1xuXG4gICAgICBmb3IgKHZhciBpID0gMCwgbGVuID0gdG9nZ2xlcy5sZW5ndGg7IGkgPCBsZW47IGkrKykge1xuICAgICAgICB2YXIgcGFyZW50ID0gRHJvcGRvd24uX2dldFBhcmVudEZyb21FbGVtZW50KHRvZ2dsZXNbaV0pO1xuXG4gICAgICAgIHZhciBjb250ZXh0ID0gJCh0b2dnbGVzW2ldKS5kYXRhKERBVEFfS0VZJDQpO1xuICAgICAgICB2YXIgcmVsYXRlZFRhcmdldCA9IHtcbiAgICAgICAgICByZWxhdGVkVGFyZ2V0OiB0b2dnbGVzW2ldXG4gICAgICAgIH07XG5cbiAgICAgICAgaWYgKGV2ZW50ICYmIGV2ZW50LnR5cGUgPT09ICdjbGljaycpIHtcbiAgICAgICAgICByZWxhdGVkVGFyZ2V0LmNsaWNrRXZlbnQgPSBldmVudDtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICghY29udGV4dCkge1xuICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG5cbiAgICAgICAgdmFyIGRyb3Bkb3duTWVudSA9IGNvbnRleHQuX21lbnU7XG5cbiAgICAgICAgaWYgKCEkKHBhcmVudCkuaGFzQ2xhc3MoQ2xhc3NOYW1lJDQuU0hPVykpIHtcbiAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChldmVudCAmJiAoZXZlbnQudHlwZSA9PT0gJ2NsaWNrJyAmJiAvaW5wdXR8dGV4dGFyZWEvaS50ZXN0KGV2ZW50LnRhcmdldC50YWdOYW1lKSB8fCBldmVudC50eXBlID09PSAna2V5dXAnICYmIGV2ZW50LndoaWNoID09PSBUQUJfS0VZQ09ERSkgJiYgJC5jb250YWlucyhwYXJlbnQsIGV2ZW50LnRhcmdldCkpIHtcbiAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfVxuXG4gICAgICAgIHZhciBoaWRlRXZlbnQgPSAkLkV2ZW50KEV2ZW50JDQuSElERSwgcmVsYXRlZFRhcmdldCk7XG4gICAgICAgICQocGFyZW50KS50cmlnZ2VyKGhpZGVFdmVudCk7XG5cbiAgICAgICAgaWYgKGhpZGVFdmVudC5pc0RlZmF1bHRQcmV2ZW50ZWQoKSkge1xuICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9IC8vIElmIHRoaXMgaXMgYSB0b3VjaC1lbmFibGVkIGRldmljZSB3ZSByZW1vdmUgdGhlIGV4dHJhXG4gICAgICAgIC8vIGVtcHR5IG1vdXNlb3ZlciBsaXN0ZW5lcnMgd2UgYWRkZWQgZm9yIGlPUyBzdXBwb3J0XG5cblxuICAgICAgICBpZiAoJ29udG91Y2hzdGFydCcgaW4gZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50KSB7XG4gICAgICAgICAgJChkb2N1bWVudC5ib2R5KS5jaGlsZHJlbigpLm9mZignbW91c2VvdmVyJywgbnVsbCwgJC5ub29wKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRvZ2dsZXNbaV0uc2V0QXR0cmlidXRlKCdhcmlhLWV4cGFuZGVkJywgJ2ZhbHNlJyk7XG4gICAgICAgICQoZHJvcGRvd25NZW51KS5yZW1vdmVDbGFzcyhDbGFzc05hbWUkNC5TSE9XKTtcbiAgICAgICAgJChwYXJlbnQpLnJlbW92ZUNsYXNzKENsYXNzTmFtZSQ0LlNIT1cpLnRyaWdnZXIoJC5FdmVudChFdmVudCQ0LkhJRERFTiwgcmVsYXRlZFRhcmdldCkpO1xuICAgICAgfVxuICAgIH07XG5cbiAgICBEcm9wZG93bi5fZ2V0UGFyZW50RnJvbUVsZW1lbnQgPSBmdW5jdGlvbiBfZ2V0UGFyZW50RnJvbUVsZW1lbnQoZWxlbWVudCkge1xuICAgICAgdmFyIHBhcmVudDtcbiAgICAgIHZhciBzZWxlY3RvciA9IFV0aWwuZ2V0U2VsZWN0b3JGcm9tRWxlbWVudChlbGVtZW50KTtcblxuICAgICAgaWYgKHNlbGVjdG9yKSB7XG4gICAgICAgIHBhcmVudCA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3Ioc2VsZWN0b3IpO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gcGFyZW50IHx8IGVsZW1lbnQucGFyZW50Tm9kZTtcbiAgICB9OyAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgY29tcGxleGl0eVxuXG5cbiAgICBEcm9wZG93bi5fZGF0YUFwaUtleWRvd25IYW5kbGVyID0gZnVuY3Rpb24gX2RhdGFBcGlLZXlkb3duSGFuZGxlcihldmVudCkge1xuICAgICAgLy8gSWYgbm90IGlucHV0L3RleHRhcmVhOlxuICAgICAgLy8gIC0gQW5kIG5vdCBhIGtleSBpbiBSRUdFWFBfS0VZRE9XTiA9PiBub3QgYSBkcm9wZG93biBjb21tYW5kXG4gICAgICAvLyBJZiBpbnB1dC90ZXh0YXJlYTpcbiAgICAgIC8vICAtIElmIHNwYWNlIGtleSA9PiBub3QgYSBkcm9wZG93biBjb21tYW5kXG4gICAgICAvLyAgLSBJZiBrZXkgaXMgb3RoZXIgdGhhbiBlc2NhcGVcbiAgICAgIC8vICAgIC0gSWYga2V5IGlzIG5vdCB1cCBvciBkb3duID0+IG5vdCBhIGRyb3Bkb3duIGNvbW1hbmRcbiAgICAgIC8vICAgIC0gSWYgdHJpZ2dlciBpbnNpZGUgdGhlIG1lbnUgPT4gbm90IGEgZHJvcGRvd24gY29tbWFuZFxuICAgICAgaWYgKC9pbnB1dHx0ZXh0YXJlYS9pLnRlc3QoZXZlbnQudGFyZ2V0LnRhZ05hbWUpID8gZXZlbnQud2hpY2ggPT09IFNQQUNFX0tFWUNPREUgfHwgZXZlbnQud2hpY2ggIT09IEVTQ0FQRV9LRVlDT0RFICYmIChldmVudC53aGljaCAhPT0gQVJST1dfRE9XTl9LRVlDT0RFICYmIGV2ZW50LndoaWNoICE9PSBBUlJPV19VUF9LRVlDT0RFIHx8ICQoZXZlbnQudGFyZ2V0KS5jbG9zZXN0KFNlbGVjdG9yJDQuTUVOVSkubGVuZ3RoKSA6ICFSRUdFWFBfS0VZRE9XTi50ZXN0KGV2ZW50LndoaWNoKSkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICBldmVudC5zdG9wUHJvcGFnYXRpb24oKTtcblxuICAgICAgaWYgKHRoaXMuZGlzYWJsZWQgfHwgJCh0aGlzKS5oYXNDbGFzcyhDbGFzc05hbWUkNC5ESVNBQkxFRCkpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICB2YXIgcGFyZW50ID0gRHJvcGRvd24uX2dldFBhcmVudEZyb21FbGVtZW50KHRoaXMpO1xuXG4gICAgICB2YXIgaXNBY3RpdmUgPSAkKHBhcmVudCkuaGFzQ2xhc3MoQ2xhc3NOYW1lJDQuU0hPVyk7XG5cbiAgICAgIGlmICghaXNBY3RpdmUgfHwgaXNBY3RpdmUgJiYgKGV2ZW50LndoaWNoID09PSBFU0NBUEVfS0VZQ09ERSB8fCBldmVudC53aGljaCA9PT0gU1BBQ0VfS0VZQ09ERSkpIHtcbiAgICAgICAgaWYgKGV2ZW50LndoaWNoID09PSBFU0NBUEVfS0VZQ09ERSkge1xuICAgICAgICAgIHZhciB0b2dnbGUgPSBwYXJlbnQucXVlcnlTZWxlY3RvcihTZWxlY3RvciQ0LkRBVEFfVE9HR0xFKTtcbiAgICAgICAgICAkKHRvZ2dsZSkudHJpZ2dlcignZm9jdXMnKTtcbiAgICAgICAgfVxuXG4gICAgICAgICQodGhpcykudHJpZ2dlcignY2xpY2snKTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICB2YXIgaXRlbXMgPSBbXS5zbGljZS5jYWxsKHBhcmVudC5xdWVyeVNlbGVjdG9yQWxsKFNlbGVjdG9yJDQuVklTSUJMRV9JVEVNUykpO1xuXG4gICAgICBpZiAoaXRlbXMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgdmFyIGluZGV4ID0gaXRlbXMuaW5kZXhPZihldmVudC50YXJnZXQpO1xuXG4gICAgICBpZiAoZXZlbnQud2hpY2ggPT09IEFSUk9XX1VQX0tFWUNPREUgJiYgaW5kZXggPiAwKSB7XG4gICAgICAgIC8vIFVwXG4gICAgICAgIGluZGV4LS07XG4gICAgICB9XG5cbiAgICAgIGlmIChldmVudC53aGljaCA9PT0gQVJST1dfRE9XTl9LRVlDT0RFICYmIGluZGV4IDwgaXRlbXMubGVuZ3RoIC0gMSkge1xuICAgICAgICAvLyBEb3duXG4gICAgICAgIGluZGV4Kys7XG4gICAgICB9XG5cbiAgICAgIGlmIChpbmRleCA8IDApIHtcbiAgICAgICAgaW5kZXggPSAwO1xuICAgICAgfVxuXG4gICAgICBpdGVtc1tpbmRleF0uZm9jdXMoKTtcbiAgICB9O1xuXG4gICAgX2NyZWF0ZUNsYXNzKERyb3Bkb3duLCBudWxsLCBbe1xuICAgICAga2V5OiBcIlZFUlNJT05cIixcbiAgICAgIGdldDogZnVuY3Rpb24gZ2V0KCkge1xuICAgICAgICByZXR1cm4gVkVSU0lPTiQ0O1xuICAgICAgfVxuICAgIH0sIHtcbiAgICAgIGtleTogXCJEZWZhdWx0XCIsXG4gICAgICBnZXQ6IGZ1bmN0aW9uIGdldCgpIHtcbiAgICAgICAgcmV0dXJuIERlZmF1bHQkMjtcbiAgICAgIH1cbiAgICB9LCB7XG4gICAgICBrZXk6IFwiRGVmYXVsdFR5cGVcIixcbiAgICAgIGdldDogZnVuY3Rpb24gZ2V0KCkge1xuICAgICAgICByZXR1cm4gRGVmYXVsdFR5cGUkMjtcbiAgICAgIH1cbiAgICB9XSk7XG5cbiAgICByZXR1cm4gRHJvcGRvd247XG4gIH0oKTtcbiAgLyoqXG4gICAqIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgKiBEYXRhIEFwaSBpbXBsZW1lbnRhdGlvblxuICAgKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICovXG5cblxuICAkKGRvY3VtZW50KS5vbihFdmVudCQ0LktFWURPV05fREFUQV9BUEksIFNlbGVjdG9yJDQuREFUQV9UT0dHTEUsIERyb3Bkb3duLl9kYXRhQXBpS2V5ZG93bkhhbmRsZXIpLm9uKEV2ZW50JDQuS0VZRE9XTl9EQVRBX0FQSSwgU2VsZWN0b3IkNC5NRU5VLCBEcm9wZG93bi5fZGF0YUFwaUtleWRvd25IYW5kbGVyKS5vbihFdmVudCQ0LkNMSUNLX0RBVEFfQVBJICsgXCIgXCIgKyBFdmVudCQ0LktFWVVQX0RBVEFfQVBJLCBEcm9wZG93bi5fY2xlYXJNZW51cykub24oRXZlbnQkNC5DTElDS19EQVRBX0FQSSwgU2VsZWN0b3IkNC5EQVRBX1RPR0dMRSwgZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgICBldmVudC5zdG9wUHJvcGFnYXRpb24oKTtcblxuICAgIERyb3Bkb3duLl9qUXVlcnlJbnRlcmZhY2UuY2FsbCgkKHRoaXMpLCAndG9nZ2xlJyk7XG4gIH0pLm9uKEV2ZW50JDQuQ0xJQ0tfREFUQV9BUEksIFNlbGVjdG9yJDQuRk9STV9DSElMRCwgZnVuY3Rpb24gKGUpIHtcbiAgICBlLnN0b3BQcm9wYWdhdGlvbigpO1xuICB9KTtcbiAgLyoqXG4gICAqIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgKiBqUXVlcnlcbiAgICogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAqL1xuXG4gICQuZm5bTkFNRSQ0XSA9IERyb3Bkb3duLl9qUXVlcnlJbnRlcmZhY2U7XG4gICQuZm5bTkFNRSQ0XS5Db25zdHJ1Y3RvciA9IERyb3Bkb3duO1xuXG4gICQuZm5bTkFNRSQ0XS5ub0NvbmZsaWN0ID0gZnVuY3Rpb24gKCkge1xuICAgICQuZm5bTkFNRSQ0XSA9IEpRVUVSWV9OT19DT05GTElDVCQ0O1xuICAgIHJldHVybiBEcm9wZG93bi5falF1ZXJ5SW50ZXJmYWNlO1xuICB9O1xuXG4gIC8qKlxuICAgKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICogQ29uc3RhbnRzXG4gICAqIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgKi9cblxuICB2YXIgTkFNRSQ1ID0gJ21vZGFsJztcbiAgdmFyIFZFUlNJT04kNSA9ICc0LjIuMSc7XG4gIHZhciBEQVRBX0tFWSQ1ID0gJ2JzLm1vZGFsJztcbiAgdmFyIEVWRU5UX0tFWSQ1ID0gXCIuXCIgKyBEQVRBX0tFWSQ1O1xuICB2YXIgREFUQV9BUElfS0VZJDUgPSAnLmRhdGEtYXBpJztcbiAgdmFyIEpRVUVSWV9OT19DT05GTElDVCQ1ID0gJC5mbltOQU1FJDVdO1xuICB2YXIgRVNDQVBFX0tFWUNPREUkMSA9IDI3OyAvLyBLZXlib2FyZEV2ZW50LndoaWNoIHZhbHVlIGZvciBFc2NhcGUgKEVzYykga2V5XG5cbiAgdmFyIERlZmF1bHQkMyA9IHtcbiAgICBiYWNrZHJvcDogdHJ1ZSxcbiAgICBrZXlib2FyZDogdHJ1ZSxcbiAgICBmb2N1czogdHJ1ZSxcbiAgICBzaG93OiB0cnVlXG4gIH07XG4gIHZhciBEZWZhdWx0VHlwZSQzID0ge1xuICAgIGJhY2tkcm9wOiAnKGJvb2xlYW58c3RyaW5nKScsXG4gICAga2V5Ym9hcmQ6ICdib29sZWFuJyxcbiAgICBmb2N1czogJ2Jvb2xlYW4nLFxuICAgIHNob3c6ICdib29sZWFuJ1xuICB9O1xuICB2YXIgRXZlbnQkNSA9IHtcbiAgICBISURFOiBcImhpZGVcIiArIEVWRU5UX0tFWSQ1LFxuICAgIEhJRERFTjogXCJoaWRkZW5cIiArIEVWRU5UX0tFWSQ1LFxuICAgIFNIT1c6IFwic2hvd1wiICsgRVZFTlRfS0VZJDUsXG4gICAgU0hPV046IFwic2hvd25cIiArIEVWRU5UX0tFWSQ1LFxuICAgIEZPQ1VTSU46IFwiZm9jdXNpblwiICsgRVZFTlRfS0VZJDUsXG4gICAgUkVTSVpFOiBcInJlc2l6ZVwiICsgRVZFTlRfS0VZJDUsXG4gICAgQ0xJQ0tfRElTTUlTUzogXCJjbGljay5kaXNtaXNzXCIgKyBFVkVOVF9LRVkkNSxcbiAgICBLRVlET1dOX0RJU01JU1M6IFwia2V5ZG93bi5kaXNtaXNzXCIgKyBFVkVOVF9LRVkkNSxcbiAgICBNT1VTRVVQX0RJU01JU1M6IFwibW91c2V1cC5kaXNtaXNzXCIgKyBFVkVOVF9LRVkkNSxcbiAgICBNT1VTRURPV05fRElTTUlTUzogXCJtb3VzZWRvd24uZGlzbWlzc1wiICsgRVZFTlRfS0VZJDUsXG4gICAgQ0xJQ0tfREFUQV9BUEk6IFwiY2xpY2tcIiArIEVWRU5UX0tFWSQ1ICsgREFUQV9BUElfS0VZJDVcbiAgfTtcbiAgdmFyIENsYXNzTmFtZSQ1ID0ge1xuICAgIFNDUk9MTEJBUl9NRUFTVVJFUjogJ21vZGFsLXNjcm9sbGJhci1tZWFzdXJlJyxcbiAgICBCQUNLRFJPUDogJ21vZGFsLWJhY2tkcm9wJyxcbiAgICBPUEVOOiAnbW9kYWwtb3BlbicsXG4gICAgRkFERTogJ2ZhZGUnLFxuICAgIFNIT1c6ICdzaG93J1xuICB9O1xuICB2YXIgU2VsZWN0b3IkNSA9IHtcbiAgICBESUFMT0c6ICcubW9kYWwtZGlhbG9nJyxcbiAgICBEQVRBX1RPR0dMRTogJ1tkYXRhLXRvZ2dsZT1cIm1vZGFsXCJdJyxcbiAgICBEQVRBX0RJU01JU1M6ICdbZGF0YS1kaXNtaXNzPVwibW9kYWxcIl0nLFxuICAgIEZJWEVEX0NPTlRFTlQ6ICcuZml4ZWQtdG9wLCAuZml4ZWQtYm90dG9tLCAuaXMtZml4ZWQsIC5zdGlja3ktdG9wJyxcbiAgICBTVElDS1lfQ09OVEVOVDogJy5zdGlja3ktdG9wJ1xuICAgIC8qKlxuICAgICAqIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgICAqIENsYXNzIERlZmluaXRpb25cbiAgICAgKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICAgKi9cblxuICB9O1xuXG4gIHZhciBNb2RhbCA9XG4gIC8qI19fUFVSRV9fKi9cbiAgZnVuY3Rpb24gKCkge1xuICAgIGZ1bmN0aW9uIE1vZGFsKGVsZW1lbnQsIGNvbmZpZykge1xuICAgICAgdGhpcy5fY29uZmlnID0gdGhpcy5fZ2V0Q29uZmlnKGNvbmZpZyk7XG4gICAgICB0aGlzLl9lbGVtZW50ID0gZWxlbWVudDtcbiAgICAgIHRoaXMuX2RpYWxvZyA9IGVsZW1lbnQucXVlcnlTZWxlY3RvcihTZWxlY3RvciQ1LkRJQUxPRyk7XG4gICAgICB0aGlzLl9iYWNrZHJvcCA9IG51bGw7XG4gICAgICB0aGlzLl9pc1Nob3duID0gZmFsc2U7XG4gICAgICB0aGlzLl9pc0JvZHlPdmVyZmxvd2luZyA9IGZhbHNlO1xuICAgICAgdGhpcy5faWdub3JlQmFja2Ryb3BDbGljayA9IGZhbHNlO1xuICAgICAgdGhpcy5faXNUcmFuc2l0aW9uaW5nID0gZmFsc2U7XG4gICAgICB0aGlzLl9zY3JvbGxiYXJXaWR0aCA9IDA7XG4gICAgfSAvLyBHZXR0ZXJzXG5cblxuICAgIHZhciBfcHJvdG8gPSBNb2RhbC5wcm90b3R5cGU7XG5cbiAgICAvLyBQdWJsaWNcbiAgICBfcHJvdG8udG9nZ2xlID0gZnVuY3Rpb24gdG9nZ2xlKHJlbGF0ZWRUYXJnZXQpIHtcbiAgICAgIHJldHVybiB0aGlzLl9pc1Nob3duID8gdGhpcy5oaWRlKCkgOiB0aGlzLnNob3cocmVsYXRlZFRhcmdldCk7XG4gICAgfTtcblxuICAgIF9wcm90by5zaG93ID0gZnVuY3Rpb24gc2hvdyhyZWxhdGVkVGFyZ2V0KSB7XG4gICAgICB2YXIgX3RoaXMgPSB0aGlzO1xuXG4gICAgICBpZiAodGhpcy5faXNTaG93biB8fCB0aGlzLl9pc1RyYW5zaXRpb25pbmcpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICBpZiAoJCh0aGlzLl9lbGVtZW50KS5oYXNDbGFzcyhDbGFzc05hbWUkNS5GQURFKSkge1xuICAgICAgICB0aGlzLl9pc1RyYW5zaXRpb25pbmcgPSB0cnVlO1xuICAgICAgfVxuXG4gICAgICB2YXIgc2hvd0V2ZW50ID0gJC5FdmVudChFdmVudCQ1LlNIT1csIHtcbiAgICAgICAgcmVsYXRlZFRhcmdldDogcmVsYXRlZFRhcmdldFxuICAgICAgfSk7XG4gICAgICAkKHRoaXMuX2VsZW1lbnQpLnRyaWdnZXIoc2hvd0V2ZW50KTtcblxuICAgICAgaWYgKHRoaXMuX2lzU2hvd24gfHwgc2hvd0V2ZW50LmlzRGVmYXVsdFByZXZlbnRlZCgpKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgdGhpcy5faXNTaG93biA9IHRydWU7XG5cbiAgICAgIHRoaXMuX2NoZWNrU2Nyb2xsYmFyKCk7XG5cbiAgICAgIHRoaXMuX3NldFNjcm9sbGJhcigpO1xuXG4gICAgICB0aGlzLl9hZGp1c3REaWFsb2coKTtcblxuICAgICAgdGhpcy5fc2V0RXNjYXBlRXZlbnQoKTtcblxuICAgICAgdGhpcy5fc2V0UmVzaXplRXZlbnQoKTtcblxuICAgICAgJCh0aGlzLl9lbGVtZW50KS5vbihFdmVudCQ1LkNMSUNLX0RJU01JU1MsIFNlbGVjdG9yJDUuREFUQV9ESVNNSVNTLCBmdW5jdGlvbiAoZXZlbnQpIHtcbiAgICAgICAgcmV0dXJuIF90aGlzLmhpZGUoZXZlbnQpO1xuICAgICAgfSk7XG4gICAgICAkKHRoaXMuX2RpYWxvZykub24oRXZlbnQkNS5NT1VTRURPV05fRElTTUlTUywgZnVuY3Rpb24gKCkge1xuICAgICAgICAkKF90aGlzLl9lbGVtZW50KS5vbmUoRXZlbnQkNS5NT1VTRVVQX0RJU01JU1MsIGZ1bmN0aW9uIChldmVudCkge1xuICAgICAgICAgIGlmICgkKGV2ZW50LnRhcmdldCkuaXMoX3RoaXMuX2VsZW1lbnQpKSB7XG4gICAgICAgICAgICBfdGhpcy5faWdub3JlQmFja2Ryb3BDbGljayA9IHRydWU7XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgIH0pO1xuXG4gICAgICB0aGlzLl9zaG93QmFja2Ryb3AoZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gX3RoaXMuX3Nob3dFbGVtZW50KHJlbGF0ZWRUYXJnZXQpO1xuICAgICAgfSk7XG4gICAgfTtcblxuICAgIF9wcm90by5oaWRlID0gZnVuY3Rpb24gaGlkZShldmVudCkge1xuICAgICAgdmFyIF90aGlzMiA9IHRoaXM7XG5cbiAgICAgIGlmIChldmVudCkge1xuICAgICAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgfVxuXG4gICAgICBpZiAoIXRoaXMuX2lzU2hvd24gfHwgdGhpcy5faXNUcmFuc2l0aW9uaW5nKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgdmFyIGhpZGVFdmVudCA9ICQuRXZlbnQoRXZlbnQkNS5ISURFKTtcbiAgICAgICQodGhpcy5fZWxlbWVudCkudHJpZ2dlcihoaWRlRXZlbnQpO1xuXG4gICAgICBpZiAoIXRoaXMuX2lzU2hvd24gfHwgaGlkZUV2ZW50LmlzRGVmYXVsdFByZXZlbnRlZCgpKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgdGhpcy5faXNTaG93biA9IGZhbHNlO1xuICAgICAgdmFyIHRyYW5zaXRpb24gPSAkKHRoaXMuX2VsZW1lbnQpLmhhc0NsYXNzKENsYXNzTmFtZSQ1LkZBREUpO1xuXG4gICAgICBpZiAodHJhbnNpdGlvbikge1xuICAgICAgICB0aGlzLl9pc1RyYW5zaXRpb25pbmcgPSB0cnVlO1xuICAgICAgfVxuXG4gICAgICB0aGlzLl9zZXRFc2NhcGVFdmVudCgpO1xuXG4gICAgICB0aGlzLl9zZXRSZXNpemVFdmVudCgpO1xuXG4gICAgICAkKGRvY3VtZW50KS5vZmYoRXZlbnQkNS5GT0NVU0lOKTtcbiAgICAgICQodGhpcy5fZWxlbWVudCkucmVtb3ZlQ2xhc3MoQ2xhc3NOYW1lJDUuU0hPVyk7XG4gICAgICAkKHRoaXMuX2VsZW1lbnQpLm9mZihFdmVudCQ1LkNMSUNLX0RJU01JU1MpO1xuICAgICAgJCh0aGlzLl9kaWFsb2cpLm9mZihFdmVudCQ1Lk1PVVNFRE9XTl9ESVNNSVNTKTtcblxuICAgICAgaWYgKHRyYW5zaXRpb24pIHtcbiAgICAgICAgdmFyIHRyYW5zaXRpb25EdXJhdGlvbiA9IFV0aWwuZ2V0VHJhbnNpdGlvbkR1cmF0aW9uRnJvbUVsZW1lbnQodGhpcy5fZWxlbWVudCk7XG4gICAgICAgICQodGhpcy5fZWxlbWVudCkub25lKFV0aWwuVFJBTlNJVElPTl9FTkQsIGZ1bmN0aW9uIChldmVudCkge1xuICAgICAgICAgIHJldHVybiBfdGhpczIuX2hpZGVNb2RhbChldmVudCk7XG4gICAgICAgIH0pLmVtdWxhdGVUcmFuc2l0aW9uRW5kKHRyYW5zaXRpb25EdXJhdGlvbik7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLl9oaWRlTW9kYWwoKTtcbiAgICAgIH1cbiAgICB9O1xuXG4gICAgX3Byb3RvLmRpc3Bvc2UgPSBmdW5jdGlvbiBkaXNwb3NlKCkge1xuICAgICAgW3dpbmRvdywgdGhpcy5fZWxlbWVudCwgdGhpcy5fZGlhbG9nXS5mb3JFYWNoKGZ1bmN0aW9uIChodG1sRWxlbWVudCkge1xuICAgICAgICByZXR1cm4gJChodG1sRWxlbWVudCkub2ZmKEVWRU5UX0tFWSQ1KTtcbiAgICAgIH0pO1xuICAgICAgLyoqXG4gICAgICAgKiBgZG9jdW1lbnRgIGhhcyAyIGV2ZW50cyBgRXZlbnQuRk9DVVNJTmAgYW5kIGBFdmVudC5DTElDS19EQVRBX0FQSWBcbiAgICAgICAqIERvIG5vdCBtb3ZlIGBkb2N1bWVudGAgaW4gYGh0bWxFbGVtZW50c2AgYXJyYXlcbiAgICAgICAqIEl0IHdpbGwgcmVtb3ZlIGBFdmVudC5DTElDS19EQVRBX0FQSWAgZXZlbnQgdGhhdCBzaG91bGQgcmVtYWluXG4gICAgICAgKi9cblxuICAgICAgJChkb2N1bWVudCkub2ZmKEV2ZW50JDUuRk9DVVNJTik7XG4gICAgICAkLnJlbW92ZURhdGEodGhpcy5fZWxlbWVudCwgREFUQV9LRVkkNSk7XG4gICAgICB0aGlzLl9jb25maWcgPSBudWxsO1xuICAgICAgdGhpcy5fZWxlbWVudCA9IG51bGw7XG4gICAgICB0aGlzLl9kaWFsb2cgPSBudWxsO1xuICAgICAgdGhpcy5fYmFja2Ryb3AgPSBudWxsO1xuICAgICAgdGhpcy5faXNTaG93biA9IG51bGw7XG4gICAgICB0aGlzLl9pc0JvZHlPdmVyZmxvd2luZyA9IG51bGw7XG4gICAgICB0aGlzLl9pZ25vcmVCYWNrZHJvcENsaWNrID0gbnVsbDtcbiAgICAgIHRoaXMuX2lzVHJhbnNpdGlvbmluZyA9IG51bGw7XG4gICAgICB0aGlzLl9zY3JvbGxiYXJXaWR0aCA9IG51bGw7XG4gICAgfTtcblxuICAgIF9wcm90by5oYW5kbGVVcGRhdGUgPSBmdW5jdGlvbiBoYW5kbGVVcGRhdGUoKSB7XG4gICAgICB0aGlzLl9hZGp1c3REaWFsb2coKTtcbiAgICB9OyAvLyBQcml2YXRlXG5cblxuICAgIF9wcm90by5fZ2V0Q29uZmlnID0gZnVuY3Rpb24gX2dldENvbmZpZyhjb25maWcpIHtcbiAgICAgIGNvbmZpZyA9IF9vYmplY3RTcHJlYWQoe30sIERlZmF1bHQkMywgY29uZmlnKTtcbiAgICAgIFV0aWwudHlwZUNoZWNrQ29uZmlnKE5BTUUkNSwgY29uZmlnLCBEZWZhdWx0VHlwZSQzKTtcbiAgICAgIHJldHVybiBjb25maWc7XG4gICAgfTtcblxuICAgIF9wcm90by5fc2hvd0VsZW1lbnQgPSBmdW5jdGlvbiBfc2hvd0VsZW1lbnQocmVsYXRlZFRhcmdldCkge1xuICAgICAgdmFyIF90aGlzMyA9IHRoaXM7XG5cbiAgICAgIHZhciB0cmFuc2l0aW9uID0gJCh0aGlzLl9lbGVtZW50KS5oYXNDbGFzcyhDbGFzc05hbWUkNS5GQURFKTtcblxuICAgICAgaWYgKCF0aGlzLl9lbGVtZW50LnBhcmVudE5vZGUgfHwgdGhpcy5fZWxlbWVudC5wYXJlbnROb2RlLm5vZGVUeXBlICE9PSBOb2RlLkVMRU1FTlRfTk9ERSkge1xuICAgICAgICAvLyBEb24ndCBtb3ZlIG1vZGFsJ3MgRE9NIHBvc2l0aW9uXG4gICAgICAgIGRvY3VtZW50LmJvZHkuYXBwZW5kQ2hpbGQodGhpcy5fZWxlbWVudCk7XG4gICAgICB9XG5cbiAgICAgIHRoaXMuX2VsZW1lbnQuc3R5bGUuZGlzcGxheSA9ICdibG9jayc7XG5cbiAgICAgIHRoaXMuX2VsZW1lbnQucmVtb3ZlQXR0cmlidXRlKCdhcmlhLWhpZGRlbicpO1xuXG4gICAgICB0aGlzLl9lbGVtZW50LnNldEF0dHJpYnV0ZSgnYXJpYS1tb2RhbCcsIHRydWUpO1xuXG4gICAgICB0aGlzLl9lbGVtZW50LnNjcm9sbFRvcCA9IDA7XG5cbiAgICAgIGlmICh0cmFuc2l0aW9uKSB7XG4gICAgICAgIFV0aWwucmVmbG93KHRoaXMuX2VsZW1lbnQpO1xuICAgICAgfVxuXG4gICAgICAkKHRoaXMuX2VsZW1lbnQpLmFkZENsYXNzKENsYXNzTmFtZSQ1LlNIT1cpO1xuXG4gICAgICBpZiAodGhpcy5fY29uZmlnLmZvY3VzKSB7XG4gICAgICAgIHRoaXMuX2VuZm9yY2VGb2N1cygpO1xuICAgICAgfVxuXG4gICAgICB2YXIgc2hvd25FdmVudCA9ICQuRXZlbnQoRXZlbnQkNS5TSE9XTiwge1xuICAgICAgICByZWxhdGVkVGFyZ2V0OiByZWxhdGVkVGFyZ2V0XG4gICAgICB9KTtcblxuICAgICAgdmFyIHRyYW5zaXRpb25Db21wbGV0ZSA9IGZ1bmN0aW9uIHRyYW5zaXRpb25Db21wbGV0ZSgpIHtcbiAgICAgICAgaWYgKF90aGlzMy5fY29uZmlnLmZvY3VzKSB7XG4gICAgICAgICAgX3RoaXMzLl9lbGVtZW50LmZvY3VzKCk7XG4gICAgICAgIH1cblxuICAgICAgICBfdGhpczMuX2lzVHJhbnNpdGlvbmluZyA9IGZhbHNlO1xuICAgICAgICAkKF90aGlzMy5fZWxlbWVudCkudHJpZ2dlcihzaG93bkV2ZW50KTtcbiAgICAgIH07XG5cbiAgICAgIGlmICh0cmFuc2l0aW9uKSB7XG4gICAgICAgIHZhciB0cmFuc2l0aW9uRHVyYXRpb24gPSBVdGlsLmdldFRyYW5zaXRpb25EdXJhdGlvbkZyb21FbGVtZW50KHRoaXMuX2RpYWxvZyk7XG4gICAgICAgICQodGhpcy5fZGlhbG9nKS5vbmUoVXRpbC5UUkFOU0lUSU9OX0VORCwgdHJhbnNpdGlvbkNvbXBsZXRlKS5lbXVsYXRlVHJhbnNpdGlvbkVuZCh0cmFuc2l0aW9uRHVyYXRpb24pO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdHJhbnNpdGlvbkNvbXBsZXRlKCk7XG4gICAgICB9XG4gICAgfTtcblxuICAgIF9wcm90by5fZW5mb3JjZUZvY3VzID0gZnVuY3Rpb24gX2VuZm9yY2VGb2N1cygpIHtcbiAgICAgIHZhciBfdGhpczQgPSB0aGlzO1xuXG4gICAgICAkKGRvY3VtZW50KS5vZmYoRXZlbnQkNS5GT0NVU0lOKSAvLyBHdWFyZCBhZ2FpbnN0IGluZmluaXRlIGZvY3VzIGxvb3BcbiAgICAgIC5vbihFdmVudCQ1LkZPQ1VTSU4sIGZ1bmN0aW9uIChldmVudCkge1xuICAgICAgICBpZiAoZG9jdW1lbnQgIT09IGV2ZW50LnRhcmdldCAmJiBfdGhpczQuX2VsZW1lbnQgIT09IGV2ZW50LnRhcmdldCAmJiAkKF90aGlzNC5fZWxlbWVudCkuaGFzKGV2ZW50LnRhcmdldCkubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgX3RoaXM0Ll9lbGVtZW50LmZvY3VzKCk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH07XG5cbiAgICBfcHJvdG8uX3NldEVzY2FwZUV2ZW50ID0gZnVuY3Rpb24gX3NldEVzY2FwZUV2ZW50KCkge1xuICAgICAgdmFyIF90aGlzNSA9IHRoaXM7XG5cbiAgICAgIGlmICh0aGlzLl9pc1Nob3duICYmIHRoaXMuX2NvbmZpZy5rZXlib2FyZCkge1xuICAgICAgICAkKHRoaXMuX2VsZW1lbnQpLm9uKEV2ZW50JDUuS0VZRE9XTl9ESVNNSVNTLCBmdW5jdGlvbiAoZXZlbnQpIHtcbiAgICAgICAgICBpZiAoZXZlbnQud2hpY2ggPT09IEVTQ0FQRV9LRVlDT0RFJDEpIHtcbiAgICAgICAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG5cbiAgICAgICAgICAgIF90aGlzNS5oaWRlKCk7XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgIH0gZWxzZSBpZiAoIXRoaXMuX2lzU2hvd24pIHtcbiAgICAgICAgJCh0aGlzLl9lbGVtZW50KS5vZmYoRXZlbnQkNS5LRVlET1dOX0RJU01JU1MpO1xuICAgICAgfVxuICAgIH07XG5cbiAgICBfcHJvdG8uX3NldFJlc2l6ZUV2ZW50ID0gZnVuY3Rpb24gX3NldFJlc2l6ZUV2ZW50KCkge1xuICAgICAgdmFyIF90aGlzNiA9IHRoaXM7XG5cbiAgICAgIGlmICh0aGlzLl9pc1Nob3duKSB7XG4gICAgICAgICQod2luZG93KS5vbihFdmVudCQ1LlJFU0laRSwgZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgICAgICAgcmV0dXJuIF90aGlzNi5oYW5kbGVVcGRhdGUoZXZlbnQpO1xuICAgICAgICB9KTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgICQod2luZG93KS5vZmYoRXZlbnQkNS5SRVNJWkUpO1xuICAgICAgfVxuICAgIH07XG5cbiAgICBfcHJvdG8uX2hpZGVNb2RhbCA9IGZ1bmN0aW9uIF9oaWRlTW9kYWwoKSB7XG4gICAgICB2YXIgX3RoaXM3ID0gdGhpcztcblxuICAgICAgdGhpcy5fZWxlbWVudC5zdHlsZS5kaXNwbGF5ID0gJ25vbmUnO1xuXG4gICAgICB0aGlzLl9lbGVtZW50LnNldEF0dHJpYnV0ZSgnYXJpYS1oaWRkZW4nLCB0cnVlKTtcblxuICAgICAgdGhpcy5fZWxlbWVudC5yZW1vdmVBdHRyaWJ1dGUoJ2FyaWEtbW9kYWwnKTtcblxuICAgICAgdGhpcy5faXNUcmFuc2l0aW9uaW5nID0gZmFsc2U7XG5cbiAgICAgIHRoaXMuX3Nob3dCYWNrZHJvcChmdW5jdGlvbiAoKSB7XG4gICAgICAgICQoZG9jdW1lbnQuYm9keSkucmVtb3ZlQ2xhc3MoQ2xhc3NOYW1lJDUuT1BFTik7XG5cbiAgICAgICAgX3RoaXM3Ll9yZXNldEFkanVzdG1lbnRzKCk7XG5cbiAgICAgICAgX3RoaXM3Ll9yZXNldFNjcm9sbGJhcigpO1xuXG4gICAgICAgICQoX3RoaXM3Ll9lbGVtZW50KS50cmlnZ2VyKEV2ZW50JDUuSElEREVOKTtcbiAgICAgIH0pO1xuICAgIH07XG5cbiAgICBfcHJvdG8uX3JlbW92ZUJhY2tkcm9wID0gZnVuY3Rpb24gX3JlbW92ZUJhY2tkcm9wKCkge1xuICAgICAgaWYgKHRoaXMuX2JhY2tkcm9wKSB7XG4gICAgICAgICQodGhpcy5fYmFja2Ryb3ApLnJlbW92ZSgpO1xuICAgICAgICB0aGlzLl9iYWNrZHJvcCA9IG51bGw7XG4gICAgICB9XG4gICAgfTtcblxuICAgIF9wcm90by5fc2hvd0JhY2tkcm9wID0gZnVuY3Rpb24gX3Nob3dCYWNrZHJvcChjYWxsYmFjaykge1xuICAgICAgdmFyIF90aGlzOCA9IHRoaXM7XG5cbiAgICAgIHZhciBhbmltYXRlID0gJCh0aGlzLl9lbGVtZW50KS5oYXNDbGFzcyhDbGFzc05hbWUkNS5GQURFKSA/IENsYXNzTmFtZSQ1LkZBREUgOiAnJztcblxuICAgICAgaWYgKHRoaXMuX2lzU2hvd24gJiYgdGhpcy5fY29uZmlnLmJhY2tkcm9wKSB7XG4gICAgICAgIHRoaXMuX2JhY2tkcm9wID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4gICAgICAgIHRoaXMuX2JhY2tkcm9wLmNsYXNzTmFtZSA9IENsYXNzTmFtZSQ1LkJBQ0tEUk9QO1xuXG4gICAgICAgIGlmIChhbmltYXRlKSB7XG4gICAgICAgICAgdGhpcy5fYmFja2Ryb3AuY2xhc3NMaXN0LmFkZChhbmltYXRlKTtcbiAgICAgICAgfVxuXG4gICAgICAgICQodGhpcy5fYmFja2Ryb3ApLmFwcGVuZFRvKGRvY3VtZW50LmJvZHkpO1xuICAgICAgICAkKHRoaXMuX2VsZW1lbnQpLm9uKEV2ZW50JDUuQ0xJQ0tfRElTTUlTUywgZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgICAgICAgaWYgKF90aGlzOC5faWdub3JlQmFja2Ryb3BDbGljaykge1xuICAgICAgICAgICAgX3RoaXM4Ll9pZ25vcmVCYWNrZHJvcENsaWNrID0gZmFsc2U7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgaWYgKGV2ZW50LnRhcmdldCAhPT0gZXZlbnQuY3VycmVudFRhcmdldCkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIGlmIChfdGhpczguX2NvbmZpZy5iYWNrZHJvcCA9PT0gJ3N0YXRpYycpIHtcbiAgICAgICAgICAgIF90aGlzOC5fZWxlbWVudC5mb2N1cygpO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBfdGhpczguaGlkZSgpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgaWYgKGFuaW1hdGUpIHtcbiAgICAgICAgICBVdGlsLnJlZmxvdyh0aGlzLl9iYWNrZHJvcCk7XG4gICAgICAgIH1cblxuICAgICAgICAkKHRoaXMuX2JhY2tkcm9wKS5hZGRDbGFzcyhDbGFzc05hbWUkNS5TSE9XKTtcblxuICAgICAgICBpZiAoIWNhbGxiYWNrKSB7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKCFhbmltYXRlKSB7XG4gICAgICAgICAgY2FsbGJhY2soKTtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgYmFja2Ryb3BUcmFuc2l0aW9uRHVyYXRpb24gPSBVdGlsLmdldFRyYW5zaXRpb25EdXJhdGlvbkZyb21FbGVtZW50KHRoaXMuX2JhY2tkcm9wKTtcbiAgICAgICAgJCh0aGlzLl9iYWNrZHJvcCkub25lKFV0aWwuVFJBTlNJVElPTl9FTkQsIGNhbGxiYWNrKS5lbXVsYXRlVHJhbnNpdGlvbkVuZChiYWNrZHJvcFRyYW5zaXRpb25EdXJhdGlvbik7XG4gICAgICB9IGVsc2UgaWYgKCF0aGlzLl9pc1Nob3duICYmIHRoaXMuX2JhY2tkcm9wKSB7XG4gICAgICAgICQodGhpcy5fYmFja2Ryb3ApLnJlbW92ZUNsYXNzKENsYXNzTmFtZSQ1LlNIT1cpO1xuXG4gICAgICAgIHZhciBjYWxsYmFja1JlbW92ZSA9IGZ1bmN0aW9uIGNhbGxiYWNrUmVtb3ZlKCkge1xuICAgICAgICAgIF90aGlzOC5fcmVtb3ZlQmFja2Ryb3AoKTtcblxuICAgICAgICAgIGlmIChjYWxsYmFjaykge1xuICAgICAgICAgICAgY2FsbGJhY2soKTtcbiAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgICAgaWYgKCQodGhpcy5fZWxlbWVudCkuaGFzQ2xhc3MoQ2xhc3NOYW1lJDUuRkFERSkpIHtcbiAgICAgICAgICB2YXIgX2JhY2tkcm9wVHJhbnNpdGlvbkR1cmF0aW9uID0gVXRpbC5nZXRUcmFuc2l0aW9uRHVyYXRpb25Gcm9tRWxlbWVudCh0aGlzLl9iYWNrZHJvcCk7XG5cbiAgICAgICAgICAkKHRoaXMuX2JhY2tkcm9wKS5vbmUoVXRpbC5UUkFOU0lUSU9OX0VORCwgY2FsbGJhY2tSZW1vdmUpLmVtdWxhdGVUcmFuc2l0aW9uRW5kKF9iYWNrZHJvcFRyYW5zaXRpb25EdXJhdGlvbik7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgY2FsbGJhY2tSZW1vdmUoKTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIGlmIChjYWxsYmFjaykge1xuICAgICAgICBjYWxsYmFjaygpO1xuICAgICAgfVxuICAgIH07IC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICAvLyB0aGUgZm9sbG93aW5nIG1ldGhvZHMgYXJlIHVzZWQgdG8gaGFuZGxlIG92ZXJmbG93aW5nIG1vZGFsc1xuICAgIC8vIHRvZG8gKGZhdCk6IHRoZXNlIHNob3VsZCBwcm9iYWJseSBiZSByZWZhY3RvcmVkIG91dCBvZiBtb2RhbC5qc1xuICAgIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuXG4gICAgX3Byb3RvLl9hZGp1c3REaWFsb2cgPSBmdW5jdGlvbiBfYWRqdXN0RGlhbG9nKCkge1xuICAgICAgdmFyIGlzTW9kYWxPdmVyZmxvd2luZyA9IHRoaXMuX2VsZW1lbnQuc2Nyb2xsSGVpZ2h0ID4gZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LmNsaWVudEhlaWdodDtcblxuICAgICAgaWYgKCF0aGlzLl9pc0JvZHlPdmVyZmxvd2luZyAmJiBpc01vZGFsT3ZlcmZsb3dpbmcpIHtcbiAgICAgICAgdGhpcy5fZWxlbWVudC5zdHlsZS5wYWRkaW5nTGVmdCA9IHRoaXMuX3Njcm9sbGJhcldpZHRoICsgXCJweFwiO1xuICAgICAgfVxuXG4gICAgICBpZiAodGhpcy5faXNCb2R5T3ZlcmZsb3dpbmcgJiYgIWlzTW9kYWxPdmVyZmxvd2luZykge1xuICAgICAgICB0aGlzLl9lbGVtZW50LnN0eWxlLnBhZGRpbmdSaWdodCA9IHRoaXMuX3Njcm9sbGJhcldpZHRoICsgXCJweFwiO1xuICAgICAgfVxuICAgIH07XG5cbiAgICBfcHJvdG8uX3Jlc2V0QWRqdXN0bWVudHMgPSBmdW5jdGlvbiBfcmVzZXRBZGp1c3RtZW50cygpIHtcbiAgICAgIHRoaXMuX2VsZW1lbnQuc3R5bGUucGFkZGluZ0xlZnQgPSAnJztcbiAgICAgIHRoaXMuX2VsZW1lbnQuc3R5bGUucGFkZGluZ1JpZ2h0ID0gJyc7XG4gICAgfTtcblxuICAgIF9wcm90by5fY2hlY2tTY3JvbGxiYXIgPSBmdW5jdGlvbiBfY2hlY2tTY3JvbGxiYXIoKSB7XG4gICAgICB2YXIgcmVjdCA9IGRvY3VtZW50LmJvZHkuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XG4gICAgICB0aGlzLl9pc0JvZHlPdmVyZmxvd2luZyA9IHJlY3QubGVmdCArIHJlY3QucmlnaHQgPCB3aW5kb3cuaW5uZXJXaWR0aDtcbiAgICAgIHRoaXMuX3Njcm9sbGJhcldpZHRoID0gdGhpcy5fZ2V0U2Nyb2xsYmFyV2lkdGgoKTtcbiAgICB9O1xuXG4gICAgX3Byb3RvLl9zZXRTY3JvbGxiYXIgPSBmdW5jdGlvbiBfc2V0U2Nyb2xsYmFyKCkge1xuICAgICAgdmFyIF90aGlzOSA9IHRoaXM7XG5cbiAgICAgIGlmICh0aGlzLl9pc0JvZHlPdmVyZmxvd2luZykge1xuICAgICAgICAvLyBOb3RlOiBET01Ob2RlLnN0eWxlLnBhZGRpbmdSaWdodCByZXR1cm5zIHRoZSBhY3R1YWwgdmFsdWUgb3IgJycgaWYgbm90IHNldFxuICAgICAgICAvLyAgIHdoaWxlICQoRE9NTm9kZSkuY3NzKCdwYWRkaW5nLXJpZ2h0JykgcmV0dXJucyB0aGUgY2FsY3VsYXRlZCB2YWx1ZSBvciAwIGlmIG5vdCBzZXRcbiAgICAgICAgdmFyIGZpeGVkQ29udGVudCA9IFtdLnNsaWNlLmNhbGwoZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbChTZWxlY3RvciQ1LkZJWEVEX0NPTlRFTlQpKTtcbiAgICAgICAgdmFyIHN0aWNreUNvbnRlbnQgPSBbXS5zbGljZS5jYWxsKGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoU2VsZWN0b3IkNS5TVElDS1lfQ09OVEVOVCkpOyAvLyBBZGp1c3QgZml4ZWQgY29udGVudCBwYWRkaW5nXG5cbiAgICAgICAgJChmaXhlZENvbnRlbnQpLmVhY2goZnVuY3Rpb24gKGluZGV4LCBlbGVtZW50KSB7XG4gICAgICAgICAgdmFyIGFjdHVhbFBhZGRpbmcgPSBlbGVtZW50LnN0eWxlLnBhZGRpbmdSaWdodDtcbiAgICAgICAgICB2YXIgY2FsY3VsYXRlZFBhZGRpbmcgPSAkKGVsZW1lbnQpLmNzcygncGFkZGluZy1yaWdodCcpO1xuICAgICAgICAgICQoZWxlbWVudCkuZGF0YSgncGFkZGluZy1yaWdodCcsIGFjdHVhbFBhZGRpbmcpLmNzcygncGFkZGluZy1yaWdodCcsIHBhcnNlRmxvYXQoY2FsY3VsYXRlZFBhZGRpbmcpICsgX3RoaXM5Ll9zY3JvbGxiYXJXaWR0aCArIFwicHhcIik7XG4gICAgICAgIH0pOyAvLyBBZGp1c3Qgc3RpY2t5IGNvbnRlbnQgbWFyZ2luXG5cbiAgICAgICAgJChzdGlja3lDb250ZW50KS5lYWNoKGZ1bmN0aW9uIChpbmRleCwgZWxlbWVudCkge1xuICAgICAgICAgIHZhciBhY3R1YWxNYXJnaW4gPSBlbGVtZW50LnN0eWxlLm1hcmdpblJpZ2h0O1xuICAgICAgICAgIHZhciBjYWxjdWxhdGVkTWFyZ2luID0gJChlbGVtZW50KS5jc3MoJ21hcmdpbi1yaWdodCcpO1xuICAgICAgICAgICQoZWxlbWVudCkuZGF0YSgnbWFyZ2luLXJpZ2h0JywgYWN0dWFsTWFyZ2luKS5jc3MoJ21hcmdpbi1yaWdodCcsIHBhcnNlRmxvYXQoY2FsY3VsYXRlZE1hcmdpbikgLSBfdGhpczkuX3Njcm9sbGJhcldpZHRoICsgXCJweFwiKTtcbiAgICAgICAgfSk7IC8vIEFkanVzdCBib2R5IHBhZGRpbmdcblxuICAgICAgICB2YXIgYWN0dWFsUGFkZGluZyA9IGRvY3VtZW50LmJvZHkuc3R5bGUucGFkZGluZ1JpZ2h0O1xuICAgICAgICB2YXIgY2FsY3VsYXRlZFBhZGRpbmcgPSAkKGRvY3VtZW50LmJvZHkpLmNzcygncGFkZGluZy1yaWdodCcpO1xuICAgICAgICAkKGRvY3VtZW50LmJvZHkpLmRhdGEoJ3BhZGRpbmctcmlnaHQnLCBhY3R1YWxQYWRkaW5nKS5jc3MoJ3BhZGRpbmctcmlnaHQnLCBwYXJzZUZsb2F0KGNhbGN1bGF0ZWRQYWRkaW5nKSArIHRoaXMuX3Njcm9sbGJhcldpZHRoICsgXCJweFwiKTtcbiAgICAgIH1cblxuICAgICAgJChkb2N1bWVudC5ib2R5KS5hZGRDbGFzcyhDbGFzc05hbWUkNS5PUEVOKTtcbiAgICB9O1xuXG4gICAgX3Byb3RvLl9yZXNldFNjcm9sbGJhciA9IGZ1bmN0aW9uIF9yZXNldFNjcm9sbGJhcigpIHtcbiAgICAgIC8vIFJlc3RvcmUgZml4ZWQgY29udGVudCBwYWRkaW5nXG4gICAgICB2YXIgZml4ZWRDb250ZW50ID0gW10uc2xpY2UuY2FsbChkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKFNlbGVjdG9yJDUuRklYRURfQ09OVEVOVCkpO1xuICAgICAgJChmaXhlZENvbnRlbnQpLmVhY2goZnVuY3Rpb24gKGluZGV4LCBlbGVtZW50KSB7XG4gICAgICAgIHZhciBwYWRkaW5nID0gJChlbGVtZW50KS5kYXRhKCdwYWRkaW5nLXJpZ2h0Jyk7XG4gICAgICAgICQoZWxlbWVudCkucmVtb3ZlRGF0YSgncGFkZGluZy1yaWdodCcpO1xuICAgICAgICBlbGVtZW50LnN0eWxlLnBhZGRpbmdSaWdodCA9IHBhZGRpbmcgPyBwYWRkaW5nIDogJyc7XG4gICAgICB9KTsgLy8gUmVzdG9yZSBzdGlja3kgY29udGVudFxuXG4gICAgICB2YXIgZWxlbWVudHMgPSBbXS5zbGljZS5jYWxsKGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoXCJcIiArIFNlbGVjdG9yJDUuU1RJQ0tZX0NPTlRFTlQpKTtcbiAgICAgICQoZWxlbWVudHMpLmVhY2goZnVuY3Rpb24gKGluZGV4LCBlbGVtZW50KSB7XG4gICAgICAgIHZhciBtYXJnaW4gPSAkKGVsZW1lbnQpLmRhdGEoJ21hcmdpbi1yaWdodCcpO1xuXG4gICAgICAgIGlmICh0eXBlb2YgbWFyZ2luICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICQoZWxlbWVudCkuY3NzKCdtYXJnaW4tcmlnaHQnLCBtYXJnaW4pLnJlbW92ZURhdGEoJ21hcmdpbi1yaWdodCcpO1xuICAgICAgICB9XG4gICAgICB9KTsgLy8gUmVzdG9yZSBib2R5IHBhZGRpbmdcblxuICAgICAgdmFyIHBhZGRpbmcgPSAkKGRvY3VtZW50LmJvZHkpLmRhdGEoJ3BhZGRpbmctcmlnaHQnKTtcbiAgICAgICQoZG9jdW1lbnQuYm9keSkucmVtb3ZlRGF0YSgncGFkZGluZy1yaWdodCcpO1xuICAgICAgZG9jdW1lbnQuYm9keS5zdHlsZS5wYWRkaW5nUmlnaHQgPSBwYWRkaW5nID8gcGFkZGluZyA6ICcnO1xuICAgIH07XG5cbiAgICBfcHJvdG8uX2dldFNjcm9sbGJhcldpZHRoID0gZnVuY3Rpb24gX2dldFNjcm9sbGJhcldpZHRoKCkge1xuICAgICAgLy8gdGh4IGQud2Fsc2hcbiAgICAgIHZhciBzY3JvbGxEaXYgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgICAgIHNjcm9sbERpdi5jbGFzc05hbWUgPSBDbGFzc05hbWUkNS5TQ1JPTExCQVJfTUVBU1VSRVI7XG4gICAgICBkb2N1bWVudC5ib2R5LmFwcGVuZENoaWxkKHNjcm9sbERpdik7XG4gICAgICB2YXIgc2Nyb2xsYmFyV2lkdGggPSBzY3JvbGxEaXYuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCkud2lkdGggLSBzY3JvbGxEaXYuY2xpZW50V2lkdGg7XG4gICAgICBkb2N1bWVudC5ib2R5LnJlbW92ZUNoaWxkKHNjcm9sbERpdik7XG4gICAgICByZXR1cm4gc2Nyb2xsYmFyV2lkdGg7XG4gICAgfTsgLy8gU3RhdGljXG5cblxuICAgIE1vZGFsLl9qUXVlcnlJbnRlcmZhY2UgPSBmdW5jdGlvbiBfalF1ZXJ5SW50ZXJmYWNlKGNvbmZpZywgcmVsYXRlZFRhcmdldCkge1xuICAgICAgcmV0dXJuIHRoaXMuZWFjaChmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBkYXRhID0gJCh0aGlzKS5kYXRhKERBVEFfS0VZJDUpO1xuXG4gICAgICAgIHZhciBfY29uZmlnID0gX29iamVjdFNwcmVhZCh7fSwgRGVmYXVsdCQzLCAkKHRoaXMpLmRhdGEoKSwgdHlwZW9mIGNvbmZpZyA9PT0gJ29iamVjdCcgJiYgY29uZmlnID8gY29uZmlnIDoge30pO1xuXG4gICAgICAgIGlmICghZGF0YSkge1xuICAgICAgICAgIGRhdGEgPSBuZXcgTW9kYWwodGhpcywgX2NvbmZpZyk7XG4gICAgICAgICAgJCh0aGlzKS5kYXRhKERBVEFfS0VZJDUsIGRhdGEpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHR5cGVvZiBjb25maWcgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgaWYgKHR5cGVvZiBkYXRhW2NvbmZpZ10gPT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKFwiTm8gbWV0aG9kIG5hbWVkIFxcXCJcIiArIGNvbmZpZyArIFwiXFxcIlwiKTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBkYXRhW2NvbmZpZ10ocmVsYXRlZFRhcmdldCk7XG4gICAgICAgIH0gZWxzZSBpZiAoX2NvbmZpZy5zaG93KSB7XG4gICAgICAgICAgZGF0YS5zaG93KHJlbGF0ZWRUYXJnZXQpO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9O1xuXG4gICAgX2NyZWF0ZUNsYXNzKE1vZGFsLCBudWxsLCBbe1xuICAgICAga2V5OiBcIlZFUlNJT05cIixcbiAgICAgIGdldDogZnVuY3Rpb24gZ2V0KCkge1xuICAgICAgICByZXR1cm4gVkVSU0lPTiQ1O1xuICAgICAgfVxuICAgIH0sIHtcbiAgICAgIGtleTogXCJEZWZhdWx0XCIsXG4gICAgICBnZXQ6IGZ1bmN0aW9uIGdldCgpIHtcbiAgICAgICAgcmV0dXJuIERlZmF1bHQkMztcbiAgICAgIH1cbiAgICB9XSk7XG5cbiAgICByZXR1cm4gTW9kYWw7XG4gIH0oKTtcbiAgLyoqXG4gICAqIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgKiBEYXRhIEFwaSBpbXBsZW1lbnRhdGlvblxuICAgKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICovXG5cblxuICAkKGRvY3VtZW50KS5vbihFdmVudCQ1LkNMSUNLX0RBVEFfQVBJLCBTZWxlY3RvciQ1LkRBVEFfVE9HR0xFLCBmdW5jdGlvbiAoZXZlbnQpIHtcbiAgICB2YXIgX3RoaXMxMCA9IHRoaXM7XG5cbiAgICB2YXIgdGFyZ2V0O1xuICAgIHZhciBzZWxlY3RvciA9IFV0aWwuZ2V0U2VsZWN0b3JGcm9tRWxlbWVudCh0aGlzKTtcblxuICAgIGlmIChzZWxlY3Rvcikge1xuICAgICAgdGFyZ2V0ID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcihzZWxlY3Rvcik7XG4gICAgfVxuXG4gICAgdmFyIGNvbmZpZyA9ICQodGFyZ2V0KS5kYXRhKERBVEFfS0VZJDUpID8gJ3RvZ2dsZScgOiBfb2JqZWN0U3ByZWFkKHt9LCAkKHRhcmdldCkuZGF0YSgpLCAkKHRoaXMpLmRhdGEoKSk7XG5cbiAgICBpZiAodGhpcy50YWdOYW1lID09PSAnQScgfHwgdGhpcy50YWdOYW1lID09PSAnQVJFQScpIHtcbiAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgfVxuXG4gICAgdmFyICR0YXJnZXQgPSAkKHRhcmdldCkub25lKEV2ZW50JDUuU0hPVywgZnVuY3Rpb24gKHNob3dFdmVudCkge1xuICAgICAgaWYgKHNob3dFdmVudC5pc0RlZmF1bHRQcmV2ZW50ZWQoKSkge1xuICAgICAgICAvLyBPbmx5IHJlZ2lzdGVyIGZvY3VzIHJlc3RvcmVyIGlmIG1vZGFsIHdpbGwgYWN0dWFsbHkgZ2V0IHNob3duXG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgJHRhcmdldC5vbmUoRXZlbnQkNS5ISURERU4sIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgaWYgKCQoX3RoaXMxMCkuaXMoJzp2aXNpYmxlJykpIHtcbiAgICAgICAgICBfdGhpczEwLmZvY3VzKCk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH0pO1xuXG4gICAgTW9kYWwuX2pRdWVyeUludGVyZmFjZS5jYWxsKCQodGFyZ2V0KSwgY29uZmlnLCB0aGlzKTtcbiAgfSk7XG4gIC8qKlxuICAgKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICogalF1ZXJ5XG4gICAqIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgKi9cblxuICAkLmZuW05BTUUkNV0gPSBNb2RhbC5falF1ZXJ5SW50ZXJmYWNlO1xuICAkLmZuW05BTUUkNV0uQ29uc3RydWN0b3IgPSBNb2RhbDtcblxuICAkLmZuW05BTUUkNV0ubm9Db25mbGljdCA9IGZ1bmN0aW9uICgpIHtcbiAgICAkLmZuW05BTUUkNV0gPSBKUVVFUllfTk9fQ09ORkxJQ1QkNTtcbiAgICByZXR1cm4gTW9kYWwuX2pRdWVyeUludGVyZmFjZTtcbiAgfTtcblxuICAvKipcbiAgICogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAqIENvbnN0YW50c1xuICAgKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICovXG5cbiAgdmFyIE5BTUUkNiA9ICd0b29sdGlwJztcbiAgdmFyIFZFUlNJT04kNiA9ICc0LjIuMSc7XG4gIHZhciBEQVRBX0tFWSQ2ID0gJ2JzLnRvb2x0aXAnO1xuICB2YXIgRVZFTlRfS0VZJDYgPSBcIi5cIiArIERBVEFfS0VZJDY7XG4gIHZhciBKUVVFUllfTk9fQ09ORkxJQ1QkNiA9ICQuZm5bTkFNRSQ2XTtcbiAgdmFyIENMQVNTX1BSRUZJWCA9ICdicy10b29sdGlwJztcbiAgdmFyIEJTQ0xTX1BSRUZJWF9SRUdFWCA9IG5ldyBSZWdFeHAoXCIoXnxcXFxccylcIiArIENMQVNTX1BSRUZJWCArIFwiXFxcXFMrXCIsICdnJyk7XG4gIHZhciBEZWZhdWx0VHlwZSQ0ID0ge1xuICAgIGFuaW1hdGlvbjogJ2Jvb2xlYW4nLFxuICAgIHRlbXBsYXRlOiAnc3RyaW5nJyxcbiAgICB0aXRsZTogJyhzdHJpbmd8ZWxlbWVudHxmdW5jdGlvbiknLFxuICAgIHRyaWdnZXI6ICdzdHJpbmcnLFxuICAgIGRlbGF5OiAnKG51bWJlcnxvYmplY3QpJyxcbiAgICBodG1sOiAnYm9vbGVhbicsXG4gICAgc2VsZWN0b3I6ICcoc3RyaW5nfGJvb2xlYW4pJyxcbiAgICBwbGFjZW1lbnQ6ICcoc3RyaW5nfGZ1bmN0aW9uKScsXG4gICAgb2Zmc2V0OiAnKG51bWJlcnxzdHJpbmcpJyxcbiAgICBjb250YWluZXI6ICcoc3RyaW5nfGVsZW1lbnR8Ym9vbGVhbiknLFxuICAgIGZhbGxiYWNrUGxhY2VtZW50OiAnKHN0cmluZ3xhcnJheSknLFxuICAgIGJvdW5kYXJ5OiAnKHN0cmluZ3xlbGVtZW50KSdcbiAgfTtcbiAgdmFyIEF0dGFjaG1lbnRNYXAkMSA9IHtcbiAgICBBVVRPOiAnYXV0bycsXG4gICAgVE9QOiAndG9wJyxcbiAgICBSSUdIVDogJ3JpZ2h0JyxcbiAgICBCT1RUT006ICdib3R0b20nLFxuICAgIExFRlQ6ICdsZWZ0J1xuICB9O1xuICB2YXIgRGVmYXVsdCQ0ID0ge1xuICAgIGFuaW1hdGlvbjogdHJ1ZSxcbiAgICB0ZW1wbGF0ZTogJzxkaXYgY2xhc3M9XCJ0b29sdGlwXCIgcm9sZT1cInRvb2x0aXBcIj4nICsgJzxkaXYgY2xhc3M9XCJhcnJvd1wiPjwvZGl2PicgKyAnPGRpdiBjbGFzcz1cInRvb2x0aXAtaW5uZXJcIj48L2Rpdj48L2Rpdj4nLFxuICAgIHRyaWdnZXI6ICdob3ZlciBmb2N1cycsXG4gICAgdGl0bGU6ICcnLFxuICAgIGRlbGF5OiAwLFxuICAgIGh0bWw6IGZhbHNlLFxuICAgIHNlbGVjdG9yOiBmYWxzZSxcbiAgICBwbGFjZW1lbnQ6ICd0b3AnLFxuICAgIG9mZnNldDogMCxcbiAgICBjb250YWluZXI6IGZhbHNlLFxuICAgIGZhbGxiYWNrUGxhY2VtZW50OiAnZmxpcCcsXG4gICAgYm91bmRhcnk6ICdzY3JvbGxQYXJlbnQnXG4gIH07XG4gIHZhciBIb3ZlclN0YXRlID0ge1xuICAgIFNIT1c6ICdzaG93JyxcbiAgICBPVVQ6ICdvdXQnXG4gIH07XG4gIHZhciBFdmVudCQ2ID0ge1xuICAgIEhJREU6IFwiaGlkZVwiICsgRVZFTlRfS0VZJDYsXG4gICAgSElEREVOOiBcImhpZGRlblwiICsgRVZFTlRfS0VZJDYsXG4gICAgU0hPVzogXCJzaG93XCIgKyBFVkVOVF9LRVkkNixcbiAgICBTSE9XTjogXCJzaG93blwiICsgRVZFTlRfS0VZJDYsXG4gICAgSU5TRVJURUQ6IFwiaW5zZXJ0ZWRcIiArIEVWRU5UX0tFWSQ2LFxuICAgIENMSUNLOiBcImNsaWNrXCIgKyBFVkVOVF9LRVkkNixcbiAgICBGT0NVU0lOOiBcImZvY3VzaW5cIiArIEVWRU5UX0tFWSQ2LFxuICAgIEZPQ1VTT1VUOiBcImZvY3Vzb3V0XCIgKyBFVkVOVF9LRVkkNixcbiAgICBNT1VTRUVOVEVSOiBcIm1vdXNlZW50ZXJcIiArIEVWRU5UX0tFWSQ2LFxuICAgIE1PVVNFTEVBVkU6IFwibW91c2VsZWF2ZVwiICsgRVZFTlRfS0VZJDZcbiAgfTtcbiAgdmFyIENsYXNzTmFtZSQ2ID0ge1xuICAgIEZBREU6ICdmYWRlJyxcbiAgICBTSE9XOiAnc2hvdydcbiAgfTtcbiAgdmFyIFNlbGVjdG9yJDYgPSB7XG4gICAgVE9PTFRJUDogJy50b29sdGlwJyxcbiAgICBUT09MVElQX0lOTkVSOiAnLnRvb2x0aXAtaW5uZXInLFxuICAgIEFSUk9XOiAnLmFycm93J1xuICB9O1xuICB2YXIgVHJpZ2dlciA9IHtcbiAgICBIT1ZFUjogJ2hvdmVyJyxcbiAgICBGT0NVUzogJ2ZvY3VzJyxcbiAgICBDTElDSzogJ2NsaWNrJyxcbiAgICBNQU5VQUw6ICdtYW51YWwnXG4gICAgLyoqXG4gICAgICogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAgICogQ2xhc3MgRGVmaW5pdGlvblxuICAgICAqIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgICAqL1xuXG4gIH07XG5cbiAgdmFyIFRvb2x0aXAgPVxuICAvKiNfX1BVUkVfXyovXG4gIGZ1bmN0aW9uICgpIHtcbiAgICBmdW5jdGlvbiBUb29sdGlwKGVsZW1lbnQsIGNvbmZpZykge1xuICAgICAgLyoqXG4gICAgICAgKiBDaGVjayBmb3IgUG9wcGVyIGRlcGVuZGVuY3lcbiAgICAgICAqIFBvcHBlciAtIGh0dHBzOi8vcG9wcGVyLmpzLm9yZ1xuICAgICAgICovXG4gICAgICBpZiAodHlwZW9mIFBvcHBlciA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignQm9vdHN0cmFwXFwncyB0b29sdGlwcyByZXF1aXJlIFBvcHBlci5qcyAoaHR0cHM6Ly9wb3BwZXIuanMub3JnLyknKTtcbiAgICAgIH0gLy8gcHJpdmF0ZVxuXG5cbiAgICAgIHRoaXMuX2lzRW5hYmxlZCA9IHRydWU7XG4gICAgICB0aGlzLl90aW1lb3V0ID0gMDtcbiAgICAgIHRoaXMuX2hvdmVyU3RhdGUgPSAnJztcbiAgICAgIHRoaXMuX2FjdGl2ZVRyaWdnZXIgPSB7fTtcbiAgICAgIHRoaXMuX3BvcHBlciA9IG51bGw7IC8vIFByb3RlY3RlZFxuXG4gICAgICB0aGlzLmVsZW1lbnQgPSBlbGVtZW50O1xuICAgICAgdGhpcy5jb25maWcgPSB0aGlzLl9nZXRDb25maWcoY29uZmlnKTtcbiAgICAgIHRoaXMudGlwID0gbnVsbDtcblxuICAgICAgdGhpcy5fc2V0TGlzdGVuZXJzKCk7XG4gICAgfSAvLyBHZXR0ZXJzXG5cblxuICAgIHZhciBfcHJvdG8gPSBUb29sdGlwLnByb3RvdHlwZTtcblxuICAgIC8vIFB1YmxpY1xuICAgIF9wcm90by5lbmFibGUgPSBmdW5jdGlvbiBlbmFibGUoKSB7XG4gICAgICB0aGlzLl9pc0VuYWJsZWQgPSB0cnVlO1xuICAgIH07XG5cbiAgICBfcHJvdG8uZGlzYWJsZSA9IGZ1bmN0aW9uIGRpc2FibGUoKSB7XG4gICAgICB0aGlzLl9pc0VuYWJsZWQgPSBmYWxzZTtcbiAgICB9O1xuXG4gICAgX3Byb3RvLnRvZ2dsZUVuYWJsZWQgPSBmdW5jdGlvbiB0b2dnbGVFbmFibGVkKCkge1xuICAgICAgdGhpcy5faXNFbmFibGVkID0gIXRoaXMuX2lzRW5hYmxlZDtcbiAgICB9O1xuXG4gICAgX3Byb3RvLnRvZ2dsZSA9IGZ1bmN0aW9uIHRvZ2dsZShldmVudCkge1xuICAgICAgaWYgKCF0aGlzLl9pc0VuYWJsZWQpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICBpZiAoZXZlbnQpIHtcbiAgICAgICAgdmFyIGRhdGFLZXkgPSB0aGlzLmNvbnN0cnVjdG9yLkRBVEFfS0VZO1xuICAgICAgICB2YXIgY29udGV4dCA9ICQoZXZlbnQuY3VycmVudFRhcmdldCkuZGF0YShkYXRhS2V5KTtcblxuICAgICAgICBpZiAoIWNvbnRleHQpIHtcbiAgICAgICAgICBjb250ZXh0ID0gbmV3IHRoaXMuY29uc3RydWN0b3IoZXZlbnQuY3VycmVudFRhcmdldCwgdGhpcy5fZ2V0RGVsZWdhdGVDb25maWcoKSk7XG4gICAgICAgICAgJChldmVudC5jdXJyZW50VGFyZ2V0KS5kYXRhKGRhdGFLZXksIGNvbnRleHQpO1xuICAgICAgICB9XG5cbiAgICAgICAgY29udGV4dC5fYWN0aXZlVHJpZ2dlci5jbGljayA9ICFjb250ZXh0Ll9hY3RpdmVUcmlnZ2VyLmNsaWNrO1xuXG4gICAgICAgIGlmIChjb250ZXh0Ll9pc1dpdGhBY3RpdmVUcmlnZ2VyKCkpIHtcbiAgICAgICAgICBjb250ZXh0Ll9lbnRlcihudWxsLCBjb250ZXh0KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBjb250ZXh0Ll9sZWF2ZShudWxsLCBjb250ZXh0KTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgaWYgKCQodGhpcy5nZXRUaXBFbGVtZW50KCkpLmhhc0NsYXNzKENsYXNzTmFtZSQ2LlNIT1cpKSB7XG4gICAgICAgICAgdGhpcy5fbGVhdmUobnVsbCwgdGhpcyk7XG5cbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLl9lbnRlcihudWxsLCB0aGlzKTtcbiAgICAgIH1cbiAgICB9O1xuXG4gICAgX3Byb3RvLmRpc3Bvc2UgPSBmdW5jdGlvbiBkaXNwb3NlKCkge1xuICAgICAgY2xlYXJUaW1lb3V0KHRoaXMuX3RpbWVvdXQpO1xuICAgICAgJC5yZW1vdmVEYXRhKHRoaXMuZWxlbWVudCwgdGhpcy5jb25zdHJ1Y3Rvci5EQVRBX0tFWSk7XG4gICAgICAkKHRoaXMuZWxlbWVudCkub2ZmKHRoaXMuY29uc3RydWN0b3IuRVZFTlRfS0VZKTtcbiAgICAgICQodGhpcy5lbGVtZW50KS5jbG9zZXN0KCcubW9kYWwnKS5vZmYoJ2hpZGUuYnMubW9kYWwnKTtcblxuICAgICAgaWYgKHRoaXMudGlwKSB7XG4gICAgICAgICQodGhpcy50aXApLnJlbW92ZSgpO1xuICAgICAgfVxuXG4gICAgICB0aGlzLl9pc0VuYWJsZWQgPSBudWxsO1xuICAgICAgdGhpcy5fdGltZW91dCA9IG51bGw7XG4gICAgICB0aGlzLl9ob3ZlclN0YXRlID0gbnVsbDtcbiAgICAgIHRoaXMuX2FjdGl2ZVRyaWdnZXIgPSBudWxsO1xuXG4gICAgICBpZiAodGhpcy5fcG9wcGVyICE9PSBudWxsKSB7XG4gICAgICAgIHRoaXMuX3BvcHBlci5kZXN0cm95KCk7XG4gICAgICB9XG5cbiAgICAgIHRoaXMuX3BvcHBlciA9IG51bGw7XG4gICAgICB0aGlzLmVsZW1lbnQgPSBudWxsO1xuICAgICAgdGhpcy5jb25maWcgPSBudWxsO1xuICAgICAgdGhpcy50aXAgPSBudWxsO1xuICAgIH07XG5cbiAgICBfcHJvdG8uc2hvdyA9IGZ1bmN0aW9uIHNob3coKSB7XG4gICAgICB2YXIgX3RoaXMgPSB0aGlzO1xuXG4gICAgICBpZiAoJCh0aGlzLmVsZW1lbnQpLmNzcygnZGlzcGxheScpID09PSAnbm9uZScpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdQbGVhc2UgdXNlIHNob3cgb24gdmlzaWJsZSBlbGVtZW50cycpO1xuICAgICAgfVxuXG4gICAgICB2YXIgc2hvd0V2ZW50ID0gJC5FdmVudCh0aGlzLmNvbnN0cnVjdG9yLkV2ZW50LlNIT1cpO1xuXG4gICAgICBpZiAodGhpcy5pc1dpdGhDb250ZW50KCkgJiYgdGhpcy5faXNFbmFibGVkKSB7XG4gICAgICAgICQodGhpcy5lbGVtZW50KS50cmlnZ2VyKHNob3dFdmVudCk7XG4gICAgICAgIHZhciBzaGFkb3dSb290ID0gVXRpbC5maW5kU2hhZG93Um9vdCh0aGlzLmVsZW1lbnQpO1xuICAgICAgICB2YXIgaXNJblRoZURvbSA9ICQuY29udGFpbnMoc2hhZG93Um9vdCAhPT0gbnVsbCA/IHNoYWRvd1Jvb3QgOiB0aGlzLmVsZW1lbnQub3duZXJEb2N1bWVudC5kb2N1bWVudEVsZW1lbnQsIHRoaXMuZWxlbWVudCk7XG5cbiAgICAgICAgaWYgKHNob3dFdmVudC5pc0RlZmF1bHRQcmV2ZW50ZWQoKSB8fCAhaXNJblRoZURvbSkge1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIHZhciB0aXAgPSB0aGlzLmdldFRpcEVsZW1lbnQoKTtcbiAgICAgICAgdmFyIHRpcElkID0gVXRpbC5nZXRVSUQodGhpcy5jb25zdHJ1Y3Rvci5OQU1FKTtcbiAgICAgICAgdGlwLnNldEF0dHJpYnV0ZSgnaWQnLCB0aXBJZCk7XG4gICAgICAgIHRoaXMuZWxlbWVudC5zZXRBdHRyaWJ1dGUoJ2FyaWEtZGVzY3JpYmVkYnknLCB0aXBJZCk7XG4gICAgICAgIHRoaXMuc2V0Q29udGVudCgpO1xuXG4gICAgICAgIGlmICh0aGlzLmNvbmZpZy5hbmltYXRpb24pIHtcbiAgICAgICAgICAkKHRpcCkuYWRkQ2xhc3MoQ2xhc3NOYW1lJDYuRkFERSk7XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgcGxhY2VtZW50ID0gdHlwZW9mIHRoaXMuY29uZmlnLnBsYWNlbWVudCA9PT0gJ2Z1bmN0aW9uJyA/IHRoaXMuY29uZmlnLnBsYWNlbWVudC5jYWxsKHRoaXMsIHRpcCwgdGhpcy5lbGVtZW50KSA6IHRoaXMuY29uZmlnLnBsYWNlbWVudDtcblxuICAgICAgICB2YXIgYXR0YWNobWVudCA9IHRoaXMuX2dldEF0dGFjaG1lbnQocGxhY2VtZW50KTtcblxuICAgICAgICB0aGlzLmFkZEF0dGFjaG1lbnRDbGFzcyhhdHRhY2htZW50KTtcblxuICAgICAgICB2YXIgY29udGFpbmVyID0gdGhpcy5fZ2V0Q29udGFpbmVyKCk7XG5cbiAgICAgICAgJCh0aXApLmRhdGEodGhpcy5jb25zdHJ1Y3Rvci5EQVRBX0tFWSwgdGhpcyk7XG5cbiAgICAgICAgaWYgKCEkLmNvbnRhaW5zKHRoaXMuZWxlbWVudC5vd25lckRvY3VtZW50LmRvY3VtZW50RWxlbWVudCwgdGhpcy50aXApKSB7XG4gICAgICAgICAgJCh0aXApLmFwcGVuZFRvKGNvbnRhaW5lcik7XG4gICAgICAgIH1cblxuICAgICAgICAkKHRoaXMuZWxlbWVudCkudHJpZ2dlcih0aGlzLmNvbnN0cnVjdG9yLkV2ZW50LklOU0VSVEVEKTtcbiAgICAgICAgdGhpcy5fcG9wcGVyID0gbmV3IFBvcHBlcih0aGlzLmVsZW1lbnQsIHRpcCwge1xuICAgICAgICAgIHBsYWNlbWVudDogYXR0YWNobWVudCxcbiAgICAgICAgICBtb2RpZmllcnM6IHtcbiAgICAgICAgICAgIG9mZnNldDoge1xuICAgICAgICAgICAgICBvZmZzZXQ6IHRoaXMuY29uZmlnLm9mZnNldFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGZsaXA6IHtcbiAgICAgICAgICAgICAgYmVoYXZpb3I6IHRoaXMuY29uZmlnLmZhbGxiYWNrUGxhY2VtZW50XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgYXJyb3c6IHtcbiAgICAgICAgICAgICAgZWxlbWVudDogU2VsZWN0b3IkNi5BUlJPV1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHByZXZlbnRPdmVyZmxvdzoge1xuICAgICAgICAgICAgICBib3VuZGFyaWVzRWxlbWVudDogdGhpcy5jb25maWcuYm91bmRhcnlcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9LFxuICAgICAgICAgIG9uQ3JlYXRlOiBmdW5jdGlvbiBvbkNyZWF0ZShkYXRhKSB7XG4gICAgICAgICAgICBpZiAoZGF0YS5vcmlnaW5hbFBsYWNlbWVudCAhPT0gZGF0YS5wbGFjZW1lbnQpIHtcbiAgICAgICAgICAgICAgX3RoaXMuX2hhbmRsZVBvcHBlclBsYWNlbWVudENoYW5nZShkYXRhKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9LFxuICAgICAgICAgIG9uVXBkYXRlOiBmdW5jdGlvbiBvblVwZGF0ZShkYXRhKSB7XG4gICAgICAgICAgICByZXR1cm4gX3RoaXMuX2hhbmRsZVBvcHBlclBsYWNlbWVudENoYW5nZShkYXRhKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICAkKHRpcCkuYWRkQ2xhc3MoQ2xhc3NOYW1lJDYuU0hPVyk7IC8vIElmIHRoaXMgaXMgYSB0b3VjaC1lbmFibGVkIGRldmljZSB3ZSBhZGQgZXh0cmFcbiAgICAgICAgLy8gZW1wdHkgbW91c2VvdmVyIGxpc3RlbmVycyB0byB0aGUgYm9keSdzIGltbWVkaWF0ZSBjaGlsZHJlbjtcbiAgICAgICAgLy8gb25seSBuZWVkZWQgYmVjYXVzZSBvZiBicm9rZW4gZXZlbnQgZGVsZWdhdGlvbiBvbiBpT1NcbiAgICAgICAgLy8gaHR0cHM6Ly93d3cucXVpcmtzbW9kZS5vcmcvYmxvZy9hcmNoaXZlcy8yMDE0LzAyL21vdXNlX2V2ZW50X2J1Yi5odG1sXG5cbiAgICAgICAgaWYgKCdvbnRvdWNoc3RhcnQnIGluIGRvY3VtZW50LmRvY3VtZW50RWxlbWVudCkge1xuICAgICAgICAgICQoZG9jdW1lbnQuYm9keSkuY2hpbGRyZW4oKS5vbignbW91c2VvdmVyJywgbnVsbCwgJC5ub29wKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHZhciBjb21wbGV0ZSA9IGZ1bmN0aW9uIGNvbXBsZXRlKCkge1xuICAgICAgICAgIGlmIChfdGhpcy5jb25maWcuYW5pbWF0aW9uKSB7XG4gICAgICAgICAgICBfdGhpcy5fZml4VHJhbnNpdGlvbigpO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIHZhciBwcmV2SG92ZXJTdGF0ZSA9IF90aGlzLl9ob3ZlclN0YXRlO1xuICAgICAgICAgIF90aGlzLl9ob3ZlclN0YXRlID0gbnVsbDtcbiAgICAgICAgICAkKF90aGlzLmVsZW1lbnQpLnRyaWdnZXIoX3RoaXMuY29uc3RydWN0b3IuRXZlbnQuU0hPV04pO1xuXG4gICAgICAgICAgaWYgKHByZXZIb3ZlclN0YXRlID09PSBIb3ZlclN0YXRlLk9VVCkge1xuICAgICAgICAgICAgX3RoaXMuX2xlYXZlKG51bGwsIF90aGlzKTtcbiAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgICAgaWYgKCQodGhpcy50aXApLmhhc0NsYXNzKENsYXNzTmFtZSQ2LkZBREUpKSB7XG4gICAgICAgICAgdmFyIHRyYW5zaXRpb25EdXJhdGlvbiA9IFV0aWwuZ2V0VHJhbnNpdGlvbkR1cmF0aW9uRnJvbUVsZW1lbnQodGhpcy50aXApO1xuICAgICAgICAgICQodGhpcy50aXApLm9uZShVdGlsLlRSQU5TSVRJT05fRU5ELCBjb21wbGV0ZSkuZW11bGF0ZVRyYW5zaXRpb25FbmQodHJhbnNpdGlvbkR1cmF0aW9uKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBjb21wbGV0ZSgpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfTtcblxuICAgIF9wcm90by5oaWRlID0gZnVuY3Rpb24gaGlkZShjYWxsYmFjaykge1xuICAgICAgdmFyIF90aGlzMiA9IHRoaXM7XG5cbiAgICAgIHZhciB0aXAgPSB0aGlzLmdldFRpcEVsZW1lbnQoKTtcbiAgICAgIHZhciBoaWRlRXZlbnQgPSAkLkV2ZW50KHRoaXMuY29uc3RydWN0b3IuRXZlbnQuSElERSk7XG5cbiAgICAgIHZhciBjb21wbGV0ZSA9IGZ1bmN0aW9uIGNvbXBsZXRlKCkge1xuICAgICAgICBpZiAoX3RoaXMyLl9ob3ZlclN0YXRlICE9PSBIb3ZlclN0YXRlLlNIT1cgJiYgdGlwLnBhcmVudE5vZGUpIHtcbiAgICAgICAgICB0aXAucGFyZW50Tm9kZS5yZW1vdmVDaGlsZCh0aXApO1xuICAgICAgICB9XG5cbiAgICAgICAgX3RoaXMyLl9jbGVhblRpcENsYXNzKCk7XG5cbiAgICAgICAgX3RoaXMyLmVsZW1lbnQucmVtb3ZlQXR0cmlidXRlKCdhcmlhLWRlc2NyaWJlZGJ5Jyk7XG5cbiAgICAgICAgJChfdGhpczIuZWxlbWVudCkudHJpZ2dlcihfdGhpczIuY29uc3RydWN0b3IuRXZlbnQuSElEREVOKTtcblxuICAgICAgICBpZiAoX3RoaXMyLl9wb3BwZXIgIT09IG51bGwpIHtcbiAgICAgICAgICBfdGhpczIuX3BvcHBlci5kZXN0cm95KCk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoY2FsbGJhY2spIHtcbiAgICAgICAgICBjYWxsYmFjaygpO1xuICAgICAgICB9XG4gICAgICB9O1xuXG4gICAgICAkKHRoaXMuZWxlbWVudCkudHJpZ2dlcihoaWRlRXZlbnQpO1xuXG4gICAgICBpZiAoaGlkZUV2ZW50LmlzRGVmYXVsdFByZXZlbnRlZCgpKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgJCh0aXApLnJlbW92ZUNsYXNzKENsYXNzTmFtZSQ2LlNIT1cpOyAvLyBJZiB0aGlzIGlzIGEgdG91Y2gtZW5hYmxlZCBkZXZpY2Ugd2UgcmVtb3ZlIHRoZSBleHRyYVxuICAgICAgLy8gZW1wdHkgbW91c2VvdmVyIGxpc3RlbmVycyB3ZSBhZGRlZCBmb3IgaU9TIHN1cHBvcnRcblxuICAgICAgaWYgKCdvbnRvdWNoc3RhcnQnIGluIGRvY3VtZW50LmRvY3VtZW50RWxlbWVudCkge1xuICAgICAgICAkKGRvY3VtZW50LmJvZHkpLmNoaWxkcmVuKCkub2ZmKCdtb3VzZW92ZXInLCBudWxsLCAkLm5vb3ApO1xuICAgICAgfVxuXG4gICAgICB0aGlzLl9hY3RpdmVUcmlnZ2VyW1RyaWdnZXIuQ0xJQ0tdID0gZmFsc2U7XG4gICAgICB0aGlzLl9hY3RpdmVUcmlnZ2VyW1RyaWdnZXIuRk9DVVNdID0gZmFsc2U7XG4gICAgICB0aGlzLl9hY3RpdmVUcmlnZ2VyW1RyaWdnZXIuSE9WRVJdID0gZmFsc2U7XG5cbiAgICAgIGlmICgkKHRoaXMudGlwKS5oYXNDbGFzcyhDbGFzc05hbWUkNi5GQURFKSkge1xuICAgICAgICB2YXIgdHJhbnNpdGlvbkR1cmF0aW9uID0gVXRpbC5nZXRUcmFuc2l0aW9uRHVyYXRpb25Gcm9tRWxlbWVudCh0aXApO1xuICAgICAgICAkKHRpcCkub25lKFV0aWwuVFJBTlNJVElPTl9FTkQsIGNvbXBsZXRlKS5lbXVsYXRlVHJhbnNpdGlvbkVuZCh0cmFuc2l0aW9uRHVyYXRpb24pO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY29tcGxldGUoKTtcbiAgICAgIH1cblxuICAgICAgdGhpcy5faG92ZXJTdGF0ZSA9ICcnO1xuICAgIH07XG5cbiAgICBfcHJvdG8udXBkYXRlID0gZnVuY3Rpb24gdXBkYXRlKCkge1xuICAgICAgaWYgKHRoaXMuX3BvcHBlciAhPT0gbnVsbCkge1xuICAgICAgICB0aGlzLl9wb3BwZXIuc2NoZWR1bGVVcGRhdGUoKTtcbiAgICAgIH1cbiAgICB9OyAvLyBQcm90ZWN0ZWRcblxuXG4gICAgX3Byb3RvLmlzV2l0aENvbnRlbnQgPSBmdW5jdGlvbiBpc1dpdGhDb250ZW50KCkge1xuICAgICAgcmV0dXJuIEJvb2xlYW4odGhpcy5nZXRUaXRsZSgpKTtcbiAgICB9O1xuXG4gICAgX3Byb3RvLmFkZEF0dGFjaG1lbnRDbGFzcyA9IGZ1bmN0aW9uIGFkZEF0dGFjaG1lbnRDbGFzcyhhdHRhY2htZW50KSB7XG4gICAgICAkKHRoaXMuZ2V0VGlwRWxlbWVudCgpKS5hZGRDbGFzcyhDTEFTU19QUkVGSVggKyBcIi1cIiArIGF0dGFjaG1lbnQpO1xuICAgIH07XG5cbiAgICBfcHJvdG8uZ2V0VGlwRWxlbWVudCA9IGZ1bmN0aW9uIGdldFRpcEVsZW1lbnQoKSB7XG4gICAgICB0aGlzLnRpcCA9IHRoaXMudGlwIHx8ICQodGhpcy5jb25maWcudGVtcGxhdGUpWzBdO1xuICAgICAgcmV0dXJuIHRoaXMudGlwO1xuICAgIH07XG5cbiAgICBfcHJvdG8uc2V0Q29udGVudCA9IGZ1bmN0aW9uIHNldENvbnRlbnQoKSB7XG4gICAgICB2YXIgdGlwID0gdGhpcy5nZXRUaXBFbGVtZW50KCk7XG4gICAgICB0aGlzLnNldEVsZW1lbnRDb250ZW50KCQodGlwLnF1ZXJ5U2VsZWN0b3JBbGwoU2VsZWN0b3IkNi5UT09MVElQX0lOTkVSKSksIHRoaXMuZ2V0VGl0bGUoKSk7XG4gICAgICAkKHRpcCkucmVtb3ZlQ2xhc3MoQ2xhc3NOYW1lJDYuRkFERSArIFwiIFwiICsgQ2xhc3NOYW1lJDYuU0hPVyk7XG4gICAgfTtcblxuICAgIF9wcm90by5zZXRFbGVtZW50Q29udGVudCA9IGZ1bmN0aW9uIHNldEVsZW1lbnRDb250ZW50KCRlbGVtZW50LCBjb250ZW50KSB7XG4gICAgICB2YXIgaHRtbCA9IHRoaXMuY29uZmlnLmh0bWw7XG5cbiAgICAgIGlmICh0eXBlb2YgY29udGVudCA9PT0gJ29iamVjdCcgJiYgKGNvbnRlbnQubm9kZVR5cGUgfHwgY29udGVudC5qcXVlcnkpKSB7XG4gICAgICAgIC8vIENvbnRlbnQgaXMgYSBET00gbm9kZSBvciBhIGpRdWVyeVxuICAgICAgICBpZiAoaHRtbCkge1xuICAgICAgICAgIGlmICghJChjb250ZW50KS5wYXJlbnQoKS5pcygkZWxlbWVudCkpIHtcbiAgICAgICAgICAgICRlbGVtZW50LmVtcHR5KCkuYXBwZW5kKGNvbnRlbnQpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAkZWxlbWVudC50ZXh0KCQoY29udGVudCkudGV4dCgpKTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgJGVsZW1lbnRbaHRtbCA/ICdodG1sJyA6ICd0ZXh0J10oY29udGVudCk7XG4gICAgICB9XG4gICAgfTtcblxuICAgIF9wcm90by5nZXRUaXRsZSA9IGZ1bmN0aW9uIGdldFRpdGxlKCkge1xuICAgICAgdmFyIHRpdGxlID0gdGhpcy5lbGVtZW50LmdldEF0dHJpYnV0ZSgnZGF0YS1vcmlnaW5hbC10aXRsZScpO1xuXG4gICAgICBpZiAoIXRpdGxlKSB7XG4gICAgICAgIHRpdGxlID0gdHlwZW9mIHRoaXMuY29uZmlnLnRpdGxlID09PSAnZnVuY3Rpb24nID8gdGhpcy5jb25maWcudGl0bGUuY2FsbCh0aGlzLmVsZW1lbnQpIDogdGhpcy5jb25maWcudGl0bGU7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiB0aXRsZTtcbiAgICB9OyAvLyBQcml2YXRlXG5cblxuICAgIF9wcm90by5fZ2V0Q29udGFpbmVyID0gZnVuY3Rpb24gX2dldENvbnRhaW5lcigpIHtcbiAgICAgIGlmICh0aGlzLmNvbmZpZy5jb250YWluZXIgPT09IGZhbHNlKSB7XG4gICAgICAgIHJldHVybiBkb2N1bWVudC5ib2R5O1xuICAgICAgfVxuXG4gICAgICBpZiAoVXRpbC5pc0VsZW1lbnQodGhpcy5jb25maWcuY29udGFpbmVyKSkge1xuICAgICAgICByZXR1cm4gJCh0aGlzLmNvbmZpZy5jb250YWluZXIpO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gJChkb2N1bWVudCkuZmluZCh0aGlzLmNvbmZpZy5jb250YWluZXIpO1xuICAgIH07XG5cbiAgICBfcHJvdG8uX2dldEF0dGFjaG1lbnQgPSBmdW5jdGlvbiBfZ2V0QXR0YWNobWVudChwbGFjZW1lbnQpIHtcbiAgICAgIHJldHVybiBBdHRhY2htZW50TWFwJDFbcGxhY2VtZW50LnRvVXBwZXJDYXNlKCldO1xuICAgIH07XG5cbiAgICBfcHJvdG8uX3NldExpc3RlbmVycyA9IGZ1bmN0aW9uIF9zZXRMaXN0ZW5lcnMoKSB7XG4gICAgICB2YXIgX3RoaXMzID0gdGhpcztcblxuICAgICAgdmFyIHRyaWdnZXJzID0gdGhpcy5jb25maWcudHJpZ2dlci5zcGxpdCgnICcpO1xuICAgICAgdHJpZ2dlcnMuZm9yRWFjaChmdW5jdGlvbiAodHJpZ2dlcikge1xuICAgICAgICBpZiAodHJpZ2dlciA9PT0gJ2NsaWNrJykge1xuICAgICAgICAgICQoX3RoaXMzLmVsZW1lbnQpLm9uKF90aGlzMy5jb25zdHJ1Y3Rvci5FdmVudC5DTElDSywgX3RoaXMzLmNvbmZpZy5zZWxlY3RvciwgZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgICAgICAgICByZXR1cm4gX3RoaXMzLnRvZ2dsZShldmVudCk7XG4gICAgICAgICAgfSk7XG4gICAgICAgIH0gZWxzZSBpZiAodHJpZ2dlciAhPT0gVHJpZ2dlci5NQU5VQUwpIHtcbiAgICAgICAgICB2YXIgZXZlbnRJbiA9IHRyaWdnZXIgPT09IFRyaWdnZXIuSE9WRVIgPyBfdGhpczMuY29uc3RydWN0b3IuRXZlbnQuTU9VU0VFTlRFUiA6IF90aGlzMy5jb25zdHJ1Y3Rvci5FdmVudC5GT0NVU0lOO1xuICAgICAgICAgIHZhciBldmVudE91dCA9IHRyaWdnZXIgPT09IFRyaWdnZXIuSE9WRVIgPyBfdGhpczMuY29uc3RydWN0b3IuRXZlbnQuTU9VU0VMRUFWRSA6IF90aGlzMy5jb25zdHJ1Y3Rvci5FdmVudC5GT0NVU09VVDtcbiAgICAgICAgICAkKF90aGlzMy5lbGVtZW50KS5vbihldmVudEluLCBfdGhpczMuY29uZmlnLnNlbGVjdG9yLCBmdW5jdGlvbiAoZXZlbnQpIHtcbiAgICAgICAgICAgIHJldHVybiBfdGhpczMuX2VudGVyKGV2ZW50KTtcbiAgICAgICAgICB9KS5vbihldmVudE91dCwgX3RoaXMzLmNvbmZpZy5zZWxlY3RvciwgZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgICAgICAgICByZXR1cm4gX3RoaXMzLl9sZWF2ZShldmVudCk7XG4gICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgICAgJCh0aGlzLmVsZW1lbnQpLmNsb3Nlc3QoJy5tb2RhbCcpLm9uKCdoaWRlLmJzLm1vZGFsJywgZnVuY3Rpb24gKCkge1xuICAgICAgICBpZiAoX3RoaXMzLmVsZW1lbnQpIHtcbiAgICAgICAgICBfdGhpczMuaGlkZSgpO1xuICAgICAgICB9XG4gICAgICB9KTtcblxuICAgICAgaWYgKHRoaXMuY29uZmlnLnNlbGVjdG9yKSB7XG4gICAgICAgIHRoaXMuY29uZmlnID0gX29iamVjdFNwcmVhZCh7fSwgdGhpcy5jb25maWcsIHtcbiAgICAgICAgICB0cmlnZ2VyOiAnbWFudWFsJyxcbiAgICAgICAgICBzZWxlY3RvcjogJydcbiAgICAgICAgfSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLl9maXhUaXRsZSgpO1xuICAgICAgfVxuICAgIH07XG5cbiAgICBfcHJvdG8uX2ZpeFRpdGxlID0gZnVuY3Rpb24gX2ZpeFRpdGxlKCkge1xuICAgICAgdmFyIHRpdGxlVHlwZSA9IHR5cGVvZiB0aGlzLmVsZW1lbnQuZ2V0QXR0cmlidXRlKCdkYXRhLW9yaWdpbmFsLXRpdGxlJyk7XG5cbiAgICAgIGlmICh0aGlzLmVsZW1lbnQuZ2V0QXR0cmlidXRlKCd0aXRsZScpIHx8IHRpdGxlVHlwZSAhPT0gJ3N0cmluZycpIHtcbiAgICAgICAgdGhpcy5lbGVtZW50LnNldEF0dHJpYnV0ZSgnZGF0YS1vcmlnaW5hbC10aXRsZScsIHRoaXMuZWxlbWVudC5nZXRBdHRyaWJ1dGUoJ3RpdGxlJykgfHwgJycpO1xuICAgICAgICB0aGlzLmVsZW1lbnQuc2V0QXR0cmlidXRlKCd0aXRsZScsICcnKTtcbiAgICAgIH1cbiAgICB9O1xuXG4gICAgX3Byb3RvLl9lbnRlciA9IGZ1bmN0aW9uIF9lbnRlcihldmVudCwgY29udGV4dCkge1xuICAgICAgdmFyIGRhdGFLZXkgPSB0aGlzLmNvbnN0cnVjdG9yLkRBVEFfS0VZO1xuICAgICAgY29udGV4dCA9IGNvbnRleHQgfHwgJChldmVudC5jdXJyZW50VGFyZ2V0KS5kYXRhKGRhdGFLZXkpO1xuXG4gICAgICBpZiAoIWNvbnRleHQpIHtcbiAgICAgICAgY29udGV4dCA9IG5ldyB0aGlzLmNvbnN0cnVjdG9yKGV2ZW50LmN1cnJlbnRUYXJnZXQsIHRoaXMuX2dldERlbGVnYXRlQ29uZmlnKCkpO1xuICAgICAgICAkKGV2ZW50LmN1cnJlbnRUYXJnZXQpLmRhdGEoZGF0YUtleSwgY29udGV4dCk7XG4gICAgICB9XG5cbiAgICAgIGlmIChldmVudCkge1xuICAgICAgICBjb250ZXh0Ll9hY3RpdmVUcmlnZ2VyW2V2ZW50LnR5cGUgPT09ICdmb2N1c2luJyA/IFRyaWdnZXIuRk9DVVMgOiBUcmlnZ2VyLkhPVkVSXSA9IHRydWU7XG4gICAgICB9XG5cbiAgICAgIGlmICgkKGNvbnRleHQuZ2V0VGlwRWxlbWVudCgpKS5oYXNDbGFzcyhDbGFzc05hbWUkNi5TSE9XKSB8fCBjb250ZXh0Ll9ob3ZlclN0YXRlID09PSBIb3ZlclN0YXRlLlNIT1cpIHtcbiAgICAgICAgY29udGV4dC5faG92ZXJTdGF0ZSA9IEhvdmVyU3RhdGUuU0hPVztcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICBjbGVhclRpbWVvdXQoY29udGV4dC5fdGltZW91dCk7XG4gICAgICBjb250ZXh0Ll9ob3ZlclN0YXRlID0gSG92ZXJTdGF0ZS5TSE9XO1xuXG4gICAgICBpZiAoIWNvbnRleHQuY29uZmlnLmRlbGF5IHx8ICFjb250ZXh0LmNvbmZpZy5kZWxheS5zaG93KSB7XG4gICAgICAgIGNvbnRleHQuc2hvdygpO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIGNvbnRleHQuX3RpbWVvdXQgPSBzZXRUaW1lb3V0KGZ1bmN0aW9uICgpIHtcbiAgICAgICAgaWYgKGNvbnRleHQuX2hvdmVyU3RhdGUgPT09IEhvdmVyU3RhdGUuU0hPVykge1xuICAgICAgICAgIGNvbnRleHQuc2hvdygpO1xuICAgICAgICB9XG4gICAgICB9LCBjb250ZXh0LmNvbmZpZy5kZWxheS5zaG93KTtcbiAgICB9O1xuXG4gICAgX3Byb3RvLl9sZWF2ZSA9IGZ1bmN0aW9uIF9sZWF2ZShldmVudCwgY29udGV4dCkge1xuICAgICAgdmFyIGRhdGFLZXkgPSB0aGlzLmNvbnN0cnVjdG9yLkRBVEFfS0VZO1xuICAgICAgY29udGV4dCA9IGNvbnRleHQgfHwgJChldmVudC5jdXJyZW50VGFyZ2V0KS5kYXRhKGRhdGFLZXkpO1xuXG4gICAgICBpZiAoIWNvbnRleHQpIHtcbiAgICAgICAgY29udGV4dCA9IG5ldyB0aGlzLmNvbnN0cnVjdG9yKGV2ZW50LmN1cnJlbnRUYXJnZXQsIHRoaXMuX2dldERlbGVnYXRlQ29uZmlnKCkpO1xuICAgICAgICAkKGV2ZW50LmN1cnJlbnRUYXJnZXQpLmRhdGEoZGF0YUtleSwgY29udGV4dCk7XG4gICAgICB9XG5cbiAgICAgIGlmIChldmVudCkge1xuICAgICAgICBjb250ZXh0Ll9hY3RpdmVUcmlnZ2VyW2V2ZW50LnR5cGUgPT09ICdmb2N1c291dCcgPyBUcmlnZ2VyLkZPQ1VTIDogVHJpZ2dlci5IT1ZFUl0gPSBmYWxzZTtcbiAgICAgIH1cblxuICAgICAgaWYgKGNvbnRleHQuX2lzV2l0aEFjdGl2ZVRyaWdnZXIoKSkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIGNsZWFyVGltZW91dChjb250ZXh0Ll90aW1lb3V0KTtcbiAgICAgIGNvbnRleHQuX2hvdmVyU3RhdGUgPSBIb3ZlclN0YXRlLk9VVDtcblxuICAgICAgaWYgKCFjb250ZXh0LmNvbmZpZy5kZWxheSB8fCAhY29udGV4dC5jb25maWcuZGVsYXkuaGlkZSkge1xuICAgICAgICBjb250ZXh0LmhpZGUoKTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICBjb250ZXh0Ll90aW1lb3V0ID0gc2V0VGltZW91dChmdW5jdGlvbiAoKSB7XG4gICAgICAgIGlmIChjb250ZXh0Ll9ob3ZlclN0YXRlID09PSBIb3ZlclN0YXRlLk9VVCkge1xuICAgICAgICAgIGNvbnRleHQuaGlkZSgpO1xuICAgICAgICB9XG4gICAgICB9LCBjb250ZXh0LmNvbmZpZy5kZWxheS5oaWRlKTtcbiAgICB9O1xuXG4gICAgX3Byb3RvLl9pc1dpdGhBY3RpdmVUcmlnZ2VyID0gZnVuY3Rpb24gX2lzV2l0aEFjdGl2ZVRyaWdnZXIoKSB7XG4gICAgICBmb3IgKHZhciB0cmlnZ2VyIGluIHRoaXMuX2FjdGl2ZVRyaWdnZXIpIHtcbiAgICAgICAgaWYgKHRoaXMuX2FjdGl2ZVRyaWdnZXJbdHJpZ2dlcl0pIHtcbiAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfTtcblxuICAgIF9wcm90by5fZ2V0Q29uZmlnID0gZnVuY3Rpb24gX2dldENvbmZpZyhjb25maWcpIHtcbiAgICAgIGNvbmZpZyA9IF9vYmplY3RTcHJlYWQoe30sIHRoaXMuY29uc3RydWN0b3IuRGVmYXVsdCwgJCh0aGlzLmVsZW1lbnQpLmRhdGEoKSwgdHlwZW9mIGNvbmZpZyA9PT0gJ29iamVjdCcgJiYgY29uZmlnID8gY29uZmlnIDoge30pO1xuXG4gICAgICBpZiAodHlwZW9mIGNvbmZpZy5kZWxheSA9PT0gJ251bWJlcicpIHtcbiAgICAgICAgY29uZmlnLmRlbGF5ID0ge1xuICAgICAgICAgIHNob3c6IGNvbmZpZy5kZWxheSxcbiAgICAgICAgICBoaWRlOiBjb25maWcuZGVsYXlcbiAgICAgICAgfTtcbiAgICAgIH1cblxuICAgICAgaWYgKHR5cGVvZiBjb25maWcudGl0bGUgPT09ICdudW1iZXInKSB7XG4gICAgICAgIGNvbmZpZy50aXRsZSA9IGNvbmZpZy50aXRsZS50b1N0cmluZygpO1xuICAgICAgfVxuXG4gICAgICBpZiAodHlwZW9mIGNvbmZpZy5jb250ZW50ID09PSAnbnVtYmVyJykge1xuICAgICAgICBjb25maWcuY29udGVudCA9IGNvbmZpZy5jb250ZW50LnRvU3RyaW5nKCk7XG4gICAgICB9XG5cbiAgICAgIFV0aWwudHlwZUNoZWNrQ29uZmlnKE5BTUUkNiwgY29uZmlnLCB0aGlzLmNvbnN0cnVjdG9yLkRlZmF1bHRUeXBlKTtcbiAgICAgIHJldHVybiBjb25maWc7XG4gICAgfTtcblxuICAgIF9wcm90by5fZ2V0RGVsZWdhdGVDb25maWcgPSBmdW5jdGlvbiBfZ2V0RGVsZWdhdGVDb25maWcoKSB7XG4gICAgICB2YXIgY29uZmlnID0ge307XG5cbiAgICAgIGlmICh0aGlzLmNvbmZpZykge1xuICAgICAgICBmb3IgKHZhciBrZXkgaW4gdGhpcy5jb25maWcpIHtcbiAgICAgICAgICBpZiAodGhpcy5jb25zdHJ1Y3Rvci5EZWZhdWx0W2tleV0gIT09IHRoaXMuY29uZmlnW2tleV0pIHtcbiAgICAgICAgICAgIGNvbmZpZ1trZXldID0gdGhpcy5jb25maWdba2V5XTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgcmV0dXJuIGNvbmZpZztcbiAgICB9O1xuXG4gICAgX3Byb3RvLl9jbGVhblRpcENsYXNzID0gZnVuY3Rpb24gX2NsZWFuVGlwQ2xhc3MoKSB7XG4gICAgICB2YXIgJHRpcCA9ICQodGhpcy5nZXRUaXBFbGVtZW50KCkpO1xuICAgICAgdmFyIHRhYkNsYXNzID0gJHRpcC5hdHRyKCdjbGFzcycpLm1hdGNoKEJTQ0xTX1BSRUZJWF9SRUdFWCk7XG5cbiAgICAgIGlmICh0YWJDbGFzcyAhPT0gbnVsbCAmJiB0YWJDbGFzcy5sZW5ndGgpIHtcbiAgICAgICAgJHRpcC5yZW1vdmVDbGFzcyh0YWJDbGFzcy5qb2luKCcnKSk7XG4gICAgICB9XG4gICAgfTtcblxuICAgIF9wcm90by5faGFuZGxlUG9wcGVyUGxhY2VtZW50Q2hhbmdlID0gZnVuY3Rpb24gX2hhbmRsZVBvcHBlclBsYWNlbWVudENoYW5nZShwb3BwZXJEYXRhKSB7XG4gICAgICB2YXIgcG9wcGVySW5zdGFuY2UgPSBwb3BwZXJEYXRhLmluc3RhbmNlO1xuICAgICAgdGhpcy50aXAgPSBwb3BwZXJJbnN0YW5jZS5wb3BwZXI7XG5cbiAgICAgIHRoaXMuX2NsZWFuVGlwQ2xhc3MoKTtcblxuICAgICAgdGhpcy5hZGRBdHRhY2htZW50Q2xhc3ModGhpcy5fZ2V0QXR0YWNobWVudChwb3BwZXJEYXRhLnBsYWNlbWVudCkpO1xuICAgIH07XG5cbiAgICBfcHJvdG8uX2ZpeFRyYW5zaXRpb24gPSBmdW5jdGlvbiBfZml4VHJhbnNpdGlvbigpIHtcbiAgICAgIHZhciB0aXAgPSB0aGlzLmdldFRpcEVsZW1lbnQoKTtcbiAgICAgIHZhciBpbml0Q29uZmlnQW5pbWF0aW9uID0gdGhpcy5jb25maWcuYW5pbWF0aW9uO1xuXG4gICAgICBpZiAodGlwLmdldEF0dHJpYnV0ZSgneC1wbGFjZW1lbnQnKSAhPT0gbnVsbCkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgICQodGlwKS5yZW1vdmVDbGFzcyhDbGFzc05hbWUkNi5GQURFKTtcbiAgICAgIHRoaXMuY29uZmlnLmFuaW1hdGlvbiA9IGZhbHNlO1xuICAgICAgdGhpcy5oaWRlKCk7XG4gICAgICB0aGlzLnNob3coKTtcbiAgICAgIHRoaXMuY29uZmlnLmFuaW1hdGlvbiA9IGluaXRDb25maWdBbmltYXRpb247XG4gICAgfTsgLy8gU3RhdGljXG5cblxuICAgIFRvb2x0aXAuX2pRdWVyeUludGVyZmFjZSA9IGZ1bmN0aW9uIF9qUXVlcnlJbnRlcmZhY2UoY29uZmlnKSB7XG4gICAgICByZXR1cm4gdGhpcy5lYWNoKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIGRhdGEgPSAkKHRoaXMpLmRhdGEoREFUQV9LRVkkNik7XG5cbiAgICAgICAgdmFyIF9jb25maWcgPSB0eXBlb2YgY29uZmlnID09PSAnb2JqZWN0JyAmJiBjb25maWc7XG5cbiAgICAgICAgaWYgKCFkYXRhICYmIC9kaXNwb3NlfGhpZGUvLnRlc3QoY29uZmlnKSkge1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICghZGF0YSkge1xuICAgICAgICAgIGRhdGEgPSBuZXcgVG9vbHRpcCh0aGlzLCBfY29uZmlnKTtcbiAgICAgICAgICAkKHRoaXMpLmRhdGEoREFUQV9LRVkkNiwgZGF0YSk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAodHlwZW9mIGNvbmZpZyA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgICBpZiAodHlwZW9mIGRhdGFbY29uZmlnXSA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoXCJObyBtZXRob2QgbmFtZWQgXFxcIlwiICsgY29uZmlnICsgXCJcXFwiXCIpO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIGRhdGFbY29uZmlnXSgpO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9O1xuXG4gICAgX2NyZWF0ZUNsYXNzKFRvb2x0aXAsIG51bGwsIFt7XG4gICAgICBrZXk6IFwiVkVSU0lPTlwiLFxuICAgICAgZ2V0OiBmdW5jdGlvbiBnZXQoKSB7XG4gICAgICAgIHJldHVybiBWRVJTSU9OJDY7XG4gICAgICB9XG4gICAgfSwge1xuICAgICAga2V5OiBcIkRlZmF1bHRcIixcbiAgICAgIGdldDogZnVuY3Rpb24gZ2V0KCkge1xuICAgICAgICByZXR1cm4gRGVmYXVsdCQ0O1xuICAgICAgfVxuICAgIH0sIHtcbiAgICAgIGtleTogXCJOQU1FXCIsXG4gICAgICBnZXQ6IGZ1bmN0aW9uIGdldCgpIHtcbiAgICAgICAgcmV0dXJuIE5BTUUkNjtcbiAgICAgIH1cbiAgICB9LCB7XG4gICAgICBrZXk6IFwiREFUQV9LRVlcIixcbiAgICAgIGdldDogZnVuY3Rpb24gZ2V0KCkge1xuICAgICAgICByZXR1cm4gREFUQV9LRVkkNjtcbiAgICAgIH1cbiAgICB9LCB7XG4gICAgICBrZXk6IFwiRXZlbnRcIixcbiAgICAgIGdldDogZnVuY3Rpb24gZ2V0KCkge1xuICAgICAgICByZXR1cm4gRXZlbnQkNjtcbiAgICAgIH1cbiAgICB9LCB7XG4gICAgICBrZXk6IFwiRVZFTlRfS0VZXCIsXG4gICAgICBnZXQ6IGZ1bmN0aW9uIGdldCgpIHtcbiAgICAgICAgcmV0dXJuIEVWRU5UX0tFWSQ2O1xuICAgICAgfVxuICAgIH0sIHtcbiAgICAgIGtleTogXCJEZWZhdWx0VHlwZVwiLFxuICAgICAgZ2V0OiBmdW5jdGlvbiBnZXQoKSB7XG4gICAgICAgIHJldHVybiBEZWZhdWx0VHlwZSQ0O1xuICAgICAgfVxuICAgIH1dKTtcblxuICAgIHJldHVybiBUb29sdGlwO1xuICB9KCk7XG4gIC8qKlxuICAgKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICogalF1ZXJ5XG4gICAqIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgKi9cblxuXG4gICQuZm5bTkFNRSQ2XSA9IFRvb2x0aXAuX2pRdWVyeUludGVyZmFjZTtcbiAgJC5mbltOQU1FJDZdLkNvbnN0cnVjdG9yID0gVG9vbHRpcDtcblxuICAkLmZuW05BTUUkNl0ubm9Db25mbGljdCA9IGZ1bmN0aW9uICgpIHtcbiAgICAkLmZuW05BTUUkNl0gPSBKUVVFUllfTk9fQ09ORkxJQ1QkNjtcbiAgICByZXR1cm4gVG9vbHRpcC5falF1ZXJ5SW50ZXJmYWNlO1xuICB9O1xuXG4gIC8qKlxuICAgKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICogQ29uc3RhbnRzXG4gICAqIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgKi9cblxuICB2YXIgTkFNRSQ3ID0gJ3BvcG92ZXInO1xuICB2YXIgVkVSU0lPTiQ3ID0gJzQuMi4xJztcbiAgdmFyIERBVEFfS0VZJDcgPSAnYnMucG9wb3Zlcic7XG4gIHZhciBFVkVOVF9LRVkkNyA9IFwiLlwiICsgREFUQV9LRVkkNztcbiAgdmFyIEpRVUVSWV9OT19DT05GTElDVCQ3ID0gJC5mbltOQU1FJDddO1xuICB2YXIgQ0xBU1NfUFJFRklYJDEgPSAnYnMtcG9wb3Zlcic7XG4gIHZhciBCU0NMU19QUkVGSVhfUkVHRVgkMSA9IG5ldyBSZWdFeHAoXCIoXnxcXFxccylcIiArIENMQVNTX1BSRUZJWCQxICsgXCJcXFxcUytcIiwgJ2cnKTtcblxuICB2YXIgRGVmYXVsdCQ1ID0gX29iamVjdFNwcmVhZCh7fSwgVG9vbHRpcC5EZWZhdWx0LCB7XG4gICAgcGxhY2VtZW50OiAncmlnaHQnLFxuICAgIHRyaWdnZXI6ICdjbGljaycsXG4gICAgY29udGVudDogJycsXG4gICAgdGVtcGxhdGU6ICc8ZGl2IGNsYXNzPVwicG9wb3ZlclwiIHJvbGU9XCJ0b29sdGlwXCI+JyArICc8ZGl2IGNsYXNzPVwiYXJyb3dcIj48L2Rpdj4nICsgJzxoMyBjbGFzcz1cInBvcG92ZXItaGVhZGVyXCI+PC9oMz4nICsgJzxkaXYgY2xhc3M9XCJwb3BvdmVyLWJvZHlcIj48L2Rpdj48L2Rpdj4nXG4gIH0pO1xuXG4gIHZhciBEZWZhdWx0VHlwZSQ1ID0gX29iamVjdFNwcmVhZCh7fSwgVG9vbHRpcC5EZWZhdWx0VHlwZSwge1xuICAgIGNvbnRlbnQ6ICcoc3RyaW5nfGVsZW1lbnR8ZnVuY3Rpb24pJ1xuICB9KTtcblxuICB2YXIgQ2xhc3NOYW1lJDcgPSB7XG4gICAgRkFERTogJ2ZhZGUnLFxuICAgIFNIT1c6ICdzaG93J1xuICB9O1xuICB2YXIgU2VsZWN0b3IkNyA9IHtcbiAgICBUSVRMRTogJy5wb3BvdmVyLWhlYWRlcicsXG4gICAgQ09OVEVOVDogJy5wb3BvdmVyLWJvZHknXG4gIH07XG4gIHZhciBFdmVudCQ3ID0ge1xuICAgIEhJREU6IFwiaGlkZVwiICsgRVZFTlRfS0VZJDcsXG4gICAgSElEREVOOiBcImhpZGRlblwiICsgRVZFTlRfS0VZJDcsXG4gICAgU0hPVzogXCJzaG93XCIgKyBFVkVOVF9LRVkkNyxcbiAgICBTSE9XTjogXCJzaG93blwiICsgRVZFTlRfS0VZJDcsXG4gICAgSU5TRVJURUQ6IFwiaW5zZXJ0ZWRcIiArIEVWRU5UX0tFWSQ3LFxuICAgIENMSUNLOiBcImNsaWNrXCIgKyBFVkVOVF9LRVkkNyxcbiAgICBGT0NVU0lOOiBcImZvY3VzaW5cIiArIEVWRU5UX0tFWSQ3LFxuICAgIEZPQ1VTT1VUOiBcImZvY3Vzb3V0XCIgKyBFVkVOVF9LRVkkNyxcbiAgICBNT1VTRUVOVEVSOiBcIm1vdXNlZW50ZXJcIiArIEVWRU5UX0tFWSQ3LFxuICAgIE1PVVNFTEVBVkU6IFwibW91c2VsZWF2ZVwiICsgRVZFTlRfS0VZJDdcbiAgICAvKipcbiAgICAgKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICAgKiBDbGFzcyBEZWZpbml0aW9uXG4gICAgICogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAgICovXG5cbiAgfTtcblxuICB2YXIgUG9wb3ZlciA9XG4gIC8qI19fUFVSRV9fKi9cbiAgZnVuY3Rpb24gKF9Ub29sdGlwKSB7XG4gICAgX2luaGVyaXRzTG9vc2UoUG9wb3ZlciwgX1Rvb2x0aXApO1xuXG4gICAgZnVuY3Rpb24gUG9wb3ZlcigpIHtcbiAgICAgIHJldHVybiBfVG9vbHRpcC5hcHBseSh0aGlzLCBhcmd1bWVudHMpIHx8IHRoaXM7XG4gICAgfVxuXG4gICAgdmFyIF9wcm90byA9IFBvcG92ZXIucHJvdG90eXBlO1xuXG4gICAgLy8gT3ZlcnJpZGVzXG4gICAgX3Byb3RvLmlzV2l0aENvbnRlbnQgPSBmdW5jdGlvbiBpc1dpdGhDb250ZW50KCkge1xuICAgICAgcmV0dXJuIHRoaXMuZ2V0VGl0bGUoKSB8fCB0aGlzLl9nZXRDb250ZW50KCk7XG4gICAgfTtcblxuICAgIF9wcm90by5hZGRBdHRhY2htZW50Q2xhc3MgPSBmdW5jdGlvbiBhZGRBdHRhY2htZW50Q2xhc3MoYXR0YWNobWVudCkge1xuICAgICAgJCh0aGlzLmdldFRpcEVsZW1lbnQoKSkuYWRkQ2xhc3MoQ0xBU1NfUFJFRklYJDEgKyBcIi1cIiArIGF0dGFjaG1lbnQpO1xuICAgIH07XG5cbiAgICBfcHJvdG8uZ2V0VGlwRWxlbWVudCA9IGZ1bmN0aW9uIGdldFRpcEVsZW1lbnQoKSB7XG4gICAgICB0aGlzLnRpcCA9IHRoaXMudGlwIHx8ICQodGhpcy5jb25maWcudGVtcGxhdGUpWzBdO1xuICAgICAgcmV0dXJuIHRoaXMudGlwO1xuICAgIH07XG5cbiAgICBfcHJvdG8uc2V0Q29udGVudCA9IGZ1bmN0aW9uIHNldENvbnRlbnQoKSB7XG4gICAgICB2YXIgJHRpcCA9ICQodGhpcy5nZXRUaXBFbGVtZW50KCkpOyAvLyBXZSB1c2UgYXBwZW5kIGZvciBodG1sIG9iamVjdHMgdG8gbWFpbnRhaW4ganMgZXZlbnRzXG5cbiAgICAgIHRoaXMuc2V0RWxlbWVudENvbnRlbnQoJHRpcC5maW5kKFNlbGVjdG9yJDcuVElUTEUpLCB0aGlzLmdldFRpdGxlKCkpO1xuXG4gICAgICB2YXIgY29udGVudCA9IHRoaXMuX2dldENvbnRlbnQoKTtcblxuICAgICAgaWYgKHR5cGVvZiBjb250ZW50ID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIGNvbnRlbnQgPSBjb250ZW50LmNhbGwodGhpcy5lbGVtZW50KTtcbiAgICAgIH1cblxuICAgICAgdGhpcy5zZXRFbGVtZW50Q29udGVudCgkdGlwLmZpbmQoU2VsZWN0b3IkNy5DT05URU5UKSwgY29udGVudCk7XG4gICAgICAkdGlwLnJlbW92ZUNsYXNzKENsYXNzTmFtZSQ3LkZBREUgKyBcIiBcIiArIENsYXNzTmFtZSQ3LlNIT1cpO1xuICAgIH07IC8vIFByaXZhdGVcblxuXG4gICAgX3Byb3RvLl9nZXRDb250ZW50ID0gZnVuY3Rpb24gX2dldENvbnRlbnQoKSB7XG4gICAgICByZXR1cm4gdGhpcy5lbGVtZW50LmdldEF0dHJpYnV0ZSgnZGF0YS1jb250ZW50JykgfHwgdGhpcy5jb25maWcuY29udGVudDtcbiAgICB9O1xuXG4gICAgX3Byb3RvLl9jbGVhblRpcENsYXNzID0gZnVuY3Rpb24gX2NsZWFuVGlwQ2xhc3MoKSB7XG4gICAgICB2YXIgJHRpcCA9ICQodGhpcy5nZXRUaXBFbGVtZW50KCkpO1xuICAgICAgdmFyIHRhYkNsYXNzID0gJHRpcC5hdHRyKCdjbGFzcycpLm1hdGNoKEJTQ0xTX1BSRUZJWF9SRUdFWCQxKTtcblxuICAgICAgaWYgKHRhYkNsYXNzICE9PSBudWxsICYmIHRhYkNsYXNzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgJHRpcC5yZW1vdmVDbGFzcyh0YWJDbGFzcy5qb2luKCcnKSk7XG4gICAgICB9XG4gICAgfTsgLy8gU3RhdGljXG5cblxuICAgIFBvcG92ZXIuX2pRdWVyeUludGVyZmFjZSA9IGZ1bmN0aW9uIF9qUXVlcnlJbnRlcmZhY2UoY29uZmlnKSB7XG4gICAgICByZXR1cm4gdGhpcy5lYWNoKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIGRhdGEgPSAkKHRoaXMpLmRhdGEoREFUQV9LRVkkNyk7XG5cbiAgICAgICAgdmFyIF9jb25maWcgPSB0eXBlb2YgY29uZmlnID09PSAnb2JqZWN0JyA/IGNvbmZpZyA6IG51bGw7XG5cbiAgICAgICAgaWYgKCFkYXRhICYmIC9kaXNwb3NlfGhpZGUvLnRlc3QoY29uZmlnKSkge1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICghZGF0YSkge1xuICAgICAgICAgIGRhdGEgPSBuZXcgUG9wb3Zlcih0aGlzLCBfY29uZmlnKTtcbiAgICAgICAgICAkKHRoaXMpLmRhdGEoREFUQV9LRVkkNywgZGF0YSk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAodHlwZW9mIGNvbmZpZyA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgICBpZiAodHlwZW9mIGRhdGFbY29uZmlnXSA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoXCJObyBtZXRob2QgbmFtZWQgXFxcIlwiICsgY29uZmlnICsgXCJcXFwiXCIpO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIGRhdGFbY29uZmlnXSgpO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9O1xuXG4gICAgX2NyZWF0ZUNsYXNzKFBvcG92ZXIsIG51bGwsIFt7XG4gICAgICBrZXk6IFwiVkVSU0lPTlwiLFxuICAgICAgLy8gR2V0dGVyc1xuICAgICAgZ2V0OiBmdW5jdGlvbiBnZXQoKSB7XG4gICAgICAgIHJldHVybiBWRVJTSU9OJDc7XG4gICAgICB9XG4gICAgfSwge1xuICAgICAga2V5OiBcIkRlZmF1bHRcIixcbiAgICAgIGdldDogZnVuY3Rpb24gZ2V0KCkge1xuICAgICAgICByZXR1cm4gRGVmYXVsdCQ1O1xuICAgICAgfVxuICAgIH0sIHtcbiAgICAgIGtleTogXCJOQU1FXCIsXG4gICAgICBnZXQ6IGZ1bmN0aW9uIGdldCgpIHtcbiAgICAgICAgcmV0dXJuIE5BTUUkNztcbiAgICAgIH1cbiAgICB9LCB7XG4gICAgICBrZXk6IFwiREFUQV9LRVlcIixcbiAgICAgIGdldDogZnVuY3Rpb24gZ2V0KCkge1xuICAgICAgICByZXR1cm4gREFUQV9LRVkkNztcbiAgICAgIH1cbiAgICB9LCB7XG4gICAgICBrZXk6IFwiRXZlbnRcIixcbiAgICAgIGdldDogZnVuY3Rpb24gZ2V0KCkge1xuICAgICAgICByZXR1cm4gRXZlbnQkNztcbiAgICAgIH1cbiAgICB9LCB7XG4gICAgICBrZXk6IFwiRVZFTlRfS0VZXCIsXG4gICAgICBnZXQ6IGZ1bmN0aW9uIGdldCgpIHtcbiAgICAgICAgcmV0dXJuIEVWRU5UX0tFWSQ3O1xuICAgICAgfVxuICAgIH0sIHtcbiAgICAgIGtleTogXCJEZWZhdWx0VHlwZVwiLFxuICAgICAgZ2V0OiBmdW5jdGlvbiBnZXQoKSB7XG4gICAgICAgIHJldHVybiBEZWZhdWx0VHlwZSQ1O1xuICAgICAgfVxuICAgIH1dKTtcblxuICAgIHJldHVybiBQb3BvdmVyO1xuICB9KFRvb2x0aXApO1xuICAvKipcbiAgICogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAqIGpRdWVyeVxuICAgKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICovXG5cblxuICAkLmZuW05BTUUkN10gPSBQb3BvdmVyLl9qUXVlcnlJbnRlcmZhY2U7XG4gICQuZm5bTkFNRSQ3XS5Db25zdHJ1Y3RvciA9IFBvcG92ZXI7XG5cbiAgJC5mbltOQU1FJDddLm5vQ29uZmxpY3QgPSBmdW5jdGlvbiAoKSB7XG4gICAgJC5mbltOQU1FJDddID0gSlFVRVJZX05PX0NPTkZMSUNUJDc7XG4gICAgcmV0dXJuIFBvcG92ZXIuX2pRdWVyeUludGVyZmFjZTtcbiAgfTtcblxuICAvKipcbiAgICogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAqIENvbnN0YW50c1xuICAgKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICovXG5cbiAgdmFyIE5BTUUkOCA9ICdzY3JvbGxzcHknO1xuICB2YXIgVkVSU0lPTiQ4ID0gJzQuMi4xJztcbiAgdmFyIERBVEFfS0VZJDggPSAnYnMuc2Nyb2xsc3B5JztcbiAgdmFyIEVWRU5UX0tFWSQ4ID0gXCIuXCIgKyBEQVRBX0tFWSQ4O1xuICB2YXIgREFUQV9BUElfS0VZJDYgPSAnLmRhdGEtYXBpJztcbiAgdmFyIEpRVUVSWV9OT19DT05GTElDVCQ4ID0gJC5mbltOQU1FJDhdO1xuICB2YXIgRGVmYXVsdCQ2ID0ge1xuICAgIG9mZnNldDogMTAsXG4gICAgbWV0aG9kOiAnYXV0bycsXG4gICAgdGFyZ2V0OiAnJ1xuICB9O1xuICB2YXIgRGVmYXVsdFR5cGUkNiA9IHtcbiAgICBvZmZzZXQ6ICdudW1iZXInLFxuICAgIG1ldGhvZDogJ3N0cmluZycsXG4gICAgdGFyZ2V0OiAnKHN0cmluZ3xlbGVtZW50KSdcbiAgfTtcbiAgdmFyIEV2ZW50JDggPSB7XG4gICAgQUNUSVZBVEU6IFwiYWN0aXZhdGVcIiArIEVWRU5UX0tFWSQ4LFxuICAgIFNDUk9MTDogXCJzY3JvbGxcIiArIEVWRU5UX0tFWSQ4LFxuICAgIExPQURfREFUQV9BUEk6IFwibG9hZFwiICsgRVZFTlRfS0VZJDggKyBEQVRBX0FQSV9LRVkkNlxuICB9O1xuICB2YXIgQ2xhc3NOYW1lJDggPSB7XG4gICAgRFJPUERPV05fSVRFTTogJ2Ryb3Bkb3duLWl0ZW0nLFxuICAgIERST1BET1dOX01FTlU6ICdkcm9wZG93bi1tZW51JyxcbiAgICBBQ1RJVkU6ICdhY3RpdmUnXG4gIH07XG4gIHZhciBTZWxlY3RvciQ4ID0ge1xuICAgIERBVEFfU1BZOiAnW2RhdGEtc3B5PVwic2Nyb2xsXCJdJyxcbiAgICBBQ1RJVkU6ICcuYWN0aXZlJyxcbiAgICBOQVZfTElTVF9HUk9VUDogJy5uYXYsIC5saXN0LWdyb3VwJyxcbiAgICBOQVZfTElOS1M6ICcubmF2LWxpbmsnLFxuICAgIE5BVl9JVEVNUzogJy5uYXYtaXRlbScsXG4gICAgTElTVF9JVEVNUzogJy5saXN0LWdyb3VwLWl0ZW0nLFxuICAgIERST1BET1dOOiAnLmRyb3Bkb3duJyxcbiAgICBEUk9QRE9XTl9JVEVNUzogJy5kcm9wZG93bi1pdGVtJyxcbiAgICBEUk9QRE9XTl9UT0dHTEU6ICcuZHJvcGRvd24tdG9nZ2xlJ1xuICB9O1xuICB2YXIgT2Zmc2V0TWV0aG9kID0ge1xuICAgIE9GRlNFVDogJ29mZnNldCcsXG4gICAgUE9TSVRJT046ICdwb3NpdGlvbidcbiAgICAvKipcbiAgICAgKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICAgKiBDbGFzcyBEZWZpbml0aW9uXG4gICAgICogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAgICovXG5cbiAgfTtcblxuICB2YXIgU2Nyb2xsU3B5ID1cbiAgLyojX19QVVJFX18qL1xuICBmdW5jdGlvbiAoKSB7XG4gICAgZnVuY3Rpb24gU2Nyb2xsU3B5KGVsZW1lbnQsIGNvbmZpZykge1xuICAgICAgdmFyIF90aGlzID0gdGhpcztcblxuICAgICAgdGhpcy5fZWxlbWVudCA9IGVsZW1lbnQ7XG4gICAgICB0aGlzLl9zY3JvbGxFbGVtZW50ID0gZWxlbWVudC50YWdOYW1lID09PSAnQk9EWScgPyB3aW5kb3cgOiBlbGVtZW50O1xuICAgICAgdGhpcy5fY29uZmlnID0gdGhpcy5fZ2V0Q29uZmlnKGNvbmZpZyk7XG4gICAgICB0aGlzLl9zZWxlY3RvciA9IHRoaXMuX2NvbmZpZy50YXJnZXQgKyBcIiBcIiArIFNlbGVjdG9yJDguTkFWX0xJTktTICsgXCIsXCIgKyAodGhpcy5fY29uZmlnLnRhcmdldCArIFwiIFwiICsgU2VsZWN0b3IkOC5MSVNUX0lURU1TICsgXCIsXCIpICsgKHRoaXMuX2NvbmZpZy50YXJnZXQgKyBcIiBcIiArIFNlbGVjdG9yJDguRFJPUERPV05fSVRFTVMpO1xuICAgICAgdGhpcy5fb2Zmc2V0cyA9IFtdO1xuICAgICAgdGhpcy5fdGFyZ2V0cyA9IFtdO1xuICAgICAgdGhpcy5fYWN0aXZlVGFyZ2V0ID0gbnVsbDtcbiAgICAgIHRoaXMuX3Njcm9sbEhlaWdodCA9IDA7XG4gICAgICAkKHRoaXMuX3Njcm9sbEVsZW1lbnQpLm9uKEV2ZW50JDguU0NST0xMLCBmdW5jdGlvbiAoZXZlbnQpIHtcbiAgICAgICAgcmV0dXJuIF90aGlzLl9wcm9jZXNzKGV2ZW50KTtcbiAgICAgIH0pO1xuICAgICAgdGhpcy5yZWZyZXNoKCk7XG5cbiAgICAgIHRoaXMuX3Byb2Nlc3MoKTtcbiAgICB9IC8vIEdldHRlcnNcblxuXG4gICAgdmFyIF9wcm90byA9IFNjcm9sbFNweS5wcm90b3R5cGU7XG5cbiAgICAvLyBQdWJsaWNcbiAgICBfcHJvdG8ucmVmcmVzaCA9IGZ1bmN0aW9uIHJlZnJlc2goKSB7XG4gICAgICB2YXIgX3RoaXMyID0gdGhpcztcblxuICAgICAgdmFyIGF1dG9NZXRob2QgPSB0aGlzLl9zY3JvbGxFbGVtZW50ID09PSB0aGlzLl9zY3JvbGxFbGVtZW50LndpbmRvdyA/IE9mZnNldE1ldGhvZC5PRkZTRVQgOiBPZmZzZXRNZXRob2QuUE9TSVRJT047XG4gICAgICB2YXIgb2Zmc2V0TWV0aG9kID0gdGhpcy5fY29uZmlnLm1ldGhvZCA9PT0gJ2F1dG8nID8gYXV0b01ldGhvZCA6IHRoaXMuX2NvbmZpZy5tZXRob2Q7XG4gICAgICB2YXIgb2Zmc2V0QmFzZSA9IG9mZnNldE1ldGhvZCA9PT0gT2Zmc2V0TWV0aG9kLlBPU0lUSU9OID8gdGhpcy5fZ2V0U2Nyb2xsVG9wKCkgOiAwO1xuICAgICAgdGhpcy5fb2Zmc2V0cyA9IFtdO1xuICAgICAgdGhpcy5fdGFyZ2V0cyA9IFtdO1xuICAgICAgdGhpcy5fc2Nyb2xsSGVpZ2h0ID0gdGhpcy5fZ2V0U2Nyb2xsSGVpZ2h0KCk7XG4gICAgICB2YXIgdGFyZ2V0cyA9IFtdLnNsaWNlLmNhbGwoZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbCh0aGlzLl9zZWxlY3RvcikpO1xuICAgICAgdGFyZ2V0cy5tYXAoZnVuY3Rpb24gKGVsZW1lbnQpIHtcbiAgICAgICAgdmFyIHRhcmdldDtcbiAgICAgICAgdmFyIHRhcmdldFNlbGVjdG9yID0gVXRpbC5nZXRTZWxlY3RvckZyb21FbGVtZW50KGVsZW1lbnQpO1xuXG4gICAgICAgIGlmICh0YXJnZXRTZWxlY3Rvcikge1xuICAgICAgICAgIHRhcmdldCA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IodGFyZ2V0U2VsZWN0b3IpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHRhcmdldCkge1xuICAgICAgICAgIHZhciB0YXJnZXRCQ1IgPSB0YXJnZXQuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XG5cbiAgICAgICAgICBpZiAodGFyZ2V0QkNSLndpZHRoIHx8IHRhcmdldEJDUi5oZWlnaHQpIHtcbiAgICAgICAgICAgIC8vIFRPRE8gKGZhdCk6IHJlbW92ZSBza2V0Y2ggcmVsaWFuY2Ugb24galF1ZXJ5IHBvc2l0aW9uL29mZnNldFxuICAgICAgICAgICAgcmV0dXJuIFskKHRhcmdldClbb2Zmc2V0TWV0aG9kXSgpLnRvcCArIG9mZnNldEJhc2UsIHRhcmdldFNlbGVjdG9yXTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgIH0pLmZpbHRlcihmdW5jdGlvbiAoaXRlbSkge1xuICAgICAgICByZXR1cm4gaXRlbTtcbiAgICAgIH0pLnNvcnQoZnVuY3Rpb24gKGEsIGIpIHtcbiAgICAgICAgcmV0dXJuIGFbMF0gLSBiWzBdO1xuICAgICAgfSkuZm9yRWFjaChmdW5jdGlvbiAoaXRlbSkge1xuICAgICAgICBfdGhpczIuX29mZnNldHMucHVzaChpdGVtWzBdKTtcblxuICAgICAgICBfdGhpczIuX3RhcmdldHMucHVzaChpdGVtWzFdKTtcbiAgICAgIH0pO1xuICAgIH07XG5cbiAgICBfcHJvdG8uZGlzcG9zZSA9IGZ1bmN0aW9uIGRpc3Bvc2UoKSB7XG4gICAgICAkLnJlbW92ZURhdGEodGhpcy5fZWxlbWVudCwgREFUQV9LRVkkOCk7XG4gICAgICAkKHRoaXMuX3Njcm9sbEVsZW1lbnQpLm9mZihFVkVOVF9LRVkkOCk7XG4gICAgICB0aGlzLl9lbGVtZW50ID0gbnVsbDtcbiAgICAgIHRoaXMuX3Njcm9sbEVsZW1lbnQgPSBudWxsO1xuICAgICAgdGhpcy5fY29uZmlnID0gbnVsbDtcbiAgICAgIHRoaXMuX3NlbGVjdG9yID0gbnVsbDtcbiAgICAgIHRoaXMuX29mZnNldHMgPSBudWxsO1xuICAgICAgdGhpcy5fdGFyZ2V0cyA9IG51bGw7XG4gICAgICB0aGlzLl9hY3RpdmVUYXJnZXQgPSBudWxsO1xuICAgICAgdGhpcy5fc2Nyb2xsSGVpZ2h0ID0gbnVsbDtcbiAgICB9OyAvLyBQcml2YXRlXG5cblxuICAgIF9wcm90by5fZ2V0Q29uZmlnID0gZnVuY3Rpb24gX2dldENvbmZpZyhjb25maWcpIHtcbiAgICAgIGNvbmZpZyA9IF9vYmplY3RTcHJlYWQoe30sIERlZmF1bHQkNiwgdHlwZW9mIGNvbmZpZyA9PT0gJ29iamVjdCcgJiYgY29uZmlnID8gY29uZmlnIDoge30pO1xuXG4gICAgICBpZiAodHlwZW9mIGNvbmZpZy50YXJnZXQgIT09ICdzdHJpbmcnKSB7XG4gICAgICAgIHZhciBpZCA9ICQoY29uZmlnLnRhcmdldCkuYXR0cignaWQnKTtcblxuICAgICAgICBpZiAoIWlkKSB7XG4gICAgICAgICAgaWQgPSBVdGlsLmdldFVJRChOQU1FJDgpO1xuICAgICAgICAgICQoY29uZmlnLnRhcmdldCkuYXR0cignaWQnLCBpZCk7XG4gICAgICAgIH1cblxuICAgICAgICBjb25maWcudGFyZ2V0ID0gXCIjXCIgKyBpZDtcbiAgICAgIH1cblxuICAgICAgVXRpbC50eXBlQ2hlY2tDb25maWcoTkFNRSQ4LCBjb25maWcsIERlZmF1bHRUeXBlJDYpO1xuICAgICAgcmV0dXJuIGNvbmZpZztcbiAgICB9O1xuXG4gICAgX3Byb3RvLl9nZXRTY3JvbGxUb3AgPSBmdW5jdGlvbiBfZ2V0U2Nyb2xsVG9wKCkge1xuICAgICAgcmV0dXJuIHRoaXMuX3Njcm9sbEVsZW1lbnQgPT09IHdpbmRvdyA/IHRoaXMuX3Njcm9sbEVsZW1lbnQucGFnZVlPZmZzZXQgOiB0aGlzLl9zY3JvbGxFbGVtZW50LnNjcm9sbFRvcDtcbiAgICB9O1xuXG4gICAgX3Byb3RvLl9nZXRTY3JvbGxIZWlnaHQgPSBmdW5jdGlvbiBfZ2V0U2Nyb2xsSGVpZ2h0KCkge1xuICAgICAgcmV0dXJuIHRoaXMuX3Njcm9sbEVsZW1lbnQuc2Nyb2xsSGVpZ2h0IHx8IE1hdGgubWF4KGRvY3VtZW50LmJvZHkuc2Nyb2xsSGVpZ2h0LCBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQuc2Nyb2xsSGVpZ2h0KTtcbiAgICB9O1xuXG4gICAgX3Byb3RvLl9nZXRPZmZzZXRIZWlnaHQgPSBmdW5jdGlvbiBfZ2V0T2Zmc2V0SGVpZ2h0KCkge1xuICAgICAgcmV0dXJuIHRoaXMuX3Njcm9sbEVsZW1lbnQgPT09IHdpbmRvdyA/IHdpbmRvdy5pbm5lckhlaWdodCA6IHRoaXMuX3Njcm9sbEVsZW1lbnQuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCkuaGVpZ2h0O1xuICAgIH07XG5cbiAgICBfcHJvdG8uX3Byb2Nlc3MgPSBmdW5jdGlvbiBfcHJvY2VzcygpIHtcbiAgICAgIHZhciBzY3JvbGxUb3AgPSB0aGlzLl9nZXRTY3JvbGxUb3AoKSArIHRoaXMuX2NvbmZpZy5vZmZzZXQ7XG5cbiAgICAgIHZhciBzY3JvbGxIZWlnaHQgPSB0aGlzLl9nZXRTY3JvbGxIZWlnaHQoKTtcblxuICAgICAgdmFyIG1heFNjcm9sbCA9IHRoaXMuX2NvbmZpZy5vZmZzZXQgKyBzY3JvbGxIZWlnaHQgLSB0aGlzLl9nZXRPZmZzZXRIZWlnaHQoKTtcblxuICAgICAgaWYgKHRoaXMuX3Njcm9sbEhlaWdodCAhPT0gc2Nyb2xsSGVpZ2h0KSB7XG4gICAgICAgIHRoaXMucmVmcmVzaCgpO1xuICAgICAgfVxuXG4gICAgICBpZiAoc2Nyb2xsVG9wID49IG1heFNjcm9sbCkge1xuICAgICAgICB2YXIgdGFyZ2V0ID0gdGhpcy5fdGFyZ2V0c1t0aGlzLl90YXJnZXRzLmxlbmd0aCAtIDFdO1xuXG4gICAgICAgIGlmICh0aGlzLl9hY3RpdmVUYXJnZXQgIT09IHRhcmdldCkge1xuICAgICAgICAgIHRoaXMuX2FjdGl2YXRlKHRhcmdldCk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIGlmICh0aGlzLl9hY3RpdmVUYXJnZXQgJiYgc2Nyb2xsVG9wIDwgdGhpcy5fb2Zmc2V0c1swXSAmJiB0aGlzLl9vZmZzZXRzWzBdID4gMCkge1xuICAgICAgICB0aGlzLl9hY3RpdmVUYXJnZXQgPSBudWxsO1xuXG4gICAgICAgIHRoaXMuX2NsZWFyKCk7XG5cbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICB2YXIgb2Zmc2V0TGVuZ3RoID0gdGhpcy5fb2Zmc2V0cy5sZW5ndGg7XG5cbiAgICAgIGZvciAodmFyIGkgPSBvZmZzZXRMZW5ndGg7IGktLTspIHtcbiAgICAgICAgdmFyIGlzQWN0aXZlVGFyZ2V0ID0gdGhpcy5fYWN0aXZlVGFyZ2V0ICE9PSB0aGlzLl90YXJnZXRzW2ldICYmIHNjcm9sbFRvcCA+PSB0aGlzLl9vZmZzZXRzW2ldICYmICh0eXBlb2YgdGhpcy5fb2Zmc2V0c1tpICsgMV0gPT09ICd1bmRlZmluZWQnIHx8IHNjcm9sbFRvcCA8IHRoaXMuX29mZnNldHNbaSArIDFdKTtcblxuICAgICAgICBpZiAoaXNBY3RpdmVUYXJnZXQpIHtcbiAgICAgICAgICB0aGlzLl9hY3RpdmF0ZSh0aGlzLl90YXJnZXRzW2ldKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH07XG5cbiAgICBfcHJvdG8uX2FjdGl2YXRlID0gZnVuY3Rpb24gX2FjdGl2YXRlKHRhcmdldCkge1xuICAgICAgdGhpcy5fYWN0aXZlVGFyZ2V0ID0gdGFyZ2V0O1xuXG4gICAgICB0aGlzLl9jbGVhcigpO1xuXG4gICAgICB2YXIgcXVlcmllcyA9IHRoaXMuX3NlbGVjdG9yLnNwbGl0KCcsJykubWFwKGZ1bmN0aW9uIChzZWxlY3Rvcikge1xuICAgICAgICByZXR1cm4gc2VsZWN0b3IgKyBcIltkYXRhLXRhcmdldD1cXFwiXCIgKyB0YXJnZXQgKyBcIlxcXCJdLFwiICsgc2VsZWN0b3IgKyBcIltocmVmPVxcXCJcIiArIHRhcmdldCArIFwiXFxcIl1cIjtcbiAgICAgIH0pO1xuXG4gICAgICB2YXIgJGxpbmsgPSAkKFtdLnNsaWNlLmNhbGwoZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbChxdWVyaWVzLmpvaW4oJywnKSkpKTtcblxuICAgICAgaWYgKCRsaW5rLmhhc0NsYXNzKENsYXNzTmFtZSQ4LkRST1BET1dOX0lURU0pKSB7XG4gICAgICAgICRsaW5rLmNsb3Nlc3QoU2VsZWN0b3IkOC5EUk9QRE9XTikuZmluZChTZWxlY3RvciQ4LkRST1BET1dOX1RPR0dMRSkuYWRkQ2xhc3MoQ2xhc3NOYW1lJDguQUNUSVZFKTtcbiAgICAgICAgJGxpbmsuYWRkQ2xhc3MoQ2xhc3NOYW1lJDguQUNUSVZFKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIFNldCB0cmlnZ2VyZWQgbGluayBhcyBhY3RpdmVcbiAgICAgICAgJGxpbmsuYWRkQ2xhc3MoQ2xhc3NOYW1lJDguQUNUSVZFKTsgLy8gU2V0IHRyaWdnZXJlZCBsaW5rcyBwYXJlbnRzIGFzIGFjdGl2ZVxuICAgICAgICAvLyBXaXRoIGJvdGggPHVsPiBhbmQgPG5hdj4gbWFya3VwIGEgcGFyZW50IGlzIHRoZSBwcmV2aW91cyBzaWJsaW5nIG9mIGFueSBuYXYgYW5jZXN0b3JcblxuICAgICAgICAkbGluay5wYXJlbnRzKFNlbGVjdG9yJDguTkFWX0xJU1RfR1JPVVApLnByZXYoU2VsZWN0b3IkOC5OQVZfTElOS1MgKyBcIiwgXCIgKyBTZWxlY3RvciQ4LkxJU1RfSVRFTVMpLmFkZENsYXNzKENsYXNzTmFtZSQ4LkFDVElWRSk7IC8vIEhhbmRsZSBzcGVjaWFsIGNhc2Ugd2hlbiAubmF2LWxpbmsgaXMgaW5zaWRlIC5uYXYtaXRlbVxuXG4gICAgICAgICRsaW5rLnBhcmVudHMoU2VsZWN0b3IkOC5OQVZfTElTVF9HUk9VUCkucHJldihTZWxlY3RvciQ4Lk5BVl9JVEVNUykuY2hpbGRyZW4oU2VsZWN0b3IkOC5OQVZfTElOS1MpLmFkZENsYXNzKENsYXNzTmFtZSQ4LkFDVElWRSk7XG4gICAgICB9XG5cbiAgICAgICQodGhpcy5fc2Nyb2xsRWxlbWVudCkudHJpZ2dlcihFdmVudCQ4LkFDVElWQVRFLCB7XG4gICAgICAgIHJlbGF0ZWRUYXJnZXQ6IHRhcmdldFxuICAgICAgfSk7XG4gICAgfTtcblxuICAgIF9wcm90by5fY2xlYXIgPSBmdW5jdGlvbiBfY2xlYXIoKSB7XG4gICAgICBbXS5zbGljZS5jYWxsKGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwodGhpcy5fc2VsZWN0b3IpKS5maWx0ZXIoZnVuY3Rpb24gKG5vZGUpIHtcbiAgICAgICAgcmV0dXJuIG5vZGUuY2xhc3NMaXN0LmNvbnRhaW5zKENsYXNzTmFtZSQ4LkFDVElWRSk7XG4gICAgICB9KS5mb3JFYWNoKGZ1bmN0aW9uIChub2RlKSB7XG4gICAgICAgIHJldHVybiBub2RlLmNsYXNzTGlzdC5yZW1vdmUoQ2xhc3NOYW1lJDguQUNUSVZFKTtcbiAgICAgIH0pO1xuICAgIH07IC8vIFN0YXRpY1xuXG5cbiAgICBTY3JvbGxTcHkuX2pRdWVyeUludGVyZmFjZSA9IGZ1bmN0aW9uIF9qUXVlcnlJbnRlcmZhY2UoY29uZmlnKSB7XG4gICAgICByZXR1cm4gdGhpcy5lYWNoKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIGRhdGEgPSAkKHRoaXMpLmRhdGEoREFUQV9LRVkkOCk7XG5cbiAgICAgICAgdmFyIF9jb25maWcgPSB0eXBlb2YgY29uZmlnID09PSAnb2JqZWN0JyAmJiBjb25maWc7XG5cbiAgICAgICAgaWYgKCFkYXRhKSB7XG4gICAgICAgICAgZGF0YSA9IG5ldyBTY3JvbGxTcHkodGhpcywgX2NvbmZpZyk7XG4gICAgICAgICAgJCh0aGlzKS5kYXRhKERBVEFfS0VZJDgsIGRhdGEpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHR5cGVvZiBjb25maWcgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgaWYgKHR5cGVvZiBkYXRhW2NvbmZpZ10gPT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKFwiTm8gbWV0aG9kIG5hbWVkIFxcXCJcIiArIGNvbmZpZyArIFwiXFxcIlwiKTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBkYXRhW2NvbmZpZ10oKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfTtcblxuICAgIF9jcmVhdGVDbGFzcyhTY3JvbGxTcHksIG51bGwsIFt7XG4gICAgICBrZXk6IFwiVkVSU0lPTlwiLFxuICAgICAgZ2V0OiBmdW5jdGlvbiBnZXQoKSB7XG4gICAgICAgIHJldHVybiBWRVJTSU9OJDg7XG4gICAgICB9XG4gICAgfSwge1xuICAgICAga2V5OiBcIkRlZmF1bHRcIixcbiAgICAgIGdldDogZnVuY3Rpb24gZ2V0KCkge1xuICAgICAgICByZXR1cm4gRGVmYXVsdCQ2O1xuICAgICAgfVxuICAgIH1dKTtcblxuICAgIHJldHVybiBTY3JvbGxTcHk7XG4gIH0oKTtcbiAgLyoqXG4gICAqIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgKiBEYXRhIEFwaSBpbXBsZW1lbnRhdGlvblxuICAgKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICovXG5cblxuICAkKHdpbmRvdykub24oRXZlbnQkOC5MT0FEX0RBVEFfQVBJLCBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHNjcm9sbFNweXMgPSBbXS5zbGljZS5jYWxsKGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoU2VsZWN0b3IkOC5EQVRBX1NQWSkpO1xuICAgIHZhciBzY3JvbGxTcHlzTGVuZ3RoID0gc2Nyb2xsU3B5cy5sZW5ndGg7XG5cbiAgICBmb3IgKHZhciBpID0gc2Nyb2xsU3B5c0xlbmd0aDsgaS0tOykge1xuICAgICAgdmFyICRzcHkgPSAkKHNjcm9sbFNweXNbaV0pO1xuXG4gICAgICBTY3JvbGxTcHkuX2pRdWVyeUludGVyZmFjZS5jYWxsKCRzcHksICRzcHkuZGF0YSgpKTtcbiAgICB9XG4gIH0pO1xuICAvKipcbiAgICogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAqIGpRdWVyeVxuICAgKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICovXG5cbiAgJC5mbltOQU1FJDhdID0gU2Nyb2xsU3B5Ll9qUXVlcnlJbnRlcmZhY2U7XG4gICQuZm5bTkFNRSQ4XS5Db25zdHJ1Y3RvciA9IFNjcm9sbFNweTtcblxuICAkLmZuW05BTUUkOF0ubm9Db25mbGljdCA9IGZ1bmN0aW9uICgpIHtcbiAgICAkLmZuW05BTUUkOF0gPSBKUVVFUllfTk9fQ09ORkxJQ1QkODtcbiAgICByZXR1cm4gU2Nyb2xsU3B5Ll9qUXVlcnlJbnRlcmZhY2U7XG4gIH07XG5cbiAgLyoqXG4gICAqIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgKiBDb25zdGFudHNcbiAgICogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAqL1xuXG4gIHZhciBOQU1FJDkgPSAndGFiJztcbiAgdmFyIFZFUlNJT04kOSA9ICc0LjIuMSc7XG4gIHZhciBEQVRBX0tFWSQ5ID0gJ2JzLnRhYic7XG4gIHZhciBFVkVOVF9LRVkkOSA9IFwiLlwiICsgREFUQV9LRVkkOTtcbiAgdmFyIERBVEFfQVBJX0tFWSQ3ID0gJy5kYXRhLWFwaSc7XG4gIHZhciBKUVVFUllfTk9fQ09ORkxJQ1QkOSA9ICQuZm5bTkFNRSQ5XTtcbiAgdmFyIEV2ZW50JDkgPSB7XG4gICAgSElERTogXCJoaWRlXCIgKyBFVkVOVF9LRVkkOSxcbiAgICBISURERU46IFwiaGlkZGVuXCIgKyBFVkVOVF9LRVkkOSxcbiAgICBTSE9XOiBcInNob3dcIiArIEVWRU5UX0tFWSQ5LFxuICAgIFNIT1dOOiBcInNob3duXCIgKyBFVkVOVF9LRVkkOSxcbiAgICBDTElDS19EQVRBX0FQSTogXCJjbGlja1wiICsgRVZFTlRfS0VZJDkgKyBEQVRBX0FQSV9LRVkkN1xuICB9O1xuICB2YXIgQ2xhc3NOYW1lJDkgPSB7XG4gICAgRFJPUERPV05fTUVOVTogJ2Ryb3Bkb3duLW1lbnUnLFxuICAgIEFDVElWRTogJ2FjdGl2ZScsXG4gICAgRElTQUJMRUQ6ICdkaXNhYmxlZCcsXG4gICAgRkFERTogJ2ZhZGUnLFxuICAgIFNIT1c6ICdzaG93J1xuICB9O1xuICB2YXIgU2VsZWN0b3IkOSA9IHtcbiAgICBEUk9QRE9XTjogJy5kcm9wZG93bicsXG4gICAgTkFWX0xJU1RfR1JPVVA6ICcubmF2LCAubGlzdC1ncm91cCcsXG4gICAgQUNUSVZFOiAnLmFjdGl2ZScsXG4gICAgQUNUSVZFX1VMOiAnPiBsaSA+IC5hY3RpdmUnLFxuICAgIERBVEFfVE9HR0xFOiAnW2RhdGEtdG9nZ2xlPVwidGFiXCJdLCBbZGF0YS10b2dnbGU9XCJwaWxsXCJdLCBbZGF0YS10b2dnbGU9XCJsaXN0XCJdJyxcbiAgICBEUk9QRE9XTl9UT0dHTEU6ICcuZHJvcGRvd24tdG9nZ2xlJyxcbiAgICBEUk9QRE9XTl9BQ1RJVkVfQ0hJTEQ6ICc+IC5kcm9wZG93bi1tZW51IC5hY3RpdmUnXG4gICAgLyoqXG4gICAgICogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAgICogQ2xhc3MgRGVmaW5pdGlvblxuICAgICAqIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgICAqL1xuXG4gIH07XG5cbiAgdmFyIFRhYiA9XG4gIC8qI19fUFVSRV9fKi9cbiAgZnVuY3Rpb24gKCkge1xuICAgIGZ1bmN0aW9uIFRhYihlbGVtZW50KSB7XG4gICAgICB0aGlzLl9lbGVtZW50ID0gZWxlbWVudDtcbiAgICB9IC8vIEdldHRlcnNcblxuXG4gICAgdmFyIF9wcm90byA9IFRhYi5wcm90b3R5cGU7XG5cbiAgICAvLyBQdWJsaWNcbiAgICBfcHJvdG8uc2hvdyA9IGZ1bmN0aW9uIHNob3coKSB7XG4gICAgICB2YXIgX3RoaXMgPSB0aGlzO1xuXG4gICAgICBpZiAodGhpcy5fZWxlbWVudC5wYXJlbnROb2RlICYmIHRoaXMuX2VsZW1lbnQucGFyZW50Tm9kZS5ub2RlVHlwZSA9PT0gTm9kZS5FTEVNRU5UX05PREUgJiYgJCh0aGlzLl9lbGVtZW50KS5oYXNDbGFzcyhDbGFzc05hbWUkOS5BQ1RJVkUpIHx8ICQodGhpcy5fZWxlbWVudCkuaGFzQ2xhc3MoQ2xhc3NOYW1lJDkuRElTQUJMRUQpKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgdmFyIHRhcmdldDtcbiAgICAgIHZhciBwcmV2aW91cztcbiAgICAgIHZhciBsaXN0RWxlbWVudCA9ICQodGhpcy5fZWxlbWVudCkuY2xvc2VzdChTZWxlY3RvciQ5Lk5BVl9MSVNUX0dST1VQKVswXTtcbiAgICAgIHZhciBzZWxlY3RvciA9IFV0aWwuZ2V0U2VsZWN0b3JGcm9tRWxlbWVudCh0aGlzLl9lbGVtZW50KTtcblxuICAgICAgaWYgKGxpc3RFbGVtZW50KSB7XG4gICAgICAgIHZhciBpdGVtU2VsZWN0b3IgPSBsaXN0RWxlbWVudC5ub2RlTmFtZSA9PT0gJ1VMJyB8fCBsaXN0RWxlbWVudC5ub2RlTmFtZSA9PT0gJ09MJyA/IFNlbGVjdG9yJDkuQUNUSVZFX1VMIDogU2VsZWN0b3IkOS5BQ1RJVkU7XG4gICAgICAgIHByZXZpb3VzID0gJC5tYWtlQXJyYXkoJChsaXN0RWxlbWVudCkuZmluZChpdGVtU2VsZWN0b3IpKTtcbiAgICAgICAgcHJldmlvdXMgPSBwcmV2aW91c1twcmV2aW91cy5sZW5ndGggLSAxXTtcbiAgICAgIH1cblxuICAgICAgdmFyIGhpZGVFdmVudCA9ICQuRXZlbnQoRXZlbnQkOS5ISURFLCB7XG4gICAgICAgIHJlbGF0ZWRUYXJnZXQ6IHRoaXMuX2VsZW1lbnRcbiAgICAgIH0pO1xuICAgICAgdmFyIHNob3dFdmVudCA9ICQuRXZlbnQoRXZlbnQkOS5TSE9XLCB7XG4gICAgICAgIHJlbGF0ZWRUYXJnZXQ6IHByZXZpb3VzXG4gICAgICB9KTtcblxuICAgICAgaWYgKHByZXZpb3VzKSB7XG4gICAgICAgICQocHJldmlvdXMpLnRyaWdnZXIoaGlkZUV2ZW50KTtcbiAgICAgIH1cblxuICAgICAgJCh0aGlzLl9lbGVtZW50KS50cmlnZ2VyKHNob3dFdmVudCk7XG5cbiAgICAgIGlmIChzaG93RXZlbnQuaXNEZWZhdWx0UHJldmVudGVkKCkgfHwgaGlkZUV2ZW50LmlzRGVmYXVsdFByZXZlbnRlZCgpKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgaWYgKHNlbGVjdG9yKSB7XG4gICAgICAgIHRhcmdldCA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3Ioc2VsZWN0b3IpO1xuICAgICAgfVxuXG4gICAgICB0aGlzLl9hY3RpdmF0ZSh0aGlzLl9lbGVtZW50LCBsaXN0RWxlbWVudCk7XG5cbiAgICAgIHZhciBjb21wbGV0ZSA9IGZ1bmN0aW9uIGNvbXBsZXRlKCkge1xuICAgICAgICB2YXIgaGlkZGVuRXZlbnQgPSAkLkV2ZW50KEV2ZW50JDkuSElEREVOLCB7XG4gICAgICAgICAgcmVsYXRlZFRhcmdldDogX3RoaXMuX2VsZW1lbnRcbiAgICAgICAgfSk7XG4gICAgICAgIHZhciBzaG93bkV2ZW50ID0gJC5FdmVudChFdmVudCQ5LlNIT1dOLCB7XG4gICAgICAgICAgcmVsYXRlZFRhcmdldDogcHJldmlvdXNcbiAgICAgICAgfSk7XG4gICAgICAgICQocHJldmlvdXMpLnRyaWdnZXIoaGlkZGVuRXZlbnQpO1xuICAgICAgICAkKF90aGlzLl9lbGVtZW50KS50cmlnZ2VyKHNob3duRXZlbnQpO1xuICAgICAgfTtcblxuICAgICAgaWYgKHRhcmdldCkge1xuICAgICAgICB0aGlzLl9hY3RpdmF0ZSh0YXJnZXQsIHRhcmdldC5wYXJlbnROb2RlLCBjb21wbGV0ZSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBjb21wbGV0ZSgpO1xuICAgICAgfVxuICAgIH07XG5cbiAgICBfcHJvdG8uZGlzcG9zZSA9IGZ1bmN0aW9uIGRpc3Bvc2UoKSB7XG4gICAgICAkLnJlbW92ZURhdGEodGhpcy5fZWxlbWVudCwgREFUQV9LRVkkOSk7XG4gICAgICB0aGlzLl9lbGVtZW50ID0gbnVsbDtcbiAgICB9OyAvLyBQcml2YXRlXG5cblxuICAgIF9wcm90by5fYWN0aXZhdGUgPSBmdW5jdGlvbiBfYWN0aXZhdGUoZWxlbWVudCwgY29udGFpbmVyLCBjYWxsYmFjaykge1xuICAgICAgdmFyIF90aGlzMiA9IHRoaXM7XG5cbiAgICAgIHZhciBhY3RpdmVFbGVtZW50cyA9IGNvbnRhaW5lciAmJiAoY29udGFpbmVyLm5vZGVOYW1lID09PSAnVUwnIHx8IGNvbnRhaW5lci5ub2RlTmFtZSA9PT0gJ09MJykgPyAkKGNvbnRhaW5lcikuZmluZChTZWxlY3RvciQ5LkFDVElWRV9VTCkgOiAkKGNvbnRhaW5lcikuY2hpbGRyZW4oU2VsZWN0b3IkOS5BQ1RJVkUpO1xuICAgICAgdmFyIGFjdGl2ZSA9IGFjdGl2ZUVsZW1lbnRzWzBdO1xuICAgICAgdmFyIGlzVHJhbnNpdGlvbmluZyA9IGNhbGxiYWNrICYmIGFjdGl2ZSAmJiAkKGFjdGl2ZSkuaGFzQ2xhc3MoQ2xhc3NOYW1lJDkuRkFERSk7XG5cbiAgICAgIHZhciBjb21wbGV0ZSA9IGZ1bmN0aW9uIGNvbXBsZXRlKCkge1xuICAgICAgICByZXR1cm4gX3RoaXMyLl90cmFuc2l0aW9uQ29tcGxldGUoZWxlbWVudCwgYWN0aXZlLCBjYWxsYmFjayk7XG4gICAgICB9O1xuXG4gICAgICBpZiAoYWN0aXZlICYmIGlzVHJhbnNpdGlvbmluZykge1xuICAgICAgICB2YXIgdHJhbnNpdGlvbkR1cmF0aW9uID0gVXRpbC5nZXRUcmFuc2l0aW9uRHVyYXRpb25Gcm9tRWxlbWVudChhY3RpdmUpO1xuICAgICAgICAkKGFjdGl2ZSkucmVtb3ZlQ2xhc3MoQ2xhc3NOYW1lJDkuU0hPVykub25lKFV0aWwuVFJBTlNJVElPTl9FTkQsIGNvbXBsZXRlKS5lbXVsYXRlVHJhbnNpdGlvbkVuZCh0cmFuc2l0aW9uRHVyYXRpb24pO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY29tcGxldGUoKTtcbiAgICAgIH1cbiAgICB9O1xuXG4gICAgX3Byb3RvLl90cmFuc2l0aW9uQ29tcGxldGUgPSBmdW5jdGlvbiBfdHJhbnNpdGlvbkNvbXBsZXRlKGVsZW1lbnQsIGFjdGl2ZSwgY2FsbGJhY2spIHtcbiAgICAgIGlmIChhY3RpdmUpIHtcbiAgICAgICAgJChhY3RpdmUpLnJlbW92ZUNsYXNzKENsYXNzTmFtZSQ5LkFDVElWRSk7XG4gICAgICAgIHZhciBkcm9wZG93bkNoaWxkID0gJChhY3RpdmUucGFyZW50Tm9kZSkuZmluZChTZWxlY3RvciQ5LkRST1BET1dOX0FDVElWRV9DSElMRClbMF07XG5cbiAgICAgICAgaWYgKGRyb3Bkb3duQ2hpbGQpIHtcbiAgICAgICAgICAkKGRyb3Bkb3duQ2hpbGQpLnJlbW92ZUNsYXNzKENsYXNzTmFtZSQ5LkFDVElWRSk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoYWN0aXZlLmdldEF0dHJpYnV0ZSgncm9sZScpID09PSAndGFiJykge1xuICAgICAgICAgIGFjdGl2ZS5zZXRBdHRyaWJ1dGUoJ2FyaWEtc2VsZWN0ZWQnLCBmYWxzZSk7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgJChlbGVtZW50KS5hZGRDbGFzcyhDbGFzc05hbWUkOS5BQ1RJVkUpO1xuXG4gICAgICBpZiAoZWxlbWVudC5nZXRBdHRyaWJ1dGUoJ3JvbGUnKSA9PT0gJ3RhYicpIHtcbiAgICAgICAgZWxlbWVudC5zZXRBdHRyaWJ1dGUoJ2FyaWEtc2VsZWN0ZWQnLCB0cnVlKTtcbiAgICAgIH1cblxuICAgICAgVXRpbC5yZWZsb3coZWxlbWVudCk7XG4gICAgICAkKGVsZW1lbnQpLmFkZENsYXNzKENsYXNzTmFtZSQ5LlNIT1cpO1xuXG4gICAgICBpZiAoZWxlbWVudC5wYXJlbnROb2RlICYmICQoZWxlbWVudC5wYXJlbnROb2RlKS5oYXNDbGFzcyhDbGFzc05hbWUkOS5EUk9QRE9XTl9NRU5VKSkge1xuICAgICAgICB2YXIgZHJvcGRvd25FbGVtZW50ID0gJChlbGVtZW50KS5jbG9zZXN0KFNlbGVjdG9yJDkuRFJPUERPV04pWzBdO1xuXG4gICAgICAgIGlmIChkcm9wZG93bkVsZW1lbnQpIHtcbiAgICAgICAgICB2YXIgZHJvcGRvd25Ub2dnbGVMaXN0ID0gW10uc2xpY2UuY2FsbChkcm9wZG93bkVsZW1lbnQucXVlcnlTZWxlY3RvckFsbChTZWxlY3RvciQ5LkRST1BET1dOX1RPR0dMRSkpO1xuICAgICAgICAgICQoZHJvcGRvd25Ub2dnbGVMaXN0KS5hZGRDbGFzcyhDbGFzc05hbWUkOS5BQ1RJVkUpO1xuICAgICAgICB9XG5cbiAgICAgICAgZWxlbWVudC5zZXRBdHRyaWJ1dGUoJ2FyaWEtZXhwYW5kZWQnLCB0cnVlKTtcbiAgICAgIH1cblxuICAgICAgaWYgKGNhbGxiYWNrKSB7XG4gICAgICAgIGNhbGxiYWNrKCk7XG4gICAgICB9XG4gICAgfTsgLy8gU3RhdGljXG5cblxuICAgIFRhYi5falF1ZXJ5SW50ZXJmYWNlID0gZnVuY3Rpb24gX2pRdWVyeUludGVyZmFjZShjb25maWcpIHtcbiAgICAgIHJldHVybiB0aGlzLmVhY2goZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgJHRoaXMgPSAkKHRoaXMpO1xuICAgICAgICB2YXIgZGF0YSA9ICR0aGlzLmRhdGEoREFUQV9LRVkkOSk7XG5cbiAgICAgICAgaWYgKCFkYXRhKSB7XG4gICAgICAgICAgZGF0YSA9IG5ldyBUYWIodGhpcyk7XG4gICAgICAgICAgJHRoaXMuZGF0YShEQVRBX0tFWSQ5LCBkYXRhKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh0eXBlb2YgY29uZmlnID09PSAnc3RyaW5nJykge1xuICAgICAgICAgIGlmICh0eXBlb2YgZGF0YVtjb25maWddID09PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihcIk5vIG1ldGhvZCBuYW1lZCBcXFwiXCIgKyBjb25maWcgKyBcIlxcXCJcIik7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgZGF0YVtjb25maWddKCk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH07XG5cbiAgICBfY3JlYXRlQ2xhc3MoVGFiLCBudWxsLCBbe1xuICAgICAga2V5OiBcIlZFUlNJT05cIixcbiAgICAgIGdldDogZnVuY3Rpb24gZ2V0KCkge1xuICAgICAgICByZXR1cm4gVkVSU0lPTiQ5O1xuICAgICAgfVxuICAgIH1dKTtcblxuICAgIHJldHVybiBUYWI7XG4gIH0oKTtcbiAgLyoqXG4gICAqIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgKiBEYXRhIEFwaSBpbXBsZW1lbnRhdGlvblxuICAgKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICovXG5cblxuICAkKGRvY3VtZW50KS5vbihFdmVudCQ5LkNMSUNLX0RBVEFfQVBJLCBTZWxlY3RvciQ5LkRBVEFfVE9HR0xFLCBmdW5jdGlvbiAoZXZlbnQpIHtcbiAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuXG4gICAgVGFiLl9qUXVlcnlJbnRlcmZhY2UuY2FsbCgkKHRoaXMpLCAnc2hvdycpO1xuICB9KTtcbiAgLyoqXG4gICAqIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgKiBqUXVlcnlcbiAgICogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAqL1xuXG4gICQuZm5bTkFNRSQ5XSA9IFRhYi5falF1ZXJ5SW50ZXJmYWNlO1xuICAkLmZuW05BTUUkOV0uQ29uc3RydWN0b3IgPSBUYWI7XG5cbiAgJC5mbltOQU1FJDldLm5vQ29uZmxpY3QgPSBmdW5jdGlvbiAoKSB7XG4gICAgJC5mbltOQU1FJDldID0gSlFVRVJZX05PX0NPTkZMSUNUJDk7XG4gICAgcmV0dXJuIFRhYi5falF1ZXJ5SW50ZXJmYWNlO1xuICB9O1xuXG4gIC8qKlxuICAgKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICogQ29uc3RhbnRzXG4gICAqIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgKi9cblxuICB2YXIgTkFNRSRhID0gJ3RvYXN0JztcbiAgdmFyIFZFUlNJT04kYSA9ICc0LjIuMSc7XG4gIHZhciBEQVRBX0tFWSRhID0gJ2JzLnRvYXN0JztcbiAgdmFyIEVWRU5UX0tFWSRhID0gXCIuXCIgKyBEQVRBX0tFWSRhO1xuICB2YXIgSlFVRVJZX05PX0NPTkZMSUNUJGEgPSAkLmZuW05BTUUkYV07XG4gIHZhciBFdmVudCRhID0ge1xuICAgIENMSUNLX0RJU01JU1M6IFwiY2xpY2suZGlzbWlzc1wiICsgRVZFTlRfS0VZJGEsXG4gICAgSElERTogXCJoaWRlXCIgKyBFVkVOVF9LRVkkYSxcbiAgICBISURERU46IFwiaGlkZGVuXCIgKyBFVkVOVF9LRVkkYSxcbiAgICBTSE9XOiBcInNob3dcIiArIEVWRU5UX0tFWSRhLFxuICAgIFNIT1dOOiBcInNob3duXCIgKyBFVkVOVF9LRVkkYVxuICB9O1xuICB2YXIgQ2xhc3NOYW1lJGEgPSB7XG4gICAgRkFERTogJ2ZhZGUnLFxuICAgIEhJREU6ICdoaWRlJyxcbiAgICBTSE9XOiAnc2hvdycsXG4gICAgU0hPV0lORzogJ3Nob3dpbmcnXG4gIH07XG4gIHZhciBEZWZhdWx0VHlwZSQ3ID0ge1xuICAgIGFuaW1hdGlvbjogJ2Jvb2xlYW4nLFxuICAgIGF1dG9oaWRlOiAnYm9vbGVhbicsXG4gICAgZGVsYXk6ICdudW1iZXInXG4gIH07XG4gIHZhciBEZWZhdWx0JDcgPSB7XG4gICAgYW5pbWF0aW9uOiB0cnVlLFxuICAgIGF1dG9oaWRlOiB0cnVlLFxuICAgIGRlbGF5OiA1MDBcbiAgfTtcbiAgdmFyIFNlbGVjdG9yJGEgPSB7XG4gICAgREFUQV9ESVNNSVNTOiAnW2RhdGEtZGlzbWlzcz1cInRvYXN0XCJdJ1xuICAgIC8qKlxuICAgICAqIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgICAqIENsYXNzIERlZmluaXRpb25cbiAgICAgKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICAgKi9cblxuICB9O1xuXG4gIHZhciBUb2FzdCA9XG4gIC8qI19fUFVSRV9fKi9cbiAgZnVuY3Rpb24gKCkge1xuICAgIGZ1bmN0aW9uIFRvYXN0KGVsZW1lbnQsIGNvbmZpZykge1xuICAgICAgdGhpcy5fZWxlbWVudCA9IGVsZW1lbnQ7XG4gICAgICB0aGlzLl9jb25maWcgPSB0aGlzLl9nZXRDb25maWcoY29uZmlnKTtcbiAgICAgIHRoaXMuX3RpbWVvdXQgPSBudWxsO1xuXG4gICAgICB0aGlzLl9zZXRMaXN0ZW5lcnMoKTtcbiAgICB9IC8vIEdldHRlcnNcblxuXG4gICAgdmFyIF9wcm90byA9IFRvYXN0LnByb3RvdHlwZTtcblxuICAgIC8vIFB1YmxpY1xuICAgIF9wcm90by5zaG93ID0gZnVuY3Rpb24gc2hvdygpIHtcbiAgICAgIHZhciBfdGhpcyA9IHRoaXM7XG5cbiAgICAgICQodGhpcy5fZWxlbWVudCkudHJpZ2dlcihFdmVudCRhLlNIT1cpO1xuXG4gICAgICBpZiAodGhpcy5fY29uZmlnLmFuaW1hdGlvbikge1xuICAgICAgICB0aGlzLl9lbGVtZW50LmNsYXNzTGlzdC5hZGQoQ2xhc3NOYW1lJGEuRkFERSk7XG4gICAgICB9XG5cbiAgICAgIHZhciBjb21wbGV0ZSA9IGZ1bmN0aW9uIGNvbXBsZXRlKCkge1xuICAgICAgICBfdGhpcy5fZWxlbWVudC5jbGFzc0xpc3QucmVtb3ZlKENsYXNzTmFtZSRhLlNIT1dJTkcpO1xuXG4gICAgICAgIF90aGlzLl9lbGVtZW50LmNsYXNzTGlzdC5hZGQoQ2xhc3NOYW1lJGEuU0hPVyk7XG5cbiAgICAgICAgJChfdGhpcy5fZWxlbWVudCkudHJpZ2dlcihFdmVudCRhLlNIT1dOKTtcblxuICAgICAgICBpZiAoX3RoaXMuX2NvbmZpZy5hdXRvaGlkZSkge1xuICAgICAgICAgIF90aGlzLmhpZGUoKTtcbiAgICAgICAgfVxuICAgICAgfTtcblxuICAgICAgdGhpcy5fZWxlbWVudC5jbGFzc0xpc3QucmVtb3ZlKENsYXNzTmFtZSRhLkhJREUpO1xuXG4gICAgICB0aGlzLl9lbGVtZW50LmNsYXNzTGlzdC5hZGQoQ2xhc3NOYW1lJGEuU0hPV0lORyk7XG5cbiAgICAgIGlmICh0aGlzLl9jb25maWcuYW5pbWF0aW9uKSB7XG4gICAgICAgIHZhciB0cmFuc2l0aW9uRHVyYXRpb24gPSBVdGlsLmdldFRyYW5zaXRpb25EdXJhdGlvbkZyb21FbGVtZW50KHRoaXMuX2VsZW1lbnQpO1xuICAgICAgICAkKHRoaXMuX2VsZW1lbnQpLm9uZShVdGlsLlRSQU5TSVRJT05fRU5ELCBjb21wbGV0ZSkuZW11bGF0ZVRyYW5zaXRpb25FbmQodHJhbnNpdGlvbkR1cmF0aW9uKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGNvbXBsZXRlKCk7XG4gICAgICB9XG4gICAgfTtcblxuICAgIF9wcm90by5oaWRlID0gZnVuY3Rpb24gaGlkZSh3aXRob3V0VGltZW91dCkge1xuICAgICAgdmFyIF90aGlzMiA9IHRoaXM7XG5cbiAgICAgIGlmICghdGhpcy5fZWxlbWVudC5jbGFzc0xpc3QuY29udGFpbnMoQ2xhc3NOYW1lJGEuU0hPVykpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICAkKHRoaXMuX2VsZW1lbnQpLnRyaWdnZXIoRXZlbnQkYS5ISURFKTtcblxuICAgICAgaWYgKHdpdGhvdXRUaW1lb3V0KSB7XG4gICAgICAgIHRoaXMuX2Nsb3NlKCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLl90aW1lb3V0ID0gc2V0VGltZW91dChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgX3RoaXMyLl9jbG9zZSgpO1xuICAgICAgICB9LCB0aGlzLl9jb25maWcuZGVsYXkpO1xuICAgICAgfVxuICAgIH07XG5cbiAgICBfcHJvdG8uZGlzcG9zZSA9IGZ1bmN0aW9uIGRpc3Bvc2UoKSB7XG4gICAgICBjbGVhclRpbWVvdXQodGhpcy5fdGltZW91dCk7XG4gICAgICB0aGlzLl90aW1lb3V0ID0gbnVsbDtcblxuICAgICAgaWYgKHRoaXMuX2VsZW1lbnQuY2xhc3NMaXN0LmNvbnRhaW5zKENsYXNzTmFtZSRhLlNIT1cpKSB7XG4gICAgICAgIHRoaXMuX2VsZW1lbnQuY2xhc3NMaXN0LnJlbW92ZShDbGFzc05hbWUkYS5TSE9XKTtcbiAgICAgIH1cblxuICAgICAgJCh0aGlzLl9lbGVtZW50KS5vZmYoRXZlbnQkYS5DTElDS19ESVNNSVNTKTtcbiAgICAgICQucmVtb3ZlRGF0YSh0aGlzLl9lbGVtZW50LCBEQVRBX0tFWSRhKTtcbiAgICAgIHRoaXMuX2VsZW1lbnQgPSBudWxsO1xuICAgICAgdGhpcy5fY29uZmlnID0gbnVsbDtcbiAgICB9OyAvLyBQcml2YXRlXG5cblxuICAgIF9wcm90by5fZ2V0Q29uZmlnID0gZnVuY3Rpb24gX2dldENvbmZpZyhjb25maWcpIHtcbiAgICAgIGNvbmZpZyA9IF9vYmplY3RTcHJlYWQoe30sIERlZmF1bHQkNywgJCh0aGlzLl9lbGVtZW50KS5kYXRhKCksIHR5cGVvZiBjb25maWcgPT09ICdvYmplY3QnICYmIGNvbmZpZyA/IGNvbmZpZyA6IHt9KTtcbiAgICAgIFV0aWwudHlwZUNoZWNrQ29uZmlnKE5BTUUkYSwgY29uZmlnLCB0aGlzLmNvbnN0cnVjdG9yLkRlZmF1bHRUeXBlKTtcbiAgICAgIHJldHVybiBjb25maWc7XG4gICAgfTtcblxuICAgIF9wcm90by5fc2V0TGlzdGVuZXJzID0gZnVuY3Rpb24gX3NldExpc3RlbmVycygpIHtcbiAgICAgIHZhciBfdGhpczMgPSB0aGlzO1xuXG4gICAgICAkKHRoaXMuX2VsZW1lbnQpLm9uKEV2ZW50JGEuQ0xJQ0tfRElTTUlTUywgU2VsZWN0b3IkYS5EQVRBX0RJU01JU1MsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIF90aGlzMy5oaWRlKHRydWUpO1xuICAgICAgfSk7XG4gICAgfTtcblxuICAgIF9wcm90by5fY2xvc2UgPSBmdW5jdGlvbiBfY2xvc2UoKSB7XG4gICAgICB2YXIgX3RoaXM0ID0gdGhpcztcblxuICAgICAgdmFyIGNvbXBsZXRlID0gZnVuY3Rpb24gY29tcGxldGUoKSB7XG4gICAgICAgIF90aGlzNC5fZWxlbWVudC5jbGFzc0xpc3QuYWRkKENsYXNzTmFtZSRhLkhJREUpO1xuXG4gICAgICAgICQoX3RoaXM0Ll9lbGVtZW50KS50cmlnZ2VyKEV2ZW50JGEuSElEREVOKTtcbiAgICAgIH07XG5cbiAgICAgIHRoaXMuX2VsZW1lbnQuY2xhc3NMaXN0LnJlbW92ZShDbGFzc05hbWUkYS5TSE9XKTtcblxuICAgICAgaWYgKHRoaXMuX2NvbmZpZy5hbmltYXRpb24pIHtcbiAgICAgICAgdmFyIHRyYW5zaXRpb25EdXJhdGlvbiA9IFV0aWwuZ2V0VHJhbnNpdGlvbkR1cmF0aW9uRnJvbUVsZW1lbnQodGhpcy5fZWxlbWVudCk7XG4gICAgICAgICQodGhpcy5fZWxlbWVudCkub25lKFV0aWwuVFJBTlNJVElPTl9FTkQsIGNvbXBsZXRlKS5lbXVsYXRlVHJhbnNpdGlvbkVuZCh0cmFuc2l0aW9uRHVyYXRpb24pO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY29tcGxldGUoKTtcbiAgICAgIH1cbiAgICB9OyAvLyBTdGF0aWNcblxuXG4gICAgVG9hc3QuX2pRdWVyeUludGVyZmFjZSA9IGZ1bmN0aW9uIF9qUXVlcnlJbnRlcmZhY2UoY29uZmlnKSB7XG4gICAgICByZXR1cm4gdGhpcy5lYWNoKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyICRlbGVtZW50ID0gJCh0aGlzKTtcbiAgICAgICAgdmFyIGRhdGEgPSAkZWxlbWVudC5kYXRhKERBVEFfS0VZJGEpO1xuXG4gICAgICAgIHZhciBfY29uZmlnID0gdHlwZW9mIGNvbmZpZyA9PT0gJ29iamVjdCcgJiYgY29uZmlnO1xuXG4gICAgICAgIGlmICghZGF0YSkge1xuICAgICAgICAgIGRhdGEgPSBuZXcgVG9hc3QodGhpcywgX2NvbmZpZyk7XG4gICAgICAgICAgJGVsZW1lbnQuZGF0YShEQVRBX0tFWSRhLCBkYXRhKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh0eXBlb2YgY29uZmlnID09PSAnc3RyaW5nJykge1xuICAgICAgICAgIGlmICh0eXBlb2YgZGF0YVtjb25maWddID09PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihcIk5vIG1ldGhvZCBuYW1lZCBcXFwiXCIgKyBjb25maWcgKyBcIlxcXCJcIik7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgZGF0YVtjb25maWddKHRoaXMpO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9O1xuXG4gICAgX2NyZWF0ZUNsYXNzKFRvYXN0LCBudWxsLCBbe1xuICAgICAga2V5OiBcIlZFUlNJT05cIixcbiAgICAgIGdldDogZnVuY3Rpb24gZ2V0KCkge1xuICAgICAgICByZXR1cm4gVkVSU0lPTiRhO1xuICAgICAgfVxuICAgIH0sIHtcbiAgICAgIGtleTogXCJEZWZhdWx0VHlwZVwiLFxuICAgICAgZ2V0OiBmdW5jdGlvbiBnZXQoKSB7XG4gICAgICAgIHJldHVybiBEZWZhdWx0VHlwZSQ3O1xuICAgICAgfVxuICAgIH1dKTtcblxuICAgIHJldHVybiBUb2FzdDtcbiAgfSgpO1xuICAvKipcbiAgICogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAqIGpRdWVyeVxuICAgKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICovXG5cblxuICAkLmZuW05BTUUkYV0gPSBUb2FzdC5falF1ZXJ5SW50ZXJmYWNlO1xuICAkLmZuW05BTUUkYV0uQ29uc3RydWN0b3IgPSBUb2FzdDtcblxuICAkLmZuW05BTUUkYV0ubm9Db25mbGljdCA9IGZ1bmN0aW9uICgpIHtcbiAgICAkLmZuW05BTUUkYV0gPSBKUVVFUllfTk9fQ09ORkxJQ1QkYTtcbiAgICByZXR1cm4gVG9hc3QuX2pRdWVyeUludGVyZmFjZTtcbiAgfTtcblxuICAvKipcbiAgICogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICogQm9vdHN0cmFwICh2NC4yLjEpOiBpbmRleC5qc1xuICAgKiBMaWNlbnNlZCB1bmRlciBNSVQgKGh0dHBzOi8vZ2l0aHViLmNvbS90d2JzL2Jvb3RzdHJhcC9ibG9iL21hc3Rlci9MSUNFTlNFKVxuICAgKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgKi9cblxuICAoZnVuY3Rpb24gKCkge1xuICAgIGlmICh0eXBlb2YgJCA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ0Jvb3RzdHJhcFxcJ3MgSmF2YVNjcmlwdCByZXF1aXJlcyBqUXVlcnkuIGpRdWVyeSBtdXN0IGJlIGluY2x1ZGVkIGJlZm9yZSBCb290c3RyYXBcXCdzIEphdmFTY3JpcHQuJyk7XG4gICAgfVxuXG4gICAgdmFyIHZlcnNpb24gPSAkLmZuLmpxdWVyeS5zcGxpdCgnICcpWzBdLnNwbGl0KCcuJyk7XG4gICAgdmFyIG1pbk1ham9yID0gMTtcbiAgICB2YXIgbHRNYWpvciA9IDI7XG4gICAgdmFyIG1pbk1pbm9yID0gOTtcbiAgICB2YXIgbWluUGF0Y2ggPSAxO1xuICAgIHZhciBtYXhNYWpvciA9IDQ7XG5cbiAgICBpZiAodmVyc2lvblswXSA8IGx0TWFqb3IgJiYgdmVyc2lvblsxXSA8IG1pbk1pbm9yIHx8IHZlcnNpb25bMF0gPT09IG1pbk1ham9yICYmIHZlcnNpb25bMV0gPT09IG1pbk1pbm9yICYmIHZlcnNpb25bMl0gPCBtaW5QYXRjaCB8fCB2ZXJzaW9uWzBdID49IG1heE1ham9yKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ0Jvb3RzdHJhcFxcJ3MgSmF2YVNjcmlwdCByZXF1aXJlcyBhdCBsZWFzdCBqUXVlcnkgdjEuOS4xIGJ1dCBsZXNzIHRoYW4gdjQuMC4wJyk7XG4gICAgfVxuICB9KSgpO1xuXG4gIGV4cG9ydHMuVXRpbCA9IFV0aWw7XG4gIGV4cG9ydHMuQWxlcnQgPSBBbGVydDtcbiAgZXhwb3J0cy5CdXR0b24gPSBCdXR0b247XG4gIGV4cG9ydHMuQ2Fyb3VzZWwgPSBDYXJvdXNlbDtcbiAgZXhwb3J0cy5Db2xsYXBzZSA9IENvbGxhcHNlO1xuICBleHBvcnRzLkRyb3Bkb3duID0gRHJvcGRvd247XG4gIGV4cG9ydHMuTW9kYWwgPSBNb2RhbDtcbiAgZXhwb3J0cy5Qb3BvdmVyID0gUG9wb3ZlcjtcbiAgZXhwb3J0cy5TY3JvbGxzcHkgPSBTY3JvbGxTcHk7XG4gIGV4cG9ydHMuVGFiID0gVGFiO1xuICBleHBvcnRzLlRvYXN0ID0gVG9hc3Q7XG4gIGV4cG9ydHMuVG9vbHRpcCA9IFRvb2x0aXA7XG5cbiAgT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsICdfX2VzTW9kdWxlJywgeyB2YWx1ZTogdHJ1ZSB9KTtcblxufSkpKTtcbi8vIyBzb3VyY2VNYXBwaW5nVVJMPWJvb3RzdHJhcC5qcy5tYXBcblxudmFyIGNvb2tpZSA9IGZ1bmN0aW9uIChrZXksIHZhbHVlLCBvcHRpb25zKSB7XG5cblx0Ly8ga2V5IGFuZCBhdCBsZWFzdCB2YWx1ZSBnaXZlbiwgc2V0IGNvb2tpZS4uLlxuXHRpZiAoYXJndW1lbnRzLmxlbmd0aCA+IDEgJiYgU3RyaW5nKHZhbHVlKSAhPT0gXCJbb2JqZWN0IE9iamVjdF1cIikge1xuXHRcdG9wdGlvbnMgPSBqUXVlcnkuZXh0ZW5kKHt9LCBvcHRpb25zKTtcblxuXHRcdGlmICh2YWx1ZSA9PT0gbnVsbCB8fCB2YWx1ZSA9PT0gdW5kZWZpbmVkKSB7XG5cdFx0XHRvcHRpb25zLmV4cGlyZXMgPSAtMTtcblx0XHR9XG5cblx0XHRpZiAodHlwZW9mIG9wdGlvbnMuZXhwaXJlcyA9PT0gJ251bWJlcicpIHtcblx0XHRcdHZhciBkYXlzID0gb3B0aW9ucy5leHBpcmVzLCB0ID0gb3B0aW9ucy5leHBpcmVzID0gbmV3IERhdGUoKTtcblx0XHRcdHQuc2V0RGF0ZSh0LmdldERhdGUoKSArIGRheXMpO1xuXHRcdH1cblxuXHRcdHZhbHVlID0gU3RyaW5nKHZhbHVlKTtcblxuXHRcdHJldHVybiAoZG9jdW1lbnQuY29va2llID0gW1xuXHRcdFx0ZW5jb2RlVVJJQ29tcG9uZW50KGtleSksICc9Jyxcblx0XHRcdG9wdGlvbnMucmF3ID8gdmFsdWUgOiBlbmNvZGVVUklDb21wb25lbnQodmFsdWUpLFxuXHRcdFx0b3B0aW9ucy5leHBpcmVzID8gJzsgZXhwaXJlcz0nICsgb3B0aW9ucy5leHBpcmVzLnRvVVRDU3RyaW5nKCkgOiAnJywgLy8gdXNlIGV4cGlyZXMgYXR0cmlidXRlLCBtYXgtYWdlIGlzIG5vdCBzdXBwb3J0ZWQgYnkgSUVcblx0XHRcdCc7IHBhdGg9LycsXG5cdFx0XHRvcHRpb25zLnNlY3VyZSA/ICc7IHNlY3VyZScgOiAnJ1xuXHRcdF0uam9pbignJykpO1xuXHR9XG5cblx0Ly8ga2V5IGFuZCBwb3NzaWJseSBvcHRpb25zIGdpdmVuLCBnZXQgY29va2llLi4uXG5cdG9wdGlvbnMgPSB2YWx1ZSB8fCB7fTtcblx0dmFyIHJlc3VsdCwgZGVjb2RlID0gb3B0aW9ucy5yYXcgPyBmdW5jdGlvbiAocykgeyByZXR1cm4gczsgfSA6IGRlY29kZVVSSUNvbXBvbmVudDtcblx0cmV0dXJuIChyZXN1bHQgPSBuZXcgUmVnRXhwKCcoPzpefDsgKScgKyBlbmNvZGVVUklDb21wb25lbnQoa2V5KSArICc9KFteO10qKScpLmV4ZWMoZG9jdW1lbnQuY29va2llKSkgPyBkZWNvZGUocmVzdWx0WzFdKSA6IG51bGw7XG59O1xuXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gZmFuY3lCb3ggdjMuNS4yXG4vL1xuLy8gTGljZW5zZWQgR1BMdjMgZm9yIG9wZW4gc291cmNlIHVzZVxuLy8gb3IgZmFuY3lCb3ggQ29tbWVyY2lhbCBMaWNlbnNlIGZvciBjb21tZXJjaWFsIHVzZVxuLy9cbi8vIGh0dHA6Ly9mYW5jeWFwcHMuY29tL2ZhbmN5Ym94L1xuLy8gQ29weXJpZ2h0IDIwMTggZmFuY3lBcHBzXG4vL1xuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbihmdW5jdGlvbih3aW5kb3csIGRvY3VtZW50LCAkLCB1bmRlZmluZWQpIHtcblx0XCJ1c2Ugc3RyaWN0XCI7XG5cblx0d2luZG93LmNvbnNvbGUgPSB3aW5kb3cuY29uc29sZSB8fCB7XG5cdFx0aW5mbzogZnVuY3Rpb24oc3R1ZmYpIHt9XG5cdH07XG5cblx0Ly8gSWYgdGhlcmUncyBubyBqUXVlcnksIGZhbmN5Qm94IGNhbid0IHdvcmtcblx0Ly8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuXHRpZiAoISQpIHtcblx0XHRyZXR1cm47XG5cdH1cblxuXHQvLyBDaGVjayBpZiBmYW5jeUJveCBpcyBhbHJlYWR5IGluaXRpYWxpemVkXG5cdC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuXHRpZiAoJC5mbi5mYW5jeWJveCkge1xuXHRcdGNvbnNvbGUuaW5mbyhcImZhbmN5Qm94IGFscmVhZHkgaW5pdGlhbGl6ZWRcIik7XG5cblx0XHRyZXR1cm47XG5cdH1cblxuXHQvLyBQcml2YXRlIGRlZmF1bHQgc2V0dGluZ3Ncblx0Ly8gPT09PT09PT09PT09PT09PT09PT09PT09XG5cblx0dmFyIGRlZmF1bHRzID0ge1xuXHRcdC8vIENsb3NlIGV4aXN0aW5nIG1vZGFsc1xuXHRcdC8vIFNldCB0aGlzIHRvIGZhbHNlIGlmIHlvdSBkbyBub3QgbmVlZCB0byBzdGFjayBtdWx0aXBsZSBpbnN0YW5jZXNcblx0XHRjbG9zZUV4aXN0aW5nOiBmYWxzZSxcblxuXHRcdC8vIEVuYWJsZSBpbmZpbml0ZSBnYWxsZXJ5IG5hdmlnYXRpb25cblx0XHRsb29wOiBmYWxzZSxcblxuXHRcdC8vIEhvcml6b250YWwgc3BhY2UgYmV0d2VlbiBzbGlkZXNcblx0XHRndXR0ZXI6IDUwLFxuXG5cdFx0Ly8gRW5hYmxlIGtleWJvYXJkIG5hdmlnYXRpb25cblx0XHRrZXlib2FyZDogdHJ1ZSxcblxuXHRcdC8vIFNob3VsZCBhbGxvdyBjYXB0aW9uIHRvIG92ZXJsYXAgdGhlIGNvbnRlbnRcblx0XHRwcmV2ZW50Q2FwdGlvbk92ZXJsYXA6IHRydWUsXG5cblx0XHQvLyBTaG91bGQgZGlzcGxheSBuYXZpZ2F0aW9uIGFycm93cyBhdCB0aGUgc2NyZWVuIGVkZ2VzXG5cdFx0YXJyb3dzOiB0cnVlLFxuXG5cdFx0Ly8gU2hvdWxkIGRpc3BsYXkgY291bnRlciBhdCB0aGUgdG9wIGxlZnQgY29ybmVyXG5cdFx0aW5mb2JhcjogdHJ1ZSxcblxuXHRcdC8vIFNob3VsZCBkaXNwbGF5IGNsb3NlIGJ1dHRvbiAodXNpbmcgYGJ0blRwbC5zbWFsbEJ0bmAgdGVtcGxhdGUpIG92ZXIgdGhlIGNvbnRlbnRcblx0XHQvLyBDYW4gYmUgdHJ1ZSwgZmFsc2UsIFwiYXV0b1wiXG5cdFx0Ly8gSWYgXCJhdXRvXCIgLSB3aWxsIGJlIGF1dG9tYXRpY2FsbHkgZW5hYmxlZCBmb3IgXCJodG1sXCIsIFwiaW5saW5lXCIgb3IgXCJhamF4XCIgaXRlbXNcblx0XHRzbWFsbEJ0bjogXCJhdXRvXCIsXG5cblx0XHQvLyBTaG91bGQgZGlzcGxheSB0b29sYmFyIChidXR0b25zIGF0IHRoZSB0b3ApXG5cdFx0Ly8gQ2FuIGJlIHRydWUsIGZhbHNlLCBcImF1dG9cIlxuXHRcdC8vIElmIFwiYXV0b1wiIC0gd2lsbCBiZSBhdXRvbWF0aWNhbGx5IGhpZGRlbiBpZiBcInNtYWxsQnRuXCIgaXMgZW5hYmxlZFxuXHRcdHRvb2xiYXI6IFwiYXV0b1wiLFxuXG5cdFx0Ly8gV2hhdCBidXR0b25zIHNob3VsZCBhcHBlYXIgaW4gdGhlIHRvcCByaWdodCBjb3JuZXIuXG5cdFx0Ly8gQnV0dG9ucyB3aWxsIGJlIGNyZWF0ZWQgdXNpbmcgdGVtcGxhdGVzIGZyb20gYGJ0blRwbGAgb3B0aW9uXG5cdFx0Ly8gYW5kIHRoZXkgd2lsbCBiZSBwbGFjZWQgaW50byB0b29sYmFyIChjbGFzcz1cImZhbmN5Ym94LXRvb2xiYXJcImAgZWxlbWVudClcblx0XHRidXR0b25zOiBbXG5cdFx0XHRcInpvb21cIixcblx0XHRcdC8vXCJzaGFyZVwiLFxuXHRcdFx0XCJzbGlkZVNob3dcIixcblx0XHRcdC8vXCJmdWxsU2NyZWVuXCIsXG5cdFx0XHQvL1wiZG93bmxvYWRcIixcblx0XHRcdFwidGh1bWJzXCIsXG5cdFx0XHRcImNsb3NlXCJcblx0XHRdLFxuXG5cdFx0Ly8gRGV0ZWN0IFwiaWRsZVwiIHRpbWUgaW4gc2Vjb25kc1xuXHRcdGlkbGVUaW1lOiAzLFxuXG5cdFx0Ly8gRGlzYWJsZSByaWdodC1jbGljayBhbmQgdXNlIHNpbXBsZSBpbWFnZSBwcm90ZWN0aW9uIGZvciBpbWFnZXNcblx0XHRwcm90ZWN0OiBmYWxzZSxcblxuXHRcdC8vIFNob3J0Y3V0IHRvIG1ha2UgY29udGVudCBcIm1vZGFsXCIgLSBkaXNhYmxlIGtleWJvYXJkIG5hdmlndGlvbiwgaGlkZSBidXR0b25zLCBldGNcblx0XHRtb2RhbDogZmFsc2UsXG5cblx0XHRpbWFnZToge1xuXHRcdFx0Ly8gV2FpdCBmb3IgaW1hZ2VzIHRvIGxvYWQgYmVmb3JlIGRpc3BsYXlpbmdcblx0XHRcdC8vICAgdHJ1ZSAgLSB3YWl0IGZvciBpbWFnZSB0byBsb2FkIGFuZCB0aGVuIGRpc3BsYXk7XG5cdFx0XHQvLyAgIGZhbHNlIC0gZGlzcGxheSB0aHVtYm5haWwgYW5kIGxvYWQgdGhlIGZ1bGwtc2l6ZWQgaW1hZ2Ugb3ZlciB0b3AsXG5cdFx0XHQvLyAgICAgICAgICAgcmVxdWlyZXMgcHJlZGVmaW5lZCBpbWFnZSBkaW1lbnNpb25zIChgZGF0YS13aWR0aGAgYW5kIGBkYXRhLWhlaWdodGAgYXR0cmlidXRlcylcblx0XHRcdHByZWxvYWQ6IGZhbHNlXG5cdFx0fSxcblxuXHRcdGFqYXg6IHtcblx0XHRcdC8vIE9iamVjdCBjb250YWluaW5nIHNldHRpbmdzIGZvciBhamF4IHJlcXVlc3Rcblx0XHRcdHNldHRpbmdzOiB7XG5cdFx0XHRcdC8vIFRoaXMgaGVscHMgdG8gaW5kaWNhdGUgdGhhdCByZXF1ZXN0IGNvbWVzIGZyb20gdGhlIG1vZGFsXG5cdFx0XHRcdC8vIEZlZWwgZnJlZSB0byBjaGFuZ2UgbmFtaW5nXG5cdFx0XHRcdGRhdGE6IHtcblx0XHRcdFx0XHRmYW5jeWJveDogdHJ1ZVxuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fSxcblxuXHRcdGlmcmFtZToge1xuXHRcdFx0Ly8gSWZyYW1lIHRlbXBsYXRlXG5cdFx0XHR0cGw6XG5cdFx0XHRcdCc8aWZyYW1lIGlkPVwiZmFuY3lib3gtZnJhbWV7cm5kfVwiIG5hbWU9XCJmYW5jeWJveC1mcmFtZXtybmR9XCIgY2xhc3M9XCJmYW5jeWJveC1pZnJhbWVcIiBhbGxvd2Z1bGxzY3JlZW4gYWxsb3c9XCJhdXRvcGxheTsgZnVsbHNjcmVlblwiIHNyYz1cIlwiPjwvaWZyYW1lPicsXG5cblx0XHRcdC8vIFByZWxvYWQgaWZyYW1lIGJlZm9yZSBkaXNwbGF5aW5nIGl0XG5cdFx0XHQvLyBUaGlzIGFsbG93cyB0byBjYWxjdWxhdGUgaWZyYW1lIGNvbnRlbnQgd2lkdGggYW5kIGhlaWdodFxuXHRcdFx0Ly8gKG5vdGU6IER1ZSB0byBcIlNhbWUgT3JpZ2luIFBvbGljeVwiLCB5b3UgY2FuJ3QgZ2V0IGNyb3NzIGRvbWFpbiBkYXRhKS5cblx0XHRcdHByZWxvYWQ6IHRydWUsXG5cblx0XHRcdC8vIEN1c3RvbSBDU1Mgc3R5bGluZyBmb3IgaWZyYW1lIHdyYXBwaW5nIGVsZW1lbnRcblx0XHRcdC8vIFlvdSBjYW4gdXNlIHRoaXMgdG8gc2V0IGN1c3RvbSBpZnJhbWUgZGltZW5zaW9uc1xuXHRcdFx0Y3NzOiB7fSxcblxuXHRcdFx0Ly8gSWZyYW1lIHRhZyBhdHRyaWJ1dGVzXG5cdFx0XHRhdHRyOiB7XG5cdFx0XHRcdHNjcm9sbGluZzogXCJhdXRvXCJcblx0XHRcdH1cblx0XHR9LFxuXG5cdFx0Ly8gRm9yIEhUTUw1IHZpZGVvIG9ubHlcblx0XHR2aWRlbzoge1xuXHRcdFx0dHBsOlxuXHRcdFx0XHQnPHZpZGVvIGNsYXNzPVwiZmFuY3lib3gtdmlkZW9cIiBjb250cm9scyBjb250cm9sc0xpc3Q9XCJub2Rvd25sb2FkXCIgcG9zdGVyPVwie3twb3N0ZXJ9fVwiPicgK1xuXHRcdFx0XHQnPHNvdXJjZSBzcmM9XCJ7e3NyY319XCIgdHlwZT1cInt7Zm9ybWF0fX1cIiAvPicgK1xuXHRcdFx0XHQnU29ycnksIHlvdXIgYnJvd3NlciBkb2VzblxcJ3Qgc3VwcG9ydCBlbWJlZGRlZCB2aWRlb3MsIDxhIGhyZWY9XCJ7e3NyY319XCI+ZG93bmxvYWQ8L2E+IGFuZCB3YXRjaCB3aXRoIHlvdXIgZmF2b3JpdGUgdmlkZW8gcGxheWVyIScgK1xuXHRcdFx0XHRcIjwvdmlkZW8+XCIsXG5cdFx0XHRmb3JtYXQ6IFwiXCIsIC8vIGN1c3RvbSB2aWRlbyBmb3JtYXRcblx0XHRcdGF1dG9TdGFydDogdHJ1ZVxuXHRcdH0sXG5cblx0XHQvLyBEZWZhdWx0IGNvbnRlbnQgdHlwZSBpZiBjYW5ub3QgYmUgZGV0ZWN0ZWQgYXV0b21hdGljYWxseVxuXHRcdGRlZmF1bHRUeXBlOiBcImltYWdlXCIsXG5cblx0XHQvLyBPcGVuL2Nsb3NlIGFuaW1hdGlvbiB0eXBlXG5cdFx0Ly8gUG9zc2libGUgdmFsdWVzOlxuXHRcdC8vICAgZmFsc2UgICAgICAgICAgICAtIGRpc2FibGVcblx0XHQvLyAgIFwiem9vbVwiICAgICAgICAgICAtIHpvb20gaW1hZ2VzIGZyb20vdG8gdGh1bWJuYWlsXG5cdFx0Ly8gICBcImZhZGVcIlxuXHRcdC8vICAgXCJ6b29tLWluLW91dFwiXG5cdFx0Ly9cblx0XHRhbmltYXRpb25FZmZlY3Q6IFwiem9vbVwiLFxuXG5cdFx0Ly8gRHVyYXRpb24gaW4gbXMgZm9yIG9wZW4vY2xvc2UgYW5pbWF0aW9uXG5cdFx0YW5pbWF0aW9uRHVyYXRpb246IDM2NixcblxuXHRcdC8vIFNob3VsZCBpbWFnZSBjaGFuZ2Ugb3BhY2l0eSB3aGlsZSB6b29taW5nXG5cdFx0Ly8gSWYgb3BhY2l0eSBpcyBcImF1dG9cIiwgdGhlbiBvcGFjaXR5IHdpbGwgYmUgY2hhbmdlZCBpZiBpbWFnZSBhbmQgdGh1bWJuYWlsIGhhdmUgZGlmZmVyZW50IGFzcGVjdCByYXRpb3Ncblx0XHR6b29tT3BhY2l0eTogXCJhdXRvXCIsXG5cblx0XHQvLyBUcmFuc2l0aW9uIGVmZmVjdCBiZXR3ZWVuIHNsaWRlc1xuXHRcdC8vXG5cdFx0Ly8gUG9zc2libGUgdmFsdWVzOlxuXHRcdC8vICAgZmFsc2UgICAgICAgICAgICAtIGRpc2FibGVcblx0XHQvLyAgIFwiZmFkZSdcblx0XHQvLyAgIFwic2xpZGUnXG5cdFx0Ly8gICBcImNpcmN1bGFyJ1xuXHRcdC8vICAgXCJ0dWJlJ1xuXHRcdC8vICAgXCJ6b29tLWluLW91dCdcblx0XHQvLyAgIFwicm90YXRlJ1xuXHRcdC8vXG5cdFx0dHJhbnNpdGlvbkVmZmVjdDogXCJmYWRlXCIsXG5cblx0XHQvLyBEdXJhdGlvbiBpbiBtcyBmb3IgdHJhbnNpdGlvbiBhbmltYXRpb25cblx0XHR0cmFuc2l0aW9uRHVyYXRpb246IDM2NixcblxuXHRcdC8vIEN1c3RvbSBDU1MgY2xhc3MgZm9yIHNsaWRlIGVsZW1lbnRcblx0XHRzbGlkZUNsYXNzOiBcIlwiLFxuXG5cdFx0Ly8gQ3VzdG9tIENTUyBjbGFzcyBmb3IgbGF5b3V0XG5cdFx0YmFzZUNsYXNzOiBcIlwiLFxuXG5cdFx0Ly8gQmFzZSB0ZW1wbGF0ZSBmb3IgbGF5b3V0XG5cdFx0YmFzZVRwbDpcblx0XHRcdCc8ZGl2IGNsYXNzPVwiZmFuY3lib3gtY29udGFpbmVyXCIgcm9sZT1cImRpYWxvZ1wiIHRhYmluZGV4PVwiLTFcIj4nICtcblx0XHRcdCc8ZGl2IGNsYXNzPVwiZmFuY3lib3gtYmdcIj48L2Rpdj4nICtcblx0XHRcdCc8ZGl2IGNsYXNzPVwiZmFuY3lib3gtaW5uZXJcIj4nICtcblx0XHRcdCc8ZGl2IGNsYXNzPVwiZmFuY3lib3gtaW5mb2JhclwiPjxzcGFuIGRhdGEtZmFuY3lib3gtaW5kZXg+PC9zcGFuPiZuYnNwOy8mbmJzcDs8c3BhbiBkYXRhLWZhbmN5Ym94LWNvdW50Pjwvc3Bhbj48L2Rpdj4nICtcblx0XHRcdCc8ZGl2IGNsYXNzPVwiZmFuY3lib3gtdG9vbGJhclwiPnt7YnV0dG9uc319PC9kaXY+JyArXG5cdFx0XHQnPGRpdiBjbGFzcz1cImZhbmN5Ym94LW5hdmlnYXRpb25cIj57e2Fycm93c319PC9kaXY+JyArXG5cdFx0XHQnPGRpdiBjbGFzcz1cImZhbmN5Ym94LXN0YWdlXCI+PC9kaXY+JyArXG5cdFx0XHQnPGRpdiBjbGFzcz1cImZhbmN5Ym94LWNhcHRpb25cIj48L2Rpdj4nICtcblx0XHRcdFwiPC9kaXY+XCIgK1xuXHRcdFx0XCI8L2Rpdj5cIixcblxuXHRcdC8vIExvYWRpbmcgaW5kaWNhdG9yIHRlbXBsYXRlXG5cdFx0c3Bpbm5lclRwbDogJzxkaXYgY2xhc3M9XCJmYW5jeWJveC1sb2FkaW5nXCI+PC9kaXY+JyxcblxuXHRcdC8vIEVycm9yIG1lc3NhZ2UgdGVtcGxhdGVcblx0XHRlcnJvclRwbDogJzxkaXYgY2xhc3M9XCJmYW5jeWJveC1lcnJvclwiPjxwPnt7RVJST1J9fTwvcD48L2Rpdj4nLFxuXG5cdFx0YnRuVHBsOiB7XG5cdFx0XHRkb3dubG9hZDpcblx0XHRcdFx0JzxhIGRvd25sb2FkIGRhdGEtZmFuY3lib3gtZG93bmxvYWQgY2xhc3M9XCJmYW5jeWJveC1idXR0b24gZmFuY3lib3gtYnV0dG9uLS1kb3dubG9hZFwiIHRpdGxlPVwie3tET1dOTE9BRH19XCIgaHJlZj1cImphdmFzY3JpcHQ6O1wiPicgK1xuXHRcdFx0XHQnPHN2ZyB4bWxucz1cImh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnXCIgdmlld0JveD1cIjAgMCAyNCAyNFwiPjxwYXRoIGQ9XCJNMTguNjIgMTcuMDlWMTlINS4zOHYtMS45MXptLTIuOTctNi45NkwxNyAxMS40NWwtNSA0Ljg3LTUtNC44NyAxLjM2LTEuMzIgMi42OCAyLjY0VjVoMS45MnY3Ljc3elwiLz48L3N2Zz4nICtcblx0XHRcdFx0XCI8L2E+XCIsXG5cblx0XHRcdHpvb206XG5cdFx0XHRcdCc8YnV0dG9uIGRhdGEtZmFuY3lib3gtem9vbSBjbGFzcz1cImZhbmN5Ym94LWJ1dHRvbiBmYW5jeWJveC1idXR0b24tLXpvb21cIiB0aXRsZT1cInt7Wk9PTX19XCI+JyArXG5cdFx0XHRcdCc8c3ZnIHhtbG5zPVwiaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmdcIiB2aWV3Qm94PVwiMCAwIDI0IDI0XCI+PHBhdGggZD1cIk0xOC43IDE3LjNsLTMtM2E1LjkgNS45IDAgMCAwLS42LTcuNiA1LjkgNS45IDAgMCAwLTguNCAwIDUuOSA1LjkgMCAwIDAgMCA4LjQgNS45IDUuOSAwIDAgMCA3LjcuN2wzIDNhMSAxIDAgMCAwIDEuMyAwYy40LS41LjQtMSAwLTEuNXpNOC4xIDEzLjhhNCA0IDAgMCAxIDAtNS43IDQgNCAwIDAgMSA1LjcgMCA0IDQgMCAwIDEgMCA1LjcgNCA0IDAgMCAxLTUuNyAwelwiLz48L3N2Zz4nICtcblx0XHRcdFx0XCI8L2J1dHRvbj5cIixcblxuXHRcdFx0Y2xvc2U6XG5cdFx0XHRcdCc8YnV0dG9uIGRhdGEtZmFuY3lib3gtY2xvc2UgY2xhc3M9XCJmYW5jeWJveC1idXR0b24gZmFuY3lib3gtYnV0dG9uLS1jbG9zZVwiIHRpdGxlPVwie3tDTE9TRX19XCI+JyArXG5cdFx0XHRcdCc8c3ZnIHhtbG5zPVwiaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmdcIiB2aWV3Qm94PVwiMCAwIDI0IDI0XCI+PHBhdGggZD1cIk0xMiAxMC42TDYuNiA1LjIgNS4yIDYuNmw1LjQgNS40LTUuNCA1LjQgMS40IDEuNCA1LjQtNS40IDUuNCA1LjQgMS40LTEuNC01LjQtNS40IDUuNC01LjQtMS40LTEuNC01LjQgNS40elwiLz48L3N2Zz4nICtcblx0XHRcdFx0XCI8L2J1dHRvbj5cIixcblxuXHRcdFx0Ly8gQXJyb3dzXG5cdFx0XHRhcnJvd0xlZnQ6XG5cdFx0XHRcdCc8YnV0dG9uIGRhdGEtZmFuY3lib3gtcHJldiBjbGFzcz1cImZhbmN5Ym94LWJ1dHRvbiBmYW5jeWJveC1idXR0b24tLWFycm93X2xlZnRcIiB0aXRsZT1cInt7UFJFVn19XCI+JyArXG5cdFx0XHRcdCc8ZGl2PjxzdmcgeG1sbnM9XCJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2Z1wiIHZpZXdCb3g9XCIwIDAgMjQgMjRcIj48cGF0aCBkPVwiTTExLjI4IDE1LjdsLTEuMzQgMS4zN0w1IDEybDQuOTQtNS4wNyAxLjM0IDEuMzgtMi42OCAyLjcySDE5djEuOTRIOC42elwiLz48L3N2Zz48L2Rpdj4nICtcblx0XHRcdFx0XCI8L2J1dHRvbj5cIixcblxuXHRcdFx0YXJyb3dSaWdodDpcblx0XHRcdFx0JzxidXR0b24gZGF0YS1mYW5jeWJveC1uZXh0IGNsYXNzPVwiZmFuY3lib3gtYnV0dG9uIGZhbmN5Ym94LWJ1dHRvbi0tYXJyb3dfcmlnaHRcIiB0aXRsZT1cInt7TkVYVH19XCI+JyArXG5cdFx0XHRcdCc8ZGl2PjxzdmcgeG1sbnM9XCJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2Z1wiIHZpZXdCb3g9XCIwIDAgMjQgMjRcIj48cGF0aCBkPVwiTTE1LjQgMTIuOTdsLTIuNjggMi43MiAxLjM0IDEuMzhMMTkgMTJsLTQuOTQtNS4wNy0xLjM0IDEuMzggMi42OCAyLjcySDV2MS45NHpcIi8+PC9zdmc+PC9kaXY+JyArXG5cdFx0XHRcdFwiPC9idXR0b24+XCIsXG5cblx0XHRcdC8vIFRoaXMgc21hbGwgY2xvc2UgYnV0dG9uIHdpbGwgYmUgYXBwZW5kZWQgdG8geW91ciBodG1sL2lubGluZS9hamF4IGNvbnRlbnQgYnkgZGVmYXVsdCxcblx0XHRcdC8vIGlmIFwic21hbGxCdG5cIiBvcHRpb24gaXMgbm90IHNldCB0byBmYWxzZVxuXHRcdFx0c21hbGxCdG46XG5cdFx0XHRcdCc8YnV0dG9uIHR5cGU9XCJidXR0b25cIiBkYXRhLWZhbmN5Ym94LWNsb3NlIGNsYXNzPVwiZmFuY3lib3gtYnV0dG9uIGZhbmN5Ym94LWNsb3NlLXNtYWxsXCIgdGl0bGU9XCJ7e0NMT1NFfX1cIj4nICtcblx0XHRcdFx0JzxzdmcgeG1sbnM9XCJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2Z1wiIHZlcnNpb249XCIxXCIgdmlld0JveD1cIjAgMCAyNCAyNFwiPjxwYXRoIGQ9XCJNMTMgMTJsNS01LTEtMS01IDUtNS01LTEgMSA1IDUtNSA1IDEgMSA1LTUgNSA1IDEtMXpcIi8+PC9zdmc+JyArXG5cdFx0XHRcdFwiPC9idXR0b24+XCJcblx0XHR9LFxuXG5cdFx0Ly8gQ29udGFpbmVyIGlzIGluamVjdGVkIGludG8gdGhpcyBlbGVtZW50XG5cdFx0cGFyZW50RWw6IFwiYm9keVwiLFxuXG5cdFx0Ly8gSGlkZSBicm93c2VyIHZlcnRpY2FsIHNjcm9sbGJhcnM7IHVzZSBhdCB5b3VyIG93biByaXNrXG5cdFx0aGlkZVNjcm9sbGJhcjogdHJ1ZSxcblxuXHRcdC8vIEZvY3VzIGhhbmRsaW5nXG5cdFx0Ly8gPT09PT09PT09PT09PT1cblxuXHRcdC8vIFRyeSB0byBmb2N1cyBvbiB0aGUgZmlyc3QgZm9jdXNhYmxlIGVsZW1lbnQgYWZ0ZXIgb3BlbmluZ1xuXHRcdGF1dG9Gb2N1czogdHJ1ZSxcblxuXHRcdC8vIFB1dCBmb2N1cyBiYWNrIHRvIGFjdGl2ZSBlbGVtZW50IGFmdGVyIGNsb3Npbmdcblx0XHRiYWNrRm9jdXM6IHRydWUsXG5cblx0XHQvLyBEbyBub3QgbGV0IHVzZXIgdG8gZm9jdXMgb24gZWxlbWVudCBvdXRzaWRlIG1vZGFsIGNvbnRlbnRcblx0XHR0cmFwRm9jdXM6IHRydWUsXG5cblx0XHQvLyBNb2R1bGUgc3BlY2lmaWMgb3B0aW9uc1xuXHRcdC8vID09PT09PT09PT09PT09PT09PT09PT09XG5cblx0XHRmdWxsU2NyZWVuOiB7XG5cdFx0XHRhdXRvU3RhcnQ6IGZhbHNlXG5cdFx0fSxcblxuXHRcdC8vIFNldCBgdG91Y2g6IGZhbHNlYCB0byBkaXNhYmxlIHBhbm5pbmcvc3dpcGluZ1xuXHRcdHRvdWNoOiB7XG5cdFx0XHR2ZXJ0aWNhbDogdHJ1ZSwgLy8gQWxsb3cgdG8gZHJhZyBjb250ZW50IHZlcnRpY2FsbHlcblx0XHRcdG1vbWVudHVtOiB0cnVlIC8vIENvbnRpbnVlIG1vdmVtZW50IGFmdGVyIHJlbGVhc2luZyBtb3VzZS90b3VjaCB3aGVuIHBhbm5pbmdcblx0XHR9LFxuXG5cdFx0Ly8gSGFzaCB2YWx1ZSB3aGVuIGluaXRpYWxpemluZyBtYW51YWxseSxcblx0XHQvLyBzZXQgYGZhbHNlYCB0byBkaXNhYmxlIGhhc2ggY2hhbmdlXG5cdFx0aGFzaDogbnVsbCxcblxuXHRcdC8vIEN1c3RvbWl6ZSBvciBhZGQgbmV3IG1lZGlhIHR5cGVzXG5cdFx0Ly8gRXhhbXBsZTpcblx0XHQvKlxuICAgICAgbWVkaWEgOiB7XG4gICAgICAgIHlvdXR1YmUgOiB7XG4gICAgICAgICAgcGFyYW1zIDoge1xuICAgICAgICAgICAgYXV0b3BsYXkgOiAwXG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgKi9cblx0XHRtZWRpYToge30sXG5cblx0XHRzbGlkZVNob3c6IHtcblx0XHRcdGF1dG9TdGFydDogZmFsc2UsXG5cdFx0XHRzcGVlZDogMzAwMFxuXHRcdH0sXG5cblx0XHR0aHVtYnM6IHtcblx0XHRcdGF1dG9TdGFydDogZmFsc2UsIC8vIERpc3BsYXkgdGh1bWJuYWlscyBvbiBvcGVuaW5nXG5cdFx0XHRoaWRlT25DbG9zZTogdHJ1ZSwgLy8gSGlkZSB0aHVtYm5haWwgZ3JpZCB3aGVuIGNsb3NpbmcgYW5pbWF0aW9uIHN0YXJ0c1xuXHRcdFx0cGFyZW50RWw6IFwiLmZhbmN5Ym94LWNvbnRhaW5lclwiLCAvLyBDb250YWluZXIgaXMgaW5qZWN0ZWQgaW50byB0aGlzIGVsZW1lbnRcblx0XHRcdGF4aXM6IFwieVwiIC8vIFZlcnRpY2FsICh5KSBvciBob3Jpem9udGFsICh4KSBzY3JvbGxpbmdcblx0XHR9LFxuXG5cdFx0Ly8gVXNlIG1vdXNld2hlZWwgdG8gbmF2aWdhdGUgZ2FsbGVyeVxuXHRcdC8vIElmICdhdXRvJyAtIGVuYWJsZWQgZm9yIGltYWdlcyBvbmx5XG5cdFx0d2hlZWw6IFwiYXV0b1wiLFxuXG5cdFx0Ly8gQ2FsbGJhY2tzXG5cdFx0Ly89PT09PT09PT09XG5cblx0XHQvLyBTZWUgRG9jdW1lbnRhdGlvbi9BUEkvRXZlbnRzIGZvciBtb3JlIGluZm9ybWF0aW9uXG5cdFx0Ly8gRXhhbXBsZTpcblx0XHQvKlxuICAgICAgYWZ0ZXJTaG93OiBmdW5jdGlvbiggaW5zdGFuY2UsIGN1cnJlbnQgKSB7XG4gICAgICAgIGNvbnNvbGUuaW5mbyggJ0NsaWNrZWQgZWxlbWVudDonICk7XG4gICAgICAgIGNvbnNvbGUuaW5mbyggY3VycmVudC5vcHRzLiRvcmlnICk7XG4gICAgICB9XG4gICAgKi9cblxuXHRcdG9uSW5pdDogJC5ub29wLCAvLyBXaGVuIGluc3RhbmNlIGhhcyBiZWVuIGluaXRpYWxpemVkXG5cblx0XHRiZWZvcmVMb2FkOiAkLm5vb3AsIC8vIEJlZm9yZSB0aGUgY29udGVudCBvZiBhIHNsaWRlIGlzIGJlaW5nIGxvYWRlZFxuXHRcdGFmdGVyTG9hZDogJC5ub29wLCAvLyBXaGVuIHRoZSBjb250ZW50IG9mIGEgc2xpZGUgaXMgZG9uZSBsb2FkaW5nXG5cblx0XHRiZWZvcmVTaG93OiAkLm5vb3AsIC8vIEJlZm9yZSBvcGVuIGFuaW1hdGlvbiBzdGFydHNcblx0XHRhZnRlclNob3c6ICQubm9vcCwgLy8gV2hlbiBjb250ZW50IGlzIGRvbmUgbG9hZGluZyBhbmQgYW5pbWF0aW5nXG5cblx0XHRiZWZvcmVDbG9zZTogJC5ub29wLCAvLyBCZWZvcmUgdGhlIGluc3RhbmNlIGF0dGVtcHRzIHRvIGNsb3NlLiBSZXR1cm4gZmFsc2UgdG8gY2FuY2VsIHRoZSBjbG9zZS5cblx0XHRhZnRlckNsb3NlOiAkLm5vb3AsIC8vIEFmdGVyIGluc3RhbmNlIGhhcyBiZWVuIGNsb3NlZFxuXG5cdFx0b25BY3RpdmF0ZTogJC5ub29wLCAvLyBXaGVuIGluc3RhbmNlIGlzIGJyb3VnaHQgdG8gZnJvbnRcblx0XHRvbkRlYWN0aXZhdGU6ICQubm9vcCwgLy8gV2hlbiBvdGhlciBpbnN0YW5jZSBoYXMgYmVlbiBhY3RpdmF0ZWRcblxuXHRcdC8vIEludGVyYWN0aW9uXG5cdFx0Ly8gPT09PT09PT09PT1cblxuXHRcdC8vIFVzZSBvcHRpb25zIGJlbG93IHRvIGN1c3RvbWl6ZSB0YWtlbiBhY3Rpb24gd2hlbiB1c2VyIGNsaWNrcyBvciBkb3VibGUgY2xpY2tzIG9uIHRoZSBmYW5jeUJveCBhcmVhLFxuXHRcdC8vIGVhY2ggb3B0aW9uIGNhbiBiZSBzdHJpbmcgb3IgbWV0aG9kIHRoYXQgcmV0dXJucyB2YWx1ZS5cblx0XHQvL1xuXHRcdC8vIFBvc3NpYmxlIHZhbHVlczpcblx0XHQvLyAgIFwiY2xvc2VcIiAgICAgICAgICAgLSBjbG9zZSBpbnN0YW5jZVxuXHRcdC8vICAgXCJuZXh0XCIgICAgICAgICAgICAtIG1vdmUgdG8gbmV4dCBnYWxsZXJ5IGl0ZW1cblx0XHQvLyAgIFwibmV4dE9yQ2xvc2VcIiAgICAgLSBtb3ZlIHRvIG5leHQgZ2FsbGVyeSBpdGVtIG9yIGNsb3NlIGlmIGdhbGxlcnkgaGFzIG9ubHkgb25lIGl0ZW1cblx0XHQvLyAgIFwidG9nZ2xlQ29udHJvbHNcIiAgLSBzaG93L2hpZGUgY29udHJvbHNcblx0XHQvLyAgIFwiem9vbVwiICAgICAgICAgICAgLSB6b29tIGltYWdlIChpZiBsb2FkZWQpXG5cdFx0Ly8gICBmYWxzZSAgICAgICAgICAgICAtIGRvIG5vdGhpbmdcblxuXHRcdC8vIENsaWNrZWQgb24gdGhlIGNvbnRlbnRcblx0XHRjbGlja0NvbnRlbnQ6IGZ1bmN0aW9uKGN1cnJlbnQsIGV2ZW50KSB7XG5cdFx0XHRyZXR1cm4gY3VycmVudC50eXBlID09PSBcImltYWdlXCIgPyBcInpvb21cIiA6IGZhbHNlO1xuXHRcdH0sXG5cblx0XHQvLyBDbGlja2VkIG9uIHRoZSBzbGlkZVxuXHRcdGNsaWNrU2xpZGU6IFwiY2xvc2VcIixcblxuXHRcdC8vIENsaWNrZWQgb24gdGhlIGJhY2tncm91bmQgKGJhY2tkcm9wKSBlbGVtZW50O1xuXHRcdC8vIGlmIHlvdSBoYXZlIG5vdCBjaGFuZ2VkIHRoZSBsYXlvdXQsIHRoZW4gbW9zdCBsaWtlbHkgeW91IG5lZWQgdG8gdXNlIGBjbGlja1NsaWRlYCBvcHRpb25cblx0XHRjbGlja091dHNpZGU6IFwiY2xvc2VcIixcblxuXHRcdC8vIFNhbWUgYXMgcHJldmlvdXMgdHdvLCBidXQgZm9yIGRvdWJsZSBjbGlja1xuXHRcdGRibGNsaWNrQ29udGVudDogZmFsc2UsXG5cdFx0ZGJsY2xpY2tTbGlkZTogZmFsc2UsXG5cdFx0ZGJsY2xpY2tPdXRzaWRlOiBmYWxzZSxcblxuXHRcdC8vIEN1c3RvbSBvcHRpb25zIHdoZW4gbW9iaWxlIGRldmljZSBpcyBkZXRlY3RlZFxuXHRcdC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG5cdFx0bW9iaWxlOiB7XG5cdFx0XHRwcmV2ZW50Q2FwdGlvbk92ZXJsYXA6IGZhbHNlLFxuXHRcdFx0aWRsZVRpbWU6IGZhbHNlLFxuXHRcdFx0Y2xpY2tDb250ZW50OiBmdW5jdGlvbihjdXJyZW50LCBldmVudCkge1xuXHRcdFx0XHRyZXR1cm4gY3VycmVudC50eXBlID09PSBcImltYWdlXCIgPyBcInRvZ2dsZUNvbnRyb2xzXCIgOiBmYWxzZTtcblx0XHRcdH0sXG5cdFx0XHRjbGlja1NsaWRlOiBmdW5jdGlvbihjdXJyZW50LCBldmVudCkge1xuXHRcdFx0XHRyZXR1cm4gY3VycmVudC50eXBlID09PSBcImltYWdlXCIgPyBcInRvZ2dsZUNvbnRyb2xzXCIgOiBcImNsb3NlXCI7XG5cdFx0XHR9LFxuXHRcdFx0ZGJsY2xpY2tDb250ZW50OiBmdW5jdGlvbihjdXJyZW50LCBldmVudCkge1xuXHRcdFx0XHRyZXR1cm4gY3VycmVudC50eXBlID09PSBcImltYWdlXCIgPyBcInpvb21cIiA6IGZhbHNlO1xuXHRcdFx0fSxcblx0XHRcdGRibGNsaWNrU2xpZGU6IGZ1bmN0aW9uKGN1cnJlbnQsIGV2ZW50KSB7XG5cdFx0XHRcdHJldHVybiBjdXJyZW50LnR5cGUgPT09IFwiaW1hZ2VcIiA/IFwiem9vbVwiIDogZmFsc2U7XG5cdFx0XHR9XG5cdFx0fSxcblxuXHRcdC8vIEludGVybmF0aW9uYWxpemF0aW9uXG5cdFx0Ly8gPT09PT09PT09PT09PT09PT09PT1cblxuXHRcdGxhbmc6IFwiZW5cIixcblx0XHRpMThuOiB7XG5cdFx0XHRlbjoge1xuXHRcdFx0XHRDTE9TRTogXCJDbG9zZVwiLFxuXHRcdFx0XHRORVhUOiBcIk5leHRcIixcblx0XHRcdFx0UFJFVjogXCJQcmV2aW91c1wiLFxuXHRcdFx0XHRFUlJPUjogXCJUaGUgcmVxdWVzdGVkIGNvbnRlbnQgY2Fubm90IGJlIGxvYWRlZC4gPGJyLz4gUGxlYXNlIHRyeSBhZ2FpbiBsYXRlci5cIixcblx0XHRcdFx0UExBWV9TVEFSVDogXCJTdGFydCBzbGlkZXNob3dcIixcblx0XHRcdFx0UExBWV9TVE9QOiBcIlBhdXNlIHNsaWRlc2hvd1wiLFxuXHRcdFx0XHRGVUxMX1NDUkVFTjogXCJGdWxsIHNjcmVlblwiLFxuXHRcdFx0XHRUSFVNQlM6IFwiVGh1bWJuYWlsc1wiLFxuXHRcdFx0XHRET1dOTE9BRDogXCJEb3dubG9hZFwiLFxuXHRcdFx0XHRTSEFSRTogXCJTaGFyZVwiLFxuXHRcdFx0XHRaT09NOiBcIlpvb21cIlxuXHRcdFx0fSxcblx0XHRcdGRlOiB7XG5cdFx0XHRcdENMT1NFOiBcIlNjaGxpZXNzZW5cIixcblx0XHRcdFx0TkVYVDogXCJXZWl0ZXJcIixcblx0XHRcdFx0UFJFVjogXCJadXLDvGNrXCIsXG5cdFx0XHRcdEVSUk9SOiBcIkRpZSBhbmdlZm9yZGVydGVuIERhdGVuIGtvbm50ZW4gbmljaHQgZ2VsYWRlbiB3ZXJkZW4uIDxici8+IEJpdHRlIHZlcnN1Y2hlbiBTaWUgZXMgc3DDpHRlciBub2NobWFsLlwiLFxuXHRcdFx0XHRQTEFZX1NUQVJUOiBcIkRpYXNjaGF1IHN0YXJ0ZW5cIixcblx0XHRcdFx0UExBWV9TVE9QOiBcIkRpYXNjaGF1IGJlZW5kZW5cIixcblx0XHRcdFx0RlVMTF9TQ1JFRU46IFwiVm9sbGJpbGRcIixcblx0XHRcdFx0VEhVTUJTOiBcIlZvcnNjaGF1YmlsZGVyXCIsXG5cdFx0XHRcdERPV05MT0FEOiBcIkhlcnVudGVybGFkZW5cIixcblx0XHRcdFx0U0hBUkU6IFwiVGVpbGVuXCIsXG5cdFx0XHRcdFpPT006IFwiTWHDn3N0YWJcIlxuXHRcdFx0fVxuXHRcdH1cblx0fTtcblxuXHQvLyBGZXcgdXNlZnVsIHZhcmlhYmxlcyBhbmQgbWV0aG9kc1xuXHQvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG5cdHZhciAkVyA9ICQod2luZG93KTtcblx0dmFyICREID0gJChkb2N1bWVudCk7XG5cblx0dmFyIGNhbGxlZCA9IDA7XG5cblx0Ly8gQ2hlY2sgaWYgYW4gb2JqZWN0IGlzIGEgalF1ZXJ5IG9iamVjdCBhbmQgbm90IGEgbmF0aXZlIEphdmFTY3JpcHQgb2JqZWN0XG5cdC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXHR2YXIgaXNRdWVyeSA9IGZ1bmN0aW9uKG9iaikge1xuXHRcdHJldHVybiBvYmogJiYgb2JqLmhhc093blByb3BlcnR5ICYmIG9iaiBpbnN0YW5jZW9mICQ7XG5cdH07XG5cblx0Ly8gSGFuZGxlIG11bHRpcGxlIGJyb3dzZXJzIGZvciBcInJlcXVlc3RBbmltYXRpb25GcmFtZVwiIGFuZCBcImNhbmNlbEFuaW1hdGlvbkZyYW1lXCJcblx0Ly8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXHR2YXIgcmVxdWVzdEFGcmFtZSA9IChmdW5jdGlvbigpIHtcblx0XHRyZXR1cm4gKFxuXHRcdFx0d2luZG93LnJlcXVlc3RBbmltYXRpb25GcmFtZSB8fFxuXHRcdFx0d2luZG93LndlYmtpdFJlcXVlc3RBbmltYXRpb25GcmFtZSB8fFxuXHRcdFx0d2luZG93Lm1velJlcXVlc3RBbmltYXRpb25GcmFtZSB8fFxuXHRcdFx0d2luZG93Lm9SZXF1ZXN0QW5pbWF0aW9uRnJhbWUgfHxcblx0XHRcdC8vIGlmIGFsbCBlbHNlIGZhaWxzLCB1c2Ugc2V0VGltZW91dFxuXHRcdFx0ZnVuY3Rpb24oY2FsbGJhY2spIHtcblx0XHRcdFx0cmV0dXJuIHdpbmRvdy5zZXRUaW1lb3V0KGNhbGxiYWNrLCAxMDAwIC8gNjApO1xuXHRcdFx0fVxuXHRcdCk7XG5cdH0pKCk7XG5cblx0dmFyIGNhbmNlbEFGcmFtZSA9IChmdW5jdGlvbigpIHtcblx0XHRyZXR1cm4gKFxuXHRcdFx0d2luZG93LmNhbmNlbEFuaW1hdGlvbkZyYW1lIHx8XG5cdFx0XHR3aW5kb3cud2Via2l0Q2FuY2VsQW5pbWF0aW9uRnJhbWUgfHxcblx0XHRcdHdpbmRvdy5tb3pDYW5jZWxBbmltYXRpb25GcmFtZSB8fFxuXHRcdFx0d2luZG93Lm9DYW5jZWxBbmltYXRpb25GcmFtZSB8fFxuXHRcdFx0ZnVuY3Rpb24oaWQpIHtcblx0XHRcdFx0d2luZG93LmNsZWFyVGltZW91dChpZCk7XG5cdFx0XHR9XG5cdFx0KTtcblx0fSkoKTtcblxuXHQvLyBEZXRlY3QgdGhlIHN1cHBvcnRlZCB0cmFuc2l0aW9uLWVuZCBldmVudCBwcm9wZXJ0eSBuYW1lXG5cdC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblx0dmFyIHRyYW5zaXRpb25FbmQgPSAoZnVuY3Rpb24oKSB7XG5cdFx0dmFyIGVsID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImZha2VlbGVtZW50XCIpLFxuXHRcdFx0dDtcblxuXHRcdHZhciB0cmFuc2l0aW9ucyA9IHtcblx0XHRcdHRyYW5zaXRpb246IFwidHJhbnNpdGlvbmVuZFwiLFxuXHRcdFx0T1RyYW5zaXRpb246IFwib1RyYW5zaXRpb25FbmRcIixcblx0XHRcdE1velRyYW5zaXRpb246IFwidHJhbnNpdGlvbmVuZFwiLFxuXHRcdFx0V2Via2l0VHJhbnNpdGlvbjogXCJ3ZWJraXRUcmFuc2l0aW9uRW5kXCJcblx0XHR9O1xuXG5cdFx0Zm9yICh0IGluIHRyYW5zaXRpb25zKSB7XG5cdFx0XHRpZiAoZWwuc3R5bGVbdF0gIT09IHVuZGVmaW5lZCkge1xuXHRcdFx0XHRyZXR1cm4gdHJhbnNpdGlvbnNbdF07XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0cmV0dXJuIFwidHJhbnNpdGlvbmVuZFwiO1xuXHR9KSgpO1xuXG5cdC8vIEZvcmNlIHJlZHJhdyBvbiBhbiBlbGVtZW50LlxuXHQvLyBUaGlzIGhlbHBzIGluIGNhc2VzIHdoZXJlIHRoZSBicm93c2VyIGRvZXNuJ3QgcmVkcmF3IGFuIHVwZGF0ZWQgZWxlbWVudCBwcm9wZXJseVxuXHQvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXHR2YXIgZm9yY2VSZWRyYXcgPSBmdW5jdGlvbigkZWwpIHtcblx0XHRyZXR1cm4gJGVsICYmICRlbC5sZW5ndGggJiYgJGVsWzBdLm9mZnNldEhlaWdodDtcblx0fTtcblxuXHQvLyBFeGNsdWRlIGFycmF5IChgYnV0dG9uc2ApIG9wdGlvbnMgZnJvbSBkZWVwIG1lcmdpbmdcblx0Ly8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cdHZhciBtZXJnZU9wdHMgPSBmdW5jdGlvbihvcHRzMSwgb3B0czIpIHtcblx0XHR2YXIgcmV6ID0gJC5leHRlbmQodHJ1ZSwge30sIG9wdHMxLCBvcHRzMik7XG5cblx0XHQkLmVhY2gob3B0czIsIGZ1bmN0aW9uKGtleSwgdmFsdWUpIHtcblx0XHRcdGlmICgkLmlzQXJyYXkodmFsdWUpKSB7XG5cdFx0XHRcdHJleltrZXldID0gdmFsdWU7XG5cdFx0XHR9XG5cdFx0fSk7XG5cblx0XHRyZXR1cm4gcmV6O1xuXHR9O1xuXG5cdC8vIEhvdyBtdWNoIG9mIGFuIGVsZW1lbnQgaXMgdmlzaWJsZSBpbiB2aWV3cG9ydFxuXHQvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuXHR2YXIgaW5WaWV3cG9ydCA9IGZ1bmN0aW9uKGVsZW0pIHtcblx0XHR2YXIgZWxlbUNlbnRlciwgcmV6O1xuXG5cdFx0aWYgKCFlbGVtIHx8IGVsZW0ub3duZXJEb2N1bWVudCAhPT0gZG9jdW1lbnQpIHtcblx0XHRcdHJldHVybiBmYWxzZTtcblx0XHR9XG5cblx0XHQkKFwiLmZhbmN5Ym94LWNvbnRhaW5lclwiKS5jc3MoXCJwb2ludGVyLWV2ZW50c1wiLCBcIm5vbmVcIik7XG5cblx0XHRlbGVtQ2VudGVyID0ge1xuXHRcdFx0eDogZWxlbS5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKS5sZWZ0ICsgZWxlbS5vZmZzZXRXaWR0aCAvIDIsXG5cdFx0XHR5OiBlbGVtLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpLnRvcCArIGVsZW0ub2Zmc2V0SGVpZ2h0IC8gMlxuXHRcdH07XG5cblx0XHRyZXogPSBkb2N1bWVudC5lbGVtZW50RnJvbVBvaW50KGVsZW1DZW50ZXIueCwgZWxlbUNlbnRlci55KSA9PT0gZWxlbTtcblxuXHRcdCQoXCIuZmFuY3lib3gtY29udGFpbmVyXCIpLmNzcyhcInBvaW50ZXItZXZlbnRzXCIsIFwiXCIpO1xuXG5cdFx0cmV0dXJuIHJlejtcblx0fTtcblxuXHQvLyBDbGFzcyBkZWZpbml0aW9uXG5cdC8vID09PT09PT09PT09PT09PT1cblxuXHR2YXIgRmFuY3lCb3ggPSBmdW5jdGlvbihjb250ZW50LCBvcHRzLCBpbmRleCkge1xuXHRcdHZhciBzZWxmID0gdGhpcztcblxuXHRcdHNlbGYub3B0cyA9IG1lcmdlT3B0cyh7aW5kZXg6IGluZGV4fSwgJC5mYW5jeWJveC5kZWZhdWx0cyk7XG5cblx0XHRpZiAoJC5pc1BsYWluT2JqZWN0KG9wdHMpKSB7XG5cdFx0XHRzZWxmLm9wdHMgPSBtZXJnZU9wdHMoc2VsZi5vcHRzLCBvcHRzKTtcblx0XHR9XG5cblx0XHRpZiAoJC5mYW5jeWJveC5pc01vYmlsZSkge1xuXHRcdFx0c2VsZi5vcHRzID0gbWVyZ2VPcHRzKHNlbGYub3B0cywgc2VsZi5vcHRzLm1vYmlsZSk7XG5cdFx0fVxuXG5cdFx0c2VsZi5pZCA9IHNlbGYub3B0cy5pZCB8fCArK2NhbGxlZDtcblxuXHRcdHNlbGYuY3VyckluZGV4ID0gcGFyc2VJbnQoc2VsZi5vcHRzLmluZGV4LCAxMCkgfHwgMDtcblx0XHRzZWxmLnByZXZJbmRleCA9IG51bGw7XG5cblx0XHRzZWxmLnByZXZQb3MgPSBudWxsO1xuXHRcdHNlbGYuY3VyclBvcyA9IDA7XG5cblx0XHRzZWxmLmZpcnN0UnVuID0gdHJ1ZTtcblxuXHRcdC8vIEFsbCBncm91cCBpdGVtc1xuXHRcdHNlbGYuZ3JvdXAgPSBbXTtcblxuXHRcdC8vIEV4aXN0aW5nIHNsaWRlcyAoZm9yIGN1cnJlbnQsIG5leHQgYW5kIHByZXZpb3VzIGdhbGxlcnkgaXRlbXMpXG5cdFx0c2VsZi5zbGlkZXMgPSB7fTtcblxuXHRcdC8vIENyZWF0ZSBncm91cCBlbGVtZW50c1xuXHRcdHNlbGYuYWRkQ29udGVudChjb250ZW50KTtcblxuXHRcdGlmICghc2VsZi5ncm91cC5sZW5ndGgpIHtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cblx0XHRzZWxmLmluaXQoKTtcblx0fTtcblxuXHQkLmV4dGVuZChGYW5jeUJveC5wcm90b3R5cGUsIHtcblx0XHQvLyBDcmVhdGUgRE9NIHN0cnVjdHVyZVxuXHRcdC8vID09PT09PT09PT09PT09PT09PT09XG5cblx0XHRpbml0OiBmdW5jdGlvbigpIHtcblx0XHRcdHZhciBzZWxmID0gdGhpcyxcblx0XHRcdFx0Zmlyc3RJdGVtID0gc2VsZi5ncm91cFtzZWxmLmN1cnJJbmRleF0sXG5cdFx0XHRcdGZpcnN0SXRlbU9wdHMgPSBmaXJzdEl0ZW0ub3B0cyxcblx0XHRcdFx0JGNvbnRhaW5lcixcblx0XHRcdFx0YnV0dG9uU3RyO1xuXG5cdFx0XHRpZiAoZmlyc3RJdGVtT3B0cy5jbG9zZUV4aXN0aW5nKSB7XG5cdFx0XHRcdCQuZmFuY3lib3guY2xvc2UodHJ1ZSk7XG5cdFx0XHR9XG5cblx0XHRcdC8vIEhpZGUgc2Nyb2xsYmFyc1xuXHRcdFx0Ly8gPT09PT09PT09PT09PT09XG5cblx0XHRcdCQoXCJib2R5XCIpLmFkZENsYXNzKFwiZmFuY3lib3gtYWN0aXZlXCIpO1xuXG5cdFx0XHRpZiAoXG5cdFx0XHRcdCEkLmZhbmN5Ym94LmdldEluc3RhbmNlKCkgJiZcblx0XHRcdFx0Zmlyc3RJdGVtT3B0cy5oaWRlU2Nyb2xsYmFyICE9PSBmYWxzZSAmJlxuXHRcdFx0XHQhJC5mYW5jeWJveC5pc01vYmlsZSAmJlxuXHRcdFx0XHRkb2N1bWVudC5ib2R5LnNjcm9sbEhlaWdodCA+IHdpbmRvdy5pbm5lckhlaWdodFxuXHRcdFx0KSB7XG5cdFx0XHRcdCQoXCJoZWFkXCIpLmFwcGVuZChcblx0XHRcdFx0XHQnPHN0eWxlIGlkPVwiZmFuY3lib3gtc3R5bGUtbm9zY3JvbGxcIiB0eXBlPVwidGV4dC9jc3NcIj4uY29tcGVuc2F0ZS1mb3Itc2Nyb2xsYmFye21hcmdpbi1yaWdodDonICtcblx0XHRcdFx0XHQod2luZG93LmlubmVyV2lkdGggLSBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQuY2xpZW50V2lkdGgpICtcblx0XHRcdFx0XHRcInB4O308L3N0eWxlPlwiXG5cdFx0XHRcdCk7XG5cblx0XHRcdFx0JChcImJvZHlcIikuYWRkQ2xhc3MoXCJjb21wZW5zYXRlLWZvci1zY3JvbGxiYXJcIik7XG5cdFx0XHR9XG5cblx0XHRcdC8vIEJ1aWxkIGh0bWwgbWFya3VwIGFuZCBzZXQgcmVmZXJlbmNlc1xuXHRcdFx0Ly8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cblx0XHRcdC8vIEJ1aWxkIGh0bWwgY29kZSBmb3IgYnV0dG9ucyBhbmQgaW5zZXJ0IGludG8gbWFpbiB0ZW1wbGF0ZVxuXHRcdFx0YnV0dG9uU3RyID0gXCJcIjtcblxuXHRcdFx0JC5lYWNoKGZpcnN0SXRlbU9wdHMuYnV0dG9ucywgZnVuY3Rpb24oaW5kZXgsIHZhbHVlKSB7XG5cdFx0XHRcdGJ1dHRvblN0ciArPSBmaXJzdEl0ZW1PcHRzLmJ0blRwbFt2YWx1ZV0gfHwgXCJcIjtcblx0XHRcdH0pO1xuXG5cdFx0XHQvLyBDcmVhdGUgbWFya3VwIGZyb20gYmFzZSB0ZW1wbGF0ZSwgaXQgd2lsbCBiZSBpbml0aWFsbHkgaGlkZGVuIHRvXG5cdFx0XHQvLyBhdm9pZCB1bm5lY2Vzc2FyeSB3b3JrIGxpa2UgcGFpbnRpbmcgd2hpbGUgaW5pdGlhbGl6aW5nIGlzIG5vdCBjb21wbGV0ZVxuXHRcdFx0JGNvbnRhaW5lciA9ICQoXG5cdFx0XHRcdHNlbGYudHJhbnNsYXRlKFxuXHRcdFx0XHRcdHNlbGYsXG5cdFx0XHRcdFx0Zmlyc3RJdGVtT3B0cy5iYXNlVHBsXG5cdFx0XHRcdFx0XHQucmVwbGFjZShcInt7YnV0dG9uc319XCIsIGJ1dHRvblN0cilcblx0XHRcdFx0XHRcdC5yZXBsYWNlKFwie3thcnJvd3N9fVwiLCBmaXJzdEl0ZW1PcHRzLmJ0blRwbC5hcnJvd0xlZnQgKyBmaXJzdEl0ZW1PcHRzLmJ0blRwbC5hcnJvd1JpZ2h0KVxuXHRcdFx0XHQpXG5cdFx0XHQpXG5cdFx0XHRcdC5hdHRyKFwiaWRcIiwgXCJmYW5jeWJveC1jb250YWluZXItXCIgKyBzZWxmLmlkKVxuXHRcdFx0XHQuYWRkQ2xhc3MoZmlyc3RJdGVtT3B0cy5iYXNlQ2xhc3MpXG5cdFx0XHRcdC5kYXRhKFwiRmFuY3lCb3hcIiwgc2VsZilcblx0XHRcdFx0LmFwcGVuZFRvKGZpcnN0SXRlbU9wdHMucGFyZW50RWwpO1xuXG5cdFx0XHQvLyBDcmVhdGUgb2JqZWN0IGhvbGRpbmcgcmVmZXJlbmNlcyB0byBqUXVlcnkgd3JhcHBlZCBub2Rlc1xuXHRcdFx0c2VsZi4kcmVmcyA9IHtcblx0XHRcdFx0Y29udGFpbmVyOiAkY29udGFpbmVyXG5cdFx0XHR9O1xuXG5cdFx0XHRbXCJiZ1wiLCBcImlubmVyXCIsIFwiaW5mb2JhclwiLCBcInRvb2xiYXJcIiwgXCJzdGFnZVwiLCBcImNhcHRpb25cIiwgXCJuYXZpZ2F0aW9uXCJdLmZvckVhY2goZnVuY3Rpb24oaXRlbSkge1xuXHRcdFx0XHRzZWxmLiRyZWZzW2l0ZW1dID0gJGNvbnRhaW5lci5maW5kKFwiLmZhbmN5Ym94LVwiICsgaXRlbSk7XG5cdFx0XHR9KTtcblxuXHRcdFx0c2VsZi50cmlnZ2VyKFwib25Jbml0XCIpO1xuXG5cdFx0XHQvLyBFbmFibGUgZXZlbnRzLCBkZWFjdGl2ZSBwcmV2aW91cyBpbnN0YW5jZXNcblx0XHRcdHNlbGYuYWN0aXZhdGUoKTtcblxuXHRcdFx0Ly8gQnVpbGQgc2xpZGVzLCBsb2FkIGFuZCByZXZlYWwgY29udGVudFxuXHRcdFx0c2VsZi5qdW1wVG8oc2VsZi5jdXJySW5kZXgpO1xuXHRcdH0sXG5cblx0XHQvLyBTaW1wbGUgaTE4biBzdXBwb3J0IC0gcmVwbGFjZXMgb2JqZWN0IGtleXMgZm91bmQgaW4gdGVtcGxhdGVcblx0XHQvLyB3aXRoIGNvcnJlc3BvbmRpbmcgdmFsdWVzXG5cdFx0Ly8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cblx0XHR0cmFuc2xhdGU6IGZ1bmN0aW9uKG9iaiwgc3RyKSB7XG5cdFx0XHR2YXIgYXJyID0gb2JqLm9wdHMuaTE4bltvYmoub3B0cy5sYW5nXSB8fCBvYmoub3B0cy5pMThuLmVuO1xuXG5cdFx0XHRyZXR1cm4gc3RyLnJlcGxhY2UoL1xce1xceyhcXHcrKVxcfVxcfS9nLCBmdW5jdGlvbihtYXRjaCwgbikge1xuXHRcdFx0XHR2YXIgdmFsdWUgPSBhcnJbbl07XG5cblx0XHRcdFx0aWYgKHZhbHVlID09PSB1bmRlZmluZWQpIHtcblx0XHRcdFx0XHRyZXR1cm4gbWF0Y2g7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRyZXR1cm4gdmFsdWU7XG5cdFx0XHR9KTtcblx0XHR9LFxuXG5cdFx0Ly8gUG9wdWxhdGUgY3VycmVudCBncm91cCB3aXRoIGZyZXNoIGNvbnRlbnRcblx0XHQvLyBDaGVjayBpZiBlYWNoIG9iamVjdCBoYXMgdmFsaWQgdHlwZSBhbmQgY29udGVudFxuXHRcdC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cblx0XHRhZGRDb250ZW50OiBmdW5jdGlvbihjb250ZW50KSB7XG5cdFx0XHR2YXIgc2VsZiA9IHRoaXMsXG5cdFx0XHRcdGl0ZW1zID0gJC5tYWtlQXJyYXkoY29udGVudCksXG5cdFx0XHRcdHRodW1icztcblxuXHRcdFx0JC5lYWNoKGl0ZW1zLCBmdW5jdGlvbihpLCBpdGVtKSB7XG5cdFx0XHRcdHZhciBvYmogPSB7fSxcblx0XHRcdFx0XHRvcHRzID0ge30sXG5cdFx0XHRcdFx0JGl0ZW0sXG5cdFx0XHRcdFx0dHlwZSxcblx0XHRcdFx0XHRmb3VuZCxcblx0XHRcdFx0XHRzcmMsXG5cdFx0XHRcdFx0c3JjUGFydHM7XG5cblx0XHRcdFx0Ly8gU3RlcCAxIC0gTWFrZSBzdXJlIHdlIGhhdmUgYW4gb2JqZWN0XG5cdFx0XHRcdC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG5cdFx0XHRcdGlmICgkLmlzUGxhaW5PYmplY3QoaXRlbSkpIHtcblx0XHRcdFx0XHQvLyBXZSBwcm9iYWJseSBoYXZlIG1hbnVhbCB1c2FnZSBoZXJlLCBzb21ldGhpbmcgbGlrZVxuXHRcdFx0XHRcdC8vICQuZmFuY3lib3gub3BlbiggWyB7IHNyYyA6IFwiaW1hZ2UuanBnXCIsIHR5cGUgOiBcImltYWdlXCIgfSBdIClcblxuXHRcdFx0XHRcdG9iaiA9IGl0ZW07XG5cdFx0XHRcdFx0b3B0cyA9IGl0ZW0ub3B0cyB8fCBpdGVtO1xuXHRcdFx0XHR9IGVsc2UgaWYgKCQudHlwZShpdGVtKSA9PT0gXCJvYmplY3RcIiAmJiAkKGl0ZW0pLmxlbmd0aCkge1xuXHRcdFx0XHRcdC8vIEhlcmUgd2UgcHJvYmFibHkgaGF2ZSBqUXVlcnkgY29sbGVjdGlvbiByZXR1cm5lZCBieSBzb21lIHNlbGVjdG9yXG5cdFx0XHRcdFx0JGl0ZW0gPSAkKGl0ZW0pO1xuXG5cdFx0XHRcdFx0Ly8gU3VwcG9ydCBhdHRyaWJ1dGVzIGxpa2UgYGRhdGEtb3B0aW9ucz0ne1widG91Y2hcIiA6IGZhbHNlfSdgIGFuZCBgZGF0YS10b3VjaD0nZmFsc2UnYFxuXHRcdFx0XHRcdG9wdHMgPSAkaXRlbS5kYXRhKCkgfHwge307XG5cdFx0XHRcdFx0b3B0cyA9ICQuZXh0ZW5kKHRydWUsIHt9LCBvcHRzLCBvcHRzLm9wdGlvbnMpO1xuXG5cdFx0XHRcdFx0Ly8gSGVyZSB3ZSBzdG9yZSBjbGlja2VkIGVsZW1lbnRcblx0XHRcdFx0XHRvcHRzLiRvcmlnID0gJGl0ZW07XG5cblx0XHRcdFx0XHRvYmouc3JjID0gc2VsZi5vcHRzLnNyYyB8fCBvcHRzLnNyYyB8fCAkaXRlbS5hdHRyKFwiaHJlZlwiKTtcblxuXHRcdFx0XHRcdC8vIEFzc3VtZSB0aGF0IHNpbXBsZSBzeW50YXggaXMgdXNlZCwgZm9yIGV4YW1wbGU6XG5cdFx0XHRcdFx0Ly8gICBgJC5mYW5jeWJveC5vcGVuKCAkKFwiI3Rlc3RcIiksIHt9ICk7YFxuXHRcdFx0XHRcdGlmICghb2JqLnR5cGUgJiYgIW9iai5zcmMpIHtcblx0XHRcdFx0XHRcdG9iai50eXBlID0gXCJpbmxpbmVcIjtcblx0XHRcdFx0XHRcdG9iai5zcmMgPSBpdGVtO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHQvLyBBc3N1bWUgd2UgaGF2ZSBhIHNpbXBsZSBodG1sIGNvZGUsIGZvciBleGFtcGxlOlxuXHRcdFx0XHRcdC8vICAgJC5mYW5jeWJveC5vcGVuKCAnPGRpdj48aDE+SGkhPC9oMT48L2Rpdj4nICk7XG5cdFx0XHRcdFx0b2JqID0ge1xuXHRcdFx0XHRcdFx0dHlwZTogXCJodG1sXCIsXG5cdFx0XHRcdFx0XHRzcmM6IGl0ZW0gKyBcIlwiXG5cdFx0XHRcdFx0fTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdC8vIEVhY2ggZ2FsbGVyeSBvYmplY3QgaGFzIGZ1bGwgY29sbGVjdGlvbiBvZiBvcHRpb25zXG5cdFx0XHRcdG9iai5vcHRzID0gJC5leHRlbmQodHJ1ZSwge30sIHNlbGYub3B0cywgb3B0cyk7XG5cblx0XHRcdFx0Ly8gRG8gbm90IG1lcmdlIGJ1dHRvbnMgYXJyYXlcblx0XHRcdFx0aWYgKCQuaXNBcnJheShvcHRzLmJ1dHRvbnMpKSB7XG5cdFx0XHRcdFx0b2JqLm9wdHMuYnV0dG9ucyA9IG9wdHMuYnV0dG9ucztcblx0XHRcdFx0fVxuXG5cdFx0XHRcdGlmICgkLmZhbmN5Ym94LmlzTW9iaWxlICYmIG9iai5vcHRzLm1vYmlsZSkge1xuXHRcdFx0XHRcdG9iai5vcHRzID0gbWVyZ2VPcHRzKG9iai5vcHRzLCBvYmoub3B0cy5tb2JpbGUpO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0Ly8gU3RlcCAyIC0gTWFrZSBzdXJlIHdlIGhhdmUgY29udGVudCB0eXBlLCBpZiBub3QgLSB0cnkgdG8gZ3Vlc3Ncblx0XHRcdFx0Ly8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuXHRcdFx0XHR0eXBlID0gb2JqLnR5cGUgfHwgb2JqLm9wdHMudHlwZTtcblx0XHRcdFx0c3JjID0gb2JqLnNyYyB8fCBcIlwiO1xuXG5cdFx0XHRcdGlmICghdHlwZSAmJiBzcmMpIHtcblx0XHRcdFx0XHRpZiAoKGZvdW5kID0gc3JjLm1hdGNoKC9cXC4obXA0fG1vdnxvZ3Z8d2VibSkoKFxcP3wjKS4qKT8kL2kpKSkge1xuXHRcdFx0XHRcdFx0dHlwZSA9IFwidmlkZW9cIjtcblxuXHRcdFx0XHRcdFx0aWYgKCFvYmoub3B0cy52aWRlby5mb3JtYXQpIHtcblx0XHRcdFx0XHRcdFx0b2JqLm9wdHMudmlkZW8uZm9ybWF0ID0gXCJ2aWRlby9cIiArIChmb3VuZFsxXSA9PT0gXCJvZ3ZcIiA/IFwib2dnXCIgOiBmb3VuZFsxXSk7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fSBlbHNlIGlmIChzcmMubWF0Y2goLyheZGF0YTppbWFnZVxcL1thLXowLTkrXFwvPV0qLCl8KFxcLihqcChlfGd8ZWcpfGdpZnxwbmd8Ym1wfHdlYnB8c3ZnfGljbykoKFxcP3wjKS4qKT8kKS9pKSkge1xuXHRcdFx0XHRcdFx0dHlwZSA9IFwiaW1hZ2VcIjtcblx0XHRcdFx0XHR9IGVsc2UgaWYgKHNyYy5tYXRjaCgvXFwuKHBkZikoKFxcP3wjKS4qKT8kL2kpKSB7XG5cdFx0XHRcdFx0XHR0eXBlID0gXCJpZnJhbWVcIjtcblx0XHRcdFx0XHRcdG9iaiA9ICQuZXh0ZW5kKHRydWUsIG9iaiwge2NvbnRlbnRUeXBlOiBcInBkZlwiLCBvcHRzOiB7aWZyYW1lOiB7cHJlbG9hZDogZmFsc2V9fX0pO1xuXHRcdFx0XHRcdH0gZWxzZSBpZiAoc3JjLmNoYXJBdCgwKSA9PT0gXCIjXCIpIHtcblx0XHRcdFx0XHRcdHR5cGUgPSBcImlubGluZVwiO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXG5cdFx0XHRcdGlmICh0eXBlKSB7XG5cdFx0XHRcdFx0b2JqLnR5cGUgPSB0eXBlO1xuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdHNlbGYudHJpZ2dlcihcIm9iamVjdE5lZWRzVHlwZVwiLCBvYmopO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0aWYgKCFvYmouY29udGVudFR5cGUpIHtcblx0XHRcdFx0XHRvYmouY29udGVudFR5cGUgPSAkLmluQXJyYXkob2JqLnR5cGUsIFtcImh0bWxcIiwgXCJpbmxpbmVcIiwgXCJhamF4XCJdKSA+IC0xID8gXCJodG1sXCIgOiBvYmoudHlwZTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdC8vIFN0ZXAgMyAtIFNvbWUgYWRqdXN0bWVudHNcblx0XHRcdFx0Ly8gPT09PT09PT09PT09PT09PT09PT09PT09PVxuXG5cdFx0XHRcdG9iai5pbmRleCA9IHNlbGYuZ3JvdXAubGVuZ3RoO1xuXG5cdFx0XHRcdGlmIChvYmoub3B0cy5zbWFsbEJ0biA9PSBcImF1dG9cIikge1xuXHRcdFx0XHRcdG9iai5vcHRzLnNtYWxsQnRuID0gJC5pbkFycmF5KG9iai50eXBlLCBbXCJodG1sXCIsIFwiaW5saW5lXCIsIFwiYWpheFwiXSkgPiAtMTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdGlmIChvYmoub3B0cy50b29sYmFyID09PSBcImF1dG9cIikge1xuXHRcdFx0XHRcdG9iai5vcHRzLnRvb2xiYXIgPSAhb2JqLm9wdHMuc21hbGxCdG47XG5cdFx0XHRcdH1cblxuXHRcdFx0XHQvLyBGaW5kIHRodW1ibmFpbCBpbWFnZSwgY2hlY2sgaWYgZXhpc3RzIGFuZCBpZiBpcyBpbiB0aGUgdmlld3BvcnRcblx0XHRcdFx0b2JqLiR0aHVtYiA9IG9iai5vcHRzLiR0aHVtYiB8fCBudWxsO1xuXG5cdFx0XHRcdGlmIChvYmoub3B0cy4kdHJpZ2dlciAmJiBvYmouaW5kZXggPT09IHNlbGYub3B0cy5pbmRleCkge1xuXHRcdFx0XHRcdG9iai4kdGh1bWIgPSBvYmoub3B0cy4kdHJpZ2dlci5maW5kKFwiaW1nOmZpcnN0XCIpO1xuXG5cdFx0XHRcdFx0aWYgKG9iai4kdGh1bWIubGVuZ3RoKSB7XG5cdFx0XHRcdFx0XHRvYmoub3B0cy4kb3JpZyA9IG9iai5vcHRzLiR0cmlnZ2VyO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXG5cdFx0XHRcdGlmICghKG9iai4kdGh1bWIgJiYgb2JqLiR0aHVtYi5sZW5ndGgpICYmIG9iai5vcHRzLiRvcmlnKSB7XG5cdFx0XHRcdFx0b2JqLiR0aHVtYiA9IG9iai5vcHRzLiRvcmlnLmZpbmQoXCJpbWc6Zmlyc3RcIik7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRpZiAob2JqLiR0aHVtYiAmJiAhb2JqLiR0aHVtYi5sZW5ndGgpIHtcblx0XHRcdFx0XHRvYmouJHRodW1iID0gbnVsbDtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdG9iai50aHVtYiA9IG9iai5vcHRzLnRodW1iIHx8IChvYmouJHRodW1iID8gb2JqLiR0aHVtYlswXS5zcmMgOiBudWxsKTtcblxuXHRcdFx0XHQvLyBcImNhcHRpb25cIiBpcyBhIFwic3BlY2lhbFwiIG9wdGlvbiwgaXQgY2FuIGJlIHVzZWQgdG8gY3VzdG9taXplIGNhcHRpb24gcGVyIGdhbGxlcnkgaXRlbVxuXHRcdFx0XHRpZiAoJC50eXBlKG9iai5vcHRzLmNhcHRpb24pID09PSBcImZ1bmN0aW9uXCIpIHtcblx0XHRcdFx0XHRvYmoub3B0cy5jYXB0aW9uID0gb2JqLm9wdHMuY2FwdGlvbi5hcHBseShpdGVtLCBbc2VsZiwgb2JqXSk7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRpZiAoJC50eXBlKHNlbGYub3B0cy5jYXB0aW9uKSA9PT0gXCJmdW5jdGlvblwiKSB7XG5cdFx0XHRcdFx0b2JqLm9wdHMuY2FwdGlvbiA9IHNlbGYub3B0cy5jYXB0aW9uLmFwcGx5KGl0ZW0sIFtzZWxmLCBvYmpdKTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdC8vIE1ha2Ugc3VyZSB3ZSBoYXZlIGNhcHRpb24gYXMgYSBzdHJpbmcgb3IgalF1ZXJ5IG9iamVjdFxuXHRcdFx0XHRpZiAoIShvYmoub3B0cy5jYXB0aW9uIGluc3RhbmNlb2YgJCkpIHtcblx0XHRcdFx0XHRvYmoub3B0cy5jYXB0aW9uID0gb2JqLm9wdHMuY2FwdGlvbiA9PT0gdW5kZWZpbmVkID8gXCJcIiA6IG9iai5vcHRzLmNhcHRpb24gKyBcIlwiO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0Ly8gQ2hlY2sgaWYgdXJsIGNvbnRhaW5zIFwiZmlsdGVyXCIgdXNlZCB0byBmaWx0ZXIgdGhlIGNvbnRlbnRcblx0XHRcdFx0Ly8gRXhhbXBsZTogXCJhamF4Lmh0bWwgI3NvbWV0aGluZ1wiXG5cdFx0XHRcdGlmIChvYmoudHlwZSA9PT0gXCJhamF4XCIpIHtcblx0XHRcdFx0XHRzcmNQYXJ0cyA9IHNyYy5zcGxpdCgvXFxzKy8sIDIpO1xuXG5cdFx0XHRcdFx0aWYgKHNyY1BhcnRzLmxlbmd0aCA+IDEpIHtcblx0XHRcdFx0XHRcdG9iai5zcmMgPSBzcmNQYXJ0cy5zaGlmdCgpO1xuXG5cdFx0XHRcdFx0XHRvYmoub3B0cy5maWx0ZXIgPSBzcmNQYXJ0cy5zaGlmdCgpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXG5cdFx0XHRcdC8vIEhpZGUgYWxsIGJ1dHRvbnMgYW5kIGRpc2FibGUgaW50ZXJhY3Rpdml0eSBmb3IgbW9kYWwgaXRlbXNcblx0XHRcdFx0aWYgKG9iai5vcHRzLm1vZGFsKSB7XG5cdFx0XHRcdFx0b2JqLm9wdHMgPSAkLmV4dGVuZCh0cnVlLCBvYmoub3B0cywge1xuXHRcdFx0XHRcdFx0dHJhcEZvY3VzOiB0cnVlLFxuXHRcdFx0XHRcdFx0Ly8gUmVtb3ZlIGJ1dHRvbnNcblx0XHRcdFx0XHRcdGluZm9iYXI6IDAsXG5cdFx0XHRcdFx0XHR0b29sYmFyOiAwLFxuXG5cdFx0XHRcdFx0XHRzbWFsbEJ0bjogMCxcblxuXHRcdFx0XHRcdFx0Ly8gRGlzYWJsZSBrZXlib2FyZCBuYXZpZ2F0aW9uXG5cdFx0XHRcdFx0XHRrZXlib2FyZDogMCxcblxuXHRcdFx0XHRcdFx0Ly8gRGlzYWJsZSBzb21lIG1vZHVsZXNcblx0XHRcdFx0XHRcdHNsaWRlU2hvdzogMCxcblx0XHRcdFx0XHRcdGZ1bGxTY3JlZW46IDAsXG5cdFx0XHRcdFx0XHR0aHVtYnM6IDAsXG5cdFx0XHRcdFx0XHR0b3VjaDogMCxcblxuXHRcdFx0XHRcdFx0Ly8gRGlzYWJsZSBjbGljayBldmVudCBoYW5kbGVyc1xuXHRcdFx0XHRcdFx0Y2xpY2tDb250ZW50OiBmYWxzZSxcblx0XHRcdFx0XHRcdGNsaWNrU2xpZGU6IGZhbHNlLFxuXHRcdFx0XHRcdFx0Y2xpY2tPdXRzaWRlOiBmYWxzZSxcblx0XHRcdFx0XHRcdGRibGNsaWNrQ29udGVudDogZmFsc2UsXG5cdFx0XHRcdFx0XHRkYmxjbGlja1NsaWRlOiBmYWxzZSxcblx0XHRcdFx0XHRcdGRibGNsaWNrT3V0c2lkZTogZmFsc2Vcblx0XHRcdFx0XHR9KTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdC8vIFN0ZXAgNCAtIEFkZCBwcm9jZXNzZWQgb2JqZWN0IHRvIGdyb3VwXG5cdFx0XHRcdC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cblx0XHRcdFx0c2VsZi5ncm91cC5wdXNoKG9iaik7XG5cdFx0XHR9KTtcblxuXHRcdFx0Ly8gVXBkYXRlIGNvbnRyb2xzIGlmIGdhbGxlcnkgaXMgYWxyZWFkeSBvcGVuZWRcblx0XHRcdGlmIChPYmplY3Qua2V5cyhzZWxmLnNsaWRlcykubGVuZ3RoKSB7XG5cdFx0XHRcdHNlbGYudXBkYXRlQ29udHJvbHMoKTtcblxuXHRcdFx0XHQvLyBVcGRhdGUgdGh1bWJuYWlscywgaWYgbmVlZGVkXG5cdFx0XHRcdHRodW1icyA9IHNlbGYuVGh1bWJzO1xuXG5cdFx0XHRcdGlmICh0aHVtYnMgJiYgdGh1bWJzLmlzQWN0aXZlKSB7XG5cdFx0XHRcdFx0dGh1bWJzLmNyZWF0ZSgpO1xuXG5cdFx0XHRcdFx0dGh1bWJzLmZvY3VzKCk7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9LFxuXG5cdFx0Ly8gQXR0YWNoIGFuIGV2ZW50IGhhbmRsZXIgZnVuY3Rpb25zIGZvcjpcblx0XHQvLyAgIC0gbmF2aWdhdGlvbiBidXR0b25zXG5cdFx0Ly8gICAtIGJyb3dzZXIgc2Nyb2xsaW5nLCByZXNpemluZztcblx0XHQvLyAgIC0gZm9jdXNpbmdcblx0XHQvLyAgIC0ga2V5Ym9hcmRcblx0XHQvLyAgIC0gZGV0ZWN0aW5nIGluYWN0aXZpdHlcblx0XHQvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG5cdFx0YWRkRXZlbnRzOiBmdW5jdGlvbigpIHtcblx0XHRcdHZhciBzZWxmID0gdGhpcztcblxuXHRcdFx0c2VsZi5yZW1vdmVFdmVudHMoKTtcblxuXHRcdFx0Ly8gTWFrZSBuYXZpZ2F0aW9uIGVsZW1lbnRzIGNsaWNrYWJsZVxuXHRcdFx0Ly8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG5cdFx0XHRzZWxmLiRyZWZzLmNvbnRhaW5lclxuXHRcdFx0XHQub24oXCJjbGljay5mYi1jbG9zZVwiLCBcIltkYXRhLWZhbmN5Ym94LWNsb3NlXVwiLCBmdW5jdGlvbihlKSB7XG5cdFx0XHRcdFx0ZS5zdG9wUHJvcGFnYXRpb24oKTtcblx0XHRcdFx0XHRlLnByZXZlbnREZWZhdWx0KCk7XG5cblx0XHRcdFx0XHRzZWxmLmNsb3NlKGUpO1xuXHRcdFx0XHR9KVxuXHRcdFx0XHQub24oXCJ0b3VjaHN0YXJ0LmZiLXByZXYgY2xpY2suZmItcHJldlwiLCBcIltkYXRhLWZhbmN5Ym94LXByZXZdXCIsIGZ1bmN0aW9uKGUpIHtcblx0XHRcdFx0XHRlLnN0b3BQcm9wYWdhdGlvbigpO1xuXHRcdFx0XHRcdGUucHJldmVudERlZmF1bHQoKTtcblxuXHRcdFx0XHRcdHNlbGYucHJldmlvdXMoKTtcblx0XHRcdFx0fSlcblx0XHRcdFx0Lm9uKFwidG91Y2hzdGFydC5mYi1uZXh0IGNsaWNrLmZiLW5leHRcIiwgXCJbZGF0YS1mYW5jeWJveC1uZXh0XVwiLCBmdW5jdGlvbihlKSB7XG5cdFx0XHRcdFx0ZS5zdG9wUHJvcGFnYXRpb24oKTtcblx0XHRcdFx0XHRlLnByZXZlbnREZWZhdWx0KCk7XG5cblx0XHRcdFx0XHRzZWxmLm5leHQoKTtcblx0XHRcdFx0fSlcblx0XHRcdFx0Lm9uKFwiY2xpY2suZmJcIiwgXCJbZGF0YS1mYW5jeWJveC16b29tXVwiLCBmdW5jdGlvbihlKSB7XG5cdFx0XHRcdFx0Ly8gQ2xpY2sgaGFuZGxlciBmb3Igem9vbSBidXR0b25cblx0XHRcdFx0XHRzZWxmW3NlbGYuaXNTY2FsZWREb3duKCkgPyBcInNjYWxlVG9BY3R1YWxcIiA6IFwic2NhbGVUb0ZpdFwiXSgpO1xuXHRcdFx0XHR9KTtcblxuXHRcdFx0Ly8gSGFuZGxlIHBhZ2Ugc2Nyb2xsaW5nIGFuZCBicm93c2VyIHJlc2l6aW5nXG5cdFx0XHQvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuXHRcdFx0JFcub24oXCJvcmllbnRhdGlvbmNoYW5nZS5mYiByZXNpemUuZmJcIiwgZnVuY3Rpb24oZSkge1xuXHRcdFx0XHRpZiAoZSAmJiBlLm9yaWdpbmFsRXZlbnQgJiYgZS5vcmlnaW5hbEV2ZW50LnR5cGUgPT09IFwicmVzaXplXCIpIHtcblx0XHRcdFx0XHRpZiAoc2VsZi5yZXF1ZXN0SWQpIHtcblx0XHRcdFx0XHRcdGNhbmNlbEFGcmFtZShzZWxmLnJlcXVlc3RJZCk7XG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0c2VsZi5yZXF1ZXN0SWQgPSByZXF1ZXN0QUZyYW1lKGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdFx0c2VsZi51cGRhdGUoZSk7XG5cdFx0XHRcdFx0fSk7XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0aWYgKHNlbGYuY3VycmVudCAmJiBzZWxmLmN1cnJlbnQudHlwZSA9PT0gXCJpZnJhbWVcIikge1xuXHRcdFx0XHRcdFx0c2VsZi4kcmVmcy5zdGFnZS5oaWRlKCk7XG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0c2V0VGltZW91dChmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRcdHNlbGYuJHJlZnMuc3RhZ2Uuc2hvdygpO1xuXG5cdFx0XHRcdFx0XHRzZWxmLnVwZGF0ZShlKTtcblx0XHRcdFx0XHR9LCAkLmZhbmN5Ym94LmlzTW9iaWxlID8gNjAwIDogMjUwKTtcblx0XHRcdFx0fVxuXHRcdFx0fSk7XG5cblx0XHRcdCRELm9uKFwia2V5ZG93bi5mYlwiLCBmdW5jdGlvbihlKSB7XG5cdFx0XHRcdHZhciBpbnN0YW5jZSA9ICQuZmFuY3lib3ggPyAkLmZhbmN5Ym94LmdldEluc3RhbmNlKCkgOiBudWxsLFxuXHRcdFx0XHRcdGN1cnJlbnQgPSBpbnN0YW5jZS5jdXJyZW50LFxuXHRcdFx0XHRcdGtleWNvZGUgPSBlLmtleUNvZGUgfHwgZS53aGljaDtcblxuXHRcdFx0XHQvLyBUcmFwIGtleWJvYXJkIGZvY3VzIGluc2lkZSBvZiB0aGUgbW9kYWxcblx0XHRcdFx0Ly8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cblx0XHRcdFx0aWYgKGtleWNvZGUgPT0gOSkge1xuXHRcdFx0XHRcdGlmIChjdXJyZW50Lm9wdHMudHJhcEZvY3VzKSB7XG5cdFx0XHRcdFx0XHRzZWxmLmZvY3VzKGUpO1xuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdHJldHVybjtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdC8vIEVuYWJsZSBrZXlib2FyZCBuYXZpZ2F0aW9uXG5cdFx0XHRcdC8vID09PT09PT09PT09PT09PT09PT09PT09PT09XG5cblx0XHRcdFx0aWYgKCFjdXJyZW50Lm9wdHMua2V5Ym9hcmQgfHwgZS5jdHJsS2V5IHx8IGUuYWx0S2V5IHx8IGUuc2hpZnRLZXkgfHwgJChlLnRhcmdldCkuaXMoXCJpbnB1dFwiKSB8fCAkKGUudGFyZ2V0KS5pcyhcInRleHRhcmVhXCIpKSB7XG5cdFx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0Ly8gQmFja3NwYWNlIGFuZCBFc2Mga2V5c1xuXHRcdFx0XHRpZiAoa2V5Y29kZSA9PT0gOCB8fCBrZXljb2RlID09PSAyNykge1xuXHRcdFx0XHRcdGUucHJldmVudERlZmF1bHQoKTtcblxuXHRcdFx0XHRcdHNlbGYuY2xvc2UoZSk7XG5cblx0XHRcdFx0XHRyZXR1cm47XG5cdFx0XHRcdH1cblxuXHRcdFx0XHQvLyBMZWZ0IGFycm93IGFuZCBVcCBhcnJvd1xuXHRcdFx0XHRpZiAoa2V5Y29kZSA9PT0gMzcgfHwga2V5Y29kZSA9PT0gMzgpIHtcblx0XHRcdFx0XHRlLnByZXZlbnREZWZhdWx0KCk7XG5cblx0XHRcdFx0XHRzZWxmLnByZXZpb3VzKCk7XG5cblx0XHRcdFx0XHRyZXR1cm47XG5cdFx0XHRcdH1cblxuXHRcdFx0XHQvLyBSaWdoIGFycm93IGFuZCBEb3duIGFycm93XG5cdFx0XHRcdGlmIChrZXljb2RlID09PSAzOSB8fCBrZXljb2RlID09PSA0MCkge1xuXHRcdFx0XHRcdGUucHJldmVudERlZmF1bHQoKTtcblxuXHRcdFx0XHRcdHNlbGYubmV4dCgpO1xuXG5cdFx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0c2VsZi50cmlnZ2VyKFwiYWZ0ZXJLZXlkb3duXCIsIGUsIGtleWNvZGUpO1xuXHRcdFx0fSk7XG5cblx0XHRcdC8vIEhpZGUgY29udHJvbHMgYWZ0ZXIgc29tZSBpbmFjdGl2aXR5IHBlcmlvZFxuXHRcdFx0aWYgKHNlbGYuZ3JvdXBbc2VsZi5jdXJySW5kZXhdLm9wdHMuaWRsZVRpbWUpIHtcblx0XHRcdFx0c2VsZi5pZGxlU2Vjb25kc0NvdW50ZXIgPSAwO1xuXG5cdFx0XHRcdCRELm9uKFxuXHRcdFx0XHRcdFwibW91c2Vtb3ZlLmZiLWlkbGUgbW91c2VsZWF2ZS5mYi1pZGxlIG1vdXNlZG93bi5mYi1pZGxlIHRvdWNoc3RhcnQuZmItaWRsZSB0b3VjaG1vdmUuZmItaWRsZSBzY3JvbGwuZmItaWRsZSBrZXlkb3duLmZiLWlkbGVcIixcblx0XHRcdFx0XHRmdW5jdGlvbihlKSB7XG5cdFx0XHRcdFx0XHRzZWxmLmlkbGVTZWNvbmRzQ291bnRlciA9IDA7XG5cblx0XHRcdFx0XHRcdGlmIChzZWxmLmlzSWRsZSkge1xuXHRcdFx0XHRcdFx0XHRzZWxmLnNob3dDb250cm9scygpO1xuXHRcdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0XHRzZWxmLmlzSWRsZSA9IGZhbHNlO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0KTtcblxuXHRcdFx0XHRzZWxmLmlkbGVJbnRlcnZhbCA9IHdpbmRvdy5zZXRJbnRlcnZhbChmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRzZWxmLmlkbGVTZWNvbmRzQ291bnRlcisrO1xuXG5cdFx0XHRcdFx0aWYgKHNlbGYuaWRsZVNlY29uZHNDb3VudGVyID49IHNlbGYuZ3JvdXBbc2VsZi5jdXJySW5kZXhdLm9wdHMuaWRsZVRpbWUgJiYgIXNlbGYuaXNEcmFnZ2luZykge1xuXHRcdFx0XHRcdFx0c2VsZi5pc0lkbGUgPSB0cnVlO1xuXHRcdFx0XHRcdFx0c2VsZi5pZGxlU2Vjb25kc0NvdW50ZXIgPSAwO1xuXG5cdFx0XHRcdFx0XHRzZWxmLmhpZGVDb250cm9scygpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fSwgMTAwMCk7XG5cdFx0XHR9XG5cdFx0fSxcblxuXHRcdC8vIFJlbW92ZSBldmVudHMgYWRkZWQgYnkgdGhlIGNvcmVcblx0XHQvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cblx0XHRyZW1vdmVFdmVudHM6IGZ1bmN0aW9uKCkge1xuXHRcdFx0dmFyIHNlbGYgPSB0aGlzO1xuXG5cdFx0XHQkVy5vZmYoXCJvcmllbnRhdGlvbmNoYW5nZS5mYiByZXNpemUuZmJcIik7XG5cdFx0XHQkRC5vZmYoXCJrZXlkb3duLmZiIC5mYi1pZGxlXCIpO1xuXG5cdFx0XHR0aGlzLiRyZWZzLmNvbnRhaW5lci5vZmYoXCIuZmItY2xvc2UgLmZiLXByZXYgLmZiLW5leHRcIik7XG5cblx0XHRcdGlmIChzZWxmLmlkbGVJbnRlcnZhbCkge1xuXHRcdFx0XHR3aW5kb3cuY2xlYXJJbnRlcnZhbChzZWxmLmlkbGVJbnRlcnZhbCk7XG5cblx0XHRcdFx0c2VsZi5pZGxlSW50ZXJ2YWwgPSBudWxsO1xuXHRcdFx0fVxuXHRcdH0sXG5cblx0XHQvLyBDaGFuZ2UgdG8gcHJldmlvdXMgZ2FsbGVyeSBpdGVtXG5cdFx0Ly8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG5cdFx0cHJldmlvdXM6IGZ1bmN0aW9uKGR1cmF0aW9uKSB7XG5cdFx0XHRyZXR1cm4gdGhpcy5qdW1wVG8odGhpcy5jdXJyUG9zIC0gMSwgZHVyYXRpb24pO1xuXHRcdH0sXG5cblx0XHQvLyBDaGFuZ2UgdG8gbmV4dCBnYWxsZXJ5IGl0ZW1cblx0XHQvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuXHRcdG5leHQ6IGZ1bmN0aW9uKGR1cmF0aW9uKSB7XG5cdFx0XHRyZXR1cm4gdGhpcy5qdW1wVG8odGhpcy5jdXJyUG9zICsgMSwgZHVyYXRpb24pO1xuXHRcdH0sXG5cblx0XHQvLyBTd2l0Y2ggdG8gc2VsZWN0ZWQgZ2FsbGVyeSBpdGVtXG5cdFx0Ly8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG5cdFx0anVtcFRvOiBmdW5jdGlvbihwb3MsIGR1cmF0aW9uKSB7XG5cdFx0XHR2YXIgc2VsZiA9IHRoaXMsXG5cdFx0XHRcdGdyb3VwTGVuID0gc2VsZi5ncm91cC5sZW5ndGgsXG5cdFx0XHRcdGZpcnN0UnVuLFxuXHRcdFx0XHRpc01vdmVkLFxuXHRcdFx0XHRsb29wLFxuXHRcdFx0XHRjdXJyZW50LFxuXHRcdFx0XHRwcmV2aW91cyxcblx0XHRcdFx0c2xpZGVQb3MsXG5cdFx0XHRcdHN0YWdlUG9zLFxuXHRcdFx0XHRwcm9wLFxuXHRcdFx0XHRkaWZmO1xuXG5cdFx0XHRpZiAoc2VsZi5pc0RyYWdnaW5nIHx8IHNlbGYuaXNDbG9zaW5nIHx8IChzZWxmLmlzQW5pbWF0aW5nICYmIHNlbGYuZmlyc3RSdW4pKSB7XG5cdFx0XHRcdHJldHVybjtcblx0XHRcdH1cblxuXHRcdFx0Ly8gU2hvdWxkIGxvb3A/XG5cdFx0XHRwb3MgPSBwYXJzZUludChwb3MsIDEwKTtcblx0XHRcdGxvb3AgPSBzZWxmLmN1cnJlbnQgPyBzZWxmLmN1cnJlbnQub3B0cy5sb29wIDogc2VsZi5vcHRzLmxvb3A7XG5cblx0XHRcdGlmICghbG9vcCAmJiAocG9zIDwgMCB8fCBwb3MgPj0gZ3JvdXBMZW4pKSB7XG5cdFx0XHRcdHJldHVybiBmYWxzZTtcblx0XHRcdH1cblxuXHRcdFx0Ly8gQ2hlY2sgaWYgb3BlbmluZyBmb3IgdGhlIGZpcnN0IHRpbWU7IHRoaXMgaGVscHMgdG8gc3BlZWQgdGhpbmdzIHVwXG5cdFx0XHRmaXJzdFJ1biA9IHNlbGYuZmlyc3RSdW4gPSAhT2JqZWN0LmtleXMoc2VsZi5zbGlkZXMpLmxlbmd0aDtcblxuXHRcdFx0Ly8gQ3JlYXRlIHNsaWRlc1xuXHRcdFx0cHJldmlvdXMgPSBzZWxmLmN1cnJlbnQ7XG5cblx0XHRcdHNlbGYucHJldkluZGV4ID0gc2VsZi5jdXJySW5kZXg7XG5cdFx0XHRzZWxmLnByZXZQb3MgPSBzZWxmLmN1cnJQb3M7XG5cblx0XHRcdGN1cnJlbnQgPSBzZWxmLmNyZWF0ZVNsaWRlKHBvcyk7XG5cblx0XHRcdGlmIChncm91cExlbiA+IDEpIHtcblx0XHRcdFx0aWYgKGxvb3AgfHwgY3VycmVudC5pbmRleCA8IGdyb3VwTGVuIC0gMSkge1xuXHRcdFx0XHRcdHNlbGYuY3JlYXRlU2xpZGUocG9zICsgMSk7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRpZiAobG9vcCB8fCBjdXJyZW50LmluZGV4ID4gMCkge1xuXHRcdFx0XHRcdHNlbGYuY3JlYXRlU2xpZGUocG9zIC0gMSk7XG5cdFx0XHRcdH1cblx0XHRcdH1cblxuXHRcdFx0c2VsZi5jdXJyZW50ID0gY3VycmVudDtcblx0XHRcdHNlbGYuY3VyckluZGV4ID0gY3VycmVudC5pbmRleDtcblx0XHRcdHNlbGYuY3VyclBvcyA9IGN1cnJlbnQucG9zO1xuXG5cdFx0XHRzZWxmLnRyaWdnZXIoXCJiZWZvcmVTaG93XCIsIGZpcnN0UnVuKTtcblxuXHRcdFx0c2VsZi51cGRhdGVDb250cm9scygpO1xuXG5cdFx0XHQvLyBWYWxpZGF0ZSBkdXJhdGlvbiBsZW5ndGhcblx0XHRcdGN1cnJlbnQuZm9yY2VkRHVyYXRpb24gPSB1bmRlZmluZWQ7XG5cblx0XHRcdGlmICgkLmlzTnVtZXJpYyhkdXJhdGlvbikpIHtcblx0XHRcdFx0Y3VycmVudC5mb3JjZWREdXJhdGlvbiA9IGR1cmF0aW9uO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0ZHVyYXRpb24gPSBjdXJyZW50Lm9wdHNbZmlyc3RSdW4gPyBcImFuaW1hdGlvbkR1cmF0aW9uXCIgOiBcInRyYW5zaXRpb25EdXJhdGlvblwiXTtcblx0XHRcdH1cblxuXHRcdFx0ZHVyYXRpb24gPSBwYXJzZUludChkdXJhdGlvbiwgMTApO1xuXG5cdFx0XHQvLyBDaGVjayBpZiB1c2VyIGhhcyBzd2lwZWQgdGhlIHNsaWRlcyBvciBpZiBzdGlsbCBhbmltYXRpbmdcblx0XHRcdGlzTW92ZWQgPSBzZWxmLmlzTW92ZWQoY3VycmVudCk7XG5cblx0XHRcdC8vIE1ha2Ugc3VyZSBjdXJyZW50IHNsaWRlIGlzIHZpc2libGVcblx0XHRcdGN1cnJlbnQuJHNsaWRlLmFkZENsYXNzKFwiZmFuY3lib3gtc2xpZGUtLWN1cnJlbnRcIik7XG5cblx0XHRcdC8vIEZyZXNoIHN0YXJ0IC0gcmV2ZWFsIGNvbnRhaW5lciwgY3VycmVudCBzbGlkZSBhbmQgc3RhcnQgbG9hZGluZyBjb250ZW50XG5cdFx0XHRpZiAoZmlyc3RSdW4pIHtcblx0XHRcdFx0aWYgKGN1cnJlbnQub3B0cy5hbmltYXRpb25FZmZlY3QgJiYgZHVyYXRpb24pIHtcblx0XHRcdFx0XHRzZWxmLiRyZWZzLmNvbnRhaW5lci5jc3MoXCJ0cmFuc2l0aW9uLWR1cmF0aW9uXCIsIGR1cmF0aW9uICsgXCJtc1wiKTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdHNlbGYuJHJlZnMuY29udGFpbmVyLmFkZENsYXNzKFwiZmFuY3lib3gtaXMtb3BlblwiKS50cmlnZ2VyKFwiZm9jdXNcIik7XG5cblx0XHRcdFx0Ly8gQXR0ZW1wdCB0byBsb2FkIGNvbnRlbnQgaW50byBzbGlkZVxuXHRcdFx0XHQvLyBUaGlzIHdpbGwgbGF0ZXIgY2FsbCBgYWZ0ZXJMb2FkYCAtPiBgcmV2ZWFsQ29udGVudGBcblx0XHRcdFx0c2VsZi5sb2FkU2xpZGUoY3VycmVudCk7XG5cblx0XHRcdFx0c2VsZi5wcmVsb2FkKFwiaW1hZ2VcIik7XG5cblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0fVxuXG5cdFx0XHQvLyBHZXQgYWN0dWFsIHNsaWRlL3N0YWdlIHBvc2l0aW9ucyAoYmVmb3JlIGNsZWFuaW5nIHVwKVxuXHRcdFx0c2xpZGVQb3MgPSAkLmZhbmN5Ym94LmdldFRyYW5zbGF0ZShwcmV2aW91cy4kc2xpZGUpO1xuXHRcdFx0c3RhZ2VQb3MgPSAkLmZhbmN5Ym94LmdldFRyYW5zbGF0ZShzZWxmLiRyZWZzLnN0YWdlKTtcblxuXHRcdFx0Ly8gQ2xlYW4gdXAgYWxsIHNsaWRlc1xuXHRcdFx0JC5lYWNoKHNlbGYuc2xpZGVzLCBmdW5jdGlvbihpbmRleCwgc2xpZGUpIHtcblx0XHRcdFx0JC5mYW5jeWJveC5zdG9wKHNsaWRlLiRzbGlkZSwgdHJ1ZSk7XG5cdFx0XHR9KTtcblxuXHRcdFx0aWYgKHByZXZpb3VzLnBvcyAhPT0gY3VycmVudC5wb3MpIHtcblx0XHRcdFx0cHJldmlvdXMuaXNDb21wbGV0ZSA9IGZhbHNlO1xuXHRcdFx0fVxuXG5cdFx0XHRwcmV2aW91cy4kc2xpZGUucmVtb3ZlQ2xhc3MoXCJmYW5jeWJveC1zbGlkZS0tY29tcGxldGUgZmFuY3lib3gtc2xpZGUtLWN1cnJlbnRcIik7XG5cblx0XHRcdC8vIElmIHNsaWRlcyBhcmUgb3V0IG9mIHBsYWNlLCB0aGVuIGFuaW1hdGUgdGhlbSB0byBjb3JyZWN0IHBvc2l0aW9uXG5cdFx0XHRpZiAoaXNNb3ZlZCkge1xuXHRcdFx0XHQvLyBDYWxjdWxhdGUgaG9yaXpvbnRhbCBzd2lwZSBkaXN0YW5jZVxuXHRcdFx0XHRkaWZmID0gc2xpZGVQb3MubGVmdCAtIChwcmV2aW91cy5wb3MgKiBzbGlkZVBvcy53aWR0aCArIHByZXZpb3VzLnBvcyAqIHByZXZpb3VzLm9wdHMuZ3V0dGVyKTtcblxuXHRcdFx0XHQkLmVhY2goc2VsZi5zbGlkZXMsIGZ1bmN0aW9uKGluZGV4LCBzbGlkZSkge1xuXHRcdFx0XHRcdHNsaWRlLiRzbGlkZS5yZW1vdmVDbGFzcyhcImZhbmN5Ym94LWFuaW1hdGVkXCIpLnJlbW92ZUNsYXNzKGZ1bmN0aW9uKGluZGV4LCBjbGFzc05hbWUpIHtcblx0XHRcdFx0XHRcdHJldHVybiAoY2xhc3NOYW1lLm1hdGNoKC8oXnxcXHMpZmFuY3lib3gtZngtXFxTKy9nKSB8fCBbXSkuam9pbihcIiBcIik7XG5cdFx0XHRcdFx0fSk7XG5cblx0XHRcdFx0XHQvLyBNYWtlIHN1cmUgdGhhdCBlYWNoIHNsaWRlIGlzIGluIGVxdWFsIGRpc3RhbmNlXG5cdFx0XHRcdFx0Ly8gVGhpcyBpcyBtb3N0bHkgbmVlZGVkIGZvciBmcmVzaGx5IGFkZGVkIHNsaWRlcywgYmVjYXVzZSB0aGV5IGFyZSBub3QgeWV0IHBvc2l0aW9uZWRcblx0XHRcdFx0XHR2YXIgbGVmdFBvcyA9IHNsaWRlLnBvcyAqIHNsaWRlUG9zLndpZHRoICsgc2xpZGUucG9zICogc2xpZGUub3B0cy5ndXR0ZXI7XG5cblx0XHRcdFx0XHQkLmZhbmN5Ym94LnNldFRyYW5zbGF0ZShzbGlkZS4kc2xpZGUsIHt0b3A6IDAsIGxlZnQ6IGxlZnRQb3MgLSBzdGFnZVBvcy5sZWZ0ICsgZGlmZn0pO1xuXG5cdFx0XHRcdFx0aWYgKHNsaWRlLnBvcyAhPT0gY3VycmVudC5wb3MpIHtcblx0XHRcdFx0XHRcdHNsaWRlLiRzbGlkZS5hZGRDbGFzcyhcImZhbmN5Ym94LXNsaWRlLS1cIiArIChzbGlkZS5wb3MgPiBjdXJyZW50LnBvcyA/IFwibmV4dFwiIDogXCJwcmV2aW91c1wiKSk7XG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0Ly8gUmVkcmF3IHRvIG1ha2Ugc3VyZSB0aGF0IHRyYW5zaXRpb24gd2lsbCBzdGFydFxuXHRcdFx0XHRcdGZvcmNlUmVkcmF3KHNsaWRlLiRzbGlkZSk7XG5cblx0XHRcdFx0XHQvLyBBbmltYXRlIHRoZSBzbGlkZVxuXHRcdFx0XHRcdCQuZmFuY3lib3guYW5pbWF0ZShcblx0XHRcdFx0XHRcdHNsaWRlLiRzbGlkZSxcblx0XHRcdFx0XHRcdHtcblx0XHRcdFx0XHRcdFx0dG9wOiAwLFxuXHRcdFx0XHRcdFx0XHRsZWZ0OiAoc2xpZGUucG9zIC0gY3VycmVudC5wb3MpICogc2xpZGVQb3Mud2lkdGggKyAoc2xpZGUucG9zIC0gY3VycmVudC5wb3MpICogc2xpZGUub3B0cy5ndXR0ZXJcblx0XHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0XHRkdXJhdGlvbixcblx0XHRcdFx0XHRcdGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdFx0XHRzbGlkZS4kc2xpZGVcblx0XHRcdFx0XHRcdFx0XHQuY3NzKHtcblx0XHRcdFx0XHRcdFx0XHRcdHRyYW5zZm9ybTogXCJcIixcblx0XHRcdFx0XHRcdFx0XHRcdG9wYWNpdHk6IFwiXCJcblx0XHRcdFx0XHRcdFx0XHR9KVxuXHRcdFx0XHRcdFx0XHRcdC5yZW1vdmVDbGFzcyhcImZhbmN5Ym94LXNsaWRlLS1uZXh0IGZhbmN5Ym94LXNsaWRlLS1wcmV2aW91c1wiKTtcblxuXHRcdFx0XHRcdFx0XHRpZiAoc2xpZGUucG9zID09PSBzZWxmLmN1cnJQb3MpIHtcblx0XHRcdFx0XHRcdFx0XHRzZWxmLmNvbXBsZXRlKCk7XG5cdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHQpO1xuXHRcdFx0XHR9KTtcblx0XHRcdH0gZWxzZSBpZiAoZHVyYXRpb24gJiYgY3VycmVudC5vcHRzLnRyYW5zaXRpb25FZmZlY3QpIHtcblx0XHRcdFx0Ly8gU2V0IHRyYW5zaXRpb24gZWZmZWN0IGZvciBwcmV2aW91c2x5IGFjdGl2ZSBzbGlkZVxuXHRcdFx0XHRwcm9wID0gXCJmYW5jeWJveC1hbmltYXRlZCBmYW5jeWJveC1meC1cIiArIGN1cnJlbnQub3B0cy50cmFuc2l0aW9uRWZmZWN0O1xuXG5cdFx0XHRcdHByZXZpb3VzLiRzbGlkZS5hZGRDbGFzcyhcImZhbmN5Ym94LXNsaWRlLS1cIiArIChwcmV2aW91cy5wb3MgPiBjdXJyZW50LnBvcyA/IFwibmV4dFwiIDogXCJwcmV2aW91c1wiKSk7XG5cblx0XHRcdFx0JC5mYW5jeWJveC5hbmltYXRlKFxuXHRcdFx0XHRcdHByZXZpb3VzLiRzbGlkZSxcblx0XHRcdFx0XHRwcm9wLFxuXHRcdFx0XHRcdGR1cmF0aW9uLFxuXHRcdFx0XHRcdGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdFx0cHJldmlvdXMuJHNsaWRlLnJlbW92ZUNsYXNzKHByb3ApLnJlbW92ZUNsYXNzKFwiZmFuY3lib3gtc2xpZGUtLW5leHQgZmFuY3lib3gtc2xpZGUtLXByZXZpb3VzXCIpO1xuXHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0ZmFsc2Vcblx0XHRcdFx0KTtcblx0XHRcdH1cblxuXHRcdFx0aWYgKGN1cnJlbnQuaXNMb2FkZWQpIHtcblx0XHRcdFx0c2VsZi5yZXZlYWxDb250ZW50KGN1cnJlbnQpO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0c2VsZi5sb2FkU2xpZGUoY3VycmVudCk7XG5cdFx0XHR9XG5cblx0XHRcdHNlbGYucHJlbG9hZChcImltYWdlXCIpO1xuXHRcdH0sXG5cblx0XHQvLyBDcmVhdGUgbmV3IFwic2xpZGVcIiBlbGVtZW50XG5cdFx0Ly8gVGhlc2UgYXJlIGdhbGxlcnkgaXRlbXMgIHRoYXQgYXJlIGFjdHVhbGx5IGFkZGVkIHRvIERPTVxuXHRcdC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuXHRcdGNyZWF0ZVNsaWRlOiBmdW5jdGlvbihwb3MpIHtcblx0XHRcdHZhciBzZWxmID0gdGhpcyxcblx0XHRcdFx0JHNsaWRlLFxuXHRcdFx0XHRpbmRleDtcblxuXHRcdFx0aW5kZXggPSBwb3MgJSBzZWxmLmdyb3VwLmxlbmd0aDtcblx0XHRcdGluZGV4ID0gaW5kZXggPCAwID8gc2VsZi5ncm91cC5sZW5ndGggKyBpbmRleCA6IGluZGV4O1xuXG5cdFx0XHRpZiAoIXNlbGYuc2xpZGVzW3Bvc10gJiYgc2VsZi5ncm91cFtpbmRleF0pIHtcblx0XHRcdFx0JHNsaWRlID0gJCgnPGRpdiBjbGFzcz1cImZhbmN5Ym94LXNsaWRlXCI+PC9kaXY+JykuYXBwZW5kVG8oc2VsZi4kcmVmcy5zdGFnZSk7XG5cblx0XHRcdFx0c2VsZi5zbGlkZXNbcG9zXSA9ICQuZXh0ZW5kKHRydWUsIHt9LCBzZWxmLmdyb3VwW2luZGV4XSwge1xuXHRcdFx0XHRcdHBvczogcG9zLFxuXHRcdFx0XHRcdCRzbGlkZTogJHNsaWRlLFxuXHRcdFx0XHRcdGlzTG9hZGVkOiBmYWxzZVxuXHRcdFx0XHR9KTtcblxuXHRcdFx0XHRzZWxmLnVwZGF0ZVNsaWRlKHNlbGYuc2xpZGVzW3Bvc10pO1xuXHRcdFx0fVxuXG5cdFx0XHRyZXR1cm4gc2VsZi5zbGlkZXNbcG9zXTtcblx0XHR9LFxuXG5cdFx0Ly8gU2NhbGUgaW1hZ2UgdG8gdGhlIGFjdHVhbCBzaXplIG9mIHRoZSBpbWFnZTtcblx0XHQvLyB4IGFuZCB5IHZhbHVlcyBzaG91bGQgYmUgcmVsYXRpdmUgdG8gdGhlIHNsaWRlXG5cdFx0Ly8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG5cdFx0c2NhbGVUb0FjdHVhbDogZnVuY3Rpb24oeCwgeSwgZHVyYXRpb24pIHtcblx0XHRcdHZhciBzZWxmID0gdGhpcyxcblx0XHRcdFx0Y3VycmVudCA9IHNlbGYuY3VycmVudCxcblx0XHRcdFx0JGNvbnRlbnQgPSBjdXJyZW50LiRjb250ZW50LFxuXHRcdFx0XHRjYW52YXNXaWR0aCA9ICQuZmFuY3lib3guZ2V0VHJhbnNsYXRlKGN1cnJlbnQuJHNsaWRlKS53aWR0aCxcblx0XHRcdFx0Y2FudmFzSGVpZ2h0ID0gJC5mYW5jeWJveC5nZXRUcmFuc2xhdGUoY3VycmVudC4kc2xpZGUpLmhlaWdodCxcblx0XHRcdFx0bmV3SW1nV2lkdGggPSBjdXJyZW50LndpZHRoLFxuXHRcdFx0XHRuZXdJbWdIZWlnaHQgPSBjdXJyZW50LmhlaWdodCxcblx0XHRcdFx0aW1nUG9zLFxuXHRcdFx0XHRwb3NYLFxuXHRcdFx0XHRwb3NZLFxuXHRcdFx0XHRzY2FsZVgsXG5cdFx0XHRcdHNjYWxlWTtcblxuXHRcdFx0aWYgKHNlbGYuaXNBbmltYXRpbmcgfHwgc2VsZi5pc01vdmVkKCkgfHwgISRjb250ZW50IHx8ICEoY3VycmVudC50eXBlID09IFwiaW1hZ2VcIiAmJiBjdXJyZW50LmlzTG9hZGVkICYmICFjdXJyZW50Lmhhc0Vycm9yKSkge1xuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR9XG5cblx0XHRcdHNlbGYuaXNBbmltYXRpbmcgPSB0cnVlO1xuXG5cdFx0XHQkLmZhbmN5Ym94LnN0b3AoJGNvbnRlbnQpO1xuXG5cdFx0XHR4ID0geCA9PT0gdW5kZWZpbmVkID8gY2FudmFzV2lkdGggKiAwLjUgOiB4O1xuXHRcdFx0eSA9IHkgPT09IHVuZGVmaW5lZCA/IGNhbnZhc0hlaWdodCAqIDAuNSA6IHk7XG5cblx0XHRcdGltZ1BvcyA9ICQuZmFuY3lib3guZ2V0VHJhbnNsYXRlKCRjb250ZW50KTtcblxuXHRcdFx0aW1nUG9zLnRvcCAtPSAkLmZhbmN5Ym94LmdldFRyYW5zbGF0ZShjdXJyZW50LiRzbGlkZSkudG9wO1xuXHRcdFx0aW1nUG9zLmxlZnQgLT0gJC5mYW5jeWJveC5nZXRUcmFuc2xhdGUoY3VycmVudC4kc2xpZGUpLmxlZnQ7XG5cblx0XHRcdHNjYWxlWCA9IG5ld0ltZ1dpZHRoIC8gaW1nUG9zLndpZHRoO1xuXHRcdFx0c2NhbGVZID0gbmV3SW1nSGVpZ2h0IC8gaW1nUG9zLmhlaWdodDtcblxuXHRcdFx0Ly8gR2V0IGNlbnRlciBwb3NpdGlvbiBmb3Igb3JpZ2luYWwgaW1hZ2Vcblx0XHRcdHBvc1ggPSBjYW52YXNXaWR0aCAqIDAuNSAtIG5ld0ltZ1dpZHRoICogMC41O1xuXHRcdFx0cG9zWSA9IGNhbnZhc0hlaWdodCAqIDAuNSAtIG5ld0ltZ0hlaWdodCAqIDAuNTtcblxuXHRcdFx0Ly8gTWFrZSBzdXJlIGltYWdlIGRvZXMgbm90IG1vdmUgYXdheSBmcm9tIGVkZ2VzXG5cdFx0XHRpZiAobmV3SW1nV2lkdGggPiBjYW52YXNXaWR0aCkge1xuXHRcdFx0XHRwb3NYID0gaW1nUG9zLmxlZnQgKiBzY2FsZVggLSAoeCAqIHNjYWxlWCAtIHgpO1xuXG5cdFx0XHRcdGlmIChwb3NYID4gMCkge1xuXHRcdFx0XHRcdHBvc1ggPSAwO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0aWYgKHBvc1ggPCBjYW52YXNXaWR0aCAtIG5ld0ltZ1dpZHRoKSB7XG5cdFx0XHRcdFx0cG9zWCA9IGNhbnZhc1dpZHRoIC0gbmV3SW1nV2lkdGg7XG5cdFx0XHRcdH1cblx0XHRcdH1cblxuXHRcdFx0aWYgKG5ld0ltZ0hlaWdodCA+IGNhbnZhc0hlaWdodCkge1xuXHRcdFx0XHRwb3NZID0gaW1nUG9zLnRvcCAqIHNjYWxlWSAtICh5ICogc2NhbGVZIC0geSk7XG5cblx0XHRcdFx0aWYgKHBvc1kgPiAwKSB7XG5cdFx0XHRcdFx0cG9zWSA9IDA7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRpZiAocG9zWSA8IGNhbnZhc0hlaWdodCAtIG5ld0ltZ0hlaWdodCkge1xuXHRcdFx0XHRcdHBvc1kgPSBjYW52YXNIZWlnaHQgLSBuZXdJbWdIZWlnaHQ7XG5cdFx0XHRcdH1cblx0XHRcdH1cblxuXHRcdFx0c2VsZi51cGRhdGVDdXJzb3IobmV3SW1nV2lkdGgsIG5ld0ltZ0hlaWdodCk7XG5cblx0XHRcdCQuZmFuY3lib3guYW5pbWF0ZShcblx0XHRcdFx0JGNvbnRlbnQsXG5cdFx0XHRcdHtcblx0XHRcdFx0XHR0b3A6IHBvc1ksXG5cdFx0XHRcdFx0bGVmdDogcG9zWCxcblx0XHRcdFx0XHRzY2FsZVg6IHNjYWxlWCxcblx0XHRcdFx0XHRzY2FsZVk6IHNjYWxlWVxuXHRcdFx0XHR9LFxuXHRcdFx0XHRkdXJhdGlvbiB8fCAzMzAsXG5cdFx0XHRcdGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdHNlbGYuaXNBbmltYXRpbmcgPSBmYWxzZTtcblx0XHRcdFx0fVxuXHRcdFx0KTtcblxuXHRcdFx0Ly8gU3RvcCBzbGlkZXNob3dcblx0XHRcdGlmIChzZWxmLlNsaWRlU2hvdyAmJiBzZWxmLlNsaWRlU2hvdy5pc0FjdGl2ZSkge1xuXHRcdFx0XHRzZWxmLlNsaWRlU2hvdy5zdG9wKCk7XG5cdFx0XHR9XG5cdFx0fSxcblxuXHRcdC8vIFNjYWxlIGltYWdlIHRvIGZpdCBpbnNpZGUgcGFyZW50IGVsZW1lbnRcblx0XHQvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cblx0XHRzY2FsZVRvRml0OiBmdW5jdGlvbihkdXJhdGlvbikge1xuXHRcdFx0dmFyIHNlbGYgPSB0aGlzLFxuXHRcdFx0XHRjdXJyZW50ID0gc2VsZi5jdXJyZW50LFxuXHRcdFx0XHQkY29udGVudCA9IGN1cnJlbnQuJGNvbnRlbnQsXG5cdFx0XHRcdGVuZDtcblxuXHRcdFx0aWYgKHNlbGYuaXNBbmltYXRpbmcgfHwgc2VsZi5pc01vdmVkKCkgfHwgISRjb250ZW50IHx8ICEoY3VycmVudC50eXBlID09IFwiaW1hZ2VcIiAmJiBjdXJyZW50LmlzTG9hZGVkICYmICFjdXJyZW50Lmhhc0Vycm9yKSkge1xuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR9XG5cblx0XHRcdHNlbGYuaXNBbmltYXRpbmcgPSB0cnVlO1xuXG5cdFx0XHQkLmZhbmN5Ym94LnN0b3AoJGNvbnRlbnQpO1xuXG5cdFx0XHRlbmQgPSBzZWxmLmdldEZpdFBvcyhjdXJyZW50KTtcblxuXHRcdFx0c2VsZi51cGRhdGVDdXJzb3IoZW5kLndpZHRoLCBlbmQuaGVpZ2h0KTtcblxuXHRcdFx0JC5mYW5jeWJveC5hbmltYXRlKFxuXHRcdFx0XHQkY29udGVudCxcblx0XHRcdFx0e1xuXHRcdFx0XHRcdHRvcDogZW5kLnRvcCxcblx0XHRcdFx0XHRsZWZ0OiBlbmQubGVmdCxcblx0XHRcdFx0XHRzY2FsZVg6IGVuZC53aWR0aCAvICRjb250ZW50LndpZHRoKCksXG5cdFx0XHRcdFx0c2NhbGVZOiBlbmQuaGVpZ2h0IC8gJGNvbnRlbnQuaGVpZ2h0KClcblx0XHRcdFx0fSxcblx0XHRcdFx0ZHVyYXRpb24gfHwgMzMwLFxuXHRcdFx0XHRmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRzZWxmLmlzQW5pbWF0aW5nID0gZmFsc2U7XG5cdFx0XHRcdH1cblx0XHRcdCk7XG5cdFx0fSxcblxuXHRcdC8vIENhbGN1bGF0ZSBpbWFnZSBzaXplIHRvIGZpdCBpbnNpZGUgdmlld3BvcnRcblx0XHQvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cblx0XHRnZXRGaXRQb3M6IGZ1bmN0aW9uKHNsaWRlKSB7XG5cdFx0XHR2YXIgc2VsZiA9IHRoaXMsXG5cdFx0XHRcdCRjb250ZW50ID0gc2xpZGUuJGNvbnRlbnQsXG5cdFx0XHRcdCRzbGlkZSA9IHNsaWRlLiRzbGlkZSxcblx0XHRcdFx0d2lkdGggPSBzbGlkZS53aWR0aCB8fCBzbGlkZS5vcHRzLndpZHRoLFxuXHRcdFx0XHRoZWlnaHQgPSBzbGlkZS5oZWlnaHQgfHwgc2xpZGUub3B0cy5oZWlnaHQsXG5cdFx0XHRcdG1heFdpZHRoLFxuXHRcdFx0XHRtYXhIZWlnaHQsXG5cdFx0XHRcdG1pblJhdGlvLFxuXHRcdFx0XHRhc3BlY3RSYXRpbyxcblx0XHRcdFx0cmV6ID0ge307XG5cblx0XHRcdGlmICghc2xpZGUuaXNMb2FkZWQgfHwgISRjb250ZW50IHx8ICEkY29udGVudC5sZW5ndGgpIHtcblx0XHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdFx0fVxuXG5cdFx0XHRtYXhXaWR0aCA9ICQuZmFuY3lib3guZ2V0VHJhbnNsYXRlKHNlbGYuJHJlZnMuc3RhZ2UpLndpZHRoO1xuXHRcdFx0bWF4SGVpZ2h0ID0gJC5mYW5jeWJveC5nZXRUcmFuc2xhdGUoc2VsZi4kcmVmcy5zdGFnZSkuaGVpZ2h0O1xuXG5cdFx0XHRtYXhXaWR0aCAtPVxuXHRcdFx0XHRwYXJzZUZsb2F0KCRzbGlkZS5jc3MoXCJwYWRkaW5nTGVmdFwiKSkgK1xuXHRcdFx0XHRwYXJzZUZsb2F0KCRzbGlkZS5jc3MoXCJwYWRkaW5nUmlnaHRcIikpICtcblx0XHRcdFx0cGFyc2VGbG9hdCgkY29udGVudC5jc3MoXCJtYXJnaW5MZWZ0XCIpKSArXG5cdFx0XHRcdHBhcnNlRmxvYXQoJGNvbnRlbnQuY3NzKFwibWFyZ2luUmlnaHRcIikpO1xuXG5cdFx0XHRtYXhIZWlnaHQgLT1cblx0XHRcdFx0cGFyc2VGbG9hdCgkc2xpZGUuY3NzKFwicGFkZGluZ1RvcFwiKSkgK1xuXHRcdFx0XHRwYXJzZUZsb2F0KCRzbGlkZS5jc3MoXCJwYWRkaW5nQm90dG9tXCIpKSArXG5cdFx0XHRcdHBhcnNlRmxvYXQoJGNvbnRlbnQuY3NzKFwibWFyZ2luVG9wXCIpKSArXG5cdFx0XHRcdHBhcnNlRmxvYXQoJGNvbnRlbnQuY3NzKFwibWFyZ2luQm90dG9tXCIpKTtcblxuXHRcdFx0aWYgKCF3aWR0aCB8fCAhaGVpZ2h0KSB7XG5cdFx0XHRcdHdpZHRoID0gbWF4V2lkdGg7XG5cdFx0XHRcdGhlaWdodCA9IG1heEhlaWdodDtcblx0XHRcdH1cblxuXHRcdFx0bWluUmF0aW8gPSBNYXRoLm1pbigxLCBtYXhXaWR0aCAvIHdpZHRoLCBtYXhIZWlnaHQgLyBoZWlnaHQpO1xuXG5cdFx0XHR3aWR0aCA9IG1pblJhdGlvICogd2lkdGg7XG5cdFx0XHRoZWlnaHQgPSBtaW5SYXRpbyAqIGhlaWdodDtcblxuXHRcdFx0Ly8gQWRqdXN0IHdpZHRoL2hlaWdodCB0byBwcmVjaXNlbHkgZml0IGludG8gY29udGFpbmVyXG5cdFx0XHRpZiAod2lkdGggPiBtYXhXaWR0aCAtIDAuNSkge1xuXHRcdFx0XHR3aWR0aCA9IG1heFdpZHRoO1xuXHRcdFx0fVxuXG5cdFx0XHRpZiAoaGVpZ2h0ID4gbWF4SGVpZ2h0IC0gMC41KSB7XG5cdFx0XHRcdGhlaWdodCA9IG1heEhlaWdodDtcblx0XHRcdH1cblxuXHRcdFx0aWYgKHNsaWRlLnR5cGUgPT09IFwiaW1hZ2VcIikge1xuXHRcdFx0XHRyZXoudG9wID0gTWF0aC5mbG9vcigobWF4SGVpZ2h0IC0gaGVpZ2h0KSAqIDAuNSkgKyBwYXJzZUZsb2F0KCRzbGlkZS5jc3MoXCJwYWRkaW5nVG9wXCIpKTtcblx0XHRcdFx0cmV6LmxlZnQgPSBNYXRoLmZsb29yKChtYXhXaWR0aCAtIHdpZHRoKSAqIDAuNSkgKyBwYXJzZUZsb2F0KCRzbGlkZS5jc3MoXCJwYWRkaW5nTGVmdFwiKSk7XG5cdFx0XHR9IGVsc2UgaWYgKHNsaWRlLmNvbnRlbnRUeXBlID09PSBcInZpZGVvXCIpIHtcblx0XHRcdFx0Ly8gRm9yY2UgYXNwZWN0IHJhdGlvIGZvciB0aGUgdmlkZW9cblx0XHRcdFx0Ly8gXCJJIHNheSB0aGUgd2hvbGUgd29ybGQgbXVzdCBsZWFybiBvZiBvdXIgcGVhY2VmdWwgd2F5c+KApiBieSBmb3JjZSFcIlxuXHRcdFx0XHRhc3BlY3RSYXRpbyA9IHNsaWRlLm9wdHMud2lkdGggJiYgc2xpZGUub3B0cy5oZWlnaHQgPyB3aWR0aCAvIGhlaWdodCA6IHNsaWRlLm9wdHMucmF0aW8gfHwgMTYgLyA5O1xuXG5cdFx0XHRcdGlmIChoZWlnaHQgPiB3aWR0aCAvIGFzcGVjdFJhdGlvKSB7XG5cdFx0XHRcdFx0aGVpZ2h0ID0gd2lkdGggLyBhc3BlY3RSYXRpbztcblx0XHRcdFx0fSBlbHNlIGlmICh3aWR0aCA+IGhlaWdodCAqIGFzcGVjdFJhdGlvKSB7XG5cdFx0XHRcdFx0d2lkdGggPSBoZWlnaHQgKiBhc3BlY3RSYXRpbztcblx0XHRcdFx0fVxuXHRcdFx0fVxuXG5cdFx0XHRyZXoud2lkdGggPSB3aWR0aDtcblx0XHRcdHJlei5oZWlnaHQgPSBoZWlnaHQ7XG5cblx0XHRcdHJldHVybiByZXo7XG5cdFx0fSxcblxuXHRcdC8vIFVwZGF0ZSBjb250ZW50IHNpemUgYW5kIHBvc2l0aW9uIGZvciBhbGwgc2xpZGVzXG5cdFx0Ly8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG5cdFx0dXBkYXRlOiBmdW5jdGlvbihlKSB7XG5cdFx0XHR2YXIgc2VsZiA9IHRoaXM7XG5cblx0XHRcdCQuZWFjaChzZWxmLnNsaWRlcywgZnVuY3Rpb24oa2V5LCBzbGlkZSkge1xuXHRcdFx0XHRzZWxmLnVwZGF0ZVNsaWRlKHNsaWRlLCBlKTtcblx0XHRcdH0pO1xuXHRcdH0sXG5cblx0XHQvLyBVcGRhdGUgc2xpZGUgY29udGVudCBwb3NpdGlvbiBhbmQgc2l6ZVxuXHRcdC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cblx0XHR1cGRhdGVTbGlkZTogZnVuY3Rpb24oc2xpZGUsIGUpIHtcblx0XHRcdHZhciBzZWxmID0gdGhpcyxcblx0XHRcdFx0JGNvbnRlbnQgPSBzbGlkZSAmJiBzbGlkZS4kY29udGVudCxcblx0XHRcdFx0d2lkdGggPSBzbGlkZS53aWR0aCB8fCBzbGlkZS5vcHRzLndpZHRoLFxuXHRcdFx0XHRoZWlnaHQgPSBzbGlkZS5oZWlnaHQgfHwgc2xpZGUub3B0cy5oZWlnaHQsXG5cdFx0XHRcdCRzbGlkZSA9IHNsaWRlLiRzbGlkZTtcblxuXHRcdFx0Ly8gRmlyc3QsIHByZXZlbnQgY2FwdGlvbiBvdmVybGFwLCBpZiBuZWVkZWRcblx0XHRcdHNlbGYuYWRqdXN0Q2FwdGlvbihzbGlkZSk7XG5cblx0XHRcdC8vIFRoZW4gcmVzaXplIGNvbnRlbnQgdG8gZml0IGluc2lkZSB0aGUgc2xpZGVcblx0XHRcdGlmICgkY29udGVudCAmJiAod2lkdGggfHwgaGVpZ2h0IHx8IHNsaWRlLmNvbnRlbnRUeXBlID09PSBcInZpZGVvXCIpICYmICFzbGlkZS5oYXNFcnJvcikge1xuXHRcdFx0XHQkLmZhbmN5Ym94LnN0b3AoJGNvbnRlbnQpO1xuXG5cdFx0XHRcdCQuZmFuY3lib3guc2V0VHJhbnNsYXRlKCRjb250ZW50LCBzZWxmLmdldEZpdFBvcyhzbGlkZSkpO1xuXG5cdFx0XHRcdGlmIChzbGlkZS5wb3MgPT09IHNlbGYuY3VyclBvcykge1xuXHRcdFx0XHRcdHNlbGYuaXNBbmltYXRpbmcgPSBmYWxzZTtcblxuXHRcdFx0XHRcdHNlbGYudXBkYXRlQ3Vyc29yKCk7XG5cdFx0XHRcdH1cblx0XHRcdH1cblxuXHRcdFx0Ly8gVGhlbiBzb21lIGFkanVzdG1lbnRzXG5cdFx0XHRzZWxmLmFkanVzdExheW91dChzbGlkZSk7XG5cblx0XHRcdGlmICgkc2xpZGUubGVuZ3RoKSB7XG5cdFx0XHRcdCRzbGlkZS50cmlnZ2VyKFwicmVmcmVzaFwiKTtcblxuXHRcdFx0XHRpZiAoc2xpZGUucG9zID09PSBzZWxmLmN1cnJQb3MpIHtcblx0XHRcdFx0XHRzZWxmLiRyZWZzLnRvb2xiYXJcblx0XHRcdFx0XHRcdC5hZGQoc2VsZi4kcmVmcy5uYXZpZ2F0aW9uLmZpbmQoXCIuZmFuY3lib3gtYnV0dG9uLS1hcnJvd19yaWdodFwiKSlcblx0XHRcdFx0XHRcdC50b2dnbGVDbGFzcyhcImNvbXBlbnNhdGUtZm9yLXNjcm9sbGJhclwiLCAkc2xpZGUuZ2V0KDApLnNjcm9sbEhlaWdodCA+ICRzbGlkZS5nZXQoMCkuY2xpZW50SGVpZ2h0KTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXG5cdFx0XHRzZWxmLnRyaWdnZXIoXCJvblVwZGF0ZVwiLCBzbGlkZSwgZSk7XG5cdFx0fSxcblxuXHRcdC8vIEhvcml6b250YWxseSBjZW50ZXIgc2xpZGVcblx0XHQvLyA9PT09PT09PT09PT09PT09PT09PT09PT09XG5cblx0XHRjZW50ZXJTbGlkZTogZnVuY3Rpb24oZHVyYXRpb24pIHtcblx0XHRcdHZhciBzZWxmID0gdGhpcyxcblx0XHRcdFx0Y3VycmVudCA9IHNlbGYuY3VycmVudCxcblx0XHRcdFx0JHNsaWRlID0gY3VycmVudC4kc2xpZGU7XG5cblx0XHRcdGlmIChzZWxmLmlzQ2xvc2luZyB8fCAhY3VycmVudCkge1xuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR9XG5cblx0XHRcdCRzbGlkZS5zaWJsaW5ncygpLmNzcyh7XG5cdFx0XHRcdHRyYW5zZm9ybTogXCJcIixcblx0XHRcdFx0b3BhY2l0eTogXCJcIlxuXHRcdFx0fSk7XG5cblx0XHRcdCRzbGlkZVxuXHRcdFx0XHQucGFyZW50KClcblx0XHRcdFx0LmNoaWxkcmVuKClcblx0XHRcdFx0LnJlbW92ZUNsYXNzKFwiZmFuY3lib3gtc2xpZGUtLXByZXZpb3VzIGZhbmN5Ym94LXNsaWRlLS1uZXh0XCIpO1xuXG5cdFx0XHQkLmZhbmN5Ym94LmFuaW1hdGUoXG5cdFx0XHRcdCRzbGlkZSxcblx0XHRcdFx0e1xuXHRcdFx0XHRcdHRvcDogMCxcblx0XHRcdFx0XHRsZWZ0OiAwLFxuXHRcdFx0XHRcdG9wYWNpdHk6IDFcblx0XHRcdFx0fSxcblx0XHRcdFx0ZHVyYXRpb24gPT09IHVuZGVmaW5lZCA/IDAgOiBkdXJhdGlvbixcblx0XHRcdFx0ZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0Ly8gQ2xlYW4gdXBcblx0XHRcdFx0XHQkc2xpZGUuY3NzKHtcblx0XHRcdFx0XHRcdHRyYW5zZm9ybTogXCJcIixcblx0XHRcdFx0XHRcdG9wYWNpdHk6IFwiXCJcblx0XHRcdFx0XHR9KTtcblxuXHRcdFx0XHRcdGlmICghY3VycmVudC5pc0NvbXBsZXRlKSB7XG5cdFx0XHRcdFx0XHRzZWxmLmNvbXBsZXRlKCk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9LFxuXHRcdFx0XHRmYWxzZVxuXHRcdFx0KTtcblx0XHR9LFxuXG5cdFx0Ly8gQ2hlY2sgaWYgY3VycmVudCBzbGlkZSBpcyBtb3ZlZCAoc3dpcGVkKVxuXHRcdC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuXHRcdGlzTW92ZWQ6IGZ1bmN0aW9uKHNsaWRlKSB7XG5cdFx0XHR2YXIgY3VycmVudCA9IHNsaWRlIHx8IHRoaXMuY3VycmVudCxcblx0XHRcdFx0c2xpZGVQb3MsXG5cdFx0XHRcdHN0YWdlUG9zO1xuXG5cdFx0XHRpZiAoIWN1cnJlbnQpIHtcblx0XHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdFx0fVxuXG5cdFx0XHRzdGFnZVBvcyA9ICQuZmFuY3lib3guZ2V0VHJhbnNsYXRlKHRoaXMuJHJlZnMuc3RhZ2UpO1xuXHRcdFx0c2xpZGVQb3MgPSAkLmZhbmN5Ym94LmdldFRyYW5zbGF0ZShjdXJyZW50LiRzbGlkZSk7XG5cblx0XHRcdHJldHVybiAoXG5cdFx0XHRcdCFjdXJyZW50LiRzbGlkZS5oYXNDbGFzcyhcImZhbmN5Ym94LWFuaW1hdGVkXCIpICYmXG5cdFx0XHRcdChNYXRoLmFicyhzbGlkZVBvcy50b3AgLSBzdGFnZVBvcy50b3ApID4gMC41IHx8IE1hdGguYWJzKHNsaWRlUG9zLmxlZnQgLSBzdGFnZVBvcy5sZWZ0KSA+IDAuNSlcblx0XHRcdCk7XG5cdFx0fSxcblxuXHRcdC8vIFVwZGF0ZSBjdXJzb3Igc3R5bGUgZGVwZW5kaW5nIGlmIGNvbnRlbnQgY2FuIGJlIHpvb21lZFxuXHRcdC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG5cdFx0dXBkYXRlQ3Vyc29yOiBmdW5jdGlvbihuZXh0V2lkdGgsIG5leHRIZWlnaHQpIHtcblx0XHRcdHZhciBzZWxmID0gdGhpcyxcblx0XHRcdFx0Y3VycmVudCA9IHNlbGYuY3VycmVudCxcblx0XHRcdFx0JGNvbnRhaW5lciA9IHNlbGYuJHJlZnMuY29udGFpbmVyLFxuXHRcdFx0XHRjYW5QYW4sXG5cdFx0XHRcdGlzWm9vbWFibGU7XG5cblx0XHRcdGlmICghY3VycmVudCB8fCBzZWxmLmlzQ2xvc2luZyB8fCAhc2VsZi5HdWVzdHVyZXMpIHtcblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0fVxuXG5cdFx0XHQkY29udGFpbmVyLnJlbW92ZUNsYXNzKFwiZmFuY3lib3gtaXMtem9vbWFibGUgZmFuY3lib3gtY2FuLXpvb21JbiBmYW5jeWJveC1jYW4tem9vbU91dCBmYW5jeWJveC1jYW4tc3dpcGUgZmFuY3lib3gtY2FuLXBhblwiKTtcblxuXHRcdFx0Y2FuUGFuID0gc2VsZi5jYW5QYW4obmV4dFdpZHRoLCBuZXh0SGVpZ2h0KTtcblxuXHRcdFx0aXNab29tYWJsZSA9IGNhblBhbiA/IHRydWUgOiBzZWxmLmlzWm9vbWFibGUoKTtcblxuXHRcdFx0JGNvbnRhaW5lci50b2dnbGVDbGFzcyhcImZhbmN5Ym94LWlzLXpvb21hYmxlXCIsIGlzWm9vbWFibGUpO1xuXG5cdFx0XHQkKFwiW2RhdGEtZmFuY3lib3gtem9vbV1cIikucHJvcChcImRpc2FibGVkXCIsICFpc1pvb21hYmxlKTtcblxuXHRcdFx0aWYgKGNhblBhbikge1xuXHRcdFx0XHQkY29udGFpbmVyLmFkZENsYXNzKFwiZmFuY3lib3gtY2FuLXBhblwiKTtcblx0XHRcdH0gZWxzZSBpZiAoXG5cdFx0XHRcdGlzWm9vbWFibGUgJiZcblx0XHRcdFx0KGN1cnJlbnQub3B0cy5jbGlja0NvbnRlbnQgPT09IFwiem9vbVwiIHx8ICgkLmlzRnVuY3Rpb24oY3VycmVudC5vcHRzLmNsaWNrQ29udGVudCkgJiYgY3VycmVudC5vcHRzLmNsaWNrQ29udGVudChjdXJyZW50KSA9PSBcInpvb21cIikpXG5cdFx0XHQpIHtcblx0XHRcdFx0JGNvbnRhaW5lci5hZGRDbGFzcyhcImZhbmN5Ym94LWNhbi16b29tSW5cIik7XG5cdFx0XHR9IGVsc2UgaWYgKGN1cnJlbnQub3B0cy50b3VjaCAmJiAoY3VycmVudC5vcHRzLnRvdWNoLnZlcnRpY2FsIHx8IHNlbGYuZ3JvdXAubGVuZ3RoID4gMSkgJiYgY3VycmVudC5jb250ZW50VHlwZSAhPT0gXCJ2aWRlb1wiKSB7XG5cdFx0XHRcdCRjb250YWluZXIuYWRkQ2xhc3MoXCJmYW5jeWJveC1jYW4tc3dpcGVcIik7XG5cdFx0XHR9XG5cdFx0fSxcblxuXHRcdC8vIENoZWNrIGlmIGN1cnJlbnQgc2xpZGUgaXMgem9vbWFibGVcblx0XHQvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cblx0XHRpc1pvb21hYmxlOiBmdW5jdGlvbigpIHtcblx0XHRcdHZhciBzZWxmID0gdGhpcyxcblx0XHRcdFx0Y3VycmVudCA9IHNlbGYuY3VycmVudCxcblx0XHRcdFx0Zml0UG9zO1xuXG5cdFx0XHQvLyBBc3N1bWUgdGhhdCBzbGlkZSBpcyB6b29tYWJsZSBpZjpcblx0XHRcdC8vICAgLSBpbWFnZSBpcyBzdGlsbCBsb2FkaW5nXG5cdFx0XHQvLyAgIC0gYWN0dWFsIHNpemUgb2YgdGhlIGltYWdlIGlzIHNtYWxsZXIgdGhhbiBhdmFpbGFibGUgYXJlYVxuXHRcdFx0aWYgKGN1cnJlbnQgJiYgIXNlbGYuaXNDbG9zaW5nICYmIGN1cnJlbnQudHlwZSA9PT0gXCJpbWFnZVwiICYmICFjdXJyZW50Lmhhc0Vycm9yKSB7XG5cdFx0XHRcdGlmICghY3VycmVudC5pc0xvYWRlZCkge1xuXHRcdFx0XHRcdHJldHVybiB0cnVlO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0Zml0UG9zID0gc2VsZi5nZXRGaXRQb3MoY3VycmVudCk7XG5cblx0XHRcdFx0aWYgKGZpdFBvcyAmJiAoY3VycmVudC53aWR0aCA+IGZpdFBvcy53aWR0aCB8fCBjdXJyZW50LmhlaWdodCA+IGZpdFBvcy5oZWlnaHQpKSB7XG5cdFx0XHRcdFx0cmV0dXJuIHRydWU7XG5cdFx0XHRcdH1cblx0XHRcdH1cblxuXHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdH0sXG5cblx0XHQvLyBDaGVjayBpZiBjdXJyZW50IGltYWdlIGRpbWVuc2lvbnMgYXJlIHNtYWxsZXIgdGhhbiBhY3R1YWxcblx0XHQvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuXHRcdGlzU2NhbGVkRG93bjogZnVuY3Rpb24obmV4dFdpZHRoLCBuZXh0SGVpZ2h0KSB7XG5cdFx0XHR2YXIgc2VsZiA9IHRoaXMsXG5cdFx0XHRcdHJleiA9IGZhbHNlLFxuXHRcdFx0XHRjdXJyZW50ID0gc2VsZi5jdXJyZW50LFxuXHRcdFx0XHQkY29udGVudCA9IGN1cnJlbnQuJGNvbnRlbnQ7XG5cblx0XHRcdGlmIChuZXh0V2lkdGggIT09IHVuZGVmaW5lZCAmJiBuZXh0SGVpZ2h0ICE9PSB1bmRlZmluZWQpIHtcblx0XHRcdFx0cmV6ID0gbmV4dFdpZHRoIDwgY3VycmVudC53aWR0aCAmJiBuZXh0SGVpZ2h0IDwgY3VycmVudC5oZWlnaHQ7XG5cdFx0XHR9IGVsc2UgaWYgKCRjb250ZW50KSB7XG5cdFx0XHRcdHJleiA9ICQuZmFuY3lib3guZ2V0VHJhbnNsYXRlKCRjb250ZW50KTtcblx0XHRcdFx0cmV6ID0gcmV6LndpZHRoIDwgY3VycmVudC53aWR0aCAmJiByZXouaGVpZ2h0IDwgY3VycmVudC5oZWlnaHQ7XG5cdFx0XHR9XG5cblx0XHRcdHJldHVybiByZXo7XG5cdFx0fSxcblxuXHRcdC8vIENoZWNrIGlmIGltYWdlIGRpbWVuc2lvbnMgZXhjZWVkIHBhcmVudCBlbGVtZW50XG5cdFx0Ly8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuXHRcdGNhblBhbjogZnVuY3Rpb24obmV4dFdpZHRoLCBuZXh0SGVpZ2h0KSB7XG5cdFx0XHR2YXIgc2VsZiA9IHRoaXMsXG5cdFx0XHRcdGN1cnJlbnQgPSBzZWxmLmN1cnJlbnQsXG5cdFx0XHRcdHBvcyA9IG51bGwsXG5cdFx0XHRcdHJleiA9IGZhbHNlO1xuXG5cdFx0XHRpZiAoY3VycmVudC50eXBlID09PSBcImltYWdlXCIgJiYgKGN1cnJlbnQuaXNDb21wbGV0ZSB8fCAobmV4dFdpZHRoICYmIG5leHRIZWlnaHQpKSAmJiAhY3VycmVudC5oYXNFcnJvcikge1xuXHRcdFx0XHRyZXogPSBzZWxmLmdldEZpdFBvcyhjdXJyZW50KTtcblxuXHRcdFx0XHRpZiAobmV4dFdpZHRoICE9PSB1bmRlZmluZWQgJiYgbmV4dEhlaWdodCAhPT0gdW5kZWZpbmVkKSB7XG5cdFx0XHRcdFx0cG9zID0ge3dpZHRoOiBuZXh0V2lkdGgsIGhlaWdodDogbmV4dEhlaWdodH07XG5cdFx0XHRcdH0gZWxzZSBpZiAoY3VycmVudC5pc0NvbXBsZXRlKSB7XG5cdFx0XHRcdFx0cG9zID0gJC5mYW5jeWJveC5nZXRUcmFuc2xhdGUoY3VycmVudC4kY29udGVudCk7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRpZiAocG9zICYmIHJleikge1xuXHRcdFx0XHRcdHJleiA9IE1hdGguYWJzKHBvcy53aWR0aCAtIHJlei53aWR0aCkgPiAxLjUgfHwgTWF0aC5hYnMocG9zLmhlaWdodCAtIHJlei5oZWlnaHQpID4gMS41O1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cblx0XHRcdHJldHVybiByZXo7XG5cdFx0fSxcblxuXHRcdC8vIExvYWQgY29udGVudCBpbnRvIHRoZSBzbGlkZVxuXHRcdC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG5cdFx0bG9hZFNsaWRlOiBmdW5jdGlvbihzbGlkZSkge1xuXHRcdFx0dmFyIHNlbGYgPSB0aGlzLFxuXHRcdFx0XHR0eXBlLFxuXHRcdFx0XHQkc2xpZGUsXG5cdFx0XHRcdGFqYXhMb2FkO1xuXG5cdFx0XHRpZiAoc2xpZGUuaXNMb2FkaW5nIHx8IHNsaWRlLmlzTG9hZGVkKSB7XG5cdFx0XHRcdHJldHVybjtcblx0XHRcdH1cblxuXHRcdFx0c2xpZGUuaXNMb2FkaW5nID0gdHJ1ZTtcblxuXHRcdFx0aWYgKHNlbGYudHJpZ2dlcihcImJlZm9yZUxvYWRcIiwgc2xpZGUpID09PSBmYWxzZSkge1xuXHRcdFx0XHRzbGlkZS5pc0xvYWRpbmcgPSBmYWxzZTtcblxuXHRcdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0XHR9XG5cblx0XHRcdHR5cGUgPSBzbGlkZS50eXBlO1xuXHRcdFx0JHNsaWRlID0gc2xpZGUuJHNsaWRlO1xuXG5cdFx0XHQkc2xpZGVcblx0XHRcdFx0Lm9mZihcInJlZnJlc2hcIilcblx0XHRcdFx0LnRyaWdnZXIoXCJvblJlc2V0XCIpXG5cdFx0XHRcdC5hZGRDbGFzcyhzbGlkZS5vcHRzLnNsaWRlQ2xhc3MpO1xuXG5cdFx0XHQvLyBDcmVhdGUgY29udGVudCBkZXBlbmRpbmcgb24gdGhlIHR5cGVcblx0XHRcdHN3aXRjaCAodHlwZSkge1xuXHRcdFx0XHRjYXNlIFwiaW1hZ2VcIjpcblx0XHRcdFx0XHRzZWxmLnNldEltYWdlKHNsaWRlKTtcblxuXHRcdFx0XHRcdGJyZWFrO1xuXG5cdFx0XHRcdGNhc2UgXCJpZnJhbWVcIjpcblx0XHRcdFx0XHRzZWxmLnNldElmcmFtZShzbGlkZSk7XG5cblx0XHRcdFx0XHRicmVhaztcblxuXHRcdFx0XHRjYXNlIFwiaHRtbFwiOlxuXHRcdFx0XHRcdHNlbGYuc2V0Q29udGVudChzbGlkZSwgc2xpZGUuc3JjIHx8IHNsaWRlLmNvbnRlbnQpO1xuXG5cdFx0XHRcdFx0YnJlYWs7XG5cblx0XHRcdFx0Y2FzZSBcInZpZGVvXCI6XG5cdFx0XHRcdFx0c2VsZi5zZXRDb250ZW50KFxuXHRcdFx0XHRcdFx0c2xpZGUsXG5cdFx0XHRcdFx0XHRzbGlkZS5vcHRzLnZpZGVvLnRwbFxuXHRcdFx0XHRcdFx0XHQucmVwbGFjZSgvXFx7XFx7c3JjXFx9XFx9L2dpLCBzbGlkZS5zcmMpXG5cdFx0XHRcdFx0XHRcdC5yZXBsYWNlKFwie3tmb3JtYXR9fVwiLCBzbGlkZS5vcHRzLnZpZGVvRm9ybWF0IHx8IHNsaWRlLm9wdHMudmlkZW8uZm9ybWF0IHx8IFwiXCIpXG5cdFx0XHRcdFx0XHRcdC5yZXBsYWNlKFwie3twb3N0ZXJ9fVwiLCBzbGlkZS50aHVtYiB8fCBcIlwiKVxuXHRcdFx0XHRcdCk7XG5cblx0XHRcdFx0XHRicmVhaztcblxuXHRcdFx0XHRjYXNlIFwiaW5saW5lXCI6XG5cdFx0XHRcdFx0aWYgKCQoc2xpZGUuc3JjKS5sZW5ndGgpIHtcblx0XHRcdFx0XHRcdHNlbGYuc2V0Q29udGVudChzbGlkZSwgJChzbGlkZS5zcmMpKTtcblx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0c2VsZi5zZXRFcnJvcihzbGlkZSk7XG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0YnJlYWs7XG5cblx0XHRcdFx0Y2FzZSBcImFqYXhcIjpcblx0XHRcdFx0XHRzZWxmLnNob3dMb2FkaW5nKHNsaWRlKTtcblxuXHRcdFx0XHRcdGFqYXhMb2FkID0gJC5hamF4KFxuXHRcdFx0XHRcdFx0JC5leHRlbmQoe30sIHNsaWRlLm9wdHMuYWpheC5zZXR0aW5ncywge1xuXHRcdFx0XHRcdFx0XHR1cmw6IHNsaWRlLnNyYyxcblx0XHRcdFx0XHRcdFx0c3VjY2VzczogZnVuY3Rpb24oZGF0YSwgdGV4dFN0YXR1cykge1xuXHRcdFx0XHRcdFx0XHRcdGlmICh0ZXh0U3RhdHVzID09PSBcInN1Y2Nlc3NcIikge1xuXHRcdFx0XHRcdFx0XHRcdFx0c2VsZi5zZXRDb250ZW50KHNsaWRlLCBkYXRhKTtcblx0XHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0XHRcdGVycm9yOiBmdW5jdGlvbihqcVhIUiwgdGV4dFN0YXR1cykge1xuXHRcdFx0XHRcdFx0XHRcdGlmIChqcVhIUiAmJiB0ZXh0U3RhdHVzICE9PSBcImFib3J0XCIpIHtcblx0XHRcdFx0XHRcdFx0XHRcdHNlbGYuc2V0RXJyb3Ioc2xpZGUpO1xuXHRcdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0fSlcblx0XHRcdFx0XHQpO1xuXG5cdFx0XHRcdFx0JHNsaWRlLm9uZShcIm9uUmVzZXRcIiwgZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0XHRhamF4TG9hZC5hYm9ydCgpO1xuXHRcdFx0XHRcdH0pO1xuXG5cdFx0XHRcdFx0YnJlYWs7XG5cblx0XHRcdFx0ZGVmYXVsdDpcblx0XHRcdFx0XHRzZWxmLnNldEVycm9yKHNsaWRlKTtcblxuXHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0fVxuXG5cdFx0XHRyZXR1cm4gdHJ1ZTtcblx0XHR9LFxuXG5cdFx0Ly8gVXNlIHRodW1ibmFpbCBpbWFnZSwgaWYgcG9zc2libGVcblx0XHQvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG5cdFx0c2V0SW1hZ2U6IGZ1bmN0aW9uKHNsaWRlKSB7XG5cdFx0XHR2YXIgc2VsZiA9IHRoaXMsXG5cdFx0XHRcdGdob3N0O1xuXG5cdFx0XHQvLyBDaGVjayBpZiBuZWVkIHRvIHNob3cgbG9hZGluZyBpY29uXG5cdFx0XHRzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xuXHRcdFx0XHR2YXIgJGltZyA9IHNsaWRlLiRpbWFnZTtcblxuXHRcdFx0XHRpZiAoIXNlbGYuaXNDbG9zaW5nICYmIHNsaWRlLmlzTG9hZGluZyAmJiAoISRpbWcgfHwgISRpbWcubGVuZ3RoIHx8ICEkaW1nWzBdLmNvbXBsZXRlKSAmJiAhc2xpZGUuaGFzRXJyb3IpIHtcblx0XHRcdFx0XHRzZWxmLnNob3dMb2FkaW5nKHNsaWRlKTtcblx0XHRcdFx0fVxuXHRcdFx0fSwgNTApO1xuXG5cdFx0XHQvL0NoZWNrIGlmIGltYWdlIGhhcyBzcmNzZXRcblx0XHRcdHNlbGYuY2hlY2tTcmNzZXQoc2xpZGUpO1xuXG5cdFx0XHQvLyBUaGlzIHdpbGwgYmUgd3JhcHBlciBjb250YWluaW5nIGJvdGggZ2hvc3QgYW5kIGFjdHVhbCBpbWFnZVxuXHRcdFx0c2xpZGUuJGNvbnRlbnQgPSAkKCc8ZGl2IGNsYXNzPVwiZmFuY3lib3gtY29udGVudFwiPjwvZGl2PicpXG5cdFx0XHRcdC5hZGRDbGFzcyhcImZhbmN5Ym94LWlzLWhpZGRlblwiKVxuXHRcdFx0XHQuYXBwZW5kVG8oc2xpZGUuJHNsaWRlLmFkZENsYXNzKFwiZmFuY3lib3gtc2xpZGUtLWltYWdlXCIpKTtcblxuXHRcdFx0Ly8gSWYgd2UgaGF2ZSBhIHRodW1ibmFpbCwgd2UgY2FuIGRpc3BsYXkgaXQgd2hpbGUgYWN0dWFsIGltYWdlIGlzIGxvYWRpbmdcblx0XHRcdC8vIFVzZXJzIHdpbGwgbm90IHN0YXJlIGF0IGJsYWNrIHNjcmVlbiBhbmQgYWN0dWFsIGltYWdlIHdpbGwgYXBwZWFyIGdyYWR1YWxseVxuXHRcdFx0aWYgKHNsaWRlLm9wdHMucHJlbG9hZCAhPT0gZmFsc2UgJiYgc2xpZGUub3B0cy53aWR0aCAmJiBzbGlkZS5vcHRzLmhlaWdodCAmJiBzbGlkZS50aHVtYikge1xuXHRcdFx0XHRzbGlkZS53aWR0aCA9IHNsaWRlLm9wdHMud2lkdGg7XG5cdFx0XHRcdHNsaWRlLmhlaWdodCA9IHNsaWRlLm9wdHMuaGVpZ2h0O1xuXG5cdFx0XHRcdGdob3N0ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImltZ1wiKTtcblxuXHRcdFx0XHRnaG9zdC5vbmVycm9yID0gZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0JCh0aGlzKS5yZW1vdmUoKTtcblxuXHRcdFx0XHRcdHNsaWRlLiRnaG9zdCA9IG51bGw7XG5cdFx0XHRcdH07XG5cblx0XHRcdFx0Z2hvc3Qub25sb2FkID0gZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0c2VsZi5hZnRlckxvYWQoc2xpZGUpO1xuXHRcdFx0XHR9O1xuXG5cdFx0XHRcdHNsaWRlLiRnaG9zdCA9ICQoZ2hvc3QpXG5cdFx0XHRcdFx0LmFkZENsYXNzKFwiZmFuY3lib3gtaW1hZ2VcIilcblx0XHRcdFx0XHQuYXBwZW5kVG8oc2xpZGUuJGNvbnRlbnQpXG5cdFx0XHRcdFx0LmF0dHIoXCJzcmNcIiwgc2xpZGUudGh1bWIpO1xuXHRcdFx0fVxuXG5cdFx0XHQvLyBTdGFydCBsb2FkaW5nIGFjdHVhbCBpbWFnZVxuXHRcdFx0c2VsZi5zZXRCaWdJbWFnZShzbGlkZSk7XG5cdFx0fSxcblxuXHRcdC8vIENoZWNrIGlmIGltYWdlIGhhcyBzcmNzZXQgYW5kIGdldCB0aGUgc291cmNlXG5cdFx0Ly8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblx0XHRjaGVja1NyY3NldDogZnVuY3Rpb24oc2xpZGUpIHtcblx0XHRcdHZhciBzcmNzZXQgPSBzbGlkZS5vcHRzLnNyY3NldCB8fCBzbGlkZS5vcHRzLmltYWdlLnNyY3NldCxcblx0XHRcdFx0Zm91bmQsXG5cdFx0XHRcdHRlbXAsXG5cdFx0XHRcdHB4UmF0aW8sXG5cdFx0XHRcdHdpbmRvd1dpZHRoO1xuXG5cdFx0XHQvLyBJZiB3ZSBoYXZlIFwic3Jjc2V0XCIsIHRoZW4gd2UgbmVlZCB0byBmaW5kIGZpcnN0IG1hdGNoaW5nIFwic3JjXCIgdmFsdWUuXG5cdFx0XHQvLyBUaGlzIGlzIG5lY2Vzc2FyeSwgYmVjYXVzZSB3aGVuIHlvdSBzZXQgYW4gc3JjIGF0dHJpYnV0ZSwgdGhlIGJyb3dzZXIgd2lsbCBwcmVsb2FkIHRoZSBpbWFnZVxuXHRcdFx0Ly8gYmVmb3JlIGFueSBqYXZhc2NyaXB0IG9yIGV2ZW4gQ1NTIGlzIGFwcGxpZWQuXG5cdFx0XHRpZiAoc3Jjc2V0KSB7XG5cdFx0XHRcdHB4UmF0aW8gPSB3aW5kb3cuZGV2aWNlUGl4ZWxSYXRpbyB8fCAxO1xuXHRcdFx0XHR3aW5kb3dXaWR0aCA9IHdpbmRvdy5pbm5lcldpZHRoICogcHhSYXRpbztcblxuXHRcdFx0XHR0ZW1wID0gc3Jjc2V0LnNwbGl0KFwiLFwiKS5tYXAoZnVuY3Rpb24oZWwpIHtcblx0XHRcdFx0XHR2YXIgcmV0ID0ge307XG5cblx0XHRcdFx0XHRlbC50cmltKClcblx0XHRcdFx0XHRcdC5zcGxpdCgvXFxzKy8pXG5cdFx0XHRcdFx0XHQuZm9yRWFjaChmdW5jdGlvbihlbCwgaSkge1xuXHRcdFx0XHRcdFx0XHR2YXIgdmFsdWUgPSBwYXJzZUludChlbC5zdWJzdHJpbmcoMCwgZWwubGVuZ3RoIC0gMSksIDEwKTtcblxuXHRcdFx0XHRcdFx0XHRpZiAoaSA9PT0gMCkge1xuXHRcdFx0XHRcdFx0XHRcdHJldHVybiAocmV0LnVybCA9IGVsKTtcblx0XHRcdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0XHRcdGlmICh2YWx1ZSkge1xuXHRcdFx0XHRcdFx0XHRcdHJldC52YWx1ZSA9IHZhbHVlO1xuXHRcdFx0XHRcdFx0XHRcdHJldC5wb3N0Zml4ID0gZWxbZWwubGVuZ3RoIC0gMV07XG5cdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdH0pO1xuXG5cdFx0XHRcdFx0cmV0dXJuIHJldDtcblx0XHRcdFx0fSk7XG5cblx0XHRcdFx0Ly8gU29ydCBieSB2YWx1ZVxuXHRcdFx0XHR0ZW1wLnNvcnQoZnVuY3Rpb24oYSwgYikge1xuXHRcdFx0XHRcdHJldHVybiBhLnZhbHVlIC0gYi52YWx1ZTtcblx0XHRcdFx0fSk7XG5cblx0XHRcdFx0Ly8gT2ssIG5vdyB3ZSBoYXZlIGFuIGFycmF5IG9mIGFsbCBzcmNzZXQgdmFsdWVzXG5cdFx0XHRcdGZvciAodmFyIGogPSAwOyBqIDwgdGVtcC5sZW5ndGg7IGorKykge1xuXHRcdFx0XHRcdHZhciBlbCA9IHRlbXBbal07XG5cblx0XHRcdFx0XHRpZiAoKGVsLnBvc3RmaXggPT09IFwid1wiICYmIGVsLnZhbHVlID49IHdpbmRvd1dpZHRoKSB8fCAoZWwucG9zdGZpeCA9PT0gXCJ4XCIgJiYgZWwudmFsdWUgPj0gcHhSYXRpbykpIHtcblx0XHRcdFx0XHRcdGZvdW5kID0gZWw7XG5cdFx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblxuXHRcdFx0XHQvLyBJZiBub3QgZm91bmQsIHRha2UgdGhlIGxhc3Qgb25lXG5cdFx0XHRcdGlmICghZm91bmQgJiYgdGVtcC5sZW5ndGgpIHtcblx0XHRcdFx0XHRmb3VuZCA9IHRlbXBbdGVtcC5sZW5ndGggLSAxXTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdGlmIChmb3VuZCkge1xuXHRcdFx0XHRcdHNsaWRlLnNyYyA9IGZvdW5kLnVybDtcblxuXHRcdFx0XHRcdC8vIElmIHdlIGhhdmUgZGVmYXVsdCB3aWR0aC9oZWlnaHQgdmFsdWVzLCB3ZSBjYW4gY2FsY3VsYXRlIGhlaWdodCBmb3IgbWF0Y2hpbmcgc291cmNlXG5cdFx0XHRcdFx0aWYgKHNsaWRlLndpZHRoICYmIHNsaWRlLmhlaWdodCAmJiBmb3VuZC5wb3N0Zml4ID09IFwid1wiKSB7XG5cdFx0XHRcdFx0XHRzbGlkZS5oZWlnaHQgPSAoc2xpZGUud2lkdGggLyBzbGlkZS5oZWlnaHQpICogZm91bmQudmFsdWU7XG5cdFx0XHRcdFx0XHRzbGlkZS53aWR0aCA9IGZvdW5kLnZhbHVlO1xuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdHNsaWRlLm9wdHMuc3Jjc2V0ID0gc3Jjc2V0O1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fSxcblxuXHRcdC8vIENyZWF0ZSBmdWxsLXNpemUgaW1hZ2Vcblx0XHQvLyA9PT09PT09PT09PT09PT09PT09PT09XG5cblx0XHRzZXRCaWdJbWFnZTogZnVuY3Rpb24oc2xpZGUpIHtcblx0XHRcdHZhciBzZWxmID0gdGhpcyxcblx0XHRcdFx0aW1nID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImltZ1wiKSxcblx0XHRcdFx0JGltZyA9ICQoaW1nKTtcblxuXHRcdFx0c2xpZGUuJGltYWdlID0gJGltZ1xuXHRcdFx0XHQub25lKFwiZXJyb3JcIiwgZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0c2VsZi5zZXRFcnJvcihzbGlkZSk7XG5cdFx0XHRcdH0pXG5cdFx0XHRcdC5vbmUoXCJsb2FkXCIsIGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdHZhciBzaXplcztcblxuXHRcdFx0XHRcdGlmICghc2xpZGUuJGdob3N0KSB7XG5cdFx0XHRcdFx0XHRzZWxmLnJlc29sdmVJbWFnZVNsaWRlU2l6ZShzbGlkZSwgdGhpcy5uYXR1cmFsV2lkdGgsIHRoaXMubmF0dXJhbEhlaWdodCk7XG5cblx0XHRcdFx0XHRcdHNlbGYuYWZ0ZXJMb2FkKHNsaWRlKTtcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRpZiAoc2VsZi5pc0Nsb3NpbmcpIHtcblx0XHRcdFx0XHRcdHJldHVybjtcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRpZiAoc2xpZGUub3B0cy5zcmNzZXQpIHtcblx0XHRcdFx0XHRcdHNpemVzID0gc2xpZGUub3B0cy5zaXplcztcblxuXHRcdFx0XHRcdFx0aWYgKCFzaXplcyB8fCBzaXplcyA9PT0gXCJhdXRvXCIpIHtcblx0XHRcdFx0XHRcdFx0c2l6ZXMgPVxuXHRcdFx0XHRcdFx0XHRcdChzbGlkZS53aWR0aCAvIHNsaWRlLmhlaWdodCA+IDEgJiYgJFcud2lkdGgoKSAvICRXLmhlaWdodCgpID4gMSA/IFwiMTAwXCIgOiBNYXRoLnJvdW5kKChzbGlkZS53aWR0aCAvIHNsaWRlLmhlaWdodCkgKiAxMDApKSArXG5cdFx0XHRcdFx0XHRcdFx0XCJ2d1wiO1xuXHRcdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0XHQkaW1nLmF0dHIoXCJzaXplc1wiLCBzaXplcykuYXR0cihcInNyY3NldFwiLCBzbGlkZS5vcHRzLnNyY3NldCk7XG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0Ly8gSGlkZSB0ZW1wb3JhcnkgaW1hZ2UgYWZ0ZXIgc29tZSBkZWxheVxuXHRcdFx0XHRcdGlmIChzbGlkZS4kZ2hvc3QpIHtcblx0XHRcdFx0XHRcdHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0XHRcdGlmIChzbGlkZS4kZ2hvc3QgJiYgIXNlbGYuaXNDbG9zaW5nKSB7XG5cdFx0XHRcdFx0XHRcdFx0c2xpZGUuJGdob3N0LmhpZGUoKTtcblx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0fSwgTWF0aC5taW4oMzAwLCBNYXRoLm1heCgxMDAwLCBzbGlkZS5oZWlnaHQgLyAxNjAwKSkpO1xuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdHNlbGYuaGlkZUxvYWRpbmcoc2xpZGUpO1xuXHRcdFx0XHR9KVxuXHRcdFx0XHQuYWRkQ2xhc3MoXCJmYW5jeWJveC1pbWFnZVwiKVxuXHRcdFx0XHQuYXR0cihcInNyY1wiLCBzbGlkZS5zcmMpXG5cdFx0XHRcdC5hcHBlbmRUbyhzbGlkZS4kY29udGVudCk7XG5cblx0XHRcdGlmICgoaW1nLmNvbXBsZXRlIHx8IGltZy5yZWFkeVN0YXRlID09IFwiY29tcGxldGVcIikgJiYgJGltZy5uYXR1cmFsV2lkdGggJiYgJGltZy5uYXR1cmFsSGVpZ2h0KSB7XG5cdFx0XHRcdCRpbWcudHJpZ2dlcihcImxvYWRcIik7XG5cdFx0XHR9IGVsc2UgaWYgKGltZy5lcnJvcikge1xuXHRcdFx0XHQkaW1nLnRyaWdnZXIoXCJlcnJvclwiKTtcblx0XHRcdH1cblx0XHR9LFxuXG5cdFx0Ly8gQ29tcHV0ZXMgdGhlIHNsaWRlIHNpemUgZnJvbSBpbWFnZSBzaXplIGFuZCBtYXhXaWR0aC9tYXhIZWlnaHRcblx0XHQvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG5cdFx0cmVzb2x2ZUltYWdlU2xpZGVTaXplOiBmdW5jdGlvbihzbGlkZSwgaW1nV2lkdGgsIGltZ0hlaWdodCkge1xuXHRcdFx0dmFyIG1heFdpZHRoID0gcGFyc2VJbnQoc2xpZGUub3B0cy53aWR0aCwgMTApLFxuXHRcdFx0XHRtYXhIZWlnaHQgPSBwYXJzZUludChzbGlkZS5vcHRzLmhlaWdodCwgMTApO1xuXG5cdFx0XHQvLyBTZXRzIHRoZSBkZWZhdWx0IHZhbHVlcyBmcm9tIHRoZSBpbWFnZVxuXHRcdFx0c2xpZGUud2lkdGggPSBpbWdXaWR0aDtcblx0XHRcdHNsaWRlLmhlaWdodCA9IGltZ0hlaWdodDtcblxuXHRcdFx0aWYgKG1heFdpZHRoID4gMCkge1xuXHRcdFx0XHRzbGlkZS53aWR0aCA9IG1heFdpZHRoO1xuXHRcdFx0XHRzbGlkZS5oZWlnaHQgPSBNYXRoLmZsb29yKChtYXhXaWR0aCAqIGltZ0hlaWdodCkgLyBpbWdXaWR0aCk7XG5cdFx0XHR9XG5cblx0XHRcdGlmIChtYXhIZWlnaHQgPiAwKSB7XG5cdFx0XHRcdHNsaWRlLndpZHRoID0gTWF0aC5mbG9vcigobWF4SGVpZ2h0ICogaW1nV2lkdGgpIC8gaW1nSGVpZ2h0KTtcblx0XHRcdFx0c2xpZGUuaGVpZ2h0ID0gbWF4SGVpZ2h0O1xuXHRcdFx0fVxuXHRcdH0sXG5cblx0XHQvLyBDcmVhdGUgaWZyYW1lIHdyYXBwZXIsIGlmcmFtZSBhbmQgYmluZGluZ3Ncblx0XHQvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuXHRcdHNldElmcmFtZTogZnVuY3Rpb24oc2xpZGUpIHtcblx0XHRcdHZhciBzZWxmID0gdGhpcyxcblx0XHRcdFx0b3B0cyA9IHNsaWRlLm9wdHMuaWZyYW1lLFxuXHRcdFx0XHQkc2xpZGUgPSBzbGlkZS4kc2xpZGUsXG5cdFx0XHRcdCRpZnJhbWU7XG5cblx0XHRcdC8vIEZpeCByZXNwb25zaXZlIGlmcmFtZXMgb24gaU9TIChhbG9uZyB3aXRoIGBwb3NpdGlvbjphYnNvbHV0ZTtgIGZvciBpZnJhbWUgZWxlbWVudClcblx0XHRcdGlmICgkLmZhbmN5Ym94LmlzTW9iaWxlKSB7XG5cdFx0XHRcdG9wdHMuY3NzLm92ZXJmbG93ID0gXCJzY3JvbGxcIjtcblx0XHRcdH1cblxuXHRcdFx0c2xpZGUuJGNvbnRlbnQgPSAkKCc8ZGl2IGNsYXNzPVwiZmFuY3lib3gtY29udGVudCcgKyAob3B0cy5wcmVsb2FkID8gXCIgZmFuY3lib3gtaXMtaGlkZGVuXCIgOiBcIlwiKSArICdcIj48L2Rpdj4nKVxuXHRcdFx0XHQuY3NzKG9wdHMuY3NzKVxuXHRcdFx0XHQuYXBwZW5kVG8oJHNsaWRlKTtcblxuXHRcdFx0JHNsaWRlLmFkZENsYXNzKFwiZmFuY3lib3gtc2xpZGUtLVwiICsgc2xpZGUuY29udGVudFR5cGUpO1xuXG5cdFx0XHRzbGlkZS4kaWZyYW1lID0gJGlmcmFtZSA9ICQob3B0cy50cGwucmVwbGFjZSgvXFx7cm5kXFx9L2csIG5ldyBEYXRlKCkuZ2V0VGltZSgpKSlcblx0XHRcdFx0LmF0dHIob3B0cy5hdHRyKVxuXHRcdFx0XHQuYXBwZW5kVG8oc2xpZGUuJGNvbnRlbnQpO1xuXG5cdFx0XHRpZiAob3B0cy5wcmVsb2FkKSB7XG5cdFx0XHRcdHNlbGYuc2hvd0xvYWRpbmcoc2xpZGUpO1xuXG5cdFx0XHRcdC8vIFVuZm9ydHVuYXRlbHksIGl0IGlzIG5vdCBhbHdheXMgcG9zc2libGUgdG8gZGV0ZXJtaW5lIGlmIGlmcmFtZSBpcyBzdWNjZXNzZnVsbHkgbG9hZGVkXG5cdFx0XHRcdC8vIChkdWUgdG8gYnJvd3NlciBzZWN1cml0eSBwb2xpY3kpXG5cblx0XHRcdFx0JGlmcmFtZS5vbihcImxvYWQuZmIgZXJyb3IuZmJcIiwgZnVuY3Rpb24oZSkge1xuXHRcdFx0XHRcdHRoaXMuaXNSZWFkeSA9IDE7XG5cblx0XHRcdFx0XHRzbGlkZS4kc2xpZGUudHJpZ2dlcihcInJlZnJlc2hcIik7XG5cblx0XHRcdFx0XHRzZWxmLmFmdGVyTG9hZChzbGlkZSk7XG5cdFx0XHRcdH0pO1xuXG5cdFx0XHRcdC8vIFJlY2FsY3VsYXRlIGlmcmFtZSBjb250ZW50IHNpemVcblx0XHRcdFx0Ly8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG5cdFx0XHRcdCRzbGlkZS5vbihcInJlZnJlc2guZmJcIiwgZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0dmFyICRjb250ZW50ID0gc2xpZGUuJGNvbnRlbnQsXG5cdFx0XHRcdFx0XHRmcmFtZVdpZHRoID0gb3B0cy5jc3Mud2lkdGgsXG5cdFx0XHRcdFx0XHRmcmFtZUhlaWdodCA9IG9wdHMuY3NzLmhlaWdodCxcblx0XHRcdFx0XHRcdCRjb250ZW50cyxcblx0XHRcdFx0XHRcdCRib2R5O1xuXG5cdFx0XHRcdFx0aWYgKCRpZnJhbWVbMF0uaXNSZWFkeSAhPT0gMSkge1xuXHRcdFx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdHRyeSB7XG5cdFx0XHRcdFx0XHQkY29udGVudHMgPSAkaWZyYW1lLmNvbnRlbnRzKCk7XG5cdFx0XHRcdFx0XHQkYm9keSA9ICRjb250ZW50cy5maW5kKFwiYm9keVwiKTtcblx0XHRcdFx0XHR9IGNhdGNoIChpZ25vcmUpIHt9XG5cblx0XHRcdFx0XHQvLyBDYWxjdWxhdGUgY29udG5ldCBkaW1lbnNpb25zIGlmIGl0IGlzIGFjY2Vzc2libGVcblx0XHRcdFx0XHRpZiAoJGJvZHkgJiYgJGJvZHkubGVuZ3RoICYmICRib2R5LmNoaWxkcmVuKCkubGVuZ3RoKSB7XG5cdFx0XHRcdFx0XHQvLyBBdm9pZCBzY3JvbGxpbmcgdG8gdG9wIChpZiBtdWx0aXBsZSBpbnN0YW5jZXMpXG5cdFx0XHRcdFx0XHQkc2xpZGUuY3NzKFwib3ZlcmZsb3dcIiwgXCJ2aXNpYmxlXCIpO1xuXG5cdFx0XHRcdFx0XHQkY29udGVudC5jc3Moe1xuXHRcdFx0XHRcdFx0XHR3aWR0aDogXCIxMDAlXCIsXG5cdFx0XHRcdFx0XHRcdFwibWF4LXdpZHRoXCI6IFwiMTAwJVwiLFxuXHRcdFx0XHRcdFx0XHRoZWlnaHQ6IFwiOTk5OXB4XCJcblx0XHRcdFx0XHRcdH0pO1xuXG5cdFx0XHRcdFx0XHRpZiAoZnJhbWVXaWR0aCA9PT0gdW5kZWZpbmVkKSB7XG5cdFx0XHRcdFx0XHRcdGZyYW1lV2lkdGggPSBNYXRoLmNlaWwoTWF0aC5tYXgoJGJvZHlbMF0uY2xpZW50V2lkdGgsICRib2R5Lm91dGVyV2lkdGgodHJ1ZSkpKTtcblx0XHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdFx0JGNvbnRlbnQuY3NzKFwid2lkdGhcIiwgZnJhbWVXaWR0aCA/IGZyYW1lV2lkdGggOiBcIlwiKS5jc3MoXCJtYXgtd2lkdGhcIiwgXCJcIik7XG5cblx0XHRcdFx0XHRcdGlmIChmcmFtZUhlaWdodCA9PT0gdW5kZWZpbmVkKSB7XG5cdFx0XHRcdFx0XHRcdGZyYW1lSGVpZ2h0ID0gTWF0aC5jZWlsKE1hdGgubWF4KCRib2R5WzBdLmNsaWVudEhlaWdodCwgJGJvZHkub3V0ZXJIZWlnaHQodHJ1ZSkpKTtcblx0XHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdFx0JGNvbnRlbnQuY3NzKFwiaGVpZ2h0XCIsIGZyYW1lSGVpZ2h0ID8gZnJhbWVIZWlnaHQgOiBcIlwiKTtcblxuXHRcdFx0XHRcdFx0JHNsaWRlLmNzcyhcIm92ZXJmbG93XCIsIFwiYXV0b1wiKTtcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHQkY29udGVudC5yZW1vdmVDbGFzcyhcImZhbmN5Ym94LWlzLWhpZGRlblwiKTtcblx0XHRcdFx0fSk7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRzZWxmLmFmdGVyTG9hZChzbGlkZSk7XG5cdFx0XHR9XG5cblx0XHRcdCRpZnJhbWUuYXR0cihcInNyY1wiLCBzbGlkZS5zcmMpO1xuXG5cdFx0XHQvLyBSZW1vdmUgaWZyYW1lIGlmIGNsb3Npbmcgb3IgY2hhbmdpbmcgZ2FsbGVyeSBpdGVtXG5cdFx0XHQkc2xpZGUub25lKFwib25SZXNldFwiLCBmdW5jdGlvbigpIHtcblx0XHRcdFx0Ly8gVGhpcyBoZWxwcyBJRSBub3QgdG8gdGhyb3cgZXJyb3JzIHdoZW4gY2xvc2luZ1xuXHRcdFx0XHR0cnkge1xuXHRcdFx0XHRcdCQodGhpcylcblx0XHRcdFx0XHRcdC5maW5kKFwiaWZyYW1lXCIpXG5cdFx0XHRcdFx0XHQuaGlkZSgpXG5cdFx0XHRcdFx0XHQudW5iaW5kKClcblx0XHRcdFx0XHRcdC5hdHRyKFwic3JjXCIsIFwiLy9hYm91dDpibGFua1wiKTtcblx0XHRcdFx0fSBjYXRjaCAoaWdub3JlKSB7fVxuXG5cdFx0XHRcdCQodGhpcylcblx0XHRcdFx0XHQub2ZmKFwicmVmcmVzaC5mYlwiKVxuXHRcdFx0XHRcdC5lbXB0eSgpO1xuXG5cdFx0XHRcdHNsaWRlLmlzTG9hZGVkID0gZmFsc2U7XG5cdFx0XHRcdHNsaWRlLmlzUmV2ZWFsZWQgPSBmYWxzZTtcblx0XHRcdH0pO1xuXHRcdH0sXG5cblx0XHQvLyBXcmFwIGFuZCBhcHBlbmQgY29udGVudCB0byB0aGUgc2xpZGVcblx0XHQvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG5cdFx0c2V0Q29udGVudDogZnVuY3Rpb24oc2xpZGUsIGNvbnRlbnQpIHtcblx0XHRcdHZhciBzZWxmID0gdGhpcztcblxuXHRcdFx0aWYgKHNlbGYuaXNDbG9zaW5nKSB7XG5cdFx0XHRcdHJldHVybjtcblx0XHRcdH1cblxuXHRcdFx0c2VsZi5oaWRlTG9hZGluZyhzbGlkZSk7XG5cblx0XHRcdGlmIChzbGlkZS4kY29udGVudCkge1xuXHRcdFx0XHQkLmZhbmN5Ym94LnN0b3Aoc2xpZGUuJGNvbnRlbnQpO1xuXHRcdFx0fVxuXG5cdFx0XHRzbGlkZS4kc2xpZGUuZW1wdHkoKTtcblxuXHRcdFx0Ly8gSWYgY29udGVudCBpcyBhIGpRdWVyeSBvYmplY3QsIHRoZW4gaXQgd2lsbCBiZSBtb3ZlZCB0byB0aGUgc2xpZGUuXG5cdFx0XHQvLyBUaGUgcGxhY2Vob2xkZXIgaXMgY3JlYXRlZCBzbyB3ZSB3aWxsIGtub3cgd2hlcmUgdG8gcHV0IGl0IGJhY2suXG5cdFx0XHRpZiAoaXNRdWVyeShjb250ZW50KSAmJiBjb250ZW50LnBhcmVudCgpLmxlbmd0aCkge1xuXHRcdFx0XHQvLyBNYWtlIHN1cmUgY29udGVudCBpcyBub3QgYWxyZWFkeSBtb3ZlZCB0byBmYW5jeUJveFxuXHRcdFx0XHRpZiAoY29udGVudC5oYXNDbGFzcyhcImZhbmN5Ym94LWNvbnRlbnRcIikgfHwgY29udGVudC5wYXJlbnQoKS5oYXNDbGFzcyhcImZhbmN5Ym94LWNvbnRlbnRcIikpIHtcblx0XHRcdFx0XHRjb250ZW50LnBhcmVudHMoXCIuZmFuY3lib3gtc2xpZGVcIikudHJpZ2dlcihcIm9uUmVzZXRcIik7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHQvLyBDcmVhdGUgdGVtcG9yYXJ5IGVsZW1lbnQgbWFya2luZyBvcmlnaW5hbCBwbGFjZSBvZiB0aGUgY29udGVudFxuXHRcdFx0XHRzbGlkZS4kcGxhY2Vob2xkZXIgPSAkKFwiPGRpdj5cIilcblx0XHRcdFx0XHQuaGlkZSgpXG5cdFx0XHRcdFx0Lmluc2VydEFmdGVyKGNvbnRlbnQpO1xuXG5cdFx0XHRcdC8vIE1ha2Ugc3VyZSBjb250ZW50IGlzIHZpc2libGVcblx0XHRcdFx0Y29udGVudC5jc3MoXCJkaXNwbGF5XCIsIFwiaW5saW5lLWJsb2NrXCIpO1xuXHRcdFx0fSBlbHNlIGlmICghc2xpZGUuaGFzRXJyb3IpIHtcblx0XHRcdFx0Ly8gSWYgY29udGVudCBpcyBqdXN0IGEgcGxhaW4gdGV4dCwgdHJ5IHRvIGNvbnZlcnQgaXQgdG8gaHRtbFxuXHRcdFx0XHRpZiAoJC50eXBlKGNvbnRlbnQpID09PSBcInN0cmluZ1wiKSB7XG5cdFx0XHRcdFx0Y29udGVudCA9ICQoXCI8ZGl2PlwiKVxuXHRcdFx0XHRcdFx0LmFwcGVuZCgkLnRyaW0oY29udGVudCkpXG5cdFx0XHRcdFx0XHQuY29udGVudHMoKTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdC8vIElmIFwiZmlsdGVyXCIgb3B0aW9uIGlzIHByb3ZpZGVkLCB0aGVuIGZpbHRlciBjb250ZW50XG5cdFx0XHRcdGlmIChzbGlkZS5vcHRzLmZpbHRlcikge1xuXHRcdFx0XHRcdGNvbnRlbnQgPSAkKFwiPGRpdj5cIilcblx0XHRcdFx0XHRcdC5odG1sKGNvbnRlbnQpXG5cdFx0XHRcdFx0XHQuZmluZChzbGlkZS5vcHRzLmZpbHRlcik7XG5cdFx0XHRcdH1cblx0XHRcdH1cblxuXHRcdFx0c2xpZGUuJHNsaWRlLm9uZShcIm9uUmVzZXRcIiwgZnVuY3Rpb24oKSB7XG5cdFx0XHRcdC8vIFBhdXNlIGFsbCBodG1sNSB2aWRlby9hdWRpb1xuXHRcdFx0XHQkKHRoaXMpXG5cdFx0XHRcdFx0LmZpbmQoXCJ2aWRlbyxhdWRpb1wiKVxuXHRcdFx0XHRcdC50cmlnZ2VyKFwicGF1c2VcIik7XG5cblx0XHRcdFx0Ly8gUHV0IGNvbnRlbnQgYmFja1xuXHRcdFx0XHRpZiAoc2xpZGUuJHBsYWNlaG9sZGVyKSB7XG5cdFx0XHRcdFx0c2xpZGUuJHBsYWNlaG9sZGVyLmFmdGVyKGNvbnRlbnQucmVtb3ZlQ2xhc3MoXCJmYW5jeWJveC1jb250ZW50XCIpLmhpZGUoKSkucmVtb3ZlKCk7XG5cblx0XHRcdFx0XHRzbGlkZS4kcGxhY2Vob2xkZXIgPSBudWxsO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0Ly8gUmVtb3ZlIGN1c3RvbSBjbG9zZSBidXR0b25cblx0XHRcdFx0aWYgKHNsaWRlLiRzbWFsbEJ0bikge1xuXHRcdFx0XHRcdHNsaWRlLiRzbWFsbEJ0bi5yZW1vdmUoKTtcblxuXHRcdFx0XHRcdHNsaWRlLiRzbWFsbEJ0biA9IG51bGw7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHQvLyBSZW1vdmUgY29udGVudCBhbmQgbWFyayBzbGlkZSBhcyBub3QgbG9hZGVkXG5cdFx0XHRcdGlmICghc2xpZGUuaGFzRXJyb3IpIHtcblx0XHRcdFx0XHQkKHRoaXMpLmVtcHR5KCk7XG5cblx0XHRcdFx0XHRzbGlkZS5pc0xvYWRlZCA9IGZhbHNlO1xuXHRcdFx0XHRcdHNsaWRlLmlzUmV2ZWFsZWQgPSBmYWxzZTtcblx0XHRcdFx0fVxuXHRcdFx0fSk7XG5cblx0XHRcdCQoY29udGVudCkuYXBwZW5kVG8oc2xpZGUuJHNsaWRlKTtcblxuXHRcdFx0aWYgKCQoY29udGVudCkuaXMoXCJ2aWRlbyxhdWRpb1wiKSkge1xuXHRcdFx0XHQkKGNvbnRlbnQpLmFkZENsYXNzKFwiZmFuY3lib3gtdmlkZW9cIik7XG5cblx0XHRcdFx0JChjb250ZW50KS53cmFwKFwiPGRpdj48L2Rpdj5cIik7XG5cblx0XHRcdFx0c2xpZGUuY29udGVudFR5cGUgPSBcInZpZGVvXCI7XG5cblx0XHRcdFx0c2xpZGUub3B0cy53aWR0aCA9IHNsaWRlLm9wdHMud2lkdGggfHwgJChjb250ZW50KS5hdHRyKFwid2lkdGhcIik7XG5cdFx0XHRcdHNsaWRlLm9wdHMuaGVpZ2h0ID0gc2xpZGUub3B0cy5oZWlnaHQgfHwgJChjb250ZW50KS5hdHRyKFwiaGVpZ2h0XCIpO1xuXHRcdFx0fVxuXG5cdFx0XHRzbGlkZS4kY29udGVudCA9IHNsaWRlLiRzbGlkZVxuXHRcdFx0XHQuY2hpbGRyZW4oKVxuXHRcdFx0XHQuZmlsdGVyKFwiZGl2LGZvcm0sbWFpbix2aWRlbyxhdWRpbyxhcnRpY2xlLC5mYW5jeWJveC1jb250ZW50XCIpXG5cdFx0XHRcdC5maXJzdCgpO1xuXG5cdFx0XHRzbGlkZS4kY29udGVudC5zaWJsaW5ncygpLmhpZGUoKTtcblxuXHRcdFx0Ly8gUmUtY2hlY2sgaWYgdGhlcmUgaXMgYSB2YWxpZCBjb250ZW50XG5cdFx0XHQvLyAoaW4gc29tZSBjYXNlcywgYWpheCByZXNwb25zZSBjYW4gY29udGFpbiB2YXJpb3VzIGVsZW1lbnRzIG9yIHBsYWluIHRleHQpXG5cdFx0XHRpZiAoIXNsaWRlLiRjb250ZW50Lmxlbmd0aCkge1xuXHRcdFx0XHRzbGlkZS4kY29udGVudCA9IHNsaWRlLiRzbGlkZVxuXHRcdFx0XHRcdC53cmFwSW5uZXIoXCI8ZGl2PjwvZGl2PlwiKVxuXHRcdFx0XHRcdC5jaGlsZHJlbigpXG5cdFx0XHRcdFx0LmZpcnN0KCk7XG5cdFx0XHR9XG5cblx0XHRcdHNsaWRlLiRjb250ZW50LmFkZENsYXNzKFwiZmFuY3lib3gtY29udGVudFwiKTtcblxuXHRcdFx0c2xpZGUuJHNsaWRlLmFkZENsYXNzKFwiZmFuY3lib3gtc2xpZGUtLVwiICsgc2xpZGUuY29udGVudFR5cGUpO1xuXG5cdFx0XHRzZWxmLmFmdGVyTG9hZChzbGlkZSk7XG5cdFx0fSxcblxuXHRcdC8vIERpc3BsYXkgZXJyb3IgbWVzc2FnZVxuXHRcdC8vID09PT09PT09PT09PT09PT09PT09PVxuXG5cdFx0c2V0RXJyb3I6IGZ1bmN0aW9uKHNsaWRlKSB7XG5cdFx0XHRzbGlkZS5oYXNFcnJvciA9IHRydWU7XG5cblx0XHRcdHNsaWRlLiRzbGlkZVxuXHRcdFx0XHQudHJpZ2dlcihcIm9uUmVzZXRcIilcblx0XHRcdFx0LnJlbW92ZUNsYXNzKFwiZmFuY3lib3gtc2xpZGUtLVwiICsgc2xpZGUuY29udGVudFR5cGUpXG5cdFx0XHRcdC5hZGRDbGFzcyhcImZhbmN5Ym94LXNsaWRlLS1lcnJvclwiKTtcblxuXHRcdFx0c2xpZGUuY29udGVudFR5cGUgPSBcImh0bWxcIjtcblxuXHRcdFx0dGhpcy5zZXRDb250ZW50KHNsaWRlLCB0aGlzLnRyYW5zbGF0ZShzbGlkZSwgc2xpZGUub3B0cy5lcnJvclRwbCkpO1xuXG5cdFx0XHRpZiAoc2xpZGUucG9zID09PSB0aGlzLmN1cnJQb3MpIHtcblx0XHRcdFx0dGhpcy5pc0FuaW1hdGluZyA9IGZhbHNlO1xuXHRcdFx0fVxuXHRcdH0sXG5cblx0XHQvLyBTaG93IGxvYWRpbmcgaWNvbiBpbnNpZGUgdGhlIHNsaWRlXG5cdFx0Ly8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG5cdFx0c2hvd0xvYWRpbmc6IGZ1bmN0aW9uKHNsaWRlKSB7XG5cdFx0XHR2YXIgc2VsZiA9IHRoaXM7XG5cblx0XHRcdHNsaWRlID0gc2xpZGUgfHwgc2VsZi5jdXJyZW50O1xuXG5cdFx0XHRpZiAoc2xpZGUgJiYgIXNsaWRlLiRzcGlubmVyKSB7XG5cdFx0XHRcdHNsaWRlLiRzcGlubmVyID0gJChzZWxmLnRyYW5zbGF0ZShzZWxmLCBzZWxmLm9wdHMuc3Bpbm5lclRwbCkpXG5cdFx0XHRcdFx0LmFwcGVuZFRvKHNsaWRlLiRzbGlkZSlcblx0XHRcdFx0XHQuaGlkZSgpXG5cdFx0XHRcdFx0LmZhZGVJbihcImZhc3RcIik7XG5cdFx0XHR9XG5cdFx0fSxcblxuXHRcdC8vIFJlbW92ZSBsb2FkaW5nIGljb24gZnJvbSB0aGUgc2xpZGVcblx0XHQvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cblx0XHRoaWRlTG9hZGluZzogZnVuY3Rpb24oc2xpZGUpIHtcblx0XHRcdHZhciBzZWxmID0gdGhpcztcblxuXHRcdFx0c2xpZGUgPSBzbGlkZSB8fCBzZWxmLmN1cnJlbnQ7XG5cblx0XHRcdGlmIChzbGlkZSAmJiBzbGlkZS4kc3Bpbm5lcikge1xuXHRcdFx0XHRzbGlkZS4kc3Bpbm5lci5zdG9wKCkucmVtb3ZlKCk7XG5cblx0XHRcdFx0ZGVsZXRlIHNsaWRlLiRzcGlubmVyO1xuXHRcdFx0fVxuXHRcdH0sXG5cblx0XHQvLyBBZGp1c3RtZW50cyBhZnRlciBzbGlkZSBjb250ZW50IGhhcyBiZWVuIGxvYWRlZFxuXHRcdC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cblx0XHRhZnRlckxvYWQ6IGZ1bmN0aW9uKHNsaWRlKSB7XG5cdFx0XHR2YXIgc2VsZiA9IHRoaXM7XG5cblx0XHRcdGlmIChzZWxmLmlzQ2xvc2luZykge1xuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR9XG5cblx0XHRcdHNsaWRlLmlzTG9hZGluZyA9IGZhbHNlO1xuXHRcdFx0c2xpZGUuaXNMb2FkZWQgPSB0cnVlO1xuXG5cdFx0XHRzZWxmLnRyaWdnZXIoXCJhZnRlckxvYWRcIiwgc2xpZGUpO1xuXG5cdFx0XHRzZWxmLmhpZGVMb2FkaW5nKHNsaWRlKTtcblxuXHRcdFx0Ly8gQWRkIHNtYWxsIGNsb3NlIGJ1dHRvblxuXHRcdFx0aWYgKHNsaWRlLm9wdHMuc21hbGxCdG4gJiYgKCFzbGlkZS4kc21hbGxCdG4gfHwgIXNsaWRlLiRzbWFsbEJ0bi5sZW5ndGgpKSB7XG5cdFx0XHRcdHNsaWRlLiRzbWFsbEJ0biA9ICQoc2VsZi50cmFuc2xhdGUoc2xpZGUsIHNsaWRlLm9wdHMuYnRuVHBsLnNtYWxsQnRuKSkuYXBwZW5kVG8oc2xpZGUuJGNvbnRlbnQpO1xuXHRcdFx0fVxuXG5cdFx0XHQvLyBEaXNhYmxlIHJpZ2h0IGNsaWNrXG5cdFx0XHRpZiAoc2xpZGUub3B0cy5wcm90ZWN0ICYmIHNsaWRlLiRjb250ZW50ICYmICFzbGlkZS5oYXNFcnJvcikge1xuXHRcdFx0XHRzbGlkZS4kY29udGVudC5vbihcImNvbnRleHRtZW51LmZiXCIsIGZ1bmN0aW9uKGUpIHtcblx0XHRcdFx0XHRpZiAoZS5idXR0b24gPT0gMikge1xuXHRcdFx0XHRcdFx0ZS5wcmV2ZW50RGVmYXVsdCgpO1xuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdHJldHVybiB0cnVlO1xuXHRcdFx0XHR9KTtcblxuXHRcdFx0XHQvLyBBZGQgZmFrZSBlbGVtZW50IG9uIHRvcCBvZiB0aGUgaW1hZ2Vcblx0XHRcdFx0Ly8gVGhpcyBtYWtlcyBhIGJpdCBoYXJkZXIgZm9yIHVzZXIgdG8gc2VsZWN0IGltYWdlXG5cdFx0XHRcdGlmIChzbGlkZS50eXBlID09PSBcImltYWdlXCIpIHtcblx0XHRcdFx0XHQkKCc8ZGl2IGNsYXNzPVwiZmFuY3lib3gtc3BhY2ViYWxsXCI+PC9kaXY+JykuYXBwZW5kVG8oc2xpZGUuJGNvbnRlbnQpO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cblx0XHRcdHNlbGYuYWRqdXN0Q2FwdGlvbihzbGlkZSk7XG5cblx0XHRcdHNlbGYuYWRqdXN0TGF5b3V0KHNsaWRlKTtcblxuXHRcdFx0aWYgKHNsaWRlLnBvcyA9PT0gc2VsZi5jdXJyUG9zKSB7XG5cdFx0XHRcdHNlbGYudXBkYXRlQ3Vyc29yKCk7XG5cdFx0XHR9XG5cblx0XHRcdHNlbGYucmV2ZWFsQ29udGVudChzbGlkZSk7XG5cdFx0fSxcblxuXHRcdC8vIFByZXZlbnQgY2FwdGlvbiBvdmVybGFwLFxuXHRcdC8vIGZpeCBjc3MgaW5jb25zaXN0ZW5jeSBhY3Jvc3MgYnJvd3NlcnNcblx0XHQvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cblx0XHRhZGp1c3RDYXB0aW9uOiBmdW5jdGlvbihzbGlkZSkge1xuXHRcdFx0dmFyIHNlbGYgPSB0aGlzLFxuXHRcdFx0XHRjdXJyZW50ID0gc2xpZGUgfHwgc2VsZi5jdXJyZW50LFxuXHRcdFx0XHRjYXB0aW9uID0gY3VycmVudC5vcHRzLmNhcHRpb24sXG5cdFx0XHRcdCRjYXB0aW9uID0gc2VsZi4kcmVmcy5jYXB0aW9uLFxuXHRcdFx0XHRjYXB0aW9uSCA9IGZhbHNlO1xuXG5cdFx0XHRpZiAoY3VycmVudC5vcHRzLnByZXZlbnRDYXB0aW9uT3ZlcmxhcCAmJiBjYXB0aW9uICYmIGNhcHRpb24ubGVuZ3RoKSB7XG5cdFx0XHRcdGlmIChjdXJyZW50LnBvcyAhPT0gc2VsZi5jdXJyUG9zKSB7XG5cdFx0XHRcdFx0JGNhcHRpb24gPSAkY2FwdGlvblxuXHRcdFx0XHRcdFx0LmNsb25lKClcblx0XHRcdFx0XHRcdC5lbXB0eSgpXG5cdFx0XHRcdFx0XHQuYXBwZW5kVG8oJGNhcHRpb24ucGFyZW50KCkpO1xuXG5cdFx0XHRcdFx0JGNhcHRpb24uaHRtbChjYXB0aW9uKTtcblxuXHRcdFx0XHRcdGNhcHRpb25IID0gJGNhcHRpb24ub3V0ZXJIZWlnaHQodHJ1ZSk7XG5cblx0XHRcdFx0XHQkY2FwdGlvbi5lbXB0eSgpLnJlbW92ZSgpO1xuXHRcdFx0XHR9IGVsc2UgaWYgKHNlbGYuJGNhcHRpb24pIHtcblx0XHRcdFx0XHRjYXB0aW9uSCA9IHNlbGYuJGNhcHRpb24ub3V0ZXJIZWlnaHQodHJ1ZSk7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRjdXJyZW50LiRzbGlkZS5jc3MoXCJwYWRkaW5nLWJvdHRvbVwiLCBjYXB0aW9uSCB8fCBcIlwiKTtcblx0XHRcdH1cblx0XHR9LFxuXG5cdFx0Ly8gU2ltcGxlIGhhY2sgdG8gZml4IGluY29uc2lzdGVuY3kgYWNyb3NzIGJyb3dzZXJzLCBkZXNjcmliZWQgaGVyZSAoYWZmZWN0cyBFZGdlLCB0b28pOlxuXHRcdC8vIGh0dHBzOi8vYnVnemlsbGEubW96aWxsYS5vcmcvc2hvd19idWcuY2dpP2lkPTc0ODUxOFxuXHRcdC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG5cdFx0YWRqdXN0TGF5b3V0OiBmdW5jdGlvbihzbGlkZSkge1xuXHRcdFx0dmFyIHNlbGYgPSB0aGlzLFxuXHRcdFx0XHRjdXJyZW50ID0gc2xpZGUgfHwgc2VsZi5jdXJyZW50LFxuXHRcdFx0XHRzY3JvbGxIZWlnaHQsXG5cdFx0XHRcdG1hcmdpbkJvdHRvbSxcblx0XHRcdFx0aW5saW5lUGFkZGluZyxcblx0XHRcdFx0YWN0dWFsUGFkZGluZztcblxuXHRcdFx0aWYgKGN1cnJlbnQuaXNMb2FkZWQgJiYgY3VycmVudC5vcHRzLmRpc2FibGVMYXlvdXRGaXggIT09IHRydWUpIHtcblx0XHRcdFx0Y3VycmVudC4kY29udGVudC5jc3MoXCJtYXJnaW4tYm90dG9tXCIsIFwiXCIpO1xuXG5cdFx0XHRcdC8vIElmIHdlIHdvdWxkIGFsd2F5cyBzZXQgbWFyZ2luLWJvdHRvbSBmb3IgdGhlIGNvbnRlbnQsXG5cdFx0XHRcdC8vIHRoZW4gaXQgd291bGQgcG90ZW50aWFsbHkgYnJlYWsgdmVydGljYWwgYWxpZ25cblx0XHRcdFx0aWYgKGN1cnJlbnQuJGNvbnRlbnQub3V0ZXJIZWlnaHQoKSA+IGN1cnJlbnQuJHNsaWRlLmhlaWdodCgpICsgMC41KSB7XG5cdFx0XHRcdFx0aW5saW5lUGFkZGluZyA9IGN1cnJlbnQuJHNsaWRlWzBdLnN0eWxlW1wicGFkZGluZy1ib3R0b21cIl07XG5cdFx0XHRcdFx0YWN0dWFsUGFkZGluZyA9IGN1cnJlbnQuJHNsaWRlLmNzcyhcInBhZGRpbmctYm90dG9tXCIpO1xuXG5cdFx0XHRcdFx0aWYgKHBhcnNlRmxvYXQoYWN0dWFsUGFkZGluZykgPiAwKSB7XG5cdFx0XHRcdFx0XHRzY3JvbGxIZWlnaHQgPSBjdXJyZW50LiRzbGlkZVswXS5zY3JvbGxIZWlnaHQ7XG5cblx0XHRcdFx0XHRcdGN1cnJlbnQuJHNsaWRlLmNzcyhcInBhZGRpbmctYm90dG9tXCIsIDApO1xuXG5cdFx0XHRcdFx0XHRpZiAoTWF0aC5hYnMoc2Nyb2xsSGVpZ2h0IC0gY3VycmVudC4kc2xpZGVbMF0uc2Nyb2xsSGVpZ2h0KSA8IDEpIHtcblx0XHRcdFx0XHRcdFx0bWFyZ2luQm90dG9tID0gYWN0dWFsUGFkZGluZztcblx0XHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdFx0Y3VycmVudC4kc2xpZGUuY3NzKFwicGFkZGluZy1ib3R0b21cIiwgaW5saW5lUGFkZGluZyk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cblx0XHRcdFx0Y3VycmVudC4kY29udGVudC5jc3MoXCJtYXJnaW4tYm90dG9tXCIsIG1hcmdpbkJvdHRvbSk7XG5cdFx0XHR9XG5cdFx0fSxcblxuXHRcdC8vIE1ha2UgY29udGVudCB2aXNpYmxlXG5cdFx0Ly8gVGhpcyBtZXRob2QgaXMgY2FsbGVkIHJpZ2h0IGFmdGVyIGNvbnRlbnQgaGFzIGJlZW4gbG9hZGVkIG9yXG5cdFx0Ly8gdXNlciBuYXZpZ2F0ZXMgZ2FsbGVyeSBhbmQgdHJhbnNpdGlvbiBzaG91bGQgc3RhcnRcblx0XHQvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuXHRcdHJldmVhbENvbnRlbnQ6IGZ1bmN0aW9uKHNsaWRlKSB7XG5cdFx0XHR2YXIgc2VsZiA9IHRoaXMsXG5cdFx0XHRcdCRzbGlkZSA9IHNsaWRlLiRzbGlkZSxcblx0XHRcdFx0ZW5kID0gZmFsc2UsXG5cdFx0XHRcdHN0YXJ0ID0gZmFsc2UsXG5cdFx0XHRcdGlzTW92ZWQgPSBzZWxmLmlzTW92ZWQoc2xpZGUpLFxuXHRcdFx0XHRpc1JldmVhbGVkID0gc2xpZGUuaXNSZXZlYWxlZCxcblx0XHRcdFx0ZWZmZWN0LFxuXHRcdFx0XHRlZmZlY3RDbGFzc05hbWUsXG5cdFx0XHRcdGR1cmF0aW9uLFxuXHRcdFx0XHRvcGFjaXR5O1xuXG5cdFx0XHRzbGlkZS5pc1JldmVhbGVkID0gdHJ1ZTtcblxuXHRcdFx0ZWZmZWN0ID0gc2xpZGUub3B0c1tzZWxmLmZpcnN0UnVuID8gXCJhbmltYXRpb25FZmZlY3RcIiA6IFwidHJhbnNpdGlvbkVmZmVjdFwiXTtcblx0XHRcdGR1cmF0aW9uID0gc2xpZGUub3B0c1tzZWxmLmZpcnN0UnVuID8gXCJhbmltYXRpb25EdXJhdGlvblwiIDogXCJ0cmFuc2l0aW9uRHVyYXRpb25cIl07XG5cblx0XHRcdGR1cmF0aW9uID0gcGFyc2VJbnQoc2xpZGUuZm9yY2VkRHVyYXRpb24gPT09IHVuZGVmaW5lZCA/IGR1cmF0aW9uIDogc2xpZGUuZm9yY2VkRHVyYXRpb24sIDEwKTtcblxuXHRcdFx0aWYgKGlzTW92ZWQgfHwgc2xpZGUucG9zICE9PSBzZWxmLmN1cnJQb3MgfHwgIWR1cmF0aW9uKSB7XG5cdFx0XHRcdGVmZmVjdCA9IGZhbHNlO1xuXHRcdFx0fVxuXG5cdFx0XHQvLyBDaGVjayBpZiBjYW4gem9vbVxuXHRcdFx0aWYgKGVmZmVjdCA9PT0gXCJ6b29tXCIpIHtcblx0XHRcdFx0aWYgKHNsaWRlLnBvcyA9PT0gc2VsZi5jdXJyUG9zICYmIGR1cmF0aW9uICYmIHNsaWRlLnR5cGUgPT09IFwiaW1hZ2VcIiAmJiAhc2xpZGUuaGFzRXJyb3IgJiYgKHN0YXJ0ID0gc2VsZi5nZXRUaHVtYlBvcyhzbGlkZSkpKSB7XG5cdFx0XHRcdFx0ZW5kID0gc2VsZi5nZXRGaXRQb3Moc2xpZGUpO1xuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdGVmZmVjdCA9IFwiZmFkZVwiO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cblx0XHRcdC8vIFpvb20gYW5pbWF0aW9uXG5cdFx0XHQvLyA9PT09PT09PT09PT09PVxuXHRcdFx0aWYgKGVmZmVjdCA9PT0gXCJ6b29tXCIpIHtcblx0XHRcdFx0c2VsZi5pc0FuaW1hdGluZyA9IHRydWU7XG5cblx0XHRcdFx0ZW5kLnNjYWxlWCA9IGVuZC53aWR0aCAvIHN0YXJ0LndpZHRoO1xuXHRcdFx0XHRlbmQuc2NhbGVZID0gZW5kLmhlaWdodCAvIHN0YXJ0LmhlaWdodDtcblxuXHRcdFx0XHQvLyBDaGVjayBpZiB3ZSBuZWVkIHRvIGFuaW1hdGUgb3BhY2l0eVxuXHRcdFx0XHRvcGFjaXR5ID0gc2xpZGUub3B0cy56b29tT3BhY2l0eTtcblxuXHRcdFx0XHRpZiAob3BhY2l0eSA9PSBcImF1dG9cIikge1xuXHRcdFx0XHRcdG9wYWNpdHkgPSBNYXRoLmFicyhzbGlkZS53aWR0aCAvIHNsaWRlLmhlaWdodCAtIHN0YXJ0LndpZHRoIC8gc3RhcnQuaGVpZ2h0KSA+IDAuMTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdGlmIChvcGFjaXR5KSB7XG5cdFx0XHRcdFx0c3RhcnQub3BhY2l0eSA9IDAuMTtcblx0XHRcdFx0XHRlbmQub3BhY2l0eSA9IDE7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHQvLyBEcmF3IGltYWdlIGF0IHN0YXJ0IHBvc2l0aW9uXG5cdFx0XHRcdCQuZmFuY3lib3guc2V0VHJhbnNsYXRlKHNsaWRlLiRjb250ZW50LnJlbW92ZUNsYXNzKFwiZmFuY3lib3gtaXMtaGlkZGVuXCIpLCBzdGFydCk7XG5cblx0XHRcdFx0Zm9yY2VSZWRyYXcoc2xpZGUuJGNvbnRlbnQpO1xuXG5cdFx0XHRcdC8vIFN0YXJ0IGFuaW1hdGlvblxuXHRcdFx0XHQkLmZhbmN5Ym94LmFuaW1hdGUoc2xpZGUuJGNvbnRlbnQsIGVuZCwgZHVyYXRpb24sIGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdHNlbGYuaXNBbmltYXRpbmcgPSBmYWxzZTtcblxuXHRcdFx0XHRcdHNlbGYuY29tcGxldGUoKTtcblx0XHRcdFx0fSk7XG5cblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0fVxuXG5cdFx0XHRzZWxmLnVwZGF0ZVNsaWRlKHNsaWRlKTtcblxuXHRcdFx0Ly8gU2ltcGx5IHNob3cgY29udGVudCBpZiBubyBlZmZlY3Rcblx0XHRcdC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cdFx0XHRpZiAoIWVmZmVjdCkge1xuXHRcdFx0XHRzbGlkZS4kY29udGVudC5yZW1vdmVDbGFzcyhcImZhbmN5Ym94LWlzLWhpZGRlblwiKTtcblxuXHRcdFx0XHRpZiAoIWlzUmV2ZWFsZWQgJiYgaXNNb3ZlZCAmJiBzbGlkZS50eXBlID09PSBcImltYWdlXCIgJiYgIXNsaWRlLmhhc0Vycm9yKSB7XG5cdFx0XHRcdFx0c2xpZGUuJGNvbnRlbnQuaGlkZSgpLmZhZGVJbihcImZhc3RcIik7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRpZiAoc2xpZGUucG9zID09PSBzZWxmLmN1cnJQb3MpIHtcblx0XHRcdFx0XHRzZWxmLmNvbXBsZXRlKCk7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR9XG5cblx0XHRcdC8vIFByZXBhcmUgZm9yIENTUyB0cmFuc2l0b25cblx0XHRcdC8vID09PT09PT09PT09PT09PT09PT09PT09PT1cblx0XHRcdCQuZmFuY3lib3guc3RvcCgkc2xpZGUpO1xuXG5cdFx0XHQvL2VmZmVjdENsYXNzTmFtZSA9IFwiZmFuY3lib3gtYW5pbWF0ZWQgZmFuY3lib3gtc2xpZGUtLVwiICsgKHNsaWRlLnBvcyA+PSBzZWxmLnByZXZQb3MgPyBcIm5leHRcIiA6IFwicHJldmlvdXNcIikgKyBcIiBmYW5jeWJveC1meC1cIiArIGVmZmVjdDtcblx0XHRcdGVmZmVjdENsYXNzTmFtZSA9IFwiZmFuY3lib3gtc2xpZGUtLVwiICsgKHNsaWRlLnBvcyA+PSBzZWxmLnByZXZQb3MgPyBcIm5leHRcIiA6IFwicHJldmlvdXNcIikgKyBcIiBmYW5jeWJveC1hbmltYXRlZCBmYW5jeWJveC1meC1cIiArIGVmZmVjdDtcblxuXHRcdFx0JHNsaWRlLmFkZENsYXNzKGVmZmVjdENsYXNzTmFtZSkucmVtb3ZlQ2xhc3MoXCJmYW5jeWJveC1zbGlkZS0tY3VycmVudFwiKTsgLy8uYWRkQ2xhc3MoZWZmZWN0Q2xhc3NOYW1lKTtcblxuXHRcdFx0c2xpZGUuJGNvbnRlbnQucmVtb3ZlQ2xhc3MoXCJmYW5jeWJveC1pcy1oaWRkZW5cIik7XG5cblx0XHRcdC8vIEZvcmNlIHJlZmxvd1xuXHRcdFx0Zm9yY2VSZWRyYXcoJHNsaWRlKTtcblxuXHRcdFx0aWYgKHNsaWRlLnR5cGUgIT09IFwiaW1hZ2VcIikge1xuXHRcdFx0XHRzbGlkZS4kY29udGVudC5oaWRlKCkuc2hvdygwKTtcblx0XHRcdH1cblxuXHRcdFx0JC5mYW5jeWJveC5hbmltYXRlKFxuXHRcdFx0XHQkc2xpZGUsXG5cdFx0XHRcdFwiZmFuY3lib3gtc2xpZGUtLWN1cnJlbnRcIixcblx0XHRcdFx0ZHVyYXRpb24sXG5cdFx0XHRcdGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdCRzbGlkZS5yZW1vdmVDbGFzcyhlZmZlY3RDbGFzc05hbWUpLmNzcyh7XG5cdFx0XHRcdFx0XHR0cmFuc2Zvcm06IFwiXCIsXG5cdFx0XHRcdFx0XHRvcGFjaXR5OiBcIlwiXG5cdFx0XHRcdFx0fSk7XG5cblx0XHRcdFx0XHRpZiAoc2xpZGUucG9zID09PSBzZWxmLmN1cnJQb3MpIHtcblx0XHRcdFx0XHRcdHNlbGYuY29tcGxldGUoKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH0sXG5cdFx0XHRcdHRydWVcblx0XHRcdCk7XG5cdFx0fSxcblxuXHRcdC8vIENoZWNrIGlmIHdlIGNhbiBhbmQgaGF2ZSB0byB6b29tIGZyb20gdGh1bWJuYWlsXG5cdFx0Ly89PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuXHRcdGdldFRodW1iUG9zOiBmdW5jdGlvbihzbGlkZSkge1xuXHRcdFx0dmFyIHJleiA9IGZhbHNlLFxuXHRcdFx0XHQkdGh1bWIgPSBzbGlkZS4kdGh1bWIsXG5cdFx0XHRcdHRodW1iUG9zLFxuXHRcdFx0XHRidHcsXG5cdFx0XHRcdGJydyxcblx0XHRcdFx0YmJ3LFxuXHRcdFx0XHRibHc7XG5cblx0XHRcdGlmICghJHRodW1iIHx8ICFpblZpZXdwb3J0KCR0aHVtYlswXSkpIHtcblx0XHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdFx0fVxuXG5cdFx0XHR0aHVtYlBvcyA9ICQuZmFuY3lib3guZ2V0VHJhbnNsYXRlKCR0aHVtYik7XG5cblx0XHRcdGJ0dyA9IHBhcnNlRmxvYXQoJHRodW1iLmNzcyhcImJvcmRlci10b3Atd2lkdGhcIikgfHwgMCk7XG5cdFx0XHRicncgPSBwYXJzZUZsb2F0KCR0aHVtYi5jc3MoXCJib3JkZXItcmlnaHQtd2lkdGhcIikgfHwgMCk7XG5cdFx0XHRiYncgPSBwYXJzZUZsb2F0KCR0aHVtYi5jc3MoXCJib3JkZXItYm90dG9tLXdpZHRoXCIpIHx8IDApO1xuXHRcdFx0Ymx3ID0gcGFyc2VGbG9hdCgkdGh1bWIuY3NzKFwiYm9yZGVyLWxlZnQtd2lkdGhcIikgfHwgMCk7XG5cblx0XHRcdHJleiA9IHtcblx0XHRcdFx0dG9wOiB0aHVtYlBvcy50b3AgKyBidHcsXG5cdFx0XHRcdGxlZnQ6IHRodW1iUG9zLmxlZnQgKyBibHcsXG5cdFx0XHRcdHdpZHRoOiB0aHVtYlBvcy53aWR0aCAtIGJydyAtIGJsdyxcblx0XHRcdFx0aGVpZ2h0OiB0aHVtYlBvcy5oZWlnaHQgLSBidHcgLSBiYncsXG5cdFx0XHRcdHNjYWxlWDogMSxcblx0XHRcdFx0c2NhbGVZOiAxXG5cdFx0XHR9O1xuXG5cdFx0XHRyZXR1cm4gdGh1bWJQb3Mud2lkdGggPiAwICYmIHRodW1iUG9zLmhlaWdodCA+IDAgPyByZXogOiBmYWxzZTtcblx0XHR9LFxuXG5cdFx0Ly8gRmluYWwgYWRqdXN0bWVudHMgYWZ0ZXIgY3VycmVudCBnYWxsZXJ5IGl0ZW0gaXMgbW92ZWQgdG8gcG9zaXRpb25cblx0XHQvLyBhbmQgaXRgcyBjb250ZW50IGlzIGxvYWRlZFxuXHRcdC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG5cdFx0Y29tcGxldGU6IGZ1bmN0aW9uKCkge1xuXHRcdFx0dmFyIHNlbGYgPSB0aGlzLFxuXHRcdFx0XHRjdXJyZW50ID0gc2VsZi5jdXJyZW50LFxuXHRcdFx0XHRzbGlkZXMgPSB7fSxcblx0XHRcdFx0JGVsO1xuXG5cdFx0XHRpZiAoc2VsZi5pc01vdmVkKCkgfHwgIWN1cnJlbnQuaXNMb2FkZWQpIHtcblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0fVxuXG5cdFx0XHRpZiAoIWN1cnJlbnQuaXNDb21wbGV0ZSkge1xuXHRcdFx0XHRjdXJyZW50LmlzQ29tcGxldGUgPSB0cnVlO1xuXG5cdFx0XHRcdGN1cnJlbnQuJHNsaWRlLnNpYmxpbmdzKCkudHJpZ2dlcihcIm9uUmVzZXRcIik7XG5cblx0XHRcdFx0c2VsZi5wcmVsb2FkKFwiaW5saW5lXCIpO1xuXG5cdFx0XHRcdC8vIFRyaWdnZXIgYW55IENTUyB0cmFuc2l0b24gaW5zaWRlIHRoZSBzbGlkZVxuXHRcdFx0XHRmb3JjZVJlZHJhdyhjdXJyZW50LiRzbGlkZSk7XG5cblx0XHRcdFx0Y3VycmVudC4kc2xpZGUuYWRkQ2xhc3MoXCJmYW5jeWJveC1zbGlkZS0tY29tcGxldGVcIik7XG5cblx0XHRcdFx0Ly8gUmVtb3ZlIHVubmVjZXNzYXJ5IHNsaWRlc1xuXHRcdFx0XHQkLmVhY2goc2VsZi5zbGlkZXMsIGZ1bmN0aW9uKGtleSwgc2xpZGUpIHtcblx0XHRcdFx0XHRpZiAoc2xpZGUucG9zID49IHNlbGYuY3VyclBvcyAtIDEgJiYgc2xpZGUucG9zIDw9IHNlbGYuY3VyclBvcyArIDEpIHtcblx0XHRcdFx0XHRcdHNsaWRlc1tzbGlkZS5wb3NdID0gc2xpZGU7XG5cdFx0XHRcdFx0fSBlbHNlIGlmIChzbGlkZSkge1xuXHRcdFx0XHRcdFx0JC5mYW5jeWJveC5zdG9wKHNsaWRlLiRzbGlkZSk7XG5cblx0XHRcdFx0XHRcdHNsaWRlLiRzbGlkZS5vZmYoKS5yZW1vdmUoKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH0pO1xuXG5cdFx0XHRcdHNlbGYuc2xpZGVzID0gc2xpZGVzO1xuXHRcdFx0fVxuXG5cdFx0XHRzZWxmLmlzQW5pbWF0aW5nID0gZmFsc2U7XG5cblx0XHRcdHNlbGYudXBkYXRlQ3Vyc29yKCk7XG5cblx0XHRcdHNlbGYudHJpZ2dlcihcImFmdGVyU2hvd1wiKTtcblxuXHRcdFx0Ly8gQXV0b3BsYXkgZmlyc3QgaHRtbDUgdmlkZW8vYXVkaW9cblx0XHRcdGlmICghIWN1cnJlbnQub3B0cy52aWRlby5hdXRvU3RhcnQpIHtcblx0XHRcdFx0Y3VycmVudC4kc2xpZGVcblx0XHRcdFx0XHQuZmluZChcInZpZGVvLGF1ZGlvXCIpXG5cdFx0XHRcdFx0LmZpbHRlcihcIjp2aXNpYmxlOmZpcnN0XCIpXG5cdFx0XHRcdFx0LnRyaWdnZXIoXCJwbGF5XCIpXG5cdFx0XHRcdFx0Lm9uZShcImVuZGVkXCIsIGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdFx0aWYgKHRoaXMud2Via2l0RXhpdEZ1bGxzY3JlZW4pIHtcblx0XHRcdFx0XHRcdFx0dGhpcy53ZWJraXRFeGl0RnVsbHNjcmVlbigpO1xuXHRcdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0XHRzZWxmLm5leHQoKTtcblx0XHRcdFx0XHR9KTtcblx0XHRcdH1cblxuXHRcdFx0Ly8gVHJ5IHRvIGZvY3VzIG9uIHRoZSBmaXJzdCBmb2N1c2FibGUgZWxlbWVudFxuXHRcdFx0aWYgKGN1cnJlbnQub3B0cy5hdXRvRm9jdXMgJiYgY3VycmVudC5jb250ZW50VHlwZSA9PT0gXCJodG1sXCIpIHtcblx0XHRcdFx0Ly8gTG9vayBmb3IgdGhlIGZpcnN0IGlucHV0IHdpdGggYXV0b2ZvY3VzIGF0dHJpYnV0ZVxuXHRcdFx0XHQkZWwgPSBjdXJyZW50LiRjb250ZW50LmZpbmQoXCJpbnB1dFthdXRvZm9jdXNdOmVuYWJsZWQ6dmlzaWJsZTpmaXJzdFwiKTtcblxuXHRcdFx0XHRpZiAoJGVsLmxlbmd0aCkge1xuXHRcdFx0XHRcdCRlbC50cmlnZ2VyKFwiZm9jdXNcIik7XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0c2VsZi5mb2N1cyhudWxsLCB0cnVlKTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXG5cdFx0XHQvLyBBdm9pZCBqdW1waW5nXG5cdFx0XHRjdXJyZW50LiRzbGlkZS5zY3JvbGxUb3AoMCkuc2Nyb2xsTGVmdCgwKTtcblx0XHR9LFxuXG5cdFx0Ly8gUHJlbG9hZCBuZXh0IGFuZCBwcmV2aW91cyBzbGlkZXNcblx0XHQvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG5cdFx0cHJlbG9hZDogZnVuY3Rpb24odHlwZSkge1xuXHRcdFx0dmFyIHNlbGYgPSB0aGlzLFxuXHRcdFx0XHRwcmV2LFxuXHRcdFx0XHRuZXh0O1xuXG5cdFx0XHRpZiAoc2VsZi5ncm91cC5sZW5ndGggPCAyKSB7XG5cdFx0XHRcdHJldHVybjtcblx0XHRcdH1cblxuXHRcdFx0bmV4dCA9IHNlbGYuc2xpZGVzW3NlbGYuY3VyclBvcyArIDFdO1xuXHRcdFx0cHJldiA9IHNlbGYuc2xpZGVzW3NlbGYuY3VyclBvcyAtIDFdO1xuXG5cdFx0XHRpZiAocHJldiAmJiBwcmV2LnR5cGUgPT09IHR5cGUpIHtcblx0XHRcdFx0c2VsZi5sb2FkU2xpZGUocHJldik7XG5cdFx0XHR9XG5cblx0XHRcdGlmIChuZXh0ICYmIG5leHQudHlwZSA9PT0gdHlwZSkge1xuXHRcdFx0XHRzZWxmLmxvYWRTbGlkZShuZXh0KTtcblx0XHRcdH1cblx0XHR9LFxuXG5cdFx0Ly8gVHJ5IHRvIGZpbmQgYW5kIGZvY3VzIG9uIHRoZSBmaXJzdCBmb2N1c2FibGUgZWxlbWVudFxuXHRcdC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuXHRcdGZvY3VzOiBmdW5jdGlvbihlLCBmaXJzdFJ1bikge1xuXHRcdFx0dmFyIHNlbGYgPSB0aGlzLFxuXHRcdFx0XHRmb2N1c2FibGVTdHIgPSBbXG5cdFx0XHRcdFx0XCJhW2hyZWZdXCIsXG5cdFx0XHRcdFx0XCJhcmVhW2hyZWZdXCIsXG5cdFx0XHRcdFx0J2lucHV0Om5vdChbZGlzYWJsZWRdKTpub3QoW3R5cGU9XCJoaWRkZW5cIl0pOm5vdChbYXJpYS1oaWRkZW5dKScsXG5cdFx0XHRcdFx0XCJzZWxlY3Q6bm90KFtkaXNhYmxlZF0pOm5vdChbYXJpYS1oaWRkZW5dKVwiLFxuXHRcdFx0XHRcdFwidGV4dGFyZWE6bm90KFtkaXNhYmxlZF0pOm5vdChbYXJpYS1oaWRkZW5dKVwiLFxuXHRcdFx0XHRcdFwiYnV0dG9uOm5vdChbZGlzYWJsZWRdKTpub3QoW2FyaWEtaGlkZGVuXSlcIixcblx0XHRcdFx0XHRcImlmcmFtZVwiLFxuXHRcdFx0XHRcdFwib2JqZWN0XCIsXG5cdFx0XHRcdFx0XCJlbWJlZFwiLFxuXHRcdFx0XHRcdFwiW2NvbnRlbnRlZGl0YWJsZV1cIixcblx0XHRcdFx0XHQnW3RhYmluZGV4XTpub3QoW3RhYmluZGV4Xj1cIi1cIl0pJ1xuXHRcdFx0XHRdLmpvaW4oXCIsXCIpLFxuXHRcdFx0XHRmb2N1c2FibGVJdGVtcyxcblx0XHRcdFx0Zm9jdXNlZEl0ZW1JbmRleDtcblxuXHRcdFx0aWYgKHNlbGYuaXNDbG9zaW5nKSB7XG5cdFx0XHRcdHJldHVybjtcblx0XHRcdH1cblxuXHRcdFx0aWYgKGUgfHwgIXNlbGYuY3VycmVudCB8fCAhc2VsZi5jdXJyZW50LmlzQ29tcGxldGUpIHtcblx0XHRcdFx0Ly8gRm9jdXMgb24gYW55IGVsZW1lbnQgaW5zaWRlIGZhbmN5Ym94XG5cdFx0XHRcdGZvY3VzYWJsZUl0ZW1zID0gc2VsZi4kcmVmcy5jb250YWluZXIuZmluZChcIio6dmlzaWJsZVwiKTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdC8vIEZvY3VzIGluc2lkZSBjdXJyZW50IHNsaWRlXG5cdFx0XHRcdGZvY3VzYWJsZUl0ZW1zID0gc2VsZi5jdXJyZW50LiRzbGlkZS5maW5kKFwiKjp2aXNpYmxlXCIgKyAoZmlyc3RSdW4gPyBcIjpub3QoLmZhbmN5Ym94LWNsb3NlLXNtYWxsKVwiIDogXCJcIikpO1xuXHRcdFx0fVxuXG5cdFx0XHRmb2N1c2FibGVJdGVtcyA9IGZvY3VzYWJsZUl0ZW1zLmZpbHRlcihmb2N1c2FibGVTdHIpLmZpbHRlcihmdW5jdGlvbigpIHtcblx0XHRcdFx0cmV0dXJuICQodGhpcykuY3NzKFwidmlzaWJpbGl0eVwiKSAhPT0gXCJoaWRkZW5cIiAmJiAhJCh0aGlzKS5oYXNDbGFzcyhcImRpc2FibGVkXCIpO1xuXHRcdFx0fSk7XG5cblx0XHRcdGlmIChmb2N1c2FibGVJdGVtcy5sZW5ndGgpIHtcblx0XHRcdFx0Zm9jdXNlZEl0ZW1JbmRleCA9IGZvY3VzYWJsZUl0ZW1zLmluZGV4KGRvY3VtZW50LmFjdGl2ZUVsZW1lbnQpO1xuXG5cdFx0XHRcdGlmIChlICYmIGUuc2hpZnRLZXkpIHtcblx0XHRcdFx0XHQvLyBCYWNrIHRhYlxuXHRcdFx0XHRcdGlmIChmb2N1c2VkSXRlbUluZGV4IDwgMCB8fCBmb2N1c2VkSXRlbUluZGV4ID09IDApIHtcblx0XHRcdFx0XHRcdGUucHJldmVudERlZmF1bHQoKTtcblxuXHRcdFx0XHRcdFx0Zm9jdXNhYmxlSXRlbXMuZXEoZm9jdXNhYmxlSXRlbXMubGVuZ3RoIC0gMSkudHJpZ2dlcihcImZvY3VzXCIpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHQvLyBPdXRzaWRlIG9yIEZvcndhcmQgdGFiXG5cdFx0XHRcdFx0aWYgKGZvY3VzZWRJdGVtSW5kZXggPCAwIHx8IGZvY3VzZWRJdGVtSW5kZXggPT0gZm9jdXNhYmxlSXRlbXMubGVuZ3RoIC0gMSkge1xuXHRcdFx0XHRcdFx0aWYgKGUpIHtcblx0XHRcdFx0XHRcdFx0ZS5wcmV2ZW50RGVmYXVsdCgpO1xuXHRcdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0XHRmb2N1c2FibGVJdGVtcy5lcSgwKS50cmlnZ2VyKFwiZm9jdXNcIik7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRzZWxmLiRyZWZzLmNvbnRhaW5lci50cmlnZ2VyKFwiZm9jdXNcIik7XG5cdFx0XHR9XG5cdFx0fSxcblxuXHRcdC8vIEFjdGl2YXRlcyBjdXJyZW50IGluc3RhbmNlIC0gYnJpbmdzIGNvbnRhaW5lciB0byB0aGUgZnJvbnQgYW5kIGVuYWJsZXMga2V5Ym9hcmQsXG5cdFx0Ly8gbm90aWZpZXMgb3RoZXIgaW5zdGFuY2VzIGFib3V0IGRlYWN0aXZhdGluZ1xuXHRcdC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG5cdFx0YWN0aXZhdGU6IGZ1bmN0aW9uKCkge1xuXHRcdFx0dmFyIHNlbGYgPSB0aGlzO1xuXG5cdFx0XHQvLyBEZWFjdGl2YXRlIGFsbCBpbnN0YW5jZXNcblx0XHRcdCQoXCIuZmFuY3lib3gtY29udGFpbmVyXCIpLmVhY2goZnVuY3Rpb24oKSB7XG5cdFx0XHRcdHZhciBpbnN0YW5jZSA9ICQodGhpcykuZGF0YShcIkZhbmN5Qm94XCIpO1xuXG5cdFx0XHRcdC8vIFNraXAgc2VsZiBhbmQgY2xvc2luZyBpbnN0YW5jZXNcblx0XHRcdFx0aWYgKGluc3RhbmNlICYmIGluc3RhbmNlLmlkICE9PSBzZWxmLmlkICYmICFpbnN0YW5jZS5pc0Nsb3NpbmcpIHtcblx0XHRcdFx0XHRpbnN0YW5jZS50cmlnZ2VyKFwib25EZWFjdGl2YXRlXCIpO1xuXG5cdFx0XHRcdFx0aW5zdGFuY2UucmVtb3ZlRXZlbnRzKCk7XG5cblx0XHRcdFx0XHRpbnN0YW5jZS5pc1Zpc2libGUgPSBmYWxzZTtcblx0XHRcdFx0fVxuXHRcdFx0fSk7XG5cblx0XHRcdHNlbGYuaXNWaXNpYmxlID0gdHJ1ZTtcblxuXHRcdFx0aWYgKHNlbGYuY3VycmVudCB8fCBzZWxmLmlzSWRsZSkge1xuXHRcdFx0XHRzZWxmLnVwZGF0ZSgpO1xuXG5cdFx0XHRcdHNlbGYudXBkYXRlQ29udHJvbHMoKTtcblx0XHRcdH1cblxuXHRcdFx0c2VsZi50cmlnZ2VyKFwib25BY3RpdmF0ZVwiKTtcblxuXHRcdFx0c2VsZi5hZGRFdmVudHMoKTtcblx0XHR9LFxuXG5cdFx0Ly8gU3RhcnQgY2xvc2luZyBwcm9jZWR1cmVcblx0XHQvLyBUaGlzIHdpbGwgc3RhcnQgXCJ6b29tLW91dFwiIGFuaW1hdGlvbiBpZiBuZWVkZWQgYW5kIGNsZWFuIGV2ZXJ5dGhpbmcgdXAgYWZ0ZXJ3YXJkc1xuXHRcdC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG5cdFx0Y2xvc2U6IGZ1bmN0aW9uKGUsIGQpIHtcblx0XHRcdHZhciBzZWxmID0gdGhpcyxcblx0XHRcdFx0Y3VycmVudCA9IHNlbGYuY3VycmVudCxcblx0XHRcdFx0ZWZmZWN0LFxuXHRcdFx0XHRkdXJhdGlvbixcblx0XHRcdFx0JGNvbnRlbnQsXG5cdFx0XHRcdGRvbVJlY3QsXG5cdFx0XHRcdG9wYWNpdHksXG5cdFx0XHRcdHN0YXJ0LFxuXHRcdFx0XHRlbmQ7XG5cblx0XHRcdHZhciBkb25lID0gZnVuY3Rpb24oKSB7XG5cdFx0XHRcdHNlbGYuY2xlYW5VcChlKTtcblx0XHRcdH07XG5cblx0XHRcdGlmIChzZWxmLmlzQ2xvc2luZykge1xuXHRcdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0XHR9XG5cblx0XHRcdHNlbGYuaXNDbG9zaW5nID0gdHJ1ZTtcblxuXHRcdFx0Ly8gSWYgYmVmb3JlQ2xvc2UgY2FsbGJhY2sgcHJldmVudHMgY2xvc2luZywgbWFrZSBzdXJlIGNvbnRlbnQgaXMgY2VudGVyZWRcblx0XHRcdGlmIChzZWxmLnRyaWdnZXIoXCJiZWZvcmVDbG9zZVwiLCBlKSA9PT0gZmFsc2UpIHtcblx0XHRcdFx0c2VsZi5pc0Nsb3NpbmcgPSBmYWxzZTtcblxuXHRcdFx0XHRyZXF1ZXN0QUZyYW1lKGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdHNlbGYudXBkYXRlKCk7XG5cdFx0XHRcdH0pO1xuXG5cdFx0XHRcdHJldHVybiBmYWxzZTtcblx0XHRcdH1cblxuXHRcdFx0Ly8gUmVtb3ZlIGFsbCBldmVudHNcblx0XHRcdC8vIElmIHRoZXJlIGFyZSBtdWx0aXBsZSBpbnN0YW5jZXMsIHRoZXkgd2lsbCBiZSBzZXQgYWdhaW4gYnkgXCJhY3RpdmF0ZVwiIG1ldGhvZFxuXHRcdFx0c2VsZi5yZW1vdmVFdmVudHMoKTtcblxuXHRcdFx0JGNvbnRlbnQgPSBjdXJyZW50LiRjb250ZW50O1xuXHRcdFx0ZWZmZWN0ID0gY3VycmVudC5vcHRzLmFuaW1hdGlvbkVmZmVjdDtcblx0XHRcdGR1cmF0aW9uID0gJC5pc051bWVyaWMoZCkgPyBkIDogZWZmZWN0ID8gY3VycmVudC5vcHRzLmFuaW1hdGlvbkR1cmF0aW9uIDogMDtcblxuXHRcdFx0Y3VycmVudC4kc2xpZGUucmVtb3ZlQ2xhc3MoXCJmYW5jeWJveC1zbGlkZS0tY29tcGxldGUgZmFuY3lib3gtc2xpZGUtLW5leHQgZmFuY3lib3gtc2xpZGUtLXByZXZpb3VzIGZhbmN5Ym94LWFuaW1hdGVkXCIpO1xuXG5cdFx0XHRpZiAoZSAhPT0gdHJ1ZSkge1xuXHRcdFx0XHQkLmZhbmN5Ym94LnN0b3AoY3VycmVudC4kc2xpZGUpO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0ZWZmZWN0ID0gZmFsc2U7XG5cdFx0XHR9XG5cblx0XHRcdC8vIFJlbW92ZSBvdGhlciBzbGlkZXNcblx0XHRcdGN1cnJlbnQuJHNsaWRlXG5cdFx0XHRcdC5zaWJsaW5ncygpXG5cdFx0XHRcdC50cmlnZ2VyKFwib25SZXNldFwiKVxuXHRcdFx0XHQucmVtb3ZlKCk7XG5cblx0XHRcdC8vIFRyaWdnZXIgYW5pbWF0aW9uc1xuXHRcdFx0aWYgKGR1cmF0aW9uKSB7XG5cdFx0XHRcdHNlbGYuJHJlZnMuY29udGFpbmVyXG5cdFx0XHRcdFx0LnJlbW92ZUNsYXNzKFwiZmFuY3lib3gtaXMtb3BlblwiKVxuXHRcdFx0XHRcdC5hZGRDbGFzcyhcImZhbmN5Ym94LWlzLWNsb3NpbmdcIilcblx0XHRcdFx0XHQuY3NzKFwidHJhbnNpdGlvbi1kdXJhdGlvblwiLCBkdXJhdGlvbiArIFwibXNcIik7XG5cdFx0XHR9XG5cblx0XHRcdC8vIENsZWFuIHVwXG5cdFx0XHRzZWxmLmhpZGVMb2FkaW5nKGN1cnJlbnQpO1xuXG5cdFx0XHRzZWxmLmhpZGVDb250cm9scyh0cnVlKTtcblxuXHRcdFx0c2VsZi51cGRhdGVDdXJzb3IoKTtcblxuXHRcdFx0Ly8gQ2hlY2sgaWYgcG9zc2libGUgdG8gem9vbS1vdXRcblx0XHRcdGlmIChcblx0XHRcdFx0ZWZmZWN0ID09PSBcInpvb21cIiAmJlxuXHRcdFx0XHQhKCRjb250ZW50ICYmIGR1cmF0aW9uICYmIGN1cnJlbnQudHlwZSA9PT0gXCJpbWFnZVwiICYmICFzZWxmLmlzTW92ZWQoKSAmJiAhY3VycmVudC5oYXNFcnJvciAmJiAoZW5kID0gc2VsZi5nZXRUaHVtYlBvcyhjdXJyZW50KSkpXG5cdFx0XHQpIHtcblx0XHRcdFx0ZWZmZWN0ID0gXCJmYWRlXCI7XG5cdFx0XHR9XG5cblx0XHRcdGlmIChlZmZlY3QgPT09IFwiem9vbVwiKSB7XG5cdFx0XHRcdCQuZmFuY3lib3guc3RvcCgkY29udGVudCk7XG5cblx0XHRcdFx0ZG9tUmVjdCA9ICQuZmFuY3lib3guZ2V0VHJhbnNsYXRlKCRjb250ZW50KTtcblxuXHRcdFx0XHRzdGFydCA9IHtcblx0XHRcdFx0XHR0b3A6IGRvbVJlY3QudG9wLFxuXHRcdFx0XHRcdGxlZnQ6IGRvbVJlY3QubGVmdCxcblx0XHRcdFx0XHRzY2FsZVg6IGRvbVJlY3Qud2lkdGggLyBlbmQud2lkdGgsXG5cdFx0XHRcdFx0c2NhbGVZOiBkb21SZWN0LmhlaWdodCAvIGVuZC5oZWlnaHQsXG5cdFx0XHRcdFx0d2lkdGg6IGVuZC53aWR0aCxcblx0XHRcdFx0XHRoZWlnaHQ6IGVuZC5oZWlnaHRcblx0XHRcdFx0fTtcblxuXHRcdFx0XHQvLyBDaGVjayBpZiB3ZSBuZWVkIHRvIGFuaW1hdGUgb3BhY2l0eVxuXHRcdFx0XHRvcGFjaXR5ID0gY3VycmVudC5vcHRzLnpvb21PcGFjaXR5O1xuXG5cdFx0XHRcdGlmIChvcGFjaXR5ID09IFwiYXV0b1wiKSB7XG5cdFx0XHRcdFx0b3BhY2l0eSA9IE1hdGguYWJzKGN1cnJlbnQud2lkdGggLyBjdXJyZW50LmhlaWdodCAtIGVuZC53aWR0aCAvIGVuZC5oZWlnaHQpID4gMC4xO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0aWYgKG9wYWNpdHkpIHtcblx0XHRcdFx0XHRlbmQub3BhY2l0eSA9IDA7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHQkLmZhbmN5Ym94LnNldFRyYW5zbGF0ZSgkY29udGVudCwgc3RhcnQpO1xuXG5cdFx0XHRcdGZvcmNlUmVkcmF3KCRjb250ZW50KTtcblxuXHRcdFx0XHQkLmZhbmN5Ym94LmFuaW1hdGUoJGNvbnRlbnQsIGVuZCwgZHVyYXRpb24sIGRvbmUpO1xuXG5cdFx0XHRcdHJldHVybiB0cnVlO1xuXHRcdFx0fVxuXG5cdFx0XHRpZiAoZWZmZWN0ICYmIGR1cmF0aW9uKSB7XG5cdFx0XHRcdCQuZmFuY3lib3guYW5pbWF0ZShcblx0XHRcdFx0XHRjdXJyZW50LiRzbGlkZS5hZGRDbGFzcyhcImZhbmN5Ym94LXNsaWRlLS1wcmV2aW91c1wiKS5yZW1vdmVDbGFzcyhcImZhbmN5Ym94LXNsaWRlLS1jdXJyZW50XCIpLFxuXHRcdFx0XHRcdFwiZmFuY3lib3gtYW5pbWF0ZWQgZmFuY3lib3gtZngtXCIgKyBlZmZlY3QsXG5cdFx0XHRcdFx0ZHVyYXRpb24sXG5cdFx0XHRcdFx0ZG9uZVxuXHRcdFx0XHQpO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0Ly8gSWYgc2tpcCBhbmltYXRpb25cblx0XHRcdFx0aWYgKGUgPT09IHRydWUpIHtcblx0XHRcdFx0XHRzZXRUaW1lb3V0KGRvbmUsIGR1cmF0aW9uKTtcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRkb25lKCk7XG5cdFx0XHRcdH1cblx0XHRcdH1cblxuXHRcdFx0cmV0dXJuIHRydWU7XG5cdFx0fSxcblxuXHRcdC8vIEZpbmFsIGFkanVzdG1lbnRzIGFmdGVyIHJlbW92aW5nIHRoZSBpbnN0YW5jZVxuXHRcdC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG5cdFx0Y2xlYW5VcDogZnVuY3Rpb24oZSkge1xuXHRcdFx0dmFyIHNlbGYgPSB0aGlzLFxuXHRcdFx0XHRpbnN0YW5jZSxcblx0XHRcdFx0JGZvY3VzID0gc2VsZi5jdXJyZW50Lm9wdHMuJG9yaWcsXG5cdFx0XHRcdHgsXG5cdFx0XHRcdHk7XG5cblx0XHRcdHNlbGYuY3VycmVudC4kc2xpZGUudHJpZ2dlcihcIm9uUmVzZXRcIik7XG5cblx0XHRcdHNlbGYuJHJlZnMuY29udGFpbmVyLmVtcHR5KCkucmVtb3ZlKCk7XG5cblx0XHRcdHNlbGYudHJpZ2dlcihcImFmdGVyQ2xvc2VcIiwgZSk7XG5cblx0XHRcdC8vIFBsYWNlIGJhY2sgZm9jdXNcblx0XHRcdGlmICghIXNlbGYuY3VycmVudC5vcHRzLmJhY2tGb2N1cykge1xuXHRcdFx0XHRpZiAoISRmb2N1cyB8fCAhJGZvY3VzLmxlbmd0aCB8fCAhJGZvY3VzLmlzKFwiOnZpc2libGVcIikpIHtcblx0XHRcdFx0XHQkZm9jdXMgPSBzZWxmLiR0cmlnZ2VyO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0aWYgKCRmb2N1cyAmJiAkZm9jdXMubGVuZ3RoKSB7XG5cdFx0XHRcdFx0eCA9IHdpbmRvdy5zY3JvbGxYO1xuXHRcdFx0XHRcdHkgPSB3aW5kb3cuc2Nyb2xsWTtcblxuXHRcdFx0XHRcdCRmb2N1cy50cmlnZ2VyKFwiZm9jdXNcIik7XG5cblx0XHRcdFx0XHQkKFwiaHRtbCwgYm9keVwiKVxuXHRcdFx0XHRcdFx0LnNjcm9sbFRvcCh5KVxuXHRcdFx0XHRcdFx0LnNjcm9sbExlZnQoeCk7XG5cdFx0XHRcdH1cblx0XHRcdH1cblxuXHRcdFx0c2VsZi5jdXJyZW50ID0gbnVsbDtcblxuXHRcdFx0Ly8gQ2hlY2sgaWYgdGhlcmUgYXJlIG90aGVyIGluc3RhbmNlc1xuXHRcdFx0aW5zdGFuY2UgPSAkLmZhbmN5Ym94LmdldEluc3RhbmNlKCk7XG5cblx0XHRcdGlmIChpbnN0YW5jZSkge1xuXHRcdFx0XHRpbnN0YW5jZS5hY3RpdmF0ZSgpO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0JChcImJvZHlcIikucmVtb3ZlQ2xhc3MoXCJmYW5jeWJveC1hY3RpdmUgY29tcGVuc2F0ZS1mb3Itc2Nyb2xsYmFyXCIpO1xuXG5cdFx0XHRcdCQoXCIjZmFuY3lib3gtc3R5bGUtbm9zY3JvbGxcIikucmVtb3ZlKCk7XG5cdFx0XHR9XG5cdFx0fSxcblxuXHRcdC8vIENhbGwgY2FsbGJhY2sgYW5kIHRyaWdnZXIgYW4gZXZlbnRcblx0XHQvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cblx0XHR0cmlnZ2VyOiBmdW5jdGlvbihuYW1lLCBzbGlkZSkge1xuXHRcdFx0dmFyIGFyZ3MgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpLFxuXHRcdFx0XHRzZWxmID0gdGhpcyxcblx0XHRcdFx0b2JqID0gc2xpZGUgJiYgc2xpZGUub3B0cyA/IHNsaWRlIDogc2VsZi5jdXJyZW50LFxuXHRcdFx0XHRyZXo7XG5cblx0XHRcdGlmIChvYmopIHtcblx0XHRcdFx0YXJncy51bnNoaWZ0KG9iaik7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRvYmogPSBzZWxmO1xuXHRcdFx0fVxuXG5cdFx0XHRhcmdzLnVuc2hpZnQoc2VsZik7XG5cblx0XHRcdGlmICgkLmlzRnVuY3Rpb24ob2JqLm9wdHNbbmFtZV0pKSB7XG5cdFx0XHRcdHJleiA9IG9iai5vcHRzW25hbWVdLmFwcGx5KG9iaiwgYXJncyk7XG5cdFx0XHR9XG5cblx0XHRcdGlmIChyZXogPT09IGZhbHNlKSB7XG5cdFx0XHRcdHJldHVybiByZXo7XG5cdFx0XHR9XG5cblx0XHRcdGlmIChuYW1lID09PSBcImFmdGVyQ2xvc2VcIiB8fCAhc2VsZi4kcmVmcykge1xuXHRcdFx0XHQkRC50cmlnZ2VyKG5hbWUgKyBcIi5mYlwiLCBhcmdzKTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdHNlbGYuJHJlZnMuY29udGFpbmVyLnRyaWdnZXIobmFtZSArIFwiLmZiXCIsIGFyZ3MpO1xuXHRcdFx0fVxuXHRcdH0sXG5cblx0XHQvLyBVcGRhdGUgaW5mb2JhciB2YWx1ZXMsIG5hdmlnYXRpb24gYnV0dG9uIHN0YXRlcyBhbmQgcmV2ZWFsIGNhcHRpb25cblx0XHQvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuXHRcdHVwZGF0ZUNvbnRyb2xzOiBmdW5jdGlvbigpIHtcblx0XHRcdHZhciBzZWxmID0gdGhpcyxcblx0XHRcdFx0Y3VycmVudCA9IHNlbGYuY3VycmVudCxcblx0XHRcdFx0aW5kZXggPSBjdXJyZW50LmluZGV4LFxuXHRcdFx0XHQkY29udGFpbmVyID0gc2VsZi4kcmVmcy5jb250YWluZXIsXG5cdFx0XHRcdCRjYXB0aW9uID0gc2VsZi4kcmVmcy5jYXB0aW9uLFxuXHRcdFx0XHRjYXB0aW9uID0gY3VycmVudC5vcHRzLmNhcHRpb247XG5cblx0XHRcdC8vIFJlY2FsY3VsYXRlIGNvbnRlbnQgZGltZW5zaW9uc1xuXHRcdFx0Y3VycmVudC4kc2xpZGUudHJpZ2dlcihcInJlZnJlc2hcIik7XG5cblx0XHRcdHNlbGYuJGNhcHRpb24gPSBjYXB0aW9uICYmIGNhcHRpb24ubGVuZ3RoID8gJGNhcHRpb24uaHRtbChjYXB0aW9uKSA6IG51bGw7XG5cblx0XHRcdGlmICghc2VsZi5oYXNIaWRkZW5Db250cm9scyAmJiAhc2VsZi5pc0lkbGUpIHtcblx0XHRcdFx0c2VsZi5zaG93Q29udHJvbHMoKTtcblx0XHRcdH1cblxuXHRcdFx0Ly8gVXBkYXRlIGluZm8gYW5kIG5hdmlnYXRpb24gZWxlbWVudHNcblx0XHRcdCRjb250YWluZXIuZmluZChcIltkYXRhLWZhbmN5Ym94LWNvdW50XVwiKS5odG1sKHNlbGYuZ3JvdXAubGVuZ3RoKTtcblx0XHRcdCRjb250YWluZXIuZmluZChcIltkYXRhLWZhbmN5Ym94LWluZGV4XVwiKS5odG1sKGluZGV4ICsgMSk7XG5cblx0XHRcdCRjb250YWluZXIuZmluZChcIltkYXRhLWZhbmN5Ym94LXByZXZdXCIpLnByb3AoXCJkaXNhYmxlZFwiLCAhY3VycmVudC5vcHRzLmxvb3AgJiYgaW5kZXggPD0gMCk7XG5cdFx0XHQkY29udGFpbmVyLmZpbmQoXCJbZGF0YS1mYW5jeWJveC1uZXh0XVwiKS5wcm9wKFwiZGlzYWJsZWRcIiwgIWN1cnJlbnQub3B0cy5sb29wICYmIGluZGV4ID49IHNlbGYuZ3JvdXAubGVuZ3RoIC0gMSk7XG5cblx0XHRcdGlmIChjdXJyZW50LnR5cGUgPT09IFwiaW1hZ2VcIikge1xuXHRcdFx0XHQvLyBSZS1lbmFibGUgYnV0dG9uczsgdXBkYXRlIGRvd25sb2FkIGJ1dHRvbiBzb3VyY2Vcblx0XHRcdFx0JGNvbnRhaW5lclxuXHRcdFx0XHRcdC5maW5kKFwiW2RhdGEtZmFuY3lib3gtem9vbV1cIilcblx0XHRcdFx0XHQuc2hvdygpXG5cdFx0XHRcdFx0LmVuZCgpXG5cdFx0XHRcdFx0LmZpbmQoXCJbZGF0YS1mYW5jeWJveC1kb3dubG9hZF1cIilcblx0XHRcdFx0XHQuYXR0cihcImhyZWZcIiwgY3VycmVudC5vcHRzLmltYWdlLnNyYyB8fCBjdXJyZW50LnNyYylcblx0XHRcdFx0XHQuc2hvdygpO1xuXHRcdFx0fSBlbHNlIGlmIChjdXJyZW50Lm9wdHMudG9vbGJhcikge1xuXHRcdFx0XHQkY29udGFpbmVyLmZpbmQoXCJbZGF0YS1mYW5jeWJveC1kb3dubG9hZF0sW2RhdGEtZmFuY3lib3gtem9vbV1cIikuaGlkZSgpO1xuXHRcdFx0fVxuXG5cdFx0XHQvLyBNYWtlIHN1cmUgZm9jdXMgaXMgbm90IG9uIGRpc2FibGVkIGJ1dHRvbi9lbGVtZW50XG5cdFx0XHRpZiAoJChkb2N1bWVudC5hY3RpdmVFbGVtZW50KS5pcyhcIjpoaWRkZW4sW2Rpc2FibGVkXVwiKSkge1xuXHRcdFx0XHRzZWxmLiRyZWZzLmNvbnRhaW5lci50cmlnZ2VyKFwiZm9jdXNcIik7XG5cdFx0XHR9XG5cdFx0fSxcblxuXHRcdC8vIEhpZGUgdG9vbGJhciBhbmQgY2FwdGlvblxuXHRcdC8vID09PT09PT09PT09PT09PT09PT09PT09PVxuXG5cdFx0aGlkZUNvbnRyb2xzOiBmdW5jdGlvbihhbmRDYXB0aW9uKSB7XG5cdFx0XHR2YXIgc2VsZiA9IHRoaXMsXG5cdFx0XHRcdGFyciA9IFtcImluZm9iYXJcIiwgXCJ0b29sYmFyXCIsIFwibmF2XCJdO1xuXG5cdFx0XHRpZiAoYW5kQ2FwdGlvbiB8fCAhc2VsZi5jdXJyZW50Lm9wdHMucHJldmVudENhcHRpb25PdmVybGFwKSB7XG5cdFx0XHRcdGFyci5wdXNoKFwiY2FwdGlvblwiKTtcblx0XHRcdH1cblxuXHRcdFx0dGhpcy4kcmVmcy5jb250YWluZXIucmVtb3ZlQ2xhc3MoXG5cdFx0XHRcdGFyclxuXHRcdFx0XHRcdC5tYXAoZnVuY3Rpb24oaSkge1xuXHRcdFx0XHRcdFx0cmV0dXJuIFwiZmFuY3lib3gtc2hvdy1cIiArIGk7XG5cdFx0XHRcdFx0fSlcblx0XHRcdFx0XHQuam9pbihcIiBcIilcblx0XHRcdCk7XG5cblx0XHRcdHRoaXMuaGFzSGlkZGVuQ29udHJvbHMgPSB0cnVlO1xuXHRcdH0sXG5cblx0XHRzaG93Q29udHJvbHM6IGZ1bmN0aW9uKCkge1xuXHRcdFx0dmFyIHNlbGYgPSB0aGlzLFxuXHRcdFx0XHRvcHRzID0gc2VsZi5jdXJyZW50ID8gc2VsZi5jdXJyZW50Lm9wdHMgOiBzZWxmLm9wdHMsXG5cdFx0XHRcdCRjb250YWluZXIgPSBzZWxmLiRyZWZzLmNvbnRhaW5lcjtcblxuXHRcdFx0c2VsZi5oYXNIaWRkZW5Db250cm9scyA9IGZhbHNlO1xuXHRcdFx0c2VsZi5pZGxlU2Vjb25kc0NvdW50ZXIgPSAwO1xuXG5cdFx0XHQkY29udGFpbmVyXG5cdFx0XHRcdC50b2dnbGVDbGFzcyhcImZhbmN5Ym94LXNob3ctdG9vbGJhclwiLCAhIShvcHRzLnRvb2xiYXIgJiYgb3B0cy5idXR0b25zKSlcblx0XHRcdFx0LnRvZ2dsZUNsYXNzKFwiZmFuY3lib3gtc2hvdy1pbmZvYmFyXCIsICEhKG9wdHMuaW5mb2JhciAmJiBzZWxmLmdyb3VwLmxlbmd0aCA+IDEpKVxuXHRcdFx0XHQudG9nZ2xlQ2xhc3MoXCJmYW5jeWJveC1zaG93LWNhcHRpb25cIiwgISFzZWxmLiRjYXB0aW9uKVxuXHRcdFx0XHQudG9nZ2xlQ2xhc3MoXCJmYW5jeWJveC1zaG93LW5hdlwiLCAhIShvcHRzLmFycm93cyAmJiBzZWxmLmdyb3VwLmxlbmd0aCA+IDEpKVxuXHRcdFx0XHQudG9nZ2xlQ2xhc3MoXCJmYW5jeWJveC1pcy1tb2RhbFwiLCAhIW9wdHMubW9kYWwpO1xuXHRcdH0sXG5cblx0XHQvLyBUb2dnbGUgdG9vbGJhciBhbmQgY2FwdGlvblxuXHRcdC8vID09PT09PT09PT09PT09PT09PT09PT09PT09XG5cblx0XHR0b2dnbGVDb250cm9sczogZnVuY3Rpb24oKSB7XG5cdFx0XHRpZiAodGhpcy5oYXNIaWRkZW5Db250cm9scykge1xuXHRcdFx0XHR0aGlzLnNob3dDb250cm9scygpO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0dGhpcy5oaWRlQ29udHJvbHMoKTtcblx0XHRcdH1cblx0XHR9XG5cdH0pO1xuXG5cdCQuZmFuY3lib3ggPSB7XG5cdFx0dmVyc2lvbjogXCIzLjUuMlwiLFxuXHRcdGRlZmF1bHRzOiBkZWZhdWx0cyxcblxuXHRcdC8vIEdldCBjdXJyZW50IGluc3RhbmNlIGFuZCBleGVjdXRlIGEgY29tbWFuZC5cblx0XHQvL1xuXHRcdC8vIEV4YW1wbGVzIG9mIHVzYWdlOlxuXHRcdC8vXG5cdFx0Ly8gICAkaW5zdGFuY2UgPSAkLmZhbmN5Ym94LmdldEluc3RhbmNlKCk7XG5cdFx0Ly8gICAkLmZhbmN5Ym94LmdldEluc3RhbmNlKCkuanVtcFRvKCAxICk7XG5cdFx0Ly8gICAkLmZhbmN5Ym94LmdldEluc3RhbmNlKCAnanVtcFRvJywgMSApO1xuXHRcdC8vICAgJC5mYW5jeWJveC5nZXRJbnN0YW5jZSggZnVuY3Rpb24oKSB7XG5cdFx0Ly8gICAgICAgY29uc29sZS5pbmZvKCB0aGlzLmN1cnJJbmRleCApO1xuXHRcdC8vICAgfSk7XG5cdFx0Ly8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cblx0XHRnZXRJbnN0YW5jZTogZnVuY3Rpb24oY29tbWFuZCkge1xuXHRcdFx0dmFyIGluc3RhbmNlID0gJCgnLmZhbmN5Ym94LWNvbnRhaW5lcjpub3QoXCIuZmFuY3lib3gtaXMtY2xvc2luZ1wiKTpsYXN0JykuZGF0YShcIkZhbmN5Qm94XCIpLFxuXHRcdFx0XHRhcmdzID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzLCAxKTtcblxuXHRcdFx0aWYgKGluc3RhbmNlIGluc3RhbmNlb2YgRmFuY3lCb3gpIHtcblx0XHRcdFx0aWYgKCQudHlwZShjb21tYW5kKSA9PT0gXCJzdHJpbmdcIikge1xuXHRcdFx0XHRcdGluc3RhbmNlW2NvbW1hbmRdLmFwcGx5KGluc3RhbmNlLCBhcmdzKTtcblx0XHRcdFx0fSBlbHNlIGlmICgkLnR5cGUoY29tbWFuZCkgPT09IFwiZnVuY3Rpb25cIikge1xuXHRcdFx0XHRcdGNvbW1hbmQuYXBwbHkoaW5zdGFuY2UsIGFyZ3MpO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0cmV0dXJuIGluc3RhbmNlO1xuXHRcdFx0fVxuXG5cdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0fSxcblxuXHRcdC8vIENyZWF0ZSBuZXcgaW5zdGFuY2Vcblx0XHQvLyA9PT09PT09PT09PT09PT09PT09XG5cblx0XHRvcGVuOiBmdW5jdGlvbihpdGVtcywgb3B0cywgaW5kZXgpIHtcblx0XHRcdHJldHVybiBuZXcgRmFuY3lCb3goaXRlbXMsIG9wdHMsIGluZGV4KTtcblx0XHR9LFxuXG5cdFx0Ly8gQ2xvc2UgY3VycmVudCBvciBhbGwgaW5zdGFuY2VzXG5cdFx0Ly8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cblx0XHRjbG9zZTogZnVuY3Rpb24oYWxsKSB7XG5cdFx0XHR2YXIgaW5zdGFuY2UgPSB0aGlzLmdldEluc3RhbmNlKCk7XG5cblx0XHRcdGlmIChpbnN0YW5jZSkge1xuXHRcdFx0XHRpbnN0YW5jZS5jbG9zZSgpO1xuXG5cdFx0XHRcdC8vIFRyeSB0byBmaW5kIGFuZCBjbG9zZSBuZXh0IGluc3RhbmNlXG5cdFx0XHRcdGlmIChhbGwgPT09IHRydWUpIHtcblx0XHRcdFx0XHR0aGlzLmNsb3NlKGFsbCk7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9LFxuXG5cdFx0Ly8gQ2xvc2UgYWxsIGluc3RhbmNlcyBhbmQgdW5iaW5kIGFsbCBldmVudHNcblx0XHQvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG5cdFx0ZGVzdHJveTogZnVuY3Rpb24oKSB7XG5cdFx0XHR0aGlzLmNsb3NlKHRydWUpO1xuXG5cdFx0XHQkRC5hZGQoXCJib2R5XCIpLm9mZihcImNsaWNrLmZiLXN0YXJ0XCIsIFwiKipcIik7XG5cdFx0fSxcblxuXHRcdC8vIFRyeSB0byBkZXRlY3QgbW9iaWxlIGRldmljZXNcblx0XHQvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cblx0XHRpc01vYmlsZTogL0FuZHJvaWR8d2ViT1N8aVBob25lfGlQYWR8aVBvZHxCbGFja0JlcnJ5fElFTW9iaWxlfE9wZXJhIE1pbmkvaS50ZXN0KG5hdmlnYXRvci51c2VyQWdlbnQpLFxuXG5cdFx0Ly8gRGV0ZWN0IGlmICd0cmFuc2xhdGUzZCcgc3VwcG9ydCBpcyBhdmFpbGFibGVcblx0XHQvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG5cdFx0dXNlM2Q6IChmdW5jdGlvbigpIHtcblx0XHRcdHZhciBkaXYgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiZGl2XCIpO1xuXG5cdFx0XHRyZXR1cm4gKFxuXHRcdFx0XHR3aW5kb3cuZ2V0Q29tcHV0ZWRTdHlsZSAmJlxuXHRcdFx0XHR3aW5kb3cuZ2V0Q29tcHV0ZWRTdHlsZShkaXYpICYmXG5cdFx0XHRcdHdpbmRvdy5nZXRDb21wdXRlZFN0eWxlKGRpdikuZ2V0UHJvcGVydHlWYWx1ZShcInRyYW5zZm9ybVwiKSAmJlxuXHRcdFx0XHQhKGRvY3VtZW50LmRvY3VtZW50TW9kZSAmJiBkb2N1bWVudC5kb2N1bWVudE1vZGUgPCAxMSlcblx0XHRcdCk7XG5cdFx0fSkoKSxcblxuXHRcdC8vIEhlbHBlciBmdW5jdGlvbiB0byBnZXQgY3VycmVudCB2aXN1YWwgc3RhdGUgb2YgYW4gZWxlbWVudFxuXHRcdC8vIHJldHVybnMgYXJyYXlbIHRvcCwgbGVmdCwgaG9yaXpvbnRhbC1zY2FsZSwgdmVydGljYWwtc2NhbGUsIG9wYWNpdHkgXVxuXHRcdC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG5cdFx0Z2V0VHJhbnNsYXRlOiBmdW5jdGlvbigkZWwpIHtcblx0XHRcdHZhciBkb21SZWN0O1xuXG5cdFx0XHRpZiAoISRlbCB8fCAhJGVsLmxlbmd0aCkge1xuXHRcdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0XHR9XG5cblx0XHRcdGRvbVJlY3QgPSAkZWxbMF0uZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XG5cblx0XHRcdHJldHVybiB7XG5cdFx0XHRcdHRvcDogZG9tUmVjdC50b3AgfHwgMCxcblx0XHRcdFx0bGVmdDogZG9tUmVjdC5sZWZ0IHx8IDAsXG5cdFx0XHRcdHdpZHRoOiBkb21SZWN0LndpZHRoLFxuXHRcdFx0XHRoZWlnaHQ6IGRvbVJlY3QuaGVpZ2h0LFxuXHRcdFx0XHRvcGFjaXR5OiBwYXJzZUZsb2F0KCRlbC5jc3MoXCJvcGFjaXR5XCIpKVxuXHRcdFx0fTtcblx0XHR9LFxuXG5cdFx0Ly8gU2hvcnRjdXQgZm9yIHNldHRpbmcgXCJ0cmFuc2xhdGUzZFwiIHByb3BlcnRpZXMgZm9yIGVsZW1lbnRcblx0XHQvLyBDYW4gc2V0IGJlIHVzZWQgdG8gc2V0IG9wYWNpdHksIHRvb1xuXHRcdC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cblx0XHRzZXRUcmFuc2xhdGU6IGZ1bmN0aW9uKCRlbCwgcHJvcHMpIHtcblx0XHRcdHZhciBzdHIgPSBcIlwiLFxuXHRcdFx0XHRjc3MgPSB7fTtcblxuXHRcdFx0aWYgKCEkZWwgfHwgIXByb3BzKSB7XG5cdFx0XHRcdHJldHVybjtcblx0XHRcdH1cblxuXHRcdFx0aWYgKHByb3BzLmxlZnQgIT09IHVuZGVmaW5lZCB8fCBwcm9wcy50b3AgIT09IHVuZGVmaW5lZCkge1xuXHRcdFx0XHRzdHIgPVxuXHRcdFx0XHRcdChwcm9wcy5sZWZ0ID09PSB1bmRlZmluZWQgPyAkZWwucG9zaXRpb24oKS5sZWZ0IDogcHJvcHMubGVmdCkgK1xuXHRcdFx0XHRcdFwicHgsIFwiICtcblx0XHRcdFx0XHQocHJvcHMudG9wID09PSB1bmRlZmluZWQgPyAkZWwucG9zaXRpb24oKS50b3AgOiBwcm9wcy50b3ApICtcblx0XHRcdFx0XHRcInB4XCI7XG5cblx0XHRcdFx0aWYgKHRoaXMudXNlM2QpIHtcblx0XHRcdFx0XHRzdHIgPSBcInRyYW5zbGF0ZTNkKFwiICsgc3RyICsgXCIsIDBweClcIjtcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRzdHIgPSBcInRyYW5zbGF0ZShcIiArIHN0ciArIFwiKVwiO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cblx0XHRcdGlmIChwcm9wcy5zY2FsZVggIT09IHVuZGVmaW5lZCAmJiBwcm9wcy5zY2FsZVkgIT09IHVuZGVmaW5lZCkge1xuXHRcdFx0XHRzdHIgKz0gXCIgc2NhbGUoXCIgKyBwcm9wcy5zY2FsZVggKyBcIiwgXCIgKyBwcm9wcy5zY2FsZVkgKyBcIilcIjtcblx0XHRcdH0gZWxzZSBpZiAocHJvcHMuc2NhbGVYICE9PSB1bmRlZmluZWQpIHtcblx0XHRcdFx0c3RyICs9IFwiIHNjYWxlWChcIiArIHByb3BzLnNjYWxlWCArIFwiKVwiO1xuXHRcdFx0fVxuXG5cdFx0XHRpZiAoc3RyLmxlbmd0aCkge1xuXHRcdFx0XHRjc3MudHJhbnNmb3JtID0gc3RyO1xuXHRcdFx0fVxuXG5cdFx0XHRpZiAocHJvcHMub3BhY2l0eSAhPT0gdW5kZWZpbmVkKSB7XG5cdFx0XHRcdGNzcy5vcGFjaXR5ID0gcHJvcHMub3BhY2l0eTtcblx0XHRcdH1cblxuXHRcdFx0aWYgKHByb3BzLndpZHRoICE9PSB1bmRlZmluZWQpIHtcblx0XHRcdFx0Y3NzLndpZHRoID0gcHJvcHMud2lkdGg7XG5cdFx0XHR9XG5cblx0XHRcdGlmIChwcm9wcy5oZWlnaHQgIT09IHVuZGVmaW5lZCkge1xuXHRcdFx0XHRjc3MuaGVpZ2h0ID0gcHJvcHMuaGVpZ2h0O1xuXHRcdFx0fVxuXG5cdFx0XHRyZXR1cm4gJGVsLmNzcyhjc3MpO1xuXHRcdH0sXG5cblx0XHQvLyBTaW1wbGUgQ1NTIHRyYW5zaXRpb24gaGFuZGxlclxuXHRcdC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cblx0XHRhbmltYXRlOiBmdW5jdGlvbigkZWwsIHRvLCBkdXJhdGlvbiwgY2FsbGJhY2ssIGxlYXZlQW5pbWF0aW9uTmFtZSkge1xuXHRcdFx0dmFyIHNlbGYgPSB0aGlzLFxuXHRcdFx0XHRmcm9tO1xuXG5cdFx0XHRpZiAoJC5pc0Z1bmN0aW9uKGR1cmF0aW9uKSkge1xuXHRcdFx0XHRjYWxsYmFjayA9IGR1cmF0aW9uO1xuXHRcdFx0XHRkdXJhdGlvbiA9IG51bGw7XG5cdFx0XHR9XG5cblx0XHRcdHNlbGYuc3RvcCgkZWwpO1xuXG5cdFx0XHRmcm9tID0gc2VsZi5nZXRUcmFuc2xhdGUoJGVsKTtcblxuXHRcdFx0JGVsLm9uKHRyYW5zaXRpb25FbmQsIGZ1bmN0aW9uKGUpIHtcblx0XHRcdFx0Ly8gU2tpcCBldmVudHMgZnJvbSBjaGlsZCBlbGVtZW50cyBhbmQgei1pbmRleCBjaGFuZ2Vcblx0XHRcdFx0aWYgKGUgJiYgZS5vcmlnaW5hbEV2ZW50ICYmICghJGVsLmlzKGUub3JpZ2luYWxFdmVudC50YXJnZXQpIHx8IGUub3JpZ2luYWxFdmVudC5wcm9wZXJ0eU5hbWUgPT0gXCJ6LWluZGV4XCIpKSB7XG5cdFx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0c2VsZi5zdG9wKCRlbCk7XG5cblx0XHRcdFx0aWYgKCQuaXNOdW1lcmljKGR1cmF0aW9uKSkge1xuXHRcdFx0XHRcdCRlbC5jc3MoXCJ0cmFuc2l0aW9uLWR1cmF0aW9uXCIsIFwiXCIpO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0aWYgKCQuaXNQbGFpbk9iamVjdCh0bykpIHtcblx0XHRcdFx0XHRpZiAodG8uc2NhbGVYICE9PSB1bmRlZmluZWQgJiYgdG8uc2NhbGVZICE9PSB1bmRlZmluZWQpIHtcblx0XHRcdFx0XHRcdHNlbGYuc2V0VHJhbnNsYXRlKCRlbCwge1xuXHRcdFx0XHRcdFx0XHR0b3A6IHRvLnRvcCxcblx0XHRcdFx0XHRcdFx0bGVmdDogdG8ubGVmdCxcblx0XHRcdFx0XHRcdFx0d2lkdGg6IGZyb20ud2lkdGggKiB0by5zY2FsZVgsXG5cdFx0XHRcdFx0XHRcdGhlaWdodDogZnJvbS5oZWlnaHQgKiB0by5zY2FsZVksXG5cdFx0XHRcdFx0XHRcdHNjYWxlWDogMSxcblx0XHRcdFx0XHRcdFx0c2NhbGVZOiAxXG5cdFx0XHRcdFx0XHR9KTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH0gZWxzZSBpZiAobGVhdmVBbmltYXRpb25OYW1lICE9PSB0cnVlKSB7XG5cdFx0XHRcdFx0JGVsLnJlbW92ZUNsYXNzKHRvKTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdGlmICgkLmlzRnVuY3Rpb24oY2FsbGJhY2spKSB7XG5cdFx0XHRcdFx0Y2FsbGJhY2soZSk7XG5cdFx0XHRcdH1cblx0XHRcdH0pO1xuXG5cdFx0XHRpZiAoJC5pc051bWVyaWMoZHVyYXRpb24pKSB7XG5cdFx0XHRcdCRlbC5jc3MoXCJ0cmFuc2l0aW9uLWR1cmF0aW9uXCIsIGR1cmF0aW9uICsgXCJtc1wiKTtcblx0XHRcdH1cblxuXHRcdFx0Ly8gU3RhcnQgYW5pbWF0aW9uIGJ5IGNoYW5naW5nIENTUyBwcm9wZXJ0aWVzIG9yIGNsYXNzIG5hbWVcblx0XHRcdGlmICgkLmlzUGxhaW5PYmplY3QodG8pKSB7XG5cdFx0XHRcdGlmICh0by5zY2FsZVggIT09IHVuZGVmaW5lZCAmJiB0by5zY2FsZVkgIT09IHVuZGVmaW5lZCkge1xuXHRcdFx0XHRcdGRlbGV0ZSB0by53aWR0aDtcblx0XHRcdFx0XHRkZWxldGUgdG8uaGVpZ2h0O1xuXG5cdFx0XHRcdFx0aWYgKCRlbC5wYXJlbnQoKS5oYXNDbGFzcyhcImZhbmN5Ym94LXNsaWRlLS1pbWFnZVwiKSkge1xuXHRcdFx0XHRcdFx0JGVsLnBhcmVudCgpLmFkZENsYXNzKFwiZmFuY3lib3gtaXMtc2NhbGluZ1wiKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblxuXHRcdFx0XHQkLmZhbmN5Ym94LnNldFRyYW5zbGF0ZSgkZWwsIHRvKTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdCRlbC5hZGRDbGFzcyh0byk7XG5cdFx0XHR9XG5cblx0XHRcdC8vIE1ha2Ugc3VyZSB0aGF0IGB0cmFuc2l0aW9uZW5kYCBjYWxsYmFjayBnZXRzIGZpcmVkXG5cdFx0XHQkZWwuZGF0YShcblx0XHRcdFx0XCJ0aW1lclwiLFxuXHRcdFx0XHRzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdCRlbC50cmlnZ2VyKHRyYW5zaXRpb25FbmQpO1xuXHRcdFx0XHR9LCBkdXJhdGlvbiArIDMzKVxuXHRcdFx0KTtcblx0XHR9LFxuXG5cdFx0c3RvcDogZnVuY3Rpb24oJGVsLCBjYWxsQ2FsbGJhY2spIHtcblx0XHRcdGlmICgkZWwgJiYgJGVsLmxlbmd0aCkge1xuXHRcdFx0XHRjbGVhclRpbWVvdXQoJGVsLmRhdGEoXCJ0aW1lclwiKSk7XG5cblx0XHRcdFx0aWYgKGNhbGxDYWxsYmFjaykge1xuXHRcdFx0XHRcdCRlbC50cmlnZ2VyKHRyYW5zaXRpb25FbmQpO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0JGVsLm9mZih0cmFuc2l0aW9uRW5kKS5jc3MoXCJ0cmFuc2l0aW9uLWR1cmF0aW9uXCIsIFwiXCIpO1xuXG5cdFx0XHRcdCRlbC5wYXJlbnQoKS5yZW1vdmVDbGFzcyhcImZhbmN5Ym94LWlzLXNjYWxpbmdcIik7XG5cdFx0XHR9XG5cdFx0fVxuXHR9O1xuXG5cdC8vIERlZmF1bHQgY2xpY2sgaGFuZGxlciBmb3IgXCJmYW5jeWJveGVkXCIgbGlua3Ncblx0Ly8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuXHRmdW5jdGlvbiBfcnVuKGUsIG9wdHMpIHtcblx0XHR2YXIgaXRlbXMgPSBbXSxcblx0XHRcdGluZGV4ID0gMCxcblx0XHRcdCR0YXJnZXQsXG5cdFx0XHR2YWx1ZSxcblx0XHRcdGluc3RhbmNlO1xuXG5cdFx0Ly8gQXZvaWQgb3BlbmluZyBtdWx0aXBsZSB0aW1lc1xuXHRcdGlmIChlICYmIGUuaXNEZWZhdWx0UHJldmVudGVkKCkpIHtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cblx0XHRlLnByZXZlbnREZWZhdWx0KCk7XG5cblx0XHRvcHRzID0gb3B0cyB8fCB7fTtcblxuXHRcdGlmIChlICYmIGUuZGF0YSkge1xuXHRcdFx0b3B0cyA9IG1lcmdlT3B0cyhlLmRhdGEub3B0aW9ucywgb3B0cyk7XG5cdFx0fVxuXG5cdFx0JHRhcmdldCA9IG9wdHMuJHRhcmdldCB8fCAkKGUuY3VycmVudFRhcmdldCkudHJpZ2dlcihcImJsdXJcIik7XG5cdFx0aW5zdGFuY2UgPSAkLmZhbmN5Ym94LmdldEluc3RhbmNlKCk7XG5cblx0XHRpZiAoaW5zdGFuY2UgJiYgaW5zdGFuY2UuJHRyaWdnZXIgJiYgaW5zdGFuY2UuJHRyaWdnZXIuaXMoJHRhcmdldCkpIHtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cblx0XHRpZiAob3B0cy5zZWxlY3Rvcikge1xuXHRcdFx0aXRlbXMgPSAkKG9wdHMuc2VsZWN0b3IpO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHQvLyBHZXQgYWxsIHJlbGF0ZWQgaXRlbXMgYW5kIGZpbmQgaW5kZXggZm9yIGNsaWNrZWQgb25lXG5cdFx0XHR2YWx1ZSA9ICR0YXJnZXQuYXR0cihcImRhdGEtZmFuY3lib3hcIikgfHwgXCJcIjtcblxuXHRcdFx0aWYgKHZhbHVlKSB7XG5cdFx0XHRcdGl0ZW1zID0gZS5kYXRhID8gZS5kYXRhLml0ZW1zIDogW107XG5cdFx0XHRcdGl0ZW1zID0gaXRlbXMubGVuZ3RoID8gaXRlbXMuZmlsdGVyKCdbZGF0YS1mYW5jeWJveD1cIicgKyB2YWx1ZSArICdcIl0nKSA6ICQoJ1tkYXRhLWZhbmN5Ym94PVwiJyArIHZhbHVlICsgJ1wiXScpO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0aXRlbXMgPSBbJHRhcmdldF07XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0aW5kZXggPSAkKGl0ZW1zKS5pbmRleCgkdGFyZ2V0KTtcblxuXHRcdC8vIFNvbWV0aW1lcyBjdXJyZW50IGl0ZW0gY2FuIG5vdCBiZSBmb3VuZFxuXHRcdGlmIChpbmRleCA8IDApIHtcblx0XHRcdGluZGV4ID0gMDtcblx0XHR9XG5cblx0XHRpbnN0YW5jZSA9ICQuZmFuY3lib3gub3BlbihpdGVtcywgb3B0cywgaW5kZXgpO1xuXG5cdFx0Ly8gU2F2ZSBsYXN0IGFjdGl2ZSBlbGVtZW50XG5cdFx0aW5zdGFuY2UuJHRyaWdnZXIgPSAkdGFyZ2V0O1xuXHR9XG5cblx0Ly8gQ3JlYXRlIGEgalF1ZXJ5IHBsdWdpblxuXHQvLyA9PT09PT09PT09PT09PT09PT09PT09XG5cblx0JC5mbi5mYW5jeWJveCA9IGZ1bmN0aW9uKG9wdGlvbnMpIHtcblx0XHR2YXIgc2VsZWN0b3I7XG5cblx0XHRvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcblx0XHRzZWxlY3RvciA9IG9wdGlvbnMuc2VsZWN0b3IgfHwgZmFsc2U7XG5cblx0XHRpZiAoc2VsZWN0b3IpIHtcblx0XHRcdC8vIFVzZSBib2R5IGVsZW1lbnQgaW5zdGVhZCBvZiBkb2N1bWVudCBzbyBpdCBleGVjdXRlcyBmaXJzdFxuXHRcdFx0JChcImJvZHlcIilcblx0XHRcdFx0Lm9mZihcImNsaWNrLmZiLXN0YXJ0XCIsIHNlbGVjdG9yKVxuXHRcdFx0XHQub24oXCJjbGljay5mYi1zdGFydFwiLCBzZWxlY3Rvciwge29wdGlvbnM6IG9wdGlvbnN9LCBfcnVuKTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0dGhpcy5vZmYoXCJjbGljay5mYi1zdGFydFwiKS5vbihcblx0XHRcdFx0XCJjbGljay5mYi1zdGFydFwiLFxuXHRcdFx0XHR7XG5cdFx0XHRcdFx0aXRlbXM6IHRoaXMsXG5cdFx0XHRcdFx0b3B0aW9uczogb3B0aW9uc1xuXHRcdFx0XHR9LFxuXHRcdFx0XHRfcnVuXG5cdFx0XHQpO1xuXHRcdH1cblxuXHRcdHJldHVybiB0aGlzO1xuXHR9O1xuXG5cdC8vIFNlbGYgaW5pdGlhbGl6aW5nIHBsdWdpbiBmb3IgYWxsIGVsZW1lbnRzIGhhdmluZyBgZGF0YS1mYW5jeWJveGAgYXR0cmlidXRlXG5cdC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cblx0JEQub24oXCJjbGljay5mYi1zdGFydFwiLCBcIltkYXRhLWZhbmN5Ym94XVwiLCBfcnVuKTtcblxuXHQvLyBFbmFibGUgXCJ0cmlnZ2VyIGVsZW1lbnRzXCJcblx0Ly8gPT09PT09PT09PT09PT09PT09PT09PT09PVxuXG5cdCRELm9uKFwiY2xpY2suZmItc3RhcnRcIiwgXCJbZGF0YS1mYW5jeWJveC10cmlnZ2VyXVwiLCBmdW5jdGlvbihlKSB7XG5cdFx0JCgnW2RhdGEtZmFuY3lib3g9XCInICsgJCh0aGlzKS5hdHRyKFwiZGF0YS1mYW5jeWJveC10cmlnZ2VyXCIpICsgJ1wiXScpXG5cdFx0XHQuZXEoJCh0aGlzKS5hdHRyKFwiZGF0YS1mYW5jeWJveC1pbmRleFwiKSB8fCAwKVxuXHRcdFx0LnRyaWdnZXIoXCJjbGljay5mYi1zdGFydFwiLCB7XG5cdFx0XHRcdCR0cmlnZ2VyOiAkKHRoaXMpXG5cdFx0XHR9KTtcblx0fSk7XG5cblx0Ly8gVHJhY2sgZm9jdXMgZXZlbnQgZm9yIGJldHRlciBhY2Nlc3NpYmlsaXR5IHN0eWxpbmdcblx0Ly8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblx0KGZ1bmN0aW9uKCkge1xuXHRcdHZhciBidXR0b25TdHIgPSBcIi5mYW5jeWJveC1idXR0b25cIixcblx0XHRcdGZvY3VzU3RyID0gXCJmYW5jeWJveC1mb2N1c1wiLFxuXHRcdFx0JHByZXNzZWQgPSBudWxsO1xuXG5cdFx0JEQub24oXCJtb3VzZWRvd24gbW91c2V1cCBmb2N1cyBibHVyXCIsIGJ1dHRvblN0ciwgZnVuY3Rpb24oZSkge1xuXHRcdFx0c3dpdGNoIChlLnR5cGUpIHtcblx0XHRcdFx0Y2FzZSBcIm1vdXNlZG93blwiOlxuXHRcdFx0XHRcdCRwcmVzc2VkID0gJCh0aGlzKTtcblx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0Y2FzZSBcIm1vdXNldXBcIjpcblx0XHRcdFx0XHQkcHJlc3NlZCA9IG51bGw7XG5cdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdGNhc2UgXCJmb2N1c2luXCI6XG5cdFx0XHRcdFx0JChidXR0b25TdHIpLnJlbW92ZUNsYXNzKGZvY3VzU3RyKTtcblxuXHRcdFx0XHRcdGlmICghJCh0aGlzKS5pcygkcHJlc3NlZCkgJiYgISQodGhpcykuaXMoXCJbZGlzYWJsZWRdXCIpKSB7XG5cdFx0XHRcdFx0XHQkKHRoaXMpLmFkZENsYXNzKGZvY3VzU3RyKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdGNhc2UgXCJmb2N1c291dFwiOlxuXHRcdFx0XHRcdCQoYnV0dG9uU3RyKS5yZW1vdmVDbGFzcyhmb2N1c1N0cik7XG5cdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHR9XG5cdFx0fSk7XG5cdH0pKCk7XG59KSh3aW5kb3csIGRvY3VtZW50LCBqUXVlcnkpO1xuXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy9cbi8vIE1lZGlhXG4vLyBBZGRzIGFkZGl0aW9uYWwgbWVkaWEgdHlwZSBzdXBwb3J0XG4vL1xuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbihmdW5jdGlvbigkKSB7XG5cdFwidXNlIHN0cmljdFwiO1xuXG5cdC8vIE9iamVjdCBjb250YWluaW5nIHByb3BlcnRpZXMgZm9yIGVhY2ggbWVkaWEgdHlwZVxuXHR2YXIgZGVmYXVsdHMgPSB7XG5cdFx0eW91dHViZToge1xuXHRcdFx0bWF0Y2hlcjogLyh5b3V0dWJlXFwuY29tfHlvdXR1XFwuYmV8eW91dHViZVxcLW5vY29va2llXFwuY29tKVxcLyh3YXRjaFxcPyguKiYpP3Y9fHZcXC98dVxcL3xlbWJlZFxcLz8pPyh2aWRlb3Nlcmllc1xcP2xpc3Q9KC4qKXxbXFx3LV17MTF9fFxcP2xpc3RUeXBlPSguKikmbGlzdD0oLiopKSguKikvaSxcblx0XHRcdHBhcmFtczoge1xuXHRcdFx0XHRhdXRvcGxheTogMSxcblx0XHRcdFx0YXV0b2hpZGU6IDEsXG5cdFx0XHRcdGZzOiAxLFxuXHRcdFx0XHRyZWw6IDAsXG5cdFx0XHRcdGhkOiAxLFxuXHRcdFx0XHR3bW9kZTogXCJ0cmFuc3BhcmVudFwiLFxuXHRcdFx0XHRlbmFibGVqc2FwaTogMSxcblx0XHRcdFx0aHRtbDU6IDFcblx0XHRcdH0sXG5cdFx0XHRwYXJhbVBsYWNlOiA4LFxuXHRcdFx0dHlwZTogXCJpZnJhbWVcIixcblx0XHRcdHVybDogXCIvL3d3dy55b3V0dWJlLW5vY29va2llLmNvbS9lbWJlZC8kNFwiLFxuXHRcdFx0dGh1bWI6IFwiLy9pbWcueW91dHViZS5jb20vdmkvJDQvaHFkZWZhdWx0LmpwZ1wiXG5cdFx0fSxcblxuXHRcdHZpbWVvOiB7XG5cdFx0XHRtYXRjaGVyOiAvXi4rdmltZW8uY29tXFwvKC4qXFwvKT8oW1xcZF0rKSguKik/Lyxcblx0XHRcdHBhcmFtczoge1xuXHRcdFx0XHRhdXRvcGxheTogMSxcblx0XHRcdFx0aGQ6IDEsXG5cdFx0XHRcdHNob3dfdGl0bGU6IDEsXG5cdFx0XHRcdHNob3dfYnlsaW5lOiAxLFxuXHRcdFx0XHRzaG93X3BvcnRyYWl0OiAwLFxuXHRcdFx0XHRmdWxsc2NyZWVuOiAxXG5cdFx0XHR9LFxuXHRcdFx0cGFyYW1QbGFjZTogMyxcblx0XHRcdHR5cGU6IFwiaWZyYW1lXCIsXG5cdFx0XHR1cmw6IFwiLy9wbGF5ZXIudmltZW8uY29tL3ZpZGVvLyQyXCJcblx0XHR9LFxuXG5cdFx0aW5zdGFncmFtOiB7XG5cdFx0XHRtYXRjaGVyOiAvKGluc3RhZ3JcXC5hbXxpbnN0YWdyYW1cXC5jb20pXFwvcFxcLyhbYS16QS1aMC05X1xcLV0rKVxcLz8vaSxcblx0XHRcdHR5cGU6IFwiaW1hZ2VcIixcblx0XHRcdHVybDogXCIvLyQxL3AvJDIvbWVkaWEvP3NpemU9bFwiXG5cdFx0fSxcblxuXHRcdC8vIEV4YW1wbGVzOlxuXHRcdC8vIGh0dHA6Ly9tYXBzLmdvb2dsZS5jb20vP2xsPTQ4Ljg1Nzk5NSwyLjI5NDI5NyZzcG49MC4wMDc2NjYsMC4wMjExMzYmdD1tJno9MTZcblx0XHQvLyBodHRwczovL3d3dy5nb29nbGUuY29tL21hcHMvQDM3Ljc4NTIwMDYsLTEyMi40MTQ2MzU1LDE0LjY1elxuXHRcdC8vIGh0dHBzOi8vd3d3Lmdvb2dsZS5jb20vbWFwcy9ANTIuMjExMTEyMywyLjkyMzc1NDIsNi42MXo/aGw9ZW5cblx0XHQvLyBodHRwczovL3d3dy5nb29nbGUuY29tL21hcHMvcGxhY2UvR29vZ2xlcGxleC9AMzcuNDIyMDA0MSwtMTIyLjA4MzM0OTQsMTd6L2RhdGE9ITRtNSEzbTQhMXMweDA6MHg2YzI5NmM2NjYxOTM2N2UwIThtMiEzZDM3LjQyMTk5OTghNGQtMTIyLjA4NDA1NzJcblx0XHRnbWFwX3BsYWNlOiB7XG5cdFx0XHRtYXRjaGVyOiAvKG1hcHNcXC4pP2dvb2dsZVxcLihbYS16XXsyLDN9KFxcLlthLXpdezJ9KT8pXFwvKCgobWFwc1xcLyhwbGFjZVxcLyguKilcXC8pP1xcQCguKiksKFxcZCsuP1xcZCs/KXopKXwoXFw/bGw9KSkoLiopPy9pLFxuXHRcdFx0dHlwZTogXCJpZnJhbWVcIixcblx0XHRcdHVybDogZnVuY3Rpb24ocmV6KSB7XG5cdFx0XHRcdHJldHVybiAoXG5cdFx0XHRcdFx0XCIvL21hcHMuZ29vZ2xlLlwiICtcblx0XHRcdFx0XHRyZXpbMl0gK1xuXHRcdFx0XHRcdFwiLz9sbD1cIiArXG5cdFx0XHRcdFx0KHJlels5XSA/IHJlels5XSArIFwiJno9XCIgKyBNYXRoLmZsb29yKHJlelsxMF0pICsgKHJlelsxMl0gPyByZXpbMTJdLnJlcGxhY2UoL15cXC8vLCBcIiZcIikgOiBcIlwiKSA6IHJlelsxMl0gKyBcIlwiKS5yZXBsYWNlKC9cXD8vLCBcIiZcIikgK1xuXHRcdFx0XHRcdFwiJm91dHB1dD1cIiArXG5cdFx0XHRcdFx0KHJlelsxMl0gJiYgcmV6WzEyXS5pbmRleE9mKFwibGF5ZXI9Y1wiKSA+IDAgPyBcInN2ZW1iZWRcIiA6IFwiZW1iZWRcIilcblx0XHRcdFx0KTtcblx0XHRcdH1cblx0XHR9LFxuXG5cdFx0Ly8gRXhhbXBsZXM6XG5cdFx0Ly8gaHR0cHM6Ly93d3cuZ29vZ2xlLmNvbS9tYXBzL3NlYXJjaC9FbXBpcmUrU3RhdGUrQnVpbGRpbmcvXG5cdFx0Ly8gaHR0cHM6Ly93d3cuZ29vZ2xlLmNvbS9tYXBzL3NlYXJjaC8/YXBpPTEmcXVlcnk9Y2VudHVyeWxpbmsrZmllbGRcblx0XHQvLyBodHRwczovL3d3dy5nb29nbGUuY29tL21hcHMvc2VhcmNoLz9hcGk9MSZxdWVyeT00Ny41OTUxNTE4LC0xMjIuMzMxNjM5M1xuXHRcdGdtYXBfc2VhcmNoOiB7XG5cdFx0XHRtYXRjaGVyOiAvKG1hcHNcXC4pP2dvb2dsZVxcLihbYS16XXsyLDN9KFxcLlthLXpdezJ9KT8pXFwvKG1hcHNcXC9zZWFyY2hcXC8pKC4qKS9pLFxuXHRcdFx0dHlwZTogXCJpZnJhbWVcIixcblx0XHRcdHVybDogZnVuY3Rpb24ocmV6KSB7XG5cdFx0XHRcdHJldHVybiBcIi8vbWFwcy5nb29nbGUuXCIgKyByZXpbMl0gKyBcIi9tYXBzP3E9XCIgKyByZXpbNV0ucmVwbGFjZShcInF1ZXJ5PVwiLCBcInE9XCIpLnJlcGxhY2UoXCJhcGk9MVwiLCBcIlwiKSArIFwiJm91dHB1dD1lbWJlZFwiO1xuXHRcdFx0fVxuXHRcdH1cblx0fTtcblxuXHQvLyBGb3JtYXRzIG1hdGNoaW5nIHVybCB0byBmaW5hbCBmb3JtXG5cdHZhciBmb3JtYXQgPSBmdW5jdGlvbih1cmwsIHJleiwgcGFyYW1zKSB7XG5cdFx0aWYgKCF1cmwpIHtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cblx0XHRwYXJhbXMgPSBwYXJhbXMgfHwgXCJcIjtcblxuXHRcdGlmICgkLnR5cGUocGFyYW1zKSA9PT0gXCJvYmplY3RcIikge1xuXHRcdFx0cGFyYW1zID0gJC5wYXJhbShwYXJhbXMsIHRydWUpO1xuXHRcdH1cblxuXHRcdCQuZWFjaChyZXosIGZ1bmN0aW9uKGtleSwgdmFsdWUpIHtcblx0XHRcdHVybCA9IHVybC5yZXBsYWNlKFwiJFwiICsga2V5LCB2YWx1ZSB8fCBcIlwiKTtcblx0XHR9KTtcblxuXHRcdGlmIChwYXJhbXMubGVuZ3RoKSB7XG5cdFx0XHR1cmwgKz0gKHVybC5pbmRleE9mKFwiP1wiKSA+IDAgPyBcIiZcIiA6IFwiP1wiKSArIHBhcmFtcztcblx0XHR9XG5cblx0XHRyZXR1cm4gdXJsO1xuXHR9O1xuXG5cdCQoZG9jdW1lbnQpLm9uKFwib2JqZWN0TmVlZHNUeXBlLmZiXCIsIGZ1bmN0aW9uKGUsIGluc3RhbmNlLCBpdGVtKSB7XG5cdFx0dmFyIHVybCA9IGl0ZW0uc3JjIHx8IFwiXCIsXG5cdFx0XHR0eXBlID0gZmFsc2UsXG5cdFx0XHRtZWRpYSxcblx0XHRcdHRodW1iLFxuXHRcdFx0cmV6LFxuXHRcdFx0cGFyYW1zLFxuXHRcdFx0dXJsUGFyYW1zLFxuXHRcdFx0cGFyYW1PYmosXG5cdFx0XHRwcm92aWRlcjtcblxuXHRcdG1lZGlhID0gJC5leHRlbmQodHJ1ZSwge30sIGRlZmF1bHRzLCBpdGVtLm9wdHMubWVkaWEpO1xuXG5cdFx0Ly8gTG9vayBmb3IgYW55IG1hdGNoaW5nIG1lZGlhIHR5cGVcblx0XHQkLmVhY2gobWVkaWEsIGZ1bmN0aW9uKHByb3ZpZGVyTmFtZSwgcHJvdmlkZXJPcHRzKSB7XG5cdFx0XHRyZXogPSB1cmwubWF0Y2gocHJvdmlkZXJPcHRzLm1hdGNoZXIpO1xuXG5cdFx0XHRpZiAoIXJleikge1xuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR9XG5cblx0XHRcdHR5cGUgPSBwcm92aWRlck9wdHMudHlwZTtcblx0XHRcdHByb3ZpZGVyID0gcHJvdmlkZXJOYW1lO1xuXHRcdFx0cGFyYW1PYmogPSB7fTtcblxuXHRcdFx0aWYgKHByb3ZpZGVyT3B0cy5wYXJhbVBsYWNlICYmIHJleltwcm92aWRlck9wdHMucGFyYW1QbGFjZV0pIHtcblx0XHRcdFx0dXJsUGFyYW1zID0gcmV6W3Byb3ZpZGVyT3B0cy5wYXJhbVBsYWNlXTtcblxuXHRcdFx0XHRpZiAodXJsUGFyYW1zWzBdID09IFwiP1wiKSB7XG5cdFx0XHRcdFx0dXJsUGFyYW1zID0gdXJsUGFyYW1zLnN1YnN0cmluZygxKTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdHVybFBhcmFtcyA9IHVybFBhcmFtcy5zcGxpdChcIiZcIik7XG5cblx0XHRcdFx0Zm9yICh2YXIgbSA9IDA7IG0gPCB1cmxQYXJhbXMubGVuZ3RoOyArK20pIHtcblx0XHRcdFx0XHR2YXIgcCA9IHVybFBhcmFtc1ttXS5zcGxpdChcIj1cIiwgMik7XG5cblx0XHRcdFx0XHRpZiAocC5sZW5ndGggPT0gMikge1xuXHRcdFx0XHRcdFx0cGFyYW1PYmpbcFswXV0gPSBkZWNvZGVVUklDb21wb25lbnQocFsxXS5yZXBsYWNlKC9cXCsvZywgXCIgXCIpKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdH1cblxuXHRcdFx0cGFyYW1zID0gJC5leHRlbmQodHJ1ZSwge30sIHByb3ZpZGVyT3B0cy5wYXJhbXMsIGl0ZW0ub3B0c1twcm92aWRlck5hbWVdLCBwYXJhbU9iaik7XG5cblx0XHRcdHVybCA9XG5cdFx0XHRcdCQudHlwZShwcm92aWRlck9wdHMudXJsKSA9PT0gXCJmdW5jdGlvblwiID8gcHJvdmlkZXJPcHRzLnVybC5jYWxsKHRoaXMsIHJleiwgcGFyYW1zLCBpdGVtKSA6IGZvcm1hdChwcm92aWRlck9wdHMudXJsLCByZXosIHBhcmFtcyk7XG5cblx0XHRcdHRodW1iID1cblx0XHRcdFx0JC50eXBlKHByb3ZpZGVyT3B0cy50aHVtYikgPT09IFwiZnVuY3Rpb25cIiA/IHByb3ZpZGVyT3B0cy50aHVtYi5jYWxsKHRoaXMsIHJleiwgcGFyYW1zLCBpdGVtKSA6IGZvcm1hdChwcm92aWRlck9wdHMudGh1bWIsIHJleik7XG5cblx0XHRcdGlmIChwcm92aWRlck5hbWUgPT09IFwieW91dHViZVwiKSB7XG5cdFx0XHRcdHVybCA9IHVybC5yZXBsYWNlKC8mdD0oKFxcZCspbSk/KFxcZCspcy8sIGZ1bmN0aW9uKG1hdGNoLCBwMSwgbSwgcykge1xuXHRcdFx0XHRcdHJldHVybiBcIiZzdGFydD1cIiArICgobSA/IHBhcnNlSW50KG0sIDEwKSAqIDYwIDogMCkgKyBwYXJzZUludChzLCAxMCkpO1xuXHRcdFx0XHR9KTtcblx0XHRcdH0gZWxzZSBpZiAocHJvdmlkZXJOYW1lID09PSBcInZpbWVvXCIpIHtcblx0XHRcdFx0dXJsID0gdXJsLnJlcGxhY2UoXCImJTIzXCIsIFwiI1wiKTtcblx0XHRcdH1cblxuXHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdH0pO1xuXG5cdFx0Ly8gSWYgaXQgaXMgZm91bmQsIHRoZW4gY2hhbmdlIGNvbnRlbnQgdHlwZSBhbmQgdXBkYXRlIHRoZSB1cmxcblxuXHRcdGlmICh0eXBlKSB7XG5cdFx0XHRpZiAoIWl0ZW0ub3B0cy50aHVtYiAmJiAhKGl0ZW0ub3B0cy4kdGh1bWIgJiYgaXRlbS5vcHRzLiR0aHVtYi5sZW5ndGgpKSB7XG5cdFx0XHRcdGl0ZW0ub3B0cy50aHVtYiA9IHRodW1iO1xuXHRcdFx0fVxuXG5cdFx0XHRpZiAodHlwZSA9PT0gXCJpZnJhbWVcIikge1xuXHRcdFx0XHRpdGVtLm9wdHMgPSAkLmV4dGVuZCh0cnVlLCBpdGVtLm9wdHMsIHtcblx0XHRcdFx0XHRpZnJhbWU6IHtcblx0XHRcdFx0XHRcdHByZWxvYWQ6IGZhbHNlLFxuXHRcdFx0XHRcdFx0YXR0cjoge1xuXHRcdFx0XHRcdFx0XHRzY3JvbGxpbmc6IFwibm9cIlxuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0fSk7XG5cdFx0XHR9XG5cblx0XHRcdCQuZXh0ZW5kKGl0ZW0sIHtcblx0XHRcdFx0dHlwZTogdHlwZSxcblx0XHRcdFx0c3JjOiB1cmwsXG5cdFx0XHRcdG9yaWdTcmM6IGl0ZW0uc3JjLFxuXHRcdFx0XHRjb250ZW50U291cmNlOiBwcm92aWRlcixcblx0XHRcdFx0Y29udGVudFR5cGU6IHR5cGUgPT09IFwiaW1hZ2VcIiA/IFwiaW1hZ2VcIiA6IHByb3ZpZGVyID09IFwiZ21hcF9wbGFjZVwiIHx8IHByb3ZpZGVyID09IFwiZ21hcF9zZWFyY2hcIiA/IFwibWFwXCIgOiBcInZpZGVvXCJcblx0XHRcdH0pO1xuXHRcdH0gZWxzZSBpZiAodXJsKSB7XG5cdFx0XHRpdGVtLnR5cGUgPSBpdGVtLm9wdHMuZGVmYXVsdFR5cGU7XG5cdFx0fVxuXHR9KTtcblxuXHQvLyBMb2FkIFlvdVR1YmUvVmlkZW8gQVBJIG9uIHJlcXVlc3QgdG8gZGV0ZWN0IHdoZW4gdmlkZW8gZmluaXNoZWQgcGxheWluZ1xuXHR2YXIgVmlkZW9BUElMb2FkZXIgPSB7XG5cdFx0eW91dHViZToge1xuXHRcdFx0c3JjOiBcImh0dHBzOi8vd3d3LnlvdXR1YmUuY29tL2lmcmFtZV9hcGlcIixcblx0XHRcdGNsYXNzOiBcIllUXCIsXG5cdFx0XHRsb2FkaW5nOiBmYWxzZSxcblx0XHRcdGxvYWRlZDogZmFsc2Vcblx0XHR9LFxuXG5cdFx0dmltZW86IHtcblx0XHRcdHNyYzogXCJodHRwczovL3BsYXllci52aW1lby5jb20vYXBpL3BsYXllci5qc1wiLFxuXHRcdFx0Y2xhc3M6IFwiVmltZW9cIixcblx0XHRcdGxvYWRpbmc6IGZhbHNlLFxuXHRcdFx0bG9hZGVkOiBmYWxzZVxuXHRcdH0sXG5cblx0XHRsb2FkOiBmdW5jdGlvbih2ZW5kb3IpIHtcblx0XHRcdHZhciBfdGhpcyA9IHRoaXMsXG5cdFx0XHRcdHNjcmlwdDtcblxuXHRcdFx0aWYgKHRoaXNbdmVuZG9yXS5sb2FkZWQpIHtcblx0XHRcdFx0c2V0VGltZW91dChmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRfdGhpcy5kb25lKHZlbmRvcik7XG5cdFx0XHRcdH0pO1xuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR9XG5cblx0XHRcdGlmICh0aGlzW3ZlbmRvcl0ubG9hZGluZykge1xuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR9XG5cblx0XHRcdHRoaXNbdmVuZG9yXS5sb2FkaW5nID0gdHJ1ZTtcblxuXHRcdFx0c2NyaXB0ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcInNjcmlwdFwiKTtcblx0XHRcdHNjcmlwdC50eXBlID0gXCJ0ZXh0L2phdmFzY3JpcHRcIjtcblx0XHRcdHNjcmlwdC5zcmMgPSB0aGlzW3ZlbmRvcl0uc3JjO1xuXG5cdFx0XHRpZiAodmVuZG9yID09PSBcInlvdXR1YmVcIikge1xuXHRcdFx0XHR3aW5kb3cub25Zb3VUdWJlSWZyYW1lQVBJUmVhZHkgPSBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRfdGhpc1t2ZW5kb3JdLmxvYWRlZCA9IHRydWU7XG5cdFx0XHRcdFx0X3RoaXMuZG9uZSh2ZW5kb3IpO1xuXHRcdFx0XHR9O1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0c2NyaXB0Lm9ubG9hZCA9IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdF90aGlzW3ZlbmRvcl0ubG9hZGVkID0gdHJ1ZTtcblx0XHRcdFx0XHRfdGhpcy5kb25lKHZlbmRvcik7XG5cdFx0XHRcdH07XG5cdFx0XHR9XG5cblx0XHRcdGRvY3VtZW50LmJvZHkuYXBwZW5kQ2hpbGQoc2NyaXB0KTtcblx0XHR9LFxuXHRcdGRvbmU6IGZ1bmN0aW9uKHZlbmRvcikge1xuXHRcdFx0dmFyIGluc3RhbmNlLCAkZWwsIHBsYXllcjtcblxuXHRcdFx0aWYgKHZlbmRvciA9PT0gXCJ5b3V0dWJlXCIpIHtcblx0XHRcdFx0ZGVsZXRlIHdpbmRvdy5vbllvdVR1YmVJZnJhbWVBUElSZWFkeTtcblx0XHRcdH1cblxuXHRcdFx0aW5zdGFuY2UgPSAkLmZhbmN5Ym94LmdldEluc3RhbmNlKCk7XG5cblx0XHRcdGlmIChpbnN0YW5jZSkge1xuXHRcdFx0XHQkZWwgPSBpbnN0YW5jZS5jdXJyZW50LiRjb250ZW50LmZpbmQoXCJpZnJhbWVcIik7XG5cblx0XHRcdFx0aWYgKHZlbmRvciA9PT0gXCJ5b3V0dWJlXCIgJiYgWVQgIT09IHVuZGVmaW5lZCAmJiBZVCkge1xuXHRcdFx0XHRcdHBsYXllciA9IG5ldyBZVC5QbGF5ZXIoJGVsLmF0dHIoXCJpZFwiKSwge1xuXHRcdFx0XHRcdFx0ZXZlbnRzOiB7XG5cdFx0XHRcdFx0XHRcdG9uU3RhdGVDaGFuZ2U6IGZ1bmN0aW9uKGUpIHtcblx0XHRcdFx0XHRcdFx0XHRpZiAoZS5kYXRhID09IDApIHtcblx0XHRcdFx0XHRcdFx0XHRcdGluc3RhbmNlLm5leHQoKTtcblx0XHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHR9KTtcblx0XHRcdFx0fSBlbHNlIGlmICh2ZW5kb3IgPT09IFwidmltZW9cIiAmJiBWaW1lbyAhPT0gdW5kZWZpbmVkICYmIFZpbWVvKSB7XG5cdFx0XHRcdFx0cGxheWVyID0gbmV3IFZpbWVvLlBsYXllcigkZWwpO1xuXG5cdFx0XHRcdFx0cGxheWVyLm9uKFwiZW5kZWRcIiwgZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0XHRpbnN0YW5jZS5uZXh0KCk7XG5cdFx0XHRcdFx0fSk7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9XG5cdH07XG5cblx0JChkb2N1bWVudCkub24oe1xuXHRcdFwiYWZ0ZXJTaG93LmZiXCI6IGZ1bmN0aW9uKGUsIGluc3RhbmNlLCBjdXJyZW50KSB7XG5cdFx0XHRpZiAoaW5zdGFuY2UuZ3JvdXAubGVuZ3RoID4gMSAmJiAoY3VycmVudC5jb250ZW50U291cmNlID09PSBcInlvdXR1YmVcIiB8fCBjdXJyZW50LmNvbnRlbnRTb3VyY2UgPT09IFwidmltZW9cIikpIHtcblx0XHRcdFx0VmlkZW9BUElMb2FkZXIubG9hZChjdXJyZW50LmNvbnRlbnRTb3VyY2UpO1xuXHRcdFx0fVxuXHRcdH1cblx0fSk7XG59KShqUXVlcnkpO1xuXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy9cbi8vIEd1ZXN0dXJlc1xuLy8gQWRkcyB0b3VjaCBndWVzdHVyZXMsIGhhbmRsZXMgY2xpY2sgYW5kIHRhcCBldmVudHNcbi8vXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuKGZ1bmN0aW9uKHdpbmRvdywgZG9jdW1lbnQsICQpIHtcblx0XCJ1c2Ugc3RyaWN0XCI7XG5cblx0dmFyIHJlcXVlc3RBRnJhbWUgPSAoZnVuY3Rpb24oKSB7XG5cdFx0cmV0dXJuIChcblx0XHRcdHdpbmRvdy5yZXF1ZXN0QW5pbWF0aW9uRnJhbWUgfHxcblx0XHRcdHdpbmRvdy53ZWJraXRSZXF1ZXN0QW5pbWF0aW9uRnJhbWUgfHxcblx0XHRcdHdpbmRvdy5tb3pSZXF1ZXN0QW5pbWF0aW9uRnJhbWUgfHxcblx0XHRcdHdpbmRvdy5vUmVxdWVzdEFuaW1hdGlvbkZyYW1lIHx8XG5cdFx0XHQvLyBpZiBhbGwgZWxzZSBmYWlscywgdXNlIHNldFRpbWVvdXRcblx0XHRcdGZ1bmN0aW9uKGNhbGxiYWNrKSB7XG5cdFx0XHRcdHJldHVybiB3aW5kb3cuc2V0VGltZW91dChjYWxsYmFjaywgMTAwMCAvIDYwKTtcblx0XHRcdH1cblx0XHQpO1xuXHR9KSgpO1xuXG5cdHZhciBjYW5jZWxBRnJhbWUgPSAoZnVuY3Rpb24oKSB7XG5cdFx0cmV0dXJuIChcblx0XHRcdHdpbmRvdy5jYW5jZWxBbmltYXRpb25GcmFtZSB8fFxuXHRcdFx0d2luZG93LndlYmtpdENhbmNlbEFuaW1hdGlvbkZyYW1lIHx8XG5cdFx0XHR3aW5kb3cubW96Q2FuY2VsQW5pbWF0aW9uRnJhbWUgfHxcblx0XHRcdHdpbmRvdy5vQ2FuY2VsQW5pbWF0aW9uRnJhbWUgfHxcblx0XHRcdGZ1bmN0aW9uKGlkKSB7XG5cdFx0XHRcdHdpbmRvdy5jbGVhclRpbWVvdXQoaWQpO1xuXHRcdFx0fVxuXHRcdCk7XG5cdH0pKCk7XG5cblx0dmFyIGdldFBvaW50ZXJYWSA9IGZ1bmN0aW9uKGUpIHtcblx0XHR2YXIgcmVzdWx0ID0gW107XG5cblx0XHRlID0gZS5vcmlnaW5hbEV2ZW50IHx8IGUgfHwgd2luZG93LmU7XG5cdFx0ZSA9IGUudG91Y2hlcyAmJiBlLnRvdWNoZXMubGVuZ3RoID8gZS50b3VjaGVzIDogZS5jaGFuZ2VkVG91Y2hlcyAmJiBlLmNoYW5nZWRUb3VjaGVzLmxlbmd0aCA/IGUuY2hhbmdlZFRvdWNoZXMgOiBbZV07XG5cblx0XHRmb3IgKHZhciBrZXkgaW4gZSkge1xuXHRcdFx0aWYgKGVba2V5XS5wYWdlWCkge1xuXHRcdFx0XHRyZXN1bHQucHVzaCh7XG5cdFx0XHRcdFx0eDogZVtrZXldLnBhZ2VYLFxuXHRcdFx0XHRcdHk6IGVba2V5XS5wYWdlWVxuXHRcdFx0XHR9KTtcblx0XHRcdH0gZWxzZSBpZiAoZVtrZXldLmNsaWVudFgpIHtcblx0XHRcdFx0cmVzdWx0LnB1c2goe1xuXHRcdFx0XHRcdHg6IGVba2V5XS5jbGllbnRYLFxuXHRcdFx0XHRcdHk6IGVba2V5XS5jbGllbnRZXG5cdFx0XHRcdH0pO1xuXHRcdFx0fVxuXHRcdH1cblxuXHRcdHJldHVybiByZXN1bHQ7XG5cdH07XG5cblx0dmFyIGRpc3RhbmNlID0gZnVuY3Rpb24ocG9pbnQyLCBwb2ludDEsIHdoYXQpIHtcblx0XHRpZiAoIXBvaW50MSB8fCAhcG9pbnQyKSB7XG5cdFx0XHRyZXR1cm4gMDtcblx0XHR9XG5cblx0XHRpZiAod2hhdCA9PT0gXCJ4XCIpIHtcblx0XHRcdHJldHVybiBwb2ludDIueCAtIHBvaW50MS54O1xuXHRcdH0gZWxzZSBpZiAod2hhdCA9PT0gXCJ5XCIpIHtcblx0XHRcdHJldHVybiBwb2ludDIueSAtIHBvaW50MS55O1xuXHRcdH1cblxuXHRcdHJldHVybiBNYXRoLnNxcnQoTWF0aC5wb3cocG9pbnQyLnggLSBwb2ludDEueCwgMikgKyBNYXRoLnBvdyhwb2ludDIueSAtIHBvaW50MS55LCAyKSk7XG5cdH07XG5cblx0dmFyIGlzQ2xpY2thYmxlID0gZnVuY3Rpb24oJGVsKSB7XG5cdFx0aWYgKFxuXHRcdFx0JGVsLmlzKCdhLGFyZWEsYnV0dG9uLFtyb2xlPVwiYnV0dG9uXCJdLGlucHV0LGxhYmVsLHNlbGVjdCxzdW1tYXJ5LHRleHRhcmVhLHZpZGVvLGF1ZGlvLGlmcmFtZScpIHx8XG5cdFx0XHQkLmlzRnVuY3Rpb24oJGVsLmdldCgwKS5vbmNsaWNrKSB8fFxuXHRcdFx0JGVsLmRhdGEoXCJzZWxlY3RhYmxlXCIpXG5cdFx0KSB7XG5cdFx0XHRyZXR1cm4gdHJ1ZTtcblx0XHR9XG5cblx0XHQvLyBDaGVjayBmb3IgYXR0cmlidXRlcyBsaWtlIGRhdGEtZmFuY3lib3gtbmV4dCBvciBkYXRhLWZhbmN5Ym94LWNsb3NlXG5cdFx0Zm9yICh2YXIgaSA9IDAsIGF0dHMgPSAkZWxbMF0uYXR0cmlidXRlcywgbiA9IGF0dHMubGVuZ3RoOyBpIDwgbjsgaSsrKSB7XG5cdFx0XHRpZiAoYXR0c1tpXS5ub2RlTmFtZS5zdWJzdHIoMCwgMTQpID09PSBcImRhdGEtZmFuY3lib3gtXCIpIHtcblx0XHRcdFx0cmV0dXJuIHRydWU7XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0cmV0dXJuIGZhbHNlO1xuXHR9O1xuXG5cdHZhciBoYXNTY3JvbGxiYXJzID0gZnVuY3Rpb24oZWwpIHtcblx0XHR2YXIgb3ZlcmZsb3dZID0gd2luZG93LmdldENvbXB1dGVkU3R5bGUoZWwpW1wib3ZlcmZsb3cteVwiXSxcblx0XHRcdG92ZXJmbG93WCA9IHdpbmRvdy5nZXRDb21wdXRlZFN0eWxlKGVsKVtcIm92ZXJmbG93LXhcIl0sXG5cdFx0XHR2ZXJ0aWNhbCA9IChvdmVyZmxvd1kgPT09IFwic2Nyb2xsXCIgfHwgb3ZlcmZsb3dZID09PSBcImF1dG9cIikgJiYgZWwuc2Nyb2xsSGVpZ2h0ID4gZWwuY2xpZW50SGVpZ2h0LFxuXHRcdFx0aG9yaXpvbnRhbCA9IChvdmVyZmxvd1ggPT09IFwic2Nyb2xsXCIgfHwgb3ZlcmZsb3dYID09PSBcImF1dG9cIikgJiYgZWwuc2Nyb2xsV2lkdGggPiBlbC5jbGllbnRXaWR0aDtcblxuXHRcdHJldHVybiB2ZXJ0aWNhbCB8fCBob3Jpem9udGFsO1xuXHR9O1xuXG5cdHZhciBpc1Njcm9sbGFibGUgPSBmdW5jdGlvbigkZWwpIHtcblx0XHR2YXIgcmV6ID0gZmFsc2U7XG5cblx0XHR3aGlsZSAodHJ1ZSkge1xuXHRcdFx0cmV6ID0gaGFzU2Nyb2xsYmFycygkZWwuZ2V0KDApKTtcblxuXHRcdFx0aWYgKHJleikge1xuXHRcdFx0XHRicmVhaztcblx0XHRcdH1cblxuXHRcdFx0JGVsID0gJGVsLnBhcmVudCgpO1xuXG5cdFx0XHRpZiAoISRlbC5sZW5ndGggfHwgJGVsLmhhc0NsYXNzKFwiZmFuY3lib3gtc3RhZ2VcIikgfHwgJGVsLmlzKFwiYm9keVwiKSkge1xuXHRcdFx0XHRicmVhaztcblx0XHRcdH1cblx0XHR9XG5cblx0XHRyZXR1cm4gcmV6O1xuXHR9O1xuXG5cdHZhciBHdWVzdHVyZXMgPSBmdW5jdGlvbihpbnN0YW5jZSkge1xuXHRcdHZhciBzZWxmID0gdGhpcztcblxuXHRcdHNlbGYuaW5zdGFuY2UgPSBpbnN0YW5jZTtcblxuXHRcdHNlbGYuJGJnID0gaW5zdGFuY2UuJHJlZnMuYmc7XG5cdFx0c2VsZi4kc3RhZ2UgPSBpbnN0YW5jZS4kcmVmcy5zdGFnZTtcblx0XHRzZWxmLiRjb250YWluZXIgPSBpbnN0YW5jZS4kcmVmcy5jb250YWluZXI7XG5cblx0XHRzZWxmLmRlc3Ryb3koKTtcblxuXHRcdHNlbGYuJGNvbnRhaW5lci5vbihcInRvdWNoc3RhcnQuZmIudG91Y2ggbW91c2Vkb3duLmZiLnRvdWNoXCIsICQucHJveHkoc2VsZiwgXCJvbnRvdWNoc3RhcnRcIikpO1xuXHR9O1xuXG5cdEd1ZXN0dXJlcy5wcm90b3R5cGUuZGVzdHJveSA9IGZ1bmN0aW9uKCkge1xuXHRcdHZhciBzZWxmID0gdGhpcztcblxuXHRcdHNlbGYuJGNvbnRhaW5lci5vZmYoXCIuZmIudG91Y2hcIik7XG5cblx0XHQkKGRvY3VtZW50KS5vZmYoXCIuZmIudG91Y2hcIik7XG5cblx0XHRpZiAoc2VsZi5yZXF1ZXN0SWQpIHtcblx0XHRcdGNhbmNlbEFGcmFtZShzZWxmLnJlcXVlc3RJZCk7XG5cdFx0XHRzZWxmLnJlcXVlc3RJZCA9IG51bGw7XG5cdFx0fVxuXG5cdFx0aWYgKHNlbGYudGFwcGVkKSB7XG5cdFx0XHRjbGVhclRpbWVvdXQoc2VsZi50YXBwZWQpO1xuXHRcdFx0c2VsZi50YXBwZWQgPSBudWxsO1xuXHRcdH1cblx0fTtcblxuXHRHdWVzdHVyZXMucHJvdG90eXBlLm9udG91Y2hzdGFydCA9IGZ1bmN0aW9uKGUpIHtcblx0XHR2YXIgc2VsZiA9IHRoaXMsXG5cdFx0XHQkdGFyZ2V0ID0gJChlLnRhcmdldCksXG5cdFx0XHRpbnN0YW5jZSA9IHNlbGYuaW5zdGFuY2UsXG5cdFx0XHRjdXJyZW50ID0gaW5zdGFuY2UuY3VycmVudCxcblx0XHRcdCRzbGlkZSA9IGN1cnJlbnQuJHNsaWRlLFxuXHRcdFx0JGNvbnRlbnQgPSBjdXJyZW50LiRjb250ZW50LFxuXHRcdFx0aXNUb3VjaERldmljZSA9IGUudHlwZSA9PSBcInRvdWNoc3RhcnRcIjtcblxuXHRcdC8vIERvIG5vdCByZXNwb25kIHRvIGJvdGggKHRvdWNoIGFuZCBtb3VzZSkgZXZlbnRzXG5cdFx0aWYgKGlzVG91Y2hEZXZpY2UpIHtcblx0XHRcdHNlbGYuJGNvbnRhaW5lci5vZmYoXCJtb3VzZWRvd24uZmIudG91Y2hcIik7XG5cdFx0fVxuXG5cdFx0Ly8gSWdub3JlIHJpZ2h0IGNsaWNrXG5cdFx0aWYgKGUub3JpZ2luYWxFdmVudCAmJiBlLm9yaWdpbmFsRXZlbnQuYnV0dG9uID09IDIpIHtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cblx0XHQvLyBJZ25vcmUgdGFwaW5nIG9uIGxpbmtzLCBidXR0b25zLCBpbnB1dCBlbGVtZW50c1xuXHRcdGlmICghJHNsaWRlLmxlbmd0aCB8fCAhJHRhcmdldC5sZW5ndGggfHwgaXNDbGlja2FibGUoJHRhcmdldCkgfHwgaXNDbGlja2FibGUoJHRhcmdldC5wYXJlbnQoKSkpIHtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cdFx0Ly8gSWdub3JlIGNsaWNrcyBvbiB0aGUgc2Nyb2xsYmFyXG5cdFx0aWYgKCEkdGFyZ2V0LmlzKFwiaW1nXCIpICYmIGUub3JpZ2luYWxFdmVudC5jbGllbnRYID4gJHRhcmdldFswXS5jbGllbnRXaWR0aCArICR0YXJnZXQub2Zmc2V0KCkubGVmdCkge1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblxuXHRcdC8vIElnbm9yZSBjbGlja3Mgd2hpbGUgem9vbWluZyBvciBjbG9zaW5nXG5cdFx0aWYgKCFjdXJyZW50IHx8IGluc3RhbmNlLmlzQW5pbWF0aW5nIHx8IGN1cnJlbnQuJHNsaWRlLmhhc0NsYXNzKFwiZmFuY3lib3gtYW5pbWF0ZWRcIikpIHtcblx0XHRcdGUuc3RvcFByb3BhZ2F0aW9uKCk7XG5cdFx0XHRlLnByZXZlbnREZWZhdWx0KCk7XG5cblx0XHRcdHJldHVybjtcblx0XHR9XG5cblx0XHRzZWxmLnJlYWxQb2ludHMgPSBzZWxmLnN0YXJ0UG9pbnRzID0gZ2V0UG9pbnRlclhZKGUpO1xuXG5cdFx0aWYgKCFzZWxmLnN0YXJ0UG9pbnRzLmxlbmd0aCkge1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblxuXHRcdC8vIEFsbG93IG90aGVyIHNjcmlwdHMgdG8gY2F0Y2ggdG91Y2ggZXZlbnQgaWYgXCJ0b3VjaFwiIGlzIHNldCB0byBmYWxzZVxuXHRcdGlmIChjdXJyZW50LnRvdWNoKSB7XG5cdFx0XHRlLnN0b3BQcm9wYWdhdGlvbigpO1xuXHRcdH1cblxuXHRcdHNlbGYuc3RhcnRFdmVudCA9IGU7XG5cblx0XHRzZWxmLmNhblRhcCA9IHRydWU7XG5cdFx0c2VsZi4kdGFyZ2V0ID0gJHRhcmdldDtcblx0XHRzZWxmLiRjb250ZW50ID0gJGNvbnRlbnQ7XG5cdFx0c2VsZi5vcHRzID0gY3VycmVudC5vcHRzLnRvdWNoO1xuXG5cdFx0c2VsZi5pc1Bhbm5pbmcgPSBmYWxzZTtcblx0XHRzZWxmLmlzU3dpcGluZyA9IGZhbHNlO1xuXHRcdHNlbGYuaXNab29taW5nID0gZmFsc2U7XG5cdFx0c2VsZi5pc1Njcm9sbGluZyA9IGZhbHNlO1xuXHRcdHNlbGYuY2FuUGFuID0gaW5zdGFuY2UuY2FuUGFuKCk7XG5cblx0XHRzZWxmLnN0YXJ0VGltZSA9IG5ldyBEYXRlKCkuZ2V0VGltZSgpO1xuXHRcdHNlbGYuZGlzdGFuY2VYID0gc2VsZi5kaXN0YW5jZVkgPSBzZWxmLmRpc3RhbmNlID0gMDtcblxuXHRcdHNlbGYuY2FudmFzV2lkdGggPSBNYXRoLnJvdW5kKCRzbGlkZVswXS5jbGllbnRXaWR0aCk7XG5cdFx0c2VsZi5jYW52YXNIZWlnaHQgPSBNYXRoLnJvdW5kKCRzbGlkZVswXS5jbGllbnRIZWlnaHQpO1xuXG5cdFx0c2VsZi5jb250ZW50TGFzdFBvcyA9IG51bGw7XG5cdFx0c2VsZi5jb250ZW50U3RhcnRQb3MgPSAkLmZhbmN5Ym94LmdldFRyYW5zbGF0ZShzZWxmLiRjb250ZW50KSB8fCB7dG9wOiAwLCBsZWZ0OiAwfTtcblx0XHRzZWxmLnNsaWRlclN0YXJ0UG9zID0gJC5mYW5jeWJveC5nZXRUcmFuc2xhdGUoJHNsaWRlKTtcblxuXHRcdC8vIFNpbmNlIHBvc2l0aW9uIHdpbGwgYmUgYWJzb2x1dGUsIGJ1dCB3ZSBuZWVkIHRvIG1ha2UgaXQgcmVsYXRpdmUgdG8gdGhlIHN0YWdlXG5cdFx0c2VsZi5zdGFnZVBvcyA9ICQuZmFuY3lib3guZ2V0VHJhbnNsYXRlKGluc3RhbmNlLiRyZWZzLnN0YWdlKTtcblxuXHRcdHNlbGYuc2xpZGVyU3RhcnRQb3MudG9wIC09IHNlbGYuc3RhZ2VQb3MudG9wO1xuXHRcdHNlbGYuc2xpZGVyU3RhcnRQb3MubGVmdCAtPSBzZWxmLnN0YWdlUG9zLmxlZnQ7XG5cblx0XHRzZWxmLmNvbnRlbnRTdGFydFBvcy50b3AgLT0gc2VsZi5zdGFnZVBvcy50b3A7XG5cdFx0c2VsZi5jb250ZW50U3RhcnRQb3MubGVmdCAtPSBzZWxmLnN0YWdlUG9zLmxlZnQ7XG5cblx0XHQkKGRvY3VtZW50KVxuXHRcdFx0Lm9mZihcIi5mYi50b3VjaFwiKVxuXHRcdFx0Lm9uKGlzVG91Y2hEZXZpY2UgPyBcInRvdWNoZW5kLmZiLnRvdWNoIHRvdWNoY2FuY2VsLmZiLnRvdWNoXCIgOiBcIm1vdXNldXAuZmIudG91Y2ggbW91c2VsZWF2ZS5mYi50b3VjaFwiLCAkLnByb3h5KHNlbGYsIFwib250b3VjaGVuZFwiKSlcblx0XHRcdC5vbihpc1RvdWNoRGV2aWNlID8gXCJ0b3VjaG1vdmUuZmIudG91Y2hcIiA6IFwibW91c2Vtb3ZlLmZiLnRvdWNoXCIsICQucHJveHkoc2VsZiwgXCJvbnRvdWNobW92ZVwiKSk7XG5cblx0XHRpZiAoJC5mYW5jeWJveC5pc01vYmlsZSkge1xuXHRcdFx0ZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihcInNjcm9sbFwiLCBzZWxmLm9uc2Nyb2xsLCB0cnVlKTtcblx0XHR9XG5cblx0XHQvLyBTa2lwIGlmIGNsaWNrZWQgb3V0c2lkZSB0aGUgc2xpZGluZyBhcmVhXG5cdFx0aWYgKCEoc2VsZi5vcHRzIHx8IHNlbGYuY2FuUGFuKSB8fCAhKCR0YXJnZXQuaXMoc2VsZi4kc3RhZ2UpIHx8IHNlbGYuJHN0YWdlLmZpbmQoJHRhcmdldCkubGVuZ3RoKSkge1xuXHRcdFx0aWYgKCR0YXJnZXQuaXMoXCIuZmFuY3lib3gtaW1hZ2VcIikpIHtcblx0XHRcdFx0ZS5wcmV2ZW50RGVmYXVsdCgpO1xuXHRcdFx0fVxuXG5cdFx0XHRpZiAoISgkLmZhbmN5Ym94LmlzTW9iaWxlICYmICR0YXJnZXQuaGFzQ2xhc3MoXCJmYW5jeWJveC1jYXB0aW9uXCIpKSkge1xuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0c2VsZi5pc1Njcm9sbGFibGUgPSBpc1Njcm9sbGFibGUoJHRhcmdldCkgfHwgaXNTY3JvbGxhYmxlKCR0YXJnZXQucGFyZW50KCkpO1xuXG5cdFx0Ly8gQ2hlY2sgaWYgZWxlbWVudCBpcyBzY3JvbGxhYmxlIGFuZCB0cnkgdG8gcHJldmVudCBkZWZhdWx0IGJlaGF2aW9yIChzY3JvbGxpbmcpXG5cdFx0aWYgKCEoJC5mYW5jeWJveC5pc01vYmlsZSAmJiBzZWxmLmlzU2Nyb2xsYWJsZSkpIHtcblx0XHRcdGUucHJldmVudERlZmF1bHQoKTtcblx0XHR9XG5cblx0XHQvLyBPbmUgZmluZ2VyIG9yIG1vdXNlIGNsaWNrIC0gc3dpcGUgb3IgcGFuIGFuIGltYWdlXG5cdFx0aWYgKHNlbGYuc3RhcnRQb2ludHMubGVuZ3RoID09PSAxIHx8IGN1cnJlbnQuaGFzRXJyb3IpIHtcblx0XHRcdGlmIChzZWxmLmNhblBhbikge1xuXHRcdFx0XHQkLmZhbmN5Ym94LnN0b3Aoc2VsZi4kY29udGVudCk7XG5cblx0XHRcdFx0c2VsZi5pc1Bhbm5pbmcgPSB0cnVlO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0c2VsZi5pc1N3aXBpbmcgPSB0cnVlO1xuXHRcdFx0fVxuXG5cdFx0XHRzZWxmLiRjb250YWluZXIuYWRkQ2xhc3MoXCJmYW5jeWJveC1pcy1ncmFiYmluZ1wiKTtcblx0XHR9XG5cblx0XHQvLyBUd28gZmluZ2VycyAtIHpvb20gaW1hZ2Vcblx0XHRpZiAoc2VsZi5zdGFydFBvaW50cy5sZW5ndGggPT09IDIgJiYgY3VycmVudC50eXBlID09PSBcImltYWdlXCIgJiYgKGN1cnJlbnQuaXNMb2FkZWQgfHwgY3VycmVudC4kZ2hvc3QpKSB7XG5cdFx0XHRzZWxmLmNhblRhcCA9IGZhbHNlO1xuXHRcdFx0c2VsZi5pc1N3aXBpbmcgPSBmYWxzZTtcblx0XHRcdHNlbGYuaXNQYW5uaW5nID0gZmFsc2U7XG5cblx0XHRcdHNlbGYuaXNab29taW5nID0gdHJ1ZTtcblxuXHRcdFx0JC5mYW5jeWJveC5zdG9wKHNlbGYuJGNvbnRlbnQpO1xuXG5cdFx0XHRzZWxmLmNlbnRlclBvaW50U3RhcnRYID0gKHNlbGYuc3RhcnRQb2ludHNbMF0ueCArIHNlbGYuc3RhcnRQb2ludHNbMV0ueCkgKiAwLjUgLSAkKHdpbmRvdykuc2Nyb2xsTGVmdCgpO1xuXHRcdFx0c2VsZi5jZW50ZXJQb2ludFN0YXJ0WSA9IChzZWxmLnN0YXJ0UG9pbnRzWzBdLnkgKyBzZWxmLnN0YXJ0UG9pbnRzWzFdLnkpICogMC41IC0gJCh3aW5kb3cpLnNjcm9sbFRvcCgpO1xuXG5cdFx0XHRzZWxmLnBlcmNlbnRhZ2VPZkltYWdlQXRQaW5jaFBvaW50WCA9IChzZWxmLmNlbnRlclBvaW50U3RhcnRYIC0gc2VsZi5jb250ZW50U3RhcnRQb3MubGVmdCkgLyBzZWxmLmNvbnRlbnRTdGFydFBvcy53aWR0aDtcblx0XHRcdHNlbGYucGVyY2VudGFnZU9mSW1hZ2VBdFBpbmNoUG9pbnRZID0gKHNlbGYuY2VudGVyUG9pbnRTdGFydFkgLSBzZWxmLmNvbnRlbnRTdGFydFBvcy50b3ApIC8gc2VsZi5jb250ZW50U3RhcnRQb3MuaGVpZ2h0O1xuXG5cdFx0XHRzZWxmLnN0YXJ0RGlzdGFuY2VCZXR3ZWVuRmluZ2VycyA9IGRpc3RhbmNlKHNlbGYuc3RhcnRQb2ludHNbMF0sIHNlbGYuc3RhcnRQb2ludHNbMV0pO1xuXHRcdH1cblx0fTtcblxuXHRHdWVzdHVyZXMucHJvdG90eXBlLm9uc2Nyb2xsID0gZnVuY3Rpb24oZSkge1xuXHRcdHZhciBzZWxmID0gdGhpcztcblxuXHRcdHNlbGYuaXNTY3JvbGxpbmcgPSB0cnVlO1xuXG5cdFx0ZG9jdW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lcihcInNjcm9sbFwiLCBzZWxmLm9uc2Nyb2xsLCB0cnVlKTtcblx0fTtcblxuXHRHdWVzdHVyZXMucHJvdG90eXBlLm9udG91Y2htb3ZlID0gZnVuY3Rpb24oZSkge1xuXHRcdHZhciBzZWxmID0gdGhpcztcblxuXHRcdC8vIE1ha2Ugc3VyZSB1c2VyIGhhcyBub3QgcmVsZWFzZWQgb3ZlciBpZnJhbWUgb3IgZGlzYWJsZWQgZWxlbWVudFxuXHRcdGlmIChlLm9yaWdpbmFsRXZlbnQuYnV0dG9ucyAhPT0gdW5kZWZpbmVkICYmIGUub3JpZ2luYWxFdmVudC5idXR0b25zID09PSAwKSB7XG5cdFx0XHRzZWxmLm9udG91Y2hlbmQoZSk7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXG5cdFx0aWYgKHNlbGYuaXNTY3JvbGxpbmcpIHtcblx0XHRcdHNlbGYuY2FuVGFwID0gZmFsc2U7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXG5cdFx0c2VsZi5uZXdQb2ludHMgPSBnZXRQb2ludGVyWFkoZSk7XG5cblx0XHRpZiAoIShzZWxmLm9wdHMgfHwgc2VsZi5jYW5QYW4pIHx8ICFzZWxmLm5ld1BvaW50cy5sZW5ndGggfHwgIXNlbGYubmV3UG9pbnRzLmxlbmd0aCkge1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblxuXHRcdGlmICghKHNlbGYuaXNTd2lwaW5nICYmIHNlbGYuaXNTd2lwaW5nID09PSB0cnVlKSkge1xuXHRcdFx0ZS5wcmV2ZW50RGVmYXVsdCgpO1xuXHRcdH1cblxuXHRcdHNlbGYuZGlzdGFuY2VYID0gZGlzdGFuY2Uoc2VsZi5uZXdQb2ludHNbMF0sIHNlbGYuc3RhcnRQb2ludHNbMF0sIFwieFwiKTtcblx0XHRzZWxmLmRpc3RhbmNlWSA9IGRpc3RhbmNlKHNlbGYubmV3UG9pbnRzWzBdLCBzZWxmLnN0YXJ0UG9pbnRzWzBdLCBcInlcIik7XG5cblx0XHRzZWxmLmRpc3RhbmNlID0gZGlzdGFuY2Uoc2VsZi5uZXdQb2ludHNbMF0sIHNlbGYuc3RhcnRQb2ludHNbMF0pO1xuXG5cdFx0Ly8gU2tpcCBmYWxzZSBvbnRvdWNobW92ZSBldmVudHMgKENocm9tZSlcblx0XHRpZiAoc2VsZi5kaXN0YW5jZSA+IDApIHtcblx0XHRcdGlmIChzZWxmLmlzU3dpcGluZykge1xuXHRcdFx0XHRzZWxmLm9uU3dpcGUoZSk7XG5cdFx0XHR9IGVsc2UgaWYgKHNlbGYuaXNQYW5uaW5nKSB7XG5cdFx0XHRcdHNlbGYub25QYW4oKTtcblx0XHRcdH0gZWxzZSBpZiAoc2VsZi5pc1pvb21pbmcpIHtcblx0XHRcdFx0c2VsZi5vblpvb20oKTtcblx0XHRcdH1cblx0XHR9XG5cdH07XG5cblx0R3Vlc3R1cmVzLnByb3RvdHlwZS5vblN3aXBlID0gZnVuY3Rpb24oZSkge1xuXHRcdHZhciBzZWxmID0gdGhpcyxcblx0XHRcdGluc3RhbmNlID0gc2VsZi5pbnN0YW5jZSxcblx0XHRcdHN3aXBpbmcgPSBzZWxmLmlzU3dpcGluZyxcblx0XHRcdGxlZnQgPSBzZWxmLnNsaWRlclN0YXJ0UG9zLmxlZnQgfHwgMCxcblx0XHRcdGFuZ2xlO1xuXG5cdFx0Ly8gSWYgZGlyZWN0aW9uIGlzIG5vdCB5ZXQgZGV0ZXJtaW5lZFxuXHRcdGlmIChzd2lwaW5nID09PSB0cnVlKSB7XG5cdFx0XHQvLyBXZSBuZWVkIGF0IGxlYXN0IDEwcHggZGlzdGFuY2UgdG8gY29ycmVjdGx5IGNhbGN1bGF0ZSBhbiBhbmdsZVxuXHRcdFx0aWYgKE1hdGguYWJzKHNlbGYuZGlzdGFuY2UpID4gMTApIHtcblx0XHRcdFx0c2VsZi5jYW5UYXAgPSBmYWxzZTtcblxuXHRcdFx0XHRpZiAoaW5zdGFuY2UuZ3JvdXAubGVuZ3RoIDwgMiAmJiBzZWxmLm9wdHMudmVydGljYWwpIHtcblx0XHRcdFx0XHRzZWxmLmlzU3dpcGluZyA9IFwieVwiO1xuXHRcdFx0XHR9IGVsc2UgaWYgKGluc3RhbmNlLmlzRHJhZ2dpbmcgfHwgc2VsZi5vcHRzLnZlcnRpY2FsID09PSBmYWxzZSB8fCAoc2VsZi5vcHRzLnZlcnRpY2FsID09PSBcImF1dG9cIiAmJiAkKHdpbmRvdykud2lkdGgoKSA+IDgwMCkpIHtcblx0XHRcdFx0XHRzZWxmLmlzU3dpcGluZyA9IFwieFwiO1xuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdGFuZ2xlID0gTWF0aC5hYnMoKE1hdGguYXRhbjIoc2VsZi5kaXN0YW5jZVksIHNlbGYuZGlzdGFuY2VYKSAqIDE4MCkgLyBNYXRoLlBJKTtcblxuXHRcdFx0XHRcdHNlbGYuaXNTd2lwaW5nID0gYW5nbGUgPiA0NSAmJiBhbmdsZSA8IDEzNSA/IFwieVwiIDogXCJ4XCI7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRpZiAoc2VsZi5pc1N3aXBpbmcgPT09IFwieVwiICYmICQuZmFuY3lib3guaXNNb2JpbGUgJiYgc2VsZi5pc1Njcm9sbGFibGUpIHtcblx0XHRcdFx0XHRzZWxmLmlzU2Nyb2xsaW5nID0gdHJ1ZTtcblxuXHRcdFx0XHRcdHJldHVybjtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdGluc3RhbmNlLmlzRHJhZ2dpbmcgPSBzZWxmLmlzU3dpcGluZztcblxuXHRcdFx0XHQvLyBSZXNldCBwb2ludHMgdG8gYXZvaWQganVtcGluZywgYmVjYXVzZSB3ZSBkcm9wcGVkIGZpcnN0IHN3aXBlcyB0byBjYWxjdWxhdGUgdGhlIGFuZ2xlXG5cdFx0XHRcdHNlbGYuc3RhcnRQb2ludHMgPSBzZWxmLm5ld1BvaW50cztcblxuXHRcdFx0XHQkLmVhY2goaW5zdGFuY2Uuc2xpZGVzLCBmdW5jdGlvbihpbmRleCwgc2xpZGUpIHtcblx0XHRcdFx0XHR2YXIgc2xpZGVQb3MsIHN0YWdlUG9zO1xuXG5cdFx0XHRcdFx0JC5mYW5jeWJveC5zdG9wKHNsaWRlLiRzbGlkZSk7XG5cblx0XHRcdFx0XHRzbGlkZVBvcyA9ICQuZmFuY3lib3guZ2V0VHJhbnNsYXRlKHNsaWRlLiRzbGlkZSk7XG5cdFx0XHRcdFx0c3RhZ2VQb3MgPSAkLmZhbmN5Ym94LmdldFRyYW5zbGF0ZShpbnN0YW5jZS4kcmVmcy5zdGFnZSk7XG5cblx0XHRcdFx0XHRzbGlkZS4kc2xpZGVcblx0XHRcdFx0XHRcdC5jc3Moe1xuXHRcdFx0XHRcdFx0XHR0cmFuc2Zvcm06IFwiXCIsXG5cdFx0XHRcdFx0XHRcdG9wYWNpdHk6IFwiXCIsXG5cdFx0XHRcdFx0XHRcdFwidHJhbnNpdGlvbi1kdXJhdGlvblwiOiBcIlwiXG5cdFx0XHRcdFx0XHR9KVxuXHRcdFx0XHRcdFx0LnJlbW92ZUNsYXNzKFwiZmFuY3lib3gtYW5pbWF0ZWRcIilcblx0XHRcdFx0XHRcdC5yZW1vdmVDbGFzcyhmdW5jdGlvbihpbmRleCwgY2xhc3NOYW1lKSB7XG5cdFx0XHRcdFx0XHRcdHJldHVybiAoY2xhc3NOYW1lLm1hdGNoKC8oXnxcXHMpZmFuY3lib3gtZngtXFxTKy9nKSB8fCBbXSkuam9pbihcIiBcIik7XG5cdFx0XHRcdFx0XHR9KTtcblxuXHRcdFx0XHRcdGlmIChzbGlkZS5wb3MgPT09IGluc3RhbmNlLmN1cnJlbnQucG9zKSB7XG5cdFx0XHRcdFx0XHRzZWxmLnNsaWRlclN0YXJ0UG9zLnRvcCA9IHNsaWRlUG9zLnRvcCAtIHN0YWdlUG9zLnRvcDtcblx0XHRcdFx0XHRcdHNlbGYuc2xpZGVyU3RhcnRQb3MubGVmdCA9IHNsaWRlUG9zLmxlZnQgLSBzdGFnZVBvcy5sZWZ0O1xuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdCQuZmFuY3lib3guc2V0VHJhbnNsYXRlKHNsaWRlLiRzbGlkZSwge1xuXHRcdFx0XHRcdFx0dG9wOiBzbGlkZVBvcy50b3AgLSBzdGFnZVBvcy50b3AsXG5cdFx0XHRcdFx0XHRsZWZ0OiBzbGlkZVBvcy5sZWZ0IC0gc3RhZ2VQb3MubGVmdFxuXHRcdFx0XHRcdH0pO1xuXHRcdFx0XHR9KTtcblxuXHRcdFx0XHQvLyBTdG9wIHNsaWRlc2hvd1xuXHRcdFx0XHRpZiAoaW5zdGFuY2UuU2xpZGVTaG93ICYmIGluc3RhbmNlLlNsaWRlU2hvdy5pc0FjdGl2ZSkge1xuXHRcdFx0XHRcdGluc3RhbmNlLlNsaWRlU2hvdy5zdG9wKCk7XG5cdFx0XHRcdH1cblx0XHRcdH1cblxuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblxuXHRcdC8vIFN0aWNreSBlZGdlc1xuXHRcdGlmIChzd2lwaW5nID09IFwieFwiKSB7XG5cdFx0XHRpZiAoXG5cdFx0XHRcdHNlbGYuZGlzdGFuY2VYID4gMCAmJlxuXHRcdFx0XHQoc2VsZi5pbnN0YW5jZS5ncm91cC5sZW5ndGggPCAyIHx8IChzZWxmLmluc3RhbmNlLmN1cnJlbnQuaW5kZXggPT09IDAgJiYgIXNlbGYuaW5zdGFuY2UuY3VycmVudC5vcHRzLmxvb3ApKVxuXHRcdFx0KSB7XG5cdFx0XHRcdGxlZnQgPSBsZWZ0ICsgTWF0aC5wb3coc2VsZi5kaXN0YW5jZVgsIDAuOCk7XG5cdFx0XHR9IGVsc2UgaWYgKFxuXHRcdFx0XHRzZWxmLmRpc3RhbmNlWCA8IDAgJiZcblx0XHRcdFx0KHNlbGYuaW5zdGFuY2UuZ3JvdXAubGVuZ3RoIDwgMiB8fFxuXHRcdFx0XHRcdChzZWxmLmluc3RhbmNlLmN1cnJlbnQuaW5kZXggPT09IHNlbGYuaW5zdGFuY2UuZ3JvdXAubGVuZ3RoIC0gMSAmJiAhc2VsZi5pbnN0YW5jZS5jdXJyZW50Lm9wdHMubG9vcCkpXG5cdFx0XHQpIHtcblx0XHRcdFx0bGVmdCA9IGxlZnQgLSBNYXRoLnBvdygtc2VsZi5kaXN0YW5jZVgsIDAuOCk7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRsZWZ0ID0gbGVmdCArIHNlbGYuZGlzdGFuY2VYO1xuXHRcdFx0fVxuXHRcdH1cblxuXHRcdHNlbGYuc2xpZGVyTGFzdFBvcyA9IHtcblx0XHRcdHRvcDogc3dpcGluZyA9PSBcInhcIiA/IDAgOiBzZWxmLnNsaWRlclN0YXJ0UG9zLnRvcCArIHNlbGYuZGlzdGFuY2VZLFxuXHRcdFx0bGVmdDogbGVmdFxuXHRcdH07XG5cblx0XHRpZiAoc2VsZi5yZXF1ZXN0SWQpIHtcblx0XHRcdGNhbmNlbEFGcmFtZShzZWxmLnJlcXVlc3RJZCk7XG5cblx0XHRcdHNlbGYucmVxdWVzdElkID0gbnVsbDtcblx0XHR9XG5cblx0XHRzZWxmLnJlcXVlc3RJZCA9IHJlcXVlc3RBRnJhbWUoZnVuY3Rpb24oKSB7XG5cdFx0XHRpZiAoc2VsZi5zbGlkZXJMYXN0UG9zKSB7XG5cdFx0XHRcdCQuZWFjaChzZWxmLmluc3RhbmNlLnNsaWRlcywgZnVuY3Rpb24oaW5kZXgsIHNsaWRlKSB7XG5cdFx0XHRcdFx0dmFyIHBvcyA9IHNsaWRlLnBvcyAtIHNlbGYuaW5zdGFuY2UuY3VyclBvcztcblxuXHRcdFx0XHRcdCQuZmFuY3lib3guc2V0VHJhbnNsYXRlKHNsaWRlLiRzbGlkZSwge1xuXHRcdFx0XHRcdFx0dG9wOiBzZWxmLnNsaWRlckxhc3RQb3MudG9wLFxuXHRcdFx0XHRcdFx0bGVmdDogc2VsZi5zbGlkZXJMYXN0UG9zLmxlZnQgKyBwb3MgKiBzZWxmLmNhbnZhc1dpZHRoICsgcG9zICogc2xpZGUub3B0cy5ndXR0ZXJcblx0XHRcdFx0XHR9KTtcblx0XHRcdFx0fSk7XG5cblx0XHRcdFx0c2VsZi4kY29udGFpbmVyLmFkZENsYXNzKFwiZmFuY3lib3gtaXMtc2xpZGluZ1wiKTtcblx0XHRcdH1cblx0XHR9KTtcblx0fTtcblxuXHRHdWVzdHVyZXMucHJvdG90eXBlLm9uUGFuID0gZnVuY3Rpb24oKSB7XG5cdFx0dmFyIHNlbGYgPSB0aGlzO1xuXG5cdFx0Ly8gUHJldmVudCBhY2NpZGVudGFsIG1vdmVtZW50IChzb21ldGltZXMsIHdoZW4gdGFwcGluZyBjYXN1YWxseSwgZmluZ2VyIGNhbiBtb3ZlIGEgYml0KVxuXHRcdGlmIChkaXN0YW5jZShzZWxmLm5ld1BvaW50c1swXSwgc2VsZi5yZWFsUG9pbnRzWzBdKSA8ICgkLmZhbmN5Ym94LmlzTW9iaWxlID8gMTAgOiA1KSkge1xuXHRcdFx0c2VsZi5zdGFydFBvaW50cyA9IHNlbGYubmV3UG9pbnRzO1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblxuXHRcdHNlbGYuY2FuVGFwID0gZmFsc2U7XG5cblx0XHRzZWxmLmNvbnRlbnRMYXN0UG9zID0gc2VsZi5saW1pdE1vdmVtZW50KCk7XG5cblx0XHRpZiAoc2VsZi5yZXF1ZXN0SWQpIHtcblx0XHRcdGNhbmNlbEFGcmFtZShzZWxmLnJlcXVlc3RJZCk7XG5cdFx0fVxuXG5cdFx0c2VsZi5yZXF1ZXN0SWQgPSByZXF1ZXN0QUZyYW1lKGZ1bmN0aW9uKCkge1xuXHRcdFx0JC5mYW5jeWJveC5zZXRUcmFuc2xhdGUoc2VsZi4kY29udGVudCwgc2VsZi5jb250ZW50TGFzdFBvcyk7XG5cdFx0fSk7XG5cdH07XG5cblx0Ly8gTWFrZSBwYW5uaW5nIHN0aWNreSB0byB0aGUgZWRnZXNcblx0R3Vlc3R1cmVzLnByb3RvdHlwZS5saW1pdE1vdmVtZW50ID0gZnVuY3Rpb24oKSB7XG5cdFx0dmFyIHNlbGYgPSB0aGlzO1xuXG5cdFx0dmFyIGNhbnZhc1dpZHRoID0gc2VsZi5jYW52YXNXaWR0aDtcblx0XHR2YXIgY2FudmFzSGVpZ2h0ID0gc2VsZi5jYW52YXNIZWlnaHQ7XG5cblx0XHR2YXIgZGlzdGFuY2VYID0gc2VsZi5kaXN0YW5jZVg7XG5cdFx0dmFyIGRpc3RhbmNlWSA9IHNlbGYuZGlzdGFuY2VZO1xuXG5cdFx0dmFyIGNvbnRlbnRTdGFydFBvcyA9IHNlbGYuY29udGVudFN0YXJ0UG9zO1xuXG5cdFx0dmFyIGN1cnJlbnRPZmZzZXRYID0gY29udGVudFN0YXJ0UG9zLmxlZnQ7XG5cdFx0dmFyIGN1cnJlbnRPZmZzZXRZID0gY29udGVudFN0YXJ0UG9zLnRvcDtcblxuXHRcdHZhciBjdXJyZW50V2lkdGggPSBjb250ZW50U3RhcnRQb3Mud2lkdGg7XG5cdFx0dmFyIGN1cnJlbnRIZWlnaHQgPSBjb250ZW50U3RhcnRQb3MuaGVpZ2h0O1xuXG5cdFx0dmFyIG1pblRyYW5zbGF0ZVgsIG1pblRyYW5zbGF0ZVksIG1heFRyYW5zbGF0ZVgsIG1heFRyYW5zbGF0ZVksIG5ld09mZnNldFgsIG5ld09mZnNldFk7XG5cblx0XHRpZiAoY3VycmVudFdpZHRoID4gY2FudmFzV2lkdGgpIHtcblx0XHRcdG5ld09mZnNldFggPSBjdXJyZW50T2Zmc2V0WCArIGRpc3RhbmNlWDtcblx0XHR9IGVsc2Uge1xuXHRcdFx0bmV3T2Zmc2V0WCA9IGN1cnJlbnRPZmZzZXRYO1xuXHRcdH1cblxuXHRcdG5ld09mZnNldFkgPSBjdXJyZW50T2Zmc2V0WSArIGRpc3RhbmNlWTtcblxuXHRcdC8vIFNsb3cgZG93biBwcm9wb3J0aW9uYWxseSB0byB0cmF2ZWxlZCBkaXN0YW5jZVxuXHRcdG1pblRyYW5zbGF0ZVggPSBNYXRoLm1heCgwLCBjYW52YXNXaWR0aCAqIDAuNSAtIGN1cnJlbnRXaWR0aCAqIDAuNSk7XG5cdFx0bWluVHJhbnNsYXRlWSA9IE1hdGgubWF4KDAsIGNhbnZhc0hlaWdodCAqIDAuNSAtIGN1cnJlbnRIZWlnaHQgKiAwLjUpO1xuXG5cdFx0bWF4VHJhbnNsYXRlWCA9IE1hdGgubWluKGNhbnZhc1dpZHRoIC0gY3VycmVudFdpZHRoLCBjYW52YXNXaWR0aCAqIDAuNSAtIGN1cnJlbnRXaWR0aCAqIDAuNSk7XG5cdFx0bWF4VHJhbnNsYXRlWSA9IE1hdGgubWluKGNhbnZhc0hlaWdodCAtIGN1cnJlbnRIZWlnaHQsIGNhbnZhc0hlaWdodCAqIDAuNSAtIGN1cnJlbnRIZWlnaHQgKiAwLjUpO1xuXG5cdFx0Ly8gICAtPlxuXHRcdGlmIChkaXN0YW5jZVggPiAwICYmIG5ld09mZnNldFggPiBtaW5UcmFuc2xhdGVYKSB7XG5cdFx0XHRuZXdPZmZzZXRYID0gbWluVHJhbnNsYXRlWCAtIDEgKyBNYXRoLnBvdygtbWluVHJhbnNsYXRlWCArIGN1cnJlbnRPZmZzZXRYICsgZGlzdGFuY2VYLCAwLjgpIHx8IDA7XG5cdFx0fVxuXG5cdFx0Ly8gICAgPC1cblx0XHRpZiAoZGlzdGFuY2VYIDwgMCAmJiBuZXdPZmZzZXRYIDwgbWF4VHJhbnNsYXRlWCkge1xuXHRcdFx0bmV3T2Zmc2V0WCA9IG1heFRyYW5zbGF0ZVggKyAxIC0gTWF0aC5wb3cobWF4VHJhbnNsYXRlWCAtIGN1cnJlbnRPZmZzZXRYIC0gZGlzdGFuY2VYLCAwLjgpIHx8IDA7XG5cdFx0fVxuXG5cdFx0Ly8gICBcXC9cblx0XHRpZiAoZGlzdGFuY2VZID4gMCAmJiBuZXdPZmZzZXRZID4gbWluVHJhbnNsYXRlWSkge1xuXHRcdFx0bmV3T2Zmc2V0WSA9IG1pblRyYW5zbGF0ZVkgLSAxICsgTWF0aC5wb3coLW1pblRyYW5zbGF0ZVkgKyBjdXJyZW50T2Zmc2V0WSArIGRpc3RhbmNlWSwgMC44KSB8fCAwO1xuXHRcdH1cblxuXHRcdC8vICAgL1xcXG5cdFx0aWYgKGRpc3RhbmNlWSA8IDAgJiYgbmV3T2Zmc2V0WSA8IG1heFRyYW5zbGF0ZVkpIHtcblx0XHRcdG5ld09mZnNldFkgPSBtYXhUcmFuc2xhdGVZICsgMSAtIE1hdGgucG93KG1heFRyYW5zbGF0ZVkgLSBjdXJyZW50T2Zmc2V0WSAtIGRpc3RhbmNlWSwgMC44KSB8fCAwO1xuXHRcdH1cblxuXHRcdHJldHVybiB7XG5cdFx0XHR0b3A6IG5ld09mZnNldFksXG5cdFx0XHRsZWZ0OiBuZXdPZmZzZXRYXG5cdFx0fTtcblx0fTtcblxuXHRHdWVzdHVyZXMucHJvdG90eXBlLmxpbWl0UG9zaXRpb24gPSBmdW5jdGlvbihuZXdPZmZzZXRYLCBuZXdPZmZzZXRZLCBuZXdXaWR0aCwgbmV3SGVpZ2h0KSB7XG5cdFx0dmFyIHNlbGYgPSB0aGlzO1xuXG5cdFx0dmFyIGNhbnZhc1dpZHRoID0gc2VsZi5jYW52YXNXaWR0aDtcblx0XHR2YXIgY2FudmFzSGVpZ2h0ID0gc2VsZi5jYW52YXNIZWlnaHQ7XG5cblx0XHRpZiAobmV3V2lkdGggPiBjYW52YXNXaWR0aCkge1xuXHRcdFx0bmV3T2Zmc2V0WCA9IG5ld09mZnNldFggPiAwID8gMCA6IG5ld09mZnNldFg7XG5cdFx0XHRuZXdPZmZzZXRYID0gbmV3T2Zmc2V0WCA8IGNhbnZhc1dpZHRoIC0gbmV3V2lkdGggPyBjYW52YXNXaWR0aCAtIG5ld1dpZHRoIDogbmV3T2Zmc2V0WDtcblx0XHR9IGVsc2Uge1xuXHRcdFx0Ly8gQ2VudGVyIGhvcml6b250YWxseVxuXHRcdFx0bmV3T2Zmc2V0WCA9IE1hdGgubWF4KDAsIGNhbnZhc1dpZHRoIC8gMiAtIG5ld1dpZHRoIC8gMik7XG5cdFx0fVxuXG5cdFx0aWYgKG5ld0hlaWdodCA+IGNhbnZhc0hlaWdodCkge1xuXHRcdFx0bmV3T2Zmc2V0WSA9IG5ld09mZnNldFkgPiAwID8gMCA6IG5ld09mZnNldFk7XG5cdFx0XHRuZXdPZmZzZXRZID0gbmV3T2Zmc2V0WSA8IGNhbnZhc0hlaWdodCAtIG5ld0hlaWdodCA/IGNhbnZhc0hlaWdodCAtIG5ld0hlaWdodCA6IG5ld09mZnNldFk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdC8vIENlbnRlciB2ZXJ0aWNhbGx5XG5cdFx0XHRuZXdPZmZzZXRZID0gTWF0aC5tYXgoMCwgY2FudmFzSGVpZ2h0IC8gMiAtIG5ld0hlaWdodCAvIDIpO1xuXHRcdH1cblxuXHRcdHJldHVybiB7XG5cdFx0XHR0b3A6IG5ld09mZnNldFksXG5cdFx0XHRsZWZ0OiBuZXdPZmZzZXRYXG5cdFx0fTtcblx0fTtcblxuXHRHdWVzdHVyZXMucHJvdG90eXBlLm9uWm9vbSA9IGZ1bmN0aW9uKCkge1xuXHRcdHZhciBzZWxmID0gdGhpcztcblxuXHRcdC8vIENhbGN1bGF0ZSBjdXJyZW50IGRpc3RhbmNlIGJldHdlZW4gcG9pbnRzIHRvIGdldCBwaW5jaCByYXRpbyBhbmQgbmV3IHdpZHRoIGFuZCBoZWlnaHRcblx0XHR2YXIgY29udGVudFN0YXJ0UG9zID0gc2VsZi5jb250ZW50U3RhcnRQb3M7XG5cblx0XHR2YXIgY3VycmVudFdpZHRoID0gY29udGVudFN0YXJ0UG9zLndpZHRoO1xuXHRcdHZhciBjdXJyZW50SGVpZ2h0ID0gY29udGVudFN0YXJ0UG9zLmhlaWdodDtcblxuXHRcdHZhciBjdXJyZW50T2Zmc2V0WCA9IGNvbnRlbnRTdGFydFBvcy5sZWZ0O1xuXHRcdHZhciBjdXJyZW50T2Zmc2V0WSA9IGNvbnRlbnRTdGFydFBvcy50b3A7XG5cblx0XHR2YXIgZW5kRGlzdGFuY2VCZXR3ZWVuRmluZ2VycyA9IGRpc3RhbmNlKHNlbGYubmV3UG9pbnRzWzBdLCBzZWxmLm5ld1BvaW50c1sxXSk7XG5cblx0XHR2YXIgcGluY2hSYXRpbyA9IGVuZERpc3RhbmNlQmV0d2VlbkZpbmdlcnMgLyBzZWxmLnN0YXJ0RGlzdGFuY2VCZXR3ZWVuRmluZ2VycztcblxuXHRcdHZhciBuZXdXaWR0aCA9IE1hdGguZmxvb3IoY3VycmVudFdpZHRoICogcGluY2hSYXRpbyk7XG5cdFx0dmFyIG5ld0hlaWdodCA9IE1hdGguZmxvb3IoY3VycmVudEhlaWdodCAqIHBpbmNoUmF0aW8pO1xuXG5cdFx0Ly8gVGhpcyBpcyB0aGUgdHJhbnNsYXRpb24gZHVlIHRvIHBpbmNoLXpvb21pbmdcblx0XHR2YXIgdHJhbnNsYXRlRnJvbVpvb21pbmdYID0gKGN1cnJlbnRXaWR0aCAtIG5ld1dpZHRoKSAqIHNlbGYucGVyY2VudGFnZU9mSW1hZ2VBdFBpbmNoUG9pbnRYO1xuXHRcdHZhciB0cmFuc2xhdGVGcm9tWm9vbWluZ1kgPSAoY3VycmVudEhlaWdodCAtIG5ld0hlaWdodCkgKiBzZWxmLnBlcmNlbnRhZ2VPZkltYWdlQXRQaW5jaFBvaW50WTtcblxuXHRcdC8vIFBvaW50IGJldHdlZW4gdGhlIHR3byB0b3VjaGVzXG5cdFx0dmFyIGNlbnRlclBvaW50RW5kWCA9IChzZWxmLm5ld1BvaW50c1swXS54ICsgc2VsZi5uZXdQb2ludHNbMV0ueCkgLyAyIC0gJCh3aW5kb3cpLnNjcm9sbExlZnQoKTtcblx0XHR2YXIgY2VudGVyUG9pbnRFbmRZID0gKHNlbGYubmV3UG9pbnRzWzBdLnkgKyBzZWxmLm5ld1BvaW50c1sxXS55KSAvIDIgLSAkKHdpbmRvdykuc2Nyb2xsVG9wKCk7XG5cblx0XHQvLyBBbmQgdGhpcyBpcyB0aGUgdHJhbnNsYXRpb24gZHVlIHRvIHRyYW5zbGF0aW9uIG9mIHRoZSBjZW50ZXJwb2ludFxuXHRcdC8vIGJldHdlZW4gdGhlIHR3byBmaW5nZXJzXG5cdFx0dmFyIHRyYW5zbGF0ZUZyb21UcmFuc2xhdGluZ1ggPSBjZW50ZXJQb2ludEVuZFggLSBzZWxmLmNlbnRlclBvaW50U3RhcnRYO1xuXHRcdHZhciB0cmFuc2xhdGVGcm9tVHJhbnNsYXRpbmdZID0gY2VudGVyUG9pbnRFbmRZIC0gc2VsZi5jZW50ZXJQb2ludFN0YXJ0WTtcblxuXHRcdC8vIFRoZSBuZXcgb2Zmc2V0IGlzIHRoZSBvbGQvY3VycmVudCBvbmUgcGx1cyB0aGUgdG90YWwgdHJhbnNsYXRpb25cblx0XHR2YXIgbmV3T2Zmc2V0WCA9IGN1cnJlbnRPZmZzZXRYICsgKHRyYW5zbGF0ZUZyb21ab29taW5nWCArIHRyYW5zbGF0ZUZyb21UcmFuc2xhdGluZ1gpO1xuXHRcdHZhciBuZXdPZmZzZXRZID0gY3VycmVudE9mZnNldFkgKyAodHJhbnNsYXRlRnJvbVpvb21pbmdZICsgdHJhbnNsYXRlRnJvbVRyYW5zbGF0aW5nWSk7XG5cblx0XHR2YXIgbmV3UG9zID0ge1xuXHRcdFx0dG9wOiBuZXdPZmZzZXRZLFxuXHRcdFx0bGVmdDogbmV3T2Zmc2V0WCxcblx0XHRcdHNjYWxlWDogcGluY2hSYXRpbyxcblx0XHRcdHNjYWxlWTogcGluY2hSYXRpb1xuXHRcdH07XG5cblx0XHRzZWxmLmNhblRhcCA9IGZhbHNlO1xuXG5cdFx0c2VsZi5uZXdXaWR0aCA9IG5ld1dpZHRoO1xuXHRcdHNlbGYubmV3SGVpZ2h0ID0gbmV3SGVpZ2h0O1xuXG5cdFx0c2VsZi5jb250ZW50TGFzdFBvcyA9IG5ld1BvcztcblxuXHRcdGlmIChzZWxmLnJlcXVlc3RJZCkge1xuXHRcdFx0Y2FuY2VsQUZyYW1lKHNlbGYucmVxdWVzdElkKTtcblx0XHR9XG5cblx0XHRzZWxmLnJlcXVlc3RJZCA9IHJlcXVlc3RBRnJhbWUoZnVuY3Rpb24oKSB7XG5cdFx0XHQkLmZhbmN5Ym94LnNldFRyYW5zbGF0ZShzZWxmLiRjb250ZW50LCBzZWxmLmNvbnRlbnRMYXN0UG9zKTtcblx0XHR9KTtcblx0fTtcblxuXHRHdWVzdHVyZXMucHJvdG90eXBlLm9udG91Y2hlbmQgPSBmdW5jdGlvbihlKSB7XG5cdFx0dmFyIHNlbGYgPSB0aGlzO1xuXG5cdFx0dmFyIHN3aXBpbmcgPSBzZWxmLmlzU3dpcGluZztcblx0XHR2YXIgcGFubmluZyA9IHNlbGYuaXNQYW5uaW5nO1xuXHRcdHZhciB6b29taW5nID0gc2VsZi5pc1pvb21pbmc7XG5cdFx0dmFyIHNjcm9sbGluZyA9IHNlbGYuaXNTY3JvbGxpbmc7XG5cblx0XHRzZWxmLmVuZFBvaW50cyA9IGdldFBvaW50ZXJYWShlKTtcblx0XHRzZWxmLmRNcyA9IE1hdGgubWF4KG5ldyBEYXRlKCkuZ2V0VGltZSgpIC0gc2VsZi5zdGFydFRpbWUsIDEpO1xuXG5cdFx0c2VsZi4kY29udGFpbmVyLnJlbW92ZUNsYXNzKFwiZmFuY3lib3gtaXMtZ3JhYmJpbmdcIik7XG5cblx0XHQkKGRvY3VtZW50KS5vZmYoXCIuZmIudG91Y2hcIik7XG5cblx0XHRkb2N1bWVudC5yZW1vdmVFdmVudExpc3RlbmVyKFwic2Nyb2xsXCIsIHNlbGYub25zY3JvbGwsIHRydWUpO1xuXG5cdFx0aWYgKHNlbGYucmVxdWVzdElkKSB7XG5cdFx0XHRjYW5jZWxBRnJhbWUoc2VsZi5yZXF1ZXN0SWQpO1xuXG5cdFx0XHRzZWxmLnJlcXVlc3RJZCA9IG51bGw7XG5cdFx0fVxuXG5cdFx0c2VsZi5pc1N3aXBpbmcgPSBmYWxzZTtcblx0XHRzZWxmLmlzUGFubmluZyA9IGZhbHNlO1xuXHRcdHNlbGYuaXNab29taW5nID0gZmFsc2U7XG5cdFx0c2VsZi5pc1Njcm9sbGluZyA9IGZhbHNlO1xuXG5cdFx0c2VsZi5pbnN0YW5jZS5pc0RyYWdnaW5nID0gZmFsc2U7XG5cblx0XHRpZiAoc2VsZi5jYW5UYXApIHtcblx0XHRcdHJldHVybiBzZWxmLm9uVGFwKGUpO1xuXHRcdH1cblxuXHRcdHNlbGYuc3BlZWQgPSAxMDA7XG5cblx0XHQvLyBTcGVlZCBpbiBweC9tc1xuXHRcdHNlbGYudmVsb2NpdHlYID0gKHNlbGYuZGlzdGFuY2VYIC8gc2VsZi5kTXMpICogMC41O1xuXHRcdHNlbGYudmVsb2NpdHlZID0gKHNlbGYuZGlzdGFuY2VZIC8gc2VsZi5kTXMpICogMC41O1xuXG5cdFx0aWYgKHBhbm5pbmcpIHtcblx0XHRcdHNlbGYuZW5kUGFubmluZygpO1xuXHRcdH0gZWxzZSBpZiAoem9vbWluZykge1xuXHRcdFx0c2VsZi5lbmRab29taW5nKCk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHNlbGYuZW5kU3dpcGluZyhzd2lwaW5nLCBzY3JvbGxpbmcpO1xuXHRcdH1cblxuXHRcdHJldHVybjtcblx0fTtcblxuXHRHdWVzdHVyZXMucHJvdG90eXBlLmVuZFN3aXBpbmcgPSBmdW5jdGlvbihzd2lwaW5nLCBzY3JvbGxpbmcpIHtcblx0XHR2YXIgc2VsZiA9IHRoaXMsXG5cdFx0XHRyZXQgPSBmYWxzZSxcblx0XHRcdGxlbiA9IHNlbGYuaW5zdGFuY2UuZ3JvdXAubGVuZ3RoLFxuXHRcdFx0ZGlzdGFuY2VYID0gTWF0aC5hYnMoc2VsZi5kaXN0YW5jZVgpLFxuXHRcdFx0Y2FuQWR2YW5jZSA9IHN3aXBpbmcgPT0gXCJ4XCIgJiYgbGVuID4gMSAmJiAoKHNlbGYuZE1zID4gMTMwICYmIGRpc3RhbmNlWCA+IDEwKSB8fCBkaXN0YW5jZVggPiA1MCksXG5cdFx0XHRzcGVlZFggPSAzMDA7XG5cblx0XHRzZWxmLnNsaWRlckxhc3RQb3MgPSBudWxsO1xuXG5cdFx0Ly8gQ2xvc2UgaWYgc3dpcGVkIHZlcnRpY2FsbHkgLyBuYXZpZ2F0ZSBpZiBob3Jpem9udGFsbHlcblx0XHRpZiAoc3dpcGluZyA9PSBcInlcIiAmJiAhc2Nyb2xsaW5nICYmIE1hdGguYWJzKHNlbGYuZGlzdGFuY2VZKSA+IDUwKSB7XG5cdFx0XHQvLyBDb250aW51ZSB2ZXJ0aWNhbCBtb3ZlbWVudFxuXHRcdFx0JC5mYW5jeWJveC5hbmltYXRlKFxuXHRcdFx0XHRzZWxmLmluc3RhbmNlLmN1cnJlbnQuJHNsaWRlLFxuXHRcdFx0XHR7XG5cdFx0XHRcdFx0dG9wOiBzZWxmLnNsaWRlclN0YXJ0UG9zLnRvcCArIHNlbGYuZGlzdGFuY2VZICsgc2VsZi52ZWxvY2l0eVkgKiAxNTAsXG5cdFx0XHRcdFx0b3BhY2l0eTogMFxuXHRcdFx0XHR9LFxuXHRcdFx0XHQyMDBcblx0XHRcdCk7XG5cdFx0XHRyZXQgPSBzZWxmLmluc3RhbmNlLmNsb3NlKHRydWUsIDI1MCk7XG5cdFx0fSBlbHNlIGlmIChjYW5BZHZhbmNlICYmIHNlbGYuZGlzdGFuY2VYID4gMCkge1xuXHRcdFx0cmV0ID0gc2VsZi5pbnN0YW5jZS5wcmV2aW91cyhzcGVlZFgpO1xuXHRcdH0gZWxzZSBpZiAoY2FuQWR2YW5jZSAmJiBzZWxmLmRpc3RhbmNlWCA8IDApIHtcblx0XHRcdHJldCA9IHNlbGYuaW5zdGFuY2UubmV4dChzcGVlZFgpO1xuXHRcdH1cblxuXHRcdGlmIChyZXQgPT09IGZhbHNlICYmIChzd2lwaW5nID09IFwieFwiIHx8IHN3aXBpbmcgPT0gXCJ5XCIpKSB7XG5cdFx0XHRzZWxmLmluc3RhbmNlLmNlbnRlclNsaWRlKDIwMCk7XG5cdFx0fVxuXG5cdFx0c2VsZi4kY29udGFpbmVyLnJlbW92ZUNsYXNzKFwiZmFuY3lib3gtaXMtc2xpZGluZ1wiKTtcblx0fTtcblxuXHQvLyBMaW1pdCBwYW5uaW5nIGZyb20gZWRnZXNcblx0Ly8gPT09PT09PT09PT09PT09PT09PT09PT09XG5cdEd1ZXN0dXJlcy5wcm90b3R5cGUuZW5kUGFubmluZyA9IGZ1bmN0aW9uKCkge1xuXHRcdHZhciBzZWxmID0gdGhpcyxcblx0XHRcdG5ld09mZnNldFgsXG5cdFx0XHRuZXdPZmZzZXRZLFxuXHRcdFx0bmV3UG9zO1xuXG5cdFx0aWYgKCFzZWxmLmNvbnRlbnRMYXN0UG9zKSB7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXG5cdFx0aWYgKHNlbGYub3B0cy5tb21lbnR1bSA9PT0gZmFsc2UgfHwgc2VsZi5kTXMgPiAzNTApIHtcblx0XHRcdG5ld09mZnNldFggPSBzZWxmLmNvbnRlbnRMYXN0UG9zLmxlZnQ7XG5cdFx0XHRuZXdPZmZzZXRZID0gc2VsZi5jb250ZW50TGFzdFBvcy50b3A7XG5cdFx0fSBlbHNlIHtcblx0XHRcdC8vIENvbnRpbnVlIG1vdmVtZW50XG5cdFx0XHRuZXdPZmZzZXRYID0gc2VsZi5jb250ZW50TGFzdFBvcy5sZWZ0ICsgc2VsZi52ZWxvY2l0eVggKiA1MDA7XG5cdFx0XHRuZXdPZmZzZXRZID0gc2VsZi5jb250ZW50TGFzdFBvcy50b3AgKyBzZWxmLnZlbG9jaXR5WSAqIDUwMDtcblx0XHR9XG5cblx0XHRuZXdQb3MgPSBzZWxmLmxpbWl0UG9zaXRpb24obmV3T2Zmc2V0WCwgbmV3T2Zmc2V0WSwgc2VsZi5jb250ZW50U3RhcnRQb3Mud2lkdGgsIHNlbGYuY29udGVudFN0YXJ0UG9zLmhlaWdodCk7XG5cblx0XHRuZXdQb3Mud2lkdGggPSBzZWxmLmNvbnRlbnRTdGFydFBvcy53aWR0aDtcblx0XHRuZXdQb3MuaGVpZ2h0ID0gc2VsZi5jb250ZW50U3RhcnRQb3MuaGVpZ2h0O1xuXG5cdFx0JC5mYW5jeWJveC5hbmltYXRlKHNlbGYuJGNvbnRlbnQsIG5ld1BvcywgMzMwKTtcblx0fTtcblxuXHRHdWVzdHVyZXMucHJvdG90eXBlLmVuZFpvb21pbmcgPSBmdW5jdGlvbigpIHtcblx0XHR2YXIgc2VsZiA9IHRoaXM7XG5cblx0XHR2YXIgY3VycmVudCA9IHNlbGYuaW5zdGFuY2UuY3VycmVudDtcblxuXHRcdHZhciBuZXdPZmZzZXRYLCBuZXdPZmZzZXRZLCBuZXdQb3MsIHJlc2V0O1xuXG5cdFx0dmFyIG5ld1dpZHRoID0gc2VsZi5uZXdXaWR0aDtcblx0XHR2YXIgbmV3SGVpZ2h0ID0gc2VsZi5uZXdIZWlnaHQ7XG5cblx0XHRpZiAoIXNlbGYuY29udGVudExhc3RQb3MpIHtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cblx0XHRuZXdPZmZzZXRYID0gc2VsZi5jb250ZW50TGFzdFBvcy5sZWZ0O1xuXHRcdG5ld09mZnNldFkgPSBzZWxmLmNvbnRlbnRMYXN0UG9zLnRvcDtcblxuXHRcdHJlc2V0ID0ge1xuXHRcdFx0dG9wOiBuZXdPZmZzZXRZLFxuXHRcdFx0bGVmdDogbmV3T2Zmc2V0WCxcblx0XHRcdHdpZHRoOiBuZXdXaWR0aCxcblx0XHRcdGhlaWdodDogbmV3SGVpZ2h0LFxuXHRcdFx0c2NhbGVYOiAxLFxuXHRcdFx0c2NhbGVZOiAxXG5cdFx0fTtcblxuXHRcdC8vIFJlc2V0IHNjYWxleC9zY2FsZVkgdmFsdWVzOyB0aGlzIGhlbHBzIGZvciBwZXJmb21hbmNlIGFuZCBkb2VzIG5vdCBicmVhayBhbmltYXRpb25cblx0XHQkLmZhbmN5Ym94LnNldFRyYW5zbGF0ZShzZWxmLiRjb250ZW50LCByZXNldCk7XG5cblx0XHRpZiAobmV3V2lkdGggPCBzZWxmLmNhbnZhc1dpZHRoICYmIG5ld0hlaWdodCA8IHNlbGYuY2FudmFzSGVpZ2h0KSB7XG5cdFx0XHRzZWxmLmluc3RhbmNlLnNjYWxlVG9GaXQoMTUwKTtcblx0XHR9IGVsc2UgaWYgKG5ld1dpZHRoID4gY3VycmVudC53aWR0aCB8fCBuZXdIZWlnaHQgPiBjdXJyZW50LmhlaWdodCkge1xuXHRcdFx0c2VsZi5pbnN0YW5jZS5zY2FsZVRvQWN0dWFsKHNlbGYuY2VudGVyUG9pbnRTdGFydFgsIHNlbGYuY2VudGVyUG9pbnRTdGFydFksIDE1MCk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdG5ld1BvcyA9IHNlbGYubGltaXRQb3NpdGlvbihuZXdPZmZzZXRYLCBuZXdPZmZzZXRZLCBuZXdXaWR0aCwgbmV3SGVpZ2h0KTtcblxuXHRcdFx0JC5mYW5jeWJveC5hbmltYXRlKHNlbGYuJGNvbnRlbnQsIG5ld1BvcywgMTUwKTtcblx0XHR9XG5cdH07XG5cblx0R3Vlc3R1cmVzLnByb3RvdHlwZS5vblRhcCA9IGZ1bmN0aW9uKGUpIHtcblx0XHR2YXIgc2VsZiA9IHRoaXM7XG5cdFx0dmFyICR0YXJnZXQgPSAkKGUudGFyZ2V0KTtcblxuXHRcdHZhciBpbnN0YW5jZSA9IHNlbGYuaW5zdGFuY2U7XG5cdFx0dmFyIGN1cnJlbnQgPSBpbnN0YW5jZS5jdXJyZW50O1xuXG5cdFx0dmFyIGVuZFBvaW50cyA9IChlICYmIGdldFBvaW50ZXJYWShlKSkgfHwgc2VsZi5zdGFydFBvaW50cztcblxuXHRcdHZhciB0YXBYID0gZW5kUG9pbnRzWzBdID8gZW5kUG9pbnRzWzBdLnggLSAkKHdpbmRvdykuc2Nyb2xsTGVmdCgpIC0gc2VsZi5zdGFnZVBvcy5sZWZ0IDogMDtcblx0XHR2YXIgdGFwWSA9IGVuZFBvaW50c1swXSA/IGVuZFBvaW50c1swXS55IC0gJCh3aW5kb3cpLnNjcm9sbFRvcCgpIC0gc2VsZi5zdGFnZVBvcy50b3AgOiAwO1xuXG5cdFx0dmFyIHdoZXJlO1xuXG5cdFx0dmFyIHByb2Nlc3MgPSBmdW5jdGlvbihwcmVmaXgpIHtcblx0XHRcdHZhciBhY3Rpb24gPSBjdXJyZW50Lm9wdHNbcHJlZml4XTtcblxuXHRcdFx0aWYgKCQuaXNGdW5jdGlvbihhY3Rpb24pKSB7XG5cdFx0XHRcdGFjdGlvbiA9IGFjdGlvbi5hcHBseShpbnN0YW5jZSwgW2N1cnJlbnQsIGVdKTtcblx0XHRcdH1cblxuXHRcdFx0aWYgKCFhY3Rpb24pIHtcblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0fVxuXG5cdFx0XHRzd2l0Y2ggKGFjdGlvbikge1xuXHRcdFx0XHRjYXNlIFwiY2xvc2VcIjpcblx0XHRcdFx0XHRpbnN0YW5jZS5jbG9zZShzZWxmLnN0YXJ0RXZlbnQpO1xuXG5cdFx0XHRcdFx0YnJlYWs7XG5cblx0XHRcdFx0Y2FzZSBcInRvZ2dsZUNvbnRyb2xzXCI6XG5cdFx0XHRcdFx0aW5zdGFuY2UudG9nZ2xlQ29udHJvbHMoKTtcblxuXHRcdFx0XHRcdGJyZWFrO1xuXG5cdFx0XHRcdGNhc2UgXCJuZXh0XCI6XG5cdFx0XHRcdFx0aW5zdGFuY2UubmV4dCgpO1xuXG5cdFx0XHRcdFx0YnJlYWs7XG5cblx0XHRcdFx0Y2FzZSBcIm5leHRPckNsb3NlXCI6XG5cdFx0XHRcdFx0aWYgKGluc3RhbmNlLmdyb3VwLmxlbmd0aCA+IDEpIHtcblx0XHRcdFx0XHRcdGluc3RhbmNlLm5leHQoKTtcblx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0aW5zdGFuY2UuY2xvc2Uoc2VsZi5zdGFydEV2ZW50KTtcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRicmVhaztcblxuXHRcdFx0XHRjYXNlIFwiem9vbVwiOlxuXHRcdFx0XHRcdGlmIChjdXJyZW50LnR5cGUgPT0gXCJpbWFnZVwiICYmIChjdXJyZW50LmlzTG9hZGVkIHx8IGN1cnJlbnQuJGdob3N0KSkge1xuXHRcdFx0XHRcdFx0aWYgKGluc3RhbmNlLmNhblBhbigpKSB7XG5cdFx0XHRcdFx0XHRcdGluc3RhbmNlLnNjYWxlVG9GaXQoKTtcblx0XHRcdFx0XHRcdH0gZWxzZSBpZiAoaW5zdGFuY2UuaXNTY2FsZWREb3duKCkpIHtcblx0XHRcdFx0XHRcdFx0aW5zdGFuY2Uuc2NhbGVUb0FjdHVhbCh0YXBYLCB0YXBZKTtcblx0XHRcdFx0XHRcdH0gZWxzZSBpZiAoaW5zdGFuY2UuZ3JvdXAubGVuZ3RoIDwgMikge1xuXHRcdFx0XHRcdFx0XHRpbnN0YW5jZS5jbG9zZShzZWxmLnN0YXJ0RXZlbnQpO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0fVxuXHRcdH07XG5cblx0XHQvLyBJZ25vcmUgcmlnaHQgY2xpY2tcblx0XHRpZiAoZS5vcmlnaW5hbEV2ZW50ICYmIGUub3JpZ2luYWxFdmVudC5idXR0b24gPT0gMikge1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblxuXHRcdC8vIFNraXAgaWYgY2xpY2tlZCBvbiB0aGUgc2Nyb2xsYmFyXG5cdFx0aWYgKCEkdGFyZ2V0LmlzKFwiaW1nXCIpICYmIHRhcFggPiAkdGFyZ2V0WzBdLmNsaWVudFdpZHRoICsgJHRhcmdldC5vZmZzZXQoKS5sZWZ0KSB7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXG5cdFx0Ly8gQ2hlY2sgd2hlcmUgaXMgY2xpY2tlZFxuXHRcdGlmICgkdGFyZ2V0LmlzKFwiLmZhbmN5Ym94LWJnLC5mYW5jeWJveC1pbm5lciwuZmFuY3lib3gtb3V0ZXIsLmZhbmN5Ym94LWNvbnRhaW5lclwiKSkge1xuXHRcdFx0d2hlcmUgPSBcIk91dHNpZGVcIjtcblx0XHR9IGVsc2UgaWYgKCR0YXJnZXQuaXMoXCIuZmFuY3lib3gtc2xpZGVcIikpIHtcblx0XHRcdHdoZXJlID0gXCJTbGlkZVwiO1xuXHRcdH0gZWxzZSBpZiAoXG5cdFx0XHRpbnN0YW5jZS5jdXJyZW50LiRjb250ZW50ICYmXG5cdFx0XHRpbnN0YW5jZS5jdXJyZW50LiRjb250ZW50XG5cdFx0XHRcdC5maW5kKCR0YXJnZXQpXG5cdFx0XHRcdC5hZGRCYWNrKClcblx0XHRcdFx0LmZpbHRlcigkdGFyZ2V0KS5sZW5ndGhcblx0XHQpIHtcblx0XHRcdHdoZXJlID0gXCJDb250ZW50XCI7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cblx0XHQvLyBDaGVjayBpZiB0aGlzIGlzIGEgZG91YmxlIHRhcFxuXHRcdGlmIChzZWxmLnRhcHBlZCkge1xuXHRcdFx0Ly8gU3RvcCBwcmV2aW91c2x5IGNyZWF0ZWQgc2luZ2xlIHRhcFxuXHRcdFx0Y2xlYXJUaW1lb3V0KHNlbGYudGFwcGVkKTtcblx0XHRcdHNlbGYudGFwcGVkID0gbnVsbDtcblxuXHRcdFx0Ly8gU2tpcCBpZiBkaXN0YW5jZSBiZXR3ZWVuIHRhcHMgaXMgdG9vIGJpZ1xuXHRcdFx0aWYgKE1hdGguYWJzKHRhcFggLSBzZWxmLnRhcFgpID4gNTAgfHwgTWF0aC5hYnModGFwWSAtIHNlbGYudGFwWSkgPiA1MCkge1xuXHRcdFx0XHRyZXR1cm4gdGhpcztcblx0XHRcdH1cblxuXHRcdFx0Ly8gT0ssIG5vdyB3ZSBhc3N1bWUgdGhhdCB0aGlzIGlzIGEgZG91YmxlLXRhcFxuXHRcdFx0cHJvY2VzcyhcImRibGNsaWNrXCIgKyB3aGVyZSk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdC8vIFNpbmdsZSB0YXAgd2lsbCBiZSBwcm9jZXNzZWQgaWYgdXNlciBoYXMgbm90IGNsaWNrZWQgc2Vjb25kIHRpbWUgd2l0aGluIDMwMG1zXG5cdFx0XHQvLyBvciB0aGVyZSBpcyBubyBuZWVkIHRvIHdhaXQgZm9yIGRvdWJsZS10YXBcblx0XHRcdHNlbGYudGFwWCA9IHRhcFg7XG5cdFx0XHRzZWxmLnRhcFkgPSB0YXBZO1xuXG5cdFx0XHRpZiAoY3VycmVudC5vcHRzW1wiZGJsY2xpY2tcIiArIHdoZXJlXSAmJiBjdXJyZW50Lm9wdHNbXCJkYmxjbGlja1wiICsgd2hlcmVdICE9PSBjdXJyZW50Lm9wdHNbXCJjbGlja1wiICsgd2hlcmVdKSB7XG5cdFx0XHRcdHNlbGYudGFwcGVkID0gc2V0VGltZW91dChmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRzZWxmLnRhcHBlZCA9IG51bGw7XG5cblx0XHRcdFx0XHRpZiAoIWluc3RhbmNlLmlzQW5pbWF0aW5nKSB7XG5cdFx0XHRcdFx0XHRwcm9jZXNzKFwiY2xpY2tcIiArIHdoZXJlKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH0sIDUwMCk7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRwcm9jZXNzKFwiY2xpY2tcIiArIHdoZXJlKTtcblx0XHRcdH1cblx0XHR9XG5cblx0XHRyZXR1cm4gdGhpcztcblx0fTtcblxuXHQkKGRvY3VtZW50KVxuXHRcdC5vbihcIm9uQWN0aXZhdGUuZmJcIiwgZnVuY3Rpb24oZSwgaW5zdGFuY2UpIHtcblx0XHRcdGlmIChpbnN0YW5jZSAmJiAhaW5zdGFuY2UuR3Vlc3R1cmVzKSB7XG5cdFx0XHRcdGluc3RhbmNlLkd1ZXN0dXJlcyA9IG5ldyBHdWVzdHVyZXMoaW5zdGFuY2UpO1xuXHRcdFx0fVxuXHRcdH0pXG5cdFx0Lm9uKFwiYmVmb3JlQ2xvc2UuZmJcIiwgZnVuY3Rpb24oZSwgaW5zdGFuY2UpIHtcblx0XHRcdGlmIChpbnN0YW5jZSAmJiBpbnN0YW5jZS5HdWVzdHVyZXMpIHtcblx0XHRcdFx0aW5zdGFuY2UuR3Vlc3R1cmVzLmRlc3Ryb3koKTtcblx0XHRcdH1cblx0XHR9KTtcbn0pKHdpbmRvdywgZG9jdW1lbnQsIGpRdWVyeSk7XG5cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vL1xuLy8gU2xpZGVTaG93XG4vLyBFbmFibGVzIHNsaWRlc2hvdyBmdW5jdGlvbmFsaXR5XG4vL1xuLy8gRXhhbXBsZSBvZiB1c2FnZTpcbi8vICQuZmFuY3lib3guZ2V0SW5zdGFuY2UoKS5TbGlkZVNob3cuc3RhcnQoKVxuLy9cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4oZnVuY3Rpb24oZG9jdW1lbnQsICQpIHtcblx0XCJ1c2Ugc3RyaWN0XCI7XG5cblx0JC5leHRlbmQodHJ1ZSwgJC5mYW5jeWJveC5kZWZhdWx0cywge1xuXHRcdGJ0blRwbDoge1xuXHRcdFx0c2xpZGVTaG93OlxuXHRcdFx0XHQnPGJ1dHRvbiBkYXRhLWZhbmN5Ym94LXBsYXkgY2xhc3M9XCJmYW5jeWJveC1idXR0b24gZmFuY3lib3gtYnV0dG9uLS1wbGF5XCIgdGl0bGU9XCJ7e1BMQVlfU1RBUlR9fVwiPicgK1xuXHRcdFx0XHQnPHN2ZyB4bWxucz1cImh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnXCIgdmlld0JveD1cIjAgMCAyNCAyNFwiPjxwYXRoIGQ9XCJNNi41IDUuNHYxMy4ybDExLTYuNnpcIi8+PC9zdmc+JyArXG5cdFx0XHRcdCc8c3ZnIHhtbG5zPVwiaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmdcIiB2aWV3Qm94PVwiMCAwIDI0IDI0XCI+PHBhdGggZD1cIk04LjMzIDUuNzVoMi4ydjEyLjVoLTIuMlY1Ljc1em01LjE1IDBoMi4ydjEyLjVoLTIuMlY1Ljc1elwiLz48L3N2Zz4nICtcblx0XHRcdFx0XCI8L2J1dHRvbj5cIlxuXHRcdH0sXG5cdFx0c2xpZGVTaG93OiB7XG5cdFx0XHRhdXRvU3RhcnQ6IGZhbHNlLFxuXHRcdFx0c3BlZWQ6IDMwMDAsXG5cdFx0XHRwcm9ncmVzczogdHJ1ZVxuXHRcdH1cblx0fSk7XG5cblx0dmFyIFNsaWRlU2hvdyA9IGZ1bmN0aW9uKGluc3RhbmNlKSB7XG5cdFx0dGhpcy5pbnN0YW5jZSA9IGluc3RhbmNlO1xuXHRcdHRoaXMuaW5pdCgpO1xuXHR9O1xuXG5cdCQuZXh0ZW5kKFNsaWRlU2hvdy5wcm90b3R5cGUsIHtcblx0XHR0aW1lcjogbnVsbCxcblx0XHRpc0FjdGl2ZTogZmFsc2UsXG5cdFx0JGJ1dHRvbjogbnVsbCxcblxuXHRcdGluaXQ6IGZ1bmN0aW9uKCkge1xuXHRcdFx0dmFyIHNlbGYgPSB0aGlzLFxuXHRcdFx0XHRpbnN0YW5jZSA9IHNlbGYuaW5zdGFuY2UsXG5cdFx0XHRcdG9wdHMgPSBpbnN0YW5jZS5ncm91cFtpbnN0YW5jZS5jdXJySW5kZXhdLm9wdHMuc2xpZGVTaG93O1xuXG5cdFx0XHRzZWxmLiRidXR0b24gPSBpbnN0YW5jZS4kcmVmcy50b29sYmFyLmZpbmQoXCJbZGF0YS1mYW5jeWJveC1wbGF5XVwiKS5vbihcImNsaWNrXCIsIGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRzZWxmLnRvZ2dsZSgpO1xuXHRcdFx0fSk7XG5cblx0XHRcdGlmIChpbnN0YW5jZS5ncm91cC5sZW5ndGggPCAyIHx8ICFvcHRzKSB7XG5cdFx0XHRcdHNlbGYuJGJ1dHRvbi5oaWRlKCk7XG5cdFx0XHR9IGVsc2UgaWYgKG9wdHMucHJvZ3Jlc3MpIHtcblx0XHRcdFx0c2VsZi4kcHJvZ3Jlc3MgPSAkKCc8ZGl2IGNsYXNzPVwiZmFuY3lib3gtcHJvZ3Jlc3NcIj48L2Rpdj4nKS5hcHBlbmRUbyhpbnN0YW5jZS4kcmVmcy5pbm5lcik7XG5cdFx0XHR9XG5cdFx0fSxcblxuXHRcdHNldDogZnVuY3Rpb24oZm9yY2UpIHtcblx0XHRcdHZhciBzZWxmID0gdGhpcyxcblx0XHRcdFx0aW5zdGFuY2UgPSBzZWxmLmluc3RhbmNlLFxuXHRcdFx0XHRjdXJyZW50ID0gaW5zdGFuY2UuY3VycmVudDtcblxuXHRcdFx0Ly8gQ2hlY2sgaWYgcmVhY2hlZCBsYXN0IGVsZW1lbnRcblx0XHRcdGlmIChjdXJyZW50ICYmIChmb3JjZSA9PT0gdHJ1ZSB8fCBjdXJyZW50Lm9wdHMubG9vcCB8fCBpbnN0YW5jZS5jdXJySW5kZXggPCBpbnN0YW5jZS5ncm91cC5sZW5ndGggLSAxKSkge1xuXHRcdFx0XHRpZiAoc2VsZi5pc0FjdGl2ZSAmJiBjdXJyZW50LmNvbnRlbnRUeXBlICE9PSBcInZpZGVvXCIpIHtcblx0XHRcdFx0XHRpZiAoc2VsZi4kcHJvZ3Jlc3MpIHtcblx0XHRcdFx0XHRcdCQuZmFuY3lib3guYW5pbWF0ZShzZWxmLiRwcm9ncmVzcy5zaG93KCksIHtzY2FsZVg6IDF9LCBjdXJyZW50Lm9wdHMuc2xpZGVTaG93LnNwZWVkKTtcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRzZWxmLnRpbWVyID0gc2V0VGltZW91dChmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRcdGlmICghaW5zdGFuY2UuY3VycmVudC5vcHRzLmxvb3AgJiYgaW5zdGFuY2UuY3VycmVudC5pbmRleCA9PSBpbnN0YW5jZS5ncm91cC5sZW5ndGggLSAxKSB7XG5cdFx0XHRcdFx0XHRcdGluc3RhbmNlLmp1bXBUbygwKTtcblx0XHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHRcdGluc3RhbmNlLm5leHQoKTtcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHR9LCBjdXJyZW50Lm9wdHMuc2xpZGVTaG93LnNwZWVkKTtcblx0XHRcdFx0fVxuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0c2VsZi5zdG9wKCk7XG5cdFx0XHRcdGluc3RhbmNlLmlkbGVTZWNvbmRzQ291bnRlciA9IDA7XG5cdFx0XHRcdGluc3RhbmNlLnNob3dDb250cm9scygpO1xuXHRcdFx0fVxuXHRcdH0sXG5cblx0XHRjbGVhcjogZnVuY3Rpb24oKSB7XG5cdFx0XHR2YXIgc2VsZiA9IHRoaXM7XG5cblx0XHRcdGNsZWFyVGltZW91dChzZWxmLnRpbWVyKTtcblxuXHRcdFx0c2VsZi50aW1lciA9IG51bGw7XG5cblx0XHRcdGlmIChzZWxmLiRwcm9ncmVzcykge1xuXHRcdFx0XHRzZWxmLiRwcm9ncmVzcy5yZW1vdmVBdHRyKFwic3R5bGVcIikuaGlkZSgpO1xuXHRcdFx0fVxuXHRcdH0sXG5cblx0XHRzdGFydDogZnVuY3Rpb24oKSB7XG5cdFx0XHR2YXIgc2VsZiA9IHRoaXMsXG5cdFx0XHRcdGN1cnJlbnQgPSBzZWxmLmluc3RhbmNlLmN1cnJlbnQ7XG5cblx0XHRcdGlmIChjdXJyZW50KSB7XG5cdFx0XHRcdHNlbGYuJGJ1dHRvblxuXHRcdFx0XHRcdC5hdHRyKFwidGl0bGVcIiwgKGN1cnJlbnQub3B0cy5pMThuW2N1cnJlbnQub3B0cy5sYW5nXSB8fCBjdXJyZW50Lm9wdHMuaTE4bi5lbikuUExBWV9TVE9QKVxuXHRcdFx0XHRcdC5yZW1vdmVDbGFzcyhcImZhbmN5Ym94LWJ1dHRvbi0tcGxheVwiKVxuXHRcdFx0XHRcdC5hZGRDbGFzcyhcImZhbmN5Ym94LWJ1dHRvbi0tcGF1c2VcIik7XG5cblx0XHRcdFx0c2VsZi5pc0FjdGl2ZSA9IHRydWU7XG5cblx0XHRcdFx0aWYgKGN1cnJlbnQuaXNDb21wbGV0ZSkge1xuXHRcdFx0XHRcdHNlbGYuc2V0KHRydWUpO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0c2VsZi5pbnN0YW5jZS50cmlnZ2VyKFwib25TbGlkZVNob3dDaGFuZ2VcIiwgdHJ1ZSk7XG5cdFx0XHR9XG5cdFx0fSxcblxuXHRcdHN0b3A6IGZ1bmN0aW9uKCkge1xuXHRcdFx0dmFyIHNlbGYgPSB0aGlzLFxuXHRcdFx0XHRjdXJyZW50ID0gc2VsZi5pbnN0YW5jZS5jdXJyZW50O1xuXG5cdFx0XHRzZWxmLmNsZWFyKCk7XG5cblx0XHRcdHNlbGYuJGJ1dHRvblxuXHRcdFx0XHQuYXR0cihcInRpdGxlXCIsIChjdXJyZW50Lm9wdHMuaTE4bltjdXJyZW50Lm9wdHMubGFuZ10gfHwgY3VycmVudC5vcHRzLmkxOG4uZW4pLlBMQVlfU1RBUlQpXG5cdFx0XHRcdC5yZW1vdmVDbGFzcyhcImZhbmN5Ym94LWJ1dHRvbi0tcGF1c2VcIilcblx0XHRcdFx0LmFkZENsYXNzKFwiZmFuY3lib3gtYnV0dG9uLS1wbGF5XCIpO1xuXG5cdFx0XHRzZWxmLmlzQWN0aXZlID0gZmFsc2U7XG5cblx0XHRcdHNlbGYuaW5zdGFuY2UudHJpZ2dlcihcIm9uU2xpZGVTaG93Q2hhbmdlXCIsIGZhbHNlKTtcblxuXHRcdFx0aWYgKHNlbGYuJHByb2dyZXNzKSB7XG5cdFx0XHRcdHNlbGYuJHByb2dyZXNzLnJlbW92ZUF0dHIoXCJzdHlsZVwiKS5oaWRlKCk7XG5cdFx0XHR9XG5cdFx0fSxcblxuXHRcdHRvZ2dsZTogZnVuY3Rpb24oKSB7XG5cdFx0XHR2YXIgc2VsZiA9IHRoaXM7XG5cblx0XHRcdGlmIChzZWxmLmlzQWN0aXZlKSB7XG5cdFx0XHRcdHNlbGYuc3RvcCgpO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0c2VsZi5zdGFydCgpO1xuXHRcdFx0fVxuXHRcdH1cblx0fSk7XG5cblx0JChkb2N1bWVudCkub24oe1xuXHRcdFwib25Jbml0LmZiXCI6IGZ1bmN0aW9uKGUsIGluc3RhbmNlKSB7XG5cdFx0XHRpZiAoaW5zdGFuY2UgJiYgIWluc3RhbmNlLlNsaWRlU2hvdykge1xuXHRcdFx0XHRpbnN0YW5jZS5TbGlkZVNob3cgPSBuZXcgU2xpZGVTaG93KGluc3RhbmNlKTtcblx0XHRcdH1cblx0XHR9LFxuXG5cdFx0XCJiZWZvcmVTaG93LmZiXCI6IGZ1bmN0aW9uKGUsIGluc3RhbmNlLCBjdXJyZW50LCBmaXJzdFJ1bikge1xuXHRcdFx0dmFyIFNsaWRlU2hvdyA9IGluc3RhbmNlICYmIGluc3RhbmNlLlNsaWRlU2hvdztcblxuXHRcdFx0aWYgKGZpcnN0UnVuKSB7XG5cdFx0XHRcdGlmIChTbGlkZVNob3cgJiYgY3VycmVudC5vcHRzLnNsaWRlU2hvdy5hdXRvU3RhcnQpIHtcblx0XHRcdFx0XHRTbGlkZVNob3cuc3RhcnQoKTtcblx0XHRcdFx0fVxuXHRcdFx0fSBlbHNlIGlmIChTbGlkZVNob3cgJiYgU2xpZGVTaG93LmlzQWN0aXZlKSB7XG5cdFx0XHRcdFNsaWRlU2hvdy5jbGVhcigpO1xuXHRcdFx0fVxuXHRcdH0sXG5cblx0XHRcImFmdGVyU2hvdy5mYlwiOiBmdW5jdGlvbihlLCBpbnN0YW5jZSwgY3VycmVudCkge1xuXHRcdFx0dmFyIFNsaWRlU2hvdyA9IGluc3RhbmNlICYmIGluc3RhbmNlLlNsaWRlU2hvdztcblxuXHRcdFx0aWYgKFNsaWRlU2hvdyAmJiBTbGlkZVNob3cuaXNBY3RpdmUpIHtcblx0XHRcdFx0U2xpZGVTaG93LnNldCgpO1xuXHRcdFx0fVxuXHRcdH0sXG5cblx0XHRcImFmdGVyS2V5ZG93bi5mYlwiOiBmdW5jdGlvbihlLCBpbnN0YW5jZSwgY3VycmVudCwga2V5cHJlc3MsIGtleWNvZGUpIHtcblx0XHRcdHZhciBTbGlkZVNob3cgPSBpbnN0YW5jZSAmJiBpbnN0YW5jZS5TbGlkZVNob3c7XG5cblx0XHRcdC8vIFwiUFwiIG9yIFNwYWNlYmFyXG5cdFx0XHRpZiAoU2xpZGVTaG93ICYmIGN1cnJlbnQub3B0cy5zbGlkZVNob3cgJiYgKGtleWNvZGUgPT09IDgwIHx8IGtleWNvZGUgPT09IDMyKSAmJiAhJChkb2N1bWVudC5hY3RpdmVFbGVtZW50KS5pcyhcImJ1dHRvbixhLGlucHV0XCIpKSB7XG5cdFx0XHRcdGtleXByZXNzLnByZXZlbnREZWZhdWx0KCk7XG5cblx0XHRcdFx0U2xpZGVTaG93LnRvZ2dsZSgpO1xuXHRcdFx0fVxuXHRcdH0sXG5cblx0XHRcImJlZm9yZUNsb3NlLmZiIG9uRGVhY3RpdmF0ZS5mYlwiOiBmdW5jdGlvbihlLCBpbnN0YW5jZSkge1xuXHRcdFx0dmFyIFNsaWRlU2hvdyA9IGluc3RhbmNlICYmIGluc3RhbmNlLlNsaWRlU2hvdztcblxuXHRcdFx0aWYgKFNsaWRlU2hvdykge1xuXHRcdFx0XHRTbGlkZVNob3cuc3RvcCgpO1xuXHRcdFx0fVxuXHRcdH1cblx0fSk7XG5cblx0Ly8gUGFnZSBWaXNpYmlsaXR5IEFQSSB0byBwYXVzZSBzbGlkZXNob3cgd2hlbiB3aW5kb3cgaXMgbm90IGFjdGl2ZVxuXHQkKGRvY3VtZW50KS5vbihcInZpc2liaWxpdHljaGFuZ2VcIiwgZnVuY3Rpb24oKSB7XG5cdFx0dmFyIGluc3RhbmNlID0gJC5mYW5jeWJveC5nZXRJbnN0YW5jZSgpLFxuXHRcdFx0U2xpZGVTaG93ID0gaW5zdGFuY2UgJiYgaW5zdGFuY2UuU2xpZGVTaG93O1xuXG5cdFx0aWYgKFNsaWRlU2hvdyAmJiBTbGlkZVNob3cuaXNBY3RpdmUpIHtcblx0XHRcdGlmIChkb2N1bWVudC5oaWRkZW4pIHtcblx0XHRcdFx0U2xpZGVTaG93LmNsZWFyKCk7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRTbGlkZVNob3cuc2V0KCk7XG5cdFx0XHR9XG5cdFx0fVxuXHR9KTtcbn0pKGRvY3VtZW50LCBqUXVlcnkpO1xuXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy9cbi8vIEZ1bGxTY3JlZW5cbi8vIEFkZHMgZnVsbHNjcmVlbiBmdW5jdGlvbmFsaXR5XG4vL1xuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbihmdW5jdGlvbihkb2N1bWVudCwgJCkge1xuXHRcInVzZSBzdHJpY3RcIjtcblxuXHQvLyBDb2xsZWN0aW9uIG9mIG1ldGhvZHMgc3VwcG9ydGVkIGJ5IHVzZXIgYnJvd3NlclxuXHR2YXIgZm4gPSAoZnVuY3Rpb24oKSB7XG5cdFx0dmFyIGZuTWFwID0gW1xuXHRcdFx0W1wicmVxdWVzdEZ1bGxzY3JlZW5cIiwgXCJleGl0RnVsbHNjcmVlblwiLCBcImZ1bGxzY3JlZW5FbGVtZW50XCIsIFwiZnVsbHNjcmVlbkVuYWJsZWRcIiwgXCJmdWxsc2NyZWVuY2hhbmdlXCIsIFwiZnVsbHNjcmVlbmVycm9yXCJdLFxuXHRcdFx0Ly8gbmV3IFdlYktpdFxuXHRcdFx0W1xuXHRcdFx0XHRcIndlYmtpdFJlcXVlc3RGdWxsc2NyZWVuXCIsXG5cdFx0XHRcdFwid2Via2l0RXhpdEZ1bGxzY3JlZW5cIixcblx0XHRcdFx0XCJ3ZWJraXRGdWxsc2NyZWVuRWxlbWVudFwiLFxuXHRcdFx0XHRcIndlYmtpdEZ1bGxzY3JlZW5FbmFibGVkXCIsXG5cdFx0XHRcdFwid2Via2l0ZnVsbHNjcmVlbmNoYW5nZVwiLFxuXHRcdFx0XHRcIndlYmtpdGZ1bGxzY3JlZW5lcnJvclwiXG5cdFx0XHRdLFxuXHRcdFx0Ly8gb2xkIFdlYktpdCAoU2FmYXJpIDUuMSlcblx0XHRcdFtcblx0XHRcdFx0XCJ3ZWJraXRSZXF1ZXN0RnVsbFNjcmVlblwiLFxuXHRcdFx0XHRcIndlYmtpdENhbmNlbEZ1bGxTY3JlZW5cIixcblx0XHRcdFx0XCJ3ZWJraXRDdXJyZW50RnVsbFNjcmVlbkVsZW1lbnRcIixcblx0XHRcdFx0XCJ3ZWJraXRDYW5jZWxGdWxsU2NyZWVuXCIsXG5cdFx0XHRcdFwid2Via2l0ZnVsbHNjcmVlbmNoYW5nZVwiLFxuXHRcdFx0XHRcIndlYmtpdGZ1bGxzY3JlZW5lcnJvclwiXG5cdFx0XHRdLFxuXHRcdFx0W1xuXHRcdFx0XHRcIm1velJlcXVlc3RGdWxsU2NyZWVuXCIsXG5cdFx0XHRcdFwibW96Q2FuY2VsRnVsbFNjcmVlblwiLFxuXHRcdFx0XHRcIm1vekZ1bGxTY3JlZW5FbGVtZW50XCIsXG5cdFx0XHRcdFwibW96RnVsbFNjcmVlbkVuYWJsZWRcIixcblx0XHRcdFx0XCJtb3pmdWxsc2NyZWVuY2hhbmdlXCIsXG5cdFx0XHRcdFwibW96ZnVsbHNjcmVlbmVycm9yXCJcblx0XHRcdF0sXG5cdFx0XHRbXCJtc1JlcXVlc3RGdWxsc2NyZWVuXCIsIFwibXNFeGl0RnVsbHNjcmVlblwiLCBcIm1zRnVsbHNjcmVlbkVsZW1lbnRcIiwgXCJtc0Z1bGxzY3JlZW5FbmFibGVkXCIsIFwiTVNGdWxsc2NyZWVuQ2hhbmdlXCIsIFwiTVNGdWxsc2NyZWVuRXJyb3JcIl1cblx0XHRdO1xuXG5cdFx0dmFyIHJldCA9IHt9O1xuXG5cdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCBmbk1hcC5sZW5ndGg7IGkrKykge1xuXHRcdFx0dmFyIHZhbCA9IGZuTWFwW2ldO1xuXG5cdFx0XHRpZiAodmFsICYmIHZhbFsxXSBpbiBkb2N1bWVudCkge1xuXHRcdFx0XHRmb3IgKHZhciBqID0gMDsgaiA8IHZhbC5sZW5ndGg7IGorKykge1xuXHRcdFx0XHRcdHJldFtmbk1hcFswXVtqXV0gPSB2YWxbal07XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRyZXR1cm4gcmV0O1xuXHRcdFx0fVxuXHRcdH1cblxuXHRcdHJldHVybiBmYWxzZTtcblx0fSkoKTtcblxuXHRpZiAoZm4pIHtcblx0XHR2YXIgRnVsbFNjcmVlbiA9IHtcblx0XHRcdHJlcXVlc3Q6IGZ1bmN0aW9uKGVsZW0pIHtcblx0XHRcdFx0ZWxlbSA9IGVsZW0gfHwgZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50O1xuXG5cdFx0XHRcdGVsZW1bZm4ucmVxdWVzdEZ1bGxzY3JlZW5dKGVsZW0uQUxMT1dfS0VZQk9BUkRfSU5QVVQpO1xuXHRcdFx0fSxcblx0XHRcdGV4aXQ6IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRkb2N1bWVudFtmbi5leGl0RnVsbHNjcmVlbl0oKTtcblx0XHRcdH0sXG5cdFx0XHR0b2dnbGU6IGZ1bmN0aW9uKGVsZW0pIHtcblx0XHRcdFx0ZWxlbSA9IGVsZW0gfHwgZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50O1xuXG5cdFx0XHRcdGlmICh0aGlzLmlzRnVsbHNjcmVlbigpKSB7XG5cdFx0XHRcdFx0dGhpcy5leGl0KCk7XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0dGhpcy5yZXF1ZXN0KGVsZW0pO1xuXHRcdFx0XHR9XG5cdFx0XHR9LFxuXHRcdFx0aXNGdWxsc2NyZWVuOiBmdW5jdGlvbigpIHtcblx0XHRcdFx0cmV0dXJuIEJvb2xlYW4oZG9jdW1lbnRbZm4uZnVsbHNjcmVlbkVsZW1lbnRdKTtcblx0XHRcdH0sXG5cdFx0XHRlbmFibGVkOiBmdW5jdGlvbigpIHtcblx0XHRcdFx0cmV0dXJuIEJvb2xlYW4oZG9jdW1lbnRbZm4uZnVsbHNjcmVlbkVuYWJsZWRdKTtcblx0XHRcdH1cblx0XHR9O1xuXG5cdFx0JC5leHRlbmQodHJ1ZSwgJC5mYW5jeWJveC5kZWZhdWx0cywge1xuXHRcdFx0YnRuVHBsOiB7XG5cdFx0XHRcdGZ1bGxTY3JlZW46XG5cdFx0XHRcdFx0JzxidXR0b24gZGF0YS1mYW5jeWJveC1mdWxsc2NyZWVuIGNsYXNzPVwiZmFuY3lib3gtYnV0dG9uIGZhbmN5Ym94LWJ1dHRvbi0tZnNlbnRlclwiIHRpdGxlPVwie3tGVUxMX1NDUkVFTn19XCI+JyArXG5cdFx0XHRcdFx0JzxzdmcgeG1sbnM9XCJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2Z1wiIHZpZXdCb3g9XCIwIDAgMjQgMjRcIj48cGF0aCBkPVwiTTcgMTRINXY1aDV2LTJIN3YtM3ptLTItNGgyVjdoM1Y1SDV2NXptMTIgN2gtM3YyaDV2LTVoLTJ2M3pNMTQgNXYyaDN2M2gyVjVoLTV6XCIvPjwvc3ZnPicgK1xuXHRcdFx0XHRcdCc8c3ZnIHhtbG5zPVwiaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmdcIiB2aWV3Qm94PVwiMCAwIDI0IDI0XCI+PHBhdGggZD1cIk01IDE2aDN2M2gydi01SDV6bTMtOEg1djJoNVY1SDh6bTYgMTFoMnYtM2gzdi0yaC01em0yLTExVjVoLTJ2NWg1Vjh6XCIvPjwvc3ZnPicgK1xuXHRcdFx0XHRcdFwiPC9idXR0b24+XCJcblx0XHRcdH0sXG5cdFx0XHRmdWxsU2NyZWVuOiB7XG5cdFx0XHRcdGF1dG9TdGFydDogZmFsc2Vcblx0XHRcdH1cblx0XHR9KTtcblxuXHRcdCQoZG9jdW1lbnQpLm9uKGZuLmZ1bGxzY3JlZW5jaGFuZ2UsIGZ1bmN0aW9uKCkge1xuXHRcdFx0dmFyIGlzRnVsbHNjcmVlbiA9IEZ1bGxTY3JlZW4uaXNGdWxsc2NyZWVuKCksXG5cdFx0XHRcdGluc3RhbmNlID0gJC5mYW5jeWJveC5nZXRJbnN0YW5jZSgpO1xuXG5cdFx0XHRpZiAoaW5zdGFuY2UpIHtcblx0XHRcdFx0Ly8gSWYgaW1hZ2UgaXMgem9vbWluZywgdGhlbiBmb3JjZSB0byBzdG9wIGFuZCByZXBvc2l0aW9uIHByb3Blcmx5XG5cdFx0XHRcdGlmIChpbnN0YW5jZS5jdXJyZW50ICYmIGluc3RhbmNlLmN1cnJlbnQudHlwZSA9PT0gXCJpbWFnZVwiICYmIGluc3RhbmNlLmlzQW5pbWF0aW5nKSB7XG5cdFx0XHRcdFx0aW5zdGFuY2UuY3VycmVudC4kY29udGVudC5jc3MoXCJ0cmFuc2l0aW9uXCIsIFwibm9uZVwiKTtcblxuXHRcdFx0XHRcdGluc3RhbmNlLmlzQW5pbWF0aW5nID0gZmFsc2U7XG5cblx0XHRcdFx0XHRpbnN0YW5jZS51cGRhdGUodHJ1ZSwgdHJ1ZSwgMCk7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRpbnN0YW5jZS50cmlnZ2VyKFwib25GdWxsc2NyZWVuQ2hhbmdlXCIsIGlzRnVsbHNjcmVlbik7XG5cblx0XHRcdFx0aW5zdGFuY2UuJHJlZnMuY29udGFpbmVyLnRvZ2dsZUNsYXNzKFwiZmFuY3lib3gtaXMtZnVsbHNjcmVlblwiLCBpc0Z1bGxzY3JlZW4pO1xuXG5cdFx0XHRcdGluc3RhbmNlLiRyZWZzLnRvb2xiYXJcblx0XHRcdFx0XHQuZmluZChcIltkYXRhLWZhbmN5Ym94LWZ1bGxzY3JlZW5dXCIpXG5cdFx0XHRcdFx0LnRvZ2dsZUNsYXNzKFwiZmFuY3lib3gtYnV0dG9uLS1mc2VudGVyXCIsICFpc0Z1bGxzY3JlZW4pXG5cdFx0XHRcdFx0LnRvZ2dsZUNsYXNzKFwiZmFuY3lib3gtYnV0dG9uLS1mc2V4aXRcIiwgaXNGdWxsc2NyZWVuKTtcblx0XHRcdH1cblx0XHR9KTtcblx0fVxuXG5cdCQoZG9jdW1lbnQpLm9uKHtcblx0XHRcIm9uSW5pdC5mYlwiOiBmdW5jdGlvbihlLCBpbnN0YW5jZSkge1xuXHRcdFx0dmFyICRjb250YWluZXI7XG5cblx0XHRcdGlmICghZm4pIHtcblx0XHRcdFx0aW5zdGFuY2UuJHJlZnMudG9vbGJhci5maW5kKFwiW2RhdGEtZmFuY3lib3gtZnVsbHNjcmVlbl1cIikucmVtb3ZlKCk7XG5cblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0fVxuXG5cdFx0XHRpZiAoaW5zdGFuY2UgJiYgaW5zdGFuY2UuZ3JvdXBbaW5zdGFuY2UuY3VyckluZGV4XS5vcHRzLmZ1bGxTY3JlZW4pIHtcblx0XHRcdFx0JGNvbnRhaW5lciA9IGluc3RhbmNlLiRyZWZzLmNvbnRhaW5lcjtcblxuXHRcdFx0XHQkY29udGFpbmVyLm9uKFwiY2xpY2suZmItZnVsbHNjcmVlblwiLCBcIltkYXRhLWZhbmN5Ym94LWZ1bGxzY3JlZW5dXCIsIGZ1bmN0aW9uKGUpIHtcblx0XHRcdFx0XHRlLnN0b3BQcm9wYWdhdGlvbigpO1xuXHRcdFx0XHRcdGUucHJldmVudERlZmF1bHQoKTtcblxuXHRcdFx0XHRcdEZ1bGxTY3JlZW4udG9nZ2xlKCk7XG5cdFx0XHRcdH0pO1xuXG5cdFx0XHRcdGlmIChpbnN0YW5jZS5vcHRzLmZ1bGxTY3JlZW4gJiYgaW5zdGFuY2Uub3B0cy5mdWxsU2NyZWVuLmF1dG9TdGFydCA9PT0gdHJ1ZSkge1xuXHRcdFx0XHRcdEZ1bGxTY3JlZW4ucmVxdWVzdCgpO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0Ly8gRXhwb3NlIEFQSVxuXHRcdFx0XHRpbnN0YW5jZS5GdWxsU2NyZWVuID0gRnVsbFNjcmVlbjtcblx0XHRcdH0gZWxzZSBpZiAoaW5zdGFuY2UpIHtcblx0XHRcdFx0aW5zdGFuY2UuJHJlZnMudG9vbGJhci5maW5kKFwiW2RhdGEtZmFuY3lib3gtZnVsbHNjcmVlbl1cIikuaGlkZSgpO1xuXHRcdFx0fVxuXHRcdH0sXG5cblx0XHRcImFmdGVyS2V5ZG93bi5mYlwiOiBmdW5jdGlvbihlLCBpbnN0YW5jZSwgY3VycmVudCwga2V5cHJlc3MsIGtleWNvZGUpIHtcblx0XHRcdC8vIFwiRlwiXG5cdFx0XHRpZiAoaW5zdGFuY2UgJiYgaW5zdGFuY2UuRnVsbFNjcmVlbiAmJiBrZXljb2RlID09PSA3MCkge1xuXHRcdFx0XHRrZXlwcmVzcy5wcmV2ZW50RGVmYXVsdCgpO1xuXG5cdFx0XHRcdGluc3RhbmNlLkZ1bGxTY3JlZW4udG9nZ2xlKCk7XG5cdFx0XHR9XG5cdFx0fSxcblxuXHRcdFwiYmVmb3JlQ2xvc2UuZmJcIjogZnVuY3Rpb24oZSwgaW5zdGFuY2UpIHtcblx0XHRcdGlmIChpbnN0YW5jZSAmJiBpbnN0YW5jZS5GdWxsU2NyZWVuICYmIGluc3RhbmNlLiRyZWZzLmNvbnRhaW5lci5oYXNDbGFzcyhcImZhbmN5Ym94LWlzLWZ1bGxzY3JlZW5cIikpIHtcblx0XHRcdFx0RnVsbFNjcmVlbi5leGl0KCk7XG5cdFx0XHR9XG5cdFx0fVxuXHR9KTtcbn0pKGRvY3VtZW50LCBqUXVlcnkpO1xuXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy9cbi8vIFRodW1ic1xuLy8gRGlzcGxheXMgdGh1bWJuYWlscyBpbiBhIGdyaWRcbi8vXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuKGZ1bmN0aW9uKGRvY3VtZW50LCAkKSB7XG5cdFwidXNlIHN0cmljdFwiO1xuXG5cdHZhciBDTEFTUyA9IFwiZmFuY3lib3gtdGh1bWJzXCIsXG5cdFx0Q0xBU1NfQUNUSVZFID0gQ0xBU1MgKyBcIi1hY3RpdmVcIjtcblxuXHQvLyBNYWtlIHN1cmUgdGhlcmUgYXJlIGRlZmF1bHQgdmFsdWVzXG5cdCQuZmFuY3lib3guZGVmYXVsdHMgPSAkLmV4dGVuZChcblx0XHR0cnVlLFxuXHRcdHtcblx0XHRcdGJ0blRwbDoge1xuXHRcdFx0XHR0aHVtYnM6XG5cdFx0XHRcdFx0JzxidXR0b24gZGF0YS1mYW5jeWJveC10aHVtYnMgY2xhc3M9XCJmYW5jeWJveC1idXR0b24gZmFuY3lib3gtYnV0dG9uLS10aHVtYnNcIiB0aXRsZT1cInt7VEhVTUJTfX1cIj4nICtcblx0XHRcdFx0XHQnPHN2ZyB4bWxucz1cImh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnXCIgdmlld0JveD1cIjAgMCAyNCAyNFwiPjxwYXRoIGQ9XCJNMTQuNTkgMTQuNTloMy43NnYzLjc2aC0zLjc2di0zLjc2em0tNC40NyAwaDMuNzZ2My43NmgtMy43NnYtMy43NnptLTQuNDcgMGgzLjc2djMuNzZINS42NXYtMy43NnptOC45NC00LjQ3aDMuNzZ2My43NmgtMy43NnYtMy43NnptLTQuNDcgMGgzLjc2djMuNzZoLTMuNzZ2LTMuNzZ6bS00LjQ3IDBoMy43NnYzLjc2SDUuNjV2LTMuNzZ6bTguOTQtNC40N2gzLjc2djMuNzZoLTMuNzZWNS42NXptLTQuNDcgMGgzLjc2djMuNzZoLTMuNzZWNS42NXptLTQuNDcgMGgzLjc2djMuNzZINS42NVY1LjY1elwiLz48L3N2Zz4nICtcblx0XHRcdFx0XHRcIjwvYnV0dG9uPlwiXG5cdFx0XHR9LFxuXHRcdFx0dGh1bWJzOiB7XG5cdFx0XHRcdGF1dG9TdGFydDogZmFsc2UsIC8vIERpc3BsYXkgdGh1bWJuYWlscyBvbiBvcGVuaW5nXG5cdFx0XHRcdGhpZGVPbkNsb3NlOiB0cnVlLCAvLyBIaWRlIHRodW1ibmFpbCBncmlkIHdoZW4gY2xvc2luZyBhbmltYXRpb24gc3RhcnRzXG5cdFx0XHRcdHBhcmVudEVsOiBcIi5mYW5jeWJveC1jb250YWluZXJcIiwgLy8gQ29udGFpbmVyIGlzIGluamVjdGVkIGludG8gdGhpcyBlbGVtZW50XG5cdFx0XHRcdGF4aXM6IFwieVwiIC8vIFZlcnRpY2FsICh5KSBvciBob3Jpem9udGFsICh4KSBzY3JvbGxpbmdcblx0XHRcdH1cblx0XHR9LFxuXHRcdCQuZmFuY3lib3guZGVmYXVsdHNcblx0KTtcblxuXHR2YXIgRmFuY3lUaHVtYnMgPSBmdW5jdGlvbihpbnN0YW5jZSkge1xuXHRcdHRoaXMuaW5pdChpbnN0YW5jZSk7XG5cdH07XG5cblx0JC5leHRlbmQoRmFuY3lUaHVtYnMucHJvdG90eXBlLCB7XG5cdFx0JGJ1dHRvbjogbnVsbCxcblx0XHQkZ3JpZDogbnVsbCxcblx0XHQkbGlzdDogbnVsbCxcblx0XHRpc1Zpc2libGU6IGZhbHNlLFxuXHRcdGlzQWN0aXZlOiBmYWxzZSxcblxuXHRcdGluaXQ6IGZ1bmN0aW9uKGluc3RhbmNlKSB7XG5cdFx0XHR2YXIgc2VsZiA9IHRoaXMsXG5cdFx0XHRcdGdyb3VwID0gaW5zdGFuY2UuZ3JvdXAsXG5cdFx0XHRcdGVuYWJsZWQgPSAwO1xuXG5cdFx0XHRzZWxmLmluc3RhbmNlID0gaW5zdGFuY2U7XG5cdFx0XHRzZWxmLm9wdHMgPSBncm91cFtpbnN0YW5jZS5jdXJySW5kZXhdLm9wdHMudGh1bWJzO1xuXG5cdFx0XHRpbnN0YW5jZS5UaHVtYnMgPSBzZWxmO1xuXG5cdFx0XHRzZWxmLiRidXR0b24gPSBpbnN0YW5jZS4kcmVmcy50b29sYmFyLmZpbmQoXCJbZGF0YS1mYW5jeWJveC10aHVtYnNdXCIpO1xuXG5cdFx0XHQvLyBFbmFibGUgdGh1bWJzIGlmIGF0IGxlYXN0IHR3byBncm91cCBpdGVtcyBoYXZlIHRodW1ibmFpbHNcblx0XHRcdGZvciAodmFyIGkgPSAwLCBsZW4gPSBncm91cC5sZW5ndGg7IGkgPCBsZW47IGkrKykge1xuXHRcdFx0XHRpZiAoZ3JvdXBbaV0udGh1bWIpIHtcblx0XHRcdFx0XHRlbmFibGVkKys7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRpZiAoZW5hYmxlZCA+IDEpIHtcblx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0fVxuXHRcdFx0fVxuXG5cdFx0XHRpZiAoZW5hYmxlZCA+IDEgJiYgISFzZWxmLm9wdHMpIHtcblx0XHRcdFx0c2VsZi4kYnV0dG9uLnJlbW92ZUF0dHIoXCJzdHlsZVwiKS5vbihcImNsaWNrXCIsIGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdHNlbGYudG9nZ2xlKCk7XG5cdFx0XHRcdH0pO1xuXG5cdFx0XHRcdHNlbGYuaXNBY3RpdmUgPSB0cnVlO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0c2VsZi4kYnV0dG9uLmhpZGUoKTtcblx0XHRcdH1cblx0XHR9LFxuXG5cdFx0Y3JlYXRlOiBmdW5jdGlvbigpIHtcblx0XHRcdHZhciBzZWxmID0gdGhpcyxcblx0XHRcdFx0aW5zdGFuY2UgPSBzZWxmLmluc3RhbmNlLFxuXHRcdFx0XHRwYXJlbnRFbCA9IHNlbGYub3B0cy5wYXJlbnRFbCxcblx0XHRcdFx0bGlzdCA9IFtdLFxuXHRcdFx0XHRzcmM7XG5cblx0XHRcdGlmICghc2VsZi4kZ3JpZCkge1xuXHRcdFx0XHQvLyBDcmVhdGUgbWFpbiBlbGVtZW50XG5cdFx0XHRcdHNlbGYuJGdyaWQgPSAkKCc8ZGl2IGNsYXNzPVwiJyArIENMQVNTICsgXCIgXCIgKyBDTEFTUyArIFwiLVwiICsgc2VsZi5vcHRzLmF4aXMgKyAnXCI+PC9kaXY+JykuYXBwZW5kVG8oXG5cdFx0XHRcdFx0aW5zdGFuY2UuJHJlZnMuY29udGFpbmVyXG5cdFx0XHRcdFx0XHQuZmluZChwYXJlbnRFbClcblx0XHRcdFx0XHRcdC5hZGRCYWNrKClcblx0XHRcdFx0XHRcdC5maWx0ZXIocGFyZW50RWwpXG5cdFx0XHRcdCk7XG5cblx0XHRcdFx0Ly8gQWRkIFwiY2xpY2tcIiBldmVudCB0aGF0IHBlcmZvcm1zIGdhbGxlcnkgbmF2aWdhdGlvblxuXHRcdFx0XHRzZWxmLiRncmlkLm9uKFwiY2xpY2tcIiwgXCJhXCIsIGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdGluc3RhbmNlLmp1bXBUbygkKHRoaXMpLmF0dHIoXCJkYXRhLWluZGV4XCIpKTtcblx0XHRcdFx0fSk7XG5cdFx0XHR9XG5cblx0XHRcdC8vIEJ1aWxkIHRoZSBsaXN0XG5cdFx0XHRpZiAoIXNlbGYuJGxpc3QpIHtcblx0XHRcdFx0c2VsZi4kbGlzdCA9ICQoJzxkaXYgY2xhc3M9XCInICsgQ0xBU1MgKyAnX19saXN0XCI+JykuYXBwZW5kVG8oc2VsZi4kZ3JpZCk7XG5cdFx0XHR9XG5cblx0XHRcdCQuZWFjaChpbnN0YW5jZS5ncm91cCwgZnVuY3Rpb24oaSwgaXRlbSkge1xuXHRcdFx0XHRzcmMgPSBpdGVtLnRodW1iO1xuXG5cdFx0XHRcdGlmICghc3JjICYmIGl0ZW0udHlwZSA9PT0gXCJpbWFnZVwiKSB7XG5cdFx0XHRcdFx0c3JjID0gaXRlbS5zcmM7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRsaXN0LnB1c2goXG5cdFx0XHRcdFx0JzxhIGhyZWY9XCJqYXZhc2NyaXB0OjtcIiB0YWJpbmRleD1cIjBcIiBkYXRhLWluZGV4PVwiJyArXG5cdFx0XHRcdFx0aSArXG5cdFx0XHRcdFx0J1wiJyArXG5cdFx0XHRcdFx0KHNyYyAmJiBzcmMubGVuZ3RoID8gJyBzdHlsZT1cImJhY2tncm91bmQtaW1hZ2U6dXJsKCcgKyBzcmMgKyAnKVwiJyA6ICdjbGFzcz1cImZhbmN5Ym94LXRodW1icy1taXNzaW5nXCInKSArXG5cdFx0XHRcdFx0XCI+PC9hPlwiXG5cdFx0XHRcdCk7XG5cdFx0XHR9KTtcblxuXHRcdFx0c2VsZi4kbGlzdFswXS5pbm5lckhUTUwgPSBsaXN0LmpvaW4oXCJcIik7XG5cblx0XHRcdGlmIChzZWxmLm9wdHMuYXhpcyA9PT0gXCJ4XCIpIHtcblx0XHRcdFx0Ly8gU2V0IGZpeGVkIHdpZHRoIGZvciBsaXN0IGVsZW1lbnQgdG8gZW5hYmxlIGhvcml6b250YWwgc2Nyb2xsaW5nXG5cdFx0XHRcdHNlbGYuJGxpc3Qud2lkdGgoXG5cdFx0XHRcdFx0cGFyc2VJbnQoc2VsZi4kZ3JpZC5jc3MoXCJwYWRkaW5nLXJpZ2h0XCIpLCAxMCkgK1xuXHRcdFx0XHRcdGluc3RhbmNlLmdyb3VwLmxlbmd0aCAqXG5cdFx0XHRcdFx0c2VsZi4kbGlzdFxuXHRcdFx0XHRcdFx0LmNoaWxkcmVuKClcblx0XHRcdFx0XHRcdC5lcSgwKVxuXHRcdFx0XHRcdFx0Lm91dGVyV2lkdGgodHJ1ZSlcblx0XHRcdFx0KTtcblx0XHRcdH1cblx0XHR9LFxuXG5cdFx0Zm9jdXM6IGZ1bmN0aW9uKGR1cmF0aW9uKSB7XG5cdFx0XHR2YXIgc2VsZiA9IHRoaXMsXG5cdFx0XHRcdCRsaXN0ID0gc2VsZi4kbGlzdCxcblx0XHRcdFx0JGdyaWQgPSBzZWxmLiRncmlkLFxuXHRcdFx0XHR0aHVtYixcblx0XHRcdFx0dGh1bWJQb3M7XG5cblx0XHRcdGlmICghc2VsZi5pbnN0YW5jZS5jdXJyZW50KSB7XG5cdFx0XHRcdHJldHVybjtcblx0XHRcdH1cblxuXHRcdFx0dGh1bWIgPSAkbGlzdFxuXHRcdFx0XHQuY2hpbGRyZW4oKVxuXHRcdFx0XHQucmVtb3ZlQ2xhc3MoQ0xBU1NfQUNUSVZFKVxuXHRcdFx0XHQuZmlsdGVyKCdbZGF0YS1pbmRleD1cIicgKyBzZWxmLmluc3RhbmNlLmN1cnJlbnQuaW5kZXggKyAnXCJdJylcblx0XHRcdFx0LmFkZENsYXNzKENMQVNTX0FDVElWRSk7XG5cblx0XHRcdHRodW1iUG9zID0gdGh1bWIucG9zaXRpb24oKTtcblxuXHRcdFx0Ly8gQ2hlY2sgaWYgbmVlZCB0byBzY3JvbGwgdG8gbWFrZSBjdXJyZW50IHRodW1iIHZpc2libGVcblx0XHRcdGlmIChzZWxmLm9wdHMuYXhpcyA9PT0gXCJ5XCIgJiYgKHRodW1iUG9zLnRvcCA8IDAgfHwgdGh1bWJQb3MudG9wID4gJGxpc3QuaGVpZ2h0KCkgLSB0aHVtYi5vdXRlckhlaWdodCgpKSkge1xuXHRcdFx0XHQkbGlzdC5zdG9wKCkuYW5pbWF0ZShcblx0XHRcdFx0XHR7XG5cdFx0XHRcdFx0XHRzY3JvbGxUb3A6ICRsaXN0LnNjcm9sbFRvcCgpICsgdGh1bWJQb3MudG9wXG5cdFx0XHRcdFx0fSxcblx0XHRcdFx0XHRkdXJhdGlvblxuXHRcdFx0XHQpO1xuXHRcdFx0fSBlbHNlIGlmIChcblx0XHRcdFx0c2VsZi5vcHRzLmF4aXMgPT09IFwieFwiICYmXG5cdFx0XHRcdCh0aHVtYlBvcy5sZWZ0IDwgJGdyaWQuc2Nyb2xsTGVmdCgpIHx8IHRodW1iUG9zLmxlZnQgPiAkZ3JpZC5zY3JvbGxMZWZ0KCkgKyAoJGdyaWQud2lkdGgoKSAtIHRodW1iLm91dGVyV2lkdGgoKSkpXG5cdFx0XHQpIHtcblx0XHRcdFx0JGxpc3Rcblx0XHRcdFx0XHQucGFyZW50KClcblx0XHRcdFx0XHQuc3RvcCgpXG5cdFx0XHRcdFx0LmFuaW1hdGUoXG5cdFx0XHRcdFx0XHR7XG5cdFx0XHRcdFx0XHRcdHNjcm9sbExlZnQ6IHRodW1iUG9zLmxlZnRcblx0XHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0XHRkdXJhdGlvblxuXHRcdFx0XHRcdCk7XG5cdFx0XHR9XG5cdFx0fSxcblxuXHRcdHVwZGF0ZTogZnVuY3Rpb24oKSB7XG5cdFx0XHR2YXIgdGhhdCA9IHRoaXM7XG5cdFx0XHR0aGF0Lmluc3RhbmNlLiRyZWZzLmNvbnRhaW5lci50b2dnbGVDbGFzcyhcImZhbmN5Ym94LXNob3ctdGh1bWJzXCIsIHRoaXMuaXNWaXNpYmxlKTtcblxuXHRcdFx0aWYgKHRoYXQuaXNWaXNpYmxlKSB7XG5cdFx0XHRcdGlmICghdGhhdC4kZ3JpZCkge1xuXHRcdFx0XHRcdHRoYXQuY3JlYXRlKCk7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHR0aGF0Lmluc3RhbmNlLnRyaWdnZXIoXCJvblRodW1ic1Nob3dcIik7XG5cblx0XHRcdFx0dGhhdC5mb2N1cygwKTtcblx0XHRcdH0gZWxzZSBpZiAodGhhdC4kZ3JpZCkge1xuXHRcdFx0XHR0aGF0Lmluc3RhbmNlLnRyaWdnZXIoXCJvblRodW1ic0hpZGVcIik7XG5cdFx0XHR9XG5cblx0XHRcdC8vIFVwZGF0ZSBjb250ZW50IHBvc2l0aW9uXG5cdFx0XHR0aGF0Lmluc3RhbmNlLnVwZGF0ZSgpO1xuXHRcdH0sXG5cblx0XHRoaWRlOiBmdW5jdGlvbigpIHtcblx0XHRcdHRoaXMuaXNWaXNpYmxlID0gZmFsc2U7XG5cdFx0XHR0aGlzLnVwZGF0ZSgpO1xuXHRcdH0sXG5cblx0XHRzaG93OiBmdW5jdGlvbigpIHtcblx0XHRcdHRoaXMuaXNWaXNpYmxlID0gdHJ1ZTtcblx0XHRcdHRoaXMudXBkYXRlKCk7XG5cdFx0fSxcblxuXHRcdHRvZ2dsZTogZnVuY3Rpb24oKSB7XG5cdFx0XHR0aGlzLmlzVmlzaWJsZSA9ICF0aGlzLmlzVmlzaWJsZTtcblx0XHRcdHRoaXMudXBkYXRlKCk7XG5cdFx0fVxuXHR9KTtcblxuXHQkKGRvY3VtZW50KS5vbih7XG5cdFx0XCJvbkluaXQuZmJcIjogZnVuY3Rpb24oZSwgaW5zdGFuY2UpIHtcblx0XHRcdHZhciBUaHVtYnM7XG5cblx0XHRcdGlmIChpbnN0YW5jZSAmJiAhaW5zdGFuY2UuVGh1bWJzKSB7XG5cdFx0XHRcdFRodW1icyA9IG5ldyBGYW5jeVRodW1icyhpbnN0YW5jZSk7XG5cblx0XHRcdFx0aWYgKFRodW1icy5pc0FjdGl2ZSAmJiBUaHVtYnMub3B0cy5hdXRvU3RhcnQgPT09IHRydWUpIHtcblx0XHRcdFx0XHRUaHVtYnMuc2hvdygpO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fSxcblxuXHRcdFwiYmVmb3JlU2hvdy5mYlwiOiBmdW5jdGlvbihlLCBpbnN0YW5jZSwgaXRlbSwgZmlyc3RSdW4pIHtcblx0XHRcdHZhciBUaHVtYnMgPSBpbnN0YW5jZSAmJiBpbnN0YW5jZS5UaHVtYnM7XG5cblx0XHRcdGlmIChUaHVtYnMgJiYgVGh1bWJzLmlzVmlzaWJsZSkge1xuXHRcdFx0XHRUaHVtYnMuZm9jdXMoZmlyc3RSdW4gPyAwIDogMjUwKTtcblx0XHRcdH1cblx0XHR9LFxuXG5cdFx0XCJhZnRlcktleWRvd24uZmJcIjogZnVuY3Rpb24oZSwgaW5zdGFuY2UsIGN1cnJlbnQsIGtleXByZXNzLCBrZXljb2RlKSB7XG5cdFx0XHR2YXIgVGh1bWJzID0gaW5zdGFuY2UgJiYgaW5zdGFuY2UuVGh1bWJzO1xuXG5cdFx0XHQvLyBcIkdcIlxuXHRcdFx0aWYgKFRodW1icyAmJiBUaHVtYnMuaXNBY3RpdmUgJiYga2V5Y29kZSA9PT0gNzEpIHtcblx0XHRcdFx0a2V5cHJlc3MucHJldmVudERlZmF1bHQoKTtcblxuXHRcdFx0XHRUaHVtYnMudG9nZ2xlKCk7XG5cdFx0XHR9XG5cdFx0fSxcblxuXHRcdFwiYmVmb3JlQ2xvc2UuZmJcIjogZnVuY3Rpb24oZSwgaW5zdGFuY2UpIHtcblx0XHRcdHZhciBUaHVtYnMgPSBpbnN0YW5jZSAmJiBpbnN0YW5jZS5UaHVtYnM7XG5cblx0XHRcdGlmIChUaHVtYnMgJiYgVGh1bWJzLmlzVmlzaWJsZSAmJiBUaHVtYnMub3B0cy5oaWRlT25DbG9zZSAhPT0gZmFsc2UpIHtcblx0XHRcdFx0VGh1bWJzLiRncmlkLmhpZGUoKTtcblx0XHRcdH1cblx0XHR9XG5cdH0pO1xufSkoZG9jdW1lbnQsIGpRdWVyeSk7XG5cbi8vLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vXG4vLyBTaGFyZVxuLy8gRGlzcGxheXMgc2ltcGxlIGZvcm0gZm9yIHNoYXJpbmcgY3VycmVudCB1cmxcbi8vXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuKGZ1bmN0aW9uKGRvY3VtZW50LCAkKSB7XG5cdFwidXNlIHN0cmljdFwiO1xuXG5cdCQuZXh0ZW5kKHRydWUsICQuZmFuY3lib3guZGVmYXVsdHMsIHtcblx0XHRidG5UcGw6IHtcblx0XHRcdHNoYXJlOlxuXHRcdFx0XHQnPGJ1dHRvbiBkYXRhLWZhbmN5Ym94LXNoYXJlIGNsYXNzPVwiZmFuY3lib3gtYnV0dG9uIGZhbmN5Ym94LWJ1dHRvbi0tc2hhcmVcIiB0aXRsZT1cInt7U0hBUkV9fVwiPicgK1xuXHRcdFx0XHQnPHN2ZyB4bWxucz1cImh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnXCIgdmlld0JveD1cIjAgMCAyNCAyNFwiPjxwYXRoIGQ9XCJNMi41NSAxOWMxLjQtOC40IDkuMS05LjggMTEuOS05LjhWNWw3IDctNyA2LjN2LTMuNWMtMi44IDAtMTAuNSAyLjEtMTEuOSA0LjJ6XCIvPjwvc3ZnPicgK1xuXHRcdFx0XHRcIjwvYnV0dG9uPlwiXG5cdFx0fSxcblx0XHRzaGFyZToge1xuXHRcdFx0dXJsOiBmdW5jdGlvbihpbnN0YW5jZSwgaXRlbSkge1xuXHRcdFx0XHRyZXR1cm4gKFxuXHRcdFx0XHRcdCghaW5zdGFuY2UuY3VycmVudEhhc2ggJiYgIShpdGVtLnR5cGUgPT09IFwiaW5saW5lXCIgfHwgaXRlbS50eXBlID09PSBcImh0bWxcIikgPyBpdGVtLm9yaWdTcmMgfHwgaXRlbS5zcmMgOiBmYWxzZSkgfHwgd2luZG93LmxvY2F0aW9uXG5cdFx0XHRcdCk7XG5cdFx0XHR9LFxuXHRcdFx0dHBsOlxuXHRcdFx0XHQnPGRpdiBjbGFzcz1cImZhbmN5Ym94LXNoYXJlXCI+JyArXG5cdFx0XHRcdFwiPGgxPnt7U0hBUkV9fTwvaDE+XCIgK1xuXHRcdFx0XHRcIjxwPlwiICtcblx0XHRcdFx0JzxhIGNsYXNzPVwiZmFuY3lib3gtc2hhcmVfX2J1dHRvbiBmYW5jeWJveC1zaGFyZV9fYnV0dG9uLS1mYlwiIGhyZWY9XCJodHRwczovL3d3dy5mYWNlYm9vay5jb20vc2hhcmVyL3NoYXJlci5waHA/dT17e3VybH19XCI+JyArXG5cdFx0XHRcdCc8c3ZnIHZpZXdCb3g9XCIwIDAgNTEyIDUxMlwiIHhtbG5zPVwiaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmdcIj48cGF0aCBkPVwibTI4NyA0NTZ2LTI5OWMwLTIxIDYtMzUgMzUtMzVoMzh2LTYzYy03LTEtMjktMy01NS0zLTU0IDAtOTEgMzMtOTEgOTR2MzA2bTE0My0yNTRoLTIwNXY3MmgxOTZcIiAvPjwvc3ZnPicgK1xuXHRcdFx0XHRcIjxzcGFuPkZhY2Vib29rPC9zcGFuPlwiICtcblx0XHRcdFx0XCI8L2E+XCIgK1xuXHRcdFx0XHQnPGEgY2xhc3M9XCJmYW5jeWJveC1zaGFyZV9fYnV0dG9uIGZhbmN5Ym94LXNoYXJlX19idXR0b24tLXR3XCIgaHJlZj1cImh0dHBzOi8vdHdpdHRlci5jb20vaW50ZW50L3R3ZWV0P3VybD17e3VybH19JnRleHQ9e3tkZXNjcn19XCI+JyArXG5cdFx0XHRcdCc8c3ZnIHZpZXdCb3g9XCIwIDAgNTEyIDUxMlwiIHhtbG5zPVwiaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmdcIj48cGF0aCBkPVwibTQ1NiAxMzNjLTE0IDctMzEgMTEtNDcgMTMgMTctMTAgMzAtMjcgMzctNDYtMTUgMTAtMzQgMTYtNTIgMjAtNjEtNjItMTU3LTctMTQxIDc1LTY4LTMtMTI5LTM1LTE2OS04NS0yMiAzNy0xMSA4NiAyNiAxMDktMTMgMC0yNi00LTM3LTkgMCAzOSAyOCA3MiA2NSA4MC0xMiAzLTI1IDQtMzcgMiAxMCAzMyA0MSA1NyA3NyA1Ny00MiAzMC03NyAzOC0xMjIgMzQgMTcwIDExMSAzNzgtMzIgMzU5LTIwOCAxNi0xMSAzMC0yNSA0MS00MnpcIiAvPjwvc3ZnPicgK1xuXHRcdFx0XHRcIjxzcGFuPlR3aXR0ZXI8L3NwYW4+XCIgK1xuXHRcdFx0XHRcIjwvYT5cIiArXG5cdFx0XHRcdCc8YSBjbGFzcz1cImZhbmN5Ym94LXNoYXJlX19idXR0b24gZmFuY3lib3gtc2hhcmVfX2J1dHRvbi0tcHRcIiBocmVmPVwiaHR0cHM6Ly93d3cucGludGVyZXN0LmNvbS9waW4vY3JlYXRlL2J1dHRvbi8/dXJsPXt7dXJsfX0mZGVzY3JpcHRpb249e3tkZXNjcn19Jm1lZGlhPXt7bWVkaWF9fVwiPicgK1xuXHRcdFx0XHQnPHN2ZyB2aWV3Qm94PVwiMCAwIDUxMiA1MTJcIiB4bWxucz1cImh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnXCI+PHBhdGggZD1cIm0yNjUgNTZjLTEwOSAwLTE2NCA3OC0xNjQgMTQ0IDAgMzkgMTUgNzQgNDcgODcgNSAyIDEwIDAgMTItNWw0LTE5YzItNiAxLTgtMy0xMy05LTExLTE1LTI1LTE1LTQ1IDAtNTggNDMtMTEwIDExMy0xMTAgNjIgMCA5NiAzOCA5NiA4OCAwIDY3LTMwIDEyMi03MyAxMjItMjQgMC00Mi0xOS0zNi00NCA2LTI5IDIwLTYwIDIwLTgxIDAtMTktMTAtMzUtMzEtMzUtMjUgMC00NCAyNi00NCA2MCAwIDIxIDcgMzYgNyAzNmwtMzAgMTI1Yy04IDM3LTEgODMgMCA4NyAwIDMgNCA0IDUgMiAyLTMgMzItMzkgNDItNzVsMTYtNjRjOCAxNiAzMSAyOSA1NiAyOSA3NCAwIDEyNC02NyAxMjQtMTU3IDAtNjktNTgtMTMyLTE0Ni0xMzJ6XCIgZmlsbD1cIiNmZmZcIi8+PC9zdmc+JyArXG5cdFx0XHRcdFwiPHNwYW4+UGludGVyZXN0PC9zcGFuPlwiICtcblx0XHRcdFx0XCI8L2E+XCIgK1xuXHRcdFx0XHRcIjwvcD5cIiArXG5cdFx0XHRcdCc8cD48aW5wdXQgY2xhc3M9XCJmYW5jeWJveC1zaGFyZV9faW5wdXRcIiB0eXBlPVwidGV4dFwiIHZhbHVlPVwie3t1cmxfcmF3fX1cIiBvbmNsaWNrPVwic2VsZWN0KClcIiAvPjwvcD4nICtcblx0XHRcdFx0XCI8L2Rpdj5cIlxuXHRcdH1cblx0fSk7XG5cblx0ZnVuY3Rpb24gZXNjYXBlSHRtbChzdHJpbmcpIHtcblx0XHR2YXIgZW50aXR5TWFwID0ge1xuXHRcdFx0XCImXCI6IFwiJmFtcDtcIixcblx0XHRcdFwiPFwiOiBcIiZsdDtcIixcblx0XHRcdFwiPlwiOiBcIiZndDtcIixcblx0XHRcdCdcIic6IFwiJnF1b3Q7XCIsXG5cdFx0XHRcIidcIjogXCImIzM5O1wiLFxuXHRcdFx0XCIvXCI6IFwiJiN4MkY7XCIsXG5cdFx0XHRcImBcIjogXCImI3g2MDtcIixcblx0XHRcdFwiPVwiOiBcIiYjeDNEO1wiXG5cdFx0fTtcblxuXHRcdHJldHVybiBTdHJpbmcoc3RyaW5nKS5yZXBsYWNlKC9bJjw+XCInYD1cXC9dL2csIGZ1bmN0aW9uKHMpIHtcblx0XHRcdHJldHVybiBlbnRpdHlNYXBbc107XG5cdFx0fSk7XG5cdH1cblxuXHQkKGRvY3VtZW50KS5vbihcImNsaWNrXCIsIFwiW2RhdGEtZmFuY3lib3gtc2hhcmVdXCIsIGZ1bmN0aW9uKCkge1xuXHRcdHZhciBpbnN0YW5jZSA9ICQuZmFuY3lib3guZ2V0SW5zdGFuY2UoKSxcblx0XHRcdGN1cnJlbnQgPSBpbnN0YW5jZS5jdXJyZW50IHx8IG51bGwsXG5cdFx0XHR1cmwsXG5cdFx0XHR0cGw7XG5cblx0XHRpZiAoIWN1cnJlbnQpIHtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cblx0XHRpZiAoJC50eXBlKGN1cnJlbnQub3B0cy5zaGFyZS51cmwpID09PSBcImZ1bmN0aW9uXCIpIHtcblx0XHRcdHVybCA9IGN1cnJlbnQub3B0cy5zaGFyZS51cmwuYXBwbHkoY3VycmVudCwgW2luc3RhbmNlLCBjdXJyZW50XSk7XG5cdFx0fVxuXG5cdFx0dHBsID0gY3VycmVudC5vcHRzLnNoYXJlLnRwbFxuXHRcdFx0LnJlcGxhY2UoL1xce1xce21lZGlhXFx9XFx9L2csIGN1cnJlbnQudHlwZSA9PT0gXCJpbWFnZVwiID8gZW5jb2RlVVJJQ29tcG9uZW50KGN1cnJlbnQuc3JjKSA6IFwiXCIpXG5cdFx0XHQucmVwbGFjZSgvXFx7XFx7dXJsXFx9XFx9L2csIGVuY29kZVVSSUNvbXBvbmVudCh1cmwpKVxuXHRcdFx0LnJlcGxhY2UoL1xce1xce3VybF9yYXdcXH1cXH0vZywgZXNjYXBlSHRtbCh1cmwpKVxuXHRcdFx0LnJlcGxhY2UoL1xce1xce2Rlc2NyXFx9XFx9L2csIGluc3RhbmNlLiRjYXB0aW9uID8gZW5jb2RlVVJJQ29tcG9uZW50KGluc3RhbmNlLiRjYXB0aW9uLnRleHQoKSkgOiBcIlwiKTtcblxuXHRcdCQuZmFuY3lib3gub3Blbih7XG5cdFx0XHRzcmM6IGluc3RhbmNlLnRyYW5zbGF0ZShpbnN0YW5jZSwgdHBsKSxcblx0XHRcdHR5cGU6IFwiaHRtbFwiLFxuXHRcdFx0b3B0czoge1xuXHRcdFx0XHR0b3VjaDogZmFsc2UsXG5cdFx0XHRcdGFuaW1hdGlvbkVmZmVjdDogZmFsc2UsXG5cdFx0XHRcdGFmdGVyTG9hZDogZnVuY3Rpb24oc2hhcmVJbnN0YW5jZSwgc2hhcmVDdXJyZW50KSB7XG5cdFx0XHRcdFx0Ly8gQ2xvc2Ugc2VsZiBpZiBwYXJlbnQgaW5zdGFuY2UgaXMgY2xvc2luZ1xuXHRcdFx0XHRcdGluc3RhbmNlLiRyZWZzLmNvbnRhaW5lci5vbmUoXCJiZWZvcmVDbG9zZS5mYlwiLCBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRcdHNoYXJlSW5zdGFuY2UuY2xvc2UobnVsbCwgMCk7XG5cdFx0XHRcdFx0fSk7XG5cblx0XHRcdFx0XHQvLyBPcGVuaW5nIGxpbmtzIGluIGEgcG9wdXAgd2luZG93XG5cdFx0XHRcdFx0c2hhcmVDdXJyZW50LiRjb250ZW50LmZpbmQoXCIuZmFuY3lib3gtc2hhcmVfX2J1dHRvblwiKS5jbGljayhmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRcdHdpbmRvdy5vcGVuKHRoaXMuaHJlZiwgXCJTaGFyZVwiLCBcIndpZHRoPTU1MCwgaGVpZ2h0PTQ1MFwiKTtcblx0XHRcdFx0XHRcdHJldHVybiBmYWxzZTtcblx0XHRcdFx0XHR9KTtcblx0XHRcdFx0fSxcblx0XHRcdFx0bW9iaWxlOiB7XG5cdFx0XHRcdFx0YXV0b0ZvY3VzOiBmYWxzZVxuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fSk7XG5cdH0pO1xufSkoZG9jdW1lbnQsIGpRdWVyeSk7XG5cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vL1xuLy8gSGFzaFxuLy8gRW5hYmxlcyBsaW5raW5nIHRvIGVhY2ggbW9kYWxcbi8vXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuKGZ1bmN0aW9uKHdpbmRvdywgZG9jdW1lbnQsICQpIHtcblx0XCJ1c2Ugc3RyaWN0XCI7XG5cblx0Ly8gU2ltcGxlICQuZXNjYXBlU2VsZWN0b3IgcG9seWZpbGwgKGZvciBqUXVlcnkgcHJpb3IgdjMpXG5cdGlmICghJC5lc2NhcGVTZWxlY3Rvcikge1xuXHRcdCQuZXNjYXBlU2VsZWN0b3IgPSBmdW5jdGlvbihzZWwpIHtcblx0XHRcdHZhciByY3NzZXNjYXBlID0gLyhbXFwwLVxceDFmXFx4N2ZdfF4tP1xcZCl8Xi0kfFteXFx4ODAtXFx1RkZGRlxcdy1dL2c7XG5cdFx0XHR2YXIgZmNzc2VzY2FwZSA9IGZ1bmN0aW9uKGNoLCBhc0NvZGVQb2ludCkge1xuXHRcdFx0XHRpZiAoYXNDb2RlUG9pbnQpIHtcblx0XHRcdFx0XHQvLyBVKzAwMDAgTlVMTCBiZWNvbWVzIFUrRkZGRCBSRVBMQUNFTUVOVCBDSEFSQUNURVJcblx0XHRcdFx0XHRpZiAoY2ggPT09IFwiXFwwXCIpIHtcblx0XHRcdFx0XHRcdHJldHVybiBcIlxcdUZGRkRcIjtcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHQvLyBDb250cm9sIGNoYXJhY3RlcnMgYW5kIChkZXBlbmRlbnQgdXBvbiBwb3NpdGlvbikgbnVtYmVycyBnZXQgZXNjYXBlZCBhcyBjb2RlIHBvaW50c1xuXHRcdFx0XHRcdHJldHVybiBjaC5zbGljZSgwLCAtMSkgKyBcIlxcXFxcIiArIGNoLmNoYXJDb2RlQXQoY2gubGVuZ3RoIC0gMSkudG9TdHJpbmcoMTYpICsgXCIgXCI7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHQvLyBPdGhlciBwb3RlbnRpYWxseS1zcGVjaWFsIEFTQ0lJIGNoYXJhY3RlcnMgZ2V0IGJhY2tzbGFzaC1lc2NhcGVkXG5cdFx0XHRcdHJldHVybiBcIlxcXFxcIiArIGNoO1xuXHRcdFx0fTtcblxuXHRcdFx0cmV0dXJuIChzZWwgKyBcIlwiKS5yZXBsYWNlKHJjc3Nlc2NhcGUsIGZjc3Nlc2NhcGUpO1xuXHRcdH07XG5cdH1cblxuXHQvLyBHZXQgaW5mbyBhYm91dCBnYWxsZXJ5IG5hbWUgYW5kIGN1cnJlbnQgaW5kZXggZnJvbSB1cmxcblx0ZnVuY3Rpb24gcGFyc2VVcmwoKSB7XG5cdFx0dmFyIGhhc2ggPSB3aW5kb3cubG9jYXRpb24uaGFzaC5zdWJzdHIoMSksXG5cdFx0XHRyZXogPSBoYXNoLnNwbGl0KFwiLVwiKSxcblx0XHRcdGluZGV4ID0gcmV6Lmxlbmd0aCA+IDEgJiYgL15cXCs/XFxkKyQvLnRlc3QocmV6W3Jlei5sZW5ndGggLSAxXSkgPyBwYXJzZUludChyZXoucG9wKC0xKSwgMTApIHx8IDEgOiAxLFxuXHRcdFx0Z2FsbGVyeSA9IHJlei5qb2luKFwiLVwiKTtcblxuXHRcdHJldHVybiB7XG5cdFx0XHRoYXNoOiBoYXNoLFxuXHRcdFx0LyogSW5kZXggaXMgc3RhcnRpbmcgZnJvbSAxICovXG5cdFx0XHRpbmRleDogaW5kZXggPCAxID8gMSA6IGluZGV4LFxuXHRcdFx0Z2FsbGVyeTogZ2FsbGVyeVxuXHRcdH07XG5cdH1cblxuXHQvLyBUcmlnZ2VyIGNsaWNrIGV2bnQgb24gbGlua3MgdG8gb3BlbiBuZXcgZmFuY3lCb3ggaW5zdGFuY2Vcblx0ZnVuY3Rpb24gdHJpZ2dlckZyb21VcmwodXJsKSB7XG5cdFx0aWYgKHVybC5nYWxsZXJ5ICE9PSBcIlwiKSB7XG5cdFx0XHQvLyBJZiB3ZSBjYW4gZmluZCBlbGVtZW50IG1hdGNoaW5nICdkYXRhLWZhbmN5Ym94JyBhdHJpYnV0ZSxcblx0XHRcdC8vIHRoZW4gdHJpZ2dlcmluZyBjbGljayBldmVudCBzaG91bGQgc3RhcnQgZmFuY3lCb3hcblx0XHRcdCQoXCJbZGF0YS1mYW5jeWJveD0nXCIgKyAkLmVzY2FwZVNlbGVjdG9yKHVybC5nYWxsZXJ5KSArIFwiJ11cIilcblx0XHRcdFx0LmVxKHVybC5pbmRleCAtIDEpXG5cdFx0XHRcdC5mb2N1cygpXG5cdFx0XHRcdC50cmlnZ2VyKFwiY2xpY2suZmItc3RhcnRcIik7XG5cdFx0fVxuXHR9XG5cblx0Ly8gR2V0IGdhbGxlcnkgbmFtZSBmcm9tIGN1cnJlbnQgaW5zdGFuY2Vcblx0ZnVuY3Rpb24gZ2V0R2FsbGVyeUlEKGluc3RhbmNlKSB7XG5cdFx0dmFyIG9wdHMsIHJldDtcblxuXHRcdGlmICghaW5zdGFuY2UpIHtcblx0XHRcdHJldHVybiBmYWxzZTtcblx0XHR9XG5cblx0XHRvcHRzID0gaW5zdGFuY2UuY3VycmVudCA/IGluc3RhbmNlLmN1cnJlbnQub3B0cyA6IGluc3RhbmNlLm9wdHM7XG5cdFx0cmV0ID0gb3B0cy5oYXNoIHx8IChvcHRzLiRvcmlnID8gb3B0cy4kb3JpZy5kYXRhKFwiZmFuY3lib3hcIikgfHwgb3B0cy4kb3JpZy5kYXRhKFwiZmFuY3lib3gtdHJpZ2dlclwiKSA6IFwiXCIpO1xuXG5cdFx0cmV0dXJuIHJldCA9PT0gXCJcIiA/IGZhbHNlIDogcmV0O1xuXHR9XG5cblx0Ly8gU3RhcnQgd2hlbiBET00gYmVjb21lcyByZWFkeVxuXHQkKGZ1bmN0aW9uKCkge1xuXHRcdC8vIENoZWNrIGlmIHVzZXIgaGFzIGRpc2FibGVkIHRoaXMgbW9kdWxlXG5cdFx0aWYgKCQuZmFuY3lib3guZGVmYXVsdHMuaGFzaCA9PT0gZmFsc2UpIHtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cblx0XHQvLyBVcGRhdGUgaGFzaCB3aGVuIG9wZW5pbmcvY2xvc2luZyBmYW5jeUJveFxuXHRcdCQoZG9jdW1lbnQpLm9uKHtcblx0XHRcdFwib25Jbml0LmZiXCI6IGZ1bmN0aW9uKGUsIGluc3RhbmNlKSB7XG5cdFx0XHRcdHZhciB1cmwsIGdhbGxlcnk7XG5cblx0XHRcdFx0aWYgKGluc3RhbmNlLmdyb3VwW2luc3RhbmNlLmN1cnJJbmRleF0ub3B0cy5oYXNoID09PSBmYWxzZSkge1xuXHRcdFx0XHRcdHJldHVybjtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdHVybCA9IHBhcnNlVXJsKCk7XG5cdFx0XHRcdGdhbGxlcnkgPSBnZXRHYWxsZXJ5SUQoaW5zdGFuY2UpO1xuXG5cdFx0XHRcdC8vIE1ha2Ugc3VyZSBnYWxsZXJ5IHN0YXJ0IGluZGV4IG1hdGNoZXMgaW5kZXggZnJvbSBoYXNoXG5cdFx0XHRcdGlmIChnYWxsZXJ5ICYmIHVybC5nYWxsZXJ5ICYmIGdhbGxlcnkgPT0gdXJsLmdhbGxlcnkpIHtcblx0XHRcdFx0XHRpbnN0YW5jZS5jdXJySW5kZXggPSB1cmwuaW5kZXggLSAxO1xuXHRcdFx0XHR9XG5cdFx0XHR9LFxuXG5cdFx0XHRcImJlZm9yZVNob3cuZmJcIjogZnVuY3Rpb24oZSwgaW5zdGFuY2UsIGN1cnJlbnQsIGZpcnN0UnVuKSB7XG5cdFx0XHRcdHZhciBnYWxsZXJ5O1xuXG5cdFx0XHRcdGlmICghY3VycmVudCB8fCBjdXJyZW50Lm9wdHMuaGFzaCA9PT0gZmFsc2UpIHtcblx0XHRcdFx0XHRyZXR1cm47XG5cdFx0XHRcdH1cblxuXHRcdFx0XHQvLyBDaGVjayBpZiBuZWVkIHRvIHVwZGF0ZSB3aW5kb3cgaGFzaFxuXHRcdFx0XHRnYWxsZXJ5ID0gZ2V0R2FsbGVyeUlEKGluc3RhbmNlKTtcblxuXHRcdFx0XHRpZiAoIWdhbGxlcnkpIHtcblx0XHRcdFx0XHRyZXR1cm47XG5cdFx0XHRcdH1cblxuXHRcdFx0XHQvLyBWYXJpYWJsZSBjb250YWluaW5nIGxhc3QgaGFzaCB2YWx1ZSBzZXQgYnkgZmFuY3lCb3hcblx0XHRcdFx0Ly8gSXQgd2lsbCBiZSB1c2VkIHRvIGRldGVybWluZSBpZiBmYW5jeUJveCBuZWVkcyB0byBjbG9zZSBhZnRlciBoYXNoIGNoYW5nZSBpcyBkZXRlY3RlZFxuXHRcdFx0XHRpbnN0YW5jZS5jdXJyZW50SGFzaCA9IGdhbGxlcnkgKyAoaW5zdGFuY2UuZ3JvdXAubGVuZ3RoID4gMSA/IFwiLVwiICsgKGN1cnJlbnQuaW5kZXggKyAxKSA6IFwiXCIpO1xuXG5cdFx0XHRcdC8vIElmIGN1cnJlbnQgaGFzaCBpcyB0aGUgc2FtZSAodGhpcyBpbnN0YW5jZSBtb3N0IGxpa2VseSBpcyBvcGVuZWQgYnkgaGFzaGNoYW5nZSksIHRoZW4gZG8gbm90aGluZ1xuXHRcdFx0XHRpZiAod2luZG93LmxvY2F0aW9uLmhhc2ggPT09IFwiI1wiICsgaW5zdGFuY2UuY3VycmVudEhhc2gpIHtcblx0XHRcdFx0XHRyZXR1cm47XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRpZiAoZmlyc3RSdW4gJiYgIWluc3RhbmNlLm9yaWdIYXNoKSB7XG5cdFx0XHRcdFx0aW5zdGFuY2Uub3JpZ0hhc2ggPSB3aW5kb3cubG9jYXRpb24uaGFzaDtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdGlmIChpbnN0YW5jZS5oYXNoVGltZXIpIHtcblx0XHRcdFx0XHRjbGVhclRpbWVvdXQoaW5zdGFuY2UuaGFzaFRpbWVyKTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdC8vIFVwZGF0ZSBoYXNoXG5cdFx0XHRcdGluc3RhbmNlLmhhc2hUaW1lciA9IHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0aWYgKFwicmVwbGFjZVN0YXRlXCIgaW4gd2luZG93Lmhpc3RvcnkpIHtcblx0XHRcdFx0XHRcdHdpbmRvdy5oaXN0b3J5W2ZpcnN0UnVuID8gXCJwdXNoU3RhdGVcIiA6IFwicmVwbGFjZVN0YXRlXCJdKFxuXHRcdFx0XHRcdFx0XHR7fSxcblx0XHRcdFx0XHRcdFx0ZG9jdW1lbnQudGl0bGUsXG5cdFx0XHRcdFx0XHRcdHdpbmRvdy5sb2NhdGlvbi5wYXRobmFtZSArIHdpbmRvdy5sb2NhdGlvbi5zZWFyY2ggKyBcIiNcIiArIGluc3RhbmNlLmN1cnJlbnRIYXNoXG5cdFx0XHRcdFx0XHQpO1xuXG5cdFx0XHRcdFx0XHRpZiAoZmlyc3RSdW4pIHtcblx0XHRcdFx0XHRcdFx0aW5zdGFuY2UuaGFzQ3JlYXRlZEhpc3RvcnkgPSB0cnVlO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHR3aW5kb3cubG9jYXRpb24uaGFzaCA9IGluc3RhbmNlLmN1cnJlbnRIYXNoO1xuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdGluc3RhbmNlLmhhc2hUaW1lciA9IG51bGw7XG5cdFx0XHRcdH0sIDMwMCk7XG5cdFx0XHR9LFxuXG5cdFx0XHRcImJlZm9yZUNsb3NlLmZiXCI6IGZ1bmN0aW9uKGUsIGluc3RhbmNlLCBjdXJyZW50KSB7XG5cdFx0XHRcdGlmIChjdXJyZW50Lm9wdHMuaGFzaCA9PT0gZmFsc2UpIHtcblx0XHRcdFx0XHRyZXR1cm47XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRjbGVhclRpbWVvdXQoaW5zdGFuY2UuaGFzaFRpbWVyKTtcblxuXHRcdFx0XHQvLyBHb3RvIHByZXZpb3VzIGhpc3RvcnkgZW50cnlcblx0XHRcdFx0aWYgKGluc3RhbmNlLmN1cnJlbnRIYXNoICYmIGluc3RhbmNlLmhhc0NyZWF0ZWRIaXN0b3J5KSB7XG5cdFx0XHRcdFx0d2luZG93Lmhpc3RvcnkuYmFjaygpO1xuXHRcdFx0XHR9IGVsc2UgaWYgKGluc3RhbmNlLmN1cnJlbnRIYXNoKSB7XG5cdFx0XHRcdFx0aWYgKFwicmVwbGFjZVN0YXRlXCIgaW4gd2luZG93Lmhpc3RvcnkpIHtcblx0XHRcdFx0XHRcdHdpbmRvdy5oaXN0b3J5LnJlcGxhY2VTdGF0ZSh7fSwgZG9jdW1lbnQudGl0bGUsIHdpbmRvdy5sb2NhdGlvbi5wYXRobmFtZSArIHdpbmRvdy5sb2NhdGlvbi5zZWFyY2ggKyAoaW5zdGFuY2Uub3JpZ0hhc2ggfHwgXCJcIikpO1xuXHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHR3aW5kb3cubG9jYXRpb24uaGFzaCA9IGluc3RhbmNlLm9yaWdIYXNoO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXG5cdFx0XHRcdGluc3RhbmNlLmN1cnJlbnRIYXNoID0gbnVsbDtcblx0XHRcdH1cblx0XHR9KTtcblxuXHRcdC8vIENoZWNrIGlmIG5lZWQgdG8gc3RhcnQvY2xvc2UgYWZ0ZXIgdXJsIGhhcyBjaGFuZ2VkXG5cdFx0JCh3aW5kb3cpLm9uKFwiaGFzaGNoYW5nZS5mYlwiLCBmdW5jdGlvbigpIHtcblx0XHRcdHZhciB1cmwgPSBwYXJzZVVybCgpLFxuXHRcdFx0XHRmYiA9IG51bGw7XG5cblx0XHRcdC8vIEZpbmQgbGFzdCBmYW5jeUJveCBpbnN0YW5jZSB0aGF0IGhhcyBcImhhc2hcIlxuXHRcdFx0JC5lYWNoKFxuXHRcdFx0XHQkKFwiLmZhbmN5Ym94LWNvbnRhaW5lclwiKVxuXHRcdFx0XHRcdC5nZXQoKVxuXHRcdFx0XHRcdC5yZXZlcnNlKCksXG5cdFx0XHRcdGZ1bmN0aW9uKGluZGV4LCB2YWx1ZSkge1xuXHRcdFx0XHRcdHZhciB0bXAgPSAkKHZhbHVlKS5kYXRhKFwiRmFuY3lCb3hcIik7XG5cblx0XHRcdFx0XHRpZiAodG1wICYmIHRtcC5jdXJyZW50SGFzaCkge1xuXHRcdFx0XHRcdFx0ZmIgPSB0bXA7XG5cdFx0XHRcdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHQpO1xuXG5cdFx0XHRpZiAoZmIpIHtcblx0XHRcdFx0Ly8gTm93LCBjb21wYXJlIGhhc2ggdmFsdWVzXG5cdFx0XHRcdGlmIChmYi5jdXJyZW50SGFzaCAhPT0gdXJsLmdhbGxlcnkgKyBcIi1cIiArIHVybC5pbmRleCAmJiAhKHVybC5pbmRleCA9PT0gMSAmJiBmYi5jdXJyZW50SGFzaCA9PSB1cmwuZ2FsbGVyeSkpIHtcblx0XHRcdFx0XHRmYi5jdXJyZW50SGFzaCA9IG51bGw7XG5cblx0XHRcdFx0XHRmYi5jbG9zZSgpO1xuXHRcdFx0XHR9XG5cdFx0XHR9IGVsc2UgaWYgKHVybC5nYWxsZXJ5ICE9PSBcIlwiKSB7XG5cdFx0XHRcdHRyaWdnZXJGcm9tVXJsKHVybCk7XG5cdFx0XHR9XG5cdFx0fSk7XG5cblx0XHQvLyBDaGVjayBjdXJyZW50IGhhc2ggYW5kIHRyaWdnZXIgY2xpY2sgZXZlbnQgb24gbWF0Y2hpbmcgZWxlbWVudCB0byBzdGFydCBmYW5jeUJveCwgaWYgbmVlZGVkXG5cdFx0c2V0VGltZW91dChmdW5jdGlvbigpIHtcblx0XHRcdGlmICghJC5mYW5jeWJveC5nZXRJbnN0YW5jZSgpKSB7XG5cdFx0XHRcdHRyaWdnZXJGcm9tVXJsKHBhcnNlVXJsKCkpO1xuXHRcdFx0fVxuXHRcdH0sIDUwKTtcblx0fSk7XG59KSh3aW5kb3csIGRvY3VtZW50LCBqUXVlcnkpO1xuXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy9cbi8vIFdoZWVsXG4vLyBCYXNpYyBtb3VzZSB3ZWhlZWwgc3VwcG9ydCBmb3IgZ2FsbGVyeSBuYXZpZ2F0aW9uXG4vL1xuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbihmdW5jdGlvbihkb2N1bWVudCwgJCkge1xuXHRcInVzZSBzdHJpY3RcIjtcblxuXHR2YXIgcHJldlRpbWUgPSBuZXcgRGF0ZSgpLmdldFRpbWUoKTtcblxuXHQkKGRvY3VtZW50KS5vbih7XG5cdFx0XCJvbkluaXQuZmJcIjogZnVuY3Rpb24oZSwgaW5zdGFuY2UsIGN1cnJlbnQpIHtcblx0XHRcdGluc3RhbmNlLiRyZWZzLnN0YWdlLm9uKFwibW91c2V3aGVlbCBET01Nb3VzZVNjcm9sbCB3aGVlbCBNb3pNb3VzZVBpeGVsU2Nyb2xsXCIsIGZ1bmN0aW9uKGUpIHtcblx0XHRcdFx0dmFyIGN1cnJlbnQgPSBpbnN0YW5jZS5jdXJyZW50LFxuXHRcdFx0XHRcdGN1cnJUaW1lID0gbmV3IERhdGUoKS5nZXRUaW1lKCk7XG5cblx0XHRcdFx0aWYgKGluc3RhbmNlLmdyb3VwLmxlbmd0aCA8IDIgfHwgY3VycmVudC5vcHRzLndoZWVsID09PSBmYWxzZSB8fCAoY3VycmVudC5vcHRzLndoZWVsID09PSBcImF1dG9cIiAmJiBjdXJyZW50LnR5cGUgIT09IFwiaW1hZ2VcIikpIHtcblx0XHRcdFx0XHRyZXR1cm47XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRlLnByZXZlbnREZWZhdWx0KCk7XG5cdFx0XHRcdGUuc3RvcFByb3BhZ2F0aW9uKCk7XG5cblx0XHRcdFx0aWYgKGN1cnJlbnQuJHNsaWRlLmhhc0NsYXNzKFwiZmFuY3lib3gtYW5pbWF0ZWRcIikpIHtcblx0XHRcdFx0XHRyZXR1cm47XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRlID0gZS5vcmlnaW5hbEV2ZW50IHx8IGU7XG5cblx0XHRcdFx0aWYgKGN1cnJUaW1lIC0gcHJldlRpbWUgPCAyNTApIHtcblx0XHRcdFx0XHRyZXR1cm47XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRwcmV2VGltZSA9IGN1cnJUaW1lO1xuXG5cdFx0XHRcdGluc3RhbmNlWygtZS5kZWx0YVkgfHwgLWUuZGVsdGFYIHx8IGUud2hlZWxEZWx0YSB8fCAtZS5kZXRhaWwpIDwgMCA/IFwibmV4dFwiIDogXCJwcmV2aW91c1wiXSgpO1xuXHRcdFx0fSk7XG5cdFx0fVxuXHR9KTtcbn0pKGRvY3VtZW50LCBqUXVlcnkpO1xuXG4hZnVuY3Rpb24oZSx0KXtpZihcImZ1bmN0aW9uXCI9PXR5cGVvZiBkZWZpbmUmJmRlZmluZS5hbWQpZGVmaW5lKFtcImV4cG9ydHNcIl0sdCk7ZWxzZSBpZihcInVuZGVmaW5lZFwiIT10eXBlb2YgZXhwb3J0cyl0KGV4cG9ydHMpO2Vsc2V7dmFyIG89e307dChvKSxlLmJvZHlTY3JvbGxMb2NrPW99fSh0aGlzLGZ1bmN0aW9uKGV4cG9ydHMpe1widXNlIHN0cmljdFwiO2Z1bmN0aW9uIHIoZSl7aWYoQXJyYXkuaXNBcnJheShlKSl7Zm9yKHZhciB0PTAsbz1BcnJheShlLmxlbmd0aCk7dDxlLmxlbmd0aDt0Kyspb1t0XT1lW3RdO3JldHVybiBvfXJldHVybiBBcnJheS5mcm9tKGUpfU9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLFwiX19lc01vZHVsZVwiLHt2YWx1ZTohMH0pO3ZhciBsPSExO2lmKFwidW5kZWZpbmVkXCIhPXR5cGVvZiB3aW5kb3cpe3ZhciBlPXtnZXQgcGFzc2l2ZSgpe2w9ITB9fTt3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcihcInRlc3RQYXNzaXZlXCIsbnVsbCxlKSx3aW5kb3cucmVtb3ZlRXZlbnRMaXN0ZW5lcihcInRlc3RQYXNzaXZlXCIsbnVsbCxlKX12YXIgZD1cInVuZGVmaW5lZFwiIT10eXBlb2Ygd2luZG93JiZ3aW5kb3cubmF2aWdhdG9yJiZ3aW5kb3cubmF2aWdhdG9yLnBsYXRmb3JtJiYvaVAoYWR8aG9uZXxvZCkvLnRlc3Qod2luZG93Lm5hdmlnYXRvci5wbGF0Zm9ybSksYz1bXSx1PSExLGE9LTEscz12b2lkIDAsdj12b2lkIDAsZj1mdW5jdGlvbih0KXtyZXR1cm4gYy5zb21lKGZ1bmN0aW9uKGUpe3JldHVybiEoIWUub3B0aW9ucy5hbGxvd1RvdWNoTW92ZXx8IWUub3B0aW9ucy5hbGxvd1RvdWNoTW92ZSh0KSl9KX0sbT1mdW5jdGlvbihlKXt2YXIgdD1lfHx3aW5kb3cuZXZlbnQ7cmV0dXJuISFmKHQudGFyZ2V0KXx8KDE8dC50b3VjaGVzLmxlbmd0aHx8KHQucHJldmVudERlZmF1bHQmJnQucHJldmVudERlZmF1bHQoKSwhMSkpfSxvPWZ1bmN0aW9uKCl7c2V0VGltZW91dChmdW5jdGlvbigpe3ZvaWQgMCE9PXYmJihkb2N1bWVudC5ib2R5LnN0eWxlLnBhZGRpbmdSaWdodD12LHY9dm9pZCAwKSx2b2lkIDAhPT1zJiYoZG9jdW1lbnQuYm9keS5zdHlsZS5vdmVyZmxvdz1zLHM9dm9pZCAwKX0pfTtleHBvcnRzLmRpc2FibGVCb2R5U2Nyb2xsPWZ1bmN0aW9uKGksZSl7aWYoZCl7aWYoIWkpcmV0dXJuIHZvaWQgY29uc29sZS5lcnJvcihcImRpc2FibGVCb2R5U2Nyb2xsIHVuc3VjY2Vzc2Z1bCAtIHRhcmdldEVsZW1lbnQgbXVzdCBiZSBwcm92aWRlZCB3aGVuIGNhbGxpbmcgZGlzYWJsZUJvZHlTY3JvbGwgb24gSU9TIGRldmljZXMuXCIpO2lmKGkmJiFjLnNvbWUoZnVuY3Rpb24oZSl7cmV0dXJuIGUudGFyZ2V0RWxlbWVudD09PWl9KSl7dmFyIHQ9e3RhcmdldEVsZW1lbnQ6aSxvcHRpb25zOmV8fHt9fTtjPVtdLmNvbmNhdChyKGMpLFt0XSksaS5vbnRvdWNoc3RhcnQ9ZnVuY3Rpb24oZSl7MT09PWUudGFyZ2V0VG91Y2hlcy5sZW5ndGgmJihhPWUudGFyZ2V0VG91Y2hlc1swXS5jbGllbnRZKX0saS5vbnRvdWNobW92ZT1mdW5jdGlvbihlKXt2YXIgdCxvLG4scjsxPT09ZS50YXJnZXRUb3VjaGVzLmxlbmd0aCYmKG89aSxyPSh0PWUpLnRhcmdldFRvdWNoZXNbMF0uY2xpZW50WS1hLCFmKHQudGFyZ2V0KSYmKG8mJjA9PT1vLnNjcm9sbFRvcCYmMDxyP20odCk6KG49bykmJm4uc2Nyb2xsSGVpZ2h0LW4uc2Nyb2xsVG9wPD1uLmNsaWVudEhlaWdodCYmcjwwP20odCk6dC5zdG9wUHJvcGFnYXRpb24oKSkpfSx1fHwoZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihcInRvdWNobW92ZVwiLG0sbD97cGFzc2l2ZTohMX06dm9pZCAwKSx1PSEwKX19ZWxzZXtuPWUsc2V0VGltZW91dChmdW5jdGlvbigpe2lmKHZvaWQgMD09PXYpe3ZhciBlPSEhbiYmITA9PT1uLnJlc2VydmVTY3JvbGxCYXJHYXAsdD13aW5kb3cuaW5uZXJXaWR0aC1kb2N1bWVudC5kb2N1bWVudEVsZW1lbnQuY2xpZW50V2lkdGg7ZSYmMDx0JiYodj1kb2N1bWVudC5ib2R5LnN0eWxlLnBhZGRpbmdSaWdodCxkb2N1bWVudC5ib2R5LnN0eWxlLnBhZGRpbmdSaWdodD10K1wicHhcIil9dm9pZCAwPT09cyYmKHM9ZG9jdW1lbnQuYm9keS5zdHlsZS5vdmVyZmxvdyxkb2N1bWVudC5ib2R5LnN0eWxlLm92ZXJmbG93PVwiaGlkZGVuXCIpfSk7dmFyIG89e3RhcmdldEVsZW1lbnQ6aSxvcHRpb25zOmV8fHt9fTtjPVtdLmNvbmNhdChyKGMpLFtvXSl9dmFyIG59LGV4cG9ydHMuY2xlYXJBbGxCb2R5U2Nyb2xsTG9ja3M9ZnVuY3Rpb24oKXtkPyhjLmZvckVhY2goZnVuY3Rpb24oZSl7ZS50YXJnZXRFbGVtZW50Lm9udG91Y2hzdGFydD1udWxsLGUudGFyZ2V0RWxlbWVudC5vbnRvdWNobW92ZT1udWxsfSksdSYmKGRvY3VtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIoXCJ0b3VjaG1vdmVcIixtLGw/e3Bhc3NpdmU6ITF9OnZvaWQgMCksdT0hMSksYz1bXSxhPS0xKToobygpLGM9W10pfSxleHBvcnRzLmVuYWJsZUJvZHlTY3JvbGw9ZnVuY3Rpb24odCl7aWYoZCl7aWYoIXQpcmV0dXJuIHZvaWQgY29uc29sZS5lcnJvcihcImVuYWJsZUJvZHlTY3JvbGwgdW5zdWNjZXNzZnVsIC0gdGFyZ2V0RWxlbWVudCBtdXN0IGJlIHByb3ZpZGVkIHdoZW4gY2FsbGluZyBlbmFibGVCb2R5U2Nyb2xsIG9uIElPUyBkZXZpY2VzLlwiKTt0Lm9udG91Y2hzdGFydD1udWxsLHQub250b3VjaG1vdmU9bnVsbCxjPWMuZmlsdGVyKGZ1bmN0aW9uKGUpe3JldHVybiBlLnRhcmdldEVsZW1lbnQhPT10fSksdSYmMD09PWMubGVuZ3RoJiYoZG9jdW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lcihcInRvdWNobW92ZVwiLG0sbD97cGFzc2l2ZTohMX06dm9pZCAwKSx1PSExKX1lbHNlIDE9PT1jLmxlbmd0aCYmY1swXS50YXJnZXRFbGVtZW50PT09dD8obygpLGM9W10pOmM9Yy5maWx0ZXIoZnVuY3Rpb24oZSl7cmV0dXJuIGUudGFyZ2V0RWxlbWVudCE9PXR9KX19KTtcblxuKGZ1bmN0aW9uICgkKSB7XG5cdCQoZG9jdW1lbnQpLnJlYWR5KGZ1bmN0aW9uICgpIHtcblx0XHRhcHAuaW5pdCgpO1xuXHR9KTtcblxuXHR2YXIgYXBwID0ge1xuXHRcdGluaXQ6IGZ1bmN0aW9uICgpIHtcblx0XHRcdHRoaXMuYWNjZXNzaWJpbGl0eSgpO1xuXHRcdFx0dGhpcy51dGlscygpO1xuXHRcdFx0Ly8gdGhpcy5hZ2VuZGEoKTtcblx0XHRcdHRoaXMubWVudSgpO1xuXG5cdFx0XHR0aGlzLmNhcm91c2VsKCk7XG5cdFx0XHRjb25zb2xlLmxvZygnQXBwIGhlcmUhJyk7XG5cdFx0fSxcblxuXHRcdC8qKlxuXHRcdCAqIEFjY2Vzc2liaWxpdHkgZnVuY3Rpb25zXG5cdFx0ICpcblx0XHQgKi9cblx0XHRhY2Nlc3NpYmlsaXR5OiBmdW5jdGlvbiAoKSB7XG5cdFx0XHQvLyBIaWdoIGNvbnRyYXN0XG5cdFx0XHQkKCcjaGlnaC1jb250cmFzdC1idG4nKS5jbGljayhmdW5jdGlvbiAoZSkge1xuXHRcdFx0XHRlLnByZXZlbnREZWZhdWx0KCk7XG5cdFx0XHRcdHZhciBoaWdoQ29udHJhc3QgPSBjb29raWUoJ2hpZ2gtY29udHJhc3QnKTtcblxuXHRcdFx0XHRpZiAoaGlnaENvbnRyYXN0ID09PSAnb24nKSB7XG5cdFx0XHRcdFx0Y29va2llKCdoaWdoLWNvbnRyYXN0JywgJ29mZicpO1xuXHRcdFx0XHRcdCQoJ2JvZHknKS5yZW1vdmVDbGFzcygnaGlnaC1jb250cmFzdCcpO1xuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdGNvb2tpZSgnaGlnaC1jb250cmFzdCcsICdvbicpO1xuXHRcdFx0XHRcdCQoJ2JvZHknKS5hZGRDbGFzcygnaGlnaC1jb250cmFzdCcpO1xuXHRcdFx0XHR9XG5cdFx0XHR9KVxuXHRcdH0sXG5cblxuXG5cdFx0LyoqXG5cdFx0ICogTWVudSBGdW5jdGlvbnNcblx0XHQgKlxuXHRcdCAqL1xuXHRcdG1lbnU6IGZ1bmN0aW9uICgpIHtcblx0XHRcdHZhciBvZmZzZXRZID0gJzBweCc7XG5cbiAgICAgIHZhciBib2R5ID0gZG9jdW1lbnQuYm9keTtcblxuICAgICAgYm9keS5hZGRFdmVudExpc3RlbmVyKFwidG91Y2hzdGFydFwiLCBmdW5jdGlvbiBib2R5TGlzdG5lcihlKSB7XG4gICAgICBcdGNvbnNvbGUubG9nKGUpO1xuICAgICAgICAgIGlmIChlLnRhcmdldC5pZCA9PT0gXCJvdmVybGF5XCIpIHtcbiAgICAgICAgICBcdGUuc3RvcFByb3BhZ2F0aW9uKCk7XG4gICAgICAgICAgICAgIHRvZ2dsZVZpZXdwb3J0U2Nyb2xsaW5nKHRydWUpO1xuICAgICAgICAgICAgICBjb25zb2xlLmxvZygnZmFsc2UnKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIFx0dG9nZ2xlVmlld3BvcnRTY3JvbGxpbmcoZmFsc2UpO1xuICAgICAgICAgIH1cbiAgICAgIH0sIGZhbHNlKTtcblxuICAgICAgdmFyIGZyZWV6ZVZwID0gZnVuY3Rpb24oZSkge1xuICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgIH07XG5cbiAgICAgIGZ1bmN0aW9uIHRvZ2dsZVZpZXdwb3J0U2Nyb2xsaW5nIChib29sKSB7XG4gICAgICAgICAgaWYgKGJvb2wgPT09IHRydWUpIHtcbiAgICAgICAgICAgICAgYm9keS5hZGRFdmVudExpc3RlbmVyKFwidG91Y2htb3ZlXCIsIGZyZWV6ZVZwLCBmYWxzZSk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgYm9keS5yZW1vdmVFdmVudExpc3RlbmVyKFwidG91Y2htb3ZlXCIsIGZyZWV6ZVZwLCBmYWxzZSk7XG4gICAgICAgICAgfVxuICAgICAgfVxuXG5cdFx0XHQvLyBIaWdoIGNvbnRyYXN0XG5cdFx0XHQkKCcjbWVudS10b2dnbGUnKS5jbGljayhmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdCQoJ2JvZHknKS50b2dnbGVDbGFzcygnbWVudS1hY3RpdmUnKTtcblxuXHRcdFx0XHQvLyBvZmZzZXRZID0gd2luZG93LnBhZ2VZT2Zmc2V0O1xuXG5cdFx0XHRcdC8vIGlmICgkKCdib2R5JykuaGFzQ2xhc3MoJ21lbnUtYWN0aXZlJykpIHtcblx0XHRcdFx0Ly8gXHQkKCdib2R5JykuY3NzKHtcblx0XHRcdFx0Ly8gXHRcdCdwb3NpdGlvbic6ICdmaXhlZCcsXG5cdFx0XHRcdC8vIFx0XHQndG9wJzogJy0nICsgb2Zmc2V0WSArICdweCdcblx0XHRcdFx0Ly8gXHR9KTtcblx0XHRcdFx0Ly8gfVxuXHRcdFx0fSlcblxuXHRcdFx0JCgnI21lbnUtd3JhcHBlciwgI21lbnUtdG9nZ2xlJykuY2xpY2soZnVuY3Rpb24oZXZlbnQpe1xuXHRcdFx0XHRldmVudC5zdG9wUHJvcGFnYXRpb24oKTtcblx0XHRcdH0pO1xuXG5cdFx0XHQkKCdib2R5LCAuY2xvc2UtbWVudScpLmNsaWNrKGZ1bmN0aW9uKGV2ZW50KXtcblx0XHRcdFx0JCgnYm9keScpLnJlbW92ZUNsYXNzKCdtZW51LWFjdGl2ZScpO1xuXG5cdFx0XHRcdC8vICQoJ2JvZHknKS5jc3Moe1xuXHRcdFx0XHQvLyBcdCdwb3NpdGlvbic6ICdzdGF0aWMnLFxuXHRcdFx0XHQvLyBcdCd0b3AnOiAnYXV0bydcblx0XHRcdFx0Ly8gfSk7XG5cblx0XHRcdFx0Ly8gY29uc29sZS5sb2cob2Zmc2V0WSk7XG5cblx0XHRcdFx0Ly8gZG9jdW1lbnQuYm9keS5zY3JvbGxUb3AgPSBvZmZzZXRZO1xuXHRcdFx0XHQvLyBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQuc2Nyb2xsVG9wID0gb2Zmc2V0WTtcblx0XHRcdH0pO1xuXG5cdFx0XHQkKCcud2lkZ2V0X25hdl9tZW51JykuY2xpY2soZnVuY3Rpb24oKSB7XG5cdFx0XHRcdCQodGhpcykudG9nZ2xlQ2xhc3MoJ2FjdGl2ZScpO1xuXHRcdFx0fSk7XG5cdFx0fSxcblxuXHRcdGNhcm91c2VsOiBmdW5jdGlvbigpIHtcblx0XHRcdHZhciAkY2Fyb3VzZWwgPSAkKCcjanVtYm90cm9uLWNhcm91c2VsJyk7XG5cblx0XHRcdGFwcC5zd2lwZWRldGVjdCgkY2Fyb3VzZWwuZmluZCgnLmNhcm91c2VsLWlubmVyJylbMF0sIGZ1bmN0aW9uKHN3aXBlZGlyKXtcblx0XHRcdFx0XHRpZiAoc3dpcGVkaXIgPT09ICdyaWdodCcpIHtcblx0XHRcdFx0XHRcdCRjYXJvdXNlbC5jYXJvdXNlbCgncHJldicpO1xuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdGlmIChzd2lwZWRpciA9PT0gJ2xlZnQnKSB7XG5cdFx0XHRcdFx0XHQkY2Fyb3VzZWwuY2Fyb3VzZWwoJ25leHQnKTtcblx0XHRcdFx0XHR9XG5cdFx0XHR9KTtcblx0XHR9LFxuXG5cdFx0LyoqXG5cdFx0ICogVXRpbGl0eSBmdW5jdGlvbnMsIHVzZWQgb24gYWxsIHNpdGVzXG5cdFx0ICpcblx0XHQgKi9cblx0XHR1dGlsczogZnVuY3Rpb24gKCkge1xuXHRcdFx0Ly8gRW5hYmxlIGJvb3RzdHJhcCB0b29sdGlwXG5cdFx0XHQkKCdbZGF0YS10b2dnbGU9XCJ0b29sdGlwXCJdJykudG9vbHRpcCgpO1xuXG5cdFx0XHQvLyBGYW5jeWJveCBmb3IgZ2FsbGVyeSBtZWRpYVxuXHRcdFx0aWYoICQoJy5nYWxsZXJ5JykubGVuZ3RoICl7XG5cdFx0XHRcdCQoJy5nYWxsZXJ5LWl0ZW0nKS5lYWNoKCBmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdFx0dmFyIGNhcHRpb24gPSAkKHRoaXMpLmZpbmQoJy5nYWxsZXJ5LWNhcHRpb24nKS50ZXh0KCk7XG5cdFx0XHRcdFx0JCh0aGlzKS5maW5kKCdhJykuYXR0ciggJ2RhdGEtY2FwdGlvbicsIGNhcHRpb24gKTtcblx0XHRcdFx0fSk7XG5cdFx0XHRcdCQoJy5nYWxsZXJ5LWl0ZW0gYScpLmF0dHIoICdkYXRhLWZhbmN5Ym94JywgJ2dyb3VwJyApO1xuXHRcdFx0XHQkKCcuZ2FsbGVyeS1pdGVtIGEnKS5mYW5jeWJveCh7fSk7XG5cdFx0XHR9XG5cblx0XHRcdCQoJy50b2dnbGUtYWN0aXZlJykuY2xpY2soIGZ1bmN0aW9uKCkge1xuXHRcdFx0XHQkKHRoaXMpLnBhcmVudCgpLnRvZ2dsZUNsYXNzKCdhY3RpdmUnKTtcblx0XHRcdH0pO1xuXG5cdFx0XHQkKCdhLnNoYXJlLWxpbmsnKS5vbignY2xpY2snLCBmdW5jdGlvbihldmVudCkge1xuXHRcdFx0XHRldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuXHRcdFx0XHR2YXIgdXJsID0gJCh0aGlzKS5hdHRyKCdocmVmJyk7XG5cdFx0XHRcdHNob3dNb2RhbCh1cmwpO1xuXHRcdFx0fSk7XG5cblx0XHRcdGZ1bmN0aW9uIHNob3dNb2RhbCh1cmwpe1xuXHRcdFx0XHR3aW5kb3cub3Blbih1cmwsIFwic2hhcmVXaW5kb3dcIiwgXCJ3aWR0aD02MDAsIGhlaWdodD00MDBcIik7XG5cdFx0XHRcdHJldHVybiBmYWxzZTtcblx0XHRcdH1cblx0XHR9LFxuXG5cdFx0Ly8gY3JlZGl0OiBodHRwOi8vd3d3LmphdmFzY3JpcHRraXQuY29tL2phdmF0dXRvcnMvdG91Y2hldmVudHMyLnNodG1sXG5cdFx0c3dpcGVkZXRlY3Q6IGZ1bmN0aW9uKGVsLCBjYWxsYmFjayl7XG5cblx0XHRcdHZhciB0b3VjaHN1cmZhY2UgPSBBcnJheS5pc0FycmF5KGVsKSA/IGVsIDogW2VsXSxcblx0XHRcdFx0XHRzd2lwZWRpcixcblx0XHRcdFx0XHRzdGFydFgsXG5cdFx0XHRcdFx0c3RhcnRZLFxuXHRcdFx0XHRcdGRpc3RYLFxuXHRcdFx0XHRcdGRpc3RZLFxuXHRcdFx0XHRcdHRocmVzaG9sZCA9IDEwMCwgLy9yZXF1aXJlZCBtaW4gZGlzdGFuY2UgdHJhdmVsZWQgdG8gYmUgY29uc2lkZXJlZCBzd2lwZVxuXHRcdFx0XHRcdHJlc3RyYWludCA9IDEwMCwgLy8gbWF4aW11bSBkaXN0YW5jZSBhbGxvd2VkIGF0IHRoZSBzYW1lIHRpbWUgaW4gcGVycGVuZGljdWxhciBkaXJlY3Rpb25cblx0XHRcdFx0XHRhbGxvd2VkVGltZSA9IDMwMCwgLy8gbWF4aW11bSB0aW1lIGFsbG93ZWQgdG8gdHJhdmVsIHRoYXQgZGlzdGFuY2Vcblx0XHRcdFx0XHRlbGFwc2VkVGltZSxcblx0XHRcdFx0XHRzdGFydFRpbWUsXG5cdFx0XHRcdFx0aGFuZGxlc3dpcGUgPSBjYWxsYmFjayB8fCBmdW5jdGlvbihzd2lwZWRpcil7fTtcblxuXHRcdFx0dG91Y2hzdXJmYWNlLmZvckVhY2goIChlbGVtZW50KSA9PiB7XG5cdFx0XHRcdGVsZW1lbnQuYWRkRXZlbnRMaXN0ZW5lcigndG91Y2hzdGFydCcsIGZ1bmN0aW9uKGUpe1xuXG5cdFx0XHRcdFx0dmFyIHRvdWNob2JqID0gZS5jaGFuZ2VkVG91Y2hlc1swXTtcblx0XHRcdFx0XHRzd2lwZWRpciA9ICdub25lJztcblx0XHRcdFx0XHRkaXN0ID0gMDtcblx0XHRcdFx0XHRzdGFydFggPSB0b3VjaG9iai5wYWdlWDtcblx0XHRcdFx0XHRzdGFydFkgPSB0b3VjaG9iai5wYWdlWTtcblx0XHRcdFx0XHRzdGFydFRpbWUgPSBuZXcgRGF0ZSgpLmdldFRpbWUoKTsgLy8gcmVjb3JkIHRpbWUgd2hlbiBmaW5nZXIgZmlyc3QgbWFrZXMgY29udGFjdCB3aXRoIHN1cmZhY2VcblxuXHRcdFx0XHR9LCBmYWxzZSk7XG5cblx0XHRcdFx0ZWxlbWVudC5hZGRFdmVudExpc3RlbmVyKCd0b3VjaGVuZCcsIGZ1bmN0aW9uKGUpe1xuXHRcdFx0XHRcdHZhciB0b3VjaG9iaiA9IGUuY2hhbmdlZFRvdWNoZXNbMF07XG5cdFx0XHRcdFx0ZGlzdFggPSB0b3VjaG9iai5wYWdlWCAtIHN0YXJ0WDsgLy8gZ2V0IGhvcml6b250YWwgZGlzdCB0cmF2ZWxlZCBieSBmaW5nZXIgd2hpbGUgaW4gY29udGFjdCB3aXRoIHN1cmZhY2Vcblx0XHRcdFx0XHRkaXN0WSA9IHRvdWNob2JqLnBhZ2VZIC0gc3RhcnRZOyAvLyBnZXQgdmVydGljYWwgZGlzdCB0cmF2ZWxlZCBieSBmaW5nZXIgd2hpbGUgaW4gY29udGFjdCB3aXRoIHN1cmZhY2Vcblx0XHRcdFx0XHRlbGFwc2VkVGltZSA9IG5ldyBEYXRlKCkuZ2V0VGltZSgpIC0gc3RhcnRUaW1lOyAvLyBnZXQgdGltZSBlbGFwc2VkXG5cblx0XHRcdFx0XHRpZiAoZWxhcHNlZFRpbWUgPD0gYWxsb3dlZFRpbWUpIHsgLy8gZmlyc3QgY29uZGl0aW9uIGZvciBhd2lwZSBtZXRcblx0XHRcdFx0XHRcdFx0aWYgKE1hdGguYWJzKGRpc3RYKSA+PSB0aHJlc2hvbGQgJiYgTWF0aC5hYnMoZGlzdFkpIDw9IHJlc3RyYWludCl7IC8vIDJuZCBjb25kaXRpb24gZm9yIGhvcml6b250YWwgc3dpcGUgbWV0XG5cdFx0XHRcdFx0XHRcdFx0c3dpcGVkaXIgPSAoZGlzdFggPCAwKT8gJ2xlZnQnIDogJ3JpZ2h0JzsgLy8gaWYgZGlzdCB0cmF2ZWxlZCBpcyBuZWdhdGl2ZSwgaXQgaW5kaWNhdGVzIGxlZnQgc3dpcGVcblx0XHRcdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0XHRcdGVsc2UgaWYgKE1hdGguYWJzKGRpc3RZKSA+PSB0aHJlc2hvbGQgJiYgTWF0aC5hYnMoZGlzdFgpIDw9IHJlc3RyYWludCl7IC8vIDJuZCBjb25kaXRpb24gZm9yIHZlcnRpY2FsIHN3aXBlIG1ldFxuXHRcdFx0XHRcdFx0XHRcdHN3aXBlZGlyID0gKGRpc3RZIDwgMCk/ICd1cCcgOiAnZG93bic7IC8vIGlmIGRpc3QgdHJhdmVsZWQgaXMgbmVnYXRpdmUsIGl0IGluZGljYXRlcyB1cCBzd2lwZVxuXHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0aGFuZGxlc3dpcGUoc3dpcGVkaXIpO1xuXHRcdFx0XHR9LCBmYWxzZSlcblx0XHRcdH0pO1xuXHRcdH0sXG5cblx0XHRhZ2VuZGE6IGZ1bmN0aW9uICgpIHtcblx0XHRcdCQoJyNkYXRlcGlja2VyJykuZGF0ZXBpY2tlcih7XG5cdFx0XHRcdGRheU5hbWVzTWluOiBbJ0RvbScsICdTZWcnLCAnVGVyJywgJ1F1YScsICdRdWknLCAnU2V4JywgJ1NhYiddXG5cdFx0XHR9KTtcblxuXHRcdFx0JCgnLm1vbnRocGlja2VyJykub24oJ2NsaWNrJywgZnVuY3Rpb24gKGUpIHtcblx0XHRcdFx0ZS5wcmV2ZW50RGVmYXVsdCgpO1xuXHRcdFx0XHQkKCcubW9udGhwaWNrZXInKS5kYXRlcGlja2VyKCdzaG93Jyk7XG5cdFx0XHR9KTtcblx0XHR9XG5cdH07XG59KShqUXVlcnkpO1xuIl0sImZpbGUiOiJidW5kbGUuanMifQ==
