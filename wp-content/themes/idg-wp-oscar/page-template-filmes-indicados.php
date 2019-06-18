<?php /* Template Name: Filmes Indicados */ ?>

<?php get_header(); ?>

<main id="page-cnic" class="site-main">
  <div class="container">
    <div class="row">
      <?php the_breadcrumb(); ?>
    </div>

    <?php wp_reset_postdata(); ?>

  </div>

  <?php if( have_rows('filmes_indicados') ): ?>

    <section class="timeline">
      <ul class="movies-list">
        <?php while( have_rows('filmes_indicados') ): the_row(); 
          $image = get_sub_field('imagem');
          $description = get_sub_field('descricao');
          $year = get_sub_field('ano');
        ?>

          <li class="movie">
            <div class="box <?php echo ($image) ? 'has-image' : ''; ?>">
              <div class="align">

                <?php if ($image): ?>
                  <div class="image">
                    <img src="<?php echo $image['url']; ?>" />
                  </div>
                <?php endif; ?>

                <div class="text">
                  <time><?php echo $year; ?></time> <?php echo $description; ?>
                </div>
              </div>
            </div>
          </li>

        <?php endwhile; ?>
      </ul>
    </section>

  <?php endif; ?>

</main>

<?php get_footer(); ?>



