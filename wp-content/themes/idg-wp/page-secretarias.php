<?php /* Template Name: Secretarias */ ?>

<?php
/**
 * The template for displaying all pages
 *
 * This is the template that displays all pages by default.
 * Please note that this is the WordPress construct of pages
 * and that other 'pages' on your WordPress site may use a
 * different template.
 *
 * @link https://developer.wordpress.org/themes/basics/template-hierarchy/
 *
 * @package Identidade_Digital_do_Governo_-_WordPress
 */

get_header();
?>

  <main id="main" class="site-main">

    <div class="container">
      <?php the_breadcrumb (); ?>

      <div class="row">
        <div class="col-12">
          <?php
          while ( have_posts() ) :
            the_post();

            get_template_part( 'template-parts/content-page', 'page' );

            // If comments are open or we have at least one comment, load up the comment template.
            if ( comments_open() || get_comments_number() ) :
              comments_template();
            endif;

          endwhile; // End of the loop.
          ?>
        </div>
      </div>
    </div>


    <div id="conteudo-especifico" class="pt-5" style="background-color: #19224d; padding-bottom: 80px; background-image: url("data:image/svg+xml,%3Csvg width='40' height='12' viewBox='0 0 40 12' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 6.172L6.172 0h5.656L0 11.828V6.172zm40 5.656L28.172 0h5.656L40 6.172v5.656zM6.172 12l12-12h3.656l12 12h-5.656L20 3.828 11.828 12H6.172zm12 0L20 10.172 21.828 12h-3.656z' fill='%23ffffff' fill-opacity='0.05' fill-rule='evenodd'/%3E%3C/svg%3E");">
      <div class="container">
        <h2 class="text-center mb-4" style="color: #FFF;">Conteúdo Específico</h2>

          <div class="row">
            <div class="col">
              <div class="feature-card text-center card-1">
                <a href="http://hmg.cultura.gov.br/acesso-a-informacao/acoes-e-programas/">
                  <div class="align">
                    <div class="icon icon-acoes-programadas"></div>
                    <h3 class="card-title">Conteúdo #1</h3>
                  </div>
                </a>
              </div>
            </div>
            <div class="col">
              <div class="feature-card text-center card-1">
                <a href="http://hmg.cultura.gov.br/acesso-a-informacao/acoes-e-programas/">
                  <div class="align">
                    <div class="icon icon-acoes-programadas"></div>
                    <h3 class="card-title">Conteúdo #2</h3>
                  </div>
                </a>
              </div>
            </div>
            <div class="col">
              <div class="feature-card text-center card-1">
                <a href="http://hmg.cultura.gov.br/acesso-a-informacao/acoes-e-programas/">
                  <div class="align">
                    <div class="icon icon-acoes-programadas"></div>
                    <h3 class="card-title">Conteúdo #3</h3>
                  </div>
                </a>
              </div>
            </div>
          </div>

      </div>
    </div>


    <div class="container mt-4">
      <div class="col-12 pt-4 pb-4">
        <div id="search-content-wrapper">
          <h2 class="text-center">Notícias</h2>
        </div>

        <div class="row">
          <?php

          $args = array(
            'posts_per_page' => 3,
            'category_name'  => 'noticias'
          );

          $news_query = new WP_Query( $args ); ?>

          <?php if ($news_query->have_posts()) : ?>
            <ul id="posts-list">

              <?php while ($news_query->have_posts()) : ?>
                <?php $news_query->the_post(); ?>

                <li id="post-<?php the_ID(); ?>" <?php post_class(); ?>>
                  <div class="categories"><?php the_category(', '); ?></div>

                  <h2><a href="<?php the_permalink(); ?>"><?php the_title(); ?></a></h2>
                  <p><?php echo idg_excerpt(); ?></p>

                  <?php if (get_the_tags()) : ?>
                    <div class="tags-list">
                      <?php the_tags('<span>tags:</span>', ''); ?>
                    </div>
                  <?php endif; ?>

                  <span class="details">
                    por <?php the_author_posts_link(); ?>
                    última modificação em <?php the_modified_date('d/m/Y'); ?> <?php the_modified_time('H'); ?>
                    h<?php the_modified_time('i'); ?>
                  </span>
                </li>

              <?php endwhile; ?>

              <?php if ( function_exists('wp_bootstrap_pagination') ){
                wp_bootstrap_pagination();
              }; ?>


            </ul>

          <?php else : ?>

            <?php get_template_part('template-parts/content', 'none'); ?>

          <?php endif; ?>
        </div>
      </div>
    </div>
  </main>
<?php
get_footer();
