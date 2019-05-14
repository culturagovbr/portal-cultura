<?php
/**
 * Template part for listing posts
 *
 * @link https://developer.wordpress.org/themes/basics/template-hierarchy/
 *
 * @package Identidade_Digital_do_Governo_-_WordPress
 */

?>

<?php $paged = ( get_query_var( 'paged' ) ) ? get_query_var( 'paged' ) : 1; ?>

<?php if ( have_posts() ) : ?>
	<ul id="posts-list">

		<?php while ( have_posts() ) : ?>
			<?php the_post(); ?>

			<li id="post-<?php the_ID(); ?>" <?php post_class( 'row' ); ?>>

				<?php if ( has_post_thumbnail() ) { ?>
					<div class="col-3">
						<?php the_post_thumbnail('highlight-box', array( 'class' => 'img-fluid' )); ?>
					</div>
				<?php } ?>

				<div class="<?php echo has_post_thumbnail() ? 'col-9' : 'col-12'; ?>">
					<div class="categories">
						<?php
						$categories = get_the_category();
						$i          = 1;
						$exc        = array( 'destaque', 'destaquinho-1', 'destaquinho-2', 'destaquinho-3' );

						$post_type = get_post_type();

						if( !empty( $categories ) && $post_type == 'post' ) :

							foreach ( $categories as $cd ) {
								if ( ! in_array( $cd->slug, $exc ) ) {
									echo ( $i == 1 ) ? '' : ', ';
									echo '<a href="' . get_category_link( $cd->term_id ) . '">' . $cd->cat_name . '</a>';
									$i ++;
								}
							}

						else:

							$obj = get_post_type_object( $post_type );
							echo '<a href="#">'. $obj->labels->singular_name .'</a>';

						endif;
						?>
					</div>

					<h2><a href="<?php the_permalink(); ?>"><?php the_title(); ?></a></h2>
					<p><?php echo idg_excerpt(); ?></p>

					<?php if ( get_the_tags() ) : ?>
						<div class="tags-list">
							<?php the_tags( '<span>tags:</span>', '' ); ?>
						</div>
					<?php endif; ?>

					<span class="details">por Ascom, publicado em <?php the_date('d/m/Y'); ?> <?php the_time('H'); ?>h<?php the_time('i'); ?>, última modificação em <?php the_modified_date('d/m/Y'); ?> <?php the_modified_time('H'); ?>h<?php the_modified_time('i'); ?></span>

				</div>

			</li>

		<?php endwhile; ?>

		<?php if ( function_exists( 'wp_bootstrap_pagination' ) ) {
			wp_bootstrap_pagination();
		}; ?>


	</ul>

<?php else : ?>

	<?php get_template_part( 'template-parts/content', 'none' ); ?>

<?php endif; ?>
