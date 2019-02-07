<?php
/**
 * The template for displaying all pages
 *
 * This is the template that displays all pages by default.
 * Please note that this is the WordPress construct of pages
 * and that other 'pages' on your WordPress site may use a
 * different template.
 *
 * @link https://developer.wordpress.org/themes/basics/template-hierarchy/
 *
 * @package Identidade_Digital_do_Governo_-_WordPress
 */

get_header();
?>

	<main id="main-single" class="site-main">
		<div class="container">
			<?php the_breadcrumb (); ?>

			<div class="row">
				<div class="col-12">
					<?php
					while ( have_posts() ) :
						the_post();

						get_template_part( 'template-parts/content-page', 'page' );

						// If comments are open or we have at least one comment, load up the comment template.
						//if ( comments_open() || get_comments_number() ) :
					//		comments_template();
					//	endif;

					endwhile; // End of the loop.
					?>
				</div>

				<div class="entry-content">
					<?php get_template_part('template-parts/copyright'); ?>
				</div>
			</div>
		</div>
	</main>
<?php
get_footer();
