(function ($) {
	$(document).ready(function () {
		admin.init();
	});

	var admin = {
		init: function () {
			this.idgFeatureCardWidgets();
			this.idgBannersWidgets();
			this.idgBlockInit();
			this.idgSectionsWidgetsAreas();
			this.idgSectionsWidgetsAreasCustomize();
			this.idgTextImageBoxWidgets();
		},

		idgFeatureCardWidgets: function () {
			$(document).on('keyup', '.idg-feature-card-widget .card-title', function () {
				$(this).closest('.idg-feature-card-widget').find('.card-title').text($(this).val());
			});

			$(document).on('change', '.idg-feature-card-widget .icon-selector', function () {
				var cardIcon = $(this).val();
				if( cardIcon === 'upload-custom-icon' ){
					$(this).closest('.idg-feature-card-widget').find('.feature-card .icon > img').show();
					$(this).closest('.idg-feature-card-widget').find('.custom-icon').removeClass('hidden');
				} else {
					$(this).closest('.idg-feature-card-widget').find('.custom-icon').addClass('hidden');
					$(this).closest('.idg-feature-card-widget').find('.feature-card .icon > img').hide();
					$(this).closest('.idg-feature-card-widget').find('.feature-card .icon').removeClass().addClass('icon ' + $(this).val());
				}
				$(this).closest('.idg-feature-card-widget').find('.feature-card .icon').removeClass().addClass('icon ' + $(this).val());
			});

			$(document).on('change', '.idg-feature-card-widget .card-model', function () {
				var cardModel = $(this).val();
				$(this).closest('.idg-feature-card-widget').find('.feature-card').removeClass().addClass('feature-card static-height ' + cardModel );
				if( cardModel === 'card-3' ){
					$(this).closest('.idg-feature-card-widget').find('.card-desc-wrapper').removeClass('hidden');
					$(this).closest('.idg-feature-card-widget').find('.feature-card .card-desc, .feature-card .card-btn').show();
				} else {
					$(this).closest('.idg-feature-card-widget').find('.card-desc-wrapper').addClass('hidden');
					$(this).closest('.idg-feature-card-widget').find('.feature-card .card-desc, .feature-card .card-btn').hide();
				}
			});

			$(document).on('keyup', '.idg-feature-card-widget .card-desc', function () {
				$(this).closest('.idg-feature-card-widget').find('.card-desc').text($(this).val());
			});

			$(document).on('keyup', '.idg-feature-card-widget .card-btn-text', function () {
				$(this).closest('.idg-feature-card-widget').find('.card-btn.btn').text($(this).val());
			});
		},

		idgBannersWidgets: function () {

			$(document).on('click', '.number-of-banners-input', function (e) {
				wpWidgets.save( $(this).closest('.widget'), 0, 1, 0);
			});

			$(document).on('click', '.upload_image_button', function (e) {
				e.preventDefault();
				var clickedButton = $(this);

				wp.media.editor.send.attachment = function(props, attachment){
					clickedButton.prev('input').val( attachment.id );
					clickedButton.parent().find('img.banner-img-preview').attr( 'src', attachment.url );
					wpWidgets.save( clickedButton.closest('.widget'), 0, 1, 0);
				};
				wp.media.editor.open( clickedButton );
			});

			$(document).on('click', '.remove-banner-item', function (e) {
				e.preventDefault();
				var banners = $(this).closest('.idg-banners-widget'),
					n = banners.find('.banners-items .banner').length;

				$(this).closest('.banner').addClass('deleting-banner').fadeOut();
				banners.find('.number-of-banners-input').val( n - 1 );
				banners.find('.banner.deleting-banner').remove();
				wpWidgets.save( banners.closest('.widget'), 0, 1, 0);
			});

		},

		idgBlockInit: function () {
			if( wp.element ){

				var el = wp.element.createElement,
					registerBlockType = wp.blocks.registerBlockType,
					RichText = wp.editor.RichText;

				function checkForAElement(content) {
					if( content.startsWith('<a') ){
						// console.log( 'already has a' );
						blockStyle = { backgroundColor: '#f3f4f5' };
					} else {
						// console.log( 'MISSING a' );
						blockStyle = { backgroundColor: '#7F0013' };
					}
				}

				var blockStyle;
				registerBlockType( 'gutenberg-boilerplate-es5/idgwp-gutenberg-block-card', {
					title: 'Feature card block',
					icon: 'paperclip',
					category: 'widgets',
					attributes: {
						content: {
							type: 'string',
							source: 'html',
							selector: 'div',
						}
					},
					edit: function( props ) {
						var content = props.attributes.content;

						function onChangeContent( newContent ) {
							props.setAttributes( { content: newContent } );
							checkForAElement( content );
						}

						return el(
							RichText,
							{
								tagName: 'div',
								className: props.className,
								onChange: onChangeContent,
								value: content,
								// style: blockStyle
							}
						);
					},

					save: function( props ) {
						var content = props.attributes.content;
						// checkForAElement( content );
						return el( RichText.Content, {
							tagName: 'div',
							className: props.className,
							value: content
						} );
					},
				});

			}
		},

		idgSectionsWidgetsAreas: function () {
			if( $('.widget-liquid-right').length ){
				$('.widget-liquid-right').append(idg_admin.idg_custom_sections_form);

				var idg_wp_widgets_areas = $( 'div[id^=idg_wp_widget_area_]' );
				idg_wp_widgets_areas.each( function() {
					$(this).closest('.widgets-holder-wrap').addClass('idg-wp-custom-widget-area');
					if( $(this).closest('.widgets-holder-wrap').find('.sidebar-description').length ){
						$(this).closest('.widgets-holder-wrap').find('.sidebar-description').append('<p class="description description-idg"><a href="#" class="button-link button-link-delete idg-wp-widget-remove-area">Deletar esta seção</a></p>')
					} else {
						$(this).closest('.widgets-holder-wrap').find('.sidebar-name').after('<div class="sidebar-description"><p class="description"><a href="#" class="button-link button-link-delete idg-wp-widget-remove-area">Deletar esta seção</a></p></div>')
					}

					var sectionTitle  = '<p>';
						sectionTitle += '<label>Section title</label>';
						sectionTitle += '<input class="widefat section-area-title" type="text">';
						sectionTitle += '</p>';

					var sectionClasses  = '<p>';
						sectionClasses += '<label>Section custom class</label>';
						sectionClasses += '<input class="widefat section-area-classes" type="text">';
						sectionClasses += '</p>';

					var beforeWidgetClasses  = '<p>';
						beforeWidgetClasses += '<label>Before each widget class</label>';
						beforeWidgetClasses += '<input class="widefat section-area-before-widget-classes" type="text">';
						beforeWidgetClasses += '</p>';

					var sectionUpdateButton  = '<div class="widget-control-actions" style="min-height: 32px;"><div class="alignright">';
						sectionUpdateButton += '<a href="#" class="section-area-custom-data-update button button-primary right">Update section</a>';
						sectionUpdateButton += '</div></div>';

					$(this).closest('.widgets-holder-wrap').find('.description').last().append(sectionTitle + sectionClasses + beforeWidgetClasses + sectionUpdateButton);

					var idg_wp_widgets_area_id = $(this).closest( '.widgets-holder-wrap' ).find( 'div[id^=idg_wp_widget_area_]' ).attr( 'id' );

					$.ajax( {
						type: "POST",
						url: idg_admin.ajaxurl,
						data:
							{
								action : 'idg_wp_get_custom_data_in_widget_area',
								idg_wp_widgets_area_id : idg_wp_widgets_area_id
							},
						success: function( res ){
							if( res.success ){
								$('#' + idg_wp_widgets_area_id).find('.section-area-title').val(res.data.section_title);
								$('#' + idg_wp_widgets_area_id).find('.section-area-classes').val(res.data.section_class);
								$('#' + idg_wp_widgets_area_id).find('.section-area-before-widget-classes').val(res.data.section_before_widget_class);
							}
						}
					} );

					$( '.idg-wp-widget-remove-area' ).click( function( event ) {
						event.preventDefault();
						var idg_wp_widgets_area_id =  $(this).closest( '.widgets-holder-wrap' ).find( 'div[id^=idg_wp_widget_area_]' ).attr( 'id' );

						$.ajax( {
							type: "POST",
							url: idg_admin.ajaxurl,
							data:
								{
									action : 'idg_wp_remove_widget_area',
									idg_wp_widgets_area_id : idg_wp_widgets_area_id,
								},
							success: function( data ){
								if( data.success ){
									$( '#' + idg_wp_widgets_area_id ).closest( '.widgets-holder-wrap' ).remove();
								}
							}
						} );

						return false;
					} );

					$( '.section-area-custom-data-update' ).click( function( event ) {
						event.preventDefault();
						var idg_wp_widgets_area_id = $(this).closest( '.widgets-holder-wrap' ).find( 'div[id^=idg_wp_widget_area_]' ).attr( 'id' ),
							section_area_title = $('#' + idg_wp_widgets_area_id).find( '.section-area-title' ).val(),
							section_area_classes = $('#' + idg_wp_widgets_area_id).find( '.section-area-classes' ).val(),
							section_before_widget_class = $('#' + idg_wp_widgets_area_id).find( '.section-area-before-widget-classes' ).val();

						$.ajax( {
							type: "POST",
							url: idg_admin.ajaxurl,
							data:
								{
									action : 'idg_wp_update_custom_data_in_widget_area',
									idg_wp_widgets_area_id : idg_wp_widgets_area_id,
									section_area_title : section_area_title,
									section_area_classes : section_area_classes,
									section_before_widget_class : section_before_widget_class,
								},
							success: function( data ){
								if( data.success ){
								}
							}
						} );

						return false;
					} );

				} );
			}
		},

		idgSectionsWidgetsAreasCustomize: function () {
			if( $('#idg-wp-home-widgets-sections-selector').length ){
				var $sectionsList = $( '#idg-wp-home-widgets-sections-sortable' ),
					$sectionsSelected = $( '#idg-wp-home-widgets-sections-selected' ),
					sectionsVals = [];

				$sectionsList.sortable();
				$sectionsList.disableSelection();
				$sectionsList.on( 'sortstop', updateSectionList );

				$('#idg-wp-add-home-widgets-sections').on('click', function () {
					var li = '<li id="'+ $('#idg-wp-home-widgets-sections-selector').val() +'">'+ $('#idg-wp-home-widgets-sections-selector option:selected').text() +' <a href="#" class="dashicons dashicons-trash"></a></li>';
					$( '#idg-wp-home-widgets-sections-sortable' ).append( li );
					updateSectionList();
				});

				$sectionsList.find('li > a').on('click', function () {
					$(this).parent().hide();
					$(this).parent().remove();
					updateSectionList();
				});

				function updateSectionList() {
					sectionsVals = [];
					$.each( $sectionsList.find('li'), function () {
						sectionsVals.push( $(this).attr('id') );
					} );

					$sectionsSelected.val( sectionsVals.toString() );
					$sectionsSelected.trigger('change');
				}
			}
		},

		idgTextImageBoxWidgets: function () {

			var $idgText = $('.idg-text');
			tinymce.init({
				selector: '.idg-rich-text',
				menubar : false,
				height: '200',
				plugins : 'link',
				toolbar: 'undo, redo, bold, italic, alignleft, aligncenter, alignright, alignjustify, cut, link, copy, paste',
				setup: function (editor) {
					editor.on('init', function () {
						// originalEditor = editor.getElement();
					});
					editor.on('keyup', function (e) {
						// console.log( tinymce.get( $(this) ).getElement() );
						updateTextArea( editor.getElement(), editor.getContent() );
						tinyMCE.triggerSave();
					});
				}
			});

			function updateTextArea( editor, content ) {
				$(editor).closest('.idg-text-image-box-widget').find($idgText).html( content );
				$idgText.trigger('change');
			}
		}

	};
})(jQuery);
