<?php
/**
 * Register widgets area.
 *
 * @link https://developer.wordpress.org/themes/functionality/sidebars/#registering-a-sidebar
 */
function idg_wp_widgets_init() {
	register_sidebar( array(
		'name'          => esc_html__( 'Main menu area', 'idg-wp' ),
		'id'            => 'main-menu-area',
		'description'   => esc_html__( 'Add widgets here.', 'idg-wp' ),
		'before_widget' => '<div id="%1$s" class="col %2$s"><div class="menu-col">',
		'after_widget'  => '</div></div>',
		'before_title'  => '<h3 class="menu-title">',
		'after_title'   => '</h3>',
	) );

	register_sidebar( array(
		'name' => esc_html__( 'Footer Area', 'idg-wp' ),
		'id' => 'footer-widgets-area',
		'description'   => esc_html__( 'Add widgets here.', 'idg-wp' ),
		'before_widget' => '<div id="%1$s" class="col %2$s"><div class="menu-col">',
		'after_widget'  => '</div></div>',
		'before_title'  => '<h4 class="section-title">',
		'after_title'   => '</h4>',
	) );

	register_sidebar( array(
		'name' => esc_html__( 'Services Section', 'idg-wp' ),
		'id' => 'services-widgets-area',
		'description'   => esc_html__( 'Add widgets here.', 'idg-wp' ),
		'before_widget' => '<div id="%1$s" class="col-sm-12 col-md-6 col-lg-3 mb-4 %2$s"><div class="menu-col">',
		'after_widget'  => '</div></div>',
		'before_title'  => '<h4 class="section-title">',
		'after_title'   => '</h4>',
	) );

	register_sidebar( array(
		'name' => esc_html__( 'Meet the Ministry Section', 'idg-wp' ),
		'id' => 'meet-the-ministry-widgets-area',
		'description'   => esc_html__( 'Add widgets here.', 'idg-wp' ),
		'before_widget' => '<div id="%1$s" class="col-sm-12 col-md-6 col-lg-3 mb-4 %2$s"><div class="menu-col">',
		'after_widget'  => '</div></div>',
		'before_title'  => '<h4 class="section-title">',
		'after_title'   => '</h4>',
	) );

	register_sidebar( array(
		'name' => esc_html__( 'Content Section', 'idg-wp' ),
		'id' => 'content-widgets-area',
		'description'   => esc_html__( 'Add widgets here.', 'idg-wp' ),
		'before_widget' => '<div id="%1$s" class="col-sm-12 col-md-6 col-lg-3 mb-4 %2$s"><div class="menu-col">',
		'after_widget'  => '</div></div>',
		'before_title'  => '<h4 class="section-title">',
		'after_title'   => '</h4>',
	) );

	register_sidebar( array(
		'name' => esc_html__( 'Social Participation Section', 'idg-wp' ),
		'id' => 'social-participation-widgets-area',
		'description'   => esc_html__( 'Add widgets here.', 'idg-wp' ),
		'before_widget' => '<div id="%1$s" class="col-sm-12 col-md-6 col-lg-3 mb-4 %2$s"><div class="menu-col">',
		'after_widget'  => '</div></div>',
		'before_title'  => '<h4 class="section-title">',
		'after_title'   => '</h4>',
	) );

	register_sidebar( array(
		'name' => esc_html__( 'Multimedia Section', 'idg-wp' ),
		'id' => 'multimedia-widgets-area',
		'description'   => esc_html__( 'Add widgets here.', 'idg-wp' ),
		'before_widget' => '<div id="%1$s" class="container %2$s">',
		'after_widget'  => '</div>',
		'before_title'  => '<h4 class="section-title text-center">',
		'after_title'   => '</h4>',
	) );

	$idg_wp_widgets_areas = get_theme_mod( 'idg_wp_widgets_areas' );

	if( !empty($idg_wp_widgets_areas) ){

		if ( $idg_wp_widgets_areas['areas'] ) {
			foreach ( $idg_wp_widgets_areas['areas'] as $id => $area ) {

				$classes = empty( $idg_wp_widgets_areas['areas'][$id]['section_before_widget_class'] ) ? 'container' : $idg_wp_widgets_areas['areas'][$id]['section_before_widget_class'];

				register_sidebar( array(
					'name' => sanitize_text_field( $area['name'] ),
					'id' => sanitize_text_field( $id ),
					'description'   => sanitize_text_field( $area['desc'] ),
					'before_widget' => '<div id="%1$s" class="%2$s '. $classes .'">',
					'after_widget'  => '</div>',
					'before_title'  => '<h4 class="section-title text-center">',
					'after_title'   => '</h4>',
				) );
			}
		}

	}


}
add_action( 'widgets_init', 'idg_wp_widgets_init', 999 );

