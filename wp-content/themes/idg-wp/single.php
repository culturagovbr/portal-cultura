<?php
/**
 * The template for displaying all single posts
 *
 * @link https://developer.wordpress.org/themes/basics/template-hierarchy/#single-post
 *
 * @package Identidade_Digital_do_Governo_-_WordPress
 */

get_header();
?>

	<main id="main-single" class="site-main <?php echo is_singular('multimedia') ? 'multimedia-content' : ''; ?>">
		<div class="container">
			<div class="row">
				<?php the_breadcrumb(); ?>
			</div>

			<div class="row" id="content">
				<div class="col-12 pt-4 pb-4">
					<?php while (have_posts()) : the_post(); ?>

						<?php if( $post_subtitle = get_post_meta( $post->ID, '_post_subtitle', true ) ): ?>
							<span class="alternative-headline text-center d-block mb-3 text-uppercase"><?php echo $post_subtitle?></span>
						<?php endif; ?>

						<?php get_template_part('template-parts/content', get_post_type()); ?>

					<?php endwhile; ?>

					<div class="entry-content">
						<?php get_template_part('template-parts/copyright'); ?>
					</div>
				</div>
			</div>
		</div>

		<?php // if (comments_open() || get_comments_number()) : ?>
			<?php // comments_template( '', true ); ?>
		<?php // endif; ?>
	</main>

<?php
get_footer();
