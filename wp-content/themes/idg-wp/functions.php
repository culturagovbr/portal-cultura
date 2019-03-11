<?php
/**
 * Identidade Digital do Governo - WordPress functions and definitions
 *
 * @link https://developer.wordpress.org/themes/basics/theme-functions/
 *
 * @package Identidade_Digital_do_Governo_-_WordPress
 */

if ( ! function_exists( 'idg_wp_setup' ) ) :
	/**
	 * Sets up theme defaults and registers support for various WordPress features.
	 *
	 * Note that this function is hooked into the after_setup_theme hook, which
	 * runs before the init hook. The init hook is too late for some features, such
	 * as indicating support for post thumbnails.
	 */
	function idg_wp_setup() {
		/*
		 * Make theme available for translation.
		 * Translations can be filed in the /languages/ directory.
		 * If you're building a theme based on Identidade Digital do Governo - WordPress, use a find and replace
		 * to change 'idg-wp' to the name of your theme in all the template files.
		 */
		load_theme_textdomain( 'idg-wp', get_template_directory() . '/languages' );

		// Add default posts and comments RSS feed links to head.
		add_theme_support( 'automatic-feed-links' );

		/*
		 * Let WordPress manage the document title.
		 * By adding theme support, we declare that this theme does not use a
		 * hard-coded <title> tag in the document head, and expect WordPress to
		 * provide it for us.
		 */
		add_theme_support( 'title-tag' );

		/*
		 * Enable support for Post Thumbnails on posts and pages.
		 *
		 * @link https://developer.wordpress.org/themes/functionality/featured-images-post-thumbnails/
		 */
		add_theme_support( 'post-thumbnails' );
		add_image_size('carousel-feature', 1920, 1080, true);
		add_image_size('highlight-box', 350, 350, true);
		add_image_size('multimedia-feature', 1080, 500, true);

		// This theme uses wp_nav_menu() in one location.
		register_nav_menus( array(
			'featured-links' => esc_html__( 'Featured links', 'idg-wp' ),
			// 'page-info-menu' => esc_html__( 'Page info support menu', 'idg-wp' ),
		) );

		/*
		 * Switch default core markup for search form, comment form, and comments
		 * to output valid HTML5.
		 */
		add_theme_support( 'html5', array(
			'search-form',
			'comment-form',
			'comment-list',
			'gallery',
			'caption',
		) );

		// Set up the WordPress core custom background feature.
		/*add_theme_support( 'custom-background', apply_filters( 'idg_wp_custom_background_args', array(
			'default-color' => 'ffffff',
			'default-image' => '',
		) ) );*/

		// Add theme support for selective refresh for widgets.
		add_theme_support( 'customize-selective-refresh-widgets' );

		/**
		 * Add support for core custom logo.
		 *
		 * @link https://codex.wordpress.org/Theme_Logo
		 */
		/*add_theme_support( 'custom-logo', array(
			'height'      => 250,
			'width'       => 250,
			'flex-width'  => true,
			'flex-height' => true,
		) );*/
	}
endif;
add_action( 'after_setup_theme', 'idg_wp_setup' );

/**
 * Check if is defined an app environment variables
 *
 * @return array|false|string
 */
function idg_wp_app_env() {
	return getenv('APPLICATION_ENV');
}

/**
 * Enqueue scripts and styles.
 */
function idg_wp_scripts() {
	if( idg_wp_app_env() === 'development' ){
		wp_enqueue_style( 'idg-wp-style', get_template_directory_uri() . '/assets/stylesheets/dist/bundle.css', false, '1.0' );
	} else {
		wp_enqueue_style( 'idg-wp-style', get_template_directory_uri() . '/assets/stylesheets/dist/bundle.min.css', false, '1.0'  );
	}

	if( idg_wp_app_env() === 'development' ){
		wp_enqueue_script( 'idg-wp-scripts', get_template_directory_uri() . '/assets/js/dist/bundle.js', array('jquery'), '1.0', true );
	} else {
		wp_enqueue_script( 'idg-wp-scripts', get_template_directory_uri() . '/assets/js/dist/bundle.min.js', array('jquery'), '1.0', true );
	}
	wp_enqueue_script( 'barra-brasil-script', 'http://barra.brasil.gov.br/barra_2.0.js', false, false, true );

	if ( is_singular() && comments_open() && get_option( 'thread_comments' ) ) {
		wp_enqueue_script( 'comment-reply' );
	}
}
add_action( 'wp_enqueue_scripts', 'idg_wp_scripts' );

/**
 * Enqueue admin scripts and styles.
 */
