<?php
/**
 * The header for our theme
 *
 * This is the template that displays all of the <head> section and everything up until <div id="content">
 *
 * @link https://developer.wordpress.org/themes/basics/template-files/#template-partials
 *
 * @package Identidade_Digital_do_Governo_-_WordPress
 */

?>
<!doctype html>
<html <?php language_attributes(); ?>>
<head>
	<meta charset="<?php bloginfo('charset'); ?>">
	<meta http-equiv="x-ua-compatible" content="ie=edge">
	<meta name="viewport" content="width=1250" content="initial-scale=0.1">
	<meta http-equiv="ScreenOrientation" content="autoRotate:disabled">


	<link rel="profile" href="https://gmpg.org/xfn/11">
	<link rel="apple-touch-icon" sizes="180x180"
	      href="<?php echo get_template_directory_uri(); ?>/assets/img/favicons/apple-touch-icon.png"/>
	<link rel="icon" type="image/png" sizes="32x32"
	      href="<?php echo get_template_directory_uri(); ?>/assets/img/favicons/favicon-32x32.png"/>
	<link rel="icon" type="image/png" sizes="16x16"
	      href="<?php echo get_template_directory_uri(); ?>/assets/img/favicons/favicon-16x16.png"/>
	<link rel="manifest" href="<?php echo get_template_directory_uri(); ?>/assets/manifest.json"/>

	<?php wp_head(); ?>
</head>

<body <?php body_class(); ?>>

<a class="skip-link sr-only" href="#main">
	<?php esc_html_e('Skip to content', 'idg-wp'); ?>
</a>

<header id="main-header" class="child-theme">
	<div id="barra-brasil"></div>

	<div class="container">
		<div class="row">
			<div class="col-md-6 col-lg-8 title-wrapper">
				<p class="site-denomination mb-0"><?php bloginfo('description'); ?></p>
				<h1 class="site-title mt-0 mb-0"><a href="<?php echo esc_url(home_url('/')); ?>"
				                                    rel="home"><?php bloginfo('name'); ?></a></h1>
			</div>
			<div class="col-md-6 col-lg-4 d-none d-md-block">
				<ul id="accessibility-bar" class="text-right">
					<li class="high-contrast">
						<a href="#" id="high-contrast-btn">Alto contraste</a>
					</li>
					<li class="vlibras">
						<a href="http://www.vlibras.gov.br/" target="_blank">VLibras</a>
					</li>
				</ul>
			</div>
		</div>

		<div class="row">
			<div class="col-sm-1 col-md-8 col-lg-9 menu-wrapper">
				<nav id="featured-links">
					<button id="menu-toggle" class="d-none">
						<span><?php esc_html_e('Primary Menu', 'idg-wp'); ?></span>
						<span></span>
						<span></span>
					</button>

					<?php
					$menu_args = array(
						'menu' => 'featured-links',
						'theme_location' => 'featured-links',
						'depth' => 1,
						'container' => '',
						'menu_class' => 'nav',
					);
					wp_nav_menu($menu_args); ?>
				</nav>
			</div>
			<div class="col-sm-11 col-md-4 col-lg-3 search-wrapper hide-mobile">
				<?php get_search_form(); ?>
			</div>
		</div>
		<div id="menu-wrapper" class="clearfix">
			<div class="menu-content container">

				<div class="menu-header hide-desktop">
					<button type="button" class="close-menu icon-close"></button>
					<h2 class="site-title"><a href="<?php echo esc_url(home_url('/')); ?>"
					                          rel="home"><?php bloginfo('name'); ?></a></h2>
					<div class="search-wrapper">
						<?php get_search_form(); ?>
					</div>
				</div>

				<div class="menu-body scrollTarget">
					<div class="row">
						<?php
						if (is_active_sidebar('main-menu-area')) :
							dynamic_sidebar('main-menu-area');
						endif;
						?>

						<div class="col social-media-col hide-mobile">
							<div class="menu-col border-0">
								<h3 class="menu-title">Redes Sociais</h3>

								<?php get_template_part('template-parts/social-medias'); ?>
							</div>
						</div>
					</div>
				</div>

				<div class="menu-footer hide-desktop">
					<?php get_template_part('template-parts/social-medias'); ?>
				</div>

			</div>
		</div>
	</div>
</header>
