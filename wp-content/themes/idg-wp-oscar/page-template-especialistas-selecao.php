<?php /* Template Name: Especialistas de Seleção */ ?>

<?php get_header(); ?>

<main id="page-cnic" class="site-main">
  <div class="container">
    <div class="row">
      <?php the_breadcrumb(); ?>
    </div>

    <?php wp_reset_postdata(); ?>

    <div class="row">
      <div class="col-12">
        <?php
        while ( have_posts() ) :
          the_post();

          get_template_part( 'template-parts/content-page', 'page' );
          endwhile; ?>
      </div>
    </div>
  </div>

  <?php if( have_rows('listas_de_membros') ) : ?>

      <?php while ( have_rows('listas_de_membros') ) : the_row(); ?>

          <?php if( get_row_layout() == 'lista' ) : ?>
            <section class="people-list">
              <h2 class="section-title"><?php the_sub_field('nome_da_lista'); ?></h2>

              <?php if( have_rows('membros') ): ?>
                <ul>
                  <?php while( have_rows('membros') ): the_row(); ?>

                  <li class="member">
                    <div class="container">
                      <div class="image">
                        <img src="<?php the_sub_field('foto_do_membro'); ?>" />
                      </div>

                      <div class="text">
                        <span class="occupation"><?php the_sub_field('profissao_do_membro'); ?></span>
                        <h5 class="card-title"><?php the_sub_field('nome_do_membro'); ?></h5>

                        <p class="description"><?php the_sub_field('descricao_do_membro'); ?></p>
                        <a href="<?php the_sub_field('link_saiba_mais'); ?>" target="_blank" class="btn btn-primary"><i class="fas fa-plus"></i> Saiba Mais</a>
                      </div>
                    </div>
                  </li>

                  <?php endwhile; ?>
                </ul>
              <?php endif; ?>
            </section>
          <?php endif; ?>

      <?php endwhile; ?>

  <?php endif; ?>

</main>

<?php get_footer(); ?>



