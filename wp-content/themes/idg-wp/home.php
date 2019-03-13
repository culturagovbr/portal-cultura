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
			<?php get_template_part('template-parts/jumbotron-carousel'); ?>
		</section>

		<section id="news" class="pb-5 pt-5 bg-grey-2">
			<div class="container">
				<div class="row">
					<div class="overflow-wrapper">

						<?php
						$args = array(
							'posts_per_page' => 1,
							'category_name'  => 'destaquinho-1'
						);

						$news_query = new WP_Query( $args ); ?>

						<?php if ( $news_query->have_posts() ) : ?>

							<?php while ( $news_query->have_posts() ) : $news_query->the_post(); ?>

							
								<div class="col-lg-4 mb-5">
									<?php
									if ( has_post_thumbnail() ) {
										$post_thumb = get_the_post_thumbnail_url(get_the_ID(), 'highlight-box');
									} else {
										$post_thumb = get_template_directory_uri() . '/assets/img/fake-img.jpg';
									}
									?>
									<div class="highlight-box" style="background-image: url('<?php echo $post_thumb; ?>')">
										<div class="box-body">
											<?php if( $post_subtitle = get_post_meta( $post->ID, '_post_subtitle', true ) ): ?>
												<span class="cat"><?php echo $post_subtitle?></span>
											<?php endif; ?>
											<h3 class="box-title">
												<a href="<?php the_permalink(); ?>"><?php the_title(); ?></a>
											</h3>
										</div>
									</div>
								</div>
							<?php endwhile; ?>

							<?php wp_reset_postdata(); ?>

						<?php endif; ?>

						<?php
						$args = array(
							'posts_per_page' => 1,
							'category_name'  => 'destaquinho-2'
						);
						$news_query = new WP_Query( $args ); ?>

						<?php if ( $news_query->have_posts() ) : ?>

							<?php while ( $news_query->have_posts() ) : $news_query->the_post(); ?>
								<div class="col-lg-4 mb-5">
									<?php
									if ( has_post_thumbnail() ) {
										$post_thumb = get_the_post_thumbnail_url(get_the_ID(), 'highlight-box');
									} else {
										$post_thumb = get_template_directory_uri() . '/assets/img/fake-img.jpg';
									}
									?>
									<div class="highlight-box" style="background-image: url('<?php echo $post_thumb; ?>')">
										<div class="box-body">
											<?php if( $post_subtitle = get_post_meta( $post->ID, '_post_subtitle', true ) ): ?>
												<span class="cat"><?php echo $post_subtitle?></span>
											<?php endif; ?>
											<h3 class="box-title">
												<a href="<?php the_permalink(); ?>"><?php the_title(); ?></a>
											</h3>
										</div>
									</div>
								</div>
							<?php endwhile; ?>

							<?php wp_reset_postdata(); ?>

						<?php endif; ?>

						<?php
						$args = array(
							'posts_per_page' => 1,
							'category_name'  => 'destaquinho-3'
						);
						$news_query = new WP_Query( $args ); ?>

						<?php if ( $news_query->have_posts() ) : ?>

							<?php while ( $news_query->have_posts() ) : $news_query->the_post(); ?>
								<div class="col-lg-4 mb-5">
									<?php
									if ( has_post_thumbnail() ) {
										$post_thumb = get_the_post_thumbnail_url(get_the_ID(), 'highlight-box');
									} else {
										$post_thumb = get_template_directory_uri() . '/assets/img/fake-img.jpg';
									}
									?>
									<div class="highlight-box" style="background-image: url('<?php echo $post_thumb; ?>')">
										<div class="box-body">
											<?php if( $post_subtitle = get_post_meta( $post->ID, '_post_subtitle', true ) ): ?>
												<span class="cat"><?php echo $post_subtitle?></span>
											<?php endif; ?>
											<h3 class="box-title">
												<a href="<?php the_permalink(); ?>"><?php the_title(); ?></a>
											</h3>
										</div>
									</div>
								</div>
							<?php endwhile; ?>

							<?php wp_reset_postdata(); ?>

						<?php endif; ?>
					</div>

					<div class="col-lg-12 text-center">
						<a href="<?php echo home_url( '/categoria/noticias/' ); ?>" class="btn text-uppercase mt-1">Mais
							notícias</a>
					</div>
				</div>
			</div>
		</section>

		<section id="services" class="mt-5 mb-5 pt-4">
			<div class="container">
				<div class="row">
					<div class="overflow-wrapper">
						<?php
						if ( is_active_sidebar( 'services-widgets-area' ) ) :
							dynamic_sidebar( 'services-widgets-area' );
						endif;
						?>
					</div>
				</div>
			</div>
		</section>

		<section id="agenda" class="pt-5 pb-5 mb-5">
			<div class="container">
				<div class="row">
					<div class="col-lg-12">
						<?php echo do_shortcode( '[gs-agenda event-cats="agenda-cultural, agenda-do-ministro, agenda-de-cursos" cat-active="agenda-do-ministro"]' ); ?>
					</div>
				</div>
			</div>
		</section>

		<section id="secretarias" class="pt-5 pb-5 mb-5">
			<div class="container">
				<div class="row">
					<div class="col-lg-12">
						<h2 class="section-title mb-5 text-center">Conheça a Secretaria</h2>
					</div>

					<div class="overflow-wrapper">
						<?php
						if ( is_active_sidebar( 'meet-the-ministry-widgets-area' ) ) :
							dynamic_sidebar( 'meet-the-ministry-widgets-area' );
						endif;
						?>
					</div>
				</div>
			</div>
		</section>

		<section id="section-content" class="pt-5 pb-5">
			<div class="container">
				<div class="row">
					<div class="overflow-wrapper">
						<?php
						if ( is_active_sidebar( 'content-widgets-area' ) ) :
							dynamic_sidebar( 'content-widgets-area' );
						endif;
						?>
					</div>
				</div>
			</div>
		</section>

		<section id="participacao-social" class="mt-5 mb-5">
			<div class="container">
				<div class="row">
					<div class="col-lg-12">
						<h2 class="section-title mb-5 text-center">Participação Social</h2>
					</div>

					<div class="overflow-wrapper">
						<?php
						if ( is_active_sidebar( 'social-participation-widgets-area' ) ) :
							dynamic_sidebar( 'social-participation-widgets-area' );
						endif;
						?>
					</div>
				</div>
			</div>
		</section>

		<section id="multimidia" class="mt-5">
			<div class="container">
				<div class="row">
					<?php get_template_part('template-parts/multimedia-block'); ?>
				</div>
			</div>
		</section>

	</main>

<?php
get_footer();