function idg_wp_admin_scripts() {
	wp_enqueue_style( 'idg-wp-admin-style', get_template_directory_uri() . '/assets/stylesheets/dist/admin.min.css' );
	wp_enqueue_script( 'idg-wp-admin-scripts', get_template_directory_uri() . '/assets/js/dist/admin.min.js', array('jquery'), false, true );
	wp_localize_script( 'idg-wp-admin-scripts', 'idg_admin', array(
		'ajaxurl'       => admin_url( 'admin-ajax.php' )
	) );
}
add_action( 'admin_enqueue_scripts', 'idg_wp_admin_scripts' );

/**
 * Custom excerpt
 */
function idg_excerpt( $limit = 190 ) {
	$excerpt = explode(' ', get_the_excerpt(), $limit);

	if (count($excerpt) >= $limit) {
		array_pop($excerpt);
		$excerpt = implode(" ", $excerpt) . '...';
	} else {
		$excerpt = implode(" ", $excerpt);
	}

	$excerpt = preg_replace('`\[[^\]]*\]`', '', $excerpt);

	return $excerpt;
}

/**
 * Load widgets areas
 */
require get_template_directory() . '/inc/widgets-areas.php';

/**
 * Load custom widgets
 */
require get_template_directory() . '/inc/idg-widgets.php';

/**
 * Implement the Custom Header feature.
 */
require get_template_directory() . '/inc/custom-header.php';

/**
 * Custom template tags for this theme.
 */
require get_template_directory() . '/inc/template-tags.php';

/**
 * Functions which enhance the theme by hooking into WordPress.
 */
require get_template_directory() . '/inc/template-functions.php';

/**
 * Customizer additions.
 */
require get_template_directory() . '/inc/customizer.php';

/**
 * Load Jetpack compatibility file.
 */
if ( defined( 'JETPACK__VERSION' ) ) {
	require get_template_directory() . '/inc/jetpack.php';
}

/**
 * Breadcrumb functionality
 */
require get_template_directory() . '/inc/breadcrumb.php';

/**
 * Includes a bootstrap like pagination
 */
require get_template_directory() . '/inc/bootstrap-pagination.php';

/**
 * Custom post types
 */
require get_template_directory() . '/inc/cpt-multimedia.php';

/**
 * Add some shortcode functionalities
 */
require get_template_directory() . '/inc/shortcodes.php';

/**
 * Disable comments
 *
 */
require get_template_directory() . '/inc/disable-comments.php';

/**
 * Add some share buttons
 */
require get_template_directory() . '/inc/share.php';

/**
 * Custom callback for outputting comments
 *
 * @return void
 * @author Keir Whitaker
 */
function bootstrap_comment( $comment, $args, $depth ) {
	$GLOBALS['comment'] = $comment;
	?>
	<?php if ( $comment->comment_approved == '1' ): ?>

		<li class="comment" id="comment-<?php comment_ID() ?>">
			<div class="thumbnail">
				<?php echo get_avatar( $comment ); ?>
			</div>

			<div class="text-wrapper">
				<div class="panel-heading">
					<strong class="media-heading"><?php comment_author_link() ?></strong> <time class="text-muted"><a href="#comment-<?php comment_ID() ?>" pubdate><?php comment_date() ?> at <?php comment_time() ?></a></time>
				</div>
				<div class="panel-body">
					<?php comment_text() ?>
				</div>
			</div>
		</li>
	<?php endif;
}

/**
 * The "body_class" filter is used to filter the classes that are assigned to the body HTML element on the current page.
 *
 * @param $classes
 * @return array
 */
function multisite_body_classes($classes) {
	$high_contrast_cookie = $_COOKIE['high-contrast'] === 'on' ? 'high-contrast' : '';
	$classes[] = $high_contrast_cookie;

	return $classes;
}
add_filter('body_class', 'multisite_body_classes');


/**
 * Add custom roles to the site
 *
 */
function idg_add_custom_roles(){
	$roles_set = get_option('idg_roles_set');
	if(!$roles_set){
		remove_role('agenda_manager');
		add_role('agenda_manager', 'Agenda Manager',
			array(
				'read' => true,
				'create_posts' => true,
				'edit_posts' => true,
				'edit_published_posts' => true,
				'delete_posts' => true,
				'delete_published_posts' => true,
				'publish_posts' => true,
				// 'upload_files' => true
			)
		);
		update_option('idg_roles_set',true);
	}
}
add_action('after_setup_theme','idg_add_custom_roles');

function the_dramatist_set_capabilities() {
	$role = get_role( 'agenda_manager' );
	$role->remove_cap( 'edit_others_posts' );
	$role->remove_cap( 'delete_others_posts' );
}
add_action( 'admin_init', 'the_dramatist_set_capabilities', 0 );

