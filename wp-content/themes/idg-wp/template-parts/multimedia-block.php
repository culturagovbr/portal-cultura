<?php
$args      = array(
	'post_type'  => 'multimedia',
	'posts_per_page' => 1,
);
$multimedia_query = new WP_Query( $args ); ?>

<?php if ( $multimedia_query->have_posts() ) : ?>

	<?php while ( $multimedia_query->have_posts() ) : $multimedia_query->the_post(); ?>
		<?php
		$taxonomy_names = wp_get_post_terms(get_the_ID(), 'multimedia-type');

		if ( has_post_thumbnail() ) {
			$multimedia_thumb = get_the_post_thumbnail_url( get_the_ID(), 'multimedia-feature' );
		} else {
			/* echo get_first_post_image();
			$x = get_post_gallery_images();
			print_r($x); */

			if( $taxonomy_names[0]->slug == 'video' ):
				$video_id = embeded_youtube_video_id( get_the_content() );

				if( $video_id ){
					$multimedia_thumb = 'https://img.youtube.com/vi/'. $video_id .'/maxresdefault.jpg';
				} else {
					$multimedia_thumb = get_template_directory_uri() . '/assets/img/media-'. $taxonomy_names[0]->slug .'-thumb.png';
				}

			else:
				$multimedia_thumb = get_template_directory_uri() . '/assets/img/media-'. $taxonomy_names[0]->slug .'-thumb.png';
			endif;
		}
		?>
		<div class="highlight" style="background-image: url('<?php echo $multimedia_thumb; ?>');">
			<a href="<?php the_permalink(); ?>">
				<div class="align">
					<div class="text">
						<h3><?php the_title(); ?></h3>
						<span><?php echo idg_excerpt(30); ?></span>
					</div>
				</div>
			</a>
			<?php if( $video_id ) :
				if (preg_match('%(?:youtube(?:-nocookie)?\.com/(?:[^/]+/.+/|(?:v|e(?:mbed)?)/|.*[?&]v=)|youtu\.be/)([^"&?/ ]{11})%i', get_the_content(), $match)) {
					echo '<span id="play-multimedia-video" class="icon icon-play_btn position-absolute" data-video-src="'. $match[1] .'"></span>';
				}
			endif; ?>
		</div>
	<?php endwhile; ?>

	<?php wp_reset_postdata(); ?>

<?php endif; ?>

<?php
if ( is_active_sidebar( 'multimedia-widgets-area' ) ) :
	dynamic_sidebar( 'multimedia-widgets-area' );
endif;
?>
