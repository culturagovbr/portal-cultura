<?php
/*
Plugin Name: Rest Api Extension for IDG - WP
Plugin URI: https://github.com/Darciro/
Description: @TODO
Version: 1.0
Author: Ricardo Carvalho
Author URI: https://github.com/darciro
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

			if( !empty( $request['offset'] ) ){
				$args['offset'] = $request['offset'];
			}

			if( !empty( $request['paged'] ) ){
				$args['paged'] = $request['paged'];
			}

			$the_query = new WP_Query( $args );
			$data = array();

			if ( $the_query->have_posts() ) :

				$i = 0;
				while ( $the_query->have_posts() ) : $the_query->the_post();

					$data['posts'][$i]['link'] = get_the_permalink();
					$data['posts'][$i]['title'] = get_the_title();
					$data['posts'][$i]['excerpt'] = get_the_excerpt();
					$data['posts'][$i]['thumbnail'] = get_the_post_thumbnail_url( get_the_ID(), array(350,350) );
					$data['posts'][$i]['author'] = get_the_author();
					$data['posts'][$i]['date'] = get_the_date();
					$data['posts'][$i]['modified_date'] = get_the_modified_date();

					$tags_raw = get_the_tags();
					foreach($tags_raw as $tag_i => $tag) {
						$data['posts'][$i]['tags'][$tag_i]['name'] = $tag->name;
						$data['posts'][$i]['tags'][$tag_i]['slug'] = $tag->slug;
					}

					$i++;
				endwhile;

				if( !empty( $request['post_count'] ) ){
					$data['post_count'] = $the_query->post_count;
				}

				if( !empty( $request['found_posts'] ) ){
					$data['found_posts'] = intval( $the_query->found_posts );
				}

				if( !empty( $request['max_num_pages'] ) ){
					$data['max_num_pages'] = $the_query->max_num_pages;
				}

				return $data;

			else:
				return new WP_Error( 'no_posts', 'Nenhuma postagem encontrada', array( 'status' => 404 ) );
			endif;
		}

	}

	// Instantiate our plugin
	$idg_wp_api_extension = new IdgWpApiExtension();
endif;