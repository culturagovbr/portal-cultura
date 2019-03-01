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
		}
	};
})(jQuery);