function idg_wp_widgets_scripts ( $hook ) {
	if ( $hook === 'widgets.php' ) {
		wp_localize_script( 'idg-wp-admin-scripts', 'idg_admin', array(
			'ajaxurl'       => admin_url( 'admin-ajax.php' ),
			'idg_custom_sections_form'   => sprintf( '<form id="idg-custom-sections" method="post" action="'. admin_url('/widgets.php') .'"><div class="widgets-holder-wrap"><h2 class="sidebar-name">%1$s</h2><p class="description">%2$s</p><input type="text" class="widefat" name="idg-section-name" placeholder="%3$s"><input type="text" class="widefat" name="idg-section-desc" placeholder="%4$s"><div class="widget-control-actions"><div class="alignright">'. wp_nonce_field( 'idg_wp_admin_widgets_nonce', 'idg_wp_admin_widgets_nonce' ) .'<input type="submit" name="idg-create-section" class="button button-primary right" value="%5$s"></div></div></div></form>',
				esc_html__( 'Custom sections', 'idg-wp' ),
				esc_html__( 'Add widgets areas to the home page.', 'idg-wp' ),
				esc_html__( 'Section title', 'idg-wp' ),
				esc_html__( 'Section description', 'idg-wp' ),
				esc_html__( 'Create section', 'idg-wp' )
			),
		) );

		if ( isset( $_POST['idg-create-section'] ) ) :
			if ( ! isset( $_POST['idg_wp_admin_widgets_nonce'] ) || ! wp_verify_nonce( $_POST['idg_wp_admin_widgets_nonce'], 'idg_wp_admin_widgets_nonce' ) ){
				die( 'Invalid nonce' );
			} else {
				idg_wp_widgets_register_section();
			}
		endif;

	}
}
add_action( 'admin_enqueue_scripts', 'idg_wp_widgets_scripts', 10, 1 );

function idg_wp_widgets_register_section() {

	if ( ! current_user_can( 'manage_options' ) ) {
		return;
	}

	$idg_wp_widgets_areas = get_theme_mod( 'idg_wp_widgets_areas' );
	$areas_index = $idg_wp_widgets_areas ? intval( $idg_wp_widgets_areas['areas_index'] ) + 1 : 1;

	if( $idg_wp_widgets_areas == '' )
		$idg_wp_widgets_areas = [];

	$idg_wp_widgets_areas['areas']['idg_wp_widget_area_' . $areas_index]['name'] = sanitize_text_field( $_POST['idg-section-name'] );
	$idg_wp_widgets_areas['areas']['idg_wp_widget_area_' . $areas_index]['desc'] = sanitize_text_field( $_POST['idg-section-desc'] );;
	$idg_wp_widgets_areas['areas_index'] = $areas_index;

	set_theme_mod( 'idg_wp_widgets_areas', $idg_wp_widgets_areas );
}

function idg_wp_widgets_admin_notice_error() {

	if ( isset( $_POST['idg-create-section'] ) ) :
		if( empty( $_POST['idg-section-name'] ) ){
			$class = 'notice notice-error';
			$message = __( 'An error has occurred while creating your custom section.', 'idg-wp' );

			printf( '<div class="%1$s"><p>%2$s</p></div>', esc_attr( $class ), esc_html( $message ) );
		}
	endif;

}
add_action( 'admin_notices', 'idg_wp_widgets_admin_notice_error' );

function idg_wp_remove_widget_area(){
	/*if ( ! wp_verify_nonce( $_POST['et_admin_load_nonce'], 'et_admin_load_nonce' ) ) {
		die( -1 );
	}*/

	if ( ! current_user_can( 'manage_options' ) ) {
		wp_send_json_error();
	}

	$idg_wp_widgets_areas = get_theme_mod( 'idg_wp_widgets_areas' );
	$idg_wp_widgets_area_id = sanitize_text_field( $_POST['idg_wp_widgets_area_id'] );
	unset( $idg_wp_widgets_areas['areas'][ $idg_wp_widgets_area_id ] );

	set_theme_mod( 'idg_wp_widgets_areas', $idg_wp_widgets_areas );
	wp_send_json_success();
}
add_action( 'wp_ajax_idg_wp_remove_widget_area', 'idg_wp_remove_widget_area' );


function idg_wp_update_custom_data_in_widget_area(){

	if ( ! current_user_can( 'manage_options' ) ) {
		wp_send_json_error();
	}

	$idg_wp_widgets_areas = get_theme_mod( 'idg_wp_widgets_areas' );
	$idg_wp_widgets_area_id = sanitize_text_field( $_POST['idg_wp_widgets_area_id'] );

	$idg_wp_widgets_areas['areas'][ $idg_wp_widgets_area_id ]['section_title'] = $_POST['section_area_title'];
	$idg_wp_widgets_areas['areas'][ $idg_wp_widgets_area_id ]['section_class'] = $_POST['section_area_classes'];
	$idg_wp_widgets_areas['areas'][ $idg_wp_widgets_area_id ]['section_before_widget_class'] = $_POST['section_before_widget_class'];

	set_theme_mod( 'idg_wp_widgets_areas', $idg_wp_widgets_areas );

	wp_send_json_success();
}
add_action( 'wp_ajax_idg_wp_update_custom_data_in_widget_area', 'idg_wp_update_custom_data_in_widget_area' );

function idg_wp_get_custom_data_in_widget_area(){

	if ( ! current_user_can( 'manage_options' ) ) {
		wp_send_json_error();
	}

	$idg_wp_widgets_areas = get_theme_mod( 'idg_wp_widgets_areas' );
	$idg_wp_widgets_area_id = sanitize_text_field( $_POST['idg_wp_widgets_area_id'] );

	wp_send_json_success( $idg_wp_widgets_areas['areas'][ $idg_wp_widgets_area_id ] );
}
add_action( 'wp_ajax_idg_wp_get_custom_data_in_widget_area', 'idg_wp_get_custom_data_in_widget_area' );
