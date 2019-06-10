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
			if (idg_wp_get_option('_main_carousel_custom')) {
				if (is_active_sidebar(idg_wp_get_option('_home_widgets_carousel_sidebar'))) :
					dynamic_sidebar(idg_wp_get_option('_home_widgets_carousel_sidebar'));
				endif;
			} else {
				get_template_part('template-parts/jumbotron-carousel');
			} ?>
		</section>

		<!--<?php if (!idg_wp_get_option('_home_widgets_sections_disable')): ?>

			<?php
			$idg_wp_widgets_areas = get_theme_mod('idg_wp_widgets_areas');
			$sections = idg_wp_get_option('_home_widgets_sections');
			$sections = explode(',', $sections);

			foreach ($sections as $section) : ?>
				<section id="<?php echo $section; ?>"
				         class="<?php echo empty($idg_wp_widgets_areas['areas'][$section]['section_class']) ? 'mt-5 mb-5 pt-4' : $idg_wp_widgets_areas['areas'][$section]['section_class']; ?>">
					<div class="container">
						<div class="row">

							<?php if ($idg_wp_widgets_areas['areas'][$section]['section_title']): ?>
								<div class="col-lg-12">
									<h2 class="section-title mb-5 text-center"><?php echo $idg_wp_widgets_areas['areas'][$section]['section_title']; ?></h2>
								</div>
							<?php endif; ?>

							<div class="overflow-wrapper">
								<?php
								if (is_active_sidebar($section)) :
									dynamic_sidebar($section);
								endif;
								?>
							</div>
						</div>
					</div>
				</section>
			<?php endforeach; ?>-->

		<?php endif; ?>

		<section id="steps" class="pt-5 mb-0">
			<div class="container">
				<div class="row">
					<div class="col-lg-12">
						<h2 class="section-title mb-5 text-center">Cronograma</h2>
					</div>
					<div class="col-12">
						<ul class="steps">
							<?php
							$now = new DateTime();
							$oscar_minc_options = get_option('oscar_minc_options');
							$oscar_minc_schedule_time_1 = new DateTime( $oscar_minc_options['oscar_minc_schedule_time_1'] );
							$oscar_minc_deadline_time = new DateTime( $oscar_minc_options['oscar_minc_deadline_time'] );
							$oscar_minc_schedule_text_1 = $oscar_minc_options['oscar_minc_schedule_text_1'];
							$oscar_minc_schedule_time_2 = new DateTime( $oscar_minc_options['oscar_minc_schedule_time_2'] );
							$oscar_minc_schedule_text_2 = $oscar_minc_options['oscar_minc_schedule_text_2'];
							$oscar_minc_schedule_time_3 = new DateTime( $oscar_minc_options['oscar_minc_schedule_time_3'] );
							$oscar_minc_schedule_text_3 = $oscar_minc_options['oscar_minc_schedule_text_3'];
							$current_step = false;
							?>

							<?php
							if( $now > new DateTime( $oscar_minc_options['oscar_minc_schedule_time_1'] ) && $now < new DateTime( $oscar_minc_options['oscar_minc_schedule_time_2'] ) ) {
								$current_step = 1;
							}
							?>
							<li class="steps-segment <?php echo ( $current_step == 1 ) ? 'step-active' : ''; echo ( $now > new DateTime( $oscar_minc_options['oscar_minc_schedule_time_1'] ) ) ? ' set-active' : ''; ?>">
								<span class="steps-marker"></span>
								<div class="steps-content">
									<div class="box">
										<p><b><?php echo $oscar_minc_schedule_time_1->format('d/m/Y'); ?> a <?php echo $oscar_minc_deadline_time->format('d/m/Y'); ?></b></p>
										<p><?php echo $oscar_minc_schedule_text_1; ?></p>
									</div>
								</div>
							</li>

							<?php
							if( $now > new DateTime( $oscar_minc_options['oscar_minc_schedule_time_2'] ) && $now < new DateTime( $oscar_minc_options['oscar_minc_schedule_time_3'] ) ) {
								$current_step = 2;
							}
							?>
							<li class="steps-segment <?php echo ( $current_step == 2 ) ? 'step-active' : ''; echo ( $now > new DateTime( $oscar_minc_options['oscar_minc_schedule_time_2'] ) ) ? ' set-active' : ''; ?>">
								<span class="steps-marker"></span>
								<div class="steps-content">
									<div class="box">
										<p><b><?php echo $oscar_minc_schedule_time_2->format('d/m/Y'); ?></b></p>
										<p><?php echo $oscar_minc_schedule_text_2; ?></p>
									</div>
								</div>
							</li>

							<?php
							if( $now > new DateTime( $oscar_minc_options['oscar_minc_schedule_time_3'] ) ) {
								$current_step = 3;
							}
							?>
							<li class="steps-segment <?php echo ( $current_step == 3 ) ? 'step-active' : ''; ?>">
								<span class="steps-marker"></span>
								<div class="steps-content">
									<div class="box">
										<p><b><?php echo $oscar_minc_schedule_time_3->format('d/m/Y'); ?></b></p>
										<p><?php echo $oscar_minc_schedule_text_3; ?></p>
									</div>
								</div>
							</li>
						</ul>
					</div>
				</div>
			</div>

			
		</section>

		<section id="news" class="pb-5 pt-5">
			<div class="container">
				<div class="row">
					<div class="col-lg-12">
						<h2 class="section-title mb-5 text-center">Notícias</h2>
					</div>

					<div class="overflow-wrapper">

						<?php
						$args = array(
							'posts_per_page' => 3,
							// 'category_name' => 'destaquinho-1'
						);
						$news_query = new WP_Query($args); ?>

						<?php if ($news_query->have_posts()) : ?>

							<?php while ($news_query->have_posts()) : $news_query->the_post(); ?>


								<div class="col-lg-4 mb-5">
									<?php
									if (has_post_thumbnail()) {
										$post_thumb = get_the_post_thumbnail_url(get_the_ID(), 'highlight-box');
									} else {
										$post_thumb = get_template_directory_uri() . '/assets/img/fake-img.jpg';
									}
									?>
									<div class="highlight-box"
									     style="background-image: url('<?php echo $post_thumb; ?>')">
										<div class="box-body">
											<?php if ($post_subtitle = get_post_meta($post->ID, '_post_subtitle', true)): ?>
												<span class="cat"><?php echo $post_subtitle ?></span>
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
						<a href="<?php echo home_url('/noticias/'); ?>" class="btn text-uppercase mt-1">Mais notícias</a>
					</div>
				</div>
			</div>
		</section>

	</main>

<?php
get_footer();