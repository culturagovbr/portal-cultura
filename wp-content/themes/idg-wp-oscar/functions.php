<?php
/*
 * Styles for our child theme
 *
 */
function idg_child_enqueue_styles() {
	wp_enqueue_style( 'child-style', get_stylesheet_directory_uri() . '/assets/css/main.css', array('idg-wp-style'), wp_get_theme()->get('Version') );
}
add_action( 'wp_enqueue_scripts', 'idg_child_enqueue_styles' );

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

// customize admin bar css
function override_admin_bar_css() { 

   if ( is_admin_bar_showing() ) { ?>


      <style type="text/css">
         /* add your style here */
         #wpadminbar * {
/*            height: 50px;
            line-height: 50px;*/
            color: #F7E288 !important;
         }
      </style>

   <?php }

}

// on backend area
add_action( 'admin_head', 'override_admin_bar_css' );

// on frontend area
add_action( 'wp_head', 'override_admin_bar_css' );

show_admin_bar( false );