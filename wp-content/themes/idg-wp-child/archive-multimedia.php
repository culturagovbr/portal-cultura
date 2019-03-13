<?php
/**
 * The template for displaying category results pages
 *
 * @link https://developer.wordpress.org/themes/basics/template-hierarchy/#search-result
 *
 * @package Identidade_Digital_do_Governo_-_WordPress
 */

get_header();
?>

  <main id="main" class="site-main">
    <div class="container">
      <div class="row">
        <?php the_breadcrumb(); ?>
      </div>

      <div id="content" class="row">
        <div class="col-12">

          <h1 class="page-title text-center">
            <?php the_archive_title(); ?>
          </h1>

          <?php get_template_part('template-parts/posts-list', 'category'); ?>

          <?php get_template_part('template-parts/copyright'); ?>
        </div>
      </div>
    </div>
  </main>

<?php
get_footer();
