<?php /* Template Name: Imprensa */ ?>

<?php get_header(); ?>

<main id="page-imprensa" class="site-main">
	<div class="container">
		<div class="row">
			<?php the_breadcrumb(); ?>
		</div>

		<?php wp_reset_postdata(); ?>

	</div>

	<div id="content">
		<div class="container">
			<header class="entry-header">
				<h1 class="entry-title text-center"><?php the_title(); ?></h1>
			</header>
		</div>
	</div>

	<div id="contact">
		<div class="container">
			<div class="row">
				<div class="col text-wrapper">
					<?php the_content(); ?>
				</div>

				<div class="col form-wrapper">
					<?php echo do_shortcode('[contact-form-7 id="47" title="Contato"]'); ?>
				</div>
			</div>
		</div>
	</div>
</main>

<?php get_footer(); ?>


