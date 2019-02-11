<?php
/**
 * Template part for displaying posts
 *
 * @link https://developer.wordpress.org/themes/basics/template-hierarchy/
 *
 * @package Identidade_Digital_do_Governo_-_WordPress
 */

?>

<article id="post-<?php the_ID(); ?>" <?php post_class(); ?>>

	<header class="entry-header">
		<?php the_title( '<h1 class="entry-title text-center mt-1">', '</h1>' ); ?>

		<?php if ( has_excerpt( $id ) ) : ?>
			<span class="subtitle-single text-center mb-4"><?php the_excerpt(); ?></span>
		<?php endif; ?>

		<div class="date-box mb-4">
			<span>publicado: <?php the_date('d/m/Y'); ?> <?php the_time('H'); ?>h<?php the_time('i'); ?>,<br/> última modificação: <?php the_modified_date('d/m/Y'); ?> <?php the_modified_time('H'); ?>h<?php the_modified_time('i'); ?></span>
		</div>
	</header>

	<div class="entry-content position-relative">
		<?php the_content() ?>
	</div>

	<footer class="entry-footer">
		<?php //idg_wp_entry_footer(); ?>
	</footer>

</article>
