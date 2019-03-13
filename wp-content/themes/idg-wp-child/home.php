<?php
/**
 * The main template file
 *
 * This is the most generic template file in a WordPress theme
 * and one of the two required files for a theme (the other being style.css).
 * It is used to display a page when nothing more specific matches a query.
 * E.g., it puts together the home page when no home.php file exists.
 *
 * @link https://developer.wordpress.org/themes/basics/template-hierarchy/
 *
 * @package Identidade_Digital_do_Governo_-_WordPress
 */

get_header();
?>

	<main id="main" class="site-main">

		<section class="carousel-wrapper">
			<?php
			if( idg_wp_get_option('_main_carousel_custom') ){
				if ( is_active_sidebar( idg_wp_get_option('_home_widgets_carousel_sidebar') ) ) :
					dynamic_sidebar( idg_wp_get_option('_home_widgets_carousel_sidebar') );
				endif;
			} else {
				get_template_part('template-parts/jumbotron-carousel');
			} ?>
		</section>

		<?php if ( !idg_wp_get_option('_home_widgets_sections_disable') ):  ?>

			<?php
			$idg_wp_widgets_areas = get_theme_mod( 'idg_wp_widgets_areas' );
			$sections = idg_wp_get_option('_home_widgets_sections');
			$sections = explode( ',', $sections );

			foreach ($sections as $section) : ?>
			<section id="<?php echo $section; ?>" class="<?php echo $idg_wp_widgets_areas['areas'][$section]['section_class']; ?> mt-5 mb-5 pt-4">
				<div class="container">
					<div class="row">

						<?php if( $idg_wp_widgets_areas['areas'][$section]['section_title'] ): ?>
						<div class="col-lg-12">
							<h2 class="section-title mb-5 text-center"><?php echo $idg_wp_widgets_areas['areas'][$section]['section_title']; ?></h2>
						</div>
						<?php endif; ?>

						<div class="overflow-wrapper">
							<?php
							if ( is_active_sidebar( $section ) ) :
								dynamic_sidebar( $section );
							endif;
							?>
						</div>
					</div>
				</div>
			</section>
			<?php endforeach; ?>

		<?php endif; ?>

		<section id="multimidia" class="mt-5">
			<div class="container">
				<div class="row">
					<?php get_template_part('template-parts/multimedia-block'); ?>

					<a href="<?php echo get_bloginfo('url'); ?>/multimedia" class="btn btn-ver-mais">Ver Mais Vídeos</a>
				</div>
			</div>
		</section>

	</main>

<?php
get_footer();