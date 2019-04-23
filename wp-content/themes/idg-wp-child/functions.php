<?php
/*
 * Styles for our child theme
 *
 */
function my_theme_enqueue_styles() {
	wp_enqueue_style( 'child-style', get_stylesheet_directory_uri() . '/assets/css/main.css', '', wp_get_theme()->get('Version') );
}
add_action( 'wp_enqueue_scripts', 'my_theme_enqueue_styles' );

/*
 * Unregister some of the IDG main sidebars
 *
 */
function remove_some_widgets(){
	unregister_sidebar( 'main-menu-area' );
	unregister_sidebar( 'services-widgets-area' );
	unregister_sidebar( 'meet-the-ministry-widgets-area' );
	unregister_sidebar( 'content-widgets-area' );
	unregister_sidebar( 'social-participation-widgets-area' );
	unregister_sidebar( 'multimedia-widgets-area' );
}
add_action( 'widgets_init', 'remove_some_widgets', 11 );

// /**
//  * Redirect users to auth page when not logged
//  */
// function redirect_to() {
// 	if ( !is_user_logged_in() ) {
// 		wp_redirect( home_url( 'wp-login.php' ) );
// 		exit;
// 	}
// }

// add_action( 'template_redirect', 'redirect_to' );