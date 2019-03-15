<?php
	$args = [];
	if( idg_wp_get_option('_main_carousel') ){
		$args['category_name'] = idg_wp_get_option('_main_carousel');
	}
	
	if( idg_wp_get_option('_main_carousel_slides') ){
		$args['posts_per_page'] = idg_wp_get_option('_main_carousel_slides');
	} else {
		$args['posts_per_page'] = 3;
	}
	$feature_news_query = new WP_Query( $args );
	if ( $feature_news_query->have_posts() ) : $i = 0; ?>

		<div id="jumbotron-carousel" class="carousel slide carousel-fade" data-ride="carousel"
	     data-interval="5000">
		<div class="carousel-inner">
			<?php while ( $feature_news_query->have_posts() ) : $feature_news_query->the_post(); ?>
				<div class="carousel-item <?php echo $i == 0 ? 'active' : ''; ?>">
					<?php
					if ( has_post_thumbnail() ) {
						$post_thumb = get_the_post_thumbnail_url( get_the_ID(), 'carousel-feature' );
					} else {
						$post_thumb = get_template_directory_uri() . '/assets/img/teste-personagem.jpg';
					}
					?>
					<img class="d-block w-100" src="<?php echo $post_thumb; ?>" alt="Second slide">
					<div class="carousel-caption d-md-block">
						<div class="container">
							<h2><a href="<?php the_permalink(); ?>"><?php the_title(); ?></a></h2>
							<?php the_excerpt(); ?>
						</div>
					</div>
				</div>
				<?php $i ++; endwhile;
			wp_reset_postdata(); ?>
		</div>
		<a class="carousel-control-prev" href="#jumbotron-carousel" role="button" data-slide="prev">
			<span class="carousel-control-prev-icon" aria-hidden="true"></span>
			<span class="sr-only">Previous</span>
		</a>
		<a class="carousel-control-next" href="#jumbotron-carousel" role="button" data-slide="next">
			<span class="carousel-control-next-icon" aria-hidden="true"></span>
			<span class="sr-only">Next</span>
		</a>
		<ol class="carousel-indicators">
			<?php
			for ( $indicators = 0; $indicators < $i; $indicators ++ ) {
				$class = $indicators == 0 ? 'active' : '';
				echo '<li data-target="#jumbotron-carousel" data-slide-to="' . $indicators . '" class="' . $class . '"></li>';
			}
			?>
		</ol>
	</div>

<?php endif; ?>
