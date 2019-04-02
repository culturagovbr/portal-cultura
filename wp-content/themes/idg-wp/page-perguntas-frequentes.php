<?php /* Template Name: Perguntas Frequentes */ ?>

<?php get_header(); ?>

  <main id="main-single" class="site-main">
    <div class="container">
      <?php the_breadcrumb (); ?>

      <div class="row">
        <div class="col-12">
          <?php
          while ( have_posts() ) :
            the_post();

            get_template_part( 'template-parts/content-page', 'page' );


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
