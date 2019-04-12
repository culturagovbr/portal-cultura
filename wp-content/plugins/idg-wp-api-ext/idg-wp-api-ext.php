<?php
/*
Plugin Name: Rest Api Extension for IDG - WP
Plugin URI: https://github.com/Darciro/
Description: @TODO
Version: 1.0
Author: Ricardo Carvalho
Author URI: https://galdar.com.br
License: GNU GPLv3
*/

// If this file is called directly, abort.
if ( ! defined( 'WPINC' ) ) {
	die;
}

if ( ! class_exists( 'IdgWpApiExtension' ) ) :

	class IdgWpApiExtension {

		public function __construct() {
			add_action( 'rest_api_init', array( $this, 'register_rest_custom_route' ) );
		}

		public function register_rest_custom_route() {
			register_rest_route( 'idg-wp/v1', '/posts', array(
				'methods' => 'GET',
				'callback' => array( $this, 'get_posts' ),
			) );
		}

		public function get_posts ( WP_REST_Request $request ) {
			$args = array(
				'post_type' => 'post'
			);

			if( !empty( $request['s'] ) ){
				$args['s'] = $request['s'];
			}

			if( !empty( $request['category_name'] ) ){
				$args['category_name'] = $request['category_name'];
			}

			if( !empty( $request['posts_per_page'] ) ){
				$args['posts_per_page'] = $request['posts_per_page'];
			}

			if( !empty( $request['paged'] ) ){
				$args['paged'] = $request['paged'];
			}

			$the_query = new WP_Query( $args );
			$data = array();

			if ( $the_query->have_posts() ) :

				$i = 0;
				while ( $the_query->have_posts() ) : $the_query->the_post();

					$data[$i]['title'] = get_the_title();
					$data[$i]['excerpt'] = get_the_excerpt();
					$data[$i]['thumbnail'] = get_the_post_thumbnail_url( get_the_ID(), array(350,350) );
					$data[$i]['author'] = get_the_author();

					$tags_raw = get_the_tags();
					foreach($tags_raw as $tag_i => $tag) {
						$data[$i]['tags'][$tag_i]['name'] = $tag->name;
						$data[$i]['tags'][$tag_i]['slug'] = $tag->slug;
					}

					$i++;
				endwhile;

				return $data;
			else:
				return new WP_Error( 'no_posts', 'Nenhuma postagem encontrada', array( 'status' => 404 ) );
			endif;
		}

	}

	// Instantiate our plugin
	$idg_wp_api_extension = new IdgWpApiExtension();
endif;