/**
 * Remove administrative menus for specific roles
 *                                           *
 */
function remove_menus()
{
	$restricted_roles = array('agenda_manager');
	$user = wp_get_current_user();

	if ( in_array($user->roles[0], $restricted_roles) ) {
		remove_menu_page('tools.php');
		remove_menu_page('edit-comments.php');
		remove_menu_page('edit.php');
		remove_menu_page('edit.php?post_type=multimedia');
		remove_menu_page('edit.php?post_type=documentos');
		remove_menu_page('wpcf7');
		//remove_submenu_page('themes.php', 'widgets.php');
	}
}
add_action('admin_init', 'remove_menus', 999);

/**
 * Getting rid of archive “label”
 *
 * @param $title
 * @return string|void
 */
function remove_label_from_archive_title ($title) {
	if ( is_category() ) {
		$title = single_cat_title( '', false );
	} elseif ( is_tag() ) {
		$title = single_tag_title( '', false );
	} elseif ( is_author() ) {
		$title = '<span class="vcard">' . get_the_author() . '</span>';
	} elseif ( is_post_type_archive() ) {
		$title = post_type_archive_title( '', false );
	} elseif ( is_tax() ) {
		$title = single_term_title( '', false );
	}

	return $title;
}
add_filter( 'get_the_archive_title', 'remove_label_from_archive_title' );


function get_first_post_image() {
	global $post, $posts;
	$first_img = '';
	ob_start();
	ob_end_clean();
	$output = preg_match_all('/<img.+src=[\'"]([^\'"]+)[\'"].*>/i', $post->post_content, $matches);
	$first_img = $matches[1][0];

	if(empty($first_img)) {
		$first_img = "/path/to/default.png";
	}
	return $first_img;
}

function embeded_youtube_video_id($url) {
	global $posts;
	//preg_match('|http://www.youtube.com/watch?v=([a-zA-Z0-9]+)|', $posts->post_content, $matches);
	// preg_match('http://w?w?w?.?youtube.com/watch\?v=([A-Za-z0-9\-_]+)#s', $post_content, $matches);

	if (preg_match('%(?:youtube(?:-nocookie)?\.com/(?:[^/]+/.+/|(?:v|e(?:mbed)?)/|.*[?&]v=)|youtu\.be/)([^"&?/ ]{11})%i', $url, $match)) {
		$video_id = $match[1];
	} else {
		$video_id = false;
	}

	return $video_id;

	if (!empty($matches[1])) {

		$post_content = '<object width="415" height="250">';
		$post_content .= '<param name="movie" value="http://www.youtube.com/v/' . $matches[1] . '&hl=en_US&fs=1&"></param>';
		$post_content .= '<param name="allowFullScreen" value="true"></param>';
		$post_content .= '<param name="allowscriptaccess" value="always"></param>';
		$post_content .= '<embed src="http://www.youtube.com/v/' . $matches[1] . '&hl=en_US&fs=1&" type="application/x-shockwave-flash" allowscriptaccess="always" allowfullscreen="true" width="415" height="250"></embed>';
		$post_content .= '</object>';
		$post_content = $post_content;

	}
	return $post_content;
}

/**
 * Hiding the update notification for non admin users
 *
 */
function hide_update_notice_to_all_but_admin_users()
{
	if (!current_user_can('update_core')) {
		remove_action( 'admin_notices', 'update_nag', 3 );
	}
}
add_action( 'admin_head', 'hide_update_notice_to_all_but_admin_users', 1 );

/**
 * Remove WP Canonical URL Admin
 *
 */
function remove_wp_admin_canonical_url() {
	remove_action( 'admin_head', 'wp_admin_canonical_url' );
}
add_action('init', 'remove_wp_admin_canonical_url', 0);

/**
 * Add template for subcategories of 'Escritórios Regionais'
 *
 */

function escritoriosRegionaisTemplate() {
	if (is_category() && !is_feed()) {
		$catId = get_category_by_slug('escritorios-regionais')->term_id;

		if ( cat_is_ancestor_of($catId, get_query_var('cat'))) {
			load_template(TEMPLATEPATH . '/subcategory-escritorios-regionais.php');
			exit;
		}
	}
}

add_action('template_redirect', 'escritoriosRegionaisTemplate');
remove_filter( 'pre_term_description', 'wp_filter_kses' );

function idg_wp_get_option ( $option ) {
	$theme_key = strtolower(get_stylesheet());
	$option_key = $theme_key . '_theme_options';
	return get_option($option_key . $option);
}
