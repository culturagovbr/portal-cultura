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
			<div id="jumbotron-carousel">
				<div class="carousel-inner">
					<div class="carousel-item active">
						<img class="d-block w-100" src="<?php echo get_stylesheet_directory_uri() . '/assets/img/bg-estampa.png' ?>" alt="Second slide">
						<div class="carousel-caption d-md-block">
							<div class="container">
								<h2>Cadastre-se para obter a certificação como Ponto ou Pontão de Cultura</h2>
								<p>O Cultura Viva é uma política cultural voltada para o reconhecimento e apoio às atividades e processos culturais já desenvolvidos, estimulando a participação social, a colaboração e a gestão compartilhada de políticas públicas no campo da cultura.</p>
								<a href="#" class="btn text-uppercase mt-1">Entrar para a rede</a>
							</div>
						</div>
					</div>
				</div>
			</div>
		</section>

		<section id="news" class="pb-5 pt-5">
			<div class="container">
				<div class="row">
					<div class="overflow-wrapper">

						<?php
						$args = array(
							'posts_per_page' => 3,
							'category_name'  => 'destaques'
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
						<a href="<?php echo home_url( '/category/noticias/' ); ?>" class="btn text-uppercase mt-1">Mais
							notícias</a>
					</div>
				</div>
			</div>
		</section>

	</main>

<?php
get_footer();