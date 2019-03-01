/**
 * File customizer.js.
 *
 * Theme Customizer enhancements for a better user experience.
 *
 * Contains handlers to make Theme Customizer preview reload changes asynchronously.
 */

( function( $, api ) {
	// Short-circuit selective refresh events if not in customizer preview or pre-4.5.
	hasSelectiveRefresh = (
		'undefined' !== typeof wp &&
		wp.customize &&
		wp.customize.selectiveRefresh &&
		wp.customize.widgetsPreview &&
		wp.customize.widgetsPreview.WidgetPartial
	);

	// Header text color.
	api( 'header_textcolor', function( value ) {
		value.bind( function( to ) {
			if ( 'blank' === to ) {
				$( '.site-title, .site-description' ).css( {
					'clip': 'rect(1px, 1px, 1px, 1px)',
					'position': 'absolute'
				} );
			} else {
				$( '.site-title, .site-description' ).css( {
					'clip': 'auto',
					'position': 'relative'
				} );
				$( '.site-title a, .site-description' ).css( {
					'color': to
				} );
			}
		} );
	} );

	api( 'customize_services_widgets_area', function( value ) {

		value.bind( function( to ) {
			console.log( to );
			wp.customize.previewer.refresh();
			// $( '.site-description' ).text( to );
			// wp.refresh(); // wp.customize.selectiveRefresh
		} );
	} );

	api( 'idg-wp_theme_options_main_carousel', function( value ) {
		value.bind( function( to ) {
			/*$.ajax( {
				url: idgCustomizer.ajaxurl,
				type: 'POST',
				data: {
					action: 'get_jumbotron_carousel'
				},
				beforeSend: function(){
					// agenda.addClass('loading');
				},
				success: function( res ) {
					console.log( res.data );
					$('.carousel-wrapper').html(res.data);
					/!*if( res.success ){
						agenda.removeClass('loading');
						agenda.find('ul').html(res.data.weeks);
						agenda.find('.monthpicker .month-name').text(res.data.month);

						if( res.data.events.length ){
							agenda.find('.events').html(res.data.events);
						} else {
							agenda.find('.events').html('<div class="event-item empty"><span class="location">Sem compromissos oficiais nesta data.</span></div>');
						}
					}*!/
				},
				error: function( jqXHR, textStatus, errorThrown ) {
					console.log( jqXHR, textStatus, errorThrown );
				},
			} );*/
		} );
	} );

	/*api( 'idg-wp_theme_options_home_widgets_sections', function( value ) {
		console.log('widgets-sections-selector: ', value );
		value.bind( function( to ) {
			console.log('TO: ', to);
		} )
	} );*/

} )( jQuery, wp.customize );
